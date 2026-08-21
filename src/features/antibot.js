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

export class AntiBot {
  constructor({ helix, alert, say, chatSettings } = {}) {
    this.helix = helix;
    this.alert = alert;                 // (channel, {tipo, testo}) per l'overlay (facolt.)
    this.say = say;                      // (channel, testo)
    this.chatSettings = chatSettings;    // (channel, {followersOnly}) se il bot sa farlo (facolt.)
  }

  cfg(channel) { return { ...ANTIBOT_DEFAULT, ...(streamers.get(channel)?.settings?.antibot || {}) }; }

  async _agisci(channel, userId, login, motivo, cfg) {
    if (cfg.azione === 'segnala') {
      log.warn(`#${channel} bot segnalato: @${login} (${motivo})`);
      if (cfg.avvisa) this.say?.(channel, `⚠️ Possibile bot: @${login} (${motivo})`);
      registra(channel, { login, userId, azione: 'segnala', motivo, esito: 'in-attesa', stato: 'aperto' });
      return;
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
    const channel = ev.channel;
    const cfg = this.cfg(channel);
    if (!cfg.attivo) return;
    const d = ev.data || {};
    const login = norm(d.user_login || d.user_name);
    const userId = d.user_id;
    if (!login || !userId) return;
    if (BUONI.has(login) || (cfg.esenti || []).map(norm).includes(login)) return;

    // 1. raffica
    if (cfg.raffica) {
      const { quanti, raffica } = segnaFollow(channel, cfg);
      if (raffica && !inRaffica(channel)) {
        raffiche.set(channel, Date.now() + 120000);         // "in allarme" per 2 minuti
        log.warn(`#${channel} RAFFICA DI FOLLOW: ${quanti} in ${cfg.rafficaSecondi}s → possibile attacco`);
        if (cfg.avvisa) this.say?.(channel, `🛡️ Rilevata un'ondata di follow sospetti: attivo la protezione.`);
        this.alert?.(channel, { tipo: 'antibot', testo: 'Ondata di follow sospetti' });
        if (cfg.rafficaChiudiChat) this.chatSettings?.(channel, { followersOnly: true }).catch(() => {});
        registra(channel, { azione: 'raffica', motivo: `${quanti} follow in ${cfg.rafficaSecondi}s${cfg.rafficaChiudiChat ? ' · chat ai soli follower' : ''}`, esito: 'avviso' });
      }
    }

    // 2. nome da bot → agisci sempre
    if (cfg.nomiBot && nomeBot(login, cfg)) return this._agisci(channel, userId, login, 'nome da bot', cfg);

    // durante la raffica, i follow nuovi con nome sospetto si bannano se richiesto
    if (cfg.raffica && cfg.rafficaBanna && inRaffica(channel)) {
      return this._agisci(channel, userId, login, 'follow durante ondata', cfg);
    }

    // 3. account sospetto (una chiamata a Twitch). NON durante una raffica: lì
    // l'attacco è già gestito in aggregato (passo 1), e fare una chiamata Helix
    // per OGNI follow di un'ondata amplificherebbe l'attacco in centinaia di
    // richieste. Fuori dalla raffica, una chiamata per follow va bene.
    if (cfg.controllaAccount && this.helix?.getUserByLogin && !inRaffica(channel)) {
      const u = await this.helix.getUserByLogin(login).catch(() => null);
      const { rischio, motivi } = valutaAccount(u, cfg);
      if (rischio >= Number(cfg.soglia || 70)) return this._agisci(channel, userId, login, motivi.join(', '), cfg);
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
