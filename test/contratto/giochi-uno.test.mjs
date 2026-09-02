// I GIOCHI SI FANNO IN UN POSTO SOLO.
//
// Prima erano due riquadri che facevano la stessa cosa — «I tuoi giochi» per le
// manche e «Inventa un gioco tuo» per quelli a comando — e il secondo, per
// finire il lavoro, ti spostava nella scheda Comandi. Tre elenchi e due schede
// per una cosa sola.
//
// Adesso la domanda e' una: CHI LO LANCIA. Il resto si adatta, e l'editor si
// disegna li' dentro invece di mandarti altrove.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const scheda = () => {
  const i = APP.indexOf("return pannello('giochi', `");
  const j = APP.indexOf("\n}", i);
  assert.ok(i > 0 && j > i, 'la scheda Giochi si trova');
  return APP.slice(i, j);
};

test('la scheda ha un posto solo dove si creano i giochi', () => {
  const s = scheda();
  assert.equal(s.split('lista-giochi"').length - 1, 1, 'un elenco solo');
  assert.ok(!s.includes('lista-giochi-miei'), 'niente secondo elenco');
  assert.ok(!s.includes('Inventa un gioco tuo'), 'niente seconda carta');
});

test('la prima domanda e\' chi lancia il gioco', () => {
  const s = scheda();
  for (const ramo of ['manche', 'comando']) {
    assert.ok(s.includes(`data-ramo="${ramo}"`), `c'è il ramo «${ramo}»`);
    assert.ok(s.includes(`id="gioco-${ramo}"`), `e il suo modulo`);
  }
});

test('le ricette non ti spostano piu\' in un\'altra scheda', () => {
  const i = APP.indexOf("document.getElementById('scheda-giochi')?.addEventListener('click'");
  const corpo = APP.slice(i, APP.indexOf('\n  });', i));
  assert.ok(corpo.includes("apriEditor(nome ? modelloPronto(nome) : null, 'editor-gioco')"),
    'la ricetta apre l\'editor nella scheda Giochi');
  assert.ok(!corpo.includes("vaiAScheda('moduli')"), 'e non cambia scheda');
});

test('l\'editor dei moduli sa disegnarsi anche altrove', () => {
  assert.match(APP, /function apriEditor\(modulo, dove = 'editor-modulo'\)/, 'accetta uno spazio');
  assert.match(APP, /const slotEditor = \(\) =>/, 'e tutti lo cercano da li\'');
  // L'unico posto che nomina il contenitore vecchio e' il ripiego di slotEditor:
  // se qualcun altro tornasse a prenderselo a mano, l'editor si disegnerebbe
  // nella scheda sbagliata e nessuno se ne accorgerebbe finche' non capita.
  const quante = APP.split("document.getElementById('editor-modulo')").length - 1;
  assert.equal(quante, 1, 'solo il ripiego di slotEditor lo nomina');
  const i = APP.indexOf('const slotEditor = () =>');
  assert.ok(APP.slice(i, i + 140).includes("document.getElementById('editor-modulo')"),
    'ed e\' proprio quello');
  assert.ok(scheda().includes('id="editor-gioco"'), 'la scheda Giochi ha il suo spazio');
});

test('le parole magiche dei giochi si ricavano dalla legenda, non da un secondo elenco', () => {
  const i = APP.indexOf('function variabiliDeiGiochi()');
  const corpo = APP.slice(i, APP.indexOf('\n}', i));
  assert.ok(corpo.includes('LEGENDA_VAR'), 'legge la legenda');
  assert.ok(corpo.includes('GRUPPI_GIOCO'), 'e ne prende i gruppi giusti');
  assert.ok(corpo.includes('VARIABILI.filter'), 'restando dentro quelle che esistono');
});
