// LA TELA DELL'EDITOR HA LE MISURE DELLA DIRETTA.
//
// Le due pagine leggono lo stesso CSS, ma la pagina del pannello ha un reset
// (box-sizing, margini, corpo 15px, interlinea 1.6) che quella dell'overlay non
// ha, e chi veste un elemento di qua non faceva sempre quello che fa chi lo
// veste di la'. Le misure vere le prende scripts/verifica-anteprima.mjs con
// Chromium; qui si tiene fermo il disegno che le rende uguali.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const APP = leggi('src/web/public/app.js');
const SKIN = leggi('src/web/public/overlay-skin.css');
const OVL_HTML = leggi('src/web/public/overlay.html');
const IDX = leggi('src/web/public/index.html');

test('la tela parte dalla stessa base tipografica della pagina dell\'overlay', () => {
  const corpoOvl = OVL_HTML.match(/body \{[^}]*font-family:\s*([^;]+);/);
  assert.ok(corpoOvl, 'la pagina dell\'overlay dichiara il carattere del corpo');
  const stage = SKIN.match(/\.ap-stage \{[^}]*font:\s*16px\/normal ([^;]+);/);
  assert.ok(stage, 'la tela dichiara corpo 16px, interlinea normale e il carattere');
  assert.equal(stage[1].trim(), corpoOvl[1].trim(), 'lo stesso carattere di la\'');
  assert.ok(!/\.ap-stage \{[^}]*line-height/.test(SKIN) || /line-height:\s*normal/.test(SKIN), 'nessuna interlinea ereditata dal pannello');
});

test('dentro la tela il modello di scatola e\' quello dell\'overlay, e nessuna regola della pelle viene coperta', () => {
  assert.ok(/:where\(\.ap-stage \.ap-el, \.ap-stage \.ap-el \*, \.ap-stage \.ap-el \*::before, \.ap-stage \.ap-el \*::after\) \{ box-sizing: content-box; \}/.test(SKIN),
    'il reset della tela ha specificita\' zero: vince sul reset del pannello e perde contro ogni regola della pelle');
  const iStyle = IDX.indexOf('href="style.css"'), iSkin = IDX.indexOf('href="overlay-skin.css"');
  assert.ok(iStyle >= 0 && iSkin > iStyle, 'la pelle si carica dopo il foglio del pannello, se no il suo reset a specificita\' zero perderebbe');
  assert.ok(/\.ap-stage \.ap-handle \{ box-sizing: border-box; \}/.test(SKIN), 'le maniglie restano come sono disegnate');
});

test('il contatore si veste in un posto solo, letto da tutte e due le pagine', () => {
  assert.ok(/^\.contatore-widget \{ padding: \.12em \.5em; border-radius: \.3em; line-height: 1\.15; white-space: nowrap;/m.test(SKIN),
    'la veste del contatore sta nella pelle');
  const inline = OVL_HTML.match(/\.contatore-widget \{([^}]*)\}/);
  assert.ok(inline, 'la pagina dell\'overlay tiene solo la posa del contatore');
  for (const p of ['padding', 'line-height', 'border-radius', 'text-shadow', 'font']) assert.ok(!inline[1].includes(p), `«${p}» del contatore non sta nella pagina: la tela non lo vedrebbe`);
});

test('chi veste la tela fa quello che fa chi veste la diretta', () => {
  assert.ok(/apChat\.style\.maxWidth = Number\(cst\.larghezza\) > 0 \? _arr\(\(Number\(cst\.larghezza\) \/ 100\) \* OVL_W\) \+ 'px' : '';/.test(APP),
    'la larghezza della chat (in centesimi di schermo) arriva sulla tela in pixel di tela');
  assert.ok(/class="chat-riga dim-\$\{cst\.dim\} anim-\$\{cst\.animazione \|\| 'slide'\}/.test(APP), 'le righe della chat portano l\'animazione scelta');
  assert.ok(/box\.style\.fontSize = CONT_BASE \+ 'px';/.test(APP), 'il contatore ha il corpo base: la scala la da\' il contenitore, una volta sola');
  const db = leggi('src/db.js');
  assert.ok(/grassetto: !!o\.grassetto/.test(db) && /box\.style\.fontWeight = o\.grassetto \? '800' : '500';/.test(APP),
    'il grassetto del contatore ha lo stesso ripiego di qua e di la\': spento se non scelto');
  assert.ok(/nodo\.classList\.toggle\('spento', !_elementoAcceso\(e\.k\)\);/.test(APP) && /\.ap-stage \.ap-el\.spento \{ opacity: \.35; \}/.test(SKIN),
    'un elemento spento resta sulla tela, sbiadito');
  assert.ok(/\.ap-stage \.ap-chat \{ display: flex; flex-direction: column; gap: \.35rem; \}/.test(SKIN) && /#chatlive \{[^}]*gap: \.35rem/.test(OVL_HTML),
    'la chat ha lo stesso spazio fra le righe');
});

test('il player e\' largo quanto il testo che gli si concede, non quanto il titolo', () => {
  assert.ok(/\.ovl-musica \.m-corpo \{ min-width: 0; width: var\(--m-testo, 13em\);/.test(SKIN), 'il corpo del player ha una larghezza, non un tetto');
  assert.ok(!/\.ovl-musica\.tema-cassetta \.m-corpo \{[^}]*max-width: none/.test(SKIN), 'la cassetta non la riapre');
});
