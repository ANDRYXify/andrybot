// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ACCESSO SICURO, su un'app vera (docs/ACCESSO-SICURO.md). La lettura e il
// legame delle sessioni (legaLeSessioni) e le rotte (montaIngresso) si montano
// su express con cookie-session, come nel server, con delle porte finte che
// fanno quello che fanno tutte le porte vere: mettono la persona in sessione e
// basta. Si chiamano via HTTP, con un barattolo di cookie per browser:
//
//  · da qualunque porta si nasce in attesa: il pannello non esiste finche' non
//    si da' il secondo fattore; la passkey basta;
//  · chi non ne ha nessuno lo attiva li', e non resta chiuso fuori; chi ne ha
//    uno non ne puo' attivare un altro da li';
//  · una sessione chiusa per anomalia non si riapre col cookie vecchio;
//  · cambiare rete non chiude, cambiare famiglia di browser si';
//  · uscire chiude la riga: una copia del cookie non vale piu';
//  · i cookie di prima valgono un po', e come un ingresso nuovo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-ingresso-rotte-');
const { default: express } = await import('express');
const { default: cookieSession } = await import('cookie-session');
const { db, ingressoDb } = await import('../../src/db.js');
const { creaIngresso, azzeraTetti, PRIMA_MS } = await import('../../src/features/ingresso.js');
const { legaLeSessioni, montaIngresso, utenteAperto } = await import('../../src/web/rotte-ingresso.js');
const T = await import('../../src/features/ingresso-totp.js');
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
const APERTE = ['/ingresso', '/seconda-prova', '/sblocca', '/finto/entra', '/finto/me'];
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
  paginaSblocca: new URL('../../src/web/public/sblocca.html', import.meta.url).pathname,
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

test('da qualunque porta si nasce in attesa: il pannello non esiste senza il secondo fattore', async () => {
  azzeraTetti();
  const b = browser();
  const e = await b.chiama('/finto/entra/anna');
  assert.equal(e.stato, 302);
  const p = await b.chiama('/finto/pannello');
  assert.equal(p.stato, 401, 'nessuna guardia apre');
  assert.equal(p.dati.vai, '/seconda-prova', 'e la risposta dice dove andare');
  assert.equal((await b.chiama('/finto/me')).dati.user, null, 'e una rotta aperta a tutti, come /api/me, non vede nessuno dentro');
  const h = await b.chiama('/', { html: true });
  assert.equal(h.dove, '/seconda-prova', 'la pagina iniziale porta alla seconda prova, non al pannello');
  const s = await b.chiama('/api/ingresso/prova');
  assert.equal(s.dati.modo, 'attiva', 'chi non ha niente lo attiva adesso');
  assert.equal(db.prepare('SELECT prova FROM ingresso_sessioni WHERE login=\'anna\'').get().prova, 0, 'la riga sul server dice «in attesa»');
});

test('chi non ha niente non resta fuori: lo attiva in quel momento, e ha i codici di riserva', async () => {
  azzeraTetti();
  const { b, riserve } = await dentroConApp('bruno');
  assert.equal(riserve.length, 10, 'i codici di riserva alla fine');
  assert.equal((await b.chiama('/finto/pannello')).dati.dentro, 'bruno');
  const fuori = browser();
  await fuori.chiama('/finto/entra/bruno');
  const s = await fuori.chiama('/api/ingresso/prova');
  assert.equal(s.dati.modo, 'verifica', 'al prossimo ingresso deve usare quello che ha');
  const attiva = await fuori.chiama('/api/ingresso/attiva/totp/inizio', { metodo: 'POST', corpo: {} });
  assert.equal(attiva.stato, 401, 'e da li\' non se ne attiva un altro: se no il secondo fattore non proverebbe niente');
  const r = await fuori.chiama('/api/ingresso/prova/riserva', { metodo: 'POST', corpo: { codice: riserve[0] } });
  assert.equal(r.stato, 200, 'un telefono perso non chiude fuori: c\'e\' il codice di riserva');
  assert.equal((await fuori.chiama('/finto/pannello')).stato, 200);
});

