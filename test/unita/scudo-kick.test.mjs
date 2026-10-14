// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO SCUDO SU KICK (docs/SCUDO.md, «Su Kick»).
//
// Una persona per lo scudo e' (piattaforma, nome, id): «mario» su Twitch e
// «mario» su Kick sono due persone, e anche gli id si ripetono fra le due. Qui
// si prova che ogni pezzo lo sa:
//
//  · un'ondata di follow su Kick alza lo scudo e zittisce gli alert;
//  · le azioni su una persona di Kick vanno alla moderazione di Kick, mai a
//    helix, e il «blocca» (che su Kick non c'e') diventa un ban;
//  · un attacco solo su Kick non chiude la chat di Twitch; se poi arriva anche
//    su Twitch, la serranda di Twitch si alza allora;
//  · «kick:mario» nelle liste vale per Kick e non per Twitch, e il contrario;
//  · chi era coinvolto, il registro e la bonifica tengono la piattaforma;
//  · in chat su Kick: il coro si ferma su Kick, e la trattenuta degli account
//    nuovi non c'e' (Kick non dice l'eta').
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('scudo-kick-');
const { streamers } = await import('../../src/db.js');
const ab = await import('../../src/features/antibot.js');
const inc = await import('../../src/features/incidenti.js');
const bon = await import('../../src/features/bonifica.js');
const LIV = await import('../../src/features/livelli.js');
const { Esecutore, verdetto, AZIONI } = await import('../../src/features/enforcement.js');
const { BotManager } = await import('../../src/bot.js');
const { nomeAccount } = await import('../../src/web/impostazioni-moderazione.js');
test.after(async () => { await ab.spegniScudo(); casa.pulisci(); });

const flush = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };
const aspetta = async (cond, ms = 9000) => { const fine = Date.now() + ms; while (!cond() && Date.now() < fine) await new Promise((r) => setTimeout(r, 50)); return cond(); };

// Chi modera, spiato: ogni chiamata si scrive col suo nome.
function spia(nome) {
  const chiamate = [];
  const f = (azione) => async (...a) => { chiamate.push({ azione, a }); return { ok: true }; };
  return {
    chiamate, nome,
    chatSoloFollower: f('soloFollower'), chatLenta: f('lenta'), shieldMode: f('shield'),
    bloccaUtente: f('blocca'), timeoutUser: f('timeout'), deleteMessage: f('cancella'),
    getUserByLogin: async (l) => { chiamate.push({ azione: 'profilo', a: [l] }); return null; },
  };
}

function canale(ch, antibot = {}) {
  streamers.upsertApproved(ch, ch, String(ch.length) + '7');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10, rafficaSecondi: 30, ...antibot } });
}

function bot(ch) {
  const visti = { alert: [] };
  const helix = spia('helix'), kick = spia('kick');
  const io = Object.create(BotManager.prototype);
  io.antibot = new ab.AntiBot({ helix, kick });
  io.alerts = { onEvent: (ev) => visti.alert.push(`${ev.piattaforma || 'twitch'}:${ev.type}`) };
  io.brain = { onEvent: () => {} };
  io.muro = { suEvento: async () => {} };
  io.modules = { onEvent: () => {} };
  io.bus = { emit: () => {} };
  io.clips = { onEvent: () => {} };
  io.vocePer = () => () => {};
  return { io, visti, helix, kick };
}

const followKick = (ch, i, ts) => ({ channel: ch, piattaforma: 'kick', type: 'channel.follow', ts,
  data: { user_id: String(9000 + i), user_login: 'zzq' + i + 'x', user_name: 'zzq' + i + 'x', piattaforma: 'kick' } });

test('un\'ondata di follow su Kick alza lo scudo, zittisce gli alert e ferma i bot su Kick', async () => {
  const ch = 'ondakick';
  canale(ch);
  const { io, visti, helix, kick } = bot(ch);
  const t0 = Date.now();
  for (let i = 0; i < 16; i++) { io._dispatchEvent(followKick(ch, i, t0 + i * 200)); await flush(); }
  assert.ok(LIV.almeno(ab.assetto(ch).livello, 'attacco'), `livello ${ab.assetto(ch).livello}`);
  assert.ok(visti.alert.length < 16, `sotto attacco i follow di Kick non fanno festa (${visti.alert.length})`);
  const raffica = ab.registro(ch).find((v) => v.azione === 'raffica');
  assert.equal(raffica?.piattaforma, 'kick', 'la riga dell\'ondata dice che era su Kick');
  assert.ok(await aspetta(() => kick.chiamate.some((c) => c.azione === 'timeout')), 'i bot si fermano su Kick');
  for (const c of kick.chiamate.filter((x) => x.azione === 'timeout')) assert.equal(c.a[2], 0, 'col ban: Kick non toglie il follow');
  assert.deepEqual(helix.chiamate.map((c) => c.azione), [], 'Twitch non si tocca: niente serranda, niente ban, nessun profilo chiesto');
  const righe = ab.registro(ch, { limite: 200 }).filter((v) => v.azione === 'ban');
  assert.ok(righe.length && righe.every((v) => v.piattaforma === 'kick'), 'nel registro i ban sono di Kick');
});

