// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA REGISTRAZIONE CON LA MAIL, su un'app vera (docs/ACCESSO-SICURO.md, passo 4).
// Lo stesso banco di ingresso-rotte.test.mjs, con le dipendenze del conto come
// le monta il server (lo streamer vero nel database, la regola contoApribile,
// i pulitori veri delle impostazioni):
//
//  · senza la prova di lavoro non ci si registra, e non nasce niente prima
//    della conferma della mail;
//  · una password non si salva mai in chiaro, da nessuna parte;
//  · la registrazione non apre il pannello senza approvazione, ne' con la
//    mail ne' con la password;
//  · approvato, si entra con una prova e si conferma con un'altra di tipo
//    diverso; chi ha solo la mail attiva la seconda;
//  · le domande vanno nelle impostazioni che ci sono;
//  · una mail che c'e' gia' riceve una mail, e la porta risponde uguale.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-ingresso-registra-');
const { default: express } = await import('express');
const { default: cookieSession } = await import('cookie-session');
const { db, ingressoDb } = await import('../../src/db.js');
const { creaIngresso, azzeraTetti, PRIMA_MS, contoApribile, improntaMail } = await import('../../src/features/ingresso.js');
const { db: _db, streamers, schedaPulita } = await import('../../src/db.js');
const voce = await import('../../src/features/voce.js');
const { impostazioniDaDomande } = await import('../../src/features/ingresso-domande.js');
const { eMail } = await import('../../src/identita.js');
const PW = await import('../../src/features/ingresso-password.js');
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
const APERTE = ['/ingresso', '/seconda-prova', '/primo-ingresso', '/finto/entra', '/finto/me'];
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
  // come apriSessionePerLogin: un contesto solo se il conto apre il pannello (la regola di haAccesso)
  entraCome: (req, login) => { if (!contoApribile(login, streamers.get(login))) return false; req.session.user = { login, identita: login, display: login, role: 'proprietario' }; return true; },
  creaConto: () => { let l = ''; do { l = 'ml.' + crypto.randomBytes(8).toString('hex').slice(0, 10); } while (streamers.get(l)); streamers.request(l, '', ''); return l; },
  statoConto: (login) => ({ pending: 'attesa', approved: 'approvato' }[streamers.get(login)?.status] || ''),
  risposteDi: (login) => { const s = streamers.get(login); const st = s?.settings || {}; return { nome: s?.display || '', argomento: st.scheda?.faccio || '', evita: st.scheda?.evita || '', tono: st.tono || '', genere: st.genere || '', community: st.voce?.community || '', lingua: st.preferenze?.lingua || '' }; },
  salvaDomande: (login, risposte) => { const s = streamers.get(login); const r = impostazioniDaDomande(s.settings, risposte, { schedaPulita, normVoce: voce.normVoce, toni: ['scherzoso', 'amichevole', 'serio'], generi: ['neutro', 'femminile', 'maschile'], lingue: ['it', 'en', 'es'] }); streamers.setSettings(login, r.settings); if (r.display) streamers.request(login, r.display, ''); },
  abbonabile: () => true, paginaPrimo: new URL('../../src/web/public/primo-ingresso.html', import.meta.url).pathname,
  paginaIngresso: new URL('../../src/web/public/ingresso.html', import.meta.url).pathname,
  paginaProva: new URL('../../src/web/public/seconda-prova.html', import.meta.url).pathname, ora: () => adesso,
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

async function provaDi(b, scopo) {
  const { dati } = await b.chiama('/api/ingresso/sfida', { metodo: 'POST', corpo: { scopo, segni: {} } });
  return { sfida: dati.sfida, numero: P.risolvi(dati.sfida, dati.bit) };
}
const ultimoCodice = () => /(\d{3}) (\d{3})/.exec(mandate.at(-1).testo).slice(1).join('');
const PAROLA = 'una frase lunga e mia';
// registra e conferma: torna il browser e il login nato
async function registrato(mail, { password = PAROLA } = {}) {
  const b = browser(UA_CHROME, '77.1.' + Math.floor(Math.random() * 250) + '.1');
  const r = await b.chiama('/api/ingresso/registra', { metodo: 'POST', corpo: { mail, password, lingua: 'it', ...(await provaDi(b, 'registra')) } });
  assert.equal(r.stato, 200, r.testo);
  const c = await b.chiama('/api/ingresso/registra/conferma', { metodo: 'POST', corpo: { codice: ultimoCodice() } });
  assert.equal(c.dati.vai, '/primo-ingresso', c.testo);
  return { b, login: ingressoDb.perMail((await import('../../src/features/ingresso.js')).improntaMail(mail)) };
}

