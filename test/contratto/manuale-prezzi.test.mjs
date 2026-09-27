// I PREZZI DEL MANUALE SONO QUELLI DEL LISTINO. Il manuale dell'account li
// legge da src/web/manuali/numeri.js, che li prende da features/abbonamenti.js:
// scritti a mano, al primo ritocco del listino avrebbero detto un prezzo che
// Stripe non addebita.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAD = fileURLToPath(new URL('../..', import.meta.url));
const SORGENTE = readFileSync(join(RAD, 'src/web/manuali/it/account.js'), 'utf8');

test('il manuale si carica senza .env, da una cartella qualunque', () => {
  const vuota = mkdtempSync(join(tmpdir(), 'andrybot-senza-env-'));
  try {
    assert.ok(!existsSync(join(vuota, '.env')));
    const codice = `const m = await import(${JSON.stringify(join(RAD, 'src/web/manuali.js'))});
      const a = m.MANUALI.find((x) => x.slug === 'account');
      const t = a.corpo.find((b) => b.tabella && b.tabella[0][0] === 'Piano o extra').tabella;
      console.log(JSON.stringify(t.map((r) => [r[0], r[1]])));`;
    const env = { ...process.env };
    delete env.DATA_DIR;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', codice], { cwd: vuota, env, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const righe = JSON.parse(r.stdout.trim().split('\n').pop());
    assert.ok(righe.some(([nome, prezzo]) => nome === 'Base' && /^€\d+,\d\d$/.test(prezzo)), 'il prezzo del Base c\'e\'');
  } finally { rmSync(vuota, { recursive: true, force: true }); }
});

test('ogni prezzo del manuale e\' quello del listino, e nessuno e\' scritto a mano', async () => {
  const { BASE, ADDON, BUNDLE } = await import('../../src/features/abbonamenti.js');
  const { MANUALI } = await import('../../src/web/manuali.js');
  const euro = (n) => '€' + n.toFixed(2).replace('.', ',');
  const a = MANUALI.find((x) => x.slug === 'account');
  const t = a.corpo.find((b) => b.tabella && b.tabella[0][0] === 'Piano o extra').tabella;
  const prezzoDi = (nome) => t.find((r) => r[0] === nome)?.[1];
  assert.equal(prezzoDi('Base'), euro(BASE.prezzo));
  for (const x of ADDON.filter((v) => !v.ritirato && !v.inclusoBase)) {
    assert.equal(prezzoDi(x.nome), euro(x.prezzo), `l'extra «${x.nome}» nel manuale, col suo prezzo`);
  }
  for (const b of BUNDLE.filter((v) => !v.ritirato)) {
    assert.equal(prezzoDi(b.nome), `${euro(b.prezzo)} invece di ${b.prezzoPienoTesto}`, `il pacchetto «${b.nome}»`);
  }
  assert.doesNotMatch(SORGENTE, /€\s?\d/, 'nel manuale un prezzo non si scrive a mano');
});
