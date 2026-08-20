// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// cinema.js — l'atmosfera, in versione GARDEN EIGHT: minimale e serena. Niente particelle, niente
// canvas: solo lo sfondo (piatto, dal tema) e un ingresso MORBIDO una volta al caricamento.
// Regola d'oro: NON tocca MAI la navigazione (nessun observer, nessun timer). Se qualcosa va storto,
// la pagina resta piena e usabile. Rispetta prefers-reduced-motion, .meno-moto e .leggero.
(function () {
  'use strict';
  try {
    var menoMoto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // "muli da soma": device deboli → modalità leggera (l'ingresso diventa una dissolvenza secca).
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

    // ingresso MORBIDO una sola volta, sul contenuto visibile. Animazione pura CSS (fill both →
    // finisce a opacity:1): il contenuto si rivela SEMPRE da solo. NON osserva e NON tocca la nav.
    function ingresso() {
      if (menoMoto) return;
      try {
        var vis = document.querySelector('.pannello-scheda.visibile') || document;
        var nodi = vis.querySelectorAll('.blocco, .pannello, .carta, .card');
        for (var i = 0; i < nodi.length && i < 30; i++) {
          if (nodi[i].closest('#cerca-overlay')) continue;
          nodi[i].setAttribute('data-anime', '1');
          nodi[i].style.setProperty('--gr-ritardo', Math.min(i, 7) * 55 + 'ms');
        }
      } catch (e) { /* mai rompere nulla */ }
    }

    function avvia() { sfondo(); setTimeout(ingresso, 380); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
    else avvia();
  } catch (e) { /* l'estetica non deve MAI impedire al sito di funzionare */ }
})();