test('un follow di Kick non fa chiedere a Twitch il profilo di un nome di Kick', async () => {
  const ch = 'profilokick';
  canale(ch, { controllaAccount: true, soglia: 1 });
  const { io, helix } = bot(ch);
  await io.antibot.onFollow(followKick(ch, 1, Date.now()));
  assert.ok(!helix.chiamate.some((c) => c.azione === 'profilo'), 'su Twitch quel nome e\' un\'altra persona');
  await io.antibot.onFollow({ channel: ch, type: 'channel.follow', data: { user_id: '77', user_login: 'tizio', user_name: 'tizio' } });
  assert.ok(helix.chiamate.some((c) => c.azione === 'profilo' && c.a[0] === 'tizio'), 'un follow di Twitch invece si\' (la prova sta in piedi)');
});

test('l\'esecutore sceglie la leva dalla piattaforma della persona, non dal canale', async () => {
  const helix = spia('helix'), kick = spia('kick');
  const righe = [];
  const e = new Esecutore({ helix, kick, annota: (_c, r) => righe.push(r) });
  const t = await e.esegui(verdetto({ canale: 'leva', login: 'mario', userId: '42', azione: AZIONI.BLOCCA }));
  const k = await e.esegui(verdetto({ canale: 'leva', login: 'mario', userId: '42', azione: AZIONI.BLOCCA, piattaforma: 'kick' }));
  assert.ok(t.ok && !t.doppione && k.ok && !k.doppione, 'due persone, due azioni: non un doppione');
  assert.deepEqual(helix.chiamate.map((c) => c.azione), ['blocca']);
  assert.deepEqual(kick.chiamate.map((c) => [c.azione, c.a[2]]), [['timeout', 0]], 'su Kick il blocco e\' un ban');
  assert.match(k.ripiego, /Kick non toglie il follow/);
  assert.equal(righe[1].piattaforma, 'kick');
  assert.equal(righe[0].piattaforma, undefined, 'una riga di Twitch resta come prima');
  await e.esegui(verdetto({ canale: 'leva', login: 'luca', userId: '7', azione: AZIONI.CANCELLA, messaggio: 'm1', piattaforma: 'kick' }));
  assert.deepEqual(kick.chiamate.at(-1), { azione: 'cancella', a: ['leva', 'm1'] });
  await e.ferma({ conserva: false });
});

test('un attacco solo su Kick non chiude la chat di Twitch; se arriva anche su Twitch, si', async () => {
  const ch = 'misto';
  canale(ch);
  const { io, helix } = bot(ch);
  const cfg = io.antibot.cfg(ch);
  await io.antibot._alza(ch, 'attacco', 'ondata su Kick', cfg, { piattaforma: 'kick' });
  assert.ok(LIV.almeno(ab.assetto(ch).livello, 'attacco'));
  assert.deepEqual(helix.chiamate.map((c) => c.azione), [], 'nessuna leva di Twitch');
  await io.antibot._alza(ch, 'attacco', 'ondata anche su Twitch', io.antibot.cfg(ch), { piattaforma: 'twitch' });
  const leve = helix.chiamate.map((c) => c.azione);
  assert.ok(leve.includes('soloFollower') && leve.includes('shield'), `la serranda su Twitch, quando Twitch entra (${leve})`);
  assert.ok(inc.aperto(ch).timeline.some((r) => /anche da Twitch/.test(r.cosa)), 'e il racconto lo dice');
});

