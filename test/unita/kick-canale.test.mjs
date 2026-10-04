// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA LETTURA DEL CANALE KICK (kick/api.js, daCanale e statoCanale): quello che
// il giro di Kick sa della diretta, nella forma della risposta di GET /channels
// (docs.kick.com, «Channels»). Solo quello che serve, ripulito; fuori onda
// niente spettatori e niente inizio; un canale che Kick non dice e' nessuno.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-kick-canale-');
const { tokens } = await import('../../src/db.js');
const { daCanale, statoCanale, salvaToken } = await import('../../src/kick/api.js');
process.on('exit', () => usaEGetta.pulisci());

const IN_ONDA = [{
  broadcaster_user_id: 123, slug: 'Giada_Kick', stream_title: '  Si   gioca  stasera ',
  category: { id: 15, name: 'Just Chatting', thumbnail: '' },
  stream: { is_live: true, viewer_count: 42, start_time: '2026-10-04T18:00:00Z', key: 'segreta', url: 'rtmps://x' },
}];

test('in onda: spettatori, inizio, titolo e categoria, ripuliti', () => {
  assert.deepEqual(daCanale(IN_ONDA), {
    live: true, spettatori: 42, inizio: Date.parse('2026-10-04T18:00:00Z'),
    titolo: 'Si gioca stasera', categoria: 'Just Chatting', slug: 'giada_kick',
  });
});

test('la chiave della diretta non esce mai dalla lettura', () => {
  assert.ok(!JSON.stringify(daCanale(IN_ONDA)).includes('segreta'));
});

test('fuori onda niente spettatori e niente inizio, anche se Kick li lascia scritti', () => {
  const fuori = [{ ...IN_ONDA[0], stream: { is_live: false, viewer_count: 99, start_time: '2026-10-01T18:00:00Z' } }];
  const c = daCanale(fuori);
  assert.deepEqual([c.live, c.spettatori, c.inizio], [false, null, 0]);
});

test('un numero che non e\' un numero non diventa spettatori', () => {
  const c = daCanale([{ ...IN_ONDA[0], stream: { is_live: true, viewer_count: 'tanti' } }]);
  assert.deepEqual([c.live, c.spettatori, c.inizio], [true, null, 0]);
});

test('un canale che Kick non dice e\' nessuno', () => {
  assert.equal(daCanale([]), null);
  assert.equal(daCanale(null), null);
});

test('statoCanale chiede il canale giusto, e senza un id non chiede niente', async () => {
  salvaToken('giada', { accessToken: 'tok', refreshToken: '', scopes: ['channel:read'], expiresAt: Date.now() + 3600_000 }, '123');
  let chiesto = '';
  const fetchImpl = async (url) => { chiesto = String(url); return new Response(JSON.stringify({ data: IN_ONDA }), { status: 200 }); };
  const r = await statoCanale('giada', { fetchImpl });
  assert.equal(r.ok, true); assert.equal(r.spettatori, 42);
  assert.equal(chiesto, 'https://api.kick.com/public/v1/channels?broadcaster_user_id=123');
  tokens.delete('kick', 'giada');
  salvaToken('senzaid', { accessToken: 'tok', refreshToken: '', scopes: [], expiresAt: Date.now() + 3600_000 }, '');
  let nessuno = true;
  const r2 = await statoCanale('senzaid', { fetchImpl: async () => { nessuno = false; return new Response('{}'); } });
  assert.equal(r2.ok, false); assert.ok(nessuno, 'senza l\'id del canale non si chiede a Kick un canale a caso');
});
