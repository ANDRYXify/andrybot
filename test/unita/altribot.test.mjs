// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// DA NIGHTBOT, FOSSABOT E MOOBOT SENZA CHIAVI (src/features/altribot.js), con
// risposte finte nella forma di quelle vere (lette dalle loro API pubbliche):
//  · il canale e' quello della sessione, ed e' legato allo stesso account
//    Twitch: un canale omonimo non si legge;
//  · nessuna chiave e nessun cookie partono verso di loro;
//  · i ruoli di Fossabot non danno MAI piu' accesso di prima, e chi resta
//    fuori in piu' lo si dice; i suoi comandi di serie restano la';
//  · Moobot entra tutto «da rivedere» e solo per lo streamer; i suoi alias
//    diventano alias, le sue parti ignote si dicono;
//  · quello che esce lo legge il lettore di sempre, con gli avvisi;
//  · l'impronta cambia appena cambia un comando.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('altribot-');
const A = await import('../../src/features/altribot.js');
const { anteprima, livelloDa } = await import('../../src/features/importacomandi.js');
test.after(() => casa.pulisci());

const TW = '44445592';
function finto(risposte) {
  const viste = [];
  const fetch = async (url, opz = {}) => {
    viste.push({ url, opz });
    const r = risposte(String(url), opz);
    if (r === undefined) return { ok: false, status: 404, json: async () => ({}) };
    if (typeof r === 'number') return { ok: false, status: r, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => r };
  };
  return { fetch, viste };
}
const NB_CANALE = { channel: { _id: '5a8afd44280d2872dd8f3b7f', name: 'poki', displayName: 'Poki', provider: 'twitch', providerId: TW } };
const NB_COMANDI = { _total: 3, commands: [
  { name: '!discord', message: 'Vieni su discord: x', userLevel: 'everyone', coolDown: 5, count: 0 },
  { name: '~wut', message: 'WutFace', userLevel: 'moderator', coolDown: 30, count: 0 },
  { name: '!morti', message: 'Morti: $(count)', userLevel: 'regular', coolDown: 5, count: 41 },
] };
const nightbot = (x = {}) => finto((u) => {
  if (u === 'https://api.nightbot.tv/1/channels/t/poki') return x.canale ?? NB_CANALE;
  if (u === 'https://api.nightbot.tv/1/commands') return x.comandi ?? NB_COMANDI;
  return undefined;
});

const RUOLI = [
  { id: 'r-sub', name: 'Subscriber', default: true }, { id: 'r-fou', name: 'Founder', default: true },
  { id: 'r-vip', name: 'VIP', default: true }, { id: 'r-mod', name: 'Moderator', default: true },
  { id: 'r-own', name: 'Broadcaster', default: true }, { id: 'r-reg', name: '[Imported] Regular', default: false },
  { id: 'r-finto', name: 'Moderator', default: false },
];
const FB_CANALE = { channel: { id: '87', login: 'poki', display_name: 'pokimane', provider: 'twitch', provider_id: TW } };
const FB_COMANDI = { roles: RUOLI, commands: [
  { name: 'camera', response: '@$(user), la camera è una Sony', type: 'custom', aliases: ['cam'], role_ids: [], enabled_online: true, enabled_offline: true },
  { name: 'abbonati', response: 'solo per voi', type: 'custom', aliases: [], role_ids: ['r-sub', 'r-fou', 'r-vip', 'r-mod', 'r-own'], enabled_online: true, enabled_offline: false },
  { name: 'buco', response: 'sub e mod ma non i vip', type: 'custom', aliases: [], role_ids: ['r-sub', 'r-mod', 'r-own'], enabled_online: true, enabled_offline: true },
  { name: 'regolari', response: 'per i regular', type: 'custom', aliases: [], role_ids: ['r-reg'], enabled_online: true, enabled_offline: true },
  { name: 'uptime', response: 'Returns how long the stream has been online/offline for.', type: 'default', aliases: [], role_ids: [], enabled_online: true, enabled_offline: true },
] };
const fossabot = (x = {}) => finto((u) => {
  if (u === 'https://api.fossabot.com/v2/cached/channels/by-slug/poki') return x.canale ?? FB_CANALE;
  if (u === 'https://api.fossabot.com/v2/cached/channels/87/commands') return x.comandi ?? FB_COMANDI;
  return undefined;
});

