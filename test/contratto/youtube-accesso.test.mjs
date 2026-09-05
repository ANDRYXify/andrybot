// ENTRARE CON YOUTUBE: il giro completo, su un'app Express vera.
//
// Non si finge il giro: si monta la rotta vera, si segue il redirect verso
// Google, si torna col codice e si guarda cosa succede. L'unica cosa sostituita
// è Google — che non si può chiamare da un collaudo.
//
// Le due cose che qui si guardano più da vicino sono quelle che, se sbagliate,
// non si vedono subito: `access_type=offline` (senza cui Google non dà il
// refresh token e il collegamento muore dopo un'ora) e il fatto che un account
// Google senza canale YouTube riceva una frase sua invece di un errore generico.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieSession from 'cookie-session';
import { cartellaUsaEGetta } from '../aiuto.mjs';

process.env.YOUTUBE_CLIENT_ID = 'app-di-prova';
process.env.YOUTUBE_CLIENT_SECRET = 'segreto-di-prova';
process.env.YOUTUBE_REDIRECT_URI = 'https://esempio.test/auth/youtube/callback';

const usaEGetta = cartellaUsaEGetta('andrybot-youtube-');
const { montaYoutube } = await import('../../src/youtube/rotte.js');

let canale = { id: 'UC123', snippet: { title: 'Pippo Live', customUrl: '@pipposuyoutube' } };

const veroFetch = globalThis.fetch;
globalThis.fetch = async (url, opt) => {
  const u = String(url);
  if (u.includes('oauth2.googleapis.com/token')) {
    return new Response(JSON.stringify({ access_token: 'tok-abc', refresh_token: 'ref-abc', expires_in: 3600, scope: 'openid https://www.googleapis.com/auth/youtube.readonly' }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (u.includes('youtube/v3/channels')) {
    return new Response(JSON.stringify({ items: canale ? [canale] : [] }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return veroFetch(url, opt);          // tutto il resto (il nostro server di prova) passa
};
test.after(() => { globalThis.fetch = veroFetch; usaEGetta.pulisci(); });

let registrati = [];
async function servi() {
  registrati = [];
  const app = express();
  app.use(cookieSession({ name: 'prova', keys: ['k'], httpOnly: true }));
  montaYoutube(app, {
    requireLogin: (req, res, next) => next(),
    currentUser: (req) => req.session?.user || null,
    wrap: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
    async registra(req, dati) {
      registrati.push(dati);
      req.session.user = { login: 'yt.pipposuyoutube', display: dati.nome };
      return { login: 'yt.pipposuyoutube', dove: '/?benvenuto=1' };
    },
  });
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  return { base: 'http://127.0.0.1:' + srv.address().port, chiudi: () => new Promise((r) => srv.close(r)) };
}

const biscotti = (r) => (r.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');

async function giro(base, { manomettiState = false } = {}) {
  const r1 = await fetch(base + '/accedi/youtube', { redirect: 'manual' });
  const cookie = biscotti(r1);
  const dove = new URL(r1.headers.get('location'));
  const state = manomettiState ? 'altro-state' : dove.searchParams.get('state');
  const r2 = await fetch(`${base}/auth/youtube/callback?code=abc&state=${encodeURIComponent(state)}`,
    { redirect: 'manual', headers: { cookie } });
  return { partenza: r1, dove, arrivo: r2 };
}

test('si parte verso Google con PKCE, uno state e il permesso di rinnovare', async () => {
  const s = await servi();
  try {
    const { partenza, dove } = await giro(s.base);
    assert.equal(partenza.status, 302);
    assert.equal(dove.origin + dove.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(dove.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(dove.searchParams.get('code_challenge')?.length > 20, 'c’è un challenge');
    assert.ok(dove.searchParams.get('state')?.length >= 16, 'c’è uno state');
    // senza questi due Google non dà il refresh token, e fra un'ora si è fuori
    assert.equal(dove.searchParams.get('access_type'), 'offline');
    assert.equal(dove.searchParams.get('prompt'), 'consent');
    assert.match(dove.searchParams.get('scope') || '', /youtube\.readonly/);
    // non chiediamo di scrivere in chat: quella funzione non c'è ancora
    assert.doesNotMatch(dove.searchParams.get('scope') || '', /force-ssl/);
    // il verifier non passa MAI dalla rete
    assert.equal(dove.searchParams.get('code_verifier'), null);
  } finally { await s.chiudi(); }
});

test('al ritorno nasce il canale e si entra', async () => {
  const s = await servi();
  try {
    const { arrivo } = await giro(s.base);
    assert.equal(arrivo.status, 302);
    assert.equal(arrivo.headers.get('location'), '/?benvenuto=1');
    assert.equal(registrati.length, 1);
    assert.equal(registrati[0].canaleId, 'UC123');
    assert.equal(registrati[0].maniglia, 'pipposuyoutube', 'la chiocciola non entra nel nome');
    assert.equal(registrati[0].token.accessToken, 'tok-abc');
    assert.equal(registrati[0].token.refreshToken, 'ref-abc');
  } finally { await s.chiudi(); }
});

test('uno state che non è il nostro non entra', async () => {
  const s = await servi();
  try {
    const { arrivo } = await giro(s.base, { manomettiState: true });
    assert.equal(arrivo.status, 302);
    assert.match(arrivo.headers.get('location'), /accesso=/);
    assert.equal(registrati.length, 0, 'nessun canale creato');
  } finally { await s.chiudi(); }
});

test('il giro è usa-e-getta: lo stesso codice non entra due volte', async () => {
  const s = await servi();
  try {
    const r1 = await fetch(s.base + '/accedi/youtube', { redirect: 'manual' });
    const cookie1 = biscotti(r1);
    const state = new URL(r1.headers.get('location')).searchParams.get('state');
    const via = `${s.base}/auth/youtube/callback?code=abc&state=${state}`;
    const a = await fetch(via, { redirect: 'manual', headers: { cookie: cookie1 } });
    assert.equal(a.headers.get('location'), '/?benvenuto=1');
    const cookie2 = biscotti(a) || cookie1;
    const b = await fetch(via, { redirect: 'manual', headers: { cookie: cookie2 } });
    assert.match(b.headers.get('location'), /youtube=|accesso=/);
    assert.equal(registrati.length, 1, 'una registrazione sola');
  } finally { await s.chiudi(); }
});

test('un account Google senza canale YouTube se lo sente dire', async () => {
  const s = await servi();
  const prima = canale;
  canale = null;
  try {
    const { arrivo } = await giro(s.base);
    assert.match(decodeURIComponent(arrivo.headers.get('location')), /non ha un canale YouTube/);
    assert.equal(registrati.length, 0);
  } finally { canale = prima; await s.chiudi(); }
});

test('chi è già dentro non passa dalla porta della registrazione', async () => {
  const app = express();
  app.use(cookieSession({ name: 'prova2', keys: ['k'] }));
  app.use((req, res, next) => { req.session.user = { login: 'tizio' }; next(); });
  montaYoutube(app, {
    requireLogin: (req, res, next) => next(),
    currentUser: (req) => req.session?.user || null,
    wrap: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
    registra: async () => ({ login: 'x' }),
  });
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  try {
    const r = await fetch('http://127.0.0.1:' + srv.address().port + '/accedi/youtube', { redirect: 'manual' });
    assert.equal(r.headers.get('location'), '/', 'lo rimanda a casa: il suo canale ce l’ha già');
  } finally { await new Promise((r) => srv.close(r)); }
});
