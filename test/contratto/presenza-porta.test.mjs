// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PRESENZA COME PORTA, COME E' CABLATA (docs/COLPI.md, «La presenza come
// porta»). La porta la prova test/unita/presenza-porta.test.mjs; qui si fissa
// che il bot la usi:
//  · la frase si segna sempre, prima e fuori dal giro di Pewpewify (che e'
//    acceso solo coi colpi accesi), con la frase della porta;
//  · la diretta e' la stessa chiave della presenza di Pewpewify;
//  · le monete dei messaggi passano dalla porta con chi puo' sentire il ricordo;
//  · i Bit da spendere chiedono la porta per la persona del cheer, anche su Kick;
//  · chi si presenta sente «presente» solo se non ha gia' la risposta della serie.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const BOT = readFileSync(join(RAD, 'src/bot.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');

test('la frase si segna sempre, prima del giro di Pewpewify', () => {
  const segna = BOT.indexOf('presenteOra = presenzaPorta.segna(login, { piattaforma: msg.piattaforma || \'twitch\', id: msg.userId || \'\', user: msg.user });');
  const giro = BOT.indexOf('if (!msg.isSelf && streamers.get(login)?.settings?.colpi?.attivo === true) {');
  assert.ok(segna > 0 && segna < giro, 'fuori dal giro dei colpi, che e\' acceso solo coi colpi accesi');
  assert.match(BOT.slice(segna - 300, segna), /if \(eFrasePorta\(presenzaPorta\.cfgDi\(login\), msg\.text\) && ePersona\(login, msg\.user\)\) \{\s*$/);
  assert.match(BOT, /presenzaPorta\.usa\(\{ occasione: \(l\) => arrivi\.occasioneDiretta\(l, this\._inizioTwitch\(l\)\) \}\);/, 'la stessa diretta della presenza di Pewpewify');
});

test('«presente» solo a chi non ha gia\' la risposta della serie', () => {
  assert.match(BOT, /if \(t\) \{ parla\(t\); rispostoPresenza = true; \}/);
  assert.match(BOT, /if \(presenteOra && !rispostoPresenza\) \{\s*const cfgP = presenzaPorta\.cfgDi\(login\);\s*if \(cfgP\.presenza\.porta\.attiva && cfgP\.presenza\.porta\.conferma\) parla\(testoPorta\(cfgP, 'conferma', linguaChat\(login\), \{ nome: msg\.display \|\| msg\.user \}\)\);/);
});

test('le monete e i Bit passano dalla porta', () => {
  assert.match(BOT, /games\.accredita\(msg, parla\)/, 'le monete dei messaggi, col ricordo');
  assert.match(BOT, /presente: \(l, persona\) => presenzaPorta\.lascia\(l, valutaDi\(persona\) === 'kicks' \? \{ piattaforma: 'kick', id: String\(persona\)\.slice\(2\) \} : \{ piattaforma: 'twitch', id: String\(persona\) \}, 'bit'\),/);
  assert.match(BOT, /else if \(r\.fuoriPorta\) this\._ricordaPorta\(channel, \{ piattaforma: 'twitch', id: data\.user_id, user: data\.user_login \}, \(t\) => this\.say\(channel, t\)\);/);
  assert.match(BOT, /else if \(r\.fuoriPorta\) this\._ricordaPorta\(channel, \{ piattaforma: 'kick', id: data\.user_id, user: data\.user_login \}, dire\);/);
  assert.match(BOT, /if \(!chi\?\.id \|\| !chi\?\.user \|\| !presenzaPorta\.ricordo\(login, chi\)\) return;/, 'un anonimo non e\' nessuno');
  assert.match(BOT, /presenti\.pulisci\(\)/);
});