test('senza la prova di lavoro non ci si registra, e prima della conferma non nasce niente', async () => {
  azzeraTetti();
  const b = browser(UA_CHROME, '66.1.1.1');
  assert.equal((await b.chiama('/api/ingresso/registra', { metodo: 'POST', corpo: { mail: 'zoe@esempio.it' } })).dati.codice, 'prova');
  const quantiPrima = _db.prepare('SELECT COUNT(*) c FROM streamers').get().c;
  const r = await b.chiama('/api/ingresso/registra', { metodo: 'POST', corpo: { mail: 'zoe@esempio.it', password: PAROLA, ...(await provaDi(b, 'registra')) } });
  assert.equal(r.stato, 200);
  assert.equal(_db.prepare('SELECT COUNT(*) c FROM streamers').get().c, quantiPrima, 'nessun conto prima della conferma');
  assert.equal((await b.chiama('/api/ingresso/registra/conferma', { metodo: 'POST', corpo: { codice: ultimoCodice() === '000000' ? '000001' : '000000' } })).stato, 400);
  assert.equal((await b.chiama('/api/ingresso/registra', { metodo: 'POST', corpo: { mail: 'zoe@esempio.it', password: 'corta', ...(await provaDi(b, 'registra')) } })).dati.codice, 'misura', 'la password va da 8 a 128');
});

test('una password non si salva mai in chiaro: ne\' nell\'iscrizione, ne\' nel conto, ne\' nelle risposte', async () => {
  azzeraTetti();
  const b = browser(UA_CHROME, '66.2.1.1');
  const r = await b.chiama('/api/ingresso/registra', { metodo: 'POST', corpo: { mail: 'ada@esempio.it', password: PAROLA, ...(await provaDi(b, 'registra')) } });
  const tutto = () => JSON.stringify(_db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(({ name }) => _db.prepare(`SELECT * FROM "${name}"`).all()));
  assert.ok(!tutto().includes(PAROLA) && !tutto().includes('frase lunga'), 'nell\'iscrizione la password non c\'e\'');
  assert.ok(!tutto().includes('ada@esempio.it'), 'e nemmeno la mail in chiaro');
  const c = await b.chiama('/api/ingresso/registra/conferma', { metodo: 'POST', corpo: { codice: ultimoCodice() } });
  assert.equal(c.stato, 200);
  assert.ok(!tutto().includes(PAROLA) && !tutto().includes('frase lunga'), 'nel conto nato la password non c\'e\'');
  for (const x of [r.testo, c.testo]) assert.ok(!x.includes(PAROLA));
  const login = ingressoDb.perMail(improntaMail('ada@esempio.it'));
  const aperta = ingressoDb.fattore(login, 'password').segreto;
  assert.ok(PW.eCalco(aperta) && !aperta.includes(PAROLA), 'e aprendo la busta si trova solo il calco scrypt');
  assert.equal(_db.prepare('SELECT COUNT(*) c FROM ingresso_iscrizioni WHERE impronta=?').get(improntaMail('ada@esempio.it')).c, 0, 'l\'iscrizione confermata se ne va');
});

