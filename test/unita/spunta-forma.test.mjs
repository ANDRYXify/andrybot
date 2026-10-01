// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE SPUNTE DISEGNATE, nella loro geometria (docs/DISEGNO.md, «Le spunte»).
//
// Il disegno sta in un file solo, src/web/public/spunta-forma.js: lo carica il
// pannello nel browser e lo esegue il server per la home. Qui si prova quello
// che lo rende una casella e non un'altra cosa:
//  · il riquadro e' un gesto solo, chiuso a mano, senza code agli angoli: con
//    quattro righe incrociate, a dodici pixel, si leggeva l'icona «ritaglia»;
//  · la «v» e' centrata sulla casella ed esce a sinistra, a destra e in alto;
//  · il pallino scelto e' tondo e staccato dal suo cerchio: la punta parte dal
//    centro e chiude con un giro intero alla sua misura, cosi' il bordo non ha
//    il bozzo di una chiocciola;
//  · la home scrive il disegno che fa il pannello, non una copia a parte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('../../src/web/public/spunta-forma.js');
const SP = globalThis.SB_SPUNTA;
const { vetrinaHtml } = await import('../../src/web/vetrina-vista.js');
const { pianiPubblici } = await import('../../src/features/abbonamenti.js');

const VARIANTI = [...Array(SP.VARIANTI).keys()];
const numeri = (d) => d.match(/-?\d+(?:\.\d+)?/g).map(Number);
const coppie = (d) => { const n = numeri(d); const out = []; for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]); return out; };
const [A0, A1] = SP.LATO;

test('il riquadro e\' un gesto solo, senza code oltre gli angoli', () => {
  for (const v of VARIANTI) {
    const d = SP.forma('checkbox', v).fondo;
    assert.equal((d.match(/M/g) || []).length, 1, `variante ${v}: un tratto solo`);
    for (const [x, y] of coppie(d)) {
      assert.ok(x >= A0 - 0.65 && x <= A1 + 0.65 && y >= A0 - 0.65 && y <= A1 + 0.65,
        `variante ${v}: (${x}, ${y}) esce dal riquadro, come una coda d'angolo`);
    }
  }
});

test('la «v» e\' centrata sulla casella ed esce a sinistra, a destra e in alto', () => {
  for (const v of VARIANTI) {
    const pts = coppie(SP.inchiostro(SP.forma('checkbox', v).punti, 1));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys);
    assert.ok(Math.abs((x0 + x1) / 2 - (A0 + A1) / 2) <= 0.6, `variante ${v}: centrata (${((x0 + x1) / 2).toFixed(2)})`);
    assert.ok(x0 < A0 - 1 && x1 > A1 + 1 && y0 < A0 - 1, `variante ${v}: esce da una parte e dall'altra`);
  }
});

test('il pallino scelto e\' tondo e staccato dal suo cerchio', () => {
  const giro = SP.SEGNO - 1.9 / 2;
  for (const v of VARIANTI) {
    // i punti del tracciato, non i punti di controllo delle curve, che per
    // costruzione stanno fuori dal cerchio
    const pts = SP.forma('radio', v).segno.split('C').map((pezzo) => coppie(pezzo).pop());
    const r = pts.map(([x, y]) => Math.hypot(x - 10, y - 10));
    const fine = r.slice(-4);
    assert.ok(fine.every((q) => Math.abs(q - giro) <= 0.12), `variante ${v}: chiude con un giro intero alla sua misura`);
    assert.ok(Math.max(...r) <= giro + 0.12, `variante ${v}: niente bozzo fuori dal giro`);
    assert.ok(SP.CERCHIO - SP.MATITA / 2 - SP.SEGNO >= 1.5, 'fra il pallino e il cerchio resta aria');
  }
});

test('lo stesso seme da\' lo stesso disegno', () => {
  for (const seme of ['chk-giochi', 'forma-monete:1', 'extra:clip']) {
    const v = SP.variante(seme);
    assert.ok(Number.isInteger(v) && v >= 0 && v < SP.VARIANTI);
    assert.equal(SP.variante(seme), v);
  }
  const c = { china: '#000', matita: '#555' };
  assert.equal(SP.svg('checkbox', 2, 1, c), SP.svg('checkbox', 2, 1, c));
});

test('la home scrive il disegno del pannello', () => {
  const piani = pianiPubblici();
  const html = vetrinaHtml('it', { piani });
  assert.ok((piani.addon || []).length, 'ci sono i pacchetti da spuntare');
  for (const a of piani.addon) {
    const p = SP.forma('checkbox', SP.variante(`extra:${a.id}`));
    assert.ok(html.includes(`d="${p.fondo}"`), `il riquadro di «${a.id}» e' quello del pannello`);
    assert.ok(html.includes(`d="${SP.inchiostro(p.punti, 1)}"`), `e anche la sua «v»`);
  }
  const pannello = readFileSync(new URL('../../src/web/public/disegno-pannello.js', import.meta.url), 'utf8');
  assert.match(pannello, /SP\.svg\(tipo, v, quanto, c\)/, 'il pannello disegna con lo stesso file');
  assert.doesNotMatch(pannello, /function spArco|function spForme|function spInchiostro/, 'e non ha una geometria sua');
  const indice = readFileSync(new URL('../../src/web/public/index.html', import.meta.url), 'utf8');
  assert.ok(indice.indexOf('<script src="spunta-forma.js" defer></script>') > -1 &&
    indice.indexOf('spunta-forma.js') < indice.indexOf('disegno-pannello.js'), 'il pannello lo carica prima di usarlo');
});
