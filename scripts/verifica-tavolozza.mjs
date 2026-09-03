// Cancello della TAVOLOZZA.
//
// Il difetto storico: lo stesso colore scritto in piu' posti. Il prodotto ha
// cambiato marchio due volte e ogni volta e' rimasto indietro qualcosa — il
// viola nelle aureole dei bottoni, la carta calda nell'anteprima dei link, una
// copia intera della tavolozza dentro style.css che nessuno vedeva perche' era
// coperta. Non si scopre guardando: si scopre mesi dopo, per caso.
//
// Qui la regola e' una sola e si verifica: LA TAVOLOZZA STA IN tema.css. Chi ha
// bisogno di un colore lo prende da li' (var(--...) nel CSS, tavolozza.js nel
// server). Le poche copie inevitabili — il colore della barra del browser, il
// manifest, lo schermo di avvio, che devono esistere prima che il CSS arrivi —
// devono COMBACIARE, e questo cancello le confronta a una a una.
//
// In piu' misura i contrasti veri (WCAG): una tavolozza si puo' cambiare, ma
// non fino a rendere illeggibile una scritta.
//
// Uso: node scripts/verifica-tavolozza.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TAVOLOZZA, tinta } from '../src/web/tavolozza.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(RAD, 'src', 'web', 'public');
const guai = [];

const TOKEN = new Set(Object.keys(TAVOLOZZA.chiaro));

// ── A. un solo posto ────────────────────────────────────────────────────────
// Un colore della tavolozza si dichiara SOLO su :root, e solo dentro tema.css.
// Ridichiararlo su un elemento e' legittimo (lo schermo finto della vetrina e'
// scuro in tutti e due i temi): quello che non si puo' fare e' avere due
// tavolozze che si contendono la radice.
for (const f of readdirSync(PUB)) {
  if (extname(f) !== '.css' || f === 'tema.css') continue;
  const css = readFileSync(join(PUB, f), 'utf8');
  for (const m of css.matchAll(/(^|\})([^{}]*:root[^{}]*)\{([^}]*)\}/g)) {
    for (const d of m[3].matchAll(/--([a-z0-9-]+)\s*:/g)) {
      if (TOKEN.has(d[1])) guai.push(`${f}: --${d[1]} ridichiarato su ${m[2].trim()} — la tavolozza sta in tema.css`);
    }
  }
}

