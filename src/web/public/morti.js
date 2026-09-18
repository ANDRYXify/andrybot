// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';

  var LARGA = 9;
  var ALTA = 8;
  var SOGLIA = 8;
  var RIARMO_MS = 4000;

  function ritaglio(larghezza, altezza) {
    var w = Number(larghezza) || 0;
    var h = Number(altezza) || 0;
    if (w <= 0 || h <= 0) return { x: 0, y: 0, w: 0, h: 0 };
    if (w * 9 > h * 16) { var cw = Math.round(h * 16 / 9); return { x: Math.round((w - cw) / 2), y: 0, w: cw, h: h }; }
    var ch = Math.round(w * 9 / 16);
    return { x: 0, y: Math.round((h - ch) / 2), w: w, h: ch };
  }

  function impronta(grigi, larghezza, altezza) {
    var w = larghezza || LARGA;
    var h = altezza || ALTA;
    if (!grigi || grigi.length < w * h) return '';
    var bit = [];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w - 1; x++) {
        var i = y * w + x;
        bit.push(grigi[i] > grigi[i + 1] ? 1 : 0);
      }
    }
    var hex = '';
    for (var k = 0; k < bit.length; k += 4) {
      var n = (bit[k] << 3) | (bit[k + 1] << 2) | (bit[k + 2] << 1) | bit[k + 3];
      hex += n.toString(16);
    }
    return hex;
  }

  var CONTA = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

  var ESA = /^[0-9a-f]+$/;

  function distanza(a, b) {
    var x = String(a || '');
    var y = String(b || '');
    if (!x || !y || x.length !== y.length) return 64;
    if (!ESA.test(x) || !ESA.test(y)) return 64;
    var d = 0;
    for (var i = 0; i < x.length; i++) d += CONTA[parseInt(x[i], 16) ^ parseInt(y[i], 16)];
    return d;
  }

  function vicina(schermate, f, soglia) {
    var s = typeof soglia === 'number' ? soglia : SOGLIA;
    var lista = Array.isArray(schermate) ? schermate : [];
    var best = null;
    for (var i = 0; i < lista.length; i++) {
      var firme = (lista[i] && Array.isArray(lista[i].firme)) ? lista[i].firme : [];
      for (var k = 0; k < firme.length; k++) {
        var d = distanza(firme[k], f);
        if (d > s) continue;
        if (!best || d < best.distanza) best = { quale: lista[i], distanza: d, i: i, firma: firme[k] };
      }
    }
    return best;
  }

  function guarda(stato, opz) {
    var st = stato || {};
    var o = opz || {};
    var ora = typeof o.ora === 'number' ? o.ora : Date.now();
    var riarmo = typeof o.riarmoMs === 'number' ? o.riarmoMs : RIARMO_MS;
    var dentro = !!o.dentro;
    var eraDentro = !!st.dentro;
    var ultima = Number(st.ultima) || 0;
    var conta = dentro && !eraDentro && (!ultima || (ora - ultima) >= riarmo);
    return { conta: conta, stato: { dentro: dentro, ultima: conta ? ora : ultima } };
  }

  window.SB_MORTI = {
    impronta: impronta, distanza: distanza, vicina: vicina, guarda: guarda, ritaglio: ritaglio,
    LARGA: LARGA, ALTA: ALTA, SOGLIA: SOGLIA, RIARMO_MS: RIARMO_MS,
  };
})();
