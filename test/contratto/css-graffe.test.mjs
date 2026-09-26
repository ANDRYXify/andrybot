// UNA GRAFFA DI TROPPO SPEGNE LA REGOLA DOPO.
//
// Il 4 settembre 2026 in anime.css si e' svuotato un blocco
// `@media (prefers-reduced-motion)` lasciando la sua graffa di chiusura. Per il
// browser una `}` fuori posto non e' un errore da segnalare: la attacca al
// selettore della regola che viene dopo, il selettore diventa invalido e la
// regola sparisce intera, in silenzio. Quella era il contorno d'inchiostro del
// tasto per togliere un carattere, dei tasti dell'ispettore dello Studio e del
// campo per caricare un file: per tre settimane piatti, e se n'e' accorto solo
// il collaudo dell'inchiostro, contando in un browser vero.
//
// Qui lo si vede prima, senza browser: ogni foglio di stile servito e ogni
// blocco <style> delle pagine deve chiudere tutte le graffe che apre, e non
// chiuderne nessuna che non ha aperto. Commenti e stringhe non contano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUB = join(dirname(fileURLToPath(import.meta.url)), '../../src/web/public');

// Le graffe fuori posto di un pezzo di CSS, con la riga: [] se e' in pari.
export function graffeStorte(css) {
  const guai = [];
  let prof = 0, riga = 1;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '\n') { riga++; continue; }
    if (c === '/' && css[i + 1] === '*') {
      const f = css.indexOf('*/', i + 2);
      const fine = f < 0 ? css.length : f + 2;
      riga += (css.slice(i, fine).match(/\n/g) || []).length;
      i = fine - 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c && css[j] !== '\n') j += css[j] === '\\' ? 2 : 1;
      i = j;
      continue;
    }
    if (c === '{') prof++;
    if (c === '}') {
      if (prof === 0) guai.push(`riga ${riga}: una } che non chiude niente, e spegne la regola dopo`);
      else prof--;
    }
  }
  if (prof > 0) guai.push(`${prof} ${prof === 1 ? 'graffa aperta' : 'graffe aperte'} e mai chiuse`);
  return guai;
}

const fogli = readdirSync(PUB, { recursive: true }).map(String).filter((f) => f.endsWith('.css') && !f.includes('vendor'));
const pagine = readdirSync(PUB).filter((f) => f.endsWith('.html'));

test('ogni foglio di stile servito chiude le graffe che apre, e nessun\'altra', () => {
  assert.ok(fogli.length >= 8, `fogli trovati: ${fogli.length}`);
  const storti = fogli.flatMap((f) => graffeStorte(readFileSync(join(PUB, f), 'utf8')).map((g) => `${f} ${g}`));
  assert.deepEqual(storti, []);
});

test('e cosi\' i blocchi <style> delle pagine', () => {
  const storti = [];
  for (const f of pagine) {
    const h = readFileSync(join(PUB, f), 'utf8');
    for (const m of h.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) storti.push(...graffeStorte(m[1]).map((g) => `${f} ${g}`));
  }
  assert.deepEqual(storti, []);
});

test('la misura vede la graffa di troppo, e non si confonde con commenti e stringhe', () => {
  assert.deepEqual(graffeStorte('a { b: c; }\n\n}\n\nd { e: f; }'), ['riga 3: una } che non chiude niente, e spegne la regola dopo']);
  assert.deepEqual(graffeStorte('@media (x) { a { b: c; }'), ['1 graffa aperta e mai chiuse']);
  assert.deepEqual(graffeStorte('/* } */ a { content: "}"; b: \'{\'; }'), []);
});
