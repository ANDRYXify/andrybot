// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE SPUNTE DISEGNATE, nella loro geometria (docs/DISEGNO.md, «Le spunte»).
//
// Il disegno sta in un file solo, src/web/public/spunta-forma.js: lo carica il
// pannello nel browser e lo esegue il server per la home. Ogni spunta ha la sua
// forma, ricavata dal suo seme: come fatta a mano una per una, nessuna uguale a
// un'altra. Qui si prova, su centinaia di semi, quello che resta vero in ognuna:
//  · il riquadro e' un gesto solo, senza code oltre gli angoli: con quattro
//    righe incrociate, a dodici pixel, si leggeva l'icona «ritaglia»;
//  · la «v» e' centrata sulla sua casella ed esce a sinistra, a destra e in alto;
//  · il pallino scelto e' tondo e staccato dal suo cerchio: la punta parte dal
//    centro e chiude con un giro intero alla sua misura;
//  · semi diversi danno disegni diversi, e diversi davvero: le forme si
//    allargano su una gamma che l'occhio vede;
//  · la home scrive i disegni che fa il pannello, ognuno col suo seme.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('../../src/web/public/spunta-forma.js');
const SP = globalThis.SB_SPUNTA;
const { vetrinaHtml } = await import('../../src/web/vetrina-vista.js');
const { pianiPubblici } = await import('../../src/features/abbonamenti.js');

const SEMI = Array.from({ length: 300 }, (_, i) => `seme-${i}`);
const numeri = (d) => d.match(/-?\d+(?:\.\d+)?/g).map(Number);
const coppie = (d) => { const n = numeri(d); const out = []; for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]); return out; };
const fini = (d) => d.split('C').map((pezzo) => coppie(pezzo).pop());
// i punti lungo le curve, non solo i loro capi: su un ovale il punto piu' vicino
// al centro puo' cadere a meta' di una curva
const lungoCurve = (d) => {
  const pezzi = d.split('C'), out = [];
  let p0 = coppie(pezzi[0]).pop();
  for (const pezzo of pezzi.slice(1)) {
    const [p1, p2, p3] = coppie(pezzo);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, u = 1 - t;
      out.push([0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]));
    }
    p0 = p3;
  }
  return out;
};
const scatola = (pts) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
// Quanto un punto sta fuori dal quadrilatero dei quattro angoli (in senso orario).
const fuori = (p, P) => Math.max(...P.map((a, i) => {
  const b = P[(i + 1) % 4], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  return -((p[0] - a[0]) * n[0] + (p[1] - a[1]) * n[1]);
}));

test('il riquadro e\' un gesto solo, senza code oltre gli angoli', () => {
  for (const seme of SEMI) {
    const b = SP.forma('checkbox', seme);
    assert.equal((b.fondo.match(/M/g) || []).length, 1, `${seme}: un tratto solo`);
    // i lati si piegano e la penna ripassa vicino al lato, ma niente sporge
    // oltre il riquadro piu' di un'ansa della mano
    for (const p of coppie(b.fondo + ' ' + b.ripasso)) {
      assert.ok(fuori(p, b.angoli) <= 0.85, `${seme}: (${p}) esce dal riquadro di ${fuori(p, b.angoli).toFixed(2)}`);
    }
  }
});

test('la «v» e\' centrata sulla sua casella ed esce a sinistra, a destra e in alto', () => {
  for (const seme of SEMI) {
    const b = SP.forma('checkbox', seme);
    const v = scatola(coppie(SP.inchiostro(b.v, 1))), q = scatola(b.angoli);
    assert.ok(Math.abs((v.x0 + v.x1) / 2 - (q.x0 + q.x1) / 2) <= 0.6, `${seme}: centrata`);
    assert.ok(v.x0 < q.x0 - 0.8 && v.x1 > q.x1 + 0.8 && v.y0 < q.y0 - 1, `${seme}: esce da una parte e dall'altra`);
  }
});

