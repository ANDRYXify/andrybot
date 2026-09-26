// LE CAMPAGNE IN CITTA': un anno di tutto per chi arriva dal QR (docs/CAMPAGNE.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-campagne-');
const c = await import('../../src/features/campagne.js');
const { campagneDb, subscriptions } = await import('../../src/db.js');
const { ADDON_IDS } = await import('../../src/features/abbonamenti.js');
const GIORNO = 86_400_000;

test('si apre a mezzanotte della citta\', non di Londra', () => {
  assert.equal(new Date(c.mezzanotte('2026-11-02', 'America/New_York')).toISOString(), '2026-11-02T05:00:00.000Z', 'New York, ora solare');
  assert.equal(new Date(c.mezzanotte('2026-07-01', 'America/New_York')).toISOString(), '2026-07-01T04:00:00.000Z', 'New York, ora legale');
  assert.equal(new Date(c.mezzanotte('2026-07-01', 'Europe/Rome')).toISOString(), '2026-06-30T22:00:00.000Z', 'Roma, ora legale');
  assert.equal(new Date(c.mezzanotte('2026-12-01', 'Europe/Rome')).toISOString(), '2026-11-30T23:00:00.000Z', 'Roma, ora solare');
  for (const storta of ['', '2026-02-30', '26-11-02', 'domani', null]) assert.equal(c.mezzanotte(storta, 'Europe/Rome'), null, String(storta));
});

test('gli stati: prima, aperta, piena, chiusa', () => {
  const apre = c.mezzanotte('2026-11-02', 'America/New_York');
  const s = (adesso, presi = 0) => c.stato('nyc', { dal: '2026-11-02', adesso, presi });
  assert.equal(s(apre - 1), 'prima');
  assert.equal(s(apre), 'aperta');
  assert.equal(s(apre, c.TETTO - 1), 'aperta', 'l\'ultimo posto c\'e\'');
  assert.equal(s(apre, c.TETTO), 'piena');
  assert.equal(s(apre + c.FINESTRA * GIORNO - 1), 'aperta', 'fino all\'ultimo istante del trentesimo giorno');
  assert.equal(s(apre + c.FINESTRA * GIORNO), 'chiusa');
  assert.equal(c.stato('nyc', { dal: '', adesso: apre }), 'prima', 'senza data di messa in onda non si apre');
  assert.equal(c.stato('altrove', { dal: '2026-11-02', adesso: apre }), 'prima', 'e una citta\' che non c\'e\' nemmeno');
  assert.deepEqual([c.TETTO, c.FINESTRA, c.GIORNI], [500, 30, 365], 'le regole decise: 500 canali, 30 giorni, un anno');
});

test('chi non la puo\' prendere, e perche\'', () => {
  const p = (x) => c.perche({ statoCampagna: 'aperta', abbonamento: null, community: false, gia: false, ...x });
  assert.equal(p({}), null, 'un canale qualunque, a campagna aperta: si');
  assert.equal(p({ abbonamento: { status: 'trialing' } }), null, 'una prova in corso diventa un anno');
  assert.equal(p({ abbonamento: { status: 'canceled' } }), null, 'un abbonamento chiuso non conta');
  assert.equal(p({ abbonamento: { status: 'active' } }), 'abbonato', 'chi paga no: il regalo scriverebbe sopra al suo abbonamento');
  assert.equal(p({ community: true }), 'tutto');
  assert.equal(p({ gia: true }), 'gia');
  for (const s of ['prima', 'piena', 'chiusa']) assert.equal(p({ statoCampagna: s }), s);
});

test('il regalo e\' la prova completa, lunga 365 giorni', () => {
  const ora = Date.parse('2026-11-05T12:00:00Z');
  const r = c.regalo(ora);
  assert.deepEqual(r, { tier: 'base', pacchetti: ADDON_IDS, status: 'trialing', periodEnd: ora + 365 * GIORNO });
});

test('prenderla: una volta per canale, fino al tetto, e il regalo fatto davvero', () => {
  const ora = Date.parse('2026-11-05T12:00:00Z');
  assert.equal(campagneDb.prendi('nyc', 'Uno', { tetto: 2, ora, regala: () => subscriptions.set('uno', c.regalo(ora)) }), 'presa');
  assert.ok(subscriptions.attivo('uno', ora + 364 * GIORNO), 'un anno di tutto');
  assert.ok(!subscriptions.attivo('uno', ora + 366 * GIORNO), 'e poi basta, da solo');
  assert.equal(campagneDb.prendi('nyc', 'uno', { tetto: 2, ora, regala: () => assert.fail('due volte no') }), 'gia');
  assert.equal(campagneDb.prendi('nyc', 'due', { tetto: 2, ora, regala: () => {} }), 'presa');
  assert.equal(campagneDb.prendi('nyc', 'tre', { tetto: 2, ora, regala: () => assert.fail('oltre il tetto no') }), 'piena');
  assert.equal(campagneDb.presi('nyc'), 2);
  assert.equal(campagneDb.prendi('milano', 'tre', { tetto: 2, ora, regala: () => {} }), 'presa', 'ogni citta\' ha i suoi posti');
});

test('se il regalo non riesce, il posto non resta preso', () => {
  const ora = Date.parse('2026-11-05T12:00:00Z');
  assert.throws(() => campagneDb.prendi('napoli', 'quattro', { tetto: 5, ora, regala: () => { throw new Error('giu\''); } }));
  assert.equal(campagneDb.di('napoli', 'quattro'), null, 'la riga torna indietro con il regalo');
  assert.equal(campagneDb.presi('napoli'), 0);
});

test.after(() => usaEGetta.pulisci());
