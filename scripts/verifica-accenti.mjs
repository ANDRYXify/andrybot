// Cancello degli ACCENTI: quello che si legge da fuori è scritto in italiano.
//
// Perché esiste. Le righe delle novità e i manuali finiscono su una pagina
// pubblica e indicizzata, e chi le scrive spesso le scrive in fretta, dentro un
// comando, dove gli accenti sono scomodi. Il risultato è «piu», «gia», «cosi»,
// «puo» — che in italiano non esistono, e che nessuno rilegge perché il senso
// si capisce lo stesso. Si capisce, e si vede.
//
// Non prova a correggere l'italiano: guarda una lista chiusa di parole che
// SENZA accento non esistono proprio, più i due casi in cui la «e» è per forza
// un verbo («non e», «c'e»). Niente di ambiguo: «e» congiunzione, «si», «ne»,
// «da», «li» restano fuori, perché un cancello che dà falsi allarmi si spegne.
//
// Uso: node scripts/verifica-accenti.mjs             (esce 1 se ne trova)
//      node scripts/verifica-accenti.mjs --selftest

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { senzaCommentiJs } from './_codice.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');

// Parole che senza accento non esistono in italiano. Solo quelle sicure.
const PAROLE = {
  piu: 'più', gia: 'già', cosi: 'così', puo: 'può', perche: 'perché', pero: 'però',
  cioe: 'cioè', poiche: 'poiché', finche: 'finché', benche: 'benché', nonche: 'nonché',
  citta: 'città', verita: 'verità', liberta: 'libertà', novita: 'novità', qualita: 'qualità',
  realta: 'realtà', universita: 'università', meta: null, virtu: 'virtù', giu: 'giù',
  avra: 'avrà', potra: 'potrà', dovra: 'dovrà', verra: 'verrà', andra: 'andrà',
  fara: 'farà', dira: 'dirà', restera: 'resterà', servira: 'servirà', bastera: 'basterà',
  perdera: 'perderà', vedra: 'vedrà', sapra: 'saprà', torna: null,
};
const SICURE = Object.entries(PAROLE).filter(([, v]) => v);
const RE_PAROLE = new RegExp(`\\b(${SICURE.map(([k]) => k).join('|')})\\b`, 'g');
// La «e» che è per forza un verbo: «non e» e «c'e» non esistono senza accento.
const RE_VERBO = /\b(non e|c'e)\b/g;

// Dove si guarda: tutto quello che una persona legge da fuori.
const POSTI = [
  ['NOVITA.md', (t) => t.split('\n').filter((r) => r.startsWith('- ')).join('\n')],
  // I commenti si tolgono prima: quello che il programmatore scrive per sé non
  // lo legge nessuno da fuori, e un cancello che dà allarmi su quelli si spegne.
  ['src/web/manuali.js', (t) => (senzaCommentiJs(t).match(/'[^']{25,}'/g) || []).join('\n')],
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  const via = join(RAD, 'NOVITA.md');
  const orig = readFileSync(via, 'utf8');
  let cieche = 0;
  for (const [rotta, che] of [
    ['- Adesso e piu veloce di prima e si vede.', 'una parola senza accento'],
    ["- Adesso non e come prima, e si vede.", 'una «e» che è per forza un verbo'],
  ]) {
    writeFileSync(via, orig.replace('## 2026-09-07\n', '## 2026-09-07\n' + rotta + '\n'));
    let rosso = false;
    try { execFileSync(process.execPath, [io], { cwd: RAD, stdio: 'pipe' }); } catch { rosso = true; }
    writeFileSync(via, orig);
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATA'));
    if (!rosso) cieche++;
  }
  console.log(cieche ? `\n${cieche} rotture non viste.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const trovate = [];
for (const [file, estrai] of POSTI) {
  const testo = estrai(leggi(file));
  for (const riga of testo.split('\n')) {
    for (const m of riga.matchAll(RE_PAROLE)) trovate.push({ file, parola: m[1], giusta: PAROLE[m[1]], riga: riga.trim().slice(0, 90) });
    for (const m of riga.matchAll(RE_VERBO)) trovate.push({ file, parola: m[1], giusta: m[1].replace(/e$/, 'è'), riga: riga.trim().slice(0, 90) });
  }
}

if (!trovate.length) {
  console.log('  ✓ quello che si legge da fuori è scritto in italiano, accenti compresi\n');
  process.exit(0);
}
console.log(`  ✗ ${trovate.length} ${trovate.length === 1 ? 'parola senza accento' : 'parole senza accento'}, e si leggono da fuori:\n`);
for (const t of trovate.slice(0, 25)) console.log(`    ${t.file}: «${t.parola}» → «${t.giusta}»\n      ${t.riga}…`);
console.log('');
process.exit(1);
