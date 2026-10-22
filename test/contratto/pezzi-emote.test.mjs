// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE EMOTE AL POSTO DEI PEZZI passano dal nostro server (docs/EFFETTI-SCHERMO.md,
// «Al posto dei pezzi»): per animare una GIF servono i byte, e la CSP lascia
// leggere i byte solo dalla nostra origine. Non deve diventare un proxy aperto:
// host fissi, id con la sua forma, solo con la chiave dell'overlay o con la
// sessione del pannello, tipo e peso controllati, una copia con un tetto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const CADDY = readFileSync(join(RAD, 'Caddyfile'), 'utf8');

test('le rotte delle emote: con la chiave o con la sessione, mai aperte', () => {
  assert.match(SRV, /app\.get\('\/overlay\/:login\/emote\/:fonte\/:id', wrap\(async \(req, res\) => \{\s*if \(!chiaveOk\(req\) \|\| !eLoginNostro\(String\(req\.params\.login\)\.toLowerCase\(\)\)\) return notFound\(res\);/);
  assert.match(SRV, /app\.get\('\/api\/streamer\/emote\/:fonte\/:id', requireLogin, wrap\(servieEmote\)\);/);
  assert.match(SRV, /app\.get\('\/api\/streamer\/emote-pezzi', requireLogin,/);
  assert.match(SRV, /app\.get\('\/overlay\/:login\/copertina\/:id', wrap\(async \(req, res\) => \{\s*if \(!chiaveOk\(req\) \|\| !eLoginNostro\(String\(req\.params\.login\)\.toLowerCase\(\)\)\) return notFound\(res\);/, 'la copertina del player: con la chiave dell\'overlay');
});

test('host fissi, id con la sua forma, tipo, peso e tetto della copia', () => {
  const fonti = /const EMOTE_FONTI = \{([\s\S]*?)\n  \};/.exec(SRV)?.[1] || '';
  assert.match(fonti, /'7tv': \{ id: \/\^\[A-Za-z0-9\]\{20,32\}\$\/, url: \(id\) => `https:\/\/cdn\.7tv\.app\/emote\/\$\{id\}\/4x\.webp`, host: 'cdn\.7tv\.app' \}/);
  assert.match(fonti, /twitch: \{ id: \/\^\[A-Za-z0-9_\]\{1,64\}\$\/, url: \(id\) => `https:\/\/static-cdn\.jtvnw\.net\/emoticons\/v2\/\$\{id\}\/default\/dark\/3\.0`, host: 'static-cdn\.jtvnw\.net' \}/);
  assert.match(SRV, /if \(!f \|\| !f\.id\.test\(id\)\) return null;/, 'un id fuori forma non parte nemmeno');
  assert.match(SRV, /if \(!r\.ok \|\| new URL\(r\.url\)\.host !== f\.host\) return null;/, 'un rimando verso un altro host non si segue');
  assert.match(SRV, /if \(!\(f\.tipi \|\| EMOTE_TIPI\)\.test\(tipo\)\) return null;/, 'il tipo e\' quello della fonte, o quello delle emote');
  // la copertina del player (features/musica-overlay.js): solo i.scdn.co, solo un id esadecimale, solo immagini ferme
  assert.match(fonti, /spotify: \{ id: \/\^\[0-9a-f\]\{32,64\}\$\/, url: \(id\) => `https:\/\/i\.scdn\.co\/image\/\$\{id\}`, host: 'i\.scdn\.co', tipi: \/\^image\\\/\(jpeg\|png\|webp\)\$\/ \}/);
  assert.match(SRV, /if \(!buf\.length \|\| buf\.length > EMOTE_MAX_BYTE\) return null;/);
  assert.match(SRV, /while \(_emoteByte > EMOTE_TETTO && _emoteCopie\.size\)/);
  assert.match(SRV, /'X-Content-Type-Options': 'nosniff'/);
});

test('la CSP: l\'overlay e il pannello leggono i byte solo dalla loro origine, e le miniature delle emote arrivano', () => {
  for (const m of CADDY.matchAll(/Content-Security-Policy\s+"([^"]+)"/g)) {
    const c = m[1];
    if (!/connect-src/.test(c)) continue;
    assert.match(c, /connect-src 'self'[;\s]/);
  }
  assert.match(APP, /return x\.fonte === '7tv' \? `https:\/\/cdn\.7tv\.app\/emote\/\$\{encodeURIComponent\(x\.id\)\}\/1x\.webp`/, 'le miniature sono solo immagini: img-src https: le lascia passare');
  assert.match(APP, /return `\/api\/streamer\/emote\/\$\{x\.fonte\}\/\$\{encodeURIComponent\(x\.id\)\}`;/, 'l\'anteprima, che anima, passa dal server');
});