const MB_CANALE = { status: { joined: true }, channel: { userid: TW, username: 'poki' }, version: 476 };
const MB_COMANDI = { _total: 4, list: [
  { type: 'custom', identifier: 'discord', response: '@<username> il discord è qui' },
  { type: 'custom', identifier: 'sito', response: 'Il sito <url> ti aspetta' },
  { type: 'alias', identifier: 'dc', response: 'Alias for !discord' },
  { type: 'alias', identifier: 'aiuto', response: 'Alias for !join' },
] };
const moobot = (x = {}) => finto((u) => {
  if (u === 'https://api.moo.bot/1/channel/meta?name=poki') return x.canale ?? MB_CANALE;
  if (u === 'https://api.moo.bot/1/channel/public/commands/list?channel=44445592') return x.comandi ?? MB_COMANDI;
  return undefined;
});

const leggiCon = (bot, f, x = {}) => A.leggi(bot, { login: 'poki', twitchId: TW, fetch: f.fetch, ...x });
const PROPR = { p: 'twitch', id: TW, login: 'poki', nome: 'Poki' };
const vedi = (r) => anteprima(r.testo, { proprietario: PROPR, posti: 100 });

test('il canale dev\'essere legato allo stesso account Twitch, in tutti e tre', async () => {
  for (const [bot, fare, altro] of [
    ['nightbot', nightbot, { canale: { channel: { ...NB_CANALE.channel, providerId: '999' } } }],
    ['fossabot', fossabot, { canale: { channel: { ...FB_CANALE.channel, provider_id: '999' } } }],
    ['moobot', moobot, { canale: { ...MB_CANALE, channel: { ...MB_CANALE.channel, userid: '999' } } }],
  ]) {
    const f = fare(altro);
    const r = await leggiCon(bot, f);
    assert.equal(r.stato, 403, bot);
    assert.match(r.errore, /non è legato al tuo account Twitch/);
    assert.equal(f.viste.length, 1, `${bot}: dopo il no non si chiede altro`);
  }
  assert.equal((await A.leggi('nightbot', { login: 'poki', twitchId: '', fetch: nightbot().fetch })).stato, 409, 'senza id Twitch non si chiede niente');
  assert.equal((await leggiCon('nightbot', finto(() => undefined))).stato, 404);
  assert.equal((await leggiCon('moobot', finto(() => ({ version: 476 })))).stato, 404, 'Moobot dice «nessun canale» senza 404');
  assert.equal((await leggiCon('fossabot', finto(() => 429))).stato, 429);
});

test('nessuna chiave e nessun cookie partono verso di loro', async () => {
  for (const [bot, fare] of [['nightbot', nightbot], ['fossabot', fossabot], ['moobot', moobot]]) {
    const f = fare();
    assert.ok((await leggiCon(bot, f)).testo, bot);
    for (const v of f.viste) {
      const h = Object.keys(v.opz.headers || {}).map((k) => k.toLowerCase());
      assert.ok(!h.some((k) => ['authorization', 'cookie', 'x-api-key'].includes(k)), `${bot}: ${h.join(',')}`);
      assert.ok(!/token|key=|secret/i.test(v.url), v.url);
    }
  }
});

test('Nightbot: chi poteva usarli, le attese, il conto, e il segno davanti al nome', async () => {
  const r = await leggiCon('nightbot', nightbot());
  assert.deepEqual(r.conti, { comandi: 3, saltati: 0 });
  assert.equal(r.canale.nome, 'Poki');
  const v = vedi(r);
  const tutti = [...v.buoni, ...v.daRivedere];
  const per = (n) => tutti.find((x) => x.nome === n);
  assert.equal(per('discord').gradino, 'tutti');
  assert.equal(per('discord').condizioni.cooldown, 5);
  assert.equal(per('wut').gradino, 'mod', 'un comando dei mod resta dei mod');
  assert.ok(v.daRivedere.some((x) => x.nome === 'wut' && x.avvisi.some((a) => /«~wut»/.test(a.cosa))), 'e il segno diverso si dice');
  assert.equal(per('morti').gradino, 'vip', 'i regular salgono al gradino piu\' stretto');
  assert.ok(v.contatori?.voci?.some((k) => k.nome === 'morti' && k.valore === 41), 'il conto di Nightbot porta il suo numero');
});

