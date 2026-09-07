// Anti-bot: protezione dai follow-bot e dai bot raid, sullo stile di Sery_Bot.
//
// Tre difese, in ordine di quanto sono "sicure" (cioè quanto poco rischiano di
// colpire una persona vera):
//
//  1. RAFFICA DI FOLLOW. Un attacco follow-bot è tanti follow in pochi secondi.
//     Non serve guardare chi sono uno per uno: basta contarli. Se in una
//     finestra breve ne arrivano troppi, è quasi certo un attacco. Di default
//     AVVISA soltanto (e può chiudere la chat ai soli follower), non banna: un
//     picco può capitare anche dopo una clip virale, e bannare 100 persone vere
//     sarebbe peggio dell'attacco.
//
//  2. NOMI DA BOT NOTI. Un elenco (che cresce nel tempo) di account-bot noti e
//     di pattern dei nomi tipici dei follow-bot promozionali. Chi corrisponde
//     viene bannato. I bot BUONI (Nightbot, StreamElements, Sery_Bot…) sono
//     sempre esenti, e lo streamer può aggiungere nomi suoi da esentare.
//
//  3. ACCOUNT SOSPETTO. Solo se richiesto (costa una chiamata a Twitch per
//     follower): account creato ieri, foto profilo di default, bio vuota, nome
//     da bot → punteggio di rischio. Sopra la soglia, si agisce.
//
// Regola d'oro: broadcaster, mod, VIP e chi già segue/parla NON vengono mai
// toccati, e in dubbio si AVVISA invece di bannare. Un falso positivo qui
// significa cacciare un fan vero: costa più dell'attacco.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makeLog } from '../logger.js';
import { streamers, statoVivo, memory } from '../db.js';
import { punteggio as punteggia, inCentesimi, nomeGenerato, canaliInsieme, segnaGiudizio, erroriDi, GIUDIZI_CHIAVE, SOGLIA_SEGNALA } from './punteggio.js';
import * as rete from './rete.js';
import { Esecutore, verdetto, AZIONI, daFare } from './enforcement.js';
import { config } from '../config.js';

const log = makeLog('antibot');

export const ANTIBOT_DEFAULT = {
  attivo: false,               // acceso? (serve il permesso Twitch di moderazione)
  // 1. raffica di follow
  raffica: true,
  rafficaQuanti: 10,           // quanti follow…
  rafficaSecondi: 30,          // …in quanti secondi fanno scattare l'allarme
  rafficaChiudiChat: true,     // durante la raffica, chat ai soli follower
  rafficaBanna: false,         // bannare i follow della raffica (aggressivo: default no)
  // 2. nomi da bot
  nomiBot: true,
  azione: 'ban',               // 'ban' | 'timeout' | 'segnala'
  timeoutSec: 1209600,         // se azione=timeout: 14 giorni
  esenti: [],                  // nomi che NON vanno mai toccati (oltre ai bot buoni)
  extra: [],                   // nomi/pattern-bot in più, aggiunti dallo streamer
  listaAuto: true,             // usa la lista di bot noti aggiornata da sola
  presenze: true,              // guarda chi sta in molti canali nostri insieme (solo segnala)
  aVuoto: false,               // sola osservazione: decide e scrive tutto, non tocca nessuno
  // 3. account sospetto (costa una chiamata a Twitch per follow)
  controllaAccount: false,
  soglia: 70,                  // punteggio 0-100 oltre il quale si agisce
  etaMinGiorni: 3,             // più giovane di così = sospetto
  // 4. account NUOVISSIMI in chat. La modalità "Restricted" di Twitch (messaggi
  // visibili solo ai mod) NON ha un'API: un bot non può attivarla. Qui facciamo
  // l'equivalente automatico più vicino: se chi scrive ha l'account da meno di
  // "chatMinOre" e non segue/non è sub/VIP/mod, il messaggio viene TRATTENUTO
  // (eliminato) o solo SEGNALATO ai mod.
  chatNuovi: false,
  chatMinOre: 24,              // "appena creato" = più giovane di tante ore
  chatNuoviAzione: 'elimina',  // 'elimina' (trattieni) | 'segnala' (lascia, avvisa)
  avvisa: true,                // scrivere in chat quando si agisce
  // 5. assetto automatico: sotto attacco lo scudo si alza da solo e si riabbassa
  assettoAuto: true,           // alza serranda + Shield Mode durante un attacco
  bloccoSulNascere: true,      // ban in blocco dell'ondata quando è artificiale
  coroQuanti: 4,               // quante bocche diverse per lo stesso messaggio = coro
  togliFollow: true,           // sui follow-bot certi usa il BLOCCO, che toglie il follow
};

// Bot NOTORIAMENTE buoni: non si toccano mai. In minuscolo.
const BUONI = new Set([
  'nightbot', 'streamelements', 'streamlabs', 'moobot', 'wizebot', 'fossabot',
  'sery_bot', 'soundalerts', 'buttsbot', 'pretzelrocks', 'commanderroot',
  'own3d', 'tangiabot', 'kofistreambot', 'blerp', 'lattemotte', 'streamstickers',
  'creatisbot', 'phantombot', 'deepbot', 'coebot', 'botisimo', 'stay_hydrated_bot',
]);

// Pattern dei nomi tipici dei follow-bot promozionali ("comprati follower").
// Alta precisione di proposito: meglio lasciarne passare qualcuno che bannare
// un fan vero. La lista cresce nel tempo, e lo streamer può aggiungerne.
const PATTERN_BOT = [
  /followers?[_.]?(4|for|pro|boost|now|fast)/i,
  /(buy|get|cheap|free)[_.]?(followers?|viewers?|prime)/i,
  /(streamboo|bigfollows|streamrise|hitfollow|followerclub|viewerlabs)/i,
  /\bbot(net|army|s4u|master)\b/i,
  /(viewers?|follows?)[_.]?(bot|store|shop|market)/i,
];

const norm = (s) => String(s || '').toLowerCase().trim();

// ── Lista di bot noti, aggiornata da sola ────────────────────────────────────
// La lista scritta a mano invecchia: i follow-bot cambiano di continuo. Qui la
// teniamo aggiornata da una fonte pubblica (la stessa che usano gli strumenti
// seri di anti-bot su Twitch), con una copia su disco così regge anche se la
// fonte è momentaneamente giù, e con l'elenco dei bot BUONI che vince sempre.
let listaEsterna = new Set();
let listaInfo = { conteggio: 0, aggiornata: 0 };
const FONTE = config.listaBotUrl || 'https://api.twitchinsights.net/v1/bots/all';
const FILE = () => join(config.dataDir, 'lista-bot.json');
const MAX = 300000;                                    // tetto: non ci mangiamo la RAM

export const statoListaBot = () => ({ ...listaInfo, fonte: FONTE });

export async function caricaListaBotDaDisco() {
  try {
    const j = JSON.parse(await readFile(FILE(), 'utf8'));
    if (Array.isArray(j.nomi)) {
      listaEsterna = new Set(j.nomi.filter((n) => !BUONI.has(n)));
      listaInfo = { conteggio: listaEsterna.size, aggiornata: j.ts || 0 };
      log.info(`lista bot: ${listaEsterna.size} nomi ripresi dal disco`);
    }
  } catch { /* prima volta: nessuna copia ancora */ }
}

