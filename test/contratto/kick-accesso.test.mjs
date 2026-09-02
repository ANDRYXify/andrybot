// ENTRARE CON KICK: il giro completo, su un'app Express vera.
//
// Chi trasmette solo su Kick non ha un account Twitch da usare, e chiedergliene
// uno per usare il bot sarebbe chiedergli di iscriversi a un servizio che non gli
// serve. La stessa autorizzazione dice chi è e dà al bot il permesso di parlare.
//
// Qui non si finge il giro: si monta la rotta vera, si segue il redirect verso
// Kick, si torna col codice e si guarda cosa succede. L'unica cosa sostituita è
// Kick stesso — che non si può chiamare da un collaudo.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieSession from 'cookie-session';
import { cartellaUsaEGetta } from '../aiuto.mjs';

process.env.KICK_CLIENT_ID = 'app-di-prova';
process.env.KICK_CLIENT_SECRET = 'segreto-di-prova';
process.env.KICK_REDIRECT_URI = 'https://esempio.test/auth/kick/callback';

const usaEGetta = cartellaUsaEGetta('andrybot-kick-');
const { montaKick } = await import('../../src/kick/rotte.js');

// Kick sostituito: il token e le chiamate all'API rispondono qui.
const veroFetch = globalThis.fetch;
globalThis.fetch = async (url, opt) => {
  const u = String(url);
  if (u.includes('id.kick.com/oauth/token')) {
    return new Response(JSON.stringify({ access_token: 'tok-abc', refresh_token: 'ref-abc', expires_in: 3600, scope: 'user:read chat:write' }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (u.includes('/public/v1/users')) {
    return new Response(JSON.stringify({ data: [{ user_id: 998877, name: 'PippoSuKick' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (u.includes('/events/subscriptions')) {
    return new Response(JSON.stringify({ data: [{ name: 'chat.message.sent', subscription_id: 's1' }] }),
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
  app.use(express.json());
  montaKick(app, {
    requireLogin: (req, res, next) => next(),
    currentUser: (req) => req.session?.user || null,
    wrap: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
    suMessaggio: () => {},
    suEvento: () => {},
    async registra(req, dati) {
      registrati.push(dati);
      req.session.user = { login: 'kick.pipposukick', display: dati.nome };
      return { login: 'kick.pipposukick', dove: '/?benvenuto=1' };
    },
  });
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  return { base: 'http://127.0.0.1:' + srv.address().port, chiudi: () => new Promise((r) => srv.close(r)) };
}

// I biscotti come li rimanda un browser: cookie-session ne mette due (il valore
// e la firma), e con uno solo la sessione non vale.
const biscotti = (r) => (r.headers.getSetCookie?.() || [])
  .map((c) => c.split(';')[0]).join('; ');

// Segue il giro tenendosi il cookie, come farebbe un browser.
async function giro(base, { manomettiState = false } = {}) {
  const r1 = await fetch(base + '/accedi/kick', { redirect: 'manual' });
  const cookie = biscotti(r1);
  const dove = new URL(r1.headers.get('location'));
  const state = manomettiState ? 'altro-state' : dove.searchParams.get('state');
  const r2 = await fetch(`${base}/auth/kick/callback?code=abc&state=${encodeURIComponent(state)}`,
    { redirect: 'manual', headers: { cookie } });
  return { partenza: r1, dove, arrivo: r2 };
}

test('si parte verso Kick con PKCE e uno state', async () => {
  const s = await servi();
  try {
    const { partenza, dove } = await giro(s.base);
    assert.equal(partenza.status, 302);
    assert.equal(dove.origin + dove.pathname, 'https://id.kick.com/oauth/authorize');
    assert.equal(dove.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(dove.searchParams.get('code_challenge')?.length > 20, 'c’è un challenge');
    assert.ok(dove.searchParams.get('state')?.length >= 16, 'c’è uno state');
    assert.match(dove.searchParams.get('scope') || '', /user:read/);
    assert.match(dove.searchParams.get('scope') || '', /chat:write/);
    assert.match(dove.searchParams.get('scope') || '', /events:subscribe/);
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
    assert.equal(registrati[0].userId, '998877');
    assert.equal(registrati[0].nome, 'PippoSuKick');
    assert.equal(registrati[0].token.accessToken, 'tok-abc');
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

test('un ritorno senza un giro in corso non entra', async () => {
  const s = await servi();
  try {
    const r = await fetch(s.base + '/auth/kick/callback?code=abc&state=xyz', { redirect: 'manual' });
    assert.equal(r.status, 302);
    assert.match(r.headers.get('location'), /kick=/);
    assert.equal(registrati.length, 0);
  } finally { await s.chiudi(); }
});

test('il giro è usa-e-getta: lo stesso codice non entra due volte', async () => {
  const s = await servi();
  try {
    const r1 = await fetch(s.base + '/accedi/kick', { redirect: 'manual' });
    const cookie1 = biscotti(r1);
    const state = new URL(r1.headers.get('location')).searchParams.get('state');
    const via = `${s.base}/auth/kick/callback?code=abc&state=${state}`;
    const a = await fetch(via, { redirect: 'manual', headers: { cookie: cookie1 } });
    assert.equal(a.headers.get('location'), '/?benvenuto=1');
    // il cookie aggiornato dalla prima chiamata non ha più il giro
    const cookie2 = biscotti(a) || cookie1;
    const b = await fetch(via, { redirect: 'manual', headers: { cookie: cookie2 } });
    assert.match(b.headers.get('location'), /kick=|accesso=/);
    assert.equal(registrati.length, 1, 'una registrazione sola');
  } finally { await s.chiudi(); }
});

test('chi è già dentro non passa dalla porta della registrazione', async () => {
  const app = express();
  app.use(cookieSession({ name: 'prova2', keys: ['k'] }));
  app.use((req, res, next) => { req.session.user = { login: 'tizio' }; next(); });
  montaKick(app, {
    requireLogin: (req, res, next) => next(),
    currentUser: (req) => req.session?.user || null,
    wrap: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
    suMessaggio: () => {}, suEvento: () => {}, registra: async () => ({ login: 'x' }),
  });
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  try {
    const r = await fetch('http://127.0.0.1:' + srv.address().port + '/accedi/kick', { redirect: 'manual' });
    assert.equal(r.headers.get('location'), '/', 'lo rimanda a casa: il suo canale ce l’ha già');
  } finally { await new Promise((r) => srv.close(r)); }
});

test('un evento senza firma non viene nemmeno guardato', async () => {
  const s = await servi();
  try {
    const r = await fetch(s.base + '/kick/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Kick-Event-Type': 'chat.message.sent' },
      body: JSON.stringify({ content: 'ciao' }),
    });
    assert.equal(r.status, 401);
  } finally { await s.chiudi(); }
});
