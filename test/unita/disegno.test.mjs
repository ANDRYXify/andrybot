// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL DISEGNO FUORI DAL FILO DEL BOT (src/disegno.js): rasterizzare e codificare
// il PNG non fermano piu' chat e alert, e un filo che cade non lascia appeso chi
// aspettava.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { creaDisegnatore } from '../../src/disegno.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SVG = (lato) => `<svg xmlns="http://www.w3.org/2000/svg" width="${lato}" height="${lato}"><rect width="${lato}" height="${lato}" fill="#7c3aed"/><circle cx="${lato / 2}" cy="${lato / 2}" r="${lato / 3}" fill="#fff"/></svg>`;

test('torna il PNG e i pixel che servono, della misura giusta', async () => {
  const d = creaDisegnatore();
  try {
    const r = await d(SVG(64), {}, { png: true, pixels: true });
    assert.equal(r.width, 64);
    assert.equal(r.height, 64);
    assert.ok(r.png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'e\' un PNG');
    assert.equal(r.pixels.length, 64 * 64 * 4);
    assert.deepEqual([...r.pixels.subarray(0, 4)], [124, 58, 237, 255], 'l\'angolo e\' il fondo viola');
    const solo = await d(SVG(16));
    assert.ok(solo.png && solo.pixels === null, 'di serie solo il PNG');
  } finally { await d.chiudi(); }
});

test('un SVG rotto e\' un errore detto, e il filo resta buono', async () => {
  const d = creaDisegnatore();
  try {
    await assert.rejects(d('<svg', {}), /./);
    assert.equal((await d(SVG(8))).width, 8);
  } finally { await d.chiudi(); }
});

test('un filo che cade non lascia appeso chi aspettava, e il prossimo disegno lo riapre', async () => {
  const d = creaDisegnatore();
  try {
    const appeso = d(SVG(2000));
    d.chiudi();
    await assert.rejects(appeso, /fermat/);
    assert.equal((await d(SVG(8))).width, 8);
  } finally { await d.chiudi(); }
});

test('mentre si disegna il ciclo del bot gira', async () => {
  const d = creaDisegnatore();
  try {
    await d(SVG(32));
    let scatti = 0;
    const t = setInterval(() => { scatti++; }, 1);
    const inizio = performance.now();
    await d(SVG(3000), {}, { png: true });
    const durata = performance.now() - inizio;
    clearInterval(t);
    assert.ok(scatti >= Math.floor(durata / 8), `in ${Math.round(durata)} ms il ciclo ha girato ${scatti} volte`);
  } finally { await d.chiudi(); }
});

test('si rasterizza solo nel filo del disegno', () => {
  const file = (d) => readdirSync(join(RAD, d), { withFileTypes: true }).flatMap((f) => f.isDirectory() ? (f.name === 'public' ? [] : file(join(d, f.name))) : f.name.endsWith('.js') ? [join(d, f.name)] : []);
  const conResvg = file('src').filter((f) => /@resvg\/resvg-js/.test(readFileSync(join(RAD, f), 'utf8')));
  assert.deepEqual(conResvg, ['src/disegno-lavoro.js']);
});
