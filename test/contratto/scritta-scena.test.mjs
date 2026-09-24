// IL TESTO A SCHERMO E' UN ELEMENTO DELLA SCENA (docs/OVERLAY.md, «Gli ultimi
// pezzi fuori dalla scena»). La scritta che un comando manda con «Mostra testo
// sull'overlay» stava al centro fissa, la accendevano gli effetti e lo Studio
// non la mostrava. Ora e' fatta come il boss: chiave, configurazione, veste
// nella pelle, e un overlay con gli effetti spenti non se la ritrova in scena.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normScritta } from '../../src/web/stile.js';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const OVL = leggi('src/web/public/overlay-app.js');
const HTML = leggi('src/web/public/overlay.html');
const SKIN = leggi('src/web/public/overlay-skin.css');

const oggetto = (testo, inizio) => {
  const i = testo.indexOf(inizio);
  assert.ok(i >= 0, `manca ${inizio}`);
  const da = testo.indexOf('return {', i) + 7;
  let d = 0;
  for (let j = da; j < testo.length; j++) { if (testo[j] === '{') d++; else if (testo[j] === '}') { d--; if (!d) return new Function('return (' + testo.slice(da, j + 1) + ')')(); } }
  return null;
};

test('il pannello e il server partono dalla stessa scritta: accesa, al centro, bianca e senza fondo', () => {
  assert.deepEqual(oggetto(APP, 'function _defScritta()'), normScritta({}));
  assert.equal(normScritta({}).stile.opacita, 0);
  assert.equal(normScritta({ attivo: false }).attivo, false);
});

test('e\' un elemento come gli altri, di qua e di la\' dal filo', () => {
  assert.ok(/const ELEM_OVERLAY = \[[^\]]*'scritta'/.test(SRV) && /const ELEM_OVL = \[[^\]]*'scritta'/.test(APP));
  assert.ok(/out\.push\(\{ k: 'scritta', ico: ICO\.testo, n: L\('Testo a schermo'[^}]*cfg: 'overlayScritta' \}\);/.test(APP));
  assert.ok(/const VESTITORE = \{[^}]*\bscritta: _vestiScritta\b/.test(APP) && /\['scritta', '#sez-scritta'\]/.test(APP));
  assert.ok(/if \(b\.overlayScritta !== undefined\) out\.overlayScritta = normScritta\(b\.overlayScritta\);/.test(SRV) && /scritta: normScritta\(base\.scritta\),/.test(SRV));
  assert.ok(/const EREDITA_MOSTRA = \{[^}]*scritta: 'effetti'/.test(SRV), 'dove gli effetti erano spenti resta spenta');
  assert.ok(/\['overlayCss'[^\]]*'overlayScritta'[^\]]*\]\.some\(\(k\) => k in out\)/.test(SRV), 'salvarla avvisa gli overlay aperti');
});

test('in diretta si accende col suo interruttore, si veste e si posa come gli altri', () => {
  assert.ok(OVL.includes("else if (dati.tipo === 'testo') mostraTesto(dati);"), 'non dipende piu\' dagli effetti');
  assert.ok(/function posaScritte\(\) \{ posizionaContenitore\(testi, MIO\.xy\.scritta, 'centro'\); \}/.test(OVL));
  const corpo = OVL.slice(OVL.indexOf('function mostraTesto('), OVL.indexOf('function ridisegnaScritte('));
  assert.ok(corpo.indexOf('testi.appendChild(el)') < corpo.indexOf('posaScritte()'), 'la posa dopo il contenuto');
  assert.ok(/MIO\.scritta = t\.scritta \|\| null;\n  ridisegnaScritte\(\);/.test(OVL));
  assert.ok(!/\.testo-overlay/.test(HTML) && /#testi\.centro \{ top: 50%; left: 50%; transform: translate\(-50%, -50%\); \}/.test(HTML), 'nell\'overlay resta solo il contenitore d\'angolo');
  assert.ok(/^\.ovl-scritta \{/m.test(SKIN) && /\.ovl-scritta\.dim-media \{ font-size: 3\.2rem; \}/.test(SKIN), 'la veste nella pelle, grande com\'era');
});
