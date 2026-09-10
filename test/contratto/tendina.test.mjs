// LA TENDINA DELL'OVERLAY, COERENTE CON IL RESTO.
//
// Il menu' aperto di un <select> lo disegna il SISTEMA OPERATIVO: grigio,
// traslucido, con la spunta di macOS. Nessuna riga di CSS puo' cambiarlo, e in
// mezzo a un'interfaccia disegnata a mano si vede.
//
// La scelta fatta qui, e le sue ragioni:
//
//  · la tendina VESTE il <select> vero invece di sostituirlo. Lo stato resta uno
//    solo, il codice che ascolta `change` non si tocca, e non ci sono due verita'
//    da tenere d'accordo;
//  · su schermo tattile non si veste: li' il sistema da' la ruota, che e' meglio
//    di qualunque cosa possiamo disegnare noi;
//  · e' una funzione sola, riusabile: nel pannello ci sono 104 select, e una
//    seconda tendina scritta a mano sarebbe il difetto di casa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const css = readFileSync(join(RAD, 'src/web/public/anime.css'), 'utf8');

test('veste il select vero, non lo sostituisce', () => {
  const i = app.indexOf('function vestiTendina(');
  assert.ok(i > 0, 'la funzione esiste');
  const f = app.slice(i, app.indexOf('\nfunction ', i + 10));
  assert.ok(/sel\.selectedIndex = i/.test(f), 'la scelta finisce nel select');
  assert.ok(/dispatchEvent\(new Event\('change'/.test(f), 'e chi ascoltava il change continua a funzionare');
  assert.ok(/pointer: coarse/.test(f), 'su schermo tattile resta la ruota del sistema');
  assert.ok(/MutationObserver/.test(f), 'e se il select cambia da codice, il bottone lo segue');
});

test('si sa come si chiama, anche per chi non vede', () => {
  const i = app.indexOf('function vestiTendina(');
  const f = app.slice(i, app.indexOf('\nfunction ', i + 10));
  assert.ok(/aria-haspopup', 'listbox'/.test(f) && /aria-expanded/.test(f), 'dice che apre un elenco, e se e\' aperto');
  assert.ok(/role', 'listbox'/.test(f) && /role', 'option'/.test(f), 'l\'elenco e le voci hanno il loro ruolo');
  assert.ok(/aria-selected/.test(f), 'e si sa quale e\' scelta');
  assert.ok(/label\[for=/.test(f), 'il nome lo prende dall\'etichetta che c\'era gia\'');
});

test('la tastiera la usa senza mouse', () => {
  const i = app.indexOf('function vestiTendina(');
  const f = app.slice(i, app.indexOf('\nfunction ', i + 10));
  for (const t of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape', 'Enter']) {
    assert.ok(f.includes(`'${t}'`), `manca ${t}`);
  }
});

test('e\' vestita dove il pannello si collega', () => {
  // Il collegamento: senza, il componente funziona e in pagina non si vede.
  assert.ok(/vestiTendina\(_g\('ovl-quale'\)\)/.test(app), 'la tendina dell\'overlay viene vestita');
});

test('lo stile parla la lingua del resto', () => {
  const i = css.indexOf('.tendina {');
  assert.ok(i > 0, 'lo stile esiste');
  const s = css.slice(i, i + 2600);
  assert.ok(/var\(--contorno\)/.test(s), 'il contorno e\' quello di casa');
  assert.ok(/var\(--ang-mano\)/.test(s), 'gli angoli sono quelli disegnati a mano');
  assert.ok(/prefers-reduced-motion/.test(s), 'e chi tiene spento il movimento non lo subisce');
  // il select vero resta raggiungibile: nascosto alla vista, non tolto
  assert.ok(/\.tendina-vero[\s\S]{0,200}clip-path/.test(s), 'il select si nasconde senza sparire');
  assert.ok(!/display:\s*none[^;]*;\s*\}/.test(css.slice(css.indexOf('.tendina-vero'), css.indexOf('.tendina-vero') + 200)),
    'e non con display:none, che lo toglierebbe anche a chi legge lo schermo');
});

test('non serve ricordarsi di vestirle: si vestono da sé', () => {
  // La tendina esisteva ed era riusabile, ma andava chiamata a mano su ogni
  // select — e infatti su 104 select era chiamata su UNO. Se ci si deve
  // ricordare, prima o poi ci si dimentica: me ne sono dimenticato io, e i menù
  // nuovi uscivano col grigio del sistema in mezzo a un'interfaccia disegnata.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  assert.match(app, /function vestiOgniTendina\(/, 'c\'è un posto solo che le veste tutte');
  assert.match(app, /select:not\(\.tendina-vero\)/, 'e prende quelle non ancora vestite');
  assert.match(app, /new MutationObserver\(/, 'e guarda quello che compare dopo, non solo quello che c\'è all\'avvio');
  assert.match(app, /requestAnimationFrame\(giro\)/, 'una passata per disegno, non una per ogni nodo che cambia');
});
