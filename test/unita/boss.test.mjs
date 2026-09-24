// IL BOSS DA BATTERE INSIEME: la vita e' quella della chat, ogni punto di danno
// vale lo stesso, e il massimo del pannello si raggiunge ma non si supera.
//
// Si prova con l'orologio finto e col danno fisso (dannoMin = dannoMax), cosi'
// ogni numero e' quello atteso e non uno plausibile. Il ragionamento sta in
// docs/GIOCHI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('boss-');
const { streamers, points, memory } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const B = await import('../../src/features/boss.js');
const G = await import('../../src/features/giochi-conf.js');
const R = await import('../../src/features/comandi-registro.js');
test.after(() => casa.pulisci());

const T0 = Date.parse('2026-09-23T21:00:00Z');
function canale(ch, boss = {}) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { giochiConf: { boss: { nomi: ['il Drago del Lag 🐉'], ...boss } } });
}
function scena(ch) {
  const detti = [];
  const eventi = [];
  B.impostaSpinta((c, p) => eventi.push({ c, ...p }));
  // Come in chat: prima il vaglio del registro (alias, comandi riservati),
  // poi il gioco.
  const scrivi = (user, text) => {
    const msg = { channel: ch, user, text, isMod: user === 'mod' };
    const v = R.preparaComando(ch, msg);
    if (v?.rifiuta) { detti.push(v.messaggio); return; }
    games.tryGame({ ...msg, text: v?.testo || text }, (t) => detti.push(t));
  };
  return { detti, eventi, scrivi };
}

test('la vita e\' quella di chi scrive, mai meno del minimo', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('b1', { vitaPerPersona: 50, minimo: 3 });
  const s = scena('b1');
  assert.equal(B.arriva('b1', (x) => s.detti.push(x)), true);
  assert.equal(B.bossInCorso('b1').vitaMax, 150, 'chat vuota: si contano tre persone');
  assert.equal(B.arriva('b1', () => {}), false, 'un boss alla volta');
  t.mock.timers.tick(90_000);

  for (const u of ['anna', 'bruno', 'carla', 'dario', 'elena']) memory.logMessage('b1', u, u, 'ciao', false, T0 + 80_000);
  memory.logMessage('b1', 'vecchio', 'vecchio', 'ciao', false, T0 + 90_000 - B.ATTIVI_MS - 1);
  memory.logMessage('b1', 'b1', 'b1', 'sono il bot', true, T0 + 85_000);
  B.arriva('b1', (x) => s.detti.push(x));
  assert.equal(B.bossInCorso('b1').vitaMax, 250, 'cinque persone che hanno scritto da poco: il bot e chi e\' zitto da tanto non contano');
  assert.match(s.detti.at(-1), /^⚔️ Arriva il Drago del Lag 🐉 con 250 punti vita! Scrivete !colpisci per colpire: avete 90 secondi\.$/);
});

test('ogni colpo toglie vita, meta\' e un quarto si dicono una volta, e chi colpisce aspetta', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('b2', { vitaPerPersona: 40, minimo: 3, dannoMin: 10, dannoMax: 10, bottino: 20 });
  const s = scena('b2');
  s.scrivi('mod', '!boss');
  assert.equal(B.bossInCorso('b2').vita, 120);
  s.scrivi('anna', '!colpisci');
  s.scrivi('anna', '!colpisci');
  assert.equal(B.bossInCorso('b2').vita, 110, 'cinque secondi fra due colpi della stessa persona');
  for (const u of ['bruno', 'carla', 'dario', 'elena']) s.scrivi(u, '!attacca');
  assert.equal(B.bossInCorso('b2').vita, 70);
  const n = s.detti.length;
  s.scrivi('fabio', '!hit');
  assert.equal(B.bossInCorso('b2').vita, 60);
  assert.equal(s.detti.length, n + 1);
  assert.equal(s.detti.at(-1), '🩸 Il Drago del Lag 🐉 è a metà: 60 punti vita su 120, mancano 90 secondi! Colpi: anna 10, bruno 10, carla 10, dario 10, elena 10, fabio 10.');
  for (const u of ['gino', 'ivo', 'luca']) s.scrivi(u, '!colpisci');
  assert.equal(s.detti.length, n + 2, 'sotto un quarto, una riga sola');
  assert.equal(s.detti.at(-1), '🩸 Ancora poco! Il Drago del Lag 🐉: 30 punti vita, mancano 90 secondi! Colpi: gino 10, ivo 10, luca 10.', 'coi colpi dall\'ultima riga, non da capo');
  assert.deepEqual(s.eventi.filter((e) => e.azione === 'colpo').map((e) => e.vita), [110, 100, 90, 80, 70, 60, 50, 40, 30]);
});

