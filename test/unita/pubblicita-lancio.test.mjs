// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE PUBBLICITA' LANCIATE A MANO.
//
// Una pausa lanciata a mano (dalla regia, da Twitch, da un altro programma) e'
// una pausa come le altre: l'evento di Twitch arriva per tutte. Quella lanciata
// dalla regia in piu' si sa prima: subito, come stima, o con un anticipo, come
// appuntamento. Qui si prova che:
//
//  · la stima e l'evento della stessa pausa sono UNA pausa: un annuncio, un
//    «sono tornato», e i tempi di Twitch quando arrivano;
//  · l'appuntamento conta sull'overlay, avvisa la chat una volta, e parte
//    all'istante fissato;
//  · l'appuntamento si consuma quando lo si annulla, quando un'altra pausa
//    comincia prima, quando la diretta finisce, quando Twitch dice di no;
//  · regge un riavvio, ma non riparte in ritardo;
//  · i limiti (durata, anticipo, attesa di Twitch, pausa in corso) si dicono
//    prima, non all'istante fissato.
// Il ragionamento sta in docs/PUBBLICITA.md, «Le pubblicita' lanciate a mano».
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-pub-lancio-');
const { streamers, statoVivo } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
const P = await import('../../src/features/pubblicita.js');
process.on('exit', () => usaEGetta.pulisci());

const ORA = Date.parse('2026-10-07T21:00:00.000Z');
const MIN = 60_000;
const iso = (t) => new Date(t).toISOString();
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r)); };

const FRASI = {
  'pubblicita-prima': { modo: 'sue', frasi: ['fra poco {secondi}'] },
  'pubblicita-parte': { modo: 'sue', frasi: ['parte {secondi}'] },
  'pubblicita-dopo': { modo: 'sue', frasi: ['eccomi'] },
};

function canale(login, { chat = true, overlay = true, prima = true } = {}) {
  streamers.upsertApproved(login, login);
  streamers.setSettings(login, {
    pubblicita: { acceso: chat, quanto: 60, prima: { acceso: prima } },
    overlayPubblicita: { attivo: overlay },
    voce: { momenti: FRASI },
  });
}

