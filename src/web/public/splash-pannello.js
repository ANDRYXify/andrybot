// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


(function () {
  var s = document.getElementById('splash'); if (!s) return;
  var T = {
    it: ['ci vuole ancora un attimo…', 'ci sta mettendo più del solito', 'Riprova'],
    en: ['just a moment more…', 'this is taking longer than usual', 'Try again'],
    es: ['un momento más…', 'está tardando más de lo normal', 'Reintentar']
  };
  var t = T[(document.documentElement.lang || 'it').slice(0, 2)] || T.it;
  var nome = s.querySelector('.sp-nome');
  function andata() { return !s.isConnected || s.classList.contains('via'); }
  function di(testo) { if (!andata() && nome) nome.textContent = testo; }
  function riprova() {
    if (andata() || s.querySelector('.sp-riprova')) return;
    di(t[1]);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sp-riprova';
    b.textContent = t[2];
    b.addEventListener('click', function () { location.reload(); });
    s.appendChild(b);
  }
  setTimeout(function () { di(t[0]); }, 6000);
  setTimeout(riprova, 25000);
  window.addEventListener('error', function (e) {
    var x = e.target;
    if (x && x.tagName === 'SCRIPT' && /\/(app|disegno)\./.test(x.src || '')) riprova();
  }, true);
})();
