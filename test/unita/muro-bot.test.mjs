// IL MURO DELLE EMOTE, LA PARTE DEL BOT: cosa arriva all'overlay.
//
// Il muro vola nell'overlay; qui si decide chi passa, cosa esplode e quando.
// Il ragionamento sta in docs/MURO-EMOTE.md, «Chi fa cosa».
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-muro-');
const { streamers } = await import('../../src/db.js');
const muro = await import('../../src/features/muro.js');
const { normMuro, LIVELLI_MURO } = await import('../../src/web/stile.js');
const { LIVELLI, COMANDI, vivo } = await import('../../src/features/comandi-registro.js');
process.on('exit', () => usaEGetta.pulisci());

const canale = (ch, overlayMuro) => { streamers.upsertApproved(ch, ch); streamers.setSettings(ch, { overlayMuro }); return ch; };
const finto = () => { const mandati = []; return { mandati, effects: { emit: (ch, p) => mandati.push({ ch, ...p }) } }; };
const msg = (ch, testo, extra = {}) => ({ channel: ch, user: 'luca', text: testo, tags: {}, ...extra });

test('i livelli del muro sono quelli dei comandi', () => {
  assert.deepEqual(LIVELLI_MURO, LIVELLI);
});

test('chi passa: livello, bot, esclusi, e mai il bot stesso', () => {
  const cfg = normMuro({ attivo: true, chi: 'sub', esclusiPersone: ['Pippo'] });
  assert.equal(muro.passa({ user: 'luca' }, cfg), false, 'sotto il livello');
  assert.equal(muro.passa({ user: 'luca', isSub: true }, cfg), true);
  assert.equal(muro.passa({ user: 'luca', isMod: true }, cfg), true, 'chi sta sopra passa');
  assert.equal(muro.passa({ user: 'pippo', isSub: true }, cfg), false, 'escluso, anche scritto con la maiuscola');
  assert.equal(muro.passa({ user: 'nightbot', isMod: true }, cfg), false, 'i bot di chat non fanno volare niente');
  assert.equal(muro.passa({ user: 'nightbot', isMod: true }, { ...cfg, escludiBot: false }), true);
  assert.equal(muro.passa({ user: 'luca', isSub: true, isSelf: true }, cfg), false);
  assert.equal(muro.passa({ user: 'luca', isSub: true }, { ...cfg, attivo: false }), false, 'spento non passa nessuno');
});

test('i sub regalati contano una volta: esplode la raffica, non ognuno', () => {
  assert.equal(muro.abbonamentiDi('channel.subscription.gift', { total: 20 }), 20);
  assert.equal(muro.abbonamentiDi('channel.subscribe', { is_gift: true }), 0);
  assert.equal(muro.abbonamentiDi('channel.subscribe', { is_gift: false }), 1);
  assert.equal(muro.abbonamentiDi('channel.subscription.message', {}), 1);
  const cfg = normMuro({ attivo: true, eventi: { sub: { soglia: 5, figura: 'cuore' } } });
  assert.equal(muro.esplosioneDi(cfg, 'channel.subscribe', { is_gift: true }), null);
  assert.equal(muro.esplosioneDi(cfg, 'channel.subscription.gift', { total: 4 }), null, 'sotto la soglia');
  assert.deepEqual(muro.esplosioneDi(cfg, 'channel.subscription.gift', { total: 5 }), { evento: 'sub', figura: 'cuore' });
});

test('le soglie degli eventi, e un evento spento non esplode', () => {
  const cfg = normMuro({ attivo: true, eventi: { raid: { soglia: 10 }, bit: { soglia: 500, figura: 'spirale' }, trenoFine: { attivo: false } } });
  assert.equal(muro.esplosioneDi(cfg, 'channel.raid', { viewers: 9 }), null);
  assert.equal(muro.esplosioneDi(cfg, 'channel.raid', { viewers: 10 }).figura, 'fuochi');
  assert.equal(muro.esplosioneDi(cfg, 'channel.cheer', { bits: 499 }), null);
  assert.equal(muro.esplosioneDi(cfg, 'channel.cheer', { bits: 500 }).figura, 'spirale');
  assert.equal(muro.esplosioneDi(cfg, 'channel.hype_train.begin', {}).figura, 'trenino');
  assert.equal(muro.esplosioneDi(cfg, 'channel.hype_train.end', {}), null);
  assert.equal(muro.esplosioneDi(cfg, 'channel.follow', {}), null, 'il follow non e\' fra gli eventi del muro');
  assert.equal(muro.esplosioneDi({ ...cfg, attivo: false }, 'channel.raid', { viewers: 99 }), null);
});

