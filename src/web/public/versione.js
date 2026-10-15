// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  var CHIAVE = 'sb-aggiornata';
  var FERMO_MS = 15 * 60 * 1000;
  var GIRO_MS = 10 * 60 * 1000;

  function dalServerTiming(voci) {
    voci = voci || [];
    for (var i = 0; i < voci.length; i++) if (voci[i] && voci[i].name === 'sbv' && voci[i].description) return String(voci[i].description);
    return '';
  }
  function dallaNavigazione() {
    try { var n = performance.getEntriesByType('navigation')[0]; return dalServerTiming(n && n.serverTiming); } catch (e) { return ''; }
  }

  var mia = dallaNavigazione();
  var nuova = '';
  var live = false, liveAlle = 0;
  var ultimoTocco = Date.now();
  var riquadro = null, nascosto = false, giro = 0, inCorso = false, ricarico = false, attivo = false;
  var opz = { modo: 'pannello', fonte: '/api/versione', inUso: null, spiega: null, primaDi: null, stato: null, posto: null, lingua: null };

  function lingua() {
    var l = (typeof opz.lingua === 'function' ? opz.lingua() : opz.lingua) || document.documentElement.lang || 'it';
    l = String(l).slice(0, 2).toLowerCase();
    return l === 'en' || l === 'es' ? l : 'it';
  }
  function L(it, en, es) { var l = lingua(); return l === 'en' ? en : (l === 'es' ? es : it); }
  function chiede(f) { try { return typeof f === 'function' ? f() : null; } catch (e) { return null; } }
  function inUso() { return !!chiede(opz.inUso); }

  function vede(v, vivo, certa) {
    v = String(v || '');
    if (!v) return;
    if (typeof vivo === 'boolean') { live = vivo; liveAlle = Date.now(); }
    if (!mia) { mia = v; return; }
    if (v !== mia) {
      if (nuova !== v) { nuova = v; nascosto = false; }
      if (attivo) decidi();
    } else if (nuova && certa) {
      nuova = ''; togliRiquadro(); fermaGiro();
    }
  }

  function controlla() {
    if (!attivo || inCorso || ricarico) return Promise.resolve();
    inCorso = true;
    var url = typeof opz.fonte === 'function' ? chiede(opz.fonte) : opz.fonte;
    if (!url) { inCorso = false; return Promise.resolve(); }
    return fetch(url, { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { inCorso = false; if (d && d.v) vede(d.v, typeof d.live === 'boolean' ? d.live : undefined, true); })
      .catch(function () { inCorso = false; });
  }

  function ricarica(extra) {
    if (ricarico) return;
    ricarico = true;
    var dati = { alle: Date.now(), da: mia, a: nuova, y: Math.round(window.scrollY || 0) };
    var s = chiede(opz.stato) || {};
    var k;
    for (k in s) dati[k] = s[k];
    if (extra) for (k in extra) dati[k] = extra[k];
    try { sessionStorage.setItem(CHIAVE, JSON.stringify(dati)); } catch (e) {}
    if (dati.hash != null && ('#' + String(dati.hash).replace(/^#/, '')) !== location.hash) {
      location.hash = String(dati.hash).replace(/^#/, '');
    }
    location.reload();
  }

  function decidi() {
    if (!attivo || !nuova || ricarico) return;
    var occupato = inUso();
    if (opz.modo === 'schermo') {
      if (Date.now() - liveAlle > 10000) { controlla(); avviaGiro(5000, true); return; }
      if (!occupato && !live) { ricarica(); return; }
      if (live) avviaGiro(60 * 1000, true); else avviaGiro(3000, false);
      return;
    }
    if (!occupato && (document.hidden || Date.now() - ultimoTocco >= FERMO_MS)) { ricarica(); return; }
    mostraRiquadro(occupato);
    avviaGiro(5000, false);
  }

  var giroCome = '';
  function avviaGiro(ms, chiedi) {
    var come = ms + ':' + chiedi;
    if (giro && giroCome === come) return;
    fermaGiro();
    giroCome = come;
    giro = setInterval(function () { if (chiedi) controlla(); else decidi(); }, ms);
  }
  function fermaGiro() { if (giro) { clearInterval(giro); giro = 0; giroCome = ''; } }

  function stile(el) {
    var sopra = chiede(opz.posto) === 'sopra';
    el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);z-index:2147483000;'
      + (sopra ? 'top:calc(env(safe-area-inset-top,0px) + 64px);' : 'bottom:calc(env(safe-area-inset-bottom,0px) + 16px);')
      + 'width:min(440px,calc(100vw - 32px));box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;'
      + 'padding:12px 14px;border-radius:14px;background:var(--bg,#0f0a0e);color:var(--testo,#f1e9ee);'
      + 'border:2px solid var(--acc,currentColor);box-shadow:0 10px 30px rgba(0,0,0,.35);font:500 15px/1.35 var(--testo-font,system-ui,sans-serif);';
  }
  function bottone(testo, primario) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = testo;
    b.style.cssText = 'min-height:44px;min-width:44px;padding:8px 16px;border-radius:10px;font:600 15px/1 var(--testo-font,system-ui,sans-serif);cursor:pointer;'
      + (primario ? 'background:var(--acc,#ba007a);color:var(--su-acc,#fff);border:0;' : 'background:transparent;color:inherit;border:1px solid currentColor;');
    return b;
  }
  function mostraRiquadro(occupato) {
    if (nascosto || !document.body) return;
    var spiega = chiede(opz.spiega) || '';
    var testo = occupato
      ? L('C’è una versione nuova del bot. Si aggiorna da sola appena hai finito; se vuoi, anche adesso.', 'A new version of the bot is ready. It updates by itself when you are done; you can also do it now.', 'Hay una versión nueva del bot. Se actualiza sola cuando termines; si quieres, también ahora.')
      : L('C’è una versione nuova del bot: si aggiorna da sola al prossimo cambio di scheda.', 'A new version of the bot is ready: it updates by itself at the next tab change.', 'Hay una versión nueva del bot: se actualiza sola al próximo cambio de pestaña.');
    if (!riquadro) {
      riquadro = document.createElement('div');
      riquadro.id = 'sb-versione';
      riquadro.setAttribute('role', 'status');
      riquadro.setAttribute('aria-live', 'polite');
      var p = document.createElement('p');
      p.style.cssText = 'margin:0;flex:1 1 220px;';
      p.setAttribute('data-sbv-testo', '');
      var dopo = bottone(L('Più tardi', 'Later', 'Más tarde'), false);
      dopo.setAttribute('data-sbv-dopo', '');
      dopo.addEventListener('click', function () { nascosto = true; togliRiquadro(); });
      var ora = bottone(L('Aggiorna', 'Update', 'Actualizar'), true);
      ora.setAttribute('data-sbv-aggiorna', '');
      ora.addEventListener('click', aggiornaAMano);
      riquadro.appendChild(p);
      riquadro.appendChild(dopo);
      riquadro.appendChild(ora);
      document.body.appendChild(riquadro);
    }
    stile(riquadro);
    var t = riquadro.querySelector('[data-sbv-testo]');
    var pieno = spiega ? testo + ' ' + spiega : testo;
    if (t.textContent !== pieno) t.textContent = pieno;
  }
  function togliRiquadro() { if (riquadro) { riquadro.remove(); riquadro = null; } }

  function aggiornaAMano() {
    Promise.resolve(chiede(opz.primaDi)).then(function (si) {
      if (si === false) return;
      ricarica({ mano: true });
    }, function () {});
  }

  function tocco() { ultimoTocco = Date.now(); }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) { addEventListener(t, tocco, { passive: true, capture: true }); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (nuova) decidi(); }
    else controlla();
  });
  addEventListener('online', controlla);
  setInterval(controlla, GIRO_MS);
  try {
    new PerformanceObserver(function (lista) {
      var voci = lista.getEntries();
      for (var i = 0; i < voci.length; i++) {
        var e = voci[i];
        if (!e.transferSize || String(e.name).indexOf(location.origin) !== 0) continue;
        var v = dalServerTiming(e.serverTiming);
        if (v) vede(v, undefined, false);
      }
    }).observe({ type: 'resource', buffered: false });
  } catch (e) {}

  function appena() {
    var d = null;
    try { d = JSON.parse(sessionStorage.getItem(CHIAVE) || 'null'); sessionStorage.removeItem(CHIAVE); } catch (e) { d = null; }
    return d && typeof d === 'object' && Date.now() - Number(d.alle || 0) < 5 * 60 * 1000 ? d : null;
  }
  var tornata = appena();

  window.SB_VERSIONE = {
    registra: function (o) {
      o = o || {};
      for (var k in o) if (Object.prototype.hasOwnProperty.call(opz, k)) opz[k] = o[k];
      attivo = true;
      if (!mia) controlla();
      else if (nuova) decidi();
    },
    controlla: controlla,
    vede: vede,
    momentoBuono: function (extra) {
      if (!nuova || ricarico || inUso()) return false;
      ricarica(extra);
      return true;
    },
    tornata: function () { return tornata; },
    stato: function () { return { mia: mia, nuova: nuova, live: live, inUso: inUso(), modo: opz.modo, ricarico: ricarico }; },
  };

  var tag = document.currentScript;
  if (tag && tag.getAttribute('data-modo') === 'schermo') {
    var pz = location.pathname.split('/').filter(Boolean);
    if (pz[1]) window.SB_VERSIONE.registra({ modo: 'schermo', fonte: '/overlay/' + pz[1] + '/versione' + location.search });
  }
})();
