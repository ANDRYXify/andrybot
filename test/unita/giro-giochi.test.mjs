// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL GIRO DEI GIOCHI AUTOMATICI (giro-regole.js, giro-giochi.js, docs/GIOCHI.md).
//
// Le promesse:
//  · la scelta pesata esce con le sue probabilita', su tutte le estrazioni, e
//    un peso a zero non esce mai;
//  · la distanza blocca e poi libera; niente parte sopra un gioco in corso;
//  · il boss e l'arena non partono a canale spento;
//  · un tipo di manche che non ha niente da chiedere non parte, e il giro ne
//    sceglie un altro;
//  · le ultime partenze sopravvivono a un riavvio;
//  · chi aveva i tre orologi di prima ritrova le stesse frequenze in media, e
//    il boss e l'arena non piu' spesso di prima;
//  · la resa legge la distanza vera;
//  · i numeri del pannello stanno nei loro limiti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('giro-giochi-');
const { streamers, statoVivo, memory } = await import('../../src/db.js');
const R = await import('../../src/features/giro-regole.js');
const GG = await import('../../src/features/giro-giochi.js');
const G = await import('../../src/features/giochi-conf.js');
const games = await import('../../src/features/games.js');
const { BotManager } = await import('../../src/bot.js');
test.after(() => casa.pulisci());

let n = 0;
function canale(giro) {
  const ch = `giro${++n}`;
  streamers.upsertApproved(ch, ch, String(9000 + n));
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, giro === undefined ? {} : { giro });
  return ch;
}
const soloVoci = (pesi) => ({ attivo: true, voci: Object.fromEntries(R.VOCI.map((v) => [v.id, { peso: pesi[v.id] || 0, distanza: 0 }])) });
const muto = () => () => {};

test('la scelta pesata esce con le sue probabilita\', su tutte le estrazioni', () => {
  const fila = [{ id: 'a', peso: 1 }, { id: 'b', peso: 3 }, { id: 'c', peso: 0 }, { id: 'd', peso: 6 }];
  const conti = { a: 0, b: 0, c: 0, d: 0 };
  const N = 1000;
  for (let k = 0; k < N; k++) conti[R.pesca(fila, (k + 0.5) / N)]++;
  assert.deepEqual(conti, { a: 100, b: 300, c: 0, d: 600 });
  assert.equal(R.pesca([{ id: 'x', peso: 0 }], 0.5), null, 'nessun peso, nessuna scelta');
  assert.equal(R.pesca(fila, 0.9999999999), 'd', 'il bordo alto cade nell\'ultima');
});

test('la distanza blocca e poi libera', () => {
  const ch = canale(soloVoci({ calcolo: 5, numero: 5 }));
  const g = R.giroDi(streamers.get(ch).settings);
  g.voci.calcolo.distanza = 30;
  const ora = Date.now();
  statoVivo.scrivi(ch, 'giro-ultimi', { calcolo: ora - 29 * 60_000 });
  assert.deepEqual(GG.candidati(ch, g, { ora }).map((c) => c.id), ['numero']);
  assert.deepEqual(GG.candidati(ch, g, { ora: ora + 60_000 }).map((c) => c.id).sort(), ['calcolo', 'numero']);
});

test('niente parte sopra un gioco in corso, e lo scatto lo segna', () => {
  const ch = canale(soloVoci({ calcolo: 1 }));
  const id = GG.scatta(ch, { live: true, dire: muto });
  assert.equal(id, 'calcolo');
  assert.ok(games.mancheInCorso(ch));
  assert.ok(Number(GG.ultimi(ch).calcolo) > 0, 'la partenza e\' scritta');
  assert.deepEqual(GG.candidati(ch, R.giroDi(streamers.get(ch).settings), { live: true }), []);
  assert.equal(GG.scatta(ch, { live: true, dire: muto }), null);
});

test('il boss e l\'arena non partono a canale spento', () => {
  const ch = canale(soloVoci({ boss: 5, arena: 5, numero: 1 }));
  const g = R.giroDi(streamers.get(ch).settings);
  assert.deepEqual(GG.candidati(ch, g, { live: false }).map((c) => c.id), ['numero']);
  assert.deepEqual(GG.candidati(ch, g, { live: true }).map((c) => c.id).sort(), ['arena', 'boss', 'numero']);
});

