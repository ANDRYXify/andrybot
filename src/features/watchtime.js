// Ore guardate (watchtime) + fedeltà. Ogni tot minuti, mentre il canale è LIVE,
// crediamo il tempo a chi è in chat (dalla lista "chatters" di Twitch, quindi
// anche ai lurker). I comandi !ore e !classificaore mostrano i totali. È una
// funzione "di base" (sempre attiva salvo che lo streamer la spenga).
//
// NB: il tracker (tick periodico) vive in bot.js, che ha accesso a Helix e alla
// lista dei canali attivi. Qui stanno la formattazione e i comandi in chat.
import { watchtime, streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('watchtime');

// bot/servizi da NON conteggiare nella classifica delle ore.
export const NON_CONTARE = new Set([
  'nightbot', 'streamelements', 'streamlabs', 'moobot', 'wizebot', 'fossabot',
  'sery_bot', 'commanderroot', 'soundalerts', 'pretzelrocks', 'kofistreambot',
  'tangiabot', 'creatisbot', 'lattemotte', 'blerp', 'buttsbot', 'own3d',
]);

const attivo = (channel) => streamers.get(channel)?.settings?.watchtime?.attivo !== false;

// secondi → "3g 4h" · "5h 20m" · "12m"
export function formatta(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const g = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (g) return `${g}g ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

const medaglia = (i) => ['🥇', '🥈', '🥉', '4°', '5°'][i] || `${i + 1}°`;

// Accredita `deltaSec` a tutti i presenti in chat (esclusi i bot noti). Chiamata
// dal tracker in bot.js ogni tot minuti, SOLO quando il canale è live. Ritorna
// quanti utenti sono stati conteggiati.
export function accredita(channel, chatters, deltaSec) {
  if (!attivo(channel)) return 0;
  const utili = (chatters || [])
    .map((u) => String(u || '').toLowerCase())
    .filter((u) => u && !NON_CONTARE.has(u));
  if (utili.length) {
    try { watchtime.addMany(channel, utili, Math.max(0, Math.round(deltaSec) || 0)); }
    catch (e) { log.debug('accredita:', e?.message || e); }
  }
  return utili.length;
}

// Ritorna true se il messaggio era un comando delle ore (gestito).
export function tryComando(msg, say) {
  try {
    if (!msg) return false;
    const testo = String(msg.text || '').trim();
    if (!testo.startsWith('!')) return false;
    const ch = msg.channel;
    const parti = testo.slice(1).split(/\s+/);
    const cmd = (parti.shift() || '').toLowerCase();

    if (['ore', 'tempo', 'watchtime', 'oreguardate'].includes(cmd)) {
      if (!attivo(ch)) return true;
      const chi = (parti[0] || '').replace(/^@/, '').toLowerCase();
      if (chi && /^[a-z0-9_]{2,30}$/.test(chi)) {
        const s = watchtime.get(ch, chi);
        say(s ? `⏱️ @${chi} ha guardato ${formatta(s)} in totale.` : `⏱️ Non ho ancora ore per @${chi}.`);
        return true;
      }
      const s = watchtime.get(ch, msg.user);
      const nome = msg.display || msg.user;
      say(s ? `⏱️ @${nome} hai guardato ${formatta(s)} in totale! 💜` : `⏱️ @${nome} le tue ore partono ora: resta in live! 💜`);
      return true;
    }

    if (['classificaore', 'oretop', 'topore', 'classificatempo'].includes(cmd)) {
      if (!attivo(ch)) return true;
      const top = watchtime.top(ch, 5);
      if (!top.length) { say('⏱️ Ancora nessuna ora registrata: la classifica parte con la prossima live!'); return true; }
      say('⏱️ Più presenti in chat: ' + top.map((r, i) => `${medaglia(i)} ${r.display || r.user} (${formatta(r.seconds)})`).join('  '));
      return true;
    }

    return false;
  } catch (e) { log.debug('tryComando:', e?.message || e); return false; }
}
