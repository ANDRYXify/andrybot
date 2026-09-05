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
