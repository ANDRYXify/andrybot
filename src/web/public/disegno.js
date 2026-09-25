// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var DUE = 1000 / 12;
  var PASSO_FILA = 70;

  function disegni(ms) { return Math.max(2, Math.round(ms / DUE)); }
  function passi(n) { return 'steps(' + n + ', jump-end)'; }
  function f(n) { return Math.round(n * 10) / 10; }

  function caso(seme) {
    var h = 2166136261 >>> 0;
    var s = String(seme);
    for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
    return function () {
      h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
      h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }

  function tratto(x1, y1, x2, y2, r, sborda, curva) {
    var L = Math.hypot(x2 - x1, y2 - y1) || 1;
    var dx = (x2 - x1) / L, dy = (y2 - y1) / L, nx = -dy, ny = dx;
    var o1 = sborda * (0.4 + r()), o2 = sborda * (0.4 + r());
    var b = Math.min(curva, L * 0.012);
    function p(t) { return [x1 + (x2 - x1) * t + nx * (r() - 0.5) * 2 * b, y1 + (y2 - y1) * t + ny * (r() - 0.5) * 2 * b]; }
    var c1 = p(0.5), c2 = p(0.75);
    return 'M' + f(x1 - dx * o1) + ',' + f(y1 - dy * o1) + ' C' + f(c1[0]) + ',' + f(c1[1]) + ' ' +
      f(c2[0]) + ',' + f(c2[1]) + ' ' + f(x2 + dx * o2) + ',' + f(y2 + dy * o2);
  }

  function contorno(w, h, bd, r) {
    function j() { return (r() - 0.5) * 1.2; }
    var m = bd.sp / 2;
    var x0 = m, y0 = m, x1 = w - m, y1 = h - m;
    var A = bd.angoli;
    var k = Math.min(1, w / ((A[0][0] + A[1][0]) || 1), w / ((A[3][0] + A[2][0]) || 1),
      h / ((A[0][1] + A[3][1]) || 1), h / ((A[1][1] + A[2][1]) || 1));
    var q = A.map(function (a) {
      return [Math.max(0, Math.min(a[0] * k - m, (x1 - x0) / 2)), Math.max(0, Math.min(a[1] * k - m, (y1 - y0) / 2))];
    });
    var V = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    var D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    var L = bd.lati;
    function asse(i) { return i % 2; }
    function inizio(i) {
      var c = V[i], d = D[i];
      var t = L[(i + 3) % 4] ? q[i][asse(i)] : -m;
      return [c[0] + d[0] * t, c[1] + d[1] * t];
    }
    function fine(i) {
      var c = V[(i + 1) % 4], d = D[i];
      var t = L[(i + 1) % 4] ? q[(i + 1) % 4][asse(i)] : -m;
      return [c[0] - d[0] * t, c[1] - d[1] * t];
    }
    function pt(p) { return f(p[0] + j()) + ',' + f(p[1] + j()); }
    function angolo(i) { return ' Q' + f(V[i][0]) + ',' + f(V[i][1]) + ' '; }
    if (L[0] && L[1] && L[2] && L[3]) {
      var d = 'M' + pt(inizio(0)) + ' L' + pt(fine(0));
      for (var i = 1; i < 4; i++) d += angolo(i) + pt(inizio(i)) + ' L' + pt(fine(i));
      return d + angolo(0) + f(x0 + q[0][0] + 0.8) + ',' + f(y0 + 0.3);
    }
    var s = L.findIndex(function (v, i) { return v && !L[(i + 3) % 4]; });
    var out = '';
    for (var n = 0; n < 4; n++) {
      var l = (s + n) % 4;
      if (!L[l]) continue;
      out += (L[(l + 3) % 4] && n ? angolo(l) : (out ? ' M' : 'M')) + pt(inizio(l)) + ' L' + pt(fine(l));
    }
    return out;
  }

  function lato(i, w, h) { return [[0, 0, w, 0], [w, 0, w, h], [w, h, 0, h], [0, h, 0, 0]][i]; }

  var semi = new WeakMap();

  function semeDi(el) {
    var s = semi.get(el);
    if (!s) {
      s = el.id || el.getAttribute('data-scheda') || String(el.className) || 'carta';
      semi.set(el, s);
    }
    return s;
  }

  var SP_URLO = 3;
  var sagome = {};

  function misura(el) {
    var coperto = ['dg-in', 'dg-out'].filter(function (c) { return el.classList.contains(c); });
    coperto.forEach(function (c) { el.classList.remove(c); });
    var st = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    var LATI = ['Top', 'Right', 'Bottom', 'Left'];
    var lati = LATI.map(function (x) {
      var c = st['border' + x + 'Color'];
      var trasparente = /rgba\([^)]*,\s*0\)$/.test(c) || c === 'transparent';
      return !(st['border' + x + 'Style'] === 'none' || (parseFloat(st['border' + x + 'Width']) || 0) < 0.5 || trasparente);
    });
    var primo = LATI[lati.indexOf(true)];
    var sp = primo ? parseFloat(st['border' + primo + 'Width']) : 0;
    var colore = primo ? st['border' + primo + 'Color'] : '';
    var angoli = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(function (x) {
      var v = String(st['border' + x + 'Radius']).split(' ');
      var misurato = function (t, lato) { return /%$/.test(t) ? parseFloat(t) / 100 * lato : (parseFloat(t) || 0); };
      return [misurato(v[0], r.width), misurato(v[1] || v[0], r.height)];
    });
    var rag = angoli[0][0];
    var visibile = st.visibility !== 'hidden';
    coperto.forEach(function (c) { el.classList.add(c); });
    var z = 10, inFisso = false;
    for (var a = el; a && a !== document.body; a = a.parentElement) {
      var sa = a === el ? st : getComputedStyle(a);
      if (sa.position === 'fixed') inFisso = true;
      if ((sa.position === 'fixed' || sa.position === 'sticky') && sa.zIndex !== 'auto') z = Math.max(z, parseInt(sa.zIndex, 10) + 1);
    }
    var urlo = el.classList.contains('dg-urlo');
    return {
      r: r,
      bordo: urlo ? { sp: SP_URLO, urlo: true, rag: 0 }
        : !primo ? null : { sp: sp, colore: colore, rag: rag, lati: lati, angoli: angoli },
      z: z,
      inFisso: inFisso,
      visibile: visibile
    };
  }

  function disegnabile(el, m, o) {
    var r = m.r;
    return !!(m.bordo || (o && o.retino)) && m.visibile && r.width >= 8 && r.height >= 8 && r.bottom > 0 && r.top < window.innerHeight;
  }

  var LATI4 = ['Top', 'Right', 'Bottom', 'Left'];

  function haContorno(st) {
    return LATI4.some(function (x) {
      var c = st['border' + x + 'Color'];
      return st['border' + x + 'Style'] !== 'none' && (parseFloat(st['border' + x + 'Width']) || 0) >= 0.5 &&
        !(/rgba\([^)]*,\s*0\)$/.test(c) || c === 'transparent');
    });
  }

  function contornato(e) {
    if (e.classList.contains('dg-in') || e.classList.contains('dg-out')) return !!misura(e).bordo;
    return haContorno(getComputedStyle(e));
  }

  function fermo(el) {
    return !!(el.closest && el.closest('[data-dg-no]'));
  }

  function siVede(el) {
    if (!el.isConnected || (el.checkVisibility && !el.checkVisibility())) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    if (getComputedStyle(el).visibility === 'hidden') return false;
    for (var a = el; a && a.nodeType === 1; a = a.parentElement) {
      var st = getComputedStyle(a);
      if (st.display === 'none' || parseFloat(st.opacity) < 0.02) return false;
    }
    return true;
  }

  function aSchermo(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  }

  var COMANDO = 'a, button, input, select, textarea, [role="button"]';

  function parti(el) {
    if (contornato(el)) return [[el, false]];
    var dentro = [];
    (function giu(e) {
      for (var i = 0; i < e.children.length; i++) {
        var c = e.children[i];
        if (!(c instanceof HTMLElement) || c.matches(COMANDO)) continue;
        var st = getComputedStyle(c);
        if (st.display === 'none') continue;
        if (contornato(c)) dentro.push([c, false]); else giu(c);
      }
    })(el);
    return [[el, true]].concat(dentro);
  }

  var tele = [];
  var inGiro = false;

  function posa(t, r) {
    t.s.style.left = (r.left + (t.inFisso ? 0 : window.scrollX)) + 'px';
    t.s.style.top = (r.top + (t.inFisso ? 0 : window.scrollY)) + 'px';
    if (Math.abs(r.width - t.w) < 0.5 && Math.abs(r.height - t.h) < 0.5) return;
    t.w = r.width; t.h = r.height;
    t.s.setAttribute('width', t.w);
    t.s.setAttribute('height', t.h);
    t.s.setAttribute('viewBox', '0 0 ' + t.w + ' ' + t.h);
    for (var i = 0; i < t.tracce.length; i++) t.tracce[i].p.setAttribute('d', t.tracce[i].fa(t.w, t.h));
  }

  function giro() {
    tele = tele.filter(function (t) { return t.s.isConnected; });
    var misure = tele.map(function (t) { return t.el.isConnected ? t.el.getBoundingClientRect() : null; });
    tele = tele.filter(function (t, i) {
      if (!misure[i]) { t.s.remove(); return false; }
      posa(t, misure[i]);
      return true;
    });
    [].slice.call(document.querySelectorAll('.dg-strato')).forEach(function (p) {
      if (p.firstChild) return;
      try { p.hidePopover(); } catch (e) {}
      p.remove();
    });
    inGiro = tele.length > 0;
    if (inGiro) requestAnimationFrame(giro);
  }

  function strato(dlg) {
    var p = dlg._dgStrato;
    if (!p || !p.isConnected) {
      p = document.createElement('div');
      p.setAttribute('popover', 'manual');
      p.setAttribute('aria-hidden', 'true');
      p.className = 'dg-strato';
      document.body.appendChild(p);
      dlg._dgStrato = p;
    }
    try { if (p.matches(':popover-open')) p.hidePopover(); p.showPopover(); } catch (e) {}
    return p;
  }

  function tela(el, m) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'dg-tela');
    s.setAttribute('aria-hidden', 'true');
    var dlg = el.closest && el.closest('dialog');
    var casa = dlg && dlg.matches(':modal') ? strato(dlg) : document.body;
    var fisso = m.inFisso || casa !== document.body;
    s.style.zIndex = m.z;
    s.style.position = fisso ? 'fixed' : 'absolute';
    var t = { el: el, s: s, inFisso: fisso, w: 0, h: 0, tracce: [] };
    posa(t, m.r);
    casa.appendChild(s);
    tele.push(t);
    if (!inGiro) { inGiro = true; requestAnimationFrame(giro); }
    t.traccia = function (padre, fa, classe, da, dur, extra, n) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', fa(t.w, t.h));
      p.setAttribute('pathLength', '1');
      p.setAttribute('class', classe);
      p.style.setProperty('--dg-da', da + 'ms');
      p.style.setProperty('--dg-dur', dur + 'ms');
      p.style.setProperty('--dg-passi', passi(n || disegni(dur)));
      if (extra) for (var k in extra) p.setAttribute(k, extra[k]);
      (padre || s).appendChild(p);
      t.tracce.push({ p: p, fa: fa });
      return p;
    };
    return t;
  }

  var daAgganciare = [];

  function aggancia(s, el) {
    if (!daAgganciare.length) queueMicrotask(agganciaTutti);
    daAgganciare.push({ s: s, el: el, ora: performance.now() });
  }

  function agganciaTutti() {
    var q = daAgganciare;
    daAgganciare = [];
    q.forEach(function (x) {
      if (!x.s.getAnimations || !x.s.isConnected) return;
      var anime = x.s.getAnimations({ subtree: true });
      if (x.el) anime = anime.concat(x.el.getAnimations());
      anime.forEach(function (a) {
        if (String(a.animationName).indexOf('dg-') === 0) a.startTime = x.ora;
      });
    });
  }

  function togliTele(el) {
    tele.forEach(function (t) { if (t.el === el) t.s.remove(); });
  }

  var PULIZIA = 170;
  var RITORNO = 0.45;

  function piano(el, m, o) {
    var da = o.da || 0;
    var k = o.veloce ? 0.7 : 1;
    var seme = semeDi(el);
    var bd = o.retino ? null : m.bordo;
    var tratti = [];
    var tLato = 125 * k, passo = 60 * k;
    var daChina = da + 140 * k, tChina = 250 * k;
    if (bd) {
      [0, 1, 2, 3].forEach(function (i) {
        if (bd.lati && !bd.lati[i]) return;
        tratti.push({ matita: true, classe: 'dg-matita', da: da + i * passo, dur: tLato,
          fa: function (w, h) { var l = lato(i, w, h); return tratto(l[0], l[1], l[2], l[3], caso(seme + ':' + i), 7, 2.6); } });
      });
      if (!o.veloce && (!bd.lati || bd.lati[0])) {
        tratti.push({ matita: true, classe: 'dg-matita', da: da + 4 * passo, dur: tLato,
          fa: function (w, h) { var l = lato(0, w, h); return tratto(l[0], l[1], l[2], l[3], caso(seme + ':ripasso'), 4, 2); } });
      }
      tratti.push(bd.urlo
        ? { classe: 'dg-china dg-urlo-china', da: daChina, dur: tChina, fa: function (w, h) { return sagome.urlo(w, h, seme); } }
        : { classe: 'dg-china', da: daChina, dur: tChina, extra: { 'stroke-width': Math.max(1, bd.sp), stroke: bd.colore },
          fa: function (w, h) { return contorno(w, h, bd, caso(seme + ':china')); } });
    }
    var pulizia = { da: daChina + tChina, dur: PULIZIA };
    return { tratti: tratti, retino: { da: da + 220 * k, dur: 170 * k }, pulizia: pulizia, fine: pulizia.da + pulizia.dur };
  }

  function componi(el, m, p, indietro) {
    togliTele(el);
    var t = tela(el, m);
    var matite = document.createElementNS(NS, 'g');
    matite.setAttribute('class', indietro ? 'dg-matite dg-torna' : 'dg-matite');
    t.s.appendChild(matite);
    function tempo(x) {
      return indietro ? { da: RITORNO * (p.fine - x.da - x.dur), dur: RITORNO * x.dur } : { da: x.da, dur: x.dur };
    }
    p.tratti.forEach(function (x) {
      var q = tempo(x);
      t.traccia(x.matita ? matite : null, x.fa, x.classe + (indietro ? ' dg-sfila' : ' dg-traccia'), q.da, q.dur, x.extra, disegni(x.dur));
    });
    var r = tempo(p.retino);
    el.style.setProperty('--dg-da-retino', r.da + 'ms');
    el.style.setProperty('--dg-retino', r.dur + 'ms');
    el.classList.remove(indietro ? 'dg-in' : 'dg-out');
    el.classList.add(indietro ? 'dg-out' : 'dg-in');
    var pu = tempo(p.pulizia);
    matite.style.setProperty('--dg-da-pulizia', pu.da + 'ms');
    matite.style.setProperty('--dg-pulizia', pu.dur + 'ms');
    aggancia(t.s, el);
    if (el._dgTela && el._dgTela !== t.s) el._dgTela.remove();
    el._dgTela = t.s;
    return { t: t, fine: indietro ? RITORNO * p.fine : p.fine };
  }

  function traccia(el, m, o) {
    avviati++;
    el.dataset.dgIn = '1';
    el.dataset.dgFatto = '1';
    delete el.dataset.dgOut;
    if (el.classList.contains('rivela')) el.classList.add('dentro');
    var p = piano(el, m, o);
    var c = componi(el, m, p, false);
    if (o.emanata) segno(c.t.traccia, o.emanata, p.pulizia.da);
    setTimeout(function () {
      el.classList.remove('dg-in');
      el.style.removeProperty('--dg-da-retino');
      el.style.removeProperty('--dg-retino');
    }, p.retino.da + p.retino.dur);
    setTimeout(function () { c.t.s.remove(); delete el.dataset.dgIn; }, c.fine + (o.emanata ? 900 : 0));
  }

  function sfila(el, m, o) {
    avviati++;
    el.dataset.dgOut = '1';
    delete el.dataset.dgIn;
    var c = componi(el, m, piano(el, m, o), true);
    setTimeout(function () { c.t.s.remove(); }, c.fine + 20);
    setTimeout(function () {
      if (!el.dataset.dgOut) return;
      el.classList.remove('dg-out');
      el.style.removeProperty('--dg-da-retino');
      el.style.removeProperty('--dg-retino');
      delete el.dataset.dgOut;
    }, c.fine + 600);
    return c.fine;
  }

  function segno(fai, tipo, da) {
    if (tipo === 'rabbia') {
      var R = 11;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (v, i) {
        fai(null, function () {
          return 'M' + (-3 + v[0] * 3) + ',' + (-3 + v[1] * R) + ' Q' + (-3 + v[0] * 3) + ',' + (-3 + v[1] * 3) + ' ' + (-3 + v[0] * R) + ',' + (-3 + v[1] * 3);
        }, 'dg-emanata dg-rabbia dg-traccia', da + i * 45, 45);
      });
    } else if (tipo === 'scintille') {
      [[0, -14], [11, -9], [14, 2]].forEach(function (v, i) {
        fai(null, function (w) {
          return 'M' + (w + 2 + v[0] * 0.35) + ',' + (-2 + v[1] * 0.35) + ' L' + (w + 2 + v[0]) + ',' + (-2 + v[1]);
        }, 'dg-emanata dg-scintille dg-traccia', da + i * 45, 45);
      });
    }
  }

  var coda = [];

  function chiedi(el, o, indietro) {
    if (el && (indietro || !el.dataset.dgIn)) coda.push([el, o || {}, !!indietro]);
  }

  function copertina() {
    var s = document.getElementById('splash');
    return !!(s && !s.classList.contains('via'));
  }

  function esegui() {
    if (!coda.length || copertina()) return 0;
    var giro1 = coda;
    coda = [];
    var misure = giro1.map(function (x) { return misura(x[0]); });
    var fatti = 0;
    giro1.forEach(function (x, i) {
      if (!disegnabile(x[0], misure[i], x[1])) return;
      if (x[2]) { sfila(x[0], misure[i], x[1]); fatti++; return; }
      if (x[0].dataset.dgIn) return;
      traccia(x[0], misure[i], x[1]);
      fatti++;
    });
    return fatti;
  }

  function disegna(el, o) {
    chiedi(el, o);
    return esegui() > 0;
  }

  function disfa(el, o) {
    chiedi(el, o, true);
    return esegui() > 0;
  }

  var estensioni = [];

  function quando(nome, a) {
    for (var i = 0; i < estensioni.length; i++) if (estensioni[i][nome]) estensioni[i][nome](a);
  }

  var fila = 0, filaT = 0;
  function turno() {
    var ora = performance.now();
    if (ora - filaT > 350) fila = 0;
    filaT = ora;
    return fila++ * PASSO_FILA;
  }

  var AGISCE = 'button, a[href], [role="button"], summary, input[type="checkbox"], input[type="radio"], select';

  var avviati = 0;
  var premuti = new WeakMap();
  var RIPASSO = 150;
  var RIPASSO_RIPOSO = 600;

  function giroDa(w, h, rag, sp, x0, y0, verso, r) {
    var m = sp / 2, xa = m, ya = m, xb = w - m, yb = h - m;
    var q = Math.max(0, Math.min(rag - m, (xb - xa) / 2, (yb - ya) / 2));
    var pt = [];
    function retta(ax, ay, bx, by) {
      var n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 3));
      for (var i = 0; i < n; i++) pt.push([ax + (bx - ax) * i / n, ay + (by - ay) * i / n]);
    }
    function arco(cx, cy, a0) {
      var n = Math.max(1, Math.ceil(q * Math.PI / 6));
      for (var i = 0; i < n; i++) { var a = a0 + (Math.PI / 2) * i / n; pt.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
    }
    retta(xa + q, ya, xb - q, ya); arco(xb - q, ya + q, -Math.PI / 2);
    retta(xb, ya + q, xb, yb - q); arco(xb - q, yb - q, 0);
    retta(xb - q, yb, xa + q, yb); arco(xa + q, yb - q, Math.PI / 2);
    retta(xa, yb - q, xa, ya + q); arco(xa + q, ya + q, Math.PI);
    var n = pt.length, k = 0, dk = Infinity;
    for (var i = 0; i < n; i++) {
      var d = Math.hypot(pt[i][0] - x0, pt[i][1] - y0);
      if (d < dk) { dk = d; k = i; }
    }
    var d = '';
    for (var j = 0; j <= Math.ceil(n / 2); j++) {
      var p = pt[(((k + verso * j) % n) + n) % n];
      d += (j ? ' L' : 'M') + f(p[0] + (r() - 0.5) * 0.8) + ',' + f(p[1] + (r() - 0.5) * 0.8);
    }
    return d;
  }

  function ripassa(ev) {
    if (!ev.isTrusted || ev.button > 0) return;
    var el = ev.target && ev.target.closest ? ev.target.closest(AGISCE) : null;
    if (!el || el.disabled || el.closest('.dg-tela')) return;
    var ora = performance.now();
    var prima = premuti.get(el);
    if (prima && ora - prima.t < RIPASSO_RIPOSO) return;
    var volta = prima ? prima.n + 1 : 1;
    premuti.set(el, { t: ora, n: volta });
    var gia = avviati;
    var cx = ev.detail ? ev.clientX : null, cy = ev.detail ? ev.clientY : null;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (avviati !== gia || !el.isConnected) return;
        var m = misura(el);
        if (!disegnabile(el, m)) return;
        var fx = cx === null ? 0.5 : Math.min(1, Math.max(0, (cx - m.r.left) / m.r.width));
        var fy = cy === null ? 0 : Math.min(1, Math.max(0, (cy - m.r.top) / m.r.height));
        var bd = m.bordo, seme = semeDi(el) + ':' + volta;
        var t = tela(el, m);
        t.s.classList.add('dg-ripasso');
        [1, -1].forEach(function (verso) {
          t.traccia(null, function (w, h) { return giroDa(w, h, bd.rag, bd.sp, fx * w, fy * h, verso, caso(seme + ':' + verso)); },
            'dg-ripassa dg-traccia', 0, RIPASSO, { 'stroke-width': Math.max(1, bd.sp) + 1.5, stroke: bd.colore });
        });
        aggancia(t.s, null);
        setTimeout(function () { t.s.remove(); }, 460);
      });
    });
  }

  function compare(el, o) {
    o = o || {};
    if (!el || !el.isConnected || fermo(el) || !siVede(el)) return;
    if (el.parentElement && el.parentElement.closest('.dg-in, .dg-out, .dg-attesa')) return;
    if (!aSchermo(el)) { attendi(el); return; }
    lascia(el);
    var da = o.da === undefined ? turno() : o.da;
    parti(el).forEach(function (x) {
      chiedi(x[0], { da: da, veloce: o.veloce, retino: x[1] });
    });
  }

  function via(el, o) {
    o = o || {};
    if (!el || !el.isConnected || fermo(el)) return 0;
    var fine = 0;
    parti(el).forEach(function (x) {
      var m = misura(x[0]), oo = { veloce: o.veloce, retino: x[1] };
      if (disegnabile(x[0], m, oo)) fine = Math.max(fine, sfila(x[0], m, oo));
    });
    return fine;
  }

  function trattieni(el, display, per) {
    el.style.setProperty('--dg-display', display);
    el.classList.add('dg-resta');
    if (!el.inert) { el.inert = true; el._dgInerte = true; }
    var fine = per === undefined ? via(el, {}) : per;
    clearTimeout(el._dgResta);
    if (!fine) { lascia(el); return 0; }
    el._dgResta = setTimeout(function () { lascia(el); }, fine);
    return fine;
  }

  function profondita(el) { var n = 0; for (var a = el; a; a = a.parentElement) n++; return n; }

  function trattieniChiSiVedeva(nascosti, svelati) {
    var messi = nascosti.filter(function (el) { return el.isConnected && !fermo(el) && el.hasAttribute('hidden') && !el.dataset.dgOut; })
      .map(function (el) { return [el, el.getAttribute('hidden')]; });
    if (!messi.length) return;
    var tolti = svelati.filter(function (el) { return el.isConnected && !el.hasAttribute('hidden'); });
    messi.forEach(function (x) { x[0].removeAttribute('hidden'); });
    tolti.forEach(function (el) { el.setAttribute('hidden', ''); });
    var visti = messi.map(function (x) {
      var d = getComputedStyle(x[0]).display;
      return [x[0], d !== 'none' && siVede(x[0]) && aSchermo(x[0]) ? d : ''];
    });
    tolti.forEach(function (el) { el.removeAttribute('hidden'); });
    messi.forEach(function (x) { x[0].setAttribute('hidden', x[1]); });
    var tenuti = [];
    visti.filter(function (x) { return x[1]; })
      .sort(function (a, b) { return profondita(a[0]) - profondita(b[0]); })
      .forEach(function (x) {
        var sopra = tenuti.filter(function (t) { return t[0].contains(x[0]); })[0];
        var fine = trattieni(x[0], x[1], sopra ? sopra[1] : undefined);
        if (fine) tenuti.push([x[0], fine]);
      });
  }

  function lascia(el) {
    if (!el._dgResta && !el.classList.contains('dg-resta')) return;
    clearTimeout(el._dgResta);
    el._dgResta = 0;
    el.classList.remove('dg-resta', 'dg-cornice');
    el.style.removeProperty('--dg-display');
    if (el._dgInerte) { el.inert = false; el._dgInerte = false; }
  }

  function figliDi(d) {
    return [].filter.call(d.children, function (c) { return c instanceof HTMLElement && c.tagName !== 'SUMMARY'; });
  }

  function chiudeDettagli(d) {
    if (fermo(d) || !siVede(d)) return;
    d.classList.add('dg-resta');
    var fine = 0;
    figliDi(d).forEach(function (c) { if (siVede(c) && aSchermo(c)) fine = Math.max(fine, via(c, { veloce: true })); });
    clearTimeout(d._dgResta);
    d._dgResta = 0;
    if (!fine) { d.classList.remove('dg-resta'); return; }
    d._dgResta = setTimeout(function () { d._dgResta = 0; d.classList.remove('dg-resta'); }, fine);
  }

  var arrivo = null;

  function attendi(el) {
    if (!('IntersectionObserver' in window) || el.classList.contains('dg-attesa')) return;
    if (!arrivo) {
      arrivo = new IntersectionObserver(function (voci) {
        voci.forEach(function (v) {
          if (!v.isIntersecting) return;
          arrivo.unobserve(v.target);
          v.target.classList.remove('dg-attesa');
          compare(v.target);
        });
        esegui();
      }, { threshold: 0 });
    }
    el.classList.add('dg-attesa');
    arrivo.observe(el);
  }

  var FINESTRE = [['bv-velo', '.bv-carta'], ['giro-velo', '.giro-carta'], ['vt-velo', '.vt-velo-carta']];
  var osservatore = null;

  function sulleMosse(mosse) {
    var corpo = false, sveglia = false, mostrati = [], nascosti = [], svelati = [], chiusi = [];
    for (var i = 0; i < mosse.length; i++) {
      var m = mosse[i], el = m.target;
      if (!(el instanceof HTMLElement)) continue;
      if (m.attributeName === 'hidden') {
        if (m.oldValue !== null && !el.hasAttribute('hidden')) { mostrati.push(el); svelati.push(el); }
        else if (m.oldValue === null && el.hasAttribute('hidden')) nascosti.push(el);
        continue;
      }
      if (m.attributeName === 'open') {
        var aperto = el.hasAttribute('open');
        if (aperto && m.oldValue === null) {
          if (el.tagName === 'DETAILS') { clearTimeout(el._dgResta); el._dgResta = 0; el.classList.remove('dg-resta'); mostrati = mostrati.concat(figliDi(el)); }
          else if (el.tagName === 'DIALOG') mostrati.push(el);
        } else if (!aperto && m.oldValue !== null && el.tagName === 'DETAILS') chiusi.push(el);
        continue;
      }
      var prima = ' ' + String(m.oldValue || '') + ' ';
      var diventa = function (c) { return el.classList.contains(c) && prima.indexOf(' ' + c + ' ') < 0; };
      var perde = function (c) { return !el.classList.contains(c) && prima.indexOf(' ' + c + ' ') >= 0; };
      if (el.classList.contains('pannello-scheda')) {
        if (diventa('visibile')) quando('scena', el);
        if (diventa('esce')) quando('esceScena', el);
        continue;
      }
      if (el === document.body) { corpo = true; continue; }
      if (el.id === 'splash') { if (diventa('via')) sveglia = true; continue; }
      if (fermo(el)) continue;
      if (diventa('esce')) via(el, { veloce: el.classList.contains('toast') || el.classList.contains('rec-invito') });
      else if (perde('esce')) mostrati.push(el);
      if (el.classList.contains('carta')) {
        if (diventa('dentro') && !el.dataset.dgFatto) chiedi(el, { da: turno() });
      } else if (el.id === 'cerca-overlay') {
        if (diventa('aperto')) chiedi(el.querySelector('.cerca-box'));
      } else {
        var finestra = false;
        for (var j = 0; j < FINESTRE.length; j++) {
          if (!el.classList.contains(FINESTRE[j][0])) continue;
          finestra = true;
          var carta = el.querySelector(FINESTRE[j][1]);
          if (diventa('dentro') && carta && carta.querySelector('.btn.pericolo')) quando('urlo', carta);
          if (diventa('dentro')) chiedi(carta);
          if (perde('dentro')) chiedi(carta, {}, true);
        }
        if (!finestra && diventa('dentro')) mostrati.push(el);
      }
    }
    trattieniChiSiVedeva(nascosti, svelati);
    chiusi.forEach(chiudeDettagli);
    mostrati.forEach(function (el) { if (el.hasAttribute('hidden')) return; lascia(el); compare(el); });
    if (sveglia) quando('sveglia');
    if (corpo) quando('corpo');
    if (osservatore) osservatore.takeRecords();
    esegui();
  }

  var SALTA_CORPO = '.dg-tela, .dg-strato, .dg-sagoma, .bv-velo, .giro-velo, .nuv-velo, dialog, script, style, link, template, #toast-box, #splash';

  function firma(e) {
    return e.tagName + '|' + [].filter.call(e.classList, function (c) { return c.indexOf('dg-') !== 0; }).sort().join('.') + '|' + (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  function sulleAggiunte(mosse) {
    for (var i = 0; i < mosse.length; i++) {
      var padre = mosse[i].target, nuovi = mosse[i].addedNodes;
      var rifatti = {}, riscritto = false;
      [].forEach.call(mosse[i].removedNodes, function (r) { if (r instanceof HTMLElement) { riscritto = true; rifatti[firma(r)] = (rifatti[firma(r)] || 0) + 1; } });
      for (var j = 0; j < nuovi.length; j++) {
        var n = nuovi[j];
        if (!(n instanceof HTMLElement)) continue;
        if (n.classList.contains('pannello-scheda')) { if (n.classList.contains('visibile')) quando('scena', n); }
        else if (n.classList.contains('toast')) chiedi(n, { veloce: true, emanata: n.classList.contains('errore') ? 'rabbia' : 'scintille' });
        else if (padre === document.body) { if (!n.matches(SALTA_CORPO)) compare(n, { veloce: true }); }
        else if (padre.closest('.pannello-scheda.visibile') && !fermo(n) && (!riscritto || contornato(n))) {
          var f = firma(n);
          if (rifatti[f]) { rifatti[f]--; continue; }
          compare(n, { veloce: true });
        }
      }
    }
    esegui();
  }

  function vignetta(e) {
    if (e.matches('a, button, input, select, textarea, [role="button"]')) return false;
    var st = getComputedStyle(e);
    if (st.position === 'fixed') return false;
    return ['Top', 'Right', 'Bottom', 'Left'].every(function (l) {
      return (parseFloat(st['border' + l + 'Width']) || 0) >= 0.5 && st['border' + l + 'Style'] !== 'none';
    });
  }

  function vignetteDi(radice) {
    var trovate = [];
    (function giu(e) {
      for (var i = 0; i < e.children.length; i++) {
        var c = e.children[i];
        if (vignetta(c)) trovate.push(c); else giu(c);
      }
    })(radice);
    return trovate;
  }

  function vetrina() {
    if (!document.body.classList.contains('vetrina')) return;
    var radice = document.querySelector('main') || document.body;
    var alto = window.innerHeight;
    vignetteDi(radice).filter(function (e) {
      var r = e.getBoundingClientRect();
      return !(r.bottom > 0 && r.top < alto);
    }).forEach(attendi);
  }

  function finestre() {
    if (!window.HTMLDialogElement) return;
    var chiudi = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.close = function () {
      var d = this, args = arguments;
      if (d._dgChiude) return;
      var dura = d.open ? via(d, {}) : 0;
      if (!dura) return chiudi.apply(d, args);
      d._dgChiude = true;
      setTimeout(function () { d._dgChiude = false; chiudi.apply(d, args); }, dura);
    };
    document.addEventListener('cancel', function (ev) {
      var d = ev.target;
      if (!(d instanceof HTMLDialogElement) || !d.open) return;
      ev.preventDefault();
      d.close();
    }, true);
  }

  function avvia() {
    osservatore = new MutationObserver(sulleMosse);
    osservatore.observe(document.body, { attributes: true, attributeOldValue: true, subtree: true, attributeFilter: ['class', 'hidden', 'open'] });
    var app = document.getElementById('app');
    if (app) new MutationObserver(sulleAggiunte).observe(app, { childList: true, subtree: true });
    var avvisi = document.getElementById('toast-box');
    if (avvisi) new MutationObserver(sulleAggiunte).observe(avvisi, { childList: true });
    new MutationObserver(sulleAggiunte).observe(document.body, { childList: true });
    document.addEventListener('click', ripassa, true);
    window.addEventListener('resize', function () { quando('corpo'); esegui(); });
    finestre();
    [].slice.call(document.querySelectorAll('.cookie-banner:not([hidden])')).forEach(function (e) { compare(e, { veloce: true }); });
    esegui();
    (window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); })(vetrina);
  }

  avvia();
  window.SB_DISEGNO = {
    disegna: disegna, disfa: disfa, via: via, compare: function (el, o) { compare(el, o); esegui(); },
    estendi: function (x) { estensioni.push(x); if (x.corpo) x.corpo(); esegui(); },
    interno: {
      misura: misura, disegnabile: disegnabile, traccia: traccia, sfila: sfila, chiedi: chiedi, esegui: esegui,
      compare: compare, via: via, lascia: lascia, siVede: siVede, contornato: contornato, copertina: copertina,
      semeDi: semeDi, caso: caso, f: f, NS: NS, PASSO_FILA: PASSO_FILA, sagome: sagome,
      fila: function (n) { fila = n; filaT = performance.now(); }
    }
  };
})();
