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

    function mostraCursore(v) { try { document.body.classList.toggle('senza-cursore', !v); } catch (e) {} }
    window.SB_CURSORE_VIS = mostraCursore;
    window.SB_CURSORE = { versoElemento: function () { return false; }, libera: function () {} };

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
        if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) motore();
      } catch (e) {  }
    }

    function molla(v) { return { p: v, v: 0 }; }

    function integra(m, meta, dt, w, z) {
      var n = Math.min(12, Math.ceil(dt / 0.01)) || 1, h = dt / n, i;
      for (i = 0; i < n; i++) {
        m.v += (w * w * (meta - m.p) - 2 * z * w * m.v) * h;
        m.p += m.v * h;
      }
      return m.p;
    }

    function quieta(m, meta, ep, ev) { return Math.abs(meta - m.p) < ep && Math.abs(m.v) < ev; }

    function stretta(v, min, max) { return v < min ? min : (v > max ? max : v); }

    function motore() {
      var SEL_TESTO = 'textarea, [contenteditable=""], [contenteditable="true"], input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file])';
      var SEL_MORPH = 'a, button, .btn, .grp-btn, .menu-voce, .drawer-voce, .cerca-filtro, .chip-domanda, [role="button"]';
      var PAD = 6, BASE = 32;

      var ring = document.createElement('div'); ring.id = 'an-cursore-ring';
      var dot = document.createElement('div'); dot.id = 'an-cursore-dot';
      var bar = document.createElement('div'); bar.id = 'an-cursore-bar';
      document.body.appendChild(ring); document.body.appendChild(dot); document.body.appendChild(bar);

      var radice = document.documentElement, corpo = document.body;
      var px = -200, py = -200, pxV = -200, pyV = -200, noto = false;
      var cand = null, mira = null, scartato = null, rett = null, raggio = BASE / 2;
      var rimisura = true, centra = false, modo = '', morfando = false;
      var vw = window.innerWidth || 1, vh = window.innerHeight || 1;
      var acceso = false, raf = 0, tPrec = 0;

      var mX = molla(-200), mY = molla(-200), mW = molla(BASE), mH = molla(BASE), mR = molla(BASE / 2);
      var cX = molla(0), cY = molla(0);
      var sX = -1e9, sY = -1e9, sW = -1, sH = -1, sR = -1, sCX = -9, sCY = -9;

      function morfabile(r) { return r.width > 8 && r.height > 8 && r.width <= 360 && r.height <= 64; }

      function raggioDi(el) {
        try { return stretta(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, 0, 999); }
        catch (e) { return 10; }
      }

      function sveglia() {
        if (acceso || !vivo()) return;
        acceso = true; tPrec = 0;
        raf = requestAnimationFrame(giro);
      }

      function vivo() { return !document.hidden; }

      function giro(t) {
        var dt = tPrec ? stretta((t - tPrec) / 1000, 0.001, 0.12) : 1 / 60;
        tPrec = t;

        if (cand === scartato) cand = null;
        if (cand !== mira) { mira = cand; rimisura = true; if (!mira) rett = null; }
        if (mira) {
          if (rimisura || px !== pxV || py !== pyV) {
            if (!mira.isConnected) { mira = cand = null; rett = null; }
            else {
              var r = mira.getBoundingClientRect();
              if (!morfabile(r)) { scartato = mira; mira = cand = null; rett = null; }
              else { rett = r; if (rimisura) raggio = raggioDi(mira); }
            }
          }
          if (mira && centra && rett) { px = rett.left + rett.width / 2; py = rett.top + rett.height / 2; }
        }
        centra = false; rimisura = false;

        var tw, th, tr, tx, ty;
        if (mira && rett) {
          tw = rett.width + PAD * 2; th = rett.height + PAD * 2; tr = Math.min(raggio + PAD, 999);
          var qx = rett.left + rett.width / 2, qy = rett.top + rett.height / 2;
          tx = rett.left - PAD + stretta((px - qx) * 0.1, -9, 9);
          ty = rett.top - PAD + stretta((py - qy) * 0.1, -7, 7);
        } else {
          tw = th = BASE; tr = BASE / 2; tx = px - BASE / 2; ty = py - BASE / 2;
        }

        var wp = mira ? 62 : 34, zp = mira ? 0.9 : 1;
        var X = integra(mX, tx, dt, wp, zp), Y = integra(mY, ty, dt, wp, zp);
        var W = integra(mW, tw, dt, 48, 0.88), H = integra(mH, th, dt, 48, 0.88), R = integra(mR, tr, dt, 48, 0.88);

        var fx = noto ? stretta((px / vw) * 2 - 1, -1, 1) : 0;
        var fy = noto ? stretta((py / vh) * 2 - 1, -1, 1) : 0;
        integra(cX, fx, dt, 2.4, 1); integra(cY, fy, dt, 2.4, 1);

        if (Math.abs(X - sX) > 0.05 || Math.abs(Y - sY) > 0.05) {
          sX = X; sY = Y;
          ring.style.transform = 'translate3d(' + X.toFixed(2) + 'px,' + Y.toFixed(2) + 'px,0)';
        }
        if (Math.abs(W - sW) > 0.06) { sW = W; ring.style.width = W.toFixed(2) + 'px'; }
        if (Math.abs(H - sH) > 0.06) { sH = H; ring.style.height = H.toFixed(2) + 'px'; }
        if (Math.abs(R - sR) > 0.06) { sR = R; ring.style.borderRadius = R.toFixed(2) + 'px'; }
        if (Math.abs(cX.p - sCX) > 0.004) { sCX = cX.p; radice.style.setProperty('--pnt-x', cX.p.toFixed(3)); }
        if (Math.abs(cY.p - sCY) > 0.004) { sCY = cY.p; radice.style.setProperty('--pnt-y', cY.p.toFixed(3)); }

        var m = !!mira;
        if (m !== morfando) { morfando = m; ring.classList.toggle('morph', m); corpo.classList.toggle('morfando', m); }

        dot.style.transform = 'translate3d(' + (px - 2) + 'px,' + (py - 2) + 'px,0)';
        bar.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0)';

        var fermo = quieta(mX, tx, 0.06, 0.06) && quieta(mY, ty, 0.06, 0.06) &&
                    quieta(mW, tw, 0.06, 0.06) && quieta(mH, th, 0.06, 0.06) &&
                    quieta(mR, tr, 0.06, 0.06) && quieta(cX, fx, 0.003, 0.004) && quieta(cY, fy, 0.003, 0.004);
        pxV = px; pyV = py;
        if (fermo || !vivo()) { acceso = false; raf = 0; return; }
        raf = requestAnimationFrame(giro);
      }

      window.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        mostraCursore(true);
        px = e.clientX; py = e.clientY;
        if (!noto) { noto = true; mX.p = px - BASE / 2; mY.p = py - BASE / 2; mX.v = mY.v = 0; }
        var t = e.target, testo = null, m = null;
        if (t && t.closest) {
          testo = t.closest(SEL_TESTO);
          if (!testo) m = t.closest(SEL_MORPH);
        }
        if (m !== scartato) scartato = null;
        cand = m;
        var nm = testo ? 'testo' : (m ? 'link' : '');
        if (nm !== modo) { modo = nm; corpo.classList.toggle('modo-testo', nm === 'testo'); }
        sveglia();
      }, { passive: true });

      window.addEventListener('pointerout', function (e) {
        if (!e.relatedTarget) corpo.classList.add('fuori-pagina');
      }, { passive: true });
      window.addEventListener('pointerover', function () { corpo.classList.remove('fuori-pagina'); }, { passive: true });

      window.addEventListener('scroll', function () { rimisura = true; sveglia(); }, { passive: true, capture: true });
      window.addEventListener('resize', function () {
        vw = window.innerWidth || 1; vh = window.innerHeight || 1;
        rimisura = true; sveglia();
      }, { passive: true });

      document.addEventListener('keydown', function (ev) {
        var k = ev.key;
        if (k === 'Tab' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' ||
            k === 'Enter' || k === ' ' || k === 'Escape') mostraCursore(false);
      }, true);

      document.addEventListener('visibilitychange', function () { if (vivo()) sveglia(); });

      window.SB_CURSORE = {
        versoElemento: function (el) {
          try {
            if (!el || !el.isConnected) return false;
            cand = el; scartato = null; centra = true; rimisura = true; sveglia();
            return true;
          } catch (e) { return false; }
        },
        libera: function () { try { cand = null; scartato = null; sveglia(); } catch (e) {} }
      };

      corpo.classList.add('cursore-on');
      sveglia();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
    else avvia();
  } catch (e) {  }
})();
