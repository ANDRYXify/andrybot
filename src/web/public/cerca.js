// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// cerca.js — la RICERCA PREDITTIVA: una lente sempre a portata (⌘K / "/"), un indice di
// TUTTO il pannello (sezioni + parole chiave generose), filtri comodi per gruppo, e le
// DOMANDE che sbucano appena apri ("Cerchi comandi?", "Cerchi la moderazione?"...). Naviga
// riusando il router dell'app (window.SB_APP.vai). Zero dipendenze; i18n dall'app.
(function () {
  'use strict';

  function L(it, en, es) { try { return window.SB_APP.L(it, en, es); } catch (e) { return it; } }
  function esc(s) { try { return window.SB_APP.esc(String(s)); } catch (e) { return String(s == null ? '' : s); } }

  // parole chiave GENEROSE per scheda: così "ban", "monete", "spotify"... trovano la sezione giusta.
  var CHIAVI = {
    personalita: 'personalità carattere tono come parla stile prompt voce del bot indole',
    conoscenza: 'conoscenza sapere informazioni faq risposte curate cosa sa',
    memoria: 'memoria ricordi cervello storia conversazioni persone',
    avatar: 'avatar 3d mente grafo nodi cervello di lia plasticità appraisal essere',
    moduli: 'comandi command custom variabili trigger risposte automatiche !comando comando',
    ascolto: 'comandi vocali voce parlato speech ascolto microfono',
    regole: 'moderazione moderation ban timeout kick spam filtri parole vietate antibot follow-bot hate-raid sicurezza chat automod',
    giochi: 'giochi minigiochi classifiche monete punti coin economia leaderboard watchtime fedeltà rank',
    sondaggi: 'sondaggi predizioni poll prediction votazioni',
    giveaway: 'giveaway estrazione premi raffle sorteggio',
    penitenze: 'penitenze penalità punti canale sfide obbrobri',
    regia: 'regia diretta live comandi rapidi durante la diretta',
    clip: 'clip momenti highlight ritaglia',
    musica: 'musica spotify song request canzoni richieste brani',
    alert: 'overlay alert studio scena widget browser source obs allerte',
    effetti: 'effetti suoni audio sound sfx immagini video',
    emote: 'emote 7tv emoji faccine',
    pagina: 'pagina link bio linktree profilo vetrina sito',
    grafiche: 'grafiche immagini sfondi banner locandine',
    notifiche: 'notifiche social tiktok instagram youtube nuovi post',
    stato: 'stato account piano pacchetti panoramica',
    sottoscrizione: 'abbonamento subscription pagamento fattura rinnovo piano prezzo',
    admin: 'admin operatore llm modello ecosistema vita di lia anima backup salute'
  };

  // le DOMANDE che sbucano aprendo la lente → ognuna porta a una scheda.
  function DOMANDE() {
    return [
      ['🧩', L('Cerchi i comandi?', 'Looking for commands?', '¿Buscas los comandos?'), 'moduli'],
      ['🛡️', L('Cerchi le impostazioni di moderazione?', 'Looking for moderation settings?', '¿Buscas la moderación?'), 'regole'],
      ['🎭', L('Vuoi cambiare la personalità del bot?', 'Want to change the bot personality?', '¿Cambiar la personalidad del bot?'), 'personalita'],
      ['🎬', L('Vuoi creare un overlay?', 'Want to build an overlay?', '¿Crear un overlay?'), 'alert'],
      ['🎮', L('Cerchi giochi e classifiche?', 'Looking for games & leaderboards?', '¿Juegos y clasificaciones?'), 'giochi'],
      ['🎵', L('Vuoi impostare la musica?', 'Want to set up music?', '¿Configurar la música?'), 'musica']
    ];
  }

  // ── costruisce l'indice dalle sezioni reali dell'app (+ admin se sei tu) ──────────────
  function indice() {
    var A = window.SB_APP; if (!A) return [];
    var out = [], gruppi = (A.gruppi || []).slice();
    if (A.isAdmin && A.gruppoAdmin) gruppi.push(A.gruppoAdmin);
    gruppi.forEach(function (g) {
      var gnome = A.tGruppo(g.id, g.nome);
      (g.schede || []).forEach(function (s) {
        var id = s[0];
        if (A.schedaValida && !A.schedaValida(id)) return;
        out.push({
          id: id, label: A.tScheda(id, s[1]), gruppo: gnome, gruppoId: g.id,
          icona: A.icona(id) || '•', chiavi: (CHIAVI[id] || '') + ' ' + A.tScheda(id, s[1]).toLowerCase()
        });
      });
    });
    return out;
  }

  // ── scoring predittivo: prefisso > parola intera > sottosequenza. Generoso ma ordinato. ─
  function normal(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function punteggio(voce, q) {
    if (!q) return 0;
    var lab = normal(voce.label), ch = normal(voce.chiavi), sc = 0;
    var tok = q.split(/\s+/).filter(Boolean);
    for (var i = 0; i < tok.length; i++) {
      var t = tok[i];
      if (lab.startsWith(t)) sc += 60;
      else if (lab.indexOf(t) >= 0) sc += 34;
      else if (new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(ch)) sc += 22;
      else if (ch.indexOf(t) >= 0) sc += 12;
      else if (sottoseq(lab, t)) sc += 6;
      else return -1;   // un token che non aggancia nulla → scarta
    }
    return sc;
  }
  function sottoseq(testo, q) { var j = 0; for (var i = 0; i < testo.length && j < q.length; i++) if (testo[i] === q[j]) j++; return j === q.length; }
  function evidenzia(label, q) {
    var tok = (q || '').split(/\s+/).filter(Boolean).map(normal).sort(function (a, b) { return b.length - a.length; });
    var nl = normal(label), fatto = label;
    for (var i = 0; i < tok.length; i++) {
      var k = nl.indexOf(tok[i]);
      if (k >= 0) { fatto = esc(label.slice(0, k)) + '<mark>' + esc(label.slice(k, k + tok[i].length)) + '</mark>' + esc(label.slice(k + tok[i].length)); return fatto; }
    }
    return esc(label);
  }

  // ── UI ────────────────────────────────────────────────────────────────────────────────
  var ov, inp, lista, filtriBox, filtro = '', sel = 0, correnti = [];
  function costruisci() {
    var lancia = document.createElement('button');
    lancia.id = 'cerca-lancia'; lancia.type = 'button';
    lancia.setAttribute('aria-label', L('Cerca tutto', 'Search everything', 'Buscar todo'));
    lancia.innerHTML = '🔍';
    lancia.addEventListener('click', apri);
    document.body.appendChild(lancia);

    ov = document.createElement('div'); ov.id = 'cerca-overlay';
    ov.innerHTML =
      '<div class="cerca-box" role="dialog" aria-modal="true">' +
        '<div class="cerca-top"><span class="lente">🔍</span>' +
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
    inp.addEventListener('input', function () { sel = 0; disegna(); });
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
      // niente scritto: le DOMANDE che sbucano + le sezioni del filtro
      var dd = DOMANDE().filter(function (d) { return !filtro || (indice().find(function (v) { return v.id === d[2]; }) || {}).gruppoId === filtro; });
      var hs = '<div class="cerca-sugg-tit">' + esc(L('Cosa cerchi?', 'What are you looking for?', '¿Qué buscas?')) + '</div><div class="cerca-sugg">';
      dd.forEach(function (d, i) { hs += '<button class="chip-domanda" data-id="' + esc(d[2]) + '" style="--an-ritardo:' + (i * 45) + 'ms"><span class="em">' + d[0] + '</span>' + esc(d[1]) + '</button>'; });
      hs += '</div>';
      correnti = tutto;
      hs += righe(tutto, '', L('Tutte le sezioni', 'All sections', 'Todas las secciones'));
      lista.innerHTML = hs;
      aggancia();
      return;
    }
    var res = tutto.map(function (v) { return { v: v, s: punteggio(v, q) }; })
      .filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .map(function (x) { return x.v; });
    correnti = res;
    lista.innerHTML = res.length ? righe(res, q, '') :
      '<div class="cerca-vuoto">' + esc(L('Niente per «', 'Nothing for “', 'Nada para «')) + esc(inp.value) + esc(L('». Prova un\'altra parola.', '”. Try another word.', '». Prueba otra palabra.')) + '</div>';
    aggancia();
  }

  function righe(arr, q, titolo) {
    var h = titolo ? '<div class="cerca-sugg-tit">' + esc(titolo) + '</div>' : '';
    h += '<div class="cerca-lista">';
    arr.forEach(function (v, i) {
      h += '<div class="cerca-voce' + (i === sel ? ' sel' : '') + '" data-id="' + esc(v.id) + '" data-i="' + i + '" style="--an-ritardo:' + Math.min(i, 10) * 28 + 'ms">' +
        '<span class="ico">' + v.icona + '</span>' +
        '<span class="txt"><b>' + evidenzia(v.label, q) + '</b><small>' + esc(v.gruppo) + '</small></span>' +
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
    filtri(); ov.classList.add('aperto'); disegna();
    setTimeout(function () { inp.value = ''; inp.focus(); }, 30);
    document.addEventListener('keydown', globali, true);
  }
  function chiudi() { if (ov) ov.classList.remove('aperto'); document.removeEventListener('keydown', globali, true); }
  function globali(e) { /* nulla: i tasti dentro l'input bastano */ }

  // scorciatoie globali: ⌘K / Ctrl+K, e "/" quando non stai scrivendo altrove
  function scorciatoie(e) {
    var k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); ov && ov.classList.contains('aperto') ? chiudi() : apri(); return; }
    if (k === '/' && !ov.classList.contains('aperto')) {
      var t = e.target, tag = (t && t.tagName || '').toLowerCase();
      if (tag !== 'input' && tag !== 'textarea' && !(t && t.isContentEditable)) { e.preventDefault(); apri(); }
    }
  }

  function avvia() {
    if (!window.SB_APP) { window.addEventListener('sb-app-pronta', avvia, { once: true }); return; }
    if (document.getElementById('cerca-lancia')) return;
    costruisci();
    document.addEventListener('keydown', scorciatoie);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
