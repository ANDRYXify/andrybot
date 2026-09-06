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

export const MISURA = { larghezza: 1200, altezza: 500 };

// ── il modello ─────────────────────────────────────────────────────────────
// Pochi tipi, e ognuno è una cosa che una persona sa afferrare e spostare. Un
// tipo «forma libera» renderebbe l'editor un editor di SVG, cioè inutilizzabile.
export const TIPI = ['testo', 'targhetta', 'avatar', 'riga', 'striscia'];
export const FORME_AVATAR = ['tondo', 'tagliato', 'quadro'];
export const FONDI = ['tinta', 'alone', 'sfumatura'];

// I segnaposto che si possono scrivere dentro un testo.
export const SEGNAPOSTO = ['nome', 'titolo', 'gioco', 'login', 'link', 'spettatori', 'piattaforma'];

const esc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => (
  { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

// Il testo non si può misurare senza un motore di caratteri, quindi si taglia a
// un numero di segni. Meglio un titolo con i puntini che un titolo che esce dal
// bordo — e uscire dal bordo è quello che succede a non fare niente.
const taglia = (s, n) => {
  const t = String(s ?? '');
  return t.length > n ? t.slice(0, Math.max(1, n - 1)).trimEnd() + '…' : t;
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

export const TEMI = {
  twitch: {
    nome: 'Twitch — notte viola',
    ...MISURA,
    fondo: { tipo: 'alone', tinta: '#0F0A1B', alone: '#A970FF', alone2: '#772CE8', cx: 18, cy: 34, r: 70 },
    elementi: [
      { id: 'avatar', tipo: 'avatar', x: 258, y: 250, d: 264, forma: 'tondo',
        bordo: '#9146FF', spessore: 6, aureola: true },
      { id: 'targhetta', tipo: 'targhetta', x: 470, y: 116, testo: 'LIVE',
        sfondo: '#9146FF', colore: '#FFFFFF', carattere: 'Archivo Black', corpo: 26, punto: true },
      { id: 'nome', tipo: 'testo', x: 470, y: 256, testo: '{nome}',
        carattere: 'Archivo Black', corpo: 72, colore: '#FFFFFF', max: 15 },
      { id: 'titolo', tipo: 'testo', x: 470, y: 312, testo: '{titolo}',
        carattere: 'Archivo', corpo: 32, colore: '#C4BBD6', max: 42 },
      { id: 'gioco', tipo: 'testo', x: 490, y: 380, testo: '{gioco}',
        carattere: 'Archivo', corpo: 26, colore: '#9F8FC0', max: 34, spaziatura: 1 },
      { id: 'trattino', tipo: 'riga', x: 470, y: 356, larghezza: 5, altezza: 30, colore: '#9146FF' },
      { id: 'indirizzo', tipo: 'testo', x: 470, y: 436, testo: 'twitch.tv/{login}',
        carattere: 'Archivo', corpo: 25, colore: '#7E72A0', max: 40 },
    ],
  },
  kick: {
    nome: 'Kick — taglio verde',
    ...MISURA,
    fondo: { tipo: 'sfumatura', tinta: '#0B0F0A', alone: '#000000' },
    elementi: [
      { id: 'striscia', tipo: 'striscia', x: 0, larghezza: 40, inclinazione: 22, colore: '#53FC18' },
      { id: 'avatar', tipo: 'avatar', x: 271, y: 230, d: 242, forma: 'tagliato',
        bordo: '#53FC18', spessore: 3, aureola: false },
      { id: 'targhetta', tipo: 'targhetta', x: 150, y: 382, testo: 'LIVE',
        sfondo: '#53FC18', colore: '#000000', carattere: 'Anton', corpo: 32, punto: false, tagliata: true },
      { id: 'nome', tipo: 'testo', x: 456, y: 204, testo: '{nome}',
        carattere: 'Anton', corpo: 86, colore: '#FFFFFF', max: 16, maiuscolo: true, spaziatura: 1 },
      { id: 'titolo', tipo: 'testo', x: 456, y: 268, testo: '{titolo}',
        carattere: 'Archivo', corpo: 31, colore: '#9A9A9A', max: 40 },
      { id: 'gioco', tipo: 'testo', x: 456, y: 332, testo: '{gioco}',
        carattere: 'Archivo Black', corpo: 23, colore: '#53FC18', max: 30, maiuscolo: true, spaziatura: 3 },
      { id: 'filo', tipo: 'riga', x: 456, y: 366, larghezza: 600, altezza: 2, colore: '#1E2A1A' },
      { id: 'indirizzo', tipo: 'testo', x: 456, y: 410, testo: 'kick.com/{login}',
        carattere: 'Archivo', corpo: 26, colore: '#6B6B6B', max: 40 },
    ],
  },
};

export const NOMI_TEMI = Object.keys(TEMI);

// Il tema giusto per una piattaforma, quando lo streamer non ha scelto.
export function temaPerPiattaforma(p) {
  return TEMI[p] ? p : 'twitch';
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
    max: numero(e?.max, 4, 200, 40),
    spaziatura: numero(e?.spaziatura, -10, 40, 0),
    maiuscolo: e?.maiuscolo === true };
}

// Quanti elementi può avere una carta. Non è un numero contro gli abusi: è che
// oltre, l'immagine diventa illeggibile e la si disegna per niente.
export const MAX_ELEMENTI = 24;

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

function testoSvg(e, dati) {
  let t = riempi(e.testo, dati);
  if (e.maiuscolo) t = t.toUpperCase();
  t = taglia(t, Math.max(4, Number(e.max) || 40));
  if (!t) return '';
  const sp = Number(e.spaziatura) || 0;
  return `<text x="${Number(e.x) || 0}" y="${Number(e.y) || 0}" font-family="${esc(e.carattere || 'Archivo')}"`
    + ` font-size="${Math.max(8, Number(e.corpo) || 28)}" fill="${esc(e.colore || '#FFFFFF')}"`
    + (sp ? ` letter-spacing="${sp}"` : '') + `>${esc(t)}</text>`;
}

function targhettaSvg(e, dati) {
  const t = taglia(riempi(e.testo, dati) || 'LIVE', 18).toUpperCase();
  const corpo = Math.max(10, Number(e.corpo) || 26);
  const x = Number(e.x) || 0, y = Number(e.y) || 0;
  const alt = Math.round(corpo * 1.75);
  // La larghezza si stima dal corpo: senza motore di caratteri non si misura, e
  // una stima larga è meglio di una targhetta che taglia la sua stessa parola.
  const largo = Math.round(corpo * 0.72 * t.length) + (e.punto ? Math.round(corpo * 1.5) : 0) + Math.round(corpo * 1.5);
  const sfondo = esc(e.sfondo || '#9146FF'), colore = esc(e.colore || '#FFFFFF');
  const forma = e.tagliata
    ? `<path d="M${x} ${y} H${x + largo} L${x + largo - Math.round(alt * 0.45)} ${y + alt} H${x} Z" fill="${sfondo}"/>`
    : `<rect x="${x}" y="${y}" width="${largo}" height="${alt}" fill="${sfondo}"/>`;
  const dx = e.punto ? Math.round(corpo * 1.55) : Math.round(corpo * 0.7);
  return forma
    + (e.punto ? `<circle cx="${x + Math.round(corpo * 0.78)}" cy="${y + alt / 2}" r="${Math.round(corpo * 0.3)}" fill="${colore}"/>` : '')
    + `<text x="${x + dx}" y="${y + Math.round(alt * 0.72)}" font-family="${esc(e.carattere || 'Archivo Black')}"`
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
export function svgCarta(carta, dati = {}) {
  const W = Math.max(200, Number(carta?.larghezza) || MISURA.larghezza);
  const H = Math.max(120, Number(carta?.altezza) || MISURA.altezza);
  const pezzi = [];
  let n = 0;
  for (const e of (carta?.elementi || [])) {
    if (!e || e.spento) continue;
    n += 1;
    if (e.tipo === 'avatar') pezzi.push(avatarSvg(e, dati, n));
    else if (e.tipo === 'testo') pezzi.push(testoSvg(e, dati));
    else if (e.tipo === 'targhetta') pezzi.push(targhettaSvg(e, dati));
    else if (e.tipo === 'riga') pezzi.push(rigaSvg(e));
    else if (e.tipo === 'striscia') pezzi.push(strisciaSvg(e, W, H));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`
    + ` width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + fondoSvg(carta?.fondo, W, H) + pezzi.join('') + '</svg>';
}
