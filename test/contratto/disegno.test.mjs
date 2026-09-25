// IL SITO SI DISEGNA: LE REGOLE CHE LO RENDONO GIUSTO PER COSTRUZIONE.
//
// Cambiando sezione la pagina vecchia si disegna all'indietro e la nuova si
// disegna: matita, china, retino, pulizia. Lo fa un modulo solo
// (src/web/public/disegno.js), che guarda le classi con cui l'app dice gia' cosa
// succede (`visibile`, `dentro`, `esce`, `menu-aperto`...) e disegna quello che
// entra. Il ragionamento sta in docs/DISEGNO.md; qui le regole che devono
// restare vere senza aprire un browser (quello lo fa scripts/verifica-stacco.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (via) => readFileSync(new URL(`../../${via}`, import.meta.url), 'utf8');
// Il disegno sta in due file: quello di tutte le pagine, e quello che solo il
// pannello carica (menu', scena, urlo, cornici). Le regole valgono su tutti e due.
const NUCLEO = leggi('src/web/public/disegno.js');
const PANNELLO = leggi('src/web/public/disegno-pannello.js');
const DG = NUCLEO + '\n' + PANNELLO;
const APP = leggi('src/web/public/app.js');
const ANIME = leggi('src/web/public/anime.css');
const VETRINA = leggi('src/web/public/anime-vetrina.css');
const STILE = leggi('src/web/public/style.css');
const CERCA = leggi('src/web/public/cerca.js');

const corpoDi = (testo, nome) => {
  const i = testo.search(new RegExp(`function ${nome}\\(`));
  assert.ok(i >= 0, `c'e' ${nome}`);
  return testo.slice(i, testo.indexOf('\n  }\n', i));
};

test('si disegna solo quello che ha un contorno, e la china ricalca il bordo vero', () => {
  const m = corpoDi(DG, 'misura');
  assert.match(m, /return !\(st\['border' \+ x \+ 'Style'\] === 'none' \|\| \(parseFloat\(st\['border' \+ x \+ 'Width'\]\) \|\| 0\) < 0\.5 \|\| trasparente\);/,
    'un lato c\'e\' se ha uno stile, uno spessore e un colore che si vede');
  assert.match(m, /: !primo \? null :/, 'senza nessun lato non c\'e\' niente da ripassare');
  assert.match(m, /var coperto = \['dg-in', 'dg-out'\]\.filter/, 'e il bordo e\' quello vero, non quello coperto da un disegno in corso');
  assert.ok(m.indexOf('coperto.forEach(function (c) { el.classList.remove(c); });') < m.indexOf('var st = getComputedStyle(el);')
    && m.indexOf('coperto.forEach(function (c) { el.classList.add(c); });') > m.indexOf('var visibile = st.visibility !== \'hidden\';'), 'si legge a classi tolte, e si rimettono dopo');
  assert.match(m, /\['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'\]\.map/, 'ogni angolo col suo raggio');
  assert.match(m, /return \[misurato\(v\[0\], r\.width\), misurato\(v\[1\] \|\| v\[0\], r\.height\)\];/, 'in orizzontale e in verticale');
  assert.match(corpoDi(DG, 'disegnabile'), /return !!\(m\.bordo \|\| \(o && o\.retino\)\) && m\.visibile &&/, 'e si disegna solo quello che si vede: col contorno, o col solo retino chi non ne ha');
  const t = corpoDi(DG, 'piano');
  assert.match(t, /contorno\(w, h, bd, caso\(seme \+ ':china'\)\)/, 'col bordo intero: lati, angoli, spessore');
  assert.match(t, /\{ 'stroke-width': Math\.max\(1, bd\.sp\), stroke: bd\.colore \}/, 'e col suo colore');
  assert.match(t, /if \(bd\.lati && !bd\.lati\[i\]\) return;/, 'la matita abbozza solo i lati che ci sono');
  const c = corpoDi(DG, 'contorno');
  assert.match(c, /var m = bd\.sp \/ 2;/, 'il tratto sta al centro del bordo, dove il bordo e\'');
  assert.match(c, /var k = Math\.min\(1, w \/ \(\(A\[0\]\[0\] \+ A\[1\]\[0\]\) \|\| 1\)/, 'i raggi che si sovrappongono si riducono come nel CSS');
  assert.match(c, /var t = L\[\(i \+ 3\) % 4\] \? q\[i\]\[asse\(i\)\] : -m;/, 'un lato che finisce su un lato mancante arriva fino al bordo');
  assert.match(c, /if \(L\[0\] && L\[1\] && L\[2\] && L\[3\]\) \{/, 'con quattro lati il tracciato e\' chiuso, come prima');
});

// Il cassetto del telefono ha tre lati: il destro sta sul bordo dello schermo.
// La china ne tracciava quattro, e il quarto spariva a disegno finito.
test('la china ricalca il bordo vero anche quando un lato non c\'e\'', () => {
  const src = corpoDi(DG, 'contorno') + '\n  }';
  const f = (n) => Math.round(n * 10) / 10;
  const r = () => 0.5;
  const contorno = new Function('f', 'return ' + src.replace(/^function contorno/, 'function'))(f);
  const pieno = contorno(300, 120, { sp: 2, lati: [true, true, true, true], angoli: [[8, 8], [8, 8], [8, 8], [8, 8]] }, r);
  assert.match(pieno, /^M[^M]*$/, 'quattro lati: un tratto solo, chiuso su se stesso');
  assert.equal((pieno.match(/Q/g) || []).length, 4, 'e quattro angoli');
  const cassetto = contorno(320, 800, { sp: 2, lati: [true, false, true, true], angoli: [[26, 16], [0, 0], [0, 0], [22, 26]] }, r);
  const punti = [...cassetto.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]);
  assert.equal((cassetto.match(/Q/g) || []).length, 2, 'tre lati: solo i due angoli fra lati veri');
  assert.deepEqual(punti[0], [320, 799], 'parte dal bordo destro, in fondo');
  assert.deepEqual(punti[punti.length - 1], [320, 1], 'e finisce sul bordo destro, in alto');
  for (let i = 1; i < punti.length; i++) {
    assert.ok(!(punti[i - 1][0] > 316 && punti[i][0] > 316 && Math.abs(punti[i - 1][1] - punti[i][1]) > 400), 'nessun tratto corre lungo il lato destro');
  }
});

test('la tela ha la scatola dell\'elemento: quello che sborda non allarga la pagina', () => {
  const p = corpoDi(DG, 'posa');
  assert.match(p, /t\.s\.setAttribute\('width', t\.w\);/);
  assert.match(p, /t\.s\.setAttribute\('height', t\.h\);/);
  assert.match(p, /t\.s\.setAttribute\('viewBox', '0 0 ' \+ t\.w \+ ' ' \+ t\.h\);/);
  assert.match(ANIME, /\.dg-tela \{ position: absolute; pointer-events: none; overflow: visible; max-width: none; \}/, 'i tratti fuori scatola sono inchiostro, non spazio');
  assert.match(STILE, /img, svg, video \{ max-width: 100%; \}/, 'il sito stringe ogni svg dentro al suo contenitore');
  for (const [nome, css] of [['anime.css', ANIME], ['anime-vetrina.css', VETRINA]]) {
    assert.match(css, /\.dg-tela \{[^}]*max-width: none;/, `${nome}: la tela non si fa stringere: i tratti si rimpicciolirebbero`);
  }
  assert.match(ANIME, /\.dg-sagoma \{[^}]*max-width: none;/, 'e nemmeno la nuvoletta, che sborda dalla sua carta');
});

test('la tela segue l\'elemento e si rifa\' sulla misura nuova', () => {
  const p = corpoDi(DG, 'posa');
  assert.match(p, /for \(var i = 0; i < t\.tracce\.length; i\+\+\) t\.tracce\[i\]\.p\.setAttribute\('d', t\.tracce\[i\]\.fa\(t\.w, t\.h\)\);/,
    'ogni tratto e\' una funzione della misura');
  assert.match(corpoDi(DG, 'tela'), /p\.setAttribute\('pathLength', '1'\);/, 'e la china avanza in frazione: continua da dove era');
});

test('prima si misura tutto, poi si scrive', () => {
  const prima = (testo, legge, scrive, cosa) => {
    const a = testo.indexOf(legge), b = testo.indexOf(scrive);
    assert.ok(a >= 0 && b > a, cosa);
  };
  prima(corpoDi(DG, 'giro'), 'var misure = tele.map(', 'posa(t, misure[i])', 'il giro delle tele legge tutto e poi sposta');
  prima(corpoDi(DG, 'esegui'), 'var misure = giro1.map(function (x) { return misura(x[0]); });', 'traccia(', 'la coda misura tutto e poi disegna');
  prima(corpoDi(DG, 'scena'), 'var misure = tutte.map(function (x) { return misura(x[0]); });', 'traccia(', 'la scena misura tutto e poi disegna');
  for (const nome of ['traccia', 'sfila', 'componi', 'piano', 'tela']) {
    assert.doesNotMatch(corpoDi(DG, nome), /getBoundingClientRect|getComputedStyle/, `${nome}: chi disegna non misura`);
  }
  const e = corpoDi(DG, 'esceScena');
  assert.ok(e.indexOf('var misure = tutte.map(function (x) { return misura(x[0]); });') >= 0 && e.indexOf('sfila(') > e.indexOf('var misure'), 'anche chi esce misura tutto e poi disegna');
});

test('la scena si disegna in ordine di lettura', () => {
  const s = corpoDi(DG, 'scena');
  assert.match(s, /\.sort\(function \(x, y\) \{ return \(x\[1\]\.r\.top - y\[1\]\.r\.top\) \|\| \(x\[1\]\.r\.left - y\[1\]\.r\.left\); \}\)/);
  assert.match(s, /x\[2\]\.da = i \* PASSO_FILA; traccia\(x\[0\], x\[1\], x\[2\]\);/);
  // Della scena fa parte la testata: il riquadro «Come funziona», la barra
  // delle sorelle, la descrizione, i tasti. Il titolo entra parola per parola
  // (e' il lettering) e non si ridisegna; uscendo, si ricopre come il resto.
  const v = corpoDi(DG, 'vignetteDellaScena');
  assert.match(v, /document\.getElementById\('pagina-testata'\)/, 'con la testata');
  assert.match(v, /\(!uscendo && c\.tagName === 'H1'\)\) return;/, 'tranne il titolo entrando');
  assert.match(v, /tutte\.push\(\[c, !contornato\(c\)\]\);/, 'e chi non ha contorno si scopre col retino');
  assert.match(s, /vignetteDellaScena\(pannello, false\)/);
  assert.match(corpoDi(DG, 'esceScena'), /vignetteDellaScena\(pannello, true\)/, 'e se ne vanno le stesse vignette che si erano disegnate, titolo compreso');
});

