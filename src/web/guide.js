// Le guide: pagine di CONTENUTO, non l'applicazione.
//
// Perché esistono. Il sito aveva una sola pagina indicizzabile — la vetrina — e
// tre voci di sitemap che erano la stessa vetrina in tre lingue. Cercando "bot
// twitch" non compariva da nessuna parte, e non per un difetto tecnico: robots,
// sitemap, canonical, hreflang e dati strutturati erano già a posto. Mancava la
// cosa che i motori misurano davvero, cioè la sostanza: una pagina sola non ha
// niente da dire su un tema, e nel 2026 una pagina sottile resta non indicizzata
// anche quando la si sottopone a mano.
//
// C'è anche una ragione di forma. Quella query, in italiano, è occupata da
// guide e confronti, non da homepage di prodotto: chi cerca "bot twitch" vuole
// capire come si fa, non atterrare su una vetrina. Per comparire lì bisogna
// rispondere a quella domanda.
//
// Come sono fatte. HTML completo servito dal server, senza applicazione e senza
// JavaScript: quello che il crawler legge è quello che legge la persona, subito,
// senza aspettare un rendering. Il foglio di stile è dentro la pagina — sono
// tre chilobyte, una richiesta in meno vale più di una cache — e l'unica risorsa
// esterna è il font, già ospitato qui.
//
// Il contenuto sta in questa struttura di dati e non in file HTML sparsi: una
// guida in più è una voce in più in GUIDE, e da lì si aggiornano da sole la
// sitemap, l'indice e i collegamenti fra guide. Un fatto scritto in un posto solo.

import { dichiarazioni, REGOLA_MARCHIO } from './tavolozza.js';
import { DENTRO as DENTRI } from './guide/comune.js';
import { GUIDE_IT } from './guide/it.js';
import { GUIDE_EN } from './guide/en.js';
import { GUIDE_ES } from './guide/es.js';

const SITO = 'https://socialbot.live';

export const DENTRO = DENTRI.it;

// Le guide in italiano, nella forma di sempre: chi le legge per slug, schede e
// titolo continua a trovarle cosi'. Le altre lingue stanno accanto (vedi
// guideIn), legate dallo stesso `id`.
export const GUIDE = GUIDE_IT.map((g) => ({ id: g.slug, ...g }));

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ESC[c]);

// Il testo delle guide contiene marcatura voluta (<strong>, <code>, <a href>),
// quindi non si sfugge: si controlla invece che non entri niente di eseguibile.
const SICURI = /<\/?(strong|em|code|a|br)\b[^>]*>/gi;
function testo(s) {
  const senzaBuoni = String(s).replace(SICURI, '');
  if (/<|javascript:/i.test(senzaBuoni)) throw new Error('guida: marcatura non prevista nel testo');
  return String(s);
}

// LA TAVOLOZZA NON SI RISCRIVE: si prende da dove sta quella del sito.
//
// Queste pagine avevano una copia a mano dei colori, e la copia era rimasta al
// viola di due marchi fa: si cliccava «Guide» dalla vetrina e si finiva in un
// altro prodotto. Adesso i valori arrivano da `tavolozza.js`, che li legge da
// tema.css — la stessa fonte che veste la dashboard — quindi il giorno che il
// marchio cambia, cambiano anche queste pagine.
const TOKEN = ['bg', 'surface', 'surface-2', 'border', 'border-2',
  'testo', 'testo-2', 'testo-3', 'acc', 'acc-600', 'su-acc', 'acc-soft', 'acc-bordo',
  'mano', 'testo-font', 'contorno', 'contorno-sp', 'tratto-mano', 'ang-mano', 'ang-mano-l',
  'ombra-ink', 'ombra-ink-alta', 'alone-contorno', 'retino', 'retino-passo', 'retino-forza',
  'acc-vivo', 'acc-caldo', 'acc-vino', 'rampa', 'orlo-scritta',
  'tono-carta', 'tono-passo', 'surface-2-tinta'];

const TAV = { chiaro: dichiarazioni(TOKEN, 'chiaro'), scuro: dichiarazioni(TOKEN, 'scuro') };