export async function aggiornaListaBot() {
  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 20000);
    const r = await fetch(FONTE, { signal: ac.signal, headers: { 'User-Agent': 'SocialBot anti-bot' } }).finally(() => clearTimeout(to));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const arr = Array.isArray(j.bots) ? j.bots : (Array.isArray(j) ? j : []);
    const nuovi = new Set();
    for (const b of arr) {
      const n = norm(Array.isArray(b) ? b[0] : b);
      if (n && /^[a-z0-9_]{2,30}$/.test(n) && !BUONI.has(n)) { nuovi.add(n); if (nuovi.size >= MAX) break; }
    }
    if (nuovi.size < 100) throw new Error('lista sospettosamente corta, ignorata');
    listaEsterna = nuovi;
    listaInfo = { conteggio: nuovi.size, aggiornata: Date.now() };
    await writeFile(FILE(), JSON.stringify({ ts: listaInfo.aggiornata, nomi: [...nuovi] })).catch(() => {});
    log.info(`lista bot aggiornata: ${nuovi.size} nomi noti`);
    return nuovi.size;
  } catch (e) {
    log.warn('lista bot non aggiornata (tengo l\'ultima buona):', e?.message || e);
    return 0;
  }
}

// Un nome è da follow-bot? (esclusi i bot buoni e gli esentati dello streamer)
export function nomeBot(login, cfg = {}) {
  const l = norm(login);
  if (!l) return false;
  if (BUONI.has(l)) return false;
  const esenti = (cfg.esenti || []).map(norm);
  if (esenti.includes(l)) return false;
  const extra = (cfg.extra || []).map(norm).filter(Boolean);
  if (extra.includes(l)) return true;                 // esatto, aggiunto dallo streamer
  if (cfg.listaAuto !== false && listaEsterna.has(l)) return true;   // lista aggiornata
  return PATTERN_BOT.some((re) => re.test(l));
}

// Quanto è "nuovo di zecca e vuoto" un account? Ritorna { rischio, motivi }.
// u = oggetto utente Helix (created_at, profile_image_url, description, login).
// Il giudizio su un account. I punti li fa il motore in punteggio.js, che è una
// funzione pura e non sa niente di Twitch: qui si raccolgono i fatti e glieli
// si passano. Il numero esce anche in centesimi perché le impostazioni salvate
// degli streamer parlano quella lingua («soglia: 70»).
//
// `forte` è la cosa che conta più del numero: dice se fra i punti c'è almeno un
// fatto che una persona non può produrre — il nome riconosciuto o la presenza
// in molti canali insieme. Senza, il giudizio può far GUARDARE e non può far
// agire, per quanto sia alto. Il perché sta in docs/PUNTEGGIO.md, col conto di
// quanto prende uno spettatore nuovo e timido.
export function valutaAccount(u, cfg = {}, extra = {}) {
  if (!u) return { rischio: 0, motivi: [], punti: 0, forte: false };
  const login = norm(u.login);
  const g = punteggia({
    utente: u,
    nomeNoto: !!(login && cfg.listaAuto !== false && listaEsterna.has(login)),
    nomePattern: nomeBot(login, cfg) && !listaEsterna.has(login),
    nomeGenerato: nomeGenerato(login),
    canaliInsieme: extra.canaliInsieme ?? canaliInsieme(login),
    reteCanali: extra.reteCanali ?? rete.quantiLoSegnalano(login),
    maiScritto: !!extra.maiScritto,
    nonSegue: !!extra.nonSegue,
    ondataIngressi: !!extra.ondataIngressi,
  });
  return { rischio: inCentesimi(g.punti), motivi: g.motivi, punti: g.punti, forte: g.forte, famiglie: g.famiglie };
}

// ── Rilevatore di raffiche, per canale ──────────────────────────────────────
// Solo timestamp in memoria, potati da soli: niente su chi ha seguito.
const finestre = new Map();          // channel → [ts, ts, …]
const raffiche = new Map();          // channel → fino a quando siamo "in allarme"
// La data di nascita di un account non cambia mai: la si chiede una volta e la
// si tiene. Chiave = userId. Potato quando è troppo grande.
const nascita = new Map();           // userId → { creato: ms|0 }

function segnaFollow(channel, cfg) {
  const ora = Date.now();
  const q = Number(cfg.rafficaQuanti ?? 10);
  const w = Number(cfg.rafficaSecondi ?? 30) * 1000;
  const arr = (finestre.get(channel) || []).filter((t) => ora - t < w);
  arr.push(ora);
  finestre.set(channel, arr);
  return { quanti: arr.length, raffica: arr.length >= q };
}
export const inRaffica = (channel) => (raffiche.get(channel) || 0) > Date.now();

// ── Registro degli interventi (la "certezza") ────────────────────────────────
// Lo scudo non deve solo agire: deve LASCIARE TRACCIA. Ogni intervento (ban,
// timeout, raffica, trattenuta in chat, segnalazione, raid) finisce qui con
// l'esito REALE su Twitch (andato o fallito). Lo streamer lo rivede dalla sua
// console, risolve le segnalazioni e all'occorrenza annulla. Persistito su
// disco, con un tetto per canale così non cresce all'infinito.
const REG_MAX = 500;
const registriMem = new Map();          // channel → [voce, …] (le recenti in coda)
let regSeq = 0;
let regDaSalvare = false;
let regTimer = null;
const REG_FILE = () => join(config.dataDir, 'registro-antibot.json');

function nuovoId() { return Date.now().toString(36) + '-' + (regSeq++).toString(36); }

// Registra un intervento. azione: ban|timeout|segnala|raffica|raid|chat-trattieni|chat-segnala.
// esito: fatto|fallito|avviso|in-attesa. stato: aperto (da rivedere) | chiuso | risolto.
export function registra(channel, dati) {
  const ch = norm(channel);
  if (!ch) return null;
  const arr = registriMem.get(ch) || [];
  const voce = {
    id: nuovoId(), ts: Date.now(),
    login: norm(dati.login) || '', userId: dati.userId || '',
    azione: dati.azione || 'segnala', motivo: String(dati.motivo || ''),
    esito: dati.esito || 'fatto', stato: dati.stato || 'chiuso', ris: null,
  };
  arr.push(voce);
  if (arr.length > REG_MAX) arr.splice(0, arr.length - REG_MAX);
  registriMem.set(ch, arr);
  programmaSalvataggioReg();
  return voce;
}

export function registro(channel, { limite = 100 } = {}) {
  const arr = registriMem.get(norm(channel)) || [];
  return arr.slice(-limite).reverse();
}

export function segnalazioniAperte(channel) {
  return (registriMem.get(norm(channel)) || []).filter((v) => v.stato === 'aperto').reverse();
}

// Lo streamer chiude una segnalazione: 'ignora' (era ok), 'permetti' (esenta),
// 'ban'/'timeout' (l'ha già gestita il chiamante). Qui si segna solo l'esito.
export function risolviSegnalazione(channel, id, esito) {
  const arr = registriMem.get(norm(channel)) || [];
  const v = arr.find((x) => x.id === id && x.stato === 'aperto');
  if (!v) return null;
  v.stato = 'risolto';
  v.ris = { esito: String(esito || 'ignora'), ts: Date.now() };
  programmaSalvataggioReg();
  return v;
}

export function sintesiRegistro(channel) {
  const arr = registriMem.get(norm(channel)) || [];
  const ora = Date.now(), g = 86400000;
  const perAzione = {};
  let oggi = 0, settimana = 0, aperte = 0;
  for (const v of arr) {
    perAzione[v.azione] = (perAzione[v.azione] || 0) + 1;
    if (ora - v.ts < g) oggi++;
    if (ora - v.ts < 7 * g) settimana++;
    if (v.stato === 'aperto') aperte++;
  }
  return { totale: arr.length, oggi, settimana, aperte, perAzione };
}

