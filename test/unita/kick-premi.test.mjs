// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I PREMI DEL CANALE SU KICK (docs/PIATTAFORME.md, «I premi del canale su
// Kick»; docs.kick.com: channel.reward.redemption.updated e /channels/rewards):
//  · l'evento si traduce; un riscatto nasce una volta sola, anche se Kick lo
//    rimanda quando lo streamer lo accetta, e anche dopo un riavvio;
//  · nasce = prima volta che si vede l'id con uno stato che non e' «rifiutato»;
//  · passa dalla stessa porta dei riscatti di Twitch, con la stessa forma: si
//    risponde su Kick e lo si chiude con chi premia su Kick (accept/reject);
//  · chi premia su Kick ha la forma di helix, e senza permesso non chiama;
//  · la penitenza parla dove e' stata riscattata, anche alla fine;
//  · «punti rimborsati» solo dove e' documentato: su Twitch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('andrybot-kick-premi-');
const { streamers, pointAlerts, statoVivo } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
const { daEvento } = await import('../../src/kick/messaggio.js');
const riscatti = await import('../../src/kick/riscatti.js');
const K = await import('../../src/kick/api.js');
const { SCOPE } = await import('../../src/kick/auth.js');
const { PenitenzeEngine } = await import('../../src/features/penitenze.js');
process.on('exit', () => casa.pulisci());

let n = 0;
const canale = () => { const c = `kick.premi${++n}`; streamers.upsertApproved(c, c); return c; };
const ULID1 = '01KBHE78QE4HZY1617DK5FC7YD';
const PREMIO = '01KBHE7RZNHB0SKDV1H86CD4F3';
// l'esempio di docs.kick.com, «Channel Reward Redemption Updated»
const esempio = (status = 'pending', id = ULID1) => ({
  id, user_input: 'unban me', status, redeemed_at: '2025-12-02T22:54:19.323Z',
  reward: { id: PREMIO, title: 'Uban Request', cost: 1000, description: 'Only good reasons pls' },
  redeemer: { user_id: 123, username: 'naughty-user', is_verified: false, profile_picture: '', channel_slug: 'naughty_user' },
  broadcaster: { user_id: 333, username: 'gigachad', is_verified: true, profile_picture: '', channel_slug: 'gigachad' },
});

test('l\'evento di Kick si traduce: chi, il premio, il testo, lo stato', () => {
  const ev = daEvento('channel.reward.redemption.updated', esempio(), { canale: 'kick.x' });
  assert.deepEqual(ev, {
    piattaforma: 'kick', channel: 'kick.x', utente: 'naughty-user', utenteId: '123', tipo: 'riscatto',
    riscatto: { id: ULID1, stato: 'pending', testo: 'unban me', premio: { id: PREMIO, titolo: 'Uban Request', costo: 1000, descrizione: 'Only good reasons pls' } },
  });
  assert.equal(daEvento('channel.reward.redemption.updated', { ...esempio(), reward: null }, { canale: 'kick.x' }), null, 'senza premio non e\' un riscatto');
  assert.ok(K.EVENTI.some((e) => e.name === 'channel.reward.redemption.updated' && e.version === 1), 'e ci si iscrive');
});

test('un riscatto nasce una volta: pending, poi l\'accettazione non lo rifa\'', () => {
  const ch = canale();
  assert.equal(riscatti.nascita(ch, { id: 'a', stato: 'pending' }), true);
  assert.equal(riscatti.nascita(ch, { id: 'a', stato: 'accepted' }), false, 'lo streamer lo accetta: non rinasce');
  assert.equal(riscatti.nascita(ch, { id: 'a', stato: 'pending' }), false, 'Kick lo rimanda: non rinasce');
  assert.equal(riscatti.nascita(ch, { id: 'b', stato: 'accepted' }), true, 'un premio che salta la coda nasce gia\' accettato');
  assert.equal(riscatti.nascita(ch, { id: 'c', stato: 'rejected' }), false, 'un rifiutato non nasce');
  assert.equal(riscatti.nascita(ch, { id: 'c', stato: 'pending' }), true, 'e non segna niente');
  assert.equal(riscatti.nascita(ch.toUpperCase(), { id: 'a', stato: 'pending' }), false, 'il canale si legge in minuscolo');
  assert.deepEqual(statoVivo.leggi(ch, 'kick-riscatti').ids, ['a', 'b', 'c'], 'nel database: un riavvio non lo fa rinascere');
});

