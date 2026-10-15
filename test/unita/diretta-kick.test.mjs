// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// KICK NELLO STUDIO, DA SOLO (docs/DIRETTA.md, «Le destinazioni»).
//
// Chi ha collegato Kick non incolla niente: lo Studio chiede a Kick indirizzo e
// chiave al momento di partire, col permesso streamkey:read, che si chiede solo
// a chi ha lo Studio. E le scene dello Studio si salvano da sole: la barra
// «modifiche da salvare» non c'entra, e il suo «Salva» non deve finire sul
// tasto della destinazione nuova.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indirizzoDiretta } from '../../src/kick/api.js';
import { urlAutorizzazione, SCOPE_DIRETTA } from '../../src/kick/auth.js';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');

test('l\'indirizzo di Kick si compone da quello che Kick dice, e senza chiave non c\'e\'', () => {
  assert.equal(indirizzoDiretta({ url: 'rtmps://fa723fc1b171.global-contribute.live-video.net/app/', key: 'sk_us-west_abc' }), 'rtmps://fa723fc1b171.global-contribute.live-video.net/app/sk_us-west_abc');
  assert.equal(indirizzoDiretta({ url: 'rtmps://fa723fc1b171.global-contribute.live-video.net:443', key: 'sk_x' }), 'rtmps://fa723fc1b171.global-contribute.live-video.net:443/app/sk_x', 'senza percorso si va su /app, come vuole il servizio di Kick');
  assert.equal(indirizzoDiretta({ url: 'rtmps://x/app', key: '' }), null);
  assert.equal(indirizzoDiretta({ url: 'https://x/app', key: 'k' }), null);
  assert.equal(indirizzoDiretta(null), null);
});

test('il permesso della chiave di Kick si chiede solo a chi ha lo Studio, e ricollegando non si perde', () => {
  const scope = (u) => new URL(u).searchParams.get('scope').split(' ');
  assert.ok(!scope(urlAutorizzazione({ challenge: 'c', state: 's' })).includes('streamkey:read'), 'a chi non trasmette dal sito non si chiede');
  assert.ok(SCOPE_DIRETTA.every((x) => scope(urlAutorizzazione({ challenge: 'c', state: 's', conDiretta: true })).includes(x)));
  assert.ok(scope(urlAutorizzazione({ challenge: 'c', state: 's', conModerazione: true, conDiretta: true })).includes('moderation:ban'), 'la moderazione resta');
  const rotte = leggi('src/kick/rotte.js');
  assert.match(rotte, /const conDiretta = req\.query\.diretta === '1' \|\| \(!registrazione && !!diretta\?\.\(currentUser\(req\)\?\.login\)\);/);
  assert.match(leggi('src/web/server.js'), /diretta: \(login\) => !!login && studioPerMe\(login\),/);
});

test('all\'avvio Kick si prende da Kick, con la chiave chiesta in quel momento', () => {
  const srv = leggi('src/web/server.js');
  const avvio = srv.slice(srv.indexOf("app.post('/api/diretta/avvio'"), srv.indexOf("app.post('/api/diretta/riserva'"));
  assert.match(avvio, /\} else if \(id === 'kick'\) \{\n\s+if \(!kickApi\.puoDiretta\(login\)\) return res\.status\(403\)/);
  assert.match(avvio, /const url = await kickApi\.chiaveDiretta\(login\)/);
  assert.doesNotMatch(avvio, /direttaDest\.salva\(/, 'la chiave di Kick non si salva');
});

test('le scene dello Studio non accendono la barra «modifiche da salvare»', () => {
  const app = leggi('src/web/public/app.js');
  const i = app.indexOf('<div class="carta studio-carta studio-largo" data-non-salva>');
  assert.ok(i > 0, 'la carta dello Studio e\' fuori dalla barra');
  const j = app.indexOf('id="studio-dest-salva"', i);
  assert.ok(j > i, 'il tasto della destinazione nuova sta dentro quella carta');
  assert.match(app, /const NON_SALVA = '[^']*\[data-non-salva\]/);
});