function programmaSalvataggioReg() {
  regDaSalvare = true;
  if (regTimer) return;
  regTimer = setTimeout(salvaRegistro, 4000);
  if (regTimer.unref) regTimer.unref();
}

export async function salvaRegistro() {
  regTimer = null;
  if (!regDaSalvare) return;
  regDaSalvare = false;
  const obj = {};
  for (const [ch, arr] of registriMem) obj[ch] = arr;
  await writeFile(REG_FILE(), JSON.stringify(obj)).catch((e) => log.warn('registro non salvato su disco:', e?.message || e));
}

export async function caricaRegistroDaDisco() {
  try {
    const j = JSON.parse(await readFile(REG_FILE(), 'utf8'));
    for (const ch of Object.keys(j || {})) {
      if (!Array.isArray(j[ch])) continue;
      // Difesa da file corrotto/manomesso: teniamo solo voci ben formate, così
      // sintesiRegistro/registro non esplodono su una riga null o senza campi.
      const buoni = j[ch].filter((v) => v && typeof v === 'object' && v.id && v.azione);
      registriMem.set(norm(ch), buoni.slice(-REG_MAX));
    }
    log.info(`registro anti-bot: ripreso per ${registriMem.size} canali`);
  } catch (e) { /* prima volta: nessun file */ }
}

// ── Assetto del canale: un livello solo, che sale e scende da sé ────────────
// Prima ogni difesa aveva il suo interruttore e il suo timer, e lo streamer
// doveva capirli uno per uno per essere protetto. Ora c'è UN livello per canale:
// sale quando arriva evidenza, e scende da solo dopo un periodo di quiete.
// Tutte le difese leggono quello. Un fatto, un posto dove è scritto.
export const ASSETTO = { CALMA: 'calma', SOSPETTO: 'sospetto', ATTACCO: 'attacco' };
const QUIETE_MS = 5 * 60 * 1000;         // quanto silenzio serve per tornare in pace
const assetti = new Map();               // channel -> { livello, da, motivo, ripristino, timer }

// La SERRANDA e' l'unica cosa dell'assetto che deve sopravvivere a un riavvio,
// e non per riprendere l'allarme: per DISFARLO. Quando lo scudo si alza, il bot
// accende su Twitch la chat ai soli follower, la modalita' lenta e lo Shield
// Mode, e si segna in `ripristino` quali ha acceso LUI. Quel foglietto stava in
// memoria: se il processo moriva a scudo alzato, il bot al riavvio tornava in
// pace — ma il canale restava chiuso, e non era rimasto nessuno a riaprirlo. Lo
// streamer se lo trovava cosi' finche' non se ne accorgeva da solo.
const CHIAVE_SERRANDA = 'serranda';

function segnaSerranda(ch, a) {
  try {
    const rip = a?.ripristino || {};
    if (rip.follower || rip.lenta || rip.shield) statoVivo.scrivi(ch, CHIAVE_SERRANDA, { ripristino: rip, da: a.da || Date.now() });
    else statoVivo.togli(ch, CHIAVE_SERRANDA);
  } catch (e) {  }
}

export function assetto(channel) {
  const a = assetti.get(norm(channel));
  if (!a) return { livello: ASSETTO.CALMA, motivo: '', da: 0 };
  return { livello: a.livello, motivo: a.motivo, da: a.da };
}

// ── Ritmo abituale del canale ───────────────────────────────────────────────
// Una soglia sola non può valere per un canale da dieci spettatori e per uno da
// cinquemila: su quello grande dieci follow in mezzo minuto sono un martedì
// qualunque, su quello piccolo sono un attacco. Teniamo quindi il ritmo
// ABITUALE di ciascun canale — media esponenziale dell'intervallo fra follow —
// e la soglia diventa uno scostamento da lì invece di un numero calato dall'alto.
//
// Il ritmo si aggiorna SOLO in tempo di pace: se lo aggiornassimo anche durante
// un attacco, l'attacco insegnerebbe al canale che quella è la normalità.
const ritmi = new Map();                 // channel → { medio, visti, ultimo }
const RITMO_MIN_STORIA = 30;             // sotto questo si usa il valore dichiarato

// Il ritmo e' una cosa IMPARATA, e ci vogliono trenta follow per impararla.
// In memoria non ci arrivava mai: fra una pubblicazione e l'altra un canale
// piccolo trenta follow non li fa, quindi la soglia adattiva restava per sempre
// quella dichiarata e tutto il ragionamento sul "ritmo abituale" non entrava
// mai in funzione. Adesso quello che il canale ha imparato resta. L'ultimo
// istante NON si salva: l'intervallo a cavallo di un riavvio non vuol dire
// niente, e il primo follow dopo riparte senza contribuire alla media.
const CHIAVE_RITMO = 'ritmo';
const SALVA_RITMO_MS = 60_000;           // si riscrive al piu' una volta al minuto per canale
const RITMO_VECCHIO_MS = 90 * 24 * 60 * 60 * 1000;
let _ritmiPresi = false;

function ritmiPronti() {
  if (_ritmiPresi) return;
  _ritmiPresi = true;
  try {
    for (const r of statoVivo.tutti(CHIAVE_RITMO, RITMO_VECCHIO_MS)) {
      const medio = Number(r.dato?.medio) || 0;
      if (medio > 0) ritmi.set(norm(r.channel), { medio, visti: Number(r.dato?.visti) || 0, ultimo: 0, salvato: 0 });
    }
  } catch (e) {  }
}

function segnaRitmo(channel, ora) {
  ritmiPronti();
  const r = ritmi.get(channel) || { medio: 0, visti: 0, ultimo: 0, salvato: 0 };
  if (r.ultimo) {
    const dt = Math.min(600000, ora - r.ultimo);
    r.medio = r.medio ? r.medio * 0.88 + dt * 0.12 : dt;
    r.visti++;
  }
  r.ultimo = ora;
  ritmi.set(channel, r);
  if (r.medio && ora - (r.salvato || 0) > SALVA_RITMO_MS) {
    r.salvato = ora;
    try { statoVivo.scrivi(channel, CHIAVE_RITMO, { medio: r.medio, visti: r.visti }); } catch (e) {  }
  }
  return r;
}

// Quanti follow, in questa finestra, sono davvero anomali per QUESTO canale.
export function sogliaRaffica(channel, cfg = {}) {
  const base = Math.max(3, Number(cfg.rafficaQuanti ?? 10));
  const w = Number(cfg.rafficaSecondi ?? 30) * 1000;
  ritmiPronti();
  const r = ritmi.get(norm(channel));
  if (!r || r.visti < RITMO_MIN_STORIA || !r.medio) return base;
  const normale = w / r.medio;                       // follow attesi nella finestra
  return Math.max(base, Math.ceil(normale * 4));
}

// ── L'onda lenta ────────────────────────────────────────────────────────────
// La finestra breve vede il picco: duecento follow in cinque secondi. Non vede
// il gocciolamento: un follow ogni quattro secondi per dieci minuti sono
// centocinquanta follow finti che passano indisturbati. Serve una seconda
// finestra, lunga, confrontata anch'essa col ritmo abituale.
const LUNGA_MS = 10 * 60 * 1000;
const finestreLunghe = new Map();        // channel → [ts, …]