test('se ne ricordano gli ultimi, i piu\' recenti', () => {
  const ch = canale();
  for (let i = 0; i < riscatti.MAX + 3; i++) riscatti.nascita(ch, { id: 'r' + i, stato: 'pending' });
  const ids = statoVivo.leggi(ch, 'kick-riscatti').ids;
  assert.equal(ids.length, riscatti.MAX);
  assert.equal(ids[0], 'r3');
  assert.equal(ids.at(-1), 'r' + (riscatti.MAX + 2));
});

// --- la porta dei riscatti -------------------------------------------------------

function bot() {
  const io = Object.create(BotManager.prototype);
  io._liveState = new Map();
  io.helix = { aggiornaRedemption: async (...a) => { io.helixChiusi.push(a); return true; } };
  io.helixChiusi = [];
  io.detti = [];
  io.vocePer = (m) => (t) => io.detti.push([m.piattaforma || 'twitch', t]);
  io.say = (_c, t) => io.detti.push(['say', t]);
  io.riscatti = [];
  io.eventi = [];
  io._riscatto = function (ch, data) { io.riscatti.push([ch, data]); };
  io._dispatchEvent = (ev) => io.eventi.push(ev);
  return io;
}

test('un riscatto di Kick passa dalla porta di Twitch, con la sua forma, una volta sola', async () => {
  const ch = canale();
  const io = bot();
  const ev = daEvento('channel.reward.redemption.updated', esempio('pending'), { canale: ch });
  await io.eventoEsterno(ev);
  await io.eventoEsterno(daEvento('channel.reward.redemption.updated', esempio('accepted'), { canale: ch }));
  assert.equal(io.riscatti.length, 1, 'accettato dopo: non si rifa\'');
  const [dove, data] = io.riscatti[0];
  assert.equal(dove, ch);
  assert.deepEqual(data, {
    id: ULID1, status: 'pending', user_input: 'unban me', user_name: 'naughty-user', user_login: 'naughty-user', user_id: '123',
    reward: { id: PREMIO, title: 'Uban Request', cost: 1000, prompt: 'Only good reasons pls' }, piattaforma: 'kick',
  });
  assert.deepEqual(io.eventi.map((e) => [e.type, e.piattaforma]), [['channel.channel_points_custom_reward_redemption.add', 'kick']], 'moduli e memoria lo vedono, con la piattaforma');
});

test('l\'avviso del premio parla su Kick e chiude il riscatto con chi premia su Kick', async () => {
  const ch = canale();
  pointAlerts.add(ch, { rewardId: PREMIO, titolo: 'Uban Request', costo: 1000, effetto: '', suono: '', testo: 'Grazie {user}!', opzioni: '' });
  const io = bot();
  delete io._riscatto;                                   // la porta vera
  io.effects = null; io.penitenze = null; io.muro = null;
  K.salvaToken(ch, { accessToken: 'tok', refreshToken: '', scopes: SCOPE, expiresAt: Date.now() + 3_600_000 }, '9');
  const chiamate = [];
  const vero = globalThis.fetch;
  globalThis.fetch = async (url, o = {}) => { chiamate.push([String(url), o.method, o.body ? JSON.parse(o.body) : null]); return new Response(JSON.stringify({ data: [] }), { status: 200 }); };
  try {
    io._riscatto(ch, { id: ULID1, reward: { id: PREMIO, title: 'Uban Request' }, user_name: 'Giada', piattaforma: 'kick' });
    await new Promise((r) => setTimeout(r, 30));
  } finally { globalThis.fetch = vero; }
  assert.deepEqual(io.detti, [['kick', 'Grazie Giada!']]);
  assert.deepEqual(chiamate.filter((c) => /redemptions/.test(c[0])), [['https://api.kick.com/public/v1/channels/rewards/redemptions/accept', 'POST', { ids: [ULID1] }]]);
  assert.equal(io.helixChiusi.length, 0, 'a Twitch non si chiede niente');
});

test('un riscatto di Twitch resta a Twitch', async () => {
  const ch = canale();
  pointAlerts.add(ch, { rewardId: 'tw-1', titolo: 'Ciao', costo: 1, effetto: '', suono: '', testo: 'Ciao {user}', opzioni: '' });
  const io = bot();
  delete io._riscatto;
  io.effects = null; io.penitenze = null; io.muro = null;
  io._riscatto(ch, { id: 'red-1', reward: { id: 'tw-1', title: 'Ciao' }, user_name: 'Marco' });
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(io.detti, [['twitch', 'Ciao Marco']]);
  assert.deepEqual(io.helixChiusi.map((a) => a.slice(1)), [['tw-1', 'red-1', 'FULFILLED']]);
});

// --- chi premia su Kick ------------------------------------------------------------

