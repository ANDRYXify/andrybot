// Comandi "base" pronti all'uso: quelli che ogni streamer si aspetta già
// funzionanti senza doverli costruire a mano — !so/!shoutout, !followage,
// !uptime. Vivono qui come add-on OPT-OUT (accesi salvo che lo streamer li
// spenga) e NON prevalgono MAI su un comando o un Modulo che lo streamer ha
// creato con lo stesso nome: la SUA versione vince sempre (niente doppioni,
// niente sorprese). Restano deterministici: mai passano dall'IA.
import { streamers, commands, modules as modulesDb } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('comandibase');

const attivo = (channel) => streamers.get(channel)?.settings?.comandiBase?.attivo !== false;

// esiste già un comando semplice o un Modulo dello streamer con questo nome?
// allora NON intercettiamo: la sua versione vince.
function personalizzato(channel, cmd) {
  try {
    if (commands.get(channel, cmd)) return true;
    const mods = modulesDb.list(channel) || [];
    return mods.some((m) => m.attivo && m.trigger?.tipo === 'comando'
      && String(m.trigger.comando || '').toLowerCase().replace(/^!/, '') === cmd);
  } catch { return false; }
}

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
    if (!msg || msg.isSelf || !helix) return false;
    const testo = String(msg.text || '').trim();
    if (!testo.startsWith('!')) return false;
    const ch = msg.channel;
    if (!attivo(ch)) return false;
    const parti = testo.slice(1).split(/\s+/);
    const cmd = (parti.shift() || '').toLowerCase();

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
