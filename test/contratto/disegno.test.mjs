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
const DG = leggi('src/web/public/disegno.js');
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
  assert.match(m, /st\.borderTopStyle === 'none' \|\| sp < 0\.5 \|\| trasparente\) \? null/, 'senza bordo non c\'e\' niente da ripassare');
  assert.match(corpoDi(DG, 'disegnabile'), /return !!m\.bordo &&/);
  const t = corpoDi(DG, 'piano');
  assert.match(t, /contorno\(w, h, bd\.rag, bd\.sp,/, 'col raggio e lo spessore del bordo');
  assert.match(t, /\{ 'stroke-width': Math\.max\(1, bd\.sp\), stroke: bd\.colore \}/, 'e col suo colore');
  assert.match(corpoDi(DG, 'contorno'), /var m = sp \/ 2;/, 'il tratto sta al centro del bordo, dove il bordo e\'');
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
  prima(corpoDi(DG, 'scena'), 'var misure = tutte.map(misura);', 'traccia(', 'la scena misura tutto e poi disegna');
  for (const nome of ['traccia', 'sfila', 'componi', 'piano', 'tela']) {
    assert.doesNotMatch(corpoDi(DG, nome), /getBoundingClientRect|getComputedStyle/, `${nome}: chi disegna non misura`);
  }
  const e = corpoDi(DG, 'esceScena');
  assert.ok(e.indexOf('var misure = tutte.map(misura);') >= 0 && e.indexOf('sfila(') > e.indexOf('var misure'), 'anche chi esce misura tutto e poi disegna');
});

