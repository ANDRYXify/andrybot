// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL QR NOSTRO (src/web/public/qr.js, docs/STRUMENTI.md): codifica e lettura
// secondo la norma ISO/IEC 18004, senza librerie. Le impronte qui sotto sono
// quelle di un codificatore di riferimento che segue la norma alla lettera:
// stessa versione, stessa maschera, stessa matrice modulo per modulo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

await import('../../src/web/public/qr.js');
await import('../../src/web/public/penna.js');
const Q = globalThis.SB_QR;

const bitDi = (q) => Array.from(q.scuro, (x) => (x ? '1' : '0')).join('');
const impronta = (q) => createHash('sha256').update(bitDi(q)).digest('hex').slice(0, 16);

test('le matrici sono quelle della norma, maschera compresa', () => {
  const casi = [
    ['https://socialbot.live/u/andryx', 'M', 3, 2, 'b994ca88dabe7d4b'],
    ['https://socialbot.live/nyc', 'H', 4, 2, '40694963ec74f8de'],
    ['Ciao, è già qui ✓', 'Q', 3, 6, '52927b51551ca525'],
    ['x'.repeat(300), 'L', 11, 0, 'd0e99d48c1aa34f5'],
    ['https://socialbot.live/u/un-nome-molto-lungo-per-una-versione-grande?utm=qr', 'H', 8, 2, 'c3f67ae6e65cc0f7'],
  ];
  for (const [s, l, v, m, h] of casi) {
    const q = Q.codifica(s, { livello: l });
    assert.deepEqual([q.versione, q.maschera, impronta(q)], [v, m, h], `${s.slice(0, 30)} ${l}`);
  }
});

test('la penalita\' non dipende dal verso: specchiata o trasposta, la stessa matrice costa uguale', () => {
  // Le quattro regole della norma sono simmetriche (N3 vale col chiaro da
  // tutti e due i lati), quindi una differenza qui e' una regola contata male.
  for (const [s, l] of [['https://socialbot.live/u/andryx', 'M'], ['x'.repeat(300), 'L'], ['Ciao, è già qui ✓', 'Q']]) {
    const q = Q.codifica(s, { livello: l }), n = q.n;
    const giro = (f) => { const m = new Uint8Array(n * n); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) m[y * n + x] = q.scuro[f(x, y)]; return m; };
    const p = Q.penalita(q.scuro, n);
    assert.equal(Q.penalita(giro((x, y) => y * n + (n - 1 - x)), n), p, `${s.slice(0, 20)}: specchiata`);
    assert.equal(Q.penalita(giro((x, y) => x * n + y), n), p, `${s.slice(0, 20)}: trasposta`);
  }
});

test('quanto ci sta: le capacita\' in byte della norma', () => {
  const cap = (v, l) => { let n = 0; while (Q.versioneMinima(n + 1, l) && Q.versioneMinima(n + 1, l) <= v) n++; return n; };
  const attese = { 1: [17, 14, 11, 7], 2: [32, 26, 20, 14], 3: [53, 42, 32, 24], 4: [78, 62, 46, 34], 5: [106, 84, 60, 44], 10: [271, 213, 151, 119], 40: [2953, 2331, 1663, 1273] };
  for (const [v, c] of Object.entries(attese)) assert.deepEqual(['L', 'M', 'Q', 'H'].map((l) => cap(Number(v), l)), c, `versione ${v}`);
  assert.throws(() => Q.codifica('x'.repeat(2954), { livello: 'L' }), /troppo lungo/);
});

test('la tabella dei blocchi torna con la geometria di ogni versione', () => {
  for (let v = 1; v <= 40; v++) {
    const q = Q.codifica('a', { livello: 'L', versione: v });
    let liberi = 0;
    for (let i = 0; i < q.n * q.n; i++) liberi += q.funzione[i] ? 0 : 1;
    for (const l of Q.LIVELLI) {
      const [ec, b1, d1, b2, d2] = Q.BLOCCHI[v - 1][Q.LIVELLI.indexOf(l)];
      assert.equal(b1 * (d1 + ec) + b2 * (d2 + ec), Math.floor(liberi / 8), `versione ${v} ${l}`);
      if (b2) assert.equal(d2, d1 + 1);
    }
  }
  assert.deepEqual([2, 7, 14, 21, 32, 40].map((v) => Q.allineamenti(v)),
    [[6, 18], [6, 22, 38], [6, 26, 46, 66], [6, 28, 50, 72, 94], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142, 170]]);
});

