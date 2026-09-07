// COSA SOPRAVVIVE A UN RIAVVIO.
//
// Un deploy dura un secondo, una diretta dura ore: il processo muore, la diretta
// no. Tutto quello che un motore teneva acceso in una Map spariva a ogni
// pubblicazione, e tre casi facevano danno vero:
//
// 1. Il GIVEAWAY. Chi aveva scritto !join spariva coi suoi biglietti: si perdeva
//    una cosa che qualcuno si era guadagnato.
// 2. La PENITENZA in corso. Il premio a punti canale era gia' stato pagato, e la
//    sfida si spegneva a meta' senza risultato.
// 3. La SERRANDA dello scudo. Il bot chiude la chat ai soli follower, accende la
//    modalita' lenta e lo Shield Mode, e si segna quali ha acceso lui per poterli
//    rimettere a posto. Quel foglietto stava in memoria: il bot al riavvio
//    tornava in pace e il canale restava CHIUSO, senza piu' nessuno che sapesse
//    riaprirlo.
//
// Il riavvio qui si simula per davvero: un modulo nuovo (import con una chiave
// diversa) o un motore nuovo, che e' esattamente quello che succede a un deploy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('riavvio-');
const { streamers, statoVivo } = await import('../../src/db.js');
const giveaway = await import('../../src/features/giveaway.js');
test.after(() => casa.pulisci());

const CANALE = 'alfa';
streamers.upsertApproved(CANALE, 'Alfa', '1');
streamers.setEnabled(CANALE, true);

test('il giveaway: i biglietti restano nel database, non solo in memoria', () => {
  giveaway.annulla(CANALE);
  giveaway.apri(CANALE, { premio: 'una maglietta' });
  giveaway.partecipa(CANALE, 'lucia', 'Lucia', 1);
  giveaway.partecipa(CANALE, 'marco', 'Marco', 2);
  giveaway.bonus(CANALE, 'lucia', 3);

  const salvato = statoVivo.leggi(CANALE, 'giveaway');
  assert.ok(salvato, 'il giveaway aperto ha una casa fuori dal processo');
  assert.equal(salvato.premio, 'una maglietta');
  const chi = new Map(salvato.partecipanti);
  assert.equal(chi.size, 2);
  assert.equal(chi.get('lucia').bonus, 3, 'anche i biglietti regalati a mano');
  assert.equal(chi.get('marco').base, 2);
});

test('e dopo un riavvio il giveaway e\' ancora aperto, con dentro chi c\'era', async () => {
  giveaway.annulla(CANALE);
  giveaway.apri(CANALE, { premio: 'un abbonamento' });
  giveaway.partecipa(CANALE, 'lucia', 'Lucia', 1);
  giveaway.partecipa(CANALE, 'marco', 'Marco', 1);

  // il deploy: processo nuovo, memoria vuota, stesso database
  const dopo = await import('../../src/features/giveaway.js?riavvio=1');
  const s = dopo.stato(CANALE);

  assert.equal(s.aperto, true, 'il giveaway non si chiude da solo per un deploy');
  assert.equal(s.premio, 'un abbonamento');
  assert.equal(s.partecipanti, 2, 'e chi aveva scritto !join e\' ancora in gara');
});

test('annullare lo toglie anche dal database: non ricompare al riavvio', async () => {
  giveaway.apri(CANALE, { premio: 'niente' });
  giveaway.partecipa(CANALE, 'lucia', 'Lucia', 1);
  giveaway.annulla(CANALE);

  assert.equal(statoVivo.leggi(CANALE, 'giveaway'), null);
  const dopo = await import('../../src/features/giveaway.js?riavvio=2');
  assert.equal(dopo.stato(CANALE).aperto, false);
});

