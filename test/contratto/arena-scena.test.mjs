// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// L'ARENA DELLE EMOTE E' UN ELEMENTO DELLA SCENA (docs/ARENA.md, docs/OVERLAY.md).
// Chiave, configurazione, la veste di tutti nella pelle, lo stesso disegno
// nella pagina dell'overlay e nello Studio, e un overlay che il boss l'ha tolto
// non si ritrova l'arena. In diretta la partita la rifa' il motore coi dati del
// server: chi apre la sorgente a meta' riceve lo stato e corre fino ad adesso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normArena } from '../../src/web/stile.js';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const OVL = leggi('src/web/public/overlay-app.js');
const HTML = leggi('src/web/public/overlay.html');
const SKIN = leggi('src/web/public/overlay-skin.css');
const ALERTS = leggi('src/features/alerts.js');
const RIQ = leggi('src/web/public/riquadro.js');

const oggetto = (testo, inizio) => {
  const i = testo.indexOf(inizio);
  assert.ok(i >= 0, `manca ${inizio}`);
  const da = testo.indexOf('return {', i) + 7;
  let d = 0;
  for (let j = da; j < testo.length; j++) { if (testo[j] === '{') d++; else if (testo[j] === '}') { d--; if (!d) return new Function('return (' + testo.slice(da, j + 1) + ')')(); } }
  return null;
};

test('il pannello e il server partono dalla stessa arena: accesa, al centro, senza fondo', () => {
  assert.deepEqual(oggetto(APP, 'function _defArena()'), normArena({}));
  assert.equal(normArena({}).stile.opacita, 0, 'il fondo di serie e\' trasparente');
  assert.equal(normArena({ posizione: 'alto-destra' }).posizione, 'centro', 'un angolo solo');
  assert.deepEqual([normArena({ nomi: false }).nomi, normArena({ coloreChat: false }).coloreChat, normArena({ bordo: false }).bordo], [false, false, false]);
  assert.equal(normArena({ stile: { accento: 'rosso' } }).stile.accento, '#f72fa7', 'un colore storto prende quello di tutti');
});

test('e\' un elemento come gli altri, di qua e di la\' dal filo', () => {
  assert.ok(/const ELEM_OVERLAY = \[[^\]]*'arena'/.test(SRV) && /const ELEM_OVL = \[[^\]]*'arena'/.test(APP), 'nell\'elenco, da tutte e due le parti');
  assert.ok(/out\.push\(\{ k: 'arena', ico: ICO\.scudo, n: L\('Arena delle emote'[^}]*cfg: 'overlayArena' \}\);/.test(APP), 'nella colonna dei livelli, con la sua configurazione');
  assert.ok(/const VESTITORE = \{[^}]*\barena: _vestiArena\b/.test(APP), 'sulla tela c\'e\' la sua arena d\'esempio');
  assert.ok(/\['arena', '#sez-arena'\]/.test(APP) && /<div class="asp-blocco" data-asp="arena" data-cfg-di="arena">/.test(APP), 'e nell\'ispettore il suo blocco');
  assert.ok(/if \(b\.overlayArena !== undefined\) out\.overlayArena = normArena\(b\.overlayArena\);/.test(SRV), 'il server ripulisce quello che arriva');
  assert.ok(/arena: normArena\(base\.arena\),/.test(SRV), 'e all\'overlay la manda completa');
  assert.ok(/\['overlayCss'[^\]]*'overlayArena'[^\]]*\]\.some\(\(k\) => k in out\)/.test(SRV), 'salvarla avvisa gli overlay aperti');
  assert.ok(/arena: \(s\.overlayArena && typeof s\.overlayArena === 'object'\) \? s\.overlayArena : null,/.test(ALERTS));
  assert.ok(/ORDINE_BASE = \['muro', 'arena', 'effetti'/.test(RIQ), 'nell\'ordine di serie dei livelli sta in fondo, sopra il muro: e\' grande, e sulla tela non deve coprire gli elementi da prendere');
});

