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
import { config } from '../config.js';

export const VALUTE = ['EUR', 'USD', 'GBP'];
export const MODI = ['conto', 'link'];
// una donazione parte da 1 (nella valuta scelta); il massimo lo sceglie lo
// streamer, 500 di serie e mai oltre 5.000; al massimo sei importi suggeriti
export const LIMITI = { min: 1, max: 5000, massimoDiSerie: 500, importi: 6, minimoMax: 100 };
export const IMPORTI_DI_SERIE = [2, 5, 10, 20];
// le offerte: al massimo otto scaglioni, ognuno con un importo da cui vale,
// un nome e l'effetto che accende (un riferimento alla libreria, come per gli alert)
export const MAX_LIVELLI = 8;
const EFFETTO_OK = /^effetto:[a-z0-9_-]{1,32}$/;
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

// Gli importi suggeriti: numeri fra il minimo e il massimo dello streamer,
// senza doppioni, in ordine, al massimo sei. Una lista vuota o storta torna
// quella di serie (per la parte che sta nei limiti; sennò il minimo).
export function importiOk(lista, minimo = LIMITI.min, massimo = LIMITI.max) {
  const arr = Array.isArray(lista) ? lista : String(lista ?? '').split(/[,;\s]+/);
  const dentro = (n) => n >= minimo && n <= massimo;
  const out = [];
  for (const x of arr) {
    const n = numero(x);
    if (dentro(n) && !out.includes(n)) out.push(n);
    if (out.length >= LIMITI.importi) break;
  }
  if (out.length) return out.sort((a, b) => a - b);
  const serie = IMPORTI_DI_SERIE.filter(dentro);
  return serie.length ? serie : [minimo];
}
const minimoOk = (v) => Math.min(LIMITI.minimoMax, Math.max(LIMITI.min, numero(v) || LIMITI.min));

// Le offerte ripulite: importo fra 1 e 5.000, nome corto, effetto valido o
// nessuno; in ordine di importo, senza due allo stesso importo, al massimo otto.
export function livelliOk(lista) {
  if (!Array.isArray(lista)) return [];
  const out = [];
  for (const x of lista) {
    if (!x || typeof x !== 'object') continue;
    const da = numero(x.da);
    if (!(da >= LIMITI.min && da <= LIMITI.max) || out.some((l) => l.da === da)) continue;
    const eff = String(x.effetto || '').trim().toLowerCase();
    out.push({ da, nome: str(x.nome, 30), effetto: EFFETTO_OK.test(eff) ? eff : '' });
    if (out.length >= MAX_LIVELLI) break;
  }
  return out.sort((a, b) => a.da - b.da);
}
// L'offerta che vale per un importo: la piu' alta fra quelle raggiunte.
// Si ricava dall'importo PAGATO, mai da cio' che manda il browser.
export function livelloPer(livelli, importo) {
  const n = Number(importo) || 0;
  let scelto = null;
  for (const l of livelliOk(livelli)) if (l.da <= n) scelto = l;
  return scelto;
}
const massimoOk = (v, minimo = LIMITI.min) => Math.min(LIMITI.max, Math.max(minimo, numero(v) || LIMITI.massimoDiSerie));

// L'immagine di chi dona: da un importo in su (1..5.000) chi dona puo' allegare
// un'immagine o una GIF che va in onda come un effetto. Quanto dura a schermo
// (le immagini; una GIF diventa un video muto e dura quanto e' lunga), e se
// parte da sola o aspetta l'ok dello streamer: di serie aspetta.
export const PROPRIO = { da: 20, durata: 6, durataMin: 2, durataMax: 15 };
export function proprioOk(p) {
  p = (p && typeof p === 'object') ? p : {};
  const da = numero(p.da);
  const durata = numero(p.durata);
  return {
    attivo: p.attivo === true,
    da: da >= LIMITI.min && da <= LIMITI.max ? da : PROPRIO.da,
    durata: durata >= PROPRIO.durataMin && durata <= PROPRIO.durataMax ? durata : PROPRIO.durata,
    subito: p.subito === true,
  };
}
// Se con questo importo (in valuta, PAGATO) l'immagine di chi dona e' ammessa.
export function mediaAmmesso(cfg, importo) {
  const p = proprioOk(cfg && cfg.proprio);
  return p.attivo && (Number(importo) || 0) >= p.da;
}

