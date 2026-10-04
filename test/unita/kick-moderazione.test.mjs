// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA MODERAZIONE SU KICK (src/kick/api.js, docs/PIATTAFORME.md «La moderazione
// su Kick»), con le chiamate nella forma di docs.kick.com:
//  · togliere un messaggio: DELETE /chat/{id}; gia' sparito = fatto;
//  · pausa e bando: POST /moderation/bans, la pausa in MINUTI arrotondati in su
//    (1..10080), zero secondi = bando; il motivo al massimo 100 caratteri;
//  · togliere il bando: DELETE /moderation/bans;
//  · gli id sono interi; senza i permessi di moderazione non si chiama niente;
//  · i motivi d'errore hanno le parole di helix, cosi' chi modera non sa con chi
//    parla.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('andrybot-kick-mod-');
const K = await import('../../src/kick/api.js');
const { SCOPE, SCOPE_MOD } = await import('../../src/kick/auth.js');
process.on('exit', () => casa.pulisci());

const TOK = (scopes) => ({ accessToken: 'tok', refreshToken: '', scopes, expiresAt: Date.now() + 3_600_000 });
const conMod = (login) => K.salvaToken(login, TOK([...SCOPE, ...SCOPE_MOD]), '123');
function rete(stato = 200, corpo = { data: {} }) {
  const chiamate = [];
  const fetchImpl = async (url, o = {}) => {
    chiamate.push({ url: String(url), metodo: o.method, corpo: o.body ? JSON.parse(o.body) : null });
    return new Response(stato === 204 ? null : JSON.stringify(corpo), { status: stato });
  };
  return { chiamate, fetchImpl };
}

test('la pausa va in minuti, arrotondati in su, fra 1 e 10080; zero secondi e\' il bando', async () => {
  conMod('kick.mod1');
  const r = rete();
  assert.deepEqual(await K.pausa('kick.mod1', '456', 90, 'spam', r), { ok: true, minuti: 2 });
  await K.pausa('kick.mod1', 456, 1, '', r);
  await K.pausa('kick.mod1', 456, 99_999_999, '', r);
  await K.pausa('kick.mod1', 456, 0, 'x'.repeat(300), r);
  assert.equal(r.chiamate[0].url, 'https://api.kick.com/public/v1/moderation/bans');
  assert.equal(r.chiamate[0].metodo, 'POST');
  assert.deepEqual(r.chiamate[0].corpo, { broadcaster_user_id: 123, user_id: 456, duration: 2, reason: 'spam' });
  assert.equal(r.chiamate[1].corpo.duration, 1, 'un secondo non diventa zero');
  assert.equal(r.chiamate[2].corpo.duration, K.PAUSA_MAX_MIN);
  assert.ok(!('duration' in r.chiamate[3].corpo), 'senza durata e\' un bando');
  assert.equal(r.chiamate[3].corpo.reason.length, 100);
});

test('togliere un messaggio e il bando, con le chiamate di Kick', async () => {
  conMod('kick.mod2');
  const r = rete(204);
  assert.deepEqual(await K.cancellaMessaggio('kick.mod2', 'a1b2c3d4-0000-1111-2222-333344445555', r), { ok: true });
  assert.deepEqual([r.chiamate[0].metodo, r.chiamate[0].url], ['DELETE', 'https://api.kick.com/public/v1/chat/a1b2c3d4-0000-1111-2222-333344445555']);
  const g = rete(404, { message: 'not found' });
  assert.deepEqual(await K.cancellaMessaggio('kick.mod2', 'abc', g), { ok: true }, 'gia\' sparito: fatto');
  const s = rete(200);
  assert.deepEqual(await K.sbanna('kick.mod2', '456', s), { ok: true });
  assert.deepEqual([s.chiamate[0].metodo, s.chiamate[0].corpo], ['DELETE', { broadcaster_user_id: 123, user_id: 456 }]);
});

test('senza i permessi di moderazione non si chiama Kick, e il motivo e\' quello di helix', async () => {
  K.salvaToken('kick.senza', TOK(SCOPE), '123');
  const r = rete();
  assert.equal(K.puoModerare('kick.senza'), false);
  assert.deepEqual(await K.pausa('kick.senza', 456, 60, '', r), { ok: false, motivo: 'permesso mancante' });
  assert.deepEqual(await K.cancellaMessaggio('kick.senza', 'abc', r), { ok: false, motivo: 'permesso mancante' });
  assert.equal(r.chiamate.length, 0);
});

test('id che non sono interi non partono, e gli errori di Kick hanno le parole di helix', async () => {
  conMod('kick.mod3');
  const r = rete();
  assert.deepEqual(await K.pausa('kick.mod3', 'tizio', 60, '', r), { ok: false, motivo: 'dati mancanti' });
  assert.deepEqual(await K.cancellaMessaggio('kick.mod3', '../../users', r), { ok: false, motivo: 'dati mancanti' });
  assert.equal(r.chiamate.length, 0);
  assert.equal((await K.pausa('kick.mod3', 456, 60, '', rete(403, { message: 'no' }))).motivo, 'permesso mancante');
  assert.equal((await K.pausa('kick.mod3', 456, 60, '', rete(429, { message: 'piano' }))).motivo, 'troppe richieste');
  assert.equal((await K.pausa('kick.mod3', 456, 60, '', rete(400, { message: 'e\' un moderatore' }))).motivo, 'errore Kick');
});

test('la forma di helix: chi modera non sa con chi parla', () => {
  for (const k of ['deleteMessage', 'timeoutUser', 'unbanUser']) assert.equal(typeof K.moderatoreKick[k], 'function', k);
});