test('un tipo di manche senza niente da chiedere non parte, e il giro ne sceglie un altro', () => {
  const ch = canale(soloVoci({ domanda: 50, calcolo: 1 }));
  const id = GG.scatta(ch, { live: true, dire: muto, caso: () => 0 });
  assert.equal(id, 'calcolo', 'la «domanda tua» senza domande lascia il posto');
  const solo = canale(soloVoci({ domanda: 50 }));
  assert.equal(GG.scatta(solo, { live: true, dire: muto }), null);
  assert.deepEqual(GG.ultimi(solo), {}, 'niente partito, niente segnato');
});

test('le ultime partenze sopravvivono a un riavvio', async () => {
  const ch = canale(soloVoci({ calcolo: 1, numero: 1 }));
  const g = R.giroDi(streamers.get(ch).settings);
  g.voci.calcolo.distanza = 60;
  g.voci.numero.distanza = 60;
  statoVivo.scrivi(ch, 'giro-ultimi', { calcolo: Date.now() - 10 * 60_000 });
  const dopo = await import('../../src/features/giro-giochi.js?riavvio=1');
  assert.deepEqual(dopo.candidati(ch, g, {}).map((c) => c.id), ['numero']);
});

test('chi aveva i tre orologi ritrova le stesse frequenze in media', () => {
  const vecchi = { manche: { attivo: true, minMin: 15, maxMin: 45 }, giochiConf: { boss: { ogni: 30 }, arena: { ogni: 60 } } };
  const g = R.giroDi(vecchi);
  const somma = R.VOCI.reduce((t, v) => t + g.voci[v.id].peso, 0);
  const allOra = (ids) => ids.reduce((t, id) => t + g.voci[id].peso, 0) / somma * 60 / ((g.min + g.max) / 2);
  const vicino = (a, b, nome) => assert.ok(Math.abs(a - b) / b < 0.05, `${nome}: ${a} contro ${b}`);
  vicino(allOra(R.TIPI_MANCHE), 60 / 30, 'le manche');
  vicino(allOra(['boss']), 60 / 30, 'il boss');
  vicino(allOra(['arena']), 60 / 60, 'l\'arena');
  assert.equal(g.voci.boss.distanza, 30, 'il boss non arriva piu\' spesso di prima');
  assert.equal(g.voci.arena.distanza, 60);
  assert.ok(g.attivo);
  const manche = R.giroDi({ manche: { attivo: true, minMin: 20, maxMin: 40, soloLive: true }, giochiConf: { manche: { tipi: ['rebus', 'calcolo'] } } });
  assert.deepEqual([manche.min, manche.max, manche.soloLive], [20, 40, true], 'solo le manche: gli stessi tempi');
  assert.deepEqual(R.VOCI.filter((v) => manche.voci[v.id].peso).map((v) => v.id).sort(), ['calcolo', 'rebus']);
  const niente = R.giroDi({});
  assert.equal(niente.attivo, false);
  assert.ok(R.TIPI_MANCHE.every((t) => niente.voci[t].peso === R.PESO_MANCHE), 'accenderlo e\' accendere le manche di prima');
  assert.equal(niente.voci.boss.peso, 0);
  const salvato = R.giroDi({ giro: { attivo: false }, manche: { attivo: true } });
  assert.equal(salvato.attivo, false, 'un giro salvato vince su quello di prima');
});

test('la resa legge la distanza vera', () => {
  const s = (giro) => ({ giro });
  const conBoss = { attivo: true, min: 10, max: 20, voci: { boss: { peso: 5, distanza: 60 } } };
  assert.equal(G.contestoDi(s(conBoss)).bossMinuti, 60, 'la distanza del boss');
  assert.equal(G.contestoDi(s({ ...conBoss, voci: { boss: { peso: 5, distanza: 0 } } })).bossMinuti, 10, 'senza distanza, il giro');
  assert.equal(G.contestoDi(s({ ...conBoss, attivo: false })).bossMinuti, 0, 'giro spento');
  assert.equal(G.contestoDi(s({ ...conBoss, voci: { boss: { peso: 0, distanza: 60 } } })).bossMinuti, 0, 'senza peso');
  assert.equal(G.contestoDi(s({ attivo: true, min: 8, max: 9, voci: { rebus: { peso: 1, distanza: 30 }, calcolo: { peso: 1, distanza: 0 } } })).mancheMinuti, 8, 'le manche: la piu\' corta');
  const r = G.catalogoPerPannello(s(conBoss)).giochi.find((x) => x.id === 'boss').resaOra;
  assert.equal(r.ogni, 60);
  assert.equal(r.perOra, Math.round(r.massimo * 60 / 60));
});