function rete(stato = 200, corpo = { data: [] }) {
  const chiamate = [];
  const fetchImpl = async (url, o = {}) => {
    chiamate.push({ url: String(url), metodo: o.method || 'GET', corpo: o.body ? JSON.parse(o.body) : null });
    return new Response(stato === 204 ? null : JSON.stringify(corpo), { status: stato });
  };
  return { chiamate, fetchImpl };
}
const conPremi = (login) => K.salvaToken(login, { accessToken: 'tok', refreshToken: '', scopes: SCOPE, expiresAt: Date.now() + 3_600_000 }, '9');
const senzaPremi = (login) => K.salvaToken(login, { accessToken: 'tok', refreshToken: '', scopes: SCOPE.filter((s) => !s.startsWith('channel:rewards')), expiresAt: Date.now() + 3_600_000 }, '9');

test('chi premia su Kick ha la forma di helix, con le chiamate di Kick', async () => {
  conPremi('kick.p1');
  assert.ok(SCOPE.includes('channel:rewards:read') && SCOPE.includes('channel:rewards:write'));
  const lista = rete(200, { data: [{ id: PREMIO, title: 'Uban Request', cost: 1000, is_enabled: true, is_user_input_required: true }] });
  assert.deepEqual(await K.premiKick('kick.p1', lista).listaRewardsTutti('kick.p1'),
    [{ id: PREMIO, title: 'Uban Request', cost: 1000, enabled: true, richiedeTesto: true, piattaforma: 'kick' }]);
  assert.equal(lista.chiamate[0].url, 'https://api.kick.com/public/v1/channels/rewards');
  const crea = rete(200, { data: { id: PREMIO, title: 'Vietami una parola', cost: 500 } });
  const r = await K.premiKick('kick.p1', crea).creaReward('kick.p1', { titolo: 'x'.repeat(80), costo: 500, userInput: true, prompt: 'Scrivi la parola' });
  assert.deepEqual(r, { id: PREMIO, title: 'Vietami una parola', cost: 500 });
  assert.deepEqual(crea.chiamate[0].corpo, { title: 'x'.repeat(50), cost: 500, is_enabled: true, should_redemptions_skip_request_queue: false, is_user_input_required: true, description: 'Scrivi la parola' });
  const rifiuta = rete(200, { data: [] });
  assert.equal(await K.premiKick('kick.p1', rifiuta).aggiornaRedemption('kick.p1', PREMIO, ULID1, 'CANCELED'), true);
  assert.equal(rifiuta.chiamate[0].url, 'https://api.kick.com/public/v1/channels/rewards/redemptions/reject');
  const fallito = rete(200, { data: [{ id: ULID1, reason: 'not found' }] });
  assert.equal(await K.premiKick('kick.p1', fallito).aggiornaRedemption('kick.p1', PREMIO, ULID1, 'FULFILLED'), false, 'Kick elenca i non riusciti');
  const togli = rete(204);
  assert.equal(await K.premiKick('kick.p1', togli).eliminaReward('kick.p1', PREMIO), true);
  assert.deepEqual([togli.chiamate[0].metodo, togli.chiamate[0].url], ['DELETE', 'https://api.kick.com/public/v1/channels/rewards/' + PREMIO]);
});

test('senza i permessi dei premi, e con id che non sono di Kick, non si chiama Kick', async () => {
  senzaPremi('kick.p2');
  const r = rete();
  const p = K.premiKick('kick.p2', r);
  assert.deepEqual(await p.listaRewardsTutti(), []);
  assert.equal(await p.aggiornaRedemption('kick.p2', PREMIO, ULID1, 'FULFILLED'), false);
  await assert.rejects(p.creaReward('kick.p2', { titolo: 'x', costo: 1 }), (e) => e.status === 403);
  conPremi('kick.p3');
  assert.equal(await K.premiKick('kick.p3', r).aggiornaRedemption('kick.p3', PREMIO, '../../users', 'FULFILLED'), false);
  assert.equal(await K.premiKick('kick.p3', r).eliminaReward('kick.p3', 'tw-uuid-1234'), false);
  assert.equal(r.chiamate.length, 0);
});

// --- la penitenza parla dove e' stata riscattata -------------------------------

test('la penitenza riscattata su Kick parla su Kick, all\'inizio e alla fine', async () => {
  const detti = [];
  const e = new PenitenzeEngine({ say: (ch, t, dove) => detti.push([dove, t]), effects: null });
  e.cfg = () => ({ attivo: true, premioVieta: 'Vietami una parola', durataMin: 1 });
  e._salva = () => {}; e._avviaSweep = () => {};
  assert.equal(e.daRiscatto('kick.x', { reward: { title: 'Vietami una parola' }, user_input: 'cioe', user_name: 'Giada', piattaforma: 'kick' }), true);
  const pen = e.attive.get('kick.x')[0];
  assert.equal(pen.dove, 'kick', 'si ricorda dove: anche dopo un riavvio');
  await e._concludi('kick.x', pen);
  assert.deepEqual(detti.map((d) => d[0]), ['kick', 'kick']);
  e.daRiscatto('casa', { reward: { title: 'Vietami una parola' }, user_input: 'cioe', user_name: 'Marco' });
  assert.equal(detti.at(-1)[0], 'twitch', 'un riscatto di Twitch resta a Twitch');
});

