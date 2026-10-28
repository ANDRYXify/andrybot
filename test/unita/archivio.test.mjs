// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ARCHIVIO DEI MEDIA (src/features/archivio.js, docs/ARCHIVIO.md). Le garanzie,
// ognuna rotta apposta:
//  · lo stesso contenuto e' un file solo; il nome non dice lo sha256 nudo;
//  · sul disco non c'e' niente in chiaro;
//  · si rilegge tale e quale, anche a pezzi, coi pezzi che attraversano i blocchi;
//  · un blocco cambiato, spostato, o un file troncato non si apre;
//  · senza il segreto del server la chiave non si apre;
//  · i Range HTTP: 206, 416, coda («bytes=-N»), HEAD.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Writable } from 'node:stream';

const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const usaEGetta = cartellaUsaEGetta('andrybot-archivio-');
process.on('exit', () => usaEGetta.pulisci());
const { chiudiChiave, apriChiave, segno } = await import('../../src/segreti.js');
const { creaArchivio, servi, BLOCCO, eNomeArchivio, tipoDi } = await import('../../src/features/archivio.js');

const impronta = (sha) => segno('archivio', sha).toString('hex');
const cartella = join(usaEGetta.dir, 'archivio');
const a = creaArchivio({ cartella, chiudiChiave, apriChiave, impronta });
let k = 0;
const temp = (buf) => { const d = mkdtempSync(join(usaEGetta.dir, 't-')); const f = join(d, `f${++k}`); writeFileSync(f, buf); return f; };
const disco = (nome) => { const hex = nome.slice(2, 66); return join(cartella, hex.slice(0, 2), hex); };

test('lo stesso contenuto e\' un file solo, il nome non e\' lo sha256 nudo, e sul disco non c\'e\' niente in chiaro', async () => {
  const dati = Buffer.from('GIF89a'.repeat(5000) + 'ANDRYX-segreto');
  const f1 = temp(dati);
  const r1 = await a.metti(f1, 'gif');
  assert.ok(eNomeArchivio(r1.nome) && r1.nuovo && r1.byte === dati.length);
  assert.equal(existsSync(f1), false, 'il file di partenza se ne va');
  const sha = crypto.createHash('sha256').update(dati).digest('hex');
  assert.ok(!r1.nome.includes(sha), 'dal nome non si controlla se c\'e\' un file conosciuto');
  const r2 = await a.metti(temp(dati), 'gif');
  assert.deepEqual([r2.nome, r2.nuovo], [r1.nome, false], 'lo stesso contenuto: lo stesso file');
  const cifrato = readFileSync(disco(r1.nome));
  assert.equal(cifrato.indexOf(Buffer.from('ANDRYX-segreto')), -1, 'il contenuto non si legge');
  assert.equal(cifrato.indexOf(Buffer.from('GIF89a')), -1);
  assert.deepEqual(await a.leggi(r1.nome), dati, 'e si rilegge tale e quale');
  assert.equal(tipoDi(r1.nome), 'image/gif');
});

test('si legge a pezzi, anche a cavallo dei blocchi; e un file vuoto e\' un file', async () => {
  const dati = crypto.randomBytes(BLOCCO * 3 + 123);
  const { nome } = await a.metti(temp(dati), 'webm');
  const pezzo = async (i, f) => { const p = []; for await (const x of a.leggiDa(nome, i, f)) p.push(x); return Buffer.concat(p); };
  for (const [i, f] of [[0, 9], [BLOCCO - 5, BLOCCO + 5], [BLOCCO * 2 + 7, BLOCCO * 3 + 122], [BLOCCO * 3 + 100, 1e12], [17, 17]]) {
    assert.deepEqual(await pezzo(i, f), dati.subarray(i, Math.min(dati.length, f + 1)), `${i}-${f}`);
  }
  assert.equal(await a.byteDi(nome), dati.length);
  const vuoto = await a.metti(temp(Buffer.alloc(0)), 'opus');
  assert.deepEqual([await a.byteDi(vuoto.nome), (await a.leggi(vuoto.nome)).length], [0, 0]);
});

