// LE CHIAMATE A YOUTUBE, e il rinnovo dei token.
//
// I token stanno nella STESSA tabella di quelli Twitch e Kick, con
// kind='youtube': così sono cifrati a riposo dalla stessa strada già provata, e
// l'esportazione dei dati li esclude già senza doverselo ricordare.
import { tokens } from '../db.js';
import { makeLog } from '../logger.js';
import { rinnova, daRinnovare, revoca } from './auth.js';

const log = makeLog('youtube');
const API = 'https://www.googleapis.com/youtube/v3';
export const KIND = 'youtube';

// Un rinnovo alla volta per canale: dieci chiamate insieme non devono diventare
// dieci rinnovi.
const _inCorso = new Map();

export function tokenDi(login) { return tokens.get(KIND, String(login).toLowerCase()); }

// Il salvataggio è UN POSTO SOLO, e ricuce il refresh token che Google non
// rimanda quando rinnova. Se ricucire stesse nel chiamante, la prima volta che
// qualcuno salva un token senza passare di qui il collegamento morirebbe alla
// scadenza dopo, e sembrerebbe colpa di Google.
export function salvaToken(login, t, canaleId = '') {
  const chi = String(login).toLowerCase();
  const vecchio = tokenDi(chi);
  tokens.save(KIND, chi, {
    ...t,
    refreshToken: t.refreshToken || vecchio?.refreshToken || '',
    userId: String(canaleId || vecchio?.userId || ''),
  });
}

export async function scollega(login) {
  const chi = String(login).toLowerCase();
  const t = tokenDi(chi);
  tokens.delete(KIND, chi);
  // e anche da casa di Google, così la persona non si ritrova un'app
  // autorizzata che non usa più nessuno.
  if (t?.refreshToken || t?.accessToken) await revoca(t.refreshToken || t.accessToken).catch(() => {});
}

// Di chi è il canale YouTube con questo id.
export function loginPerCanaleId(canaleId) { return tokens.loginPerUserId(KIND, canaleId); }
export function collegati() { return tokens.logins(KIND); }

// Il token buono per questo canale, rinnovato se serve. null se non collegato o
// se il rinnovo è fallito (in quel caso la persona deve ricollegare).
export async function tokenBuono(login, { fetchImpl = fetch, ora = Date.now() } = {}) {
  const chi = String(login).toLowerCase();
  const t = tokenDi(chi);
  if (!t?.accessToken) return null;
  if (!daRinnovare(t, ora)) return t;
  if (!t.refreshToken) return t;              // niente refresh: si prova finché Google non protesta

  if (_inCorso.has(chi)) return _inCorso.get(chi);
  const p = (async () => {
    try {
      const nuovo = await rinnova(t.refreshToken, { fetchImpl });
      salvaToken(chi, nuovo, t.userId);
      log.info(`@${chi}: token YouTube rinnovato`);
      return tokenDi(chi);
    } catch (e) {
      log.error(`@${chi}: rinnovo del token YouTube fallito, deve ricollegare — ${e?.message || e}`);
      return null;
    } finally {
      _inCorso.delete(chi);
    }
  })();
  _inCorso.set(chi, p);
  return p;
}

async function conToken(accessToken, percorso, query, { fetchImpl = fetch } = {}) {
  const tok = String(accessToken || '');
  if (!tok) return { ok: false, errore: 'nessun token' };
  const url = API + percorso + (query ? '?' + new URLSearchParams(query) : '');
  try {
    const r = await fetchImpl(url, { headers: { authorization: 'Bearer ' + tok, accept: 'application/json' } });
    const testo = await r.text().catch(() => '');
    let j = null; try { j = testo ? JSON.parse(testo) : null; } catch { /* non JSON */ }
    if (!r.ok) return { ok: false, stato: r.status, errore: j?.error?.message || testo.slice(0, 200) || ('HTTP ' + r.status) };
    return { ok: true, dati: j };
  } catch (e) {
    return { ok: false, errore: e?.message || String(e) };
  }
}

