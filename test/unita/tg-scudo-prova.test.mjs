// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PROVA IN MOVIMENTO (src/features/tg-scudo-prova.js): quello che promette,
// misurato.
//  · un fotogramma non dice niente: dentro e fuori dalle lettere i puntini
//    accesi sono gli stessi, a meno del caso;
//  · nemmeno una posa: la media di tutti, o di tre fotogrammi (il mosso di una
//    foto), non somiglia alle lettere, e il mosso ha lo stesso verso dentro e
//    fuori;
//  · ma il movimento SI': fra un fotogramma e il successivo i puntini delle
//    lettere vanno insieme da una parte e quelli del fondo dall'altra. E'
//    quello che vede l'occhio: senza, la prova non si potrebbe superare;
//  · le lettere non si toccano e stanno dentro il riquadro;
//  · alla pagina va un pacchetto di bit, senza il codice.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../src/features/tg-scudo-prova.js';

const N = P.LARGO * P.ALTO;
// un generatore ripetibile, cosi' una prova rossa si rifa' uguale
function semente(s) {
  let x = s >>> 0;
  const passo = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x; };
  return { caso: () => passo() / 4294967296, bytes: (n) => { const b = Buffer.alloc(n); for (let i = 0; i < n; i++) b[i] = passo() & 255; return b; } };
}
const correlazione = (v, m) => {
  let a = 0, b = 0;
  for (let i = 0; i < N; i++) { a += v[i]; b += m[i]; }
  a /= N; b /= N;
  let c = 0, va = 0, vb = 0;
  for (let i = 0; i < N; i++) { c += (v[i] - a) * (m[i] - b); va += (v[i] - a) ** 2; vb += (m[i] - b) ** 2; }
  return c / Math.sqrt(va * vb);
};
const at = (f, x, y) => f[((y % P.ALTO) + P.ALTO) % P.ALTO * P.LARGO + ((x % P.LARGO) + P.LARGO) % P.LARGO];

