// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL DISEGNO DELLA CARTA — il modello, la validazione, l'SVG.
//
// Questo file lo leggono in DUE: il server, che ne fa un PNG da mandare su
// Telegram, e il BROWSER, dentro l'editor, che ne fa l'anteprima che si vede
// mentre si trascina.
//
// È la ragione per cui sta separato da `cartalive.js`, che invece parla col
// disco (i caratteri), col database e con la rete. Qui dentro non c'è niente di
// Node: solo dati e stringhe.
//
// ═══ PERCHÉ NON DUE DISEGNATORI ═══
//
// La strada corta era: il server disegna il PNG, e l'editor si ridisegna
// l'anteprima per conto suo con un po' di HTML. Quel giorno l'anteprima e
// l'immagine che parte diventano DUE COSE, e cominciano a divergere — in
// silenzio, perché nessuna delle due dà errore. L'editor direbbe «è così», e
// nel gruppo arriverebbe altro: per un editor è il difetto peggiore che esista.
//
// Qui invece c'è UNA funzione che disegna, e la chiamano tutti e due. Il
// browser riceve QUESTO file, non una sua copia.
//
// ═══ PERCHÉ È FATTA DI DATI E NON DI DISEGNO ═══
//
// La tentazione era scrivere due SVG a mano, uno per Twitch e uno per Kick, e
// riempirli di buchi. Sarebbe stato più corto oggi e un vicolo cieco domani: un
// disegno scritto a mano non si edita, si riscrive. Una carta è invece un FONDO
// più un ELENCO DI ELEMENTI, ognuno con posizione, misura e stile; i due temi
// standard sono due preselezioni di quegli stessi dati, non due casi speciali
// del codice.
//
// ═══ I CARATTERI ═══
//
// I nomi stanno qui perché li devono conoscere tutti e due — chi rasterizza e
// chi scrive il `@font-face` nell'editor. I file veri stanno in `assets/font`.

// I caratteri che spediamo con noi. L'immagine di produzione non ne ha quasi
// nessuno: fidarsi di quelli di sistema vorrebbe dire una carta diversa a ogni
// server, e su alcuni nessun testo.
export const CARATTERI = [
  ['Anton', 'Anton-Regular.ttf'],
  ['Archivo Black', 'ArchivoBlack-Regular.ttf'],
  ['Archivo', 'Archivo-Variable.ttf'],
];

// Quanto e' larga ogni lettera di questi caratteri, in millesimi di corpo, letta
// dai loro file (scripts/misura-caratteri.mjs): per blocchi di lettere, dalla
// prima del blocco in avanti. Uno zero e' una lettera che il carattere non ha.
// ── le lettere (scritto da scripts/misura-caratteri.mjs, non a mano) ──
export const LETTERE = {
  'Anton': {
    peso: 400,
    32: [234,229,429,546,462,1057,520,214,291,291,452,355,236,311,229,405,494,331,494,494,494,494,494,494,494,494,242,245,321,311,321,492,864,485,479,474,493,412,399,485,499,227,466,472,397,746,498,486,472,494,477,461,396,474,469,712,484,446,410,318,405,318,474,365,317,483,501,491,498,488,280,504,505,243,263,491,248,758,499,497,501,498,347,475,305,499,461,696,459,461,386,340,216,340,493],
    160: [234,227,481,474,488,463,222,449,477,675,392,578,404,293,675,356,389,358,307,309,317,490,498,234,281,212,397,578,814,726,854,493,485,485,485,485,485,485,640,474,412,412,412,412,227,227,227,227,493,498,486,486,486,486,486,347,486,474,474,474,474,446,462,492,483,483,483,483,483,483,731,491,488,488,488,488,235,235,235,235,503,499,497,497,497,497,497,334,497,499,499,499,499,461,492,461,485,483,485,483,485,483,474,491,474,491,474,491,474,491,493,656,493,498,412,488,412,488,412,488,412,488,412,488,485,504,485,504,485,504,485,504,499,505,508,505,227,235,227,235,227,235,227,243,227,235,693,506,466,263,472,491,493,397,248,397,248,397,403,451,408,417,288,498,499,498,499,498,499,499,491,499,486,497,486,497,486,497,649,739,477,347,477,347,477,347,461,475,461,475,461,475,461,475,396,305,396,383,396,305,474,499,474,499,474,499,474,499,474,499,474,499,712,696,446,461,446,410,386,410,386,410,386,280],
    8208: [311,0,494,311,563,563,0,0,235,232,236,0,464,463,467,0,385,394,352,0,0,0,708,0],
    8364: [525],
    8482: [925],
  },
  'Archivo Black': {
    peso: 400,
    32: [333,333,500,660,667,1000,889,278,389,389,556,660,333,333,333,278,667,667,667,667,667,667,667,667,667,667,333,333,660,660,660,611,740,778,778,778,778,722,667,833,833,389,667,833,667,944,833,833,722,833,778,722,722,833,778,1000,778,778,722,389,278,389,660,500,333,667,667,667,667,667,389,667,667,333,333,667,333,1000,667,667,667,667,444,611,444,667,611,944,667,611,556,389,278,389,660],
    160: [333,333,667,667,660,667,278,667,333,800,400,667,660,333,800,333,400,660,400,400,333,667,850,333,333,400,400,667,1000,1000,1000,611,778,778,778,778,778,778,1000,778,722,722,722,722,389,389,389,389,778,833,833,833,833,833,833,660,833,833,833,833,833,778,722,667,667,667,667,667,667,667,1000,667,667,667,667,667,333,333,333,333,667,667,667,667,667,667,667,660,667,667,667,667,667,611,667,611,778,667,778,667,778,667,778,667,778,667,778,667,778,667,778,844,778,667,722,667,722,667,722,667,722,667,722,667,833,667,833,667,833,667,833,667,833,667,833,667,389,333,389,333,389,333,389,333,389,333,1028,668,667,333,833,667,667,667,333,667,333,667,500,667,534,667,333,833,667,833,667,833,667,858,814,681,833,667,833,667,833,667,1000,1000,778,444,778,444,778,444,722,611,722,611,722,611,722,611,722,444,722,625,722,444,833,667,833,667,833,667,833,667,833,667,833,667,1000,944,778,611,778,722,556,722,556,722,556,390],
    8208: [0,0,0,500,1000,750,0,500,278,278,278,278,500,500,500,0,667,667,500,0,0,0,1000,0],
    8364: [667],
    8482: [950],
  },
  'Archivo': {
    peso: 600,
    32: [200,292,444,583,541,966,729,246,357,357,407,636,300,333,300,298,575,576,576,576,577,575,576,576,576,575,336,336,636,636,636,613,998,709,706,721,728,672,609,794,732,282,585,695,570,844,732,782,670,782,717,667,619,724,671,954,686,677,634,339,298,339,636,507,209,556,592,547,592,561,307,591,584,252,250,543,252,861,584,598,592,592,362,541,314,583,529,758,546,529,509,394,245,394,636],
    160: [200,292,577,580,580,572,245,579,313,764,397,571,636,333,764,305,400,636,357,357,209,587,590,333,232,357,391,571,855,855,855,613,709,709,709,709,709,709,999,721,672,672,672,672,282,282,282,282,728,732,782,782,782,782,782,636,782,724,724,724,724,677,690,625,556,556,556,556,556,556,895,547,561,561,561,561,252,252,252,252,614,584,598,598,598,598,598,636,598,583,583,583,583,529,592,529,709,556,709,556,709,556,721,547,721,547,721,547,721,547,728,592,728,592,672,561,672,561,672,561,672,561,672,561,794,591,794,591,794,591,794,591,732,584,732,584,282,252,282,252,282,252,282,252,282,252,867,502,585,250,695,543,543,570,252,570,252,570,252,570,252,570,252,732,584,732,584,732,584,584,732,583,782,598,782,598,782,598,1200,950,717,362,717,362,717,362,667,541,667,541,667,541,667,541,619,314,619,314,619,314,724,583,724,583,724,583,724,583,724,583,724,583,954,758,677,529,677,634,509,634,509,634,509,306],
    8208: [600,333,0,500,1000,875,0,507,280,280,280,0,482,482,482,0,580,580,425,0,0,0,965,0],
    8364: [580],
    8482: [1015],
  },
};
// ── fine delle lettere ──

