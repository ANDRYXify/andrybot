// LA CATENA DI PAROLE: conta solo la mossa, si rompe con una parola gia'
// detta o con due di fila della stessa persona, e il record resta. E un gioco
// che legge la chat alla volta, fra manche, conta e catena.
//
// Il ragionamento sta in docs/GIOCHI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('catena-');
const { streamers } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const K = await import('../../src/features/catena.js');
const C = await import('../../src/features/conta.js');
test.after(() => { K.impostaCaso(null); casa.pulisci(); });

const T0 = Date.parse('2026-09-23T21:00:00Z');
function canale(ch, catena = {}, altri = {}) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { giochiConf: { catena, ...altri } });
}
function scena(ch) {
  const detti = [];
  const scrivi = (user, text) => games.tryGame({ channel: ch, user, text }, (t) => detti.push(t));
  return { detti, scrivi };
}

test('una parola e\' una parola sola di lettere, senza accenti ne\' punto in fondo', () => {
  assert.equal(K.parolaDi('Città!'), 'citta');
  assert.equal(K.parolaDi('  Sasso? '), 'sasso');
  assert.equal(K.parolaDi('ciao a tutti'), '');
  assert.equal(K.parolaDi('re'), '', 'almeno tre lettere');
  assert.equal(K.parolaDi('x'.repeat(25)), '', 'al piu\' ventiquattro');
  assert.equal(K.parolaDi('ok123'), '');
});

test('conta solo la mossa: le chiacchiere non toccano la catena', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k1');
  K.impostaCaso(() => 0);
  const s = scena('k1');
  s.scrivi('anna', '!catena');
  assert.equal(s.detti.at(-1), '🔗 Catena di parole! Si parte da CASA: la prossima comincia con SA. Una parola a messaggio, mai due di fila la stessa persona, mai una già detta. Record del canale: 0.');
  const n = s.detti.length;
  s.scrivi('bruno', 'sasso');
  s.scrivi('anna', 'ciao');
  s.scrivi('anna', 'salve a tutti');
  s.scrivi('carla', 'Sole!');
  s.scrivi('anna', 'bravissimi');
  assert.equal(s.detti.length, n, 'mentre la catena va il bot tace');
  assert.deepEqual(K.catenaInCorso('k1'), { parola: 'sole', n: 2, ultimo: 'carla', record: 2 });
});

test('si rompe con due parole di fila della stessa persona, o con una gia\' detta', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k2', { inizio: ['luna'] });
  const s = scena('k2');
  s.scrivi('anna', '!catena');
  s.scrivi('anna', 'nave');
  s.scrivi('anna', 'vento');
  assert.equal(s.detti.at(-1), '💥 anna ha scritto due parole di fila. La catena era a 1: si riparte da LUNA, la prossima comincia con NA. Record del canale: 1.');
  s.scrivi('anna', 'nave');
  assert.equal(K.catenaInCorso('k2').n, 1, 'chi ha rotto la catena puo\' aprire la nuova');
  s.scrivi('carla', 'velluto');
  s.scrivi('anna', 'tonno');
  s.scrivi('bruno', 'nonna');
  s.scrivi('carla', 'nave');
  assert.equal(s.detti.at(-1), '💥 NAVE era già stata detta. La catena era a 4: si riparte da LUNA, la prossima comincia con NA. Record del canale: 4.');
  s.scrivi('carla', 'luna');
  assert.equal(K.catenaInCorso('k2').n, 0, 'la parola di partenza conta come gia\' detta, ma non e\' una mossa: non comincia con NA');
  s.scrivi('carla', 'naso');
  s.scrivi('anna', 'sole');
  s.scrivi('bruno', 'leva');
  s.scrivi('carla', 'Varietà');
  s.scrivi('anna', 'tana');
  assert.equal(K.catenaInCorso('k2').n, 5, 'gli accenti non contano: dopo varietà tocca a TA');
});

test('il record si annuncia una volta, al primo passo oltre, e resta nel database', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k3', { inizio: ['sole'], traguardo: 0 });
  const s = scena('k3');
  s.scrivi('anna', '!catena');
  s.scrivi('anna', 'leone');
  s.scrivi('bruno', 'neve');
  assert.equal(K.recordCatena('k3'), 2);
  s.scrivi('bruno', 'vela');
  const n = s.detti.length;
  s.scrivi('anna', 'leone');
  s.scrivi('bruno', 'nebbia');
  s.scrivi('anna', 'iato');
  s.scrivi('bruno', 'topo');
  assert.deepEqual(s.detti.slice(n), ['🏆 Nuovo record del canale: 3 parole! Avanti con TO!'], 'annunciato una volta, al primo passo oltre');
  assert.equal(K.recordCatena('k3'), 4);
});

test('ogni traguardo il bot applaude e dice le due lettere', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k4', { inizio: ['sole'], traguardo: 2 });
  const s = scena('k4');
  s.scrivi('anna', '!catena');
  s.scrivi('anna', 'leone');
  s.scrivi('bruno', 'neve');
  assert.equal(s.detti.at(-1), '🔗 2 parole! Adesso tocca a VE.');
});

