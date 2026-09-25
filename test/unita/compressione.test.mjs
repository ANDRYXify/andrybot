// LA COMPRESSIONE DEI CARICAMENTI legge il file prima di toccarlo
// (docs/EFFETTI-SCHERMO.md, «I file: quello che è»).
//
// Le intestazioni qui sotto sono quelle vere che ffmpeg stampa per un cerchio
// opaco su un fondo trasparente, salvato come WebM VP9 e come MOV ProRes 4444.
// L'ultima prova fa girare ffmpeg davvero, dove c'e': la trasparenza di un
// WebM deve arrivare al file che va in onda.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { crc32 } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { leggiSonda, decodificatore, webpAnimato, eAvif, tipoDaSonda, comprimi, verificaAlfa, normChiave, filtroChiave, LATO_LIBRERIA } from '../../src/features/compress.js';

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

// LO SFONDO DA TOGLIERE (docs/EFFETTI-SCHERMO.md). Quello che il pannello
// mostra e quello che il server fa sono lo stesso calcolo: la formula del
// pannello (chiaveColore) contro il filtro colorkey di ffmpeg, pixel per
// pixel, su colori a caso vicini e lontani dal colore tolto.
const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
const chiaveColore = (() => {
  const i = APP.indexOf('function chiaveColore(');
  let d = 0, j = APP.indexOf('{', i);
  for (; j < APP.length; j++) { if (APP[j] === '{') d++; else if (APP[j] === '}' && !--d) break; }
  return new Function(APP.slice(i, j + 1) + '; return chiaveColore;')();
})();

test('lo sfondo da togliere: i numeri si fermano nei loro limiti, e un colore storto non toglie niente', () => {
  assert.deepEqual(normChiave({ colore: '#00FF00', simile: 0.3, morbido: 0.1 }), { colore: '#00ff00', simile: 0.3, morbido: 0.1 });
  assert.deepEqual(normChiave({ colore: '#123456', simile: 9, morbido: -1 }), { colore: '#123456', simile: 0.6, morbido: 0 });
  assert.equal(normChiave({ colore: 'verde' }), null);
  assert.equal(normChiave(null), null);
  assert.equal(filtroChiave({ colore: '#00b140', simile: 0.25, morbido: 0.08 }, false), 'format=rgba,colorkey=0x00b140:0.25:0.08');
  assert.match(filtroChiave({ colore: '#00b140', simile: 0.25, morbido: 0.08 }, true), /blend=all_mode=darken\[a\];\[o2\]\[a\]alphamerge$/, 'su un file gia\' trasparente, la minore delle due trasparenze');
});

test('la formula del pannello: dentro la sensibilita\' trasparente, fuori pieno, in mezzo sfuma, e non ridà opacita\' a chi non ce l\'ha', () => {
  const px = (r, g, b, a = 255) => chiaveColore(new Uint8ClampedArray([r, g, b, a]), [0, 255, 0], 0.2, 0.1)[3];
  assert.equal(px(0, 255, 0), 0, 'il colore stesso sparisce');
  assert.equal(px(255, 0, 0), 255, 'un colore lontano resta');
  const mezzo = px(0, 255 - 110, 0);
  assert.ok(mezzo > 0 && mezzo < 255, `in mezzo sfuma (${mezzo})`);
  assert.equal(px(255, 0, 0, 40), 40, 'la trasparenza che c\'era resta');
});

test('il colore scelto nel pannello arriva a ffmpeg: il modulo lo manda, il server lo normalizza e lo passa alla compressione', () => {
  const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  assert.match(APP, /const chiave = _primaChiave\(\);\n\s*if \(chiave\) fd\.append\('chiave', JSON\.stringify\(chiave\)\);/);
  const i = SRV.indexOf('  async function salvaEffetto(');
  assert.ok(i > 0);
  const corpo = SRV.slice(i, SRV.indexOf('\n  }\n', i));
  assert.match(corpo, /chiave = normChiave\(JSON\.parse\(String\(req\.body\?\.chiave \|\| 'null'\)\)\)/);
  assert.match(corpo, /await comprimi\(fileMedia\.path, [^;]*\{ latoImmagine: LATO_LIBRERIA, chiave \}\)/);
});

