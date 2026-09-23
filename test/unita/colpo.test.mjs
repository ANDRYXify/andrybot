// IL COLPO DI GRUPPO: piu' si e', piu' e' facile, e le monete si muovono solo
// alla fine.
//
// Si prova che la riuscita sale con la banda fino al tetto, che la resa del
// pannello e' proprio il massimo che il motore puo' dare, che chi entra viene
// detto a gruppi e non una riga a testa, e che chi non ha piu' la posta quando
// il colpo parte resta fuori senza perdere niente. Il ragionamento sta in
// docs/GIOCHI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('colpo-');
const { streamers, points } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const K = await import('../../src/features/colpo.js');
const G = await import('../../src/features/giochi-conf.js');
test.after(() => casa.pulisci());

const T0 = Date.parse('2026-09-23T21:00:00Z');
function canale(ch, colpo = {}, monete = {}) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { giochiConf: { colpo } });
  for (const [u, n] of Object.entries(monete)) points.add(ch, u, n);
}
function scena(ch) {
  const detti = [];
  const scrivi = (user, text) => games.tryGame({ channel: ch, user, text }, (t) => detti.push(t));
  return { detti, scrivi };
}

test('piu\' si e\', piu\' e\' facile: fino al tetto, mai oltre', () => {
  const c = G.valoriDi({}, 'colpo');
  assert.equal(K.probabilitaColpo(1, c), 0.35);
  assert.equal(K.probabilitaColpo(2, c), 0.40);
  assert.equal(K.probabilitaColpo(6, c), 0.60);
  assert.equal(K.probabilitaColpo(40, c), 0.60);
});

test('la resa del pannello e\' il massimo che il motore da\', con qualunque manopola', () => {
  let x = 3;
  const caso = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  for (let i = 0; i < 300; i++) {
    const c = { riuscita: Math.floor(caso() * 101), perPersona: Math.floor(caso() * 3) === 0 ? 0 : Math.floor(caso() * 51), riuscitaMax: Math.floor(caso() * 101), vincita: 100 + Math.floor(caso() * 901) };
    let massimo = 0;
    for (let n = 1; n <= 200; n++) massimo = Math.max(massimo, K.probabilitaColpo(n, c) * c.vincita);
    assert.equal(G.valutaResa({ tipo: 'colpo' }, c).perCento, Math.round(massimo * 10) / 10, JSON.stringify(c));
  }
  assert.equal(G.valutaResa({ tipo: 'colpo' }, G.valoriDi({}, 'colpo')).perCento, 96, 'di serie il banco vince un po\'');
});

test('chi scappa riprende la posta per la vincita, chi e\' preso la perde', () => {
  const c = G.valoriDi({}, 'colpo');
  const giri = [0.1, 0.9];
  const esiti = K.esitoColpo([['anna', { nome: 'anna', posta: 100 }], ['bruno', { nome: 'bruno', posta: 50 }]], c, () => giri.shift());
  assert.deepEqual(esiti.map((e) => [e.chi, e.scappa, e.netto]), [['anna', true, 60], ['bruno', false, -50]]);
  const testo = K.testoColpo(esiti, c);
  assert.ok(c.meta.some((t) => testo.startsWith(t)), testo);
  assert.match(testo, /anna \+60, bruno −50\.$/);
  const mai = { riuscita: 0, riuscitaMax: 0, perPersona: 0, vincita: 160 };
  assert.equal(K.esitoColpo([['anna', { nome: 'anna', posta: 10 }]], mai, () => 0)[0].scappa, false, 'riuscita zero e\' zero anche se il caso esce 0');
});