// Un bot senza costruttore, con un Twitch finto che lancia come quello vero:
// la durata chiesta, e l'attesa prima della prossima.
function bot(login, { live = true, twitch } = {}) {
  const detti = [];
  const emessi = [];
  const lanci = [];
  const io = Object.create(BotManager.prototype);
  io._pub = new Map();
  io._pubSveglie = new Map();
  io._liveState = new Map([[login, live]]);
  io.effects = { emit: (ch, d) => { if (d?.tipo === 'pubblicita') emessi.push({ t: Date.now(), prossima: d.prossima, pausaFino: d.pausaFino }); } };
  io.helix = {
    announce: async (ch, testo) => { detti.push({ t: Date.now(), testo }); return { ok: true }; },
    getAdSchedule: async () => P.programmaDa(null),
    startCommercial: async (ch, secondi) => {
      lanci.push({ t: Date.now(), secondi });
      return twitch ? twitch(ch, secondi) : { ok: true, length: secondi, retry: 480 };
    },
  };
  return { io, detti, emessi, lanci };
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

const ultimo = (emessi) => emessi[emessi.length - 1];

// ── Il modello ────────────────────────────────────────────────────────────

test('la stima e l\'evento della stessa pausa sono una pausa sola', () => {
  const stima = { ultimaPausa: String(ORA), secondi: 60, finisceA: ORA + 60_000, stima: true };
  const ev = (t, s = 60) => ({ started_at: iso(t), duration_seconds: s });
  const dopo = P.pausaDa(ev(ORA + 800), stima, ORA + 1000);
  assert.equal(dopo.stessa, true, 'l\'evento sopra la stima e\' la stessa pausa');
  assert.equal(dopo.inizio, ORA + 800, 'e ne porta l\'inizio vero');
  assert.equal(dopo.finisceA, ORA + 60_800, 'e la fine vera');
  assert.equal(P.allaPartenza({ acceso: true, durante: { acceso: true } }, stima, ev(ORA + 800), ORA + 1000).dire, false, 'e non si annuncia di nuovo');

  const evento = { ultimaPausa: String(ORA + 800), secondi: 60, finisceA: ORA + 60_800, stima: false };
  assert.equal(P.pausaDa({ started_at: iso(ORA), duration_seconds: 60 }, evento, ORA + 1200, { stima: true }), null,
    'la stima che arriva dopo l\'evento non tocca niente');
  assert.equal(P.pausaDa(ev(ORA + 800), evento, ORA + 2000), null, 'l\'evento rimandato e\' un doppione');
  const nuova = P.pausaDa(ev(ORA + 30_000), evento, ORA + 30_000);
  assert.equal(nuova?.stessa, false, 'fra due eventi decide l\'inizio: un inizio diverso e\' una pausa nuova');

  assert.equal(P.pausaDa(ev(ORA + 60_000), stima, ORA + 60_000)?.stessa, false, 'attaccata alla fine della stima e\' un\'altra');
  assert.equal(P.pausaDa(ev(ORA + 20 * MIN), stima, ORA + 20 * MIN)?.stessa, false, 'lontana e\' un\'altra');
  assert.equal(P.pausaDa({ started_at: iso(ORA), duration_seconds: 60 }, stima, ORA + 500, { stima: true }), null, 'la stessa stima due volte e\' un doppione');
  assert.equal(P.pausaDa({ started_at: iso(ORA + 10 * MIN), duration_seconds: 60 }, stima, ORA + 10 * MIN, { stima: true })?.stessa, false,
    'una stima nuova e\' una pausa nuova');
  const senzaDurata = { ultimaPausa: String(ORA), secondi: 0, finisceA: 0, stima: true };
  assert.equal(P.pausaDa(ev(ORA + 800), senzaDurata, ORA + 1000)?.stessa, false,
    'una stima senza fine non copre niente: l\'evento e\' una pausa da annunciare');
});

test('l\'overlay conta verso la prima pausa, in programma o lanciata', () => {
  const stato = { prossima: ORA + 10 * MIN, lancio: { quando: ORA + 2 * MIN, secondi: 60 } };
  assert.deepEqual(P.perOverlay(stato, true, ORA), { prossima: ORA + 2 * MIN, pausaFino: 0 }, 'il lancio viene prima');
  assert.deepEqual(P.perOverlay({ ...stato, prossima: ORA + MIN }, true, ORA), { prossima: ORA + MIN, pausaFino: 0 }, 'il programma viene prima');
  assert.deepEqual(P.perOverlay({ lancio: { quando: ORA + MIN, secondi: 60 } }, true, ORA), { prossima: ORA + MIN, pausaFino: 0 }, 'col solo lancio');
  assert.deepEqual(P.perOverlay({ lancio: { quando: ORA - 1, secondi: 60 } }, true, ORA), { prossima: 0, pausaFino: 0 }, 'un lancio passato no');
  assert.deepEqual(P.perOverlay(stato, false, ORA), { prossima: 0, pausaFino: 0 }, 'fuori diretta niente');
  assert.deepEqual(P.perOverlay({ ...stato, finisceA: ORA + 30_000 }, true, ORA), { prossima: 0, pausaFino: ORA + 30_000 }, 'durante una pausa, la sua fine');
});

test('l\'appuntamento regge un riavvio, ma non riparte in ritardo', () => {
  const l = { quando: ORA + MIN, secondi: 90, detto: true };
  assert.deepEqual(P.riprendi(null, ORA, l), { lancio: l }, 'futuro: si riprende, col preavviso gia\' detto');
  assert.deepEqual(P.riprendi(null, ORA + MIN, l), {}, 'arrivato mentre il bot era fermo: no');
  assert.deepEqual(P.riprendi({ pausaFino: ORA + 5000 }, ORA, l), { finisceA: ORA + 5000, lancio: l }, 'insieme alla pausa in corso');
  assert.equal(P.lancioDa({ quando: ORA, secondi: 999 }), null, 'una durata che non e\' una durata non si lancia');
  assert.equal(P.lancioDa({ secondi: 60 }), null, 'senza istante niente');
  assert.equal(P.lancioDa('storto'), null);
  assert.deepEqual(P.lancioDa({ quando: String(ORA), secondi: '60' }), { quando: ORA, secondi: 60, detto: false });
});

test('i limiti del lancio si dicono prima', () => {
  const v = (b, c = {}) => P.lancioValido(b, { live: true, ...c }, ORA);
  assert.deepEqual(v({ secondi: 10 }), { secondi: P.LANCIO_MIN_DURATA, fra: 0, quando: ORA }, 'meno di trenta secondi Twitch non ne fa');
  assert.equal(v({ secondi: 999 }).secondi, P.LANCIO_MAX_DURATA, 'piu\' di tre minuti nemmeno');
  assert.equal(v({ secondi: 'x' }).secondi, 60, 'una durata storta e\' un minuto');
  assert.equal(v({ secondi: 60, fra: 9999 }).fra, P.LANCIO_MAX_S, 'l\'anticipo ha un tetto');
  assert.equal(v({ secondi: 60, fra: -5 }).fra, 0);
  assert.deepEqual(P.lancioValido({ fra: 60 }, { live: false }, ORA), { errore: 'senza-diretta' }, 'un appuntamento si prende solo a diretta vista');
  assert.equal(P.lancioValido({ fra: 0 }, { live: false }, ORA).errore, undefined, 'il lancio di adesso lo decide Twitch');
  assert.deepEqual(v({ fra: 60 }, { prossimoLancioDa: ORA + 2 * MIN }), { errore: 'presto', da: ORA + 2 * MIN }, 'prima dell\'attesa di Twitch no');
  assert.deepEqual(v({ fra: 0 }, { prossimoLancioDa: ORA + 1000 }), { errore: 'presto', da: ORA + 1000 }, 'nemmeno adesso');
  assert.equal(v({ fra: 120 }, { prossimoLancioDa: ORA + 2 * MIN }).errore, undefined, 'all\'istante giusto si');
  assert.deepEqual(v({ fra: 30 }, { pausaFino: ORA + MIN }), { errore: 'in-pausa', da: ORA + MIN }, 'dentro la pausa in corso no');
  assert.equal(v({ fra: 0 }, { pausaFino: ORA + MIN }).errore, undefined, 'ma il lancio di adesso lo decide Twitch');
  assert.equal(v({ fra: 60 }, { pausaFino: ORA + MIN }).errore, undefined, 'alla sua fine si');
});

test('un preavviso solo, per la prima pausa', () => {
  const conf = P.normalizzaPubblicita({ acceso: true, quanto: 60 });
  const prog = { prossima: ORA + 50_000, durata: 90 };
  assert.equal(P.preavviso(conf, { lancio: { quando: ORA + 30_000, secondi: 60 } }, prog, ORA), null, 'il lancio viene prima: avvisa lui');
  assert.equal(P.preavviso(conf, { lancio: { quando: ORA + 50_000, secondi: 60 } }, prog, ORA), null, 'nello stesso istante avvisa lui');
  assert.ok(P.preavviso(conf, { lancio: { quando: ORA + 55_000, secondi: 60 } }, prog, ORA), 'dopo: il programma avvisa per la sua');
  const l = { quando: ORA + 30_000, secondi: 60, detto: false };
  assert.deepEqual(P.preavvisoLancio(conf, { lancio: l }, ORA), { quando: ORA + 30_000, secondi: 60 });
  assert.equal(P.preavvisoLancio(conf, { lancio: l, prossima: ORA + 20_000 }, ORA), null, 'la pausa in programma viene prima e lo consuma');
  assert.equal(P.preavvisoLancio(conf, { lancio: { ...l, detto: true } }, ORA), null, 'una volta');
  assert.equal(P.preavvisoLancio(P.normalizzaPubblicita({ acceso: true, prima: { acceso: false } }), { lancio: l }, ORA), null, 'non se la chat lo tace');
});

// ── Il bot ────────────────────────────────────────────────────────────────

test('lancio di adesso: il conto parte subito, l\'evento di Twitch lo corregge senza ripeterlo', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('ada');
  const { io, detti, emessi, lanci } = bot('ada');
  const r = await io.lanciaPubblicita('ada', { secondi: 60, fra: 0 });
  assert.deepEqual(r, { ok: true, length: 60, retry: 480 });
  assert.deepEqual(lanci, [{ t: ORA, secondi: 60 }]);
  assert.deepEqual(ultimo(emessi), { t: ORA, prossima: 0, pausaFino: ORA + 60_000 }, 'il conto della fine, dall\'istante della richiesta');
  assert.deepEqual(detti.map((d) => d.testo), ['parte 60'], 'annunciata una volta');
  await avanti(t, 1000);
  await io._pubblicitaPartita('ada', { started_at: iso(ORA + 700), duration_seconds: 60 });
  assert.deepEqual(detti.map((d) => d.testo), ['parte 60'], 'l\'evento della stessa pausa non si ripete');
  assert.deepEqual(statoVivo.leggi('ada', 'pubblicita'), { prossima: 0, pausaFino: ORA + 60_700 }, 'e il conto prende la fine vera');
  assert.equal(io.statoLancio('ada').prossimoLancioDa, ORA + 480_000, 'e la regia sa quando Twitch ne permette un\'altra');
  await avanti(t, 59_699);
  assert.equal(detti.length, 1, 'alla fine della stima non si torna: la fine vera e\' quella di Twitch');
  await avanti(t, 1);
  assert.deepEqual(detti.map((d) => [d.t, d.testo]), [[ORA, 'parte 60'], [ORA + 60_700, 'eccomi']], 'il ritorno alla fine vera');
  await avanti(t, 2 * MIN);
  assert.equal(detti.length, 2, 'una volta');
  t.mock.timers.reset();
});

