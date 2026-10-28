// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE DESTINAZIONI DELLA DIRETTA, COME SONO CABLATE (docs/DIRETTA.md, «Partire
// senza sorprese»). Il modulo e il tramite li prova
// test/unita/diretta-destinazioni.test.mjs; qui si fissa che il server li usi:
//  · una destinazione scritta a mano passa da leggiIndirizzo e da
//    controllaIndirizzo quando si salva, e di nuovo quando si parte;
//  · «Prova» e' dello streamer (proprietario, nella beta), col suo passo, e
//    usa provaRtmp (che controlla l'indirizzo da se');
//  · lo Studio sa cosa sa fare il tramite (server: capacita), e i rifiuti per
//    RTMPS o per un ffmpeg monco dicono quale e cosa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
const rotta = (inizio) => { const i = SRV.indexOf(inizio); assert.ok(i > 0, inizio); return SRV.slice(i, SRV.indexOf('\n  }));', i)); };

test('salvare una destinazione: si divide, e solo se e\' pubblica', () => {
  const h = rotta("app.post('/api/diretta/destinazioni', requireOwner, studioAperto,");
  assert.match(h, /const ind = leggiIndirizzo\(/);
  assert.match(h, /const pubblico = await controllaIndirizzo\(`\$\{server\}\/\$\{chiave\}`\);\n\s*if \(!pubblico\.ok\) return res\.status\(400\)/);
  assert.ok(h.indexOf('controllaIndirizzo') < h.indexOf('direttaDest.salva'), 'prima del salvataggio');
});

test('partire: ogni destinazione scritta a mano si controlla di nuovo, adesso', () => {
  const h = rotta("app.post('/api/diretta/avvio', requireOwner, studioAperto,");
  const altro = h.slice(h.indexOf("const d = direttaDest.conChiave(login, id);"));
  assert.ok(altro.indexOf('await controllaIndirizzo(') > 0 && altro.indexOf('await controllaIndirizzo(') < altro.indexOf('destinazioni.push('), 'prima di metterla fra quelle che partono');
  assert.match(h, /r\.motivo === 'rtmps' && r\.quali\?\.length/);
  assert.match(h, /r\.motivo === 'ffmpeg' && r\.manca\?\.length/);
});

test('«Prova»: dello streamer, a passo lento, con la stretta di mano che controlla da se\'', () => {
  const h = rotta("app.post('/api/diretta/destinazioni/:id/prova', requireOwner, studioAperto,");
  assert.match(h, /Date\.now\(\) - \(proveDiretta\.get\(login\) \|\| 0\) < 3000/);
  assert.match(h, /res\.json\(await provaRtmp\(url\)\)/);
  assert.match(SRV, /server: tramite\.capacita\(\),/, 'lo Studio sa cosa sa fare il tramite');
});
