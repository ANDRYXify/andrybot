// IL WEBHOOK DI KICK: la firma si verifica sui byte, comunque siano etichettati.
//
// Il lettore JSON globale prende una sola etichetta (`application/json`). Se il
// corpo arrivasse con un'altra, `req.rawBody` resterebbe vuoto — e la firma, che
// si calcola SUI BYTE, non tornerebbe mai più. Un difetto muto per una virgola
// in un'intestazione: il collegamento dice «collegato» e il bot tace.
//
// Qui si firma davvero (con una chiave nostra al posto di quella di Kick) e si
// bussa in tutti e due i modi.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-kickweb-');
const { montaKick } = await import('../../src/kick/rotte.js');
const { _azzeraChiave, daFirmare } = await import('../../src/kick/firma.js');
const diario = await import('../../src/kick/diario.js');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = publicKey.export({ type: 'spki', format: 'pem' });
test.after(() => usaEGetta.pulisci());

function firma({ id, timestamp, corpo }) {
  const f = crypto.createSign('RSA-SHA256');
  f.update(daFirmare({ id, timestamp, corpo }));
  f.end();
  return f.sign(privateKey).toString('base64');
}

let visti = [];
async function servi() {
  visti = [];
  _azzeraChiave(pem);
  diario._azzera();
  const app = express();
  // come nel server vero: un lettore JSON globale che tiene i byte da parte
  app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
  montaKick(app, {
    requireLogin: (req, res, next) => next(),
    currentUser: () => ({ login: 'tizio' }),
    wrap: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
    suMessaggio: (m) => { visti.push(m); },
    suEvento: () => {},
    registra: async () => ({ login: 'x' }),
  });
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  return { base: 'http://127.0.0.1:' + srv.address().port, chiudi: () => new Promise((r) => srv.close(r)) };
}

function bussa(base, { tipo = 'chat.message.sent', corpo, ct = 'application/json', rompiFirma = false, id = 'msg-1' } = {}) {
  const timestamp = new Date().toISOString();
  const testo = JSON.stringify(corpo);
  const s = rompiFirma ? 'ZmFsc28=' : firma({ id, timestamp, corpo: testo });
  return fetch(base + '/kick/webhook', {
    method: 'POST',
    headers: {
      'content-type': ct,
      'Kick-Event-Type': tipo,
      'Kick-Event-Message-Id': id,
      'Kick-Event-Message-Timestamp': timestamp,
      'Kick-Event-Signature': s,
    },
    body: testo,
  });
}

const EVENTO = {
  message_id: 'm1',
  broadcaster: { user_id: 4242, username: 'tizio' },
  sender: { user_id: 77, username: 'spettatore', identity: { badges: [] } },
  content: '!social',
};

test('un evento firmato passa, con l’etichetta di sempre', async () => {
  const s = await servi();
  try {
    const r = await bussa(s.base, { corpo: EVENTO });
    assert.equal(r.status, 200);
    assert.equal(diario.stato().arrivi, 1, 'il diario lo segna');
    assert.equal(diario.stato().rifiuti, 0);
  } finally { await s.chiudi(); }
});

test('e passa anche se Kick etichetta il corpo in un altro modo', async () => {
  const s = await servi();
  try {
    for (const ct of ['application/json; charset=utf-8', 'text/plain', 'application/x-www-form-urlencoded']) {
      const r = await bussa(s.base, { corpo: EVENTO, ct });
      assert.equal(r.status, 200, `etichetta ${ct}`);
    }
    assert.equal(diario.stato().rifiuti, 0, 'nessun rifiuto');
    assert.equal(diario.stato().arrivi, 3);
  } finally { await s.chiudi(); }
});

test('una firma sbagliata non entra, e il diario dice perché', async () => {
  const s = await servi();
  try {
    const r = await bussa(s.base, { corpo: EVENTO, rompiFirma: true });
    assert.equal(r.status, 401);
    assert.equal(diario.stato().arrivi, 0);
    assert.equal(diario.stato().rifiuti, 1);
    assert.match(diario.stato().ultimoRifiuto.motivo, /firma/i);
  } finally { await s.chiudi(); }
});

test('lo stesso evento rispedito piu tardi non passa (niente replay)', async () => {
  const s = await servi();
  try {
    const vecchio = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const testo = JSON.stringify(EVENTO);
    const r = await fetch(s.base + '/kick/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Kick-Event-Type': 'chat.message.sent',
        'Kick-Event-Message-Id': 'vecchio',
        'Kick-Event-Message-Timestamp': vecchio,
        'Kick-Event-Signature': firma({ id: 'vecchio', timestamp: vecchio, corpo: testo }),
      },
      body: testo,
    });
    assert.equal(r.status, 401);
    assert.match(diario.stato().ultimoRifiuto.motivo, /vecchio|futuro/i);
  } finally { await s.chiudi(); }
});

test('un evento di un canale che non è nostro si segna ma non entra nel bot', async () => {
  const s = await servi();
  try {
    await bussa(s.base, { corpo: EVENTO });
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(visti.length, 0, 'nessun canale nostro con quell’id');
    const d = diario.stato();
    assert.equal(d.arrivi, 1, 'ma il diario sa che Kick ha bussato');
    assert.equal(d.ultimo.tipo, 'chat.message.sent');
    assert.equal(d.ultimo.canale, '', 'e sa che non l’abbiamo saputo attribuire');
  } finally { await s.chiudi(); }
});

test('anche la risposta che non parte finisce nel diario', async () => {
  diario._azzera();
  const { voceKick } = await import('../../src/kick/voce.js');
  voceKick('nessuno').say('nessuno', 'una risposta');
  await new Promise((r) => setTimeout(r, 60));
  const d = diario.stato('nessuno');
  assert.ok(d.ultimoInvio, 'il tentativo è segnato');
  assert.equal(d.ultimoInvio.ok, false);
  assert.match(d.ultimoInvio.motivo, /collegato|token/i, `motivo: ${d.ultimoInvio.motivo}`);
});