// La configurazione, ripulita. `prima` e' quella salvata: il token arriva in
// chiaro una volta sola e diventa impronta; senza un token nuovo resta quella
// di prima; `kofiTokenClear` la toglie.
export function normDonazioni(d, prima = {}, login = '') {
  d = (d && typeof d === 'object') ? d : {};
  const p = (prima && typeof prima === 'object') ? prima : {};
  const nuovo = str(d.kofiToken, 200);
  const minimo = minimoOk(d.minimo);
  const massimo = massimoOk(d.massimo, minimo);
  return {
    attivo: d.attivo === true,
    modo: d.modo === 'link' ? 'link' : 'conto',
    link: urlOk(d.link),
    importi: importiOk(d.importi, minimo, massimo),
    minimo,
    massimo,
    livelli: livelliOk(d.livelli),
    proprio: proprioOk(d.proprio),
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
  const massimo = massimoOk(cfg.massimo, minimo);
  if (!(importo >= minimo && importo <= massimo)) return null;
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

// I mezzi con cui si puo' pagare sul conto dello streamer: Stripe se il suo
// conto e' pronto; Satispay se e' pronto e la valuta e' l'euro (Satispay non ne
// conosce altre). `conti` = { stripe, satispay } come li da' il database.
export function mezziDi(d, conti = null) {
  const c = conti && typeof conti === 'object' ? conti : {};
  const valuta = VALUTE.includes(d?.valuta) ? d.valuta : 'EUR';
  const out = [];
  if (c.stripe && c.stripe.pronto) out.push('stripe');
  if (c.satispay && c.satispay.pronto && valuta === 'EUR') out.push('satispay');
  return out;
}

// L'indirizzo della pagina delle donazioni: corto se c'e' il sottodominio,
// altrimenti sotto la pagina link.
// L'indirizzo corto delle donazioni, se DONA_HOST non lo dice, si prova da
// solo: dona.<dominio del sito>. Niente per localhost, indirizzi IP e nomi
// senza dominio: li' un sottodominio non esiste.
export function candidatoDonaHost(baseUrl) {
  let host = '';
  try { host = new URL(String(baseUrl || '')).hostname.toLowerCase(); } catch { return ''; }
  if (!host || host === 'localhost' || /^[\d.]+$/.test(host) || host.startsWith('[') || !host.includes('.')) return '';
  return 'dona.' + host.replace(/^www\./, '');
}
export function urlPaginaDona(login) {
  const l = String(login || '').toLowerCase();
  return config.donaHost ? `https://${config.donaHost}/${l}` : `${config.baseUrl}/u/${l}/dona`;
}

// Cosa manca perche' il tasto compaia: niente ('' = tutto a posto), oppure
// 'spente', 'link' (modo link senza indirizzo), 'conto' (modo conto senza un
// conto pronto a incassare).
export function cosaManca(settings, conti = null) {
  const d = settings && settings.donazioni;
  if (!d || d.attivo !== true) return 'spente';
  if (d.modo === 'link') return d.link ? '' : 'link';
  return mezziDi(d, conti).length ? '' : 'conto';
}

// Quello che serve al blocco «Sostieni» della pagina link: come si dona, gli
// importi, il tasto, la frase e, se c'e' un obiettivo in euro acceso, dove sta.
export function datiSostieni(settings, conti = null) {
  if (cosaManca(settings, conti)) return null;
  const s = settings;
  const d = s.donazioni;
  const goals = Array.isArray(s.overlayGoals) ? s.overlayGoals : [];
  const g = goals.find((x) => x && x.attivo !== false && x.tipo === 'euro');
  const contiGoal = (s.overlayStato && s.overlayStato.goals) || {};
  const ora = g ? Math.round(((Number(g.partenza) || 0) + (Number(contiGoal[g.id]) || 0)) * 100) / 100 : 0;
  const modo = d.modo === 'link' ? 'link' : 'conto';
  const minimo = minimoOk(d.minimo);
  const massimo = massimoOk(d.massimo, minimo);
  const pr = proprioOk(d.proprio);
  return {
    modo,
    mezzi: modo === 'conto' ? mezziDi(d, conti) : [],
    link: modo === 'link' ? d.link : '',
    importi: importiOk(d.importi, minimo, massimo),
    minimo,
    massimo,
    livelli: livelliOk(d.livelli).filter((l) => l.da >= minimo && l.da <= massimo),
    conMessaggio: d.conMessaggio !== false,
    proprio: modo === 'conto' && pr.attivo && pr.da <= massimo ? { da: Math.max(pr.da, minimo), durata: pr.durata } : null,
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
