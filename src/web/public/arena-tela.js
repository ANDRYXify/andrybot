// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';

  const MX = 60;
  const MSU = 66;
  const MGIU = 34;
  const TW = 1000 + 2 * MX;
  const TH = 600 + MSU + MGIU;
  const TESTA = 150;
  const URL_OK = /^https:\/\/(?:static-cdn\.jtvnw\.net\/emoticons\/v2\/[A-Za-z0-9_]{1,64}\/default\/dark\/2\.0|cdn\.7tv\.app\/emote\/[A-Za-z0-9]{20,32}\/2x\.webp)$/;
  const DATI_OK = /^data:image\/svg\+xml,/;

  const ICONE = {
    spada: 'M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2',
    scudo: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    cuore: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
    stivali: 'M7 3h6v8l4.5 1.6A4 4 0 0 1 21 16.4V19H7zM6 21.5h15M9 7h4',
    teschio: 'M9 11a1 1 0 1 0 0 2 1 1 0 1 0 0-2zM15 11a1 1 0 1 0 0 2 1 1 0 1 0 0-2zM8 20v2h8v-2M12.5 17l-.5-1-.5 1h1zM16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20',
    corona: 'M3 18h18l-1.2-9.6-4.3 3.2L12 5.4l-3.5 6.2-4.3-3.2z',
  };
  const tracce = {};
  const traccia = (n) => tracce[n] || (tracce[n] = new Path2D(ICONE[n]));

  const immagini = new Map();
  function immagine(url, poi) {
    const u = String(url || '');
    if (!URL_OK.test(u) && !DATI_OK.test(u)) return null;
    let v = immagini.get(u);
    if (!v) {
      if (immagini.size > 400) immagini.clear();
      const img = new Image();
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      v = { img, pronta: false, rotta: false, attesa: [] };
      img.onload = () => { v.pronta = true; const a = v.attesa.splice(0); for (const f of a) f(); };
      img.onerror = () => { v.rotta = true; v.attesa.length = 0; };
      img.src = u;
      immagini.set(u, v);
    }
    if (v.pronta) return v.img;
    if (!v.rotta && typeof poi === 'function' && !v.attesa.includes(poi)) v.attesa.push(poi);
    return null;
  }

  let bordoChiave = '';
  let bordoTraccia = null;
  function bordo(m) {
    const P = radice.SB_PENNA;
    const w = m.x1 - m.x0, h = m.y1 - m.y0;
    const chiave = [m.x0, m.y0, w, h].map((n) => n.toFixed(1)).join(',');
    if (chiave === bordoChiave && bordoTraccia) return bordoTraccia;
    bordoChiave = chiave;
    if (P) {
      const f = P.forma(m.x0, m.y0, w, h, { seme: 'arena', rag: 10 });
      bordoTraccia = new Path2D(P.tratto(f.china, { larghezza: 4.5, punta: 'china', seme: 'arena' }).d);
    } else {
      const p = new Path2D();
      p.rect(m.x0, m.y0, w, h);
      bordoTraccia = p;
      bordoTraccia.vuota = true;
    }
    return bordoTraccia;
  }

  function scritta(cx, testo, x, y, corpo, colore, v, peso, largo) {
    cx.font = (peso || 800) + ' ' + corpo + 'px ' + v.font;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.lineJoin = 'round';
    cx.lineWidth = corpo * 0.22;
    cx.strokeStyle = 'rgba(0,0,0,.62)';
    cx.strokeText(testo, x, y, largo);
    cx.fillStyle = colore;
    cx.fillText(testo, x, y, largo);
  }

  function icona(cx, nome, x, y, lato, colore) {
    cx.save();
    cx.translate(x - lato / 2, y - lato / 2);
    cx.scale(lato / 24, lato / 24);
    cx.lineCap = 'round';
    cx.lineJoin = 'round';
    cx.strokeStyle = 'rgba(0,0,0,.6)';
    cx.lineWidth = 5;
    cx.stroke(traccia(nome));
    cx.strokeStyle = colore;
    cx.lineWidth = 2.4;
    cx.stroke(traccia(nome));
    cx.restore();
  }

  const coloreDi = (c, v) => (v.coloreChat && /^#[0-9a-f]{6}$/i.test(String(c.colore || '')) ? c.colore : v.accento);

  function cerchio(cx, c, r, v, poi) {
    const col = coloreDi(c, v);
    const img = c.emote ? immagine(c.emote.url, poi) : null;
    cx.save();
    cx.beginPath();
    cx.arc(c.x, c.y, r, 0, Math.PI * 2);
    cx.closePath();
    cx.fillStyle = img ? 'rgba(0,0,0,.38)' : col;
    cx.fill();
    if (!img) { cx.fillStyle = 'rgba(0,0,0,.28)'; cx.fill(); }
    if (img) {
      cx.clip();
      const q = r * 0.86;
      cx.drawImage(img, c.x - q, c.y - q, q * 2, q * 2);
    } else {
      scritta(cx, String(c.nome || '?').trim().charAt(0).toUpperCase() || '?', c.x, c.y + r * 0.04, r * 0.95, '#ffffff', v, 900);
    }
    cx.restore();
    const spessore = Math.max(2.5, r * 0.13);
    cx.lineWidth = spessore;
    cx.strokeStyle = 'rgba(0,0,0,.45)';
    cx.beginPath();
    cx.arc(c.x, c.y, r + spessore / 2, 0, Math.PI * 2);
    cx.stroke();
    const q = c.max > 0 ? Math.max(0, Math.min(1, c.vita / c.max)) : 1;
    cx.strokeStyle = col;
    cx.lineCap = 'round';
    cx.beginPath();
    cx.arc(c.x, c.y, r + spessore / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * q);
    cx.stroke();
  }

  function nome(cx, testo, x, y, corpo, colore, v) {
    const largo = 190;
    cx.font = '800 ' + corpo + 'px ' + v.font;
    const mezzo = Math.min(largo, cx.measureText(testo).width) / 2 + corpo * 0.2;
    scritta(cx, testo, Math.max(mezzo, Math.min(TW - mezzo, x)), y, corpo, colore, v, 800, largo);
  }

  function etichette(cx, c, v) {
    const r = c.r;
    const corpo = Math.min(22, Math.max(15, r * 0.6));
    if (v.nomi !== false) nome(cx, String(c.nome || ''), c.x, c.y - r - corpo * 0.95, corpo, v.coloreChat && c.colore ? coloreDi(c, v) : v.testo, v);
    if (c.corona) icona(cx, 'corona', c.x, c.y - r - corpo * (v.nomi !== false ? 2.2 : 1), corpo * 1.25, '#ffd24a');
    const pezzi = (c.oggetti || []).slice();
    if (c.uccisioni > 0) pezzi.push('teschio');
    if (!pezzi.length) return;
    const lato = Math.min(22, Math.max(15, r * 0.6));
    const passo = lato * 1.12;
    const largo = pezzi.length * passo + (c.uccisioni > 0 ? lato * 0.9 : 0);
    let x = c.x - largo / 2 + lato / 2;
    const y = c.y + r + lato * 0.95;
    for (const p of pezzi) {
      icona(cx, p, x, y, lato, p === 'teschio' ? v.testo : v.accento);
      x += passo;
    }
    if (c.uccisioni > 0) scritta(cx, String(c.uccisioni), x - passo / 2 + lato * 0.45, y, lato * 0.95, v.testo, v, 800);
  }

  function disegna(tela, sc, v, poi) {
    const A = radice.SB_ARENA;
    const cx = tela.getContext('2d');
    const k = tela.width / TW;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.clearRect(0, 0, tela.width, tela.height);
    if (!sc) return;
    cx.setTransform(k, 0, 0, k, 0, 0);
    if (sc.vincitore) { vincitore(cx, sc.vincitore, v, poi); return; }
    cx.translate(MX, MSU);
    if (sc.righe && sc.righe.length) {
      scritta(cx, String(sc.righe[0] || ''), A.W / 2, 38, 34, v.testo, v, 900, A.W - 60);
      if (sc.righe[1]) scritta(cx, String(sc.righe[1]), A.W / 2, 74, 24, v.testo, v, 700, A.W - 60);
      if (sc.tempo != null) {
        const q = Math.max(0, Math.min(1, sc.tempo));
        cx.fillStyle = 'rgba(0,0,0,.4)';
        cx.fillRect(A.W / 2 - 160, 94, 320, 6);
        cx.fillStyle = v.accento;
        cx.fillRect(A.W / 2 - 160, 94, 320 * q, 6);
      }
    }
    const m = sc.muri || { x0: 0, y0: 0, x1: A.W, y1: A.H };
    if (m.x0 > 0.5) {
      cx.fillStyle = 'rgba(0,0,0,.28)';
      cx.beginPath();
      cx.rect(-6, -6, A.W + 12, A.H + 12);
      cx.rect(m.x0 - 6, m.y0 - 6, m.x1 - m.x0 + 12, m.y1 - m.y0 + 12);
      cx.fill('evenodd');
    }
    if (v.bordo !== false) {
      const b = bordo({ x0: m.x0 - 6, y0: m.y0 - 6, x1: m.x1 + 6, y1: m.y1 + 6 });
      if (b.vuota) { cx.lineWidth = 4.5; cx.strokeStyle = v.accento; cx.stroke(b); } else { cx.fillStyle = v.accento; cx.fill(b); }
    }
    for (const o of sc.oggetti || []) {
      cx.fillStyle = 'rgba(0,0,0,.45)';
      cx.beginPath();
      cx.arc(o.x, o.y, A.R_OGGETTO + 3, 0, Math.PI * 2);
      cx.fill();
      icona(cx, o.tipo, o.x, o.y, A.R_OGGETTO * 1.6, v.accento);
    }
    const corpi = (sc.corpi || []).slice().sort((a, b) => (a.corona === b.corona ? 0 : a.corona ? 1 : -1));
    for (const c of corpi) cerchio(cx, c, c.r, v, poi);
    for (const c of corpi) etichette(cx, c, v);
    for (const l of sc.lampi || []) {
      const t = Math.max(0, Math.min(1, l.t));
      cx.globalAlpha = 1 - t;
      cx.strokeStyle = l.tipo === 'eliminato' ? coloreDi(l, v) : v.testo;
      cx.lineWidth = l.tipo === 'eliminato' ? 6 : 3;
      cx.beginPath();
      cx.arc(l.x, l.y, (l.tipo === 'eliminato' ? l.r || 30 : 10) * (1 + t * (l.tipo === 'eliminato' ? 1.4 : 1.8)), 0, Math.PI * 2);
      cx.stroke();
      cx.globalAlpha = 1;
    }
  }

  function vincitore(cx, w, v, poi) {
    const x = TW / 2, y = TH / 2 - 70;
    cerchio(cx, { ...w, x, y, vita: 1, max: 1 }, 130, v, poi);
    if (w.corona) icona(cx, 'corona', x, y - 185, 64, '#ffd24a');
    scritta(cx, String(w.nome || ''), x, y + 190, 58, v.coloreChat && w.colore ? coloreDi(w, v) : v.testo, v, 900, TW - 100);
    if (w.motto) scritta(cx, String(w.motto), x, y + 244, 32, v.testo, v, 700, TW - 100);
    if (w.uccisioni > 0) {
      icona(cx, 'teschio', x - 24, y + 290, 32, v.testo);
      scritta(cx, String(w.uccisioni), x + 18, y + 290, 30, v.testo, v, 800);
    }
  }

  function posaIscrizioni(p, r) {
    const H = 600, k = Math.max(0, H - 2 * r) > 0 ? (H - TESTA - 2 * r) / (H - 2 * r) : 0;
    return { x: p.x, y: TESTA + r + (p.y - r) * Math.max(0, k) };
  }

  function scenaDi(s, info, a) {
    const A = radice.SB_ARENA;
    const q = Math.max(0, Math.min(1, Number(a) || 0));
    const corpi = [];
    for (const c of s.corpi) {
      if (!c.vivo) continue;
      const d = (info && info.get(c.id)) || {};
      corpi.push({ id: c.id, x: c.px + (c.x - c.px) * q, y: c.py + (c.y - c.py) * q, r: s.regole.raggio, vita: c.vita, max: c.max,
        oggetti: c.oggetti.slice(), uccisioni: c.uccisioni, corona: s.corona === c.id, nome: d.nome || c.id, colore: d.colore || '', emote: d.emote || null });
    }
    return { muri: A.muri(s), oggetti: s.oggetti.map((o) => ({ tipo: o.tipo, x: o.x, y: o.y })), corpi };
  }

  function esempio(nomi, emote) {
    const A = radice.SB_ARENA;
    const lista = (nomi || []).map((n, i) => ({ id: 'e' + i, nome: n, emote: emote && emote.length ? { nome: n, url: emote[i % emote.length] } : null }));
    const s = A.corri(A.nuova('esempio', lista.map((c) => ({ id: c.id })), {}), 200);
    s.corpi[0].oggetti = ['spada'];
    s.corpi[0].uccisioni = Math.max(1, s.corpi[0].uccisioni);
    s.corona = s.corpi[0].id;
    for (const c of s.corpi) { c.px = c.x; c.py = c.y; }
    return scenaDi(s, new Map(lista.map((c) => [c.id, c])), 1);
  }

  radice.SB_ARENA_TELA = { URL_OK, ICONE, TW, TH, immagine, disegna, scenaDi, esempio, posaIscrizioni };
})(typeof window !== 'undefined' ? window : globalThis);
