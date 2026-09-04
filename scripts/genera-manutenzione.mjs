// Scrive la pagina che l'edge mostra quando il bot non risponde.
//
// Perche' un file generato e non scritto a mano: quella pagina deve avere i
// colori e il tratto del sito, e quelli vivono in `public/tema.css`. Scriverla a
// mano vorrebbe dire tenerne una seconda copia, che il giorno che il marchio
// cambia resta indietro — ed e' proprio il difetto che `tavolozza.js` esiste per
// evitare. Qui si rigenera, e un cancello controlla che il file in cartella sia
// ancora quello che uscirebbe adesso.
//
// Uso: node scripts/genera-manutenzione.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { paginaManutenzione } from '../src/web/pagine-servizio.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const VIA = join(RAD, 'pagine-servizio', 'manutenzione.html');
mkdirSync(join(RAD, 'pagine-servizio'), { recursive: true });
writeFileSync(VIA, paginaManutenzione(), 'utf8');
console.log('scritta', VIA);
