// IL BLACKJACK: la resa del pannello e' quella del tavolo, e le monete non si
// perdono per strada.
//
// La resa si calcola esatta (giochi-conf.js, modelloBlackjack); qui la si
// confronta con un milione di mani giocate dal motore vero con la strategia
// che il calcolo dice ottima. Poi le regole del tavolo, una per una, con le
// carte decise dalla prova. Il ragionamento sta in docs/GIOCHI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('blackjack-');
const { streamers, points, statoVivo } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const B = await import('../../src/features/blackjack.js');
const G = await import('../../src/features/giochi-conf.js');
const R = await import('../../src/features/comandi-registro.js');
test.after(() => { B.impostaCaso(null); casa.pulisci(); });

// Un generatore vero a 32 bit: quello «x * 1103515245 % 2^31» fatto coi numeri
// decimali perde precisione oltre 2^53 e sbaglia la misura di un punto e mezzo.
const mulberry = (a) => () => {
  a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// Le carte decise dalla prova: ogni carta chiede al caso il grado e il seme.
const carte = (...gradi) => {
  const coda = gradi.flatMap((g) => [(g - 1 + 0.5) / 13, 0]);
  return () => (coda.length ? coda.shift() : 0.5 / 13);
};
function canale(ch, blackjack = {}, monete = {}) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { giochiConf: { blackjack } });
  for (const [u, n] of Object.entries(monete)) points.add(ch, u, n);
}
function scena(ch) {
  const detti = [];
  // Come in chat: prima il vaglio del registro (gli alias !bj e !21), poi il gioco.
  const scrivi = (user, text) => {
    const msg = { channel: ch, user, text };
    const v = R.preparaComando(ch, msg);
    games.tryGame({ ...msg, text: v?.testo || text }, (t) => detti.push(t));
  };
  return { detti, scrivi };
}

test('la resa calcolata e\' quella del tavolo: un milione di mani giocate al meglio', () => {
  const decidi = G.strategiaBlackjack();
  B.impostaCaso(mulberry(2026));
  const N = 1_000_000;
  let somma = 0, quadrati = 0;
  for (let i = 0; i < N; i++) { const r = B.simulaMano(decidi, 250, 100); somma += r; quadrati += r * r; }
  const media = somma / N / 100;
  const sd = Math.sqrt(quadrati / N / 10000 - media * media);
  const simulata = 100 * (1 + media);
  const calcolata = G.resaBlackjack(250);
  assert.ok(Math.abs(simulata - calcolata) < 300 * sd / Math.sqrt(N), `simulata ${simulata.toFixed(2)}, calcolata ${calcolata}`);
  B.impostaCaso(null);
});

test('di serie il banco vince un po\', e il blackjack pagato di piu\' rende di piu\'', () => {
  assert.equal(G.resaBlackjack(250), 97.6);
  assert.ok(G.resaBlackjack(200) < G.resaBlackjack(250) && G.resaBlackjack(250) < G.resaBlackjack(300));
  assert.ok(G.resaBlackjack(300) <= 100, 'anche a 2 a 1, giocando al meglio, il banco non perde');
});

test('la strategia che esce dal calcolo e\' quella che si insegna', () => {
  const d = G.strategiaBlackjack();
  assert.equal(d(12, false, 2), 'carta');
  assert.equal(d(12, false, 4), 'stai');
  assert.equal(d(16, false, 10), 'carta');
  assert.equal(d(17, false, 10), 'stai');
  assert.equal(d(8, true, 9), 'carta', 'diciotto morbido contro il nove si pesca');
  assert.equal(d(8, true, 8), 'stai');
});

