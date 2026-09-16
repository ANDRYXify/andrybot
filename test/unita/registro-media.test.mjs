// L'IMMAGINE DI CHI DONA NEL REGISTRO: entra con la riga in attesa, si conta
// fra quelle che aspettano, dopo il pagamento aspetta l'ok, l'ok e' uno solo,
// lo scarto lascia la riga e toglie il file, la scadenza e la pulizia dicono
// quali file non hanno piu' ragione di esistere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-registro-media-');
const { registroDonazioni, db } = await import('../../src/db.js');
process.on('exit', () => usaEGetta.pulisci());

const media = { file: 'dn_1_abcd1234.webp', tipo: 'immagine', durata: 5000 };

test('senza immagine la riga e\' quella di sempre; con l\'immagine aspetta', () => {
  assert.ok(registroDonazioni.apri('stripe:cs_liscia', { login: 'Andry', importo: 500, nome: 'Luca' }));
  const l = registroDonazioni.get('stripe:cs_liscia');
  assert.equal(l.media, ''); assert.equal(l.media_stato, '');
  assert.ok(registroDonazioni.apri('stripe:cs_img', { login: 'andry', importo: 2500, nome: 'Anna', media }));
  const r = registroDonazioni.get('stripe:cs_img');
  assert.equal(r.media, 'dn_1_abcd1234.webp'); assert.equal(r.media_tipo, 'immagine'); assert.equal(r.media_durata, 5000); assert.equal(r.media_stato, 'attesa');
  assert.equal(registroDonazioni.mediaInAttesa('andry'), 1, 'conta anche prima del pagamento: il file c\'e\' gia\'');
  assert.deepEqual(registroDonazioni.mediaDaApprovare('andry'), [], 'ma allo streamer si mostra solo dopo il pagamento');
});

test('pagata: aspetta l\'ok; l\'ok e\' uno solo, poi resta «in onda»', () => {
  assert.ok(registroDonazioni.paga('stripe:cs_img', 2500, 'pi_1'));
  const coda = registroDonazioni.mediaDaApprovare('andry');
  assert.equal(coda.length, 1); assert.equal(coda[0].id, 'stripe:cs_img');
  assert.equal(registroDonazioni.mediaOk('altro', 'stripe:cs_img'), false, 'solo il suo streamer');
  assert.equal(registroDonazioni.mediaOk('andry', 'stripe:cs_img'), true);
  assert.equal(registroDonazioni.mediaOk('andry', 'stripe:cs_img'), false, 'la seconda volta no: e\' gia\' in onda');
  assert.deepEqual(registroDonazioni.mediaDaApprovare('andry'), []);
  assert.equal(registroDonazioni.mediaInAttesa('andry'), 0);
  const r = registroDonazioni.get('stripe:cs_img');
  assert.equal(r.media_stato, 'ok'); assert.equal(r.media, 'dn_1_abcd1234.webp', 'il file resta: si puo\' rimandare');
});

test('scartata: la riga resta, il file no, e chi scarta sa quale file togliere', () => {
  registroDonazioni.apri('satispay:t2', { login: 'andry', fonte: 'satispay', importo: 3000, media: { file: 'dn_2_ffff0000.webm', tipo: 'video', durata: 4200 } });
  registroDonazioni.paga('satispay:t2', 3000, 'sp-2');
  assert.deepEqual(registroDonazioni.mediaVia('satispay:t2'), { login: 'andry', media: 'dn_2_ffff0000.webm' });
  const r = registroDonazioni.get('satispay:t2');
  assert.equal(r.stato, 'pagata'); assert.equal(r.media, ''); assert.equal(r.media_stato, 'no');
  assert.equal(registroDonazioni.mediaVia('satispay:t2'), null, 'niente da togliere due volte');
  assert.equal(registroDonazioni.mediaOk('andry', 'satispay:t2'), false, 'scartata non si manda');
});

test('mai pagata: alla scadenza l\'immagine si stacca dalla riga (il file lo toglie chi ha la riga in mano)', () => {
  registroDonazioni.apri('stripe:cs_mai', { login: 'andry', importo: 4000, media: { file: 'dn_3_00000000.webp', tipo: 'immagine', durata: 5000 } });
  assert.equal(registroDonazioni.mediaInAttesa('andry'), 1);
  assert.ok(registroDonazioni.scadi('stripe:cs_mai'));
  const r = registroDonazioni.get('stripe:cs_mai');
  assert.equal(r.stato, 'scaduta'); assert.equal(r.media, '');
  assert.equal(registroDonazioni.mediaInAttesa('andry'), 0);
});

test('la pulizia dice quali file delle righe tolte erano ancora sul disco', () => {
  const vecchia = Date.now() - 400 * 86400_000;
  registroDonazioni.segna('kofi:andry:9', { login: 'andry', fonte: 'kofi', importo: 100 });
  db.prepare("UPDATE donazioni SET pagata_at=?, media='dn_9_aaaaaaaa.webp', media_stato='ok' WHERE id='kofi:andry:9'").run(vecchia);
  registroDonazioni.segna('kofi:andry:10', { login: 'andry', fonte: 'kofi', importo: 100 });
  db.prepare("UPDATE donazioni SET pagata_at=? WHERE id='kofi:andry:10'").run(vecchia);
  const via = registroDonazioni.pulisci();
  assert.deepEqual(via, [{ login: 'andry', media: 'dn_9_aaaaaaaa.webp' }], 'solo chi aveva un file');
  assert.equal(registroDonazioni.get('kofi:andry:9'), null); assert.equal(registroDonazioni.get('kofi:andry:10'), null);
  assert.ok(registroDonazioni.get('stripe:cs_img'), 'le recenti restano');
});
