// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA FIRMA SUGLI EFFETTI PRIVATI (src/features/firma-media.js, docs/ARCHIVIO.md,
// «La firma»), con ffmpeg vero. Le garanzie, ognuna rotta apposta:
//  · un'immagine e un video escono firmati, grandi come l'originale, e un
//    video trasparente resta trasparente;
//  · un audio esce col suo segno;
//  · quello che non si sa riscrivere esce come tessera firmata, mai in chiaro;
//  · la copia si fa una volta, anche con tante richieste insieme, e sta nella
//    cartella del canale (se ne va con l'account);
//  · la porta pubblica firma i privati; i condivisi e l'overlay escono puliti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Writable } from 'node:stream';

const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const usaEGetta = cartellaUsaEGetta('andrybot-firma-');
process.on('exit', () => usaEGetta.pulisci());
const { effects, archivioDb } = await import('../../src/db.js');
const { chiudiChiave, apriChiave, segno } = await import('../../src/segreti.js');
const { creaArchivio } = await import('../../src/features/archivio.js');
const { creaMediaEffetti } = await import('../../src/features/media-effetti.js');
const { creaFirma, svgFirma, testoFirma, misureWebp } = await import('../../src/features/firma-media.js');
const { ffmpeg, sondaFile } = await import('../../src/features/compress.js');
const { disegna } = await import('../../src/disegno.js');
process.on('exit', () => disegna.chiudi());

const C_E_FFMPEG = spawnSync('ffmpeg', ['-version']).status === 0;
const dir = join(usaEGetta.dir, 'prove');
mkdirSync(dir, { recursive: true });
const fai = (nome, args) => { const p = join(dir, nome); spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...args, p]); return p; };
let chiamate = 0;
const firma = creaFirma({ cartella: join(usaEGetta.dir, 'firmati'), disegna, ffmpeg: (a) => { chiamate++; return ffmpeg(a); }, sonda: sondaFile });
const TESTO = testoFirma('pincopallo02');
const sondaBuf = async (buf, est) => { const p = join(dir, `s-${Math.random().toString(36).slice(2)}.${est}`); writeFileSync(p, buf); return sondaFile(p); };
const pixel = (p) => spawnSync('ffmpeg', ['-loglevel', 'error', '-i', p, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1e8 }).stdout;

test('la firma copre tutto il quadro e dice di chi e\'', () => {
  const s = svgFirma(1280, 720, TESTO);
  assert.ok(s.startsWith('<svg') && s.includes('width="1280" height="720"'));
  assert.ok((s.match(/© pincopallo02 · socialbot\.live/g) || []).length > 30, 'ripetuta, non un angolo che si ritaglia');
  assert.ok(svgFirma(100, 100, '<b>&').includes('&lt;b&gt;&amp;'), 'il nome non rompe l\'SVG');
  assert.equal(testoFirma('a\u0000b'), '© ab · socialbot.live');
});

test('un\'immagine trasparente esce firmata, grande uguale, ancora trasparente', { skip: !C_E_FFMPEG }, async () => {
  const p = fai('img.webp', ['-f', 'lavfi', '-i', 'color=c=red@0.0:s=400x300,format=rgba,drawbox=x=100:y=80:w=200:h=140:color=red@1:t=fill', '-frames:v', '1', '-c:v', 'libwebp', '-lossless', '1']);
  const r = await firma.firma(readFileSync(p), 'webp', TESTO);
  assert.equal(r.est, 'webp');
  const s = await sondaBuf(r.buf, 'webp');
  assert.deepEqual([s.larghezza, s.altezza], [400, 300]);
  writeFileSync(join(dir, 'firmata.webp'), r.buf);
  const prima = pixel(p), dopo = pixel(join(dir, 'firmata.webp'));
  assert.equal(dopo.length, prima.length);
  let cambiati = 0;
  for (let i = 0; i < prima.length; i += 4) if (Math.abs(prima[i] - dopo[i]) + Math.abs(prima[i + 1] - dopo[i + 1]) > 30) cambiati++;
  assert.ok(cambiati > 400 * 300 * 0.03, `la firma si vede (${cambiati} pixel)`);
  assert.ok(dopo[3] < 255 || dopo[(10 * 400 + 395) * 4 + 3] < 255, 'il fondo trasparente resta trasparente');
});

