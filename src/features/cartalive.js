// LA CARTA DELLA DIRETTA: l'immagine che annuncia «sono live».
//
// Va su Telegram come FOTO, non come anteprima del link: l'anteprima la disegna
// la piattaforma ed è uguale per tutti, questa è dello streamer — il suo nome,
// la sua faccia, i suoi colori.
//
// ═══ PERCHÉ È FATTA DI DATI E NON DI DISEGNO ═══
//
// La tentazione era scrivere due SVG a mano, uno per Twitch e uno per Kick, e
// riempirli di buchi. Sarebbe stato più corto oggi e un vicolo cieco domani: il
// giorno che si vuole un EDITOR — spostare il nome, cambiare il corpo, mettere
// la targhetta dall'altra parte — un disegno scritto a mano non si edita, si
// riscrive.
//
// Quindi una carta è un FONDO più un ELENCO DI ELEMENTI, ognuno con la sua
// posizione, la sua misura e il suo stile. I due temi standard sono due
// preselezioni di quegli stessi dati, non due casi speciali del codice: quello
// che l'editor cambierà è esattamente ciò che il disegnatore legge.
//
// ═══ DUE INGANNI CHE COSTANO CARO, E COME SONO EVITATI ═══
//
//  1. I `.woff2` del sito NON si possono usare qui: il rasterizzatore li accetta
//     senza protestare e rende un'immagine VUOTA. Servono i TTF, e stanno in
//     assets/font.
//  2. Un `font-weight` alto su un carattere VARIABILE viene accettato e
//     ignorato: il testo esce nel peso di default e sembra solo «un po' magro».
//     Perciò i pesi sono FAMIGLIE diverse (Archivo, Archivo Black, Anton), mai
//     un numero su una famiglia sola.
//
// Tutte e due danno lo stesso sintomo — nessun errore — e si vedono solo
// guardando l'immagine. Il collaudo infatti la GUARDA: conta i pixel accesi.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeLog } from '../logger.js';

const log = makeLog('carta');
const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const FONT_DIR = join(RAD, 'assets/font');

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

// ── la rasterizzazione ─────────────────────────────────────────────────────

let _fonts = null;
function fontDisponibili() {
  if (_fonts) return _fonts;
  _fonts = CARATTERI.map(([, file]) => join(FONT_DIR, file)).filter((p) => existsSync(p));
  if (!_fonts.length) log.warn('nessun carattere in assets/font: la carta uscirebbe senza testo');
  return _fonts;
}

// Ci sono i caratteri per disegnare? Senza, l'immagine esce muta — e muta senza
// dare errore. Meglio non mandarla che mandarne una vuota.
export function disegnabile() {
  return fontDisponibili().length === CARATTERI.length;
}

// La carta RESA, pixel per pixel. Una sola strada per disegnare: il PNG che
// parte e quello che il collaudo guarda sono la stessa immagine, non due cose
// che si somigliano.
export async function resaCarta(carta, dati = {}) {
  if (!disegnabile()) return null;
  const { Resvg } = await import('@resvg/resvg-js');
  const r = new Resvg(svgCarta(carta, dati), {
    font: { loadSystemFonts: false, fontFiles: fontDisponibili(), defaultFontFamily: 'Archivo' },
    fitTo: { mode: 'width', value: Math.max(200, Number(carta?.larghezza) || MISURA.larghezza) },
  });
  return r.render();
}

export async function pngCarta(carta, dati = {}) {
  const resa = await resaCarta(carta, dati);
  return resa ? Buffer.from(resa.asPng()) : null;
}

// L'avatar come data URI, pronto da infilare nella carta. Ritorna '' se non si
// può prendere: la carta esce lo stesso, con la forma piena al posto della foto.
export async function avatarDataUri(url, { fetchImpl = fetch } = {}) {
  const u = String(url || '');
  if (!/^https:\/\//.test(u)) return '';
  try {
    const r = await fetchImpl(u, { redirect: 'follow' });
    if (!r.ok) return '';
    const tipo = String(r.headers.get('content-type') || '').split(';')[0].trim();
    if (!/^image\/(png|jpeg|webp|gif)$/.test(tipo)) return '';
    const b = Buffer.from(await r.arrayBuffer());
    if (b.length > 3_000_000) return '';
    return `data:${tipo};base64,${b.toString('base64')}`;
  } catch { return ''; }
}
