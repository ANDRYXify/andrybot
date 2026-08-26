// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';

  function L(it, en, es) { try { return window.SB_APP.L(it, en, es); } catch (e) { return it; } }
  function esc(s) { try { return window.SB_APP.esc(String(s)); } catch (e) { return String(s == null ? '' : s); } }

  var SVG_LENTE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.7"></circle><line x1="20.5" y1="20.5" x2="15.6" y2="15.6"></line></svg>';

  var CHIAVI = {
    personalita: 'personalità carattere tono come parla stile prompt voce del bot indole descrizione personality character tone personalidad',
    conoscenza: 'conoscenza sapere informazioni faq risposte curate cosa sa insegna knowledge teach conocimiento enseñar',
    memoria: 'memoria ricordi cervello storia conversazioni persone statistiche memory remember memoria recuerdos',
    avatar: 'avatar 3d mente grafo nodi cervello di lia plasticità appraisal essere coscienza mind brain mente',
    moduli: 'comandi command custom variabili trigger risposte automatiche contatori comando commands comandos automazioni macro alias',
    ascolto: 'comandi vocali voce parlato speech ascolto microfono a voce voice mic dettatura comandos de voz micrófono',
    regole: 'moderazione moderation ban timeout kick spam filtri parole vietate link maiuscole flood automod chat pulita silenzia silenziare muta mute banna bannare espelli caps blacklist parolacce insulti moderación silenciar expulsar',
    scudo: 'scudo anti-bot antibot blocca bot segnalazioni registro interventi follow-bot follow bot hate-raid raid banna sospetti pulizia follower blocklist allowlist lista bot commanderroot sery_bot certezza shield protezione difesa attacco escudo protección',
    giochi: 'giochi minigiochi classifiche monete punti coin economia leaderboard ore guardate watchtime fedeltà rank vip games juegos clasificación monedas livelli',
    sondaggi: 'sondaggi predizioni poll prediction votazioni voto encuestas predicciones votar',
    giveaway: 'giveaway estrazione premi raffle sorteggio vincitori concorso sorteo premios',
    penitenze: 'penitenze penalità punti canale sfide riscatti contatore morti forfeit castigos retos muertes',
    regia: 'regia diretta live comandi rapidi durante la diretta titolo categoria pubblicità stream directo título anuncios',
    clip: 'clip momenti highlight ritaglia registra clips momentos grabar',
    musica: 'musica spotify song request canzoni richieste brani coda music playlist canciones cola dj',
    alert: 'overlay alert studio scena widget browser source obs allerte follow sub bit raid chat a schermo emote 7tv avvisi notifica a schermo layout editor livelli sovrimpressione escena capa aviso',
    effetti: 'effetti suoni audio sound sfx immagini video premi punti canale efectos sonidos',
    emote: 'emote 7tv emoji faccine emoticon emotes',
    pagina: 'pagina link bio linktree profilo vetrina sito i miei link logo avatar página enlaces',
    grafiche: 'grafiche immagini sfondi banner locandine social gráficos fondos imágenes',
    notifiche: 'notifiche social tiktok instagram youtube discord telegram nuovi post avvisi live gruppo canale topic notificaciones avisos',
    stato: 'stato account piano pacchetti panoramica permessi status cuenta plan',
    sottoscrizione: 'abbonamento subscription pagamento fattura rinnovo piano prezzo pacchetti costo carta suscripción pago precio',
    admin: 'admin operatore llm modello ecosistema vita di lia anima backup salute'
  };

  var FERMA = {};
  ('il lo la i gli le un uno una di a da in con su per tra fra del della dei delle al alla ai alle dal dalla nel nella sul sulla e ed o oppure ma se come cosa dove quando quale quali chi che cui non piu meno molto poco tutto tutti voglio vorrei posso puoi devo fare faccio fai metti metto mettere aggiungere aggiungo togliere tolgo tolto dove sta si puo serve mi ti ci vi ne c e ho hai ha abbiamo avete hanno sono sei siamo siete essere avere qui qua li la questo questa quello quella cambio cambiare cambiarlo apro apri aprire cerco cercare trovo trovare uso usare usarlo dimmi mostrami portami vado andare andiamo qualcuno qualcosa '
   + 'the a an of to in on for with by from at as is are be am was were do does did how what where when which who that this these those i you he she it we they my your want need can could should would will just please help me my '
   + 'el la los las un una de a en con por para del al y o pero si como que donde cuando cual quien esto esta eso esa quiero puedo hacer poner anadir quitar necesito me te se nos os es son ser estar aqui alli este esa').split(/\s+/).forEach(function (w) { if (w) FERMA[w] = 1; });

  var SIN = [
    ['bot', 'robot', 'bots'],
    ['blocca', 'bloccare', 'banna', 'bannare', 'ban', 'block', 'bloquear', 'ferma', 'fermare', 'stop', 'espelli', 'kick', 'caccia', 'buttafuori'],
    ['silenzia', 'silenziare', 'muta', 'mutare', 'mute', 'timeout', 'zittire', 'silenciar'],
    ['moderazione', 'moderare', 'moderatore', 'moderation', 'moderar', 'automod', 'regole', 'regola'],
    ['spam', 'flood', 'inondazione', 'raffica'],
    ['raid', 'hateraid', 'incursione', 'attacco', 'attaccare', 'attack'],
    ['follow', 'follower', 'seguire', 'seguace', 'seguono', 'seguaci', 'sub', 'abbonato', 'subscriber', 'bit', 'bits'],
    ['overlay', 'sovrimpressione', 'schermo', 'scena', 'obs', 'streamlabs', 'streamelements', 'browsersource', 'layer', 'livello', 'capa'],
    ['alert', 'avviso', 'avvisi', 'allerta', 'notifica', 'notifiche', 'aviso', 'popup'],
    ['comando', 'comandi', 'command', 'commands', 'comandos', 'trigger', 'shortcut', 'scorciatoia', 'macro', 'alias'],
    ['musica', 'canzone', 'canzoni', 'brano', 'brani', 'song', 'songs', 'music', 'spotify', 'playlist', 'coda', 'dj'],
    ['clip', 'clips', 'spezzone', 'momento', 'momenti', 'highlight', 'registrare', 'registra'],
    ['voce', 'vocale', 'vocali', 'parlare', 'parlato', 'microfono', 'mic', 'voice', 'dettare', 'dettatura'],
    ['emote', 'emoji', 'faccina', 'faccine', 'emoticon', '7tv', 'bttv', 'ffz'],
    ['punti', 'punto', 'channelpoints', 'puntichannel', 'riscatto', 'riscatti', 'redeem', 'ricompensa', 'reward'],
    ['moneta', 'monete', 'coin', 'coins', 'economia', 'classifica', 'classifiche', 'leaderboard', 'punteggio', 'rank'],
    ['gioco', 'giochi', 'minigioco', 'minigiochi', 'game', 'games', 'juego', 'juegos'],
    ['sondaggio', 'sondaggi', 'poll', 'votazione', 'voto', 'votare', 'encuesta'],
    ['predizione', 'predizioni', 'prediction', 'scommessa', 'scommesse'],
    ['giveaway', 'estrazione', 'sorteggio', 'premio', 'premi', 'raffle', 'concorso', 'sorteo'],
    ['telegram', 'gruppo', 'canale', 'topic', 'chat'],
    ['discord', 'server'],
    ['instagram', 'ig', 'reel', 'reels', 'post'],
    ['tiktok', 'tik'],
    ['youtube', 'yt', 'video'],
    ['diretta', 'live', 'stream', 'streaming', 'directo', 'trasmissione', 'trasmettere'],
    ['personalita', 'carattere', 'tono', 'stile', 'indole', 'personality', 'personalidad', 'prompt'],
    ['memoria', 'ricordo', 'ricordi', 'ricordare', 'memory', 'remember', 'recuerdo'],
    ['conoscenza', 'sapere', 'imparare', 'insegnare', 'faq', 'knowledge', 'teach', 'conocimiento'],
    ['abbonamento', 'pagamento', 'pagare', 'prezzo', 'costo', 'fattura', 'rinnovo', 'carta', 'subscription', 'billing', 'suscripcion', 'piano', 'pacchetto', 'pacchetti'],
    ['pagina', 'link', 'bio', 'linktree', 'profilo', 'vetrina', 'sito', 'page'],
    ['sfondo', 'sfondi', 'immagine', 'immagini', 'grafica', 'grafiche', 'banner', 'locandina', 'background'],
    ['suono', 'suoni', 'audio', 'sound', 'sfx', 'effetto', 'effetti', 'sonido'],
    ['titolo', 'categoria', 'gioco', 'title', 'category'],
    ['scudo', 'protezione', 'difesa', 'sicurezza', 'shield', 'escudo', 'antibot'],
    ['avatar', 'mente', 'cervello', 'grafo', 'brain', 'mind'],
    ['ore', 'oreguardate', 'watchtime', 'fedelta', 'presenza'],
    ['penitenza', 'penitenze', 'penalita', 'castigo', 'sfida', 'forfeit'],
    ['configurare', 'impostare', 'impostazione', 'impostazioni', 'settare', 'setup', 'config', 'settings', 'ajustes', 'attivare', 'accendere', 'spegnere', 'disattivare']
  ];

  function normal(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s_]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  var CODE = [
    'zione', 'zioni', 'mento', 'menti', 'aggio', 'ndosi', 'arono', 'erono', 'irono',
    'ando', 'endo', 'ione', 'ioni', 'ment', 'ings', 'ance', 'ence',
    'are', 'ere', 'ire', 'ato', 'ata', 'ati', 'ate', 'ito', 'ita', 'iti', 'ite',
    'ing', 'ers', 'est', 'ies', 'ado', 'ada', 'ados', 'adas', 'ción', 'cion',
    'er', 'ed', 'es', 'os', 'as', 'ar', 'or', 'a', 'e', 'i', 'o', 's'
  ];
  function radice(w) {
    if (w.length < 5) return w;
    for (var i = 0; i < CODE.length; i++) {
      var c = CODE[i];
      if (w.length - c.length >= 4 && w.slice(-c.length) === c) return w.slice(0, w.length - c.length);
    }
    return w;
  }

  var SIN_MAPPA = null;
  function sinMappa() {
    if (SIN_MAPPA) return SIN_MAPPA;
    SIN_MAPPA = Object.create(null);
    for (var g = 0; g < SIN.length; g++) {
      var gruppo = SIN[g].map(function (w) { return radice(normal(w)); });
      for (var i = 0; i < gruppo.length; i++) {
        var k = gruppo[i];
        if (!k) continue;
        if (!SIN_MAPPA[k]) SIN_MAPPA[k] = Object.create(null);
        for (var j = 0; j < gruppo.length; j++) if (gruppo[j] && gruppo[j] !== k) SIN_MAPPA[k][gruppo[j]] = 1;
      }
    }
    return SIN_MAPPA;
  }
  function sinonimiDi(rad) {
    var m = sinMappa()[rad];
    return m ? Object.keys(m) : [];
  }

  var MEM_CHIAVE = 'sb-cerca-memoria';
  var MAX_Q = 240, MAX_PAROLE = 24;
  var _mem = null;
  function memoria() {
    if (_mem) return _mem;
    try {
      var raw = localStorage.getItem(MEM_CHIAVE);
      _mem = raw ? JSON.parse(raw) : null;
    } catch (e) { _mem = null; }
    if (!_mem || typeof _mem !== 'object') _mem = {};
    if (!_mem.q || typeof _mem.q !== 'object') _mem.q = {};
    if (!_mem.u || typeof _mem.u !== 'object') _mem.u = {};
    if (!_mem.p || typeof _mem.p !== 'object') _mem.p = {};
    return _mem;
  }
  var _salvaAttesa = null;
  function salvaMemoria() {
    if (_salvaAttesa) return;
    _salvaAttesa = setTimeout(function () {
      _salvaAttesa = null;
      try {
        var m = memoria();
        var chiavi = Object.keys(m.q);
        if (chiavi.length > MAX_Q) {
          chiavi.sort(function (a, b) { return (m.q[a]._t || 0) - (m.q[b]._t || 0); });
          for (var i = 0; i < chiavi.length - MAX_Q; i++) delete m.q[chiavi[i]];
        }
        localStorage.setItem(MEM_CHIAVE, JSON.stringify(m));
      } catch (e) {  }
    }, 400);
  }
  function chiaveQuery(rad) {
    return rad.slice().sort().join(' ');
  }
  function ricorda(radQuery, id) {
    var m = memoria();
    m.u[id] = (m.u[id] || 0) + 1;
    if (radQuery.length) {
      var k = chiaveQuery(radQuery);
      if (!m.q[k]) m.q[k] = {};
      m.q[k][id] = (m.q[k][id] || 0) + 1;
      m.q[k]._t = Date.now();
      if (!m.p[id]) m.p[id] = [];
      for (var i = 0; i < radQuery.length; i++) {
        if (m.p[id].indexOf(radQuery[i]) < 0) m.p[id].push(radQuery[i]);
      }
      if (m.p[id].length > MAX_PAROLE) m.p[id] = m.p[id].slice(m.p[id].length - MAX_PAROLE);
    }
    salvaMemoria();
  }

  function distanza(a, b, max) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    var prec2 = null, prec = new Array(lb + 1), cur, i, j;
    for (j = 0; j <= lb; j++) prec[j] = j;
    for (i = 1; i <= la; i++) {
      cur = new Array(lb + 1);
      cur[0] = i;
      var minRiga = i;
      for (j = 1; j <= lb; j++) {
        var costo = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        var v = Math.min(cur[j - 1] + 1, prec[j] + 1, prec[j - 1] + costo);
        if (prec2 && i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
          v = Math.min(v, prec2[j - 2] + 1);
        }
        cur[j] = v;
        if (v < minRiga) minRiga = v;
      }
      if (minRiga > max) return max + 1;
      prec2 = prec; prec = cur;
    }
    return prec[lb];
  }
  function tolleranza(w) { return w.length <= 3 ? 0 : w.length <= 5 ? 1 : 2; }

  function trigrammi(s) {
    var t = '  ' + s + ' ', out = Object.create(null);
    for (var i = 0; i < t.length - 2; i++) out[t.substr(i, 3)] = 1;
    return out;
  }
  function simInsiemi(ta, tb) {
    var com = 0, na = 0, nb = 0, k;
    for (k in ta) { na++; if (tb[k]) com++; }
    for (k in tb) nb++;
    return na + nb ? (2 * com) / (na + nb) : 0;
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
        out.push({ id: id, label: lab, gruppo: gnome, gruppoId: g.id, _base: true, icona: A.icona ? (A.icona(id) || '') : '', chiavi: (CHIAVI[id] || '') + ' ' + lab.toLowerCase() });
      });
    });
    return out;
  }

  function preparaVoce(v) {
    var m = memoria();
    v._lab = normal(v.label);
    var paroleLab = v._lab.split(' ').filter(Boolean);
    v._labR = paroleLab.map(radice);
    var testoCh = normal(v.chiavi + ' ' + (v.gruppo || '') + ' ' + (v.sotto || ''));
    var paroleCh = testoCh.split(' ').filter(Boolean);
    v._chR = paroleCh.map(radice);
    v._forma = Object.create(null);
    paroleLab.concat(paroleCh).forEach(function (w) {
      var r = radice(w);
      if (!v._forma[r] || w.length < v._forma[r].length) v._forma[r] = w;
    });
    v._app = (m.p[v.id] || []).slice();
    v._tutto = v._lab + ' ' + testoCh;
    v._set = Object.create(null);
    var i;
    for (i = 0; i < v._labR.length; i++) v._set[v._labR[i]] = 3;
    for (i = 0; i < v._chR.length; i++) if (!v._set[v._chR[i]]) v._set[v._chR[i]] = 1;
    for (i = 0; i < v._app.length; i++) v._set[v._app[i]] = Math.max(v._set[v._app[i]] || 0, 2);
    v._triLab = trigrammi(v._lab);
    if (v._base) v._triTut = trigrammi(v._tutto.slice(0, 400));
    return v;
  }

  function indice() {
    if (_cache) return _cache;
    var base = baseIndice();
    if (!base.length) return [];
    var extra = _dyn.filter(function (v) { return !window.SB_APP || !window.SB_APP.schedaValida || window.SB_APP.schedaValida(v.id); });
    _cache = base.concat(extra).map(preparaVoce);
    _cache._vocab = Object.create(null);
    _cache._forma = Object.create(null);
    for (var i = 0; i < _cache.length; i++) {
      for (var w in _cache[i]._set) if (w.length > 2) _cache._vocab[w] = 1;
      var f = _cache[i]._forma;
      for (var r2 in f) if (!_cache._forma[r2] || f[r2].length < _cache._forma[r2].length) _cache._forma[r2] = f[r2];
    }
    _cache._parole = Object.keys(_cache._vocab);
    _cache._ceste = Object.create(null);
    for (var pi = 0; pi < _cache._parole.length; pi++) {
      var pw = _cache._parole[pi], ck = pw.charAt(0) + ':' + pw.length;
      (_cache._ceste[ck] || (_cache._ceste[ck] = [])).push(pw);
    }
    _cache._basi = _cache.filter(function (x) { return x._base; });
    return _cache;
  }

  function tokenizza(q) {
    var grezzi = normal(q).split(' ').filter(Boolean);
    var utili = grezzi.filter(function (w) { return !FERMA[w] && w.length > 1; });
    if (!utili.length) utili = grezzi.filter(function (w) { return w.length > 1; });
    if (!utili.length) utili = grezzi;
    return { grezzi: grezzi, utili: utili, rad: utili.map(radice) };
  }

  function correggi(rad, ceste) {
    if (!rad || rad.length < 3) return null;
    var max = tolleranza(rad);
    if (!max) return null;
    var best = null, bestD = max + 1, lettera = rad.charAt(0);
    for (var dl = -max; dl <= max; dl++) {
      var gruppo = ceste[lettera + ':' + (rad.length + dl)];
      if (!gruppo) continue;
      for (var i = 0; i < gruppo.length; i++) {
        var p = gruppo[i];
        var d = distanza(rad, p, max);
        if (d < bestD || (d === bestD && best && p.length < best.length)) { bestD = d; best = p; }
        if (bestD === 1) break;
      }
      if (bestD === 1) break;
    }
    return best && bestD <= max ? { parola: best, d: bestD } : null;
  }

  function cerca(q, insieme) {
    var t = tokenizza(q);
    if (!t.rad.length) return { voci: insieme, extra: [], corretto: null, ripiego: false, rad: [] };
    var ind = indice();
    var ceste = ind._ceste || {};
    var correzioni = {};
    var espansi = t.rad.map(function (r) {
      var e = [{ w: r, f: 1 }];
      var sin = sinonimiDi(r);
      for (var i = 0; i < sin.length; i++) e.push({ w: sin[i], f: 0.62 });
      return e;
    });

    for (var i = 0; i < t.rad.length; i++) {
      var r = t.rad[i];
      if (ind._vocab && ind._vocab[r]) continue;
      if (sinonimiDi(r).length) continue;
      var c = correggi(r, ceste);
      if (c) {
        correzioni[t.utili[i]] = c.parola;
        espansi[i].push({ w: c.parola, f: c.d === 1 ? 0.55 : 0.4 });
        var sin2 = sinonimiDi(c.parola);
        for (var k = 0; k < sin2.length; k++) espansi[i].push({ w: sin2[k], f: 0.35 });
      }
    }

    var m = memoria();
    var kq = chiaveQuery(t.rad);
    var appreseQ = m.q[kq] || null;

    var out = [];
    for (var vi = 0; vi < insieme.length; vi++) {
      var v = insieme[vi];
      var tot = 0, presi = 0;
      for (var ti = 0; ti < espansi.length; ti++) {
        var meglio = 0;
        var lista2 = espansi[ti];
        for (var ei = 0; ei < lista2.length; ei++) {
          var w = lista2[ei].w, f = lista2[ei].f, p = 0;
          var peso = v._set[w];
          if (peso) p = peso === 3 ? 100 : peso === 2 ? 88 : 34;
          else if (v._lab.indexOf(w) === 0) p = 70;
          else if (v._lab.indexOf(w) >= 0) p = 46;
          else if (v._tutto.indexOf(w) >= 0) p = 18;
          if (p * f > meglio) meglio = p * f;
        }
        if (meglio > 0) { tot += meglio; presi++; }
      }
      if (!tot) continue;
      var copertura = presi / espansi.length;
      var punti = tot * (0.42 + 0.58 * copertura);
      if (appreseQ && appreseQ[v.id]) punti += 60 + Math.min(appreseQ[v.id], 6) * 22;
      punti += Math.min(m.u[v.id] || 0, 10) * 2.4;
      out.push({ v: v, s: punti, c: copertura });
    }

    out.sort(function (a, b) { return b.s - a.s || a.v.label.length - b.v.label.length; });

    var qn = normal(q);
    var triQ = trigrammi(qn);
    var vicine = function (esclusi, quante) {
      var basi = (ind._basi || []).filter(function (x) { return insieme.indexOf(x) >= 0; });
      var pozzo = basi.length ? basi : insieme.slice(0, 300);
      return pozzo.filter(function (x) { return esclusi.indexOf(x.id) < 0; }).map(function (x) {
        return { v: x, s: simInsiemi(triQ, x._triLab) * 100 + (x._triTut ? simInsiemi(triQ, x._triTut) * 26 : 0) + Math.min(m.u[x.id] || 0, 10) * 2.6, c: 0 };
      }).sort(function (a, b) { return b.s - a.s; }).slice(0, quante);
    };

    var ripiego = false;
    if (!out.length) {
      ripiego = true;
      out = vicine([], 60);
    }

    var voci = out.slice(0, 60).map(function (x) { return x.v; });

    var forza = out.length ? out[0].s : 0;
    var debole = ripiego || !out.length || forza < 30 || (out[0].c < 0.6 && forza < 70);
    var extra = [];
    if (debole && !ripiego) {
      extra = vicine(voci.map(function (v) { return v.id; }), 6).map(function (x) { return x.v; });
    }

    var parolaCorretta = Object.keys(correzioni)[0] || null;
    var formaVera = parolaCorretta ? ((ind._forma && ind._forma[correzioni[parolaCorretta]]) || correzioni[parolaCorretta]) : null;
    if (formaVera === parolaCorretta) { parolaCorretta = null; formaVera = null; }
    return {
      voci: voci,
      extra: extra,
      forza: Math.round(forza),
      evid: t.rad.concat(Object.keys(correzioni).map(function (k) { return correzioni[k]; })),
      corretto: parolaCorretta ? { da: parolaCorretta, a: formaVera } : null,
      ripiego: ripiego,
      rad: t.rad
    };
  }

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

  function evidenzia(label, rad) {
    if (!rad || !rad.length) return esc(label);
    var nl = normal(label);
    var ord = rad.slice().sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < ord.length; i++) {
      if (ord[i].length < 2) continue;
      var k = nl.indexOf(ord[i]);
      if (k >= 0) {
        var fine = k + ord[i].length;
        while (fine < nl.length && /[a-z0-9]/.test(nl[fine])) fine++;
        return esc(label.slice(0, k)) + '<mark>' + esc(label.slice(k, fine)) + '</mark>' + esc(label.slice(fine));
      }
    }
    return esc(label);
  }

  var ov, inp, lista, filtriBox, filtro = '', sel = 0, correnti = [], _deb = null, _radAttuali = [];

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
            esc(L('Chiedi come ti viene… «come blocco i bot», «alert su obs»', 'Ask however you like… “how do I block bots”, “alerts on obs”', 'Pregunta como quieras… «cómo bloqueo los bots», «avisos en obs»')) + '">' +
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

  function piuUsate(tutto, quante) {
    var m = memoria();
    return tutto.filter(function (v) { return m.u[v.id]; })
      .sort(function (a, b) { return (m.u[b.id] || 0) - (m.u[a.id] || 0); })
      .slice(0, quante);
  }

  function disegna() {
    var testo = inp.value.trim();
    var tutto = indice().filter(function (v) { return !filtro || v.gruppoId === filtro; });

    if (!testo) {
      _radAttuali = [];
      var hs = '';
      var usate = piuUsate(tutto, 5);
      if (usate.length) {
        correnti = usate.concat(tutto.filter(function (v) { return usate.indexOf(v) < 0; }));
        hs += righe(usate, [], L('Dove torni più spesso', 'Where you go most', 'Donde vuelves más'));
      } else {
        correnti = tutto;
      }
      var dd = DOMANDE().filter(function (d) { return !filtro || (indice().find(function (v) { return v.id === d[1]; }) || {}).gruppoId === filtro; });
      if (dd.length) {
        hs += '<div class="cerca-sugg-tit">' + esc(L('Cosa cerchi?', 'What are you looking for?', '¿Qué buscas?')) + '</div><div class="cerca-sugg">';
        dd.forEach(function (d, i) { hs += '<button class="chip-domanda" data-id="' + esc(d[1]) + '" style="--an-ritardo:' + (i * 45) + 'ms"><span class="pip"></span>' + esc(d[0]) + '</button>'; });
        hs += '</div>';
      }
      var resto = usate.length ? tutto.filter(function (v) { return usate.indexOf(v) < 0; }) : tutto;
      hs += righe(resto, [], L('Tutte le sezioni', 'All sections', 'Todas las secciones'), usate.length);
      lista.innerHTML = hs;
      aggancia();
      return;
    }

    var r = cerca(testo, tutto);
    _radAttuali = r.rad || [];
    var evid = r.evid || _radAttuali;
    correnti = r.voci;
    var h = '';
    if (r.corretto) {
      h += '<div class="cerca-forse">' + esc(L('Cerco anche', 'Also searching', 'Busco también')) +
        ' <b>' + esc(r.corretto.a) + '</b> ' + esc(L('al posto di', 'instead of', 'en vez de')) +
        ' <i>' + esc(r.corretto.da) + '</i></div>';
    }
    if (r.ripiego) {
      h += '<div class="cerca-forse">' + esc(L('Niente di esatto per «', 'Nothing exact for “', 'Nada exacto para «')) +
        esc(testo) + esc(L('». Quello che ci somiglia di più:', '”. The closest matches:', '». Lo más parecido:')) + '</div>';
    }
    h += righe(r.voci, evid, '');
    if (r.extra && r.extra.length) {
      h += righe(r.extra, [], L('Forse invece cercavi', 'Maybe you meant', 'Quizás buscabas'), r.voci.length);
      correnti = r.voci.concat(r.extra);
    }
    lista.innerHTML = h;
    aggancia();
  }

  function righe(arr, rad, titolo, offset) {
    var base = offset || 0;
    var h = titolo ? '<div class="cerca-sugg-tit">' + esc(titolo) + '</div>' : '';
    h += '<div class="cerca-lista">';
    arr.forEach(function (v, i) {
      var idx = base + i;
      h += '<div class="cerca-voce' + (idx === sel ? ' sel' : '') + '" data-id="' + esc(v.id) + '" data-i="' + idx + '" style="--an-ritardo:' + Math.min(i, 10) * 28 + 'ms">' +
        '<span class="pip"></span>' +
        '<span class="txt"><b>' + evidenzia(v.label, rad) + '</b><small>' + esc(v.gruppo) + (v.sotto ? ' · ' + esc(v.sotto) : '') + '</small></span>' +
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

  function vai(id) {
    try { ricorda(_radAttuali, id); } catch (e) {  }
    invalida();
    chiudi();
    try { window.SB_APP.vai(id); } catch (e) { location.hash = '#' + id; }
  }

  function apri() {
    if (!ov) return;
    filtro = ''; sel = 0; _radAttuali = []; inp.value = '';
    filtri(); ov.classList.add('aperto'); document.body.classList.add('cerca-aperta'); disegna();
    setTimeout(function () { inp.focus(); }, 30);
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
      if (_dyn.length > 3000) _dyn = _dyn.slice(_dyn.length - 3000);
      invalida();
    },
    pulisci: function (tag) { _dyn = tag ? _dyn.filter(function (v) { return v.tag !== tag; }) : []; invalida(); },
    invalida: invalida,
    _motore: { normal: normal, radice: radice, tokenizza: tokenizza, cerca: cerca, distanza: distanza, sinonimiDi: sinonimiDi, ricorda: ricorda, memoria: memoria, preparaVoce: preparaVoce, CHIAVI: CHIAVI }
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
