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
// Una lettura andata male (7TV lento, Twitch che non risponde) non e' la
// risposta di 7TV: non si tiene per 10 minuti come se il canale non avesse
// emote. Si riprova presto, e intanto vale l'ultima lettura buona, se c'e'.
const RIPROVA_MS = 30 * 1000;
const TIMEOUT_MS = 6000;         // stop a ogni chiamata 7TV dopo 6s
const MAX_EMOTE = 5000;          // tetto di sicurezza sul numero di emote
// I set di emote grandi (canali con centinaia di emote) pesano parecchio: una
// pagina 7TV completa può superare i 2MB. Tetto generoso ma comunque limitato
// (host 7TV fisso e fidato), così non scartiamo i canali con tante emote.
const MAX_BYTES = 16 * 1024 * 1024; // tetto sulla risposta 7TV (~16MB)

const cacheCanale = new Map();   // login → { ts, mappa }
let cacheGlobale = null;         // { ts, mappa } per le emote globali 7TV

// GET JSON con timeout e tetto di dimensione. Tollerante: mai lanciare.
// Ritorna { ok:true, j } se 7TV ha risposto (j null se dice 404: quel canale
// su 7TV non c'e', ed e' una risposta vera), { ok:false } se non si sa.
async function leggi(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'SocialBot/1.0' },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (r.status === 404) return { ok: true, j: null };
    if (!r.ok) return { ok: false };
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) return { ok: false };
    try { return { ok: true, j: JSON.parse(buf.toString('utf8')) }; } catch { return { ok: false }; }
  } catch { return { ok: false }; }
  finally { clearTimeout(timer); }
}

// Una voce di cache resta buona per TTL_MS se la lettura e' riuscita, per
// RIPROVA_MS se no.
const fresca = (v) => !!v && Date.now() - v.ts < (v.buona ? TTL_MS : RIPROVA_MS);

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
  if (fresca(cacheGlobale)) return cacheGlobale.mappa;
  const r = await leggi('https://7tv.io/v3/emote-sets/global');
  const buona = r.ok && Array.isArray(r.j?.emotes);
  cacheGlobale = { ts: Date.now(), buona, mappa: buona ? estrai(r.j) : (cacheGlobale?.mappa || {}) };
  return cacheGlobale.mappa;
}

// Le emote del canale su 7TV, lette adesso: { buona, mappa }. `buona` false se
// non si e' potuto sapere (Twitch o 7TV non hanno risposto).
async function delCanale(helix, key) {
  try {
    const u = await helix?.getUserByLogin?.(key);
    const id = u?.id;
    if (!id || !/^\d+$/.test(String(id))) return { buona: false, mappa: {} };
    const r = await leggi(`https://7tv.io/v3/users/twitch/${encodeURIComponent(id)}`);
    return r.ok ? { buona: true, mappa: estrai(r.j?.emote_set) } : { buona: false, mappa: {} };
  } catch (e) { log.debug(`delCanale #${key}:`, e?.message || e); return { buona: false, mappa: {} }; }
}

// Una lettura nuova in cache: se e' andata male si tiene la mappa di prima.
function ricorda(cache, key, letta) {
  const prima = cache.get(key);
  const v = { ts: Date.now(), buona: letta.buona, mappa: letta.buona ? letta.mappa : (prima?.mappa || {}) };
  cache.set(key, v);
  return v;
}

// Mappa nome→URL per un canale: emote GLOBALI + emote del CANALE (queste
// ultime vincono in caso di nome uguale). Richiede Helix per login→id Twitch.
export async function mappaCanale(helix, login) {
  return (await mappaCanaleLetta(helix, login)).mappa;
}

// Come mappaCanale, e in piu' dice se e' completa: chi la serve all'overlay
// non la fa tenere in cache al browser quando una delle due letture e' mancata.
export async function mappaCanaleLetta(helix, login) {
  const key = String(login || '').toLowerCase().trim();
  if (!key) return { buona: true, mappa: {} };
  let v = cacheCanale.get(key);
  if (!fresca(v)) v = ricorda(cacheCanale, key, await delCanale(helix, key));
  const glob = await globali();
  return { buona: v.buona && cacheGlobale.buona, mappa: { ...glob, ...v.mappa } };
}

// Solo le emote 7TV DEL CANALE, senza le globali: servono al muro delle emote
// quando arriva un raid, per far esplodere le emote di chi arriva. Le globali
// ce le hanno tutti, e non direbbero chi e' arrivato.
const cacheSolo = new Map();     // login → { ts, buona, mappa }
export async function soloCanale(helix, login) {
  const key = String(login || '').toLowerCase().trim();
  if (!/^[a-z0-9_]{1,25}$/.test(key)) return {};
  const hit = cacheSolo.get(key);
  if (fresca(hit)) return hit.mappa;
  if (cacheSolo.size > 500) cacheSolo.clear();
  return ricorda(cacheSolo, key, await delCanale(helix, key)).mappa;
}

// Svuota la cache di un canale (o tutta): utile se un domani vogliamo forzare
// un refresh dopo che lo streamer cambia le sue emote su 7TV.
export function invalida(login) {
  if (login) { const k = String(login).toLowerCase().trim(); cacheCanale.delete(k); cacheSolo.delete(k); }
  else { cacheCanale.clear(); cacheSolo.clear(); cacheGlobale = null; }
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
    if (nome) out[nome] = `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(id)}/default/dark/2.0`;
  }
  return out;
}
