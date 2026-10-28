// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ACCESSO CON KICK DELLO SPETTATORE, COME E' CABLATO (docs/COLPI.md, «Su
// Kick»). I pezzi li prova test/unita/colpi-kick-pagina.test.mjs; qui i fili:
//  · la rotta parte solo coi colpi aperti e Kick configurato, coi soli
//    permessi dello spettatore, e dal nome corto fa il giro col segno;
//  · il ritorno da /auth/kick/callback riconosce il giro dello spettatore
//    PRIMA di qualunque cosa dello streamer, e la persona e' k:<id>;
//  · la chat scrive sulla piattaforma di chi e' entrato;
//  · il rinnovo del token va alla piattaforma giusta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senza = (p) => readFileSync(join(RAD, p), 'utf8').replace(/^\s*\/\/.*$/gm, '');
const SRV = senza('src/web/server.js'), ROTTE = senza('src/kick/rotte.js');

test('la rotta: colpi aperti, Kick configurato, i soli permessi dello spettatore', () => {
  const i = SRV.indexOf("app.get('/u/:user/colpo/accedi-kick', (req, res) => {");
  assert.ok(i > 0);
  const h = SRV.slice(i, i + 1200);
  assert.match(h, /if \(!login \|\| !portaColpi\.aperti\(login\) \|\| !kickAuth\.configurato\(\)\) return notFound\(res\);/);
  assert.match(h, /giroOAuth\.apri\(req, 'kick', \{ spettatore: \{ canale: login, \.\.\.\(segno \? \{ segno \} : \{\}\) \} \}\)/, 'il giro dice che e\' uno spettatore, e di che canale');
  assert.match(h, /kickAuth\.urlAutorizzazione\(\{ challenge, state, scope: colpiAccesso\.PERMESSI_KICK \}\)/);
});

test('il ritorno: lo spettatore prima dello streamer, con la persona di Kick', () => {
  const cb = ROTTE.indexOf("app.get('/auth/kick/callback', wrap(async (req, res) => {");
  const h = ROTTE.slice(cb, cb + 700);
  const sp = h.indexOf('if (esito.giro?.spettatore && typeof spettatore === \'function\') return spettatore(req, res, esito);');
  assert.ok(sp > 0 && sp < h.indexOf('const registrazione'), 'prima di qualunque cosa dello streamer');
  assert.match(SRV, /spettatore: spettatoreKick,/);
  const f = SRV.indexOf('async function spettatoreKick(req, res, esito) {');
  const g = SRV.slice(f, f + 1500);
  assert.match(g, /if \(!esito\.ok \|\| !eLoginNostro\(canale\)\) return res\.redirect\(torna\);/, 'un giro andato male torna alla pagina, senza accesso');
  assert.match(g, /accessiColpi\.metti\(\{ id: colpiMod\.personaKick\(v\.userId\), login: nome, nome, token: t\.accessToken, refresh: t\.refreshToken, scade: t\.expiresAt, piattaforma: 'kick' \}\)/);
});

test('la chat sulla piattaforma di chi e\' entrato; il rinnovo sulla sua', () => {
  assert.match(SRV, /const suKick = io\.piattaforma === 'kick';/);
  assert.match(SRV, /\? await colpiAccesso\.mandaInChatKick\(\{ token, broadcasterKickId: kickApi\.tokenDi\(login\)\.userId, testo: req\.body\?\.testo \}\)/);
  assert.match(SRV, /rinnova: \(r, piattaforma\) => \(piattaforma === 'kick' \? kickAuth\.rinnova\(r\) : auth\.refresh\(r\)\)/);
  assert.match(SRV, /kick: \(l\) => \(kickApi\.tokenDi\(l\)\?\.userId \? \(manager\.kickVisto\?\.\(l\) \|\| \{ slug: '', live: false \}\) : null\),/, 'i Kicks solo per un canale collegato a Kick');
});