test('l\'evento di Twitch arrivato prima della risposta: la stima non cambia niente', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('bea');
  // La risposta di Twitch tarda, e intanto arriva l'evento della pausa.
  const g = bot('bea', { twitch: async () => {
    t.mock.timers.tick(600);
    await g.io._pubblicitaPartita('bea', { started_at: iso(ORA + 400), duration_seconds: 90 });
    return { ok: true, length: 90, retry: 480 };
  } });
  await g.io.lanciaPubblicita('bea', { secondi: 90 });
  assert.deepEqual(g.detti.map((d) => d.testo), ['parte 90'], 'una pausa, un annuncio');
  assert.deepEqual(statoVivo.leggi('bea', 'pubblicita'), { prossima: 0, pausaFino: ORA + 90_400 }, 'coi tempi di Twitch');
  t.mock.timers.reset();
});

test('appuntamento: il conto, il preavviso una volta, e il lancio all\'istante fissato', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('cia');
  const { io, detti, emessi, lanci } = bot('cia');
  const r = await io.lanciaPubblicita('cia', { secondi: 90, fra: 120 });
  assert.deepEqual(r, { ok: true, quando: ORA + 2 * MIN, secondi: 90 });
  assert.deepEqual(ultimo(emessi), { t: ORA, prossima: ORA + 2 * MIN, pausaFino: 0 }, 'l\'overlay conta verso il lancio');
  assert.deepEqual(statoVivo.leggi('cia', 'pubblicita-lancio'), { quando: ORA + 2 * MIN, secondi: 90, detto: false }, 'e regge un riavvio');
  await avanti(t, 59_000);
  assert.equal(detti.length, 0, 'un secondo prima del preavviso, niente');
  await avanti(t, 1000);
  assert.deepEqual(detti.map((d) => [d.t, d.testo]), [[ORA + MIN, 'fra poco 90']], 'a «quanto» secondi dal lancio');
  assert.equal(statoVivo.leggi('cia', 'pubblicita-lancio').detto, true, 'e detto resta detto anche dopo un riavvio');
  await avanti(t, 59_000);
  assert.equal(lanci.length, 0, 'un secondo prima, Twitch non e\' chiamato');
  await avanti(t, 1000);
  assert.deepEqual(lanci, [{ t: ORA + 2 * MIN, secondi: 90 }], 'all\'istante fissato');
  assert.deepEqual(ultimo(emessi), { t: ORA + 2 * MIN, prossima: 0, pausaFino: ORA + 2 * MIN + 90_000 });
  assert.deepEqual(detti.map((d) => d.testo), ['fra poco 90', 'parte 90']);
  assert.equal(statoVivo.leggi('cia', 'pubblicita-lancio'), null, 'l\'appuntamento e\' consumato');
  assert.deepEqual(io.statoLancio('cia').esito, { ok: true, secondi: 90, a: ORA + 2 * MIN });
  await avanti(t, 5 * MIN);
  assert.equal(lanci.length, 1, 'e una volta sola');
  t.mock.timers.reset();
});

