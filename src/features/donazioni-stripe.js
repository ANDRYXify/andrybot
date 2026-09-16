// IL CONTO STRIPE DELLO STREAMER, e i pagamenti che ci arrivano sopra.
//
// Stripe Connect, conto «Standard»: lo streamer lo apre (o collega quello che
// ha gia') dal pannello, Stripe gli chiede identita' e coordinate, e il conto
// resta suo, con la sua dashboard. Il pagamento nasce SUL SUO CONTO
// (intestazione Stripe-Account): lui e' l'esercente, i soldi arrivano a lui,
// le commissioni di Stripe le paga lui sull'incasso, e SocialBot puo'
// trattenere una quota (application fee), di serie zero. Per la piattaforma
// un conto Standard non costa niente.
//
// La verita' su un pagamento la da' Stripe: la sessione si rilegge con la
// chiave della piattaforma, e si conta una volta sola grazie al registro
// (attesa → pagata, un passaggio solo). Niente webhook da configurare: la
// conferma arriva al ritorno del donatore sulla pagina, e una ronda ogni due
// minuti rilegge le sessioni ancora aperte, per chi chiude la scheda prima.
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { contiDonazioni, registroDonazioni } from '../db.js';

const log = makeLog('donazioni');
const API = 'https://api.stripe.com/v1';
export const SCADENZA_MS = 60 * 60 * 1000;          // una sessione di pagamento vive un'ora
const TOLLERANZA_MS = 15 * 60 * 1000;               // poi si aspetta ancora un quarto d'ora prima di darla per scaduta
const RONDA_MS = 2 * 60 * 1000;

// I paesi in cui Stripe apre un conto: quello dello streamer si sceglie prima
// di collegarlo, perche' Stripe lo chiede alla creazione.
export const PAESI = [
  ['IT', 'Italia'], ['AT', 'Austria'], ['BE', 'Belgio'], ['BG', 'Bulgaria'], ['HR', 'Croazia'], ['CY', 'Cipro'],
  ['CZ', 'Cechia'], ['DK', 'Danimarca'], ['EE', 'Estonia'], ['FI', 'Finlandia'], ['FR', 'Francia'], ['DE', 'Germania'],
  ['GR', 'Grecia'], ['HU', 'Ungheria'], ['IE', 'Irlanda'], ['LV', 'Lettonia'], ['LT', 'Lituania'], ['LU', 'Lussemburgo'],
  ['MT', 'Malta'], ['NL', 'Paesi Bassi'], ['NO', 'Norvegia'], ['PL', 'Polonia'], ['PT', 'Portogallo'], ['RO', 'Romania'],
  ['SK', 'Slovacchia'], ['SI', 'Slovenia'], ['ES', 'Spagna'], ['SE', 'Svezia'], ['CH', 'Svizzera'], ['LI', 'Liechtenstein'],
  ['GB', 'Regno Unito'], ['GI', 'Gibilterra'], ['US', 'Stati Uniti'], ['CA', 'Canada'], ['MX', 'Messico'], ['BR', 'Brasile'],
  ['AU', 'Australia'], ['NZ', 'Nuova Zelanda'], ['JP', 'Giappone'], ['SG', 'Singapore'], ['HK', 'Hong Kong'], ['AE', 'Emirati Arabi Uniti'],
];
export const paeseOk = (p) => (PAESI.some(([c]) => c === p) ? p : 'IT');

export const attivo = () => !!config.donazioni?.attivo;
export const quotaPct = () => Number(config.donazioni?.quotaPct) || 0;
export const quota = (cent) => Math.round((Number(cent) || 0) * quotaPct() / 100);

