// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL CONTO ALLA PUBBLICITA' SULL'OVERLAY.
//
// Gli annunci in chat e il conto sull'overlay leggono la stessa pausa, ma non
// dipendono l'uno dall'altro: con la chat zitta il conto c'e' lo stesso, e con
// l'overlay spento a Twitch si chiede solo quello che serve alla chat. Qui si
// prova che:
//
//  · il programma si rilegge quando puo' essere cambiato, e non di piu';
//  · all'overlay arriva la pausa vera: niente fuori diretta, niente tempi
//    passati, e durante la pausa il conto della sua fine;
//  · all'overlay si manda solo quando qualcosa cambia;
//  · il tema porta i titoli di base nella lingua della chat.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-pub-overlay-');
const { streamers, statoVivo } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
const { AlertsEngine } = await import('../../src/features/alerts.js');
const P = await import('../../src/features/pubblicita.js');
process.on('exit', () => usaEGetta.pulisci());

const ORA = Date.parse('2026-09-20T21:00:00.000Z');
const MIN = 60_000;

function canale(login, { chat = false, overlay = true, preferenze } = {}) {
  streamers.upsertApproved(login, login);
  streamers.setSettings(login, {
    pubblicita: { acceso: chat },
    overlayPubblicita: { attivo: overlay },
    ...(preferenze ? { preferenze } : {}),
  });
}

function bot(login, { live = true, programma = () => null } = {}) {
  const detti = [];
  const letture = [];
  const emessi = [];
  const io = Object.create(BotManager.prototype);
  io._pub = new Map();
  io._pubSveglie = new Map();
  io._liveState = new Map([[login, live]]);
  io.effects = { emit: (ch, d) => { if (d?.tipo === 'pubblicita') emessi.push({ ch, ...d }); } };
  io.helix = {
    announce: async (ch, testo) => { detti.push(testo); return { ok: true }; },
    getAdSchedule: async () => { letture.push(Date.now()); return P.programmaDa(programma()); },
  };
  return { io, detti, letture, emessi };
}

test('il programma si rilegge quando puo\' essere cambiato, e non di piu\'', () => {
  const g = (stato) => P.vaGuardatoPerOverlay(stato, ORA);
  assert.equal(g({}), true, 'la prima volta non si sa niente');
  assert.equal(g({ prossima: 0, letto: ORA - 1000 }), false, 'nessuna pausa in programma, letto adesso: la risposta non cambia');
  assert.equal(g({ prossima: 0, letto: ORA - P.RILETTURA_MS }), true, 'ma una lettura vecchia si rifa\'');
  assert.equal(g({ prossima: ORA + 40 * MIN, letto: ORA - 1000 }), false, 'fra quaranta minuti: non si richiede ogni giro');
  assert.equal(g({ prossima: ORA + 2 * P.GIRO_MS, letto: ORA - 1000 }), true, 'vicina: si riguarda, cosi\' uno snooze si vede');
  assert.equal(g({ prossima: ORA + 2 * P.GIRO_MS + 1, letto: ORA - 1000 }), false, 'appena fuori dalla finestra no');
  assert.equal(g({ prossima: ORA - 1000, letto: ORA - 1000 }), true, 'doveva essere gia\' partita: si riguarda');
});

test('finita una pausa il programma si rilegge: Twitch ha messo in programma la prossima', () => {
  const inizio = ORA - 90_000;
  const pausa = { ultimaPausa: String(inizio), secondi: 60, prossima: 0 };
  assert.equal(P.vaGuardatoPerOverlay({ ...pausa, letto: inizio + 10_000 }, ORA), true, 'letto durante la pausa, che adesso e\' finita');
  assert.equal(P.vaGuardatoPerOverlay({ ...pausa, letto: inizio + 70_000 }, ORA), false, 'letto dopo la fine: gia\' fatto');
  assert.equal(P.vaGuardatoPerOverlay({ ...pausa, letto: inizio + 10_000 }, inizio + 30_000), false, 'a pausa in corso no: il conto e\' quello della fine');
  assert.equal(P.vaGuardatoPerOverlay({ ultimaPausa: String(inizio), secondi: 0, prossima: 0, letto: inizio - 1000 }, ORA), true,
    'senza la durata la fine non si sa: si rilegge dopo l\'inizio');
  assert.equal(P.vaGuardatoPerOverlay({ finisceA: ORA - 1000, prossima: 0, letto: ORA - 30_000 }, ORA), true,
    'e la fine ripresa dopo un riavvio vale come quella vista');
});

