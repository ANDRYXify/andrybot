// LE ATTESE DEI GIOCHI: due per gioco, si consumano giocando, si dicono una
// volta.
//
// Prima un comando scritto male consumava l'attesa di quello giusto, quasi
// tutte le attese erano mute, e !trivia e !manche avevano la loro fissa nel
// codice. Qui si prova la regola nuova su giochi veri, con l'orologio finto.
// Il ragionamento sta in docs/GIOCHI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('attese-');
const { streamers, points } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const A = await import('../../src/features/attese-giochi.js');
const G = await import('../../src/features/giochi-conf.js');
const R = await import('../../src/features/comandi-registro.js');
test.after(() => casa.pulisci());

const T0 = Date.parse('2026-09-23T21:00:00Z');
function canale(ch, settings = {}, monete = {}) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, settings);
  for (const [u, n] of Object.entries(monete)) points.add(ch, u, n);
  for (const u of ['anna', 'bruno', 'carla', 'dario']) games.segnaPresenza(ch, u);
}
function scena(ch) {
  const detti = [];
  const scrivi = (user, text) => games.tryGame({ channel: ch, user, text }, (t) => detti.push(t));
  return { detti, scrivi };
}

test('ogni gioco ha le sue due attese, a testa e per tutti', () => {
  for (const g of G.CATALOGO) {
    const a = g.param.filter((p) => p.attesa);
    assert.deepEqual(a.map((p) => [p.k, p.attesa]), [['attesaTesta', 'testa'], ['attesaTutti', 'tutti']], g.id);
    for (const p of a) assert.equal(p.min, 0, `${g.id}.${p.k}: zero vuol dire nessuna attesa`);
  }
});

test('chi aveva scelto l\'attesa unica la ritrova al posto giusto', () => {
  const s = { giochiConf: { slot: { attesa: 20 }, duello: { attesa: 40 }, pesca: { attesa: 600 }, sblocca: { attesa: 900 } } };
  assert.deepEqual([G.valoriDi(s, 'slot').attesaTesta, G.valoriDi(s, 'slot').attesaTutti], [20, 0], 'nella slot era a testa');
  assert.deepEqual([G.valoriDi(s, 'duello').attesaTesta, G.valoriDi(s, 'duello').attesaTutti], [0, 40], 'nel duello era per tutti');
  assert.equal(G.valoriDi(s, 'pesca').attesaTesta, 600);
  assert.equal(G.valoriDi(s, 'sblocca').attesaTutti, 900);
  const nuovo = { giochiConf: { slot: { attesa: 20, attesaTesta: 7 } } };
  assert.equal(G.valoriDi(nuovo, 'slot').attesaTesta, 7, 'il valore nuovo vince su quello di prima');
  assert.ok(!G.catalogoPerPannello({}).giochi.some((g) => g.param.some((p) => 'prima' in p)), 'il pannello non vede da dove veniva');
});

test('un comando scritto male non consuma l\'attesa di quello giusto', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('a1', {}, { anna: 1000 });
  const s = scena('a1');
  s.scrivi('anna', '!roulette');
  assert.match(s.detti.at(-1), /Uso: !roulette/);
  s.scrivi('anna', '!roulette 10 rosso');
  assert.match(s.detti.at(-1), /La pallina cade/, 'subito dopo, gioca');
});

test('in attesa lo si dice una volta, poi si tace, e alla fine si gioca', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('a2', {}, { anna: 1000 });
  const s = scena('a2');
  s.scrivi('anna', '!slot');
  assert.match(s.detti.at(-1), /🎰/);
  s.scrivi('anna', '!slot');
  assert.equal(s.detti.at(-1), '⏳ anna, !slot di nuovo fra 5 secondi.');
  const n = s.detti.length;
  t.mock.timers.tick(2000);
  s.scrivi('anna', '!slot');
  assert.equal(s.detti.length, n, 'nella stessa attesa, niente');
  t.mock.timers.tick(3000);
  s.scrivi('anna', '!slot');
  assert.match(s.detti.at(-1), /🎰/);
  s.scrivi('anna', '!slot');
  assert.equal(s.detti.at(-1), '⏳ anna, !slot di nuovo fra 5 secondi.', 'un\'attesa nuova si dice di nuovo');
});

test('l\'attesa per tutti ferma il canale, e si dice una volta per tutti', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('a3', { giochiConf: { slot: { attesaTesta: 0, attesaTutti: 30 } } }, { anna: 100, bruno: 100, carla: 100 });
  const s = scena('a3');
  s.scrivi('anna', '!slot');
  s.scrivi('bruno', '!slot');
  assert.equal(s.detti.at(-1), '⏳ !slot di nuovo fra 30 secondi.');
  const n = s.detti.length;
  s.scrivi('carla', '!slot');
  assert.equal(s.detti.length, n);
  t.mock.timers.tick(30_000);
  s.scrivi('carla', '!slot');
  assert.match(s.detti.at(-1), /🎰/);
});

test('quando le due attese finiscono insieme, vale quella di tutti: si dice una volta sola', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('a10', { giochiConf: { slot: { attesaTesta: 5, attesaTutti: 5 } } }, { anna: 100 });
  const s = scena('a10');
  s.scrivi('anna', '!slot');
  s.scrivi('anna', '!slot');
  assert.equal(s.detti.at(-1), '⏳ !slot di nuovo fra 5 secondi.');
});

