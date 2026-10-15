// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I MEDIA DELLO STUDIO RESTANO SUL DISPOSITIVO (docs/DIRETTA.md, «La memoria»).
//
// Il segnaposto riconosce il file dall'impronta: lo stesso file da' la stessa
// impronta, un file diverso un'altra. Fino a 64 MB l'impronta e' del file
// intero; oltre, di tre pezzi e della misura, per non caricare in memoria un
// video da due giga. Il deposito vero (IndexedDB) si prova in un browser vero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { impronta, INTERO_FINO_A, PEZZO } from '../../src/web/public/js/studio-media.js';

test('lo stesso file da\' la stessa impronta, ed e\' lo SHA-256 del contenuto', async () => {
  const dati = Buffer.from('ciao studio');
  const a = await impronta(new Blob([dati])), b = await impronta(new Blob([Buffer.from(dati)]));
  assert.equal(a, b);
  assert.equal(a, createHash('sha256').update(dati).digest('hex'));
  assert.notEqual(a, await impronta(new Blob([Buffer.from('ciao studia')])));
});

test('un file grande si riconosce da tre pezzi e dalla misura: cambia un byte in un pezzo, o la misura, e cambia', async () => {
  const n = INTERO_FINO_A + PEZZO * 3 + 17;
  const grande = Buffer.alloc(n, 7);
  const base = await impronta(new Blob([grande]));
  assert.match(base, /^[0-9a-f]{64}$/);
  for (const dove of [0, Math.floor(n / 2), n - 1]) {
    const c = Buffer.from(grande); c[dove] = 9;
    assert.notEqual(await impronta(new Blob([c])), base, `byte ${dove}`);
  }
  assert.notEqual(await impronta(new Blob([grande.subarray(0, n - 1)])), base, 'la misura conta');
});

test('il deposito non manda niente in rete: nessun fetch, nessun indirizzo', () => {
  const src = readFileSync(new URL('../../src/web/public/js/studio-media.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /fetch\(|XMLHttpRequest|sendBeacon|https?:\/\//);
});
