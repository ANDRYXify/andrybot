// COLLEGARE INSTAGRAM CON UN TASTO: le parti che si provano senza Instagram.
//
// La firma di Meta, il codice della cancellazione, il giro del codice con le
// risposte vere della documentazione (anche quella dentro `data: [...]`), e i
// due identificativi che non si devono scambiare. Il ragionamento sta in
// docs/INSTAGRAM.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cartellaUsaEGetta } from '../aiuto.mjs';
import {
  urlAutorizzazione, leggiRichiestaFirmata, codiceCancellazione, codiceNostro,
  daAllungare, scambiaCodice, PERMESSI,
} from '../../src/features/instagram-accesso.js';
import { classifica, ricorda, problema, fresco } from '../../src/features/instagram.js';

const SEGRETO = 'segreto-di-prova';
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const firmata = (dati, segreto = SEGRETO) => {
  const corpo = b64url(JSON.stringify(dati));
  return b64url(crypto.createHmac('sha256', segreto).update(corpo).digest()) + '.' + corpo;
};

test('il tasto porta a Instagram con i due permessi e lo stato', () => {
  const u = new URL(urlAutorizzazione({ appId: '123', redirectUri: 'https://socialbot.live/auth/instagram/callback', state: 'abc' }));
  assert.equal(u.origin + u.pathname, 'https://www.instagram.com/oauth/authorize');
  assert.equal(u.searchParams.get('client_id'), '123');
  assert.equal(u.searchParams.get('redirect_uri'), 'https://socialbot.live/auth/instagram/callback');
  assert.equal(u.searchParams.get('response_type'), 'code');
  assert.equal(u.searchParams.get('state'), 'abc');
  assert.equal(u.searchParams.get('force_reauth'), 'true', 'Instagram chiede con che account entrare, anche se il browser e\' dentro con un altro');
  assert.deepEqual(u.searchParams.get('scope').split(','), PERMESSI);
  assert.deepEqual(PERMESSI, ['instagram_business_basic', 'instagram_business_content_publish'],
    'leggere i post e pubblicare la storia: niente messaggi, niente commenti');
});

test('una richiesta firmata da Meta si legge, una qualunque no', () => {
  const buona = firmata({ algorithm: 'HMAC-SHA256', issued_at: 1, user_id: '1020' });
  assert.equal(leggiRichiestaFirmata(buona, SEGRETO)?.user_id, '1020');
  assert.equal(leggiRichiestaFirmata(buona, 'altro-segreto'), null, 'firmata con un\'altra chiave');
  const [firma] = buona.split('.');
  const altriDati = b64url(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '9999' }));
  assert.equal(leggiRichiestaFirmata(firma + '.' + altriDati, SEGRETO), null, 'la firma di una richiesta sui dati di un\'altra');
  assert.equal(leggiRichiestaFirmata(firmata({ algorithm: 'NIENTE', user_id: '1' }), SEGRETO), null, 'l\'algoritmo deve essere quello');
  assert.equal(leggiRichiestaFirmata(firmata({ algorithm: 'HMAC-SHA256' }), SEGRETO), null, 'senza utente non c\'e\' niente da fare');
  assert.equal(leggiRichiestaFirmata(buona + '.x', SEGRETO), null);
  assert.equal(leggiRichiestaFirmata('', SEGRETO), null);
  assert.equal(leggiRichiestaFirmata(buona, ''), null, 'senza chiave dell\'app non si fida di nessuno');
});

test('il codice della cancellazione si riconosce dalla sua firma', () => {
  const c = codiceCancellazione('chiave');
  assert.match(c, /^[a-f0-9]{32}$/);
  assert.equal(codiceNostro(c, 'chiave'), true);
  assert.equal(codiceNostro(c, 'altra'), false, 'con un\'altra chiave non e\' nostro');
  const storto = c.slice(0, 31) + (c[31] === 'a' ? 'b' : 'a');
  assert.equal(codiceNostro(storto, 'chiave'), false, 'un codice inventato non diventa «fatto»');
  assert.equal(codiceNostro('<script>', 'chiave'), false);
  assert.notEqual(codiceCancellazione('chiave'), c, 'ogni richiesta ha il suo');
});

test('il token si allunga quando mancano meno di trenta giorni, e mai da scaduto', () => {
  const g = 86400_000, ora = 1_000_000_000_000;
  assert.equal(daAllungare(ora + 59 * g, ora), false);
  assert.equal(daAllungare(ora + 31 * g, ora), false);
  assert.equal(daAllungare(ora + 29 * g, ora), true);
  assert.equal(daAllungare(ora + 1, ora), true);
  assert.equal(daAllungare(ora, ora), false, 'scaduto: si ricollega');
  assert.equal(daAllungare(0, ora), false);
});

