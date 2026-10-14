// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Stemmi (badge) accanto ai nick nella "chat a schermo" dell'overlay:
//  - Twitch: broadcaster, mod, VIP, sub, prime, bit… (globali + del canale)
//  - 7TV: il badge cosmetico dell'utente, se ne ha uno.
// Sicurezza: si parla SOLO con host fissi e fidati — api.twitch.tv (via Helix) e
// 7tv.io / cdn.7tv.app. L'unico dato variabile è l'id numerico Twitch: niente
// URL arbitrari, niente SSRF. Timeout su ogni chiamata; risultati in cache.
import { streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('badges');

const TTL_TW = 60 * 60 * 1000;    // mappa badge Twitch di un canale: 1 ora
const TTL_7TV = 30 * 60 * 1000;   // badge 7TV di un utente: 30 minuti
const TIMEOUT = 5000;

const cacheTw = new Map();   // login → { ts, mappa }
const cache7 = new Map();    // userId → { ts, url }

// --- Twitch: mappa "setId/version" → url immagine (globali + del canale) ---
function _accumula(mappa, data) {
  for (const set of (data || [])) {
    for (const v of (set.versions || [])) {
      const u = v.image_url_2x || v.image_url_1x || v.image_url_4x;
      if (u && set.set_id && v.id != null) mappa[`${set.set_id}/${v.id}`] = u;
    }
  }
}

// Ritorna (e mette in cache) la mappa badge Twitch del canale. Non lancia mai.
export async function mappaBadge(helix, login) {
  const ch = String(login || '').toLowerCase();
  const c = cacheTw.get(ch);
  if (c && Date.now() - c.ts < TTL_TW) return c.mappa;
  const mappa = {};
  try { _accumula(mappa, await helix.badgeGlobali()); } catch (e) { log.debug('globali:', e?.message || e); }
  try { const s = streamers.get(ch); if (s?.user_id) _accumula(mappa, await helix.badgeCanale(s.user_id)); } catch (e) { log.debug('canale:', e?.message || e); }
  cacheTw.set(ch, { ts: Date.now(), mappa });
  return mappa;
}

// --- 7TV: badge cosmetico dell'utente. SINCRONO dalla cache; se manca, avvia un
// fetch fire-and-forget e per questa volta ritorna '' (comparirà dal messaggio
// successivo). Così la chat non si blocca mai. Ritorna l'url o ''. ---
export function badge7tv(userId) {
  const id = String(userId || '');
  if (!id) return '';
  const c = cache7.get(id);
  if (c && Date.now() - c.ts < TTL_7TV) return c.url;
  if (!c) { cache7.set(id, { ts: Date.now(), url: '' }); _fetch7tv(id); }
  return c ? c.url : '';
}

async function _fetch7tv(id) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    const r = await fetch(`https://7tv.io/v3/users/twitch/${encodeURIComponent(id)}`, {
      signal: ctrl.signal, headers: { Accept: 'application/json', 'User-Agent': 'SocialBot/1.0' },
    }).finally(() => clearTimeout(t));
    const j = await r.json().catch(() => null);
    const bid = j?.user?.style?.badge_id;
    cache7.set(id, { ts: Date.now(), url: bid ? `https://cdn.7tv.app/badge/${bid}/2x.webp` : '' });
  } catch (e) {
    cache7.set(id, { ts: Date.now(), url: '' });   // niente: nessun badge (non ritentare a raffica)
  }
}

// --- Il colore del nome: Twitch lo manda in `color`, Kick in `kick-colore`
// (kick/messaggio.js). Passa solo un colore esadecimale: quello che arriva da
// fuori va a finire nello stile della riga. Esce sempre a sei cifre, perche'
// chi lo legge a valle (l'arena) lo scompone in rosso, verde e blu. ---
export function coloreDi(msg) {
  const c = String(msg?.tags?.color || msg?.tags?.['kick-colore'] || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c);
  return m ? `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}` : '';
}

// --- Kick: gli stemmi arrivano come tipi (broadcaster, moderator…), senza
// immagini. L'overlay li disegna da se'; qui passano solo quelli che sa
// disegnare, in ordine di importanza, e solo per chi scrive da Kick. ---
export const STEMMI_KICK = Object.freeze(['broadcaster', 'moderator', 'vip', 'og', 'founder', 'subscriber', 'sub_gifter', 'verified']);
export function stemmiKick(msg) {
  if (String(msg?.piattaforma || '').toLowerCase() !== 'kick') return [];
  const tipi = new Set(String(msg?.tags?.['kick-badges'] || '').split(',').map((x) => x.trim().toLowerCase()));
  return STEMMI_KICK.filter((t) => tipi.has(t));
}

// --- 7TV si cerca per id di Twitch: l'id di chi scrive da Kick e' un altro
// numero, e chiederlo a 7TV darebbe lo stemma di una persona qualunque. ---
export function badge7tvDi(msg) {
  if (String(msg?.piattaforma || 'twitch').toLowerCase() !== 'twitch') return '';
  return badge7tv(msg?.userId || msg?.tags?.['user-id']);
}
