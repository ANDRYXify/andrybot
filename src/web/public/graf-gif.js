

(() => {
  'use strict';

  function medianCut(campione, maxColori) {

    const n = campione.length / 3;
    let box = { lo: 0, hi: n };
    const punti = new Array(n);
    for (let i = 0; i < n; i++) punti[i] = [campione[i * 3], campione[i * 3 + 1], campione[i * 3 + 2]];

    const estensione = (b) => {
      let rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0;
      for (let i = b.lo; i < b.hi; i++) {
        const p = punti[i];
        if (p[0] < rmin) rmin = p[0]; if (p[0] > rmax) rmax = p[0];
        if (p[1] < gmin) gmin = p[1]; if (p[1] > gmax) gmax = p[1];
        if (p[2] < bmin) bmin = p[2]; if (p[2] > bmax) bmax = p[2];
      }
      return { r: rmax - rmin, g: gmax - gmin, b: bmax - bmin };
    };

    let boxes = [box];
    while (boxes.length < maxColori) {

      let idx = -1, best = -1, canale = 0;
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        if (b.hi - b.lo < 2) continue;
        const e = estensione(b);
        const m = Math.max(e.r, e.g, e.b);
        if (m > best) { best = m; idx = i; canale = e.r >= e.g && e.r >= e.b ? 0 : (e.g >= e.b ? 1 : 2); }
      }
      if (idx < 0) break;
      const b = boxes[idx];

      const seg = punti.slice(b.lo, b.hi).sort((x, y) => x[canale] - y[canale]);
      for (let i = 0; i < seg.length; i++) punti[b.lo + i] = seg[i];
      const mid = b.lo + (b.hi - b.lo >> 1);
      boxes.splice(idx, 1, { lo: b.lo, hi: mid }, { lo: mid, hi: b.hi });
    }

    const palette = [];
    for (const b of boxes) {
      let r = 0, g = 0, bl = 0; const cnt = b.hi - b.lo || 1;
      for (let i = b.lo; i < b.hi; i++) { r += punti[i][0]; g += punti[i][1]; bl += punti[i][2]; }
      palette.push([Math.round(r / cnt), Math.round(g / cnt), Math.round(bl / cnt)]);
    }
    while (palette.length < 2) palette.push([0, 0, 0]);
    return palette;
  }

  function costruisciCache(palette) {
    const cache = new Int16Array(32768).fill(-1);
    return (r, g, b) => {
      const key = (r >> 3 << 10) | (g >> 3 << 5) | (b >> 3);
      let idx = cache[key];
      if (idx >= 0) return idx;

      const cr = (r & ~7) + 4, cg = (g & ~7) + 4, cb = (b & ~7) + 4;
      let best = 0, bestD = Infinity;
      for (let i = 0; i < palette.length; i++) {
        const p = palette[i];
        const d = (cr - p[0]) * (cr - p[0]) + (cg - p[1]) * (cg - p[1]) + (cb - p[2]) * (cb - p[2]);
        if (d < bestD) { bestD = d; best = i; }
      }
      cache[key] = best;
      return best;
    };
  }

  function Bytes() {
    let buf = new Uint8Array(1 << 16), len = 0;
    const grow = (n) => { if (len + n <= buf.length) return; let cap = buf.length; while (cap < len + n) cap *= 2; const nb = new Uint8Array(cap); nb.set(buf); buf = nb; };
    return {
      u8(v) { grow(1); buf[len++] = v & 0xff; },
      u16(v) { grow(2); buf[len++] = v & 0xff; buf[len++] = (v >> 8) & 0xff; },
      str(s) { grow(s.length); for (let i = 0; i < s.length; i++) buf[len++] = s.charCodeAt(i); },
      raw(arr) { grow(arr.length); buf.set(arr, len); len += arr.length; },
      get() { return buf.slice(0, len); },
    };
  }

  function lzw(indici, minCode) {
    const out = Bytes();
    const clear = 1 << minCode;
    const eoi = clear + 1;
    let codeSize = minCode + 1;
    let dict = new Map();
    const reset = () => { dict = new Map(); for (let i = 0; i < clear; i++) dict.set(String(i), i); };
    let next = eoi + 1;
    reset();

    let acc = 0, accBits = 0;
    const blocco = [];
    const flushBlocco = () => { if (!blocco.length) return; out.u8(blocco.length); for (const b of blocco) out.u8(b); blocco.length = 0; };
    const emit = (code) => {
      acc |= code << accBits; accBits += codeSize;
      while (accBits >= 8) { blocco.push(acc & 0xff); acc >>= 8; accBits -= 8; if (blocco.length === 255) flushBlocco(); }
    };

    emit(clear);
    let prefisso = String(indici[0]);
    for (let i = 1; i < indici.length; i++) {
      const k = indici[i];
      const combo = prefisso + ',' + k;
      if (dict.has(combo)) { prefisso = combo; continue; }
      emit(dict.get(prefisso));
      dict.set(combo, next++);
      if (next === (1 << codeSize) + 1 && codeSize < 12) codeSize++;
      if (next > 4095) { emit(clear); codeSize = minCode + 1; next = eoi + 1; reset(); }
      prefisso = String(k);
    }
    emit(dict.get(prefisso));
    emit(eoi);
    if (accBits > 0) { blocco.push(acc & 0xff); }
    flushBlocco();
    out.u8(0);
    return out.get();
  }

  function encode(frames, w, h, delayCs) {
    if (!frames || !frames.length) throw new Error('nessun frame');
    delayCs = Math.max(2, Math.round(delayCs || 8));

    const passiF = Math.max(1, Math.floor(frames.length / 6));
    const passoP = Math.max(1, Math.floor((w * h) / 3000));
    const campione = [];
    for (let f = 0; f < frames.length; f += passiF) {
      const d = frames[f];
      for (let i = 0; i < w * h; i += passoP) { const j = i * 4; campione.push(d[j], d[j + 1], d[j + 2]); }
    }
    const palette = medianCut(campione, 256);
    const nearest = costruisciCache(palette);

    let bits = 1; while ((1 << bits) < palette.length) bits++;
    const tableLen = 1 << bits;
    const minCode = Math.max(2, bits);

    const out = Bytes();
    out.str('GIF89a');
    out.u16(w); out.u16(h);
    out.u8(0xF0 | (bits - 1));
    out.u8(0); out.u8(0);
    for (let i = 0; i < tableLen; i++) { const p = palette[i] || [0, 0, 0]; out.u8(p[0]); out.u8(p[1]); out.u8(p[2]); }

    out.u8(0x21); out.u8(0xFF); out.u8(0x0B); out.str('NETSCAPE2.0'); out.u8(0x03); out.u8(0x01); out.u16(0); out.u8(0);

    const idxBuf = new Uint8Array(w * h);

    for (let f = 0; f < frames.length; f++) {
      const src = frames[f];

      const rr = new Float32Array(w * h), gg = new Float32Array(w * h), bb = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) { const j = i * 4; rr[i] = src[j]; gg[i] = src[j + 1]; bb[i] = src[j + 2]; }
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const r = Math.max(0, Math.min(255, rr[i] | 0)), g = Math.max(0, Math.min(255, gg[i] | 0)), b = Math.max(0, Math.min(255, bb[i] | 0));
          const pi = nearest(r, g, b);
          idxBuf[i] = pi;
          const p = palette[pi];
          const er = r - p[0], eg = g - p[1], eb = b - p[2];

          if (x + 1 < w) { rr[i + 1] += er * 7 / 16; gg[i + 1] += eg * 7 / 16; bb[i + 1] += eb * 7 / 16; }
          if (y + 1 < h) {
            if (x > 0) { rr[i + w - 1] += er * 3 / 16; gg[i + w - 1] += eg * 3 / 16; bb[i + w - 1] += eb * 3 / 16; }
            rr[i + w] += er * 5 / 16; gg[i + w] += eg * 5 / 16; bb[i + w] += eb * 5 / 16;
            if (x + 1 < w) { rr[i + w + 1] += er * 1 / 16; gg[i + w + 1] += eg * 1 / 16; bb[i + w + 1] += eb * 1 / 16; }
          }
        }
      }

      out.u8(0x21); out.u8(0xF9); out.u8(0x04); out.u8(0x04); out.u16(delayCs); out.u8(0); out.u8(0);

      out.u8(0x2C); out.u16(0); out.u16(0); out.u16(w); out.u16(h); out.u8(0);
      out.u8(minCode);
      out.raw(lzw(idxBuf, minCode));
    }

    out.u8(0x3B);
    return out.get();
  }

  window.SB_GIF = { encode };
})();
