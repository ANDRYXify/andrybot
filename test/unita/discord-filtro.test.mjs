// IL FILTRO: le regole che non devono poter saltare.
//
// AutoMod e' di Discord e gira dentro Discord: ferma il messaggio prima che
// esista. Noi scriviamo le regole a lui, e poi ci stiamo fuori. Il ragionamento
// sta in docs/DISCORD-FILTRO.md; qui ci sono i difetti che non devono esistere:
//
//  · i tetti sono di Discord — sei regole di parole, una per ogni altro tipo —
//    e chiederne una in piu' torna un errore, quindi non si chiede;
//  · la pausa Discord la accetta solo su parole e menzioni: mandarla altrove
//    fa rifiutare tutta la regola per un campo che non doveva partire;
//  · una regola che non fa niente sembra accesa e non e': almeno blocca;
//  · canali e ruoli si nominano per NOME, perche' la traccia li sta creando;
//  · non si riscrive l'uguale, che in casa d'altri e' una riga di registro al
//    giorno per non aver fatto niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizzaPreset, dallaFotografia } from '../../src/features/discord-catalogo.js';
import { differenzaFiltro, normalizzaFiltro, vuota, improntaDi } from '../../src/features/discord-preset.js';
import { TETTO_AUTOMOD, PAUSA_MAX } from '../../src/features/discord-api.js';

const foto = {
  guild: { id: '100' },
  caratteristiche: [],
  ruoli: [{ id: '100', nome: '@everyone', permessi: '0' }, { id: '300', nome: 'Moderatori', permessi: '0' }],
  canali: [{ id: '1', nome: 'generale', tipo: 0, overwrites: [] }, { id: '2', nome: 'staff', tipo: 0, overwrites: [] }],
};

test('i tetti sono di Discord, e non si sfidano', () => {
  const tante = Array.from({ length: TETTO_AUTOMOD.parole + 3 }, (_, i) => ({ tipo: 'parole', nome: 'R' + i, parole: ['x'] }));
  const p = normalizzaPreset({ filtro: [...tante, { tipo: 'spam' }, { tipo: 'spam' }] });
  assert.equal(p.filtro.filter((r) => r.tipo === 'parole').length, TETTO_AUTOMOD.parole);
  assert.equal(p.filtro.filter((r) => r.tipo === 'spam').length, 1);
});

test('la pausa vale solo dove Discord la accetta', () => {
  const p = normalizzaPreset({ filtro: [
    { tipo: 'parole', parole: ['x'], azioni: { pausa: 600 } },
    { tipo: 'menzioni', azioni: { pausa: 600 } },
    { tipo: 'spam', azioni: { pausa: 600 } },
    { tipo: 'liste', liste: ['parolacce'], azioni: { pausa: 600 } },
  ] });
  const per = Object.fromEntries(p.filtro.map((r) => [r.tipo, r.azioni.pausa]));
  assert.equal(per.parole, 600);
  assert.equal(per.menzioni, 600);
  assert.equal(per.spam, 0, 'su spam Discord la rifiuterebbe, e con lei tutta la regola');
  assert.equal(per.liste, 0);
});

test('la pausa non supera il massimo di Discord', () => {
  const p = normalizzaPreset({ filtro: [{ tipo: 'parole', parole: ['x'], azioni: { pausa: PAUSA_MAX * 4 } }] });
  assert.equal(p.filtro[0].azioni.pausa, PAUSA_MAX);
});

test('una regola che non fa niente almeno blocca', () => {
  const p = normalizzaPreset({ filtro: [{ tipo: 'spam', azioni: { blocca: false } }] });
  assert.equal(p.filtro[0].azioni.blocca, true, 'senza azioni sembrerebbe accesa e non farebbe niente');
});

test('una regola di parole senza parole non si manda, e una di liste senza liste nemmeno', () => {
  const p = normalizzaPreset({ filtro: [
    { tipo: 'parole', nome: 'Vuota' }, { tipo: 'liste' },
    { tipo: 'parole', nome: 'Piena', parole: ['x'] },
  ] });
  assert.deepEqual(p.filtro.map((r) => r.nome), ['Piena']);
});

