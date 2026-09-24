// IL MURO DELLE EMOTE E' UN ELEMENTO DELLA SCENA (docs/MURO-EMOTE.md).
// Chiave, configurazione, un'area e non un punto, lo stesso motore nello
// Studio e in diretta, e i fili che portano chat, eventi, premi e comando.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normMuro } from '../../src/web/stile.js';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const OVL = leggi('src/web/public/overlay-app.js');
const HTML = leggi('src/web/public/overlay.html');
const INDEX = leggi('src/web/public/index.html');
const BOT = leggi('src/bot.js');
const ALERTS = leggi('src/features/alerts.js');

const oggetto = (testo, inizio) => {
  const i = testo.indexOf(inizio);
  assert.ok(i >= 0, `manca ${inizio}`);
  const da = testo.indexOf('return {', i) + 7;
  let d = 0;
  for (let j = da; j < testo.length; j++) { if (testo[j] === '{') d++; else if (testo[j] === '}') { d--; if (!d) return new Function('return (' + testo.slice(da, j + 1) + ')')(); } }
  return null;
};

test('il pannello e il server partono dallo stesso muro: spento, a tutto schermo', () => {
  assert.deepEqual(oggetto(APP, 'function _defMuro()'), normMuro({}));
  assert.equal(normMuro({}).attivo, false, 'nessuno se lo trova in onda senza averlo scelto');
  assert.equal(normMuro({ xy: { x: 10, y: 10, s: 100 } }).xy, null, 'una posa a punto non e\' un\'area');
  assert.deepEqual(normMuro({ xy: { x: 0, y: 60, w: 100, h: 40 } }).xy, { x: 0, y: 60, r: 0, w: 100, h: 40 });
});

test('e\' un elemento come gli altri, di qua e di la\' dal filo', () => {
  assert.ok(/const ELEM_OVERLAY = \[[^\]]*'muro'/.test(SRV) && /const ELEM_OVL = \[[^\]]*'muro'/.test(APP));
  assert.ok(/out\.push\(\{ k: 'muro', ico: ICO\.faccina, n: L\('Muro delle emote'[^}]*cfg: 'overlayMuro' \}\);/.test(APP));
  assert.ok(/const VESTITORE = \{[^}]*\bmuro: _vestiMuro\b/.test(APP) && /\['muro', '#sez-muro'\]/.test(APP));
  assert.ok(/if \(b\.overlayMuro !== undefined\) out\.overlayMuro = normMuro\(b\.overlayMuro\);/.test(SRV) && /muro: normMuro\(base\.muro\),/.test(SRV));
  assert.ok(/\['overlayCss'[^\]]*'overlayMuro'[^\]]*\]\.some\(\(k\) => k in out\)/.test(SRV), 'salvarlo avvisa gli overlay aperti');
  assert.ok(/muro: \(s\.overlayMuro && typeof s\.overlayMuro === 'object'\) \? s\.overlayMuro : null,/.test(ALERTS));
});

