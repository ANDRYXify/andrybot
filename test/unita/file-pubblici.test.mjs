// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I FILE IN CIMA AL SITO (docs/SEO.md): ai.txt dice le stesse regole di
// robots.txt, perche' le legge da li'; ads.txt dichiara che nessuno vende
// pubblicita' per noi, con la riga che lo standard prescrive; humans.txt dice
// chi c'e' dietro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { regoleRobots, aiTxt, adsTxt, humansTxt } from '../../src/web/file-pubblici.js';

const ROBOTS = readFileSync(new URL('../../src/web/public/robots.txt', import.meta.url), 'utf8');
const B = 'https://socialbot.live';

test('ai.txt: le stesse porte di robots.txt, lette dal file vero', () => {
  const regole = regoleRobots(ROBOTS);
  assert.ok(regole.filter((r) => r.k === 'Disallow').length >= 5, 'robots.txt chiude le aree private');
  const ai = aiTxt(ROBOTS, B);
  const righe = ai.split('\n').filter((x) => /^(Allow|Disallow):/.test(x));
  assert.deepEqual(righe, regole.map((r) => `${r.k}: ${r.v}`), 'nessuna regola in piu\' o in meno');
  assert.match(ai, /^User-Agent: \*$/m);
  assert.ok(ai.includes(`${B}/llms.txt`));
  assert.deepEqual(regoleRobots('User-agent: GPTBot\nDisallow: /\nUser-agent: *\nDisallow: /api/ # privata\nAllow: /'), [{ k: 'Disallow', v: '/api/' }, { k: 'Allow', v: '/' }], 'solo le regole per tutti, senza commenti');
});

test('ads.txt: nessun venditore autorizzato, come dice lo standard', () => {
  const a = adsTxt(B);
  assert.ok(a.split('\n').includes('placeholder.example.com, placeholder, DIRECT, placeholder'));
  assert.ok(a.split('\n').includes('ownerdomain=socialbot.live'));
});

test('humans.txt: chi c\'e\' dietro, e quando e\' cambiato', () => {
  const h = humansTxt(B, { aggiornato: '2026-11-05' });
  assert.match(h, /\/\* TEAM \*\//);
  assert.match(h, /Andrea Taliento \(ANDRYXify\)/);
  assert.match(h, /Ultimo aggiornamento: 2026-11-05/);
  assert.ok(!/Ultimo aggiornamento/.test(humansTxt(B)), 'senza data non si inventa');
});
