// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// ORE GUARDATE, PRESENZE E MONETE SU KICK (features/scriventi.js; bot.js,
// _tickWatchtime e _direAllaSerata; docs/PIATTAFORME.md, «Ore guardate,
// presenze e monete su Kick»). Kick un elenco di chi e' in chat non lo da':
//  · li' c'e' chi scrive, e un messaggio vale DUE giri, contati sui giri veri:
//    un giro in ritardo non toglie e non aggiunge niente;
//  · non contano lo streamer e il bot; quello che si scrive a canale spento non
//    vale per la diretta che viene dopo;
//  · la serata e' del canale: una lista sola, unita per nome, e chi sta su
//    Twitch e su Kick con lo stesso nome conta una volta;
//  · la diretta del giro segue la regola delle presenze: Twitch che finisce e
//    Kick che continua sono la stessa diretta;
//  · i traguardi si dicono nelle chat in onda.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('andrybot-kick-ore-');
const { streamers, statoVivo, watchtime, presenze: storePresenze } = await import('../../src/db.js');
const S = await import('../../src/features/scriventi.js');
const { BotManager } = await import('../../src/bot.js');
process.on('exit', () => casa.pulisci());

const M = 60_000;
const msg = (user, extra = {}) => ({ channel: 'canale', user, piattaforma: 'kick', ...extra });

test('chi conta: chi scrive, non lo streamer, non il bot, non i nomi fra parentesi', () => {
  S._svuota();
  const t = 1_000_000;
  assert.equal(S.segna(msg('Marco'), { ora: t }), true);
  assert.equal(S.segna(msg('giada', { isBroadcaster: true }), { ora: t }), false);
  assert.equal(S.segna(msg('ilbot', { isSelf: true }), { ora: t }), false);
  assert.equal(S.segna(msg('[sistema]'), { ora: t }), false);
  assert.equal(S.segna({ user: 'x', piattaforma: 'kick' }, { ora: t }), false, 'senza canale niente');
  S.segna({ channel: 'canale', user: 'anna' }, { ora: t });
  assert.deepEqual(S.giro('canale', 'kick', { ora: t + 1 }), ['marco'], 'il nome in minuscolo; su Kick solo chi ha scritto su Kick');
  assert.deepEqual(S.giro('CANALE', 'twitch', { ora: t + 1 }), ['anna'], 'un messaggio senza piattaforma e\' di Twitch');
});

test('un messaggio vale due giri, contati sui giri veri e non sull\'orologio', () => {
  for (const [nome, quando] of [['appena dopo un giro', 1], ['appena prima del giro', 5 * M - 1]]) {
    S._svuota();
    const T0 = 10_000_000;
    S.giro('c', 'kick', { ora: T0 });
    S.segna({ channel: 'c', user: 'marco', piattaforma: 'kick' }, { ora: T0 + quando });
    // giri in ritardo: il passo vero non e' mai esattamente cinque minuti
    const giri = [T0 + 5 * M + 40_000, T0 + 10 * M + 90_000, T0 + 15 * M + 95_000];
    assert.deepEqual(giri.map((ora) => S.giro('c', 'kick', { ora }).length), [1, 1, 0], nome);
  }
});

test('al primo giro, e dopo un buco, contano gli ultimi due passi: quello scritto a canale spento no', () => {
  S._svuota();
  const T = 50_000_000;
  S.segna({ channel: 'c', user: 'vecchio', piattaforma: 'kick' }, { ora: T - 11 * M });
  S.segna({ channel: 'c', user: 'nuovo', piattaforma: 'kick' }, { ora: T - 9 * M });
  assert.deepEqual(S.giro('c', 'kick', { ora: T }), ['nuovo'], 'primo giro');
  S.segna({ channel: 'c', user: 'prima', piattaforma: 'kick' }, { ora: T + 30 * M });
  S.segna({ channel: 'c', user: 'dopo', piattaforma: 'kick' }, { ora: T + 55 * M });
  assert.deepEqual(S.giro('c', 'kick', { ora: T + 60 * M }), ['dopo'], 'un\'ora fuori onda: si ricomincia');
});

test('la lista del giro e\' una, unita per nome', () => {
  assert.deepEqual(S.unisci(['marco', 'Anna'], ['marco', 'luca'], null), ['marco', 'anna', 'luca']);
});

// --- il giro delle ore nel bot ------------------------------------------------

function bot({ twitch = [], stream = {}, chatters = {} } = {}) {
  const io = Object.create(BotManager.prototype);
  io.units = new Map(twitch.map((c) => [c, {}]));
  io._diretteDelGiro = new Map();
  io.chiesti = [];
  io.helix = {
    getStream: async (c) => stream[c] || null,
    getChatters: async (c) => { io.chiesti.push(c); return chatters[c] || []; },
  };
  io.detti = [];
  io.say = (c, t) => io.detti.push(['twitch', c, t]);
  io.vocePer = (m) => (t) => io.detti.push([m.piattaforma, m.channel, t]);
  io.inChat = () => true;
  io._inizioTwitch = () => 0;
  return io;
}
const inOndaSuKick = (c, da) => statoVivo.scrivi(c, 'diretta:kick', { live: true, da });
const fuoriDaKick = (c) => statoVivo.togli(c, 'diretta:kick');
const sec = (c, u) => watchtime.get(c, u);
for (const c of ['kick.giada', 'casa', 'solotw']) { streamers.upsertApproved(c, c, '1'); streamers.setEnabled(c, true); }