test('la puntata esce subito, sta nel database, e torna dopo un riavvio', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.parse('2026-09-23T21:00:00Z') });
  canale('j1', {}, { anna: 500 });
  B.impostaCaso(carte(10, 7, 9, 8));
  const s = scena('j1');
  s.scrivi('anna', '!bj 100');
  assert.match(s.detti.at(-1), /anna punta 100: hai 10. 7. \(17\), il banco mostra 9. e una coperta/);
  assert.equal(points.get('j1', 'anna'), 400, 'la puntata esce subito');
  assert.deepEqual(statoVivo.leggi('j1', 'bj-mani'), { anna: 100 });
  assert.deepEqual(B.rimborsaDopoRiavvio(), [{ channel: 'j1', chi: 'anna', posta: 100 }]);
  assert.equal(points.get('j1', 'anna'), 500, 'dopo un riavvio torna');
  assert.equal(statoVivo.leggi('j1', 'bj-mani'), null);
  assert.equal(B.testoRimborso({ channel: 'j1', chi: 'anna', posta: 100 }),
    '🃏 @anna, il bot si è riavviato mentre avevi una mano di blackjack aperta: la puntata di 100 monete è tornata a te.',
    'e chi l\'aveva aperta lo viene a sapere');
});

test('le regole del tavolo: blackjack, sballo, banco, pari, e chi non decide sta', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.parse('2026-09-23T21:00:00Z') });
  canale('j2', { tempo: 60 }, { anna: 1000, bruno: 1000, carla: 1000, dario: 1000, elena: 1000 });
  const s = scena('j2');
  B.impostaCaso(carte(1, 13, 9, 8));
  s.scrivi('anna', '!bj 100');
  assert.match(s.detti.at(-1), /Blackjack servito! Ti tornano 250 monete: la puntata più 150\. Ora ne hai 1150\./);
  assert.equal(points.get('j2', 'anna'), 1150, '3 a 2');
  B.impostaCaso(carte(10, 9, 1, 12));
  s.scrivi('bruno', '!bj 100');
  assert.match(s.detti.at(-1), /Il banco ha blackjack\. La puntata va al banco\. Ora ne hai 900\./);
  B.impostaCaso(carte(10, 6, 9, 8, 6));
  s.scrivi('carla', '!bj 100');
  s.scrivi('carla', '!carta');
  assert.match(s.detti.at(-1), /10. 6. 6. = 22: sballi\. La puntata va al banco\. Ora ne hai 900\./);
  B.impostaCaso(carte(10, 8, 10, 6, 13));
  s.scrivi('dario', '!bj 100');
  s.scrivi('dario', '!stai');
  assert.match(s.detti.at(-1), /Stai a 18; il banco 10. 6. K. = 26, e sballa: hai vinto! Ti tornano 200 monete: la puntata più 100\. Ora ne hai 1100\./,
    'quello che torna, cosa c\'e\' dentro e quanto resta: il conto si rifa\' da soli');
  assert.equal(points.get('j2', 'dario'), 1100);
  B.impostaCaso(carte(10, 8, 10, 8));
  s.scrivi('elena', '!bj 100');
  t.mock.timers.tick(60_000);
  assert.match(s.detti.at(-1), /Tempo scaduto, stai a 18; il banco 10. 8. = 18: pari\. Ti torna la puntata\. Ora ne hai 1000\./, 'dopo il tempo si sta da soli');
  assert.equal(points.get('j2', 'elena'), 1000);
  assert.deepEqual([points.get('j2', 'carla'), points.get('j2', 'dario')], [900, 1100], 'una mano chiusa non si richiude allo scadere del suo tempo');
  assert.deepEqual(statoVivo.leggi('j2', 'bj-mani'), null, 'nessuna mano resta aperta');
});

test('una mano alla volta, e senza mano !carta lo dice', () => {
  canale('j3', { massimo: 200 }, { anna: 100 });
  const s = scena('j3');
  s.scrivi('anna', '!carta');
  assert.match(s.detti.at(-1), /Non hai una mano aperta: !blackjack 50/);
  s.scrivi('anna', '!bj');
  assert.match(s.detti.at(-1), /Si gioca così: !blackjack 50/);
  s.scrivi('anna', '!bj 300');
  assert.match(s.detti.at(-1), /al massimo 200/);
  s.scrivi('anna', '!bj 150');
  assert.match(s.detti.at(-1), /Per puntarne 150 non bastano: di monete ne hai 100\./);
  B.impostaCaso(carte(10, 7, 9, 8));
  s.scrivi('anna', '!bj 50');
  s.scrivi('anna', '!21 10');
  assert.match(s.detti.at(-1), /Hai già una mano aperta/);
  assert.equal(points.get('j3', 'anna'), 50);
  B.impostaCaso(null);
});

