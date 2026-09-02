// UNA TAVOLOZZA SOLA per tutto quello che si vede senza login.
//
// La pagina pubblica aveva una tavolozza tutta sua, scura fissa, e le guide ne
// avevano un'altra copiata a mano — ferma al viola di due marchi fa. Tre mondi:
// si entrava dal sito e si cambiava prodotto a ogni clic.
//
// La regola: i colori si dichiarano in un posto solo (tema.css) e tutto il resto
// li eredita o li legge da lì. Qui si controlla che nessuno se ne faccia una
// copia.
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
  assert.match(g, /tema\.css/, 'la fonte è dichiarata');
  const { paginaGuida } = await import('../../src/web/guide.js');
  const html = paginaGuida('comandi-chat-twitch');
  const tema = leggi('src/web/public/tema.css');
  const chiaro = tema.slice(tema.indexOf(':root {'), tema.indexOf('}', tema.indexOf(':root {')));
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

// Le pagine semplici (privacy, termini, invito, sblocco) avevano ognuna il suo
// stile in linea, scuro fisso, con i colori scritti a mano. Adesso si appoggiano
// agli stessi due fogli di tutti.
const SEMPLICI = ['privacy.html', 'termini.html', 'mod.html', 'sblocca.html'];

test('le pagine semplici non hanno uno stile tutto loro', () => {
  for (const nome of SEMPLICI) {
    const h = leggi('src/web/public/' + nome);
    assert.doesNotMatch(h, /<style>/, `${nome} non porta più uno stile in linea`);
    for (const t of PALETTE) {
      assert.ok(!new RegExp(`--${t}\\s*:`).test(h), `${nome} non dichiara --${t}`);
    }
  }
});

test('e si vestono con i fogli di tutti, seguendo il tema scelto', () => {
  for (const nome of SEMPLICI) {
    const h = leggi('src/web/public/' + nome);
    for (const f of ['/tema.css', '/pagina.css', '/font.css']) {
      assert.ok(h.includes(`href="${f}"`), `${nome} carica ${f}`);
    }
    assert.ok(h.includes('src="/tema.js"'), `${nome} rispetta il tema scelto`);
  }
});

test('e il foglio comune non si scrive i colori a mano', () => {
  const css = leggi('src/web/public/pagina.css');
  const aMano = css.match(/#[0-9a-fA-F]{3,8}/g) || [];
  // l'unica eccezione: il viola di Twitch sul suo pulsante, e il bianco sul pieno
  assert.deepEqual([...new Set(aMano)].sort(), ['#7c37e0', '#9146ff', '#fff'],
    'gli unici colori scritti a mano sono quelli di Twitch e il bianco sul pieno');
});

test('la vetrina porta alle guide, ai manuali e alle novità', () => {
  const app = leggi('src/web/public/app.js');
  const i = app.indexOf('vt-mappa');
  const blocco = app.slice(i, i + 700);
  for (const via of ['/guide', '/manuale', '/novita', '/?demo=1']) {
    assert.ok(blocco.includes(`href="${via}"`), `dalla vetrina si arriva a ${via}`);
  }
});
