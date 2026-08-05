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
    // Modelli dal repo UFFICIALE di Human (set completo, incl. handlandmark-full):
    // il vecchio path su jsdelivr (@vladmandic/human-models@3) dava 403, i modelli
    // non si caricavano e warmup crashava con "reading 'inputs'".
    modelBasePath: 'https://vladmandic.github.io/human-models/models/',
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

  // ── il gioco può far ANNUNCIARE qualcosa in chat al bot (punteggi, esiti). Solo
  // testo, corto e ripulito lato server; niente immagini né video.
  const ultimoSay = { t: 0 };
  async function annuncia(testo) {
    if (!key || !testo) return;
    const now = performance.now();
    if (now - ultimoSay.t < 3000) return;   // anti-spam client (il server ha il suo)
    ultimoSay.t = now;
    try {
      await fetch(`/api/tracking/${encodeURIComponent(login)}/say?key=${encodeURIComponent(key)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testo: String(testo).slice(0, 200) }), keepalive: true,
      });
    } catch { /* rete: pazienza */ }
  }

  // ── aggancio MINIGIOCHI: la funzione registrata riceve, ad ogni frame,
  // { hands, faces, gestures, result, ctx, W, H }. Espone anche i riconoscitori
  // (gesti/emozione), l'annuncio in chat e un canale di ritorno per i comandi.
  const minigioco = { fn: null };
  const comando = { fn: null };
  window.SB_TRACKING = {
    registraMinigioco(fn) { minigioco.fn = typeof fn === 'function' ? fn : null; },
    fermaMinigioco() { minigioco.fn = null; },
    onComando(fn) { comando.fn = typeof fn === 'function' ? fn : null; },
    _comando(c) { if (comando.fn) { try { comando.fn(c); } catch { /* niente */ } } },
    notifyBot,
    annuncia,
    rilevaGesto,
    emozione: emozioneDominante,
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

  // canale di ritorno: comandi dei minigiochi (avvio da chat, sfide) via SSE. La
  // riconnessione è automatica di EventSource. Gli eventi vanno al gioco registrato.
  function connettiComandi() {
    if (!key) return;
    try {
      const es = new EventSource(`/tracking/${encodeURIComponent(login)}/stream?key=${encodeURIComponent(key)}`);
      es.onmessage = (m) => { let d; try { d = JSON.parse(m.data); } catch { return; } if (d) window.SB_TRACKING._comando(d); };
      es.onerror = () => { /* riprova da solo */ };
    } catch { /* niente */ }
  }

  // Chiede la webcam con getUserMedia DIRETTO: più affidabile in OBS della
  // scorciatoia di Human e, soprattutto, ci dà l'errore VERO da mostrare (negata,
  // occupata, assente…), così lo streamer sa cosa fare.
  async function avviaWebcam() {
    if (!location.protocol.startsWith('https') && location.hostname !== 'localhost') {
      setStato('la webcam serve una pagina sicura (https). Apri il link con https://'); return false;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStato('questo browser non espone la webcam (aggiorna OBS: serve una fonte browser recente)'); return false;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) {
      const n = (e && e.name) || '';
      if (n === 'NotAllowedError' || n === 'SecurityError') setStato('webcam NEGATA: consenti la fotocamera. In OBS apri il link una volta anche nel browser e concedi il permesso; poi ricarica la fonte.');
      else if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') setStato('webcam OCCUPATA da un\'altra fonte: NON aggiungere anche una sorgente «Dispositivo di acquisizione video» con la stessa webcam — questo overlay È già la webcam.');
      else if (n === 'NotFoundError' || n === 'OverconstrainedError') setStato('nessuna webcam trovata: collega/scegli una fotocamera.');
      else setStato('webcam non disponibile: ' + (e && e.message ? e.message : n || e));
      return false;
    }
    video.srcObject = stream;
    try { await video.play(); } catch { /* alcune fonti non richiedono play() */ }
    return true;
  }

  async function avvia() {
    if (!key) { setStato('chiave overlay mancante nel link'); return; }
    connettiComandi();
    try {
      setStato('carico i modelli…');
      await human.load();
      // warmup è solo un pre-riscaldamento: se inciampa, la prima detect scalda da
      // sé — non deve impedire l'avvio.
      try { await human.warmup(); } catch (e) { /* pazienza: scalda alla prima detect */ }
      setStato('chiedo la webcam…');
      if (!await avviaWebcam()) return;   // errore già mostrato, con la soluzione
      setStato('attivo');
      loop();
    } catch (e) {
      setStato('impossibile avviare: ' + (e && e.message ? e.message : e));
    }
  }
  avvia();
})();
