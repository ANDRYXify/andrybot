// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I CANCELLI come prove: quello che prima si lanciava a mano (e quindi ogni
// tanto non si lanciava) qui gira a ogni `npm test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lanciaScript } from '../aiuto.mjs';

test('package.json e il lock dicono la stessa cosa', async () => {
  const { codice, uscita } = await lanciaScript('scripts/verifica-dipendenze.mjs');
  assert.equal(codice, 0, uscita);
});

test('niente che si dichiari privato finisce su git', async () => {
  const { codice, uscita } = await lanciaScript('scripts/verifica-riservati.mjs');
  assert.equal(codice, 0, uscita);
});

test('nessun commento nei file che arrivano al browser', async () => {
  const { codice, uscita } = await lanciaScript('scripts/spoglia-commenti.mjs', ['--verifica']);
  assert.equal(codice, 0, uscita);
});

test("browser e server sono d'accordo sui campi dello stile", async () => {
  const { codice, uscita } = await lanciaScript('scripts/verifica-stile.mjs');
  assert.equal(codice, 0, uscita);
});

test('la libreria ha una porta in ogni campo media', async () => {
  const { codice, uscita } = await lanciaScript('scripts/verifica-libreria.mjs');
  assert.equal(codice, 0, uscita);
});

test('ogni frase del bot ha un posto solo, e il cancello se ne accorge davvero', async () => {
  const v = await lanciaScript('scripts/verifica-voce.mjs');
  assert.equal(v.codice, 0, v.uscita);
  const a = await lanciaScript('scripts/verifica-voce.mjs', ['--selftest']);
  assert.equal(a.codice, 0, a.uscita);
});

// Sul server Chromium non c'e': un collaudo col browser che non se ne accorge
// ferma tutto l'aggiornamento (e' successo con verifica-battito).
test('sul server, senza browser, i collaudi col browser si saltano da soli', async () => {
  const { codice, uscita } = await lanciaScript('scripts/verifica-senza-browser.mjs');
  assert.equal(codice, 0, uscita);
});

// Un file servito che non si legge spegne la pagina intera (il pannello e'
// app.js): nessuna prova lo carica, quindi lo si legge qui, uno per uno, con
// lo stesso Node che lo controlla (`--check` legge e non esegue).
test('ogni file che arriva al browser si legge', async () => {
  const { readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const giu = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'vendor' ? [] : giu(join(d, e.name))) : /\.m?js$/.test(e.name) ? [join(d, e.name)] : []));
  const file = giu('src/web/public');
  assert.ok(file.length > 30, 'li trova');
  const rotti = file.map((f) => [f, spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' })]).filter(([, r]) => r.status !== 0)
    .map(([f, r]) => `${f}: ${String(r.stderr).split('\n').find((l) => /Error/.test(l)) || r.stderr}`);
  assert.deepEqual(rotti, []);
});
