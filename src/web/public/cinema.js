// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  try {
    var menoMoto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function debole() {
      try {
        if (localStorage.getItem('sb-leggero') === '1') return true;
        if (localStorage.getItem('sb-leggero') === '0') return false;
      } catch (e) {  }
      var n = navigator || {}, c = n.connection || n.mozConnection || n.webkitConnection || {};
      if (c.saveData) return true;
      if (/(^|\s)(slow-2g|2g|3g)$/.test(c.effectiveType || '')) return true;
      if (typeof n.deviceMemory === 'number' && n.deviceMemory > 0 && n.deviceMemory <= 4) return true;
      if (typeof n.hardwareConcurrency === 'number' && n.hardwareConcurrency > 0 && n.hardwareConcurrency <= 2) return true;
      return false;
    }
    var leggero = debole();
    window.SB_LEGGERO = {
      stato: function () { return leggero; },
      imposta: function (v) { try { localStorage.setItem('sb-leggero', v ? '1' : '0'); } catch (e) {} location.reload(); }
    };

    function sfondo() {
      if (leggero) { try { document.body.classList.add('leggero'); } catch (e) {} }
      if (!document.getElementById('anime-sfondo')) {
        var e = document.createElement('div'); e.id = 'anime-sfondo'; document.body.appendChild(e);
      }
    }

    function avvia() {
      sfondo();
      if (menoMoto || leggero) return;

      try {
        var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
        if (finePointer) { cursore(); magnetici(); }
      } catch (e) {  }
    }

    function cursore() {
      var ring = document.createElement('div'); ring.id = 'an-cursore-ring';
      var dot = document.createElement('div'); dot.id = 'an-cursore-dot';
      var bar = document.createElement('div'); bar.id = 'an-cursore-bar';
      document.body.appendChild(ring); document.body.appendChild(dot); document.body.appendChild(bar);
      var tx = -100, ty = -100, rx = -100, ry = -100, vivo = true, raf = 0, modo = '', morphEl = null;
      var SEL_TESTO = 'textarea, [contenteditable=""], [contenteditable="true"], input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file])';
      var SEL_MORPH = 'a, button, .btn, .grp-btn, .menu-voce, .drawer-voce, .cerca-filtro, .chip-domanda, [role="button"]';
      var PAD = 6;
      function morfabile(el) {
        var r = el.getBoundingClientRect();
        return r.width > 8 && r.height > 8 && r.width <= 360 && r.height <= 64;
      }
      function raggioDi(el) {
        try { var v = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0; return Math.min(v + PAD, 999); } catch (e) { return 10; }
      }
      function entraMorph(el) {
        morphEl = el;
        var r = el.getBoundingClientRect();
        ring.classList.add('morph');
        ring.style.width = (r.width + PAD * 2) + 'px';
        ring.style.height = (r.height + PAD * 2) + 'px';
        ring.style.borderRadius = raggioDi(el) + 'px';
        posMorph();
        dot.style.opacity = '0';
      }
      function posMorph() {
        if (!morphEl) return;
        if (!morphEl.isConnected) { esciMorph(); return; }
        var r = morphEl.getBoundingClientRect();
        if (!r.width && !r.height) { esciMorph(); return; }
        var ox = (tx - (r.left + r.width / 2)) * 0.12, oy = (ty - (r.top + r.height / 2)) * 0.12;
        ring.style.transform = 'translate(' + (r.left - PAD + ox) + 'px,' + (r.top - PAD + oy) + 'px)';
      }
      function esciMorph() {
        if (!morphEl) return;
        morphEl = null;
        ring.classList.remove('morph');
        ring.style.width = ring.style.height = ring.style.borderRadius = '';
        dot.style.opacity = '';
      }
      function muovi(e) {
        tx = e.clientX; ty = e.clientY;
        dot.style.transform = 'translate(' + (tx - 2) + 'px,' + (ty - 2) + 'px)';
        bar.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
        var t = e.target;
        var testo = (t && t.closest) ? t.closest(SEL_TESTO) : null;
        var morph = (!testo && t && t.closest) ? t.closest(SEL_MORPH) : null;
        if (morph && !morfabile(morph)) morph = null;
        var m = testo ? 'testo' : (morph ? 'link' : '');
        if (m !== modo) { modo = m; document.body.classList.toggle('modo-testo', m === 'testo'); }
        if (morph) { if (morph !== morphEl) entraMorph(morph); else posMorph(); }
        else esciMorph();
      }
      function passo() {
        if (!vivo) return;
        if (!morphEl) {
          rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
          ring.style.transform = 'translate(' + (rx - 16) + 'px,' + (ry - 16) + 'px)';
        } else { rx = tx; ry = ty; }
        raf = requestAnimationFrame(passo);
      }
      window.SB_CURSORE = {
        versoElemento: function (el) {
          try {
            if (!el || !el.isConnected) { esciMorph(); return false; }
            if (!morfabile(el)) { esciMorph(); return false; }
            var r = el.getBoundingClientRect();
            tx = r.left + r.width / 2; ty = r.top + r.height / 2;
            rx = tx; ry = ty;
            dot.style.opacity = '0';
            entraMorph(el);
            return true;
          } catch (e) { return false; }
        },
        libera: function () { try { esciMorph(); } catch (e) {} }
      };
      window.addEventListener('mousemove', muovi, { passive: true });
      window.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { dot.style.opacity = ring.style.opacity = bar.style.opacity = '0'; } }, { passive: true });
      window.addEventListener('mouseover', function () { if (!morphEl) dot.style.opacity = ''; ring.style.opacity = bar.style.opacity = ''; }, { passive: true });
      document.addEventListener('visibilitychange', function () { vivo = !document.hidden; if (vivo) { cancelAnimationFrame(raf); raf = requestAnimationFrame(passo); } });
      raf = requestAnimationFrame(passo);

      document.body.classList.add('cursore-on');
    }

    function magnetici() {
      var SELM = '.btn, #cerca-lancia, .grp-btn';
      var attuale = null;
      window.addEventListener('mousemove', function (e) {
        try {
          var el = e.target && e.target.closest && e.target.closest(SELM);
          if (el !== attuale) { if (attuale) attuale.style.transform = ''; attuale = el; }
          if (!el) return;
          var r = el.getBoundingClientRect();
          var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          el.style.transform = 'translate(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.28).toFixed(1) + 'px)';
        } catch (er) {  }
      }, { passive: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
    else avvia();
  } catch (e) {  }
})();
