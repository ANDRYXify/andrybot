// LE PORTE CHE TOCCANO UN SEGRETO, lette nel codice.
//
// Un collaudo ha trovato una scorciatoia pubblica che consegnava il link
// dell'overlay con la chiave dentro, un logout che si poteva far scattare da un
// altro sito, un confronto di segreti che non era a tempo costante, un SVG
// conservato com'era e servito a tutti, e nessun tetto ai flussi aperti ne'
// allo spazio su disco. Qui ognuna di quelle cose ha la sua riga, cosi' che
// tornare indietro faccia rumore.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

const rotta = (via) => {
  const i = SRV.indexOf(`'${via}'`);
  assert.ok(i > 0, `la rotta ${via} esiste`);
  return SRV.slice(i, SRV.indexOf('\n  });', i) + 6);
};

test('nessuna porta pubblica rimanda al link dell\'overlay con la chiave', () => {
  assert.equal(SRV.includes("app.get('/o/:login/:slug'"), false, 'la scorciatoia pubblica non c\'e\' piu\'');
});

test('il link che il pannello consegna porta la chiave in se\'', () => {
  const r = rotta('/api/streamer/overlays');
  assert.match(r, /url: `\$\{base\}\$\{sep\}o=/, 'il link e\' quello con la chiave');
  assert.doesNotMatch(r, /\/o\/\$\{encodeURIComponent\(login\)\}/, 'niente link «bello» senza chiave');
  assert.doesNotMatch(APP, /\burlKey\b/, 'e la pagina non ne conosce un secondo');
});

test('la chiave dell\'overlay si rinnova, e solo il proprietario puo\' farlo', () => {
  const r = rotta('/api/streamer/overlay/chiave');
  assert.match(r, /requireOwner/, 'e\' il suo schermo: solo lui');
  assert.match(r, /effects\.nuovaChiave\(/, 'e la chiave cambia davvero');
  assert.match(APP, /btn-nuovo-link-overlay/, 'il pannello ha il tasto');
  assert.match(APP, /api\('\/api\/streamer\/overlay\/chiave', \{ method: 'POST' \}\)/, 'e il tasto chiama la porta giusta');
});

test('uscire non si fa da un altro sito', () => {
  const r = rotta('/auth/logout');
  assert.match(r, /Sec-Fetch-Site/, 'si guarda da dove arriva il passo');
  assert.match(r, /if \(da === 'cross-site'\) return res\.redirect\('\/'\);/, 'e da fuori non succede niente');
});

test('il segreto di Telegram si confronta a tempo costante', () => {
  const r = rotta('/tg/:secret');
  assert.match(r, /chiaveUguale\(req\.get\('X-Telegram-Bot-Api-Secret-Token'\), conf\.webhook_secret\)/);
  assert.doesNotMatch(r, /!== conf\.webhook_secret/);
});

test('un SVG caricato come icona non resta un SVG', () => {
  const r = rotta('/api/streamer/console/icona');
  assert.match(r, /if \(est === 'svg'\)/, 'l\'SVG si riconosce');
  assert.match(r, /svgInPng\(req\.file\.path, join\(dove, nome\)\)/, 'e si rasterizza');
  assert.match(r, /ico_\$\{crypto\.randomBytes\(6\)\.toString\('hex'\)\}\.png/, 'in un PNG');
});

test('i flussi aperti hanno un tetto, e si guarda prima di aprire', () => {
  for (const via of ['/overlay/:login/stream', '/tracking/:login/stream']) {
    const r = rotta(via);
    const i = r.indexOf('effects.postoLibero()'), j = r.indexOf("'Content-Type'");
    assert.ok(i > 0 && j > 0 && i < j, `${via}: il tetto si controlla PRIMA di mandare le intestazioni`);
    assert.match(r, /res\.status\(503\)/, `${via}: e oltre il tetto dice 503`);
  }
  const ponte = rotta('/api/streamer/regia/ponte');
  assert.match(ponte, /consolle\.apriPonte\(login, [^,]+, \(\) => \{ try \{ res\.end\(\); \}/, 'chi viene sfrattato dal ponte viene chiuso');
});

test('ogni porta che scrive sul disco del canale guarda prima quanto ne resta', () => {
  const porte = ['/api/streamer/console/icona', '/api/streamer/console/media', '/api/linkpage/immagine', '/api/streamer/font'];
  for (const via of porte) assert.match(rotta(via), /spazioEsaurito\(login\)/, `${via} guarda lo spazio`);
  for (const fn of ['async function salvaEffetto(', 'async function salvaAlertMedia(']) {
    const i = SRV.indexOf(fn);
    assert.ok(i > 0, fn);
    assert.match(SRV.slice(i, i + 1500), /spazioEsaurito\(login\)/, `${fn} guarda lo spazio`);
  }
  assert.match(rotta('/api/streamer/effetti'), /spazio: spazioDi\(login\)/, 'e chi carica sa quanto ne usa');
});
