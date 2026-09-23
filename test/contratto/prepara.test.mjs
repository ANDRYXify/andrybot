// SI PREPARA SOLO QUELLO CHE SI VEDE, E PRIMA SI MISURA, POI SI SCRIVE.
//
// Il ragionamento sta in docs/MOTO.md («Si prepara solo quello che si vede»).
// Qui le cose che devono restare vere:
//  · il disegno del pannello prepara le carte della scheda che si vede, non di
//    tutte e trentasette;
//  · la scheda in cui entri si prepara per prima cosa, prima della transizione:
//    nessuno trova una scheda non pronta;
//  · la comparsa misura tutte le carte e poi scrive: una misura dopo una
//    scrittura rifa' l'impaginazione, e in un ciclo la rifa' a ogni carta.
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

test('la comparsa prima misura tutte le carte, poi scrive', () => {
  const c = funzione('rivelaCarte');
  const misura = c.indexOf('const sopra = carte.map((c) => c.getBoundingClientRect().top);');
  const scrive = c.indexOf("c.classList.add('rivela');");
  assert.ok(misura > 0 && scrive > misura, 'le misure vengono prima');
  assert.equal((c.match(/getBoundingClientRect/g) || []).length, 1, 'e sono tutte li\'');
});