const CSS = `
:root{color-scheme:light;${TAV.chiaro}}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;${TAV.scuro}}}
:root[data-theme="dark"]{color-scheme:dark;${TAV.scuro}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{position:relative;isolation:isolate;overflow-x:clip;margin:0;background:var(--bg);color:var(--testo);font:16px/1.7 Archivo,'Archivo Riserva',system-ui,-apple-system,'Segoe UI',sans-serif;font-synthesis-weight:none}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:calc(var(--retino-forza,1) * .5);background-image:var(--retino);background-size:var(--retino-passo)}
.g-testata{border-bottom:var(--contorno-sp) solid var(--contorno);background:var(--surface)}
.g-testata div{max-width:760px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.g-marchio{display:flex;align-items:center;text-decoration:none}
.g-marchio img{display:block;height:30px;width:auto}
${REGOLA_MARCHIO}
.g-testata nav{margin-left:auto;display:flex;gap:16px;font-size:.9rem}
.g-testata nav a{color:var(--testo-2);text-decoration:none}
.g-testata nav a:hover{color:var(--acc)}
.g-testata .g-lingue{margin-left:0;gap:2px;font-size:.78rem;font-weight:700}
.g-lingue a{padding:4px 7px;border-radius:5px}
.g-lingue a[aria-current]{color:var(--acc);background:var(--acc-soft)}
.g-tab{overflow-x:auto;margin:14px 0}
.g-tab table{border-collapse:collapse;width:100%;font-size:.92rem}
.g-tab th,.g-tab td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--contorno);vertical-align:top}
.g-tab th{font-family:var(--mano);color:var(--testo-2);font-weight:400;white-space:nowrap;border-bottom-width:var(--contorno-sp)}
.g-tab td:first-child{white-space:nowrap;color:var(--testo)}
.g-esempio{background:var(--surface-2-tinta);border:2px solid var(--contorno);border-width:var(--tratto-mano);border-radius:var(--ang-mano);box-shadow:var(--ombra-ink);padding:12px 14px;overflow-x:auto;font:.88rem/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;margin:14px 0}
.g-indice{position:relative;background:var(--surface-2-tinta);border:1px solid var(--contorno);border-left-width:5px;border-radius:2px 4px 3px 5px / 4px 2px 5px 3px;padding:14px 18px;margin:22px 0}
.g-indice::after{content:"";position:absolute;right:-1px;top:-1px;border:9px solid transparent;border-top-color:var(--contorno);border-right-color:var(--contorno)}
.g-indice b{display:block;font-family:var(--mano);font-size:1rem;text-transform:none;letter-spacing:.01em;color:var(--testo-2);margin-bottom:8px}
.g-indice ol{margin:0;padding-left:20px;columns:2;column-gap:26px}
.g-indice ol ol{columns:1;padding-left:16px;margin:2px 0 6px;font-size:.92em}
.g-indice li{margin:3px 0;break-inside:avoid}
.g-indice a{color:var(--testo-2);text-decoration:none}
.g-indice a:hover{color:var(--acc)}
@media(max-width:620px){.g-indice ol{columns:1}}
h3{font-size:1rem;margin:20px 0 6px}
.g-novita{margin:26px 0}
.g-novita h2{font-size:1.1rem;color:var(--testo-2);font-weight:400;margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid var(--contorno)}
.g-novita ul{margin:0;padding-left:20px}
.g-novita li{margin:7px 0}
.g-dove-tit{margin:14px 0 4px;font-size:.82rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.g-evidenza{margin:12px 0 16px;padding:12px 16px;border:1px solid var(--contorno);border-left:4px solid var(--acc);border-radius:6px;background:var(--acc-soft)}
.g-evidenza-tit{margin:0 0 6px;font-size:.78rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--acc)}
.g-ev+.g-ev{margin-top:14px;padding-top:12px;border-top:1px solid var(--acc-bordo)}
.g-ev-tit{margin:0 0 4px;font-family:var(--mano);font-size:1.18rem;line-height:1.25}
.g-ev-perche{margin:0 0 4px}
.g-ev-riga{margin:0;font-size:.92rem;color:var(--testo-2)}
.g-ev-dove{margin:6px 0 0;font-size:.84rem}
.g-ev-dove a::after{content:" →"}
.g-dove-tit a{display:inline-block;padding:1px 9px;border:1px solid var(--contorno);border-radius:999px;text-decoration:none;background:var(--surface)}
.g-dove-tit a::after{content:" →"}
.g-novita section+ul,.g-dove-tit+ul{margin-top:4px}
main{max-width:760px;margin:0 auto;padding:34px 20px 60px}
.g-briciole{font-size:.84rem;color:var(--testo-3);margin:0 0 18px}
.g-briciole a{color:var(--testo-3)}
h1{font-family:var(--mano);font-size:clamp(1.7rem,4.2vw,2.4rem);line-height:1.22;letter-spacing:-.012em;margin:0 0 12px;text-wrap:balance}
h2{font-family:var(--mano);font-size:1.3rem;line-height:1.32;letter-spacing:-.008em;margin:38px 0 12px;text-wrap:balance}
h3{font-family:var(--mano);font-size:1.06rem;margin:26px 0 8px}
p{margin:0 0 15px;color:var(--testo-2)}
main>article>p:first-of-type{font-size:1.09rem;color:var(--testo)}
strong{color:var(--testo);font-weight:700}
a{color:var(--acc)}
code{background:var(--surface-2-tinta);border:1px solid var(--contorno);border-radius:var(--ang-mano-l);padding:.1em .38em;font-size:.88em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
ul,ol{margin:0 0 16px;padding-left:1.3em;color:var(--testo-2)}
li{margin:0 0 9px}
ol.g-passi{list-style:none;counter-reset:p;padding:0}
ol.g-passi li{counter-increment:p;position:relative;padding:0 0 0 44px;margin:0 0 20px}
ol.g-passi li::before{content:counter(p);position:absolute;left:0;top:1px;width:30px;height:30px;border-radius:var(--ang-mano);background:var(--rampa);border:var(--contorno-sp) solid var(--contorno);border-width:var(--tratto-mano);box-shadow:var(--ombra-ink);color:var(--su-acc);font-family:var(--mano);font-weight:800;font-size:.9rem;display:grid;place-items:center}
ol.g-passi b{display:block;color:var(--testo);margin-bottom:3px}
.g-data{font-size:.84rem;color:var(--testo-3);margin:0 0 26px}
.g-faq{margin-top:44px;border-top:var(--contorno-sp) solid var(--contorno);padding-top:8px}
.g-faq details{border-bottom:1px solid var(--contorno);padding:14px 0}
.g-faq summary{cursor:pointer;font-family:var(--mano);font-size:1.04rem;font-weight:400;color:var(--testo);list-style:none;display:flex;align-items:center;gap:.6rem}
.g-faq summary::-webkit-details-marker{display:none}
.g-faq summary::before{content:'';order:1;margin-left:auto;flex:0 0 auto;width:.48rem;height:.48rem;border-right:2px solid var(--contorno);border-bottom:2px solid var(--contorno);transform:rotate(45deg);transition:transform .18s ease}
.g-faq details[open] summary::before{transform:rotate(-135deg)}
.g-faq p{margin:10px 0 0}
.g-altre{margin-top:44px;border-top:var(--contorno-sp) solid var(--contorno);padding-top:24px}
.g-altre ul{list-style:none;padding:0}
.g-altre a{font-weight:600;text-decoration:none}
.g-altre a:hover{text-decoration:underline}
.g-altre small{display:block;color:var(--testo-3);font-weight:400}
.g-invito{margin-top:44px;background:var(--tono-carta) 0 0 / var(--tono-passo),var(--surface);border:2px solid var(--contorno);border-width:var(--tratto-mano);border-radius:7px 4px 6px 5px / 5px 7px 4px 6px;box-shadow:var(--alone-contorno),var(--ombra-ink-alta);padding:22px 24px}
.g-invito h2{margin-top:0}
article form{margin:.5rem 0}
.g-copertina{display:block;width:100%;height:auto;border:2px solid var(--contorno);border-radius:var(--ang-mano);box-shadow:var(--ombra-ink)}
article form button{font:inherit;cursor:pointer}
.g-cta,article form button{display:inline-block;margin-top:6px;background:var(--acc);color:var(--su-acc);text-decoration:none;font-weight:600;padding:.62rem 1.15rem;border:2px solid var(--contorno);border-width:var(--tratto-mano);border-radius:var(--ang-mano);box-shadow:var(--ombra-ink)}
.g-cta:active,article form button:active{transform:translate(2px,3px);box-shadow:none}
.g-piede{border-top:var(--contorno-sp) solid var(--contorno);margin-top:50px;background:var(--surface)}
.g-piede div{max-width:760px;margin:0 auto;padding:20px;font-size:.85rem;color:var(--testo-3);display:flex;gap:16px;flex-wrap:wrap}
.g-piede a{color:var(--testo-3)}
.g-elenco{list-style:none;padding:0}
.g-elenco li{border:2px solid var(--contorno);border-width:var(--tratto-mano);background:var(--tono-carta) 0 0 / var(--tono-passo),var(--surface);border-radius:6px 4px 5px 4px / 4px 6px 4px 5px;box-shadow:var(--ombra-ink);padding:18px 20px;margin:0 0 16px}
.g-elenco h2{margin:0 0 6px;font-size:1.14rem}
.g-elenco h2 a{text-decoration:none}
.g-elenco p{margin:0}
`.replace(/\n/g, '');

