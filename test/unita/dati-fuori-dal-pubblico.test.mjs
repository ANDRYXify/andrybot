// I DATI NON STANNO MAI NELLA CARTELLA PUBBLICA DEL SITO.
//
// Il caso vero: uno script lanciato da dentro src/web/public, senza DATA_DIR.
// La cartella dati di default si calcola da dove si parte, quindi e' nata li'
// dentro, database compreso, e quella cartella il server la serve a chiunque:
// /data/andrybot.db si sarebbe scaricato con un indirizzo. Due chiusure:
//  · config rifiuta di partire con i dati dentro il pubblico, prima di creare
//    qualunque cosa;
//  · il server non serve mai un file di database, ovunque sia finito.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = fileURLToPath(new URL('../../', import.meta.url));
const PUBBLICO = join(RADICE, 'src', 'web', 'public');
const CONFIG = join(RADICE, 'src', 'config.js');

const parti = (cwd, env) => spawnSync(process.execPath, ['-e', `import(${JSON.stringify('file://' + CONFIG)}).then(() => console.log('PARTITO'))`],
  { cwd, env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });

test('partendo dalla cartella pubblica senza DATA_DIR, config si rifiuta e non crea niente', () => {
  const dati = join(PUBBLICO, 'data');
  assert.equal(existsSync(dati), false, 'prima della prova non c\'e\'');
  try {
    const r = parti(PUBBLICO, {});
    assert.notEqual(r.status, 0);
    assert.doesNotMatch(r.stdout, /PARTITO/);
    assert.match(r.stderr, /dentro quella pubblica del sito/);
    assert.equal(existsSync(dati), false, 'e la cartella non e\' nata');
  } finally { if (existsSync(dati)) rmSync(dati, { recursive: true, force: true }); }
});

test('anche un DATA_DIR scritto apposta dentro il pubblico si rifiuta', () => {
  const dati = join(PUBBLICO, 'qualcosa');
  assert.equal(existsSync(dati), false, 'prima della prova non c\'e\'');
  try {
    const r = parti(RADICE, { DATA_DIR: dati });
    assert.notEqual(r.status, 0);
    assert.equal(existsSync(dati), false);
  } finally { if (existsSync(dati)) rmSync(dati, { recursive: true, force: true }); }
});

test('fuori dal pubblico si parte come sempre', () => {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-dati-'));
  try {
    const r = parti(RADICE, { DATA_DIR: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /PARTITO/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('il server non serve mai un file di database, anche se c\'e\'', async () => {
  const { default: express } = await import('express');
  const { montaStatici } = await import('../../src/web/impronte.js');
  const pub = mkdtempSync(join(tmpdir(), 'andrybot-pub-'));
  const VIE = ['/data/andrybot.db', '/andrybot.db-wal', '/x.db-shm', '/a.sqlite', '/a.sqlite3', '/A.DB'];
  mkdirSync(join(pub, 'data'));
  for (const v of VIE) writeFileSync(join(pub, v), 'segreto');
  writeFileSync(join(pub, 'app.js'), 'ok');
  const app = express();
  montaStatici(app, pub);
  const srv = await new Promise((ok) => { const s = app.listen(0, '127.0.0.1', () => ok(s)); });
  try {
    const base = `http://127.0.0.1:${srv.address().port}`;
    for (const via of VIE) assert.equal((await fetch(base + via)).status, 404, via);
    assert.equal((await fetch(base + '/app.js')).status, 200, 'il resto si serve come prima');
  } finally { srv.close(); rmSync(pub, { recursive: true, force: true }); }
});
