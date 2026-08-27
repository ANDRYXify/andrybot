// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';

  var K_SUONO = 'sb-plancia-suono';
  function acceso() { try { return localStorage.getItem(K_SUONO) === '1'; } catch (e) { return false; } }

  var ac = null, bus = null, comp = null, master = null, riverbero = null, secco = null, pronto = false;
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
    bus.frequency.value = 9200;
    bus.Q.value = 0.4;

    secco = ac.createGain(); secco.gain.value = 1;
    riverbero = ac.createConvolver();
    riverbero.buffer = stanza(0.19, 2.6);
    var invio = ac.createGain(); invio.gain.value = 0.16;

    bus.connect(secco); secco.connect(comp);
    bus.connect(invio); invio.connect(riverbero); riverbero.connect(comp);
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

  function stanza(sec, decadi) {
    var n = Math.max(1, Math.floor(ac.sampleRate * sec));
    var buf = ac.createBuffer(2, n, ac.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c), r = caso(c === 0 ? 987654321 : 123456789);
      for (var i = 0; i < n; i++) {
        var t = i / n;
        d[i] = r() * Math.pow(1 - t, decadi) * (i < 24 ? i / 24 : 1);
      }
    }
    return buf;
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

  function transiente(t0, freq, q, dur, vol) {
    var s = ac.createBufferSource(); s.buffer = rumore();
    s.playbackRate.value = 1;
    var f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    f.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.55), t0 + dur);
    var g = ac.createGain();
    inviluppo(g, t0, vol, 0.0012, 0, dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t0, Math.random() * 0.2);
    s.stop(t0 + dur + 0.05);
  }

  function corpo(t0, f0, f1, rapporto, indice, dur, vol, forma) {
    var port = ac.createOscillator();
    port.type = 'sine';
    port.frequency.setValueAtTime(Math.max(20, f0 * rapporto), t0);
    port.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * rapporto), t0 + dur);
    var prof = ac.createGain();
    prof.gain.setValueAtTime(f0 * indice, t0);
    prof.gain.exponentialRampToValueAtTime(Math.max(1, f0 * indice * 0.05), t0 + dur * 0.7);

    var osc = ac.createOscillator();
    osc.type = forma || 'sine';
    osc.frequency.setValueAtTime(Math.max(20, f0), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);

    var g = ac.createGain();
    inviluppo(g, t0, vol, 0.006, dur * 0.12, dur);

    port.connect(prof); prof.connect(osc.frequency);
    osc.connect(g); g.connect(bus);
    port.start(t0); osc.start(t0);
    port.stop(t0 + dur + 0.06); osc.stop(t0 + dur + 0.06);
  }

  function soffio(t0, da, a, dur, vol) {
    var s = ac.createBufferSource(); s.buffer = rumore();
    var f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.1;
    f.frequency.setValueAtTime(da, t0);
    f.frequency.exponentialRampToValueAtTime(a, t0 + dur);
    var g = ac.createGain();
    inviluppo(g, t0, vol, dur * 0.25, 0, dur * 0.75);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t0, Math.random() * 0.15);
    s.stop(t0 + dur + 0.05);
  }

  var RICETTE = {
    tocco: function (t) { transiente(t, 2600, 2.2, 0.022, 1.10); },
    premi: function (t) {
      transiente(t, 3000, 2.0, 0.028, 2.30);
      corpo(t, 520, 300, 2.0, 1.1, 0.085, 0.26);
    },
    commuta: function (t) {
      transiente(t, 2100, 2.2, 0.024, 1.70);
      corpo(t, 880, 700, 3.0, 0.6, 0.055, 0.15);
    },
    conferma: function (t) {
      transiente(t, 2800, 2.4, 0.018, 1.30);
      corpo(t, 660, 660, 2.0, 0.35, 0.11, 0.20);
      corpo(t + 0.075, 990, 990, 2.0, 0.3, 0.19, 0.17);
    },
    errore: function (t) {
      transiente(t, 900, 1.8, 0.030, 1.10);
      corpo(t, 220, 190, 1.5, 2.2, 0.13, 0.22);
      corpo(t + 0.09, 176, 160, 1.5, 2.0, 0.17, 0.18);
    },
    apri: function (t) {
      soffio(t, 700, 3000, 0.16, 1.20);
      corpo(t + 0.02, 300, 520, 2.0, 0.5, 0.14, 0.15);
    },
    chiudi: function (t) {
      soffio(t, 2600, 600, 0.14, 1.10);
      corpo(t + 0.01, 460, 260, 2.0, 0.6, 0.12, 0.15);
    },
    passa: function (t) { transiente(t, 1800, 1.6, 0.028, 0.85); },
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

  function collega() {
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (e) {
      window.addEventListener(e, sveglia, { once: true, passive: true, capture: true });
    });

    var SEL = 'button, a[href], .btn, .grp-btn, .pl-tile, .menu-voce, .drawer-voce, .cerca-voce, .chip-domanda, [role="button"], .cerca-filtro';
    document.addEventListener('pointerdown', function (e) {
      var t = e.target && e.target.closest ? e.target.closest(SEL) : null;
      if (!t || t.disabled) return;
      if (t.matches('input[type=checkbox], input[type=radio], .levetta')) suona('commuta');
      else suona('premi');
    }, { passive: true, capture: true });

    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t) return;
      if (t.type === 'checkbox' || t.type === 'radio' || (t.classList && t.classList.contains('levetta'))) suona('commuta');
    }, { passive: true, capture: true });

    var ultimoSopra = null;
    document.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'touch') return;
      var t = e.target && e.target.closest ? e.target.closest(SEL) : null;
      if (!t || t === ultimoSopra || t.disabled) return;
      ultimoSopra = t;
      suona('passa');
    }, { passive: true, capture: true });
    document.addEventListener('pointerout', function (e) {
      if (!e.relatedTarget) ultimoSopra = null;
    }, { passive: true, capture: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', collega);
  else collega();
})();