test('lo stesso disegno nella pagina dell\'overlay e nello Studio', () => {
  const posto = (nome) => HTML.indexOf(`src="/${nome}"`);
  assert.ok(posto('penna.js') > 0 && posto('penna.js') < posto('arena-tela.js') && posto('arena.js') < posto('arena-tela.js') && posto('arena-tela.js') < posto('overlay-app.js'),
    'la penna e il motore prima del disegno, il disegno prima della pagina');
  assert.ok(/window\.SB_ARENA_TELA/.test(OVL) && /T\.disegna\(tela, sc, ARENA\.veste, arenaGira\);/.test(OVL));
  assert.ok(/T\.disegna\(tela, scena, veste, \(\) => _disegnaArena\(box, cfg\)\);/.test(APP) && /script\('\/arena-tela\.js'\)/.test(APP), 'lo Studio carica lo stesso disegno quando serve');
  assert.ok(/^\.ovl-arena canvas \{[^}]*width: 40em; height: 25em;/m.test(SKIN), 'la misura sta nella pelle, in em: la stessa sulla tela e in onda');
  assert.ok(/#arena\.centro \{ inset: 0; display: flex; align-items: center; justify-content: center; \}/.test(HTML), 'nell\'overlay resta solo il contenitore d\'angolo');
  assert.ok(!/#arena[^{]*\{[^}]*transform/.test(HTML), 'e senza trasformazioni: una carta posata e\' «fixed», e dentro un contenitore trasformato si misurerebbe da lui invece che dallo schermo');
});

test('in diretta si accende col suo interruttore, si veste e si posa come gli altri', () => {
  assert.ok(/function arenaAcceso\(\) \{ return mostra\('arena'\) && !!MIO\.arena && MIO\.arena\.attivo !== false; \}/.test(OVL));
  assert.ok(OVL.includes("else if (dati.tipo === 'arena') arena(dati);"));
  assert.ok(/vestiElemento\(carta, cfg, 'nessuna', 'arena'\);/.test(OVL), 'la posa passa dalla porta di tutti, con la sua chiave');
  assert.ok(/MIO\.arena = t\.arena \|\| null;\n  ridisegnaArena\(\);/.test(OVL), 'cambiando la veste a partita in corso, l\'arena si riveste');
});

test('chi apre l\'overlay a meta\' riceve lo stato, e lo traduce nel suo orologio', () => {
  assert.ok(/const arena = statoArena\(login\);\n      if \(arena\) res\.write\(`data: \$\{JSON\.stringify\(\{ tipo: 'arena', azione: 'stato', \.\.\.arena \}\)\}\\n\\n`\);/.test(SRV), 'il flusso lo manda appena ci si collega');
  assert.ok(/ARENA\.scarto = Date\.now\(\) - Number\(ev\.ora\);/.test(OVL) && /const oraArena = \(\) => Date\.now\(\) - ARENA\.scarto;/.test(OVL),
    'gli istanti del server si leggono con lo scarto misurato all\'arrivo, non con l\'ora del computer della diretta');
  assert.ok(/else window\.SB_ARENA\.corri\(ARENA\.s, passoArena\(\)\);/.test(OVL), 'e la partita corre fino ad adesso senza disegnare');
});

test('un overlay che il boss l\'ha tolto non si ritrova l\'arena', () => {
  const riga = (nome) => { const m = new RegExp(`const ${nome} = [^;]+;`).exec(SRV); assert.ok(m, nome); return m[0]; };
  const i = SRV.indexOf('const ereditaMostra = (m) => {');
  const fn = SRV.slice(i, SRV.indexOf('\n};', i) + 3);
  const eredita = new Function(`${riga('EREDITA_MOSTRA')} ${fn} return ereditaMostra;`)();
  assert.equal(eredita({ boss: false }).arena, false);
  assert.equal(eredita({ effetti: false }).arena, false, 'la «Solo chat» di prima: effetti spenti, quindi niente boss, quindi niente arena');
  assert.equal(eredita({ effetti: false, arena: true }).arena, true, 'scritta, vale per conto suo');
  assert.equal(eredita({ chat: true }).arena, undefined, 'nelle differenze di un\'occasione si riempie solo se c\'e\' da dove');
});
