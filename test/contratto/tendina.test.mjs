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
  // Le regole della tendina, tutte, senza una finestra di tanti byte: una
  // finestra fissa diventa rossa il giorno che si aggiunge una riga, e quel
  // rosso non parla dello stile — parla della misura.
  const s = (css.match(/^[^{}]*\.tendina[^{}]*\{[^}]*\}/gm) || []).join('\n');
  assert.ok(s.length > 400, 'non trovo le regole della tendina');
  assert.ok(/var\(--contorno\)/.test(s), 'il contorno e\' quello di casa');
  assert.ok(/var\(--ang-mano\)/.test(s), 'gli angoli sono quelli disegnati a mano');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]{0,240}?\.tendina-btn/,
    'e chi tiene spento il movimento non lo subisce');
  // il select vero resta raggiungibile: nascosto alla vista, non tolto
  assert.ok(/\.tendina-vero[\s\S]{0,200}clip-path/.test(css), 'il select si nasconde senza sparire');
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
  // Si vestono nella stessa microtask in cui entrano, quindi prima di qualunque
  // disegno: con un requestAnimationFrame una riga nata dentro un fotogramma
  // mostrava per un fotogramma il menu del sistema. E si guarda solo quello che
  // entra, non tutta la pagina a ogni cambiamento.
  assert.match(app, /for \(const m of mosse\) m\.addedNodes\.forEach\(vesti\);/, 'si veste quello che entra, subito');
  assert.doesNotMatch(app, /requestAnimationFrame\(giro\);\n\s*\}\)\.observe\(document\.documentElement/, 'non al fotogramma dopo');
});

// UNA TENDINA NON LA TAGLIA IL SUO CONTENITORE.
//
// La lista si apriva dentro la carta che la contiene, e quella carta ha
// `overflow: hidden`: con tre ruoli si vedeva tutto, con dieci la lista veniva
// mozzata a meta' e nessuno collegava la cosa al contenitore. Non e' un caso
// raro — e' il caso normale di chi ha un server vero.
//
// Due difetti, uno dentro l'altro. Mettere la lista `position: fixed` non basta:
// un antenato con una trasformazione (le carte ne hanno una, per l'entrata)
// diventa il riferimento anche del fixed, e la lista resta intrappolata lo
// stesso. L'unica cosa che funziona sempre e' portarla FUORI da quel ramo.
test('quando si apre, la lista esce dal ramo che la taglierebbe', () => {
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const i = app.indexOf('const apri = () => {');
  assert.ok(i > 0, 'non trovo l\'apertura della tendina');
  const apre = app.slice(i, i + 700);
  assert.match(apre, /document\.body\.appendChild\(lista\)/,
    'la lista resta dentro la carta: il primo contenitore che taglia se la mangia');
  assert.match(apre, /posiziona\(\)/, 'e va messa dove sta il tasto, visto che ora e\' fuori');
  const j = app.indexOf('const chiudi = (tornaAlBottone) => {');
  assert.match(app.slice(j, j + 500), /guscio\.appendChild\(lista\)/,
    'e quando si chiude torna a casa sua');
  assert.match(readFileSync(join(RAD, 'src/web/public/anime.css'), 'utf8'),
    /\.tendina-lista\.volante \{[^}]*position: fixed/, 'manca lo stile di quella che vola');
});

test('e non si chiude da sola mentre la si scorre', () => {
  // Chiudere quando la PAGINA scorre e' giusto: la lista e' ancorata a un tasto
  // che si sposta. Chiudere quando scorre LA LISTA no, ed e' quello che
  // succedeva: scorrere le voci la faceva sparire sotto le dita.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const i = app.indexOf('const viaAllaSvelta = ');
  assert.ok(i > 0, 'non trovo chi chiude quando si scorre');
  assert.match(app.slice(i, i + 220), /lista\.contains\(e\.target\)\) return;/,
    'scorrere dentro la lista la chiude');
  // e nemmeno portare in vista una voce deve muovere la pagina
  assert.ok(!/el\[evidenziato\]\.scrollIntoView/.test(app),
    'portare in vista una voce scorre la pagina, e la pagina che scorre chiude la lista');
});
