// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';

  var VOLO = 650, PASSO_RAFFICA = 140, DOPO = 450, SFUMA = 800;
  var GIRO = Math.PI * 2;

  function semeDi(testo) {
    var h = 2166136261 >>> 0, s = String(testo || '');
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h || 1;
  }
  function generatore(seme) {
    var x = (seme >>> 0) || 1;
    return function () {
      x = (x + 0x6D2B79F5) >>> 0;
      var t = Math.imul(x ^ (x >>> 15), 1 | x);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var fra = function (a, b, u) { return a + (b - a) * u; };
  var esci = function (u) { return 1 - (1 - u) * (1 - u); };
  var esciForte = function (u) { return 1 - Math.pow(1 - u, 3); };
  var molla = function (u) { var k = 1.70158; return 1 + (k + 1) * Math.pow(u - 1, 3) + k * Math.pow(u - 1, 2); };
  var tra = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  var immagini = {};
  function immagine(url) {
    if (!url) return Promise.resolve(null);
    if (!immagini[url]) immagini[url] = new Promise(function (ok) { var i = new Image(); i.decoding = 'async'; i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = url; });
    return immagini[url];
  }

  function tinta(img, colore) {
    var c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    var g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = colore; g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function animazione(strato, url, x, y, lato, opz) {
    if (!window.lottie || !url) return null;
    opz = opz || {};
    var ax = opz.ax != null ? opz.ax : 0.5, ay = opz.ay != null ? opz.ay : 0.5;
    var box = document.createElement('div');
    box.style.cssText = 'position:absolute;pointer-events:none;width:' + lato + 'px;height:' + lato + 'px;left:' + (x - lato * ax) + 'px;top:' + (y - lato * ay) + 'px;z-index:' + (opz.z || 1);
    if (opz.entra) { box.style.transform = 'scale(.2)'; box.style.transition = 'transform .22s cubic-bezier(.34,1.56,.64,1)'; }
    strato.appendChild(box);
    var an = window.lottie.loadAnimation({ container: box, renderer: 'svg', loop: false, autoplay: false, path: url });
    var finita = false;
    var via = function () { if (finita) return; finita = true; try { an.destroy(); } catch (e) {} box.remove(); if (opz.fine) opz.fine(); };
    an.addEventListener('DOMLoaded', function () {
      if (opz.entra) requestAnimationFrame(function () { box.style.transform = 'scale(1)'; });
      if (opz.da != null) an.playSegments([opz.da, opz.a], true);
      else if (opz.quota) an.playSegments([Math.round(an.totalFrames * opz.quota), an.totalFrames], true);
      else an.play();
    });
    an.addEventListener('complete', function () {
      if (opz.sfuma) { box.style.transition = 'opacity .35s'; box.style.opacity = '0'; setTimeout(via, 380); } else via();
    });
    an.addEventListener('data_failed', via);
    return via;
  }

  function cocci(c, w, h, quanti) {
    var out = [], tagli = [];
    for (var i = 0; i < quanti; i++) tagli.push((i + c() * 0.8) / quanti * GIRO);
    var lontano = Math.max(w, h) * 1.5, k = Math.max(w, h) / 180;
    for (var j = 0; j < quanti; j++) {
      var a0 = tagli[j], a1 = tagli[(j + 1) % quanti] + (j === quanti - 1 ? GIRO : 0), am = (a0 + a1) / 2;
      var v = fra(260, 620, c()) * k;
      out.push({ poli: [[0, 0], [Math.cos(a0) * lontano, Math.sin(a0) * lontano], [Math.cos(am) * lontano * 1.2, Math.sin(am) * lontano * 1.2], [Math.cos(a1) * lontano, Math.sin(a1) * lontano]],
        cx: Math.cos(am) * Math.min(w, h) * 0.28, cy: Math.sin(am) * Math.min(w, h) * 0.28, vx: Math.cos(am) * v, vy: Math.sin(am) * v - 280 * k, vr: (c() - 0.5) * 10, r: 0, t: 0, vita: fra(0.7, 1.1, c()), k: k });
    }
    return out;
  }

  function lancia(contenitore, ev, opz) {
    opz = opz || {};
    var L = ev && ev.lancio;
    if (!L) { if (opz.libera) opz.libera(); if (opz.fine) opz.fine(); return function () {}; }
    var W = contenitore.clientWidth || window.innerWidth, H = contenitore.clientHeight || window.innerHeight;
    var dpr = opz.dpr || Math.min(2, window.devicePixelRatio || 1);
    var scena = document.createElement('div');
    scena.className = 'lancio';
    scena.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:hidden';
    var tela = document.createElement('canvas');
    tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr);
    tela.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:2';
    scena.appendChild(tela);
    contenitore.appendChild(scena);
    var g = tela.getContext('2d');
    var c = generatore(opz.seme || semeDi(JSON.stringify([ev.comando, ev.attacco && ev.attacco.id])));
    var pos = ev.posizione && ev.posizione.x != null ? ev.posizione : null;
    var px = pos ? tra(Number(pos.x), 0, 100) / 100 * W : fra(0.25, 0.75, c()) * W;
    var py = pos ? tra(Number(pos.y), 0, 100) / 100 * H : fra(0.25, 0.7, c()) * H;
    var f = pos && pos.s ? Number(pos.s) / 100 : 1;
    var fermo = false, liberata = false, finito = false, impatti = [], togli = [], animazioni = 0;
    var libera = function () { if (liberata) return; liberata = true; if (opz.libera) opz.libera(); };
    var chiudi = function () {
      if (finito) return; finito = true; fermo = true;
      togli.forEach(function (t) { try { t(); } catch (e) {} });
      libera();
      scena.remove();
      if (opz.fine) opz.fine();
    };
    var suona = function (url) { if (url && opz.suona) { try { opz.suona(url); } catch (e) {} } };
    var segna = function (x, y, w, h) {
      impatti.push({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
      scena.dataset.impatti = JSON.stringify(impatti);
    };
    var colpito = function () { if (opz.colpito) { try { opz.colpito(); } catch (e) {} } };
    var anima = function (url, x, y, lato, o) {
      o = o || {};
      animazioni++;
      var fatta = false;
      o.fine = function () { if (!fatta) { fatta = true; animazioni--; } };
      var via = animazione(scena, url, x, y, lato, o);
      if (via) togli.push(via); else o.fine();
      return via;
    };

    Promise.all([immagine(L.sprite), immagine(L.pezzi), Promise.all((L.macchie || []).map(immagine)), Promise.all((L.fumi || []).map(immagine)), immagine(L.bruciatura), immagine(L.tuorlo && L.tuorlo.macchia)]).then(function (r) {
      if (finito) return;
      if (!r[0]) { if (opz.guaio) opz.guaio('il disegno non arriva: ' + L.sprite); chiudi(); return; }
      if (L.materiale === 'appare') appare(r[0]); else avvia(r[0], r[1], r[2].filter(Boolean), r[3].filter(Boolean), r[4], r[5]);
    });

    function appare(img) {
      var lato = Math.max(img.naturalWidth, img.naturalHeight) * f;
      segna(px, py, lato, lato);
      suona(L.suono);
      colpito();
      if (L.spavento) {
        var lampo = document.createElement('div');
        lampo.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;background:#fff;opacity:.85;z-index:4;transition:opacity .3s';
        scena.appendChild(lampo);
        requestAnimationFrame(function () { requestAnimationFrame(function () { lampo.style.opacity = '0'; }); });
      }
      if (!anima(L.animazione, px, py, lato, { z: 3, entra: true, sfuma: true, quota: L.posa || 0 })) { chiudi(); return; }
      setTimeout(libera, L.spavento ? 1800 : 1400);
      var guarda = setInterval(function () { if (!animazioni) { clearInterval(guarda); chiudi(); } }, 200);
      togli.push(function () { clearInterval(guarda); });
      var tetto = setTimeout(chiudi, 12000);
      togli.push(function () { clearTimeout(tetto); });
    }

    function avvia(img, pezzoImg, macchie, fumi, bruciatura, tonda) {
      var w = img.naturalWidth * f, h = img.naturalHeight * f, R = Math.max(w, h) / 2;
      var n = tra(Number(L.quanti) || 1, 1, 5), tiri = [], mat = L.materiale, resta = Number(L.resta) || 0;
      var colore0 = (L.colori && L.colori[0]) || '#cccccc', colore1 = (L.colori && L.colori[1]) || colore0, velo = Number(L.velo) || 1;
      for (var i = 0; i < n; i++) {
        var tx = px, ty = py;
        if (i > 0) { var an = c() * GIRO, d = R * fra(0.9, 1.7, c()); tx = tra(px + Math.cos(an) * d, w * 0.3, W - w * 0.3); ty = tra(py + Math.sin(an) * d, h * 0.3, H - h * 0.3); }
        var verso = tx < W / 2 ? 1 : -1;
        tiri.push({ i: i, da: i * PASSO_RAFFICA, tx: tx, ty: ty, sx: tx + verso * W * fra(0.12, 0.3, c()), sy: H + h * 1.4,
          giri: (c() < 0.5 ? -1 : 1) * fra(1.1, 2.2, c()), finale: (c() - 0.5) * 0.4, stato: 'volo', t: 0, colpo: 0,
          macchia: null, cocci: [], pezzi: [], fumi: [], vx: 0, vy: 0 });
      }
      var inizio = performance.now(), prima = inizio;
      var scegli = function (lista) { return lista[Math.floor(c() * lista.length)]; };

      function impatto(t) {
        t.stato = 'colpito'; t.colpo = t.t;
        segna(t.tx, t.ty, w, h);
        suona(L.suono);
        if (t.i === 0) colpito();
        if (t.i === n - 1) setTimeout(libera, DOPO);
        if (L.cocci) t.cocci = cocci(c, w, h, 6 + Math.floor(c() * 3));
        var imp = L.impatto;
        if ((mat === 'spiaccica' || mat === 'spruzza') && macchie.length) {
          var m = scegli(macchie);
          t.macchia = { sotto: tinta(m, colore1), sopra: tinta(m, colore0), lato: R * 2.5, rot: c() * GIRO, gocce: [] };
          for (var k2 = 0; k2 < 3; k2++) {
            var ag = c() * GIRO, dg = R * fra(1.4, 2, c());
            t.macchia.gocce.push({ img: tinta(scegli(macchie), colore0), x: Math.cos(ag) * dg, y: Math.sin(ag) * dg, lato: R * fra(0.25, 0.45, c()), rot: c() * GIRO });
          }
          if (L.tuorlo && tonda) t.macchia.tuorlo = { img: tinta(tonda, L.tuorlo.colore), lato: R * 0.8, rot: c() * GIRO };
          if (mat === 'spruzza' && imp) anima(imp.url, t.tx, t.ty, R * 4.4 * (L.grande ? 1.4 : 1), { ax: 0.5, ay: 0.72, z: 3, da: imp.da, a: imp.a });
        } else if (mat === 'rimbalza') {
          t.vx = (t.tx < W / 2 ? -1 : 1) * fra(120, 320, c()) * (R / 90);
          t.vy = -(L.elastico ? fra(950, 1250, c()) : fra(380, 620, c())) * (R / 90);
          if (imp) anima(imp.url, t.tx, t.ty, R * 2.6, { z: 1, da: imp.da, a: imp.a });
        } else if (mat === 'esplode') {
          var pz = L.piccolo ? 0.7 : 1;
          if (imp) anima(imp.url, t.tx, t.ty, R * 3.6 * pz, { z: 3, da: imp.da, a: imp.a });
          for (var q = 0; q < 5 && fumi.length; q++) {
            var af = c() * GIRO;
            t.fumi.push({ img: scegli(fumi), x: t.tx + Math.cos(af) * R * 0.4, y: t.ty + Math.sin(af) * R * 0.3, vx: Math.cos(af) * 30 * pz, vy: -fra(50, 90, c()) * pz, lato: R * fra(1.2, 1.8, c()) * pz, cresce: R * 0.6 * pz, rot: c() * GIRO, vr: (c() - 0.5) * 0.6, da: fra(0.15, 0.35, c()), vita: fra(1.6, 2.4, c()), t: 0 });
          }
          if (bruciatura) t.macchia = { brucia: tinta(bruciatura, '#1b120b'), lato: R * 2.4 * pz, rot: c() * GIRO };
        } else if (mat === 'scoppia') {
          if (imp) anima(imp.url, t.tx, t.ty, R * 3.2, { z: 3, da: imp.da, a: imp.a });
          if (pezzoImg) for (var p2 = 0; p2 < 14; p2++) {
            var ap = fra(-Math.PI * 0.95, -Math.PI * 0.05, c()), vp = fra(380, 900, c()) * (R / 90);
            t.pezzi.push({ x: t.tx, y: t.ty, vx: Math.cos(ap) * vp, vy: Math.sin(ap) * vp, lato: R * fra(0.35, 0.55, c()), r: c() * GIRO, vr: (c() - 0.5) * 8, t: 0, vita: fra(1.1, 1.7, c()), k: R / 90 });
          }
        }
      }

      function oggetto(x, y, s, r, sx, sy, a) {
        g.save();
        g.globalAlpha = a == null ? 1 : a;
        g.translate(x, y); g.rotate(r); g.scale(s * (sx || 1), s * (sy || 1));
        g.drawImage(img, -w / 2, -h / 2, w, h);
        g.restore();
      }
      function figura(im, x, y, lato, rot, a) {
        if (!im || a <= 0) return;
        var k = lato / Math.max(im.width, im.height);
        g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot);
        g.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k);
        g.restore();
      }
      function disegnaCocci(t, dt) {
        for (var i = 0; i < t.cocci.length; i++) {
          var q = t.cocci[i];
          q.t += dt;
          if (q.t >= q.vita) continue;
          q.vy += 2600 * q.k * dt; q.cx += q.vx * dt; q.cy += q.vy * dt; q.r += q.vr * dt;
          g.save();
          g.globalAlpha = tra((q.vita - q.t) / 0.3, 0, 1);
          g.translate(t.tx + q.cx, t.ty + q.cy); g.rotate(t.finale + q.r); g.scale(0.85, 0.85);
          g.beginPath(); g.moveTo(q.poli[0][0], q.poli[0][1]); for (var j = 1; j < q.poli.length; j++) g.lineTo(q.poli[j][0], q.poli[j][1]); g.closePath();
          g.clip();
          g.drawImage(img, -w / 2, -h / 2, w, h);
          g.restore();
        }
      }

      function passo(ora) {
        if (fermo) return;
        var dt = Math.min(0.05, (ora - prima) / 1000); prima = ora;
        var tutto = ora - inizio;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        var vivi = animazioni;
        for (var i = 0; i < tiri.length; i++) {
          var t = tiri[i];
          t.t = tutto - t.da;
          if (t.t < 0) { vivi++; continue; }
          if (t.stato === 'volo') {
            var u = tra(t.t / VOLO, 0, 1), e = esci(u);
            oggetto(fra(t.sx, t.tx, e), fra(t.sy, t.ty, e) - Math.sin(Math.PI * u) * H * 0.16, fra(2.6, 1, esciForte(u)), t.finale + t.giri * GIRO * (1 - e), 1, 1, tra(u * 6, 0, 1));
            if (u >= 1) impatto(t);
            vivi++;
            continue;
          }
          var k = (t.t - t.colpo) / 1000, dura = 0;
          var alfa = k < resta ? 1 : tra(1 - (k - resta) / (SFUMA / 1000), 0, 1), cala = k < resta ? 0 : (k - resta) * R * 0.15;
          if (t.macchia) {
            var mc = t.macchia;
            if (mc.brucia) figura(mc.brucia, t.tx, t.ty, mc.lato, mc.rot, alfa * 0.6 * tra(k / 0.3, 0, 1));
            else {
              var cresce = fra(0.35, 1, molla(tra(k / 0.16, 0, 1)));
              for (var gi = 0; gi < mc.gocce.length; gi++) { var gc = mc.gocce[gi]; figura(gc.img, t.tx + gc.x * cresce, t.ty + gc.y * cresce + cala, gc.lato, gc.rot, alfa * velo * tra(k / 0.1, 0, 1)); }
              figura(mc.sotto, t.tx, t.ty + R * 0.05 + cala, mc.lato * 1.04 * cresce, mc.rot, alfa * velo);
              figura(mc.sopra, t.tx, t.ty + cala, mc.lato * cresce, mc.rot, alfa * velo);
              if (mc.tuorlo) figura(mc.tuorlo.img, t.tx + R * 0.05, t.ty + R * 0.03 + cala, mc.tuorlo.lato * cresce, mc.tuorlo.rot, alfa);
            }
            dura = Math.max(dura, resta + SFUMA / 1000);
          }
          if (mat === 'spiaccica' || mat === 'spruzza') {
            if (k < 0.08 && !t.cocci.length) oggetto(t.tx, t.ty, 1, t.finale, fra(1, 1.3, k / 0.08), fra(1, 0.65, k / 0.08), 1 - k / 0.08);
          } else if (mat === 'rimbalza') {
            if (k < 0.06) oggetto(t.tx, t.ty, 1, t.finale, fra(1, 1.18, k / 0.06), fra(1, 0.82, k / 0.06), 1);
            else {
              var kk = k - 0.06, ox = t.tx + t.vx * kk, oy = t.ty + t.vy * kk + 0.5 * 2600 * (R / 90) * kk * kk;
              var via = oy - h > H || kk > 2.2;
              if (!via) oggetto(ox, oy, fra(1, 0.9, tra(kk, 0, 1)), t.finale + (t.vx > 0 ? 1 : -1) * kk * 7, 1, 1, tra((2.2 - kk) / 0.3, 0, 1));
              dura = Math.max(dura, via ? 0 : k + 0.1);
            }
          } else if (mat === 'esplode') {
            if (k < 0.05) oggetto(t.tx, t.ty, fra(1, 1.25, k / 0.05), t.finale, 1, 1, 1);
            for (var fi = 0; fi < t.fumi.length; fi++) {
              var fu = t.fumi[fi];
              fu.t += dt;
              if (fu.t < fu.da || fu.t >= fu.vita) continue;
              var uf = (fu.t - fu.da) / (fu.vita - fu.da);
              fu.x += fu.vx * dt; fu.y += fu.vy * dt; fu.rot += fu.vr * dt;
              figura(fu.img, fu.x, fu.y, fu.lato + fu.cresce * uf, fu.rot, Math.min(1, uf * 5) * (1 - uf) * 0.85);
            }
            dura = Math.max(dura, 2.4);
          } else if (mat === 'scoppia') {
            if (k < 0.12) oggetto(t.tx, t.ty, fra(1, 1.35, k / 0.12), t.finale, 1, 1, 1);
            for (var pi = 0; pi < t.pezzi.length; pi++) {
              var pe = t.pezzi[pi];
              pe.t += dt;
              if (pe.t >= pe.vita) continue;
              pe.vy += 2400 * pe.k * dt; pe.x += pe.vx * dt; pe.y += pe.vy * dt; pe.r += pe.vr * dt;
              figura(pezzoImg, pe.x, pe.y, pe.lato, pe.r, tra((pe.vita - pe.t) / 0.3, 0, 1));
            }
            dura = Math.max(dura, t.pezzi.length ? 1.8 : 0.15);
          } else if (mat === 'stampa') {
            var al = k < resta ? 1 : tra(1 - (k - resta) / (SFUMA / 1000), 0, 1);
            oggetto(t.tx, t.ty, (k < 0.25 ? fra(1.3, 1, molla(k / 0.25)) : 1) * (k < resta ? 1 : fra(1, 1.06, 1 - al)), t.finale, 1, 1, al);
            dura = Math.max(dura, resta + SFUMA / 1000);
          }
          disegnaCocci(t, dt);
          if (k < dura || t.cocci.some(function (x) { return x.t < x.vita; })) vivi++;
        }
        if (!vivi) { chiudi(); return; }
        requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
    }
    return chiudi;
  }

  window.SB_LANCI = { lancia: lancia, semeDi: semeDi };
})();
