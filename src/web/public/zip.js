// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';

  const TAB = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(b) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < b.length; i++) c = TAB[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  const enc = new TextEncoder();
  const byte = (x) => (typeof x === 'string' ? enc.encode(x) : x instanceof Uint8Array ? x : new Uint8Array(x));

  function quando(data) {
    const d = data instanceof Date && !isNaN(data) ? data : new Date(1980, 0, 1);
    const anno = Math.min(2107, Math.max(1980, d.getFullYear()));
    return {
      ora: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      giorno: ((anno - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    };
  }

  function crea(file, { data } = {}) {
    const t = quando(data);
    const parti = [], centrale = [];
    let pos = 0;
    for (const f of file) {
      const nome = byte(String(f.nome));
      const dati = byte(f.dati);
      const crc = crc32(dati);
      const loc = new DataView(new ArrayBuffer(30));
      loc.setUint32(0, 0x04034b50, true);
      loc.setUint16(4, 20, true);
      loc.setUint16(6, 0x0800, true);
      loc.setUint16(8, 0, true);
      loc.setUint16(10, t.ora, true);
      loc.setUint16(12, t.giorno, true);
      loc.setUint32(14, crc, true);
      loc.setUint32(18, dati.length, true);
      loc.setUint32(22, dati.length, true);
      loc.setUint16(26, nome.length, true);
      loc.setUint16(28, 0, true);
      parti.push(new Uint8Array(loc.buffer), nome, dati);

      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true);
      cen.setUint16(4, 20, true);
      cen.setUint16(6, 20, true);
      cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true);
      cen.setUint16(12, t.ora, true);
      cen.setUint16(14, t.giorno, true);
      cen.setUint32(16, crc, true);
      cen.setUint32(20, dati.length, true);
      cen.setUint32(24, dati.length, true);
      cen.setUint16(28, nome.length, true);
      cen.setUint32(42, pos, true);
      centrale.push(new Uint8Array(cen.buffer), nome);
      pos += 30 + nome.length + dati.length;
    }
    const lungo = centrale.reduce((a, x) => a + x.length, 0);
    const fine = new DataView(new ArrayBuffer(22));
    fine.setUint32(0, 0x06054b50, true);
    fine.setUint16(8, file.length, true);
    fine.setUint16(10, file.length, true);
    fine.setUint32(12, lungo, true);
    fine.setUint32(16, pos, true);
    const tutto = [...parti, ...centrale, new Uint8Array(fine.buffer)];
    const out = new Uint8Array(tutto.reduce((a, x) => a + x.length, 0));
    let i = 0;
    for (const x of tutto) { out.set(x, i); i += x.length; }
    return out;
  }

  const ZIP = { crc32, crea };
  if (typeof module !== 'undefined' && module.exports) module.exports = ZIP;
  else radice.SB_ZIP = ZIP;
})(typeof window !== 'undefined' ? window : globalThis);
