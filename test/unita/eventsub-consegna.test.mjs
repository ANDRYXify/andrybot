// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// EVENTSUB: OGNI EVENTO ARRIVA, E ARRIVA UNA VOLTA (src/twitch/events.js).
// Due cose che dice la documentazione di Twitch, e che il bot non faceva:
//  · «Twitch sends messages at least once»: un evento rimandato porta lo stesso
//    message_id, e va scartato. Prima era un alert doppio;
//  · durante un session_reconnect «the old connection receives events up until
//    you connect to the new URL and receive the welcome message». Prima la
//    connessione vecchia si chiudeva subito, e un evento arrivato li' si perdeva.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

cartellaUsaEGetta('andrybot-eventsub-consegna-');
const { tokens } = await import('../../src/db.js');
const { EventHub } = await import('../../src/twitch/events.js');

class SocketFinto {
  constructor(url) { this.url = url; this.readyState = 1; this._l = {}; }
  addEventListener(t, f) { (this._l[t] ||= []).push(f); }
  _emit(t, ev = {}) { for (const f of this._l[t] || []) f(ev); }
  messaggio(o) { this._emit('message', { data: JSON.stringify(o) }); }
  close() { if (this.readyState === 3) return; this.readyState = 3; this._emit('close'); }
}
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };
const benvenuto = (id) => ({ metadata: { message_type: 'session_welcome' }, payload: { session: { id } } });
const evento = (id, chi) => ({ metadata: { message_type: 'notification', message_id: id }, payload: { subscription: { type: 'channel.subscribe' }, event: { user_login: chi } } });
const sposta = (url) => ({ metadata: { message_type: 'session_reconnect' }, payload: { session: { reconnect_url: url } } });

function banco(t, login, uid) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  tokens.save('broadcaster', login, { userId: uid, accessToken: 'a', refreshToken: 'r', scopes: ['chat:edit'], expiresAt: Date.now() + 3600_000 });
  const socks = [];
  const iscrizioni = [];
  const arrivati = [];
  const hub = new EventHub({
    auth: { getToken: async () => 'tok' }, helix: {},
    onEvent: (e) => arrivati.push(e.data.user_login),
    wsFactory: (url) => { const w = new SocketFinto(url); socks.push(w); return w; },
    fetchFn: async (url, opt) => { iscrizioni.push(JSON.parse(opt.body).transport.session_id); return { ok: true, status: 202, text: async () => '' }; },
  });
  return { hub, socks, iscrizioni, arrivati };
}

test('un evento rimandato da Twitch col suo stesso message_id passa una volta sola', async (t) => {
  const { hub, socks, arrivati } = banco(t, 'uno', '11');
  await hub.watch({ login: 'uno', user_id: '11' });
  socks[0].messaggio(benvenuto('s1'));
  await flush();
  socks[0].messaggio(evento('m1', 'anna'));
  socks[0].messaggio(evento('m1', 'anna'));
  socks[0].messaggio(evento('m2', 'bea'));
  await flush();
  assert.deepEqual(arrivati, ['anna', 'bea'], 'il rinvio di m1 non e\' un secondo abbonamento');
  hub.stop();
});

test('la memoria degli id ha un tetto e una durata: non cresce per sempre', async (t) => {
  const { hub, socks, arrivati } = banco(t, 'due', '22');
  await hub.watch({ login: 'due', user_id: '22' });
  socks[0].messaggio(benvenuto('s1'));
  await flush();
  for (let i = 0; i < 1001; i++) socks[0].messaggio(evento('n' + i, 'p' + i));
  assert.equal(arrivati.length, 1001);
  socks[0].messaggio(evento('n0', 'di nuovo'));
  assert.equal(arrivati.at(-1), 'di nuovo', 'oltre i mille, il piu\' vecchio si dimentica');
  socks[0].messaggio(evento('n1000', 'doppio'));
  assert.notEqual(arrivati.at(-1), 'doppio', 'gli ultimi si ricordano');
  t.mock.timers.tick(11 * 60_000);
  socks[0].messaggio(evento('n1000', 'dopo undici minuti'));
  assert.equal(arrivati.at(-1), 'dopo undici minuti', 'dopo dieci minuti un id si dimentica');
  hub.stop();
});

test('durante un session_reconnect gli eventi della connessione vecchia arrivano, fino al benvenuto della nuova', async (t) => {
  const { hub, socks, iscrizioni, arrivati } = banco(t, 'tre', '33');
  await hub.watch({ login: 'tre', user_id: '33' });
  socks[0].messaggio(benvenuto('s1'));
  await flush();
  const prima = iscrizioni.length;
  socks[0].messaggio(sposta('wss://nuova.example/ws'));
  await flush();
  assert.equal(socks.length, 2, 'si apre la connessione nuova all\'indirizzo detto da Twitch');
  assert.equal(socks[1].url, 'wss://nuova.example/ws');
  assert.equal(socks[0].readyState, 1, 'la vecchia resta aperta finche\' la nuova non da\' il benvenuto');
  socks[0].messaggio(evento('a1', 'nel mezzo'));
  await flush();
  assert.deepEqual(arrivati, ['nel mezzo'], 'l\'evento arrivato sulla vecchia nel frattempo non si perde');
  socks[1].messaggio(benvenuto('s1'));
  await flush();
  assert.equal(socks[0].readyState, 3, 'al benvenuto della nuova, la vecchia si chiude');
  assert.equal(iscrizioni.length, prima, 'le sottoscrizioni passano alla nuova: non si rifanno');
  socks[1].messaggio(evento('a1', 'nel mezzo'));
  socks[1].messaggio(evento('a2', 'dopo'));
  await flush();
  assert.deepEqual(arrivati, ['nel mezzo', 'dopo'], 'lo stesso evento sulle due connessioni passa una volta');
  hub.stop();
});