test('Twitch dice di no: l\'appuntamento sparisce dal conto, e si sa perche\'', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('dea');
  const { io, detti, emessi, lanci } = bot('dea', { twitch: () => ({ ok: false, codice: 'offline', motivo: 'devi essere in diretta' }) });
  await io.lanciaPubblicita('dea', { secondi: 60, fra: 30 });
  await avanti(t, 30_000);
  assert.equal(lanci.length, 1);
  assert.deepEqual(ultimo(emessi), { t: ORA + 30_000, prossima: 0, pausaFino: 0 }, 'il conto non resta a zero ad aspettare');
  assert.equal(io.statoLancio('dea').esito.motivo, 'offline');
  assert.equal(io.statoLancio('dea').lancio, null);
  assert.equal(statoVivo.leggi('dea', 'pubblicita-lancio'), null);
  assert.ok(!detti.some((d) => d.testo.startsWith('parte')), 'e in chat non si dice una pausa che non c\'e\'');
  t.mock.timers.reset();
});

test('annullato: niente lancio, niente preavviso, niente conto', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('eva');
  const { io, detti, emessi, lanci } = bot('eva');
  await io.lanciaPubblicita('eva', { secondi: 60, fra: 300 });
  await avanti(t, 10_000);
  assert.deepEqual(io.annullaLancio('eva'), { ok: true });
  assert.deepEqual(ultimo(emessi), { t: ORA + 10_000, prossima: 0, pausaFino: 0 });
  assert.equal(statoVivo.leggi('eva', 'pubblicita-lancio'), null);
  assert.deepEqual(io.annullaLancio('eva'), { ok: false }, 'due volte non si annulla niente');
  await avanti(t, 6 * MIN);
  assert.equal(lanci.length, 0);
  assert.equal(detti.length, 0);
  t.mock.timers.reset();
});

