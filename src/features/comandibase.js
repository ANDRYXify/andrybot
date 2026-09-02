// Comandi "base" pronti all'uso: quelli che ogni streamer si aspetta già
// funzionanti senza doverli costruire a mano — !so/!shoutout, !followage,
// !uptime. Vivono qui come add-on OPT-OUT (accesi salvo che lo streamer li
// spenga) e NON prevalgono MAI su un comando o un Modulo che lo streamer ha
// creato con lo stesso nome: la SUA versione vince sempre (niente doppioni,
// niente sorprese). Restano deterministici: mai passano dall'IA.
import { streamers } from '../db.js';
import { personalizzato } from './personalizzati.js';
import { makeLog } from '../logger.js';

const log = makeLog('comandibase');

const attivo = (channel) => streamers.get(channel)?.settings?.comandiBase?.attivo !== false;

// «Quello che ti sei costruito vince»: la regola sta in un posto solo
// (features/personalizzati.js) e vale per tutti i comandi pronti, non solo qui.
// Il vaglio principale e' in cima alla catena; questo resta perche' i comandi
// base si possono chiamare anche da fuori.

// durata "umana" da una data ISO a ORA: "2 anni e 3 mesi", "5 mesi", "12 giorni".
function fmtDurata(fromISO) {
  const start = new Date(fromISO).getTime();
  if (!Number.isFinite(start)) return '';
  const sec = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const g = Math.floor(sec / 86400);
  const anni = Math.floor(g / 365), mesi = Math.floor((g % 365) / 30), giorni = g % 30;
  const plur = (n, u, t) => `${n} ${n === 1 ? u : t}`;
  const parti = [];
  if (anni) parti.push(plur(anni, 'anno', 'anni'));
  if (mesi) parti.push(plur(mesi, 'mese', 'mesi'));
  if (giorni && !anni) parti.push(plur(giorni, 'giorno', 'giorni'));
  if (parti.length) return parti.join(' e ');
  const ore = Math.floor(sec / 3600);
  return ore > 0 ? plur(ore, 'ora', 'ore') : 'meno di un\'ora';
}

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
    if (!msg || msg.isSelf) return false;
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
      if (!nomeOk(chi)) { say('📣 Uso: !so <canale>'); return true; }
      const r = await helix.shoutout(ch, chi);
      if (r?.ok) {
        let extra = '';
        try {
          const u = await helix.getUserByLogin(chi);
          if (u?.id) { const info = await helix.getChannelInfo(u.id); if (info?.game_name) extra = ` Stava streammando ${info.game_name}!`; }
        } catch { /* niente: il banner è già partito */ }
        say(`📣 Andate a seguire @${r.target || chi}!${extra} twitch.tv/${chi}`);
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
      if (!uid) { say('🤔 Non trovo questo utente.'); return true; }
      const iso = await helix.getFollowAge(ch, uid);
      say(iso ? `💜 @${nome} segue il canale da ${fmtDurata(iso)}.` : `@${nome} non segue (ancora) il canale.`);
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
