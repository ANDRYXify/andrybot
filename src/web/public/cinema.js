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
      var tx = -100, ty = -100, rx = -100, ry = -100, vivo = true, raf = 0, modo = '';
      var SEL_TESTO = 'textarea, [contenteditable=""], [contenteditable="true"], input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file])';
      var SEL_CLIC = 'a, button, .btn, [data-scheda], .cerca-voce, .chip-domanda, summary, select, label, [role="button"]';
      function muovi(e) {
        tx = e.clientX; ty = e.clientY;
        dot.style.transform = 'translate(' + (tx - 2) + 'px,' + (ty - 2) + 'px)';
        bar.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
        var t = e.target, m = '';
        if (t && t.closest) { m = t.closest(SEL_TESTO) ? 'testo' : (t.closest(SEL_CLIC) ? 'link' : ''); }
        if (m !== modo) {
          modo = m;
          ring.classList.toggle('su', m === 'link');
          document.body.classList.toggle('modo-testo', m === 'testo');
        }
      }
      function passo() {
        if (!vivo) return;
        rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
        ring.style.transform = 'translate(' + (rx - 16) + 'px,' + (ry - 16) + 'px)';
        raf = requestAnimationFrame(passo);
      }
      window.addEventListener('mousemove', muovi, { passive: true });
      window.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { dot.style.opacity = ring.style.opacity = bar.style.opacity = '0'; } }, { passive: true });
      window.addEventListener('mouseover', function () { dot.style.opacity = ring.style.opacity = bar.style.opacity = ''; }, { passive: true });
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
