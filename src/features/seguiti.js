// CHI TOGLIE E RIMETTE IL FOLLOW NON E' UN FOLLOWER NUOVO.
//
// Twitch manda un follow ogni volta che qualcuno preme «segui», anche se
// l'aveva gia' premuto ieri e l'ha tolto stamattina. Senza memoria, chi toglie e
// rimette il follow a raffica si prendeva ogni volta l'avviso a schermo, il
// grazie in chat, un posto nel conto dei follower nuovi della serata e un passo
// nell'obiettivo: tutte cose dette di una persona che non era nuova.
//
// Il follow e' un fatto fra una persona e un canale, e qui si ricorda. Quando ne
// arriva uno:
//
//   nuovo      mai visto: tutto come sempre
//   ripetuto   visto da meno di RITORNO_GIORNI: nessuno reagisce. Nemmeno lo
//              scudo: una persona sola che ripete non e' una raffica di bot
//   ritorno    visto, ma da piu' tempo: il tipo diventa 'channel.follow.ritorno'
//              e il cervello dice bentornato. Niente avviso, niente conto: non
//              e' un follower nuovo nemmeno lui
//
// Il tipo cambia all'ingresso, prima di chiunque: chi ascolta 'channel.follow'
// (avvisi, moduli, muro, rapporto, statistiche, obiettivi) non vede il ripetuto
// senza doverlo sapere. Una cosa nuova che ascolta i follow domani e' giusta da
// sola.
//
// Twitch non dice quando uno smette di seguire: `ultimo` e' l'ultima volta che
// sappiamo che seguiva. Per non trattare da nuovo chi seguiva gia' prima che il
// registro esistesse, al primo avvio si semina con chi segue adesso.
import { seguiti as store, statoVivo } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('seguiti');

export const RITORNO_GIORNI = 90;
const GIORNO = 24 * 3600 * 1000;
const SEMINA = 'seguiti-semina';
const PAUSA_PAGINE_MS = 1000;

const chiDi = (piattaforma, id) => `${piattaforma}:${String(id || '').toLowerCase()}`;

// Com'e' questo follow, e lo ricorda. Senza chi (un evento senza utente) e'
// nuovo: non c'e' niente da confrontare.
export function classifica(channel, piattaforma, id, ora = Date.now()) {
  if (!id) return 'nuovo';
  const chi = chiDi(piattaforma, id);
  const prima = store.get(channel, chi);
  store.segna(channel, chi, ora);
  if (!prima) return 'nuovo';
  return ora - Number(prima.ultimo) >= RITORNO_GIORNI * GIORNO ? 'ritorno' : 'ripetuto';
}

// La semina: una volta per canale, a pagine lente. Se Twitch non risponde (un
// permesso che manca) non si segna fatta, e si riprova al prossimo avvio.
export async function semina(helix, channel, { ora = Date.now(), pausa = PAUSA_PAGINE_MS } = {}) {
  if (statoVivo.leggi(channel, SEMINA)?.fatta) return { gia: true };
  let dopo = '', quanti = 0;
  for (;;) {
    const pagina = await helix.getRecentFollowers(channel, { first: 100, dopo });
    if (pagina.totale === undefined) { log.debug(`#${channel}: follower non leggibili, riprovo al prossimo avvio`); return { fatta: false, quanti }; }
    store.semina(channel, pagina.map((f) => chiDi('twitch', f.user_id)).filter((x) => x !== 'twitch:'), ora);
    quanti += pagina.length;
    if (!pagina.cursore || !pagina.length) break;
    dopo = pagina.cursore;
    await new Promise((r) => setTimeout(r, pausa));
  }
  statoVivo.scrivi(channel, SEMINA, { fatta: ora, quanti });
  log.info(`#${channel}: ${quanti} follower ricordati`);
  return { fatta: true, quanti };
}
