// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
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

// NIENTE ASPETTA PER SEMPRE, NIENTE INSISTE (docs/OVERLAY.md, «Il player non si
// blocca»):
//  · ogni chiamata ha un tempo limite: una risposta appesa teneva fermo il
//    player dell'overlay fino a cinque minuti;
//  · un 429 dice quanto aspettare (Retry-After), e si aspetta: il limite e'
//    dell'app, quindi la pausa vale per tutti i canali che usano quell'app.
//    Richiedere subito teneva l'app limitata;
//  · il token si rinnova una volta alla volta: due rinnovi insieme partono
//    dallo stesso token di rinnovo, e se Spotify lo cambia al primo il
//    secondo puo' fallire.
let TEMPO_MAX = 6000;
let ora = () => Date.now();
const fermiFino = new Map();     // app (clientId) → fino a quando Spotify ha chiesto di aspettare
const rinnovi = new Map();       // login → rinnovo del token in corso
export function _prove({ tempoMax, orologio, azzera } = {}) {
  if (tempoMax) TEMPO_MAX = tempoMax;
  if (orologio) ora = orologio;
  if (azzera) { fermiFino.clear(); rinnovi.clear(); battiti.clear(); battitiInVolo.clear(); senzaBattito.clear(); }
}
const limite = () => AbortSignal.timeout(TEMPO_MAX);

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
      signal: limite(),
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
  spotifyTokens.set(login, { access: j.access_token, refresh: j.refresh_token || '', scadenza: ora() + (j.expires_in || 3600) * 1000 });
  return true;
}

// Access token valido (rinfrescato se scaduto). null se non collegato/errore.
async function tokenValido(login) {
  const t = spotifyTokens.get(login);
  if (!t?.refresh) return null;
  if (t.access && (t.scadenza - 30000) > ora()) return t.access;
  let p = rinnovi.get(login);
  if (!p) {
    p = (async () => {
      const j = await tokenCall(login, { grant_type: 'refresh_token', refresh_token: t.refresh });
      if (!j?.access_token) return null;
      spotifyTokens.set(login, { access: j.access_token, refresh: j.refresh_token || t.refresh, scadenza: ora() + (j.expires_in || 3600) * 1000 });
      return j.access_token;
    })().finally(() => rinnovi.delete(login));
    rinnovi.set(login, p);
  }
  return p;
}

