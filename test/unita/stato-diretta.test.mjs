// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUANDO UNA DIRETTA COMINCIA E QUANDO FINISCE (src/stream/stato-diretta.js).
//
// Il difetto: il giro ogni due minuti chiede a /streams, che una diretta nuova
// la vede in ritardo. Un suo «non c'e'» subito dopo l'evento di Twitch chiudeva
// la diretta appena cominciata: avviso «ha finito», rapporto vuoto, e un
// secondo avviso al giro dopo. Le promesse:
//  · comincia al primo «c'e'», da qualunque fonte;
//  · il giro che non la vede nei primi cinque minuti non la chiude;
//  · un giro a vuoto a meta' serata non la chiude;
//  · due giri a vuoto, con l'ultimo «c'e'» oltre i cinque minuti, la chiudono,
//    e dopo un buco del giro un «non c'e'» solo non basta;
//  · l'evento di fine la chiude subito.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dopoSegnale, GRAZIA_MS } from '../../src/stream/stato-diretta.js';

const MIN = 60_000;
const passa = (segnali) => segnali.reduce((s, [live, fonte, ora]) => dopoSegnale(s, { live, fonte, ora }), undefined);

test('comincia al primo «c\'e\'», da qualunque fonte', () => {
  assert.equal(passa([[true, 'evento', 0]]).live, true);
  assert.equal(passa([[true, 'giro', 0]]).live, true);
  assert.equal(passa([[false, 'giro', 0]]).live, false, 'mai vista: il giro decide subito');
});

test('il giro che non la vede subito dopo l\'evento non la chiude', () => {
  const s = passa([[true, 'evento', 0], [false, 'giro', 30_000], [false, 'giro', 150_000]]);
  assert.equal(s.live, true, 'due giri a vuoto, ma nei primi cinque minuti');
  assert.equal(passa([[true, 'evento', 0], [false, 'giro', 30_000], [true, 'giro', 270_000]]).assenze, 0, 'ritrovata: si riparte da zero');
});

test('un giro a vuoto a meta\' serata non la chiude; due, oltre la grazia, si\'', () => {
  const base = [[true, 'evento', 0], [true, 'giro', 60 * MIN]];
  assert.equal(passa([...base, [false, 'giro', 62 * MIN]]).live, true, 'uno solo');
  assert.equal(passa([...base, [false, 'giro', 62 * MIN], [true, 'giro', 64 * MIN], [false, 'giro', 66 * MIN]]).live, true, 'non di fila');
  assert.equal(passa([...base, [false, 'giro', 62 * MIN], [false, 'giro', 64 * MIN]]).live, true, 'di fila, ma l\'ultimo «c\'e\'» e\' a quattro minuti');
  assert.equal(passa([...base, [false, 'giro', 62 * MIN], [false, 'giro', 64 * MIN], [false, 'giro', 60 * MIN + GRAZIA_MS]]).live, false);
});

test('dopo un buco del giro, un solo «non c\'e\'» non basta', () => {
  // Twitch non ha risposto per sei minuti, poi il giro torna e non la vede: e' un giro solo
  assert.equal(passa([[true, 'evento', 0], [false, 'giro', 6 * MIN]]).live, true);
  assert.equal(passa([[true, 'evento', 0], [false, 'giro', 6 * MIN], [false, 'giro', 8 * MIN]]).live, false);
});

test('l\'evento di fine la chiude subito', () => {
  assert.equal(passa([[true, 'evento', 0], [false, 'evento', 10_000]]).live, false);
});
