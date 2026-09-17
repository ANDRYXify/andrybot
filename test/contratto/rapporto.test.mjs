// IL RAPPORTO DI FINE DIRETTA, DA FUORI: si salva sempre e poi parte verso i
// canali scelti; la scheda Dirette lo mostra e regola i canali; l'indirizzo
// mail vale solo confermato; il manuale, la vetrina e la privacy lo dicono.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MANUALI } from '../../src/web/manuali.js';
import { FUNZIONI_VETRINA } from '../../src/web/vetrina-vista.js';
const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const BOT = leggi('src/bot.js');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');

test('il bot: apre all\'online, misura a ogni giro, chiude, salva sempre e poi manda dove serve', () => {
  const live = BOT.slice(BOT.indexOf('_setLive(login, isLive, data) {'), BOT.indexOf('_rapportoDiretta(login) {'));
  assert.ok(live.includes("rapporto.apri(ch, { inizio: Date.parse(data?.started_at) || 0 });"));
  assert.ok(live.includes('this._rapportoDiretta(ch);'));
  assert.ok(BOT.includes('rapporto.osservaGiro(login, { spettatori: stream.viewer_count });'), 'gli spettatori dallo stesso giro delle ore');
  const f = BOT.slice(BOT.indexOf('_rapportoDiretta(login) {'), BOT.indexOf('_reagisciAllaDiretta(login, isLive) {'));
  assert.ok(f.includes('const id = rapporti.salva(login, { inizio: chiuso.inizio, fine: chiuso.fine, dati });'), 'il rapporto resta, sempre');
  assert.ok(f.includes("if (c.telegram && conf?.token && conf.owner_tg_id && (conf.dm_modo || 'me') !== 'off') {"), 'Telegram solo verso la chat privata collegata e accesa');
  assert.ok(f.includes("if (c.mail && pst?.confermata && pst.email && posta.attiva()) {"), 'la mail solo a un indirizzo confermato, con la posta attiva');
  assert.ok(f.includes(".then(() => rapporti.segnaInviato(id, 'telegram'))") && f.includes(".then(() => rapporti.segnaInviato(id, 'mail'))"));
});

test('il server: la scheda ha le sue porte, l\'indirizzo si conferma da una mail e il codice non si conserva', () => {
  for (const r of ["app.get('/api/streamer/rapporti', requireLogin,", "app.post('/api/streamer/rapporti/letti', requireLogin,", "app.post('/api/streamer/posta', requireOwner,", "app.delete('/api/streamer/posta', requireOwner,", "app.get('/posta/conferma', wrap("]) {
    assert.ok(SRV.includes(r), r);
  }
  const conf = SRV.slice(SRV.indexOf("app.post('/api/streamer/posta', requireOwner,"), SRV.indexOf("app.delete('/api/streamer/posta'"));
  assert.ok(conf.includes("const impronta = crypto.createHash('sha256').update(codice).digest('hex');"), 'si conserva il calco, non il codice');
  assert.ok(conf.includes('if (!posta.riposoConferma(login)) return res.status(429)'), 'una richiesta ogni dieci minuti');
  assert.ok(conf.includes('postaStreamer.togli(login);') && conf.includes('return res.status(502)'), 'se la mail non parte, l\'indirizzo non resta appeso');
  assert.ok(SRV.includes("if (b.rapporto !== undefined) out.rapporto = rapporto.normalizza(b.rapporto);"));
  assert.ok(SRV.includes('rapportiNuovi: rapporti.nuovi(user.login),'), 'il pannello sa quanti rapporti non ha ancora aperto');
  assert.ok(leggi('scripts/verifica-porte.mjs').includes("['GET /posta/conferma',") && leggi('src/web/vetrina.js').includes("'/posta/conferma',"));
});