test('la registrazione con la mail non apre il pannello senza approvazione', async () => {
  azzeraTetti();
  const { b, login } = await registrato('bea@esempio.it');
  assert.match(login, /^ml\.[0-9a-f]{10}$/);
  assert.equal(streamers.get(login).status, 'pending');
  assert.equal((await b.chiama('/finto/pannello')).stato, 401, 'dopo la conferma: nessun pannello');
  assert.equal((await b.chiama('/finto/me')).dati.user, null);
  assert.equal((await b.chiama('/primo-ingresso', { html: true })).stato, 200, 'ma le domande si');
  const fuori = browser(UA_CHROME, '66.3.1.1');
  const p = await fuori.chiama('/api/ingresso/password', { metodo: 'POST', corpo: { mail: 'bea@esempio.it', password: PAROLA, ...(await provaDi(fuori, 'password')) } });
  assert.equal(p.dati.vai, '/primo-ingresso', 'con la password giusta: alle domande, non al pannello');
  assert.equal((await fuori.chiama('/finto/pannello')).stato, 401);
  assert.equal((await fuori.chiama('/api/ingresso/prova')).dati.stato, 'nessuno', 'e nemmeno alla seconda prova');
  await fuori.chiama('/api/ingresso/mail/codice', { metodo: 'POST', corpo: { mail: 'bea@esempio.it', ...(await provaDi(fuori, 'mail')) } });
  const m = await fuori.chiama('/api/ingresso/mail/entra', { metodo: 'POST', corpo: { mail: 'bea@esempio.it', codice: ultimoCodice() } });
  assert.equal(m.dati.vai, '/primo-ingresso', 'col codice per mail lo stesso');
  assert.equal((await fuori.chiama('/finto/pannello')).stato, 401);
});

test('le domande del primo ingresso vanno nelle impostazioni del conto', async () => {
  azzeraTetti();
  const { b, login } = await registrato('cleo@esempio.it');
  const r = await b.chiama('/api/ingresso/domande', { metodo: 'POST', corpo: { risposte: { nome: 'Cleo Gioca', argomento: 'giochi horror', tono: 'scherzoso', genere: 'femminile', community: 'la ciurma', lingua: 'en', evita: 'spoiler' } } });
  assert.equal(r.stato, 200, r.testo);
  const s = streamers.get(login);
  assert.equal(s.display, 'Cleo Gioca');
  assert.deepEqual([s.settings.tono, s.settings.genere, s.settings.preferenze.lingua, s.settings.scheda.faccio, s.settings.scheda.evita], ['scherzoso', 'femminile', 'en', 'giochi horror', 'spoiler']);
  assert.equal(voce.communityDi(s.settings), 'ciurma', 'la community si legge come la legge il bot');
  assert.equal((await b.chiama('/api/ingresso/conto')).dati.conto.stato, 'attesa');
  assert.equal((await browser().chiama('/api/ingresso/domande', { metodo: 'POST', corpo: { risposte: { tono: 'serio' } } })).stato, 401, 'solo dalla sessione del conto');
  const a = await b.chiama('/api/ingresso/abbonati', { metodo: 'POST', corpo: {} });
  assert.equal(a.dati.vai, '/?abbonati=1', 'e da li\' ci si abbona, col giro di oggi');
});

test('approvato: si entra con una prova e si conferma con un\'altra di tipo diverso', async () => {
  azzeraTetti();
  const { login } = await registrato('dora@esempio.it');
  streamers.setStatus(login, 'approved');
  const b = browser(UA_CHROME, '66.4.1.1');
  const p = await b.chiama('/api/ingresso/password', { metodo: 'POST', corpo: { mail: 'dora@esempio.it', password: PAROLA, ...(await provaDi(b, 'password')) } });
  assert.equal(p.dati.vai, '/seconda-prova');
  assert.equal((await b.chiama('/finto/pannello')).stato, 401, 'la password da sola non apre');
  const s = await b.chiama('/api/ingresso/prova');
  assert.equal(s.dati.fattori.password, false, 'la password non vale due volte');
  assert.equal(s.dati.fattori.mail, 'do***@esempio.it', 'la mail si');
  assert.equal((await b.chiama('/api/ingresso/prova/password', { metodo: 'POST', corpo: { password: PAROLA } })).stato, 400);
  await b.chiama('/api/ingresso/prova/mail/manda', { metodo: 'POST', corpo: {} });
  assert.equal((await b.chiama('/api/ingresso/prova/mail/verifica', { metodo: 'POST', corpo: { codice: ultimoCodice() } })).stato, 200);
  assert.equal((await b.chiama('/finto/pannello')).dati.dentro, login);
  const c = browser(UA_CHROME, '66.5.1.1');
  await c.chiama('/api/ingresso/mail/codice', { metodo: 'POST', corpo: { mail: 'dora@esempio.it', ...(await provaDi(c, 'mail')) } });
  assert.equal((await c.chiama('/api/ingresso/mail/entra', { metodo: 'POST', corpo: { mail: 'dora@esempio.it', codice: ultimoCodice() } })).dati.vai, '/seconda-prova');
  assert.equal((await c.chiama('/api/ingresso/prova')).dati.fattori.mail, '', 'entrato con la mail, la mail non vale due volte');
  assert.equal((await c.chiama('/api/ingresso/prova/password', { metodo: 'POST', corpo: { password: PAROLA } })).stato, 200, 'la password si');
  assert.equal((await c.chiama('/finto/pannello')).dati.dentro, login);
});

