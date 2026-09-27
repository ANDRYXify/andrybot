// LA SCHEDA COMANDI DICE QUELLO CHE IL BOT FA.
//
// Qui stanno le prove della scheda Comandi (e di Comandi vocali) che si leggono
// dal pannello: un testo che promette una cosa che il bot non fa, un campo letto
// col nome sbagliato, un tasto che salva piu' di quello che si vede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');

// Il corpo di una funzione del pannello, dalla firma alla graffa che la chiude.
function corpo(firma) {
  const i = APP.indexOf(firma);
  assert.ok(i >= 0, `manca ${firma}`);
  let d = 0;
  for (let j = APP.indexOf('{', i); j < APP.length; j++) {
    if (APP[j] === '{') d++;
    else if (APP[j] === '}') { d--; if (!d) return APP.slice(i, j + 1); }
  }
  return '';
}

test('accendere un contatore a schermo non lo azzera, e il pannello non lo dice', () => {
  const cont = leggi('src/features/contatori.js');
  assert.match(cont, /verbo === 'mostra'\) nuovo = store\.patchOverlay\(canale, primo, \{ mostra: true \}\)/, 'il verbo tocca solo lo schermo');
  const testi = corpo('function carteContatori()') + corpo('async function caricaContatori()');
  assert.doesNotMatch(testi, /da 0|from 0|desde 0|en 0 y/i, 'nessuna promessa di ripartire da zero');
});