test('il pallino scelto e\' tondo e staccato dal suo cerchio', () => {
  for (const seme of SEMI) {
    const p = SP.forma('radio', seme);
    // il pallino si misura dal suo punto (la mano non cade proprio nel mezzo),
    // l'aria dal centro del cerchio
    const r = (q) => Math.hypot(q[0] - p.punto[0], q[1] - p.punto[1]);
    const dal = (q) => Math.hypot(q[0] - p.centro[0], q[1] - p.centro[1]);
    const segno = fini(p.segno).map(r), giro = p.fuori - SP.PALLINO / 2;
    // il giro trema del 4% al massimo, e ogni coordinata e' arrotondata al
    // decimo: su un raggio di 1,3 l'arrotondamento vale fino a 0,07
    const tolto = (q) => giro * 0.04 + 0.075;
    assert.ok(segno.slice(-4).every((q) => Math.abs(q - giro) <= tolto(q)), `${seme}: chiude con un giro alla sua misura`);
    assert.ok(Math.max(...segno) <= giro + tolto(), `${seme}: niente bozzo fuori dal giro`);
    const cerchio = Math.min(...lungoCurve(p.fondo).map(dal));
    const pieno = Math.max(...lungoCurve(p.segno).map(dal)) + SP.PALLINO / 2;
    assert.ok(cerchio - p.tratto / 2 - pieno >= 1, `${seme}: fra il pallino e il cerchio resta aria (${(cerchio - p.tratto / 2 - pieno).toFixed(2)})`);
  }
});

test('ogni disegno sta nella sua tela, senza essere tagliato', () => {
  // la tela e' 20 per 20: quello che ne esce, il browser non lo disegna
  for (const seme of SEMI) {
    const b = SP.forma('checkbox', seme), r = SP.forma('radio', seme);
    const tutto = numeri([b.fondo, b.ripasso, SP.inchiostro(b.v, 1), r.fondo, r.segno].join(' '));
    assert.ok(Math.min(...tutto) >= 0.5 && Math.max(...tutto) <= 19.5, `${seme}: esce dalla tela`);
  }
});

test('ogni seme ha il suo disegno, e i disegni si vedono diversi', () => {
  const fondi = new Set(SEMI.map((s) => SP.forma('checkbox', s).fondo));
  const vu = new Set(SEMI.map((s) => SP.inchiostro(SP.forma('checkbox', s).v, 1)));
  const tondi = new Set(SEMI.map((s) => SP.forma('radio', s).fondo));
  assert.equal(fondi.size, SEMI.length, 'nessun riquadro uguale a un altro');
  assert.equal(vu.size, SEMI.length, 'nessuna «v» uguale a un\'altra');
  assert.equal(tondi.size, SEMI.length, 'nessun cerchio uguale a un altro');
  // diversi per l'occhio, non per un decimale: gli angoli e la punta della «v»
  // si spostano di piu' di un pixel da una casella all'altra
  const gamma = (xs) => Math.max(...xs) - Math.min(...xs);
  assert.ok(gamma(SEMI.map((s) => SP.forma('checkbox', s).angoli[1][1])) >= 0.9, 'l\'angolo in alto a destra cambia di posto');
  assert.ok(gamma(SEMI.map((s) => SP.forma('checkbox', s).v.punti.at(-1).y)) >= 1.4, 'la punta della «v» cambia di altezza');
  assert.ok(gamma(SEMI.map((s) => SP.forma('checkbox', s).v.largo)) >= 0.6, 'e il pennino preme ogni volta diverso');
  const c = { china: '#000', matita: '#555' };
  assert.equal(SP.svg('checkbox', 'stesso', 1, c), SP.svg('checkbox', 'stesso', 1, c), 'lo stesso seme da\' lo stesso disegno');
});

