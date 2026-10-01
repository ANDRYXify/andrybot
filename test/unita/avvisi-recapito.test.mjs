// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// GLI AVVISI SU DISCORD: il recapito, la chiusura, l'avviso all'inizio
// (docs/DISCORD-AVVISI.md, «Ottobre 2026»).
//
// Discord e' finto (fetch sostituito: ogni webhook risponde come gli si dice),
// il bot e' quello vero, e Telegram non c'e': e' il caso in cui l'avviso non
// si chiudeva mai. Le promesse:
//  · l'avviso all'inizio ha titolo e gioco anche quando /streams non sa ancora
//    niente, e niente «Spettatori 0» ne' immagine grigia;
//  · lo stesso avviso nello stesso posto parte una volta sola;
//  · un posto che rifiuta per un errore che passa riceve al giro dopo, e gli
//    altri non ricevono di nuovo; un errore che non passa non si ritenta;
//  · senza Telegram, a fine diretta l'avviso si chiude;
//  · la fine di Kick chiude Kick e non Twitch; la fine dell'amico chiude i suoi;
//  · un avviso ancora in attesa quando la diretta finisce non parte piu';
//  · l'avviso di una diretta in corso si riscrive coi dati di adesso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('avvisi-recapito-');
const { streamers, dcDest, recapiti, accessi, db } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
const avvisi = await import('../../src/features/avvisi.js');
test.after(() => casa.pulisci());

// ---- Discord finto: le chiamate, e cosa risponde ogni webhook
const chiamate = [];
const risposte = new Map();       // webhook -> [stato, stato, ...] (poi 200)
let n = 0;
const vero = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const corpo = opts.body ? JSON.parse(opts.body) : null;
  const wh = u.replace(/\?wait=true$/, '').replace(/\/messages\/[^/]+$/, '');
  chiamate.push({ wh, metodo: opts.method || 'GET', url: u, corpo });
  const coda = risposte.get(wh) || [];
  const stato = coda.length ? coda.shift() : 200;
  const id = `m${++n}`;
  return { ok: stato < 300, status: stato, headers: { get: () => null }, json: async () => (stato === 429 ? { retry_after: 0.01 } : { id }), text: async () => '' };
};
test.after(() => { globalThis.fetch = vero; });

const WH = (k) => `https://discord.com/api/webhooks/${k}/tok${k}`;
let giro = 0;
function canale(posti) {
  const ch = `avvisi${++giro}`;
  streamers.upsertApproved(ch, ch.toUpperCase());
  accessi.set(ch, { modo: 'tutto' });
  for (const k of posti) dcDest.aggiungi({ channel: ch, webhook: WH(k), chiudi: 1, attivo: 1 });
  return ch;
}
function bot(helix = {}) {
  const b = Object.create(BotManager.prototype);
  b.helix = { getStream: async () => null, getChannelInfo: async () => null, ...helix };
  b._liveState = new Map();
  b._statoDiretta = new Map();
  return b;
}
const posta = (k) => chiamate.filter((c) => c.wh === WH(k) && c.metodo === 'POST');
const riscritte = (k) => chiamate.filter((c) => c.wh === WH(k) && c.metodo === 'PATCH');
const tutti = (ch) => db.prepare('SELECT * FROM avvisi_recapiti WHERE channel=? ORDER BY id').all(ch);
const scaduti = () => db.prepare("UPDATE avvisi_recapiti SET prossimo=0 WHERE stato='attesa'").run();
const diretta = (ch, extra = {}) => ({ ...avvisi.diretta({ piattaforma: 'twitch', login: ch, display: ch.toUpperCase(), titolo: 'Sera', id: 'S1' }), ...extra });

test('all\'inizio: titolo e gioco da /channels quando /streams non sa ancora niente, e niente dati finti', async () => {
  const ch = canale([1]);
  const b = bot({ getChannelInfo: async (id) => (id === '42' ? { title: 'Titolo vero', game_name: 'Celeste' } : null) });
  await b._annunciaTwitch(ch, { id: 'S1', broadcaster_user_id: '42', started_at: new Date().toISOString() });
  const [p] = posta(1);
  assert.ok(p, 'l\'avviso e\' partito');
  const emb = p.corpo.embeds[0];
  assert.equal(emb.description, 'Titolo vero');
  assert.ok(emb.fields.some((f) => f.value === 'Celeste'), 'il gioco c\'e\'');
  assert.ok(!emb.fields.some((f) => /Spettatori/.test(f.name)), 'niente «Spettatori 0»');
  assert.equal(emb.image, undefined, 'niente immagine prima che Twitch l\'abbia fatta');
  assert.equal(tutti(ch)[0].diretta, 'S1', 'la diretta si riconosce dall\'id dell\'evento');
});

test('spettatori e immagine solo quando sono veri', () => {
  const ora = Date.now();
  const s = (min, spettatori) => ({ viewer_count: spettatori, started_at: new Date(ora - min * 60_000).toISOString(), thumbnail_url: 'https://x/{width}x{height}.jpg' });
  assert.deepEqual(avvisi.dalloStream(s(1, 0), ora), {});
  assert.deepEqual(avvisi.dalloStream(s(6, 12), ora), { spettatori: 12, miniatura: 'https://x/1280x720.jpg' });
  assert.equal(avvisi.diretta({ piattaforma: 'kick', login: 'x' }).spettatori, null, 'senza spettatori non e\' zero');
});

