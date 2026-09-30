// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUANDO LAVORA IL BOT: l'interruttore sopra tutto, poi la modalita'. Una regola
// sola per Twitch, Kick e YouTube (src/features/quando-lavora.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODALITA, modalitaDi, normModalita, alLavoro } from '../../src/features/quando-lavora.js';

const APP = readFileSync('src/web/public/app.js', 'utf8');
const SRV = readFileSync('src/web/server.js', 'utf8');
const BOT = readFileSync('src/bot.js', 'utf8');

test('le modalita\' sono due: «manuale» si legge «sempre»', () => {
  assert.deepEqual(MODALITA, ['sempre', 'live']);
  assert.equal(modalitaDi({ modalita: 'manuale' }), 'sempre');
  assert.equal(modalitaDi({}), 'sempre');
  assert.equal(modalitaDi(undefined), 'sempre');
  assert.equal(modalitaDi({ modalita: 'live' }), 'live');
  assert.equal(normModalita('manuale'), 'sempre', 'un pannello rimasto aperto da prima salva «sempre»');
  assert.equal(normModalita('live'), 'live');
  assert.equal(normModalita('boh'), null);
});

test('l\'interruttore vale sopra la modalita\'', () => {
  const s = (x = {}) => ({ status: 'approved', botEnabled: true, settings: {}, ...x });
  assert.equal(alLavoro(s()), true);
  assert.equal(alLavoro(s({ botEnabled: false })), false, 'spento non lavora');
  assert.equal(alLavoro(s({ botEnabled: false }), { inDiretta: true }), false, 'nemmeno in diretta');
  assert.equal(alLavoro(s({ status: 'pending' })), false);
  assert.equal(alLavoro(null), false);
  assert.equal(alLavoro(s({ settings: { modalita: 'live' } })), false, '«solo in diretta» fuori onda non lavora');
  assert.equal(alLavoro(s({ settings: { modalita: 'live' } }), { inDiretta: true }), true);
  assert.equal(alLavoro(s({ settings: { modalita: 'manuale' } })), true, '«manuale» era «sempre»');
});

test('il pannello offre due modalita\', il server e il bot leggono la stessa regola', () => {
  const sel = APP.slice(APP.indexOf('<select id="sel-modalita">'), APP.indexOf('</select>', APP.indexOf('<select id="sel-modalita">')));
  assert.equal((sel.match(/<option value=/g) || []).length, 2, 'Sempre e Solo in diretta');
  assert.ok(!sel.includes('manuale'), 'niente piu\' «Manuale» nel menù');
  assert.match(APP, /modalita: s\.modalita === 'live' \? 'live' : 'sempre',/, 'una modalita\' salvata «manuale» nel pannello e\' «sempre»');
  assert.match(SRV, /const m = normModalita\(b\.modalita\);/, 'il server salva la modalita\' ripulita');
  assert.ok(!SRV.includes("['sempre', 'live', 'manuale']"), 'e non accetta piu\' «manuale» come modalita\' a se\'');
  const c = BOT.slice(BOT.indexOf('  _modalitaConsente(s) {'), BOT.indexOf('  async syncChannels() {'));
  assert.match(c, /modalitaDi\(s\?\.settings\) === 'live'/, 'la chat di Twitch legge la stessa regola');
});
