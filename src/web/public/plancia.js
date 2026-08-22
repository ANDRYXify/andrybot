// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  function A() { return window.SB_APP; }
  function L(it, en, es) { try { return A().L(it, en, es); } catch (e) { return it; } }
  function esc(s) { try { return A().esc(String(s)); } catch (e) { return String(s == null ? '' : s); } }
  function menoMoto() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }

  var K_MODO = 'sb-plancia', K_SUONO = 'sb-plancia-suono';
  function modoOn() { try { return localStorage.getItem(K_MODO) === '1'; } catch (e) { return false; } }
  function setModo(v) { try { localStorage.setItem(K_MODO, v ? '1' : '0'); } catch (e) {} aggiornaLancia(); }
  function suonoOn() { try { return localStorage.getItem(K_SUONO) === '1'; } catch (e) { return false; } }
  function setSuono(v) { try { localStorage.setItem(K_SUONO, v ? '1' : '0'); } catch (e) {} }

  var ICO_PAD = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><rect x="2" y="6" width="20" height="12" rx="4"/></svg>';
  var ICO_LOCK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  function icoSuono(on) {
    return on
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><line x1="16" y1="9" x2="21" y2="15"/><line x1="21" y1="9" x2="16" y2="15"/></svg>';
  }

  var actx = null;
  function bip(freq, dur, vol) {
    if (!suonoOn()) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime;
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* niente */ }
  }

  var overlay = null, eroe = null, corpo = null, scaffali = [], fs = 0, fv = 0, aperto = false, rafPad = 0;

  function costruisci() {
    var b = document.createElement('button');
    b.id = 'plancia-lancia'; b.type = 'button';
    b.addEventListener('click', function () { if (!modoOn()) setModo(true); apri(); });
    document.body.appendChild(b);
    aggiornaLancia();

    overlay = document.createElement('div'); overlay.id = 'plancia-overlay'; overlay.hidden = true;
    overlay.innerHTML =
      '<div class="pl-top"><span class="pl-marchio">' + ICO_PAD + '<b>' + esc(L('Plancia', 'Deck', 'Consola')) + '</b></span>' +
        '<span class="pl-top-azioni">' +
          '<button type="button" class="pl-suono" aria-pressed="false"></button>' +
          '<button type="button" class="btn secondario mini pl-esci">' + esc(L('Modalità classica', 'Classic mode', 'Modo clásico')) + '</button>' +
        '</span></div>' +
      '<div class="pl-eroe"></div>' +
      '<div class="pl-corpo"></div>' +
      '<div class="pl-guida"><span>←→</span> ' + esc(L('scorri', 'scroll', 'desplaza')) + ' &nbsp; <span>↑↓</span> ' + esc(L('scaffale', 'shelf', 'estante')) + ' &nbsp; <span>Invio</span> ' + esc(L('apri', 'open', 'abrir')) + ' &nbsp; <span>Esc</span> ' + esc(L('esci', 'exit', 'salir')) + ' &nbsp; <span>A</span><span>B</span> ' + esc(L('col controller', 'with a controller', 'con el mando')) + '</div>';
    document.body.appendChild(overlay);
    eroe = overlay.querySelector('.pl-eroe');
    corpo = overlay.querySelector('.pl-corpo');
    overlay.querySelector('.pl-esci').addEventListener('click', function () { setModo(false); chiudi(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) chiudi(); });
    var bs = overlay.querySelector('.pl-suono');
    bs.addEventListener('click', function () { setSuono(!suonoOn()); aggiornaSuono(); bip(660, 0.07, 0.05); });
    aggiornaSuono();
  }

  function aggiornaSuono() {
    if (!overlay) return;
    var on = suonoOn(), b = overlay.querySelector('.pl-suono');
    if (!b) return;
    b.innerHTML = icoSuono(on);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    var et = on ? L('Suoni attivi', 'Sounds on', 'Sonidos activos') : L('Suoni spenti', 'Sounds off', 'Sonidos apagados');
    b.setAttribute('aria-label', et); b.title = et;
  }

  function aggiornaLancia() {
    var b = document.getElementById('plancia-lancia');
    if (!b) return;
    var on = modoOn();
    b.classList.toggle('modo-on', on);
    b.innerHTML = ICO_PAD + (on ? '<span class="pl-lancia-txt">' + esc(L('Plancia', 'Deck', 'Consola')) + '</span>' : '');
    var et = on ? L('Torna alla Plancia', 'Back to the Deck', 'Volver a la Consola') : L('Modalità gaming', 'Gaming mode', 'Modo gaming');
    b.setAttribute('aria-label', et); b.title = et;
  }

  function indice() {
    var a = A(); if (!a) return [];
    var out = [], gruppi = (a.gruppi || []).slice();
    if (a.isAdmin && a.gruppoAdmin) gruppi.push(a.gruppoAdmin);
    gruppi.forEach(function (g) {
      var voci = [];
      (g.schede || []).forEach(function (s) {
        var id = s[0];
        if (a.schedaValida && !a.schedaValida(id)) return;
        voci.push({ id: id, nome: a.tScheda(id, s[1]), gruppo: a.tGruppo(g.id, g.nome), icona: a.icona(id) || '', desc: a.desc ? a.desc(id) : '', bloccata: a.schedaBloccata ? a.schedaBloccata(id) : false });
      });
      if (voci.length) out.push({ id: g.id, nome: a.tGruppo(g.id, g.nome), voci: voci });
    });
    return out;
  }

  function disegna() {
    scaffali = indice();
    var h = '';
    scaffali.forEach(function (sc, si) {
      h += '<section class="pl-scaffale" data-s="' + si + '">' +
        '<h3 class="pl-scaffale-tit">' + esc(sc.nome) + '</h3>' +
        '<div class="pl-rail" role="listbox" aria-label="' + esc(sc.nome) + '">';
      sc.voci.forEach(function (v, vi) {
        h += '<button type="button" role="option" class="pl-tile' + (v.bloccata ? ' bloccata' : '') + '" data-s="' + si + '" data-v="' + vi + '" style="--pl-r:' + Math.min(vi, 8) * 38 + 'ms">' +
          '<span class="pl-tile-ico">' + v.icona + '</span><span class="pl-tile-nome">' + esc(v.nome) + '</span>' +
          (v.bloccata ? '<span class="pl-tile-lock" aria-hidden="true">' + ICO_LOCK + '</span>' : '') + '</button>';
      });
      h += '</div></section>';
    });
    corpo.innerHTML = h;
    corpo.querySelectorAll('.pl-tile').forEach(function (t) {
      t.addEventListener('click', function () {
        var si = +t.dataset.s, vi = +t.dataset.v;
        if (si === fs && vi === fv) apriVoce(voceCorrente());
        else { var dy = si - fs, dx = vi - fv; fs = si; fv = vi; aggiorna(dx, dy); }
      });
      t.addEventListener('mousemove', function () {
        var si = +t.dataset.s, vi = +t.dataset.v;
        if (si !== fs || vi !== fv) { var dy = si - fs, dx = vi - fv; fs = si; fv = vi; aggiorna(dx, dy, true); }
      });
    });
    if (fs >= scaffali.length) fs = 0;
    if (!scaffali[fs] || fv >= scaffali[fs].voci.length) fv = 0;
    aggiorna(0, 0, true);
  }

  function voceCorrente() { var sc = scaffali[fs]; return sc ? sc.voci[fv] : null; }

  function aggiorna(dx, dy, muto) {
    var v = voceCorrente(); if (!v || !eroe) return;
    eroe.innerHTML =
      '<div class="pl-eroe-ico">' + v.icona + '</div>' +
      '<div class="pl-eroe-txt">' +
        '<div class="pl-eroe-grp">' + esc(v.gruppo) + '</div>' +
        '<h2 class="pl-eroe-nome">' + esc(v.nome) + '</h2>' +
        '<p class="pl-eroe-desc">' + esc(v.desc) + '</p>' +
        '<div class="pl-eroe-hint">' + esc(L('Invio o A per aprire', 'Enter or A to open', 'Intro o A para abrir')) +
          (v.bloccata ? ' · ' + esc(L('bloccata dal tuo piano', 'locked by your plan', 'bloqueada por tu plan')) : '') + '</div>' +
      '</div>';
    animaEroe(dx || 0, dy || 0);
    var att = null;
    corpo.querySelectorAll('.pl-tile').forEach(function (t) {
      var f = (+t.dataset.s === fs && +t.dataset.v === fv);
      t.classList.toggle('fuoco', f); if (f) att = t;
    });
    corpo.querySelectorAll('.pl-scaffale').forEach(function (s) { s.classList.toggle('attivo', +s.dataset.s === fs); });
    if (att) att.scrollIntoView({ behavior: menoMoto() ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    if (!muto) bip(dy ? 430 : 560, 0.055, 0.035);
  }

  function animaEroe(dx, dy) {
    if (menoMoto() || !eroe) return;
    try {
      eroe.classList.remove('pl-mosso');
      void eroe.offsetWidth;
      eroe.style.setProperty('--pl-dx', (Math.max(-1, Math.min(1, dx)) * 30) + 'px');
      eroe.style.setProperty('--pl-dy', (Math.max(-1, Math.min(1, dy)) * 22) + 'px');
      eroe.classList.add('pl-mosso');
    } catch (e) { /* niente */ }
  }

  function muoviX(d) {
    var sc = scaffali[fs]; if (!sc) return;
    var n = Math.max(0, Math.min(sc.voci.length - 1, fv + d));
    if (n === fv) return;
    fv = n; aggiorna(d, 0);
  }
  function muoviY(d) {
    var n = Math.max(0, Math.min(scaffali.length - 1, fs + d));
    if (n === fs) return;
    fs = n;
    var sc = scaffali[fs];
    if (sc && fv >= sc.voci.length) fv = sc.voci.length - 1;
    aggiorna(0, d);
  }
  function apriVoce(v) {
    if (!v) return;
    bip(760, 0.11, 0.06);
    chiudi();
    try { A().vai(v.id); } catch (e) { location.hash = '#' + v.id; }
  }

  function apri() {
    if (!overlay || aperto) return;
    disegna(); overlay.hidden = false; aperto = true;
    document.body.classList.add('plancia-on');
    document.addEventListener('keydown', tasti, true);
    avviaPad();
  }
  function chiudi() {
    if (!overlay) return;
    overlay.hidden = true; aperto = false;
    document.body.classList.remove('plancia-on');
    document.removeEventListener('keydown', tasti, true);
  }

  function tasti(e) {
    if (e.key === 'Escape') { e.preventDefault(); chiudi(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); muoviX(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); muoviX(-1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); muoviY(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); muoviY(-1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apriVoce(voceCorrente()); }
    else if (e.key === 'Home') { e.preventDefault(); fv = 0; aggiorna(-1, 0); }
    else if (e.key === 'End') { e.preventDefault(); var sc = scaffali[fs]; if (sc) { fv = sc.voci.length - 1; aggiorna(1, 0); } }
  }

  var padStato = { x: 0, y: 0, a: false, b: false };
  function pad() {
    var gps = [];
    try { gps = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { gps = []; }
    var gp = null, any = false;
    for (var i = 0; i < gps.length; i++) { if (gps[i]) { gp = gps[i]; any = true; break; } }
    if (gp) {
      var ax = gp.axes || [], bt = gp.buttons || [], now = Date.now();
      var dx = ax[0] || 0, dy = ax[1] || 0;
      var dr = dx > 0.55 || (bt[15] && bt[15].pressed), dl = dx < -0.55 || (bt[14] && bt[14].pressed);
      var dd = dy > 0.55 || (bt[13] && bt[13].pressed), du = dy < -0.55 || (bt[12] && bt[12].pressed);
      if (dr || dl) { if (!padStato.x || now - padStato.x > 170) { padStato.x = now; if (aperto) muoviX(dr ? 1 : -1); } } else padStato.x = 0;
      if (dd || du) { if (!padStato.y || now - padStato.y > 220) { padStato.y = now; if (aperto) muoviY(dd ? 1 : -1); } } else padStato.y = 0;
      var aBtn = bt[0] && bt[0].pressed, bBtn = bt[1] && bt[1].pressed;
      if (aBtn && !padStato.a) { padStato.a = true; if (aperto) apriVoce(voceCorrente()); else { if (!modoOn()) setModo(true); apri(); } }
      if (!aBtn) padStato.a = false;
      if (bBtn && !padStato.b) { padStato.b = true; if (aperto) chiudi(); }
      if (!bBtn) padStato.b = false;
    }
    if (any || aperto) rafPad = requestAnimationFrame(pad);
    else rafPad = 0;
  }
  function avviaPad() { if (!rafPad) rafPad = requestAnimationFrame(pad); }
  window.addEventListener('gamepadconnected', function () { avviaPad(); });

  function scorc(e) {
    var k = (e.key || '').toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'g') { e.preventDefault(); if (aperto) chiudi(); else { if (!modoOn()) setModo(true); apri(); } }
  }

  window.SB_PLANCIA = {
    apri: function () { try { apri(); } catch (e) {} },
    chiudi: chiudi,
    modo: modoOn,
    impostaModo: function (v) { setModo(!!v); if (!v) chiudi(); }
  };

  function avvia() {
    if (!A()) { window.addEventListener('sb-app-pronta', avvia, { once: true }); return; }
    if (document.getElementById('plancia-lancia')) return;
    costruisci();
    document.addEventListener('keydown', scorc);
    if (modoOn()) setTimeout(apri, 120);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