function segnaLunga(channel, ora) {
  const arr = (finestreLunghe.get(channel) || []).filter((t) => ora - t < LUNGA_MS);
  arr.push(ora);
  finestreLunghe.set(channel, arr);
  const r = ritmi.get(channel);
  const attesi = (r && r.visti >= RITMO_MIN_STORIA && r.medio) ? LUNGA_MS / r.medio : 0;
  const soglia = Math.max(40, Math.ceil(attesi * 5));
  return { quanti: arr.length, onda: arr.length >= soglia, soglia };
}

// ── Il coro ─────────────────────────────────────────────────────────────────
// È questo il segno dell'hate-raid, e finora mancava del tutto: non conta chi
// scrive né da quanto esiste, conta che LO STESSO messaggio esca da molte bocche
// diverse in pochi secondi. La ricerca sul fenomeno usa proprio la somiglianza
// del contenuto come rilevatore primario.
//
// La firma normalizza via accenti, link, punteggiatura e spazi: gli attacchi
// variano quei dettagli apposta. I messaggi corti non entrano — "lol", "W",
// una emote scritta da venti persone insieme è una chat viva, non un attacco.
const cori = new Map();                  // channel → Map(firma → { primo, chi:Set })
const CORO_MIN_LUNGHEZZA = 14;
const CORO_MS = 30000;

export function firmaMessaggio(testo) {
  const t = String(testo || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length < CORO_MIN_LUNGHEZZA) return '';
  if (!t.includes(' ')) return '';
  return t.slice(0, 140);
}

function segnaCoro(channel, testo, chi, cfg) {
  const f = firmaMessaggio(testo);
  if (!f) return { coro: false, quanti: 0 };
  const ora = Date.now();
  let m = cori.get(channel);
  if (!m) { m = new Map(); cori.set(channel, m); }
  for (const [k, v] of m) if (ora - v.primo > CORO_MS) m.delete(k);
  if (m.size > 400) { const k = m.keys().next().value; m.delete(k); }
  const v = m.get(f) || { primo: ora, chi: new Set() };
  v.chi.add(norm(chi));
  m.set(f, v);
  const quanti = Number(cfg.coroQuanti ?? 4);
  return { coro: v.chi.size >= quanti, quanti: v.chi.size, testo: f };
}

// ── Chi c'era nell'ondata ───────────────────────────────────────────────────
// Per fermare un follow-bot SUL NASCERE non basta bannare i follow che arrivano
// dopo l'allarme: i primi — quelli che l'allarme lo hanno fatto scattare — sono
// già passati. Teniamo quindi chi ha seguito nella finestra, per la sola durata
// della finestra, così quando scatta l'attacco possiamo prenderli tutti,
// compresi quelli di partenza. Nomi e id spariscono appena la finestra scorre.
const ondate = new Map();                // channel → [{ ts, userId, login }]

function segnaOndata(channel, ora, userId, login, wMs) {
  const arr = (ondate.get(channel) || []).filter((v) => ora - v.ts < wMs);
  arr.push({ ts: ora, userId, login });
  ondate.set(channel, arr);
  return arr;
}

// ── È un'ondata artificiale o è andata bene una clip? ───────────────────────
// Questa è la domanda che decide se si bannano cento account o no, e sbagliarla
// costa: bannare cento fan veri è peggio dell'attacco. Non si tira a indovinare,
// si misura — e senza chiamare Twitch, perché durante un'ondata ogni chiamata
// per follow amplificherebbe l'attacco.
//
// 1. LA CADENZA. Le persone arrivano a caso: gli intervalli fra un follow e
//    l'altro hanno una dispersione grande quanto la media (è un processo di
//    Poisson, coefficiente di variazione ≈ 1). Una macchina arriva a passo
//    regolare, e il coefficiente crolla. Sotto 0,45 non sono persone.
// 2. I NOMI. Se una fetta dell'ondata è già riconosciuta come bot dai pattern o
//    dalla lista pubblica, il resto dell'ondata viene dallo stesso posto.
//
// Basta uno dei due per avere la certezza che serve. Se non c'è nessuno dei due
// l'ondata sembra genuina: si alza la serranda e si avvisa, ma non si banna.
// Quanti follow servono per poter rispondere. Non e' un numero scelto a
// sentimento: il coefficiente di variazione di pochi campioni balla, e qui un
// falso positivo blocca dei fan veri. Misurato su ondate di gente vera
// (intervalli esponenziali, ventimila giri per punto): con 6 follow l'8,2%
// delle ondate genuine veniva giudicata «macchina», con 10 l'1,3%, con 15 lo
// 0,14%. Le macchine restano riconosciute al 100% anche con quindici campioni
// e passo irregolare del 40%, quindi aspettare non costa niente in vista.
const CAMPIONI_MIN = 15;

export function ondataArtificiale(arr, cfg = {}) {
  const n = arr.length;
  // «non lo so ancora» e' una risposta diversa da «no», e chi chiama deve
  // poterle distinguere: sulla prima si richiede, sulla seconda si smette.
  if (n < CAMPIONI_MIN) return { certo: false, basta: false, motivo: `ancora pochi follow per dirlo (${n} su ${CAMPIONI_MIN})` };

  const dt = [];
  for (let k = 1; k < n; k++) dt.push(arr[k].ts - arr[k - 1].ts);
  const media = dt.reduce((a, b) => a + b, 0) / dt.length;

  // QUANDO LA VELOCITA' RISPONDE DA SOLA. La dispersione relativa dice qualcosa
  // solo se gli intervalli sono misurabili: con intervalli dell'ordine del
  // millisecondo l'orologio li arrotonda a 0 e 1, e una fila di 0 e 1 ha la
  // stessa dispersione di un arrivo casuale — cioe' l'ondata PIU' veloce di
  // tutte era anche l'unica che passava per «gente vera». Piu' l'attacco
  // correva, meno lo scudo lo vedeva.
  //
  // Li' non serve guardare la forma, basta la velocita': quindici follow a meno
  // di cinque millisecondi l'uno dall'altro sono quindici follow in settanta
  // millisecondi. Un canale enorme fa una decina di follow al secondo nei suoi
  // momenti migliori: venti volte piu' lento di cosi'.
  const ISTANTE_MS = 5;
  if (media <= ISTANTE_MS) {
    return { certo: true, basta: true, motivo: `${n} follow a meno di ${ISTANTE_MS}ms l'uno dall'altro (media ${media.toFixed(1)}ms)` };
  }

  const varia = dt.reduce((a, b) => a + (b - media) ** 2, 0) / dt.length;
  const cv = Math.sqrt(varia) / media;
  if (cv < 0.45) {
    return { certo: true, basta: true, motivo: `cadenza da macchina (un follow ogni ${Math.round(media)}ms, dispersione ${cv.toFixed(2)})` };
  }

  const noti = arr.filter((v) => nomeBot(v.login, cfg)).length;
  if (noti / n >= 0.3) {
    return { certo: true, basta: true, motivo: `${noti} nomi su ${n} già noti come follow-bot` };
  }
  return { certo: false, basta: true, motivo: `cadenza irregolare (${cv.toFixed(2)}), nomi puliti: sembra gente vera` };
}

// ── Chi esegue sta altrove ──────────────────────────────────────────────────
// La coda, il ritmo, la riprova, il registro e la coda dei falliti stanno in
// enforcement.js. Qui si DECIDE e basta: si producono verdetti e si consegnano.
// C'e' un solo scudo per processo, quindi la console puo' chiedere lo stato
// dell'esecutore anche da una funzione di modulo.
let esecutore = null;

export function codaBan(channel) {
  const s = esecutore?.stato();
  return { in_attesa: s ? s.inCoda : 0, in_sospeso: s ? s.inSospeso : 0 };
}

