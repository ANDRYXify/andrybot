// LA LOCANDINA NASCE ACCESA — e chi la spegne resta spento.
//
// «Non ho deciso» e «no» sono due cose diverse. Una riga in `carte_live` nasce
// solo quando qualcuno tocca la levetta o salva un disegno: prima di allora non
// c'è nessuna risposta, e trattare il silenzio come un «no» vorrebbe dire una
// grafica che esiste e che non vede nessuno finché non la scopre nel pannello.
//
// Il rovescio conta uguale: chi l'ha spenta deve restare spento anche salvando
// un disegno, sennò gli si riaccende sotto le mani — e se ne accorge dal gruppo.
//
// Questo file apre il DATABASE, quindi ne apre uno suo: `DATA_DIR` va messo
// prima, e per farlo l'importazione dev'essere dinamica. Le `import` normali si
// eseguono tutte prima del corpo del file, e il database vero sarebbe già
// aperto — e scritto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'locandina-'));
const { carteLive, ACCESA_SENZA_RISPOSTA } = await import('../../src/db.js');

test('chi non ha mai deciso ce l’ha accesa', () => {
  assert.equal(ACCESA_SENZA_RISPOSTA, true);
  const c = 'mai-toccato';
  const mai = carteLive.get(c);
  assert.equal(mai.attiva, true, 'senza risposta, la locandina parte');
  assert.equal(mai.mai, true, 'e si sa che è silenzio, non un no');
  assert.equal(mai.dati, null, 'e non c’è nessun disegno suo');
});

test('chi l’ha spenta resta spento, anche salvando un disegno', () => {
  const c = 'spenta-apposta';
  carteLive.set(c, { attiva: false });
  assert.equal(carteLive.get(c).attiva, false);
  carteLive.set(c, { dati: { elementi: [{ tipo: 'testo', id: 'x' }] } });
  assert.equal(carteLive.get(c).attiva, false, 'salvare un disegno non riaccende l’invio');
  assert.ok(carteLive.get(c).dati, 'ma il disegno si salva lo stesso');
});

test('buttata via la riga, si torna al comportamento di casa', () => {
  const c = 'da-buttare';
  carteLive.set(c, { attiva: false });
  carteLive.cancella(c);
  assert.equal(carteLive.get(c).attiva, true);
});

test('il valore di casa è scritto in un posto solo', () => {
  // Due copie prima o poi dicono cose diverse, e nessuna delle due dà errore.
  const db = readFileSync(join(RAD, 'src/db.js'), 'utf8');
  assert.equal((db.match(/ACCESA_SENZA_RISPOSTA/g) || []).length, 2,
    'dichiarato una volta, usato una volta');
  assert.doesNotMatch(db, /if \(!r\) return null;[\s\S]{0,80}carte_live/, 'niente vecchio ritorno a vuoto');
});

test('spenta, non si disegna niente; accesa, si disegna', async () => {
  const { pngPerDiretta, fotoPerEvento } = await import('../../src/features/cartalive.js');
  const c = 'chi-la-vuole-spenta';
  carteLive.set(c, { attiva: false });
  assert.equal(await pngPerDiretta(c, {}), null, 'spenta non disegna');
  assert.equal(await fotoPerEvento(c, 'live'), null, 'e nemmeno per una diretta');
  assert.ok(await pngPerDiretta(c, {}, { forza: true }), 'ma l’anteprima la vede lo stesso: è per questo che esiste `forza`');

  const d = 'chi-non-ha-detto-niente';
  assert.ok(await pngPerDiretta(d, {}), 'senza risposta si disegna: è il comportamento di casa');
});
