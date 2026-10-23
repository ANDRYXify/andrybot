// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE MONETE CHE SI PERDONO, IL REGISTRO, GLI EVENTI E LE MONETE IN
// CIRCOLAZIONE (docs/ECONOMIA.md), sul database vero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('economia-perdite-');
const { streamers, points, statoVivo } = await import('../../src/db.js');
const E = await import('../../src/features/economia.js');
const R = await import('../../src/features/economia-regole.js');
test.after(() => casa.pulisci());

let n = 0;
const canale = (punti = {}, altro = {}) => {
  const c = `per${++n}`;
  streamers.upsertApproved(c, c, String(5000 + n));
  streamers.setEnabled(c, true);
  streamers.setSettings(c, { punti, ...altro });
  return c;
};
const GIORNO = 86_400_000;
const T0 = Date.parse('2026-10-10T10:00:00Z');

test('le regole delle perdite: spente di serie, una parte in su, mai piu\' del saldo, il purge e\' un messaggio cancellato', () => {
  const zero = R.normalizza({});
  assert.deepEqual([R.quantoPerde(zero, 'timeout', 1000, 600), R.quantoPerde(zero, 'ban', 1000), R.quantoPerde(zero, 'cancellato', 1000)], [0, 0, 0], 'un canale che non tocca niente non cambia');
  const c = R.normalizza({ perdite: { timeout: { modo: 'pct', n: 10 }, ban: { modo: 'tutto' }, cancellato: 5 } });
  assert.equal(R.quantoPerde(c, 'timeout', 1000, 600), 100);
  assert.equal(R.quantoPerde(c, 'timeout', 3, 600), 1, 'chi ha poco perde almeno una moneta');
  assert.equal(R.quantoPerde(c, 'timeout', 1000, 1), 5, 'un timeout di un secondo e\' un purge');
  assert.equal(R.quantoPerde(c, 'ban', 777), 777);
  assert.equal(R.quantoPerde(c, 'cancellato', 2), 2, 'mai piu\' del saldo');
  assert.equal(R.quantoPerde(R.normalizza({ perdite: { timeout: { modo: 'fisso', n: 50 } } }), 'timeout', 30, 60), 30);
  assert.equal(R.normalizza({ perdite: { ban: { modo: 'boh' } } }).perdite.ban.modo, 'no');
  const a = R.normalizza({ perdite: { assenza: { giorni: 14, pct: 20, fine: 60 } } });
  assert.deepEqual(R.quantoAssenza(a, 1000, 13), { n: 0, motivo: '' });
  assert.deepEqual(R.quantoAssenza(a, 1000, 14), { n: 200, motivo: 'assenza' });
  assert.deepEqual(R.quantoAssenza(a, 1000, 60), { n: 1000, motivo: 'assenza-fine' });
  assert.equal(R.chiaveStagione('mese', Date.parse('2026-09-30T22:30:00Z'), 'Europe/Rome'), '2026-10', 'nel fuso del canale');
  assert.equal(R.chiaveStagione('tre', Date.parse('2026-10-01T10:00:00Z')), '2026-T4');
  assert.equal(R.chiaveStagione('no'), '');
});

test('perdere e annullare: il registro tiene la ricevuta, e «Annulla» rimette quelle monete, con le loro scadenze, una volta sola', () => {
  const c = canale();
  const T0 = Date.now();
  points.dai(c, 'marta', 100, { scade: 0, ora: T0 });
  points.dai(c, 'marta', 50, { scade: T0 + 10 * GIORNO, ora: T0 });
  assert.equal(E.perde(c, 'Marta', 80, 'timeout', { ora: T0 }), 80);
  assert.equal(points.get(c, 'marta'), 70);
  const [m] = E.registro(c);
  assert.deepEqual([m.user, m.delta, m.motivo, m.chi], ['marta', -80, 'timeout', '']);
  assert.deepEqual(m.ricevuta, [{ scade: T0 + 10 * GIORNO, quanti: 50 }, { scade: 0, quanti: 30 }], 'si toglie prima quello che scade prima');
  assert.deepEqual(E.annulla(c, m.id, { chi: 'lo_streamer', ora: T0 + 1 }), { ok: true, monete: 80 });
  assert.equal(points.get(c, 'marta'), 150);
  assert.equal(points.prossimaScadenza(c, 'marta', T0)?.quanti, 50, 'tornano con la loro scadenza');
  assert.deepEqual(E.annulla(c, m.id), { ok: false, motivo: 'gia' }, 'una volta sola');
  assert.equal(E.registro(c)[0].annullato_da, 'lo_streamer');
  assert.equal(E.regala(c, 'luca', 40, 'staff', { chi: 'mod1', ora: T0 }), 40);
  const dato = E.registro(c)[0];
  assert.deepEqual([dato.delta, dato.chi], [40, 'mod1']);
  points.togli(c, 'luca', 30, { ora: T0 });
  assert.deepEqual(E.annulla(c, dato.id), { ok: true, monete: -10 }, 'un regalo annullato si riprende quanto ce n\'e\' ancora');
  assert.equal(E.perde(c, 'nessuno', 10, 'ban'), 0);
  assert.equal(E.registro(c).filter((r) => r.user === 'nessuno').length, 0, 'niente tolto, niente da scrivere');
  assert.equal(E.imposta(c, 'marta', 200, { chi: 'mod1' }), 50);
  assert.equal(E.imposta(c, 'marta', 10, { chi: 'mod1' }), -190);
  assert.equal(points.get(c, 'marta'), 10);
});

