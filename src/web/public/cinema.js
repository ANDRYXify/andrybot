// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// cinema.js — il MOTORE CINEMATOGRAFICO dell'estetica anime. Tutto entra in scena:
//   • sfondo vivo (aurora + griglia) e particelle d'energia leggere;
//   • ingressi sfalsati (reveal on-scroll) su carte, blocchi, righe;
//   • cambio-scheda come una "title card": sweep diagonale + speed-line.
// Osserva il DOM (MutationObserver): funziona con la SPA esistente SENZA toccarne il router.
// Rispetta prefers-reduced-motion e la classe .meno-moto. Zero dipendenze.
(function () {
  'use strict';
  var menoMoto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ── I "MULI DA SOMA": device vecchi/deboli → modalità LEGGERA (niente canvas, niente blur,
  //    niente aurora animata; solo semplici dissolvenze). Rilevata all'avvio E a runtime (se
  //    gli fps crollano, degrada da solo). Onesto: la bellezza non deve impallare chi ha poco. ─
  function deboleDevice() {
    try {
      if (localStorage.getItem('sb-leggero') === '1') return true;
      if (localStorage.getItem('sb-leggero') === '0') return false;
    } catch (e) { /* niente */ }
    var n = navigator || {};
    var c = n.connection || n.mozConnection || n.webkitConnection || {};
    if (c.saveData) return true;                                   // l'utente ha chiesto "risparmia dati"
    if (/(^|\s)(slow-2g|2g|3g)$/.test(c.effectiveType || '')) return true;
    if (typeof n.deviceMemory === 'number' && n.deviceMemory > 0 && n.deviceMemory <= 4) return true;
    if (typeof n.hardwareConcurrency === 'number' && n.hardwareConcurrency > 0 && n.hardwareConcurrency <= 2) return true;
    return false;
  }
  var leggero = deboleDevice();

  function passaLeggero(salva) {
    if (leggero) return;
    leggero = true;
    document.body.classList.add('leggero');
    var cv = document.getElementById('anime-canvas'); if (cv) cv.remove();
    if (salva) { try { localStorage.setItem('sb-leggero', '1'); } catch (e) { /* niente */ } }
  }
  // API pubblica per un interruttore nel cruscotto (l'utente può forzare leggero/ricco)
  window.SB_LEGGERO = {
    stato: function () { return leggero; },
    imposta: function (v) { try { localStorage.setItem('sb-leggero', v ? '1' : '0'); } catch (e) {} location.reload(); }
  };

  // ── scenografia: sfondo, canvas particelle, sweep, speed-line ────────────────────────
  function elem(id, tag) {
    var e = document.getElementById(id);
    if (!e) { e = document.createElement(tag || 'div'); e.id = id; document.body.appendChild(e); }
    return e;
  }
  function scenografia() {
    if (leggero) document.body.classList.add('leggero');
    elem('anime-sfondo');
    elem('anime-sweep');
    elem('anime-speed');
    if (!menoMoto && !leggero) particelle(elem('anime-canvas', 'canvas'));
  }

  // ── particelle d'energia (motes che salgono, leggere, in pausa se la scheda è nascosta) ─
  function particelle(cv) {
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    var colori = ['#38e8ff', '#7c5cff', '#ff62d9', '#b6ff5c'];
    var N = 0, p = [], raf = 0, vivo = true;
    // WATCHDOG fps: se il device arranca (frame lenti a raffica), degrada da solo a LEGGERO.
    var tPrec = 0, lenti = 0, campioni = 0;
    function dim() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      N = Math.max(18, Math.min(46, Math.round(W * H / 46000)));
      p = []; for (var i = 0; i < N; i++) p.push(nuova(true));
    }
    function nuova(sparsa) {
      return { x: Math.random() * W, y: sparsa ? Math.random() * H : H + 10,
        r: 0.8 + Math.random() * 2.4, v: 0.15 + Math.random() * 0.5,
        sway: 0.3 + Math.random() * 0.9, fase: Math.random() * 6.28,
        c: colori[(Math.random() * colori.length) | 0], a: 0.15 + Math.random() * 0.4 };
    }
    function passo(t) {
      if (!vivo) return;
      // watchdog: nei primi ~120 frame misura la fluidità; troppi frame lenti → degrada.
      if (tPrec && campioni < 120) {
        var dt = t - tPrec; campioni++;
        if (dt > 34) lenti++;                       // < ~30 fps
        if (campioni >= 40 && lenti > campioni * 0.5) { cancelAnimationFrame(raf); passaLeggero(true); return; }
      }
      tPrec = t;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < p.length; i++) {
        var q = p[i];
        q.y -= q.v; q.fase += 0.01;
        var x = q.x + Math.sin(q.fase) * q.sway * 8;
        if (q.y < -12) p[i] = nuova(false);
        ctx.beginPath(); ctx.arc(x, q.y, q.r, 0, 6.2832);
        ctx.fillStyle = q.c; ctx.globalAlpha = q.a; ctx.shadowColor = q.c; ctx.shadowBlur = 10;
        ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      raf = requestAnimationFrame(passo);
    }
    dim();
    window.addEventListener('resize', dim, { passive: true });
    document.addEventListener('visibilitychange', function () {
      vivo = !document.hidden; if (vivo) { cancelAnimationFrame(raf); raf = requestAnimationFrame(passo); }
    });
    raf = requestAnimationFrame(passo);
  }

  // ── INGRESSO in scena: marca gli elementi con [data-anime]. L'animazione è PURA CSS (fill both,
  //    fotogramma finale opacity:1) → il contenuto si rivela SEMPRE da solo, nessuna dipendenza dal
  //    JS per tornare visibile. Se qualcosa qui fallisce, la pagina resta comunque piena e usabile.
  var SELETTORI = '.blocco, .carta, .pannello, .riquadro-info, .card, .mini-guida, .cap-scheda';
  function marca(scope) {
    if (menoMoto) return;
    try {
      var root = scope || document;
      var nodi = root.querySelectorAll(SELETTORI);
      var n = 0;
      for (var i = 0; i < nodi.length; i++) {
        var el = nodi[i];
        if (el.hasAttribute('data-anime') || el.closest('#cerca-overlay')) continue;
        el.setAttribute('data-anime', n % 5 === 4 ? 'wipe' : 'rise');
        el.style.setProperty('--an-ritardo', Math.min(n, 8) * 55 + 'ms');
        n++;
      }
    } catch (e) { /* l'estetica non deve MAI rompere l'app */ }
  }

  // ── CAMBIO SCHEDA = title card: sweep + speed-line + il contenuto che ri-entra ───────────
  var ultimoSweep = 0;
  function titleCard(pannello) {
    try {
      var ora = Date.now();
      if (!menoMoto && !leggero && ora - ultimoSweep > 350) {
        ultimoSweep = ora;
        lampo('anime-sweep'); lampo('anime-speed');
      }
      if (pannello && !menoMoto) {
        pannello.classList.remove('an-entra'); void pannello.offsetWidth; pannello.classList.add('an-entra');
        // ri-avvia l'ingresso sfalsato: togli e rimetti data-anime → l'animazione CSS riparte.
        pannello.querySelectorAll('[data-anime]').forEach(function (e) { e.removeAttribute('data-anime'); });
        marca(pannello);
      }
    } catch (e) { /* mai rompere la navigazione */ }
  }
  function lampo(id) {
    var e = document.getElementById(id); if (!e) return;
    e.classList.remove('va'); void e.offsetWidth; e.classList.add('va');
  }

  // ── osserva la SPA: contenuto nuovo → marcalo; scheda che diventa "visibile" → title card ─
  function osserva() {
    var app = document.getElementById('app') || document.body;
    var pendente = null;
    var mo = new MutationObserver(function (muts) {
      try {
        var nuovoContenuto = false, schedaEntrata = null;
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'attributes' && m.target.classList && m.target.classList.contains('pannello-scheda')) {
            if (m.target.classList.contains('visibile')) schedaEntrata = m.target;
          }
          if (m.addedNodes && m.addedNodes.length) nuovoContenuto = true;
        }
        if (schedaEntrata) titleCard(schedaEntrata);
        if (nuovoContenuto) { clearTimeout(pendente); pendente = setTimeout(function () { marca(document); }, 60); }
      } catch (e) { /* mai rompere l'app */ }
    });
    mo.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    // primo giro
    marca(document);
    var vis = document.querySelector('.pannello-scheda.visibile');
    if (vis) titleCard(vis);
  }

  // hashchange come rete di sicurezza (se il router cambia scheda senza toccare le classi subito)
  window.addEventListener('hashchange', function () {
    var vis = document.querySelector('.pannello-scheda.visibile'); if (vis) titleCard(vis);
  });

  function avvia() {
    scenografia();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', osserva);
    else osserva();
  }
  avvia();

  window.SB_CINEMA = { marca: marca, titleCard: titleCard };
})();