// Una chiamata a Stripe con la chiave della piattaforma; con `account` la
// richiesta vale sul conto dello streamer. Torna { ok, dati } o { ok: false,
// errore, codice }; non lancia mai.
async function stripe(metodo, path, { params = null, account = '' } = {}) {
  if (!attivo()) return { ok: false, errore: 'spento', codice: 'spento' };
  const headers = { Authorization: 'Bearer ' + config.stripe.secretKey };
  if (account) headers['Stripe-Account'] = account;
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
      return { ok: false, errore, codice: dati?.error?.code || String(r.status) };
    }
    return { ok: true, dati };
  } catch (e) {
    log.warn(`stripe ${metodo} ${path}: irraggiungibile`, e?.message || e);
    return { ok: false, errore: 'irraggiungibile', codice: 'rete' };
  }
}
// Quello che si dice allo streamer quando Stripe non collabora. Il motivo vero
// va nel log e in `dettaglio`, che il server mostra solo all'amministratore:
// allo streamer serve sapere che deve riprovare, o chiedere; a chi gestisce
// serve la frase di Stripe (per esempio: Connect non ancora attivato).
const SCUSA = 'Stripe non ha risposto come dovrebbe: riprova fra poco. Se continua, scrivilo a chi gestisce il servizio.';

// Collega il conto: se non c'e' lo crea (Standard, nel paese scelto), poi
// chiede a Stripe la pagina di registrazione e torna il suo indirizzo.
export async function collegaConto(login, paese = 'IT') {
  login = String(login || '').toLowerCase();
  if (!attivo()) return { errore: 'Le donazioni sul conto non sono attive su questo server.' };
  let c = contiDonazioni.get(login);
  if (!c?.stripe_account) {
    const p = paeseOk(paese);
    const r = await stripe('POST', '/accounts', { params: { type: 'standard', country: p, 'metadata[login]': login } });
    if (!r.ok) return { errore: SCUSA, dettaglio: r.errore };
    c = contiDonazioni.set(login, { account: r.dati.id, paese: p, pronto: false, dettagli: false });
    log.info(`conto donazioni creato per @${login} (${p})`);
  }
  return linkRegistrazione(c.stripe_account);
}

// La pagina di registrazione di Stripe per un conto: vale pochi minuti, si
// richiede ogni volta (anche quando lo streamer la lascia a meta').
export async function linkRegistrazione(account) {
  const base = config.baseUrl;
  const r = await stripe('POST', '/account_links', {
    params: { account, type: 'account_onboarding', refresh_url: base + '/api/donazioni/conto/riprendi', return_url: base + '/api/donazioni/conto/ritorno' },
  });
  if (!r.ok) return { errore: SCUSA, dettaglio: r.errore };
  return { url: r.dati.url };
}

// Rilegge da Stripe se il conto puo' incassare. Un conto che Stripe non
// conosce piu' si dimentica.
export async function aggiornaStato(login) {
  const c = contiDonazioni.get(login);
  if (!c?.stripe_account) return null;
  const r = await stripe('GET', '/accounts/' + c.stripe_account);
  if (!r.ok) {
    if (r.codice === 'account_invalid' || /No such account/i.test(r.errore)) { contiDonazioni.togli(login); return null; }
    return c;
  }
  const dopo = contiDonazioni.set(login, { pronto: r.dati.charges_enabled === true, dettagli: r.dati.details_submitted === true, verificato: true });
  if (dopo.pronto && !c.pronto) log.info(`conto donazioni pronto per @${login}`);
  return dopo;
}

export function statoDi(c) {
  if (!c?.stripe_account) return 'nessuno';
  return c.pronto ? 'pronto' : 'incompleto';
}

// Lo streamer scollega: si dimentica l'id. Il conto su Stripe resta suo.
export function scollega(login) { contiDonazioni.togli(login); }

