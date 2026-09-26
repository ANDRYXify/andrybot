// I PICCOLI AVVISI SU COSA MANCA (src/features/cosa-manca.js): esistono finche'
// la cosa manca, li vede solo il proprietario, e le sue risposte valgono.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AVVISI_ID, PROVE_ID, GIORNI_PRIMA, PAUSA_PROVE, eProva, avvisiAperti, rispondi, risposteDi, RIMANDI } from '../../src/features/cosa-manca.js';

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

// «HAI GIA' PROVATO...?» Un canale entrato da un mese, a cui non manca niente e
// che non ha mai usato niente di quello che il catalogo sa guardare.
const MESE = ORA - 30 * 86_400_000;
const A_POSTO = { permessiMancanti: 0, botSpento: false, musica: false, overlayVisto: true, comandi: 3, paginaPubblicata: true, settimanaVuota: false };
const MAI = Object.fromEntries(PROVE_ID.map((id) => [id, false]));
const aperti = (o = {}) => avvisiAperti({ proprietario: true, fatti: { ...A_POSTO, provato: MAI }, dal: MESE, adesso: ORA, ...o });

test('gli inviti arrivano solo quando non manca niente, e nell\'ordine del catalogo', () => {
  assert.deepEqual(aperti(), PROVE_ID);
  assert.deepEqual(aperti({ fatti: { ...A_POSTO, comandi: 0, provato: MAI } }), ['comandi'], 'prima si sistema quello che serve');
  const rimandato = rispondi({}, 'comandi', 'settimana', ORA);
  assert.deepEqual(aperti({ fatti: { ...A_POSTO, comandi: 0, provato: MAI }, risposte: rimandato }), PROVE_ID, 'un avviso rimandato non tiene fermi gli inviti');
  assert.equal(new Set([...AVVISI_ID, ...PROVE_ID]).size, AVVISI_ID.length + PROVE_ID.length, 'avvisi e inviti non si chiamano mai uguale');
});

test('un invito solo per quello che non si e\' mai usato, e solo se si sa', () => {
  assert.deepEqual(aperti({ fatti: { ...A_POSTO, provato: { ...MAI, grafiche: true, muro: true } } }), PROVE_ID.filter((id) => id !== 'grafiche' && id !== 'muro'));
  assert.deepEqual(aperti({ fatti: A_POSTO }), [], 'senza fatti niente');
  assert.deepEqual(aperti({ fatti: { ...A_POSTO, provato: { effetti: 0, giochi: undefined, emote: 'no' } } }), [], 'solo un «mai» vero accende un invito');
});

test('i primi giorni sono per mettere in piedi il canale', () => {
  assert.deepEqual(aperti({ dal: ORA - (GIORNI_PRIMA - 1) * 86_400_000 }), []);
  assert.deepEqual(aperti({ dal: ORA - GIORNI_PRIMA * 86_400_000 }), PROVE_ID, 'passata la settimana, si');
  assert.deepEqual(aperti({ dal: undefined }), [], 'e se non si sa quando e\' entrato, niente');
  assert.deepEqual(aperti({ dal: 0 }), []);
});

test('uno ogni tre giorni, contati dall\'ultima risposta', () => {
  assert.deepEqual(aperti({ provaUltima: ORA - PAUSA_PROVE + 1000 }), []);
  assert.deepEqual(aperti({ provaUltima: ORA - PAUSA_PROVE }), PROVE_ID);
  assert.equal(PAUSA_PROVE, 3 * 86_400_000);
});

test('ogni invito una volta: «mai» lo chiude, «piu\' avanti» lo rimanda di una settimana', () => {
  const r1 = rispondi({}, 'muro', 'mai', ORA);
  assert.ok(!aperti({ risposte: r1, adesso: ORA + 400 * 86_400_000 }).includes('muro'));
  const r2 = rispondi({}, 'telegram', 'settimana', ORA);
  assert.ok(!aperti({ risposte: r2, adesso: ORA + 6 * 86_400_000 }).includes('telegram'));
  assert.ok(aperti({ risposte: r2, adesso: ORA + 7 * 86_400_000 + 1 }).includes('telegram'));
  assert.deepEqual(risposteDi({ muro: { mai: true }, grafiche: { dopo: 5 } }), { muro: { mai: true }, grafiche: { dopo: 5 } }, 'le risposte agli inviti restano');
  assert.ok(eProva('muro') && !eProva('comandi') && !eProva('inventato'));
});

test('l\'interruttore e il proprietario valgono anche per gli inviti', () => {
  assert.deepEqual(aperti({ spenti: true }), []);
  assert.deepEqual(aperti({ proprietario: false }), []);
});
