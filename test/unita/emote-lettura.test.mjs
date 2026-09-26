// LA MAPPA DELLE EMOTE PER L'OVERLAY: si ricorda solo quello che 7TV ha detto.
//
// Il difetto: una lettura andata male (7TV lento, Twitch che non risponde)
// finiva in cache come «questo canale non ha emote» per dieci minuti, e il
// browser dell'overlay la teneva altri cinque. Da fuori: le emote 7TV che ogni
// tanto spariscono dalla chat a schermo e dal muro.
// Ora: una lettura riuscita vale dieci minuti; una mancata si riprova presto,
// non cancella quello che si sapeva, e dice che la mappa e' incompleta.
// Un 404 invece e' una risposta vera: quel canale su 7TV non c'e'.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as emotes from '../../src/features/emotes.js';

const ID = (n) => `01FCY771D800007PQ2DF3GD${String(n).padStart(3, '0')}`;
const set = (...nomi) => ({ emotes: nomi.map((n, i) => ({ id: ID(i + 1), name: n })) });
const helix = { getUserByLogin: async () => ({ id: '4242' }) };

// 7TV finto: `canale` e `globali` dicono cosa risponde, adesso.
const sette = { canale: 200, globali: 200, set: set('KEKW') };
let adesso = 1_000_000;
const veroNow = Date.now;
const veroFetch = globalThis.fetch;
test.before(() => {
  Date.now = () => adesso;
  globalThis.fetch = async (url) => {
    const u = String(url);
    const stato = u.includes('/emote-sets/global') ? sette.globali : sette.canale;
    if (stato === 'giu') throw new Error('rete');
    const corpo = u.includes('/emote-sets/global') ? set('Globale') : { emote_set: sette.set };
    return { ok: stato === 200, status: stato, arrayBuffer: async () => Buffer.from(JSON.stringify(corpo)) };
  };
});
test.after(() => { Date.now = veroNow; globalThis.fetch = veroFetch; });

test('una lettura buona vale dieci minuti', async () => {
  emotes.invalida();
  const a = await emotes.mappaCanaleLetta(helix, 'uno');
  assert.equal(a.buona, true);
  assert.deepEqual(Object.keys(a.mappa).sort(), ['Globale', 'KEKW']);
  sette.set = set('Nuova');
  adesso += 9 * 60_000;
  assert.ok('KEKW' in (await emotes.mappaCanaleLetta(helix, 'uno')).mappa, 'dentro i dieci minuti si riusa');
  adesso += 2 * 60_000;
  assert.ok('Nuova' in (await emotes.mappaCanaleLetta(helix, 'uno')).mappa, 'dopo si rilegge');
});

test('una lettura mancata non cancella quello che si sapeva, e si riprova presto', async () => {
  emotes.invalida();
  sette.set = set('KEKW');
  await emotes.mappaCanaleLetta(helix, 'due');
  adesso += 11 * 60_000;
  sette.canale = 'giu';
  const b = await emotes.mappaCanaleLetta(helix, 'due');
  assert.equal(b.buona, false, 'e lo dice');
  assert.ok('KEKW' in b.mappa, 'le emote di prima restano');
  sette.canale = 200; sette.set = set('Tornata');
  adesso += 10_000;
  assert.ok(!('Tornata' in (await emotes.mappaCanaleLetta(helix, 'due')).mappa), 'non a raffica: prima dei 30 secondi no');
  adesso += 25_000;
  const c = await emotes.mappaCanaleLetta(helix, 'due');
  assert.deepEqual([c.buona, 'Tornata' in c.mappa], [true, true], 'passati i 30 secondi si rilegge');
});

test('7TV giu\' al primo colpo: niente da ricordare, ma non si finge un canale senza emote', async () => {
  emotes.invalida();
  sette.canale = 500;
  const d = await emotes.mappaCanaleLetta(helix, 'tre');
  assert.equal(d.buona, false);
  sette.canale = 200;
  adesso += 31_000;
  assert.equal((await emotes.mappaCanaleLetta(helix, 'tre')).buona, true);
});

test('un 404 e\' una risposta: quel canale su 7TV non c\'e\', e si ricorda come tale', async () => {
  emotes.invalida();
  sette.canale = 404;
  const e = await emotes.mappaCanaleLetta(helix, 'quattro');
  assert.deepEqual([e.buona, Object.keys(e.mappa)], [true, ['Globale']]);
  sette.canale = 200;
});

test('anche le globali: una lettura mancata tiene le ultime buone', async () => {
  emotes.invalida();
  await emotes.mappaCanaleLetta(helix, 'cinque');
  adesso += 11 * 60_000;
  sette.globali = 'giu';
  const f = await emotes.mappaCanaleLetta(helix, 'cinque');
  assert.deepEqual([f.buona, 'Globale' in f.mappa], [false, true]);
  sette.globali = 200;
});

test('soloCanale (i raid del muro) segue la stessa regola', async () => {
  emotes.invalida();
  sette.set = set('Raid');
  assert.ok('Raid' in await emotes.soloCanale(helix, 'sei'));
  adesso += 11 * 60_000;
  sette.canale = 'giu';
  assert.ok('Raid' in await emotes.soloCanale(helix, 'sei'), 'la lettura mancata non la svuota');
  sette.canale = 200;
});
