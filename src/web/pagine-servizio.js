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

import { dichiarazioni } from './tavolozza.js';

const TOKEN = ['bg', 'surface', 'surface-2-tinta', 'border', 'testo', 'testo-2', 'testo-3',
  'acc', 'su-acc', 'mano', 'testo-font', 'contorno', 'tratto-mano', 'ang-mano',
  'ombra-ink', 'alone-contorno', 'retino', 'retino-passo'];

const esc = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

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
  body{min-height:100dvh;display:grid;place-items:center;padding:2rem 1.25rem;
    background:var(--bg);color:var(--testo);
    font:16px/1.6 var(--testo-font,system-ui),system-ui,sans-serif;
    -webkit-font-smoothing:antialiased}
  body::before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.5;
    background-image:var(--retino);background-size:var(--retino-passo)}
  .foglio{position:relative;width:100%;max-width:34rem;text-align:center;
    background:var(--surface);border:var(--tratto-mano) solid var(--contorno);
    border-radius:var(--ang-mano);box-shadow:var(--alone-contorno),var(--ombra-ink);
    padding:clamp(1.6rem,5vw,2.6rem)}
  h1{font-family:var(--mano),system-ui,sans-serif;line-height:1.02;
    font-size:clamp(2.2rem,9vw,3.4rem);color:var(--testo);margin-bottom:.5rem}
  p{color:var(--testo-2);margin:0 auto;max-width:30rem}
  p+p{margin-top:.7rem}
  .vie{display:flex;flex-wrap:wrap;gap:.6rem;justify-content:center;margin-top:1.5rem}
  .vie a{display:inline-block;padding:.62rem 1.1rem;text-decoration:none;font-weight:600;
    color:var(--testo);background:var(--surface-2-tinta);
    border:var(--tratto-mano) solid var(--contorno);border-radius:var(--ang-mano);
    box-shadow:var(--ombra-ink)}
  .vie a.primo{background:var(--acc);color:var(--su-acc)}
  .vie a:active{transform:translate(2px,3px);box-shadow:none}
  .nota{margin-top:1.4rem;font-size:.84rem;color:var(--testo-3)}`;

const guscio = (lang, titolo, corpo, robots = 'noindex, follow', conIcona = true) => `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titolo)}</title>
<meta name="robots" content="${robots}">
${conIcona ? '<link rel="icon" href="/icons/icon-192.png?v=7">' : ''}
<style>${VESTITO}</style>
</head>
<body>
<main class="foglio">
${corpo}
</main>
</body>
</html>`;

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

export function pagina404(lingua = 'it') {
  const l = LINGUE_SERVIZIO.includes(lingua) ? lingua : 'it';
  const t = T404[l];
  const via = l === 'it' ? '/' : `/?lang=${l}`;
  return guscio(l, t.tit, `  <h1>${esc(t.h1)}</h1>
  <p>${esc(t.p1)}</p>
  <div class="vie">
    <a class="primo" href="${via}">${esc(t.casa)}</a>
    <a href="/guide">${esc(t.guide)}</a>
  </div>
  <p class="nota">${esc(t.nota)}</p>`);
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
  return guscio('it', it[1], `  <h1>${esc(it[1])}</h1>
  <p>${esc(it[2])}</p>
  <div class="vie"><a class="primo" href="/">${esc(it[3])}</a></div>
  <p class="nota" lang="en">${esc(en[2])}</p>
  <p class="nota" lang="es">${esc(es[2])}</p>`, 'noindex, nofollow', false);
}
