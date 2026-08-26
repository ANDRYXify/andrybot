

(() => {
  'use strict';
  const T = window.SB_TRACKING, FX = window.SB_FX;
  if (!T || !FX || !T.registraMinigioco) return;
  FX.specchia(false);

  const centro = (h) => {
    const kp = h.keypoints || h.landmarks;
    if (Array.isArray(kp) && kp.length) { let x = 0, y = 0; for (const p of kp) { x += (p[0] ?? p.x ?? 0); y += (p[1] ?? p.y ?? 0); } return { x: x / kp.length, y: y / kp.length }; }
    const b = h.box || [0, 0, 0, 0]; return { x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 };
  };

  let charge = null;
  let firedKame = false;
  const prevOpen = [null, null];
  const manoInviata = [null, null];
  let lastMano = 0, lastCarica = 0, lastFulmine = 0, lastTick = 0;
  let lastLaser = 0, lastFuoco = 0, lastAura = 0;
  let laserAcceso = false, auraAccesa = false;
  let framingT = 0, scattoArmato = true, lastMirino = 0, mirinoSu = false;
  let _cap = null, _ultimoSalva = 0;
  let lastPuntatore = 0;
  let snapReady = false, snapReadyT = 0, lastSnap = 0;
  let freezeT = 0, freezeArmato = true, lastFreeze = 0;

  const puntaIndice = (h, c, W, H) => { const kp = h.keypoints || h.landmarks, p = kp && kp[8]; return { x: (p ? (p[0] ?? p.x) : c.x) / W, y: (p ? (p[1] ?? p.y) : c.y) / H }; };

  function pinch(h, sens) {
    const k = h.keypoints || h.landmarks; if (!Array.isArray(k) || k.length < 21) return null;
    const gx = (p) => (p[0] ?? p.x ?? 0), gy = (p) => (p[1] ?? p.y ?? 0);
    const d = (a, b) => Math.hypot(gx(a) - gx(b), gy(a) - gy(b));
    const palmo = d(k[0], k[9]) || 1, gap = d(k[4], k[8]);
    return { x: (gx(k[4]) + gx(k[8])) / 2, y: (gy(k[4]) + gy(k[8])) / 2, giu: gap < palmo * (0.40 + (sens - 5) * 0.02) };
  }

  function catturaRitaglio(rect, specchia) {
    try {
      const vid = document.getElementById('cam');
      if (!vid || !vid.videoWidth) return null;
      const vw = vid.videoWidth, vh = vid.videoHeight;
      const x0 = Math.min(rect.ax, rect.bx) * vw, x1 = Math.max(rect.ax, rect.bx) * vw;
      const y0 = Math.min(rect.ay, rect.by) * vh, y1 = Math.max(rect.ay, rect.by) * vh;
      const sw = Math.max(2, x1 - x0), sh = Math.max(2, y1 - y0);
      if (!_cap) _cap = document.createElement('canvas');
      _cap.width = Math.round(sw); _cap.height = Math.round(sh);
      const c = _cap.getContext('2d');
      c.save(); if (specchia) { c.translate(_cap.width, 0); c.scale(-1, 1); }
      c.drawImage(vid, x0, y0, sw, sh, 0, 0, _cap.width, _cap.height); c.restore();
      salvaPng(_cap);
      return _cap;
    } catch { return null; }
  }

  const _WM = 'ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live';
  const _WMT = '(c) 2024-2026 Andrea Taliento (ANDRYXify) - Tutti i diritti riservati - socialbot.live - ' + _WM;
  const _WMC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  async function _firmaPng(blob) {
    try {
      const u8 = new Uint8Array(await blob.arrayBuffer());
      const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      for (let i = 0; i < 8; i++) if (u8[i] !== sig[i]) return blob;
      const dv = new DataView(u8.buffer); const ins = 8 + 4 + 4 + dv.getUint32(8) + 4;
      const data = []; for (const ch of 'Copyright') data.push(ch.charCodeAt(0)); data.push(0);
      for (const ch of _WMT) data.push(ch.charCodeAt(0) & 0xFF);
      const type = [0x74, 0x45, 0x58, 0x74];
      const body = new Uint8Array(type.length + data.length); body.set(type, 0); body.set(data, type.length);
      let cc = 0xFFFFFFFF; for (let i = 0; i < body.length; i++) cc = _WMC[(cc ^ body[i]) & 0xFF] ^ (cc >>> 8); cc = (cc ^ 0xFFFFFFFF) >>> 0;
      const chunk = new Uint8Array(4 + 4 + data.length + 4); const cdv = new DataView(chunk.buffer);
      cdv.setUint32(0, data.length); chunk.set(type, 4); chunk.set(data, 8); cdv.setUint32(8 + data.length, cc);
      const out = new Uint8Array(u8.length + chunk.length); out.set(u8.subarray(0, ins), 0); out.set(chunk, ins); out.set(u8.subarray(ins), ins + chunk.length);
      return new Blob([out], { type: 'image/png' });
    } catch { return blob; }
  }
  function salvaPng(canvas) {
    try {
      const now = performance.now(); if (now - _ultimoSalva < 1500) return; _ultimoSalva = now;
      canvas.toBlob(async (blob) => {
        if (!blob) return; const firmato = await _firmaPng(blob);
        const url = URL.createObjectURL(firmato), a = document.createElement('a');
        a.href = url; a.download = 'socialbot-scatto-' + Date.now() + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, 'image/png');
    } catch {  }
  }

  T.registraMinigioco(({ hands, faces, ctx, W, H }) => {
    const now = performance.now();
    const E = (window.SB_OPZIONI && window.SB_OPZIONI.effetti) || {};
    if (E.attivo === false) { lastTick = now; return; }
    FX.suoni(E.suoni !== false); FX.abilitaCombo(E.combo !== false);

    const sens = Number(E.sensibilita) || 5;
    const chargeMax = 0.17 + (sens - 5) * 0.008;
    const fulmineMin = 0.33 - (sens - 5) * 0.014;
    firedKame = false;
    const M = (hands || []).slice(0, 2).map((h) => { const c = centro(h); const tip = puntaIndice(h, c, W, H); return { nx: c.x / W, ny: c.y / H, tx: tip.x, ty: tip.y, open: T.rilevaGesto ? T.rilevaGesto(h) : '' }; });

    if (E.trail !== false) {
      M.forEach((m, i) => FX.mano(i, m.nx, m.ny));
      if (now - lastMano > 33) {
        lastMano = now;
        M.forEach((m, i) => { const l = manoInviata[i]; if (!l || Math.hypot(m.nx - l.x, m.ny - l.y) > 0.006) { manoInviata[i] = { x: m.nx, y: m.ny }; T.inviaFx({ tipo: 'mano', i, x: m.nx, y: m.ny }); } });
      }
    }

    const duePunti = M.length === 2 && M[0].open === 'point' && M[1].open === 'point';

    if (M.length === 2) {
      const dist = Math.hypot(M[0].nx - M[1].nx, M[0].ny - M[1].ny);
      const midx = (M[0].nx + M[1].nx) / 2, midy = (M[0].ny + M[1].ny) / 2;
      if (E.kamehameha !== false && !(duePunti && E.scatto !== false)) {
        if (dist < chargeMax) {
          if (!charge) charge = { t0: now };
          charge.liv = Math.min(1, (now - charge.t0) / 900);
          FX.caricaSu({ x: midx, y: midy, liv: charge.liv });
          if (now - lastCarica > 45) { lastCarica = now; T.inviaFx({ tipo: 'carica', x: midx, y: midy, liv: charge.liv }); }
        } else if (charge && dist > 0.28) {
          if (charge.liv > 0.15) {
            const ang = Math.atan2(midy - 0.5, midx - 0.5);
            const p = { x: midx, y: midy, dx: Math.cos(ang), dy: Math.sin(ang), forza: charge.liv };
            FX.spara(p); T.inviaFx({ tipo: 'spara', ...p }); firedKame = true;
          } else { FX.caricaGiu(); T.inviaFx({ tipo: 'caricaGiu' }); }
          charge = null;
        }
      } else if (charge) { FX.caricaGiu(); T.inviaFx({ tipo: 'caricaGiu' }); charge = null; }

      if (E.fulmini !== false && !charge && M[0].open === 'openpalm' && M[1].open === 'openpalm' && dist > fulmineMin && now - lastFulmine > 90) {
        lastFulmine = now;
        const p = { ax: M[0].nx, ay: M[0].ny, bx: M[1].nx, by: M[1].ny };
        FX.spawn('fulmine', p); T.inviaFx({ tipo: 'fulmine', ...p });
      }
    } else if (charge) { FX.caricaGiu(); T.inviaFx({ tipo: 'caricaGiu' }); charge = null; }

    if (E.fireball !== false) {
      M.forEach((m, i) => {
        if (!charge && !firedKame && prevOpen[i] === 'fist' && m.open === 'openpalm') {
          const ang = Math.atan2(m.ny - 0.5, m.nx - 0.5);
          const p = { x: m.nx, y: m.ny, dx: Math.cos(ang), dy: Math.sin(ang), forza: 1.1 };
          FX.spawn('fireball', p); T.inviaFx({ tipo: 'fireball', ...p });
        }
        prevOpen[i] = m.open;
      });
    } else { M.forEach((m, i) => { prevOpen[i] = m.open; }); }
    for (let i = M.length; i < 2; i++) prevOpen[i] = null;

    const inquadra = E.scatto !== false && duePunti && !charge;
    const larg = Math.abs(M.length === 2 ? M[1].tx - M[0].tx : 0);
    const alt = Math.abs(M.length === 2 ? M[1].ty - M[0].ty : 0);
    const latoMin = Math.max(0.03, 0.09 - (sens - 5) * 0.010);
    const diagMin = Math.max(0.08, 0.21 - (sens - 5) * 0.022);
    const tenutaMs = Math.max(260, 550 - (sens - 5) * 55);
    const riquadroOk = larg > latoMin && alt > latoMin && Math.hypot(larg, alt) > diagMin;
    if (inquadra && scattoArmato) {
      const rect = { ax: M[0].tx, ay: M[0].ty, bx: M[1].tx, by: M[1].ty };
      mirinoSu = true;
      FX.mirinoOn(rect);
      if (now - lastMirino > 50) { lastMirino = now; T.inviaFx({ tipo: 'mirino', ...rect }); }
      if (!riquadroOk) { framingT = 0; }
      else {
        if (!framingT) framingT = now;
        if (now - framingT > tenutaMs) {
          scattoArmato = false; framingT = 0; mirinoSu = false;
          FX.mirinoGiu(); T.inviaFx({ tipo: 'mirinoGiu' });
          const thumb = catturaRitaglio(rect, E.specchio !== false);
          FX.scatto({ ...rect, thumb });
          T.inviaFx({ tipo: 'scatto', ...rect });
        }
      }
    } else {
      framingT = 0;
      if (mirinoSu) { mirinoSu = false; FX.mirinoGiu(); T.inviaFx({ tipo: 'mirinoGiu' }); }
      if (!inquadra) scattoArmato = true;
    }

    if (E.puzzle === true && hands && hands[0] && now - lastPuntatore > 33) {
      const pz = pinch(hands[0], sens);
      if (pz) { lastPuntatore = now; T.inviaFx({ tipo: 'puntatore', x: pz.x / W, y: pz.y / H, liv: pz.giu ? 1 : 0 }); }
    }

    if (E.snap !== false && hands && hands[0]) {
      const k = hands[0].keypoints || hands[0].landmarks;
      if (Array.isArray(k) && k.length >= 21) {
        const gx = (p) => (p[0] ?? p.x ?? 0), gy = (p) => (p[1] ?? p.y ?? 0);
        const dd = (a, b) => Math.hypot(gx(a) - gx(b), gy(a) - gy(b));
        const palmo = dd(k[0], k[9]) || 1;
        const indiceEsteso = dd(k[0], k[8]) > dd(k[0], k[6]) * 1.05;
        const vicino = indiceEsteso && dd(k[4], k[12]) < palmo * (0.34 + (sens - 5) * 0.02);
        if (vicino && !snapReady) { snapReady = true; snapReadyT = now; }
        else if (!vicino && snapReady) {
          snapReady = false;
          if (now - snapReadyT < 550 && now - lastSnap > 900) { lastSnap = now; const x = gx(k[12]) / W, y = gy(k[12]) / H; FX.spawn('snap', { x, y }); T.inviaFx({ tipo: 'snap', x, y }); }
        }
      }
    } else snapReady = false;

    if (E.freeze !== false && M.length === 2 && M[0].open === 'victory' && M[1].open === 'victory') {
      if (!freezeT) freezeT = now;
      if (freezeArmato && now - freezeT > 450 && now - lastFreeze > 3000) { freezeArmato = false; lastFreeze = now; FX.congela(2.5); T.inviaFx({ tipo: 'freeze' }); }
    } else { freezeT = 0; freezeArmato = true; }

    const F = (faces || [])[0];
    const box0 = F && (F.box || F.boxRaw);
    const boxOk = Array.isArray(box0) && box0.length >= 4 && box0.slice(0, 4).every(Number.isFinite);
    if (F && boxOk) {
      const bx = box0[0], by = box0[1], bw = box0[2] || 1, bh = box0[3] || 1;
      const mesh = F.mesh || F.meshRaw || null;
      const fnum = (v) => (Number.isFinite(v) ? v : NaN);
      const pt = (idx, fx, fy) => {
        const q = mesh && mesh[idx]; let x = q ? fnum(q[0] ?? q.x) : NaN, y = q ? fnum(q[1] ?? q.y) : NaN;
        if (!Number.isFinite(x) || !Number.isFinite(y)) { x = bx + bw * fx; y = by + bh * fy; }
        return { x: x / W, y: y / H };
      };
      const occhioL = pt(159, 0.32, 0.42), occhioR = pt(386, 0.68, 0.42), bocca = pt(13, 0.50, 0.78);
      const emo = {}; (F.emotion || []).forEach((e) => { if (e && e.emotion) emo[e.emotion] = e.score || 0; });

      let boccaAperta = 0;
      if (mesh && mesh[13] && mesh[14]) boccaAperta = Math.abs((mesh[14][1] ?? mesh[14].y) - (mesh[13][1] ?? mesh[13].y)) / (bh || 1);

      if (E.laser !== false) {
        if ((emo.surprise || 0) > 0.55 - (sens - 5) * 0.03) {
          const p = { lx: occhioL.x, ly: occhioL.y, rx: occhioR.x, ry: occhioR.y };
          FX.laserOn(p); laserAcceso = true;
          if (now - lastLaser > 90) { lastLaser = now; T.inviaFx({ tipo: 'laser', ...p }); }
        } else if (laserAcceso) { FX.laserOff(); T.inviaFx({ tipo: 'laserOff' }); laserAcceso = false; }
      }

      if (E.fuoco !== false && boccaAperta > 0.12 - (sens - 5) * 0.008) {
        const p = { x: bocca.x, y: bocca.y };
        FX.fuoco(p); if (now - lastFuoco > 70) { lastFuoco = now; T.inviaFx({ tipo: 'fuoco', ...p }); }
      }

      if (E.aura !== false) {
        if ((emo.happy || 0) > 0.60 - (sens - 5) * 0.03) {
          const p = { x: (bx + bw * 0.5) / W, y: (by + bh * 0.5) / H, r: (bh * 0.62) / H };
          FX.auraOn(p); auraAccesa = true;
          if (now - lastAura > 120) { lastAura = now; T.inviaFx({ tipo: 'aura', ...p }); }
        } else if (auraAccesa) { FX.auraOff(); T.inviaFx({ tipo: 'auraOff' }); auraAccesa = false; }
      }
    } else if (laserAcceso || auraAccesa) {
      if (laserAcceso) { FX.laserOff(); T.inviaFx({ tipo: 'laserOff' }); laserAcceso = false; }
      if (auraAccesa) { FX.auraOff(); T.inviaFx({ tipo: 'auraOff' }); auraAccesa = false; }
    }

    FX.aggiornaEDisegna(ctx, W, H, now - (lastTick || now));
    lastTick = now;
  });
})();