// Instagram finto, con le risposte come le scrive la documentazione.
function instagramFinto({ meFallisce = false, meInData = false } = {}) {
  const chiamate = [];
  const vero = globalThis.fetch;
  globalThis.fetch = async (url, op = {}) => {
    const u = String(url);
    chiamate.push(u);
    const r = (dati, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => dati });
    if (u === 'https://api.instagram.com/oauth/access_token') {
      assert.equal(String(op.body.get('grant_type')), 'authorization_code');
      assert.equal(String(op.body.get('code')), 'CODICE', 'il «#_» in fondo al codice non e\' del codice');
      return r({ data: [{ access_token: 'corto', user_id: 'ID-APP', permissions: 'instagram_business_basic,instagram_business_content_publish' }] });
    }
    if (u.startsWith('https://graph.instagram.com/access_token?')) return r({ access_token: 'lungo', token_type: 'bearer', expires_in: 5184000 });
    if (u.startsWith('https://graph.instagram.com/v26.0/me?')) {
      if (meFallisce) return r({ error: { message: 'no' } }, false);
      const io = { user_id: 'ID-ACCOUNT', username: 'andryxify' };
      return r(meInData ? { data: [io] } : io);
    }
    return r({ error: { message: 'inatteso ' + u } }, false);
  };
  return { chiamate, rimetti: () => { globalThis.fetch = vero; } };
}

test('il codice diventa un collegamento con due id: quello di app e quello dell\'account', async () => {
  const finto = instagramFinto();
  try {
    const r = await scambiaCodice({ appId: '1', segreto: 's', redirectUri: 'https://x/cb', codice: 'CODICE#_' });
    assert.equal(r.ok, true);
    assert.equal(r.token, 'lungo');
    assert.equal(r.idApp, 'ID-APP', 'e\' quello che Meta mette nelle richieste firmate');
    assert.equal(r.userId, 'ID-ACCOUNT', 'e\' quello che le chiamate vogliono nel percorso');
    assert.equal(r.username, 'andryxify');
    assert.ok(r.scade > Date.now() + 59 * 86400_000);
    assert.deepEqual(r.permessi, PERMESSI);
  } finally { finto.rimetti(); }
});

test('anche quando Instagram risponde dentro «data»', async () => {
  const finto = instagramFinto({ meInData: true });
  try {
    const r = await scambiaCodice({ appId: '1', segreto: 's', redirectUri: 'https://x/cb', codice: 'CODICE' });
    assert.equal(r.userId, 'ID-ACCOUNT');
  } finally { finto.rimetti(); }
});

test('se Instagram non dice di che account si tratta, il collegamento non si fa', async () => {
  const finto = instagramFinto({ meFallisce: true });
  try {
    const r = await scambiaCodice({ appId: '1', segreto: 's', redirectUri: 'https://x/cb', codice: 'CODICE' });
    assert.equal(r.ok, false, 'con l\'id di app al posto di quello dell\'account, la storia non partirebbe mai');
    assert.equal(r.token, undefined);
  } finally { finto.rimetti(); }
});

test('le credenziali: vince il tasto, e un token del tasto scaduto non vale', async () => {
  const usaEGetta = cartellaUsaEGetta('andrybot-instagram-');
  try {
    const { streamers, tokens } = await import('../../src/db.js');
    const { credenzialiInstagram } = await import('../../src/features/instagram-credenziali.js');
    streamers.upsertApproved('igprova', 'igprova');
    assert.equal(credenzialiInstagram('igprova'), null, 'niente di collegato');

    streamers.setSettings('igprova', { instagram: { userId: '555', token: 'amano' } });
    assert.deepEqual(credenzialiInstagram('igprova'), { userId: '555', token: 'amano', via: 'facebook' });

    tokens.save('instagram', 'igprova', { userId: 'ID-APP', accessToken: 'deltasto', expiresAt: Date.now() + 86400_000 });
    streamers.setSettings('igprova', { instagram: { userId: 'ID-ACCOUNT', username: 'x', via: 'instagram', token: '' } });
    assert.deepEqual(credenzialiInstagram('igprova'), { userId: 'ID-ACCOUNT', token: 'deltasto', via: 'instagram' },
      'l\'id che va nel percorso e\' quello dell\'account, non quello di app della cassaforte');
    assert.equal(tokens.loginPerUserId('instagram', 'ID-APP'), 'igprova', 'e con l\'id di app si ritrova chi e\'');

    assert.equal(credenzialiInstagram('igprova', Date.now() + 2 * 86400_000), null, 'scaduto: si ricollega');
  } finally { usaEGetta.pulisci(); }
});