// Rimette in assoluto un tracciato scritto a passi relativi.
const assoluto = (d) => {
  const out = [];
  let x = 0, y = 0, cmd = '';
  for (const [, c, resto] of d.matchAll(/([MmCcQqLlZz])([^MmCcQqLlZz]*)/g)) {
    cmd = c;
    const n = (resto.match(/-?(?:\d+\.?\d*|\.\d+)/g) || []).map(Number);
    if (c === 'z' || c === 'Z') continue;
    const passo = 'Cc'.includes(c) ? 3 : 'Qq'.includes(c) ? 2 : 1;
    for (let i = 0; i + 1 < n.length; i += 2 * passo) {
      const gruppo = [];
      for (let k = 0; k < passo; k++) {
        const px = n[i + 2 * k], py = n[i + 2 * k + 1];
        gruppo.push(c === c.toUpperCase() ? [px, py] : [x + px, y + py]);
      }
      [x, y] = gruppo.at(-1);
      out.push(...gruppo);
    }
  }
  return out;
};

test('il tracciato compatto e\' lo stesso tracciato, a passi relativi', () => {
  let prima = 0, dopo = 0;
  for (const seme of SEMI.slice(0, 80)) {
    const b = SP.forma('checkbox', seme), r = SP.forma('radio', seme);
    for (const d of [b.fondo, b.ripasso, SP.inchiostro(b.v, 1), SP.inchiostro(b.v, 0.5), r.fondo, r.segno].filter(Boolean)) {
      const a = coppie(d), c = assoluto(SP.compatto(d));
      assert.equal(c.length, a.length, `${seme}: stessi punti`);
      a.forEach((p, i) => assert.ok(Math.abs(p[0] - c[i][0]) < 0.051 && Math.abs(p[1] - c[i][1]) < 0.051, `${seme}: punto ${i} spostato`));
      prima += d.length;
      dopo += SP.compatto(d).length;
    }
  }
  // un ripasso corto con le coordinate intere puo' pesare uguale; tutti
  // insieme pesano molto meno
  assert.ok(dopo < prima * 0.85, `e piu' corto: ${dopo} contro ${prima}`);
});

test('la home scrive i disegni del pannello, ognuno col suo seme', () => {
  const piani = pianiPubblici();
  const html = vetrinaHtml('it', { piani });
  assert.ok((piani.addon || []).length, 'ci sono i pacchetti da spuntare');
  for (const a of piani.addon) {
    const p = SP.forma('checkbox', `extra:${a.id}`);
    assert.ok(html.includes(`d="${SP.compatto(p.fondo)}"`), `il riquadro di «${a.id}» e' quello del pannello`);
    assert.ok(html.includes(`d="${SP.compatto(SP.inchiostro(p.v, 1))}"`), 'e anche la sua «v»');
  }
  const voci = [...html.matchAll(/<li><svg[^>]*><path d="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(voci.length >= 3, 'gli elenchi dei piani hanno le loro spunte');
  assert.equal(new Set(voci).size, voci.length, 'ogni voce ha la sua «v»');
  const pannello = readFileSync(new URL('../../src/web/public/disegno-pannello.js', import.meta.url), 'utf8');
  assert.match(pannello, /SP\.svg\(tipo, seme, quanto, c\)/, 'il pannello disegna con lo stesso file');
  assert.match(pannello, /return k \+ '#' \+ gia\.length;/, 'e da\' a ogni casella un seme suo, anche a due con lo stesso nome');
  assert.doesNotMatch(pannello, /function spArco|function spForme|function spInchiostro/, 'e non ha una geometria sua');
  const indice = readFileSync(new URL('../../src/web/public/index.html', import.meta.url), 'utf8');
  assert.ok(indice.indexOf('<script src="spunta-forma.js" defer></script>') > -1 &&
    indice.indexOf('spunta-forma.js') < indice.indexOf('disegno-pannello.js'), 'il pannello lo carica prima di usarlo');
});
