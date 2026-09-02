// UNA TAVOLOZZA SOLA per tutto quello che si vede senza login.
//
// La pagina pubblica aveva una tavolozza tutta sua, scura fissa, e le guide ne
// avevano un'altra copiata a mano — ferma al viola di due marchi fa. Tre mondi:
// si entrava dal sito e si cambiava prodotto a ogni clic.
//
// La regola: i colori si dichiarano in un posto solo (anime.css) e tutto il
// resto li eredita o li legge da lì. Qui si controlla che nessuno se ne faccia
// una copia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

// I colori del prodotto: chi li ridefinisce si stacca dal marchio.
const PALETTE = ['bg', 'surface', 'surface-2', 'testo', 'testo-2', 'acc', 'acc-600', 'acc-soft', 'acc-bordo'];

test('la vetrina non ha una tavolozza sua: usa quella del sito', () => {
  const css = leggi('src/web/public/vetrina.css');
  const i = css.indexOf('body.vetrina {');
  assert.ok(i >= 0, 'il blocco della vetrina c’è');
  const blocco = css.slice(i, css.indexOf('}', i));
  const propri = PALETTE.filter((t) => new RegExp(`--${t}\\s*:`).test(blocco));
  assert.deepEqual(propri, [], 'la vetrina ridefinisce colori che sono del sito');
});

test('lo schermo finto resta scuro, e lo dice una volta sola', () => {
  const css = leggi('src/web/public/vetrina.css');
  const i = css.indexOf('.vt-schermo {');
  const blocco = css.slice(i, css.indexOf('}', i));
  for (const t of ['testo', 'surface', 'border']) {
    assert.match(blocco, new RegExp(`--${t}\\s*:`), `dentro lo schermo --${t} è dichiarato`);
  }
});

test('le guide leggono i colori dal sito, non da una copia', async () => {
  const g = leggi('src/web/guide.js');
  assert.match(g, /anime\.css/, 'la fonte è dichiarata');
  const { paginaGuida } = await import('../../src/web/guide.js');
  const html = paginaGuida('comandi-chat-twitch');
  const anime = leggi('src/web/public/anime.css');
  const chiaro = anime.slice(anime.indexOf(':root {'), anime.indexOf('}', anime.indexOf(':root {')));
  for (const t of ['bg', 'acc', 'testo']) {
    const atteso = chiaro.match(new RegExp(`--${t}:\\s*([^;]+);`))[1].trim();
    assert.ok(html.includes(`--${t}:${atteso}`), `la guida usa il ${t} del sito (${atteso})`);
  }
});

test('le guide seguono anche il tema scelto, non solo quello del sistema', async () => {
  const { paginaGuida, paginaIndice } = await import('../../src/web/guide.js');
  for (const html of [paginaGuida('comandi-chat-twitch'), paginaIndice()]) {
    assert.match(html, /data-theme="dark"/, 'c’è la variante per la scelta scura');
    assert.match(html, /:root:not\(\[data-theme="light"\]\)/, 'la scelta chiara vince sul sistema');
    assert.match(html, /src="\/tema\.js"/, 'e qualcuno la applica');
  }
});

test('la vetrina porta alle guide, ai manuali e alle novità', () => {
  const app = leggi('src/web/public/app.js');
  const i = app.indexOf('vt-mappa');
  const blocco = app.slice(i, i + 700);
  for (const via of ['/guide', '/manuale', '/novita', '/?demo=1']) {
    assert.ok(blocco.includes(`href="${via}"`), `dalla vetrina si arriva a ${via}`);
  }
});