test('la passkey basta: la sessione nasce gia\' provata', async () => {
  const b = browser();
  const r = await b.chiama('/finto/passkey/carla', { metodo: 'POST', corpo: {} });
  assert.equal(r.stato, 200);
  assert.equal((await b.chiama('/finto/pannello')).dati.dentro, 'carla');
  const src = leggi('src/web/server.js');
  const fine = src.slice(src.indexOf("app.post('/api/passkey/login/fine'"), src.indexOf("app.post('/api/passkey/login/fine'") + 2500);
  assert.match(fine, /ingresso\.lega\(req, \{ via: 'passkey', prova: true \}\)/, 'ed e\' cosi\' anche sulla porta vera della passkey');
});

test('una sessione chiusa per anomalia non si riapre col cookie vecchio', async () => {
  azzeraTetti();
  const { b } = await dentroConApp('dario');
  const vecchio = b.copia();
  const ladro = b.copia(UA_FIREFOX, '185.220.101.4');
  const l = await ladro.chiama('/finto/pannello');
  assert.equal(l.stato, 401, 'lo stesso cookie da un\'altra famiglia di browser');
  assert.equal(l.dati.vai, '/ingresso');
  assert.equal(l.dati.errore, 'anomalia');
  const v = await vecchio.chiama('/finto/pannello');
  assert.equal(v.stato, 401, 'e il cookie di prima, dal browser giusto, non riapre niente');
  const h = await b.copia().chiama('/', { html: true });
  assert.equal(h.dove, '/ingresso', 'chi l\'aveva in mano torna alla porta');
  const st = await b.chiama('/api/ingresso/stato');
  assert.equal(st.dati.avviso, 'anomalia', 'col messaggio');
  assert.equal((await b.chiama('/api/ingresso/stato')).dati.avviso, '', 'una volta');
  const riga = db.prepare('SELECT * FROM ingresso_sessioni WHERE login=\'dario\' AND motivo=\'anomalia\'').get();
  assert.ok(riga && riga.chiusa > 0 && riga.motore === '' && riga.rete === '', 'chiusa, la riga perde famiglia e rete');
  const reg = ingressoDb.registro('dario').find((x) => x.evento === 'anomalia');
  assert.ok(reg && reg.motore === 'gecko' && reg.rete === '185.220.0.0/16', 'nel registro: quando, da che famiglia, e la rete abbreviata');
  assert.ok(!JSON.stringify(ingressoDb.registro('dario')).includes('185.220.101.4'), 'mai l\'indirizzo intero');
  await b.chiama('/finto/entra/dario');
  assert.equal((await b.chiama('/api/ingresso/prova')).dati.modo, 'verifica', 'rientrare si puo\', con la seconda prova');
});

test('cambiare rete non chiude una sessione, cambiare famiglia di browser si\'', async () => {
  azzeraTetti();
  const { b } = await dentroConApp('elena');
  b.ip = '151.20.33.7';
  assert.equal((await b.chiama('/finto/pannello')).stato, 200, 'dal Wi-Fi ai dati');
  b.ua = UA_CHROME.replace('130.0.0.0', '131.0.0.0');
  assert.equal((await b.chiama('/finto/pannello')).stato, 200, 'il browser aggiornato');
  b.ip = '2a01:4f8:c17:1234::1';
  assert.equal((await b.chiama('/finto/pannello')).stato, 200, 'e su IPv6');
  b.ua = UA_FIREFOX;
  assert.equal((await b.chiama('/finto/pannello')).stato, 401, 'un\'altra famiglia di browser col suo cookie');
});

test('cambiare canale resta la stessa sessione; entrare come un\'altra persona no', async () => {
  azzeraTetti();
  const { b } = await dentroConApp('franco');
  assert.equal((await b.chiama('/finto/cambia-canale', { metodo: 'POST', corpo: {} })).stato, 200);
  assert.equal((await b.chiama('/finto/pannello')).dati.dentro, 'altro-canale', 'la prova data resta: e\' la stessa persona');
  await b.chiama('/finto/entra/gina');
  assert.equal((await b.chiama('/finto/pannello')).stato, 401, 'un\'altra persona nello stesso browser ricomincia');
  assert.equal(db.prepare('SELECT motivo FROM ingresso_sessioni WHERE login=\'franco\'').get().motivo, 'cambio', 'e la riga di prima si chiude');
});

test('uscire chiude la riga sul server: una copia del cookie non vale piu\'', async () => {
  azzeraTetti();
  const { b } = await dentroConApp('ivo');
  const copia = b.copia();
  assert.equal((await b.chiama('/auth/logout')).dove, '/ingresso');
  assert.equal((await copia.chiama('/finto/pannello')).stato, 401);
});