export const MISURA = { larghezza: 1200, altezza: 500 };
// L'anteprima del link (Telegram, WhatsApp, Discord) ha un'altra forma: 1200×630.
export const MISURA_PAGINA = { larghezza: 1200, altezza: 630 };

// ── il modello ─────────────────────────────────────────────────────────────
// Pochi tipi, e ognuno è una cosa che una persona sa afferrare e spostare. Un
// tipo «forma libera» renderebbe l'editor un editor di SVG, cioè inutilizzabile.
export const TIPI = ['testo', 'targhetta', 'avatar', 'riga', 'striscia'];
export const FORME_AVATAR = ['tondo', 'tagliato', 'quadro'];
export const FONDI = ['tinta', 'alone', 'sfumatura'];

// I segnaposto che si possono scrivere dentro un testo.
export const SEGNAPOSTO = ['nome', 'titolo', 'gioco', 'login', 'link', 'spettatori', 'piattaforma'];

// LE EMOJI NON SI DISEGNANO, SI TOLGONO.
//
// Il rasterizzatore ha i caratteri che gli diamo noi — Anton, Archivo — e
// nessuno di quelli sa disegnare un pittogramma: al loro posto esce il
// quadratino vuoto. Un titolo di Twitch ne e' pieno, e la locandina usciva con
// «▨▨Blind Run | ▨▨ !social».
//
// Si tolgono QUI, nel disegno, e non in chi prepara i dati: cosi' l'anteprima
// dell'editor e il PNG che parte fanno la stessa cosa. Se lo facesse solo il
// server, l'editor mostrerebbe un'emoji che poi nella locandina non c'e' — e
// un'anteprima che mente e' il difetto peggiore per un editor.
//
// Va anche nella direzione giusta: nelle grafiche del sito le emoji non ci
// vanno, perche' il disegno e' a china e un'emoji la disegna qualcun altro.
//
// Un'emoji non e' «un carattere di quel blocco Unicode»: e' un carattere che il
// sistema disegna A COLORI invece che come lettera, e Unicode lo dice con
// `Emoji_Presentation`. Il secondo pezzo prende i pittogrammi che sarebbero
// testo ma che il selettore U+FE0F promuove — il caso del triangolo d'avviso.
export const EMOJI_G = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/gu;

const senzaEmoji = (s) => String(s ?? '').replace(EMOJI_G, '')
  .replace(/[\u200D\uFE0F\uFE0E]/g, '').replace(/\s{2,}/g, ' ').trim();

