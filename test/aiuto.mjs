// Attrezzi comuni del collaudo: una cartella dati usa-e-getta per ogni file di
// prove, così il database di prova non tocca mai quello vero.
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
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

// Il testo di tutti i manuali in italiano, per le prove che vogliono sapere se
// «il manuale lo dice». I manuali stanno uno per file (src/web/manuali/it/):
// leggere solo manuali.js voleva dire leggere l'indice, non i manuali.
export function testoManuali() {
  const rad = new URL('../src/web/', import.meta.url);
  const cartella = new URL('manuali/it/', rad);
  const file = readdirSync(cartella).filter((f) => f.endsWith('.js')).sort();
  return [readFileSync(new URL('manuali.js', rad), 'utf8'), ...file.map((f) => readFileSync(new URL(f, cartella), 'utf8'))].join('\n');
}