test('le sessioni scadono quando lo dice la persona, e le altre si chiudono dal pannello', async () => {
  azzeraTetti();
  const { b, segreto } = await dentroConApp('luca');
  const d = await b.chiama('/api/sicurezza/durata', { metodo: 'POST', corpo: { giorni: 1 } });
  assert.equal(d.dati.durata, 1);
  assert.equal((await b.chiama('/api/sicurezza/durata', { metodo: 'POST', corpo: { giorni: 3 } })).stato, 400, 'solo le durate dell\'elenco');
  const altro = browser(UA_CHROME, '10.1.1.1');
  await altro.chiama('/finto/entra/luca');
  adesso += 30_000;
  assert.equal((await altro.chiama('/api/ingresso/prova/totp', { metodo: 'POST', corpo: { codice: T.codiceAlPasso(segreto, T.passoDi(adesso)) } })).stato, 200, 'il secondo ingresso usa l\'app');
  assert.equal((await altro.chiama('/finto/pannello')).stato, 200);
  // la seconda sessione e' nata con la durata nuova: dopo un giorno non vale piu'
  const prima = adesso;
  adesso += 86_400_000 + 1;
  assert.equal((await altro.chiama('/finto/pannello')).stato, 401, 'scaduta dopo un giorno');
  adesso = prima;
  const c = await b.chiama('/api/sicurezza/sessioni/chiudi', { metodo: 'POST', corpo: {} });
  assert.equal(c.stato, 200);
  assert.equal((await b.chiama('/finto/pannello')).stato, 200, 'questa resta');
});

test('la carta del pannello non consegna segreti, e l\'ultimo fattore non si toglie', async () => {
  azzeraTetti();
  const { b, segreto, riserve } = await dentroConApp('mara');
  const v = await b.chiama('/api/sicurezza');
  assert.equal(v.stato, 200);
  for (const x of [segreto, ...riserve]) assert.ok(!v.testo.includes(x), 'ne\' il segreto dell\'app ne\' i codici');
  assert.deepEqual(v.dati.fattori, { passkey: 0, totp: true, mail: '', password: false, riserve: 10 });
  assert.equal((await b.chiama('/api/sicurezza/fattore/totp', { metodo: 'DELETE' })).stato, 409, 'e\' l\'ultimo');
  const m = await b.chiama('/api/sicurezza/mail/manda', { metodo: 'POST', corpo: { mail: 'mara@esempio.it', lingua: 'it' } });
  assert.equal(m.stato, 200);
  const codice = /(\d{3}) (\d{3})/.exec(mandate.at(-1).testo).slice(1).join('');
  assert.ok(!m.testo.includes(codice), 'il codice non torna nella risposta');
  assert.equal((await b.chiama('/api/sicurezza/mail/conferma', { metodo: 'POST', corpo: { codice } })).dati.fattori.mail, 'ma***@esempio.it');
  assert.equal((await b.chiama('/api/sicurezza/fattore/totp', { metodo: 'DELETE' })).stato, 200, 'con la mail accanto si puo\'');
  assert.equal((await b.chiama('/api/sicurezza/fattore/mail', { metodo: 'DELETE' })).stato, 409, 'e adesso l\'ultima e\' la mail');
});

test('i cookie di prima valgono ancora un po\', e come un ingresso nuovo', async () => {
  azzeraTetti();
  const b = browser();
  b.cookieDiPrima('nina');
  const p = await b.chiama('/finto/pannello');
  assert.equal(p.stato, 401, 'si legano e chiedono il secondo fattore');
  assert.equal(p.dati.vai, '/seconda-prova');
  const c = browser();
  c.cookieDiPrima('olga');
  const prima = adesso;
  adesso = ingressoDb.avvio() + PRIMA_MS + 1;
  const q = await c.chiama('/finto/pannello');
  adesso = prima;
  assert.equal(q.stato, 401);
  assert.equal(q.dati.vai, '/ingresso', 'dopo trenta giorni un cookie senza legame non apre piu\'');
});

// la prova di lavoro, come la fa il browser
async function provaDi(b, scopo = 'mail') {
  const { dati } = await b.chiama('/api/ingresso/sfida', { metodo: 'POST', corpo: { scopo, segni: {} } });
  return { sfida: dati.sfida, numero: P.risolvi(dati.sfida, dati.bit) };
}