const esc = (s) => senzaEmoji(s).replace(/[<>&"']/g, (c) => (
  { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

// ── i testi si misurano (docs/CARTA-LIVE.md, «I testi si misurano») ──
//
// Quanto e' largo un testo e' la somma delle larghezze delle sue lettere, che
// stanno nei file dei caratteri (LETTERE, sopra). Il crenamento non si conta:
// misurato contro il browser e il disegnatore del server, sposta al piu' lo
// 0,8% in piu', quindi la misura si prende col 2% d'aria (ARIA). Una lettera che
// i nostri caratteri non hanno la disegna un carattere di riserva, e la si
// conta larga un corpo intero.
const ARIA = 1.02;
const MARGINE = 48;
// Quanto un testo puo' rimpicciolirsi per starci: fino al 55% del corpo
// scelto (oltre, il nome diventa piccolo come la riga sotto e la carta perde il
// suo ordine), e mai sotto i 22 punti, che nell'anteprima di una chat, larga un
// terzo, sono gia' il testo piu' piccolo che si legge.
const PIU_PICCOLO = 0.55;
const LEGGIBILE = 22;

function avanzo(tab, c) {
  for (const da in tab) {
    if (da === 'peso') continue;
    const i = c - Number(da);
    if (i >= 0 && i < tab[da].length) return tab[da][i] || 1000;
  }
  return 1000;
}

export function larghezzaTesto(testo, carattere, corpo, spaziatura = 0) {
  const tab = LETTERE[carattere] || LETTERE.Archivo;
  let somma = 0, n = 0;
  for (const ch of String(testo ?? '')) { somma += avanzo(tab, ch.codePointAt(0)); n += 1; }
  return (somma * corpo / 1000) * ARIA + Math.max(0, spaziatura) * n;
}

// Un testo dentro la sua larghezza. Il corpo scende quanto serve perche' ci
// stia, fino al suo minimo (sotto); se nemmeno li' ci sta, a quel corpo si
// taglia e i puntini dicono che continua, misurati anche loro. Il testo non esce
// mai dalla sua larghezza.
export function adatta(testo, carattere, corpo, spaziatura, largo, fisso = 0) {
  const sp = Math.max(0, spaziatura);
  const misura = (t, c) => larghezzaTesto(t, carattere, c, spaziatura) + fisso * c;
  // il corpo piu' grande a cui `t` ci sta (la misura cresce dritta col corpo)
  const sta = (t) => { const u = larghezzaTesto(t, carattere, 1, 0) + fisso; return u > 0 ? Math.floor((largo - sp * [...t].length) / u) : corpo; };
  const t = String(testo ?? '');
  if (misura(t, corpo) <= largo) return { corpo, testo: t };
  const minimo = Math.min(corpo, Math.max(8, Math.round(corpo * PIU_PICCOLO), Math.min(corpo, LEGGIBILE)));
  const c = sta(t);
  if (c >= minimo) return { corpo: Math.min(corpo, c), testo: t };
  const lettere = [...t];
  while (lettere.length > 1 && misura(lettere.join('').trimEnd() + '…', minimo) > largo) lettere.pop();
  const corto = lettere.join('').trimEnd() + '…';
  if (misura(corto, minimo) <= largo) return { corpo: minimo, testo: corto };
  // Una larghezza minuscola o una spaziatura enorme: nemmeno una lettera coi
  // puntini ci sta al minimo. Il testo non esce lo stesso: scende ancora, e se
  // nemmeno a un punto ci sta, non si disegna.
  const c2 = sta(corto);
  return c2 >= 1 ? { corpo: Math.min(minimo, c2), testo: corto } : { corpo: minimo, testo: '' };
}

// La larghezza in cui un testo sta: quella scelta, ma mai oltre il bordo della
// carta (meno un margine piccolo). Una sola funzione per il disegno e per il
// campo a puntini dell'editor: quello che si vede e' quello che si disegna.
export const larghezzaUtile = (e, W) => {
  const fino = Math.max(40, W - (Number(e.x) || 0) - MARGINE / 2);
  return Number(e.larghezza) > 0 ? Math.min(Number(e.larghezza), fino) : Math.max(40, W - (Number(e.x) || 0) - MARGINE);
};

function riempi(modello, dati) {
  return String(modello ?? '').replace(/\{(\w+)\}/g, (tutto, chiave) => (
    SEGNAPOSTO.includes(chiave) ? String(dati[chiave] ?? '') : tutto));
}

// ── i due temi standard ────────────────────────────────────────────────────
//
// Non sono lo stesso disegno ricolorato: sono due tradizioni visive diverse,
// perché le due piattaforme lo sono.
//
// TWITCH — notte viola. Il viola è LUCE, non vernice: un alone dietro la faccia.
// Cerchio, grottesca larga, angoli morbidi. Colori della marca: 9146FF, 772CE8.
//
// KICK — nero pieno e un taglio. Niente arrotondamenti, carattere condensato da
// manifesto, e il verde usato UNA VOLTA SOLA come segnale, mai come fascione.
// L'avatar è quadrato con l'angolo tagliato: geometria opposta, di proposito.

// I nomi dei temi nelle tre lingue del pannello: il primo e' quello che la
// carta porta con se'. Il nome e' un'etichetta e non il disegno: un tema si
// riconosce da com'e' fatto (improntaCarta), non da come si chiama.
export const NOMI_TEMA = Object.freeze({
  twitch: Object.freeze(['Twitch: notte viola', 'Twitch: purple night', 'Twitch: noche violeta']),
  kick: Object.freeze(['Kick: taglio verde', 'Kick: green cut', 'Kick: corte verde']),
});

export const TEMI = {
  twitch: {
    nome: NOMI_TEMA.twitch[0],
    ...MISURA,
    fondo: { tipo: 'alone', tinta: '#0F0A1B', alone: '#A970FF', alone2: '#772CE8', cx: 18, cy: 34, r: 70 },
    elementi: [
      { id: 'avatar', tipo: 'avatar', x: 258, y: 250, d: 264, forma: 'tondo',
        bordo: '#9146FF', spessore: 6, aureola: true },
      { id: 'targhetta', tipo: 'targhetta', x: 470, y: 116, testo: 'LIVE',
        sfondo: '#9146FF', colore: '#FFFFFF', carattere: 'Archivo Black', corpo: 26, punto: true },
      { id: 'nome', tipo: 'testo', x: 470, y: 256, testo: '{nome}',
        carattere: 'Archivo Black', corpo: 72, colore: '#FFFFFF', larghezza: 680 },
      { id: 'titolo', tipo: 'testo', x: 470, y: 312, testo: '{titolo}',
        carattere: 'Archivo', corpo: 32, colore: '#C4BBD6', larghezza: 680 },
      { id: 'gioco', tipo: 'testo', x: 490, y: 380, testo: '{gioco}',
        carattere: 'Archivo', corpo: 26, colore: '#9F8FC0', larghezza: 660, spaziatura: 1 },
      { id: 'trattino', tipo: 'riga', x: 470, y: 356, larghezza: 5, altezza: 30, colore: '#9146FF' },
      { id: 'indirizzo', tipo: 'testo', x: 470, y: 436, testo: 'twitch.tv/{login}',
        carattere: 'Archivo', corpo: 25, colore: '#7E72A0', larghezza: 680 },
    ],
  },
  kick: {
    nome: NOMI_TEMA.kick[0],
    ...MISURA,
    fondo: { tipo: 'sfumatura', tinta: '#0B0F0A', alone: '#000000' },
    elementi: [
      { id: 'striscia', tipo: 'striscia', x: 0, larghezza: 40, inclinazione: 22, colore: '#53FC18' },
      { id: 'avatar', tipo: 'avatar', x: 271, y: 230, d: 242, forma: 'tagliato',
        bordo: '#53FC18', spessore: 3, aureola: false },
      { id: 'targhetta', tipo: 'targhetta', x: 150, y: 382, testo: 'LIVE',
        sfondo: '#53FC18', colore: '#000000', carattere: 'Anton', corpo: 32, punto: false, tagliata: true },
      { id: 'nome', tipo: 'testo', x: 456, y: 204, testo: '{nome}',
        carattere: 'Anton', corpo: 86, colore: '#FFFFFF', larghezza: 690, maiuscolo: true, spaziatura: 1 },
      { id: 'titolo', tipo: 'testo', x: 456, y: 268, testo: '{titolo}',
        carattere: 'Archivo', corpo: 31, colore: '#9A9A9A', larghezza: 690 },
      { id: 'gioco', tipo: 'testo', x: 456, y: 332, testo: '{gioco}',
        carattere: 'Archivo Black', corpo: 23, colore: '#53FC18', larghezza: 690, maiuscolo: true, spaziatura: 3 },
      { id: 'filo', tipo: 'riga', x: 456, y: 366, larghezza: 600, altezza: 2, colore: '#1E2A1A' },
      { id: 'indirizzo', tipo: 'testo', x: 456, y: 410, testo: 'kick.com/{login}',
        carattere: 'Archivo', corpo: 26, colore: '#6B6B6B', larghezza: 690 },
    ],
  },
};

export const NOMI_TEMI = Object.keys(TEMI);

// Il tema giusto per una piattaforma, quando lo streamer non ha scelto.
export function temaPerPiattaforma(p) {
  return TEMI[p] ? p : 'twitch';
}

// ── le carte dell'anteprima del link ───────────────────────────────────────
//
// Quando si incolla la pagina link o quella delle donazioni in una chat, l'app
// mostra una cartolina: questa. Stessa famiglia delle locandine (stessi tipi,
// stessi caratteri, stesso editor), altra forma e altro impianto: qui non c'e'
// una diretta da annunciare ma una persona da riconoscere.
//
// Le due carte sono STANDARD MA NON FISSE: di partenza si vestono col colore
// d'accento della pagina (tintaCarta), e lo streamer le rifa' come vuole con
// l'editor. Il «segnale» e' il colore che nel preset fa da accento: e' quello
// che la tinta sostituisce, in ogni posto in cui compare.
//
// LINK — notte con l'alone: la faccia con l'aureola, il nome grande, il
// sottotitolo, un trattino, l'indirizzo. DONA — taglio: un fondo sfumato, una
// striscia di colore a destra, la targhetta tagliata, il nome condensato.
// NEGOZIO — vetrina: un fondo con l'alone in basso, la faccia quadrata come
// un'etichetta, la targhetta del negozio, il nome. TELEGRAM — la porta del
// gruppo: l'alone in alto a destra, la faccia con l'angolo tagliato, la
// targhetta del gruppo, il nome.
//
// L'ELENCO DELLE PAGINE E' QUESTO (le chiavi di TEMI_PAGINA, NOMI_TEMI_PAGINA):
// il database, le rotte dell'immagine e il pannello lo leggono da qui, e un
// contratto vuole che non ne manchi nessuna (test/contratto/anteprima-link).
export const SEGNALE_PAGINA = { link: '#7C5CFF', dona: '#FF4FA3', negozio: '#2BB673', telegram: '#2AABEE' };
// La targhetta parla la lingua del canale: e' la sola parola della carta di
// partenza che non scrive lo streamer, e un canale inglese non deve trovarsela
// in italiano. Il preset tiene quella italiana.
const TARGHETTE = {
  link: { it: 'I MIEI LINK', en: 'MY LINKS', es: 'MIS ENLACES' },
  dona: { it: 'SOSTIENIMI', en: 'SUPPORT ME', es: 'APÓYAME' },
  negozio: { it: 'IL NEGOZIO', en: 'SHOP', es: 'LA TIENDA' },
  telegram: { it: 'IL GRUPPO TELEGRAM', en: 'TELEGRAM GROUP', es: 'GRUPO DE TELEGRAM' },
};

export const TEMI_PAGINA = {
  link: {
    nome: 'I miei link',
    ...MISURA_PAGINA,
    fondo: { tipo: 'alone', tinta: '#0F0D16', alone: '#7C5CFF', alone2: '#382973', cx: 22, cy: 45, r: 62 },
    elementi: [
      { id: 'avatar', tipo: 'avatar', x: 290, y: 315, d: 300, forma: 'tondo',
        bordo: '#7C5CFF', spessore: 6, aureola: true },
      { id: 'targhetta', tipo: 'targhetta', x: 520, y: 176, testo: 'I MIEI LINK',
        sfondo: '#7C5CFF', colore: '#FFFFFF', carattere: 'Archivo Black', corpo: 24, punto: false },
      { id: 'nome', tipo: 'testo', x: 520, y: 318, testo: '{nome}',
        carattere: 'Archivo Black', corpo: 78, colore: '#FFFFFF', larghezza: 630 },
      { id: 'titolo', tipo: 'testo', x: 520, y: 376, testo: '{titolo}',
        carattere: 'Archivo', corpo: 32, colore: '#C9C4D6', larghezza: 630 },
      { id: 'trattino', tipo: 'riga', x: 520, y: 416, larghezza: 56, altezza: 5, colore: '#7C5CFF' },
      { id: 'indirizzo', tipo: 'testo', x: 520, y: 472, testo: '{link}',
        carattere: 'Archivo', corpo: 27, colore: '#8E88A3', larghezza: 630 },
    ],
  },
  dona: {
    nome: 'Sostienimi',
    ...MISURA_PAGINA,
    fondo: { tipo: 'sfumatura', tinta: '#120B10', alone: '#47162E' },
    elementi: [
      { id: 'striscia', tipo: 'striscia', x: 1130, larghezza: 38, inclinazione: 14, colore: '#FF4FA3' },
      { id: 'avatar', tipo: 'avatar', x: 290, y: 315, d: 280, forma: 'tondo',
        bordo: '#FF4FA3', spessore: 4, aureola: false },
      { id: 'targhetta', tipo: 'targhetta', x: 520, y: 170, testo: 'SOSTIENIMI',
        sfondo: '#FF4FA3', colore: '#FFFFFF', carattere: 'Anton', corpo: 28, punto: false, tagliata: true },
      { id: 'nome', tipo: 'testo', x: 520, y: 322, testo: '{nome}',
        carattere: 'Anton', corpo: 88, colore: '#FFFFFF', larghezza: 520, maiuscolo: true, spaziatura: 1 },
      { id: 'titolo', tipo: 'testo', x: 520, y: 380, testo: '{titolo}',
        carattere: 'Archivo', corpo: 31, colore: '#D6C9D2', larghezza: 520 },
      { id: 'filo', tipo: 'riga', x: 520, y: 418, larghezza: 500, altezza: 2, colore: '#2E1F2A' },
      { id: 'indirizzo', tipo: 'testo', x: 520, y: 470, testo: '{link}',
        carattere: 'Archivo', corpo: 27, colore: '#9B8E98', larghezza: 520 },
    ],
  },
  negozio: {
    nome: 'Il negozio',
    ...MISURA_PAGINA,
    fondo: { tipo: 'alone', tinta: '#0C1310', alone: '#2BB673', alone2: '#135234', cx: 78, cy: 92, r: 70 },
    elementi: [
      { id: 'avatar', tipo: 'avatar', x: 290, y: 315, d: 280, forma: 'quadro',
        bordo: '#2BB673', spessore: 6, aureola: false },
      { id: 'targhetta', tipo: 'targhetta', x: 520, y: 172, testo: 'IL NEGOZIO',
        sfondo: '#2BB673', colore: '#FFFFFF', carattere: 'Archivo Black', corpo: 26, punto: false },
      { id: 'nome', tipo: 'testo', x: 520, y: 318, testo: '{nome}',
        carattere: 'Archivo Black', corpo: 74, colore: '#FFFFFF', larghezza: 630 },
      { id: 'titolo', tipo: 'testo', x: 520, y: 376, testo: '{titolo}',
        carattere: 'Archivo', corpo: 31, colore: '#C4D6CC', larghezza: 630 },
      { id: 'trattino', tipo: 'riga', x: 520, y: 416, larghezza: 56, altezza: 5, colore: '#2BB673' },
      { id: 'indirizzo', tipo: 'testo', x: 520, y: 472, testo: '{link}',
        carattere: 'Archivo', corpo: 27, colore: '#8FA399', larghezza: 630 },
    ],
  },
  telegram: {
    nome: 'Il gruppo',
    ...MISURA_PAGINA,
    fondo: { tipo: 'alone', tinta: '#0B1218', alone: '#2AABEE', alone2: '#134D6B', cx: 86, cy: 8, r: 66 },
    elementi: [
      { id: 'avatar', tipo: 'avatar', x: 290, y: 315, d: 290, forma: 'tagliato',
        bordo: '#2AABEE', spessore: 5, aureola: false },
      { id: 'targhetta', tipo: 'targhetta', x: 520, y: 172, testo: 'IL GRUPPO TELEGRAM',
        sfondo: '#2AABEE', colore: '#FFFFFF', carattere: 'Archivo Black', corpo: 24, punto: false },
      { id: 'nome', tipo: 'testo', x: 520, y: 318, testo: '{nome}',
        carattere: 'Archivo Black', corpo: 74, colore: '#FFFFFF', larghezza: 630 },
      { id: 'titolo', tipo: 'testo', x: 520, y: 376, testo: '{titolo}',
        carattere: 'Archivo', corpo: 31, colore: '#BFD3E0', larghezza: 630 },
      { id: 'trattino', tipo: 'riga', x: 520, y: 416, larghezza: 56, altezza: 5, colore: '#2AABEE' },
      { id: 'indirizzo', tipo: 'testo', x: 520, y: 472, testo: '{link}',
        carattere: 'Archivo', corpo: 27, colore: '#8BA3B3', larghezza: 630 },
    ],
  },
};
export const NOMI_TEMI_PAGINA = Object.keys(TEMI_PAGINA);

// Un colore in tre numeri, e ritorno. Solo esadecimali a 3 o 6 cifre: il resto
// non e' un colore, e non entra.
const rgbDi = (hex) => {
  const h = String(hex || '').replace('#', '');
  const p = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(p)) return null;
  return [0, 2, 4].map((i) => parseInt(p.slice(i, i + 2), 16));
};
const hexDi = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();

// Mescola due colori: q = 0 tutto il primo, q = 1 tutto il secondo.
export function mescola(a, b, q) {
  const x = rgbDi(a), y = rgbDi(b);
  if (!x || !y) return a;
  const t = Math.max(0, Math.min(1, Number(q) || 0));
  return hexDi(x.map((v, i) => v * (1 - t) + y[i] * t));
}

// Il testo che si legge sopra un colore: nero sui chiari, bianco sugli scuri.
export function suColore(hex) {
  const c = rgbDi(hex);
  if (!c) return '#FFFFFF';
  const lin = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  return L > 0.5 ? '#000000' : '#FFFFFF';
}

// La carta col colore della pagina: dove il preset ha il suo segnale, va il
// colore dato; le sfumature del fondo si ricavano da quello; il testo delle
// targhette resta leggibile. Con il segnale stesso, torna il preset identico.
export function tintaCarta(carta, segnale, accento) {
  const a = rgbDi(accento) ? hexDi(rgbDi(accento)) : '';
  const s = rgbDi(segnale) ? hexDi(rgbDi(segnale)) : '';
  if (!a || !s || !carta) return carta;
  const stesso = (v) => rgbDi(v) && hexDi(rgbDi(v)) === s;
  const cambia = (v) => (stesso(v) ? a : v);
  const f = { ...(carta.fondo || {}) };
  if (f.tipo === 'alone') { f.alone = cambia(f.alone); f.alone2 = mescola(a, '#000000', 0.55); }
  else if (f.tipo === 'sfumatura') f.alone = mescola(a, '#000000', 0.72);
  const elementi = (carta.elementi || []).map((e) => {
    const n = { ...e };
    for (const k of ['bordo', 'sfondo', 'colore']) if (k in n) n[k] = cambia(n[k]);
    if (e.tipo === 'targhetta' && stesso(e.sfondo)) n.colore = suColore(a);
    return n;
  });
  return { ...carta, fondo: f, elementi };
}

// La carta dell'anteprima di una pagina: quella sua se l'ha rifatta, sennò lo
// standard vestito col colore della pagina. Una funzione sola per chi disegna
// l'immagine e per chi apre l'editor.
export function cartaPaginaDi({ dati, quale, accento, lingua = 'it' } = {}) {
  if (dati && Array.isArray(dati.elementi) && dati.elementi.length) return normCarta(dati);
  const q = TEMI_PAGINA[quale] ? quale : 'link';
  const scritta = TARGHETTE[q][lingua] || TARGHETTE[q].it;
  const tema = { ...TEMI_PAGINA[q], elementi: TEMI_PAGINA[q].elementi.map((e) => (e.id === 'targhetta' ? { ...e, testo: scritta } : e)) };
  return normCarta(tintaCarta(tema, SEGNALE_PAGINA[q], accento || SEGNALE_PAGINA[q]));
}

// Le vesti da cui ripartire nell'editor dell'anteprima: i disegni delle
// pagine, ognuno col colore della pagina e con la targhetta della pagina che si
// sta vestendo (la carta del negozio vestita «Striscia» dice ancora «il
// negozio», non «sostienimi»). Lo stesso aspetto dei temi della locandina:
// id, nome, nomi nelle tre lingue, carta.
const VESTI_PAGINA = { link: ['Alone', 'Glow', 'Halo'], dona: ['Striscia', 'Stripe', 'Franja'], negozio: ['Cornice', 'Frame', 'Marco'], telegram: ['Angolo', 'Corner', 'Esquina'] };
export function vestiPagina({ quale, accento, lingua = 'it' } = {}) {
  const q = TEMI_PAGINA[quale] ? quale : 'link';
  const targa = (cartaPaginaDi({ quale: q, accento, lingua }).elementi.find((e) => e.tipo === 'targhetta') || {}).testo;
  return Object.keys(TEMI_PAGINA).map((k) => {
    const c = cartaPaginaDi({ quale: k, accento, lingua });
    return { id: k, nome: VESTI_PAGINA[k][0], nomi: VESTI_PAGINA[k],
      carta: { ...c, elementi: c.elementi.map((e) => (e.tipo === 'targhetta' && targa ? { ...e, testo: targa } : e)) } };
  });
}

// ── la validazione ─────────────────────────────────────────────────────────
//
// La carta arriva dall'EDITOR, cioè dalla rete, cioè da fuori. Ogni valore va a
// finire dentro un disegno: un colore diventa un attributo, un numero diventa
// una coordinata. Non si controlla «se sembra strano»: si accetta SOLO la forma
// giusta e si ricade sul valore buono. Quello che non è un colore non entra, e
// non c'è una strada in cui possa entrare.

const NOMI_CARATTERI = CARATTERI.map(([n]) => n);
const COLORE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const colore = (v, difetto) => (COLORE.test(String(v || '')) ? String(v) : difetto);
const numero = (v, min, max, difetto) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : difetto;
};
const unoDi = (v, elenco, difetto) => (elenco.includes(v) ? v : difetto);
const frase = (v, max, difetto = '') => {
  const t = String(v ?? '').replace(/[\r\n\t]/g, ' ').trim();
  return t ? t.slice(0, max) : difetto;
};

export function normElemento(e, W, H) {
  const tipo = unoDi(e?.tipo, TIPI, 'testo');
  const base = {
    id: frase(e?.id, 24) || tipo,
    tipo,
    spento: e?.spento === true,
    x: numero(e?.x, -W, W * 2, 0),
    y: numero(e?.y, -H, H * 2, 0),
  };
  if (tipo === 'avatar') {
    return { ...base,
      d: numero(e?.d, 40, Math.max(W, H), 240),
      forma: unoDi(e?.forma, FORME_AVATAR, 'tondo'),
      bordo: colore(e?.bordo, '#FFFFFF'),
      spessore: numero(e?.spessore, 0, 40, 0),
      aureola: e?.aureola === true };
  }
  if (tipo === 'targhetta') {
    return { ...base,
      testo: frase(e?.testo, 40, 'LIVE'),
      sfondo: colore(e?.sfondo, '#9146FF'),
      colore: colore(e?.colore, '#FFFFFF'),
      carattere: unoDi(e?.carattere, NOMI_CARATTERI, 'Archivo Black'),
      corpo: numero(e?.corpo, 10, 200, 26),
      punto: e?.punto === true,
      tagliata: e?.tagliata === true };
  }
  if (tipo === 'riga') {
    return { ...base,
      larghezza: numero(e?.larghezza, 1, W * 2, 4),
      altezza: numero(e?.altezza, 1, H * 2, 4),
      colore: colore(e?.colore, '#FFFFFF') };
  }
  if (tipo === 'striscia') {
    return { ...base,
      larghezza: numero(e?.larghezza, 2, W, 40),
      inclinazione: numero(e?.inclinazione, -80, 80, 0),
      colore: colore(e?.colore, '#53FC18') };
  }
  return { ...base,
    testo: frase(e?.testo, 160, '{nome}'),
    carattere: unoDi(e?.carattere, NOMI_CARATTERI, 'Archivo'),
    corpo: numero(e?.corpo, 8, 240, 28),
    colore: colore(e?.colore, '#FFFFFF'),
    larghezza: numero(e?.larghezza, 40, W * 2, Math.max(40, W - base.x - MARGINE)),
    spaziatura: numero(e?.spaziatura, -10, 40, 0),
    maiuscolo: e?.maiuscolo === true };
}

// Quanti elementi può avere una carta. Non è un numero contro gli abusi: è che
// oltre, l'immagine diventa illeggibile e la si disegna per niente.
export const MAX_ELEMENTI = 24;

// COM'E' FATTA UNA CARTA, senza il suo nome: serve a dire «stai usando un tema
// standard». Il nome non conta, cosi' un tema scelto prima che il suo nome
// cambiasse resta quel tema.
export function improntaCarta(c) {
  const { nome, ...disegno } = normCarta(c);
  return JSON.stringify(disegno);
}

export function normCarta(c) {
  const W = numero(c?.larghezza, 400, 2000, MISURA.larghezza);
  const H = numero(c?.altezza, 200, 1400, MISURA.altezza);
  const f = c?.fondo || {};
  const elenco = Array.isArray(c?.elementi) ? c.elementi.slice(0, MAX_ELEMENTI) : [];
  return {
    nome: frase(c?.nome, 60, 'La mia carta'),
    larghezza: W,
    altezza: H,
    fondo: {
      tipo: unoDi(f.tipo, FONDI, 'alone'),
      tinta: colore(f.tinta, '#0F0A1B'),
      alone: colore(f.alone, '#A970FF'),
      alone2: colore(f.alone2, '#772CE8'),
      cx: numero(f.cx, 0, 100, 18),
      cy: numero(f.cy, 0, 100, 34),
      r: numero(f.r, 5, 200, 70),
    },
    elementi: elenco.map((e) => normElemento(e, W, H)),
  };
}

// La carta che va usata per questo canale: quella sua se ce l'ha, sennò il tema
// della sua piattaforma. Una funzione sola, così chi disegna e chi mostra
// l'anteprima non possono mai guardare due carte diverse.
export function cartaDi({ dati, piattaforma } = {}) {
  if (dati && Array.isArray(dati.elementi) && dati.elementi.length) return normCarta(dati);
  return TEMI[temaPerPiattaforma(piattaforma)];
}

// ── il disegno ─────────────────────────────────────────────────────────────

function fondoSvg(f, W, H) {
  const tinta = esc(f?.tinta || '#0F0A1B');
  if (f?.tipo === 'tinta') return `<rect width="${W}" height="${H}" fill="${tinta}"/>`;
  if (f?.tipo === 'sfumatura') {
    return `<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1">`
      + `<stop offset="0" stop-color="${tinta}"/><stop offset="1" stop-color="${esc(f.alone || '#000000')}"/>`
      + `</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#f)"/>`;
  }
  const a = esc(f?.alone || '#A970FF'), a2 = esc(f?.alone2 || '#772CE8');
  return `<defs><radialGradient id="al" cx="${Number(f?.cx ?? 18)}%" cy="${Number(f?.cy ?? 34)}%" r="${Number(f?.r ?? 70)}%">`
    + `<stop offset="0" stop-color="${a}" stop-opacity=".62"/>`
    + `<stop offset=".45" stop-color="${a2}" stop-opacity=".22"/>`
    + `<stop offset="1" stop-color="${a2}" stop-opacity="0"/></radialGradient></defs>`
    + `<rect width="${W}" height="${H}" fill="${tinta}"/><rect width="${W}" height="${H}" fill="url(#al)"/>`;
}

function avatarSvg(e, dati, n) {
  const d = Math.max(40, Number(e.d) || 240), r = d / 2;
  const x = Number(e.x) || 0, y = Number(e.y) || 0;
  const bordo = esc(e.bordo || '#FFFFFF'), sp = Math.max(0, Number(e.spessore) || 0);
  const foto = dati.avatar
    ? `<image href="${esc(dati.avatar)}" x="${x - r}" y="${y - r}" width="${d}" height="${d}"
        preserveAspectRatio="xMidYMid slice" clip-path="url(#ma${n})"/>`
    : '';
  // Il buco sotto la foto: se l'avatar non arriva, si vede una forma piena e
  // non un vuoto trasparente che lascia passare il fondo a metà.
  if (e.forma === 'tondo') {
    return `<defs><clipPath id="ma${n}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath></defs>`
      + (e.aureola ? `<circle cx="${x}" cy="${y}" r="${r + 13}" fill="none" stroke="${bordo}" stroke-width="2" stroke-opacity=".28"/>` : '')
      + `<circle cx="${x}" cy="${y}" r="${r}" fill="#1B1526"/>${foto}`
      + (sp ? `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${bordo}" stroke-width="${sp}"/>` : '');
  }
  const t = e.forma === 'tagliato' ? Math.round(d * 0.17) : 0;
  const p = `M${x - r} ${y - r} H${x + r} V${y + r - t} L${x + r - t} ${y + r} H${x - r} Z`;
  return `<defs><clipPath id="ma${n}"><path d="${p}"/></clipPath></defs>`
    + `<path d="${p}" fill="#101410"/>${foto}`
    + (sp ? `<path d="${p}" fill="none" stroke="${bordo}" stroke-width="${sp}"/>` : '');
}

function testoSvg(e, dati, W, fantasmi) {
  let t = senzaEmoji(riempi(e.testo, dati));
  if (e.maiuscolo) t = t.toUpperCase();
  const x = Number(e.x) || 0, y = Number(e.y) || 0;
  const sp = Number(e.spaziatura) || 0;
  const carattere = e.carattere || 'Archivo';
  const pieno = Math.max(8, Number(e.corpo) || 28);
  // Nell'editor un testo che i dati lasciano vuoto si vede in trasparenza, col
  // suo segnaposto: cosi' lo si trova e lo si prende. Nell'immagine non c'e'.
  if (!t) {
    if (!fantasmi) return '';
    return `<text x="${x}" y="${y}" font-family="${esc(carattere)}" font-size="${pieno}" fill="${esc(e.colore || '#FFFFFF')}" fill-opacity=".3">${esc(e.testo || '…')}</text>`;
  }
  const { corpo, testo } = adatta(t, carattere, pieno, sp, larghezzaUtile(e, W));
  return `<text x="${x}" y="${y}" font-family="${esc(carattere)}"`
    + ` font-size="${corpo}" fill="${esc(e.colore || '#FFFFFF')}"`
    + (sp ? ` letter-spacing="${sp}"` : '') + `>${esc(testo)}</text>`;
}

function targhettaSvg(e, dati, W) {
  const x = Number(e.x) || 0, y = Number(e.y) || 0;
  const carattere = e.carattere || 'Archivo Black';
  // Il margine prima della parola (col pallino, piu' largo), quello dopo e lo
  // spigolo tagliato crescono col corpo: entrano nella misura come una parte
  // fissa per ogni punto di corpo, cosi' anche la targhetta sta nella carta.
  const prima = e.punto ? 1.55 : 0.7, dopo = 0.7 + (e.tagliata ? 1.75 * 0.45 : 0);
  const { corpo, testo: t } = adatta(senzaEmoji(riempi(e.testo, dati) || 'LIVE').toUpperCase(), carattere,
    Math.max(10, Number(e.corpo) || 26), 2, Math.max(60, W - x - MARGINE / 2), prima + dopo);
  const alt = Math.round(corpo * 1.75);
  const largo = Math.round(corpo * (prima + dopo) + larghezzaTesto(t, carattere, corpo, 2));
  const sfondo = esc(e.sfondo || '#9146FF'), colore = esc(e.colore || '#FFFFFF');
  const forma = e.tagliata
    ? `<path d="M${x} ${y} H${x + largo} L${x + largo - Math.round(alt * 0.45)} ${y + alt} H${x} Z" fill="${sfondo}"/>`
    : `<rect x="${x}" y="${y}" width="${largo}" height="${alt}" fill="${sfondo}"/>`;
  const dx = Math.round(corpo * prima);
  return forma
    + (e.punto ? `<circle cx="${x + Math.round(corpo * 0.78)}" cy="${y + alt / 2}" r="${Math.round(corpo * 0.3)}" fill="${colore}"/>` : '')
    + `<text x="${x + dx}" y="${y + Math.round(alt * 0.72)}" font-family="${esc(carattere)}"`
    + ` font-size="${corpo}" fill="${colore}" letter-spacing="2">${esc(t)}</text>`;
}

function rigaSvg(e) {
  return `<rect x="${Number(e.x) || 0}" y="${Number(e.y) || 0}" width="${Math.max(1, Number(e.larghezza) || 4)}"`
    + ` height="${Math.max(1, Number(e.altezza) || 4)}" fill="${esc(e.colore || '#FFFFFF')}"/>`;
}

function strisciaSvg(e, W, H) {
  const x = Number(e.x) || 0, w = Math.max(2, Number(e.larghezza) || 40);
  const incl = Number(e.inclinazione) || 0;
  const giu = Math.round(H * (incl / 100));
  return `<path d="M${x} 0 H${x + w} L${x + w - giu} ${H} H${x - giu} Z" fill="${esc(e.colore || '#53FC18')}"/>`;
}

// La carta come SVG. Funzione PURA: stessi dati, stessa immagine — così il
// collaudo può confrontarla senza sorprese.
export function svgCarta(carta, dati = {}, { fantasmi = false } = {}) {
  const W = Math.max(200, Number(carta?.larghezza) || MISURA.larghezza);
  const H = Math.max(120, Number(carta?.altezza) || MISURA.altezza);
  const pezzi = [];
  let n = 0;
  for (const e of (carta?.elementi || [])) {
    if (!e || e.spento) continue;
    n += 1;
    let dentro = '';
    if (e.tipo === 'avatar') dentro = avatarSvg(e, dati, n);
    else if (e.tipo === 'testo') dentro = testoSvg(e, dati, W, fantasmi);
    else if (e.tipo === 'targhetta') dentro = targhettaSvg(e, dati, W);
    else if (e.tipo === 'riga') dentro = rigaSvg(e);
    else if (e.tipo === 'striscia') dentro = strisciaSvg(e, W, H);
    if (!dentro) continue;
    // Ogni elemento esce dentro al suo gruppo, con il suo nome addosso. Non
    // cambia un pixel — un <g> non disegna niente — ma è quello che permette
    // all'editor di CHIEDERE all'SVG dove sta una cosa e cosa c'è sotto al dito,
    // invece di rifarsi i conti per conto suo. Rifarli sarebbe la stessa
    // geometria scritta due volte: il giorno che una delle due cambia, si
    // seleziona un elemento e se ne sposta un altro.
    pezzi.push(`<g data-el="${esc(e.id || e.tipo)}">${dentro}</g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`
    + ` width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + fondoSvg(carta?.fondo, W, H) + pezzi.join('') + '</svg>';
}
