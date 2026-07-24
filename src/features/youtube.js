// YouTube: avviso quando esce un NUOVO video. Usa il feed RSS pubblico di
// YouTube (nessuna API, nessuna chiave): affidabile e gratis.
//   https://www.youtube.com/feeds/videos.xml?channel_id=UC...
// Per trovare l'id del canale (UC...) accetta id, URL o @handle e lo risolve
// dalla pagina del canale (best-effort). Non lancia mai.
import { makeLog } from '../logger.js';

const log = makeLog('youtube');
const TIMEOUT_MS = 8000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const RE_UC = /^UC[A-Za-z0-9_-]{22}$/;

async function getText(url) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': UA, 'Accept-Language': 'it,en;q=0.8' } });
    return r.ok ? await r.text() : null;
  } catch (e) { log.debug('get:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

function decodeEnt(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

// Normalizza ciò che scrive lo streamer (id | URL | @handle) per mostrarlo.
export function pulisciCanale(input) {
  return String(input || '').trim();
}

// Risolve l'id del canale (UC...) da id, URL o @handle. Ritorna la stringa UC... o null.
export async function risolviCanaleId(input) {
  const s = pulisciCanale(input);
  if (!s) return null;
  if (RE_UC.test(s)) return s;                                   // è già un channel id
  const mUrl = s.match(/channel\/(UC[A-Za-z0-9_-]{22})/);        // URL .../channel/UC...
  if (mUrl) return mUrl[1];
  let url;
  if (/^https?:\/\//i.test(s)) url = s;
  else if (s.startsWith('@')) url = 'https://www.youtube.com/' + s;
  else url = 'https://www.youtube.com/@' + s.replace(/^@/, '');
  const html = await getText(url);
  if (!html) return null;
  // prima il link CANONICO / externalId (l'id VERO del profilo); solo dopo
  // "channelId" (che a volte è un canale in evidenza, non il suo).
  const m = html.match(/rel="canonical"\s+href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/)
    || html.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/)
    || html.match(/"channelId":"(UC[A-Za-z0-9_-]{22})"/)
    || html.match(/channel\/(UC[A-Za-z0-9_-]{22})/);
  return m ? m[1] : null;
}

// Ultimo video dal feed RSS del canale. Ritorna {videoId, titolo, url} o null.
export async function ultimoVideo(channelId) {
  if (!channelId) return null;
  const xml = await getText('https://www.youtube.com/feeds/videos.xml?channel_id=' + encodeURIComponent(channelId));
  if (!xml) return null;
  const entry = xml.split('<entry>')[1];   // il primo <entry> è il più recente
  if (!entry) return null;
  const vid = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
  if (!vid) return null;
  const titolo = decodeEnt((entry.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
  return { videoId: vid, titolo, url: 'https://www.youtube.com/watch?v=' + vid };
}
