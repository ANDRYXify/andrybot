// L'IMMAGINE DI RIFERIMENTO SOTTO LA TELA.
//
// Uno screenshot della scena o una grafica, sotto la tela dello Studio, per
// comporre l'overlay su quello che c'e' davvero. La promessa che regge tutto:
// resta nel browser (IndexedDB, per overlay) e non lascia mai il computer di
// chi la mette. Le misure vere le prende scripts/verifica-riferimento.mjs; qui
// si tiene fermo il disegno.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const APP = leggi('src/web/public/app.js');
const SKIN = leggi('src/web/public/overlay-skin.css');
const ANIME = leggi('src/web/public/anime.css');
const PKG = leggi('package.json');
const GATE = leggi('scripts/verifica-riferimento.mjs');

const blocco = APP.slice(APP.indexOf('let _rif = {'), APP.indexOf('function aggiornaAnteprima() {'));

test('l\'immagine resta nel browser: niente rete, IndexedDB per overlay, solo immagini fino a 25 MB', () => {
  assert.ok(blocco.length > 500, 'il blocco del riferimento esiste');
  assert.ok(!/\bfetch\(|\bapi\(|XMLHttpRequest|navigator\.sendBeacon/.test(blocco), 'nessuna chiamata di rete nel blocco: l\'immagine non lascia il computer');
  assert.ok(/indexedDB\.open\('socialbot-studio', 1\)/.test(blocco) && /createObjectStore\('riferimenti'\)/.test(blocco), 'sta in IndexedDB, in un archivio suo');
  assert.ok(/function _rifId\(\) \{ return 'ov:' \+ \(\(_ovAttuale\(\) \|\| \{\}\)\.id \|\| 'principale'\); \}/.test(blocco), 'una per overlay');
  assert.ok(/if \(!blob \|\| !\/\^image\\\/\/\.test\(blob\.type \|\| ''\)\)/.test(blocco) && /blob\.size > 25 \* 1024 \* 1024/.test(blocco), 'solo immagini, fino a 25 MB');
  assert.ok(/URL\.revokeObjectURL\(_rif\.url\)/.test(blocco), 'l\'indirizzo blob precedente si libera');
  assert.ok(!/<input[^>]*type="url"[^>]*rif/.test(APP) && !/ovl-rif-url/.test(APP), 'nessun indirizzo remoto da cui prenderla');
});

test('sotto la tela, con trasparenza e interruttore, e la pagina la rilegge da sola', () => {
  assert.ok(/<div class="ap-riferimento" id="ap-riferimento" hidden><\/div>\n\s*<div class="ap-stage" id="ap-stage">/.test(APP), 'lo strato sta sotto la tela, primo figlio dell\'anteprima');
  assert.ok(/^\.ap-riferimento \{ position: absolute; inset: 0; background-size: cover; background-position: center; pointer-events: none; \}/m.test(SKIN) && /\.ap-riferimento\[hidden\] \{ display: none; \}/.test(SKIN), 'copre la tela, centrata, e non prende il mouse');
  assert.ok(/function aggiornaAnteprima\(\) \{\n  _rifCarica\(\);/.test(APP), 'ogni aggiornamento della tela chiede l\'immagine dell\'overlay in uso');
  assert.ok(/if \(_rif\.id === id\) \{ _rifDisegna\(\); return; \}/.test(blocco), 'ma la rilegge da IndexedDB solo quando cambia overlay');
  for (const id of ['ovl-rif-scegli', 'ovl-rif-file', 'ovl-rif-op', 'ovl-rif-on', 'ovl-rif-via']) assert.ok(new RegExp(`id="${id}"`).test(APP) && new RegExp(`_g\\('${id}'\\)`).test(APP), `${id}: c'e' ed e' agganciato`);
  assert.ok(/document\.addEventListener\('paste', \(e\) => \{\n\s*const tela = _g\('ovl-tela'\);\n\s*if \(!tela \|\| !tela\.offsetParent\) return;/.test(APP), 'incollare vale solo con lo Studio davanti');
  assert.ok(/if \(t && \(t\.tagName === 'INPUT' \|\| t\.tagName === 'TEXTAREA' \|\| t\.isContentEditable\)\) return;/.test(APP), 'e non ruba l\'incolla a un campo di testo');
  assert.ok(/_g\('ovl-tela'\)\?\.addEventListener\('drop'/.test(APP), 'si puo\' trascinare sulla tela');
  assert.ok(/#ovl-riferimento \[hidden\] \{ display: none; \}/.test(ANIME), 'i comandi nascosti sono nascosti davvero');
});

test('il cancello e\' in catena e sa quando l\'immagine non torna o la trasparenza non arriva', () => {
  assert.ok(/verifica-anteprima\.mjs && node scripts\/verifica-riferimento\.mjs && /.test(PKG), 'in catena dopo l\'anteprima');
  assert.ok(/l'immagine non si ricorda: ricaricando la pagina sparisce/.test(GATE) && /la trasparenza scelta non arriva sull'immagine/.test(GATE), 'due rotture nell\'autoprova');
  assert.ok(/richieste\.filter\(\(r\) => r\.n > 2000\)/.test(GATE), 'e guarda che nessuna richiesta porti l\'immagine al server');
});