export const statoEsecutore = () => esecutore?.stato() || null;
export const azioniFallite = (opz) => esecutore?.fallitiInSospeso(opz) || [];
export const riprovaFallite = (ch) => esecutore?.riprovaFalliti(ch) || 0;

// Quanto sbaglia lo scudo, misurato sui suoi stessi giudizi: chi era stato
// segnato come «probabile macchina» e poi si e' messo a parlare in chat era una
// persona. Il conto si fa guardando la memoria della chat che c'e' gia': non
// serve etichettare niente a mano, e non serve intercettare niente nel percorso
// dei messaggi. Sta fuori dalla classe perche' non ha bisogno di nessuno stato:
// legge quello che e' scritto, come registro() e sintesiRegistro().
export function erroriScudo(channel) {
  const ch = norm(channel);
  let elenco = [];
  try { elenco = statoVivo.leggi(ch, GIUDIZI_CHIAVE) || []; } catch (e) { elenco = []; }
  return erroriDi(elenco, (login, da) => !!memory.haScrittoDopo?.(ch, login, da));
}

export class AntiBot {
  constructor({ helix, alert, say, chatSettings } = {}) {
    this.helix = helix;
    this.alert = alert;                 // (channel, {tipo, testo}) per l'overlay (facolt.)
    this.say = say;                      // (channel, testo)
    this.chatSettings = chatSettings;    // (channel, {followersOnly}) se il bot sa farlo (facolt.)
    // Chi decide non esegue: l'esecutore e' un altro modulo, e l'unica cosa che
    // sa di noi e' dove scrivere quello che ha fatto.
    this.esecutore = new Esecutore({ helix, annota: (ch, riga) => registra(ch, riga) });
    esecutore = this.esecutore;
    this.esecutore.caricaFalliti().catch(() => {});
    setTimeout(() => { this._riapriSerrande().catch(() => {}); }, 4000).unref?.();
  }

  // Il canale sta girando a vuoto? Allora i verdetti si scrivono e non si
  // eseguono: e' il modo di tarare le soglie senza che il collaudo sia la
  // diretta di qualcuno.
  _aVuoto(cfg) { return cfg?.aVuoto === true; }

  // All'avvio: nessun allarme si riprende — il bot non ha nessuna prova che
  // l'attacco sia ancora in corso, e tornare in pace e' giusto. Ma quello che
  // aveva chiuso va riaperto, se no resta chiuso per sempre. La riga si toglie
  // solo se la riapertura e' andata: se Twitch non risponde, si riprova al
  // riavvio dopo invece di dimenticarsene.
  async _riapriSerrande() {
    let righe = [];
    try { righe = statoVivo.tutti(CHIAVE_SERRANDA); } catch (e) { return; }
    for (const r of righe) {
      const ch = norm(r.channel);
      const rip = r.dato?.ripristino || {};
      let tutto = true;
      if (rip.shield) { const x = await this.helix?.shieldMode?.(ch, false).catch(() => null); if (!x?.ok) tutto = false; }
      if (rip.lenta) { const x = await this.helix?.chatLenta?.(ch, false).catch(() => null); if (!x?.ok) tutto = false; }
      if (rip.follower) { const x = await this.helix?.chatSoloFollower?.(ch, false).catch(() => null); if (!x?.ok) tutto = false; }
      if (!tutto) { log.warn(`#${ch} serranda non riaperta del tutto: si riprova al prossimo avvio`); continue; }
      try { statoVivo.togli(ch, CHIAVE_SERRANDA); } catch (e) {  }
      log.info(`#${ch} serranda riaperta dopo un riavvio`);
      registra(ch, { azione: 'assetto', motivo: 'riapertura dopo un riavvio', esito: 'fatto' });
    }
  }

  // La configurazione dello streamer, più quello che l'assetto impone ADESSO.
  // L'aggiunta vive in memoria e non tocca le impostazioni salvate: se il
  // processo cadesse a metà attacco, il canale non resterebbe in assetto per
  // sempre — al riavvio è di nuovo in pace, per costruzione. Quello che il bot
  // ha chiuso SU TWITCH è un'altra cosa e non torna indietro da solo: vedi la
  // serranda, che si riapre all'avvio.
  cfg(channel) {
    const base = { ...ANTIBOT_DEFAULT, ...(streamers.get(channel)?.settings?.antibot || {}) };
    if (assetto(channel).livello !== ASSETTO.ATTACCO || base.assettoAuto === false) return base;
    return {
      ...base,
      nomiBot: true,
      chatNuovi: true,
      chatMinOre: Math.max(Number(base.chatMinOre || 24), 72),
      chatNuoviAzione: 'elimina',
      rafficaChiudiChat: true,
      // NON accendiamo controllaAccount: una chiamata a Twitch per ogni follow,
      // proprio mentre ne arrivano centinaia, amplificherebbe l'attacco invece
      // di fermarlo. In attacco i follow si giudicano in aggregato.
    };
  }

  // ── Il livello sale ────────────────────────────────────────────────────────
  async _alza(channel, livello, motivo, cfg) {
    const ch = norm(channel);
    const prima = assetti.get(ch);
    if (prima && prima.livello === ASSETTO.ATTACCO && livello === ASSETTO.SOSPETTO) {
      this._rimanda(ch);
      return;
    }
    const salita = !prima || prima.livello !== livello;
    const a = prima || { livello: ASSETTO.CALMA, da: Date.now(), ripristino: {}, timer: null };
    a.livello = livello;
    a.motivo = motivo;
    if (salita) a.da = Date.now();
    assetti.set(ch, a);
    this._rimanda(ch);
    if (!salita) return;

    log.warn(`#${ch} assetto → ${livello.toUpperCase()}: ${motivo}`);
    registra(ch, { azione: 'assetto', motivo: `${livello}: ${motivo}`, esito: 'avviso' });
    this.alert?.(ch, { tipo: 'antibot', testo: livello === ASSETTO.ATTACCO ? 'Sotto attacco: scudo alzato' : 'Movimento sospetto' });

    if (livello !== ASSETTO.ATTACCO || cfg.assettoAuto === false) return;

    if (cfg.avvisa) this.say?.(ch, `🛡️ Scudo alzato: ${motivo}. Chat ai soli follower finché non passa.`);

    // La serranda. Ogni pezzo si segna solo se l'ha alzato LUI: quello che lo
    // streamer aveva già acceso per conto suo non va spento al ritorno in pace.
    const rip = a.ripristino || {};
    if (!rip.follower) {
      const r = await this.helix?.chatSoloFollower?.(ch, true, 10).catch(() => null);
      if (r?.ok) rip.follower = true;
    }
    if (!rip.lenta) {
      const r = await this.helix?.chatLenta?.(ch, true, 10).catch(() => null);
      if (r?.ok) rip.lenta = true;
    }
    if (!rip.shield) {
      const r = await this.helix?.shieldMode?.(ch, true).catch(() => null);
      if (r?.ok) rip.shield = true;
      else if (r?.motivo === 'permesso mancante') log.warn(`#${ch} Shield Mode non alzato: manca il permesso moderator:manage:shield_mode`);
    }
    a.ripristino = rip;
    assetti.set(ch, a);
    segnaSerranda(ch, a);
  }

  _rimanda(ch) {
    const a = assetti.get(ch);
    if (!a) return;
    if (a.timer) clearTimeout(a.timer);
    a.timer = setTimeout(() => { this._abbassa(ch).catch(() => {}); }, QUIETE_MS);
    if (a.timer.unref) a.timer.unref();
  }

