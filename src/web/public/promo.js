// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';
  const penna = () => radice.SB_PENNA;

  const COLORI = {
    fondo: '#e8e2d5', carta: '#fdfbf6', china: '#150910', testo: '#1a1919', acc: '#ba007a',
    grigio: '#5c5852', matita: 'rgba(92,88,82,.62)', spettatore: '#2d6e8e',
  };
  const MANO = "'Permanent Marker', 'Mano Riserva', cursive";
  const TESTO = "Archivo, 'Archivo Riserva', sans-serif";

  const TESTI = {
    it: {
      titolo: 'Il bot che in~chat scrive *con~il~tuo~nome.*', offerta: 'Un anno di tutto, | *gratis.*', nota: 'sei tu, non un bot',
      testa: 'Chat in diretta', spettatore: 'mia_gioca', domanda: '!social', tuo: 'iltuonome', risposta: 'ciao Mia! tutti i miei link sono qui',
      link: 'socialbot.live/u/iltuonome', didascalia: 'Inquadra: un anno di tutto, gratis', piattaforme: 'Twitch, Kick',
    },
    en: {
      titolo: 'The bot that writes *under~your~name.*', offerta: 'One year of everything, | *free.*', nota: "that's you, not a bot",
      testa: 'Live chat', spettatore: 'mia_plays', domanda: '!socials', tuo: 'yourname', risposta: 'hey Mia! all my links are here',
      link: 'socialbot.live/u/yourname', didascalia: 'Scan it: one year of everything, free', piattaforme: 'Twitch, Kick',
    },
    es: {
      titolo: 'El bot que escribe en~el~chat *con~tu~nombre.*', offerta: 'Un año de todo, | *gratis.*', nota: 'eres tú, no un bot',
      testa: 'Chat en directo', spettatore: 'mia_juega', domanda: '!redes', tuo: 'tunombre', risposta: '¡hola Mia! todos mis enlaces están aquí',
      link: 'socialbot.live/u/tunombre', didascalia: 'Escanéalo: un año de todo, gratis', piattaforme: 'Twitch, Kick',
    },
  };

  const TEMPI = {
    piena: { durata: 15, logo: 0.2, titolo: 1, chat: 2.3, domanda: 3.9, risposta: 4.9, qr: 2.9, freccia: 5.5, piattaforme: 6.2, indirizzo: 6.9 },
    essenziale: { durata: 15, logo: 0, titolo: 1.6, indirizzo: 2.6 },
    anteprima: { durata: 6, logo: 0, titolo: 1.2, indirizzo: 2.4 },
  };
  const DURATE = { logo: 1.4, parola: 0.55, riga: 0.35, qr: 0.5, freccia: 0.85, piattaforma: 0.42, ovale: 0.5, indirizzo: 0.95, gradino: 0.1 };
  const FERMA = 3;

  const FORMATI = [
    { id: 'orizzontale', nome: 'Schermo orizzontale', w: 1920, h: 1080 },
    { id: 'verticale', nome: 'Schermo verticale', w: 1080, h: 1920 },
    { id: 'times-square', nome: 'Times Square (grande)', w: 3744, h: 2196 },
    { id: 'quadrato', nome: 'Quadrato', w: 1080, h: 1080 },
    { id: 'anteprima', nome: 'Anteprima del link', w: 1200, h: 630 },
  ];

  const FACCINA = /[:;=]\s?['-]?\s?[)(|\[\]DPpOo0l1I\\/](?![A-Za-z0-9])/;
  const faccina = (testo) => { const m = String(testo || '').replace(/[*|]/g, '').match(FACCINA); return m ? m[0] : ''; };

  const tra = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const passo = (t) => Math.floor(t * 12 + 1e-6) / 12;
  const sale = (x) => { const c1 = 1.25, c3 = c1 + 1; return x <= 0 ? 0 : x >= 1 ? 1 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const numero = (v, def, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def; };

  function tela(w, h) {
    if (typeof document === 'undefined') return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }

  function inviluppo(pt) {
    pt.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pt) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pt.length - 1; i >= 0; i--) { const p = pt[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  const areaDi = (P) => Math.abs(P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

  function buchiChiusi(dati, W, H) {
    const pieno = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) pieno[i] = dati[i * 4 + 3] >= 128 ? 1 : 0;
    const lab = new Int32Array(W * H).fill(-1);
    const out = [];
    const pila = new Int32Array(W * H);
    for (let s = 0; s < W * H; s++) {
      if (pieno[s] || lab[s] >= 0) continue;
      const id = out.length;
      let n = 0, cima = 0, bordo = false;
      pila[cima++] = s; lab[s] = id;
      const punti = [];
      while (cima) {
        const p = pila[--cima], x = p % W, y = (p / W) | 0;
        n++;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) bordo = true;
        if (!bordo) punti.push(x, y);
        if (x > 0 && !pieno[p - 1] && lab[p - 1] < 0) { lab[p - 1] = id; pila[cima++] = p - 1; }
        if (x < W - 1 && !pieno[p + 1] && lab[p + 1] < 0) { lab[p + 1] = id; pila[cima++] = p + 1; }
        if (y > 0 && !pieno[p - W] && lab[p - W] < 0) { lab[p - W] = id; pila[cima++] = p - W; }
        if (y < H - 1 && !pieno[p + W] && lab[p + W] < 0) { lab[p + W] = id; pila[cima++] = p + W; }
      }
      if (bordo) { out.push(null); continue; }
      const pt = [];
      for (let k = 0; k < punti.length; k += 2) { const x = punti[k], y = punti[k + 1]; pt.push([x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]); }
      const hull = inviluppo(pt);
      out.push({ id, n, hull, pieno: n / areaDi(hull) });
    }
    return out.filter(Boolean);
  }

  function rettangoloMinimo(hull) {
    let m = null;
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i], b = hull[(i + 1) % hull.length];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!l) continue;
      const u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], v = [-u[1], u[0]];
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const p of hull) {
        const pu = p[0] * u[0] + p[1] * u[1], pv = p[0] * v[0] + p[1] * v[1];
        u0 = Math.min(u0, pu); u1 = Math.max(u1, pu); v0 = Math.min(v0, pv); v1 = Math.max(v1, pv);
      }
      const area = (u1 - u0) * (v1 - v0);
      if (!m || area < m.area) m = { area, u, v, u0, u1, v0, v1 };
    }
    let { u, v, u0, u1, v0, v1 } = m;
    if (Math.abs(u[0]) < Math.abs(u[1])) { [u, v] = [v, u]; [u0, u1, v0, v1] = [v0, v1, u0, u1]; }
    if (u[0] < 0) { u = [-u[0], -u[1]]; [u0, u1] = [-u1, -u0]; }
    if (v[1] < 0) { v = [-v[0], -v[1]]; [v0, v1] = [-v1, -v0]; }
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    const centro = [cu * u[0] + cv * v[0], cu * u[1] + cv * v[1]];
    return { centro, u, v, larg: u1 - u0, alto: v1 - v0 };
  }

  async function prepara(sorgente, opz) {
    const o = Object.assign({ scala: 2 }, opz || {});
    const img = typeof sorgente === 'string' ? await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('logo non caricato')); i.src = sorgente; }) : sorgente;
    const W = Math.round((img.naturalWidth || img.width) * o.scala), H = Math.round((img.naturalHeight || img.height) * o.scala);
    const c = tela(W, H), g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    const buchi = buchiChiusi(d, W, H).sort((a, b) => a.pieno - b.pieno);
    const faccia = buchi[0];
    if (!faccia || faccia.pieno > 0.8 || (buchi[1] && buchi[1].pieno < 0.88)) throw new Error('logo: non trovo la finestra della faccia');
    const R = rettangoloMinimo(faccia.hull);
    const punto = (x, y) => [R.centro[0] + R.u[0] * x * R.larg + R.v[0] * y * R.alto, R.centro[1] + R.u[1] * x * R.larg + R.v[1] * y * R.alto];
    const scuro = (x, y) => { const i = (Math.round(y) * W + Math.round(x)) * 4; return d[i + 3] >= 128 && (d[i] + d[i + 1] + d[i + 2]) / 3 < 90; };
    const lati = [[0, -0.5, 0, -1, 1, 0], [0.5, 0, 1, 0, 0, 1], [0, 0.5, 0, 1, 1, 0], [-0.5, 0, -1, 0, 0, 1]];
    const spessori = [];
    for (const [x, y, dx, dy, sx, sy] of lati) {
      for (const f of [-0.3, -0.15, 0, 0.15, 0.3]) {
        const p = punto(x + sx * f, y + sy * f), dir = [R.u[0] * dx + R.v[0] * dy, R.u[1] * dx + R.v[1] * dy];
        let k = 0, n = 0;
        while (k < 8 && !scuro(p[0] + dir[0] * k, p[1] + dir[1] * k)) k++;
        while (n < 200 && scuro(p[0] + dir[0] * (k + n), p[1] + dir[1] * (k + n))) n++;
        spessori.push(n);
      }
    }
    spessori.sort((a, b) => a - b);
    const spessore = Math.max(2, spessori[Math.floor(spessori.length / 2)]);
    let cr = 0, cg = 0, cb = 0, cn = 0;
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const dx = xx - R.centro[0], dy = yy - R.centro[1];
      const pu = (dx * R.u[0] + dy * R.u[1]) / R.larg, pv = (dx * R.v[0] + dy * R.v[1]) / R.alto;
      if (Math.abs(pu) > 0.5 || Math.abs(pv) > 0.5) continue;
      const i = (yy * W + xx) * 4;
      if (d[i + 3] < 200 || (d[i] + d[i + 1] + d[i + 2]) / 3 < 90) continue;
      cr += d[i]; cg += d[i + 1]; cb += d[i + 2]; cn++;
    }
    const colore = cn ? `rgb(${Math.round(cr / cn)},${Math.round(cg / cn)},${Math.round(cb / cn)})` : COLORI.acc;
    const img2 = g.getImageData(0, 0, W, H), e = img2.data;
    const cresce = 3 * spessore;
    const zona = (xx, yy) => {
      const dx = xx + 0.5 - R.centro[0], dy = yy + 0.5 - R.centro[1];
      return Math.abs(dx * R.u[0] + dy * R.u[1]) <= R.larg / 2 + cresce && Math.abs(dx * R.v[0] + dy * R.v[1]) <= R.alto / 2 + cresce;
    };
    const colorato = (q) => e[q * 4 + 3] >= 128 && (e[q * 4] + e[q * 4 + 1] + e[q * 4 + 2]) / 3 >= 40;
    const conta = new Map();
    for (let yy = 0; yy < H; yy += 2) for (let xx = 0; xx < W; xx += 2) {
      const i = (yy * W + xx) * 4;
      if (e[i + 3] < 250 || (e[i] + e[i + 1] + e[i + 2]) / 3 >= 60 || !zona(xx, yy)) continue;
      const k = (e[i] << 16) | (e[i + 1] << 8) | e[i + 2];
      conta.set(k, (conta.get(k) || 0) + 1);
    }
    const moda = [...conta.entries()].sort((a, b) => b[1] - a[1])[0];
    const nero = moda ? [moda[0] >> 16 & 255, moda[0] >> 8 & 255, moda[0] & 255] : [21, 9, 16];
    const visto = new Uint8Array(W * H);
    const raggio = Math.hypot(R.larg, R.alto) / 2 + cresce;
    const x0 = Math.max(0, Math.floor(R.centro[0] - raggio)), x1 = Math.min(W - 1, Math.ceil(R.centro[0] + raggio));
    const y0 = Math.max(0, Math.floor(R.centro[1] - raggio)), y1 = Math.min(H - 1, Math.ceil(R.centro[1] + raggio));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const s0 = yy * W + xx;
      if (visto[s0] || !zona(xx, yy) || !colorato(s0)) continue;
      const pila = [s0], comp = [];
      let fuori = false;
      visto[s0] = 1;
      while (pila.length) {
        const q = pila.pop(), qx = q % W, qy = (q / W) | 0;
        comp.push(q);
        for (const [nx, ny] of [[qx - 1, qy], [qx + 1, qy], [qx, qy - 1], [qx, qy + 1]]) {
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) { fuori = true; continue; }
          const n = ny * W + nx;
          if (visto[n] || !colorato(n)) continue;
          if (!zona(nx, ny)) { fuori = true; continue; }
          visto[n] = 1; pila.push(n);
        }
      }
      if (fuori) continue;
      for (const q of comp) {
        const qx = q % W, qy = (q / W) | 0;
        for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
          const nx = qx + ox, ny = qy + oy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const n = ny * W + nx;
          if (e[n * 4 + 3] < 128) continue;
          e[n * 4] = nero[0]; e[n * 4 + 1] = nero[1]; e[n * 4 + 2] = nero[2]; e[n * 4 + 3] = 255;
        }
      }
    }
    g.putImageData(img2, 0, 0);
    const P = penna();
    const angoli = [punto(-0.5, -0.5), punto(0.5, -0.5), punto(0.5, 0.5), punto(-0.5, 0.5)];
    g.fillStyle = COLORI.carta;
    g.beginPath(); angoli.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
    const inchiostro = `rgb(${nero.join(',')})`;
    const china = (guida, larghezza, seme) => { g.fillStyle = inchiostro; g.fill(new Path2D(P.tratto(guida, { larghezza, punta: 'china', seme, passo: 0.5 }).d)); };
    const giro = angoli.concat([angoli[0], [angoli[0][0] + (angoli[1][0] - angoli[0][0]) * 0.3, angoli[0][1] + (angoli[1][1] - angoli[0][1]) * 0.3]]);
    const lato = Math.min(R.larg, R.alto);
    china(giro, Math.min(spessore * 0.5, lato * 0.08), 'faccia:bordo');
    const segno = lato * 0.045;
    for (const x of [-0.2, 0.2]) {
      const c0 = punto(x, -0.12), r = 0.1 * lato;
      g.fillStyle = colore; g.beginPath(); g.arc(c0[0], c0[1], r, 0, Math.PI * 2); g.fill();
      china(P.ovale(c0[0], c0[1], r, r, { seme: 'faccia:occhio' + x, giri: 1.06, stringe: 0.02, inclina: 0 }), segno, 'faccia:o' + x);
    }
    const sx = punto(-0.22, 0.12), dx = punto(0.22, 0.12), giu = punto(0, 0.42), su = punto(0, 0.26);
    g.fillStyle = colore;
    g.beginPath(); g.moveTo(sx[0], sx[1]); g.quadraticCurveTo(giu[0], giu[1], dx[0], dx[1]); g.quadraticCurveTo(su[0], su[1], sx[0], sx[1]); g.fill();
    china([sx, { q: [giu, dx] }, { q: [su, sx] }, { q: [punto(-0.2, 0.2), punto(-0.12, 0.25)] }], segno, 'faccia:bocca');
    return { tela: c, larg: W, alto: H, rap: H / W, faccia: { angoli, spessore, spessori, colore } };
  }

  const CORTA = /^[\p{L}\p{N}]{1,2}$/u;

  function parole(testo) {
    const out = [];
    let em = false;
    for (const pezzo of String(testo || '').split(/\s+/).filter(Boolean)) {
      if (pezzo === '|') { out.push({ capo: true }); continue; }
      let t = pezzo;
      if (t.startsWith('*')) { em = true; t = t.slice(1); }
      const chiude = t.endsWith('*');
      if (chiude) t = t.slice(0, -1);
      if (t) {
        const prima = out[out.length - 1], parola = t.replace(/~+/g, ' ');
        if (prima && prima.corta && prima.em === em) prima.t += ' ' + parola;
        else out.push({ t: parola, em });
        out[out.length - 1].corta = CORTA.test(t);
      }
      if (chiude) em = false;
    }
    return out.map((p) => (p.capo ? p : { t: p.t, em: p.em }));
  }

  function bilancia(ctx, pezzi, font, maxW) {
    ctx.font = font;
    const sp = ctx.measureText(' ').width, righe = [], seg = [[]];
    for (const p of pezzi) { if (p.capo) seg.push([]); else seg[seg.length - 1].push(p); }
    for (const g of seg) {
      if (!g.length) continue;
      const larg = g.map((p) => ctx.measureText(p.t).width);
      const r = spezza(larg, sp, maxW);
      if (!r) return null;
      for (const [a, b] of r) {
        let x = 0;
        righe.push(g.slice(a, b).map((p, k) => { const q = { t: p.t, font, x, w: larg[a + k] }; x += larg[a + k] + sp; return q; }));
      }
    }
    return righe;
  }

  function spezza(larg, spazio, maxW) {
    const n = larg.length, costo = new Array(n + 1).fill(Infinity), da = new Array(n + 1).fill(0);
    costo[0] = 0;
    for (let j = 1; j <= n; j++) {
      let w = -spazio;
      for (let i = j - 1; i >= 0; i--) {
        w += larg[i] + spazio;
        if (w > maxW) break;
        const c = costo[i] + (maxW - w) ** 2;
        if (c < costo[j]) { costo[j] = c; da[j] = i; }
      }
    }
    if (!Number.isFinite(costo[n])) return null;
    const righe = [];
    for (let j = n; j > 0; j = da[j]) righe.unshift([da[j], j]);
    return righe;
  }

  function impagina(ctx, pezzi, o) {
    const seg = [[]];
    for (const p of pezzi) { if (p.capo) seg.push([]); else seg[seg.length - 1].push(p); }
    const lh = o.lh || 1.04;
    for (let s = o.s0; s >= o.s0 * 0.25; s *= 0.97) {
      ctx.font = `${o.peso || 400} ${s}px ${o.famiglia}`;
      const spazio = ctx.measureText(' ').width;
      const righe = [];
      let ok = true;
      for (const g of seg) {
        if (!g.length) continue;
        const larg = g.map((p) => ctx.measureText(p.t).width);
        const r = spezza(larg, spazio, o.maxW);
        if (!r) { ok = false; break; }
        for (const [a, b] of r) {
          let x = 0;
          righe.push(g.slice(a, b).map((p, k) => { const q = { t: p.t, em: p.em, x, w: larg[a + k] }; x += larg[a + k] + spazio; return q; }));
        }
      }
      if (ok && righe.length && righe.length * s * lh <= o.maxH) {
        const larghezza = Math.max(...righe.map((r) => r[r.length - 1].x + r[r.length - 1].w));
        return { s, lh: s * lh, righe, larghezza, altezza: righe.length * s * lh };
      }
    }
    return null;
  }

  function avvolgi(ctx, pezzi, maxW) {
    const righe = [[]];
    let x = 0;
    for (const p of pezzi) {
      ctx.font = p.font;
      const w = ctx.measureText(p.t).width, sp = ctx.measureText(' ').width;
      const salto = x > 0 && !p.unito ? sp : 0;
      if (x > 0 && x + salto + w > maxW && !p.unito) { righe.push([]); x = 0; }
      const dx = x > 0 && !p.unito ? sp : 0;
      righe[righe.length - 1].push(Object.assign({}, p, { x: x + dx, w }));
      x += dx + w;
    }
    return righe;
  }

  function metriche(ctx, font) {
    ctx.font = font;
    const m = ctx.measureText('Hg');
    return { su: m.fontBoundingBoxAscent || m.actualBoundingBoxAscent, giu: m.fontBoundingBoxDescent || m.actualBoundingBoxDescent };
  }

  const tocca = (a, b, marg) => a.x < b.x + b.w - marg && b.x < a.x + a.w - marg && a.y < b.y + b.h - marg && b.y < a.y + a.h - marg;

  function crea(conf) {
    const P = penna();
    const w = Math.round(conf.w), h = Math.round(conf.h);
    const versione = ['piena', 'essenziale', 'anteprima'].includes(conf.versione) ? conf.versione : 'piena';
    const lingua = TESTI[conf.lingua] ? conf.lingua : 'it';
    const T = Object.assign({}, TESTI[lingua], conf.testi || {});
    const base = TEMPI[versione];
    const tempi = {};
    for (const k of Object.keys(base)) tempi[k] = numero(conf.tempi && conf.tempi[k], base[k], 0, k === 'durata' ? 120 : 110);
    const logo = conf.logo;
    const seme = String(conf.seme || 'promo') + ':' + w + 'x' + h + ':' + versione;
    const ver = h > w * 1.15;
    const U = ver ? Math.min(w / 1080, h / 1920) * 0.911 : Math.min(w / 1920, h / 1080) * Math.min(1.45, Math.max(1, (16 / 9) / (w / h)));
    const misura = tela(8, 8).getContext('2d');
    const conQr = versione === 'piena' && !!conf.qr;
    const indirizzo = String(conf.indirizzo || 'socialbot.live');
    const problemi = [];
    const B = {};

    const logoBox = (x, y, lw) => ({ x, y, w: lw, h: lw * logo.rap });
    if (versione === 'piena' && !ver) {
      B.logo = logoBox(0.057 * w, 0.065 * h, 0.28 * w);
      B.chat = { x: 0.6 * w, y: 0.065 * h, w: 0.345 * w, s: 36 * U };
      B.indirizzo = { x: 0.057 * w, y: 0.855 * h, s: 84 * U, max: 0.5 * w };
      B.piattaforme = { x: 0.057 * w, y: 0.765 * h, s: 34 * U };
      B.nota = { lato: 'sinistra', s: 44 * U };
      B.fuoco = [0.77, 0.45];
    } else if (versione === 'piena') {
      B.logo = logoBox(0.16 * w, 0.03 * h, 0.68 * w);
      B.chat = { x: 0.1 * w, y: B.logo.y + B.logo.h + 0.014 * h, w: 0.83 * w, s: 38 * U };
      B.indirizzo = { x: 0.1 * w, y: 0.918 * h, s: 80 * U, max: 0.83 * w };
      B.nota = { lato: 'sotto', s: 42 * U };
      B.fuoco = [0.5, 0.5];
    } else if (!ver) {
      const lw = (versione === 'anteprima' ? 0.4 : 0.4) * w;
      B.logo = logoBox((w - lw) / 2, 0.09 * h, lw);
      B.indirizzo = { x: 0.5 * w, y: 0.81 * h, s: 96 * U, centro: true, max: 0.9 * w };
      B.fuoco = [0.5, 0.26];
    } else {
      B.logo = logoBox(0.1 * w, 0.08 * h, 0.8 * w);
      B.indirizzo = { x: 0.5 * w, y: 0.785 * h, s: 108 * U, centro: true, max: 0.9 * w };
      B.fuoco = [0.5, 0.18];
    }

    const fIndirizzo = (s) => `800 ${s}px ${TESTO}`;
    {
      const I = B.indirizzo;
      misura.font = fIndirizzo(I.s);
      let lw = misura.measureText(indirizzo).width;
      if (lw > I.max) { I.s *= I.max / lw; misura.font = fIndirizzo(I.s); lw = misura.measureText(indirizzo).width; }
      const m = metriche(misura, fIndirizzo(I.s));
      I.w = lw; I.h = (m.su + m.giu) * 1.05 + 16 * U;
      if (I.centro) I.x -= lw / 2;
      I.base = I.y + (I.h - 16 * U - (m.su + m.giu)) / 2 + m.su;
    }

    if (B.chat) {
      const C = B.chat, pad = { x: 44 * U, y: 36 * U };
      const dentro = C.w - 2 * pad.x;
      {
        const parole = [[800, T.spettatore], [800, T.tuo], [700, ...String(T.link).split(/\s+/)], [500, ...String(T.domanda).split(/\s+/), ...String(T.risposta).split(/\s+/)]];
        let largo = 0;
        for (const [peso, ...pp] of parole) for (const x of pp) { misura.font = `${peso} ${C.s}px ${TESTO}`; largo = Math.max(largo, misura.measureText(x + (peso === 800 ? ':' : '')).width); }
        if (largo > dentro) C.s *= dentro / largo * 0.98;
      }
      const fN = `500 ${C.s}px ${TESTO}`, fB = `800 ${C.s}px ${TESTO}`, fL = `700 ${C.s}px ${TESTO}`;
      const riga = (nome, colore, testo, link) => [{ t: nome, font: fB, colore, nome: true }, { t: ':', font: fN, colore: COLORI.china, unito: true }]
        .concat(String(testo).split(/\s+/).filter(Boolean).map((t) => ({ t, font: fN, colore: COLORI.china })))
        .concat(link ? String(link).split(/\s+/).filter(Boolean).map((t) => ({ t, font: fL, colore: COLORI.china, sotto: true })) : []);
      const r1 = avvolgi(misura, riga(T.spettatore, COLORI.spettatore, T.domanda), dentro);
      const r2 = avvolgi(misura, riga(T.tuo, COLORI.acc, T.risposta, T.link), dentro);
      const lh = C.s * 1.28, testaS = 22 * U;
      const mt = metriche(misura, fN);
      const testaH = testaS * 1.3, gap = 20 * U;
      C.pad = pad; C.lh = lh; C.testaS = testaS; C.testaH = testaH; C.gap = gap; C.su = mt.su; C.giu = mt.giu;
      C.r1 = r1; C.r2 = r2;
      if ([...r1, ...r2].some((r) => r.length && r[r.length - 1].x + r[r.length - 1].w > dentro + 0.5)) problemi.push({ cosa: 'chat', dice: 'Una riga della chat esce dalla sua carta' });
      C.h = pad.y * 2 + testaH + gap + r1.length * lh + gap + r2.length * lh;
      const y2 = C.y + pad.y + testaH + gap + r1.length * lh + gap;
      const nome = r2[0][0];
      C.nome = { x: C.x + pad.x + nome.x, y: y2, w: nome.w, h: lh };
      C.forma = P.forma(C.x, C.y, C.w, C.h, { seme: seme + ':chat', rag: 14 * U, angoli: 0.02, bombatura: 0.01 });
      C.ombra = P.forma(C.x + 12 * U, C.y + 12 * U, C.w, C.h, { seme: seme + ':chat-ombra', rag: 14 * U, angoli: 0.02, bombatura: 0.01 });
      C.costruzione = P.costruzione(C.forma, { seme: seme + ':chat-mat', sborda: 13 * U });
      if (C.forma.margine + 3 * U > Math.min(pad.x, pad.y)) problemi.push({ cosa: 'chat', dice: 'La carta della chat è troppo storta per il suo testo' });
    }

    if (B.nota && B.chat) {
      const N = B.nota, C = B.chat;
      const f = `400 ${N.s}px ${MANO}`, m = metriche(misura, f);
      misura.font = f;
      const pz = parole(T.nota);
      const sp = misura.measureText(' ').width;
      let x = 0;
      N.parole = pz.map((p) => { const tw = misura.measureText(p.t).width; const o = { t: p.t, x, w: tw }; x += tw + sp; return o; });
      N.w = Math.max(0, x - sp); N.h = (m.su + m.giu) * 1.1; N.f = f; N.base = m.su;
      if (N.lato === 'sinistra') { N.x = C.x - 70 * U - N.w; N.y = C.nome.y + C.nome.h + 60 * U; }
      else { N.x = C.x + 70 * U; N.y = C.y + C.h + 50 * U; }
      N.ang = -4 * Math.PI / 180;
      const b = [C.nome.x - 12 * U, C.nome.y + C.nome.h * 0.52];
      const bordo = C.x - 40 * U;
      if (N.lato === 'sinistra') {
        const a = [N.x + N.w + 14 * U, N.y + N.h * 0.35];
        N.guida = [a, { c: [[a[0] + (bordo - a[0]) * 0.8, a[1] + 6 * U], [bordo - 10 * U, b[1] + 8 * U], b] }];
      } else {
        const a = [N.x - 16 * U, N.y + N.h * 0.4];
        N.guida = [a, { c: [[bordo - 8 * U, a[1] - 10 * U], [bordo - 14 * U, b[1] + 40 * U], b] }];
      }
      N.box = { x: N.x - 4 * U, y: N.y - N.w * Math.abs(Math.sin(N.ang)) - 4 * U, w: N.w + 8 * U, h: N.h + N.w * Math.abs(Math.sin(N.ang)) + 8 * U };
    }

    if (versione === 'piena' && !ver) {
      B.qr = conQr ? { x: 0.6 * w, y: B.chat.y + B.chat.h + 0.035 * h, w: 0.345 * w, disp: 'sopra', cap: 40 * U, lato: 0.345 * h } : null;
      if (B.qr) B.qr.h = 0.935 * h - B.qr.y;
      B.titolo = { x: 0.057 * w, y: Math.max(B.logo.y + B.logo.h + 0.05 * h, B.nota.box.y + B.nota.box.h + 0.012 * h), maxW: 0.5 * w, s0: 130 * U };
      B.titolo.maxH = B.piattaforme.y - 0.03 * h - B.titolo.y;
    } else if (versione === 'piena') {
      const C = B.chat;
      B.qr = conQr ? { x: 0.1 * w, w: 0.83 * w, h: 0.246 * h, disp: 'accanto', cap: 50 * U, lato: 0.176 * h } : null;
      const sotto = B.indirizzo.y - 0.02 * h;
      if (B.qr) B.qr.y = sotto - B.qr.h;
      B.piattaforme = { x: 0.1 * w, y: (B.qr ? B.qr.y : sotto) - 0.044 * h, s: 34 * U };
      B.titolo = { x: 0.1 * w, y: B.nota.box.y + B.nota.box.h + 0.03 * h, maxW: 0.83 * w, s0: 104 * U };
      B.titolo.maxH = B.piattaforme.y - 0.02 * h - B.titolo.y;
    } else if (!ver) {
      const alto = B.logo.y + B.logo.h + 0.05 * h;
      B.titolo = { x: 0.05 * w, y: alto, maxW: 0.9 * w, s0: (versione === 'anteprima' ? 150 : 124) * U, centro: true };
      B.titolo.maxH = B.indirizzo.y - 0.05 * h - alto;
    } else {
      const alto = B.logo.y + B.logo.h + 0.05 * h;
      B.titolo = { x: 0.07 * w, y: alto, maxW: 0.86 * w, s0: 150 * U, centro: true };
      B.titolo.maxH = B.indirizzo.y - 0.04 * h - alto;
    }

    {
      const Ti = B.titolo;
      const testo = versione === 'anteprima' ? T.offerta : T.titolo;
      const imp = Ti.maxH > 0 ? impagina(misura, parole(testo), { famiglia: MANO, s0: Ti.s0, maxW: Ti.maxW, maxH: Ti.maxH }) : null;
      if (!imp) problemi.push({ cosa: 'titolo', dice: 'Il titolo non ci sta: accorcialo, o manda a capo con |' });
      Ti.imp = imp;
      if (imp) {
        Ti.h = imp.altezza; Ti.w = imp.larghezza;
        if (Ti.centro) { Ti.x = (w - imp.larghezza) / 2; Ti.y += (Ti.maxH - imp.altezza) / 2; }
        const m = metriche(misura, `400 ${imp.s}px ${MANO}`);
        Ti.base = (imp.lh - (m.su + m.giu)) / 2 + m.su;
        Ti.ombra = 6 * U;
      } else { Ti.h = 0; Ti.w = 0; }
    }

    if (B.piattaforme) {
      const Pf = B.piattaforme;
      const voci = String(T.piattaforme || '').split(',').map((x) => x.trim()).filter(Boolean);
      const f = `400 ${Pf.s}px ${MANO}`;
      const m = metriche(misura, f);
      misura.font = f;
      let x = Pf.x;
      const ry = Pf.s * 0.55 + 14 * U;
      Pf.voci = voci.map((t, i) => {
        const tw = misura.measureText(t).width, rx = tw / 2 + 22 * U;
        const cx = x + rx, cy = Pf.y + ry;
        x += 2 * rx + 26 * U;
        return { t, tw, cx, cy, rx, ry, base: cy - (m.su + m.giu) / 2 + m.su, ovale: P.ovale(cx, cy, rx, ry, { seme: seme + ':piatt' + i }) };
      });
      Pf.w = Math.max(0, x - 26 * U - Pf.x); Pf.h = 2 * ry * 1.08;
      Pf.f = f;
      if (!voci.length) { Pf.w = 0; Pf.h = 0; }
    }

    if (B.qr) {
      const Q = B.qr;
      const q = radice.qrcode ? radice.qrcode(0, 'M') : null;
      if (!q) throw new Error('manca il generatore di QR');
      q.addData(String(conf.qr)); q.make();
      const n = q.getModuleCount();
      Q.n = n; Q.buio = (x, y) => q.isDark(y, x);
      const fc = `400 ${Q.cap}px ${MANO}`, mc = metriche(misura, fc), lhc = Q.cap * 1.08;
      Q.fc = fc; Q.lhc = lhc; Q.suC = mc.su;
      const riquadra = (lato) => {
        const mod = lato / n, quiete = Math.max(4 * mod, 40 * U);
        if (Q.disp === 'sopra') {
          const righe = bilancia(misura, parole(T.didascalia), fc, Q.w - 80 * U);
          const capH = (righe || []).length * lhc;
          const qx = Q.x + (Q.w - lato) / 2, qy = Q.y + Q.h - lato - quiete;
          const capY = Q.y + 34 * U;
          const ok = Boolean(righe) && capY + capH <= qy - 4 * mod && lato + 2 * quiete <= Q.w;
          return { ok, mod, quiete, qx, qy, righe: righe || [], capX: Q.x + 40 * U, capW: Q.w - 80 * U, capY, capH, centro: true };
        }
        const qx = Q.x + quiete, qy = Q.y + (Q.h - lato) / 2;
        const capX = qx + lato + quiete, capW = Q.x + Q.w - 30 * U - capX;
        const righe = bilancia(misura, parole(T.didascalia), fc, Math.max(10, capW));
        const capH = (righe || []).length * lhc;
        const ok = Boolean(righe) && lato + 2 * quiete <= Q.h && capW > 60 * U && capH <= Q.h - 20 * U;
        return { ok, mod, quiete, qx, qy, righe: righe || [], capX, capW, capY: Q.y + (Q.h - capH) / 2, capH, centro: false };
      };
      let lato = Q.lato, r = riquadra(lato);
      while (!r.ok && lato > 60 * U) { lato *= 0.97; r = riquadra(lato); }
      if (r.ok && Q.disp === 'sopra') {
        const serve = r.capY - Q.y + r.capH + 4 * r.mod + lato + r.quiete + 1;
        if (serve < Q.h) { Q.y += Q.h - serve; Q.h = serve; r = riquadra(lato); }
      }
      if (!r.ok) problemi.push({ cosa: 'qr', dice: 'Il QR e la sua didascalia non ci stanno nella carta' });
      Object.assign(Q, r, { lato });
      const margini = [Q.qx - Q.x, Q.x + Q.w - Q.qx - lato, Q.qy - Q.y, Q.y + Q.h - Q.qy - lato];
      if (Math.min(...margini) < 4 * Q.mod - 0.5) problemi.push({ cosa: 'qr', dice: 'Il QR ha meno di 4 moduli di margine: i telefoni fanno fatica a leggerlo' });
      Q.forma = P.forma(Q.x, Q.y, Q.w, Q.h, { seme: seme + ':qr', rag: 14 * U, angoli: 0.02, bombatura: 0.01 });
      Q.ombra = P.forma(Q.x + 12 * U, Q.y + 12 * U, Q.w, Q.h, { seme: seme + ':qr-ombra', rag: 14 * U, angoli: 0.02, bombatura: 0.01 });
      Q.costruzione = P.costruzione(Q.forma, { seme: seme + ':qr-mat', sborda: 13 * U });
      if (Q.forma.margine >= Q.quiete) problemi.push({ cosa: 'qr', dice: 'La carta del QR è troppo storta per il suo margine' });
    }

    {
      const I = B.indirizzo;
      const r = { x: I.x, y: I.base, w: I.w };
      const y = r.y + 12 * U;
      const a = [r.x - 10 * U, y + 6 * U], b = [r.x + r.w - 4 * U, y - 2 * U], fine = [r.x + r.w + 22 * U, y - 16 * U];
      I.sotto = [a, { c: [[a[0] + (b[0] - a[0]) * 0.35, y + 11 * U], [a[0] + (b[0] - a[0]) * 0.7, y + 1 * U], b] }, { q: [[b[0] + 14 * U, y - 4 * U], fine] }];
      I.box = { x: r.x - 12 * U, y: I.y, w: r.w + 36 * U, h: I.h + 12 * U };
    }

    const fondo = tela(w, h);
    {
      const g = fondo.getContext('2d');
      g.fillStyle = COLORI.fondo; g.fillRect(0, 0, w, h);
      const fx = B.fuoco[0] * w, fy = B.fuoco[1] * h;
      g.save(); g.translate(fx, fy); g.scale(1.1 * w, 0.85 * h);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, 'rgba(186,0,122,.10)'); gr.addColorStop(0.64, 'rgba(186,0,122,0)');
      g.fillStyle = gr; g.fillRect(-2, -2, 4, 4); g.restore();
      g.fillStyle = 'rgba(21,9,16,.11)';
      const p = 14 * U, r = 1.7 * U;
      for (let y = p / 2; y < h; y += p) for (let x = p / 2; x < w; x += p) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    }
    const raggi = [];
    {
      const r = P.caso(seme + ':raggi'), fx = B.fuoco[0] * w, fy = B.fuoco[1] * h;
      const Rin = B.chat ? Math.hypot(B.chat.w, B.chat.h) * 0.58 : 0.2 * Math.min(w, h);
      const Rout = Math.hypot(w, h);
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2 + (r() - 0.5) * 0.05;
        const ri = Rin * (1 + r() * 0.5), lg = 0.004 + r() * 0.006;
        raggi.push({ a, ri, fx, fy, Rout, colore: i % 3 ? 'rgba(21,9,16,.10)' : 'rgba(186,0,122,.16)', da: r() * 0.35,
          p1: [fx + Math.cos(a - lg) * Rout, fy + Math.sin(a - lg) * Rout], p2: [fx + Math.cos(a + lg) * Rout, fy + Math.sin(a + lg) * Rout] });
      }
    }

    const quando = {
      logo: tempi.logo + DURATE.logo,
      titolo: B.titolo.imp ? tempi.titolo + (B.titolo.imp.righe.flat().length - 1) * (versione === 'piena' ? DURATE.gradino : 0.13) + DURATE.parola : 0,
      indirizzo: tempi.indirizzo + DURATE.indirizzo,
    };
    const fineCarta = (t0) => t0 + 0.64 + 0.75;
    if (B.chat) quando.chat = Math.max(fineCarta(tempi.chat), tempi.risposta + DURATE.riga);
    if (B.qr) quando.qr = fineCarta(tempi.qr) + 0.4;
    if (B.nota) quando.nota = Math.max(tempi.freccia + DURATE.freccia, tempi.freccia + 0.4 + (B.nota.parole.length - 1) * 0.09 + DURATE.parola);
    if (B.piattaforme && B.piattaforme.voci.length) quando.piattaforme = tempi.piattaforme + (B.piattaforme.voci.length - 1) * DURATE.piattaforma + 0.1 + DURATE.ovale;
    const fine = Math.max(...Object.values(quando), 1.1);
    if (versione !== 'anteprima' && tempi.durata - fine < FERMA) problemi.push({ cosa: 'tempi', dice: `La grafica finisce di comporsi a ${fine.toFixed(1)} s: con ${tempi.durata} s in tutto resta ferma meno di ${FERMA} s` });
    if (B.chat && tempi.domanda < fineCarta(tempi.chat) - 0.75) problemi.push({ cosa: 'tempi', dice: 'Il primo messaggio della chat arriva prima che la carta sia disegnata' });

    const blocchi = [['logo', B.logo], ['titolo', B.titolo], ['indirizzo', B.indirizzo.box]];
    if (B.chat) blocchi.push(['chat', { x: B.chat.x, y: B.chat.y, w: B.chat.w + 12 * U, h: B.chat.h + 12 * U }]);
    if (B.qr) blocchi.push(['qr', { x: B.qr.x, y: B.qr.y, w: B.qr.w + 12 * U, h: B.qr.h + 12 * U }]);
    if (B.nota && B.chat) blocchi.push(['nota', B.nota.box]);
    if (B.piattaforme && B.piattaforme.w) blocchi.push(['piattaforme', { x: B.piattaforme.x, y: B.piattaforme.y, w: B.piattaforme.w, h: B.piattaforme.h }]);
    const NOMI = { logo: 'il logo', titolo: 'il titolo', indirizzo: 'l’indirizzo', chat: 'la chat', qr: 'il QR', nota: 'la nota a mano', piattaforme: 'Twitch e Kick' };
    for (let i = 0; i < blocchi.length; i++) {
      for (let j = i + 1; j < blocchi.length; j++) {
        const [na, a] = blocchi[i], [nb, b] = blocchi[j];
        if (a.w > 0 && b.w > 0 && tocca(a, b, 2 * U)) problemi.push({ cosa: 'sovrapposti', dice: `${NOMI[na]} e ${NOMI[nb]} si sovrappongono` });
      }
    }
    const marg = 0.008 * Math.min(w, h);
    for (const [n, b] of blocchi) if (b.w > 0 && (b.x < marg || b.y < marg || b.x + b.w > w - marg || b.y + b.h > h - marg)) problemi.push({ cosa: 'fuori', dice: `${NOMI[n]} esce dalla grafica` });
    const campi = { titolo: versione === 'anteprima' ? T.offerta : T.titolo, indirizzo };
    if (versione === 'piena') Object.assign(campi, { nota: T.nota, testa: T.testa, domanda: T.domanda, risposta: T.risposta, didascalia: conQr ? T.didascalia : '', piattaforme: T.piattaforme });
    for (const [k, v] of Object.entries(campi)) { const f = faccina(v); if (f) problemi.push({ cosa: 'faccina', dice: `«${f}» in ${k} si legge come una faccina` }); }

    function sagoma(g, guida, colore) { g.fillStyle = colore; g.fill(new Path2D(P.percorso(guida))); }
    function segno(g, d, colore) { if (d) { g.fillStyle = colore; g.fill(new Path2D(d)); } }

    function carta(g, K, t, t0) {
      const k = 1;
      const fineMat = t0 + 0.64 * k;
      const pieno = passo(tra(t, fineMat, fineMat + 0.3 * k));
      if (pieno > 0) {
        g.save();
        g.beginPath(); g.rect(0, 0, w, K.y - 20 * U + (K.h + 60 * U) * pieno); g.clip();
        sagoma(g, K.ombra.guida, COLORI.china);
        sagoma(g, K.forma.guida, COLORI.carta);
        g.restore();
      }
      const via = passo(tra(t, fineMat + 0.55 * k, fineMat + 0.75 * k));
      if (via < 1) {
        g.save(); g.globalAlpha = 1 - via;
        K.costruzione.forEach((m, i) => {
          const q = passo(tra(t, t0 + i * 0.16 * k, t0 + (i + 1) * 0.16 * k));
          if (q > 0) segno(g, P.tratto(m, { punta: 'matita', larghezza: 2.4 * U, seme: seme + ':mat' + i + K.x, fino: q }).d, COLORI.matita);
        });
        g.restore();
      }
      const qc = passo(tra(t, fineMat + 0.12 * k, fineMat + 0.5 * k));
      if (qc > 0) segno(g, P.tratto(K.forma.china, { punta: 'china', larghezza: 5.5 * U, seme: seme + ':china' + K.x, fino: qc }).d, COLORI.china);
      return { pieno, fine: fineMat + 0.75 * k };
    }

    function sali(g, t, t0, gap, lista, disegna) {
      lista.forEach((p, i) => {
        const k = sale(tra(t, t0 + i * gap, t0 + i * gap + DURATE.parola));
        if (k <= 0) return;
        disegna(p, k);
      });
    }

    function disegna(g, tt) {
      const t = Math.max(0, tt);
      g.save();
      g.drawImage(fondo, 0, 0);
      for (const x of raggi) {
        const k = passo(tra(t, 0.05 + x.da, 0.75 + x.da));
        if (!k) continue;
        const rr = x.Rout - (x.Rout - x.ri) * k;
        g.fillStyle = x.colore;
        g.beginPath(); g.moveTo(x.p1[0], x.p1[1]); g.lineTo(x.fx + Math.cos(x.a) * rr, x.fy + Math.sin(x.a) * rr); g.lineTo(x.p2[0], x.p2[1]); g.closePath(); g.fill();
      }

      {
        const k = passo(tra(t, tempi.logo, tempi.logo + DURATE.logo));
        if (k > 0) {
          const L = B.logo;
          g.save();
          if (k < 1) {
            const r = P.caso('logo');
            g.beginPath(); g.moveTo(L.x, L.y);
            for (let i = 0; i <= 8; i++) g.lineTo(L.x + L.w * Math.min(1, k + (r() - 0.5) * 0.06), L.y + L.h * i / 8);
            g.lineTo(L.x, L.y + L.h); g.closePath(); g.clip();
          }
          g.imageSmoothingQuality = 'high';
          g.drawImage(logo.tela, L.x, L.y, L.w, L.h);
          g.restore();
        }
      }

      if (B.chat) {
        const C = B.chat;
        const st = carta(g, Object.assign(C, { forma: C.forma }), t, tempi.chat);
        if (t >= st.fine) {
          const y0 = C.y + C.pad.y;
          g.fillStyle = COLORI.acc; g.beginPath(); g.arc(C.x + C.pad.x + 7 * U, y0 + C.testaH / 2, 7 * U, 0, Math.PI * 2); g.fill();
          g.font = `800 ${C.testaS}px ${TESTO}`; g.fillStyle = COLORI.grigio; g.textBaseline = 'middle';
          if ('letterSpacing' in g) g.letterSpacing = (0.14 * C.testaS) + 'px';
          g.fillText(String(T.testa).toUpperCase(), C.x + C.pad.x + 26 * U, y0 + C.testaH / 2);
          if ('letterSpacing' in g) g.letterSpacing = '0px';
          g.textBaseline = 'alphabetic';
        }
        const riga = (righe, yTop, t0) => {
          if (t < t0) return;
          const k = sale(tra(t, t0, t0 + DURATE.riga)), dy = (1 - k) * 18 * U;
          righe.forEach((r, i) => {
            const base = yTop + i * C.lh + (C.lh - (C.su + C.giu)) / 2 + C.su + dy;
            for (const p of r) {
              g.font = p.font; g.fillStyle = p.colore;
              g.fillText(p.t, C.x + C.pad.x + p.x, base);
              if (p.sotto) g.fillRect(C.x + C.pad.x + p.x, base + 5 * U, p.w + 0.5, 3 * U);
            }
          });
        };
        const yr1 = C.y + C.pad.y + C.testaH + C.gap;
        riga(C.r1, yr1, tempi.domanda);
        riga(C.r2, yr1 + C.r1.length * C.lh + C.gap, tempi.risposta);
      }

      if (B.qr) {
        const Q = B.qr;
        const st = carta(g, Q, t, tempi.qr);
        const k = passo(tra(t, st.fine - 0.1, st.fine + 0.4));
        if (k > 0) {
          g.save(); g.beginPath(); g.rect(Q.qx - 2, Q.qy - 2, Q.lato + 4, (Q.lato + 4) * k); g.clip();
          g.fillStyle = COLORI.china;
          for (let y = 0; y < Q.n; y++) for (let x = 0; x < Q.n; x++) if (Q.buio(x, y)) g.fillRect(Q.qx + x * Q.mod, Q.qy + y * Q.mod, Q.mod + 0.5, Q.mod + 0.5);
          g.restore();
        }
        if (t >= st.fine + 0.35) {
          g.fillStyle = COLORI.acc; g.font = Q.fc;
          Q.righe.forEach((r, i) => {
            const larg = r.length ? r[r.length - 1].x + r[r.length - 1].w : 0;
            const x0 = Q.centro ? Q.capX + (Q.capW - larg) / 2 : Q.capX;
            for (const p of r) g.fillText(p.t, x0 + p.x, Q.capY + i * Q.lhc + (Q.lhc - Q.cap) / 2 + Q.suC);
          });
        }
      }

      const Ti = B.titolo;
      if (Ti.imp) {
        const imp = Ti.imp;
        g.font = `400 ${imp.s}px ${MANO}`;
        const tutte = [];
        imp.righe.forEach((r, i) => {
          const larg = r[r.length - 1].x + r[r.length - 1].w;
          const x0 = Ti.centro ? Ti.x + (Ti.w - larg) / 2 : Ti.x;
          for (const p of r) tutte.push(Object.assign({}, p, { X: x0 + p.x, Y: Ti.y + i * imp.lh }));
        });
        sali(g, t, tempi.titolo, versione === 'piena' ? DURATE.gradino : 0.13, tutte, (p, k) => {
          g.save();
          g.beginPath(); g.rect(p.X - 4 * U, p.Y - 0.12 * imp.lh, p.w + Ti.ombra + 14 * U, imp.lh * 1.12 + Ti.ombra + 8 * U); g.clip();
          const y = p.Y + Ti.base + (1 - k) * 1.4 * imp.lh;
          g.fillStyle = p.em ? COLORI.china : COLORI.acc; g.fillText(p.t, p.X + Ti.ombra, y + Ti.ombra);
          g.fillStyle = p.em ? COLORI.acc : COLORI.testo; g.fillText(p.t, p.X, y);
          g.restore();
        });
      }

      if (B.nota && B.chat) {
        const N = B.nota;
        segno(g, P.freccia(N.guida, { larghezza: 7 * U, aletta: 28 * U, seme: seme + ':freccia', fino: passo(tra(t, tempi.freccia, tempi.freccia + DURATE.freccia)) }), COLORI.acc);
        g.save();
        g.translate(N.x, N.y + N.h / 2); g.rotate(N.ang); g.translate(0, -N.h / 2);
        g.font = N.f; g.fillStyle = COLORI.acc;
        sali(g, t, tempi.freccia + 0.4, 0.09, N.parole, (p, k) => {
          g.save(); g.beginPath(); g.rect(p.x - 2 * U, -0.1 * N.h, p.w + 6 * U, N.h * 1.2); g.clip();
          g.fillText(p.t, p.x, N.base + (1 - k) * 1.4 * N.h);
          g.restore();
        });
        g.restore();
      }

      if (B.piattaforme && B.piattaforme.voci.length) {
        const Pf = B.piattaforme;
        Pf.voci.forEach((v, i) => {
          const t0 = tempi.piattaforme + i * DURATE.piattaforma;
          const k = sale(tra(t, t0, t0 + DURATE.parola));
          if (k > 0) {
            g.save(); g.beginPath(); g.rect(v.cx - v.tw / 2 - 4 * U, v.cy - v.ry, v.tw + 8 * U, 2 * v.ry); g.clip();
            g.font = Pf.f; g.fillStyle = COLORI.china;
            g.fillText(v.t, v.cx - v.tw / 2, v.base + (1 - k) * 1.4 * Pf.s);
            g.restore();
          }
          const q = passo(tra(t, t0 + 0.1, t0 + 0.1 + DURATE.ovale));
          if (q > 0) segno(g, P.tratto(v.ovale, { punta: 'pennarello', larghezza: 4.5 * U, seme: seme + ':ov' + i, fino: q }).d, COLORI.acc);
        });
      }

      {
        const I = B.indirizzo;
        const k = sale(tra(t, tempi.indirizzo, tempi.indirizzo + DURATE.parola));
        if (k > 0) {
          g.save(); g.beginPath(); g.rect(I.x - 6 * U, I.y - 4 * U, I.w + 12 * U, I.h); g.clip();
          g.font = fIndirizzo(I.s); g.fillStyle = COLORI.testo;
          if ('letterSpacing' in g) g.letterSpacing = (-0.01 * I.s) + 'px';
          g.fillText(indirizzo, I.x, I.base + (1 - k) * 1.4 * I.h);
          if ('letterSpacing' in g) g.letterSpacing = '0px';
          g.restore();
        }
        const q = passo(tra(t, tempi.indirizzo + 0.45, tempi.indirizzo + 0.95));
        if (q > 0) segno(g, P.tratto(I.sotto, { punta: 'pennarello', larghezza: 10 * U, seme: seme + ':sotto', fino: q }).d, COLORI.acc);
      }
      g.restore();
    }

    return { w, h, U, versione, tempi, durata: tempi.durata, fine, blocchi: B, problemi, disegna };
  }

  function ivf(fotogrammi, w, h, fps, fourcc) {
    const tot = 32 + fotogrammi.reduce((s, f) => s + 12 + f.byteLength, 0);
    const out = new Uint8Array(tot), dv = new DataView(out.buffer);
    out.set([68, 75, 73, 70], 0);
    dv.setUint16(4, 0, true); dv.setUint16(6, 32, true);
    for (let i = 0; i < 4; i++) out[8 + i] = fourcc.charCodeAt(i);
    dv.setUint16(12, w, true); dv.setUint16(14, h, true);
    dv.setUint32(16, fps, true); dv.setUint32(20, 1, true);
    dv.setUint32(24, fotogrammi.length, true); dv.setUint32(28, 0, true);
    let o = 32;
    fotogrammi.forEach((f, i) => {
      dv.setUint32(o, f.byteLength, true); dv.setUint32(o + 4, i, true); dv.setUint32(o + 8, 0, true);
      out.set(f, o + 12); o += 12 + f.byteLength;
    });
    return out;
  }

  async function video(scena, opz) {
    const o = Object.assign({ fps: 30, avanza: null }, opz || {});
    if (typeof VideoEncoder === 'undefined') throw new Error('questo browser non sa fare video: serve Chrome o Edge aggiornati');
    const { w, h } = scena;
    const quadri = Math.round(scena.durata * o.fps);
    const bitrate = Math.min(80e6, Math.round(w * h * o.fps * 0.5));
    let conf = null;
    for (const [codec, fourcc] of [['vp09.00.40.08', 'VP90'], ['vp09.00.10.08', 'VP90'], ['vp8', 'VP80']]) {
      const c = { codec, width: w, height: h, bitrate, framerate: o.fps, latencyMode: 'quality' };
      try { const s = await VideoEncoder.isConfigSupported(c); if (s.supported) { conf = { c, fourcc }; break; } } catch (e) { void e; }
    }
    if (!conf) throw new Error('il browser non sa comprimere il video a questa misura');
    const pezzi = [];
    let errore = null;
    const enc = new VideoEncoder({ output: (ch) => { const b = new Uint8Array(ch.byteLength); ch.copyTo(b); pezzi.push(b); }, error: (e) => { errore = e; } });
    enc.configure(conf.c);
    const c = tela(w, h), g = c.getContext('2d');
    for (let i = 0; i < quadri; i++) {
      if (errore) throw errore;
      scena.disegna(g, i / o.fps);
      const vf = new VideoFrame(c, { timestamp: Math.round(i * 1e6 / o.fps), duration: Math.round(1e6 / o.fps) });
      enc.encode(vf, { keyFrame: i % (o.fps * 2) === 0 });
      vf.close();
      while (enc.encodeQueueSize > 3) await new Promise((r) => setTimeout(r, 4));
      if (o.avanza && i % 5 === 0) o.avanza((i + 1) / quadri);
    }
    await enc.flush();
    enc.close();
    if (errore) throw errore;
    if (pezzi.length !== quadri) throw new Error(`il video ha ${pezzi.length} fotogrammi su ${quadri}`);
    return ivf(pezzi, w, h, o.fps, conf.fourcc);
  }

  async function pronti() {
    if (typeof document === 'undefined' || !document.fonts) return;
    await Promise.all([`400 40px ${MANO}`, `500 40px ${TESTO}`, `700 40px ${TESTO}`, `800 40px ${TESTO}`].map((f) => document.fonts.load(f)));
  }

  radice.SB_PROMO = { COLORI, TESTI, TEMPI, DURATE, FORMATI, FERMA, faccina, parole, spezza, prepara, crea, video, ivf, pronti };
})(typeof window !== 'undefined' ? window : globalThis);
