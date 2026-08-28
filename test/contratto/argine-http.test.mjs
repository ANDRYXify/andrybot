// L'ARGINE davanti a un'app Express vera: non basta che la funzione conti bene,
// deve anche montarsi nel posto giusto e rispondere come si deve.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { montaArgine } from '../../src/web/argine.js';

async function servi({ classi, chiaveDi } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  montaArgine(app, { chiaveDi: chiaveDi || ((req) => 'i:' + req.ip), classi });
  app.get('/health', (req, res) => res.json({ ok: true }));
  app.get('/api/streamer/roba', (req, res) => res.json({ ok: true }));
  app.post('/api/streamer/roba', (req, res) => res.json({ ok: true }));
  app.get('/overlay/alfa/stream', (req, res) => res.json({ ok: true }));
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = 'http://127.0.0.1:' + srv.address().port;
  return { base, chiudi: () => new Promise((r) => srv.close(r)) };
}

const stretto = {
  autenticazione: { max: 2, finestraMs: 60_000 },
  caricamento: { max: 2, finestraMs: 60_000 },
  scrittura: { max: 2, finestraMs: 60_000 },
  lettura: { max: 3, finestraMs: 60_000 },
};

test('oltre il limite arriva un 429 con Retry-After', async () => {
  const s = await servi({ classi: stretto });
  try {
    for (let i = 0; i < 3; i++) assert.equal((await fetch(s.base + '/api/streamer/roba')).status, 200, `giro ${i}`);
    const r = await fetch(s.base + '/api/streamer/roba');
    assert.equal(r.status, 429);
    const attesa = Number(r.headers.get('retry-after'));
    assert.ok(attesa >= 1 && attesa <= 60, `Retry-After sensato: ${attesa}`);
    const corpo = await r.json();
    assert.match(corpo.errore, /troppe richieste/);
  } finally { await s.chiudi(); }
});

test('leggere e scrivere hanno conti separati', async () => {
  const s = await servi({ classi: stretto });
  try {
    for (let i = 0; i < 3; i++) await fetch(s.base + '/api/streamer/roba');
    assert.equal((await fetch(s.base + '/api/streamer/roba')).status, 429, 'la lettura è finita');
    assert.equal((await fetch(s.base + '/api/streamer/roba', { method: 'POST' })).status, 200,
      'ma la scrittura ha il suo conto');
  } finally { await s.chiudi(); }
});

test('salute e flussi non si fermano mai', async () => {
  const s = await servi({ classi: stretto });
  try {
    for (let i = 0; i < 30; i++) {
      assert.equal((await fetch(s.base + '/health')).status, 200, 'il controllo di salute passa sempre');
    }
    for (let i = 0; i < 10; i++) {
      assert.equal((await fetch(s.base + '/overlay/alfa/stream')).status, 200, 'e così gli overlay');
    }
  } finally { await s.chiudi(); }
});

test('due utenti diversi non si rubano il limite a vicenda', async () => {
  let quale = 'alfa';
  const s = await servi({ classi: stretto, chiaveDi: () => 'u:' + quale });
  try {
    for (let i = 0; i < 3; i++) await fetch(s.base + '/api/streamer/roba');
    assert.equal((await fetch(s.base + '/api/streamer/roba')).status, 429);
    quale = 'beta';
    assert.equal((await fetch(s.base + '/api/streamer/roba')).status, 200, 'beta non paga per alfa');
  } finally { await s.chiudi(); }
});
