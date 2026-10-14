// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO SCUDO DELLE RISORSE (docs/RISORSE.md): il pesante non si accumula, non entra
// col server in rosso, rende sempre il permesso, e nasce a priorita' bassa.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { creaRisorse, livelloDi, CALMA_MS, NICE_PESANTE, risorse } from '../../src/risorse.js';
import { comprimi } from '../../src/features/compress.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const calma = { ritardoMs: 0, cpuPsi: 0, memPsi: 0, memLibera: 0.9, caricoPerCore: 0 };
const CLASSI = {
  media: { tetto: { verde: 2, giallo: 1, rosso: 0 }, aTesta: 1, coda: 2, attesaMs: 5_000 },
  fondo: { tetto: { verde: 1, giallo: 0, rosso: 0 }, aTesta: 1, coda: 0, attesaMs: 0 },
  lungo: { tetto: { verde: Infinity, giallo: 0, rosso: 0 }, aTesta: 1, coda: 0, attesaMs: 0, cede: true },
};
function banco(misura = { ...calma }) {
  let t = 1_000_000;
  const m = { ...misura };
  const r = creaRisorse({ misura: () => m, ora: () => t, cacheMs: 0, classi: CLASSI });
  return { r, m, avanti: (ms) => { t += ms; } };
}
const rifiuto = (motivo) => (e) => e?.occupato === true && e.motivo === motivo;

test('il livello e\' quello del segnale peggiore, e la memoria libera conta al contrario', () => {
  assert.equal(livelloDi(calma), 'verde');
  assert.equal(livelloDi({ ...calma, ritardoMs: 120 }), 'giallo');
  assert.equal(livelloDi({ ...calma, ritardoMs: 300 }), 'rosso');
  assert.equal(livelloDi({ ...calma, cpuPsi: 85 }), 'rosso');
  assert.equal(livelloDi({ ...calma, memPsi: 12 }), 'giallo');
  assert.equal(livelloDi({ ...calma, memLibera: 0.10 }), 'giallo');
  assert.equal(livelloDi({ ...calma, memLibera: 0.05 }), 'rosso');
  assert.equal(livelloDi({ ...calma, caricoPerCore: 5 }), 'verde', 'con la pressione leggibile il carico non decide');
  assert.equal(livelloDi({ ...calma, cpuPsi: null, caricoPerCore: 5 }), 'rosso', 'senza pressione decide il carico');
});

test('si sale subito, si scende di un gradino solo dopo la calma', () => {
  const { r, m, avanti } = banco();
  m.ritardoMs = 400;
  assert.equal(r.livello(), 'rosso');
  m.ritardoMs = 0;
  assert.equal(r.livello(), 'rosso', 'il primo campione calmo fa partire la calma');
  avanti(CALMA_MS - 1);
  assert.equal(r.livello(), 'rosso', 'prima della calma non si scende');
  avanti(1);
  assert.equal(r.livello(), 'giallo', 'un gradino alla volta');
  avanti(CALMA_MS);
  assert.equal(r.livello(), 'verde');
  m.cpuPsi = 60;
  assert.equal(r.livello(), 'giallo', 'e risale subito');
});

test('uno a testa: chi ha gia\' un lavoro in corso o in fila torna indietro subito', async () => {
  const { r } = banco();
  const esci = await r.entra('media', 'mario');
  await assert.rejects(r.entra('media', 'mario'), rifiuto('tuo'));
  const altro = await r.entra('media', 'luigi');
  const inFila = r.entra('media', 'anna');
  await assert.rejects(r.entra('media', 'anna'), rifiuto('tuo'), 'anche in fila conta');
  esci();
  altro();
  (await inFila)();
  assert.equal(r.stato().classi.media.inCorso, 0);
  assert.equal(r.stato().classi.media.rifiutati.tuo, 2);
});

test('il tetto dipende dal livello, e in rosso il pesante nuovo non entra', async () => {
  const { r, m } = banco();
  m.ritardoMs = 120;
  const a = await r.entra('media', 'a');
  const inFila = r.entra('media', 'b');
  let entrato = false;
  inFila.then(() => { entrato = true; });
  await new Promise((ok) => setImmediate(ok));
  assert.equal(entrato, false, 'in giallo ne gira uno solo');
  a();
  (await inFila)();
  m.ritardoMs = 400;
  const c = r.entra('media', 'c');
  c.catch(() => {});
  assert.equal(r.stato().classi.media.inFila, 0, 'in rosso il pesante non fa nemmeno la fila');
  await assert.rejects(c, rifiuto('carico'));
  assert.equal(r.prova('fondo', 'c'), null, 'il lavoro di fondo si salta');
});

