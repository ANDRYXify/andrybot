// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// La lingua della chat: la scelta dello streamer, poi quella del canale su
// Twitch, poi l'italiano. Una lingua che il bot non parla non vale come scelta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-linguacanale-');
const { streamers } = await import('../../src/db.js');
const { linguaChat, origineLinguaChat } = await import('../../src/features/lingua-canale.js');
test.after(() => usaEGetta.pulisci());

test('la scelta vince, poi Twitch, poi l\'italiano', () => {
  streamers.upsertApproved('lc', 'Lc', '31');
  assert.equal(linguaChat('lc'), 'it'); assert.equal(origineLinguaChat('lc'), 'base');
  streamers.setSettings('lc', { linguaTwitch: 'en' });
  assert.equal(linguaChat('LC'), 'en'); assert.equal(origineLinguaChat('lc'), 'twitch');
  streamers.setSettings('lc', { linguaTwitch: 'en', preferenze: { lingua: 'es' } });
  assert.equal(linguaChat('lc'), 'es'); assert.equal(origineLinguaChat('lc'), 'scelta');
});

test('una lingua che il bot non parla non conta, e un canale che non c\'e\' parla italiano', () => {
  streamers.upsertApproved('lc2', 'Lc2', '32');
  streamers.setSettings('lc2', { linguaTwitch: 'de', preferenze: { lingua: 'fr' } });
  assert.equal(linguaChat('lc2'), 'it');
  assert.equal(linguaChat('mai-visto'), 'it');
});
