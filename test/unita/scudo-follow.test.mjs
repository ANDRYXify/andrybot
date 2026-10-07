// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// SOTTO ATTACCO IL FOLLOW NON SI FESTEGGIA (docs/SCUDO.md).
//
// Un'ondata di follow-bot sono centinaia di nomi da fabbrica, spesso insulti:
// sullo schermo, in chat, nel muro, nei moduli. Da «attacco» in su il follow di
// Twitch arriva solo allo scudo. Qui si prova che:
//
//  · la soglia e' una sola, quella dell'attacco dichiarato;
//  · lo scudo guarda per primo, quindi anche il follow che fa scattare
//    l'attacco e' gia' taciuto;
//  · taciuto vuol dire niente alert, voce, ringraziamento, muro, moduli,
//    plugin, e niente riga nel rapporto; il conto va nell'incidente;
//  · vale per il «bentornato», non per Kick e non per gli altri eventi;
//  · si ferma una volta: le scene buttano i follow in fila, e l'effetto che
//    parte un attimo dopo il suo alert ricontrolla;
//  · in sola osservazione e con la levetta spenta non tace niente;
//  · quando lo scudo scende, i follow tornano a fare festa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('scudo-follow-');
const { streamers, db } = await import('../../src/db.js');
const ab = await import('../../src/features/antibot.js');
const inc = await import('../../src/features/incidenti.js');
const LIV = await import('../../src/features/livelli.js');
const { BotManager } = await import('../../src/bot.js');
const { AlertsEngine } = await import('../../src/features/alerts.js');
const { EffectsEngine } = await import('../../src/features/effects.js');
const E = await import('../../src/features/effetti-eventi.js');
const { normDisegno } = await import('../../src/web/stile.js');
const { normalizzaAntibot } = await import('../../src/web/impostazioni-moderazione.js');
test.after(async () => { await ab.spegniScudo(); casa.pulisci(); });

const flush = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };

function helixFinto() {
  return {
    chatSoloFollower: async () => ({ ok: true }),
    chatLenta: async () => ({ ok: true }),
    shieldMode: async () => ({ ok: true }),
    bloccaUtente: async () => ({ ok: true }),
    timeoutUser: async () => ({ ok: true }),
    deleteMessage: async () => ({ ok: true }),
  };
}

function canale(ch, antibot = {}) {
  streamers.upsertApproved(ch, ch, String(ch.length) + '9');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10, rafficaSecondi: 30, ...antibot } });
}

// Un bot senza costruttore: lo scudo vero, e chi festeggia un evento spiato.
function bot(ch) {
  const visti = { alert: [], brain: [], muro: [], moduli: [], bus: [], fermi: 0 };
  const io = Object.create(BotManager.prototype);
  io.antibot = new ab.AntiBot({ helix: helixFinto(), followFermi: () => { visti.fermi++; } });
  io.alerts = { onEvent: (ev) => visti.alert.push(ev.type) };
  io.brain = { onEvent: (ev) => visti.brain.push(ev.type) };
  io.muro = { suEvento: async (ev) => { visti.muro.push(ev.type); } };
  io.modules = { onEvent: (ev) => visti.moduli.push(ev.type) };
  io.bus = { emit: (_n, ev) => visti.bus.push(ev.type) };
  io.clips = { onEvent: () => {} };
  io.vocePer = () => () => {};
  const righe = () => db.prepare("SELECT COUNT(*) n FROM messages WHERE channel=? AND user='[evento]'").get(ch).n;
  return { io, visti, righe };
}

const follow = (ch, i, extra = {}) => ({ channel: ch, type: 'channel.follow', data: { user_id: 'b' + i, user_login: 'zzq' + i + 'x', user_name: 'zzq' + i + 'x' }, ...extra });

test('una soglia sola: da «attacco» in su, la stessa della serranda', () => {
  for (const l of LIV.LIVELLI) {
    const a = LIV.assettoDi(l);
    assert.equal(a.taciFollow, LIV.almeno(l, 'attacco'), l);
    assert.equal(a.taciFollow, a.serranda, `${l}: il follow si ferma quando la porta si chiude, non prima e non dopo`);
  }
});

