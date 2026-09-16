// IL CONTO STRIPE DELLO STREAMER, e i pagamenti che ci arrivano sopra.
//
// Il conto e' SUO: lo apre da solo, lo gestisce da solo, ne vede incassi,
// ricevute e contestazioni nel suo Dashboard. Nessun Connect, nessun legame
// con l'account della piattaforma. A noi affida una chiave con restrizioni
// (sessioni di pagamento e prodotti: niente rimborsi, niente bonifici, niente
// dati bancari), che sta nella busta del database e che lui revoca quando
// vuole. Con quella chiave si apre il pagamento sul suo conto e si rilegge
// se e' andato a buon fine. SocialBot non tocca i soldi e non trattiene niente.
//
// La verita' su un pagamento la da' Stripe: la sessione si rilegge con la sua
// chiave, e si conta una volta sola grazie al registro (attesa → pagata, un
// passaggio solo). Niente webhook da configurare: la conferma arriva al
// ritorno del donatore sulla pagina, e una ronda ogni due minuti rilegge le
// sessioni ancora aperte, per chi chiude la scheda prima.
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { contiDonazioni, registroDonazioni } from '../db.js';
import { urlPaginaDona } from './donazioni.js';

const log = makeLog('donazioni');
const API = 'https://api.stripe.com/v1';
export const SCADENZA_MS = 60 * 60 * 1000;          // una sessione di pagamento vive un'ora
const TOLLERANZA_MS = 15 * 60 * 1000;               // poi si aspetta ancora un quarto d'ora prima di darla per scaduta
const RONDA_MS = 2 * 60 * 1000;

// Solo una chiave CON RESTRIZIONI (rk_…): la chiave segreta del conto (sk_…)
// puo' fare tutto, e non deve stare da nessuna parte fuori dal suo Dashboard.
export const CHIAVE_OK = /^rk_(live|test)_[A-Za-z0-9]{16,}$/;

// Una chiamata a Stripe con la chiave dello streamer. Torna { ok, dati } o
// { ok: false, errore, codice }; non lancia mai.
async function stripe(chiave, metodo, path, params = null) {
  const headers = { Authorization: 'Bearer ' + chiave };
  let body;
  if (params) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') body.append(k, String(v));
  }
  try {
    const r = await fetch(API + path, { method: metodo, headers, body });
    const dati = await r.json().catch(() => null);
    if (!r.ok) {
      const errore = dati?.error?.message || String(r.status);
      log.warn(`stripe ${metodo} ${path}: ${errore}`);
      return { ok: false, errore, codice: dati?.error?.code || String(r.status), stato: r.status };
    }
    return { ok: true, dati };
  } catch (e) {
    log.warn(`stripe ${metodo} ${path}: irraggiungibile`, e?.message || e);
    return { ok: false, errore: 'irraggiungibile', codice: 'rete', stato: 0 };
  }
}
// Stripe, quando rifiuta, dice perche': con 401 la chiave non esiste piu'
// (revocata, o del modo sbagliato), con 403 le manca un permesso, e la sua
// frase dice quale. E' la chiave dello streamer: le parole di Stripe si
// possono dire a lui. Il conto resta, non e' pronto, e la scheda lo spiega.
function spiegaRifiuto(r) {
  if (r.stato === 401) return 'Stripe non riconosce piu\' questa chiave: forse l\'hai revocata. Incollane una nuova.';
  if (r.stato === 403) return 'Alla chiave manca un permesso. Stripe dice: ' + r.errore;
  return '';
}
function chiaveMorta(login, r) {
  const nota = spiegaRifiuto(r);
  if (nota) contiDonazioni.set(login, { pronto: false, nota });
}
// I parametri di una sessione di pagamento sul conto dello streamer. La
// sessione di PROVA al collegamento usa gli stessi, cosi' un permesso che
// manca si scopre subito, non alla prima donazione vera.
function paramsSessione({ login, prodotto, chi, cent, valuta, nome, messaggio, scadenzaMs, ritorno = 'link' }) {
  const base = ritorno === 'dona' ? urlPaginaDona(login) : config.baseUrl + '/u/' + login;
  return {
    mode: 'payment',
    submit_type: 'donate',
    locale: 'auto',
    'line_items[0][price_data][currency]': String(valuta || 'EUR').toLowerCase(),
    'line_items[0][price_data][unit_amount]': cent,
    'line_items[0][price_data][product]': prodotto,
    'line_items[0][quantity]': 1,
    'payment_intent_data[description]': 'Donazione a ' + chi + (nome ? ' da ' + nome : ''),
    'metadata[login]': login,
    'metadata[nome]': nome,
    'metadata[messaggio]': messaggio,
    success_url: `${base}?dona={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}?dona=annullata`,
    expires_at: Math.floor((Date.now() + scadenzaMs) / 1000),
  };
}

