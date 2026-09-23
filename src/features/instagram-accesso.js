// COLLEGARE INSTAGRAM CON UN TASTO: l'accesso aziendale di Instagram.
//
// Verificato su developers.facebook.com (Business Login for Instagram,
// settembre 2026). Il giro, per intero:
//   1. lo streamer preme «Collega Instagram» → www.instagram.com/oauth/authorize
//      con l'ID app DI INSTAGRAM (non quello di Meta), i permessi e uno stato.
//      Con force_reauth Instagram chiede sempre con che account entrare: se il
//      browser e' gia' dentro con un altro account, non si collega quello;
//   2. torna qui con un codice valido un'ora → api.instagram.com/oauth/access_token
//      lo cambia con un token corto e l'id DI APP dell'account;
//   3. graph.instagram.com/access_token cambia il corto con uno lungo, 60 giorni;
//   4. /me dice l'id dell'account PROFESSIONALE e il nome: e' quell'id che
//      pubblica e legge i post;
//   5. graph.instagram.com/refresh_access_token lo allunga di altri 60 giorni,
//      purche' abbia almeno un giorno e non sia scaduto.
//
// DUE IDENTIFICATIVI, e servono tutti e due. Lo scambio del codice da' l'id di
// app, ed e' quello che Meta mette nelle richieste firmate (revoca e
// cancellazione dei dati): senza, quelle richieste non troverebbero nessuno.
// /me da' l'id dell'account professionale, ed e' quello che le chiamate
// vogliono nel percorso. Scambiarli vorrebbe dire una revoca che non revoca
// niente, o una pubblicazione che non parte.
//
// E le due porte da cui bussa Meta arrivano con un `signed_request`: firma e
// dati in base64url, firmati HMAC-SHA256 con la chiave segreta dell'app. Una
// firma che non torna e' una richiesta che non e' di Meta, e non si ascolta.
import crypto from 'node:crypto';
import { makeLog } from '../logger.js';

const log = makeLog('instagram-accesso');
const TIMEOUT_MS = 10_000;

export const PERMESSI = ['instagram_business_basic', 'instagram_business_content_publish'];
export const VERSIONE = 'v26.0';
export const GRAPH = 'https://graph.instagram.com';

export function urlAutorizzazione({ appId, redirectUri, state }) {
  const q = new URLSearchParams({
    force_reauth: 'true', client_id: String(appId), redirect_uri: redirectUri, response_type: 'code',
    scope: PERMESSI.join(','), state: String(state),
  });
  return 'https://www.instagram.com/oauth/authorize?' + q.toString();
}

async function chiama(url, opzioni = {}) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...opzioni, signal: ac.signal });
    const d = await r.json().catch(() => null);
    if (!r.ok || d?.error || d?.error_type) {
      const e = d?.error?.message || d?.error_message || ('HTTP ' + r.status);
      log.debug('instagram:', e);
      return { ok: false, errore: String(e) };
    }
    return { ok: true, dati: d };
  } catch (e) {
    return { ok: false, errore: e?.name === 'AbortError' ? 'Instagram non risponde' : String(e?.message || e) };
  } finally { clearTimeout(to); }
}

// Le risposte di Instagram a volte stanno dentro `data: [ ... ]`, a volte no.
const primo = (d) => (Array.isArray(d?.data) ? d.data[0] : d) || {};

