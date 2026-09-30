// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';

  var EN = 'en_us';
  var MAX_TESTA = 256 * 1024;
  var MAX_PEZZO = 1024 * 1024;
  var MAX_JAR = 12;
  var MAX_INDICI = 12;
  var MAX_LINGUA = 8 * 1024 * 1024;
  var SEGNO = 256;

  function lingua(testo) {
    var m = /^lang:([a-z]{2,3}_[a-z0-9]{2,4})[ \t\r]*$/im.exec(String(testo == null ? '' : testo));
    return m ? m[1].toLowerCase() : EN;
  }

  function frasiMorte(dati) {
    var o = dati && typeof dati === 'object' ? dati : {};
    return Object.keys(o).filter(function (k) { return /^death\./.test(k) && typeof o[k] === 'string'; })
      .map(function (k) { return o[k]; });
  }

  var SPECIALI = /[.*+?^${}()|[\]\\]/g;

  function espressione(frase) {
    var f = String(frase == null ? '' : frase);
    if (f.indexOf('%1$s') < 0) return null;
    var vista = false;
    var corpo = f.split(/(%%|%\d\$s|%s)/).map(function (p) {
      if (p === '%%') return '%';
      if (p === '%1$s') {
        if (vista) return '\\k<vittima>';
        vista = true;
        return '(?<vittima>.+?)';
      }
      if (/^%(\d\$)?s$/.test(p)) return '.+?';
      return p.replace(SPECIALI, '\\$&');
    }).join('');
    try { return new RegExp('^' + corpo + '$'); } catch (e) { return null; }
  }

  function rigaChat(riga) {
    var r = String(riga == null ? '' : riga).replace(/\r$/, '');
    var m = /\[CHAT\] (.*)$/.exec(r);
    if (!m) return null;
    var testo = m[1].replace(/§[0-9a-fk-or]/gi, '').trim();
    if (/\[System\] \[CHAT\] /.test(r)) return testo;
    if (/\[Not Secure\]/.test(r) || /^<[^>]+> /.test(testo)) return null;
    return testo;
  }

  function utente(testo) {
    var re = /Setting user: (\S+)/g;
    var u = null;
    var m;
    while ((m = re.exec(String(testo == null ? '' : testo)))) u = m[1];
    return u;
  }

  function eTua(vittima, nome) {
    if (!nome) return false;
    return String(vittima == null ? '' : vittima).trim().replace(/^(?:\[[^\]\n]*\]\s*)+/, '') === nome;
  }

  function morteDi(messaggio, espressioni, nome) {
    if (messaggio == null || !nome) return false;
    var lista = espressioni || [];
    for (var i = 0; i < lista.length; i++) {
      var m = lista[i].exec(messaggio);
      if (m && m.groups && eTua(m.groups.vittima, nome)) return true;
    }
    return false;
  }

  function u16(v, o) { return v.getUint16(o, true); }
  function u32(v, o) { return v.getUint32(o, true); }
  function u64(v, o) { return v.getUint32(o, true) + v.getUint32(o + 4, true) * 4294967296; }

  async function fondoZip(file) {
    var coda = Math.min(file.size, 65557);
    var b = new DataView(await file.slice(file.size - coda).arrayBuffer());
    var e = -1;
    for (var i = coda - 22; i >= 0; i--) { if (u32(b, i) === 0x06054b50) { e = i; break; } }
    if (e < 0) return null;
    var quante = u16(b, e + 10);
    var misura = u32(b, e + 12);
    var inizio = u32(b, e + 16);
    if (quante === 0xffff || misura === 0xffffffff || inizio === 0xffffffff) {
      var l = e - 20;
      if (l < 0 || u32(b, l) !== 0x07064b50) return null;
      var dove = u64(b, l + 8);
      var z = new DataView(await file.slice(dove, dove + 56).arrayBuffer());
      if (z.byteLength < 56 || u32(z, 0) !== 0x06064b50) return null;
      quante = u64(z, 32);
      misura = u64(z, 40);
      inizio = u64(z, 48);
    }
    return { quante: quante, misura: misura, inizio: inizio };
  }

  function uguali(a, da, b) {
    for (var i = 0; i < b.length; i++) if (a[da + i] !== b[i]) return false;
    return true;
  }

  async function cercaVoce(file, nome) {
    var f = await fondoZip(file);
    if (!f) return null;
    var buf = await file.slice(f.inizio, f.inizio + f.misura).arrayBuffer();
    var cd = new DataView(buf);
    var byte = new Uint8Array(buf);
    var cerca = new TextEncoder().encode(nome);
    var p = 0;
    for (var k = 0; k < f.quante && p + 46 <= cd.byteLength; k++) {
      if (u32(cd, p) !== 0x02014b50) return null;
      var ln = u16(cd, p + 28);
      var lx = u16(cd, p + 30);
      var lc = u16(cd, p + 32);
      if (ln === cerca.length && uguali(byte, p + 46, cerca)) {
        var v = { metodo: u16(cd, p + 10), comp: u32(cd, p + 20), dim: u32(cd, p + 24), loc: u32(cd, p + 42) };
        var x = p + 46 + ln;
        var fine = x + lx;
        while (x + 4 <= fine) {
          var id = u16(cd, x);
          var lung = u16(cd, x + 2);
          if (id === 0x0001) {
            var q = x + 4;
            if (v.dim === 0xffffffff) { v.dim = u64(cd, q); q += 8; }
            if (v.comp === 0xffffffff) { v.comp = u64(cd, q); q += 8; }
            if (v.loc === 0xffffffff) { v.loc = u64(cd, q); }
          }
          x += 4 + lung;
        }
        return v;
      }
      p += 46 + ln + lx + lc;
    }
    return null;
  }

  async function leggiVoce(file, v) {
    if (!v || v.dim > MAX_LINGUA) return null;
    var h = new DataView(await file.slice(v.loc, v.loc + 30).arrayBuffer());
    if (h.byteLength < 30 || u32(h, 0) !== 0x04034b50) return null;
    var da = v.loc + 30 + u16(h, 26) + u16(h, 28);
    var pezzo = file.slice(da, da + v.comp);
    if (v.metodo === 0) return pezzo.text();
    if (v.metodo !== 8 || typeof DecompressionStream !== 'function') return null;
    return new Response(pezzo.stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  }

  async function testoDaJar(file, voce) {
    try { return await leggiVoce(file, await cercaVoce(file, voce)); } catch (e) { return null; }
  }

  async function dentro(dir, via) {
    var h = dir;
    for (var i = 0; i < via.length; i++) {
      if (!h) return null;
      try { h = await h.getDirectoryHandle(via[i]); } catch (e) { return null; }
    }
    return h;
  }

  async function prendi(dir, via) {
    var d = await dentro(dir, via.slice(0, -1));
    if (!d) return null;
    try { return await (await d.getFileHandle(via[via.length - 1])).getFile(); } catch (e) { return null; }
  }

  async function figli(dir, tipo) {
    var fuori = [];
    if (!dir || typeof dir.entries !== 'function') return fuori;
    try {
      for await (var coppia of dir.entries()) { if (coppia[1].kind === tipo) fuori.push(coppia); }
    } catch (e) { return fuori; }
    return fuori;
  }

  var recenti = function (lista, quanti) {
    return lista.sort(function (a, b) { return b.lastModified - a.lastModified; }).slice(0, quanti);
  };

  async function jarDi(radice) {
    var jar = [];
    var coppie = await figli(await dentro(radice, ['versions']), 'directory');
    for (var i = 0; i < coppie.length; i++) {
      try { jar.push(await (await coppie[i][1].getFileHandle(coppie[i][0] + '.jar')).getFile()); } catch (e) { }
    }
    var lib = await figli(await dentro(radice, ['libraries', 'com', 'mojang', 'minecraft']), 'directory');
    for (var j = 0; j < lib.length; j++) {
      try { jar.push(await (await lib[j][1].getFileHandle('minecraft-' + lib[j][0] + '-client.jar')).getFile()); } catch (e) { }
    }
    return recenti(jar, MAX_JAR);
  }

  function dentroJson(testo, dove) {
    try { dove(JSON.parse(testo)); } catch (e) { }
  }

  async function frasiDa(radice, lng) {
    var en = new Set();
    var sua = new Set();
    var jar = await jarDi(radice);
    for (var i = 0; i < jar.length; i++) {
      var t = await testoDaJar(jar[i], 'assets/minecraft/lang/' + EN + '.json');
      if (t) dentroJson(t, function (o) { frasiMorte(o).forEach(function (f) { en.add(f); }); });
    }
    if (lng !== EN) {
      var visti = new Set();
      var indici = [];
      var coppie = await figli(await dentro(radice, ['assets', 'indexes']), 'file');
      for (var k = 0; k < coppie.length; k++) {
        if (!/\.json$/.test(coppie[k][0])) continue;
        try { indici.push(await coppie[k][1].getFile()); } catch (e) { }
      }
      indici = recenti(indici, MAX_INDICI);
      for (var n = 0; n < indici.length; n++) {
        var hash = '';
        dentroJson(await indici[n].text(), function (o) {
          var voce = o && o.objects && o.objects['minecraft/lang/' + lng + '.json'];
          hash = voce && /^[0-9a-f]{40}$/.test(voce.hash) ? voce.hash : '';
        });
        if (!hash || visti.has(hash)) continue;
        visti.add(hash);
        var f = await prendi(radice, ['assets', 'objects', hash.slice(0, 2), hash]);
        if (f && f.size <= MAX_LINGUA) dentroJson(await f.text(), function (o) { frasiMorte(o).forEach(function (x) { sua.add(x); }); });
      }
    }
    return { en: Array.from(en), sua: Array.from(sua) };
  }

  function lettore() {
    return { offset: null, mezza: false, segno: '', nome: null, lingua: EN, frasiEn: 0, frasiSue: 0, espressioni: [], opzioni: '', morti: 0 };
  }

  async function prepara(st, gioco, risorse) {
    var opz = await prendi(gioco, ['options.txt']);
    var visto = opz ? opz.lastModified + ':' + opz.size : '-';
    if (visto === st.opzioni && st.espressioni.length) return;
    st.lingua = opz ? lingua(await opz.text()) : EN;
    var fr = await frasiDa(gioco, st.lingua);
    if (!fr.en.length && !fr.sua.length && risorse) fr = await frasiDa(risorse, st.lingua);
    st.frasiEn = fr.en.length;
    st.frasiSue = fr.sua.length;
    var tutte = Array.from(new Set(fr.sua.concat(fr.en)));
    st.espressioni = tutte.map(espressione).filter(Boolean);
    st.opzioni = visto;
  }

  var aCapo = function (byte) {
    for (var i = byte.length - 1; i >= 0; i--) if (byte[i] === 10) return i;
    return -1;
  };

  async function giro(st, gioco) {
    var log = await prendi(gioco, ['logs', 'latest.log']);
    if (!log) return 'registro';
    var testa = await log.slice(0, SEGNO).text();
    var segno = testa.indexOf('\n') >= 0 ? testa.slice(0, testa.indexOf('\n')) : '';
    var nuovo = st.offset !== null && (log.size < st.offset || (!!segno && !!st.segno && segno !== st.segno));
    if (st.offset === null || nuovo) {
      st.nome = utente(await log.slice(0, Math.min(log.size, MAX_TESTA)).text());
      st.mezza = false;
      if (nuovo) st.offset = 0;
      else {
        var ultimo = new Uint8Array(await log.slice(Math.max(0, log.size - 1), log.size).arrayBuffer());
        st.offset = log.size;
        st.mezza = log.size > 0 && ultimo[0] !== 10;
      }
    }
    if (segno) st.segno = segno;
    while (st.offset < log.size) {
      var byte = new Uint8Array(await log.slice(st.offset, Math.min(log.size, st.offset + MAX_PEZZO)).arrayBuffer());
      var fine = aCapo(byte);
      if (fine < 0) {
        if (byte.length >= MAX_PEZZO) { st.offset += byte.length; st.mezza = true; continue; }
        break;
      }
      st.offset += fine + 1;
      var righe = new TextDecoder('utf-8').decode(byte.subarray(0, fine)).split('\n');
      if (st.mezza) { righe.shift(); st.mezza = false; }
      for (var i = 0; i < righe.length; i++) {
        if (morteDi(rigaChat(righe[i]), st.espressioni, st.nome)) st.morti += 1;
      }
    }
    if (!st.espressioni.length) return 'frasi';
    if (!st.nome) return 'nome';
    return 'legge';
  }

  window.SB_MINECRAFT = {
    lingua: lingua, frasiMorte: frasiMorte, espressione: espressione, rigaChat: rigaChat, utente: utente,
    morteDi: morteDi, cercaVoce: cercaVoce, leggiVoce: leggiVoce, frasiDa: frasiDa,
    lettore: lettore, prepara: prepara, giro: giro, EN: EN,
  };
})();
