// AUTENTICAZIONE YOUTUBE (OAuth 2.0 di Google, con PKCE), senza librerie.
//
// Il giro — segreto usa-e-getta, `state`, scadenza — è quello di sempre e vive
// in `src/giro.js`. Qui c'è solo ciò che è di Google.
//
// Due cose di Google che non sono come altrove, e che se si sbagliano si pagano
// mesi dopo:
//
//  1. il refresh token lo dà UNA VOLTA SOLA, alla prima autorizzazione, e solo
//     se glielo si chiede con `access_type=offline`. Chi lo dimentica ha un
//     collegamento che funziona benissimo per un'ora e poi muore. Con
//     `prompt=consent` lo si riottiene anche quando la persona ha già detto sì
//     in passato — altrimenti chi si ricollega resta senza.
//  2. quando rinnova, la risposta NON contiene il refresh token: c'è solo il
//     nuovo access token. Chi salva la risposta così com'è cancella il refresh
//     che aveva, e alla scadenza dopo è fuori. Il ricucire sta in api.js, dove
//     il token vecchio c'è ancora.
import { config } from '../config.js';
import { creaPkce } from '../giro.js';

export const AUTORIZZA = 'https://accounts.google.com/o/oauth2/v2/auth';
export const TOKEN = 'https://oauth2.googleapis.com/token';
export const REVOCA = 'https://oauth2.googleapis.com/revoke';

// Gli scope che chiediamo, e perché.
//
// `youtube.readonly` serve a sapere QUALE CANALE ha autorizzato: su YouTube
// l'account Google e il canale non sono la stessa cosa, e un account può averne
// più d'uno. Senza questo sapremmo solo che è entrato «qualcuno di Google».
//
// Non chiediamo `youtube.force-ssl` (scrivere in chat, moderare): il bot in chat
// su YouTube non c'è ancora, e chiedere oggi il permesso di parlare per usarlo
// forse domani è chiedere un potere che non si usa. Il giorno che la chat ci
// sarà, il permesso si chiederà allora — con la stessa strada.
export const SCOPE = [
  'openid',
  'https://www.googleapis.com/auth/youtube.readonly',
];

export function configurato() {
  return !!(config.youtubeClientId && config.youtubeClientSecret);
}

export { creaPkce };

export function urlAutorizzazione({ challenge, state }) {
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: config.youtubeClientId,
    redirect_uri: config.youtubeRedirect,
    scope: SCOPE.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',       // senza questo: niente refresh token
    prompt: 'consent',            // senza questo: niente refresh token per chi si ricollega
    include_granted_scopes: 'true',
  });
  return `${AUTORIZZA}?${p.toString()}`;
}

// Normalizza la risposta di Google nella forma che usa il resto del bot (la
// stessa dei token Twitch e Kick: così finiscono nella stessa tabella, cifrati).
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
    client_id: config.youtubeClientId,
    client_secret: config.youtubeClientSecret,
    ...params,
  });
  const r = await fetchImpl(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const testo = await r.text().catch(() => '');
  if (!r.ok) {
    const e = new Error(`Google ha rifiutato la richiesta di token (${r.status}) ${testo}`.trim());
    e.status = r.status;
    throw e;
  }
  try { return formaToken(JSON.parse(testo)); } catch { throw new Error('Google ha risposto qualcosa che non è JSON'); }
}

export function scambiaCodice(code, verifier, opts) {
  return chiediToken({
    grant_type: 'authorization_code',
    code: String(code || ''),
    redirect_uri: config.youtubeRedirect,
    code_verifier: String(verifier || ''),
  }, opts);
}

export function rinnova(refreshToken, opts) {
  return chiediToken({ grant_type: 'refresh_token', refresh_token: String(refreshToken || '') }, opts);
}

// Togliere il permesso da casa di Google, non solo da casa nostra: scollegare e
// basta lascerebbe alla persona un'app autorizzata che non usa più nessuno.
export async function revoca(token, { fetchImpl = fetch } = {}) {
  const t = String(token || '');
  if (!t) return false;
  try {
    const r = await fetchImpl(REVOCA, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: t }),
    });
    return r.ok;
  } catch { return false; }
}

// Margine: si rinnova PRIMA della scadenza, non quando è già scaduto.
export const MARGINE_MS = 5 * 60 * 1000;
export function daRinnovare(token, ora = Date.now()) {
  if (!token?.accessToken) return true;
  if (!token.expiresAt) return false;
  return token.expiresAt - ora <= MARGINE_MS;
}