// Il canale di chi ha appena autorizzato, con il token in mano e basta.
//
// Serve alla registrazione: in quel momento non esiste ancora un canale nostro
// sotto cui cercare il token.
//
// Su YouTube l'account Google e il CANALE non sono la stessa cosa, e un account
// può non averne nessuno: chi ha fatto l'accesso con un Google senza canale
// YouTube arriva qui e la lista torna vuota. Non è un errore di rete, è una
// persona che non ha ciò che serve — e va detto con parole sue.
export async function chiSono(accessToken, opts) {
  const r = await conToken(accessToken, '/channels', { part: 'snippet', mine: 'true' }, opts);
  if (!r.ok) return r;
  const c = (r.dati?.items || [])[0];
  if (!c?.id) return { ok: false, senzaCanale: true, errore: 'questo account Google non ha un canale YouTube' };
  const s = c.snippet || {};
  return {
    ok: true,
    canaleId: String(c.id),
    nome: String(s.title || ''),
    maniglia: String(s.customUrl || '').replace(/^@/, ''),
  };
}

// Lo stesso, per un canale già collegato.
export async function ioSuYoutube(login, opts) {
  const t = await tokenBuono(login, opts);
  if (!t?.accessToken) return { ok: false, errore: 'account YouTube non collegato (o da ricollegare)' };
  return chiSono(t.accessToken, opts);
}

// ── LA CHAT DELLA DIRETTA ────────────────────────────────────────────────────
//
// Su YouTube la chat non e' un posto fisso come su Twitch: nasce e muore con la
// diretta, e si raggiunge solo passando dal `liveChatId` della diretta ATTIVA.
// Quindi il giro e' sempre lo stesso: chiedi qual e' la diretta in corso, e da
// quella prendi l'indirizzo della chat.

