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
// Ma leggere i percorsi dal CODICE non basta, e si e' visto: i caratteri della
// locandina stanno in `assets/font`, e quella cartella il codice non la nomina
// mai per intero — la compone (`join(RAD, 'assets/font')`, poi il nome del file
// a parte). Il cancello guardava le stringhe, non ha trovato niente, ed e'
// rimasto verde mentre in produzione mancavano i caratteri.
//
// Quindi si guarda anche dall'altra parte: ogni CARTELLA di primo livello del
// repository o e' copiata, o sta in un elenco qui sotto con scritto perche' non
// serve in produzione. Una cartella nuova nasce rossa, e chi la crea deve
// decidere. Non c'e' niente da ricordarsi.
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
if (SELFTEST) dockerfile = dockerfile.replace(/^COPY NOVITA\.md .*$/m, '').replace(/^COPY assets .*$/m, '');

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

// Cartelle che NON servono nell'immagine, con il motivo. Chi ne aggiunge una
// nuova al repository trova il cancello rosso e deve mettersi qui o nel
// Dockerfile: sono le due sole risposte possibili.
const FUORI = new Map([
  ['node_modules', 'la ricostruisce npm install dentro all\'immagine'],
  ['test', 'le prove girano prima, non in produzione'],
  ['docs', 'si legge su GitHub'],
  ['data', 'e\' il volume dei dati, montato da fuori'],
  ['ambiente', 'e\' un\'immagine sua, con il suo Dockerfile'],
  ['brain', 'e\' un servizio suo, con il suo Dockerfile'],
  ['edge', 'gira sul bordo, non in questa immagine'],
  ['guardiano', 'e\' un servizio suo'],
  ['forgia', 'e\' un servizio suo'],
  ['server', 'configurazione della macchina, non del programma'],
  ['plugins', 'e\' un servizio suo'],
  ['pagine-servizio', 'le compone il codice, non si leggono da disco'],
  ['undefined', 'cartella nata per sbaglio, da togliere'],
]);

const cartelle = readdirSync(RAD, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
  .map((d) => d.name);
const scoperte = cartelle.filter((c) => !copre(c) && !FUORI.has(c));
for (const c of scoperte) {
  guai.push(`${c}/: ne' copiata dal Dockerfile ne' dichiarata inutile in produzione`);
}

const dice = (ok, testo, extra = '') => { console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`); return ok; };
console.log('\nQuel che il server legge sta dentro l\'immagine.\n');
let verde = dice(!guai.some((g) => !g.includes('/: ne\'')),
  `file letti da fuori src/: ${cercati.size} (${[...cercati.keys()].join(', ') || 'nessuno'})`,
  guai.filter((g) => !g.includes('/: ne\'')).slice(0, 4).join(' · '));
verde = dice(!scoperte.length,
  `cartelle del repository: ${cartelle.length}, tutte o copiate o dichiarate (${FUORI.size} fuori)`,
  scoperte.join(' · ')) && verde;

if (SELFTEST) {
  if (!verde) { console.log('\nAutoprova: togliendo la copia dal Dockerfile il cancello se ne accorge. ✓\n'); process.exit(0); }
  console.log('\nAutoprova FALLITA: il cancello non vede un file che manca nell\'immagine.\n');
  process.exit(1);
}
console.log(verde ? '\ncancello verde ✓\n' : '\ncancello ROSSO ✗\n');
process.exit(verde ? 0 : 1);
