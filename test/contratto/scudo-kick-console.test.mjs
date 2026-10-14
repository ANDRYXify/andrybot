// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA CONSOLE DELLO SCUDO AGISCE SULLA PIATTAFORMA DELLA RIGA (docs/SCUDO.md, «Su Kick»).
//
// Un id di Kick dato a Twitch e' un'altra persona. «Blocca sempre» da una
// segnalazione, «Sbanna» dal rapporto e le liste devono quindi passare dalla
// moderazione della piattaforma della riga, e il pannello deve dirla.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const rotta = (inizio) => { const i = SRV.indexOf(inizio); assert.ok(i > 0, `c'e': ${inizio}`); return SRV.slice(i, SRV.indexOf('\n  }));', i)); };

test('«Blocca sempre» su una riga di Kick: «kick:nome» nella lista e il ban con la moderazione di Kick', () => {
  const r = rotta("app.post('/api/antibot/segnalazione'");
  assert.match(r, /const suKick = v\.piattaforma === 'kick';/);
  assert.match(r, /conNome\(ab\[campo\], \(suKick \? 'kick:' : ''\) \+ v\.login\)/);
  assert.match(r, /suKick\s*\? await kickApi\.pausa\(login, v\.userId, 0,/);
  assert.match(r, /\(suKick \? kickApi\.puoModerare\(login\) : moderazioneOk\(login\)\)/, 'il permesso e\' quello della piattaforma della riga');
});

test('«Sbanna» su una riga di Kick va a Kick, e lo sblocco su Kick non esiste', () => {
  const r = rotta("app.post('/api/antibot/azione'");
  const kick = r.slice(r.indexOf("if (req.body?.piattaforma === 'kick') {"), r.indexOf("if (!moderazioneOk(login))"));
  assert.ok(kick.length > 50, 'il ramo di Kick viene prima di ogni chiamata a Twitch');
  assert.match(kick, /if \(azione !== 'sbanna'\) return res\.status\(400\)/);
  assert.match(kick, /kickApi\.sbanna\(login, userId\)/);
  assert.match(kick, /piattaforma: 'kick', azione: 'sbanna'/);
  assert.doesNotMatch(kick, /helix\./, 'nel ramo di Kick Twitch non si chiama');
});

test('le liste accettano «kick:nome» con lo stesso controllo della lista salvata', () => {
  const r = rotta("app.post('/api/antibot/lista'");
  assert.match(r, /const nome = nomeAccount\(/);
});

test('il pannello dice «Kick» sulle righe di Kick e manda la piattaforma', () => {
  assert.match(APP, /const suKickBadge = \(v\) => \(v\?\.piattaforma === 'kick'/);
  for (const dove of ['scudo-reg-chi', 'att-chi-nome']) assert.ok(new RegExp(`class="${dove}">[^\\n]*suKickBadge\\(`).test(APP), dove);
  assert.match(APP, /body: \{ azione, userId: az\.dataset\.uid, login: az\.dataset\.login, \.\.\.\(suKick \? \{ piattaforma: 'kick' \} : \{\}\) \}/);
  assert.match(APP, /nome: \(suKick \? 'kick:' : ''\) \+ az\.dataset\.login/);
  assert.match(APP, /Per una persona di Kick scrivi <code>kick:nome<\/code>/);
});
