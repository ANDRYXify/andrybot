// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL PDF NOSTRO (src/web/public/pdf.js, docs/STRUMENTI.md): una o piu' pagine,
// ognuna con la sua immagine, i suoi link cliccabili e uno strato di testo
// invisibile che si seleziona e si cerca. Si controlla la forma del file come
// la legge un lettore: l'indice punta agli oggetti, ogni pagina e' nell'albero,
// l'immagine torna identica, i link stanno dove stavano sulla tela, il testo
// sta dove era scritto e largo quanto era.
import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../src/web/public/pdf.js');
const P = globalThis.SB_PDF;
const dec = new TextDecoder('latin1');

const W = 124, H = 175;
const rgb = (seme) => new Uint8Array(W * H * 3).map((_, i) => (i * 37 + (i >> 5) + seme) & 255);
const PAGINE = [
  { w: W, h: H, rgb: rgb(0), link: [{ x: 10, y: 20, w: 30, h: 10, url: 'mailto:lavoro@andryx.it' }, { x: 0, y: 165, w: 124, h: 10, url: 'https://instagram.com/andryx' }],
    testi: [{ testo: 'Andryx', x: 40, y: 30, px: 12, w: 50 }, { testo: 'Città già è — ok ↗ 🎮', x: 10, y: 60, px: 8, w: 80 }] },
  { w: W, h: H, rgb: rgb(7), link: [{ x: 5, y: 5, w: 20, h: 8, url: 'https://cal.example/andryx' }], testi: [{ testo: 'Pagina 2', x: 5, y: 170, px: 6, w: 30 }] },
];

async function fai(pagine = PAGINE, o = {}) {
  const b = await P.daPagine(pagine, { titolo: 'Media kit di Andryx è già qui ✓ 🎮', ...o });
  return { b, t: dec.decode(b) };
}
const hex = (h) => Buffer.from(h, 'hex');
const oggetto = (t, n) => {
  const i = t.indexOf(`\n${n} 0 obj\n`);
  return i < 0 ? null : t.slice(i + `\n${n} 0 obj\n`.length, t.indexOf('\nendobj\n', i));
};
async function flusso(b, t, n) {
  const i = t.indexOf(`\n${n} 0 obj\n`) + `\n${n} 0 obj\n`.length;
  const testa = /^<<[^>]*\/Length (\d+)[^>]*>>\nstream\n/.exec(t.slice(i));
  const da = i + testa[0].length, lung = Number(testa[1]);
  assert.equal(t.slice(da + lung, da + lung + 10), '\nendstream', 'lo stream finisce dove dice /Length');
  const f = new Blob([b.slice(da, da + lung)]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(f).arrayBuffer());
}

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

test('ogni pagina e\' nell\'albero, con la sua immagine identica e i suoi link', async () => {
  const { b, t } = await fai();
  const kids = /\/Type \/Pages \/Kids \[([^\]]*)\] \/Count (\d+)/.exec(t);
  const pagine = kids[1].match(/\d+(?= 0 R)/g).map(Number);
  assert.equal(Number(kids[2]), 2);
  assert.equal(pagine.length, 2);
  const kx = 595.28 / W, ky = 841.89 / H;
  for (const [k, n] of pagine.entries()) {
    const pag = oggetto(t, n);
    assert.match(pag, /^<< \/Type \/Page \/Parent 2 0 R \/MediaBox \[0 0 595\.28 841\.89\]/);
    const img = Number(/\/Im0 (\d+) 0 R/.exec(pag)[1]);
    assert.match(oggetto(t, img), new RegExp(`/Width ${W} /Height ${H} /ColorSpace /DeviceRGB`));
    assert.deepEqual(await flusso(b, t, img), PAGINE[k].rgb, `l'immagine della pagina ${k + 1} torna identica`);
    const ann = (/\/Annots \[([^\]]*)\]/.exec(pag)?.[1].match(/\d+(?= 0 R)/g) || []).map(Number);
    assert.equal(ann.length, PAGINE[k].link.length, `i link della pagina ${k + 1} sono suoi`);
    ann.forEach((a, j) => {
      const l = PAGINE[k].link[j];
      const m = /\/Subtype \/Link \/Rect \[([\d. ]+)\] \/Border \[0 0 0\] \/A << \/S \/URI \/URI <([0-9A-F]+)> >>/.exec(oggetto(t, a));
      const atteso = [l.x * kx, 841.89 - (l.y + l.h) * ky, (l.x + l.w) * kx, 841.89 - l.y * ky];
      m[1].split(' ').map(Number).forEach((x, q) => assert.ok(Math.abs(x - atteso[q]) <= 0.006, `y rovesciata, il PDF conta dal basso: ${x} contro ${atteso[q]}`));
      assert.equal(hex(m[2]).toString('latin1'), l.url);
    });
  }
  const { t: senza } = await fai([{ ...PAGINE[0], link: [] }]);
  assert.doesNotMatch(senza, /\/Annots/, 'senza link niente elenco vuoto');
});

