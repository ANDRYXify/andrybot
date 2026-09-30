// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL BOT RISPONDE A CHI PARLA A LUI, E A QUELLO CHE HA CHIESTO.
//
// Le righe sono quelle della chat di mizu__gamer del 30 settembre, dove il bot
// scrive con l'account dello streamer e rispondeva a parole:
//  · «Quanti bot AHAHAHAH» → «Sì ANDRYXify? Se è per soldi, non ne ho 😂»;
//  · «@mizu__gamer …» → «Eccomi vecchio mio, chi mi ha evocato?»;
//  · una frase con «da quanto» → la durata della diretta, e in chat «nessuno te
//    l'ha chiesto».
// Il modello qui e' spento: e' proprio il caso in cui uscivano le frasi a caso.
// La funzione che decide a chi si parla e' provata da sola in
// test/unita/destinatario.test.mjs; qui si prova che il cervello la usa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('andrybot-a-chi-');
const { memory } = await import('../../src/db.js');
const { Brain } = await import('../../src/ai/brain.js');
test.after(() => casa.pulisci());

const CANALE = 'mizu__gamer';
const INIZIO = new Date(Date.now() - (2 * 60 + 33) * 60_000).toISOString();
const streamer = { display: 'mizu__gamer', settings: { iaLocale: false, spontaneita: 0, rispostaMenzioni: true, tono: 'scherzoso' } };
const cervello = () => new Brain({ helix: { getStream: async () => ({ started_at: INIZIO, game_name: 'Minecraft', title: 'serata', viewer_count: 12 }) } });
const risponde = (b, text, extra = {}) => b.chatReply({ channel: CANALE, botLogin: CANALE, user: 'andryxify', display: 'ANDRYXify', text, streamer, ...extra });

test('di bot si puo\' parlare senza che il bot risponda', async () => {
  const b = cervello();
  assert.equal(b.shouldReply({ channel: CANALE, botLogin: CANALE, user: 'andryxify', text: 'Quanti bot AHAHAHAHAH', streamer }), false);
  assert.equal(await risponde(b, 'Quanti bot AHAHAHAHAH'), null, 'prima usciva «Sì ANDRYXify? Se è per soldi, non ne ho»');
});

test('a chi scrive allo streamer il bot non risponde al posto suo, ma i fatti li dice', async () => {
  const b = cervello();
  assert.equal(await risponde(b, '@mizu__gamer vecchio mio'), null, 'prima usciva «Eccomi vecchio mio, chi mi ha evocato?»');
  assert.equal(await risponde(b, '@mizu__gamer come stai?'), null);
  const saluto = await risponde(b, '@mizu__gamer ciao!');
  assert.ok(saluto && !/Eccomi|evocato/i.test(saluto), `un saluto si ricambia, senza fare il bot chiamato: «${saluto}»`);
  assert.match(await risponde(b, '@mizu__gamer da quanto sei live?'), /2h 33m|2h 33/, 'un fatto chiesto a lui lo sa anche il bot');
});

test('la durata della diretta esce solo a chi la chiede', async () => {
  const b = cervello();
  assert.equal(await risponde(b, 'da quanto tempo non ci vediamo'), null);
  const nonDurata = await risponde(b, 'bot da quanto tempo non ci vediamo?');
  assert.ok(!/2h 33m|live/i.test(nonDurata || ''), `anche chiamando il bot non e' la durata che chiede: «${nonDurata}»`);
  assert.match(await risponde(b, 'bot da quanto sei live?'), /2h 33m/);
  assert.equal(await risponde(b, 'che gioco del cavolo'), null);
  assert.match(await risponde(b, 'bot che gioco è?'), /Minecraft/);
});

test('chiamato e basta si fa vivo, chiamato con una frase che non capisce tace', async () => {
  const b = cervello();
  assert.ok(await risponde(b, 'ciao bot'), 'un saluto merita un saluto');
  assert.ok(await risponde(b, 'bot'), 'chiamato per nome e basta: un cenno');
  assert.equal(await risponde(b, 'bot sei scemo'), null, 'a una frase vera un cenno pescato a caso non risponde');
  assert.match(await risponde(b, 'bot quanto fa 12+30?'), /42/, 'quello che sa fare, lo fa anche senza modello');
  assert.ok(await risponde(b, 'bot quanto pesa la luna?'), 'a una domanda fatta al bot, il bot puo\' dire che non lo sa');
});

test('fra due persone il bot non si mette in mezzo, e chi risponde a una sua riga parla a lui', async () => {
  const b = cervello();
  const aUnAltro = { 'reply-parent-msg-id': 'p1', 'reply-parent-user-login': 'spettatore_uno', 'reply-parent-msg-body': 'ciao a tutti' };
  assert.equal(b.shouldReply({ channel: CANALE, botLogin: CANALE, user: 'andryxify', text: '@spettatore_uno da quanto sei live?', streamer, tags: aUnAltro }), false);
  assert.equal(await risponde(b, '@spettatore_uno da quanto sei live?', { tags: aUnAltro }), null);

  memory.logMessage(CANALE, CANALE, CANALE, 'Il contatore dice 2h 33m di live. Vola il tempo qui! ⏱️', true);
  const allaRigaDelBot = { 'reply-parent-msg-id': 'p2', 'reply-parent-user-login': CANALE, 'reply-parent-msg-body': 'Il contatore dice 2h 33m di live. Vola il tempo qui! ⏱️' };
  assert.equal(b._aChi(CANALE, '@mizu__gamer nessuno te l\'ha chiesto', allaRigaDelBot, CANALE).a, 'bot');
  assert.equal(await risponde(b, '@mizu__gamer nessuno te l\'ha chiesto', { tags: allaRigaDelBot }), null,
    'senza modello non ha una risposta vera: tace, invece di pescare «Eccomi»');
  const allaPersona = { ...allaRigaDelBot, 'reply-parent-msg-body': 'torno subito raga' };
  assert.equal(b._aChi(CANALE, '@mizu__gamer ok ti aspettiamo', allaPersona, CANALE).a, 'streamer');
});
