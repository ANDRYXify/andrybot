// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE MONETE CHE SI PERDONO E QUELLE DEGLI EVENTI, COME SONO CABLATE
// (docs/ECONOMIA.md). Le regole e i conti li provano le prove di unita'
// (economia-perdite.test.mjs, chat-irc.test.mjs); qui si fissa che il bot e il
// server le usino:
//  · la moderazione arriva dalla chat di Twitch, una sorgente sola;
//  · il giro di ogni giorno parte da solo e si ferma col bot;
//  · le monete degli eventi passano dopo lo scudo: un follow sotto attacco non
//    ne prende;
//  · il registro e «Annulla» sono del proprietario, e i movimenti a mano ci
//    finiscono col nome di chi li ha fatti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, '');
const BOT = leggi('src/bot.js');
const SRV = leggi('src/web/server.js');

test('la moderazione e il giro di ogni giorno', () => {
  assert.match(BOT, /chat\.on\('moderazione', \(ev\) => \{\n\s*try \{ economia\.punisci\(login, ev\.user, ev\.tipo, \{ durata: ev\.durata \}\); \}/);
  assert.match(BOT, /this\._economiaTimer = setInterval\(\(\) => this\._giornoEconomia\(\), 60 \* 60_000\);/);
  assert.match(BOT, /clearInterval\(this\._economiaTimer\);/);
  assert.match(BOT, /const e = economia\.giornoEconomia\(s\.login\);/);
});

test('le monete degli eventi: dopo lo scudo, solo su Twitch, e il primo messaggio', () => {
  const i = BOT.indexOf('  _dispatchEvent(ev) {');
  const corpo = BOT.slice(i, BOT.indexOf('\n  }\n', i));
  const scudo = corpo.indexOf('if (taciFollow(channel)) { contaTaciuto(channel); return; }');
  const monete = corpo.indexOf('economia.dagliEventi(channel, type, data)');
  assert.ok(scudo > 0 && monete > scudo, 'un follow taciuto dallo scudo non arriva alle monete');
  assert.match(corpo, /if \(suTwitch\) \{ try \{ economia\.dagliEventi\(channel, type, data\); \}/);
  assert.match(BOT, /if \(msg\.isFirst && !msg\.isSelf && \(!msg\.piattaforma \|\| msg\.piattaforma === 'twitch'\)\) \{\n\s*try \{ economia\.evento\(login, 'primo', msg\.user\); \}/);
});

test('il registro e «Annulla» sono del proprietario; i movimenti a mano ci finiscono col suo nome', () => {
  assert.match(SRV, /app\.get\('\/api\/monete\/registro', requireOwner, /);
  assert.match(SRV, /app\.post\('\/api\/monete\/registro\/:id\/annulla', requireOwner, /);
  assert.match(SRV, /economia\.annulla\(u\.login, req\.params\.id, \{ chi: identitaDi\(u\) \}\)/, 'il canale dalla sessione, mai dalla richiesta');
  assert.match(SRV, /if \(q > 0\) economia\.regala\(login, utente, q, 'pannello', \{ chi: identitaDi\(currentUser\(req\)\) \}\);\n\s*else economia\.perde\(login, utente, -q, 'pannello', \{ chi: identitaDi\(currentUser\(req\)\) \}\);/);
});