if (!P.disegnabile()) {
  test('la prova in movimento: i caratteri non ci sono', { skip: 'assets/font/Anton-Regular.ttf manca' }, () => {});
} else {
  const s = semente(20261003);
  const m = await P.maschera('MW4KJ', s.caso);
  const { fotogrammi: F, direzioni: D } = P.fotogrammi(m, { bytes: s.bytes });
  const dentro = m.reduce((a, b) => a + b, 0);

  test('la maschera: le lettere ci sono, e non coprono tutto', () => {
    assert.ok(dentro / N > 0.12 && dentro / N < 0.45, `parte coperta ${(dentro / N).toFixed(3)}`);
    assert.equal(F.length, P.FOTOGRAMMI);
  });

  test('un fotogramma non dice niente: dentro e fuori, la stessa densita\' di puntini', () => {
    // tutti i fotogrammi insieme: 90 x 8960 puntini. Con un campo indipendente
    // dalle lettere la differenza e' solo caso, e il caso qui sta sotto l'1%.
    let a = 0, b = 0;
    for (const f of F) for (let i = 0; i < N; i++) if (m[i]) a += f[i]; else b += f[i];
    const pa = a / (dentro * F.length), pb = b / ((N - dentro) * F.length);
    assert.ok(Math.abs(pa - 0.5) < 0.01 && Math.abs(pb - 0.5) < 0.01, `dentro ${pa.toFixed(4)}, fuori ${pb.toFixed(4)}`);
    // e uno per uno: nessun fotogramma somiglia alle lettere
    for (const f of F) assert.ok(Math.abs(correlazione(f, m)) < 0.05);
  });

  test('nemmeno una posa: la media non somiglia alle lettere, e il mosso ha lo stesso verso dentro e fuori', () => {
    const media = new Float64Array(N);
    for (const f of F) for (let i = 0; i < N; i++) media[i] += f[i] / F.length;
    assert.ok(Math.abs(correlazione(media, m)) < 0.03, 'posa lunga');
    for (let t0 = 0; t0 + 3 <= P.TRATTO; t0 += 3) {
      const posa = new Float64Array(N);
      for (let t = t0; t < t0 + 3; t++) for (let i = 0; i < N; i++) posa[i] += F[t][i] / 3;
      assert.ok(Math.abs(correlazione(posa, m)) < 0.05, 'posa di tre fotogrammi');
      // il mosso: quanto un puntino somiglia al vicino lungo la direzione del
      // moto. Dentro e fuori devono somigliarsi uguale (i versi sono opposti,
      // le strisce identiche), se no la foto mossa mostrerebbe le lettere.
      const d = D[t0 + 1];
      const lungo = (sel) => {
        let c = 0, n = 0;
        for (let y = 0; y < P.ALTO; y++) for (let x = 0; x < P.LARGO; x++) {
          const i = y * P.LARGO + x;
          if (m[i] !== sel || at(m, x + d[0], y + d[1]) !== sel) continue;
          c += (posa[i] - 0.5) * (at(posa, x + d[0], y + d[1]) - 0.5); n++;
        }
        return c / n;
      };
      assert.ok(Math.abs(lungo(1) - lungo(0)) < 0.02, `il mosso dentro (${lungo(1).toFixed(3)}) e fuori (${lungo(0).toFixed(3)})`);
    }
  });

  test('ma il movimento si\': le lettere vanno insieme da una parte, il fondo dall\'altra', () => {
    for (let t = 1; t < F.length; t++) {
      const d = D[t];
      let lett = 0, nl = 0, fondo = 0, nf = 0, storto = 0;
      for (let y = 0; y < P.ALTO; y++) for (let x = 0; x < P.LARGO; x++) {
        const i = y * P.LARGO + x;
        const daL = y - d[1], dxL = x - d[0];
        const daF = y + d[1], dxF = x + d[0];
        if (m[i] && at(m, dxL, daL)) { nl++; if (F[t][i] === at(F[t - 1], dxL, daL)) lett++; if (F[t][i] === at(F[t - 1], dxF, daF)) storto++; }
        if (!m[i] && !at(m, dxF, daF)) { nf++; if (F[t][i] === at(F[t - 1], dxF, daF)) fondo++; }
      }
      assert.ok(lett / nl > 0.9, `t=${t}: le lettere seguono il loro moto (${(lett / nl).toFixed(3)})`);
      assert.ok(fondo / nf > 0.9, `t=${t}: il fondo segue il suo (${(fondo / nf).toFixed(3)})`);
      assert.ok(Math.abs(storto / nl - 0.5) < 0.08, `t=${t}: col moto sbagliato e' caso (${(storto / nl).toFixed(3)})`);
    }
    // la direzione cambia a ogni tratto, e il fondo va sempre al contrario
    for (let t = P.TRATTO; t < F.length; t += P.TRATTO) assert.notDeepEqual(D[t], D[t - 1]);
  });

  test('le lettere non si toccano e stanno nel riquadro, qualunque giro esca', () => {
    for (let k = 1; k <= 300; k++) {
      const r = semente(k);
      const l = P.disponi('MWMWM', r.caso);
      for (let j = 0; j < l.length; j++) {
        assert.ok(l[j].x - l[j].w / 2 >= 0 && l[j].x + l[j].w / 2 <= P.LARGO, `dentro in largo (${k})`);
        assert.ok(l[j].y - l[j].h / 2 >= 0 && l[j].y + l[j].h / 2 <= P.ALTO, `dentro in alto (${k})`);
        if (j) assert.ok((l[j].x - l[j].w / 2) - (l[j - 1].x + l[j - 1].w / 2) >= 2.999, `staccate (${k})`);
      }
    }
  });

  test('il pacchetto: intestazione, un bit per puntino, e niente codice', async () => {
    const b = P.impacchetta(F);
    assert.equal(b.subarray(0, 4).toString('ascii'), 'SBM1');
    assert.equal(b.readUInt16BE(4), P.LARGO);
    assert.equal(b.readUInt16BE(6), P.ALTO);
    assert.equal(b.readUInt16BE(8), F.length);
    assert.equal(b.readUInt8(10), P.QUADRI);
    assert.equal(b.length, 11 + Math.ceil(N / 8) * F.length);
    const per = Math.ceil(N / 8);
    for (const k of [0, 17, F.length - 1]) for (const i of [0, 1, 7, 8, 4321, N - 1]) assert.equal((b[11 + k * per + (i >> 3)] >> (i & 7)) & 1, F[k][i]);
    const tutta = await P.provaInMovimento('HN6TX');
    assert.ok(!tutta.toString('latin1').includes('HN6TX'));
  });
}
