// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// CHI GESTISCE LE EMOTE 7TV, UNA REGOLA SOLA.
// Il server lascia aggiungere, caricare, rinominare e togliere a chi entra nel
// pannello del canale (proprietario e moderatori), e collegare o scollegare
// solo al proprietario; il manuale dice lo stesso. Il pannello nascondeva matita
// e ✕ ai moderatori: una terza regola, che nessuno aveva scelto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const guardia = (via) => (SRV.match(new RegExp(`app\\.post\\('/api/seventv/${via}', ([a-zA-Z]+)`)) || [])[1];

test('le emote le gestisce chi entra nel canale; collegare 7TV resta al proprietario', () => {
  for (const v of ['aggiungi', 'rimuovi', 'rinomina', 'carica']) assert.equal(guardia(v), 'requireLogin', `/api/seventv/${v}`);
  for (const v of ['connect', 'disconnect']) assert.equal(guardia(v), 'requireOwner', `/api/seventv/${v}`);
  const i = APP.indexOf('const puoModificare = ');
  const riga = APP.slice(i, APP.indexOf('\n', i));
  assert.ok(i > 0 && !/proprietario/.test(riga), `il pannello decide da solo chi rinomina e toglie: ${riga}`);
  assert.match(leggi('src/web/manuali/it/emote.js'), /I miei moderatori possono gestire le emote\?', r: 'Sì/);
});
