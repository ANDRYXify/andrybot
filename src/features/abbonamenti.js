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

const TOLLERANZA_WEBHOOK_S = 300; // 5 min: finestra anti-replay dei webhook Stripe

// ── ESSENZIALE: il pacchetto GRATUITO ────────────────────────────────────────
// Non è una demo: basta registrarsi e il bot funziona davvero nella tua chat —
// comandi e automazioni illimitati, moderazione e antispam, overlay per OBS e
// contatori a schermo. Si paga solo per ciò che sta oltre (moderatori,
// moderatori, add-on). L'id resta 'free' per compatibilità con i dati salvati.
export const FREE = {
  id: 'free', nome: 'Essenziale', prezzo: 0, prezzoTesto: 'Gratis', priceEnv: null, icona: '🎈',
  sommario: 'Gratis, basta registrarsi: comandi illimitati, moderazione, overlay e alert, giochi e monete, sondaggi, richieste musicali.',
  nome3: ['Essenziale', 'Essenziale', 'Essenziale'],
  sommario3: [
    'Gratis, basta registrarsi: comandi illimitati, moderazione, overlay e alert, giochi e monete, sondaggi, richieste musicali.',
    'Free, just sign up: unlimited commands, moderation, overlay and alerts, games and coins, polls, song requests.',
    'Gratis, solo con registrarte: comandos ilimitados, moderación, overlay y alertas, juegos y monedas, encuestas, peticiones musicales.'],
  // PARITA' CON GLI ALTRI BOT: quello che Nightbot, StreamElements e Cloudbot
  // danno gratis (giochi e monete, alert ed effetti, sondaggi, richieste
  // musicali) qui e' gratis. Si paga cio' che altrove non c'e': moderatori,
  // avvisi live e nuovi post, Studio Web, clip automatiche, comandi a voce.
  funzioni: { moduli: Infinity, giochi: true, notifiche: false, clipAuto: false, voce: false, moderatori: 0, effetti: true, overlay: true, telegram: false, musica: true, studio: false },
};

// ── BASE: il passo sopra l'Essenziale ────────────────────────────────────────
// `funzioni`: matrice di ciò che il piano sblocca. Numeri = limiti (Infinity =
// illimitato), booleani = on/off. L'unione con gli add-on la calcola funzioniDi().
export const BASE = {
  id: 'base', nome: 'Base', prezzo: 2.99, prezzoTesto: '€2,99/mese', priceEnv: 'base', icona: '🤖',
  sommario: 'Tutto l’Essenziale, più gli avvisi live su Telegram/Discord e i nuovi post, lo Studio Web e un moderatore.',
  nome3: ['Base', 'Base', 'Base'],
  sommario3: [
    'Tutto l’Essenziale, più gli avvisi live su Telegram/Discord e i nuovi post, lo Studio Web e un moderatore.',
    'Everything in Essenziale, plus live alerts on Telegram/Discord and new posts, the Web Studio and one moderator.',
    'Todo lo de Essenziale, más los avisos en directo en Telegram/Discord y las nuevas publicaciones, el Studio Web y un moderador.'],
  // Social & Notifiche ora è INCLUSO nel Base (notifiche + telegram): prima era
  // un add-on a pagamento, ma è di fatto essenziale. Chi l'aveva comprato non
  // perde nulla; chi prende il Base ora ce l'ha dentro.
  funzioni: { moduli: Infinity, giochi: true, notifiche: true, clipAuto: false, voce: false, moderatori: 1, effetti: true, overlay: true, telegram: true, musica: true, studio: true },
};

