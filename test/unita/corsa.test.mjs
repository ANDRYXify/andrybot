// LA CORSA: ogni corridore rende uguale, l'arrivo segue le quote, e le monete
// si muovono solo all'arrivo.
//
// Le quote si provano su ogni numero di corridori e ogni resa del pannello;
// l'estrazione del vincitore ai confini esatti fra un corridore e l'altro, e
// poi a un milione di corse; il giro in chat con l'arrivo deciso dalla prova.
// Il ragionamento sta in docs/GIOCHI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('corsa-');
const { streamers, points } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const K = await import('../../src/features/corsa.js');
const G = await import('../../src/features/giochi-conf.js');
const R = await import('../../src/features/comandi-registro.js');
test.after(() => { K.impostaCaso(null); casa.pulisci(); });

const T0 = Date.parse('2026-09-23T21:00:00Z');
const mulberry = (a) => () => {
  a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// Un arrivo deciso: il caso che fa uscire per primo il corridore `i` (da 0) su
// cinque, pesi 5 4 3 2 1.
const vince = (i) => () => [0, 5, 9, 12, 14][i] / 15;
function canale(ch, corsa = {}, monete = {}) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { giochiConf: { corsa } });
  for (const [u, n] of Object.entries(monete)) points.add(ch, u, n);
}
function scena(ch) {
  const detti = [];
  const scrivi = (user, text) => {
    const msg = { channel: ch, user, text };
    const v = R.preparaComando(ch, msg);
    games.tryGame({ ...msg, text: v?.testo || text }, (t) => detti.push(t));
  };
  return { detti, scrivi };
}

test('ogni corridore rende uguale, mai sopra la resa scelta, e il pannello dice la piu\' alta', () => {
  for (let n = 2; n <= 8; n++) {
    for (let rende = 50; rende <= 100; rende++) {
      const q = G.quoteCorsa(n, rende);
      assert.equal(q.reduce((s, x) => s + x.p, 0).toFixed(12), (1).toFixed(12));
      for (const x of q) {
        assert.ok(x.p * x.ritorno <= rende + 1e-9, `n ${n}, rende ${rende}: ${x.p * x.ritorno}`);
        assert.ok(x.p * x.ritorno > rende - 1, 'per difetto si perde meno di un punto');
      }
      const corridori = Array.from({ length: n }, (_, i) => `c${i}`);
      const r = G.valutaResa({ tipo: 'corsa' }, { rende, corridori });
      assert.equal(r.perCento, Math.round(Math.max(...q.map((x) => x.p * x.ritorno)) * 10) / 10);
    }
  }
  assert.deepEqual(G.quoteCorsa(5, 95).map((x) => x.ritorno), [285, 356, 475, 712, 1425]);
});

test('il primo arrivato esce con la probabilita\' della sua quota, confini compresi', () => {
  const bordi = [[0, 0], [4.999, 0], [5, 1], [8.999, 1], [9, 2], [11.999, 2], [12, 3], [13.999, 3], [14, 4], [14.999, 4]];
  for (const [x, atteso] of bordi) assert.equal(K.ordineArrivo(5, () => x / 15)[0], atteso, `caso ${x}/15`);
  const ordine = K.ordineArrivo(5, () => 0);
  assert.deepEqual([...ordine].sort(), [0, 1, 2, 3, 4], 'nel podio ognuno una volta sola');
  const caso = mulberry(7);
  const N = 1_000_000;
  const conta = [0, 0, 0, 0, 0];
  for (let i = 0; i < N; i++) conta[K.ordineArrivo(5, caso)[0]]++;
  G.quoteCorsa(5, 95).forEach((x, i) => {
    const sd = Math.sqrt(x.p * (1 - x.p) / N);
    assert.ok(Math.abs(conta[i] / N - x.p) < 4 * sd, `corridore ${i + 1}: ${conta[i] / N} contro ${x.p}`);
  });
});

