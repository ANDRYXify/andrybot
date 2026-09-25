// L'ORDINE DEI LIVELLI, di qua e di la' dal filo (docs/OVERLAY.md).
// Una funzione sola dice l'ordine; la tela e l'overlay la leggono entrambi; il
// server lo tiene per overlay e per occasione; la selezione non lo falsa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const OVL = leggi('src/web/public/overlay-app.js');
const HTML = leggi('src/web/public/overlay.html');
const SKIN = leggi('src/web/public/overlay-skin.css');

test('il server tiene l\'ordine per overlay e per occasione, e lo manda all\'overlay col tema', () => {
  assert.ok(/ordine: _ordineDiOverlay\(o\?\.ordine\),/.test(SRV) && /pulisciOrdine: _ordineDiOverlay,/.test(SRV));
  assert.ok(/filter\(\(k\) => CHIAVE_EL\.test\(k\)\)/.test(SRV), 'solo chiavi di elementi veri');
  assert.ok(/ordine: vis\.ordine,/.test(SRV), 'l\'overlay riceve l\'ordine gia\' fuso con l\'occasione accesa');
  assert.ok(/ordine: Array\.isArray\(o\.ordine\) \? o\.ordine : \[\], blocchi:/.test(SRV), 'e il pannello lo rilegge');
  assert.ok(/ordine: o\.ordine \|\| \[\], css:/.test(APP), 'il pannello lo salva con l\'overlay');
});

test('la tela e l\'overlay leggono la stessa funzione', () => {
  assert.ok(/function _ordineScena\(\) \{ return window\.SB_RIQUADRO\.ordine\(ELEMENTI\(\)\.map\(\(e\) => e\.k\), _vedoOrdine\(\)\); \}/.test(APP));
  assert.ok(/nodo\.style\.zIndex = String\(1 \+ ordine\.indexOf\(e\.k\)\);/.test(APP), 'ogni elemento della tela prende il suo livello');
  assert.ok(/const ordine = window\.SB_RIQUADRO\.ordine\(nodi\.map\(\(n\) => n\.dataset\.el\), MIO\.ordine\);/.test(OVL));
  assert.ok(/MIO\.ordine = \(t && Array\.isArray\(t\.ordine\)\) \? t\.ordine : \[\];/.test(OVL));
});

test('scegliere un elemento non lo porta davanti: le maniglie stanno nel riquadro di selezione', () => {
  assert.ok(!/\.ap-el\.sel[^{]*\{[^}]*z-index/.test(SKIN), 'nessun livello regalato all\'elemento scelto');
  assert.ok(/#ap-riquadro \{ position: absolute; z-index: 500;/.test(SKIN), 'il riquadro sta sopra a tutti i livelli possibili');
  assert.ok(/data-lato="scala"/.test(APP) && /if \(lato === 'ruota' \|\| lato === 'scala'\) \{ _dragManiglia\(k, e, lato\); return; \}/.test(APP));
  assert.ok(!/ap-handle/.test(APP) && !/ap-handle/.test(SKIN), 'e dentro gli elementi non ne restano');
});

test('in onda gli angoli non fanno strato, e ogni radice porta la sua chiave', () => {
  assert.ok(/\.wbox \{ position: absolute; display: flex; flex-direction: column; gap: \.5rem; pointer-events: none; \}/.test(HTML),
    'un angolo fisso con un suo livello chiudeva dentro di se\' tutti i suoi elementi');
  for (const [id, k] of [['muro', 'muro'], ['palco', 'effetti'], ['palco-libero', 'effetti'], ['etichette', 'etichetta'], ['testi', 'scritta'], ['boss', 'boss'], ['penitenze', 'pen'], ['alert', 'alert'], ['chatlive', 'chat']]) {
    assert.ok(new RegExp(`<div id="${id}"[^>]* data-el="${k}"`).test(HTML), `${id} porta ${k}`);
  }
  assert.ok(/function posaElemento\(el, chiave, cfg\) \{\n  el\.dataset\.el = chiave;\n  posaDove\(el, chiave, cfg\);\n  applicaOrdine\(\);\n\}/.test(OVL), 'chi si posa prende la sua chiave e il suo livello');
  assert.ok(/el\.dataset\.el = 'cont:' \+ cmd;/.test(OVL), 'anche i contatori');
  assert.ok(/^\.alert-card, \.chat-riga, \.ovl-widget \{\n  position: relative;\n  isolation: isolate;/m.test(SKIN), 'le cornici con z-index -1 restano dentro l\'elemento, livello o no');
});

test('si riordina trascinando, da tastiera e dalle proprieta\', e l\'annulla lo riporta', () => {
  assert.ok(/data-presa="\$\{l\.k\}"/.test(APP) && /_trascinaLivello\(presa\.closest\('\[data-liv\]'\), presa, e\)/.test(APP));
  assert.ok(/\.sort\(\(a, b\) => ordine\.indexOf\(b\.k\) - ordine\.indexOf\(a\.k\)\)/.test(APP), 'l\'elenco ha in cima il primo piano, come OBS');
  assert.ok(/e\.altKey && \(e\.key === 'ArrowUp' \|\| e\.key === 'ArrowDown'\)/.test(APP) && /e\.code === 'BracketRight' \|\| e\.code === 'BracketLeft'/.test(APP));
  assert.ok(/id="insp-davanti"/.test(APP) && /id="insp-dietro"/.test(APP));
  assert.ok(/ordine: _ordineProprio\(\),/.test(APP) && /_scriviOrdine\(Array\.isArray\(d\.ordine\) \? d\.ordine : \[\]\);/.test(APP));
});
