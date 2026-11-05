// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUANDO NON SI RIESCE A ENTRARE, su un'app vera (docs/ACCESSO-SICURO.md,
// passo 5). Lo stesso banco di ingresso-rotte.test.mjs, con le rotte della
// richiesta di aiuto e dell'elenco dell'amministratore:
//
//  · una richiesta non apre niente da sola, e risponde uguale per un conto che
//    c'e', per uno che non c'e' e per un doppione;
//  · sblocca solo l'amministratore, una volta, con la nota; il link vale una
//    volta, per un conto, per 24 ore, e aprirlo non lo usa;
//  · il link apre solo una sessione che deve attivare un fattore nuovo; le
//    altre sessioni si chiudono e i fattori persi si tolgono;
//  · il proprietario non vede mai password, codici o segreti, e i contatti
//    escono confrontati.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-ingresso-aiuto-');
const { default: express } = await import('express');
const { default: cookieSession } = await import('cookie-session');
const { db, ingressoDb } = await import('../../src/db.js');
const { creaIngresso, azzeraTetti, PRIMA_MS } = await import('../../src/features/ingresso.js');
const { legaLeSessioni, montaIngresso, utenteAperto } = await import('../../src/web/rotte-ingresso.js');
const { montaAiutoAccesso } = await import('../../src/web/rotte-aiuto-accesso.js');
const { streamers } = await import('../../src/db.js');
const T = await import('../../src/features/ingresso-totp.js');
const _dbAiuti = () => db.prepare('SELECT * FROM ingresso_aiuti').all();
const P = await import('../../src/features/ingresso-prova.js');
const leggi = (via) => readFileSync(new URL(`../../${via}`, import.meta.url), 'utf8');

const UA_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const UA_FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0';
let adesso = Date.now();
const mandate = [];
const posta = { attiva: () => true, indirizzoOk: (s) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s), invia: async (m) => { mandate.push(m); return { ok: true }; } };
const passkeyDi = new Map();
const identitaDi = (u) => String(u?.identita || u?.login || '').toLowerCase();
const ingresso = creaIngresso({ store: ingressoDb, identitaDi, passkeyQuante: (l) => passkeyDi.get(l) || 0, posta, ora: () => adesso });

