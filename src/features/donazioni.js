// LE DONAZIONI VERSO LO STREAMER.
//
// Una configurazione sola: come si dona (sul suo conto Stripe, dalla pagina
// link, oppure a un link esterno: Ko-fi, PayPal, Streamlabs…), gli importi
// suggeriti e il minimo, come si chiama il tasto, una frase, la valuta,
// l'avviso in chat. Del token con cui Ko-fi firma i suoi avvisi si conserva
// l'IMPRONTA, mai il token: chi legge il database non puo' fingersi Ko-fi.
//
// Una donazione e' un evento come un follow: arriva dal pagamento sul conto
// dello streamer (donazioni-stripe.js), dal webhook di Ko-fi o da una
// automazione dello streamer via /api/ext; fa crescere l'obiettivo in euro,
// spara l'alert e, se acceso, scrive in chat. Il tasto sulla pagina link e'
// un blocco che legge questa configurazione: si imposta una volta sola.
//
// Questo modulo e' puro: niente database, niente rete. Cio' che tocca Stripe
// e il registro sta in donazioni-stripe.js.
import { impronta } from '../segreti.js';

export const VALUTE = ['EUR', 'USD', 'GBP'];
export const MODI = ['conto', 'link'];
// una donazione va da 1 a 500 (nella valuta scelta); al massimo sei importi suggeriti
export const LIMITI = { min: 1, max: 500, importi: 6, minimoMax: 100 };
export const IMPORTI_DI_SERIE = [2, 5, 10, 20];
const SIMBOLO = { EUR: '€', USD: '$', GBP: '£' };
const L = { link: 400, etichetta: 40, messaggio: 160, testoChat: 200, nome: 40, testo: 200 };

const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const numero = (v) => Math.round((Number(String(v ?? '').trim().replace(',', '.')) || 0) * 100) / 100;
function urlOk(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  try {
    const x = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    if (x.protocol !== 'https:') return '';
    return x.href.slice(0, L.link);
  } catch { return ''; }
}

// «5,00 €», «$5», «£12.50»: in euro si scrive all'italiana, nelle altre valute
// con il simbolo davanti e il punto, com'e' d'uso.
export function formattaImporto(n, valuta = 'EUR') {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const cifra = Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (valuta === 'EUR') return cifra.replace('.', ',') + ' €';
  return (SIMBOLO[valuta] || valuta + ' ') + cifra;
}

// Gli importi suggeriti: numeri fra il minimo e il massimo, senza doppioni,
// in ordine, al massimo sei. Una lista vuota o storta torna quella di serie.
export function importiOk(lista) {
  const arr = Array.isArray(lista) ? lista : String(lista ?? '').split(/[,;\s]+/);
  const out = [];
  for (const x of arr) {
    const n = numero(x);
    if (n >= LIMITI.min && n <= LIMITI.max && !out.includes(n)) out.push(n);
    if (out.length >= LIMITI.importi) break;
  }
  return out.length ? out.sort((a, b) => a - b) : [...IMPORTI_DI_SERIE];
}
const minimoOk = (v) => Math.min(LIMITI.minimoMax, Math.max(LIMITI.min, numero(v) || LIMITI.min));

// La configurazione, ripulita. `prima` e' quella salvata: il token arriva in
// chiaro una volta sola e diventa impronta; senza un token nuovo resta quella
// di prima; `kofiTokenClear` la toglie.
export function normDonazioni(d, prima = {}, login = '') {
  d = (d && typeof d === 'object') ? d : {};
  const p = (prima && typeof prima === 'object') ? prima : {};
  const nuovo = str(d.kofiToken, 200);
  return {
    attivo: d.attivo === true,
    modo: d.modo === 'link' ? 'link' : 'conto',
    link: urlOk(d.link),
    importi: importiOk(d.importi),
    minimo: minimoOk(d.minimo),
    conMessaggio: d.conMessaggio !== false,
    etichetta: str(d.etichetta, L.etichetta),
    messaggio: str(d.messaggio, L.messaggio),
    valuta: VALUTE.includes(d.valuta) ? d.valuta : 'EUR',
    annunciaChat: d.annunciaChat === true,
    testoChat: str(d.testoChat, L.testoChat),
    kofiImp: d.kofiTokenClear === true ? '' : (nuovo ? impronta(nuovo, login) : String(p.kofiImp || '')),
  };
}