test('il testo sta sotto l\'immagine, invisibile, dove era scritto e largo quanto era', async () => {
  const { b, t } = await fai();
  const pag = oggetto(t, Number(/\/Kids \[(\d+) 0 R/.exec(t)[1]));
  assert.match(pag, /\/Font << \/F1 3 0 R >>/);
  assert.equal(oggetto(t, 3), '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', 'un carattere di serie: niente da incorporare');
  const cont = dec.decode(await flusso(b, t, Number(/\/Contents (\d+) 0 R/.exec(pag)[1])));
  assert.ok(cont.startsWith('q 595.28 0 0 841.89 0 0 cm /Im0 Do Q\nBT 3 Tr\n'), 'prima l\'immagine, poi il testo in modo invisibile');
  assert.ok(cont.endsWith('\nET'));
  const righe = [...cont.matchAll(/\/F1 ([\d.]+) Tf ([\d.]+) Tz 1 0 0 1 ([\d.]+) ([\d.]+) Tm <([0-9A-F]+)> Tj/g)];
  assert.equal(righe.length, 2);
  const kx = 595.28 / W, ky = 841.89 / H;
  PAGINE[0].testi.forEach((x, i) => {
    const [, fs, tz, tx, ty, h] = righe[i];
    assert.ok(Math.abs(Number(tx) - x.x * kx) <= 0.006);
    assert.ok(Math.abs(Number(ty) - (841.89 - x.y * ky)) <= 0.006, 'sulla stessa riga di base');
    const byte = [...hex(h)];
    const largo = byte.reduce((a, c) => a + P.LARGHE[c], 0) / 1000 * Number(fs) * Number(tz) / 100;
    assert.ok(Math.abs(largo - x.w * kx) < 0.05, `largo quanto il disegno: ${largo} contro ${x.w * kx}`);
  });
  assert.equal(hex(righe[0][5]).toString('latin1'), 'Andryx');
  assert.equal(hex(righe[1][5]).toString('latin1'), 'Città già è \x97 ok', 'accenti e lineette in WinAnsi; frecce ed emoji, che non ci sono, saltate');
});

test('i caratteri fuori da WinAnsi: le lettere diventano ?, i simboli si saltano senza lasciare doppi spazi', () => {
  const s = (x) => Buffer.from(P.winAnsi(x)).toString('latin1');
  assert.equal(s('Ωmega e «virgolette» € ™'), '?mega e \xabvirgolette\xbb \x80 \x99');
  assert.equal(s('I miei lavori ↗'), 'I miei lavori');
  assert.equal(s('a ✓ 🎮 b'), 'a b');
  assert.equal(P.LARGHE.length, 256);
  assert.deepEqual([P.LARGHE[65], P.LARGHE[97], P.LARGHE[192], P.LARGHE[223], P.LARGHE[255]], [667, 556, 667, 611, 500], 'le larghezze di Helvetica');
});

test('una pagina sola, come prima: daRgb resta', async () => {
  const b = await P.daRgb({ ...PAGINE[0], titolo: 'x' });
  const t = dec.decode(b);
  assert.match(t, /\/Kids \[4 0 R\] \/Count 1/);
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
  await assert.rejects(() => P.daPagine([]), /nessuna pagina/);
});
