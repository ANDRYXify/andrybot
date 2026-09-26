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

  async function daRgb(o) {
    const { w, h, rgb } = o;
    if (!(w > 0 && h > 0) || !rgb || rgb.length !== w * h * 3) throw new Error('immagine non valida');
    const [PW, PH] = FORMATI[o.formato || 'A4'];
    const kx = PW / w, ky = PH / h;
    const img = await comprimi(rgb);
    const link = (o.link || []).filter((l) => l && l.url && l.w > 0 && l.h > 0);
    const corpi = [];
    const primo = 6, info = primo + link.length;
    corpi.push('<< /Type /Catalog /Pages 2 0 R >>');
    corpi.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    corpi.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(PW)} ${n2(PH)}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R${link.length ? ` /Annots [${link.map((_, i) => `${primo + i} 0 R`).join(' ')}]` : ''} >>`);
    const disegno = `q ${n2(PW)} 0 0 ${n2(PH)} 0 0 cm /Im0 Do Q`;
    corpi.push([`<< /Length ${disegno.length} >>\nstream\n`, disegno, '\nendstream']);
    corpi.push([`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${img.length} >>\nstream\n`, img, '\nendstream']);
    for (const l of link) {
      const r = [l.x * kx, PH - (l.y + l.h) * ky, (l.x + l.w) * kx, PH - l.y * ky].map(n2).join(' ');
      corpi.push(`<< /Type /Annot /Subtype /Link /Rect [${r}] /Border [0 0 0] /A << /S /URI /URI ${ascii(String(l.url))} >> >>`);
    }
    corpi.push(`<< /Title ${utf16(o.titolo || '')} /Creator (SocialBot) >>`);
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

  const PDF = { FORMATI, daRgb, daTela, utf16, ascii };
  if (typeof module !== 'undefined' && module.exports) module.exports = PDF;
  else radice.SB_PDF = PDF;
})(typeof window !== 'undefined' ? window : globalThis);
