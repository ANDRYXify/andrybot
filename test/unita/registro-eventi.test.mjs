// IL REGISTRO DEGLI EVENTI: una riga tagliata a meta' non e' un record.
//
// Ogni evento di Twitch lascia una riga «tipo + contenuto in JSON», e la
// rileggono il rapporto di fine diretta e il cervello rifacendo il JSON. Il
// taglio era a 300 caratteri: un hype train ne occupa seicento, e veniva
// troncato in mezzo. Il tipo restava leggibile, il contenuto no — e nessuno
// poteva accorgersene, perche' una riga tagliata sembra una riga.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rigaEvento, RIGA_EVENTO_MAX } from '../../src/bot.js';

const leggi = (riga) => {
  const i = riga.indexOf(' ');
  return { tipo: riga.slice(0, i), dati: JSON.parse(riga.slice(i + 1)) };
};

test('un evento normale si rilegge intero', () => {
  const dati = { user_name: 'Mario', cumulative_months: 7 };
  const r = leggi(rigaEvento('channel.subscribe', dati));
  assert.equal(r.tipo, 'channel.subscribe');
  assert.deepEqual(r.dati, dati);
});

test('un hype train ci sta dentro: seicento caratteri non sono un caso limite', () => {
  const dati = {
    id: '3f2c1e8a-0b4d-4f9a-9a1e-7c2b5d8e1f34', broadcaster_user_id: '123456789',
    broadcaster_user_login: 'andryxify', broadcaster_user_name: 'ANDRYXify',
    total: 2100, progress: 320, goal: 800, level: 4, all_time_high_level: 11, all_time_high_total: 9000,
    is_shared_train: false, type: 'regular',
    started_at: '2026-09-18T20:12:03.000Z', expires_at: '2026-09-18T20:17:03.000Z',
    top_contributions: [
      { user_id: '1', user_login: 'mario', user_name: 'MarioRossi', type: 'bits', total: 900 },
      { user_id: '2', user_login: 'giada', user_name: 'GiadaTTV', type: 'subscription', total: 500 },
    ],
  };
  const riga = rigaEvento('channel.hype_train.end', dati);
  assert.ok(riga.length > 300, 'se no la prova non prova niente');
  assert.equal(leggi(riga).dati.level, 4);
  assert.equal(leggi(riga).dati.top_contributions[0].user_name, 'MarioRossi');
});

test('quel che non ci sta si dichiara vuoto, non si taglia a meta\'', () => {
  const riga = rigaEvento('channel.enorme', { testo: 'x'.repeat(RIGA_EVENTO_MAX * 2) });
  assert.ok(riga.length <= RIGA_EVENTO_MAX, `la riga e' lunga ${riga.length}`);
  const r = leggi(riga);
  assert.equal(r.tipo, 'channel.enorme', 'il tipo resta: si sa che e\' successo');
  assert.deepEqual(r.dati, {}, 'e il contenuto dice di non esserci, invece di fingere');
});

test('ogni riga si rilegge sempre, qualunque cosa arrivi', () => {
  for (const dati of [null, undefined, {}, { a: 1 }, { giro: 'x'.repeat(5000) }]) {
    const riga = rigaEvento('channel.qualcosa', dati);
    assert.doesNotThrow(() => leggi(riga), `non si rilegge: ${riga.slice(0, 60)}`);
  }
});
