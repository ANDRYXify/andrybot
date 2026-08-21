// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  function A() { return window.SB_APP; }
  function L(it, en, es) { try { return A().L(it, en, es); } catch (e) { return it; } }
  function esc(s) { try { return A().esc(String(s)); } catch (e) { return String(s == null ? '' : s); } }
  function menoMoto() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }

  var ICO_PAD = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><rect x="2" y="6" width="20" height="12" rx="4"/></svg>';

  var overlay = null, eroe = null, rail = null, voci = [], focus = 0, aperto = false, rafPad = 0;

  function costruisci() {
    var b = document.createElement('button');
    b.id = 'plancia-lancia'; b.type = 'button';
    b.setAttribute('aria-label', L('Modalità gaming', 'Gaming mode', 'Modo gaming'));
    b.innerHTML = ICO_PAD;
    b.addEventListener('click', apri);
    document.body.appendChild(b);

    overlay = document.createElement('div'); overlay.id = 'plancia-overlay'; overlay.hidden = true;
    overlay.innerHTML =
      '<div class="pl-top"><span class="pl-marchio">' + ICO_PAD + '<b>' + esc(L('Plancia', 'Deck', 'Consola')) + '</b></span>' +
        '<button type="button" class="btn secondario mini pl-esci">' + esc(L('Modalità classica', 'Classic mode', 'Modo clásico')) + '</button></div>' +
      '<div class="pl-eroe"></div>' +
      '<div class="pl-rail" role="listbox" aria-label="' + esc(L('Sezioni', 'Sections', 'Secciones')) + '"></div>' +
      '<div class="pl-guida"><span>←→</span> ' + esc(L('muovi', 'move', 'mover')) + ' &nbsp; <span>Invio</span> ' + esc(L('apri', 'open', 'abrir')) + ' &nbsp; <span>Esc</span> ' + esc(L('esci', 'exit', 'salir')) + ' &nbsp; <span>A</span><span>B</span> ' + esc(L('col controller', 'with a controller', 'con el mando')) + '</div>';
    document.body.appendChild(overlay);
    eroe = overlay.querySelector('.pl-eroe');
    rail = overlay.querySelector('.pl-rail');
    overlay.querySelector('.pl-esci').addEventListener('click', chiudi);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) chiudi(); });
  }

  function indice() {
    var a = A(); if (!a) return [];
    var out = [], gruppi = (a.gruppi || []).slice();
    if (a.isAdmin && a.gruppoAdmin) gruppi.push(a.gruppoAdmin);
    gruppi.forEach(function (g) {
      var gn = a.tGruppo(g.id, g.nome);
      (g.schede || []).forEach(function (s) {
        var id = s[0];
        if (a.schedaValida && !a.schedaValida(id)) return;
        out.push({ id: id, nome: a.tScheda(id, s[1]), gruppo: gn, icona: a.icona(id) || '', desc: a.desc ? a.desc(id) : '', bloccata: a.schedaBloccata ? a.schedaBloccata(id) : false });
      });
    });
    return out;
  }

  function disegna() {
    voci = indice();
    var h = '', gcorr = null;
    voci.forEach(function (v, i) {
      if (v.gruppo !== gcorr) { gcorr = v.gruppo; h += '<div class="pl-grp-lbl">' + esc(gcorr) + '</div>'; }
      h += '<button type="button" role="option" class="pl-tile' + (v.bloccata ? ' bloccata' : '') + '" data-i="' + i + '" style="--pl-r:' + (i % 6) * 40 + 'ms">' +
        '<span class="pl-tile-ico">' + v.icona + '</span><span class="pl-tile-nome">' + esc(v.nome) + '</span>' +
        (v.bloccata ? '<span class="pl-tile-lock" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>' : '') + '</button>';
    });
    rail.innerHTML = h;
    rail.querySelectorAll('.pl-tile').forEach(function (t) {
      t.addEventListener('click', function () { var i = +t.dataset.i; if (i === focus) apriVoce(voci[i]); else { focus = i; aggiorna(); } });
      t.addEventListener('mousemove', function () { var i = +t.dataset.i; if (i !== focus) { focus = i; aggiorna(); } });
    });
    if (focus >= voci.length) focus = 0;
    aggiorna();
  }

  function aggiorna() {
    var v = voci[focus]; if (!v || !eroe) return;
    eroe.innerHTML =
      '<div class="pl-eroe-ico">' + v.icona + '</div>' +
      '<div class="pl-eroe-txt">' +
        '<div class="pl-eroe-grp">' + esc(v.gruppo) + '</div>' +
        '<h2 class="pl-eroe-nome">' + esc(v.nome) + '</h2>' +
        '<p class="pl-eroe-desc">' + esc(v.desc) + '</p>' +
        '<div class="pl-eroe-hint">' + esc(L('Invio o A per aprire', 'Enter or A to open', 'Intro o A para abrir')) +
          (v.bloccata ? ' · ' + esc(L('bloccata dal tuo piano', 'locked by your plan', 'bloqueada por tu plan')) : '') + '</div>' +
      '</div>';
    var att = null;
    rail.querySelectorAll('.pl-tile').forEach(function (t) { var f = +t.dataset.i === focus; t.classList.toggle('fuoco', f); if (f) att = t; });
    if (att) att.scrollIntoView({ behavior: menoMoto() ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  }

  function muovi(d) { if (!voci.length) return; focus = Math.max(0, Math.min(voci.length - 1, focus + d)); aggiorna(); }
  function apriVoce(v) { if (!v) return; chiudi(); try { A().vai(v.id); } catch (e) { location.hash = '#' + v.id; } }

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
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); muovi(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); muovi(-1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apriVoce(voci[focus]); }
    else if (e.key === 'Home') { e.preventDefault(); focus = 0; aggiorna(); }
    else if (e.key === 'End') { e.preventDefault(); focus = voci.length - 1; aggiorna(); }
  }

  var padStato = { mv: 0, a: false, b: false };
  function pad() {
    var gps = [];
    try { gps = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { gps = []; }
    var gp = null, any = false;
    for (var i = 0; i < gps.length; i++) { if (gps[i]) { gp = gps[i]; any = true; break; } }
    if (gp) {
      var ax = gp.axes || [], bt = gp.buttons || [], now = Date.now();
      var dx = ax[0] || 0;
      var right = dx > 0.55 || (bt[15] && bt[15].pressed);
      var left = dx < -0.55 || (bt[14] && bt[14].pressed);
      if (right || left) { if (!padStato.mv || now - padStato.mv > 170) { padStato.mv = now; if (aperto) muovi(right ? 1 : -1); } }
      else padStato.mv = 0;
      var aBtn = bt[0] && bt[0].pressed, bBtn = bt[1] && bt[1].pressed;
      if (aBtn && !padStato.a) { padStato.a = true; if (aperto) apriVoce(voci[focus]); else apri(); }
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
    if ((e.metaKey || e.ctrlKey) && k === 'g') { e.preventDefault(); aperto ? chiudi() : apri(); }
  }

  window.SB_PLANCIA = { apri: function () { try { apri(); } catch (e) {} }, chiudi: chiudi };

  function avvia() {
    if (!A()) { window.addEventListener('sb-app-pronta', avvia, { once: true }); return; }
    if (document.getElementById('plancia-lancia')) return;
    costruisci();
    document.addEventListener('keydown', scorc);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
