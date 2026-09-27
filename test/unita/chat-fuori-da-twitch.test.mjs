// LE CHAT FUORI DA TWITCH ubbidiscono alle stesse regole di quella di Twitch.
//
// Due difetti, tutti e due visti da fuori come «il bot fa di testa sua»:
//  · su Kick l'interruttore del bot e la modalita' non contavano: un bot spento
//    continuava a rispondere, e «solo in diretta» rispondeva anche fuori onda;
//  · la chat di YouTube non partiva mai per un canale nato su YouTube: la
//    chiedevano solo i canali con la chat di Twitch pronta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-chat-fuori-');
const { streamers, tokens, statoVivo } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
process.on('exit', () => usaEGetta.pulisci());

// Un bot senza costruttore: il tubo dei messaggi si ferma dove comincia il
// lavoro vero, e lì si conta chi e' arrivato.
function bot() {
  const arrivati = [];
  const io = Object.create(BotManager.prototype);
  io._liveState = new Map();
  io._gestisciMessaggio = async (login, msg) => { arrivati.push(`${msg.piattaforma}:${login}:${msg.text}`); };
  return { io, arrivati };
}
const messaggio = (channel, piattaforma, text = '!ciao') => ({ channel, piattaforma, text, user: 'tizio', display: 'tizio' });

test('su Kick un bot spento non risponde', async () => {
  streamers.upsertApproved('kick.acceso', 'acceso');
  streamers.upsertApproved('kick.spento', 'spento');
  streamers.setEnabled('kick.spento', false);
  const { io, arrivati } = bot();
  await io.messaggioEsterno(messaggio('kick.acceso', 'kick'));
  await io.messaggioEsterno(messaggio('kick.spento', 'kick'));
  assert.deepEqual(arrivati, ['kick:kick.acceso:!ciao']);
});

test('su Kick «solo in diretta» risponde solo mentre Kick dice che sei in onda', async () => {
  streamers.upsertApproved('kick.serale', 'serale');
  streamers.setSettings('kick.serale', { modalita: 'live' });
  const { io, arrivati } = bot();
  await io.messaggioEsterno(messaggio('kick.serale', 'kick', 'fuori onda'));
  await io.eventoEsterno({ piattaforma: 'kick', channel: 'kick.serale', tipo: 'live', titolo: '' }).catch(() => {});
  assert.equal(statoVivo.leggi('kick.serale', 'diretta:kick')?.live, true, 'l\'inizio della diretta si tiene, anche dopo un riavvio');
  await io.messaggioEsterno(messaggio('kick.serale', 'kick', 'in onda'));
  await io.eventoEsterno({ piattaforma: 'kick', channel: 'kick.serale', tipo: 'fine-live' });
  await io.messaggioEsterno(messaggio('kick.serale', 'kick', 'dopo'));
  assert.deepEqual(arrivati, ['kick:kick.serale:in onda']);
});

test('un messaggio dalla chat di YouTube arriva da una diretta', async () => {
  streamers.upsertApproved('yt.serale', 'serale');
  streamers.setSettings('yt.serale', { modalita: 'live' });
  const { io, arrivati } = bot();
  await io.messaggioEsterno(messaggio('yt.serale', 'youtube'));
  assert.deepEqual(arrivati, ['youtube:yt.serale:!ciao'], 'la chat di YouTube si legge solo in diretta');
});

test('la chat di YouTube parte anche per un canale nato su YouTube', async () => {
  streamers.upsertApproved('yt.nato', 'nato');
  streamers.setSettings('yt.nato', { youtube: { chat: true } });
  tokens.save('youtube', 'yt.nato', { accessToken: 'a', refreshToken: 'r', scopes: [], expiresAt: Date.now() + 3600_000, userId: 'UC1' });
  streamers.upsertApproved('yt.zitto', 'zitto');
  streamers.setSettings('yt.zitto', { youtube: { chat: true } });
  streamers.setEnabled('yt.zitto', false);
  tokens.save('youtube', 'yt.zitto', { accessToken: 'a', refreshToken: 'r', scopes: [], expiresAt: Date.now() + 3600_000, userId: 'UC2' });
  const accesi = [];
  const io = Object.create(BotManager.prototype);
  io.running = true;
  io.units = new Map();
  io._chatKO = new Map();
  io._liveState = new Map();
  io.reconcileListeners = async () => {};
  io.chatYT = { giri: new Map(), accendi: (l) => accesi.push(l), spegni: () => {} };
  await io._syncChannels();
  assert.deepEqual(accesi, ['yt.nato'], 'bot acceso e levetta alzata bastano; il bot spento resta fuori');
});