test('il livello si ricava: sopra al suo elemento, sotto a barre e menu', () => {
  const m = corpoDi(DG, 'misura');
  assert.match(m, /var z = 10, inFisso = false;/);
  assert.match(m, /if \(\(sa\.position === 'fixed' \|\| sa\.position === 'sticky'\) && sa\.zIndex !== 'auto'\) z = Math\.max\(z, parseInt\(sa\.zIndex, 10\) \+ 1\);/);
  const barra = Number((STILE.match(/position: sticky; top: 0; z-index: (\d+); height: var\(--top-h\);/) || [])[1]);
  assert.ok(barra > 10, 'il contenuto si disegna sotto la barra in alto');
});

test('disegnare una carta la rivela, e il retino finisce opaco', () => {
  assert.match(corpoDi(DG, 'traccia'), /if \(el\.classList\.contains\('rivela'\)\) el\.classList\.add\('dentro'\);/,
    'una carta disegnata in fondo allo schermo non sparisce quando il disegno finisce');
  assert.match(ANIME, /repeating-linear-gradient\(-38deg, #000 0 var\(--mt-t\), transparent var\(--mt-t\) 7px\)/);
  assert.match(ANIME, /@keyframes dg-retino \{ from \{ --mt-t: 0px; \} to \{ --mt-t: 7px; \} \}/, 'alla fine la riga piena e\' larga quanto il passo');
  assert.match(ANIME, /animation: dg-retino var\(--dg-retino, 170ms\) steps\(3, jump-end\) var\(--dg-da-retino, 0ms\) both;/, 'e resta li\'');
});

test('si disegna in ogni caso, anche per chi chiede meno movimento', () => {
  // Il disegno e' il modo in cui le cose compaiono e se ne vanno, non un
  // movimento in piu': «meno movimento» ferma lo scorrere morbido, le cose che
  // volano, le pulsazioni. Non c'e' nessun interruttore che lo spenga.
  assert.doesNotMatch(DG, /prefers-reduced-motion|meno-moto|function meno\(/, 'il modulo non ha un interruttore che spenga il disegno');
  const i = STILE.indexOf('  *, *::before, *::after { transition-duration: .001ms !important;');
  const inizio = STILE.lastIndexOf('@media (prefers-reduced-motion: reduce) {', i);
  assert.ok(i > 0 && inizio > 0 && !STILE.slice(inizio, i).includes('\n}\n'), 'la regola che ferma tutto sta in «meno movimento»');
  const blocco = STILE.slice(inizio, STILE.indexOf('\n}\n', i));
  assert.match(blocco, /\n {2}:not\(\.dg-in, \.dg-out, \.dg-tela, \.dg-tela \*, \[data-disegno\], \[data-disegno\] \*\), ::before, ::after \{ animation-duration: \.001ms !important; animation-iteration-count: 1 !important; \}/,
    'e riduce a niente ogni animazione tranne i tratti, il retino e i disegni che si fanno da se\' (le nuvolette)');
  assert.doesNotMatch(blocco, /\*, \*::before, \*::after \{[^}]*animation-duration/, 'nessuna regola che valga anche per il disegno');
  assert.doesNotMatch(blocco, /\.carta\.rivela \{ opacity: 1/, 'le carte aspettano il loro disegno come per tutti');
  const rivela = APP.slice(APP.indexOf('function rivelaCarte('), APP.indexOf('\n}\n', APP.indexOf('function rivelaCarte(')));
  assert.doesNotMatch(rivela, /_menoMoto/, 'le carte si rivelano quando arrivano, anche con meno movimento');
  const vai = APP.slice(APP.indexOf('function vaiAScheda('), APP.indexOf('\n}\n', APP.indexOf('function vaiAScheda(')));
  assert.doesNotMatch(vai, /_menoMoto/, 'e cambiando sezione la scena vecchia si disfa sempre');
  // Uscire e' disfarsi: il tempo che l'app aspetta prima di togliere una cosa
  // e' quello del disegno all'indietro, e con meno movimento non si accorcia.
  // Prima scendeva a un centesimo di millisecondo, e la scena, gli avvisi e le
  // finestre sparivano mentre cominciavano a disfarsi.
  for (const [nome, css] of [['anime.css', ANIME], ['anime-vetrina.css', VETRINA]]) {
    assert.equal((css.match(/--t-uscita:/g) || []).length, 1, `${nome}: il tempo dell'uscita e' uno, e non cambia con meno movimento`);
  }
});

test('il disegno ascolta le classi che l\'app scrive davvero', () => {
  assert.match(APP, /p\.classList\.toggle\('visibile', p\.dataset\.scheda === id\)/, 'la scheda nuova');
  assert.match(APP, /for \(const p of document\.querySelectorAll\('\.pannello-scheda\.visibile'\)\) p\.classList\.add\('esce'\);/, 'la scheda che esce');
  assert.match(APP, /if \(v\.isIntersecting\) \{ v\.target\.classList\.add\('dentro'\);/, 'la carta che arriva');
  assert.match(APP, /el\.className = 'toast' \+/, 'l\'avviso');
  assert.match(APP, /el\.className = 'bv-velo/, 'la finestra');
  assert.match(APP, /velo\.className = 'giro-velo';/, 'la visita guidata');
  assert.match(APP, /document\.body\.classList\.add\('menu-aperto'\)/, 'il menu');
  assert.match(CERCA, /classList\.add\('aperto'\)/, 'la ricerca');
});

test('uscire e\' il disegno all\'indietro, e sta dentro il tempo che l\'app aspetta', () => {
  const c = corpoDi(DG, 'componi');
  assert.match(c, /return indietro \? \{ da: RITORNO \* \(p\.fine - x\.da - x\.dur\), dur: RITORNO \* x\.dur \} : \{ da: x\.da, dur: x\.dur \};/,
    'la stessa linea del tempo, ribaltata e compressa');
  assert.match(c, /x\.classe \+ \(indietro \? ' dg-sfila' : ' dg-traccia'\)/, 'gli stessi tratti, che si ritirano');
  assert.match(ANIME, /@keyframes dg-sfila \{ from \{ stroke-dashoffset: 0; \} to \{ stroke-dashoffset: 1; \} \}/);
  assert.match(ANIME, /@keyframes dg-copri \{ from \{ --mt-t: 7px; \} to \{ --mt-t: 0px; \} \}/, 'il retino ricopre il contenuto');
  assert.match(ANIME, /\.dg-matite\.dg-torna \{ animation-name: dg-torna; animation-fill-mode: both; \}/, 'la matita torna prima di ritirarsi');
  const num = (re) => Number((DG.match(re) || [])[1]);
  const fine = num(/var daChina = da \+ (\d+) \* k/) + num(/tChina = (\d+) \* k/) + num(/var PULIZIA = (\d+);/);
  const uscita = fine * num(/var RITORNO = ([\d.]+);/);
  const attesa = Number((ANIME.match(/--t-uscita: (\d+)ms;/) || [])[1]);
  assert.ok(uscita > 0 && uscita <= attesa, `il disegno all'indietro dura ${uscita} ms, l'app aspetta ${attesa} ms`);
  const avviso = APP.slice(APP.indexOf('function toast('), APP.indexOf('\n}\n', APP.indexOf('function toast(')));
  assert.match(avviso, /setTimeout\(\(\) => el\.remove\(\), _duraUscita\(\) \+ 20\);/, 'l\'avviso se ne va quando si e\' disfatto');
  assert.doesNotMatch(APP, /\.remove\(\), 2\d0\)/, 'nessuna finestra se ne va a un tempo suo');
  for (const [nome, css] of [['anime.css', ANIME], ['anime-vetrina.css', VETRINA]]) {
    assert.match(css, new RegExp(`--t-uscita: ${attesa}ms;`), `${nome}: la stessa durata`);
  }
});

test('chi si disfa non resta nascosto', () => {
  const sf = corpoDi(DG, 'sfila');
  assert.match(sf, /if \(!el\.dataset\.dgOut\) return;\n\s*el\.classList\.remove\('dg-out'\);/, 'se nessuno lo toglie, torna a vedersi');
  assert.match(corpoDi(DG, 'componi'), /el\.classList\.remove\(indietro \? 'dg-in' : 'dg-out'\);/, 'e se si ridisegna, il disegno all\'indietro si ferma');
  assert.match(corpoDi(DG, 'componi'), /togliTele\(el\);/, 'una tela sola per elemento');
});

test('nella vetrina le vignette sono i riquadri chiusi piu\' esterni, e si disegnano quando entrano', () => {
  const v = corpoDi(DG, 'vignetta');
  assert.match(v, /e\.matches\('a, button, input, select, textarea, \[role="button"\]'\)\) return false;/, 'un comando non e\' una vignetta');
  assert.match(v, /\['Top', 'Right', 'Bottom', 'Left'\]\.every\(/, 'una vignetta e\' chiusa su tutti e quattro i lati');
  assert.match(corpoDi(DG, 'vignetteDi'), /if \(vignetta\(c\)\) trovate\.push\(c\); else giu\(c\);/, 'si prende la piu\' esterna: dentro non si scende');
  const vt = corpoDi(DG, 'vetrina');
  assert.match(vt, /return !\(r\.bottom > 0 && r\.top < alto\);/, 'quelle gia\' a schermo le hai viste: non si ridisegnano');
  assert.match(vt, /\}\)\.forEach\(attendi\);/, 'le altre aspettano');
  const at = corpoDi(DG, 'attendi');
  assert.match(at, /el\.classList\.add\('dg-attesa'\);\n\s*arrivo\.observe\(el\);/, 'invisibili, come le carte del pannello');
  assert.match(at, /v\.target\.classList\.remove\('dg-attesa'\);\n\s*compare\(v\.target\);/, 'e al primo pixel che entra si scoprono e si disegnano insieme: non le vedi mai gia\' fatte');
  assert.match(at, /\{ threshold: 0 \}/, 'al primo pixel, non quando se ne vede un pezzo');
  for (const css of [ANIME, VETRINA]) assert.match(css, /\.dg-attesa \{ opacity: 0; \}\n@media print \{ \.dg-attesa \{ opacity: 1; \} \}/, 'e in stampa si vede');
  assert.match(vt, /document\.body\.classList\.contains\('vetrina'\)/, 'solo nella vetrina');
});

test('niente resti delle entrate di prima', () => {
  assert.doesNotMatch(APP, /morphDa|_morphDa|startViewTransition|dataset\.verso|--rev-x|--rev-delay|armaComparsa|preparaCarte/);
  assert.doesNotMatch(ANIME, /@keyframes (pn-|sc-|vt-|carta-in-scena|toast-esce)|data-verso|--rev-x|view-transition-group\(contenuto\)|bianchetto/);
  assert.doesNotMatch(DG, /bianchetto|cancella/);
  assert.doesNotMatch(STILE, /view-transition-name: contenuto|@keyframes (toast-entra|voce-in|shonen-scossa)|\.pronta:not\(\.entra\)/);
});

test('ogni carta ha una mano sola: il seme si prende una volta e non cambia', () => {
  const sd = corpoDi(DG, 'semeDi');
  assert.match(sd, /var s = semi\.get\(el\);\n\s*if \(!s\) \{/, 'si prende la prima volta che la carta si vede');
  assert.match(sd, /semi\.set\(el, s\);/, 'e resta quello');
  assert.match(DG, /var semi = new WeakMap\(\);/);
  assert.match(corpoDi(DG, 'piano'), /var seme = semeDi\(el\);/, 'andata e ritorno ripassano gli stessi tratti');
  assert.match(corpoDi(DG, 'urlo'), /var seme = semeDi\(carta\);/, 'la nuvoletta ha le stesse punte della sua china');
  assert.doesNotMatch(DG, /seme = [^;]*className/, 'le classi cambiano mentre la carta vive: non fanno da seme');
});

test('all\'indietro si rifanno gli stessi disegni, e sull\'orologio del gesto', () => {
  assert.match(corpoDi(DG, 'componi'), /q\.da, q\.dur, x\.extra, disegni\(x\.dur\)\);/,
    'quanti disegni li dice il tratto d\'andata, non la durata compressa del ritorno');
  assert.match(corpoDi(DG, 'tela'), /p\.style\.setProperty\('--dg-passi', passi\(n \|\| disegni\(dur\)\)\);/);
  assert.match(corpoDi(DG, 'disegni'), /return Math\.max\(2, Math\.round\(ms \/ DUE\)\);/, 'a dodici disegni al secondo');
  assert.match(corpoDi(DG, 'componi'), /aggancia\(t\.s, el\);\n/, 'ogni disegno si aggancia all\'istante che lo chiede');
  assert.match(corpoDi(DG, 'componi'), /if \(el\._dgTela && el\._dgTela !== t\.s\) el\._dgTela\.remove\(\);\n\s*el\._dgTela = t\.s;\n\s*return/, 'un elemento ha una tela sola');
  assert.match(corpoDi(DG, 'aggancia'), /ora: performance\.now\(\)/);
  const at = corpoDi(DG, 'agganciaTutti');
  assert.match(at, /var anime = x\.s\.getAnimations\(\{ subtree: true \}\);/, 'i tratti della tela');
  assert.match(at, /if \(x\.el\) anime = anime\.concat\(x\.el\.getAnimations\(\)\);/, 'e il retino della carta, senza le carte che ha dentro');
  assert.match(at, /if \(String\(a\.animationName\)\.indexOf\('dg-'\) === 0\) a\.startTime = x\.ora;/,
    'se un fotogramma salta si perde un disegno, ma la fine non si sposta: l\'app toglie la finestra a quell\'ora');
  assert.match(corpoDi(DG, 'ripassa'), /aggancia\(t\.s, null\);/);
});

test('il tasto che premi si ripassa a china, e solo se il gesto non ha gia\' la sua risposta', () => {
  assert.match(corpoDi(DG, 'avvia'), /document\.addEventListener\('click', ripassa, true\);/, 'prima di chiunque, anche di chi ferma il clic');
  assert.doesNotMatch(DG, /esclam/, 'i «!» sono la sorpresa di un personaggio: un clic non e\' una sorpresa');
  const r = corpoDi(DG, 'ripassa');
  assert.match(r, /if \(!ev\.isTrusted \|\| ev\.button > 0\) return;/, 'solo i clic veri, col tasto principale');
  assert.match(r, /ev\.target\.closest\(AGISCE\)/, 'solo su quello che fa qualcosa');
  assert.match(r, /var gia = avviati;/);
  assert.match(r, /if \(avviati !== gia \|\| !el\.isConnected\) return;/, 'se il gesto ha fatto partire un disegno, la risposta e\' quella');
  for (const nome of ['traccia', 'sfila']) assert.match(corpoDi(DG, nome), /^\s*function \w+\(el, m, o\) \{\n\s*avviati\+\+;/, `${nome} conta i disegni partiti`);
  assert.match(r, /if \(!disegnabile\(el, m\)\) return;/, 'si ripassa solo quello che ha un contorno');
  assert.match(r, /if \(prima && ora - prima\.t < RIPASSO_RIPOSO\) return;/, 'chi preme a raffica non riempie lo schermo di inchiostro');
  assert.match(r, /var fx = cx === null \? 0\.5 : /, 'da dove hai toccato; da tastiera, dall\'alto al centro');
  assert.match(r, /\[1, -1\]\.forEach\(function \(verso\)/, 'l\'inchiostro gira nei due versi e si chiude dalla parte opposta');
  assert.match(r, /\{ 'stroke-width': Math\.max\(1, bd\.sp\) \+ 1\.5, stroke: bd\.colore \}/, 'col colore del bordo vero, un filo piu\' spesso');
  assert.match(r, /var bd = m\.bordo, seme = semeDi\(el\) \+ ':' \+ volta;/, 'ogni pressione ha la sua mano: due tratti a mano non sono mai uguali');
  const g = corpoDi(DG, 'giroDa');
  assert.match(g, /for \(var j = 0; j <= Math\.ceil\(n \/ 2\); j\+\+\)/, 'ognuno dei due tratti copre meta\' giro');
  assert.match(g, /var m = sp \/ 2, xa = m, ya = m, xb = w - m, yb = h - m;/, 'sul centro del bordo, come la china');
  const via = Number((r.match(/setTimeout\(function \(\) \{ t\.s\.remove\(\); \}, (\d+)\);/) || [])[1]);
  const [dur, da] = (ANIME.match(/\.dg-ripasso \{ animation: dg-via (\d+)ms steps\(2, jump-end\) (\d+)ms forwards; \}/) || []).slice(1).map(Number);
  const disegno = Number((DG.match(/var RIPASSO = (\d+);/) || [])[1]);
  assert.ok(disegno > 0 && disegno < da, `prima si ripassa (${disegno} ms), poi sfuma (da ${da} ms)`);
  assert.ok(via > 0 && da + dur <= via, `sfuma (${da + dur} ms) prima che la tela se ne vada (${via} ms)`);
  for (const css of [ANIME, VETRINA]) assert.doesNotMatch(css, /dg-esclam/);
});

test('prima di un gesto di cui pentirsi, la nuvoletta spigolosa rossa', () => {
  const sc = corpoDi(DG, 'sulleMosse');
  assert.match(sc, /if \(diventa\('dentro'\) && carta && carta\.querySelector\('\.btn\.pericolo'\)\) quando\('urlo', carta\);\n\s*if \(diventa\('dentro'\)\) chiedi\(carta\);/,
    'la finestra che chiede un gesto pericoloso diventa un urlo prima di disegnarsi');
  assert.match(APP, /\{ id: 'si', testo: si, tono: pericolo \? 'pericolo' : '' \}/, 'e l\'app lo dice gia\' col tasto');
  assert.match(APP, /class="btn grande\$\{a\.tono \? ' ' \+ a\.tono : ''\}"/);
  const u = corpoDi(DG, 'urlo');
  assert.match(u, /carta\.classList\.add\('dg-urlo'\);\n\s*carta\.insertBefore\(s, carta\.firstChild\);/, 'la sagoma sta dentro la carta, sotto il contenuto');
  assert.match(u, /var d = spigoli\(w, h, seme\);/, 'con le stesse punte della china');
  assert.match(u, /var w = b \? b\.inlineSize : carta\.offsetWidth, h = b \? b\.blockSize : carta\.offsetHeight;/, 'sulla misura esatta della carta');
  assert.match(u, /new ResizeObserver\(adatta\)\.observe\(carta\)/, 'e la segue se cambia');
  assert.match(corpoDi(DG, 'misura'), /bordo: urlo \? \{ sp: SP_URLO, urlo: true, rag: 0 \}/, 'la china ricalca l\'urlo, non il bordo che la carta non ha piu\'');
  assert.match(corpoDi(DG, 'piano'), /\{ classe: 'dg-china dg-urlo-china', da: daChina, dur: tChina, fa: function \(w, h\) \{ return sagome\.urlo\(w, h, seme\); \} \}/);
  assert.match(ANIME, /\.bv-carta\.dg-urlo \{ position: relative; isolation: isolate; background: transparent; border-color: transparent; box-shadow: none; \}/,
    'la carta lascia il posto alla sagoma, che resta anche a chi chiede meno movimento');
  assert.match(ANIME, /\.dg-sagoma \.dg-fondo \{ fill: var\(--surface\); stroke: var\(--rosso\);/);
});

test('tutto quello che compare si disegna, qualunque strada lo faccia comparire', () => {
  // «Tutto deve essere disegnato, non tralasciamo nulla.» Il modulo non ha
  // una lista di cose da disegnare: guarda le strade con cui una cosa compare.
  const av = corpoDi(DG, 'avvia');
  assert.match(av, /attributeFilter: \['class', 'hidden', 'open'\]/, 'le classi, l\'attributo hidden e le tendine che si aprono');
  const mo = corpoDi(DG, 'sulleMosse');
  assert.match(mo, /if \(m\.oldValue !== null && !el\.hasAttribute\('hidden'\)\) \{ mostrati\.push\(el\); svelati\.push\(el\); \}/, 'chi perde hidden compare');
  assert.match(mo, /if \(el\.tagName === 'DETAILS'\) \{[^\n]*mostrati = mostrati\.concat\(figliDi\(el\)\); \}/, 'la tendina che si apre scopre il suo contenuto');
  assert.match(mo, /else if \(el\.tagName === 'DIALOG'\) mostrati\.push\(el\);/, 'la finestra di sistema che si apre');
  assert.match(mo, /if \(!finestra && diventa\('dentro'\)\) mostrati\.push\(el\);/, 'chi entra da se\'');
  const ag = corpoDi(DG, 'sulleAggiunte');
  assert.match(ag, /else if \(padre === document\.body\) \{ if \(!n\.matches\(SALTA_CORPO\)\) compare\(n, \{ veloce: true \}\); \}/, 'chi si aggiunge alla pagina, sopra a tutto');
  // Dentro alla scheda aperta, chi arriva dopo col suo contorno (una carta
  // caricata, una riga aggiunta) si disegna; chi prende il posto di uno
  // uguale (una lista riscritta) no: quello lo vedevi gia'.
  // Chi si aggiunge senza togliere niente (una riga nuova) compare, col
  // contorno o senza; in una lista riscritta compare solo il riquadro col
  // contorno che prima non c'era.
  assert.match(ag, /else if \(padre\.closest\('\.pannello-scheda\.visibile'\) && !fermo\(n\) && \(!riscritto \|\| contornato\(n\)\)\) \{/);
  assert.match(ag, /if \(rifatti\[f\]\) \{ rifatti\[f\]--; continue; \}/, 'uno rifatto uguale non compare');
  assert.match(corpoDi(DG, 'avvia'), /observe\(app, \{ childList: true, subtree: true \}\)/, 'in tutta la scheda, non solo in cima');
  // Col contorno si traccia; senza, si scopre col retino, e i riquadri col
  // contorno che ha dentro si tracciano insieme.
  assert.match(corpoDi(DG, 'parti'), /if \(contornato\(el\)\) return \[\[el, false\]\];/);
  assert.match(corpoDi(DG, 'parti'), /return \[\[el, true\]\]\.concat\(dentro\);/, 'senza contorno: il retino, piu\' i riquadri che ha dentro');
  assert.match(corpoDi(DG, 'piano'), /var bd = o\.retino \? null : m\.bordo;/, 'il solo retino non ha tratti');
  // Chi e' gia' dentro a un disegno in corso lo scopre il retino di chi lo
  // contiene; chi e' fuori schermo aspetta il suo primo pixel.
  const co = corpoDi(DG, 'compare');
  assert.match(co, /if \(el\.parentElement && el\.parentElement\.closest\('\.dg-in, \.dg-out, \.dg-attesa'\)\) return;/);
  assert.match(co, /if \(!aSchermo\(el\)\) \{ attendi\(el\); return; \}/);
});

test('tutto quello che se ne va si disfa prima di sparire', () => {
  const mo = corpoDi(DG, 'sulleMosse');
  // hidden: l'app lo scrive e ha finito; la vista aspetta che si disfi.
  assert.match(mo, /else if \(m\.oldValue === null && el\.hasAttribute\('hidden'\)\) nascosti\.push\(el\);/, 'chi prende hidden se ne va');
  assert.match(mo, /trattieniChiSiVedeva\(nascosti, svelati\);/, 'si legge come si vedeva, e lo si tiene in vista finche\' si disfa');
  const cv = corpoDi(DG, 'trattieniChiSiVedeva');
  assert.match(cv, /var d = getComputedStyle\(x\[0\]\)\.display;\n\s*return \[x\[0\], d !== 'none' && siVede\(x\[0\]\) && aSchermo\(x\[0\]\) \? d : ''\];/);
  assert.match(mo, /if \(osservatore\) osservatore\.takeRecords\(\);/, 'senza leggere come mosse dell\'app quelle del disegno');
  const tr = corpoDi(DG, 'trattieni');
  assert.match(tr, /el\.style\.setProperty\('--dg-display', display\);\n\s*el\.classList\.add\('dg-resta'\);/);
  assert.match(tr, /if \(!el\.inert\) \{ el\.inert = true; el\._dgInerte = true; \}/, 'mentre si disfa non si tocca e non si raggiunge col Tab');
  for (const css of [ANIME, VETRINA]) {
    assert.ok(css.includes('[hidden].dg-resta { display: var(--dg-display) !important; pointer-events: none; }'), 'la regola che lo tiene in vista');
    assert.ok(css.includes('details.dg-resta::details-content { content-visibility: visible; }'), 'e quella che tiene aperta la tendina che si chiude');
  }
  assert.match(mo, /else if \(!aperto && m\.oldValue !== null && el\.tagName === 'DETAILS'\) chiusi\.push\(el\);/, 'la tendina che si chiude');
  // esce: chiunque lo prenda si disfa, e chi lo toglie aspetta --t-uscita.
  assert.match(mo, /if \(diventa\('esce'\)\) via\(el, \{ veloce:/, 'chi prende esce, chiunque sia');
  assert.match(mo, /else if \(perde\('esce'\)\) mostrati\.push\(el\);/, 'e se ci ripensa, si ridisegna');
  // Le finestre di sistema: si chiudono solo dopo essersi disfatte, da
  // qualunque codice le chiuda, anche con Esc.
  const fi = corpoDi(DG, 'finestre');
  assert.match(fi, /HTMLDialogElement\.prototype\.close = function \(\) \{/);
  assert.match(fi, /var dura = d\.open \? via\(d, \{\}\) : 0;/);
  assert.match(fi, /document\.addEventListener\('cancel', function \(ev\) \{/);
  assert.match(fi, /ev\.preventDefault\(\);\n\s*d\.close\(\);/, 'Esc passa dalla stessa porta');
});

test('i disegni stanno dove si vedono: sopra le finestre di sistema, e dopo la copertina', () => {
  // Una finestra aperta con showModal sta nel livello piu' alto della pagina:
  // una tela appesa al body starebbe sotto. La tela va in uno strato suo, un
  // popover aperto dopo la finestra.
  const te = corpoDi(DG, 'tela');
  assert.match(te, /var casa = dlg && dlg\.matches\(':modal'\) \? strato\(dlg\) : document\.body;/);
  assert.match(corpoDi(DG, 'strato'), /p\.setAttribute\('popover', 'manual'\);/);
  assert.match(corpoDi(DG, 'strato'), /if \(p\.matches\(':popover-open'\)\) p\.hidePopover\(\); p\.showPopover\(\);/, 'riaperto sopra alla finestra piu\' recente');
  // Sotto la copertina un disegno non lo vede nessuno: si aspetta che se ne
  // vada, poi la scena e il menu' si disegnano.
  assert.match(corpoDi(DG, 'esegui'), /if \(!coda\.length \|\| copertina\(\)\) return 0;/);
  assert.match(corpoDi(DG, 'scena'), /if \(copertina\(\)\) \{ if \(dopoCopertina\.indexOf\(pannello\) < 0\) dopoCopertina\.push\(pannello\); return; \}/);
  assert.match(corpoDi(DG, 'sulleMosse'), /if \(el\.id === 'splash'\) \{ if \(diventa\('via'\)\) sveglia = true; continue; \}/);
});

test('il velo sfuma, la carta si disegna: non si sfuma anche lei', () => {
  // La carta di una finestra e' rivelata dal disegno, non dall'opacita' del
  // velo: sfumando il velo intero, la carta spariva mentre si disfaceva, e con
  // meno movimento spariva di colpo.
  const velo = /\n\.bv-velo \{[^}]*\}/.exec(ANIME)[0];
  assert.doesNotMatch(velo, /opacity/, 'il velo non sfuma la carta');
  assert.ok(ANIME.includes('.bv-velo:not(.dentro) .bv-carta:not(.dg-out) { opacity: 0; }'), 'prima che entri la carta non si vede, e mentre si disfa si');
});

test('il contenuto dello streamer non si disegna: e\' suo', () => {
  // La tela dello Studio, l'anteprima di un effetto e quella del file caricato
  // mostrano l'overlay com'e' in onda, con le sue entrate e uscite.
  for (const x of ['<div class="ap-stage" id="ap-stage" data-dg-no>', '<div class="ap-riferimento" id="ap-riferimento" hidden data-dg-no>', '<div class="eff-prima-scena" data-dg-no>', '<div class="ant-scena" aria-hidden="true" data-dg-no>']) assert.ok(APP.includes(x), x);
  assert.match(corpoDi(DG, 'fermo'), /return !!\(el\.closest && el\.closest\('\[data-dg-no\]'\)\);/);
});

test('una carta che si ripiega si disfa prima, e riaprendola si disegna', () => {
  // Prima il corpo scivolava su (grid-template-rows) sfumando: un movimento,
  // non un disegno. Adesso si ricopre col retino e solo dopo la carta si
  // ripiega; riaprendola il corpo si scopre, e il riassunto di quando era
  // chiusa se ne va disfacendosi.
  const i = APP.indexOf('function _piegaCarta(');
  const f = APP.slice(i, APP.indexOf('\n}\n', i));
  assert.match(f, /const dura = corpo \? \(window\.SB_DISEGNO\?\.via\?\.\(corpo, \{ veloce: true \}\) \|\| 0\) : 0;/, 'il corpo si ricopre');
  assert.match(f, /carta\._piega = setTimeout\(chiudi, dura\);/, 'e solo dopo la carta si ripiega');
  assert.match(f, /carta\.classList\.remove\('chiusa'\);\n\s*if \(corpo\) window\.SB_DISEGNO\?\.compare\?\.\(corpo, \{ veloce: true \}\);/, 'riaprendola il corpo si scopre');
  assert.match(f, /if \(riass\) riass\.classList\.add\('esce'\);/, 'e il riassunto se ne va disfacendosi');
  assert.match(f, /if \(carta\._piega\) \{\n\s*clearTimeout\(carta\._piega\); carta\._piega = 0;/, 'e se ci ripensi mentre si disfa, si ridisegna');
  assert.doesNotMatch(STILE, /grid-template-rows var\(--dur-elem\)|carta-riass-in/, 'niente scivolo ne\' dissolvenza');
  // Dentro a quello che compare si tracciano i riquadri; i comandi (tasti,
  // campi, collegamenti) li scopre il retino di chi li contiene.
  assert.match(corpoDi(DG, 'parti'), /if \(!\(c instanceof HTMLElement\) \|\| c\.matches\(COMANDO\)\) continue;/);
});

test('anche fra sorelle la scheda vecchia si disfa, e la pagina che si rifa\' si disfa prima', () => {
  // Fra due sottosezioni della stessa famiglia prima non si disfaceva niente:
  // le carte vecchie sparivano di colpo. Tutto quello che se ne va si disfa.
  const i = APP.indexOf('function vaiAScheda(');
  const vai = APP.slice(i, APP.indexOf('\n}\n', i));
  assert.ok(vai.indexOf("p.classList.add('esce')") > 0 && vai.indexOf("p.classList.add('esce')") < vai.indexOf('if (stessaFamiglia(prima, id))'), 'la scheda vecchia si disfa, sorella o no');
  assert.match(vai, /_uscitaVia = setTimeout\(\(\) => \{\n\s*for \(const p of document\.querySelectorAll\('\.pannello-scheda\.esce'\)\) p\.classList\.remove\('esce'\);\n\s*_scambiaScheda\(id, sezioni\);/, 'e solo dopo arriva la sorella');
  // Dopo un gesto che cambia i dati (un salvataggio, un canale, la lingua) la
  // pagina si rifa' tutta: prima si disfa, menu' compreso, poi si ridisegna.
  const j = APP.indexOf('async function ridisegna(');
  const r = APP.slice(j, APP.indexOf('\n}\n', j));
  assert.match(r, /visibili\.forEach\(\(p\) => p\.classList\.add\('esce'\)\);/);
  assert.match(r, /if \(menu\) b\.add\('menu-via'\);/);
  assert.match(r, /render\(\);\n\s*if \(menu\) b\.remove\('menu-via'\);/, 'e dopo si ridisegna, menu\' compreso');
  assert.doesNotMatch(APP, /stato = await api\('\/api\/me'\);\s*render\(\);/, 'nessuna pagina si rifa\' di colpo dopo un gesto');
});

test('una riga tolta si disfa prima di andarsene, e chi legge non la conta piu\'', () => {
  // Togliere una riga (un'azione, una frase, un'offerta, un premio) la faceva
  // sparire di colpo. `togli` la fa disfare e la toglie dopo; intanto chi
  // legge il modulo per salvarlo non la vede gia' piu'.
  const i = APP.indexOf('function togli(');
  const t = APP.slice(i, APP.indexOf('\n}\n', i));
  assert.match(t, /el\.classList\.add\('esce'\);\n\s*el\.inert = true;\n\s*setTimeout\(\(\) => \{ el\.remove\(\); poi\?\.\(\); \}, _duraUscita\(\) \+ 20\);/);
  for (const x of ["togli(ban.closest('.scudo-seg'));", "togli(b.closest('.dona-livello'),", 'togli(riga, _disegnaPremiMuro);', "const r = rim.closest('.azione-riga'); r?.classList.add('esce'); aggiornaRiassunto(); togli(r);", "const r = rimF.closest('.frase-trigger'); r?.classList.add('esce'); aggiornaRiassunto(); togli(r);"]) assert.ok(APP.includes(x), x);
  for (const x of ["querySelectorAll('[data-premio]:not(.esce)')", "querySelectorAll('#dona-livelli .dona-livello:not(.esce)')", "querySelectorAll('#lista-azioni .azione-riga:not(.esce)')", "querySelectorAll('#lista-altrimenti .azione-riga:not(.esce)')", "querySelectorAll('#lista-frasi-trigger .frase-trigger:not(.esce) .mod-testo-trigger')"]) assert.ok(APP.includes(x), 'chi legge salta le righe che se ne vanno: ' + x);
  assert.doesNotMatch(APP, /closest\('\.(azione-riga|frase-trigger|dona-livello|scudo-seg)'\)\?\.remove\(\)/, 'nessuna riga sparisce di colpo');
});

test('le nuvolette si disegnano da se\', e si disfano chiudendosi, anche con meno movimento', () => {
  // Le nuvolette (quella che spiega un tasto e quella che ti dice una cosa)
  // tracciano il loro contorno da se', perche' e' una sagoma e non un bordo; il
  // contenuto lo scopre il retino. Chiudendosi il contorno si ritira mentre il
  // retino ricopre, e il velo sfuma il colore. Con meno movimento il loro
  // disegno era spento, e la nuvoletta grande entrava con un rimbalzo.
  const AIUTO = leggi('src/web/public/aiuto.js');
  assert.equal((AIUTO.match(/setAttribute\('data-disegno', ''\)/g) || []).length, 2, 'tutte e due si disegnano da se\'');
  assert.equal((AIUTO.match(/window\.SB_DISEGNO\.compare\((b|bolla), \{ veloce: true \}\)/g) || []).length, 2, 'e il contenuto lo scopre il retino');
  assert.match(AIUTO, /window\.SB_DISEGNO\.via\(b, \{ veloce: true \}\)/, 'la nuvoletta del tasto si disfa prima di nascondersi');
  assert.match(AIUTO, /window\.SB_DISEGNO\.via\(bolla, \{ veloce: true \}\) : 0;\n\s*velo\.classList\.add\('via'\);/, 'quella grande si disfa, e il velo sfuma');
  assert.ok(STILE.includes('.aiuto-bolla.dg-out .aiuto-forma, .nuv-bolla.dg-out .nuv-forma { stroke-dasharray: 1; animation: bolla-ritira'), 'il contorno si ritira');
  assert.doesNotMatch(STILE, /\.aiuto-bolla\.vista \.aiuto-forma[^{]*\{\s*animation: none/, 'nessuna regola spegne il loro disegno');
  assert.doesNotMatch(STILE, /scale\(\.72\)|animation: appare/, 'niente rimbalzo ne\' dissolvenza d\'entrata');
});

test('la vetrina non porta il disegno del pannello', () => {
  // Il menu', la scena delle sezioni, l'urlo e le cornici esistono solo nel
  // pannello: stanno in disegno-pannello.js, che solo il pannello carica,
  // subito dopo il nucleo. La home porta il nucleo e basta (verifica-dieta ne
  // misura il peso).
  for (const via of ['function formaMenu(', 'function scena(', 'function urlo(', 'function spigoli(', 'CORNICI']) {
    assert.ok(!NUCLEO.includes(via), `il nucleo non porta ${via}`);
    assert.ok(PANNELLO.includes(via), `lo porta il pannello: ${via}`);
  }
  const INDEX = leggi('src/web/public/index.html');
  assert.ok(INDEX.includes('<script src="disegno.js" defer></script>\n  <script src="disegno-pannello.js" defer></script>'), 'il pannello lo carica subito dopo il nucleo');
  assert.ok(!leggi('src/web/vetrina-vista.js').includes('disegno-pannello.js'), 'la vetrina no');
  assert.match(corpoDi(NUCLEO, 'sulleMosse'), /if \(corpo\) quando\('corpo'\);/, 'il nucleo avvisa chi estende, senza sapere chi e\'');
  assert.match(PANNELLO, /D\.estendi\(\{\n\s*corpo: function \(\) \{ sulMenu\(\); sulleCornici\(\); \},/, 'e il pannello risponde col menu\' e le cornici');
});

const funzioneApp = (nome) => {
  const i = APP.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `c'e' ${nome}`);
  return APP.slice(i, APP.indexOf('\n}\n', i));
};

test('lo Studio mostra e nasconde per le strade che il disegno conosce', () => {
  // Un pannello arrotolato, l'inspector senza niente di scelto, la guida del
  // banco: li nascondeva il CSS con display:none appeso a una classe del
  // contenitore. Per il disegno era un contenitore che cambiava classe, non un
  // corpo che se ne andava: il corpo spariva di colpo e tornava senza disegnarsi.
  // Adesso ognuno passa dall'attributo hidden, che il disegno guarda.
  const arr = funzioneApp('arrotola');
  assert.match(arr, /pan\.classList\.toggle\('arrotolato', chiuso\);/);
  assert.match(arr, /if \(corpo\) corpo\.hidden = chiuso;/, 'il corpo del pannello si nasconde con hidden');
  assert.ok(APP.includes('if (p.chiuso) arrotola(el, true);'), 'un pannello che riapre la pagina arrotolato passa dalla stessa strada');
  assert.ok(APP.includes("arrotola(pan, !pan.classList.contains('arrotolato'));"), 'e cosi\' il tasto');
  assert.doesNotMatch(ANIME, /\.arrotolato \.pan-corpo \{[^}]*display: none/);

  const mostra = funzioneApp('_mostraInspector');
  assert.match(mostra, /const voluti = new Set\(\(selezione \? \[pieno, \.\.\.\(suoi\.length \? \[casa, \.\.\.suoi\] : \[\]\), _altrove\(box, !suoi\.length\)\] : \[vuoto\]\)\.filter\(Boolean\)\);/,
    'pieno, i blocchi col loro contenitore e il rimando si danno il cambio col vuoto');
  // Un contenitore non si spegne da CSS guardando i figli: fra un blocco che se
  // ne va e quello che arriva non ce n'e' nessuno, e il contenitore spento si
  // portava via di colpo quello che si stava disfacendo.
  assert.doesNotMatch(ANIME + STILE, /:has\([^)]*:not\(\[hidden\]\)\)\)?\s*\{[^}]*display: none/, 'nessun contenitore si spegne guardando i figli');
  assert.match(mostra, /_cambiaDiMano\(box, tutti\.filter\(\(el\) => !voluti\.has\(el\)\), \[\.\.\.voluti\]\);/);
  assert.match(funzioneApp('aggiornaInspector'), /_mostraInspector\(box\);/);
  assert.doesNotMatch(APP, /b\.hidden = b\.dataset\.asp !== selezione/, 'nessuno scambia i blocchi tutti insieme');
  assert.match(funzioneApp('montaBanco'), /pieno\.className = 'ovl-insp-pieno';\n\s*for \(const n of \[\.\.\.corpoInsp\.children\]\) if \(!n\.classList\.contains\('ovl-vuoto'\)\) pieno\.appendChild\(n\);/,
    'quello che serve a un elemento scelto sta in un contenitore solo');
  assert.doesNotMatch(ANIME, /\.ovl-inspector(\.vuoto|:not\(\.vuoto\))[^{]*\{[^}]*display: none/);

  assert.match(funzioneApp('guidaSchedaHtml'), /const dietroAlTasto = id === SEZ_BANCO && !document\.body\.classList\.contains\('banco-guida'\);/, 'la guida del banco nasce nascosta, se il tasto e\' spento');
  assert.match(APP, /if \(apri\) g\.open = true;\n\s*g\.hidden = !apri;/, 'e il tasto la mostra e la nasconde con hidden');
  assert.doesNotMatch(ANIME, /\.guida-scheda \{[^}]*display: (none|block)/);
});

test('le righe dei livelli si riconciliano per chiave, e le classi del disegno restano sue', () => {
  // Rifare la lista a ogni giro (innerHTML) buttava via righe che si stavano
  // disegnando e ne faceva comparire di nuove senza disegno. Adesso una riga
  // che c'era resta la stessa: cambia solo quello che e' cambiato, e le classi
  // dg-* le decide il disegno.
  const ric = funzioneApp('_riconciliaLivelli');
  assert.match(ric, /box\.querySelectorAll\(':scope > \.ovl-liv:not\(\.esce\)'\)\]\.map\(\(r\) => \[r\.dataset\.liv, r\]\)/, 'le righe si ritrovano per chiave');
  assert.match(ric, /if \(!c\.startsWith\('dg-'\) && !vuole\.has\(c\)\) r\.classList\.remove\(c\);/, 'le classi del disegno non si toccano');
  assert.match(ric, /if \(r\.innerHTML !== nuova\.innerHTML\) r\.innerHTML = nuova\.innerHTML;/, 'il dentro cambia solo se e\' cambiato');
  assert.match(ric, /for \(const r of presenti\.values\(\)\) togli\(r\);/, 'una riga che se ne va si disfa');
  const rendi = funzioneApp('_rendiLivelli');
  assert.ok(rendi.includes('_riconciliaLivelli(box, qui.map((l, i) => [l.k, righe[i]]));'));
  assert.doesNotMatch(rendi, /box\.innerHTML = righe/, 'la lista non si rifa\' da capo');
  assert.match(funzioneApp('_trascinaLivello'), /querySelectorAll\(':scope > \.ovl-liv:not\(\.esce\)'\)/, 'chi trascina non conta le righe che se ne vanno');
});

test('una tendina che si chiude resta dov\'e\' finche\' si disfa', () => {
  // Chiudendo, la lista tornava subito dentro il suo guscio: si disfaceva in un
  // posto diverso da quello in cui la si vedeva. Torna a casa a disegno finito.
  const v = funzioneApp('vestiTendina');
  assert.match(v, /rientro = setTimeout\(\(\) => \{ if \(aperta\) return; lista\.classList\.remove\('volante'\); guscio\.appendChild\(lista\); \}, _duraUscita\(\) \+ 20\);/);
  assert.match(v, /aperta = true;\n\s*clearTimeout\(rientro\);/, 'riaprendola prima, resta dov\'e\'');
});

test('nello stesso posto chi arriva aspetta che chi se ne va si sia disfatto', () => {
  // Scegliendo un altro elemento, il blocco di prima si disfaceva mentre quello
  // nuovo compariva: per un attimo due blocchi uno sopra l'altro, e il nuovo
  // saltava su quando il vecchio se ne andava. Come fra le schede sorelle,
  // prima si disfa chi va, poi arriva chi viene.
  const cambio = funzioneApp('_cambiaDiMano');
  assert.match(cambio, /const dura = Math\.max\(0, \.\.\.fuori\.map\(\(el\) => D\?\.via\?\.\(el\) \|\| 0\)\);/, 'chi se ne va lo fa disfare l\'app, e il disegno dice quanto ci mette');
  assert.match(cambio, /const fuori = nuovi\.filter\(\(el\) => !nuovi\.some\(\(o\) => o !== el && o\.contains\(el\)\)\);/, 'chi sta dentro a uno che va si disfa con lui, una volta sola');
  assert.match(cambio, /for \(const el of inUscita\) el\.hidden = true;\n\s*inUscita\.clear\(\);\n\s*for \(const el of arrivano\) el\.hidden = false;/,
    'e allo stesso istante, finito il disegno, chi va prende hidden e chi viene lo perde: un orologio solo');
  assert.match(cambio, /for \(const el of arrivano\) if \(inUscita\.delete\(el\)\) D\?\.compare\?\.\(el\);/, 'se ci ripensi mentre si disfa, si ridisegna');
  assert.match(NUCLEO, /el\.hasAttribute\('hidden'\) && !el\.dataset\.dgOut; \}\)/, 'chi si e\' gia\' disfatto, prendendo hidden non si disfa una seconda volta');
});

test('si disfa solo chi si vedeva prima del giro', () => {
  // Il disegno tiene in vista chi prende hidden finche' si e' disfatto. Per
  // sapere se si vedeva, guardava la pagina DOPO il giro: se nello stesso giro
  // compariva il suo contenitore, un blocco mai visto sembrava visibile e si
  // disfaceva (tutti i blocchi dello Studio alla prima scelta). E al contrario,
  // un blocco che se ne va insieme al suo contenitore sembrava gia' nascosto e
  // spariva di colpo. Adesso si misura la pagina com'era prima del giro.
  const t = corpoDi(NUCLEO, 'trattieniChiSiVedeva');
  assert.match(t, /messi\.forEach\(function \(x\) \{ x\[0\]\.removeAttribute\('hidden'\); \}\);\n\s*tolti\.forEach\(function \(el\) \{ el\.setAttribute\('hidden', ''\); \}\);/,
    'chi ha preso hidden lo perde, chi l\'ha perso lo riprende: com\'era prima');
  assert.ok(t.indexOf("tolti.forEach(function (el) { el.removeAttribute('hidden'); });") > t.indexOf('var visti = messi.map('), 'e si rimette tutto solo dopo aver misurato');
  assert.match(t, /var fine = trattieni\(x\[0\], x\[1\], sopra \? sopra\[1\] : undefined\);/, 'chi sta dentro a uno che si disfa resta in vista con lui, senza un secondo disegno');
  assert.match(NUCLEO, /mostrati\.forEach\(function \(el\) \{ if \(el\.hasAttribute\('hidden'\)\) return; lascia\(el\); compare\(el\); \}\);/,
    'chi ricompare prima di essersi disfatto torna subito toccabile');
});
