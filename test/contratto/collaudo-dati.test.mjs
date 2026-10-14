// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL COLLAUDO NON SCRIVE NEI DATI VERI.
//
// Sul server prove e cancelli girano nella radice del progetto (aggiorna.sh),
// dove la cartella di serie «./data» e' quella vera. Scrivevano li': a ogni
// aggiornamento rispuntavano nella tabella admin i canali del cancello dello
// scudo di Telegram (prova, proven, spento), e quattordici file di prove
// aprivano lo stesso database. Tre difese, e questa prova le tiene ferme:
//   1. gli script «test» e «cancelli» partono con una cartella usa e getta;
//   2. ogni cancello che usa dati la sceglie PRIMA di qualunque altro import
//      (scripts/_dati-usa-e-getta.mjs), anche quelli che passano da _sito.mjs;
//   3. con SB_COLLAUDO acceso la configurazione rifiuta la cartella vera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RAD = new URL('../../', import.meta.url).pathname;
const PKG = JSON.parse(readFileSync(join(RAD, 'package.json'), 'utf8'));

test('«test» e «cancelli» partono con una cartella dei dati usa e getta e col collaudo acceso', () => {
  for (const s of ['test', 'cancelli']) {
    assert.match(PKG.scripts[s], /^export SB_COLLAUDO=1 DATA_DIR=\$\(mktemp -d -t [a-z]+-XXXXXX\) && /, s);
  }
});

test('ogni cancello che tocca i dati sceglie la sua cartella per prima cosa', () => {
  // gli attrezzi a mano (posta-chiave, simula, marchio) lavorano apposta sui dati veri: qui solo i cancelli
  const cartella = join(RAD, 'scripts');
  const tocca = /DATA_DIR|_sito\.mjs|\.\.\/src\/db\.js/;
  for (const f of readdirSync(cartella).filter((x) => /^(verifica-.*|_sito)\.mjs$/.test(x))) {
    const t = readFileSync(join(cartella, f), 'utf8');
    if (!tocca.test(t) || !/(\bimport\b[^\n]*\.\.\/src\/|_sito\.mjs|DATA_DIR =)/.test(t)) continue;
    const primo = (t.match(/^import [^\n]*$/m) || [''])[0];
    assert.equal(primo, "import './_dati-usa-e-getta.mjs';", `${f}: il primo import deve essere la cartella usa e getta`);
    assert.doesNotMatch(t, /process\.env\.DATA_DIR = process\.env\.DATA_DIR \|\|/, `${f}: niente cartella ereditata`);
  }
});

test('_sito.mjs, aperto senza cartella dei dati, non apre quella di serie', () => {
  const vuota = mkdtempSync(join(tmpdir(), 'collaudo-cwd-'));
  const env = { ...process.env }; delete env.DATA_DIR; delete env.SB_COLLAUDO;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e',
    `await import(${JSON.stringify(join(RAD, 'scripts/_sito.mjs'))}); const { config } = await import(${JSON.stringify(join(RAD, 'src/config.js'))}); console.log(config.dataDir);`],
  { cwd: vuota, env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const dir = r.stdout.trim().split('\n').pop();
  assert.ok(!dir.startsWith(vuota), `cartella dei dati: ${dir}`);
  assert.match(dir, /cancello-/);
});

test('col collaudo acceso la configurazione rifiuta la cartella vera', () => {
  const env = { ...process.env, SB_COLLAUDO: '1' }; delete env.DATA_DIR;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./src/config.js')"], { cwd: RAD, env, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Collaudo sui dati veri/);
  const ok = spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./src/config.js')"], { cwd: RAD, env: { ...env, DATA_DIR: mkdtempSync(join(tmpdir(), 'collaudo-ok-')) }, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
});
