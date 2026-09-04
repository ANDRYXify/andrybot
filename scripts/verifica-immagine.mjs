// Cancello dell'IMMAGINE: quel che il server legge deve essere nell'immagine.
//
// Il Dockerfile copia src/ e scripts/. Se il server legge un file che sta FUORI
// da quelle cartelle — un markdown alla radice, per dire — in sviluppo funziona
// e in produzione no. E non si rompe in modo rumoroso: la pagina esce vuota.
//
// E' successo con le novità: `/novita` serviva solo il guscio, `/api/novita`
// rispondeva con l'elenco vuoto, e la voce spariva dalla sitemap (che si
// costruisce leggendo lo stesso file). Tre sintomi, un file mancante, nessun
// errore da nessuna parte.
//
// La regola, per costruzione: ogni percorso «fuori da src/» che il codice del
// server apre deve essere copiato dal Dockerfile.
//
// Uso: node scripts/verifica-immagine.mjs
//      node scripts/verifica-immagine.mjs --selftest   (deve diventare rosso)

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELFTEST = process.argv.includes('--selftest');

function tuttiIFile(dir, fuori = []) {
  for (const v of readdirSync(dir)) {
    const p = join(dir, v);
    if (statSync(p).isDirectory()) { if (v !== 'node_modules') tuttiIFile(p, fuori); }
    else if (/\.(js|mjs)$/.test(v)) fuori.push(p);
  }
  return fuori;
}

let dockerfile = readFileSync(join(RAD, 'Dockerfile'), 'utf8');
if (SELFTEST) dockerfile = dockerfile.replace(/^COPY NOVITA\.md .*$/m, '');

// Cosa copia il Dockerfile: la sorgente di ogni COPY, senza le opzioni
const copiati = [...dockerfile.matchAll(/^COPY\s+(?:--\S+\s+)*(.+?)\s+\S+\s*$/gm)]
  .flatMap((m) => m[1].split(/\s+/))
  .map((x) => x.replace(/\*.*$/, ''));

const copre = (via) => copiati.some((c) => via === c || via.startsWith(c.replace(/\/$/, '') + '/'));

// Cosa legge il server da fuori src/: i percorsi risalenti scritti nel codice
const cercati = new Map();
for (const f of tuttiIFile(join(RAD, 'src'))) {
  const testo = readFileSync(f, 'utf8');
  for (const m of testo.matchAll(/['"`](\.\.\/)+([A-Za-z0-9_.-]+\.[A-Za-z0-9]{1,5})['"`]/g)) {
    const dentro = join(dirname(f), m[0].slice(1, -1));
    const via = relative(RAD, dentro);
    if (via.startsWith('..')) continue;
    if (via.startsWith('src/') || via.startsWith('scripts/')) continue;
    if (!cercati.has(via)) cercati.set(via, []);
    cercati.get(via).push(relative(RAD, f));
  }
}

const guai = [];
for (const [via, chi] of cercati) {
  if (!existsSync(join(RAD, via))) { guai.push(`${via}: il codice lo legge (${chi[0]}) ma nel repository non c'e'`); continue; }
  if (!copre(via)) guai.push(`${via}: lo legge ${chi[0]} ma il Dockerfile non lo copia — in produzione sara' vuoto`);
}

const dice = (ok, testo, extra = '') => { console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`); return ok; };
console.log('\nQuel che il server legge sta dentro l\'immagine.\n');
const verde = dice(guai.length === 0,
  `file letti da fuori src/: ${cercati.size} (${[...cercati.keys()].join(', ') || 'nessuno'})`,
  guai.slice(0, 4).join(' · '));

if (SELFTEST) {
  if (!verde) { console.log('\nAutoprova: togliendo la copia dal Dockerfile il cancello se ne accorge. ✓\n'); process.exit(0); }
  console.log('\nAutoprova FALLITA: il cancello non vede un file che manca nell\'immagine.\n');
  process.exit(1);
}
console.log(verde ? '\ncancello verde ✓\n' : '\ncancello ROSSO ✗\n');
process.exit(verde ? 0 : 1);
