// QUELLO CHE SI MUOVE NON PUO' SPARIRE, E NON PUO' ALLARGARE LA PAGINA.
//
// Un'animazione e' un di piu': se non parte (una classe che non arriva, un
// giro del codice che non passa di li'), quello che anima deve vedersi lo
// stesso. E un effetto d'entrata non deve cambiare quanto e' larga la pagina:
// su un telefono una pagina piu' larga dello schermo scivola di lato.
//
// Due difetti veri da cui nasce questo file: il titolo della scheda restava
// invisibile al primo caricamento, perche' le sue parole aspettavano, ferme
// sotto il bordo, la classe che le faceva salire; e le carte fuori vista
// restavano spostate di lato di 32 px, allargando la pagina di 15 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CSS = readFileSync(join(RAD, 'src/web/public/style.css'), 'utf8') + readFileSync(join(RAD, 'src/web/public/anime.css'), 'utf8');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

test('le parole del titolo si vedono anche se l\'animazione non parte', () => {
  const regole = [...CSS.matchAll(/([^{}]*\.pt-parola\s*>\s*i[^{}]*)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim(), corpo: m[2] }));
  assert.ok(regole.length, 'non trovo le regole delle parole del titolo');
  for (const r of regole) {
    if (/animation(?!-delay)/.test(r.corpo) && !/animation:\s*none/.test(r.corpo)) {
      assert.match(r.sel, /\.entra\b/, `«${r.sel}» mette l'animazione anche quando non deve partire: le parole restano ferme dove l'animazione comincia`);
    }
    assert.ok(!/animation-play-state:\s*paused/.test(r.corpo), 'un\'animazione in pausa con «both» tiene le parole sotto il bordo');
  }
});

test('le carte fuori vista non entrano di lato', () => {
  const i = APP.indexOf('function rivelaCarte(');
  const corpo = APP.slice(i, APP.indexOf('\n}\n', i));
  assert.match(corpo, /if \(visibile\) c\.style\.removeProperty\('--rev-x'\); else c\.style\.setProperty\('--rev-x', '0px'\);/,
    'solo le carte che si vedono entrano dalla direzione in cui si va; le altre salgono e basta');
  const j = APP.indexOf('function preparaCarte(');
  assert.match(APP.slice(j, APP.indexOf('\n}\n', j)), /c\.style\.setProperty\('--rev-x', '0px'\);/);
});
