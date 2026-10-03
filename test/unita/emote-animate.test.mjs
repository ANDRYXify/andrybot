// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Le regole delle emote animate (emote-animate.js), senza browser:
//  · Twitch vuole al massimo 60 fotogrammi: se sono di più si ricampiona nel
//    tempo e la durata del giro resta quella vera, al centesimo;
//  · un tempo sotto i 2 centesimi i browser lo mostrano a 10: si legge così;
//  · sfoltire tiene la durata, sommando i tempi;
//  · niente più di tre lampeggi al secondo (la regola WCAG dei lampi
//    generali: coppie di cambi opposti di luminanza di almeno 0.1, col più
//    scuro sotto 0.8), contando anche a cavallo del giro;
//  · la luminanza si misura come la mostra la GIF: un punto è pieno o vuoto.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(RAD, 'src/web/public/emote-animate.js'), 'utf8'), ctx);
const E = ctx.window.SB_EMOTE;
const somma = (p) => p.reduce((s, f) => s + f.cs, 0);

test('pochi fotogrammi: restano tutti, ognuno col suo tempo', () => {
  const p = E.ricampiona([40, 60, 100, 40], 60);
  assert.deepEqual([...p.map((f) => f.da)], [0, 1, 2, 3]);
  assert.deepEqual([...p.map((f) => f.cs)], [4, 6, 10, 4]);
});

test('tempi sotto i 2 centesimi valgono 10, come nei browser', () => {
  const p = E.ricampiona([0, 10, 50], 60);
  assert.deepEqual([...p.map((f) => f.cs)], [10, 10, 5]);
});

test('troppi fotogrammi: si scende a 60 e il giro dura uguale, al centesimo', () => {
  for (const [n, ms] of [[100, 40], [240, 50], [61, 33], [999, 20]]) {
    const durate = Array.from({ length: n }, () => ms);
    const p = E.ricampiona(durate, 60);
    assert.ok(p.length <= 60, `${n} fotogrammi: ne restano ${p.length}`);
    assert.equal(somma(p), Math.round((n * ms) / 10), `${n}×${ms} ms: il giro dura ${somma(p)} cs`);
    assert.ok(p.every((f) => f.cs >= 2), 'nessun tempo sotto i 2 centesimi');
    for (let i = 1; i < p.length; i++) assert.ok(p[i].da >= p[i - 1].da, 'i fotogrammi vanno avanti nel tempo');
  }
});

test('ricampionare prende il fotogramma che si vede in quell\'istante', () => {
  const p = E.ricampiona([500, 100, 100, 100, 100, 100], 3);
  assert.deepEqual([...p.map((f) => f.da)], [0, 0, 2], 'a 0 ms il primo, a 333 ancora il primo, a 666 quello partito a 600');
});

test('sfoltire tiene la durata', () => {
  const p = E.ricampiona(Array.from({ length: 60 }, () => 50), 60);
  for (const passo of [1, 2, 3, 4]) {
    const q = E.sfoltisci(p, passo);
    assert.equal(q.length, Math.ceil(60 / passo));
    assert.equal(somma(q), somma(p));
  }
});

test('la scala di riduzione scende sempre: prima i colori, poi i fotogrammi', () => {
  for (let i = 1; i < E.RIDUZIONI.length; i++) {
    const [c0, p0] = E.RIDUZIONI[i - 1], [c1, p1] = E.RIDUZIONI[i];
    assert.ok(p1 > p0 || (p1 === p0 && c1 < c0), `passo ${i}: ${c0}/${p0} → ${c1}/${p1}`);
  }
});

test('lampeggi: bianco e nero a 10 per secondo sono troppi, a 2 per secondo no', () => {
  const alterna = (n) => Array.from({ length: n }, (_, i) => (i % 2 ? 1 : 0));
  assert.ok(E.lampeggi(alterna(20), Array(20).fill(10)) > 3, '10 cambi al secondo');
  assert.ok(E.lampeggi(alterna(8), Array(8).fill(50)) <= 3, '2 cambi al secondo');
  assert.equal(E.lampeggi([0.2, 0.25, 0.3, 0.22], [10, 10, 10, 10]), 0, 'variazioni piccole non sono lampi');
  assert.equal(E.lampeggi(alterna(20).map((x) => 0.85 + x * 0.15), Array(20).fill(10)), 0, 'tutto chiaro (sopra 0.8) non è un lampo');
});

test('lampeggi: si contano anche a cavallo del giro', () => {
  const lum = [0, 1, 0, 1, 0.3, 0.3, 0.3, 0.3, 0.3, 0, 1, 0, 1];
  const cs = [5, 5, 5, 5, 100, 100, 100, 100, 100, 5, 5, 5, 5];
  assert.ok(E.lampeggi(lum, cs) > 3, 'gli ultimi e i primi fotogrammi lampeggiano insieme');
});

test('luminanza: un pixel trasparente vale il fondo', () => {
  const vuoto = new Uint8ClampedArray([0, 0, 0, 0]);
  assert.ok(Math.abs(E.luminanza(vuoto, [255, 255, 255]) - 1) < 1e-9);
  assert.ok(Math.abs(E.luminanza(vuoto, [0, 0, 0])) < 1e-9);
  const bianco = new Uint8ClampedArray([255, 255, 255, 255]);
  assert.ok(Math.abs(E.luminanza(bianco, [0, 0, 0]) - 1) < 1e-9);
});

test('luminanza come la mostra una GIF: un punto è pieno o vuoto, a metà dell\'alfa', () => {
  const sotto = new Uint8ClampedArray([0, 0, 0, 127]), sopra = new Uint8ClampedArray([0, 0, 0, 128]);
  assert.ok(Math.abs(E.luminanza(sotto, [255, 255, 255], true) - 1) < 1e-9, 'sotto metà resta il fondo');
  assert.ok(Math.abs(E.luminanza(sopra, [255, 255, 255], true)) < 1e-9, 'da metà in su il punto copre tutto');
  const mezzo = E.luminanza(sotto, [255, 255, 255]);
  assert.ok(mezzo > 0.4 && mezzo < 0.6, 'senza, si mescola col fondo');
});
