// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


(function () {
  var poses = function () { var p = document.createElement('script'); p.src = '/tracking-poses.js'; document.body.appendChild(p); };
  if (window.SB_FX) return poses();
  var s = document.createElement('script'); s.src = '/tracking-fx.js'; s.onload = poses; s.onerror = poses; document.body.appendChild(s);
})();