// Il codice diventa un token lungo, con i due id e il nome. Quattro passi, e se
// uno non va il collegamento non si fa: niente mezzi collegamenti, che sembrano
// fatti e poi non pubblicano.
export async function scambiaCodice({ appId, segreto, redirectUri, codice }) {
  const modulo = new URLSearchParams({
    client_id: String(appId), client_secret: String(segreto), grant_type: 'authorization_code',
    redirect_uri: redirectUri, code: String(codice || '').replace(/#_$/, ''),
  });
  const corto = await chiama('https://api.instagram.com/oauth/access_token', { method: 'POST', body: modulo });
  if (!corto.ok) return corto;
  const c = primo(corto.dati);
  const tokenCorto = String(c.access_token || '');
  const idApp = String(c.user_id || '');
  if (!tokenCorto || !idApp) return { ok: false, errore: 'Instagram non ha dato il token' };
  const permessi = String(c.permissions || '').split(',').map((x) => x.trim()).filter(Boolean);
  const lungo = await chiama(`${GRAPH}/access_token?` + new URLSearchParams({
    grant_type: 'ig_exchange_token', client_secret: String(segreto), access_token: tokenCorto,
  }).toString());
  if (!lungo.ok) return lungo;
  const token = String(lungo.dati?.access_token || '');
  if (!token) return { ok: false, errore: 'Instagram non ha dato il token lungo' };
  const chi = await chiama(`${GRAPH}/${VERSIONE}/me?` + new URLSearchParams({ fields: 'user_id,username', access_token: token }).toString());
  const io = chi.ok ? primo(chi.dati) : {};
  const userId = String(io.user_id || '');
  if (!userId) return { ok: false, errore: 'Instagram non ha detto di che account si tratta' };
  return {
    ok: true, token, idApp, userId, username: String(io.username || ''),
    permessi, scade: Date.now() + (Number(lungo.dati?.expires_in) || 0) * 1000,
  };
}

// Allungare: si fa quando mancano meno di trenta giorni. Un token lungo ne dura
// sessanta, quindi a quel punto ha gia' piu' del giorno di vita che Instagram
// chiede. Uno scaduto non si allunga piu': si ricollega.
export const DA_ALLUNGARE_MS = 30 * 86400_000;
export const daAllungare = (scade, adesso = Date.now()) => Number(scade) > adesso && Number(scade) - adesso < DA_ALLUNGARE_MS;

export async function allunga(token) {
  const r = await chiama(`${GRAPH}/refresh_access_token?` + new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token }).toString());
  if (!r.ok) return r;
  const nuovo = String(r.dati?.access_token || '');
  if (!nuovo) return { ok: false, errore: 'Instagram non ha allungato il token' };
  return { ok: true, token: nuovo, scade: Date.now() + (Number(r.dati?.expires_in) || 0) * 1000 };
}

const b64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// LA FIRMA DI META. Il confronto e' a tempo costante: una firma quasi giusta non
// deve metterci meno a essere scartata di una sbagliata del tutto.
export function leggiRichiestaFirmata(signedRequest, segreto) {
  const [firma, dati, ...resto] = String(signedRequest || '').split('.');
  if (!firma || !dati || resto.length || !segreto) return null;
  const attesa = crypto.createHmac('sha256', String(segreto)).update(dati).digest();
  const data = b64url(firma);
  if (data.length !== attesa.length || !crypto.timingSafeEqual(data, attesa)) return null;
  let p = null;
  try { p = JSON.parse(b64url(dati).toString('utf8')); } catch { return null; }
  if (String(p?.algorithm || '').toUpperCase() !== 'HMAC-SHA256') return null;
  if (!p?.user_id) return null;
  return p;
}

// IL CODICE DELLA CANCELLAZIONE. Meta lo mostra a chi ha chiesto di cancellare i
// dati, con l'indirizzo dove leggere com'e' andata. La cancellazione si fa
// subito, quindi non c'e' niente da ricordare: il codice porta con se' la
// propria firma, e la pagina riconosce i codici nostri senza un elenco. Un
// codice inventato non diventa «cancellazione fatta».
const firmaCodice = (grezzo, chiave) => crypto.createHmac('sha256', String(chiave))
  .update('instagram-cancellazione:' + grezzo).digest('hex').slice(0, 16);

export function codiceCancellazione(chiave) {
  const grezzo = crypto.randomBytes(8).toString('hex');
  return grezzo + firmaCodice(grezzo, chiave);
}

export function codiceNostro(codice, chiave) {
  const c = String(codice || '');
  if (!/^[a-f0-9]{32}$/.test(c) || !chiave) return false;
  return crypto.timingSafeEqual(Buffer.from(c.slice(16)), Buffer.from(firmaCodice(c.slice(0, 16), chiave)));
}
