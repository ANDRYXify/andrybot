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
//  · con la tastiera si salta il menu;
//  · il timbro della voce accesa vince su ogni regola che veste le voci.
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
const ANIME = readFileSync(join(PUB, 'anime.css'), 'utf8');

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
  const css = /@media \(min-width: ([0-9.]+rem)\) \{\n {2}body\.con-nav \{ --largo-menu: 15rem; --lato: var\(--largo-menu\); \}/.exec(CSS);
  assert.ok(css, 'lo stile mette il menu di lato');
  assert.equal(js[1], css[1], 'una soglia sola: se divergono, fra le due il cassetto resta aperto di lato');
  assert.match(APP, /matchMedia\(MENU_DI_LATO\)\.addEventListener\('change', \(ev\) => \{ if \(ev\.matches\) chiudiMenuMobile\(\); \}\)/,
    'allargando la finestra il cassetto aperto si chiude');
});

test('di lato non c\'e\' niente che serva solo al cassetto; a tutto schermo il menu torna cassetto', () => {
  const i = CSS.indexOf('@media (min-width: 64rem) {');
  const blocco = CSS.slice(i, CSS.indexOf('\n}\n', i));
  for (const via of ['.apri-menu', '.backdrop', '.drawer-testa']) {
    assert.ok(blocco.includes(`body.con-nav:not(.tutto-schermo) ${via}`), `di lato ${via} non si vede`);
  }
  assert.ok(blocco.includes('body.con-nav .drawer-utente { display: none; }'), 'gli strumenti stanno in alto, non nel cassetto');
  assert.match(blocco, /body\.con-nav:not\(\.tutto-schermo\) \.drawer \{[^}]*transform: none;/, 'il menu di lato sta fermo');
  assert.match(blocco, /body\.con-nav:not\(\.tutto-schermo\) \.area-principale \{ margin-left: var\(--lato\); \}/, 'e non copre il contenuto');
  assert.match(blocco, /body\.con-nav \.top-strumenti \{ display: flex; \}/, 'gli strumenti tornano in alto');
  assert.ok(blocco.includes('body.con-nav.tutto-schermo .apri-menu { order: -1; margin-left: 0; }'),
    'a tutto schermo il menu e\' il cassetto, e il suo tasto sta a sinistra, dalla parte dove si apre');
  assert.ok(blocco.includes('body.con-nav.tutto-schermo { --lato: 0px; --bordo-menu: 20px; }'), 'e la larghezza che teneva il menu torna alla pagina');
  assert.ok(!/banco-on/.test(blocco), 'lo Studio non toglie il menu da solo: lo decide chi lavora');
});

test('il tutto schermo: solo nelle pagine larghe, lo sceglie chi lavora, e fuori di li\' il menu torna', () => {
  assert.match(APP, /const SCHEDE_LARGHE = new Set\(\['alert', 'grafiche', 'pagina', 'donazioni'\]\);/);
  const applica = funzione('applicaSchermo');
  assert.ok(applica.includes("const on = SCHEDE_LARGHE.has(schedaAttiva) && schermoPienoScelto();"), 'vale solo in quelle pagine, e solo se lo hai scelto');
  assert.ok(applica.includes("document.body.classList.toggle('tutto-schermo', on);"));
  assert.ok(funzione('aggiornaTestataPagina').includes('applicaSchermo();'), 'a ogni cambio di scheda si ricalcola: uscendo, il menu torna di lato');
  assert.ok(funzione('tastoSchermoHtml').includes('id="pt-schermo" aria-pressed="false"'), 'il tasto dice se e\' premuto');
  assert.ok(funzione('cambiaSchermo').includes("localStorage.setItem(_chiaveSchermo(schedaAttiva), on ? '1' : '0')"), 'la scelta si ricorda, per quella scheda');
  // Una scelta sola per tutte le pagine larghe voleva dire che il tutto schermo
  // acceso in Donazioni si accendeva anche in Pagina link: ogni scheda ha la sua.
  assert.ok(/const _chiaveSchermo = \(id\) => 'schermoPieno:' \+ id;/.test(APP) && funzione('schermoPienoScelto').includes('localStorage.getItem(_chiaveSchermo(id))'),
    'accenderlo in una pagina non lo accende nelle altre');
  assert.ok(!/requestFullscreen/.test(APP), 'non e\' lo schermo intero del browser: si toglie solo il menu');
});