async function apiCall(login, method, path, { query, body } = {}) {
  const app = credenziali(login).clientId || '';
  if ((fermiFino.get(app) || 0) > ora()) return { ok: false, status: 429 };
  const tok = await tokenValido(login);
  if (!tok) return { ok: false, status: 401 };
  let url = API + path;
  if (query) url += '?' + new URLSearchParams(query).toString();
  try {
    const r = await fetch(url, {
      method,
      signal: limite(),
      headers: { Authorization: 'Bearer ' + tok, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 429) {
      const s = Number(r.headers?.get?.('retry-after'));
      const ms = Math.min(10 * 60_000, Math.max(1000, (Number.isFinite(s) && s > 0 ? s : 5) * 1000));
      fermiFino.set(app, ora() + ms);
      log.warn(`Spotify chiede di aspettare ${Math.round(ms / 1000)} s`);
    }
    let dati = null;
    try { dati = r.status === 204 ? null : await r.json(); } catch { /* niente */ }
    return { ok: r.ok, status: r.status, dati };
  } catch (e) { log.warn('api: irraggiungibile', e?.message || e); return { ok: false, status: 0 }; }
}

// normalizza per confrontare titolo/artista con la richiesta (via parentesi e
// punteggiatura): "Flowers (Demo)" ~ "flowers".
function normM(s) {
  return String(s || '').toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// Sceglie il brano che l'utente INTENDEVA davvero tra i risultati Spotify: non
// sempre è il primo (spesso escono karaoke/cover/tributi con lo stesso titolo).
// Punteggio: titolo citato nella richiesta > artista citato > popolarità.
function scegliMigliore(items, q) {
  if (!Array.isArray(items) || !items.length) return null;
  const nq = normM(q);
  let best = items[0], bestScore = -Infinity;
  for (const t of items) {
    const nome = normM(t.name);
    const artisti = (t.artists || []).map((a) => normM(a.name));
    let score = Number(t.popularity) || 0;                       // 0..100
    if (nome && nq.includes(nome)) score += 250;                 // il titolo compare nella richiesta
    if (artisti.some((a) => a && nq.includes(a))) score += 150;  // anche l'artista citato
    if (/karaoke|tribute|cover|made famous|originally performed/i.test(t.name)) score -= 300;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

// Cerca un brano → { uri, nome, artisti } o null. NB: niente market=from_token —
// Spotify l'ha DEPRECATO e ora la ricerca risponde 400 (Invalid market), quindi
// non trovava PIÙ nulla. La scelta del brano giusto la fa già scegliMigliore().
export async function cerca(login, q) {
  const r = await apiCall(login, 'GET', '/search', { query: { q, type: 'track', limit: 6 } });
  const t = scegliMigliore(r.dati?.tracks?.items || [], q);
  return t ? { uri: t.uri, nome: t.name, artisti: (t.artists || []).map((a) => a.name).join(', ') } : null;
}

// Cerca PIÙ brani → array di { uri, nome, artisti, artista1 } (max n). Serve a
// disambiguare quando più canzoni hanno lo stesso titolo ("intendi 1, 2 o 3?").
export async function cercaMulti(login, q, n = 5) {
  const lim = Math.max(1, Math.min(10, Math.round(Number(n)) || 5));
  const r = await apiCall(login, 'GET', '/search', { query: { q, type: 'track', limit: lim } });
  const items = r.dati?.tracks?.items || [];
  return items.map((t) => ({
    uri: t.uri,
    nome: t.name,
    artisti: (t.artists || []).map((a) => a.name).join(', '),
    artista1: t.artists?.[0]?.name || '',
  }));
}

// Aggiunge un brano (uri) alla coda del broadcaster. { ok, status }.
export async function aggiungiInCoda(login, uri) {
  const r = await apiCall(login, 'POST', '/me/player/queue', { query: { uri } });
  return { ok: r.ok, status: r.status };   // 404 = nessun dispositivo Spotify attivo
}

// Quello che sta suonando, per intero: serve al player dell'overlay, che oltre
// al titolo vuole la copertina e a che punto e'. Ritorna sempre un oggetto —
// { suona: false } quando non c'e' niente in riproduzione — cosi' chi lo usa
// non deve distinguere «non collegato» da «musica ferma»: sono la stessa cosa
// per chi guarda lo schermo.
export async function oraSuona(login) {
  const r = await apiCall(login, 'GET', '/me/player/currently-playing');
  // Un 429, un token in rinnovo o la rete che sbatte NON vogliono dire «non c'e'
  // musica»: vogliono dire che non lo sappiamo. Confonderli spegneva il player
  // mentre la canzone andava.
  if (!r.ok && r.status !== 204) return { stato: 'ignoto', suona: false };
  const t = r.dati?.item;
  if (!t) return { stato: 'niente', suona: false };
  const cover = (t.album?.images || []);
  const piccola = cover.length ? (cover[cover.length - 1].url || cover[0].url) : '';
  const grande = cover.length ? (cover[0].url || '') : '';
  const suona = r.dati?.is_playing !== false;
  return {
    stato: suona ? 'suona' : 'pausa',
    suona,
    id: t.id || '',
    nome: t.name,
    artisti: (t.artists || []).map((a) => a.name).join(', '),
    album: t.album?.name || '',
    copertina: piccola,
    copertinaGrande: grande,
    ms: Math.max(0, Number(r.dati?.progress_ms) || 0),
    durata: Math.max(0, Number(t.duration_ms) || 0),
  };
}

// Il BATTITO del brano. Serve a far ballare il player a tempo con quello che
// suona davvero, invece che a una velocita' inventata: il tempo (BPM) e
// l'energia vengono da Spotify, e la FASE si ricava da dove sei nella canzone.
// Se Spotify non lo da' (l'endpoint non e' garantito a tutte le app), si torna
// null e il player balla come prima: mai un errore a schermo per questo.
//
// Si ricorda solo una risposta certa: un brano che ha il battito, o uno che
// Spotify dice di non avere. Un intoppo (rete, 429) non lascia quel brano senza
// battito per sempre. E se Spotify dice che quest'app il battito non lo puo'
// leggere (403: le app nuove non hanno /audio-features), non si chiede piu'
// per un giorno: sarebbe una chiamata buttata a ogni canzone.
const battiti = new Map();
const battitiInVolo = new Map();
const senzaBattito = new Map();   // app → fino a quando non chiederlo
export function battito(login, idBrano) {
  const id = String(idBrano || '');
  if (!id) return Promise.resolve(null);
  const c = battiti.get(id);
  if (c !== undefined) return Promise.resolve(c);
  const app = credenziali(login).clientId || '';
  if ((senzaBattito.get(app) || 0) > ora()) return Promise.resolve(null);
  let p = battitiInVolo.get(id);
  if (p) return p;
  p = (async () => {
    const r = await apiCall(login, 'GET', '/audio-features/' + encodeURIComponent(id));
    if (r.status === 403 || r.status === 401) { if (r.status === 403) senzaBattito.set(app, ora() + 86_400_000); return null; }
    const d = r.dati;
    if (r.ok && d && Number(d.tempo) > 0) {
      const fuori = { bpm: Math.round(Number(d.tempo)), energia: Math.max(0, Math.min(1, Number(d.energy) || 0.5)) };
      if (battiti.size > 300) battiti.clear();
      battiti.set(id, fuori);
      return fuori;
    }
    if (r.ok || r.status === 404) battiti.set(id, null);
    return null;
  })().catch(() => null).finally(() => battitiInVolo.delete(id));
  battitiInVolo.set(id, p);
  return p;
}

// Il brano di adesso per !song: anche in pausa e' quello che stai ascoltando.
export async function inRiproduzione(login) {
  const d = await oraSuona(login);
  return (d.stato === 'suona' || d.stato === 'pausa') ? { nome: d.nome, artisti: d.artisti } : null;
}
