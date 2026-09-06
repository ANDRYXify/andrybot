// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  const RITARDO = 340;
  const GRAZIA = 90;
  const STACCO = 10;

  let bolla = null;
  let acceso = null;
  let attesa = 0;
  let uscita = 0;
  let seq = 0;

  const tocco = (ev) => ev && ev.pointerType === 'touch';

  function nasce() {
    if (bolla) return bolla;
    bolla = document.createElement('div');
    bolla.className = 'aiuto-bolla';
    bolla.setAttribute('role', 'tooltip');
    bolla.hidden = true;
    document.body.appendChild(bolla);
    return bolla;
  }

  function testoDi(el) {
    const t = el.getAttribute('title');
    if (t !== null) {
      const v = t.trim();
      el.removeAttribute('title');
      if (v) el.setAttribute('data-aiuto', v);
    }
    return (el.getAttribute('data-aiuto') || '').trim();
  }

  function bersaglio(nodo) {
    let el = nodo;
    while (el && el.nodeType === 1) {
      if (el.hasAttribute('data-aiuto') || el.hasAttribute('title')) return el;
      if (el === document.body) return null;
      el = el.parentElement;
    }
    return null;
  }

  function posa(el) {
    const b = nasce();
    const r = el.getBoundingClientRect();
    const m = b.getBoundingClientRect();
    const larg = document.documentElement.clientWidth;
    const alt = document.documentElement.clientHeight;
    let x = r.left + r.width / 2 - m.width / 2;
    x = Math.max(8, Math.min(x, larg - m.width - 8));
    let y = r.top - m.height - STACCO;
    let sopra = true;
    if (y < 8) { y = r.bottom + STACCO; sopra = false; }
    if (y + m.height > alt - 8) y = Math.max(8, alt - m.height - 8);
    b.style.left = Math.round(x) + 'px';
    b.style.top = Math.round(y) + 'px';
    b.classList.toggle('sotto', !sopra);
  }

  function mostra(el) {
    const testo = testoDi(el);
    if (!testo) return;
    const b = nasce();
    b.textContent = testo;
    b.hidden = false;
    if (!b.id) b.id = 'aiuto-bolla';
    seq += 1;
    const mio = seq;
    el.setAttribute('aria-describedby', b.id);
    acceso = el;
    posa(el);
    requestAnimationFrame(() => { if (seq === mio) { posa(el); b.classList.add('vista'); } });
  }

  function spegni() {
    clearTimeout(attesa); attesa = 0;
    clearTimeout(uscita); uscita = 0;
    seq += 1;
    if (acceso) acceso.removeAttribute('aria-describedby');
    acceso = null;
    if (bolla) { bolla.classList.remove('vista'); bolla.hidden = true; }
  }

  function chiedi(el) {
    if (acceso === el) { clearTimeout(uscita); uscita = 0; return; }
    clearTimeout(attesa);
    attesa = setTimeout(() => { if (el.isConnected) mostra(el); }, RITARDO);
  }

  document.addEventListener('pointerover', (ev) => {
    if (tocco(ev)) return;
    const el = bersaglio(ev.target);
    if (!el) { if (acceso && !uscita) uscita = setTimeout(spegni, GRAZIA); return; }
    if (el === acceso) { clearTimeout(uscita); uscita = 0; return; }
    spegni();
    chiedi(el);
  }, true);

  document.addEventListener('pointerout', (ev) => {
    if (tocco(ev)) return;
    if (!acceso && !attesa) return;
    const dove = ev.relatedTarget;
    if (dove && acceso && (acceso === dove || acceso.contains(dove))) return;
    clearTimeout(attesa); attesa = 0;
    clearTimeout(uscita);
    uscita = setTimeout(spegni, GRAZIA);
  }, true);

  document.addEventListener('focusin', (ev) => {
    const el = bersaglio(ev.target);
    if (!el) return;
    spegni();
    mostra(el);
  });

  document.addEventListener('focusout', spegni);
  document.addEventListener('pointerdown', spegni, true);
  window.addEventListener('scroll', spegni, true);
  window.addEventListener('resize', spegni);
  window.addEventListener('blur', spegni);
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') spegni(); });
})();