test('le liste: «kick:mario» vale per Kick e non per Twitch, e il contrario', () => {
  const cfg = { extra: ['kick:mario', 'luca'], esenti: ['kick:anna'] };
  assert.equal(ab.inBloccaSempre('mario', cfg, 'kick'), true);
  assert.equal(ab.inBloccaSempre('mario', cfg, 'twitch'), false, 'mario su Twitch e\' un\'altra persona');
  assert.equal(ab.inBloccaSempre('luca', cfg, 'twitch'), true);
  assert.equal(ab.inBloccaSempre('luca', cfg, 'kick'), false, 'un nome senza prefisso e\' di Twitch');
  assert.equal(ab.nomeBot('anna', { extra: ['anna', 'kick:anna'], esenti: ['kick:anna'] }, 'kick'), false, 'esente su Kick');
  assert.equal(ab.nomeBot('anna', { extra: ['anna', 'kick:anna'], esenti: ['kick:anna'] }, 'twitch'), true, 'non su Twitch');
  assert.equal(ab.nomeBot('buyfollowers_now', {}, 'kick'), ab.nomeBot('buyfollowers_now', {}, 'twitch'), 'la forma del nome vale su tutte e due');
  assert.equal(nomeAccount('Kick:@Mario'), 'kick:mario', 'la lista salvata accetta il prefisso');
  assert.equal(nomeAccount('kick:'), '');
  assert.equal(nomeAccount('youtube:mario'), '', 'solo le piattaforme che lo scudo conosce');
});

test('chi era coinvolto e la bonifica: ognuno sulla sua piattaforma', async () => {
  const ch = 'bonificamista';
  canale(ch);
  const { io, helix, kick } = bot(ch);
  await io.antibot._alza(ch, 'attacco', 'prova', io.antibot.cfg(ch), { piattaforma: 'kick' });
  const id = inc.aperto(ch).id;
  inc.coinvolto(ch, 'mario', inc.GIUDIZI.CERTO, 0, '11');
  inc.coinvolto(ch, 'mario', inc.GIUDIZI.CERTO, 0, '22', 'kick');
  const c = inc.aperto(ch).coinvolti;
  assert.ok(c.mario && c['kick:mario'], 'due righe per due persone');
  assert.equal(c['kick:mario'].piattaforma, 'kick');
  const v = bon.verdettiPer(id, [inc.GIUDIZI.CERTO]);
  assert.deepEqual(v.map((x) => [x.login, x.userId, x.piattaforma || 'twitch']).sort(), [['mario', '11', 'twitch'], ['mario', '22', 'kick']]);
  const conf = bon.anteprima(id, [inc.GIUDIZI.CERTO]).conferma;
  const r = await ab.bonifica(id, [inc.GIUDIZI.CERTO], conf, { canale: ch });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(await aspetta(() => helix.chiamate.length && kick.chiamate.length));
  assert.deepEqual(helix.chiamate.map((x) => [x.azione, x.a[1]]), [['blocca', '11']], 'Twitch blocca il suo');
  assert.deepEqual(kick.chiamate.map((x) => [x.azione, x.a[1], x.a[2]]), [['timeout', '22', 0]], 'Kick banna il suo');
});

test('in chat su Kick: il coro si ferma su Kick, e la trattenuta dei nuovi non c\'e\'', async () => {
  const ch = 'corokick';
  canale(ch, { chatNuovi: true, chatNuoviAzione: 'elimina' });
  const { io, helix, kick } = bot(ch);
  const testo = 'questo canale fa proprio schifo andate via tutti quanti';
  let fermati = 0;
  for (let i = 0; i < 5; i++) {
    const preso = await io.antibot.controllaChat({ piattaforma: 'kick', channel: ch, user: 'voce' + i, userId: String(500 + i), id: 'msg' + i, text: testo, ts: Date.now() + i * 100 });
    if (preso) fermati++;
  }
  assert.ok(fermati >= 1, 'il coro e\' riconosciuto');
  assert.ok(await aspetta(() => kick.chiamate.some((c) => c.azione === 'cancella')), 'i messaggi si tolgono su Kick');
  assert.ok(!helix.chiamate.some((c) => c.azione === 'cancella' || c.azione === 'profilo'), 'mai su Twitch, e a Twitch non si chiede l\'eta\' di un nome di Kick');
  // la stessa frase su Twitch e' un'altra finestra: non continua il coro di Kick
  const suTwitch = await io.antibot.controllaChat({ channel: ch, user: 'voce9', userId: '9', id: 'tw1', text: testo, ts: Date.now() });
  assert.equal(helix.chiamate.some((c) => c.azione === 'cancella'), false, `una bocca su Twitch non e' un coro (${suTwitch})`);
});