test('all\'overlay arriva la pausa vera, e nient\'altro', () => {
  const stato = { prossima: ORA + 10 * MIN, finisceA: 0 };
  assert.deepEqual(P.perOverlay(stato, true, ORA), { prossima: ORA + 10 * MIN, pausaFino: 0 });
  assert.deepEqual(P.perOverlay(stato, false, ORA), { prossima: 0, pausaFino: 0 }, 'fuori diretta niente: sarebbe un conto inventato');
  assert.deepEqual(P.perOverlay({ prossima: ORA - 1000 }, true, ORA), { prossima: 0, pausaFino: 0 }, 'una pausa passata non si conta');
  assert.deepEqual(P.perOverlay({ prossima: ORA + 10 * MIN, finisceA: ORA + 30_000 }, true, ORA), { prossima: 0, pausaFino: ORA + 30_000 },
    'durante la pausa, la sua fine; la prossima dopo');
  assert.deepEqual(P.perOverlay({ finisceA: ORA - 1 }, true, ORA), { prossima: 0, pausaFino: 0 }, 'una pausa finita non si conta piu\'');
  assert.deepEqual(P.perOverlay(undefined, true, ORA), { prossima: 0, pausaFino: 0 });
});

test('la pausa conta anche con gli annunci in chat spenti, e la chat resta zitta', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA + 5000 });
  canale('pia', { chat: false, overlay: true });
  const { io, detti, emessi } = bot('pia');
  await io._pubblicitaPartita('pia', { started_at: new Date(ORA).toISOString(), duration_seconds: 90 });
  assert.deepEqual(emessi, [{ ch: 'pia', tipo: 'pubblicita', prossima: 0, pausaFino: ORA + 90_000 }], 'la fine si conta dall\'inizio vero');
  assert.deepEqual(statoVivo.leggi('pia', 'pubblicita'), { prossima: 0, pausaFino: ORA + 90_000 }, 'e resta per un overlay che si apre adesso');
  assert.deepEqual(detti, [], 'la chat era spenta');
  assert.equal(io._pubSveglie.size, 0, 'nessuna sveglia per un «sono tornato» che non si dice');
  t.mock.timers.reset();
});

test('all\'overlay si manda solo quando qualcosa cambia', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('rita');
  let prossima = ORA + 20 * MIN;
  const { io, emessi, letture } = bot('rita', { programma: () => ({ next_ad_at: prossima / 1000, duration: 90 }) });
  await io._giroPubblicita();
  assert.deepEqual(emessi.map((e) => e.prossima), [prossima]);
  t.mock.timers.tick(P.GIRO_MS);
  await io._giroPubblicita();
  assert.equal(letture.length, 1, 'lontana: non si richiede');
  assert.equal(emessi.length, 1, 'e niente di nuovo da mandare');
  t.mock.timers.tick(P.RILETTURA_MS);
  await io._giroPubblicita();
  assert.equal(letture.length, 2, 'la lettura vecchia si rifa\'');
  assert.equal(emessi.length, 1, 'ma se dice la stessa cosa non si manda');
  prossima += 5 * MIN;
  t.mock.timers.tick(P.RILETTURA_MS);
  await io._giroPubblicita();
  assert.deepEqual(emessi.map((e) => e.prossima), [ORA + 20 * MIN, prossima], 'uno snooze sposta il conto');
  io._liveState.set('rita', false);
  await io._giroPubblicita();
  assert.equal(letture.length, 3, 'fuori diretta a Twitch non si chiede');
  assert.deepEqual(emessi.at(-1), { ch: 'rita', tipo: 'pubblicita', prossima: 0, pausaFino: 0 }, 'e il conto sparisce');
  io._liveState.set('rita', true);
  t.mock.timers.tick(P.GIRO_MS);
  await io._giroPubblicita();
  assert.equal(letture.length, 4, 'alla diretta dopo si rilegge subito: quello che si sapeva era della diretta prima');
  assert.equal(emessi.at(-1).prossima, prossima);
  t.mock.timers.reset();
});

