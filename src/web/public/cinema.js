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

    var nascosto = false;
    function mostraCursore(v) {
      try {
        if (nascosto === !v) return;
        nascosto = !v;
        document.body.classList.toggle('senza-cursore', nascosto);
      } catch (e) {}
    }
    window.SB_CURSORE_VIS = mostraCursore;
    window.SB_CURSORE = { versoElemento: function () { return false; }, libera: function () {} };

    function sfondo() {
      if (leggero) { try { document.body.classList.add('leggero'); } catch (e) {} }
      var f = document.getElementById('anime-sfondo');
      if (!f) { f = document.createElement('div'); f.id = 'anime-sfondo'; document.body.appendChild(f); }
      if (!document.getElementById('an-campo')) {
        var c = document.createElement('div'); c.id = 'an-campo'; f.appendChild(c);
      }
    }

    function avvia() {
      sfondo();
    }

    function molla(v) { return { p: v, v: 0 }; }

    var secco = menoMoto || leggero;

    function integra(m, meta, dt, w, z) {
      if (secco) { m.p = meta; m.v = 0; return meta; }
      var n = Math.min(12, Math.ceil(dt / 0.01)) || 1, h = dt / n, i;
      for (i = 0; i < n; i++) {
        m.v += (w * w * (meta - m.p) - 2 * z * w * m.v) * h;
        m.p += m.v * h;
      }
      return m.p;
    }

    function quieta(m, meta, ep, ev) { return Math.abs(meta - m.p) < ep && Math.abs(m.v) < ev; }

    function stretta(v, min, max) { return v < min ? min : (v > max ? max : v); }


    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
    else avvia();
  } catch (e) {  }
})();
