// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// INSTAGRAM NEL TEMPO: quello che si rompe da solo, senza che nessuno tocchi
// niente (src/features/instagram.js).
//
// LE VERSIONI DELLE API DI META SCADONO (VERSIONI).
//
// Una versione scaduta non da' errore: Meta gira la chiamata sulla piu' vecchia
// ancora valida, e le regole cambiano in silenzio. Per questo la scadenza sta
// accanto alla versione, e questa prova si accende due mesi prima: il tempo di
// passare alla nuova con calma, non quando qualcosa ha gia' smesso di andare.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSIONI, ricordaRinnovo, rinnovoNonRiesce, AVVISO_SCADENZA_GIORNI } from '../../src/features/instagram.js';

const PREAVVISO_MS = 60 * 86400_000;

test('le versioni delle API di Meta non sono in scadenza', () => {
  for (const [porta, { versione, valida }] of Object.entries(VERSIONI)) {
    assert.match(versione, /^v\d+\.0$/, porta);
    if (!valida) continue;
    const resta = Date.parse(valida) - Date.now();
    assert.ok(resta > PREAVVISO_MS, `${porta}: ${versione} vale fino al ${valida}. Passa alla versione nuova (changelog di Meta) e scrivi la sua scadenza`);
  }
});

// IL RINNOVO CHE NON RIESCE si dice prima della scadenza, non a token morto.
test('il rinnovo che non riesce si ricorda, si dimentica appena riesce, e il pannello lo dice in tempo', () => {
  ricordaRinnovo('Anna', 'Error validating access token');
  assert.equal(rinnovoNonRiesce('anna'), 'Error validating access token');
  ricordaRinnovo('anna', null);
  assert.equal(rinnovoNonRiesce('anna'), '');
  assert.ok(AVVISO_SCADENZA_GIORNI > 7 && AVVISO_SCADENZA_GIORNI < 30, 'si avvisa dopo che il rinnovo ha cominciato a provarci (30 giorni), e con margine');
  const BOT = readFileSync(new URL('../../src/bot.js', import.meta.url), 'utf8');
  const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
  assert.match(BOT, /if \(!r\.ok\) \{ instagram\.ricordaRinnovo\(login, r\.errore\);/, 'il giro del rinnovo si segna l\'errore');
  assert.match(BOT, /tokens\.save\('instagram', login, \{ \.\.\.t, accessToken: r\.token, expiresAt: r\.scade \}\);\n\s*instagram\.ricordaRinnovo\(login, null\);/, 'e lo dimentica quando riesce');
  assert.match(SRV, /rinnovo: t \? instagram\.rinnovoNonRiesce\(login\) : '',/);
  assert.match(APP, /if \(d\.rinnovo && d\.scadeFraGiorni != null && d\.scadeFraGiorni <= d\.avvisoGiorni\)/, 'il pannello lo mostra col tasto per ricollegare');
});