test('una regola di parole fatta solo di espressioni vale', () => {
  const p = normalizzaPreset({ filtro: [{ tipo: 'parole', espressioni: ['^ciao'] }] });
  assert.equal(p.filtro.length, 1);
});

test('i limiti dei campi sono quelli di Discord', () => {
  const p = normalizzaFiltro([{ tipo: 'parole',
    parole: Array.from({ length: 1400 }, (_, i) => 'p' + i),
    espressioni: Array.from({ length: 30 }, (_, i) => 'e' + i),
    passano: Array.from({ length: 300 }, (_, i) => 'a' + i),
    esentiRuoli: Array.from({ length: 40 }, (_, i) => 'r' + i),
    esentiCanali: Array.from({ length: 90 }, (_, i) => 'c' + i) }]);
  assert.equal(p[0].parole.length, 1000);
  assert.equal(p[0].espressioni.length, 10);
  assert.equal(p[0].passano.length, 100);
  assert.equal(p[0].esentiRuoli.length, 20);
  assert.equal(p[0].esentiCanali.length, 50);
});

test('canali e ruoli si nominano per nome', () => {
  const p = normalizzaPreset({ filtro: [{ tipo: 'parole', parole: ['x'],
    azioni: { avvisaIn: 'staff' }, esentiRuoli: ['Moderatori'], esentiCanali: ['generale'] }] });
  assert.equal(p.filtro[0].azioni.avvisaIn, 'staff');
  assert.deepEqual(p.filtro[0].esentiRuoli, ['Moderatori']);
  assert.deepEqual(p.filtro[0].esentiCanali, ['generale']);
});

// ---- la differenza --------------------------------------------------------
const regoleOra = () => ([
  { id: '90', tipo: 'parole', nome: 'Insulti', accesa: true, parole: ['brutto'], espressioni: [], passano: [],
    azioni: { blocca: true, messaggio: '', avvisaIn: '2', pausa: 0, isola: false },
    esentiRuoli: ['300'], esentiCanali: [] },
  { id: '91', tipo: 'spam', nome: 'Spam', accesa: true, azioni: { blocca: true, messaggio: '', pausa: 0, isola: false },
    esentiRuoli: [], esentiCanali: [] },
]);
const traccia = (extra = {}) => normalizzaPreset({ filtro: [
  { tipo: 'parole', nome: 'Insulti', parole: ['brutto'], azioni: { avvisaIn: 'staff' }, esentiRuoli: ['Moderatori'], ...extra },
  { tipo: 'spam' },
] });

test('un filtro gia\' cosi\' non si riscrive', () => {
  assert.equal(differenzaFiltro(traccia(), foto, regoleOra()), null,
    'una riga nel registro del server ogni sera, per non aver fatto niente');
});

test('una parola in piu\' cambia la regola, e non ne crea un\'altra', () => {
  const d = differenzaFiltro(traccia({ parole: ['brutto', 'cattivo'] }), foto, regoleOra());
  assert.equal(d.crea.length, 0);
  assert.equal(d.sistema.length, 1);
  assert.equal(d.sistema[0].id, '90', 'e resta la stessa regola, non una nuova');
});

test('una regola in piu\' nasce, e quella che la traccia non prevede si vede', () => {
  const p = normalizzaPreset({ filtro: [
    { tipo: 'parole', nome: 'Insulti', parole: ['brutto'], azioni: { avvisaIn: 'staff' }, esentiRuoli: ['Moderatori'] },
    { tipo: 'menzioni', tettoMenzioni: 8 },
  ] });
  const d = differenzaFiltro(p, foto, regoleOra());
  assert.deepEqual(d.crea.map((r) => r.tipo), ['menzioni']);
  assert.deepEqual(d.togli.map((r) => r.tipo), ['spam'], 'lo spam non e\' nella traccia, e si dice');
  assert.deepEqual(d.sistema, []);
});

