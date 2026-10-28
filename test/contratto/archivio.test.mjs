// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ARCHIVIO DEI MEDIA, COME E' CABLATO (docs/ARCHIVIO.md). Le prove di unita'
// provano l'archivio e i media degli effetti; qui si fissa che il server passi
// SEMPRE da li' per i file di un effetto: servirli, farli entrare, liberarli,
// prenderli dalla libreria. Un posto solo, quindi una regola sola.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senzaCommenti = (t) => t.replace(/^\s*\/\/.*$/gm, '');
const SRV = senzaCommenti(readFileSync(join(RAD, 'src/web/server.js'), 'utf8'));
const tratto = (da, quanto) => { const i = SRV.indexOf(da); assert.ok(i >= 0, `manca ${da}`); return SRV.slice(i, i + quanto); };

test('ogni file di un effetto si serve da mediaEffetti, che lo da\' solo al canale che lo usa', () => {
  assert.match(tratto("app.get('/overlay/:login/media/:file'", 900), /if \(eNomeArchivio\(file\)\) \{ mediaEffetti\.servi\(req, res, login, file, \{ maxAge: 60 \}\)/, 'l\'overlay');
  assert.match(tratto("app.get('/u/:user/colpo/anteprima/:voce',", 400), /mediaEffetti\.servi\(req, res, login, file,/, 'l\'anteprima della pagina dei colpi');
  assert.match(tratto("app.get('/u/:user/colpo/anteprima/:voce/suono'", 400), /mediaEffetti\.servi\(req, res, login, file,/);
  assert.match(tratto("app.get('/u/:user/negozio/media/:id'", 400), /mediaEffetti\.servi\(req, res, m\.channel, m\.file,/, 'il negozio');
  assert.match(tratto('const serviLibreria = (colonna) =>', 900), /mediaEffetti\.servi\(req, res, eff\.channel, file,/, 'la libreria');
  assert.ok(!/sendFile\(join\(effectsRoot, (eff|m)\.channel/.test(SRV), 'nessun file di un effetto servito per un\'altra strada');
});

test('un file entra nell\'archivio prima della riga, e un file vecchio se ne va solo se nessuno lo usa', () => {
  const up = tratto("let nomeMedia = '', nomeSuono = '';", 2600);
  assert.ok(up.indexOf('mediaEffetti.entra(join(destDir, esito.file), esito.file)') < up.indexOf('effectsDb.add(login'), 'prima l\'archivio, poi la riga col suo nome');
  assert.match(up, /file: nomeMedia,/);
  assert.match(SRV, /if \(esistente\?\.file && esistente\.file !== nomeMedia\) await mediaEffetti\.libera\(login, esistente\.file\);/);
  assert.match(SRV, /if \(rimosso\?\.file\) await mediaEffetti\.libera\(login, rimosso\.file\);/, 'togliere un effetto');
  assert.match(SRV, /if \(vecchioFile && vecchioFile !== nomeMedia\) await mediaEffetti\.libera\(login, vecchioFile\);/, 'il media di un alert');
  assert.ok(!/pulisciTemp\(join\(effectsRoot, login, rimosso\./.test(SRV));
});

test('prendere dalla libreria non copia: la riga nuova richiama gli stessi file', () => {
  const imp = tratto('async function importaEffetto(res, login, id) {', 2400);
  assert.match(imp, /await mediaEffetti\.migraRiga\(src\);/);
  assert.match(imp, /const nuovoFile = orig\.file, nuovoSuono = orig\.suono_file \|\| '';/);
  assert.ok(!/copyFileSync/.test(imp), 'niente copie');
  assert.match(SRV, /app\.post\('\/api\/streamer\/libreria\/codice', requireLogin,/);
  assert.match(tratto("app.post('/api/streamer/libreria/codice'", 800), /const e = effectsDb\.byCodice\(String\(req\.body\?\.codice \|\| ''\), login\);/, 'un codice privato lo trova solo il suo canale');
});

test('lo spazio di un canale conta anche i file dell\'archivio che usa', () => {
  assert.match(SRV, /const spazioUsato = \(login\) => spazioCartella\(join\(effectsRoot, String\(login\)\.toLowerCase\(\)\)\) \+ archivioDb\.byteDi\(login\);/);
  assert.match(SRV, /const archivioMedia = creaArchivio\(\{ cartella: join\(config\.dataDir, 'archivio'\), chiudiChiave, apriChiave, impronta: \(sha\) => segno\('archivio', sha\)\.toString\('hex'\) \}\);/, 'cifrato con le maestre del server');
});

test('la firma: le porte pubbliche firmano gli effetti privati, l\'overlay e la libreria no', () => {
  assert.match(tratto("app.get('/u/:user/colpo/anteprima/:voce',", 500), /mediaEffetti\.servi\(req, res, login, file, \{ maxAge: 300, firmato: firmaDi\(login\) \}\)/, 'l\'anteprima della pagina dei colpi');
  assert.match(tratto("app.get('/u/:user/colpo/anteprima/:voce/suono'", 500), /firmato: firmaDi\(login\)/, 'e il suo suono');
  assert.match(tratto("app.get('/u/:user/negozio/media/:id'", 400), /firmato: firmaDi\(m\.channel\)/, 'il negozio');
  assert.ok(!/firmato/.test(tratto("app.get('/overlay/:login/media/:file'", 900)), 'in diretta l\'effetto resta pulito');
  assert.ok(!/firmato/.test(tratto('const serviLibreria = (colonna) =>', 900)), 'la libreria la vede il proprietario, o e\' condivisa');
  assert.match(SRV, /const firmaDi = \(login\) => testoFirma\(streamers\.get\(login\)\?\.display \|\| login\);/);
});
