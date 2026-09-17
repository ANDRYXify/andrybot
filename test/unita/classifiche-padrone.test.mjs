// IL PADRONE NON CORRE NELLA SUA GARA.
//
// Lo streamer primo fra «chi guarda di piu'» sul proprio canale e' una riga che
// non dice niente: c'e' sempre, per mestiere, e quelle ore le vince per
// definizione. Lo stesso vale per i messaggi e per le monete.
//
// La regola vive in un posto solo (`padroneDi`), e qui si tiene ferma dove si
// vede: monete, ore, serie, chat della scheda e chat del rapporto. E si tiene
// fermo anche il caso che la fa sbagliare: su Kick il canale si chiama
// `kick.giada` ma in chat lei scrive come `giada`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-classifiche-');
const { db, points, watchtime, presenze, streamers, padroneDi } = await import('../../src/db.js');
const statistiche = await import('../../src/features/statistiche.js');

const CH = 'andryxify';
streamers.request(CH, 'ANDRYXify', '1');

test('il nome da lasciar fuori e\' quello con cui scrive in chat', () => {
  assert.equal(padroneDi('andryxify'), 'andryxify');
  assert.equal(padroneDi('kick.giada'), 'giada', 'su Kick il canale ha il prefisso, chi scrive no');
});

test('le monete: in classifica ci va il pubblico', () => {
  points.add(CH, 'andryxify', 5000);
  points.add(CH, 'terry9221', 1355);
  points.add(CH, 'chiara_3008', 1278);
  const top = points.top(CH, 5).map((r) => r.user);
  assert.ok(!top.includes('andryxify'), 'il padrone non compare');
  assert.deepEqual(top.slice(0, 2), ['terry9221', 'chiara_3008']);
});

test('e nemmeno nel posto che uno occupa', () => {
  assert.equal(points.posizione(CH, 'terry9221'), 1, 'primo, perche\' sopra di lui c\'e\' solo il padrone');
});

test('le ore guardate: il padrone le vincerebbe sempre', () => {
  watchtime.add(CH, 'andryxify', 143400);
  watchtime.add(CH, 'liludragonboss', 89700);
  const top = watchtime.top(CH, 5).map((r) => r.user);
  assert.deepEqual(top, ['liludragonboss']);
});

test('le serie di presenze', () => {
  presenze.set(CH, 'andryxify', { dirette: 90, serie: 90, record: 90 });
  presenze.set(CH, 'seb__98', { dirette: 12, serie: 7, record: 9 });
  assert.deepEqual(presenze.top(CH, 5).map((r) => r.user), ['seb__98']);
});

test('chi scrive di piu\': il conto dei messaggi resta intero, la classifica no', () => {
  const ora = Date.now();
  const scrivi = (user, quanti) => {
    for (let i = 0; i < quanti; i++) {
      db.prepare('INSERT INTO messages (channel, user, display, text, ts, from_bot) VALUES (?,?,?,?,?,0)')
        .run(CH, user, user, 'ciao ' + i, ora - 1000);
    }
  };
  scrivi('andryxify', 21);
  scrivi('seb__98', 53);
  scrivi('mizu__gamer', 44);
  const s = statistiche.riassunto(CH, { periodo: 'tutto', ora });
  assert.equal(s.messaggi, 118, 'i messaggi del canale si contano tutti, anche i suoi');
  assert.deepEqual(s.topChatters.map((x) => x.user), ['seb__98', 'mizu__gamer'], 'in classifica ci va chi guarda');
});