test('i numeri del pannello stanno nei loro limiti', () => {
  const g = R.normalizza({ attivo: true, min: 0, max: -3, chatMin: 99, voci: { boss: { peso: 400, distanza: -1 }, inventato: { peso: 3 } } });
  assert.deepEqual([g.min, g.max, g.chatMin], [1, 1, 30]);
  assert.deepEqual(g.voci.boss, { peso: 100, distanza: 0 });
  assert.equal(g.voci.inventato, undefined, 'una voce che non c\'e\' non passa');
  assert.deepEqual(Object.keys(g.voci), R.VOCI.map((v) => v.id), 'ogni voce, nell\'ordine');
  assert.deepEqual(R.percentuali(R.normalizza({ voci: Object.fromEntries(R.VOCI.map((v) => [v.id, { peso: v.id === 'boss' ? 2 : v.id === 'arena' ? 1 : 0 }])) })), { boss: 66.7, arena: 33.3 });
});

test('il ritmo detto nel pannello e\' vero anche per un giro piu\' lento di un\'ora', () => {
  assert.deepEqual(R.ritmo(R.normalizza({ min: 15, max: 45 })), { perOra: [1, 4] });
  assert.deepEqual(R.ritmo(R.normalizza({ min: 7, max: 7 })), { perOra: [9, 9] }, 'in media, arrotondato: ogni 7 minuti sono quasi 9, non 8');
  assert.deepEqual(R.ritmo(R.normalizza({ min: 60, max: 60 })), { perOra: [1, 1] });
  assert.deepEqual(R.ritmo(R.normalizza({ min: 90, max: 120 })), { minuti: [90, 120] }, 'piu\' lento di un\'ora: i minuti, non «da 1 a 1»');
  assert.deepEqual(R.ritmo(R.normalizza({ min: 30, max: 90 })), { minuti: [30, 90] }, 'se il massimo passa l\'ora, in un\'ora puo\' non arrivare niente');
});

// Il giro dentro il bot: lo stesso orologio per tutti, coi suoi tempi generali.
function bot(ch, live) {
  const b = Object.create(BotManager.prototype);
  b.units = new Map([[ch, {}]]);
  b._liveState = new Map([[ch, live]]);
  b._giroProx = new Map();
  b.detti = [];
  b.say = (c, t) => b.detti.push(t);
  b._dettaDaSolo = (c, gioco, t) => b.detti.push(`[${gioco}] ${t}`);
  return b;
}

test('il bot: pianifica, scatta quando e\' l\'ora, e ripianifica fra min e max', () => {
  const ch = canale({ ...soloVoci({ calcolo: 1 }), min: 3, max: 3, chatMin: 0 });
  const b = bot(ch, true);
  b._giro();
  const prox = b._giroProx.get(ch);
  assert.ok(Math.abs(prox - (Date.now() + 3 * 60_000)) < 2000, 'il primo scatto fra tre minuti');
  assert.equal(games.mancheInCorso(ch), null, 'pianificare non e\' scattare');
  b._giroProx.set(ch, 0);
  b._giro();
  assert.ok(games.mancheInCorso(ch), 'e\' scattato');
  assert.match(b.detti[0], /^\[manche\] /, 'la prima riga e\' detta da solo, col suo gioco');
  assert.ok(b._giroProx.get(ch) > Date.now() + 2 * 60_000, 'e ripianifica');
});

test('il bot: spento, a canale spento o a chat ferma non parte niente', () => {
  const spento = canale({ ...soloVoci({ calcolo: 1 }), attivo: false, chatMin: 0 });
  const a = bot(spento, true);
  a._giroProx.set(spento, 0);
  a._giro();
  assert.equal(a._giroProx.has(spento), false, 'spento: niente in programma');
  const live = canale({ ...soloVoci({ calcolo: 1 }), soloLive: true, chatMin: 0 });
  const b = bot(live, false);
  b._giroProx.set(live, 0);
  b._giro();
  assert.equal(games.mancheInCorso(live), null, 'solo in diretta');
  const ferma = canale({ ...soloVoci({ calcolo: 1 }), chatMin: 2 });
  const c = bot(ferma, true);
  c._giroProx.set(ferma, 0);
  memory.logMessage(ferma, 'anna', 'anna', 'ciao');
  c._giro();
  assert.equal(games.mancheInCorso(ferma), null, 'un messaggio nell\'ultimo minuto non basta per due');
  memory.logMessage(ferma, 'bruno', 'bruno', 'eccomi');
  c._giro();
  assert.ok(games.mancheInCorso(ferma), 'due si');
});
