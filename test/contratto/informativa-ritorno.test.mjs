// UN'USCITA CHE PORTA DA UN'ALTRA PARTE E' UN VICOLO CIECO TRAVESTITO.
//
// Le pagine pubbliche sono due — quella dei link e quella delle donazioni — e
// vivono su due indirizzi diversi. Ognuna ha la sua informativa, e in fondo
// all'informativa c'e' «Torna alla pagina». Per mesi quel tasto ha riportato
// sempre alla pagina dei link: chi era arrivato dalle donazioni si ritrovava
// altrove, e non aveva modo di tornare indietro se non col tasto del browser.
//
// Il difetto non era il tasto: era che l'informativa non sapeva di CHI fosse.
// Adesso glielo dice la rotta da cui arriva — l'unica cosa che lo sa per certo
// — e l'indirizzo del ritorno e' INTERO, perche' un percorso relativo su un
// altro host punta a un altro posto senza che nessuno se ne accorga.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-informativa-');
const { renderLinkPage, renderInformativa } = await import('../../src/features/linkpagina.js');
process.on('exit', () => usaEGetta.pulisci());

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');

const BASE = 'https://socialbot.live';
const DONA = 'https://dona.socialbot.live/tizio';
const PAGINA = { attiva: true, template: 'minimal', tema: {}, headline: 'Tizio', blocchi: [] };
const comuni = { login: 'tizio', display: 'Tizio', baseUrl: BASE };

test('l\'informativa della pagina link riporta alla pagina link', () => {
  const h = renderInformativa({ ...comuni, pagina: PAGINA, quale: 'link', urlTorna: `${BASE}/u/tizio` });
  assert.match(h, new RegExp(`class="torna" href="${BASE}/u/tizio"`));
  assert.ok(!/delle donazioni/.test(h), 'e non parla di donazioni a chi non ci e\' passato');
});

test('l\'informativa della pagina delle donazioni riporta LI\', e con l\'indirizzo intero', () => {
  const h = renderInformativa({ ...comuni, pagina: PAGINA, quale: 'dona', urlTorna: DONA });
  assert.match(h, new RegExp(`class="torna" href="${DONA}"`), 'torna alle donazioni');
  assert.match(h, /Torna alla pagina delle donazioni/, 'e lo dice, cosi\' si sa dove si va');
  assert.ok(!/href="\/u\/tizio"/.test(h), 'niente percorsi relativi: su un altro host porterebbero altrove');
});

test('ogni pagina manda alla PROPRIA informativa, non a quella dell\'altra', () => {
  const link = renderLinkPage(PAGINA, { ...comuni });
  assert.match(link, /href="\/u\/tizio\/privacy"/);
  assert.ok(!link.includes('/dona/'), 'la pagina link non manda all\'informativa delle donazioni');

  const dona = renderLinkPage(PAGINA, { ...comuni, dona: true, urlDona: DONA });
  assert.match(dona, new RegExp(`href="${DONA}/privacy"`));
  assert.ok(!/href="\/u\/tizio\/privacy"/.test(dona), 'e viceversa');
});

test('dalla pagina delle donazioni si torna a casa sua, e solo se casa c\'è', () => {
  // Chi arriva da un link diretto non ha mai visto la pagina dello streamer:
  // senza questa riga non saprebbe nemmeno che esiste.
  const con = renderLinkPage(PAGINA, { ...comuni, dona: true, urlDona: DONA, urlLink: `${BASE}/u/tizio` });
  assert.match(con, new RegExp(`href="${BASE}/u/tizio">I link di Tizio`));

  const senza = renderLinkPage(PAGINA, { ...comuni, dona: true, urlDona: DONA, urlLink: '' });
  assert.ok(!/I link di Tizio/.test(senza), 'e se quella pagina non c\'è o è spenta, il link non compare');

  const normale = renderLinkPage(PAGINA, { ...comuni, urlLink: `${BASE}/u/tizio` });
  assert.ok(!/I link di Tizio/.test(normale), 'sulla pagina link non ci va: sei già lì');
});

test('il server ha una rotta per ognuna, e l\'indirizzo corto le serve tutte e due', () => {
  assert.match(SRV, /app\.get\('\/u\/:user\/privacy'/, 'l\'informativa della pagina link');
  assert.match(SRV, /app\.get\('\/dona\/:user\/privacy'/, 'e quella delle donazioni, che e\' una rotta sua');
  // il verso non arriva dal browser: lo decide la rotta
  assert.match(SRV, /quale: 'link', urlTorna: `\$\{config\.baseUrl\}\/u\/\$\{login\}`/);
  assert.match(SRV, /quale: 'dona', urlTorna: donazioni\.urlPaginaDona\(login\)/);
  assert.match(SRV, /const m = \/\^\\\/\(\[a-z0-9_\]\{1,30\}\)\(\\\/privacy\)\?\\\/\?\$\/i\.exec\(req\.path\)/,
    'sull\'indirizzo corto passa anche /nome/privacy, sennò «Privacy» da lì dentro cadrebbe nel vuoto');
  assert.match(SRV, /urlLink: linkPage\.get\(login\)\?\.attiva \? `\$\{config\.baseUrl\}\/u\/\$\{login\}` : ''/,
    'e il link a casa si passa solo se casa e\' accesa');
});

test('l\'informativa della pagina delle donazioni usa il tema di QUELLA pagina', () => {
  // Prima si prendeva sempre quello della pagina link: si apriva l'informativa
  // e sembrava di essere finiti su un altro sito.
  const i = SRV.indexOf("app.get('/dona/:user/privacy'");
  const corpo = SRV.slice(i, i + 900);
  assert.match(corpo, /const p = paginaDona\.get\(login\)/, 'legge la pagina delle donazioni');
  assert.match(corpo, /pagina: p/, 'e da\' a lei il tema');
});
