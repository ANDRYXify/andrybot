// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';

  const LIVELLI = ['L', 'M', 'Q', 'H'];
  const BIT_LIVELLO = { L: 1, M: 0, Q: 3, H: 2 };
  const BLOCCHI = `
    7,1,19,0,0 10,1,16,0,0 13,1,13,0,0 17,1,9,0,0
    10,1,34,0,0 16,1,28,0,0 22,1,22,0,0 28,1,16,0,0
    15,1,55,0,0 26,1,44,0,0 18,2,17,0,0 22,2,13,0,0
    20,1,80,0,0 18,2,32,0,0 26,2,24,0,0 16,4,9,0,0
    26,1,108,0,0 24,2,43,0,0 18,2,15,2,16 22,2,11,2,12
    18,2,68,0,0 16,4,27,0,0 24,4,19,0,0 28,4,15,0,0
    20,2,78,0,0 18,4,31,0,0 18,2,14,4,15 26,4,13,1,14
    24,2,97,0,0 22,2,38,2,39 22,4,18,2,19 26,4,14,2,15
    30,2,116,0,0 22,3,36,2,37 20,4,16,4,17 24,4,12,4,13
    18,2,68,2,69 26,4,43,1,44 24,6,19,2,20 28,6,15,2,16
    20,4,81,0,0 30,1,50,4,51 28,4,22,4,23 24,3,12,8,13
    24,2,92,2,93 22,6,36,2,37 26,4,20,6,21 28,7,14,4,15
    26,4,107,0,0 22,8,37,1,38 24,8,20,4,21 22,12,11,4,12
    30,3,115,1,116 24,4,40,5,41 20,11,16,5,17 24,11,12,5,13
    22,5,87,1,88 24,5,41,5,42 30,5,24,7,25 24,11,12,7,13
    24,5,98,1,99 28,7,45,3,46 24,15,19,2,20 30,3,15,13,16
    28,1,107,5,108 28,10,46,1,47 28,1,22,15,23 28,2,14,17,15
    30,5,120,1,121 26,9,43,4,44 28,17,22,1,23 28,2,14,19,15
    28,3,113,4,114 26,3,44,11,45 26,17,21,4,22 26,9,13,16,14
    28,3,107,5,108 26,3,41,13,42 30,15,24,5,25 28,15,15,10,16
    28,4,116,4,117 26,17,42,0,0 28,17,22,6,23 30,19,16,6,17
    28,2,111,7,112 28,17,46,0,0 30,7,24,16,25 24,34,13,0,0
    30,4,121,5,122 28,4,47,14,48 30,11,24,14,25 30,16,15,14,16
    30,6,117,4,118 28,6,45,14,46 30,11,24,16,25 30,30,16,2,17
    26,8,106,4,107 28,8,47,13,48 30,7,24,22,25 30,22,15,13,16
    28,10,114,2,115 28,19,46,4,47 28,28,22,6,23 30,33,16,4,17
    30,8,122,4,123 28,22,45,3,46 30,8,23,26,24 30,12,15,28,16
    30,3,117,10,118 28,3,45,23,46 30,4,24,31,25 30,11,15,31,16
    30,7,116,7,117 28,21,45,7,46 30,1,23,37,24 30,19,15,26,16
    30,5,115,10,116 28,19,47,10,48 30,15,24,25,25 30,23,15,25,16
    30,13,115,3,116 28,2,46,29,47 30,42,24,1,25 30,23,15,28,16
    30,17,115,0,0 28,10,46,23,47 30,10,24,35,25 30,19,15,35,16
    30,17,115,1,116 28,14,46,21,47 30,29,24,19,25 30,11,15,46,16
    30,13,115,6,116 28,14,46,23,47 30,44,24,7,25 30,59,16,1,17
    30,12,121,7,122 28,12,47,26,48 30,39,24,14,25 30,22,15,41,16
    30,6,121,14,122 28,6,47,34,48 30,46,24,10,25 30,2,15,64,16
    30,17,122,4,123 28,29,46,14,47 30,49,24,10,25 30,24,15,46,16
    30,4,122,18,123 28,13,46,32,47 30,48,24,14,25 30,42,15,32,16
    30,20,117,4,118 28,40,47,7,48 30,43,24,22,25 30,10,15,67,16
    30,19,118,6,119 28,18,47,31,48 30,34,24,34,25 30,20,15,61,16
  `.trim().split('\n').map((r) => r.trim().split(' ').map((x) => x.split(',').map(Number)));

  const ESP = new Uint8Array(512), LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) { ESP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) ESP[i] = ESP[i - 255];
  const per = (a, b) => (a && b ? ESP[LOG[a] + LOG[b]] : 0);
  const diviso = (a, b) => (a ? ESP[(LOG[a] + 255 - LOG[b]) % 255] : 0);

  const lato = (v) => 17 + 4 * v;
  const livello = (l) => (LIVELLI.includes(l) ? l : 'M');
  const blocchiDi = (v, l) => BLOCCHI[v - 1][LIVELLI.indexOf(livello(l))];
  const datiDi = (v, l) => { const [, b1, d1, b2, d2] = blocchiDi(v, l); return b1 * d1 + b2 * d2; };
  const bitConteggio = (v) => (v <= 9 ? 8 : 16);

  function allineamenti(v) {
    if (v === 1) return [];
    const n = Math.floor(v / 7) + 2, passo = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2;
    const p = [6];
    for (let i = 0, x = lato(v) - 7; i < n - 1; i++, x -= passo) p.splice(1, 0, x);
    return p;
  }

  function generatore(n) {
    let g = [1];
    for (let i = 0; i < n; i++) {
      const nuovo = new Array(g.length + 1).fill(0);
      for (let j = 0; j < g.length; j++) { nuovo[j] ^= g[j]; nuovo[j + 1] ^= per(g[j], ESP[i]); }
      g = nuovo;
    }
    return g;
  }

  function resto(dati, n) {
    const g = generatore(n), r = new Array(n).fill(0);
    for (const d of dati) {
      const f = d ^ r[0];
      r.shift(); r.push(0);
      if (f) for (let j = 0; j < n; j++) r[j] ^= per(g[j + 1], f);
    }
    return r;
  }

  const utf8 = (s) => Array.from(new TextEncoder().encode(String(s)));

  function versioneMinima(n, l) {
    for (let v = 1; v <= 40; v++) if (4 + bitConteggio(v) + 8 * n <= datiDi(v, l) * 8) return v;
    return 0;
  }

  function parole(byte, v, l) {
    const cap = datiDi(v, l) * 8, bit = [];
    const metti = (x, n) => { for (let i = n - 1; i >= 0; i--) bit.push((x >>> i) & 1); };
    metti(4, 4); metti(byte.length, bitConteggio(v));
    for (const b of byte) metti(b, 8);
    metti(0, Math.min(4, cap - bit.length));
    while (bit.length % 8) bit.push(0);
    const dati = [];
    for (let i = 0; i < bit.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bit[i + j]; dati.push(b); }
    for (let k = 0; dati.length < cap / 8; k++) dati.push(k % 2 ? 0x11 : 0xec);
    return dati;
  }

  function spartisci(v, l) {
    const [ec, b1, d1, b2, d2] = blocchiDi(v, l), blocchi = [];
    for (let i = 0; i < b1 + b2; i++) blocchi.push({ dati: i < b1 ? d1 : d2, ec });
    return blocchi;
  }

  function intreccia(dati, v, l) {
    const blocchi = spartisci(v, l);
    let k = 0;
    const pezzi = blocchi.map((b) => { const d = dati.slice(k, k + b.dati); k += b.dati; return { d, e: resto(d, b.ec) }; });
    const fuori = [], dove = [];
    const massimo = Math.max(...blocchi.map((b) => b.dati));
    for (let i = 0; i < massimo; i++) pezzi.forEach((p, j) => { if (i < p.d.length) { fuori.push(p.d[i]); dove.push(j); } });
    for (let i = 0; i < blocchi[0].ec; i++) pezzi.forEach((p, j) => { fuori.push(p.e[i]); dove.push(j); });
    return { parole: fuori, blocco: dove };
  }

  function bitFormato(l, maschera) {
    const d = (BIT_LIVELLO[l] << 3) | maschera;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    return ((d << 10) | r) ^ 0x5412;
  }

  function posizioniFormato(n) {
    const a = [], b = [];
    for (let i = 0; i <= 5; i++) a.push([8, i]);
    a.push([8, 7], [8, 8], [7, 8]);
    for (let i = 9; i < 15; i++) a.push([14 - i, 8]);
    for (let i = 0; i < 8; i++) b.push([n - 1 - i, 8]);
    for (let i = 8; i < 15; i++) b.push([8, n - 15 + i]);
    return [a, b];
  }

  function formato(scuro, funzione, n, bits) {
    for (const copia of posizioniFormato(n)) copia.forEach(([x, y], i) => { scuro[y * n + x] = (bits >>> i) & 1; funzione[y * n + x] = 1; });
    scuro[(n - 8) * n + 8] = 1; funzione[(n - 8) * n + 8] = 1;
  }

  function scheletro(v) {
    const n = lato(v), scuro = new Uint8Array(n * n), funzione = new Uint8Array(n * n);
    const metti = (x, y, s) => { scuro[y * n + x] = s ? 1 : 0; funzione[y * n + x] = 1; };
    for (let i = 0; i < n; i++) { metti(6, i, i % 2 === 0); metti(i, 6, i % 2 === 0); }
    const occhio = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < n && y >= 0 && y < n) metti(x, y, d !== 2 && d !== 4);
      }
    };
    occhio(3, 3); occhio(n - 4, 3); occhio(3, n - 4);
    const a = allineamenti(v);
    for (const y of a) for (const x of a) {
      if ((x === 6 && y === 6) || (x === 6 && y === n - 7) || (x === n - 7 && y === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) metti(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    formato(scuro, funzione, n, 0);
    if (v >= 7) {
      let r = v;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const b = (v << 12) | r;
      for (let i = 0; i < 18; i++) { const s = (b >>> i) & 1, p = n - 11 + (i % 3), q = Math.floor(i / 3); metti(p, q, s); metti(q, p, s); }
    }
    return { n, scuro, funzione };
  }

  function percorso(n, funzione) {
    const ordine = [];
    for (let destra = n - 1; destra >= 1; destra -= 2) {
      if (destra === 6) destra = 5;
      for (let k = 0; k < n; k++) {
        for (let j = 0; j < 2; j++) {
          const x = destra - j, su = ((destra + 1) & 2) === 0, y = su ? n - 1 - k : k;
          if (!funzione[y * n + x]) ordine.push(y * n + x);
        }
      }
    }
    return ordine;
  }

  const MASCHERE = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  function penalita(scuro, n) {
    let p = 0;
    const riga = (leggi) => {
      let corsa = 1;
      for (let i = 1; i <= n; i++) {
        if (i < n && leggi(i) === leggi(i - 1)) corsa++;
        else { if (corsa >= 5) p += 3 + (corsa - 5); corsa = 1; }
      }
      const corse = [n];
      let colore = 0;
      for (let i = 0; i < n; i++) {
        const c = leggi(i);
        if (c === colore) corse[corse.length - 1]++;
        else { corse.push(1); colore = c; }
      }
      if (colore) corse.push(n); else corse[corse.length - 1] += n;
      for (let i = 1; i + 5 < corse.length; i += 2) {
        const u = corse[i];
        if (corse[i + 1] !== u || corse[i + 2] !== 3 * u || corse[i + 3] !== u || corse[i + 4] !== u) continue;
        const prima = corse[i - 1], dopo = corse[i + 5];
        if (prima >= 4 * u && dopo >= u) p += 40;
        if (dopo >= 4 * u && prima >= u) p += 40;
      }
    };
    for (let y = 0; y < n; y++) riga((x) => scuro[y * n + x]);
    for (let x = 0; x < n; x++) riga((y) => scuro[y * n + x]);
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
      const c = scuro[y * n + x];
      if (c === scuro[y * n + x + 1] && c === scuro[(y + 1) * n + x] && c === scuro[(y + 1) * n + x + 1]) p += 3;
    }
    let buio = 0;
    for (let i = 0; i < n * n; i++) buio += scuro[i];
    p += (Math.ceil(Math.abs(buio * 20 - n * n * 10) / (n * n)) - 1) * 10;
    return p;
  }

  function codifica(testo, opz) {
    const o = Object.assign({ livello: 'M', versione: 0, maschera: -1 }, opz || {});
    const l = livello(o.livello), byte = utf8(testo);
    const minima = versioneMinima(byte.length, l);
    if (!minima) throw new Error('il testo è troppo lungo per un QR');
    const v = Math.max(minima, Math.min(40, Math.round(o.versione) || 0));
    const { parole: tutte, blocco } = intreccia(parole(byte, v, l), v, l);
    const base = scheletro(v), n = base.n;
    const ordine = percorso(n, base.funzione);
    const parola = new Int16Array(n * n).fill(-1);
    const dati = new Uint8Array(n * n);
    ordine.forEach((k, i) => {
      const w = i >> 3;
      if (w < tutte.length) { parola[k] = w; dati[k] = (tutte[w] >>> (7 - (i & 7))) & 1; }
    });
    const prova = (m) => {
      const s = new Uint8Array(base.scuro), f = new Uint8Array(base.funzione);
      for (const k of ordine) s[k] = dati[k] ^ (MASCHERE[m](k % n, Math.floor(k / n)) ? 1 : 0);
      formato(s, f, n, bitFormato(l, m));
      return s;
    };
    let maschera = Math.round(o.maschera), scuro = null;
    if (maschera >= 0 && maschera < 8) scuro = prova(maschera);
    else {
      let meglio = Infinity;
      for (let m = 0; m < 8; m++) { const s = prova(m), p = penalita(s, n); if (p < meglio) { meglio = p; maschera = m; scuro = s; } }
    }
    return { testo: String(testo), versione: v, livello: l, maschera, n, scuro, funzione: base.funzione, parola, blocco, blocchi: spartisci(v, l) };
  }

  function sindromi(c, k) {
    const s = [];
    for (let i = 0; i < k; i++) { let x = 0; for (const b of c) x = per(x, ESP[i]) ^ b; s.push(x); }
    return s;
  }

  function correggi(c, k) {
    const s = sindromi(c, k);
    if (s.every((x) => x === 0)) return { parola: c.slice(), errori: 0 };
    let C = [1], B = [1], L = 0, m = 1, b = 1;
    for (let r = 0; r < k; r++) {
      let d = s[r];
      for (let i = 1; i <= L; i++) d ^= per(C[i] || 0, s[r - i]);
      if (d === 0) { m++; continue; }
      const T = C.slice(), f = diviso(d, b);
      while (C.length < B.length + m) C.push(0);
      for (let i = 0; i < B.length; i++) C[i + m] ^= per(f, B[i]);
      if (2 * L <= r) { L = r + 1 - L; B = T; b = d; m = 1; } else m++;
    }
    const N = c.length, pos = [];
    for (let p = 0; p < N; p++) {
      const xi = ESP[(255 - p) % 255];
      let v = 0;
      for (let i = C.length - 1; i >= 0; i--) v = per(v, xi) ^ C[i];
      if (v === 0) pos.push(p);
    }
    if (pos.length !== L || L * 2 > k) return null;
    const om = new Array(k).fill(0);
    for (let i = 0; i < k; i++) for (let j = 0; j <= i && j < C.length; j++) om[i] ^= per(C[j], s[i - j]);
    const fuori = c.slice();
    for (const p of pos) {
      const X = ESP[p % 255], xi = ESP[(255 - p) % 255];
      let num = 0, den = 0;
      for (let i = k - 1; i >= 0; i--) num = per(num, xi) ^ om[i];
      for (let i = 1; i < C.length; i += 2) { let t = C[i]; for (let e = 0; e < i - 1; e++) t = per(t, xi); den ^= t; }
      if (!den) return null;
      fuori[N - 1 - p] ^= per(X, diviso(num, den));
    }
    return sindromi(fuori, k).every((x) => x === 0) ? { parola: fuori, errori: L } : null;
  }

  function leggiFormato(scuro, n) {
    for (const copia of posizioniFormato(n)) {
      let letti = 0;
      copia.forEach(([x, y], i) => { letti |= scuro[y * n + x] << i; });
      let meglio = null, dist = 4;
      for (const l of LIVELLI) for (let m = 0; m < 8; m++) {
        let d = bitFormato(l, m) ^ letti, c = 0;
        while (d) { c += d & 1; d >>>= 1; }
        if (c < dist) { dist = c; meglio = { livello: l, maschera: m }; }
      }
      if (meglio) return meglio;
    }
    return null;
  }

  function leggi(scuro, n) {
    const v = (n - 17) / 4;
    if (!Number.isInteger(v) || v < 1 || v > 40) return null;
    const f = leggiFormato(scuro, n);
    if (!f) return null;
    const base = scheletro(v), ordine = percorso(n, base.funzione);
    const blocchi = spartisci(v, f.livello), totale = blocchi.reduce((a, b) => a + b.dati + b.ec, 0);
    const letto = new Array(totale).fill(0);
    ordine.forEach((k, i) => {
      const w = i >> 3;
      if (w < totale) letto[w] |= ((scuro[k] ^ (MASCHERE[f.maschera](k % n, Math.floor(k / n)) ? 1 : 0)) & 1) << (7 - (i & 7));
    });
    const pezzi = blocchi.map(() => []);
    const massimo = Math.max(...blocchi.map((b) => b.dati));
    let w = 0;
    for (let i = 0; i < massimo; i++) blocchi.forEach((b, j) => { if (i < b.dati) pezzi[j].push(letto[w++]); });
    for (let i = 0; i < blocchi[0].ec; i++) blocchi.forEach((b, j) => { pezzi[j].push(letto[w++]); });
    const dati = [];
    let errori = 0;
    for (let j = 0; j < blocchi.length; j++) {
      const r = correggi(pezzi[j], blocchi[j].ec);
      if (!r) return null;
      errori += r.errori;
      dati.push(...r.parola.slice(0, blocchi[j].dati));
    }
    const bit = [];
    for (const b of dati) for (let i = 7; i >= 0; i--) bit.push((b >>> i) & 1);
    let q = 0;
    const prendi = (k) => { let x = 0; for (let i = 0; i < k; i++) x = (x << 1) | (bit[q++] ?? 0); return x; };
    if (prendi(4) !== 4) return null;
    const lung = prendi(bitConteggio(v));
    if (q + lung * 8 > bit.length) return null;
    const byte = new Uint8Array(lung);
    for (let i = 0; i < lung; i++) byte[i] = prendi(8);
    let testo;
    try { testo = new TextDecoder('utf-8', { fatal: true }).decode(byte); } catch { return null; }
    return { testo, versione: v, livello: f.livello, maschera: f.maschera, errori };
  }

  function danno(qr, celle) {
    const colpite = qr.blocchi.map(() => new Set());
    let funzioni = 0;
    for (const k of celle) {
      if (qr.funzione[k]) { funzioni++; continue; }
      const w = qr.parola[k];
      if (w >= 0) colpite[qr.blocco[w]].add(w);
    }
    const quota = qr.blocchi.map((b, j) => colpite[j].size / Math.floor(b.ec / 2));
    return { funzioni, parole: colpite.map((s) => s.size), quota: Math.max(0, ...quota) };
  }

  const QUIETE = 4;
  const CONTRASTO = 0.55;
  const STILI = { moduli: ['quadrati', 'morbidi', 'puntini', 'penna'], occhi: ['quadrati', 'morbidi', 'tondi', 'penna'] };
  const lineare = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const luce = (r, g, b) => 0.2126 * lineare(r) + 0.7152 * lineare(g) + 0.0722 * lineare(b);
  function luceDi(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    const v = parseInt(m[1], 16);
    return luce((v >> 16) & 255, (v >> 8) & 255, v & 255);
  }
  const f2 = (x) => Math.round(x * 100) / 100;

  function celleTarga(n, s) {
    const c0 = Math.floor((n - s) / 2), celle = [];
    for (let y = c0; y < c0 + s; y++) for (let x = c0; x < c0 + s; x++) celle.push(y * n + x);
    return { c0, lato: s, celle };
  }

  function targaMassima(qr) {
    let meglio = 0;
    for (let s = 1; s <= qr.n - 16; s += 2) {
      const d = danno(qr, celleTarga(qr.n, s).celle);
      if (d.funzioni || d.quota > 0.5) break;
      meglio = s;
    }
    return meglio;
  }

  function progetto(testo, stile) {
    const s = Object.assign({ moduli: 'quadrati', occhi: 'quadrati', scuro: '#150910', chiaro: '#ffffff', occhio: '', logo: null, logoLato: 1, cornice: '', coloreCornice: '', seme: 'qr' }, stile || {});
    if (!STILI.moduli.includes(s.moduli)) s.moduli = 'quadrati';
    if (!STILI.occhi.includes(s.occhi)) s.occhi = 'quadrati';
    const t = String(testo ?? '').trim();
    if (!t) return { stile: s, problemi: [{ cosa: 'testo', dice: 'Scrivi il link o il testo da mettere nel QR.' }] };
    let qr;
    try { qr = codifica(t, { livello: s.logo ? 'H' : 'M' }); } catch { return { stile: s, problemi: [{ cosa: 'testo', dice: 'È troppo lungo per un QR: accorcialo.' }] }; }
    const problemi = [];
    const ls = luceDi(s.scuro), lc = luceDi(s.chiaro), lo = luceDi(s.occhio || s.scuro), lf = luceDi(s.coloreCornice || s.scuro);
    if (ls == null || lc == null || lo == null || lf == null) problemi.push({ cosa: 'colori', dice: 'Un colore non è scritto bene: usa la forma #rrggbb.' });
    else {
      if (lc - ls < CONTRASTO) problemi.push({ cosa: 'colori', dice: 'Il colore dei quadratini è troppo vicino a quello del fondo: il telefono non li distingue. Il fondo deve essere molto più chiaro.' });
      if (lc - lo < CONTRASTO) problemi.push({ cosa: 'colori', dice: 'Il colore degli occhi è troppo chiaro sul fondo: il telefono non trova il codice.' });
    }
    let targa = null;
    if (s.logo) {
      const max = targaMassima(qr);
      if (max < 5) problemi.push({ cosa: 'logo', dice: 'Con un link così lungo il logo coprirebbe i segni che servono a trovare il codice: accorcia il link o togli il logo.' });
      else {
        const quota = Math.max(0.2, Math.min(1, Number(s.logoLato) || 1));
        let lato = Math.max(5, Math.round(max * quota));
        if (lato % 2 === 0) lato--;
        targa = Object.assign(celleTarga(qr.n, lato), { max });
        targa.danno = danno(qr, targa.celle);
      }
    }
    return { testo: t, qr, stile: s, targa, problemi };
  }

  function geometria(p, latoPx) {
    const n = p.qr.n, bordo = p.stile.cornice ? 2 : 0;
    const T = n + 2 * QUIETE + 2 * bordo, fascia = p.stile.cornice ? Math.round(n * 0.18) + 3 : 0;
    const m = Math.max(1, Math.floor(latoPx / T));
    return { m, n, W: m * T, H: m * (T + fascia), x0: m * (QUIETE + bordo), y0: m * (QUIETE + bordo), bordo, fascia, T };
  }

  const rett = (x, y, w, h) => `M${f2(x)} ${f2(y)}h${f2(w)}v${f2(h)}h${f2(-w)}Z`;
  function morbido(x, y, w, h, r) {
    const [a, b, c, d] = r;
    return `M${f2(x + a)} ${f2(y)}L${f2(x + w - b)} ${f2(y)}Q${f2(x + w)} ${f2(y)} ${f2(x + w)} ${f2(y + b)}L${f2(x + w)} ${f2(y + h - c)}Q${f2(x + w)} ${f2(y + h)} ${f2(x + w - c)} ${f2(y + h)}L${f2(x + d)} ${f2(y + h)}Q${f2(x)} ${f2(y + h)} ${f2(x)} ${f2(y + h - d)}L${f2(x)} ${f2(y + a)}Q${f2(x)} ${f2(y)} ${f2(x + a)} ${f2(y)}Z`;
  }
  const cerchio = (cx, cy, r) => `M${f2(cx - r)} ${f2(cy)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;

  function percorsi(p, geo) {
    const { m, n, x0, y0, W, H } = geo, s = p.stile, q = p.qr, P = radice.SB_PENNA;
    const occhi = [[0, 0], [n - 7, 0], [0, n - 7]];
    const inOcchio = (x, y) => occhi.some(([a, b]) => x >= a && x < a + 7 && y >= b && y < b + 7);
    const A = allineamenti(q.versione), piccoli = [];
    for (const ay of A) for (const ax of A) if (!inOcchio(ax, ay)) piccoli.push([ax - 2, ay - 2]);
    const inPiccolo = (x, y) => piccoli.some(([a, b]) => x >= a && x < a + 5 && y >= b && y < b + 5);
    const t = p.targa;
    const sotto = (x, y) => !!t && x >= t.c0 && x < t.c0 + t.lato && y >= t.c0 && y < t.c0 + t.lato;
    const scuro = (x, y) => x >= 0 && y >= 0 && x < n && y < n && q.scuro[y * n + x] === 1 && !inOcchio(x, y) && !inPiccolo(x, y) && !sotto(x, y);
    const penna = (x, y, w, h, o) => P.percorso(P.forma(x, y, w, h, o).guida);
    const moduli = s.moduli === 'penna' && !P ? 'morbidi' : s.moduli, formaOcchi = s.occhi === 'penna' && !P ? 'morbidi' : s.occhi;
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (!scuro(x, y)) continue;
      const X = x0 + x * m, Y = y0 + y * m;
      if (moduli === 'quadrati') d += rett(X, Y, m, m);
      else if (moduli === 'puntini') d += cerchio(X + m / 2, Y + m / 2, m * 0.46);
      else if (moduli === 'penna') d += penna(X, Y, m, m, { seme: `${s.seme}:${x}:${y}`, rag: m * 0.18, angoli: 0.07, bombatura: 0.04 });
      else {
        const su = scuro(x, y - 1), giu = scuro(x, y + 1), sx = scuro(x - 1, y), dx = scuro(x + 1, y), r = m * 0.5;
        d += morbido(X, Y, m, m, [!su && !sx ? r : 0, !su && !dx ? r : 0, !giu && !dx ? r : 0, !giu && !sx ? r : 0]);
      }
    }
    const RAGGIO = { penna: 0.2, morbidi: 0.25 };
    const anelli = (a, b, l, k) => {
      const X = x0 + a * m, Y = y0 + b * m, c = [X + (l / 2) * m, Y + (l / 2) * m], lati = [l, l - 2, l - 4];
      if (formaOcchi === 'tondi') return lati.map((v) => cerchio(c[0], c[1], (v / 2) * m)).join('');
      if (formaOcchi === 'penna') return lati.map((v, i) => penna(X + i * m, Y + i * m, v * m, v * m, { seme: k, rag: RAGGIO.penna * v * m, angoli: 0.015, bombatura: 0.01 })).join('');
      if (formaOcchi === 'morbidi') return lati.map((v, i) => { const r = RAGGIO.morbidi * v * m; return morbido(X + i * m, Y + i * m, v * m, v * m, [r, r, r, r]); }).join('');
      return lati.map((v, i) => rett(X + i * m, Y + i * m, v * m, v * m)).join('');
    };
    let o = '';
    occhi.forEach(([a, b], i) => { o += anelli(a, b, 7, `${s.seme}:occhio${i}`); });
    piccoli.forEach(([a, b], i) => { o += anelli(a, b, 5, `${s.seme}:piccolo${i}`); });
    const fuori = { moduli: d, occhi: o, cornice: '', targa: null, fascia: null };
    if (t) fuori.targa = { x: x0 + t.c0 * m, y: y0 + t.c0 * m, lato: t.lato * m, r: m * 0.9 };
    if (s.cornice && P) {
      const bw = W - 2 * m, bh = H - 2 * m;
      const f = P.forma(m, m, bw, bh, { seme: `${s.seme}:cornice`, rag: 1.6 * m, angoli: (0.3 * m) / Math.min(bw, bh), bombatura: (0.2 * m) / Math.max(bw, bh) });
      fuori.cornice = P.tratto(f.china, { larghezza: 0.7 * m, punta: 'china', seme: `${s.seme}:china`, passo: 0.6 }).d;
      fuori.fascia = { x: W / 2, y: y0 + (n + QUIETE) * m, h: geo.fascia * m, w: W - 2 * geo.bordo * m - 2 * m };
    }
    return fuori;
  }

  const MANO = "'Permanent Marker', 'Mano Riserva', cursive";

  function misuraFrase(g, testo, fascia) {
    let px = fascia.h * 0.62;
    g.font = `400 ${px}px ${MANO}`;
    const w = g.measureText(testo).width;
    if (w > fascia.w) px *= fascia.w / w;
    return px;
  }

  function disegna(g, p, geo) {
    const s = p.stile, d = percorsi(p, geo);
    g.save();
    g.fillStyle = s.chiaro; g.fillRect(0, 0, geo.W, geo.H);
    if (d.cornice) { g.fillStyle = s.coloreCornice || s.scuro; g.fill(new Path2D(d.cornice)); }
    if (d.fascia) {
      const px = misuraFrase(g, s.cornice, d.fascia);
      g.font = `400 ${px}px ${MANO}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = s.coloreCornice || s.scuro;
      g.fillText(s.cornice, d.fascia.x, d.fascia.y + d.fascia.h / 2);
    }
    g.fillStyle = s.scuro; g.fill(new Path2D(d.moduli));
    g.fillStyle = s.occhio || s.scuro; g.fill(new Path2D(d.occhi), 'evenodd');
    if (d.targa && s.logo && s.logo.img) {
      const T = d.targa, pad = geo.m * 0.6, L = s.logo;
      const k = Math.min((T.lato - 2 * pad) / L.w, (T.lato - 2 * pad) / L.h), w = L.w * k, h = L.h * k;
      g.save();
      g.beginPath(); g.roundRect(T.x + pad, T.y + pad, T.lato - 2 * pad, T.lato - 2 * pad, T.r); g.clip();
      g.drawImage(L.img, T.x + (T.lato - w) / 2, T.y + (T.lato - h) / 2, w, h);
      g.restore();
    }
    g.restore();
  }

  const escXml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function svg(p, geo, opz) {
    const o = opz || {}, s = p.stile, d = percorsi(p, geo);
    const parti = [`<svg xmlns="http://www.w3.org/2000/svg" width="${geo.W}" height="${geo.H}" viewBox="0 0 ${geo.W} ${geo.H}">`];
    if (o.font && d.fascia) parti.push(`<style>@font-face{font-family:'Permanent Marker';src:url(${o.font}) format('woff2')}</style>`);
    parti.push(`<rect width="${geo.W}" height="${geo.H}" fill="${escXml(s.chiaro)}"/>`);
    if (d.cornice) parti.push(`<path d="${d.cornice}" fill="${escXml(s.coloreCornice || s.scuro)}"/>`);
    if (d.fascia && o.frasePx) parti.push(`<text x="${f2(d.fascia.x)}" y="${f2(d.fascia.y + d.fascia.h / 2)}" font-family="${escXml(MANO)}" font-size="${f2(o.frasePx)}" text-anchor="middle" dominant-baseline="central" fill="${escXml(s.coloreCornice || s.scuro)}">${escXml(s.cornice)}</text>`);
    parti.push(`<path d="${d.moduli}" fill="${escXml(s.scuro)}"/>`);
    parti.push(`<path d="${d.occhi}" fill="${escXml(s.occhio || s.scuro)}" fill-rule="evenodd"/>`);
    if (d.targa && s.logo && s.logo.url) {
      const T = d.targa, pad = geo.m * 0.6;
      parti.push(`<clipPath id="qr-logo"><rect x="${f2(T.x + pad)}" y="${f2(T.y + pad)}" width="${f2(T.lato - 2 * pad)}" height="${f2(T.lato - 2 * pad)}" rx="${f2(T.r)}"/></clipPath>`);
      parti.push(`<image href="${escXml(s.logo.url)}" x="${f2(T.x + pad)}" y="${f2(T.y + pad)}" width="${f2(T.lato - 2 * pad)}" height="${f2(T.lato - 2 * pad)}" preserveAspectRatio="xMidYMid meet" clip-path="url(#qr-logo)"/>`);
    }
    parti.push('</svg>');
    return parti.join('');
  }

  function rileggi(pixel, p, geo) {
    const { m, n, x0, y0 } = geo, W = pixel.width, dati = pixel.data;
    const soglia = (luceDi(p.stile.scuro) + luceDi(p.stile.chiaro)) / 2;
    const scuro = new Uint8Array(n * n);
    const r = Math.max(0, Math.floor(m / 6));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const cx = Math.floor(x0 + (x + 0.5) * m), cy = Math.floor(y0 + (y + 0.5) * m);
      let somma = 0, conta = 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const i = ((cy + dy) * W + (cx + dx)) * 4;
        somma += luce(dati[i], dati[i + 1], dati[i + 2]); conta++;
      }
      scuro[y * n + x] = somma / conta < soglia ? 1 : 0;
    }
    const letto = leggi(scuro, n);
    return { ok: !!letto && letto.testo === p.testo, letto };
  }

  const QR = { LIVELLI, BLOCCHI, QUIETE, CONTRASTO, STILI, lato, datiDi, allineamenti, versioneMinima, codifica, leggi, correggi, sindromi, danno, penalita, MASCHERE, luceDi, targaMassima, progetto, geometria, percorsi, misuraFrase, disegna, svg, rileggi };
  if (typeof module !== 'undefined' && module.exports) module.exports = QR;
  else radice.SB_QR = QR;
})(typeof window !== 'undefined' ? window : globalThis);
