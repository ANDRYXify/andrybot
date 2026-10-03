// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  var box = document.querySelector('.tg-prova');
  if (!box) return;
  var modo = box.getAttribute('data-prova') || 'web';
  var canale = box.getAttribute('data-canale') || '';
  var lingua = box.getAttribute('data-lingua') || document.documentElement.lang || 'it';
  var scudoAcceso = box.getAttribute('data-scudo') === '1';
  var demo = box.getAttribute('data-demo') === '1';
  var T = {};
  try { T = JSON.parse((document.querySelector('.tg-prova-testi') || {}).textContent || '{}'); } catch (e) { T = {}; }
  var P = T.porta || {};
  var E = T.errori || {};
  var carta = box.closest('.tg-gruppo') || box.parentNode;
  var entra = carta ? carta.querySelector('[data-apre-prova]') : null;
  var tg = modo === 'telegram' && window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  var initData = tg && tg.initData ? tg.initData : '';
  var gruppo = new URLSearchParams(location.search).get('c') || '';
  var base = modo === 'telegram' ? '/api/tg-scudo/' + encodeURIComponent(canale) + '/'
    : modo === 'anteprima' ? '/api/streamer/telegram/porta/anteprima/'
      : '/api/tg-porta/' + encodeURIComponent(canale) + '/';
  var segreto = '';
  var firma = '';
  var gioco = null;
  var ultima = null;
  var occupato = false;

  if (tg) { try { tg.ready(); tg.expand(); } catch (e) { tg = null; } }

  function el(tag, attr, testo) {
    var n = document.createElement(tag);
    if (attr) Object.keys(attr).forEach(function (k) { n.setAttribute(k, attr[k]); });
    if (testo !== undefined && testo !== null) n.textContent = testo;
    return n;
  }

  function chiedi(via, dati) {
    var chi = modo === 'telegram' ? { initData: initData, c: gruppo, lingua: lingua } : { s: segreto, lingua: lingua };
    return fetch(base + via, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: modo === 'anteprima' ? 'same-origin' : 'omit',
      cache: 'no-store',
      body: JSON.stringify(Object.assign(chi, dati || {})),
    }).then(function (r) {
      var tipo = r.headers.get('content-type') || '';
      if (tipo.indexOf('application/octet-stream') === 0) {
        return r.arrayBuffer().then(function (b) {
          return { esito: 'ok', bin: b, prove: Number(r.headers.get('x-prove') || 0), altra: decodeURIComponent(r.headers.get('x-altra') || '') };
        });
      }
      if (tipo.indexOf('application/json') !== 0) throw new Error('rete');
      return r.json();
    });
  }

  function ferma() {
    if (gioco) { gioco.fermo = true; gioco = null; }
  }

  function colore(nome) {
    var v = getComputedStyle(box).getPropertyValue(nome).trim();
    var m = /^#([0-9a-f]{6})$/i.exec(v);
    if (!m) return [128, 128, 128];
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function suona(tela, buf) {
    ferma();
    var d = new DataView(buf);
    if (buf.byteLength < 11 || String.fromCharCode(d.getUint8(0), d.getUint8(1), d.getUint8(2), d.getUint8(3)) !== 'SBM1') return false;
    var w = d.getUint16(4), h = d.getUint16(6), n = d.getUint16(8), fps = d.getUint8(10) || 30;
    var per = Math.ceil(w * h / 8);
    if (buf.byteLength < 11 + per * n) return false;
    var bytes = new Uint8Array(buf, 11);
    tela.width = w;
    tela.height = h;
    var ctx = tela.getContext('2d');
    var img = ctx.createImageData(w, h);
    var p = colore('--punti'), f = colore('--fondo');
    var stato = { fermo: false, ultimo: -1, t0: 0 };
    gioco = stato;
    function disegna(k) {
      var o = k * per, px = img.data;
      for (var i = 0; i < w * h; i++) {
        var acceso = (bytes[o + (i >> 3)] >> (i & 7)) & 1;
        var c = acceso ? p : f;
        var j = i * 4;
        px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2]; px[j + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    function passo(t) {
      if (stato.fermo) return;
      if (!stato.t0) stato.t0 = t;
      var k = Math.floor((t - stato.t0) * fps / 1000) % n;
      if (k !== stato.ultimo) { stato.ultimo = k; disegna(k); }
      requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
    return true;
  }

  function svuota() {
    ferma();
    box.textContent = '';
  }

  function titoloDi(testo) {
    var h = el('h3', { tabindex: '-1' }, testo);
    box.appendChild(h);
    return h;
  }

  function attendi() {
    svuota();
    box.appendChild(el('p', { class: 'tgp-nota', role: 'status' }, T.attendi || '…'));
  }

  function rifai() {
    segreto = '';
    firma = '';
    ultima = null;
    inizia();
  }

  function fine(x) {
    svuota();
    var esito = x && x.esito ? x.esito : 'chiusa';
    if (esito === 'spento' && modo === 'web' && entra) { location.href = entra.href; return; }
    var h;
    if (modo === 'telegram') {
      var e = (T.esiti && (T.esiti[esito] || T.esiti.chiusa)) || ['', ''];
      h = titoloDi(e[0]);
      box.appendChild(el('p', null, e[1]));
      if (tg && typeof tg.close === 'function') {
        var b = el('button', { type: 'button', class: 'tg-entra' }, T.chiudi || '');
        b.addEventListener('click', function () { try { tg.close(); } catch (z) { b.disabled = true; } });
        box.appendChild(b);
      }
      h.focus();
      return;
    }
    var url = x && x.url ? x.url : '';
    var testi = esito === 'dentro' ? (url ? P.pronto : P.senzaLink)
      : esito === 'admin' ? (url ? P.admin : P.senzaLink)
        : P[esito] || P.chiusa || ['', ''];
    h = titoloDi(testi[0]);
    box.appendChild(el('p', null, testi[1]));
    var riga = el('div', { class: 'tgp-riga' });
    if ((esito === 'dentro' || esito === 'admin') && url) {
      var a = el('a', { class: 'tg-entra', href: modo === 'anteprima' ? '#' : url, rel: 'noopener' }, esito === 'admin' ? P.chiedi : P.apri);
      if (modo === 'anteprima') a.addEventListener('click', function (ev) { ev.preventDefault(); });
      riga.appendChild(a);
    } else if (esito === 'dentro' || esito === 'admin') {
      var r = el('button', { type: 'button', class: 'tg-entra' }, P.riprova);
      r.addEventListener('click', function () {
        r.disabled = true;
        chiedi('link').then(fine).catch(function () { r.disabled = false; });
      });
      riga.appendChild(r);
    } else if (esito !== 'troppe') {
      var d = el('button', { type: 'button', class: 'tg-sec' }, P.rifai);
      d.addEventListener('click', rifai);
      riga.appendChild(d);
    }
    if (riga.childNodes.length) box.appendChild(riga);
    if (modo === 'anteprima' && (esito === 'dentro' || esito === 'admin')) box.appendChild(el('p', { class: 'tgp-nota' }, P.anteprimaLink));
    h.focus();
  }

  function errore(nodo, testo) {
    nodo.textContent = testo || '';
  }

  function modulo(r, riusa) {
    firma = r.firma || '';
    svuota();
    var form = el('form', { novalidate: '' });

    var sezProva = el('div', { class: 'tgp-passo', role: 'group', 'aria-labelledby': 'tgp-t' });
    var h = el('h3', { id: 'tgp-t', tabindex: '-1' }, T.prova);
    sezProva.appendChild(h);
    sezProva.appendChild(el('p', { class: 'tgp-aiuto', id: 'tgp-a' }, T.provaAiuto));
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) sezProva.appendChild(el('p', { class: 'tgp-nota' }, T.movimento));
    var tela = el('canvas', { class: 'tgp-tela', width: '160', height: '56', role: 'img', 'aria-label': T.provaVoce });
    sezProva.appendChild(tela);
    var carico = el('p', { class: 'tgp-nota', role: 'status' }, T.carico);
    sezProva.appendChild(carico);
    var riga = el('div', { class: 'tgp-riga' });
    var altra = el('button', { type: 'button', class: 'tg-sec' }, r.altra || '');
    riga.appendChild(altra);
    sezProva.appendChild(riga);
    sezProva.appendChild(el('label', { for: 'tgp-codice' }, T.codice));
    var codice = el('input', { id: 'tgp-codice', type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', inputmode: 'text', maxlength: '8', 'aria-describedby': 'tgp-a tgp-e-codice' });
    sezProva.appendChild(codice);
    var errCodice = el('p', { class: 'tgp-errore', id: 'tgp-e-codice', 'aria-live': 'polite' });
    sezProva.appendChild(errCodice);
    form.appendChild(sezProva);

    var accetto = null, errRegole = null;
    if (r.regole) {
      var nellaPagina = document.getElementById('tg-regole');
      var sezR = el('div', { class: 'tgp-passo' });
      var lab = el('label', { class: 'tgp-spunta' });
      accetto = el('input', { type: 'checkbox', id: 'tgp-accetto', 'aria-describedby': 'tgp-e-regole' });
      lab.appendChild(accetto);
      if (nellaPagina && T.accettoParti) {
        var frase = el('span');
        frase.appendChild(document.createTextNode(T.accettoParti[0]));
        frase.appendChild(el('a', { href: '#tg-regole' }, T.accettoParti[1]));
        frase.appendChild(document.createTextNode(T.accettoParti[2]));
        lab.appendChild(frase);
      } else {
        sezR.setAttribute('role', 'group');
        sezR.setAttribute('aria-labelledby', 'tgp-r-t');
        sezR.appendChild(el('h3', { id: 'tgp-r-t' }, T.regole));
        sezR.appendChild(el('div', { class: 'tgp-regole', tabindex: '0' }, r.regole));
        lab.appendChild(el('span', null, T.accetto));
      }
      sezR.appendChild(lab);
      errRegole = el('p', { class: 'tgp-errore', id: 'tgp-e-regole', 'aria-live': 'polite' });
      sezR.appendChild(errRegole);
      form.appendChild(sezR);
    }

    var gruppi = [];
    var errDomande = null;
    if (r.domande && r.domande.length) {
      var sezD = el('div', { class: 'tgp-passo', role: 'group', 'aria-labelledby': 'tgp-d-t' });
      sezD.appendChild(el('h3', { id: 'tgp-d-t' }, T.domande));
      r.domande.forEach(function (d, i) {
        var fs = el('fieldset');
        fs.appendChild(el('legend', null, d.testo));
        d.opzioni.forEach(function (o, k) {
          var l = el('label', { class: 'tgp-voce' });
          l.appendChild(el('input', { type: 'radio', name: 'tgp-d' + i, value: String(k) }));
          l.appendChild(el('span', null, o));
          fs.appendChild(l);
        });
        gruppi.push(fs);
        sezD.appendChild(fs);
      });
      errDomande = el('p', { class: 'tgp-errore', 'aria-live': 'polite' });
      sezD.appendChild(errDomande);
      form.appendChild(sezD);
    }

    var invia = el('button', { type: 'submit', class: 'tg-entra' }, T.entra);
    form.appendChild(invia);
    box.appendChild(form);
    var aiuto = el('div', { class: 'tgp-passo' });
    var bAiuto = el('button', { type: 'button', class: 'tg-sec' }, T.nonRiesco);
    aiuto.appendChild(bAiuto);
    aiuto.appendChild(el('p', { class: 'tgp-nota' }, [T.nonRiescoAiuto, r.tempo || ''].filter(Boolean).join(' ')));
    box.appendChild(aiuto);

    function prova() {
      carico.classList.remove('tgp-nascosto');
      carico.textContent = T.carico;
      altra.disabled = true;
      return chiedi('immagine').then(function (x) {
        if (x.esito === 'ok' && x.bin) {
          carico.classList.add('tgp-nascosto');
          ultima = x.bin;
          suona(tela, x.bin);
          altra.textContent = x.altra || altra.textContent;
          altra.disabled = !(x.prove > 0);
          return;
        }
        if (x.esito === 'finite') { carico.textContent = ''; altra.disabled = true; return; }
        if (x.esito === 'disegno') { carico.textContent = E.disegno; return; }
        fine(x);
      }).catch(function () { carico.textContent = E.rete; altra.disabled = false; });
    }

    altra.addEventListener('click', function () { codice.value = ''; errore(errCodice, ''); prova(); });

    bAiuto.addEventListener('click', function () {
      if (occupato) return;
      occupato = true;
      bAiuto.disabled = true;
      chiedi('aiuto').then(fine).catch(function () { bAiuto.disabled = false; errore(errCodice, E.rete); }).then(function () { occupato = false; });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (occupato) return;
      errore(errCodice, ''); if (errRegole) errore(errRegole, ''); if (errDomande) errore(errDomande, '');
      var valore = codice.value.replace(/\s+/g, '');
      var risposte = gruppi.map(function (fs) { var s = fs.querySelector('input:checked'); return s ? Number(s.value) : -1; });
      var manca = false;
      if (!valore) { errore(errCodice, E.vuoto); codice.setAttribute('aria-invalid', 'true'); codice.focus(); manca = true; } else codice.removeAttribute('aria-invalid');
      if (accetto && !accetto.checked) { errore(errRegole, E.regole); if (!manca) accetto.focus(); manca = true; }
      if (risposte.some(function (x) { return x < 0; })) { errore(errDomande, E.risposte); manca = true; }
      if (manca) return;
      occupato = true;
      invia.disabled = true;
      chiedi('invia', { codice: valore, regole: accetto ? accetto.checked : false, risposte: risposte, firma: firma }).then(function (x) {
        if (x.esito === 'riprova') { errore(errCodice, x.msg); codice.value = ''; codice.focus(); return; }
        if (x.esito === 'nuova') { errore(errCodice, x.msg); codice.value = ''; codice.focus(); return prova(); }
        if (x.esito === 'regole') { errore(errRegole || errCodice, x.msg); return; }
        if (x.esito === 'cambiato') { return apri(x.msg); }
        fine(x);
      }).catch(function () { errore(errCodice, E.rete); }).then(function () { occupato = false; invia.disabled = false; });
    });

    if (riusa && ultima) {
      carico.classList.add('tgp-nascosto');
      altra.disabled = !(r.prove > 0);
      suona(tela, ultima);
    } else {
      prova();
    }
    if (!riusa) h.focus();
  }

  function apri(messaggio) {
    return chiedi('apri').then(function (r) {
      if (r.esito !== 'attesa') { fine(r); return; }
      modulo(r, !!messaggio);
      if (messaggio) {
        var e = document.getElementById('tgp-e-codice');
        if (e) e.textContent = messaggio;
      }
    }).catch(function () { reteGiu(apri); });
  }

  function reteGiu(dopo) {
    svuota();
    var h = titoloDi(E.rete || '…');
    var b = el('button', { type: 'button', class: 'tg-sec' }, P.riprova || '↻');
    b.addEventListener('click', function () { dopo(); });
    box.appendChild(b);
    h.focus();
  }

  function inizia() {
    box.hidden = false;
    box.classList.add('tgp-apre');
    if (entra) entra.hidden = true;
    if (demo) {
      svuota();
      var h = titoloDi(T.prova);
      box.appendChild(el('p', { class: 'tgp-nota' }, P.demo));
      h.focus();
      return;
    }
    attendi();
    if (modo === 'telegram') { apri(); return; }
    chiedi('nuova').then(function (r) {
      if (r.esito !== 'ok' || !r.s) { fine(r); return; }
      segreto = r.s;
      apri();
    }).catch(function () { reteGiu(inizia); });
  }

  if (modo === 'telegram') {
    box.hidden = false;
    attendi();
    apri();
    return;
  }

  if (entra) {
    entra.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (modo === 'anteprima' && !scudoAcceso && !box.getAttribute('data-vista')) {
        box.hidden = false;
        svuota();
        box.appendChild(el('p', { class: 'tgp-nota' }, P.anteprimaSpento));
        var b = el('button', { type: 'button', class: 'tg-sec' }, P.vediLoStesso);
        b.addEventListener('click', function () { box.setAttribute('data-vista', '1'); inizia(); });
        box.appendChild(b);
        return;
      }
      inizia();
    });
  }

  if (modo === 'anteprima') {
    window.__tgProva = {
      apri: function () { box.setAttribute('data-vista', '1'); inizia(); },
      mostra: function (esito) {
        box.hidden = false;
        if (entra) entra.hidden = true;
        fine({ esito: esito, url: esito === 'dentro' || esito === 'admin' ? '#' : '' });
      },
      chiudi: function () {
        svuota();
        box.hidden = true;
        if (entra) entra.hidden = false;
      },
    };
  }
})();