test('entrare con la mail: serve la prova di lavoro, una sfida vale una volta, e la porta non dice chi e\' di casa', async () => {
  azzeraTetti();
  const { b, segreto } = await dentroConApp('pia');
  await b.chiama('/api/sicurezza/mail/manda', { metodo: 'POST', corpo: { mail: 'pia@esempio.it' } });
  const cm = /(\d{3}) (\d{3})/.exec(mandate.at(-1).testo).slice(1).join('');
  assert.equal((await b.chiama('/api/sicurezza/mail/conferma', { metodo: 'POST', corpo: { codice: cm } })).stato, 200);

  const fuori = browser(UA_CHROME, '88.1.2.3');
  assert.equal((await fuori.chiama('/api/ingresso/mail/codice', { metodo: 'POST', corpo: { mail: 'pia@esempio.it' } })).dati.codice, 'prova', 'senza la prova di lavoro non parte niente');
  const p = await provaDi(fuori);
  const prima = mandate.length;
  assert.equal((await fuori.chiama('/api/ingresso/mail/codice', { metodo: 'POST', corpo: { mail: 'pia@esempio.it', ...p } })).stato, 200);
  assert.equal(mandate.length, prima + 1, 'il codice parte');
  assert.equal((await fuori.chiama('/api/ingresso/mail/codice', { metodo: 'POST', corpo: { mail: 'pia@esempio.it', ...p } })).dati.codice, 'prova', 'la stessa sfida, la seconda volta, no');
  const q = await provaDi(fuori);
  const ignoto = await fuori.chiama('/api/ingresso/mail/codice', { metodo: 'POST', corpo: { mail: 'nessuno@esempio.it', ...q } });
  assert.deepEqual([ignoto.stato, ignoto.dati], [200, { ok: true }], 'per chi non c\'e\' la stessa risposta');
  assert.equal(mandate.length, prima + 1, 'ma nessuna mail');

  const codice = /(\d{3}) (\d{3})/.exec(mandate.at(-1).testo).slice(1).join('');
  const e = await fuori.chiama('/api/ingresso/mail/entra', { metodo: 'POST', corpo: { mail: 'pia@esempio.it', codice } });
  assert.equal(e.dati.vai, '/seconda-prova', 'la mail e\' la prima prova: si e\' in attesa');
  assert.equal((await fuori.chiama('/finto/pannello')).stato, 401);
  const s = await fuori.chiama('/api/ingresso/prova');
  assert.equal(s.dati.fattori.mail, '', 'e la mail non vale come seconda prova');
  assert.equal((await fuori.chiama('/api/ingresso/prova/mail/manda', { metodo: 'POST', corpo: {} })).stato, 400);
  assert.equal((await fuori.chiama('/api/ingresso/mail/entra', { metodo: 'POST', corpo: { mail: 'pia@esempio.it', codice } })).stato, 400, 'il codice per mail vale una volta');
  adesso += 30_000;
  assert.equal((await fuori.chiama('/api/ingresso/prova/totp', { metodo: 'POST', corpo: { codice: T.codiceAlPasso(segreto, T.passoDi(adesso)) } })).stato, 200);
  assert.equal((await fuori.chiama('/finto/pannello')).dati.dentro, 'pia');
});

test('una mail per entrare e\' di una persona sola', async () => {
  azzeraTetti();
  const { b } = await dentroConApp('rino');
  const r = await b.chiama('/api/sicurezza/mail/manda', { metodo: 'POST', corpo: { mail: 'pia@esempio.it' } });
  assert.equal(r.stato, 409, 'e\' gia\' di un\'altra persona');
  assert.equal(r.dati.codice, 'presa');
});

