// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Le due pagine che si vedono quando qualcosa NON c'e'.
//
// Sono parenti ma nascono da due bisogni opposti, e la differenza decide come
// sono fatte:
//
//  · il 404 lo serve il BOT, per un indirizzo che non porta da nessuna parte;
//  · la manutenzione la serve l'EDGE, perche' in quel momento il bot e' proprio
//    la cosa che non risponde. Chiedere al bot di annunciare che il bot e' giu'
//    non funziona: e' il motivo per cui quella pagina non puo' vivere qui
//    dentro come rotta, e sta come file che Caddy legge per conto suo.
//
// Da qui viene anche l'altra regola: **niente di esterno**. Nessun foglio di
// stile, nessun carattere dal web, nessuno script. Durante la manutenzione chi
// servirebbe quei file e' spento, e una pagina di cortesia che si presenta
// nuda e' peggio dell'errore che voleva addolcire. Tutto inline, tutto dentro —
// e la manutenzione non chiede nemmeno l'ICONA, che verrebbe dal bot spento.
//
// IL 404 E' UN LABIRINTO, E DEVE RESTARLO. Il server risponde 404 anche a cio'
// che ESISTE ma non si puo' vedere senza sessione (vedi `vetrina.js`): e' una
// scelta, non una svista — chi tasta il bordo non deve capire dove sia. Percio'
// questa pagina dice la stessa identica cosa nei due casi. Nessun «accedi per
// vedere», nessun «pagina privata»: sarebbe un oracolo, e trasformerebbe il
// 404 in uno strumento per mappare il sito.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { iniettaHtml, COPYRIGHT, FIRMA } from '../watermark.js';
import { dichiarazioni } from './tavolozza.js';
import { VIA_LINGUA } from './vetrina-vista.js';

const TOKEN = ['bg', 'surface', 'surface-2-tinta', 'border', 'testo', 'testo-2', 'testo-3',
  'acc', 'su-acc', 'mano', 'testo-font', 'contorno', 'tratto-mano', 'ang-mano',
  'ombra-ink', 'ombra-ink-alta', 'alone-contorno', 'retino', 'retino-passo',
  'tono-carta', 'tono-passo'];

const esc = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

