// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// UN MODULO SOLO PER SCRIVERE IL TEMPO (docs/PREFERENZE.md).
//
// Ogni formato in ogni lingua, l'ora legale, la mezzanotte, le 12 ore e le
// durate: istanti fissi, fusi veri, risposte scritte a mano. Poi le preferenze
// del canale: la base quando non si e' scelto niente, e le scelte ripulite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-formati-');
const { streamers } = await import('../../src/db.js');
const P = await import('../../src/features/preferenze.js');
const F = P.F;
test.after(() => usaEGetta.pulisci());

const SAB = Date.parse('2026-10-03T19:00:00Z');       // sabato 3 ottobre, 21:00 a Roma
const ADESSO = Date.parse('2026-09-30T10:00:00Z');    // mercoledi' 30 settembre, mattina

test('la data e l\'ora di base seguono la lingua', () => {
  assert.equal(F.data(SAB, { lingua: 'it' }), '03/10/2026');
  assert.equal(F.data(SAB, { lingua: 'es' }), '03/10/2026');
  assert.equal(F.data(SAB, { lingua: 'en' }), '10/03/2026');
  assert.equal(F.ora(SAB, { lingua: 'it' }), '21:00');
  assert.equal(F.ora(SAB, { lingua: 'en' }), '9:00 PM');
  assert.equal(F.ora(SAB, { lingua: 'es' }), '21:00');
});

test('ogni formato scelto, in ogni lingua', () => {
  for (const lingua of ['it', 'en', 'es']) {
    assert.equal(F.data(SAB, { lingua, data: 'aaaa-mm-gg' }), '2026-10-03');
    assert.equal(F.data(SAB, { lingua, data: 'gg/mm/aaaa' }), '03/10/2026');
    assert.equal(F.data(SAB, { lingua, data: 'mm/gg/aaaa' }), '10/03/2026');
  }
  assert.equal(F.data(SAB, { lingua: 'it', data: 'esteso' }), '3 ottobre 2026');
  assert.equal(F.data(SAB, { lingua: 'en', data: 'esteso' }), 'October 3, 2026');
  assert.equal(F.data(SAB, { lingua: 'es', data: 'esteso' }), '3 de octubre de 2026');
  assert.equal(F.ora(SAB, { lingua: 'it', ora: '12' }), '9:00 PM');
  assert.equal(F.ora(SAB, { lingua: 'es', ora: '12' }), '9:00 p. m.');
  assert.equal(F.ora(SAB, { lingua: 'en', ora: '24' }), '21:00');
});

test('mezzogiorno e mezzanotte in 12 ore', () => {
  assert.equal(F.ora(Date.parse('2026-10-03T10:00:00Z'), { lingua: 'en' }), '12:00 PM');
  assert.equal(F.ora(Date.parse('2026-10-03T22:00:00Z'), { lingua: 'en' }), '12:00 AM');
  assert.equal(F.ora(Date.parse('2026-10-03T22:05:00Z'), { lingua: 'it' }), '0:05');
});

test('«quando»: oggi, stasera, domani, fra qualche giorno, piu\' in la\'', () => {
  const q = (iso, lingua) => F.quando(Date.parse(iso), { lingua }, { adesso: ADESSO });
  assert.equal(q('2026-09-30T13:00:00Z', 'it'), 'oggi alle 15:00');
  assert.equal(q('2026-09-30T19:30:00Z', 'it'), 'stasera alle 21:30');
  assert.equal(q('2026-09-30T19:30:00Z', 'en'), 'tonight at 9:30 PM');
  assert.equal(q('2026-09-30T19:30:00Z', 'es'), 'esta noche a las 21:30');
  assert.equal(q('2026-10-01T07:00:00Z', 'it'), 'domani alle 9:00');
  assert.equal(q('2026-10-01T07:00:00Z', 'en'), 'tomorrow at 9:00 AM');
  assert.equal(q('2026-10-03T19:00:00Z', 'it'), 'sabato alle 21:00');
  assert.equal(q('2026-10-03T19:00:00Z', 'en'), 'Saturday at 9:00 PM');
  assert.equal(q('2026-10-03T19:00:00Z', 'es'), 'el sábado a las 21:00');
  assert.equal(q('2026-10-20T23:10:00Z', 'it'), 'mercoledì 21 ottobre all\'1:10', 'l\'una vuole l\'apostrofo');
  assert.equal(q('2026-10-20T23:10:00Z', 'es'), 'el miércoles 21 de octubre a la 1:10');
  assert.equal(q('2026-10-20T23:10:00Z', 'en'), 'Wednesday, October 21 at 1:10 AM');
  assert.equal(q('2026-09-29T19:00:00Z', 'it'), 'ieri alle 21:00');
});

test('la mezzanotte cambia il giorno nel fuso del canale, non in quello del server', () => {
  const q = (iso, fuso) => F.quando(Date.parse(iso), { lingua: 'it', fuso }, { adesso: ADESSO });
  assert.equal(q('2026-09-30T21:59:00Z', 'Europe/Rome'), 'stasera alle 23:59');
  assert.equal(q('2026-09-30T22:00:00Z', 'Europe/Rome'), 'domani alle 0:00');
  assert.equal(q('2026-09-30T22:00:00Z', 'America/New_York'), 'stasera alle 18:00');
});

