// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE ATTESE UGUALI PER TUTTI I GIOCHI (src/features/regole-comuni.js,
// docs/GIOCHI.md).
//
// Le promesse:
//  · accese o spente; ognuna delle quattro si puo' lasciare vuota, e allora
//    resta gioco per gioco;
//  · ogni gioco puo' fare a modo suo, e allora valgono le sue;
//  · il boss (colpi a raffica) e quello che non e' un gioco (abbracci, bacini,
//    cinque, lo sblocco della chat) non le seguono mai;
//  · i valori veri li usano tutti: il bot che fa aspettare, i castighi, la
//    resa del pannello. I valori del gioco restano i suoi, e sono quelli che
//    il pannello mette nelle caselle;
//  · salvare non tocca gli altri giochi, e un «suo» lo puo' dire solo chi segue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('regole-comuni-');
const { streamers, points, statoVivo } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const G = await import('../../src/features/giochi-conf.js');
const R = await import('../../src/features/regole-comuni.js');
const A = await import('../../src/features/attese-giochi.js');
test.after(() => casa.pulisci());

const QUATTRO = (v) => Object.fromEntries(R.COMUNI.filter((k) => k in v).map((k) => [k, v[k]]));

test('la regola per tutti, ripulita: vuoto vuol dire «ogni gioco la sua»', () => {
  assert.deepEqual(R.normalizzaTutti({ attivo: true, attesaTesta: -3, attesaTutti: '', insisti: 99999, insistiMax: '7.4' }),
    { attivo: true, attesaTesta: 0, attesaTutti: null, insisti: 3600, insistiMax: 7 });
  assert.deepEqual(R.normalizzaTutti(null), { attivo: false, attesaTesta: null, attesaTutti: null, insisti: null, insistiMax: null });
  assert.equal(R.normalizzaTutti({ attivo: 'si' }).attivo, false, 'acceso vuol dire acceso, non una stringa');
  assert.equal(R.conta({ attivo: true }), false, 'accesa ma vuota non dice niente');
  assert.equal(R.conta({ attivo: false, insisti: 30 }), false, 'spenta non dice niente');
  assert.equal(R.conta({ attivo: true, insisti: 0 }), true, 'zero e\' un numero: «chi insiste non aspetta di piu\'», per tutti');
});

test('valgono solo le cose scritte, solo se accese, e mai per chi fa a modo suo o non segue', () => {
  const propri = { costo: 10, attesaTesta: 5, attesaTutti: 0, insisti: 0, insistiMax: 5 };
  const t = { attivo: true, attesaTesta: 30, insisti: 20 };
  assert.deepEqual(R.effettivi(propri, t), { costo: 10, attesaTesta: 30, attesaTutti: 0, insisti: 20, insistiMax: 5 });
  assert.deepEqual(R.effettivi(propri, { ...t, attivo: false }), propri, 'spenta');
  assert.deepEqual(R.effettivi(propri, t, { suo: true }), propri, 'il gioco fa a modo suo');
  assert.deepEqual(R.effettivi(propri, t, { segue: false }), propri, 'il gioco non la segue mai');
  assert.deepEqual(R.effettivi({ attesaTesta: 5, attesaTutti: 0 }, t), { attesaTesta: 30, attesaTutti: 0 }, 'una cosa che il gioco non ha non gliela si aggiunge');
});

test('nel catalogo: la slot segue, la pesca a modo suo, il boss e gli abbracci mai', () => {
  const s = { giochiConf: { _tutti: { attivo: true, attesaTesta: 30, insisti: 20 }, pesca: { suo: true }, slot: { attesaTesta: 8 } } };
  assert.deepEqual(QUATTRO(G.valoriDi(s, 'slot')), { attesaTesta: 30, attesaTutti: 0, insisti: 20, insistiMax: 5 });
  assert.equal(G.valoriDi(s, 'slot', { propri: true }).attesaTesta, 8, 'il valore della slot resta il suo');
  assert.deepEqual(QUATTRO(G.valoriDi(s, 'pesca')), QUATTRO(G.valoriDi(s, 'pesca', { propri: true })));
  for (const id of ['boss', 'abbraccio', 'bacio', 'cinque', 'sblocca']) {
    assert.equal(G.giocoDi(id).comuni, false, `${id} non la segue`);
    assert.deepEqual(G.valoriDi(s, id), G.valoriDi(s, id, { propri: true }), `${id} tiene le sue`);
  }
  const seguono = G.CATALOGO.filter((g) => g.comuni !== false).map((g) => g.id);
  assert.ok(seguono.includes('slot') && seguono.includes('corsa') && seguono.includes('dado'), 'i giochi la seguono');
  assert.equal(seguono.length, G.CATALOGO.length - 5);
});

