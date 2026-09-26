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
// Chi sei e le modifiche al set passano da GraphQL v4, la stessa porta che usa
// il sito di 7TV. La v3 a una modifica non autorizzata risponde `emoteSet: null`
// SENZA errori: letta come «fatto», diceva aggiunta un'emote mai aggiunta.
const GQL4 = 'https://7tv.io/v4/gql';
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

// POST GraphQL (v3 o v4). `token` opzionale (serve per chi-sei e per le
// modifiche). Ritorna { data } | { errore, status } senza mai lanciare.
async function gql(url, query, variables, token) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
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
      const codice = j.errors.map((e) => e?.extensions?.code).filter(Boolean).join(' ');
      return { errore: msg, codice, status: r.status };
    }
    if (!r.ok || !j?.data) return { errore: 'HTTP ' + r.status, status: r.status };
    return { data: j.data };
  } catch (e) { log.warn('gql:', e?.message || e); return { errore: 'irraggiungibile', status: 0 }; }
  finally { clearTimeout(to); }
}

// 7TV non riconosce il token, o chi l'ha dato non puo' toccare quel set: in
// tutti e due i casi il rimedio e' lo stesso, ricollegare l'account giusto.
const NON_RICONOSCE = /not logged in|unauthori[sz]ed|unauthenticated|forbidden|permission|auth|token|login/i;
function daRicollegare(r) {
  return r.status === 401 || r.status === 403 || NON_RICONOSCE.test(`${r.errore || ''} ${r.codice || ''}`);
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

// Chi e' il padrone di questo token, secondo 7TV, e quali set puo' cambiare.
// Ritorna { id, username, modificabili:[setId] } | { sconosciuto:true } |
// { errore } (7TV non ha risposto: non si sa, quindi non si decide niente).
const Q_IO = `query Io { users { me { id editableEmoteSetIds mainConnection { platformUsername } } } }`;
async function chiSono(token) {
  const r = await gql(GQL4, Q_IO, {}, token);
  if (r.errore) return daRicollegare(r) ? { sconosciuto: true } : { errore: r.errore };
  const me = r.data?.users?.me;
  if (!me?.id) return { sconosciuto: true };
  return {
    id: String(me.id),
    username: String(me.mainConnection?.platformUsername || ''),
    modificabili: (Array.isArray(me.editableEmoteSetIds) ? me.editableEmoteSetIds : []).map(String),
  };
}

// Toglie quello che si porta dietro chi copia il token dagli strumenti del
// browser: il «Bearer » dell'intestazione, le virgolette, gli spazi.
export function pulisciToken(testo) {
  return String(testo || '').trim().replace(/^authorization:\s*/i, '').replace(/^bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
}

// Collega l'account 7TV dello streamer. «Collegato» vuol dire che 7TV ha
// riconosciuto il token E che quel token puo' cambiare il set del canale: il
// padrone del set, o un suo editor. Detto da 7TV adesso, non supposto.
// Ritorna { ok, username } | { ok:false, motivo }.
export async function collega(helix, login, token) {
  const tok = pulisciToken(token);
  if (!decodeJwt(tok)) return { ok: false, motivo: 'Il token non ha la forma giusta, o è scaduto' };
  const dati = await risolviDaTwitch(helix, login);
  if (!dati) return { ok: false, motivo: 'Non trovo il tuo account 7TV: collega prima 7TV al tuo Twitch' };
  if (!dati.setId) return { ok: false, motivo: 'Sul tuo canale 7TV non c\'è un set di emote attivo' };
  const io = await chiSono(tok);
  if (io.errore) return { ok: false, motivo: '7TV non risponde adesso: riprova fra un momento' };
  if (io.sconosciuto) return { ok: false, motivo: '7TV non riconosce questo token: rientra su 7tv.app e copialo di nuovo' };
  const puo = (dati.userId && io.id === dati.userId) || io.modificabili.includes(dati.setId);
  if (!puo) {
    const chi = io.username ? `dell'account 7TV @${io.username}` : 'di un altro account 7TV';
    return { ok: false, motivo: `Questo token è ${chi}, che non può cambiare le emote del tuo canale` };
  }
  seventvTokens.set(login, { token: tok, userId: io.id, username: io.username || dati.username, setId: dati.setId });
  invalidaCacheEmote(login);
  return { ok: true, username: io.username || dati.username };
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
  const r = await gql(GQL, Q_CERCA, {
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
// Le tre modifiche, scritte come le scrive il sito di 7TV. Un'emote nel set e'
// { emoteId, alias }: per togliere o rinominare si passa l'alias che ha nel
// set, cosi' si tocca proprio quella voce.
const M_SET = {
  ADD: `mutation AddEmoteToSet($setId: Id!, $emote: EmoteSetEmoteId!) {
  emoteSets { emoteSet(id: $setId) { addEmote(id: $emote) { id } } }
}`,
  REMOVE: `mutation RemoveEmoteFromSet($setId: Id!, $emote: EmoteSetEmoteId!) {
  emoteSets { emoteSet(id: $setId) { removeEmote(id: $emote) { id } } }
}`,
  RENAME: `mutation RenameEmoteInSet($setId: Id!, $emote: EmoteSetEmoteId!, $alias: String!) {
  emoteSets { emoteSet(id: $setId) { updateEmoteAlias(id: $emote, alias: $alias) { id alias } } }
}`,
};

// «Fatto» e' quello che 7TV restituisce, non l'assenza di proteste: il set su
// cui ha lavorato (aggiungi, togli) o la voce col nome nuovo (rinomina).
export function esitoModifica(azione, data, setId, alias) {
  const op = data?.emoteSets?.emoteSet;
  if (azione === 'ADD') return String(op?.addEmote?.id || '') === setId;
  if (azione === 'REMOVE') return String(op?.removeEmote?.id || '') === setId;
  if (azione === 'RENAME') return String(op?.updateEmoteAlias?.alias || '') === alias;
  return false;
}

const MOTIVO_RICOLLEGA = '7TV non accetta più il token collegato: scollega 7TV e ricollegalo con un token nuovo';

// Applica un'azione (ADD | REMOVE | RENAME) sull'emote-set attivo del canale.
// `alias`: per ADD il nome da dare (facoltativo), per REMOVE e RENAME il nome
// che l'emote ha adesso nel set. `nuovo`: solo per RENAME.
async function cambia(helix, login, azione, emoteId, alias, nuovo) {
  const t = seventvTokens.get(login);
  if (!t?.token) return { ok: false, motivo: 'Collega prima il tuo account 7TV' };
  const eid = estraiId(emoteId);
  if (!eid) return { ok: false, motivo: 'Non riconosco questa emote: incolla il link o l\'id di 7TV' };
  let setId = t.set_id || '';
  if (!ID_RE.test(String(setId))) {
    const d = await risolviDaTwitch(helix, login);
    setId = d?.setId || '';
    if (setId) seventvTokens.set(login, { setId });
  }
  if (!ID_RE.test(String(setId))) return { ok: false, motivo: 'Non trovo il set di emote del tuo canale su 7TV' };
  const emote = { emoteId: eid };
  const a = String(alias || '').trim().slice(0, 100);
  if (a) emote.alias = a;
  const vars = { setId, emote };
  if (azione === 'RENAME') vars.alias = String(nuovo || '').trim().slice(0, 100);
  const r = await gql(GQL4, M_SET[azione], vars, t.token);
  if (r.errore) {
    if (daRicollegare(r)) return { ok: false, motivo: MOTIVO_RICOLLEGA, scaduto: true };
    return { ok: false, motivo: '7TV dice: ' + r.errore };
  }
  if (!esitoModifica(azione, r.data, setId, vars.alias)) return { ok: false, motivo: '7TV non ha fatto la modifica' };
  invalidaCacheEmote(login);
  return { ok: true };
}

export function aggiungi(helix, login, emoteId, alias) {
  return cambia(helix, login, 'ADD', emoteId, alias, null);
}
export function rimuovi(helix, login, emoteId, alias) {
  return cambia(helix, login, 'REMOVE', emoteId, alias, null);
}
export function rinomina(helix, login, emoteId, nome, alias) {
  const n = String(nome || '').trim();
  if (!n) return Promise.resolve({ ok: false, motivo: 'Scrivi il nuovo nome' });
  return cambia(helix, login, 'RENAME', emoteId, alias, n);
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
  if (!t?.token) return { ok: false, motivo: 'Collega prima il tuo account 7TV' };
  const n = String(nome || '').trim().replace(/\s+/g, '');
  if (n.length < 2) return { ok: false, motivo: 'Il nome è troppo corto: almeno 2 caratteri' };
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
    if (!id) return { ok: false, motivo: 'Caricata, ma 7TV non ha detto quale id le ha dato' };
    return { ok: true, id, nome: n };
  } catch (e) { log.warn('caricaEmote:', e?.message || e); return { ok: false, motivo: '7TV non risponde adesso: riprova fra un momento' }; }
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
