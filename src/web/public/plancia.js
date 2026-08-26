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
  function setModo(v) {
    try { localStorage.setItem(K_MODO, v ? '1' : '0'); } catch (e) {}
    aggiornaLancia();
    try { if (window.SB_PILOTA) { v ? window.SB_PILOTA.attiva() : window.SB_PILOTA.disattiva(); } } catch (e) {}
  }
  function suonoOn() { try { return localStorage.getItem(K_SUONO) === '1'; } catch (e) { return false; } }
  function setSuono(v) { try { localStorage.setItem(K_SUONO, v ? '1' : '0'); } catch (e) {} }

  var ICO_PAD = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><rect x="2" y="6" width="20" height="12" rx="4"/></svg>';
  var ICO_LOCK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
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

  var overlay = null, eroe = null, rail = null, pista = null, voci = [], focus = 0, aperto = false, rafPad = 0;

  function costruisci() {
    var b = document.createElement('button');
    b.id = 'plancia-lancia'; b.type = 'button';
    b.addEventListener('click', function () { if (!modoOn()) setModo(true); apri(); });
    document.body.appendChild(b);
    aggiornaLancia();

    overlay = document.createElement('div'); overlay.id = 'plancia-overlay'; overlay.hidden = true;
    overlay.innerHTML =
      '<div class="pl-atmo"></div>' +
      '<div class="pl-top"><span class="pl-marchio">' + ICO_PAD + '<b>' + esc(L('Plancia', 'Deck', 'Consola')) + '</b></span>' +
        '<span class="pl-top-azioni">' +
          '<button type="button" class="pl-suono" aria-pressed="false"></button>' +
          '<button type="button" class="btn secondario mini pl-esci">' + esc(L('Modalità classica', 'Classic mode', 'Modo clásico')) + '</button>' +
        '</span></div>' +
      '<div class="pl-eroe"></div>' +
      '<div class="pl-pista"><div class="pl-rail" role="listbox" aria-label="' + esc(L('Sezioni', 'Sections', 'Secciones')) + '"></div></div>' +
      '<div class="pl-guida">' +
      '<b class="pl-cop"><span>←→</span> ' + esc(L('scorri', 'scroll', 'desplaza')) + '</b>' +
      '<b class="pl-cop"><span>↑↓</span> ' + esc(L('salta gruppo', 'jump group', 'saltar grupo')) + '</b>' +
      '<b class="pl-cop"><span>Invio</span> ' + esc(L('apri', 'open', 'abrir')) + '</b>' +
      '<b class="pl-cop"><span>Esc</span> ' + esc(L('esci', 'exit', 'salir')) + '</b>' +
      '<b class="pl-cop"><span>A</span><span>B</span> ' + esc(L('col controller', 'with a controller', 'con el mando')) + '</b>' +
      '</div>';
    document.body.appendChild(overlay);
    eroe = overlay.querySelector('.pl-eroe');
    rail = overlay.querySelector('.pl-rail');
    pista = overlay.querySelector('.pl-pista');
    overlay.querySelector('.pl-esci').addEventListener('click', function () { setModo(false); chiudi(); });
    var bs = overlay.querySelector('.pl-suono');
    bs.addEventListener('click', function () { setSuono(!suonoOn()); aggiornaSuono(); bip(660, 0.07, 0.05); });
    aggiornaSuono();
    window.addEventListener('resize', function () { if (aperto) glide(); });
    interazioni();
  }

  var trascinato = false;
  function interazioni() {
    var ruotaT = 0;
    pista.addEventListener('wheel', function (e) {
      if (!aperto) return;
      e.preventDefault();
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 4) return;
      var ora = Date.now();
      if (ora - ruotaT < 90) return;
      ruotaT = ora;
      muovi(d > 0 ? 1 : -1);
    }, { passive: false });

    var giu = false, x0 = 0, base = 0, catturato = false;
    pista.addEventListener('pointerdown', function (e) {
      if (!aperto) return;
      giu = true; trascinato = false; catturato = false; x0 = e.clientX; base = focus;
    });
    pista.addEventListener('pointermove', function (e) {
      if (!giu || !aperto) return;
      var dx = e.clientX - x0;
      if (Math.abs(dx) <= 10) return;
      if (!catturato) { catturato = true; trascinato = true; try { pista.setPointerCapture(e.pointerId); } catch (er) {} }
      var passo = Math.round(-dx / 86);
      var n = Math.max(0, Math.min(voci.length - 1, base + passo));
      if (n !== focus) { var dir = n > focus ? 1 : -1; focus = n; aggiorna(dir); }
    });
    function su(e) {
      if (!giu) return;
      giu = false;
      if (catturato) { try { pista.releasePointerCapture(e.pointerId); } catch (er) {} }
      catturato = false;
      setTimeout(function () { trascinato = false; }, 40);
    }
    pista.addEventListener('pointerup', su);
    pista.addEventListener('pointercancel', su);
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
      var gn = a.tGruppo(g.id, g.nome);
      (g.schede || []).forEach(function (s, i) {
        var id = s[0];
        if (a.schedaValida && !a.schedaValida(id)) return;
        out.push({ id: id, nome: a.tScheda(id, s[1]), gruppo: gn, gruppoId: g.id, primo: i === 0,
          icona: a.icona(id) || '', desc: a.desc ? a.desc(id) : '',
          bloccata: a.schedaBloccata ? a.schedaBloccata(id) : false });
      });
    });
    var gprec = null;
    out.forEach(function (v) { v.inizioGruppo = v.gruppo !== gprec; gprec = v.gruppo; });
    return out;
  }

  function disegna() {
    voci = indice();
    var h = '';
    voci.forEach(function (v, i) {
      if (v.inizioGruppo && i) h += '<span class="pl-sep" aria-hidden="true"></span>';
      h += '<button type="button" role="option" class="pl-tile' + (v.bloccata ? ' bloccata' : '') + '" data-i="' + i + '" style="--pl-r:' + Math.min(i, 10) * 34 + 'ms">' +
        '<span class="pl-tile-ico">' + v.icona + '</span>' +
        '<span class="pl-tile-nome">' + esc(v.nome) + '</span>' +
        (v.bloccata ? '<span class="pl-tile-lock" aria-hidden="true">' + ICO_LOCK + '</span>' : '') +
      '</button>';
    });
    rail.innerHTML = h;
    rail.querySelectorAll('.pl-tile').forEach(function (t) {
      t.addEventListener('click', function () {
        if (trascinato) return;
        var i = +t.dataset.i;
        if (i !== focus) { var d = i - focus; focus = i; aggiorna(d, true); }
        apriVoce(voci[i]);
      });
    });
    if (focus >= voci.length) focus = 0;
    aggiorna(0, true);
  }

  function aggiorna(dir, muto) {
    var v = voci[focus]; if (!v || !eroe) return;
    eroe.innerHTML =
      '<div class="pl-eroe-grp">' + esc(v.gruppo) + '</div>' +
      '<h2 class="pl-eroe-nome">' + esc(v.nome) + '</h2>' +
      '<p class="pl-eroe-desc">' + esc(v.desc) + '</p>' +
      (v.bloccata ? '<div class="pl-eroe-hint">' + esc(L('bloccata dal tuo piano', 'locked by your plan', 'bloqueada por tu plan')) + '</div>' : '');
    animaEroe(dir || 0);
    rail.querySelectorAll('.pl-tile').forEach(function (t) { t.classList.toggle('fuoco', +t.dataset.i === focus); });
    var atmo = overlay.querySelector('.pl-atmo');
    if (atmo && voci.length > 1) atmo.style.setProperty('--pl-x', (12 + (focus / (voci.length - 1)) * 76) + '%');
    glide();
    if (!muto) bip(560, 0.05, 0.035);
  }

  function glide() {
    var att = rail.querySelector('.pl-tile.fuoco'), primo = rail.querySelector('.pl-tile');
    if (!att || !primo) return;
    rail.style.transform = 'translate3d(' + (primo.offsetLeft - att.offsetLeft) + 'px,0,0)';
  }

  function animaEroe(dir) {
    if (menoMoto() || !eroe) return;
    try {
      eroe.classList.remove('pl-mosso');
      void eroe.offsetWidth;
      eroe.style.setProperty('--pl-dx', (dir > 0 ? 34 : dir < 0 ? -34 : 0) + 'px');
      eroe.classList.add('pl-mosso');
    } catch (e) { /* niente */ }
  }

  function muovi(d) {
    if (!voci.length) return;
    var n = Math.max(0, Math.min(voci.length - 1, focus + d));
    if (n === focus) return;
    focus = n; aggiorna(d);
  }
  function saltaGruppo(d) {
    if (!voci.length) return;
    var i = focus;
    if (d > 0) { for (i = focus + 1; i < voci.length; i++) if (voci[i].inizioGruppo) break; if (i >= voci.length) i = voci.length - 1; }
    else {
      var g = voci[focus].gruppo, j = focus;
      while (j > 0 && !(voci[j].inizioGruppo && voci[j].gruppo !== g)) j--;
      i = j;
    }
    if (i === focus) return;
    var dir = i > focus ? 1 : -1;
    focus = i; aggiorna(dir);
  }
  function apriVoce(v) {
    if (!v) return;
    bip(780, 0.11, 0.06);
    chiudi();
    try { A().vai(v.id); } catch (e) { location.hash = '#' + v.id; }
  }

  function apri() {
    if (!overlay) return;
    if (aperto && !overlay.hidden) return;
    disegna(); overlay.hidden = false; aperto = true;
    document.body.classList.add('plancia-on');
    document.addEventListener('keydown', tasti, true);
    setTimeout(glide, 30);
    try { window.SB_PILOTA && window.SB_PILOTA.aggiorna(); } catch (e) {}
    avviaPad();
  }
  function chiudi() {
    if (!overlay) return;
    overlay.hidden = true; aperto = false;
    document.body.classList.remove('plancia-on');
    try { if (window.SB_CURSORE_VIS) window.SB_CURSORE_VIS(true); } catch (e) {}
    document.removeEventListener('keydown', tasti, true);
    try { window.SB_PILOTA && window.SB_PILOTA.aggiorna(); } catch (e) {}
  }

  function tasti(e) {
    if (e.key === 'Escape') { e.preventDefault(); chiudi(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); muovi(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); muovi(-1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); saltaGruppo(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); saltaGruppo(-1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apriVoce(voci[focus]); }
    else if (e.key === 'Home') { e.preventDefault(); focus = 0; aggiorna(-1); }
    else if (e.key === 'End') { e.preventDefault(); focus = voci.length - 1; aggiorna(1); }
  }

  var padStato = { x: 0, y: 0, a: false, b: false };
  function zonaMorta(v, soglia) {
    var a = Math.abs(v);
    if (!(a > soglia)) return 0;
    return (v < 0 ? -1 : 1) * (a - soglia) / (1 - soglia);
  }
  function pilotaVivo() {
    try { return !!(window.SB_PILOTA && window.SB_PILOTA.stato && window.SB_PILOTA.stato()); } catch (e) { return false; }
  }
  function pilotaPunta() {
    try { return !!(window.SB_PILOTA && window.SB_PILOTA.puntatore && window.SB_PILOTA.puntatore()); } catch (e) { return false; }
  }
  function pad() {
    var gps = [];
    try { gps = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { gps = []; }
    var gp = null, any = false;
    for (var i = 0; i < gps.length; i++) { if (gps[i]) { gp = gps[i]; any = true; break; } }
    if (gp) {
      var ax = gp.axes || [], bt = gp.buttons || [], now = Date.now();
      var std = gp.mapping === 'standard';
      var dx = zonaMorta(ax[0] || 0, 0.35), dy = zonaMorta(ax[1] || 0, 0.35);
      var dr = dx > 0.45 || (std && bt[15] && bt[15].pressed), dl = dx < -0.45 || (std && bt[14] && bt[14].pressed);
      var dd = dy > 0.45 || (std && bt[13] && bt[13].pressed), du = dy < -0.45 || (std && bt[12] && bt[12].pressed);
      var aBtn = std && bt[0] && bt[0].pressed, bBtn = std && bt[1] && bt[1].pressed;
      if (aperto) {
        if (dr || dl) { if (!padStato.x || now - padStato.x > 130) { padStato.x = now; muovi(dr ? 1 : -1); } } else padStato.x = 0;
        if (dd || du) { if (!padStato.y || now - padStato.y > 220) { padStato.y = now; saltaGruppo(dd ? 1 : -1); } } else padStato.y = 0;
        if (aBtn && !padStato.a) { padStato.a = true; if (!pilotaPunta()) apriVoce(voci[focus]); }
        if (bBtn && !padStato.b) { padStato.b = true; chiudi(); }
      } else {
        padStato.x = 0; padStato.y = 0;
        if (aBtn && !padStato.a && !pilotaVivo()) { padStato.a = true; if (!modoOn()) setModo(true); apri(); }
      }
      if (!aBtn) padStato.a = false;
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
    bip: bip,
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
