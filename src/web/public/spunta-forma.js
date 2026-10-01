// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';

  var VARIANTI = 6;
  var LATO = [5.4, 14.6];
  var MATITA = 1.05;
  var LARGO = 2.9;
  var ORLO = 0.35;
  var PALLINO = 1.9;
  var CERCHIO = 4.8;
  var SEGNO = 2.45;

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

  function variante(seme) { return Math.floor(caso(seme)() * VARIANTI); }

  function bez(s, t) {
    var u = 1 - t;
    return [u * u * u * s[0][0] + 3 * u * u * t * s[1][0] + 3 * u * t * t * s[2][0] + t * t * t * s[3][0],
      u * u * u * s[0][1] + 3 * u * u * t * s[1][1] + 3 * u * t * t * s[2][1] + t * t * t * s[3][1]];
  }

  function lungo(segmenti, n) {
    var pts = [];
    segmenti.forEach(function (s, i) { for (var j = i ? 1 : 0; j <= n; j++) pts.push(bez(s, j / n)); });
    var L = [0];
    for (var i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    var tot = L[L.length - 1] || 1;
    return pts.map(function (p, i) { return { x: p[0], y: p[1], u: L[i] / tot }; });
  }

  function inchiostro(punti, quanto) {
    var vis = [];
    for (var i = 0; i < punti.length; i++) {
      var p = punti[i];
      if (p.u <= quanto) { vis.push(p); continue; }
      var a = punti[i - 1], k = (quanto - a.u) / ((p.u - a.u) || 1);
      vis.push({ x: a.x + (p.x - a.x) * k, y: a.y + (p.y - a.y) * k, u: quanto });
      break;
    }
    if (vis.length < 2) return '';
    var sx = [], dx = [];
    vis.forEach(function (p, i) {
      var a = vis[Math.max(0, i - 1)], b = vis[Math.min(vis.length - 1, i + 1)];
      var tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
      var w = LARGO * (0.25 + 0.75 * Math.max(0, Math.sin(Math.PI * Math.min(0.97, p.u)))) / 2;
      sx.push([p.x - ty / l * w, p.y + tx / l * w]);
      dx.push([p.x + ty / l * w, p.y - tx / l * w]);
    });
    return 'M' + sx.concat(dx.reverse()).map(function (q) { return f(q[0]) + ',' + f(q[1]); }).join(' L') + ' Z';
  }

  function arco(cx, cy, r0, r1, a0, a1, rnd) {
    var n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2)));
    var out = '';
    for (var i = 0; i < n; i++) {
      var t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n;
      var q0 = r0 + (r1 - r0) * i / n, q1 = r0 + (r1 - r0) * (i + 1) / n;
      var k = 4 / 3 * Math.tan((t1 - t0) / 4);
      var j = rnd ? 1 + (rnd() - 0.5) * 0.06 : 1;
      var p0 = [cx + q0 * Math.cos(t0), cy + q0 * Math.sin(t0)];
      var p3 = [cx + q1 * j * Math.cos(t1), cy + q1 * j * Math.sin(t1)];
      var p1 = [p0[0] - k * q0 * Math.sin(t0), p0[1] + k * q0 * Math.cos(t0)];
      var p2 = [p3[0] + k * q1 * j * Math.sin(t1), p3[1] - k * q1 * j * Math.cos(t1)];
      if (!i) out += 'M' + f(p0[0]) + ',' + f(p0[1]);
      out += ' C' + f(p1[0]) + ',' + f(p1[1]) + ' ' + f(p2[0]) + ',' + f(p2[1]) + ' ' + f(p3[0]) + ',' + f(p3[1]);
    }
    return out;
  }

  function casella(r) {
    function j(m) { return (r() - 0.5) * 2 * m; }
    var a0 = LATO[0], a1 = LATO[1];
    var P = [[a0 + j(0.3), a0 + j(0.3)], [a1 + j(0.3), a0 + j(0.3)], [a1 + j(0.3), a1 + j(0.3)], [a0 + j(0.3), a1 + j(0.3)]];
    var R = P.map(function () { return 0.55 + r() * 0.5; });
    function verso(a, b) { var l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; }
    function c(x) { return x.map(f).join(','); }
    var su = verso(P[0], P[1]);
    var L01 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
    var parte = L01 * (0.22 + r() * 0.12);
    var S = [P[0][0] + su[0] * parte, P[0][1] + su[1] * parte];
    var out = 'M' + c(S);
    var da = S;
    for (var i = 0; i < 4; i++) {
      var a = P[i], b = P[(i + 1) % 4], d = verso(a, b), n = [-d[1], d[0]];
      var fine = [b[0] - d[0] * R[(i + 1) % 4], b[1] - d[1] * R[(i + 1) % 4]];
      var L = Math.hypot(fine[0] - da[0], fine[1] - da[1]);
      var k1 = j(0.3), k2 = j(0.3);
      out += ' C' + c([da[0] + d[0] * L / 3 + n[0] * k1, da[1] + d[1] * L / 3 + n[1] * k1]) + ' ' +
        c([da[0] + d[0] * L * 2 / 3 + n[0] * k2, da[1] + d[1] * L * 2 / 3 + n[1] * k2]) + ' ' + c(fine);
      var poi = verso(b, P[(i + 2) % 4]);
      da = [b[0] + poi[0] * R[(i + 1) % 4], b[1] + poi[1] * R[(i + 1) % 4]];
      out += ' Q' + c(b) + ' ' + c(da);
    }
    var oltre = parte + 1.1 + r() * 0.6, deriva = 0.3 + r() * 0.15;
    var chiude = [P[0][0] + su[0] * oltre - su[1] * deriva, P[0][1] + su[1] * oltre + su[0] * deriva];
    out += ' C' + c([da[0] + (chiude[0] - da[0]) / 3, da[1] + (chiude[1] - da[1]) / 3]) + ' ' +
      c([da[0] + (chiude[0] - da[0]) * 2 / 3, da[1] + (chiude[1] - da[1]) * 2 / 3]) + ' ' + c(chiude);
    return out;
  }

  function spunta(r) {
    function j(m) { return (r() - 0.5) * 2 * m; }
    var p0 = [3.6 + j(0.3), 9.3 + j(0.3)], vt = [8.7 + j(0.3), 14.7 + j(0.25)], e = [16.7 + j(0.3), 3.4 + j(0.3)];
    return lungo([
      [p0, [p0[0] + 1.3, p0[1] + 1.9], [vt[0] - 1.0, vt[1] - 1.2], vt],
      [vt, [vt[0] + 1.6, vt[1] - 3.1], [e[0] - 3.0, e[1] + 3.9], e]
    ], 12);
  }

  function pallino(r) {
    var a = r() * Math.PI * 2;
    var giro = SEGNO - PALLINO / 2;
    var chiuso = arco(10, 10, giro, giro, a + 1 + Math.PI * 3, a + 1 + Math.PI * 5, null);
    return {
      fondo: arco(10, 10, CERCHIO, CERCHIO, a, a + Math.PI * 2.25, r),
      segno: arco(10, 10, 0.15, giro, a + 1, a + 1 + Math.PI * 3, r) + chiuso.slice(chiuso.indexOf(' C'))
    };
  }

  var forme = {};
  function forma(tipo, v) {
    var k = (tipo === 'radio' ? 'radio' : 'checkbox') + v;
    if (!forme[k]) {
      forme[k] = tipo === 'radio' ? pallino(caso('spunta:' + k))
        : { fondo: casella(caso('spunta:' + k + ':casella')), punti: spunta(caso('spunta:' + k)) };
    }
    return forme[k];
  }

  function svg(tipo, v, quanto, colori) {
    var p = forma(tipo, v);
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="' + p.fondo + '" fill="none" stroke="' + colori.matita +
      '" stroke-width="' + MATITA + '" stroke-linecap="round" stroke-linejoin="round"/>';
    if (quanto > 0 && tipo === 'radio') {
      s += '<path id="segno" d="' + p.segno + '" fill="none" stroke="' + colori.china + '" stroke-width="' + PALLINO + '" stroke-linecap="round"' +
        ' pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="' + f(1 - quanto) + '"/>';
    } else if (quanto > 0) {
      s += '<path id="segno" d="' + inchiostro(p.punti, quanto) + '" fill="' + colori.china + '" stroke="' + colori.china +
        '" stroke-width="' + ORLO + '" stroke-linejoin="round"/>';
    }
    return s + '</svg>';
  }

  radice.SB_SPUNTA = {
    VARIANTI: VARIANTI, LATO: LATO, MATITA: MATITA, ORLO: ORLO, CERCHIO: CERCHIO, SEGNO: SEGNO,
    variante: variante, forma: forma, inchiostro: inchiostro, svg: svg
  };
})(typeof window !== 'undefined' ? window : globalThis);
