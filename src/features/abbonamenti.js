// Abbonamenti self-service a SocialBot (Stripe / Link).
//
// Filosofia: TUTTO qui è "predisposto ma spento" finché non ci sono le chiavi
// Stripe (config.stripe.attivo). I tier, i limiti e gli endpoint esistono già;
// senza chiavi, i pagamenti semplicemente non partono (niente crash, niente
// finte transazioni). Nessuna dipendenza esterna: si parla con Stripe via REST
// (fetch), coerente col resto del bot.
//
// Modello: un abbonato paga un canone ricorrente e ottiene un TIER. Il tier
// determina quali funzioni sono sbloccate. Gli streamer già abilitati dal sito
// (community) hanno accesso pieno "di diritto" (tier speciale, non a pagamento).
import crypto from 'node:crypto';
import { config } from '../config.js';
import { makeLog } from '../logger.js';

const log = makeLog('abbonamenti');

// ── Tier (strawman: prezzi placeholder, si rifiniscono dal cruscotto Stripe) ──
// `funzioni`: matrice di ciò che ogni tier sblocca. Numeri = limiti (Infinity =
// illimitato), booleani = on/off. Usata da funzioneAbilitata()/limite().
export const TIERS = [
  {
    id: 'free', nome: 'Prova', prezzo: 0, prezzoTesto: 'Gratis', priceEnv: null,
    sommario: 'Per iniziare e vedere com’è fatto il bot.',
    funzioni: { moduli: 3, giochi: false, notifiche: false, clipAuto: false, voce: false, moderatori: 0 },
  },
  {
    id: 'base', nome: 'Base', prezzo: 4.99, prezzoTesto: '€4,99/mese', priceEnv: 'base',
    sommario: 'Tutto il necessario per la tua community.',
    funzioni: { moduli: Infinity, giochi: true, notifiche: true, clipAuto: false, voce: false, moderatori: 1 },
  },
  {
    id: 'pro', nome: 'Pro', prezzo: 9.99, prezzoTesto: '€9,99/mese', priceEnv: 'pro',
    sommario: 'Il massimo: clip automatiche, voce e più moderatori.',
    funzioni: { moduli: Infinity, giochi: true, notifiche: true, clipAuto: true, voce: true, moderatori: 10 },
  },
];

// Tier "di diritto" per gli streamer abilitati dal sito (accesso pieno, non a
// pagamento): così chi arriva dalla community non è toccato dal paywall.
export const TIER_COMMUNITY = {
  id: 'community', nome: 'Community', prezzo: 0, prezzoTesto: 'Membro community', priceEnv: null,
  sommario: 'Accesso completo riservato ai membri abilitati di andryxify.it.',
  funzioni: { moduli: Infinity, giochi: true, notifiche: true, clipAuto: true, voce: true, moderatori: 20 },
};

const TUTTI = [...TIERS, TIER_COMMUNITY];

export function tierById(id) { return TUTTI.find((t) => t.id === id) || null; }

// Tier acquistabili (hanno un price-id configurato). Se Stripe è spento la lista
// è comunque quella dei tier "a pagamento", solo che il checkout non partirà.
export function tierAcquistabili() {
  return TIERS.filter((t) => t.priceEnv);
}

// Una funzione è abilitata per il tier? (booleano true, o limite numerico > 0)
export function funzioneAbilitata(tierId, chiave) {
  const t = tierById(tierId);
  if (!t) return false;
  const v = t.funzioni[chiave];
  return v === true || v === Infinity || (typeof v === 'number' && v > 0);
}

// Limite numerico di una funzione per il tier (Infinity = illimitato, 0 = niente).
export function limiteFunzione(tierId, chiave) {
  const t = tierById(tierId);
  const v = t?.funzioni?.[chiave];
  return typeof v === 'number' ? v : (v === true ? Infinity : 0);
}

// ── Stripe via REST (niente SDK) ────────────────────────────────────────────
const API = 'https://api.stripe.com/v1';

async function stripeCall(path, params) {
  if (!config.stripe.attivo) return null;
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) body.append(k, String(v));
  try {
    const r = await fetch(API + path, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + config.stripe.secretKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const dati = await r.json().catch(() => null);
    if (!r.ok) { log.warn(`stripe ${path}:`, dati?.error?.message || r.status); return null; }
    return dati;
  } catch (e) {
    log.warn(`stripe ${path}: irraggiungibile`, e?.message || e);
    return null;
  }
}

// Crea una sessione di Checkout (abbonamento) per uno streamer e un tier.
// Ritorna l'URL a cui mandare il browser, oppure null se Stripe è spento / il
// tier non è acquistabile. Link è già attivo di default nel Checkout di Stripe.
export async function creaCheckout({ login, tierId }) {
  const tier = tierById(tierId);
  const price = tier?.priceEnv ? config.stripe.prezzi[tier.priceEnv] : '';
  if (!config.stripe.attivo || !price) return null;
  const base = config.baseUrl;
  const s = await stripeCall('/checkout/sessions', {
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    success_url: base + '/?abbonato=1',
    cancel_url: base + '/?abbonamento=annullato',
    client_reference_id: login,
    'metadata[login]': login,
    'metadata[tier]': tierId,
    'subscription_data[metadata][login]': login,
    'subscription_data[metadata][tier]': tierId,
    allow_promotion_codes: 'true',
  });
  return s?.url || null;
}

// Crea una sessione del portale clienti Stripe (gestione/disdetta abbonamento).
export async function creaPortale({ customerId }) {
  if (!config.stripe.attivo || !customerId) return null;
  const s = await stripeCall('/billing_portal/sessions', { customer: customerId, return_url: config.baseUrl + '/' });
  return s?.url || null;
}

// Verifica la firma del webhook Stripe (HMAC-SHA256 su `${t}.${payload}`).
// Ritorna l'evento JSON se valido, altrimenti null. Richiede il corpo RAW.
export function verificaWebhook(rawBody, sigHeader) {
  if (!config.stripe.webhookSecret || !sigHeader || !rawBody) return null;
  const parti = Object.fromEntries(String(sigHeader).split(',').map((p) => {
    const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)];
  }));
  const t = parti.t, v1 = parti.v1;
  if (!t || !v1) return null;
  const atteso = crypto.createHmac('sha256', config.stripe.webhookSecret).update(`${t}.${rawBody}`).digest('hex');
  if (atteso.length !== v1.length) return null;
  try { if (!crypto.timingSafeEqual(Buffer.from(atteso), Buffer.from(v1))) return null; }
  catch { return null; }
  try { return JSON.parse(rawBody.toString('utf8')); } catch { return null; }
}
