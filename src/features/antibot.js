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

import { makeLog } from '../logger.js';
import { streamers } from '../db.js';

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

// Un nome è da follow-bot? (esclusi i bot buoni e gli esentati dello streamer)
export function nomeBot(login, cfg = {}) {
  const l = norm(login);
  if (!l) return false;
  if (BUONI.has(l)) return false;
  const esenti = (cfg.esenti || []).map(norm);
  if (esenti.includes(l)) return false;
  const extra = (cfg.extra || []).map(norm).filter(Boolean);
  if (extra.includes(l)) return true;                 // esatto, aggiunto dallo streamer
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
      return;
    }
    const durata = cfg.azione === 'timeout' ? Number(cfg.timeoutSec || 1209600) : 0;
    const r = await this.helix?.timeoutUser?.(channel, userId, durata, `anti-bot: ${motivo}`).catch(() => null);
    if (r?.ok) log.info(`#${channel} anti-bot: @${login} ${durata ? 'in timeout' : 'bannato'} (${motivo})`);
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
      }
    }

    // 2. nome da bot → agisci sempre
    if (cfg.nomiBot && nomeBot(login, cfg)) return this._agisci(channel, userId, login, 'nome da bot', cfg);

    // durante la raffica, i follow nuovi con nome sospetto si bannano se richiesto
    if (cfg.raffica && cfg.rafficaBanna && inRaffica(channel)) {
      return this._agisci(channel, userId, login, 'follow durante ondata', cfg);
    }

    // 3. account sospetto (una chiamata a Twitch)
    if (cfg.controllaAccount && this.helix?.getUserByLogin) {
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
          return false;                       // lasciato in chat, solo segnalato
        }
        await this.helix?.deleteMessage?.(channel, msg.id).catch(() => {});
        log.info(`#${channel} messaggio trattenuto: @${login} (account di ${Math.floor(ore)}h)`);
        if (cfg.avvisa) this.say?.(channel, `🛡️ Messaggio di @${login} trattenuto: account creato da poco. Mod, se è ok fatelo riscrivere.`);
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
    }
  }
}