test('lo scudo guarda per primo: il follow che fa scattare l\'attacco e\' gia\' taciuto', async () => {
  const ch = 'ondaprima';
  canale(ch);
  const { io, visti, righe } = bot(ch);
  let scattato = -1;
  for (let i = 0; i < 16; i++) {
    const prima = ab.assetto(ch).livello;
    io._dispatchEvent(follow(ch, i));
    if (scattato < 0 && !LIV.almeno(prima, 'attacco') && LIV.almeno(ab.assetto(ch).livello, 'attacco')) scattato = i;
    await flush();
  }
  assert.ok(scattato > 0, `l'ondata deve far scattare l'attacco (livello ${ab.assetto(ch).livello})`);
  assert.equal(visti.alert.length, scattato, 'festeggiati solo i follow di prima: quello che fa scattare no');
  for (const k of ['brain', 'muro', 'moduli', 'bus']) assert.equal(visti[k].length, scattato, `${k}: come l'alert`);
  assert.equal(righe(), scattato, 'nel rapporto e nelle statistiche entrano solo quelli di prima');
  assert.equal(visti.fermi, 1, 'le scene si fermano una volta, alla salita');
  const s = inc.sintesi(inc.aperto(ch));
  assert.equal(s.taciuti, 16 - scattato, 'il conto sta nell\'incidente');
  assert.ok(inc.aperto(ch).timeline.some((r) => /non si festeggiano/.test(r.cosa)), 'e il racconto dell\'incidente lo dice');
  await io.antibot._alza(ch, 'serrata', 'prova', io.antibot.cfg(ch));
  assert.equal(visti.fermi, 1, 'dall\'attacco alla serrata i follow erano gia\' fermi: niente da buttare di nuovo');
});

test('sotto attacco: il «bentornato» tace, Kick e gli altri eventi no', async () => {
  const ch = 'ondaaltri';
  canale(ch);
  const { io, visti } = bot(ch);
  await io.antibot._alza(ch, 'attacco', 'prova', io.antibot.cfg(ch));
  io._dispatchEvent({ ...follow(ch, 1), type: 'channel.follow.ritorno' });
  assert.deepEqual(visti.alert, [], 'il bentornato e\' un follow come gli altri');
  io._dispatchEvent(follow(ch, 2, { piattaforma: 'kick' }));
  assert.deepEqual(visti.alert, ['channel.follow'], 'lo scudo guarda solo Twitch: il follow di Kick fa festa');
  io._dispatchEvent({ channel: ch, type: 'channel.subscribe', data: { user_name: 'Anna' } });
  io._dispatchEvent({ channel: ch, type: 'channel.cheer', data: { user_name: 'Anna', bits: 100 } });
  assert.deepEqual(visti.alert, ['channel.follow', 'channel.subscribe', 'channel.cheer'], 'un sub o dei bit sotto attacco si festeggiano');
  await flush();
});

test('quando lo scudo scende, i follow tornano a fare festa', async () => {
  const ch = 'ondagiu';
  canale(ch);
  const { io, visti } = bot(ch);
  await io.antibot._alza(ch, 'attacco', 'prova', io.antibot.cfg(ch));
  io._dispatchEvent(follow(ch, 1));
  assert.equal(visti.alert.length, 0);
  await io.antibot._abbassa(ch);
  assert.equal(ab.assetto(ch).livello, 'difesa');
  io._dispatchEvent(follow(ch, 2));
  assert.equal(visti.alert.length, 1, 'a «difesa» la porta e\' riaperta, e la festa pure');
  await flush();
});

test('in sola osservazione non tace niente, e il registro dice che l\'avrebbe fatto', async () => {
  const ch = 'ondavuota';
  canale(ch, { aVuoto: true });
  const { io, visti } = bot(ch);
  await io.antibot._alza(ch, 'attacco', 'prova', io.antibot.cfg(ch));
  io._dispatchEvent(follow(ch, 1));
  assert.equal(visti.alert.length, 1);
  assert.equal(visti.fermi, 0, 'e le scene non si fermano');
  assert.ok(ab.registro(ch).some((r) => r.esito === 'a-vuoto' && /niente alert dei follow/.test(r.motivo)), 'scritto nel registro');
  await flush();
});

test('con la levetta spenta il follow fa festa anche sotto attacco', async () => {
  const ch = 'ondaleva';
  canale(ch, { taciFollow: false });
  const { io, visti } = bot(ch);
  await io.antibot._alza(ch, 'attacco', 'prova', io.antibot.cfg(ch));
  io._dispatchEvent(follow(ch, 1));
  assert.equal(visti.alert.length, 1);
  assert.equal(visti.fermi, 0);
  assert.equal(ab.taciFollow(ch), false);
  canale(ch, { attivo: false });
  assert.equal(ab.taciFollow(ch), false, 'e con lo scudo spento, niente');
  await flush();
});