// ── ADD-ON à la carte: pacchetti componibili, ognuno un prezzo Stripe a sé ───
// Ogni add-on aggiunge (unione) le sue funzioni sopra alla Base. `priceEnv` è la
// chiave del prezzo (priceEnv): il suo id lo trova da solo in Stripe, per nome del prodotto.
export const ADDON = [
  {
    id: 'giochi', nome: 'Giochi & Classifiche', prezzo: 2.79, prezzoTesto: '€2,79/mese',
    priceEnv: 'addon_giochi', icona: '🎮',
    sommario: 'Minigiochi in chat, monete, classifiche e premio VIP ai più attivi.',
    nome3: ['Giochi & Classifiche', 'Games & Leaderboards', 'Juegos y Clasificaciones'],
    sommario3: [
      'Minigiochi in chat, monete, classifiche e premio VIP ai più attivi.',
      'Chat minigames, coins, leaderboards and a VIP reward for the most active.',
      'Minijuegos en el chat, monedas, clasificaciones y premio VIP a los más activos.'],
    funzioni: { giochi: true },
    // Ora nell'Essenziale: non si vende piu'. Resta nel catalogo perche' chi lo
    // aveva comprato ha quell'id nei metadata Stripe e nel database.
    ritirato: true,
  },
  {
    id: 'effetti', nome: 'Effetti & Punti canale', prezzo: 1.79, prezzoTesto: '€1,79/mese',
    priceEnv: 'addon_effetti', icona: '✨',
    sommario: 'Alert ed effetti in overlay, anche riscattabili con i punti canale.',
    nome3: ['Effetti & Punti canale', 'Effects & Channel Points', 'Efectos y Puntos de canal'],
    sommario3: [
      'Alert ed effetti in overlay, anche riscattabili con i punti canale.',
      'Overlay alerts and effects, redeemable with channel points too.',
      'Alertas y efectos en overlay, también canjeables con puntos de canal.'],
    funzioni: { effetti: true },
    ritirato: true,
  },
  {
    id: 'notifiche', nome: 'Social & Notifiche', prezzo: 2.99, prezzoTesto: '€2,99/mese',
    priceEnv: 'addon_notifiche', icona: '📣',
    sommario: 'Avvisa quando vai in diretta su Telegram e Discord; avvisa i nuovi post/video su TikTok, YouTube e Instagram.',
    nome3: ['Social & Notifiche', 'Social & Notifications', 'Social y Notificaciones'],
    sommario3: [
      'Avvisa quando vai in diretta su Telegram e Discord; avvisa i nuovi post/video su TikTok, YouTube e Instagram.',
      'Announces when you go live on Telegram and Discord; alerts new posts/videos on TikTok, YouTube and Instagram.',
      'Avisa cuando sales en directo en Telegram y Discord; avisa de nuevas publicaciones/vídeos en TikTok, YouTube e Instagram.'],
    funzioni: { notifiche: true, telegram: true },
    // Ora incluso nel Base: resta definito per i bundle e per chi l'aveva già
    // comprato, ma NON va più offerto come acquisto separato (è già nel Base).
    inclusoBase: true,
  },
  {
    id: 'clip', nome: 'Clip Automatiche', prezzo: 1.99, prezzoTesto: '€1,99/mese',
    priceEnv: 'addon_clip', icona: '🎬',
    sommario: 'I momenti migliori clippati e salvati in automatico durante la diretta.',
    nome3: ['Clip Automatiche', 'Automatic Clips', 'Clips Automáticos'],
    sommario3: [
      'I momenti migliori clippati e salvati in automatico durante la diretta.',
      'Your best moments clipped and saved automatically while you stream.',
      'Los mejores momentos clipados y guardados automáticamente durante el directo.'],
    funzioni: { clipAuto: true },
  },
  {
    id: 'voce', nome: 'Comandi Vocali', prezzo: 0.99, prezzoTesto: '€0,99/mese',
    priceEnv: 'addon_voce', icona: '🎙️',
    sommario: 'Guida il bot con la voce: cambia titolo, categoria e assegna VIP mentre streami.',
    nome3: ['Comandi Vocali', 'Voice Commands', 'Comandos por Voz'],
    sommario3: [
      'Guida il bot con la voce: cambia titolo, categoria e assegna VIP mentre streami.',
      'Drive the bot with your voice: change title, category and grant VIP while you stream.',
      'Controla el bot con la voz: cambia título, categoría y da VIP mientras haces directo.'],
    funzioni: { voce: true },
  },
  {
    id: 'squadra', nome: 'Squadra', prezzo: 1.99, prezzoTesto: '€1,99/mese',
    priceEnv: 'addon_squadra', icona: '👥',
    sommario: 'Fino a 10 moderatori per gestire il canale in team con i tuoi mod.',
    nome3: ['Squadra', 'Team', 'Equipo'],
    sommario3: [
      'Fino a 10 moderatori per gestire il canale in team con i tuoi mod.',
      'Up to 10 moderators to run the channel as a team with your mods.',
      'Hasta 10 moderadores para llevar el canal en equipo con tus mods.'],
    funzioni: { moderatori: 10 },
  },
  {
    id: 'musica', nome: 'Richieste Musicali', prezzo: 2.79, prezzoTesto: '€2,79/mese',
    priceEnv: 'addon_musica', icona: '🎵',
    sommario: 'Gli spettatori mettono canzoni in coda su Spotify con !sr.',
    nome3: ['Richieste Musicali', 'Song Requests', 'Peticiones Musicales'],
    sommario3: [
      'Gli spettatori mettono canzoni in coda su Spotify con !sr.',
      'Viewers queue songs on Spotify with !sr.',
      'Los espectadores ponen canciones en cola en Spotify con !sr.'],
    funzioni: { musica: true },
    ritirato: true,
  },
];