test('il pannello: la scheda Dirette, il puntino, i canali; l\'interruttore non sta piu\' nella carta Telegram', () => {
  assert.ok(APP.includes("['dirette', 'Dirette'],") && APP.includes("return pannello('dirette', `"));
  for (const id of ['lista-rapporti', 'chk-rap-telegram', 'chk-rap-mail', 'inp-posta', 'btn-posta-conferma']) assert.ok(APP.includes(`id="${id}"`), `manca #${id}`);
  assert.ok(APP.includes('id="btn-posta-togli"'));
  assert.ok(APP.includes(`const nuovoDi = (id) => (id === 'dirette' && stato?.rapportiNuovi > 0 ? '<i class="voce-nuovo"></i>' : '');`));
  assert.equal((APP.match(/\$\{nuovoDi\(id\)\}/g) || []).length, 2, 'il puntino sta nel menu in alto e nel cassetto');
  assert.ok(APP.includes("if (id === 'dirette') caricaDirette();"));
  assert.ok(APP.includes("api('/api/streamer/rapporti/letti', { method: 'POST', body: {} })"), 'aprire la scheda segna letti');
  assert.ok(!APP.includes('chk-tg-rapporto'), 'un posto solo per scegliere dove ricevere il rapporto');
  assert.ok(APP.includes("'/api/streamer/rapporti': {"), 'la demo ha i suoi rapporti');
  assert.ok(leggi('src/web/public/style.css').includes('.voce-nuovo {') && leggi('src/web/public/style.css').includes('.rap-carta {'));
});

test('il manuale, la vetrina, la privacy e le novita\' lo raccontano', () => {
  const testo = JSON.stringify(MANUALI);
  assert.ok(testo.includes('Il rapporto di ogni diretta') && testo.includes('picco di spettatori') && testo.includes('via mail'), 'il manuale spiega il rapporto e i canali');
  const voci = FUNZIONI_VETRINA.flatMap((g) => g.voci);
  assert.ok(voci.some((v) => v.scheda === 'dirette' && v.t[0] === 'Il rapporto di ogni diretta'));
  const privacy = leggi('src/web/public/privacy.html');
  assert.ok(privacy.includes('Indirizzo e-mail dello streamer') && privacy.includes('rapporti delle dirette'));
  const novita = leggi('NOVITA.md');
  assert.ok(novita.includes('nella scheda «Dirette»') && novita.includes('su Telegram in privato o via mail'));
  assert.ok(leggi('.env.example').includes('MAIL_DOMINIO=') && leggi('docs/POSTA.md').includes('porta 25'));
});

