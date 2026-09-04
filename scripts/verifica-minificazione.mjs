// Cancello della MINIFICAZIONE.
//
// Quel che il browser scarica esce minificato e coi nomi interni accorciati
// (src/web/minifica.js). Tre cose devono restare vere, e nessuna delle tre si
// puo' verificare a occhio:
//
// 1. OGNI file servito deve passare la minificazione. Se uno non passa il sito
//    non si rompe — si serve il sorgente — ma quel file resta leggibile senza
//    che nessuno se ne accorga. Qui si accorge il cancello.
// 2. La FILIGRANA deve sopravvivere. E' l'unica cosa che deve restare leggibile
//    in quel che si scarica.
// 3. I nomi di PRIMO LIVELLO devono restare. app.js e compagni sono script
//    classici: le funzioni di primo livello sono globali della pagina e un file
//    chiama quelle di un altro. Se un giorno si accendesse `mangle.toplevel`,
//    il sito si romperebbe in modi difficili da capire — e questo lo prende
//    prima, controllando che una manciata di nomi noti sia ancora li'.
//
// Uso: node scripts/verifica-minificazione.mjs
//      node scripts/verifica-minificazione.mjs --selftest   (deve diventare rosso)

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minificaJs } from '../src/web/minifica.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(RAD, 'src/web/public');
const SELFTEST = process.argv.includes('--selftest');

// nomi che un file passa a un altro: devono sopravvivere alla minificazione
const PONTI = [
  ['app.js', ['SB_APP']],
  ['overlay-app.js', ['trasformaXY', 'posaElemento']],
  ['presets.js', ['SUONI_PRESET', 'ICONE_OVL', 'FONT_CONT']],
  ['plancia.js', ['SB_PLANCIA']],
  ['suono.js', ['SB_SUONO']],
];

const files = readdirSync(PUB).filter((f) => extname(f) === '.js').sort();
const guai = [];
let byteDentro = 0, byteFuori = 0, fatti = 0;

for (const nome of files) {
  let sorgente = readFileSync(join(PUB, nome), 'utf8');
  if (SELFTEST && nome === files[0]) sorgente += '\nfunction rotta( { return 1;\n';
  let codice;
  try {
    codice = await minificaJs(sorgente);
  } catch (e) {
    guai.push(`${nome}: non passa la minificazione — ${e?.message || e}`);
    continue;
  }
  fatti++;
  byteDentro += sorgente.length;
  byteFuori += codice.length;
  if (!/ANDRYX-IP/.test(codice) || !/Andrea Taliento/.test(codice)) {
    guai.push(`${nome}: la filigrana non sopravvive alla minificazione`);
  }
  if (codice.length >= sorgente.length) {
    guai.push(`${nome}: minificato non e' piu' piccolo dell'originale`);
  }
  const ponti = (PONTI.find(([f]) => f === nome) || [])[1] || [];
  for (const p of ponti) {
    if (!codice.includes(p)) guai.push(`${nome}: il nome «${p}» sparisce, e lo cerca un altro file`);
  }
}

const risparmio = byteDentro ? Math.round((1 - byteFuori / byteDentro) * 100) : 0;
const dice = (ok, testo, extra = '') => { console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`); return ok; };
console.log('\nQuel che il browser scarica non regala la mappa.\n');
let verde = true;
verde = dice(!guai.some((g) => /non passa/.test(g)), `file serviti minificati: ${fatti} su ${files.length}`,
  guai.filter((g) => /non passa/.test(g)).slice(0, 3).join(' · ')) && verde;
verde = dice(!guai.some((g) => /filigrana/.test(g)), 'la filigrana sopravvive a tutti',
  guai.filter((g) => /filigrana/.test(g)).slice(0, 3).join(' · ')) && verde;
verde = dice(!guai.some((g) => /sparisce|piu' piccolo/.test(g)),
  `${risparmio}% in meno da scaricare, e i nomi che i file si scambiano restano`,
  guai.filter((g) => /sparisce|piu' piccolo/.test(g)).slice(0, 3).join(' · ')) && verde;

if (SELFTEST) {
  if (!verde) { console.log('\nAutoprova: un file che non si minifica fa diventare rosso il cancello. ✓\n'); process.exit(0); }
  console.log('\nAutoprova FALLITA: il cancello non si accorge di un file che non passa.\n');
  process.exit(1);
}
console.log(verde ? '\ncancello verde ✓\n' : '\ncancello ROSSO ✗\n');
process.exit(verde ? 0 : 1);
