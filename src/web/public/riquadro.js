// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function eRiquadro(xy) { return !!(xy && num(xy.w, 0) > 0 && num(xy.h, 0) > 0); }
  function tela(o) {
    if (o && o.tela) return o.tela;
    return { w: window.innerWidth || 1920, h: window.innerHeight || 1080 };
  }
  function posa(el, xy, o) {
    o = o || {};
    var t = tela(o);
    var x = num(xy.x, 0), y = num(xy.y, 0), w = num(xy.w, 0), h = num(xy.h, 0), r = num(xy.r, 0);
    el.classList.add('riquadro');
    el.style.right = 'auto'; el.style.bottom = 'auto';
    if (o.chat) {
      el.style.left = x + '%'; el.style.top = y + '%';
      el.style.width = w + '%'; el.style.height = h + '%'; el.style.maxWidth = '';
      el.style.transform = r ? 'rotate(' + r + 'deg)' : '';
      return 1;
    }
    el.style.left = (x + w / 2) + '%'; el.style.top = (y + h / 2) + '%';
    el.style.width = 'max-content'; el.style.height = ''; el.style.maxWidth = w + '%';
    if (o.dentro) { o.dentro.style.maxWidth = '100%'; el._rqDentro = o.dentro; }
    el.style.transform = 'translate(-50%,-50%)';
    var W = el.offsetWidth || 1, H = el.offsetHeight || 1;
    var k = Math.min((w / 100) * t.w / W, (h / 100) * t.h / H);
    if (!isFinite(k) || k <= 0) k = 1;
    k = Math.round(k * 1000) / 1000;
    el.style.transform = 'translate(-50%,-50%) scale(' + k + ') rotate(' + r + 'deg)';
    return k;
  }
  function togli(el) {
    if (!el.classList.contains('riquadro')) return;
    el.classList.remove('riquadro');
    el.style.height = ''; el.style.maxWidth = '';
    if (el._rqDentro) { el._rqDentro.style.maxWidth = ''; el._rqDentro = null; }
  }
  function trabocca(box) {
    var primo = box.firstElementChild, ultimo = box.lastElementChild;
    if (!primo) return false;
    return primo.offsetTop < -1 || (ultimo.offsetTop + ultimo.offsetHeight) > box.clientHeight + 1;
  }
  function ritaglia(box) {
    var n = 0;
    while (box.children.length > 1 && trabocca(box)) { box.firstElementChild.remove(); n++; }
    return n;
  }
  window.SB_RIQUADRO = { posa: posa, togli: togli, ritaglia: ritaglia, trabocca: trabocca, e: eRiquadro };
})();
