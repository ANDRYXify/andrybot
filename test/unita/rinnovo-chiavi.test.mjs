// IL RINNOVO UNA-TANTUM DELLE CHIAVI DEGLI OVERLAY: gira una volta, cambia
// solo chi una chiave ce l'aveva, e la seconda volta non fa niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

cartellaUsaEGetta('andrybot-rinnovo-');
const { db, streamers, rinnovaChiaviOverlayUnaTantum } = await import('../../src/db.js');

const FLAG = 'overlay_key_rinnovo_v1';
const flag = () => db.prepare("SELECT value FROM facts WHERE channel='__migrazioni__' AND key=?").get(FLAG);

test('all\'avvio su un database vuoto il rinnovo si segna e non tocca niente', () => {
  assert.ok(flag(), 'il segno c\'e\' gia\': e\' partito importando il modulo');
  assert.equal(flag().value, '0');
});

test('chi aveva una chiave la cambia, chi non l\'aveva resta senza, e il giro non si ripete', () => {
  streamers.request('conchiave', 'Con Chiave', '1');
  streamers.request('senzachiave', 'Senza', '2');
  streamers.setSettings('conchiave', { overlayKey: 'vecchia-e-pubblica', altro: 'resta' });
  streamers.setSettings('senzachiave', { altro: 'resta' });
  db.prepare("DELETE FROM facts WHERE channel='__migrazioni__' AND key=?").run(FLAG);

  assert.equal(rinnovaChiaviOverlayUnaTantum(), 1, 'un canale rinnovato');
  const c = streamers.get('conchiave').settings;
  assert.notEqual(c.overlayKey, 'vecchia-e-pubblica', 'la chiave e\' cambiata');
  assert.match(c.overlayKey, /^[a-f0-9]{32}$/, 'ed e\' una chiave vera');
  assert.equal(c.altro, 'resta', 'il resto delle impostazioni non si tocca');
  assert.equal(streamers.get('senzachiave').settings.overlayKey, undefined, 'chi non ne aveva non ne riceve una a caso');
  assert.equal(flag().value, '1');

  const dopo = c.overlayKey;
  assert.equal(rinnovaChiaviOverlayUnaTantum(), 0, 'la seconda volta non fa niente');
  assert.equal(streamers.get('conchiave').settings.overlayKey, dopo, 'e la chiave resta quella');
});