test('la penitenza in corso riprende dov\'era, contatore compreso', async () => {
  const { PenitenzeEngine } = await import('../../src/features/penitenze.js');
  statoVivo.togli(CANALE, 'penitenza');
  const detti = [];
  const primo = new PenitenzeEngine({ say: (ch, t) => detti.push(t) });
  streamers.setSettings(CANALE, { penitenze: { attivo: true, premioVieta: 'vietami una parola', durataMin: 15 } });

  const ok = primo.daRiscatto(CANALE, { reward: { title: 'Vietami una parola' }, user_name: 'Lucia', user_input: 'ciao' });
  assert.equal(ok, true, 'la penitenza parte');
  primo.controllaVoce(CANALE, 'ciao a tutti');
  const prima = primo.stato(CANALE);
  assert.equal(prima.length, 1);
  assert.ok(prima[0].count >= 1, 'il contatore ha segnato');

  const dopo = new PenitenzeEngine({ say: () => {} });
  const ora = dopo.stato(CANALE);
  assert.equal(ora.length, 1, 'la sfida non si spegne per un deploy');
  assert.equal(ora[0].valore, 'ciao');
  assert.equal(ora[0].count, prima[0].count, 'e il contatore riparte da dov\'era');
});

test('una penitenza gia\' scaduta da un pezzo non si riapre', async () => {
  const { PenitenzeEngine } = await import('../../src/features/penitenze.js');
  statoVivo.scrivi(CANALE, 'penitenza', { lista: [
    { id: 9, modo: 'vieta', tipo: 'parola', valore: 'vecchia', chi: 'x', count: 3, scadenza: Date.now() - 5 * 60_000 },
  ] });
  const m = new PenitenzeEngine({ say: () => {} });
  assert.deepEqual(m.stato(CANALE), [], 'niente di scaduto resta in piedi');
});

test('la serranda dello scudo si riapre al primo avvio utile', async () => {
  const { AntiBot } = await import('../../src/features/antibot.js');
  const fatti = [];
  const helix = {
    shieldMode: async (ch, on) => { fatti.push(['shield', on]); return { ok: true }; },
    chatLenta: async (ch, on) => { fatti.push(['lenta', on]); return { ok: true }; },
    chatSoloFollower: async (ch, on) => { fatti.push(['follower', on]); return { ok: true }; },
  };
  statoVivo.scrivi(CANALE, 'serranda', { ripristino: { follower: true, lenta: true, shield: true }, da: Date.now() });

  const m = new AntiBot({ helix, say: () => {} });
  await m._riapriSerrande();

  assert.deepEqual(fatti.sort(), [['follower', false], ['lenta', false], ['shield', false]].sort(),
    'si riapre esattamente quello che era stato chiuso');
  assert.equal(statoVivo.leggi(CANALE, 'serranda'), null, 'e il foglietto si butta solo a cose fatte');
});

test('se Twitch non risponde, la serranda resta segnata e si riprova', async () => {
  const { AntiBot } = await import('../../src/features/antibot.js');
  const helix = {
    shieldMode: async () => ({ ok: false, motivo: 'permesso mancante' }),
    chatLenta: async () => ({ ok: true }),
    chatSoloFollower: async () => ({ ok: true }),
  };
  statoVivo.scrivi(CANALE, 'serranda', { ripristino: { follower: true, shield: true }, da: Date.now() });

  const m = new AntiBot({ helix, say: () => {} });
  await m._riapriSerrande();

  assert.ok(statoVivo.leggi(CANALE, 'serranda'), 'dimenticarsene lascerebbe la chat chiusa per sempre');
});

test('il ritmo che il canale ha imparato non riparte da zero', async () => {
  const antibot = await import('../../src/features/antibot.js');
  statoVivo.scrivi(CANALE, 'ritmo', { medio: 4000, visti: 120 });
  const dopo = await import('../../src/features/antibot.js?riavvio=1');
  const soglia = dopo.sogliaRaffica(CANALE, { rafficaQuanti: 10, rafficaSecondi: 30 });
  assert.ok(soglia > 10, 'con 120 follow visti la soglia e\' quella imparata, non quella dichiarata');
  assert.equal(typeof antibot.sogliaRaffica, 'function');
});