test('approvato con la sola mail: attiva la seconda prova in quel momento, e non resta fuori', async () => {
  azzeraTetti();
  const { login } = await registrato('eva@esempio.it', { password: '' });
  streamers.setStatus(login, 'approved');
  const b = browser(UA_CHROME, '66.6.1.1');
  await b.chiama('/api/ingresso/mail/codice', { metodo: 'POST', corpo: { mail: 'eva@esempio.it', ...(await provaDi(b, 'mail')) } });
  await b.chiama('/api/ingresso/mail/entra', { metodo: 'POST', corpo: { mail: 'eva@esempio.it', codice: ultimoCodice() } });
  const s = await b.chiama('/api/ingresso/prova');
  assert.deepEqual([s.dati.modo, s.dati.primo], ['attiva', 'mail']);
  assert.equal((await b.chiama('/api/ingresso/attiva/mail/manda', { metodo: 'POST', corpo: { mail: 'altra@esempio.it' } })).stato, 400, 'la mail non si riattiva come seconda');
  const { dati } = await b.chiama('/api/ingresso/attiva/totp/inizio', { metodo: 'POST', corpo: {} });
  assert.equal((await b.chiama('/api/ingresso/attiva/totp/verifica', { metodo: 'POST', corpo: { codice: T.codiceAlPasso(dati.segreto, T.passoDi(adesso)) } })).stato, 200);
  assert.equal((await b.chiama('/finto/pannello')).dati.dentro, login);
  assert.equal((await b.chiama('/api/sicurezza/fattore/mail', { metodo: 'DELETE' })).stato, 409, 'la mail di un conto nato con la mail e\' il conto');
});

test('una mail che c\'e\' gia\': la porta risponde uguale, e la mail lo dice a chi e\' di casa', async () => {
  azzeraTetti();
  await registrato('fede@esempio.it');
  const b = browser(UA_CHROME, '66.7.1.1');
  const prima = mandate.length;
  const r = await b.chiama('/api/ingresso/registra', { metodo: 'POST', corpo: { mail: 'fede@esempio.it', password: PAROLA, ...(await provaDi(b, 'registra')) } });
  assert.deepEqual([r.stato, r.dati], [200, { ok: true }]);
  await new Promise((ok) => setTimeout(ok, 20));
  assert.equal(mandate.length, prima + 1);
  assert.match(mandate.at(-1).oggetto, /Hai già un accesso/);
  assert.ok(!/\d{3} \d{3}/.test(mandate.at(-1).testo), 'e nessun codice');
  assert.equal(_db.prepare('SELECT COUNT(*) c FROM ingresso_iscrizioni WHERE impronta=?').get(improntaMail('fede@esempio.it')).c, 0, 'e nessuna iscrizione nuova');
});

test('il pass del sito madre, dallo stesso browser, approva il conto che aspetta', () => {
  const src = leggi('src/web/server.js');
  const r = src.slice(src.indexOf("app.get('/entra', wrap(async"), src.indexOf("app.get('/entra', wrap(async") + 2500);
  const i = r.indexOf('const who = await redeemPass(passRaw);'), j = r.indexOf("streamers.setStatus(contoMail, 'approved');");
  assert.ok(i > 0 && j > i, 'dopo che il pass e\' stato bruciato, e solo allora');
  assert.match(r, /streamers\.get\(contoMail\)\?\.status === 'pending'/, 'solo un conto in attesa');
  assert.match(src, /return contoApribile\(l, streamers\.get\(l\)\);/, 'e haAccesso usa la stessa regola delle prove');
});
