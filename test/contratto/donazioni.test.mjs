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
  assert.match(AL, /^  donazione\(channel, d, \{ soloAvviso = false \} = \{\}\) \{/m, 'il motore ha il metodo, e sa rimandare solo l\'avviso');
  // Quel che una donazione muove una volta sola sta tutto dentro `if (!soloAvviso && stessa)`:
  // l'obiettivo e, da quando c'e', il tempo del subathon. Rimandare l'avviso dal
  // registro non deve ricontare ne' riallungare niente (e un importo in un'altra
  // valuta non si somma: vedi la prova della valuta).
  const unaVoltaSola = AL.slice(AL.indexOf('if (!soloAvviso && stessa) {'), AL.indexOf('const a = s.alerts;'));
  assert.match(unaVoltaSola, /this\._contaGoal\(channel, 'donazione', importo\)/, 'rimandare l\'avviso non riconta l\'obiettivo');
  assert.match(unaVoltaSola, /subathon\.suEvento/, 'ne\' allunga di nuovo il subathon');
  assert.match(AL, /if \(!soloAvviso && cfgD\.annunciaChat && this\.say\)/, 'e il grazie in chat non si ripete');
  assert.match(AL, /importo >= \(Number\(conf\.minImporto\) \|\| 0\)/, 'rispetta l\'importo minimo');
  assert.match(AL, /cfgD\.annunciaChat && this\.say\)/, 'ringrazia in chat solo se acceso');
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
  assert.deepEqual(p.blocchi[0], { tipo: 'sostieni', titolo: 'Offrimi un caffè', testo: 'grazie', etichetta: 'Dona', obiettivo: false, icona: 'cuore', pagina: false, larghezza: 'piena', entrata: 'auto', allinea: 'auto' });
  assert.equal(linkPage.pulisci({ blocchi: [{ tipo: 'sostieni', icona: 'stella' }] }).blocchi[0].icona, 'stella', 'l\'icona si sceglie come per i link');
  assert.equal(linkPage.pulisci({ blocchi: [{ tipo: 'sostieni', icona: 'boh' }] }).blocchi[0].icona, 'cuore', 'una sconosciuta torna al cuore');
  assert.match(APP, /data-lpadd="sostieni"/, 'si aggiunge dal pannello');
  assert.match(APP, /sostieni: \{ tipo: 'sostieni', titolo: '', testo: '', etichetta: '', obiettivo: true, icona: 'cuore' \}/);
  assert.match(APP, /\$\{grigliaIcone\(i, b\.icona \|\| 'cuore'\)\}/, 'l\'editor offre la griglia delle icone anche qui');
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
  assert.ok((SRV.match(/sostieni: donazioni\.datiSostieni\(s\?\.settings, (conti|contiDi\(login\))\)/g) || []).length === 6, 'le due pagine pubbliche, le due anteprime e le due informative ricevono gli stessi dati, coi conti');
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
  assert.match(APP, /if \(id === 'donazioni'\) \{ riempiDonazioni\(\); caricaStatoDonazioni\(true\); caricaPaginaLink\(false, 'dona'\); \}/, 'aprendola si legge lo stato del conto, e si apre la sua pagina');
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
  assert.match(SRV, /donaStripe\.collegaConto\(u\.login, req\.body\?\.chiave\)/, 'si collega con la chiave dello streamer');
  assert.match(SRV, /isAdmin\(u\) && r\.dettaglio \? ' Stripe dice: ' \+ r\.dettaglio : ''/, 'la frase di Stripe, in piu\', la vede l\'amministratore');
  assert.match(SRV, /app\.post\('\/api\/donazioni\/conto\/scollega', requireOwner,/);
  assert.match(SRV, /app\.get\('\/api\/donazioni\/elenco', requireOwner,/);
  assert.match(SRV, /app\.get\('\/api\/donazioni\/esporta\.csv', requireOwner,/);
  assert.match(SRV, /app\.post\('\/api\/donazioni\/azione', requireOwner,/);
  assert.ok(SRV.includes("{ soloAvviso: true }"), 'rimandare l\'avviso non riconta');
  assert.ok(!SRV.includes("'/api/donazioni/conto/riprendi'") && !SRV.includes("'/api/donazioni/conto/ritorno'"), 'niente ritorni da Stripe: non c\'e\' nessuna registrazione');
  const DS = leggi('src/features/donazioni-stripe.js');
  assert.ok(!DS.includes('Stripe-Account') && !DS.includes("'/accounts'") && !DS.includes('account_links') && !DS.includes('application_fee'), 'nessun Connect, nessuna quota: il conto e\' dello streamer e basta');
  assert.match(DS, /export const CHIAVE_OK = \/\^rk_\(live\|test\)_/, 'solo chiavi con restrizioni');
  assert.ok(DS.includes("if (/^sk_/.test(k)) return { errore:"), 'la chiave segreta si rifiuta');
  assert.ok(DS.includes("stripe(k, 'POST', '/products'") && DS.includes("stripe(k, 'POST', '/checkout/sessions', paramsSessione("), 'la chiave si verifica per intero prima di salvarla');
  assert.ok(!leggi('src/config.js').includes('DONAZIONI_QUOTA') && !leggi('.env.example').includes('DONAZIONI_QUOTA'), 'niente da configurare per la piattaforma');
  assert.match(APP, /id="dona-chiave"/, 'la chiave si incolla nel pannello');
  assert.match(APP, /data-dona-riga="riproponi"/); assert.match(APP, /data-dona-riga="rimborsa"/); assert.match(APP, /data-dona-riga="elimina"/);
  assert.match(APP, /href="\/api\/donazioni\/esporta\.csv" download/, 'il registro si scarica');
  assert.match(SRV, /app\.post\('\/dona\/:login', express\.urlencoded\(\{ extended: false, limit: '8kb' \}\)/, 'il modulo e\' un modulo');
  assert.match(PORTE, /\['POST \/dona\/:login', /, 'ed e\' dichiarato pubblico, col motivo');
  const u = SRV.slice(SRV.indexOf("app.get('/u/:user'"), SRV.indexOf("app.get('/api/streamer-verify'"));
  assert.ok(u.includes("const e = await confermaDonazione(login, dona);"), 'al ritorno si chiede a chi ha mosso i soldi');
  assert.ok(SRV.includes("if (/^cs_[A-Za-z0-9_]{8,200}$/.test(dona)) return donaStripe.conferma(login, dona);"), 'cs_… e\' una sessione di Stripe');
  assert.ok(u.includes("if (e?.nuova) donazioneArrivata(login, e.d);"), 'l\'avviso parte solo la prima volta');
  assert.ok(SRV.includes("function donazioneArrivata(login, d) {\n    manager.alerts?.donazione(login, d);"), 'e la donazione arrivata e\' una cosa sola, per il ritorno e per la ronda');
  assert.ok(u.includes("if (dona) res.set('Cache-Control', 'private, no-store');"), 'la pagina del grazie non va in cache');
  assert.match(SRV, /donaStripe\.avviaRonda\(donazioneArrivata, \{/, 'la ronda avvisa come il ritorno');
  const modulo = SRV.slice(SRV.indexOf("app.post('/dona/:login'"), SRV.indexOf("app.post('/stripe/webhook'"));
  assert.ok(modulo.includes("donazioni.leggiModulo(req.body, cfg)") && modulo.includes("const dati = { login, display: s?.display || login,") && modulo.includes("mezzo === 'satispay' ? await donaSatispay.apriPagamento(dati) : await donaStripe.apriPagamento(dati)"), 'legge il modulo e apre il pagamento sul conto scelto');
  assert.ok(modulo.includes("extRateOk('dona-modulo:' + login)"), 'con un limite di frequenza');
  assert.ok(modulo.includes('http-equiv="refresh"'), 'senza script, la pagina-ponte');
  assert.match(SRV, /registroDonazioni\.segna\(chiave, \{ login, fonte: 'ext'/, 'anche la chiave API passa dal registro');
});

test('il blocco «Sostieni» sul conto: un modulo col tema, che in anteprima non manda niente, e il grazie al ritorno', () => {
  const base = { attiva: true, blocchi: [{ tipo: 'sostieni', titolo: 'Un caffè', obiettivo: true }], tema: {} };
  const opz = { login: 'x', display: 'Xena', avatar: '', baseUrl: 'http://x' };
  const dati = { modo: 'conto', link: '', importi: [2, 5, 10], minimo: 2, massimo: 1500, conMessaggio: true, etichetta: 'Dona', messaggio: '', valuta: 'EUR', goal: null };
  const con = renderLinkPage(base, { ...opz, sostieni: dati });
  assert.ok(con.includes('<form class="sost-f" method="post" action="/dona/x">'), 'il modulo manda al nostro server');
  assert.ok(con.includes('<input type="radio" name="importo" value="5" checked>'), 'il secondo importo e\' quello proposto');
  assert.ok(con.includes('name="altro"') && con.includes('min="2"') && con.includes('max="1500"'), 'un altro importo, fra il minimo e il massimo dello streamer');
  assert.match(APP, /id="dona-massimo" min="1" max="5000"/, 'il massimo si sceglie nel pannello');
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
  const LPSRC = leggi('src/features/linkpagina.js');
  assert.ok(LPSRC.includes('2 1,auto!important}') && LPSRC.includes('16 15,pointer!important}'), 'il puntatore disegnato vince sui cursor dei pezzi scritti dopo');
  assert.ok(LPSRC.includes('input[type="radio"],input[type="checkbox"]') && LPSRC.includes('input:not([type="radio"])'), 'sugli interruttori a scelta la stella, il cursore di testo solo dove si scrive');
  assert.ok(!/https:\/\/[a-z.]*stripe/.test(leggi('src/features/linkpagina.js')), 'nessun host di Stripe nel codice della pagina: il CSP non cambia');
  assert.ok(PLJS.includes("document.querySelector('.sost-f')") && PLJS.includes("headers: { Accept: 'application/json' }") && PLJS.includes('location.href = x.j.url'), 'lo script manda via fetch e naviga da solo');
  assert.ok(PLJS.includes("if (f.getAttribute('data-anteprima')) return;"), 'e in anteprima si ferma');
  assert.match(leggi('src/features/linkpagina.js'), /pagina-link\.js\?v=11/, 'lo script cambia versione, cosi\' la cache lo ricarica');
});

test('le pagine di privacy e termini, e l\'informativa della pagina link, dicono come vanno i soldi e i dati', () => {
  const priv = leggi('src/web/public/privacy.html');
  assert.ok(priv.includes('<li><strong>Donazioni</strong>') && priv.includes('Stripe Payments Europe'), 'la privacy del sito');
  assert.ok(priv.includes('Donazioni (nome scelto, messaggio, importo, ora): <strong>un anno</strong>'), 'e per quanto');
  const term = leggi('src/web/public/termini.html');
  assert.ok(term.includes('sei tu l\'esercente') && term.includes('non custodisce fondi'), 'i termini: lo streamer e\' l\'esercente, SocialBot non tiene soldi');
  const inf = (sostieni, blocchi = []) => renderInformativa({ login: 'x', display: 'X', baseUrl: 'http://x', pagina: { tema: {}, blocchi }, contatto: '', sostieni });
  assert.ok(!inf(null).includes('<h2>Donazioni</h2>'), 'una pagina che non fa donare non parla di donazioni');
  const tutti = inf({ modo: 'conto', mezzi: ['stripe', 'satispay', 'kofi'], proprio: { da: 20 } }, [{ tipo: 'donatori' }]);
  assert.ok(tutti.includes('<h2>Donazioni</h2>') && tutti.includes('I soldi vanno a X, sul suo conto'), 'l\'informativa della pagina');
  assert.ok(tutti.includes('<strong>Stripe</strong>, sul conto di X') && tutti.includes('Con <strong>Satispay</strong>') && tutti.includes('pagina <strong>Ko-fi</strong> di X'), 'nomina ogni conto che la pagina usa');
  assert.ok(tutti.includes('il tuo indirizzo email: non lo salviamo'), 'e dice cosa manda Ko-fi e cosa ne facciamo');
  assert.ok(tutti.includes('Se alleghi un\'immagine') && tutti.includes('fra chi ha donato, qui in pagina'), 'l\'immagine allegata e il blocco dei nomi, se ci sono');
  const soloKofi = inf({ modo: 'conto', mezzi: ['kofi'], proprio: null });
  assert.ok(soloKofi.includes('<strong>Ko-fi</strong>') && !soloKofi.includes('<strong>Stripe</strong>') && !soloKofi.includes('Satispay') && !soloKofi.includes('Se alleghi'), 'e solo quelli');
  assert.ok(inf({ modo: 'link', mezzi: [] }).includes('ti porta su un altro sito'), 'un link esterno porta alla privacy di quel sito');
  assert.ok(priv.includes('collega <strong>Ko-fi</strong>, l\'indirizzo della sua pagina Ko-fi e l\'impronta del token') && priv.includes('Ko-fi Labs, Regno Unito') && priv.includes('Ko-fi ci manda anche l\'indirizzo email'), 'la privacy del sito dice Ko-fi');
  assert.ok(term.includes('o da <strong>Ko-fi</strong>') && term.includes('il token degli avvisi (Ko-fi)'), 'e i termini');
});

test('Ko-fi e\' un conto come gli altri: in alto nel pannello, un tasto nella pagina, e le sue donazioni contano come le altre', async () => {
  const D = await import('../../src/features/donazioni.js');
  assert.equal(D.kofiPagina('ko-fi.com/andryxify'), 'https://ko-fi.com/andryxify');
  assert.equal(D.kofiPagina('https://www.ko-fi.com/Andry_X/'), 'https://ko-fi.com/Andry_X');
  assert.equal(D.kofiPagina('@andryxify'), 'https://ko-fi.com/andryxify');
  for (const x of ['https://evil.com/ko-fi.com/x', 'ko-fi.com/../x', 'javascript:alert(1)', '']) assert.equal(D.kofiPagina(x), '', x);
  assert.deepEqual(D.statoKofi({ kofi: 'ko-fi.com/ab', kofiImp: 'h' }), { stato: 'pronto', pagina: 'https://ko-fi.com/ab', token: true });
  assert.equal(D.statoKofi({ kofi: 'ko-fi.com/ab' }).stato, 'meta', 'senza token e\' a meta\'');
  assert.equal(D.statoKofi({ kofiImp: 'h', kofi: '' }).stato, 'meta', 'senza pagina anche');
  assert.equal(D.statoKofi({ link: 'https://ko-fi.com/ab', kofiImp: 'h' }).stato, 'pronto', 'chi usava Ko-fi come link esterno lo trova gia\' collegato');
  assert.deepEqual(D.mezziDi({ kofi: 'ko-fi.com/ab', kofiImp: 'h' }, { stripe: { pronto: true } }), ['stripe', 'kofi']);
  assert.deepEqual(D.mezziDi({ kofi: 'ko-fi.com/ab' }, {}), [], 'a meta\' non e\' un mezzo');

  const prima = D.normDonazioni({ kofi: 'ko-fi.com/ab', kofiToken: 'segreto' }, {}, 'x');
  assert.equal(prima.kofi, 'https://ko-fi.com/ab');
  assert.ok(prima.kofiImp && prima.kofiImp !== 'segreto', 'del token resta l\'impronta');
  const dopo = D.normDonazioni({ attivo: true }, prima, 'x');
  assert.equal(dopo.kofi, 'https://ko-fi.com/ab', 'salvare il resto non scollega Ko-fi');
  assert.equal(dopo.kofiImp, prima.kofiImp);
  const via = D.normDonazioni({ kofiClear: true, kofiTokenClear: true }, dopo, 'x');
  assert.equal(via.kofi, ''); assert.equal(via.kofiImp, '');
  assert.equal(D.statoKofi({ ...via, link: 'https://ko-fi.com/ab' }).stato, 'nessuno', 'scollegato resta scollegato, anche con un vecchio link');

  const settings = { donazioni: { attivo: true, modo: 'conto', kofi: 'ko-fi.com/ab', kofiImp: 'h', valuta: 'EUR', proprio: { attivo: true, da: 5 } } };
  const dati = D.datiSostieni(settings, {});
  assert.deepEqual(dati.mezzi, ['kofi']); assert.equal(dati.kofi, 'https://ko-fi.com/ab');
  assert.equal(dati.proprio, null, 'l\'immagine si allega solo dove si paga dal modulo');
  const base = { attiva: true, blocchi: [{ tipo: 'sostieni', titolo: 'Un caffè' }], tema: {} };
  const opz = { login: 'x', display: 'X', avatar: '', baseUrl: 'http://x' };
  const solo = renderLinkPage(base, { ...opz, sostieni: dati });
  assert.ok(solo.includes('<a class="voce spicca sost-b" href="https://ko-fi.com/ab" target="_blank" rel="noopener nofollow">') && !solo.includes('<form class="sost-f"'), 'con Ko-fi soltanto il tasto porta a Ko-fi, senza un modulo che non servirebbe');
  const insieme = renderLinkPage(base, { ...opz, sostieni: { ...dati, mezzi: ['satispay', 'kofi'] } });
  assert.ok(insieme.includes('name="mezzo" value="satispay"') && insieme.includes('Oppure su Ko-fi'), 'accanto agli altri, il suo tasto');
  assert.ok(insieme.includes('Pagamento con l\'app Satispay.') && !insieme.includes('Apple Pay'), 'la nota dice il mezzo vero');

  const i = SRV.indexOf("app.post('/dona/kofi/:login'");
  const corpo = SRV.slice(i, SRV.indexOf('}));', i));
  assert.ok(corpo.indexOf('donazioni.KOFI_DONI.includes(d.tipo)') < corpo.indexOf('registroDonazioni.segna'), 'le vendite del negozio non sono donazioni');
  assert.ok(corpo.indexOf('registroDonazioni.segna') < corpo.indexOf("extRateOk('dona:'"), 'una donazione arrivata si scrive sempre: il tetto ferma solo gli avvisi');
  assert.deepEqual(D.KOFI_DONI, ['Donation', 'Subscription']);
  assert.equal(D.leggiKofi({ data: JSON.stringify({ verification_token: 't', amount: '3', from_name: 'Ada', message: 'ciao', is_public: false, type: 'Shop Order', email: 'a@b.c' }) }).messaggio, '', 'un messaggio privato resta privato');
  assert.ok(!JSON.stringify(D.leggiKofi({ data: JSON.stringify({ amount: '3', email: 'a@b.c' }) })).includes('a@b.c'), 'l\'email di chi dona non la teniamo nemmeno in mano');
  assert.ok(SRV.includes('const mezzi = donazioni.mezziDi(cfg, conti).filter((x) => donazioni.SUL_CONTO.includes(x));'), 'il modulo paga solo sui conti che incassano da li\'');
  assert.ok(SRV.includes("kofi: { ...donazioni.statoKofi("), 'il pannello legge lo stato di Ko-fi dal server');
  assert.match(APP, /\+ `<h3 class="spazio-sopra">Ko-fi<\/h3>` \+ _contoKofiHtml\(st\)/, 'nella carta in alto, dopo Stripe e Satispay');
  assert.ok(!APP.includes('id="dona-kofi-carta"'), 'la carta in fondo non c\'e\' piu\'');
  assert.match(APP, /data-dona="kofi-collega"/); assert.match(APP, /data-dona="kofi-scollega"/);
});

test('la valuta: l\'obiettivo e le offerte contano solo gli importi nella valuta dello streamer', () => {
  const settings = {
    donazioni: { attivo: true, valuta: 'EUR', livelli: [{ da: 5, nome: 'Wow', effetto: 'effetto:wow' }] },
    alerts: { attivo: true, donazione: { attivo: true, minImporto: 50 } },
  };
  const emessi = [], contati = [], effetti = [];
  const eng = new AlertsEngine({ effects: { emit: (ch, p) => emessi.push(p) }, say: () => {} });
  eng.cfg = () => settings;
  eng._contaGoal = (ch, kind, quanti) => contati.push(quanti);
  eng._sparaEffetto = (ch, e) => effetti.push(e);
  eng.donazione('prova', { user: 'Ada', importo: 10, valuta: 'USD' });
  assert.deepEqual(contati, [], 'dieci dollari non sono dieci euro');
  assert.deepEqual(effetti, [], 'e non raggiungono un\'offerta in euro');
  const a = emessi.find((p) => p.tipo === 'alert');
  assert.ok(a && a.testo.includes('$10'), 'l\'avviso parte lo stesso, con la sua valuta');
  eng.donazione('prova', { user: 'Bea', importo: 10, valuta: 'EUR' });
  assert.deepEqual(contati, [10]); assert.deepEqual(effetti, ['effetto:wow']);
});

test('«Prova l\'avviso» delle donazioni prova una donazione, e l\'alert Donazione accetta i suoi file', () => {
  assert.ok(SRV.includes("const ALERT_KINDS = ['follow', 'sub', 'cheer', 'raid', 'donazione'];"));
  assert.ok(SRV.includes("const kind = [...ALERT_KINDS, 'chat', 'ultimoFollower', 'ultimoSub'].includes(req.body?.kind) ? req.body.kind : null;"), 'una sola lista, e un evento sconosciuto non diventa un follow');
  assert.ok(SRV.includes("if (!ALERT_KINDS.includes(kind) && !perWidget) return errore('evento non valido');"));
});

test('il modulo guarda la pagina da cui parte: la pagina delle donazioni funziona anche a pagina link spenta', () => {
  assert.ok(SRV.includes("const p = (ritorno === 'dona' ? paginaDona : linkPage).get(login);"));
});

test('Satispay: le rotte hanno il loro guardiano o sono dichiarate, la ronda lo conosce, il blocco offre la scelta', () => {
  assert.match(SRV, /app\.post\('\/api\/donazioni\/satispay\/collega', requireOwner,/);
  assert.match(SRV, /app\.post\('\/api\/donazioni\/satispay\/scollega', requireOwner,/);
  assert.match(SRV, /app\.get\('\/dona\/satispay\/:login', wrap\(/, 'la callback e\' pubblica');
  assert.match(PORTE, /\['GET \/dona\/satispay\/:login', /, 'e dichiarata, col motivo');
  const cb = SRV.slice(SRV.indexOf("app.get('/dona/satispay/:login'"), SRV.indexOf("}));", SRV.indexOf("app.get('/dona/satispay/:login'")));
  assert.ok(cb.indexOf('res.json({ ok: true });') < cb.indexOf('donaSatispay.confermaPerRiferimento'), 'si risponde prima di lavorare');
  assert.ok(cb.includes("extRateOk('dona-cb:' + login)"), 'con un limite di frequenza');
  assert.match(SRV, /donaStripe\.avviaRonda\(donazioneArrivata, \{ satispay: donaSatispay\.conferma, fileVia: /, 'la ronda rilegge anche Satispay, e sa togliere i file');
  assert.ok(SRV.includes("if (/^sp_[0-9a-f]{16}$/.test(dona)) return donaSatispay.conferma(login, dona.slice(3));"), 'il ritorno sp_… e\' di Satispay');
  assert.ok(SRV.includes("const mezzo = mezzi.includes(String(req.body?.mezzo || '')) ? String(req.body.mezzo) : mezzi[0];"), 'il mezzo lo sceglie chi dona, fra quelli pronti');
  const SP = leggi('src/features/donazioni-satispay.js');
  assert.match(SP, /headers="\(request-target\) host date digest"/, 'la firma di Satispay');
  assert.match(SP, /flow: 'MATCH_CODE'/); assert.match(SP, /flow: 'REFUND'/);
  const base = { attiva: true, blocchi: [{ tipo: 'sostieni', titolo: 'Un caffè' }], tema: {} };
  const opz = { login: 'x', display: 'X', avatar: '', baseUrl: 'http://x' };
  const dati = { modo: 'conto', link: '', importi: [2, 5], minimo: 1, massimo: 500, conMessaggio: true, etichetta: 'Dona', messaggio: '', valuta: 'EUR', goal: null };
  const due = renderLinkPage(base, { ...opz, sostieni: { ...dati, mezzi: ['stripe', 'satispay'] } });
  assert.ok(due.includes('class="voce spicca sost-b" name="mezzo" value="stripe"'), 'il tasto principale paga con carta');
  assert.ok(due.includes('class="voce sost-b sost-b2" name="mezzo" value="satispay"') && due.includes('Oppure con Satispay'), 'e il secondo con Satispay');
  const solo = renderLinkPage(base, { ...opz, sostieni: { ...dati, mezzi: ['satispay'] } });
  assert.ok(solo.includes('class="voce spicca sost-b" name="mezzo" value="satispay"') && !solo.includes('class="voce sost-b sost-b2"'), 'con Satispay soltanto, un tasto solo');
  assert.ok(PLJS.includes("dati.set('mezzo', b.value)"), 'lo script manda il mezzo del tasto premuto');
  assert.match(APP, /id="dona-satispay-codice"/); assert.match(APP, /data-dona="satispay-collega"/);
  assert.ok(leggi('src/web/public/privacy.html').includes('Satispay Europe') && leggi('src/web/public/termini.html').includes('Satispay'), 'privacy e termini lo dicono');
});

test('la pagina delle donazioni: stessa forma, altro tavolo, stesso editor; le offerte accendono gli effetti', () => {
  assert.match(SRV, /app\.get\('\/dona\/:login', wrap\(/, 'la pagina pubblica');
  assert.match(PORTE, /\['GET \/dona\/:login', /, 'dichiarata pubblica');
  assert.ok(SRV.includes("res.redirect(302, donazioni.urlPaginaDona(login) + (q >= 0 ? req.url.slice(q) : ''));"), 'il vecchio /u/<login>/dona rimanda a quello vero, col ritorno del pagamento');
  assert.match(PORTE, /\['GET \/u\/:user\/dona', /, 'e resta dichiarato');
  for (const r of ["app.get('/api/paginadona', requireOwner,", "app.post('/api/paginadona', requireOwner,", "app.post('/api/paginadona/anteprima', requireOwner,", "app.delete('/api/paginadona', requireOwner,"]) assert.ok(SRV.includes(r), r);
  assert.ok(SRV.includes("SELECT channel, ts FROM pagina_dona WHERE attiva=1"), 'la sitemap la elenca');
  assert.ok(SRV.includes("const ritorno = String(req.body?.pagina || '') === 'dona' ? 'dona' : 'link';"), 'il modulo dice da dove torna');
  assert.ok(leggi('src/features/donazioni-stripe.js').includes("ritorno === 'dona' ? urlPaginaDona(login)") && leggi('src/features/donazioni-satispay.js').includes("ritorno === 'dona' ? urlPaginaDona(login)"), 'e tutti e due i mezzi tornano li\', anche con l\'indirizzo corto');
  assert.ok(SRV.includes("if (!config.donaHost || String(req.hostname || '').toLowerCase() !== config.donaHost) return next();") && SRV.includes("req.url = '/dona/' + m[1].toLowerCase()"), 'con il sottodominio, dona.<dominio>/<login> si traduce prima delle rotte, e il nome si legge a ogni richiesta');
  // La sonda e' una sola per tutti gli indirizzi corti (dona, sostieni): quello
  // che conta non e' come si chiama la funzione, e' che senza la variabile il
  // nome si provi da solo e si riprovi finche' non risponde.
  //
  // Prima qui c'era scritto «nel DNS», ed era la cosa sbagliata da fissare: il
  // DNS rispondeva benissimo mentre davanti a quel nome non c'era ancora un
  // certificato, e il sito offriva un link che dava «connessione non sicura».
  // Adesso si bussa all'indirizzo in HTTPS — il dettaglio sta in
  // test/contratto/indirizzo-vivo.test.mjs, qui basta che la sonda ci sia e
  // che accenda l'indirizzo delle donazioni.
  assert.ok(SRV.includes("const candidatoDona = !config.donaHost && !config.donaHostSpento ? donazioni.candidatoHost(config.baseUrl, 'dona') : '';"), 'il candidato si costruisce dal dominio del sito');
  assert.match(SRV, /const sondaHost = \(candidato, metti, come\) => \{[\s\S]*setTimeout\(prova, fra\)\.unref\?\.\(\)/,
    'senza DONA_HOST il nome si prova da solo, finche\' non risponde (il ritmo lo fissa test/contratto/indirizzo-vivo)');
  assert.match(SRV, /sondaHost\(candidatoDona, \(h\) => \{ config\.donaHost = h; \}/, 'e quando risponde, da quel momento si usa');
  assert.ok(leggi('src/config.js').includes("donaHostSpento: /^(no|off)$/i.test(env('DONA_HOST', ''))"), 'e si puo\' spegnere con DONA_HOST=no');
  assert.match(leggi('Caddyfile'), /^socialbot\.live,[^{]*\bdona\.socialbot\.live\b[^{]*\{/m, 'e Caddy conosce il nome');
  assert.match(APP, /const lpApi = \(\) => \(LP\.quale === 'dona' \? '\/api\/paginadona' : '\/api\/linkpage'\);/, 'un editor, due porte');
  assert.equal((APP.match(/api\(lpApi\(\)/g) || []).length, 4, 'carica, salva, spegni e anteprima passano dalla porta giusta');
  assert.ok(APP.includes("api(lpApi() + '/anteprima'"), 'anche l\'anteprima');
  assert.match(APP, /const _lpCasa = \(\) => \(LP\.quale === 'dona' \? 'lp-box-dona' : 'lp-box'\);/, 'ogni pagina ha la sua casa per l\'editor');
  assert.match(APP, /<div id="lp-box-dona">/, 'e quella delle donazioni sta nella scheda Donazioni');
  assert.match(APP, /if \(id === 'donazioni'\) \{ riempiDonazioni\(\); caricaStatoDonazioni\(true\); caricaPaginaLink\(false, 'dona'\); \}/, 'e li\' si apre');
  assert.ok(!/data-lpquale/.test(APP), 'niente interruttore fra le due pagine: ognuna si modifica da un posto solo');
  assert.match(APP, /id="dona-livelli"/); assert.match(APP, /class="dl-effetto"/, 'le offerte si compongono nel pannello, con l\'effetto dalla libreria');
  assert.match(AL, /const liv = livelloPer\(cfgD\.livelli, importo\); if \(liv\?\.effetto\) this\._sparaEffetto\(channel, liv\.effetto, 1200\);/, 'l\'offerta raggiunta accende il suo effetto, dall\'importo pagato');
  assert.ok(AL.includes("this.effects.emit(channel, this.effects.payload(channel, eff))"), 'con lo stesso payload del tasto Prova');
  // il blocco: le offerte al posto degli importi, il campo nascosto sulla pagina delle donazioni, il rimando dalla pagina link
  const base = { attiva: true, blocchi: [{ tipo: 'sostieni', titolo: 'Un caffè' }], tema: {} };
  const opz = { login: 'x', display: 'X', avatar: '', baseUrl: 'http://x' };
  const dati = { modo: 'conto', mezzi: ['stripe'], link: '', importi: [2, 5], minimo: 1, massimo: 500, livelli: [{ da: 5, nome: 'Applauso', effetto: 'effetto:clap' }, { da: 20, nome: '', effetto: '' }], conMessaggio: true, etichetta: 'Dona', messaggio: '', valuta: 'EUR', goal: null };
  const sulla = renderLinkPage(base, { ...opz, sostieni: dati, dona: true });
  assert.ok(sulla.includes('<input type="hidden" name="pagina" value="dona">'), 'sulla pagina delle donazioni il modulo dice da dove torna');
  assert.ok(sulla.includes('<span>5 € · Applauso</span>') && sulla.includes('<span>20 €</span>') && !sulla.includes('<span>2 €</span>'), 'le offerte al posto degli importi suggeriti');
  const link = renderLinkPage({ ...base, blocchi: [{ tipo: 'sostieni', pagina: true }] }, { ...opz, sostieni: dati });
  assert.ok(link.includes('<a class="voce spicca sost-b" href="/dona/x">') && !link.includes('<form class="sost-f"'), 'sulla pagina link, se lo streamer vuole, il tasto porta alla pagina delle donazioni');
  assert.ok(!renderLinkPage({ ...base, blocchi: [{ tipo: 'sostieni', pagina: true }] }, { ...opz, sostieni: dati, dona: true }).includes('href="/dona/x"'), 'ma sulla pagina delle donazioni il rimando non ha senso: resta il modulo');
});

test('l\'immagine di chi dona: entra dal modulo con limiti stretti, aspetta l\'ok nel registro, muore con la riga', () => {
  const DM = leggi('src/features/donazioni-media.js');
  assert.match(DM, /export const MIME_OK = \{ 'image\/png': 'png', 'image\/jpeg': 'jpg', 'image\/webp': 'webp', 'image\/gif': 'gif' \};/, 'solo immagini');
  assert.match(DM, /export const MAX_BYTE = 8 \* 1024 \* 1024;/); assert.match(DM, /export const MAX_IN_ATTESA = 30;/);
  assert.ok(DM.includes("join(config.dataDir, 'effects', String(login || '').toLowerCase())"), 'nella cartella degli effetti del canale: la serve la porta dell\'overlay, e conta nello spazio');
  assert.ok(DM.includes("if (!FILE_OK.test(String(file || ''))) return false;"), 'si toglie solo un file col nostro nome');
  // il modulo: multipart solo se serve, un file solo, piccolo, pulito su ogni uscita
  const modulo = SRV.slice(SRV.indexOf("const uploadDona = multer("), SRV.indexOf("app.post('/stripe/webhook'"));
  assert.ok(modulo.includes("limits: { fileSize: donaMedia.MAX_BYTE, files: 1, fields: 12, fieldSize: 2048 }"), 'un file, piccolo, pochi campi');
  assert.ok(modulo.includes("app.post('/dona/:login', express.urlencoded({ extended: false, limit: '8kb' }), conFileDono, wrap("), 'la porta e\' la stessa di sempre');
  assert.ok(modulo.includes("if (stato !== 200 && req.file) pulisciTemp(req.file.path);"), 'ogni risposta che non e\' un pagamento aperto toglie il temporaneo');
  assert.ok(modulo.includes("if (!pr.attivo) return rispondi(400,") && modulo.includes("if (!donazioni.mediaAmmesso(cfg, m.importoCent / 100)) return rispondi(400,") && modulo.includes("if (!donaMedia.mimeOk(req.file.mimetype)) return rispondi(400,"), 'spenta, sotto la soglia o non immagine: si rifiuta con una frase chiara');
  assert.ok(modulo.includes("registroDonazioni.mediaInAttesa(login) >= donaMedia.MAX_IN_ATTESA"), 'e un tetto di file in attesa per canale');
  assert.ok(modulo.includes("if (media) await donaMedia.togli(login, media.file);"), 'se il pagamento non si apre, il file va via');
  // all'arrivo vale l'importo pagato
  const arrivo = SRV.slice(SRV.indexOf("function donazioneArrivata(login, d) {"), SRV.indexOf("const payloadDono ="));
  assert.ok(arrivo.includes("if (!donazioni.mediaAmmesso(cfg, d.importo)) {") && arrivo.includes("registroDonazioni.mediaVia(r.id)"), 'sotto la soglia pagata il file va via');
  assert.ok(arrivo.includes("if (donazioni.proprioOk(cfg.proprio).subito && registroDonazioni.mediaOk(login, r.id)) manager.alerts?.effettoDono(login, payloadDono(login, r), 1200);"), 'da sola solo se lo streamer lo vuole, e una volta sola');
  assert.ok(SRV.includes("fileVia: (x) => donaMedia.togli(x.login, x.media)"), 'la ronda toglie i file delle scadute e delle vecchie');
  // il registro: coda, azioni, eliminazione col file
  assert.ok(SRV.includes("daApprovare: registroDonazioni.mediaDaApprovare(login).map((r) => ({ ...rigaDonazione(r), url: effects.mediaUrl(login, r.media), tipo: r.media_tipo }))"), 'la coda arriva al pannello con l\'anteprima');
  for (const c of ['manda', 'scarta', 'rieffetto']) assert.ok(SRV.includes(`if (cosa === '${c}') {`), 'azione ' + c);
  assert.ok(SRV.includes("if (r.media) await donaMedia.togli(login, r.media);\n      registroDonazioni.elimina(login, id);"), 'eliminare la riga toglie anche il file');
  assert.match(APP, /id="dona-proprio-attivo"/); assert.match(APP, /id="dona-proprio-da" min="1" max="5000"/); assert.match(APP, /id="dona-proprio-durata" min="2" max="15"/); assert.match(APP, /id="dona-proprio-subito"/);
  assert.match(APP, /data-dona-riga="manda"/); assert.match(APP, /data-dona-riga="scarta"/); assert.match(APP, /data-dona-riga="rieffetto"/);
  assert.ok(!APP.includes('dona-proprio-volume'), 'niente volume: una GIF e\' muta');
  // il blocco: il campo file solo se la funzione e' accesa, e il modulo diventa multipart solo allora
  const base = { attiva: true, blocchi: [{ tipo: 'sostieni', titolo: 'Un caffè' }], tema: {} };
  const opz = { login: 'x', display: 'X', baseUrl: 'https://s.live' };
  const dati = { modo: 'conto', mezzi: ['stripe'], importi: [2, 5], minimo: 1, massimo: 500, conMessaggio: true, valuta: 'EUR', proprio: { da: 20, durata: 6 } };
  const con = renderLinkPage(base, { ...opz, sostieni: dati });
  assert.ok(con.includes('<form class="sost-f" method="post" action="/dona/x" enctype="multipart/form-data">'));
  assert.ok(con.includes('<input type="file" name="media" accept="image/png,image/jpeg,image/webp,image/gif" data-da="20">'));
  assert.ok(con.includes('Da 20 € in su puoi allegare un\'immagine o una GIF (fino a 8 MB)'), 'la soglia si legge nel modulo');
  const senza = renderLinkPage(base, { ...opz, sostieni: { ...dati, proprio: null } });
  assert.ok(senza.includes('<form class="sost-f" method="post" action="/dona/x">') && !senza.includes('name="media"'), 'spenta: il modulo di sempre');
  const stile = con.slice(con.indexOf('<style>'), con.indexOf('</style>'));
  assert.ok(stile.includes('.sost-file input::file-selector-button{'), 'il tasto del file veste il tema');
  const cur = renderLinkPage({ ...base, tema: { cursore: 'disegnato' } }, { ...opz, sostieni: dati });
  assert.ok(/input\[type="file"\],select\{cursor:url\(/.test(cur) && cur.includes(':not([type="file"]),textarea,[contenteditable="true"]{cursor:text!important}'), 'il puntatore disegnato resta anche sul campo file');
  assert.ok(PLJS.includes("var dati = allegato ? new FormData(f) : new URLSearchParams(new FormData(f));") && PLJS.includes("MIME.indexOf(allegato.type) < 0") && PLJS.includes("allegato.size > 8 * 1024 * 1024"), 'lo script manda il file come multipart, e controlla prima tipo e peso');
  assert.ok(PLJS.includes("file.disabled = !ok;"), 'sotto la soglia il campo si spegne');
  assert.ok(!leggi('src/features/donazioni.js').includes('volume'), 'la configurazione non ha un volume');
  assert.match(leggi('src/db.js'), /media_stato TEXT NOT NULL DEFAULT ''/);
});

test('il blocco «Chi ha donato»: i nomi dal registro solo se la pagina lo mostra, e il modulo lo dice prima', () => {
  const opz = { login: 'x', display: 'X', baseUrl: 'https://s.live' };
  const dati = { modo: 'conto', mezzi: ['stripe'], importi: [2, 5], minimo: 1, massimo: 500, conMessaggio: true, valuta: 'EUR' };
  const donatori = { ultimi: [{ nome: 'Anna', importo: 2500, valuta: 'EUR' }, { nome: '', importo: 500, valuta: 'EUR' }], mese: [{ nome: 'Anna', somma: 3500, valuta: 'EUR' }], sempre: [{ nome: 'Anna', somma: 9000, valuta: 'EUR' }, { nome: 'Luca', somma: 100, valuta: 'EUR' }] };
  const con = (blocchi, extra = {}) => renderLinkPage({ attiva: true, blocchi, tema: {} }, { ...opz, sostieni: dati, donatori, ...extra });
  const ultimi = con([{ tipo: 'donatori', titolo: 'Grazie a', quanti: 5, modo: 'ultimi', periodo: 'sempre' }]);
  assert.ok(ultimi.includes('<span class="sost-t">Grazie a</span>') && ultimi.includes('<span class="dnt-n">Anna</span><span class="dnt-i">25 €</span>') && ultimi.includes('<span class="dnt-n">Qualcuno</span><span class="dnt-i">5 €</span>'), 'gli ultimi, con l\'importo; senza nome, qualcuno');
  assert.ok(!ultimi.slice(ultimi.indexOf('<ol class="dnt-l">')).includes('dnt-p'), 'gli ultimi non hanno un posto in classifica');
  const top = con([{ tipo: 'donatori', quanti: 3, modo: 'top', periodo: 'sempre' }]);
  assert.ok(top.includes('<span class="dnt-p">1</span><span class="dnt-n">Anna</span><span class="dnt-i">90 €</span>') && top.includes('<span class="dnt-p">2</span><span class="dnt-n">Luca</span>'), 'i primi per somma, numerati');
  assert.ok(con([{ tipo: 'donatori', quanti: 3, modo: 'top', periodo: 'mese' }]).includes('35 €'), 'del mese');
  assert.equal((con([{ tipo: 'donatori', quanti: 1, modo: 'ultimi' }]).match(/<li class="dnt-r">/g) || []).length, 1, 'quanti vale');
  assert.ok(con([{ tipo: 'donatori', quanti: 5 }], { donatori: { ultimi: [], mese: [], sempre: [] } }).includes('Ancora nessuno: potresti essere il primo.'), 'vuoto: una riga onesta');
  assert.ok(con([{ tipo: 'donatori', quanti: 5 }], { donatori: null, anteprima: true }).includes('chi ha donato: i nomi compaiono con le prime donazioni'), 'in anteprima senza nomi, il segnaposto');
  assert.ok(con([{ tipo: 'sostieni', titolo: 'Un caffè' }, { tipo: 'donatori', quanti: 5 }]).includes('Il nome che scrivi può comparire fra chi ha donato, qui in pagina.'), 'il modulo avvisa quando il blocco c\'e\'');
  assert.ok(!con([{ tipo: 'sostieni', titolo: 'Un caffè' }]).includes('può comparire fra chi ha donato'), 'e tace quando non c\'e\'');
  assert.ok(SRV.includes("const donatoriPer = (login, blocchi) => (Array.isArray(blocchi) && blocchi.some((b) => b && b.tipo === 'donatori') ? registroDonazioni.donatori(login) : null);"), 'il registro si legge solo se serve');
  assert.equal((SRV.match(/donatori: donatoriPer\(login, (p|finta)\.blocchi\)/g) || []).length, 4, 'le due pagine e le due anteprime');
  assert.match(APP, /data-lpadd="donatori"/); assert.match(APP, /donatori: \{ tipo: 'donatori', titolo: '', quanti: 5, modo: 'ultimi', periodo: 'sempre' \}/);
  assert.ok(leggi('src/db.js').includes("'sostieni', 'donatori']"), 'e\' un tipo di blocco');
});

test('la pagina delle donazioni dice il suo indirizzo vero: canonical e og:url col nome corto, titolo suo', () => {
  const opz = { login: 'x', display: 'X', baseUrl: 'https://s.live', sostieni: { modo: 'conto', mezzi: ['stripe'], importi: [2], minimo: 1, massimo: 500, valuta: 'EUR' } };
  const pag = { attiva: true, blocchi: [{ tipo: 'sostieni' }], tema: {} };
  const corta = renderLinkPage(pag, { ...opz, dona: true, urlDona: 'https://dona.s.live/x' });
  assert.ok(corta.includes('<link rel="canonical" href="https://dona.s.live/x">') && corta.includes('<meta property="og:url" content="https://dona.s.live/x">') && corta.includes('· sostienimi</title>'));
  const lunga = renderLinkPage(pag, { ...opz, dona: true });
  assert.ok(lunga.includes('<link rel="canonical" href="https://s.live/dona/x">'), 'senza nome corto, /dona/<login>');
  const link = renderLinkPage(pag, { ...opz, urlDona: 'https://dona.s.live/x' });
  assert.ok(link.includes('<link rel="canonical" href="https://s.live/u/x">') && link.includes('· i miei link</title>'), 'la pagina link resta la pagina link');
  assert.equal((SRV.match(/urlDona: donazioni\.urlPaginaDona\(login\)/g) || []).length, 4, 'le due pagine e le due anteprime sanno l\'indirizzo corto');
});
