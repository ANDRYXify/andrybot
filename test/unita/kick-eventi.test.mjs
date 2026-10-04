// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// GLI EVENTI DI KICK PASSANO DALLA STESSA PORTA DI TWITCH (bot.js,
// eventoEsterno → _dispatchEvent; docs/PIATTAFORME.md, «Gli eventi di Kick»):
//  · un follow o un abbonamento su Kick finisce nella serata: il rapporto lo conta;
//  · si risponde nella chat dove e' successo, non su Twitch;
//  · le clip e l'anti-bot, che parlano con Twitch, ascoltano solo Twitch;
//  · un modulo «su evento» sa la piattaforma: un timeout non va mai a Twitch;
//  · un follow ripetuto si ferma, chi torna dopo mesi e' un ritorno;
//  · titolo e categoria cambiati arrivano subito, senza inventare un giro;
//  · un canale gia' collegato riceve anche gli eventi nuovi: si aggiunge solo
//    quello che manca.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('andrybot-kick-eventi-');
const { streamers } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
const { ModulesEngine } = await import('../../src/features/modules.js');
const rapporto = await import('../../src/features/rapporto.js');
const seguiti = await import('../../src/features/seguiti.js');
const K = await import('../../src/kick/api.js');
const { daEvento } = await import('../../src/kick/messaggio.js');
const { SCOPE } = await import('../../src/kick/auth.js');
process.on('exit', () => casa.pulisci());

let n = 0;
const canale = () => { const c = `kick.eventi${++n}`; streamers.upsertApproved(c, c); return c; };

// Un bot senza costruttore: si guarda chi riceve l'evento e in che chat si parla.
function bot() {
  const io = Object.create(BotManager.prototype);
  io._liveState = new Map();
  io.detti = [];
  io.vocePer = (m) => (t) => io.detti.push([m.piattaforma || 'twitch', t]);
  io.say = (_c, t) => io.detti.push(['say di Twitch', t]);
  io.ricevuti = { clip: 0, antibot: 0, alert: [], moduli: [] };
  io.clips = { onEvent: () => { io.ricevuti.clip++; } };
  io.antibot = { onFollow: () => { io.ricevuti.antibot++; }, onRaid: () => {} };
  io.alerts = { onEvent: (ev) => io.ricevuti.alert.push(ev.type) };
  io.modules = { onEvent: (ev, say) => { io.ricevuti.moduli.push(ev); say('grazie ' + ev.data.user_name); } };
  io.brain = { onEvent: (_ev, say) => say('che bello') };
  return io;
}

test('un follow e un abbonamento su Kick finiscono nella serata, e il rapporto li conta', async () => {
  const ch = canale();
  const io = bot();
  const t0 = Date.now() - 1000;
  await io.eventoEsterno({ piattaforma: 'kick', channel: ch, tipo: 'seguito', utente: 'Giada' });
  await io.eventoEsterno({ piattaforma: 'kick', channel: ch, tipo: 'abbonamento', utente: 'Marco', mesi: 1 });
  await io.eventoEsterno({ piattaforma: 'kick', channel: ch, tipo: 'regali', utente: 'Lia', quanti: 3 });
  const r = rapporto.raccogli(ch, { inizio: t0, fine: Date.now() + 1000 });
  assert.equal(r.follow, 1);
  assert.equal(r.sub, 4, 'uno suo e tre regalati');
  assert.equal(r.regali, 3);
  assert.deepEqual(io.ricevuti.alert, ['channel.follow', 'channel.subscribe', 'channel.subscription.gift'], 'e gli alert ci sono ancora');
});