test('un\'altra pausa che comincia prima consuma l\'appuntamento', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('fede');
  const { io, detti, lanci } = bot('fede');
  await io.lanciaPubblicita('fede', { secondi: 60, fra: 300 });
  await avanti(t, 30_000);
  await io._pubblicitaPartita('fede', { started_at: iso(ORA + 30_000), duration_seconds: 90, is_automatic: true });
  assert.equal(io.statoLancio('fede').lancio, null);
  assert.equal(io.statoLancio('fede').esito.motivo, 'prima');
  await avanti(t, 6 * MIN);
  assert.equal(lanci.length, 0, 'una seconda pausa subito dopo nessuno la vuole, e Twitch la rifiuterebbe');
  assert.deepEqual(detti.map((d) => d.testo), ['parte 90', 'eccomi']);
  t.mock.timers.reset();
});

test('la diretta finisce prima: l\'appuntamento non resta appeso', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('gea');
  const { io, lanci } = bot('gea');
  await io.lanciaPubblicita('gea', { secondi: 60, fra: 120 });
  io._liveState.set('gea', false);
  await io._giroPubblicita();
  assert.equal(io.statoLancio('gea').lancio, null);
  assert.equal(io.statoLancio('gea').esito.motivo, 'finita');
  assert.equal(statoVivo.leggi('gea', 'pubblicita-lancio'), null);
  await avanti(t, 3 * MIN);
  assert.equal(lanci.length, 0);
  t.mock.timers.reset();
});

test('con chat e scena spente l\'appuntamento si tiene: lo ha chiesto lo streamer', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('ida', { chat: false, overlay: false });
  const { io, detti, emessi, lanci } = bot('ida');
  await io.lanciaPubblicita('ida', { secondi: 30, fra: 60 });
  await io._giroPubblicita();
  await avanti(t, MIN);
  assert.deepEqual(lanci, [{ t: ORA + MIN, secondi: 30 }]);
  assert.equal(detti.length, 0, 'la chat zitta');
  assert.equal(emessi.length, 0, 'la scena spenta');
  assert.equal(io.statoLancio('ida').pausaFino, ORA + MIN + 30_000, 'e la regia sa della pausa in corso');
  await io._giroPubblicita();
  assert.equal(io.statoLancio('ida').prossimoLancioDa, ORA + MIN + 480_000, 'e l\'attesa di Twitch resta per la regia');
  t.mock.timers.reset();
});

test('con chat e scena spente, una pausa che parte prima consuma lo stesso l\'appuntamento', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('ugo', { chat: false, overlay: false });
  const { io, lanci } = bot('ugo');
  await io.lanciaPubblicita('ugo', { secondi: 30, fra: 120 });
  await avanti(t, 10_000);
  await io._pubblicitaPartita('ugo', { started_at: iso(ORA + 10_000), duration_seconds: 60, is_automatic: true });
  assert.equal(io.statoLancio('ugo').esito.motivo, 'prima');
  await avanti(t, 3 * MIN);
  assert.equal(lanci.length, 0, 'le regole del lancio non dipendono da chi ascolta');
  t.mock.timers.reset();
});

