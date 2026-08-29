// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


(function () {
  var s = document.getElementById('splash'); if (!s) return;
  var fatto = false;
  function via() { if (fatto) return; fatto = true; s.classList.add('via'); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 550); }
  window.SB_SPLASH_OFF = via;

  try {
    var app = document.getElementById('app');
    if (app && window.MutationObserver) {
      var mo = new MutationObserver(function () { mo.disconnect(); via(); });
      mo.observe(app, { childList: true });
    }
  } catch (e) {  }
  setTimeout(via, 7000);
})();
