// Il consenso ai contenuti di altri siti si può RITIRARE.
//
// Era per sempre: chi aveva cliccato una volta — sì o no — non rivedeva più il
// riquadro, e non c'era nessun modo di cambiare idea. Il difetto si vedeva da
// fuori come «il banner non mi esce più», ma la sostanza è un'altra: ritirare un
// consenso dev'essere facile quanto darlo.
//
// C'era anche una trappola sotto: i tasti del riquadro venivano agganciati DOPO
// le uscite anticipate, quindi per chi aveva già scelto restavano muti. Riaprire
// il riquadro non sarebbe servito a niente.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderLinkPage } from '../../src/features/linkpagina.js';

// Il comportamento della pagina link NON sta piu' dentro l'HTML: sta in un file
// servito. Non e' un dettaglio di forma — l'edge rifiuta gli script scritti
// dentro la pagina, e per anni li ha rifiutati tutti in silenzio.
const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const COMPORTAMENTO = readFileSync(join(RAD, 'src/web/public/pagina-link.js'), 'utf8');

const pagina = (extra = {}) => ({
  attiva: true, titolo: 'Prova', tema: { consenso: 'sempre' },
  blocchi: [
    { tipo: 'link', label: 'Twitch', url: 'https://twitch.tv/x', icona: 'twitch' },
    { tipo: 'embed', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  ],
  ...extra,
});
const rendi = (p) => renderLinkPage(p, { login: 'x', display: 'X', avatar: '', baseUrl: 'http://x' });

test('chi ha già scelto trova nel piede il modo di tornarci', () => {
  const h = rendi(pagina());
  assert.ok(h.includes('id="ri-consenso"'), 'manca il modo di riaprire la scelta');
  assert.ok(h.indexOf('id="ri-consenso"') < h.indexOf('id="fascia"'),
    'il modo di tornarci deve stare nella pagina, non solo dentro il riquadro che non si vede più');
});

test('i tasti del riquadro rispondono anche a chi aveva già scelto', () => {
  const js = COMPORTAMENTO.slice(COMPORTAMENTO.indexOf("var f = document.getElementById('fascia')"));
  const agganci = js.indexOf("getElementById('fascia-si').onclick");
  const uscita = js.indexOf("if (mem === 'si')");
  assert.ok(agganci >= 0 && uscita >= 0, 'non trovo né gli agganci né le uscite');
  assert.ok(agganci < uscita,
    'i tasti vanno agganciati PRIMA delle uscite: altrimenti chi ha già scelto li trova muti');
});

test('dire di no dopo aver detto di sì vale davvero', () => {
  assert.ok(/if \(caricati\) location\.reload\(\)/.test(COMPORTAMENTO),
    'se i contenuti erano già stati caricati, il «no» deve ricaricare la pagina, non fingere');
});

test('senza contenuti di altri siti non si chiede niente', () => {
  const h = rendi(pagina({ blocchi: [{ tipo: 'link', label: 'Twitch', url: 'https://twitch.tv/x', icona: 'twitch' }] }));
  assert.ok(!h.includes('id="fascia"'), 'nessun contenuto esterno: nessuna domanda');
  assert.ok(!h.includes('id="ri-consenso"'), 'e nessun tasto per una scelta che non esiste');
});

test('in modalità «chiedi» la domanda la fa ogni riquadro, non una fascia sola', () => {
  const h = rendi(pagina({ tema: { consenso: 'chiedi' } }));
  assert.ok(!h.includes('id="fascia"'), 'in modalità «chiedi» non ci va nessuna fascia');
  assert.ok(h.includes('chiedi-b'), 'ma ogni riquadro deve chiedere per conto suo');
});


test('il comportamento della pagina link arriva da un file, non da dentro la pagina', () => {
  // L'edge dichiara `script-src 'self'` senza 'unsafe-inline': uno <script>
  // scritto dentro la pagina viene RIFIUTATO dal browser, e con lui se ne va
  // tutto — il consenso, il tasto che carica i contenuti, il conto alla
  // rovescia. Non si vedeva in locale perche' il banco non manda nessuna CSP.
  const h = rendi(pagina());
  assert.ok(!/<script(?![^>]*\bsrc=)/.test(h), 'e tornato uno script scritto dentro la pagina link');
  assert.ok(h.includes('src="/pagina-link.js'), 'la pagina non chiama il file del suo comportamento');
  assert.ok(h.includes('src="/pagina-link.js'), 'il percorso dev\'essere assoluto: la pagina sta su /u/<nome>');
});
