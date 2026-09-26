// LE CAMPAGNE: un regalo per chi arriva dal QR di una pubblicità (docs/CAMPAGNE.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-campagne-');
const c = await import('../../src/features/campagne.js');
const { campagneDb, subscriptions } = await import('../../src/db.js');
const { ADDON_IDS } = await import('../../src/features/abbonamenti.js');
const GIORNO = 86_400_000;
const NYC = { ...c.norm({ lingua: 'en', fuso: 'America/New_York', luogo: 'Times Square', dal: '2026-11-02' }).campagna, id: 'nyc' };

test('si apre a mezzanotte della citta\', non di Londra', () => {
  assert.equal(new Date(c.mezzanotte('2026-11-02', 'America/New_York')).toISOString(), '2026-11-02T05:00:00.000Z', 'New York, ora solare');
  assert.equal(new Date(c.mezzanotte('2026-07-01', 'America/New_York')).toISOString(), '2026-07-01T04:00:00.000Z', 'New York, ora legale');
  assert.equal(new Date(c.mezzanotte('2026-07-01', 'Europe/Rome')).toISOString(), '2026-06-30T22:00:00.000Z', 'Roma, ora legale');
  assert.equal(new Date(c.mezzanotte('2026-12-01', 'Europe/Rome')).toISOString(), '2026-11-30T23:00:00.000Z', 'Roma, ora solare');
  for (const storta of ['', '2026-02-30', '2026-13-01', '2026-00-10', '26-11-02', 'domani', null]) assert.equal(c.mezzanotte(storta, 'Europe/Rome'), null, String(storta));
  assert.equal(c.mezzanotte('2026-11-02', 'Marte/Olympus'), null, 'un fuso che non esiste non apre niente');
});

test('una campagna nuova prende le regole di partenza, e si tiene solo quello che ha forma', () => {
  const { campagna: v, errori } = c.norm({});
  assert.deepEqual([v.giorni, v.tetto, v.finestra], [365, 500, 30], 'un anno, i primi 500, 30 giorni');
  assert.deepEqual(v.pacchetti, ADDON_IDS, 'tutti i pacchetti');
  assert.equal(v.attiva, true);
  assert.deepEqual(errori, []);
  const { campagna: s, errori: e2 } = c.norm({ lingua: 'fr', fuso: 'Luna/Base', dal: '2026-13-01', giorni: -5, tetto: 1e9, finestra: 'mille', pacchetti: ['giochi', 'inventato'], anteprima: 'https://altrove/x.png' });
  assert.deepEqual(e2.sort(), ['dal', 'fuso', 'lingua']);
  assert.deepEqual([s.lingua, s.fuso, s.dal], ['it', 'Europe/Rome', '']);
  assert.deepEqual([s.giorni, s.tetto, s.finestra], [1, 1_000_000, 30], 'i numeri stanno nei loro limiti');
  assert.deepEqual(s.pacchetti, ['giochi'], 'un pacchetto che non esiste non si regala');
  assert.equal(s.anteprima, '', 'l\'anteprima e\' solo un file nostro');
  assert.equal(c.norm({ anteprima: '/campagne/roma.png?v=ab12cd34ef' }).campagna.anteprima, '/campagne/roma.png?v=ab12cd34ef');
});

test('un indirizzo nuovo: forma giusta, e mai il posto di una pagina del sito', () => {
  const occupati = new Set(['entra', 'guide', 'api']);
  assert.equal(c.idNuovo('roma', occupati), '');
  assert.equal(c.idNuovo('times-square-2', occupati), '');
  for (const storto of ['', 'Roma', '-roma', 'roma-', 'ro ma', 'r/oma', 'a'.repeat(31)]) assert.equal(c.idNuovo(storto, occupati), 'forma', storto);
  assert.equal(c.idNuovo('guide', occupati), 'occupato');
  assert.equal(c.idNuovo('roma', occupati, new Set(['roma'])), 'esiste');
});

test('gli stati: spenta, prima, aperta, piena, chiusa', () => {
  const apre = c.mezzanotte('2026-11-02', 'America/New_York');
  const s = (adesso, presi = 0, x = {}) => c.stato({ ...NYC, ...x }, { adesso, presi });
  assert.equal(s(apre - 1), 'prima');
  assert.equal(s(apre), 'aperta');
  assert.equal(s(apre, NYC.tetto - 1), 'aperta', 'l\'ultimo posto c\'e\'');
  assert.equal(s(apre, NYC.tetto), 'piena');
  assert.equal(s(apre + NYC.finestra * GIORNO - 1), 'aperta', 'fino all\'ultimo istante dell\'ultimo giorno');
  assert.equal(s(apre + NYC.finestra * GIORNO), 'chiusa');
  assert.equal(s(apre, 0, { dal: '' }), 'prima', 'senza data di messa in onda non si apre');
  assert.equal(s(apre, 0, { attiva: false }), 'spenta', 'spenta dall\'admin, anche nel mezzo');
  assert.equal(s(apre + 9 * GIORNO, 0, { finestra: 10, tetto: 3 }), 'aperta');
  assert.equal(s(apre + 10 * GIORNO, 0, { finestra: 10 }), 'chiusa', 'la finestra e\' quella della campagna');
  assert.equal(s(apre, 3, { tetto: 3 }), 'piena', 'e il tetto pure');
});

