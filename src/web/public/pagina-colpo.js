// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  var B = document.body;
  var login = B.getAttribute('data-login') || '';
  var lingua = B.getAttribute('data-lingua') || 'it';
  var canale = B.getAttribute('data-canale') || login;
  var T = {};
  try { T = JSON.parse(B.getAttribute('data-t') || '{}'); } catch (e) { T = {}; }
  var base = '/u/' + encodeURIComponent(login) + '/colpo';
  var memo = 'sb-colpo:' + login;
  var QUADRO_L = 1920, QUADRO_A = 1080;
  function $(id) { return document.getElementById(id); }
  var strato = $('cp-mira');
  var dati = null, scelta = null, punto = null, mira = null, giro = null, conto = null;
  var misure = {};

  function riempi(s, v) { return String(s || '').replace(/\{(\w+)\}/g, function (m, k) { return k in v ? v[k] : m; }); }
  function el(tag, cls, testo) { var x = document.createElement(tag); if (cls) x.className = cls; if (testo != null) x.textContent = testo; return x; }
  function avviso(testo, tipo) {
    var a = $('cp-avviso');
    a.textContent = testo || '';
    a.className = 'cp-avviso' + (tipo ? ' ' + tipo : '');
    a.hidden = !testo;
  }
  function motivo(r) {
    var m = (T.motivi || {})[r && r.motivo] || (T.motivi || {}).codice || '';
    return riempi(m, { n: r && r.fraSec ? r.fraSec : '' });
  }
  function prezzo(cent) {
    var v = (dati && dati.valuta) || 'EUR';
    try { return new Intl.NumberFormat(lingua, { style: 'currency', currency: v }).format(cent / 100); } catch (e) { return (cent / 100).toFixed(2) + ' ' + v; }
  }
  function numero(n) { try { return new Intl.NumberFormat(lingua).format(n); } catch (e) { return String(n); } }
  function chiedi(via, corpo) {
    var o = { headers: { Accept: 'application/json' }, credentials: 'same-origin' };
    if (corpo) { o.method = 'POST'; o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(corpo); }
    return fetch(base + via, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._stato = r.status; return j; }); });
  }
  function ricorda(id) { try { if (id) sessionStorage.setItem(memo, id); else sessionStorage.removeItem(memo); } catch (e) {  } }

  function guarda() {
    var c = $('cp-chiedi');
    if (!c) return;
    var f = document.createElement('iframe');
    f.src = B.getAttribute('data-player');
    f.title = 'Twitch';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
    c.parentNode.replaceChild(f, c);
    try { localStorage.setItem('sb-consenso', 'si'); } catch (e) {  }
  }
  $('cp-guarda').onclick = guarda;
  try { if (localStorage.getItem('sb-consenso') === 'si') guarda(); } catch (e) {  }

  function stato() {
    var s = $('cp-stato');
    var vivo = dati && dati.live && dati.overlay;
    s.textContent = !dati ? T.spenta : dati.pausa ? T.pausa : vivo ? T.inOnda : dati.live ? T.senzaOverlay : T.spenta;
    s.classList.toggle('vivo', !!vivo && !dati.pausa);
  }

  function zone() {
    var vecchie = strato.querySelectorAll('.cp-zona');
    for (var i = 0; i < vecchie.length; i++) vecchie[i].remove();
    (dati.zone || []).forEach(function (z) {
      var d = el('div', 'cp-zona');
      d.style.left = z.x + '%'; d.style.top = z.y + '%'; d.style.width = z.w + '%'; d.style.height = z.h + '%';
      strato.insertBefore(d, strato.firstChild);
    });
  }
  function protetto(x, y) {
    return (dati.zone || []).some(function (z) { return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h; });
  }

  function media(v, cls) {
    var m;
    if (v.tipo === 'video') {
      m = document.createElement('video');
      m.muted = true; m.loop = true; m.autoplay = true; m.playsInline = true; m.preload = 'metadata';
      m.addEventListener('loadedmetadata', function () { misure[v.id] = { l: m.videoWidth, a: m.videoHeight }; ombra(); });
    } else {
      m = document.createElement('img');
      m.alt = ''; m.loading = 'lazy'; m.decoding = 'async';
      m.addEventListener('load', function () { misure[v.id] = { l: m.naturalWidth, a: m.naturalHeight }; ombra(); });
    }
    if (cls) m.className = cls;
    m.src = v.anteprima;
    return m;
  }

  function chip(v) {
    var p = el('span', 'cp-prezzi');
    if (v.prezzi.euro) p.appendChild(el('i', '', prezzo(v.prezzi.euro)));
    if (v.prezzi.punti) p.appendChild(el('i', '', riempi(T.puntiN, { n: numero(v.prezzi.punti) })));
    if (v.prezzi.bit) p.appendChild(el('i', '', riempi(T.bitN, { n: numero(v.prezzi.bit) })));
    return p;
  }

  function voci() {
    var box = $('cp-voci');
    box.textContent = '';
    var vuoto = $('cp-vuoto');
    vuoto.hidden = dati.voci.length > 0;
    vuoto.textContent = riempi(T.nessuno, { canale: canale });
    dati.voci.forEach(function (v) {
      var b = el('button', 'cp-voce');
      b.type = 'button';
      b.setAttribute('aria-pressed', scelta && scelta.id === v.id ? 'true' : 'false');
      b.setAttribute('data-voce', v.id);
      var a = el('span', 'cp-anteprima');
      a.appendChild(media(v));
      b.appendChild(a);
      b.appendChild(el('b', '', v.nome));
      b.appendChild(chip(v));
      b.onclick = function () { scegli(v); };
      box.appendChild(b);
    });
    $('cp-nome-l').hidden = !dati.conNome;
  }

  function scegli(v) {
    if (mira) return;
    scelta = v;
    var bb = document.querySelectorAll('.cp-voce');
    for (var i = 0; i < bb.length; i++) bb[i].setAttribute('aria-pressed', bb[i].getAttribute('data-voce') === v.id ? 'true' : 'false');
    $('cp-p2').classList.remove('spento');
    strato.classList.add('attiva');
    strato.tabIndex = 0;
    var vecchia = strato.querySelector('.cp-ombra');
    if (vecchia) vecchia.remove();
    if (punto) disegna();
    pronto();
    avviso('');
  }

  function pronto() {
    $('cp-conferma').disabled = !(scelta && punto && !protetto(punto.x, punto.y) && dati && dati.live && dati.overlay && !dati.pausa);
  }

  function mirino() {
    var m = strato.querySelector('.cp-mirino');
    if (!m) { m = el('div', 'cp-mirino'); strato.appendChild(m); }
    return m;
  }
  function ombra() {
    var v = mira ? voceDi(mira.voce) : scelta;
    var p = mira ? { x: mira.x, y: mira.y } : punto;
    var o = strato.querySelector('.cp-ombra');
    if (!v || !p) { if (o) o.remove(); return; }
    if (!o || o.getAttribute('data-voce') !== v.id) {
      if (o) o.remove();
      o = media(v, 'cp-ombra');
      o.setAttribute('data-voce', v.id);
      strato.insertBefore(o, strato.querySelector('.cp-mirino'));
    }
    var d = misure[v.id];
    o.style.left = p.x + '%'; o.style.top = p.y + '%';
    if (d && d.l && d.a) {
      var alto = Math.min(d.a, QUADRO_A * 0.92);
      var largo = d.l * alto / d.a;
      o.style.width = (largo * ((v.scala || 100) / 100) / QUADRO_L * 100) + '%';
    }
  }
  function disegna() {
    var p = mira ? { x: mira.x, y: mira.y } : punto;
    if (!p) return;
    var m = mirino();
    m.style.left = p.x + '%'; m.style.top = p.y + '%';
    m.classList.toggle('no', !mira && protetto(p.x, p.y));
    ombra();
  }
  function punta(x, y) {
    if (mira || !scelta) return;
    punto = { x: Math.round(Math.max(0, Math.min(100, x)) * 100) / 100, y: Math.round(Math.max(0, Math.min(100, y)) * 100) / 100 };
    disegna();
    pronto();
    avviso(protetto(punto.x, punto.y) ? (T.motivi || {}).protetta : '', protetto(punto.x, punto.y) ? 'ko' : '');
  }
  strato.addEventListener('click', function (e) {
    var r = strato.getBoundingClientRect();
    if (!r.width || !r.height) return;
    punta((e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100);
  });
  strato.addEventListener('keydown', function (e) {
    if (mira || !scelta) return;
    var passo = e.shiftKey ? 5 : 1;
    var p = punto || { x: 50, y: 50 };
    var k = e.key;
    if (k === 'ArrowLeft') punta(p.x - passo, p.y);
    else if (k === 'ArrowRight') punta(p.x + passo, p.y);
    else if (k === 'ArrowUp') punta(p.x, p.y - passo);
    else if (k === 'ArrowDown') punta(p.x, p.y + passo);
    else if (k === 'Enter' && !$('cp-conferma').disabled) { prendi(); }
    else return;
    e.preventDefault();
  });

  function voceDi(id) {
    var v = null;
    (dati && dati.voci || []).forEach(function (x) { if (x.id === id) v = x; });
    return v;
  }

  function prendi() {
    var b = $('cp-conferma');
    b.disabled = true;
    chiedi('/mira', { voce: scelta.id, x: punto.x, y: punto.y, chi: dati.conNome ? $('cp-nome').value : '' }).then(function (r) {
      if (!r.ok) { avviso(motivo(r), 'ko'); pronto(); return; }
      mira = r.mira;
      ricorda(mira.id);
      mostra();
    }, function () { avviso((T.motivi || {}).rete, 'ko'); pronto(); });
  }
  $('cp-conferma').onclick = prendi;

  function paga(mezzo, b) {
    b.disabled = true;
    chiedi('/paga/' + mira.id, { mezzo: mezzo }).then(function (r) {
      if (r.url) { location.assign(r.url); return; }
      b.disabled = false;
      avviso(r.errore === 'scaduta' ? T.scaduta : (T.motivi || {})[r.errore] || (T.motivi || {}).pagamento, 'ko');
      leggi();
    }, function () { b.disabled = false; avviso((T.motivi || {}).rete, 'ko'); });
  }

  function chat() {
    var a = el('a', 'cp-b due', T.apriChat);
    a.href = 'https://www.twitch.tv/popout/' + encodeURIComponent(login) + '/chat';
    a.target = '_blank'; a.rel = 'noopener';
    return a;
  }

  function mostra() {
    var bb = document.querySelectorAll('.cp-voce');
    for (var i = 0; i < bb.length; i++) bb[i].setAttribute('aria-pressed', bb[i].getAttribute('data-voce') === mira.voce ? 'true' : 'false');
    strato.classList.remove('attiva');
    strato.tabIndex = -1;
    $('cp-p2').classList.add('spento');
    $('cp-p3').classList.remove('spento');
    $('cp-conferma').disabled = true;
    disegna();
    var box = $('cp-paga');
    box.textContent = '';
    var v = voceDi(mira.voce) || { nome: mira.nome, premio: '', metodi: [] };
    if (mira.stato === 'attesa') {
      var c = el('div', 'cp-codice');
      c.appendChild(el('span', '', T.codice));
      var o = el('output', '', mira.codice);
      c.appendChild(o);
      var sc = el('small', '');
      sc.id = 'cp-scade';
      c.appendChild(sc);
      box.appendChild(c);
      var pz = mira.prezzi || {};
      if (pz.euro > 0 && mira.pagabile && !mira.inPagamento && (dati.mezzi || []).length) {
        var r = el('div', 'cp-righe cp-modo');
        dati.mezzi.forEach(function (m) {
          var b = el('button', 'cp-b cp-paga-b', riempi(T.euro, { prezzo: prezzo(pz.euro) }) + (dati.mezzi.length > 1 ? ' · ' + (m === 'satispay' ? T.satispay : T.carta) : ''));
          b.type = 'button';
          b.onclick = function () { paga(m, b); };
          r.appendChild(b);
        });
        box.appendChild(r);
      }
      var conCodice = mira.pagabile && !mira.inPagamento;
      if (conCodice && pz.punti > 0 && v.premio) {
        var pp = el('div', 'cp-modo');
        pp.appendChild(el('p', '', riempi(T.punti, { premio: v.premio, n: numero(pz.punti), codice: mira.codice })));
        box.appendChild(pp);
      }
      if (conCodice && pz.bit > 0) {
        var bb = el('div', 'cp-modo');
        bb.appendChild(el('p', '', riempi(T.bit, { n: pz.bit, codice: mira.codice })));
        box.appendChild(bb);
      }
      if (conCodice && (pz.bit > 0 || (pz.punti > 0 && v.premio))) { var cr = el('div', 'cp-righe'); cr.appendChild(chat()); box.appendChild(cr); }
    }
    var fine = el('div', 'cp-righe cp-modo');
    if (mira.stato === 'pagata') { racconta(); segui(); return; }
    var ri = el('button', 'cp-b due', mira.stato === 'attesa' ? T.annulla : T.ricomincia);
    ri.type = 'button';
    ri.onclick = daCapo;
    fine.appendChild(ri);
    box.appendChild(fine);
    racconta();
    segui();
  }

  function racconta() {
    if (!mira) return;
    if (mira.stato === 'sparata') avviso(T.partito, 'ok');
    else if (mira.stato === 'pagata') avviso(T.pagata);
    else if (mira.stato === 'rimborsata') avviso(T.rimborsata, 'ko');
    else if (mira.stato === 'scaduta') avviso(T.scaduta, 'ko');
    else if (mira.inPagamento) avviso(T.attesa);
    else if (!mira.pagabile) avviso(riempi(T.fermo, { motivo: (T.motivi || {})[mira.fermo] || '' }), 'ko');
    else if (mira.versati > 0) avviso(riempi(T.versati, { n: numero(mira.versati), m: numero(Math.max(0, (mira.prezzi.bit || 0) - mira.versati)) }));
    else avviso('');
    var sc = $('cp-scade');
    if (sc) {
      var resta = Math.max(0, Math.round((mira.scade - Date.now()) / 1000));
      sc.textContent = mira.inPagamento || mira.versati > 0 || mira.stato !== 'attesa' || !mira.pagabile ? '' : riempi(T.scade, { n: Math.floor(resta / 60) + ':' + ('0' + resta % 60).slice(-2) });
    }
  }

  function segui() {
    clearInterval(giro); clearInterval(conto);
    if (!mira || (mira.stato !== 'attesa' && mira.stato !== 'pagata')) { ricorda(''); return; }
    giro = setInterval(leggi, 3000);
    conto = setInterval(racconta, 1000);
  }

  function leggi() {
    if (!mira) return;
    chiedi('/stato/' + mira.id).then(function (r) {
      if (!r.id) return;
      var cambiato = r.stato !== mira.stato || r.inPagamento !== mira.inPagamento || r.pagabile !== mira.pagabile;
      mira = r;
      if (cambiato) mostra(); else racconta();
    }, function () {  });
  }

  function daCapo() {
    clearInterval(giro); clearInterval(conto);
    mira = null; punto = null;
    ricorda('');
    var x = strato.querySelectorAll('.cp-mirino, .cp-ombra');
    for (var i = 0; i < x.length; i++) x[i].remove();
    $('cp-paga').textContent = '';
    $('cp-p3').classList.add('spento');
    avviso('');
    if (scelta && voceDi(scelta.id)) scegli(voceDi(scelta.id));
    else { scelta = null; $('cp-p2').classList.add('spento'); voci(); }
  }

  function carica(primo) {
    return chiedi('/dati').then(function (r) {
      if (!r.voci) return;
      var prima = dati ? dati.voci.map(function (v) { return v.id; }).join() : '';
      dati = r;
      stato();
      zone();
      if (primo || prima !== dati.voci.map(function (v) { return v.id; }).join()) voci();
      if (scelta && !voceDi(scelta.id) && !mira) { scelta = null; daCapo(); }
      pronto();
    }, function () {  });
  }

  carica(true).then(function () {
    var id = B.getAttribute('data-mira') || '';
    if (!id) { try { id = sessionStorage.getItem(memo) || ''; } catch (e) { id = ''; } }
    if (!id || !dati) return;
    chiedi('/stato/' + id).then(function (r) {
      if (!r.id || r.stato === 'scaduta') { ricorda(''); return; }
      if (r.stato === 'sparata' && !B.getAttribute('data-mira')) { ricorda(''); return; }
      mira = r;
      scelta = voceDi(r.voce);
      mostra();
    }, function () {  });
  });
  setInterval(function () { carica(false); }, 30000);
  addEventListener('resize', function () { if (mira || punto) disegna(); });
})();
