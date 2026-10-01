// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Comandi "base" pronti all'uso: quelli che ogni streamer si aspetta già
// funzionanti senza doverli costruire a mano — !so/!shoutout, !followage,
// !uptime, !bit. Vivono qui come add-on OPT-OUT (accesi salvo che lo streamer li
// spenga) e NON prevalgono MAI su un comando o un Modulo che lo streamer ha
// creato con lo stesso nome: la SUA versione vince sempre (niente doppioni,
// niente sorprese). Restano deterministici: mai passano dall'IA.
import { streamers } from '../db.js';
import { personalizzato } from './personalizzati.js';
import * as bit from './bit.js';
import { makeLog } from '../logger.js';
import { aChi } from './risposte.js';
import { nomeIn, rispostaDi } from './comandi-registro.js';
import { linguaChat } from './lingua-canale.js';
import { preferenzeDi as _pref, F as _F } from './preferenze.js';
import * as prossime from './prossime.js';
import * as voce from './voce.js';

const log = makeLog('comandibase');

const attivo = (channel) => streamers.get(channel)?.settings?.comandiBase?.attivo !== false;

// «Quello che ti sei costruito vince»: la regola sta in un posto solo
// (features/personalizzati.js) e vale per tutti i comandi pronti, non solo qui.
// Il vaglio principale e' in cima alla catena; questo resta perche' i comandi
// base si possono chiamare anche da fuori.

// Chi non si trova si dice nella lingua della chat.
const NON_TROVO = { it: '🤔 Non trovo questo utente.', en: '🤔 I can\'t find that user.', es: '🤔 No encuentro a ese usuario.' };

// Le preferenze del canale con le due cose che servono qui: la data e il tempo
// passato, scritti come li vuole il canale (preferenze.js, formati.js).
const preferenzeDi = (ch) => {
  const p = _pref(ch);
  return { ...p, data: (ms) => _F.data(ms, p), tempo: (ms) => _F.tempoDa(ms, p) };
};

function fmtUptime(startedAt) {
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return '';
  const min = Math.max(0, Math.floor((Date.now() - start) / 60_000));
  const h = Math.floor(min / 60);
  return h > 0 ? `${h}h ${min % 60}m` : `${min}m`;
}

const nomeOk = (s) => /^[a-z0-9_]{2,25}$/.test(s);

