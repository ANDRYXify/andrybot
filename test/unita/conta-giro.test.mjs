// Il giro completo della posizione di un contatore: quello che imposti nello
// studio -> pulizia in ingresso -> database -> quello che l'overlay riceve.
//
// Lo studio muove col pixel (le frecce spostano di un pixel di tela, che su
// 1920 e' lo 0,05%) e per questo la posizione si salva con due decimali. Se
// qualunque anello della catena arrotonda, la regolazione fine non arriva in
// diretta: ricarichi e l'elemento e' tornato indietro. I test sulla sola
// pulizia non bastano a dirlo — qui si prova la catena intera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-contagiro-');
const { contatori } = await import('../../src/db.js');
const { puliConta } = await import('../../src/web/stile.js');

const CH = 'canale';
// il pezzo di server che sta fra il browser e il database, in una riga
const salva = (comando, overlay) => contatori.upsert(CH, { comando, overlay: puliConta(overlay) });

test('la posizione fine di un contatore arriva fino all’overlay', () => {
  salva('morti', { mostra: true, x: 2.29, y: 96.54, dim: 40, r: 0 });
  const p = contatori.payloadOverlay(contatori.get(CH, 'morti'));
  assert.equal(p.x, 2.29, 'i decimali della x sopravvivono al giro');
  assert.equal(p.y, 96.54, 'e quelli della y');
});

test('un pixel di freccia non si perde per strada', () => {
  salva('tentativi', { mostra: true, x: 50, y: 50 });
  const prima = contatori.payloadOverlay(contatori.get(CH, 'tentativi')).x;
  salva('tentativi', { x: 50.05 });
  const dopo = contatori.payloadOverlay(contatori.get(CH, 'tentativi')).x;
  assert.notEqual(dopo, prima, 'uno spostamento di un pixel si vede in diretta');
  assert.equal(dopo, 50.05);
});

test('accendere un contatore da chat non gli sposta niente', () => {
  salva('vittorie', { mostra: false, x: 12.34, y: 87.65, colore: '#ff0000', dim: 55 });
  salva('vittorie', { mostra: true });
  const p = contatori.payloadOverlay(contatori.get(CH, 'vittorie'));
  assert.equal(p.mostra, true, 'l’interruttore si accende');
  assert.equal(p.x, 12.34, 'e la posizione resta dov’era');
  assert.equal(p.colore, '#ff0000');
  assert.equal(p.dim, 55);
});

test('quel che non è un colore non cancella il colore che c’era', () => {
  salva('morti2', { colore: '#123456', sfondo: '#654321' });
  salva('morti2', { sfondo: 'url(http://fuori)' });
  const p = contatori.payloadOverlay(contatori.get(CH, 'morti2'));
  assert.equal(p.sfondo, '#654321', 'lo sfondo buono resta');
  assert.equal(p.colore, '#123456');
});

test('un valore fuori scala rientra invece di finire in diretta', () => {
  salva('morti3', { x: 500, dim: 99999, r: 900 });
  const p = contatori.payloadOverlay(contatori.get(CH, 'morti3'));
  assert.equal(p.x, 100);
  assert.equal(p.dim, 200);
  assert.equal(p.r, 180);
});

test.after(() => usaEGetta.pulisci());