test('un blocco cambiato, un file troncato o una chiave d\'altri non si aprono', async () => {
  const dati = crypto.randomBytes(BLOCCO * 2 + 10);
  const { nome } = await a.metti(temp(dati), 'webp');
  const p = disco(nome), buono = readFileSync(p);
  const leggiTutto = () => a.leggi(nome);
  const cambiato = Buffer.from(buono); cambiato[82 + 100] ^= 1;
  writeFileSync(p, cambiato);
  await assert.rejects(leggiTutto, 'un byte cambiato');
  writeFileSync(p, buono.subarray(0, buono.length - (10 + 16)));
  await assert.rejects(leggiTutto, 'tolto l\'ultimo blocco');
  const blocco = BLOCCO + 16, scambiato = Buffer.concat([buono.subarray(0, 82), buono.subarray(82 + blocco, 82 + 2 * blocco), buono.subarray(82, 82 + blocco), buono.subarray(82 + 2 * blocco)]);
  writeFileSync(p, scambiato);
  await assert.rejects(leggiTutto, 'due blocchi scambiati');
  const altro = await a.metti(temp(crypto.randomBytes(500)), 'webp');
  const testaAltrui = Buffer.concat([readFileSync(disco(altro.nome)).subarray(0, 82), buono.subarray(82)]);
  writeFileSync(p, testaAltrui);
  assert.equal(await a.byteDi(nome), null, 'la chiave di un altro file non si apre su questo');
  writeFileSync(p, buono);
  assert.deepEqual(await leggiTutto(), dati, 'rimesso com\'era, si legge');
  const senzaSegreto = creaArchivio({ cartella, chiudiChiave: () => null, apriChiave: () => null, impronta });
  await assert.rejects(() => senzaSegreto.metti(temp(Buffer.from('x')), 'png'), /segreto/);
  assert.equal(await senzaSegreto.byteDi(nome), null);
});

test('servire con Range: 200, 206, la coda, 416, HEAD', async () => {
  const dati = crypto.randomBytes(BLOCCO + 50);
  const { nome } = await a.metti(temp(dati), 'mp4');
  const chiama = (range, method = 'GET') => new Promise((ok) => {
    const parti = [], head = {};
    const res = new Writable({ write(c, e, cb) { parti.push(c); cb(); } });
    res.setHeader = (k, v) => { head[k.toLowerCase()] = v; };
    res.on('finish', () => ok({ stato: res.statusCode, head, corpo: Buffer.concat(parti) }));
    const end = res.end.bind(res);
    res.end = (...x) => end(...x);
    servi(a, nome, { headers: range ? { range } : {}, method }, res);
  });
  const t = await chiama('');
  assert.deepEqual([t.stato, t.head['content-type'], Number(t.head['content-length'])], [200, 'video/mp4', dati.length]);
  assert.deepEqual(t.corpo, dati);
  const p = await chiama(`bytes=10-${BLOCCO + 9}`);
  assert.deepEqual([p.stato, p.head['content-range']], [206, `bytes 10-${BLOCCO + 9}/${dati.length}`]);
  assert.deepEqual(p.corpo, dati.subarray(10, BLOCCO + 10));
  const coda = await chiama('bytes=-20');
  assert.deepEqual(coda.corpo, dati.subarray(dati.length - 20));
  assert.equal((await chiama(`bytes=${dati.length + 5}-`)).stato, 416);
  const h = await chiama('', 'HEAD');
  assert.deepEqual([h.stato, h.corpo.length], [200, 0]);
});

test('il disco ha solo i file cifrati: nessun temporaneo lasciato a meta\'', () => {
  const tutti = readdirSync(cartella, { recursive: true }).map(String);
  assert.ok(!tutti.some((f) => f.includes('.tmp-')), tutti.join(','));
});

test('mai lo stesso nonce due volte: due blocchi uguali in chiaro non sono uguali cifrati', async () => {
  const { nome } = await a.metti(temp(Buffer.alloc(BLOCCO * 2)), 'webm');
  const c = readFileSync(disco(nome));
  const b0 = c.subarray(82, 82 + BLOCCO), b1 = c.subarray(82 + BLOCCO + 16, 82 + 2 * BLOCCO + 16);
  assert.ok(!b0.equals(b1), 'con un nonce ripetuto, lo XOR dei due blocchi direbbe lo XOR dei due chiari');
  const { nome: n2 } = await a.metti(temp(Buffer.concat([Buffer.alloc(BLOCCO * 2), Buffer.from('x')])), 'webm');
  assert.ok(!readFileSync(disco(n2)).subarray(82, 82 + BLOCCO).equals(b0), 'e due file diversi hanno chiavi e basi loro');
});
