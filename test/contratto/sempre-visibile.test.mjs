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
// restavano spostate di lato di 32 px, allargando la pagina di 15 px. Adesso
// le carte non si spostano piu': si disegnano (docs/DISEGNO.md), e si vedono
// anche se il disegno non parte.
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

test('una carta si vede anche se nessuno la disegna', () => {
  // Il disegno e' un di piu': la carta la rivela la sua classe, non il tratto.
  // Nascosta finche' non arriva nel riquadro, visibile appena ci arriva, e
  // visibile comunque dopo la rete di sicurezza; chi chiede meno movimento la
  // vede subito. Nessuna trasformazione: una carta che aspetta non e' spostata
  // da nessuna parte, e non puo' allargare la pagina.
  assert.match(CSS, /\.carta\.rivela \{ opacity: 0; \}\n\.carta\.rivela\.dentro \{ opacity: 1; \}/);
  const regole = [...CSS.matchAll(/([^{}]*\.carta\.rivela[^{}]*)\{([^}]*)\}/g)].map((m) => m[2]).join(' ');
  assert.doesNotMatch(regole, /transform|translate|transition/, 'la carta che aspetta non si muove');
  const i = APP.indexOf('function _reteDiSicurezza(');
  assert.match(APP.slice(i, APP.indexOf('\n}\n', i)), /c\.classList\.add\('dentro'\)/, 'la rete di sicurezza la mostra comunque');
  assert.match(CSS, /prefers-reduced-motion: reduce\)[\s\S]*?\.carta\.rivela \{ opacity: 1 !important; \}/);
});
