// Autenticazione Twitch (OAuth 2) senza librerie esterne.
// Gestisce: URL di autorizzazione, scambio del "code", validazione,
// refresh dei token utente (bot/broadcaster) e token applicazione
// (client_credentials) con cache in memoria.
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { tokens } from '../db.js';

const log = makeLog('auth');

// endpoint OAuth di Twitch
const ID_BASE = 'https://id.twitch.tv/oauth2';

// margine di sicurezza: rinnoviamo i token 5 minuti prima della scadenza
const MARGINE_MS = 5 * 60 * 1000;

export class TwitchAuth {
  constructor() {
    // cache del token applicazione: { accessToken, expiresAt }
    this._app = null;
    // evita refresh concorrenti per lo stesso token utente: chiave "kind:login" → Promise
    this._refreshing = new Map();
  }

  // URL verso cui mandare l'utente per autorizzare l'app.
  // scopes: array di scope; state: stringa opaca anti-CSRF gestita dal chiamante.
  authUrl(scopes, state) {
    const p = new URLSearchParams({
      response_type: 'code',
      client_id: config.twitchClientId,
      redirect_uri: config.baseUrl + '/auth/callback',
      scope: (scopes || []).join(' '),
      state: state || '',
      force_verify: 'true',        // mostra sempre la schermata di consenso (utile per cambiare account)
    });
    return `${ID_BASE}/authorize?${p.toString()}`;
  }

  // POST comune verso /oauth2/token; ritorna il JSON o lancia un Error con status.
  async _tokenRequest(params) {
    const body = new URLSearchParams({
      client_id: config.twitchClientId,
      client_secret: config.twitchClientSecret,
      ...params,
    });
    const res = await fetch(`${ID_BASE}/token`, { method: 'POST', body });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Richiesta token fallita (${params.grant_type}): ${res.status} ${text}`.trim());
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  // normalizza la risposta di /token nel formato usato dal resto del bot
  _shapeToken(j) {
    return {
      accessToken: j.access_token,
      refreshToken: j.refresh_token || '',
      expiresAt: Date.now() + (j.expires_in || 0) * 1000,
      scopes: j.scope || [],
    };
  }

  // Scambia il "code" ricevuto sul redirect con una coppia di token.
  async exchangeCode(code) {
    const j = await this._tokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.baseUrl + '/auth/callback',
    });
    return this._shapeToken(j);
  }

  // Verifica un access token; ritorna i dati dell'utente o null se non valido.
  async validate(accessToken) {
    try {
      const res = await fetch(`${ID_BASE}/validate`, {
        headers: { Authorization: 'OAuth ' + accessToken },
      });
      if (!res.ok) return null;
      const j = await res.json();
      return {
        login: (j.login || '').toLowerCase(),
        userId: j.user_id,
        scopes: j.scopes || [],
        clientId: j.client_id,
      };
    } catch (e) {
      log.warn('validate fallita:', e?.message || e);
      return null;
    }
  }

  // Rinnova una coppia di token a partire dal refresh token.
  async refresh(refreshToken) {
    const j = await this._tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    return this._shapeToken(j);
  }

  // Ritorna un access token VALIDO per (kind, login), rinnovandolo se serve.
  // kind ∈ 'bot' | 'broadcaster'. Lancia se il token non esiste in DB.
  async getToken(kind, login) {
    const t = tokens.get(kind, login);
    if (!t) throw new Error('Token ' + kind + ' mancante per ' + login);

    // token ancora buono (o a scadenza sconosciuta e senza refresh token): usalo così com'è
    const inScadenza = t.expiresAt > 0 && t.expiresAt - Date.now() < MARGINE_MS;
    if (!inScadenza || !t.refreshToken) return t.accessToken;

    // refresh con de-duplicazione: se un altro chiamante sta già rinnovando
    // lo stesso token, aspettiamo lo stesso risultato invece di duplicare.
    const chiave = kind + ':' + login.toLowerCase();
    if (!this._refreshing.has(chiave)) {
      const p = this._doRefresh(kind, login, t).finally(() => this._refreshing.delete(chiave));
      this._refreshing.set(chiave, p);
    }
    return this._refreshing.get(chiave);
  }

  // Esegue il refresh e salva, PRESERVANDO userId e scopes originali.
  async _doRefresh(kind, login, t) {
    try {
      const fresh = await this.refresh(t.refreshToken);
      tokens.save(kind, login, {
        userId: t.userId,                              // preservato
        accessToken: fresh.accessToken,
        refreshToken: fresh.refreshToken || t.refreshToken,
        scopes: t.scopes,                              // preservati
        expiresAt: fresh.expiresAt,
      });
      log.debug(`Token ${kind}/${login} rinnovato`);
      return fresh.accessToken;
    } catch (e) {
      // 400/401 = refresh token revocato o non valido: inutile riprovare,
      // l'utente deve rifare l'OAuth dalla dashboard.
      if (e.status === 400 || e.status === 401) {
        log.error(`Refresh token ${kind}/${login} non valido (${e.status}): token eliminato, serve un nuovo login OAuth`);
        tokens.delete(kind, login);
      }
      throw e;
    }
  }

  // Token applicazione (client_credentials) con cache in memoria;
  // rinnovato automaticamente 5 minuti prima della scadenza.
  async appToken() {
    if (this._app && this._app.expiresAt - Date.now() > MARGINE_MS) {
      return this._app.accessToken;
    }
    const j = await this._tokenRequest({ grant_type: 'client_credentials' });
    this._app = {
      accessToken: j.access_token,
      expiresAt: Date.now() + (j.expires_in || 0) * 1000,
    };
    log.debug('Token applicazione rinnovato');
    return this._app.accessToken;
  }
}
