// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  var B = document.getElementById('cp');
  if (!B) return;
  var login = B.getAttribute('data-login') || '';
  var lingua = B.getAttribute('data-lingua') || 'it';
  var canale = B.getAttribute('data-canale') || login;
  var T = {};
  try { T = JSON.parse(B.getAttribute('data-t') || '{}'); } catch (e) { T = {}; }
  var io = null;
  try { io = JSON.parse(B.getAttribute('data-io') || 'null') || null; } catch (e) { io = null; }
  var accesso = B.getAttribute('data-accesso') === '1';
  var accessoKick = B.getAttribute('data-accesso-kick') === '1';
  function vd() { return io && io.piattaforma === 'kick' ? 'kicks' : 'bit'; }
  function tv(k, bitKey) { return vd() === 'kicks' ? (T.k || {})[k] : T[bitKey]; }
  function pewOn() { return !!(dati && (vd() === 'kicks' ? dati.kicksPew : dati.bitPew)); }
  var base = '/u/' + encodeURIComponent(login) + '/colpo';
  var memo = 'sb-colpo:' + login;
  var QUADRO_L = 1920, QUADRO_A = 1080;
  function $(id) { return document.getElementById(id); }
  function quadro() {
    var q = dati && dati.quadro;
    if (!q || !(q.l > 0) || !(q.a > 0)) return;
    QUADRO_L = q.l; QUADRO_A = q.a;
    var p = $('cp-palco');
    p.style.aspectRatio = q.l + ' / ' + q.a;
    p.style.width = 'min(100%, calc(78vh * ' + (q.l / q.a).toFixed(4) + '))';
  }
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
  function moneta() { return (dati && dati.moneta) || ''; }
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

  var saldoBit = null, saldoMonete = null, scadonoBit = null, zainoMio = null;
  function saldi() {
    if (!io || !dati) { saldoBit = null; saldoMonete = null; lanciaTasti(); return Promise.resolve(); }
    return chiedi('/saldi').then(function (r) {
      if (r._stato === 401) { io = null; saldoBit = null; saldoMonete = null; accedi(); scriviSi(); lanciaTasti(); return; }
      var prima = saldoBit + '|' + saldoMonete;
      saldoBit = typeof r.daSpendere === 'number' ? r.daSpendere : null;
      saldoMonete = typeof r.monete === 'number' ? r.monete : null;
      var scPrima = JSON.stringify([scadonoBit, zainoMio]);
      scadonoBit = r.scadono && r.scadono.quanti > 0 ? r.scadono : null;
      zainoMio = Array.isArray(r.zaino) ? r.zaino : null;
      if (scPrima !== JSON.stringify([scadonoBit, zainoMio])) { accedi(); zaino(); lanciaTasti(); }
      if (prima !== saldoBit + '|' + saldoMonete) { accedi(); lanciaTasti(); if (mira && mira.stato === 'attesa') mostra(); }
    }, function () {  });
  }

  function quantiNelloZaino(voce) {
    var n = 0;
    (zainoMio || []).forEach(function (x) { if (x.voce === voce) n = x.quanti; });
    return n;
  }
  var modo = '', buonoSel = 0;
  function strada() { return !!(dati && dati.flusso === 'zaino' && dati.zaino); }
  function puntiDi(v) { return ((v && v.buono) || {})[vd() === 'kicks' ? 'puntiKick' : 'punti'] || 0; }
  function copre(x, v) { var p = puntiDi(v); return x.buono > 0 && p > 0 && p <= x.buono; }
  function buoniPer(v) {
    var n = 0;
    (zainoMio || []).forEach(function (x) { if (copre(x, v)) n += x.quanti; });
    return n;
  }
  function numera() {
    var n = 0;
    ['cp-p1', 'cp-pc', 'cp-p2', 'cp-p3'].forEach(function (id) {
      var sz = $(id), sp = sz && sz.querySelector('.cp-t span');
      if (sz && !sz.hidden && sp) sp.textContent = String(++n);
    });
    $('cp-p2-t').textContent = strada() ? T.passoLancia : T.passo2;
  }

  function zaino() {
    var box = $('cp-zaino');
    box.textContent = '';
    var su = !!(dati && dati.zaino && io && zainoMio);
    box.hidden = !su;
    if (!su) return;
    box.appendChild(el('h2', 'cp-t', T.zainoTitolo));
    if (!zainoMio.length) { box.appendChild(el('p', 'cp-nota', T.zainoVuoto)); return; }
    var l = el('ul', 'cp-zaino-l');
    zainoMio.forEach(function (x) {
      var li = el('li', '');
      var nome = x.buono ? riempi(T.zainoBuono, { n: numero(x.buono) }) : x.nome;
      var su = function () {
        if (mira) return;
        if (x.buono) { buonoSel = x.buono; filtra(); inVista($('cp-p1')); return; }
        var v = voceDi(x.voce);
        if (v) scegli(v, 'zaino');
      };
      var b = el('button', 'cp-zaino-v', riempi(T.zainoRiga, { n: numero(x.quanti), nome: nome }));
      b.type = 'button';
      b.onclick = su;
      li.appendChild(b);
      var lz = el('button', 'cp-b', T.zainoLancia);
      lz.type = 'button';
      lz.setAttribute('data-zaino-lancia', x.voce);
      lz.onclick = su;
      li.appendChild(lz);
      if (x.buono) li.appendChild(el('small', '', riempi(T.zainoBuonoNota, { n: numero(x.buono) })));
      if (x.quando) li.appendChild(el('small', '', riempi(T.zainoFino, { quando: x.quando })));
      l.appendChild(li);
    });
    box.appendChild(l);
  }

  function lanciaTasti() {
    var box = $('cp-lancia');
    var conf = $('cp-conferma');
    box.textContent = '';
    var modi = [];
    if (io && scelta && !mira && modo) {
      var pz = scelta.prezzi || {};
      var nv = quantiNelloZaino(scelta.id), nb = buoniPer(scelta);
      if (nv > 0) modi.push({ con: 'zaino', testo: riempi(T.lanciaZaino, { n: numero(nv) }), basta: true });
      else if (nb > 0) modi.push({ con: 'zaino', testo: riempi(T.lanciaBuono, { n: numero(nb), punti: numero(buonoSel || puntiDi(scelta)) }), basta: true });
    }
    if (io && scelta && !mira && modo === 'subito') {
      var v = vd();
      if (pz[v] > 0 && pewOn() && saldoBit !== null) modi.push({ con: v, testo: riempi(tv('lancia', 'lanciaBit'), { n: numero(pz[v]) }), basta: saldoBit >= pz[v] });
      if (pz.monete > 0 && saldoMonete !== null) modi.push({ con: 'monete', testo: riempi(T.lanciaMonete, { n: numero(pz.monete), moneta: moneta() }), basta: saldoMonete >= pz.monete });
      (scelta.misti || []).forEach(function (x) {
        if (x.modo === v && pewOn() && saldoBit !== null && saldoMonete !== null) modi.push({ con: 'misto-' + v, testo: riempi(tv('lanciaMisto', 'lanciaMisto'), { monete: numero(x.monete), moneta: moneta(), bit: numero(x.resto) }), basta: saldoMonete >= x.monete && saldoBit >= x.resto });
      });
    }
    modi.forEach(function (m) {
      var b = el('button', 'cp-b cp-paga-b', m.testo);
      b.type = 'button';
      b.setAttribute('data-lancia', m.con);
      b.setAttribute('data-basta', m.basta ? '1' : '');
      b.onclick = function () { lancia(m.con, b); };
      box.appendChild(b);
    });
    if (modi.length) box.appendChild(el('p', 'cp-nota', modo === 'zaino' ? T.miraZaino : T.lanciaNota));
    box.hidden = !modi.length;
    conf.hidden = modo !== 'subito';
    conf.textContent = modi.length ? T.altriModi : T.conferma;
    conf.classList.toggle('due', !!modi.length);
    perDopo();
    pronto();
  }

  function perDopo() {
    var sez = $('cp-pc'), box = $('cp-dopo');
    box.textContent = '';
    var z = dati && dati.zaino;
    sez.hidden = !strada();
    numera();
    var vivo = !sez.hidden && !!scelta && !mira;
    sez.classList.toggle('spento', !vivo);
    if (!vivo) return;
    if (modo !== 'subito') {
      var sub = el('div', 'cp-subito');
      var cl = el('button', 'cp-b due', T.compraLancia);
      cl.type = 'button';
      cl.setAttribute('data-compra-lancia', '1');
      cl.onclick = function () { scegli(scelta, 'subito'); };
      sub.appendChild(cl);
      sub.appendChild(el('p', 'cp-nota', T.compraLanciaNota));
      box.appendChild(sub);
    }
    if (!scelta.zaino) { box.insertBefore(el('p', 'cp-nota', (T.motivi || {}).zaino), box.firstChild); return; }
    if (!io) { box.insertBefore(el('p', 'cp-nota', T.dopoAccedi), box.firstChild); return; }
    var primo = box.firstChild;
    var pz = scelta.prezzi || {}, modi = [], v = vd();
    if (z.con[v] && pz[v] > 0 && pewOn() && saldoBit !== null) modi.push({ con: v, testo: riempi(tv('compra', 'compraBit'), { n: numero(pz[v]) }), basta: saldoBit >= pz[v] });
    if (z.con.monete && pz.monete > 0 && saldoMonete !== null) modi.push({ con: 'monete', testo: riempi(T.compraMonete, { n: numero(pz.monete), moneta: moneta() }), basta: saldoMonete >= pz.monete });
    (scelta.misti || []).forEach(function (x) {
      if (z.con.misto && x.modo === v && pewOn() && saldoBit !== null && saldoMonete !== null) modi.push({ con: 'misto-' + v, testo: riempi(tv('compraMisto', 'compraMisto'), { monete: numero(x.monete), moneta: moneta(), bit: numero(x.resto) }), basta: saldoMonete >= x.monete && saldoBit >= x.resto });
    });
    var r = el('div', 'cp-lancia');
    modi.forEach(function (m) {
      var b = el('button', 'cp-b cp-paga-b', m.testo);
      b.type = 'button';
      b.setAttribute('data-dopo', m.con);
      b.disabled = !m.basta || dati.pausa;
      b.onclick = function () { compra(m.con, b); };
      r.appendChild(b);
    });
    var esterni = (z.con.cheer && pz.bit > 0) || (z.con.regalo && pz.kicks > 0) || (z.con.punti && pz.punti > 0 && scelta.premio) || (z.con.euro && pz.euro > 0 && (dati.mezzi || []).length) || (z.con.misto && (scelta.misti || []).length);
    if (esterni) {
      var a = el('button', 'cp-b due', T.altriDopo);
      a.type = 'button';
      a.setAttribute('data-dopo', 'altri');
      a.disabled = !!dati.pausa;
      a.onclick = function () { prendi(true); };
      r.appendChild(a);
    }
    box.insertBefore(r, primo);
    box.insertBefore(el('p', 'cp-nota', T.dopoNota), primo);
  }

  function compra(con, b) {
    var bb = document.querySelectorAll('#cp-dopo button');
    for (var i = 0; i < bb.length; i++) bb[i].disabled = true;
    chiedi('/lancia', { voce: scelta.id, con: con, dopo: true }).then(function (r) {
      if (!r.ok) {
        if (r.motivo === 'accesso') { io = null; accedi(); scriviSi(); }
        avviso(riempi(motivo(r), { saldo: numero(r.saldo || 0), serve: numero(r.serve || 0), massimo: numero(r.massimo || 0) }), 'ko');
        saldi(); lanciaTasti();
        return;
      }
      avviso(T.nelloZaino, 'ok');
      saldi().then(lanciaTasti);
    }, function () { avviso((T.motivi || {}).rete, 'ko'); lanciaTasti(); });
  }

  function lancia(con, b) {
    var bb = document.querySelectorAll('#cp-lancia button');
    for (var i = 0; i < bb.length; i++) bb[i].disabled = true;
    chiedi('/lancia', { voce: scelta.id, x: punto.x, y: punto.y, con: con }).then(function (r) {
      if (!r.ok) {
        if (r.motivo === 'accesso') { io = null; accedi(); scriviSi(); }
        avviso(riempi(motivo(r), { saldo: numero(r.saldo || 0), serve: numero(r.serve || 0) }), 'ko');
        saldi(); lanciaTasti();
        return;
      }
      mira = r.mira;
      ricorda(mira.id);
      if (con === 'zaino') { buonoSel = 0; filtra(); }
      lanciaTasti();
      mostra();
      saldi();
    }, function () { avviso((T.motivi || {}).rete, 'ko'); lanciaTasti(); });
  }

  function accedi() {
    var box = $('cp-io');
    box.textContent = '';
    if (!accesso && !accessoKick) { box.hidden = true; return; }
    if (io) {
      box.appendChild(el('p', '', riempi(T.sei, { nome: io.nome || io.login })));
      if (saldoBit !== null && pewOn()) box.appendChild(el('p', 'cp-saldo', riempi(tv('saldo', 'saldoBit'), { n: numero(saldoBit) })));
      if (saldoBit && scadonoBit && pewOn()) box.appendChild(el('p', 'cp-nota cp-scadono', riempi(tv('scadono', 'scadonoBit'), { n: numero(scadonoBit.quanti), quando: scadonoBit.quando })));
      if (saldoMonete !== null) box.appendChild(el('p', 'cp-saldo', riempi(T.saldoMonete, { n: numero(saldoMonete), moneta: moneta() })));
      var esci = el('button', 'cp-b due', T.esci);
      esci.type = 'button';
      esci.onclick = function () {
        chiedi('/esci', {}).then(function () { io = null; accedi(); scriviSi(); if (mira) mostra(); });
      };
      box.appendChild(esci);
    } else {
      var tasti = el('div', 'cp-righe-b');
      if (accesso) { var a = el('a', 'cp-b', T.accedi); a.href = base + '/accedi'; tasti.appendChild(a); }
      if (accessoKick) { var ak = el('a', 'cp-b cp-kick', (T.k || {}).accedi); ak.href = base + '/accedi-kick'; tasti.appendChild(ak); }
      box.appendChild(tasti);
      if (accesso) box.appendChild(el('p', 'cp-nota', T.accediPerche));
      if (accessoKick) box.appendChild(el('p', 'cp-nota', (T.k || {}).accediPerche));
      if (accesso && dati && dati.bitPew) box.appendChild(el('p', 'cp-nota', T.bitPewAccedi));
      if (accessoKick && dati && dati.kicksPew) box.appendChild(el('p', 'cp-nota', (T.k || {}).pewAccedi));
    }
    $('cp-nome-l').hidden = !!io || !(dati && dati.conNome);
    zaino();
  }

  function riga(m) {
    var li = el('li', '');
    var chi = el('b', '', m.chi || '');
    if (m.colore) chi.style.color = m.colore;
    li.appendChild(chi);
    li.appendChild(document.createTextNode(': '));
    String(m.testo || '').split(/(\s+)/).forEach(function (p) {
      var u = m.emote && Object.prototype.hasOwnProperty.call(m.emote, p) ? m.emote[p] : '';
      if (u && /^https:\/\//.test(u)) { var im = el('img', ''); im.src = u; im.alt = p; im.title = p; im.loading = 'lazy'; li.appendChild(im); }
      else li.appendChild(document.createTextNode(p));
    });
    return li;
  }
  function chatViva() {
    if (!window.EventSource || !window.SB_FLUSSO) return;
    var lista = $('cp-righe');
    var viste = Object.create(null), ordine = [];
    window.SB_FLUSSO.apri(base + '/chat', { silenzio: 75000, suMessaggio: function (e) {
      var m = null;
      try { m = JSON.parse(e.data); } catch (x) { return; }
      if (!m || m.tipo === 'battito') return;
      if (m.id) {
        if (viste[m.id]) return;
        viste[m.id] = 1; ordine.push(m.id);
        if (ordine.length > 200) delete viste[ordine.shift()];
      }
      var vuota = lista.querySelector('.cp-vuota');
      if (vuota) vuota.remove();
      var giu = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 40;
      lista.appendChild(riga(m));
      while (lista.children.length > 80) lista.removeChild(lista.firstChild);
      if (giu) lista.scrollTop = lista.scrollHeight;
    } });
  }
  function scriviSi() {
    $('cp-scrivi').hidden = !io;
    $('cp-chat-fuori').hidden = !!io || !accesso;
  }
  $('cp-scrivi').addEventListener('submit', function (e) {
    e.preventDefault();
    var campo = $('cp-testo');
    var testo = campo.value.trim();
    if (!testo) return;
    campo.disabled = true;
    chiedi('/chat', { testo: testo }).then(function (r) {
      campo.disabled = false;
      if (r._stato === 401) { io = null; accedi(); scriviSi(); return; }
      if (r.ok) { campo.value = ''; campo.focus(); return; }
      avviso(r.errore === 'troppi' ? (T.motivi || {}).troppi : riempi(io && io.piattaforma === 'kick' ? T.k.chatNonInviato : T.chatNonInviato, { motivo: r.motivo || '' }), 'ko');
    }, function () { campo.disabled = false; avviso((T.motivi || {}).rete, 'ko'); });
  });

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
    if (v.prezzi.kicks) p.appendChild(el('i', '', riempi((T.k || {}).prezzoN, { n: numero(v.prezzi.kicks) })));
    if (v.prezzi.puntiKick) p.appendChild(el('i', '', riempi((T.k || {}).puntiN, { n: numero(v.prezzi.puntiKick) })));
    if (v.prezzi.monete) p.appendChild(el('i', '', riempi(T.moneteN, { n: numero(v.prezzi.monete), moneta: moneta() })));
    (v.misti || []).forEach(function (x) {
      p.appendChild(el('i', '', riempi(x.modo === 'bit' ? T.mistoBit : x.modo === 'kicks' ? (T.k || {}).misto : T.mistoPunti, { monete: numero(x.monete), moneta: moneta(), resto: numero(x.resto) })));
    });
    return p;
  }

  var filtro = '';
  function categorie() {
    var box = $('cp-cat');
    var cat = (dati && dati.categorie) || [];
    if (filtro && !cat.some(function (c) { return c.id === filtro; })) filtro = '';
    box.textContent = '';
    box.hidden = cat.length < 2;
    if (box.hidden) { filtro = ''; return; }
    [{ id: '', nome: T.tutti }].concat(cat).forEach(function (c) {
      var b = el('button', '', c.nome || (T.cat || {})[c.id] || c.id);
      b.type = 'button';
      b.setAttribute('data-cat', c.id);
      b.setAttribute('aria-pressed', filtro === c.id ? 'true' : 'false');
      b.onclick = function () { filtro = c.id; categorie(); filtra(); };
      box.appendChild(b);
    });
  }
  function filtra() {
    var bb = document.querySelectorAll('.cp-voce-box');
    for (var i = 0; i < bb.length; i++) {
      var v = voceDi(bb[i].getAttribute('data-voce'));
      bb[i].hidden = (!!filtro && bb[i].getAttribute('data-cat') !== filtro) || (!!buonoSel && !(v && copre({ buono: buonoSel }, v)));
    }
    var bx = $('cp-buono');
    bx.textContent = '';
    bx.hidden = !buonoSel;
    if (!buonoSel) return;
    bx.appendChild(el('span', '', riempi(T.buonoScegli, { n: numero(buonoSel) })));
    var tt = el('button', 'cp-b due', T.buonoTutti);
    tt.type = 'button';
    tt.onclick = function () { buonoSel = 0; filtra(); lanciaTasti(); };
    bx.appendChild(tt);
  }

  function voci() {
    var box = $('cp-voci');
    box.textContent = '';
    var vuoto = $('cp-vuoto');
    vuoto.hidden = dati.voci.length > 0;
    vuoto.textContent = riempi(T.nessuno, { canale: canale });
    dati.voci.forEach(function (v) {
      var scatola = el('div', 'cp-voce-box');
      scatola.setAttribute('data-cat', v.categoria || '');
      scatola.setAttribute('data-voce', v.id);
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
      scatola.appendChild(b);
      if (v.prova) {
        var g = el('button', 'cp-vedi');
        g.type = 'button';
        g.setAttribute('data-vedi', v.id);
        g.setAttribute('aria-label', riempi(T.vediCome, { nome: v.nome }));
        g.title = T.vedi;
        g.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
        g.onclick = function () { prova(v, null); };
        scatola.appendChild(g);
      }
      box.appendChild(scatola);
    });
    categorie();
    filtra();
    $('cp-nome-l').hidden = !dati.conNome || !!io;
  }

  function scegli(v, m) {
    if (mira) return;
    scelta = v;
    if (buonoSel && !m) m = 'zaino';
    modo = m || (strada() && io && v.zaino ? '' : 'subito');
    var bb = document.querySelectorAll('.cp-voce');
    for (var i = 0; i < bb.length; i++) bb[i].setAttribute('aria-pressed', bb[i].getAttribute('data-voce') === v.id ? 'true' : 'false');
    var mirare = !!modo;
    $('cp-p2').classList.toggle('spento', !mirare);
    strato.classList.toggle('attiva', mirare);
    strato.tabIndex = mirare ? 0 : -1;
    inVista(mirare ? strato : $('cp-pc'));
    var vecchia = strato.querySelector('.cp-ombra');
    if (vecchia) vecchia.remove();
    if (punto) disegna();
    lanciaTasti();
    ritocco();
    avviso('');
  }

  function pronto() {
    ritocco();
    var si = !!(scelta && modo && punto && !protetto(punto.x, punto.y) && dati && dati.live && dati.overlay && !dati.pausa) && !mira;
    $('cp-conferma').disabled = !si;
    var bl = document.querySelectorAll('#cp-lancia button');
    for (var i = 0; i < bl.length; i++) bl[i].disabled = !si || !bl[i].getAttribute('data-basta');
    $('cp-prova-qui').disabled = !(scelta && scelta.prova && punto && !protetto(punto.x, punto.y)) || !!mira;
  }

  function inVista(el) {
    var r = el.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= innerHeight) return;
    var ridotto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'nearest', behavior: ridotto ? 'auto' : 'smooth' });
  }
  var fermaProva = null;
  function nomeFirma() {
    if (!dati || !dati.conNome) return '';
    var n = io ? (io.nome || io.login) : String($('cp-nome').value || '').trim();
    return (n || T.tuoNome || '').slice(0, 25);
  }
  function firma(palco, p) {
    var chi = nomeFirma();
    if (!chi) return function () {};
    var f = el('div', 'cp-firma', chi);
    f.style.left = p.x + '%'; f.style.top = p.y + '%';
    f.style.fontSize = Math.max(8, palco.clientWidth * 30 / QUADRO_L) + 'px';
    palco.appendChild(f);
    requestAnimationFrame(function () { f.classList.add('dentro'); });
    return function () { f.remove(); };
  }
  function prova(v, p) {
    if (fermaProva) fermaProva();
    if (!v || !v.prova) return;
    var palco = $('cp-prova');
    var pp = p || { x: 50, y: 50 };
    var pr = v.prova;
    var vol = pr.volume == null ? 1 : Math.max(0, Math.min(1, Number(pr.volume) / 100));
    var suoni = [], via = [], finita = false;
    var suona = function (url) { if (!url) return; try { var a = new Audio(url); a.volume = vol; suoni.push(a); a.play().catch(function () {  }); } catch (e) {  } };
    var fine = function () {
      if (finita) return;
      finita = true;
      via.forEach(function (f) { try { f(); } catch (e) {  } });
      suoni.forEach(function (a) { try { a.pause(); } catch (e) {  } });
      strato.classList.remove('in-prova');
      $('cp-solo-tu').hidden = true;
      if (fermaProva === fine) fermaProva = null;
    };
    fermaProva = fine;
    inVista(palco);
    strato.classList.add('in-prova');
    $('cp-solo-tu').hidden = false;
    if (pr.lancio) {
      if (!window.SB_LANCI) { fine(); return; }
      var s = Math.max(5, palco.clientWidth / QUADRO_L * (v.scala || 100));
      var ferma = window.SB_LANCI.lancia(palco, { comando: v.id, lancio: pr.lancio, posizione: { x: pp.x, y: pp.y, s: s, centro: true } },
        { suona: suona, colpito: function () { via.push(firma(palco, pp)); }, fine: fine });
      via.push(ferma);
      return;
    }
    var m, tela = null;
    if (v.tipo === 'video') {
      m = document.createElement('video');
      m.playsInline = true; m.volume = vol; m.src = v.anteprima;
      if (pr.chroma && window.SB_SCONTORNO) {
        tela = document.createElement('canvas');
        via.push(window.SB_SCONTORNO.scontorna(m, pr.chroma, tela));
      }
      m.addEventListener('ended', fine);
      m.addEventListener('error', fine);
    } else {
      m = document.createElement('img');
      m.alt = ''; m.src = v.anteprima;
    }
    var vista = tela || m;
    vista.className = 'cp-media';
    vista.style.left = pp.x + '%'; vista.style.top = pp.y + '%';
    var grande = (v.scala || 100) / 100;
    var misura = function (l, a) {
      if (!l || !a) return;
      misure[v.id] = { l: l, a: a };
      vista.style.width = (l * Math.min(a, QUADRO_A * 0.92) / a * grande / QUADRO_L * 100) + '%';
    };
    if (misure[v.id]) misura(misure[v.id].l, misure[v.id].a);
    if (v.tipo === 'video') m.addEventListener('loadedmetadata', function () { misura(m.videoWidth, m.videoHeight); });
    else m.addEventListener('load', function () { misura(m.naturalWidth, m.naturalHeight); });
    palco.appendChild(vista);
    via.push(function () { try { m.pause && m.pause(); } catch (e) {  } vista.remove(); });
    via.push(firma(palco, pp));
    requestAnimationFrame(function () { vista.classList.add('dentro'); });
    suona(pr.suono);
    if (v.tipo === 'video') { var gioca = m.play(); if (gioca && gioca.catch) gioca.catch(function () {  }); }
    var dura = Number(pr.durata) > 0 ? Number(pr.durata) : (v.tipo === 'video' ? 8000 : 5000);
    var t = setTimeout(fine, v.tipo === 'video' ? dura + 600 : dura);
    via.push(function () { clearTimeout(t); });
  }
  $('cp-prova-qui').onclick = function () { if (scelta && punto) prova(scelta, punto); };

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
  function pixel(p) { return { x: Math.round(p.x * QUADRO_L / 100), y: Math.round(p.y * QUADRO_A / 100) }; }
  function sposta(dx, dy) {
    var q = pixel(punto || { x: 50, y: 50 });
    punta((q.x + dx) / QUADRO_L * 100, (q.y + dy) / QUADRO_A * 100);
  }
  var tocco = null;
  function dove(e) {
    var r = strato.getBoundingClientRect();
    if (r.width && r.height) punta((e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100);
  }
  strato.addEventListener('pointerdown', function (e) {
    if (mira || !scelta || e.button > 0) return;
    tocco = e.pointerId;
    try { strato.setPointerCapture(e.pointerId); } catch (x) {  }
    dove(e);
  });
  strato.addEventListener('pointermove', function (e) { if (tocco === e.pointerId) dove(e); });
  function lascia(e) { if (tocco === e.pointerId) tocco = null; }
  strato.addEventListener('pointerup', lascia);
  strato.addEventListener('pointercancel', lascia);
  strato.addEventListener('keydown', function (e) {
    if (mira || !scelta) return;
    var k = e.key, d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (d) {
      var p = punto || { x: 50, y: 50 };
      if (e.shiftKey) punta(p.x + d[0], p.y + d[1]);
      else sposta(d[0], d[1]);
    } else if (k === 'Enter' && !$('cp-conferma').disabled) { prendi(); }
    else return;
    e.preventDefault();
  });
  (function () {
    var bb = document.querySelectorAll('#cp-ritocco [data-d]');
    for (var i = 0; i < bb.length; i++) (function (b) {
      var d = b.getAttribute('data-d').split(',').map(Number), t = null;
      function ferma() { clearTimeout(t); t = null; }
      function ripeti(attesa) { sposta(d[0], d[1]); t = setTimeout(function () { ripeti(40); }, attesa); }
      b.addEventListener('pointerdown', function (e) { if (e.button > 0) return; e.preventDefault(); ferma(); ripeti(380); });
      b.addEventListener('pointerup', ferma);
      b.addEventListener('pointerleave', ferma);
      b.addEventListener('pointercancel', ferma);
      b.addEventListener('click', function (e) { if (!e.detail) sposta(d[0], d[1]); });
    })(bb[i]);
  })();
  function ritocco() {
    var r = $('cp-ritocco'), su = !!(scelta && !mira);
    r.hidden = !su;
    if (su) {
      var q = pixel(punto || { x: 50, y: 50 });
      $('cp-coord').textContent = riempi(T.coord, { x: numero(q.x), y: numero(q.y), l: numero(QUADRO_L), a: numero(QUADRO_A) });
    }
    var c = $('cp-in-chat');
    c.hidden = !(scelta && scelta.chat && dati);
    if (!c.hidden) c.textContent = riempi(T.inChat, { comando: '!' + (dati.comando || 'pew') + ' ' + scelta.chat });
  }

  function voceDi(id) {
    var v = null;
    (dati && dati.voci || []).forEach(function (x) { if (x.id === id) v = x; });
    return v;
  }

  function prendi(dopo) {
    var b = $('cp-conferma');
    b.disabled = true;
    var corpo = dopo === true ? { voce: scelta.id, dopo: true } : { voce: scelta.id, x: punto.x, y: punto.y, chi: dati.conNome && !io ? $('cp-nome').value : '' };
    chiedi('/mira', corpo).then(function (r) {
      if (!r.ok) { avviso(riempi(motivo(r), { massimo: numero(r.massimo || 0) }), 'ko'); pronto(); return; }
      mira = r.mira;
      ricorda(mira.id);
      mostra();
    }, function () { avviso((T.motivi || {}).rete, 'ko'); pronto(); });
  }
  $('cp-conferma').onclick = function () { prendi(false); };

  function paga(mezzo, b) {
    b.disabled = true;
    chiedi('/paga/' + mira.id, { mezzo: mezzo }).then(function (r) {
      if (r.url) { location.assign(r.url); return; }
      b.disabled = false;
      avviso(r.errore === 'scaduta' ? T.scaduta : (T.motivi || {})[r.errore] || (T.motivi || {}).pagamento, 'ko');
      leggi();
    }, function () { b.disabled = false; avviso((T.motivi || {}).rete, 'ko'); });
  }

  function pagaMonete(b, modo) {
    b.disabled = true;
    chiedi('/paga/' + mira.id, { mezzo: 'monete', modo: modo || '' }).then(function (r) {
      if (r.ok) { leggi(); return; }
      b.disabled = false;
      if (r.errore === 'accesso') { io = null; accedi(); scriviSi(); }
      avviso(riempi((T.motivi || {})[r.errore] || (T.motivi || {}).pagamento, { saldo: numero(r.saldo || 0), serve: numero(r.serve || 0) }), 'ko');
    }, function () { b.disabled = false; avviso((T.motivi || {}).rete, 'ko'); });
  }

  function pagaBit(b) {
    b.disabled = true;
    chiedi('/paga/' + mira.id, { mezzo: 'bitpew' }).then(function (r) {
      if (r.ok) { saldi(); leggi(); return; }
      b.disabled = false;
      if (r.errore === 'accesso') { io = null; accedi(); scriviSi(); }
      avviso(riempi((T.motivi || {})[r.errore] || (T.motivi || {}).pagamento, { saldo: numero(r.saldo || 0), serve: numero(r.serve || 0) }), 'ko');
      saldi();
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
    ritocco();
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
      var zc = mira.dopo ? ((dati.zaino && dati.zaino.con) || {}) : null;
      var puo = function (k) { return !zc || !!zc[k]; };
      if (mira.dopo) box.appendChild(el('p', 'cp-nota', T.dopoNota));
      if (puo('euro') && pz.euro > 0 && mira.pagabile && !mira.inPagamento && !mira.acconto && (dati.mezzi || []).length) {
        var r = el('div', 'cp-righe cp-modo');
        dati.mezzi.forEach(function (m) {
          var b = el('button', 'cp-b cp-paga-b', riempi(T.euro, { prezzo: prezzo(pz.euro) }) + (dati.mezzi.length > 1 ? ' · ' + (m === 'satispay' ? T.satispay : T.carta) : ''));
          b.type = 'button';
          b.onclick = function () { paga(m, b); };
          r.appendChild(b);
        });
        box.appendChild(r);
      }
      var conCodice = mira.pagabile && !mira.inPagamento && !mira.acconto;
      if (conCodice && puo('punti') && pz.punti > 0 && v.premio) {
        var pp = el('div', 'cp-modo');
        pp.appendChild(el('p', '', riempi(mira.mia ? T.puntiIo : T.punti, { premio: v.premio, n: numero(pz.punti), codice: mira.codice })));
        box.appendChild(pp);
      }
      if (conCodice && puo('punti') && pz.puntiKick > 0 && v.premioKick) {
        var pk = el('div', 'cp-modo');
        pk.appendChild(el('p', '', riempi(mira.mia && vd() === 'kicks' ? (T.k || {}).puntiIo : (T.k || {}).punti, { premio: v.premioKick, n: numero(pz.puntiKick), codice: mira.codice })));
        box.appendChild(pk);
      }
      var raccolto = mira.versati > 0 ? (mira.valuta || 'bit') : '';
      if (conCodice && puo('cheer') && pz.bit > 0 && raccolto !== 'kicks') {
        var bb = el('div', 'cp-modo');
        bb.appendChild(el('p', '', riempi(mira.mia && vd() === 'bit' ? T.bitIo : T.bit, { n: Math.max(0, pz.bit - (raccolto ? mira.versati : 0)), codice: mira.codice })));
        box.appendChild(bb);
      }
      if (conCodice && puo('regalo') && pz.kicks > 0 && raccolto !== 'bit') {
        var kb = el('div', 'cp-modo');
        kb.appendChild(el('p', '', riempi(mira.mia && vd() === 'kicks' ? (T.k || {}).regaloIo : (T.k || {}).regalo, { n: Math.max(0, pz.kicks - (raccolto ? mira.versati : 0)), codice: mira.codice })));
        box.appendChild(kb);
      }
      if (mira.acconto && mira.stato === 'attesa') {
        var ac = el('div', 'cp-modo');
        var mv = (v.misti || []).filter(function (x) { return x.modo === mira.acconto.modo; })[0] || {};
        ac.appendChild(el('p', '', riempi(mira.acconto.modo === 'punti' ? T.accontoPunti : mira.acconto.modo === 'kicks' ? (T.k || {}).mistoDopo : T.accontoBit, { monete: numero(mira.acconto.monete), moneta: moneta(), resto: numero(mira.acconto.resto), codice: mira.codice, premio: mv.premio || '' })));
        box.appendChild(ac);
        var cc = el('div', 'cp-righe'); cc.appendChild(chat()); box.appendChild(cc);
      }
      var vv = vd(), resaV = vv === 'kicks' ? ((pz.k || {}).resa || 0) : (pz.resa || 0);
      var restoBit = raccolto && raccolto !== vv ? 0 : mira.acconto ? (mira.acconto.modo === vv ? mira.acconto.resto : 0) : (pz[vv] || 0);
      var mancaBit = Math.max(0, restoBit - (mira.versati || 0));
      if (io && pewOn() && puo(mira.acconto ? 'misto' : vv) && resaV > 0 && mancaBit > 0 && mira.pagabile && !mira.inPagamento) {
        var bp = el('div', 'cp-modo');
        var pbit = el('button', 'cp-b cp-paga-b', riempi(tv('pewIo', 'bitPewIo'), { n: numero(mancaBit) }));
        pbit.type = 'button';
        pbit.setAttribute('data-paga', 'bitpew');
        pbit.disabled = saldoBit !== null && saldoBit < mancaBit;
        pbit.onclick = function () { pagaBit(pbit); };
        bp.appendChild(pbit);
        if (saldoBit !== null) bp.appendChild(el('p', 'cp-nota', riempi(tv('pewNota', 'bitPewNota'), { saldo: numero(saldoBit) })));
        box.appendChild(bp);
      }
      if (conCodice && puo('misto')) {
        (v.misti || []).forEach(function (x) {
          var mm = el('div', 'cp-modo');
          var val = { monete: numero(x.monete), moneta: moneta(), resto: numero(x.resto), codice: mira.codice, comando: (dati && dati.comando) || 'pew', premio: x.premio || '' };
          if (io) {
            mm.appendChild(el('p', '', riempi(x.modo === 'bit' ? T.mistoBit : x.modo === 'kicks' ? (T.k || {}).misto : T.mistoPunti, val)));
            var pb = el('button', 'cp-b cp-paga-b', riempi(T.mistoIo, val));
            pb.type = 'button';
            pb.setAttribute('data-paga', 'misto-' + x.modo);
            pb.onclick = function () { pagaMonete(pb, x.modo); };
            mm.appendChild(pb);
            mm.appendChild(el('p', 'cp-nota', riempi(x.modo === 'bit' ? T.mistoDopoBit : x.modo === 'kicks' ? (T.k || {}).mistoDopo : T.mistoDopoPunti, val)));
          } else {
            mm.appendChild(el('p', '', riempi(x.modo === 'bit' ? T.mistoChatBit : x.modo === 'kicks' ? (T.k || {}).mistoChat : T.mistoChatPunti, val)));
          }
          box.appendChild(mm);
        });
      }
      if (conCodice && puo('monete') && pz.monete > 0) {
        var mm = el('div', 'cp-modo');
        if (io) {
          var pm = el('button', 'cp-b cp-paga-b', riempi(T.moneteIo, { n: numero(pz.monete), moneta: moneta() }));
          pm.type = 'button';
          pm.setAttribute('data-paga', 'monete');
          pm.onclick = function () { pagaMonete(pm); };
          mm.appendChild(pm);
        } else {
          mm.appendChild(el('p', '', riempi(T.monete, { n: numero(pz.monete), moneta: moneta(), comando: (dati && dati.comando) || 'pew', codice: mira.codice })));
          if (accesso) mm.appendChild(el('p', 'cp-nota', T.moneteAccedi));
        }
        box.appendChild(mm);
      }
      if (conCodice && (pz.bit > 0 || pz.kicks > 0 || (pz.punti > 0 && v.premio) || ((pz.monete > 0 || (v.misti || []).length) && !io) || (io && (v.misti || []).length))) { var cr = el('div', 'cp-righe'); cr.appendChild(chat()); box.appendChild(cr); }
    }
    var fine = el('div', 'cp-righe cp-modo');
    if (mira.stato === 'pagata') { racconta(); segui(); return; }
    if (mira.stato === 'attesa' && v.prova && !mira.dopo) {
      var pq = el('button', 'cp-b due', T.prova);
      pq.type = 'button';
      pq.setAttribute('data-prova', 'mira');
      pq.onclick = function () { prova(v, { x: mira.x, y: mira.y }); };
      fine.appendChild(pq);
    }
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
    if (mira.stato === 'zaino') avviso(T.nelloZaino, 'ok');
    else if (mira.stato === 'sparata') avviso(T.partito, 'ok');
    else if (mira.stato === 'pagata') avviso(T.pagata);
    else if (mira.stato === 'rimborsata') avviso(T.rimborsata, 'ko');
    else if (mira.stato === 'scaduta') avviso(T.scaduta, 'ko');
    else if (mira.inPagamento) avviso(T.attesa);
    else if (!mira.pagabile) avviso(riempi(T.fermo, { motivo: (T.motivi || {})[mira.fermo] || '' }), 'ko');
    else if (mira.versati > 0) avviso(riempi(mira.valuta === 'kicks' ? (T.k || {}).versati : T.versati, { n: numero(mira.versati), m: numero(Math.max(0, (mira.prezzi[mira.valuta === 'kicks' ? 'kicks' : 'bit'] || 0) - mira.versati)) }));
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
      var cambiato = r.stato !== mira.stato || r.inPagamento !== mira.inPagamento || r.pagabile !== mira.pagabile || !!r.acconto !== !!mira.acconto || r.versati !== mira.versati;
      mira = r;
      if (cambiato) { mostra(); saldi(); } else racconta();
    }, function () {  });
  }

  function daCapo() {
    if (fermaProva) fermaProva();
    clearInterval(giro); clearInterval(conto);
    mira = null; punto = null; modo = ''; buonoSel = 0;
    filtra();
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
      quadro();
      stato();
      zone();
      if (primo || prima !== dati.voci.map(function (v) { return v.id; }).join()) voci();
      if (scelta && !voceDi(scelta.id) && !mira) { scelta = null; daCapo(); }
      pronto();
    }, function () {  });
  }

  accedi();
  scriviSi();
  chatViva();
  carica(true).then(function () {
    accedi();
    saldi();
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
