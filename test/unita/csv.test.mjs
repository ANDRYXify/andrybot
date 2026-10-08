// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// UNA CELLA DI CSV (src/features/csv.js). I file che si scaricano contengono
// testo scritto da altri: un nome o un messaggio che comincia con un segno di
// formula non deve diventare un comando aprendo il file. Le donazioni non lo
// disinnescavano: la regola adesso e' in un posto solo, e le prove qui sotto
// pretendono che ogni CSV passi da li'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cellaCsv, rigaCsv } from '../../src/features/csv.js';

test('una cella che comincia con un segno di formula si disinnesca', () => {
  for (const s of ['=HYPERLINK("http://x","clic")', '+1+1', '-2+3', '@SUM(A1)', '\t=1', '\r=1']) {
    assert.ok(cellaCsv(s).replace(/^"/, '').startsWith("'"), `disinnescata: ${JSON.stringify(s)}`);
  }
  assert.equal(cellaCsv('andrea'), 'andrea', 'il resto resta com\'e\'');
  assert.equal(cellaCsv(''), '');
  assert.equal(cellaCsv(null), '');
  assert.equal(cellaCsv(12), '12');
});

test('fra virgolette solo quando serve, e le virgolette dentro raddoppiate', () => {
  assert.equal(cellaCsv('a,b'), '"a,b"');
  assert.equal(cellaCsv('a;b'), '"a;b"');
  assert.equal(cellaCsv('di "noi"'), '"di ""noi"""');
  assert.equal(cellaCsv('due\nrighe'), '"due\nrighe"');
  assert.equal(cellaCsv('=a,b'), '"\'=a,b"', 'disinnescata e fra virgolette');
  assert.equal(rigaCsv(['a', '=b', 'c;d'], ';'), "a;'=b;\"c;d\"");
});

test('ogni CSV del server passa dalla cella che disinnesca', () => {
  const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  const i = SRV.indexOf("app.get('/api/donazioni/esporta.csv'");
  const don = SRV.slice(i, SRV.indexOf('}));', i));
  assert.match(don, /righe\.push\(rigaCsv\(\[new Date\(r\.pagata_at\)\.toISOString\(\), r\.fonte, r\.nome, /, 'il nome e il messaggio di chi dona passano dalla cella');
  assert.doesNotMatch(don, /const cella = /, 'nessuna cella scritta a mano');
  const RA = readFileSync(new URL('../../src/features/rapporto-attacco.js', import.meta.url), 'utf8');
  assert.match(RA, /\.map\(cellaCsv\)\.join\(','\)/);
  assert.doesNotMatch(RA, /const cella = /);
});