// Piano "di diritto" per gli streamer abilitati dal sito (accesso pieno, non a
// pagamento): così chi arriva dalla community non è toccato dal paywall.
export const TIER_COMMUNITY = {
  id: 'community', nome: 'Community', prezzo: 0, prezzoTesto: 'Membro community', priceEnv: null, icona: '🎁',
  sommario: 'Accesso completo riservato ai membri abilitati di andryxify.it.',
  nome3: ['Community', 'Community', 'Community'],
  sommario3: [
    'Accesso completo riservato ai membri abilitati di andryxify.it.',
    'Full access reserved to enabled members of andryxify.it.',
    'Acceso completo reservado a los miembros habilitados de andryxify.it.'],
  funzioni: { moduli: Infinity, giochi: true, notifiche: true, clipAuto: true, voce: true, moderatori: 20, effetti: true, overlay: true, telegram: true, musica: true, studio: true },
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

// ── BUNDLE curati: set di add-on a PREZZO FISSO scontato ────────────────────
// Non sono un piano a sé: sono una SCORCIATOIA che, con un prezzo unico più
// conveniente, sblocca un gruppo di add-on. In Stripe ognuno e' un prodotto suo
// («Bundle Tutto») con un prezzo unico, trovato per nome come gli altri. Restano add-on "posseduti", quindi la modularità è
// intatta (il gating li conosce uno per uno).
const _sommaAddon = (ids) => ids.reduce((t, id) => t + (addonById(id)?.prezzo || 0), 0);
export const BUNDLE = [
  { id: 'creator', nome: 'Creator', icona: '🎨', priceEnv: 'bundle_creator', prezzo: 4.49, ritirato: true, addon: ['effetti', 'notifiche', 'clip'],
    sommario: 'Presenza e visibilità: overlay ed effetti, avvisi live sui social, clip automatiche.',
    sommario3: [
      'Presenza e visibilità: overlay ed effetti, avvisi live sui social, clip automatiche.',
      'Presence and reach: overlay and effects, live alerts on socials, automatic clips.',
      'Presencia y visibilidad: overlay y efectos, avisos en directo en redes, clips automáticos.'] },
  { id: 'interazione', nome: 'Interazione', icona: '🎉', priceEnv: 'bundle_interazione', prezzo: 5.49, ritirato: true, addon: ['musica', 'giochi', 'voce'],
    sommario: 'Community attiva: richieste musicali, minigiochi e monete, comandi a voce.',
    sommario3: [
      'Community attiva: richieste musicali, minigiochi e monete, comandi a voce.',
      'An active community: song requests, minigames and coins, voice commands.',
      'Comunidad activa: peticiones musicales, minijuegos y monedas, comandos por voz.'] },
  { id: 'tutto', nome: 'Tutto', icona: '🚀', priceEnv: 'bundle_tutto', prezzo: 3.99, addon: ADDON_IDS.filter((id) => !addonById(id).ritirato && !addonById(id).inclusoBase),
    sommario: 'Ogni super-potere sbloccato: tutti gli add-on in un colpo solo.',
    sommario3: [
      'Ogni super-potere sbloccato: tutti gli add-on in un colpo solo.',
      'Every super-power unlocked: all the add-ons in one go.',
      'Cada superpoder desbloqueado: todos los add-ons de una vez.'] },
].map((b) => {
  const pieno = Math.round(_sommaAddon(b.addon) * 100) / 100;
  const sconto = pieno > 0 ? Math.round((1 - b.prezzo / pieno) * 100) / 100 : 0;
  const t = (n) => '€' + n.toFixed(2).replace('.', ',');
  return { ...b, prezzoPieno: pieno, sconto, prezzoTesto: t(b.prezzo) + '/mese', prezzoPienoTesto: t(pieno) };
});
export function bundleById(id) { return BUNDLE.find((b) => b.id === String(id || '').toLowerCase()) || null; }

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

// Infinity non viaggia in JSON (diventa null): fuori casa «illimitato» e' -1.
export const funzioniPubbliche = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, v === Infinity ? -1 : v]));

