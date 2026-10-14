// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA CHAT DI KICK A SCHERMO COME QUELLA DI TWITCH.
//
// Un messaggio di Kick arrivava all'overlay col codice delle emote nel testo
// («[emote:123:Ciao]»), senza colore e senza stemmi, e lo stemma 7TV veniva
// cercato con l'id di Kick come se fosse di Twitch: lo stemma di un'altra
// persona. E un follow di Kick, con la scelta «lo mostra Twitch», non lo
// mostrava nessuno. Qui si fissa ognuna di queste cose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('kick-chat-overlay-');
const { streamers } = await import('../../src/db.js');
const { daChatMessage, senzaCodiciEmote } = await import('../../src/kick/messaggio.js');
const { kickInMessaggio, nativeInMessaggio } = await import('../../src/features/emotes.js');
const { coloreDi, stemmiKick, badge7tvDi, STEMMI_KICK } = await import('../../src/features/badges.js');
const { AlertsEngine } = await import('../../src/features/alerts.js');
const { chiAlertOk } = await import('../../src/web/stile.js');
test.after(() => casa.pulisci());

const PAYLOAD = {
  message_id: 'm1', content: 'ciao [emote:4148074:HYPERCLAP] e [emote:4148074:HYPERCLAP] [emote:9:Hey] [emote:x:Rotta]',
  sender: { user_id: 77, username: 'Giada', identity: { username_color: '#FF5733', badges: [{ type: 'moderator' }, { type: 'subscriber' }, { type: 'boh' }] } },
};

test('nel testo resta il nome dell\'emote, e le emote viaggiano a parte una volta sola', () => {
  const m = daChatMessage(PAYLOAD, { canale: 'kick.casa' });
  assert.equal(m.text, 'ciao HYPERCLAP e HYPERCLAP Hey [emote:x:Rotta]');
  assert.equal(m.tags['kick-emote'], '4148074:HYPERCLAP,9:Hey');
  assert.deepEqual(senzaCodiciEmote('niente qui'), { testo: 'niente qui', emote: '' });
  assert.equal(daChatMessage({ ...PAYLOAD, content: '[emote:1:Solo]' }, { canale: 'kick.casa' }).text, 'Solo', 'un messaggio di sola emote non sparisce');
});

test('le emote native: l\'immagine di Kick dall\'id, Twitch come prima, tutte e due insieme', () => {
  assert.deepEqual(kickInMessaggio('4148074:HYPERCLAP,9:Hey,../x:Y,12:a b'), {
    HYPERCLAP: 'https://files.kick.com/emotes/4148074/fullsize', Hey: 'https://files.kick.com/emotes/9/fullsize' });
  const tw = nativeInMessaggio({ text: 'Kappa ciao', tags: { emotes: '25:0-4' } });
  assert.deepEqual(Object.keys(tw), ['Kappa']);
  const k = nativeInMessaggio(daChatMessage(PAYLOAD, { canale: 'kick.casa' }));
  assert.deepEqual(Object.keys(k).sort(), ['HYPERCLAP', 'Hey']);
});

test('il colore del nome: Twitch o Kick, sempre esadecimale a sei cifre', () => {
  assert.equal(coloreDi({ tags: { color: '#1E90FF' } }), '#1E90FF');
  assert.equal(coloreDi({ tags: { 'kick-colore': '#FF5733' } }), '#FF5733');
  assert.equal(coloreDi({ tags: { 'kick-colore': '#f0a' } }), '#ff00aa');
  for (const brutto of ['red', 'url(x)', '#12345', '#ff5733;background:red', '']) assert.equal(coloreDi({ tags: { 'kick-colore': brutto } }), '', brutto);
});

test('gli stemmi di Kick: solo per chi scrive da Kick, solo quelli che l\'overlay sa disegnare, in ordine', () => {
  const m = daChatMessage(PAYLOAD, { canale: 'kick.casa' });
  assert.deepEqual(stemmiKick(m), ['moderator', 'subscriber']);
  assert.deepEqual(stemmiKick({ piattaforma: 'KICK', tags: { 'kick-badges': 'subscriber,broadcaster' } }), ['broadcaster', 'subscriber']);
  assert.deepEqual(stemmiKick({ tags: { 'kick-badges': 'moderator' } }), [], 'un messaggio di Twitch non ha stemmi di Kick');
});

