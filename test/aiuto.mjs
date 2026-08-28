// Attrezzi comuni del collaudo: una cartella dati usa-e-getta per ogni file di
// prove, così il database di prova non tocca mai quello vero.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function cartellaUsaEGetta(nome = 'andrybot-test-') {
  const dir = mkdtempSync(join(tmpdir(), nome));
  process.env.DATA_DIR = dir;
  return { dir, pulisci: () => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* */ } } };
}

// Esegue uno script di scripts/ e ritorna { codice, uscita }.
export async function lanciaScript(file, args = []) {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [file, ...args], { encoding: 'utf8' });
  return { codice: r.status, uscita: (r.stdout || '') + (r.stderr || '') };
}
