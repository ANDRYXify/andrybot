// L'HYPE TRAIN NEL RAPPORTO DI FINE DIRETTA.
//
// Il rapporto non tiene un conto suo: legge il registro degli eventi, come fa
// per follow, sub e raid. Quindi le prove che contano sono due, e sono
// entrambe modi di raccontare una serata sbagliata:
//
//  · si conta il treno quando FINISCE, non a ogni contributo. Twitch manda un
//    evento a ogni spinta: sommarli vorrebbe dire raccontare dieci treni al
//    posto di uno;
//  · il livello che si dice e' quello piu' alto della serata, non l'ultimo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-rapp-treno-');
const { streamers, memory } = await import('../../src/db.js');
const { raccogli, testo, trenoValore } = await import('../../src/features/rapporto.js');
const { rigaEvento } = await import('../../src/bot.js');

const CH = 'canale';
streamers.request(CH, 'Canale', '1');
const DA = 1_700_000_000_000;
const A = DA + 3 * 3600_000;

const metti = (tipo, dati, quando) => memory.logMessage(CH, '[evento]', '', rigaEvento(tipo, dati), true, quando);
const treno = (o = {}) => ({ id: 't', level: 4, total: 2100, type: 'regular', is_shared_train: false,
  started_at: new Date(DA).toISOString(), ended_at: new Date(DA + 600000).toISOString(),
  cooldown_ends_at: new Date(DA + 7200000).toISOString(),
  top_contributions: [{ user_id: '1', user_login: 'mario', user_name: 'MarioRossi', type: 'bits', total: 900 }], ...o });

test('un treno finito entra nel rapporto, col suo livello e con chi l\'ha spinto', () => {
  metti('channel.hype_train.begin', treno({ level: 1 }), DA + 1000);
  metti('channel.hype_train.progress', treno({ level: 2 }), DA + 2000);
  metti('channel.hype_train.progress', treno({ level: 3 }), DA + 3000);
  metti('channel.hype_train.end', treno({ level: 4 }), DA + 4000);
  const d = raccogli(CH, { inizio: DA, fine: A });
  assert.equal(d.treni, 1, 'un treno, non quattro: si conta quando finisce');
  assert.equal(d.trenoLivello, 4);
  assert.equal(d.trenoChi, 'MarioRossi');
});

test('due treni in una sera si dicono due, e vince il piu\' alto', () => {
  metti('channel.hype_train.end', treno({ id: 't2', level: 7, top_contributions: [{ user_name: 'GiadaTTV', type: 'subscription', total: 2000 }] }), DA + 5000);
  const d = raccogli(CH, { inizio: DA, fine: A });
  assert.equal(d.treni, 2);
  assert.equal(d.trenoLivello, 7);
  assert.equal(d.trenoChi, 'GiadaTTV', 'chi ha spinto il treno migliore, non l\'ultimo che passa');
  assert.match(trenoValore(d), /2 treni/);
});

test('e la riga compare nel messaggio solo se un treno c\'e\' stato davvero', () => {
  const d = raccogli(CH, { inizio: DA, fine: A });
  assert.match(testo(d), /Hype train: 2 treni, il migliore al livello 7 — l'ha spinto GiadaTTV/);
  assert.ok(!/Hype train/.test(testo({ ...d, treni: 0 })), 'senza treni non se ne parla');
});

test('una serata senza treni non inventa niente', () => {
  const d = raccogli(CH, { inizio: A + 1000, fine: A + 2000 });
  assert.equal(d.treni, 0);
  assert.equal(d.trenoLivello, 0);
  assert.equal(d.trenoChi, '');
});

test.after(() => usaEGetta.pulisci());
