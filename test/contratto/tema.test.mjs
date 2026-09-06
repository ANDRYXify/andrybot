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
import { vetrinaHtml } from '../../src/web/vetrina-vista.js';

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
  // Le uniche eccezioni sono i colori dei MARCHI ALTRUI sui pulsanti di accesso:
  // il viola di Twitch, il verde di Kick, il rosso di YouTube. Non sono colori
  // nostri e non seguono il nostro tema — se li seguissero, il pulsante «Accedi
  // con Kick» sarebbe del colore del sito e nessuno lo riconoscerebbe. Ogni
  // altro colore scritto a mano qui è un colore nostro finito fuori dalla
  // tavolozza, e va rimesso dentro.
  // (#0b0f0a è il quasi-nero con cui Kick scrive sul suo verde: su quel verde
  // il bianco non si legge, e il testo del pulsante deve leggersi.)
  const MARCHI = ['#0b0f0a', '#46d914', '#53fc18', '#7c37e0', '#9146ff', '#d9002b', '#ff0033'];
  assert.deepEqual([...new Set(aMano)].sort(), MARCHI,
    'gli unici colori scritti a mano sono quelli dei marchi altrui');
});

test('la vetrina porta alle guide, ai manuali e alle novità', () => {
  // Si prova quel che ESCE, non dove sta scritto: cosi' spostare la vetrina di
  // file non fa finta che il collegamento sia sparito.
  const h = vetrinaHtml('it');
  for (const via of ['/guide', '/manuale', '/novita', '/?demo=1']) {
    assert.ok(h.includes(`href="${via}"`), `dalla vetrina si arriva a ${via}`);
  }
});

// ── I SUGGERIMENTI AL PASSAGGIO DEL CURSORE ────────────────────────────────
// Erano il `title` del browser: quella scatoletta non la disegna il sito, la
// disegna il sistema operativo — e non è stilabile in nessun modo. Su un sito
// con un tema suo, in mezzo a tutto il resto, si vedeva che veniva da fuori.

test('i suggerimenti li disegna il sito, non il sistema operativo', () => {
  const js = leggi('src/web/public/aiuto.js');
  const html = leggi('src/web/public/index.html');
  const css = leggi('src/web/public/style.css');

  assert.match(html, /<script type="module" src="aiuto\.js"/, 'la bolla è caricata dove le persone passano il cursore');
  assert.match(js, /removeAttribute\('title'\)/,
    'il `title` va TOLTO: lasciandolo, il browser disegna la sua scatoletta sopra la nostra');
  assert.match(js, /data-aiuto/, 'e il testo si conserva altrove, o il suggerimento sparisce');

  // Il colore del testo sta sulla bolla; fondo e contorno stanno sulla FORMA,
  // perché adesso il balloon è disegnato — corpo e coda in un tracciato solo.
  const bolla = css.slice(css.indexOf('.aiuto-bolla {'), css.indexOf('.aiuto-guscio'));
  const forma = css.slice(css.indexOf('.aiuto-forma {'), css.indexOf('.aiuto-ombra'));
  assert.ok(bolla && forma, 'la bolla ha il suo stile');
  // Si cerca la DICHIARAZIONE, non la riga: due dichiarazioni possono stare
  // sulla stessa riga, e cercare per riga direbbe di no a un CSS giusto.
  for (const [dove, prop, atteso] of [[bolla, 'color', '--testo'], [forma, 'fill', '--surface'], [forma, 'stroke', '--contorno']]) {
    const m = dove.match(new RegExp('(?:^|[;{\\s])' + prop + ':\\s*([^;]+)'));
    assert.ok(m, `la bolla dichiara ${prop}`);
    assert.ok(m[1].includes('var(' + atteso), `la bolla prende ${prop} dal tema (${atteso}), non da un colore scritto a mano: ${m[1].trim()}`);
  }
});

test('e si vedono anche con la tastiera, cosa che il browser non faceva', () => {
  // Il `title` del browser compare SOLO col cursore. Chi naviga con il tasto di
  // tabulazione non lo vedeva mai: l'aiuto c'era e non arrivava a chi serviva.
  const js = leggi('src/web/public/aiuto.js');
  assert.match(js, /'focusin'/, 'compare anche arrivandoci col tasto di tabulazione');
  assert.match(js, /aria-describedby/, 'e chi legge lo schermo sa che quella bolla descrive quel comando');
  assert.match(js, /pointerType === 'touch'/,
    'sul telefono no: un suggerimento al passaggio del dito è un suggerimento che non se ne va più');
});
