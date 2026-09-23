// LE COLONNE DELL'EDITOR SI SCELGONO SULLO SPAZIO DELL'EDITOR, NON DELLA FINESTRA.
//
// L'editor della pagina link e delle donazioni mette in fila comandi, anteprima
// e ispettore. Prima sceglieva quante colonne guardando la finestra (1101 e
// 1380 px): da quando il menu sta fermo di lato si prende 240 px, e a 1440 px di
// finestra la carta ne ha 946. Le tre colonne ne pretendevano 336 + 416 per
// comandi e ispettore, e all'anteprima ne restavano 159: il telefono schiacciato,
// una parola per riga.
//
// Adesso l'editor e' un contenitore (container query) e le soglie sono la somma
// delle colonne: si passa a due o a tre colonne solo se l'anteprima resta larga
// almeno quanto il telefono con la sua cornice. La prova ricava i numeri dal
// foglio di stile, cosi' se qualcuno cambia una colonna senza la soglia, e' rosso.
// Il ragionamento sta in docs/MOBILE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../../src/web/public/style.css', import.meta.url), 'utf8');
const ANIME = readFileSync(new URL('../../src/web/public/anime.css', import.meta.url), 'utf8');
const rem = (s) => Number(String(s).replace('rem', ''));

function blocco(soglia) {
  const i = CSS.indexOf(`@container lp (min-width: ${soglia})`);
  assert.ok(i >= 0, `c'e' la soglia ${soglia}`);
  let d = 0, j = CSS.indexOf('{', i);
  const inizio = j;
  for (; j < CSS.length; j++) { if (CSS[j] === '{') d++; else if (CSS[j] === '}' && --d === 0) break; }
  return CSS.slice(inizio, j);
}

test('l\'editor misura se stesso: nessuna soglia sulla finestra', () => {
  assert.match(CSS, /#lp-box, #lp-box-dona \{ container: lp \/ inline-size; \}/);
  assert.doesNotMatch(CSS, /@media \(min-width: 1101px\)|@media \(min-width: 1380px\)|@media \(max-width: 1100px\) \{\s*\.lp-editor/, 'le vecchie soglie sulla finestra non ci sono piu\'');
});

test('le soglie sono la somma delle colonne, e l\'anteprima tiene il telefono intero', () => {
  const gap = rem(CSS.match(/\.lp-editor \{ display: grid; grid-template-columns: 1fr; gap: ([\d.]+rem)/)[1]);
  const telefono = rem(CSS.match(/\.lp-telefono:not\(\.schermo\) \{ width: min\(([\d.]+rem), 100%\)/)[1]);
  const imbottitura = rem(CSS.match(/\.lp-anteprima \{[^}]*padding: ([\d.]+rem)/)[1]);
  const soglie = [...CSS.matchAll(/@container lp \(min-width: ([\d.]+rem)\)/g)].map((m) => m[1]);
  assert.equal(soglie.length, 2, 'due soglie: due colonne e tre colonne');
  const [due, tre] = soglie;

  const colonneDue = blocco(due).match(/grid-template-columns: ([\d.]+rem) minmax\(0, 1fr\);/);
  const colonneTre = blocco(tre).match(/grid-template-columns: ([\d.]+rem) minmax\(0, 1fr\) ([\d.]+rem);/);
  assert.ok(colonneDue && colonneTre, 'le colonne si leggono');
  const anteprimaDue = rem(due) - rem(colonneDue[1]) - gap;
  const anteprimaTre = rem(tre) - rem(colonneTre[1]) - rem(colonneTre[2]) - 2 * gap;
  const minimo = telefono + 2 * imbottitura;
  assert.ok(anteprimaDue >= minimo, `a due colonne l'anteprima parte da ${anteprimaDue}rem, il telefono ne vuole ${minimo}`);
  assert.ok(anteprimaTre >= minimo, `a tre colonne l'anteprima parte da ${anteprimaTre}rem, il telefono ne vuole ${minimo}`);
  assert.ok(Math.abs(anteprimaDue - anteprimaTre) < 1e-9, 'e la stessa anteprima minima vale per tutte e due le soglie');
});

test('l\'editor ha lo stesso spazio nella Pagina link e nelle Donazioni', () => {
  // Lo spazio largo lo chiede l'editor, non la scheda: prima lo aveva solo la
  // Pagina link, e le Donazioni aprivano lo stesso editor in 1080 px.
  assert.match(ANIME, /body:has\(\.pannello-scheda\.visibile :is\(#lp-box, #lp-box-dona\)\) \.contenuto \{\n  max-width: none;/);
  assert.doesNotMatch(ANIME, /\[data-scheda="pagina"\]\) \.contenuto/, 'nessuna scheda ha lo spazio largo per nome');
});