// Apre il pagamento sul conto dello streamer: una sessione di Checkout con
// l'importo scelto, la quota della piattaforma se c'e', e il ritorno sulla
// pagina link con l'id della sessione. La riga nel registro nasce «in attesa».
export async function apriPagamento({ login, display, importoCent, valuta = 'EUR', nome = '', messaggio = '' }) {
  login = String(login || '').toLowerCase();
  const c = contiDonazioni.get(login);
  if (!c?.stripe_account || !c.pronto) return { errore: 'conto' };
  const cent = Math.round(Number(importoCent) || 0);
  if (cent <= 0) return { errore: 'importo' };
  const chi = display || login;
  const base = config.baseUrl;
  const fee = quota(cent);
  const params = {
    mode: 'payment',
    submit_type: 'donate',
    locale: 'auto',
    'line_items[0][price_data][currency]': String(valuta || 'EUR').toLowerCase(),
    'line_items[0][price_data][unit_amount]': cent,
    'line_items[0][price_data][product_data][name]': 'Donazione a ' + chi,
    'line_items[0][quantity]': 1,
    'payment_intent_data[description]': 'Donazione a ' + chi + (nome ? ' da ' + nome : ''),
    'metadata[login]': login,
    'metadata[nome]': nome,
    'metadata[messaggio]': messaggio,
    success_url: `${base}/u/${login}?dona={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/u/${login}?dona=annullata`,
    expires_at: Math.floor((Date.now() + SCADENZA_MS) / 1000),
  };
  if (fee > 0) params['payment_intent_data[application_fee_amount]'] = fee;
  const r = await stripe('POST', '/checkout/sessions', { params, account: c.stripe_account });
  if (!r.ok || !r.dati?.url) return { errore: 'stripe' };
  registroDonazioni.apri('stripe:' + r.dati.id, { login, fonte: 'stripe', importo: cent, valuta, nome, messaggio });
  return { url: r.dati.url, id: r.dati.id };
}

const evento = (r) => ({
  id: r.id, fonte: r.fonte, user: r.nome || 'qualcuno', importo: Math.round(r.importo) / 100,
  valuta: r.valuta, messaggio: r.messaggio || '',
});

// Conferma una sessione: la cerca nel registro (una che non c'e', o di un
// altro canale, non esiste), la rilegge da Stripe e, se pagata, la segna.
// Torna { nuova, d }: `nuova` e' vera per la prima e sola richiesta che
// l'ha vista pagare; null se non e' pagata (o non e' nostra).
export async function conferma(login, sessione) {
  login = String(login || '').toLowerCase();
  const id = 'stripe:' + sessione;
  const r = registroDonazioni.get(id);
  if (!r || r.login !== login) return null;
  if (r.stato === 'pagata') return { nuova: false, d: evento(r) };
  if (r.stato !== 'attesa') return null;
  const c = contiDonazioni.get(login);
  if (!c?.stripe_account) return null;
  const s = await stripe('GET', '/checkout/sessions/' + sessione, { account: c.stripe_account });
  if (!s.ok) return null;
  if (s.dati.payment_status === 'paid') {
    const importo = Number.isFinite(s.dati.amount_total) ? s.dati.amount_total : r.importo;
    const nuova = registroDonazioni.paga(id, importo);
    return { nuova, d: evento({ ...r, importo }) };
  }
  if (s.dati.status === 'expired') registroDonazioni.scadi(id);
  return null;
}

// La ronda: rilegge le sessioni in attesa, segna le pagate (e avvisa), lascia
// scadere le vecchie, e tiene pulito il registro. Torna quante ne ha trovate pagate.
export async function ronda(suPagata, ora = Date.now()) {
  let n = 0;
  if (attivo()) {
    for (const r of registroDonazioni.inAttesa()) {
      if (!r.id.startsWith('stripe:')) continue;
      if (ora - r.created_at > SCADENZA_MS + TOLLERANZA_MS) { registroDonazioni.scadi(r.id); continue; }
      const e = await conferma(r.login, r.id.slice('stripe:'.length));
      if (!e?.nuova) continue;
      n++;
      try { suPagata(r.login, e.d); } catch (err) { log.warn('donazione confermata dalla ronda, avviso fallito:', err?.message || err); }
    }
  }
  registroDonazioni.pulisci();
  return n;
}

let _timer = null;
export function avviaRonda(suPagata) {
  if (_timer) return;
  _timer = setInterval(() => ronda(suPagata).catch((e) => log.warn('ronda donazioni:', e?.message || e)), RONDA_MS);
  _timer.unref?.();
}
