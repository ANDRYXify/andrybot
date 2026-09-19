// LA CLASSIFICA DEI BIT: e' di Twitch, noi la rispecchiamo.
//
// Stessa regola del treno, e per lo stesso motivo. I cheer ci passano davanti
// uno per uno e sommarli sarebbe stato facile: sarebbe stata una SECONDA
// classifica che con quella di Twitch non torna, e non torna proprio nei casi
// in cui qualcuno se ne accorge — i cheer arrivati mentre il bot era spento,
// quelli anonimi, i mesi che iniziano quando dice Twitch e non quando lo
// diciamo noi. Due numeri diversi per la stessa domanda sono peggio di un
// numero solo che ogni tanto manca.
//
// Quindi si chiede a Twitch (`helix/bits/leaderboard`, scope `bits:read`) e si
// tiene il risultato per qualche minuto. La memoria si BUTTA quando arriva un
// cheer: e' l'unico momento in cui la classifica puo' essere cambiata, quindi
// e' l'unico momento in cui vale la pena richiederla. Cosi' chi scrive «!bit»
// subito dopo aver cheerato si vede gia' dentro.
import { streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('bit');

const TTL_MS = 3 * 60_000;
// Si chiede il massimo che Twitch dia, non i tre del podio: serve a rispondere
// «sei al 12° posto» a chi sul podio non c'e'. E' quella riga che fa cheerare,
// non il podio di qualcun altro.
const QUANTI = 100;
const PODIO = 3;

export const PERIODI = ['day', 'week', 'month', 'year', 'all'];
export const QUANDO = {
  day: 'oggi', week: 'questa settimana', month: 'questo mese',
  year: "quest'anno", all: 'da sempre',
};

const cache = new Map();

// I numeri dei Bit si leggono a colpo d'occhio solo col punto delle migliaia.
export const migliaia = (n) => String(Math.max(0, Math.round(Number(n) || 0)))
  .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// CHI HA CHEERATO, QUANDO NON C'E' UN CHI.
//
// Twitch lascia cheerare in anonimo, e in quel caso non manda nessun nome: i
// campi dell'utente arrivano vuoti. Il rischio non e' restare senza una parola
// da scrivere, e' inventarne una — ripiegare sul nome di chi ha cheerato
// prima, o far passare per un nome una parola tecnica.
//
// Due domande diverse, due risposte diverse, e qui stanno insieme perche' sono
// la stessa regola vista da due lati:
//
//  · «CHI e' stato?» — per una classifica, un record, un premio: se e' anonimo
//    la risposta e' NIENTE, e chi chiama deve reggerlo (salta la riga, non
//    assegna il premio). Un nome finto qui diventa un premio dato a un altro.
//  · «Come lo chiamo?» — per una frase da leggere: la risposta e' una parola
//    onesta, che dice proprio che un nome non c'e'.
//
// Vale per ogni evento che porta `is_anonymous`, non solo per il cheer: anche
// un abbonamento regalato puo' arrivare senza firma.
export const ANONIMO = 'un anonimo';
export const chiHaCheerato = (d) => (d?.is_anonymous ? '' : String(d?.user_name || d?.user_login || '').slice(0, 40));
export const comeSiChiama = (d, ignoto = 'qualcuno') => (d?.is_anonymous ? ANONIMO : (chiHaCheerato(d) || ignoto));

// Butta la memoria di un canale (o di tutti). La chiama chi vede passare un
// cheer, e i collaudi.
export function scorda(channel) {
  if (!channel) { cache.clear(); return; }
  const ch = String(channel).toLowerCase();
  for (const k of [...cache.keys()]) if (k.startsWith(ch + '|')) cache.delete(k);
}

// La classifica, dalla memoria o da Twitch. `null` = NON LO SAPPIAMO (permesso
// mancante, Twitch muto); `[]` = non ha cheerato nessuno. Chi chiama deve
// trattarle diverse: la prima si tace, la seconda e' una risposta.
export async function classifica(helix, channel, { periodo = 'month', ora = Date.now() } = {}) {
  const ch = String(channel || '').toLowerCase();
  if (!ch || !helix?.getClassificaBit) return null;
  const p = PERIODI.includes(periodo) ? periodo : 'month';
  const chiave = ch + '|' + p;
  const avuto = cache.get(chiave);
  if (avuto && ora - avuto.quando < TTL_MS) return avuto.righe;
  const righe = await helix.getClassificaBit(ch, { periodo: p, quanti: QUANTI }).catch(() => null);
  // Un «non lo so» non si mette in memoria: al prossimo giro si riprova. Se lo
  // si salvasse, un permesso appena ridato resterebbe inutile per minuti.
  if (righe) cache.set(chiave, { quando: ora, righe });
  return righe;
}

// La classifica in una riga di chat. `mio` e' il login di chi ha chiesto: se
// c'e' ed e' fuori dal podio, la sua posizione si aggiunge in fondo.
export function inParole(righe, mio, periodo = 'month') {
  const quando = QUANDO[periodo] || QUANDO.month;
  if (!Array.isArray(righe)) return '';
  if (!righe.length) return `\u2728 Bit ${quando}: ancora nessuno. Il primo posto \u00e8 libero.`;
  const podio = righe.slice(0, PODIO)
    .map((r) => `${r.posto}) ${r.nome} ${migliaia(r.bit)}`).join(' \u00b7 ');
  const io = String(mio || '').toLowerCase();
  const mia = io ? righe.find((r) => r.login === io) : null;
  const coda = (mia && mia.posto > PODIO) ? ` Tu sei al ${mia.posto}\u00b0 posto con ${migliaia(mia.bit)}.` : '';
  return `\u2728 Bit ${quando}: ${podio}.${coda}`;
}

// «!bit»: la classifica in chat. Ritorna la riga da dire, oppure '' quando non
// c'e' niente da dire. Anche «non lo sappiamo» e' un niente-da-dire: il pannello
// avverte gia' lo streamer dei permessi che mancano, e scriverlo in chat
// sarebbe raccontare i nostri tubi a chi e' li' per guardare la diretta.
export async function riga(helix, channel, { mio = '', periodo = 'month', ora = Date.now() } = {}) {
  const righe = await classifica(helix, channel, { periodo, ora });
  if (!righe) { log.debug(`#${channel}: classifica Bit non disponibile`); return ''; }
  return inParole(righe, mio, periodo);
}

// ---------------------------------------------------------------- il re dei Bit
//
// IL RICORDO. Il premio periodico, quando pesca dai Bit, incorona chi sta in
// cima: da li' in poi quella persona porta una corona accanto al nome nella
// chat a schermo, e la prima volta che torna a scrivere il bot la saluta.
//
// Un interruttore solo. La corona e il saluto NON hanno un loro «attivo»: sono
// il premio dei Bit visto da fuori. Se lo streamer lo spegne, o lo sposta sulle
// monete, la corona sparisce senza che si debba ricordare di spegnerla altrove
// — e senza lasciare in chat un re che non regna piu'.
//
// Il regno ha una data, e quella data e' il segno del saluto. Non un «si'»:
// chi vince due mesi di fila comincia un regno nuovo, e il bot lo saluta di
// nuovo. Con un «si'» sarebbe stato salutato una volta sola, per sempre.
export const SALUTO_RE = '{user} è il re dei Bit, con {bit} Bit. Bentornato.';

export function re(channel) {
  const s = streamers.get(String(channel || '').toLowerCase())?.settings || {};
  const p = s.premioVip;
  if (!p?.attivo || p.da !== 'bit') return null;
  const r = s.reBit;
  if (!r?.login) return null;
  return {
    login: String(r.login).toLowerCase(),
    nome: String(r.nome || r.login).slice(0, 40),
    bit: Math.max(0, Number(r.bit) || 0),
    da: Number(r.da) || 0,
    salutato: Number(r.salutato) || 0,
  };
}

// La corona vale SOLO su Twitch: il login del re viene dalla classifica di
// Twitch, e su un'altra piattaforma lo stesso nome e' un'altra persona.
export function portaCorona(channel, login, piattaforma = 'twitch') {
  if (piattaforma && piattaforma !== 'twitch') return false;
  const r = re(channel);
  return !!r && !!login && r.login === String(login).toLowerCase();
}

export function salutaIlRe(msg, say) {
  try {
    if (!msg || msg.isSelf || msg.from_bot) return false;
    const ch = String(msg.channel || '').toLowerCase();
    if (!portaCorona(ch, msg.user, msg.piattaforma)) return false;
    if (String(msg.text || '').trim().startsWith('!')) return false;
    const r = re(ch);
    if (!r.da || r.salutato === r.da) return false;
    const s = streamers.get(ch)?.settings || {};
    const modello = typeof s.premioVip?.saluto === 'string' ? s.premioVip.saluto : SALUTO_RE;
    // Il segno si mette comunque: uno streamer che ha svuotato la frase ha
    // detto «non dirlo», non «riprovaci a ogni messaggio».
    streamers.setSettings(ch, { ...s, reBit: { ...s.reBit, salutato: r.da } });
    const frase = modello.trim()
      .split('{user}').join(msg.display || r.nome || msg.user)
      .split('{bit}').join(migliaia(r.bit))
      .trim();
    if (!frase) return false;
    say('👑 ' + frase.slice(0, 300));
    return true;
  } catch (e) { log.debug('salutaIlRe:', e?.message || e); return false; }
}
