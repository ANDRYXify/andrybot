// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Il codificatore GIF (graf-gif.js) letto all'indietro da un decodificatore
// scritto qui, che non condivide niente con lui: se i due capiscono la stessa
// cosa, la GIF dice quello che crediamo. Per le emote animate servono tre cose
// che le Grafiche non usavano: il trasparente, un tempo per ogni fotogramma e
// un tetto ai colori. Le Grafiche, senza opzioni, devono avere gli stessi byte.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(RAD, 'src/web/public/graf-gif.js'), 'utf8'), ctx);
const { encode } = ctx.window.SB_GIF;

function decodifica(byte) {
  let p = 0;
  const u8 = () => byte[p++];
  const u16 = () => { const v = byte[p] | (byte[p + 1] << 8); p += 2; return v; };
  const testa = String.fromCharCode(...byte.slice(0, 6)); p = 6;
  const w = u16(), h = u16(), campi = u8(); u8(); u8();
  const tavola = [];
  if (campi & 0x80) for (let i = 0; i < 1 << ((campi & 7) + 1); i++) tavola.push([u8(), u8(), u8()]);
  const fotogrammi = [];
  let gce = null, giri = null;
  for (;;) {
    const b = u8();
    if (b === 0x3B) break;
    if (b === 0x21) {
      const etichetta = u8();
      const blocchi = [];
      for (let n = u8(); n; n = u8()) { blocchi.push(byte.slice(p, p + n)); p += n; }
      if (etichetta === 0xF9) {
        const d = blocchi[0];
        gce = { smaltimento: (d[0] >> 2) & 7, trasparente: d[0] & 1 ? d[3] : -1, ritardo: d[1] | (d[2] << 8) };
      } else if (etichetta === 0xFF && String.fromCharCode(...blocchi[0]) === 'NETSCAPE2.0') {
        giri = blocchi[1][1] | (blocchi[1][2] << 8);
      }
      continue;
    }
    assert.equal(b, 0x2C, 'dopo le estensioni viene un\'immagine');
    const x = u16(), y = u16(), fw = u16(), fh = u16(), fc = u8();
    assert.equal(fc & 0x80, 0, 'niente tavola locale');
    const minCode = u8();
    const dati = [];
    for (let n = u8(); n; n = u8()) { for (let i = 0; i < n; i++) dati.push(byte[p + i]); p += n; }
    fotogrammi.push({ x, y, w: fw, h: fh, ...gce, indici: lzw(dati, minCode, fw * fh) });
    gce = null;
  }
  return { testa, w, h, tavola, fotogrammi, giri };
}

function lzw(dati, minCode, quanti) {
  const clear = 1 << minCode, eoi = clear + 1;
  let size = minCode + 1, next = eoi + 1, prev = null;
  let dict = [];
  const reset = () => { dict = []; for (let i = 0; i < clear; i++) dict[i] = [i]; size = minCode + 1; next = eoi + 1; prev = null; };
  reset();
  const out = [];
  let acc = 0, bits = 0, i = 0;
  for (;;) {
    while (bits < size) { if (i >= dati.length) return out; acc |= dati[i++] << bits; bits += 8; }
    const code = acc & ((1 << size) - 1); acc >>>= size; bits -= size;
    if (code === clear) { reset(); continue; }
    if (code === eoi) break;
    let voce;
    if (code < next && dict[code]) voce = dict[code];
    else if (code === next && prev) voce = prev.concat(prev[0]);
    else throw new Error('codice LZW impossibile: ' + code);
    out.push(...voce);
    if (prev) { dict[next++] = prev.concat(voce[0]); if (next === 1 << size && size < 12) size++; }
    prev = voce;
  }
  assert.equal(out.length, quanti, 'ogni fotogramma ha tutti i suoi punti');
  return out;
}

// Fotogrammi di prova: quattro colori pieni a strisce, un buco trasparente
// che si sposta, e niente sfumature (cosi' senza dithering il colore torna esatto).
const COLORI = [[220, 30, 40], [20, 160, 60], [30, 60, 200], [250, 220, 0]];
function fotogramma(w, h, f, { buco = true } = {}) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const j = (y * w + x) * 4, c = COLORI[(x + y + f) % 4];
    const fuori = buco && Math.abs(x - ((f * 3) % w)) < 3 && y < h / 2;
    d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = fuori ? 0 : 255;
  }
  return d;
}