// Una voce del .env con i puntini dell'esempio davanti al numero faceva un tasto
// che portava a «pagina non disponibile» su Instagram, senza una parola sul
// perche'. Una voce che non ha la sua forma non e' una credenziale.
test('una chiave scritta storta si riconosce, e si sa cosa ha', async () => {
  const { formaStorta } = await import('../../src/config.js');
  const ID = /^\d+$/, HEX = /^[0-9a-f]{32}$/i;
  assert.deepEqual(formaStorta('X', '1517921860019343', ID, 'cifre'), []);
  assert.deepEqual(formaStorta('X', '', ID, 'cifre'), [], 'vuota e\' mancante, non storta');
  assert.deepEqual(formaStorta('X', '…1517921860019343', ID, 'cifre'), [{ nome: 'X', tipo: 'puntini' }], 'il caso vero');
  assert.equal(formaStorta('X', '...1517921860019343', ID, 'cifre')[0].tipo, 'puntini');
  assert.equal(formaStorta('X', '<ID di Instagram>', ID, 'cifre')[0].tipo, 'segnaposto');
  assert.equal(formaStorta('X', '15179 21860019343', ID, 'cifre')[0].tipo, 'spazi');
  assert.equal(formaStorta('X', 'abc123', ID, 'cifre')[0].tipo, 'cifre');
  assert.deepEqual(formaStorta('S', '0123456789abcdef0123456789ABCDEF', HEX, 'esadecimale32'), []);
  assert.equal(formaStorta('S', '0123456789abcdef', HEX, 'esadecimale32')[0].tipo, 'esadecimale32');
});

test('con una chiave storta il tasto resta spento, e l\'elenco dice quale', () => {
  const usaEGetta = cartellaUsaEGetta('andrybot-igconf-');
  try {
    const leggi = (id, segreto) => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e',
      "const { config, configStorta } = await import('./src/config.js'); console.log(JSON.stringify({ attivo: config.instagramApp.attivo, storte: configStorta() }));"],
    { cwd: fileURLToPath(new URL('../..', import.meta.url)), encoding: 'utf8',
      env: { ...process.env, DATA_DIR: usaEGetta.dir, INSTAGRAM_APP_ID: id, INSTAGRAM_APP_SECRET: segreto } }));
    const SEGRETO = '0123456789abcdef0123456789abcdef';
    assert.deepEqual(leggi('1517921860019343', SEGRETO), { attivo: true, storte: [] });
    assert.deepEqual(leggi('…1517921860019343', SEGRETO), { attivo: false, storte: [{ nome: 'INSTAGRAM_APP_ID', tipo: 'puntini' }] });
    assert.deepEqual(leggi('1517921860019343', '…' + SEGRETO), { attivo: false, storte: [{ nome: 'INSTAGRAM_APP_SECRET', tipo: 'puntini' }] });
  } finally { usaEGetta.pulisci(); }
});

// Un collegamento puo' esserci e non funzionare: lo dice solo una chiamata vera,
// e il pannello lo deve far vedere col rimedio giusto. Quale rimedio dipende dal
// codice di Meta, non dal testo del messaggio.
test('l\'errore di Instagram si legge dal codice: collegamento, permesso, tetto', () => {
  assert.deepEqual(classifica({ errore: 'x', codice: 190 }), { tipo: 'collegamento', grave: true }, 'il token non vale piu\': si ricollega');
  assert.equal(classifica({ errore: 'x', codice: 10 }).tipo, 'permesso');
  assert.equal(classifica({ errore: 'x', codice: 200 }).tipo, 'permesso');
  assert.equal(classifica({ errore: 'x', codice: 4 }).tipo, 'tetto');
  assert.deepEqual(classifica({ errore: 'Unsupported get request', codice: 100 }), { tipo: 'altro', grave: false, testo: 'Unsupported get request' });
  assert.equal(classifica({ id: '1' }), null, 'una risposta buona non e\' un problema');
  assert.equal(classifica(null), null, 'nessun post non e\' un problema');
});

test('il problema resta finche\' una chiamata non va bene, e il tetto non si mostra', () => {
  ricorda('igregistro', { errore: 'x', codice: 190 }, 1000);
  assert.deepEqual(problema('IGRegistro'), { tipo: 'collegamento', grave: true, quando: 1000 });
  ricorda('igregistro', { errore: 'piano', codice: 4 });
  assert.equal(problema('igregistro').tipo, 'collegamento', 'il tetto passa da solo e non copre un guasto vero');
  ricorda('igregistro', { id: 'post' }, 5000);
  assert.equal(problema('igregistro'), null, 'una chiamata andata bene lo toglie');
  assert.equal(fresco('igregistro', 1000, 5500), true, 'e anche un «va bene» ha la sua ora');
  assert.equal(fresco('igregistro', 1000, 7000), false, 'passata la quale si richiede a Instagram');
  assert.equal(fresco('mai-visto', 1000, 7000), false);
});

