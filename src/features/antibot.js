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
import { streamers } from '../db.js';
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
export function valutaAccount(u, cfg = {}) {
  if (!u) return { rischio: 0, motivi: [] };
  const motivi = []; let r = 0;
  const etaMin = Number(cfg.etaMinGiorni ?? 3);
  const giorni = u.created_at ? (Date.now() - new Date(u.created_at).getTime()) / 86400000 : 9999;
  if (giorni < 1) { r += 45; motivi.push('account di oggi'); }
  else if (giorni < etaMin) { r += 30; motivi.push(`account di ${Math.floor(giorni)} giorni`); }
  else if (giorni < 14) { r += 12; motivi.push('account recente'); }
  if (/user-default-pictures/i.test(u.profile_image_url || '')) { r += 25; motivi.push('foto profilo di default'); }
  if (!String(u.description || '').trim()) { r += 10; motivi.push('bio vuota'); }
  if (nomeBot(u.login, cfg)) { r += 50; motivi.push('nome da bot'); }
  return { rischio: Math.min(100, r), motivi };
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
const assetti = new Map();               // channel → { livello, da, motivo, ripristino, timer }

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

function segnaRitmo(channel, ora) {
  const r = ritmi.get(channel) || { medio: 0, visti: 0, ultimo: 0 };
  if (r.ultimo) {
    const dt = Math.min(600000, ora - r.ultimo);
    r.medio = r.medio ? r.medio * 0.88 + dt * 0.12 : dt;
    r.visti++;
  }
  r.ultimo = ora;
  ritmi.set(channel, r);
  return r;
}

// Quanti follow, in questa finestra, sono davvero anomali per QUESTO canale.
export function sogliaRaffica(channel, cfg = {}) {
  const base = Math.max(3, Number(cfg.rafficaQuanti ?? 10));
  const w = Number(cfg.rafficaSecondi ?? 30) * 1000;
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
export function ondataArtificiale(arr, cfg = {}) {
  const n = arr.length;
  if (n < 6) return { certo: false, motivo: '' };

  const dt = [];
  for (let k = 1; k < n; k++) dt.push(arr[k].ts - arr[k - 1].ts);
  const media = dt.reduce((a, b) => a + b, 0) / dt.length;
  let cv = 1;
  if (media > 0) {
    const varia = dt.reduce((a, b) => a + (b - media) ** 2, 0) / dt.length;
    cv = Math.sqrt(varia) / media;
  }
  if (media > 0 && cv < 0.45) {
    return { certo: true, motivo: `cadenza da macchina (un follow ogni ${Math.round(media)}ms, dispersione ${cv.toFixed(2)})` };
  }

  const noti = arr.filter((v) => nomeBot(v.login, cfg)).length;
  if (noti / n >= 0.3) {
    return { certo: true, motivo: `${noti} nomi su ${n} già noti come follow-bot` };
  }
  return { certo: false, motivo: `cadenza irregolare (${cv.toFixed(2)}), nomi puliti: sembra gente vera` };
}

// ── Coda dei ban ────────────────────────────────────────────────────────────
// Twitch banna un account per chiamata: mille follow finti sono mille chiamate.
// Il limite è 800 richieste al minuto per canale, e la pratica consigliata è
// restare sotto le 400 per la moderazione. Andiamo a 6 al secondo (360 al
// minuto), con rientro se comunque arriva un 429: durante un attacco farsi
// bloccare dal rate limit significa restare disarmati sul più bello.
const CODA_AL_SEC = 6;
const code = new Map();                  // channel → { lista, chiInCoda:Set, attiva, pausaFino }

export function codaBan(channel) {
  const c = code.get(norm(channel));
  return { in_attesa: c ? c.lista.length : 0 };
}

function accodaBan(channel, voci) {
  const ch = norm(channel);
  const c = code.get(ch) || { lista: [], chiInCoda: new Set(), attiva: false, pausaFino: 0 };
  let aggiunti = 0;
  for (const v of voci) {
    if (!v.userId || c.chiInCoda.has(v.userId)) continue;
    c.chiInCoda.add(v.userId);
    c.lista.push(v);
    aggiunti++;
  }
  code.set(ch, c);
  return aggiunti;
}

export class AntiBot {
  constructor({ helix, alert, say, chatSettings } = {}) {
    this.helix = helix;
    this.alert = alert;                 // (channel, {tipo, testo}) per l'overlay (facolt.)
    this.say = say;                      // (channel, testo)
    this.chatSettings = chatSettings;    // (channel, {followersOnly}) se il bot sa farlo (facolt.)
  }

  // La configurazione dello streamer, più quello che l'assetto impone ADESSO.
  // L'aggiunta vive in memoria e non tocca le impostazioni salvate: se il
  // processo cadesse a metà attacco, il canale non resterebbe in assetto per
  // sempre — al riavvio è di nuovo in pace, per costruzione.
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
  // manda in coda. Poi ogni nuovo follow, finché dura l'attacco, entra di suo.
  async _blocca(channel, voci, motivo, cfg) {
    const puliti = voci.filter((v) => {
      const l = norm(v.login);
      return v.userId && l && !BUONI.has(l) && !(cfg.esenti || []).map(norm).includes(l);
    });
    if (!puliti.length) return 0;
    const n = accodaBan(channel, puliti);
    if (n) {
      log.warn(`#${channel} blocco sul nascere: ${n} account in coda per il ban (${motivo})`);
      registra(channel, { azione: 'blocco', motivo: `${n} account dell'ondata → ban (${motivo})`, esito: 'in-attesa' });
      if (cfg.avvisa) this.say?.(channel, `🛡️ Ondata artificiale: sto ripulendo ${n} account finti.`);
    }
    this._svuotaCoda(channel, cfg);
    return n;
  }

  async _svuotaCoda(channel, cfg) {
    const ch = norm(channel);
    const c = code.get(ch);
    if (!c || c.attiva) return;
    c.attiva = true;
    try {
      while (c.lista.length) {
        if (c.pausaFino > Date.now()) {
          await new Promise((r) => setTimeout(r, c.pausaFino - Date.now()));
          continue;
        }
        const v = c.lista.shift();
        c.chiInCoda.delete(v.userId);
        // Prima il blocco, che è ciò che toglie il follow. Il ban da solo
        // lascerebbe il follow finto nella lista: l'attacco resterebbe a segno.
        let r = null, azione = 'blocca';
        if (cfg.togliFollow !== false) r = await this.helix?.bloccaUtente?.(ch, v.userId, v.motivo || 'follow-bot').catch(() => null);
        if (!r?.ok) {
          azione = 'ban';
          r = await this.helix?.timeoutUser?.(ch, v.userId, 0, `anti-bot: ${v.motivo || 'ondata'}`).catch(() => null);
        }
        if (r?.motivo === 'errore Twitch') {
          // può essere un 429: si rientra e si riprova più piano
          c.pausaFino = Date.now() + 5000;
          c.lista.unshift(v);
          c.chiInCoda.add(v.userId);
          continue;
        }
        registra(ch, { login: v.login, userId: v.userId, azione, motivo: v.motivo || 'ondata follow-bot', esito: r?.ok ? 'fatto' : 'fallito' });
        await new Promise((r2) => setTimeout(r2, Math.round(1000 / CODA_AL_SEC)));
      }
    } finally {
      c.attiva = false;
    }
  }

  // Sui FOLLOW il ban non basta, e per anni gli scudi hanno sbagliato proprio qui:
  // un account bannato RESTA follower. Il numero gonfiato dal follow-bot resta
  // gonfiato, ed è quello il danno — il rapporto follower/spettatori conta per
  // Affiliato e Partner, e chi arriva sul canale lo legge. Solo il BLOCCO toglie
  // il follow, e in più impedisce di rifarlo. In chat invece l'azione giusta
  // resta il ban: è moderazione, non pulizia della lista follower.
  async _togliFollow(channel, userId, login, motivo, cfg) {
    if (cfg.togliFollow === false) return null;
    const r = await this.helix?.bloccaUtente?.(channel, userId, motivo).catch(() => null);
    if (r?.ok) log.info(`#${channel} @${login} bloccato: follow rimosso e non può rifarlo`);
    else if (r?.motivo === 'permesso mancante') log.warn(`#${channel} non posso togliere il follow a @${login}: manca user:manage:blocked_users`);
    return r;
  }

  async _agisci(channel, userId, login, motivo, cfg, origine = 'chat') {
    if (cfg.azione === 'segnala') {
      log.warn(`#${channel} bot segnalato: @${login} (${motivo})`);
      if (cfg.avvisa) this.say?.(channel, `⚠️ Possibile bot: @${login} (${motivo})`);
      registra(channel, { login, userId, azione: 'segnala', motivo, esito: 'in-attesa', stato: 'aperto' });
      return;
    }
    if (origine === 'follow') {
      const b = await this._togliFollow(channel, userId, login, motivo, cfg);
      if (b?.ok) {
        registra(channel, { login, userId, azione: 'blocca', motivo, esito: 'fatto' });
        return;
      }
    }
    const durata = cfg.azione === 'timeout' ? Number(cfg.timeoutSec || 1209600) : 0;
    const r = await this.helix?.timeoutUser?.(channel, userId, durata, `anti-bot: ${motivo}`).catch(() => null);
    const esito = r?.ok ? 'fatto' : 'fallito';
    if (r?.ok) log.info(`#${channel} anti-bot: @${login} ${durata ? 'in timeout' : 'bannato'} (${motivo})`);
    else log.warn(`#${channel} anti-bot: @${login} NON ${durata ? 'messo in timeout' : 'bannato'} (${motivo}) — permesso mancante?`);
    registra(channel, { login, userId, azione: durata ? 'timeout' : 'ban', motivo, esito });
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
        if (a) a.artificiale = g.certo;
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
      if (a.artificiale === undefined || arr.length % 25 === 0) {
        const g = ondataArtificiale(arr, cfg);
        a.artificiale = g.certo;
        if (g.certo && !a.motivoArt) { a.motivoArt = g.motivo; }
      }
      if (a.artificiale) {
        await this._blocca(channel, [{ ts: ora, userId, login, motivo: 'follow durante ondata artificiale' }], a.motivoArt || 'ondata artificiale', cfg);
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
      const { rischio, motivi } = valutaAccount(u, cfg);
      if (rischio >= Number(cfg.soglia || 70)) return this._agisci(channel, userId, login, motivi.join(', '), cfg, 'follow');
    }
  }

  // Controllo leggero sui messaggi in chat: un nome da bot noto viene fermato
  // anche se scrive (hate-raid). Ritorna true se ha agito (il chiamante ferma lì).
  async controllaChat(msg) {
    const channel = msg.channel;
    const cfg = this.cfg(channel);
    if (!cfg.attivo || !cfg.nomiBot) return false;
    if (msg.isBroadcaster || msg.isMod || msg.isVip || msg.isSub) return false;
    const login = norm(msg.user || msg.username);
    if (!login || BUONI.has(login) || (cfg.esenti || []).map(norm).includes(login)) return false;
    if (nomeBot(login, cfg)) { await this._agisci(channel, msg.userId, login, 'nome da bot in chat', cfg); return true; }

    // Il coro: lo stesso messaggio da molte bocche diverse in pochi secondi.
    // È la firma dell'hate-raid, e non dipende da chi scrive né da quanto è
    // vecchio il suo account — solo da quello che esce dalle bocche.
    const c = segnaCoro(channel, msg.text || msg.message || '', login, cfg);
    if (c.coro) {
      const motivo = `stesso messaggio da ${c.quanti} account diversi in mezzo minuto`;
      if (assetto(channel).livello !== ASSETTO.ATTACCO) {
        await this._alza(channel, ASSETTO.ATTACCO, motivo, cfg);
      }
      const del = await this.helix?.deleteMessage?.(channel, msg.id).then(() => true).catch(() => false);
      registra(channel, { login, userId: msg.userId, azione: 'coro', motivo, esito: del ? 'fatto' : 'fallito' });
      return true;
    }

    // account nuovissimo che scrive: l'equivalente automatico del "Restricted".
    if (cfg.chatNuovi && this.helix?.getUserByLogin && msg.userId) {
      let creato = nascita.get(msg.userId)?.creato;
      if (creato === undefined) {
        const u = await this.helix.getUserByLogin(login).catch(() => null);
        creato = u?.created_at ? new Date(u.created_at).getTime() : 0;
        nascita.set(msg.userId, { creato });
        if (nascita.size > 8000) { let n = 0; for (const k of nascita.keys()) { nascita.delete(k); if (++n >= 3000) break; } }
      }
      const ore = creato ? (Date.now() - creato) / 3600000 : 99999;
      if (ore < Number(cfg.chatMinOre || 24)) {
        if (cfg.chatNuoviAzione === 'segnala') {
          log.warn(`#${channel} account nuovissimo in chat: @${login} (${Math.floor(ore)}h)`);
          if (cfg.avvisa) this.say?.(channel, `👀 @${login} ha un account nuovo di zecca (${Math.floor(ore)}h): occhio, mod.`);
          registra(channel, { login, userId: msg.userId, azione: 'chat-segnala', motivo: `account di ${Math.floor(ore)}h che scrive`, esito: 'in-attesa', stato: 'aperto' });
          return false;                       // lasciato in chat, solo segnalato
        }
        const del = await this.helix?.deleteMessage?.(channel, msg.id).then(() => true).catch(() => false);
        log.info(`#${channel} messaggio trattenuto: @${login} (account di ${Math.floor(ore)}h)`);
        if (cfg.avvisa) this.say?.(channel, `🛡️ Messaggio di @${login} trattenuto: account creato da poco. Mod, se è ok fatelo riscrivere.`);
        registra(channel, { login, userId: msg.userId, azione: 'chat-trattieni', motivo: `account di ${Math.floor(ore)}h`, esito: del ? 'fatto' : 'fallito' });
        return true;                          // trattenuto: il messaggio si ferma qui
      }
    }
    return false;
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

    for (const v of esiti.trovati) {
      const r = await this.helix?.bloccaUtente?.(ch, v.userId, 'follow-bot noto').catch(() => null);
      if (r?.ok) esiti.bloccati++; else esiti.falliti++;
      registra(ch, { login: v.login, userId: v.userId, azione: 'blocca', motivo: 'pulizia lista follower: nome da bot noto', esito: r?.ok ? 'fatto' : 'fallito' });
      await new Promise((r2) => setTimeout(r2, Math.round(1000 / CODA_AL_SEC)));
    }
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
