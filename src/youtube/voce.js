// LA VOCE DEL BOT SU YOUTUBE.
//
// Come per Kick: il resto del bot chiama `say(canale, testo)` e non sa altro.
// Qui pero' c'e' una cosa in piu' da sapere, ed e' quella che rende YouTube
// diverso: su Twitch la chat e' un posto fisso, su YouTube la chat NASCE E
// MUORE con la diretta. Se non c'e' una diretta in corso non c'e' nessun posto
// dove parlare — e non e' un guasto, e' che non stai trasmettendo.
//
// L'indirizzo della chat di adesso lo sa il motore che la sta leggendo: chiedere
// a lui costa niente, richiederlo a YouTube costerebbe una chiamata per ogni
// riga detta.
import { makeLog } from '../logger.js';
import { scriviChat } from './api.js';

const log = makeLog('youtube');

export function voceYoutube(login, { chatDiAdesso } = {}) {
  return {
    say(_canale, testo) {
      const chatId = typeof chatDiAdesso === 'function' ? chatDiAdesso(login) : '';
      if (!chatId) { log.debug(`@${login}: niente chat YouTube aperta, non dico niente`); return; }
      scriviChat(login, { chatId, testo })
        .then((r) => {
          if (!r.ok) log.error(`@${login}: non riesco a scrivere su YouTube — ${r.errore}`);
        })
        .catch((e) => log.error(`@${login}: invio su YouTube fallito — ${e?.message || e}`));
    },
  };
}