test('l\'ora legale non sposta i giorni ne\' le ore', () => {
  const p = { lingua: 'it', fuso: 'Europe/Rome' };
  const adesso = Date.parse('2026-10-24T22:30:00Z');     // 00:30 del 25, ancora ora legale
  assert.equal(F.quando(Date.parse('2026-10-25T22:30:00Z'), p, { adesso }), 'stasera alle 23:30', 'il 25 dura 25 ore, e resta un giorno');
  assert.equal(F.ora(Date.parse('2026-10-25T00:30:00Z'), p), '2:30');
  assert.equal(F.ora(Date.parse('2026-10-25T01:30:00Z'), p), '2:30', 'le 2:30 capitano due volte, ed e\' giusto');
  assert.equal(F.data(Date.parse('2026-03-29T00:59:00Z'), p), '29/03/2026');
});

test('le durate, per esteso e brevi', () => {
  assert.equal(F.durata(80 * 60000, { lingua: 'it' }), '1 ora e 20 minuti');
  assert.equal(F.durata(60 * 60000, { lingua: 'it' }), '1 ora');
  assert.equal(F.durata(61 * 60000, { lingua: 'en' }), '1 hour and 1 minute');
  assert.equal(F.durata(45000, { lingua: 'es' }), '45 segundos');
  assert.equal(F.durata((2 * 1440 + 3 * 60) * 60000, { lingua: 'it' }), '2 giorni e 3 ore');
  assert.equal(F.durata(80 * 60000, { lingua: 'es', durate: 'brevi' }), '1h 20m');
  assert.equal(F.durata((1440 + 60) * 60000, { lingua: 'en', durate: 'brevi' }), '1d 1h');
});

test('un valore che non esiste non passa: resta la base', () => {
  const v = F.valori({ lingua: 'fr', fuso: 'Marte/Olympus', data: 'boh', ora: '25', settimana: 'mer', durate: 'lunghe' });
  assert.deepEqual(v, { lingua: 'it', fuso: 'Europe/Rome', data: 'gg/mm/aaaa', ora: '24', settimana: 'lun', durate: 'estese' });
  assert.equal(F.primoGiorno({ settimana: 'dom' }), 0);
  assert.equal(F.primoGiorno({}), 1);
});

test('le preferenze del canale: la base quando non si sceglie, la scelta quando c\'e\'', () => {
  streamers.upsertApproved('pref', 'Pref', '51');
  let p = P.preferenzeDi('pref');
  assert.equal(p.lingua, 'it'); assert.equal(p.fuso, 'Europe/Rome'); assert.equal(p.data, 'gg/mm/aaaa'); assert.equal(p.risposta, 'nome');
  streamers.setSettings('pref', { linguaTwitch: 'en', settimana: { giorni: [], fuso: 'America/Chicago' } });
  p = P.preferenzeDi('pref');
  assert.equal(p.lingua, 'en', 'di base, la lingua del canale su Twitch');
  assert.equal(p.data, 'mm/gg/aaaa', 'e la data segue la lingua');
  assert.equal(p.fuso, 'America/Chicago', 'il fuso di base e\' quello della settimana');
  const salvate = P.salvaPreferenze('pref', { lingua: 'es', data: 'esteso', ora: '99', fuso: '', durate: 'brevi', inventata: 'x' });
  assert.deepEqual(salvate, { lingua: 'es', data: 'esteso', durate: 'brevi' }, 'solo scelte valide; «di base» non si scrive');
  p = P.preferenzeDi('pref');
  assert.equal(p.lingua, 'es'); assert.equal(p.ora, '24'); assert.equal(p.fuso, 'America/Chicago');
  assert.equal(streamers.get('pref').settings.linguaTwitch, 'en', 'salvare le preferenze non tocca il resto delle impostazioni');
});

test('da quanto tempo: anni, mesi e giorni di calendario, non divisioni per 365 e 30', () => {
  const ad = Date.parse('2026-09-30T10:00:00Z');
  const t = (iso, lingua = 'it') => F.tempoDa(Date.parse(iso), { lingua }, { adesso: ad });
  assert.equal(t('2021-03-12T18:00:00Z'), '5 anni e 6 mesi');
  assert.equal(t('2021-03-12T18:00:00Z', 'en'), '5 years and 6 months');
  assert.equal(t('2026-08-31T10:00:00Z', 'es'), '30 días', 'dal 31 agosto al 30 settembre sono 30 giorni, non «un mese»');
  assert.equal(t('2024-02-29T12:00:00Z'), '2 anni e 7 mesi');
  assert.equal(t('2025-09-30T09:00:00Z'), '1 anno');
  assert.equal(t('2026-09-29T09:00:00Z'), '1 giorno');
  assert.equal(t('2026-09-30T06:00:00Z', 'en'), '4 hours');
  assert.equal(t('2026-09-30T09:40:00Z'), 'meno di un\'ora');
  assert.equal(t('2026-08-15T10:00:00Z'), '1 mese e 15 giorni');
});
