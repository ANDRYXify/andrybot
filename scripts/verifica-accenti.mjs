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
// E «a meta», che è sempre «a metà» — «meta» da sola è una parola vera, questa
// coppia no.
const RE_VERBO = /\b(non e|c'e|a meta)\b/g;
const GIUSTA = { 'non e': 'non è', "c'e": "c'è", 'a meta': 'a metà' };

// LA COERENZA INTERNA, che non dipende da nessuna lista mia. Se nello stesso
// testo una parola compare sia con l'accento sia senza — «così» e «cosi» — una
// delle due è sbagliata, e non serve sapere quale sia la parola: basta che ci
// siano tutte e due. Prende anche i casi che nessuno aveva previsto.
//
// Le eccezioni sono coppie che esistono davvero tutte e due in italiano, e
// stanno scritte qui perché siano una scelta e non una dimenticanza.
const COPPIE_VERE = new Set(['meta', 'cambio', 'blocco', 'arrivo', 'provo', 'papa', 'pero', 'sara', 'ancora', 'porto', 'legge', 'tempo', 'leggera', 'capito', 'parlo', 'segnalo', 'mostro']);
const ACCENTATE = { 'à': 'a', 'è': 'e', 'é': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u' };

function incoerenti(testo) {
  const parole = (testo.toLowerCase().match(/[a-zàèéìòù']+/g) || []);
  const viste = new Set(parole);
  const fuori = [];
  for (const w of viste) {
    const ultima = w.slice(-1);
    if (!ACCENTATE[ultima] || w.length < 4) continue;
    const senza = w.slice(0, -1) + ACCENTATE[ultima];
    if (COPPIE_VERE.has(senza)) continue;
    if (viste.has(senza)) fuori.push({ parola: senza, giusta: w });
  }
  return fuori;
}

// Dove si guarda: tutto quello che una persona legge da fuori.
const POSTI = [
  ['NOVITA.md', (t) => t.split('\n').filter((r) => r.startsWith('- ')).join('\n')],
  // I commenti si tolgono prima: quello che il programmatore scrive per sé non
  // lo legge nessuno da fuori, e un cancello che dà allarmi su quelli si spegne.
  ['src/web/manuali.js', (t) => (senzaCommentiJs(t).match(/'[^']{25,}'/g) || []).join('\n')],
  // Nel pannello si guarda SOLO il primo argomento di L(...), che è la frase
  // italiana. Prendere tutte le stringhe del file darebbe allarmi su nomi di
  // variabili («gia»), su classi CSS («carta-novita») e sullo spagnolo («pero
  // no llegaría»): novantuno allarmi, nessuno vero. Un cancello rumoroso si
  // spegne, e allora tanto vale non averlo.
  ['src/web/public/app.js', (t) => [...senzaCommentiJs(t).matchAll(/\bL\('((?:[^'\\]|\\.){12,}?)'/g)].map((m) => m[1]).join('\n')],
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  const via = join(RAD, 'NOVITA.md');
  const orig = readFileSync(via, 'utf8');
  let cieche = 0;
  for (const [rotta, che] of [
    ['- Adesso e piu veloce di prima e si vede.', 'una parola senza accento'],
    ["- Adesso non e come prima, e si vede.", 'una «e» che è per forza un verbo'],
    ['- Si ferma a meta e riparte da capo.', '«a meta» invece di «a metà»'],
    ['- Le due schede sono affiancate invece che affiancate.', 'nessun problema: non deve dare falsi allarmi'],
    ['- La perdita di qualita non si vede piu.', 'una parola che nessuna lista prevedeva'],
  ]) {
    writeFileSync(via, orig.replace('## 2026-09-07\n', '## 2026-09-07\n' + rotta + '\n'));
    let rosso = false;
    try { execFileSync(process.execPath, [io], { cwd: RAD, stdio: 'pipe' }); } catch { rosso = true; }
    writeFileSync(via, orig);
    const atteso = !che.startsWith('nessun problema');
    const ok = rosso === atteso;
    console.log((ok ? '  ✓  ' : '  ✗  ') + che + (ok ? '' : (atteso ? '  → PASSA INOSSERVATA' : '  → FALSO ALLARME')));
    if (!ok) cieche++;
  }
  console.log(cieche ? `\n${cieche} rotture non viste.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const trovate = [];
for (const [file, estrai] of POSTI) {
  const testo = estrai(leggi(file));
  for (const riga of testo.split('\n')) {
    for (const m of riga.matchAll(RE_PAROLE)) trovate.push({ file, parola: m[1], giusta: PAROLE[m[1]], riga: riga.trim().slice(0, 90) });
    for (const m of riga.matchAll(RE_VERBO)) trovate.push({ file, parola: m[1], giusta: GIUSTA[m[1]], riga: riga.trim().slice(0, 90) });
  }
  // e poi il testo tutto intero, per la coerenza con sé stesso
  for (const x of incoerenti(testo)) {
    const riga = (testo.split('\n').find((r) => new RegExp(`\\b${x.parola}\\b`).test(r.toLowerCase())) || '').trim();
    trovate.push({ file, parola: x.parola, giusta: x.giusta, riga: riga.slice(0, 90) });
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