async function postConToken(accessToken, percorso, query, corpo, { fetchImpl = fetch } = {}) {
  const tok = String(accessToken || '');
  if (!tok) return { ok: false, errore: 'nessun token' };
  const url = API + percorso + (query ? '?' + new URLSearchParams(query) : '');
  try {
    const r = await fetchImpl(url, {
      method: 'POST',
      headers: { authorization: 'Bearer ' + tok, accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(corpo || {}),
    });
    const testo = await r.text().catch(() => '');
    let j = null; try { j = testo ? JSON.parse(testo) : null; } catch { /* non JSON */ }
    if (!r.ok) return { ok: false, stato: r.status, errore: j?.error?.message || testo.slice(0, 200) || ('HTTP ' + r.status) };
    return { ok: true, dati: j };
  } catch (e) {
    return { ok: false, errore: e?.message || String(e) };
  }
}

// La diretta in corso, se c'e'. `inDiretta: false` non e' un errore: e' la
// risposta normale per chi non sta trasmettendo adesso.
export async function direttaInCorso(login, opts) {
  const t = await tokenBuono(login, opts);
  if (!t?.accessToken) return { ok: false, errore: 'account YouTube non collegato (o da ricollegare)' };
  const r = await conToken(t.accessToken, '/liveBroadcasts',
    { part: 'snippet', broadcastStatus: 'active', broadcastType: 'all', maxResults: '1' }, opts);
  if (!r.ok) return r;
  const b = (r.dati?.items || [])[0];
  if (!b) return { ok: true, inDiretta: false };
  return {
    ok: true,
    inDiretta: true,
    videoId: String(b.id || ''),
    chatId: String(b.snippet?.liveChatId || ''),
    titolo: String(b.snippet?.title || ''),
  };
}

// Un pezzo di chat. `pagina` e' il segnalibro: senza, si riparte dall'inizio e
// si riprocessa tutto quello che era gia' passato. `attesaMs` lo decide YouTube
// e va rispettato: e' lui che sa quanto e' carica la chat in questo momento.
export async function messaggiChat(login, { chatId, pagina = '' } = {}, opts) {
  const t = await tokenBuono(login, opts);
  if (!t?.accessToken) return { ok: false, errore: 'account YouTube non collegato (o da ricollegare)' };
  const q = { part: 'snippet,authorDetails', liveChatId: String(chatId || ''), maxResults: '200' };
  if (pagina) q.pageToken = pagina;
  const r = await conToken(t.accessToken, '/liveChatMessages', q, opts);
  if (!r.ok) return r;
  return {
    ok: true,
    voci: Array.isArray(r.dati?.items) ? r.dati.items : [],
    pagina: String(r.dati?.nextPageToken || ''),
    attesaMs: Math.max(1000, Number(r.dati?.pollingIntervalMillis) || 5000),
  };
}

// Parlare in chat. Serve lo scope `youtube.force-ssl`: chi ha collegato YouTube
// prima che la chat esistesse ha un token senza quel permesso, e Google
// risponde 403. Non e' un guasto, e' un collegamento da rifare — e va detto
// cosi', se no si cerca un guasto che non c'e'.
export async function scriviChat(login, { chatId, testo } = {}, opts) {
  const t = await tokenBuono(login, opts);
  if (!t?.accessToken) return { ok: false, errore: 'account YouTube non collegato (o da ricollegare)' };
  const messaggio = String(testo || '').slice(0, 200);   // YouTube taglia a 200 caratteri
  if (!messaggio.trim()) return { ok: false, errore: 'niente da scrivere' };
  const r = await postConToken(t.accessToken, '/liveChatMessages', { part: 'snippet' }, {
    snippet: {
      liveChatId: String(chatId || ''),
      type: 'textMessageEvent',
      textMessageDetails: { messageText: messaggio },
    },
  }, opts);
  if (!r.ok && r.stato === 403) return { ...r, daRicollegare: true, errore: 'manca il permesso di scrivere in chat: ricollega YouTube' };
  return r;
}

// Da id di canale YouTube a maniglia (@nome). Serve perche' nella chat YouTube
// non manda nessun nome unico: manda un nome VISIBILE, che due persone diverse
// possono avere identico, e un id opaco. L'economia del bot (monete, ore, VIP)
// e' fatta di nomi leggibili, quindi con il solo nome visibile due spettatori
// diversi finirebbero nello stesso portafoglio. La maniglia e' l'unica cosa che
// e' insieme unica e leggibile: si chiede una volta per persona, a cinquanta
// per volta, e si tiene.
const _maniglie = new Map();
const MANIGLIE_MAX = 5000;

export function manigliaNota(canaleId) { return _maniglie.get(String(canaleId || '')) || ''; }

export async function risolviManiglie(login, canaliId, opts) {
  const mancanti = [...new Set((canaliId || []).map(String).filter((x) => x && !_maniglie.has(x)))];
  if (!mancanti.length) return 0;
  const t = await tokenBuono(login, opts);
  if (!t?.accessToken) return 0;
  let presi = 0;
  for (let i = 0; i < mancanti.length; i += 50) {
    const gruppo = mancanti.slice(i, i + 50);
    const r = await conToken(t.accessToken, '/channels', { part: 'snippet', id: gruppo.join(','), maxResults: '50' }, opts);
    if (!r.ok) break;
    for (const c of (r.dati?.items || [])) {
      const m = String(c?.snippet?.customUrl || '').replace(/^@/, '').toLowerCase();
      if (c?.id) { _maniglie.set(String(c.id), m); presi += 1; }
    }
    // chi non torna dalla risposta non ha maniglia: si segna comunque, se no lo
    // si richiede a ogni messaggio per tutta la diretta
    for (const id of gruppo) if (!_maniglie.has(id)) _maniglie.set(id, '');
  }
  while (_maniglie.size > MANIGLIE_MAX) _maniglie.delete(_maniglie.keys().next().value);
  return presi;
}