test('il giro che lascia andare lo stato mentre Twitch risponde non perde l\'esito', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('vera', { chat: false, overlay: false });
  const g = bot('vera', { twitch: async () => { g.io._pub.delete('vera'); return { ok: true, length: 60, retry: 480 }; } });
  await g.io.lanciaPubblicita('vera', { secondi: 60 });
  assert.equal(g.io.statoLancio('vera').prossimoLancioDa, ORA + 480_000);
  assert.equal(g.io.statoLancio('vera').esito.ok, true);
  t.mock.timers.reset();
});

test('dopo un riavvio l\'appuntamento riparte con la sua sveglia; uno passato no', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('lia');
  statoVivo.scrivi('lia', 'pubblicita-lancio', { quando: ORA + 45_000, secondi: 60, detto: true });
  const { io, detti, lanci } = bot('lia');
  io._statoPubblicita('lia');
  await avanti(t, 45_000);
  assert.deepEqual(lanci, [{ t: ORA + 45_000, secondi: 60 }], 'all\'istante fissato, non al primo giro');
  assert.deepEqual(detti.map((d) => d.testo), ['parte 60'], 'il preavviso era gia\' stato detto prima del riavvio');

  canale('max');
  statoVivo.scrivi('max', 'pubblicita-lancio', { quando: ORA + 45_000 - 1, secondi: 60 });
  const b = bot('max');
  b.io._statoPubblicita('max');
  await avanti(t, MIN);
  assert.equal(b.lanci.length, 0, 'passato mentre il bot era fermo: non parte in ritardo');
  assert.equal(statoVivo.leggi('max', 'pubblicita-lancio'), null, 'e non si tiene');
  t.mock.timers.reset();
});

test('annullato subito dopo un riavvio, prima del primo giro: resta annullato', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('nora');
  statoVivo.scrivi('nora', 'pubblicita-lancio', { quando: ORA + MIN, secondi: 60 });
  const { io, lanci } = bot('nora');
  assert.deepEqual(io.annullaLancio('nora'), { ok: true });
  await io._giroPubblicita();
  await avanti(t, 2 * MIN);
  assert.equal(lanci.length, 0);
  t.mock.timers.reset();
});

test('i limiti si dicono subito: attesa di Twitch, pausa in corso, diretta non vista', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('olga');
  const { io, lanci } = bot('olga');
  await io.lanciaPubblicita('olga', { secondi: 60 });
  assert.deepEqual(await io.lanciaPubblicita('olga', { secondi: 60, fra: 30 }), { ok: false, motivo: 'presto', da: ORA + 480_000 });
  assert.deepEqual(await io.lanciaPubblicita('olga', { secondi: 60 }), { ok: false, motivo: 'presto', da: ORA + 480_000 });
  assert.equal(lanci.length, 1, 'Twitch non si chiama per un no che si sa');

  canale('pia');
  const b = bot('pia');
  await b.io._pubblicitaPartita('pia', { started_at: iso(ORA), duration_seconds: 120 });
  assert.deepEqual(await b.io.lanciaPubblicita('pia', { fra: 60 }), { ok: false, motivo: 'in-pausa', da: ORA + 120_000 });
  assert.equal((await b.io.lanciaPubblicita('pia', { fra: 120 })).ok, true, 'alla sua fine si');

  canale('rai');
  const c = bot('rai', { live: false });
  assert.deepEqual(await c.io.lanciaPubblicita('rai', { fra: 60 }), { ok: false, motivo: 'senza-diretta', da: 0 });
  assert.equal((await c.io.lanciaPubblicita('rai', { fra: 0 })).ok, true, 'adesso lo decide Twitch');
  t.mock.timers.reset();
});

test('lancio prima della pausa in programma: in chat un preavviso solo', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: ORA });
  canale('sara');
  const { io, detti } = bot('sara');
  const stato = io._statoPubblicita('sara');
  await io.lanciaPubblicita('sara', { secondi: 60, fra: 90 });
  stato.prossima = ORA + 100_000;
  await avanti(t, 30_000);
  assert.deepEqual(detti.map((d) => d.testo), ['fra poco 60'], 'quello del lancio');
  const conf = io._confPubblicita('sara');
  assert.equal(P.preavviso(conf, stato, { prossima: ORA + 100_000, durata: 90 }, Date.now()), null, 'e quello del programma tace');
  t.mock.timers.reset();
});
