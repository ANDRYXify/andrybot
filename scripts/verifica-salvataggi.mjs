// Cancello dei SALVATAGGI: quello che il pannello offre, il salvataggio lo deve
// portare fino al disco.
//
// La domanda a cui risponde: esiste un comando che si puo' toccare e che poi
// non cambia niente? E' un difetto che non si vede mai da fuori — la casella si
// spunta, il pulsante dice «salvato», e al giro dopo e' tornata com'era.
//
// E' successo su tre comandi insieme, per mesi. «Sola osservazione», «quanto
// presto reagire» e «segnala chi guarda molti canali» erano nel pannello, il
// pannello li mandava, e la rotta che salva non li nominava: li buttava via in
// silenzio. La sola osservazione e' proprio la cosa che serve per provare lo
// scudo senza fargli toccare nessuno, e non si poteva accendere.
//
// Tre catene, e vanno controllate tutte e tre perche' si rompono in tre punti
// diversi:
//
//   1. MARKUP → SALVATAGGIO   un comando disegnato che nessuno legge
//   2. SALVATAGGIO → MARKUP   una lettura di un comando che non c'e' piu'
//   3. SALVATAGGIO → DISCO    una chiave mandata che il normalizzatore ignora
//
// Non si legge una lista scritta a mano: si leggono i file. Se domani nasce un
// comando nuovo e nessuno lo salva, questo cancello diventa rosso.
//
// Uso: node scripts/verifica-salvataggi.mjs
//      node scripts/verifica-salvataggi.mjs --selftest   (deve diventare rosso)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELFTEST = process.argv.includes('--selftest');
let app = fs.readFileSync(path.join(RAD, 'src/web/public/app.js'), 'utf8');
let norm = fs.readFileSync(path.join(RAD, 'src/web/impostazioni-moderazione.js'), 'utf8');

let male = 0;
const dice = (ok, cosa, dettaglio = '') => {
  if (ok) { console.log(`  ✓ ${cosa}`); return true; }
  male++;
  console.log(`  ✗ ${cosa}`);
  if (dettaglio) console.log(`      ${dettaglio}`);
  return false;
};

// Le liste a pastiglie salvano da sole, con una chiamata loro: non passano dal
// pulsante Salva, ed e' voluto (chi aggiunge un nome non deve poi ricordarsi di
// salvare). Dichiarate qui perche' un buco silenzioso e un'esclusione decisa si
// somigliano troppo.
const FUORI = new Set(['scudo-add-extra', 'scudo-add-esenti']);

// I pannelli della moderazione, presi dal file per nome della funzione.
function corpoFunzione(sorgente, nome) {
  const i = sorgente.indexOf(`function ${nome}(`);
  if (i < 0) return '';
  const resto = sorgente.slice(i);
  const fine = resto.indexOf('\n}\n');
  return fine < 0 ? resto : resto.slice(0, fine);
}

const PANNELLI = ['pannelloRegole', 'pannelloScudo'];
const markup = PANNELLI.map((n) => corpoFunzione(app, n)).join('\n');
dice(markup.length > 2000, `i pannelli della moderazione si leggono (${PANNELLI.join(', ')})`);

