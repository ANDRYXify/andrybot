// Abbonamenti self-service a SocialBot (Stripe / Link).
//
// Filosofia: TUTTO qui è "predisposto ma spento" finché non ci sono le chiavi
// Stripe (config.stripe.attivo). Piani, limiti ed endpoint esistono già; senza
// chiavi i pagamenti semplicemente non partono (niente crash, niente finte
// transazioni). Nessuna dipendenza esterna: si parla con Stripe via REST
// (fetch), coerente col resto del bot.
//
// Modello MODULARE "Base + add-on à la carte":
//  · un canone BASE dà il bot completo per la propria community;
//  · gli ADD-ON sono pacchetti componibili (ognuno un prezzo Stripe a sé) che
//    sbloccano i "super-poteri" — si aggiungono solo quelli che servono;
//  · le funzioni effettive di un abbonato = UNIONE di base + add-on attivi;
//  · gli streamer già abilitati dal sito (community) hanno tutto "di diritto".
//
// Un abbonamento Stripe = una sola sottoscrizione con più line-item (base +
// add-on scelti). I pacchetti attivi viaggiano nei metadata e vengono salvati
// nel DB (colonna `pacchetti`), così il gating conosce esattamente cosa è attivo.
import crypto from 'node:crypto';
import { config } from '../config.js';
import { makeLog } from '../logger.js';

const log = makeLog('abbonamenti');

// ── Piano di prova (gratis) ──────────────────────────────────────────────────
// Per far provare il bot: pochi comandi, tutto il resto spento (paywall).
export const FREE = {
  id: 'free', nome: 'Prova', prezzo: 0, prezzoTesto: 'Gratis', priceEnv: null, icona: '🎈',
  sommario: 'Per iniziare e vedere com’è fatto il bot.',
  funzioni: { moduli: 3, giochi: false, notifiche: false, clipAuto: false, voce: false, moderatori: 0, effetti: false, overlay: true, telegram: false },
};

// ── BASE: il canone che dà il bot completo per la community ──────────────────
// `funzioni`: matrice di ciò che il piano sblocca. Numeri = limiti (Infinity =
// illimitato), booleani = on/off. L'unione con gli add-on la calcola funzioniDi().
export const BASE = {
  id: 'base', nome: 'Base', prezzo: 3.99, prezzoTesto: '€3,99/mese', priceEnv: 'base', icona: '🤖',
  sommario: 'Il cuore del bot: comandi illimitati, antispam e moderazione, overlay per OBS e un moderatore.',
  funzioni: { moduli: Infinity, giochi: false, notifiche: false, clipAuto: false, voce: false, moderatori: 1, effetti: false, overlay: true, telegram: false },
};

// ── ADD-ON à la carte: pacchetti componibili, ognuno un prezzo Stripe a sé ───
// Ogni add-on aggiunge (unione) le sue funzioni sopra alla Base. `priceEnv` è la
// chiave in config.stripe.prezzi; senza price-id l'add-on non è acquistabile.
export const ADDON = [
  {
    id: 'giochi', nome: 'Giochi & Classifiche', prezzo: 2.99, prezzoTesto: '€2,99/mese',
    priceEnv: 'addon_giochi', icona: '🎮',
    sommario: 'Minigiochi in chat, monete, classifiche e premio VIP ai più attivi.',
    funzioni: { giochi: true },
  },
  {
    id: 'effetti', nome: 'Effetti & Punti canale', prezzo: 1.99, prezzoTesto: '€1,99/mese',
    priceEnv: 'addon_effetti', icona: '✨',
    sommario: 'Alert ed effetti in overlay, anche riscattabili con i punti canale.',
    funzioni: { effetti: true },
  },
  {
    id: 'notifiche', nome: 'Social & Notifiche', prezzo: 2.99, prezzoTesto: '€2,99/mese',
    priceEnv: 'addon_notifiche', icona: '📣',
    sommario: 'Annuncia le tue live su TikTok, YouTube e Instagram e collega Telegram.',
    funzioni: { notifiche: true, telegram: true },
  },
  {
    id: 'clip', nome: 'Clip Automatiche', prezzo: 2.99, prezzoTesto: '€2,99/mese',
    priceEnv: 'addon_clip', icona: '🎬',
    sommario: 'I momenti migliori clippati e salvati in automatico durante la diretta.',
    funzioni: { clipAuto: true },
  },
  {
    id: 'voce', nome: 'Comandi Vocali', prezzo: 2.99, prezzoTesto: '€2,99/mese',
    priceEnv: 'addon_voce', icona: '🎙️',
    sommario: 'Guida il bot con la voce: cambia titolo, categoria e assegna VIP mentre streami.',
    funzioni: { voce: true },
  },
  {
    id: 'squadra', nome: 'Squadra', prezzo: 1.99, prezzoTesto: '€1,99/mese',
    priceEnv: 'addon_squadra', icona: '👥',
    sommario: 'Fino a 10 moderatori per gestire il canale in team con i tuoi mod.',
    funzioni: { moderatori: 10 },
  },
  {
    id: 'musica', nome: 'Richieste Musicali', prezzo: 2.99, prezzoTesto: '€2,99/mese',
    priceEnv: 'addon_musica', icona: '🎵',
    sommario: 'Gli spettatori mettono canzoni in coda su Spotify con !sr.',
    funzioni: { musica: true },
  },
];

