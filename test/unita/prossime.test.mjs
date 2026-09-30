// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LE PROSSIME DIRETTE, DA UNA FONTE SOLA (docs/PREFERENZE.md).
//
// La settimana o il Programma di Twitch, mai tutti e due: una risposta sola a
// «quando sei in diretta?». E se la fonte e' il Programma, la settimana non ci
// scrive sopra e non ci toglie niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-prossime-');
const { streamers } = await import('../../src/db.js');
const X = await import('../../src/features/prossime.js');
test.after(() => usaEGetta.pulisci());

const MER = Date.parse('2026-09-30T10:00:00Z');   // mercoledi' mattina, Roma
// lunedi' (0) e sabato (5) in onda alle 21:00, il resto spento
const giorni = Array.from({ length: 7 }, (_, i) => (i === 0 || i === 5 ? { ora: '21:00', att: i ? 'Elden Ring' : 'Chiacchiere' } : { ora: '', att: '' }));
const SETT = { giorni, dura: 180, fuso: 'Europe/Rome', twitch: { acceso: false, categorie: { 'elden ring': { id: '1', name: 'ELDEN RING' } } } };

test('dalla settimana: le prossime in ordine, con titolo, categoria e fine', () => {
  const d = X.daSettimana(SETT, 3, MER);
  assert.deepEqual(d.map((x) => new Date(x.inizio).toISOString()), ['2026-10-03T19:00:00.000Z', '2026-10-05T19:00:00.000Z', '2026-10-10T19:00:00.000Z']);
  assert.equal(d[0].titolo, 'Elden Ring'); assert.equal(d[0].categoria, 'ELDEN RING');
  assert.equal(d[0].fine - d[0].inizio, 180 * 60000);
  assert.equal(d[1].categoria, '', 'una sera senza categoria trovata non ne inventa una');
});

test('l\'ora legale non sposta la sera: le 21:00 restano le 21:00 a Roma', () => {
  const d = X.daSettimana(SETT, 4, Date.parse('2026-10-20T10:00:00Z'));
  assert.deepEqual(d.map((x) => new Date(x.inizio).toISOString()),
    ['2026-10-24T19:00:00.000Z', '2026-10-26T20:00:00.000Z', '2026-10-31T20:00:00.000Z', '2026-11-02T20:00:00.000Z']);
});

test('dal Programma: gli annullati e i finiti non ci sono', () => {
  const seg = [
    { start_time: '2026-10-02T18:00:00Z', end_time: '2026-10-02T20:00:00Z', title: 'annullata', canceled_until: '2026-10-03T00:00:00Z', category: null },
    { start_time: '2026-09-30T08:00:00Z', end_time: '2026-09-30T09:00:00Z', title: 'finita', category: null },
    { start_time: '2026-10-04T18:00:00Z', end_time: '2026-10-04T20:00:00Z', title: 'dopo', category: { name: 'Tetris' } },
    { start_time: '2026-09-30T09:30:00Z', end_time: '2026-09-30T12:00:00Z', title: 'in corso', category: null },
  ];
  const d = X.daProgramma(seg, 5, MER);
  assert.deepEqual(d.map((x) => x.titolo), ['in corso', 'dopo']);
  assert.equal(d[1].categoria, 'Tetris');
});

test('la fonte e\' una: la scelta, poi la settimana se ha sere, poi il Programma su Twitch', async () => {
  streamers.upsertApproved('fonte1', 'Fonte1', '61');
  assert.equal(X.fonteDi('fonte1'), 'twitch', 'settimana vuota, canale su Twitch: il Programma');
  streamers.setSettings('fonte1', { settimana: SETT });
  assert.equal(X.fonteDi('fonte1'), 'settimana', 'con delle sere, la settimana');
  streamers.setSettings('fonte1', { settimana: SETT, preferenze: { fonteProssime: 'twitch' } });
  assert.equal(X.fonteDi('fonte1'), 'twitch', 'la scelta vince');
  let chiesto = 0;
  const helix = { programma: async () => { chiesto++; return { ok: true, segmenti: [{ start_time: '2026-10-01T18:00:00Z', end_time: '2026-10-01T20:00:00Z', title: 'dal programma', category: null }] }; } };
  const r = await X.prossimeDirette('fonte1', 2, { helix, adesso: MER });
  assert.equal(r.fonte, 'twitch'); assert.deepEqual(r.dirette.map((x) => x.titolo), ['dal programma']);
  await X.prossimeDirette('fonte1', 2, { helix, adesso: MER + 60000 });
  assert.equal(chiesto, 1, 'tenuto da parte: una domanda a Twitch ogni quarto d\'ora');
  X.dimenticaProgramma('fonte1');
  await X.prossimeDirette('fonte1', 2, { helix, adesso: MER + 120000 });
  assert.equal(chiesto, 2, 'e dimenticato quando lo streamer lo cambia');
  streamers.upsertApproved('kick.fonte2', 'Fonte2', 'k2');
  streamers.setSettings('kick.fonte2', { preferenze: { fonteProssime: 'twitch' } });
  assert.equal(X.fonteDi('kick.fonte2'), 'settimana', 'su Kick un Programma non c\'e\'');
});

test('un Programma che non si legge si dice, non diventa un\'altra fonte', async () => {
  streamers.upsertApproved('fonte3', 'Fonte3', '63');
  streamers.setSettings('fonte3', { settimana: SETT, preferenze: { fonteProssime: 'twitch' } });
  const r = await X.prossimeDirette('fonte3', 1, { helix: { programma: async () => ({ ok: false, errore: 'manca il permesso', permesso: true }) }, adesso: MER });
  assert.equal(r.fonte, 'twitch'); assert.equal(r.dirette.length, 0); assert.equal(r.permesso, true);
});

test('il Programma e\' dello streamer solo se l\'ha scelto: la settimana allora non ci scrive e non ci toglie', () => {
  streamers.upsertApproved('fonte4', 'Fonte4', '64');
  assert.equal(X.programmaDelloStreamer('fonte4'), false, 'settimana vuota non vuol dire Programma suo: i nostri segmenti si tolgono ancora');
  streamers.setSettings('fonte4', { preferenze: { fonteProssime: 'twitch' } });
  assert.equal(X.programmaDelloStreamer('fonte4'), true);
  const BOT = readFileSync(new URL('../../src/bot.js', import.meta.url), 'utf8');
  const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  const giro = BOT.slice(BOT.indexOf('async _giroProgramma() {'), BOT.indexOf('sincronizzaProgramma(this.helix'));
  assert.ok(giro.includes('prossime.programmaDelloStreamer(s.login)'), 'il giro di fondo non scrive sul Programma dello streamer');
  const salva = SRV.slice(SRV.indexOf("app.post('/api/streamer/settimana'"), SRV.indexOf('settimana.sincronizzaProgramma(helix, login, sett)'));
  assert.ok(salva.includes('if (prossime.programmaDelloStreamer(login))'), 'e nemmeno il salvataggio della settimana');
});
