// IL PDF NOSTRO (src/web/public/pdf.js, docs/STRUMENTI.md): una pagina con
// un'immagine e i link cliccabili. Si controlla la forma del file come la
// legge un lettore: l'indice punta agli oggetti, l'immagine torna identica, i
// link stanno dove stavano sulla tela.
import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../src/web/public/pdf.js');
const P = globalThis.SB_PDF;
const dec = new TextDecoder('latin1');

const W = 124, H = 175;
const rgb = new Uint8Array(W * H * 3).map((_, i) => (i * 37 + (i >> 5)) & 255);

async function fai(o = {}) {
  const b = await P.daRgb({ w: W, h: H, rgb, titolo: 'Media kit di Andryx è già qui ✓ 🎮', link: [
    { x: 10, y: 20, w: 30, h: 10, url: 'mailto:lavoro@andryx.it' },
    { x: 0, y: 165, w: 124, h: 10, url: 'https://instagram.com/andryx' },
  ], ...o });
  return { b, t: dec.decode(b) };
}

const hex = (h) => Buffer.from(h, 'hex');

test('il file ha la forma giusta: intestazione, indice, fine', async () => {
  const { t } = await fai();
  assert.ok(t.startsWith('%PDF-1.4\n'));
  assert.ok(t.endsWith('%%EOF\n'));
  const sx = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(t)[1]);
  assert.equal(t.slice(sx, sx + 5), 'xref\n', 'startxref punta all\'indice');
  const m = /xref\n0 (\d+)\n([\s\S]*?)trailer/.exec(t);
  const n = Number(m[1]);
  const voci = m[2].match(/.{20}/gs);
  assert.equal(voci.length, n, 'una voce di venti byte per oggetto');
  assert.equal(voci[0], '0000000000 65535 f \n');
  for (let i = 1; i < n; i++) {
    const off = Number(voci[i].slice(0, 10));
    assert.equal(t.slice(off, off + `${i} 0 obj`.length), `${i} 0 obj`, `l'oggetto ${i} e' dove dice l'indice`);
  }
  assert.match(t, new RegExp(`trailer\\n<< /Size ${n} /Root 1 0 R /Info ${n - 1} 0 R >>`));
});

test('l\'immagine, decompressa, e\' identica, e la lunghezza dichiarata e\' quella vera', async () => {
  const { b, t } = await fai();
  const m = /\/Width (\d+) \/Height (\d+) \/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/FlateDecode \/Length (\d+) >>\nstream\n/.exec(t);
  assert.deepEqual([Number(m[1]), Number(m[2])], [W, H]);
  const da = m.index + m[0].length, lung = Number(m[3]);
  assert.equal(t.slice(da + lung, da + lung + 10), '\nendstream', 'lo stream finisce dove dice /Length');
  const flusso = new Blob([b.slice(da, da + lung)]).stream().pipeThrough(new DecompressionStream('deflate'));
  const torna = new Uint8Array(await new Response(flusso).arrayBuffer());
  assert.deepEqual(torna, rgb);
  const c = /<< \/Length (\d+) >>\nstream\n(q [^\n]* Q)\nendstream/.exec(t);
  assert.equal(Number(c[1]), c[2].length);
  assert.equal(c[2], 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q', 'l\'immagine riempie la pagina A4');
});

test('i link stanno dove stavano sulla tela, con l\'indirizzo giusto', async () => {
  const { t } = await fai();
  const ann = [...t.matchAll(/\/Subtype \/Link \/Rect \[([\d. ]+)\] \/Border \[0 0 0\] \/A << \/S \/URI \/URI <([0-9A-F]+)> >>/g)];
  assert.equal(ann.length, 2);
  const kx = 595.28 / W, ky = 841.89 / H;
  const r0 = ann[0][1].split(' ').map(Number);
  assert.deepEqual(r0.map((x) => Math.round(x * 10)), [10 * kx, 841.89 - 30 * ky, 40 * kx, 841.89 - 20 * ky].map((x) => Math.round(x * 10)), 'y rovesciata: il PDF conta dal basso');
  assert.equal(hex(ann[0][2]).toString('latin1'), 'mailto:lavoro@andryx.it');
  assert.equal(hex(ann[1][2]).toString('latin1'), 'https://instagram.com/andryx');
  assert.match(t, /\/Annots \[6 0 R 7 0 R\]/);
  const { t: senza } = await fai({ link: [] });
  assert.doesNotMatch(senza, /\/Annots/, 'senza link niente elenco vuoto');
});

test('il titolo si legge con gli accenti e le emoji', async () => {
  const { t } = await fai();
  const h = /\/Title <FEFF([0-9A-F]+)>/.exec(t)[1];
  const b = hex(h);
  let s = '';
  for (let i = 0; i < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
  assert.equal(s, 'Media kit di Andryx è già qui ✓ 🎮');
});

test('un indirizzo con caratteri fuori dall\'ASCII si scrive codificato, e una tela sbagliata non esce', async () => {
  assert.equal(hex(P.ascii('https://x.it/città').slice(1, -1)).toString('latin1'), 'https://x.it/citt%C3%A0');
  await assert.rejects(() => P.daRgb({ w: 2, h: 2, rgb: new Uint8Array(5) }), /immagine non valida/);
});
