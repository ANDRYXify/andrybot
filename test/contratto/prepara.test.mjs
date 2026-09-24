// SI PREPARA SOLO QUELLO CHE SI VEDE, E PRIMA SI MISURA, POI SI SCRIVE.
//
// Il ragionamento sta in docs/MOTO.md («Si prepara solo quello che si vede»).
// Qui le cose che devono restare vere:
//  · il disegno del pannello prepara le carte della scheda che si vede, non di
//    tutte e trentasette;
//  · la scheda in cui entri si prepara per prima cosa: nessuno trova una
//    scheda non pronta;
//  · la comparsa non misura niente, scrive e basta. Misurava per decidere
//    quali carte entravano di lato; adesso le carte si disegnano, e cosa si
//    vede lo misura il disegno, tutto insieme prima di scrivere
//    (src/web/public/disegno.js, docs/DISEGNO.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const funzione = (nome) => {
  const i = APP.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `c'e' ${nome}`);
  return APP.slice(i, APP.indexOf('\n}\n', i));
};

test('il disegno prepara solo la scheda che si vede', () => {
  const r = funzione('render');
  assert.ok(r.includes("const inVista = [...document.querySelectorAll('.pannello-scheda.visibile')];"));
  assert.ok(r.includes('inVista.forEach((p) => rendiCartePieghevoli(p, p.dataset.scheda));'));
  assert.ok(r.includes('inVista.forEach((p) => rivelaCarte(p));'));
  assert.ok(!/querySelectorAll\('\.pannello-scheda'\)\.forEach\(\(p\) => rendiCartePieghevoli/.test(r), 'non tutte le schede');
});

test('la scheda in cui entri si prepara per prima cosa', () => {
  const v = funzione('vaiAScheda');
  const trova = v.indexOf("const sezioni = [...document.querySelectorAll('.pannello-scheda')].filter((p) => p.dataset.scheda === id);");
  const prepara = v.indexOf('sezioni.forEach((p) => rendiCartePieghevoli(p, id));');
  assert.ok(trova > 0 && prepara > trova, 'appena trovata, si prepara');
  for (const dopo of ['_scambiaScheda(id, sezioni)', '_cambiaScena(id, sezioni']) {
    assert.ok(v.indexOf(dopo) > prepara, `prima di ${dopo}`);
  }
});

test('la comparsa non misura niente: scrive e basta', () => {
  const c = funzione('rivelaCarte');
  assert.ok(c.includes("c.classList.add('rivela');"), 'rivela le carte');
  assert.doesNotMatch(c, /getBoundingClientRect|offsetWidth|offsetHeight|getComputedStyle/, 'senza chiedere misure al browser');
});