const app = express();
app.set('trust proxy', true);
const CHIAVE_COOKIE = 'chiave-di-prova-lunga-abbastanza';
app.use(cookieSession({ name: 'andrybot', keys: [CHIAVE_COOKIE], maxAge: 30 * 86_400_000 }));
app.use(express.json());
const APERTE = ['/ingresso', '/seconda-prova', '/finto/entra', '/finto/me', '/aiuto-accesso', '/sblocca-accesso', '/api/aiuto-accesso'];
legaLeSessioni(app, { ingresso, aperto: (via) => via.startsWith('/api/ingresso/') || APERTE.some((a) => via.startsWith(a)) });
const currentUser = utenteAperto;   // la stessa del server: test 'la guardia del server e\' questa'
const requireLogin = (req, res, next) => (currentUser(req) ? next() : res.status(401).json({ errore: 'non autenticato' }));
// LE PORTE FINTE: come /auth/callback, /auth/kick, /accedi/discord e le altre, mettono la persona in sessione e basta
app.get('/finto/entra/:chi', (req, res) => { req.session.user = { login: req.params.chi, identita: req.params.chi, display: req.params.chi, role: 'proprietario' }; res.redirect('/'); });
// come /api/passkey/login/fine: la passkey e' gia' il secondo fattore
app.post('/finto/passkey/:chi', (req, res) => {
  req.session.user = { login: req.params.chi, identita: req.params.chi, display: req.params.chi, role: 'proprietario' };
  ingresso.lega(req, { via: 'passkey', prova: true });
  req.ingresso = { stato: 'aperta' };
  res.json({ ok: true });
});
app.get('/', (req, res) => res.type('html').send(currentUser(req) ? 'PANNELLO' : 'VETRINA'));
// come /api/me: una rotta APERTA a tutti che guarda chi c'e' con currentUser
app.get('/finto/me', (req, res) => res.json({ user: currentUser(req)?.login || null }));
app.get('/finto/pannello', requireLogin, (req, res) => res.json({ dentro: currentUser(req).login }));
app.post('/finto/cambia-canale', requireLogin, (req, res) => { req.session.user = { ...currentUser(req), legato: undefined, login: 'altro-canale' }; res.json({ ok: true }); });
app.get('/auth/logout', (req, res) => { ingresso.esci(req); req.session = null; res.redirect('/ingresso'); });
montaIngresso(app, {
  wrap: (fn) => (req, res, next) => fn(req, res, next).catch(next), requireLogin, currentUser, identitaDi, ingresso, store: ingressoDb,
  passkeys: { byLogin: () => [], byCredId: () => null, add: () => {}, bumpCounter: () => {} },
  webauthn: { randomChallenge: () => 'sfida', bufToB64url: (b) => Buffer.from(b).toString('base64url'), verifyAuthentication: () => ({ ok: false }), verifyRegistration: () => ({ ok: false }) },
  rp: { id: 'localhost', nome: 'SocialBot', origin: 'http://localhost' }, posta, chiaveProva: Buffer.alloc(32, 1),
  entraCome: (req, login) => { req.session.user = { login, identita: login, display: login, role: 'proprietario' }; return true; },
  paginaIngresso: new URL('../../src/web/public/ingresso.html', import.meta.url).pathname,
  paginaProva: new URL('../../src/web/public/seconda-prova.html', import.meta.url).pathname, ora: () => adesso,
});
const requireAdmin = (req, res, next) => (currentUser(req)?.login === 'admin' ? next() : res.status(403).json({ errore: 'riservato' }));
const collegati = { gino: { discord: ['gino_vero'], telegram: ['gino_tg'], instagram: [], mail: ['gino@esempio.it'] } };
const mandateAdmin = [];
const pkRimosse = [];
montaAiutoAccesso(app, {
  wrap: (fn) => (req, res, next) => fn(req, res, next).catch(next), requireAdmin, currentUser, ingresso, store: ingressoDb, posta,
  chiaveProva: Buffer.alloc(32, 1), passkeys: { byLogin: (l) => (l === 'gino' ? [{ id: 7 }] : []), remove: (l, id) => pkRimosse.push([l, id]) },
  paginaAiuto: new URL('../../src/web/public/aiuto-accesso.html', import.meta.url).pathname,
  paginaSblocco: new URL('../../src/web/public/sblocca-accesso.html', import.meta.url).pathname, baseUrl: 'https://socialbot.prova',
  entraCome: (req, login) => { req.session.user = { login, identita: login, display: login, role: 'proprietario' }; return true; },
  collegatiDi: (l) => collegati[l] || {}, contoDi: (l) => (streamers.get(l) ? { login: l, nome: l, piattaforma: 'twitch', stato: 'approved', creato: 1, fattori: ingresso.fattoriDi(l) } : null),
  avvisaAdmin: async (t) => { mandateAdmin.push(t); }, mailDelConto: (l) => (l === 'gino' ? 'gino@esempio.it' : ''), ora: () => adesso,
});
const server = await new Promise((ok) => { const s = app.listen(0, '127.0.0.1', () => ok(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => { server.close(); usaEGetta.pulisci(); });

// Un browser: il suo nome, la sua rete, il suo barattolo di cookie.
function browser(ua = UA_CHROME, ip = '93.41.207.12') {
  const b = { ua, ip, cookie: new Map() };
  b.chiama = async (via, { metodo = 'GET', corpo, html = false } = {}) => {
    const headers = { 'user-agent': b.ua, 'x-forwarded-for': b.ip, accept: html ? 'text/html' : 'application/json' };
    if (b.cookie.size) headers.cookie = [...b.cookie].map(([k, v]) => `${k}=${v}`).join('; ');
    if (corpo) headers['content-type'] = 'application/json';
    const r = await fetch(base + via, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined, redirect: 'manual' });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); b.cookie.set(kv.slice(0, i), kv.slice(i + 1)); }
    const testo = await r.text();
    let dati = null; try { dati = JSON.parse(testo); } catch { /* html */ }
    return { stato: r.status, dove: r.headers.get('location') || '', testo, dati };
  };
  // un cookie di prima di questa versione, firmato come lo firmava il server: la persona e niente legame
  b.cookieDiPrima = (chi) => {
    const v = Buffer.from(JSON.stringify({ user: { login: chi, identita: chi, display: chi, role: 'proprietario' } })).toString('base64');
    const firma = crypto.createHmac('sha1', CHIAVE_COOKIE).update('andrybot=' + v).digest('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '');
    b.cookie.set('andrybot', v); b.cookie.set('andrybot.sig', firma);
  };
  b.copia = (ua2 = b.ua, ip2 = b.ip) => { const c = browser(ua2, ip2); c.cookie = new Map(b.cookie); return c; };
  return b;
}
// entra da una porta e attiva l'app dei codici: torna il browser dentro e il segreto
async function dentroConApp(chi, b = browser()) {
  await b.chiama(`/finto/entra/${chi}`);
  const { dati } = await b.chiama('/api/ingresso/attiva/totp/inizio', { metodo: 'POST', corpo: {} });
  const r = await b.chiama('/api/ingresso/attiva/totp/verifica', { metodo: 'POST', corpo: { codice: T.codiceAlPasso(dati.segreto, T.passoDi(adesso)) } });
  assert.equal(r.stato, 200, r.testo);
  return { b, segreto: dati.segreto, riserve: r.dati.riserve };
}

async function provaDi(b, scopo = 'aiuto') {
  const { dati } = await b.chiama('/api/ingresso/sfida', { metodo: 'POST', corpo: { scopo, segni: {} } });
  return { sfida: dati.sfida, numero: P.risolvi(dati.sfida, dati.bit) };
}
let rete = 1;
const chiedi = async (corpo) => { const b = browser(UA_CHROME, `55.${rete++}.1.1`); return b.chiama('/api/aiuto-accesso', { metodo: 'POST', corpo: { ...corpo, ...(await provaDi(b)) } }); };
async function admin() { const { b } = await dentroConApp('admin'); return b; }
let ADMIN = null;
let GINO = '';

test('una richiesta non apre niente, e risponde uguale per un conto che c\'e\', per uno che non c\'e\' e per un doppione', async () => {
  azzeraTetti();
  streamers.upsertApproved('gino', 'Gino');
  const senza = await browser().chiama('/api/aiuto-accesso', { metodo: 'POST', corpo: { conto: 'gino', contatti: { discord: 'gino_vero' } } });
  assert.equal(senza.dati.codice, 'prova', 'senza la prova di lavoro, niente');
  const c = await chiedi({ conto: 'Gino', problema: 'fattore', riga: 'ho perso il telefono', contatti: { discord: '@Gino_Vero', telegram: 'altro_tg', mail: 'altra.posta@esempio.it' } });
  const n = await chiedi({ conto: 'nessuno_qui', problema: 'fattore', contatti: { discord: 'chiunque' } });
  const d = await chiedi({ conto: 'gino', problema: 'altro', contatti: { instagram: 'gino.ig' } });
  for (const r of [c, n, d]) {
    assert.equal(r.stato, 200, r.testo);
    assert.deepEqual(Object.keys(r.dati).sort(), ['ok', 'pratica']);
    assert.match(r.dati.pratica, /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  }
  const righe = _dbAiuti();
  assert.equal(righe.find((x) => x.pratica === c.dati.pratica).login, 'gino');
  assert.equal(righe.find((x) => x.pratica === n.dati.pratica).login, '', 'un conto che non c\'e\' si conserva senza conto');
  assert.deepEqual([righe.find((x) => x.pratica === d.dati.pratica).stato, righe.find((x) => x.pratica === d.dati.pratica).login], ['doppione', ''], 'una aperta per conto: la seconda e\' un doppione');
  assert.ok(!JSON.stringify(righe).includes('gino_vero'), 'quello che e\' scritto sta nella busta');
  assert.ok(mandateAdmin.at(-1).includes(d.dati.pratica) && !mandateAdmin.some((t) => t.includes('gino_vero')), 'il proprietario e\' avvisato col numero, senza quello che e\' scritto');
  const v = await browser().chiama('/api/aiuto-accesso/pratica?n=' + d.dati.pratica);
  assert.equal(v.dati.stato, 'aperta', 'chi ha chiesto vede «ricevuta» anche per il doppione');
  assert.equal((await browser().chiama('/finto/pannello')).stato, 401);
});

test('l\'elenco e\' dell\'amministratore, confronta i contatti e non consegna segreti', async () => {
  azzeraTetti();
  ADMIN = await admin();
  const { segreto, riserve } = await dentroConApp('gino');
  GINO = segreto;
  assert.equal((await browser().chiama('/api/admin/aiuti')).stato, 403, 'senza amministratore: no');
  const l = await ADMIN.chiama('/api/admin/aiuti');
  assert.equal(l.stato, 200, l.testo);
  const a = l.dati.aiuti.find((x) => x.conto?.login === 'gino' && x.stato === 'aperta');
  assert.equal(a.contatti.discord.esito, 'combacia', '«@Gino_Vero» e «gino_vero» sono lo stesso nome');
  assert.equal(a.contatti.telegram.esito, 'non combacia');
  assert.equal(a.contatti.mail.esito, 'non combacia', 'la mail scritta non e\' quella del conto');
  assert.deepEqual(a.contatti.mail.collegati, ['gi***@esempio.it'], 'e quella del conto esce nascosta');
  for (const x of [segreto, ...riserve, 'gino@esempio.it', 'enc:2:', 'scrypt:']) assert.ok(!l.testo.includes(x), `l'elenco non contiene ${x.slice(0, 8)}…`);
});

test('sbloccare: solo con la nota, una volta; il link vale una volta, e aprirlo non lo usa', async () => {
  azzeraTetti();
  // gino e' gia' dentro con l'app: un'altra sessione sua, aperta con l'app
  const gino = browser(UA_CHROME, '44.1.1.1');
  await gino.chiama('/finto/entra/gino');
  adesso += 30_000;
  assert.equal((await gino.chiama('/api/ingresso/prova/totp', { metodo: 'POST', corpo: { codice: T.codiceAlPasso(GINO, T.passoDi(adesso)) } })).stato, 200);
  const l = await ADMIN.chiama('/api/admin/aiuti');
  const a = l.dati.aiuti.find((x) => x.conto?.login === 'gino' && x.stato === 'aperta');
  assert.equal((await ADMIN.chiama(`/api/admin/aiuti/${a.id}/sblocca`, { metodo: 'POST', corpo: { nota: 'ok' } })).dati.codice, 'nota', 'senza nota no');
  assert.equal((await gino.chiama(`/api/admin/aiuti/${a.id}/sblocca`, { metodo: 'POST', corpo: { nota: 'ho scritto su discord' } })).stato, 403, 'solo l\'amministratore');
  const s = await ADMIN.chiama(`/api/admin/aiuti/${a.id}/sblocca`, { metodo: 'POST', corpo: { nota: 'scritto su Discord a gino_vero, ha risposto', persi: ['totp', 'passkey'] } });
  assert.equal(s.stato, 200, s.testo);
  assert.equal((await ADMIN.chiama(`/api/admin/aiuti/${a.id}/sblocca`, { metodo: 'POST', corpo: { nota: 'scritto su Discord a gino_vero, ha risposto' } })).stato, 409, 'una volta sola');
  const t = new URL(s.dati.link).searchParams.get('t');
  assert.ok(!JSON.stringify(_dbAiuti()).includes(t), 'il link non si conserva: solo la sua impronta');
  assert.equal((await gino.chiama('/finto/pannello')).stato, 401, 'le altre sessioni del conto si chiudono');
  assert.equal(ingresso.fattoriDi('gino').totp, false, 'l\'app segnata persa si toglie');
  assert.deepEqual(pkRimosse, [['gino', 7]], 'e le passkey');
  assert.match(mandate.at(-1).oggetto, /sbloccato/, 'parte la mail al conto');
  const p = browser(UA_CHROME, '44.2.1.1');
  assert.equal((await p.chiama('/sblocca-accesso?t=' + t, { html: true })).stato, 200);
  const u = await p.chiama('/api/aiuto-accesso/usa', { metodo: 'POST', corpo: { t } });
  assert.equal(u.dati.vai, '/seconda-prova', 'aprire la pagina non l\'aveva usato: lo usa il tocco');
  assert.equal((await p.chiama('/finto/pannello')).stato, 401, 'il link da solo non apre il pannello');
  const pr = await p.chiama('/api/ingresso/prova');
  assert.equal(pr.dati.modo, 'attiva', 'si attiva un fattore nuovo');
  assert.equal((await p.chiama('/api/ingresso/prova/riserva', { metodo: 'POST', corpo: { codice: 'XXXX-XXXX' } })).stato, 400);
  const { dati } = await p.chiama('/api/ingresso/attiva/totp/inizio', { metodo: 'POST', corpo: {} });
  assert.equal((await p.chiama('/api/ingresso/attiva/totp/verifica', { metodo: 'POST', corpo: { codice: T.codiceAlPasso(dati.segreto, T.passoDi(adesso)) } })).stato, 200);
  assert.equal((await p.chiama('/finto/pannello')).dati.dentro, 'gino');
  assert.equal((await browser().chiama('/api/aiuto-accesso/usa', { metodo: 'POST', corpo: { t } })).dati.codice, 'link', 'il link vale una volta');
  const eventi = ingressoDb.registro('gino').map((x) => x.evento);
  assert.ok(eventi.includes('aiuto') && eventi.filter((x) => x === 'sblocco').length === 2, 'nel registro: la richiesta, lo sblocco e il link usato');
  assert.equal((await browser().chiama('/api/aiuto-accesso/pratica?n=' + a.pratica)).dati.stato, 'sbloccata');
});

test('il link scade in 24 ore, e una richiesta rifiutata lo dice a chi ha chiesto', async () => {
  azzeraTetti();
  streamers.upsertApproved('lia2', 'Lia2');
  const c = await chiedi({ conto: 'lia2', contatti: { telegram: 'lia_tg' } });
  const a = (await ADMIN.chiama('/api/admin/aiuti')).dati.aiuti.find((x) => x.pratica === c.dati.pratica);
  const s = await ADMIN.chiama(`/api/admin/aiuti/${a.id}/sblocca`, { metodo: 'POST', corpo: { nota: 'scritto su Telegram, confermato' } });
  const t = new URL(s.dati.link).searchParams.get('t');
  const prima = adesso;
  adesso += 24 * 3_600_000 + 1;
  assert.equal((await browser().chiama('/api/aiuto-accesso/usa', { metodo: 'POST', corpo: { t } })).dati.codice, 'link', 'dopo 24 ore non vale');
  adesso = prima;
  const r = await chiedi({ conto: 'nessuno', contatti: { mail: 'chi@esempio.it' } });
  const b = (await ADMIN.chiama('/api/admin/aiuti')).dati.aiuti.find((x) => x.pratica === r.dati.pratica);
  assert.equal((await ADMIN.chiama(`/api/admin/aiuti/${b.id}/sblocca`, { metodo: 'POST', corpo: { nota: 'non c\'e\' un conto da sbloccare' } })).stato, 409, 'senza conto non si sblocca');
  assert.equal((await ADMIN.chiama(`/api/admin/aiuti/${b.id}/rifiuta`, { metodo: 'POST', corpo: { risposta: 'Con questo nome non troviamo un canale.' } })).stato, 200);
  const v = await browser().chiama('/api/aiuto-accesso/pratica?n=' + r.dati.pratica);
  assert.deepEqual(v.dati, { stato: 'rifiutata', risposta: 'Con questo nome non troviamo un canale.' });
});

test('col link, anche chi ha ancora i suoi fattori ne attiva uno nuovo prima del pannello', async () => {
  azzeraTetti();
  streamers.upsertApproved('remo', 'Remo');
  await dentroConApp('remo');
  const c = await chiedi({ conto: 'remo', contatti: { discord: 'remo_dc' } });
  const a = (await ADMIN.chiama('/api/admin/aiuti')).dati.aiuti.find((x) => x.pratica === c.dati.pratica);
  const s = await ADMIN.chiama(`/api/admin/aiuti/${a.id}/sblocca`, { metodo: 'POST', corpo: { nota: 'verificato a voce su Discord', persi: [] } });
  assert.equal(ingresso.fattoriDi('remo').totp, true, 'non segnata persa, l\'app resta');
  const p = browser(UA_CHROME, '44.9.1.1');
  await p.chiama('/api/aiuto-accesso/usa', { metodo: 'POST', corpo: { t: new URL(s.dati.link).searchParams.get('t') } });
  const pr = await p.chiama('/api/ingresso/prova');
  assert.deepEqual([pr.dati.modo, pr.dati.fattori.totp], ['attiva', false], 'il link non vale come prima prova per un fattore vecchio: se ne attiva uno nuovo');
});
