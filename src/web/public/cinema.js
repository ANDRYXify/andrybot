// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// cinema.js — lo STRATO DI INTERAZIONE Garden Eight (desktop): cursore custom morbido e bottoni
// magnetici. NON tocca la navigazione, NON osserva il DOM.
//
// PERCHE COSI (correzione per costruzione, non per patch): lo scroll-reveal e la rivelazione
// "parola per parola" dei titoli ESISTONO GIA, nativi, dentro app.js + style.css
// (`.carta.rivela`→`.dentro` con un IntersectionObserver tarato su Material 3 / Apple HIG, e
// `titoloParole()`/`.pt-parola`). Un secondo sistema di reveal qui dentro NON aggiungeva moto: si
// SOVRAPPONEVA a quello dell'app (stessa carta, due osservatori, la mia regola vinceva per
// specificita e imponeva tempi diversi) e ri-portava dentro l'osservazione del DOM che aveva
// causato i crash. Quindi il reveal lo possiede UN SOLO sistema — quello dell'app. Qui resta solo
// cio che l'app non ha: le micro-interazioni del puntatore fine. Tutto additivo, in try/catch,
// inerte su touch e su prefers-reduced-motion / device deboli.
(function () {
  'use strict';
  try {
    var menoMoto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // device debole ("mulo da soma"): meno effetti. Rispetta una scelta esplicita salvata.
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

    function avvia() {
      sfondo();
      if (menoMoto || leggero) return;   // niente micro-interazioni dove il moto non è gradito/conviene
      // Interazioni SOLO con puntatore preciso (mouse): niente su touch.
      try {
        var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
        if (finePointer) { cursore(); magnetici(); }
      } catch (e) { /* niente */ }
    }

    // ── CURSORE custom: un anello morbido che INSEGUE il puntatore (easing) + un punto preciso.
    //    Sull'hover di link/bottoni l'anello CRESCE e prende l'accento. Non nasconde il cursore vero
    //    (è un gestionale: si deve poter lavorare). rAF leggero, in pausa a scheda nascosta. ──
    function cursore() {
      var ring = document.createElement('div'); ring.id = 'an-cursore-ring';
      var dot = document.createElement('div'); dot.id = 'an-cursore-dot';
      var bar = document.createElement('div'); bar.id = 'an-cursore-bar';   // "I" per i campi di testo
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
        if (m !== modo) {   // tocca il DOM SOLO quando lo stato cambia (niente lavoro a ogni pixel)
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
      // ULTIMO passo: solo ORA (elementi creati, listener attivi, rAF avviato) nascondiamo il cursore
      // nativo. Se qualcosa sopra fosse fallito, non arriviamo qui → il nativo resta e si lavora.
      document.body.classList.add('cursore-on');
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
