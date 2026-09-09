// DI CHI È QUESTO SOFTWARE, E COME SI FA A DIMOSTRARLO.
//
// Quello che una filigrana nel frontend PUÒ fare e quello che non può, detto
// prima di scriverla, perché il resto è fumo:
//
//  · NON può essere impossibile da togliere. Tutto ciò che arriva a un browser
//    si legge e si riscrive. Chi dice il contrario vende fumo;
//  · PUÒ far fallire una copia dicendo di chi è. Una copia non raggiunge questo
//    server — non manda intestazioni CORS e accetta solo il traffico che passa
//    dal nostro edge — quindi il frontend rubato non si avvia. Qui si decide
//    cosa mostra quando non si avvia: la proprietà;
//  · PUÒ costare fatica a chi la toglie. La firma non sta in un punto solo: si
//    compone da pezzi in file diversi, e se ne manca uno non si compone affatto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

test('la firma si compone da piu\' file, non sta in uno solo', () => {
  const app = leggi('src/web/public/app.js');
  const i = app.indexOf('function _firma()');
  assert.ok(i > 0, 'la funzione che la compone esiste');
  const f = app.slice(i, app.indexOf('\nfunction ', i + 10));
  assert.ok(/getPropertyValue\('--ax-1'\)/.test(f), 'un pezzo sta nel foglio di stile');
  assert.ok(/window\.__ax2/.test(f), 'un pezzo sta nello script del tema');
  assert.ok(/\(a && b\)/.test(f), 'e se ne manca uno non si compone: la firma non e\' una scritta, e\' un pezzo che serve');
  assert.ok(leggi('src/web/public/tema.css').includes('--ax-1:'), 'il pezzo nel foglio di stile c\'e\'');
  assert.ok(leggi('src/web/public/tema.js').includes('__ax2'), 'il pezzo nello script c\'e\'');
});

test('quando l\'app non parte, dice di chi e\'', () => {
  const app = leggi('src/web/public/app.js');
  assert.ok(/_pagineDiProprieta\(\)/.test(app), 'la pagina di proprieta\' esiste');
  const i = app.indexOf('function _pagineDiProprieta()');
  const f = app.slice(i, app.indexOf('\nasync function', i));
  assert.ok(/Andrea Taliento/.test(f), 'c\'e\' il nome');
  assert.ok(/_firma\(\)/.test(f), 'e la firma composta');
  // e sta sul percorso che si imbocca quando il server non risponde: e' quello
  // che vede chi ha copiato i file e non ha il backend
  const boot = app.slice(app.indexOf('async function caricaStato()'), app.indexOf('apriDaIndirizzo();\n  render();'));
  assert.ok(/_pagineDiProprieta\(\)/.test(boot), 'la pagina compare quando il server non risponde');
});

test('l\'impronta del progetto si calcola e non dipende dall\'ora', () => {
  const s = leggi('scripts/impronta.mjs');
  assert.ok(/sha256/.test(s), 'usa un\'impronta vera');
  assert.ok(!/Date\.now\(\)|new Date\(\)/.test(s.replace(/\/\/[^\n]*/g, '')),
    'non ci mette dentro l\'ora: due lanci sullo stesso codice devono dare lo stesso numero');
  assert.ok(/rev-parse/.test(s), 'e riporta il commit, che e\' la catena delle date');
});

test('la filigrana non promette quello che non puo\' mantenere', () => {
  // Un documento che dicesse «impossibile da rimuovere» sarebbe falso, e la cosa
  // peggiore in un progetto e' una difesa che si crede piu' forte di com'e'.
  const t = leggi('test/contratto/proprieta.test.mjs');
  assert.ok(/NON può essere impossibile da togliere/.test(t),
    'il limite sta scritto dove si legge, non nascosto');
});