for (const [gioco, comando, altro] of [
  ['dado', '!dado', null], ['moneta', '!moneta', null], ['8ball', '!8ball vinco?', null], ['slot', '!slot', null],
  ['roulette', '!roulette 10 rosso', null], ['morra', '!morra carta', null], ['pesca', '!pesca', null], ['furto', '!furto @bruno', 'bruno'],
  ['duello', '!duello @bruno', 'bruno'], ['abbraccio', '!abbraccio @bruno', null], ['bacio', '!bacio @bruno', null],
]) {
  test(`${comando}: giocato una volta, la seconda aspetta`, (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
    const ch = 'g-' + gioco;
    canale(ch, { giochiConf: { [gioco]: { attesaTesta: 60, attesaTutti: 0 } } }, { anna: 1000, ...(altro ? { [altro]: 1000 } : {}) });
    const s = scena(ch);
    s.scrivi('anna', comando);
    const n = s.detti.length;
    assert.ok(n > 0 && !/⏳/.test(s.detti.at(-1)), 'la prima si gioca');
    s.scrivi('anna', comando);
    assert.equal(s.detti.length, n + 1);
    assert.match(s.detti.at(-1), /1 minuto/, 'la seconda dice quanto manca');
  });
}

test('l\'attesa parla col nome che il comando ha in quel canale', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('a4', { comandi: { slot: { nome: 'macchinetta' } } }, { anna: 100 });
  const s = scena('a4');
  s.scrivi('anna', '!slot');
  s.scrivi('anna', '!slot');
  assert.equal(s.detti.at(-1), '⏳ anna, !macchinetta di nuovo fra 5 secondi.');
});

test('!trivia e !manche hanno la stessa attesa, e la sceglie lo streamer', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('a5');
  const s = scena('a5');
  s.scrivi('anna', '!manche calcolo');
  games.tryGame({ channel: 'a5', user: 'anna', text: games.mancheInCorso('a5').soluzione }, () => {});
  s.scrivi('bruno', '!trivia');
  assert.equal(s.detti.at(-1), '⏳ !trivia di nuovo fra 10 secondi.', 'dieci secondi di serie, per tutti');
  canale('a6', { giochiConf: { manche: { attesaTutti: 0 } } });
  const u = scena('a6');
  u.scrivi('anna', '!manche calcolo');
  games.tryGame({ channel: 'a6', user: 'anna', text: games.mancheInCorso('a6').soluzione }, () => {});
  u.scrivi('bruno', '!manche calcolo');
  assert.match(u.detti.at(-1), /CALCOLO VELOCE/, 'a zero, niente attesa');
});

test('lo sblocco che Twitch rifiuta non consuma l\'attesa', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('a7', {}, { anna: 1000 });
  let risposta = { ok: false };
  games.impostaModalita({ accendiPer: async () => risposta });
  const s = scena('a7');
  s.scrivi('anna', '!sblocca');
  await new Promise((r) => setImmediate(r));
  assert.match(s.detti.at(-1), /non ti costa niente/);
  risposta = { ok: true, esito: 'acceso' };
  s.scrivi('anna', '!sblocca');
  await new Promise((r) => setImmediate(r));
  assert.match(s.detti.at(-1), /ha sbloccato la chat/);
  s.scrivi('bruno', '!sblocca');
  await new Promise((r) => setImmediate(r));
  assert.match(s.detti.at(-1), /La chat si potrà sbloccare di nuovo fra 10 minuti/);
  games.impostaModalita(null);
});

test('annullare un\'attesa rimette quella di prima', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('a8', { giochiConf: { slot: { attesaTesta: 10, attesaTutti: 0 } } });
  A.giocato('a8', 'slot', 'anna');
  t.mock.timers.tick(4000);
  const segno = A.giocato('a8', 'slot', 'anna');
  assert.equal(A.resta('a8', 'slot', 'anna').ms, 10_000);
  segno.annulla();
  assert.equal(A.resta('a8', 'slot', 'anna').ms, 6000, 'torna quella di prima, non sparisce');
});

test('la carta dei comandi mostra le attese scelte nelle regole', () => {
  canale('a9', { giochiConf: { pesca: { attesaTesta: 120, attesaTutti: 30 } } });
  const righe = Object.fromEntries(R.elenco('a9').map((r) => [r.id, r]));
  assert.deepEqual([righe.pesca.attesa, righe.pesca.attesaTutti], [120, 30]);
  assert.deepEqual([righe.trivia.attesa, righe.trivia.attesaTutti], [0, 10], '!trivia mostra quella delle manche');
  assert.deepEqual([righe.colpisci.attesa, righe.colpisci.attesaTutti], [5, 0], '!colpisci quella del boss');
  for (const r of R.COMANDI.filter((c) => c.gioco)) assert.ok(G.giocoDi(r.gioco), `${r.id}: il gioco ${r.gioco} esiste`);
});

test('nei giochi non resta un\'attesa fatta a mano', () => {
  for (const f of ['games.js', 'coccole.js', 'colpo.js', 'boss.js']) {
    const src = readFileSync(new URL(`../../src/features/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /inCooldown|cooldowns|inAttesa\(|\.attesa \* 1000/, f);
  }
});
