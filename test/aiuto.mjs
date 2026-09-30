// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
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
// Il testo delle sezioni di manuale che spiegano una scheda: dall'h2 che la
// dichiara fino al prossimo h2. E' quello che il «?» del pannello apre, quindi
// e' li' che una cosa della scheda deve essere spiegata, con le parole che ha
// oggi il manuale e non con una frase copiata nel collaudo.
export function sezioneManuale(manuali, scheda) {
  const pezzi = [];
  for (const m of manuali) {
    let dentro = false;
    for (const b of m.corpo || []) {
      if (b.h2 !== undefined) dentro = b.scheda === scheda;
      if (dentro) pezzi.push(JSON.stringify(b));
    }
  }
  return pezzi.join('\n');
}

export function testoManuali() {
  const rad = new URL('../src/web/', import.meta.url);
  const cartella = new URL('manuali/it/', rad);
  const file = readdirSync(cartella).filter((f) => f.endsWith('.js')).sort();
  return [readFileSync(new URL('manuali.js', rad), 'utf8'), ...file.map((f) => readFileSync(new URL(f, cartella), 'utf8'))].join('\n');
}
