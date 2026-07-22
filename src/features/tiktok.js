// TikTok: NON esiste un'API di chat pubblica come Twitch, quindi un bot che
// scrive in chat TikTok non è realizzabile. Qui facciamo l'unica cosa fattibile
// e utile: rilevare (best-effort) quando lo streamer va in diretta su TikTok e
// far partire la notifica (Telegram + eventuale annuncio in chat Twitch).
//
// Il rilevamento automatico usa un endpoint pubblico NON ufficiale: può
// smettere di funzionare o essere bloccato dai data-center. Per questo c'è
// SEMPRE la via affidabile del webhook (/api/ext/<login> azione tiktok-live),
// che una tua automazione (IFTTT/Zapier/…) può chiamare quando vai live.
import { makeLog } from '../logger.js';

const log = makeLog('tiktok');

const TIMEOUT_MS = 8_000;
// UA da browser: gli endpoint pubblici rispondono male agli UA "automazione"
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export function pulisciUsername(u) {
  return String(u || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, '').split(/[/?#]/)[0].toLowerCase();
}

export function urlLive(username) {
  return `https://www.tiktok.com/@${pulisciUsername(username)}/live`;
}

async function getJson(url) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' } });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch { return null; } finally { clearTimeout(to); }
}

// Ritorna { live: true } | { live: false } | { sconosciuto: true }.
// Prudente: nel dubbio ritorna "sconosciuto" (mai un falso positivo, così non
// manda notifiche sbagliate; ci si affida al webhook quando non è sicuro).
export async function isLive(username) {
  const u = pulisciUsername(username);
  if (!u) return { sconosciuto: true };
  try {
    // endpoint pubblico non ufficiale: stanza dell'utente
    const j = await getJson(`https://www.tiktok.com/api-live/user/room/?aid=1988&sourceType=54&uniqueId=${encodeURIComponent(u)}`);
    const status = j?.data?.user?.status ?? j?.data?.status ?? j?.LiveRoomInfo?.status;
    const roomId = j?.data?.user?.roomId ?? j?.data?.roomId ?? j?.data?.user?.room_id;
    // status 2 = in diretta; 4 = terminata (valori osservati sul webcast TikTok)
    if (status === 2 || status === '2') return { live: true, roomId: String(roomId || '') };
    if (status === 4 || status === '4' || status === 0 || status === '0') return { live: false };
    return { sconosciuto: true };
  } catch (e) {
    log.debug(`isLive #${u}:`, e?.message || e);
    return { sconosciuto: true };
  }
}