test('la banda si forma, gli ingressi si dicono insieme, e alla fine scappano tutti', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: T0 });
  canale('k1', { riuscita: 100, riuscitaMax: 100 }, { anna: 500, bruno: 80, dario: 60, elena: 60 });
  const s = scena('k1');
  s.scrivi('anna', '!colpo 100');
  assert.match(s.detti.at(-1), /anna organizza un colpo con 100 monete!.*!colpo.*60 secondi/);
  t.mock.timers.tick(1000);
  const prima = s.detti.length;
  s.scrivi('bruno', '!colpo');
  assert.equal(s.detti.length, prima, 'chi entra subito dopo si dice fra poco, non adesso');
  t.mock.timers.tick(3999);
  assert.equal(s.detti.length, prima, 'gli ingressi si dicono a giri di cinque secondi');
  t.mock.timers.tick(1);
  assert.equal(s.detti.at(-1), '🦹 Entra bruno: la banda è di 2.');
  t.mock.timers.tick(1000);
  s.scrivi('dario', '!colpo');
  s.scrivi('elena', '!colpo');
  s.scrivi('carla', '!colpo');
  assert.match(s.detti.at(-1), /carla, per entrare con 50 monete non basta quello che hai \(0\)/);
  s.scrivi('dario', '!colpo');
  assert.match(s.detti.at(-1), /dario, sei già nella banda/);
  t.mock.timers.tick(4000);
  assert.equal(s.detti.at(-1), '🦹 Entrano dario, elena: la banda è di 4.');
  assert.deepEqual(K.colpoInCorso('k1').map((m) => m.chi), ['anna', 'bruno', 'dario', 'elena']);
  assert.equal(points.get('k1', 'anna'), 500, 'entrare non toglie niente');
  const detti = s.detti.length;
  t.mock.timers.tick(50_000);
  assert.equal(s.detti.length, detti + 1, 'se non entra nessuno il giro tace: resta solo com\'e\' andata');
  assert.equal(K.colpoInCorso('k1'), null);
  assert.match(s.detti.at(-1), /anna \+60, bruno \+30, dario \+30, elena \+30\.$/);
  assert.deepEqual(['anna', 'bruno', 'dario', 'elena'].map((u) => points.get('k1', u)), [560, 110, 90, 90]);
});

test('chi non ha piu\' la posta quando si parte resta fuori; troppo pochi e il colpo salta', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: T0 });
  canale('k2', { riuscita: 0, riuscitaMax: 0, perPersona: 0 }, { anna: 100, bruno: 100, carla: 100 });
  const s = scena('k2');
  s.scrivi('anna', '!colpo 100');
  s.scrivi('bruno', '!colpo 100');
  s.scrivi('carla', '!colpo 100');
  points.add('k2', 'carla', -50);
  t.mock.timers.tick(60_000);
  assert.match(s.detti.at(-1), /anna −100, bruno −100\. Una persona resta fuori: non ha più la sua posta\.$/);
  assert.deepEqual(['anna', 'bruno', 'carla'].map((u) => points.get('k2', u)), [0, 0, 50]);

  s.scrivi('carla', '!colpo 10');
  assert.match(s.detti.at(-1), /La polizia gira ancora: il prossimo colpo fra 5 minuti/);
  t.mock.timers.tick(300_000);
  s.scrivi('carla', '!colpo 10');
  t.mock.timers.tick(60_000);
  assert.match(s.detti.at(-1), /Il colpo salta: servono almeno 2 persone con la loro posta\. Nessuno perde niente\./);
  assert.equal(points.get('k2', 'carla'), 50);
});

test('la posta si scrive come un numero, e non oltre il massimo', () => {
  canale('k3', { massimo: 200 }, { anna: 1000 });
  const s = scena('k3');
  for (const x of ['!colpo tanto', '!colpo 0', '!colpo -5', '!colpo 1.5']) {
    s.scrivi('anna', x);
    assert.match(s.detti.at(-1), /Si entra così: !colpo, oppure !colpo 100/, x);
  }
  s.scrivi('anna', '!colpo 201');
  assert.match(s.detti.at(-1), /la posta massima è 200 monete/);
  assert.equal(K.colpoInCorso('k3'), null);
});