test('il corridore si dice col numero o con l\'inizio del nome, senza faccine', () => {
  const nomi = ['🐎 Cavallo', '🐇 Lepre', '🐕 Cane', '🦆 Papera', '🐢 Tartaruga'];
  assert.equal(K.corridoreDetto('2', nomi), 1);
  assert.equal(K.corridoreDetto('LEP', nomi), 1);
  assert.equal(K.corridoreDetto('tartaruga', nomi), 4);
  assert.equal(K.corridoreDetto('ca', nomi), -1, 'cavallo o cane: non si indovina');
  assert.equal(K.corridoreDetto('cav', nomi), 0);
  assert.equal(K.corridoreDetto('5', nomi), 4);
  assert.equal(K.corridoreDetto('6', nomi), -1);
  assert.equal(K.corridoreDetto('0', nomi), -1);
  assert.equal(K.corridoreDetto('l', nomi), -1, 'una lettera sola e\' troppo poco');
  assert.equal(K.corridoreDetto('pega', ['🐴 Pégaso', '🐉 Drago']), 0, 'gli accenti non contano');
});

test('si punta, si parte, e all\'arrivo si paga la quota: prima dell\'arrivo nessuna moneta si muove', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: T0 });
  canale('c1', { raccolta: 30 }, { anna: 500, bruno: 500, carla: 500, dario: 500, fabio: 100 });
  const s = scena('c1');
  s.scrivi('anna', '!corsa tartaruga 100');
  assert.match(s.detti.at(-1), /anna punta 100 monete su 🐢 Tartaruga e apre la corsa: si parte fra 30 secondi! 1 🐎 Cavallo ×2,85 · 2 🐇 Lepre ×3,56 · 3 🐕 Cane ×4,75 · 4 🦆 Papera ×7,12 · 5 🐢 Tartaruga ×14,25/);
  s.scrivi('bruno', '!race 1 50');
  s.scrivi('carla', '!corsa 1');
  t.mock.timers.tick(5000);
  assert.equal(s.detti.at(-1), '🏁 Puntano anche bruno su 🐎 Cavallo, carla su 🐎 Cavallo.');
  t.mock.timers.tick(5000);
  s.scrivi('dario', '!corsa 3 200');
  t.mock.timers.tick(5000);
  assert.equal(s.detti.at(-1), '🏁 Punta anche dario su 🐕 Cane.', 'il giro riparte con la puntata dopo');
  games.tryGame({ channel: 'c1', user: 'dario', text: '!regala anna 400' }, () => {});
  t.mock.timers.tick(13_000);
  s.scrivi('fabio', '!corsa 5 10');
  t.mock.timers.tick(2000);
  assert.deepEqual(s.detti.slice(-2), ['🏁 Punta anche fabio su 🐢 Tartaruga.', '🏁 Puntate chiuse: partiti!'], 'chi punta all\'ultimo si sente prima della partenza');
  assert.deepEqual(['anna', 'bruno', 'carla', 'fabio'].map((u) => points.get('c1', u)), [900, 500, 500, 100], 'fino all\'arrivo nessuna puntata esce');
  s.scrivi('elena', '!corsa 2 10');
  assert.equal(s.detti.at(-1), '🏁 La corsa è già partita: si punta alla prossima.');
  K.impostaCaso(vince(4));
  t.mock.timers.tick(6000);
  assert.match(s.detti.at(-1), /^🏁 Arrivo! Primo 🐢 Tartaruga, secondo .*, terzo .*\. anna \+1325, fabio \+132, bruno −50, carla −50\. Una persona resta fuori: non ha più la sua puntata\.$/);
  assert.deepEqual(['anna', 'bruno', 'carla', 'dario', 'fabio'].map((u) => points.get('c1', u)), [900 + 1325, 450, 450, 100, 232]);
  assert.equal(K.corsaInCorso('c1'), null);
  s.scrivi('elena', '!corsa');
  assert.equal(s.detti.at(-1), '🏁 La prossima corsa fra 5 minuti.', 'finita una corsa, l\'attesa per tutti');
  K.impostaCaso(null);
});