test('con ffmpeg vero: la formula del pannello e colorkey danno lo stesso risultato, pixel per pixel', { skip: !ffmpeg && 'ffmpeg non c\'e\' su questa macchina' }, () => {
  let seme = 7;
  const caso = () => (seme = (seme * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const N = 64 * 64, src = Buffer.alloc(N * 3);
  for (let i = 0; i < N; i++) {
    const vicino = i % 2;
    src[i * 3] = Math.floor(caso() * (vicino ? 120 : 256)); src[i * 3 + 1] = Math.floor(vicino ? 140 + caso() * 116 : caso() * 256); src[i * 3 + 2] = Math.floor(caso() * (vicino ? 120 : 256));
  }
  for (const k of [{ colore: '#00ff00', simile: 0.3, morbido: 0.1 }, { colore: '#22cc44', simile: 0.15, morbido: 0 }, { colore: '#00b140', simile: 0.4, morbido: 0.25 }]) {
    const ff = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '64x64', '-i', 'pipe:0', '-vf', filtroChiave(k, false), '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], { input: src, maxBuffer: 1e7 });
    const d = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) { d[i * 4] = src[i * 3]; d[i * 4 + 1] = src[i * 3 + 1]; d[i * 4 + 2] = src[i * 3 + 2]; d[i * 4 + 3] = 255; }
    chiaveColore(d, [1, 3, 5].map((o) => parseInt(k.colore.slice(o, o + 2), 16)), k.simile, k.morbido);
    let peggio = 0;
    for (let i = 0; i < N; i++) peggio = Math.max(peggio, Math.abs(d[i * 4 + 3] - ff[i * 4 + 3]));
    assert.ok(peggio <= 1, `${k.colore} ${k.simile}/${k.morbido}: scarto ${peggio}`);
  }
});

test('con ffmpeg vero: un video col fondo verde esce trasparente, e uno gia\' trasparente non perde niente', { skip: !ffmpeg && 'ffmpeg non c\'e\' su questa macchina' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-chiave-'));
  try {
    const verde = "color=c=0x00b140:s=320x240:d=1:r=10,format=rgba,geq=r='if(lt(hypot(X-160,Y-120),60),230,0)':g='if(lt(hypot(X-160,Y-120),60),30,177)':b='if(lt(hypot(X-160,Y-120),60),40,64)':a='255'";
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', verde, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', join(dir, 'verde.webm')]);
    const k = { colore: '#00b140', simile: 0.25, morbido: 0.08 };
    const r = await comprimi(join(dir, 'verde.webm'), 'video/webm', dir, 'tolto', { latoImmagine: LATO_LIBRERIA, chiave: k });
    assert.match(sondaDi(join(dir, r.file)), /alpha_mode\s*:\s*1/);
    const alfa = (f) => { const px = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-c:v', 'libvpx-vp9', '-i', f, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1e7 }); return (x, y) => px[(y * 320 + x) * 4 + 3]; };
    const a = alfa(join(dir, r.file));
    assert.equal(a(5, 5), 0, 'il verde e\' andato');
    assert.equal(a(160, 120), 255, 'il soggetto resta');
    const cerchio = "color=c=black@0.0:s=320x240:d=1:r=10,format=rgba,geq=r='if(lt(X,160),0,255)':g='if(lt(X,160),177,0)':b='0':a='if(lt(Y,60),0,255)'";
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', cerchio, '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', join(dir, 'gia.mov')]);
    const r2 = await comprimi(join(dir, 'gia.mov'), 'video/quicktime', dir, 'gia', { latoImmagine: LATO_LIBRERIA, chiave: { colore: '#00b100', simile: 0.2, morbido: 0.05 } });
    const b = alfa(join(dir, r2.file));
    assert.equal(b(300, 20), 0, 'la parte trasparente del file resta trasparente, anche dove non e\' verde');
    assert.equal(b(20, 200), 0, 'il verde opaco se ne va');
    assert.equal(b(300, 200), 255, 'il resto resta pieno');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('con ffmpeg vero: un\'immagine col fondo di un colore solo esce trasparente', { skip: !ffmpeg && 'ffmpeg non c\'e\' su questa macchina' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-chiave-img-'));
  try {
    const logo = "color=c=white:s=200x100,format=rgb24,geq=r='if(lt(hypot(X-100,Y-50),30),20,255)':g='if(lt(hypot(X-100,Y-50),30),20,255)':b='if(lt(hypot(X-100,Y-50),30),160,255)'";
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', logo, '-frames:v', '1', join(dir, 'logo.png')]);
    const r = await comprimi(join(dir, 'logo.png'), 'image/png', dir, 'logo', { latoImmagine: LATO_LIBRERIA, chiave: { colore: '#ffffff', simile: 0.1, morbido: 0.05 } });
    assert.match(r.file, /\.webp$/);
    const px = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', join(dir, r.file), '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1e7 });
    assert.equal(px[(5 * 200 + 5) * 4 + 3], 0, 'il fondo bianco e\' andato');
    assert.equal(px[(50 * 200 + 100) * 4 + 3], 255, 'il logo resta');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// Con uno sfondo da togliere niente si tiene com'e'. Un WebP animato lo legge
// ffmpeg 9 fotogramma per fotogramma (decodificatore webp_anim) e diventa un
// video trasparente che si muove ancora, con la trasparenza del file. Un AVIF
// no: ffmpeg ne legge l'alfa come un flusso a parte e non la applica, allora
// il caricamento lo dice invece di rovinarlo; senza fondo da togliere passa.
const conWebpAnimato = ffmpeg && (() => { try { return /webp_anim/.test(execFileSync('ffmpeg', ['-hide_banner', '-decoders'], { encoding: 'utf8' })); } catch { return false; } })();
test('con ffmpeg vero: un WebP animato col fondo da togliere diventa un video che si muove, e un AVIF lo dice', { skip: !conWebpAnimato && 'qui manca ffmpeg col decodificatore dei WebP animati (quello del Dockerfile ce l\'ha)' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-chiave-anim-'));
  try {
    const giro = "color=c=0x00b140:s=160x120:d=1:r=10,format=rgba,geq=r='if(lt(hypot(X-80-20*sin(T*6),Y-60),30),230,0)':g='if(lt(hypot(X-80-20*sin(T*6),Y-60),30),30,177)':b='if(lt(hypot(X-80-20*sin(T*6),Y-60),30),40,64)':a='if(lt(Y,10),0,255)'";
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', giro, '-c:v', 'libwebp_anim', '-loop', '0', join(dir, 'giro.webp')]);
    const r = await comprimi(join(dir, 'giro.webp'), 'image/webp', dir, 'giro', { latoImmagine: LATO_LIBRERIA, chiave: { colore: '#00b140', simile: 0.2, morbido: 0.05 } });
    assert.equal(r.tipo, 'video');
    assert.match(r.file, /\.webm$/);
    assert.match(sondaDi(join(dir, r.file)), /alpha_mode\s*:\s*1/);
    const fotogramma = (n) => { const px = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-c:v', 'libvpx-vp9', '-i', join(dir, r.file), '-vf', `select=eq(n\\,${n})`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1e7 }); return (x, y) => px[(y * 160 + x) * 4 + 3]; };
    const primo = fotogramma(0), dopo = fotogramma(3);
    assert.equal(primo(5, 5), 0, 'la fascia trasparente del file resta trasparente');
    assert.equal(primo(130, 60), 0, 'il verde e\' andato');
    assert.equal(primo(55, 60), 255, 'il soggetto resta');
    assert.equal(dopo(55, 60), 0, 'e si muove: tre fotogrammi dopo li\' c\'e\' il fondo, tolto');
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x00b140:s=64x64', '-frames:v', '1', '-c:v', 'libaom-av1', '-still-picture', '1', join(dir, 'fermo.avif')]);
    copyFileSync(join(dir, 'fermo.avif'), join(dir, 'fermo2.avif'));
    await assert.rejects(comprimi(join(dir, 'fermo.avif'), 'image/avif', dir, 'f1', { latoImmagine: LATO_LIBRERIA, chiave: { colore: '#00b140' } }), /da un AVIF lo sfondo non si toglie/);
    const tenuto = await comprimi(join(dir, 'fermo2.avif'), 'image/avif', dir, 'f2', { latoImmagine: LATO_LIBRERIA });
    assert.equal(tenuto.file, 'f2.avif');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// Il ritmo di un'immagine animata (docs/EFFETTI-SCHERMO.md): in onda ogni
// fotogramma dura quanto nel browser, che tiene 100 ms quelli da 10 ms o meno,
// e l'anteprima del pannello usa la stessa regola (presa da app.js cosi'
// com'e'). Il WebP animato passa col fondo da togliere: senza, si tiene com'e'
// e lo anima il browser da solo, con la sua regola.
const attesaFotogramma = (() => { const m = /const _attesaFotogramma = (\([^;]*\));/.exec(APP); return new Function('return ' + m[1])(); })();
test('con ffmpeg vero: un\'immagine animata va in onda col ritmo del browser, e l\'anteprima tiene lo stesso', { skip: !conWebpAnimato && 'qui manca ffmpeg col decodificatore dei WebP animati (quello del Dockerfile ce l\'ha)' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-ritmo-'));
  try {
    const giro = (r) => `color=c=black:s=16x16:r=${r}:d=0.2,format=rgb24,geq=r='if(mod(N,2),20,230)':g='40':b='if(mod(N,2),230,20)'`;
    const fai = (nome, r, arg) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', giro(r), ...arg, join(dir, nome)]);
    fai('g10.gif', 100, ['-f', 'gif']); fai('g20.gif', 50, ['-f', 'gif']);
    fai('w5.webp', 200, ['-c:v', 'libwebp_anim']); fai('w20.webp', 50, ['-c:v', 'libwebp_anim']);
    fai('a50.png', 20, ['-f', 'apng']);
    const zero = Buffer.from(readFileSync(join(dir, 'a50.png')));
    for (let i = 8; i < zero.length;) {
      const n = zero.readUInt32BE(i);
      if (zero.toString('latin1', i + 4, i + 8) === 'fcTL') { zero.writeUInt16BE(0, i + 28); zero.writeUInt32BE(crc32(zero.subarray(i + 4, i + 8 + n)), i + 8 + n); }
      i += 12 + n;
    }
    writeFileSync(join(dir, 'a0.png'), zero);
    const niente = { colore: '#000000', simile: 0.01, morbido: 0 };
    for (const [f, t, scritto] of [['g10.gif', 'image/gif', 10], ['g20.gif', 'image/gif', 20], ['w5.webp', 'image/webp', 5], ['w20.webp', 'image/webp', 20], ['a0.png', 'image/png', 0], ['a50.png', 'image/png', 50]]) {
      const r = await comprimi(join(dir, f), t, dir, 'r_' + f.replace('.', '_'), { latoImmagine: LATO_LIBRERIA, chiave: t === 'image/webp' ? niente : null });
      assert.equal(r.tipo, 'video', f);
      const info = spawnSync('ffmpeg', ['-hide_banner', '-i', join(dir, r.file), '-vf', 'showinfo', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
      const pts = [...String(info).matchAll(/pts_time:([0-9.]+)/g)].map((m) => Number(m[1]) * 1000);
      assert.ok(pts.length >= 2, `${f}: fotogrammi ${pts.length}`);
      assert.ok(Math.abs(pts[1] - pts[0] - attesaFotogramma(scritto)) < 1.5, `${f}: scritto ${scritto} ms, in onda ${pts[1] - pts[0]} ms, nel pannello ${attesaFotogramma(scritto)} ms`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

