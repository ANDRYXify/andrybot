// LA VOCE DI UN MESSAGGIO — cioè: dove finisce la risposta.
//
// Il difetto vero, spedito e trovato in campo: un `!comando` scritto su Kick
// veniva risposto SU TWITCH. Peggio del silenzio, perché il pubblico sbagliato
// vede una risposta a una domanda che non ha sentito.
//
// La causa non è una svista: quindici punti del tubo rispondono a un messaggio,
// e ognuno si ricavava la voce da sé con `this.say(msg.channel, …)` — che è
// Twitch e basta. Quindici occasioni di sbagliare, quattordici sbagliate.
//
// Qui si fissa la regola: la voce si decide in UN posto e viaggia col messaggio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bot = readFileSync('src/bot.js', 'utf8');

// Il tubo: da _elaboraMessaggio fino all'event-bus dei plugin.
const tubo = bot.slice(
  bot.indexOf('_elaboraMessaggio(login, msg, onMessage, parla'),
  bot.indexOf("this.bus?.emit('message', msg)"),
);
const gestisci = bot.slice(
  bot.indexOf('async _gestisciMessaggio('),
  bot.indexOf('_elaboraMessaggio(login, msg, onMessage, parla);'),
);

test('esiste UN posto solo che decide la voce', () => {
  assert.match(bot, /vocePer\(msg\)\s*\{/, 'manca vocePer()');
  const quante = (bot.match(/this\.say\(msg\.channel/g) || []).length;
  assert.equal(quante, 1, `this.say(msg.channel…) compare ${quante} volte: deve stare solo dentro vocePer()`);
});

test('vocePer conosce le piattaforme, non solo Twitch', () => {
  const corpo = bot.slice(bot.indexOf('vocePer(msg) {'), bot.indexOf('async _gestisciMessaggio('));
  assert.match(corpo, /kick/i, 'vocePer deve saper rispondere anche su Kick');
});

test('nel tubo dei messaggi nessuno si ricava la voce da sé', () => {
  assert.equal((tubo.match(/this\.say\(/g) || []).length, 0,
    'un punto del tubo risponde con this.say: su Kick finirebbe su Twitch');
  assert.ok(tubo.includes('parla'), 'il tubo deve usare la voce che gli arriva');
});

test('la voce arriva fino in fondo, non si ferma al primo strato', () => {
  assert.match(gestisci, /const parla = dire \|\| this\.vocePer\(msg\)/);
  assert.match(bot, /_elaboraMessaggio\(login, msg, onMessage, parla\);/,
    'chi elabora deve RICEVERE la voce, non ricavarsela');
  assert.match(bot, /_elaboraMessaggio\(login, msg, onMessage, parla = this\.vocePer\(msg\)\)/,
    'e avere un ripiego sensato se non gliela passano');
});

test('quanti punti rispondono a un messaggio (perché il conto conta)', () => {
  const punti = (tubo.match(/\bparla\b/g) || []).length;
  assert.ok(punti >= 10, `solo ${punti} punti usano la voce: qualcuno è rimasto indietro`);
});

test('un messaggio da fuori non entra dalla porta di Twitch', () => {
  // il taglio si ferma a vocePer(), che quella riga DEVE contenerla
  const esterno = bot.slice(bot.indexOf('async messaggioEsterno('), bot.indexOf('vocePer(msg) {'));
  assert.match(esterno, /piattaforma === 'twitch'/, 'Twitch ha la sua strada: non deve rientrare da qui');
  assert.doesNotMatch(esterno, /this\.say\(/, 'e non deve parlare con la voce di Twitch');
});
