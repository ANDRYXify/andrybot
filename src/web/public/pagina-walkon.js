// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  var B = document.getElementById('wo');
  if (!B) return;
  var login = B.getAttribute('data-login') || '';
  var lingua = B.getAttribute('data-lingua') || 'it';
  var T = {};
  try { T = JSON.parse(B.getAttribute('data-t') || '{}'); } catch (e) { T = {}; }
  var io = null;
  try { io = JSON.parse(B.getAttribute('data-io') || 'null') || null; } catch (e) { io = null; }
  var accesso = B.getAttribute('data-accesso') === '1';
  var accessoKick = B.getAttribute('data-accesso-kick') === '1';
  var base = '/won/' + encodeURIComponent(login);
  var dati = null, scelta = '', effetto = '';
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, testo) { var x = document.createElement(tag); if (cls) x.className = cls; if (testo != null) x.textContent = testo; return x; }
  function riempi(s, v) { return String(s || '').replace(/\{(\w+)\}/g, function (m, k) { return k in v ? v[k] : m; }); }
  function avviso(testo, tipo) {
    var a = $('wo-avviso');
    a.textContent = testo || '';
    a.className = 'wo-avviso' + (tipo ? ' ' + tipo : '');
    a.hidden = !testo;
  }
  function errore(r) {
    var e = (T.errori || {})[r && r.errore] || (T.errori || {}).errore;
    var f = (dati && dati.regole && dati.regole.file) || {};
    return riempi(e, { s: f.durataSec || '', mb: f.pesoMb || '' });
  }
  function chiedi(via, opz) {
    var o = Object.assign({ headers: { Accept: 'application/json' }, credentials: 'same-origin' }, opz || {});
    return fetch(base + via, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._stato = r.status; return j; }); });
  }
  function manda(via, corpo) {
    return chiedi(via, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(corpo || {}) });
  }

  function disegnaIo() {
    var box = $('wo-io');
    box.textContent = '';
    if (io) {
      box.appendChild(el('p', '', riempi(T.sei, { nome: io.nome || '' })));
      var esci = el('button', 'wo-b due', T.esci);
      esci.type = 'button';
      esci.onclick = function () { manda('/esci', {}).then(function () { io = null; carica(); }); };
      box.appendChild(esci);
      return;
    }
    box.appendChild(el('p', '', T.serveAccesso));
    var tasti = el('div', 'wo-righe-b');
    if (accesso) { var a = el('a', 'wo-b', T.accedi); a.href = base + '/accedi'; tasti.appendChild(a); }
    if (accessoKick) { var k = el('a', 'wo-b', T.accediKick); k.href = base + '/accedi-kick'; tasti.appendChild(k); }
    box.appendChild(tasti);
    box.appendChild(el('p', 'wo-nota', T.accediPerche));
  }

  function chiPuo(r) {
    var c = r.chi || {}, v = [];
    if (c.subTwitch) v.push(c.livello > 1 ? riempi(T.subLivello, { n: c.livello }) : T.sub);
    if (c.subKick) v.push(T.subKick);
    if (c.vip) v.push(T.vip);
    if (c.mod) v.push(T.mod);
    if (c.aMano) v.push(T.aMano);
    return v;
  }
  function tipiFile(f) {
    var n = (f.tipi || []).map(function (t) { return (T.tipi || {})[t] || t; });
    return n.length > 1 ? n.slice(0, -1).join(', ') + T.o + n[n.length - 1] : n[0] || '';
  }
  function disegnaRegole() {
    var box = $('wo-regole-dentro');
    box.textContent = '';
    if (!dati) return;
    var r = dati.regole;
    box.appendChild(el('h3', 'wo-t', T.chi));
    var ul = el('ul');
    chiPuo(r).forEach(function (x) { ul.appendChild(el('li', '', x)); });
    box.appendChild(ul);
    box.appendChild(el('h3', 'wo-t', T.cosa));
    var u2 = el('ul');
    if (dati.effetti.length) u2.appendChild(el('li', '', T.unEffetto));
    if (r.file.attivo && r.file.tipi.length) {
      u2.appendChild(el('li', '', riempi(T.unFile, { tipi: tipiFile(r.file), mb: r.file.pesoMb })));
      if (r.file.tipi.indexOf('video') >= 0 || r.file.tipi.indexOf('audio') >= 0) u2.appendChild(el('li', '', riempi(T.fileDurata, { s: r.file.durataSec })));
    }
    if (r.testo.attivo && r.testo.max > 0) u2.appendChild(el('li', '', riempi(T.unTesto, { n: r.testo.max })));
    if (!u2.children.length) u2.appendChild(el('li', '', T.niente));
    box.appendChild(u2);
    box.appendChild(el('p', '', r.partenza.modo === 'comando' ? riempi(T.quandoCmd, { comando: '!' + r.partenza.comando }) : T.quandoMsg));
    box.appendChild(el('p', 'wo-nota', T.approvazione));
    if (r.senzaApprovazione && dati.effetti.length) box.appendChild(el('p', 'wo-nota', T.senzaApprovazione));
  }

  function media(tipo, url, mini) {
    if (!url) return null;
    if (tipo === 'audio') { var a = document.createElement('audio'); a.controls = true; a.preload = 'none'; a.src = url; return a; }
    if (tipo === 'video') { var v = document.createElement('video'); v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata'; if (mini) { v.autoplay = true; } else { v.controls = true; } return v; }
    var i = document.createElement('img'); i.src = url; i.alt = ''; i.loading = 'lazy'; return i;
  }
  function disegnaMio() {
    var box = $('wo-mio-dentro');
    box.textContent = '';
    var m = dati && dati.mio;
    $('wo-mio').hidden = !io;
    if (!io) return;
    if (!m) { box.appendChild(el('p', '', T.nessuno)); return; }
    box.appendChild(el('span', 'wo-stato ' + m.stato, (T.stati || {})[m.stato] || m.stato));
    box.appendChild(el('p', '', (T.spiega || {})[m.stato] || ''));
    if (m.motivo && (m.stato === 'rifiutato')) box.appendChild(el('p', '', riempi(T.motivo, { motivo: m.motivo })));
    if (!m.verificato && m.stato === 'attesa') box.appendChild(el('p', 'wo-nota', T.daVerificare));
    var prev = m.scelta === 'effetto' ? (dati.effetti.filter(function (x) { return x.comando === m.effetto; })[0] || null) : null;
    if (m.scelta === 'effetto') box.appendChild(el('p', '', riempi(T.effetto, { nome: m.effetto })));
    var nodo = m.scelta === 'effetto' ? (prev ? media(prev.tipo, prev.anteprima, false) : null) : (m.haFile ? media(m.fileTipo, base + '/mio/file?v=' + m.versione, false) : null);
    if (nodo) { var ap = el('div', 'wo-anteprima'); ap.appendChild(nodo); box.appendChild(ap); }
    if (m.testo) box.appendChild(el('p', '', '«' + m.testo.replace(/\{nome\}/g, m.nome || '') + '»'));
    if (m.mail) {
      box.appendChild(el('p', 'wo-nota', T.mailC));
      var tm = el('button', 'wo-b due', T.mailTogli);
      tm.type = 'button';
      tm.onclick = function () { manda('/mail', { mail: '' }).then(function (r) { if (r.ok) { avviso(T.mailTolta, 'ok'); carica(); } else avviso(errore(r), 'ko'); }); };
      box.appendChild(tm);
    }
    var righe = el('div', 'wo-righe-b');
    var tg = el('button', 'wo-b due', T.togli);
    tg.type = 'button';
    var chiede = el('div', 'wo-chiede');
    chiede.hidden = true;
    chiede.setAttribute('role', 'group');
    var domanda = el('p', 'wo-domanda', T.togliChiedi);
    var si = el('button', 'wo-b', T.si);
    var no = el('button', 'wo-b due', T.no);
    si.type = 'button';
    no.type = 'button';
    chiede.appendChild(domanda);
    chiede.appendChild(si);
    chiede.appendChild(no);
    tg.onclick = function () { tg.hidden = true; chiede.hidden = false; no.focus(); };
    no.onclick = function () { chiede.hidden = true; tg.hidden = false; tg.focus(); };
    si.onclick = function () {
      si.disabled = true;
      manda('/togli', {}).then(function (r) { if (r.ok) { avviso(T.tolto, 'ok'); carica(); } else { si.disabled = false; avviso(errore(r), 'ko'); } });
    };
    righe.appendChild(tg);
    righe.appendChild(chiede);
    box.appendChild(righe);
  }

  function segnaScelta() {
    [].forEach.call($('wo-scelte').children, function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-v') === scelta)); });
    $('wo-effetti').hidden = scelta !== 'effetto';
    $('wo-file-box').hidden = scelta !== 'file';
    [].forEach.call($('wo-effetti').children, function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-c') === effetto)); });
  }
  function disegnaModulo() {
    var box = $('wo-fai');
    var r = dati && dati.regole;
    var puo = !!(io && dati && dati.puo !== 'no');
    var apertiFile = !!(r && r.file.attivo && r.file.tipi.length);
    box.hidden = !(io && dati);
    if (box.hidden) return;
    $('wo-fai-t').textContent = dati.mio ? T.cambia : T.nuovo;
    $('wo-cambia-nota').hidden = !dati.mio;
    if (!puo) {
      $('wo-modulo').hidden = true;
      var no = $('wo-no') || el('p', '', '');
      no.id = 'wo-no';
      no.textContent = riempi(T.nonPuoi, { chi: chiPuo(r).join(', ') });
      if (!no.parentNode) box.appendChild(no);
      return;
    }
    if ($('wo-no')) $('wo-no').remove();
    $('wo-modulo').hidden = false;
    var sc = $('wo-scelte');
    sc.textContent = '';
    var opzioni = [];
    if (dati.effetti.length) opzioni.push(['effetto', T.sceltaEffetto]);
    if (apertiFile) opzioni.push(['file', T.sceltaFile]);
    if (!opzioni.length) { $('wo-modulo').hidden = true; return; }
    if (!scelta || !opzioni.some(function (o) { return o[0] === scelta; })) scelta = (dati.mio && dati.mio.scelta) || opzioni[0][0];
    if (!opzioni.some(function (o) { return o[0] === scelta; })) scelta = opzioni[0][0];
    opzioni.forEach(function (o) {
      var b = el('button', '', o[1]);
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('data-v', o[0]);
      b.onclick = function () { scelta = o[0]; segnaScelta(); };
      sc.appendChild(b);
    });
    sc.hidden = opzioni.length < 2;
    var ef = $('wo-effetti');
    ef.textContent = '';
    if (!effetto && dati.mio && dati.mio.scelta === 'effetto') effetto = dati.mio.effetto;
    dati.effetti.forEach(function (x) {
      var b = el('button', 'wo-voce');
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('data-c', x.comando);
      var mini = el('span', 'wo-mini');
      var n = x.tipo === 'audio' ? el('span', '', (T.tipi || {}).audio || 'audio') : media(x.tipo, x.anteprima, true);
      if (n) mini.appendChild(n);
      b.appendChild(mini);
      b.appendChild(el('b', '', x.nome || x.comando));
      b.onclick = function () { effetto = x.comando; segnaScelta(); };
      ef.appendChild(b);
    });
    var accetta = { immagine: 'image/*', video: 'video/*', audio: 'audio/*' };
    $('wo-file').setAttribute('accept', (r.file.tipi || []).map(function (t) { return accetta[t]; }).join(','));
    $('wo-file-nota').textContent = T.fileNota + ' ' + riempi(T.fileVa, { tipi: tipiFile(r.file), mb: r.file.pesoMb });
    $('wo-testo-box').hidden = !(r.testo.attivo && r.testo.max > 0);
    $('wo-testo').maxLength = r.testo.max || 0;
    if (dati.mio && !$('wo-testo').value) $('wo-testo').value = dati.mio.testo || '';
    $('wo-mail-box').hidden = !dati.posta;
    segnaScelta();
  }

  function disegna() { disegnaIo(); disegnaRegole(); disegnaMio(); disegnaModulo(); }

  function carica() {
    return chiedi('/dati').then(function (r) {
      if (r._stato !== 200) { avviso(errore(r), 'ko'); return; }
      dati = r;
      io = r.io || null;
      disegna();
    }).catch(function () { avviso((T.errori || {}).errore, 'ko'); });
  }

  $('wo-modulo').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!dati) return;
    var f = new FormData();
    f.append('scelta', scelta);
    if (scelta === 'effetto') {
      if (!effetto) { avviso((T.errori || {}).vuoto, 'ko'); return; }
      f.append('effetto', effetto);
    } else {
      var file = $('wo-file').files[0];
      var tieni = dati.mio && dati.mio.scelta === 'file' && dati.mio.haFile;
      if (!file && !tieni) { avviso((T.errori || {}).vuoto, 'ko'); return; }
      if (file && file.size > dati.regole.file.pesoMb * 1048576) { avviso(errore({ errore: 'peso' }), 'ko'); return; }
      if (file) f.append('file', file);
    }
    f.append('testo', $('wo-testo').value || '');
    if (dati.posta) f.append('mail', $('wo-mail').value || '');
    f.append('lingua', lingua);
    var bt = $('wo-manda');
    bt.disabled = true; bt.textContent = T.invio;
    chiedi('/salva', { method: 'POST', body: f }).then(function (r) {
      bt.disabled = false; bt.textContent = T.salva;
      if (!r.ok) { avviso(errore(r), 'ko'); if (r.errore === 'accesso') { io = null; disegna(); } return; }
      $('wo-file').value = ''; $('wo-mail').value = '';
      avviso(r.stato === 'approvato' ? T.salvatoSubito : T.salvato, 'ok');
      carica();
    }).catch(function () { bt.disabled = false; bt.textContent = T.salva; avviso((T.errori || {}).errore, 'ko'); });
  });

  disegna();
  carica();
})();