// ── Il prezzo mostrato e' quello che Stripe addebita, o non si vende ─────────
// Il listino dice prodotto e importo; Stripe ha i prodotti con i loro prezzi.
// Il prezzo di una voce e' quello, attivo e mensile in euro, del prodotto che
// porta il suo nome (o `metadata.socialbot` = la sua chiave) con il suo
// importo. Non c'e' niente da copiare nel .env: un id li' dentro, se c'e',
// forza la scelta e viene verificato lo stesso. Un prodotto rinominato, un
// prezzo vecchio rimasto attivo o un importo che non torna non vendono niente
// per sbaglio: la voce sparisce dal listino, il checkout la rifiuta e il log
// dice cosa Stripe ha davvero. Le voci ritirate, e quelle gia' comprese nel
// Base, non si cercano nemmeno: non si vendono a parte.
const _prezzi = new Map();   // priceEnv → { ok, price, motivo }
let _timerPrezzi = null;
let _firmaPrezzi = '';
const _chiave = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const vociVendute = () => [BASE, ...ADDON.filter((a) => !a.ritirato && !a.inclusoBase), ...BUNDLE.filter((b) => !b.ritirato)];
export function priceDi(voce) { return (voce?.priceEnv && _prezzi.get(voce.priceEnv)?.price) || ''; }
export function vendibile(voce) {
  if (!voce?.priceEnv) return true;                  // gratis: niente da vendere
  if (!config.stripe.attivo) return true;           // pagamenti spenti: il listino si legge lo stesso
  return _prezzi.get(voce.priceEnv)?.ok === true;   // finche' Stripe non conferma, non si vende
}
// Pura: catalogo + prezzi di Stripe (con il prodotto espanso) → esito per voce.
// `forzati` sono gli id del .env: se ci sono, valgono loro, ma si verificano.
export function abbinaPrezzi(voci, lista, forzati = {}) {
  const out = new Map();
  const descr = (p) => `${p.unit_amount} ${p.currency}/${p.recurring?.interval || '?'}${p.active === false ? ' (archiviato)' : ''}`;
  for (const v of voci) {
    const atteso = Math.round(v.prezzo * 100);
    const suo = (p) => {
      const prod = p.product;
      if (!prod || typeof prod !== 'object') return false;
      const marca = prod.metadata && prod.metadata.socialbot;
      if (marca) return marca === v.priceEnv;
      return prod.active !== false && _chiave(prod.name).replace(/^(bundle|pacchetto)/, '') === _chiave(v.nome);
    };
    const giusto = (p) => p.active !== false && p.currency === 'eur' && p.recurring?.interval === 'month'
      && (p.recurring.interval_count || 1) === 1 && p.unit_amount === atteso;
    const forzato = forzati[v.priceEnv];
    const cand = forzato ? lista.filter((p) => p.id === forzato) : lista.filter(suo);
    if (forzato && !cand.length) { out.set(v.priceEnv, { ok: false, price: '', motivo: `l'id ${forzato} del .env non e' fra i prezzi di Stripe` }); continue; }
    const buoni = cand.filter(giusto).sort((a, b) => (b.created || 0) - (a.created || 0));
    if (buoni.length) out.set(v.priceEnv, { ok: true, price: buoni[0].id, motivo: '' });
    else if (cand.length) out.set(v.priceEnv, { ok: false, price: '', motivo: `Stripe ha ${cand.map(descr).join(', ')} ≠ listino ${atteso} eur/month` });
    else out.set(v.priceEnv, { ok: false, price: '', motivo: `nessun prodotto «${v.nome}» in Stripe` });
  }
  return out;
}
// tutti i prezzi ricorrenti attivi, con il prodotto espanso (a pagine da 100)
async function elencoPrezziStripe() {
  const out = [];
  let dopo = '';
  for (let giro = 0; giro < 20; giro++) {
    const q = new URLSearchParams({ limit: '100', active: 'true', type: 'recurring' });
    q.append('expand[]', 'data.product');
    if (dopo) q.set('starting_after', dopo);
    const j = await stripeGet('/prices?' + q);
    if (!j || !Array.isArray(j.data)) return null;
    out.push(...j.data);
    if (!j.has_more || !j.data.length) break;
    dopo = j.data[j.data.length - 1].id;
  }
  return out;
}
// Chiede a Stripe e riempie _prezzi. Ritorna null se Stripe non risponde (e
// allora quel che c'era resta com'e'), [] con i pagamenti spenti, gli esiti se no.
export async function verificaPrezziStripe() {
  if (!config.stripe.attivo) return [];
  const lista = await elencoPrezziStripe();
  if (!lista) { log.warn('prezzi Stripe: non risponde; finche\' non risponde non si vende niente, riprovo fra un minuto'); return null; }
  const voci = vociVendute();
  const forzati = {};
  for (const v of voci) {
    const id = config.stripe.prezzi[v.priceEnv];
    if (!id) continue;
    forzati[v.priceEnv] = id;
    if (!lista.some((p) => p.id === id)) { const p = await stripeGet('/prices/' + encodeURIComponent(id) + '?expand[]=product'); if (p) lista.push(p); }
  }
  const esiti = abbinaPrezzi(voci, lista, forzati);
  const vendute = [];
  for (const v of voci) {
    const e = esiti.get(v.priceEnv);
    _prezzi.set(v.priceEnv, e);
    if (e.ok) vendute.push(`${v.nome} ${e.price}`);
    else log.error(`prezzo di «${v.nome}»: ${e.motivo} — non si vende finche' non coincidono`);
  }
  const firma = vendute.join(' · ');
  if (firma !== _firmaPrezzi) { _firmaPrezzi = firma; log.info('prezzi Stripe in vendita: ' + (firma || 'nessuno')); }
  return voci.map((v) => ({ id: v.id, priceEnv: v.priceEnv, ...esiti.get(v.priceEnv) }));
}
// All'avvio e poi ogni quarto d'ora (ogni minuto finche' Stripe non risponde):
// un prezzo nuovo creato in Stripe si vende da solo, senza toccare il server.
export function sorvegliaPrezzi() {
  if (!config.stripe.attivo) return;
  clearTimeout(_timerPrezzi);
  const poi = (ms) => { _timerPrezzi = setTimeout(sorvegliaPrezzi, ms); if (_timerPrezzi.unref) _timerPrezzi.unref(); };
  verificaPrezziStripe().then((esiti) => poi(esiti ? 15 * 60_000 : 60_000))
    .catch((e) => { log.warn('prezzi Stripe:', e?.message || e); poi(60_000); });
}

