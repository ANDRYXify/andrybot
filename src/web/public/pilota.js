// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  function A() { return window.SB_APP; }
  function L(it, en, es) { try { return A().L(it, en, es); } catch (e) { return it; } }
  function esc(s) { try { return A().esc(String(s)); } catch (e) { return String(s == null ? '' : s); } }

  var K_MODO = 'sb-plancia';
  function modoOn() { try { return localStorage.getItem(K_MODO) === '1'; } catch (e) { return false; } }

  var SEL = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [role="button"], [tabindex]:not([tabindex="-1"])';
  var SEL_TESTO = 'input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]), textarea';

  var attivo = false, anello = null, legenda = null, corrente = null, rafPad = 0, osk = null, oskTarget = null, oskMaiusc = false, oskSimboli = false;
  var padVivo = false;

  function navIndiretta(v) {
    try { document.body.classList.toggle('nav-indiretta', !!v); } catch (e) {}
    if (!v) liberaCursore();
  }
  function avvistaPad() {
    if (!padVivo) { padVivo = true; try { document.body.classList.add('pad-vivo'); } catch (e) {} aggiornaLegenda(); }
    guida(true);
  }
  function segnaPad() {
    avvistaPad();
    navIndiretta(true);
  }
  function inputPad(gp) {
    if (!gp) return false;
    var ax = gp.axes || [], bt = gp.buttons || [], i;
    for (i = 0; i < ax.length; i++) if (Math.abs(ax[i] || 0) > 0.25) return true;
    for (i = 0; i < bt.length; i++) if (bt[i] && bt[i].pressed) return true;
    return false;
  }
  var padGuida = false;
  function guida(v) {
    v = !!v;
    if (padGuida === v) return;
    padGuida = v;
    try { document.body.classList.toggle('pad-guida', v); } catch (e) {}
  }
  function zonaMorta(v, soglia) {
    var a = Math.abs(v);
    if (!(a > soglia)) return 0;
    return (v < 0 ? -1 : 1) * (a - soglia) / (1 - soglia);
  }

  var pX = -1, pY = -1, sopra = null, modoPuntatore = false, idPunt = 0;
  function centraPuntatore() {
    if (pX >= 0) return;
    pX = (window.innerWidth || 800) / 2;
    pY = (window.innerHeight || 600) / 2;
  }
  function elementoSotto(x, y) {
    try {
      var e = document.elementFromPoint(x, y);
      if (!e) return null;
      var t = e.closest ? e.closest(SEL) : null;
      return t && visibile(t) ? t : null;
    } catch (err) { return null; }
  }
  function mandaPuntatore(tipo, x, y, bersaglio, extra) {
    var el = bersaglio || document.elementFromPoint(x, y) || document.body;
    var o = {
      bubbles: true, cancelable: true, composed: true, view: window,
      clientX: x, clientY: y, screenX: x, screenY: y,
      pointerId: 3, pointerType: 'mouse', isPrimary: true, button: 0, buttons: extra && extra.buttons || 0,
      relatedTarget: extra && 'rel' in extra ? extra.rel : null,
    };
    try { el.dispatchEvent(new PointerEvent(tipo, o)); } catch (e) {
      try { el.dispatchEvent(new MouseEvent(tipo.replace('pointer', 'mouse'), o)); } catch (e2) {  }
    }
    return el;
  }
  function muoviPuntatore(dx, dy) {
    centraPuntatore();
    var vw = window.innerWidth || 800, vh = window.innerHeight || 600;
    pX = Math.max(2, Math.min(vw - 2, pX + dx));
    pY = Math.max(2, Math.min(vh - 2, pY + dy));
    modoPuntatore = true;
    if (document.body.classList.contains('nav-indiretta')) navIndiretta(false);

    var grezzo = document.elementFromPoint(pX, pY) || document.body;
    if (grezzo !== sopra) {
      if (sopra) { mandaPuntatore('pointerout', pX, pY, sopra, { rel: grezzo }); mandaPuntatore('pointerleave', pX, pY, sopra, { rel: grezzo }); }
      sopra = grezzo;
      mandaPuntatore('pointerover', pX, pY, grezzo, { rel: null });
      mandaPuntatore('pointerenter', pX, pY, grezzo, { rel: null });
      var att = grezzo.closest ? grezzo.closest(SEL) : null;
      if (att && visibile(att)) { corrente = att; aggiornaLegenda(); }
    }
    mandaPuntatore('pointermove', pX, pY, grezzo);
  }
  function clicPuntatore() {
    centraPuntatore();
    var el = document.elementFromPoint(pX, pY);
    if (!el) return false;
    var t = (el.closest && el.closest(SEL)) || el;
    mandaPuntatore('pointerdown', pX, pY, el, { buttons: 1 });
    mandaPuntatore('pointerup', pX, pY, el);
    try { t.focus && t.focus({ preventScroll: true }); } catch (e) {  }
    try { t.click ? t.click() : mandaPuntatore('click', pX, pY, el); } catch (e) {  }
    return true;
  }
  function spegniPad() {
    padVivo = false;
    try { document.body.classList.remove('pad-vivo'); } catch (e) {}
    guida(false);
    navIndiretta(false);
  }

  function visibile(el) {
    try {
      if (el.disabled || el.hidden) return false;
      if (el.closest('[hidden]')) return false;
      var r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) return false;
      var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
      if (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) return false;
      var st = getComputedStyle(el);
      if (st.visibility === 'hidden' || st.display === 'none' || +st.opacity < 0.05) return false;
      if (!el.offsetParent && st.position !== 'fixed') return false;
      var cx = Math.min(vw - 1, Math.max(1, r.left + r.width / 2));
      var cy = Math.min(vh - 1, Math.max(1, r.top + r.height / 2));
      var sopra = document.elementFromPoint(cx, cy);
      if (!sopra) return false;
      if (sopra !== el && !el.contains(sopra) && !sopra.contains(el)) return false;
      return true;
    } catch (e) { return false; }
  }

  function ambito() {
    if (osk && !osk.hidden) return osk;
    var pl = document.getElementById('plancia-overlay');
    if (pl && !pl.hidden) return pl;
    var cv = document.getElementById('cerca-overlay');
    if (cv && cv.classList.contains('aperto')) return cv;
    return document;
  }

  function lista() {
    try {
      var root = ambito();
      var out = [], n = root.querySelectorAll(SEL);
      for (var i = 0; i < n.length; i++) if (visibile(n[i])) out.push(n[i]);
      return out;
    } catch (e) { return []; }
  }

  function punteggio(c, t, dir) {
    var cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    var tx = t.left + t.width / 2, ty = t.top + t.height / 2;
    var T = 6;
    if (dir === 'right' && t.left < c.right - T) return -1;
    if (dir === 'left' && t.right > c.left + T) return -1;
    if (dir === 'down' && t.top < c.bottom - T) return -1;
    if (dir === 'up' && t.bottom > c.top + T) return -1;
    var primario, perp;
    if (dir === 'left' || dir === 'right') {
      primario = Math.abs(tx - cx);
      perp = Math.abs(ty - cy);
      var ov = Math.min(c.bottom, t.bottom) - Math.max(c.top, t.top);
      if (ov > 0) perp = Math.max(0, perp - ov);
    } else {
      primario = Math.abs(ty - cy);
      perp = Math.abs(tx - cx);
      var ox = Math.min(c.right, t.right) - Math.max(c.left, t.left);
      if (ox > 0) perp = Math.max(0, perp - ox);
    }
    return primario + perp * 2.6;
  }

  function vaiVerso(dir) {
    var els = lista();
    if (!els.length) return;
    if (!corrente || !corrente.isConnected || !visibile(corrente) || els.indexOf(corrente) < 0) { metti(els[0]); return; }
    var c = corrente.getBoundingClientRect(), best = null, bestS = Infinity;
    for (var i = 0; i < els.length; i++) {
      if (els[i] === corrente) continue;
      var s = punteggio(c, els[i].getBoundingClientRect(), dir);
      if (s >= 0 && s < bestS) { bestS = s; best = els[i]; }
    }
    if (best) metti(best);
  }

  function metti(el) {
    if (!el) return;
    corrente = el;
    try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} }
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); } catch (e) {}
    setTimeout(aggiornaAnello, 60);
    aggiornaAnello();
    aggiornaLegenda();
    voce('tocco');
  }

  function creaAnello() { anello = null; }
  var ultimoRect = '';
  function seguiAnello() {
    if (!attivo) return;
    if (!corrente || !corrente.isConnected) { liberaCursore(); return; }
    try {
      var r = corrente.getBoundingClientRect();
      var firma = (r.left | 0) + ',' + (r.top | 0) + ',' + (r.width | 0) + ',' + (r.height | 0);
      if (firma !== ultimoRect) { ultimoRect = firma; aggiornaAnello(); }
    } catch (e) {  }
  }
  function aggiornaAnello() {
    if (!corrente || !corrente.isConnected || !visibile(corrente)) { liberaCursore(); return; }
    var ind = false;
    try { ind = document.body.classList.contains('nav-indiretta'); } catch (e) {}
    if (!ind) { liberaCursore(); return; }
    try { if (window.SB_CURSORE) window.SB_CURSORE.versoElemento(corrente); } catch (e) {}
  }
  function liberaCursore() { try { if (window.SB_CURSORE) window.SB_CURSORE.libera(); } catch (e) {} }

  function creaLegenda() {
    legenda = document.createElement('div'); legenda.id = 'pil-legenda';
    document.body.appendChild(legenda);
  }
  function tastoHtml(t, testo, cls) { return '<span class="pil-t"><b class="pil-b ' + (cls || '') + '">' + esc(t) + '</b>' + esc(testo) + '</span>'; }
  function aggiornaLegenda() {
    if (!legenda) return;
    var h = '';
    var pl = document.getElementById('plancia-overlay');
    if (pl && !pl.hidden) {
      legenda.innerHTML = tastoHtml('A', L('apri', 'open', 'abrir'), 'a') + tastoHtml('B', L('esci', 'exit', 'salir'), 'b') +
        '<span class="pil-t"><b class="pil-b">←→</b>' + esc(L('scorri', 'scroll', 'desplaza')) + '</span>' +
        '<span class="pil-t"><b class="pil-b">↑↓</b>' + esc(L('gruppo', 'group', 'grupo')) + '</span>';
      return;
    }
    if (osk && !osk.hidden) {
      h = tastoHtml('A', L('scrivi', 'type', 'escribir'), 'a') + tastoHtml('B', L('chiudi', 'close', 'cerrar'), 'b') +
          tastoHtml('X', L('cancella', 'delete', 'borrar'), 'x') + tastoHtml('Y', L('spazio', 'space', 'espacio'), 'y');
    } else {
      var suTesto = corrente && corrente.matches && corrente.matches(SEL_TESTO);
      h = '<span class="pil-t"><b class="pil-b">L</b>' + esc(L('punta', 'point', 'apunta')) + '</span>' +
          tastoHtml('A', suTesto ? L('scrivi', 'type', 'escribir') : (modoPuntatore ? L('clicca', 'click', 'clica') : L('seleziona', 'select', 'seleccionar')), 'a') +
          tastoHtml('B', L('indietro', 'back', 'atrás'), 'b') +
          tastoHtml('Y', L('cerca', 'search', 'buscar'), 'y') +
          '<span class="pil-t"><b class="pil-b">✛</b>' + esc(L('salta', 'jump', 'salta')) + '</span>' +
          '<span class="pil-t"><b class="pil-b">R</b>' + esc(L('scorri', 'scroll', 'desplaza')) + '</span>' +
          '<span class="pil-t"><b class="pil-b">LB/RB</b>' + esc(L('sezione', 'section', 'sección')) + '</span>' +
          '<span class="pil-t"><b class="pil-b">☰</b>' + esc(L('Plancia', 'Deck', 'Consola')) + '</span>';
    }
    legenda.innerHTML = h;
  }

  function voce(n) { try { if (window.SB_SUONO && window.SB_SUONO.suona) window.SB_SUONO.suona(n); } catch (e) {} }

  function attiva() {
    if (attivo) return;
    attivo = true;
    document.body.classList.add('pilota-on');
    if (!anello) creaAnello();
    if (!legenda) creaLegenda();
    navIndiretta(false);
    aggiornaLegenda();
    window.addEventListener('scroll', aggiornaAnello, true);
    window.addEventListener('resize', aggiornaAnello);
    avviaPad();
  }
  function disattiva() {
    attivo = false;
    document.body.classList.remove('pilota-on');
    spegniPad();
    liberaCursore();
    window.removeEventListener('scroll', aggiornaAnello, true);
    window.removeEventListener('resize', aggiornaAnello);
    chiudiOsk();
  }

  var TASTI_ABC = [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l','-'],
    ['z','x','c','v','b','n','m','.','_','@']
  ];
  var TASTI_SIM = [
    ['!','?','#','$','%','&','*','(',')','+'],
    ['/','\\',':',';','"','\'','<','>','[',']'],
    ['{','}','|','=','~','^','`','€','£','§'],
    ['à','è','é','ì','ò','ù','ç','°','§',',']
  ];

  function apriOsk(target) {
    if (!target) return;
    oskTarget = target;
    if (!osk) {
      osk = document.createElement('div'); osk.id = 'pil-osk';
      document.body.appendChild(osk);
    }
    osk.hidden = false;
    disegnaOsk();
    document.body.classList.add('osk-on');
    var primo = osk.querySelector('.pil-k');
    if (primo) metti(primo);
    aggiornaLegenda();
  }
  function chiudiOsk() {
    if (!osk || osk.hidden) return;
    osk.hidden = true;
    document.body.classList.remove('osk-on');
    var t = oskTarget; oskTarget = null;
    aggiornaLegenda();
    if (t && t.isConnected) metti(t);
  }
  function disegnaOsk() {
    var righe = oskSimboli ? TASTI_SIM : TASTI_ABC;
    var val = oskTarget ? String(oskTarget.value || '') : '';
    var h = '<div class="pil-osk-box">' +
      '<div class="pil-osk-testa"><span class="pil-osk-eti">' + esc(etichettaDi(oskTarget)) + '</span>' +
      '<div class="pil-osk-val">' + (val ? esc(val) : '<i>' + esc(L('vuoto', 'empty', 'vacío')) + '</i>') + '<span class="pil-caret"></span></div></div>' +
      '<div class="pil-osk-griglia">';
    righe.forEach(function (r) {
      h += '<div class="pil-osk-riga">';
      r.forEach(function (k) {
        var lab = (oskMaiusc && !oskSimboli) ? k.toUpperCase() : k;
        h += '<button type="button" class="pil-k" data-k="' + esc(lab) + '">' + esc(lab) + '</button>';
      });
      h += '</div>';
    });
    h += '<div class="pil-osk-riga pil-osk-azioni">' +
      '<button type="button" class="pil-k pil-k-w" data-a="maiusc">' + esc(oskMaiusc ? 'abc' : 'ABC') + '</button>' +
      '<button type="button" class="pil-k pil-k-w" data-a="simboli">' + esc(oskSimboli ? 'abc' : '#+=') + '</button>' +
      '<button type="button" class="pil-k pil-k-sp" data-a="spazio">' + esc(L('spazio', 'space', 'espacio')) + '</button>' +
      '<button type="button" class="pil-k pil-k-w" data-a="canc">⌫</button>' +
      '<button type="button" class="pil-k pil-k-ok" data-a="fatto">' + esc(L('Fatto', 'Done', 'Hecho')) + '</button>' +
      '</div></div></div>';
    osk.innerHTML = h;
    osk.querySelectorAll('.pil-k').forEach(function (b) { b.addEventListener('click', function () { premiTasto(b); }); });
  }
  function etichettaDi(el) {
    if (!el) return '';
    try {
      var id = el.id, lab = id ? document.querySelector('label[for="' + CSS.escape(id) + '"]') : null;
      if (lab) return lab.textContent.trim().slice(0, 60);
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').slice(0, 60);
      if (el.placeholder) return el.placeholder.slice(0, 60);
    } catch (e) {}
    return L('Scrivi', 'Type', 'Escribe');
  }
  function scrivi(txt) {
    if (!oskTarget) return;
    try {
      oskTarget.value = String(oskTarget.value || '') + txt;
      oskTarget.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {}
    aggiornaVal();
  }
  function cancella() {
    if (!oskTarget) return;
    try {
      var v = String(oskTarget.value || '');
      oskTarget.value = v.slice(0, -1);
      oskTarget.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {}
    aggiornaVal();
  }
  function aggiornaVal() {
    if (!osk) return;
    var box = osk.querySelector('.pil-osk-val');
    if (!box || !oskTarget) return;
    var val = String(oskTarget.value || '');
    box.innerHTML = (val ? esc(val) : '<i>' + esc(L('vuoto', 'empty', 'vacío')) + '</i>') + '<span class="pil-caret"></span>';
  }
  function premiTasto(b) {
    var a = b.dataset.a;
    if (a === 'maiusc') { oskMaiusc = !oskMaiusc; ridisegnaOsk(); return; }
    if (a === 'simboli') { oskSimboli = !oskSimboli; ridisegnaOsk(); return; }
    if (a === 'spazio') { scrivi(' '); voce('tocco'); return; }
    if (a === 'canc') { cancella(); voce('commuta'); return; }
    if (a === 'fatto') { voce('conferma'); chiudiOsk(); return; }
    var k = b.dataset.k;
    if (k) { scrivi(k); voce('tocco'); }
  }
  function ridisegnaOsk() {
    var idx = -1, tutti = osk.querySelectorAll('.pil-k');
    for (var i = 0; i < tutti.length; i++) if (tutti[i] === corrente) { idx = i; break; }
    disegnaOsk();
    var nuovi = osk.querySelectorAll('.pil-k');
    metti(nuovi[Math.max(0, Math.min(nuovi.length - 1, idx))] || nuovi[0]);
  }

  function azionaA() {
    if (!corrente) { var e = lista(); if (e.length) metti(e[0]); return; }
    if (osk && !osk.hidden) { if (corrente.classList.contains('pil-k')) premiTasto(corrente); return; }
    if (corrente.matches && corrente.matches(SEL_TESTO)) { apriOsk(corrente); return; }
    voce('conferma');
    try { corrente.click(); } catch (e) {}
    setTimeout(function () { aggiornaAnello(); aggiornaLegenda(); }, 220);
  }
  function azionaB() {
    if (osk && !osk.hidden) { chiudiOsk(); return; }
    var cv = document.getElementById('cerca-overlay');
    if (cv && cv.classList.contains('aperto')) { try { window.SB_CERCA && window.SB_CERCA.chiudi ? window.SB_CERCA.chiudi() : null; } catch (e) {} var esc2 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }); document.dispatchEvent(esc2); return; }
    var pl = document.getElementById('plancia-overlay');
    if (pl && !pl.hidden) return;
    try { window.SB_PLANCIA && window.SB_PLANCIA.apri(); } catch (e) {}
  }
  function azionaY() { try { window.SB_CERCA && window.SB_CERCA.apri(); } catch (e) {} setTimeout(function () { var e = lista(); if (e.length) metti(e[0]); }, 120); }
  function sezione(d) {
    try {
      var a = A(); if (!a) return;
      var tutte = [];
      (a.gruppi || []).forEach(function (g) { (g.schede || []).forEach(function (s) { if (!a.schedaValida || a.schedaValida(s[0])) tutte.push(s[0]); }); });
      var i = tutte.indexOf(a.schedaAttiva);
      if (i < 0) i = 0;
      var n = Math.max(0, Math.min(tutte.length - 1, i + d));
      if (n === i) return;
      a.vai(tutte[n]);
      voce('commuta');
      setTimeout(function () { corrente = null; var e = lista(); if (e.length) metti(e[0]); }, 260);
    } catch (e) {}
  }

  var st = { x: 0, y: 0, a: false, b: false, x2: false, y2: false, lb: false, rb: false, menu: false };
  var ultimoPad = 0, dtPad = 0;
  function pad() {
    if (!attivo) { rafPad = 0; ultimoPad = 0; return; }
    var oraPad = (window.performance && performance.now) ? performance.now() : Date.now();
    dtPad = ultimoPad ? Math.min(0.05, (oraPad - ultimoPad) / 1000) : 0.016;
    ultimoPad = oraPad;
    var gps = [];
    try { gps = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { gps = []; }
    var gp = null;
    for (var i = 0; i < gps.length; i++) if (gps[i]) { gp = gps[i]; break; }
    if (inputPad(gp)) avvistaPad();
    var plAperta = (function () { var p = document.getElementById('plancia-overlay'); return p && !p.hidden; })();
    if (plAperta) modoPuntatore = false;
    var cercaAperta = (function () { try { return document.body.classList.contains('cerca-aperta'); } catch (e) { return false; } })();
    if (cercaAperta) modoPuntatore = false;

    var ax = gp ? (gp.axes || []) : [], bt = gp ? (gp.buttons || []) : [], now = Date.now();
    var std = !!gp && gp.mapping === 'standard';
    function giu(i) { return !!(std && bt[i] && bt[i].pressed); }
    var tA = giu(0), tB = giu(1), tX = giu(2), tY = giu(3);
    var pLB = giu(4), pRB = giu(5), pMenu = giu(9);
    var nA = tA && !st.a, nB = tB && !st.b, nX = tX && !st.x2, nY = tY && !st.y2;
    var nLB = pLB && !st.lb, nRB = pRB && !st.rb, nMenu = pMenu && !st.menu;
    st.a = tA; st.b = tB; st.x2 = tX; st.y2 = tY; st.lb = pLB; st.rb = pRB; st.menu = pMenu;
    if (!gp || plAperta) { st.x = 0; st.y = 0; }

    if (gp && cercaAperta) {
      var inpC = document.getElementById('cerca-input');
      var manda = function (tasto) {
        if (!inpC) return;
        try { inpC.focus({ preventScroll: true }); } catch (e) {}
        try {
          inpC.dispatchEvent(new KeyboardEvent('keydown', { key: tasto, bubbles: true, cancelable: true }));
        } catch (e) {}
      };
      var giuC = giu(13) || zonaMorta(ax[1] || 0, 0.5) > 0;
      var suC = giu(12) || zonaMorta(ax[1] || 0, 0.5) < 0;
      if (giuC || suC) {
        var attesa = !st.cN ? 0 : (st.cN === 1 ? 430 : 170);
        if (!st.cT || now - st.cT >= attesa) {
          st.cT = now; st.cN = (st.cN || 0) + 1;
          segnaPad(); manda(giuC ? 'ArrowDown' : 'ArrowUp');
        }
      } else { st.cT = 0; st.cN = 0; }
      if (nA) { segnaPad(); manda('Enter'); }
      if (nB) { segnaPad(); manda('Escape'); }
      if (nX) { segnaPad(); apriOsk(inpC); }
      seguiAnello();
      rafPad = requestAnimationFrame(pad);
      return;
    }

    if (gp && !plAperta) {
      var lx = zonaMorta(ax[0] || 0, 0.18), ly = zonaMorta(ax[1] || 0, 0.18);
      if (lx || ly) {
        segnaPad();
        var forzaP = Math.min(1, Math.sqrt(lx * lx + ly * ly));
        var velP = Math.max(window.innerWidth || 800, window.innerHeight || 600) * 1.15 * forzaP * forzaP * dtPad;
        muoviPuntatore((lx / forzaP) * velP, (ly / forzaP) * velP);
      }
      if (nA) { segnaPad(); if (modoPuntatore) clicPuntatore(); else azionaA(); }

      var r = giu(15), l = giu(14), d = giu(13), u = giu(12);
      if (r || l || d || u || tB) segnaPad();

      if (r || l) { if (!st.x || now - st.x > 165) { st.x = now; modoPuntatore = false; navIndiretta(true); vaiVerso(r ? 'right' : 'left'); } } else st.x = 0;
      if (d || u) { if (!st.y || now - st.y > 165) { st.y = now; modoPuntatore = false; navIndiretta(true); vaiVerso(d ? 'down' : 'up'); } } else st.y = 0;
      if (nB) azionaB();
      if (nX && osk && !osk.hidden) { cancella(); voce('commuta'); }
      if (nY) { if (osk && !osk.hidden) scrivi(' '); else azionaY(); }
      if (nLB) sezione(-1);
      if (nRB) sezione(1);
      if (nMenu) { try { window.SB_PLANCIA && window.SB_PLANCIA.apri(); } catch (e) {} }
      if (std) {
        var ry = zonaMorta(ax[3] || 0, 0.35);
        if (ry) { try { window.scrollBy({ top: ry * 1100 * Math.min(0.05, dtPad), behavior: 'instant' }); } catch (er) { window.scrollBy(0, ry * 1100 * Math.min(0.05, dtPad)); } }
      }
    }
    seguiAnello();
    rafPad = requestAnimationFrame(pad);
  }
  function avviaPad() { if (!rafPad) rafPad = requestAnimationFrame(pad); }
  window.addEventListener('gamepadconnected', function () { if (attivo) avviaPad(); });

  document.addEventListener('pointerdown', function (e) {
    if (!attivo) return;
    navIndiretta(false);
    var t = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (t && visibile(t)) { corrente = t; aggiornaLegenda(); }
  }, true);
  document.addEventListener('keydown', function (e) {
    if (!attivo) return;
    var k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Tab') {
      navIndiretta(true); aggiornaAnello();
    }
  }, true);
  window.addEventListener('gamepaddisconnected', function () { spegniPad(); });

  (function tracciaModalita() {
    function punta(v) { try { document.body.classList.toggle('puntatore', !!v); } catch (e) {} }
    function mano(e) {
      if (!e || !e.isTrusted) return;
      if (e.pointerType === 'touch') return;
      guida(false);
    }
    window.addEventListener('pointermove', mano, { passive: true, capture: true });
    window.addEventListener('pointerdown', mano, { passive: true, capture: true });
    window.addEventListener('wheel', function (e) { if (e && e.isTrusted) guida(false); }, { passive: true, capture: true });
    document.addEventListener('pointerdown', function () { punta(true); }, true);
    document.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'Tab' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' ||
          k === 'Enter' || k === ' ' || k === 'Escape') punta(false);
    }, true);
  })();

  window.SB_PILOTA = {
    attiva: attiva, disattiva: disattiva,
    stato: function () { return attivo; },
    puntatore: function () { return attivo && modoPuntatore; },
    tastiera: apriOsk,
    aggiorna: function () { aggiornaAnello(); aggiornaLegenda(); }
  };

  function avvia() {
    if (!A()) { window.addEventListener('sb-app-pronta', avvia, { once: true }); return; }
    if (modoOn()) attiva();
    window.addEventListener('storage', function (e) { if (e.key === K_MODO) { modoOn() ? attiva() : disattiva(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
