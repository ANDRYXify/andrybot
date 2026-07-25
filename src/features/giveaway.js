// Giveaway / sorteggi. Uno per canale alla volta, tenuto IN MEMORIA: è legato
// alla diretta e non ha senso farlo sopravvivere ai riavvii. Si comanda sia dalla
// CHAT (mod/streamer: !giveaway/!estrai; spettatori: !join) sia dalla DASHBOARD
// (le funzioni apri/stato/estraiUno/annulla, usate dagli endpoint del server, che
// gira nello stesso processo → stessa mappa in memoria).
//
// Gating: segue l'add-on "Giochi" (settings.giochi), come i minigiochi.
import { streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('giveaway');

const attivi = new Map();   // channel → { premio, soloSub, partecipanti:Map(user→display), apertoDa }
const scegli = (a) => a[Math.floor(Math.random() * a.length)];
const puoGestire = (msg) => !!(msg.isMod || msg.isBroadcaster);
const abilitato = (channel) => streamers.get(channel)?.settings?.giochi !== false;

// ── API condivisa (chat + dashboard) ────────────────────────────────────────
export function stato(channel) {
  const g = attivi.get(channel);
  return g ? { aperto: true, premio: g.premio, soloSub: g.soloSub, partecipanti: g.partecipanti.size } : { aperto: false };
}

// Apre un giveaway. { ok, premio, soloSub } oppure { ok:false, errore }.
export function apri(channel, { premio, soloSub } = {}) {
  if (!abilitato(channel)) return { ok: false, errore: 'add-on' };
  const g = attivi.get(channel);
  if (g && g.partecipanti.size > 0) return { ok: false, errore: 'gia-aperto' };   // uno vuoto si può rimpiazzare
  const p = String(premio || '').trim().slice(0, 120) || 'un premio a sorpresa';
  attivi.set(channel, { premio: p, soloSub: !!soloSub, partecipanti: new Map(), apertoDa: Date.now() });
  return { ok: true, premio: p, soloSub: !!soloSub };
}

export function partecipa(channel, user, display) {
  const g = attivi.get(channel);
  if (!g) return false;
  const u = String(user || '').toLowerCase();
  if (u) g.partecipanti.set(u, display || u);
  return true;
}

// Estrae un vincitore (togliendolo dal pool, così si può ri-estrarre). null se vuoto.
export function estraiUno(channel) {
  const g = attivi.get(channel);
  if (!g || g.partecipanti.size === 0) return null;
  const [uWin, dWin] = scegli([...g.partecipanti.entries()]);
  g.partecipanti.delete(uWin);
  return { vincitore: dWin, rimasti: g.partecipanti.size };
}

export function annulla(channel) { return attivi.delete(channel); }

// ── Ingresso CHAT ────────────────────────────────────────────────────────────
function estraiChat(channel, msg, say) {
  if (!puoGestire(msg)) return true;
  const s = stato(channel);
  if (!s.aperto) { say('🎁 Non c\'è nessun giveaway aperto. Aprine uno con !giveaway <premio>.'); return true; }
  const r = estraiUno(channel);
  if (!r) { say('🎁 Nessun partecipante ancora: scrivete !join per entrare!'); return true; }
  const conPremio = s.premio && s.premio !== 'un premio a sorpresa' ? ` di "${s.premio}"` : '';
  say(`🎉🎉 Il vincitore${conPremio} è… ${r.vincitore}! Congratulazioni! 🏆${r.rimasti ? ` (${r.rimasti} ancora in gara — !estrai per un altro)` : ''}`);
  return true;
}

// Ritorna true se il messaggio era un comando/azione del giveaway (gestito).
export function tryGiveaway(msg, say) {
  try {
    if (!msg) return false;
    const channel = msg.channel;
    const testo = String(msg.text || '').trim();
    if (!testo.startsWith('!')) return false;
    const parti = testo.slice(1).split(/\s+/);
    const cmd = (parti.shift() || '').toLowerCase();
    const nome = msg.display || msg.user;
    const g = attivi.get(channel);

    switch (cmd) {
      case 'join':
      case 'partecipa':
      case 'entra': {
        if (!g) return false;                                  // nessun giveaway: non è roba nostra
        if (g.soloSub && !(msg.isSub || msg.isMod || msg.isBroadcaster)) return true;   // riservato ai sub
        partecipa(channel, msg.user, nome);                    // niente conferma singola: non floodiamo
        return true;
      }

      case 'estrai':
      case 'draw':
      case 'vincitore':
        return estraiChat(channel, msg, say);

      case 'giveaway':
      case 'sorteggio':
      case 'gw': {
        const sub0 = (parti[0] || '').toLowerCase();
        if (['annulla', 'stop', 'cancella', 'chiudi'].includes(sub0)) {
          if (!puoGestire(msg)) return true;
          if (!annulla(channel)) { say('🎁 Non c\'è nessun giveaway aperto.'); return true; }
          say('🎁 Giveaway annullato.'); return true;
        }
        if (['estrai', 'draw', 'vincitore'].includes(sub0)) return estraiChat(channel, msg, say);
        if (!puoGestire(msg) || ['stato', 'info'].includes(sub0)) {
          const s = stato(channel);
          say(s.aperto
            ? `🎁 Giveaway "${s.premio}" in corso — ${s.partecipanti} partecipanti. Scrivi !join per entrare${s.soloSub ? ' (solo sub)' : ''}!`
            : '🎁 Nessun giveaway al momento.');
          return true;
        }
        // aprire: solo mod/streamer (apri() controlla l'add-on e il "già aperto")
        const rest = [...parti];
        let soloSub = false;
        if ((rest[0] || '').toLowerCase() === 'sub') { soloSub = true; rest.shift(); }
        const r = apri(channel, { premio: rest.join(' '), soloSub });
        if (!r.ok) {
          if (r.errore === 'gia-aperto') say('🎁 C\'è già un giveaway aperto: !estrai per il vincitore o !giveaway annulla.');
          return true;   // add-on assente → silenzio
        }
        say(`🎁 GIVEAWAY APERTO: ${r.premio}! Scrivete !join per partecipare${r.soloSub ? ' (riservato ai sub)' : ''}. In bocca al lupo! 🍀`);
        return true;
      }

      default:
        return false;
    }
  } catch (e) {
    log.error('tryGiveaway:', e?.message || e);
    return false;
  }
}
