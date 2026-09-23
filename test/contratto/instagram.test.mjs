// INSTAGRAM COL TASTO: le cose che il modulo non puo' dire da solo, perche'
// stanno nelle rotte, nel giro del bot e nel pannello.
//
// Il ragionamento sta in docs/INSTAGRAM.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const SRV = leggi('src/web/server.js');
const BOT = leggi('src/bot.js');
const rotta = (inizio, lungo = 2500) => { const i = SRV.indexOf(inizio); assert.ok(i >= 0, `manca ${inizio}`); return SRV.slice(i, i + lungo); };

test('il ritorno da Instagram vale solo per chi ha cominciato il giro, con la sua sessione', () => {
  const r = rotta("app.get('/auth/instagram/callback'");
  assert.match(r, /^app\.get\('\/auth\/instagram\/callback', requireOwner,/,
    'con lo stato soltanto, chi comincia per il suo canale e lo fa finire a un altro si collegherebbe l\'Instagram dell\'altro');
  assert.match(r, /if \(!chiave\) return res\.redirect\('\/\?instagram=fuori#notifiche'\);/,
    'chi torna da un link che non e\' partito dal tasto (quello della dashboard di Meta) lo sa, invece di un «riprova»');
  assert.match(r, /if \(!st \|\| st\.login !== login\) return/);
  assert.match(r, /igStati\.delete\(chiave\);/, 'uno stato vale una volta');
  assert.match(r, /tokens\.save\('instagram', login, \{ userId: r\.idApp, accessToken: r\.token/,
    'nella cassaforte, accanto al token, l\'id di app: e\' quello delle richieste firmate');
  assert.match(r, /instagram: \{ \.\.\.ig, userId: r\.userId, username: r\.username, via: 'instagram', token: '' \}/,
    'nelle impostazioni l\'id dell\'account, il nome, e il token a mano svuotato');
});

test('ogni esito del ritorno da Instagram ha la sua frase nel pannello', () => {
  const r = rotta("app.get('/auth/instagram/callback'");
  const esiti = [...new Set([...r.matchAll(/instagram=([a-z]+)#notifiche/g)].map((m) => m[1]))];
  assert.ok(esiti.length >= 5, `esiti trovati: ${esiti.join(', ')}`);
  const APP = leggi('src/web/public/app.js');
  const i = APP.indexOf("get('instagram')");
  const detto = APP.slice(i, APP.indexOf('}[esito];', i));
  for (const e of esiti) assert.match(detto, new RegExp(`\\n\\s+${e}: \\[L\\('`), `l'esito «${e}» arriva al pannello e nessuno lo spiega`);
});

test('le porte di Meta si aprono solo con la firma', () => {
  for (const via of ['/instagram/scollega', '/instagram/cancella']) {
    assert.match(SRV, new RegExp(`app\\.post\\('${via.replace(/\//g, '\\/')}', moduloMeta, firmaDiMeta,`), `${via} senza firma`);
  }
  const firma = SRV.slice(SRV.indexOf('const firmaDiMeta = '), SRV.indexOf('const igDiChi = '));
  assert.match(firma, /igAccesso\.leggiRichiestaFirmata\(req\.body\?\.signed_request, a\.segreto\)/);
  assert.match(firma, /if \(!p\) return res\.status\(400\)/);
  const cancella = rotta("app.post('/instagram/cancella'", 700);
  assert.match(cancella, /confirmation_code: codice/, 'Meta vuole indirizzo e codice');
  assert.match(cancella, /codiceCancellazione\(config\.sessionSecret\)/);
  assert.match(rotta("app.get('/instagram/cancellazione'", 400), /codiceNostro\(codice, config\.sessionSecret\)/,
    'la pagina dice «fatto» solo ai codici nostri');
  assert.match(leggi('src/web/guide.js'), /robots: 'noindex,nofollow'/, 'e non finisce nei motori di ricerca');
});

test('le credenziali di Instagram si leggono da un posto solo', () => {
  assert.ok(!/ig\.token|ig\?\.token/.test(BOT), 'il giro dei post nuovi chiede alle credenziali');
  assert.match(BOT, /const igCr = ig\?\.attivo \? credenzialiInstagram\(s\.login\) : null;/);
  assert.match(SRV, /const ig = credenzialiInstagram\(login\);\n\s+if \(ig\) posti\.ig =/, 'i posti della settimana');
  assert.match(SRV, /const pubblicaStoriaIg = async \(login, byte\) => \{\n\s+const ig = credenzialiInstagram\(login\);/, 'e la storia, per chiunque la pubblichi');
  assert.match(rotta("app.post('/api/streamer/settimana/manda'", 6000), /if \(dove\.ig && storia && credenzialiInstagram\(login\)\) \{/, '«Manda» compreso');
  assert.match(rotta("app.post('/api/streamer/instagram/prova'", 900), /: credenzialiInstagram\(login\);/, 'e la prova dal pannello');
});

test('dal pannello arrivano le scelte, non l\'identita\' di un account collegato col tasto', () => {
  const salva = SRV.slice(SRV.indexOf('if (b.instagram !== undefined) {'), SRV.indexOf('if (b.instagram !== undefined) {') + 1400);
  assert.match(salva, /if \(prima\.via === 'instagram'\) \{/);
  assert.match(salva, /userId: prima\.userId \|\| '', username: prima\.username \|\| '', via: 'instagram', token: ''/,
    'l\'account lo scrive solo il ritorno da Instagram');
});

test('chi fa una chiamata vera ne lascia l\'esito, e il pannello lo riceve coi permessi mancanti', () => {
  assert.match(BOT, /const p = await instagram\.ultimoPost\(igCr\);\n\s+instagram\.ricorda\(s\.login, p\);/, 'il giro dei post nuovi');
  assert.match(rotta('const pubblicaStoriaIg = async', 900), /instagram\.ricorda\(login, r\);/, 'la storia');
  assert.match(rotta("app.post('/api/streamer/settimana/manda'", 6000), /await pubblicaStoriaIg\(login, storia\)/, 'e «Manda» la pubblica da li\'');
  assert.match(rotta("app.post('/api/streamer/instagram/prova'", 900), /if \(!scritto\) instagram\.ricorda\(login,/,
    'la prova del collegamento salvato, non quella di un token appena incollato');
  const st = rotta("app.get('/api/instagram/stato'", 1400);
  assert.match(st, /mancano: t \? igAccesso\.PERMESSI\.filter\(\(x\) => !\(t\.scopes \|\| \[\]\)\.includes\(x\)\) : \[\]/);
  assert.match(st, /if \(cr && !instagram\.fresco\(login, IG_FRESCO_MS\)\) instagram\.ricorda\(login, await instagram\.ultimoPost\(cr\)\);/,
    'senza un esito fresco si chiede a Instagram adesso: il verde non viene da un silenzio');
  assert.match(st, /problema: cr \? instagram\.problema\(login\) : null/);
});

test('un permesso che manca o un collegamento rotto si vede, col rimedio', () => {
  const APP = leggi('src/web/public/app.js');
  const ig = APP.slice(APP.indexOf('async function caricaInstagram()'), APP.indexOf('async function caricaTgLogin()'));
  for (const caso of ['if (manca.length)', "pr?.tipo === 'collegamento'", "pr?.tipo === 'permesso'", "pr?.tipo === 'altro'", 'if (d.scaduto)', 'd.aMano && pr']) {
    const i = ig.indexOf(caso);
    assert.ok(i >= 0, `manca il caso ${caso}`);
    const j = ig.indexOf('problemi.push(', i);
    assert.ok(j > 0 && ig.startsWith('problemi.push(problemaHtml({', j), `${caso}: si dice col blocco che si vede, non con una riga grigia`);
  }
  assert.match(ig, /const colore = pr\?\.grave \? 'rosso' : \(problemi\.length \? 'giallo' : 'verde'\);/, 'e il verde solo quando va tutto');
  const dove = APP.slice(APP.indexOf('function _settDisegnaDove()'), APP.indexOf('function _settDisegnaDove()') + 4000);
  assert.match(dove, /: problemaHtml\(\{\n\s+titolo: L\('La storia di Instagram non può partire'/, 'anche fra i posti della settimana');
  assert.match(dove, /data-vai="notifiche">/, 'con la strada per rimediare');
});

test('una chiave del .env scritta storta la vede chi amministra, dove guarda', () => {
  assert.match(SRV, /missing: missingConfig\(\),\n\s+storte: configStorta\(\),/, 'nello stato del pannello, accanto a quelle che mancano');
  assert.match(rotta("app.get('/api/instagram/stato'", 900), /storte: isAdmin\(currentUser\(req\)\) \? \(config\.instagramApp\?\.storte \|\| \[\]\) : \[\],/,
    'e nella scheda Instagram, solo a chi amministra il server');
  const APP = leggi('src/web/public/app.js');
  const admin = APP.slice(APP.indexOf('function vistaAdminContenuto()'), APP.indexOf('function vistaAdminContenuto()') + 3000);
  assert.match(admin, /const storte = stato\.storte\?\.length \?/);
  assert.match(admin, /\$\{avviso\}\$\{storte\}/);
  const ig = APP.slice(APP.indexOf('async function caricaInstagram()'), APP.indexOf('async function caricaTgLogin()'));
  assert.match(ig, /if \(!d\?\.appAttiva\) \{\n\s+box\.innerHTML = d\?\.storte\?\.length \? problemaHtml\(\{/,
    'il tasto spento non sparisce in silenzio: si dice perche\'');
});

test('il token si rinnova da solo, allo stesso passo degli altri giri', () => {
  assert.match(BOT, /this\._giroProgramma\(\); this\._giroInstagram\(\); \}, 6 \* 60 \* 60_000\);/);
  const giro = BOT.slice(BOT.indexOf('async _giroInstagram()'), BOT.indexOf('async _giroInstagram()') + 800);
  assert.match(giro, /igAccesso\.daAllungare\(t\.expiresAt\)/);
  assert.match(giro, /tokens\.save\('instagram', login, \{ \.\.\.t, accessToken: r\.token, expiresAt: r\.scade \}\);/,
    'l\'id di app resta accanto al token nuovo');
});