// SEI REGOLE DI PAROLE SI DEVONO POTER DISTINGUERE, e l'unica cosa che le
// distingue e' il nome: il tipo ce l'hanno uguale. Senza il nome nella chiave,
// la seconda sovrascriverebbe la prima — e il difetto si vedrebbe solo il
// giorno che una lista sparisce da sola.
test('sei regole di parole sono sei regole, e il nome e\' quello che le distingue', () => {
  const ora = [
    { id: '90', tipo: 'parole', nome: 'Insulti', accesa: true, parole: ['brutto'], espressioni: [], passano: [],
      azioni: { blocca: true, messaggio: '', avvisaIn: '', pausa: 0, isola: false }, esentiRuoli: [], esentiCanali: [] },
    { id: '92', tipo: 'parole', nome: 'Truffe', accesa: true, parole: ['regalo'], espressioni: [], passano: [],
      azioni: { blocca: true, messaggio: '', avvisaIn: '', pausa: 0, isola: false }, esentiRuoli: [], esentiCanali: [] },
  ];
  const uguale = normalizzaPreset({ filtro: [
    { tipo: 'parole', nome: 'Insulti', parole: ['brutto'] },
    { tipo: 'parole', nome: 'Truffe', parole: ['regalo'] },
  ] });
  assert.equal(differenzaFiltro(uguale, foto, ora), null, 'due regole diverse, riconosciute tutte e due');

  const d = differenzaFiltro(normalizzaPreset({ filtro: [
    { tipo: 'parole', nome: 'Insulti', parole: ['brutto', 'cattivo'] },
    { tipo: 'parole', nome: 'Truffe', parole: ['regalo'] },
  ] }), foto, ora);
  assert.equal(d.sistema.length, 1, 'una sola cambia');
  assert.equal(d.sistema[0].id, '90');
  assert.equal(d.togli.length, 0, 'e nessuna sparisce');

  const r = differenzaFiltro(normalizzaPreset({ filtro: [
    { tipo: 'parole', nome: 'Insulti', parole: ['brutto'] },
    { tipo: 'parole', nome: 'Raggiri', parole: ['regalo'] },
  ] }), foto, ora);
  assert.deepEqual(r.crea.map((x) => x.nome), ['Raggiri']);
  assert.deepEqual(r.togli.map((x) => x.nome), ['Truffe']);
});

test('due regole di parole si riconoscono dal nome, non dal posto', () => {
  const p = normalizzaPreset({ filtro: [
    { tipo: 'spam' },
    { tipo: 'parole', nome: 'Insulti', parole: ['brutto'], azioni: { avvisaIn: 'staff' }, esentiRuoli: ['Moderatori'] },
  ] });
  assert.equal(differenzaFiltro(p, foto, regoleOra()), null, 'l\'ordine non e\' un\'identita\'');
});

test('spegnere una regola e\' un cambiamento', () => {
  const d = differenzaFiltro(traccia({ accesa: false }), foto, regoleOra());
  assert.equal(d.sistema.length, 1);
  assert.equal(d.sistema[0].accesa, false);
});

test('il filtro entra nell\'impronta e nel «niente da fare»', () => {
  const d = differenzaFiltro(traccia({ parole: ['altro'] }), foto, regoleOra());
  assert.equal(vuota({ filtro: d }), false);
  assert.notEqual(improntaDi({ filtro: d }), improntaDi({ filtro: { ...d, dice: [] } }));
  assert.equal(vuota({ filtro: { crea: [], sistema: [], togli: [], dice: [] } }), true);
});

test('anche solo una regola da togliere non e\' «niente da fare»', () => {
  assert.equal(vuota({ filtro: { crea: [], sistema: [], dice: [], togli: [{ id: '91' }] } }), false);
});

test('«leggi il mio server» si porta dietro anche il filtro, in nomi', () => {
  const p = dallaFotografia(foto, { regole: regoleOra() });
  assert.deepEqual(p.filtro.map((r) => r.tipo), ['parole', 'spam']);
  assert.equal(p.filtro[0].azioni.avvisaIn, 'staff', 'gli id tornano nomi');
  assert.deepEqual(p.filtro[0].esentiRuoli, ['Moderatori']);
  assert.equal(differenzaFiltro(p, foto, regoleOra()), null,
    'quello che si e\' letto, riscritto, non cambia niente');
});