test('se nessuno trova la parola per la pausa scelta, la catena si chiude', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k5', { inizio: ['sole'], pausa: 30 });
  const s = scena('k5');
  s.scrivi('anna', '!catena');
  t.mock.timers.tick(20_000);
  s.scrivi('anna', 'leone');
  t.mock.timers.tick(20_000);
  s.scrivi('anna', 'ciao');
  t.mock.timers.tick(9_999);
  assert.ok(K.catenaInCorso('k5'), 'la mossa rimette la pausa da capo, la chiacchiera no');
  t.mock.timers.tick(1);
  assert.equal(K.catenaInCorso('k5'), null);
  assert.equal(s.detti.at(-1), '🔗 Catena finita: una parola, l\'ultima LEONE. Record del canale: 1.');
});

test('le parole di partenza sono quelle scelte, e senza una buona restano quelle di serie', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  K.impostaCaso(() => 0);
  canale('k6', { inizio: ['Élite'] });
  const s = scena('k6');
  s.scrivi('anna', '!catena');
  assert.match(s.detti.at(-1), /Si parte da ELITE: la prossima comincia con TE\./);
  canale('k7', { inizio: ['a b', '12'] });
  const u = scena('k7');
  u.scrivi('anna', '!catena');
  assert.match(u.detti.at(-1), /Si parte da CASA:/);
});

test('un gioco che legge la chat alla volta: manche, conta e catena', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k8', { inizio: ['sole'] });
  const s = scena('k8');
  s.scrivi('anna', '!catena');
  assert.equal(games.chiLeggeLaChat('k8'), 'catena');
  s.scrivi('bruno', '!conta');
  assert.equal(s.detti.at(-1), '🔢 C\'è una catena di parole in corso: si conta quando finisce.');
  s.scrivi('bruno', '!trivia');
  assert.equal(s.detti.at(-1), '🧠 C\'è una catena di parole in corso: la domanda quando finisce.');
  s.scrivi('bruno', '!manche');
  assert.equal(s.detti.at(-1), '🎮 C\'è una catena di parole in corso: la manche quando finisce.');
  assert.equal(games.avviaManche('k8', () => {}), false, 'neanche la manche automatica');
  s.scrivi('bruno', '!catena');
  assert.equal(s.detti.at(-1), '🔗 La catena è già aperta: l\'ultima parola è SOLE, la prossima comincia con LE.');
  canale('k9');
  const u = scena('k9');
  u.scrivi('anna', '!conta');
  u.scrivi('bruno', '!catena');
  assert.equal(u.detti.at(-1), '🔗 Si sta contando insieme: la catena quando finisce.');
  u.scrivi('bruno', '!trivia');
  assert.equal(u.detti.at(-1), '🧠 Si sta contando insieme: la domanda quando finisce.');
  assert.ok(C.contaInCorso('k9'));
  canale('k10');
  const v = scena('k10');
  assert.equal(games.avviaManche('k10', (x) => v.detti.push(x), 'calcolo'), true);
  v.scrivi('anna', '!catena');
  assert.equal(v.detti.at(-1), '🔗 C\'è una manche in corso: la catena quando finisce.');
  assert.equal(K.catenaInCorso('k10'), null);
});

test('!trivia rifiutata mentre si conta non fa partire l\'attesa', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k11', {}, { manche: { attesaTutti: 600 }, conta: { pausa: 30 } });
  const s = scena('k11');
  s.scrivi('anna', '!conta');
  s.scrivi('bruno', '!trivia');
  t.mock.timers.tick(30_000);
  assert.equal(C.contaInCorso('k11'), null, 'la conta si chiude da sola');
  s.scrivi('bruno', '!trivia');
  assert.doesNotMatch(s.detti.at(-1), /⏳/, 'la domanda di prima non era partita: niente attesa');
});

test('la parola di partenza conta come gia\' detta', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k12', { inizio: ['tonto'] });
  const s = scena('k12');
  s.scrivi('anna', '!catena');
  s.scrivi('bruno', 'tonto');
  assert.match(s.detti.at(-1), /^💥 TONTO era già stata detta\. La catena era a 0/);
});

test('aprire una catena fa partire l\'attesa', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k13', { inizio: ['sole'], pausa: 20, attesaTutti: 60 });
  const s = scena('k13');
  s.scrivi('anna', '!catena');
  t.mock.timers.tick(20_000);
  assert.equal(K.catenaInCorso('k13'), null);
  s.scrivi('bruno', '!catena');
  assert.match(s.detti.at(-1), /^⏳ !catena di nuovo fra 40 secondi/);
  t.mock.timers.tick(40_000);
  s.scrivi('bruno', '!catena');
  assert.match(s.detti.at(-1), /^🔗 Catena di parole!/);
});
