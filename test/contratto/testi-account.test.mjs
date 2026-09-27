// I TESTI DELL'ACCOUNT DICONO IL VERO.
//  · un moderatore si invita su Twitch, Kick o YouTube, ed entra con il suo
//    account su quella piattaforma: il pannello diceva «con Twitch» e basta;
//  · il messaggio su Telegram quando il bot perde la chat nomina il tasto che
//    c'e' davvero, «Ricollega i permessi»;
//  · «ricolleghi» con una c sola.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync('src/web/public/app.js', 'utf8');
const BOT = readFileSync('src/bot.js', 'utf8');

test('il moderatore entra con il suo account su quella piattaforma', () => {
  assert.ok(!APP.includes("L('accede con Twitch (così sappiamo") && !APP.includes("L('accederà con Twitch e potrà"));
  assert.ok(APP.includes("L('accede con il suo account su quella piattaforma (così sappiamo che è davvero lui)"));
  assert.ok(APP.includes("L('accederà con il suo account su quella piattaforma e potrà gestire SocialBot:'"));
});

test('il bot su Telegram nomina il tasto che c\'e\'', () => {
  const f = BOT.slice(BOT.indexOf('  _chatAuthKO(login) {'), BOT.indexOf('  _ready(s) {'));
  assert.ok(f.includes('«Ricollega i permessi»') && !f.includes('«Concedi i permessi»'));
  assert.ok(APP.includes(">${L('Ricollega i permessi', 'Reconnect permissions', 'Reconecta los permisos')}</a>"), 'e il tasto si chiama davvero cosi\'');
});

test('niente refusi nella carta del bot scollegato', () => {
  assert.ok(!APP.includes('riccolleg'));
});