  // ── E scende, rimettendo a posto solo ciò che aveva mosso ──────────────────
  async _abbassa(channel) {
    const ch = norm(channel);
    const a = assetti.get(ch);
    if (!a) return;
    if (a.timer) clearTimeout(a.timer);
    assetti.delete(ch);
    try { statoVivo.togli(ch, CHIAVE_SERRANDA); } catch (e) {  }
    const rip = a.ripristino || {};
    if (rip.shield) await this.helix?.shieldMode?.(ch, false).catch(() => {});
    if (rip.lenta) await this.helix?.chatLenta?.(ch, false).catch(() => {});
    if (rip.follower) await this.helix?.chatSoloFollower?.(ch, false).catch(() => {});
    const durata = Math.round((Date.now() - a.da) / 1000);
    log.info(`#${ch} assetto → calma dopo ${durata}s`);
    registra(ch, { azione: 'assetto', motivo: `rientro in calma dopo ${durata}s`, esito: 'fatto' });
    const c = this.cfg(ch);
    if (c.avvisa && a.livello === ASSETTO.ATTACCO) this.say?.(ch, '🛡️ Passata. Chat riaperta.');
  }

  // ── Il blocco sul nascere ─────────────────────────────────────────────────
  // Prende TUTTA l'ondata, compresi quelli arrivati prima dell'allarme, e la
  // consegna all'esecutore. Qui non si chiama Twitch: si decide, e si scrive
  // cosa si e' deciso.
  async _blocca(channel, voci, motivo, cfg) {
    const ch = norm(channel);
    const esenti = (cfg.esenti || []).map(norm);
    const verdetti = voci
      .filter((v) => v.userId && norm(v.login) && !BUONI.has(norm(v.login)) && !esenti.includes(norm(v.login)))
      .map((v) => verdetto({
        canale: ch, login: v.login, userId: v.userId,
        // Sui follow il blocco, non il ban: e' l'unica azione che toglie il
        // follow finto dalla lista, e il numero gonfiato e' il danno vero.
        azione: cfg.togliFollow === false ? AZIONI.BAN : AZIONI.BLOCCA,
        motivi: [v.motivo || 'ondata follow-bot'], origine: 'ondata',
        confidenza: 0.95, aVuoto: this._aVuoto(cfg),
      }));
    if (!verdetti.length) return 0;

    // UNA SOLA STRADA. Consegnare gli stessi verdetti due volte — una in blocco
    // e una uno per uno per sapere com'e' andata — li farebbe scartare come
    // doppioni, e un doppione risponde «ok» senza aver bloccato nessuno: nella
    // rete finirebbero nomi che non sono stati toccati.
    const n = verdetti.length;
    log.warn(`#${ch} blocco sul nascere: ${n} account in fila (${motivo})`);
    registra(ch, { azione: 'blocco', motivo: `${n} account dell'ondata → blocco (${motivo})`, esito: 'in-attesa' });
    if (cfg.avvisa && !this._aVuoto(cfg)) this.say?.(ch, `🛡️ Ondata artificiale: sto ripulendo ${n} account finti.`);
    for (const v of verdetti) {
      this.esecutore.esegui(v).then((r) => {
        // Nella rete entra solo quello che e' andato a buon fine DAVVERO: non
        // un doppione, non una prova a vuoto, non un tentativo fallito.
        if (r?.ok && !r.aVuoto && !r.doppione && !r.saltato) { try { rete.segnala(ch, v.login, 'ondata'); } catch (e) {  } }
      }).catch(() => {});
    }
    return n;
  }

  // ── Decidere ──────────────────────────────────────────────────────────────
  // Qui si sceglie COSA va fatto e si scrive il perché. Non si chiama Twitch:
  // il verdetto va all'esecutore, che ha la coda, il ritmo, la riprova e la
  // coda dei falliti. Sono due mestieri, e adesso stanno in due posti.
  async _agisci(channel, userId, login, motivo, cfg, origine = 'chat', extra = {}) {
    const ch = norm(channel);
    if (cfg.azione === 'segnala') {
      // Decidere di non fare niente è una decisione, e va scritta come le
      // altre: sennò «il bot non ha fatto niente» e «il bot non se n'è
      // accorto» si leggono uguali.
      log.warn(`#${ch} bot segnalato: @${login} (${motivo})`);
      if (cfg.avvisa) this.say?.(ch, `⚠️ Possibile bot: @${login} (${motivo})`);
      registra(ch, { login, userId, azione: 'segnala', motivo, esito: 'in-attesa', stato: 'aperto' });
      return { ok: true, saltato: true };
    }

    // Sui FOLLOW il ban non basta, e per anni gli scudi hanno sbagliato proprio
    // qui: un account bannato RESTA follower, e il numero gonfiato è il danno.
    // In chat invece l'azione giusta è il ban: lì è moderazione, non pulizia
    // della lista.
    let azione;
    if (origine === 'follow' && cfg.togliFollow !== false) azione = AZIONI.BLOCCA;
    else if (cfg.azione === 'timeout') azione = AZIONI.TIMEOUT;
    else azione = AZIONI.BAN;

    return this.esecutore.esegui(verdetto({
      canale: ch, login, userId, azione,
      motivi: [motivo], origine,
      durata: azione === AZIONI.TIMEOUT ? Number(cfg.timeoutSec || 1209600) : 0,
      punti: extra.punti || 0, confidenza: extra.confidenza ?? 0.9,
      aVuoto: this._aVuoto(cfg),
    }));
  }