test('7TV si chiede solo per chi scrive da Twitch', () => {
  const chiesti = [];
  const prima = globalThis.fetch;
  globalThis.fetch = (u) => { chiesti.push(String(u)); return Promise.reject(new Error('fuori rete')); };
  try {
    assert.equal(badge7tvDi({ piattaforma: 'kick', userId: '77' }), '');
    assert.equal(badge7tvDi({ piattaforma: 'youtube', userId: '78' }), '');
    assert.deepEqual(chiesti, [], 'chiesto a 7TV con un id che non e\' di Twitch');
    badge7tvDi({ userId: '79' });
    assert.deepEqual(chiesti, ['https://7tv.io/v3/users/twitch/79']);
  } finally { globalThis.fetch = prima; }
});

const CH = 'canale';
streamers.request(CH, 'Canale', '1');
const mandati = [];
const motore = new AlertsEngine({ effects: { emit: (ch, p) => mandati.push(p), hasClients: () => true } });
const ultimo = (tipo) => [...mandati].reverse().find((x) => x.tipo === tipo);

test('la riga di Kick arriva all\'overlay e allo Studio col suo colore, i suoi stemmi e le sue emote', () => {
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), chatOverlay: { attivo: true, max: 8 } });
  const m = daChatMessage(PAYLOAD, { canale: CH });
  motore.onChat(CH, m);
  motore.onChatRaw(CH, m);
  for (const tipo of ['chat', 'chat_raw']) {
    const r = ultimo(tipo);
    assert.equal(r.colore, '#FF5733', tipo);
    assert.deepEqual(r.stemmiKick, ['moderator', 'subscriber'], tipo);
    assert.equal(r.emotiTwitch.HYPERCLAP, 'https://files.kick.com/emotes/4148074/fullsize', tipo);
    assert.equal(r.badge7tv, '', tipo);
    assert.ok(!/\[emote:\d/.test(r.testo), tipo);
  }
});

test('con «lo mostra Twitch» un follow di Twitch non parte, uno di Kick si', () => {
  assert.equal(chiAlertOk('follow', 'twitch'), 'twitch');
  assert.equal(chiAlertOk('follow', 'twitch', 'kick'), 'socialbot');
  assert.equal(chiAlertOk('follow', 'entrambi', 'KICK'), 'socialbot');
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), alerts: { attivo: true, follow: { attivo: true, chi: 'twitch' } } });
  mandati.length = 0;
  motore.onEvent({ channel: CH, type: 'channel.follow', data: { user_name: 'tw' } });
  assert.equal(mandati.filter((p) => p.tipo === 'alert').length, 0);
  motore.onEvent({ channel: CH, type: 'channel.follow', data: { user_name: 'kk', piattaforma: 'kick' } });
  assert.equal(mandati.filter((p) => p.tipo === 'alert').length, 1);
});

test('l\'overlay sa disegnare ogni stemma che il server manda, e ognuno ha il suo colore', () => {
  const ovl = readFileSync(new URL('../../src/web/public/overlay-app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../../src/web/public/overlay-skin.css', import.meta.url), 'utf8');
  const blocco = ovl.slice(ovl.indexOf('const STEMMA_KICK = {'), ovl.indexOf('};', ovl.indexOf('const STEMMA_KICK = {')));
  for (const t of STEMMI_KICK) {
    assert.ok(new RegExp(`\\n  ${t}: \\[`).test(blocco), `l'overlay non disegna ${t}`);
    assert.ok(css.includes(`.chat-riga .stemma-${t} {`), `${t} senza colore`);
  }
  assert.ok(ovl.includes("if (Array.isArray(ev.stemmiKick)) for (const t of ev.stemmiKick)"));
});

test('chi mette emote e colori a schermo chiede quelli di ogni piattaforma', () => {
  for (const f of ['alerts.js', 'muro.js', 'arena.js']) {
    const src = readFileSync(new URL('../../src/features/' + f, import.meta.url), 'utf8');
    assert.ok(!/twitchInMessaggio\(msg/.test(src), `${f} chiede ancora solo le emote di Twitch`);
    assert.ok(!/tags\?\.color\b|tags\.color\b/.test(src), `${f} legge ancora solo il colore di Twitch`);
    assert.ok(!/stemmi\.badge7tv\(/.test(src), `${f} chiede 7TV anche per Kick`);
  }
});

test('nel pannello, con Kick collegato, «lo mostra Twitch» lascia il testo e lo stile del nostro alert', () => {
  const app = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes("function _alConKick() { return _piattaformeAttive.some((x) => x.id === 'kick'); }"));
  assert.ok(app.includes("if (nostro) nostro.hidden = sel.value === 'twitch' && !_alConKick();"));
  assert.ok(app.includes(`<div class="al-nostro"\${chi === 'twitch' && !_alConKick() ? ' hidden' : ''}>`));
  assert.ok(app.includes("+ (_alConKick() ? ' ' + L('Gli eventi di Kick invece li mostra SocialBot"));
});