test('il bot da\' alle penitenze una voce che sa dove parlare', () => {
  const io = bot();
  io.parlaDove('kick.x', 'su Kick', 'kick');
  io.parlaDove('casa', 'nella chat del canale');
  assert.deepEqual(io.detti, [['kick', 'su Kick'], ['say', 'nella chat del canale']]);
  const src = readFileSync(new URL('../../src/bot.js', import.meta.url), 'utf8');
  assert.match(src, /new PenitenzeEngine\(\{[\s\S]{0,300}say: \(ch, t, dove\) => this\.parlaDove\(ch, t, dove\),/);
});

test('il contatore legato al premio conta il riscatto di Kick e lo dice su Kick', async () => {
  const ch = canale();
  const { contatori: archivio } = await import('../../src/db.js');
  archivio.upsert(ch, { comando: 'morti', valore: 0 });
  archivio.upsert(ch, { comando: 'morti', rewardId: PREMIO });
  const io = bot();
  delete io._riscatto;
  io.effects = null; io.penitenze = null; io.muro = null;
  io._riscatto(ch, { id: ULID1, reward: { id: PREMIO, title: 'Una morte' }, user_name: 'Giada', piattaforma: 'kick' });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(archivio.get(ch, 'morti').valore, 1);
  assert.ok(io.detti.length >= 1 && io.detti.every(([dove]) => dove === 'kick'), `detto su Kick: ${JSON.stringify(io.detti)}`);
});

test('«punti rimborsati» si dice solo su Twitch, dove il rifiuto rimborsa per documentazione', () => {
  const src = readFileSync(new URL('../../src/features/songrequest.js', import.meta.url), 'utf8');
  assert.match(src, /const rimborsa = \(data\?\.piattaforma \|\| 'twitch'\) === 'twitch';/);
  assert.equal((src.match(/rimb && rimborsa \? ' Punti rimborsati\.'/g) || []).length, 2);
  assert.doesNotMatch(src, /rimb \? ' Punti rimborsati\.'/);
});

// --- i permessi arrivati dopo: una lista sola --------------------------------------

test('i permessi arrivati dopo stanno in una lista, e da li\' si ricavano controlli e mancanti', async () => {
  const { PERMESSI_NUOVI } = await import('../../src/kick/auth.js');
  assert.deepEqual(PERMESSI_NUOVI.map((p) => p.id), ['canale', 'premi']);
  for (const p of PERMESSI_NUOVI) for (const s of p.scope) assert.ok(SCOPE.includes(s), `${s} si chiede nel collegamento`);
  const vecchio = ['user:read', 'channel:read', 'chat:write', 'events:subscribe'];
  K.salvaToken('kick.pv1', { accessToken: 'tok', refreshToken: '', scopes: vecchio, expiresAt: Date.now() + 3_600_000 }, '9');
  assert.deepEqual(K.permessiMancanti('kick.pv1'), ['canale', 'premi']);
  assert.equal(K.puoCambiareCanale('kick.pv1'), false);
  assert.equal(K.puoPremiare('kick.pv1'), false);
  K.salvaToken('kick.pv2', { accessToken: 'tok', refreshToken: '', scopes: [...vecchio, 'channel:write', 'channel:rewards:read'], expiresAt: Date.now() + 3_600_000 }, '9');
  assert.deepEqual(K.permessiMancanti('kick.pv2'), ['premi'], 'un permesso a meta\' manca ancora');
  assert.equal(K.puoCambiareCanale('kick.pv2'), true);
  K.salvaToken('kick.pv3', { accessToken: 'tok', refreshToken: '', scopes: SCOPE, expiresAt: Date.now() + 3_600_000 }, '9');
  assert.deepEqual(K.permessiMancanti('kick.pv3'), []);
  assert.deepEqual(K.permessiMancanti('kick.nessuno'), [], 'senza collegamento non manca niente: manca Kick');
});

test('un id di Kick si riconosce dalla forma: ULID, non UUID', () => {
  assert.equal(K.eIdKick(PREMIO), true);
  assert.equal(K.eIdKick('0f3c2b1a-1111-2222-3333-444455556666'), false);
  assert.equal(K.eIdKick(''), false);
});
