// LE DONAZIONI SONO UN EVENTO COME GLI ALTRI: dal webhook alla pagina, ogni
// pezzo deve conoscere la stessa parola. Qui si tiene fermo il filo: l'alert
// `donazione` esiste dove nascono gli alert, dove si vestono e dove si
// salvano; l'obiettivo `euro` esiste dove si contano gli eventi, dove si
// normalizza e dove si disegna; il blocco «Sostieni» esiste dove si pulisce,
// dove si rende e dove si aggiunge; il webhook e' un ingresso dichiarato; il
// token di Ko-fi non viaggia mai verso il browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
// il database si apre in una cartella usa e getta: queste prove non lasciano tracce nei dati veri
const usaEGetta = cartellaUsaEGetta('andrybot-donazioni-');
const { TIPI_BLOCCO, linkPage } = await import('../../src/db.js');
const { renderLinkPage, renderInformativa } = await import('../../src/features/linkpagina.js');
const { aiutiPerScheda } = await import('../../src/web/manuali.js');
const { normGoal } = await import('../../src/web/stile.js');
const { AlertsEngine } = await import('../../src/features/alerts.js');
process.on('exit', () => usaEGetta.pulisci());
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const OVL = leggi('src/web/public/overlay-app.js');
const AL = leggi('src/features/alerts.js');
const VT = leggi('src/web/vetrina.js');
const BOT = leggi('src/bot.js');
const PLJS = leggi('src/web/public/pagina-link.js');
const PORTE = leggi('scripts/verifica-porte.mjs');
const VV = leggi('src/web/vetrina-vista.js');
const NOV = leggi('NOVITA.md');

