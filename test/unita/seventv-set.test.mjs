// LE MODIFICHE AL SET 7TV e il collegamento dell'account.
//
// Il difetto vero: la GraphQL v3 di 7TV, a una modifica che non puo' fare
// (token non riconosciuto, account senza permessi), risponde
// `{ data: { emoteSet: null } }` SENZA errori. Il bot leggeva «nessun errore»
// come «fatto»: il pannello diceva «Emote aggiunta» e su 7TV non cambiava
// niente. Ora le modifiche passano dalla v4, come le fa il sito di 7TV, e
// «fatto» e' solo quello che 7TV restituisce: il set su cui ha lavorato.
//
// E «collegato» vuol dire che 7TV ha riconosciuto il token e che quel token
// puo' cambiare il set del canale. Detto da 7TV al momento, non supposto.
//
// Qui non si parla con 7TV: si sostituisce fetch e si guarda cosa si spedisce
// e come si legge la risposta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-7tvset-');
const { seventvTokens } = await import('../../src/db.js');
const seventv = await import('../../src/features/seventv.js');

const JWT = ['a', Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'c'].join('.');
const PADRONE = '01FANHRSHR000E93E1VGQWFS53';
const SET = '01FANHRSHR000E93E1VGQWFS54';
const EMOTE = '01FCY771D800007PQ2DF3GDTN6';
const helix = { getUserByLogin: async () => ({ id: '4242' }) };

const risposta = (corpo, stato = 200) => ({
  ok: stato >= 200 && stato < 300, status: stato,
  json: async () => corpo, text: async () => JSON.stringify(corpo),
  arrayBuffer: async () => Buffer.from(JSON.stringify(corpo)),
});

// fetch finto: `gql` risponde alle chiamate GraphQL, il resto e' la lettura
// pubblica del canale su 7TV (padrone e set attivo).
function finto(gql) {
  const chiamate = [];
  const vero = globalThis.fetch;
  globalThis.fetch = async (url, opz) => {
    const u = String(url);
    if (u.includes('/gql')) {
      const corpo = JSON.parse(opz.body);
      chiamate.push({ url: u, auth: opz.headers?.Authorization || '', ...corpo });
      return gql(corpo);
    }
    return risposta({ user: { id: PADRONE, username: 'tizio' }, emote_set: { id: SET, name: 'set' } });
  };
  return { chiamate, ripristina: () => { globalThis.fetch = vero; } };
}
const conFinto = async (gql, fai) => { const f = finto(gql); try { return { r: await fai(), chiamate: f.chiamate }; } finally { f.ripristina(); } };

seventvTokens.set('tizio', { token: JWT, userId: PADRONE, username: 'tizio', setId: SET });

