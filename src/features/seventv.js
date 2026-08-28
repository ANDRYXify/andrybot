// 7TV a 360°: gestione COMPLETA delle emote del canale dal bot.
//
// A differenza di features/emotes.js (che LEGGE soltanto, per mostrare le emote
// nell'overlay chat), qui SCRIVIAMO: aggiungere, togliere e rinominare le emote
// del set attivo del canale su 7TV. Per farlo serve il token del PROPRIO account
// 7TV dello streamer (un JWT che si copia da 7tv.app): è lui il proprietario del
// suo emote-set, quindi può modificarlo.
//
// Sicurezza: parliamo SOLO con host 7TV fissi (7tv.io / cdn.7tv.app). Gli unici
// dati variabili sono l'id numerico Twitch, gli id 7TV (validati per formato) e
// la query di ricerca. Nessun URL arbitrario → nessun rischio SSRF. Il token
// resta sul server (mai esposto al browser). Timeout e tetti a prova di abuso.
import { seventvTokens } from '../db.js';
import { invalida as invalidaCacheEmote } from './emotes.js';
import { makeLog } from '../logger.js';

const log = makeLog('7tv');

const GQL = 'https://7tv.io/v3/gql';
const REST = 'https://7tv.io/v3';
// Le emote NUOVE non si creano piu' da GraphQL: 7TV ha tolto createEmote dallo
// schema v3 e non l'ha rimesso in v4. La porta di oggi e' REST v4.
const REST4 = 'https://7tv.io/v4';
const CDN = 'https://cdn.7tv.app';
const TIMEOUT_MS = 8000;
const MAX_BYTES = 8 * 1024 * 1024;
// id 7TV (ObjectID esadecimale o ULID): alfanumerico, lunghezza tipica 24-26.
const ID_RE = /^[A-Za-z0-9]{20,32}$/;

// URL dell'immagine di un'emote dalla CDN 7TV (2x webp: buon peso/qualità).
export function urlEmote(id) { return `${CDN}/emote/${id}/2x.webp`; }

// Estrae l'id di un'emote da un id "nudo" o da un link 7tv.app / cdn.7tv.app.
export function estraiId(testo) {
  const s = String(testo || '').trim();
  if (ID_RE.test(s)) return s;
  const m = s.match(/(?:emotes?|emote)\/([A-Za-z0-9]{20,32})/);
  if (m && ID_RE.test(m[1])) return m[1];
  return null;
}

// ─────────────────────────────────────────────────────────────── HTTP di base
async function getJson(url) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'SocialBot/1.0' }, signal: ac.signal });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) return null;
    try { return JSON.parse(buf.toString('utf8')); } catch { return null; }
  } catch { return null; } finally { clearTimeout(to); }
}

// POST GraphQL. `token` opzionale (serve per le mutation). Ritorna { data } |
// { errore } senza mai lanciare.
async function gql(query, variables, token) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(GQL, {
      method: 'POST',
      signal: ac.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'SocialBot/1.0',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
    const j = await r.json().catch(() => null);
    if (j?.errors?.length) {
      const msg = j.errors.map((e) => e?.message).filter(Boolean).join('; ') || 'errore 7TV';
      return { errore: msg, status: r.status };
    }
    if (!r.ok || !j?.data) return { errore: 'HTTP ' + r.status, status: r.status };
    return { data: j.data };
  } catch (e) { log.warn('gql:', e?.message || e); return { errore: 'irraggiungibile', status: 0 }; }
  finally { clearTimeout(to); }
}

// ───────────────────────────────────────────────────────── collegamento (token)
// Controlla che il testo sembri un JWT valido e non scaduto (senza verificarne
// la firma: quella la verifica 7TV). Ritorna il payload decodificato o null.
function decodeJwt(token) {
  const parti = String(token || '').split('.');
  if (parti.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parti[1], 'base64url').toString('utf8'));
    if (payload?.exp && Number(payload.exp) * 1000 < Date.now()) return null;   // scaduto
    return payload;
  } catch { return null; }
}

export function collegato(login) { return !!seventvTokens.get(login)?.token; }

// Dati per la UI (mai il token): @username 7TV e id del set, se collegato.
export function datiCollegamento(login) {
  const t = seventvTokens.get(login);
  return t?.token ? { username: t.username || '', userId: t.user_id || '', setId: t.set_id || '' } : null;
}

export function scollega(login) { seventvTokens.scollega(login); }

