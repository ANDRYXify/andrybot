// L'OBIETTIVO CONTA GLI EVENTI VERI.
//
// Una barra che si riempie e' una promessa: se il numero e' una stima, o si
// azzera da solo la notte, chi guarda se ne accorge e la barra smette di
// significare qualcosa. Qui si verifica che il conto venga dagli eventi che il
// bot vede gia' passare, che sopravviva a un riavvio (sta nelle impostazioni del
// canale) e che a riportarlo a zero sia una scelta, non il tempo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-goal-');
const { streamers } = await import('../../src/db.js');
const { AlertsEngine } = await import('../../src/features/alerts.js');

const CH = 'canale';
streamers.request(CH, 'Canale', '1');

const mandati = [];
const motore = new AlertsEngine({ effects: { emit: (ch, p) => mandati.push(p), hasClients: () => true } });

// Il conto sopravvive a un cambio di configurazione — e' voluto — quindi qui si
// riparte puliti a ogni prova, se no l'ordine dei test cambierebbe i numeri.
const impostaGoal = (...g) => streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), overlayGoals: g, overlayStato: {} });
const conti = () => (streamers.get(CH)?.settings?.overlayStato?.goals) || {};
const evento = (type, data = {}) => motore.onEvent({ channel: CH, type, data: { user_name: 'tizio', ...data } });

test('senza obiettivi accesi non si conta niente', () => {
  impostaGoal({ id: 'g1', attivo: false, tipo: 'follower', obiettivo: 100 });
  evento('channel.follow');
  assert.deepEqual(conti(), {});
});

test('conta solo gli eventi del tipo che hai scelto', () => {
  impostaGoal({ id: 'g1', attivo: true, tipo: 'follower', obiettivo: 100 });
  evento('channel.follow');
  evento('channel.follow');
  evento('channel.subscribe');
  assert.equal(conti().g1, 2, 'i follow contano');
});

test('piu\' obiettivi insieme, ognuno col suo conto', () => {
  impostaGoal(
    { id: 'a', attivo: true, tipo: 'follower', obiettivo: 100 },
    { id: 'b', attivo: true, tipo: 'follower', obiettivo: 500 },
    { id: 'c', attivo: true, tipo: 'sub', obiettivo: 20 },
  );
  evento('channel.follow');
  evento('channel.subscribe');
  assert.equal(conti().a, 1, 'due obiettivi sullo stesso evento crescono insieme');
  assert.equal(conti().b, 1);
  assert.equal(conti().c, 1, 'e quello dei sub va per conto suo');
  assert.equal(conti().a, conti().b, 'una scala di traguardi e\' una cosa sensata');
});

test('i bit contano quanti sono, non uno per volta', () => {
  impostaGoal({ id: 'g1', attivo: true, tipo: 'bit', obiettivo: 5000 });
  evento('channel.cheer', { bits: 500 });
  evento('channel.cheer', { bits: 250 });
  assert.equal(conti().g1, 750, 'un cheer da 500 vale 500');
});

test('il conto sta nelle impostazioni, quindi resta dopo un riavvio', () => {
  impostaGoal({ id: 'g1', attivo: true, tipo: 'sub', obiettivo: 20 });
  evento('channel.subscribe');
  assert.equal(streamers.get(CH).settings.overlayStato.goals.g1, 1, 'e\' scritto dove sopravvive');
  const altro = new AlertsEngine({ effects: { emit: () => {} } });
  altro.onEvent({ channel: CH, type: 'channel.subscribe', data: { user_name: 'tizio' } });
  assert.equal(conti().g1, 2, 'un motore nuovo riprende da dov\'era');
});

test('l\'overlay lo sa subito', () => {
  impostaGoal({ id: 'g1', attivo: true, tipo: 'follower', obiettivo: 10 });
  mandati.length = 0;
  evento('channel.follow');
  const g = mandati.find((m) => m.tipo === 'goal');
  assert.ok(g, 'parte un messaggio per l\'overlay');
  assert.equal(g.conti.g1, conti().g1, 'coi numeri veri');
  assert.equal(g.goals[0].obiettivo, 10, 'e con gli obiettivi');
});

test('si riparte da zero solo se lo chiedi, e uno per volta', () => {
  impostaGoal(
    { id: 'a', attivo: true, tipo: 'follower', obiettivo: 10 },
    { id: 'b', attivo: true, tipo: 'follower', obiettivo: 50 },
  );
  evento('channel.follow');
  assert.equal(conti().a, 1);
  motore.azzeraGoal(CH, 'a');
  assert.equal(conti().a, 0, 'quello che hai scelto riparte');
  assert.equal(conti().b, 1, 'gli altri restano dov\'erano');
  motore.azzeraGoal(CH);
  assert.equal(conti().b, 0, 'senza nome, azzera tutti');
});

test('il tema che legge l\'overlay porta obiettivi e conti', () => {
  impostaGoal({ id: 'g1', attivo: true, tipo: 'follower', obiettivo: 42, titolo: 'Dai che ci siamo' });
  evento('channel.follow');
  const t = motore.tema(CH);
  assert.equal(t.goals[0].obiettivo, 42);
  assert.equal(t.goals[0].titolo, 'Dai che ci siamo');
  assert.equal(t.conti.g1, 1);
});

test('chi aveva l\'obiettivo singolo di prima se lo ritrova, col suo conto', () => {
  const s = streamers.get(CH)?.settings || {};
  delete s.overlayGoals;
  streamers.setSettings(CH, { ...s, overlayGoals: undefined,
    overlayGoal: { attivo: true, tipo: 'sub', obiettivo: 30, titolo: 'Vecchio' },
    overlayStato: { goal: { follower: 0, sub: 7, bit: 0 } } });
  const t = motore.tema(CH);
  assert.equal(t.goals.length, 1, 'diventa il primo della lista');
  assert.equal(t.goals[0].obiettivo, 30);
  assert.equal(t.conti[t.goals[0].id], 7, 'e il conto lo segue');
});
