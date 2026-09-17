// LE STATISTICHE DEL CANALE, IN UN POSTO SOLO.
//
// Prima erano sparse in tre schede con tre stili: i numeri dei sette giorni in
// cima a Memoria, la classifica delle monete dentro la carta del premio VIP in
// Giochi, le serie di presenze ancora in Memoria, i rapporti in Dirette. Tre
// posti, nessun periodo scegliibile, nessun confronto possibile.
//
// Qui si decide cos'e' un periodo e da dove viene ogni numero, e ogni numero ha
// UNA fonte sola. La chat e il bot dai messaggi; le dirette, le ore in onda, il
// picco, i follower e i sub dai RAPPORTI gia' salvati a fine diretta — cioe'
// esattamente quello che lo streamer legge nella scheda Dirette, non un secondo
// conto che col tempo diverge; le presenze e le ore guardate dai loro registri.
// Il periodo taglia tutto allo stesso modo, e «da sempre» non taglia niente.
import { db, rapporti, watchtime, padroneDi } from '../db.js';
import * as presenze from './presenze.js';

const GIORNO_MS = 24 * 3600_000;
// Le finestre sono tre e si chiamano come si dicono. Zero vuol dire «da
// sempre»: non e' un caso particolare, e' l'inizio del tempo.
export const PERIODI = { 7: 7 * GIORNO_MS, 30: 30 * GIORNO_MS, tutto: 0 };

export function periodoValido(p) {
  const s = String(p ?? '7');
  return Object.prototype.hasOwnProperty.call(PERIODI, s) ? s : '7';
}

const intero = (v) => Math.trunc(Number(v)) || 0;
const norm = (s) => String(s || '').toLowerCase();

export function riassunto(channel, { periodo = '7', ora = Date.now(), n = 10 } = {}) {
  const ch = norm(channel);
  const p = periodoValido(periodo);
  const da = PERIODI[p] ? ora - PERIODI[p] : 0;

  const chat = db.prepare(`SELECT COUNT(*) n, COUNT(DISTINCT user) p FROM messages
    WHERE channel=? AND ts>=? AND from_bot=0 AND user NOT LIKE '[%'`).get(ch, da);
  const bot = db.prepare('SELECT COUNT(*) c FROM messages WHERE channel=? AND ts>=? AND from_bot=1').get(ch, da).c;
  // il padrone non corre nella sua gara: i messaggi del canale li conta tutti
  // (sopra), ma in classifica ci va chi guarda
  const topChatters = db.prepare(`SELECT user, COUNT(*) c FROM messages
    WHERE channel=? AND ts>=? AND from_bot=0 AND user<>? AND user NOT LIKE '[%'
    GROUP BY user ORDER BY c DESC, user LIMIT ?`).all(ch, da, padroneDi(ch), n).map((r) => ({ user: r.user, n: intero(r.c) }));
  const clip = db.prepare('SELECT COUNT(*) c FROM clips WHERE channel=? AND ts>=?').get(ch, da).c;

  // I rapporti si sommano nel database, non in JavaScript: leggerli tutti per
  // sommarli qui vorrebbe dire aprire un JSON per ogni diretta mai fatta.
  const r = db.prepare(`SELECT COUNT(*) n,
      COALESCE(SUM(json_extract(dati,'$.durataMs')), 0) oreMs,
      COALESCE(MAX(json_extract(dati,'$.picco')), 0) picco,
      COALESCE(SUM(json_extract(dati,'$.follow')), 0) follow,
      COALESCE(SUM(json_extract(dati,'$.sub')), 0) sub,
      COALESCE(SUM(json_extract(dati,'$.raid')), 0) raid,
      COALESCE(SUM(json_extract(dati,'$.donazioni')), 0) donazioni,
      COALESCE(SUM(json_extract(dati,'$.donazioniCent')), 0) donazioniCent
    FROM rapporti WHERE channel=? AND fine>=?`).get(ch, da);
  const dirette = {
    n: intero(r.n), oreMs: intero(r.oreMs), picco: intero(r.picco), follow: intero(r.follow),
    sub: intero(r.sub), raid: intero(r.raid), donazioni: intero(r.donazioni), donazioniCent: intero(r.donazioniCent),
  };

  // Le ultime dirette NON dipendono dal periodo: sono l'elenco di com'e' andata
  // le ultime volte, e se uno guarda «sette giorni» dopo una pausa di un mese
  // una tabella vuota non gli direbbe niente.
  const ultime = rapporti.elenco(ch, n).map((x) => ({
    id: x.id, inizio: intero(x.inizio), fine: intero(x.fine),
    durataMs: intero(x.dati?.durataMs), picco: intero(x.dati?.picco), media: intero(x.dati?.media),
    messaggi: intero(x.dati?.messaggi), persone: intero(x.dati?.persone),
    follow: intero(x.dati?.follow), clip: intero(x.dati?.clip),
  }));

  return {
    periodo: p, da,
    messaggi: intero(chat.n), persone: intero(chat.p), messaggiBot: intero(bot), clip: intero(clip),
    dirette,
    topChatters,
    presenze: presenze.classifica(ch, n),
    ore: watchtime.top(ch, n).map((x) => ({ user: x.display || x.user, secondi: intero(x.seconds) })),
    ultime,
  };
}
