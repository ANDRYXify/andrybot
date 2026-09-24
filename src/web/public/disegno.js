// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var DUE = 1000 / 12;
  var PASSO_FILA = 70;

  function disegni(ms) { return Math.max(2, Math.round(ms / DUE)); }
  function passi(n) { return 'steps(' + n + ', jump-end)'; }
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

  function spigoli(w, h, seme) {
    var r = caso(seme + ':urlo');
    var e = 4, W = w + 2 * e, H = h + 2 * e, P = 2 * (W + H);
    function sul(t) {
      t = ((t % P) + P) % P;
      if (t < W) return [t - e, -e, 0, -1];
      if (t < W + H) return [w + e, t - W - e, 1, 0];
      if (t < 2 * W + H) return [w + e - (t - W - H), h + e, 0, 1];
      return [-e, h + e - (t - 2 * W - H), -1, 0];
    }
    var n = Math.max(14, Math.round(P / 30)), passo = P / n;
    var d = '';
    for (var i = 0; i < n; i++) {
      var a = sul(i * passo), m = sul((i + 0.5) * passo + (r() - 0.5) * passo * 0.3);
      var fuori = 10 + r() * 9;
      d += (i ? ' L' : 'M') + f(a[0]) + ',' + f(a[1]) + ' L' + f(m[0] + m[2] * fuori) + ',' + f(m[1] + m[3] * fuori);
    }
    return d + ' Z';
  }

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
    var urlo = el.classList.contains('dg-urlo');
    return {
      r: el.getBoundingClientRect(),
      bordo: urlo ? { sp: SP_URLO, urlo: true, rag: 0 }
        : (st.borderTopStyle === 'none' || sp < 0.5 || trasparente) ? null : { sp: sp, colore: colore, rag: parseFloat(st.borderTopLeftRadius) || 0 },
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
    var bd = m.bordo;
    var tratti = [];
    var tLato = 125 * k, passo = 60 * k;
    [0, 1, 2, 3].forEach(function (i) {
      tratti.push({ matita: true, classe: 'dg-matita', da: da + i * passo, dur: tLato,
        fa: function (w, h) { var l = lato(i, w, h); return tratto(l[0], l[1], l[2], l[3], caso(seme + ':' + i), 7, 2.6); } });
    });
    if (!o.veloce) {
      tratti.push({ matita: true, classe: 'dg-matita', da: da + 4 * passo, dur: tLato,
        fa: function (w, h) { var l = lato(0, w, h); return tratto(l[0], l[1], l[2], l[3], caso(seme + ':ripasso'), 4, 2); } });
    }
    var daChina = da + 140 * k, tChina = 250 * k;
    tratti.push(bd.urlo
      ? { classe: 'dg-china dg-urlo-china', da: daChina, dur: tChina, fa: function (w, h) { return spigoli(w, h, seme); } }
      : { classe: 'dg-china', da: daChina, dur: tChina, extra: { 'stroke-width': Math.max(1, bd.sp), stroke: bd.colore },
        fa: function (w, h) { return contorno(w, h, bd.rag, bd.sp, caso(seme + ':china')); } });
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

  function chiedi(el, o, via) {
    if (el && (via || !el.dataset.dgIn)) coda.push([el, o || {}, !!via]);
  }

  function esegui() {
    var giro1 = coda;
    coda = [];
    if (!giro1.length || meno()) return 0;
    var misure = giro1.map(function (x) { return misura(x[0]); });
    var fatti = 0;
    giro1.forEach(function (x, i) {
      if (!disegnabile(x[0], misure[i])) return;
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

  var fila = 0, filaT = 0;
  function turno() {
    var ora = performance.now();
    if (ora - filaT > 350) fila = 0;
    filaT = ora;
    return fila++ * PASSO_FILA;
  }

  function vignetteDellaScena(pannello) {
    var tutte = [].slice.call(pannello.querySelectorAll('.carta'));
    var guida = document.querySelector('#pagina-testata > .guida-scheda');
    if (guida) tutte.unshift(guida);
    return tutte;
  }

  function scena(pannello) {
    if (meno()) return;
    var tutte = vignetteDellaScena(pannello);
    tutte.forEach(function (e) { delete e.dataset.dgFatto; });
    var misure = tutte.map(misura);
    var inVista = tutte.map(function (e, i) { return [e, misure[i]]; })
      .filter(function (x) { return !x[0].dataset.dgIn && disegnabile(x[0], x[1]); })
      .sort(function (x, y) { return (x[1].r.top - y[1].r.top) || (x[1].r.left - y[1].r.left); });
    inVista.forEach(function (x, i) { traccia(x[0], x[1], { da: i * PASSO_FILA }); });
    fila = inVista.length;
    filaT = performance.now();
  }

  function esceScena(pannello) {
    if (meno()) return;
    var tutte = vignetteDellaScena(pannello);
    var misure = tutte.map(misura);
    tutte.forEach(function (e, i) { if (disegnabile(e, misure[i])) sfila(e, misure[i], {}); });
  }

  function urlo(carta) {
    if (!carta || carta.classList.contains('dg-urlo')) return;
    var M = 26;
    var seme = semeDi(carta);
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'dg-sagoma');
    s.setAttribute('aria-hidden', 'true');
    var ombra = document.createElementNS(NS, 'path');
    ombra.setAttribute('class', 'dg-ombra');
    ombra.setAttribute('transform', 'translate(5 5)');
    var fondo = document.createElementNS(NS, 'path');
    fondo.setAttribute('class', 'dg-fondo');
    s.appendChild(ombra);
    s.appendChild(fondo);
    function adatta(voci) {
      var b = voci && voci[0].borderBoxSize && voci[0].borderBoxSize[0];
      var w = b ? b.inlineSize : carta.offsetWidth, h = b ? b.blockSize : carta.offsetHeight;
      s.style.left = s.style.top = -M + 'px';
      s.setAttribute('width', w + 2 * M);
      s.setAttribute('height', h + 2 * M);
      s.setAttribute('viewBox', (-M) + ' ' + (-M) + ' ' + (w + 2 * M) + ' ' + (h + 2 * M));
      var d = spigoli(w, h, seme);
      ombra.setAttribute('d', d);
      fondo.setAttribute('d', d);
    }
    carta.classList.add('dg-urlo');
    carta.insertBefore(s, carta.firstChild);
    adatta();
    if ('ResizeObserver' in window) new ResizeObserver(adatta).observe(carta);
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
    if (!ev.isTrusted || ev.button > 0 || meno()) return;
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

  var FINESTRE = [['bv-velo', '.bv-carta'], ['giro-velo', '.giro-carta']];

  function sulleClassi(mosse) {
    for (var i = 0; i < mosse.length; i++) {
      var m = mosse[i], el = m.target;
      if (!(el instanceof HTMLElement)) continue;
      var prima = ' ' + String(m.oldValue || '') + ' ';
      var diventa = function (c) { return el.classList.contains(c) && prima.indexOf(' ' + c + ' ') < 0; };
      var perde = function (c) { return !el.classList.contains(c) && prima.indexOf(' ' + c + ' ') >= 0; };
      if (el.classList.contains('pannello-scheda')) {
        if (diventa('visibile')) scena(el);
        if (diventa('esce')) esceScena(el);
      } else if (el.classList.contains('carta')) {
        if (diventa('dentro') && !el.dataset.dgFatto) chiedi(el, { da: turno() });
      } else if (el.classList.contains('toast') || el.classList.contains('rec-invito')) {
        if (diventa('esce')) chiedi(el, { veloce: true }, true);
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
          if (!el.classList.contains(FINESTRE[j][0])) continue;
          var carta = el.querySelector(FINESTRE[j][1]);
          if (diventa('dentro') && carta && carta.querySelector('.btn.pericolo')) urlo(carta);
          if (diventa('dentro')) chiedi(carta);
          if (perde('dentro')) chiedi(carta, {}, true);
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
        else if (n.classList.contains('cookie-banner') || n.classList.contains('aiuto-banner') || n.classList.contains('rec-invito')) chiedi(n, { veloce: true });
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
    document.addEventListener('click', ripassa, true);
    [].slice.call(document.querySelectorAll('.cookie-banner:not([hidden])')).forEach(function (e) { chiedi(e, { veloce: true }); });
    esegui();
    (window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); })(vetrina);
  }

  avvia();
  window.SB_DISEGNO = { disegna: disegna, disfa: disfa, scena: scena };
})();
