// I PICCOLI AVVISI SU COSA MANCA (src/features/cosa-manca.js): esistono finche'
// la cosa manca, li vede solo il proprietario, e le sue risposte valgono.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AVVISI_ID, avvisiAperti, rispondi, risposteDi, RIMANDI } from '../../src/features/cosa-manca.js';

// Un canale a cui manca tutto quello che il catalogo sa guardare.
const TUTTO = { permessiMancanti: 2, botSpento: true, musica: true, spotify: false, overlayVisto: false, comandi: 0, paginaPubblicata: false, settimanaVuota: true };
const ORA = Date.parse('2026-09-26T12:00:00Z');

test('a chi non e\' il proprietario non arriva niente, qualunque cosa manchi', () => {
  assert.deepEqual(avvisiAperti({ proprietario: false, fatti: TUTTO, adesso: ORA }), [], 'un moderatore non li vede');
  assert.deepEqual(avvisiAperti({ fatti: TUTTO, adesso: ORA }), [], 'e chi non si sa chi sia nemmeno');
  assert.deepEqual(avvisiAperti({ proprietario: 'si', fatti: TUTTO, adesso: ORA }), [], 'serve un si\' vero, non qualcosa che gli somiglia');
});

test('al proprietario arriva tutto quello che manca, nell\'ordine in cui conta', () => {
  assert.deepEqual(avvisiAperti({ proprietario: true, fatti: TUTTO, adesso: ORA }), AVVISI_ID);
  assert.deepEqual(AVVISI_ID.slice(0, 2), ['permessi', 'bot-spento'], 'prima quello che rompe');
});

test('fatta la cosa, l\'avviso sparisce da se\'', () => {
  const fatti = { ...TUTTO, permessiMancanti: 0, botSpento: false, spotify: true, overlayVisto: true, comandi: 3, paginaPubblicata: true, settimanaVuota: false };
  assert.deepEqual(avvisiAperti({ proprietario: true, fatti, adesso: ORA }), []);
  assert.deepEqual(avvisiAperti({ proprietario: true, fatti: { ...fatti, musica: false, spotify: false }, adesso: ORA }), [], 'senza la Musica, Spotify non manca');
});

test('un fatto che il server non ha saputo leggere non accende niente', () => {
  assert.deepEqual(avvisiAperti({ proprietario: true, fatti: {}, adesso: ORA }), []);
  assert.deepEqual(avvisiAperti({ proprietario: true, fatti: { musica: true }, adesso: ORA }), [], 'Spotify ignoto: non si dice che manca');
});

test('le risposte: domani, fra una settimana, mai piu\'', () => {
  const r1 = rispondi({}, 'pagina', 'domani', ORA);
  assert.deepEqual(r1, { pagina: { dopo: ORA + RIMANDI.domani } });
  assert.ok(!avvisiAperti({ proprietario: true, fatti: TUTTO, risposte: r1, adesso: ORA + 1000 }).includes('pagina'), 'rimandato, oggi non torna');
  assert.ok(avvisiAperti({ proprietario: true, fatti: TUTTO, risposte: r1, adesso: ORA + RIMANDI.domani + 1 }).includes('pagina'), 'domani si', 'e domani torna');
  const r2 = rispondi(r1, 'overlay', 'settimana', ORA);
  assert.equal(r2.overlay.dopo, ORA + 7 * 86_400_000);
  assert.equal(r2.pagina.dopo, r1.pagina.dopo, 'una risposta non tocca le altre');
  const r3 = rispondi(r2, 'comandi', 'mai', ORA);
  assert.ok(!avvisiAperti({ proprietario: true, fatti: TUTTO, risposte: r3, adesso: ORA + 10 * 365 * 86_400_000 }).includes('comandi'), 'mai e\' mai');
  assert.equal(rispondi({}, 'inventato', 'mai', ORA), null, 'un avviso che non c\'e\' non si scrive');
  assert.equal(rispondi({}, 'pagina', 'fra-un-anno', ORA), null, 'una risposta che non c\'e\' nemmeno');
});

test('l\'interruttore li spegne tutti, e le impostazioni sporche non passano', () => {
  assert.deepEqual(avvisiAperti({ proprietario: true, spenti: true, fatti: TUTTO, adesso: ORA }), []);
  assert.deepEqual(risposteDi({ pagina: { mai: 'si' }, comandi: { dopo: 'domani' }, altro: { mai: true }, overlay: { mai: true } }), { overlay: { mai: true } });
  assert.deepEqual(risposteDi(null), {});
});
