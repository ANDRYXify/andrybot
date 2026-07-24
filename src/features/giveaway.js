// Giveaway / sorteggi in chat. Uno per canale alla volta, tenuto IN MEMORIA:
// è legato alla diretta e non ha senso farlo sopravvivere ai riavvii. Solo
// mod/streamer aprono, estraggono o annullano; gli spettatori entrano con !join.
//
// Comandi:
//   !giveaway <premio>        apre un giveaway aperto a tutti (mod)
//   !giveaway sub <premio>    apre un giveaway riservato ai sub (mod)
//   !join / !partecipa        entra nel giveaway in corso (spettatori)
//   !estrai                   estrae un vincitore (mod); si può ripetere
//   !giveaway annulla         chiude il giveaway senza estrarre (mod)
//   !giveaway                 mostra lo stato (chiunque)
//
// Gating: segue l'add-on "Giochi" (settings.giochi), come i minigiochi: se il
// piano non lo include, il server spegne settings.giochi e qui non si apre nulla.
import { streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('giveaway');

const attivi = new Map();   // channel → { premio, soloSub, partecipanti:Map(user→display), apertoDa }
const scegli = (a) => a[Math.floor(Math.random() * a.length)];
const puoGestire = (msg) => !!(msg.isMod || msg.isBroadcaster);
const abilitato = (channel) => streamers.get(channel)?.settings?.giochi !== false;

function estrai(channel, msg, say) {
  if (!puoGestire(msg)) return true;
  const g = attivi.get(channel);
  if (!g) { say('🎁 Non c\'è nessun giveaway aperto. Aprine uno con !giveaway <premio>.'); return true; }
  if (g.partecipanti.size === 0) { say('🎁 Nessun partecipante ancora: scrivete !join per entrare!'); return true; }
  const [uWin, dWin] = scegli([...g.partecipanti.entries()]);
  g.partecipanti.delete(uWin);   // tolto dal pool: un'eventuale ri-estrazione pesca un altro
  const rimasti = g.partecipanti.size;
  say(`🎉🎉 Il vincitore di "${g.premio}" è… ${dWin}! Congratulazioni! 🏆${rimasti ? ` (${rimasti} ancora in gara — !estrai per un altro)` : ''}`);
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
        const u = String(msg.user || '').toLowerCase();
        if (u) g.partecipanti.set(u, nome);                    // niente conferma singola: non floodiamo la chat
        return true;
      }

      case 'estrai':
      case 'draw':
      case 'vincitore':
        return estrai(channel, msg, say);

      case 'giveaway':
      case 'sorteggio':
      case 'gw': {
        const sub0 = (parti[0] || '').toLowerCase();
        if (['annulla', 'stop', 'cancella', 'chiudi'].includes(sub0)) {
          if (!puoGestire(msg)) return true;
          if (!g) { say('🎁 Non c\'è nessun giveaway aperto.'); return true; }
          attivi.delete(channel); say('🎁 Giveaway annullato.'); return true;
        }
        if (['estrai', 'draw', 'vincitore'].includes(sub0)) return estrai(channel, msg, say);
        // stato (chiunque, se c'è un giveaway o si chiede esplicitamente)
        if (!puoGestire(msg) || ['stato', 'info'].includes(sub0)) {
          if (!g) { say('🎁 Nessun giveaway al momento.'); return true; }
          say(`🎁 Giveaway "${g.premio}" in corso — ${g.partecipanti.size} partecipanti. Scrivi !join per entrare${g.soloSub ? ' (solo sub)' : ''}!`);
          return true;
        }
        // aprire: solo mod/streamer, e solo se l'add-on Giochi è attivo
        if (!abilitato(channel)) return true;
        // blocca solo se c'è un giveaway con iscritti (uno vuoto/esaurito si può rimpiazzare)
        if (g && g.partecipanti.size > 0) { say('🎁 C\'è già un giveaway aperto: !estrai per il vincitore o !giveaway annulla.'); return true; }
        const rest = [...parti];
        let soloSub = false;
        if ((rest[0] || '').toLowerCase() === 'sub') { soloSub = true; rest.shift(); }
        const premio = rest.join(' ').trim().slice(0, 120) || 'un premio a sorpresa';
        attivi.set(channel, { premio, soloSub, partecipanti: new Map(), apertoDa: Date.now() });
        say(`🎁 GIVEAWAY APERTO: ${premio}! Scrivete !join per partecipare${soloSub ? ' (riservato ai sub)' : ''}. In bocca al lupo! 🍀`);
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