// Vetrina pubblica: la forma dei piani per il client (Infinity → -1, non-serializz.).
export function pianiPubblici() {
  const san = funzioniPubbliche;
  const esponi = (p) => ({ id: p.id, nome: p.nome, nome3: p.nome3 || null, icona: p.icona, prezzo: p.prezzo, prezzoTesto: p.prezzoTesto, sommario: p.sommario, sommario3: p.sommario3 || null, funzioni: san(p.funzioni) });
  return {
    free: esponi(FREE),
    base: esponi(BASE),
    // gli add-on inclusi nel Base (es. Social & Notifiche) non si offrono più à la
    // carte: restano definiti solo per i bundle e per chi li aveva già comprati.
    addon: ADDON.filter((a) => !a.inclusoBase && !a.ritirato && vendibile(a)).map(esponi),
    ritirati: ADDON.filter((a) => a.ritirato).map((a) => a.id),
    nAddon: ADDON_IDS.length,
    baseVendibile: vendibile(BASE),
    bundle: BUNDLE.filter((b) => !b.ritirato && vendibile(b)).map((b) => ({ id: b.id, nome: b.nome, icona: b.icona, sommario: b.sommario, sommario3: b.sommario3 || null,
      addon: b.addon, prezzo: b.prezzo, prezzoTesto: b.prezzoTesto, prezzoPieno: b.prezzoPieno, prezzoPienoTesto: b.prezzoPienoTesto, sconto: b.sconto })),
    community: esponi(TIER_COMMUNITY),
  };
}

