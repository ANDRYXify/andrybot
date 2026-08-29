// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const login = decodeURIComponent((location.pathname.split('/').filter(Boolean).pop() || '')).toLowerCase();
  const key = params.get('key') || '';
  const fx = document.getElementById('fx');
  const ctx = fx.getContext('2d');
  const statoEl = document.getElementById('stato');
  const setStato = (t) => { if (statoEl) statoEl.textContent = 'SocialBot giochi · ' + t; };

  let gameFn = null, cmdFn = null;
  let lastGesto = '', lastEmo = '';

  const manoTarget = [null, null], manoSmooth = [null, null];

  const MEME_DEFAULT = { happy: '😂', surprise: '😱', angry: '🤬', sad: '😭', fear: '😨', disgust: '🤢' };
  let memeMap = {}, memeOn = true, memeSuono = true, memeBox = null, memeLast = 0, _memeAC = null;
  const memeCd = {};
  function memePop() {
    if (!memeSuono) return;
    try { _memeAC = _memeAC || new (window.AudioContext || window.webkitAudioContext)(); const o = _memeAC.createOscillator(), g = _memeAC.createGain(), t = _memeAC.currentTime; o.type = 'triangle'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(880, t + 0.12); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(g); g.connect(_memeAC.destination); o.start(t); o.stop(t + 0.28); } catch {  }
  }
  function mostraMeme(emo) {
    if (!memeOn || !emo) return;
    const map = Object.keys(memeMap).length ? memeMap : MEME_DEFAULT;
    const val = map[emo]; if (!val) return;
    const now = performance.now();
    if (now - (memeCd[emo] || 0) < 4500 || now - memeLast < 1000) return;
    memeCd[emo] = now; memeLast = now;
    if (!memeBox) { memeBox = document.createElement('div'); memeBox.id = 'meme'; document.body.appendChild(memeBox); }
    const url = /^(https?:|\/|data:)/.test(val);
    const el = document.createElement(url ? 'img' : 'div');
    if (url) { el.className = 'meme-img'; el.referrerPolicy = 'no-referrer'; el.onerror = () => { if (el.parentNode) el.remove(); }; el.src = val; }
    else { el.className = 'meme-emoji'; el.textContent = val; }
    memeBox.innerHTML = ''; memeBox.appendChild(el);
    el.style.animation = 'memeIn .5s cubic-bezier(.2,1.3,.4,1) both';
    memePop();
    setTimeout(() => { el.style.animation = 'memeOut .4s ease-in forwards'; setTimeout(() => { if (el.parentNode) el.remove(); }, 420); }, 2600);
  }

  const ultimoSay = { t: 0 };
  async function annuncia(testo) {
    if (!key || !testo) return;
    const now = performance.now();
    if (now - ultimoSay.t < 3000) return;
    ultimoSay.t = now;
    try {
      await fetch(`/api/tracking/${encodeURIComponent(login)}/say?key=${encodeURIComponent(key)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testo: String(testo).slice(0, 200) }), keepalive: true,
      });
    } catch {  }
  }

  window.SB_TRACKING = {
    registraMinigioco(fn) { gameFn = typeof fn === 'function' ? fn : null; },
    fermaMinigioco() { gameFn = null; },
    onComando(fn) { cmdFn = typeof fn === 'function' ? fn : null; },
    _comando(c) { if (cmdFn) { try { cmdFn(c); } catch {  } } },
    annuncia,
    rilevaGesto(h) { return (h && h.g) || ''; },
    emozione(f) { return (f && f.emo) || ''; },
  };

  function applicaFx(d) {
    const FX = window.SB_FX; if (!FX) return;
    const t = d.tipo;
    if (t === 'fireball' || t === 'fulmine' || t === 'snap' || t === 'onda') FX.spawn(t, d);
    else if (t === 'carica') FX.caricaSu(d);
    else if (t === 'caricaGiu') FX.caricaGiu();
    else if (t === 'spara') FX.spara(d);
    else if (t === 'mano') { const i = d.i === 1 ? 1 : 0; manoTarget[i] = { x: d.x, y: d.y, t: performance.now() }; }
    else if (t === 'combo') FX.combo();
    else if (t === 'laser') FX.laserOn(d);
    else if (t === 'laserOff') FX.laserOff();
    else if (t === 'fuoco') FX.fuoco(d);
    else if (t === 'aura') FX.auraOn(d);
    else if (t === 'auraOff') FX.auraOff();
    else if (t === 'mirino') FX.mirinoOn(d);
    else if (t === 'mirinoGiu') FX.mirinoGiu();
    else if (t === 'scatto') FX.scatto(d);
    else if (t === 'freeze') FX.congela(2.5);
    else if (t === 'puntatore') window.SB_PUNTATORE = { x: d.x, y: d.y, giu: d.liv > 0.5, t: performance.now() };
  }

  function connetti() {
    if (!key) { setStato('chiave mancante nel link'); return; }
    try {
      const es = new EventSource(`/tracking/${encodeURIComponent(login)}/stream?key=${encodeURIComponent(key)}`);
      es.onopen = () => setStato('collegato — pronto');
      es.onmessage = (m) => {
        let d; try { d = JSON.parse(m.data); } catch { return; }
        if (!d) return;
        document.body.classList.add('pronto');
        if (d.azione === 'stato') { lastGesto = d.gesto || ''; lastEmo = d.emozione || ''; mostraMeme(d.emozione); }
        else if (d.azione === 'fx') applicaFx(d);
        else if (cmdFn) { try { cmdFn(d); } catch {  } }
      };
      es.onerror = () => {  };
    } catch { setStato('impossibile collegarsi'); }
  }

  function ridimensiona() { fx.width = window.innerWidth || 1280; fx.height = window.innerHeight || 720; }
  window.addEventListener('resize', ridimensiona);
  ridimensiona();

  function emettiTrail(now) {
    const FX = window.SB_FX; if (!FX) return;
    for (let i = 0; i < 2; i++) {
      const tg = manoTarget[i];
      if (tg && now - tg.t < 250) {
        if (!manoSmooth[i]) manoSmooth[i] = { x: tg.x, y: tg.y };
        manoSmooth[i].x += (tg.x - manoSmooth[i].x) * 0.4;
        manoSmooth[i].y += (tg.y - manoSmooth[i].y) * 0.4;
        FX.mano(i, manoSmooth[i].x, manoSmooth[i].y);
      } else manoSmooth[i] = null;
    }
  }
  let _lastTick = 0;
  function loop() {
    const W = fx.width, H = fx.height;
    ctx.clearRect(0, 0, W, H);
    const now = performance.now(), dt = now - (_lastTick || now); _lastTick = now;
    emettiTrail(now);

    if (window.SB_FX) { try { window.SB_FX.aggiornaEDisegna(ctx, W, H, dt); } catch {  } }
    if (gameFn) { try { gameFn({ hands: lastGesto ? [{ g: lastGesto }] : [], faces: lastEmo ? [{ emo: lastEmo }] : [], ctx, W, H }); } catch {  } }
    requestAnimationFrame(loop);
  }

  function applicaOpzioni(o) {
    const ef = (o && o.effetti) || {}, FX = window.SB_FX;
    if (FX) {
      FX.specchia(params.get('flip') != null ? params.get('flip') !== '0' : ef.specchio !== false);
      FX.suoni(ef.suoni !== false); FX.abilitaCombo(ef.combo !== false);
    }
    window.SB_GIOCHI_MASTER = !o || o.giochi !== false;
    window.SB_GIOCHI_ATTIVI = (o && o.giochiSel) || {};
    window.SB_SPECCHIO = params.get('flip') != null ? params.get('flip') !== '0' : ef.specchio !== false;
    window.SB_PUZZLE_ON = ef.puzzle === true;
    memeMap = (o && o.mappaMeme) || {}; memeOn = ef.meme !== false; memeSuono = ef.suoni !== false;
  }
  async function opzioni() {
    try { const r = await fetch(`/api/tracking/${encodeURIComponent(login)}/opzioni?key=${encodeURIComponent(key)}`); if (r.ok) applicaOpzioni(await r.json()); }
    catch {  }
  }

  const caricaScript = (src) => new Promise((res) => { const s = document.createElement('script'); s.src = src; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });
  window.SB_FX_ZINDEX = 0;
  (async () => {
    await caricaScript('/vendor/pixi.min.js');
    await caricaScript('/vendor/pixi-filters.min.js');
    await caricaScript('/tracking-fx-gl.js');
    if (!window.SB_FX) await caricaScript('/tracking-fx.js');
    if (window.SB_FX) window.SB_FX.specchia(params.get('flip') !== '0');
    await caricaScript('/tracking-games.js');
    await opzioni(); connetti(); loop();
  })();
})();
