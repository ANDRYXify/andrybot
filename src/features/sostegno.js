// SOSTENERE IL PROGETTO, che non e' donare a uno streamer.
//
// Sembrano la stessa cosa e non lo sono. Una donazione a uno streamer va sul
// conto SUO, si annuncia in diretta, riempie un obiettivo in overlay, puo'
// portarsi dietro un'immagine da approvare, e lui la rimborsa dal pannello. Un
// sostegno al progetto va sul conto di casa e basta: non va in onda da nessuna
// parte, quindi non c'e' niente da annunciare, niente da approvare, e i
// rimborsi si fanno dove stanno i soldi — nel Dashboard di Stripe.
//
// Percio' questo modulo e' piccolo, e ha una tabella sua. Piegare quella delle
// donazioni a fare anche questo avrebbe voluto dire un `login` finto che gira
// dentro codice scritto per uno streamer vero: sei posti da ricordarsi di
// escludere, e il settimo che un giorno fa comparire il sostegno di uno
// sconosciuto nel pannello di qualcuno.
//
// Quello che invece si riusa e' il FILO (`stripe-filo.js`): la chiamata a
// Stripe e' una sola, e prende la chiave da fuori. Qui la chiave e' quella
// della piattaforma, la' quella dello streamer. E' l'unica differenza, ed e'
// giusto che sia scritta in un argomento e non in due file.
//
// LA VERITA' SU UN PAGAMENTO LA DA' STRIPE. La sessione si rilegge, e il
// passaggio attesa → pagato avviene una volta sola (lo garantisce la riga, non
// noi): chi torna sulla pagina e la ronda possono arrivare insieme senza
// contare due volte.
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { sostegni } from '../db.js';
import { chiama } from './stripe-filo.js';
import { urlSostieni } from './donazioni.js';

const log = makeLog('sostegno');

export const SCADENZA_MS = 60 * 60 * 1000;      // una sessione di pagamento vive un'ora
const TOLLERANZA_MS = 15 * 60 * 1000;           // poi si aspetta ancora un po' prima di darla per persa
const RONDA_MS = 5 * 60 * 1000;

// Gli importi che proponiamo, in centesimi. Sono suggerimenti: si puo' scrivere
// qualunque cifra fra il minimo e il massimo.
export const IMPORTI = Object.freeze([300, 500, 1000, 2500]);
export const MIN = 100;         // sotto un euro le commissioni si mangiano tutto
export const MAX = 50000;       // oltre i cinquecento euro, meglio scriversi

// C'e' un conto su cui incassare? La chiave della piattaforma e' la stessa
// degli abbonamenti: se non c'e', la pagina si vede e il tasto non parte — e lo
// dice, invece di aprire un pagamento che non puo' riuscire.
export const attivo = () => !!String(config.stripe?.secretKey || '').trim();

