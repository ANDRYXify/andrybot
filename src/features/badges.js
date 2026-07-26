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