test('chi colpisce lo sa: un bollettino poco dopo il primo colpo, poi al piu\' uno ogni venti secondi', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('b12', { vitaPerPersona: 100, minimo: 3, dannoMin: 10, dannoMax: 10, attesa: 5, durata: 90 });
  const s = scena('b12');
  s.scrivi('mod', '!boss');
  const n = s.detti.length;
  s.scrivi('anna', '!colpisci');
  s.scrivi('bruno', '!colpisci');
  assert.equal(s.detti.length, n, 'non una riga a colpo');
  t.mock.timers.tick(B.BOLLETTINO_PRIMO_MS);
  assert.equal(s.detti.at(-1), '⚔️ Il Drago del Lag 🐉: 280 punti vita su 300, mancano 86 secondi. Colpi: anna 10, bruno 10.');
  t.mock.timers.tick(30_000);
  assert.equal(s.detti.length, n + 1, 'senza colpi nuovi, niente righe');
  s.scrivi('anna', '!colpisci');
  t.mock.timers.tick(1);
  assert.equal(s.detti.length, n + 2, 'passati venti secondi dall\'ultima, il colpo nuovo si dice subito');
  assert.match(s.detti.at(-1), /270 punti vita su 300, mancano 56 secondi\. Colpi: anna 10\.$/);
  t.mock.timers.tick(5_000);
  s.scrivi('anna', '!colpisci');
  s.scrivi('carla', '!colpisci');
  t.mock.timers.tick(14_000);
  assert.equal(s.detti.length, n + 2, 'prima dei venti secondi aspetta');
  t.mock.timers.tick(1_000);
  assert.match(s.detti.at(-1), /250 punti vita su 300, mancano 36 secondi\. Colpi: anna 10, carla 10\.$/);
  t.mock.timers.tick(40_000);
  assert.match(s.detti.at(-1), /^💨 /, 'e scappato il boss, il bollettino non parla piu\'');
});

test('se cade, il bottino va a danno fatto; il colpo finale conta la vita che restava', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('b3', { vitaPerPersona: 30, minimo: 3, dannoMin: 20, dannoMax: 20, bottino: 20, attesa: 5 });
  const s = scena('b3');
  s.scrivi('mod', '!boss');
  s.scrivi('anna', '!colpisci');
  s.scrivi('bruno', '!colpisci');
  t.mock.timers.tick(5000);
  s.scrivi('anna', '!colpisci');
  s.scrivi('bruno', '!colpisci');
  assert.equal(B.bossInCorso('b3').vita, 10);
  t.mock.timers.tick(5000);
  s.scrivi('anna', '!colpisci');
  assert.equal(B.bossInCorso('b3'), null);
  assert.equal(s.detti.at(-1), '🏆 Il Drago del Lag 🐉 va al tappeto! Bottino: anna +33, bruno +27.');
  assert.equal(points.get('b3', 'anna'), 33, '50 di danno a 20 ogni 30');
  assert.equal(points.get('b3', 'bruno'), 27, '40 di danno');
  assert.deepEqual(s.eventi.at(-1), { c: 'b3', tipo: 'boss', azione: 'fine', vinto: true, nome: 'il Drago del Lag 🐉' });
  const detti = s.detti.length;
  t.mock.timers.tick(100_000);
  assert.equal(s.detti.length, detti, 'un boss caduto non scappa piu\'');
});

test('il tempo di un boss caduto non fa scappare quello dopo', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('b11', { dannoMin: 1000, dannoMax: 1000, durata: 90 });
  const s = scena('b11');
  s.scrivi('mod', '!boss');
  t.mock.timers.tick(10_000);
  s.scrivi('anna', '!colpisci');
  t.mock.timers.tick(10_000);
  canale('b11', { dannoMin: 1, dannoMax: 1, durata: 90 });
  s.scrivi('mod', '!boss');
  t.mock.timers.tick(75_000);
  assert.ok(B.bossInCorso('b11'), 'il secondo ha i suoi novanta secondi');
  t.mock.timers.tick(15_000);
  assert.equal(B.bossInCorso('b11'), null);
});

