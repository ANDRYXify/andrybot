// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  const W = 1240, H = 1754, M = 88;
  const FONT = "Archivo, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  const f = (peso, px) => `${peso} ${px}px ${FONT}`;
  const MAX = { presentazione: 4, numeri: 8, categorie: 5, social: 6, collaborazioni: 3 };

  function rgbDi(c) {
    const s = String(c || '').trim();
    let m = /^#([0-9a-f]{3})$/i.exec(s);
    if (m) return m[1].split('').map((x) => parseInt(x + x, 16));
    m = /^#([0-9a-f]{6})/i.exec(s);
    if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
    m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(s);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  }
  const lin = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  function luce(c) { const v = rgbDi(c); return v ? 0.2126 * lin(v[0]) + 0.7152 * lin(v[1]) + 0.0722 * lin(v[2]) : null; }
  function contrasto(a, b) {
    const la = luce(a), lb = luce(b);
    if (la == null || lb == null) return 1;
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function inchiostro(su) {
    return contrasto('#ffffff', su) >= contrasto('#000000', su) ? '#ffffff' : '#000000';
  }

  function taglia(g, t, largo) {
    let s = String(t || '');
    if (g.measureText(s).width <= largo) return { testo: s, tagliato: false };
    while (s && g.measureText(s + '…').width > largo) s = s.slice(0, -1);
    return { testo: s.replace(/\s+$/, '') + '…', tagliato: true };
  }

  function righe(g, testo, largo, max) {
    const out = [];
    let tagliato = false;
    for (const par of String(testo || '').split('\n')) {
      let r = '';
      for (const p of par.split(/\s+/).filter(Boolean)) {
        const prova = r ? r + ' ' + p : p;
        if (g.measureText(prova).width <= largo || !r) r = prova;
        else { out.push(r); r = p; }
      }
      out.push(r);
    }
    while (out.length && !out[out.length - 1]) out.pop();
    if (out.length > max) { out.length = max; tagliato = true; }
    const lunghe = out.map((r) => taglia(g, r, largo));
    if (lunghe.some((x) => x.tagliato)) tagliato = true;
    const fin = lunghe.map((x) => x.testo);
    if (tagliato && fin.length && !fin[fin.length - 1].endsWith('…')) fin[fin.length - 1] = taglia(g, fin[fin.length - 1] + '…', largo).testo;
    return { righe: fin, tagliato };
  }

  function elenco(g, voci, largo, max, sep) {
    const out = [];
    let r = '', tagliato = false;
    for (const v of voci) {
      const t = taglia(g, v, largo);
      if (t.tagliato) tagliato = true;
      const prova = r ? r + sep + t.testo : t.testo;
      if (!r || g.measureText(prova).width <= largo) r = prova;
      else { out.push(r); r = t.testo; }
    }
    if (r) out.push(r);
    if (out.length > max) {
      out.length = max; tagliato = true;
      out[max - 1] = taglia(g, out[max - 1] + sep + '…', largo).testo;
    }
    return { righe: out, tagliato };
  }

  function etichetta(g, t, x, y, colore) {
    g.font = f(700, 21);
    g.fillStyle = colore;
    g.textAlign = 'left';
    let cx = x;
    for (const ch of String(t).toUpperCase()) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + 3; }
  }

  function tondo(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

  function disegna(g, d) {
    const c = d.colori, link = [], problemi = [];
    const acc = contrasto(c.acc, c.bg) >= 3 ? c.acc : c.testo;
    const sfondo = g.createLinearGradient(0, 0, 0, H);
    sfondo.addColorStop(0, c.bg); sfondo.addColorStop(1, c.bg2 || c.bg);
    g.fillStyle = sfondo; g.fillRect(0, 0, W, H);
    g.textBaseline = 'alphabetic';

    const A = 180;
    g.save();
    g.beginPath(); g.arc(M + A / 2, M + A / 2, A / 2, 0, 2 * Math.PI); g.clip();
    if (d.avatar) {
      const k = Math.max(A / d.avatar.width, A / d.avatar.height), w = d.avatar.width * k, h = d.avatar.height * k;
      g.drawImage(d.avatar, M + (A - w) / 2, M + (A - h) / 2, w, h);
    } else {
      g.fillStyle = c.acc; g.fillRect(M, M, A, A);
      g.fillStyle = inchiostro(c.acc);
      g.font = f(800, 84); g.textAlign = 'center';
      g.fillText(String(d.nome || '?').slice(0, 1).toUpperCase(), M + A / 2, M + A / 2 + 30);
    }
    g.restore();
    g.strokeStyle = c.acc; g.lineWidth = 6;
    g.beginPath(); g.arc(M + A / 2, M + A / 2, A / 2 - 3, 0, 2 * Math.PI); g.stroke();

    const x0 = M + A + 44, largo = W - M - x0;
    let px = 72;
    g.textAlign = 'left';
    for (; px > 44; px -= 2) { g.font = f(800, px); if (g.measureText(d.nome || '').width <= largo) break; }
    g.font = f(800, px);
    const nome = taglia(g, d.nome || '', largo);
    if (nome.tagliato) problemi.push('nome');
    g.fillStyle = c.testo; g.fillText(nome.testo, x0, M + 66);
    if (d.canale) {
      g.font = f(500, 28); g.fillStyle = acc;
      const t = taglia(g, d.canale.etichetta, largo);
      g.fillText(t.testo, x0, M + 112);
      link.push({ x: x0, y: M + 86, w: g.measureText(t.testo).width, h: 36, url: d.canale.url });
    }
    let fondo = M + A;
    if (d.presentazione) {
      g.font = f(400, 28); g.fillStyle = c.testo;
      const r = righe(g, d.presentazione, largo, MAX.presentazione);
      if (r.tagliato) problemi.push('presentazione');
      r.righe.forEach((t, i) => g.fillText(t, x0, M + 170 + i * 40));
      fondo = Math.max(fondo, M + 170 + (r.righe.length - 1) * 40 + 12);
    }
    let y = fondo + 56;

    const numeri = (d.numeri || []).slice(0, MAX.numeri);
    if (numeri.length) {
      etichetta(g, d.testi.numeri, M, y, acc);
      const col = 4, gap = 20, cw = (W - 2 * M - gap * (col - 1)) / col, ch = 142;
      numeri.forEach((n, i) => {
        const cx = M + (i % col) * (cw + gap), cy = y + 26 + Math.floor(i / col) * (ch + gap);
        tondo(g, cx, cy, cw, ch, 18); g.fillStyle = c.card; g.fill();
        g.lineWidth = 2; g.strokeStyle = c.bordo; g.stroke();
        let vp = 58;
        for (; vp > 30; vp -= 2) { g.font = f(800, vp); if (g.measureText(n.valore).width <= cw - 44) break; }
        g.fillStyle = c.testo; g.fillText(n.valore, cx + 22, cy + 74);
        g.font = f(500, 21); g.fillStyle = c.tenue;
        righe(g, n.etichetta, cw - 44, 2).righe.forEach((t, k) => g.fillText(t, cx + 22, cy + 104 + k * 26));
      });
      const file = Math.ceil(numeri.length / col);
      y += 26 + file * ch + (file - 1) * gap + 36;
      if (d.nota) {
        g.font = f(400, 20); g.fillStyle = c.tenue;
        const r = righe(g, d.nota, W - 2 * M, 3);
        r.righe.forEach((t, i) => g.fillText(t, M, y + i * 28));
        y += (r.righe.length - 1) * 28;
      }
      y += 64;
    }

    const colW = (W - 2 * M - 48) / 2, xs = M, xd = M + colW + 48;
    let ys = y, yd = y;

    const cat = (d.categorie || []).slice(0, MAX.categorie);
    if (cat.length) {
      etichetta(g, d.testi.trasmetto, xs, ys, acc);
      ys += 44;
      cat.forEach((k) => {
        g.font = f(700, 24); g.fillStyle = c.testo; g.textAlign = 'right';
        const q = `${k.quota}%`;
        g.fillText(q, xs + colW, ys);
        const qw = g.measureText(q).width;
        g.textAlign = 'left'; g.font = f(500, 24);
        g.fillText(taglia(g, k.nome, colW - qw - 20).testo, xs, ys);
        tondo(g, xs, ys + 12, colW, 10, 5); g.fillStyle = c.bordo; g.fill();
        if (k.quota > 0) { tondo(g, xs, ys + 12, Math.max(10, (colW * k.quota) / 100), 10, 5); g.fillStyle = c.acc; g.fill(); }
        ys += 54;
      });
      ys += 30;
    }

    const giorni = d.settimana || [];
    if (giorni.length === 7) {
      etichetta(g, d.testi.inOnda, xs, ys, acc);
      ys += 22;
      const gw = (colW - 6 * 8) / 7, gh = 84;
      giorni.forEach((gg, i) => {
        const cx = xs + i * (gw + 8);
        tondo(g, cx, ys, gw, gh, 12);
        g.fillStyle = gg.off ? 'rgba(0,0,0,0)' : c.card; g.fill();
        g.lineWidth = 2; g.strokeStyle = c.bordo; g.stroke();
        g.textAlign = 'center';
        g.font = f(700, 19); g.fillStyle = gg.off ? c.tenue : acc;
        g.fillText(gg.giorno, cx + gw / 2, ys + 32);
        g.font = f(600, gg.off ? 20 : 21); g.fillStyle = gg.off ? c.tenue : c.testo;
        g.fillText(gg.off ? '—' : gg.ora, cx + gw / 2, ys + 64);
      });
      g.textAlign = 'left';
      ys += gh;
      if (d.fuso) { g.font = f(400, 19); g.fillStyle = c.tenue; g.fillText(d.fuso, xs, ys + 30); ys += 30; }
      ys += 30;
    }

    const soc = (d.social || []).slice(0, MAX.social);
    if (soc.length) {
      etichetta(g, d.testi.trovarmi, xd, yd, acc);
      yd += 24;
      soc.forEach((s) => {
        if (s.d) {
          g.save(); g.translate(xd, yd + 4); g.scale(30 / 24, 30 / 24);
          g.fillStyle = c.testo; g.fill(new Path2D(s.d)); g.restore();
        }
        g.font = f(500, 24); g.fillStyle = c.testo;
        const t = taglia(g, s.testo, colW - 48);
        g.fillText(t.testo, xd + 46, yd + 28);
        link.push({ x: xd, y: yd, w: 46 + g.measureText(t.testo).width, h: 38, url: s.url });
        yd += 50;
      });
      yd += 36;
    }

    if ((d.collaborazioni || []).length) {
      etichetta(g, d.testi.collaborazioni, xd, yd, acc);
      yd += 40;
      g.font = f(500, 24); g.fillStyle = c.testo;
      const r = elenco(g, d.collaborazioni, colW, MAX.collaborazioni, ' · ');
      if (r.tagliato) problemi.push('collaborazioni');
      r.righe.forEach((t, i) => g.fillText(t, xd, yd + i * 34));
      yd += (r.righe.length - 1) * 34 + 20;
    }

    const bh = 124, by = H - M - bh;
    if (d.email) {
      tondo(g, M, by, W - 2 * M, bh, 22); g.fillStyle = c.acc; g.fill();
      const su = inchiostro(c.acc);
      etichetta(g, d.testi.contatto, M + 36, by + 44, su);
      let ep = 38;
      for (; ep > 24; ep -= 2) { g.font = f(700, ep); if (g.measureText(d.email).width <= W - 2 * M - 72) break; }
      g.font = f(700, ep); g.fillStyle = su;
      const t = taglia(g, d.email, W - 2 * M - 72);
      if (t.tagliato) problemi.push('email');
      g.fillText(t.testo, M + 36, by + 94);
      link.push({ x: M, y: by, w: W - 2 * M, h: bh, url: 'mailto:' + d.email });
    }
    const basso = Math.max(ys, yd);
    if (basso > (d.email ? by : H - M) - 12) problemi.push('pieno');
    return { link, problemi, basso };
  }

  const KIT = { W, H, M, MAX, disegna, contrasto, inchiostro, righe, elenco, taglia, rgbDi };
  if (typeof module !== 'undefined' && module.exports) module.exports = KIT;
  else radice.SB_KIT = KIT;
})(typeof window !== 'undefined' ? window : globalThis);
