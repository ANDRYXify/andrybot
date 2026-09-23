// LA CATENA DI PAROLE.
//
// Il bot dice una parola, e la chat continua: ogni parola comincia con le
// ultime due lettere della precedente (casa → sasso → sole → leone). Tre
// regole, come in conta insieme.
//
//  · CONTA SOLO LA MOSSA. Un messaggio e' una mossa se e' una parola sola che
//    comincia con le due lettere giuste; tutto il resto e' chiacchiera e non
//    tocca la catena. Cosi' chi saluta non rompe niente.
//  · SI ROMPE CON UNA PAROLA GIA' DETTA, O CON DUE DI FILA DELLA STESSA
//    PERSONA. Allora il bot dice perche' e riparte da una parola nuova.
//  · IL RECORD RESTA. La catena piu' lunga del canale sta nel database
//    (statoVivo) e si annuncia una volta, al primo passo oltre.
//
// Si chiude da sola se per `pausa` secondi nessuno trova la parola. Mentre c'e'
// la catena non partono manche ne' conte: un gioco che legge la chat alla
// volta (games.js, chiLeggeLaChat).
//
// Il ragionamento sta in docs/GIOCHI.md.
import { statoVivo, streamers } from '../db.js';
import { valoriDi } from './giochi-conf.js';

const pulito = (s) => String(s || '').replace(/^@/, '').toLowerCase().trim();
const conf = (channel) => valoriDi(streamers.get(channel)?.settings, 'catena');
const CHIAVE = 'catena-record';
const PAROLA = /^[a-z]{3,24}$/;

// La parola come la confronta il gioco: minuscola, senza accenti, senza il
// punto o l'esclamativo in fondo. «Città!» e «citta» sono la stessa parola.
export function parolaDi(testo) {
  const p = String(testo || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.!?,;:]+$/, '');
  return PAROLA.test(p) ? p : '';
}

let caso = Math.random;
export function impostaCaso(f) { caso = typeof f === 'function' ? f : Math.random; }

const catene = new Map();   // canale → { parola, usate: Set, n, ultimo, record, superato, timer, say }

export const recordCatena = (channel) => Number(statoVivo.leggi(channel, CHIAVE)?.n) || 0;
export const catenaInCorso = (channel) => {
  const c = catene.get(channel);
  return c ? { parola: c.parola, n: c.n, ultimo: c.ultimo, record: c.record } : null;
};

function prima(channel) {
  const buone = conf(channel).inizio.map(parolaDi).filter(Boolean);
  const scelta = buone.length ? buone : valoriDi({}, 'catena').inizio.map(parolaDi);
  return scelta[Math.floor(caso() * scelta.length)];
}

function riparti(c, parola) {
  c.parola = parola;
  c.usate = new Set([parola]);
  c.n = 0;
  c.ultimo = '';
  c.superato = false;
}

const coda = (p) => p.slice(-2).toUpperCase();

function chiudi(channel) {
  const c = catene.get(channel);
  if (!c) return;
  catene.delete(channel);
  try { c.say(`🔗 Catena finita: ${c.n === 1 ? 'una parola' : `${c.n} parole`}, l'ultima ${c.parola.toUpperCase()}. Record del canale: ${c.record}.`); } catch { /* niente */ }
}

function arma(channel, c) {
  clearTimeout(c.timer);
  c.timer = setTimeout(() => chiudi(channel), conf(channel).pausa * 1000);
  c.timer.unref?.();
}

// Chi chiama controlla prima che la chat sia libera (games.js, chiLeggeLaChat).
export function apri(channel, say) {
  const c = { record: recordCatena(channel), say, timer: null };
  riparti(c, prima(channel));
  catene.set(channel, c);
  arma(channel, c);
  say(`🔗 Catena di parole! Si parte da ${c.parola.toUpperCase()}: la prossima comincia con ${coda(c.parola)}. Una parola a messaggio, mai due di fila la stessa persona, mai una già detta. Record del canale: ${c.record}.`);
}

// Un messaggio di chat mentre c'e' la catena. Torna true se era una mossa.
export function suMessaggio(channel, msg) {
  const c = catene.get(channel);
  if (!c) return false;
  const p = parolaDi(msg.text);
  if (!p || !p.startsWith(c.parola.slice(-2))) return false;
  const io = pulito(msg.user);
  const nome = msg.display || msg.user;
  arma(channel, c);
  if (io === c.ultimo || c.usate.has(p)) {
    const perche = io === c.ultimo ? `${nome} ha scritto due parole di fila` : `${p.toUpperCase()} era già stata detta`;
    const arrivati = c.n;
    riparti(c, prima(channel));
    c.say(`💥 ${perche}. La catena era a ${arrivati}: si riparte da ${c.parola.toUpperCase()}, la prossima comincia con ${coda(c.parola)}. Record del canale: ${c.record}.`);
    return true;
  }
  c.usate.add(p);
  c.parola = p;
  c.n++;
  c.ultimo = io;
  if (c.n > c.record) {
    if (!c.superato && c.record > 0) c.say(`🏆 Nuovo record del canale: ${c.n} parole! Avanti con ${coda(p)}!`);
    c.superato = true;
    c.record = c.n;
    statoVivo.scrivi(channel, CHIAVE, { n: c.n });
  }
  const traguardo = conf(channel).traguardo;
  if (traguardo > 0 && c.n % traguardo === 0) c.say(`🔗 ${c.n} parole! Adesso tocca a ${coda(p)}.`);
  return true;
}