test('senza opzioni, come per le Grafiche: opaca, ritardo unico, giro infinito', () => {
  const w = 30, h = 20, frames = [0, 1, 2].map((f) => fotogramma(w, h, f, { buco: false }));
  const g = decodifica(encode(frames, w, h, 7));
  assert.equal(g.testa, 'GIF89a');
  assert.equal(g.giri, 0, 'NETSCAPE: si ripete per sempre');
  assert.equal(g.fotogrammi.length, 3);
  for (const fr of g.fotogrammi) {
    assert.equal(fr.ritardo, 7);
    assert.equal(fr.trasparente, -1, 'nessun trasparente');
    assert.equal(fr.smaltimento, 1, 'il fotogramma resta finché arriva il prossimo');
  }
});

test('col trasparente: i punti vuoti tornano vuoti, gli altri col loro colore esatto', () => {
  const w = 24, h = 16, frames = [0, 1, 2, 3].map((f) => fotogramma(w, h, f));
  const g = decodifica(encode(frames, w, h, 8, { trasparenza: true, dither: false }));
  g.fotogrammi.forEach((fr, f) => {
    assert.ok(fr.trasparente >= 0, 'il fotogramma dichiara il suo indice trasparente');
    assert.equal(fr.smaltimento, 2, 'si ripulisce prima del prossimo: il trasparente non lascia scie');
    const src = frames[f];
    for (let i = 0; i < w * h; i++) {
      const vuoto = src[i * 4 + 3] < 128;
      if (vuoto) { assert.equal(fr.indici[i], fr.trasparente, `punto ${i} del fotogramma ${f} vuoto`); continue; }
      assert.notEqual(fr.indici[i], fr.trasparente);
      assert.deepEqual(g.tavola[fr.indici[i]], [src[i * 4], src[i * 4 + 1], src[i * 4 + 2]], `punto ${i} del fotogramma ${f}`);
    }
  });
});

test('un tempo per ogni fotogramma, mai sotto i due centesimi', () => {
  const w = 10, h = 10, frames = [0, 1, 2, 3].map((f) => fotogramma(w, h, f));
  const g = decodifica(encode(frames, w, h, 8, { trasparenza: true, ritardi: [3, 12, 1, 0] }));
  assert.deepEqual(g.fotogrammi.map((x) => x.ritardo), [3, 12, 2, 8], 'il quarto senza tempo prende quello di serie');
});

test('il tetto ai colori vale, trasparente compreso', () => {
  const w = 64, h = 64;
  const frames = [0, 1].map((f) => {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) { d[i * 4] = (i * 13 + f) % 256; d[i * 4 + 1] = (i * 7) % 256; d[i * 4 + 2] = (i * 29) % 256; d[i * 4 + 3] = i % 17 ? 255 : 0; }
    return d;
  });
  for (const colori of [256, 64, 16, 4]) {
    const g = decodifica(encode(frames, w, h, 8, { trasparenza: true, colori }));
    const usati = new Set(g.fotogrammi.flatMap((x) => x.indici));
    assert.ok(usati.size <= colori, `${colori} colori: ne usa ${usati.size}`);
    assert.ok(g.tavola.length <= Math.max(4, colori), `${colori} colori: la tavola ne ha ${g.tavola.length}`);
  }
});

test('molti punti: il dizionario si svuota e si riparte senza perdere niente', () => {
  const w = 200, h = 150, d = new Uint8ClampedArray(w * h * 4);
  let s = 1;
  for (let i = 0; i < w * h; i++) { s = (s * 48271) % 2147483647; const c = COLORI[s % 4]; d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
  const g = decodifica(encode([d], w, h, 8, { dither: false }));
  const fr = g.fotogrammi[0];
  for (let i = 0; i < w * h; i++) assert.deepEqual(g.tavola[fr.indici[i]], [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]], `punto ${i}`);
});

test('senza dithering ogni punto prende il colore più vicino; col dithering no', () => {
  const w = 48, h = 32, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const j = (y * w + x) * 4; d[j] = x * 5; d[j + 1] = y * 7; d[j + 2] = 128; d[j + 3] = 255; }
  const vicino = (tav, r, g, b) => tav.reduce((m, c, i) => { const q = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; return q < m[1] ? [i, q] : m; }, [0, Infinity])[1];
  const lontani = (dither) => {
    const g = decodifica(encode([d], w, h, 8, { colori: 4, dither }));
    const fr = g.fotogrammi[0];
    let n = 0;
    for (let i = 0; i < w * h; i++) {
      const c = g.tavola[fr.indici[i]], q = (c[0] - d[i * 4]) ** 2 + (c[1] - d[i * 4 + 1]) ** 2 + (c[2] - d[i * 4 + 2]) ** 2;
      if (q > vicino(g.tavola, d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) + 3 * 8 * 8) n++;
    }
    return n;
  };
  assert.equal(lontani(false), 0, 'senza dithering nessun punto lontano dal suo colore');
  assert.ok(lontani(true) > 0, 'col dithering l\'errore si sparge sui vicini');
});
