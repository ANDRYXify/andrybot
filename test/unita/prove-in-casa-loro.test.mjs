// LE PROVE NON DEVONO TOCCARE I DATI VERI.
//
// Importare `src/db.js` non e' innocuo: al momento dell'import APRE un
// database, e senza dirgli dove lo apre in `./data`, cioe' quello di sviluppo.
// Finche' una prova legge soltanto delle costanti sembra che non succeda
// niente; il giorno che scrive una riga, quella riga resta li'.
//
// E' successo davvero, con le prove della chat YouTube: il motore della quota
// scriveva il suo conto nel database di sviluppo, e dopo qualche giro la borsa
// risultava finita. Le prove diventavano rosse per una ragione che non aveva
// niente a che vedere con quello che stavano guardando, e cercarla nel posto
// sbagliato costa piu' del difetto.
//
// La regola e' quindi meccanica: se una prova importa src/db.js, deve prima
// dire dove sta il database — e siccome «prima» conta, l'import dev'essere
// DINAMICO. Un import statico gira sempre per primo, qualunque riga gli si
// metta sopra.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');

function proveTrovate(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { out.push(...proveTrovate(p)); continue; }
    if (n.endsWith('.test.mjs')) out.push(p);
  }
  return out;
}

const STATICO = /^\s*import\s[^;]*?from\s+'[^']*src\/db\.js'/m;
const DINAMICO = /await\s+import\(\s*'[^']*src\/db\.js'/;
const CASA = /cartellaUsaEGetta|DATA_DIR/;

test('nessuna prova apre il database di sviluppo', () => {
  const colpevoli = [];
  for (const f of proveTrovate(join(RAD, 'test'))) {
    const src = readFileSync(f, 'utf8');
    const rel = f.slice(RAD.length + 1);
    if (STATICO.test(src)) { colpevoli.push(`${rel}: import statico di src/db.js`); continue; }
    if (!DINAMICO.test(src)) continue;
    if (!CASA.test(src)) colpevoli.push(`${rel}: importa src/db.js senza dire dove sta`);
  }
  assert.deepEqual(colpevoli, [],
    'una prova che scrive nel database di sviluppo lascia tracce nei dati veri e fa diventare rosse le prove dopo');
});

test('la regola guarda davvero dentro i file', () => {
  const tutte = proveTrovate(join(RAD, 'test'));
  assert.ok(tutte.length > 30, `ne trovo troppo poche (${tutte.length}): il collaudo starebbe guardando nel vuoto`);
  const conDb = tutte.filter((f) => DINAMICO.test(readFileSync(f, 'utf8')));
  assert.ok(conDb.length > 5, `nessuna prova sembra usare il database (${conDb.length}): la regola non morde niente`);
});
