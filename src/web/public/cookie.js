// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


(function () {
  try {
    if (localStorage.getItem('cookie-ok') === '1') return;
    var b = document.getElementById('cookie-banner'); if (!b) return;
    b.hidden = false;
    document.getElementById('cookie-ok').addEventListener('click', function () {
      try { localStorage.setItem('cookie-ok', '1'); } catch (e) {  }
      b.hidden = true;
    });
  } catch (e) {  }
})();
