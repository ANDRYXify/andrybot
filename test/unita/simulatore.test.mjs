// IL SIMULATORE: smettere di tarare a naso.
//
// Ogni soglia dello scudo era stata scelta guardando un conto e ragionandoci
// sopra. Va bene per una soglia; per dieci, che si influenzano a vicenda, serve
// un numero — e il numero si ottiene solo con un attacco di cui si sa già la
// risposta.
//
// Qui girano gli scenari che devono restare verdi. Quelli lenti e quelli
// dichiaratamente incompleti stanno in `node scripts/simula.mjs`.
//
// Il modello sta in docs/SIMULATORE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('simulatore-');
const { streamers } = await import('../../src/db.js');
const S = await import('../../src/features/simulatore.js');
test.after(() => casa.pulisci());

const CANALE = 'prova';
streamers.upsertApproved(CANALE, 'Prova', '1');
streamers.setEnabled(CANALE, true);
streamers.setSettings(CANALE, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10, rafficaSecondi: 30 } });

test('gli scenari sono uguali a sé stessi: nessun dado vero', () => {
  const a = S.scenario('ondata-veloce');
  const b = S.scenario('ondata-veloce');
  assert.deepEqual(a.eventi.map((e) => e.ts), b.eventi.map((e) => e.ts),
    'due giri dello stesso attacco devono dare esattamente la stessa cosa, sennò non si confronta niente');
});

test('un\'ondata di macchine viene presa tutta', async () => {
  const m = await S.provaScenario('ondata-veloce', { canale: CANALE });
  assert.equal(m.falsiPositivi, 0);
  assert.ok(m.richiamo >= 100, `richiamo ${m.richiamo}%`);
  assert.ok(m.haVistoAttacco);
  assert.ok(m.msPerVederlo < 1000, `ci ha messo ${m.msPerVederlo}ms`);
});

test('una clip andata bene non fa perdere nessuno', async () => {
  const m = await S.provaScenario('clip-virale', { canale: CANALE });
  assert.equal(m.falsiPositivi, 0, `colpite: ${m.sbagliati.join(', ')}`);
});

test('una chat che chiacchiera forte non è un coro', async () => {
  // Prima era: «io stavo per morire» ha diciannove caratteri, e trenta persone
  // che la scrivono insieme finivano dentro. Sette su trenta, misurato.
  const m = await S.provaScenario('chat-viva', { canale: CANALE });
  assert.equal(m.falsiPositivi, 0, `colpite: ${m.sbagliati.join(', ')}`);
  assert.equal(m.haVistoAttacco, false);
});

test('trecento persone arrivate da un raid vero non si toccano', async () => {
  // È lo scenario che è costato di più: col solo conteggio delle bocche ne
  // finivano dentro novanta su trecento. Twitch dice che è un raid, e da lì il
  // coro si giudica sulla cadenza — le persone scrivono a caso, le macchine a
  // passo — come già si fa per i follow.
  const m = await S.provaScenario('raid-vero', { canale: CANALE });
  assert.equal(m.falsiPositivi, 0, `colpite: ${m.sbagliati.join(', ')}`);
});

test('un coro vero invece si prende', async () => {
  const m = await S.provaScenario('coro', { canale: CANALE });
  assert.equal(m.falsiPositivi, 0);
  assert.ok(m.richiamo >= 92, `richiamo ${m.richiamo}%`);
  assert.ok(m.haVistoAttacco);
});

test('e i numeri si confrontano con quelli di ieri, non col cielo', async () => {
  // Un'attesa scritta è una riga da cui si riparte: se un numero scende, la
  // regressione si vede il giorno che succede invece che dopo.
  const m = await S.provaScenario('clip-virale', { canale: CANALE });
  assert.equal(m.passa, true);
  const finto = S.contro({ precisione: 40, richiamo: 100, haVistoAttacco: true }, S.ATTESE['clip-virale']);
  assert.equal(finto.passa, false);
  assert.match(finto.perche, /precisione/);
});
