// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA DIRETTA SU KICK (docs/PIATTAFORME.md, «La diretta su Kick»), dal bot:
//  · l'evento e il giro dicono la stessa diretta: si annuncia una volta;
//  · un riavvio a diretta in corso non la riannuncia, ma la serata riparte;
//  · gli spettatori del giro finiscono nel rapporto, come quelli di Twitch;
//  · la fine chiude il rapporto solo se non resta nessuno in onda;
//  · «in onda» per il canale vuol dire su una piattaforma qualunque.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-diretta-kick-');
const { streamers, statoVivo } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
const rapporto = await import('../../src/features/rapporto.js');
process.on('exit', () => usaEGetta.pulisci());

// due ore fa: un inizio nel futuro il rapporto non lo prende (giustamente)
const INIZIO = Date.now() - 2 * 3_600_000;

// Un bot senza costruttore: si contano gli annunci e i rapporti, il resto tace.
function bot() {
  const io = Object.create(BotManager.prototype);
  io._liveState = new Map();
  io.annunci = [];
  io.rapporti = [];
  io.annunciaDiretta = async (d) => { io.annunci.push(d); };
  io._chiudiDiscord = async () => {};
  io._rapportoDiretta = async (ch) => { io.rapporti.push(rapporto.chiudi(ch)); };
  io._storiaDellaDiretta = async () => {};
  io._scriviInOnda = () => {};
  return io;
}
let n = 0;
const canale = () => { const c = `kickdiretta${++n}`; streamers.upsertApproved(c, c); return c; };

test('l\'evento e il giro dicono la stessa diretta: un avviso solo, e la serata si apre su Kick', async () => {
  const ch = canale();
  const io = bot();
  io.annunciaDiretta = async (d) => { io.annunci.push(d); };
  await io.eventoEsterno({ piattaforma: 'kick', channel: ch, tipo: 'live', titolo: 'Si gioca', inizio: INIZIO });
  await io._setLiveAltrove(ch, 'kick', true, { inizio: INIZIO, titolo: 'Si gioca' }, 'giro');
  await io.eventoEsterno({ piattaforma: 'kick', channel: ch, tipo: 'live', titolo: 'Si gioca', inizio: INIZIO });
  assert.equal(statoVivo.leggi(ch, 'diretta:kick')?.live, true);
  assert.equal(statoVivo.leggi(ch, 'diretta:kick')?.da, INIZIO, 'l\'inizio e\' quello che dice Kick');
  assert.ok(io.annunci.length <= 1, `annunciata ${io.annunci.length} volte`);
  assert.deepEqual(rapporto.inOndaSu(ch), ['kick']);
  assert.equal(io.inOnda(ch), true, 'il canale e\' in onda anche se Twitch no');
  rapporto.osservaGiro(ch, { piattaforma: 'kick', spettatori: 42 });
  assert.equal(rapporto.inCorso(ch).picco, 42);
});

test('un riavvio a diretta in corso non la riannuncia, e la serata riparte da Kick', async () => {
  const ch = canale();
  statoVivo.scrivi(ch, 'diretta:kick', { live: true, da: INIZIO });
  const io = bot();
  await io._setLiveAltrove(ch, 'kick', true, { inizio: INIZIO, titolo: '' }, 'giro');
  assert.equal(io.annunci.length, 0, 'il «prima» e\' quello sul disco');
  assert.deepEqual(rapporto.inOndaSu(ch), ['kick'], 'la serata in memoria e\' rinata');
  assert.equal(rapporto.inCorso(ch).inizio, INIZIO, 'e dall\'inizio vero');
});

test('dopo un riavvio il primo giro a vuoto non chiude: il «prima» e\' quello sul disco', async () => {
  const ch = canale();
  statoVivo.scrivi(ch, 'diretta:kick', { live: true, da: INIZIO });
  const io = bot();
  await io._setLiveAltrove(ch, 'kick', false, {}, 'giro');
  assert.equal(statoVivo.leggi(ch, 'diretta:kick')?.live, true, 'la memoria appena nata non sa niente, il disco si\'');
  assert.equal(io.rapporti.length, 0, 'nessun rapporto di una serata che non e\' finita');
  assert.equal(io.inOnda(ch), true);
});

test('la fine di Kick chiude la serata solo se non resta nessuno in onda', async () => {
  const ch = canale();
  const io = bot();
  await io._setLiveAltrove(ch, 'kick', true, { inizio: INIZIO }, 'evento');
  io._liveState.set(ch, true);   // e' in onda anche su Twitch
  await io._setLiveAltrove(ch, 'kick', false, {}, 'evento');
  assert.equal(io.rapporti.length, 0, 'Twitch e\' ancora in onda: la serata continua');
  assert.equal(statoVivo.leggi(ch, 'diretta:kick'), null, 'Kick pero\' e\' finita');
  assert.equal(io.inOnda(ch), true);

  const due = canale();
  const solo = bot();
  await solo._setLiveAltrove(due, 'kick', true, { inizio: INIZIO }, 'evento');
  rapporto.osservaGiro(due, { piattaforma: 'kick', spettatori: 7 });
  await solo._setLiveAltrove(due, 'kick', false, {}, 'evento');
  assert.equal(solo.rapporti.length, 1, 'solo Kick: la sua fine e\' la fine della serata');
  assert.equal(solo.rapporti[0].picco, 7);
  assert.deepEqual(solo.rapporti[0].piattaforme.map((x) => x.piattaforma), ['kick']);
  assert.equal(solo.inOnda(due), false);
});

test('un giro che non la vede una volta non la chiude', async () => {
  const ch = canale();
  const io = bot();
  await io._setLiveAltrove(ch, 'kick', true, { inizio: INIZIO }, 'evento');
  await io._setLiveAltrove(ch, 'kick', false, {}, 'giro');
  assert.equal(statoVivo.leggi(ch, 'diretta:kick')?.live, true, 'un «non c\'e\'» del giro da solo non e\' una fine');
  assert.equal(io.rapporti.length, 0);
});

test('una piattaforma che il bot non conosce non apre niente', async () => {
  const ch = canale();
  const io = bot();
  await io._setLiveAltrove(ch, 'myspace', true, { inizio: INIZIO }, 'evento');
  assert.equal(statoVivo.leggi(ch, 'diretta:myspace'), null);
  assert.equal(io.inOnda(ch), false);
});
