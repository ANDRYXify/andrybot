// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  function segna(b) {
    var prima = b.textContent;
    b.textContent = b.getAttribute('data-fatto') || prima;
    b.classList.add('fatto');
    setTimeout(function () { b.textContent = prima; b.classList.remove('fatto'); }, 1600);
  }
  function seleziona(b) {
    var riga = b.closest('.ng-cmd');
    var code = riga && riga.querySelector('code');
    if (!code || !window.getSelection) return;
    var r = document.createRange();
    r.selectNodeContents(code);
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-copia]') : null;
    if (!b) return;
    var testo = b.getAttribute('data-copia') || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(testo).then(function () { segna(b); }, function () { seleziona(b); });
    } else {
      seleziona(b);
    }
  });
})();