test('aggiungi passa dalla v4, con la forma del sito di 7TV e il token dello streamer', async () => {
  const { r, chiamate } = await conFinto(() => risposta({ data: { emoteSets: { emoteSet: { addEmote: { id: SET } } } } }),
    () => seventv.aggiungi(helix, 'tizio', EMOTE, 'ciao'));
  assert.deepEqual(r, { ok: true });
  assert.equal(chiamate.length, 1);
  assert.equal(chiamate[0].url, 'https://7tv.io/v4/gql');
  assert.equal(chiamate[0].auth, 'Bearer ' + JWT);
  assert.match(chiamate[0].query, /emoteSets \{ emoteSet\(id: \$setId\) \{ addEmote\(id: \$emote\)/);
  assert.deepEqual(chiamate[0].variables, { setId: SET, emote: { emoteId: EMOTE, alias: 'ciao' } });
});

test('senza alias si aggiunge col suo nome: l\'alias non si manda vuoto', async () => {
  const { chiamate } = await conFinto(() => risposta({ data: { emoteSets: { emoteSet: { addEmote: { id: SET } } } } }),
    () => seventv.aggiungi(helix, 'tizio', EMOTE, ''));
  assert.deepEqual(chiamate[0].variables.emote, { emoteId: EMOTE });
});

test('una risposta senza il set non e\' «fatto», anche se non porta errori', async () => {
  for (const data of [{ emoteSet: null }, { emoteSets: null }, { emoteSets: { emoteSet: { addEmote: null } } }, { emoteSets: { emoteSet: { addEmote: { id: 'ALTRO000000000000000000000' } } } }]) {
    const { r } = await conFinto(() => risposta({ data }), () => seventv.aggiungi(helix, 'tizio', EMOTE, ''));
    assert.equal(r.ok, false, JSON.stringify(data));
    assert.match(r.motivo, /non ha fatto/);
  }
});

test('togli e rinomina toccano la voce giusta: emote e nome che ha nel set', async () => {
  const tolta = await conFinto(() => risposta({ data: { emoteSets: { emoteSet: { removeEmote: { id: SET } } } } }),
    () => seventv.rimuovi(helix, 'tizio', EMOTE, 'vecchio'));
  assert.deepEqual(tolta.r, { ok: true });
  assert.match(tolta.chiamate[0].query, /removeEmote\(id: \$emote\)/);
  assert.deepEqual(tolta.chiamate[0].variables, { setId: SET, emote: { emoteId: EMOTE, alias: 'vecchio' } });

  const rin = await conFinto(() => risposta({ data: { emoteSets: { emoteSet: { updateEmoteAlias: { id: EMOTE, alias: 'nuovo' } } } } }),
    () => seventv.rinomina(helix, 'tizio', EMOTE, 'nuovo', 'vecchio'));
  assert.deepEqual(rin.r, { ok: true });
  assert.deepEqual(rin.chiamate[0].variables, { setId: SET, emote: { emoteId: EMOTE, alias: 'vecchio' }, alias: 'nuovo' });

  const storta = await conFinto(() => risposta({ data: { emoteSets: { emoteSet: { updateEmoteAlias: { id: EMOTE, alias: 'vecchio' } } } } }),
    () => seventv.rinomina(helix, 'tizio', EMOTE, 'nuovo', 'vecchio'));
  assert.equal(storta.r.ok, false, 'rinominata e\' se il nome che torna e\' quello nuovo');
});

test('un token che 7TV non accetta si dice per quello che e\': da ricollegare', async () => {
  for (const [corpo, stato] of [[{ errors: [{ message: 'you are not logged in' }] }, 200], [{ errors: [{ message: 'x' }] }, 401], [{ errors: [{ message: 'no', extensions: { code: 'LACK_OF_PERMISSION' } }] }, 200]]) {
    const { r } = await conFinto(() => risposta(corpo, stato), () => seventv.aggiungi(helix, 'tizio', EMOTE, ''));
    assert.equal(r.ok, false);
    assert.equal(r.scaduto, true, JSON.stringify(corpo));
    assert.match(r.motivo, /ricollegalo/);
  }
  const { r } = await conFinto(() => risposta({ errors: [{ message: 'emote name conflict' }] }), () => seventv.aggiungi(helix, 'tizio', EMOTE, ''));
  assert.deepEqual([r.ok, !!r.scaduto, r.motivo], [false, false, '7TV dice: emote name conflict'], 'gli altri errori si riportano come li dice 7TV');
});

const io = (me) => () => risposta({ data: { users: { me } } });

test('collegare: 7TV deve riconoscere il token, e il token deve poter cambiare il set del canale', async () => {
  seventvTokens.scollega('caio');
  const ignoto = await conFinto(io(null), () => seventv.collega(helix, 'caio', JWT));
  assert.equal(ignoto.r.ok, false);
  assert.match(ignoto.r.motivo, /non riconosce/);
  assert.match(ignoto.chiamate[0].query, /users \{ me \{ id editableEmoteSetIds/);
  assert.equal(ignoto.chiamate[0].auth, 'Bearer ' + JWT);

  const altro = await conFinto(io({ id: 'ALTRO000000000000000000000', editableEmoteSetIds: ['X'], mainConnection: { platformUsername: 'sempronio' } }),
    () => seventv.collega(helix, 'caio', JWT));
  assert.equal(altro.r.ok, false);
  assert.match(altro.r.motivo, /@sempronio, che non può cambiare/);
  assert.equal(seventv.collegato('caio'), false, 'e non resta collegato');

  const padrone = await conFinto(io({ id: PADRONE, editableEmoteSetIds: [], mainConnection: { platformUsername: 'caio' } }),
    () => seventv.collega(helix, 'caio', JWT));
  assert.deepEqual(padrone.r, { ok: true, username: 'caio' }, 'il padrone del set puo\'');
  seventvTokens.scollega('caio');

  const editor = await conFinto(io({ id: 'EDITOR00000000000000000000', editableEmoteSetIds: [SET], mainConnection: { platformUsername: 'aiuto' } }),
    () => seventv.collega(helix, 'caio', JWT));
  assert.deepEqual(editor.r, { ok: true, username: 'aiuto' }, 'e anche chi ha quel set fra i modificabili');
  assert.equal(seventv.datiCollegamento('caio').username, 'aiuto', 'si mostra chi agisce davvero');
  seventvTokens.scollega('caio');
});

test('se 7TV non risponde non si decide niente, e non si collega', async () => {
  const { r } = await conFinto(() => risposta({}, 502), () => seventv.collega(helix, 'caio', JWT));
  assert.equal(r.ok, false);
  assert.match(r.motivo, /non risponde/);
  assert.equal(seventv.collegato('caio'), false);
});

test('il token copiato dal browser si pulisce da «Bearer», virgolette e spazi', () => {
  for (const t of [JWT, ` ${JWT} `, `Bearer ${JWT}`, `authorization: Bearer ${JWT}`, `"${JWT}"`]) assert.equal(seventv.pulisciToken(t), JWT, t);
});

test.after(() => usaEGetta.pulisci());
