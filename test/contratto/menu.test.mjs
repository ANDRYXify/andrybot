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
  assert.ok(APP.includes("window.matchMedia(MENU_DI_LATO).addEventListener('change', (ev) => {\n    const b = document.body.classList;\n    if (ev.matches) { chiudiMenuMobile(); return; }"),
    'allargando la finestra il cassetto aperto si chiude');
});

test('di lato non c\'e\' niente che serva solo al cassetto; a tutto schermo il menu torna cassetto', () => {
  const i = CSS.indexOf('@media (min-width: 64rem) {');
  const blocco = CSS.slice(i, CSS.indexOf('\n}\n', i));
  for (const via of ['.apri-menu', '.backdrop', '.drawer-testa']) {
    assert.ok(blocco.includes(`body.con-nav:not(.tutto-schermo) ${via}`), `di lato ${via} non si vede`);
  }
  assert.ok(blocco.includes('body.con-nav .drawer-utente { display: none; }'), 'gli strumenti stanno in alto, non nel cassetto');
  assert.match(blocco, /body\.con-nav:not\(\.tutto-schermo\) \.drawer \{[^}]*visibility: visible;/, 'il menu di lato si vede sempre, anche se il cassetto chiuso e\' nascosto');
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
  assert.ok(DIS.includes("if (cassetto) chiedi(cassetto, { veloce: true });"), 'prima il contorno del cassetto, in qualunque forma sia');
  assert.ok(DIS.includes("chiedi(g, { da: 140 + j * PASSO_FILA, veloce: true });"), 'poi i gruppi, uno dopo l\'altro');
  assert.ok(DIS.includes('viaMenu: viaMenu'), 'e sa disfarlo, dicendo quanto ci mette');
  const chiudi = funzione('chiudiMenuMobile');
  assert.ok(chiudi.includes("const dura = resta ? 0 : (window.SB_DISEGNO?.viaMenu?.() || 0);")
    && chiudi.includes("_viaMenu = setTimeout(() => { _viaMenu = 0; document.body.classList.remove('menu-aperto', 'menu-via'); }, dura);"), 'sparisce solo quando il disegno e\' tornato indietro');
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

// Il cassetto del telefono scorreva, «perche' e' un cassetto». Chiesto: «quando
// schiaccio la x qui deve fare la solita animazione disegnata, non la
// transizione». Adesso fa come il menu a tutto schermo, per ogni strada.
test('sul telefono il cassetto non scorre: si disegna e si disfa, qualunque strada lo chiuda', () => {
  const base = /\n\.drawer \{[^}]*\}/.exec(CSS)[0];
  assert.doesNotMatch(base, /transform|transition/, 'niente scivolo');
  assert.match(base, /visibility: hidden;/, 'chiuso non si vede, e col Tab non ci si arriva');
  assert.ok(CSS.includes('body.menu-aperto .drawer { visibility: visible; }'), 'aperto si vede dov\'e\'');
  assert.ok(CSS.includes('body.menu-aperto.menu-via .backdrop { opacity: 0; pointer-events: none; }'), 'il velo sfuma mentre il cassetto si disfa');
  const chiudi = funzione('chiudiMenuMobile');
  assert.doesNotMatch(chiudi, /menuPosato\(\)/, 'il disegno all\'indietro non e\' piu\' solo del tutto schermo');
  assert.ok(chiudi.includes("document.body.classList.add('menu-via');"));
  assert.equal((APP.match(/classList\.(add|toggle)\('menu-aperto'\)/g) || []).length, 1, 'il cassetto si apre in un posto solo, apriMenu');
  assert.ok(funzione('apriMenu').includes("document.body.classList.add('menu-aperto');"));
  assert.equal((APP.match(/\.add\('menu-aperto', 'menu-via'\)/g) || []).length, 1, 'e l\'unico altro posto lo tiene in vista solo per disfarlo');
  assert.equal((APP.match(/classList\.remove\('menu-aperto'/g) || []).length, 2, 'e si chiude in un posto solo, chiudiMenuMobile (subito o dopo il disegno)');
  assert.match(APP, /const giraMenu = \(\) => \{ if \(document\.body\.classList\.contains\('menu-aperto'\) && !_viaMenu\) chiudiMenuMobile\(\); else apriMenu\(false\); \};/);
  assert.match(APP, /if \(ev\.target\.closest\('\[data-apri-menu\]'\)\) giraMenu\(\);/, 'il tasto della barra in basso');
  assert.match(APP, /getElementById\('apri-menu'\)\?\.addEventListener\('click', giraMenu\);/, 'e l\'hamburger');
  const vai = funzione('vaiAScheda');
  const dopoScelta = vai.indexOf('chiudiMenuMobile();', vai.indexOf('schedaAttiva = id;'));
  assert.ok(dopoScelta > 0 && dopoScelta < vai.indexOf('stessaFamiglia(prima, id)'),
    'scegliendo una voce il menu si chiude al gesto, insieme alla scena che se ne va, non dopo');
});

test('il menu si disegna in ogni caso: quando si vede in una forma nuova, e prima di sparire si disfa', () => {
  // «Che sia quando compare o quando scompare il menu deve venire disegnato in
  // ogni caso». Le strade sono tante: il tasto, il velo, una voce, il tutto
  // schermo, la finestra che si allarga o si stringe (anche il tablet che
  // gira), la pagina che si carica. Non si scrive una regola per strada: il
  // modulo del disegno guarda il menu, e ogni volta che si vede in una forma
  // nuova lo disegna. La forma e' il suo contorno: il cassetto del telefono ha
  // tre lati, quello posato quattro, quello di lato uno solo.
  const DIS = readFileSync(join(PUB, 'disegno.js'), 'utf8');
  const corpo = (nome) => { const i = DIS.indexOf(`function ${nome}(`); assert.ok(i >= 0, nome); return DIS.slice(i, DIS.indexOf('\n  }\n', i)); };
  const forma = corpo('formaMenu');
  assert.ok(forma.includes("if (!c || document.body.classList.contains('menu-via')) return '';"), 'un menu che se ne sta andando non e\' un menu che compare');
  assert.ok(forma.includes('return m.bordo && m.bordo.lati ? m.bordo.lati.map(Number).join(\'\') : \'-\';'), 'la forma e\' il contorno');
  assert.ok(corpo('sulMenu').includes('if (ora && ora !== menuVisto) menu();'), 'si vede in una forma nuova: si disegna');
  assert.ok(corpo('sulleClassi').includes('if (corpo) sulMenu();'), 'a ogni classe che cambia sulla pagina');
  assert.ok(corpo('avvia').includes("window.addEventListener('resize', function () { sulMenu(); esegui(); });"), 'a ogni cambio di misura della finestra');
  assert.ok(/sulMenu\(\);\n\s*esegui\(\);\n\s*\(window\.requestIdleCallback/.test(corpo('avvia')), 'e appena parte');
  assert.doesNotMatch(DIS, /diventa\('menu-aperto'\)|perde\('tutto-schermo'\)/, 'nessuna regola per strada');
  // Chi lo nasconde lo dice prima (`menu-via`), lo disfa, e solo dopo cambia
  // la pagina.
  const applica = funzione('applicaSchermo');
  assert.ok(applica.includes("document.body.classList.add('menu-via');\n    _viaSchermo = setTimeout(() => { _viaSchermo = 0; posa(); document.body.classList.remove('menu-via');"), 'il tutto schermo che arriva con una scheda');
  const cambia = funzione('cambiaSchermo');
  assert.ok(cambia.includes("document.body.classList.add('menu-via');\n  _cambioSchermo = setTimeout(() => dopo(true), dura);") && cambia.includes("if (via) document.body.classList.remove('menu-via');"), 'il tasto del tutto schermo');
  // Chiudere e' disfare solo se il menu sparisce davvero: il cassetto che
  // diventa il menu di lato resta, e si ridisegna nella forma nuova.
  const chiudi = funzione('chiudiMenuMobile');
  assert.ok(chiudi.includes('const resta = menuFisso();'), 'si chiede se il menu resta');
  assert.match(APP, /const menuFisso = \(\) => document\.body\.classList\.contains\('con-nav'\) && !document\.body\.classList\.contains\('tutto-schermo'\) && window\.matchMedia\(MENU_DI_LATO\)\.matches;/);
  // Stringendo la finestra il menu di lato non ha piu' posto: resta in vista
  // come cassetto quanto basta per disfarsi.
  assert.ok(APP.includes("    if (!b.contains('con-nav') || b.contains('tutto-schermo') || b.contains('menu-aperto')) return;\n    b.add('menu-aperto', 'menu-via');\n    chiudiMenuMobile();"),
    'stringendo, il menu di lato si disfa prima di sparire');
  assert.doesNotMatch(APP, /SB_DISEGNO\?\.menu\?\./, 'nessuno chiede il disegno a mano: lo fa il modulo, sempre');
  assert.match(CSS, /body\.menu-aperto:not\(\.menu-via\) \.apri-menu span:nth-child\(1\)/, 'e la X torna hamburger appena il menu comincia ad andarsene');
});