test('la moderazione toglie quello che dicono le regole; lo streamer mai', () => {
  const c = canale({ perdite: { timeout: { modo: 'pct', n: 50 }, ban: { modo: 'tutto' }, cancellato: 3 } });
  for (const u of ['a', 'b', 'x', c]) points.dai(c, u, 100);
  assert.equal(E.punisci(c, 'a', 'timeout', { durata: 600 }), 50);
  assert.equal(E.punisci(c, 'b', 'ban'), 100);
  assert.equal(E.punisci(c, 'x', 'timeout', { durata: 1 }), 3, 'il purge');
  assert.equal(E.punisci(c, c, 'ban'), 0, 'casa sua');
  assert.deepEqual(E.registro(c).map((r) => [r.user, r.delta, r.motivo]), [['x', -3, 'cancellato'], ['b', -100, 'ban'], ['a', -50, 'timeout']]);
  assert.equal(E.punisci(canale(), 'a', 'ban'), 0, 'regole spente: niente');
});

test('il giro di ogni giorno: l\'assenza una volta a settimana, tutte dopo la fine, e chi non era mai stato visto comincia adesso', () => {
  const c = canale({ perdite: { assenza: { giorni: 10, pct: 10, fine: 30 } } });
  points.dai(c, 'via', 1000); points.dai(c, 'sparito', 500); points.dai(c, 'qui', 300); points.dai(c, 'mai', 200);
  points.vistoOra(c, 'via', T0 - 12 * GIORNO);
  points.vistoOra(c, 'sparito', T0 - 40 * GIORNO);
  points.vistoOra(c, 'qui', T0 - GIORNO);
  const e = E.giornoEconomia(c, { ora: T0 });
  assert.deepEqual([e.assenti, e.tolte], [2, 600]);
  assert.deepEqual([points.get(c, 'via'), points.get(c, 'sparito'), points.get(c, 'qui'), points.get(c, 'mai')], [900, 0, 300, 200], 'chi non era mai stato visto non perde: il conto parte adesso');
  assert.equal(E.giornoEconomia(c, { ora: T0 + 3600_000 }), null, 'una volta al giorno');
  E.giornoEconomia(c, { ora: T0 + 2 * GIORNO });
  assert.equal(points.get(c, 'via'), 900, 'la settimana non e\' passata');
  E.giornoEconomia(c, { ora: T0 + 7 * GIORNO });
  assert.equal(points.get(c, 'via'), 810, 'una settimana dopo, un altro dieci per cento');
  points.vistoOra(c, 'via', T0 + 7 * GIORNO + 1);
  E.giornoEconomia(c, { ora: T0 + 14 * GIORNO });
  assert.equal(points.get(c, 'via'), 810, 'chi torna non perde piu\'');
  assert.equal(points.get(c, 'mai'), 180, 'e per chi non era mai stato visto il conto e\' partito davvero, dal primo giro');
  assert.deepEqual(E.registro(c, { user: 'sparito' }).map((r) => r.motivo), ['assenza-fine']);
});

