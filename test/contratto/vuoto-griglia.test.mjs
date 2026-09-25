// UN ELENCO VUOTO NON SI STRINGE IN UNA CELLA.
//
// La libreria sfondi delle Grafiche e' una griglia di miniature: vuota, il suo
// messaggio finiva in una cella da 64 pixel e andava a capo sillaba per
// sillaba. Lo stesso valeva per l'attesa e per ogni altro elenco a griglia.
// La regola sta sul messaggio, non sulla griglia: cosi' vale per ogni griglia,
// anche per quelle che verranno. Fuori da una griglia non fa niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../../src/web/public/style.css', import.meta.url), 'utf8');
const regola = (sel) => { const i = CSS.indexOf('\n' + sel + ' {'); assert.ok(i >= 0, `manca ${sel}`); return CSS.slice(i, CSS.indexOf('}', i)); };

test('il messaggio vuoto e l\'attesa prendono tutta la riga di una griglia', () => {
  assert.match(regola('.vuoto'), /grid-column: 1 \/ -1;/);
  assert.match(regola('.attesa'), /grid-column: 1 \/ -1;/);
});