test('si punta tutto quello che si ha, e fino al massimo compreso', () => {
  canale('j4', { massimo: 200 }, { anna: 120, bruno: 500 });
  const s = scena('j4');
  B.impostaCaso(carte(10, 7, 9, 8));
  s.scrivi('anna', '!bj 120');
  assert.equal(points.get('j4', 'anna'), 0, 'tutto il saldo si può puntare');
  B.impostaCaso(carte(10, 7, 9, 8));
  s.scrivi('bruno', '!bj 200');
  assert.equal(points.get('j4', 'bruno'), 300, 'il massimo si può puntare');
  B.impostaCaso(null);
});

test('blackjack tutti e due: la puntata torna', () => {
  canale('j5', {}, { anna: 500 });
  const s = scena('j5');
  B.impostaCaso(carte(1, 12, 10, 1));
  s.scrivi('anna', '!bj 100');
  assert.match(s.detti.at(-1), /Blackjack tutti e due! Ti torna la puntata\. Ora ne hai 500\./);
  assert.equal(points.get('j5', 'anna'), 500);
  B.impostaCaso(null);
});

test('l\'asso vale uno o undici, e a 21 si sta da soli', () => {
  canale('j6', {}, { anna: 500 });
  const s = scena('j6');
  B.impostaCaso(carte(1, 7, 10, 7, 3));
  s.scrivi('anna', '!bj 100');
  assert.match(s.detti.at(-1), /anna punta 100: hai A. 7. \(8\/18\)/, 'col morbido si leggono tutti e due i conti');
  s.scrivi('anna', '!carta');
  assert.match(s.detti.at(-1), /Stai a 21; il banco 10. 7. = 17: hai vinto! Ti tornano 200 monete: la puntata più 100\./);
  assert.equal(B.manoDi('j6', 'anna'), null);
  B.impostaCaso(null);
});

test('il tempo per decidere riparte a ogni carta', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.parse('2026-09-23T21:00:00Z') });
  canale('j7', { tempo: 60 }, { anna: 500 });
  const s = scena('j7');
  B.impostaCaso(carte(2, 3, 10, 7, 2));
  s.scrivi('anna', '!bj 100');
  t.mock.timers.tick(50_000);
  s.scrivi('anna', '!carta');
  t.mock.timers.tick(50_000);
  assert.ok(B.manoDi('j7', 'anna'), 'cento secondi dal via, ma cinquanta dall\'ultima carta');
  t.mock.timers.tick(10_000);
  assert.equal(B.manoDi('j7', 'anna'), null);
  B.impostaCaso(null);
});

test('dopo una mano si aspetta, dopo un errore no', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.parse('2026-09-23T21:00:00Z') });
  canale('j8', { attesaTesta: 30 }, { anna: 500 });
  const s = scena('j8');
  s.scrivi('anna', '!bj tanto');
  B.impostaCaso(carte(1, 13, 9, 8));
  s.scrivi('anna', '!bj 100');
  assert.match(s.detti.at(-1), /Blackjack servito!/, 'lo sbaglio non fa aspettare');
  s.scrivi('anna', '!bj 100');
  assert.match(s.detti.at(-1), /⏳ anna, !blackjack di nuovo fra 30 secondi/);
  t.mock.timers.tick(30_000);
  B.impostaCaso(carte(1, 13, 9, 8));
  s.scrivi('anna', '!bj 100');
  assert.match(s.detti.at(-1), /Blackjack servito!/);
  B.impostaCaso(null);
});

test('la simulazione segue le regole del tavolo: a 21 si sta anche chi vorrebbe un\'altra carta', () => {
  const coda = [10, 5, 10, 7, 6, 10].map((g) => ({ grado: g, valore: Math.min(g, 10) }));
  const pesca = () => coda.shift();
  assert.equal(B.simulaMano(() => 'carta', 250, 100, pesca), 100, '10 5 6 fa 21 e sta; il banco 17 perde');
});
