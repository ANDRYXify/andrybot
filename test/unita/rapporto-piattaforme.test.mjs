// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// UNA SERATA, PIU' PIATTAFORME (docs/STATISTICHE.md): chi trasmette insieme su
// Twitch e su Kick fa una serata sola, che si apre col primo «in onda» e si
// chiude con l'ultimo «fine». Dentro, ogni piattaforma tiene i suoi numeri:
//  · il picco della serata e' il massimo della SOMMA presa nello stesso
//    momento, non la somma dei picchi;
//  · la media della serata e' la somma delle medie pesate sul tempo in onda;
//  · un numero vecchio non entra nella somma, una piattaforma finita nemmeno;
//  · una piattaforma che si ferma e riparte nella stessa serata tiene il tratto
//    di prima;
//  · il testo nomina le piattaforme solo quando sono piu' d'una.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-rapporto-piattaforme-');
const { streamers } = await import('../../src/db.js');
const r = await import('../../src/features/rapporto.js');
process.on('exit', () => usaEGetta.pulisci());

const MIN = 60_000;
const T0 = Date.parse('2026-10-04T19:00:00Z');
let n = 0;
const canale = () => { const c = `multi${++n}`; streamers.upsertApproved(c, c); return c; };

test('il picco della serata e\' la somma nello stesso momento, non la somma dei picchi', () => {
  const ch = canale();
  r.apri(ch, { inizio: T0, ora: T0, piattaforma: 'twitch' });
  r.apri(ch, { inizio: T0, ora: T0, piattaforma: 'kick' });
  r.osservaGiro(ch, { piattaforma: 'twitch', spettatori: 100, ora: T0 + 2 * MIN });
  r.osservaGiro(ch, { piattaforma: 'kick', spettatori: 10, ora: T0 + 3 * MIN });
  r.osservaGiro(ch, { piattaforma: 'twitch', spettatori: 50, ora: T0 + 4 * MIN });
  r.osservaGiro(ch, { piattaforma: 'kick', spettatori: 80, ora: T0 + 5 * MIN });
  const c = r.inCorso(ch, { ora: T0 + 6 * MIN });
  assert.equal(c.picco, 130, '50 su Twitch e 80 su Kick nello stesso giro');
  assert.notEqual(c.picco, 180, 'non 100 + 80, che non ci sono mai stati insieme');
  assert.equal(c.piattaforme.find((x) => x.piattaforma === 'twitch').picco, 100);
  assert.equal(c.piattaforme.find((x) => x.piattaforma === 'kick').picco, 80);
});

test('la media della serata pesa ogni piattaforma sul suo tempo in onda', () => {
  const ch = canale();
  r.apri(ch, { inizio: T0, ora: T0, piattaforma: 'twitch' });
  r.osservaGiro(ch, { piattaforma: 'twitch', spettatori: 100, ora: T0 + 30 * MIN });
  r.apri(ch, { inizio: T0 + 60 * MIN, ora: T0 + 60 * MIN, piattaforma: 'kick' });
  r.osservaGiro(ch, { piattaforma: 'kick', spettatori: 20, ora: T0 + 90 * MIN });
  r.osservaGiro(ch, { piattaforma: 'twitch', spettatori: 100, ora: T0 + 90 * MIN });
  const c = r.chiudi(ch, { ora: T0 + 120 * MIN });
  // Twitch 120 minuti a 100, Kick 60 minuti a 20: (100*120 + 20*60) / 120
  assert.equal(c.media, 110);
  assert.equal(c.durataMs, 120 * MIN, 'la serata va dal primo «in onda» all\'ultimo «fine»');
  assert.equal(c.piattaforme.find((x) => x.piattaforma === 'kick').durataMs, 60 * MIN);
});

test('una serata solo su Kick ha i numeri di Kick', () => {
  const ch = canale();
  r.apri(ch, { inizio: T0, ora: T0, piattaforma: 'kick' });
  r.osservaGiro(ch, { piattaforma: 'kick', spettatori: 12, categoria: 'Just Chatting', ora: T0 + 2 * MIN });
  r.osservaGiro(ch, { piattaforma: 'kick', spettatori: 18, ora: T0 + 4 * MIN });
  const c = r.chiudi(ch, { ora: T0 + 10 * MIN });
  assert.deepEqual([c.picco, c.media, c.giri], [18, 15, 2]);
  assert.deepEqual(c.piattaforme.map((x) => x.piattaforma), ['kick']);
  assert.deepEqual(c.categorie, [{ nome: 'Just Chatting', giri: 1 }]);
});

