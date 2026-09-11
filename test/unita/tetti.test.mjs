// I TETTI: quante connessioni, quanto spazio, e cosa resta di un SVG.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

cartellaUsaEGetta('andrybot-tetti-');
const { EffectsEngine, MAX_SSE_CANALE, MAX_SSE_TOTALE } = await import('../../src/features/effects.js');
const { spazioCartella, inMega } = await import('../../src/features/spazio.js');
const { svgInPng } = await import('../../src/features/compress.js');

const finto = () => { const r = { chiuso: false, scritto: [] }; r.end = () => { r.chiuso = true; }; r.write = (s) => r.scritto.push(s); return r; };

test('oltre il tetto del canale si chiude la connessione PIU\' VECCHIA, non la nuova', () => {
  const e = new EffectsEngine();
  const prime = [];
  for (let i = 0; i < MAX_SSE_CANALE; i++) { const r = finto(); prime.push(r); e.addClient('canale', r); }
  assert.equal(prime.filter((r) => r.chiuso).length, 0, 'fino al tetto nessuno viene chiuso');
  const nuova = finto();
  e.addClient('canale', nuova);
  assert.equal(prime[0].chiuso, true, 'la prima aperta e\' stata chiusa');
  assert.equal(prime[1].chiuso, false, 'la seconda no');
  assert.equal(nuova.chiuso, false, 'la nuova e\' dentro');
  assert.equal(e.quantiClient().totale, MAX_SSE_CANALE, 'il canale resta al tetto');
  e.emit('canale', { x: 1 });
  assert.equal(nuova.scritto.length, 1, 'e riceve gli eventi');
  assert.equal(prime[0].scritto.length, 0, 'la sfrattata no');
});

test('il tetto vale per canale: un altro canale non paga per il primo', () => {
  const e = new EffectsEngine();
  for (let i = 0; i < MAX_SSE_CANALE; i++) e.addClient('uno', finto());
  const altro = finto();
  e.addClient('due', altro);
  assert.equal(altro.chiuso, false);
  assert.equal(e.quantiClient().canali, 2);
});

test('il tracking ha lo stesso tetto', () => {
  const e = new EffectsEngine();
  const prima = finto();
  e.addTrkClient('c', prima);
  for (let i = 0; i < MAX_SSE_CANALE; i++) e.addTrkClient('c', finto());
  assert.equal(prima.chiuso, true);
});

test('postoLibero dice quando il totale e\' pieno', () => {
  const e = new EffectsEngine();
  assert.equal(e.postoLibero(), true);
  // si simula il totale senza aprire davvero quattromila connessioni
  e._totaleClient = () => MAX_SSE_TOTALE;
  assert.equal(e.postoLibero(), false);
  e._totaleClient = () => MAX_SSE_TOTALE - 1;
  assert.equal(e.postoLibero(), true);
});

test('lo spazio di una cartella e\' la somma dei suoi file, e una cartella che non c\'e\' pesa zero', () => {
  const d = mkdtempSync(join(tmpdir(), 'sb-spazio-'));
  try {
    writeFileSync(join(d, 'a.bin'), Buffer.alloc(1000));
    writeFileSync(join(d, 'b.bin'), Buffer.alloc(24));
    mkdirSync(join(d, 'sotto'));
    writeFileSync(join(d, 'sotto', 'c.bin'), Buffer.alloc(5000));
    assert.equal(spazioCartella(d), 1024, 'solo i file di quella cartella, non le sottocartelle');
    assert.equal(spazioCartella(join(d, 'non-esiste')), 0);
    assert.equal(inMega(1024 * 1024 * 2.55), 2.6);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('un SVG con dentro uno script diventa un PNG, e dello script non resta niente', async () => {
  const d = mkdtempSync(join(tmpdir(), 'sb-svg-'));
  try {
    const src = join(d, 'x.svg'), dst = join(d, 'x.png');
    writeFileSync(src, '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><script>alert(1)</script><rect width="32" height="32" fill="#ba007a"/></svg>');
    const n = await svgInPng(src, dst, 64);
    const png = readFileSync(dst);
    assert.ok(n > 0 && png.length === n);
    assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'e\' un PNG vero');
    assert.equal(png.includes('alert'), false, 'lo script non c\'e\' piu\'');
  } finally { rmSync(d, { recursive: true, force: true }); }
});
