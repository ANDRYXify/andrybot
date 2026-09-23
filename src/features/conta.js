// CONTA INSIEME.
//
// La chat conta 1, 2, 3... un numero a messaggio. Due regole sole: tocca al
// numero dopo, e la stessa persona non conta due volte di fila. Chi sbaglia fa
// ricominciare tutti da uno. Non si vincono monete: si batte il record del
// canale, che resta anche dopo un riavvio (statoVivo) e si annuncia quando lo
// si supera.
//
// Si apre con !conta e si chiude da solo se per `pausa` secondi nessuno conta.
// Mentre si conta non partono manche, e mentre c'e' una manche non si apre la
// conta: tutte e due leggono i numeri scritti in chat, e un numero non puo'
// essere di due giochi insieme.
//
// Il ragionamento sta in docs/GIOCHI.md.
import { statoVivo, streamers } from '../db.js';
import { valoriDi } from './giochi-conf.js';

const pulito = (s) => String(s || '').replace(/^@/, '').toLowerCase().trim();
const conf = (channel) => valoriDi(streamers.get(channel)?.settings, 'conta');
const CHIAVE = 'conta-record';

const conte = new Map();   // canale → { n, ultimo, record, superato, timer, say }

export const recordConta = (channel) => Number(statoVivo.leggi(channel, CHIAVE)?.n) || 0;
export const contaInCorso = (channel) => {
  const c = conte.get(channel);
  return c ? { n: c.n, ultimo: c.ultimo, record: c.record } : null;
};

function chiudi(channel) {
  const c = conte.get(channel);
  if (!c) return;
  conte.delete(channel);
  clearTimeout(c.timer);
  try { c.say(`🔢 Conta finita: ultimo numero ${c.n}. Record del canale: ${c.record}.`); } catch { /* niente */ }
}

function arma(channel, c) {
  clearTimeout(c.timer);
  c.timer = setTimeout(() => chiudi(channel), conf(channel).pausa * 1000);
  c.timer.unref?.();
}

export function apri(channel, say) {
  if (conte.has(channel)) return false;
  const c = { n: 0, ultimo: '', record: recordConta(channel), superato: false, say, timer: null };
  conte.set(channel, c);
  arma(channel, c);
  say(`🔢 Contiamo insieme! Scrivete 1, poi 2, poi 3: un numero a messaggio, mai due di fila la stessa persona. Chi sbaglia fa ricominciare. Record del canale: ${c.record}.`);
  return true;
}

// Un messaggio di chat mentre si conta. Torna true se era un numero, cioe' se
// apparteneva alla conta (giusto o sbagliato).
export function suMessaggio(channel, msg) {
  const c = conte.get(channel);
  if (!c) return false;
  const t = String(msg.text || '').trim();
  if (!/^\d{1,7}$/.test(t)) return false;
  const numero = Number(t);
  const io = pulito(msg.user);
  const nome = msg.display || msg.user;
  arma(channel, c);
  if (numero !== c.n + 1 || io === c.ultimo) {
    const perche = numero === c.n + 1 ? `${nome} ha contato due volte di fila` : `${nome} ha scritto ${numero}, ma toccava ${c.n + 1}`;
    const arrivati = c.n;
    c.n = 0;
    c.ultimo = '';
    c.superato = false;
    c.say(`💥 ${perche}. Si ricomincia da 1: eravate arrivati a ${arrivati}. Record del canale: ${c.record}.`);
    return true;
  }
  c.n = numero;
  c.ultimo = io;
  if (c.n > c.record) {
    if (!c.superato && c.record > 0) c.say(`🏆 Nuovo record del canale: ${c.n}! Avanti!`);
    c.superato = true;
    c.record = c.n;
    statoVivo.scrivi(channel, CHIAVE, { n: c.n });
  }
  const traguardo = conf(channel).traguardo;
  if (traguardo > 0 && c.n % traguardo === 0) c.say(`🔢 ${c.n}! Avanti così.`);
  return true;
}