test('si risponde nella chat di Kick, e le clip e l\'anti-bot di Twitch non lo sentono', async () => {
  const ch = canale();
  const io = bot();
  await io.eventoEsterno({ piattaforma: 'kick', channel: ch, tipo: 'seguito', utente: 'Pino' });
  assert.deepEqual(io.detti, [['kick', 'che bello'], ['kick', 'grazie Pino']], 'il cervello e i moduli parlano su Kick');
  assert.equal(io.ricevuti.clip, 0);
  assert.equal(io.ricevuti.antibot, 0);
  assert.equal(io.ricevuti.moduli[0].piattaforma, 'kick');
  // Twitch resta com'era
  const tw = bot();
  tw._dispatchEvent({ channel: ch, type: 'channel.follow', data: { user_name: 'Ugo', user_login: 'ugo' } });
  assert.deepEqual(tw.detti, [['twitch', 'che bello'], ['twitch', 'grazie Ugo']]);
  assert.equal(tw.ricevuti.clip, 1);
  assert.equal(tw.ricevuti.antibot, 1);
});

test('un follow ripetuto su Kick si ferma, chi torna dopo mesi e\' un ritorno', async () => {
  const ch = canale();
  const io = bot();
  await io.eventoEsterno({ piattaforma: 'kick', channel: ch, tipo: 'seguito', utente: 'rita' });
  await io.eventoEsterno({ piattaforma: 'kick', channel: ch, tipo: 'seguito', utente: 'rita' });
  assert.equal(io.ricevuti.moduli.length, 1, 'il secondo e\' lo stesso follow');
  seguiti.classifica(ch, 'kick', 'remo', Date.now() - 3650 * 86_400_000);
  await io.eventoEsterno({ piattaforma: 'kick', channel: ch, tipo: 'seguito', utente: 'remo' });
  assert.equal(io.ricevuti.moduli.at(-1).type, 'channel.follow.ritorno');
});

test('un modulo su un evento di Kick sa la piattaforma: il timeout va a chi modera su Kick, mai a Twitch', async () => {
  // l'id arriva con l'evento (follower.user_id): e' quello di Kick
  assert.equal(daEvento('channel.followed', { follower: { username: 'Tea', user_id: 777 } }, { canale: 'kick.x' }).utenteId, '777');
  const io = bot();
  const ch = canale();
  await io.eventoEsterno({ piattaforma: 'kick', channel: ch, tipo: 'seguito', utente: 'Tea', utenteId: '777' });
  assert.equal(io.ricevuti.moduli[0].data.user_id, '777');
  const pause = [];
  const twitch = { timeoutUser: async () => { throw new Error('a Twitch no'); }, getUserByLogin: async () => { throw new Error('a Twitch no'); } };
  const mod = new ModulesEngine({ effects: null, helix: twitch, moderatori: { kick: { timeoutUser: async (c, id, s) => { pause.push([c, id, s]); return { ok: true }; } } } });
  const ctx = mod._ctxDaEvento(io.ricevuti.moduli[0], ch, 'follow');
  assert.equal(ctx.piattaforma, 'kick');
  const detti = [];
  await mod._timeout({ ...ctx, staff: true }, 60, (t) => detti.push(t));
  assert.deepEqual(pause, [[ch, '777', 60]]);
  assert.deepEqual(detti, []);
  // «Su quali piattaforme» vale anche per gli eventi: un modulo solo per Twitch
  // non scatta per un follow di Kick
  const soloTwitch = { nome: 'grazie', condizioni: { piattaforme: ['twitch'] } };
  assert.equal((await mod._condizioniOk(soloTwitch, ctx)).motivo, 'piattaforma');
  assert.equal((await mod._condizioniOk(soloTwitch, mod._ctxDaEvento({ type: 'channel.follow', data: { user_login: 'x' } }, ch, 'follow'))).ok, true);
  // senza id (un regalo anonimo) non si ferma nessuno, e non si cerca per nome su Twitch
  await mod._timeout({ ...mod._ctxDaEvento({ piattaforma: 'kick', data: { user_name: 'Anonimo', user_login: 'anonimo' } }, ch, 'follow'), staff: true }, 60, (t) => detti.push(t));
  assert.equal(pause.length, 1);
  const tw = mod._ctxDaEvento({ type: 'channel.follow', data: { user_id: '42', user_login: 'tea' } }, 'tizio', 'follow');
  assert.equal(tw.piattaforma, 'twitch');
  assert.equal(tw.userId, '42');
});