// Piano "di diritto" per gli streamer abilitati dal sito (accesso pieno, non a
// pagamento): così chi arriva dalla community non è toccato dal paywall.
export const TIER_COMMUNITY = {
  id: 'community', nome: 'Community', prezzo: 0, prezzoTesto: 'Membro community', priceEnv: null, icona: '🎁',
  sommario: 'Accesso completo riservato ai membri abilitati di andryxify.it.',
  funzioni: { moduli: Infinity, giochi: true, notifiche: true, clipAuto: true, voce: true, moderatori: 20, effetti: true, overlay: true, telegram: true, musica: true },
};

// Tutti gli id di add-on esistenti (comodo per promo/trial "esperienza completa").
export const ADDON_IDS = ADDON.map((a) => a.id);

export function addonById(id) { return ADDON.find((a) => a.id === String(id || '').toLowerCase()) || null; }

// Normalizza una lista di pacchetti (array o CSV) → array di id VALIDI, senza
// duplicati e nell'ordine di catalogo (stabile).
export function normalizzaPacchetti(x) {
  const grezzi = Array.isArray(x) ? x : String(x || '').split(',');
  const chiesti = new Set(grezzi.map((r) => String(r || '').trim().toLowerCase()).filter(Boolean));
  return ADDON_IDS.filter((id) => chiesti.has(id));
}

// ── Composizione delle funzioni effettive ────────────────────────────────────
// Fonde più matrici di funzioni: per i numeri prende il MASSIMO (Infinity vince),
// per i booleani fa l'OR. Così base ∪ add-on dà l'accesso "migliore" tra tutti.
function fondiFunzioni(liste) {
  const out = {};
  for (const f of liste) {
    for (const [k, v] of Object.entries(f)) {
      if (typeof v === 'boolean') out[k] = (out[k] === true) || v;
      else out[k] = Math.max(out[k] === undefined ? -Infinity : out[k], v);
    }
  }
  return out;
}

// Funzioni effettive per un abbonato, dato il suo piano base + gli add-on attivi.
// `tier`: 'community' (tutto) | 'base'/'pro' (base, 'pro' = legacy = base+tutti gli
// add-on) | altro/none → 'free'. `pacchetti`: array/CSV di id add-on attivi.
export function funzioniDi({ tier, pacchetti } = {}) {
  const t = String(tier || '').toLowerCase();
  if (t === 'community') return { ...TIER_COMMUNITY.funzioni };
  const attivo = t === 'base' || t === 'pro';
  const parti = [attivo ? BASE.funzioni : FREE.funzioni];
  // 'pro' era il vecchio tier "tutto incluso": lo trattiamo come base + ogni add-on.
  const ids = t === 'pro' ? ADDON_IDS : normalizzaPacchetti(pacchetti);
  for (const id of ids) { const a = addonById(id); if (a) parti.push(a.funzioni); }
  return fondiFunzioni(parti);
}

// Una funzione è abilitata in una matrice? (booleano true, Infinity, o numero > 0)
export function abilitata(funzioni, chiave) {
  const v = funzioni?.[chiave];
  return v === true || v === Infinity || (typeof v === 'number' && v > 0);
}

// Limite numerico di una funzione in una matrice (Infinity = illimitato, 0 = no).
export function limite(funzioni, chiave) {
  const v = funzioni?.[chiave];
  return typeof v === 'number' ? v : (v === true ? Infinity : 0);
}

// Vetrina pubblica: la forma dei piani per il client (Infinity → -1, non-serializz.).
export function pianiPubblici() {
  const san = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === Infinity ? -1 : v]));
  const esponi = (p) => ({ id: p.id, nome: p.nome, icona: p.icona, prezzo: p.prezzo, prezzoTesto: p.prezzoTesto, sommario: p.sommario, funzioni: san(p.funzioni) });
  return {
    free: esponi(FREE),
    base: esponi(BASE),
    addon: ADDON.map(esponi),
    community: esponi(TIER_COMMUNITY),
  };
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

// Crea una sessione di Checkout (abbonamento): canone BASE + gli add-on scelti,
// come line-item multipli di UNA sola sottoscrizione. Ritorna l'URL a cui mandare
// il browser, oppure null se Stripe è spento / manca il price della Base. Link è
// già attivo di default nel Checkout di Stripe.
export async function creaCheckout({ login, pacchetti = [] }) {
  const basePrice = config.stripe.prezzi.base;
  if (!config.stripe.attivo || !basePrice) return null;
  const ids = normalizzaPacchetti(pacchetti);
  // line-item: prima la Base, poi ogni add-on con un price-id configurato.
  const prezzi = [basePrice];
  for (const id of ids) {
    const a = addonById(id);
    const p = a?.priceEnv ? config.stripe.prezzi[a.priceEnv] : '';
    if (p) prezzi.push(p);
  }
  const csv = ids.join(',');
  const base = config.baseUrl;
  const params = {
    mode: 'subscription',
    success_url: base + '/?abbonato=1',
    cancel_url: base + '/?abbonamento=annullato',
    client_reference_id: login,
    'metadata[login]': login,
    'metadata[tier]': 'base',
    'metadata[pacchetti]': csv,
    'subscription_data[metadata][login]': login,
    'subscription_data[metadata][tier]': 'base',
    'subscription_data[metadata][pacchetti]': csv,
    allow_promotion_codes: 'true',
  };
  prezzi.forEach((price, i) => {
    params[`line_items[${i}][price]`] = price;
    params[`line_items[${i}][quantity]`] = '1';
  });
  const s = await stripeCall('/checkout/sessions', params);
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
