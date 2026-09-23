// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(() => {
  'use strict';

  const PERIODO = 4000;
  const TAU = Math.PI * 2;
  const fr = (x) => x - Math.floor(x);
  const lim = (x, a, b) => Math.max(a, Math.min(b, x));
  const h = (i, s = 0) => fr(Math.sin(i * 12.9898 + s * 78.233) * 43758.5453);

  const giro = (f, k, p) => fr(f * k * ((p && p.vel) || 1));
  const onda = (f, k, p, da = 0) => Math.sin(TAU * (f * k * ((p && p.vel) || 1) + da));

  function rgb(hex) {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || ''));
    if (!m) return [136, 92, 246];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const hex = (c) => '#' + c.map((v) => Math.round(lim(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const rgba = (col, a) => { const c = Array.isArray(col) ? col : rgb(col); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const mescola = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };

  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const contrasto = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  function sopraSoglia(testo, fondo, soglia) { return contrasto(testo, fondo) >= soglia; }

  function coloreCheRegge(colore, campioni, soglia, verso) {
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const c = rgb(mescola(colore, verso, t));
      if (campioni.every((p) => sopraSoglia(c, p, soglia))) return hex(c);
    }
    return verso;
  }

  const regge = (colore, campioni, soglia) => campioni.every((p) => sopraSoglia(rgb(colore), p, soglia));

  function cielo(ctx, W, fino, alto, basso, caldo, forza = 0.22) {
    const g = ctx.createLinearGradient(0, 0, 0, fino);
    g.addColorStop(0, alto); g.addColorStop(0.72, basso); g.addColorStop(1, caldo ? mescola(basso, caldo, forza) : basso);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, fino);
  }

  function stelle(ctx, W, alto, f, p, n, seme = 1, colore = '#ffffff') {
    for (let i = 0; i < n; i++) {
      const x = h(i, seme) * W, y = h(i, seme + 1) * alto;
      const r = 0.7 + h(i, seme + 2) * 1.6;
      const a = 0.25 + 0.6 * (0.5 + 0.5 * onda(f, 2, p, h(i, seme + 3)));
      ctx.fillStyle = rgba(colore, a);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  }

  function camera(W, H, yOr, yV) {
    return { W, H, yOr, yV, zLon: (H - yV) / (yOr - yV) };
  }
  const yDi = (cam, z) => cam.yV + (cam.H - cam.yV) / z;
  const xDi = (cam, xv, z) => cam.W / 2 + (xv - cam.W / 2) / z;

  function grigliaSynth(cam, fase, passo, n) {
    const k = Math.ceil((cam.W / 2) * cam.zLon / passo) + 1;
    const lon = [];
    for (let i = -k; i <= k; i++) {
      const xv = cam.W / 2 + i * passo;
      lon.push({ x1: xDi(cam, xv, cam.zLon), y1: cam.yOr, x2: xv, y2: cam.H });
    }
    const dz = (cam.zLon - 1) / n, tr = [];
    for (let j = 0; j <= n + 1; j++) {
      const z = 1 + (j - fase) * dz;
      if (z >= 1 && z <= cam.zLon) tr.push({ y: yDi(cam, z), z });
    }
    return { lon, tr, dz };
  }

  function sole(ctx, W, cx, cy, R, yOr, f, p, strisce) {
    const al = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 2.3);
    al.addColorStop(0, rgba(p.acc, 0.34 + 0.06 * onda(f, 1, p)));
    al.addColorStop(1, rgba(p.acc, 0));
    ctx.fillStyle = al; ctx.fillRect(0, 0, W, yOr);
    const alto = cy - R;
    ctx.save();
    ctx.beginPath();
    if (strisce) {
      let y = alto;
      const n = 7, da = cy + R * 0.02;
      for (let k = 0; k < n; k++) {
        const t = k / n, gy = da + t * (yOr - da), gh = 2 + t * t * R * 0.075;
        if (gy > y) ctx.rect(cx - R, y, 2 * R, gy - y);
        y = gy + gh;
      }
      if (yOr > y) ctx.rect(cx - R, y, 2 * R, yOr - y);
    } else {
      ctx.rect(cx - R, alto, 2 * R, yOr - alto);
    }
    ctx.clip();
    const g = ctx.createLinearGradient(0, alto, 0, yOr);
    g.addColorStop(0, '#ffe36e'); g.addColorStop(0.5, mescola('#ff8a3d', p.acc, 0.25)); g.addColorStop(1, p.acc);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function montagne(ctx, W, yOr, alto, p, colore, bordo) {
    const cime = (x) => {
      let v = 0;
      for (let k = 1; k <= 5; k++) v += Math.sin(x * TAU * k * 1.3 + h(k, 7) * TAU) / k;
      return lim(0.5 + 0.45 * v, 0.05, 1);
    };
    const centro = (x) => 1 - 0.75 * Math.exp(-((x - 0.5) ** 2) / 0.012);
    ctx.beginPath(); ctx.moveTo(0, yOr);
    for (let i = 0; i <= 96; i++) {
      const x = i / 96;
      ctx.lineTo(x * W, yOr - alto * cime(x) * centro(x));
    }
    ctx.lineTo(W, yOr); ctx.closePath();
    ctx.fillStyle = colore; ctx.fill();
    ctx.strokeStyle = rgba(bordo, 0.75); ctx.lineWidth = 2.5; ctx.stroke();
  }

  function pavimento(ctx, W, H, yOr, yV, f, p, stile = 'linee') {
    const cam = camera(W, H, yOr, yV);
    const g = ctx.createLinearGradient(0, yOr, 0, H);
    g.addColorStop(0, mescola(p.bg[1], '#000000', 0.25)); g.addColorStop(1, mescola(p.bg[0], '#000000', 0.5));
    ctx.fillStyle = g; ctx.fillRect(0, yOr, W, H - yOr);
    const rete = grigliaSynth(cam, giro(f, 2, p), W / 6.4, 16);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, yOr, W, H - yOr); ctx.clip();
    if (stile === 'scacchi') {
      const tr = [{ y: yOr, z: cam.zLon }, ...rete.tr.slice().reverse()];
      for (let r = 0; r + 1 < tr.length; r++) {
        const zA = tr[r].z, zB = tr[r + 1].z;
        const pari = Math.round((zA - 1) / rete.dz + giro(f, 2, p)) % 2;
        for (let i = 0; i + 1 < rete.lon.length; i++) {
          if ((i + pari) % 2) continue;
          const a = rete.lon[i], b = rete.lon[i + 1];
          const xa = (z) => xDi(cam, a.x2, z), xb = (z) => xDi(cam, b.x2, z);
          ctx.beginPath();
          ctx.moveTo(xa(zA), yDi(cam, zA)); ctx.lineTo(xb(zA), yDi(cam, zA));
          ctx.lineTo(xb(zB), yDi(cam, zB)); ctx.lineTo(xa(zB), yDi(cam, zB)); ctx.closePath();
          ctx.fillStyle = rgba(p.acc2, 0.30); ctx.fill();
        }
      }
    }
    const sg = ctx.createLinearGradient(0, yOr, 0, H);
    sg.addColorStop(0, rgba(p.acc, 0.3)); sg.addColorStop(1, rgba(p.acc, 0.95));
    ctx.strokeStyle = sg; ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (const l of rete.lon) { ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); }
    ctx.stroke();
    for (const t of rete.tr) {
      ctx.globalAlpha = lim(0.2 + 0.8 * (t.y - yOr) / (H - yOr), 0, 1);
      ctx.beginPath(); ctx.moveTo(0, t.y); ctx.lineTo(W, t.y); ctx.stroke();
    }
    ctx.restore();
    const lo = ctx.createLinearGradient(0, 0, W, 0);
    lo.addColorStop(0, rgba(p.acc, 0)); lo.addColorStop(0.5, rgba(mescola(p.acc, '#ffffff', 0.7), 0.95)); lo.addColorStop(1, rgba(p.acc, 0));
    ctx.fillStyle = lo; ctx.fillRect(0, yOr - 1.5, W, 3);
    return cam;
  }

  function orizzonte(W, H, p) {
    const o = p.op || {}, lay = p.lay || {};
    if (o.composizione === 'classica' || !lay.orizzonte) return { yOr: Math.round(H * 0.74), R: W * 0.19 };
    return { yOr: lay.orizzonte, R: W * 0.215 };
  }

  function geometriaSynth(W, H, p) {
    const { yOr, R } = orizzonte(W, H, p);
    const cy = yOr - R * 0.3, yV = yOr - R * 0.62;
    return { yOr, R, cy, yV, cam: camera(W, H, yOr, yV), passo: W / 6.4, n: 16 };
  }

  function synthwave(ctx, W, H, f, p) {
    const o = p.op || {};
    const { yOr, R, cy, yV } = geometriaSynth(W, H, p);
    cielo(ctx, W, yOr, p.bg[0], p.bg[1], p.acc);
    if (o.stelle !== false) stelle(ctx, W, yOr - R * 0.2, f, p, 80, 3);
    if (o.sole !== false) sole(ctx, W, W / 2, cy, R, yOr, f, p, o.strisce !== false);
    if (o.montagne !== false) montagne(ctx, W, yOr, Math.min(R * 0.3, 72), p, mescola(p.bg[0], '#000000', 0.35), p.acc2);
    return pavimento(ctx, W, H, yOr, yV, f, p);
  }

  function palma(ctx, x, base, alt, verso, colore, f, p) {
    const pieg = verso * alt * 0.18;
    const cimaX = x + pieg, cimaY = base - alt;
    ctx.strokeStyle = colore; ctx.lineCap = 'round';
    ctx.lineWidth = alt * 0.05;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + pieg * 0.1, base - alt * 0.6, cimaX, cimaY); ctx.stroke();
    ctx.fillStyle = colore;
    for (let k = 0; k < 7; k++) {
      const ang = -Math.PI / 2 + (k - 3) * 0.48 + 0.04 * onda(f, 1, p, k * 0.13);
      const lun = alt * (0.42 + 0.08 * h(k, 11));
      const ex = cimaX + Math.cos(ang) * lun, ey = cimaY + Math.sin(ang) * lun * 0.55 + lun * 0.35;
      ctx.beginPath();
      ctx.moveTo(cimaX, cimaY);
      ctx.quadraticCurveTo(cimaX + Math.cos(ang) * lun * 0.55, cimaY + Math.sin(ang) * lun * 0.55 - lun * 0.18, ex, ey);
      ctx.quadraticCurveTo(cimaX + Math.cos(ang) * lun * 0.45, cimaY + Math.sin(ang) * lun * 0.45 + lun * 0.02, cimaX, cimaY);
      ctx.fill();
    }
  }

  function vaporwave(ctx, W, H, f, p) {
    const o = p.op || {};
    const { yOr, R } = orizzonte(W, H, p);
    cielo(ctx, W, yOr, p.bg[0], p.bg[1], p.acc, 0.35);
    const cy = yOr - R * 0.25;
    ctx.save();
    ctx.beginPath();
    let y = cy - R;
    for (let k = 0; k < 9; k++) {
      const gy = cy - R * 0.55 + k * (R * 0.18), gh = 3 + k * 1.6;
      if (gy > y) ctx.rect(W / 2 - R, y, 2 * R, gy - y);
      y = gy + gh;
    }
    if (yOr > y) ctx.rect(W / 2 - R, y, 2 * R, yOr - y);
    ctx.clip();
    const g = ctx.createLinearGradient(0, cy - R, 0, yOr);
    g.addColorStop(0, mescola(p.acc2, '#ffffff', 0.35)); g.addColorStop(1, p.acc);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, cy, R, 0, TAU); ctx.fill();
    ctx.restore();
    const yV = yOr - R * 0.62;
    pavimento(ctx, W, H, yOr, yV, f, { ...p, bg: [mescola(p.bg[0], p.acc, 0.25), mescola(p.bg[1], p.acc2, 0.25)] }, o.pavimento === 'griglia' ? 'linee' : 'scacchi');
    if (o.palme !== false) {
      const scura = mescola(p.testo, p.acc, 0.25);
      const tetto = ((p.lay && p.lay.testa) || 0) + 24;
      const alta = Math.max(R * 0.6, Math.min(R * 1.35, yOr + 6 - tetto));
      palma(ctx, W * 0.06, yOr + 6, alta, 1, rgba(scura, 0.85), f, p);
      palma(ctx, W * 0.94, yOr + 6, alta * 0.85, -1, rgba(scura, 0.85), f, p);
    }
  }

  function pioggia(ctx, W, H, f, p) {
    const o = p.op || {};
    cielo(ctx, W, H, p.bg[0], p.bg[1], p.acc2, 0.18);
    const base = H * 0.86;
    for (let s = 0; s < 3; s++) {
      const n = 9 + s * 4, colore = mescola(p.bg[0], '#000000', 0.15 + s * 0.2);
      for (let i = 0; i < n; i++) {
        const w = W / n * (0.7 + h(i, 20 + s) * 0.5), x = (i / n) * W + h(i, 21 + s) * 20 - 10;
        const alt = H * (0.18 + h(i, 22 + s) * (0.34 - s * 0.06));
        ctx.fillStyle = colore; ctx.fillRect(x, base - alt, w, alt + H);
        if (s === 2 && h(i, 26) < 0.55) {
          const col = h(i, 27) < 0.5 ? p.acc : p.acc2;
          ctx.save(); ctx.shadowColor = rgba(col, 0.9); ctx.shadowBlur = 18;
          ctx.fillStyle = rgba(col, 0.55 + 0.4 * (0.5 + 0.5 * onda(f, 2, p, h(i, 28))));
          ctx.fillRect(x, base - alt - 3, w, 4); ctx.restore();
        }
        if (s === 2) {
          for (let r = 0; r < alt / 26; r++) for (let c = 0; c < w / 20; c++) {
            const q = i * 131 + r * 17 + c;
            if (h(q, 23) < 0.62) continue;
            const acceso = 0.35 + 0.5 * (0.5 + 0.5 * onda(f, 1, p, h(q, 24)));
            ctx.fillStyle = rgba(h(q, 25) < 0.5 ? p.acc : p.acc2, acceso * 0.55);
            ctx.fillRect(x + 6 + c * 20, base - alt + 10 + r * 26, 8, 12);
          }
        }
      }
    }
    const riflesso = ctx.createLinearGradient(0, base, 0, H);
    riflesso.addColorStop(0, rgba(p.acc, 0.18)); riflesso.addColorStop(1, rgba(p.acc2, 0.04));
    ctx.fillStyle = riflesso; ctx.fillRect(0, base, W, H - base);
    const n = o.pioggia === 'poca' ? 90 : 190;
    ctx.strokeStyle = rgba('#cfe8ff', 0.28); ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const giri = 2 + Math.floor(h(i, 40) * 2);
      const y = fr(h(i, 41) + giro(f, giri, p)) * (H + 80) - 40;
      const x = h(i, 42) * (W + 60) - 30 - (y / H) * 60;
      ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 28);
    }
    ctx.stroke();
    if (o.glitch !== false) {
      const g = giro(f, 1, p);
      if (g > 0.86 && g < 0.9) {
        const y = H * (0.2 + h(Math.floor(g * 100), 43) * 0.5);
        ctx.fillStyle = rgba(p.acc2, 0.12); ctx.fillRect(0, y, W, 16);
        ctx.fillStyle = rgba(p.acc, 0.12); ctx.fillRect(0, y + 22, W, 8);
      }
    }
  }

  function scintilla(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
  }

  function cromo(ctx, W, H, f, p) {
    const o = p.op || {};
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, p.bg[0]); g.addColorStop(0.5, mescola(p.bg[0], '#ffffff', 0.4)); g.addColorStop(1, p.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const colori = [p.acc, p.acc2, mescola(p.acc, p.acc2, 0.5)];
    for (let k = 0; k < 3; k++) {
      const a = TAU * (giro(f, 1, p) + k / 3);
      const cx = W * (0.5 + 0.34 * Math.cos(a)), cy = H * (0.5 + 0.3 * Math.sin(a * (k === 1 ? -1 : 1)));
      const r = W * 0.55;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, rgba(colori[k], 0.26)); rg.addColorStop(1, rgba(colori[k], 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    if (o.bolle !== false) {
      for (let i = 0; i < 16; i++) {
        const r = 14 + h(i, 50) * 38;
        const y = H + r - fr(h(i, 51) + giro(f, 1, p)) * (H + 2 * r);
        const x = h(i, 52) * W + 14 * onda(f, 2, p, h(i, 53));
        ctx.strokeStyle = rgba('#ffffff', 0.7); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        ctx.fillStyle = rgba('#ffffff', 0.35);
        ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, TAU); ctx.fill();
      }
    }
    if (o.scintille !== false) {
      for (let i = 0; i < 18; i++) {
        const v = 0.5 + 0.5 * onda(f, 2, p, h(i, 60));
        scintilla(ctx, h(i, 61) * W, h(i, 62) * H, 6 + v * 16, rgba('#ffffff', 0.25 + 0.65 * v));
      }
    }
  }

  const COSTELLAZIONI = [
    [[0.12, 0.10], [0.2, 0.07], [0.27, 0.12], [0.33, 0.09], [0.4, 0.14]],
    [[0.62, 0.2], [0.7, 0.16], [0.76, 0.23], [0.7, 0.29], [0.62, 0.2]],
    [[0.08, 0.55], [0.14, 0.5], [0.2, 0.56], [0.17, 0.63]],
  ];

  function notteStelle(ctx, W, H, f, p) {
    const o = p.op || {};
    cielo(ctx, W, H, p.bg[0], p.bg[1], p.acc2, 0.12);
    stelle(ctx, W, H, f, p, 200, 70);
    stelle(ctx, W, H * 0.6, f, p, 40, 71, mescola('#ffffff', p.acc, 0.3));
    if (o.costellazioni !== false) {
      const a = 0.18 + 0.12 * (0.5 + 0.5 * onda(f, 1, p));
      ctx.strokeStyle = rgba(p.acc, a); ctx.lineWidth = 1.5;
      for (const c of COSTELLAZIONI) {
        ctx.beginPath(); c.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H))); ctx.stroke();
        ctx.fillStyle = rgba('#ffffff', 0.85);
        for (const [x, y] of c) { ctx.beginPath(); ctx.arc(x * W, y * H, 2.6, 0, TAU); ctx.fill(); }
      }
    }
    if (o.luna !== false) {
      const lay = p.lay || {};
      const x = W * 0.84, y = lay.titoloY || H * 0.2, r = W * 0.075;
      const al = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3);
      al.addColorStop(0, rgba(p.acc, 0.22)); al.addColorStop(1, rgba(p.acc, 0));
      ctx.fillStyle = al; ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      ctx.fillStyle = mescola('#fff7de', p.acc, 0.15); ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      ctx.fillStyle = mescola(p.bg[0], p.bg[1], 0.3);
      ctx.beginPath(); ctx.arc(x + r * 0.42, y - r * 0.18, r * 0.92, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (o.cadenti !== false) {
      const t = giro(f, 1, p);
      if (t < 0.28) {
        const q = t / 0.28, x0 = W * 0.22, y0 = H * 0.06, dx = W * 0.5, dy = H * 0.22;
        const x = x0 + dx * q, y = y0 + dy * q;
        const g = ctx.createLinearGradient(x - dx * 0.25, y - dy * 0.25, x, y);
        g.addColorStop(0, rgba('#ffffff', 0)); g.addColorStop(1, rgba('#ffffff', 0.9 * Math.sin(Math.PI * q)));
        ctx.strokeStyle = g; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x - dx * 0.25, y - dy * 0.25); ctx.lineTo(x, y); ctx.stroke();
      }
    }
  }

  function petalo(ctx, x, y, r, ang, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.9, -r * 0.8, r * 0.7, r * 0.6, 0, r);
    ctx.bezierCurveTo(-r * 0.7, r * 0.6, -r * 0.9, -r * 0.8, 0, -r);
    ctx.fill();
    ctx.restore();
  }

  function sakura(ctx, W, H, f, p) {
    const o = p.op || {};
    cielo(ctx, W, H, p.bg[0], p.bg[1], p.acc, 0.2);
    if (o.ramo !== false) {
      ctx.strokeStyle = mescola(p.testo, '#6b3b2a', 0.5); ctx.lineCap = 'round';
      const rami = [[0, 0.03, 0.36, 0.09, 16], [0.16, 0.06, 0.28, 0.12, 9], [0.26, 0.075, 0.42, 0.05, 7]];
      for (const [x1, y1, x2, y2, w] of rami) {
        ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1 * W, y1 * H);
        ctx.quadraticCurveTo((x1 + x2) / 2 * W, (Math.min(y1, y2) - 0.02) * H, x2 * W, y2 * H); ctx.stroke();
      }
      for (let i = 0; i < 26; i++) {
        const x = (0.04 + h(i, 80) * 0.38) * W, y = (0.02 + h(i, 81) * 0.1) * H;
        for (let k = 0; k < 5; k++) petalo(ctx, x + Math.cos(k * TAU / 5) * 9, y + Math.sin(k * TAU / 5) * 9, 9, k * TAU / 5, rgba(mescola(p.acc, '#ffffff', 0.45), 0.9));
      }
    }
    const n = o.petali === 'pochi' ? 26 : 60;
    for (let i = 0; i < n; i++) {
      const giri = 1 + Math.floor(h(i, 90) * 2);
      const y = fr(h(i, 91) + giro(f, giri, p)) * (H + 60) - 30;
      const x = h(i, 92) * W + 34 * onda(f, 2, p, h(i, 93)) + (y / H) * 60;
      const r = 8 + h(i, 94) * 9;
      petalo(ctx, x, y, r, TAU * (h(i, 95) + giro(f, 1, p)), rgba(mescola(p.acc, '#ffffff', 0.3 + h(i, 96) * 0.4), 0.85));
    }
  }

  function lofi(ctx, W, H, f, p) {
    const o = p.op || {};
    cielo(ctx, W, H, p.bg[0], p.bg[1], p.acc, 0.35);
    for (let i = 0; i < 14; i++) {
      const x = h(i, 100) * W, y = H * (0.45 + h(i, 101) * 0.5), r = 30 + h(i, 102) * 70;
      const a = 0.08 + 0.06 * (0.5 + 0.5 * onda(f, 1, p, h(i, 103)));
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, rgba(i % 2 ? p.acc : p.acc2, a * 2)); rg.addColorStop(1, rgba(p.acc, 0));
      ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    if (o.vetro !== false) {
      for (let i = 0; i < 70; i++) {
        const giri = 1 + Math.floor(h(i, 110) * 2);
        const scia = fr(h(i, 111) + giro(f, giri, p));
        const x = h(i, 112) * W, y = scia * (H + 40) - 20, r = 3 + h(i, 113) * 5;
        ctx.strokeStyle = rgba('#ffffff', 0.12); ctx.lineWidth = r * 0.6;
        ctx.beginPath(); ctx.moveTo(x, y - 60 * h(i, 114)); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = rgba('#ffffff', 0.28);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba('#ffffff', 0.5);
        ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, TAU); ctx.fill();
      }
    }
  }

  function arcade(ctx, W, H, f, p) {
    const o = p.op || {};
    ctx.fillStyle = p.bg[0]; ctx.fillRect(0, 0, W, H);
    const px = 6;
    if (o.stelle !== false) {
      for (let i = 0; i < 120; i++) {
        const giri = 1 + (i % 3);
        const x = Math.floor(fr(h(i, 120) - giro(f, giri, p)) * W / px) * px;
        const y = Math.floor(h(i, 121) * H / px) * px;
        ctx.fillStyle = rgba(i % 5 === 0 ? p.acc : '#ffffff', 0.35 + (i % 3) * 0.2);
        ctx.fillRect(x, y, px * (1 + (i % 3 === 2)), px);
      }
    }
    const fondo = ctx.createLinearGradient(0, H * 0.7, 0, H);
    fondo.addColorStop(0, rgba(p.acc2, 0)); fondo.addColorStop(1, rgba(p.acc2, 0.22));
    ctx.fillStyle = fondo; ctx.fillRect(0, H * 0.7, W, H * 0.3);
    if (o.scanline !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
      const y = giro(f, 1, p) * H;
      const g = ctx.createLinearGradient(0, y - 80, 0, y + 80);
      g.addColorStop(0, rgba(p.acc, 0)); g.addColorStop(0.5, rgba(p.acc, 0.07)); g.addColorStop(1, rgba(p.acc, 0));
      ctx.fillStyle = g; ctx.fillRect(0, y - 80, W, 160);
    }
  }

  function iperspazio(ctx, W, H, f, p) {
    const o = p.op || {};
    const cx = W / 2, cy = H * 0.42;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
    g.addColorStop(0, mescola(p.bg[1], p.acc, 0.25)); g.addColorStop(0.4, p.bg[1]); g.addColorStop(1, p.bg[0]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const n = o.densita === 'poche' ? 110 : 240;
    for (let i = 0; i < n; i++) {
      const ang = h(i, 130) * TAU;
      const giri = 1 + Math.floor(h(i, 131) * 2);
      const q = fr(h(i, 132) + giro(f, giri, p));
      const z = 1 - q * 0.97;
      const d0 = (0.02 + h(i, 133) * 0.08) * W;
      const r1 = d0 / z, r2 = d0 / Math.min(1, z + 0.08);
      if (r2 > Math.max(W, H)) continue;
      const a = lim(q * 1.4, 0, 1);
      ctx.strokeStyle = rgba(i % 7 === 0 ? p.acc : '#ffffff', a * 0.85);
      ctx.lineWidth = 0.8 + q * 2.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
      ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.stroke();
    }
    const c = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.18);
    c.addColorStop(0, rgba('#ffffff', 0.35)); c.addColorStop(1, rgba(p.acc, 0));
    ctx.fillStyle = c; ctx.fillRect(0, 0, W, H);
  }

  function aurora(ctx, W, H, f, p) {
    cielo(ctx, W, H, p.bg[0], p.bg[1]);
    const col = [p.acc, p.acc2, mescola(p.acc, p.acc2, 0.5)];
    for (let i = 0; i < 3; i++) {
      const y = H * (0.22 + 0.24 * i) + onda(f, 1, p, i / 3) * 60;
      const g = ctx.createLinearGradient(0, y - 190, 0, y + 190);
      g.addColorStop(0, rgba(col[i], 0)); g.addColorStop(0.5, rgba(col[i], 0.23)); g.addColorStop(1, rgba(col[i], 0));
      ctx.fillStyle = g; ctx.fillRect(0, y - 190, W, 380);
    }
  }

  function particelle(ctx, W, H, f, p) {
    cielo(ctx, W, H, p.bg[0], p.bg[1]);
    for (let i = 0; i < 90; i++) {
      const giri = 1 + (i % 2);
      const x = fr(h(i, 140) + giro(f, giri, p) * 0.25) * W;
      const a = 0.25 + 0.5 * (0.5 + 0.5 * onda(f, 2, p, h(i, 141)));
      ctx.fillStyle = rgba('#ffffff', a);
      ctx.beginPath(); ctx.arc(x, h(i, 142) * H, 0.6 + (i % 5) * 0.5, 0, TAU); ctx.fill();
    }
  }

  function onde(ctx, W, H, f, p) {
    cielo(ctx, W, H, p.bg[0], p.bg[1]);
    ctx.strokeStyle = rgba(p.acc, 0.23); ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const y = H * (0.34 + 0.14 * k) + Math.sin((x / W) * TAU * 2 + TAU * giro(f, 1, p) + k) * 26;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function codice(ctx, W, H, f, p) {
    ctx.fillStyle = p.bg[0]; ctx.fillRect(0, 0, W, H);
    ctx.font = '28px "Courier New", monospace'; ctx.textAlign = 'left';
    const passo = 30, cols = Math.floor(W / passo), corsa = H + 14 * passo;
    for (let i = 0; i < cols; i++) {
      const giri = 1 + (i % 3);
      const testa = fr(h(i, 150) + giro(f, giri, p)) * corsa;
      for (let j = 0; j < 14; j++) {
        const y = testa - j * passo;
        if (y < -passo || y > H) continue;
        const ch = String.fromCharCode(0x30A0 + Math.floor(h(i * 31 + j, 151 + Math.floor(giro(f, 4, p) * 4)) * 96));
        ctx.fillStyle = j === 0 ? rgba('#d2ffd7', 0.95) : rgba(p.acc, Math.max(0, 0.55 - j * 0.045));
        ctx.fillText(ch, i * passo + 5, y);
      }
    }
  }

  function scanline(ctx, W, H, f, p) {
    cielo(ctx, W, H, p.bg[0], p.bg[1]);
    ctx.fillStyle = rgba(p.acc, 0.08);
    const sp = giro(f, 4, p) * 8;
    for (let y = sp; y < H; y += 8) ctx.fillRect(0, y, W, 2);
    const by = giro(f, 1, p) * (H + 240) - 120;
    const g = ctx.createLinearGradient(0, by - 120, 0, by + 120);
    g.addColorStop(0, rgba(p.acc, 0)); g.addColorStop(0.5, rgba(p.acc, 0.15)); g.addColorStop(1, rgba(p.acc, 0));
    ctx.fillStyle = g; ctx.fillRect(0, by - 120, W, 240);
  }

  const si = (id, it, en, es) => ({ id, tipo: 'si', nome: [it, en, es] });
  const scelta = (id, it, en, es, voci) => ({ id, tipo: 'scelta', nome: [it, en, es], voci });

  const SCENE = {
    griglia: { disegna: synthwave, opzioni: [
      scelta('composizione', 'Dove sta il sole', 'Where the sun sits', 'Dónde está el sol', [['poster', 'Dietro il titolo', 'Behind the title', 'Detrás del título'], ['classica', 'In basso', 'Low', 'Abajo']]),
      si('strisce', 'Sole a strisce', 'Striped sun', 'Sol a rayas'),
      si('montagne', 'Montagne', 'Mountains', 'Montañas'),
      si('stelle', 'Stelle', 'Stars', 'Estrellas'),
    ] },
    vaporwave: { disegna: vaporwave, opzioni: [
      scelta('pavimento', 'Pavimento', 'Floor', 'Suelo', [['scacchi', 'A scacchi', 'Checkerboard', 'Ajedrezado'], ['griglia', 'A griglia', 'Grid', 'Rejilla']]),
      si('palme', 'Palme', 'Palm trees', 'Palmeras'),
    ] },
    pioggia: { disegna: pioggia, opzioni: [
      scelta('pioggia', 'Pioggia', 'Rain', 'Lluvia', [['tanta', 'Tanta', 'Heavy', 'Mucha'], ['poca', 'Poca', 'Light', 'Poca']]),
      si('glitch', 'Qualche disturbo', 'Some glitches', 'Alguna interferencia'),
    ] },
    cromo: { disegna: cromo, opzioni: [si('bolle', 'Bolle', 'Bubbles', 'Burbujas'), si('scintille', 'Scintille', 'Sparkles', 'Destellos')] },
    stelle: { disegna: notteStelle, opzioni: [
      si('luna', 'Luna', 'Moon', 'Luna'), si('costellazioni', 'Costellazioni', 'Constellations', 'Constelaciones'), si('cadenti', 'Stella cadente', 'Shooting star', 'Estrella fugaz'),
    ] },
    sakura: { disegna: sakura, opzioni: [
      scelta('petali', 'Petali', 'Petals', 'Pétalos', [['tanti', 'Tanti', 'Many', 'Muchos'], ['pochi', 'Pochi', 'Few', 'Pocos']]),
      si('ramo', 'Ramo in fiore', 'Blossoming branch', 'Rama en flor'),
    ] },
    lofi: { disegna: lofi, opzioni: [si('vetro', 'Pioggia sul vetro', 'Rain on the glass', 'Lluvia en el cristal')] },
    arcade: { disegna: arcade, opzioni: [si('stelle', 'Stelle a pixel', 'Pixel stars', 'Estrellas de píxeles'), si('scanline', 'Righe da vecchio schermo', 'Old screen lines', 'Líneas de pantalla antigua')] },
    iperspazio: { disegna: iperspazio, opzioni: [
      scelta('densita', 'Stelle', 'Stars', 'Estrellas', [['tante', 'Tante', 'Many', 'Muchas'], ['poche', 'Poche', 'Few', 'Pocas']]),
    ] },
    aurora: { disegna: aurora, opzioni: [] },
    particelle: { disegna: particelle, opzioni: [] },
    onde: { disegna: onde, opzioni: [] },
    matrix: { disegna: codice, opzioni: [] },
    scanline: { disegna: scanline, opzioni: [] },
  };

  function disegna(ctx, W, H, t, id, p) {
    const s = SCENE[id];
    if (!s) return false;
    const f = fr((Number(t) || 0) / ((p && p.durata) || PERIODO));
    ctx.save();
    s.disegna(ctx, W, H, f, p);
    ctx.restore();
    const forza = Number(p && p.intensita);
    if (forza >= 0 && forza < 1) {
      ctx.save(); ctx.globalAlpha = 1 - forza; ctx.fillStyle = p.bg[0]; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    return true;
  }

  let _grana = null;
  function grana(ctx) {
    if (!_grana) {
      const c = document.createElement('canvas'); c.width = c.height = 140;
      const x = c.getContext('2d'), d = x.createImageData(140, 140);
      for (let i = 0; i < d.data.length; i += 4) {
        const v = Math.floor(h(i / 4, 170) * 256);
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
      }
      x.putImageData(d, 0, 0);
      _grana = c;
    }
    return ctx.createPattern(_grana, 'repeat');
  }

  window.SB_SCENE = {
    PERIODO, SCENE, disegna, grana,
    coloreCheRegge, regge, contrasto, lum, rgb, hex, mescola,
    camera, grigliaSynth, orizzonte, geometriaSynth,
  };
})();
