// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I KICKS DEI COLPI, COME SONO CABLATI (docs/COLPI.md, «Su Kick»). Il servizio
// lo prova test/unita/colpi-kicks.test.mjs; qui si fissa la strada:
//  · l'id del messaggio di Kick (Kick-Event-Message-Id) arriva fino al
//    riferimento dei Kicks da spendere: lo stesso regalo non conta due volte
//    nemmeno dopo un riavvio (il ricordo dei doppi in memoria non basta);
//  · un regalo anonimo non e' di nessuno: niente persona, niente saldo;
//  · il regalo va al servizio solo da Kick, e la risposta parla di Kicks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { daEvento } from '../../src/kick/messaggio.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senza = (p) => readFileSync(join(RAD, p), 'utf8').replace(/^\s*\/\/.*$/gm, '');
const BOT = senza('src/bot.js'), ROTTE = senza('src/kick/rotte.js');

test('il regalo porta con se\' l\'id del messaggio di Kick, e la persona', () => {
  const ev = daEvento('kicks.gifted', { broadcaster: { user_id: 1 }, sender: { user_id: 987, username: 'marta' }, gift: { amount: 500, message: 'vai K7QX3' } }, { canale: 'prova', id: 'msg-01' });
  assert.deepEqual([ev.tipo, ev.quanti, ev.messaggio, ev.utenteId, ev.idEvento], ['kicks', 500, 'vai K7QX3', '987', 'msg-01']);
  assert.equal(daEvento('kicks.gifted', { gift: { amount: 1 } }, { canale: 'prova' }).idEvento, undefined, 'senza id, niente id inventato');
  assert.match(ROTTE, /daEvento\(tipo, p, \{ canale, id: String\(req\.get\('Kick-Event-Message-Id'\) \|\| ''\) \}\)/, 'la rotta lo passa');
  assert.match(BOT, /if \(ev\.tipo === 'kicks'\) Object\.assign\(data, \{ kicks: Number\(ev\.quanti\) \|\| 0, message: String\(ev\.messaggio \|\| ''\), is_anonymous: !chi, evento: String\(ev\.idEvento \|\| ''\) \}\);/);
});

test('il servizio riceve il regalo solo da Kick, anonimo senza persona, con l\'id come riferimento', () => {
  const i = BOT.indexOf("if (ev.piattaforma === 'kick' && type === 'kicks.gifted') {");
  assert.ok(i > 0, 'solo da Kick');
  const h = BOT.slice(i, i + 1400);
  assert.match(h, /this\.colpi\?\.daKicks\(channel, \{ kicks: data\.kicks, message: data\.message, user_login: data\.user_login, user_id: data\.is_anonymous \? '' : data\.user_id, evento: data\.evento \}\)/);
  assert.match(h, /'pochi-kicks'/);
  assert.match(h, /'misto-kicks-prima'/);
});
