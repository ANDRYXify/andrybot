// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL LAVORO DI FONDO DEL CERVELLO PASSA DALLA PORTA (docs/RISORSE.md): quello che
// il bot gli chiede di sua iniziativa si salta col server sotto sforzo; le
// risposte a chi scrive no.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-cervello-fondo-');
test.after(() => usaEGetta.pulisci());
const { streamers } = await import('../../src/db.js');
const { risorse } = await import('../../src/risorse.js');
const { scheduleReflection } = await import('../../src/ai/reflection.js');

async function giro(t, posto) {
  streamers.request('canale', 'Canale', '1');
  streamers.setStatus('canale', 'approved');
  const resi = [];
  t.mock.method(risorse, 'prova', () => (posto ? () => resi.push(1) : null));
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const chiamate = { riflessioni: 0, semine: 0 };
  const ferma = scheduleReflection({ brain: { reflect: async () => { chiamate.riflessioni++; }, seminaProssimoModulo: async () => { chiamate.semine++; } } });
  t.mock.timers.tick(10 * 60_000);
  for (let i = 0; i < 5; i++) await new Promise((ok) => setImmediate(ok));
  ferma();
  t.mock.timers.reset();
  return { chiamate, resi: resi.length };
}

test('col posto la riflessione e la semina girano e rendono il permesso', async (t) => {
  const { chiamate, resi } = await giro(t, true);
  assert.ok(chiamate.riflessioni >= 1 && chiamate.semine >= 1, JSON.stringify(chiamate));
  assert.equal(resi, chiamate.riflessioni + chiamate.semine, 'ogni permesso preso e\' reso');
});

test('senza posto si saltano', async (t) => {
  const { chiamate } = await giro(t, false);
  assert.deepEqual(chiamate, { riflessioni: 0, semine: 0 });
});

test('le iniziative e la distillazione del bot chiedono il posto; le risposte a chi scrive no', () => {
  const BOT = readFileSync(new URL('../../src/bot.js', import.meta.url), 'utf8');
  assert.match(BOT, /const rendi = risorse\.prova\('cervello', login\);\n\s+if \(!rendi\) return;\n\s+Promise\.resolve\(\)\.then\(\(\) => this\.brain\.iniziativa\(/);
  assert.match(BOT, /\.finally\(rendi\);/);
  assert.match(BOT, /const rendi = attivo \? risorse\.prova\('cervello', login\) : null;\n\s+if \(rendi\) this\.brain\.distilla\(login\)\.catch\(\(\) => \{\}\)\.finally\(rendi\);/);
  const H = readFileSync(new URL('../../src/features/handler.js', import.meta.url), 'utf8');
  assert.doesNotMatch(H, /risorse/, 'la risposta a chi scrive e\' vitale');
});