test('se la nuova cade prima del benvenuto, si chiude anche la vecchia e si riparte da capo', async (t) => {
  const { hub, socks, iscrizioni } = banco(t, 'quattro', '44');
  await hub.watch({ login: 'quattro', user_id: '44' });
  socks[0].messaggio(benvenuto('s1'));
  await flush();
  const prima = iscrizioni.length;
  socks[0].messaggio(sposta('wss://nuova.example/ws'));
  await flush();
  socks[1].close();
  await flush();
  assert.equal(socks[0].readyState, 3, 'la vecchia non resta appesa');
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(socks.length, 3, 'una connessione nuova da capo');
  assert.notEqual(socks[2].url, 'wss://nuova.example/ws');
  socks[2].messaggio(benvenuto('s2'));
  await flush();
  assert.equal(iscrizioni.length, prima * 2, 'su una sessione nuova le sottoscrizioni si rifanno');
  assert.ok(iscrizioni.slice(prima).every((s) => s === 's2'));
  hub.stop();
});

test('dalla connessione vecchia contano solo gli eventi', async (t) => {
  const { hub, socks, iscrizioni } = banco(t, 'cinque', '55');
  await hub.watch({ login: 'cinque', user_id: '55' });
  socks[0].messaggio(benvenuto('s1'));
  await flush();
  const prima = iscrizioni.length;
  socks[0].messaggio(sposta('wss://nuova.example/ws'));
  await flush();
  socks[0].messaggio(benvenuto('s9'));
  socks[0].messaggio(sposta('wss://altra.example/ws'));
  await flush();
  assert.equal(socks.length, 2, 'un secondo spostamento dalla vecchia non apre niente');
  assert.equal(iscrizioni.length, prima, 'e un benvenuto dalla vecchia non rifa\' niente');
  assert.equal(socks[0].readyState, 1);
  hub.stop();
  assert.equal(socks[0].readyState, 3, 'smettere di osservare il canale chiude anche la vecchia');
});

test('la guardia del silenzio e\' della connessione nuova: gli eventi sulla vecchia non la tengono in vita', async (t) => {
  const { hub, socks } = banco(t, 'sei', '66');
  await hub.watch({ login: 'sei', user_id: '66' });
  socks[0].messaggio(benvenuto('s1'));
  await flush();
  socks[0].messaggio(sposta('wss://nuova.example/ws'));
  await flush();
  t.mock.timers.tick(50_000);
  socks[0].messaggio(evento('g1', 'sulla vecchia'));
  await flush();
  t.mock.timers.tick(15_000);
  await flush();
  assert.equal(socks[1].readyState, 3, 'la nuova muta da un minuto si chiude, anche se la vecchia parla');
  hub.stop();
});

test('due spostamenti di fila: la prima connessione si chiude, la seconda fa da vecchia', async (t) => {
  const { hub, socks, arrivati } = banco(t, 'sette', '77');
  await hub.watch({ login: 'sette', user_id: '77' });
  socks[0].messaggio(benvenuto('s1'));
  await flush();
  socks[0].messaggio(sposta('wss://nuova.example/ws'));
  await flush();
  socks[1].messaggio(sposta('wss://ancora.example/ws'));
  await flush();
  assert.equal(socks.length, 3);
  assert.equal(socks[0].readyState, 3, 'la prima non resta appesa');
  assert.equal(socks[1].readyState, 1, 'la seconda porta eventi fino al benvenuto della terza');
  socks[1].messaggio(evento('d1', 'sulla seconda'));
  socks[2].messaggio(benvenuto('s1'));
  await flush();
  assert.deepEqual(arrivati, ['sulla seconda']);
  assert.equal(socks[1].readyState, 3);
  hub.stop();
});

test('uno spostamento senza indirizzo: si riparte da capo e la vecchia si chiude subito', async (t) => {
  const { hub, socks } = banco(t, 'otto', '88');
  await hub.watch({ login: 'otto', user_id: '88' });
  socks[0].messaggio(benvenuto('s1'));
  await flush();
  socks[0].messaggio(sposta(undefined));
  await flush();
  assert.equal(socks.length, 2);
  assert.equal(socks[1].url, 'wss://eventsub.wss.twitch.tv/ws');
  assert.equal(socks[0].readyState, 3);
  hub.stop();
});
