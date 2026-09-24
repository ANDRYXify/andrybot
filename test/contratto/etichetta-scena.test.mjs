// IL NOME DEL COMANDO E' UN ELEMENTO DELLA SCENA (docs/OVERLAY.md, «Gli ultimi
// pezzi fuori dalla scena»). La pastiglia «!comando» di un effetto stava in
// basso al centro fissa, del colore del marchio, e la accendevano gli effetti.
// Ora e' fatta come il testo a schermo: chiave, configurazione, veste nella
// pelle, e un overlay con gli effetti spenti non se la ritrova in scena.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normEtichetta } from '../../src/web/stile.js';

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

test('il pannello e il server partono dalla stessa pastiglia: accesa, in basso al centro, del colore di prima', () => {
  assert.deepEqual(oggetto(APP, 'function _defEtichetta()'), normEtichetta({}));
  assert.deepEqual([normEtichetta({}).stile.sfondo, normEtichetta({}).stile.bordoRaggio], ['#ba007a', 30]);
});

test('e\' un elemento come gli altri, di qua e di la\' dal filo', () => {
  assert.ok(/const ELEM_OVERLAY = \[[^\]]*'etichetta'/.test(SRV) && /const ELEM_OVL = \[[^\]]*'etichetta'/.test(APP));
  assert.ok(/out\.push\(\{ k: 'etichetta', ico: ICO\.fulmine, n: L\('Nome del comando'[^}]*cfg: 'overlayEtichetta' \}\);/.test(APP));
  assert.ok(/const VESTITORE = \{[^}]*\betichetta: _vestiEtichetta\b/.test(APP) && /\['etichetta', '#sez-etichetta'\]/.test(APP));
  assert.ok(/if \(b\.overlayEtichetta !== undefined\) out\.overlayEtichetta = normEtichetta\(b\.overlayEtichetta\);/.test(SRV) && /etichetta: normEtichetta\(base\.etichetta\),/.test(SRV));
  assert.ok(/const EREDITA_MOSTRA = \{[^}]*etichetta: 'effetti'/.test(SRV), 'dove gli effetti erano spenti resta spenta');
  assert.ok(/\['overlayCss'[^\]]*'overlayEtichetta'[^\]]*\]\.some\(\(k\) => k in out\)/.test(SRV), 'salvarla avvisa gli overlay aperti');
});

test('in diretta si accende col suo interruttore, si veste e si posa come gli altri', () => {
  assert.ok(/function etichettaAccesa\(\) \{ return mostra\('etichetta'\) && !!MIO\.etichetta && MIO\.etichetta\.attivo !== false; \}/.test(OVL));
  assert.ok(/function posaEtichette\(\) \{ posizionaContenitore\(etichette, MIO\.xy\.etichetta, 'basso-centro'\); \}/.test(OVL));
  const corpo = OVL.slice(OVL.indexOf('function etichettaVolatile('), OVL.indexOf('function ridisegnaEtichette('));
  assert.ok(corpo.indexOf('etichette.appendChild(el)') < corpo.indexOf('posaEtichette()'), 'la posa dopo il contenuto');
  assert.ok(/MIO\.etichetta = t\.etichetta \|\| null;\n  ridisegnaEtichette\(\);/.test(OVL));
  assert.ok(!/\.pillola \{/.test(HTML) && /#etichette\.basso-centro \{ bottom: 10vh; left: 50%; transform: translateX\(-50%\); \}/.test(HTML), 'nell\'overlay resta solo il contenitore d\'angolo, all\'angolo che lo Studio conosce');
  assert.ok(/^\.ovl-etichetta \{/m.test(SKIN) && /\.ovl-etichetta\.dim-media \{ font-size: 1\.6rem; \}/.test(SKIN), 'la veste nella pelle, grande com\'era');
});