test('quello che si scrive si rilegge, in ogni livello e con gli accenti', () => {
  for (const s of ['https://socialbot.live/u/andryx', 'è già qui ✓ 🎮', 'a', 'z'.repeat(500)]) {
    for (const l of Q.LIVELLI) {
      const q = Q.codifica(s, { livello: l });
      const r = Q.leggi(q.scuro, q.n);
      assert.equal(r?.testo, s, `${s.slice(0, 20)} ${l}`);
      assert.deepEqual([r.livello, r.maschera, r.errori], [l, q.maschera, 0]);
    }
  }
});

test('gli errori si correggono fino a meta\' dei codici di correzione di ogni blocco, non oltre', () => {
  const q = Q.codifica('https://socialbot.live/u/andryx?da=qr', { livello: 'H' });
  const guasta = (per) => {
    const s = new Uint8Array(q.scuro);
    const fatti = q.blocchi.map(() => new Set());
    for (let k = 0; k < q.n * q.n; k++) {
      const w = q.parola[k];
      if (w < 0) continue;
      const b = q.blocco[w];
      if (fatti[b].has(w) || fatti[b].size < per(b)) { if (!fatti[b].has(w)) fatti[b].add(w); if ((k % 3) === 0) s[k] ^= 1; }
    }
    return s;
  };
  const t = (b) => Math.floor(q.blocchi[b].ec / 2);
  const r = Q.leggi(guasta(t), q.n);
  assert.equal(r?.testo, q.testo, 'al limite si legge');
  assert.ok(r.errori > 0);
  assert.equal(Q.leggi(guasta((b) => q.blocchi[b].ec), q.n)?.testo === q.testo, false, 'oltre il limite non si inventa il testo giusto');
});

test('i quadri d\'allineamento hanno la forma degli occhi, mai quella dei quadratini', () => {
  // Un lettore vero cerca l'allineamento come un anello continuo: fatto a
  // puntini e' poroso, e a immagine nitida non lo trova piu'.
  for (const [s, l] of [['https://socialbot.live/u/andryx_demo', 'M'], ['x'.repeat(300), 'L']]) {
    const p = Q.progetto(s, { moduli: 'puntini', occhi: 'tondi' });
    const q = p.qr, n = q.n, d = Q.percorsi(p, Q.geometria(p, 480)), A = Q.allineamenti(q.versione);
    const occhi = [[0, 0], [n - 7, 0], [0, n - 7]], dentro = (x, y, [a, b], lato) => x >= a && x < a + lato && y >= b && y < b + lato;
    const piccoli = [];
    for (const y of A) for (const x of A) if (!occhi.some((o) => dentro(x, y, o, 7))) piccoli.push([x - 2, y - 2]);
    let attesi = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (q.scuro[y * n + x] && !occhi.some((o) => dentro(x, y, o, 7)) && !piccoli.some((a) => dentro(x, y, a, 5))) attesi++;
    }
    assert.ok(piccoli.length >= 1, `${l}: la versione ${q.versione} ha i suoi allineamenti`);
    assert.equal((d.moduli.match(/M/g) || []).length, attesi, `${l}: un puntino per ogni quadratino, nessuno negli allineamenti`);
    assert.equal((d.occhi.match(/M/g) || []).length, 3 * (occhi.length + piccoli.length), `${l}: tre anelli per ogni occhio e ogni allineamento`);
  }
});

