// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  var D = window.SB_DISEGNO;
  if (!D || !D.estendi) return;
  var I = D.interno;
  var misura = I.misura, disegnabile = I.disegnabile, traccia = I.traccia, sfila = I.sfila, chiedi = I.chiedi;
  var compare = I.compare, via = I.via, lascia = I.lascia, siVede = I.siVede, contornato = I.contornato;
  var copertina = I.copertina, semeDi = I.semeDi, caso = I.caso, f = I.f, NS = I.NS, PASSO_FILA = I.PASSO_FILA;
  var tratto = I.tratto, disegni = I.disegni, DUE = I.DUE, RITORNO = I.RITORNO;

  var SP_VARIANTI = 6;
  var SP_LATO = [5.4, 14.6];
  var spColore = null;
  var spMemo = {};
  var spPezzi = {};

  function spColori() {
    if (spColore) return spColore;
    var r = getComputedStyle(document.documentElement);
    spColore = {
      china: (r.getPropertyValue('--contorno') || '').trim() || '#150910',
      matita: (r.getPropertyValue('--testo-3') || '').trim() || '#5f5a54'
    };
    return spColore;
  }

  function spArco(cx, cy, r0, r1, a0, a1, rnd) {
    var n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2)));
    var out = '';
    for (var i = 0; i < n; i++) {
      var t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n;
      var q0 = r0 + (r1 - r0) * i / n, q1 = r0 + (r1 - r0) * (i + 1) / n;
      var k = 4 / 3 * Math.tan((t1 - t0) / 4);
      var j = 1 + (rnd() - 0.5) * 0.06;
      var p0 = [cx + q0 * Math.cos(t0), cy + q0 * Math.sin(t0)];
      var p3 = [cx + q1 * j * Math.cos(t1), cy + q1 * j * Math.sin(t1)];
      var p1 = [p0[0] - k * q0 * Math.sin(t0), p0[1] + k * q0 * Math.cos(t0)];
      var p2 = [p3[0] + k * q1 * j * Math.sin(t1), p3[1] - k * q1 * j * Math.cos(t1)];
      if (!i) out += 'M' + f(p0[0]) + ',' + f(p0[1]);
      out += ' C' + f(p1[0]) + ',' + f(p1[1]) + ' ' + f(p2[0]) + ',' + f(p2[1]) + ' ' + f(p3[0]) + ',' + f(p3[1]);
    }
    return out;
  }

  function spBez(s, t) {
    var u = 1 - t;
    return [u * u * u * s[0][0] + 3 * u * u * t * s[1][0] + 3 * u * t * t * s[2][0] + t * t * t * s[3][0],
      u * u * u * s[0][1] + 3 * u * u * t * s[1][1] + 3 * u * t * t * s[2][1] + t * t * t * s[3][1]];
  }

  function spPunti(segmenti, n) {
    var pts = [];
    segmenti.forEach(function (s, i) { for (var j = i ? 1 : 0; j <= n; j++) pts.push(spBez(s, j / n)); });
    var L = [0];
    for (var i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    var tot = L[L.length - 1] || 1;
    return pts.map(function (p, i) { return { x: p[0], y: p[1], u: L[i] / tot }; });
  }

  function spInchiostro(punti, quanto, largo) {
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
      var w = largo * (0.25 + 0.75 * Math.max(0, Math.sin(Math.PI * Math.min(0.97, p.u)))) / 2;
      sx.push([p.x - ty / l * w, p.y + tx / l * w]);
      dx.push([p.x + ty / l * w, p.y - tx / l * w]);
    });
    return 'M' + sx.concat(dx.reverse()).map(function (q) { return f(q[0]) + ',' + f(q[1]); }).join(' L') + ' Z';
  }

  function spForme(tipo, v) {
    var k = tipo + v;
    if (spPezzi[k]) return spPezzi[k];
    var r = caso('spunta:' + k);
    function j(m) { return (r() - 0.5) * 2 * m; }
    var a0 = SP_LATO[0], a1 = SP_LATO[1];
    if (tipo === 'radio') {
      var a = r() * Math.PI * 2;
      spPezzi[k] = {
        fondo: spArco(10, 10, 4.8, 4.8, a, a + Math.PI * 2.25, r),
        segno: spArco(10, 10, 2.6, 0.1, a + 1, a + 1 + Math.PI * 4.4, r)
      };
      return spPezzi[k];
    }
    var A = [a0 + j(0.35), a0 + j(0.35)], B = [a1 + j(0.35), a0 + j(0.35)], C = [a1 + j(0.35), a1 + j(0.35)], D = [a0 + j(0.35), a1 + j(0.35)];
    var fondo = [[A, B], [B, C], [C, D], [D, A]].map(function (l, i) {
      return tratto(l[0][0], l[0][1], l[1][0], l[1][1], caso('spunta:' + k + ':' + i), 1.6, 0.5);
    }).join(' ');
    var p0 = [3.6 + j(0.3), 9.3 + j(0.3)], vt = [8.7 + j(0.3), 14.7 + j(0.25)], e = [16.7 + j(0.3), 3.4 + j(0.3)];
    var punti = spPunti([
      [p0, [p0[0] + 1.3, p0[1] + 1.9], [vt[0] - 1.0, vt[1] - 1.2], vt],
      [vt, [vt[0] + 1.6, vt[1] - 3.1], [e[0] - 3.0, e[1] + 3.9], e]
    ], 12);
    spPezzi[k] = { fondo: fondo, punti: punti };
    return spPezzi[k];
  }

  function spImmagine(tipo, v, quanto) {
    var c = spColori();
    var k = tipo + v + ':' + quanto + ':' + c.china + c.matita;
    if (spMemo[k]) return spMemo[k];
    var p = spForme(tipo, v);
    var svg = '<svg xmlns="' + NS + '" viewBox="0 0 20 20"><path d="' + p.fondo + '" fill="none" stroke="' + c.matita +
      '" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/>';
    if (quanto > 0 && tipo === 'radio') {
      svg += '<path id="segno" d="' + p.segno + '" fill="none" stroke="' + c.china + '" stroke-width="1.9" stroke-linecap="round"' +
        ' pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="' + f(1 - quanto) + '"/>';
    } else if (quanto > 0) {
      svg += '<path id="segno" d="' + spInchiostro(p.punti, quanto, 2.9) + '" fill="' + c.china + '" stroke="' + c.china +
        '" stroke-width=".35" stroke-linejoin="round"/>';
    }
    svg += '</svg>';
    spMemo[k] = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    return spMemo[k];
  }

  function spAdatta(el) {
    return el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') &&
      !el.closest('.interruttore') && !el.hasAttribute('data-nativo');
  }

  function spSiVede(el) {
    var q = el.getBoundingClientRect();
    return q.width > 0 && q.height > 0 && q.bottom > 0 && q.top < innerHeight && !el.closest('[hidden]');
  }

  function spDisegna(el, animata) {
    if (!spAdatta(el)) return;
    var st = el._sp;
    if (!st) {
      var seme = el.id || (el.name + ':' + el.value) || 'casella';
      var h = caso(seme)();
      st = el._sp = { v: Math.floor(h * SP_VARIANTI), q: el.checked ? 1 : 0, t: 0 };
      el.style.borderImageSource = spImmagine(el.type, st.v, st.q);
      el.classList.add('sp-disegnata');
      el.dataset.sp = el.checked ? 'si' : 'no';
      return;
    }
    var meta = el.checked ? 1 : 0;
    el.dataset.sp = meta ? 'si' : 'no';
    clearTimeout(st.t);
    if (!animata || !spSiVede(el)) {
      st.q = meta;
      el.style.borderImageSource = spImmagine(el.type, st.v, meta);
      return;
    }
    var n = meta ? disegni(330) : disegni(330 * RITORNO);
    var da = st.q, passo = 0;
    (function avanti() {
      passo++;
      st.q = passo >= n ? meta : da + (meta - da) * passo / n;
      el.style.borderImageSource = spImmagine(el.type, st.v, Math.round(st.q * 8) / 8);
      if (passo < n) st.t = setTimeout(avanti, DUE);
    })();
  }

  function spGruppo(el, animata) {
    spDisegna(el, animata);
    if (el.type !== 'radio' || !el.name) return;
    var radice = el.form || document;
    [].slice.call(radice.querySelectorAll('input[type="radio"]')).forEach(function (x) {
      if (x !== el && x.name === el.name && x._sp && x._sp.q !== (x.checked ? 1 : 0)) spDisegna(x, animata);
    });
  }

  function spDentro(nodo) {
    if (!nodo || nodo.nodeType !== 1) return;
    if (nodo.matches('input')) { spDisegna(nodo, false); return; }
    [].slice.call(nodo.querySelectorAll('input[type="checkbox"], input[type="radio"]')).forEach(function (x) { spDisegna(x, false); });
  }

  function spRifai() {
    spColore = null;
    [].slice.call(document.querySelectorAll('input.sp-disegnata')).forEach(function (x) {
      if (x._sp) x.style.borderImageSource = spImmagine(x.type, x._sp.v, x.checked ? 1 : 0);
    });
  }

  function spunte() {
    var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
    if (d && d.set && d.get) {
      Object.defineProperty(HTMLInputElement.prototype, 'checked', {
        configurable: true, enumerable: d.enumerable, get: d.get,
        set: function (v) {
          var prima = d.get.call(this);
          d.set.call(this, v);
          if (this._sp && prima !== d.get.call(this)) spGruppo(this, true);
        }
      });
    }
    document.addEventListener('change', function (ev) { if (ev.target && ev.target._sp) spGruppo(ev.target, true); }, true);
    document.addEventListener('reset', function () { setTimeout(function () { spDentro(document.body); spRifai(); }, 0); }, true);
    new MutationObserver(function (lista) {
      lista.forEach(function (m) { [].forEach.call(m.addedNodes, spDentro); });
    }).observe(document.documentElement, { childList: true, subtree: true });
    new MutationObserver(spRifai).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) {
      var mq = matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', spRifai);
    }
    spDentro(document.body);
  }

  spunte();
  D.spunta = spDisegna;

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

  function gruppiDelMenu() {
    return [].slice.call(document.querySelectorAll('#nav-drawer > .drawer-grp'));
  }

  function menu() {
    var cassetto = document.getElementById('drawer');
    if (cassetto) chiedi(cassetto, { veloce: true });
    gruppiDelMenu().forEach(function (g, j) {
      chiedi(g, { da: 140 + j * PASSO_FILA, veloce: true });
    });
  }

  var menuVisto = '';

  function formaMenu() {
    var c = document.getElementById('drawer');
    if (!c || document.body.classList.contains('menu-via')) return '';
    var m = misura(c);
    if (!m.visibile || m.r.width < 8 || m.r.height < 8) return '';
    return m.bordo && m.bordo.lati ? m.bordo.lati.map(Number).join('') : '-';
  }

  function sulMenu() {
    var ora = formaMenu();
    if (ora && ora !== menuVisto) menu();
    menuVisto = ora;
  }

  function viaMenu() {
    var cassetto = document.getElementById('drawer');
    var tutti = gruppiDelMenu().concat(cassetto ? [cassetto] : []);
    var misure = tutti.map(misura);
    var fine = 0;
    tutti.forEach(function (e, i) {
      if (disegnabile(e, misure[i])) fine = Math.max(fine, sfila(e, misure[i], { veloce: true }));
    });
    return fine;
  }

  function vignetteDellaScena(pannello, uscendo) {
    var tutte = [];
    var testata = document.getElementById('pagina-testata');
    if (testata) [].forEach.call(testata.children, function (c) {
      if (!(c instanceof HTMLElement) || (!uscendo && c.tagName === 'H1')) return;
      tutte.push([c, !contornato(c)]);
    });
    [].forEach.call(pannello.querySelectorAll('.carta'), function (c) { tutte.push([c, false]); });
    return tutte;
  }

  var dopoCopertina = [];

  function scena(pannello) {
    if (copertina()) { if (dopoCopertina.indexOf(pannello) < 0) dopoCopertina.push(pannello); return; }
    var tutte = vignetteDellaScena(pannello, false);
    tutte.forEach(function (x) { delete x[0].dataset.dgFatto; });
    var misure = tutte.map(function (x) { return misura(x[0]); });
    var inVista = tutte.map(function (x, i) { return [x[0], misure[i], { retino: x[1] }]; })
      .filter(function (x) { return !x[0].dataset.dgIn && disegnabile(x[0], x[1], x[2]); })
      .sort(function (x, y) { return (x[1].r.top - y[1].r.top) || (x[1].r.left - y[1].r.left); });
    inVista.forEach(function (x, i) { x[2].da = i * PASSO_FILA; traccia(x[0], x[1], x[2]); });
    I.fila(inVista.length);
  }

  function esceScena(pannello) {
    var tutte = vignetteDellaScena(pannello, true);
    var misure = tutte.map(function (x) { return misura(x[0]); });
    tutte.forEach(function (x, i) { if (disegnabile(x[0], misure[i], { retino: x[1] })) sfila(x[0], misure[i], { retino: x[1] }); });
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

  var CORNICI = '.barra-top, .barra-giu, #cerca-lancia, #plancia-lancia, #pil-legenda, #demo-barra';
  var cornici = new Map();

  function sulleCornici() {
    [].forEach.call(document.querySelectorAll(CORNICI), function (el) {
      if (el.classList.contains('dg-resta')) return;
      var prima = cornici.get(el) || '';
      var ora = siVede(el) ? getComputedStyle(el).display : '';
      cornici.set(el, ora);
      if (ora && !prima) compare(el, { veloce: true });
      else if (!ora && prima) {
        el.style.setProperty('--dg-display', prima);
        el.classList.add('dg-resta', 'dg-cornice');
        var fine = via(el, { veloce: true });
        if (!fine) { lascia(el); return; }
        el._dgResta = setTimeout(function () { lascia(el); }, fine);
      }
    });
  }

  I.sagome.urlo = spigoli;
  D.viaMenu = viaMenu;
  D.scena = scena;
  D.estendi({
    corpo: function () { sulMenu(); sulleCornici(); },
    scena: scena,
    esceScena: esceScena,
    urlo: urlo,
    sveglia: function () { var attese = dopoCopertina; dopoCopertina = []; attese.forEach(scena); }
  });
})();
