// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA MISURA DEL SERVER VERO (src/misura.js): conti giusti, nessun percorso della
// macchina e nessun dato fuori, una misura alla volta, solo per l'amministratore.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { areaDi, riassumiProfilo, misura } from '../../src/misura.js';

const R = '/app/';
const nodo = (id, functionName, url = '', lineNumber = 0) => ({ id, callFrame: { functionName, url, lineNumber } });

test('il posto di una funzione si dice senza i percorsi della macchina', () => {
  assert.equal(areaDi('file:///app/src/bot.js', R), 'src/bot.js');
  assert.equal(areaDi('/app/src/web/server.js', R), 'src/web/server.js');
  assert.equal(areaDi('file:///app/node_modules/better-sqlite3/lib/x.js', R), 'node_modules/better-sqlite3');
  assert.equal(areaDi('file:///app/node_modules/@resvg/resvg-js/index.js', R), 'node_modules/@resvg/resvg-js');
  assert.equal(areaDi('node:internal/timers', R), 'node');
  assert.equal(areaDi('/home/qualcuno/segreto.js', R), '(altro)');
  assert.equal(areaDi('', R), '(nativo)');
});

test('il tempo proprio si somma per file e per funzione, e le categorie tornano', () => {
  const profilo = {
    nodes: [nodo(1, '(root)'), nodo(2, '(idle)'), nodo(3, '(garbage collector)'), nodo(4, 'giro', 'file:///app/src/bot.js', 9), nodo(5, 'servi', 'file:///app/src/web/server.js', 41), nodo(6, 'prepare', 'file:///app/node_modules/better-sqlite3/lib/a.js', 0)],
    samples: [2, 2, 4, 4, 4, 5, 6, 3],
    timeDeltas: [5000, 5000, 1000, 1000, 1000, 2000, 500, 500],
  };
  const r = riassumiProfilo(profilo, { radice: R });
  assert.equal(r.totaleMs, 16);
  assert.deepEqual(r.categorie.inattivo, { ms: 10, quota: 62.5 });
  assert.equal(r.categorie.memoria.ms, 0.5);
  assert.equal(r.categorie.codice.ms, 5.5);
  assert.deepEqual(r.perArea.map((a) => [a.area, a.ms]), [['src/bot.js', 3], ['src/web/server.js', 2], ['node_modules/better-sqlite3', 0.5]]);
  assert.deepEqual(r.perFunzione[0], { funzione: 'giro', area: 'src/bot.js', riga: 10, ms: 3, quota: 18.8 });
  assert.ok(!JSON.stringify(r).includes('/app/'), 'nessun percorso della macchina nel rapporto');
});

test('una misura alla volta', async () => {
  const prima = misura({ secondi: 10 });
  await assert.rejects(misura({ secondi: 10 }), (e) => e.inCorso === true);
  const r = await prima;
  assert.equal(r.secondi, 10);
  assert.ok(r.profilo.totaleMs > 5000, `profilo di ${r.profilo.totaleMs} ms`);
  assert.ok(r.ciclo.max >= r.ciclo.p99 && r.ciclo.p99 >= r.ciclo.p50);
  const dopo = misura({ secondi: 10 });
  assert.ok(dopo instanceof Promise, 'finita la prima, la porta si riapre');
  await dopo;
});

test('la misura la chiede solo l\'amministratore', () => {
  const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  assert.match(SRV, /app\.post\('\/api\/admin\/misura', requireAdmin, /);
  assert.doesNotMatch(readFileSync(new URL('../../src/misura.js', import.meta.url), 'utf8'), /HeapProfiler|takeHeapSnapshot|writeHeapSnapshot/, 'niente fotografie della memoria: dentro ci sono i dati delle persone');
});
