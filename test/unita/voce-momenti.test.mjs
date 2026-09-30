// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// I MOMENTI PORTATI NELLA VOCE (docs/VOCE.md, punto 2): chi prima scriveva la
// frase a mano adesso chiede alla voce del canale. Qui si prova che ognuno
// chieda il momento giusto con i dati giusti, e che i testi personalizzati di
// prima restino dello streamer.
//  · un evento di Twitch diventa il suo momento; chi riceve un regalo non ha
//    un grazie suo, e un dato che manca non si inventa;
//  · il cervello dice gli eventi nella lingua del canale, e tace se spento;
//  · i testi dell'hype train e della pubblicita' passano nelle frasi del bot:
//    cambiati restano suoi, svuotati restano spenti, quelli di serie diventano
//    le nostre;
//  · il promemoria dei link e lo shoutout parlano con la voce del canale.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-voce-momenti-');
const { streamers, linkPage } = await import('../../src/db.js');
const voce = await import('../../src/features/voce.js');
const { Brain, momentoDiEvento } = await import('../../src/ai/brain.js');
const { BotManager } = await import('../../src/bot.js');
const comandibase = await import('../../src/features/comandibase.js');
test.after(() => usaEGetta.pulisci());

let n = 0;
function canale(settings = {}) {
  const login = `momenti${++n}`;
  streamers.upsertApproved(login, login, String(5000 + n));
  streamers.setSettings(login, settings);
  return login;
}
const stesa = (t) => t.replace(/\{:([^}]+)\}/g, '$1');

test('un evento di Twitch diventa il suo momento, con i dati che ci sono davvero', () => {
  const m = (type, data) => momentoDiEvento({ type, data });
  assert.deepEqual(m('channel.follow', { user_name: 'Luna' }), { momento: 'follow', dati: { nome: 'Luna' } });
  assert.deepEqual(m('channel.follow.ritorno', { user_name: 'Luna' }), { momento: 'follow-ritorno', dati: { nome: 'Luna' } });
  assert.deepEqual(m('channel.subscribe', { user_name: 'Luna', tier: '1000' }), { momento: 'abbonamento', dati: { nome: 'Luna', tier: '' } });
  assert.deepEqual(m('channel.subscribe', { user_name: 'Luna', tier: '3000' }).dati.tier, 3);
  assert.equal(m('channel.subscribe', { user_name: 'Luna', is_gift: true }), null, 'chi riceve un regalo non ha pagato: il grazie va a chi regala');
  assert.deepEqual(m('channel.subscription.message', { user_name: 'Luna', cumulative_months: 7 }), { momento: 'abbonamento-rinnovo', dati: { nome: 'Luna', mesi: 7 } });
  assert.equal(m('channel.subscription.message', { user_name: 'Luna' }).momento, 'abbonamento', 'senza i mesi e\' un abbonamento e basta');
  assert.deepEqual(m('channel.subscription.gift', { user_name: 'Luna', total: 5 }), { momento: 'abbonamento-regalo', dati: { nome: 'Luna', quanti: 5 } });
  assert.deepEqual(m('channel.subscription.gift', { user_name: 'Luna', total: 5, is_anonymous: true }), { momento: 'regalo-anonimo', dati: { quanti: 5 } });
  assert.deepEqual(m('channel.raid', { from_broadcaster_user_name: 'Kiro', viewers: 42 }), { momento: 'raid-arrivato', dati: { nome: 'Kiro', spettatori: 42 } });
  assert.equal(m('channel.raid', { from_broadcaster_user_name: 'Kiro' }).dati.spettatori, '', 'gli spettatori non si inventano («tante»)');
  assert.deepEqual(m('channel.cheer', { user_name: 'Luna', bits: 100 }), { momento: 'bit', dati: { nome: 'Luna', bit: 100 } });
  assert.deepEqual(m('channel.cheer', { user_name: 'Luna', bits: 100, is_anonymous: true }), { momento: 'bit-anonimo', dati: { bit: 100 } });
  assert.equal(m('channel.cheer', { user_name: 'Luna', bits: 0 }), null);
  assert.deepEqual(m('stream.online', {}), { momento: 'inizio-diretta', dati: {} });
  assert.deepEqual(m('stream.offline', {}), { momento: 'fine-diretta', dati: {} });
  assert.deepEqual(m('channel.channel_points_custom_reward_redemption.add', { user_name: 'Luna', reward: { title: 'Idratati' } }),
    { momento: 'riscatto', dati: { nome: 'Luna', premio: 'Idratati' } });
  assert.equal(m('channel.qualcosa', {}), null);
});