test('dopo la pausa il conto riparte dalla prossima, senza aspettare cinque minuti', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('sara');
  let prossima = 0;
  const { io, emessi } = bot('sara', { programma: () => ({ next_ad_at: prossima / 1000, duration: 60 }) });
  await io._giroPubblicita();
  await io._pubblicitaPartita('sara', { started_at: new Date(ORA).toISOString(), duration_seconds: 60 });
  prossima = ORA + 60_000 + 30 * MIN;
  for (let i = 0; i < 3; i++) { t.mock.timers.tick(P.GIRO_MS); await io._giroPubblicita(); }
  assert.deepEqual(emessi.map((e) => [e.prossima, e.pausaFino]), [[0, 0], [0, ORA + 60_000], [prossima, 0]]);
  t.mock.timers.reset();
});

test('con l\'overlay e la chat spenti a Twitch non si chiede niente, e non resta niente', async () => {
  canale('tea', { chat: false, overlay: false });
  const { io, letture, emessi } = bot('tea');
  await io._giroPubblicita();
  await io._pubblicitaPartita('tea', { started_at: new Date(ORA).toISOString(), duration_seconds: 60 });
  assert.equal(letture.length, 0);
  assert.equal(emessi.length, 0);
  assert.equal(io._pub.has('tea'), false);
});

test('il tema porta i titoli di base nella lingua della chat, e quelli scritti restano', () => {
  const al = new AlertsEngine({ effects: { emit() {} } });
  canale('ugo', { preferenze: { lingua: 'en' } });
  assert.equal(al.tema('ugo').pubblicita.titolo, 'Ads in');
  assert.equal(al.tema('ugo').pubblicita.titoloPausa, 'Back in');
  canale('ugo', { preferenze: { lingua: 'es' } });
  assert.equal(al.tema('ugo').pubblicita.titolo, 'Anuncios en');
  streamers.setSettings('ugo', { overlayPubblicita: { attivo: true, titolo: 'Spot fra', titoloPausa: '' } });
  assert.equal(al.tema('ugo').pubblicita.titolo, 'Spot fra');
  assert.equal(al.tema('ugo').pubblicita.titoloPausa, 'Torno fra', 'vuoto vuol dire quello di base');
  canale('vera', { overlay: false });
  streamers.setSettings('vera', {});
  assert.equal(al.tema('vera').pubblicita, null, 'mai acceso, niente');
});

test('il tema porta lo stato di adesso, e uno passato vale come niente', () => {
  const al = new AlertsEngine({ effects: { emit() {} } });
  canale('zoe');
  const ora = Date.now();
  statoVivo.scrivi('zoe', 'pubblicita', { prossima: ora + 10 * MIN, pausaFino: 0 });
  assert.deepEqual(al.tema('zoe').pubblicita.stato, { prossima: ora + 10 * MIN, pausaFino: 0 });
  statoVivo.scrivi('zoe', 'pubblicita', { prossima: ora - 1000, pausaFino: ora - 1000 });
  assert.deepEqual(al.tema('zoe').pubblicita.stato, { prossima: 0, pausaFino: 0 });
});

test('un riavvio a pausa in corso non toglie all\'overlay il conto del ritorno', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('ada', { chat: true, overlay: true });
  statoVivo.scrivi('ada', 'pubblicita', { prossima: 0, pausaFino: ORA + 60_000 });
  const { io, detti, emessi } = bot('ada', { programma: () => ({ next_ad_at: (ORA + 40 * MIN) / 1000, duration: 90 }) });
  await io._giroPubblicita();
  assert.deepEqual(emessi, [], 'la pausa in corso resta quella che l\'overlay sta gia\' contando');
  assert.deepEqual(statoVivo.leggi('ada', 'pubblicita'), { prossima: 0, pausaFino: ORA + 60_000 });
  t.mock.timers.tick(90_000);
  await io._giroPubblicita();
  assert.deepEqual(emessi.map((e) => [e.prossima, e.pausaFino]), [[ORA + 40 * MIN, 0]], 'finita, il conto passa alla prossima');
  assert.deepEqual(detti, [], 'e in chat nessun «sono tornato» in ritardo');
  t.mock.timers.reset();
});

test('dopo un riavvio si riprende solo una pausa che non e\' finita', () => {
  assert.deepEqual(P.riprendi({ prossima: ORA + MIN, pausaFino: ORA + 1000 }, ORA), { finisceA: ORA + 1000 });
  assert.deepEqual(P.riprendi({ pausaFino: ORA - 1 }, ORA), {});
  assert.deepEqual(P.riprendi(null, ORA), {});
});
