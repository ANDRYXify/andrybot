// Wrapper minimale dell'API Helix di Twitch (https://api.twitch.tv/helix)
// basato su fetch globale. Di default usa il token applicazione; le
// chiamate che richiedono permessi utente (es. creare clip) passano
// esplicitamente il token del broadcaster.
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { streamers } from '../db.js';

const log = makeLog('helix');

const BASE = 'https://api.twitch.tv/helix';

export class Helix {
  constructor({ auth }) {
    this.auth = auth;
  }

  // Richiesta generica verso Helix.
  // opts: { query: oggetto → querystring, body: oggetto → JSON, token: access token da usare }
  // Se non ok lancia un Error con .status e il testo della risposta.
  async _request(method, path, { query, body, token } = {}) {
    const tok = token || await this.auth.appToken();
    let url = BASE + path;
    if (query) url += '?' + new URLSearchParams(query).toString();

    const headers = {
      'Client-Id': config.twitchClientId,
      'Authorization': 'Bearer ' + tok,
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Helix ${method} ${path} → ${res.status} ${text}`.trim());
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;          // nessun contenuto
    return res.json().catch(() => null);
  }

  // Utente per login → oggetto utente Helix (id, login, display_name, ...) o null.
  async getUserByLogin(login) {
    const j = await this._request('GET', '/users', { query: { login: String(login).toLowerCase() } });
    return j?.data?.[0] || null;
  }

  // Stream in corso per login → oggetto stream (title, game_name, viewer_count, ...) o null se offline.
  async getStream(login) {
    const j = await this._request('GET', '/streams', { query: { user_login: String(login).toLowerCase() } });
    return j?.data?.[0] || null;
  }

  // Informazioni canale (titolo, categoria, ...) per broadcaster_id → oggetto o null.
  async getChannelInfo(broadcasterId) {
    const j = await this._request('GET', '/channels', { query: { broadcaster_id: broadcasterId } });
    return j?.data?.[0] || null;
  }

  // Crea una clip sul canale indicato usando il token del broadcaster.
  // Ritorna { id, url, editUrl } oppure null se lo streamer non è live
  // (Twitch risponde 404 in quel caso) o se manca lo user_id.
  async createClip(channelLogin) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) {
      log.warn(`createClip: streamer ${channelLogin} sconosciuto o senza user_id`);
      return null;
    }
    const token = await this.auth.getToken('broadcaster', channelLogin);
    try {
      const j = await this._request('POST', '/clips', {
        query: { broadcaster_id: s.user_id },
        token,
      });
      const clip = j?.data?.[0];
      if (!clip) return null;
      return {
        id: clip.id,
        url: 'https://clips.twitch.tv/' + clip.id,
        editUrl: clip.edit_url,
      };
    } catch (e) {
      // 404 = canale offline: non è un errore, semplicemente niente clip
      if (e.status === 404) {
        log.debug(`createClip: ${channelLogin} non è live, clip saltata`);
        return null;
      }
      throw e;
    }
  }
}
