// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  const enc = new TextEncoder();
  const FORMATI = { A4: [595.28, 841.89] };
  const n2 = (x) => String(Math.round(x * 100) / 100);

  function utf16(s) {
    let h = 'FEFF';
    for (const c of String(s ?? '')) {
      const cp = c.codePointAt(0);
      if (cp > 0xffff) {
        const v = cp - 0x10000;
        h += (0xd800 + (v >> 10)).toString(16).padStart(4, '0') + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0');
      } else h += cp.toString(16).padStart(4, '0');
    }
    return '<' + h.toUpperCase() + '>';
  }

  function ascii(s) {
    const t = /^[\x20-\x7e]*$/.test(s) ? s : encodeURI(s);
    return '<' + Array.from(enc.encode(t), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase() + '>';
  }

  async function comprimi(dati) {
    const flusso = new Blob([dati]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(flusso).arrayBuffer());
  }

  const LARGHE = (() => {
    const w = new Array(256).fill(556);
    const metti = (da, lista) => lista.forEach((x, i) => { w[da + i] = x; });
    metti(32, [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
      1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
      333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584]);
    metti(128, [556, 556, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 556, 611, 556, 556, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 556, 500, 667]);
    metti(160, [278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611,
      667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
      556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500]);
    return w;
  })();
  const ANSI = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e,
    0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };

  function winAnsi(s) {
    const out = [];
    for (const c of String(s ?? '')) {
      const cp = c.codePointAt(0);
      if ((cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff)) out.push(cp);
      else if (ANSI[cp]) out.push(ANSI[cp]);
      else if (cp === 0x09 || cp === 0x0a) out.push(0x20);
      else if (!/\p{S}|\p{M}|\p{Cf}/u.test(c)) out.push(0x3f);
    }
    const pulito = out.filter((x, i) => x !== 0x20 || (i > 0 && out[i - 1] !== 0x20));
    while (pulito.length && pulito[pulito.length - 1] === 0x20) pulito.pop();
    return pulito;
  }

  function strato(testi, kx, ky, PH) {
    const righe = [];
    for (const t of testi || []) {
      const b = winAnsi(t.testo);
      if (!b.length || !(t.w > 0) || !(t.px > 0)) continue;
      const fs = t.px * ky;
      const naturale = b.reduce((a, x) => a + LARGHE[x], 0) / 1000 * fs;
      if (!(naturale > 0)) continue;
      const hex = b.map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
      righe.push(`/F1 ${n2(fs)} Tf ${n2(Math.min(1000, (100 * t.w * kx) / naturale))} Tz 1 0 0 1 ${n2(t.x * kx)} ${n2(PH - t.y * ky)} Tm <${hex}> Tj`);
    }
    return righe.length ? `\nBT 3 Tr\n${righe.join('\n')}\nET` : '';
  }

  async function daPagine(pagine, o = {}) {
    const [PW, PH] = FORMATI[o.formato || 'A4'];
    if (!Array.isArray(pagine) || !pagine.length) throw new Error('nessuna pagina');
    const corpi = [null, null, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
    const figli = [];
    for (const p of pagine) {
      const { w, h, rgb } = p || {};
      if (!(w > 0 && h > 0) || !rgb || rgb.length !== w * h * 3) throw new Error('immagine non valida');
      const kx = PW / w, ky = PH / h;
      const img = await comprimi(rgb);
      const link = (p.link || []).filter((l) => l && l.url && l.w > 0 && l.h > 0);
      const nPag = corpi.length + 1, nCont = nPag + 1, nImg = nPag + 2, nLink = nPag + 3;
      const disegno = enc.encode(`q ${n2(PW)} 0 0 ${n2(PH)} 0 0 cm /Im0 Do Q` + strato(p.testi, kx, ky, PH));
      const cont = await comprimi(disegno);
      corpi.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(PW)} ${n2(PH)}] /Resources << /XObject << /Im0 ${nImg} 0 R >> /Font << /F1 3 0 R >> >> /Contents ${nCont} 0 R${link.length ? ` /Annots [${link.map((_, i) => `${nLink + i} 0 R`).join(' ')}]` : ''} >>`);
      corpi.push([`<< /Length ${cont.length} /Filter /FlateDecode >>\nstream\n`, cont, '\nendstream']);
      corpi.push([`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${img.length} >>\nstream\n`, img, '\nendstream']);
      for (const l of link) {
        const r = [l.x * kx, PH - (l.y + l.h) * ky, (l.x + l.w) * kx, PH - l.y * ky].map(n2).join(' ');
        corpi.push(`<< /Type /Annot /Subtype /Link /Rect [${r}] /Border [0 0 0] /A << /S /URI /URI ${ascii(String(l.url))} >> >>`);
      }
      figli.push(nPag);
    }
    corpi[0] = '<< /Type /Catalog /Pages 2 0 R >>';
    corpi[1] = `<< /Type /Pages /Kids [${figli.map((n) => `${n} 0 R`).join(' ')}] /Count ${figli.length} >>`;
    corpi.push(`<< /Title ${utf16(o.titolo || '')} /Creator (SocialBot) >>`);
    const info = corpi.length;
    const parti = [], offset = [];
    let pos = 0;
    const metti = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parti.push(b); pos += b.length; };
    metti('%PDF-1.4\n');
    metti(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
    corpi.forEach((c, i) => {
      offset.push(pos);
      metti(`${i + 1} 0 obj\n`);
      for (const p of Array.isArray(c) ? c : [c]) metti(p);
      metti('\nendobj\n');
    });
    const xref = pos;
    metti(`xref\n0 ${corpi.length + 1}\n0000000000 65535 f \n` + offset.map((x) => `${String(x).padStart(10, '0')} 00000 n \n`).join(''));
    metti(`trailer\n<< /Size ${corpi.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(pos);
    let k = 0;
    for (const p of parti) { out.set(p, k); k += p.length; }
    return out;
  }

  const daRgb = (o) => daPagine([o], o);

  function rgbDi(tela) {
    const d = tela.getContext('2d').getImageData(0, 0, tela.width, tela.height).data;
    const rgb = new Uint8Array(tela.width * tela.height * 3);
    for (let i = 0, j = 0; i < d.length; i += 4, j += 3) {
      const a = d[i + 3] / 255;
      rgb[j] = Math.round(d[i] * a + 255 * (1 - a));
      rgb[j + 1] = Math.round(d[i + 1] * a + 255 * (1 - a));
      rgb[j + 2] = Math.round(d[i + 2] * a + 255 * (1 - a));
    }
    return rgb;
  }

  async function daTela(tela, o) {
    const byte = await daRgb({ ...(o || {}), w: tela.width, h: tela.height, rgb: rgbDi(tela) });
    return new Blob([byte], { type: 'application/pdf' });
  }

  async function daTele(fogli, o) {
    const byte = await daPagine(fogli.map((f) => ({ w: f.tela.width, h: f.tela.height, rgb: rgbDi(f.tela), link: f.link, testi: f.testi })), o || {});
    return new Blob([byte], { type: 'application/pdf' });
  }

  const PDF = { FORMATI, LARGHE, daRgb, daPagine, daTela, daTele, utf16, ascii, winAnsi };
  if (typeof module !== 'undefined' && module.exports) module.exports = PDF;
  else radice.SB_PDF = PDF;
})(typeof window !== 'undefined' ? window : globalThis);