// Ritorna true se il messaggio era un comando base (gestito), false altrimenti.
export async function tryComando(helix, msg, say) {
  try {
    if (!msg) return false;   // lo streamer scrive col NOSTRO account: scartarlo scarta lui (docs/COMANDI.md)
    const testo = String(msg.text || '').trim();
    if (!testo.startsWith('!')) return false;
    const ch = msg.channel;
    const parti = testo.slice(1).split(/\s+/);
    const cmd = (parti.shift() || '').toLowerCase();

    // TRASPARENZA IA (Reg. UE 2024/1689 "AI Act", art. 50): chiunque interagisce
    // deve poter sapere che sta parlando con un sistema automatico/IA. Questa
    // dichiarazione è SEMPRE disponibile (non dipende dall'opt-out dei comandi
    // base); se lo streamer ha definito un suo !bot, vince il suo.
    if (cmd === 'bot' || cmd === 'ia' || cmd === 'ai' || cmd === 'socialbot') {
      if (personalizzato(ch, cmd)) return false;
      say(`🤖 Sono un assistente automatico: alcune risposte in chat sono generate da un'intelligenza artificiale (SocialBot). Gestito da @${ch} · socialbot.live`);
      return true;
    }

    if (!attivo(ch) || !helix) return false;

    // ---- SHOUTOUT ufficiale: !so / !shoutout <canale> (solo mod/broadcaster) ----
    if (cmd === 'so' || cmd === 'shoutout') {
      if (personalizzato(ch, cmd)) return false;
      if (!(msg.isMod || msg.isBroadcaster)) return true;   // solo staff, in silenzio per gli altri
      const chi = (parti[0] || '').replace(/^@/, '').toLowerCase();
      if (!nomeOk(chi)) { aChi(msg, say)(`📣 Si fa così: !${nomeIn(msg.channel, 'so')} e il nome del canale.`); return true; }
      const r = await helix.shoutout(ch, chi);
      if (r?.ok) {
        let gioco = '';
        try {
          const u = await helix.getUserByLogin(chi);
          if (u?.id) { const info = await helix.getChannelInfo(u.id); gioco = info?.game_name || ''; }
        } catch { /* niente: il banner è già partito */ }
        const frase = voce.di(ch, 'shoutout', { nome: r.target || chi, link: `twitch.tv/${chi}`, gioco });
        if (frase) say(frase);
      } else if (r?.motivo) {
        // MAI errori muti: spieghiamo perché
        if (/permesso/.test(r.motivo)) say('🔒 Mi manca il permesso per lo shoutout ufficiale: riautorizza i permessi dalla dashboard.');
        else if (/diretta/.test(r.motivo)) say('📣 Lo shoutout ufficiale funziona solo mentre sei in diretta.');
        else say('📣 ' + r.motivo);
      }
      return true;
    }

    // ---- FOLLOWAGE: !followage / !daquanto [@nome] ----
    if (cmd === 'followage' || cmd === 'daquanto') {
      if (personalizzato(ch, cmd)) return false;
      if (typeof helix.getFollowAge !== 'function') return false;
      const chi = (parti[0] || '').replace(/^@/, '').toLowerCase();
      let uid = msg.userId || '';
      let nome = msg.display || msg.user;
      if (chi && nomeOk(chi)) {
        try { const u = await helix.getUserByLogin(chi); uid = u?.id || ''; nome = u?.display_name || chi; }
        catch { uid = ''; }
      }
      if (!uid) { say(NON_TROVO[linguaChat(ch)] || NON_TROVO.it); return true; }
      const iso = await helix.getFollowAge(ch, uid);
      const pref = preferenzeDi(ch);
      const da = Date.parse(iso || '');
      say(Number.isFinite(da)
        ? rispostaDi(ch, 'followage', 'si', { nome, durata: pref.tempo(da), data: pref.data(da) })
        : rispostaDi(ch, 'followage', 'no', { nome }));
      return true;
    }

    // ---- CHANNELAGE: !channelage [@nome] — da quanto esiste il canale ----
    // Senza nome e' il canale dove si scrive; con un nome, il canale di quella
    // persona (su Twitch ogni account e' un canale). La data e' quella che
    // Twitch da' alla nascita dell'account, nel fuso e nel formato del canale.
    if (cmd === 'channelage' || cmd === 'accountage' || cmd === 'etacanale') {
      if (personalizzato(ch, cmd)) return false;
      if (typeof helix.getUserByLogin !== 'function') return false;
      const chi = (parti[0] || '').replace(/^@/, '').toLowerCase();
      const di = chi && nomeOk(chi) ? chi : ch;
      let u = null;
      try { u = await helix.getUserByLogin(di); } catch { u = null; }
      const nato = Date.parse(u?.created_at || '');
      if (!Number.isFinite(nato)) { say(NON_TROVO[linguaChat(ch)] || NON_TROVO.it); return true; }
      const pref = preferenzeDi(ch);
      say(rispostaDi(ch, 'channelage', 'si', { nome: u.display_name || di, durata: pref.tempo(nato), data: pref.data(nato) }));
      return true;
    }

    // ---- BIT: !bit / !bits / !classificabit — la classifica di Twitch ----
    // Tace quando non la sappiamo: il pannello avverte già lo streamer dei
    // permessi mancanti, e in chat non si raccontano i nostri tubi.
    if (cmd === 'bit' || cmd === 'bits' || cmd === 'classificabit') {
      if (personalizzato(ch, cmd)) return false;
      const quando = { oggi: 'day', giorno: 'day', settimana: 'week', mese: 'month', anno: 'year', sempre: 'all' };
      const riga = await bit.riga(helix, ch, {
        mio: String(msg.user || '').toLowerCase(),
        periodo: quando[(parti[0] || '').toLowerCase()] || 'month',
      });
      if (riga) say(riga);
      return true;
    }

    // ---- PROSSIMA: !prossima — quando e' la prossima diretta, dalla fonte
    // scelta (la settimana o il Programma di Twitch, vedi prossime.js) ----
    if (cmd === 'prossima') {
      if (personalizzato(ch, cmd)) return false;
      say(await prossime.testoProssima(ch, { helix }));
      return true;
    }

    // ---- UPTIME: !uptime — da quanto è in diretta ----
    if (cmd === 'uptime') {
      if (personalizzato(ch, cmd)) return false;
      let st = null;
      try { st = await helix.getStream(ch); } catch { st = null; }
      say(st?.started_at ? `🔴 In diretta da ${fmtUptime(st.started_at)}.` : '⚫ Il canale non è in diretta adesso.');
      return true;
    }

    return false;
  } catch (e) { log.debug('tryComando:', e?.message || e); return false; }
}
