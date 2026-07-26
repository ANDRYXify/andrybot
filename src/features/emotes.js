// Emote 7TV per l'overlay "chat a schermo". Risolve, per canale, la mappa
// nome→immagine (emote GLOBALI 7TV + emote del CANALE) così l'overlay può
// mostrare le emote come nella chat di Twitch, non solo il testo.
//
// Sicurezza: parliamo SOLO con host 7TV fissi (7tv.io / cdn.7tv.app). L'unico
// dato variabile è l'ID numerico Twitch (da Helix) e il login: nessun URL
// arbitrario, quindi nessun rischio SSRF. Timeout e tetti a prova di abuso.
import { makeLog } from '../logger.js';

const log = makeLog('emotes');

const TTL_MS = 10 * 60 * 1000;   // riuso la mappa di un canale per 10 minuti
const TIMEOUT_MS = 6000;         // stop a ogni chiamata 7TV dopo 6s
const MAX_EMOTE = 5000;          // tetto di sicurezza sul numero di emote
// I set di emote grandi (canali con centinaia di emote) pesano parecchio: una
// pagina 7TV completa può superare i 2MB. Tetto generoso ma comunque limitato
// (host 7TV fisso e fidato), così non scartiamo i canali con tante emote.
const MAX_BYTES = 16 * 1024 * 1024; // tetto sulla risposta 7TV (~16MB)

const cacheCanale = new Map();   // login → { ts, mappa }
let cacheGlobale = null;         // { ts, mappa } per le emote globali 7TV

// GET JSON con timeout e tetto di dimensione. Tollerante: mai lanciare, ritorna
// null in caso di errore/timeout/risposta troppo grande.
async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'SocialBot/1.0' },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) return null;
    try { return JSON.parse(buf.toString('utf8')); } catch { return null; }
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// Da un "emote set" 7TV ({ emotes: [{ id, name, ... }] }) ricava nome→URL.
// Usa la 2x webp (buon compromesso qualità/peso) dalla CDN 7TV.
function estrai(set) {
  const out = {};
  const emotes = set?.emotes;
  if (!Array.isArray(emotes)) return out;
  for (const e of emotes) {
    const nome = e?.name;
    const id = e?.id || e?.data?.id;
    if (!nome || !id || typeof nome !== 'string') continue;
    if (!/^[A-Za-z0-9]{20,32}$/.test(String(id))) continue;   // id 7TV: solo esadecimale-like
    out[nome] = `https://cdn.7tv.app/emote/${id}/2x.webp`;
    if (Object.keys(out).length >= MAX_EMOTE) break;
  }
  return out;
}

// Emote GLOBALI 7TV (uguali per tutti): risolte una volta e cache-ate.
async function globali() {
  if (cacheGlobale && Date.now() - cacheGlobale.ts < TTL_MS) return cacheGlobale.mappa;
  const j = await getJson('https://7tv.io/v3/emote-sets/global');
  const mappa = estrai(j);
  cacheGlobale = { ts: Date.now(), mappa };
  return mappa;
}

// Mappa nome→URL per un canale: emote GLOBALI + emote del CANALE (queste
// ultime vincono in caso di nome uguale). Richiede Helix per login→id Twitch.
export async function mappaCanale(helix, login) {
  const key = String(login || '').toLowerCase().trim();
  if (!key) return {};
  const hit = cacheCanale.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.mappa;

  let delCanale = {};
  try {
    const u = await helix?.getUserByLogin?.(key);
    const id = u?.id;
    if (id && /^\d+$/.test(String(id))) {
      const j = await getJson(`https://7tv.io/v3/users/twitch/${encodeURIComponent(id)}`);
      delCanale = estrai(j?.emote_set);
    }
  } catch (e) { log.debug(`mappaCanale #${key}:`, e?.message || e); }

  const mappa = { ...(await globali()), ...delCanale };
  cacheCanale.set(key, { ts: Date.now(), mappa });
  return mappa;
}

// Svuota la cache di un canale (o tutta): utile se un domani vogliamo forzare
// un refresh dopo che lo streamer cambia le sue emote su 7TV.
export function invalida(login) {
  if (login) cacheCanale.delete(String(login).toLowerCase().trim());
  else { cacheCanale.clear(); cacheGlobale = null; }
}

// Emote NATIVE di Twitch presenti in UN messaggio. Twitch non le manda come
// testo ma nel tag IRC "emotes" ("id:inizio-fine,inizio-fine/id2:…"), dove gli
// indici puntano al testo GREZZO. Ricaviamo nome→url estraendo il nome alle
// posizioni indicate (indici per CODE-POINT, non UTF-16, per reggere le emoji).
// L'url è la CDN ufficiale di Twitch (static-cdn.jtv.net).
export function twitchInMessaggio(emotesTag, testo) {
  const out = {};
  if (!emotesTag || !testo) return out;
  const cp = [...String(testo)];
  for (const parte of String(emotesTag).split('/')) {
    const i = parte.indexOf(':');
    if (i < 0) continue;
    const id = parte.slice(0, i);
    const primo = (parte.slice(i + 1).split(',')[0] || '');
    const a = Number(primo.split('-')[0]), b = Number(primo.split('-')[1]);
    if (!id || !Number.isFinite(a) || !Number.isFinite(b) || b < a) continue;
    const nome = cp.slice(a, b + 1).join('');
    if (nome) out[nome] = `https://static-cdn.jtv.net/emoticons/v2/${encodeURIComponent(id)}/default/dark/2.0`;
  }
  return out;
}
