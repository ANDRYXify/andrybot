// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL BOT DEI CONSIGLI NELLO SCUDO (docs/SCUDO.md, «Il bot dei consigli»).
//
// Il caso vero: un bot scrive in chat che vende viewer e follower, e non
// succede niente — scudo e antispam spenti di serie, e comunque l'antispam
// guarda la forma. Qui si prova la strada intera, con un Twitch finto: di
// serie, a scudo spento, il certo e' bannato e il messaggio tolto, il
// probabile tolto senza castigo; l'interruttore, l'azione e la frase sono
// dello streamer; gli esenti restano esenti; in chat si dice solo quello che
// e' successo davvero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('scudo-vendita-');
const { streamers } = await import('../../src/db.js');
const ab = await import('../../src/features/antibot.js');
test.after(async () => { await ab.spegniScudo(); casa.pulisci(); });

const SPAM = 'Wanna become famous? Buy followers, primes and viewers on dogehype (.) com';
const MEZZO = 'compra follower e viewer, scrivimi su discord';

function canale(ch, antibot) {
  streamers.upsertApproved(ch, ch, '1' + ch.length);
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, antibot ? { antibot } : {});
}
function scudo() {
  const chiamate = [], detti = [];
  const helix = {
    deleteMessage: async (c, id) => { chiamate.push(['cancella', id]); return { ok: true }; },
    timeoutUser: async (c, uid, sec) => { chiamate.push([sec ? 'pausa' : 'ban', uid, sec]); return { ok: true }; },
    getUserByLogin: async (login) => ({ login, created_at: '2015-01-01T00:00:00Z' }),
  };
  return { io: new ab.AntiBot({ helix, say: (_c, t) => detti.push(t) }), chiamate, detti };
}
let n = 0;
const msg = (ch, text, extra = {}) => ({ channel: ch, user: 'spammone', userId: 'u7', id: 'm' + (++n), text, ...extra });
const aspetta = async (f) => { for (let i = 0; i < 100 && !f(); i++) await new Promise((r) => setTimeout(r, 10)); return f(); };

test('di serie, a scudo spento: il certo si banna e si toglie, e lo si dice', async () => {
  const ch = 'vend1';
  canale(ch);
  assert.equal(ab.ANTIBOT_DEFAULT.attivo, false, 'lo scudo e\' spento di serie: e\' il caso del canale vero');
  const { io, chiamate, detti } = scudo();
  const m = msg(ch, SPAM);
  assert.equal(await io.controllaChat(m), true, 'il messaggio non va oltre');
  assert.ok(await aspetta(() => chiamate.length >= 2));
  assert.deepEqual(chiamate, [['cancella', m.id], ['ban', 'u7', 0]]);
  assert.deepEqual(detti, ['🛡️ @spammone: niente vendita di viewer e follower qui (bannato).']);
});

test('il probabile si toglie senza castigo; la chat vera passa', async () => {
  const ch = 'vend2';
  canale(ch);
  const { io, chiamate, detti } = scudo();
  const m = msg(ch, MEZZO);
  assert.equal(await io.controllaChat(m), true);
  assert.deepEqual(chiamate, [['cancella', m.id]], 'nessun ban, nessuna pausa');
  assert.deepEqual(detti, ['🛡️ @spammone: niente vendita di viewer e follower qui (messaggio tolto).']);
  assert.equal(await io.controllaChat(msg(ch, 'come faccio a crescere di follower?', { user: 'fan', userId: 'f1' })), false);
  assert.equal(chiamate.length, 1);
});

test('il primo messaggio nel canale fa del probabile un certo', async () => {
  const ch = 'vend3';
  canale(ch);
  const { io, chiamate } = scudo();
  assert.equal(await io.controllaChat(msg(ch, MEZZO, { isFirst: true })), true);
  assert.ok(chiamate.some((c) => c[0] === 'ban'));
});

test('due messaggi dello stesso bot: si tolgono tutti e due', async () => {
  const ch = 'vend4';
  canale(ch);
  const { io, chiamate } = scudo();
  const a = msg(ch, MEZZO), b = msg(ch, MEZZO + '!!');
  await io.controllaChat(a);
  await io.controllaChat(b);
  assert.deepEqual(chiamate.map((c) => c[1]), [a.id, b.id]);
});