test('la chat: i messaggi passano con le emote di Twitch risolte, i comandi no', () => {
  const ch = canale('muro_chat', { attivo: true });
  const f = finto();
  const m = new muro.MuroEmote({ effects: f.effects });
  m.suChat(ch, msg(ch, 'ciao Kappa', { tags: { emotes: '25:5-9' } }));
  m.suChat(ch, msg(ch, '!esplodi Kappa'));
  m.suChat(ch, msg(ch, '   '));
  assert.equal(f.mandati.length, 1);
  assert.equal(f.mandati[0].tipo, 'muro');
  assert.equal(f.mandati[0].chi, 'luca');
  assert.match(f.mandati[0].emotiTwitch.Kappa, /^https:\/\/static-cdn\.jtvnw\.net\/emoticons\/v2\/25\//);
  const spento = canale('muro_spento', { attivo: false });
  m.suChat(spento, msg(spento, 'Kappa'));
  assert.equal(f.mandati.length, 1, 'col muro spento non parte niente');
});

test('!esplodi: le parole del messaggio, e un\'attesa per tutti fra due esplosioni', () => {
  const ch = canale('muro_cmd', { attivo: true, comando: { figura: 'cuore', attesa: 30 } });
  const f = finto();
  const m = new muro.MuroEmote({ effects: f.effects });
  assert.equal(m.tryComando(msg(ch, '!dado'), () => {}, 0), false, 'non e\' suo');
  assert.equal(m.tryComando(msg(ch, '!esplodi Kappa  PogChamp'), () => {}, 1000), true);
  assert.deepEqual({ tipo: f.mandati[0].tipo, figura: f.mandati[0].figura, parole: f.mandati[0].parole }, { tipo: 'muro-esplodi', figura: 'cuore', parole: ['Kappa', 'PogChamp'] });
  assert.equal(m.tryComando(msg(ch, '!esplodi Kappa', { user: 'giada' }), () => {}, 30999), true);
  assert.equal(f.mandati.length, 1, 'dentro l\'attesa tace, per tutti');
  m.tryComando(msg(ch, '!esplodi'), () => {}, 31000);
  assert.equal(f.mandati.length, 2);
  assert.deepEqual(f.mandati[1].parole, []);
});

test('il comando sta nel registro, nella famiglia del muro, e risponde solo col muro acceso', () => {
  const riga = COMANDI.find((c) => c.id === muro.COMANDO);
  assert.equal(riga.modulo, 'muro');
  canale('muro_vivo', { attivo: true });
  canale('muro_morto', { attivo: false });
  assert.equal(vivo('muro_vivo', 'esplodi'), true);
  assert.equal(vivo('muro_morto', 'esplodi'), false);
});

test('premi e donazioni esplodono solo se scelti, dalla soglia in su', () => {
  const ch = canale('muro_premi', { attivo: true, premi: [{ id: 'abc-1', figura: 'piramide' }], eventi: { dono: { soglia: 10, figura: 'pioggia' } } });
  const f = finto();
  const m = new muro.MuroEmote({ effects: f.effects });
  m.suPremio(ch, { reward: { id: 'altro' } });
  m.suPremio(ch, { reward: { id: 'abc-1' }, user_input: 'Kappa Kappa' });
  m.suDono(ch, 9.99);
  m.suDono(ch, 10);
  assert.deepEqual(f.mandati.map((x) => [x.figura, x.da]), [['piramide', 'premio'], ['pioggia', 'dono']]);
  assert.deepEqual(f.mandati[0].parole, ['Kappa', 'Kappa'], 'il testo del riscatto porta le sue emote');
});

test('il raid esplode con le emote 7TV del canale che arriva', async () => {
  const ch = canale('muro_raid', { attivo: true });
  const f = finto();
  const m = new muro.MuroEmote({ effects: f.effects, helix: { getUserByLogin: async () => null } });
  await m.suEvento({ channel: ch, type: 'channel.raid', data: { viewers: 50, from_broadcaster_user_login: 'lucia' } });
  assert.equal(f.mandati.length, 1);
  assert.equal(f.mandati[0].figura, 'fuochi');
  assert.deepEqual(f.mandati[0].emoti, [], 'senza emote del canale che arriva, l\'overlay usa le sue');
  await m.suEvento({ channel: ch, type: 'channel.raid', data: { viewers: 2, from_broadcaster_user_login: 'lucia' } });
  assert.equal(f.mandati.length, 1, 'sotto la soglia');
});

test('i colori durante l\'hype train: il muro si dice da se\' quanto manca, in durata e non in ora', async () => {
  const ora = Date.parse('2026-01-01T00:00:00Z');
  assert.equal(muro.trenoPer('channel.hype_train.begin', { expires_at: '2026-01-01T00:04:00Z' }, ora), 240000);
  assert.equal(muro.trenoPer('channel.hype_train.progress', {}, ora), 5 * 60 * 1000, 'senza scadenza, cinque minuti');
  assert.equal(muro.trenoPer('channel.hype_train.progress', { expires_at: '2025-12-31T23:00:00Z' }, ora), 5 * 60 * 1000, 'una scadenza gia\' passata non spegne un treno che sta crescendo');
  assert.equal(muro.trenoPer('channel.hype_train.end', { expires_at: '2026-01-01T00:04:00Z' }, ora), 0);
  const conColori = canale('muro_treno_si', { attivo: true, arcobaleno: 'treno', eventi: { trenoParte: { attivo: false } } });
  const senza = canale('muro_treno_no', { attivo: true, arcobaleno: 'mai', eventi: { trenoParte: { attivo: false } } });
  const f = finto();
  const m = new muro.MuroEmote({ effects: f.effects });
  await m.suEvento({ channel: conColori, type: 'channel.hype_train.begin', data: {} });
  await m.suEvento({ channel: senza, type: 'channel.hype_train.begin', data: {} });
  assert.deepEqual(f.mandati.map((x) => [x.ch, x.tipo, x.per]), [[conColori, 'muro-treno', 5 * 60 * 1000]], 'solo a chi ha scelto i colori del treno, anche col cartello del treno spento');
});
