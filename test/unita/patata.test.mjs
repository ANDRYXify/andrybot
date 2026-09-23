// LA PATATA BOLLENTE: la miccia si decide al lancio, si passa solo a una
// persona in chat, e la multa la paga solo chi gioca.
//
// Il ragionamento sta in docs/GIOCHI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('patata-');
const { streamers, points } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const P = await import('../../src/features/patata.js');
const R = await import('../../src/features/comandi-registro.js');
test.after(() => { P.impostaCaso(null); casa.pulisci(); });

const T0 = Date.parse('2026-09-23T21:00:00Z');
function canale(ch, patata = {}, presenti = []) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { giochiConf: { patata } });
  for (const u of presenti) games.accredita({ channel: ch, user: u, text: 'ciao' });
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

test('la miccia si decide al lancio, fra il minimo e il massimo, e passarla non la cambia', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('p1', { miccia: 30, micciaMax: 90 }, ['anna', 'bruno']);
  const s = scena('p1');
  P.impostaCaso(() => 0.5);
  s.scrivi('anna', '!patata');
  assert.match(s.detti.at(-1), /^🥔 anna lancia la patata bollente e ce l'ha in mano! !passa @nome per passarla, o !passa e va a qualcuno a caso, prima che scoppi\.$/);
  s.scrivi('bruno', '!patata');
  assert.equal(s.detti.at(-1), '🥔 La patata ce l\'ha già anna: !passa @nome, e in fretta.');
  t.mock.timers.tick(40_000);
  s.scrivi('anna', '!passa @bruno');
  assert.equal(s.detti.at(-1), '🥔 anna → bruno! Scotta, passala!');
  t.mock.timers.tick(19_999);
  assert.ok(P.patataInCorso('p1'), 'trenta più metà di sessanta: scoppia a 60 secondi, non prima');
  t.mock.timers.tick(1);
  assert.equal(P.patataInCorso('p1'), null);
  assert.equal(s.detti.at(-1), '💥 BOOM! La patata scoppia fra le mani di bruno, dopo un passaggio.');
  P.impostaCaso(null);
});

test('minimo e massimo scambiati vanno bene lo stesso', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('p2', { miccia: 90, micciaMax: 30 }, ['anna']);
  const s = scena('p2');
  P.impostaCaso(() => 0.5);
  s.scrivi('anna', '!patata');
  t.mock.timers.tick(59_999);
  assert.ok(P.patataInCorso('p2'), 'fra 30 e 90, a metà: 60 secondi');
  t.mock.timers.tick(1);
  assert.equal(s.detti.at(-1), '💥 BOOM! La patata scoppia fra le mani di anna, senza che nessuno la passasse.');
  P.impostaCaso(null);
});

test('si passa solo a una persona in chat, e solo se ce l\'hai tu', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('p3', {}, ['anna', 'bruno', 'nightbot']);
  const s = scena('p3');
  s.scrivi('anna', '!passa @bruno');
  assert.equal(s.detti.at(-1), '🥔 Nessuna patata in giro: !patata per lanciarne una.');
  s.scrivi('anna', '!potato');
  s.scrivi('bruno', '!passa @anna');
  assert.equal(s.detti.at(-1), '🥔 bruno, la patata non ce l\'hai tu: ce l\'ha anna.');
  s.scrivi('anna', '!passa @anna');
  assert.equal(s.detti.at(-1), '🥔 A te stesso non vale: passala a qualcun altro.');
  s.scrivi('anna', '!passa @nightbot');
  assert.equal(s.detti.at(-1), '🥔 nightbot è un bot: passala a una persona.');
  s.scrivi('anna', '!passa @carla');
  assert.equal(s.detti.at(-1), '🥔 carla non è in chat adesso.');
  assert.equal(P.patataInCorso('p3').chi, 'anna', 'nessun passaggio sbagliato la sposta');
  s.scrivi('anna', '!pass @Bruno');
  assert.deepEqual(P.patataInCorso('p3'), { chi: 'bruno', da: 'anna', passaggi: 1 });
});

test('senza nome va a qualcuno a caso fra chi e\' in chat: mai a se\', mai a un bot', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('p4', {}, ['anna', 'nightbot', 'bruno', 'carla']);
  const s = scena('p4');
  s.scrivi('anna', '!patata');
  P.impostaCaso(() => 0.99);
  s.scrivi('anna', '!passa');
  assert.equal(P.patataInCorso('p4').chi, 'carla');
  P.impostaCaso(() => 0);
  s.scrivi('carla', '!passa');
  assert.equal(P.patataInCorso('p4').chi, 'anna', 'fra anna e bruno, nightbot escluso');
  canale('p5', {}, ['anna', 'nightbot']);
  const u = scena('p5');
  u.scrivi('anna', '!patata');
  u.scrivi('anna', '!passa');
  assert.equal(u.detti.at(-1), '🥔 Non c\'è nessun altro in chat a cui passarla: tienila stretta!');
  P.impostaCaso(null);
});

test('la multa la paga solo chi ha giocato, fino a quanto ha, a chi gliel\'ha passata', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('p6', { miccia: 10, micciaMax: 10, multa: 50, attesaTutti: 0 }, ['anna', 'bruno', 'carla']);
  const s = scena('p6');
  const saldo = () => ['anna', 'bruno', 'carla'].map((u) => points.get('p6', u));
  const prima = saldo();
  s.scrivi('anna', '!patata');
  t.mock.timers.tick(10_000);
  assert.equal(s.detti.at(-1), '💥 BOOM! La patata scoppia fra le mani di anna, senza che nessuno la passasse.', 'nessuno gliel\'ha passata: non c\'è a chi pagare');
  assert.deepEqual(saldo(), prima);
  s.scrivi('anna', '!patata');
  s.scrivi('anna', '!passa @bruno');
  t.mock.timers.tick(10_000);
  assert.equal(s.detti.at(-1), '💥 BOOM! La patata scoppia fra le mani di bruno, dopo un passaggio.', 'bruno non l\'aveva mai toccata: si brucia e basta');
  assert.deepEqual(saldo(), prima);
  points.add('p6', 'bruno', 30 - points.get('p6', 'bruno'));
  s.scrivi('anna', '!patata');
  s.scrivi('anna', '!passa @bruno');
  s.scrivi('bruno', '!passa @carla');
  s.scrivi('carla', '!passa @bruno');
  const qui = saldo();
  t.mock.timers.tick(10_000);
  assert.equal(s.detti.at(-1), '💥 BOOM! La patata scoppia fra le mani di bruno, dopo 3 passaggi. carla incassa 30 monete da bruno.');
  assert.deepEqual(saldo(), [qui[0], 0, qui[2] + 30], 'passano di tasca: fino a quante ne ha');
});

test('scoppiata la patata, si aspetta', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('p7', { miccia: 10, micciaMax: 10, attesaTutti: 120 }, ['anna', 'bruno']);
  const s = scena('p7');
  s.scrivi('anna', '!patata');
  t.mock.timers.tick(10_000);
  s.scrivi('bruno', '!patata');
  assert.equal(s.detti.at(-1), '🥔 La prossima patata fra 2 minuti.');
  t.mock.timers.tick(120_000);
  s.scrivi('bruno', '!patata');
  assert.match(s.detti.at(-1), /bruno lancia la patata bollente/);
});