  // Evento follow (channel.follow v2): user_id, user_login, user_name.
  async onFollow(ev) {
    const channel = norm(ev.channel);
    const cfg = this.cfg(channel);
    if (!cfg.attivo) return;
    const d = ev.data || {};
    const login = norm(d.user_login || d.user_name);
    const userId = d.user_id;
    if (!login || !userId) return;
    if (BUONI.has(login) || (cfg.esenti || []).map(norm).includes(login)) return;

    const ora = Date.now();
    const eraAttacco = assetto(channel).livello === ASSETTO.ATTACCO;
    if (!eraAttacco) segnaRitmo(channel, ora);      // la normalità si impara in pace, non sotto attacco
    const wMs = Number(cfg.rafficaSecondi ?? 30) * 1000;
    const arr = segnaOndata(channel, ora, userId, login, wMs);
    const lunga = segnaLunga(channel, ora);

    if (cfg.raffica) {
      const soglia = sogliaRaffica(channel, cfg);
      if (arr.length >= soglia && !eraAttacco) {
        const g = ondataArtificiale(arr, cfg);
        const motivo = `${arr.length} follow in ${cfg.rafficaSecondi}s (per questo canale la soglia è ${soglia}) · ${g.motivo}`;
        raffiche.set(channel, ora + 120000);
        registra(channel, { azione: 'raffica', motivo, esito: 'avviso' });
        await this._alza(channel, ASSETTO.ATTACCO, motivo, cfg);
        const a = assetti.get(channel);
        // undefined = «non lo so ancora»: si torna a chiedere al prossimo
        // follow, invece di aspettare il venticinquesimo con un «no» che non
        // era un no.
        if (a) a.artificiale = g.basta ? g.certo : undefined;
        if (g.certo && cfg.bloccoSulNascere !== false) {
          await this._blocca(channel, arr.map((v) => ({ ...v, motivo: 'ondata follow-bot' })), g.motivo, cfg);
        }
      } else if (lunga.onda && assetto(channel).livello === ASSETTO.CALMA) {
        await this._alza(channel, ASSETTO.SOSPETTO,
          `${lunga.quanti} follow in dieci minuti (soglia ${lunga.soglia}): onda lenta`, cfg);
      }
    }

    // nome già noto come bot: si agisce sempre, attacco o non attacco
    if (cfg.nomiBot && nomeBot(login, cfg)) return this._agisci(channel, userId, login, 'nome da bot', cfg, 'follow');

    // Attacco in corso e ondata giudicata artificiale: ogni follow che arriva
    // adesso viene dallo stesso posto e va in coda senza altre domande.
    // Il giudizio si rifà ogni venticinque follow: un'ondata può cambiare faccia.
    const a = assetti.get(channel);
    if (a && a.livello === ASSETTO.ATTACCO && cfg.bloccoSulNascere !== false) {
      const prima = a.artificiale;
      if (a.artificiale === undefined || arr.length % 25 === 0) {
        const g = ondataArtificiale(arr, cfg);
        a.artificiale = g.basta ? g.certo : undefined;
        if (g.certo && !a.motivoArt) { a.motivoArt = g.motivo; }
      }
      if (a.artificiale) {
        // LA PRIMA VOLTA CHE CI SI CONVINCE si riprende TUTTA l'ondata, non solo
        // il follow di adesso. All'inizio il giudizio puo' essere «non lo so
        // ancora» — servono quindici follow per rispondere senza rischiare di
        // togliere il follow a dei fan veri — e in quel frattempo ne passano
        // altri. Sono quelli che hanno fatto scattare l'allarme: lasciarli fuori
        // vorrebbe dire ripulire tutto tranne l'inizio dell'attacco.
        const voci = prima === true
          ? [{ ts: ora, userId, login, motivo: 'follow durante ondata artificiale' }]
          : arr.map((v) => ({ ...v, motivo: 'ondata follow-bot' }));
        await this._blocca(channel, voci, a.motivoArt || 'ondata artificiale', cfg);
        return;
      }
    }

    // vecchio interruttore: bannare i follow dell'ondata anche senza certezza
    if (cfg.raffica && cfg.rafficaBanna && inRaffica(channel)) {
      return this._agisci(channel, userId, login, 'follow durante ondata', cfg, 'follow');
    }

    // 3. account sospetto (una chiamata a Twitch). NON durante una raffica: lì
    // l'attacco è già gestito in aggregato, e fare una chiamata Helix per OGNI
    // follow di un'ondata amplificherebbe l'attacco in centinaia di richieste.
    if (cfg.controllaAccount && this.helix?.getUserByLogin && !inRaffica(channel)) {
      const u = await this.helix.getUserByLogin(login).catch(() => null);
      const { rischio, motivi, forte } = valutaAccount(u, cfg);
      // Il numero da solo non basta mai: senza un fatto che una persona non può
      // produrre si segnala e ci si ferma li'. Un account nuovo, spoglio, che
      // guarda e non scrive e' la descrizione di uno spettatore appena
      // arrivato, ed e' esattamente chi non si puo' permettere di perdere.
      if (rischio < Number(cfg.soglia || 70)) return;
      if (!forte) {
        registra(channel, { login, userId, azione: 'segnala', motivo: `punteggio ${rischio}: ${motivi.join(', ')}`, esito: 'in-attesa', stato: 'aperto' });
        return;
      }
      return this._agisci(channel, userId, login, motivi.join(', '), cfg, 'follow');
    }
  }

  // Controllo leggero sui messaggi in chat: un nome da bot noto viene fermato
  // anche se scrive (hate-raid). Ritorna true se ha agito (il chiamante ferma lì).
  async controllaChat(msg) {
    const channel = msg.channel;
    const cfg = this.cfg(channel);
    if (!cfg.attivo) return false;
    if (msg.isBroadcaster || msg.isMod || msg.isVip || msg.isSub) return false;
    const login = norm(msg.user || msg.username);
    if (!login || BUONI.has(login) || (cfg.esenti || []).map(norm).includes(login)) return false;

    // Le tre difese in chat sono cose diverse e stanno su tre interruttori
    // diversi. Prima erano tutte dietro a `nomiBot`: chi spegneva l'elenco dei
    // nomi — che e' una difesa contro i follow-bot promozionali — si portava
    // via anche il CORO, che e' la firma dell'hate-raid, e la trattenuta degli
    // account appena nati. Spegneva una cosa e ne perdeva tre, e nessuno glielo
    // diceva.
    if (cfg.nomiBot && nomeBot(login, cfg)) { await this._agisci(channel, msg.userId, login, 'nome da bot in chat', cfg); return true; }

    // Il coro: lo stesso messaggio da molte bocche diverse in pochi secondi.
    // È la firma dell'hate-raid, e non dipende da chi scrive né da quanto è
    // vecchio il suo account — solo da quello che esce dalle bocche.
    const c = segnaCoro(channel, msg.text || msg.message || '', login, cfg);
    if (c.coro) {
      const motivo = `stesso messaggio da ${c.quanti} account diversi in mezzo minuto`;
      if (assetto(channel).livello !== ASSETTO.ATTACCO) {
        await this._alza(channel, ASSETTO.ATTACCO, motivo, cfg);
      }
      const r = await this.esecutore.esegui(verdetto({
        canale: channel, login, userId: msg.userId, azione: AZIONI.CANCELLA,
        messaggio: msg.id, motivi: [motivo], origine: 'coro',
        confidenza: 0.9, aVuoto: this._aVuoto(cfg),
      }));
      if (r?.ok && !r.aVuoto && !r.doppione) { try { rete.segnala(channel, login, 'coro'); } catch (e) {  } }
      return true;
    }

    // account nuovissimo che scrive: l'equivalente automatico del "Restricted".
    if (cfg.chatNuovi && this.helix?.getUserByLogin && msg.userId) {
      let creato = nascita.get(msg.userId)?.creato;
      if (creato === undefined) {
        // Si ricorda un FATTO (la data di nascita, che non cambia mai), non un
        // tentativo. Se Twitch non risponde — rete storta, 500, token scaduto —
        // ricordarsi «non l'ho potuto controllare» vorrebbe dire non
        // controllarlo mai piu': un inciampo di un secondo diventerebbe un buco
        // permanente nello scudo, proprio per l'account che stava scrivendo.
        let u = null, chiesto = true;
        try { u = await this.helix.getUserByLogin(login); }
        catch { chiesto = false; }
        creato = u?.created_at ? new Date(u.created_at).getTime() : 0;
        if (chiesto) {
          nascita.set(msg.userId, { creato });
          if (nascita.size > 8000) { let n = 0; for (const k of nascita.keys()) { nascita.delete(k); if (++n >= 3000) break; } }
        }
      }
      const ore = creato ? (Date.now() - creato) / 3600000 : 99999;
      if (ore < Number(cfg.chatMinOre || 24)) {
        if (cfg.chatNuoviAzione === 'segnala') {
          log.warn(`#${channel} account nuovissimo in chat: @${login} (${Math.floor(ore)}h)`);
          if (cfg.avvisa) this.say?.(channel, `👀 @${login} ha un account nuovo di zecca (${Math.floor(ore)}h): occhio, mod.`);
          registra(channel, { login, userId: msg.userId, azione: 'chat-segnala', motivo: `account di ${Math.floor(ore)}h che scrive`, esito: 'in-attesa', stato: 'aperto' });
          return false;                       // lasciato in chat, solo segnalato
        }
        log.info(`#${channel} messaggio trattenuto: @${login} (account di ${Math.floor(ore)}h)`);
        if (cfg.avvisa && !this._aVuoto(cfg)) this.say?.(channel, `🛡️ Messaggio di @${login} trattenuto: account creato da poco. Mod, se è ok fatelo riscrivere.`);
        // «Limita» e non «cancella»: il messaggio non passa, ma la persona
        // resta in chat e i mod possono farla riscrivere. È la differenza fra
        // trattenere e punire, e va scritta anche nel registro.
        await this.esecutore.esegui(verdetto({
          canale: channel, login, userId: msg.userId, azione: AZIONI.LIMITA,
          messaggio: msg.id, motivi: [`account di ${Math.floor(ore)}h`], origine: 'chat-nuovi',
          confidenza: 0.6, aVuoto: this._aVuoto(cfg),
        }));
        return true;                          // trattenuto: il messaggio si ferma qui
      }
    }
    return false;
  }

