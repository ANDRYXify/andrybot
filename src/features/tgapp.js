// Telegram Mini App + "Accedi con Telegram" (OIDC).
//
// Un UNICO bot operatore (config.telegramApp) ospita la Mini App aperta dentro
// Telegram e fa da provider di login. Due meccanismi, entrambi standard e
// documentati da Telegram:
//
//  1) Mini App (initData): quando la web-app si apre dentro Telegram, il client
//     passa `initData` firmato. Lo validiamo con HMAC-SHA256 usando come chiave
//     l'HMAC del BOT TOKEN con la costante "WebAppData". Se il conto torna, il
//     mittente è autentico e conosciamo l'utente Telegram. Nessun segreto esce
//     dal server. (core.telegram.org/bots/webapps#validating-data)
//
//  2) OIDC (browser): "Accedi con Telegram" da un browser normale, via OpenID
//     Connect (Authorization Code + PKCE). client_id = id del bot, client_secret
//     da @BotFather. L'id_token (JWT) porta `sub` = id utente Telegram.
//     (oauth.telegram.org/.well-known/openid-configuration)
//
// In entrambi i casi otteniamo l'id utente Telegram; il collegamento id↔canale
// Twitch avviene una volta sola da loggati (vedi tgLogin nel DB / server.js).
import crypto from 'node:crypto';
import { config } from '../config.js';
import { makeLog } from '../logger.js';

const log = makeLog('tgapp');

const OIDC_AUTH = 'https://oauth.telegram.org/auth';
const OIDC_TOKEN = 'https://oauth.telegram.org/token';
const OIDC_ISS = 'https://oauth.telegram.org';
const TIMEOUT_MS = 10_000;

export function attiva() { return !!config.telegramApp?.attivo; }
export function oidcAttiva() { return !!config.telegramApp?.oidcAttivo; }
export function botUsername() { return config.telegramApp?.botUsername || ''; }
export function redirectUri() { return config.telegramApp?.redirectUri || ''; }

// ───────────────────────────────────────────────── Mini App: validazione initData
// initData è una query-string. Ritorna { ok, user, authDate } | { ok:false, motivo }.
// maxAgeSec: rifiuta initData troppo vecchi (replay). 0 = nessun limite.
export function validaInitData(initData, maxAgeSec = 86400) {
  const token = config.telegramApp?.botToken;
  if (!token) return { ok: false, motivo: 'mini app non configurata' };
  if (!initData || typeof initData !== 'string') return { ok: false, motivo: 'initData mancante' };

  let params;
  try { params = new URLSearchParams(initData); } catch { return { ok: false, motivo: 'initData illeggibile' }; }
  const hash = params.get('hash');
  if (!hash) return { ok: false, motivo: 'firma mancante' };

  // data-check-string: tutte le coppie tranne `hash`, ordinate per chiave, "k=v"\n
  const coppie = [];
  for (const [k, v] of params) { if (k !== 'hash') coppie.push(`${k}=${v}`); }
  coppie.sort();
  const dcs = coppie.join('\n');

  const segreto = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const atteso = crypto.createHmac('sha256', segreto).update(dcs).digest('hex');

  // confronto timing-safe (stessa lunghezza garantita: due hex sha256)
  const a = Buffer.from(atteso, 'hex');
  const b = Buffer.from(String(hash), 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, motivo: 'firma non valida' };

  const authDate = Number(params.get('auth_date')) || 0;
  if (maxAgeSec > 0 && authDate > 0 && (Date.now() / 1000 - authDate) > maxAgeSec) {
    return { ok: false, motivo: 'sessione Telegram scaduta' };
  }

  let user = null;
  try { user = JSON.parse(params.get('user') || 'null'); } catch { /* niente */ }
  if (!user?.id) return { ok: false, motivo: 'utente assente' };

  return { ok: true, authDate, user: {
    id: String(user.id),
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    username: user.username || '',
    language_code: user.language_code || '',
    photo_url: user.photo_url || '',
  } };
}

// ─────────────────────────────────────────────────────────────── OIDC (browser)
// PKCE: verifier casuale + challenge = base64url(sha256(verifier)).
export function pkce() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// URL a cui mandare il browser per "Accedi con Telegram".
export function urlAutorizzazione(state, codeChallenge) {
  const c = config.telegramApp;
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    scope: 'openid',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${OIDC_AUTH}?${p.toString()}`;
}

// Decodifica il payload di un JWT (senza verificare la firma: l'id_token arriva
// da una POST server-to-server autenticata col client_secret su TLS verso il
// token endpoint di Telegram, quindi il canale è già attendibile). Verifichiamo
// comunque iss/aud/exp. Ritorna il payload | null.
function decodePayload(jwt) {
  try {
    const parti = String(jwt || '').split('.');
    if (parti.length !== 3) return null;
    return JSON.parse(Buffer.from(parti[1], 'base64url').toString('utf8'));
  } catch { return null; }
}

// Scambia il `code` dell'OIDC. Ritorna { sub, nome, username, foto } | { errore }.
export async function scambiaCode(code, codeVerifier) {
  const c = config.telegramApp;
  if (!c?.clientId || !c?.clientSecret) return { errore: 'OIDC non configurato' };
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(OIDC_TOKEN, {
      method: 'POST',
      signal: ac.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: c.redirectUri,
        client_id: c.clientId,
        client_secret: c.clientSecret,
        code_verifier: codeVerifier,
      }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.id_token) { log.warn('token:', j?.error_description || j?.error || r.status); return { errore: j?.error || ('HTTP ' + r.status) }; }
    const p = decodePayload(j.id_token);
    if (!p?.sub) return { errore: 'id_token non valido' };
    if (p.iss && p.iss !== OIDC_ISS) return { errore: 'issuer inatteso' };
    if (c.clientId && p.aud && String(p.aud) !== String(c.clientId)) return { errore: 'audience inattesa' };
    if (p.exp && Number(p.exp) * 1000 < Date.now()) return { errore: 'id_token scaduto' };
    return { sub: String(p.sub), nome: p.name || '', username: p.preferred_username || '', foto: p.picture || '' };
  } catch (e) { log.warn('token: irraggiungibile', e?.message || e); return { errore: 'irraggiungibile' }; }
  finally { clearTimeout(to); }
}