test('la scena si disegna in ordine di lettura', () => {
  const s = corpoDi(DG, 'scena');
  assert.match(s, /\.sort\(function \(x, y\) \{ return \(x\[1\]\.r\.top - y\[1\]\.r\.top\) \|\| \(x\[1\]\.r\.left - y\[1\]\.r\.left\); \}\)/);
  assert.match(s, /traccia\(x\[0\], x\[1\], \{ da: i \* PASSO_FILA \}\)/);
  assert.match(corpoDi(DG, 'vignetteDellaScena'), /#pagina-testata > \.guida-scheda/, 'col riquadro «Come funziona» della testata');
  assert.match(s, /vignetteDellaScena\(pannello\)/);
  assert.match(corpoDi(DG, 'esceScena'), /vignetteDellaScena\(pannello\)/, 'e se ne vanno le stesse vignette che si erano disegnate');
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

test('chi chiede meno movimento non vede disegnare niente', () => {
  for (const nome of ['esegui', 'esceScena', 'scena']) assert.match(corpoDi(DG, nome), /meno\(\)/, `${nome} guarda meno()`);
  assert.match(corpoDi(DG, 'meno'), /meno-moto/);
  assert.match(corpoDi(DG, 'meno'), /prefers-reduced-motion: reduce/);
});

test('il disegno ascolta le classi che l\'app scrive davvero', () => {
  assert.match(APP, /p\.classList\.toggle\('visibile', p\.dataset\.scheda === id\)/, 'la scheda nuova');
  assert.match(APP, /for \(const p of document\.querySelectorAll\('\.pannello-scheda\.visibile'\)\) p\.classList\.add\('esce'\);/, 'la scheda che esce');
  assert.match(APP, /if \(v\.isIntersecting\) \{ v\.target\.classList\.add\('dentro'\);/, 'la carta che arriva');
  assert.match(APP, /el\.className = 'toast' \+/, 'l\'avviso');
  assert.match(APP, /el\.className = 'bv-velo/, 'la finestra');
  assert.match(APP, /velo\.className = 'giro-velo';/, 'la visita guidata');
  assert.match(APP, /document\.body\.classList\.toggle\('menu-aperto'\)/, 'il menu');
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
  assert.match(vt, /e\.classList\.add\('dg-attesa'\); io\.observe\(e\);/, 'le altre aspettano invisibili, come le carte del pannello');
  assert.match(vt, /v\.target\.classList\.remove\('dg-attesa'\);\n\s*chiedi\(v\.target/, 'e al primo pixel che entra si scoprono e si disegnano insieme: non le vedi mai gia\' fatte');
  assert.match(vt, /\{ threshold: 0 \}/, 'al primo pixel, non quando se ne vede un pezzo');
  assert.match(vt, /if \(meno\(\) \|\|/, 'chi chiede meno movimento non aspetta niente');
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
  assert.match(corpoDi(DG, 'componi'), /aggancia\(t\.s, el\);\n\s*return/, 'ogni disegno si aggancia all\'istante che lo chiede');
  assert.match(corpoDi(DG, 'aggancia'), /ora: performance\.now\(\)/);
  const at = corpoDi(DG, 'agganciaTutti');
  assert.match(at, /var anime = x\.s\.getAnimations\(\{ subtree: true \}\);/, 'i tratti della tela');
  assert.match(at, /if \(x\.el\) anime = anime\.concat\(x\.el\.getAnimations\(\)\);/, 'e il retino della carta, senza le carte che ha dentro');
  assert.match(at, /if \(String\(a\.animationName\)\.indexOf\('dg-'\) === 0\) a\.startTime = x\.ora;/,
    'se un fotogramma salta si perde un disegno, ma la fine non si sposta: l\'app toglie la finestra a quell\'ora');
  assert.match(corpoDi(DG, 'esclama'), /aggancia\(s, null\);/);
});

test('dove clicchi escono i «!!!»', () => {
  assert.match(corpoDi(DG, 'avvia'), /document\.addEventListener\('click', esclama, true\);/, 'prima di chiunque, anche di chi ferma il clic');
  const e = corpoDi(DG, 'esclama');
  assert.match(e, /if \(!ev\.isTrusted \|\| ev\.button > 0 \|\| meno\(\)\) return;/, 'solo i clic veri, col tasto principale, e mai a chi chiede meno movimento');
  assert.match(e, /ev\.target\.closest\(AGISCE\)/, 'solo su quello che fa qualcosa');
  assert.match(e, /var x = ev\.detail \? ev\.clientX : m\.r\.left \+ m\.r\.width \/ 2;/, 'dove hai cliccato; da tastiera, sopra al tasto');
  assert.match(e, /var giu = y < 48 \? -1 : 1;/, 'in cima allo schermo si girano in giu\', per restare a schermo');
  assert.match(e, /s\.style\.zIndex = m\.z \+ 1;/, 'sopra a quello che hai toccato, anche in una finestra');
  assert.match(e, /\[-24, 0, 24\]\.forEach/, 'tre, a ventaglio');
  assert.match(e, /\['dg-esclamo-alone', 'dg-esclamo'\]/, 'con l\'alone di carta sotto l\'inchiostro: si leggono anche sui tasti neri');
  const via = Number((e.match(/setTimeout\(function \(\) \{ s\.remove\(\); \}, (\d+)\);/) || [])[1]);
  const [dur, da] = (ANIME.match(/\.dg-esclama \{ overflow: visible; animation: dg-via (\d+)ms steps\(2, jump-end\) (\d+)ms forwards; \}/) || []).slice(1).map(Number);
  assert.ok(via > 0 && da + dur <= via, `spariscono (${da + dur} ms) prima che la tela se ne vada (${via} ms)`);
});

test('prima di un gesto di cui pentirsi, la nuvoletta spigolosa rossa', () => {
  const sc = corpoDi(DG, 'sulleClassi');
  assert.match(sc, /if \(diventa\('dentro'\) && carta && carta\.querySelector\('\.btn\.pericolo'\)\) urlo\(carta\);\n\s*if \(diventa\('dentro'\)\) chiedi\(carta\);/,
    'la finestra che chiede un gesto pericoloso diventa un urlo prima di disegnarsi');
  assert.match(APP, /\{ id: 'si', testo: si, tono: pericolo \? 'pericolo' : '' \}/, 'e l\'app lo dice gia\' col tasto');
  assert.match(APP, /class="btn grande\$\{a\.tono \? ' ' \+ a\.tono : ''\}"/);
  const u = corpoDi(DG, 'urlo');
  assert.match(u, /carta\.classList\.add\('dg-urlo'\);\n\s*carta\.insertBefore\(s, carta\.firstChild\);/, 'la sagoma sta dentro la carta, sotto il contenuto');
  assert.match(u, /var d = spigoli\(w, h, seme\);/, 'con le stesse punte della china');
  assert.match(u, /var w = b \? b\.inlineSize : carta\.offsetWidth, h = b \? b\.blockSize : carta\.offsetHeight;/, 'sulla misura esatta della carta');
  assert.match(u, /new ResizeObserver\(adatta\)\.observe\(carta\)/, 'e la segue se cambia');
  assert.match(corpoDi(DG, 'misura'), /bordo: urlo \? \{ sp: SP_URLO, urlo: true, rag: 0 \}/, 'la china ricalca l\'urlo, non il bordo che la carta non ha piu\'');
  assert.match(corpoDi(DG, 'piano'), /\{ classe: 'dg-china dg-urlo-china', da: daChina, dur: tChina, fa: function \(w, h\) \{ return spigoli\(w, h, seme\); \} \}/);
  assert.match(ANIME, /\.bv-carta\.dg-urlo \{ position: relative; isolation: isolate; background: transparent; border-color: transparent; box-shadow: none; \}/,
    'la carta lascia il posto alla sagoma, che resta anche a chi chiede meno movimento');
  assert.match(ANIME, /\.dg-sagoma \.dg-fondo \{ fill: var\(--surface\); stroke: var\(--rosso\);/);
});
