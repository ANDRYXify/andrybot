// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';

  function caso(seme) {
    let a = 0;
    for (const c of String(seme)) a = (Math.imul(a ^ c.charCodeAt(0), 2654435761) >>> 0);
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function rumore(seme) {
    const r = caso(seme), v = [];
    for (let i = 0; i < 512; i++) v.push(r() * 2 - 1);
    const liscio = (x) => x * x * (3 - 2 * x);
    return (x) => {
      const i = Math.floor(x), f = x - i;
      const a = v[((i % 512) + 512) % 512], b = v[(((i + 1) % 512) + 512) % 512];
      return a + (b - a) * liscio(f);
    };
  }

  function bezier(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  }

  function cubicaDi(p0, g) {
    if (g.c) return g.c;
    const [q, p] = g.q;
    return [[p0[0] + (q[0] - p0[0]) * 2 / 3, p0[1] + (q[1] - p0[1]) * 2 / 3], [p[0] + (q[0] - p[0]) * 2 / 3, p[1] + (q[1] - p[1]) * 2 / 3], p];
  }

  function fitto(guida) {
    const out = [];
    let ultimo = null;
    for (const g of guida) {
      if (Array.isArray(g)) { out.push(g); ultimo = g; continue; }
      const [p1, p2, p3] = cubicaDi(ultimo, g);
      for (let i = 1; i <= 64; i++) out.push(bezier(ultimo, p1, p2, p3, i / 64));
      ultimo = p3;
    }
    return out;
  }

  function ricampiona(punti, passo) {
    const lung = [0];
    for (let i = 1; i < punti.length; i++) lung.push(lung[i - 1] + Math.hypot(punti[i][0] - punti[i - 1][0], punti[i][1] - punti[i - 1][1]));
    const L = lung[lung.length - 1];
    const n = Math.max(2, Math.ceil(L / passo) + 1);
    const out = [];
    let j = 0;
    for (let k = 0; k < n; k++) {
      const s = (k / (n - 1)) * L;
      while (j < lung.length - 2 && lung[j + 1] < s) j++;
      const seg = lung[j + 1] - lung[j] || 1, f = (s - lung[j]) / seg;
      const b = punti[Math.min(j + 1, punti.length - 1)];
      out.push([punti[j][0] + (b[0] - punti[j][0]) * f, punti[j][1] + (b[1] - punti[j][1]) * f, s]);
    }
    return { punti: out, L };
  }

  const PUNTE = {
    pennarello: {
      profilo: (u) => Math.min(1, 0.72 + u * 6) * (u > 0.9 ? 1 - (u - 0.9) * 2.2 : 1),
      punta: (a) => 0.62 + 0.38 * Math.abs(Math.sin(a - 0.62)),
      tremolio: 0.35, variazione: 0.07, ruvido: 0.06,
    },
    china: {
      profilo: (u) => Math.min(1, 0.35 + u * 9) * (u > 0.82 ? Math.max(0.3, 1 - (u - 0.82) * 3.6) : 1),
      punta: (a) => 0.86 + 0.14 * Math.abs(Math.sin(a - 0.9)),
      tremolio: 0.25, variazione: 0.12, ruvido: 0.035,
    },
    matita: {
      profilo: (u) => Math.min(1, 0.5 + u * 10) * (u > 0.85 ? Math.max(0.35, 1 - (u - 0.85) * 4) : 1),
      punta: () => 1,
      tremolio: 0.5, variazione: 0.18, ruvido: 0.22,
    },
  };

  const cifra = (n) => Math.round(n * 100) / 100;

  function tratto(guida, opz) {
    const o = Object.assign({ larghezza: 6, punta: 'pennarello', seme: 's', fino: 1, passo: 1.2 }, opz || {});
    const P = PUNTE[o.punta];
    const { punti, L } = ricampiona(fitto(guida), Math.max(0.6, o.passo));
    if (L < 0.5 || o.fino <= 0) return { d: '', L, fine: punti[0] };
    const w0 = o.larghezza;
    const nMano = rumore(o.seme + ':mano'), nPeso = rumore(o.seme + ':peso'), nSx = rumore(o.seme + ':sx'), nDx = rumore(o.seme + ':dx');
    const ultimo = Math.max(1, Math.round((punti.length - 1) * Math.min(1, o.fino)));
    const sx = [], dx = [], mezzi = [];
    for (let i = 0; i <= ultimo; i++) {
      const a = punti[Math.max(0, i - 1)], b = punti[Math.min(punti.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const nx = -ty, ny = tx;
      const s = punti[i][2], u = s / L;
      const trema = nMano(s / (w0 * 9)) * w0 * P.tremolio * Math.sin(Math.PI * u);
      const cx = punti[i][0] + nx * trema, cy = punti[i][1] + ny * trema;
      const w = w0 * P.profilo(u) * P.punta(Math.atan2(ty, tx)) * (1 + P.variazione * nPeso(s / (w0 * 5)));
      const ws = w / 2 * (1 + P.ruvido * nSx(s / (w0 * 0.9))), wd = w / 2 * (1 + P.ruvido * nDx(s / (w0 * 0.9) + 37));
      sx.push([cx + nx * ws, cy + ny * ws]);
      dx.push([cx - nx * wd, cy - ny * wd]);
      mezzi.push([cx, cy, w / 2, Math.atan2(ty, tx)]);
    }
    const arco = (c, da, verso) => {
      const pts = [];
      for (let k = 1; k < 8; k++) { const t = da + verso * Math.PI * k / 8; pts.push([c[0] + Math.cos(t) * c[2], c[1] + Math.sin(t) * c[2]]); }
      return pts;
    };
    const inizio = mezzi[0], fine = mezzi[mezzi.length - 1];
    const giro = [...sx, ...arco(fine, fine[3] + Math.PI / 2, -1), ...dx.reverse(), ...arco(inizio, inizio[3] - Math.PI / 2, -1)];
    const d = 'M' + giro.map((p) => cifra(p[0]) + ',' + cifra(p[1])).join(' L') + ' Z';
    return { d, L, fine: [fine[0], fine[1]], tangente: fine[3] };
  }

  function direzioneFinale(guida) {
    const p = fitto(guida), a = p[Math.max(0, p.length - 4)], b = p[p.length - 1];
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  }

  function freccia(guida, opz) {
    const o = Object.assign({ larghezza: 6, seme: 'freccia', fino: 1, aletta: 30 }, opz || {});
    const r = caso(o.seme + ':alette');
    const punta = fitto(guida).slice(-1)[0];
    const dir = direzioneFinale(guida);
    const k1 = Math.min(1, o.fino / 0.7), k2 = Math.min(1, Math.max(0, (o.fino - 0.7) / 0.15)), k3 = Math.min(1, Math.max(0, (o.fino - 0.85) / 0.15));
    const asta = tratto(guida, { larghezza: o.larghezza, punta: 'pennarello', seme: o.seme, fino: k1 });
    const aletta = (lato, k, quale) => {
      if (k <= 0) return '';
      const ang = dir + Math.PI + lato * (0.5 + (r() - 0.5) * 0.14);
      const lung = o.aletta * (quale ? 0.86 + r() * 0.1 : 1);
      const fine = [punta[0] + Math.cos(ang) * lung, punta[1] + Math.sin(ang) * lung];
      const piega = lato * lung * 0.12;
      const mezzo = [(punta[0] + fine[0]) / 2 - Math.sin(ang) * piega, (punta[1] + fine[1]) / 2 + Math.cos(ang) * piega];
      return tratto([punta, { q: [mezzo, fine] }], { larghezza: o.larghezza * 0.92, punta: 'pennarello', seme: o.seme + ':a' + quale, fino: k }).d;
    };
    return [asta.d, aletta(1, k2, 0), aletta(-1, k3, 1)].filter(Boolean).join(' ');
  }

  const verso = (a, b, d) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [a[0] + (b[0] - a[0]) * d / l, a[1] + (b[1] - a[1]) * d / l];
  };

  function forma(x, y, w, h, opz) {
    const o = Object.assign({ seme: 'forma', rag: 0, angoli: 0.012, bombatura: 0.006 }, opz || {});
    const r = caso(o.seme);
    const sp = o.angoli * Math.min(w, h);
    const j = () => (r() * 2 - 1) * sp;
    const A = [[x + j(), y + j()], [x + w + j(), y + j()], [x + w + j(), y + h + j()], [x + j(), y + h + j()]];
    const rag = A.map(() => o.rag * (0.6 + r() * 0.8));
    const lati = A.map((a, i) => {
      const b = A[(i + 1) % 4];
      const p0 = verso(a, b, rag[i]), p1 = verso(b, a, rag[(i + 1) % 4]);
      const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
      const nx = -(p1[1] - p0[1]) / l, ny = (p1[0] - p0[0]) / l;
      const b1 = (r() * 2 - 1) * o.bombatura * l, b2 = (r() * 2 - 1) * o.bombatura * l;
      return {
        p0, p1,
        c1: [p0[0] + (p1[0] - p0[0]) / 3 + nx * b1, p0[1] + (p1[1] - p0[1]) / 3 + ny * b1],
        c2: [p0[0] + 2 * (p1[0] - p0[0]) / 3 + nx * b2, p0[1] + 2 * (p1[1] - p0[1]) / 3 + ny * b2],
        angolo: b,
      };
    });
    const guida = [lati[0].p0];
    lati.forEach((l, i) => { guida.push({ c: [l.c1, l.c2, l.p1] }); guida.push({ q: [l.angolo, lati[(i + 1) % 4].p0] }); });
    const primo = lati[0], dentro = 0.6 * (primo.p1[0] - primo.p0[0]);
    const oltre = verso(primo.p0, primo.p1, Math.max(4, dentro * 0.18));
    const china = guida.concat([{ q: [verso(primo.p0, primo.p1, Math.max(2, dentro * 0.09)), [oltre[0], oltre[1] - sp * 0.5]] }]);
    const margine = sp + o.bombatura * Math.max(w, h) * 0.75 + Math.max(...rag) / 4 + 0.5;
    return { guida, china, angoli: A, margine, interno: { x: x + margine, y: y + margine, w: w - 2 * margine, h: h - 2 * margine } };
  }

  function costruzione(f, opz) {
    const o = Object.assign({ seme: 'costruzione', sborda: 12 }, opz || {});
    const r = caso(o.seme);
    return f.angoli.map((a, i) => {
      const b = f.angoli[(i + 1) % 4];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l;
      const sa = o.sborda * (0.6 + r() * 0.8), sb = o.sborda * (0.6 + r() * 0.8), piega = (r() - 0.5) * o.sborda * 0.4;
      const A = [a[0] - ux * sa, a[1] - uy * sa], B = [b[0] + ux * sb, b[1] + uy * sb];
      return [A, { q: [[(A[0] + B[0]) / 2 - uy * piega, (A[1] + B[1]) / 2 + ux * piega], B] }];
    });
  }

  function ovale(cx, cy, rx, ry, opz) {
    const o = Object.assign({ seme: 'ovale', giri: 1.12, inclina: 0.07, stringe: 0.08 }, opz || {});
    const r = caso(o.seme);
    const inc = (r() * 2 - 1) * o.inclina;
    const a0 = -Math.PI * 0.8 + (r() - 0.5) * 0.5;
    const fase = r() * Math.PI * 2;
    const ci = Math.cos(inc), si = Math.sin(inc);
    const n = Math.max(48, Math.round(96 * o.giri));
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n, a = a0 + u * o.giri * Math.PI * 2;
      const rr = 1 + o.stringe * (0.5 - u) + 0.025 * Math.sin(3 * a + fase);
      const px = rx * rr * Math.cos(a), py = ry * rr * Math.sin(a);
      pts.push([cx + px * ci - py * si, cy + px * si + py * ci]);
    }
    return pts;
  }

  function percorso(guida) {
    let d = '', ultimo = null;
    for (const g of guida) {
      if (Array.isArray(g)) { d += (d ? ' L' : 'M') + cifra(g[0]) + ',' + cifra(g[1]); ultimo = g; continue; }
      const [p1, p2, p3] = cubicaDi(ultimo, g);
      d += ' C' + [p1, p2, p3].map((p) => cifra(p[0]) + ',' + cifra(p[1])).join(' ');
      ultimo = p3;
    }
    return d + ' Z';
  }

  const PENNA = { caso, rumore, fitto, ricampiona, tratto, freccia, direzioneFinale, forma, costruzione, ovale, percorso, PUNTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = PENNA;
  else radice.SB_PENNA = PENNA;
})(typeof window !== 'undefined' ? window : globalThis);
