// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  const W = 1240, H = 1754, M = 88;
  const FONT = "Archivo, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  const f = (peso, px) => `${peso} ${px}px ${FONT}`;

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

  function mescola(a, b, t) {
    const x = rgbDi(a), y = rgbDi(b);
    if (!x || !y) return a;
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  function veste(m) {
    const fondo = rgbDi(m.fondo) ? m.fondo : '#15121a';
    const testo = contrasto(m.testo, fondo) >= 4.5 ? m.testo : inchiostro(fondo);
    let k = 0.4, tenue = mescola(testo, fondo, k);
    while (k > 0 && contrasto(tenue, fondo) < 4.5) { k = Math.max(0, k - 0.05); tenue = mescola(testo, fondo, k); }
    const acc = contrasto(m.accento, fondo) >= 3 ? m.accento : testo;
    return {
      bg: fondo, bg2: mescola(fondo, testo, 0.04), testo, tenue, card: mescola(fondo, testo, 0.06), bordo: mescola(fondo, testo, 0.18), acc,
      corretti: { testo: testo !== m.testo, accento: acc !== m.accento },
    };
  }

  const riga = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  function urlKit(v) {
    const t = riga(v, 300);
    if (!t) return '';
    try {
      const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
      if (!/^https?:$/.test(u.protocol) || !/\.[a-z]{2,}$/i.test(u.hostname)) return '';
      return u.href.slice(0, 300);
    } catch { return ''; }
  }
  const EMAIL = /^[^\s@<>"'`]+@[^\s@<>"'`]+\.[a-z]{2,}$/i;
  const emailKit = (v) => { const t = riga(v, 120); return EMAIL.test(t) ? t : ''; };

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

  const CARATTERI = {
    archivo: FONT,
    grazie: "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif",
    mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
  };
  const PAGINE = 3, GAP = 56, COL = 48, PIEDE = 40;
  const ALTO = M, BASSO = H - M - PIEDE;
  const LIMITI = { testa: 8, testoPiena: 12, testoMeta: 16, lavoroTesto: 3, offertaTesto: 2, nota: 3 };

  function penna(g, d, secco, R) {
    const c = d.colori;
    const pila = CARATTERI[d.carattere] || FONT;
    const P = {
      g, secco, c, px: 20,
      acc: contrasto(c.acc, c.bg) >= 3 ? c.acc : c.testo,
      font(peso, px) { P.px = px; g.font = `${peso} ${px}px ${pila}`; },
      largo(t) { return g.measureText(String(t)).width; },
      scrivi(t, x, y, o = {}) {
        const testo = String(t ?? '');
        if (!testo) return 0;
        const w = g.measureText(testo).width;
        const sx = o.allinea === 'right' ? x - w : o.allinea === 'center' ? x - w / 2 : x;
        if (!secco) {
          g.textAlign = 'left';
          g.fillStyle = o.colore || c.testo;
          g.fillText(testo, sx, y);
          R.testi.push({ testo, x: sx, y, px: P.px, w });
          if (o.url) R.link.push({ x: sx - (o.margine || 0), y: y - P.px * 0.95, w: w + 2 * (o.margine || 0), h: P.px * 1.3, url: o.url });
        }
        return w;
      },
      area(x, y, w, h, url) { if (!secco && url) R.link.push({ x, y, w, h, url }); },
      spaziato(t, x, y, colore) {
        const testo = String(t ?? '');
        let cx = x;
        if (!secco) { g.textAlign = 'left'; g.fillStyle = colore; }
        for (const ch of testo) { if (!secco) g.fillText(ch, cx, y); cx += g.measureText(ch).width + 3; }
        if (!secco && testo) R.testi.push({ testo, x, y, px: P.px, w: cx - x - 3 });
        return cx - x;
      },
      forma(fn) { if (!secco) { g.save(); fn(g); g.restore(); } },
    };
    return P;
  }

  function intestazione(P, d, t, x, y) {
    if (d.titoli === 'normale') {
      P.font(800, 32);
      P.scrivi(t, x, y + 30);
      return 56;
    }
    P.font(700, 21);
    P.spaziato(String(t).toUpperCase(), x, y + 22, P.acc);
    return 46;
  }

  function riquadro(P, x, y, w, h, r, pieno, bordo) {
    P.forma((g) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (pieno) { g.fillStyle = pieno; g.fill(); } if (bordo) { g.lineWidth = 2; g.strokeStyle = bordo; g.stroke(); } });
  }

  const SEZIONI = {
    testa(P, d, s, x, y, w, problemi) {
      const c = P.c, A = 180;
      P.forma((g) => {
        g.beginPath(); g.arc(x + A / 2, y + A / 2, A / 2, 0, 2 * Math.PI); g.clip();
        if (d.avatar) {
          const k = Math.max(A / d.avatar.width, A / d.avatar.height), aw = d.avatar.width * k, ah = d.avatar.height * k;
          g.drawImage(d.avatar, x + (A - aw) / 2, y + (A - ah) / 2, aw, ah);
        } else {
          g.fillStyle = c.acc; g.fillRect(x, y, A, A);
        }
      });
      if (!d.avatar) { P.font(800, 84); P.scrivi(String(d.nome || '?').slice(0, 1).toUpperCase(), x + A / 2, y + A / 2 + 30, { allinea: 'center', colore: inchiostro(c.acc) }); }
      P.forma((g) => { g.strokeStyle = c.acc; g.lineWidth = 6; g.beginPath(); g.arc(x + A / 2, y + A / 2, A / 2 - 3, 0, 2 * Math.PI); g.stroke(); });
      const x0 = x + A + 44, largo = w - A - 44;
      let px = 72;
      for (; px > 44; px -= 2) { P.font(800, px); if (P.largo(d.nome || '') <= largo) break; }
      P.font(800, px);
      const nome = taglia(P.g, d.nome || '', largo);
      if (nome.tagliato) problemi.push('nome');
      let ty = y + 66;
      P.scrivi(nome.testo, x0, ty);
      if (s.riga) { ty += 46; P.font(500, 30); P.scrivi(taglia(P.g, s.riga, largo).testo, x0, ty, { colore: c.tenue }); }
      if (d.canale) { ty += 44; P.font(500, 28); P.scrivi(taglia(P.g, d.canale.etichetta, largo).testo, x0, ty, { colore: P.acc, url: d.canale.url }); }
      if (s.presentazione) {
        P.font(400, 28);
        const r = righe(P.g, s.presentazione, largo, LIMITI.testa);
        if (r.tagliato) problemi.push('presentazione');
        ty += 52;
        r.righe.forEach((t, i) => P.scrivi(t, x0, ty + i * 40));
        ty += (r.righe.length - 1) * 40;
      }
      return Math.max(A, ty - y + 14);
    },
    numeri(P, d, s, x, y, w) {
      const c = P.c;
      const voci = s.voci || [];
      if (!voci.length) return 0;
      let h = intestazione(P, d, s.titolo, x, y);
      const n = voci.length;
      const col = w > 700 ? (n <= 4 ? Math.max(n, 2) : n <= 6 ? 3 : 4) : 2, gap = 20, cw = (w - gap * (col - 1)) / col, ch = 142;
      voci.forEach((n, i) => {
        const cx = x + (i % col) * (cw + gap), cy = y + h + Math.floor(i / col) * (ch + gap);
        riquadro(P, cx, cy, cw, ch, 18, c.card, c.bordo);
        let vp = 58;
        for (; vp > 30; vp -= 2) { P.font(800, vp); if (P.largo(n.valore) <= cw - 44) break; }
        P.scrivi(n.valore, cx + 22, cy + 74);
        P.font(500, 21);
        righe(P.g, n.etichetta, cw - 44, 2).righe.forEach((t, k) => P.scrivi(t, cx + 22, cy + 104 + k * 26, { colore: c.tenue }));
      });
      const file = Math.ceil(voci.length / col);
      h += file * ch + (file - 1) * gap;
      if (s.nota) {
        P.font(400, 20);
        const r = righe(P.g, s.nota, w, LIMITI.nota);
        h += 40;
        r.righe.forEach((t, i) => P.scrivi(t, x, y + h + i * 28, { colore: c.tenue }));
        h += (r.righe.length - 1) * 28 + 8;
      }
      return h;
    },
    categorie(P, d, s, x, y, w) {
      const c = P.c;
      if (!s.voci?.length) return 0;
      let h = intestazione(P, d, s.titolo, x, y) + 4;
      for (const k of s.voci || []) {
        P.font(700, 24);
        const q = `${k.quota}%`;
        const qw = P.largo(q);
        P.font(500, 24);
        P.scrivi(taglia(P.g, k.nome, w - qw - 20).testo, x, y + h + 22);
        P.font(700, 24);
        P.scrivi(q, x + w, y + h + 22, { allinea: 'right' });
        riquadro(P, x, y + h + 34, w, 10, 5, c.bordo);
        if (k.quota > 0) riquadro(P, x, y + h + 34, Math.max(10, (w * k.quota) / 100), 10, 5, c.acc);
        h += 58;
      }
      return h;
    },
    settimana(P, d, s, x, y, w) {
      const c = P.c;
      if (!s.giorni?.length) return 0;
      let h = intestazione(P, d, s.titolo, x, y);
      const gw = (w - 6 * 8) / 7, gh = 84;
      let op = 21;
      for (; op > 14; op--) { P.font(600, op); if (P.largo('00:00') <= gw - 16) break; }
      (s.giorni || []).forEach((gg, i) => {
        const cx = x + i * (gw + 8), cy = y + h;
        riquadro(P, cx, cy, gw, gh, 12, gg.off ? null : c.card, c.bordo);
        P.font(700, Math.min(19, op)); P.scrivi(gg.giorno, cx + gw / 2, cy + 32, { allinea: 'center', colore: gg.off ? c.tenue : P.acc });
        P.font(600, op); P.scrivi(gg.off ? '—' : gg.ora, cx + gw / 2, cy + 64, { allinea: 'center', colore: gg.off ? c.tenue : c.testo });
      });
      h += gh;
      if (s.fuso) { P.font(400, 19); h += 32; P.scrivi(s.fuso, x, y + h, { colore: c.tenue }); h += 8; }
      return h;
    },
    social(P, d, s, x, y, w) {
      const c = P.c;
      if (!s.voci?.length) return 0;
      let h = intestazione(P, d, s.titolo, x, y);
      const col = w > 700 ? 2 : 1, cw = (w - COL * (col - 1)) / col;
      (s.voci || []).forEach((v, i) => {
        const cx = x + (i % col) * (cw + COL), cy = y + h + Math.floor(i / col) * 50;
        if (v.d) P.forma((g) => { g.translate(cx, cy + 4); g.scale(30 / 24, 30 / 24); g.fillStyle = c.testo; g.fill(new Path2D(v.d)); });
        P.font(500, 24);
        const t = taglia(P.g, v.testo, cw - 48);
        const tw = P.scrivi(t.testo, cx + 46, cy + 28);
        P.area(cx, cy, 46 + tw, 38, v.url);
      });
      h += Math.ceil((s.voci || []).length / col) * 50 - 12;
      return h;
    },
    lavori(P, d, s, x, y, w, problemi) {
      const c = P.c;
      if (!s.voci?.length) return 0;
      let h = intestazione(P, d, s.titolo, x, y);
      (s.voci || []).forEach((v, i) => {
        if (i) h += 26;
        P.font(700, 28);
        const freccia = v.url ? ' ↗' : '';
        const t = taglia(P.g, v.titolo + freccia, w);
        h += 30;
        P.scrivi(t.testo, x, y + h, { colore: v.url ? P.acc : c.testo, url: v.url || '' });
        if (v.testo) {
          P.font(400, 23);
          const r = righe(P.g, v.testo, w, LIMITI.lavoroTesto);
          if (r.tagliato) problemi.push('lavori');
          r.righe.forEach((t2) => { h += 34; P.scrivi(t2, x, y + h, { colore: c.tenue }); });
        }
      });
      return h + 10;
    },
    collaborazioni(P, d, s, x, y, w) {
      const c = P.c;
      if (!s.voci?.length) return 0;
      let h = intestazione(P, d, s.titolo, x, y);
      P.font(600, 23);
      let cx = x, cy = y + h;
      const ch = 48, pad = 20, gap = 12;
      for (const v of s.voci || []) {
        P.font(600, 23);
        const t = taglia(P.g, v.nome, w - 2 * pad);
        const cw = P.largo(t.testo) + 2 * pad;
        if (cx > x && cx + cw > x + w) { cx = x; cy += ch + gap; }
        riquadro(P, cx, cy, cw, ch, ch / 2, c.card, v.url ? P.acc : c.bordo);
        P.scrivi(t.testo, cx + pad, cy + 32, { colore: c.testo });
        P.area(cx, cy, cw, ch, v.url);
        cx += cw + gap;
      }
      return cy + ch - y;
    },
    offerte(P, d, s, x, y, w, problemi) {
      const c = P.c;
      if (!s.voci?.length) return 0;
      let h = intestazione(P, d, s.titolo, x, y);
      (s.voci || []).forEach((v, i) => {
        if (i) { h += 20; P.forma((g) => { g.fillStyle = c.bordo; g.fillRect(x, y + h, w, 2); }); h += 6; }
        P.font(700, 26);
        const pw = v.prezzo ? P.largo(v.prezzo) + 24 : 0;
        h += 32;
        P.scrivi(taglia(P.g, v.nome, w - pw).testo, x, y + h);
        if (v.prezzo) P.scrivi(v.prezzo, x + w, y + h, { allinea: 'right', colore: P.acc });
        if (v.testo) {
          P.font(400, 22);
          const r = righe(P.g, v.testo, w, LIMITI.offertaTesto);
          if (r.tagliato) problemi.push('offerte');
          r.righe.forEach((t) => { h += 32; P.scrivi(t, x, y + h, { colore: c.tenue }); });
        }
      });
      return h + 10;
    },
    testo(P, d, s, x, y, w, problemi) {
      if (!String(s.testo || '').trim()) return 0;
      let h = intestazione(P, d, s.titolo, x, y);
      P.font(400, 26);
      const r = righe(P.g, s.testo, w, s.larghezza === 'meta' ? LIMITI.testoMeta : LIMITI.testoPiena);
      if (r.tagliato) problemi.push('testo');
      r.righe.forEach((t, i) => P.scrivi(t, x, y + h + 26 + i * 38));
      return h + 26 + (r.righe.length - 1) * 38 + 12;
    },
    link(P, d, s, x, y, w) {
      const c = P.c;
      if (!s.voci?.length) return 0;
      let h = intestazione(P, d, s.titolo, x, y);
      for (const v of s.voci || []) {
        h += 34;
        P.font(700, 25);
        const eti = v.etichetta || v.mostra;
        const ew = P.scrivi(taglia(P.g, eti + ' ↗', w).testo, x, y + h, { colore: P.acc, url: v.url });
        if (v.etichetta && v.mostra) {
          P.font(400, 21);
          const resto = w - ew - 16;
          if (resto > 120) P.scrivi(taglia(P.g, v.mostra, resto).testo, x + ew + 16, y + h, { colore: c.tenue });
        }
        h += 12;
      }
      return h;
    },
    contatti(P, d, s, x, y, w, problemi) {
      const c = P.c;
      if (!s.email && !s.altro?.url) return 0;
      const bh = 124, su = inchiostro(c.acc);
      riquadro(P, x, y, w, bh, 22, c.acc);
      let pill = null, destra = x + w - 36;
      if (s.altro?.url) {
        P.font(700, 24);
        const t = taglia(P.g, (s.altro.etichetta || s.altro.mostra) + ' ↗', w / 2 - 72).testo;
        const pw = P.largo(t) + 44, ph = 56;
        pill = { t, pw, ph, px: destra - pw, py: y + (bh - ph) / 2 };
        destra = pill.px - 24;
      }
      P.font(700, 21);
      P.spaziato(String(s.titolo).toUpperCase(), x + 36, y + 44, su);
      if (s.email) {
        const largo = destra - (x + 36);
        let ep = 38;
        for (; ep > 24; ep -= 2) { P.font(700, ep); if (P.largo(s.email) <= largo) break; }
        P.font(700, ep);
        const t = taglia(P.g, s.email, largo);
        if (t.tagliato) problemi.push('email');
        P.scrivi(t.testo, x + 36, y + 94, { colore: su, url: 'mailto:' + s.email, margine: 8 });
      }
      if (pill) {
        riquadro(P, pill.px, pill.py, pill.pw, pill.ph, pill.ph / 2, null, su);
        P.font(700, 24);
        P.scrivi(pill.t, pill.px + 22, pill.py + 37, { colore: su });
        P.area(pill.px, pill.py, pill.pw, pill.ph, s.altro.url);
      }
      return bh;
    },
  };

  function misura(g, d, s, w, problemi) {
    const P = penna(g, d, true, null);
    return SEZIONI[s.tipo] ? SEZIONI[s.tipo](P, d, s, 0, 0, w, problemi || []) : 0;
  }

  function impagina(g, d) {
    const problemi = [];
    const largo = W - 2 * M, meta = (largo - COL) / 2;
    const sezioni = (d.sezioni || []).filter((s) => SEZIONI[s.tipo] && s.visibile !== false);
    const contatti = sezioni.find((s) => s.tipo === 'contatti');
    const corpo = sezioni.filter((s) => s.tipo !== 'contatti' && misura(g, d, s, s.larghezza === 'meta' ? meta : largo, null) > 0);
    const file = [];
    for (let i = 0; i < corpo.length; i++) {
      const a = corpo[i];
      if (a.larghezza === 'meta') {
        const b = corpo[i + 1]?.larghezza === 'meta' ? corpo[++i] : null;
        file.push([{ s: a, x: M, w: meta }, ...(b ? [{ s: b, x: M + meta + COL, w: meta }] : [])]);
      } else file.push([{ s: a, x: M, w: largo }]);
    }
    const pagine = [[]];
    let y = ALTO, fuori = false;
    for (const fila of file) {
      for (const p of fila) p.h = misura(g, d, p.s, p.w, problemi);
      const h = Math.max(...fila.map((p) => p.h));
      if (!(h > 0)) continue;
      if (y + h > BASSO && pagine[pagine.length - 1].length) {
        if (pagine.length >= PAGINE) { fuori = true; break; }
        pagine.push([]);
        y = ALTO;
      }
      for (const p of fila) pagine[pagine.length - 1].push({ ...p, y });
      y += h + GAP;
    }
    if (contatti && !fuori) {
      const hc = misura(g, d, contatti, largo, problemi);
      if (hc > 0) {
        if (y + hc > BASSO && pagine[pagine.length - 1].length) {
          if (pagine.length >= PAGINE) fuori = true;
          else { pagine.push([]); y = ALTO; }
        }
        if (!fuori) pagine[pagine.length - 1].push({ s: contatti, x: M, w: largo, y, h: hc });
      }
    }
    if (fuori) problemi.push('pagine');
    return { pagine, problemi: [...new Set(problemi)] };
  }

  function disegnaPagina(g, d, imp, n) {
    const c = d.colori;
    const R = { link: [], testi: [] };
    const sfondo = g.createLinearGradient(0, 0, 0, H);
    sfondo.addColorStop(0, c.bg); sfondo.addColorStop(1, c.bg2 || c.bg);
    g.fillStyle = sfondo; g.fillRect(0, 0, W, H);
    g.textBaseline = 'alphabetic';
    const P = penna(g, d, false, R);
    for (const p of imp.pagine[n] || []) SEZIONI[p.s.tipo](P, d, p.s, p.x, p.y, p.w, []);
    const tot = imp.pagine.length;
    if (tot > 1) {
      P.font(500, 19);
      P.scrivi(String(d.nome || ''), M, H - M + 24, { colore: c.tenue });
      P.scrivi(d.testi?.pagina ? d.testi.pagina(n + 1, tot) : `${n + 1} / ${tot}`, W - M, H - M + 24, { allinea: 'right', colore: c.tenue });
    }
    return R;
  }

  const KIT = { W, H, M, PAGINE, ALTO, BASSO, LIMITI, CARATTERI, impagina, disegnaPagina, misura, veste, mescola, urlKit, emailKit, contrasto, inchiostro, righe, elenco, taglia, rgbDi };
  if (typeof module !== 'undefined' && module.exports) module.exports = KIT;
  else radice.SB_KIT = KIT;
})(typeof window !== 'undefined' ? window : globalThis);
