// SE E COSA DIRE: la decisione e' una funzione senza dadi dentro, e qui si prova
// con il caso in mano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scegliMomento, intervalloDose, registra, elenco, FLOOR_MS, FLOOR_DOMANDA_MS, PROMO_MIN_MS, DOSE_MAX, REGISTRO_MAX, INTERVALLO_MAX_MS } from '../../src/features/spontanea.js';

const ORA = 1_760_000_000_000;
const M = 60_000;
const flusso = { tipo: 'flusso', dati: {}, spunto: '' };
const domanda = { tipo: 'domanda', dati: { user: 'bruno', testo: 'che pc?' }, spunto: 'x' };
const base = { ora: ORA, dose: 0.5, live: true, soloLive: false, momenti: [flusso], ultimaSpontanea: 0, ultimaPromo: 0, ultimoTipo: '', promoAccesa: true, battutaPronta: false, caso: { jitter: 0.5, scelta: 0 } };

test('l\'intervallo dalla dose e\' il ritmo medio della vecchia moneta, dichiarato', () => {
  assert.equal(intervalloDose(0.5), 15 * M, 'a 50%: una probabilita\' di 0,2 ogni tre minuti fa una riga ogni quindici');
  assert.equal(intervalloDose(0.25), 30 * M);
  assert.equal(intervalloDose(0.1), 75 * M);
  assert.equal(intervalloDose(0.05), 150 * M);
  assert.equal(intervalloDose(0.01), INTERVALLO_MAX_MS, 'con un tetto a tre ore');
  assert.equal(intervalloDose(0), Infinity);
  assert.equal(intervalloDose(undefined), Infinity, '«non impostata» vale zero, come dice il cursore');
  assert.equal(intervalloDose(5), intervalloDose(DOSE_MAX), 'oltre il massimo del cursore non si va');
});

test('a dose zero tace, anche con un momento buono', () => {
  assert.equal(scegliMomento({ ...base, dose: 0, momenti: [domanda] }).tipo, null);
});

test('«solo mentre sono in diretta» vale solo con la spunta', () => {
  assert.equal(scegliMomento({ ...base, live: false, soloLive: true, momenti: [domanda] }).tipo, null);
  assert.equal(scegliMomento({ ...base, live: false, soloLive: false, momenti: [domanda] }).tipo, 'domanda');
});

test('senza momenti non parla: il tempo passato da solo non e\' un motivo', () => {
  assert.deepEqual(scegliMomento({ ...base, momenti: [] }), { tipo: null, perche: 'nessun momento' });
});

test('una domanda rimasta sola passa davanti a tutto e aspetta solo due minuti', () => {
  const s = scegliMomento({ ...base, momenti: [flusso, { tipo: 'hype', dati: {}, spunto: '' }, domanda], ultimaSpontanea: ORA - FLOOR_DOMANDA_MS });
  assert.equal(s.tipo, 'domanda');
  assert.equal(s.momento.dati.user, 'bruno');
  assert.equal(scegliMomento({ ...base, momenti: [domanda], ultimaSpontanea: ORA - FLOOR_DOMANDA_MS + 1 }).tipo, null);
});

test('esplosione e rilancio non aspettano l\'intervallo della dose, ma il pavimento dei sei minuti si\'', () => {
  const hype = { tipo: 'hype', dati: {}, spunto: '' };
  assert.equal(scegliMomento({ ...base, dose: 0.01, momenti: [hype], ultimaSpontanea: ORA - FLOOR_MS }).tipo, 'hype');
  assert.equal(scegliMomento({ ...base, dose: 0.01, momenti: [hype], ultimaSpontanea: ORA - FLOOR_MS + 1 }).tipo, null);
  assert.equal(scegliMomento({ ...base, momenti: [{ tipo: 'rilancio', dati: {}, spunto: '' }, hype] }).tipo, 'hype', 'l\'esplosione conta piu\' del silenzio');
});

test('a discorso che scorre si aspetta l\'intervallo della dose, con un po\' di gioco', () => {
  const int = intervalloDose(0.5);
  assert.equal(scegliMomento({ ...base, ultimaSpontanea: ORA - int * 0.75, caso: { jitter: 0, scelta: 0 } }).tipo, 'iniziativa', 'col gioco al minimo basta il 75%');
  assert.equal(scegliMomento({ ...base, ultimaSpontanea: ORA - int * 0.75, caso: { jitter: 1, scelta: 0 } }).tipo, null, 'col gioco al massimo serve il 125%');
  assert.equal(scegliMomento({ ...base, ultimaSpontanea: ORA - int * 1.25, caso: { jitter: 1, scelta: 0 } }).tipo, 'iniziativa');
});

test('mai due di fila dello stesso genere, e la promo solo in diretta e ogni tre quarti d\'ora', () => {
  const pronto = { ...base, ultimaSpontanea: 0, battutaPronta: true };
  assert.equal(scegliMomento({ ...pronto, ultimoTipo: 'iniziativa', caso: { jitter: 0, scelta: 0 } }).tipo, 'battuta', 'dopo una cosa sua non un\'altra cosa sua');
  assert.equal(scegliMomento({ ...pronto, ultimoTipo: 'battuta', caso: { jitter: 0, scelta: 0 } }).tipo, 'iniziativa');
  assert.equal(scegliMomento({ ...pronto, ultimoTipo: '', caso: { jitter: 0, scelta: 0.99 } }).tipo, 'promo', 'la promo e\' l\'ultima delle scelte');
  assert.equal(scegliMomento({ ...pronto, live: false, caso: { jitter: 0, scelta: 0.99 } }).tipo, 'battuta', 'a canale spento niente promo');
  assert.equal(scegliMomento({ ...pronto, promoAccesa: false, caso: { jitter: 0, scelta: 0.99 } }).tipo, 'battuta');
  assert.equal(scegliMomento({ ...pronto, ultimaPromo: ORA - PROMO_MIN_MS + 1, caso: { jitter: 0, scelta: 0.99 } }).tipo, 'battuta', 'riposa tre quarti d\'ora');
  assert.equal(scegliMomento({ ...pronto, ultimaPromo: ORA - PROMO_MIN_MS, caso: { jitter: 0, scelta: 0.99 } }).tipo, 'promo');
  assert.equal(scegliMomento({ ...base, battutaPronta: false, promoAccesa: false, ultimoTipo: 'iniziativa' }).tipo, 'iniziativa', 'se c\'e\' una scelta sola, quella');
});

test('il registro tiene le ultime trenta, dalla piu\' recente, e non mischia i canali', () => {
  const m = new Map();
  for (let i = 0; i < 40; i++) registra(m, 'Uno', { ts: ORA + i, tipo: 'promo', testo: 'r' + i });
  registra(m, 'due', { ts: ORA, tipo: 'battuta', testo: 'x' });
  const uno = elenco(m, 'uno');
  assert.equal(uno.length, REGISTRO_MAX);
  assert.equal(uno[0].testo, 'r39');
  assert.equal(elenco(m, 'due').length, 1);
  assert.deepEqual(elenco(m, 'tre'), []);
});
