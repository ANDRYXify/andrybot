// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUELLO CHE IL BOT DICE DI SUA INIZIATIVA, SU UN CANALE NATO SU KICK (bot.js,
// say e puoParlare; features/modules.js, _stream; docs/PIATTAFORME.md, «Il bot
// parla anche da solo, su Kick»). Fuori da Twitch non c'e' un'unita' di chat:
//  · say parla con la voce della piattaforma del canale, e solo se il bot e' al
//    lavoro in quella chat; prima timer, penitenze e contatori restavano muti;
//  · YouTube no, per scelta: la quota per scrivere in chat e' una per tutti;
//  · il motore dei moduli sa la diretta di Kick dalla vista del bot, non da
//    Twitch: i timer «solo in diretta» partono, e $titolo, $gioco, $uptime e
//    $spettatori dicono quella di Kick.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('andrybot-kick-da-solo-');
const { BotManager } = await import('../../src/bot.js');
const { ModulesEngine } = await import('../../src/features/modules.js');
process.on('exit', () => casa.pulisci());

// Un bot senza costruttore: si guarda dove finisce quello che dice.
function bot({ inChat = () => true } = {}) {
  const io = Object.create(BotManager.prototype);
  io.detti = [];
  io.units = new Map([['casa', { chat: { say: (_c, t) => io.detti.push(['twitch', t]) } }]]);
  io._momenti = { osserva: () => {} };
  io.vocePer = (m) => (t) => io.detti.push([m.piattaforma, t]);
  io.inChat = inChat;
  return io;
}

test('su un canale nato su Kick il bot parla su Kick, e su Twitch resta su Twitch', () => {
  const io = bot();
  io.say('kick.giada', 'promemoria');
  io.say('casa', 'promemoria');
  assert.deepEqual(io.detti, [['kick', 'promemoria'], ['twitch', 'promemoria']]);
});

test('su Kick parla solo se e\' al lavoro in quella chat', () => {
  const io = bot({ inChat: () => false });
  io.say('kick.giada', 'nessuno lo sente');
  assert.deepEqual(io.detti, []);
  assert.equal(io.puoParlare('kick.giada'), false);
  assert.equal(bot().puoParlare('KICK.Giada'), true, 'il canale si legge in minuscolo');
});

test('su YouTube il bot non parla da solo, anche quando la chat e\' aperta', () => {
  const io = bot();
  io.say('yt.ucabc', 'promemoria');
  assert.deepEqual(io.detti, []);
  assert.equal(io.puoParlare('yt.ucabc'), false);
  assert.equal(io.puoParlare('dc.server'), false, 'e dove una chat non c\'e\', nemmeno');
});

test('su Twitch la presenza e\' l\'unita\' di chat, come prima', () => {
  const io = bot({ inChat: () => { throw new Error('su Twitch non si chiede'); } });
  assert.equal(io.puoParlare('casa'), true);
  assert.equal(io.puoParlare('CASA'), true, 'il canale si legge in minuscolo anche qui');
  assert.equal(io.puoParlare('altro'), false);
  io.say('altro', 'niente unita\'');
  assert.deepEqual(io.detti, []);
});

test('la chat di un\'altra piattaforma dello stesso canale si chiede per nome: la chat di Kick di un canale di Twitch', () => {
  const io = Object.create(BotManager.prototype);
  io.units = new Map([['casa', { connesso: true }]]);
  assert.equal(io.inChat('casa'), true, 'senza dove, la chat di casa');
  assert.equal(io.inChat('casa', 'twitch'), true);
  assert.equal(io.inChat('casa', 'kick'), false, 'Kick non collegato: il bot li\' non c\'e\', anche se su Twitch si\'');
  assert.equal(io.inChat('kick.giada', 'twitch'), false, 'un canale nato su Kick su Twitch non c\'e\'');
});

// --- la diretta di Kick nel motore dei moduli ----------------------------------

function motore({ live = true, vista = {} } = {}) {
  const chiesti = [];
  const m = new ModulesEngine({ helix: { getStream: async (c) => { chiesti.push(c); return { title: 'su Twitch' }; } } });
  m.manager = { inDirettaSu: (c, p) => live && p === 'kick' && c === 'kick.giada', kickVisto: () => vista };
  return { m, chiesti };
}

test('la diretta di un canale Kick si legge dalla vista del bot, con la forma di Twitch', async () => {
  const inizio = Date.now() - 90 * 60_000;
  const { m, chiesti } = motore({ vista: { titolo: 'Si gioca', categoria: 'Fortnite', spettatori: 42, inizio } });
  const s = await m._stream('kick.giada');
  assert.deepEqual(s, { title: 'Si gioca', game_name: 'Fortnite', viewer_count: 42, started_at: new Date(inizio).toISOString() });
  assert.deepEqual(chiesti, [], 'a Twitch non si chiede niente');
  const t = await m.espandi('$titolo / $gioco / $spettatori / $uptime', { channel: 'kick.giada', args: [], _vars: {} });
  assert.equal(t, 'Si gioca / Fortnite / 42 / 1h 30m');
});

test('fuori onda e\' fuori onda; senza il numero degli spettatori, vuoto e non zero', async () => {
  assert.equal(await motore({ live: false }).m._stream('kick.giada'), null);
  const s = await motore({ vista: { titolo: 'x' } }).m._stream('kick.giada');
  assert.equal(s.viewer_count, null);
  assert.equal(s.started_at, '');
  const { m, chiesti } = motore();
  await m._stream('casa');
  assert.deepEqual(chiesti, ['casa'], 'un canale di Twitch chiede a Twitch, come prima');
});
