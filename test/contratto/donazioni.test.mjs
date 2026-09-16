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
const { renderLinkPage } = await import('../../src/features/linkpagina.js');
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
  const con = renderLinkPage(base, { ...opz, sostieni: { link: 'https://ko-fi.com/x', etichetta: 'Offrimi un caffè', messaggio: 'grazie di cuore', valuta: 'EUR', goal: { ora: 32.5, meta: 200, titolo: 'Nuovo microfono' } } });
  assert.ok(con.includes('class="sost"'));
  assert.ok(con.includes('href="https://ko-fi.com/x"') && con.includes('rel="noopener nofollow"'), 'il tasto porta al link, come un link esterno');
  assert.ok(con.includes('Offrimi un caffè') && con.includes('grazie di cuore') && con.includes('Nuovo microfono'));
  assert.ok(con.includes('32,50 €') && con.includes('/ 200 €') && con.includes('--q:0.1625'), 'la cifra e la barra dell\'obiettivo');
  assert.ok(con.includes('class="voce spicca sost-b"'), 'il tasto e\' in evidenza, col tema');
  const stile = con.slice(con.indexOf('<style>'), con.indexOf('</style>'));
  assert.ok(stile.includes('.sost{') && stile.includes('.sost-gb i{'), 'il foglio della pagina lo veste');
  const conAnim = renderLinkPage({ ...base, tema: { anim: 'rise' } }, { ...opz, sostieni: { link: 'https://ko-fi.com/x', etichetta: 'x', messaggio: '', valuta: 'EUR', goal: null } });
  const stileAnim = conAnim.slice(conAnim.indexOf('<style>'), conAnim.indexOf('</style>'));
  assert.ok(stileAnim.includes('.marq,.sost{animation:ent'), 'entra come gli altri blocchi quando la pagina ha un\'entrata');
  assert.ok(stileAnim.includes(',.bl,.sost)'), 'e lo scorrimento lo rivela come gli altri');
  const senzaGoal = renderLinkPage({ ...base, blocchi: [{ tipo: 'sostieni', obiettivo: false }] }, { ...opz, sostieni: { link: 'https://ko-fi.com/x', etichetta: '', messaggio: '', valuta: 'EUR', goal: { ora: 1, meta: 2 } } });
  assert.ok(!senzaGoal.includes('sost-g"') && senzaGoal.includes('>Sostieni<'), 'l\'obiettivo si puo\' nascondere; il tasto senza testo si chiama Sostieni');
});

test('il webhook e\' un ingresso dichiarato, verificato con l\'impronta, e il token non arriva mai al browser', () => {
  assert.match(VT, /'\/dona\/',\s+\/\/ Ko-fi/, 'fra gli ingressi esterni');
  assert.match(VT, /'\/dona\/',\s+\/\/ webhook delle donazioni/, 'e fra le rotte aperte');
  assert.match(SRV, /app\.post\('\/dona\/kofi\/:login', express\.urlencoded\(\{ extended: false, limit: '64kb' \}\)/, 'Ko-fi manda un modulo, non JSON');
  assert.match(SRV, /!combacia\(d\.token, st\.donazioni\.kofiImp, login\)\) return res\.status\(401\)/, 'senza token giusto: 401');
  const i = SRV.indexOf("app.post('/dona/kofi/:login'");
  const corpo = SRV.slice(i, SRV.indexOf('}));', i));
  assert.ok(corpo.indexOf('res.json({ ok: true });') < corpo.indexOf('manager.alerts?.donazione'), 'si risponde prima di lavorare');
  assert.ok(corpo.includes("donazioni.nuova('kofi:' + login + ':' + d.id)"), 'i doppioni si scartano');
  assert.match(SRV, /donazioni: \{ \.\.\.dn, kofiImp: '', kofiSet: true \}/, '/api/me maschera l\'impronta');
  assert.match(SRV, /out\.donazioni = donazioni\.normDonazioni\(b\.donazioni, s\.settings\?\.donazioni, user\.login\);/, 'le impostazioni passano dalla pulizia');
  assert.match(SRV, /if \(azione === 'donazione'\) \{/, 'la chiave API del canale accetta una mancia');
  assert.ok((SRV.match(/sostieni: donazioni\.datiSostieni\(s\?\.settings\)/g) || []).length === 2, 'la pagina pubblica e l\'anteprima ricevono gli stessi dati');
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
