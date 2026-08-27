// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';

  var K_SUONO = 'sb-plancia-suono';
  function acceso() { try { return localStorage.getItem(K_SUONO) === '1'; } catch (e) { return false; } }

  var ac = null, bus = null, comp = null, master = null, secco = null, pronto = false;
  var ultimoSuono = 0, ultimoNome = '', ultimoNomeT = 0, inCorso = 0;

  function motore() {
    if (ac) return ac;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ac = new AC(); } catch (e2) { return null; } }

    master = ac.createGain();
    master.gain.value = 0.9;

    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;

    bus = ac.createBiquadFilter();
    bus.type = 'lowpass';
    bus.frequency.value = 5400;
    bus.Q.value = 0.5;

    secco = ac.createGain(); secco.gain.value = 1;

    bus.connect(secco); secco.connect(comp);
    comp.connect(master); master.connect(ac.destination);
    pronto = true;
    return ac;
  }

  function caso(s) {
    var x = s | 0;
    return function () {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return ((x >>> 0) / 4294967296) * 2 - 1;
    };
  }

  var rumoreBuf = null;
  function rumore() {
    if (rumoreBuf) return rumoreBuf;
    var n = Math.floor(ac.sampleRate * 0.4);
    rumoreBuf = ac.createBuffer(1, n, ac.sampleRate);
    var d = rumoreBuf.getChannelData(0), r = caso(24680);
    for (var i = 0; i < n; i++) d[i] = r();
    return rumoreBuf;
  }

  function inviluppo(g, t0, picco, salita, tenuta, discesa) {
    g.gain.cancelScheduledValues(t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, picco), t0 + salita);
    if (tenuta > 0) g.gain.setValueAtTime(Math.max(0.0002, picco), t0 + salita + tenuta);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + salita + tenuta + discesa);
    g.gain.setValueAtTime(0, t0 + salita + tenuta + discesa + 0.005);
  }

  var MODI = [1, 2.756, 5.404];
  var PESI = [1, 0.42, 0.19];
  var giroRumore = 0;
  function offsetRumore() { giroRumore = (giroRumore + 0.037) % 0.28; return giroRumore; }

  function mazzuolo(t0, dur, taglio, vol) {
    var s = ac.createBufferSource(); s.buffer = rumore();
    var lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = taglio; lp.Q.value = 0.7;
    var g = ac.createGain();
    inviluppo(g, t0, vol, 0.0007, 0, dur);
    s.connect(lp); lp.connect(g); g.connect(bus);
    s.start(t0, offsetRumore());
    s.stop(t0 + dur + 0.03);
  }

  function materia(t0, f0, dur, vol, colore) {
    for (var i = 0; i < MODI.length; i++) {
      var f = f0 * MODI[i];
      if (f > 6200) continue;
      var s = ac.createBufferSource(); s.buffer = rumore();
      var bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 9 + i * 4;
      var g = ac.createGain();
      var d = Math.max(0.012, dur * (1 - i * 0.28));
      inviluppo(g, t0, vol * PESI[i] * 11, 0.0016, 0, d);
      s.connect(bp); bp.connect(g); g.connect(bus);
      s.start(t0, offsetRumore());
      s.stop(t0 + d + 0.04);
    }
    mazzuolo(t0, 0.0038, colore || 2400, vol * 0.55);
  }

  function soffio(t0, da, a, dur, vol) {
    var s = ac.createBufferSource(); s.buffer = rumore();
    var f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(da, t0);
    f.frequency.exponentialRampToValueAtTime(a, t0 + dur);
    var g = ac.createGain();
    inviluppo(g, t0, vol, dur * 0.25, 0, dur * 0.75);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t0, offsetRumore());
    s.stop(t0 + dur + 0.05);
  }

  var RICETTE = {
    tocco: function (t) { materia(t, 300, 0.030, 0.83, 2400); },
    premi: function (t) { materia(t, 258, 0.042, 1.95, 2900); },
    commuta: function (t) { materia(t, 372, 0.030, 0.97, 3400); },
    conferma: function (t) { materia(t, 296, 0.085, 0.66, 2600); materia(t + 0.052, 296, 0.055, 0.40, 2200); },
    errore: function (t) { materia(t, 132, 0.150, 2.80, 1400); },
    apri: function (t) { soffio(t, 380, 1500, 0.10, 0.57); },
    chiudi: function (t) { soffio(t, 1500, 380, 0.09, 0.51); },
    passa: function (t) { materia(t, 420, 0.018, 0.35, 3000); },
  };

  function suona(nome, forza) {
    if (!acceso()) return false;
    if (!RICETTE[nome]) return false;
    var ora = (window.performance && performance.now) ? performance.now() : Date.now();
    if (ora - ultimoSuono < 24) return false;
    if (nome === ultimoNome && ora - ultimoNomeT < 55) return false;
    if (inCorso > 6) return false;
    if (!motore()) return false;
    try {
      if (ac.state === 'suspended') ac.resume();
      var t = ac.currentTime + 0.001;
      var v = typeof forza === 'number' ? Math.max(0.15, Math.min(1.6, forza)) : 1;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(0.9 * v, t);
      RICETTE[nome](t);
      ultimoSuono = ora; ultimoNome = nome; ultimoNomeT = ora;
      try { document.dispatchEvent(new CustomEvent('sb-suono', { detail: { nome: nome } })); } catch (e) {  }
      inCorso++;
      setTimeout(function () { inCorso--; }, 260);
      return true;
    } catch (e) { return false; }
  }

  function sveglia() {
    if (!acceso()) return;
    var a = motore();
    if (a && a.state === 'suspended') { try { a.resume(); } catch (e) {  } }
  }

  window.SB_SUONO = {
    suona: suona,
    acceso: acceso,
    imposta: function (v) { try { localStorage.setItem(K_SUONO, v ? '1' : '0'); } catch (e) {  } if (v) sveglia(); },
    nomi: function () { return Object.keys(RICETTE); },
    pronto: function () { return pronto; },
  };

  var COMANDI = 'button, a[href], .btn, .grp-btn, .pl-tile, .menu-voce, .drawer-voce, .cerca-voce, .chip-domanda, [role="button"], .cerca-filtro';
  var COMMUTA = 'input[type=checkbox], input[type=radio], select, .levetta';
  var PANNELLI = ['plancia-on', 'cerca-aperta', 'menu-aperto', 'osk-on'];

  function collega() {
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (e) {
      window.addEventListener(e, sveglia, { once: true, passive: true, capture: true });
    });

    var ultimoPremi = 0;
    function premuto() {
      ultimoPremi = (window.performance && performance.now) ? performance.now() : Date.now();
      suona('premi');
    }
    function appenaPremuto() {
      var ora = (window.performance && performance.now) ? performance.now() : Date.now();
      return ora - ultimoPremi < 220;
    }
    function comando(el) {
      if (!el || !el.closest) return null;
      var t = el.closest(COMANDI);
      if (!t || t.disabled) return null;
      if (t.matches(COMMUTA) || t.querySelector(COMMUTA)) return null;
      return t;
    }

    document.addEventListener('pointerdown', function (e) {
      if (comando(e.target)) premuto();
    }, { passive: true, capture: true });

    document.addEventListener('keydown', function (e) {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var a = document.activeElement;
      if (!a || a === document.body) return;
      if (a.matches && a.matches(COMMUTA)) return;
      if (comando(a)) premuto();
    }, { passive: true, capture: true });

    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.matches) return;
      if (t.matches(COMMUTA)) suona('commuta');
    }, { passive: true, capture: true });

    var stato = {};
    PANNELLI.forEach(function (c) { stato[c] = document.body.classList.contains(c); });
    var quanti = function () { var n = 0; PANNELLI.forEach(function (c) { if (stato[c]) n++; }); return n; };
    var primaN = quanti();
    new MutationObserver(function () {
      var mosso = false;
      PANNELLI.forEach(function (c) {
        var v = document.body.classList.contains(c);
        if (v !== stato[c]) { stato[c] = v; mosso = true; }
      });
      if (!mosso) return;
      var oraN = quanti();
      var su = oraN > primaN;
      primaN = oraN;
      if (appenaPremuto()) return;
      suona(su ? 'apri' : 'chiudi');
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    var scatola = document.getElementById('toast-box');
    if (scatola) {
      new MutationObserver(function (liste) {
        for (var i = 0; i < liste.length; i++) {
          var agg = liste[i].addedNodes;
          for (var k = 0; k < agg.length; k++) {
            var n = agg[k];
            if (!n || n.nodeType !== 1 || !n.classList || !n.classList.contains('toast')) continue;
            suona(n.classList.contains('errore') ? 'errore' : 'conferma');
            return;
          }
        }
      }).observe(scatola, { childList: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', collega);
  else collega();
})();