test('titolo e categoria cambiati arrivano subito, senza un giro finto nel rapporto', async () => {
  assert.deepEqual(daEvento('livestream.metadata.updated', { metadata: { title: 'Si cambia', category: { name: 'Minecraft' } } }, { canale: 'Kick.Y' }),
    { piattaforma: 'kick', channel: 'kick.y', utente: '', tipo: 'metadati', titolo: 'Si cambia', categoria: 'Minecraft' });
  const ch = canale();
  const io = bot();
  io._vistaKick(ch, { live: true, spettatori: 30, titolo: 'Prima', categoria: 'Just Chatting', inizio: Date.now() - 60_000 }, { conta: false });
  rapporto.apri(ch, { piattaforma: 'kick' });
  io._vistaKick(ch, { spettatori: 30 });
  assert.equal(rapporto.inCorso(ch).media, 30);
  await io.eventoEsterno({ piattaforma: 'kick', channel: ch, tipo: 'metadati', titolo: 'Dopo', categoria: 'Minecraft' });
  assert.equal(io.kickVisto(ch).titolo, 'Dopo');
  assert.equal(io.kickVisto(ch).categoria, 'Minecraft');
  assert.equal(io.kickVisto(ch).spettatori, 30, 'gli spettatori di prima restano');
  assert.equal(rapporto.inCorso(ch).media, 30, 'nessun giro senza il numero: uno a zero dimezzerebbe la media');
});

test('«non lo so» non e\' zero spettatori', () => {
  const ch = canale();
  rapporto.apri(ch, { piattaforma: 'kick' });
  rapporto.osservaGiro(ch, { piattaforma: 'kick', spettatori: 50 });
  rapporto.osservaGiro(ch, { piattaforma: 'kick', spettatori: null });
  rapporto.osservaGiro(ch, { piattaforma: 'kick' });
  assert.equal(rapporto.inCorso(ch).media, 50);
});

test('un canale gia\' collegato riceve gli eventi nuovi: si aggiunge solo quello che manca', async () => {
  K.salvaToken('kick.allinea', { accessToken: 't', refreshToken: '', scopes: SCOPE, expiresAt: Date.now() + 3_600_000 }, '9');
  const chiamate = [];
  const gia = K.EVENTI.slice(0, -1).map((e) => ({ id: 'x', event: e.name, version: e.version }));
  const fetchImpl = async (url, o = {}) => {
    chiamate.push({ metodo: o.method || 'GET', corpo: o.body ? JSON.parse(o.body) : null });
    const data = (o.method || 'GET') === 'GET' ? gia : [{ name: K.EVENTI.at(-1).name, version: 1, subscription_id: 's' }];
    return new Response(JSON.stringify({ data }), { status: 200 });
  };
  const r = await K.allineaIscrizioni('kick.allinea', { fetchImpl });
  assert.deepEqual(r, { ok: true, aggiunti: [K.EVENTI.at(-1).name] });
  assert.deepEqual(chiamate[1].corpo, { events: [K.EVENTI.at(-1)], method: 'webhook' }, 'solo quello che manca');
  // gia' tutto: non si chiama niente
  const tutti = K.EVENTI.map((e) => ({ event: e.name, version: e.version }));
  let post = 0;
  const r2 = await K.allineaIscrizioni('kick.allinea', { fetchImpl: async (_u, o = {}) => { if (o.method === 'POST') post++; return new Response(JSON.stringify({ data: tutti })); } });
  assert.deepEqual(r2, { ok: true, aggiunti: [] });
  assert.equal(post, 0);
  // Kick rifiuta un evento: si dice quale
  const r3 = await K.allineaIscrizioni('kick.allinea', { fetchImpl: async (_u, o = {}) => new Response(JSON.stringify({ data: o.method === 'POST' ? [{ name: K.EVENTI.at(-1).name, error: 'not allowed' }] : gia })) });
  assert.equal(r3.ok, false);
  assert.match(r3.errore, /not allowed/);
});
