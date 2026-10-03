// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  var sv = document.getElementById('sv');
  if (!sv) return;
  var canale = sv.getAttribute('data-canale') || '';
  var anteprima = sv.getAttribute('data-anteprima') === '1';
  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  var initData = tg && tg.initData ? tg.initData : '';
  var gruppo = new URLSearchParams(location.search).get('c') || '';
  var base = anteprima ? '/api/streamer/telegram/scudo/anteprima/' : '/api/tg-scudo/' + encodeURIComponent(canale) + '/';
  var corpo = document.getElementById('sv-corpo');
  var titolo = document.getElementById('sv-titolo');
  var sotto = document.getElementById('sv-sotto');
  var T = null;
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
    var corpoRichiesta = JSON.stringify(Object.assign({ initData: initData, c: gruppo }, dati || {}));
    return fetch(base + via, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: anteprima ? 'same-origin' : 'omit',
      cache: 'no-store',
      body: corpoRichiesta,
    }).then(function (r) {
      var tipo = r.headers.get('content-type') || '';
      if (tipo.indexOf('application/octet-stream') === 0) {
        return r.arrayBuffer().then(function (b) {
          return { esito: 'ok', bin: b, prove: Number(r.headers.get('x-prove') || 0), altra: decodeURIComponent(r.headers.get('x-altra') || '') };
        });
      }
      if (!r.ok && r.status !== 409) throw new Error('rete');
      return r.json();
    });
  }

  function ferma() {
    if (gioco) { gioco.fermo = true; gioco = null; }
  }

  function colore(nome) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
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

  function fine(esito) {
    ferma();
    var e = (T && T.esiti && (T.esiti[esito] || T.esiti.chiusa)) || ['', ''];
    titolo.textContent = e[0];
    document.title = e[0];
    sotto.textContent = '';
    corpo.textContent = '';
    var box = el('section', { class: 'fine' });
    box.appendChild(el('p', null, e[1]));
    if (tg && !anteprima && typeof tg.close === 'function') {
      var b = el('button', { type: 'button', class: 'btn' }, T ? T.chiudi : '');
      b.addEventListener('click', function () { try { tg.close(); } catch (x) { b.disabled = true; } });
      box.appendChild(b);
    }
    corpo.appendChild(box);
    titolo.setAttribute('tabindex', '-1');
    titolo.focus();
  }

  function errore(nodo, testo) {
    nodo.textContent = testo || '';
  }

  function modulo(r, riusa) {
    T = r.t;
    firma = r.firma || '';
    document.documentElement.lang = r.lingua || document.documentElement.lang;
    titolo.textContent = T.titolo;
    document.title = T.titolo;
    sotto.textContent = [T.sotto, r.tempo || ''].filter(Boolean).join(' ');
    corpo.textContent = '';
    if (anteprima && r.avviso) corpo.appendChild(el('p', { class: 'passo tenue' }, r.avviso));

    var form = el('form', { novalidate: '' });

    var sezProva = el('section', { class: 'passo', 'aria-labelledby': 'sv-p-t' });
    sezProva.appendChild(el('h2', { id: 'sv-p-t' }, T.prova));
    sezProva.appendChild(el('p', { class: 'aiuto', id: 'sv-p-a' }, T.provaAiuto));
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) sezProva.appendChild(el('p', { class: 'aiuto' }, T.movimento));
    var tela = el('canvas', { class: 'tela', width: '160', height: '56', role: 'img', 'aria-label': T.provaVoce });
    sezProva.appendChild(tela);
    var carico = el('p', { class: 'tenue' }, T.carico);
    sezProva.appendChild(carico);
    var riga = el('div', { class: 'riga' });
    var altra = el('button', { type: 'button', class: 'btn secondario' }, r.altra || '');
    riga.appendChild(altra);
    sezProva.appendChild(riga);
    sezProva.appendChild(el('label', { for: 'sv-codice' }, T.codice));
    var codice = el('input', { id: 'sv-codice', type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', inputmode: 'text', maxlength: '8', 'aria-describedby': 'sv-p-a sv-e-codice' });
    sezProva.appendChild(codice);
    var errCodice = el('p', { class: 'errore', id: 'sv-e-codice', 'aria-live': 'polite' });
    sezProva.appendChild(errCodice);
    form.appendChild(sezProva);

    var accetto = null, errRegole = null;
    if (r.regole) {
      var sezR = el('section', { class: 'passo', 'aria-labelledby': 'sv-r-t' });
      sezR.appendChild(el('h2', { id: 'sv-r-t' }, T.regole));
      sezR.appendChild(el('div', { class: 'regole', tabindex: '0' }, r.regole));
      var lab = el('label', { class: 'spunta' });
      accetto = el('input', { type: 'checkbox', id: 'sv-accetto', 'aria-describedby': 'sv-e-regole' });
      lab.appendChild(accetto);
      lab.appendChild(el('span', null, T.accetto));
      sezR.appendChild(lab);
      errRegole = el('p', { class: 'errore', id: 'sv-e-regole', 'aria-live': 'polite' });
      sezR.appendChild(errRegole);
      form.appendChild(sezR);
    }

    var gruppi = [];
    var errDomande = null;
    if (r.domande && r.domande.length) {
      var sezD = el('section', { class: 'passo', 'aria-labelledby': 'sv-d-t' });
      sezD.appendChild(el('h2', { id: 'sv-d-t' }, T.domande));
      r.domande.forEach(function (d, i) {
        var fs = el('fieldset');
        fs.appendChild(el('legend', null, d.testo));
        d.opzioni.forEach(function (o, k) {
          var l = el('label', { class: 'voce' });
          l.appendChild(el('input', { type: 'radio', name: 'sv-d' + i, value: String(k) }));
          l.appendChild(el('span', null, o));
          fs.appendChild(l);
        });
        gruppi.push(fs);
        sezD.appendChild(fs);
      });
      errDomande = el('p', { class: 'errore', 'aria-live': 'polite' });
      sezD.appendChild(errDomande);
      form.appendChild(sezD);
    }

    var invia = el('button', { type: 'submit', class: 'btn' }, T.entra);
    form.appendChild(invia);
    var aiuto = el('section', { class: 'passo' });
    var bAiuto = el('button', { type: 'button', class: 'btn secondario' }, T.nonRiesco);
    aiuto.appendChild(bAiuto);
    aiuto.appendChild(el('p', { class: 'tenue' }, T.nonRiescoAiuto));
    corpo.appendChild(form);
    corpo.appendChild(aiuto);

    function prova() {
      carico.classList.remove('nascosto');
      carico.textContent = T.carico;
      altra.disabled = true;
      return chiedi('immagine').then(function (x) {
        if (x.esito === 'ok' && x.bin) {
          carico.classList.add('nascosto');
          ultima = x.bin;
          suona(tela, x.bin);
          altra.textContent = x.altra || altra.textContent;
          altra.disabled = !(x.prove > 0);
          return;
        }
        if (x.esito === 'finite') { carico.textContent = ''; altra.disabled = true; return; }
        if (x.esito === 'disegno') { carico.textContent = T.errori.disegno; return; }
        fine(x.esito);
      }).catch(function () { carico.textContent = T.errori.rete; altra.disabled = false; });
    }

    altra.addEventListener('click', function () { codice.value = ''; errore(errCodice, ''); prova(); });

    bAiuto.addEventListener('click', function () {
      if (occupato) return;
      occupato = true;
      bAiuto.disabled = true;
      chiedi('aiuto').then(function (x) { fine(x.esito); }).catch(function () { bAiuto.disabled = false; errore(errCodice, T.errori.rete); }).then(function () { occupato = false; });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (occupato) return;
      errore(errCodice, ''); if (errRegole) errore(errRegole, ''); if (errDomande) errore(errDomande, '');
      var valore = codice.value.replace(/\s+/g, '');
      var risposte = gruppi.map(function (fs) { var s = fs.querySelector('input:checked'); return s ? Number(s.value) : -1; });
      var manca = false;
      if (!valore) { errore(errCodice, T.errori.vuoto); codice.setAttribute('aria-invalid', 'true'); codice.focus(); manca = true; } else codice.removeAttribute('aria-invalid');
      if (accetto && !accetto.checked) { errore(errRegole, T.errori.regole); if (!manca) accetto.focus(); manca = true; }
      if (risposte.some(function (x) { return x < 0; })) { errore(errDomande, T.errori.risposte); manca = true; }
      if (manca) return;
      occupato = true;
      invia.disabled = true;
      chiedi('invia', { codice: valore, regole: accetto ? accetto.checked : false, risposte: risposte, firma: firma }).then(function (x) {
        if (x.esito === 'riprova') { errore(errCodice, x.msg); codice.value = ''; codice.focus(); return; }
        if (x.esito === 'nuova') { errore(errCodice, x.msg); codice.value = ''; codice.focus(); return prova(); }
        if (x.esito === 'regole') { errore(errRegole || errCodice, x.msg); return; }
        if (x.esito === 'cambiato') { return apri(x.msg); }
        fine(x.esito);
      }).catch(function () { errore(errCodice, T.errori.rete); }).then(function () { occupato = false; invia.disabled = false; });
    });

    if (riusa && ultima) {
      carico.classList.add('nascosto');
      altra.disabled = !(r.prove > 0);
      suona(tela, ultima);
    } else {
      prova();
    }
  }

  function apri(messaggio) {
    return chiedi('apri').then(function (r) {
      T = r.t || T;
      if (r.esito !== 'attesa') { fine(r.esito); return; }
      modulo(r, !!messaggio);
      if (messaggio) {
        var e = document.getElementById('sv-e-codice');
        if (e) e.textContent = messaggio;
      }
    }).catch(function () {
      titolo.textContent = '…';
      corpo.textContent = '';
      corpo.appendChild(el('p', { class: 'passo' }, T && T.errori ? T.errori.rete : 'Errore di rete / Network error / Error de red'));
    });
  }

  apri();
})();
