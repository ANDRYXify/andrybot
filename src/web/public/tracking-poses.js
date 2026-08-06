// Riconoscimento POSE per gli effetti cinematici (P6, Fase 1). Gira nel RILEVATORE
// (Chrome): legge i landmark di Human ad ogni frame, riconosce le pose a due mani
// e fa partire gli effetti — sia in ANTEPRIMA locale (SB_FX) sia, via il canale
// tracking, sull'overlay in OBS (SB_TRACKING.inviaFx). Nessuna immagine esce: solo
// nomi e coordinate normalizzate.
//
// Fase 1: Kamehameha (mani unite = carica → mani lontane = raggio), Fireball
// (pugno→apertura), Fulmini (due mani aperte e lontane), Trail delle mani.
(() => {
  'use strict';
  const T = window.SB_TRACKING, FX = window.SB_FX;
  if (!T || !FX || !T.registraMinigioco) return;
  FX.specchia(false);   // anteprima locale: il video del rilevatore NON è specchiato

  const centro = (h) => {
    const kp = h.keypoints || h.landmarks;
    if (Array.isArray(kp) && kp.length) { let x = 0, y = 0; for (const p of kp) { x += (p[0] ?? p.x ?? 0); y += (p[1] ?? p.y ?? 0); } return { x: x / kp.length, y: y / kp.length }; }
    const b = h.box || [0, 0, 0, 0]; return { x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 };
  };

  let charge = null;               // { t0, liv }
  let firedKame = false;
  const prevOpen = [null, null];   // stato apertura per mano (fireball: fist→open)
  const manoInviata = [null, null];// ultima posizione inviata (per non spammare)
  let lastMano = 0, lastCarica = 0, lastFulmine = 0, lastTick = 0;

  T.registraMinigioco(({ hands, ctx, W, H }) => {
    const now = performance.now();
    const E = (window.SB_OPZIONI && window.SB_OPZIONI.effetti) || {};
    if (E.attivo === false) { lastTick = now; return; }   // effetti spenti dal pannello
    FX.suoni(E.suoni !== false); FX.abilitaCombo(E.combo !== false);
    // sensibilità 1..10 → soglie (più alta = pose più facili da attivare)
    const sens = Number(E.sensibilita) || 5;
    const chargeMax = 0.16 + (sens - 5) * 0.008;   // mani "unite": finestra più larga
    const fulmineMin = 0.38 - (sens - 5) * 0.012;  // mani "lontane": basta meno distanza
    firedKame = false;
    const M = (hands || []).slice(0, 2).map((h) => { const c = centro(h); return { nx: c.x / W, ny: c.y / H, open: T.rilevaGesto ? T.rilevaGesto(h) : '' }; });

    // TRAIL — anteprima locale fluida; all'overlay solo se la mano si MUOVE (~12fps)
    if (E.trail !== false) {
      M.forEach((m, i) => FX.mano(i, m.nx, m.ny));
      if (now - lastMano > 80) {
        lastMano = now;
        M.forEach((m, i) => { const l = manoInviata[i]; if (!l || Math.hypot(m.nx - l.x, m.ny - l.y) > 0.012) { manoInviata[i] = { x: m.nx, y: m.ny }; T.inviaFx({ tipo: 'mano', i, x: m.nx, y: m.ny }); } });
      }
    }

    if (M.length === 2) {
      const dist = Math.hypot(M[0].nx - M[1].nx, M[0].ny - M[1].ny);
      const midx = (M[0].nx + M[1].nx) / 2, midy = (M[0].ny + M[1].ny) / 2;
      if (E.kamehameha !== false) {
        if (dist < chargeMax) {                       // mani unite = carica
          if (!charge) charge = { t0: now };
          charge.liv = Math.min(1, (now - charge.t0) / 1800);
          FX.caricaSu({ x: midx, y: midy, liv: charge.liv });
          if (now - lastCarica > 90) { lastCarica = now; T.inviaFx({ tipo: 'carica', x: midx, y: midy, liv: charge.liv }); }
        } else if (charge && dist > 0.30) {           // rilascio = raggio
          if (charge.liv > 0.22) {
            const ang = Math.atan2(midy - 0.5, midx - 0.5);
            const p = { x: midx, y: midy, dx: Math.cos(ang), dy: Math.sin(ang), forza: charge.liv };
            FX.spara(p); T.inviaFx({ tipo: 'spara', ...p }); firedKame = true;
          } else { FX.caricaGiu(); T.inviaFx({ tipo: 'caricaGiu' }); }
          charge = null;
        }
      } else if (charge) { FX.caricaGiu(); T.inviaFx({ tipo: 'caricaGiu' }); charge = null; }
      // FULMINI — due mani aperte e lontane
      if (E.fulmini !== false && !charge && M[0].open === 'openpalm' && M[1].open === 'openpalm' && dist > fulmineMin && now - lastFulmine > 120) {
        lastFulmine = now;
        const p = { ax: M[0].nx, ay: M[0].ny, bx: M[1].nx, by: M[1].ny };
        FX.spawn('fulmine', p); T.inviaFx({ tipo: 'fulmine', ...p });
      }
    } else if (charge) { FX.caricaGiu(); T.inviaFx({ tipo: 'caricaGiu' }); charge = null; }

    // FIREBALL — pugno→apertura di una mano (non durante il kamehameha)
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

    // ANTEPRIMA locale (nel rilevatore): disegna gli stessi effetti sopra il video
    FX.aggiornaEDisegna(ctx, W, H, now - (lastTick || now));
    lastTick = now;
  });
})();
