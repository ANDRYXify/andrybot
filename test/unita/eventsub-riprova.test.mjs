// EVENTSUB: una sottoscrizione rifiutata per un motivo passeggero si riprova,
// una rifiutata per uno scope mancante no, e una riprova non sopravvive a una
// sessione nuova.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

cartellaUsaEGetta('andrybot-eventsub-');
const { tokens } = await import('../../src/db.js');
const { EventHub } = await import('../../src/twitch/events.js');

class SocketFinto {
  constructor() { this.readyState = 1; this._l = {}; }
  addEventListener(t, f) { (this._l[t] ||= []).push(f); }
  _emit(t, ev = {}) { for (const f of this._l[t] || []) f(ev); }
  messaggio(o) { this._emit('message', { data: JSON.stringify(o) }); }
  close() { if (this.readyState === 3) return; this.readyState = 3; this._emit('close'); }
}
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };
// Il tempo avanza a passi di dieci secondi e a ogni passo la sessione manda il
// suo keepalive, come fa Twitch: senza, dopo sessanta secondi il guardiano
// chiuderebbe la sessione (giustamente) e con lei le riprove.
const avanza = async (t, ws, ms) => {
  for (let fatto = 0; fatto < ms; fatto += 10_000) {
    t.mock.timers.tick(Math.min(10_000, ms - fatto));
    await flush();
    if (ws.readyState === 1) ws.messaggio({ metadata: { message_type: 'session_keepalive' }, payload: {} });
  }
  await flush();
};
const benvenuto = (id) => ({ metadata: { message_type: 'session_welcome' }, payload: { session: { id } } });

function banco(t, risposte) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const socks = [];
  const chiamate = [];
  const fetchFn = async (url, opt) => {
    const st = risposte.length ? risposte.shift() : 200;
    chiamate.push({ st, tipo: JSON.parse(opt.body).type });
    return { ok: st < 300, status: st, text: async () => '' };
  };
  const hub = new EventHub({
    auth: { getToken: async () => 'tok' }, helix: {}, onEvent: () => {},
    wsFactory: () => { const w = new SocketFinto(); socks.push(w); return w; }, fetchFn,
  });
  return { hub, socks, chiamate };
}

test('un 429 si riprova dopo quindici secondi, e solo quello', async (t) => {
  tokens.save('broadcaster', 'alfa', { userId: '1', accessToken: 'a', refreshToken: 'r', scopes: ['chat:edit'], expiresAt: Date.now() + 3600_000 });
  const { hub, socks, chiamate } = banco(t, [429, 200, 200, 200, 200, 200, 200]);
  await hub.watch({ login: 'alfa', user_id: '1' });
  socks[0].messaggio(benvenuto('s1'));
  await flush();
  assert.equal(chiamate.length, 7, 'sette sottoscrizioni chieste');
  assert.equal(chiamate[0].st, 429);
  await avanza(t, socks[0], 10_000);
  assert.equal(chiamate.length, 7, 'non prima dei quindici secondi');
  await avanza(t, socks[0], 10_000);
  assert.equal(chiamate.length, 8, 'una riprova');
  assert.equal(chiamate[7].tipo, chiamate[0].tipo, 'della sola sottoscrizione rifiutata');
  assert.equal(chiamate[7].st, 200);
  await avanza(t, socks[0], 10 * 60_000);
  assert.equal(chiamate.length, 8, 'andata a buon fine: basta cosi\'');
  hub.stop();
});

test('un 403 (scope mancante) non si riprova', async (t) => {
  tokens.save('broadcaster', 'beta', { userId: '2', accessToken: 'a', refreshToken: 'r', scopes: ['chat:edit'], expiresAt: Date.now() + 3600_000 });
  const { hub, socks, chiamate } = banco(t, [403, 403, 403, 403, 403, 403, 403]);
  await hub.watch({ login: 'beta', user_id: '2' });
  socks[0].messaggio(benvenuto('s1'));
  await flush();
  assert.equal(chiamate.length, 7);
  await avanza(t, socks[0], 10 * 60_000);
  assert.equal(chiamate.length, 7, 'riprovare uno scope mancante non lo fa comparire');
  hub.stop();
});

test('una sessione nuova cancella le riprove di quella vecchia (le rifa\' lei)', async (t) => {
  tokens.save('broadcaster', 'gamma', { userId: '3', accessToken: 'a', refreshToken: 'r', scopes: ['chat:edit'], expiresAt: Date.now() + 3600_000 });
  const { hub, socks, chiamate } = banco(t, [503, 200, 200, 200, 200, 200, 200]);
  await hub.watch({ login: 'gamma', user_id: '3' });
  socks[0].messaggio(benvenuto('s1'));
  await flush();
  assert.equal(chiamate.length, 7);
  socks[0].close();                               // cade: riconnessione con sessione nuova
  t.mock.timers.tick(1000); await flush();
  assert.equal(socks.length, 2);
  socks[1].messaggio(benvenuto('s2'));
  await flush();
  assert.equal(chiamate.length, 14, 'la welcome nuova rifa\' tutte e sette');
  await avanza(t, socks[1], 20_000);
  assert.equal(chiamate.length, 14, 'e la riprova della sessione vecchia non parte');
  hub.stop();
});

test('dopo tre riprove a vuoto ci si arrende, senza girare per sempre', async (t) => {
  tokens.save('broadcaster', 'delta', { userId: '4', accessToken: 'a', refreshToken: 'r', scopes: ['chat:edit'], expiresAt: Date.now() + 3600_000 });
  const { hub, socks, chiamate } = banco(t, [500, 200, 200, 200, 200, 200, 200, 500, 500, 500, 500]);
  await hub.watch({ login: 'delta', user_id: '4' });
  socks[0].messaggio(benvenuto('s1'));
  await flush();
  await avanza(t, socks[0], 15_000);              // 1a riprova → 500
  await avanza(t, socks[0], 60_000);              // 2a → 500
  await avanza(t, socks[0], 240_000);             // 3a → 500
  assert.equal(chiamate.length, 10);
  await avanza(t, socks[0], 60 * 60_000);
  assert.equal(chiamate.length, 10, 'basta');
  hub.stop();
});