test('un\'area: nello Studio un riquadro a tutta tela se non e\' posato, sotto tutti gli altri', () => {
  assert.ok(/if \(e\.cfg\) return _cfgEl\(k\)\.xy \|\| \(k === 'muro' \? MURO_PIENO\(\) : null\);/.test(APP));
  assert.ok(/const MURO_PIENO = \(\) => \(\{ x: 0, y: 0, w: 100, h: 100, r: 0 \}\);/.test(APP));
  assert.ok(/if \(e\.k === 'muro'\) stage\.insertBefore\(nodo, stage\.firstChild\);/.test(APP), 'il fondo della tela: non ruba i clic agli altri');
  assert.ok(/<body>\n  <div id="muro" class="schermo"><\/div>/.test(HTML), 'anche in diretta sta sotto a tutto');
  assert.ok(/#muro \{ position: fixed; overflow: hidden; pointer-events: none; \}\n    #muro\.schermo \{ inset: 0; \}/.test(HTML));
  assert.ok(/posizionaContenitore\(muroBox, window\.SB_RIQUADRO\.e\(xy\) \? xy : null, 'schermo'\);/.test(OVL));
  assert.ok(/chat: el === chatBox \|\| el === muroBox/.test(OVL), 'il riquadro e\' un\'area, come la chat');
});

test('lo stesso motore nella pagina dell\'overlay e nello Studio', () => {
  const iM = HTML.indexOf('src="/muro.js"'), iO = HTML.indexOf('src="/overlay-app.js"');
  assert.ok(iM > 0 && iM < iO);
  const jM = INDEX.indexOf('src="muro.js"'), jA = INDEX.indexOf('src="app.js"');
  assert.ok(jM > 0 && jM < jA);
  assert.ok(/window\.SB_MURO\.lancia\(muroBox, e, MIO\.muro, vesteMuro\(\)/.test(OVL) && /window\.SB_MURO\.lancia\(g\.box, /.test(APP));
  assert.ok(/window\.SB_MURO\.esplosione\(muroBox, /.test(OVL) && /window\.SB_MURO\.esplosione\(box, figura, /.test(APP));
});

test('in diretta si accende col suo interruttore e riceve chat, esplosioni e boss', () => {
  assert.ok(/function muroAcceso\(\) \{ return mostra\('muro'\) && !!MIO\.muro && MIO\.muro\.attivo === true; \}/.test(OVL));
  assert.ok(OVL.includes("else if (dati.tipo === 'muro') muroChat(dati);") && OVL.includes("else if (dati.tipo === 'muro-esplodi') muroEsplodi(dati);"));
  assert.ok(/MIO\.muro = t\.muro \|\| null;\n  preparaMuro\(\);/.test(OVL));
  assert.ok(/function emoteUrl\(mappa, nome\) \{\n  return mappa && Object\.prototype\.hasOwnProperty\.call\(mappa, nome\)/.test(OVL), 'anche la chat: «constructor» scritto in chat non e\' un\'emote');
});

test('il bot porta al muro la chat, i comandi, gli eventi, i premi e le donazioni', () => {
  assert.ok(/this\.muro = new MuroEmote\(\{ effects: this\.effects, helix: this\.helix \}\);\n    this\.alerts = new AlertsEngine\(\{[^}]*muro: this\.muro \}\);/.test(BOT));
  assert.ok(/this\.alerts\?\.onChat\(login, msg\);[^\n]*\n    try \{ this\.muro\?\.suChat\(login, msg\); \}/.test(BOT));
  assert.ok(/try \{ this\.muro\?\.tryComando\(cmdMsg, parla\); \}/.test(BOT));
  assert.ok(/this\.muro\?\.suEvento\(ev\)\.catch\(/.test(BOT) && /try \{ this\.muro\?\.suPremio\(channel, data\); \}/.test(BOT));
  assert.ok(/if \(!soloAvviso && stessa\) \{ try \{ this\.muro\?\.suDono\(channel, importo\); \}/.test(ALERTS), 'nella valuta del canale, come l\'obiettivo');
  assert.ok(/app\.post\('\/api\/muro\/prova', requireOwner,/.test(SRV) && /FIGURE_MURO\.includes\(req\.body\?\.figura\)/.test(SRV));
});

test('l\'ultimo movimento acceso non si spegne: senza, il muro non avrebbe niente da far volare', () => {
  assert.ok(/if \('insieme' in ev\.target\.dataset && !ev\.target\.checked && !box\.querySelector\(`\[data-c="\$\{ev\.target\.dataset\.c\}"\]\[data-insieme\]:checked`\)\) \{\n        ev\.target\.checked = true;/.test(APP));
  assert.equal(normMuro({ animazioni: [] }).animazioni.length, 10, 'e se arrivasse vuoto lo stesso, il server li riaccende tutti invece di un muro muto');
});