test('Fossabot: i ruoli non danno mai piu\' accesso di prima, e i comandi di serie restano la\'', () => {
  const g = (ids) => A.gradinoFossabot(ids, RUOLI);
  assert.deepEqual(g([]), { parola: 'everyone', avvisi: [] });
  assert.equal(g(['r-sub', 'r-fou', 'r-vip', 'r-mod', 'r-own']).parola, 'subscriber');
  assert.deepEqual(g(['r-vip', 'r-mod']).parola, 'vip', 'lo streamer c\'e\' sempre');
  const buco = g(['r-sub', 'r-mod', 'r-own']);
  assert.equal(buco.parola, 'moderator', 'abbonati si ma VIP no: qui i VIP stanno sopra gli abbonati, quindi solo da mod in su');
  assert.match(buco.avvisi[0], /lo usavano anche gli abbonati/);
  const reg = g(['r-reg']);
  assert.equal(reg.parola, 'owner', 'un ruolo che qui non c\'e\': solo lo streamer');
  assert.match(reg.avvisi[0], /«\[Imported\] Regular»/);
  assert.equal(g(['sconosciuto']).parola, 'owner');
  // un ruolo fatto dallo streamer che si chiama come uno di serie non e' quello di serie
  const finto = g(['r-finto']);
  assert.equal(finto.parola, 'owner', 'un «Moderator» fatto a mano non e\' il gradino dei moderatori');
  assert.match(finto.avvisi[0], /«Moderator» di Fossabot/);
  // la proprieta': il gradino scelto non ammette nessun gruppo che la' era fuori
  const FILA = ['sub', 'vip', 'mod'];
  const IDS = { sub: 'r-sub', vip: 'r-vip', mod: 'r-mod' };
  for (let m = 0; m < 8; m++) {
    const dentro = FILA.filter((_, i) => m & (1 << i));
    const p = g(dentro.map((x) => IDS[x])).parola;
    const gi = ['everyone', 'subscriber', 'vip', 'moderator', 'owner'].indexOf(p);
    const ammessiQui = ['sub', 'vip', 'mod'].filter((_, i) => i + 1 >= gi);
    for (const x of ammessiQui) assert.ok(!dentro.length || dentro.includes(x), `${dentro.join('+') || 'tutti'} → ${p} farebbe entrare ${x}`);
    assert.ok(livelloDa(p).gradino, p);
  }
});

test('Fossabot: quello che esce lo legge il lettore di sempre, con gli avvisi', async () => {
  const r = await leggiCon('fossabot', fossabot());
  assert.deepEqual(r.conti, { comandi: 4, saltati: 1 }, 'uptime, di serie, non si porta');
  const v = vedi(r);
  const tutti = [...v.buoni, ...v.daRivedere];
  const per = (n) => tutti.find((x) => x.nome === n);
  assert.ok(!per('uptime'));
  assert.deepEqual(per('camera').alias, ['cam']);
  assert.match(per('camera').risposta, /\$user/, 'la parte di chi scrive si traduce');
  assert.equal(per('abbonati').condizioni.soloLive, true, 'valeva solo in diretta');
  assert.equal(per('buco').gradino, 'mod');
  assert.ok(v.daRivedere.some((x) => x.nome === 'buco'), 'chi resta fuori in piu\' manda il comando da rivedere');
  assert.equal(per('regolari').gradino, 'tu');
});

test('Moobot: tutto da rivedere e solo per lo streamer; gli alias diventano alias; le parti ignote si dicono', async () => {
  const r = await leggiCon('moobot', moobot());
  assert.deepEqual(r.conti, { comandi: 2, saltati: 0 });
  const v = vedi(r);
  assert.equal(v.buoni.length, 0, 'niente entra senza essere guardato');
  const per = (n) => v.daRivedere.find((x) => x.nome === n);
  assert.equal(per('discord').gradino, 'tu');
  assert.deepEqual(per('discord').alias, ['dc'], 'l\'alias di un comando che entra');
  assert.match(per('discord').risposta, /\$user/, '<username> diventa chi scrive');
  assert.ok(per('sito').avvisi.some((a) => /<url>/.test(a.cosa)), 'una parte di Moobot che qui non c\'e\' si dice');
  assert.ok(!v.daRivedere.some((x) => x.nome === 'aiuto' || x.nome === 'dc'), 'gli alias non diventano comandi');
});

test('l\'impronta cambia appena cambia un comando', async () => {
  const a = await leggiCon('nightbot', nightbot());
  const b = await leggiCon('nightbot', nightbot());
  assert.equal(a.firma, b.firma);
  const c = await leggiCon('nightbot', nightbot({ comandi: { commands: [{ ...NB_COMANDI.commands[0], userLevel: 'moderator' }, ...NB_COMANDI.commands.slice(1)] } }));
  assert.notEqual(a.firma, c.firma, 'anche solo chi poteva usarlo');
});
