// LA CARTA DELLA DIRETTA: l'immagine che annuncia «sono live».
//
// Va su Telegram come FOTO, non come anteprima del link: l'anteprima la disegna
// la piattaforma ed è uguale per tutti, questa è dello streamer — il suo nome,
// la sua faccia, i suoi colori.
//
// Qui c'è quello che tocca il MONDO: i caratteri sul disco, il rasterizzatore,
// l'avatar preso dalla rete, la levetta nel database. Il modello e il disegno
// stanno in `carta-disegno.js`, perché quelli li legge anche il browser.
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
import { carteLive, streamers } from '../db.js';
import { piattaformaDi, nomeSu } from '../identita.js';
import { CARATTERI, MISURA, cartaDi, svgCarta } from './carta-disegno.js';
import { spoglia } from '../spoglia.js';

// Quello che serve anche a chi importa da qui: una porta sola.
export * from './carta-disegno.js';

const log = makeLog('carta');
const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const FONT_DIR = join(RAD, 'assets/font');
export const CARTELLA_CARATTERI = FONT_DIR;

// ── quello che riceve il browser ───────────────────────────────────────────
//
// L'editor disegna l'anteprima con la STESSA funzione che disegna l'immagine
// che parte. Perché possa, il browser deve ricevere `carta-disegno.js` — quel
// file, non una copia da riallineare a mano.
//
// Esce senza commenti: quel file ne ha, e le spiegazioni non devono arrivare a
// chi apre F12. Lo spoglio sta QUI e non nella rotta perché non deve esserci un
// posto in cui qualcuno possa dimenticarselo: chi serve il modulo e chi lo
// verifica chiamano questa funzione, e non c'è una seconda strada.
let _servito = null;
export function disegnoPerIlBrowser() {
  if (_servito === null) {
    try { _servito = spoglia(readFileSync(join(RAD, 'src/features/carta-disegno.js'), 'utf8'), 'js'); } catch { _servito = ''; }
  }
  return _servito;
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

// ── la carta di QUESTA diretta ─────────────────────────────────────────────
//
// Mettere insieme i pezzi (la carta scelta, i dati della diretta, la faccia) sta
// in un posto solo: la usano l'annuncio vero e l'anteprima nell'editor, e due
// copie vorrebbero dire un'anteprima che mostra una cosa diversa da quella che
// parte — il difetto peggiore per un editor.
export async function datiDiretta(login, info = {}, { conAvatar = true } = {}) {
  const l = String(login || '').toLowerCase();
  const s = streamers.get(l) || {};
  const piattaforma = piattaformaDi(l);
  const nome = nomeSu(l);
  const indirizzo = piattaforma === 'kick' ? `https://kick.com/${nome}`
    : piattaforma === 'youtube' ? `https://youtube.com/@${nome}`
      : `https://twitch.tv/${nome}`;
  return {
    nome: s.display || nome,
    titolo: String(info.title || info.titolo || ''),
    gioco: String(info.game_name || info.gioco || ''),
    login: nome,
    link: indirizzo,
    spettatori: String(info.viewer_count ?? info.spettatori ?? 0),
    piattaforma,
    avatar: conAvatar && s.avatar ? await avatarDataUri(s.avatar) : '',
  };
}

// Il PNG da mandare, o null se non si deve (spenta, o mancano i caratteri).
//
// Due canali, e non è un cavillo: `login` è chi possiede il gruppo — sua la
// levetta e suo il disegno — mentre `chi` è chi sta andando in diretta, e da lui
// vengono nome, faccia e titolo. Quando un canale annuncia le dirette degli
// amici, la grafica resta la sua e cambia il contenuto: è quello che uno si
// aspetta guardando il gruppo.
//
// `forza` serve all'anteprima: lì la si vuole vedere anche da spenta.
export async function pngPerDiretta(login, info = {}, { forza = false, chi = null } = {}) {
  const c = carteLive.get(login);
  if (!forza && !c?.attiva) return null;
  if (!disegnabile()) {
    log.warn('carta non disegnata: mancano i caratteri in assets/font');
    return null;
  }
  const diChi = String(chi || login).toLowerCase();
  const carta = cartaDi({ dati: c?.dati, piattaforma: piattaformaDi(diChi) });
  try {
    return await pngCarta(carta, await datiDiretta(diChi, info));
  } catch (e) {
    log.warn(`carta di #${diChi}: ${e?.message || e}`);
    return null;
  }
}