test('un canale nato su Kick: chi scrive guadagna le ore, le monete e la presenza alla diretta', async () => {
  S._svuota();
  inOndaSuKick('kick.giada', Date.now() - 20 * M);
  S.segna({ channel: 'kick.giada', user: 'marco', piattaforma: 'kick' });
  const io = bot();
  await io._tickWatchtime();
  assert.equal(sec('kick.giada', 'marco'), 300);
  assert.deepEqual(io.chiesti, [], 'a Twitch non si chiede niente');
  assert.match(statoVivo.leggi('kick.giada', 'economia')?.diretta || '', /^kick:\d+$/, 'il giro dice all\'economia che la diretta c\'e\'');
  await io._tickWatchtime();
  assert.equal(sec('kick.giada', 'marco'), 600, 'lo stesso messaggio, il secondo giro');
  assert.equal(storePresenze.get('kick.giada', 'marco')?.dirette, 1, 'due giri: presente a questa diretta');
  await io._tickWatchtime();
  assert.equal(sec('kick.giada', 'marco'), 600, 'il terzo giro no');
  fuoriDaKick('kick.giada');
});

test('Twitch e Kick insieme: una lista sola, e chi ha lo stesso nome sulle due conta una volta', async () => {
  S._svuota();
  inOndaSuKick('casa', Date.now() - 20 * M);
  S.segna({ channel: 'casa', user: 'marco', piattaforma: 'kick' });
  S.segna({ channel: 'casa', user: 'luca', piattaforma: 'kick' });
  const io = bot({ twitch: ['casa'], stream: { casa: { id: 's1', viewer_count: 3, game_name: 'x' } }, chatters: { casa: ['marco', 'anna'] } });
  await io._tickWatchtime();
  assert.deepEqual(['marco', 'anna', 'luca'].map((u) => sec('casa', u)), [300, 300, 300]);
  assert.equal(statoVivo.leggi('casa', 'economia')?.diretta, 's1');
  // Twitch finisce, Kick continua: la stessa diretta, e Twitch non si chiama
  const dopo = bot({ twitch: ['casa'], chatters: { casa: ['anna'] } });
  dopo._diretteDelGiro = io._diretteDelGiro;
  await dopo._tickWatchtime();
  assert.deepEqual(dopo.chiesti, [], 'senza diretta su Twitch, l\'elenco di Twitch non serve');
  assert.deepEqual(['marco', 'anna', 'luca'].map((u) => sec('casa', u)), [600, 300, 600], 'su Kick il secondo giro del messaggio');
  assert.equal(statoVivo.leggi('casa', 'economia')?.diretta, 's1', 'la diretta e\' la stessa');
  fuoriDaKick('casa');
});

test('un canale che non e\' piu\' nostro non conta, anche se il database lo ricorda in onda su Kick', async () => {
  S._svuota();
  inOndaSuKick('kick.andato', Date.now() - 20 * M);
  S.segna({ channel: 'kick.andato', user: 'marco', piattaforma: 'kick' });
  await bot()._tickWatchtime();
  assert.equal(sec('kick.andato', 'marco'), 0);
  fuoriDaKick('kick.andato');
});

test('solo Twitch: come prima, e chi ha scritto su Kick a Kick spento non conta', async () => {
  S._svuota();
  S.segna({ channel: 'solotw', user: 'furbo', piattaforma: 'kick' });
  const io = bot({ twitch: ['solotw'], stream: { solotw: { id: 't9' } }, chatters: { solotw: ['bea'] } });
  await io._tickWatchtime();
  assert.equal(sec('solotw', 'bea'), 300);
  assert.equal(sec('solotw', 'furbo'), 0);
  assert.equal(statoVivo.leggi('solotw', 'economia')?.diretta, 't9');
});

test('i traguardi si dicono nelle chat in onda: Twitch, Kick, tutte e due; YouTube mai', () => {
  const io = bot();
  inOndaSuKick('casa', 1);
  io._direAllaSerata('casa', 'evviva', { suTwitch: true });
  io._direAllaSerata('casa', 'solo kick');
  fuoriDaKick('casa');
  io._direAllaSerata('casa', 'solo twitch', { suTwitch: true });
  io.inChat = () => false;
  inOndaSuKick('casa', 1);
  io._direAllaSerata('casa', 'kick senza bot');
  fuoriDaKick('casa');
  assert.deepEqual(io.detti, [
    ['twitch', 'casa', 'evviva'], ['kick', 'casa', 'evviva'],
    ['kick', 'casa', 'solo kick'],
    ['twitch', 'casa', 'solo twitch'],
  ]);
});
