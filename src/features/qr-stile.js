// LO STILE DEL QR DI UN CANALE (docs/STRUMENTI.md). La scheda «QR su misura»
// lo salva nelle impostazioni del canale, e le Grafiche social lo riusano per
// il QR che mettono nelle immagini. Qui si tiene solo la forma: quello che non
// e' una scelta conosciuta torna quello di serie. Se il QR poi si legge lo
// decide il disegno (src/web/public/qr.js), non questo file.

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