// ── Stripe via REST (niente SDK) ────────────────────────────────────────────
const API = 'https://api.stripe.com/v1';

async function stripeGet(path) {
  if (!config.stripe.attivo) return null;
  try {
    const r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + config.stripe.secretKey } });
    const dati = await r.json().catch(() => null);
    if (!r.ok) { log.warn(`stripe GET ${path}:`, dati?.error?.message || r.status); return null; }
    return dati;
  } catch (e) {
    log.warn(`stripe GET ${path}: irraggiungibile`, e?.message || e);
    return null;
  }
}

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
export async function creaCheckout({ login, pacchetti = [], bundle = null }) {
  const basePrice = priceDi(BASE);
  if (!config.stripe.attivo || !basePrice || !vendibile(BASE)) return null;
  const b = bundle ? bundleById(bundle) : null;
  if (b && (b.ritirato || !vendibile(b))) return null;
  let ids, prezzi;
  if (b) {
    // BUNDLE: line-item = Base + il prezzo UNICO del bundle. Nei metadata salvo
    // comunque i suoi add-on, così il gating li sblocca uno per uno.
    const bp = priceDi(b);
    if (!bp) return null;              // bundle senza un prezzo confermato in Stripe
    ids = normalizzaPacchetti(b.addon);
    prezzi = [basePrice, bp];
  } else {
    // à la carte: Base + ogni add-on scelto con un prezzo confermato in Stripe.
    ids = normalizzaPacchetti(pacchetti);
    prezzi = [basePrice];
    // gli add-on ritirati sono gia' nell'Essenziale e quelli compresi nel Base si
    // stanno gia' pagando con il canone: chiederli non costa niente
    ids = ids.filter((id) => { const a = addonById(id); return a && !a.ritirato && !a.inclusoBase && vendibile(a); });
    for (const id of ids) {
      const a = addonById(id);
      const p = priceDi(a);
      if (p) prezzi.push(p);
    }
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
  // Anti-REPLAY: rifiuta eventi troppo vecchi/futuri. Senza questo controllo un
  // webhook autentico catturato (log, proxy...) potrebbe essere rigiocato per
  // sempre. Stessa tolleranza dello SDK ufficiale Stripe: 5 minuti.
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLLERANZA_WEBHOOK_S) return null;
  const atteso = crypto.createHmac('sha256', config.stripe.webhookSecret).update(`${t}.${rawBody}`).digest('hex');
  if (atteso.length !== v1.length) return null;
  try { if (!crypto.timingSafeEqual(Buffer.from(atteso), Buffer.from(v1))) return null; }
  catch { return null; }
  try { return JSON.parse(rawBody.toString('utf8')); } catch { return null; }
}