test('lo stesso avviso nello stesso posto parte una volta sola, anche dopo un riavvio', async () => {
  const ch = canale([2]);
  await bot()._diffondiDiscord(ch, 'live', ch, diretta(ch), { chiudi: true });
  await bot()._diffondiDiscord(ch, 'live', ch, diretta(ch), { chiudi: true });
  assert.equal(posta(2).length, 1);
});

test('un errore che passa si ritenta solo dove c\'e\' stato; uno che non passa no', async () => {
  const ch = canale([3, 4, 5]);
  risposte.set(WH(4), [429]);
  risposte.set(WH(5), [404]);
  const b = bot();
  const r = await b._diffondiDiscord(ch, 'live', ch, diretta(ch), { chiudi: true });
  assert.equal(r.inviati, 1);
  scaduti();
  await b._giroRecapiti();
  assert.deepEqual([posta(3).length, posta(4).length, posta(5).length], [1, 2, 1]);
  assert.deepEqual(tutti(ch).map((x) => x.stato), ['mandato', 'mandato', 'perso']);
});

test('senza Telegram, a fine diretta l\'avviso si chiude', async () => {
  const ch = canale([6]);
  const b = bot();
  await b._diffondiDiscord(ch, 'live', ch, diretta(ch), { chiudi: true });
  await b._chiudiAvvisi(ch);
  const [p] = riscritte(6);
  assert.ok(p, 'nessuna riscrittura: l\'avviso resta «è in diretta»');
  assert.ok(p.corpo.content.startsWith('⚫'));
  assert.deepEqual(p.corpo.embeds, []);
  await b._chiudiAvvisi(ch);
  assert.equal(riscritte(6).length, 1, 'chiuso una volta');
});

test('la fine di Kick chiude Kick e non Twitch, e la fine dell\'amico chiude solo i suoi', async () => {
  const ch = canale([7]);
  const b = bot();
  await b._diffondiDiscord(ch, 'live', ch, diretta(ch), { chiudi: true });
  await b._diffondiDiscord(ch, 'live', ch, { ...diretta(ch), piattaforma: 'kick', id: 'K1' }, { chiudi: true });
  await b._diffondiDiscord(ch, 'live', 'amico', { ...diretta('amico'), id: 'A1' }, { chiudi: true });
  const id = (piattaforma, streamer) => tutti(ch).find((x) => x.piattaforma === piattaforma && x.streamer === streamer).msg_id;
  await b.eventoEsterno({ channel: ch, piattaforma: 'kick', tipo: 'fine-live' });
  assert.deepEqual(riscritte(7).map((c) => c.url.split('/').pop()), [id('kick', ch)]);
  await b._chiudiLiveEsterna(ch, 'amico');
  assert.deepEqual(riscritte(7).map((c) => c.url.split('/').pop()), [id('kick', ch), id('twitch', 'amico')]);
  assert.equal(tutti(ch).find((x) => x.piattaforma === 'twitch' && x.streamer === ch).stato, 'mandato', 'Twitch resta aperto');
});

test('un avviso ancora in attesa quando la diretta finisce non parte piu\'', async () => {
  const ch = canale([8]);
  risposte.set(WH(8), [503]);
  const b = bot();
  await b._diffondiDiscord(ch, 'live', ch, diretta(ch), { chiudi: true });
  await b._chiudiDiscord(ch, ch, 'twitch');
  scaduti();
  await b._giroRecapiti();
  assert.equal(posta(8).length, 1);
  assert.equal(tutti(ch)[0].stato, 'perso');
});

test('l\'avviso di una diretta in corso si riscrive coi dati di adesso, e solo se e\' ancora quella', async () => {
  const ch = canale([9]);
  const inCorso = { id: 'S1', title: 'Titolo nuovo', game_name: 'Hades', viewer_count: 42, started_at: new Date(Date.now() - 10 * 60_000).toISOString(), thumbnail_url: 'https://x/{width}x{height}.jpg' };
  const b = bot({ getStream: async () => inCorso });
  await b._diffondiDiscord(ch, 'live', ch, diretta(ch), { chiudi: true });
  const contenuto = posta(9)[0].corpo.content;
  db.prepare('UPDATE avvisi_recapiti SET aggiornato=0').run();
  await b._aggiornaAvvisiDiscord(Date.now());
  const [p] = riscritte(9);
  assert.ok(p, 'non si e\' riscritto');
  assert.equal(p.corpo.content, contenuto, 'il testo resta quello');
  assert.equal(p.corpo.embeds[0].description, 'Titolo nuovo');
  assert.ok(p.corpo.embeds[0].fields.some((f) => f.value === '42'));
  assert.ok(p.corpo.embeds[0].image.url.startsWith('https://x/1280x720.jpg'));
  db.prepare('UPDATE avvisi_recapiti SET aggiornato=0').run();
  await bot({ getStream: async () => ({ ...inCorso, id: 'S2' }) })._aggiornaAvvisiDiscord(Date.now());
  assert.equal(riscritte(9).length, 1, 'un\'altra diretta non tocca questo avviso');
});

test('la diretta la decide la regola delle due fonti, e il giro lo dice', () => {
  const bot = readFileSync(new URL('../../src/bot.js', import.meta.url), 'utf8');
  const f = bot.slice(bot.indexOf('  _setLive(login, isLive, data, fonte = \'evento\') {'));
  assert.match(f.slice(0, 600), /dopoSegnale\(this\._statoDiretta\.get\(ch\), \{ live: !!isLive, fonte, ora: Date\.now\(\) \}\)/);
  assert.match(bot, /onLive: \(login, isLive, data\) => this\._setLive\(login, isLive, data, 'giro'\)/);
});