// Un percorso SVG spezzato in contorni di segmenti: quello che serve per
// misurare dove un raggio esce da una forma. Solo i comandi che il QR usa.
function contorni(d) {
  const t = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g), out = [];
  let cur = null, x = 0, y = 0, sx = 0, sy = 0, i = 0, cmd = '';
  const num = () => Number(t[i++]);
  const va = (px, py) => { cur.push([px, py]); x = px; y = py; };
  const curva = (f) => { for (let k = 1; k <= 24; k++) va(...f(k / 24)); };
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    if (cmd === 'M') { cur = []; out.push(cur); va(num(), num()); sx = x; sy = y; cmd = 'L'; }
    else if (cmd === 'L') va(num(), num());
    else if (cmd === 'h') va(x + num(), y);
    else if (cmd === 'v') va(x, y + num());
    else if (cmd === 'Q') { const [a, b, c, e, x0, y0] = [num(), num(), num(), num(), x, y]; curva((u) => [(1 - u) ** 2 * x0 + 2 * (1 - u) * u * a + u * u * c, (1 - u) ** 2 * y0 + 2 * (1 - u) * u * b + u * u * e]); }
    else if (cmd === 'C') { const [a, b, c, e, f, g, x0, y0] = [num(), num(), num(), num(), num(), num(), x, y]; curva((u) => [(1 - u) ** 3 * x0 + 3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u * u * c + u ** 3 * f, (1 - u) ** 3 * y0 + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u * u * e + u ** 3 * g]); }
    else if (cmd === 'a') {
      const r = num(); num(); num(); num(); const verso = num(), dx = num(), dy = num();
      const cx = x + dx / 2, cy = y + dy / 2, a0 = Math.atan2(y - cy, x - cx), giro = verso ? Math.PI : -Math.PI;
      curva((u) => [cx + r * Math.cos(a0 + giro * u), cy + r * Math.sin(a0 + giro * u)]);
    } else if (cmd === 'Z' || cmd === 'z') { va(sx, sy); cmd = ''; }
    else throw new Error('comando ' + cmd);
  }
  return out;
}
// Dove il raggio dal centro, nella direzione a, esce dal contorno.
function uscita(c, [cx, cy], a) {
  const ux = Math.cos(a), uy = Math.sin(a);
  let meglio = null;
  for (let k = 1; k < c.length; k++) {
    const [x1, y1] = c[k - 1], [x2, y2] = c[k], ex = x2 - x1, ey = y2 - y1, den = ux * ey - uy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((x1 - cx) * ey - (y1 - cy) * ex) / den, s = ((x1 - cx) * uy - (y1 - cy) * ux) / den;
    if (t > 0 && s >= -1e-9 && s <= 1 + 1e-9) meglio = Math.max(meglio ?? 0, t);
  }
  return meglio;
}

test('gli anelli di ogni occhio sono copie in scala: 1:1:3:1:1 in ogni direzione, con ogni forma', () => {
  // Un lettore misura l'occhio anche in diagonale. Le proporzioni tengono in
  // ogni direzione solo se le tre forme sono la stessa, ingrandita 7:5:3
  // attorno al centro (5:3:1 per gli allineamenti). Con un logo pieno di
  // segni, un occhio che non le tiene perde contro i falsi candidati.
  for (const occhi of Q.STILI.occhi) {
    const p = Q.progetto('https://socialbot.live/u/andryx_demo', { occhi, logo: { img: null, w: 1, h: 1 }, seme: 'qr:prova' });
    const geo = Q.geometria(p, 480), { m, x0, y0 } = geo, n = p.qr.n, d = Q.percorsi(p, geo);
    const cc = contorni(d.occhi);
    const centri = [[0, 0], [n - 7, 0], [0, n - 7]].map(([a, b]) => [7, x0 + (a + 3.5) * m, y0 + (b + 3.5) * m]);
    const A = Q.allineamenti(p.qr.versione);
    for (const ay of A) for (const ax of A) if (!((ax < 8 && ay < 8) || (ax > n - 9 && ay < 8) || (ax < 8 && ay > n - 9))) centri.push([5, x0 + (ax + 0.5) * m, y0 + (ay + 0.5) * m]);
    assert.equal(cc.length, 3 * centri.length, `${occhi}: tre anelli per ognuno`);
    centri.forEach(([l, cx, cy], j) => {
      const [c0, c1, c2] = cc.slice(3 * j, 3 * j + 3);
      for (let k = 0; k < 72; k++) {
        const a = (k / 72) * 2 * Math.PI, [d0, d1, d2] = [c0, c1, c2].map((c) => uscita(c, [cx, cy], a));
        assert.ok(Math.abs(d1 / d0 - (l - 2) / l) < 0.004 && Math.abs(d2 / d0 - (l - 4) / l) < 0.004,
          `${occhi}, ${l === 7 ? 'occhio' : 'allineamento'} ${j} a ${k * 5}°: ${(d1 / d0).toFixed(3)} e ${(d2 / d0).toFixed(3)} invece di ${((l - 2) / l).toFixed(3)} e ${((l - 4) / l).toFixed(3)}`);
      }
    });
  }
});