test('il cervello dice gli eventi con la voce del canale, nella sua lingua, e tace se spento', () => {
  const brain = new Brain({});
  const en = canale({ preferenze: { lingua: 'en' }, tono: 'serio' });
  const dette = [];
  brain.onEvent({ channel: en, type: 'channel.follow', data: { user_name: 'Luna' } }, (t) => dette.push(t));
  const inglesi = voce.MOMENTI.follow.frasi.en.serio.map((f) => f.replace('{nome}', 'Luna'));
  assert.equal(dette.length, 1);
  assert.ok(inglesi.includes(dette[0]), dette[0]);
  brain.onEvent({ channel: en, type: 'channel.follow', data: { user_name: 'Sole' } }, (t) => dette.push(t));
  assert.equal(dette.length, 1, 'due follow ravvicinati: il secondo aspetta');

  const zitto = canale({ voce: { momenti: { 'fine-diretta': { modo: 'spento' } } } });
  brain.onEvent({ channel: zitto, type: 'stream.offline', data: {} }, (t) => dette.push(t));
  assert.equal(dette.length, 1, 'fine diretta spenta: niente');
  brain.onEvent({ channel: zitto, type: 'channel.subscribe', data: { user_name: 'Luna', is_gift: true } }, (t) => dette.push(t));
  assert.equal(dette.length, 1, 'un regalo ricevuto non ha un grazie suo');
  brain.onEvent({ channel: zitto, type: 'channel.subscription.gift', data: { total: 1, is_anonymous: true } }, (t) => dette.push(t));
  assert.equal(dette.length, 2);
  assert.doesNotMatch(dette[1], /\{|\}|\b1 sub\b/, dette[1]);
});

