// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ANTISPAM SU KICK (docs/PIATTAFORME.md, «La moderazione su Kick»):
//  · chi modera e' quello della piattaforma del messaggio: helix su Twitch,
//    Kick su Kick solo coi permessi di moderazione, nessuno su YouTube;
//  · un link al proprio canale su Kick non e' spam;
//  · in chat si dice solo quello che e' successo: un messaggio che non si e'
//    potuto togliere non si dice «rimosso», e una pausa rifiutata non si
//    annuncia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('andrybot-kick-antispam-');
const { streamers } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
const K = await import('../../src/kick/api.js');
const { SCOPE, SCOPE_MOD } = await import('../../src/kick/auth.js');
const antispam = await import('../../src/features/antispam.js');
process.on('exit', () => casa.pulisci());

const TOK = (scopes) => ({ accessToken: 't', refreshToken: '', scopes, expiresAt: Date.now() + 3_600_000 });
const bot = () => { const b = Object.create(BotManager.prototype); b.helix = { nome: 'helix' }; b._kickVisto = new Map(); return b; };

test('chi modera e\' quello della piattaforma del messaggio, e solo coi permessi', () => {
  const b = bot();
  K.salvaToken('kick.conmod', TOK([...SCOPE, ...SCOPE_MOD]), '1');
  K.salvaToken('kick.senzamod', TOK(SCOPE), '2');
  assert.equal(b.moderatoreDi({ channel: 'tizio' }), b.helix, 'Twitch: helix');
  assert.equal(b.moderatoreDi({ channel: 'kick.conmod', piattaforma: 'kick' }), K.moderatoreKick);
  assert.equal(b.moderatoreDi({ channel: 'kick.senzamod', piattaforma: 'kick' }), null, 'senza i permessi nessuno: meglio niente che una moderazione che finge');
  assert.equal(b.moderatoreDi({ channel: 'tizio', piattaforma: 'youtube' }), null);
});

test('la casa del canale su Kick: il nome visto dal giro, e per un canale nato su Kick il suo', () => {
  const b = bot();
  assert.deepEqual(b._casaDi('kick.giada', { piattaforma: 'kick' }), ['kick.com/giada']);
  b._kickVisto.set('andryx', { slug: 'andryx_kick' });
  assert.deepEqual(b._casaDi('andryx', { piattaforma: 'kick' }), ['kick.com/andryx_kick']);
  assert.deepEqual(b._casaDi('andryx', {}), [], 'su Twitch la casa e\' gia\' nella lista di base');
});

const CANALE = 'kick.spam';
streamers.upsertApproved(CANALE, 'Spam', '1');
streamers.setSettings(CANALE, { antispam: { attivo: true, link: true, linkTier: 'sub', avvisa: true, timeoutRecidivi: true } });
let n = 0;
const msg = (text, user = 'tizio') => ({ channel: CANALE, piattaforma: 'kick', id: 'm' + (++n), user, display: user, userId: '77', text });
const moderatore = ({ tolto = { ok: true }, pausa = { ok: true } } = {}) => {
  const fatti = [];
  return { fatti, deleteMessage: async (c, id) => { fatti.push(['tolto', id]); return tolto; }, timeoutUser: async (c, u, s) => { fatti.push(['pausa', u, s]); return pausa; } };
};

test('un link al proprio canale su Kick passa, uno di fuori no', async () => {
  const m = moderatore();
  const detti = [];
  assert.equal(await antispam.tryAntispam(m, msg('seguimi su https://kick.com/spam ciao', 'a1'), (t) => detti.push(t), { casa: ['kick.com/spam'] }), false);
  assert.equal(await antispam.tryAntispam(m, msg('compra follower https://esempio.biz', 'a2'), (t) => detti.push(t), { casa: ['kick.com/spam'] }), true);
  assert.deepEqual(m.fatti.map((x) => x[0]), ['tolto']);
  assert.match(detti[0], /messaggio rimosso/);
});

test('un messaggio che non si e\' potuto togliere non si dice rimosso, e il bot non ci risponde', async () => {
  const m = moderatore({ tolto: { ok: false, motivo: 'permesso mancante' } });
  const detti = [];
  assert.equal(await antispam.tryAntispam(m, msg('https://esempio.biz', 'b1'), (t) => detti.push(t)), true);
  assert.deepEqual(detti, []);
  assert.deepEqual(m.fatti.map((x) => x[0]), ['tolto'], 'e niente pausa');
});

test('una pausa rifiutata non si annuncia: si dice solo che il messaggio e\' stato tolto', async () => {
  const m = moderatore({ pausa: { ok: false, motivo: 'errore Kick' } });
  const detti = [];
  for (let i = 0; i < 2; i++) await antispam.tryAntispam(m, msg('https://esempio.biz', 'c1'), (t) => detti.push(t));
  assert.deepEqual(m.fatti.map((x) => x[0]), ['tolto', 'tolto', 'pausa'], 'alla seconda la pausa si chiede');
  assert.equal(m.fatti[2][2], 60, 'in secondi: i minuti li fa chi parla con Kick');
  assert.ok(!/pausa di/.test(detti[1]), `non annuncia una pausa che non c'e': ${detti[1]}`);
  assert.match(detti[1], /messaggio rimosso/);
  const ok = moderatore();
  const detti2 = [];
  for (let i = 0; i < 2; i++) await antispam.tryAntispam(ok, msg('https://esempio.biz', 'c2'), (t) => detti2.push(t));
  assert.match(detti2[1], /pausa di 1 min/, 'quando la pausa c\'e\', si dice');
});

test('si annuncia la pausa data davvero, non quella chiesta', async () => {
  // Kick la conta in minuti interi: se chi modera dice quanti, si dicono quelli
  const m = moderatore({ pausa: { ok: true, minuti: 2 } });
  const detti = [];
  for (let i = 0; i < 2; i++) await antispam.tryAntispam(m, msg('https://esempio.biz', 'd1'), (t) => detti.push(t));
  assert.equal(m.fatti[2][2], 60);
  assert.match(detti[1], /pausa di 2 min/);
});
