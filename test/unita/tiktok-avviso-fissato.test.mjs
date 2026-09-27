// L'AVVISO DELLA DIRETTA SU TIKTOK SI TOGLIE DOVE ERA STATO FISSATO.
//
// Ogni posto di Telegram ha la sua spunta «Fissa l'avviso qui»; quella della
// scheda («Fissa l'avviso in cima durante la live…») e' solo il valore di base
// dei posti nuovi. L'avviso di TikTok invece si fissava posto per posto, ma a
// fine diretta si cancellava guardando la spunta della scheda, nel primo gruppo,
// con l'id del primo messaggio andato bene: un id che vale solo nella chat dove
// e' nato. Qui Telegram e' finto (fetch sostituito) e si guarda cosa gli si
// chiede davvero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-tiktok-fissato-');
const { streamers, subscriptions, tgConf, tgDest, tgMsg } = await import('../../src/db.js');
const { BotManager, chiaveTikTok } = await import('../../src/bot.js');

const CH = 'canale';
const TOKEN = '123456:' + 'a'.repeat(30);
streamers.upsertApproved(CH, 'Canale', '1');
streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), tiktok: { username: 'canale', attivo: true } });
subscriptions.set(CH, { tier: 'base', status: 'active', periodEnd: Date.now() + 30 * 86400000 });
// la spunta della scheda e' accesa, ma il gruppo non vuole l'avviso fissato;
// il canale Telegram si'
tgConf.set(CH, { token: TOKEN, chatId: '-100', chatTitolo: 'Gruppo', pinLive: true });
const gruppo = tgDest.aggiungi({ channel: CH, chatId: '-100', titolo: 'Gruppo', tipo: 'supergroup', pin: 0 });
const canale = tgDest.aggiungi({ channel: CH, chatId: '-200', titolo: 'Canale', tipo: 'channel', pin: 1 });

const chiamate = [];
const vero = globalThis.fetch;
const MSG = { '-100': 11, '-200': 22 };
globalThis.fetch = async (url, opts = {}) => {
  const metodo = String(url).split('/').pop().split('?')[0];
  const p = opts.body ? JSON.parse(opts.body) : {};
  chiamate.push({ metodo, chat: String(p.chat_id), msg: p.message_id });
  const result = metodo === 'sendMessage' ? { message_id: MSG[String(p.chat_id)] } : true;
  return { ok: true, status: 200, json: async () => ({ ok: true, result }) };
};
test.after(() => { globalThis.fetch = vero; usaEGetta.pulisci(); });

const bot = new BotManager({});

test('l\'avviso di TikTok si fissa solo dove il posto lo chiede, e ogni posto ricorda il suo messaggio', async () => {
  const r = await bot.notificaTikTok(CH);
  assert.equal(r.ok, true);
  const mandati = chiamate.filter((c) => c.metodo === 'sendMessage').map((c) => c.chat).sort();
  assert.deepEqual(mandati, ['-100', '-200']);
  assert.deepEqual(chiamate.filter((c) => c.metodo === 'pinChatMessage').map((c) => [c.chat, c.msg]), [['-200', 22]]);
  const ricordati = tgMsg.perStreamer(CH, chiaveTikTok(CH)).map((m) => [Number(m.dest_id), String(m.msg_id)]).sort();
  assert.deepEqual(ricordati, [[Number(gruppo), '11'], [Number(canale), '22']]);
});

test('a fine diretta si toglie dove era fissato, col suo messaggio, e da nessun\'altra parte', async () => {
  chiamate.length = 0;
  await bot._chiudiTelegramTikTok(CH);
  assert.deepEqual(chiamate.filter((c) => c.metodo === 'deleteMessage').map((c) => [c.chat, String(c.msg)]), [['-200', '22']],
    'nel gruppo l\'avviso resta: la sua spunta e\' spenta, anche se quella della scheda e\' accesa');
  assert.equal(tgMsg.perStreamer(CH, chiaveTikTok(CH)).length, 0, 'un tentativo solo');
  chiamate.length = 0;
  await bot._chiudiTelegramTikTok(CH);
  assert.equal(chiamate.length, 0, 'la seconda volta non c\'e\' niente da togliere');
});

test('la chiave di TikTok non si confonde con uno streamer annunciato', () => {
  assert.ok(!/^[a-z0-9_]+$/.test(chiaveTikTok(CH)), 'un login di Twitch non ha «:»');
});