// ── LE LINGUE ──────────────────────────────────────────────────────────────
//
// Una guida, un manuale, sono una cosa in tre lingue (docs/LINGUE.md). Qui
// stanno una volta sola gli indirizzi per lingua e le parole fisse della pagina
// (testata, piede, «In questa pagina», la data). Il gruppo hreflang si ricava
// dalle traduzioni che esistono: una pagina non puo' dichiarare una lingua che
// non ha.
export const LINGUE_DOC = ['it', 'en', 'es'];
export const VIE = {
  it: { home: '/', guide: '/guide', manuali: '/manuale', novita: '/novita', privacy: '/privacy', termini: '/termini' },
  en: { home: '/en', guide: '/en/guides', manuali: '/en/manual', novita: '/novita', privacy: '/privacy', termini: '/termini' },
  es: { home: '/es', guide: '/es/guias', manuali: '/es/manual', novita: '/novita', privacy: '/privacy', termini: '/termini' },
};
export const T = {
  it: {
    locale: 'it-IT', og: 'it_IT', guide: 'Guide', manuali: 'Manuali', novita: 'Novità', ilBot: 'Il bot',
    privacy: 'Privacy', termini: 'Termini', lingua: 'Lingua', inPagina: 'In questa pagina', domande: 'Domande frequenti',
    altre: 'Altre guide', aggiornata: 'Aggiornata il', aggiornato: 'Aggiornato il',
    invitoTit: 'Il bot di cui parla questa guida',
    invitoTesto: 'SocialBot scrive in chat con il tuo account: comandi su misura, overlay per OBS, clip, notifiche live e uno scudo anti-bot che si alza da solo quando serve. Gratis, con una demo da provare senza collegare niente.',
    prova: 'Provalo', ogAlt: 'Guide di SocialBot su Twitch, bot e overlay',
    guideTitolo: 'Guide su Twitch: bot, comandi, overlay e sicurezza | SocialBot',
    guideDesc: 'Guide pratiche per chi trasmette su Twitch: scegliere un bot, collegarlo, creare comandi, mettere gli overlay in OBS e difendersi da follow-bot e hate-raid.',
    guideIntro: 'Come si usa Twitch dal lato di chi trasmette: bot, comandi, overlay e difesa del canale. Scritte per essere lette una volta e risolvere la cosa, senza giri.',
    guideRaccolta: 'Guide su Twitch, bot e overlay',
    manualiTitolo: 'Manuali di SocialBot: giochi, monete e moduli | SocialBot',
    manualiDesc: 'I manuali di SocialBot: le monete e i giochi della chat, e i moduli — inneschi, condizioni, azioni e variabili, uno per uno.',
    manualiIntro: 'Cosa fa cosa, e come. Non è una presentazione: è il materiale da tenere aperto accanto mentre configuri.',
    manualiRaccolta: 'Manuali di SocialBot',
  },
  en: {
    locale: 'en-GB', og: 'en_GB', guide: 'Guides', manuali: 'Manuals', novita: 'What’s new', ilBot: 'The bot',
    privacy: 'Privacy', termini: 'Terms', lingua: 'Language', inPagina: 'On this page', domande: 'Frequently asked questions',
    altre: 'More guides', aggiornata: 'Updated on', aggiornato: 'Updated on',
    invitoTit: 'The bot this guide talks about',
    invitoTesto: 'SocialBot writes in chat with your own account: custom commands, OBS overlays, clips, live notifications and an anti-bot shield that goes up by itself when it is needed. Free, with a demo you can try without connecting anything.',
    prova: 'Try it', ogAlt: 'SocialBot guides on Twitch, bots and overlays',
    guideTitolo: 'Twitch guides: bots, commands, overlays and safety | SocialBot',
    guideDesc: 'Practical guides for Twitch streamers: choosing a bot, connecting it, creating commands, adding overlays in OBS and defending against follow-bots and hate raids.',
    guideIntro: 'How Twitch works from the streamer’s side: bots, commands, overlays and keeping the channel safe. Written to be read once and get the job done, without detours.',
    guideRaccolta: 'Guides on Twitch, bots and overlays',
    manualiTitolo: 'SocialBot manuals: every tab of the panel | SocialBot',
    manualiDesc: 'The SocialBot manuals: what every tab of the panel does and how, with the real numbers of the bot.',
    manualiIntro: 'What does what, and how. Not a sales pitch: the material to keep open next to you while you set things up.',
    manualiRaccolta: 'SocialBot manuals',
  },
  es: {
    locale: 'es-ES', og: 'es_ES', guide: 'Guías', manuali: 'Manuales', novita: 'Novedades', ilBot: 'El bot',
    privacy: 'Privacidad', termini: 'Términos', lingua: 'Idioma', inPagina: 'En esta página', domande: 'Preguntas frecuentes',
    altre: 'Más guías', aggiornata: 'Actualizada el', aggiornato: 'Actualizado el',
    invitoTit: 'El bot del que habla esta guía',
    invitoTesto: 'SocialBot escribe en el chat con tu propia cuenta: comandos a medida, overlays para OBS, clips, avisos en directo y un escudo anti-bot que se levanta solo cuando hace falta. Gratis, con una demo que puedes probar sin conectar nada.',
    prova: 'Pruébalo', ogAlt: 'Guías de SocialBot sobre Twitch, bots y overlays',
    guideTitolo: 'Guías de Twitch: bots, comandos, overlays y seguridad | SocialBot',
    guideDesc: 'Guías prácticas para quien hace directos en Twitch: elegir un bot, conectarlo, crear comandos, poner overlays en OBS y defenderse de follow-bots y hate raids.',
    guideIntro: 'Cómo se usa Twitch desde el lado de quien emite: bots, comandos, overlays y seguridad del canal. Escritas para leerlas una vez y resolver el asunto, sin rodeos.',
    guideRaccolta: 'Guías sobre Twitch, bots y overlays',
    manualiTitolo: 'Manuales de SocialBot: cada pestaña del panel | SocialBot',
    manualiDesc: 'Los manuales de SocialBot: qué hace cada pestaña del panel y cómo, con los números reales del bot.',
    manualiIntro: 'Qué hace qué, y cómo. No es una presentación: es el material para tener abierto al lado mientras configuras.',
    manualiRaccolta: 'Manuales de SocialBot',
  },
};
const lin = (l) => (LINGUE_DOC.includes(l) ? l : 'it');

