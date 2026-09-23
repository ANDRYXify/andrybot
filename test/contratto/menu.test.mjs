// IL MENU E' UNO SOLO, E SI MOSTRA SECONDO LO SPAZIO.
//
// Il ragionamento sta in docs/MOBILE.md («Il menu: uno solo, due modi di
// mostrarlo»). Qui le cose che devono restare vere senza aprire un browser (quello
// lo fa scripts/verifica-barra.mjs):
//  · non c'e' un secondo elenco: la barra a tendine in alto e la sua misura non
//    esistono piu';
//  · la voce accesa ha una regola sola, per il disegno e per il cambio scheda;
//  · la soglia del menu di lato e' la stessa per il foglio di stile e per il
//    codice che chiude il cassetto;
//  · di lato non c'e' niente che serva solo al cassetto; nello Studio il menu
//    torna cassetto, perche' li' la larghezza e' della tela;
//  · con la tastiera si salta il menu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUB = join(RAD, 'src/web/public');
const APP = readFileSync(join(PUB, 'app.js'), 'utf8');
const CSS = readFileSync(join(PUB, 'style.css'), 'utf8');
const HTML = readFileSync(join(PUB, 'index.html'), 'utf8');

const funzione = (nome) => {
  const i = APP.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `c'e' ${nome}`);
  return APP.slice(i, APP.indexOf('\n}\n', i));
};

test('il menu e\' uno solo: niente barra a tendine, niente seconda misura', () => {
  assert.ok(!HTML.includes('nav-top'), 'la pagina non ha piu\' la barra a tendine');
  for (const via of ['navTopHtml', 'misuraBarraTop', 'barra-stretta', 'chiudiMenuTop', "getElementById('nav-top')"]) {
    assert.ok(!APP.includes(via), `${via} e' sparito`);
  }
  assert.ok(!/\.nav-top|\.grp-menu|barra-stretta/.test(CSS), 'e anche il suo stile');
});

test('la voce accesa ha una regola sola, e lo dice anche a chi non vede', () => {
  const d = funzione('navDrawerHtml');
  const a = funzione('aggiornaStatoNav');
  assert.ok(d.includes('voceAttiva(id, schedaAttiva)') && d.includes('aria-current="page"'), 'il disegno del menu usa la regola');
  assert.ok(a.includes('voceAttiva(b.dataset.scheda, id)') && a.includes("setAttribute('aria-current', 'page')") && a.includes("removeAttribute('aria-current')"),
    'il cambio di scheda usa la stessa, e toglie il segno a chi non e\' piu\' accesa');
  assert.ok(funzione('voceAttiva').includes('f.parti.includes(voce)'), 'una scheda sorella accende la voce della famiglia');
});

test('la soglia del menu di lato e\' la stessa per lo stile e per il codice', () => {
  const js = /const MENU_DI_LATO = '\(min-width: ([0-9.]+rem)\)';/.exec(APP);
  assert.ok(js, 'il codice sa quando il menu sta di lato');
  const css = /@media \(min-width: ([0-9.]+rem)\) \{\n {2}body\.con-nav \{ --lato: /.exec(CSS);
  assert.ok(css, 'lo stile mette il menu di lato');
  assert.equal(js[1], css[1], 'una soglia sola: se divergono, fra le due il cassetto resta aperto di lato');
  assert.match(APP, /matchMedia\(MENU_DI_LATO\)\.addEventListener\('change', \(ev\) => \{ if \(ev\.matches\) chiudiMenuMobile\(\); \}\)/,
    'allargando la finestra il cassetto aperto si chiude');
});

test('di lato non c\'e\' niente che serva solo al cassetto; nello Studio il menu torna cassetto', () => {
  const i = CSS.indexOf('@media (min-width: 64rem) {');
  const blocco = CSS.slice(i, CSS.indexOf('\n}\n', i));
  for (const via of ['.apri-menu', '.backdrop', '.drawer-testa']) {
    assert.ok(blocco.includes(`body.con-nav:not(.banco-on) ${via}`), `di lato ${via} non si vede`);
  }
  assert.ok(blocco.includes('body.con-nav .drawer-utente { display: none; }'), 'gli strumenti stanno in alto, non nel cassetto');
  assert.match(blocco, /body\.con-nav:not\(\.banco-on\) \.drawer \{[^}]*transform: none;/, 'il menu di lato sta fermo');
  assert.match(blocco, /body\.con-nav:not\(\.banco-on\) \.area-principale \{ margin-left: var\(--lato\); \}/, 'e non copre il contenuto');
  assert.match(blocco, /body\.con-nav \.top-strumenti \{ display: flex; \}/, 'gli strumenti tornano in alto');
  assert.ok(blocco.includes('body.con-nav.banco-on .apri-menu { margin-left: .5rem; }'),
    'nello Studio il menu e\' il cassetto, e il suo tasto sta accanto agli strumenti: la larghezza va alla tela');
});

test('con la tastiera si salta il menu', () => {
  assert.match(HTML, /<a class="salta" id="salta" href="#contenuto">/);
  assert.match(HTML, /<div class="contenuto" id="contenuto">/, 'il salto porta al contenuto');
  assert.ok(funzione('render').includes("L('Vai al contenuto', 'Skip to content', 'Ir al contenido')"), 'nella lingua del pannello');
  assert.match(CSS, /\.salta:focus \{ top: /, 'e si vede quando lo raggiungi');
});
