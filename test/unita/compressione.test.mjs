// LA COMPRESSIONE DEI CARICAMENTI legge il file prima di toccarlo
// (docs/EFFETTI-SCHERMO.md, «I file: quello che è»).
//
// Le intestazioni qui sotto sono quelle vere che ffmpeg stampa per un cerchio
// opaco su un fondo trasparente, salvato come WebM VP9 e come MOV ProRes 4444.
// L'ultima prova fa girare ffmpeg davvero, dove c'e': la trasparenza di un
// WebM deve arrivare al file che va in onda.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { leggiSonda, decodificatore, webpAnimato, comprimi, LATO_LIBRERIA } from '../../src/features/compress.js';

const WEBM_ALFA = `Input #0, matroska,webm, from 'x.webm':
  Metadata:
    ENCODER         : Lavf61.1.100
  Duration: 00:00:02.00, start: 0.000000, bitrate: 17 kb/s
  Stream #0:0: Video: vp9 (Profile 0), yuv420p(tv, progressive), 320x240, SAR 1:1 DAR 4:3, 25 fps, 25 tbr, 1k tbn
      Metadata:
        alpha_mode      : 1
        ENCODER         : Lavc61.3.100 libvpx-vp9
        DURATION        : 00:00:02.000000000
At least one output file must be specified`;

const MOV_PRORES = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'x.mov':
  Duration: 00:00:02.00, start: 0.000000, bitrate: 651 kb/s
  Stream #0:0[0x1]: Video: prores (4444) (ap4h / 0x68347061), yuva444p12le(progressive), 320x240, 648 kb/s, SAR 1:1 DAR 4:3, 25 fps, 25 tbr, 12800 tbn (default)
      Metadata:
        handler_name    : VideoHandler
At least one output file must be specified`;

const NON_PNG = `[png @ 0x3dbfba40] Invalid PNG signature 0x6E6F6E20736F6E6F.
[image2 @ 0x3dbf9f00] Could not find codec parameters for stream 0 (Video: png, none): unspecified size
Input #0, image2, from 'rotto.png':
  Duration: 00:00:00.04, start: 0.000000, bitrate: 3 kb/s
  Stream #0:0: Video: png, none, 25 fps, 25 tbr, 25 tbn
At least one output file must be specified`;

test('la sonda legge il codec del video e l\'alfa dichiarato nei metadati del suo flusso', () => {
  assert.deepEqual(leggiSonda(WEBM_ALFA), { codec: 'vp9', alfa: true });
  assert.deepEqual(leggiSonda(MOV_PRORES), { codec: 'prores', alfa: false }, 'il ProRes porta l\'alfa nei pixel, e ffmpeg lo legge da se\'');
  assert.deepEqual(leggiSonda(WEBM_ALFA.replace('alpha_mode      : 1', 'alpha_mode      : 0')), { codec: 'vp9', alfa: false });
  const conAudio = WEBM_ALFA.replace('  Stream #0:0: Video', '  Stream #0:0: Audio: opus, 48000 Hz, stereo, fltp\n      Metadata:\n        alpha_mode      : 1\n  Stream #0:1: Video').replace('\n      Metadata:\n        alpha_mode      : 1\n        ENCODER', '\n      Metadata:\n        ENCODER');
  assert.deepEqual(leggiSonda(conAudio), { codec: 'vp9', alfa: false }, 'conta solo quello che sta sotto il flusso video');
});

test('un file che ffmpeg non sa leggere non ha codec, anche se l\'estensione ne suggerisce uno', () => {
  assert.deepEqual(leggiSonda(NON_PNG), { codec: '', alfa: false });
  assert.deepEqual(leggiSonda(''), { codec: '', alfa: false });
});

test('libvpx solo dove serve: VP8 e VP9 che dichiarano l\'alfa', () => {
  assert.deepEqual(decodificatore({ codec: 'vp9', alfa: true }), ['-c:v', 'libvpx-vp9']);
  assert.deepEqual(decodificatore({ codec: 'vp8', alfa: true }), ['-c:v', 'libvpx']);
  assert.deepEqual(decodificatore({ codec: 'vp9', alfa: false }), []);
  assert.deepEqual(decodificatore({ codec: 'prores', alfa: true }), []);
  assert.deepEqual(decodificatore({}), []);
});

test('il WebP animato si riconosce dal bit dell\'animazione nel blocco VP8X', () => {
  const testa = (blocco, flag) => Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP' + blocco), Buffer.alloc(4), Buffer.from([flag, 0, 0, 0])]);
  assert.equal(webpAnimato(testa('VP8X', 0x02)), true);
  assert.equal(webpAnimato(testa('VP8X', 0x12)), true, 'animato e con l\'alfa');
  assert.equal(webpAnimato(testa('VP8X', 0x10)), false, 'solo l\'alfa: e\' un\'immagine ferma');
  assert.equal(webpAnimato(testa('VP8 ', 0x02)), false, 'il WebP semplice non ha animazione');
  assert.equal(webpAnimato(Buffer.from('GIF89a')), false);
  assert.equal(webpAnimato(null), false);
});

test('le immagini della libreria tengono il lato per il tutto schermo', () => {
  assert.equal(LATO_LIBRERIA, 1920);
});

const ffmpeg = (() => { try { execFileSync('ffmpeg', ['-hide_banner', '-version'], { stdio: 'ignore' }); return true; } catch { return false; } })();

test('con ffmpeg vero: un WebM trasparente resta trasparente', { skip: !ffmpeg && 'ffmpeg non c\'e\' su questa macchina' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-alfa-'));
  try {
    const cerchio = "color=c=black@0.0:s=320x240:d=1,format=rgba,geq=r='255':g='0':b='0':a='if(lt(hypot(X-160,Y-120),60),255,0)'";
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', cerchio, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', join(dir, 'src.webm')]);
    copyFileSync(join(dir, 'src.webm'), join(dir, 'su.webm'));
    const r = await comprimi(join(dir, 'su.webm'), 'video/webm', dir, 'out', { latoImmagine: LATO_LIBRERIA });
    const px = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-c:v', 'libvpx-vp9', '-i', join(dir, r.file), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1e7 });
    const alfa = (x, y) => px[(y * 320 + x) * 4 + 3];
    assert.equal(alfa(5, 5), 0, 'l\'angolo e\' trasparente');
    assert.equal(alfa(160, 120), 255, 'il cerchio e\' pieno');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
