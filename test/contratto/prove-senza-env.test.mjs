// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LE PROVE NON LEGGONO IL .env DEL SERVER.
//
// Sul server il collaudo gira nella cartella dove sta il .env vero. Una prova
// che ne leggesse i segreti misurerebbe il server invece del codice: col bot
// Discord della casa configurato, una prova verde ovunque e' diventata rossa
// solo li', e l'aggiornamento si e' fermato. Qui si mette un .env finto in una
// cartella e si guarda: lanciato dal corridore delle prove non si legge, a
// mano (come fa il server quando parte) si'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CONFIG = fileURLToPath(new URL('../../src/config.js', import.meta.url));

test('il .env della cartella si legge quando parte il server, non quando girano le prove', () => {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-envfinto-'));
  try {
    writeFileSync(join(dir, '.env'), 'DISCORD_BOT_TOKEN=token-finto-della-cartella\n');
    const sonda = `const { config } = await import(${JSON.stringify('file://' + CONFIG)}); console.log('TOKEN=' + config.discordApp.botToken);`;
    const lancia = (extra) => {
      const env = { ...process.env, ...extra };
      delete env.DISCORD_BOT_TOKEN;
      if (!('NODE_TEST_CONTEXT' in extra)) delete env.NODE_TEST_CONTEXT;
      const r = spawnSync(process.execPath, ['--input-type=module', '-e', sonda], { cwd: dir, env, encoding: 'utf8' });
      return (r.stdout.match(/TOKEN=(.*)/) || [])[1];
    };
    assert.equal(lancia({}), 'token-finto-della-cartella', 'il server che parte legge il suo .env');
    assert.equal(lancia({ NODE_TEST_CONTEXT: 'child-v8' }), '', 'una prova no');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