test('l\'alert «donazione» esiste dove nasce, dove si veste e dove si salva', () => {
  assert.match(AL, /donazione: '\{user\} ha offerto \{importo\}! \{messaggio\}'/, 'il testo di serie');
  assert.match(AL, /donazione: 'moneta'/, 'il suono di serie');
  assert.match(AL, /^  donazione\(channel, d\) \{/m, 'il motore ha il metodo');
  assert.match(AL, /this\._contaGoal\(channel, 'donazione', importo\);/, 'fa crescere l\'obiettivo');
  assert.match(AL, /importo >= \(Number\(conf\.minImporto\) \|\| 0\)/, 'rispetta l\'importo minimo');
  assert.match(AL, /if \(cfgD\.annunciaChat && this\.say\)/, 'ringrazia in chat solo se acceso');
  assert.match(BOT, /new AlertsEngine\(\{ effects: this\.effects, say: \(ch, t\) => this\.say\(ch, t\) \}\)/, 'il bot gli presta la chat');
  assert.match(APP, /\{ key: 'donazione', nome: L\('Donazione'/, 'il pannello lo elenca fra gli alert');
  assert.match(APP, /soglia: \{ campo: 'minImporto'/, 'con la soglia dell\'importo minimo');
  assert.match(SRV, /donazione: \{ \.\.\.evt\(p\.donazione\), minImporto:/, 'il server lo salva');
  assert.match(OVL, /^  donazione: '<svg/m, 'l\'overlay ha la sua icona');
});

test('l\'obiettivo «euro» esiste dove si conta, dove si pulisce e dove si disegna', () => {
  assert.match(AL, /const GOAL_DI = \{ follow: 'follower', sub: 'sub', cheer: 'bit', donazione: 'euro' \};/);
  assert.equal(normGoal({ tipo: 'euro' }).tipo, 'euro');
  assert.match(APP, /\['euro', L\('euro donati'/, 'la tendina lo offre');
  assert.match(APP, /const GOAL_PAROLA = \{[^}]*euro: 'euro'/);
  assert.match(OVL, /const GOAL_ETICHETTA = \{[^}]*euro: 'euro'/);
  assert.match(OVL, /numGoal\(cfg\.tipo, ora\) \+ ' \/ ' \+ numGoal\(cfg\.tipo, meta\)/, 'in diretta la cifra si scrive in euro');
  assert.match(APP, /_numGoal\(g\.tipo, ora\) \+ ' \/ ' \+ _numGoal\(g\.tipo, meta\)/, 'e sulla tela uguale');
  assert.match(SRV, /g\.tipo === 'bit' \|\| g\.tipo === 'euro'\) \{ fuori\.push\(g\); continue; \}/, '«quanti ne ho adesso» non tocca gli euro: non c\'e\' nessuno a cui chiederli');
  assert.match(AL, /conti\[x\.id\] = Math\.round\(\(\(Number\(conti\[x\.id\]\) \|\| 0\) \+ quanti\) \* 100\) \/ 100;/, 'il conto tiene i centesimi senza sporcarsi');
});

test('il blocco «Sostieni» esiste dove si pulisce, dove si rende e dove si aggiunge, e legge una configurazione sola', () => {
  assert.ok(TIPI_BLOCCO.includes('sostieni'));
  const p = linkPage.pulisci({ blocchi: [{ tipo: 'sostieni', titolo: 'Offrimi un caffè', testo: 'grazie', etichetta: 'Dona', obiettivo: false }] });
  assert.deepEqual(p.blocchi[0], { tipo: 'sostieni', titolo: 'Offrimi un caffè', testo: 'grazie', etichetta: 'Dona', obiettivo: false, larghezza: 'piena', entrata: 'auto', allinea: 'auto' });
  assert.match(APP, /data-lpadd="sostieni"/, 'si aggiunge dal pannello');
  assert.match(APP, /sostieni: \{ tipo: 'sostieni', titolo: '', testo: '', etichetta: '', obiettivo: true \}/);
  const base = { attiva: true, blocchi: [{ tipo: 'sostieni', titolo: 'Un caffè', obiettivo: true }], tema: {} };
  const opz = { login: 'x', display: 'X', avatar: '', baseUrl: 'http://x' };
  const senza = renderLinkPage(base, opz);
  assert.ok(!senza.includes('class="sost"'), 'senza le donazioni configurate il blocco non compare in pubblico');
  assert.ok(renderLinkPage(base, { ...opz, anteprima: true }).includes('da completare'), 'in anteprima si vede cosa manca');
  const con = renderLinkPage(base, { ...opz, sostieni: { modo: 'link', link: 'https://ko-fi.com/x', etichetta: 'Offrimi un caffè', messaggio: 'grazie di cuore', valuta: 'EUR', goal: { ora: 32.5, meta: 200, titolo: 'Nuovo microfono' } } });
  assert.ok(con.includes('class="sost"'));
  assert.ok(con.includes('href="https://ko-fi.com/x"') && con.includes('rel="noopener nofollow"'), 'il tasto porta al link, come un link esterno');
  assert.ok(con.includes('Offrimi un caffè') && con.includes('grazie di cuore') && con.includes('Nuovo microfono'));
  assert.ok(con.includes('32,50 €') && con.includes('/ 200 €') && con.includes('--q:0.1625'), 'la cifra e la barra dell\'obiettivo');
  assert.ok(con.includes('class="voce spicca sost-b"'), 'il tasto e\' in evidenza, col tema');
  const stile = con.slice(con.indexOf('<style>'), con.indexOf('</style>'));
  assert.ok(stile.includes('.sost{') && stile.includes('.sost-gb i{'), 'il foglio della pagina lo veste');
  const conAnim = renderLinkPage({ ...base, tema: { anim: 'rise' } }, { ...opz, sostieni: { modo: 'link', link: 'https://ko-fi.com/x', etichetta: 'x', messaggio: '', valuta: 'EUR', goal: null } });
  const stileAnim = conAnim.slice(conAnim.indexOf('<style>'), conAnim.indexOf('</style>'));
  assert.ok(stileAnim.includes('.marq,.sost{animation:ent'), 'entra come gli altri blocchi quando la pagina ha un\'entrata');
  assert.ok(stileAnim.includes(',.bl,.sost)'), 'e lo scorrimento lo rivela come gli altri');
  const senzaGoal = renderLinkPage({ ...base, blocchi: [{ tipo: 'sostieni', obiettivo: false }] }, { ...opz, sostieni: { modo: 'link', link: 'https://ko-fi.com/x', etichetta: '', messaggio: '', valuta: 'EUR', goal: { ora: 1, meta: 2 } } });
  assert.ok(!senzaGoal.includes('sost-g"') && senzaGoal.includes('>Sostieni<'), 'l\'obiettivo si puo\' nascondere; il tasto senza testo si chiama Sostieni');
});

test('il webhook e\' un ingresso dichiarato, verificato con l\'impronta, e il token non arriva mai al browser', () => {
  assert.match(VT, /'\/dona\/',\s+\/\/ Ko-fi/, 'fra gli ingressi esterni');
  assert.match(VT, /'\/dona\/',\s+\/\/ donazioni: il webhook di Ko-fi/, 'e fra le rotte aperte');
  assert.match(SRV, /app\.post\('\/dona\/kofi\/:login', express\.urlencoded\(\{ extended: false, limit: '64kb' \}\)/, 'Ko-fi manda un modulo, non JSON');
  assert.match(SRV, /!combacia\(d\.token, st\.donazioni\.kofiImp, login\)\) return res\.status\(401\)/, 'senza token giusto: 401');
  const i = SRV.indexOf("app.post('/dona/kofi/:login'");
  const corpo = SRV.slice(i, SRV.indexOf('}));', i));
  assert.ok(corpo.indexOf('res.json({ ok: true });') < corpo.indexOf('manager.alerts?.donazione'), 'si risponde prima di lavorare');
  assert.ok(corpo.includes("registroDonazioni.segna(chiave, { login, fonte: 'kofi'"), 'i doppioni li scarta il registro, che sopravvive a un riavvio');
  assert.match(SRV, /donazioni: \{ \.\.\.dn, kofiImp: '', kofiSet: true \}/, '/api/me maschera l\'impronta');
  assert.match(SRV, /out\.donazioni = donazioni\.normDonazioni\(b\.donazioni, s\.settings\?\.donazioni, user\.login\);/, 'le impostazioni passano dalla pulizia');
  assert.match(SRV, /if \(azione === 'donazione'\) \{/, 'la chiave API del canale accetta una mancia');
  assert.ok((SRV.match(/sostieni: donazioni\.datiSostieni\(s\?\.settings, (conto|contiDonazioni\.get\(login\))\)/g) || []).length === 2, 'la pagina pubblica e l\'anteprima ricevono gli stessi dati, col conto');
});

test('il motore: una donazione fa crescere l\'obiettivo, spara l\'alert sopra la soglia e ringrazia in chat', () => {
  const settings = {
    donazioni: { attivo: true, link: 'https://ko-fi.com/x', valuta: 'EUR', annunciaChat: true, testoChat: 'Grazie {user} per {importo}!' },
    alerts: { attivo: true, donazione: { attivo: true, minImporto: 2 } },
  };
  const emessi = [], detti = [], contati = [];
  const eng = new AlertsEngine({ effects: { emit: (ch, p) => emessi.push(p) }, say: (ch, t) => detti.push(t) });
  eng.cfg = () => settings;                                  // un canale finto: il database non si tocca
  eng._contaGoal = (ch, kind, quanti) => contati.push([kind, quanti]);
  assert.equal(eng.donazione('prova', { user: 'Luca', importo: 1.5, valuta: 'EUR', messaggio: 'ciao' }), true);
  assert.ok(!emessi.some((p) => p.tipo === 'alert'), 'sotto la soglia niente alert');
  assert.deepEqual(contati, [['donazione', 1.5]], 'ma l\'obiettivo sale lo stesso');
  assert.deepEqual(detti, ['Grazie Luca per 1,50 €!']);
  eng.donazione('prova', { user: 'Giada', importo: 5, valuta: 'EUR', messaggio: 'grande' });
  const alert = emessi.find((p) => p.tipo === 'alert');
  assert.ok(alert && alert.kind === 'donazione', 'sopra la soglia l\'alert parte');
  assert.equal(alert.testo, 'Giada ha offerto 5 €! grande');
  assert.equal(alert.suono, 'moneta');
  assert.equal(eng.donazione('prova', { user: 'x', importo: 0 }), false, 'senza importo non e\' una donazione');
  settings.donazioni.annunciaChat = false; detti.length = 0;
  eng.donazione('prova', { user: 'Zoe', importo: 3 });
  assert.deepEqual(detti, [], 'con il grazie spento la chat resta zitta');
});

test('la scheda «Donazioni» esiste nel pannello, negli aiuti, nella vetrina e nelle novita\'', () => {
  assert.match(APP, /\['donazioni', 'Donazioni'\],/, 'e\' una scheda del pannello');
  assert.match(APP, /\$\{pannelloDonazioni\(\)\}/, 'e si compone con le altre');
  assert.match(APP, /if \(id === 'donazioni'\) \{ riempiDonazioni\(\); caricaStatoDonazioni\(true\); \}/, 'aprendola si legge lo stato del conto');
  assert.ok(!APP.includes("if (id === 'pagina') { caricaPaginaLink(); riempiDonazioni(); }"), 'la pagina link non la carica piu\'');
  const pagina = APP.slice(APP.indexOf('function pannelloPaginaLink() {'), APP.indexOf('function pannelloDonazioni() {'));
  assert.ok(!pagina.includes('dona-carta'), 'la carta non sta piu\' nella pagina link');
  assert.equal(aiutiPerScheda().donazioni?.tipo, 'manuale', 'il manuale la conosce: «[vai: donazioni]» punta a qualcosa');
  assert.match(VV, /scheda: 'donazioni', pacc: 'free'/, 'la vetrina la racconta');
  assert.ok(NOV.includes('[vai: donazioni]'));
  assert.match(APP, /data-dona="collega"/); assert.match(APP, /data-dona="scollega"/);
  assert.match(APP, /api\('\/api\/donazioni\/conto\/collega', \{ method: 'POST'/, 'il tasto chiede l\'indirizzo e ci va');
  assert.match(APP, /input\[name="dona-modo"\]/, 'si sceglie come si dona');
});

test('il conto e il pagamento: le rotte hanno il loro guardiano o sono dichiarate pubbliche, e la pagina conferma con Stripe', () => {
  assert.match(SRV, /app\.get\('\/api\/donazioni\/stato', requireOwner,/);
  assert.match(SRV, /app\.post\('\/api\/donazioni\/conto\/collega', requireOwner,/);
  assert.match(SRV, /app\.post\('\/api\/donazioni\/conto\/scollega', requireOwner,/);
  assert.match(SRV, /app\.post\('\/dona\/:login', express\.urlencoded\(\{ extended: false, limit: '8kb' \}\)/, 'il modulo e\' un modulo');
  assert.match(PORTE, /\['POST \/dona\/:login', /, 'ed e\' dichiarato pubblico, col motivo');
  const u = SRV.slice(SRV.indexOf("app.get('/u/:user'"), SRV.indexOf("app.get('/api/streamer-verify'"));
  assert.ok(u.includes("const e = await donaStripe.conferma(login, dona);"), 'al ritorno si chiede a Stripe');
  assert.ok(u.includes("if (e?.nuova) manager.alerts?.donazione(login, e.d);"), 'l\'avviso parte solo la prima volta');
  assert.ok(u.includes("if (dona) res.set('Cache-Control', 'private, no-store');"), 'la pagina del grazie non va in cache');
  assert.match(SRV, /donaStripe\.avviaRonda\(\(login, d\) => manager\.alerts\?\.donazione\(login, d\)\);/, 'la ronda avvisa come il ritorno');
  const modulo = SRV.slice(SRV.indexOf("app.post('/dona/:login'"), SRV.indexOf("app.post('/stripe/webhook'"));
  assert.ok(modulo.includes("donazioni.leggiModulo(req.body, cfg)") && modulo.includes("donaStripe.apriPagamento({ login, display: s?.display || login"), 'legge il modulo e apre il pagamento sul conto');
  assert.ok(modulo.includes("extRateOk('dona-modulo:' + login)"), 'con un limite di frequenza');
  assert.ok(modulo.includes('http-equiv="refresh"'), 'senza script, la pagina-ponte');
  assert.match(SRV, /registroDonazioni\.segna\(chiave, \{ login, fonte: 'ext'/, 'anche la chiave API passa dal registro');
});

test('il blocco «Sostieni» sul conto: un modulo col tema, che in anteprima non manda niente, e il grazie al ritorno', () => {
  const base = { attiva: true, blocchi: [{ tipo: 'sostieni', titolo: 'Un caffè', obiettivo: true }], tema: {} };
  const opz = { login: 'x', display: 'Xena', avatar: '', baseUrl: 'http://x' };
  const dati = { modo: 'conto', link: '', importi: [2, 5, 10], minimo: 2, conMessaggio: true, etichetta: 'Dona', messaggio: '', valuta: 'EUR', goal: null };
  const con = renderLinkPage(base, { ...opz, sostieni: dati });
  assert.ok(con.includes('<form class="sost-f" method="post" action="/dona/x">'), 'il modulo manda al nostro server');
  assert.ok(con.includes('<input type="radio" name="importo" value="5" checked>'), 'il secondo importo e\' quello proposto');
  assert.ok(con.includes('name="altro"') && con.includes('min="2"'), 'un altro importo, dal minimo in su');
  assert.ok(con.includes('name="nome"') && con.includes('name="messaggio"') && con.includes('name="sito"'), 'nome, messaggio e il campo trappola');
  assert.ok(con.includes('type="submit" class="voce spicca sost-b"'), 'il tasto e\' quello in evidenza, col tema');
  assert.ok(con.includes('Va tutto a Xena.'));
  assert.ok(!con.includes('href="https://'), 'niente link esterno');
  const senzaMsg = renderLinkPage(base, { ...opz, sostieni: { ...dati, conMessaggio: false } });
  assert.ok(!senzaMsg.includes('name="messaggio"'), 'se lo streamer non vuole messaggi, il campo non c\'e\'');
  const ant = renderLinkPage(base, { ...opz, sostieni: dati, anteprima: true });
  assert.ok(ant.includes('<form class="sost-f" data-anteprima="1">') && ant.includes('type="button" class="voce spicca sost-b"'), 'in anteprima il modulo non manda niente');
  const grazie = renderLinkPage(base, { ...opz, sostieni: dati, grazie: { nome: 'Luca', importo: 5, valuta: 'EUR' } });
  assert.ok(grazie.includes('<p class="sost-ok" role="status">Grazie, Luca! 5 € arrivati.</p>'));
  assert.ok(renderLinkPage(base, { ...opz, sostieni: dati, grazie: { nome: 'qualcuno', importo: 2.5, valuta: 'EUR' } }).includes('>Grazie! 2,50 € arrivati.<'), 'senza nome, solo grazie');
  const manca = renderLinkPage(base, { ...opz, anteprima: true, manca: 'conto' });
  assert.ok(manca.includes('collega il tuo conto nella scheda «Donazioni»'), 'in anteprima si dice cosa manca');
  const stile = con.slice(con.indexOf('<style>'), con.indexOf('</style>'));
  assert.ok(stile.includes('.sost-c input:checked+span{') && stile.includes('button.sost-b{'), 'il foglio veste i bottoni degli importi e il tasto');
  assert.ok(!/https:\/\/[a-z.]*stripe/.test(leggi('src/features/linkpagina.js')), 'nessun host di Stripe nel codice della pagina: il CSP non cambia');
  assert.ok(PLJS.includes("document.querySelector('.sost-f')") && PLJS.includes("headers: { Accept: 'application/json' }") && PLJS.includes('location.href = x.j.url'), 'lo script manda via fetch e naviga da solo');
  assert.ok(PLJS.includes("if (f.getAttribute('data-anteprima')) return;"), 'e in anteprima si ferma');
  assert.match(leggi('src/features/linkpagina.js'), /pagina-link\.js\?v=9/, 'lo script cambia versione, cosi\' la cache lo ricarica');
});

test('le pagine di privacy e termini, e l\'informativa della pagina link, dicono come vanno i soldi e i dati', () => {
  const priv = leggi('src/web/public/privacy.html');
  assert.ok(priv.includes('<li><strong>Donazioni</strong>') && priv.includes('Stripe Payments Europe'), 'la privacy del sito');
  assert.ok(priv.includes('Donazioni (nome scelto, messaggio, importo, ora): <strong>un anno</strong>'), 'e per quanto');
  const term = leggi('src/web/public/termini.html');
  assert.ok(term.includes('sei tu l\'esercente') && term.includes('non custodisce fondi'), 'i termini: lo streamer e\' l\'esercente, SocialBot non tiene soldi');
  const inf = renderInformativa({ login: 'x', display: 'X', baseUrl: 'http://x', pagina: { tema: {} }, contatto: '' });
  assert.ok(inf.includes('<h2>Donazioni</h2>') && inf.includes('sul conto di X'), 'l\'informativa della pagina');
});
