// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


(() => {
  'use strict';
  if (!window.PIXI || !PIXI.Application) return;
  const F = PIXI.filters || {};
  const ADD = PIXI.BLEND_MODES.ADD;

  let AC = null, suoniOn = true;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { AC = null; } } return AC; }
  function suono(tipo) {
    if (!suoniOn) return; const c = ac(); if (!c) return; const t = c.currentTime;
    const beep = (f0, f1, dur, osc, vol) => { const o = c.createOscillator(), g = c.createGain(); o.type = osc; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02); };
    const rumore = (dur, vol) => { const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(c.destination); s.start(t); };
    if (tipo === 'fireball') { beep(320, 90, 0.35, 'sawtooth', 0.18); rumore(0.25, 0.08); }
    else if (tipo === 'kamehameha') { beep(120, 900, 0.5, 'sawtooth', 0.16); beep(70, 40, 0.9, 'sine', 0.14); rumore(0.6, 0.06); }
    else if (tipo === 'carica') { beep(200, 700, 0.25, 'sine', 0.05); }
    else if (tipo === 'fulmine') { rumore(0.18, 0.14); beep(1400, 300, 0.12, 'square', 0.06); }
    else if (tipo === 'snap') { rumore(0.05, 0.2); beep(1800, 200, 0.08, 'square', 0.05); }
    else if (tipo === 'scatto') { rumore(0.03, 0.18); beep(2600, 1200, 0.05, 'square', 0.05); beep(900, 500, 0.06, 'square', 0.04); }
    else if (tipo === 'freeze') { beep(600, 60, 0.6, 'sine', 0.14); beep(300, 30, 0.8, 'triangle', 0.1); }
    else if (tipo === 'impatto') { beep(90, 40, 0.25, 'sine', 0.2); rumore(0.2, 0.1); }
  }

  const nz = (v, d) => (Number.isFinite(v) ? v : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  let app, W = 1280, H = 720, mirror = true, comboOn = true;
  const px = (x) => (mirror ? 1 - x : x) * W, py = (y) => y * H, sdx = (dx) => (mirror ? -dx : dx);

  let energia, hud, glowTex, ringTex;
  const particelle = [];
  let orb = null;
  const raggi = [];
  const fulmini = [];
  const manoSp = [null, null];
  let laser = null, halo = null, fuocoT = 0, fuocoPos = { x: 0.5, y: 0.62 };
  let thanos = null, freeze = 0, shake = 0;
  let combo = 0, comboT = 0, comboTxt = null;
  let mirino = null; const scatti = [];

  function makeGlow(size) {
    const g = new PIXI.Graphics();
    const r = size / 2;
    for (let i = r; i > 0; i--) { const a = Math.pow(1 - i / r, 1.6) * 0.10; g.beginFill(0xffffff, a); g.drawCircle(r, r, i); g.endFill(); }
    const tex = app.renderer.generateTexture(g); g.destroy(); return tex;
  }
  function makeRing(size) {
    const g = new PIXI.Graphics(); const r = size / 2;
    g.lineStyle(size * 0.06, 0xffffff, 1); g.drawCircle(r, r, r - size * 0.05);
    const tex = app.renderer.generateTexture(g); g.destroy(); return tex;
  }

  function sprite(tex, x, y, tint, scale, add) { const s = new PIXI.Sprite(tex); s.anchor.set(0.5); s.position.set(x, y); s.tint = tint; s.scale.set(scale); if (add !== false) s.blendMode = ADD; return s; }

  function P(x, y, o) {
    if (particelle.length > 900) return;
    o = o || {};
    const s = sprite(glowTex, x, y, o.tint0 ?? 0xffffff, o.s0 ?? 0.5);
    energia.addChild(s);
    particelle.push({ sp: s, vx: o.vx || 0, vy: o.vy || 0, grav: o.grav || 0, decay: o.decay || 0.02, life: 1, life0: 1, s0: o.s0 ?? 0.5, s1: o.s1 ?? (o.s0 ?? 0.5), tint0: o.tint0 ?? 0xffffff, tint1: o.tint1, suck: o.suck, tx: o.tx, ty: o.ty });
  }
  const lerpCol = (a, b, t) => { const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255; return ((ar + (br - ar) * t) << 16) | ((ag + (bg - ag) * t) << 8) | (ab + (bb - ab) * t); };

  function spawn(tipo, p) {
    p = p || {}; const x = px(nz(p.x, 0.5)), y = py(nz(p.y, 0.5));
    if (tipo === 'fireball') {
      const dx = sdx(nz(p.dx, 0.6)), dy = nz(p.dy, -0.2), l = Math.hypot(dx, dy) || 1, forza = clamp(nz(p.forza, 1), 0.4, 2);
      raggi.push({ tipo: 'fireball', x, y, vx: (dx / l) * 12 * forza, vy: (dy / l) * 12 * forza, gy: 0.15, forza, life: 1, sp: sprite(glowTex, x, y, 0xffa83c, 1.4 * forza) });
      energia.addChild(raggi[raggi.length - 1].sp); suono('fireball'); pulsaCombo();
    } else if (tipo === 'fulmine') {
      const ax = px(nz(p.ax, 0.35)), ay = py(nz(p.ay, 0.5)), bx = px(nz(p.bx, 0.65)), by = py(nz(p.by, 0.5));
      const g = new PIXI.Graphics(); g.blendMode = ADD; energia.addChild(g); fulmini.push({ g, life: 1, ax, ay, bx, by }); suono('fulmine'); pulsaCombo();
    } else if (tipo === 'snap') {
      thanos = { x, y, t: 1, emit: true }; shake = Math.max(shake, 16); suono('snap'); pulsaCombo();
    } else if (tipo === 'onda') {
      raggi.push({ tipo: 'onda', x, y, r: 8, life: 1, sp: sprite(ringTex, x, y, 0xbfe6ff, 0.2) }); energia.addChild(raggi[raggi.length - 1].sp);
    }
  }
  function caricaSu(p) {
    p = p || {}; const x = px(nz(p.x, 0.5)), y = py(nz(p.y, 0.5)), liv = clamp(nz(p.liv, orb ? orb.liv : 0.2), 0, 1);
    if (!orb) { const sp = sprite(glowTex, x, y, 0xbfe6ff, 0.6); energia.addChild(sp); orb = { sp, liv }; }
    orb.sp.position.set(x, y); orb.liv = liv;

    if (Math.random() < 0.9) { const a = rand(0, 7), d = rand(120, 240) * (0.6 + liv); P(x + Math.cos(a) * d, y + Math.sin(a) * d, { suck: true, tx: x, ty: y, s0: rand(0.15, 0.4), s1: 0, tint0: 0x9fd8ff, decay: 0.03 }); }
    if (Math.random() < 0.3) suono('carica');
  }
  function caricaGiu() { if (orb) { orb.sp.destroy(); orb = null; } }
  function spara(p) {
    p = p || {}; const forza = clamp(nz(p.forza, orb ? orb.liv : 0.6), 0.2, 1);
    const x = orb ? orb.sp.x : px(nz(p.x, 0.5)), y = orb ? orb.sp.y : py(nz(p.y, 0.5));
    const dx = sdx(nz(p.dx, 1)), dy = nz(p.dy, 0), ang = Math.atan2(dy, dx);
    const g = new PIXI.Graphics(); g.blendMode = ADD; energia.addChild(g);
    raggi.push({ tipo: 'beam', g, x, y, ang, forza, life: 1 });

    for (let i = 0; i < 26; i++) { const a = rand(0, 7), v = rand(3, 11) * forza; P(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, s0: rand(0.2, 0.5), s1: 0, tint0: 0xdff2ff, tint1: 0x3aa0ff, decay: 0.05 }); }
    caricaGiu(); suono('kamehameha'); shake = Math.max(shake, 10 + forza * 16); pulsaCombo();
  }
  function mano(i, x, y) {
    if ((i !== 0 && i !== 1) || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const X = px(x), Y = py(y);
    if (!manoSp[i]) { manoSp[i] = sprite(glowTex, X, Y, 0x88ccff, 0.9); energia.addChild(manoSp[i]); }
    manoSp[i].position.set(X, Y); manoSp[i].alpha = 1; manoSp[i]._seen = performance.now();
    if (Math.random() < 0.9) P(X + rand(-6, 6), Y + rand(-6, 6), { vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), s0: rand(0.25, 0.5), s1: 0, tint0: 0x9fe0ff, tint1: 0x2f7cff, decay: 0.05 });
  }
  function pulsaCombo() { if (!comboOn) return; combo++; comboT = 1.8; }

  function laserOn(p) {
    p = p || {};
    if (!laser) { laser = { lnx: 0.42, lny: 0.42, rnx: 0.58, rny: 0.42, t: 0, gl: new PIXI.Graphics(), gr: new PIXI.Graphics() }; laser.gl.blendMode = ADD; laser.gr.blendMode = ADD; energia.addChild(laser.gl, laser.gr); }
    laser.lnx = nz(p.lx, laser.lnx); laser.lny = nz(p.ly, laser.lny); laser.rnx = nz(p.rx, laser.rnx); laser.rny = nz(p.ry, laser.rny);
    laser.spegni = false; laser.t = Math.min(1, laser.t + 0.2); if (Math.random() < 0.12) suono('fulmine');
  }
  function laserOff() { if (laser) laser.spegni = true; }
  function fuoco(p) { p = p || {}; fuocoPos = { x: nz(p.x, fuocoPos.x), y: nz(p.y, fuocoPos.y) }; fuocoT = 0.32; if (Math.random() < 0.22) suono('fireball'); }
  function auraOn(p) {
    p = p || {};
    if (!halo) { halo = { nx: 0.5, ny: 0.4, r: 0.16, t: 0, ring: sprite(ringTex, 0, 0, 0xffd36e, 0.5), spk: [] }; halo.ring.alpha = 0; energia.addChild(halo.ring); }
    halo.nx = nz(p.x, halo.nx); halo.ny = nz(p.y, halo.ny); halo.r = clamp(nz(p.r, halo.r), 0.03, 1); halo.spegni = false; halo.t = Math.min(1, halo.t + 0.06);
  }
  function auraOff() { if (halo) halo.spegni = true; }

  function mirinoOn(p) { p = p || {}; mirino = { ax: nz(p.ax, 0.3), ay: nz(p.ay, 0.3), bx: nz(p.bx, 0.7), by: nz(p.by, 0.7) }; }
  function mirinoGiu() { mirino = null; }
  function scatto(p) {
    p = p || {}; mirino = null;
    let tex = null; if (p.thumb) { try { tex = PIXI.Texture.from(p.thumb); } catch { tex = null; } }
    scatti.push({ ax: nz(p.ax, 0.3), ay: nz(p.ay, 0.3), bx: nz(p.bx, 0.7), by: nz(p.by, 0.7), t: 1, tex, spr: null }); suono('scatto'); shake = Math.max(shake, 7);
  }
  function congela(sec) { freeze = Math.max(freeze, sec || 2.5); suono('freeze'); }

  let hudGfx;
  function tick(delta) {
    const dt = Math.min(3, delta) * (freeze > 0 ? 0.32 : 1);
    const realS = Math.min(3, delta) / 60;
    if (freeze > 0) freeze -= realS;

    if (shake > 0.3) { app.stage.position.set(rand(-shake, shake), rand(-shake, shake)); shake *= Math.pow(0.86, dt); } else { app.stage.position.set(0, 0); shake = 0; }

    for (let i = 0; i < 2; i++) { const m = manoSp[i]; if (m) { if (performance.now() - (m._seen || 0) > 180) { m.alpha *= 0.85; if (m.alpha < 0.03) { m.destroy(); manoSp[i] = null; } } else { m.scale.set(0.9 + 0.08 * Math.sin(performance.now() / 120)); } } }

    if (orb) { const s = 0.6 + orb.liv * 3.2, pul = s * (1 + 0.12 * Math.sin(performance.now() / 70)); orb.sp.scale.set(pul); orb.sp.tint = lerpCol(0x9fd8ff, 0xffffff, orb.liv); }

    for (let i = particelle.length - 1; i >= 0; i--) {
      const q = particelle[i];
      if (q.suck) { q.sp.x += (q.tx - q.sp.x) * 0.16 * dt; q.sp.y += (q.ty - q.sp.y) * 0.16 * dt; }
      else { q.sp.x += q.vx * dt; q.sp.y += q.vy * dt; q.vy += q.grav * dt; }
      q.life -= q.decay * dt;
      if (q.life <= 0) { q.sp.destroy(); particelle.splice(i, 1); continue; }
      q.sp.alpha = clamp(q.life, 0, 1);
      const s = q.s0 + (q.s1 - q.s0) * (1 - q.life); q.sp.scale.set(Math.max(0.001, s));
      if (q.tint1 != null) q.sp.tint = lerpCol(q.tint1, q.tint0, q.life);
    }

    for (let i = raggi.length - 1; i >= 0; i--) {
      const r = raggi[i];
      if (r.tipo === 'fireball') {
        r.x += r.vx * dt; r.y += r.vy * dt; r.vy += r.gy * dt; r.sp.position.set(r.x, r.y); r.sp.scale.set(1.4 * r.forza * (0.9 + 0.1 * Math.sin(performance.now() / 40)));
        P(r.x, r.y, { s0: rand(0.5, 0.9) * r.forza, s1: 0, tint0: 0xfff0b4, tint1: 0xff4400, decay: 0.06 });
        if (r.x < -80 || r.x > W + 80 || r.y > H + 80) { for (let k = 0; k < 24; k++) { const a = rand(0, 7), v = rand(2, 9) * r.forza; P(r.x, r.y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, s0: rand(0.3, 0.6), s1: 0, tint0: 0xffc040, tint1: 0xff3000, decay: 0.05 }); } shake = Math.max(shake, 6 * r.forza); suono('impatto'); r.sp.destroy(); raggi.splice(i, 1); }
      } else if (r.tipo === 'onda') {
        r.r += 12 * dt; r.life -= 0.04 * dt; r.sp.scale.set(r.r / 32); r.sp.alpha = clamp(r.life, 0, 1); if (r.life <= 0) { r.sp.destroy(); raggi.splice(i, 1); }
      } else if (r.tipo === 'beam') {
        r.life -= 0.02 * dt / (0.6 + r.forza); if (r.life <= 0) { r.g.destroy(); raggi.splice(i, 1); continue; }
        const L = Math.hypot(W, H) * 1.2, larg = (24 + r.forza * 70) * Math.min(1, r.life * 3), ex = r.x + Math.cos(r.ang) * L, ey = r.y + Math.sin(r.ang) * L;
        r.g.clear();
        r.g.lineStyle(larg * 2.0, 0x3aa0ff, 0.35 * r.life); r.g.moveTo(r.x, r.y); r.g.lineTo(ex, ey);
        r.g.lineStyle(larg, 0x8fd0ff, 0.9 * r.life); r.g.moveTo(r.x, r.y); r.g.lineTo(ex, ey);
        r.g.lineStyle(larg * 0.4, 0xffffff, r.life); r.g.moveTo(r.x, r.y); r.g.lineTo(ex, ey);
      }
    }

    for (let i = fulmini.length - 1; i >= 0; i--) {
      const f = fulmini[i]; f.life -= 0.06 * dt; if (f.life <= 0) { f.g.destroy(); fulmini.splice(i, 1); continue; }
      f.g.clear(); for (let pass = 0; pass < 2; pass++) { f.g.lineStyle(pass === 0 ? 9 : 3, pass === 0 ? 0x96c8ff : 0xffffff, (pass === 0 ? 0.6 : 1) * f.life); f.g.moveTo(f.ax, f.ay); const seg = 8; for (let s = 1; s < seg; s++) { const tt = s / seg, amp = 26 * (1 - Math.abs(0.5 - tt) * 2); f.g.lineTo(f.ax + (f.bx - f.ax) * tt + rand(-1, 1) * amp, f.ay + (f.by - f.ay) * tt + rand(-1, 1) * amp); } f.g.lineTo(f.bx, f.by); }
    }

    if (laser) {
      if (laser.spegni) { laser.t -= 0.09 * dt; if (laser.t <= 0) { laser.gl.destroy(); laser.gr.destroy(); laser = null; } }
      else laser.t = Math.min(1, laser.t + 0.15 * dt);
    }
    if (laser) {
      const inten = clamp(laser.t, 0, 1), lx = px(laser.lnx), ly = py(laser.lny), rx = px(laser.rnx), ry = py(laser.rny), cx = (lx + rx) / 2, cy = (ly + ry) / 2, sep = Math.abs(rx - lx) || 40, L = Math.hypot(W, H);
      const drawEye = (g, x, y) => { g.clear(); let dx = x - cx, dy = (y - cy) + sep * 0.95; const l = Math.hypot(dx, dy) || 1, w = (5 + 11 * inten) * (0.82 + 0.18 * Math.sin(performance.now() / 38)); const ex = x + dx / l * L, ey = y + dy / l * L; g.lineStyle(w * 2.2, 0xff3c2d, 0.4 * inten); g.moveTo(x, y); g.lineTo(ex, ey); g.lineStyle(w, 0xff3c30, 0.9 * inten); g.moveTo(x, y); g.lineTo(ex, ey); g.lineStyle(w * 0.4, 0xffe6e0, inten); g.moveTo(x, y); g.lineTo(ex, ey); };
      drawEye(laser.gl, lx, ly); drawEye(laser.gr, rx, ry);
    }

    if (fuocoT > 0) { fuocoT -= realS; const x = px(fuocoPos.x), y = py(fuocoPos.y); for (let k = 0; k < 3; k++) { const a = Math.PI / 2 + rand(-0.55, 0.55), v = rand(3, 8.5); P(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, grav: 0.05, s0: rand(0.35, 0.7), s1: 0.05, tint0: 0xffd76e, tint1: 0xff3300, decay: 0.05 }); } }

    if (halo) {
      if (halo.spegni) { halo.t -= 0.06 * dt; if (halo.t <= 0) { halo.ring.destroy(); halo.spk.forEach((s) => s.destroy()); halo = null; } }
      else halo.t = Math.min(1, halo.t + 0.05 * dt);
    }
    if (halo) {
      const x = px(halo.nx), y = py(halo.ny), inten = clamp(halo.t, 0, 1), R = halo.r * H * (0.96 + 0.04 * Math.sin(performance.now() / 300));
      halo.ring.position.set(x, y); halo.ring.scale.set((R * 2) / 32); halo.ring.alpha = 0.7 * inten; halo.ring.tint = 0xffd36e;
      const nS = 10; while (halo.spk.length < nS) { const s = sprite(glowTex, x, y, 0xfff0b4, 0.25); energia.addChild(s); halo.spk.push(s); }
      for (let k = 0; k < nS; k++) { const a = performance.now() / 620 + k * (7 / nS); halo.spk[k].position.set(x + Math.cos(a) * R, y + Math.sin(a) * R * 0.82); halo.spk[k].alpha = inten; halo.spk[k].scale.set(0.2 + 0.12 * (1 + Math.sin(performance.now() / 120 + k))); }
    }

    if (thanos) {
      const x = thanos.x, y = thanos.y;
      if (thanos.emit) { thanos.emit = false; for (let k = 0; k < 60; k++) { const a = rand(0, 7), d = rand(4, 110); P(x + Math.cos(a) * d, y + Math.sin(a) * d, { vx: rand(-1, 1), vy: rand(-3.2, -0.6), s0: rand(0.2, 0.5), s1: 0, tint0: 0xb98cff, tint1: 0x6a28a0, decay: 0.012 }); } }
      thanos.t -= 0.02 * dt; if (thanos.t <= 0) thanos = null;
    }

    if (!hudGfx) { hudGfx = new PIXI.Graphics(); hud.addChild(hudGfx); }
    hudGfx.clear();

    if (freeze > 0) {
      const inten = Math.min(1, freeze); hudGfx.beginFill(0x285ab4, 0.15 * inten); hudGfx.drawRect(0, 0, W, H); hudGfx.endFill();
      const R = Math.max(W, H) * 0.6, tn = performance.now() / 1000; for (let k = 0; k < 3; k++) { const rr = ((tn * 0.5 + k / 3) % 1) * R; hudGfx.lineStyle(3, 0x96c8ff, 0.28 * inten * (1 - rr / R)); hudGfx.drawCircle(W / 2, H / 2, rr); }
    }

    if (mirino) {
      const x0 = Math.min(px(mirino.ax), px(mirino.bx)), x1 = Math.max(px(mirino.ax), px(mirino.bx)), y0 = Math.min(py(mirino.ay), py(mirino.by)), y1 = Math.max(py(mirino.ay), py(mirino.by)), s = Math.max(14, Math.min(x1 - x0, y1 - y0) * 0.18);
      hudGfx.lineStyle(4, 0xffffff, 0.92);
      const st = (cx, cy, sx, sy) => { hudGfx.moveTo(cx + sx * s, cy); hudGfx.lineTo(cx, cy); hudGfx.lineTo(cx, cy + sy * s); };
      st(x0, y0, 1, 1); st(x1, y0, -1, 1); st(x0, y1, 1, -1); st(x1, y1, -1, -1);
    }

    for (let i = scatti.length - 1; i >= 0; i--) {
      const s = scatti[i]; s.t -= realS / 2.2; if (s.t <= 0) { if (s.spr) s.spr.destroy(); scatti.splice(i, 1); continue; }
      if (s.t > 0.82) { hudGfx.beginFill(0xffffff, (s.t - 0.82) / 0.18); hudGfx.drawRect(0, 0, W, H); hudGfx.endFill(); }
      const x0 = Math.min(px(s.ax), px(s.bx)), x1 = Math.max(px(s.ax), px(s.bx)), y0 = Math.min(py(s.ay), py(s.by)), y1 = Math.max(py(s.ay), py(s.by));
      const k = clamp((0.82 - s.t) / 0.82, 0, 1), e = k * k * (3 - 2 * k), tw = W * 0.22, th = tw * ((y1 - y0) / Math.max(1, x1 - x0)), tX = W - tw - 24, tY = H - th - 24;
      const rx = x0 + (tX - x0) * e, ry = y0 + (tY - y0) * e, rw = (x1 - x0) + (tw - (x1 - x0)) * e, rh = (y1 - y0) + (th - (y1 - y0)) * e, pad = 6 * e;
      hudGfx.beginFill(0xffffff, s.t < 0.16 ? s.t / 0.16 : 1); hudGfx.drawRect(rx - pad, ry - pad, rw + pad * 2, rh + pad * 3.2); hudGfx.endFill();
      if (s.tex) { if (!s.spr) { s.spr = new PIXI.Sprite(s.tex); hud.addChild(s.spr); } s.spr.position.set(rx, ry); s.spr.width = rw; s.spr.height = rh; s.spr.alpha = s.t < 0.16 ? s.t / 0.16 : 1; }
    }

    if (comboT > 0) { comboT -= realS; if (combo >= 2) { if (!comboTxt) { comboTxt = new PIXI.Text('', { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: Math.round(H * 0.09), fill: 0xffd36e, stroke: 0x000000, strokeThickness: Math.round(H * 0.012) }); comboTxt.anchor.set(0.5); hud.addChild(comboTxt); } comboTxt.text = 'COMBO ×' + combo; comboTxt.position.set(W / 2, H * 0.16); comboTxt.alpha = clamp(comboT, 0, 1); comboTxt.visible = true; } if (comboT <= 0) { combo = 0; if (comboTxt) comboTxt.visible = false; } }
    else if (comboTxt) comboTxt.visible = false;
  }

  function init() {
    app = new PIXI.Application({ resizeTo: window, backgroundAlpha: 0, antialias: true, powerPreference: 'high-performance' });
    const v = app.view; v.style.position = 'fixed'; v.style.left = '0'; v.style.top = '0'; v.style.width = '100%'; v.style.height = '100%'; v.style.pointerEvents = 'none'; v.style.zIndex = String(window.SB_FX_ZINDEX != null ? window.SB_FX_ZINDEX : 1);
    document.body.appendChild(v);
    W = app.screen.width || window.innerWidth; H = app.screen.height || window.innerHeight;
    glowTex = makeGlow(128); ringTex = makeRing(64);
    energia = new PIXI.Container(); hud = new PIXI.Container(); app.stage.addChild(energia, hud);

    try { if (F.AdvancedBloomFilter) energia.filters = [new F.AdvancedBloomFilter({ threshold: 0.35, bloomScale: 1.0, brightness: 1.0, blur: 5, quality: 4 })]; else if (F.GlowFilter) energia.filters = [new F.GlowFilter({ distance: 16, outerStrength: 1.4, quality: 0.3 })]; } catch {  }
    app.renderer.on('resize', () => { W = app.screen.width; H = app.screen.height; });
    app.ticker.add(tick);
  }
  try { init(); } catch (e) { return; }

  window.SB_FX = {
    spawn, caricaSu, caricaGiu, spara, mano, combo: pulsaCombo,
    laserOn, laserOff, fuoco, auraOn, auraOff, mirinoOn, mirinoGiu, scatto, congela,
    suoni(on) { suoniOn = !!on; }, specchia(on) { mirror = !!on; }, abilitaCombo(on) { comboOn = !!on; if (!on) { combo = 0; comboT = 0; } },
    caricaAttiva() { return !!orb; }, livelloCarica() { return orb ? orb.liv : 0; },
    motore: 'webgl',
    aggiornaEDisegna() {  },
  };
})();
