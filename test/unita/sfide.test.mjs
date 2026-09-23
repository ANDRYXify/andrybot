// LE SFIDE CON LA POSTA E LA MORRA: le monete passano di tasca, e si muovono
// solo quando il gioco si decide.
//
// Un duello con la posta non tiene niente da parte mentre aspetta: si
// ricontrolla chi ha le monete quando l'altro accetta. La morra, di serie, e'
// giusta: la resa del pannello e' quella dei nove esiti possibili. Il
// ragionamento sta in docs/GIOCHI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('sfide-');
const { streamers, points } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const G = await import('../../src/features/giochi-conf.js');
test.after(() => casa.pulisci());

function canale(ch, giochiConf = {}, soldi = {}) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { giochiConf });
  for (const [u, n] of Object.entries(soldi)) { points.add(ch, u, n); games.segnaPresenza(ch, u); }
}
const scrivi = (ch, user, text, detti) => games.tryGame({ channel: ch, user, text }, (t) => detti.push(t));
const totale = (ch, chi) => chi.reduce((s, u) => s + points.get(ch, u), 0);

test('duello con la posta: chi vince prende la posta dell\'altro, e il totale non cambia', () => {
  canale('s1', {}, { anna: 100, bruno: 100 });
  const detti = [];
  scrivi('s1', 'anna', '!duello @bruno 50', detti);
  assert.match(detti.at(-1), /@bruno, anna ti sfida a duello per 50/);
  assert.equal(points.get('s1', 'anna'), 100, 'in attesa non si tiene niente da parte');
  scrivi('s1', 'bruno', '!accetta', detti);
  const [a, b] = [points.get('s1', 'anna'), points.get('s1', 'bruno')];
  assert.deepEqual([a, b].sort((x, y) => x - y), [50, 150]);
  assert.equal(totale('s1', ['anna', 'bruno']), 200, 'le monete passano, non si creano');
  scrivi('s1', 'bruno', '!accetta', detti);
  assert.match(detti.at(-1), /nessuno ti ha sfidato/, 'una sfida si accetta una volta');
});

test('rifiutare o lasciar scadere non costa niente a nessuno', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.parse('2026-09-23T21:00:00Z') });
  canale('s2', { duello: { scadenza: 30 } }, { carla: 100, dario: 100 });
  const detti = [];
  scrivi('s2', 'carla', '!duello @dario 40', detti);
  scrivi('s2', 'dario', '!rifiuta', detti);
  assert.match(detti.at(-1), /dario rifiuta la sfida di carla/);
  scrivi('s2', 'carla', '!duello @dario 40', detti);
  t.mock.timers.tick(29_999);
  assert.ok(games.sfidaPer('s2', 'dario'));
  t.mock.timers.tick(1);
  assert.equal(games.sfidaPer('s2', 'dario'), null);
  assert.match(detti.at(-1), /non ha risposto: la sfida di carla è scaduta/);
  assert.deepEqual([points.get('s2', 'carla'), points.get('s2', 'dario')], [100, 100]);
});

test('le monete si ricontrollano quando l\'altro accetta', () => {
  canale('s3', {}, { elena: 60, franco: 100 });
  const detti = [];
  scrivi('s3', 'elena', '!duello @franco 50', detti);
  points.add('s3', 'elena', -30);
  scrivi('s3', 'franco', '!accetta', detti);
  assert.match(detti.at(-1), /elena non ha più 50/);
  assert.deepEqual([points.get('s3', 'elena'), points.get('s3', 'franco')], [30, 100]);
});

test('una sfida alla volta, la posta massima, e chi non ha le monete non sfida', () => {
  canale('s4', { duello: { postaMax: 30 } }, { gino: 100, ivo: 100, lea: 10 });
  const detti = [];
  scrivi('s4', 'gino', '!duello @ivo 50', detti);
  assert.match(detti.at(-1), /posta massima è 30/);
  scrivi('s4', 'gino', '!duello @ivo 30', detti);
  scrivi('s4', 'gino', '!duello @lea 5', detti);
  assert.match(detti.at(-1), /hai già una sfida in attesa/);
  scrivi('s4', 'lea', '!duello @ivo 5', detti);
  assert.match(detti.at(-1), /ivo ha già una sfida da accettare/);
  scrivi('s4', 'lea', '!duello @gino 20', detti);
  assert.match(detti.at(-1), /hai già una sfida in attesa|non hai 20/);
});

test('il duello senza posta, di serie, non crea monete', () => {
  canale('s5', {}, { mia: 10, nico: 10 });
  const detti = [];
  scrivi('s5', 'mia', '!duello @nico', detti);
  assert.equal(totale('s5', ['mia', 'nico']), 20);
  assert.ok(!/\+\d/.test(detti.at(-1)), 'e non dice un premio che non c\'e\'');
});

test('la morra: la resa del pannello e\' quella dei nove esiti', () => {
  const scelte = ['sasso', 'carta', 'forbice'];
  for (const vincita of [100, 150, 200, 333, 1000]) {
    const c = { vincita };
    for (const tu of scelte) {
      const media = scelte.reduce((s, io) => s + games.pagaMorra(games.esitoMorra(tu, io), 100, c), 0) / 3;
      assert.equal(G.valutaResa(G.giocoDi('morra').resa, c).perCento, Math.round(media * 10) / 10, `vincita ${vincita}, ${tu}`);
    }
  }
  assert.equal(G.valutaResa(G.giocoDi('morra').resa, G.valoriDi({}, 'morra')).perCento, 100, 'di serie e\' giusta');
  assert.equal(games.esitoMorra('sasso', 'forbice'), 'vinci');
  assert.equal(games.esitoMorra('carta', 'forbice'), 'perdi');
  assert.equal(games.esitoMorra('carta', 'carta'), 'pari');
});

test('la morra in chat: senza puntata non muove monete, con la puntata si', () => {
  canale('s6', {}, { olga: 100 });
  const detti = [];
  scrivi('s6', 'olga', '!morra sasso', detti);
  assert.equal(points.get('s6', 'olga'), 100);
  assert.match(detti.at(-1), /olga: sasso · io: (sasso|carta|forbice)/);
  scrivi('s6', 'olga', '!morra lancia', detti);
  assert.match(detti.at(-1), /Uso: !morra sasso, carta o forbice/);
  games.tryGame({ channel: 's6', user: 'pia', text: '!morra carta 20' }, (t) => detti.push(t));
  assert.match(detti.at(-1), /non hai 20/);
  points.add('s6', 'quinto', 100);
  scrivi('s6', 'quinto', '!morra forbice 20', detti);
  const esito = detti.at(-1);
  assert.match(esito, /quinto: forbice/);
  const ora = points.get('s6', 'quinto');
  if (/hai vinto/.test(esito)) assert.equal(ora, 120);
  else if (/pari/.test(esito)) assert.equal(ora, 100);
  else assert.equal(ora, 80);
});
