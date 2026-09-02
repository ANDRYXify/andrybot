// LE CHIAMATE A KICK, e il rinnovo dei token.
//
// I token di ogni streamer stanno nella STESSA tabella di quelli Twitch, con
// kind='kick': così sono cifrati a riposo dalla stessa strada già provata, e
// l'esportazione dei dati li esclude già senza dover ricordarsene.
//
// Il rinnovo è al centro: un token Kick scade, e se scade mentre lo streamer è
// in diretta il bot ammutolisce senza dire niente. Si rinnova PRIMA della
// scadenza, e una sola volta anche se dieci messaggi partono insieme.
import { tokens } from '../db.js';
import { makeLog } from '../logger.js';
import { rinnova, daRinnovare } from './auth.js';
import { segna } from './eco.js';

const log = makeLog('kick');
const API = 'https://api.kick.com/public/v1';
export const KIND = 'kick';

// Un rinnovo alla volta per streamer: dieci messaggi insieme non devono
// diventare dieci rinnovi (Kick invaliderebbe i precedenti e resteremmo fuori).
const _inCorso = new Map();

export function tokenDi(login) { return tokens.get(KIND, String(login).toLowerCase()); }
export function salvaToken(login, t, userId = '') {
  tokens.save(KIND, String(login).toLowerCase(), { ...t, userId: String(userId || tokenDi(login)?.userId || '') });
}
export function scollega(login) { tokens.delete(KIND, String(login).toLowerCase()); }
// Di chi è il canale Kick con questo id: lo chiede il webhook a ogni evento.
export function loginPerKickId(userId) { return tokens.loginPerUserId(KIND, userId); }
export function collegati() { return tokens.logins(KIND); }

// Il token buono per questo streamer, rinnovato se serve. null se non collegato
// o se il rinnovo è fallito (in quel caso lo streamer deve ricollegare).
export async function tokenBuono(login, { fetchImpl = fetch, ora = Date.now() } = {}) {
  const chi = String(login).toLowerCase();
  const t = tokenDi(chi);
  if (!t?.accessToken) return null;
  if (!daRinnovare(t, ora)) return t;
  if (!t.refreshToken) return t;              // niente refresh: si prova finché Kick non protesta

  if (_inCorso.has(chi)) return _inCorso.get(chi);
  const p = (async () => {
    try {
      const nuovo = await rinnova(t.refreshToken, { fetchImpl });
      salvaToken(chi, nuovo, t.userId);
      log.info(`@${chi}: token Kick rinnovato`);
      return nuovo;
    } catch (e) {
      log.error(`@${chi}: rinnovo del token Kick fallito, deve ricollegare — ${e?.message || e}`);
      return null;
    } finally {
      _inCorso.delete(chi);
    }
  })();
  _inCorso.set(chi, p);
  return p;
}

async function chiama(login, percorso, { metodo = 'GET', corpo = null, query = null, fetchImpl = fetch } = {}) {
  const t = await tokenBuono(login, { fetchImpl });
  if (!t?.accessToken) return { ok: false, errore: 'account Kick non collegato (o da ricollegare)' };
  const url = API + percorso + (query ? '?' + new URLSearchParams(query) : '');
  try {
    const r = await fetchImpl(url, {
      method: metodo,
      headers: {
        authorization: 'Bearer ' + t.accessToken,
        accept: 'application/json',
        ...(corpo ? { 'content-type': 'application/json' } : {}),
      },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    });
    if (r.status === 204) return { ok: true, dati: null };
    const testo = await r.text().catch(() => '');
    let j = null; try { j = testo ? JSON.parse(testo) : null; } catch { /* non JSON */ }
    if (!r.ok) return { ok: false, stato: r.status, errore: j?.message || testo.slice(0, 200) || ('HTTP ' + r.status) };
    return { ok: true, dati: j?.data ?? j };
  } catch (e) {
    return { ok: false, errore: e?.message || String(e) };
  }
}

