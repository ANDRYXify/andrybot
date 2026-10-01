// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// CHI INSISTE ASPETTA DI PIU' (src/features/attese-giochi.js, docs/GIOCHI.md).
//
// Le promesse:
//  · chi riscrive il comando durante la sua attesa aspetta tot in piu', poi il
//    doppio, poi il doppio ancora: dopo n volte tot·(2ⁿ−1);
//  · dopo `insistiMax` volte il gioco per lui e' chiuso fino a fine diretta, lo
//    si dice una volta, e alla diretta dopo si riparte da zero;
//  · chi aspetta e gioca non paga niente; una partita tranquilla abbassa il
//    castigo di un gradino;
//  · lo staff mai; un gioco con tot a zero non castiga;
//  · il castigo sopravvive a un riavvio, e una partita annullata lo rimette
//    com'era;
//  · il tempo si dice nella lingua della chat; a canale spento la giornata e'
//    quella del canale;
//  · il perdono dello staff toglie il castigo intero (su un gioco o su tutti),
//    non l'attesa normale; !perdona e' solo dello staff, risponde con le sue
//    frasi, e la carta del pannello elenca solo la diretta di adesso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('insistere-');
const { streamers, points, statoVivo } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const A = await import('../../src/features/attese-giochi.js');
const E = await import('../../src/features/economia.js');
test.after(() => casa.pulisci());

const T0 = Date.parse('2026-10-01T18:00:00Z');
let n = 0;
function tavolo(slot = { insisti: 30, insistiMax: 4 }, altro = {}) {
  const ch = `insisti${++n}`;
  streamers.upsertApproved(ch, ch, String(7000 + n));
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { giochiConf: { slot }, ...altro });
  points.dai(ch, 'anna', 100000);
  points.dai(ch, 'bruno', 100000);
  for (const u of ['anna', 'bruno']) games.segnaPresenza(ch, u);
  statoVivo.scrivi(ch, 'economia', { diretta: 'prima', ts: Date.now() });
  const detti = [];
  const scrivi = (user, text = '!slot', extra = {}) => games.tryGame({ channel: ch, user, text, ...extra }, (x) => detti.push(x));
  return { ch, detti, scrivi };
}
const restaS = (ch, chi = 'anna') => Math.round((A.resta(ch, 'slot', chi)?.ms ?? 0) / 1000);

test('chi insiste aspetta tot, poi tot più il doppio, poi più il doppio ancora', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo();
  s.scrivi('anna');
  assert.match(s.detti.at(-1), /🎰/);
  assert.equal(restaS(s.ch), 5, 'l\'attesa della slot');
  s.scrivi('anna');
  assert.equal(restaS(s.ch), 5 + 30);
  assert.match(s.detti.at(-1), /anna/);
  assert.match(s.detti.at(-1), /35 secondi/, 'dice l\'attesa nuova');
  s.scrivi('anna');
  assert.equal(restaS(s.ch), 5 + 30 + 60);
  s.scrivi('anna');
  assert.equal(restaS(s.ch), 5 + 30 + 60 + 120, 'dopo tre volte, 7 volte tot');
  assert.match(s.detti.at(-1), /4 minuti/);
  assert.equal(s.detti.length, 4, 'una riga per gradino');
});

test('dopo insistiMax volte basta fino a fine diretta, lo si dice una volta, e la diretta dopo si riparte', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo();
  s.scrivi('anna');
  for (let i = 0; i < 4; i++) s.scrivi('anna');
  assert.match(s.detti.at(-1), /!slot/);
  assert.match(s.detti.at(-1), /fino alla fine della diretta/);
  assert.equal(A.resta(s.ch, 'slot', 'anna').basta, true);
  const k = s.detti.length;
  t.mock.timers.tick(6 * 3600_000);
  statoVivo.scrivi(s.ch, 'economia', { diretta: 'prima', ts: Date.now() });
  s.scrivi('anna');
  s.scrivi('anna');
  assert.equal(s.detti.length, k, 'chiuso, e il bot tace');
  statoVivo.scrivi(s.ch, 'economia', { diretta: 'dopo', ts: Date.now() });
  s.scrivi('anna');
  assert.match(s.detti.at(-1), /🎰/, 'la diretta dopo si gioca');
  s.scrivi('anna');
  assert.equal(restaS(s.ch), 5 + 30, 'e il castigo riparte da tot');
});

