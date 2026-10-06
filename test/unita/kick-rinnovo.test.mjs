// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL RINNOVO DEL TOKEN DI KICK NON TOGLIE PERMESSI (src/kick/api.js,
// tokenBuono). I permessi si leggono dallo `scope` della risposta: nel rinnovo
// l'OAuth lo lascia facoltativo, e quando manca vuol dire «gli stessi di prima»
// (RFC 6749, §6). Leggerlo come «nessuno» spegneva da solo, al primo rinnovo,
// la moderazione e il cambio di titolo e categoria su Kick.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('andrybot-kick-rinnovo-');
const K = await import('../../src/kick/api.js');
const { SCOPE, SCOPE_MOD } = await import('../../src/kick/auth.js');
process.on('exit', () => casa.pulisci());

const TUTTI = [...SCOPE, ...SCOPE_MOD];
const scaduto = (scopes) => ({ accessToken: 'vecchio', refreshToken: 'r1', scopes, expiresAt: Date.now() - 1000 });
const kick = (corpo) => async () => new Response(JSON.stringify(corpo), { status: 200 });

test('un rinnovo senza scope tiene i permessi di prima', async () => {
  K.salvaToken('kick.rin1', scaduto(TUTTI), '77');
  const t = await K.tokenBuono('kick.rin1', { fetchImpl: kick({ access_token: 'nuovo', refresh_token: 'r2', expires_in: 3600 }) });
  assert.equal(t.accessToken, 'nuovo');
  assert.deepEqual(K.tokenDi('kick.rin1').scopes, TUTTI);
  assert.equal(K.puoModerare('kick.rin1'), true);
  assert.equal(K.puoCambiareCanale('kick.rin1'), true);
  assert.equal(K.tokenDi('kick.rin1').userId, '77', 'e l\'id di Kick resta');
});

test('un rinnovo che dice gli scope li prende per quelli che sono', async () => {
  K.salvaToken('kick.rin2', scaduto(TUTTI), '78');
  await K.tokenBuono('kick.rin2', { fetchImpl: kick({ access_token: 'nuovo', refresh_token: 'r2', expires_in: 3600, scope: 'user:read chat:write' }) });
  assert.deepEqual(K.tokenDi('kick.rin2').scopes, ['user:read', 'chat:write']);
  assert.equal(K.puoModerare('kick.rin2'), false, 'se Kick ne da\' meno, sono meno');
});
