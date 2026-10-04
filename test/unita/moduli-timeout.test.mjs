// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'AZIONE «TIMEOUT» DEI MODULI. Chiamava `helix.timeout`, che non esiste:
// non faceva niente, e non lo diceva. La porta vera e' `timeoutUser`, la stessa
// della moderazione, che vuole l'id della persona e con 0 secondi fa un ban.
// Qui si prova che il motore chiama solo cose che Helix ha davvero, e che il
// timeout arriva a chi ha fatto scattare il modulo, col suo esito detto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-modtimeout-');
test.after(() => usaEGetta.pulisci());
const { Helix } = await import('../../src/twitch/helix.js');
const { ModulesEngine } = await import('../../src/features/modules.js');

test('ogni funzione di Helix che il motore dei moduli chiama esiste davvero', () => {
  const src = readFileSync(new URL('../../src/features/modules.js', import.meta.url), 'utf8');
  const chiamate = [...new Set([...src.matchAll(/\bhelix\??\.([a-zA-Z_]\w*)/g)].map((m) => m[1]))];
  assert.ok(chiamate.length >= 8, `le chiamate si leggono: ${chiamate.join(', ')}`);
  const mancano = chiamate.filter((m) => typeof Helix.prototype[m] !== 'function');
  assert.deepEqual(mancano, [], 'il motore chiama funzioni che Helix non ha');
});

function motore(esito = { ok: true }) {
  const fatti = [];
  const helix = {
    timeoutUser: async (...a) => { fatti.push(a); return esito; },
    getUserByLogin: async (login) => ({ id: 'id-' + login }),
  };
  return { m: new ModulesEngine({ helix }), fatti };
}
const modulo = (secondi) => ({ id: 1, attivo: true, trigger: { tipo: 'comando', comando: 'x' }, azioni: [{ tipo: 'timeout', secondi }] });
const chat = (extra = {}) => ({ channel: 'canale', user: 'Tizio', userLogin: 'tizio', userId: '42', display: 'Tizio', args: [], argsRaw: '', _livello: 0, staff: false, ...extra });

test('il timeout arriva a chi ha scritto, per id, e mai come ban', async () => {
  const { m, fatti } = motore();
  await m.esegui(modulo(300), chat(), () => {});
  assert.deepEqual(fatti[0].slice(0, 3), ['canale', '42', 300]);
  await m.esegui(modulo(0), chat(), () => {});
  assert.ok(fatti[1][2] >= 1, 'zero secondi non diventa un ban');
  await m.esegui(modulo(9_999_999), chat(), () => {});
  assert.equal(fatti[2][2], 1_209_600, 'al massimo quattordici giorni');
  await m.esegui(modulo(60), chat({ userId: '' }), () => {});
  assert.equal(fatti[3][1], 'id-tizio', 'senza id lo cerca per nome');
});

test('chi ha scritto su Kick si mette in pausa su Kick, mai su Twitch; su YouTube non c\'e\' chi modera', async () => {
  const kick = [];
  const helix = { timeoutUser: async (...a) => { kick.push(['twitch', ...a]); return { ok: true }; }, getUserByLogin: async () => { kick.push(['cerca']); return { id: 'x' }; } };
  const m = new ModulesEngine({ helix, moderatori: { kick: { timeoutUser: async (...a) => { kick.push(['kick', ...a]); return { ok: true }; } } } });
  const detto = [];
  await m.esegui(modulo(300), chat({ piattaforma: 'kick', userId: '42' }), (t) => detto.push(t));
  assert.deepEqual(kick, [['kick', 'canale', '42', 300, 'timeout da un comando del canale']], 'a Kick, coi secondi: i minuti li fa chi parla con Kick');
  await m.esegui(modulo(300), chat({ piattaforma: 'kick', userId: '' }), (t) => detto.push(t));
  assert.equal(kick.length, 1, 'senza id su Kick non si cerca per nome su Twitch');
  await m.esegui(modulo(60), chat({ piattaforma: 'youtube', userId: 'UCabc', staff: true }), (t) => detto.push(t));
  assert.equal(kick.length, 1, 'YouTube: nessuna chiamata');
  assert.match(detto.at(-1), /Su YouTube il timeout/);
  const senza = new ModulesEngine({ helix, moderatori: { kick: { timeoutUser: async () => ({ ok: false, motivo: 'permesso mancante' }) } } });
  await senza.esegui(modulo(60), chat({ piattaforma: 'kick', userId: '42', staff: true }), (t) => detto.push(t));
  assert.match(detto.at(-1), /permessi di moderazione di Kick/, 'allo staff il rimedio di Kick, non quello di Twitch');
});

test('lo streamer non si mette in pausa: timer, voce e prova non fermano nessuno', async () => {
  const { m, fatti } = motore();
  await m.esegui(modulo(60), m._ctxTimer('canale'), () => {});
  await m.esegui(modulo(60), m._ctxVoce('canale', 'basta'), () => {});
  await m.esegui(modulo(60), m._ctxProva('canale'), () => {}, { saltaCondizioni: true });
  assert.equal(fatti.length, 0);
});

test('l\'esito si dice: il permesso che manca, e chi non si puo\' fermare', async () => {
  const detto = [];
  const senza = motore({ ok: false, motivo: 'permesso mancante' });
  await senza.m.esegui(modulo(60), chat({ staff: true }), (t) => detto.push(t));
  await senza.m.esegui(modulo(60), chat(), (t) => detto.push(t));
  assert.match(detto[0], /🔒.*riautorizza/, 'allo staff il rimedio');
  assert.match(detto[1], /🔒/);
  assert.doesNotMatch(detto[1], /riautorizza/, 'al pubblico no');
  const mod = motore({ ok: false, motivo: 'non posso (forse è mod/VIP o sei tu)' });
  await mod.m.esegui(modulo(60), chat(), (t) => detto.push(t));
  assert.match(detto[2], /Tizio.*moderatori e VIP/);
});
