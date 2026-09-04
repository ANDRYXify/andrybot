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
import { renderLinkPage } from '../../src/features/linkpagina.js';

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
  const h = rendi(pagina());
  const js = h.slice(h.indexOf("var f = document.getElementById('fascia')"));
  const agganci = js.indexOf("getElementById('fascia-si').onclick");
  const uscita = js.indexOf("if (mem === 'si')");
  assert.ok(agganci >= 0 && uscita >= 0, 'non trovo né gli agganci né le uscite');
  assert.ok(agganci < uscita,
    'i tasti vanno agganciati PRIMA delle uscite: altrimenti chi ha già scelto li trova muti');
});

test('dire di no dopo aver detto di sì vale davvero', () => {
  const h = rendi(pagina());
  assert.ok(/if \(caricati\) location\.reload\(\)/.test(h),
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
