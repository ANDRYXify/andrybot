// LA COPERTINA SE NE VA QUANDO C'E' QUALCOSA DA VEDERE.
//
// La copertina del caricamento aveva un orologio: dopo sette secondi se ne
// andava comunque. Nella vetrina va bene, perche' la pagina arriva gia' scritta
// dal server. Nel pannello no: la pagina la scrive l'app, e con una linea lenta,
// o al primo caricamento dopo un aggiornamento, l'app arriva dopo. Andata via la
// copertina restava il guscio nudo, bianco, col solo piede del sito in fondo.
//
// Adesso nel pannello la copertina se ne va quando l'app ha disegnato (o ha
// scritto che non riesce a parlare col server). Se ci mette, lo dice; se ci mette
// troppo, o l'app non si scarica, compare «Riprova». Mai una pagina vuota.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (via) => readFileSync(new URL(`../../${via}`, import.meta.url), 'utf8');
const SPLASH = leggi('src/web/public/splash.js');
const PANNELLO = leggi('src/web/public/splash-pannello.js');
const ANIME = leggi('src/web/public/anime.css');
const APP = leggi('src/web/public/app.js');
const INDEX = leggi('src/web/public/index.html');

test('nel pannello la copertina non se ne va a tempo', () => {
  assert.match(SPLASH, /if \(document\.body\.classList\.contains\('vetrina'\)\) setTimeout\(via, 7000\);\n\}\)\(\);/,
    'l\'orologio vale solo per la vetrina, che arriva gia\' scritta');
  assert.equal((SPLASH.match(/setTimeout\(via\b/g) || []).length, 1, 'e nessun altro orologio la toglie');
  assert.doesNotMatch(PANNELLO, /SB_SPLASH_OFF|\bvia\(\)/, 'la parte del pannello non la toglie mai');
  assert.match(SPLASH, /window\.SB_SPLASH_OFF = via;/, 'la toglie chi ha qualcosa da mostrare');
  const avvio = APP.slice(APP.indexOf('async function caricaStato('), APP.indexOf('\n}\n', APP.indexOf('async function caricaStato(')));
  assert.match(avvio, /render\(\);\n\s*mostraNovita\(\);\n\s*window\.SB_SPLASH_OFF\?\.\(\);/, 'dopo aver disegnato il pannello');
  assert.match(avvio, /app\.innerHTML = _pagineDiProprieta\(\)[\s\S]*?window\.SB_SPLASH_OFF\?\.\(\);\n\s*return;/, 'o dopo aver scritto che il server non risponde');
});

test('se ci mette lo dice, e se non arriva si puo\' riprovare', () => {
  assert.match(PANNELLO, /setTimeout\(function \(\) \{ di\(t\[0\]\); \}, 6000\);/, 'dopo sei secondi dice che ci vuole ancora un attimo');
  assert.match(PANNELLO, /setTimeout\(riprova, 25000\);/, 'dopo venticinque compare «Riprova»');
  assert.match(PANNELLO, /x\.tagName === 'SCRIPT' && \/\\\/\(app\|disegno\)\\\.\/\.test\(x\.src \|\| ''\)\) riprova\(\);/, 'e subito, se l\'app non si scarica');
  assert.match(PANNELLO, /b\.addEventListener\('click', function \(\) \{ location\.reload\(\); \}\);/);
  for (const l of ['it', 'en', 'es']) assert.match(PANNELLO, new RegExp(`${l}: \\['[^']+', '[^']+', '[^']+'\\]`), `nelle tre lingue: ${l}`);
  assert.match(ANIME, /#splash \.sp-riprova \{[^}]*border: 2px solid currentColor;/, 'il tasto ha il suo aspetto');
});

test('la parte del pannello la vetrina non la scarica', () => {
  assert.ok(INDEX.includes('<script src="/splash.js" defer></script>\n  <script src="/splash-pannello.js" defer></script>'), 'il pannello la carica subito dopo la copertina');
  const vista = leggi('src/web/vetrina-vista.js');
  const risorse = vista.slice(vista.indexOf('RISORSE_VETRINA'), vista.indexOf('];', vista.indexOf('RISORSE_VETRINA')));
  assert.ok(!risorse.includes('splash-pannello.js'), 'fuori dalle risorse della vetrina: la home resta leggera');
});