test('la fila e\' corta e ha un\'attesa massima: oltre, il rifiuto e\' detto', async () => {
  mock.timers.enable({ apis: ['setInterval'] });
  try {
    const { r, avanti } = banco();
    const a = await r.entra('media', 'a');
    const b = await r.entra('media', 'b');
    const c = r.entra('media', 'c');
    const d = r.entra('media', 'd');
    await assert.rejects(r.entra('media', 'e'), rifiuto('coda'), 'fila piena');
    avanti(5_001);
    mock.timers.tick(1_000);
    await assert.rejects(c, rifiuto('coda'));
    await assert.rejects(d, rifiuto('coda'));
    const st = r.stato().classi.media;
    assert.equal(st.inFila, 0);
    a(); b();
    (await r.entra('media', 'c'))();
    assert.equal(r.stato().classi.media.inCorso, 0, 'chi e\' uscito dalla fila per tempo non resta contato a testa');
  } finally { mock.timers.reset(); }
});

test('il permesso si rende sempre, e una volta sola', async () => {
  const { r } = banco();
  await assert.rejects(r.con('fondo', 'x', async () => { throw new Error('rotto'); }), /rotto/);
  assert.equal(r.stato().classi.fondo.inCorso, 0, 'anche se il lavoro si rompe');
  const esci = r.prova('fondo', 'x');
  esci(); esci();
  assert.equal(r.stato().classi.fondo.inCorso, 0);
  assert.ok(r.prova('fondo', 'y'), 'dopo un doppio rendi il posto c\'e\' una volta sola, non due');
  assert.equal(r.prova('fondo', 'z'), null);
});

test('il lungo cede in rosso; il nuovo entra solo in verde', () => {
  const { r, m } = banco();
  assert.equal(r.puoIniziare('lungo'), true);
  assert.equal(r.deveCedere('lungo'), false);
  m.memLibera = 0.10;
  assert.equal(r.puoIniziare('lungo'), false);
  assert.equal(r.deveCedere('lungo'), false, 'in giallo chi gira resta');
  m.memLibera = 0.05;
  assert.equal(r.deveCedere('lungo'), true);
  assert.equal(r.deveCedere('fondo'), false, 'chi non sa cedere non si ferma a meta\'');
});

test('ogni processo nasce dalla porta a priorita\' bassa', () => {
  const abbassati = [];
  const r = creaRisorse({ misura: () => calma, avviaProcesso: () => ({ pid: 4242 }), abbassa: (pid) => abbassati.push(pid) });
  assert.equal(r.avvia('ffmpeg', []).pid, 4242);
  assert.deepEqual(abbassati, [4242]);
  const r2 = creaRisorse({ misura: () => calma, avviaProcesso: () => ({ pid: 7 }), abbassa: () => { throw new Error('gia\' uscito'); } });
  assert.equal(r2.avvia('ffmpeg', []).pid, 7, 'un processo gia\' uscito non rompe chi lo avvia');
  assert.equal(NICE_PESANTE > 0, true);
});

test('una compressione rifiutata cancella il temporaneo come una fatta', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'porta-'));
  const tmp = join(dir, 'caricato.bin');
  writeFileSync(tmp, 'x');
  const esci = await risorse.entra('media', 'chi-carica');
  try {
    await assert.rejects(comprimi(tmp, 'image/png', dir, 'id', { chi: 'chi-carica' }), rifiuto('tuo'));
    assert.equal(existsSync(tmp), false);
  } finally { esci(); }
});

test('i processi nascono solo dalla porta, e ogni caricamento dice chi lo fa', () => {
  const file = (d) => readdirSync(join(RAD, d), { withFileTypes: true }).flatMap((f) => f.isDirectory() ? (f.name === 'public' ? [] : file(join(d, f.name))) : f.name.endsWith('.js') ? [join(d, f.name)] : []);
  const conProcessi = file('src').filter((f) => /from 'node:child_process'/.test(readFileSync(join(RAD, f), 'utf8')));
  assert.deepEqual(conProcessi, ['src/risorse.js']);
  const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
  const chiamate = [...SRV.matchAll(/await (comprimi|convertiPerEmote|svgInPng|alleggerisci|donaMedia\.salva)\(([^\n]*)/g)];
  assert.ok(chiamate.length >= 8, `chiamate trovate: ${chiamate.length}`);
  for (const [, nome, resto] of chiamate) assert.match(resto, /chi: /, `${nome}(${resto.slice(0, 60)}…) non dice chi carica`);
});

test('il vitale non passa dalla porta', () => {
  for (const f of ['src/features/effects.js', 'src/features/alerts.js', 'src/features/storia-ig.js', 'src/features/handler.js', 'src/features/antibot.js']) {
    assert.doesNotMatch(readFileSync(join(RAD, f), 'utf8'), /risorse\.js/, f);
  }
});
