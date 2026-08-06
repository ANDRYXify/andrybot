// Motore effetti "cinematici" per il tracking (P6). RENDERER puro: non rileva
// nulla, disegna. Lo usano SIA il rilevatore in Chrome (anteprima locale) SIA
// l'overlay giochi in OBS (guidato dagli eventi via SSE), così l'aspetto è identico.
//
// Coordinate in 0..1 (indipendenti dalla risoluzione). L'origine è la webcam; se la
// facecam in OBS è specchiata (selfie), SB_FX.specchia(true) ribalta la X.
//
// API:
//   SB_FX.spawn(tipo, p)      → fireball | fulmine | snap | onda
//   SB_FX.caricaSu(p)         → aggiorna la carica del kamehameha (livello, pos)
//   SB_FX.caricaGiu()         → azzera la carica senza sparare
//   SB_FX.spara(p)            → lancia il raggio kamehameha (forza = carica)
//   SB_FX.mano(i, x, y)       → posizione mano i (per i trail), 0..1
//   SB_FX.combo()             → +1 alla combo (aura crescente)
//   SB_FX.suoni(on)           → suoni on/off ; SB_FX.specchia(on)
//   SB_FX.aggiornaEDisegna(ctx, W, H, dtMs)
(() => {
  'use strict';

  // ── audio sintetico (WebAudio): niente file, niente CDN. On/off.
  let AC = null, suoniOn = true;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { AC = null; } } return AC; }
  function suono(tipo) {
    if (!suoniOn) return; const c = ac(); if (!c) return;
    const t = c.currentTime;
    const beep = (f0, f1, dur, tipoOsc, vol) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = tipoOsc; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    };
    const rumore = (dur, vol) => {
      const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = vol;
      s.connect(g); g.connect(c.destination); s.start(t);
    };
    if (tipo === 'fireball') { beep(320, 90, 0.35, 'sawtooth', 0.18); rumore(0.25, 0.08); }
    else if (tipo === 'kamehameha') { beep(120, 900, 0.5, 'sawtooth', 0.16); beep(70, 40, 0.9, 'sine', 0.14); rumore(0.6, 0.06); }
    else if (tipo === 'carica') { beep(200, 700, 0.25, 'sine', 0.05); }
    else if (tipo === 'fulmine') { rumore(0.18, 0.14); beep(1400, 300, 0.12, 'square', 0.06); }
    else if (tipo === 'snap') { rumore(0.05, 0.2); beep(1800, 200, 0.08, 'square', 0.05); }
    else if (tipo === 'scatto') { rumore(0.03, 0.18); beep(2600, 1200, 0.05, 'square', 0.05); beep(900, 500, 0.06, 'square', 0.04); }
    else if (tipo === 'freeze') { beep(600, 60, 0.6, 'sine', 0.14); beep(300, 30, 0.8, 'triangle', 0.1); }
    else if (tipo === 'impatto') { beep(90, 40, 0.25, 'sine', 0.2); rumore(0.2, 0.1); }
  }

  // ── stato
  let mirror = true;
  const px = (x, W) => (mirror ? (1 - x) : x) * W;
  const py = (y, H) => y * H;
  const rand = (a, b) => a + Math.random() * (b - a);

  const fireballs = [];   // { x,y,vx,vy,vita,eta,forza,scia:[] }  (coord in px, calcolate a spawn)
  const fulmini = [];     // { ax,ay,bx,by,vita }
  const raggi = [];       // kamehameha { x,y,dx,dy,vita,max,forza }
  const onde = [];        // shockwave { x,y,r,vita }
  const particelle = [];  // generiche { x,y,vx,vy,vita,col,size }
  const trailPunti = [[], []];   // per mano: [{x,y,vita}]
  let carica = null;      // { x,y,liv,tPuls }
  let shake = 0;
  let combo = 0, comboT = 0;
  // ── effetti sul VISO (Fase 2): coord occhi/bocca/testa in 0..1 (fonte, non specchiate)
  let laser = null;       // occhi laser { lnx,lny,rnx,rny, t, spegni }
  let fuoco = null;       // fuoco/fumo dalla bocca { nx,ny, t }
  let halo = null;        // aura/corona sul sorriso { nx,ny,r, t, spegni }
  // ── inquadratura/scatto (Fase 3): mirino "a cornice" + flash con miniatura
  let mirino = null;      // { ax,ay,bx,by } cornice in composizione (0..1)
  const scatti = [];      // { ax,ay,bx,by, t, thumb } flash+miniatura in corso
  // ── snap di Thanos (Fase 5): flash viola + cenere + vignettatura
  let thanos = null;      // { nx,ny, t, emit }
  let freeze = 0;         // "tempo fermo" (secondi rimasti): rallenta gli effetti + tinta

  function aura(col, x, y, r) { return { col, x, y, r }; }

  // ── spawn / API pubblica --------------------------------------------------
  function spawn(tipo, p) {
    p = p || {};
    if (tipo === 'fireball') {
      // origine mano + direzione (dir in gradi o dx/dy). Precalcolo px a disegno.
      fireballs.push({ nx: p.x ?? 0.5, ny: p.y ?? 0.5, dx: p.dx ?? 0.6, dy: p.dy ?? -0.2, forza: clamp(p.forza ?? 1, 0.4, 2), eta: 0, vita: 1, scia: [] });
      suono('fireball'); pulsaCombo();
    } else if (tipo === 'fulmine') {
      fulmini.push({ anx: p.ax ?? 0.35, any: p.ay ?? 0.5, bnx: p.bx ?? 0.65, bny: p.by ?? 0.5, vita: 1 });
      suono('fulmine'); pulsaCombo();
    } else if (tipo === 'snap') {
      onde.push({ nx: p.x ?? 0.5, ny: p.y ?? 0.5, r: 0, vita: 1, diss: true });
      thanos = { nx: p.x ?? 0.5, ny: p.y ?? 0.5, t: 1, emit: true };   // flash viola + cenere
      suono('snap'); shake = Math.max(shake, 13); pulsaCombo();
    } else if (tipo === 'onda') {
      onde.push({ nx: p.x ?? 0.5, ny: p.y ?? 0.5, r: 0, vita: 1 });
    }
  }
  function caricaSu(p) {
    if (!carica) { carica = { nx: p.x ?? 0.5, ny: p.y ?? 0.5, liv: 0 }; }
    carica.nx = p.x ?? carica.nx; carica.ny = p.y ?? carica.ny;
    carica.liv = clamp((p.liv != null ? p.liv : carica.liv + 0.02), 0, 1);
    if (Math.random() < 0.4) suono('carica');
  }
  function caricaGiu() { carica = null; }
  function spara(p) {
    const forza = clamp((p && p.forza != null) ? p.forza : (carica ? carica.liv : 0.6), 0.2, 1);
    raggi.push({ nx: (p && p.x) ?? (carica ? carica.nx : 0.5), ny: (p && p.y) ?? (carica ? carica.ny : 0.5),
      dx: (p && p.dx) ?? 1, dy: (p && p.dy) ?? 0, vita: 1, forza });
    carica = null; suono('kamehameha'); shake = Math.max(shake, 8 + forza * 14); pulsaCombo();
  }
  function mano(i, x, y) {
    if (i !== 0 && i !== 1) return;
    trailPunti[i].push({ nx: x, ny: y, vita: 1 });
    if (trailPunti[i].length > 24) trailPunti[i].shift();
  }
  // ── VISO: laser occhi -----------------------------------------------------
  function laserOn(p) {
    p = p || {};
    if (!laser) laser = { lnx: 0.42, lny: 0.42, rnx: 0.58, rny: 0.42, t: 0 };
    if (p.lx != null) laser.lnx = p.lx; if (p.ly != null) laser.lny = p.ly;
    if (p.rx != null) laser.rnx = p.rx; if (p.ry != null) laser.rny = p.ry;
    laser.spegni = false; laser.t = Math.min(1, laser.t + 0.2);
    if (Math.random() < 0.12) suono('fulmine');
  }
  function laserOff() { if (laser) laser.spegni = true; }
  // ── VISO: fuoco dalla bocca -----------------------------------------------
  function fuocoSpara(p) {
    p = p || {};
    if (!fuoco) fuoco = { nx: p.x ?? 0.5, ny: p.y ?? 0.62, t: 0 };
    fuoco.nx = p.x ?? fuoco.nx; fuoco.ny = p.y ?? fuoco.ny; fuoco.t = 0.32;
    if (Math.random() < 0.22) suono('fireball');
  }
  // ── VISO: aura/corona sul sorriso -----------------------------------------
  function auraOn(p) {
    p = p || {};
    if (!halo) halo = { nx: p.x ?? 0.5, ny: p.y ?? 0.4, r: p.r ?? 0.16, t: 0 };
    halo.nx = p.x ?? halo.nx; halo.ny = p.y ?? halo.ny; if (p.r != null) halo.r = p.r;
    halo.spegni = false; halo.t = Math.min(1, halo.t + 0.06);
  }
  function auraOff() { if (halo) halo.spegni = true; }
  // ── SLOW-MO / FREEZE: ferma il "tempo" degli effetti per qualche secondo ---
  function congela(sec) { freeze = Math.max(freeze, sec || 2.5); suono('freeze'); }
  // ── INQUADRATURA: mirino a cornice mentre componi -------------------------
  function mirinoOn(p) { p = p || {}; mirino = { ax: p.ax ?? 0.3, ay: p.ay ?? 0.3, bx: p.bx ?? 0.7, by: p.by ?? 0.7 }; }
  function mirinoGiu() { mirino = null; }
  function scatto(p) {
    p = p || {}; mirino = null;
    scatti.push({ ax: p.ax ?? 0.3, ay: p.ay ?? 0.3, bx: p.bx ?? 0.7, by: p.by ?? 0.7, t: 1, thumb: p.thumb || null });
    suono('scatto'); shake = Math.max(shake, 6);
  }
  let comboOn = true;
  function pulsaCombo() { if (!comboOn) return; combo++; comboT = 1.8; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ── update + draw ---------------------------------------------------------
  function aggiornaEDisegna(ctx, W, H, dtMs) {
    const realMs = dtMs || 16;
    if (freeze > 0) freeze -= realMs / 1000;              // il freeze scorre in tempo REALE
    const slow = freeze > 0 ? 0.32 : 1;                   // slow-motion degli effetti
    const dt = Math.min(50, realMs) / 16 * slow;          // in "frame" a 60fps (rallentato se freeze)
    ctx.save();
    if (shake > 0.3) { ctx.translate(rand(-shake, shake), rand(-shake, shake)); shake *= Math.pow(0.86, dt); } else shake = 0;
    ctx.globalCompositeOperation = 'lighter';

    // trail delle mani (particelle luminose che seguono il movimento)
    for (let i = 0; i < 2; i++) {
      const tp = trailPunti[i];
      for (let j = 0; j < tp.length; j++) {
        const q = tp[j]; q.vita -= 0.05 * dt; if (q.vita <= 0) continue;
        const x = px(q.nx, W), y = py(q.ny, H);
        const r = 18 * q.vita * (0.5 + j / tp.length);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(120,200,255,${0.5 * q.vita})`); g.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      while (tp.length && tp[0].vita <= 0) tp.shift();
    }

    // carica kamehameha: sfera pulsante che cresce
    if (carica) {
      const x = px(carica.nx, W), y = py(carica.ny, H);
      const base = 20 + carica.liv * 90, pul = base * (1 + 0.12 * Math.sin(performance.now() / 70));
      for (let k = 0; k < 3; k++) {
        const rr = pul * (1 - k * 0.25);
        const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, `rgba(255,255,255,${0.9 - k * 0.2})`);
        g.addColorStop(0.4, `rgba(120,210,255,${0.7 - k * 0.2})`);
        g.addColorStop(1, 'rgba(60,120,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
      }
      // particelle risucchiate verso la sfera
      if (Math.random() < 0.8) {
        const a = rand(0, 7), d = pul * rand(1.4, 2.2);
        particelle.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, tx: x, ty: y, vita: 1, col: '150,220,255', size: rand(1.5, 3), risucchio: true });
      }
    }

    // raggi kamehameha
    for (let i = raggi.length - 1; i >= 0; i--) {
      const r = raggi[i]; r.vita -= 0.018 * dt / (0.6 + r.forza); if (r.vita <= 0) { raggi.splice(i, 1); continue; }
      const x = px(r.nx, W), y = py(r.ny, H);
      const dx = (mirror ? -r.dx : r.dx), dy = r.dy, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const L = Math.hypot(W, H) * 1.2, larg = (26 + r.forza * 70) * Math.min(1, r.vita * 3);
      const ex = x + ux * L, ey = y + uy * L;
      // alone
      const grad = ctx.createLinearGradient(x, y, ex, ey);
      grad.addColorStop(0, `rgba(180,235,255,${0.9 * r.vita})`); grad.addColorStop(1, 'rgba(80,150,255,0)');
      ctx.strokeStyle = grad; ctx.lineCap = 'round';
      ctx.lineWidth = larg * 2.2; ctx.globalAlpha = 0.35 * r.vita; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = larg; ctx.strokeStyle = `rgba(140,220,255,${0.9 * r.vita})`; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.lineWidth = larg * 0.4; ctx.strokeStyle = `rgba(255,255,255,${r.vita})`; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      // sfera alla bocca del raggio
      const g = ctx.createRadialGradient(x, y, 0, x, y, larg * 1.6);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, larg * 1.6, 0, 7); ctx.fill();
    }

    // fireball
    for (let i = fireballs.length - 1; i >= 0; i--) {
      const f = fireballs[i]; f.eta += dt;
      const x0 = px(f.nx, W), y0 = py(f.ny, H);
      const dx = (mirror ? -f.dx : f.dx), dy = f.dy, len = Math.hypot(dx, dy) || 1;
      const sp = 9 * f.forza;
      const cx = x0 + (dx / len) * sp * f.eta, cy = y0 + (dy / len) * sp * f.eta + 0.12 * f.eta * f.eta;
      f.scia.push({ x: cx, y: cy, vita: 1 });
      if (f.scia.length > 18) f.scia.shift();
      for (const s of f.scia) { s.vita -= 0.08 * dt;
        const r = 14 * f.forza * s.vita;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        g.addColorStop(0, `rgba(255,240,180,${s.vita})`); g.addColorStop(0.5, `rgba(255,140,40,${0.7 * s.vita})`); g.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 7); ctx.fill();
      }
      const fuori = cx < -80 || cx > W + 80 || cy > H + 80;
      if (fuori || f.eta > 60) {
        // impatto
        for (let k = 0; k < 22; k++) { const a = rand(0, 7), v = rand(2, 8) * f.forza;
          particelle.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vita: 1, col: '255,150,50', size: rand(2, 4) }); }
        onde.push({ px: cx, py: cy, r: 0, vita: 1 }); shake = Math.max(shake, 6 * f.forza); suono('impatto');
        fireballs.splice(i, 1);
      }
    }

    // fulmini (arco spezzato che sfarfalla)
    for (let i = fulmini.length - 1; i >= 0; i--) {
      const fl = fulmini[i]; fl.vita -= 0.06 * dt; if (fl.vita <= 0) { fulmini.splice(i, 1); continue; }
      const ax = px(fl.anx, W), ay = py(fl.any, H), bx = px(fl.bnx, W), by = py(fl.bny, H);
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath(); ctx.moveTo(ax, ay);
        const seg = 8; for (let s = 1; s < seg; s++) { const t = s / seg;
          const mx = ax + (bx - ax) * t + rand(-1, 1) * 26 * (1 - Math.abs(0.5 - t) * 2);
          const my = ay + (by - ay) * t + rand(-1, 1) * 26 * (1 - Math.abs(0.5 - t) * 2);
          ctx.lineTo(mx, my); }
        ctx.lineTo(bx, by);
        ctx.strokeStyle = pass === 0 ? `rgba(150,200,255,${0.6 * fl.vita})` : `rgba(255,255,255,${fl.vita})`;
        ctx.lineWidth = pass === 0 ? 9 : 3; ctx.lineCap = 'round'; ctx.stroke();
      }
    }

    // onde d'urto / shockwave
    for (let i = onde.length - 1; i >= 0; i--) {
      const o = onde[i]; o.vita -= 0.04 * dt; if (o.vita <= 0) { onde.splice(i, 1); continue; }
      const x = o.px != null ? o.px : px(o.nx, W), y = o.py != null ? o.py : py(o.ny, H);
      o.r += (12 + (o.diss ? 10 : 0)) * dt;
      ctx.strokeStyle = `rgba(200,230,255,${o.vita * 0.8})`; ctx.lineWidth = 4 * o.vita; ctx.beginPath(); ctx.arc(x, y, o.r, 0, 7); ctx.stroke();
      if (o.diss && Math.random() < 0.6) particelle.push({ x: x + rand(-o.r, o.r), y: y + rand(-o.r, o.r), vx: rand(-1, 1), vy: rand(-3, -1), vita: 1, col: '180,180,200', size: rand(1, 2.5) });
    }

    // ── EFFETTI SUL VISO ---------------------------------------------------
    // laser occhi: due raggi rossi che divergono verso il basso-esterno
    if (laser) {
      if (laser.spegni) { laser.t -= 0.09 * dt; if (laser.t <= 0) laser = null; }
      else laser.t = Math.min(1, laser.t + 0.15 * dt);
    }
    if (laser) {
      const inten = clamp(laser.t, 0, 1);
      const lx0 = px(laser.lnx, W), ly0 = py(laser.lny, H);
      const rx0 = px(laser.rnx, W), ry0 = py(laser.rny, H);
      const cx = (lx0 + rx0) / 2, cy = (ly0 + ry0) / 2, sep = Math.abs(rx0 - lx0) || 40;
      const L = Math.hypot(W, H);
      [[lx0, ly0], [rx0, ry0]].forEach(([x, y], idx) => {
        let dx = (x - cx), dy = (y - cy) + sep * 0.95;   // outward + giù
        const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
        const flick = 0.82 + 0.18 * Math.sin(performance.now() / 38 + idx * 2);
        const ex = x + ux * L, ey = y + uy * L, w = (5 + 11 * inten) * flick;
        const grad = ctx.createLinearGradient(x, y, ex, ey);
        grad.addColorStop(0, `rgba(255,90,60,${0.9 * inten})`); grad.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.strokeStyle = grad; ctx.lineCap = 'round';
        ctx.lineWidth = w * 2.4; ctx.globalAlpha = 0.4 * inten; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.lineWidth = w; ctx.strokeStyle = `rgba(255,60,45,${0.9 * inten})`; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.lineWidth = w * 0.35; ctx.strokeStyle = `rgba(255,235,225,${inten})`; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
        const g = ctx.createRadialGradient(x, y, 0, x, y, w * 2.2);
        g.addColorStop(0, `rgba(255,255,255,${inten})`); g.addColorStop(0.5, `rgba(255,80,60,${0.8 * inten})`); g.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, w * 2.2, 0, 7); ctx.fill();
      });
    }
    // fuoco/fumo dalla bocca: getto di particelle verso il basso, giallo→rosso
    if (fuoco) { fuoco.t -= 0.03 * dt; if (fuoco.t <= 0) fuoco = null; }
    if (fuoco) {
      const x = px(fuoco.nx, W), y = py(fuoco.ny, H);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 34);
      g.addColorStop(0, 'rgba(255,225,130,.85)'); g.addColorStop(1, 'rgba(255,120,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 34, 0, 7); ctx.fill();
      for (let k = 0; k < 3; k++) {
        const a = Math.PI / 2 + rand(-0.55, 0.55), v = rand(3, 8.5);
        particelle.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vita: 1, size: rand(3, 6.5), fuoco: true });
      }
    }
    // aura/corona sul sorriso: anello dorato pulsante + scintille orbitanti
    if (halo) {
      if (halo.spegni) { halo.t -= 0.06 * dt; if (halo.t <= 0) halo = null; }
      else halo.t = Math.min(1, halo.t + 0.05 * dt);
    }
    if (halo) {
      const x = px(halo.nx, W), y = py(halo.ny, H), inten = clamp(halo.t, 0, 1);
      const R = (halo.r || 0.16) * H * (0.96 + 0.04 * Math.sin(performance.now() / 300));
      for (let k = 0; k < 3; k++) { ctx.strokeStyle = `rgba(255,${210 - k * 22},120,${(0.5 - k * 0.13) * inten})`; ctx.lineWidth = 10 - k * 3; ctx.beginPath(); ctx.arc(x, y, R + k * 4, 0, 7); ctx.stroke(); }
      const nS = 10;
      for (let k = 0; k < nS; k++) {
        const a = performance.now() / 620 + k * (7 / nS);
        const sx = x + Math.cos(a) * R, sy = y + Math.sin(a) * R * 0.82;
        const s = Math.max(1, (2 + 2 * Math.sin(performance.now() / 120 + k)) * inten);
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s * 2);
        g.addColorStop(0, `rgba(255,240,180,${inten})`); g.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, s * 2, 0, 7); ctx.fill();
      }
    }

    // snap di Thanos: alla prima comparsa sputa la cenere; poi un flash viola
    if (thanos) {
      const x = px(thanos.nx, W), y = py(thanos.ny, H);
      if (thanos.emit) {
        thanos.emit = false;
        for (let k = 0; k < 46; k++) { const a = rand(0, 7), d = rand(4, 90); particelle.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: rand(-0.8, 0.8), vy: rand(-2.6, -0.6), vita: 1, size: rand(1.5, 4), ash: true }); }
      }
      thanos.t -= 0.02 * dt; if (thanos.t <= 0) thanos = null;
      else { const r = Math.hypot(W, H) * (0.2 + (1 - thanos.t) * 0.5), g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(150,80,220,${0.5 * thanos.t})`); g.addColorStop(0.6, `rgba(90,40,160,${0.25 * thanos.t})`); g.addColorStop(1, 'rgba(60,20,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    }

    // particelle generiche
    for (let i = particelle.length - 1; i >= 0; i--) {
      const p = particelle[i];
      if (p.risucchio) { p.x += (p.tx - p.x) * 0.18 * dt; p.y += (p.ty - p.y) * 0.18 * dt; p.vita -= 0.05 * dt; }
      else if (p.ash) { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; p.vy = (p.vy || 0) - 0.02 * dt; p.vita -= 0.012 * dt; }   // cenere: sale e sfuma
      else { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.vy != null) p.vy += 0.15 * dt; p.vita -= (p.fuoco ? 0.05 : 0.03) * dt; }
      if (p.vita <= 0) { particelle.splice(i, 1); continue; }
      if (p.fuoco) { const v = p.vita; ctx.fillStyle = `rgba(255,${Math.round(70 + 160 * v)},${Math.round(20 * v)},${v})`; }
      else if (p.ash) ctx.fillStyle = `rgba(${Math.round(150 + 40 * p.vita)},${Math.round(120 + 30 * p.vita)},${Math.round(160 + 40 * p.vita)},${p.vita})`;
      else ctx.fillStyle = `rgba(${p.col},${p.vita})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, (p.size || 2) * p.vita, 0, 7); ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';

    // snap di Thanos: vignettatura viola che stringe lo schermo
    if (thanos) {
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
      v.addColorStop(0, 'rgba(40,10,70,0)'); v.addColorStop(1, `rgba(30,6,60,${0.55 * thanos.t})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    // slow-mo / freeze: tinta blu + onde temporali dal centro + indicatore
    if (freeze > 0) {
      const inten = Math.min(1, freeze);
      ctx.fillStyle = `rgba(40,90,180,${0.15 * inten})`; ctx.fillRect(0, 0, W, H);
      const R = Math.max(W, H) * 0.6, tnow = performance.now() / 1000;
      for (let k = 0; k < 3; k++) { const rr = ((tnow * 0.5 + k / 3) % 1) * R; ctx.strokeStyle = `rgba(150,200,255,${0.28 * inten * (1 - rr / R)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W / 2, H / 2, rr, 0, 7); ctx.stroke(); }
      ctx.save(); ctx.globalAlpha = inten; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.round(H * 0.055)}px system-ui, sans-serif`; ctx.lineWidth = Math.round(H * 0.008); ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.strokeText('⏳ TEMPO FERMO', W / 2, H * 0.9); ctx.fillStyle = 'rgba(210,235,255,.95)'; ctx.fillText('⏳ TEMPO FERMO', W / 2, H * 0.9); ctx.restore();
    }

    // ── INQUADRATURA: mirino a cornice (staffe agli angoli) mentre componi
    if (mirino) {
      const x0 = Math.min(px(mirino.ax, W), px(mirino.bx, W)), x1 = Math.max(px(mirino.ax, W), px(mirino.bx, W));
      const y0 = Math.min(py(mirino.ay, H), py(mirino.by, H)), y1 = Math.max(py(mirino.ay, H), py(mirino.by, H));
      const s = Math.max(14, Math.min(x1 - x0, y1 - y0) * 0.18);
      ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.setLineDash([]);
      const staffa = (cx, cy, sx, sy) => { ctx.beginPath(); ctx.moveTo(cx + sx * s, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * s); ctx.stroke(); };
      staffa(x0, y0, 1, 1); staffa(x1, y0, -1, 1); staffa(x0, y1, 1, -1); staffa(x1, y1, -1, -1);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc((x0 + x1) / 2, (y0 + y1) / 2, 3, 0, 7); ctx.fill();
    }
    // ── SCATTO: flash bianco + miniatura che rimpicciolisce verso un angolo
    for (let i = scatti.length - 1; i >= 0; i--) {
      const s = scatti[i]; s.t -= (dtMs || 16) / 1000 / 2.2; if (s.t <= 0) { scatti.splice(i, 1); continue; }
      const x0 = Math.min(px(s.ax, W), px(s.bx, W)), x1 = Math.max(px(s.ax, W), px(s.bx, W));
      const y0 = Math.min(py(s.ay, H), py(s.by, H)), y1 = Math.max(py(s.ay, H), py(s.by, H));
      if (s.t > 0.82) { ctx.fillStyle = `rgba(255,255,255,${(s.t - 0.82) / 0.18})`; ctx.fillRect(0, 0, W, H); }   // flash
      // interpolo dal rettangolo pieno → miniatura "Polaroid" in basso a destra
      const k = clamp((0.82 - s.t) / 0.82, 0, 1), e = k * k * (3 - 2 * k);
      const tw = W * 0.22, th = tw * ((y1 - y0) / Math.max(1, x1 - x0));
      const tX = W - tw - 24, tY = H - th - 24;
      const rx = x0 + (tX - x0) * e, ry = y0 + (tY - y0) * e;
      const rw = (x1 - x0) + (tw - (x1 - x0)) * e, rh = (y1 - y0) + (th - (y1 - y0)) * e;
      const alpha = s.t < 0.16 ? s.t / 0.16 : 1;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
      const pad = 6 * e; ctx.fillRect(rx - pad, ry - pad, rw + pad * 2, rh + pad * 3.2);   // bordo bianco Polaroid
      if (s.thumb) { try { ctx.drawImage(s.thumb, rx, ry, rw, rh); } catch { /* niente */ } }
      else { ctx.fillStyle = 'rgba(20,26,45,.9)'; ctx.fillRect(rx, ry, rw, rh); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = `${Math.round(rh * 0.5)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('📷', rx + rw / 2, ry + rh / 2); }
      ctx.strokeRect(rx - pad, ry - pad, rw + pad * 2, rh + pad * 3.2);
      ctx.restore();
    }

    // combo HUD
    if (comboT > 0) { comboT -= (dtMs || 16) / 1000;
      if (combo >= 2) {
        const a = clamp(comboT, 0, 1);
        ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `800 ${Math.round(H * 0.09)}px system-ui, sans-serif`;
        ctx.lineWidth = Math.round(H * 0.012); ctx.strokeStyle = 'rgba(0,0,0,.6)';
        const tx = W * 0.5, ty = H * 0.16;
        ctx.strokeText('COMBO ×' + combo, tx, ty);
        const g = ctx.createLinearGradient(tx - 120, ty, tx + 120, ty); g.addColorStop(0, '#ffd36e'); g.addColorStop(1, '#ff7ae0');
        ctx.fillStyle = g; ctx.fillText('COMBO ×' + combo, tx, ty); ctx.restore();
      }
      if (comboT <= 0) combo = 0;
    }
    ctx.restore();
  }

  window.SB_FX = {
    spawn, caricaSu, caricaGiu, spara, mano, combo: pulsaCombo,
    laserOn, laserOff, fuoco: fuocoSpara, auraOn, auraOff,
    mirinoOn, mirinoGiu, scatto, congela,
    suoni(on) { suoniOn = !!on; }, specchia(on) { mirror = !!on; }, abilitaCombo(on) { comboOn = !!on; if (!on) { combo = 0; comboT = 0; } },
    caricaAttiva() { return !!carica; }, livelloCarica() { return carica ? carica.liv : 0; },
    aggiornaEDisegna,
  };
})();
