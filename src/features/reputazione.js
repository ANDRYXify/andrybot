// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LA FIDUCIA GUADAGNATA: chi è di casa non si giudica con un'euristica.
//
// Tutto lo scudo, finora, guarda solo indizi CONTRO: il nome, l'età
// dell'account, la cadenza, la presenza in molti canali. Sono tutti segnali che
// sommano, e nessuno che sottragga. Basta un'euristica infelice — un nome che
// somiglia a una fabbrica, un profilo spoglio — e chi scrive nel tuo canale da
// otto mesi finisce nel mucchio.
//
// Qui c'è la parte che manca. Non un altro archivio: quello che serve è già
// scritto — i messaggi in chat, le monete, i badge, gli incidenti, il registro
// degli interventi. Si legge e si mette insieme, e nessun dato nuovo su
// nessuno viene conservato.
//
// IL DECADIMENTO, ed è la ragione per cui questo modulo esiste come cosa a sé.
// Un account segnalato per errore due anni fa non deve pesare come uno
// segnalato ieri: la memoria di un torto svanisce, sennò non è memoria, è una
// condanna. Quindi i fatti NEGATIVI perdono forza col tempo, e quelli
// POSITIVI — essere qui, aver parlato — no: la presenza non scade, si accumula.
//
// Il modello per esteso: docs/REPUTAZIONE.md.
import { memory } from '../db.js';
import * as inc from './incidenti.js';

const norm = (s) => String(s || '').toLowerCase().trim();
const GIORNO = 86400000;

// Quanto ci mette un fatto negativo a valere la metà. Novanta giorni: abbastanza
// perché un errore recente conti, abbastanza poco perché uno vecchio non
// perseguiti nessuno.
export const DIMEZZA_GIORNI = 90;
export const decadimento = (quandoMs, ora = Date.now()) => {
  if (!quandoMs) return 0;
  const giorni = Math.max(0, (ora - quandoMs) / GIORNO);
  return Math.pow(0.5, giorni / DIMEZZA_GIORNI);
};

// I pesi della fiducia. Positivi e negativi non sono simmetrici, ed è voluto:
// perdere la fiducia dev'essere possibile, ma un solo sospetto non deve
// cancellare mesi di presenza.
export const PESI = {
  parlato: 30,        // quanto ha scritto qui
  presenza: 20,       // da quanto tempo è qui
  colpito: 35,        // lo scudo l'ha già preso una volta (e decade)
  sospettato: 15,     // è comparso in un incidente senza essere condannato (decade)
};

// QUI MANCA IL BADGE, e la mancanza è voluta finché non ha una fonte.
// «Abbonato, VIP, moderatore» sarebbe il segnale di fiducia più forte che esista
// — lo dà lo streamer in persona — ma vive sui BADGE DI UN MESSAGGIO, e questo
// modulo viene interrogato su gente che un messaggio non l'ha ancora scritto:
// chi segue, e chi guarda e sta zitto.
//
// Tenerlo qui lo stesso vorrebbe dire un peso che nessuno può alimentare, e un
// tetto di fiducia che nessun account reale può toccare: il numero descriverebbe
// una cosa che non succede mai. Torna il giorno che qualcuno lo sa dire davvero.

// I due estremi NON si scelgono: sono la somma di quello che si può guadagnare
// e di quello che si può perdere. Scritti a mano sarebbero un secondo posto in
// cui vive lo stesso fatto, e il giorno che qualcuno cambia un peso uno dei due
// comincerebbe a mentire — con un tetto scritto 75 e dei pesi che ne fanno 90,
// il clamp taglierebbe in silenzio.
export const FIDUCIA_MAX = PESI.parlato + PESI.presenza;
export const FIDUCIA_MIN = -(PESI.colpito + PESI.sospettato);
export const PER_PUNTO = 12;                      // quanta fiducia vale un punto
// Quanto la fiducia può togliere al rischio, e quanto può aggiungerci. Sono la
// stessa divisione applicata ai due estremi: un solo numero, due segni. Scritti
// come due regole diverse comincerebbero a raccontare due storie diverse.
export const SCONTO_MAX = Math.trunc(FIDUCIA_MAX / PER_PUNTO);
export const AGGRAVIO_MAX = Math.trunc(FIDUCIA_MIN / PER_PUNTO);

