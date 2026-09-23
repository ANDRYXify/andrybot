// LA PUBBLICITA' NEL BOT: le frasi cadono all'istante giusto.
//
// Il modello dice QUANDO; qui si prova che il bot parla proprio allora, con
// l'orologio finto e un Twitch finto che risponde come quello vero (istanti
// del programma in secondi Unix). Il ragionamento sta in docs/PUBBLICITA.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-pub-sveglie-');
const { streamers } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
const P = await import('../../src/features/pubblicita.js');
process.on('exit', () => usaEGetta.pulisci());

const ORA = Date.parse('2026-09-20T21:00:00.000Z');
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r)); };

function canale(login, pubblicita) {
  streamers.upsertApproved(login, login);
  streamers.setSettings(login, { pubblicita: { acceso: true, ...pubblicita } });
}

// Un bot senza costruttore: solo lo stato e i metodi della pubblicita'.
function bot(login, { live = true, programma = () => null } = {}) {
  const detti = [];
  const letture = [];
  const io = Object.create(BotManager.prototype);
  io._pub = new Map();
  io._pubSveglie = new Map();
  io._liveState = new Map([[login, live]]);
  io.helix = {
    announce: async (ch, testo) => { detti.push({ t: Date.now(), testo }); return { ok: true }; },
    getAdSchedule: async () => { letture.push(Date.now()); return P.programmaDa(programma()); },
  };
  return { io, detti, letture };
}

async function avanti(t, ms) {
  let fatto = 0;
  while (fatto < ms) {
    const passo = Math.min(1000, ms - fatto);
    t.mock.timers.tick(passo);
    fatto += passo;
    await flush();
  }
}

test('«sono tornato» cade a inizio + durata, anche con l’evento in ritardo', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA + 5000 });
  canale('anna', {});
  const { io, detti } = bot('anna');
  await io._pubblicitaPartita('anna', { started_at: new Date(ORA).toISOString(), duration_seconds: 30 });
  assert.equal(detti.length, 1);
  assert.match(detti[0].testo, /30 secondi/);
  await avanti(t, 24_000);
  assert.equal(detti.length, 1, 'un secondo prima della fine, ancora niente');
  await avanti(t, 1000);
  assert.equal(detti.length, 2);
  assert.equal(detti[1].t, ORA + 30_000, 'esattamente alla fine della pausa, non trenta secondi dopo l\'arrivo');
  assert.equal(detti[1].testo, 'Eccomi, sono tornato.');
  await avanti(t, 120_000);
  assert.equal(detti.length, 2, 'e una volta sola');
});

test('una pausa nuova prende il posto della vecchia: un «sono tornato» solo', async (t) => {
  // Che finisca prima o dopo di quella che sostituisce.
  for (const [nome, seconda] of [['giulio', 30], ['ivo', 120]]) {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
    canale(nome, { dopo: { testo: 'fine di {secondi}' } });
    const { io, detti } = bot(nome);
    await io._pubblicitaPartita(nome, { started_at: new Date(ORA).toISOString(), duration_seconds: 90 });
    await avanti(t, 10_000);
    await io._pubblicitaPartita(nome, { started_at: new Date(ORA + 10_000).toISOString(), duration_seconds: seconda });
    await avanti(t, 200_000);
    const fini = detti.filter((d) => d.testo.startsWith('fine'));
    assert.deepEqual(fini.map((d) => [d.t, d.testo]), [[ORA + 10_000 + seconda * 1000, `fine di ${seconda}`]], `seconda da ${seconda}s`);
    t.mock.timers.reset();
  }
});

test('a diretta finita durante la pausa, il ritorno non si dice', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('carla', {});
  const { io, detti } = bot('carla');
  await io._pubblicitaPartita('carla', { started_at: new Date(ORA).toISOString(), duration_seconds: 60 });
  io._liveState.set('carla', false);
  await avanti(t, 90_000);
  assert.equal(detti.length, 1, 'solo «pubblicità per 60 secondi»');
});

test('una sveglia che suona in anticipo non si mangia il ritorno', async (t) => {
  // Le sveglie contano col tempo della macchina, il modello con l'orologio:
  // se l'orologio viene rimesso indietro, una sveglia puo' arrivare «prima».
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('luca', {});
  const { io, detti } = bot('luca');
  await io._pubblicitaPartita('luca', { started_at: new Date(ORA).toISOString(), duration_seconds: 60 });
  await avanti(t, 30_000);
  await io._sonoTornato('luca');
  assert.equal(detti.length, 1, 'a meta\' pausa non si dice');
  await avanti(t, 30_000);
  assert.equal(detti.length, 2, 'e alla fine si dice lo stesso');
  assert.equal(detti[1].t, ORA + 60_000);
});

test('il preavviso cade a «quanto» secondi, con la durata del programma', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('dario', { quanto: 60, prima: { testo: 'fra un minuto, {durata} di pubblicità' } });
  const prossima = ORA + 100_000;
  const { io, detti, letture } = bot('dario', { programma: () => ({ next_ad_at: prossima / 1000, duration: 90 }) });
  await io._giroPubblicita();
  await avanti(t, 30_000);
  await io._giroPubblicita();
  assert.equal(letture.length, 2, 'due giri dentro la finestra, due letture');
  await avanti(t, 9_000);
  assert.equal(detti.length, 0);
  await avanti(t, 1000);
  assert.deepEqual(detti, [{ t: prossima - 60_000, testo: 'fra un minuto, 1:30 di pubblicità' }]);
  assert.equal(letture.length, 3, 'alla sveglia il programma si rilegge, una volta: la sveglia e\' una sola anche se due giri l\'hanno puntata');
  await io._giroPubblicita();
  await avanti(t, 30_000);
  assert.equal(detti.length, 1, 'e non si ripete');
});

test('uno snooze fra la sveglia e la pausa: il preavviso non si dice', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('elena', { quanto: 60 });
  let prossima = ORA + 100_000;
  const { io, detti } = bot('elena', { programma: () => ({ next_ad_at: prossima / 1000, duration: 90 }) });
  await io._giroPubblicita();
  prossima += 300_000;
  await avanti(t, 45_000);
  assert.equal(detti.length, 0, 'la pausa non e\' piu\' fra un minuto');
});