test('chi ha puntato aspetta la sua attesa, gli altri no; e la vincita si arrotonda per difetto', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: T0 });
  canale('c6', { raccolta: 20, attesaTesta: 600, attesaTutti: 0 }, { anna: 500, bruno: 500 });
  const s = scena('c6');
  s.scrivi('anna', '!corsa 1 50');
  K.impostaCaso(vince(0));
  t.mock.timers.tick(20_000);
  t.mock.timers.tick(6000);
  assert.match(s.detti.at(-1), /anna \+92\./, '50 × 2,85 = 142,5: ne tornano 142');
  s.scrivi('anna', '!corsa 1 10');
  assert.equal(s.detti.at(-1), '🏁 anna, puoi puntare di nuovo fra 10 minuti.');
  s.scrivi('bruno', '!corsa 1 10');
  assert.match(s.detti.at(-1), /bruno punta 10 monete su 🐎 Cavallo e apre la corsa/);
  K.impostaCaso(null);
});

test('una puntata a testa, entro il massimo, con le monete che si hanno', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: T0 });
  canale('c2', { massimo: 100 }, { anna: 500, bruno: 30 });
  const s = scena('c2');
  s.scrivi('anna', '!corsa');
  assert.match(s.detti.at(-1), /anna apre la corsa: si parte fra 45 secondi!/);
  s.scrivi('anna', '!corsa 2 100');
  s.scrivi('anna', '!corsa 3 10');
  assert.equal(s.detti.at(-1), '🏁 anna, hai già puntato su 🐇 Lepre.');
  s.scrivi('bruno', '!corsa 2 101');
  assert.equal(s.detti.at(-1), '🏁 Qui si punta al massimo 100 monete.');
  s.scrivi('bruno', '!corsa 2 40');
  assert.equal(s.detti.at(-1), '🏁 bruno, per puntare 40 monete non basta quello che hai (30).');
  for (const male of ['!corsa ca 10', '!corsa 2 -5', '!corsa 2 2.5', '!corsa 2 zero', '!corsa 0 10']) {
    s.scrivi('bruno', male);
    assert.match(s.detti.at(-1), /Si punta così: !corsa 2 50, col numero o col nome del corridore\./, male);
  }
  s.scrivi('bruno', '!corsa');
  assert.match(s.detti.at(-1), /^🏁 Si punta ancora: 1 🐎 Cavallo/);
  s.scrivi('bruno', '!corsa 2 30');
  assert.deepEqual(K.corsaInCorso('c2').puntate, [{ chi: 'anna', corridore: 1, posta: 100 }, { chi: 'bruno', corridore: 1, posta: 30 }], 'tutto il saldo e il massimo si possono puntare');
});

test('se nessuno punta la corsa non parte, e l\'attesa per tutti comincia lo stesso', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: T0 });
  canale('c3', { raccolta: 20, attesaTutti: 120 }, { anna: 500 });
  const s = scena('c3');
  s.scrivi('anna', '!corsa');
  t.mock.timers.tick(20_000);
  assert.equal(s.detti.at(-1), '🏁 Nessuno ha puntato: la corsa non parte.');
  s.scrivi('anna', '!corsa 1 10');
  assert.equal(s.detti.at(-1), '🏁 La prossima corsa fra 2 minuti.');
  t.mock.timers.tick(120_000);
  s.scrivi('anna', '!corsa 1 10');
  assert.match(s.detti.at(-1), /anna punta 10 monete su 🐎 Cavallo e apre la corsa/);
});

test('i corridori sono quelli scelti, e le quote seguono quanti sono', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: T0 });
  canale('c4', { corridori: ['🚗 Rossa', '🚙 Blu', '🛻 Verde'], rende: 90 }, { anna: 500 });
  const s = scena('c4');
  s.scrivi('anna', '!corsa verde 60');
  assert.match(s.detti.at(-1), /1 🚗 Rossa ×1,80 · 2 🚙 Blu ×2,70 · 3 🛻 Verde ×5,40\./);
  canale('c5', { corridori: ['solo io'] }, {});
  assert.deepEqual(G.valoriDi(streamers.get('c5').settings, 'corsa').corridori.length, 5, 'con un corridore solo non si corre: restano quelli di serie');
});
