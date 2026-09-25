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
import { mkdtempSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { leggiSonda, decodificatore, webpAnimato, eAvif, tipoDaSonda, comprimi, verificaAlfa, LATO_LIBRERIA } from '../../src/features/compress.js';

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

const scelti = (o) => ({ codec: o.codec, alfa: o.alfa, formato: o.formato });

test('la sonda legge il codec del video e la trasparenza che dichiara: nei metadati del WebM o nei pixel', () => {
  assert.deepEqual(scelti(leggiSonda(WEBM_ALFA)), { codec: 'vp9', alfa: true, formato: 'yuv420p' }, 'nel WebM i pixel sembrano opachi: l\'alfa sta nell\'alpha_mode');
  assert.deepEqual(scelti(leggiSonda(MOV_PRORES)), { codec: 'prores', alfa: true, formato: 'yuva444p12le' }, 'il ProRes 4444 porta l\'alfa nei pixel');
  assert.deepEqual(scelti(leggiSonda(WEBM_ALFA.replace('alpha_mode      : 1', 'alpha_mode      : 0'))), { codec: 'vp9', alfa: false, formato: 'yuv420p' });
  for (const [px, alfa] of [['bgra', true], ['argb', true], ['rgba', true], ['gbrap', true], ['yuva420p', true], ['pal8', false], ['yuv420p', false], ['rgb24', false], ['yuv444p10le', false]]) {
    assert.equal(leggiSonda(MOV_PRORES.replace('yuva444p12le', px)).alfa, alfa, px);
  }
  const conAudio = WEBM_ALFA.replace('  Stream #0:0: Video', '  Stream #0:0: Audio: opus, 48000 Hz, stereo, fltp\n      Metadata:\n        alpha_mode      : 1\n  Stream #0:1: Video').replace('\n      Metadata:\n        alpha_mode      : 1\n        ENCODER', '\n      Metadata:\n        ENCODER');
  assert.deepEqual(scelti(leggiSonda(conAudio)), { codec: 'vp9', alfa: false, formato: 'yuv420p' }, 'conta solo quello che sta sotto il flusso video');
  assert.equal(leggiSonda(conAudio).audio, true);
});

test('un file che ffmpeg non sa leggere non ha codec, anche se l\'estensione ne suggerisce uno', () => {
  assert.deepEqual(scelti(leggiSonda(NON_PNG)), { codec: '', alfa: false, formato: '' });
  assert.deepEqual(scelti(leggiSonda('')), { codec: '', alfa: false, formato: '' });
});

test('un file senza un tipo che conosciamo si riconosce da quello che c\'e\' dentro', () => {
  assert.equal(tipoDaSonda(leggiSonda(WEBM_ALFA)), 'video', 'si muove: e\' un video');
  const png = 'Input #0, png_pipe, from \'x.bin\':\n  Duration: N/A, bitrate: N/A\n  Stream #0:0: Video: png, rgba(pc, gbr/unknown/unknown), 320x240, 25 fps, 25 tbr, 25 tbn';
  assert.equal(tipoDaSonda(leggiSonda(png)), 'immagine', 'un fotogramma solo: e\' un\'immagine');
  const suono = 'Input #0, wav, from \'x.bin\':\n  Duration: 00:00:01.00, bitrate: 705 kb/s\n  Stream #0:0: Audio: pcm_s16le ([1][0][0][0] / 0x0001), 44100 Hz, 1 channels, s16, 705 kb/s';
  assert.equal(tipoDaSonda(leggiSonda(suono)), 'audio');
  assert.equal(tipoDaSonda(leggiSonda(NON_PNG)), '', 'quello che non si legge non ha un tipo');
});

test('l\'AVIF si riconosce dal marchio del contenitore, e si tiene com\'e\'', () => {
  const ftyp = (m) => Buffer.concat([Buffer.from([0, 0, 0, 28]), Buffer.from('ftyp' + m), Buffer.alloc(16)]);
  assert.equal(eAvif(ftyp('avif')), true);
  assert.equal(eAvif(ftyp('avis')), true, 'anche l\'AVIF animato');
  assert.equal(eAvif(ftyp('heic')), false);
  assert.equal(eAvif(ftyp('isom')), false, 'un MP4 no');
  assert.equal(eAvif(null), false);
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

// Con ffmpeg vero: ogni formato trasparente esce trasparente, col segno
// AlphaMode del WebM che il browser legge (non basta che l'alfa ci sia dentro:
// senza il segno, Chrome e OBS lo mostrano nero), e un video opaco resta
// opaco. I campioni li fa ffmpeg: un cerchio pieno su un fondo trasparente.
const CAMPIONI = [
  ['vp9.webm', 'video/webm', ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0']],
  ['vp8.webm', 'video/webm', ['-c:v', 'libvpx', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0']],
  ['prores.mov', 'video/quicktime', ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le']],
  ['qtrle.mov', 'video/quicktime', ['-c:v', 'qtrle', '-pix_fmt', 'argb']],
  ['png.mov', 'video/quicktime', ['-c:v', 'png', '-pix_fmt', 'rgba']],
  ['ffv1.mkv', 'application/octet-stream', ['-c:v', 'ffv1', '-pix_fmt', 'yuva420p']],
  ['anim.gif', 'image/gif', ['-vf', 'split[a][b];[a]palettegen=reserve_transparent=1[p];[b][p]paletteuse=alpha_threshold=128']],
  ['anim.apng', 'image/png', ['-f', 'apng', '-plays', '0']],
];
const sondaDi = (f) => { try { execFileSync('ffmpeg', ['-hide_banner', '-i', f], { stdio: ['ignore', 'ignore', 'pipe'] }); return ''; } catch (e) { return String(e.stderr || ''); } };

test('con ffmpeg vero: ogni formato trasparente esce trasparente, e l\'opaco resta opaco', { skip: !ffmpeg && 'ffmpeg non c\'e\' su questa macchina' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-alfa-'));
  try {
    const cerchio = "color=c=black@0.0:s=320x240:d=1:r=10,format=rgba,geq=r='255':g='0':b='0':a='if(lt(hypot(X-160,Y-120),60),255,0)'";
    for (const [nome, mime, args] of CAMPIONI) {
      execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', cerchio, ...args, join(dir, nome)]);
      copyFileSync(join(dir, nome), join(dir, 'su-' + nome));
      const r = await comprimi(join(dir, 'su-' + nome), mime, dir, 'out-' + nome.replace('.', '-'), { latoImmagine: LATO_LIBRERIA });
      assert.equal(r.tipo, 'video', nome);
      assert.match(sondaDi(join(dir, r.file)), /alpha_mode\s*:\s*1/, `${nome}: il WebM dice di essere trasparente`);
      const px = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-c:v', 'libvpx-vp9', '-i', join(dir, r.file), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1e7 });
      const alfa = (x, y) => px[(y * 320 + x) * 4 + 3];
      assert.equal(alfa(5, 5), 0, `${nome}: l'angolo e' trasparente`);
      assert.equal(alfa(160, 120), 255, `${nome}: il cerchio e' pieno`);
    }
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=320x240:d=1:r=10', '-c:v', 'mpeg4', join(dir, 'opaco.mp4')]);
    const o = await comprimi(join(dir, 'opaco.mp4'), 'video/mp4', dir, 'out-opaco', { latoImmagine: LATO_LIBRERIA });
    assert.doesNotMatch(sondaDi(join(dir, o.file)), /alpha_mode/, 'un video opaco non diventa trasparente');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('con ffmpeg vero: se la trasparenza si perdesse, il caricamento si ferma e lo dice', { skip: !ffmpeg && 'ffmpeg non c\'e\' su questa macchina' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-alfa-'));
  try {
    const out = join(dir, 'opaco.webm');
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=160x120:d=0.5:r=10', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', out]);
    await verificaAlfa(out, { alfa: false });
    assert.ok(existsSync(out), 'un ingresso opaco non chiede niente');
    await assert.rejects(verificaAlfa(out, { alfa: true }), /la trasparenza di questo video si perderebbe/);
    assert.ok(!existsSync(out), 'e il file senza trasparenza non resta sul disco');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