test('un video trasparente esce firmato e trasparente; un audio col suo segno', { skip: !C_E_FFMPEG }, async () => {
  const v = fai('v.webm', ['-f', 'lavfi', '-i', 'color=c=blue@0.5:s=320x180:d=2,format=yuva420p', '-c:v', 'libvpx-vp9', '-b:v', '200k']);
  assert.equal((await sondaFile(v)).alfa, true, 'il video di prova e\' trasparente');
  const r = await firma.firma(readFileSync(v), 'webm', TESTO);
  const s = await sondaBuf(r.buf, 'webm');
  assert.deepEqual([r.est, s.larghezza, s.altezza, s.alfa], ['webm', 320, 180, true]);
  const a = fai('a.ogg', ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '7', '-c:a', 'libopus']);
  const ra = await firma.firma(readFileSync(a), 'ogg', TESTO);
  writeFileSync(join(dir, 'a-firmato.ogg'), ra.buf);
  const vol = spawnSync('ffmpeg', ['-i', join(dir, 'a-firmato.ogg'), '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const max = Number(/max_volume: (-?[\d.]+) dB/.exec(vol)?.[1]);
  assert.ok(max > -30, `il silenzio ora ha il segno (${max} dB)`);
});

test('quello che non si sa riscrivere esce come tessera firmata, grande come l\'originale', { skip: !C_E_FFMPEG }, async () => {
  const testa = Buffer.alloc(40);
  testa.write('RIFF', 0, 'latin1'); testa.write('WEBP', 8, 'latin1'); testa.write('VP8X', 12, 'latin1');
  testa[20] = 0x02; testa.writeUIntLE(499, 24, 3); testa.writeUIntLE(279, 27, 3);
  assert.deepEqual(misureWebp(testa), { larghezza: 500, altezza: 280 });
  const r = await firma.copia('pincopallo02', 'a_' + 'f'.repeat(64) + '.webp', 'webp', TESTO, async () => testa);
  assert.equal(r.est, 'png');
  const s = await sondaBuf(r.buf, 'png');
  assert.deepEqual([s.larghezza, s.altezza], [500, 280]);
});

test('la copia si fa una volta, anche con tante richieste insieme', { skip: !C_E_FFMPEG }, async () => {
  const p = fai('una.webp', ['-f', 'lavfi', '-i', 'color=c=green:s=200x200', '-frames:v', '1', '-c:v', 'libwebp']);
  const buf = readFileSync(p);
  let letture = 0;
  const leggi = async () => { letture++; return buf; };
  const prima = chiamate;
  const tutte = await Promise.all(Array.from({ length: 5 }, () => firma.copia('pincopallo02', 'a_' + 'e'.repeat(64) + '.webp', 'webp', TESTO, leggi)));
  assert.ok(tutte.every((x) => x.buf.equals(tutte[0].buf)));
  assert.deepEqual([letture, chiamate - prima], [1, 1], 'un\'unica firma');
  await firma.copia('pincopallo02', 'a_' + 'e'.repeat(64) + '.webp', 'webp', TESTO, leggi);
  assert.equal(letture, 1, 'e poi dalla cartella');
  await firma.copia('pincopallo02', 'a_' + 'e'.repeat(64) + '.webp', 'webp', testoFirma('altro'), leggi);
  assert.equal(letture, 2, 'un altro nome: un\'altra copia');
  const sue = readdirSync(join(usaEGetta.dir, 'firmati', 'pincopallo02'));
  assert.equal(sue.length, 3, 'le copie stanno nella cartella del canale: se ne vanno con l\'account');
  assert.equal(await firma.copia('../fuori', 'a_' + 'e'.repeat(64) + '.webp', 'webp', TESTO, leggi), null, 'un canale storto non apre cartelle');
  assert.equal(await firma.pulisci(30, Date.now() + 31 * 86400_000), 3, 'e le vecchie le toglie la pulizia');
});

test('la porta pubblica firma i privati; i condivisi e l\'overlay escono puliti', { skip: !C_E_FFMPEG }, async () => {
  const archivio = creaArchivio({ cartella: join(usaEGetta.dir, 'archivio'), chiudiChiave, apriChiave, impronta: (s) => segno('archivio', s).toString('hex') });
  const m = creaMediaEffetti({ archivio, effetti: effects, registro: archivioDb, cartellaDi: (l) => join(usaEGetta.dir, 'effects', l), temp: join(usaEGetta.dir, 'entrata'), firma });
  const orig = readFileSync(fai('porta.webp', ['-f', 'lavfi', '-i', 'color=c=yellow:s=300x200', '-frames:v', '1', '-c:v', 'libwebp']));
  writeFileSync(join(dir, 'porta-copia.webp'), orig);
  const nome = await m.entra(join(dir, 'porta-copia.webp'), 'porta.webp');
  effects.add('firma1', { comando: 'sole', tipo: 'immagine', file: nome, tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });
  const chiedi = (firmato) => new Promise((ok) => {
    const parti = [], head = {};
    const res = new Writable({ write(c, e, cb) { parti.push(c); cb(); } });
    res.statusCode = 200;
    res.setHeader = (k, v) => { head[k.toLowerCase()] = v; };
    res.status = (s) => { res.statusCode = s; return res; };
    res.on('finish', () => ok({ stato: res.statusCode, tipo: head['content-type'], corpo: Buffer.concat(parti) }));
    m.servi({ headers: {}, method: 'GET' }, res, 'firma1', nome, { firmato });
  });
  const pubblica = await chiedi(TESTO);
  assert.deepEqual([pubblica.stato, pubblica.tipo, pubblica.corpo.equals(orig)], [200, 'image/webp', false], 'privato, porta pubblica: firmato');
  assert.ok((await chiedi('')).corpo.equals(orig), 'l\'overlay: pulito');
  effects.setPubblico('firma1', effects.get('firma1', 'sole').id, { pubblico: true, nome: 'Sole', autore: 'firma1' });
  assert.ok((await chiedi(TESTO)).corpo.equals(orig), 'condiviso: e\' gia\' di tutti, niente firma');
  assert.equal((await new Promise((ok) => {
    const res = new Writable({ write(c, e, cb) { cb(); } }); res.statusCode = 200; res.setHeader = () => {}; res.status = (s) => { res.statusCode = s; return res; };
    res.on('finish', () => ok(res.statusCode)); m.servi({ headers: {}, method: 'GET' }, res, 'altro', nome, { firmato: TESTO });
  })), 404, 'e un altro canale non lo prende nemmeno firmato');
  assert.ok(existsSync(join(usaEGetta.dir, 'firmati')));
});
