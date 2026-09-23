// ABBRACCI, BACINI E IL BATTI IL CINQUE.
//
// Il cinque sta in chat: uno alza la mano, un altro la batte, e ogni tanto a
// sorpresa viene perfetto. Chi non risponde lascia l'altro con la mano alzata.
// Si prova con l'orologio finto e con la sorte fissata dalle regole (0 o 100
// volte su cento). Il ragionamento sta in docs/COCCOLE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('coccole-');
const { streamers } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const C = await import('../../src/features/coccole.js');
const G = await import('../../src/features/giochi-conf.js');
test.after(() => casa.pulisci());

const T0 = Date.parse('2026-09-23T21:00:00Z');
function canale(ch, persone, cinque = {}) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { giochiConf: { cinque } });
  for (const p of persone) games.segnaPresenza(ch, p);
}
function scena(ch) {
  const detti = [];
  const scrivi = (user, text) => games.tryGame({ channel: ch, user, text }, (t) => detti.push(t));
  return { detti, scrivi };
}
const PERFETTO = /cinque perfetto|SCHIOCCO PERFETTO|: perfetto!/;
const NORMALE = /battono il cinque|Cinque fra/;

test('il cinque perfetto e\' un tiro a sorte, con la probabilita\' delle regole', () => {
  const c = G.valoriDi({}, 'cinque');
  assert.equal(c.perfetti, 20);
  assert.equal(C.cinquePerfetto(c, () => 0.199), true);
  assert.equal(C.cinquePerfetto(c, () => 0.2), false);
  assert.equal(C.cinquePerfetto({ perfetti: 0 }, () => 0), false, 'zero e\' mai');
  assert.equal(C.cinquePerfetto({ perfetti: 100 }, () => 0.9999), true, 'cento e\' sempre');
});

for (const [perfetti, frase, altra] of [[100, PERFETTO, NORMALE], [0, NORMALE, PERFETTO]]) {
  test(`con ${perfetti} su cento il cinque viene ${perfetti ? 'sempre perfetto' : 'sempre normale'}, subito o dopo`, (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
    const ch = 'c-p' + perfetti;
    canale(ch, ['anna', 'bruno'], { perfetti });
    const s = scena(ch);
    for (const attesa of [0, 25_000]) {
      s.scrivi('anna', '!cinque @bruno');
      assert.match(s.detti.at(-1), /anna alza la mano per @bruno/);
      t.mock.timers.tick(attesa);
      s.scrivi('bruno', '!cinque');
      assert.match(s.detti.at(-1), frase, `dopo ${attesa / 1000}s`);
      assert.doesNotMatch(s.detti.at(-1), altra);
      assert.deepEqual(C.maniAlzate(ch), [], 'la mano battuta si abbassa');
      const detti = s.detti.length;
      t.mock.timers.tick(60_000);
      assert.equal(s.detti.length, detti, 'e la mano battuta non resta poi a mezz\'aria');
    }
  });
}

test('chi non risponde lascia la mano alzata', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('c-sospeso', ['anna', 'bruno']);
  const s = scena('c-sospeso');
  s.scrivi('anna', '!cinque @bruno');
  t.mock.timers.tick(29_999);
  assert.equal(C.maniAlzate('c-sospeso').length, 1);
  t.mock.timers.tick(1);
  assert.match(s.detti.at(-1), /anna resta con la mano alzata|mano di anna resta a mezz'aria/);
  assert.deepEqual(C.maniAlzate('c-sospeso'), []);
});

test('la mano alzata per tutti la batte il primo; quella per qualcuno solo lui', () => {
  canale('c-tutti', ['anna', 'bruno', 'carla', 'dario']);
  const s = scena('c-tutti');
  s.scrivi('anna', '!cinque');
  assert.match(s.detti.at(-1), /chi batte il cinque/);
  s.scrivi('anna', '!cinque');
  assert.match(s.detti.at(-1), /hai già la mano alzata/, 'la propria mano non si batte');
  s.scrivi('carla', '!cinque');
  assert.match(s.detti.at(-1), /anna.*carla|carla.*anna/, 'carla batte la mano di anna');
  assert.deepEqual(C.maniAlzate('c-tutti'), []);
  s.scrivi('bruno', '!cinque @dario');
  assert.deepEqual(C.maniAlzate('c-tutti'), [{ chi: 'bruno', per: 'dario' }]);
  s.scrivi('carla', '!cinque');
  assert.deepEqual(C.maniAlzate('c-tutti').map((m) => m.chi).sort(), ['bruno', 'carla'], 'la mano per dario non la batte carla: carla alza la sua');
  s.scrivi('carla', '!cinque @bruno');
  assert.match(s.detti.at(-1), /carla, hai già la mano alzata/, 'nemmeno chiamandolo per nome: carla resta con la sua');
  assert.deepEqual(C.maniAlzate('c-tutti').find((m) => m.chi === 'bruno'), { chi: 'bruno', per: 'dario' });
  s.scrivi('dario', '!cinque @bruno');
  assert.match(s.detti.at(-1), /bruno.*dario/);
  assert.deepEqual(C.maniAlzate('c-tutti').map((m) => m.chi), ['carla']);
});