// ── B. le copie inevitabili combaciano ──────────────────────────────────────
const COPIE = [
  { via: 'index.html', re: /<meta name="theme-color" content="(#[0-9a-f]{6})" media="\(prefers-color-scheme: light\)">/, token: 'surface', tema: 'chiaro' },
  { via: 'index.html', re: /<meta name="theme-color" content="(#[0-9a-f]{6})" media="\(prefers-color-scheme: dark\)">/, token: 'surface', tema: 'scuro' },
  { via: 'index.html', re: /#splash \{[^}]*background: (#[0-9a-f]{6}); color: (#[0-9a-f]{6});/, token: ['bg', 'testo'], tema: 'scuro' },
  { via: 'index.html', re: /:root\[data-theme="light"\] #splash \{ background: (#[0-9a-f]{6}); color: (#[0-9a-f]{6}); \}/, token: ['bg', 'testo'], tema: 'chiaro' },
  { via: 'mod.html', re: /<meta name="theme-color" content="(#[0-9a-f]{6})">/, token: 'surface', tema: 'chiaro' },
  { via: 'privacy.html', re: /<meta name="theme-color" content="(#[0-9a-f]{6})">/, token: 'surface', tema: 'chiaro' },
  { via: 'sblocca.html', re: /<meta name="theme-color" content="(#[0-9a-f]{6})">/, token: 'surface', tema: 'chiaro' },
  { via: 'termini.html', re: /<meta name="theme-color" content="(#[0-9a-f]{6})">/, token: 'surface', tema: 'chiaro' },
  { via: 'manifest.webmanifest', re: /"background_color": "(#[0-9a-f]{6})"/, token: 'bg', tema: 'chiaro' },
  { via: 'manifest.webmanifest', re: /"theme_color": "(#[0-9a-f]{6})"/, token: 'surface', tema: 'chiaro' },
];
for (const c of COPIE) {
  const testo = readFileSync(join(PUB, c.via), 'utf8');
  const m = testo.match(c.re);
  if (!m) { guai.push(`${c.via}: non trovo la copia di --${c.token} da confrontare`); continue; }
  for (const [i, nome] of [].concat(c.token).entries()) {
    const atteso = tinta(nome, c.tema).toLowerCase();
    if (m[i + 1].toLowerCase() !== atteso) {
      guai.push(`${c.via}: ${m[i + 1]} dovrebbe essere ${atteso} (--${nome}, tema ${c.tema})`);
    }
  }
}

// Un velo (color-mix) non e' un pieno: sopra un velo il testo resta il testo.
function senzaVeli(v) {
  let s = v;
  for (let giro = 0; giro < 6; giro++) {
    const i = s.indexOf('color-mix(');
    if (i < 0) return s;
    let liv = 0, j = i + 'color-mix'.length;
    for (; j < s.length; j++) {
      if (s[j] === '(') liv++;
      else if (s[j] === ')' && --liv === 0) break;
    }
    s = s.slice(0, i) + s.slice(j + 1);
  }
  return s;
}

// ── C. il testo sopra l'accento e' un token ─────────────────────────────────
// Sul chiaro l'accento e' scuro e ci va il bianco sopra; sullo scuro e' chiaro e
// il bianco non si legge piu'. Un `color: #fff` scritto a mano sa rispondere a
// un tema solo: la risposta giusta e' --su-acc.
for (const f of readdirSync(PUB)) {
  if (extname(f) !== '.css') continue;
  const css = readFileSync(join(PUB, f), 'utf8');
  for (const m of css.matchAll(/\{([^{}]*)\}/g)) {
    const d = m[1];
    const sfondo = (d.match(/(^|;)\s*background(?:-color|-image)?:\s*([^;]+)/) || [])[2] || '';
    if (!/var\(--acc(?:-600)?\)/.test(senzaVeli(sfondo))) continue;
    const col = d.match(/(^|;)\s*color:\s*([^;]+)/);
    if (col && !/var\(--su-acc\)/.test(col[2])) {
      guai.push(`${f}: sopra l'accento c'e' «color: ${col[2].trim()}» invece di var(--su-acc)`);
    }
  }
}

// ── D. i contrasti si misurano ──────────────────────────────────────────────
const canale = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const rgbDi = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

function risolvi(v, tema) {
  let s = String(v).trim();
  for (let giro = 0; giro < 8 && /var\(/.test(s); giro++) {
    s = s.replace(/var\(--([a-z0-9-]+)\)/g, (_, n) => TAVOLOZZA[tema][n] ?? '#000000');
  }
  const m = s.match(/^color-mix\(in srgb,\s*(\S+)\s+([\d.]+)%,\s*([^)]+)\)$/);
  if (m) {
    const a = rgbDi(risolvi(m[1], tema)); const q = Number(m[2]) / 100;
    const b = m[3].trim() === 'transparent' ? [1, 1, 1] : rgbDi(risolvi(m[3], tema));
    return '#' + a.map((x, i) => Math.round((x * q + b[i] * (1 - q)) * 255).toString(16).padStart(2, '0')).join('');
  }
  return s;
}
const lum = (h) => { const [r, g, b] = rgbDi(h).map(canale); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrasto = (a, b) => { const x = lum(a), y = lum(b);
  return Math.round(100 * (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) / 100; };

const COPPIE = [
  ['testo', ['bg', 'surface', 'surface-2', 'surface-3'], 4.5],
  ['testo-2', ['bg', 'surface', 'surface-2'], 4.5],
  ['testo-3', ['bg', 'surface'], 3],
  ['acc', ['bg', 'surface', 'acc-soft'], 4.5],
  ['su-acc', ['acc', 'acc-600'], 4.5],
  ['verde', ['verde-soft'], 4.5],
  ['rosso', ['rosso-soft'], 4.5],
  ['ambra', ['ambra-soft'], 4.5],
];
for (const tema of ['chiaro', 'scuro']) {
  for (const [davanti, dietro, minimo] of COPPIE) {
    for (const f of dietro) {
      const a = risolvi(tinta(davanti, tema), tema);
      const b = risolvi(tinta(f, tema), tema);
      const k = contrasto(a, b);
      if (k < minimo) guai.push(`${tema}: --${davanti} (${a}) su --${f} (${b}) e' ${k}, serve almeno ${minimo}`);
    }
  }
}

// IL CONTORNO. Nel marchio il nero e' quasi meta' del disegno: e' quello che
// tiene insieme ogni forma, e senza di lui il segno non e' piu' quel segno. Le
// superfici che portano il colore del prodotto lo fanno come lui — e siccome su
// fondo scuro un contorno nero si spegne, come si spegne il marchio, l'alone
// deve esserci in entrambi i temi.
{
  const RICHIESTI = ['acc-vivo', 'acc-caldo', 'acc-vino', 'rampa', 'contorno', 'contorno-sp', 'alone-contorno'];
  for (const tema of ['chiaro', 'scuro']) {
    for (const t of RICHIESTI) {
      try { tinta(t, tema); } catch { guai.push(`${tema}: manca --${t}`); }
    }
  }
  if (TAVOLOZZA.scuro['alone-contorno'] === TAVOLOZZA.chiaro['alone-contorno']) {
    guai.push('sul fondo scuro il contorno nero si spegne: serve l’alone, come per il marchio');
  }
  const PORTANO = [
    ['style.css', '.btn'],
    ['vetrina.css', '.vt-btn'],
    ['vetrina.css', '.vt-btn-primo'],
    ['vetrina.css', '.vt-occhiello'],
  ];
  // La regola va cercata a INIZIO RIGA: `.btn` compare anche dentro selettori
  // piu' lunghi (`.top-strumenti .btn`) e si finiva a misurare quelli.
  const regola = (css, sel) => {
    const i = css.search(new RegExp('^' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{', 'm'));
    return i < 0 ? null : css.slice(i, css.indexOf('}', i));
  };
  for (const [file, sel] of PORTANO) {
    const css = readFileSync(join(PUB, file), 'utf8');
    const corpo = regola(css, sel);
    if (corpo == null) { guai.push(`${file}: non trovo ${sel}`); continue; }
    if (!corpo.includes('var(--contorno)')) guai.push(`${file} ${sel} non porta il contorno del marchio`);
  }
  const em = regola(readFileSync(join(PUB, 'vetrina.css'), 'utf8'), '.vt-titolo em');
  if (!em || !em.includes('var(--rampa)')) guai.push('vetrina.css: le parole accentate del titolo non prendono la rampa del marchio');
}

// LA VOCE DISEGNATA. Il marchio e' lettering a mano: se i titoli parlano
// geometrico, il logo sembra un adesivo su un altro prodotto. Il carattere si
// dichiara una volta (--mano) e si ospita in casa come tutti gli altri — il
// primo disegno della pagina non deve dipendere da un server esterno, e
// l'indirizzo di chi visita non deve finire a un terzo.
{
  for (const t of ['mano', 'ang-mano', 'tratto-mano', 'ombra-ink', 'retino']) {
    try { tinta(t, 'chiaro'); } catch { guai.push(`manca --${t}`); }
  }
  const fcss = readFileSync(join(PUB, 'font.css'), 'utf8');
  const mano = String(TAVOLOZZA.chiaro.mano || '');
  const nome = (mano.match(/'([^']+)'/) || [])[1];
  if (!nome) guai.push('--mano non nomina un carattere');
  else {
    if (!fcss.includes(`font-family: '${nome}'`)) guai.push(`${nome} non ha il suo @font-face`);
    const fuori = [...fcss.matchAll(/src:\s*url\(([^)]+)\)/g)].map((m) => m[1]).filter((u) => /^https?:|^\/\//.test(u));
    if (fuori.length) guai.push('un carattere arriva da fuori: ' + fuori.join(', '));
    const lic = readFileSync(join(PUB, 'vendor', 'font', 'LICENSE.txt'), 'utf8');
    if (!lic.includes(nome)) guai.push(`${nome} non e' citato nella licenza dei caratteri`);
  }
  // La regola dei TITOLI, non quella dell'`em` che le sta sotto e che
  // comincia con lo stesso selettore: cercarla a occhio prendeva quella.
  const vet = readFileSync(join(PUB, 'vetrina.css'), 'utf8');
  const iTit = vet.indexOf('body.vetrina .vt-titolo, body.vetrina .vt-tit {');
  const tit = iTit < 0 ? '' : vet.slice(iTit, vet.indexOf('}', iTit));
  if (!tit.includes('font-family: var(--mano)')) {
    guai.push('vetrina.css: i titoli non parlano con la voce del marchio');
  }
  const st = readFileSync(join(PUB, 'style.css'), 'utf8');
  if (!/\.carta h2 \{ font-family: var\(--mano\)/.test(st)) {
    guai.push('style.css: i titoli delle carte non parlano con la voce del marchio');
  }
}

if (guai.length) {
  console.error('Tavolozza incoerente:\n' + guai.map((g) => '  · ' + g).join('\n'));
  process.exit(1);
}
console.log(`Tavolozza: una sola fonte, ${TOKEN.size} colori, copie combacianti, contrasti in regola, contorno e voce del marchio al loro posto. ✓`);