test('il danno di un riquadro si conta per blocco, e i disegni fissi non si toccano', () => {
  const q = Q.codifica('https://socialbot.live/u/andryx', { livello: 'H' });
  const celle = [];
  const c = Math.floor(q.n / 2);
  for (let y = c - 2; y <= c + 2; y++) for (let x = c - 2; x <= c + 2; x++) celle.push(y * q.n + x);
  const d = Q.danno(q, celle);
  assert.equal(d.funzioni, 0, 'al centro di una versione 3 non ci sono disegni fissi');
  assert.ok(d.quota > 0 && d.quota < 1);
  assert.ok(Q.danno(q, [0]).funzioni === 1, 'l\'angolo e\' un occhio');
});

// ── I GRADINI DEL QR DI UNA GRAFICA (docs/STRUMENTI.md) ────────────────────
// Le Grafiche disegnano il QR con lo stile salvato nella scheda «QR su misura».
// Quando non si puo' tutto, si scende di un gradino alla volta e si dice
// perche': il tuo stile, poi senza logo, poi le forme morbide al posto della
// penna, e quello di serie solo se i colori non si leggono o se la rilettura
// fallisce. Prima c'era un ripiego unico, «tutto o di serie»: un logo che non
// ci stava buttava via anche forme e colori.
const LOGO = { img: null, w: 1, h: 1 };
const PAGINA = (login) => 'https://socialbot.live/u/' + login;
const NOMI = 'andryx_demo1234567890streamerxyz';

test('i gradini: il logo che non ci sta toglie il logo, non lo stile', () => {
  const g = (testo, stile, opz) => { const s = Q.scegli(testo, stile, opz); return [s.gradino, s.motivo]; };
  assert.deepEqual(g(PAGINA('andryx'), {}, {}), ['tuo', ''], 'lo stile di serie salvato e\' il tuo');
  const mio = { moduli: 'puntini', occhi: 'tondi', scuro: '#1d2a6b', chiaro: '#ffffff', logo: 'immagine', logoLato: 100 };
  const tuo = Q.scegli(PAGINA('andryx'), mio, { logo: LOGO, penna: true });
  assert.deepEqual([tuo.gradino, tuo.p.qr.livello, !!tuo.p.targa], ['tuo', 'H', true], 'col logo: livello H e il riquadro al centro');
  const lungo = PAGINA('x'.repeat(40));
  assert.ok(Q.codifica(lungo, { livello: 'H' }).versione >= 7, 'la prova e\' davvero una versione 7 o piu\'');
  const giu = Q.scegli(lungo, mio, { logo: LOGO, penna: true });
  assert.deepEqual([giu.gradino, giu.motivo], ['senza-logo', 'logo-grande'], 'dalla 7 in su un allineamento sta al centro: niente logo, ma non quello di serie');
  assert.deepEqual([giu.p.stile.moduli, giu.p.stile.occhi, giu.p.stile.scuro, giu.p.qr.livello, giu.p.targa], ['puntini', 'tondi', '#1d2a6b', 'M', null], 'forme e colori restano, e senza logo torna il livello M');
  assert.deepEqual(g(PAGINA('andryx'), { logo: 'foto' }, { logo: null }), ['senza-logo', 'logo-assente'], 'la foto che non arriva');
  const morbido = Q.scegli(PAGINA('andryx'), { moduli: 'penna', occhi: 'penna' }, { penna: false });
  assert.deepEqual([morbido.gradino, morbido.motivo, morbido.p.stile.moduli, morbido.p.stile.occhi], ['morbido', 'penna', 'morbidi', 'morbidi'], 'senza il motore della penna: morbidi, ed e\' detto');
  const due = Q.scegli(PAGINA('andryx'), { moduli: 'penna', logo: 'foto' }, { penna: false, logo: null });
  assert.deepEqual([due.gradino, due.motivi], ['morbido', ['logo-assente', 'penna']], 'due guai insieme: il gradino piu\' basso, e tutti e due i perche\'');
  const colori = Q.scegli(PAGINA('andryx'), { ...mio, scuro: '#eeeeee' }, { logo: LOGO, penna: true });
  assert.deepEqual([colori.gradino, colori.motivo, colori.p.stile.moduli, colori.p.stile.scuro], ['serie', 'colori', 'quadrati', '#150910'], 'solo i colori illeggibili portano a quello di serie');
  assert.equal(Q.scegli('', mio, {}).gradino, 'nessuno', 'senza testo non c\'e\' QR');
});