// Il motore degli alert vero: il follow di Twitch porta il segno che le scene
// usano per buttarlo, e il suo effetto ricontrolla prima di partire.
const CH = 'scenafollow';
streamers.request(CH, 'Scena', '1');
streamers.setStatus?.(CH, 'approved');
class Spia extends EffectsEngine { constructor() { super(); this.mandati = []; } emit(ch, p) { this.mandati.push(p); } }

test('l\'alert e l\'effetto di un follow di Twitch portano il segno; quelli di Kick e degli altri eventi no', () => {
  const fx = new Spia();
  const motore = new AlertsEngine({ effects: fx });
  streamers.setSettings(CH, { overlayGoals: [], overlayStato: {},
    alerts: { attivo: true, follow: { attivo: true }, sub: { attivo: true } },
    effettiEventi: E.normalizza({ voci: { follow: { attivo: true, pausa: 0, livelli: [{ effetto: { tipo: 'pronto', disegno: { nome: 'cuori' }, volume: 70 } }] } } }, { disegno: normDisegno }) });
  const alert = () => fx.mandati.filter((p) => p.tipo === 'alert');
  motore.onEvent({ channel: CH, type: 'channel.follow', data: { user_name: 'Anna' } });
  assert.equal(alert().at(-1).scudo, true, 'il follow di Twitch');
  motore.onEvent({ channel: CH, type: 'channel.follow', piattaforma: 'kick', data: { user_name: 'Anna' } });
  assert.equal(alert().at(-1).scudo, undefined, 'il follow di Kick no: lo scudo non lo guarda');
  motore.onEvent({ channel: CH, type: 'channel.subscribe', data: { user_name: 'Anna' } });
  assert.equal(alert().at(-1).scudo, undefined, 'il sub no');
});

test('l\'effetto di un follow che parte dopo l\'alert ricontrolla lo scudo', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let sotto = false;
  const fx = new Spia();
  const motore = new AlertsEngine({ effects: fx, taci: () => sotto });
  streamers.setSettings(CH, { overlayGoals: [], overlayStato: {},
    alerts: { attivo: true, follow: { attivo: true } },
    effettiEventi: E.normalizza({ voci: { follow: { attivo: true, pausa: 0, livelli: [{ effetto: { tipo: 'pronto', disegno: { nome: 'cuori' }, volume: 70 } }] } } }, { disegno: normDisegno }) });
  const disegni = () => fx.mandati.filter((p) => p.tipo === 'disegno');
  motore.onEvent({ channel: CH, type: 'channel.follow', data: { user_name: 'Anna' } });
  sotto = true;
  t.mock.timers.tick(1200);
  assert.equal(disegni().length, 0, 'lo scudo e\' salito fra l\'alert e l\'effetto: l\'effetto non parte');
  motore.onEvent({ channel: CH, type: 'channel.follow', piattaforma: 'kick', data: { user_name: 'Anna' } });
  t.mock.timers.tick(1200);
  assert.equal(disegni().length, 1, 'quello di un follow di Kick si');
  assert.equal(disegni()[0].scudo, undefined);
  sotto = false;
  motore.onEvent({ channel: CH, type: 'channel.follow', data: { user_name: 'Anna' } });
  t.mock.timers.tick(1200);
  assert.equal(disegni().length, 2, 'e in pace parte, col segno');
  assert.equal(disegni()[1].scudo, true);
  t.mock.timers.reset();
});

test('i fili ci sono: dal pannello allo scudo, dallo scudo alle scene', () => {
  const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
  const BOT = leggi('src/bot.js');
  assert.match(BOT, /new AlertsEngine\(\{[^}]*taci: \(ch\) => taciFollow\(ch\)/, 'l\'effetto ritardato di un follow ricontrolla lo scudo vero');
  assert.match(BOT, /followFermi: \(ch\) => this\.effects\?\.emit\?\.\(ch, \{ tipo: 'scudo', followFermi: true \}\)/, 'la salita arriva alle scene');
  assert.match(leggi('src/web/public/overlay-app.js'), /else if \(dati\.tipo === 'scudo'\) \{ if \(dati\.followFermi\) fermaFollow\(\); \}/, 'e le scene la ascoltano');
  assert.match(leggi('src/web/public/app.js'), /taciFollow: document\.getElementById\('chk-ab-tacifollow'\)\.checked,/, 'il pannello salva la levetta');
  assert.equal(normalizzaAntibot({}, {}).taciFollow, true, 'accesa di serie');
  assert.equal(normalizzaAntibot({}, { taciFollow: false }).taciFollow, false, 'e spenta resta spenta');
  assert.equal(normalizzaAntibot({ taciFollow: false }, { attivo: true }).taciFollow, false, 'anche quando si salva altro');
});