// Collega il conto: si verifica la chiave creando nel SUO conto il prodotto
// «Donazione» su cui nasceranno i pagamenti. Se Stripe la rifiuta, la chiave
// non si salva. Torna { ok, coda } o { errore, dettaglio }.
export async function collegaConto(login, chiave) {
  login = String(login || '').toLowerCase();
  const k = String(chiave || '').trim();
  if (/^sk_/.test(k)) return { errore: 'Questa e\' la chiave segreta del conto: puo\' fare tutto, e non va data a nessuno. Crea una chiave con restrizioni (rk_…) con i due permessi indicati.' };
  if (!CHIAVE_OK.test(k)) return { errore: 'La chiave non ha la forma giusta: comincia con rk_live_ o rk_test_ e va copiata intera.' };
  const rifiuto = (r, cosa) => ({
    errore: r.stato === 401 ? 'Stripe non riconosce questa chiave: controlla di averla copiata intera.'
      : r.stato === 403 ? `La chiave non ha il permesso per ${cosa}. Stripe dice: ${r.errore}`
        : 'Stripe non ha risposto come dovrebbe: riprova fra poco.',
    dettaglio: r.errore,
  });
  const r = await stripe(k, 'POST', '/products', { name: 'Donazione', 'metadata[socialbot]': 'donazioni' });
  if (!r.ok) return rifiuto(r, 'creare il prodotto «Donazione» (Products, in scrittura)');
  // una sessione di prova, mai mostrata a nessuno: scade da sola in mezz'ora
  const p = await stripe(k, 'POST', '/checkout/sessions', paramsSessione({ login, prodotto: r.dati.id, chi: login, cent: 100, valuta: 'EUR', nome: '', messaggio: '', scadenzaMs: 31 * 60 * 1000 }));
  if (!p.ok) return rifiuto(p, 'aprire un pagamento (Checkout Sessions, in scrittura)');
  const c = contiDonazioni.set(login, { chiave: k, prodotto: r.dati.id, pronto: true, verificato: true, nota: '' });
  log.info(`conto donazioni collegato per @${login} (chiave …${c.coda})`);
  return { ok: true, coda: c.coda };
}

// La chiave risponde ancora? Si chiede a Stripe il prodotto «Donazione»: una
// chiamata leggera, che con una chiave revocata torna 401.
export async function verificaChiave(login) {
  login = String(login || '').toLowerCase();
  const c = contiDonazioni.get(login);
  if (!c?.chiave) return null;
  const r = await stripe(c.chiave, 'GET', '/products/' + (c.prodotto || 'nessuno'));
  if (r.ok) return contiDonazioni.set(login, { pronto: true, verificato: true, nota: '' });
  const nota = spiegaRifiuto(r);
  if (nota) return contiDonazioni.set(login, { pronto: false, nota });
  return c;
}

export function statoDi(c) {
  if (!c?.chiave) return 'nessuno';
  return c.pronto ? 'pronto' : 'incompleto';
}

// Lo streamer scollega: la chiave si cancella. Revocarla nel suo Dashboard
// e' comunque cosa sua, e giusta.
export function scollega(login) { contiDonazioni.togli(login); }

// Apre il pagamento sul conto dello streamer: una sessione di Checkout con
// l'importo scelto, sul suo prodotto «Donazione», e il ritorno sulla pagina
// link con l'id della sessione. La riga nel registro nasce «in attesa».
export async function apriPagamento({ login, display, importoCent, valuta = 'EUR', nome = '', messaggio = '', ritorno = 'link', media = null }) {
  login = String(login || '').toLowerCase();
  const c = contiDonazioni.get(login);
  if (!c?.chiave || !c.pronto || !c.prodotto) return { errore: 'conto' };
  const cent = Math.round(Number(importoCent) || 0);
  if (cent <= 0) return { errore: 'importo' };
  const params = paramsSessione({ login, prodotto: c.prodotto, chi: display || login, cent, valuta, nome, messaggio, scadenzaMs: SCADENZA_MS, ritorno });
  const r = await stripe(c.chiave, 'POST', '/checkout/sessions', params);
  if (!r.ok || !r.dati?.url) { chiaveMorta(login, r); return { errore: 'stripe' }; }
  registroDonazioni.apri('stripe:' + r.dati.id, { login, fonte: 'stripe', importo: cent, valuta, nome, messaggio, media });
  return { url: r.dati.url, id: r.dati.id };
}

const evento = (r) => ({
  id: r.id, fonte: r.fonte, user: r.nome || 'qualcuno', importo: Math.round(r.importo) / 100,
  valuta: r.valuta, messaggio: r.messaggio || '',
});

