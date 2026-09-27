// I NUMERI DEL MANUALE DEI GIOCHI VENGONO DAL CATALOGO.
//
// I tris della slot pagano una parte del tris di 💎: tre quarti il 7, due
// quinti gli altri. Il manuale li scriveva a mano (0,75 e 0,4, e le parole),
// quindi un ribilancio lo avrebbe lasciato a mentire. Adesso il fattore sta
// nel catalogo, e lo leggono il motore, la resa, l'etichetta e il manuale. E la
// tabella delle regole diceva «1 frasi di serie».
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('numeri-manuale-');
const G = await import('../../src/features/giochi-conf.js');
const games = await import('../../src/features/games.js');
const N = await import('../../src/web/manuali/numeri.js');
test.after(() => casa.pulisci());

test('i fattori dei tris sono quelli del catalogo, per il motore e per il manuale', () => {
  const c = { costo: 10, jackpot: 1000, coppia: 5 };
  assert.equal(games.vincitaSlot(['7️⃣', '7️⃣', '7️⃣'], c).monete, Math.round(1000 * G.SLOT_TRIS.sette));
  assert.equal(games.vincitaSlot(['🍒', '🍒', '🍒'], c).monete, Math.round(1000 * G.SLOT_TRIS.altri));
  const esiti = G.giocoDi('slot').resa.esiti.map(([, e]) => e);
  assert.deepEqual(esiti.filter((e) => e[0] === 'jackpot').map((e) => e[1]), [1, G.SLOT_TRIS.sette, G.SLOT_TRIS.altri]);
  assert.deepEqual(N.SLOT.sette, { parte: 'tre quarti', fattore: G.SLOT_TRIS.sette });
  assert.deepEqual(N.SLOT.altri, { parte: 'due quinti', fattore: G.SLOT_TRIS.altri });
  const eti = G.giocoDi('slot').param.find((p) => p.k === 'jackpot').eti[0];
  assert.equal(eti, 'Tris di 💎 (il 7 paga tre quarti, gli altri due quinti)');
});

test('una parte senza un nome suo si dice in centesimi', () => {
  assert.deepEqual(G.parteDi(0.7), ['70 su 100', '70 in 100', '70 de cada 100']);
});

test('il manuale non riscrive a mano i fattori della slot', () => {
  const m = readFileSync(new URL('../../src/web/manuali/it/giochi.js', import.meta.url), 'utf8');
  assert.ok(!/\* 0\.75|\* 0\.4\b|'tre quarti'|'due quinti'/.test(m));
  assert.ok(m.includes('SLOT.sette.parte') && m.includes('SLOT.altri.fattore'));
});

test('uno e\' «frase», non «frasi»', () => {
  const righe = N.righeRegole().slice(1);
  assert.ok(!righe.some((r) => /(^|\D)1 (frasi|righe)\b/.test(`${r[2]} ${r[3]}`)), 'nessun «1 frasi» o «1 righe»');
  assert.ok(righe.some((r) => r[2] === '1 frase di serie'), 'c\'e\' un elenco con una frase sola');
  assert.ok(righe.some((r) => /^\d+ frasi di serie$/.test(r[2])));
});