const TRADOTTE = { it: null, en: GUIDE_EN, es: GUIDE_ES };

// Le guide in una lingua, nella stessa forma di GUIDE e nello stesso ordine.
// Una traduzione eredita schede, tipo e data dalla voce italiana, se non ha i
// suoi.
export function guideIn(l = 'it') {
  const x = lin(l);
  if (x === 'it') return GUIDE;
  return GUIDE.map((g) => {
    const t = TRADOTTE[x].find((v) => v.id === g.id);
    return t ? { schede: g.schede, tipo: g.tipo, aggiornata: g.aggiornata, ...t, id: g.id } : null;
  }).filter(Boolean);
}

export const urlGuida = (l, slug) => `${SITO}${VIE[lin(l)].guide}/${slug}`;

// Le lingue in cui esiste una guida, ognuna col suo indirizzo.
export function alternativeGuida(id) {
  const alt = {};
  for (const l of LINGUE_DOC) {
    const g = guideIn(l).find((x) => x.id === id);
    if (g) alt[l] = urlGuida(l, g.slug);
  }
  return alt;
}

const soloVia = (url) => String(url).replace(SITO, '') || '/';

function selettoreLingue(l, alt) {
  if (!alt || Object.keys(alt).length < 2) return '';
  return `<nav class="g-lingue" aria-label="${esc(T[l].lingua)}">${LINGUE_DOC.filter((x) => alt[x]).map((x) =>
    `<a href="${esc(soloVia(alt[x]))}" hreflang="${x}" lang="${x}"${x === l ? ' aria-current="true"' : ''}>${x.toUpperCase()}</a>`).join('')}</nav>`;
}

