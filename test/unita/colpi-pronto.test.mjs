// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// CHI E' PRONTO PER I COLPI (docs/COLPI.md, «L'overlay dei Pew»): il pronto e'
// per istanza di overlay. Il caso vero: due overlay dello stesso canale, uno in
// onda e uno in una scena nascosta; con un pronto solo per canale vinceva
// l'ultimo che parlava, e i colpi si fermavano (o si facevano pagare a vuoto).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('colpi-pronto-');
const { EffectsEngine } = await import('../../src/features/effects.js');
test.after(() => casa.pulisci());

const motore = () => { const e = Object.create(EffectsEngine.prototype); e._clients = new Map([['andry', new Set([{}])]]); return e; };

test('due overlay: quello nascosto che dice «no» non spegne quello in onda', () => {
  const e = motore();
  e.segnaPronto('andry', true, 1000, 'inonda');
  e.segnaPronto('andry', false, 1001, 'nascosto');
  assert.equal(e.prontoColpi('andry', 2000), true, 'uno in onda basta');
  e.segnaPronto('andry', false, 3000, 'inonda');
  assert.equal(e.prontoColpi('andry', 3001), false, 'nessuno in onda: nessuno pronto');
});

test('un pronto vale 45 secondi, un overlay vecchio senza nome vale come prima', () => {
  const e = motore();
  e.segnaPronto('andry', true, 0, '');
  assert.equal(e.prontoColpi('andry', 44_999), true);
  assert.equal(e.prontoColpi('andry', 45_000), false, 'scaduto');
  e.segnaPronto('andry', true, 50_000);
  assert.equal(e.prontoColpi('andry', 50_001), true, 'senza nome: l\'istanza «»');
});

test('senza nessun overlay collegato non e\' pronto nessuno, e le istanze hanno un tetto', () => {
  const e = motore();
  e.segnaPronto('andry', true, 0, 'a');
  e._clients = new Map();
  assert.equal(e.prontoColpi('andry', 1), false, 'collegato e pronto, tutte e due');
  for (let i = 0; i < 100; i++) e.segnaPronto('altro', true, 10, 'x' + i);
  assert.ok(e._pronti.get('altro').size <= 20);
});