// La fiducia. Non è un punteggio di bontà: è quanto sappiamo di questa persona,
// e quanto quello che sappiamo depone a suo favore.
export function fiducia(dati = {}, ora = Date.now()) {
  const perche = [];
  let p = 0;

  const quanti = Math.max(0, Number(dati.messaggi) || 0);
  if (quanti > 0) {
    const q = Math.min(PESI.parlato, Math.round(Math.log2(quanti + 1) * 6));
    p += q; perche.push(`${quanti} messaggi scritti qui`);
  }
  if (dati.primo) {
    const giorni = Math.max(0, (ora - dati.primo) / GIORNO);
    const q = Math.min(PESI.presenza, Math.round(giorni / 3));
    if (q > 0) { p += q; perche.push(`qui da ${Math.round(giorni)} giorni`); }
  }

  // I negativi decadono. Un torto di due anni fa non è un torto di ieri.
  if (dati.colpito) {
    const q = Math.round(PESI.colpito * decadimento(dati.colpito, ora));
    if (q > 0) { p -= q; perche.push(`già fermato dallo scudo (-${q})`); }
  }
  if (dati.sospettato) {
    const q = Math.round(PESI.sospettato * decadimento(dati.sospettato, ora));
    if (q > 0) { p -= q; perche.push(`comparso in un incidente (-${q})`); }
  }

  return { punti: p, perche };
}

// Quanto la fiducia sposta il rischio. È un numero CON IL SEGNO, e il segno è
// il punto: chi è di casa toglie, chi ha un precedente recente aggiunge. Con
// due funzioni separate, una per il credito e una per il debito, il giorno che
// una delle due cambia l'altra resta indietro.
//
// La fiducia non azzera mai un fatto forte — chi è nella fabbrica resta nella
// fabbrica anche se scrive da un anno — e in nessun caso può far AGIRE da sola:
// non è una famiglia forte in punteggio.js, quindi al massimo fa guardare. È la
// garanzia che un errore di ieri non si trasformi in una condanna di domani.
export const sconto = (f) => Math.trunc((Number(f?.punti) || 0) / PER_PUNTO);

// La fiducia di TANTE persone insieme, con una lettura sola del database.
// Serve durante un'ondata, dove i nomi da guardare sono centinaia e una query
// per ciascuno rallenterebbe la difesa proprio mentre serve.
export function diMolti(canale, logins = [], ora = Date.now()) {
  const ch = norm(canale);
  const fuori = new Map();
  if (!ch || !logins.length) return fuori;
  let storie = new Map();
  try { storie = memory.storiaDiMolti?.(ch, logins) || storie; } catch (e) {  }
  let prec = new Map();
  try { prec = inc.precedenti?.(ch, logins) || prec; } catch (e) {  }
  for (const l0 of logins) {
    const l = norm(l0);
    const st = storie.get(l) || { quanti: 0, primo: 0 };
    const pr = prec.get(l) || { colpito: 0, sospettato: 0 };
    const f = fiducia({ messaggi: st.quanti, primo: st.primo, colpito: pr.colpito, sospettato: pr.sospettato }, ora);
    fuori.set(l, { ...f, sconto: sconto(f) });
  }
  return fuori;
}

// Quanta fiducia serve per essere lasciati stare anche dentro un'ondata. È il
// massimo che un canale possa dare, ed è voluto: sotto attacco non si può essere
// teneri. In numeri sono una trentina di messaggi e un paio di mesi.
export const DI_CASA = 4;

// Mette insieme quello che è già scritto. `extra` serve solo a chi ha in mano un
// fatto più fresco di quello sul disco; senza, si legge tutto da qui.
export function di(canale, login, extra = {}) {
  const ch = norm(canale);
  const l = norm(login);
  if (!ch || !l) return { punti: 0, perche: [], sconto: 0 };
  let storia = { quanti: 0, primo: 0 };
  try { storia = memory.storiaDi?.(ch, l) || storia; } catch (e) {  }
  // I precedenti non li porta chi chiama: sono già scritti negli incidenti, e
  // farseli passare da fuori vorrebbe dire che ogni chiamante deve ricordarsi
  // di andarli a prendere. Chi dimentica ottiene una reputazione che non può
  // peggiorare mai, e non se ne accorge nessuno.
  let pr = { colpito: 0, sospettato: 0 };
  try { pr = inc.precedenti?.(ch, [l])?.get(l) || pr; } catch (e) {  }
  const f = fiducia({
    messaggi: storia.quanti,
    primo: storia.primo,
    colpito: extra.colpito || pr.colpito,
    sospettato: extra.sospettato || pr.sospettato,
  });
  return { ...f, sconto: sconto(f) };
}
