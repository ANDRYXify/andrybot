// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I FILE IN CIMA AL SITO (docs/SEO.md): chi addestra le IA non legge niente,
// chi risponde alle persone legge SocialBot e i canali che lo permettono; ads.txt dichiara che nessuno vende
// pubblicita' per noi, con la riga che lo standard prescrive; humans.txt dice
// chi c'e' dietro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { regoleRobots, aiTxt, adsTxt, humansTxt, robotsTxt, IA_ADDESTRANO, VIE_CANALI, TDM_REP } from '../../src/web/file-pubblici.js';

const ROBOTS = readFileSync(new URL('../../src/web/robots-base.txt', import.meta.url), 'utf8');
const B = 'https://socialbot.live';

test('robots.txt: chi addestra non legge niente; chi risponde legge SocialBot e i canali che lo permettono', () => {
  const r = robotsTxt({ base: ROBOTS, canali: ['luna', 'Marco', '../x', 'a b'] });
  const gruppi = r.split(/\n\n+/);
  const di = (ua) => gruppi.find((g) => g.split('\n').includes(`User-agent: ${ua}`)) || '';
  for (const ua of IA_ADDESTRANO) assert.match(di(ua), /^Disallow: \/$/m, ua + ' non legge niente');
  assert.ok(!/^Allow/m.test(di('GPTBot')), 'nessuna eccezione per chi addestra');
  const risponde = di('OAI-SearchBot');
  for (const v of ['/u/', '/won/', '/dona/']) assert.ok(risponde.includes(`Disallow: ${v}\n`), 'le pagine dei canali chiuse di serie: ' + v);
  assert.ok(risponde.includes('Allow: /u/luna$') && risponde.includes('Allow: /u/luna/') && risponde.includes('Allow: /won/marco/'), 'aperte per chi lo permette');
  assert.ok(!risponde.includes('../x') && !risponde.includes('a b'), 'un nome che non e\' un canale non entra');
  for (const x of regoleRobots(ROBOTS).filter((q) => q.k === 'Disallow')) assert.ok(risponde.includes(`Disallow: ${x.v}\n`), 'le aree private chiuse anche qui: ' + x.v);
  assert.ok(r.startsWith(ROBOTS.trimEnd()), 'le regole per tutti restano quelle del file');
  const corto = robotsTxt({ base: 'User-agent: *\nAllow: /', vie: VIE_CANALI.corto, canali: ['luna'] });
  assert.match(corto, /^Allow: \/luna\$$/m);
  assert.ok(robotsTxt({ base: 'User-agent: *\nAllow: /', vie: VIE_CANALI.corto }).split('\n\n').at(-1).trim().endsWith('Disallow: /'), 'senza canali, niente');
  assert.deepEqual(regoleRobots('User-agent: GPTBot\nDisallow: /\nUser-agent: *\nDisallow: /api/ # privata\nAllow: /'), [{ k: 'Disallow', v: '/api/' }, { k: 'Allow', v: '/' }], 'solo le regole per tutti, senza commenti');
});

test('ai.txt e tdmrep: niente addestramento, da nessuna parte', () => {
  const ai = aiTxt(B);
  assert.match(ai, /^User-Agent: \*\nDisallow: \/$/m);
  assert.ok(ai.includes(`${B}/llms.txt`));
  assert.deepEqual(TDM_REP, [{ location: '/*', 'tdm-reservation': 1 }]);
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
