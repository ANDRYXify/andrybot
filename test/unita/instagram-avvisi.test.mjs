// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUALI POST DI INSTAGRAM SI ANNUNCIANO (docs/INSTAGRAM.md, «Gli avvisi dei
// post»): l'ultimo pubblicato si sceglie per data e non per posizione, e il
// segno dice fin dove e' gia' stato tutto annunciato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ordinaPost, daAnnunciare, segnoDi, MAX_AVVISI } from '../../src/features/instagram.js';

const ORA = Date.UTC(2026, 9, 22, 12);
const min = 60_000;
const post = (id, primaMin, extra = {}) => ({ id, caption: 'c' + id, permalink: 'https://www.instagram.com/p/' + id, timestamp: new Date(ORA - primaMin * min).toISOString(), ...extra });

test('il post piu\' nuovo e\' quello per data, anche se Instagram ne mette prima uno fissato', () => {
  const l = ordinaPost([post('fissato', 60 * 24 * 30), post('reel', 5), post('vecchio', 60 * 24)]);
  assert.deepEqual(l.map((p) => p.id), ['reel', 'vecchio', 'fissato']);
  const r = daAnnunciare(l, segnoDi(ORA - 60 * min));
  assert.deepEqual(r.nuovi.map((p) => p.id), ['reel'], 'col primo della lista il reel non si sarebbe mai visto');
  assert.equal(r.segno, segnoDi(ORA - 5 * min));
  assert.deepEqual(daAnnunciare(l, r.segno).nuovi, [], 'il giro dopo non lo riannuncia');
});

test('mai controllato: si segna e non si annuncia niente; collegato adesso: si annuncia quello che esce dopo', () => {
  const l = ordinaPost([post('a', 30), post('b', 90)]);
  assert.deepEqual(daAnnunciare(l, ''), { nuovi: [], segno: segnoDi(ORA - 30 * min) });
  const collegato = segnoDi(ORA - 60 * min);
  assert.deepEqual(daAnnunciare(l, collegato).nuovi.map((p) => p.id), ['a'], 'il post uscito dopo il collegamento si annuncia anche se il controllo arriva tardi');
});

test('il segno di prima (solo l\'id) vale la data di quel post; se non c\'e\' piu\' si riparte senza raffiche', () => {
  const l = ordinaPost([post('c', 10), post('b', 20), post('a', 30)]);
  assert.deepEqual(daAnnunciare(l, 'b').nuovi.map((p) => p.id), ['c']);
  assert.deepEqual(daAnnunciare(l, 'sparito'), { nuovi: [], segno: segnoDi(ORA - 10 * min) });
});

test('al massimo tre per giro, dal piu\' vecchio; un post cancellato non sposta indietro il segno', () => {
  const l = ordinaPost(Array.from({ length: 6 }, (_, i) => post('p' + i, 10 + i)));
  const r = daAnnunciare(l, segnoDi(ORA - 60 * min));
  assert.equal(r.nuovi.length, MAX_AVVISI);
  assert.deepEqual(r.nuovi.map((p) => p.id), ['p2', 'p1', 'p0'], 'i tre piu\' recenti, in ordine di uscita');
  const dopo = daAnnunciare(ordinaPost([post('p1', 11)]), r.segno);
  assert.deepEqual(dopo, { nuovi: [], segno: r.segno });
});
