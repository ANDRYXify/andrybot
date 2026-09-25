// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';

  const CATALOGO = {
    coriandoli: { colori: ['#ff3b6b', '#ffd23f', '#3ec1ff', '#7cff6b', '#b56bff'], quanti: 'normale', durata: 7, min: 2, max: 20 },
    fuochi: { colori: ['#ff5a5a', '#ffd166', '#4cc9f0', '#b388ff', '#80ffdb'], quanti: 'normale', durata: 8, min: 4, max: 30 },
    cuori: { colori: ['#ff2d6f', '#ff6b9a', '#ffb3cc'], quanti: 'normale', durata: 6, min: 2, max: 30 },
    neve: { colori: ['#ffffff', '#dff1ff'], quanti: 'normale', durata: 10, min: 3, max: 30 },
    palloncini: { colori: ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#a55eea'], quanti: 'normale', durata: 8, min: 3, max: 30 },
    bolle: { colori: ['#9be7ff', '#c8f7ff', '#ffc8f0'], quanti: 'normale', durata: 7, min: 2, max: 30 },
    stelle: { colori: ['#fff3b0', '#ffffff', '#ffd166'], quanti: 'normale', durata: 5, min: 2, max: 30 },
    lampo: { colori: ['#ffffff'], quanti: 'normale', durata: 1, min: 1, max: 3 },
  };
  const NOMI = Object.keys(CATALOGO);
  const QUANTI = ['pochi', 'normale', 'tanti'];
  const GIRO = Math.PI * 2;
  const FINE_NEVE = 1.5;
  const FINE_CORIANDOLI = 0.6;
  const LAMPO_PICCO = 0.8;
  const LAMPO_SALITA = 0.06;
  const VITA_SCINTILLA = 2;
  const SCOPPIO_BOLLA = 0.2;

  const fra = (a, b, u) => a + (b - a) * u;
  const quadro = (x, y, e) => [x - e, y - e, x + e, y + e];
  const stringi = (v, a, b) => Math.min(b, Math.max(a, v));

  function caso(seme, i, k) {
    let x = (Math.imul(seme | 0, 0x27d4eb2d) ^ Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(k + 1, 0x85ebca77)) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d) >>> 0;
    x ^= x >>> 12; x = Math.imul(x, 0x297a2d39) >>> 0;
    x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
  }

  function rgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
  }
  const tinta = (c, verso, f) => 'rgb(' + c.map((v) => Math.round(v + (verso - v) * f)).join(',') + ')';
  const velo = (c, a) => 'rgba(' + c.join(',') + ',' + a + ')';
  const colore = (p, u) => rgb(p.colori[Math.floor(u * p.colori.length) % p.colori.length]);

  function yPezzo(q, u) {
    return q.y0 + q.g * q.tau * u + (q.vy - q.g * q.tau) * q.tau * (1 - Math.exp(-u / q.tau));
  }

  function uscitaPezzo(q, fondo) {
    const gt = q.g * q.tau;
    const ua = q.vy < 0 ? q.tau * Math.log((gt - q.vy) / gt) : 0;
    let lo = ua, hi = ua + Math.max(0.1, (fondo - yPezzo(q, ua)) / gt) + 5 * q.tau;
    while (yPezzo(q, hi) < fondo) hi *= 2;
    for (let n = 0; n < 48; n++) { const m = (lo + hi) / 2; if (yPezzo(q, m) < fondo) lo = m; else hi = m; }
    return hi;
  }

  const PIANI = {
    coriandoli(p, seme, W, H, D) {
      const n = { pochi: 90, normale: 180, tanti: 340 }[p.quanti];
      const k = H / 1080;
      const out = [];
      for (let i = 0; i < n; i++) {
        const r = (j) => caso(seme, i, j);
        const destra = i % 2 === 1;
        const th = fra(35, 82, r(1)) * Math.PI / 180;
        const v0 = fra(3.2, 4.6, r(2)) * H;
        const tondo = r(5) < 0.2;
        const w = (tondo ? fra(7, 11, r(6)) : fra(10, 18, r(6))) * k;
        const alto = tondo ? w : fra(5, 9, r(7)) * k;
        const c = colore(p, r(8));
        const q = {
          k: 'pezzo', t0: fra(0, Math.min(0.8, D * 0.12), r(4)),
          x0: destra ? W * 0.985 : W * 0.015, y0: H * 1.02,
          vx: (destra ? -1 : 1) * v0 * Math.cos(th), vy: -v0 * Math.sin(th),
          tau: fra(0.2, 0.26, r(3)), g: 0.5 * H, w, h: alto, tondo,
          deriva: fra(-0.05, 0.05, r(9)) * W, amp: fra(0.012, 0.04, r(10)) * W, om: fra(2.2, 5, r(11)), fi: r(12) * GIRO,
          giro: fra(5, 12, r(13)) * (r(14) < 0.5 ? -1 : 1), gira: fra(-3, 3, r(15)), a0: r(16) * GIRO,
          fronte: tinta(c, 255, 0.08), retro: tinta(c, 0, 0.3),
        };
        q.vita = Math.min(uscitaPezzo(q, H + Math.max(w, alto) + 1), D - q.t0);
        out.push(q);
      }
      return out;
    },

    fuochi(p, seme, W, H, D) {
      const n = { pochi: 4, normale: 7, tanti: 12 }[p.quanti];
      const k = H / 1080;
      const out = [];
      for (let i = 0; i < n; i++) {
        const r = (j) => caso(seme, i, j);
        const salita = fra(0.9, 1.3, r(1));
        const finestra = Math.max(0, D - salita - VITA_SCINTILLA);
        const t0 = finestra * (i + fra(0.1, 0.9, r(2))) / n;
        const xl = fra(0.14, 0.86, r(3)) * W;
        const xb = xl + fra(-0.04, 0.04, r(4)) * W;
        const yb = fra(0.14, 0.42, r(5)) * H;
        const c = colore(p, r(6));
        const scoppio = t0 + salita;
        out.push({ k: 'razzo', t0, vita: salita, xl, xb, y0: H * 1.02, yb, col: tinta(c, 255, 0.35), r: 2.4 * k });
        out.push({ k: 'bagliore', t0: scoppio, vita: 0.3, x: xb, y: yb, col: c, R: 0.1 * H });
        const m = Math.round(fra(70, 110, r(7)));
        const S = fra(0.42, 0.6, r(8)) * H;
        const c2 = r(9) < 0.35 ? colore(p, r(10)) : c;
        for (let j = 0; j < m; j++) {
          const rr = (z) => caso(seme, 7919 + i * 1000 + j, z);
          const ang = (j + fra(-0.4, 0.4, rr(1))) / m * GIRO;
          const cz = fra(-1, 1, rr(7));
          const v = S * Math.sqrt(1 - cz * cz) * fra(0.92, 1, rr(2));
          const cj = j % 2 ? c2 : c;
          out.push({
            k: 'scintilla', t0: scoppio, vita: fra(1.3, VITA_SCINTILLA, rr(3)), x: xb, y: yb,
            vx: v * Math.cos(ang), vy: v * Math.sin(ang), tau: 0.7, g: 0.1 * H,
            col: rr(4) < 0.25 ? tinta(cj, 255, 0.55) : tinta(cj, 255, 0.1), r: fra(2.2, 3.4, rr(5)) * k, fi: rr(6) * GIRO,
          });
        }
      }
      return out;
    },

    cuori(p, seme, W, H, D) {
      const n = { pochi: 12, normale: 26, tanti: 50 }[p.quanti];
      const out = [];
      for (let i = 0; i < n; i++) {
        const r = (j) => caso(seme, i, j);
        const s = fra(0.04, 0.085, r(1)) * H;
        const ys = H + s, yf = fra(0.08, 0.45, r(2)) * H;
        const vita = Math.min((ys - yf) / (fra(0.22, 0.36, r(3)) * H), D * 0.9);
        const c = colore(p, r(4));
        out.push({
          k: 'cuore', t0: (D - vita) * (i + fra(0.05, 0.95, r(5))) / n, vita, x0: fra(0.06, 0.94, r(6)) * W, ys, yf, s,
          amp: fra(0.01, 0.035, r(7)) * W, f: fra(0.35, 0.8, r(8)), fi: r(9) * GIRO,
          col: tinta(c, 0, 0), luce: tinta(c, 255, 0.55),
        });
      }
      return out;
    },

    neve(p, seme, W, H, D) {
      const n = { pochi: 90, normale: 180, tanti: 340 }[p.quanti];
      const k = H / 1080;
      const out = [];
      for (let i = 0; i < n; i++) {
        const r = (j) => caso(seme, i, j);
        const z = r(1);
        const rag = (1.4 + 6.5 * z * z) * k;
        const ex = rag * (z > 0.55 ? 2.2 : 1);
        const v = (0.05 + 0.14 * z) * H;
        const posto = r(2) < 0.4;
        const t0 = posto ? fra(0, Math.min(0.8, D * 0.2), r(3)) : fra(0, Math.max(0.1, D - FINE_NEVE), r(3));
        const y0 = posto ? fra(-0.05, 0.95, r(4)) * H : -ex - 1;
        out.push({
          k: 'fiocco', t0, vita: Math.min((H + ex + 1 - y0) / v, D - t0), x0: r(5) * W, y0, v, rag, ex,
          amp: (0.004 + 0.014 * z) * W, f: fra(0.12, 0.35, r(6)), fi: r(7) * GIRO,
          alfa: 0.5 + 0.45 * z, entra: posto ? 1 : 0.25, stella: z > 0.86 && r(8) < 0.5, alone: z > 0.55,
          col: tinta(colore(p, r(9)), 255, 0),
        });
      }
      return out;
    },

    palloncini(p, seme, W, H, D) {
      const n = { pochi: 6, normale: 12, tanti: 22 }[p.quanti];
      const k = H / 1080;
      const out = [];
      for (let i = 0; i < n; i++) {
        const r = (j) => caso(seme, i, j);
        const w = fra(0.07, 0.11, r(1)) * H;
        const bh = 1.22 * w, filo = 2.2 * w;
        const ys = H + bh / 2 + 4 * k, ye = -(bh / 2 + w * 0.13 + filo) - 4 * k;
        const vita = Math.min((ys - ye) / (fra(0.2, 0.32, r(2)) * H), D * 0.95);
        const c = colore(p, r(3));
        out.push({
          k: 'palloncino', t0: (D - vita) * (i + fra(0.05, 0.95, r(4))) / n, vita, x0: fra(0.05, 0.95, r(5)) * W, ys, ye, w, bh, filo,
          amp: fra(0.015, 0.03, r(6)) * W, om: fra(0.2, 0.45, r(7)) * GIRO, fi: r(8) * GIRO, unita: k,
          luce: tinta(c, 255, 0.55), col: tinta(c, 0, 0), scuro: tinta(c, 0, 0.25),
        });
      }
      return out;
    },

    bolle(p, seme, W, H, D) {
      const n = { pochi: 14, normale: 28, tanti: 56 }[p.quanti];
      const k = H / 1080;
      const out = [];
      for (let i = 0; i < n; i++) {
        const r = (j) => caso(seme, i, j);
        const rag = fra(0.018, 0.05, r(1)) * H;
        const ys = H + rag * 1.12 + 1, yp = fra(0.1, 0.6, r(2)) * H;
        const sale = Math.min((ys - yp) / (fra(0.14, 0.26, r(3)) * H), D * 0.92 - SCOPPIO_BOLLA);
        const vita = sale + SCOPPIO_BOLLA;
        out.push({
          k: 'bolla', t0: (D - vita) * (i + fra(0.05, 0.95, r(4))) / n, vita, sale, x0: fra(0.04, 0.96, r(5)) * W, ys, yp, rag,
          amp: fra(0.012, 0.03, r(6)) * W, f: fra(0.4, 0.9, r(7)), fi: r(8) * GIRO, unita: k, c: colore(p, r(9)),
        });
      }
      return out;
    },

    stelle(p, seme, W, H, D) {
      const n = { pochi: 20, normale: 40, tanti: 80 }[p.quanti];
      const nc = { pochi: 1, normale: 3, tanti: 5 }[p.quanti];
      const k = H / 1080;
      const out = [];
      for (let i = 0; i < n; i++) {
        const r = (j) => caso(seme, i, j);
        const vita = fra(0.7, 1.5, r(1));
        out.push({
          k: 'stella', t0: (D - vita) * (i + fra(0.05, 0.95, r(2))) / n, vita,
          x: fra(0.03, 0.97, r(3)) * W, y: fra(0.03, 0.97, r(4)) * H, s: fra(0.02, 0.048, r(5)) * H,
          fi: r(6) * GIRO, col: tinta(colore(p, r(7)), 255, 0.1),
        });
      }
      for (let i = 0; i < nc; i++) {
        const r = (j) => caso(seme, 5003 + i, j);
        const vita = fra(0.6, 0.9, r(1));
        const verso = r(2) < 0.5 ? 1 : -1;
        const ang = fra(18, 32, r(3)) * Math.PI / 180;
        const v = fra(1.1, 1.5, r(4)) * W;
        out.push({
          k: 'cadente', t0: (D - vita) * (i + fra(0.1, 0.9, r(5))) / nc, vita,
          x0: (verso > 0 ? fra(0.05, 0.55, r(6)) : fra(0.45, 0.95, r(6))) * W, y0: fra(0.02, 0.3, r(7)) * H,
          vx: verso * v * Math.cos(ang), vy: v * Math.sin(ang), coda: 0.22 * W, r: 3.2 * k,
          col: tinta(colore(p, r(8)), 255, 0.3),
        });
      }
      return out;
    },

    lampo(p, seme, W, H, D) {
      const a = rgb(p.colori[0]), b = rgb(p.colori[1] || p.colori[0]);
      return [{ k: 'lampo', t0: 0, vita: D, dentro: velo(a, 1), fuori: velo(b, 0.55) }];
    },
  };

  const conQuadro = (s, e) => { s.b = quadro(s.x, s.y, e); return s; };

  const STATI = {
    pezzo(q, t, pn) {
      const u = t - q.t0;
      const e = 1 - Math.exp(-u / q.tau);
      return conQuadro({
        x: q.x0 + q.vx * q.tau * e + q.deriva * u + q.amp * Math.sin(q.om * u + q.fi) * (1 - Math.exp(-u / 0.7)),
        y: yPezzo(q, u), a: stringi((pn.D - t) / FINE_CORIANDOLI, 0, 1),
        giro: q.giro * u, rot: q.a0 + q.gira * u,
      }, Math.max(q.w, q.h));
    },
    razzo(q, t) {
      const pos = (u) => ({ x: fra(q.xl, q.xb, u), y: q.y0 - (q.y0 - q.yb) * (1 - (1 - u) * (1 - u)) });
      const u = stringi((t - q.t0) / q.vita, 0, 1);
      const testa = pos(u), coda = pos(Math.max(0, u - 0.09));
      return { x: testa.x, y: testa.y, a: 1, b: [Math.min(testa.x, coda.x) - q.r * 2, Math.min(testa.y, coda.y) - q.r * 2, Math.max(testa.x, coda.x) + q.r * 2, Math.max(testa.y, coda.y) + q.r * 2], cx: coda.x, cy: coda.y };
    },
    bagliore(q, t) {
      const u = stringi((t - q.t0) / q.vita, 0, 1);
      const e = q.R * (0.4 + 0.6 * Math.sqrt(u));
      return { x: q.x, y: q.y, a: (1 - u) * (1 - u), e, b: quadro(q.x, q.y, e) };
    },
    scintilla(q, t) {
      const pos = (u) => {
        const e = 1 - Math.exp(-u / q.tau);
        return { x: q.x + q.vx * q.tau * e, y: q.y + q.vy * q.tau * e + q.g * q.tau * u - q.g * q.tau * q.tau * e };
      };
      const u = t - q.t0, f = stringi(u / q.vita, 0, 1);
      const qui = pos(u), prima = pos(Math.max(0, u - 0.07));
      const brilla = f > 0.6 ? 0.55 + 0.45 * Math.sin(38 * u + q.fi) : 1;
      return { x: qui.x, y: qui.y, a: Math.pow(1 - f, 1.6) * brilla, b: [Math.min(qui.x, prima.x) - q.r, Math.min(qui.y, prima.y) - q.r, Math.max(qui.x, prima.x) + q.r, Math.max(qui.y, prima.y) + q.r], px: prima.x, py: prima.y, rr: q.r * (1 - 0.5 * f) };
    },
    cuore(q, t) {
      const u = stringi((t - q.t0) / q.vita, 0, 1), tt = t - q.t0;
      const battito = 1 + 0.06 * Math.pow(Math.sin(GIRO * 0.8 * tt), 8);
      return conQuadro({
        x: q.x0 + q.amp * Math.sin(GIRO * q.f * tt + q.fi), y: q.ys - (q.ys - q.yf) * u,
        a: stringi((1 - u) / 0.3, 0, 1), sc: battito, rot: 0.22 * Math.sin(GIRO * q.f * tt + q.fi + 1.2),
      }, q.s * 0.75 * battito);
    },
    fiocco(q, t, pn) {
      const tt = t - q.t0;
      return conQuadro({
        x: q.x0 + q.amp * Math.sin(GIRO * q.f * tt + q.fi), y: q.y0 + q.v * tt,
        a: q.alfa * stringi(tt / q.entra, 0, 1) * stringi((pn.D - t) / FINE_NEVE, 0, 1),
        rot: 0.4 * tt + q.fi,
      }, q.ex);
    },
    palloncino(q, t) {
      const u = stringi((t - q.t0) / q.vita, 0, 1), tt = t - q.t0;
      const onda = q.om * tt + q.fi;
      const x = q.x0 + q.amp * Math.sin(onda), y = q.ys - (q.ys - q.ye) * u;
      return { x, y, a: 1, b: [x - q.w, y - q.bh / 2 - 2 * q.unita, x + q.w, y + q.bh / 2 + q.w * 0.13 + q.filo], rot: 0.12 * Math.cos(onda), onda };
    },
    bolla(q, t) {
      const tt = t - q.t0;
      const su = Math.min(tt, q.sale);
      const x = q.x0 + q.amp * Math.sin(GIRO * q.f * su + q.fi), y = q.ys - (q.ys - q.yp) * (su / q.sale);
      if (tt <= q.sale) return { x, y, a: 1, b: quadro(x, y, q.rag * 1.1), sc: 0.06 * Math.sin(9 * tt + q.fi), scoppio: -1 };
      const pu = stringi((tt - q.sale) / SCOPPIO_BOLLA, 0, 1);
      return { x, y, a: 1 - pu, b: quadro(x, y, q.rag * (2.2 + 1.2 * pu)), sc: 0, scoppio: pu };
    },
    stella(q, t) {
      const u = stringi((t - q.t0) / q.vita, 0, 1);
      return { x: q.x, y: q.y, a: Math.pow(Math.sin(Math.PI * u), 1.5), b: quadro(q.x, q.y, q.s), rot: 0.8 * u + q.fi };
    },
    cadente(q, t) {
      const tt = t - q.t0, u = stringi(tt / q.vita, 0, 1);
      const x = q.x0 + q.vx * tt, y = q.y0 + q.vy * tt;
      const v = Math.hypot(q.vx, q.vy), lung = q.coda * stringi(tt / 0.15, 0, 1);
      const cx = x - q.vx / v * lung, cy = y - q.vy / v * lung;
      return { x, y, a: Math.pow(Math.sin(Math.PI * u), 0.7), b: [Math.min(x, cx) - q.r, Math.min(y, cy) - q.r, Math.max(x, cx) + q.r, Math.max(y, cy) + q.r], cx, cy };
    },
    lampo(q, t, pn) {
      const a = t < LAMPO_SALITA ? LAMPO_PICCO * t / LAMPO_SALITA : LAMPO_PICCO * Math.pow(1 - stringi((t - LAMPO_SALITA) / (q.vita - LAMPO_SALITA), 0, 1), 2);
      return { x: pn.W / 2, y: pn.H / 2, a, e: Math.hypot(pn.W, pn.H), b: [0, 0, pn.W, pn.H] };
    },
  };

  function posa(ctx, dpr, x, y, rot, sx, sy) {
    const c = Math.cos(rot), s = Math.sin(rot);
    ctx.setTransform(dpr * c * sx, dpr * s * sx, -dpr * s * sy, dpr * c * sy, dpr * x, dpr * y);
  }

  function cuorePercorso(ctx, s) {
    const w = s / 2;
    ctx.beginPath();
    ctx.moveTo(0, w * 0.9);
    ctx.bezierCurveTo(-w * 1.25, w * 0.05, -w * 0.95, -w * 1.1, 0, -w * 0.45);
    ctx.bezierCurveTo(w * 0.95, -w * 1.1, w * 1.25, w * 0.05, 0, w * 0.9);
    ctx.closePath();
  }

  const DISEGNA = {
    pezzo(ctx, q, s, dpr) {
      const c = Math.cos(s.giro);
      posa(ctx, dpr, s.x, s.y, s.rot, 1, Math.max(0.12, Math.abs(c)));
      ctx.fillStyle = c >= 0 ? q.fronte : q.retro;
      if (q.tondo) { ctx.beginPath(); ctx.arc(0, 0, q.w / 2, 0, GIRO); ctx.fill(); } else ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
    },
    razzo(ctx, q, s, dpr) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(s.cx, s.cy, s.x, s.y);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, q.col);
      ctx.strokeStyle = g; ctx.lineWidth = q.r; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.cx, s.cy); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, q.r * 1.3, 0, GIRO); ctx.fill();
    },
    bagliore(ctx, q, s, dpr) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.e);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, velo(q.col, 0.6));
      g.addColorStop(1, velo(q.col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.e, 0, GIRO); ctx.fill();
    },
    scintilla(ctx, q, s, dpr) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = q.col; ctx.lineWidth = s.rr; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(s.x, s.y, s.rr, 0, GIRO); ctx.fill();
    },
    cuore(ctx, q, s, dpr) {
      posa(ctx, dpr, s.x, s.y, s.rot, s.sc, s.sc);
      cuorePercorso(ctx, q.s);
      ctx.fillStyle = q.col; ctx.fill();
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * 0.6;
      ctx.fillStyle = q.luce;
      ctx.beginPath(); ctx.ellipse(-q.s * 0.2, -q.s * 0.2, q.s * 0.09, q.s * 0.13, -0.6, 0, GIRO); ctx.fill();
      ctx.globalAlpha = a;
    },
    fiocco(ctx, q, s, dpr) {
      if (q.stella) {
        posa(ctx, dpr, s.x, s.y, s.rot, 1, 1);
        ctx.strokeStyle = q.col; ctx.lineWidth = Math.max(1, q.rag * 0.28); ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3, c = Math.cos(a), n = Math.sin(a);
          ctx.moveTo(0, 0); ctx.lineTo(c * q.rag * 1.6, n * q.rag * 1.6);
          ctx.moveTo(c * q.rag, n * q.rag); ctx.lineTo(c * q.rag + Math.cos(a + 0.7) * q.rag * 0.45, n * q.rag + Math.sin(a + 0.7) * q.rag * 0.45);
          ctx.moveTo(c * q.rag, n * q.rag); ctx.lineTo(c * q.rag + Math.cos(a - 0.7) * q.rag * 0.45, n * q.rag + Math.sin(a - 0.7) * q.rag * 0.45);
        }
        ctx.stroke();
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = q.col;
      if (q.alone) {
        const a = ctx.globalAlpha;
        ctx.globalAlpha = a * 0.22;
        ctx.beginPath(); ctx.arc(s.x, s.y, q.rag * 2.2, 0, GIRO); ctx.fill();
        ctx.globalAlpha = a;
      }
      ctx.beginPath(); ctx.arc(s.x, s.y, q.rag, 0, GIRO); ctx.fill();
    },
    palloncino(ctx, q, s, dpr) {
      posa(ctx, dpr, s.x, s.y, s.rot, 1, 1);
      const piede = q.bh / 2 + q.w * 0.08;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2 * q.unita;
      ctx.beginPath(); ctx.moveTo(0, piede);
      ctx.bezierCurveTo(q.w * 0.18 * Math.sin(s.onda + 1), piede + q.filo * 0.35, -q.w * 0.18 * Math.sin(s.onda + 2), piede + q.filo * 0.7, q.w * 0.1 * Math.sin(s.onda + 3), piede + q.filo);
      ctx.stroke();
      ctx.fillStyle = q.scuro;
      ctx.beginPath(); ctx.moveTo(-q.w * 0.07, piede); ctx.lineTo(q.w * 0.07, piede); ctx.lineTo(0, q.bh / 2 - 2 * q.unita); ctx.closePath(); ctx.fill();
      const g = ctx.createRadialGradient(-q.w * 0.2, -q.bh * 0.25, 0, -q.w * 0.1, -q.bh * 0.1, q.w * 0.8);
      g.addColorStop(0, q.luce); g.addColorStop(0.35, q.col); g.addColorStop(1, q.scuro);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, q.w / 2, q.bh / 2, 0, 0, GIRO); ctx.fill();
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * 0.45; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(-q.w * 0.2, -q.bh * 0.22, q.w * 0.08, q.w * 0.14, -0.5, 0, GIRO); ctx.fill();
      ctx.globalAlpha = a;
    },
    bolla(ctx, q, s, dpr) {
      if (s.scoppio >= 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const r = q.rag * (1 + 0.6 * s.scoppio);
        ctx.strokeStyle = velo(q.c, 0.8); ctx.lineWidth = 1.4 * q.unita;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, GIRO); ctx.stroke();
        ctx.fillStyle = velo(q.c, 0.9);
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3 + q.fi, d = q.rag * (1 + 1.2 * s.scoppio);
          ctx.beginPath(); ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 1.6 * q.unita, 0, GIRO); ctx.fill();
        }
        return;
      }
      posa(ctx, dpr, s.x, s.y, 0, 1 + s.sc, 1 - s.sc);
      const g = ctx.createRadialGradient(-q.rag * 0.3, -q.rag * 0.3, 0, 0, 0, q.rag);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, velo(q.c, 0.1)); g.addColorStop(1, velo(q.c, 0.48));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, q.rag, 0, GIRO); ctx.fill();
      ctx.strokeStyle = velo(q.c, 0.85); ctx.lineWidth = 1.6 * q.unita; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2 * q.unita; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, q.rag * 0.72, Math.PI * 1.1, Math.PI * 1.38); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(q.rag * 0.42, q.rag * 0.42, q.rag * 0.1, 0, GIRO); ctx.fill();
    },
    stella(ctx, q, s, dpr) {
      posa(ctx, dpr, s.x, s.y, s.rot, 1, 1);
      ctx.fillStyle = q.col;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, r = i % 2 ? q.s * 0.18 : q.s;
        if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.moveTo(r, 0);
      }
      ctx.closePath(); ctx.fill();
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * 0.35; ctx.fillStyle = q.col;
      ctx.beginPath(); ctx.arc(0, 0, q.s * 0.5, 0, GIRO); ctx.fill();
      ctx.globalAlpha = a * 0.8; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, q.s * 0.14, 0, GIRO); ctx.fill();
      ctx.globalAlpha = a;
    },
    cadente(ctx, q, s, dpr) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(s.cx, s.cy, s.x, s.y);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, q.col);
      ctx.strokeStyle = g; ctx.lineWidth = q.r * 0.85; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.cx, s.cy); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, q.r, 0, GIRO); ctx.fill();
    },
    lampo(ctx, q, s, dpr) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.e / 2);
      g.addColorStop(0, q.dentro); g.addColorStop(1, q.fuori);
      ctx.fillStyle = g; ctx.fillRect(0, 0, s.x * 2, s.y * 2);
    },
  };

  function parametri(p) {
    const x = p && typeof p === 'object' ? p : {};
    const nome = Object.prototype.hasOwnProperty.call(CATALOGO, x.nome) ? x.nome : 'coriandoli';
    const d = CATALOGO[nome];
    const colori = (Array.isArray(x.colori) ? x.colori : []).filter((c) => /^#[0-9a-f]{6}$/i.test(String(c))).slice(0, 5);
    const n = Math.round(Number(x.durata));
    return {
      nome,
      colori: colori.length ? colori : d.colori.slice(),
      quanti: QUANTI.indexOf(x.quanti) >= 0 ? x.quanti : d.quanti,
      durata: Number.isFinite(n) ? stringi(n, d.min, d.max) : d.durata,
    };
  }

  function piano(p, seme, W, H) {
    const pp = parametri(p);
    const w = Math.max(1, Number(W) || 1), h = Math.max(1, Number(H) || 1);
    return { nome: pp.nome, D: pp.durata, W: w, H: h, luce: pp.nome === 'fuochi' || pp.nome === 'stelle', parti: PIANI[pp.nome](pp, (seme >>> 0) || 1, w, h, pp.durata) };
  }

  function stato(pn, q, t) {
    if (t < q.t0 || t > q.t0 + q.vita) return null;
    return STATI[q.k](q, t, pn);
  }

  function disegna(ctx, pn, t, dpr) {
    const r = dpr || 1;
    ctx.globalCompositeOperation = pn.luce ? 'lighter' : 'source-over';
    for (let i = 0; i < pn.parti.length; i++) {
      const q = pn.parti[i];
      const s = stato(pn, q, t);
      if (!s || s.a <= 0.003) continue;
      ctx.globalAlpha = Math.min(1, s.a);
      DISEGNA[q.k](ctx, q, s, r);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  function prepara(canvas) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.clientWidth || window.innerWidth || 1920;
    const H = canvas.clientHeight || window.innerHeight || 1080;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    return { ctx: canvas.getContext('2d'), dpr, W, H };
  }

  function anima(canvas, p, seme, fatto) {
    const { ctx, dpr, W, H } = prepara(canvas);
    const pn = piano(p, seme, W, H);
    let inizio = null, raf = 0, fermo = false;
    const pulisci = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); };
    const giro = (ora) => {
      if (fermo) return;
      if (inizio == null) inizio = ora;
      const t = (ora - inizio) / 1000;
      pulisci();
      if (t >= pn.D) { fermo = true; if (fatto) fatto(); return; }
      disegna(ctx, pn, t, dpr);
      raf = requestAnimationFrame(giro);
    };
    raf = requestAnimationFrame(giro);
    return () => { fermo = true; cancelAnimationFrame(raf); pulisci(); };
  }

  function fermo(canvas, p, seme, frazione) {
    const { ctx, dpr, W, H } = prepara(canvas);
    const pn = piano(p, seme, W, H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    disegna(ctx, pn, pn.D * stringi(Number(frazione) || 0.4, 0, 1), dpr);
    return pn;
  }

  window.SB_DISEGNATI = { CATALOGO, NOMI, QUANTI, parametri, piano, stato, disegna, anima, fermo };
})();
