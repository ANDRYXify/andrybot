// AUTENTICAZIONE KICK (OAuth 2.1 con PKCE), senza librerie esterne.
//
// Differenza con Twitch che conta davvero: Kick richiede PKCE. Il giro — segreto
// usa-e-getta, `state`, scadenza — è lo stesso per tutte le porte esterne e vive
// in `src/giro.js`. Qui c'è solo ciò che è di Kick: gli indirizzi, gli scope e
// la forma dei suoi token.
import { config } from '../config.js';
import { creaPkce } from '../giro.js';

export const ID_BASE = 'https://id.kick.com/oauth';

// Gli scope che chiediamo, e perché. Chiedere meno del necessario spezza il
// prodotto; chiedere più del necessario è una richiesta che lo streamer non
// dovrebbe accettare.
export const SCOPE = [
  'user:read',            // sapere chi ha autorizzato
  'channel:read',         // titolo, categoria, stato della diretta
  'chat:write',           // far parlare il bot in chat
  'events:subscribe',     // ricevere i messaggi e gli eventi via webhook
];
// Chiesti solo se lo streamer vuole la moderazione: si aggiungono a parte.
export const SCOPE_MOD = ['moderation:ban', 'moderation:chat_message:manage'];

export function configurato() {
  return !!(config.kickClientId && config.kickClientSecret);
}

export { creaPkce };

// Dove mandare lo streamer per autorizzare.
export function urlAutorizzazione({ challenge, state, conModerazione = false }) {
  const scope = conModerazione ? [...SCOPE, ...SCOPE_MOD] : SCOPE;
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: config.kickClientId,
    redirect_uri: config.kickRedirect,
    scope: scope.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${ID_BASE}/authorize?${p.toString()}`;
}

// Normalizza la risposta di Kick nella forma che usa il resto del bot (la
// stessa dei token Twitch: così finiscono nella stessa tabella, cifrati).
export function formaToken(j) {
  const dentro = Number(j?.expires_in);
  return {
    accessToken: String(j?.access_token || ''),
    refreshToken: String(j?.refresh_token || ''),
    scopes: String(j?.scope || '').split(/[\s,]+/).filter(Boolean),
    expiresAt: Number.isFinite(dentro) ? Date.now() + dentro * 1000 : 0,
  };
}

async function chiediToken(params, { fetchImpl = fetch } = {}) {
  const body = new URLSearchParams({
    client_id: config.kickClientId,
    client_secret: config.kickClientSecret,
    ...params,
  });
  const r = await fetchImpl(`${ID_BASE}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const testo = await r.text().catch(() => '');
  if (!r.ok) {
    const e = new Error(`Kick ha rifiutato la richiesta di token (${r.status}) ${testo}`.trim());
    e.status = r.status;
    throw e;
  }
  try { return formaToken(JSON.parse(testo)); } catch { throw new Error('Kick ha risposto qualcosa che non è JSON'); }
}

export function scambiaCodice(code, verifier, opts) {
  return chiediToken({
    grant_type: 'authorization_code',
    code: String(code || ''),
    redirect_uri: config.kickRedirect,
    code_verifier: String(verifier || ''),
  }, opts);
}

export function rinnova(refreshToken, opts) {
  return chiediToken({ grant_type: 'refresh_token', refresh_token: String(refreshToken || '') }, opts);
}

// Margine: si rinnova PRIMA della scadenza, non quando è già scaduto — altrimenti
// il primo messaggio dopo la scadenza si perde.
export const MARGINE_MS = 5 * 60 * 1000;
export function daRinnovare(token, ora = Date.now()) {
  if (!token?.accessToken) return true;
  if (!token.expiresAt) return false;          // scadenza sconosciuta: si usa finché Kick non protesta
  return token.expiresAt - ora <= MARGINE_MS;
}
