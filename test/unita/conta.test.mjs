// CONTA INSIEME: tocca al numero dopo, mai due di fila la stessa persona, e chi
// sbaglia fa ricominciare. Il record resta.
//
// Si prova la regola, il record che sopravvive (sta nel database), la chiusura
// da sola quando nessuno conta, e che conta e manche non si pestano i numeri.
// Il ragionamento sta in docs/GIOCHI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('conta-');
const { streamers } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const K = await import('../../src/features/conta.js');
test.after(() => casa.pulisci());

const T0 = Date.parse('2026-09-23T21:00:00Z');
function canale(ch, conta = {}) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { giochiConf: { conta } });
}
function scena(ch) {
  const detti = [];
  const scrivi = (user, text) => games.tryGame({ channel: ch, user, text }, (t) => detti.push(t));
  return { detti, scrivi };
}

test('si conta uno alla volta, alternandosi; il numero sbagliato fa ricominciare', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k1');
  const s = scena('k1');
  s.scrivi('anna', '!conta');
  assert.match(s.detti.at(-1), /Contiamo insieme!.*Record del canale: 0\./);
  const n = s.detti.length;
  s.scrivi('anna', '1');
  s.scrivi('bruno', '2');
  s.scrivi('anna', '3');
  assert.equal(s.detti.length, n, 'mentre si conta giusto il bot tace');
  assert.equal(K.contaInCorso('k1').n, 3);
  s.scrivi('bruno', '5');
  assert.equal(s.detti.at(-1), '💥 bruno ha scritto 5, ma toccava 4. Si ricomincia da 1: eravate arrivati a 3. Record del canale: 3.');
  assert.equal(K.contaInCorso('k1').n, 0);
  s.scrivi('bruno', '1');
  s.scrivi('bruno', '2');
  assert.equal(s.detti.at(-1), '💥 bruno ha contato due volte di fila. Si ricomincia da 1: eravate arrivati a 1. Record del canale: 3.');
  s.scrivi('anna', 'ciao a tutti');
  s.scrivi('anna', 'il 5 è bello');
  s.scrivi('anna', '1');
  s.scrivi('carla', 'e 2 anche');
  assert.equal(K.contaInCorso('k1').n, 1, 'le chiacchiere, anche con un numero dentro, non sono numeri');
});

test('il record si annuncia una volta quando lo si supera, e resta nel database', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k2', { traguardo: 0 });
  const s = scena('k2');
  s.scrivi('anna', '!conta');
  for (let i = 1; i <= 4; i++) s.scrivi(i % 2 ? 'anna' : 'bruno', String(i));
  assert.equal(K.recordConta('k2'), 4);
  s.scrivi('anna', '9');
  const n = s.detti.length;
  for (let i = 1; i <= 6; i++) s.scrivi(i % 2 ? 'carla' : 'dario', String(i));
  assert.deepEqual(s.detti.slice(n), ['🏆 Nuovo record del canale: 5! Avanti!'], 'annunciato una volta, al primo numero oltre');
  assert.equal(K.recordConta('k2'), 6);
});

test('ogni traguardo il bot applaude; senza traguardo no', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k3', { traguardo: 3 });
  const s = scena('k3');
  s.scrivi('anna', '!conta');
  for (let i = 1; i <= 3; i++) s.scrivi(i % 2 ? 'anna' : 'bruno', String(i));
  assert.equal(s.detti.at(-1), '🔢 3! Avanti così.');
});

test('se nessuno conta per la pausa scelta, la conta si chiude da sola', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k4', { pausa: 60 });
  const s = scena('k4');
  s.scrivi('anna', '!conta');
  s.scrivi('anna', '1');
  t.mock.timers.tick(59_999);
  assert.ok(K.contaInCorso('k4'));
  t.mock.timers.tick(1);
  assert.equal(K.contaInCorso('k4'), null);
  assert.match(s.detti.at(-1), /Conta finita: ultimo numero 1\./);
  s.scrivi('bruno', '2');
  assert.equal(K.contaInCorso('k4'), null, 'a conta chiusa i numeri tornano numeri');
});

test('finché si conta la conta resta aperta', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k7', { pausa: 60 });
  const s = scena('k7');
  s.scrivi('anna', '!conta');
  for (let i = 1; i <= 4; i++) { t.mock.timers.tick(50_000); s.scrivi(i % 2 ? 'anna' : 'bruno', String(i)); }
  assert.equal(K.contaInCorso('k7').n, 4, 'duecento secondi, ma mai sessanta di silenzio');
});

test('conta e manche non si pestano i numeri', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('k5');
  const s = scena('k5');
  s.scrivi('anna', '!conta');
  assert.equal(games.avviaManche('k5', (x) => s.detti.push(x), 'calcolo'), false, 'mentre si conta, niente manche');
  s.scrivi('anna', '!conta');
  assert.match(s.detti.at(-1), /Si sta già contando: tocca a 1/);
  canale('k6');
  const u = scena('k6');
  assert.equal(games.avviaManche('k6', (x) => u.detti.push(x), 'calcolo'), true);
  u.scrivi('anna', '!conta');
  assert.match(u.detti.at(-1), /C'è una manche in corso/);
  assert.equal(K.contaInCorso('k6'), null);
});