test('a canale spento basta fino a domani, e domani si riparte', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.parse('2026-10-01T20:00:00Z') });
  const s = tavolo({ insisti: 30, insistiMax: 1 });
  statoVivo.togli(s.ch, 'economia');
  s.scrivi('anna');
  s.scrivi('anna');
  assert.match(s.detti.at(-1), /fino a domani/);
  t.mock.timers.tick(3 * 3600_000 + 60_000);   // le 23:01 UTC: a Roma e' gia' domani
  assert.equal(E.momento(s.ch).chiave, 'f:2026-10-02');
  s.scrivi('anna');
  assert.match(s.detti.at(-1), /🎰/);
});

test('chi aspetta e gioca non paga niente; una partita tranquilla abbassa di un gradino', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo();
  s.scrivi('anna');
  t.mock.timers.tick(5000);
  s.scrivi('anna');
  assert.equal(restaS(s.ch), 5, 'nessun castigo per chi ha aspettato');
  s.scrivi('anna');
  s.scrivi('anna');
  assert.equal(restaS(s.ch), 5 + 30 + 60, 'gradino 2');
  t.mock.timers.tick(95_000);
  s.scrivi('anna');                       // aspettato, ma aveva insistito in questa attesa: resta al 2
  t.mock.timers.tick(5000);
  s.scrivi('anna');                       // tranquilla: scende al gradino 1
  s.scrivi('anna');
  assert.equal(restaS(s.ch), 5 + 60, 'dal gradino 1 il passo dopo e\' il doppio di tot');
});

test('lo staff non e\' mai castigato, e un gioco con tot a zero non castiga', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo();
  s.scrivi('bruno', '!slot', { isMod: true });
  s.scrivi('bruno', '!slot', { isMod: true });
  s.scrivi('bruno', '!slot', { isMod: true });
  assert.equal(restaS(s.ch, 'bruno'), 5);
  const z = tavolo({ insisti: 0 });
  z.scrivi('anna');
  z.scrivi('anna');
  z.scrivi('anna');
  assert.equal(restaS(z.ch), 5);
  assert.equal(z.detti.at(-1), '⏳ anna, !slot di nuovo fra 5 secondi.', 'la solita attesa, detta una volta');
  assert.equal(z.detti.length, 2);
});

test('il castigo sopravvive a un riavvio', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo();
  s.scrivi('anna');
  s.scrivi('anna');
  s.scrivi('anna');
  const dopo = await import('../../src/features/attese-giochi.js?riavvio=1');
  assert.equal(Math.round(dopo.resta(s.ch, 'slot', 'anna').ms / 1000), 5 + 30 + 60, 'il bot riacceso lo ritrova');
});

test('una partita annullata rimette il castigo com\'era', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo();
  s.scrivi('anna');
  s.scrivi('anna');
  t.mock.timers.tick(35_000);
  const prima = statoVivo.leggi(s.ch, 'giochi-insistenze');
  A.giocato(s.ch, 'slot', { channel: s.ch, user: 'anna' }).annulla();
  assert.deepEqual(statoVivo.leggi(s.ch, 'giochi-insistenze'), prima);
});

test('il tempo si dice nella lingua della chat', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo({ insisti: 30, insistiMax: 4 }, { preferenze: { lingua: 'en' } });
  s.scrivi('anna');
  s.scrivi('anna');
  assert.match(s.detti.at(-1), /35 seconds/);
  assert.deepEqual(['it', 'en', 'es'].map((l) => A.tempoIn(l, 1000)), ['1 secondo', '1 second', '1 segundo']);
  assert.equal(A.tempoIn('it', 59_000), '59 secondi');
  assert.equal(A.tempoIn('it', 60_000), '1 minuto');
  assert.equal(A.tempoIn('en', 119 * 60_000), '119 minutes');
  assert.equal(A.tempoIn('es', 120 * 60_000), '2 horas');
  assert.equal(A.tempoIn('it', 125 * 60_000), '2 ore e 5 minuti');
  assert.equal(A.tempoIn('en', 61 * 60_000 * 2), '2 hours and 2 minutes');
});

// ---------------------------------------------------------------- il perdono

const Reg = await import('../../src/features/comandi-registro.js');

test('il perdono riapre il gioco chiuso, riparte dal primo gradino, e lascia l\'attesa normale', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo();
  s.scrivi('anna');
  for (let i = 0; i < 4; i++) s.scrivi('anna');
  assert.equal(A.resta(s.ch, 'slot', 'anna').basta, true);
  assert.equal(A.perdona(s.ch, 'anna'), 1);
  const r = A.resta(s.ch, 'slot', 'anna');
  assert.ok(r && !r.basta && r.ms > 0 && r.ms <= 5000, 'resta l\'attesa della slot, non il castigo');
  s.scrivi('anna');
  assert.equal(restaS(s.ch), 5 + 30, 'si riparte dal primo gradino');
  assert.equal(A.perdona(s.ch, 'bruno'), 0, 'chi non ha castighi');
});

