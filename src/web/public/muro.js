// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';

  const ANIMAZIONI = ['sale', 'linea', 'rimbalzo', 'sfreccia', 'cade', 'coriandoli', 'salto', 'lancio', 'pulsa', 'orbita'];
  const FIGURE = ['fuochi', 'fontana', 'spirale', 'pioggia', 'trenino', 'piramide', 'scritta', 'cuore'];
  const RAD2 = Math.SQRT2;
  const FPS = 30;
  const GRADI = 180 / Math.PI;

  const tra = (a, b, u) => a + (b - a) * u;
  const stringi = (v, a, b) => Math.min(b, Math.max(a, v));
  const liscio = (u) => { const x = stringi(u, 0, 1); return x * x * (3 - 2 * x); };
  const esce = (u) => 1 - Math.pow(1 - stringi(u, 0, 1), 3);

  function dado(rnd) {
    const r = typeof rnd === 'function' ? rnd : Math.random;
    const u = () => stringi(Number(r()) || 0, 0, 0.999999);
    return {
      u,
      fra: (a, b) => (b < a ? (a + b) / 2 : tra(a, b, u())),
      segno: () => (u() < 0.5 ? -1 : 1),
    };
  }

  function lato(area, cfg, rnd) {
    const d = dado(rnd);
    const c = cfg || {};
    const corto = Math.max(1, Math.min(area.w, area.h));
    const base = corto * stringi(Number(c.grandezza) || 8, 1, 50) / 100;
    const varia = stringi(Number(c.varia) || 0, 0, 100) / 100;
    const min = Math.max(4, Number(c.minPx) || 4);
    const max = Math.max(min, Number(c.maxPx) || 4096);
    const s = stringi(base * (1 + varia * (2 * d.u() - 1)), min, max);
    return Math.max(2, Math.min(s, corto / 2));
  }

  function fotogramma(x, y, r, sx, sy, o) {
    return { x, y, r: r || 0, sx: sx == null ? 1 : sx, sy: sy == null ? (sx == null ? 1 : sx) : sy, o: o == null ? 1 : o };
  }

  function sale(area, s, d, D) {
    const W = area.w, H = area.h, h = s / 2, q = h * RAD2;
    const A = Math.min(0.6 * s, (W - s) / 2) * d.fra(0.5, 1);
    const x0 = d.fra(h + A, W - h - A);
    const cicli = d.fra(1.2, 2.2), fase = d.u() * Math.PI * 2;
    const durata = D * d.fra(0.9, 1.1);
    return {
      durata, eventi: [],
      p: (t) => {
        const a = Math.PI * 2 * cicli * t + fase;
        return fotogramma(x0 + A * Math.sin(a), tra(H + q, -q, t), 8 * Math.cos(a));
      },
    };
  }

  function linea(area, s, d, D) {
    const W = area.w, H = area.h, h = s / 2, q = h * RAD2;
    const verso = d.segno();
    const y0 = d.fra(h, H - h), y1 = d.fra(h, H - h);
    const xa = verso > 0 ? -q : W + q, xb = verso > 0 ? W + q : -q;
    const giro = verso * d.fra(0, 220);
    const durata = D * d.fra(0.9, 1.1);
    return { durata, eventi: [], p: (t) => fotogramma(tra(xa, xb, t), tra(y0, y1, t), giro * t) };
  }

  function balistica(y0, v0, g, e, suolo, h, T) {
    const tratti = [];
    let t = 0, y = y0, v = v0;
    const vMin = Math.sqrt(v0 * v0 + 2 * g * Math.max(1, suolo - y0)) * 0.08;
    for (let giri = 0; giri < 40 && t < T; giri++) {
      const dt = (v + Math.sqrt(Math.max(0, v * v + 2 * g * (suolo - y)))) / g;
      tratti.push({ tipo: 'volo', da: t, a: t + dt, y, v });
      t += dt;
      const vu = g * dt - v;
      if (vu < vMin || t >= T) break;
      const schiaccia = Math.min(0.22 * h, vu * 0.035);
      const c = (schiaccia * Math.PI) / (2 * vu);
      const c2 = c / e;
      tratti.push({ tipo: 'urto', da: t, a: t + c + c2, schiaccia, c, c2 });
      t += c + c2;
      y = suolo; v = e * vu;
    }
    tratti.push({ tipo: 'fermo', da: t, a: Infinity });
    const a = (tau) => {
      for (const tr of tratti) {
        if (tau >= tr.a) continue;
        const k = tau - tr.da;
        if (tr.tipo === 'volo') return { y: tr.y - tr.v * k + (g * k * k) / 2, sy: 1 };
        if (tr.tipo === 'urto') {
          const giu = k <= tr.c ? tr.schiaccia * Math.sin((Math.PI * k) / (2 * tr.c)) : tr.schiaccia * Math.cos((Math.PI * (k - tr.c)) / (2 * tr.c2));
          return { y: suolo + giu, sy: 1 - giu / h };
        }
        break;
      }
      return { y: suolo, sy: 1 };
    };
    const urti = tratti.filter((tr) => tr.tipo === 'urto');
    const istanti = [];
    for (const tr of urti) istanti.push(tr.da, tr.da + tr.c, tr.a);
    return { a, istanti, urti };
  }

  function conSuolo(s, T, pos, xa, xb) {
    const h = s / 2;
    return (t) => {
      const v = pos(t * T);
      const x = tra(xa, xb, t);
      return fotogramma(x, v.y, ((x - xa) / h) * GRADI, 1 / v.sy, v.sy);
    };
  }

  function rimbalzo(area, s, d, D) {
    const W = area.w, H = area.h, h = s / 2, q = h * RAD2;
    const verso = d.segno();
    const suolo = H - h;
    const y0 = d.fra(h, Math.min(suolo, Math.max(h, H * 0.45)));
    const e = d.fra(0.55, 0.75);
    const durata = D * d.fra(0.9, 1.1);
    const T = durata / 1000;
    const t1 = T * d.fra(0.18, 0.28);
    const caduta = Math.max(1, suolo - y0);
    const g = (2 * caduta) / (t1 * t1);
    const b = balistica(suolo - caduta, 0, g, e, suolo, h, T);
    const xa = verso > 0 ? -q : W + q, xb = verso > 0 ? W + q : -q;
    return { durata, eventi: b.istanti.map((k) => k / T).filter((k) => k > 0 && k < 1), urti: b.urti.map((u) => (u.da + u.c) / T).filter((k) => k < 1), p: conSuolo(s, T, b.a, xa, xb) };
  }

  function lancio(area, s, d, D) {
    const W = area.w, H = area.h, h = s / 2, q = h * RAD2;
    const verso = d.segno();
    const suolo = H - h;
    const y0 = d.fra(H * 0.55, Math.min(suolo, H * 0.8));
    const ya = d.fra(h, Math.max(h, Math.min(y0, H * 0.35)));
    const xa = verso > 0 ? -q : W + q, xb = verso > 0 ? W + q : -q;
    const durata = D * d.fra(0.9, 1.1);
    const T = durata / 1000;
    const rho = Math.sqrt((suolo - ya) / Math.max(1e-6, y0 - ya));
    const atterra = d.fra(0.5, 0.65);
    const ta = (atterra / (1 + rho)) * T;
    const v0 = (2 * (y0 - ya)) / ta;
    const g = v0 / ta;
    const e = d.fra(0.5, 0.7);
    const b = balistica(y0, v0, g, e, suolo, h, T);
    return { durata, eventi: [ta / T, ...b.istanti.map((k) => k / T)].filter((k) => k > 0 && k < 1), urti: b.urti.map((u) => (u.da + u.c) / T).filter((k) => k < 1), apice: ya, p: conSuolo(s, T, b.a, xa, xb) };
  }

  const TETTO_PENDENZA = (12 * Math.PI) / 180;
  const ALLUNGA = 1.45, SCHIACCIA = 0.75;
  const ingombroV = (h, th) => h * Math.sqrt(Math.pow(ALLUNGA * Math.sin(th), 2) + Math.pow(SCHIACCIA * Math.cos(th), 2));

  function sfreccia(area, s, d, D) {
    const W = area.w, H = area.h, h = s / 2, q = h * RAD2;
    const verso = d.segno();
    const e = ingombroV(h, TETTO_PENDENZA);
    const xe = q * ALLUNGA;
    const campo = W + 2 * xe;
    const y0 = d.fra(e, H - e);
    const salto = campo * Math.tan(TETTO_PENDENZA);
    const y1 = d.fra(Math.max(e, y0 - salto), Math.min(H - e, y0 + salto));
    const xa = verso > 0 ? -xe : W + xe, xb = verso > 0 ? W + xe : -xe;
    const inclina = Math.atan((y1 - y0) / (xb - xa)) * GRADI;
    const durata = Math.max(500, D * d.fra(0.15, 0.22));
    return { durata, eventi: [], p: (t) => fotogramma(tra(xa, xb, t), tra(y0, y1, t), inclina, ALLUNGA, SCHIACCIA) };
  }

  function cade(area, s, d, D) {
    const W = area.w, H = area.h, h = s / 2, q = h * RAD2;
    const x0 = d.fra(q, W - q);
    const yAppesa = d.fra(q, Math.max(q, H * 0.3));
    const appesa = d.fra(0.35, 0.5);
    const giro = d.segno() * d.fra(180, 400);
    const deriva = d.fra(Math.max(q - x0, -0.1 * W), Math.min(W - q - x0, 0.1 * W));
    const durata = D * d.fra(0.8, 1);
    const T = durata / 1000;
    const fine = H + q;
    return {
      durata, eventi: [appesa], nasceDentro: true,
      p: (t) => {
        if (t <= appesa) {
          const u = t / appesa;
          const ampiezza = tra(2, 10, u);
          return fotogramma(x0, yAppesa, ampiezza * Math.sin(Math.PI * 2 * 9 * t * T));
        }
        const u = (t - appesa) / (1 - appesa);
        const r0 = 10 * Math.sin(Math.PI * 2 * 9 * appesa * T);
        return fotogramma(x0 + deriva * u * u, yAppesa + (fine - yAppesa) * u * u, r0 + giro * u * u);
      },
    };
  }

  function coriandoli(area, s, d, D) {
    const W = area.w, H = area.h, h = s / 2, q = h * RAD2;
    const A = Math.min(1.2 * s, (W - 2 * q) / 2) * d.fra(0.5, 1);
    const x0 = d.fra(q + A, W - q - A);
    const f = d.fra(1.5, 2.5), fase = d.u() * Math.PI * 2;
    const k = Math.max(2, Math.round(2 * f));
    const giro = d.fra(1, 3), fase2 = d.u() * Math.PI * 2;
    const durata = D * d.fra(1, 1.2);
    return {
      durata, eventi: [],
      p: (t) => {
        const a = Math.PI * 2 * f * t + fase;
        const u = t - (0.35 * Math.sin(Math.PI * 2 * k * t)) / (Math.PI * 2 * k);
        const gira = 0.35 + 0.65 * Math.abs(Math.cos(Math.PI * 2 * giro * t + fase2));
        return fotogramma(x0 + A * Math.sin(a), tra(-q, H + q, u), 35 * Math.cos(a), gira, 1);
      },
    };
  }

  function salto(area, s, d, D) {
    const W = area.w, H = area.h, h = s / 2, q = h * RAD2;
    const ya = d.fra(q, Math.max(q, H * 0.55));
    const yb = H + q;
    const x0 = d.fra(q, W - q);
    const x1 = d.fra(Math.max(q, x0 - 0.25 * W), Math.min(W - q, x0 + 0.25 * W));
    const giro = d.segno() * d.fra(180, 540);
    const durata = D * d.fra(0.45, 0.6);
    return { durata, eventi: [0.5], apice: ya, p: (t) => fotogramma(tra(x0, x1, t), ya + (yb - ya) * Math.pow(2 * t - 1, 2), giro * t) };
  }

  const PICCO = 1.22;
  function battito(u, colpi) {
    const k = (u * colpi) % 1;
    const gobba = (c, w, a) => { const z = (k - c) / w; return Math.abs(z) < 1 ? a * Math.pow(1 - z * z, 2) : 0; };
    return 1 + gobba(0.12, 0.1, PICCO - 1) + gobba(0.34, 0.09, 0.12);
  }

  function pulsa(area, s, d, D) {
    const W = area.w, H = area.h, m = (s / 2) * PICCO;
    const x = d.fra(m, W - m), y = d.fra(m, H - m);
    const colpi = Math.round(d.fra(3, 4));
    const durata = D * d.fra(0.6, 0.8);
    const eventi = [];
    for (let i = 0; i < colpi; i++) eventi.push((i + 0.12) / colpi, (i + 0.34) / colpi);
    return { durata, eventi, nasceDentro: true, p: (t) => { const k = battito(t, colpi); return fotogramma(x, y, 0, k, k); } };
  }

  function orbita(area, s, d, D) {
    const W = area.w, H = area.h, h = s / 2;
    const cx = W / 2, cy = H / 2;
    const rx = (W / 2 - h) * d.fra(0.45, 1), ry = (H / 2 - h) * d.fra(0.45, 1);
    const giri = d.fra(0.8, 1.3), verso = d.segno(), f0 = d.u() * Math.PI * 2;
    const durata = D * d.fra(1, 1.2);
    return {
      durata, eventi: [], nasceDentro: true,
      p: (t) => { const a = f0 + verso * Math.PI * 2 * giri * t; return fotogramma(cx + rx * Math.cos(a), cy + ry * Math.sin(a), 0); },
    };
  }

  const FABBRICA = { sale, linea, rimbalzo, sfreccia, cade, coriandoli, salto, lancio, pulsa, orbita };

  function anima(nome, area, s, rnd, opz) {
    const f = FABBRICA[nome] || sale;
    const D = Math.max(1000, (Number((opz || {}).durata) || 6) * 1000);
    return f(area, s, dado(rnd), D);
  }

  function inviluppo(t, modo) {
    if (modo === 'nessuna') return 1;
    return liscio(t / 0.1) * liscio((1 - t) / 0.1);
  }

  function tempi(tr, fps) {
    const n = Math.max(2, Math.ceil((tr.durata / 1000) * (fps || FPS)));
    const set = new Set();
    for (let i = 0; i <= n; i++) set.add(i / n);
    for (const e of tr.eventi || []) if (e > 0 && e < 1) set.add(e);
    return [...set].sort((a, b) => a - b);
  }

  const cifra = (v) => Math.round(v * 100) / 100;

  function fotogrammi(tr, s, opz) {
    const o = opz || {};
    const h = s / 2;
    const modo = tr.nasceDentro ? (o.entrata || 'zoom') : 'nessuna';
    return tempi(tr, o.fps).map((t) => {
      const f = tr.p(t);
      const env = inviluppo(t, modo);
      const k = modo === 'zoom' ? env : 1;
      const op = (modo === 'dissolvenza' ? env : 1) * f.o;
      return {
        offset: t,
        transform: 'translate(' + cifra(f.x - h) + 'px,' + cifra(f.y - h) + 'px) rotate(' + cifra(f.r) + 'deg) scale(' + cifra(f.sx * k) + ',' + cifra(f.sy * k) + ')',
        opacity: cifra(op),
      };
    });
  }

  function traiettoria(durata, p, eventi) { return { durata, p, eventi: eventi || [] }; }

  function fuochi(area, s, n, d, D) {
    const W = area.w, H = area.h, h = s / 2, q = h * RAD2;
    const px = d.fra(W * 0.3, W * 0.7), py = d.fra(Math.max(q, H * 0.25), Math.max(q, H * 0.5));
    const salita = D * 0.3;
    const x0 = px + W * d.fra(-0.05, 0.05);
    const razzo = traiettoria(salita, (t) => { const u = esce(t); return fotogramma(tra(x0, px, u), tra(H + q, py, u), 0, 0.8, 0.8); }, []);
    const membri = [{ ritardo: 0, tr: razzo, ruolo: 'razzo' }];
    const theta0 = d.u() * Math.PI * 2;
    const R = Math.min(W, H) * d.fra(0.28, 0.4);
    const scoppio = D * 0.7;
    const T = scoppio / 1000;
    const g = (0.35 * H) / (T * T);
    for (let i = 0; i < n; i++) {
      const a = theta0 + (Math.PI * 2 * i) / n;
      const giro = d.segno() * d.fra(90, 360);
      const p = (t) => {
        const u = 1 - Math.exp(-4 * t);
        const tau = t * T;
        return fotogramma(px + Math.cos(a) * R * u, py + Math.sin(a) * R * u + (g * tau * tau) / 2, giro * t, 1, 1, 1 - liscio((t - 0.6) / 0.4));
      };
      membri.push({ ritardo: salita, tr: traiettoria(scoppio, p, []), angolo: a, origine: { x: px, y: py } });
    }
    return membri;
  }

  function fontana(area, s, n, d, D) {
    const W = area.w, H = area.h, h = s / 2, q = h * RAD2;
    const ugello = { x: W / 2, y: H + q };
    const membri = [];
    const passo = (D * 0.55) / Math.max(1, n);
    for (let i = 0; i < n; i++) {
      const verso = i % 2 ? 1 : -1;
      const larg = d.fra(0.1, 0.45) * W * verso;
      const ya = d.fra(Math.max(q, H * 0.12), Math.max(q, H * 0.45));
      const giro = verso * d.fra(90, 300);
      const dur = D * d.fra(0.4, 0.5);
      const p = (t) => fotogramma(ugello.x + larg * t, ya + (ugello.y - ya) * Math.pow(2 * t - 1, 2), giro * t);
      membri.push({ ritardo: i * passo, tr: traiettoria(dur, p, [0.5]), origine: ugello });
    }
    return membri;
  }

  function spirale(area, s, n, d, D) {
    const W = area.w, H = area.h, h = s / 2;
    const cx = W / 2, cy = H / 2;
    const rx = W / 2 - h, ry = H / 2 - h;
    const bracci = 3;
    const giri = d.fra(1.2, 1.8);
    const PHI = Math.PI * 2 * giri;
    const verso = d.segno();
    const membri = [];
    const passo = (D * 0.5) / Math.max(1, n);
    for (let i = 0; i < n; i++) {
      const psi = (Math.PI * 2 * (i % bracci)) / bracci;
      const dur = D * 0.5;
      const p = (t) => {
        const phi = PHI * t;
        const rr = phi / PHI;
        const a = psi + verso * phi;
        return fotogramma(cx + rx * rr * Math.cos(a), cy + ry * rr * Math.sin(a), verso * phi * GRADI * 0.2, 1, 1, 1 - liscio((t - 0.75) / 0.25));
      };
      membri.push({ ritardo: i * passo, tr: traiettoria(dur, p, []), braccio: psi, verso, PHI });
    }
    return membri;
  }

  function pioggia(area, s, n, d, D) {
    const W = area.w, H = area.h, h = s / 2, q = h * RAD2;
    const col = (W - 2 * h) / Math.max(1, n);
    const membri = [];
    for (let i = 0; i < n; i++) {
      const x = h + (i + 0.5 + d.fra(-0.3, 0.3)) * col;
      const dur = D * d.fra(0.45, 0.65);
      const giro = d.segno() * d.fra(0, 120);
      const p = (t) => fotogramma(x, tra(-q, H + q, t * t * 0.4 + t * 0.6), giro * t);
      membri.push({ ritardo: d.fra(0, D * 0.45), tr: traiettoria(dur, p, []), colonna: i, larghezza: col });
    }
    return membri;
  }

  function trenino(area, s, n, d, D) {
    const W = area.w, H = area.h, h = s / 2, q = h * RAD2;
    const A = Math.min(H * 0.25, (H - s) / 2) * d.fra(0.5, 1);
    const yc = d.fra(h + A, H - h - A);
    const onde = d.fra(1, 2.2), fase = d.u() * Math.PI * 2;
    const verso = d.segno();
    const corsa = W + 2 * q;
    const dur = D * 0.6;
    const vel = corsa / dur;
    const passo = (s * 1.05) / vel;
    const xa = verso > 0 ? -q : W + q;
    const quota = (x) => yc + A * Math.sin((Math.PI * 2 * onde * x) / W + fase);
    const pendenza = (x) => Math.atan((A * Math.PI * 2 * onde * Math.cos((Math.PI * 2 * onde * x) / W + fase)) / W) * GRADI;
    const p = (t) => { const x = xa + verso * corsa * t; return fotogramma(x, quota(x), pendenza(x)); };
    const membri = [];
    for (let i = 0; i < n; i++) membri.push({ ritardo: i * passo, tr: traiettoria(dur, p, []), vagone: i });
    return membri;
  }

  function piramide(area, s, n, d, D) {
    const W = area.w, H = area.h;
    let k = 1;
    while (((k + 1) * (k + 2)) / 2 <= n) k++;
    const passoV = Math.sqrt(3) / 2;
    const lato = Math.min(s, (0.9 * W) / k, (0.9 * H) / (1 + (k - 1) * passoV));
    const hh = lato / 2, q = hh * RAD2;
    const membri = [];
    const posti = [];
    for (let r = 0; r < k; r++) {
      for (let j = 0; j < k - r; j++) {
        posti.push({ fila: r, j, x: W / 2 + (j - (k - 1 - r) / 2) * lato, y: H - hh - r * lato * passoV });
      }
    }
    const posa = (D * 0.55) / posti.length;
    const fermi = D * 0.2;
    const crollo = D * 0.3;
    const ultimo = posa * (posti.length - 1) + D * 0.12;
    posti.forEach((pt, i) => {
      const arrivo = D * 0.12;
      const inizio = i * posa;
      const tutto = ultimo - inizio + fermi + crollo;
      const fa = arrivo / tutto, fb = (arrivo + (ultimo - inizio - arrivo) + fermi) / tutto;
      const vx = d.fra(-0.25, 0.25) * W;
      const giro = d.segno() * d.fra(90, 300);
      const p = (t) => {
        if (t <= fa) { const u = t / fa; return fotogramma(pt.x, tra(-q, pt.y, u * u), 0); }
        if (t <= fb) return fotogramma(pt.x, pt.y, 0);
        const u = (t - fb) / (1 - fb);
        return fotogramma(pt.x + vx * u, pt.y + (H + q - pt.y) * u * u, giro * u);
      };
      membri.push({ ritardo: inizio, tr: traiettoria(tutto, p, [fa, fb]), fila: pt.fila, j: pt.j, posto: { x: pt.x, y: pt.y }, lato });
    });
    return membri;
  }

  const GLIFI = {
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
    J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    N: ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
    X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
    0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
    '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
    ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  };

  function parola(testo) {
    const pulita = String(testo || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split('').filter((c) => GLIFI[c]).join('').replace(/\s+/g, ' ').trim().slice(0, 8);
    return pulita || 'GG';
  }

  function punti(testo) {
    const p = parola(testo);
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const g = GLIFI[p[i]];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '1') out.push({ col: i * 6 + c, riga: r });
    }
    return { parola: p, colonne: p.length * 6 - 1, righe: 7, punti: out };
  }

  function scritta(area, s, n, d, D, opz) {
    const W = area.w, H = area.h;
    const P = punti((opz || {}).parola);
    const casella = Math.min((0.9 * W) / P.colonne, (0.7 * H) / P.righe);
    const lato = Math.min(s, casella * 0.95);
    const hh = lato / 2, q = hh * RAD2;
    const x0 = (W - P.colonne * casella) / 2 + casella / 2;
    const y0 = (H - P.righe * casella) / 2 + casella / 2;
    const cx = W / 2, cy = H / 2;
    const membri = [];
    const arrivo = D * 0.3, fermo = D * 0.35, via = D * 0.35;
    const fa = arrivo / D, fb = (arrivo + fermo) / D;
    for (const pt of P.punti) {
      const tx = x0 + pt.col * casella, ty = y0 + pt.riga * casella;
      const bordo = Math.floor(d.u() * 4);
      const sx = bordo === 0 ? -q : bordo === 1 ? W + q : d.fra(0, W);
      const sy = bordo === 2 ? -q : bordo === 3 ? H + q : d.fra(0, H);
      const dx = tx - cx, dy = ty - cy, lung = Math.hypot(dx, dy) || 1;
      const fuori = Math.hypot(W, H);
      const ex = tx + (dx / lung) * fuori, ey = ty + (dy / lung) * fuori;
      const ondeggia = d.u() * Math.PI * 2;
      const p = (t) => {
        if (t <= fa) { const u = esce(t / fa); return fotogramma(tra(sx, tx, u), tra(sy, ty, u), (1 - u) * 180); }
        if (t <= fb) { const u = (t - fa) / (fb - fa); return fotogramma(tx, ty, 6 * Math.sin(Math.PI * 4 * u + ondeggia)); }
        const u = (t - fb) / (1 - fb);
        return fotogramma(tra(tx, ex, u * u), tra(ty, ey, u * u), 0, 1, 1, 1 - liscio((u - 0.5) / 0.5));
      };
      membri.push({ ritardo: d.fra(0, D * 0.08), tr: traiettoria(D, p, [fa, fb]), casella: { col: pt.col, riga: pt.riga }, posto: { x: tx, y: ty }, lato });
    }
    return membri;
  }

  const cuoreX = (u) => 16 * Math.pow(Math.sin(u), 3);
  const cuoreY = (u) => 13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u);

  function lungoIlCuore(n) {
    const N = 2000;
    const lun = [0];
    for (let i = 1; i <= N; i++) {
      const a = (Math.PI * 2 * (i - 1)) / N, b = (Math.PI * 2 * i) / N;
      lun.push(lun[i - 1] + Math.hypot(cuoreX(b) - cuoreX(a), cuoreY(b) - cuoreY(a)));
    }
    const tot = lun[N];
    const out = [];
    let j = 0;
    for (let k = 0; k < n; k++) {
      const obiettivo = (tot * k) / n;
      while (j < N && lun[j + 1] < obiettivo) j++;
      const frazione = (obiettivo - lun[j]) / ((lun[j + 1] - lun[j]) || 1);
      out.push(((j + frazione) * Math.PI * 2) / N);
    }
    return out;
  }

  function cuore(area, s, n, d, D) {
    const W = area.w, H = area.h;
    const pari = n % 2 ? n + 1 : n;
    const primo = Math.min(s, Math.min(W, H) / 4);
    const sc = Math.min((0.85 * W - primo) / 32, (0.85 * H - primo) / 29);
    const cx = W / 2, cy = H / 2;
    const posti = lungoIlCuore(pari).map((u) => ({ u, x: cx + sc * cuoreX(u), y: cy - sc * (cuoreY(u) + 2.5) }));
    let vicini = Infinity;
    for (let i = 0; i < posti.length; i++) for (let j = i + 1; j < posti.length; j++) vicini = Math.min(vicini, Math.hypot(posti[i].x - posti[j].x, posti[i].y - posti[j].y));
    const lato = Math.min(primo, (0.95 * vicini) / PICCO);
    const membri = [];
    const arrivo = D * 0.25, fermo = D * 0.45;
    const fa = arrivo / D, fb = (arrivo + fermo) / D;
    for (const pt of posti) {
      const sale = H * d.fra(0.6, 1.1);
      const deriva = d.fra(-0.1, 0.1) * W;
      const p = (t) => {
        if (t <= fa) { const v = esce(t / fa); return fotogramma(tra(cx, pt.x, v), tra(cy, pt.y, v), 0, v, v); }
        if (t <= fb) { const v = (t - fa) / (fb - fa); const k = battito(v, 2); return fotogramma(pt.x, pt.y, 0, k, k); }
        const v = (t - fb) / (1 - fb);
        return fotogramma(pt.x + deriva * v, pt.y - sale * v * v, 0, 1, 1, 1 - liscio((v - 0.4) / 0.6));
      };
      membri.push({ ritardo: 0, tr: traiettoria(D, p, [fa, fb]), u: pt.u, posto: { x: pt.x, y: pt.y }, scala: sc, centro: { x: cx, y: cy }, lato });
    }
    return membri;
  }

  const FIGURA = { fuochi, fontana, spirale, pioggia, trenino, piramide, scritta, cuore };

  function figura(nome, area, s, n, rnd, opz) {
    const d = dado(rnd);
    const quale = FIGURE.includes(nome) ? nome : FIGURE[Math.floor(d.u() * FIGURE.length)];
    const quante = Math.max(1, Math.min(120, Math.round(Number(n) || 20)));
    const D = Math.max(2500, (Number((opz || {}).durata) || 6) * 1000);
    return { nome: quale, membri: FIGURA[quale](area, s, quante, d, D, opz) };
  }

  const EMOJI = /\p{Extended_Pictographic}/u;
  function grafemi(t) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)].map((x) => x.segment);
    return [...t];
  }

  const proprio = (m, k) => (m && Object.prototype.hasOwnProperty.call(m, k) && typeof m[k] === 'string' ? m[k] : '');

  function emoteDi(testo, mappe, opz) {
    const o = opz || {};
    const m = mappe || {};
    const fonti = o.fonti || { twitch: true, settetv: true, emoji: false };
    const esclusi = new Set((o.esclusi || []).map(String));
    const max = Math.max(1, Math.min(20, Number(o.perMessaggio) || 5));
    const out = [];
    const visti = new Set();
    for (const pezzo of String(testo || '').split(/\s+/)) {
      if (!pezzo) continue;
      const trovate = [];
      const url = (fonti.twitch !== false && proprio(m.twitch, pezzo)) || (fonti.settetv !== false && proprio(m.canale, pezzo)) || '';
      if (url) trovate.push({ nome: pezzo, url });
      else if (fonti.emoji) for (const g of grafemi(pezzo)) if (EMOJI.test(g)) trovate.push({ nome: g, emoji: true });
      for (const e of trovate) {
        if (esclusi.has(e.nome)) continue;
        if (o.doppioni === false && visti.has(e.nome)) continue;
        visti.add(e.nome);
        out.push(e);
        if (out.length >= max) return out;
      }
    }
    return out;
  }

  function combo(cfg) {
    const c = cfg || {};
    const soglia = Math.max(2, Math.round(Number(c.soglia) || 4));
    const finestra = Math.max(1000, (Number(c.finestra) || 6) * 1000);
    const diverse = c.diverse !== false;
    const stato = new Map();
    return {
      soglia, finestra,
      passo(e, chi, ts) {
        let v = stato.get(e.nome);
        if (v && ts - v.ultimo > finestra) { stato.delete(e.nome); v = null; }
        if (!v) { v = { nome: e.nome, url: e.url, emoji: !!e.emoji, n: 0, ultimo: ts, chi: new Set() }; stato.set(e.nome, v); }
        const conta = !diverse || !v.chi.has(chi);
        const aperta = v.n >= soglia;
        if (!conta) return aperta ? { azione: 'niente', n: v.n } : { azione: 'lancia', n: v.n };
        v.chi.add(chi);
        v.n++;
        v.ultimo = ts;
        if (aperta) return { azione: 'cresci', n: v.n };
        return { azione: v.n === soglia ? 'apri' : 'lancia', n: v.n };
      },
      scadute(ts) {
        const out = [];
        for (const [k, v] of stato) {
          if (ts - v.ultimo <= finestra) continue;
          stato.delete(k);
          if (v.n >= soglia) out.push({ nome: v.nome, url: v.url, emoji: v.emoji, n: v.n });
        }
        return out;
      },
      aperte() { return [...stato.values()].filter((v) => v.n >= soglia).map((v) => ({ nome: v.nome, n: v.n })); },
    };
  }

  function crescita(n, soglia) { return Math.min(3, 1 + Math.max(0, n - soglia) * 0.12); }

  function coda(cfg) {
    const c = cfg || {};
    const max = Math.max(1, Math.round(Number(c.maxSchermo) || 40));
    const posti = Math.max(0, Math.round(Number(c.coda) || 0));
    const vecchia = Math.max(1000, (Number(c.scade) || 8) * 1000);
    let vive = 0;
    const fila = [];
    return {
      entra(x, ts) {
        if (vive < max) { vive++; return { parti: true }; }
        fila.push({ x, ts });
        const perse = [];
        while (fila.length > posti) perse.push(fila.shift().x);
        return { parti: false, perse };
      },
      esce(ts) {
        vive = Math.max(0, vive - 1);
        while (fila.length) {
          const v = fila.shift();
          if (ts - v.ts <= vecchia) { vive++; return v.x; }
        }
        return null;
      },
      get vive() { return vive; },
      get attesa() { return fila.length; },
    };
  }

  const faccia = (fondo, occhi, bocca) => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112">'
    + '<circle cx="56" cy="56" r="50" fill="' + fondo + '"/><circle cx="56" cy="56" r="50" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="4"/>'
    + occhi + bocca + '</svg>');
  const OCCHI = '<circle cx="39" cy="46" r="7" fill="#1b1325"/><circle cx="73" cy="46" r="7" fill="#1b1325"/>';
  const ESEMPI = [
    faccia('#ffcf3a', OCCHI, '<path d="M34 68q22 22 44 0" fill="none" stroke="#1b1325" stroke-width="7" stroke-linecap="round"/>'),
    faccia('#ff6fa8', '<circle cx="38" cy="44" r="12" fill="#fff"/><circle cx="74" cy="44" r="12" fill="#fff"/><circle cx="40" cy="46" r="6" fill="#1b1325"/><circle cx="72" cy="46" r="6" fill="#1b1325"/>', '<ellipse cx="56" cy="78" rx="12" ry="15" fill="#1b1325"/>'),
    faccia('#3fd0c9', '<path d="M39 54l-11-11a6.5 6.5 0 0 1 11-7 6.5 6.5 0 0 1 11 7z" fill="#e8245c"/><path d="M73 54l-11-11a6.5 6.5 0 0 1 11-7 6.5 6.5 0 0 1 11 7z" fill="#e8245c"/>', '<path d="M38 70q18 16 36 0" fill="none" stroke="#1b1325" stroke-width="7" stroke-linecap="round"/>'),
    faccia('#9b6bff', '<path d="M30 48q9-10 18 0M64 48q9-10 18 0" fill="none" stroke="#1b1325" stroke-width="6" stroke-linecap="round"/>', '<path d="M32 64h48q-4 26-24 26t-24-26z" fill="#1b1325"/><path d="M42 80q14 10 28 0" fill="#ff6fa8"/>'),
    faccia('#ff9a3c', '<circle cx="39" cy="46" r="7" fill="#1b1325"/><path d="M64 47h18" stroke="#1b1325" stroke-width="6" stroke-linecap="round"/>', '<path d="M36 70q20 14 40-4" fill="none" stroke="#1b1325" stroke-width="7" stroke-linecap="round"/>'),
  ];

  function nodo(e, s, veste) {
    const v = veste || {};
    const el = document.createElement('div');
    el.className = 'muro-emote' + (v.ombra !== false ? ' ombra' : '') + (v.arcobaleno ? ' arcobaleno' : '');
    el.style.width = s + 'px';
    el.style.height = s + 'px';
    if (e.emoji) {
      const t = document.createElement('span');
      t.className = 'muro-emoji';
      t.style.fontSize = Math.round(s * 0.84) + 'px';
      t.textContent = e.nome;
      el.appendChild(t);
    } else {
      const i = document.createElement('img');
      i.alt = ''; i.decoding = 'async'; i.referrerPolicy = 'no-referrer';
      i.addEventListener('error', () => { el.style.visibility = 'hidden'; }, { once: true });
      i.src = e.url;
      el.appendChild(i);
    }
    return el;
  }

  function muovi(el, fotogrammi, durata, ritardo, fatto) {
    let a;
    try { a = el.animate(fotogrammi, { duration: durata, delay: ritardo || 0, easing: 'linear', fill: 'forwards' }); } catch (err) { a = null; }
    if (!a) { el.remove(); if (fatto) fatto(); return; }
    a.onfinish = () => { el.remove(); if (fatto) fatto(); };
  }

  const areaDi = (box) => ({ w: box.clientWidth || 1, h: box.clientHeight || 1 });

  function lancia(box, e, cfg, veste, fatto) {
    const area = areaDi(box);
    const s = lato(area, cfg, Math.random);
    const lista = cfg.animazioni && cfg.animazioni.length ? cfg.animazioni : ANIMAZIONI;
    const tr = anima(lista[Math.floor(Math.random() * lista.length)], area, s, Math.random, { durata: cfg.durata });
    const el = nodo(e, s, veste);
    el.style.opacity = '0';
    box.appendChild(el);
    muovi(el, fotogrammi(tr, s, { entrata: cfg.entrata }), tr.durata, 0, fatto);
  }

  function esplosione(box, nome, pool, n, cfg, veste) {
    const area = areaDi(box);
    const s = lato(area, Object.assign({}, cfg, { varia: 0 }), Math.random);
    const e = cfg.esplosioni || {};
    const F = figura(nome, area, s, n, Math.random, { durata: e.durata, parola: e.parola });
    let fine = 0;
    for (const m of F.membri) {
      const l = m.lato || s;
      const el = nodo(pool[Math.floor(Math.random() * pool.length)], l, veste);
      el.style.opacity = '0';
      box.appendChild(el);
      muovi(el, fotogrammi(m.tr, l, { entrata: 'nessuna' }), m.tr.durata, m.ritardo);
      fine = Math.max(fine, m.ritardo + m.tr.durata);
    }
    return fine;
  }

  window.SB_MURO = { ANIMAZIONI, FIGURE, GLIFI, ESEMPI, lato, anima, fotogrammi, tempi, figura, punti, parola, emoteDi, combo, crescita, coda, cuoreX, cuoreY, nodo, muovi, lancia, esplosione };
})();