  // ── Il giro delle presenze ────────────────────────────────────────────────
  //
  // Il lurker-bot non si incontra mai nel percorso dei messaggi, perche' non
  // scrive: e' tutto il suo mestiere. Lo si incontra QUI, guardando chi c'e' in
  // chat — la lista che chiediamo gia' ogni cinque minuti per contare le ore
  // guardate. Zero chiamate nuove per il segnale, una sola per i profili.
  //
  // Si guarda solo chi sta in almeno tre canali nostri nello stesso momento e
  // non ha mai scritto qui. Sono pochi, e sono gli unici per cui il segnale
  // forte puo' esserci.
  //
  // L'azione predefinita e' SEGNALARE, sempre. Un lurker silenzioso non fa
  // danno mentre lo si guarda, e il costo di sbagliare e' una persona vera
  // cacciata dal canale. Chi vuole che agisca lo accende lui.
  async giroPresenze(channel, presenti = []) {
    const ch = norm(channel);
    const cfg = this.cfg(ch);
    if (!cfg.attivo || cfg.presenze === false || !this.helix?.getUsersByLogin) return { guardati: 0, segnalati: 0 };
    const candidati = [];
    for (const p of presenti) {
      const l = norm(p);
      if (!l || BUONI.has(l) || (cfg.esenti || []).map(norm).includes(l)) continue;
      if (canaliInsieme(l) < 3) continue;
      if (memory.haScrittoDopo?.(ch, l, 0)) continue;      // qui ha parlato: e' una persona
      candidati.push(l);
      if (candidati.length >= 100) break;                  // un batch per giro, non di piu'
    }
    if (!candidati.length) return { guardati: 0, segnalati: 0 };

    const utenti = await this.helix.getUsersByLogin(candidati).catch(() => []);
    let segnalati = 0;
    let elenco = [];
    try { elenco = statoVivo.leggi(ch, GIUDIZI_CHIAVE) || []; } catch (e) { elenco = []; }
    for (const u of utenti) {
      const g = valutaAccount(u, cfg, { maiScritto: true });
      if (!g.punti || g.punti < SOGLIA_SEGNALA) continue;
      segnalati++;
      elenco = segnaGiudizio(elenco, { login: norm(u.login), punti: g.punti, agito: false });
      registra(ch, {
        login: norm(u.login), userId: u.id, azione: 'presenza',
        motivo: `${g.punti} punti · ${g.motivi.join(', ')}`,
        esito: 'in-attesa', stato: 'aperto',
      });
    }
    if (segnalati) { try { statoVivo.scrivi(ch, GIUDIZI_CHIAVE, elenco); } catch (e) {  } }
    if (segnalati) log.info(`#${ch} giro presenze: ${segnalati} segnalati su ${candidati.length} guardati`);
    return { guardati: candidati.length, segnalati };
  }

  // ── Pulizia della lista follower ──────────────────────────────────────────
  // La difesa in tempo reale ferma quello che arriva adesso. Non tocca chi è già
  // dentro: i bot che hanno seguito prima che lo scudo fosse acceso, e quelli
  // finiti nella lista pubblica soltanto dopo aver seguito. Restano lì a gonfiare
  // il numero, che è il danno vero di un follow-bot.
  //
  // Qui si scorre la lista follower e si BLOCCA chi è riconosciuto — di nuovo:
  // blocco, non ban, perché è l'unica azione che toglie il follow.
  //
  // Due prudenze. Si guardano solo i nomi già noti o che corrispondono ai
  // pattern, mai il punteggio di sospetto: qui non c'è un attacco in corso a
  // giustificare un margine di errore, e un fan vero rimosso non torna. E si va
  // al ritmo della coda, perché un canale con diecimila follower sono cento
  // pagine e altrettante migliaia di chiamate.
  async pulisciFollower(channel, { max = 3000, prova = false, alPasso = null } = {}) {
    const ch = norm(channel);
    const cfg = this.cfg(ch);
    const esiti = { guardati: 0, trovati: [], bloccati: 0, falliti: 0, totale: 0 };
    let cursore = '', pagine = 0;
    while (esiti.guardati < max && pagine < 60) {
      const arr = await this.helix?.getRecentFollowers?.(ch, { first: 100, dopo: cursore }).catch(() => []);
      if (!arr || !arr.length) break;
      if (!esiti.totale) esiti.totale = arr.totale || 0;
      pagine++;
      for (const f of arr) {
        esiti.guardati++;
        const login = norm(f.user_login || f.user_name);
        if (!login || BUONI.has(login)) continue;
        if ((cfg.esenti || []).map(norm).includes(login)) continue;
        if (!nomeBot(login, cfg)) continue;
        esiti.trovati.push({ login, userId: f.user_id, seguito: f.followed_at });
      }
      cursore = arr.cursore || '';
      if (!cursore) break;
      if (alPasso) alPasso({ ...esiti, trovati: esiti.trovati.length });
    }
    if (prova || !esiti.trovati.length) return esiti;

    // Anche qui si decide e basta. Il ritmo, la riprova e la coda dei falliti
    // li tiene l'esecutore, che e' lo stesso di un attacco in corso: cosi' una
    // pulizia lanciata durante un'ondata non si mette a gareggiare con la
    // difesa per il rate limit, si mette in fila dietro — e ci va dietro sul
    // serio, perche' la pulizia e' la meno urgente di tutte.
    const esiti2 = await Promise.all(esiti.trovati.map((v) => this.esecutore.esegui(verdetto({
      canale: ch, login: v.login, userId: v.userId, azione: AZIONI.BLOCCA,
      motivi: ['pulizia lista follower: nome da bot noto'], origine: 'pulizia',
      confidenza: 0.99, aVuoto: this._aVuoto(cfg),
    }))));
    for (const r of esiti2) { if (r?.ok) esiti.bloccati++; else esiti.falliti++; }
    log.info(`#${ch} pulizia follower: ${esiti.bloccati} bot rimossi su ${esiti.guardati} guardati`);
    return esiti;
  }

  // Evento raid: un raid enorme da un account minuscolo/nuovo è un classico
  // hate-raid. Qui ci limitiamo ad avvisare: bannare un raid vero sarebbe grave.
  onRaid(ev) {
    const channel = ev.channel;
    const cfg = this.cfg(channel);
    if (!cfg.attivo) return;
    const n = Number(ev.data?.viewers || 0);
    if (n >= 50 && cfg.avvisa) {
      this.alert?.(channel, { tipo: 'antibot', testo: `Raid da ${n}: controlla che sia genuino` });
      registra(channel, { login: norm(ev.data?.from_login || ev.data?.from_name), azione: 'raid', motivo: `raid da ${n} spettatori`, esito: 'avviso' });
    }
  }
}