// Un COMANDO e' un id che comincia con il prefisso di un campo di impostazione.
// Gli id stanno in due forme: scritti nel markup (id="X") oppure passati agli
// aiutanti che disegnano una casella (modVoce('X', …), modTesta('X', …)).
// Raccoglierne una sola vorrebbe dire misurare meta' pagina e chiamarla intera.
const PREFISSI = /^(chk|inp|num|sel|txt|rng)-/;
const idDentro = (testo) => new Set([
  ...[...testo.matchAll(/\bid="([a-z0-9-]+)"/g)].map((m) => m[1]),
  ...[...testo.matchAll(/\bmod(?:Voce|Testa)\('([a-z0-9-]+)'/g)].map((m) => m[1]),
]);
const nelMarkup = idDentro(markup);
const comandi = [...nelMarkup].filter((id) => PREFISSI.test(id) || FUORI.has(id));

// Il salvataggio: tutto quello che app.js legge con getElementById.
const letti = new Set([...app.matchAll(/getElementById\('([a-z0-9-]+)'\)/g)].map((m) => m[1]));

// ── 1. markup → salvataggio
const orfani = comandi.filter((id) => !FUORI.has(id) && !letti.has(id));
dice(orfani.length === 0, `ogni comando disegnato viene anche letto (${comandi.length})`, orfani.join(', '));

// ── 2. salvataggio → markup
// Solo i salvataggi della moderazione: gli altri pannelli hanno le loro strade e
// non e' questo il cancello che le guarda.
const salvaMod = [...app.matchAll(/salvaImpostazioni\(\{[\s\S]*?\n {4}\}, '[^']*'\)/g)]
  .map((m) => m[0]).filter((b) => /antibot:|antispam:|paroleVietate:/.test(b)).join('\n');
const idSalvati = [...new Set([...salvaMod.matchAll(/getElementById\('([a-z0-9-]+)'\)/g)].map((m) => m[1]))];
const fantasmi = idSalvati.filter((id) => !nelMarkup.has(id));
dice(idSalvati.length > 10 && fantasmi.length === 0,
  `nessun salvataggio della moderazione legge un comando che non esiste (${idSalvati.length} letti)`,
  fantasmi.length ? fantasmi.join(', ') : (idSalvati.length <= 10 ? 'non ho trovato i salvataggi' : ''));

// ── 3. salvataggio → disco
// Le chiavi che il pannello manda dentro antibot:{...} e antispam:{...}, e le
// chiavi che il normalizzatore restituisce davvero. Quelle mandate e non
// restituite sono le tre che sparivano.
function chiaviBlocco(sorgente, nome) {
  const i = sorgente.indexOf(`\n      ${nome}: {`);
  if (i < 0) return [];
  const resto = sorgente.slice(i + 1);
  const fine = resto.indexOf('\n      },');
  const corpo = fine < 0 ? resto : resto.slice(0, fine);
  return [...new Set([...corpo.matchAll(/^\s{8}([a-zA-Z]+):/gm)].map((m) => m[1]))];
}

function chiaviRitornate(sorgente, funzione) {
  const i = sorgente.indexOf(`export function ${funzione}(`);
  if (i < 0) return [];
  const resto = sorgente.slice(i);
  const fine = resto.indexOf('\n}\n');
  const corpo = fine < 0 ? resto : resto.slice(0, fine);
  return [...new Set([...corpo.matchAll(/^\s{4}([a-zA-Z]+):/gm)].map((m) => m[1]))];
}

for (const [blocco, funzione] of [['antibot', 'normalizzaAntibot'], ['antispam', 'normalizzaAntispam']]) {
  const mandate = chiaviBlocco(app, blocco);
  const tenute = new Set(chiaviRitornate(norm, funzione));
  const perse = mandate.filter((k) => !tenute.has(k));
  dice(mandate.length > 5 && perse.length === 0,
    `${blocco}: le ${mandate.length} chiavi che il pannello manda arrivano tutte al disco`,
    perse.length ? 'buttate via: ' + perse.join(', ') : (mandate.length <= 5 ? 'non ho trovato il blocco' : ''));
}

// Tre controlli vogliono tre prove: un cancello che si prova solo su uno dei tre
// dice di essere verde quando ne sa un terzo.
if (SELFTEST) {
  console.log('\n  selftest: rimetto i tre difetti, uno per volta');
  const prima = male;
  let visti = 0;

  const senzaChiave = new Set(chiaviRitornate(norm.replace(/^\s{4}aVuoto:.*$/m, ''), 'normalizzaAntibot'));
  const perse = chiaviBlocco(app, 'antibot').filter((k) => !senzaChiave.has(k));
  if (dice(perse.length > 0, 'una chiave che il normalizzatore non tiene si vede', perse.join(', ')) !== false) visti++;

  const finto = markup + "\n${modVoce('chk-ab-inventato', false, 'niente')}";
  const orfaniFinti = [...idDentro(finto)].filter((id) => PREFISSI.test(id) && !FUORI.has(id) && !letti.has(id));
  if (dice(orfaniFinti.length > 0, 'un comando disegnato che nessuno legge si vede', orfaniFinti.join(', ')) !== false) visti++;

  const fantasmiFinti = [...idSalvati, 'chk-ab-sparito'].filter((id) => !nelMarkup.has(id));
  if (dice(fantasmiFinti.length > 0, 'una lettura di un comando che non c\'è si vede', fantasmiFinti.join(', ')) !== false) visti++;

  male = prima;
  if (visti !== 3) { male++; console.log(`  ✗ il selftest ha visto ${visti} difetti su 3`); }
}

console.log(male ? `\n${male} cose non tornano.` : '\nQuello che il pannello offre arriva al disco. ✓');
process.exit(male ? 1 : 0);
