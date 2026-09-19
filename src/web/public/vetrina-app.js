// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';

  var SEGNO = '<svg class="b-ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  function leggi(el, nome) {
    try { return JSON.parse(el.getAttribute(nome) || 'null'); } catch (e) { return null; }
  }

  function eur(n) { return '€' + Number(n || 0).toFixed(2).replace('.', ','); }

  function secco() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }

  function toast(msg, tipo) {
    var box = document.getElementById('toast-box');
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'toast' + (tipo === 'errore' ? ' errore' : '');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
      el.classList.add('esce');
      var via = function () { el.remove(); };
      el.addEventListener('animationend', via, { once: true });
      setTimeout(via, 700);
    }, 4000);
  }

  function avvisi() {
    var cassetto = document.querySelector('.vt-avvisi');
    if (!cassetto) return;
    var p = leggi(cassetto, 'data-avvisi');
    if (!p) return;
    var q = new URLSearchParams(location.search);

    var err = q.get('errore');
    if (err) {
      var carta = document.createElement('div');
      carta.className = 'carta avviso vt-errore';
      var riga = document.createElement('p');
      riga.textContent = (p.errore && p.errore[err]) || (p.altro + err);
      carta.appendChild(riga);
      cassetto.appendChild(carta);
    }

    var ab = q.get('abbonato');
    var ann = q.get('abbonamento');
    if (ab === '1') toast(p.pagato);
    else if (ab === 'attesa') toast(p.attesa);
    else if (ab) toast(p.senzaPagamento, 'errore');
    else if (ann === 'annullato') toast(p.annullato);
    if (ab || ann) { try { history.replaceState(null, '', '/'); } catch (e) {  } }
  }

  function conto() {
    var box = document.querySelector('[data-comp]');
    if (!box) return;
    var d = leggi(box, 'data-conto');
    if (!d) return;

    var tot = box.querySelector('[data-tot]');
    var nota = box.querySelector('[data-nota]');
    var risp = box.querySelector('[data-risp]');
    var vai = box.querySelector('[data-vai]');
    if (!tot || !nota || !risp || !vai) return;

    var caselle = [].slice.call(box.querySelectorAll('input[type=checkbox]'));
    var scelti = function () {
      return caselle.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
    };
    var prezzoDi = function (id) { return Number(d.prezzi[id] || 0); };

    var miglioreBundle = function (ids) {
      if (!ids.length) return null;
      var somma = ids.reduce(function (t, x) { return t + prezzoDi(x); }, 0);
      var vinc = null;
      (d.bundle || []).forEach(function (b) {
        var copre = ids.every(function (x) { return b.addon.indexOf(x) >= 0; });
        if (!copre || !(b.prezzo < somma)) return;
        if (!vinc || b.prezzo < vinc.prezzo) vinc = { id: b.id, nome: b.nome, prezzo: b.prezzo, somma: somma };
      });
      return vinc;
    };

    var aggiorna = function () {
      var ids = scelti();
      var somma = ids.reduce(function (t, x) { return t + prezzoDi(x); }, 0);
      var b = miglioreBundle(ids);
      tot.textContent = eur(d.base + (b ? b.prezzo : somma));
      nota.textContent = ids.length
        ? d.testi.conta.replace('{n}', ids.length).replace('{parola}', ids.length === 1 ? d.testi.uno : d.testi.tanti)
        : d.testi.niente;
      if (b) {
        risp.hidden = false;
        risp.innerHTML = SEGNO;
        risp.appendChild(document.createTextNode(' ' + d.testi.risparmio
          .replace('{nome}', b.nome).replace('{prezzo}', eur(b.prezzo)).replace('{somma}', eur(b.somma))));
      } else {
        risp.hidden = true;
        risp.textContent = '';
      }
      box.setAttribute('data-bundle', b ? b.id : '');
    };

    var guscio = document.getElementById('vt-comp-guscio');
    var vaiAlComp = function () {
      if (guscio) guscio.scrollIntoView({ behavior: secco() ? 'auto' : 'smooth', block: 'start' });
    };
    var invito = document.querySelector('[data-vai-comp]');
    if (invito) invito.addEventListener('click', vaiAlComp);

    var pacchi = [].slice.call(document.querySelectorAll('[data-pacco]'));
    pacchi.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-pacco');
        var b = (d.bundle || []).filter(function (x) { return x.id === id; })[0];
        if (!b || !caselle.length) return;
        var gia = scelti();
        var uguale = gia.length === b.addon.length && b.addon.every(function (x) { return gia.indexOf(x) >= 0; });
        caselle.forEach(function (c) { c.checked = uguale ? false : b.addon.indexOf(c.value) >= 0; });
        aggiorna();
        pacchi.forEach(function (e) {
          var acceso = !uguale && e === btn;
          e.classList.toggle('on', acceso);
          e.setAttribute('aria-pressed', acceso ? 'true' : 'false');
        });
        vaiAlComp();
      });
    });

    box.addEventListener('change', function (ev) {
      if (ev.target && ev.target.matches && ev.target.matches('input[type=checkbox]')) aggiorna();
    });

    var scelta = box.querySelector('[data-scelta]');
    var porte = scelta ? [].slice.call(scelta.querySelectorAll('[data-porta]')) : [];
    var dove = function () {
      var acceso = porte.filter(function (b) { return b.classList.contains('on'); })[0];
      return acceso ? acceso.getAttribute('data-porta') : 'twitch';
    };

    if (scelta) scelta.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== scelta && porte.indexOf(t) < 0) t = t.parentNode;
      if (porte.indexOf(t) < 0) return;
      porte.forEach(function (b) {
        var on = b === t;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });

    vai.addEventListener('click', function () {
      var ids = scelti();
      var b = box.getAttribute('data-bundle');
      var come = dove();
      var q = new URLSearchParams();
      if (b) q.set('bundle', b);
      else if (ids.length) q.set('pacchetti', ids.join(','));
      if (come !== 'twitch') q.set('come', come);
      location.href = '/accedi' + (q.toString() ? '?' + q : '');
    });

    aggiorna();
  }

  function avvia() {
    try { if (window.SB_SPLASH_OFF) window.SB_SPLASH_OFF(); } catch (e) {  }
    try { avvisi(); } catch (e) {  }
    try { conto(); } catch (e) {  }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