test('se scappa non prende niente nessuno, e «nessun boss» non si ripete a raffica', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('b4', { dannoMin: 10, dannoMax: 10 });
  const s = scena('b4');
  s.scrivi('mod', '!boss');
  s.scrivi('anna', '!colpisci');
  t.mock.timers.tick(90_000);
  assert.match(s.detti.at(-1), /^💨 Il Drago del Lag 🐉 scappa con 170 punti vita su 180\. Niente bottino: sarà per la prossima\.$/);
  assert.equal(points.get('b4', 'anna'), 0);
  s.scrivi('anna', '!colpisci');
  assert.equal(s.detti.at(-1), '⚔️ Nessun boss in giro adesso.');
  const n = s.detti.length;
  s.scrivi('bruno', '!colpisci');
  assert.equal(s.detti.length, n, 'per trenta secondi non si ripete');
  t.mock.timers.tick(30_000);
  s.scrivi('bruno', '!colpisci');
  assert.equal(s.detti.length, n + 1);
});

test('il massimo a testa del pannello si raggiunge davvero, e non si supera', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const regole = { vitaPerPersona: 57, minimo: 5, dannoMin: 15, dannoMax: 15, bottino: 20, attesa: 5, durata: 92 };
  canale('b5', regole);
  const s = scena('b5');
  s.scrivi('mod', '!boss');
  for (let i = 0; i < 19; i++) {
    s.scrivi('anna', '!colpisci');
    if (i < 18) t.mock.timers.tick(5000);
  }
  const resa = G.valutaResa({ tipo: 'boss' }, G.valoriDi({ giochiConf: { boss: regole } }, 'boss'));
  assert.equal(points.get('b5', 'anna'), resa.massimo, 'da sola, un colpo ogni cinque secondi per tutto il tempo');
  assert.equal(resa.massimo, 100);
});

test('danno da-a scritto al contrario vale lo stesso, e il colpo resta nell\'intervallo', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('b6', { dannoMin: 12, dannoMax: 4, minimo: 50 });
  const s = scena('b6');
  s.scrivi('mod', '!boss');
  const v0 = B.bossInCorso('b6').vita;
  B.colpisci('b6', { user: 'alto' }, () => {}, () => 0.9999);
  B.colpisci('b6', { user: 'basso' }, () => {}, () => 0);
  assert.equal(v0 - B.bossInCorso('b6').vita, 16, '12 al massimo, 4 al minimo');
});

test('la festa in solo emote parte solo se la chat cambia davvero', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  const chiesti = [];
  let esito = 'acceso';
  B.impostaModalita({ accendiPer: async (ch, modo, secondi) => { chiesti.push([ch, modo, secondi]); return { ok: true, esito }; } });
  canale('b7', { festa: 2, dannoMin: 1000, dannoMax: 1000 });
  const s = scena('b7');
  s.scrivi('mod', '!boss');
  s.scrivi('anna', '!colpisci');
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(chiesti, [['b7', 'emote', 120]]);
  assert.equal(s.detti.at(-1), '🎉 Festa! Chat in solo emote per 2 minuti.');
  esito = 'gia';
  t.mock.timers.tick(10_000);
  s.scrivi('mod', '!boss');
  s.scrivi('bruno', '!colpisci');
  await Promise.resolve();
  await Promise.resolve();
  assert.match(s.detti.at(-1), /va al tappeto/, 'se la chat era gia\' in solo emote non si annuncia una festa');
  canale('b7', { festa: 0, dannoMin: 1000, dannoMax: 1000 });
  t.mock.timers.tick(10_000);
  s.scrivi('mod', '!boss');
  s.scrivi('carla', '!colpisci');
  await Promise.resolve();
  assert.equal(chiesti.length, 2, 'con la festa a zero la chat non si tocca');
  B.impostaModalita(null);
});

test('!boss lo chiamano i mod; chi non lo e\' lo legge, e il boss non arriva', () => {
  canale('b10');
  const s = scena('b10');
  s.scrivi('anna', '!boss');
  assert.equal(s.detti.at(-1), '!boss qui è riservato ai moderatori e allo streamer.');
  assert.equal(B.bossInCorso('b10'), null);
});

test('arriva col raid solo se il raid e\' abbastanza grande; da solo solo se lo chiedi', () => {
  canale('b8');
  assert.equal(B.vieneColRaid('b8', 9), false);
  assert.equal(B.vieneColRaid('b8', 10), true);
  assert.equal(B.vieneDaSolo('b8'), 0, 'di serie il boss automatico e\' spento');
  canale('b9', { dopoRaid: 0, ogni: 45 });
  assert.equal(B.vieneColRaid('b9', 5000), false);
  assert.equal(B.vieneDaSolo('b9'), 45);
});
