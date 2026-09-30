// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL NEGOZIO E' CABLATO DOVE DEVE: nel tubo dei comandi, all'avvio, e nella pulizia.
//
// Le regole dell'acquisto si provano in test/unita/negozio.test.mjs. Qui si
// guarda che il bot le usi davvero: un gestore scritto bene e mai chiamato, o
// chiamato fuori dal vaglio dei comandi pronti, sarebbe verde nelle prove e
// muto (o sordo ai nomi scelti dallo streamer) in chat.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bot = readFileSync('src/bot.js', 'utf8');

test('i comandi del negozio passano dal vaglio, con la voce del messaggio', () => {
  const dentro = bot.slice(bot.indexOf('if (!suo && !vaglio?.salta) {'), bot.indexOf('// Il conteggio automatico delle parole non e\' un comando'));
  assert.match(dentro, /negozio\.tryComando\(cmdMsg, parla, \{/, 'col testo gia\' tradotto nel nome di serie, e la voce di chi ha scritto');
  assert.match(dentro, /helix: this\.helix, effetti: this\.effects, moduli: this\.modules,/, 'con i motori che fanno partire quello che si compra');
  assert.match(dentro, /live: msg\.piattaforma && msg\.piattaforma !== 'twitch' \? true : this\._liveState\.get\(login\) === true,/);
});

test('all\'avvio si rende quello rimasto a meta\', e lo storico si pulisce anche se il bot si riavvia spesso', () => {
  assert.match(bot, /for \(const r of negozio\.rimborsaSospesi\(\)\)/);
  const avvio = bot.slice(bot.indexOf('const potaNegozio = '), bot.indexOf('this._negozioTimer = setInterval(potaNegozio'));
  assert.match(avvio, /^ {4}potaNegozio\(\);$/m, 'una volta subito, non solo dopo sei ore');
  assert.match(bot, /clearInterval\(this\._negozioTimer\)/);
});
