// I CARTELLI: una scritta o un'immagine, e sono la stessa cosa.
//
// Stanno in una lista sola, e le prove che contano riguardano proprio quello:
// che i due tipi passino dalla stessa porta, e che quella porta non lasci
// entrare niente di storto — un id ripetuto si ruberebbe il posto, un
// riferimento a un file inventato diventerebbe un indirizzo qualsiasi da
// caricare, e una veste con valori assurdi finirebbe dritta in diretta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normCartelli, normCartello, MAX_CARTELLI, TIPI_CARTELLO } from '../../src/web/stile.js';

test('una scritta e un\'immagine escono dalla stessa forma', () => {
  const [a, b] = normCartelli([{ testo: 'ciao' }, { tipo: 'immagine', effetto: 'effetto:logo' }]);
  assert.equal(a.tipo, 'scritta');
  assert.equal(b.tipo, 'immagine');
  assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), 'due tipi, un solo insieme di campi');
});

test('un cartello nasce senza scatola: nessuno sfondo e nessuna cornice', () => {
  const c = normCartello({ testo: 'x' });
  assert.equal(c.stile.opacita, 0);
  assert.equal(c.stile.cornice, 'nessuna');
});

test('ma chi la scatola la vuole se la tiene, anche a zero', () => {
  assert.equal(normCartello({ testo: 'x', stile: { opacita: 60 } }).stile.opacita, 60);
  assert.equal(normCartello({ testo: 'x', stile: { opacita: 0 } }).stile.opacita, 0);
  assert.equal(normCartello({ testo: 'x', stile: { cornice: 'linea' } }).stile.cornice, 'linea');
});

test('l\'immagine si sceglie dalla libreria, non si scrive a mano', () => {
  assert.equal(normCartello({ tipo: 'immagine', effetto: 'effetto:logo' }).effetto, 'effetto:logo');
  for (const brutto of ['https://altrove.example/x.png', '/etc/passwd', 'effetto:', 'effetto:../fuori', 'javascript:alert(1)']) {
    assert.equal(normCartello({ tipo: 'immagine', effetto: brutto }).effetto, '', `passa ${brutto}`);
  }
});

test('due cartelli non possono avere lo stesso nome interno', () => {
  const l = normCartelli([{ id: 'c1', testo: 'a' }, { id: 'c1', testo: 'b' }, { id: 'c1', testo: 'c' }]);
  assert.equal(new Set(l.map((c) => c.id)).size, 3);
});

test('l\'elenco ha un tetto, e quel che c\'e\' dentro sta nei limiti', () => {
  const tanti = normCartelli(Array.from({ length: 30 }, (_, i) => ({ testo: 'n' + i })));
  assert.equal(tanti.length, MAX_CARTELLI);
  const c = normCartello({ testo: 'x'.repeat(900), nome: 'n'.repeat(90), larghezza: 999, tipo: 'chissa', allinea: 'diagonale', posizione: 'nel-mezzo' });
  assert.equal(c.testo.length, 300);
  assert.equal(c.nome.length, 40);
  assert.equal(c.larghezza, 100);
  assert.equal(c.tipo, 'scritta');
  assert.equal(c.allinea, 'sinistra');
  assert.equal(c.posizione, 'basso-sinistra');
});

test('le parole vanno a capo se lo scrivi tu: il testo si tiene com\'e\'', () => {
  assert.equal(normCartello({ testo: 'prima\nseconda' }).testo, 'prima\nseconda');
});

test('quel che non e\' una lista non diventa una lista storta', () => {
  assert.deepEqual(normCartelli(null), []);
  assert.deepEqual(normCartelli('cartello'), []);
  assert.deepEqual(normCartelli([null, undefined]).length, 2, 'due voci vuote restano due cartelli vuoti, non un buco');
});

test('i tipi sono due, e li dice l\'elenco', () => {
  assert.deepEqual(TIPI_CARTELLO, ['scritta', 'immagine']);
});