test('salvare: la regola ripulita, «suo» solo per chi segue, gli altri giochi intatti', () => {
  const prima = { slot: { costo: 12 }, roulette: { massimo: 50 }, _tutti: { attivo: true, attesaTesta: 10 } };
  const dopo = G.normalizzaConf(prima, { _tutti: { attivo: true, insisti: '30', attesaTesta: '' }, slot: { suo: true, attesaTesta: 4 }, boss: { suo: true } });
  assert.deepEqual(dopo._tutti, { attivo: true, attesaTesta: null, attesaTutti: null, insisti: 30, insistiMax: null });
  assert.deepEqual(dopo.slot, { costo: 12, suo: true, attesaTesta: 4 });
  assert.deepEqual(dopo.roulette, { massimo: 50 });
  assert.equal(dopo.boss?.suo, undefined, 'il boss non puo\' «fare a modo suo»: non la segue mai');
  assert.deepEqual(G.normalizzaConf(prima, { slot: { costo: 15 } })._tutti, prima._tutti, 'chi non la manda non la cambia');
});

test('il pannello riceve i valori del gioco per le caselle e quelli veri per la resa', () => {
  const s = { giochiConf: { _tutti: { attivo: true, attesaTesta: 30 } } };
  const c = G.catalogoPerPannello(s);
  assert.deepEqual(c.tutti, R.normalizzaTutti(s.giochiConf._tutti));
  const pesca = c.giochi.find((g) => g.id === 'pesca');
  assert.equal(pesca.propri.attesaTesta, 300);
  assert.equal(pesca.valori.attesaTesta, 30);
  assert.equal(pesca.segue, true);
  assert.equal(pesca.suo, false);
  const daSola = G.catalogoPerPannello({}).giochi.find((g) => g.id === 'pesca');
  assert.equal(pesca.resaOra.perOra, daSola.resaOra.perOra * 10, 'la resa si fa coi valori veri: un lancio ogni 30 secondi invece che ogni 300');
  assert.equal(c.giochi.find((g) => g.id === 'boss').segue, false);
});

// Il bot vero: le attese e i castighi passano dai valori veri.
let n = 0;
function tavolo(giochiConf) {
  const ch = `comuni${++n}`;
  streamers.upsertApproved(ch, ch, String(8000 + n));
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { giochiConf });
  points.dai(ch, 'anna', 100000);
  games.segnaPresenza(ch, 'anna');
  statoVivo.scrivi(ch, 'economia', { diretta: 'prima', ts: Date.now() });
  const detti = [];
  const scrivi = (text = '!slot') => games.tryGame({ channel: ch, user: 'anna', text }, (x) => detti.push(x));
  return { ch, detti, scrivi };
}
const T0 = Date.parse('2026-10-02T18:00:00Z');

test('il bot fa aspettare quanto dice la regola per tutti, e quanto dice il gioco se fa a modo suo', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const tutti = { attivo: true, attesaTesta: 60 };
  const s = tavolo({ _tutti: tutti });
  s.scrivi();
  assert.equal(Math.round(A.resta(s.ch, 'slot', 'anna').ms / 1000), 60, 'la slot aspetta un minuto, non i suoi 5 secondi');
  const suo = tavolo({ _tutti: tutti, slot: { suo: true } });
  suo.scrivi();
  assert.equal(Math.round(A.resta(suo.ch, 'slot', 'anna').ms / 1000), 5, 'a modo suo: i suoi 5 secondi');
  const spenta = tavolo({ _tutti: { ...tutti, attivo: false } });
  spenta.scrivi();
  assert.equal(Math.round(A.resta(spenta.ch, 'slot', 'anna').ms / 1000), 5, 'spenta: i suoi 5 secondi');
});

test('anche chi insiste segue la regola per tutti', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo({ _tutti: { attivo: true, insisti: 40, insistiMax: 0 } });
  s.scrivi();
  s.scrivi();
  assert.equal(Math.round(A.resta(s.ch, 'slot', 'anna').ms / 1000), 5 + 40, 'la sua attesa, piu\' i 40 secondi di chi insiste');
  assert.match(s.detti.at(-1), /45 secondi/);
});