test('chi non la puo\' prendere, e perche\'', () => {
  const p = (x) => c.perche({ statoCampagna: 'aperta', abbonamento: null, community: false, gia: false, ...x });
  assert.equal(p({}), null, 'un canale qualunque, a campagna aperta: si');
  assert.equal(p({ abbonamento: { status: 'trialing' } }), null, 'una prova in corso diventa il regalo');
  assert.equal(p({ abbonamento: { status: 'canceled' } }), null, 'un abbonamento chiuso non conta');
  assert.equal(p({ abbonamento: { status: 'active' } }), 'abbonato', 'chi paga no: il regalo scriverebbe sopra al suo abbonamento');
  assert.equal(p({ community: true }), 'tutto');
  assert.equal(p({ gia: true }), 'gia');
  for (const s of ['prima', 'piena', 'chiusa', 'spenta']) assert.equal(p({ statoCampagna: s }), s);
});

test('il regalo e\' la prova, lunga e larga quanto dice la campagna', () => {
  const ora = Date.parse('2026-11-05T12:00:00Z');
  assert.deepEqual(c.regalo(NYC, ora), { tier: 'base', pacchetti: ADDON_IDS, status: 'trialing', periodEnd: ora + 365 * GIORNO });
  const corta = { ...NYC, giorni: 30, pacchetti: ['giochi', 'musica'] };
  assert.deepEqual(c.regalo(corta, ora), { tier: 'base', pacchetti: ['giochi', 'musica'], status: 'trialing', periodEnd: ora + 30 * GIORNO });
  assert.ok(c.tuttiIPacchetti(NYC) && !c.tuttiIPacchetti(corta));
});

test('prenderla: una volta per canale, fino al tetto, e il regalo fatto davvero', () => {
  const ora = Date.parse('2026-11-05T12:00:00Z');
  assert.equal(campagneDb.prendi('nyc', 'Uno', { tetto: 2, ora, regala: () => subscriptions.set('uno', c.regalo(NYC, ora)) }), 'presa');
  assert.ok(subscriptions.attivo('uno', ora + 364 * GIORNO), 'un anno di tutto');
  assert.ok(!subscriptions.attivo('uno', ora + 366 * GIORNO), 'e poi basta, da solo');
  assert.equal(campagneDb.prendi('nyc', 'uno', { tetto: 2, ora, regala: () => assert.fail('due volte no') }), 'gia');
  assert.equal(campagneDb.prendi('nyc', 'due', { tetto: 2, ora, regala: () => {} }), 'presa');
  assert.equal(campagneDb.prendi('nyc', 'tre', { tetto: 2, ora, regala: () => assert.fail('oltre il tetto no') }), 'piena');
  assert.equal(campagneDb.presi('nyc'), 2);
  assert.equal(campagneDb.prendi('milano', 'tre', { tetto: 2, ora, regala: () => {} }), 'presa', 'ogni campagna ha i suoi posti');
});

test('se il regalo non riesce, il posto non resta preso', () => {
  const ora = Date.parse('2026-11-05T12:00:00Z');
  assert.throws(() => campagneDb.prendi('napoli', 'quattro', { tetto: 5, ora, regala: () => { throw new Error('giu\''); } }));
  assert.equal(campagneDb.di('napoli', 'quattro'), null, 'la riga torna indietro con il regalo');
  assert.equal(campagneDb.presi('napoli'), 0);
});

test('le campagne di partenza nascono una volta sola, e una con delle prese non si cancella', () => {
  const lista = c.SEME.map(({ id, ...d }) => ({ id, dati: c.norm(d).campagna }));
  assert.equal(campagneDb.semina(lista), 3);
  assert.deepEqual(campagneDb.elenco().map((x) => x.id).sort(), ['milano', 'napoli', 'nyc']);
  assert.equal(campagneDb.get('nyc').dati.luogo, 'Times Square');
  assert.equal(campagneDb.togli('nyc'), 'prese', 'ha delle prese: si spegne, non si cancella');
  assert.equal(campagneDb.togli('napoli'), 'tolta');
  assert.equal(campagneDb.semina(lista), 0, 'cancellata dall\'admin, non torna al riavvio');
  assert.equal(campagneDb.get('napoli'), null);
  campagneDb.salva('roma', c.norm({ luogo: 'Roma', giorni: 30 }).campagna);
  assert.equal(campagneDb.get('ROMA').dati.giorni, 30, 'l\'id si legge in minuscolo');
});

test.after(() => usaEGetta.pulisci());
