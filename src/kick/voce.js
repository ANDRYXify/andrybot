// LA VOCE DEL BOT SU KICK.
//
// Il pezzo che fa funzionare tutto il resto senza toccarlo: la chat di Twitch
// espone `say(canale, testo)`, e il gestore dei messaggi, l'antispam e i giochi
// chiamano soltanto quello. Se anche Kick espone `say(canale, testo)`, allora
// comandi, moduli, memoria e minigiochi parlano su Kick il primo giorno, senza
// che nessuno di loro sappia che Kick esiste.
//
// Una sola interfaccia, due piattaforme che la rispettano: e la risposta torna
// SEMPRE da dove è arrivata la domanda, che è l'unica cosa che conta per chi
// scrive in chat.
import { makeLog } from '../logger.js';
import { scrivi } from './api.js';
import { segnaInvio } from './diario.js';

const log = makeLog('kick');

export function voceKick(login) {
  return {
    say(_canale, testo) {
      scrivi(login, testo)
        .then((r) => {
          segnaInvio({ canale: login, ok: r.ok, motivo: r.ok ? '' : r.errore, come: r.come, prossima: r.prossima });
          if (!r.ok) log.error(`@${login}: non riesco a scrivere su Kick come "${r.come}" — ${r.errore}`);
        })
        .catch((e) => {
          segnaInvio({ canale: login, ok: false, motivo: e?.message || String(e) });
          log.error(`@${login}: invio su Kick fallito — ${e?.message || e}`);
        });
    },
  };
}