test('il perdono su un gioco lascia gli altri', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo();
  streamers.setSettings(s.ch, { giochiConf: { slot: { insisti: 30, insistiMax: 4 }, moneta: { insisti: 30, insistiMax: 4 } } });
  s.scrivi('anna'); s.scrivi('anna');
  s.scrivi('anna', '!moneta'); s.scrivi('anna', '!moneta');
  assert.deepEqual(A.castighiInCorso(s.ch).map((c) => c.gioco).sort(), ['moneta', 'slot']);
  assert.equal(A.perdona(s.ch, 'anna', 'slot'), 1);
  assert.deepEqual(A.castighiInCorso(s.ch).map((c) => c.gioco), ['moneta']);
});

test('!perdona in chat: le sue risposte, il gioco col nome del canale, e solo per lo staff', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo();
  s.scrivi('anna'); s.scrivi('anna');
  const mod = { isMod: true };
  s.scrivi('bruno', '!perdona @anna slot', mod);
  assert.equal(s.detti.at(-1), '✅ Castigo tolto a anna: si torna a giocare come prima.');
  s.scrivi('bruno', '!perdona @anna', mod);
  assert.equal(s.detti.at(-1), 'anna non ha castighi da togliere.');
  s.scrivi('bruno', '!perdona @anna boh', mod);
  assert.equal(s.detti.at(-1), '«boh» non è un gioco di questo canale.');
  s.scrivi('bruno', '!perdona', mod);
  assert.equal(s.detti.at(-1), 'Si scrive così: !perdona @nome, o !perdona @nome e il gioco.');
  const v = Reg.preparaComando(s.ch, { text: '!perdona @anna', user: 'carla' });
  assert.equal(v.rifiuta, 'mod', 'chi non e\' staff non ci arriva');
  assert.ok(Reg.giochiInChat(s.ch, { isMod: true }).join(' ').includes('!perdona @nome'), 'lo staff lo vede in !giochi');
  assert.ok(!Reg.giochiInChat(s.ch, {}).join(' ').includes('!perdona'), 'chi guarda no');
});

test('la carta elenca solo i castighi di questa diretta', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo();
  s.scrivi('anna'); s.scrivi('anna'); s.scrivi('anna');
  const [c] = A.castighiInCorso(s.ch);
  assert.deepEqual({ chi: c.chi, gioco: c.gioco, gradino: c.gradino, aspetta: c.aspetta }, { chi: 'anna', gioco: 'slot', gradino: 2, aspetta: true });
  assert.equal(c.fino, T0 + 95_000);
  statoVivo.scrivi(s.ch, 'economia', { diretta: 'dopo', ts: Date.now() });
  assert.deepEqual(A.castighiInCorso(s.ch), []);
  assert.equal(A.perdona(s.ch, 'anna'), 0, 'un castigo di una diretta passata non si perdona: non c\'e\' gia\' piu\'');
});

test('!perdona riconosce il gioco dal comando, anche rinominato, e anche quando il comando non si chiama come il gioco', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const s = tavolo();
  streamers.setSettings(s.ch, { giochiConf: { manche: { insisti: 30, insistiMax: 4, attesaTutti: 600 }, slot: { insisti: 30, insistiMax: 4 } }, comandi: { slot: { nome: 'macchinetta' } } });
  // come fa il bot: il vaglio del registro traduce il nome del canale in quello di serie
  const scrivi = (user, text, extra = {}) => {
    const v = Reg.preparaComando(s.ch, { channel: s.ch, user, text, ...extra });
    s.scrivi(user, v?.testo || text, extra);
  };
  scrivi('anna', '!trivia');
  t.mock.timers.tick(120_000);              // la domanda e' finita, l'attesa di tutti no
  scrivi('anna', '!trivia');
  scrivi('anna', '!macchinetta');
  scrivi('anna', '!macchinetta');
  assert.deepEqual(A.castighiInCorso(s.ch).map((c) => c.gioco).sort(), ['manche', 'slot']);
  scrivi('bruno', '!perdona @anna trivia', { isMod: true });
  assert.equal(s.detti.at(-1), '✅ Castigo tolto a anna: si torna a giocare come prima.', '!trivia e\' una manche');
  scrivi('bruno', '!perdona @anna macchinetta', { isMod: true });
  assert.equal(s.detti.at(-1), '✅ Castigo tolto a anna: si torna a giocare come prima.', 'il nome che il comando ha nel canale');
  assert.deepEqual(A.castighiInCorso(s.ch), []);
});
