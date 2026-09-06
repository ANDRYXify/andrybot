// DUE DIFETTI CHE NON DANNO ERRORE, E CHE ERANO TUTTI E DUE VIVI.
//
// 1. `--tratto-mano` vale `2px 2.5px 2.5px 2px` — quattro larghezze, perché il
//    bordo del sito è disegnato a mano e non è uguale sui quattro lati. La
//    scorciatoia `border: <larghezza> <stile> <colore>` accetta UNA larghezza
//    sola: con quattro, la dichiarazione è invalida e il browser la butta via
//    intera. Niente bordo, nessun errore, nessun avviso. Le pagine di servizio
//    lo chiedevano così, e da mesi non avevano il contorno.
//    La forma giusta è in due tempi: `border: 2px solid …; border-width: var(…)`.
//
// 2. `dichiarazioni()` copiava il testo della dichiarazione così com'era. Ma un
//    token può essere scritto in funzione di un altro, e chi chiedeva il primo
//    senza sapere del secondo si portava via una regola che punta nel vuoto.
//    Stesso sintomo: la riga c'è, l'effetto no.
//
// Sono la stessa famiglia di difetto: qualcosa che si legge giusto e non si
// vede. Per questo si misura, invece di rileggere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { dichiarazioni, tinta, TAVOLOZZA } from '../../src/web/tavolozza.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');

const FOGLI = [
  ...readdirSync(join(RAD, 'src/web/public')).filter((f) => f.endsWith('.css')).map((f) => 'src/web/public/' + f),
  'src/web/pagine-servizio.js',
  'src/web/guide.js',
  'src/web/public/index.html',
];

test('nessun bordo chiede quattro larghezze alla scorciatoia', () => {
  // Il tratto a mano ha quattro larghezze: dentro `border:` la regola cade tutta.
  // L'elenco lo dice la tavolozza, non io: un token nuovo con piu' larghezze
  // entra da solo. Scriverlo a mano vuol dire dimenticarne uno — e infatti la
  // prima volta che ho scritto questo controllo mi ero scordato `--tratto-1`,
  // che era proprio quello con piu' bordi morti.
  const misura = (v, giri = 0) => (giri < 4 && v.startsWith('var(--')
    ? misura(tinta(v.slice(6, v.indexOf(')')), 'chiaro'), giri + 1) : v);
  const larghi = new Set();
  for (const n of Object.keys(TAVOLOZZA.chiaro)) {
    const parti = misura(tinta(n, 'chiaro')).trim().split(/\s+/);
    if (parti.length >= 2 && parti.length <= 4 && parti.every((p) => /^[\d.]+(px|rem|em)$/.test(p))) larghi.add(n);
  }
  assert.ok(larghi.size, 'nessun token di tratto multiplo: il controllo non misura piu\' niente');

  const colpe = [];
  for (const f of FOGLI) {
    const testo = readFileSync(join(RAD, f), 'utf8');
    for (const m of testo.matchAll(/(?:border(?:-(?:top|right|bottom|left))?|outline)\s*:\s*([^;{}]*)/g)) {
      const valore = m[1];
      for (const t of larghi) if (valore.includes(`var(--${t})`)) colpe.push(`${f}: ${valore.trim().slice(0, 60)}`);
    }
  }
  assert.deepEqual(colpe, [], 'la scorciatoia border/outline non accetta quattro larghezze: usa border-width a parte');
});

test('le pagine composte si portano dietro i token da cui dipendono', () => {
  const css = dichiarazioni(['tratto-mano'], 'chiaro');
  assert.match(css, /--tratto-mano:/, 'manca il token chiesto');
  assert.match(css, /--tratto-2:\s*\d/, 'il token da cui dipende non viaggia: la regola punterebbe nel vuoto');
  const nomi = [...css.matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1]);
  for (const m of css.matchAll(/var\(\s*--([a-z0-9-]+)/g)) {
    assert.ok(nomi.includes(m[1]), `--${m[1]} e' usato ma non dichiarato`);
  }
});

test('quello che chiede la pagina di servizio esiste tutto', () => {
  const sorgente = readFileSync(join(RAD, 'src/web/pagine-servizio.js'), 'utf8');
  const i = sorgente.indexOf('const VESTITO');
  const vestito = sorgente.slice(i, sorgente.indexOf('const guscio', i));
  const chiesti = new Set([...vestito.matchAll(/var\(\s*--([a-z0-9-]+)/g)].map((m) => m[1]));
  const dati = new Set([...dichiarazioni([...chiesti].filter((n) => {
    try { tinta(n, 'chiaro'); return true; } catch { return false; }
  }), 'chiaro').matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1]));
  const mancano = [...chiesti].filter((n) => !dati.has(n) && n !== 'testo-font');
  assert.deepEqual(mancano, [], 'il foglio della pagina di servizio usa token che non gli vengono dati');
});