// Risolve l'account 7TV del canale dal suo id Twitch (endpoint pubblico, come
// features/emotes.js). Ritorna { userId, username, setId, setNome } | null.
async function risolviDaTwitch(helix, login) {
  try {
    const u = await helix?.getUserByLogin?.(String(login).toLowerCase());
    const id = u?.id;
    if (!id || !/^\d+$/.test(String(id))) return null;
    const j = await getJson(`${REST}/users/twitch/${encodeURIComponent(id)}`);
    const setId = j?.emote_set?.id || j?.emote_set_id || '';
    return {
      userId: j?.user?.id || '',
      username: j?.user?.username || j?.user?.display_name || '',
      setId: ID_RE.test(String(setId)) ? String(setId) : '',
      setNome: j?.emote_set?.name || '',
    };
  } catch (e) { log.debug(`risolviDaTwitch #${login}:`, e?.message || e); return null; }
}

// Collega l'account 7TV dello streamer salvando il token e risolvendo il suo
// emote-set attivo. Ritorna { ok, username } | { ok:false, motivo }.
export async function collega(helix, login, token) {
  const tok = String(token || '').trim();
  if (!decodeJwt(tok)) return { ok: false, motivo: 'token non valido o scaduto' };
  const dati = await risolviDaTwitch(helix, login);
  if (!dati) return { ok: false, motivo: 'non riesco a trovare il tuo account 7TV (collega prima 7TV al tuo Twitch)' };
  if (!dati.setId) return { ok: false, motivo: 'nessun emote-set attivo trovato sul tuo canale 7TV' };
  seventvTokens.set(login, { token: tok, userId: dati.userId, username: dati.username, setId: dati.setId });
  invalidaCacheEmote(login);
  return { ok: true, username: dati.username };
}

// ─────────────────────────────────────────────────────────── set attivo (read)
// Emote del set attivo del canale: sempre leggibili (endpoint pubblico). Ritorna
// { id, nome, capienza, usate, emotes:[{id,nome,url,animato}] } | null.
export async function setAttivo(helix, login) {
  const t = seventvTokens.get(login);
  let setId = t?.set_id || '';
  if (!ID_RE.test(String(setId))) {
    const d = await risolviDaTwitch(helix, login);
    setId = d?.setId || '';
    if (setId && t?.token) seventvTokens.set(login, { setId });   // aggiorna se cambiato
  }
  if (!ID_RE.test(String(setId))) return null;
  const j = await getJson(`${REST}/emote-sets/${encodeURIComponent(setId)}`);
  if (!j) return null;
  const emotes = Array.isArray(j.emotes) ? j.emotes : [];
  const lista = [];
  for (const e of emotes) {
    const id = e?.id || e?.data?.id;
    const nome = e?.name;
    if (!id || !nome || !ID_RE.test(String(id))) continue;
    lista.push({ id: String(id), nome: String(nome), url: urlEmote(id), animato: !!(e?.data?.animated) });
    if (lista.length >= 2000) break;
  }
  return { id: setId, nome: j.name || '', capienza: Number(j.capacity) || 0, usate: Number(j.emote_count) || lista.length, emotes: lista };
}

// ─────────────────────────────────────────────────────────────── ricerca (GQL)
const Q_CERCA = `query SearchEmotes($query: String!, $page: Int, $limit: Int, $filter: EmoteSearchFilter) {
  emotes(query: $query, page: $page, limit: $limit, filter: $filter, sort: { value: "popularity", order: DESCENDING }) {
    count
    items { id name animated listed owner { username display_name } }
  }
}`;

// Cerca emote nella directory pubblica 7TV. Ritorna { items:[{id,nome,url,animato,autore}] } | { errore }.
export async function cerca(query, page = 1) {
  const q = String(query || '').trim().slice(0, 80);
  if (!q) return { items: [] };
  const r = await gql(Q_CERCA, {
    query: q,
    page: Math.max(1, Math.min(20, Number(page) || 1)),
    limit: 36,
    filter: { category: 'TOP', exact_match: false, case_sensitive: false, ignore_tags: false, zero_width: false, animated: false, aspect_ratio: '' },
  });
  if (r.errore) return { errore: r.errore };
  const items = (r.data?.emotes?.items || []).map((e) => ({
    id: String(e.id), nome: String(e.name || ''), url: urlEmote(e.id),
    animato: !!e.animated, autore: e?.owner?.display_name || e?.owner?.username || '',
  })).filter((e) => ID_RE.test(e.id));
  return { items, totale: Number(r.data?.emotes?.count) || items.length };
}

// ─────────────────────────────────────────────────────────── mutation (scrivi)
const M_CAMBIA = `mutation ChangeEmoteInSet($id: ObjectID!, $action: ListItemAction!, $emote_id: ObjectID!, $name: String) {
  emoteSet(id: $id) { id emotes(id: $emote_id, action: $action, name: $name) { id name } }
}`;

