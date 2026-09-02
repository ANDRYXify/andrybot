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

const impostaGoal = (g) => streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), overlayGoal: g });
const conti = () => (streamers.get(CH)?.settings?.overlayStato?.goal) || {};
const evento = (type, data = {}) => motore.onEvent({ channel: CH, type, data: { user_name: 'tizio', ...data } });

test('senza obiettivo acceso non si conta niente', () => {
  impostaGoal({ attivo: false, tipo: 'follower', obiettivo: 100 });
  evento('channel.follow');
  assert.deepEqual(conti(), {});
});

test('conta solo gli eventi del tipo che hai scelto', () => {
  impostaGoal({ attivo: true, tipo: 'follower', obiettivo: 100 });
  evento('channel.follow');
  evento('channel.follow');
  evento('channel.subscribe');
  assert.equal(conti().follower, 2, 'i follow contano');
  assert.equal(conti().sub || 0, 0, 'i sub no, non e\' il tipo scelto');
});

test('i bit contano quanti sono, non uno per volta', () => {
  impostaGoal({ attivo: true, tipo: 'bit', obiettivo: 5000 });
  evento('channel.cheer', { bits: 500 });
  evento('channel.cheer', { bits: 250 });
  assert.equal(conti().bit, 750, 'un cheer da 500 vale 500');
});

test('il conto sta nelle impostazioni, quindi resta dopo un riavvio', () => {
  impostaGoal({ attivo: true, tipo: 'sub', obiettivo: 20 });
  evento('channel.subscribe');
  const salvato = streamers.get(CH).settings.overlayStato.goal.sub;
  assert.equal(salvato, 1, 'e\' scritto dove sopravvive');
  const altro = new AlertsEngine({ effects: { emit: () => {} } });
  altro.onEvent({ channel: CH, type: 'channel.subscribe', data: { user_name: 'tizio' } });
  assert.equal(conti().sub, 2, 'un motore nuovo riprende da dov\'era');
});

test('l\'overlay lo sa subito', () => {
  impostaGoal({ attivo: true, tipo: 'follower', obiettivo: 10 });
  mandati.length = 0;
  evento('channel.follow');
  const g = mandati.find((m) => m.tipo === 'goal');
  assert.ok(g, 'parte un messaggio per l\'overlay');
  assert.equal(g.valore, conti().follower, 'col numero vero');
  assert.equal(g.cfg.obiettivo, 10, 'e col traguardo');
});

test('si riparte da zero solo se lo chiedi', () => {
  impostaGoal({ attivo: true, tipo: 'follower', obiettivo: 10 });
  evento('channel.follow');
  assert.ok(conti().follower > 0);
  motore.azzeraGoal(CH);
  assert.equal(conti().follower, 0);
  assert.equal(conti().sub, 0, 'azzera tutti i tipi, non solo quello acceso');
});

test('il tema che legge l\'overlay porta obiettivo e conto', () => {
  impostaGoal({ attivo: true, tipo: 'follower', obiettivo: 42, titolo: 'Dai che ci siamo' });
  evento('channel.follow');
  const t = motore.tema(CH);
  assert.equal(t.goal.obiettivo, 42);
  assert.equal(t.goal.titolo, 'Dai che ci siamo');
  assert.equal(t.stato.goal.follower, 1);
});
