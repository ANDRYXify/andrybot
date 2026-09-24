// IL BOSS E' UN ELEMENTO DELLA SCENA (docs/OVERLAY.md, «Gli ultimi pezzi fuori
// dalla scena»). Stava in alto al centro fisso nel CSS dell'overlay, lo
// accendeva l'interruttore degli effetti e lo Studio non lo mostrava. Ora ha la
// sua chiave, la sua configurazione, la veste di tutti nella pelle, e un
// overlay salvato con gli effetti spenti non se lo ritrova in scena.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normBoss } from '../../src/web/stile.js';

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

test('il pannello e il server partono dallo stesso boss', () => {
  assert.deepEqual(oggetto(APP, 'function _defBoss()'), normBoss({}), 'acceso, in alto al centro, con la veste di prima');
  assert.equal(normBoss({ attivo: false }).attivo, false);
  assert.equal(normBoss({ posizione: 'basso-destra' }).posizione, 'alto-centro', 'un angolo solo');
  assert.equal(normBoss({ stile: { accento: '#00ff00' } }).stile.accento, '#00ff00', 'la veste si cambia');
  assert.equal(normBoss({ stile: { accento: 'rosso' } }).stile.accento, '#f72fa7', 'un colore storto prende quello di tutti');
});

test('e\' un elemento come gli altri, di qua e di la\' dal filo', () => {
  assert.ok(/const ELEM_OVERLAY = \[[^\]]*'boss'/.test(SRV) && /const ELEM_OVL = \[[^\]]*'boss'/.test(APP), 'nell\'elenco, da tutte e due le parti');
  assert.ok(/out\.push\(\{ k: 'boss', ico: ICO\.target, n: L\('Boss'[^}]*cfg: 'overlayBoss' \}\);/.test(APP), 'nella colonna dei livelli, con la sua configurazione');
  assert.ok(/const VESTITORE = \{[^}]*\bboss: _vestiBoss\b/.test(APP), 'sulla tela c\'e\' la sua carta');
  assert.ok(/\['boss', '#sez-boss'\]/.test(APP) && /<div class="asp-blocco" data-asp="boss" data-cfg-di="boss">/.test(APP), 'e nell\'ispettore il suo blocco');
  assert.ok(/if \(b\.overlayBoss !== undefined\) out\.overlayBoss = normBoss\(b\.overlayBoss\);/.test(SRV), 'il server ripulisce quello che arriva');
  assert.ok(/boss: normBoss\(base\.boss\),/.test(SRV), 'e all\'overlay lo manda completo');
  assert.ok(/\['overlayCss'[^\]]*'overlayBoss'[^\]]*\]\.some\(\(k\) => k in out\)/.test(SRV), 'salvarlo avvisa gli overlay aperti');
});

test('in diretta si accende col suo interruttore, si veste e si posa come gli altri', () => {
  assert.ok(OVL.includes("else if (dati.tipo === 'boss') boss(dati);") && !/boss\(dati\)[^\n]*mostra\('effetti'\)|mostra\('effetti'\)\) boss/.test(OVL), 'non dipende piu\' dagli effetti');
  assert.ok(/function bossAcceso\(\) \{ return mostra\('boss'\) && !!MIO\.boss && MIO\.boss\.attivo !== false; \}/.test(OVL));
  assert.ok(/vestiElemento\(carta, cfg, 'nessuna', 'boss'\);/.test(OVL), 'la posa passa dalla porta di tutti, con la sua chiave');
  const arriva = OVL.slice(OVL.indexOf("if (ev.azione === 'arriva')"), OVL.indexOf("if (ev.azione === 'colpo')"));
  assert.ok(arriva.indexOf('bossBox.appendChild(carta)') < arriva.indexOf('vestiBoss(carta)'), 'la posa dopo il contenuto');
  assert.ok(/MIO\.boss = t\.boss \|\| null;\n  ridisegnaBoss\(\);/.test(OVL), 'cambiando la veste durante lo scontro, la carta si riveste');
  assert.ok(!/\.boss-carta|--u:/.test(HTML) && /#boss\.alto-centro \{ top: 8vh; \}/.test(HTML), 'nell\'overlay resta solo il contenitore d\'angolo');
  assert.ok(/^\.ovl-boss \{/m.test(SKIN) && /\.ovl-boss \.boss-vita \{[^}]*var\(--acc\)/.test(SKIN), 'la veste sta nella pelle, e la vita e\' dell\'accento');
  assert.ok(!/@keyframes boss-(entra|scossa|danno|scritta)[^}]*\{[^}]*\btransform:/.test(SKIN), 'la carta si anima con translate e scale, che si sommano alla sua posizione invece di cancellarla');
});

test('un overlay salvato con gli effetti spenti non si ritrova il boss in scena', () => {
  const riga = (nome) => { const m = new RegExp(`const ${nome} = [^;]+;`).exec(SRV); assert.ok(m, nome); return m[0]; };
  const i = SRV.indexOf('const ereditaMostra = (m) => {');
  const fn = SRV.slice(i, SRV.indexOf('\n};', i) + 3);
  const eredita = new Function(`${riga('EREDITA_MOSTRA')} ${fn} return ereditaMostra;`)();
  assert.equal(eredita({ effetti: false }).boss, false, 'la «Solo chat» resta senza boss');
  assert.equal(eredita({ effetti: true }).boss, true);
  assert.equal(eredita({ effetti: false, boss: true }).boss, true, 'scritto, vale per conto suo');
  assert.equal(eredita({ chat: true }).boss, undefined, 'nelle differenze di un\'occasione si riempie solo se c\'e\' da dove');
  assert.ok(/m = ereditaMostra\(m \|\| \{\}\);/.test(SRV) && /m = ereditaMostra\(m\);/.test(SRV), 'nella base e nelle occasioni, salvando');
  assert.ok(/\.\.\.o, mostra: ereditaMostra\(o\.mostra\),/.test(SRV), 'e leggendo gli overlay salvati');
});
