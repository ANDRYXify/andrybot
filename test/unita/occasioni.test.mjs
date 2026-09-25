// LE OCCASIONI: un secondo strato sopra l"overlay che c"e" gia".
//
// Le prove che contano sono quelle in cui lo strato potrebbe smettere di essere
// uno strato, e nessuno se ne accorgerebbe guardando una serata sola:
//
//  · se le differenze si riempissero come si riempie una base, l"occasione
//    sovrascriverebbe TUTTO — anche quello che avevi tolto di proposito — e
//    spegnerla non riporterebbe piu" niente com"era;
//  · se due occasioni potessero essere accese insieme, la domanda «cosa sto
//    vedendo?» non avrebbe piu" una risposta sola;
//  · accendere e spegnere non deve toccare la base. Mai.
import test from 'node:test';
import assert from 'node:assert/strict';
import { conOccasione, occasioneAttiva, normOccasioni, accendi, MAX_OCCASIONI } from '../../src/features/occasioni.js';

const BASE = { alert: true, chat: false, timer: false, treno: false, musica: true };
const ov = (occasioni) => ({ mostra: { ...BASE }, xy: { alert: { x: 10, y: 10 } }, occasioni });

test("senza occasioni accese si vede la base, e basta", () => {
  const r = conOccasione(ov([]));
  assert.deepEqual(r.mostra, BASE);
  assert.equal(r.occasione, null);
});

test("l occasione accesa AGGIUNGE, e non tocca quello che non nomina", () => {
  const r = conOccasione(ov([{ id: 'sub', nome: 'Subathon', attiva: true, mostra: { timer: true, treno: true }, xy: {} }]));
  assert.equal(r.mostra.timer, true, 'il cronometro compare');
  assert.equal(r.mostra.treno, true);
  assert.equal(r.mostra.chat, false, 'la chat che avevi tolto resta tolta');
  assert.equal(r.mostra.alert, true, 'e il resto non si muove');
  assert.equal(r.occasione.nome, 'Subathon');
});

test("puo anche TOGLIERE, se e quello che vuoi stasera", () => {
  const r = conOccasione(ov([{ id: 'pausa', nome: 'Pausa', attiva: true, mostra: { alert: false }, xy: {} }]));
  assert.equal(r.mostra.alert, false);
});

test("e puo spostare una cosa senza spostarla per sempre", () => {
  const o = ov([{ id: 'sub', nome: 'S', attiva: true, mostra: {}, xy: { timer: { x: 50, y: 50 } } }]);
  const r = conOccasione(o);
  assert.deepEqual(r.xy.timer, { x: 50, y: 50 });
  assert.deepEqual(r.xy.alert, { x: 10, y: 10 }, 'quello che non nomina resta dove stava');
  assert.deepEqual(o.mostra, BASE, 'e la BASE non e stata toccata');
  assert.deepEqual(o.xy, { alert: { x: 10, y: 10 } }, 'nemmeno le posizioni');
});

test("spegnere riporta tutto com era, perche non c era niente da rovinare", () => {
  const o = ov([{ id: 'sub', nome: 'S', attiva: true, mostra: { timer: true }, xy: {} }]);
  assert.equal(conOccasione(o).mostra.timer, true);
  o.occasioni = accendi(o.occasioni, 'sub', false);
  assert.deepEqual(conOccasione(o).mostra, BASE);
});

test("una sola accesa: se ne arrivano due, vince la prima", () => {
  const l = normOccasioni([
    { id: 'a', nome: 'A', attiva: true },
    { id: 'b', nome: 'B', attiva: true },
  ], { pulisciMostra: (x) => x || {}, pulisciXy: (x) => x || {} });
  assert.equal(l[0].attiva, true);
  assert.equal(l[1].attiva, false);
  assert.equal(occasioneAttiva({ occasioni: l }).id, 'a');
});

test("accenderne una spegne quella di prima, senza chiedere niente a nessuno", () => {
  const l = accendi([{ id: 'a', attiva: true }, { id: 'b', attiva: false }], 'b');
  assert.deepEqual(l.map((o) => o.attiva), [false, true]);
});

test("le differenze restano SPARSE: solo le chiavi che l occasione nomina", () => {
  const l = normOccasioni([{ id: 'a', nome: 'A', mostra: { timer: true } }],
    { pulisciMostra: (m) => (m && typeof m === 'object' ? { ...m } : {}), pulisciXy: () => ({}) });
  assert.deepEqual(Object.keys(l[0].mostra), ['timer'],
    'riempirle come una base la trasformerebbe in una copia che sovrascrive tutto');
});

test("gli id sono unici, e non ce ne stanno all infinito", () => {
  const l = normOccasioni(
    Array.from({ length: 20 }, () => ({ id: 'x', nome: 'X' })),
    { pulisciMostra: () => ({}), pulisciXy: () => ({}) });
  assert.equal(l.length, MAX_OCCASIONI);
  assert.equal(new Set(l.map((o) => o.id)).size, l.length);
});

test("roba malfatta non fa danni", () => {
  assert.deepEqual(normOccasioni(null, {}), []);
  assert.deepEqual(normOccasioni('boh', {}), []);
  assert.equal(occasioneAttiva(null), null);
  assert.equal(occasioneAttiva({ occasioni: 'no' }), null);
  const r = conOccasione({ mostra: { alert: true }, occasioni: [{ id: 'a', attiva: true, mostra: 'no' }] });
  assert.deepEqual(r.mostra, { alert: true });
});

test("l'ordine dei livelli: un'occasione col suo lo usa intero, senza vale quello della base", () => {
  const base = { mostra: {}, xy: {}, ordine: ['muro', 'chat', 'alert'] };
  assert.deepEqual(conOccasione({ ...base, occasioni: [] }).ordine, ['muro', 'chat', 'alert']);
  assert.deepEqual(conOccasione({ ...base, occasioni: [{ id: 'a', attiva: true, mostra: {}, xy: {}, ordine: [] }] }).ordine, ['muro', 'chat', 'alert'],
    'un\'occasione che non l\'ha cambiato non lo tocca');
  assert.deepEqual(conOccasione({ ...base, occasioni: [{ id: 'a', attiva: true, mostra: {}, xy: {}, ordine: ['alert', 'muro', 'chat'] }] }).ordine, ['alert', 'muro', 'chat'],
    'un ordine a meta\' non direbbe dove stanno gli altri: o tutto il suo, o quello della base');
  assert.deepEqual(conOccasione({ mostra: {}, xy: {} }).ordine, [], 'un overlay che non l\'ha mai toccato non ha ordine: vale quello di serie');
  const l = normOccasioni([{ id: 'a', ordine: ['x', 'chat'] }], { pulisciOrdine: (v) => v.filter((k) => k !== 'x') });
  assert.deepEqual(l[0].ordine, ['chat'], 'le chiavi valide le decide chi conosce la base');
});
