// Cancello della RISERVATEZZA: niente che si dichiari privato finisce su git.
//
// Il repository è PUBBLICO. Quattro documenti che dicevano di sé stessi
// «Privato. Solo per noi — non da pubblicare» ci sono stati dentro per settimane
// senza che nessuno se ne accorgesse: non c'era niente che lo impedisse, e
// ricordarselo a mano non è un metodo.
//
// La regola, per costruzione: un file che dichiara di essere privato NON può
// essere tracciato da git. La dichiarazione sta nel documento stesso, quindi non
// c'è un secondo elenco da tenere allineato — chi scrive una traccia privata la
// marca come sempre, e il cancello fa il resto.
//
// Uso: node scripts/verifica-riservati.mjs   (esce 1 se qualcosa è tracciato)

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Come si dichiara "questo non va pubblicato". Bastano le prime righe: una
// traccia privata lo dice in cima, e cercare in tutto il file darebbe falsi
// positivi (un documento che PARLA di riservatezza non è riservato).
const RIGHE_TESTA = 12;
const MARCHI = [
  /privato[.:]?\s*solo per noi/i,
  /non da pubblicare/i,
  /non per il pubblico/i,
  /traccia privata/i,
];

// Estensioni che possono contenere prosa. Un .js non si marca "privato": il
// codice del bot è pubblico per scelta, sono le TRACCE a non doverlo essere.
const TESTUALI = /\.(md|html|txt|adoc|rst)$/i;

const tracciati = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0').filter(Boolean).filter((f) => TESTUALI.test(f));

const colpevoli = [];
for (const f of tracciati) {
  let testa = '';
  try { testa = readFileSync(f, 'utf8').split('\n').slice(0, RIGHE_TESTA).join('\n'); } catch { continue; }
  const marchio = MARCHI.find((re) => re.test(testa));
  if (marchio) colpevoli.push({ file: f, riga: (testa.split('\n').find((r) => marchio.test(r)) || '').trim().slice(0, 90) });
}

// Seconda regola, stesso soggetto: cosa arriva al pubblico. Le Novita' NON sono
// un documento interno — il sito le serve come pagina e stanno pure nella
// sitemap. Una riga li' puo' dire cosa il prodotto FA adesso; non deve mai dire
// quale porta era aperta prima. Chi legge le versioni vecchie di una pagina
// pubblica non deve trovarci la mappa di dove mancavano i controlli.
const PORTE_APERTE = [
  /senza (?:verifiche|controlli|pulizia|validazione|filtri)\b/i,
  /non (?:era|erano|veniva|venivano) (?:controllat|verificat|validat|puliti|filtrat)/i,
  /(?:chiunque|bastava|si poteva) (?:poteva |)(?:entrare|accedere|scrivere|leggere|iniettare|aggirare)/i,
  /\b(?:vulnerabil|falla|exploit|bypass|aggirare (?:il |la |i |le |)(?:controll|verific|blocc))/i,
  /\b(?:xss|csrf|sql inject|injection|iniezione di)\b/i,
  /(?:chiave|token|segreto|password)\w* (?:espost|in chiaro|visibil)/i,
];
const PUBBLICI = ['NOVITA.md'];
const spifferi = [];
for (const f of PUBBLICI) {
  let righe = [];
  try { righe = readFileSync(f, 'utf8').split('\n'); } catch { continue; }
  righe.forEach((r, i) => {
    const re = PORTE_APERTE.find((x) => x.test(r));
    if (re) spifferi.push({ file: f, n: i + 1, riga: r.trim().slice(0, 100) });
  });
}

console.log(`riservatezza  ${tracciati.length} documenti tracciati controllati · ${PUBBLICI.length} pagina pubblica letta  ${colpevoli.length || spifferi.length ? '' : '✓'}`);
if (spifferi.length) {
  console.error('\nQueste righe di una pagina PUBBLICA raccontano dov’era il buco:');
  for (const c of spifferi) console.error(`  · ${c.file}:${c.n}\n      ${c.riga}`);
  console.error('\nDi’ cosa il prodotto fa adesso, non cosa non faceva prima.');
  process.exit(1);
}
if (colpevoli.length) {
  console.error('\nQuesti si dichiarano privati ma sono su git (il repository è pubblico):');
  for (const c of colpevoli) console.error(`  · ${c.file}\n      ${c.riga}`);
  console.error('\nToglili dal tracciamento senza cancellarli dal disco:');
  console.error('  git rm --cached ' + colpevoli.map((c) => c.file).join(' '));
  console.error('e aggiungili a .gitignore.');
  process.exit(1);
}
