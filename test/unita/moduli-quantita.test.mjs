// LA SCALA DI UN EVENTO.
//
// Certi eventi portano un numero: i Bit di un cheer, gli spettatori di una
// raid, i mesi di un abbonamento. Senza guardarlo, un Bit e cinquemila Bit
// ottengono la stessa identica risposta, e chi alza la posta non compra
// niente di piu'.
//
// Le due cose da non sbagliare:
//  1. un innesco SENZA scala (un comando, un timer) non deve essere fermato da
//     una soglia che non ha niente da misurare;
//  2. dentro un evento CON scala, un numero che non arriva vale ZERO e la
//     soglia lo ferma. Sbagliare di qua fa perdere un effetto, sbagliare di la'
//     lo regala a chi non ha messo niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('modqta-');
const { modules } = await import('../../src/db.js');
const { ModulesEngine, quantitaEvento } = await import('../../src/features/modules.js');
test.after(() => casa.pulisci());

const salva = (condizioni, trigger = { tipo: 'evento', evento: 'cheer' }) =>
  modules.save('alfa', { nome: 'x', trigger, condizioni, azioni: [{ tipo: 'messaggio', testo: 'fatto' }] });

const pulisciModuli = () => { for (const m of modules.list('alfa')) modules.remove('alfa', m.id); };

// Manda un cheer al motore e dice se il modulo e" scattato.
async function cheer(motore, bits) {
  const detti = [];
  await motore.onEvent({ type: 'channel.cheer', channel: 'alfa', data: { user_name: 'tizio', bits } },
    (t) => detti.push(t));
  return detti.length > 0;
}

// --- il numero che porta l"evento ------------------------------------------

test("ogni evento con una scala porta il suo numero, nella sua unita", () => {
  assert.equal(quantitaEvento('cheer', { bits: 100 }), 100);
  assert.equal(quantitaEvento('raid', { viewers: 42 }), 42);
  assert.equal(quantitaEvento('subscribe', { mesi: 3 }), 3);
});

test("un innesco senza scala non ha un quanto da misurare", () => {
  assert.equal(quantitaEvento('follow', {}), null, "un follow non porta nessun numero");
  assert.equal(quantitaEvento('online', {}), null);
  assert.equal(quantitaEvento(null, {}), null, "un comando o un timer nemmeno");
  assert.equal(quantitaEvento('', { bits: 100 }), null);
});

test("dentro un evento con la scala, un numero che non arriva vale zero", () => {
  assert.equal(quantitaEvento('cheer', {}), 0);
  assert.equal(quantitaEvento('cheer', { bits: null }), 0);
  assert.equal(quantitaEvento('cheer', { bits: 'tanti' }), 0);
  assert.equal(quantitaEvento('cheer', { bits: -5 }), 0, "un numero negativo non e una posta");
  assert.equal(quantitaEvento('cheer', { bits: 10.9 }), 10, "niente mezzi Bit");
});

// --- la soglia, letta dal motore -------------------------------------------

test("sotto la soglia il modulo non scatta, da li in su si", async () => {
  pulisciModuli();
  salva({ minQuantita: 100 });
  const mot = new ModulesEngine({});
  assert.equal(await cheer(mot, 99), false);
  assert.equal(await cheer(mot, 100), true, "la soglia e compresa: da 100 IN SU");
  assert.equal(await cheer(mot, 5000), true);
});

test("il tetto chiude la fascia: e cosi che si scrive una scala", async () => {
  pulisciModuli();
  salva({ minQuantita: 100, maxQuantita: 999 });
  const mot = new ModulesEngine({});
  assert.equal(await cheer(mot, 99), false);
  assert.equal(await cheer(mot, 500), true);
  assert.equal(await cheer(mot, 1000), false, "sopra il tetto tocca allo scaglione dopo");
});

test("senza soglie un cheer da 1 fa scattare il modulo come prima", async () => {
  pulisciModuli();
  salva({});
  const mot = new ModulesEngine({});
  assert.equal(await cheer(mot, 1), true, "i moduli gia scritti non cambiano comportamento");
});

test("una soglia su un innesco senza scala non lo spegne", async () => {
  pulisciModuli();
  salva({ minQuantita: 1000 }, { tipo: 'evento', evento: 'follow' });
  const detti = [];
  await new ModulesEngine({}).onEvent({ type: 'channel.follow', channel: 'alfa', data: { user_name: 'tizio' } },
    (t) => detti.push(t));
  assert.equal(detti.length, 1, "un follow non porta un numero: la soglia non ha nulla da giudicare");
});

test("chi resta fuori dalla fascia non brucia il cooldown di chi ci entra", async () => {
  pulisciModuli();
  salva({ minQuantita: 1000, cooldown: 3600 });
  const mot = new ModulesEngine({});
  assert.equal(await cheer(mot, 10), false, "dieci Bit non erano per questo modulo");
  assert.equal(await cheer(mot, 1000), true,
    "e non devono aver consumato la pausa di chi mille Bit li ha messi davvero");
});

// --- quello che entra nel database -----------------------------------------

const pulite = (condizioni) => {
  const id = modules.save('beta', { nome: 'x', trigger: { tipo: 'evento', evento: 'cheer' }, condizioni, azioni: [] });
  return modules.get('beta', id).condizioni;
};

test("zero vuol dire nessun limite, e sparisce", () => {
  const c = pulite({ minQuantita: 0, maxQuantita: 0 });
  assert.equal(c.minQuantita, undefined);
  assert.equal(c.maxQuantita, undefined, "un tetto a zero fermerebbe tutto invece di non fermare niente");
});

test("un tetto piu basso del pavimento si butta, e il modulo resta vivo", () => {
  const c = pulite({ minQuantita: 1000, maxQuantita: 100 });
  assert.equal(c.minQuantita, 1000, "il pavimento e la parte voluta di una scala");
  assert.equal(c.maxQuantita, undefined, "il tetto che contraddice la base e un refuso, non una fascia");
});

test("i numeri assurdi vengono ricondotti a qualcosa di sensato", () => {
  assert.equal(pulite({ minQuantita: -50 }).minQuantita, undefined, "una soglia negativa non e una soglia");
  assert.equal(pulite({ minQuantita: 999_999_999 }).minQuantita, 10_000_000);
  assert.equal(pulite({ minQuantita: 'centomila' }).minQuantita, undefined);
  assert.equal(pulite({ minQuantita: 10.6 }).minQuantita, 11, "niente mezze soglie");
});

test("una fascia vera si conserva, e non tocca le altre condizioni", () => {
  const c = pulite({ minQuantita: 100, maxQuantita: 999, tier: 'mod', cooldown: 30, probabilita: 50 });
  assert.equal(c.minQuantita, 100);
  assert.equal(c.maxQuantita, 999);
  assert.equal(c.tier, 'mod');
  assert.equal(c.cooldown, 30);
  assert.equal(c.probabilita, 50);
});
