// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
window.__ax2 = '4f7b-taliento';


(function () {
  var el = document.documentElement, scuro = false;
  try {
    var t = localStorage.getItem('tema') || 'auto';
    scuro = t === 'dark' || (t === 'auto' &&
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) {
    scuro = false;
  }
  el.setAttribute('data-theme', scuro ? 'dark' : 'light');
  try {
    if (/[?&](aspetto=serie|demo=1)(&|$)/.test(location.search)) return;
    var a = JSON.parse(localStorage.getItem('aspetto') || 'null');
    var v = a && a.v === 1 && a[scuro ? 'scuro' : 'chiaro'];
    if (!v || !v.vars) return;
    for (var n in v.vars) {
      var val = String(v.vars[n]);
      if (/^--[a-z0-9-]+$/.test(n) && !/url\(|\\/i.test(val)) el.style.setProperty(n, val);
    }
    if (v.tema === 'dark' || v.tema === 'light') el.setAttribute('data-theme', v.tema);
    if (a.grandezza >= 85 && a.grandezza <= 130 && a.grandezza !== 100) el.style.fontSize = a.grandezza + '%';
  } catch (e) {}
})();
