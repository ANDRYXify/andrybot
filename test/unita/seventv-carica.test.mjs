// Il caricamento di una NUOVA emote su 7TV.
//
// Il difetto vero: 7TV ha tolto `createEmote` da GraphQL (v3 risponde
// `Unknown field "createEmote" on type "Mutation"` e v4 non ce l'ha mai avuta),
// quindi il caricamento rispondeva con un errore di schema a ogni tentativo.
// La porta di oggi e' REST v4 multipart, con una parte `metadata` obbligatoria:
// senza, 7TV risponde 400 "missing metadata" prima ancora di guardare chi sei.
//
// Qui non si parla con 7TV: si sostituisce fetch e si guarda COSA spediamo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-7tv-');
const { seventvTokens } = await import('../../src/db.js');
const seventv = await import('../../src/features/seventv.js');

const JWT = ['a', Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'c'].join('.');
seventvTokens.set('tizio', { token: JWT, userId: '01FANHRSHR000E93E1VGQWFS53', username: 'tizio', setId: '01FANHRSHR000E93E1VGQWFS54' });

function intercetta(risposta) {
  const visto = {};
  const vero = globalThis.fetch;
  globalThis.fetch = async (url, opz) => {
    visto.url = String(url);
    visto.metodo = opz?.method;
    visto.auth = opz?.headers?.Authorization || '';
    visto.parti = {};
    for (const [k, v] of opz.body.entries()) visto.parti[k] = v;
    return risposta;
  };
  return { visto, ripristina: () => { globalThis.fetch = vero; } };
}

const rispostaOk = (corpo, stato = 200) => ({
  ok: stato >= 200 && stato < 300, status: stato,
  text: async () => JSON.stringify(corpo),
});

test('la nuova emote non passa piu\' da GraphQL', async () => {
  const { visto, ripristina } = intercetta(rispostaOk({ id: '01FCY771D800007PQ2DF3GDTN6' }));
  try { await seventv.caricaEmote('tizio', Buffer.from('xx'), 'provaemote'); } finally { ripristina(); }
  assert.equal(visto.url, 'https://7tv.io/v4/emotes');
  assert.equal(visto.metodo, 'POST');
  assert.ok(!/gql/.test(visto.url), 'GraphQL non crea piu\' emote');
});

test('spedisce metadata e file, e il token dello streamer', async () => {
  const { visto, ripristina } = intercetta(rispostaOk({ id: '01FCY771D800007PQ2DF3GDTN6' }));
  try { await seventv.caricaEmote('tizio', Buffer.from('xx'), 'prova emote', ['a', 'b']); } finally { ripristina(); }
  assert.ok('metadata' in visto.parti, 'senza la parte metadata 7TV risponde "missing metadata"');
  assert.ok('file' in visto.parti, 'manca il file');
  assert.equal(visto.auth, 'Bearer ' + JWT);
  const meta = JSON.parse(await visto.parti.metadata.text());
  assert.equal(meta.name, 'provaemote', 'gli spazi non stanno nel nome di un\'emote');
  assert.deepEqual(meta.tags, ['a', 'b']);
});

test('l\'id torna da dove 7TV lo mette, non da un solo punto', async () => {
  const ID = '01FCY771D800007PQ2DF3GDTN6';
  for (const corpo of [{ id: ID }, { data: { id: ID } }, { emote: { id: ID } }, { data: { emote: { id: ID } } }]) {
    const { ripristina } = intercetta(rispostaOk(corpo));
    let r; try { r = await seventv.caricaEmote('tizio', Buffer.from('xx'), 'prova'); } finally { ripristina(); }
    assert.deepEqual([r.ok, r.id], [true, ID], JSON.stringify(corpo));
  }
});

test('un 401 di 7TV si legge come token scaduto, non come guasto generico', async () => {
  const { ripristina } = intercetta(rispostaOk({ status: 'Unauthorized', error: 'you are not logged in' }, 401));
  let r; try { r = await seventv.caricaEmote('tizio', Buffer.from('xx'), 'prova'); } finally { ripristina(); }
  assert.equal(r.ok, false);
  assert.equal(r.scaduto, true);
  assert.match(r.motivo, /not logged in/);
});

test('senza account collegato non si tenta nemmeno', async () => {
  const r = await seventv.caricaEmote('nessuno', Buffer.from('xx'), 'prova');
  assert.equal(r.ok, false);
  assert.match(r.motivo, /collega/);
});

test.after(() => usaEGetta.pulisci());