// Un importo che arriva da un browser non e' un numero: e' testo. Qui diventa
// centesimi, o zero. Zero vuol dire «non se ne fa niente», e chi chiama non
// deve indovinare quale parte era sbagliata.
export function centesimiDa(v) {
  const n = Number(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return 0;
  const cent = Math.round(n * 100);
  return cent >= MIN && cent <= MAX ? cent : 0;
}

export const euro = (cent) => (Math.round(Number(cent) || 0) / 100).toFixed(2).replace('.', ',');

// I parametri della sessione. Il prodotto NON e' un id da configurare: si
// descrive qui (`product_data`). Un id in piu' nel .env sarebbe una cosa in
// piu' da creare a mano su Stripe, e una cosa in piu' che un giorno non
// coincide con quello che c'e' scritto.
function params({ cent, nome, messaggio, ritorno }) {
  return {
    mode: 'payment',
    submit_type: 'donate',
    locale: 'auto',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': cent,
    'line_items[0][price_data][product_data][name]': 'Sostegno a SocialBot',
    'line_items[0][quantity]': 1,
    'payment_intent_data[description]': 'Sostegno a SocialBot' + (nome ? ' da ' + nome : ''),
    'metadata[nome]': nome,
    'metadata[messaggio]': messaggio,
    success_url: `${ritorno}?ok={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ritorno}?ok=annullato`,
    expires_at: Math.floor((Date.now() + SCADENZA_MS) / 1000),
  };
}

// Apre il pagamento. Torna { url } oppure { errore } con una frase da leggere.
export async function apri({ importo, nome = '', messaggio = '' } = {}) {
  if (!attivo()) return { errore: 'In questo momento non si può sostenere il progetto da qui.' };
  const cent = centesimiDa(importo);
  if (!cent) return { errore: `L'importo va da ${euro(MIN)} a ${euro(MAX)} euro.` };
  const chi = String(nome || '').trim().slice(0, 60);
  const msg = String(messaggio || '').trim().slice(0, 300);
  // Si torna all'indirizzo vero della pagina, lo stesso della sitemap: sul
  // sottodominio quando risponde, qui quando e' spento. Passare dal rimando
  // costerebbe un giro in piu' a chi ha appena pagato.
  const ritorno = urlSostieni();
  const r = await chiama(config.stripe.secretKey, 'POST', '/checkout/sessions', params({ cent, nome: chi, messaggio: msg, ritorno }));
  if (!r.ok || !r.dati?.url) {
    log.warn('apertura non riuscita:', r.errore);
    return { errore: 'Il pagamento non si apre in questo momento: riprova fra poco.' };
  }
  sostegni.apri('stripe:' + r.dati.id, { importo: cent, nome: chi, messaggio: msg });
  return { url: r.dati.url };
}

// Rilegge una sessione e, se e' pagata, la segna. Torna { nuovo, importo } —
// `nuovo` e' vero per la prima e sola richiesta che l'ha vista pagare — oppure
// null se non risulta pagata (o se quella sessione non l'abbiamo aperta noi).
export async function conferma(sessione) {
  const id = 'stripe:' + String(sessione || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 80);
  const r = sostegni.get(id);
  if (!r) return null;
  if (r.stato === 'pagato') return { nuovo: false, importo: r.importo, nome: r.nome };
  if (r.stato !== 'attesa') return null;
  if (!attivo()) return null;
  const s = await chiama(config.stripe.secretKey, 'GET', '/checkout/sessions/' + id.slice(7));
  if (!s.ok) return null;
  if (s.dati?.payment_status === 'paid') {
    const importo = Number.isFinite(s.dati.amount_total) ? s.dati.amount_total : r.importo;
    const rif = typeof s.dati.payment_intent === 'string' ? s.dati.payment_intent : (s.dati.payment_intent?.id || '');
    const nuovo = sostegni.paga(id, importo, rif);
    if (nuovo) log.info(`sostegno: ${euro(importo)} €${r.nome ? ' da ' + r.nome : ''}`);
    return { nuovo, importo, nome: r.nome };
  }
  if (s.dati?.status === 'expired') sostegni.scadi(id);
  return null;
}

// CHI PAGA E CHIUDE LA SCHEDA non deve sparire. Il ritorno sulla pagina e' la
// strada normale, ma non e' garantita: la ronda ripassa sulle sessioni ancora
// in attesa e chiede a Stripe com'e' andata. Passata l'ora piu' la tolleranza,
// una sessione che Stripe non dice pagata e' persa, e si chiude.
export async function ronda(ora = Date.now()) {
  if (!attivo()) return 0;
  let contate = 0;
  for (const r of sostegni.inAttesa(ora - 60_000)) {
    const e = await conferma(String(r.id).slice(7));
    if (e?.nuovo) contate++;
    else if (!e && ora - Number(r.created_at) > SCADENZA_MS + TOLLERANZA_MS) sostegni.scadi(r.id);
  }
  return contate;
}

export function avviaRonda() {
  if (!attivo()) return null;
  const t = setInterval(() => { ronda().catch(() => {}); }, RONDA_MS);
  t.unref?.();
  return t;
}

// Quanto e' arrivato, per chi tiene il conto. Non e' una cosa pubblica: la
// pagina non promette un contatore a nessuno, e prometterlo vorrebbe dire
// mostrare quanto NON e' arrivato nelle settimane storte.
export const riepilogo = () => sostegni.quanto();