test('gli inviti li decide il server, e si fanno una volta sola', () => {
  // Una scelta tenuta nel browser ricompare sull'altro computer e sul telefono:
  // chi ha gia' detto no se la ritroverebbe davanti. Percio' la decisione sta in
  // un posto solo, e la risposta resta con lo streamer dovunque entri. E stanno
  // in un elenco, non uno per uno: due copie della stessa cosa sono due posti
  // dove sbagliarla.
  const srv = leggi('src/web/server.js');
  const reg = srv.slice(srv.indexOf('const INVITI = ['), srv.indexOf('const INVITI_ID'));
  assert.match(reg, /\['posta',/, 'l\'invito a lasciare l\'indirizzo');
  assert.match(reg, /\['vetrina',/, 'e quello a comparire fra le dirette sulla home');
  assert.match(reg, /!posta\.attiva\(\)/, 'niente invito alla posta se la posta e\' spenta');
  assert.match(reg, /s\?\.settings\?\.invitoPosta/, 'chi aveva gia\' risposto quando l\'invito era uno solo non lo rivede');
  assert.match(reg, /postaStreamer\.get\(user\.login\)\?\.email/, 'ne\' chi un indirizzo ce l\'ha gia\'');
  assert.match(reg, /vetrinaLive !== true/, 'e chi compare gia\' in vetrina non se lo sente chiedere');

  const chi = srv.slice(srv.indexOf('function invitiAperti('), srv.indexOf('function invitiAperti(') + 600);
  assert.match(chi, /if \(!isOwner\(req\)\) return \[\];/, 'un moderatore non sceglie per il proprietario');
  assert.match(chi, /s\?\.status !== 'approved'/, 'e non si chiede niente prima dell\'attivazione');
  assert.match(chi, /!visti\[id\]/, 'chi ha gia\' risposto non lo rivede');

  const porta = srv.slice(srv.indexOf("app.post('/api/streamer/invito/:id'"), srv.indexOf("app.delete('/api/streamer/posta'"));
  assert.match(porta, /requireOwner/, 'la porta ha il suo guardiano');
  assert.match(porta, /INVITI_ID\.includes\(id\)/, 'e l\'id si controlla: da qui non si scrivono chiavi qualunque');
  assert.match(porta, /invitiVisti/, 'la risposta si scrive fra le impostazioni dello streamer');

  const app = leggi('src/web/public/app.js');
  const f = app.slice(app.indexOf('function invito()'), app.indexOf('let _avvisatoRapporti'));
  assert.match(f, /\(stato\?\.inviti \|\| \[\]\)/, 'il pannello non decide: guarda cosa gli ha detto il server');
  assert.match(f, /dialog\[open\]/, 'una finestra sola alla volta: aspetta che si chiuda quella delle novita\'');
  assert.match(f, /stato\.inviti = \[\];/, 'e ne fa una per accesso, non una fila di domande');
  assert.match(f, /addEventListener\('close'[\s\S]{0,200}\/api\/streamer\/invito\//, 'la risposta si segna comunque sia andata, si\' o no');
  const reg2 = app.slice(app.indexOf('const INVITI = {'), app.indexOf('function invito()'));
  assert.match(reg2, /\/api\/streamer\/posta'/, 'il si\' alla posta passa dalla porta di sempre, quella che manda la conferma');
  assert.match(reg2, /vetrinaLive: true/, 'e il si\' alla vetrina accende l\'interruttore');
});

test('le clip della serata si riaprono: nella carta della scheda, non solo nella mail', () => {
  const app = leggi('src/web/public/app.js');
  assert.match(app, /\$\{clipRapporto\(d\.clipElenco\)\}/, 'la carta le mostra');
  const f = app.slice(app.indexOf('function clipRapporto('), app.indexOf('function canaliRapportoHtml('));
  assert.match(f, /filter\(\(c\) => c\?\.url\)/, 'solo quelle che hanno davvero un indirizzo');
  assert.match(f, /target="_blank" rel="noopener"/, 'si aprono di fianco, non al posto del pannello');
  assert.ok(!/rap-clip/.test(leggi('src/web/public/style.css')) === false, 'e hanno il loro stile');
});

test('il codice di verifica: in fondo a ogni mail, e visibile solo da dentro il pannello', () => {
  // Il senso della cosa e' tutto qui: chi imita una nostra mail non sa cosa
  // scrivere nel riquadro in fondo, perche' per saperlo dovrebbe entrare nel
  // pannello dello streamer. Percio' il codice non deve uscire da nessun'altra
  // parte, e ogni mail che parte deve portarlo.
  const srv = leggi('src/web/server.js');
  const porta = srv.slice(srv.indexOf("app.get('/api/streamer/codici-posta'"), srv.indexOf("app.get('/api/streamer/codici-posta'") + 260);
  assert.match(porta, /requireOwner/, 'solo il proprietario');
  assert.match(porta, /posta\.codiciDelMese\(currentUser\(req\)\.login\)/, 'e solo i suoi: il canale viene da chi e\' entrato');
  assert.equal(srv.split('codiciDelMese(').length - 1, 1, 'una porta sola li mostra');
  assert.ok(!leggi('src/web/vetrina.js').includes('codici-posta'), 'non e\' una porta pubblica');

  // ogni mail che parte porta il codice
  assert.match(srv, /posta\.mailConferma\(\{ display, link, codice: posta\.codiceDi\(login\) \}\)/, 'la conferma');
  const bot = leggi('src/bot.js');
  assert.match(bot, /const codice = posta\.codiceDi\(login\);/, 'e il rapporto');
  assert.match(bot, /testo: rapporto\.testoPiano\(dati, \{ codice \}\), html: rapporto\.html\(dati, \{ display, codice \}\)/);

  // non si conserva: si ricava dal segreto del server
  const pst = leggi('src/features/posta.js');
  assert.match(pst, /segno\('codice-posta', `\$\{String\(channel \|\| ''\)\.toLowerCase\(\)\}\|\$\{settimanaDi\(ora\)\}`\)/,
    'per canale e per settimana, dal segreto del server');
  assert.ok(!/INSERT INTO|CREATE TABLE/.test(pst), 'niente da conservare, quindi niente da rubare');

  const app = leggi('src/web/public/app.js');
  assert.ok(app.includes('id="codici-posta"'), 'la carta c\'e\' nella scheda Stato');
  assert.match(app, /caricaCodiciPosta\(\);/, 'e si carica con la scheda');
});

test('il nome del mittente si vede nell\'elenco della posta', () => {
  const pst = leggi('src/features/posta.js');
  assert.match(pst, /export function nomeMittente\(\) \{ return env\('MAIL_NOME'\) \|\| 'SocialBot'; \}/);
  assert.match(pst, /componi\(\{ da: mittenteIntestazione\(\)/, 'il From porta il nome');
  assert.match(pst, /consegna\(\{ a, da, messaggio/, 'la busta porta il solo indirizzo');
});
