// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  const RITARDO = 340;
  const GRAZIA = 90;
  const STACCO = 14;
  const BECCO = 20;

  let bolla = null;
  let acceso = null;
  let attesa = 0;
  let uscita = 0;
  let seq = 0;

  const tocco = (ev) => ev && ev.pointerType === 'touch';

  const TOCCABILE = 'a[href],button,input,select,textarea,summary,label,[role="button"],[role="tab"],[role="switch"],[tabindex]:not([tabindex="-1"])';
  const PERICOLO = '.pericolo,.btn.pericolo,[data-pericolo]';

  function tipoDi(el) {
    if (el.matches(PERICOLO) || el.closest(PERICOLO)) return 'attenzione';
    return el.matches(TOCCABILE) ? 'nota' : 'dritta';
  }

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
    x = Math.max(10, Math.min(x, larg - m.width - 14));
    let y = r.top - m.height - STACCO;
    let sopra = true;
    if (y < 10) { y = r.bottom + STACCO; sopra = false; }
    if (y + m.height > alt - 14) y = Math.max(10, alt - m.height - 14);
    b.style.left = Math.round(x) + 'px';
    b.style.top = Math.round(y) + 'px';
    b.classList.toggle('sotto', !sopra);
    const punta = r.left + r.width / 2 - x;
    b.style.setProperty('--becco', Math.round(Math.max(BECCO, Math.min(punta, m.width - BECCO))) + 'px');
  }

  function mostra(el) {
    const testo = testoDi(el);
    if (!testo) return;
    const b = nasce();
    b.textContent = testo;
    b.className = 'aiuto-bolla ' + tipoDi(el);
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