test('un numero vecchio non entra nella somma, e nemmeno una piattaforma finita', () => {
  const ch = canale();
  r.apri(ch, { inizio: T0, ora: T0, piattaforma: 'twitch' });
  r.apri(ch, { inizio: T0, ora: T0, piattaforma: 'kick' });
  r.osservaGiro(ch, { piattaforma: 'kick', spettatori: 90, ora: T0 + MIN });
  // il numero di Kick ha piu' di FRESCO_MS: non e' di questo giro
  r.osservaGiro(ch, { piattaforma: 'twitch', spettatori: 20, ora: T0 + MIN + r.FRESCO_MS + 1 });
  assert.equal(r.inCorso(ch, { ora: T0 + 20 * MIN }).picco, 90, '20 da solo non batte 90, e 90 + 20 non c\'e\' mai stato');
  r.osservaGiro(ch, { piattaforma: 'kick', spettatori: 90, ora: T0 + 21 * MIN });
  r.chiudiPiattaforma(ch, 'kick', { ora: T0 + 22 * MIN });
  r.osservaGiro(ch, { piattaforma: 'twitch', spettatori: 60, ora: T0 + 23 * MIN });
  assert.equal(r.inCorso(ch, { ora: T0 + 23 * MIN }).picco, 90, 'Kick finita non si somma piu\': 60 da solo, non 60 + 90');
  assert.deepEqual(r.inOndaSu(ch), ['twitch']);
});

test('una piattaforma che si ferma e riparte nella stessa serata tiene il tratto di prima', () => {
  const ch = canale();
  r.apri(ch, { inizio: T0, ora: T0, piattaforma: 'kick' });
  r.apri(ch, { inizio: T0, ora: T0, piattaforma: 'twitch' });
  r.osservaGiro(ch, { piattaforma: 'twitch', spettatori: 40, ora: T0 + 10 * MIN });
  r.chiudiPiattaforma(ch, 'twitch', { ora: T0 + 30 * MIN });
  r.apri(ch, { inizio: T0 + 40 * MIN, ora: T0 + 40 * MIN, piattaforma: 'twitch' });
  r.osservaGiro(ch, { piattaforma: 'twitch', spettatori: 60, ora: T0 + 50 * MIN });
  const c = r.chiudi(ch, { ora: T0 + 60 * MIN });
  const tw = c.piattaforme.find((x) => x.piattaforma === 'twitch');
  assert.equal(tw.durataMs, 50 * MIN, '30 minuti prima, 20 dopo');
  assert.equal(tw.picco, 60); assert.equal(tw.media, 50); assert.equal(tw.inizio, T0, 'comincia quando era cominciata la prima volta');
});

test('la stessa piattaforma con un altro inizio e nessun\'altra in onda e\' una serata nuova', () => {
  const ch = canale();
  r.apri(ch, { inizio: T0, ora: T0, piattaforma: 'kick' });
  r.osservaGiro(ch, { piattaforma: 'kick', spettatori: 300, ora: T0 + MIN });
  const domani = T0 + 24 * 60 * MIN;
  r.apri(ch, { inizio: domani, ora: domani, piattaforma: 'kick' });
  const c = r.inCorso(ch, { ora: domani + MIN });
  assert.equal(c.inizio, domani); assert.equal(c.picco, 0);
});

test('il testo nomina le piattaforme solo quando sono piu\' d\'una', () => {
  const base = { durataMs: 120 * MIN, persone: 3, messaggi: 9, giri: 4, picco: 130, media: 110 };
  assert.ok(!/Twitch|Kick/.test(r.testo({ ...base, piattaforme: [{ piattaforma: 'kick', durataMs: 120 * MIN, picco: 130, media: 110, giri: 4 }] })), 'una sola: la serata e\' quella');
  const due = { ...base, piattaforme: [
    { piattaforma: 'twitch', durataMs: 120 * MIN, picco: 100, media: 100, giri: 3 },
    { piattaforma: 'kick', durataMs: 60 * MIN, picco: 80, media: 20, giri: 2 },
  ] };
  assert.match(r.cornice(due), /in onda 2h 00m su Twitch e Kick,/);
  assert.match(r.testo(due), /Twitch: 2h 00m, picco 100, in media 100 · Kick: 1h 00m, picco 80, in media 20/);
  assert.match(r.html(due), /Kick/);
  assert.ok(!/Twitch|Kick/.test(r.cornice(base)), 'i rapporti di prima, senza piattaforme, restano come erano');
});
