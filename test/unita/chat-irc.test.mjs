// LA CONNESSIONE ALLA CHAT, provata con un socket finto e il tempo in mano.
//
// Le cose che qui si inchiodano sono quelle che in produzione non fanno rumore:
// un socket morto che resta «aperto», uno zombie che si ricollega da solo, un
// token scaduto riprovato uguale per ore, una risposta consegnata tre minuti
// dopo. Nessuna di queste produce un errore: producono un bot che sembra vivo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

cartellaUsaEGetta('andrybot-irc-');
const { ChatBot } = await import('../../src/twitch/chat.js');

class SocketFinto {
  constructor() { this.readyState = 0; this.sent = []; this._l = {}; }
  addEventListener(t, f) { (this._l[t] ||= []).push(f); }
  _emit(t, ev = {}) { for (const f of this._l[t] || []) f(ev); }
  apri() { this.readyState = 1; this._emit('open'); }
  riga(s) { this._emit('message', { data: s + '\r\n' }); }
  send(s) { if (this.readyState !== 1) throw new Error('socket chiuso'); this.sent.push(s); }
  close() { if (this.readyState === 3) return; this.readyState = 3; this._emit('close'); }
  fallisci() { this.readyState = 3; this._emit('error'); this._emit('close'); }
  muoriInSilenzio() { this.readyState = 1; this.close = () => { this.readyState = 3; /* nessuna close: e' morto davvero */ }; }
}

const flush = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };

function banco(t, { token = async () => 'tok' } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  t.mock.timers.setTime(1_760_000_000_000);   // un orologio vero: «mai mandato» (0) non deve sembrare «adesso»
  const socks = [];
  const chiamate = [];
  const auth = { getToken: async (kind, login, opt) => { chiamate.push(opt || {}); return token(kind, login, opt); } };
  const bot = new ChatBot({ auth, login: 'prova', wsFactory: () => { const w = new SocketFinto(); socks.push(w); return w; } });
  return { bot, socks, chiamate };
}

async function collega(bot, socks) {
  const p = bot.connect();
  await flush();
  socks[socks.length - 1].apri();
  await p;
}

test('un socket che muore in silenzio viene scoperto e rimpiazzato', async (t) => {
  const { bot, socks } = banco(t);
  await collega(bot, socks);
  const s0 = socks[0];
  assert.equal(socks.length, 1);
  t.mock.timers.tick(4 * 60_000);
  assert.ok(s0.sent.includes('PING :socialbot'), 'ogni quattro minuti chiediamo noi un segno di vita');
  s0.muoriInSilenzio();
  t.mock.timers.tick(2 * 60_000 + 10);
  assert.equal(s0.readyState, 3, 'dopo sei minuti senza una riga la chiudiamo noi');
  t.mock.timers.tick(2100);                    // il socket non ha emesso close: la forziamo
  t.mock.timers.tick(1000);                    // backoff minimo
  await flush();
  assert.equal(socks.length, 2, 'e si riparte con un socket nuovo');
  bot.disconnect();
});

test('una riga qualsiasi tiene viva la connessione', async (t) => {
  const { bot, socks } = banco(t);
  await collega(bot, socks);
  for (let i = 0; i < 5; i++) { t.mock.timers.tick(5 * 60_000); socks[0].riga('PING :tmi.twitch.tv'); }
  assert.equal(socks[0].readyState, 1, 'venticinque minuti con un PING ogni cinque: mai chiusa');
  assert.ok(socks[0].sent.filter((x) => x.startsWith('PONG')).length >= 5, 'e ai PING si risponde');
  bot.disconnect();
});

test('se il PRIMO collegamento fallisce non resta uno zombie che riprova da solo', async (t) => {
  const { bot, socks } = banco(t);
  const p = bot.connect();
  await flush();
  socks[0].fallisci();
  await assert.rejects(p);
  t.mock.timers.tick(10 * 60_000);
  await flush();
  assert.equal(socks.length, 1, 'nessun secondo socket: decide chi ci ha creato');
});

test('dopo un login fallito il token si rinnova invece di riprovarlo uguale', async (t) => {
  const { bot, socks, chiamate } = banco(t);
  await collega(bot, socks);
  assert.deepEqual(chiamate[0], { forza: false });
  socks[0].riga(':tmi.twitch.tv NOTICE * :Login authentication failed');
  socks[0].close();                              // Twitch chiude dopo un login fallito
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(socks.length, 2);
  assert.deepEqual(chiamate[1], { forza: true }, 'il secondo tentativo pretende un token rinnovato');
  socks[1].apri();
  t.mock.timers.tick(1000);
  assert.deepEqual(chiamate.length, 2, 'e la forzatura vale una volta sola');
  bot.disconnect();
});

test('una caduta pianifica UNA riconnessione, e il backoff raddoppia una volta per tentativo', async (t) => {
  const { bot, socks } = banco(t);
  await collega(bot, socks);
  socks[0].close();
  assert.equal(bot._backoff, 2000, 'dopo la prima caduta il prossimo ritardo e\' 2s');
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(socks.length, 2);
  socks[1].fallisci();                            // error + close: due eventi, una pianificazione
  await flush();
  assert.equal(bot._backoff, 4000, 'raddoppiato una volta, non due');
  t.mock.timers.tick(2000);
  await flush();
  assert.equal(socks.length, 3, 'un solo nuovo tentativo');
  bot.disconnect();
});

test('un messaggio rimasto in coda troppo a lungo non esce in ritardo', async (t) => {
  const { bot, socks } = banco(t);
  await collega(bot, socks);
  bot.join('prova');
  bot.say('prova', 'subito');
  assert.ok(socks[0].sent.some((x) => x === 'PRIVMSG #prova :subito'), 'a connessione aperta parte subito');
  socks[0].close();
  bot.say('prova', 'vecchio');
  t.mock.timers.tick(1000);                      // riconnessione: socket nuovo, ancora chiuso
  await flush();
  t.mock.timers.tick(95_000);                    // passa piu' del tempo di vita di un messaggio
  socks[1].apri();
  t.mock.timers.tick(1500);
  bot.say('prova', 'nuovo');
  t.mock.timers.tick(1000);
  assert.ok(!socks[1].sent.some((x) => x.includes(':vecchio')), 'quello vecchio e\' stato scartato');
  assert.ok(socks[1].sent.some((x) => x === 'PRIVMSG #prova :nuovo'), 'quello nuovo esce');
  assert.ok(socks[1].sent.includes('JOIN #prova'), 'e nel canale si rientra da soli');
  bot.disconnect();
});

test('chiudere di proposito ferma tutto: niente riconnessioni, niente PING', async (t) => {
  const { bot, socks } = banco(t);
  await collega(bot, socks);
  bot.disconnect();
  t.mock.timers.tick(30 * 60_000);
  await flush();
  assert.equal(socks.length, 1);
});
