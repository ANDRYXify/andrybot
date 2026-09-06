// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

import { guscio, bollicine, misuraCoda, MARGINE } from '/fumetto.js';

(function () {
  const RITARDO = 340;
  const GRAZIA = 90;
  const STACCO = 16;
  const BECCO = 36;
  const SOPRA_CURSORE = 18;
  const SOTTO_CURSORE = 20;
  const GIRO_MAX = 26;
  const LETTURA_BASE = 1400;
  const LETTURA_PAROLA = 300;
  const LETTURA_MAX = 9000;
  const SCORRE_MIN = 8;

  let bolla = null;
  let corpo = null;
  let guscioSvg = null;
  let forma = null;
  let ombra = null;
  let pensieri = null;
  let acceso = null;
  let attesa = 0;
  let px = 0;
  let py = 0;
  let colDito = false;
  let vita = 0;
  let dovEra = 0;
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
    guscioSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    guscioSvg.setAttribute('class', 'aiuto-guscio');
    guscioSvg.setAttribute('aria-hidden', 'true');
    ombra = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    ombra.setAttribute('class', 'aiuto-ombra');
    forma = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    forma.setAttribute('class', 'aiuto-forma');
    pensieri = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    pensieri.setAttribute('class', 'aiuto-pensieri');
    guscioSvg.append(ombra, forma, pensieri);
    corpo = document.createElement('span');
    corpo.className = 'aiuto-testo';
    bolla.append(guscioSvg, corpo);
    document.body.appendChild(bolla);
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(() => { if (acceso) posa(acceso); }).observe(bolla);
    }
    return bolla;
  }

  function disegna(w, h, tipo, becco, giro, sotto, lungo) {
    const L = w + MARGINE * 2;
    const A = h + MARGINE * 2;
    guscioSvg.setAttribute('viewBox', `0 0 ${L} ${A}`);
    guscioSvg.setAttribute('width', L);
    guscioSvg.setAttribute('height', A);
    guscioSvg.style.left = -MARGINE + 'px';
    guscioSvg.style.top = -MARGINE + 'px';
    guscioSvg.style.width = L + 'px';
    guscioSvg.style.height = A + 'px';
    const d = guscio({ larghezza: w, altezza: h, tipo, becco, giro, sotto, lungo });
    forma.setAttribute('d', d);
    ombra.setAttribute('d', d);
    while (pensieri.firstChild) pensieri.removeChild(pensieri.firstChild);
    if (tipo === 'pensiero') {
      for (const c of bollicine({ larghezza: w, altezza: h, becco, giro, sotto })) {
        const o = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        o.setAttribute('cx', c.cx); o.setAttribute('cy', c.cy); o.setAttribute('r', c.r);
        pensieri.appendChild(o);
      }
    }
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
    const m = { width: b.offsetWidth, height: b.offsetHeight };
    const larg = document.documentElement.clientWidth;
    const alt = document.documentElement.clientHeight;
    const dentro = (v, a, z) => Math.max(a, Math.min(v, z));
    const segue = !colDito;
    const ancoraX = segue ? dentro(px, r.left + 8, r.right - 8) : r.left + r.width / 2;
    const stacco = dentro(Math.round(Math.max(m.height * 0.82, m.width * 0.16)), 34, 92);
    const codaH = misuraCoda(stacco, m.height);

    const orlo = Math.max(BECCO, m.width * 0.26);
    const aDestra = ancoraX < larg * 0.62;
    let x = segue
      ? (aDestra ? ancoraX - orlo : ancoraX - m.width + orlo)
      : ancoraX - m.width / 2;
    x = Math.max(10, Math.min(x, larg - m.width - 14));

    let sopra = true;
    let y = r.top - stacco - m.height;
    if (y < 10) { y = r.bottom + stacco; sopra = false; }
    if (y + m.height > alt - 14) y = Math.max(10, alt - m.height - 14);

    b.style.left = Math.round(x) + 'px';
    b.style.top = Math.round(y) + 'px';
    b.classList.toggle('sotto', !sopra);

    const attacco = Math.round(dentro(ancoraX - x, orlo, m.width - orlo));

    const bx = x + attacco;
    const by = sopra ? y + m.height : y;
    const dx = ancoraX - bx;
    const dy = (sopra ? r.top : r.bottom) - by;
    let giro = (sopra ? Math.atan2(-dx, dy) : Math.atan2(dx, -dy)) * 180 / Math.PI;
    if (!Number.isFinite(giro)) giro = 0;
    const g = dentro(giro, -GIRO_MAX, GIRO_MAX);
    const tipo = b.classList.contains('attenzione') ? 'grido' : b.classList.contains('dritta') ? 'pensiero' : 'tondo';
    disegna(m.width, m.height, tipo, attacco / m.width, g, !sopra, codaH);
  }

  function quantoDura(t) {
    const parole = t.split(/\s+/).filter(Boolean).length;
    return Math.min(LETTURA_MAX, LETTURA_BASE + parole * LETTURA_PAROLA);
  }

  function mostra(el) {
    const testo = testoDi(el);
    if (!testo) return;
    const b = nasce();
    nasce(); corpo.textContent = testo;
    b.className = 'aiuto-bolla ' + tipoDi(el);
    b.hidden = false;
    if (!b.id) b.id = 'aiuto-bolla';
    seq += 1;
    const mio = seq;
    el.setAttribute('aria-describedby', b.id);
    acceso = el;
    dovEra = window.scrollY;
    posa(el);
    clearTimeout(vita);
    vita = setTimeout(() => { if (seq === mio) spegni(); }, quantoDura(testo));
    requestAnimationFrame(() => { if (seq === mio) { posa(el); b.classList.add('vista'); } });
  }

  function spegni() {
    clearTimeout(vita); vita = 0;
    clearTimeout(attesa); attesa = 0;
    clearTimeout(uscita); uscita = 0;
    seq += 1;
    if (acceso) acceso.removeAttribute('aria-describedby');
    acceso = null;
    if (bolla) { bolla.classList.remove('vista'); bolla.hidden = true; }
  }

  function ancoraSopra() {
    if (!acceso) return false;
    const sotto = document.elementFromPoint(px, py);
    return !!sotto && (sotto === acceso || acceso.contains(sotto) || sotto.contains(acceso));
  }

  function forseSpegni() {
    if (ancoraSopra()) { uscita = 0; return; }
    spegni();
  }

  function chiedi(el) {
    if (acceso === el) { clearTimeout(uscita); uscita = 0; return; }
    clearTimeout(attesa);
    attesa = setTimeout(() => { if (el.isConnected) mostra(el); }, RITARDO);
  }

  document.addEventListener('pointermove', (ev) => {
    if (tocco(ev)) return;
    px = ev.clientX; py = ev.clientY;
  }, true);

  document.addEventListener('pointerover', (ev) => {
    if (tocco(ev)) return;
    px = ev.clientX; py = ev.clientY;
    colDito = false;
    const el = bersaglio(ev.target);
    if (!el) { if (acceso && !uscita) uscita = setTimeout(forseSpegni, GRAZIA); return; }
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
    uscita = setTimeout(forseSpegni, GRAZIA);
  }, true);

  document.addEventListener('focusin', (ev) => {
    const el = bersaglio(ev.target);
    if (!el) return;
    spegni();
    colDito = true;
    mostra(el);
  });

  document.addEventListener('focusout', spegni);
  document.addEventListener('pointerdown', spegni, true);
  window.addEventListener('scroll', () => {
    if (!acceso && !attesa) return;
    if (Math.abs(window.scrollY - dovEra) > SCORRE_MIN) spegni();
  }, true);
  window.addEventListener('resize', spegni);
  window.addEventListener('blur', spegni);
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') spegni(); });
})();
