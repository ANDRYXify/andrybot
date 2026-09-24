// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var DUE = 1000 / 12;
  var PASSO_FILA = 70;

  function passi(ms) { return 'steps(' + Math.max(2, Math.round(ms / DUE)) + ', jump-end)'; }
  function meno() {
    return document.body.classList.contains('meno-moto') ||
      !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
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

  function contorno(w, h, rag, sp, r) {
    function j() { return (r() - 0.5) * 1.2; }
    var m = sp / 2;
    var x0 = m, y0 = m, x1 = w - m, y1 = h - m;
    var q = Math.max(0, Math.min(rag - m, (x1 - x0) / 2, (y1 - y0) / 2));
    return 'M' + f(x0 + q + j()) + ',' + f(y0 + j()) +
      ' L' + f(x1 - q + j()) + ',' + f(y0 + j()) + ' Q' + f(x1) + ',' + f(y0) + ' ' + f(x1 + j()) + ',' + f(y0 + q + j()) +
      ' L' + f(x1 + j()) + ',' + f(y1 - q + j()) + ' Q' + f(x1) + ',' + f(y1) + ' ' + f(x1 - q + j()) + ',' + f(y1 + j()) +
      ' L' + f(x0 + q + j()) + ',' + f(y1 + j()) + ' Q' + f(x0) + ',' + f(y1) + ' ' + f(x0 + j()) + ',' + f(y1 - q + j()) +
      ' L' + f(x0 + j()) + ',' + f(y0 + q + j()) + ' Q' + f(x0) + ',' + f(y0) + ' ' + f(x0 + q + 0.8) + ',' + f(y0 + 0.3);
  }

  function lato(i, w, h) { return [[0, 0, w, 0], [w, 0, w, h], [w, h, 0, h], [0, h, 0, 0]][i]; }

  function misura(el) {
    var st = getComputedStyle(el);
    var sp = parseFloat(st.borderTopWidth) || 0;
    var colore = st.borderTopColor;
    var trasparente = /rgba\([^)]*,\s*0\)$/.test(colore) || colore === 'transparent';
    var z = 10, inFisso = false;
    for (var a = el; a && a !== document.body; a = a.parentElement) {
      var sa = a === el ? st : getComputedStyle(a);
      if (sa.position === 'fixed') inFisso = true;
      if ((sa.position === 'fixed' || sa.position === 'sticky') && sa.zIndex !== 'auto') z = Math.max(z, parseInt(sa.zIndex, 10) + 1);
    }
    return {
      r: el.getBoundingClientRect(),
      bordo: (st.borderTopStyle === 'none' || sp < 0.5 || trasparente) ? null : { sp: sp, colore: colore, rag: parseFloat(st.borderTopLeftRadius) || 0 },
      z: z,
      inFisso: inFisso
    };
  }

  function disegnabile(el, m) {
    var r = m.r;
    return !!m.bordo && r.width >= 8 && r.height >= 8 && r.bottom > 0 && r.top < window.innerHeight;
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
    inGiro = tele.length > 0;
    if (inGiro) requestAnimationFrame(giro);
  }

  function tela(el, m) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'dg-tela');
    s.setAttribute('aria-hidden', 'true');
    s.style.zIndex = m.z;
    s.style.position = m.inFisso ? 'fixed' : 'absolute';
    var t = { el: el, s: s, inFisso: m.inFisso, w: 0, h: 0, tracce: [] };
    posa(t, m.r);
    document.body.appendChild(s);
    tele.push(t);
    if (!inGiro) { inGiro = true; requestAnimationFrame(giro); }
    t.traccia = function (padre, fa, classe, da, dur, extra) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', fa(t.w, t.h));
      p.setAttribute('pathLength', '1');
      p.setAttribute('class', classe + ' dg-traccia');
      p.style.setProperty('--dg-da', da + 'ms');
      p.style.setProperty('--dg-dur', dur + 'ms');
      p.style.setProperty('--dg-passi', passi(dur));
      if (extra) for (var k in extra) p.setAttribute(k, extra[k]);
      (padre || s).appendChild(p);
      t.tracce.push({ p: p, fa: fa });
      return p;
    };
    return t;
  }

  function traccia(el, m, o) {
    el.dataset.dgIn = '1';
    el.dataset.dgFatto = '1';
    if (el.classList.contains('rivela')) el.classList.add('dentro');
    var da = o.da || 0;
    var k = o.veloce ? 0.7 : 1;
    var seme = el.id || el.getAttribute('data-scheda') || el.className || 'carta';
    var bd = m.bordo;
    var t = tela(el, m);
    var matite = document.createElementNS(NS, 'g');
    matite.setAttribute('class', 'dg-matite');
    t.s.appendChild(matite);
    var tLato = 125 * k, passo = 60 * k;
    [0, 1, 2, 3].forEach(function (i) {
      t.traccia(matite, function (w, h) { var l = lato(i, w, h); return tratto(l[0], l[1], l[2], l[3], caso(seme + ':' + i), 7, 2.6); },
        'dg-matita', da + i * passo, tLato);
    });
    if (!o.veloce) {
      t.traccia(matite, function (w, h) { var l = lato(0, w, h); return tratto(l[0], l[1], l[2], l[3], caso(seme + ':ripasso'), 4, 2); },
        'dg-matita', da + 4 * passo, tLato);
    }
    var daChina = da + 140 * k, tChina = 250 * k;
    t.traccia(null, function (w, h) { return contorno(w, h, bd.rag, bd.sp, caso(seme + ':china')); },
      'dg-china', daChina, tChina, { 'stroke-width': Math.max(1, bd.sp), stroke: bd.colore });
    var daRetino = da + 220 * k, tRetino = 170 * k;
    el.style.setProperty('--dg-da-retino', daRetino + 'ms');
    el.style.setProperty('--dg-retino', tRetino + 'ms');
    el.classList.add('dg-in');
    var daPulizia = daChina + tChina;
    matite.style.setProperty('--dg-da-pulizia', daPulizia + 'ms');
    if (o.emanata) segno(t.traccia, o.emanata, daPulizia);
    setTimeout(function () {
      el.classList.remove('dg-in');
      el.style.removeProperty('--dg-da-retino');
      el.style.removeProperty('--dg-retino');
    }, daRetino + tRetino);
    setTimeout(function () { t.s.remove(); delete el.dataset.dgIn; }, daPulizia + 170 + (o.emanata ? 900 : 0));
  }

  function segno(fai, tipo, da) {
    if (tipo === 'rabbia') {
      var R = 11;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (v, i) {
        fai(null, function () {
          return 'M' + (-3 + v[0] * 3) + ',' + (-3 + v[1] * R) + ' Q' + (-3 + v[0] * 3) + ',' + (-3 + v[1] * 3) + ' ' + (-3 + v[0] * R) + ',' + (-3 + v[1] * 3);
        }, 'dg-emanata dg-rabbia', da + i * 45, 45);
      });
    } else if (tipo === 'scintille') {
      [[0, -14], [11, -9], [14, 2]].forEach(function (v, i) {
        fai(null, function (w) {
          return 'M' + (w + 2 + v[0] * 0.35) + ',' + (-2 + v[1] * 0.35) + ' L' + (w + 2 + v[0]) + ',' + (-2 + v[1]);
        }, 'dg-emanata dg-scintille', da + i * 45, 45);
      });
    }
  }

  var coda = [];

  function chiedi(el, o) {
    if (el && !el.dataset.dgIn) coda.push([el, o || {}]);
  }

  function esegui() {
    var giro1 = coda;
    coda = [];
    if (!giro1.length || meno()) return 0;
    var misure = giro1.map(function (x) { return misura(x[0]); });
    var fatti = 0;
    giro1.forEach(function (x, i) {
      if (x[0].dataset.dgIn || !disegnabile(x[0], misure[i])) return;
      traccia(x[0], misure[i], x[1]);
      fatti++;
    });
    return fatti;
  }

  function disegna(el, o) {
    chiedi(el, o);
    return esegui() > 0;
  }

  function durataUscita() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--t-uscita').trim();
    var n = parseFloat(v) || 0;
    return /ms$/.test(v) ? n : n * 1000;
  }

  function cancella(el) {
    if (!el || meno()) return false;
    var m = misura(el);
    var b = m.r;
    var su = Math.max(b.top, 0), giu = Math.min(b.bottom, window.innerHeight);
    if (giu - su < 8 || b.width < 8) return false;
    var dur = durataUscita();
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'dg-tela');
    s.setAttribute('aria-hidden', 'true');
    s.style.zIndex = m.z;
    s.style.position = 'fixed';
    s.style.left = b.left + 'px';
    s.style.top = su + 'px';
    var w = b.width, h = giu - su;
    s.setAttribute('width', w);
    s.setAttribute('height', h);
    var spessore = Math.max(36, Math.min(90, h / 5));
    var d = 'M' + (-spessore) + ',' + (spessore / 2);
    for (var i = 0; i < Math.ceil(h / (spessore * 0.8)); i++) {
      var y = spessore / 2 + i * spessore * 0.8;
      d += ' L' + (w + spessore) + ',' + f(y + spessore * 0.4) + ' L' + (-spessore) + ',' + f(y + spessore * 0.8);
    }
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '1');
    p.setAttribute('class', 'dg-bianchetto dg-traccia');
    p.setAttribute('stroke-width', spessore);
    p.style.setProperty('--dg-dur', dur + 'ms');
    p.style.setProperty('--dg-passi', passi(dur));
    s.appendChild(p);
    document.body.appendChild(s);
    setTimeout(function () { s.remove(); }, dur + 20);
    return true;
  }

  var fila = 0, filaT = 0;
  function turno() {
    var ora = performance.now();
    if (ora - filaT > 350) fila = 0;
    filaT = ora;
    return fila++ * PASSO_FILA;
  }

  function scena(pannello) {
    if (meno()) return;
    var tutte = [].slice.call(pannello.querySelectorAll('.carta'));
    var guida = document.querySelector('#pagina-testata > .guida-scheda');
    if (guida) tutte.unshift(guida);
    tutte.forEach(function (e) { delete e.dataset.dgFatto; });
    var misure = tutte.map(misura);
    var inVista = tutte.map(function (e, i) { return [e, misure[i]]; })
      .filter(function (x) { return !x[0].dataset.dgIn && disegnabile(x[0], x[1]); })
      .sort(function (x, y) { return (x[1].r.top - y[1].r.top) || (x[1].r.left - y[1].r.left); });
    inVista.forEach(function (x, i) { traccia(x[0], x[1], { da: i * PASSO_FILA }); });
    fila = inVista.length;
    filaT = performance.now();
  }

  var FINESTRE = [['bv-velo', '.bv-carta'], ['giro-velo', '.giro-carta']];

  function sulleClassi(mosse) {
    for (var i = 0; i < mosse.length; i++) {
      var m = mosse[i], el = m.target;
      if (!(el instanceof HTMLElement)) continue;
      var prima = ' ' + String(m.oldValue || '') + ' ';
      var diventa = function (c) { return el.classList.contains(c) && prima.indexOf(' ' + c + ' ') < 0; };
      if (el.classList.contains('pannello-scheda')) {
        if (diventa('visibile')) scena(el);
        if (diventa('esce')) cancella(el);
      } else if (el.classList.contains('carta')) {
        if (diventa('dentro') && !el.dataset.dgFatto) chiedi(el, { da: turno() });
      } else if (el.classList.contains('toast')) {
        if (diventa('esce')) cancella(el);
      } else if (el === document.body) {
        if (diventa('menu-aperto')) {
          [].slice.call(document.querySelectorAll('#nav-drawer > .drawer-grp')).forEach(function (g, j) {
            chiedi(g, { da: 60 + j * PASSO_FILA, veloce: true });
          });
        }
      } else if (el.id === 'cerca-overlay') {
        if (diventa('aperto')) chiedi(el.querySelector('.cerca-box'));
      } else {
        for (var j = 0; j < FINESTRE.length; j++) {
          if (el.classList.contains(FINESTRE[j][0]) && diventa('dentro')) chiedi(el.querySelector(FINESTRE[j][1]));
        }
      }
    }
    esegui();
  }

  function sulleAggiunte(mosse) {
    for (var i = 0; i < mosse.length; i++) {
      var nuovi = mosse[i].addedNodes;
      for (var j = 0; j < nuovi.length; j++) {
        var n = nuovi[j];
        if (!(n instanceof HTMLElement)) continue;
        if (n.classList.contains('pannello-scheda') && n.classList.contains('visibile')) scena(n);
        else if (n.classList.contains('toast')) chiedi(n, { veloce: true, emanata: n.classList.contains('errore') ? 'rabbia' : 'scintille' });
        else if (n.classList.contains('cookie-banner') || n.classList.contains('aiuto-banner')) chiedi(n, { veloce: true });
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
    if (meno() || !document.body.classList.contains('vetrina') || !('IntersectionObserver' in window)) return;
    var radice = document.querySelector('main') || document.body;
    var io = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (!v.isIntersecting) return;
        io.unobserve(v.target);
        v.target.classList.remove('dg-attesa');
        chiedi(v.target, { da: turno() });
      });
      esegui();
    }, { threshold: 0 });
    var alto = window.innerHeight;
    var fuori = vignetteDi(radice).filter(function (e) {
      var r = e.getBoundingClientRect();
      return !(r.bottom > 0 && r.top < alto);
    });
    fuori.forEach(function (e) { e.classList.add('dg-attesa'); io.observe(e); });
  }

  function avvia() {
    new MutationObserver(sulleClassi).observe(document.body, { attributes: true, attributeOldValue: true, subtree: true, attributeFilter: ['class'] });
    var app = document.getElementById('app');
    if (app) new MutationObserver(sulleAggiunte).observe(app, { childList: true });
    var avvisi = document.getElementById('toast-box');
    if (avvisi) new MutationObserver(sulleAggiunte).observe(avvisi, { childList: true });
    new MutationObserver(sulleAggiunte).observe(document.body, { childList: true });
    [].slice.call(document.querySelectorAll('.cookie-banner:not([hidden])')).forEach(function (e) { chiedi(e, { veloce: true }); });
    esegui();
    (window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); })(vetrina);
  }

  avvia();
  window.SB_DISEGNO = { disegna: disegna, cancella: cancella, scena: scena };
})();
