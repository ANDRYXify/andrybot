// Connettore Spotify per le "richieste musicali". Ogni streamer collega il
// PROPRIO account Spotify (OAuth Authorization Code): il bot può poi cercare un
// brano e metterlo nella coda di riproduzione del broadcaster. Nessun dato
// personale conservato oltre ai token (in spotify_tokens).
//
// "Predisposto ma spento": senza credenziali app (config.spotify.attivo) il
// connettore non parte e il bottone "Connetti Spotify" non compare.
import { config } from '../config.js';
import { spotifyTokens } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('spotify');

const ACCOUNTS = 'https://accounts.spotify.com';
const API = 'https://api.spotify.com/v1';
// aggiungere alla coda + leggere la riproduzione in corso
const SCOPES = 'user-modify-playback-state user-read-playback-state user-read-currently-playing';

// Credenziali dell'app da usare per un canale: quelle DELLO STREAMER se le ha
// impostate, altrimenti l'app globale dell'operatore (config.spotify). Il
// redirect è sempre lo stesso (il nostro /spotify/callback): ogni streamer lo
// registra nella propria app Spotify.
export function credenziali(login) {
  const t = login ? spotifyTokens.get(login) : null;
  if (t?.client_id && t?.client_secret) return { clientId: t.client_id, clientSecret: t.client_secret, proprio: true };
  return { clientId: config.spotify.clientId, clientSecret: config.spotify.clientSecret, proprio: false };
}
export function redirectUri() { return config.spotify.redirectUri; }

// C'è un'app utilizzabile per questo canale (propria o globale)?
export function attivo(login) { const c = credenziali(login); return !!(c.clientId && c.clientSecret); }
// Lo streamer ha impostato le PROPRIE credenziali?
export function haConfigProprio(login) { return !!credenziali(login).proprio; }
export function collegato(login) { const t = spotifyTokens.get(login); return !!(t?.refresh); }
export function salvaConfig(login, clientId, clientSecret) {
  spotifyTokens.setConfig(login, { clientId: String(clientId || '').trim(), clientSecret: String(clientSecret || '').trim() });
}
export function scollega(login) { spotifyTokens.scollega(login); }

// URL a cui mandare il browser dello streamer per autorizzare (con `state`).
export function urlAutorizzazione(login, state) {
  const c = credenziali(login);
  const p = new URLSearchParams({
    client_id: c.clientId,
    response_type: 'code',
    redirect_uri: config.spotify.redirectUri,
    scope: SCOPES,
    state,
  });
  return `${ACCOUNTS}/authorize?${p.toString()}`;
}

async function tokenCall(login, params) {
  const c = credenziali(login);
  if (!c.clientId || !c.clientSecret) return null;
  try {
    const r = await fetch(`${ACCOUNTS}/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${c.clientId}:${c.clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams(params),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) { log.warn('token:', j?.error || r.status); return null; }
    return j;
  } catch (e) { log.warn('token: irraggiungibile', e?.message || e); return null; }
}

// Scambia il `code` dell'OAuth e salva i token per il canale. true/false.
export async function collega(login, code) {
  const j = await tokenCall(login, { grant_type: 'authorization_code', code, redirect_uri: config.spotify.redirectUri });
  if (!j?.access_token) return false;
  spotifyTokens.set(login, { access: j.access_token, refresh: j.refresh_token || '', scadenza: Date.now() + (j.expires_in || 3600) * 1000 });
  return true;
}

// Access token valido (rinfrescato se scaduto). null se non collegato/errore.
async function tokenValido(login) {
  const t = spotifyTokens.get(login);
  if (!t?.refresh) return null;
  if (t.access && (t.scadenza - 30000) > Date.now()) return t.access;
  const j = await tokenCall(login, { grant_type: 'refresh_token', refresh_token: t.refresh });
  if (!j?.access_token) return null;
  spotifyTokens.set(login, { access: j.access_token, refresh: j.refresh_token || t.refresh, scadenza: Date.now() + (j.expires_in || 3600) * 1000 });
  return j.access_token;
}

async function apiCall(login, method, path, { query, body } = {}) {
  const tok = await tokenValido(login);
  if (!tok) return { ok: false, status: 401 };
  let url = API + path;
  if (query) url += '?' + new URLSearchParams(query).toString();
  try {
    const r = await fetch(url, {
      method,
      headers: { Authorization: 'Bearer ' + tok, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let dati = null;
    try { dati = r.status === 204 ? null : await r.json(); } catch { /* niente */ }
    return { ok: r.ok, status: r.status, dati };
  } catch (e) { log.warn('api: irraggiungibile', e?.message || e); return { ok: false, status: 0 }; }
}

// Cerca un brano → { uri, nome, artisti } o null.
export async function cerca(login, q) {
  const r = await apiCall(login, 'GET', '/search', { query: { q, type: 'track', limit: 1 } });
  const t = r.dati?.tracks?.items?.[0];
  return t ? { uri: t.uri, nome: t.name, artisti: (t.artists || []).map((a) => a.name).join(', ') } : null;
}

// Aggiunge un brano (uri) alla coda del broadcaster. { ok, status }.
export async function aggiungiInCoda(login, uri) {
  const r = await apiCall(login, 'POST', '/me/player/queue', { query: { uri } });
  return { ok: r.ok, status: r.status };   // 404 = nessun dispositivo Spotify attivo
}

// Brano in riproduzione → { nome, artisti } o null.
export async function inRiproduzione(login) {
  const r = await apiCall(login, 'GET', '/me/player/currently-playing');
  const t = r.dati?.item;
  return t ? { nome: t.name, artisti: (t.artists || []).map((a) => a.name).join(', ') } : null;
}
