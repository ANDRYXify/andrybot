// IL SITO SI DISEGNA: LE REGOLE CHE LO RENDONO GIUSTO PER COSTRUZIONE.
//
// Cambiando sezione la pagina vecchia si cancella col bianchetto e la nuova si
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
  const t = corpoDi(DG, 'traccia');
  assert.match(t, /contorno\(w, h, bd\.rag, bd\.sp,/, 'col raggio e lo spessore del bordo');
  assert.match(t, /\{ 'stroke-width': Math\.max\(1, bd\.sp\), stroke: bd\.colore \}/, 'e col suo colore');
  assert.match(corpoDi(DG, 'contorno'), /var m = sp \/ 2;/, 'il tratto sta al centro del bordo, dove il bordo e\'');
});

test('la tela ha la scatola dell\'elemento: quello che sborda non allarga la pagina', () => {
  const p = corpoDi(DG, 'posa');
  assert.match(p, /t\.s\.setAttribute\('width', t\.w\);/);
  assert.match(p, /t\.s\.setAttribute\('height', t\.h\);/);
  assert.match(p, /t\.s\.setAttribute\('viewBox', '0 0 ' \+ t\.w \+ ' ' \+ t\.h\);/);
  assert.match(ANIME, /\.dg-tela \{ position: absolute; pointer-events: none; overflow: visible; \}/, 'i tratti fuori scatola sono inchiostro, non spazio');
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
  assert.doesNotMatch(corpoDi(DG, 'traccia'), /getBoundingClientRect|getComputedStyle/, 'chi disegna non misura');
});

test('la scena si disegna in ordine di lettura', () => {
  const s = corpoDi(DG, 'scena');
  assert.match(s, /\.sort\(function \(x, y\) \{ return \(x\[1\]\.r\.top - y\[1\]\.r\.top\) \|\| \(x\[1\]\.r\.left - y\[1\]\.r\.left\); \}\)/);
  assert.match(s, /traccia\(x\[0\], x\[1\], \{ da: i \* PASSO_FILA \}\)/);
  assert.match(s, /#pagina-testata > \.guida-scheda/, 'col riquadro «Come funziona» della testata');
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
  for (const nome of ['esegui', 'cancella', 'scena']) assert.match(corpoDi(DG, nome), /meno\(\)/, `${nome} guarda meno()`);
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

test('uscire dura quanto il bianchetto, dappertutto', () => {
  assert.match(corpoDi(DG, 'cancella'), /var dur = durataUscita\(\);/);
  const avviso = APP.slice(APP.indexOf('function toast('), APP.indexOf('\n}\n', APP.indexOf('function toast(')));
  assert.match(avviso, /setTimeout\(\(\) => el\.remove\(\), _duraUscita\(\) \+ 20\);/, 'l\'avviso se ne va quando il bianchetto ha finito');
  for (const [nome, css] of [['anime.css', ANIME], ['anime-vetrina.css', VETRINA]]) {
    assert.match(css, /--t-uscita: 180ms;/, `${nome}: la stessa durata`);
  }
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
  assert.doesNotMatch(ANIME, /@keyframes (pn-|sc-|vt-|carta-in-scena|toast-esce)|data-verso|--rev-x|view-transition-group\(contenuto\)/);
  assert.doesNotMatch(STILE, /view-transition-name: contenuto|@keyframes (toast-entra|voce-in|shonen-scossa)|\.pronta:not\(\.entra\)/);
});