test('a tutto schermo il menu sta sul bordo: compare dopo una sosta, si disegna a strati e si disfa prima di sparire', () => {
  assert.match(HTML, /<div class="bordo-menu" id="bordo-menu" aria-hidden="true"><\/div>/, 'la colonna del bordo');
  const i = CSS.indexOf('@media (min-width: 64rem) {');
  const blocco = CSS.slice(i, CSS.indexOf('\n}\n', i));
  assert.ok(blocco.includes('body.con-nav.tutto-schermo { --lato: 0px; --bordo-menu: 20px; }'), 'venti pixel di bordo');
  assert.ok(blocco.includes('padding-left: max(var(--margine-pagina), calc(var(--bordo-menu) + .6rem));'), 'e la pagina non ci entra: passando sui livelli non si apre per sbaglio');
  assert.match(blocco, /body\.con-nav\.tutto-schermo \.drawer \{[^}]*transform: none; transition: none; visibility: hidden;/, 'il cassetto non scivola: compare dov\'e\'');
  assert.ok(blocco.includes('body.con-nav.tutto-schermo.menu-aperto .drawer { visibility: visible; }'));
  const DIS = readFileSync(new URL('../../src/web/public/disegno.js', import.meta.url), 'utf8');
  assert.ok(DIS.includes("if (posato && cassetto) chiedi(cassetto, { veloce: true });"), 'prima il contorno del cassetto');
  assert.ok(DIS.includes("chiedi(g, { da: (posato ? 140 : 60) + j * PASSO_FILA, veloce: true });"), 'poi i gruppi, uno dopo l\'altro');
  assert.ok(DIS.includes('viaMenu: viaMenu'), 'e sa disfarlo, dicendo quanto ci mette');
  const chiudi = funzione('chiudiMenuMobile');
  assert.ok(chiudi.includes("window.SB_DISEGNO?.viaMenu?.()") && chiudi.includes("_viaMenu = setTimeout(() => { _viaMenu = 0; document.body.classList.remove('menu-aperto'); }, dura);"), 'sparisce solo quando il disegno e\' tornato indietro');
  assert.match(APP, /const SOSTA_BORDO_MS = \d+;/, 'una sosta sul bordo prima di aprire');
});

test('con la tastiera si salta il menu', () => {
  assert.match(HTML, /<a class="salta" id="salta" href="#contenuto">/);
  assert.match(HTML, /<div class="contenuto" id="contenuto">/, 'il salto porta al contenuto');
  assert.ok(funzione('render').includes("L('Vai al contenuto', 'Skip to content', 'Ir al contenido')"), 'nella lingua del pannello');
  assert.match(CSS, /\.salta:focus \{ top: /, 'e si vede quando lo raggiungi');
});

test('il timbro della voce accesa vince su ogni regola che veste le voci', () => {
  // Nel gruppo «Canale» le voci sono bottoni, e anime.css toglie loro sfondo e
  // bordo (`.drawer-canali .drawer-voce`). A pari peso vince chi e' caricato
  // dopo, e anime.css viene dopo style.css: la voce accesa restava senza
  // timbro, un'ombra storta e basta. Il timbro deve pesare di piu' di ognuna.
  const peso = (sel) => (sel.match(/#[\w-]+/g) || []).length * 100
    + (sel.replace(/::[\w-]+/g, '').match(/\.[\w-]+|:[\w-]+|\[[^\]]+\]/g) || []).length;
  const regole = (css) => [...css.replace(/@keyframes[\s\S]*?\}\s*\}/g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ sel: m[1].trim().split('\n').pop(), corpo: m[2] }));
  const tutte = [...regole(CSS), ...regole(ANIME)];
  const timbro = tutte.find((r) => /\.drawer-voce\.on$/.test(r.sel) && /background: var\(--acc\)/.test(r.corpo));
  assert.ok(timbro, 'c\'e\' il timbro della voce accesa');
  const vesti = tutte.flatMap((r) => r.sel.split(',').map((x) => x.trim())
    .filter((x) => /\.drawer-voce$/.test(x) && /(?:^|[;\s])(?:background|border|width)\s*:/.test(r.corpo)));
  assert.ok(vesti.length >= 2, `trovo chi veste le voci: ${vesti.join(' | ')}`);
  for (const x of vesti) assert.ok(peso(timbro.sel) > peso(x), `${timbro.sel} pesa piu' di ${x}`);
});
