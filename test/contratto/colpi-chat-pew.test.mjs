// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// «!PEW <COLPO>» DALLA CHAT, COME E' CABLATO (docs/COLPI.md, «Dalla chat, nel
// punto dello streamer»).
//
// Il modello e il servizio li prova test/unita/colpi-chat-pew.test.mjs; la
// pagina e l'overlay verifica-colpi.mjs. Qui si fissa che il bot lo usi bene:
//  · nel giro dei colpi di ogni messaggio di una persona, dopo codici, «bit»,
//    «zaino» e presenza (che restano loro);
//  · su Twitch, con la persona di Twitch per i saldi (chi) e il suo login per
//    le monete (user), mai qualcosa che arriva dal testo;
//  · la risposta: accesa dallo streamer, sempre quando parte, i rifiuti al
//    massimo uno ogni attesaSec a testa; la moneta accordata come altrove.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const BOT = readFileSync(join(RAD, 'src/bot.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');

test('«!pew <colpo>»: nel giro dei colpi, dopo i significati che ci sono gia\'', () => {
  const giro = BOT.indexOf("if (!msg.isSelf && streamers.get(login)?.settings?.colpi?.attivo === true) {");
  const qui = BOT.indexOf('const lc = lancioInChat(cfgColpi, msg.text);');
  assert.ok(giro > 0 && qui > giro && qui < BOT.indexOf('this.brain.observe?.(msg);'), 'nel giro dei colpi, prima del resto del messaggio');
  for (const prima of ['pagaInChat(cfgColpi, msg.text)', 'chiedeBit(cfgColpi, msg.text)', 'chiedeZaino(cfgColpi, msg.text)', 'eFrasePresenza(cfgColpi, msg.text)'])
    assert.ok(BOT.indexOf(prima, giro) > 0 && BOT.indexOf(prima, giro) < qui, `${prima} viene prima`);
  assert.match(BOT.slice(giro, qui), /\} else if \(cfgColpi\?\.chat\.attivo && \(!msg\.piattaforma \|\| msg\.piattaforma === 'twitch'\) && msg\.userId\) \{\s*$/, 'un ramo della stessa catena: un messaggio fa una cosa sola; solo su Twitch, con la persona');
});

test('paga chi scrive, coi suoi saldi; risponde come vuole lo streamer', () => {
  const qui = BOT.indexOf('const lc = lancioInChat(cfgColpi, msg.text);');
  const h = BOT.slice(qui, qui + 2200);
  assert.match(h, /this\.colpi\.inChat\(login, \{ voce: lc\.voce, con: lc\.con, user: msg\.user, chi: msg\.userId, nome \}\)/);
  assert.match(h, /const parlo = cfgColpi\.chat\.rispondi && \(esito === 'ok' \|\| adesso - \(saldiBitChiesti\.get\(k\) \|\| 0\) >= cfgColpi\.chat\.attesaSec \* 1000\);/, 'accesa dallo streamer; i rifiuti col loro passo');
  assert.match(h, /const k = login \+ '\|c\|' \+ msg\.userId/, 'il passo e\' della persona in quel canale');
  assert.match(h, /rispostaChat\(cfgColpi, lingua, esito, /);
  assert.match(h, /parla\(accordaMoneta\(t, monetaDi\(login\)\.forma\)\)/, 'la moneta accordata');
});