// Il lettering della manutenzione viaggia DENTRO la pagina. Chi servirebbe il
// file e' spento: un link al carattere darebbe un ripiego di sistema, e la
// pagina di cortesia si presenterebbe vestita da un'altra. Trenta kilobyte,
// una volta sola, per non sembrare un altro prodotto nel momento peggiore.
const MANO_INLINE = (() => {
  const via = join(dirname(fileURLToPath(import.meta.url)), 'public', 'vendor', 'font',
    'permanentmarker-normal-400-latin.woff2');
  const b64 = readFileSync(via).toString('base64');
  return `@font-face{font-family:'Permanent Marker';font-style:normal;font-weight:400;`
    + `font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
})();

const CHIARO = dichiarazioni(TOKEN, 'chiaro');
const SCURO = dichiarazioni(TOKEN, 'scuro');

// Il vestito, uguale per tutte e due: la carta col retino, il lettering
// contornato, il tratto d'inchiostro. E' il sito, non una pagina d'emergenza
// presa altrove.
const VESTITO = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{color-scheme:light;${CHIARO}}
  @media(prefers-color-scheme:dark){:root{color-scheme:dark;${SCURO}}}
  html{-webkit-text-size-adjust:100%}
  body{position:relative;isolation:isolate;overflow-x:clip;min-height:100dvh;display:grid;place-items:center;
    padding:clamp(1.4rem,5vw,3rem);background:var(--bg);color:var(--testo);
    font:16px/1.6 var(--testo-font,system-ui),system-ui,sans-serif;
    -webkit-font-smoothing:antialiased}
  body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.5;
    background-image:var(--retino);background-size:var(--retino-passo)}
  .tavola{position:relative;z-index:1;width:100%;max-width:36rem}
  .vignetta{position:relative;display:grid;gap:clamp(1.2rem,4vw,1.9rem);justify-items:center;
    padding:clamp(1.3rem,4vw,1.9rem) clamp(1.5rem,5vw,2.4rem) clamp(2.4rem,6vw,3.2rem);
    background:var(--tono-carta) 0 0 / var(--tono-passo),var(--surface);
    border:2px solid var(--contorno);border-width:var(--tratto-mano);
    border-radius:7px 4px 6px 5px / 5px 7px 4px 6px;
    box-shadow:var(--alone-contorno),var(--ombra-ink-alta);
    text-align:center}
  .dida{justify-self:center;max-width:26rem;
    padding:.5rem .85rem .55rem 1rem;text-align:left;position:relative;
    background:var(--surface-2-tinta);color:var(--testo-2);
    border:1px solid var(--contorno);border-left-width:5px;
    border-radius:2px 4px 3px 5px / 4px 2px 5px 3px;
    font-size:.86rem;line-height:1.5}
  .dida::after{content:"";position:absolute;right:-1px;top:-1px;border:8px solid transparent;
    border-top-color:var(--contorno);border-right-color:var(--contorno)}
  .numero{position:absolute;right:-.4rem;bottom:-.85rem;
    padding:.14rem .62rem .2rem;background:var(--contorno);color:var(--bg);
    border-radius:3px 5px 3px 4px / 4px 3px 5px 3px;
    font-family:var(--mano),system-ui,sans-serif;font-size:1.05rem;letter-spacing:.04em}
  h1{font-family:var(--mano),system-ui,sans-serif;line-height:1.02;
    font-size:clamp(2.3rem,9.5vw,3.6rem);color:var(--testo);
    text-wrap:balance;margin:0 auto;max-width:14ch}
  .vignetta p.dida{color:var(--testo-2);margin:0}
  .vie{display:flex;flex-wrap:wrap;gap:.6rem;justify-content:center;margin-top:1.9rem}
  .vie a{display:inline-block;padding:.62rem 1.1rem;text-decoration:none;font-weight:600;
    color:var(--testo);background:var(--surface-2-tinta);
    border:2px solid var(--contorno);border-width:var(--tratto-mano);
    border-radius:var(--ang-mano);box-shadow:var(--ombra-ink)}
  .vie a.primo{background:var(--acc);color:var(--su-acc)}
  .vie a:active,.tuo a:active{transform:translate(2px,3px);box-shadow:none}
  .vie a:focus-visible,.tuo a:focus-visible{outline:3px solid var(--acc);outline-offset:3px}
  .dida.coda{justify-self:center;font-size:.8rem;padding:.42rem .8rem .46rem .95rem;max-width:30rem}
  .tuo{justify-self:stretch;display:grid;gap:.55rem;justify-items:center;
    padding-top:clamp(1rem,3vw,1.4rem);border-top:2px dashed var(--contorno)}
  .tuo-t{font-weight:700;color:var(--testo)}
  .tuo p{font-size:.9rem;color:var(--testo-2);max-width:26rem}
  .tuo a{display:inline-block;margin-top:.2rem;padding:.5rem 1rem;text-decoration:none;font-weight:600;font-size:.92rem;
    color:var(--testo);background:var(--surface-2-tinta);
    border:2px solid var(--contorno);border-width:var(--tratto-mano);
    border-radius:var(--ang-mano);box-shadow:var(--ombra-ink)}
  .dida.coda span+span{display:inline-block;margin-top:.3rem}
  .nota{margin-top:1.1rem;font-size:.84rem;color:var(--testo-2);text-align:center}
  .nota+.nota{margin-top:.3rem}
  h1{margin-bottom:clamp(.4rem,2vw,1rem)}
  @media (max-width:30rem){.dida{justify-self:stretch;max-width:none}}`;

const guscio = (lang, titolo, corpo, robots = 'noindex, follow', conIcona = true) => iniettaHtml(`<!doctype html>
<!-- ${COPYRIGHT} -->
<!-- Proprietà intellettuale · ${FIRMA} -->
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titolo)}</title>
<meta name="robots" content="${robots}">
${conIcona ? '<link rel="icon" href="/icons/icon-192.png?v=9">\n<link rel="stylesheet" href="/font.css">' : ''}
<style>${conIcona ? '' : MANO_INLINE}${VESTITO}</style>
</head>
<body>
<main class="tavola">
${corpo}
</main>
</body>
</html>`);

// ── 404 ──────────────────────────────────────────────────────────────────────
// Una sola frase, uguale in ogni caso. Non dice se quella cosa esiste.
const T404 = {
  it: { tit: 'Questa pagina non c’è', h1: 'Non c’è niente qui',
    p1: 'L’indirizzo che hai aperto non porta da nessuna parte. Può essere un refuso, un link vecchio, o una pagina che non esiste più.',
    casa: 'Torna alla home', guide: 'Le guide', nota: 'Se ci sei arrivato da un link di qualcun altro, quel link è rotto.' },
  en: { tit: 'This page is not here', h1: 'Nothing here',
    p1: 'The address you opened leads nowhere. It could be a typo, an old link, or a page that no longer exists.',
    casa: 'Back to the home page', guide: 'The guides', nota: 'If you got here from someone else’s link, that link is broken.' },
  es: { tit: 'Esta página no está', h1: 'Aquí no hay nada',
    p1: 'La dirección que has abierto no lleva a ninguna parte. Puede ser un error de escritura, un enlace viejo o una página que ya no existe.',
    casa: 'Volver al inicio', guide: 'Las guías', nota: 'Si has llegado desde el enlace de otra persona, ese enlace está roto.' },
};

export const LINGUE_SERVIZIO = ['it', 'en', 'es'];

// LA PAGINA DI QUELLO CHE NON C'E', una sola forma per tutte, che si legge
// dall'alto in basso: il titolo a pennarello (cosa e' successo), la didascalia
// (perche', e cosa fare), la nota in coda, le strade in fondo (la prima e'
// quella accesa). Prima la didascalia stava sopra il titolo, e si leggeva il
// perche' prima di sapere cosa: confondeva. Se una parte parla solo a qualcuno
// (`tuo`: chi il negozio ce l'ha), sta in un riquadro suo, col titolo che dice
// a chi parla e il suo tasto accanto alla sua frase, non in fondo fra quelli
// di tutti. Il 404 del sito e' una di queste; lo e' anche «Qui non c'e' un
// negozio» (src/features/negozio-pagina.js). Chi ha bisogno di una pagina
// cosi' la chiede qui, e il vestito non si puo' sbagliare.
export function paginaMancante(lingua, { titolo, dida, h1, coda = '', numero = '', tuo = null, vie = [] }) {
  const l = LINGUE_SERVIZIO.includes(lingua) ? lingua : 'it';
  return guscio(l, titolo, `  <div class="vignetta">
    <h1>${esc(h1)}</h1>
    <p class="dida">${esc(dida)}</p>${coda ? `
    <p class="dida coda">${esc(coda)}</p>` : ''}${tuo ? `
    <div class="tuo">
      <p class="tuo-t">${esc(tuo.titolo)}</p>
      <p>${esc(tuo.testo)}</p>
      <a href="${esc(tuo.via.href)}">${esc(tuo.via.testo)}</a>
    </div>` : ''}${numero ? `
    <span class="numero">${esc(numero)}</span>` : ''}
  </div>
  <div class="vie">${vie.map((v, i) => `
    <a${i === 0 && !v.spento ? ' class="primo"' : ''} href="${esc(v.href)}">${esc(v.testo)}</a>`).join('')}
  </div>`);
}

export function pagina404(lingua = 'it') {
  const l = LINGUE_SERVIZIO.includes(lingua) ? lingua : 'it';
  const t = T404[l];
  return paginaMancante(l, { titolo: t.tit, dida: t.p1, h1: t.h1, coda: t.nota, numero: '404',
    vie: [{ href: VIA_LINGUA[l], testo: t.casa }, { href: '/guide', testo: t.guide }] });
}

// ── MANUTENZIONE ─────────────────────────────────────────────────────────────
// La serve l'edge quando il bot non risponde. Tre lingue in una pagina sola:
// qui non c'e' nessun server che possa scegliere, e chi arriva deve capire
// comunque. Nessun ricaricamento automatico che martelli un server che si sta
// tirando su: c'e' un tasto, e lo preme chi vuole.
const TM = [
  ['it', 'Torniamo subito', 'Sto facendo un aggiornamento. Ci vuole qualche minuto: la pagina non è rotta, è solo un momento di pausa.', 'Riprova'],
  ['en', 'Back in a moment', 'An update is going out. It takes a few minutes: the page is not broken, it is just a short pause.', 'Try again'],
  ['es', 'Volvemos enseguida', 'Estoy haciendo una actualización. Tarda unos minutos: la página no está rota, es solo una pausa.', 'Reintentar'],
];

export function paginaManutenzione() {
  const [it, en, es] = TM;
  return guscio('it', it[1], `  <div class="vignetta">
    <h1>${esc(it[1])}</h1>
    <p class="dida">${esc(it[2])}</p>
    <p class="dida coda"><span lang="en">${esc(en[2])}</span><br><span lang="es">${esc(es[2])}</span></p>
  </div>
  <div class="vie"><a class="primo" href="/">${esc(it[3])}</a></div>`, 'noindex, nofollow', false);
}
