// Citazioni (!cita) e shoutout (!so) — due classici del Mod Panel, ora nativi
// in SocialBot. Le citazioni sono numerate in modo stabile (!cita 12 punta
// sempre alla stessa). Lo shoutout invita a seguire un altro canale, con
// l'ultimo gioco che stava streammando.
import { quotes } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('citazioni');

const puoGestire = (msg) => !!(msg.isMod || msg.isBroadcaster);
const fmt = (q) => `“${q.text}” — #${q.n}`;

function aggiungi(msg, testo, say) {
  if (!puoGestire(msg)) { say('Solo mod e streamer possono aggiungere citazioni 🙂'); return true; }
  const t = String(testo || '').trim();
  if (!t) { say('Uso: !cita aggiungi <testo>'); return true; }
  const n = quotes.add(msg.channel, t, msg.user);
  say(`Citazione #${n} salvata! 📝`);
  return true;
}
function rimuovi(msg, n, say) {
  if (!puoGestire(msg)) { say('Solo mod e streamer possono rimuovere citazioni 🙂'); return true; }
  if (!quotes.get(msg.channel, n)) { say(`Non esiste la citazione #${n}.`); return true; }
  quotes.remove(msg.channel, n);
  say(`Citazione #${n} rimossa.`);
  return true;
}

// !cita / !quote [N | aggiungi <testo> | rimuovi N] · alias !addquote/!delquote
export function tryQuoteCommand(msg, say) {
  try {
    // Niente skip su isSelf: lo streamer usa il bot col suo account e deve poter
    // usare le citazioni (i comandi mod-only restano protetti più sotto).
    if (!msg) return false;
    const t = String(msg.text || '').trim();

    let m = /^!(?:addquote|aggiungicita)\s+(.+)$/i.exec(t);
    if (m) return aggiungi(msg, m[1], say);
    m = /^!(?:delquote|rimuovicita)\s+(\d+)/i.exec(t);
    if (m) return rimuovi(msg, parseInt(m[1], 10), say);

    m = /^!(?:cita|quote|citazione)\b\s*(.*)$/i.exec(t);
    if (!m) return false;
    const arg = m[1].trim();

    let s = /^(?:aggiungi|add)\s+(.+)$/i.exec(arg);
    if (s) return aggiungi(msg, s[1], say);
    s = /^(?:rimuovi|del|elimina)\s+(\d+)/i.exec(arg);
    if (s) return rimuovi(msg, parseInt(s[1], 10), say);

    if (/^\d+$/.test(arg)) {
      const q = quotes.get(msg.channel, parseInt(arg, 10));
      say(q ? fmt(q) : `Non ho la citazione #${arg} 🤔`);
      return true;
    }
    const q = quotes.random(msg.channel);
    say(q ? fmt(q) : 'Non c\'è ancora nessuna citazione! Aggiungine una con !cita aggiungi <testo> 📝');
    return true;
  } catch (e) { log.error('tryQuoteCommand:', e?.message || e); return false; }
}
