// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// GLI INVITI DEI MODERATORI.
//  · il nome si legge con la regola della registrazione: chi entra con Kick o
//    YouTube ha il canale che nasce da nomePulito, e un invito che accettava
//    solo 3-25 caratteri [a-z0-9_] rifiutava «Pippo.Rossi», che entrando
//    diventa yt.pipporossi;
//  · un invito scaduto si dice scaduto: il pannello mostrava «valido fino al»
//    con una data passata e il link che non vale piu'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loginSu, loginYoutube, loginKick } from '../../src/identita.js';

const SRV = readFileSync('src/web/server.js', 'utf8');
const APP = readFileSync('src/web/public/app.js', 'utf8');

test('l\'invito legge il nome come la registrazione', () => {
  const f = SRV.slice(SRV.indexOf('  const chiInvitare = (corpo) => {'), SRV.indexOf("  app.post('/api/moderatori', requireOwner"));
  assert.ok(f.includes('const login = loginSu(piattaforma, grezzo);'), 'la stessa strada della registrazione');
  assert.ok(!/\/\^\[a-z0-9_\]\{3,25\}\$\//.test(f), 'niente regola sua sul nome');
  // la registrazione: loginYoutube(maniglia), loginKick(nome)
  assert.equal(loginSu('youtube', 'Pippo.Rossi'), loginYoutube('@Pippo.Rossi'.replace(/^@/, '')));
  assert.equal(loginSu('youtube', 'Pippo.Rossi'), 'yt.pipporossi');
  assert.equal(loginSu('kick', 'Il-Gatto'), loginKick('Il-Gatto'));
  assert.equal(loginSu('twitch', 'Ab'), 'ab', 'anche i nomi corti che la piattaforma permette');
  assert.equal(loginSu('twitch', '...'), '', 'se non resta niente, il nome non vale');
});

test('un invito scaduto si dice scaduto, e il suo link non si offre', () => {
  const v = SRV.slice(SRV.indexOf('  const invitoScaduto = '), SRV.indexOf("  app.get('/api/moderatori', requireOwner"));
  assert.match(v, /m\.status === 'invitato' && Number\(m\.invite_expires\) > 0 && ora > Number\(m\.invite_expires\)/, 'zero vuol dire senza scadenza');
  assert.match(v, /invito: m\.status === 'invitato' && !invitoScaduto\(m\) \? \{ url:/, 'niente link se e\' scaduto');
  assert.match(v, /scaduto: invitoScaduto\(m\),/);
  const i = APP.indexOf('async function caricaModeratori() {');
  const f = APP.slice(i, APP.indexOf('\n}\n', i));
  assert.ok(f.includes(": m.invito ? `<span class=\"badge giallo\">${L('invito in attesa'") && f.includes("`<span class=\"badge rosso\">${L('invito scaduto'"));
  assert.ok(f.includes("${m.invito ? `<button class=\"btn secondario mini\" data-mod-link="), '«Copia link» solo con un link che vale');
});