// CHI HA APPENA AUTORIZZATO, con il token in mano e basta.
//
// Serve alla registrazione: in quel momento non esiste ancora un canale nostro
// sotto cui cercare il token, quindi non si puo' passare dalla strada normale.
// E' la stessa chiamata, con il token dato invece che ripescato.
export async function chiSono(accessToken, { fetchImpl = fetch } = {}) {
  const tok = String(accessToken || '');
  if (!tok) return { ok: false, errore: 'nessun token' };
  try {
    const r = await fetchImpl(API + '/users', {
      headers: { authorization: 'Bearer ' + tok, accept: 'application/json' },
    });
    const testo = await r.text().catch(() => '');
    let j = null; try { j = testo ? JSON.parse(testo) : null; } catch { /* non JSON */ }
    if (!r.ok) return { ok: false, stato: r.status, errore: j?.message || testo.slice(0, 200) || ('HTTP ' + r.status) };
    const dati = j?.data ?? j;
    const u = Array.isArray(dati) ? dati[0] : dati;
    const userId = String(u?.user_id ?? '');
    if (!userId) return { ok: false, errore: 'Kick non ha detto chi sei' };
    return { ok: true, userId, nome: String(u?.name || u?.username || '') };
  } catch (e) {
    return { ok: false, errore: e?.message || String(e) };
  }
}

// Chi ha autorizzato: serve a legare il canale Kick allo streamer da noi.
export async function ioSuKick(login, opts) {
  const r = await chiama(login, '/users', opts);
  if (!r.ok) return r;
  const u = Array.isArray(r.dati) ? r.dati[0] : r.dati;
  return { ok: true, userId: String(u?.user_id ?? ''), nome: String(u?.name || u?.username || '') };
}

// Manda un messaggio in chat. Kick taglia a 500 caratteri: lo facciamo noi,
// così il messaggio arriva accorciato invece di essere rifiutato.
export const MAX_TESTO = 500;
export async function scrivi(login, testo, { comeBot = true, broadcasterUserId = '', rispondiA = '', ...opts } = {}) {
  const t = String(testo ?? '').trim();
  if (!t) return { ok: false, errore: 'messaggio vuoto' };
  const corpo = { content: t.slice(0, MAX_TESTO), type: comeBot ? 'bot' : 'user' };
  if (!comeBot && broadcasterUserId) corpo.broadcaster_user_id = Number(broadcasterUserId);
  if (rispondiA) corpo.reply_to_message_id = String(rispondiA);
  // Si segna PRIMA di mandare: l'evento puo' tornare indietro prima che questa
  // chiamata abbia finito, e a quel punto sarebbe gia' troppo tardi.
  segna(login, corpo.content);
  return chiama(login, '/chat', { metodo: 'POST', corpo, ...opts });
}

// Gli eventi che vogliamo ricevere sul webhook. La chat è il cuore; gli altri
// alimentano alert e moduli che già esistono.
export const EVENTI = [
  { name: 'chat.message.sent', version: 1 },
  { name: 'channel.followed', version: 1 },
  { name: 'channel.subscription.new', version: 1 },
  { name: 'channel.subscription.renewal', version: 1 },
  { name: 'channel.subscription.gifts', version: 1 },
  { name: 'livestream.status.updated', version: 1 },
];

export function iscrivi(login, opts) {
  return chiama(login, '/events/subscriptions', {
    metodo: 'POST', corpo: { events: EVENTI, method: 'webhook' }, ...opts,
  });
}
export function iscrizioni(login, opts) {
  return chiama(login, '/events/subscriptions', opts);
}
export async function disiscrivi(login, ids, opts) {
  const lista = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  if (!lista.length) return { ok: true, dati: null };
  const q = new URLSearchParams();
  for (const id of lista) q.append('id', String(id));
  return chiama(login, '/events/subscriptions?' + q.toString(), { metodo: 'DELETE', ...opts });
}
