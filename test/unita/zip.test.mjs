// LO ZIP NOSTRO (src/web/public/zip.js, docs/STRUMENTI.md): i pannelli si
// scaricano tutti insieme in un file solo. Le immagini sono gia' compresse,
// quindi entrano come sono; quello che deve essere giusto e' la forma del file,
// e la prova migliore e' farlo leggere a qualcuno che non siamo noi.
import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

await import('../../src/web/public/zip.js');
const Z = globalThis.SB_ZIP;
const enc = new TextEncoder();

test('il CRC-32 e\' quello della norma', () => {
  assert.equal(Z.crc32(enc.encode('123456789')), 0xCBF43926);
  assert.equal(Z.crc32(enc.encode('')), 0);
  assert.equal(Z.crc32(enc.encode('The quick brown fox jumps over the lazy dog')), 0x414FA339);
  if (typeof zlib.crc32 === 'function') {
    const b = new Uint8Array(5000).map((_, i) => (i * 131 + (i >> 3)) & 255);
    assert.equal(Z.crc32(b), zlib.crc32(b), 'uguale a quello di Node');
  }
});

const FILE = [
  { nome: 'pannello-01-chi-sono.png', dati: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 255]) },
  { nome: 'pannello-02-perché.png', dati: new Uint8Array(3000).map((_, i) => (i * 7) & 255) },
  { nome: 'testi.txt', dati: 'Chi sono\nhttps://socialbot.live/u/andryx\nCiao, sono Andryx ✓\n' },
];
const DATA = new Date(2026, 8, 27, 14, 30, 42);

// Un lettore scritto qui, dalla norma: si parte dalla fine come fa chiunque
// apra uno ZIP, e si controlla che l'indice e le intestazioni dicano lo stesso.
function leggi(b) {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const e = b.length - 22;
  assert.equal(v.getUint32(e, true), 0x06054b50, 'la fine dell\'archivio sta in fondo');
  const n = v.getUint16(e + 10, true), lungo = v.getUint32(e + 12, true), da = v.getUint32(e + 16, true);
  assert.equal(da + lungo, e, 'l\'indice finisce dove comincia la fine');
  const out = [];
  let p = da;
  for (let i = 0; i < n; i++) {
    assert.equal(v.getUint32(p, true), 0x02014b50);
    const crc = v.getUint32(p + 16, true), size = v.getUint32(p + 20, true), ln = v.getUint16(p + 28, true);
    const loc = v.getUint32(p + 42, true), flag = v.getUint16(p + 8, true);
    const nome = new TextDecoder().decode(b.slice(p + 46, p + 46 + ln));
    assert.equal(v.getUint32(loc, true), 0x04034b50, `${nome}: l'indice punta alla sua intestazione`);
    assert.equal(v.getUint32(loc + 14, true), crc);
    assert.equal(v.getUint16(loc + 26, true), ln);
    const dati = b.slice(loc + 30 + ln, loc + 30 + ln + size);
    out.push({ nome, dati, crc, flag, metodo: v.getUint16(p + 10, true), ora: v.getUint16(p + 12, true), giorno: v.getUint16(p + 14, true) });
    p += 46 + ln;
  }
  return out;
}

test('ogni file torna identico, col suo nome, e i nomi accentati dicono di essere UTF-8', () => {
  const z = Z.crea(FILE, { data: DATA });
  const letti = leggi(z);
  assert.deepEqual(letti.map((x) => x.nome), FILE.map((f) => f.nome));
  letti.forEach((x, i) => {
    const atteso = typeof FILE[i].dati === 'string' ? enc.encode(FILE[i].dati) : FILE[i].dati;
    assert.deepEqual([...x.dati], [...atteso], x.nome);
    assert.equal(x.crc, Z.crc32(atteso));
    assert.equal(x.metodo, 0, 'le immagini sono gia\' compresse: si mettono dentro come sono');
    assert.equal(x.flag & 0x0800, 0x0800, 'il bit che dice «nomi in UTF-8»');
  });
  assert.equal(letti[0].giorno, ((2026 - 1980) << 9) | (9 << 5) | 27);
  assert.equal(letti[0].ora, (14 << 11) | (30 << 5) | 21);
});

test('lo legge anche un lettore che non e\' il nostro', (t) => {
  try { execFileSync('python3', ['-c', 'import zipfile'], { stdio: 'ignore' }); }
  catch { t.skip('python3 non c\'e\' su questa macchina'); return; }
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-zip-'));
  try {
    const via = join(dir, 'pannelli.zip');
    writeFileSync(via, Z.crea(FILE, { data: DATA }));
    const letti = JSON.parse(execFileSync('python3', ['-c', `
import zipfile, hashlib, json, sys
z = zipfile.ZipFile(sys.argv[1])
assert z.testzip() is None
print(json.dumps([[i.filename, hashlib.sha256(z.read(i)).hexdigest(), list(i.date_time)] for i in z.infolist()]))
`, via], { encoding: 'utf8' }));
    const sha = (x) => createHash('sha256').update(typeof x === 'string' ? enc.encode(x) : x).digest('hex');
    assert.deepEqual(letti.map((x) => x[0]), FILE.map((f) => f.nome), 'stessi nomi, accenti compresi');
    assert.deepEqual(letti.map((x) => x[1]), FILE.map((f) => sha(f.dati)), 'stessi byte');
    assert.deepEqual(letti[0][2], [2026, 9, 27, 14, 30, 42]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