// Il modulo della pagina link, compilato da chi dona: un importo scelto fra
// quelli suggeriti o scritto a mano, un nome (facoltativo), un messaggio (se
// lo streamer lo permette). Il campo `sito` non lo vede nessuna persona: se e'
// pieno, l'ha compilato un programma. Torna null se non e' una donazione valida.
export function leggiModulo(body, cfg = {}) {
  const b = body && typeof body === 'object' ? body : {};
  if (str(b.sito, 10)) return null;
  const libero = numero(b.altro);
  const scelta = String(b.importo ?? '').trim();
  const importo = libero > 0 ? libero : numero(scelta === 'altro' ? 0 : scelta);
  const minimo = minimoOk(cfg.minimo);
  if (!(importo >= minimo && importo <= LIMITI.max)) return null;
  return {
    importoCent: Math.round(importo * 100),
    nome: str(b.nome, L.nome),
    messaggio: cfg.conMessaggio === false ? '' : str(b.messaggio, L.testo).replace(/\s+/g, ' '),
  };
}

// Il corpo che manda Ko-fi: un modulo con il campo `data`, dentro un JSON.
// Torna la donazione letta, o null se non e' una donazione leggibile.
export function leggiKofi(body) {
  const grezzo = body && body.data;
  if (!grezzo) return null;
  let j;
  try { j = typeof grezzo === 'string' ? JSON.parse(grezzo) : grezzo; } catch { return null; }
  if (!j || typeof j !== 'object') return null;
  const importo = Math.round(Number(j.amount) * 100) / 100;
  if (!Number.isFinite(importo) || importo <= 0) return null;
  return {
    token: String(j.verification_token || ''),
    id: String(j.message_id || j.kofi_transaction_id || '').slice(0, 80),
    tipo: String(j.type || 'Donation'),
    user: str(j.from_name, 60) || 'qualcuno',
    importo,
    valuta: String(j.currency || 'EUR').toUpperCase().slice(0, 3),
    messaggio: j.is_public === false ? '' : str(j.message, 200),
  };
}

// Cosa manca perche' il tasto compaia: niente ('' = tutto a posto), oppure
// 'spente', 'link' (modo link senza indirizzo), 'conto' (modo conto senza un
// conto pronto a incassare).
export function cosaManca(settings, conto = null) {
  const d = settings && settings.donazioni;
  if (!d || d.attivo !== true) return 'spente';
  if (d.modo === 'link') return d.link ? '' : 'link';
  return conto && conto.pronto ? '' : 'conto';
}

// Quello che serve al blocco «Sostieni» della pagina link: come si dona, gli
// importi, il tasto, la frase e, se c'e' un obiettivo in euro acceso, dove sta.
export function datiSostieni(settings, conto = null) {
  if (cosaManca(settings, conto)) return null;
  const s = settings;
  const d = s.donazioni;
  const goals = Array.isArray(s.overlayGoals) ? s.overlayGoals : [];
  const g = goals.find((x) => x && x.attivo !== false && x.tipo === 'euro');
  const conti = (s.overlayStato && s.overlayStato.goals) || {};
  const ora = g ? Math.round(((Number(g.partenza) || 0) + (Number(conti[g.id]) || 0)) * 100) / 100 : 0;
  const modo = d.modo === 'link' ? 'link' : 'conto';
  return {
    modo,
    link: modo === 'link' ? d.link : '',
    importi: importiOk(d.importi),
    minimo: minimoOk(d.minimo),
    conMessaggio: d.conMessaggio !== false,
    etichetta: d.etichetta || 'Sostieni',
    messaggio: d.messaggio || '',
    valuta: VALUTE.includes(d.valuta) ? d.valuta : 'EUR',
    goal: g ? { ora, meta: Math.max(1, Number(g.obiettivo) || 100), titolo: g.titolo || '' } : null,
  };
}

// Una mancia mandata con la chiave API del canale: un'automazione dello
// streamer (Streamlabs, StreamElements, PayPal…) che ci passa importo e nome.
export function leggiEsterna(body) {
  const b = body && typeof body === 'object' ? body : {};
  const importo = Math.round(Number(b.importo ?? b.amount) * 100) / 100;
  if (!Number.isFinite(importo) || importo <= 0) return null;
  const val = String(b.valuta || b.currency || '').toUpperCase();
  return {
    id: str(b.id, 80),
    user: str(b.user || b.nome || b.from_name, 60) || 'qualcuno',
    importo,
    valuta: VALUTE.includes(val) ? val : '',
    messaggio: str(b.messaggio || b.message, 200),
  };
}
