// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// cinema.js — il MOVIMENTO Garden Eight: scroll-reveal fluido e sereno. Gli elementi salgono ed
// emergono mentre scorri, decelerati e sfalsati; i titoli emergono da una maschera. Vivo, mai a scatti.
//
// SICUREZZA (lezione dei crash): l'osservatore del DOM guarda SOLO i nodi AGGIUNTI (childList), MAI gli
// attributi → non può mordersi la coda (era quello il loop infinito). L'IntersectionObserver guarda la
// visibilità e si STACCA dopo aver rivelato. NON tocca mai la navigazione. Tutto in try/catch. E un
// FAIL-SAFE: il pre-stato nascosto vale solo con body.cinema-on, e un timeout rivela comunque tutto →
// il contenuto non resta MAI invisibile. Rispetta prefers-reduced-motion, .meno-moto e .leggero.
(function () {
  'use strict';
  try {
    var menoMoto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function debole() {
      try {
        if (localStorage.getItem('sb-leggero') === '1') return true;
        if (localStorage.getItem('sb-leggero') === '0') return false;
      } catch (e) { /* niente */ }
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

    // elementi "da scena". I titoli emergono da una maschera; il resto sale e sfuma.
    var SEL = '.blocco, .pannello, .carta, .card, .mini-guida, .cap-scheda, .pannello-scheda > h1, .pannello-scheda > h2';
    var io = null;
    function osservatoreVista() {
      if (!('IntersectionObserver' in window)) return null;
      return new IntersectionObserver(function (voci) {
        try {
          for (var i = 0; i < voci.length; i++) {
            if (voci[i].isIntersecting) { voci[i].target.classList.add('rivelato'); io.unobserve(voci[i].target); }
          }
        } catch (e) { /* mai rompere */ }
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    }

    // marca gli elementi non ancora marcati dentro uno scope e li mette in osservazione.
    function marca(scope) {
      try {
        var root = scope || document;
        var nodi = root.querySelectorAll(SEL);
        for (var i = 0; i < nodi.length; i++) {
          var el = nodi[i];
          if (el.hasAttribute('data-reveal') || el.closest('#cerca-overlay')) continue;
          var tag = el.tagName;
          el.setAttribute('data-reveal', (tag === 'H1' || tag === 'H2') ? 'mask' : '1');
          el.style.setProperty('--gr-ritardo', (i % 5) * 70 + 'ms');
          if (io) io.observe(el); else el.classList.add('rivelato');
        }
      } catch (e) { /* l'estetica non rompe l'app */ }
    }

    // rete di sicurezza: dopo un po', qualunque cosa non ancora rivelata VIENE rivelata (mai appeso).
    function reteSicurezza() {
      try {
        var pend = document.querySelectorAll('[data-reveal]:not(.rivelato)');
        for (var i = 0; i < pend.length; i++) pend[i].classList.add('rivelato');
      } catch (e) { /* niente */ }
    }

    function avvia() {
      sfondo();
      if (menoMoto) return;                     // nessun moto: il contenuto è già pieno e visibile
      try { document.body.classList.add('cinema-on'); } catch (e) {}
      io = osservatoreVista();
      marca(document);
      // osserva SOLO i nodi aggiunti (cambio scheda della SPA) → marca il nuovo contenuto. childList,
      // MAI attributi: così aggiungere classi/attributi NON ri-scatena l'osservatore (niente loop).
      try {
        var app = document.getElementById('app') || document.body, tmr = null;
        new MutationObserver(function (muts) {
          try {
            var nuovo = false;
            for (var i = 0; i < muts.length; i++) if (muts[i].addedNodes && muts[i].addedNodes.length) { nuovo = true; break; }
            if (nuovo) { clearTimeout(tmr); tmr = setTimeout(function () { marca(document); }, 70); }
          } catch (e) { /* mai rompere l'app */ }
        }).observe(app, { childList: true, subtree: true });
      } catch (e) { /* niente */ }
      // fail-safe finale: dopo 3.5s tutto ciò che è ancora nascosto viene mostrato.
      setTimeout(reteSicurezza, 3500);
      // interazioni desktop (mouse fine): cursore custom + bottoni magnetici. Solo se il dispositivo
      // ha un puntatore preciso (niente su touch) e il moto è ammesso. NON toccano la navigazione.
      try {
        var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
        if (finePointer && !leggero) { cursore(); magnetici(); }
      } catch (e) { /* niente */ }
    }

    // ── CURSORE custom: un anello morbido che INSEGUE il puntatore (easing) + un punto preciso.
    //    Sull'hover di link/bottoni l'anello CRESCE e prende l'accento. Non nasconde il cursore vero
    //    (è un gestionale: si deve poter lavorare). rAF leggero, in pausa a scheda nascosta. ──
    function cursore() {
      var ring = document.createElement('div'); ring.id = 'an-cursore-ring';
      var dot = document.createElement('div'); dot.id = 'an-cursore-dot';
      document.body.appendChild(ring); document.body.appendChild(dot);
      document.body.classList.add('cursore-on');
      var tx = -100, ty = -100, rx = -100, ry = -100, vivo = true, raf = 0;
      function muovi(e) {
        tx = e.clientX; ty = e.clientY;
        dot.style.transform = 'translate(' + (tx - 2) + 'px,' + (ty - 2) + 'px)';
        var s = e.target && e.target.closest && e.target.closest('a, button, .btn, [data-scheda], .cerca-voce, .chip-domanda, summary, input, textarea, select');
        ring.classList.toggle('su', !!s);
      }
      function passo() {
        if (!vivo) return;
        rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
        ring.style.transform = 'translate(' + (rx - 16) + 'px,' + (ry - 16) + 'px)';
        raf = requestAnimationFrame(passo);
      }
      window.addEventListener('mousemove', muovi, { passive: true });
      window.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { dot.style.opacity = ring.style.opacity = '0'; } }, { passive: true });
      window.addEventListener('mouseover', function () { dot.style.opacity = ring.style.opacity = ''; }, { passive: true });
      document.addEventListener('visibilitychange', function () { vivo = !document.hidden; if (vivo) { cancelAnimationFrame(raf); raf = requestAnimationFrame(passo); } });
      raf = requestAnimationFrame(passo);
    }

    // ── BOTTONI MAGNETICI: il bottone/lente sotto il cursore si sposta un filo VERSO il cursore.
    //    Delegato su document → funziona anche col contenuto ridisegnato dalla SPA, senza ri-agganci. ──
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
        } catch (er) { /* niente */ }
      }, { passive: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
    else avvia();
  } catch (e) { /* l'estetica non deve MAI impedire al sito di funzionare */ }
})();