test('i gradini dopo il primo sono i ripieghi della rilettura, in ordine', () => {
  const mio = { moduli: 'penna', occhi: 'penna', logo: 'immagine' };
  const lista = Q.gradini(PAGINA('andryx'), mio, { logo: LOGO, penna: true, seme: 'qr:andryx' });
  assert.deepEqual(lista.map((x) => [x.gradino, x.motivo]), [['tuo', ''], ['senza-logo', 'rilettura'], ['serie', 'rilettura']]);
  assert.ok(lista.every((x) => x.p.stile.seme === 'qr:andryx'), 'il seme della penna e\' quello del canale');
  assert.ok(Q.GRADINI.indexOf('senza-logo') < Q.GRADINI.indexOf('morbido') && Q.GRADINI.indexOf('morbido') < Q.GRADINI.indexOf('serie'));
  const a = Q.gradini(PAGINA('andryx'), mio, { logo: LOGO, penna: true, seme: 's' });
  const b = Q.gradini(PAGINA('andryx'), mio, { logo: LOGO, penna: true, seme: 's' });
  assert.deepEqual(a.map((x) => Q.percorsi(x.p, Q.geometria(x.p, 180)).moduli), b.map((x) => Q.percorsi(x.p, Q.geometria(x.p, 180)).moduli), 'deterministico: stessi ingressi, stesso disegno');
});

test('la misura logica resta la stessa a ogni scala: il modulo cresce intero, niente bitmap ingrandita', () => {
  for (const login of ['abc', 'andryx', NOMI.slice(0, 30)]) for (const P of [180, 190]) for (const stile of [{}, { logo: 'foto' }]) {
    const p = Q.scegli(PAGINA(login), stile, { logo: LOGO, penna: true }).p, g1 = Q.geometria(p, P);
    assert.ok(g1.W <= P, `${login} ${P}: il QR sta nel suo riquadro`);
    for (const s of [1, 2, 3]) {
      const g = Q.misura(p, P, s);
      assert.deepEqual([g.m, g.W, g.x0, g.y0], [g1.m * s, g1.W * s, g1.x0 * s, g1.y0 * s], `${login} ${P} a scala ${s}`);
    }
  }
});

// Il disegno vero, pixel per pixel: i tracciati di moduli e occhi riempiti
// come fa la tela (nonzero per i moduli, evenodd per gli occhi), campionati al
// centro di ogni pixel. Il logo e' il caso peggiore: ogni modulo sotto il suo
// riquadro esce al contrario.
function dipingi(p, geo) {
  const { W, H, m, n, x0, y0 } = geo, d = Q.percorsi(p, geo), s = p.stile;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const data = new Uint8ClampedArray(W * H * 4);
  const metti = (i, c) => { data[i * 4] = c[0]; data[i * 4 + 1] = c[1]; data[i * 4 + 2] = c[2]; data[i * 4 + 3] = 255; };
  const chiaro = rgb(s.chiaro), scuro = rgb(s.scuro);
  for (let i = 0; i < W * H; i++) metti(i, chiaro);
  const riempi = (tracciato, colore, pari) => {
    const righe = Array.from({ length: H }, () => []);
    for (const c of contorni(tracciato)) {
      const pt = c.slice();
      if (pt.length && (pt[0][0] !== pt[pt.length - 1][0] || pt[0][1] !== pt[pt.length - 1][1])) pt.push(pt[0]);
      for (let k = 1; k < pt.length; k++) {
        const [xa, ya] = pt[k - 1], [xb, yb] = pt[k];
        if (ya === yb) continue;
        const r0 = Math.max(0, Math.ceil(Math.min(ya, yb) - 0.5)), r1 = Math.min(H - 1, Math.ceil(Math.max(ya, yb) - 0.5) - 1);
        for (let r = r0; r <= r1; r++) righe[r].push([xa, ya, xb, yb]);
      }
    }
    righe.forEach((lati, r) => {
      const y = r + 0.5;
      const tagli = lati.map(([xa, ya, xb, yb]) => ({ x: xa + ((y - ya) * (xb - xa)) / (yb - ya), v: yb > ya ? 1 : -1 })).sort((a, b) => a.x - b.x);
      let w = 0;
      for (let i = 0; i + 1 < tagli.length; i++) {
        w = pari ? w ^ 1 : w + tagli[i].v;
        if (!w) continue;
        for (let x = Math.max(0, Math.ceil(tagli[i].x - 0.5)); x < Math.min(W, Math.ceil(tagli[i + 1].x - 0.5)); x++) metti(r * W + x, colore);
      }
    });
  };
  riempi(d.moduli, scuro, false);
  riempi(d.occhi, rgb(s.occhio || s.scuro), true);
  if (d.targa) {
    const T = d.targa;
    for (let y = Math.floor(T.y); y < T.y + T.lato; y++) for (let x = Math.floor(T.x); x < T.x + T.lato; x++) {
      const mx = Math.floor((x + 0.5 - x0) / m), my = Math.floor((y + 0.5 - y0) / m);
      if (mx >= 0 && my >= 0 && mx < n && my < n) metti(y * W + x, p.qr.scuro[my * n + mx] ? chiaro : scuro);
    }
  }
  return { width: W, height: H, data };
}