// Conferma una sessione: la cerca nel registro (una che non c'e', o di un
// altro canale, non esiste), la rilegge da Stripe con la chiave dello
// streamer e, se pagata, la segna. Torna { nuova, d }: `nuova` e' vera per la
// prima e sola richiesta che l'ha vista pagare; null se non e' pagata.
export async function conferma(login, sessione) {
  login = String(login || '').toLowerCase();
  const id = 'stripe:' + sessione;
  const r = registroDonazioni.get(id);
  if (!r || r.login !== login) return null;
  if (r.stato === 'pagata') return { nuova: false, d: evento(r) };
  if (r.stato !== 'attesa') return null;
  const c = contiDonazioni.get(login);
  if (!c?.chiave) return null;
  const s = await stripe(c.chiave, 'GET', '/checkout/sessions/' + sessione);
  if (!s.ok) { chiaveMorta(login, s); return null; }
  if (s.dati.payment_status === 'paid') {
    const importo = Number.isFinite(s.dati.amount_total) ? s.dati.amount_total : r.importo;
    const nuova = registroDonazioni.paga(id, importo, typeof s.dati.payment_intent === 'string' ? s.dati.payment_intent : (s.dati.payment_intent?.id || ''));
    return { nuova, d: evento({ ...r, importo }) };
  }
  if (s.dati.status === 'expired') registroDonazioni.scadi(id);
  return null;
}

// Il rimborso, dal registro: sul pagamento di Stripe, con la chiave dello
// streamer. Serve il permesso «Refunds» sulla chiave; se manca, Stripe dice
// 403 e lo si spiega. Una donazione arrivata da Ko-fi o dalla chiave API non
// si rimborsa da qui: i soldi non sono passati da Stripe.
export async function rimborsa(login, id) {
  login = String(login || '').toLowerCase();
  const r = registroDonazioni.getDi(login, id);
  if (!r || r.stato !== 'pagata') return { errore: 'Questa donazione non c\'e\' piu\'.' };
  if (r.rimborsata_at) return { errore: 'Gia\' rimborsata.' };
  if (r.fonte !== 'stripe' || !r.riferimento) return { errore: 'Questa donazione non e\' passata dal tuo conto Stripe: si rimborsa da dove e\' arrivata.' };
  const c = contiDonazioni.get(login);
  if (!c?.chiave) return { errore: 'Il conto non e\' collegato.' };
  const s = await stripe(c.chiave, 'POST', '/refunds', { payment_intent: r.riferimento });
  if (!s.ok) {
    // un permesso in meno per i rimborsi non ferma le donazioni: solo una chiave sparita (401) spegne il conto
    if (s.stato === 401) chiaveMorta(login, s);
    return {
      errore: s.stato === 403 ? 'La chiave non ha il permesso «Refunds»: aggiungilo alla chiave in Stripe (Sviluppatori → Chiavi API), oppure rimborsa dal tuo Dashboard.'
        : s.codice === 'charge_already_refunded' ? 'Stripe dice che e\' gia\' stata rimborsata.'
          : 'Stripe non ha accettato il rimborso: riprova fra poco, o fallo dal tuo Dashboard.',
      dettaglio: s.errore,
    };
  }
  registroDonazioni.rimborsa(login, id);
  log.info(`donazione rimborsata su #${login}: ${r.importo / 100} ${r.valuta}`);
  return { ok: true };
}

// La ronda: rilegge le sessioni in attesa, segna le pagate (e avvisa), lascia
// scadere le vecchie, e tiene pulito il registro. Torna quante ne ha trovate pagate.
// `altri`: le conferme degli altri mezzi, per prefisso del registro (satispay: …).
export async function ronda(suPagata, ora = Date.now(), altri = {}) {
  let n = 0;
  for (const r of registroDonazioni.inAttesa()) {
    const prefisso = r.id.slice(0, r.id.indexOf(':'));
    const confermaDi = prefisso === 'stripe' ? conferma : altri[prefisso];
    if (!confermaDi) continue;
    if (ora - r.created_at > SCADENZA_MS + TOLLERANZA_MS) { registroDonazioni.scadi(r.id); if (r.media) altri.fileVia?.(r); continue; }
    const e = await confermaDi(r.login, r.id.slice(prefisso.length + 1));
    if (!e?.nuova) continue;
    n++;
    try { suPagata(r.login, e.d); } catch (err) { log.warn('donazione confermata dalla ronda, avviso fallito:', err?.message || err); }
  }
  for (const x of registroDonazioni.pulisci()) altri.fileVia?.(x);
  return n;
}

let _timer = null;
export function avviaRonda(suPagata, altri = {}) {
  if (_timer) return;
  _timer = setInterval(() => ronda(suPagata, Date.now(), altri).catch((e) => log.warn('ronda donazioni:', e?.message || e)), RONDA_MS);
  _timer.unref?.();
}
