// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  var PASSI = [1000, 2000, 4000, 8000, 15000];

  function apri(url, o) {
    o = o || {};
    var es = null, chiuso = false, caduto = false, tentativi = 0, timer = 0, guardia = 0;
    var ultimo = Date.now(), apertoUnaVolta = false;

    function passo() { return PASSI[Math.min(tentativi++, PASSI.length - 1)]; }
    function segnaCaduta() {
      if (caduto) return;
      caduto = true;
      if (o.suCaduta) { try { o.suCaduta(); } catch (e) {} }
    }
    function riapri(dopo) {
      if (chiuso || timer) return;
      timer = setTimeout(function () { timer = 0; collega(); }, dopo);
    }
    function collega() {
      if (chiuso) return;
      if (es) { try { es.close(); } catch (e) {} }
      try { es = new EventSource(url); }
      catch (e) { es = null; segnaCaduta(); riapri(passo()); return; }
      es.onopen = function () {
        ultimo = Date.now();
        var tornato = caduto, n = tentativi;
        caduto = false; tentativi = 0;
        if (!apertoUnaVolta) { apertoUnaVolta = true; if (o.suAperto) { try { o.suAperto(); } catch (e) {} } }
        else if (tornato && o.suRitorno) { try { o.suRitorno(n); } catch (e) {} }
      };
      es.onmessage = function (m) {
        ultimo = Date.now();
        if (o.suMessaggio) o.suMessaggio(m);
      };
      es.onerror = function () {
        segnaCaduta();
        if (es && es.readyState === 2) riapri(passo());
      };
    }
    collega();
    if (o.silenzio > 0) {
      guardia = setInterval(function () {
        if (chiuso || !es || es.readyState !== 1) return;
        if (Date.now() - ultimo > o.silenzio) { segnaCaduta(); tentativi++; collega(); }
      }, Math.max(1000, Math.min(o.silenzio / 3, 10000)));
    }
    return {
      chiudi: function () {
        chiuso = true;
        clearTimeout(timer); timer = 0;
        clearInterval(guardia); guardia = 0;
        if (es) { try { es.close(); } catch (e) {} }
        es = null;
      },
      stato: function () { return es ? es.readyState : 2; },
      caduto: function () { return caduto; }
    };
  }

  window.SB_FLUSSO = { apri: apri };
})();
