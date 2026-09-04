// La vetrina è UNA.
//
// Prima erano due pagine diverse sullo stesso indirizzo: un blocco scritto a
// mano dentro `index.html`, solo in italiano, e la vetrina vera disegnata da
// `app.js` in tre lingue, che ci scriveva sopra. Il motore di ricerca leggeva
// la prima, la persona la seconda.
//
// Adesso la disegna il server, da `src/web/vetrina-vista.js`, e qui si tiene
// ferma quella scelta: che il blocco a mano non torni, che `app.js` non
// ricominci a disegnarla, e che le copie che il modulo si porta dietro (app.js
// è uno script classico e non può importare) restino uguali all'originale.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { vetrinaHtml, LINGUE, ICONE_VETRINA, PACCHETTI_VETRINA } from '../../src/web/vetrina-vista.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (v) => readFileSync(join(RAD, v), 'utf8');
const APP = leggi('src/web/public/app.js');
const INDEX = leggi('src/web/public/index.html');

test('index.html tiene solo il posto: la vetrina la mette il server', () => {
  const ancora = '<div id="app"></div>';
  assert.equal(INDEX.split(ancora).length - 1, 1, `index.html deve avere ${ancora} una volta sola`);
  assert.ok(!/<section class="vetrina-/.test(INDEX), 'il blocco scritto a mano è tornato in index.html');
});

test('app.js non ridisegna la vetrina', () => {
  // Si distingue SCRIVERE da LEGGERE: `class="vt-scena"` è markup che nasce in
  // app.js, `.vt-scena` è app.js che guarda cosa gli ha lasciato il server.
  // Solo il primo è il difetto.
  for (const scritto of ['class="vt-scena"', 'class="vt-cap', 'class="vt-vetro"', 'class="vt-faq"']) {
    assert.ok(!APP.includes(scritto), `app.js è tornato a disegnare la vetrina (${scritto})`);
  }
  assert.ok(!APP.includes('const CAPACITA'), 'l\'elenco delle funzioni è tornato in app.js');
});

test('ogni lingua è una pagina intera, non una traduzione a metà', () => {
  const titoli = (h) => [...h.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].length;
  const uno = vetrinaHtml('it');
  assert.equal((uno.match(/<h1/g) || []).length, 1, 'la vetrina deve avere un solo h1');
  for (const l of LINGUE) {
    const h = vetrinaHtml(l);
    assert.equal((h.match(/<h1/g) || []).length, 1, `${l}: un solo h1`);
    assert.equal(titoli(h), titoli(uno), `${l} ha un numero di sezioni diverso dall'italiano`);
    assert.ok(h.length > 8000, `${l}: la vetrina è troppo corta, manca qualcosa`);
  }
});

test('le lingue sono link veri, non pulsanti che un motore non può premere', () => {
  for (const [l, via] of [['it', '/'], ['en', '/?lang=en'], ['es', '/?lang=es']]) {
    assert.ok(vetrinaHtml('it').includes(`href="${via}" hreflang="${l}"`), `manca il link alla lingua ${l}`);
  }
});

test('la porta di Kick c\'è solo se il server ha un\'app Kick', () => {
  assert.ok(vetrinaHtml('it', { kick: true }).includes('/accedi/kick'));
  assert.ok(!vetrinaHtml('it').includes('/accedi/kick'));
});

test('le copie che il modulo si porta dietro sono uguali all\'originale', () => {
  // Due disegni uguali scritti in due posti vanno alla deriva in silenzio: qui
  // si confrontano uno per uno contro app.js, che resta la casa di entrambi.
  for (const [nome, d] of Object.entries(ICONE_VETRINA)) {
    assert.ok(APP.includes(`  ${nome}: '${d}',`), `l'icona «${nome}» non è più quella di app.js`);
  }
  for (const [chiave, nomi] of Object.entries(PACCHETTI_VETRINA)) {
    const riga = `  ${chiave}: ['${nomi.join("', '")}'],`;
    assert.ok(APP.includes(riga), `il pacchetto «${chiave}» non è più quello di app.js`);
  }
});
