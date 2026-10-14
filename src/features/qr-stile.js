// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO STILE DEL QR DI UN CANALE (docs/STRUMENTI.md). La scheda «QR su misura»
// lo salva nelle impostazioni del canale, e le Grafiche social lo riusano per
// il QR che mettono nelle immagini. Qui si tiene solo la forma: quello che non
// e' una scelta conosciuta torna quello di serie. Se il QR poi si legge lo
// decide il disegno (src/web/public/qr.js), non questo file.
import crypto from 'node:crypto';

export const MODULI = ['quadrati', 'morbidi', 'puntini', 'penna'];
export const OCCHI = ['quadrati', 'morbidi', 'tondi', 'penna'];
export const LOGHI = ['no', 'foto', 'immagine'];
export const LOGO_MAX = 200_000;

export const DI_SERIE = Object.freeze({
  moduli: 'quadrati', occhi: 'quadrati', scuro: '#150910', chiaro: '#ffffff', occhio: '',
  cornice: '', logo: 'no', logoImg: '', logoLato: 100, testo: '',
});

const colore = (v, base) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : base);
const tra = (v, voci, base) => (voci.includes(v) ? v : base);
const immagine = (v) => (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(v || '')) && String(v).length <= LOGO_MAX ? String(v) : '');

export function normStileQr(x) {
  const s = x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  const logoImg = immagine(s.logoImg);
  let logo = tra(s.logo, LOGHI, 'no');
  if (logo === 'immagine' && !logoImg) logo = 'no';
  return {
    moduli: tra(s.moduli, MODULI, DI_SERIE.moduli),
    occhi: tra(s.occhi, OCCHI, DI_SERIE.occhi),
    scuro: colore(s.scuro, DI_SERIE.scuro),
    chiaro: colore(s.chiaro, DI_SERIE.chiaro),
    occhio: colore(s.occhio, ''),
    cornice: String(s.cornice ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
    logo,
    logoImg: logo === 'immagine' ? logoImg : '',
    logoLato: Math.max(20, Math.min(100, Math.round(Number(s.logoLato)) || 100)),
    testo: String(s.testo ?? '').trim().slice(0, 600),
  };
}

// LA FIRMA DEL QR NELLE GRAFICHE. Le immagini che il pannello prepara e che
// il server tiene (le storie prima della diretta, la settimana, la storia
// «Live ora») portano la firma dello stile con cui e' nato il loro QR. Se
// adesso la firma e' un'altra, l'immagine e' «da rifare»: esce lo stesso,
// perche' il suo QR si legge e porta allo stesso posto, ma il pannello del
// proprietario la riprepara appena puo'. La si calcola sempre dallo stile di
// adesso, mai la si tiene da parte: cosi' non c'e' un «segna da rifare» da
// ricordarsi a ogni salvataggio, e nessuna strada che se lo dimentica.
//
// Dentro c'e' solo quello che cambia il QR disegnato in una grafica:
//  · niente testo e niente cornice: le Grafiche ci mettono sempre l'indirizzo
//    del canale, senza cornice;
//  · il lato del logo solo se il logo c'e'; l'immagine caricata solo se il
//    logo e' quella; con «la tua foto», l'indirizzo della foto (`avatar`):
//    una foto nuova cambia il QR anche se lo stile e' lo stesso;
//  · il colore degli occhi uguale a quello dei quadratini vale come nessun
//    colore: qr.js li disegna uguali (occhio || scuro), e il pannello li salva
//    gia' cosi';
//  · DISEGNO_QR, la versione del disegno.
// Due stili che si disegnano uguali hanno la stessa firma, in qualunque ordine
// arrivino le chiavi; uno che si disegna diverso ne ha un'altra.
//
// DISEGNO_QR si alza quando il disegno del QR nelle grafiche cambia in un modo
// che deve far rifare le immagini gia' salvate (non per un ritocco che il
// telefono non vede). `disegno` si cambia solo nelle prove.
export const DISEGNO_QR = 1;
export const FIRMA_RE = /^[0-9a-f]{16}$/;

export function firmaStileQr(stile, { avatar = '', disegno = DISEGNO_QR } = {}) {
  const s = normStileQr(stile);
  const dati = JSON.stringify([
    disegno, s.moduli, s.occhi, s.scuro, s.chiaro, s.occhio === s.scuro ? '' : s.occhio, s.logo,
    s.logo === 'no' ? 0 : s.logoLato,
    s.logo === 'immagine' ? s.logoImg : '',
    s.logo === 'foto' ? String(avatar || '') : '',
  ]);
  return crypto.createHash('sha256').update(dati).digest('hex').slice(0, 16);
}

// La firma che il pannello rimanda con un'immagine, contro quella di adesso.
//  · Assente: un pannello di prima, che non la conosce. L'immagine si tiene,
//    con la firma vuota, quindi «da rifare»: meglio una storia col QR di
//    prima che nessuna storia.
//  · Uguale: buona, e si tiene con lei.
//  · Diversa, o storta: il pannello ha disegnato con uno stile che non c'e'
//    piu'. Non si tiene: nascerebbe gia' da rifare, e il pannello la rifarebbe
//    con lo stesso stile vecchio. Il server dice qual e' quella di adesso, e il
//    pannello rilegge e ridisegna.
export function firmaMandata(v, attuale) {
  if (v === undefined || v === null || v === '') return { ok: true, firma: '' };
  return FIRMA_RE.test(String(attuale)) && String(v) === String(attuale) ? { ok: true, firma: String(attuale) } : { ok: false };
}
