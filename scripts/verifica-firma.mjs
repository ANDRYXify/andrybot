// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LA FIRMA IN OGNI FILE.
//
// Il repository e' pubblico: il codice del server, le prove, gli script e i
// documenti si leggono quanto le pagine servite al browser, e ognuno porta la
// firma di proprieta' in cima, nella forma del suo tipo. Non e' una cosa da
// ricordarsi: questo cancello legge tutti i file del repository e boccia quello
// che non la porta, cosi' un file nuovo non nasce senza.
//
// Fuori, per scelta: i testi di licenza di altri (i caratteri tipografici), che
// firmarli sarebbe falso; robots.txt e security.txt, che hanno un formato fisso
// letto da macchine; i file che non sono testo.
//
//   node scripts/verifica-firma.mjs            controlla
//   node scripts/verifica-firma.mjs --scrivi   mette la firma dove manca
//   node scripts/verifica-firma.mjs --selftest rompe un file finto e guarda che se ne accorga
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIRMA = 'ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live';
const COPY = '© 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live';
const RIGHE_SU = 6;

const FUORI = [
  /^src\/web\/public\/vendor\//,
  /(^|\/)OFL-[^/]+\.txt$/,
  /(^|\/)LICENSE(\.txt)?$/,
  /^src\/web\/public\/robots\.txt$/,
  /^src\/web\/public\/well-known\/security\.txt$/,
];

// Come si scrive la firma per ogni tipo, e cosa deve restare prima di lei.
const serviti = (f) => f.startsWith('src/web/public/');
function forma(f) {
  if (/\.(js|mjs|cjs)$/.test(f) || /\.js\.txt$/.test(f)) {
    return serviti(f)
      ? { righe: [`// ${COPY}`, `// Proprieta intellettuale · ${FIRMA}`], prima: /^#!/ }
      : { righe: [`// ${COPY}`, `// Proprietà intellettuale · ${FIRMA}`], prima: /^#!/ };
  }
  if (/\.css$/.test(f)) return { righe: [`/* ${COPY} */`, `/* Proprieta intellettuale · ${FIRMA} */`], prima: /^@charset/ };
  if (/\.md$/.test(f)) return { righe: [`<!-- ${COPY} -->`, `<!-- Proprietà intellettuale · ${FIRMA} -->`], prima: /^---$/ };
  if (/\.html$/.test(f)) return { righe: [`<!-- ${COPY} -->`, `<!-- Proprietà intellettuale · ${FIRMA} -->`], prima: /^<!doctype/i };
  if (/\.(sh|py|yml|yaml)$/.test(f)) return { righe: [`# ${COPY}`, `# Proprietà intellettuale · ${FIRMA}`], prima: /^#!|^#\s*-\*-/ };
  if (/\.sql$/.test(f)) return { righe: [`-- ${COPY}`, `-- Proprietà intellettuale · ${FIRMA}`], prima: null };
  if (/\.txt$/.test(f)) return { righe: [`# ${COPY}`, `# Proprietà intellettuale · ${FIRMA}`], prima: null };
  return null;
}

export function daFirmare(elenco) {
  return elenco.filter((f) => forma(f) && !FUORI.some((re) => re.test(f)));
}

export function firmato(testo) {
  const su = testo.split('\n').slice(0, RIGHE_SU).join('\n');
  return su.includes(FIRMA) && su.includes('Andrea Taliento');
}

export function conFirma(f, testo) {
  const { righe, prima } = forma(f);
  const r = testo.split('\n');
  const dopo = prima && r.length && prima.test(r[0]) ? 1 : 0;
  return [...r.slice(0, dopo), ...righe, ...r.slice(dopo)].join('\n');
}

export function controlla(elenco, leggi) {
  return daFirmare(elenco).filter((f) => {
    let t;
    try { t = leggi(f); } catch { return false; }
    return !firmato(t);
  });
}

const tutti = () => execFileSync('git', ['ls-files'], { cwd: RAD, encoding: 'utf8' }).split('\n').filter(Boolean);
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

if (process.argv.includes('--selftest')) {
  const finti = { 'src/nuovo.js': 'export const a = 1;\n', 'docs/NUOVO.md': '# Nuovo\n', 'server/x.sh': '#!/bin/sh\necho ciao\n', 'scripts/campioni/verde.avif': 'x' };
  const mancano = controlla(Object.keys(finti), (f) => finti[f]);
  const giusti = ['src/nuovo.js', 'docs/NUOVO.md', 'server/x.sh'];
  const visti = JSON.stringify(mancano) === JSON.stringify(giusti);
  const rifatti = giusti.every((f) => firmato(conFirma(f, finti[f])));
  const shebang = conFirma('server/x.sh', finti['server/x.sh']).startsWith('#!/bin/sh\n# ©');
  const licenza = !daFirmare(['assets/font/OFL-Anton.txt', 'src/web/public/vendor/x.js', 'src/web/public/robots.txt']).length;
  for (const [ok, cosa] of [[visti, 'vede i file senza firma, e solo quelli di testo'], [rifatti, 'la firma messa si riconosce'], [shebang, 'la prima riga #! resta la prima'], [licenza, 'le licenze di altri e i formati fissi restano fuori']]) {
    console.log(`  ${ok ? '✓' : '✗'} ${cosa}`);
  }
  const buono = visti && rifatti && shebang && licenza;
  console.log(buono ? '\nIl cancello della firma vede quello che deve. ✓\n' : '\ncancello della firma ROSSO ✗\n');
  process.exit(buono ? 0 : 1);
}

const elenco = tutti();
const mancano = controlla(elenco, leggi);
if (process.argv.includes('--scrivi')) {
  for (const f of mancano) writeFileSync(join(RAD, f), conFirma(f, leggi(f)));
  console.log(`Firma messa in ${mancano.length} file.`);
  process.exit(0);
}
const quanti = daFirmare(elenco).length;
console.log(`  ${mancano.length ? '✗' : '✓'} ogni file del repository porta la firma in cima (${quanti - mancano.length} su ${quanti})${mancano.length ? `  → ${mancano.slice(0, 15).join(', ')}${mancano.length > 15 ? ` e altri ${mancano.length - 15}` : ''}` : ''}`);
console.log(mancano.length ? '\ncancello della firma ROSSO ✗ (node scripts/verifica-firma.mjs --scrivi la mette)\n' : '\nOgni file e\' firmato. ✓\n');
process.exit(mancano.length ? 1 : 0);
