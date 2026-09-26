// LE IMMAGINI LEGGERE (src/web/png-leggero.js): la riduzione a 256 colori puo'
// solo migliorare un'anteprima, mai romperla. Qualunque cosa vada storta con
// ffmpeg, torna l'immagine di partenza.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pngDi, alleggerisci } from '../../src/web/png-leggero.js';

const NYC = readFileSync(new URL('../../src/web/public/icons/campagna-nyc.png', import.meta.url));

test('un PNG di quella misura si riconosce, il resto no', () => {
  assert.equal(pngDi(NYC, 1200, 630), true);
  assert.equal(pngDi(NYC, 1200, 631), false);
  assert.equal(pngDi(Buffer.from('non sono un png, non sono un png'), 1200, 630), false);
  assert.equal(pngDi('stringa', 1200, 630), false);
});

test('senza ffmpeg, o con un ffmpeg che non da\' un PNG, torna la stessa immagine', async () => {
  assert.equal(await alleggerisci(NYC, { w: 1200, h: 630, ffmpeg: 'ffmpeg-che-non-c-e' }), NYC);
  assert.equal(await alleggerisci(NYC, { w: 1200, h: 630, ffmpeg: 'true' }), NYC, 'esce con 0 ma senza un PNG');
  assert.equal(await alleggerisci(NYC, { w: 1200, h: 630, ffmpeg: 'false' }), NYC, 'esce con un errore');
});

test('un ffmpeg che non finisce si ferma, e torna la stessa immagine', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'png-leggero-'));
  const lento = join(dir, 'lento');
  writeFileSync(lento, '#!/bin/sh\nsleep 5\n');
  chmodSync(lento, 0o755);
  const t0 = Date.now();
  assert.equal(await alleggerisci(NYC, { w: 1200, h: 630, ffmpeg: lento, entro: 150 }), NYC);
  assert.ok(Date.now() - t0 < 2000, 'non aspetta i 5 secondi');
  rmSync(dir, { recursive: true, force: true });
});

const conFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
test('con ffmpeg esce un PNG della stessa misura e piu\' leggero', { skip: !conFfmpeg && 'ffmpeg non c\'e\' su questa macchina' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'png-leggero-'));
  const f = join(dir, 'pieno.png');
  assert.equal(spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', new URL('../../src/web/public/icons/campagna-nyc.png', import.meta.url).pathname, '-pix_fmt', 'rgb24', f]).status, 0);
  const pieno = readFileSync(f);
  const r = await alleggerisci(pieno, { w: 1200, h: 630 });
  assert.ok(pngDi(r, 1200, 630));
  assert.ok(r.length < pieno.length, `${r.length} contro ${pieno.length}`);
  rmSync(dir, { recursive: true, force: true });
});
