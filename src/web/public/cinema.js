// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// cinema.js — l'atmosfera dell'estetica anime, in versione BLINDATA. Regola d'oro: NON deve MAI
// toccare la navigazione dell'app. Perciò NON osserva il DOM e NON manipola le schede al cambio
// pagina (era la causa del crash). Fa solo cose "a lato", su elementi propri:
//   • sfondo vivo (aurora + griglia) e particelle d'energia leggere;
//   • un ingresso morbido UNA VOLTA, al caricamento (opacity fade puro-CSS, fail-safe).
// Rispetta prefers-reduced-motion, la classe .meno-moto e la modalità LEGGERA (device deboli).
(function () {
  'use strict';
  try {
    var menoMoto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // ── "MULI DA SOMA": device vecchi/deboli → modalità LEGGERA (niente canvas/blur/aurora) ──
    function deboleDevice() {
      try {
        if (localStorage.getItem('sb-leggero') === '1') return true;
        if (localStorage.getItem('sb-leggero') === '0') return false;
      } catch (e) { /* niente */ }
      var n = navigator || {};
      var c = n.connection || n.mozConnection || n.webkitConnection || {};
      if (c.saveData) return true;
      if (/(^|\s)(slow-2g|2g|3g)$/.test(c.effectiveType || '')) return true;
      if (typeof n.deviceMemory === 'number' && n.deviceMemory > 0 && n.deviceMemory <= 4) return true;
      if (typeof n.hardwareConcurrency === 'number' && n.hardwareConcurrency > 0 && n.hardwareConcurrency <= 2) return true;
      return false;
    }
    var leggero = deboleDevice();
    function passaLeggero(salva) {
      if (leggero) return;
      leggero = true;
      try { document.body.classList.add('leggero'); } catch (e) {}
      var cv = document.getElementById('anime-canvas'); if (cv) cv.remove();
      if (salva) { try { localStorage.setItem('sb-leggero', '1'); } catch (e) {} }
    }
    window.SB_LEGGERO = {
      stato: function () { return leggero; },
      imposta: function (v) { try { localStorage.setItem('sb-leggero', v ? '1' : '0'); } catch (e) {} location.reload(); }
    };

    function elem(id, tag) {
      var e = document.getElementById(id);
      if (!e) { e = document.createElement(tag || 'div'); e.id = id; document.body.appendChild(e); }
      return e;
    }

    // ── particelle d'energia (in pausa quando la scheda è nascosta) ──────────────────────
    function particelle(cv) {
      var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
      // polvere di brace: oro, vermiglio, crema calda — RADA e sottile (restraint / ma), non energia neon
      var colori = ['#c39a4a', '#e24a2f', '#e8dcc4'];
      var p = [], raf = 0, vivo = true, tPrec = 0, lenti = 0, campioni = 0;
      function dim() {
        W = window.innerWidth; H = window.innerHeight;
        cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var N = Math.max(10, Math.min(28, Math.round(W * H / 70000)));   // rade: il vuoto respira
        p = []; for (var i = 0; i < N; i++) p.push(nuova(true));
      }
      function nuova(sparsa) {
        return { x: Math.random() * W, y: sparsa ? Math.random() * H : H + 10,
          r: 0.7 + Math.random() * 1.8, v: 0.08 + Math.random() * 0.28,   // salgono piano
          sway: 0.25 + Math.random() * 0.7, fase: Math.random() * 6.28,
          c: colori[(Math.random() * colori.length) | 0], a: 0.08 + Math.random() * 0.24 };
      }
      function passo(t) {
        if (!vivo) return;
        if (tPrec && campioni < 120) { var dt = t - tPrec; campioni++; if (dt > 34) lenti++;
          if (campioni >= 40 && lenti > campioni * 0.5) { cancelAnimationFrame(raf); passaLeggero(true); return; } }
        tPrec = t;
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < p.length; i++) {
          var q = p[i]; q.y -= q.v; q.fase += 0.01;
          var x = q.x + Math.sin(q.fase) * q.sway * 8;
          if (q.y < -12) p[i] = nuova(false);
          ctx.beginPath(); ctx.arc(x, q.y, q.r, 0, 6.2832);
          ctx.fillStyle = q.c; ctx.globalAlpha = q.a; ctx.shadowColor = q.c; ctx.shadowBlur = 10; ctx.fill();
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

    function scenografia() {
      if (leggero) { try { document.body.classList.add('leggero'); } catch (e) {} }
      elem('anime-sfondo');
      if (!menoMoto && !leggero) { try { particelle(elem('anime-canvas', 'canvas')); } catch (e) {} }
    }

    // ── ingresso morbido UNA SOLA VOLTA, al caricamento. Marca gli elementi visibili: l'animazione
    //    è pura CSS (fill both → finisce a opacity:1). NON tocca mai la navigazione: nessun observer,
    //    nessuna manipolazione al cambio scheda. Se qualcosa va storto, la pagina resta piena. ──
    function ingressoUnaVolta() {
      if (menoMoto) return;
      try {
        var vis = document.querySelector('.pannello-scheda.visibile') || document;
        var nodi = vis.querySelectorAll('.blocco, .carta, .pannello, .riquadro-info, .card, .mini-guida');
        for (var i = 0; i < nodi.length && i < 40; i++) {
          if (nodi[i].closest('#cerca-overlay')) continue;
          nodi[i].setAttribute('data-anime', 'rise');
          nodi[i].style.setProperty('--an-ritardo', Math.min(i, 8) * 50 + 'ms');
        }
      } catch (e) { /* mai rompere nulla */ }
    }

    function avvia() {
      scenografia();
      // l'ingresso una-tantum quando il primo contenuto è lì (piccolo ritardo, senza osservare nulla)
      setTimeout(ingressoUnaVolta, 400);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
    else avvia();
  } catch (e) { /* l'estetica non deve MAI impedire al sito di funzionare */ }
})();
