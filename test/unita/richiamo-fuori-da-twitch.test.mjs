// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL RICHIAMO DELLE PAROLE VIETATE, una volta ogni trenta secondi per chat.
// Fuori da Twitch il gestore dei messaggi nasce a ogni messaggio (bot.js,
// messaggioEsterno): il tempo dell'ultimo richiamo tenuto dentro al gestore
// ripartiva ogni volta, e su Kick e YouTube il richiamo usciva a ogni parola.
// La chat e' il canale su una piattaforma: Twitch e Kick dello stesso canale
// sono due chat, e ognuna ha il suo richiamo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('richiamo-');
const { streamers } = await import('../../src/db.js');
const { createMessageHandler } = await import('../../src/features/handler.js');
test.after(() => casa.pulisci());

const CANALE = 'richiamato';
streamers.upsertApproved(CANALE, 'Richiamato', '1');
streamers.setSettings(CANALE, { paroleVietate: ['brutta'] });

const detti = [];
// come messaggioEsterno: un gestore nuovo per ogni messaggio
const gestore = () => createMessageHandler({ chat: { say: (_c, t) => detti.push(t) }, botLogin: CANALE });
const msg = (piattaforma, user) => ({ channel: CANALE, user, display: user, text: 'che parola brutta', piattaforma });

test('su Kick, con un gestore nuovo a ogni messaggio, il richiamo esce una volta ogni trenta secondi', async () => {
  await gestore()(msg('kick', 'uno'));
  await gestore()(msg('kick', 'due'));
  await gestore()(msg('kick', 'tre'));
  assert.equal(detti.length, 1);
  assert.match(detti[0], /@uno evitiamo questo linguaggio/);
});

test('Twitch e Kick dello stesso canale sono due chat: ognuna ha il suo richiamo', async () => {
  const prima = detti.length;
  await gestore()(msg(undefined, 'quattro'));
  await gestore()(msg('youtube', 'cinque'));
  await gestore()(msg('youtube', 'sei'));
  assert.deepEqual(detti.slice(prima), ['@quattro evitiamo questo linguaggio qui 🙏', '@cinque evitiamo questo linguaggio qui 🙏']);
});