// Applica un'azione (ADD | REMOVE | UPDATE) sull'emote-set attivo del canale.
async function cambia(helix, login, action, emoteId, name) {
  const t = seventvTokens.get(login);
  if (!t?.token) return { ok: false, motivo: 'collega prima il tuo account 7TV' };
  const eid = estraiId(emoteId);
  if (!eid) return { ok: false, motivo: 'id emote non valido' };
  let setId = t.set_id || '';
  if (!ID_RE.test(String(setId))) {
    const d = await risolviDaTwitch(helix, login);
    setId = d?.setId || '';
    if (setId) seventvTokens.set(login, { setId });
  }
  if (!ID_RE.test(String(setId))) return { ok: false, motivo: 'emote-set del canale non trovato' };
  const vars = { id: setId, action, emote_id: eid };
  if (name != null) vars.name = String(name).slice(0, 100);
  const r = await gql(M_CAMBIA, vars, t.token);
  if (r.errore) {
    // 401/403 → token scaduto o senza permessi
    const scaduto = r.status === 401 || r.status === 403 || /auth|permission|token/i.test(r.errore);
    return { ok: false, motivo: r.errore, scaduto };
  }
  invalidaCacheEmote(login);   // l'overlay chat rileggerà le emote aggiornate
  return { ok: true };
}

export function aggiungi(helix, login, emoteId, alias) {
  return cambia(helix, login, 'ADD', emoteId, (alias && String(alias).trim()) || null);
}
export function rimuovi(helix, login, emoteId) {
  return cambia(helix, login, 'REMOVE', emoteId, null);
}
export function rinomina(helix, login, emoteId, nome) {
  const n = String(nome || '').trim();
  if (!n) return Promise.resolve({ ok: false, motivo: 'scrivi il nuovo nome' });
  return cambia(helix, login, 'UPDATE', emoteId, n);
}

// ───────────────────────────────────────────────── carica una NUOVA emote su 7TV
// 7TV ha spostato la creazione delle emote FUORI da GraphQL: `createEmote` non
// esiste piu' nello schema v3 (`Unknown field "createEmote" on type "Mutation"`)
// e non e' mai stata rimessa in v4, dove EmoteMutation espone solo emote(id) e
// emotes(ids) — cioe' modifiche a emote che esistono gia'.
//
// La porta di oggi e' REST: POST /v4/emotes, multipart, due parti —
//   metadata : JSON { name, tags, flags }
//   file     : i byte dell'immagine
// L'ordine conta poco, la parte `metadata` si': senza, 7TV risponde
// 400 "missing metadata" prima ancora di guardare chi sei.
//
// Le operazioni sul SET (aggiungi/togli/rinomina) restano su GraphQL v3, che
// quelle le ha ancora: percio' qui cambia solo la creazione.
// Ritorna { ok, id, nome } | { ok:false, motivo, scaduto }.
export async function caricaEmote(login, bytes, nome, tags = []) {
  const t = seventvTokens.get(login);
  if (!t?.token) return { ok: false, motivo: 'collega prima il tuo account 7TV' };
  const n = String(nome || '').trim().replace(/\s+/g, '');
  if (n.length < 2) return { ok: false, motivo: 'nome troppo corto (min 2 caratteri)' };
  const meta = { name: n.slice(0, 100), tags: (tags || []).slice(0, 6), flags: 0 };
  const fd = new FormData();
  fd.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  fd.append('file', new Blob([bytes], { type: 'image/webp' }), `${n}.webp`);
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 20000);
  try {
    // NIENTE Content-Type manuale: lo imposta FormData col boundary multipart.
    const r = await fetch(`${REST4}/emotes`, {
      method: 'POST',
      signal: ac.signal,
      headers: { Authorization: 'Bearer ' + t.token, Accept: 'application/json', 'User-Agent': 'SocialBot/1.0' },
      body: fd,
    });
    const testo = await r.text().catch(() => '');
    let j = null; try { j = JSON.parse(testo); } catch { }
    if (!r.ok) {
      const m = j?.error || j?.message || j?.errors?.[0]?.message || testo.slice(0, 140) || ('HTTP ' + r.status);
      const scaduto = r.status === 401 || r.status === 403 || /not logged in|auth|token|unauthor|forbidden/i.test(String(m));
      return { ok: false, motivo: String(m), scaduto };
    }
    const id = idNuovaEmote(j);
    if (!id) return { ok: false, motivo: 'caricata, ma 7TV non ha restituito l\'id' };
    return { ok: true, id, nome: n };
  } catch (e) { log.warn('caricaEmote:', e?.message || e); return { ok: false, motivo: 'irraggiungibile' }; }
  finally { clearTimeout(to); }
}

// L'id della nuova emote nella risposta REST: 7TV lo ha messo in punti diversi
// nel tempo (nudo, sotto data, sotto emote). Li guardiamo tutti invece di
// scommettere su uno solo: se cambia ancora, il caricamento non si rompe.
function idNuovaEmote(j) {
  for (const v of [j?.id, j?.emote_id, j?.data?.id, j?.emote?.id, j?.data?.emote?.id]) {
    if (ID_RE.test(String(v || ''))) return String(v);
  }
  return '';
}