test('i testi di prima: cambiati restano suoi, svuotati restano spenti, quelli di serie diventano le nostre', () => {
  const c = canale({
    overlayTreno: { attivo: true, annuncia: true, testoParte: 'Si parte col treno!', testoLivello: 'Hype train al livello {livello}!',
      testoFine: 'Fine: {livello} {xyz}', testoQuasi: '' },
    pubblicita: { acceso: true, prima: { acceso: true, testo: 'Fra poco parte la pubblicità: restate qui, torno subito.' },
      durante: { acceso: false, testo: 'Pausa di {durata}' }, dopo: { acceso: true, testo: '   ' } },
  });
  const giaScelto = canale({ overlayTreno: { testoParte: 'mia' }, voce: { momenti: { 'treno-parte': { modo: 'miste', frasi: ['nuova'] } } } });
  const intatto = canale({ tono: 'serio' });
  assert.ok(voce.migraTestiDiPrima({ forza: true }) >= 2);
  const s = streamers.get(c).settings;
  assert.deepEqual(s.voce.momenti['treno-parte'], { modo: 'sue', frasi: ['Si parte col treno!'] }, 'la sua frase resta sua');
  assert.equal(s.voce.momenti['treno-livello'], undefined, 'il testo di serie passa alle nostre frasi');
  assert.deepEqual(s.voce.momenti['treno-fine'], { modo: 'sue', frasi: ['Fine: {livello}'] }, 'un segnaposto che il momento non ha si toglie, come faceva la casella');
  assert.deepEqual(s.voce.momenti['treno-quasi'], { modo: 'spento', frasi: [] }, 'svuotato voleva dire «non dirlo»');
  assert.equal(s.voce.momenti['pubblicita-prima'], undefined);
  assert.deepEqual(s.voce.momenti['pubblicita-parte'], { modo: 'sue', frasi: ['Pausa di {durata}'] });
  assert.deepEqual(s.voce.momenti['pubblicita-dopo'], { modo: 'spento', frasi: [] });
  assert.ok(!('testoParte' in s.overlayTreno) && !('testo' in s.pubblicita.prima), 'i testi vecchi non restano in giro');
  assert.equal(s.pubblicita.durante.acceso, false, 'la levetta di una sera resta dov\'era');
  assert.equal(s.overlayTreno.annuncia, true);
  assert.deepEqual(streamers.get(giaScelto).settings.voce.momenti['treno-parte'], { modo: 'miste', frasi: ['nuova'] }, 'una scelta gia\' fatta nella carta non si calpesta');
  assert.deepEqual(streamers.get(intatto).settings, { tono: 'serio' }, 'chi non aveva niente non cambia');
  const tardi = canale({ overlayTreno: { testoParte: 'arrivata dopo' } });
  assert.equal(voce.migraTestiDiPrima(), 0, 'una volta sola per database: al riavvio non si rigira');
  assert.equal(streamers.get(tardi).settings.overlayTreno.testoParte, 'arrivata dopo');
  assert.equal(voce.di(c, 'treno-parte', {}), 'Si parte col treno!');
  assert.equal(voce.di(c, 'treno-quasi', { livello: 1, punti: 1, prossimo: 2, manca: 5 }), '');
});

test('il promemoria dei link parla con la voce del canale, e senza pagina tace', () => {
  const io = Object.create(BotManager.prototype);
  const c = canale({ preferenze: { lingua: 'es' }, tono: 'amichevole' });
  assert.equal(io._promemoriaLink(c), '', 'senza pagina link niente promemoria: sarebbe un 404');
  linkPage.salva(c, { headline: 'Mia', attiva: true, blocchi: [] });
  const t = io._promemoriaLink(c);
  const link = `https://socialbot.live/u/${c}`;
  const spagnole = voce.MOMENTI['promemoria-link'].frasi.es.amichevole.map((f) => stesa(f).replace('{link}', link));
  assert.ok(spagnole.includes(t), t);
  linkPage.salva(c, { headline: 'Mia', attiva: false, blocchi: [] });
  assert.equal(io._promemoriaLink(c), '', 'pagina spenta, niente promemoria');
});

test('lo shoutout riuscito parla con la voce del canale, col gioco quando c\'e\'', async () => {
  const c = canale({ preferenze: { lingua: 'en' }, tono: 'serio' });
  const helix = {
    shoutout: async () => ({ ok: true, target: 'Kiro' }),
    getUserByLogin: async () => ({ id: '9' }),
    getChannelInfo: async () => ({ game_name: 'Chess' }),
  };
  const dette = [];
  const msg = { channel: c, text: '!so kiro', isMod: true, user: 'mod' };
  assert.equal(await comandibase.tryComando(helix, msg, (t) => dette.push(t)), true);
  const inglesi = voce.MOMENTI.shoutout.frasi.en.serio
    .map((f) => f.replace('{nome}', 'Kiro').replace('{link}', 'twitch.tv/kiro').replace('{gioco}', 'Chess'));
  assert.ok(inglesi.includes(dette[0]), dette[0]);
  const s = streamers.get(c).settings;
  streamers.setSettings(c, { ...s, voce: { momenti: { shoutout: { modo: 'sue', frasi: ['{nome} / {gioco} / {link}'] } } } });
  await comandibase.tryComando(helix, msg, (t) => dette.push(t));
  assert.equal(dette[1], 'Kiro / Chess / twitch.tv/kiro', 'il gioco arriva alla voce');
});