test('l\'azione e la frase sono dello streamer', async () => {
  canale('vend5', { venditaAzione: 'timeout', venditaPausaSec: 300, timeoutSec: 1209600, venditaTesto: 'fuori di qui {nome} ({cosa})' });
  let s = scudo();
  await s.io.controllaChat(msg('vend5', SPAM));
  assert.ok(await aspetta(() => s.chiamate.length >= 2));
  assert.deepEqual(s.chiamate.slice(1), [['pausa', 'u7', 300]]);
  assert.deepEqual(s.detti, ['fuori di qui spammone (in pausa)']);

  canale('vend6', { venditaAzione: 'cancella' });
  s = scudo();
  await s.io.controllaChat(msg('vend6', SPAM));
  assert.deepEqual(s.chiamate.map((c) => c[0]), ['cancella'], 'solo togliere, anche sul certo');

  canale('vend7', { venditaAzione: 'segnala', avvisa: false });
  s = scudo();
  assert.equal(await s.io.controllaChat(msg('vend7', SPAM)), false, 'segnalato, lasciato passare');
  assert.deepEqual(s.chiamate, []);
  assert.match(s.detti[0], /@spammone sembra un bot che vende viewer e follower/);
  assert.equal(await s.io.controllaChat(msg('vend7', MEZZO, { user: 'altro', userId: 'u8' })), false, 'e il probabile non e\' piu\' duro del certo');
  assert.deepEqual(s.chiamate, []);

  canale('vend8', { venditaAvvisa: false });
  s = scudo();
  await s.io.controllaChat(msg('vend8', SPAM));
  assert.ok(await aspetta(() => s.chiamate.length >= 2));
  assert.deepEqual(s.detti, [], 'avviso spento: si agisce in silenzio');

  // l'avviso dello scudo e' nella sua scheda, spenta a scudo spento: non
  // decide per questa difesa, che ha il suo
  canale('vend8b', { avvisa: false });
  s = scudo();
  await s.io.controllaChat(msg('vend8b', SPAM));
  assert.ok(await aspetta(() => s.detti.length === 1));

  canale('vend8c', { venditaServizi: ['growpanda'] });
  s = scudo();
  assert.equal(await s.io.controllaChat(msg('vend8c', 'cheap followers on g r o w p a n d a')), true, 'i nomi dello streamer valgono come quelli noti');
  assert.ok(await aspetta(() => s.chiamate.some((c) => c[0] === 'ban')));
});

test('spento dallo streamer, non tocca niente', async () => {
  canale('vend9', { vendita: false });
  const { io, chiamate, detti } = scudo();
  assert.equal(await io.controllaChat(msg('vend9', SPAM)), false);
  assert.deepEqual([chiamate, detti], [[], []]);
});

test('a vuoto, a scudo acceso: si decide e si scrive, ma non si tocca nessuno e non si dice niente', async () => {
  canale('vend10', { attivo: true, aVuoto: true });
  let s = scudo();
  await s.io.controllaChat(msg('vend10', SPAM));
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual([s.chiamate, s.detti], [[], []]);
  // a scudo spento la sola osservazione e' un comando spento nel pannello: non
  // conta, e la difesa fa il suo
  canale('vend10b', { attivo: false, aVuoto: true });
  s = scudo();
  await s.io.controllaChat(msg('vend10b', SPAM));
  assert.ok(await aspetta(() => s.chiamate.length >= 2));
});

test('gli esenti restano esenti', async () => {
  canale('vend11', { esenti: ['amico'] });
  const { io, chiamate } = scudo();
  for (const extra of [{ isMod: true }, { isVip: true }, { isSub: true }, { isBroadcaster: true }, { bits: 100 }, { user: 'amico' }, { user: 'nightbot' }])
    assert.equal(await io.controllaChat(msg('vend11', SPAM, extra)), false, JSON.stringify(extra));
  assert.deepEqual(chiamate, []);
});

test('su Kick: con le mani di Kick, mai con quelle di Twitch', async () => {
  canale('vend12');
  const twitch = [], kick = [];
  const spia = (dove) => ({
    deleteMessage: async (c, id) => { dove.push(['cancella', id]); return { ok: true }; },
    timeoutUser: async (c, uid, sec) => { dove.push([sec ? 'pausa' : 'ban', uid]); return { ok: true }; },
  });
  const io = new ab.AntiBot({ helix: spia(twitch), kick: spia(kick), say: () => {} });
  const m = msg('vend12', SPAM, { piattaforma: 'kick', userId: '4242' });
  assert.equal(await io.controllaChat(m), true);
  assert.ok(await aspetta(() => kick.length >= 2));
  assert.deepEqual([kick, twitch], [[['cancella', m.id], ['ban', '4242']], []]);
});
