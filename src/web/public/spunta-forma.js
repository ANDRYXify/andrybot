// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';

  var LATO = [5.4, 14.6];
  var ORLO = 0.35;
  var PALLINO = 1.9;
  var CERCHIO = 4.8;

  function f(n) { return Math.round(n * 10) / 10; }
  function c(p) { return f(p[0]) + ',' + f(p[1]); }

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

  function fra(r, a, b) { return a + (b - a) * r(); }
  function scarto(r, m) { return (r() - 0.5) * 2 * m; }
  function verso(a, b) { var l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; }
  function lungo2(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }

  function bez(s, t) {
    var u = 1 - t;
    return [u * u * u * s[0][0] + 3 * u * u * t * s[1][0] + 3 * u * t * t * s[2][0] + t * t * t * s[3][0],
      u * u * u * s[0][1] + 3 * u * u * t * s[1][1] + 3 * u * t * t * s[2][1] + t * t * t * s[3][1]];
  }

  function campiona(segmenti, n) {
    var pts = [];
    segmenti.forEach(function (s, i) { for (var j = i ? 1 : 0; j <= n; j++) pts.push(bez(s, j / n)); });
    var L = [0];
    for (var i = 1; i < pts.length; i++) L.push(L[i - 1] + lungo2(pts[i - 1], pts[i]));
    var tot = L[L.length - 1] || 1;
    return pts.map(function (p, i) { return { x: p[0], y: p[1], u: L[i] / tot }; });
  }

  function arco(cx, cy, r0, r1, a0, a1, rnd, tremo, posa) {
    posa = posa || function (q) { return q; };
    var n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2)));
    var out = '';
    for (var i = 0; i < n; i++) {
      var t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n;
      var q0 = r0 + (r1 - r0) * i / n, q1 = r0 + (r1 - r0) * (i + 1) / n;
      var k = 4 / 3 * Math.tan((t1 - t0) / 4);
      var j = rnd ? 1 + scarto(rnd, tremo) : 1;
      var p0 = [cx + q0 * Math.cos(t0), cy + q0 * Math.sin(t0)];
      var p3 = [cx + q1 * j * Math.cos(t1), cy + q1 * j * Math.sin(t1)];
      var p1 = [p0[0] - k * q0 * Math.sin(t0), p0[1] + k * q0 * Math.cos(t0)];
      var p2 = [p3[0] + k * q1 * j * Math.sin(t1), p3[1] - k * q1 * j * Math.cos(t1)];
      if (!i) out += 'M' + c(posa(p0));
      out += ' C' + c(posa(p1)) + ' ' + c(posa(p2)) + ' ' + c(posa(p3));
    }
    return out;
  }

  function ovale(cx, cy, k, asse) {
    var cs = Math.cos(asse), sn = Math.sin(asse);
    return function (q) {
      var x = q[0] - cx, y = q[1] - cy;
      var u = x * cs + y * sn, v = (-x * sn + y * cs) * k;
      return [cx + u * cs - v * sn, cy + u * sn + v * cs];
    };
  }

  function casella(r) {
    var cx = 10 + scarto(r, 0.2), cy = 10 + scarto(r, 0.2);
    var giro = scarto(r, 0.06);
    var mw = (LATO[1] - LATO[0]) / 2 * fra(r, 0.95, 1.03), mh = mw * (1 + scarto(r, 0.04));
    var cs = Math.cos(giro), sn = Math.sin(giro);
    function posa(x, y) { return [cx + x * cs - y * sn, cy + x * sn + y * cs]; }
    var P = [posa(-mw + scarto(r, 0.4), -mh + scarto(r, 0.4)), posa(mw + scarto(r, 0.4), -mh + scarto(r, 0.4)),
      posa(mw + scarto(r, 0.4), mh + scarto(r, 0.4)), posa(-mw + scarto(r, 0.4), mh + scarto(r, 0.4))];
    var R = P.map(function () { return fra(r, 0.25, 1.1); });
    var su = verso(P[0], P[1]), giu = [-su[1], su[0]];
    var L01 = lungo2(P[0], P[1]);
    var parte = L01 * fra(r, 0.15, 0.42);
    var S = [P[0][0] + su[0] * parte, P[0][1] + su[1] * parte];
    var alza = fra(r, 0, 0.35), indietro = fra(r, 0.2, 0.6);
    var out = 'M' + c([S[0] - su[0] * indietro - giu[0] * alza, S[1] - su[1] * indietro - giu[1] * alza]);
    var da = S;
    for (var i = 0; i < 4; i++) {
      var a = P[i], b = P[(i + 1) % 4], d = verso(a, b), n = [-d[1], d[0]];
      var fine = [b[0] - d[0] * R[(i + 1) % 4], b[1] - d[1] * R[(i + 1) % 4]];
      var L = lungo2(da, fine);
      var k1 = scarto(r, 0.5), k2 = scarto(r, 0.5);
      if (i === 0) out += ' Q' + c(S) + ' ' + c([S[0] + d[0] * L * 0.15, S[1] + d[1] * L * 0.15]);
      var da2 = i === 0 ? [S[0] + d[0] * L * 0.15, S[1] + d[1] * L * 0.15] : da;
      var L2 = lungo2(da2, fine);
      out += ' C' + c([da2[0] + d[0] * L2 / 3 + n[0] * k1, da2[1] + d[1] * L2 / 3 + n[1] * k1]) + ' ' +
        c([da2[0] + d[0] * L2 * 2 / 3 + n[0] * k2, da2[1] + d[1] * L2 * 2 / 3 + n[1] * k2]) + ' ' + c(fine);
      var poi = verso(b, P[(i + 2) % 4]);
      da = [b[0] + poi[0] * R[(i + 1) % 4], b[1] + poi[1] * R[(i + 1) % 4]];
      out += ' Q' + c(b) + ' ' + c(da);
    }
    var oltre = parte + fra(r, 0.6, 1.9), deriva = fra(r, 0.15, 0.55);
    var chiude = [P[0][0] + su[0] * oltre + giu[0] * deriva, P[0][1] + su[1] * oltre + giu[1] * deriva];
    out += ' C' + c([da[0] + (chiude[0] - da[0]) / 3, da[1] + (chiude[1] - da[1]) / 3]) + ' ' +
      c([da[0] + (chiude[0] - da[0]) * 2 / 3 + giu[0] * scarto(r, 0.2), da[1] + (chiude[1] - da[1]) * 2 / 3 + giu[1] * scarto(r, 0.2)]) + ' ' + c(chiude);
    var ripasso = '';
    if (r() < 0.6) {
      var q = Math.floor(r() * 4), A = P[q], B = P[(q + 1) % 4], dq = verso(A, B), nq = [-dq[1], dq[0]];
      var Lq = lungo2(A, B), t0 = fra(r, 0.12, 0.4), t1 = t0 + fra(r, 0.3, 0.5), o = (r() < 0.5 ? -1 : 1) * fra(r, 0.3, 0.55);
      var r0 = [A[0] + dq[0] * Lq * t0 + nq[0] * o, A[1] + dq[1] * Lq * t0 + nq[1] * o];
      var r1 = [A[0] + dq[0] * Lq * t1 + nq[0] * (o + scarto(r, 0.2)), A[1] + dq[1] * Lq * t1 + nq[1] * (o + scarto(r, 0.2))];
      var rm = [(r0[0] + r1[0]) / 2 + nq[0] * scarto(r, 0.25), (r0[1] + r1[1]) / 2 + nq[1] * scarto(r, 0.25)];
      ripasso = 'M' + c(r0) + ' Q' + c(rm) + ' ' + c(r1);
    }
    return { fondo: out, ripasso: ripasso, tratto: Math.round(fra(r, 0.95, 1.2) * 100) / 100, angoli: P };
  }

  function spunta(r, box) {
    var xs = box.angoli.map(function (p) { return p[0]; }), ys = box.angoli.map(function (p) { return p[1]; });
    var Lx = Math.min.apply(null, xs), Rx = Math.max.apply(null, xs), Ty = Math.min.apply(null, ys), By = Math.max.apply(null, ys);
    var W = Rx - Lx, H = By - Ty;
    var p0 = [Lx - fra(r, 0.9, 2.2), Ty + H * fra(r, 0.36, 0.6)];
    var vt = [Lx + W * fra(r, 0.28, 0.44), By + fra(r, -0.7, 0.5)];
    var e = [Rx + fra(r, 0.8, 2.4), Ty - fra(r, 1.1, 2.8)];
    var d1 = verso(p0, vt), n1 = [-d1[1], d1[0]], l1 = lungo2(p0, vt);
    var d2 = verso(vt, e), n2 = [-d2[1], d2[0]], l2 = lungo2(vt, e);
    var b1 = scarto(r, 0.5), b2 = scarto(r, 0.35), b3 = fra(r, -0.2, 0.9), b4 = scarto(r, 0.5);
    var pts = campiona([
      [p0, [p0[0] + d1[0] * l1 * 0.35 + n1[0] * b1, p0[1] + d1[1] * l1 * 0.35 + n1[1] * b1],
        [p0[0] + d1[0] * l1 * 0.78 + n1[0] * b2, p0[1] + d1[1] * l1 * 0.78 + n1[1] * b2], vt],
      [vt, [vt[0] + d2[0] * l2 * 0.3 + n2[0] * b3, vt[1] + d2[1] * l2 * 0.3 + n2[1] * b3],
        [vt[0] + d2[0] * l2 * 0.7 + n2[0] * b4, vt[1] + d2[1] * l2 * 0.7 + n2[1] * b4], e]
    ], 8);
    var trem = fra(r, 0.04, 0.13), freq = fra(r, 1.5, 3), fase = r() * Math.PI * 2;
    pts.forEach(function (p, i) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], d = verso([a.x, a.y], [b.x, b.y]);
      var o = trem * Math.sin(Math.PI * 2 * (freq * p.u) + fase) * Math.sin(Math.PI * p.u);
      p.x += -d[1] * o; p.y += d[0] * o;
    });
    var largo = fra(r, 2.4, 3.2), picco = fra(r, 0.3, 0.55);
    var sx = Infinity, dx = -Infinity;
    pts.forEach(function (p) { sx = Math.min(sx, p.x); dx = Math.max(dx, p.x); });
    var sposta = (Lx + Rx) / 2 - (sx + dx) / 2;
    pts.forEach(function (p) { p.x += sposta; });
    return { punti: pts, largo: largo, picco: picco };
  }

  function spessore(v, u) {
    var p = u < v.picco ? Math.sin(Math.PI / 2 * u / v.picco) : Math.cos(Math.PI / 2 * Math.min(0.94, (u - v.picco) / (1 - v.picco)));
    return v.largo * (0.22 + 0.78 * p) / 2;
  }

  function inchiostro(v, quanto) {
    var punti = v.punti, vis = [];
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
      var d = verso([a.x, a.y], [b.x, b.y]), w = spessore(v, p.u);
      sx.push([p.x - d[1] * w, p.y + d[0] * w]);
      dx.push([p.x + d[1] * w, p.y - d[0] * w]);
    });
    return 'M' + sx.concat(dx.reverse()).map(c).join(' L') + ' Z';
  }

  function pallino(r) {
    var cx = 10 + scarto(r, 0.2), cy = 10 + scarto(r, 0.2);
    var R = CERCHIO * fra(r, 0.98, 1.04), a = r() * Math.PI * 2;
    var giri = fra(r, 2.1, 2.45), finale = R * (1 + scarto(r, 0.06));
    var forma = ovale(cx, cy, fra(r, 0.94, 1), r() * Math.PI);
    var px = cx + scarto(r, 0.2), py = cy + scarto(r, 0.2);
    var mezzo = fra(r, 2.0, 2.35) - PALLINO / 2;
    var b = a + fra(r, 0.6, 2.4), spire = fra(r, 2.4, 3.6);
    var chiuso = arco(px, py, mezzo, mezzo, b + Math.PI * spire, b + Math.PI * (spire + 2), r, 0.04);
    return {
      fondo: arco(cx, cy, R, finale, a, a + Math.PI * giri, r, 0.035, forma),
      segno: arco(px, py, 0.15, mezzo, b, b + Math.PI * spire, r, 0.03) + chiuso.slice(chiuso.indexOf(' C')),
      tratto: Math.round(fra(r, 0.95, 1.2) * 100) / 100, centro: [cx, cy], punto: [px, py], raggio: R, fuori: mezzo + PALLINO / 2
    };
  }

  function cifra(v) {
    var t = String(Math.round(v * 10) / 10 || 0);
    return t.replace(/^(-?)0\./, '$1.');
  }

  function compatto(d) {
    var out = '', x = 0, y = 0, prima = '';
    d.replace(/([MCQLZ])([^MCQLZ]*)/g, function (_, cmd, resto) {
      var n = (resto.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      if (cmd === 'Z') { out += 'z'; prima = 'z'; return ''; }
      if (cmd === 'M') { x = n[n.length - 2]; y = n[n.length - 1]; out += 'M' + cifra(x) + ',' + cifra(y); prima = 'M'; return ''; }
      var lettera = cmd.toLowerCase(), pezzi = [];
      for (var i = 0; i + 1 < n.length; i += 2) {
        var dy = cifra(n[i + 1] - y);
        pezzi.push(cifra(n[i] - x) + (dy.charAt(0) === '-' ? '' : ',') + dy);
      }
      var passo = cmd === 'C' ? 3 : cmd === 'Q' ? 2 : 1;
      for (var k = passo - 1; k < pezzi.length; k += passo) { x = n[2 * k]; y = n[2 * k + 1]; }
      var corpo = pezzi.reduce(function (acc, q) { return acc + (acc && q.charAt(0) !== '-' ? ' ' : '') + q; }, '');
      out += (lettera === prima ? (corpo.charAt(0) === '-' ? '' : ' ') : lettera) + corpo;
      prima = lettera;
      return '';
    });
    return out;
  }

  var forme = {};
  function forma(tipo, seme) {
    var k = (tipo === 'radio' ? 'radio' : 'checkbox') + ':' + seme;
    if (!forme[k]) {
      var r = caso('spunta:' + k);
      if (tipo === 'radio') forme[k] = pallino(r);
      else { var box = casella(r); box.v = spunta(r, box); forme[k] = box; }
    }
    return forme[k];
  }

  function svg(tipo, seme, quanto, colori) {
    var p = forma(tipo, seme);
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="' + compatto(p.fondo) +
      '" stroke="' + colori.matita + '" stroke-width="' + p.tratto + '"/>';
    if (p.ripasso) s += '<path d="' + compatto(p.ripasso) + '" stroke="' + colori.matita + '" stroke-width="' + Math.round(p.tratto * 70) / 100 + '" stroke-opacity=".55"/>';
    if (quanto > 0 && tipo === 'radio') {
      s += '<path id="segno" d="' + compatto(p.segno) + '" stroke="' + colori.china + '" stroke-width="' + PALLINO + '"' +
        ' pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="' + f(1 - quanto) + '"/>';
    } else if (quanto > 0) {
      s += '<path id="segno" d="' + compatto(inchiostro(p.v, quanto)) + '" fill="' + colori.china + '" stroke="' + colori.china + '" stroke-width="' + ORLO + '"/>';
    }
    return s + '</svg>';
  }

  radice.SB_SPUNTA = { LATO: LATO, ORLO: ORLO, PALLINO: PALLINO, CERCHIO: CERCHIO, forma: forma, inchiostro: inchiostro, compatto: compatto, svg: svg };
})(typeof window !== 'undefined' ? window : globalThis);