function testata(attiva, l = 'it', alt = null) {
  const t = T[lin(l)], v = VIE[lin(l)];
  const qui = (x) => (attiva === x ? ' aria-current="page"' : '');
  return `<header class="g-testata"><div>
<a class="g-marchio" href="${v.home}"><img src="/icons/logo-barra.png?v=9" alt="SocialBot" width="80" height="30"></a>
<nav><a href="${v.guide}"${qui('indice')}>${t.guide}</a><a href="${v.manuali}"${qui('manuali')}>${t.manuali}</a><a href="${v.novita}"${qui('novita')}>${t.novita}</a><a href="${v.home}">${t.ilBot}</a></nav>${selettoreLingue(lin(l), alt)}
</div></header>`;
}

function piede(l = 'it') {
  const t = T[lin(l)], v = VIE[lin(l)];
  return `<footer class="g-piede"><div>
<span>© 2024–2026 Andrea Taliento (ANDRYXify)</span>
<a href="${v.home}">socialbot.live</a><a href="${v.privacy}">${t.privacy}</a><a href="${v.termini}">${t.termini}</a>
</div></footer>`;
}
// L'ancora di una sezione: si ricava dal titolo, così l'indice e i titoli non
// possono divergere (e un collegamento a una sezione resta valido).
export function ancora(t) {
  return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

// I titoli di una pagina, ciascuno col suo indirizzo dentro la pagina,
// calcolati in un posto solo: il corpo, l'indice e il «?» del pannello leggono
// questi, quindi non possono puntare a un titolo che non c'e'. Due titoli
// uguali (due «Cosa succede» in due sezioni) prendono indirizzi diversi.
export function titoliDi(corpo) {
  const visti = new Set();
  const out = new Map();
  for (const b of corpo || []) {
    const testo = b.h2 || b.h3;
    if (!testo) continue;
    const base = ancora(testo) || 'sezione';
    let id = base;
    for (let n = 2; visti.has(id); n++) id = `${base}-${n}`;
    visti.add(id);
    out.set(b, { livello: b.h2 ? 2 : 3, testo, id });
  }
  return out;
}

// L'indirizzo della prima sezione che risponde a `trova`, o niente.
export function indirizzoDi(corpo, trova) {
  const b = (corpo || []).find(trova);
  const t = b && titoliDi(corpo).get(b);
  return t ? '#' + t.id : '';
}

function corpoHtml(corpo) {
  const titoli = titoliDi(corpo);
  let h = '';
  for (const b of corpo) {
    if (b.h2) h += `<h2 id="${titoli.get(b).id}">${esc(b.h2)}</h2>`;
    if (b.h3) h += `<h3 id="${titoli.get(b).id}">${esc(b.h3)}</h3>`;
    if (b.p) for (const p of b.p) h += `<p>${testo(p)}</p>`;
    if (b.ul) h += `<ul>${b.ul.map((x) => `<li>${testo(x)}</li>`).join('')}</ul>`;
    if (b.passi) h += `<ol class="g-passi">${b.passi.map((s) => `<li><b>${esc(s.t)}</b>${testo(s.d)}</li>`).join('')}</ol>`;
    if (b.tabella) {
      const [testa, ...righe] = b.tabella;
      h += `<div class="g-tab"><table><thead><tr>${testa.map((c) => `<th>${testo(c)}</th>`).join('')}</tr></thead>`
        + `<tbody>${righe.map((r) => `<tr>${r.map((c) => `<td>${testo(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    if (b.esempio) h += `<pre class="g-esempio">${esc(b.esempio)}</pre>`;
  }
  return h;
}

// L'indice si ricava dai titoli del corpo: una sezione nuova ci finisce da sé.
// Due livelli, come il corpo: le sezioni, e sotto ognuna le sue parti. Un
// manuale diviso per scheda ha due o tre sezioni e venti parti, e un indice
// con due voci non orienta nessuno.
function indiceHtml(corpo, l = 'it') {
  const titoli = [...titoliDi(corpo).values()];
  if (titoli.length < 4) return '';
  const voce = (t) => `<a href="#${t.id}">${esc(t.testo)}</a>`;
  const gruppi = [];
  for (const t of titoli) {
    if (t.livello === 2 || !gruppi.length) gruppi.push({ t, sotto: [] });
    else gruppi[gruppi.length - 1].sotto.push(t);
  }
  return `<nav class="g-indice"><b>${T[lin(l)].inPagina}</b><ol>${gruppi.map((g) =>
    `<li>${voce(g.t)}${g.sotto.length ? `<ol>${g.sotto.map((s) => `<li>${voce(s)}</li>`).join('')}</ol>` : ''}</li>`).join('')}</ol></nav>`;
}

function faqHtml(faq, l = 'it') {
  if (!faq?.length) return '';
  return `<section class="g-faq"><h2>${T[lin(l)].domande}</h2>${faq.map((f) =>
    `<details><summary>${esc(f.d)}</summary><p>${testo(f.r)}</p></details>`).join('')}</section>`;
}

function altreHtml(slug, l = 'it') {
  const altre = guideIn(l).filter((g) => g.slug !== slug).slice(0, 4);
  if (!altre.length) return '';
  return `<section class="g-altre"><h2>${T[lin(l)].altre}</h2><ul>${altre.map((g) =>
    `<li><a href="${VIE[lin(l)].guide}/${g.slug}">${esc(g.h1)}</a><small>${esc(g.desc.slice(0, 110))}…</small></li>`).join('')}</ul></section>`;
}

function datiStrutturati(g, l = 'it') {
  const url = urlGuida(l, g.slug);
  const t = T[lin(l)], v = VIE[lin(l)];
  const blocchi = [{
    '@context': 'https://schema.org',
    '@type': g.tipo === 'howto' ? 'HowTo' : 'Article',
    headline: g.h1,
    name: g.h1,
    description: g.desc,
    inLanguage: t.locale,
    datePublished: g.aggiornata,
    dateModified: g.aggiornata,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Person', name: 'Andrea Taliento' },
    publisher: { '@type': 'Organization', name: 'SocialBot', url: SITO },
  }];
  if (g.tipo === 'howto') {
    const passi = g.corpo.flatMap((b) => b.passi || []);
    if (passi.length) blocchi[0].step = passi.map((s, i) => ({
      '@type': 'HowToStep', position: i + 1, name: s.t,
      text: String(s.d).replace(/<[^>]*>/g, ''),
    }));
  }
  blocchi.push({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SocialBot', item: l === 'it' ? SITO : `${SITO}${v.home}` },
      { '@type': 'ListItem', position: 2, name: t.guide, item: `${SITO}${v.guide}` },
      { '@type': 'ListItem', position: 3, name: g.h1, item: url },
    ],
  });
  if (g.faq?.length) blocchi.push({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: g.faq.map((f) => ({
      '@type': 'Question', name: f.d,
      acceptedAnswer: { '@type': 'Answer', text: String(f.r).replace(/<[^>]*>/g, '') },
    })),
  });
  return blocchi.map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('');
}

function scheletro({ titolo, desc, url, corpo, ld, robots = 'index,follow,max-snippet:-1,max-image-preview:large', l = 'it', alt = null, immagine = `${SITO}/icons/og-guide.png?v=9`, immagineAlt = null }) {
  const t = T[lin(l)];
  const alternative = alt && Object.keys(alt).length > 1
    ? LINGUE_DOC.filter((x) => alt[x]).map((x) => `<link rel="alternate" hreflang="${x}" href="${esc(alt[x])}">`).join('')
      + (alt.it ? `<link rel="alternate" hreflang="x-default" href="${esc(alt.it)}">` : '') + '\n'
    : '';
  return `<!doctype html><html lang="${lin(l)}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
${alternative}<meta name="robots" content="${esc(robots)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="SocialBot">
<meta property="og:locale" content="${t.og}">
<meta property="og:title" content="${esc(titolo)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(immagine)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="${esc(immagineAlt || t.ogAlt)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(titolo)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(immagine)}">
<link rel="icon" href="/icons/icon-192.png?v=9">
<link rel="stylesheet" href="/font.css">
<script src="/tema.js"></script>
<style>${CSS}</style>
${ld}
</head><body>${corpo}</body></html>`;
}

export function paginaGuida(slug, l = 'it') {
  const x = lin(l), t = T[x], v = VIE[x];
  const g = guideIn(x).find((y) => y.slug === slug);
  if (!g) return null;
  const url = urlGuida(x, g.slug);
  const alt = alternativeGuida(g.id);
  const data = new Date(g.aggiornata).toLocaleDateString(t.locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const corpo = `${testata('', x, alt)}
<main><p class="g-briciole"><a href="${v.home}">SocialBot</a> › <a href="${v.guide}">${t.guide}</a> › ${esc(g.h1)}</p>
<article><h1>${esc(g.h1)}</h1>
<p class="g-data">${t.aggiornata} ${data}</p>
${corpoHtml(g.corpo)}</article>
${faqHtml(g.faq, x)}
<section class="g-invito"><h2>${t.invitoTit}</h2>
<p>${t.invitoTesto}</p>
<a class="g-cta" href="${v.home}">${t.prova}</a></section>
${altreHtml(g.slug, x)}
</main>${piede(x)}`;
  return scheletro({ titolo: g.titolo, desc: g.desc, url, corpo, ld: datiStrutturati(g, x), l: x, alt });
}

// Il guscio di una pagina di documentazione: la stessa forma delle guide, ma con
// l'indice ricavato dai titoli. Serve ai manuali, che vivono in manuali.js.
// UNA PAGINA DI SERVIZIO: lo stesso aspetto delle guide, ma fuori dai motori di
// ricerca. Serve alle risposte che il sito deve a chi arriva da fuori, come chi
// legge com'e' andata una richiesta di cancellazione fatta da Instagram.
// Una campagna (una pagina che scade) usa lo stesso guscio, con la sua lingua,
// la sua descrizione e la sua anteprima: chi la condivide deve vedere lei.
export function paginaServizio({ titolo, url, corpo, l = 'it', desc = titolo, immagine, immagineAlt }) {
  return scheletro({ titolo, desc, url, robots: 'noindex,nofollow', ld: '', l, immagine, immagineAlt,
    corpo: `${testata('', l)}\n<main><article>${corpo}</article></main>${piede(l)}` });
}

export function paginaDoc(d, l = 'it', alt = null) {
  const x = lin(l), t = T[x], v = VIE[x];
  const url = `${SITO}${v.manuali}/${d.slug}`;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'TechArticle',
    headline: d.h1, name: d.h1, description: d.desc, inLanguage: t.locale,
    datePublished: d.aggiornata, dateModified: d.aggiornata,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Person', name: 'Andrea Taliento' },
    publisher: { '@type': 'Organization', name: 'SocialBot', url: SITO },
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SocialBot', item: x === 'it' ? SITO : `${SITO}${v.home}` },
      { '@type': 'ListItem', position: 2, name: t.manuali, item: `${SITO}${v.manuali}` },
      { '@type': 'ListItem', position: 3, name: d.h1, item: url },
    ],
  }];
  const corpo = `${testata('manuali', x, alt)}
<main><p class="g-briciole"><a href="${v.home}">SocialBot</a> › <a href="${v.manuali}">${t.manuali}</a> › ${esc(d.h1)}</p>
<article><h1>${esc(d.h1)}</h1>
<p class="g-data">${t.aggiornato} ${new Date(d.aggiornata).toLocaleDateString(t.locale, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
${indiceHtml(d.corpo, x)}
${corpoHtml(d.corpo)}</article>
${faqHtml(d.faq, x)}
</main>${piede(x)}`;
  return scheletro({ titolo: d.titolo, desc: d.desc, url, corpo, l: x, alt,
    ld: ld.map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('') });
}

// L'indice dei manuali.
export function paginaManuali(manuali, l = 'it', alt = null) {
  const x = lin(l), t = T[x], v = VIE[x];
  const url = `${SITO}${v.manuali}`;
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: t.manualiRaccolta, url, inLanguage: t.locale,
    hasPart: manuali.map((m) => ({ '@type': 'TechArticle', headline: m.h1, url: `${SITO}${v.manuali}/${m.slug}` })),
  })}</script>`;
  const corpo = `${testata('manuali', x, alt)}
<main><p class="g-briciole"><a href="${v.home}">SocialBot</a> › ${t.manuali}</p>
<h1>${t.manuali}</h1>
<p>${t.manualiIntro}</p>
<ul class="g-elenco">${manuali.map((m) =>
    `<li><h2><a href="${v.manuali}/${m.slug}">${esc(m.h1)}</a></h2><p>${esc(m.desc)}</p></li>`).join('')}</ul>
</main>${piede(x)}`;
  return scheletro({ titolo: t.manualiTitolo, desc: t.manualiDesc, url, corpo, ld, l: x, alt });
}

// Le righe vicine che parlano dello stesso punto del pannello stanno insieme,
// sotto il titolo di quel punto: si leggono come un discorso invece che come un
// elenco, e il titolo e' il collegamento per andare a vedere. Non si riordina
// niente — dentro la giornata l'ordine vuol dire qualcosa.
function sezioni(voci) {
  const per = new Map();
  for (const v of voci) {
    const dove = v && typeof v === 'object' ? (v.vai || null) : null;
    if (!per.has(dove)) per.set(dove, { vai: dove, voci: [] });
    per.get(dove).voci.push(v);
  }
  return [...per.values()];
}

// Le novita' importanti della giornata stanno in cima, in un riquadro loro: una
// funzione nuova non deve perdersi fra dieci rifiniture (novita.js, IMPORTANTE).
// Le importanti si presentano per intero, come nel pannello: il titolo che dice
// cos'e', il perche' conta, la riga, e dove si prova.
function evidenza(voci, aiuti = {}) {
  const imp = voci.filter((v) => v && typeof v === 'object' && v.importante);
  if (!imp.length) return '';
  return `<div class="g-evidenza"><p class="g-evidenza-tit">Da provare</p>${imp.map((v) => {
    const a = v.vai && aiuti[v.vai];
    return `<article class="g-ev">${v.titolo ? `<h3 class="g-ev-tit">${esc(v.titolo)}</h3>` : ''}${v.perche ? `<p class="g-ev-perche">${testo(v.perche)}</p>` : ''}`
      + `<p class="g-ev-riga">${testo(v.testo)}</p>${a ? `<p class="g-ev-dove"><a href="${esc(a.via)}">${esc(a.titolo)}</a></p>` : ''}</article>`;
  }).join('')}</div>`;
}

// `aiuti` e' la mappa scheda → pagina che la spiega (da manuali.js, che importa
// di qui: la passa chi chiama, cosi' non si girano intorno). Serve per dire DOVE
// e' successa una cosa: la riga porta solo l'identificativo della scheda, il
// nome e l'indirizzo li mette chi mostra.
export function paginaNovita(gruppi, aiuti = {}) {
  const url = `${SITO}/novita`;
  const ultima = gruppi[0]?.data || new Date().toISOString().slice(0, 10);
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: 'Novità di SocialBot', url, inLanguage: 'it-IT', dateModified: ultima,
    description: 'Cosa è cambiato nel bot, in ordine di tempo.',
    publisher: { '@type': 'Organization', name: 'SocialBot', url: SITO },
  })}</script>`;
  const corpo = `${testata('novita')}
<main><p class="g-briciole"><a href="/">SocialBot</a> › Novità</p>
<h1>Novità</h1>
<p>Cosa è cambiato nel bot, in ordine di tempo. Una riga per cosa: se non si vede da fuori, qui non c'è.</p>
${gruppi.map((g) => `<section class="g-novita"><h2>${esc(dataItaliana(g.data))}</h2>${evidenza(g.voci, aiuti)}${
    sezioni(g.voci.filter((v) => !(v && v.importante))).map((s) => {
      const a = s.vai && aiuti[s.vai];
      const tit = a ? `<h3 class="g-dove-tit"><a href="${esc(a.via)}">${esc(a.titolo)}</a></h3>` : '';
      return `${tit}<ul>${s.voci.map((v) => `<li>${testo(typeof v === 'string' ? v : v.testo)}</li>`).join('')}</ul>`;
    }).join('')}</section>`).join('')}
</main>${piede()}`;
  return scheletro({
    titolo: 'Novità di SocialBot: cosa è cambiato | SocialBot',
    desc: 'Le novità del bot per Twitch e Kick, in ordine di tempo: comandi, giochi a punti, overlay, moderazione e correzioni.',
    url, corpo, ld,
  });
}

function dataItaliana(iso) {
  const [a, m, g] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, g)).toLocaleDateString('it-IT',
    { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function paginaIndice(l = 'it') {
  const x = lin(l), t = T[x], v = VIE[x];
  const guide = guideIn(x);
  if (!guide.length) return null;
  const url = `${SITO}${v.guide}`;
  const alt = Object.fromEntries(LINGUE_DOC.filter((y) => guideIn(y).length).map((y) => [y, `${SITO}${VIE[y].guide}`]));
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: t.guideRaccolta, url, inLanguage: t.locale,
    hasPart: guide.map((g) => ({ '@type': 'Article', headline: g.h1, url: urlGuida(x, g.slug) })),
  })}</script>`;
  const corpo = `${testata('indice', x, alt)}
<main><h1>${t.guide}</h1>
<p>${t.guideIntro}</p>
<ul class="g-elenco">${guide.map((g) =>
    `<li><h2><a href="${v.guide}/${g.slug}">${esc(g.h1)}</a></h2><p>${esc(g.desc)}</p></li>`).join('')}</ul>
</main>${piede(x)}`;
  return scheletro({ titolo: t.guideTitolo, desc: t.guideDesc, url, corpo, ld, l: x, alt });
}

// Le voci per la sitemap: una sola fonte, così una guida nuova ci finisce da sé.
// Le voci per la sitemap: una sola fonte, cosi' una guida nuova ci finisce da
// se', in ogni lingua in cui esiste, con le sue alternative.
export function urlGuide(novita = []) {
  const voci = [];
  const indici = Object.fromEntries(LINGUE_DOC.filter((l) => guideIn(l).length).map((l) => [l, `${SITO}${VIE[l].guide}`]));
  for (const l of Object.keys(indici)) {
    voci.push({ loc: indici[l], lastmod: guideIn(l).map((g) => g.aggiornata).sort().pop(), freq: 'weekly', prio: '0.8', alt: indici });
  }
  for (const g of GUIDE) {
    const alt = alternativeGuida(g.id);
    for (const [l, loc] of Object.entries(alt)) {
      voci.push({ loc, lastmod: guideIn(l).find((x) => x.id === g.id).aggiornata, freq: 'monthly', prio: '0.7', alt });
    }
  }
  if (novita.length) voci.push({ loc: `${SITO}/novita`, lastmod: novita[0].data, freq: 'weekly', prio: '0.6' });
  return voci;
}
