// Overlay TRACKING webcam (P6): filtri/effetti guidati da gesti delle mani ed
// espressioni del volto, resi in OBS. Gira TUTTO client-side: la webcam vive
// nel Browser Source, il server non la vede mai. Al bot mandiamo SOLO l'esito
// (un nome di gesto o l'emozione dominante), mai immagini o video.
//
// Quattro obiettivi:
//   1) filtri visivi "tra le mani" sul canvas dell'overlay;
//   2) espressioni del volto → effetti (emozione dominante → notifyBot);
//   3) gesti delle mani → effetti a schermo + notifyBot;
//   4) gesto → azione del bot (POST → Moduli QUANDO gesto=X → ALLORA …).
//
// Predisposto anche l'aggancio per MINIGIOCHI comandati dai gesti (registro
// window.SB_TRACKING.registraMinigioco), senza implementarli qui.
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const login = decodeURIComponent((location.pathname.split('/').filter(Boolean).pop() || '')).toLowerCase();
  const key = params.get('key') || '';
  const video = document.getElementById('cam');
  const fx = document.getElementById('fx');
  const ctx = fx.getContext('2d');
  const statoEl = document.getElementById('stato');
  const setStato = (t) => { if (statoEl) statoEl.textContent = 'SocialBot tracking · ' + t; };

  if (typeof Human === 'undefined') { setStato('libreria non caricata'); return; }
  const HumanClass = Human.Human || Human.default || Human;

  // Solo i modelli che servono: volto (mesh+iris+emozioni), mani e gesti.
  // Corpo, oggetti, segmentazione, descrizione (età/genere) SPENTI per stare
  // leggeri in OBS.
  const human = new HumanClass({
    backend: 'webgl',
    modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human-models@3/models/',
    cacheModels: true,
    filter: { enabled: false },
    face: {
      enabled: true,
      detector: { rotation: false, maxDetected: 1, return: false },
      mesh: { enabled: true },
      iris: { enabled: true },
      emotion: { enabled: true },
      description: { enabled: false },
      antispoof: { enabled: false },
      liveness: { enabled: false },
    },
    hand: { enabled: true, maxDetected: 2, landmarks: true },
    gesture: { enabled: true },
    body: { enabled: false },
    object: { enabled: false },
    segmentation: { enabled: false },
  });

  // ── notifica al bot (anti-spam client; il server ha comunque il suo cooldown)
  const ultimo = new Map();
  const COOLDOWN = 4000;
  async function notifyBot(gesto, emozione) {
    const k = gesto || emozione;
    if (!k || !key) return;
    const now = performance.now();
    if (now - (ultimo.get(k) || 0) < COOLDOWN) return;
    ultimo.set(k, now);
    try {
      await fetch(`/api/tracking/${encodeURIComponent(login)}/gesture?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gesto, emozione }),
        keepalive: true,
      });
    } catch { /* rete: pazienza, riproverà al prossimo gesto */ }
  }

  // ── aggancio MINIGIOCHI (per il futuro): una funzione registrata riceve, ad
  // ogni frame, { hands, faces, gestures, result, ctx, W, H }. Non implementiamo
  // giochi ora: qui c'è solo il punto d'innesto, chiaro e stabile.
  const minigioco = { fn: null };
  window.SB_TRACKING = {
    registraMinigioco(fn) { minigioco.fn = typeof fn === 'function' ? fn : null; },
    fermaMinigioco() { minigioco.fn = null; },
    notifyBot,
    get human() { return human; },
  };

  // centro di una mano (media dei keypoint; fallback: centro del box)
  function centroMano(h) {
    const kp = h.keypoints || h.landmarks;
    if (Array.isArray(kp) && kp.length) {
      let x = 0, y = 0;
      for (const p of kp) { x += (p[0] ?? p.x ?? 0); y += (p[1] ?? p.y ?? 0); }
      return { x: x / kp.length, y: y / kp.length };
    }
    const b = h.box || [0, 0, 0, 0];
    return { x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 };
  }

  // ── effetto "tra le mani": arco di energia + sfera pulsante + particelle
  const particelle = [];
  function effettoTraLeMani(a, b, t) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    ctx.save();
    ctx.lineCap = 'round';
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, 'rgba(139,92,246,0)');
    grad.addColorStop(0.5, `rgba(34,211,238,${0.55 + 0.3 * Math.sin(t / 120)})`);
    grad.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 12 + 6 * Math.sin(t / 90);
    ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 34;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    const r = Math.max(16, dist * 0.11) * (1 + 0.16 * Math.sin(t / 70));
    const rg = ctx.createRadialGradient(mx, my, 0, mx, my, r);
    rg.addColorStop(0, 'rgba(255,255,255,.95)');
    rg.addColorStop(0.4, 'rgba(34,211,238,.7)');
    rg.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (particelle.length < 140) {
      const ang = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 2.2;
      particelle.push({ x: mx, y: my, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, vita: 1 });
    }
  }
  function disegnaParticelle() {
    for (let i = particelle.length - 1; i >= 0; i--) {
      const p = particelle[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.vita -= 0.022;
      if (p.vita <= 0) { particelle.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(34,211,238,${p.vita})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2 * p.vita, 0, Math.PI * 2); ctx.fill();
    }
  }
  // alone attorno a una singola mano (quando ce n'è una sola)
  function aloneMano(a, t) {
    const r = 60 + 12 * Math.sin(t / 90);
    const rg = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, r);
    rg.addColorStop(0, 'rgba(139,92,246,.5)');
    rg.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, Math.PI * 2); ctx.fill();
  }

  function emozioneDominante(face) {
    const e = face && face.emotion;
    if (!Array.isArray(e) || !e.length) return '';
    const top = e.slice().sort((x, y) => (y.score || 0) - (x.score || 0))[0];
    return (top && top.score > 0.55) ? String(top.emotion || '').toLowerCase() : '';
  }

  // riconosce i gesti "utili" dalla stringa di Human → nome stabile per il bot
  // (resta come RIPIEGO: la stringa di Human cambia tra versioni ed è inaffidabile)
  function nomeGesto(str) {
    const s = String(str || '').toLowerCase();
    if (s.includes('victory')) return 'victory';
    if (s.includes('thumb up')) return 'thumbup';
    if (s.includes('open palm') || s === 'open') return 'openpalm';
    if (s.includes('point') || s.includes('index')) return 'point';
    if (s.includes('fist')) return 'fist';
    return '';
  }

  // ── riconoscimento gesti dai LANDMARK (21 keypoint della mano). È il metodo
  // PRINCIPALE: deterministico e indipendente dalle stringhe di Human. Un dito è
  // "esteso" se la sua punta è più lontana dal polso della sua nocca centrale (pip).
  const _xy = (p) => [(p && (p[0] ?? p.x)) || 0, (p && (p[1] ?? p.y)) || 0];
  const _dist = (a, b) => { const A = _xy(a), B = _xy(b); return Math.hypot(A[0] - B[0], A[1] - B[1]); };
  function rilevaGesto(h) {
    const k = h.keypoints || h.landmarks;
    if (!Array.isArray(k) || k.length < 21) return '';
    const w = k[0];
    const esteso = (tip, pip) => _dist(w, k[tip]) > _dist(w, k[pip]) * 1.12;
    const idx = esteso(8, 6), mid = esteso(12, 10), ring = esteso(16, 14), pinky = esteso(20, 18);
    const manoSize = _dist(w, k[9]) || 1;
    // pollice esteso: punta lontana dalla nocca dell'indice e oltre la sua base
    const thumb = _dist(k[4], k[5]) > manoSize * 0.6 && _dist(w, k[4]) > _dist(w, k[2]) * 1.02;
    const nEst = (idx ? 1 : 0) + (mid ? 1 : 0) + (ring ? 1 : 0) + (pinky ? 1 : 0);
    if (nEst >= 4) return 'openpalm';
    if (idx && mid && !ring && !pinky) return 'victory';
    if (idx && !mid && !ring && !pinky) return 'point';
    if (thumb && nEst === 0) return 'thumbup';
    if (nEst === 0 && !thumb) return 'fist';
    return '';
  }

  async function loop() {
    try {
      await human.detect(video);
      const result = human.next(human.result) || human.result || {};
      const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
      if (fx.width !== vw || fx.height !== vh) { fx.width = vw; fx.height = vh; }
      const W = fx.width, H = fx.height, t = performance.now();
      ctx.clearRect(0, 0, W, H);

      const hands = result.hand || [];
      const faces = result.face || [];
      const gestures = result.gesture || [];

      // (1)(3) filtro tra le mani / alone sulla singola mano
      if (hands.length >= 2) {
        effettoTraLeMani(centroMano(hands[0]), centroMano(hands[1]), t);
      } else if (hands.length === 1) {
        aloneMano(centroMano(hands[0]), t);
      }
      disegnaParticelle();

      // (3)(4) gesti delle mani → notifyBot. Prima dai landmark (affidabile),
      // poi come ripiego dalle stringhe di Human.
      const gestiVisti = new Set();
      for (const h of hands) { const nome = rilevaGesto(h); if (nome) { gestiVisti.add(nome); notifyBot(nome); } }
      for (const g of gestures) {
        if (!('hand' in g)) continue;
        const nome = nomeGesto(g.gesture);
        if (nome && !gestiVisti.has(nome)) notifyBot(nome);
      }
      // (2) espressione dominante del volto → notifyBot
      const emo = emozioneDominante(faces[0]);
      if (emo) notifyBot('', emo);

      // aggancio minigiochi (se registrato)
      if (minigioco.fn) { try { minigioco.fn({ hands, faces, gestures, result, ctx, W, H }); } catch { /* niente */ } }

      if (!document.body.classList.contains('pronto')) document.body.classList.add('pronto');
    } catch (e) {
      setStato('errore: ' + (e && e.message ? e.message : e));
    }
    requestAnimationFrame(loop);
  }

  async function avvia() {
    if (!key) { setStato('chiave overlay mancante nel link'); return; }
    try {
      setStato('carico i modelli…');
      await human.load();
      await human.warmup();
      setStato('avvio webcam…');
      await human.webcam.start({ element: video, crop: false });
      if (!video.srcObject && human.webcam && human.webcam.stream) video.srcObject = human.webcam.stream;
      setStato('attivo');
      loop();
    } catch (e) {
      setStato('impossibile avviare: ' + (e && e.message ? e.message : e));
    }
  }
  avvia();
})();
