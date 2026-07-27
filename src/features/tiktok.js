// TikTok: NON esiste un'API di chat pubblica come Twitch, quindi un bot che
// scrive in chat TikTok non è realizzabile. Qui facciamo l'unica cosa fattibile
// e utile: rilevare (best-effort) quando lo streamer va in diretta su TikTok e
// far partire la notifica (Telegram + eventuale annuncio in chat Twitch).
//
// Il rilevamento automatico usa un endpoint pubblico NON ufficiale: può
// smettere di funzionare o essere bloccato dai data-center. Per questo c'è
// SEMPRE la via affidabile del webhook (/api/ext/<login> azione tiktok-live),
// che una tua automazione (IFTTT/Zapier/…) può chiamare quando vai live.
import { config } from '../config.js';
import { tiktokTokens } from '../db.js';
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

// ════════════════════════════════════════════════════════════════════════════
//  Avviso "nuovo post" via API UFFICIALE TikTok (Display API, OAuth 2.0).
//  L'app TikTok è UNICA (globale, dell'operatore: config.tiktok). Ogni streamer
//  collega il PROPRIO account (Authorization Code) e noi leggiamo l'ultimo video
//  con lo scope video.list. Nessuno scraping: affidabile finché il token vale.
// ════════════════════════════════════════════════════════════════════════════
const AUTH = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN = 'https://open.tiktokapis.com/v2/oauth/token/';
const OPENAPI = 'https://open.tiktokapis.com/v2';
const SCOPES = 'user.info.basic,video.list';

// C'è un'app TikTok configurata (Client Key/Secret dell'operatore)?
export function appAttiva() { return !!config.tiktok?.attivo; }
export function redirectUri() { return config.tiktok?.redirectUri || ''; }
// Questo canale ha collegato il proprio account TikTok (OAuth fatto)?
export function collegato(login) { return !!tiktokTokens.get(login)?.refresh; }
// Dati per la UI (mai i token): @username collegato, se c'è.
export function datiCollegamento(login) {
  const t = tiktokTokens.get(login);
  return t?.refresh ? { username: t.username || '', openId: t.open_id || '' } : null;
}
export function scollega(login) { tiktokTokens.scollega(login); }

// URL a cui mandare il browser dello streamer per autorizzare (con `state`).
export function urlAutorizzazione(state) {
  const p = new URLSearchParams({
    client_key: config.tiktok.clientKey,
    scope: SCOPES,
    response_type: 'code',
    redirect_uri: config.tiktok.redirectUri,
    state,
  });
  return `${AUTH}?${p.toString()}`;
}

// Chiamata all'endpoint token (scambio code o refresh). Ritorna il JSON o null.
async function tokenCall(params) {
  const c = config.tiktok;
  if (!c?.clientKey || !c?.clientSecret) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(TOKEN, {
      method: 'POST',
      signal: ac.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ client_key: c.clientKey, client_secret: c.clientSecret, ...params }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || j?.error) { log.warn('token:', j?.error_description || j?.error || r.status); return null; }
    return j;
  } catch (e) { log.warn('token: irraggiungibile', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Salva i token restituiti da TikTok (comuni a scambio e refresh).
function salvaToken(login, j) {
  const ora = Date.now();
  tiktokTokens.set(login, {
    access: j.access_token || '',
    refresh: j.refresh_token || '',
    scadenza: ora + (Number(j.expires_in) || 86400) * 1000,
    refreshScadenza: j.refresh_expires_in ? ora + Number(j.refresh_expires_in) * 1000 : 0,
    openId: j.open_id || undefined,
  });
}

// Scambia il `code` dell'OAuth e salva i token per il canale. true/false.
export async function collega(login, code) {
  const j = await tokenCall({ code, grant_type: 'authorization_code', redirect_uri: config.tiktok.redirectUri });
  if (!j?.access_token) return false;
  salvaToken(login, j);
  // recupera lo @username (solo per mostrarlo nella dashboard): best-effort.
  try {
    const u = await chiamaApi(login, 'GET', '/user/info/', { query: { fields: 'open_id,username,display_name' } });
    const nome = u?.dati?.data?.user?.username || u?.dati?.data?.user?.display_name || '';
    if (nome) tiktokTokens.set(login, { username: nome });
  } catch { /* non critico */ }
  return true;
}

// Access token valido (rinfrescato se scaduto). null se non collegato/errore.
async function tokenValido(login) {
  const t = tiktokTokens.get(login);
  if (!t?.refresh) return null;
  if (t.access && (t.scadenza - 60000) > Date.now()) return t.access;
  const j = await tokenCall({ grant_type: 'refresh_token', refresh_token: t.refresh });
  if (!j?.access_token) return null;
  salvaToken(login, j);
  return j.access_token;
}

async function chiamaApi(login, method, path, { query, body } = {}) {
  const tok = await tokenValido(login);
  if (!tok) return { ok: false, status: 401 };
  let url = OPENAPI + path;
  if (query) url += '?' + new URLSearchParams(query).toString();
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method,
      signal: ac.signal,
      headers: { Authorization: 'Bearer ' + tok, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let dati = null;
    try { dati = await r.json(); } catch { /* niente */ }
    const errCode = dati?.error?.code;
    const ok = r.ok && (!errCode || errCode === 'ok');
    return { ok, status: r.status, dati };
  } catch (e) { log.warn('api: irraggiungibile', e?.message || e); return { ok: false, status: 0 }; }
  finally { clearTimeout(to); }
}

// Ultimo video pubblicato dall'account collegato. Ritorna
// {id, titolo, url, ts} | {errore} | null. Non lancia mai.
export async function ultimoPostApi(login) {
  const r = await chiamaApi(login, 'POST', '/video/list/', {
    query: { fields: 'id,title,share_url,create_time,video_description' },
    body: { max_count: 1 },
  });
  if (!r.ok) return r.status === 401 ? { errore: 'non collegato o token scaduto' } : { errore: r.dati?.error?.message || ('HTTP ' + r.status) };
  const v = r.dati?.data?.videos?.[0];
  if (!v?.id) return null;
  const titolo = String(v.title || v.video_description || '').slice(0, 140);
  const uname = tiktokTokens.get(login)?.username || '';
  const fallback = uname ? `https://www.tiktok.com/@${uname}/video/${v.id}` : '';
  return { id: String(v.id), titolo, url: v.share_url || fallback, ts: Number(v.create_time) || 0 };
}

// Verifica del collegamento per la UI ("Prova"): { ok } | { ok:false, motivo }.
export async function provaApi(login) {
  const r = await ultimoPostApi(login);
  if (r?.errore) return { ok: false, motivo: r.errore };
  if (r === null) return { ok: true, vuoto: true };   // collegato ma nessun video ancora
  return { ok: true, url: r.url };
}