test('la guardia del server e\' questa: currentUser viene da utenteAperto, e lo legge prima di ogni rotta', () => {
  const src = leggi('src/web/server.js');
  assert.match(src, /const currentUser = \(req\) => utenteAperto\(req\);/);
  const lega = src.indexOf('legaLeSessioni(app,'), primaRotta = src.search(/\n  app\.(get|post|put|delete|all)\(/);
  assert.ok(lega > 0 && lega < primaRotta, 'la lettura delle sessioni sta prima della prima rotta');
});

test('uscire, sulla porta vera, chiude la riga prima di buttare il cookie', () => {
  const src = leggi('src/web/server.js');
  const r = src.slice(src.indexOf("app.get('/auth/logout'"), src.indexOf("app.get('/auth/logout'") + 1200);
  const i = r.indexOf('ingresso.esci(req);'), j = r.indexOf('req.session = null;');
  assert.ok(i > 0 && j > i, 'ingresso.esci prima di req.session = null');
});

// «Sblocca», dove si apre l'app installata (docs/ACCESSO-SICURO.md, «L'app
// installata e la pagina Sblocca»). Era una rotta aperta che guardava solo «sei
// gia' dentro?», con un link a un altro sito come sola uscita: chi non aveva una
// passkey non arrivava mai alla pagina che fa attivare la seconda prova.
test('«Sblocca» manda ognuno dove lo aspettano: solo chi non e\' nessuno vede la pagina', async () => {
  azzeraTetti();
  const nessuno = await browser().chiama('/sblocca', { html: true });
  assert.equal(nessuno.stato, 200, 'chi non e\' nessuno vede la pagina');
  assert.match(nessuno.testo, /id="altro-modo" href="\/ingresso"/, 'con la porta come uscita');

  const b = browser();
  await b.chiama('/finto/entra/sblocca-attesa');
  const attesa = await b.chiama('/sblocca', { html: true });
  assert.equal(attesa.stato, 302, 'chi e\' entrato da una porta e deve ancora dare o attivare la seconda prova');
  assert.equal(attesa.dove, '/seconda-prova', 'va alla pagina che lo aspetta, non a quella della passkey');

  const p = browser();
  await p.chiama('/finto/passkey/sblocca-dentro', { metodo: 'POST', corpo: {} });
  const dentro = await p.chiama('/sblocca', { html: true });
  assert.equal(dentro.dove, '/', 'chi e\' dentro va al pannello');

  const { b: d } = await dentroConApp('sblocca-anomalia');
  await d.copia(UA_FIREFOX, '185.220.101.4').chiama('/finto/pannello');
  await d.chiama('/finto/pannello');
  const anomalia = await d.chiama('/sblocca', { html: true });
  assert.equal(anomalia.dove, '/ingresso', 'un avviso d\'anomalia da dire si dice alla porta');
  assert.equal((await d.chiama('/api/ingresso/stato')).dati.avviso, 'anomalia', 'e arrivarci non l\'ha consumato');
});

test('nella pagina «Sblocca» nessun indirizzo esce dal sito, e la rotta sta con le altre pagine d\'ingresso', () => {
  const leggi = (via) => readFileSync(new URL('../../' + via, import.meta.url), 'utf8');
  const html = leggi('src/web/public/sblocca.html');
  const corpo = html.slice(html.indexOf('<body'));
  const fuori = [...corpo.matchAll(/(?:href|src|action)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('/'));
  assert.deepEqual(fuori, [], 'ogni indirizzo del corpo comincia da questo sito');
  for (const via of ['/ingresso', '/aiuto-accesso', '/ingresso-comune.js', '/sblocca.js']) assert.ok(corpo.includes(`"${via}"`), `${via} c'e'`);
  const js = leggi('src/web/public/sblocca.js');
  assert.doesNotMatch(js, /https?:\/\//, 'nemmeno lo script porta fuori');
  assert.match(js, /if \(inApp && passkeyQui\(\)\)/, 'la richiesta parte da sola solo dove una passkey e\' gia\' stata usata');
  assert.doesNotMatch(js, /navigator\.credentials/, 'la passkey si scrive una volta sola, in ingresso-comune.js');
  const server = leggi('src/web/server.js');
  assert.doesNotMatch(server, /app\.get\('\/sblocca'/, 'il server non la serve piu\' per conto suo');
  assert.match(server, /guscio\.pagina\('sblocca\.html', '\/sblocca'\)/, 'la dichiara col suo indirizzo');
  assert.match(server, /paginaSblocca: SBLOCCA_HTML/, 'e la da\' alle rotte dell\'accesso');
  for (const codice of ['sessione', 'ignota', 'passkey', 'conto']) assert.match(server, new RegExp(`codice: '${codice}'`), `il no della passkey dice «${codice}»`);
  assert.equal(JSON.parse(leggi('src/web/public/manifest.webmanifest')).start_url, '/sblocca', 'ed e\' li\' che si apre l\'app installata');
});
