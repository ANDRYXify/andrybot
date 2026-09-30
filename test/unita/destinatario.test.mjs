// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// A CHI SI PARLA, E COSA SI CHIEDE (src/ai/destinatario.js).
//
// Righe di chat come si scrivono davvero, ognuna con quello che deve capire il
// bot. Le prime vengono dalla chat di mizu__gamer del 30 settembre, dove il bot
// rispondeva a parole: «Quanti bot AHAHAHAH», «@mizu__gamer …», e una frase con
// «da quanto» dentro che ha fatto uscire la durata della diretta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aChi, chiamaIlBot, chiedeLaDurata, chiedeIlGioco, soloUnaChiamata } from '../../src/ai/destinatario.js';

const CANALE = 'mizu__gamer';
const condiviso = { botLogin: CANALE, canale: CANALE };
const suo = { botLogin: 'socialbot_live', canale: CANALE };

test('«bot» chiamato, o «bot» di cui si parla', () => {
  const chiamate = ['bot come stai?', 'ciao bot', 'grazie bot!', 'Bot, che ore sono?', 'ehi bot mi dici i social', 'grazie mille bot',
    'dimmi bot, a che punto siamo', 'bot', 'bot?', 'hey bot 😂', 'come stai bot? ahahah', 'bot mi dai la ricetta della carbonara?'];
  const cose = ['Quanti bot AHAHAHAHAH', 'quanti bot ci sono qui', 'sei un bot?', 'i bot di twitch sono tutti uguali', 'ma il bot è scemo',
    'questo bot risponde a caso', 'che bot sei', 'ho visto un bot', 'di bot ne ho visti tanti', 'robot', 'abbot', 'bottiglia'];
  for (const t of chiamate) assert.equal(chiamaIlBot(t), true, `«${t}» chiama il bot`);
  for (const t of cose) assert.equal(chiamaIlBot(t), false, `«${t}» parla di bot, non al bot`);
});

test('a chi e\' rivolto, quando il bot scrive con l\'account dello streamer', () => {
  const casi = [
    ['Quanti bot AHAHAHAHAH', null, 'stanza'],
    ['@mizu__gamer vecchio mio', null, 'streamer'],
    ['mizu__gamer sei un grande', null, 'streamer'],
    ['@spettatore_uno ahah vero', null, 'altri'],
    ['ciao bot', null, 'bot'],
    ['@mizu__gamer ciao bot', null, 'bot'],
    ['che bella partita', null, 'stanza'],
  ];
  for (const [testo, tags, atteso] of casi) assert.equal(aChi({ testo, tags, ...condiviso }).a, atteso, `«${testo}»`);
});

test('una risposta di Twitch: al bot se risponde a una riga del bot, se no alla persona o a un altro', () => {
  const detti = ['Il contatore dice 2h 33m di live. Vola il tempo qui! ⏱️'];
  const alBot = { 'reply-parent-msg-id': 'x1', 'reply-parent-user-login': CANALE, 'reply-parent-msg-body': 'Il contatore dice 2h 33m di live. Vola il tempo qui! ⏱️' };
  const r = aChi({ testo: '@mizu__gamer nessuno te l\'ha chiesto', tags: alBot, ...condiviso, detti });
  assert.equal(r.a, 'bot', 'risponde alla riga che ha scritto il bot');
  assert.equal(r.testo, 'nessuno te l\'ha chiesto', 'e il «@nome» che mette Twitch non conta come una menzione');
  const allaPersona = { ...alBot, 'reply-parent-msg-body': 'raga torno subito, vado a prendere da bere' };
  assert.equal(aChi({ testo: '@mizu__gamer ok ti aspettiamo', tags: allaPersona, ...condiviso, detti }).a, 'streamer',
    'stesso account, ma la riga l\'ha scritta lo streamer');
  const aUnAltro = { 'reply-parent-msg-id': 'x2', 'reply-parent-user-login': 'spettatore_uno', 'reply-parent-msg-body': 'ciao a tutti' };
  assert.equal(aChi({ testo: '@spettatore_uno ciao!', tags: aUnAltro, ...condiviso, detti }).a, 'altri', 'fra due persone il bot non c\'entra');
  assert.equal(aChi({ testo: '@spettatore_uno ciao bot', tags: aUnAltro, ...condiviso, detti }).a, 'bot', 'a meno che chiami il bot per nome');
});

test('quando il bot ha un account suo', () => {
  assert.equal(aChi({ testo: '@socialbot_live che si dice', ...suo }).a, 'bot');
  assert.equal(aChi({ testo: '@mizu__gamer che si dice', ...suo }).a, 'streamer');
  const tags = { 'reply-parent-msg-id': 'x', 'reply-parent-user-login': 'socialbot_live', 'reply-parent-msg-body': 'qualunque cosa' };
  assert.equal(aChi({ testo: '@socialbot_live bella questa', tags, ...suo }).a, 'bot', 'ogni sua riga e\' del bot');
});

test('la durata della diretta si chiede con una domanda, non con una parola', () => {
  const si = ['da quanto sei live?', 'da quanto tempo siete in diretta', 'quanto dura la live oggi?', 'uptime?', 'da quanto streami?',
    'how long have you been live', 'da quante ore sei in live'];
  const no = ['da quanto tempo non ci vediamo', 'da quanto aspettavo questo gioco', 'quanto tempo ci hai messo a finirlo?',
    'da quanto lo conosci?', 'nessuno te l\'ha chiesto'];
  for (const t of si) assert.equal(chiedeLaDurata(t), true, `«${t}»`);
  for (const t of no) assert.equal(chiedeLaDurata(t), false, `«${t}»`);
});

test('il gioco si chiede con una domanda, non con un\'esclamazione', () => {
  const si = ['a cosa stai giocando?', 'che gioco è?', 'che gioco è questo', 'che gioco?', 'a che gioco stai giocando', 'what game is this'];
  const no = ['che gioco del cavolo', 'che gioco bellissimo', 'mi piace questo gioco', 'gioco anche io a questo'];
  for (const t of si) assert.equal(chiedeIlGioco(t), true, `«${t}»`);
  for (const t of no) assert.equal(chiedeIlGioco(t), false, `«${t}»`);
});

test('chiamato e basta, o chiamato con una frase', () => {
  for (const t of ['bot', 'ciao bot', 'ehi bot!', 'bot?', '@socialbot_live', 'bot 😂']) assert.equal(soloUnaChiamata(t), true, `«${t}»`);
  for (const t of ['Quanti bot AHAHAHAH', 'bot sei scemo', 'bot mi dai i social', 'grazie bot per la clip']) assert.equal(soloUnaChiamata(t), false, `«${t}»`);
});
