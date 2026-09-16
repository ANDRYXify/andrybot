// L'IMMAGINE DI CHI DONA: entra solo se e' un'immagine, prende un nome nostro
// nella cartella degli effetti del canale, si toglie solo se il nome e' nostro,
// e per l'overlay diventa un effetto con le misure scelte dallo streamer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const { dir: dataDir } = cartellaUsaEGetta('dona-media-');
const media = await import('../../src/features/donazioni-media.js');

// un «comprimi» finto: sposta il temporaneo con l'estensione decisa dal tipo
const comprimiFinto = async (tempPath, mime, destDir, id) => {
  const video = /gif/.test(mime);
  const file = `${id}.${video ? 'webm' : 'webp'}`;
  writeFileSync(join(destDir, file), 'x');
  try { (await import('node:fs')).unlinkSync(tempPath); } catch { /* gia' via */ }
  return { tipo: video ? 'video' : 'immagine', file, durata: video ? 4200 : 5000 };
};

test('solo immagini: un PDF non entra, un PNG si', async () => {
  assert.equal(media.mimeOk('application/pdf'), false);
  assert.equal(media.mimeOk('image/png'), true);
  assert.equal(media.mimeOk('IMAGE/JPEG'), true);
  await assert.rejects(() => media.salva('andry', '/nessuno', 'application/pdf', { comprimi: comprimiFinto }), /immagine/);
});

test('il file prende un nome nostro nella cartella degli effetti del canale', async () => {
  mkdirSync(join(dataDir, 'tmp'), { recursive: true });
  const temp = join(dataDir, 'tmp', 'up_1');
  writeFileSync(temp, 'png');
  const e = await media.salva('Andry', temp, 'image/png', { comprimi: comprimiFinto, ora: 1700000000000 });
  assert.match(e.file, /^dn_1700000000000_[0-9a-f]{8}\.webp$/);
  assert.equal(e.tipo, 'immagine');
  assert.ok(existsSync(join(media.cartella('andry'), e.file)), 'sta nella cartella del canale, in minuscolo');
  assert.equal(existsSync(temp), false, 'il temporaneo non resta');
});

test('una GIF diventa un video, con la sua durata', async () => {
  const temp = join(dataDir, 'tmp', 'up_2');
  writeFileSync(temp, 'gif');
  const e = await media.salva('andry', temp, 'image/gif', { comprimi: comprimiFinto });
  assert.equal(e.tipo, 'video');
  assert.equal(e.durata, 4200);
});

test('si toglie solo un file col nostro nome: gli effetti dello streamer non si toccano', async () => {
  const dir = media.cartella('andry');
  writeFileSync(join(dir, '1_boom.webp'), 'effetto');
  writeFileSync(join(dir, 'dn_9_abcd1234.webp'), 'dono');
  assert.equal(await media.togli('andry', '1_boom.webp'), false);
  assert.equal(await media.togli('andry', '../dn_9_abcd1234.webp'), false);
  assert.ok(existsSync(join(dir, '1_boom.webp')));
  assert.equal(await media.togli('andry', 'dn_9_abcd1234.webp'), true);
  assert.equal(existsSync(join(dir, 'dn_9_abcd1234.webp')), false);
  assert.equal(await media.togli('andry', 'dn_9_abcd1234.webp'), false, 'la seconda volta non c\'e\' piu\'');
});

test('togliTutti conta solo quelli tolti davvero', async () => {
  const dir = media.cartella('andry');
  writeFileSync(join(dir, 'dn_1_a.webp'), '1');
  writeFileSync(join(dir, 'dn_2_b.webm'), '2');
  const n = await media.togliTutti([{ login: 'andry', media: 'dn_1_a.webp' }, { login: 'andry', media: 'dn_2_b.webm' }, { login: 'andry', media: 'dn_3_c.webp' }, { login: 'andry', media: '' }]);
  assert.equal(n, 2);
});

test('per l\'overlay: l\'immagine dura quanto vuole lo streamer, il video quanto e\' lungo', () => {
  const url = (login, file) => `https://x/overlay/${login}/media/${file}?key=k`;
  const img = media.payload(url, 'andry', { media: 'dn_1_a.webp', media_tipo: 'immagine', media_durata: 5000 }, { durata: 8 });
  assert.deepEqual(img, { comando: '', tipo: 'immagine', url: 'https://x/overlay/andry/media/dn_1_a.webp?key=k', volume: 0, durata: 8000, posizione: null });
  const vid = media.payload(url, 'andry', { media: 'dn_2_b.webm', media_tipo: 'video', media_durata: 4200 }, { durata: 8 });
  assert.equal(vid.tipo, 'video'); assert.equal(vid.volume, 0, 'una GIF diventata video e\' muta'); assert.equal(vid.durata, 4200);
  const fuori = media.payload(url, 'andry', { media: 'dn_1_a.webp', media_tipo: 'immagine' }, { durata: 99 });
  assert.equal(fuori.durata, 15000, 'la durata ha un tetto');
});