test('le stagioni: alla fine la classifica va nell\'archivio e si riparte dalla parte che si tiene; il primo giro e un cambio di modo non contano', () => {
  const c = canale({ stagioni: { ogni: 'mese', tieni: 10 } });
  points.dai(c, 'uno', 1000); points.dai(c, 'due', 500); points.dai(c, 'mod', 9000, { ruolo: 'staff' });
  assert.equal(E.giornoEconomia(c, { ora: Date.parse('2026-09-15T10:00:00Z') }).stagione, null, 'il primo giro segna la stagione e basta');
  const e = E.giornoEconomia(c, { ora: Date.parse('2026-10-01T08:00:00Z') });
  assert.equal(e.stagione.chiave, '2026-09');
  assert.deepEqual(e.stagione.classifica, [{ user: 'uno', monete: 1000 }, { user: 'due', monete: 500 }], 'lo staff corre in un\'altra gara');
  assert.deepEqual([points.get(c, 'uno'), points.get(c, 'due'), points.get(c, 'mod')], [100, 50, 900]);
  assert.equal(E.stagioniPassate(c)[0].chiave, '2026-09');
  streamers.setSettings(c, { punti: { stagioni: { ogni: 'tre', tieni: 10 } } });
  assert.equal(E.giornoEconomia(c, { ora: Date.parse('2026-10-02T08:00:00Z') }).stagione, null, 'passare a «ogni tre mesi» non chiude una stagione');
  assert.equal(points.get(c, 'uno'), 100);
});

test('gli eventi: le monete scelte dallo streamer, anche a crescita spenta; i bot, gli esclusi, gli anonimi e lo streamer no', () => {
  const c = canale({ auto: false, esclusi: ['escluso'], eventi: { follow: 10, sub1: 100, sub3: 300, regalo: 50, bit: 20, raid: 200, primo: 5 } });
  assert.equal(E.dagliEventi(c, 'channel.follow', { user_login: 'Nuova' }), 10);
  assert.equal(E.dagliEventi(c, 'channel.subscribe', { user_login: 'abbo', tier: '3000' }), 300);
  assert.equal(E.dagliEventi(c, 'channel.subscribe', { user_login: 'regalato', tier: '1000', is_gift: true }), 0, 'chi riceve un regalo no');
  assert.equal(E.dagliEventi(c, 'channel.subscription.gift', { user_login: 'generoso', total: 5, tier: '1000' }), 250);
  assert.equal(E.dagliEventi(c, 'channel.subscription.gift', { is_anonymous: true, total: 5 }), 0);
  assert.equal(E.dagliEventi(c, 'channel.cheer', { user_login: 'bit', bits: 350 }), 60, 'una quota ogni cento');
  assert.equal(E.dagliEventi(c, 'channel.cheer', { user_login: 'bit', bits: 99 }), 0);
  assert.equal(E.dagliEventi(c, 'channel.raid', { from_broadcaster_user_login: 'amica' }), 200);
  assert.equal(E.dagliEventi(c, 'channel.follow', { user_login: 'escluso' }), 0);
  assert.equal(E.dagliEventi(c, 'channel.follow', { user_login: 'nightbot' }), 0, 'un bot noto no');
  assert.equal(E.dagliEventi(c, 'channel.follow', { user_login: c }), 0);
  assert.equal(E.evento(c, 'primo', 'nuovissima'), 5);
  assert.equal(E.registro(c, { user: 'generoso' })[0].motivo, 'evento:regalo');
  assert.equal(E.dagliEventi(canale({}, { giochi: false }), 'channel.follow', { user_login: 'x' }), 0, 'giochi spenti, niente monete');
});

test('le monete in circolazione: quelle nate e quelle sparite; un passaggio di mano fa zero, una puntata conta solo il guadagno', () => {
  const c = canale();
  const ora = Date.now();
  points.dai(c, 'a', 100, { ora });
  points.dai(c, 'b', 50, { scade: ora + 1000, ora });
  points.passa(c, 'a', 'b', 30, { ora });
  const r = points.punta(c, 'a', 20, { ora });
  points.chiudiPuntata(c, 'a', r.ricevuta, 35, { ora });
  const s = points.punta(c, 'a', 10, { ora });
  points.chiudiPuntata(c, 'a', s.ricevuta, 0, { ora });
  points.scadi(ora + 2000);
  const k = points.circolazione(c, 7, ora + 2000);
  assert.deepEqual([k.nate, k.sparite], [150 + 15, 10 + 50], 'nate: le date e il guadagno; sparite: la puntata persa e le scadute');
  assert.equal(k.monete, 165 - 60, 'e quelle in mano sono la differenza');
});
