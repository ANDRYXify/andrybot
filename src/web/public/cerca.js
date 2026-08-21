// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';

  function L(it, en, es) { try { return window.SB_APP.L(it, en, es); } catch (e) { return it; } }
  function esc(s) { try { return window.SB_APP.esc(String(s)); } catch (e) { return String(s == null ? '' : s); } }

  var SVG_LENTE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.7"></circle><line x1="20.5" y1="20.5" x2="15.6" y2="15.6"></line></svg>';

  var CHIAVI = {
    personalita: 'personalità carattere tono come parla stile prompt voce del bot indole descrizione',
    conoscenza: 'conoscenza sapere informazioni faq risposte curate cosa sa insegna',
    memoria: 'memoria ricordi cervello storia conversazioni persone statistiche',
    avatar: 'avatar 3d mente grafo nodi cervello di lia plasticità appraisal essere coscienza',
    moduli: 'comandi command custom variabili trigger risposte automatiche contatori !comando comando',
    ascolto: 'comandi vocali voce parlato speech ascolto microfono a voce',
    regole: 'moderazione moderation ban timeout kick spam filtri parole vietate link maiuscole flood automod chat pulita',
    scudo: 'scudo anti-bot antibot blocca bot segnalazioni registro interventi follow-bot follow bot hate-raid raid banna sospetti pulizia follower blocklist allowlist lista bot commanderroot sery_bot certezza',
    giochi: 'giochi minigiochi classifiche monete punti coin economia leaderboard ore guardate watchtime fedeltà rank vip',
    sondaggi: 'sondaggi predizioni poll prediction votazioni',
    giveaway: 'giveaway estrazione premi raffle sorteggio vincitori',
    penitenze: 'penitenze penalità punti canale sfide riscatti contatore morti',
    regia: 'regia diretta live comandi rapidi durante la diretta titolo categoria pubblicità',
    clip: 'clip momenti highlight ritaglia registra',
    musica: 'musica spotify song request canzoni richieste brani coda',
    alert: 'overlay alert studio scena widget browser source obs allerte follow sub bit raid chat a schermo emote 7tv',
    effetti: 'effetti suoni audio sound sfx immagini video premi punti canale',
    emote: 'emote 7tv emoji faccine',
    pagina: 'pagina link bio linktree profilo vetrina sito i miei link logo avatar',
    grafiche: 'grafiche immagini sfondi banner locandine social',
    notifiche: 'notifiche social tiktok instagram youtube discord telegram nuovi post avvisi live',
    stato: 'stato account piano pacchetti panoramica permessi',
    sottoscrizione: 'abbonamento subscription pagamento fattura rinnovo piano prezzo pacchetti',
    admin: 'admin operatore llm modello ecosistema vita di lia anima backup salute'
  };

  function DOMANDE() {
    return [
      [L('Cerchi i comandi?', 'Looking for commands?', '¿Buscas los comandos?'), 'moduli'],
      [L('Cerchi le impostazioni di moderazione?', 'Looking for moderation settings?', '¿Buscas la moderación?'), 'regole'],
      [L('Vuoi controllare lo scudo anti-bot?', 'Want to check the anti-bot shield?', '¿Revisar el escudo anti-bot?'), 'scudo'],
      [L('Vuoi cambiare la personalità del bot?', 'Want to change the bot personality?', '¿Cambiar la personalidad del bot?'), 'personalita'],
      [L('Vuoi creare un overlay?', 'Want to build an overlay?', '¿Crear un overlay?'), 'alert'],
      [L('Cerchi giochi e classifiche?', 'Looking for games & leaderboards?', '¿Juegos y clasificaciones?'), 'giochi'],
      [L('Vuoi impostare la musica?', 'Want to set up music?', '¿Configurar la música?'), 'musica']
    ];
  }

  var _dyn = [];
  var _cache = null;
  function invalida() { _cache = null; }

  function baseIndice() {
    var A = window.SB_APP; if (!A) return [];
    var out = [], gruppi = (A.gruppi || []).slice();
    if (A.isAdmin && A.gruppoAdmin) gruppi.push(A.gruppoAdmin);
    gruppi.forEach(function (g) {
      var gnome = A.tGruppo(g.id, g.nome);
      (g.schede || []).forEach(function (s) {
        var id = s[0];
        if (A.schedaValida && !A.schedaValida(id)) return;
        var lab = A.tScheda(id, s[1]);
        out.push({ id: id, label: lab, gruppo: gnome, gruppoId: g.id, icona: A.icona ? (A.icona(id) || '') : '', chiavi: (CHIAVI[id] || '') + ' ' + lab.toLowerCase() });
      });
    });
    return out;
  }

  function indice() {
    if (_cache) return _cache;
    var base = baseIndice();
    if (!base.length) return [];
    var extra = _dyn.filter(function (v) { return !window.SB_APP || !window.SB_APP.schedaValida || window.SB_APP.schedaValida(v.id); });
    _cache = base.concat(extra);
    return _cache;
  }

  function normal(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function sottoseq(testo, q) { var j = 0; for (var i = 0; i < testo.length && j < q.length; i++) if (testo[i] === q[j]) j++; return j === q.length; }

  function punteggio(voce, tok) {
    var lab = voce._nl || (voce._nl = normal(voce.label));
    var ch = voce._nc || (voce._nc = normal(voce.chiavi));
    var sc = 0;
    for (var i = 0; i < tok.length; i++) {
      var t = tok[i];
      if (lab === t) sc += 120;
      else if (lab.indexOf(t) === 0) sc += 72;
      else if (new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(lab)) sc += 55;
      else if (lab.indexOf(t) >= 0) sc += 38;
      else if (new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(ch)) sc += 24;
      else if (ch.indexOf(t) >= 0) sc += 13;
      else if (t.length >= 3 && sottoseq(lab, t)) sc += 6;
      else return -1;
    }
    return sc;
  }
  function evidenzia(label, tok) {
    var nl = normal(label);
    var ord = tok.slice().sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < ord.length; i++) {
      var k = nl.indexOf(ord[i]);
      if (k >= 0) return esc(label.slice(0, k)) + '<mark>' + esc(label.slice(k, k + ord[i].length)) + '</mark>' + esc(label.slice(k + ord[i].length));
    }
    return esc(label);
  }

  var ov, inp, lista, filtriBox, filtro = '', sel = 0, correnti = [], _deb = null;
  function costruisci() {
    var lancia = document.createElement('button');
    lancia.id = 'cerca-lancia'; lancia.type = 'button';
    lancia.setAttribute('aria-label', L('Cerca tutto', 'Search everything', 'Buscar todo'));
    lancia.innerHTML = SVG_LENTE;
    lancia.addEventListener('click', apri);
    document.body.appendChild(lancia);

    ov = document.createElement('div'); ov.id = 'cerca-overlay';
    ov.innerHTML =
      '<div class="cerca-box" role="dialog" aria-modal="true">' +
        '<div class="cerca-top"><span class="lente">' + SVG_LENTE + '</span>' +
          '<input id="cerca-input" autocomplete="off" spellcheck="false" placeholder="' +
            esc(L('Cerca qualsiasi cosa… comandi, moderazione, overlay…', 'Search anything… commands, moderation, overlays…', 'Busca cualquier cosa… comandos, moderación, overlays…')) + '">' +
          '<span class="cerca-kbd">Esc</span></div>' +
        '<div class="cerca-filtri"></div>' +
        '<div class="cerca-corpo"></div>' +
      '</div>';
    document.body.appendChild(ov);
    inp = ov.querySelector('#cerca-input');
    filtriBox = ov.querySelector('.cerca-filtri');
    lista = ov.querySelector('.cerca-corpo');

    ov.addEventListener('click', function (e) { if (e.target === ov) chiudi(); });
    inp.addEventListener('input', function () { sel = 0; if (_deb) clearTimeout(_deb); _deb = setTimeout(disegna, 45); });
    inp.addEventListener('keydown', tasti);
  }

  function filtri() {
    var A = window.SB_APP, gruppi = (A.gruppi || []).slice();
    if (A.isAdmin && A.gruppoAdmin) gruppi.push(A.gruppoAdmin);
    var h = '<button class="cerca-filtro' + (filtro === '' ? ' on' : '') + '" data-f="">' + esc(L('Tutto', 'All', 'Todo')) + '</button>';
    gruppi.forEach(function (g) { h += '<button class="cerca-filtro' + (filtro === g.id ? ' on' : '') + '" data-f="' + esc(g.id) + '">' + esc(A.tGruppo(g.id, g.nome)) + '</button>'; });
    filtriBox.innerHTML = h;
    filtriBox.querySelectorAll('.cerca-filtro').forEach(function (b) {
      b.addEventListener('click', function () { filtro = b.dataset.f; sel = 0; filtri(); disegna(); inp.focus(); });
    });
  }

  function disegna() {
    var q = normal(inp.value.trim());
    var tutto = indice().filter(function (v) { return !filtro || v.gruppoId === filtro; });
    if (!q) {
      var dd = DOMANDE().filter(function (d) { return !filtro || (indice().find(function (v) { return v.id === d[1]; }) || {}).gruppoId === filtro; });
      var hs = '<div class="cerca-sugg-tit">' + esc(L('Cosa cerchi?', 'What are you looking for?', '¿Qué buscas?')) + '</div><div class="cerca-sugg">';
      dd.forEach(function (d, i) { hs += '<button class="chip-domanda" data-id="' + esc(d[1]) + '" style="--an-ritardo:' + (i * 45) + 'ms"><span class="pip"></span>' + esc(d[0]) + '</button>'; });
      hs += '</div>';
      correnti = tutto;
      hs += righe(tutto, [], L('Tutte le sezioni', 'All sections', 'Todas las secciones'));
      lista.innerHTML = hs;
      aggancia();
      return;
    }
    var tok = q.split(/\s+/).filter(Boolean);
    var res = tutto.map(function (v) { return { v: v, s: punteggio(v, tok) }; })
      .filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return b.s - a.s || a.v.label.length - b.v.label.length; })
      .slice(0, 60)
      .map(function (x) { return x.v; });
    correnti = res;
    lista.innerHTML = res.length ? righe(res, tok, '') :
      '<div class="cerca-vuoto">' + esc(L('Niente per «', 'Nothing for “', 'Nada para «')) + esc(inp.value) + esc(L('». Prova un\'altra parola.', '”. Try another word.', '». Prueba otra palabra.')) + '</div>';
    aggancia();
  }

  function righe(arr, tok, titolo) {
    var h = titolo ? '<div class="cerca-sugg-tit">' + esc(titolo) + '</div>' : '';
    h += '<div class="cerca-lista">';
    arr.forEach(function (v, i) {
      h += '<div class="cerca-voce' + (i === sel ? ' sel' : '') + '" data-id="' + esc(v.id) + '" data-i="' + i + '" style="--an-ritardo:' + Math.min(i, 10) * 28 + 'ms">' +
        '<span class="pip"></span>' +
        '<span class="txt"><b>' + evidenzia(v.label, tok) + '</b><small>' + esc(v.gruppo) + (v.sotto ? ' · ' + esc(v.sotto) : '') + '</small></span>' +
        '<span class="via">' + esc(L('apri', 'open', 'abrir')) + '</span></div>';
    });
    h += '</div>';
    return h;
  }

  function aggancia() {
    lista.querySelectorAll('.chip-domanda').forEach(function (b) { b.addEventListener('click', function () { vai(b.dataset.id); }); });
    lista.querySelectorAll('.cerca-voce').forEach(function (b) {
      b.addEventListener('click', function () { vai(b.dataset.id); });
      b.addEventListener('mousemove', function () { var i = +b.dataset.i; if (i !== sel) { sel = i; segna(); } });
    });
  }
  function segna() {
    lista.querySelectorAll('.cerca-voce').forEach(function (b) { b.classList.toggle('sel', +b.dataset.i === sel); });
    var s = lista.querySelector('.cerca-voce.sel'); if (s) s.scrollIntoView({ block: 'nearest' });
  }

  function tasti(e) {
    if (e.key === 'Escape') { chiudi(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); if (correnti.length) { sel = (sel + 1) % correnti.length; segna(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (correnti.length) { sel = (sel - 1 + correnti.length) % correnti.length; segna(); } }
    else if (e.key === 'Enter') { e.preventDefault(); if (correnti[sel]) vai(correnti[sel].id); }
  }

  function vai(id) { chiudi(); try { window.SB_APP.vai(id); } catch (e) { location.hash = '#' + id; } }

  function apri() {
    if (!ov) return;
    filtro = ''; sel = 0;
    filtri(); ov.classList.add('aperto'); document.body.classList.add('cerca-aperta'); disegna();
    setTimeout(function () { inp.value = ''; inp.focus(); }, 30);
    document.addEventListener('keydown', globali, true);
  }
  function chiudi() { if (ov) ov.classList.remove('aperto'); document.body.classList.remove('cerca-aperta'); document.removeEventListener('keydown', globali, true); }
  function globali(e) {  }

  function scorciatoie(e) {
    var k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); ov && ov.classList.contains('aperto') ? chiudi() : apri(); return; }
    if (k === '/' && !ov.classList.contains('aperto')) {
      var t = e.target, tag = (t && t.tagName || '').toLowerCase();
      if (tag !== 'input' && tag !== 'textarea' && !(t && t.isContentEditable)) { e.preventDefault(); apri(); }
    }
  }

  window.SB_CERCA = {
    apri: function () { try { apri(); } catch (e) {} },
    aggiungi: function (voci, tag) {
      if (!Array.isArray(voci)) return;
      var A = window.SB_APP;
      voci.forEach(function (v) {
        if (!v || !v.id || !v.label) return;
        var gruppoId = v.gruppoId || '';
        _dyn.push({
          id: v.id, label: String(v.label), sotto: v.sotto || '',
          gruppo: v.gruppo || (A && gruppoId ? A.tGruppo(gruppoId, gruppoId) : ''), gruppoId: gruppoId,
          chiavi: (String(v.chiavi || '') + ' ' + String(v.label)).toLowerCase(), tag: tag || ''
        });
      });
      invalida();
    },
    pulisci: function (tag) { _dyn = tag ? _dyn.filter(function (v) { return v.tag !== tag; }) : []; invalida(); },
    invalida: invalida
  };

  function avvia() {
    if (!window.SB_APP) { window.addEventListener('sb-app-pronta', avvia, { once: true }); return; }
    if (document.getElementById('cerca-lancia')) return;
    costruisci();
    document.addEventListener('keydown', scorciatoie);
    window.addEventListener('sb-cerca-invalida', invalida);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
