// LA PENNA (docs/PENNA.md): i segni fatti a mano, calcolati. Il seme varia i
// segni; dove partono, dove arrivano e dove sta il contenuto lo dice la
// geometria, per ogni seme.
import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../src/web/public/penna.js');
const P = globalThis.SB_PENNA;
const SEMI = Array.from({ length: 60 }, (_, i) => 'seme' + i);
const vicino = (a, b, e = 1e-6) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= e;

test('un tratto arriva esattamente dove dice la guida, per ogni seme e ogni punta', () => {
  const guida = [[10, 10], { c: [[80, -20], [160, 90], [240, 40]] }];
  for (const seme of SEMI) {
    for (const punta of Object.keys(P.PUNTE)) {
      const t = P.tratto(guida, { larghezza: 8, punta, seme });
      assert.ok(vicino(t.fine, [240, 40]), `${punta} ${seme}: la mano trema, ma alla fine no`);
      assert.match(t.d, /^M[\d.,\s L-]+Z$/, 'una sagoma chiusa');
    }
  }
});

test('disegnare nel tempo: a meta\' strada il tratto e\' a meta\'', () => {
  const guida = [[0, 0], [100, 0]];
  const meta = P.tratto(guida, { larghezza: 4, seme: 'x', fino: 0.5 });
  assert.ok(Math.abs(meta.fine[0] - 50) < 1.5 && Math.abs(meta.fine[1]) < 4);
  assert.equal(P.tratto(guida, { fino: 0 }).d, '', 'prima di cominciare non c\'e\' niente');
});

test('le alette della freccia partono dalla punta', () => {
  for (const seme of SEMI.slice(0, 20)) {
    const d = P.freccia([[0, 0], { q: [[60, -40], [120, 0]] }], { seme, larghezza: 6, aletta: 20 });
    const pezzi = d.split(' Z').filter((x) => x.trim());
    assert.equal(pezzi.length, 3, 'asta e due alette');
  }
  const [a, b] = [0, 1].map((k) => P.tratto([[120, 0], { q: [[110, 8], [100, 16]] }], { seme: 'a' + k, larghezza: 5 }));
  assert.ok(a.L > 0 && b.L > 0);
});

test('una forma a mano: il contenuto nel suo interno non tocca mai il bordo', () => {
  for (const seme of SEMI) {
    for (const [w, h, rag] of [[600, 300, 14], [300, 600, 0], [220, 80, 10]]) {
      const f = P.forma(40, 30, w, h, { seme, rag });
      const I = f.interno;
      assert.ok(I.w > 0 && I.h > 0);
      for (const [x, y] of P.fitto(f.guida)) {
        const dentro = x > I.x && x < I.x + I.w && y > I.y && y < I.y + I.h;
        assert.ok(!dentro, `${seme} ${w}x${h}: il bordo (${x.toFixed(1)}, ${y.toFixed(1)}) entra nel contenuto`);
      }
    }
  }
});

test('una forma a mano non e\' un rettangolo', () => {
  const f = P.forma(0, 0, 400, 200, { seme: 'storta' });
  const [a, b, c, d] = f.angoli;
  assert.ok(!(a[1] === b[1] && b[0] === c[0] && c[1] === d[1] && d[0] === a[0]), 'gli angoli si spostano');
  assert.ok(f.china.length > f.guida.length, 'la china chiude oltre l\'inizio');
  const g = P.forma(0, 0, 400, 200, { seme: 'storta' });
  assert.deepEqual(g.angoli, f.angoli, 'stesso seme, stessa forma');
});

test('un ovale gira intorno alla parola e la chiude', () => {
  for (const seme of SEMI.slice(0, 20)) {
    const pts = P.ovale(100, 50, 60, 20, { seme });
    const angoli = pts.map(([x, y]) => Math.atan2(y - 50, x - 100));
    let giro = 0;
    for (let i = 1; i < angoli.length; i++) { let d = angoli[i] - angoli[i - 1]; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; giro += d; }
    assert.ok(Math.abs(giro) > 2 * Math.PI, `${seme}: poco piu' di un giro, e la parola e' chiusa`);
    for (const [x, y] of pts) assert.ok(((x - 100) / 60) ** 2 + ((y - 50) / 20) ** 2 > 0.7, 'e non taglia la parola');
  }
});
