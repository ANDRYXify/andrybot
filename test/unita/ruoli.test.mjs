// Chi corre in quale classifica.
//
// Il difetto vero, visto sul prodotto: le due gare erano decise da «chi ha
// guadagnato mentre lo sapevamo», cioe' da chi aveva scritto in chat dopo il
// rilascio. I moderatori che non avevano ancora parlato restavano nella
// classifica del pubblico, in cima, e la pagina diceva «nessun moderatore ha
// ancora monete» — che era falso.
//
// La lista autorevole ce l'ha Twitch, e il riallineamento e' RETROATTIVO.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-ruoli-');
const { points } = await import('../../src/db.js');
const ruoli = await import('../../src/features/ruoli.js');

const CH = 'andryxify';
const finto = (mods) => ({ getModerators: async () => mods });

test.beforeEach(() => ruoli.scorda());

test('un moderatore che non ha mai scritto finisce nella gara giusta', async () => {
  for (const [u, q] of [['seb__98', 1442], ['chiara_3008', 1318], ['skeller92', 308], ['mizu__gamer', 693]]) {
    points.add(CH, u, q);                     // nessuno ha mai portato il suo ruolo
  }
  assert.equal(points.top(CH, 9, 'staff').length, 0, 'partenza: la gara staff e\' vuota');

  const esito = await ruoli.riallinea(finto([{ user_login: 'seb__98' }, { user_login: 'skeller92' }, { user_login: 'MIZU__gamer' }]), CH);
  // `saliti` conta le RIGHE cambiate: lo streamer e' nell'elenco dello staff ma
  // non ha ancora monete, quindi non ha una riga da cambiare.
  assert.equal(esito.saliti, 3);
  assert.equal(esito.staff, 4, 'lo streamer sta nell\'elenco lo stesso');
  assert.deepEqual(points.top(CH, 9, 'staff').map((r) => r.user).sort(),
    ['mizu__gamer', 'seb__98', 'skeller92'], 'lo streamer non ha monete, quindi non compare');
  assert.deepEqual(points.top(CH, 9).map((r) => r.user), ['chiara_3008']);
});

test('lo streamer e\' staff del suo canale anche se Twitch non lo elenca', async () => {
  points.add(CH, CH, 379);
  await ruoli.riallinea(finto([]), CH, { forza: true });
  assert.equal(points.ruoloDi(CH, CH), 'staff');
});

test('chi non e\' piu\' moderatore torna nel pubblico', async () => {
  await ruoli.riallinea(finto([{ user_login: 'seb__98' }]), CH, { forza: true });
  assert.deepEqual(points.top(CH, 9, 'staff').map((r) => r.user).sort(), ['andryxify', 'seb__98']);
  assert.ok(points.top(CH, 9).some((r) => r.user === 'skeller92'), 'skeller92 e\' tornato pubblico');
});

test('«non lo so» non e\' «nessun moderatore»: senza risposta non si tocca niente', async () => {
  const prima = points.top(CH, 9, 'staff').map((r) => r.user).sort();
  assert.equal(await ruoli.riallinea(finto(null), CH, { forza: true }), null, 'nessun permesso: nessuna risposta');
  assert.equal(await ruoli.riallinea({}, CH, { forza: true }), null, 'nemmeno il metodo: idem');
  assert.deepEqual(points.top(CH, 9, 'staff').map((r) => r.user).sort(), prima, 'i ruoli sono rimasti quelli');
});

test('non si chiede a Twitch a ogni apertura di pagina', async () => {
  let chiamate = 0;
  const h = { getModerators: async () => { chiamate++; return [{ user_login: 'seb__98' }]; } };
  await ruoli.riallinea(h, CH, { forza: true });
  await ruoli.riallinea(h, CH);
  await ruoli.riallinea(h, CH);
  assert.equal(chiamate, 1, 'la seconda e la terza volta e\' ancora fresco');
  await ruoli.riallinea(h, CH, { forza: true });
  assert.equal(chiamate, 2, 'ma il premio puo\' forzare');
});

test.after(() => usaEGetta.pulisci());