test('dopo un cinque, la stessa persona rialza la mano solo dopo l\'attesa', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('c-attesa', ['anna', 'bruno']);
  const s = scena('c-attesa');
  s.scrivi('anna', '!cinque');
  s.scrivi('bruno', '!cinque');
  s.scrivi('anna', '!cinque');
  assert.deepEqual(C.maniAlzate('c-attesa'), [], 'cinque secondi fra due mani alzate');
  t.mock.timers.tick(5000);
  s.scrivi('anna', '!cinque');
  assert.deepEqual(C.maniAlzate('c-attesa'), [{ chi: 'anna', per: '' }]);
});

test('una mano rialzata dopo un cinque ha il suo mezzo minuto intero', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('c-rialza', ['anna', 'bruno']);
  const s = scena('c-rialza');
  s.scrivi('anna', '!cinque');
  t.mock.timers.tick(2000);
  s.scrivi('bruno', '!cinque');
  t.mock.timers.tick(5000);
  s.scrivi('anna', '!cinque');
  t.mock.timers.tick(25_000);
  assert.equal(C.maniAlzate('c-rialza').length, 1, 'la mano di prima non abbassa questa');
  t.mock.timers.tick(5000);
  assert.deepEqual(C.maniAlzate('c-rialza'), []);
});

test('abbracci e bacini: a chi c\'e\', a tutta la chat, a se stessi', () => {
  canale('c-abb', ['anna', 'bruno']);
  const s = scena('c-abb');
  s.scrivi('anna', '!abbraccio @bruno');
  assert.ok(/anna/.test(s.detti.at(-1)) && /bruno/.test(s.detti.at(-1)));
  s.scrivi('bruno', '!bacio @fantasma');
  assert.match(s.detti.at(-1), /@fantasma non è in chat/);
  s.scrivi('bruno', '!abbraccio');
  assert.match(s.detti.at(-1), /bruno .*(tutta la chat|collettivo)/);
  const prima = s.detti.length;
  s.scrivi('bruno', '!abbraccio @anna');
  assert.equal(s.detti.length, prima, 'dieci secondi fra un abbraccio e l\'altro');
  s.scrivi('anna', '!bacio @anna');
  assert.match(s.detti.at(-1), /specchio/);
});

test('chi scrive !nococcole non riceve abbracci, bacini ne\' cinque, finche\' non lo riscrive', () => {
  canale('c-no', ['anna', 'bruno']);
  const s = scena('c-no');
  s.scrivi('bruno', '!nococcole');
  assert.match(s.detti.at(-1), /niente abbracci, bacini e cinque/);
  for (const cmd of ['!abbraccio @bruno', '!bacio @bruno', '!cinque @bruno']) {
    games.tryGame({ channel: 'c-no', user: 'anna' + cmd.length, text: cmd }, (t) => s.detti.push(t));
    assert.match(s.detti.at(-1), /preferisce niente coccole/, cmd);
  }
  s.scrivi('bruno', '!nococcole');
  assert.match(s.detti.at(-1), /coccole di nuovo accese/);
  s.scrivi('anna', '!abbraccio @bruno');
  assert.ok(/bruno/.test(s.detti.at(-1)) && !/preferisce/.test(s.detti.at(-1)));
});

test('il cinque sta in chat: l\'overlay e i suoni non ne sanno niente', () => {
  const OV = readFileSync(new URL('../../src/web/public/overlay-app.js', import.meta.url), 'utf8');
  const HTML = readFileSync(new URL('../../src/web/public/overlay.html', import.meta.url), 'utf8');
  const PR = readFileSync(new URL('../../src/web/public/presets.js', import.meta.url), 'utf8');
  for (const [nome, testo] of [['overlay-app.js', OV], ['overlay.html', HTML], ['presets.js', PR]]) assert.doesNotMatch(testo, /cinque|schiocco/i, nome);
});
