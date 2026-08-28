// LA FIRMA DEI WEBHOOK DI KICK. L'indirizzo è pubblico per forza — Kick deve
// poterlo raggiungere — quindi chiunque lo trovi può mandarci finti eventi:
// un finto messaggio in chat, un finto comando eseguito a nome di uno streamer.
// L'unica cosa che distingue Kick da un impostore è questa verifica.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verificaFirma, daFirmare, FINESTRA_MS, chiavePubblica, _azzeraChiave, URL_CHIAVE } from '../../src/kick/firma.js';

// una coppia di chiavi vera: così si firma davvero e si verifica davvero
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PUB = publicKey.export({ type: 'spki', format: 'pem' });
const { publicKey: altraPub } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const ALTRA = altraPub.export({ type: 'spki', format: 'pem' });

const ORA = Date.parse('2026-08-28T12:00:00Z');
const evento = (extra = {}) => ({
  id: '01J8ZQ1234567890ABCDEFGHJK',
  timestamp: '2026-08-28T12:00:00Z',
  corpo: JSON.stringify({ message_id: 'm1', content: 'ciao', sender: { username: 'tizio' } }),
  ...extra,
});

const firma = (e, chiave = privateKey) => {
  const s = crypto.createSign('RSA-SHA256');
  s.update(daFirmare(e));
  s.end();
  return s.sign(chiave).toString('base64');
};

const verifica = (e, opts = {}) =>
  verificaFirma({ chiavePubblica: PUB, ...e, firma: opts.firma ?? firma(e), ora: opts.ora ?? ORA, ...opts.sovrascrivi });

test('un evento firmato da Kick passa', () => {
  assert.deepEqual(verifica(evento()), { ok: true });
});

test('un evento NON firmato non passa', () => {
  assert.equal(verifica(evento(), { firma: '' }).ok, false);
  assert.equal(verifica(evento(), { firma: 'ciaociao' }).ok, false);
  assert.equal(verifica(evento(), { firma: Buffer.from('finta').toString('base64') }).ok, false);
});

test('firmato con un’altra chiave non passa', () => {
  const { privateKey: altraPriv } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const e = evento();
  assert.equal(verificaFirma({ chiavePubblica: PUB, ...e, firma: firma(e, altraPriv), ora: ORA }).ok, false);
});

test('se cambia anche un solo byte del corpo, non passa', () => {
  const e = evento();
  const f = firma(e);
  const manomesso = { ...e, corpo: e.corpo.replace('ciao', 'ciap') };
  assert.equal(verificaFirma({ chiavePubblica: PUB, ...manomesso, firma: f, ora: ORA }).ok, false);
});

test('il REPLAY non passa: id e timestamp fanno parte della firma', () => {
  const e = evento();
  const f = firma(e);
  // stesso corpo e stessa firma, ma spacciati per un altro evento
  const rispedito = { ...e, id: '01J8ZQ0000000000000000000X' };
  assert.equal(verificaFirma({ chiavePubblica: PUB, ...rispedito, firma: f, ora: ORA }).ok, false);
  const riorario = { ...e, timestamp: '2026-08-28T12:00:01Z' };
  assert.equal(verificaFirma({ chiavePubblica: PUB, ...riorario, firma: f, ora: ORA }).ok, false);
});

test('un evento vecchio non passa, anche se firmato bene', () => {
  const e = evento();
  const tardi = ORA + FINESTRA_MS + 1000;
  const r = verificaFirma({ chiavePubblica: PUB, ...e, firma: firma(e), ora: tardi });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /vecchio|futuro/);
});

test('un evento dentro la finestra passa, anche se l’orologio è un po’ storto', () => {
  const e = evento();
  for (const scarto of [-60_000, 0, 60_000, FINESTRA_MS - 1000]) {
    assert.equal(verificaFirma({ chiavePubblica: PUB, ...e, firma: firma(e), ora: ORA + scarto }).ok, true, `scarto ${scarto}`);
  }
});

test('senza chiave pubblica non si accetta NIENTE', () => {
  const e = evento();
  const r = verificaFirma({ chiavePubblica: null, ...e, firma: firma(e), ora: ORA });
  assert.equal(r.ok, false, 'in dubbio si rifiuta, non si passa');
});

test('header mancanti o storti: si rifiuta e si dice perché', () => {
  const e = evento();
  for (const rotto of [{ id: '' }, { timestamp: '' }, { timestamp: 'domani' }]) {
    const r = verificaFirma({ chiavePubblica: PUB, ...e, ...rotto, firma: firma(e), ora: ORA });
    assert.equal(r.ok, false, JSON.stringify(rotto));
    assert.ok(r.motivo, 'e dice il motivo');
  }
});

test('la chiave pubblica non viene mai presa da un indirizzo di fuori', () => {
  assert.ok(URL_CHIAVE.startsWith('https://api.kick.com/'), URL_CHIAVE);
});

test('la chiave si prende una volta sola e si tiene', async () => {
  _azzeraChiave();
  let chiamate = 0;
  const finto = async () => { chiamate++; return { ok: true, json: async () => ({ data: { public_key: PUB } }) }; };
  assert.equal(await chiavePubblica({ fetchImpl: finto }), PUB);
  assert.equal(await chiavePubblica({ fetchImpl: finto }), PUB);
  assert.equal(chiamate, 1, 'la seconda volta non richiama Kick');
});

test('se Kick non risponde non si finge di avere una chiave', async () => {
  _azzeraChiave();
  const rotto = async () => { throw new Error('rete giù'); };
  assert.equal(await chiavePubblica({ fetchImpl: rotto }), null);
  _azzeraChiave();
  const spazzatura = async () => ({ ok: true, json: async () => ({ data: { public_key: 'non è una chiave' } }) });
  assert.equal(await chiavePubblica({ fetchImpl: spazzatura }), null);
  _azzeraChiave(PUB);
});