test('a 180 e 190 px gli indirizzi veri si rileggono dal disegno, con ogni forma e col logo peggiore', () => {
  // Ogni lunghezza della pagina link con lo stile di serie; le forme e i loghi
  // sulle lunghezze dove cambia la versione e sugli indirizzi delle piattaforme.
  const indirizzi = [], conForme = new Set();
  for (let k = 3; k <= 30; k++) indirizzi.push(PAGINA(NOMI.slice(0, k)));
  for (const k of [3, 6, 17, 30]) conForme.add(PAGINA(NOMI.slice(0, k)));
  for (const [l, u] of [['kick.' + NOMI.slice(0, 25), 'kick.com/' + NOMI.slice(0, 25)], ['yt.' + NOMI.slice(0, 27), 'youtube.com/@' + NOMI.slice(0, 27)], ['andryx', 'twitch.tv/andryx'], [NOMI.slice(0, 25), 'twitch.tv/' + NOMI.slice(0, 25)]]) {
    indirizzi.push(PAGINA(l), 'https://' + u);
    conForme.add(PAGINA(l)).add('https://' + u);
  }
  const stili = [
    {},
    { moduli: 'penna', occhi: 'penna', scuro: '#1d2a6b', logo: 'immagine', logoLato: 100 },
    { moduli: 'puntini', occhi: 'tondi', scuro: '#1f4d2b', chiaro: '#fbfaf5', logo: 'foto', logoLato: 60 },
    { moduli: 'morbidi', occhi: 'morbidi', scuro: '#ba007a' },
  ];
  let casi = 0;
  for (const testo of indirizzi) for (const [i, stile] of stili.entries()) {
    if (i && !conForme.has(testo)) continue;
    const scelta = Q.scegli(testo, stile, { logo: LOGO, penna: true, seme: 'qr:prova' });
    assert.equal(scelta.gradino, 'tuo', `${testo}: col logo ci sta (versione ${scelta.p.qr.versione})`);
    for (const P of [180, 190]) for (const s of i ? [1, 2] : [1]) {
      const geo = Q.misura(scelta.p, P, s);
      const r = Q.rileggi(dipingi(scelta.p, geo), scelta.p, geo);
      assert.ok(r.ok, `${testo} stile ${i} a ${P} px (scala ${s}, modulo ${geo.m} px): non si rilegge`);
      casi++;
    }
  }
  assert.ok(casi >= 80, `casi provati: ${casi}`);
});

test('la rilettura sa dire di no: un QR guastato oltre la correzione non torna', () => {
  const p = Q.scegli(PAGINA('andryx'), {}, {}).p, geo = Q.misura(p, 180, 1), img = dipingi(p, geo);
  const { m, x0, y0, n } = geo;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (p.qr.funzione[y * n + x] || (x * 7 + y * 3) % 2) continue;
    const cx = Math.floor(x0 + (x + 0.5) * m), cy = Math.floor(y0 + (y + 0.5) * m), i = (cy * geo.W + cx) * 4;
    for (let k = 0; k < 3; k++) img.data[i + k] = 255 - img.data[i + k];
  }
  assert.equal(Q.rileggi(img, p, geo).ok, false);
});
