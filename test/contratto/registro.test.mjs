// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Il gancio fra il registro e l'osservatorio. È il punto che rende inutile
// ricordarsene: se un modulo scrive un errore, quell'errore È già annotato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeLog } from '../../src/logger.js';
import { osservatorio } from '../../src/osservatorio.js';

test('ogni log.error finisce nell’osservatorio, con la sua area', () => {
  osservatorio.azzera();
  const vero = console.error;
  console.error = () => {};
  try {
    makeLog('alerts').error('overlay non raggiungibile');
    makeLog('telegram').error('webhook', new Error('502 dal server'));
  } finally { console.error = vero; }

  const r = osservatorio.riepilogo();
  assert.equal(r.totale, 2);
  assert.ok(r.aree.some((a) => a.area === 'alerts'));
  const tg = r.aree.find((a) => a.area === 'telegram');
  assert.match(tg.ultimoTesto, /502 dal server/, "il messaggio dell'Error viene letto, non «[object Object]»");
});

test('info e warn non sporcano il registro degli errori', () => {
  osservatorio.azzera();
  const vLog = console.log;
  console.log = () => {};
  try { makeLog('bot').info('tutto bene'); makeLog('bot').warn('attenzione'); } finally { console.log = vLog; }
  assert.equal(osservatorio.riepilogo().totale, 0);
});

test('un oggetto non serializzabile non fa cadere il bot', () => {
  osservatorio.azzera();
  const ciclico = {}; ciclico.se = ciclico;
  const vero = console.error;
  console.error = () => {};
  try { assert.doesNotThrow(() => makeLog('web').error('rotto', ciclico)); } finally { console.error = vero; }
  assert.equal(osservatorio.riepilogo().totale, 1);
});

// ── Sotto il collaudo ───────────────────────────────────────────────────────
// Le prove provocano apposta rifiuti ed errori, e centinaia di righe WARN in
// mezzo agli esiti nascondevano proprio quella che contava. Sotto il corridore
// delle prove il registro non si stampa; e una riga scritta dopo che la prova
// ha tolto la sua cartella e' lavoro rimasto acceso, e fa rosso il file.
// Ogni caso gira in un processo suo, con l'ambiente scritto qui: il risultato
// non dipende da come si lancia questo file.
const URL_DI = (p) => JSON.stringify(new URL(p, import.meta.url).href);
function sonda(passi, extra = {}) {
  const dove = mkdtempSync(join(tmpdir(), 'registro-sonda-'));
  try {
    const env = { ...process.env, ...extra };
    for (const k of ['NODE_TEST_CONTEXT', 'LOG_COLLAUDO']) if (!(k in extra)) delete env[k];
    const codice = `const { cartellaUsaEGetta } = await import(${URL_DI('../aiuto.mjs')});
      const casa = cartellaUsaEGetta('registro-casa-');
      const { makeLog, righeDelCollaudo } = await import(${URL_DI('../../src/logger.js')});
      const log = makeLog('scudo');
      ${passi}`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', codice], { cwd: dove, env, encoding: 'utf8' });
    return { stato: r.status, fuori: r.stdout, errori: r.stderr };
  } finally { rmSync(dove, { recursive: true, force: true }); }
}
const COLLAUDO = { NODE_TEST_CONTEXT: 'child-v8' };

test('sotto il collaudo il registro non si stampa, ma resta da leggere', () => {
  const r = sonda(`log.warn('provocato apposta'); log.error('anche questo'); casa.pulisci(); process.stdout.write('RIGHE=' + righeDelCollaudo().join('|'));`, COLLAUDO);
  assert.equal(r.stato, 0, r.errori);
  assert.equal(r.errori, '', 'in console restano solo gli esiti');
  assert.match(r.fuori, /^RIGHE=\[[^\]]+\] WARN  \[scudo\] provocato apposta\|\[[^\]]+\] ERROR \[scudo\] anche questo$/);
});

test('fuori dal collaudo, o con LOG_COLLAUDO=1, il registro si stampa come sempre', () => {
  assert.match(sonda(`log.warn('a mano'); casa.pulisci();`).fuori, /WARN  \[scudo\]\s+a mano/, 'il server scrive il suo registro');
  assert.match(sonda(`log.warn('voglio vederle'); casa.pulisci();`, { ...COLLAUDO, LOG_COLLAUDO: '1' }).fuori, /WARN  \[scudo\]\s+voglio vederle/);
});

test('una riga dopo che la prova ha tolto la sua cartella fa rosso il file', () => {
  const r = sonda(`casa.pulisci(); log.warn('registro non salvato su disco: ENOENT');`, COLLAUDO);
  assert.equal(r.stato, 1, 'lavoro rimasto acceso oltre la prova');
  assert.match(r.errori, /Riga scritta dopo che la prova ha tolto la sua cartella \(.*registro-casa-.*\): c'e' lavoro rimasto acceso\./);
  assert.match(r.errori, /ENOENT/, 'e dice quale');
  const nuova = sonda(`casa.pulisci(); const altra = cartellaUsaEGetta('registro-altra-'); log.warn('di nuovo al lavoro'); altra.pulisci();`, COLLAUDO);
  assert.equal(nuova.stato, 0, 'una cartella nuova riapre i lavori');
});

test('una prova rossa racconta le sue ultime righe', () => {
  const r = sonda(`log.warn('quello che e\\' successo prima'); casa.pulisci(); process.exitCode = 1;`, COLLAUDO);
  assert.equal(r.stato, 1);
  assert.match(r.errori, /Ultime righe del registro di questa prova:\n.*WARN  \[scudo\] quello che e' successo prima/);
});
