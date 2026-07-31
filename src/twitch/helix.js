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

  // Cerca categorie/giochi Twitch per nome (basta il token applicazione).
  // Ritorna [{ id, name, boxArt }] (i primi risultati, per rilevanza).
  async searchCategories(query, { first = 15 } = {}) {
    const q = String(query || '').trim();
    if (!q) return [];
    const j = await this._request('GET', '/search/categories', { query: { query: q, first } });
    return (j?.data || []).map((c) => ({ id: c.id, name: c.name, boxArt: c.box_art_url }));
  }

  // Imposta la categoria (game_id) e/o il titolo del canale. Richiede il token
  // del broadcaster con scope channel:manage:broadcast. Ritorna true; lancia un
  // Error con .status 401/403 se il permesso non è stato concesso.
  async setChannelInfo(channelLogin, { gameId, title, tags, language } = {}) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return false;
    const body = {};
    if (gameId !== undefined && gameId !== null) body.game_id = String(gameId);
    if (title !== undefined) body.title = String(title).slice(0, 140);
    if (Array.isArray(tags)) body.tags = tags.map((t) => String(t).slice(0, 25)).filter(Boolean).slice(0, 10);
    if (language) body.broadcaster_language = String(language).slice(0, 8);
    if (!Object.keys(body).length) return false;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    await this._request('PATCH', '/channels', { query: { broadcaster_id: s.user_id }, body, token });
    return true;
  }

  // ── Regia: comandi diretta ─────────────────────────────────────────────────
  // Ognuno usa il token del broadcaster con lo scope indicato. Ritornano oggetti
  // { ok, ... } con un 'motivo' leggibile in caso di errore (niente eccezioni al chiamante).

  // Pubblicità (ad-break) di N secondi. Serve essere LIVE + scope 'channel:edit:commercial'.
  async startCommercial(channelLogin, length) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return { ok: false, motivo: 'canale sconosciuto' };
    const token = await this.auth.getToken('broadcaster', channelLogin);
    const len = Math.max(30, Math.min(180, Math.round(Number(length) || 60)));
    try {
      const j = await this._request('POST', '/channels/commercial', { body: { broadcaster_id: s.user_id, length: len }, token });
      const d = j?.data?.[0] || {};
      return { ok: true, length: d.length || len, retry: d.retry_after || 0, messaggio: d.message || '' };
    } catch (e) {
      if (e.status === 400) return { ok: false, motivo: 'devi essere in diretta per lanciare una pubblicità' };
      if (e.status === 401 || e.status === 403) return { ok: false, motivo: 'permesso mancante (ri-concedi i permessi)' };
      if (e.status === 429) return { ok: false, motivo: 'troppo presto per un\'altra pubblicità' };
      return { ok: false, motivo: 'errore Twitch' };
    }
  }

  // Marker nel VOD (per ritrovare i momenti). Serve essere LIVE + scope 'channel:manage:broadcast'.
  async createStreamMarker(channelLogin, description = '') {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return { ok: false, motivo: 'canale sconosciuto' };
    const token = await this.auth.getToken('broadcaster', channelLogin);
    try {
      const j = await this._request('POST', '/streams/markers', { body: { user_id: s.user_id, description: String(description || '').slice(0, 140) }, token });
      const d = j?.data?.[0] || {};
      return { ok: true, id: d.id, position: d.position_seconds };
    } catch (e) {
      if (e.status === 404) return { ok: false, motivo: 'devi essere in diretta per mettere un marker' };
      if (e.status === 401 || e.status === 403) return { ok: false, motivo: 'permesso mancante (ri-concedi i permessi)' };
      return { ok: false, motivo: 'errore Twitch' };
    }
  }

  // Avvia una RAID verso un altro canale (per login). Serve essere LIVE + scope 'channel:manage:raids'.
  async startRaid(fromLogin, toLogin) {
    const s = streamers.get(fromLogin);
    if (!s?.user_id) return { ok: false, motivo: 'canale sconosciuto' };
    const target = await this.getUserByLogin(toLogin);
    if (!target?.id) return { ok: false, motivo: 'canale di destinazione non trovato' };
    if (target.id === s.user_id) return { ok: false, motivo: 'non puoi raidare te stesso' };
    const token = await this.auth.getToken('broadcaster', fromLogin);
    try {
      await this._request('POST', '/raids', { query: { from_broadcaster_id: s.user_id, to_broadcaster_id: target.id }, token });
      return { ok: true, target: target.display_name || target.login };
    } catch (e) {
      if (e.status === 409) return { ok: false, motivo: 'c\'è già una raid in corso' };
      if (e.status === 400) return { ok: false, motivo: 'devi essere in diretta per fare una raid' };
      if (e.status === 401 || e.status === 403) return { ok: false, motivo: 'permesso mancante (ri-concedi i permessi)' };
      return { ok: false, motivo: 'errore Twitch' };
    }
  }

  // Annulla una raid in preparazione. Scope 'channel:manage:raids'.
  async cancelRaid(fromLogin) {
    const s = streamers.get(fromLogin);
    if (!s?.user_id) return { ok: false, motivo: 'canale sconosciuto' };
    const token = await this.auth.getToken('broadcaster', fromLogin);
    try {
      await this._request('DELETE', '/raids', { query: { broadcaster_id: s.user_id }, token });
      return { ok: true };
    } catch (e) {
      if (e.status === 404) return { ok: true, nonCera: true };
      if (e.status === 401 || e.status === 403) return { ok: false, motivo: 'permesso mancante' };
      return { ok: false, motivo: 'errore Twitch' };
    }
  }

  // Annuncio in chat (/announce): messaggio evidenziato, con colore opzionale.
  // Scope 'moderator:manage:announcements'. color ∈ blue|green|orange|purple|primary.
  async announce(channelLogin, message, color = 'primary') {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return { ok: false, motivo: 'canale sconosciuto' };
    const msg = String(message || '').slice(0, 500).trim();
    if (!msg) return { ok: false, motivo: 'messaggio vuoto' };
    const col = ['blue', 'green', 'orange', 'purple', 'primary'].includes(color) ? color : 'primary';
    const token = await this.auth.getToken('broadcaster', channelLogin);
    try {
      await this._request('POST', '/chat/announcements', {
        query: { broadcaster_id: s.user_id, moderator_id: s.user_id },
        body: { message: msg, color: col }, token,
      });
      return { ok: true };
    } catch (e) {
      if (e.status === 401 || e.status === 403) return { ok: false, motivo: 'permesso mancante (ri-concedi i permessi)' };
      return { ok: false, motivo: 'errore Twitch' };
    }
  }

  // Shoutout ufficiale (/shoutout): il banner che rimanda a un altro canale.
  // Scope 'moderator:manage:shoutouts'. Serve essere LIVE; Twitch limita la frequenza.
  async shoutout(fromLogin, toLogin) {
    const s = streamers.get(fromLogin);
    if (!s?.user_id) return { ok: false, motivo: 'canale sconosciuto' };
    const target = await this.getUserByLogin(toLogin);
    if (!target?.id) return { ok: false, motivo: 'canale non trovato' };
    if (target.id === s.user_id) return { ok: false, motivo: 'non puoi fare shoutout a te stesso' };
    const token = await this.auth.getToken('broadcaster', fromLogin);
    try {
      await this._request('POST', '/chat/shoutouts', {
        query: { from_broadcaster_id: s.user_id, to_broadcaster_id: target.id, moderator_id: s.user_id }, token,
      });
      return { ok: true, target: target.display_name || target.login };
    } catch (e) {
      if (e.status === 429) return { ok: false, motivo: 'shoutout troppo ravvicinati (aspetta un po\')' };
      if (e.status === 400) return { ok: false, motivo: 'devi essere in diretta per lo shoutout' };
      if (e.status === 401 || e.status === 403) return { ok: false, motivo: 'permesso mancante (ri-concedi i permessi)' };
      return { ok: false, motivo: 'errore Twitch' };
    }
  }

  // Chi è in chat adesso (login). Scope 'moderator:read:chatters'. Pagina fino a
  // 1000 alla volta; per canali normali basta la prima pagina. Ritorna [] se manca
  // lo scope o il canale è offline (Twitch dà comunque i presenti, ma noi contiamo
  // le ore solo in live). Non lancia mai.
  async getChatters(channelLogin, { max = 1000 } = {}) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return [];
    try {
      const token = await this.auth.getToken('broadcaster', channelLogin);
      const out = [];
      let cursor = '';
      do {
        const query = { broadcaster_id: s.user_id, moderator_id: s.user_id, first: 1000 };
        if (cursor) query.after = cursor;
        const j = await this._request('GET', '/chat/chatters', { query, token });
        for (const c of (j?.data || [])) if (c?.user_login) out.push(c.user_login.toLowerCase());
        cursor = j?.pagination?.cursor || '';
      } while (cursor && out.length < max);
      return out;
    } catch { return []; }
  }

  // Badge (stemmi) di chat: globali e del canale. Bastano il token applicazione.
  // Ritornano [{ set_id, versions:[{id, image_url_1x/2x/4x}] }].
  async badgeGlobali() {
    const j = await this._request('GET', '/chat/badges/global', {});
    return j?.data || [];
  }
  async badgeCanale(broadcasterId) {
    if (!broadcasterId) return [];
    const j = await this._request('GET', '/chat/badges', { query: { broadcaster_id: broadcasterId } });
    return j?.data || [];
  }

  // Stream key RTMP del canale (Studio Web). Scope 'channel:read:stream_key'.
  // Segretissima: resta sul server, non va MAI al browser. Ritorna la chiave o null.
  async getStreamKey(channelLogin) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return null;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    try {
      const j = await this._request('GET', '/streams/key', { query: { broadcaster_id: s.user_id }, token });
      return j?.data?.[0]?.stream_key || null;
    } catch { return null; }
  }

  // Programmazione pubblicità (prossimo ad-break, snooze). Scope 'channel:read:ads'.
  // Ritorna { nextAt, duration, lastAt, snoozeCount } o null (offline / niente scope).
  async getAdSchedule(channelLogin) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return null;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    try {
      const j = await this._request('GET', '/channels/ads', { query: { broadcaster_id: s.user_id }, token });
      const d = j?.data?.[0];
      if (!d) return null;
      return { nextAt: d.next_ad_at || 0, duration: d.duration || 0, lastAt: d.last_ad_at || 0, snoozeCount: d.snooze_count || 0 };
    } catch { return null; }
  }

  // ---- Punti canale: ricompense personalizzate (Custom Rewards) ----
  // Crea un premio a punti canale. Ritorna {id, title, cost} o lancia (es. 403
  // se manca lo scope channel:manage:redemptions, 400 se il titolo è duplicato).
  async creaReward(channelLogin, { titolo, costo, prompt, userInput } = {}) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return null;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    const body = {
      title: String(titolo || '').slice(0, 45),
      cost: Math.max(1, Math.round(Number(costo) || 100)),
      is_enabled: true,
    };
    if (userInput) { body.is_user_input_required = true; body.prompt = String(prompt || '').slice(0, 200); }
    const j = await this._request('POST', '/channel_points/custom_rewards', {
      query: { broadcaster_id: s.user_id }, body, token,
    });
    const r = j?.data?.[0];
    return r ? { id: r.id, title: r.title, cost: r.cost } : null;
  }

  // Elenca i premi GESTIBILI da noi (quelli creati dal nostro client).
  async listaRewards(channelLogin) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return [];
    const token = await this.auth.getToken('broadcaster', channelLogin);
    const j = await this._request('GET', '/channel_points/custom_rewards', {
      query: { broadcaster_id: s.user_id, only_manageable_rewards: 'true' }, token,
    });
    return (j?.data || []).map((r) => ({ id: r.id, title: r.title, cost: r.cost, enabled: r.is_enabled }));
  }

  // Elenca TUTTI i premi a punti canale del canale (anche quelli non nostri): utile
  // per far vedere allo streamer quanti ne ha già e i nomi occupati.
  async listaRewardsTutti(channelLogin) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return [];
    const token = await this.auth.getToken('broadcaster', channelLogin);
    const j = await this._request('GET', '/channel_points/custom_rewards', {
      query: { broadcaster_id: s.user_id }, token,
    });
    return (j?.data || []).map((r) => ({ id: r.id, title: r.title, cost: r.cost, enabled: r.is_enabled, richiedeTesto: !!r.is_user_input_required }));
  }

  // Elimina un premio (solo quelli creati da noi).
  async eliminaReward(channelLogin, rewardId) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id || !rewardId) return false;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    await this._request('DELETE', '/channel_points/custom_rewards', {
      query: { broadcaster_id: s.user_id, id: rewardId }, token,
    });
    return true;
  }

  // Segna un riscatto come completato/annullato (solo per i premi nostri): così
  // nella coda Twitch non resta "in sospeso". Best-effort.
  async aggiornaRedemption(channelLogin, rewardId, redemptionId, status) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id || !rewardId || !redemptionId) return false;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    await this._request('PATCH', '/channel_points/custom_rewards/redemptions', {
      query: { broadcaster_id: s.user_id, reward_id: rewardId, id: redemptionId },
      body: { status: status === 'CANCELED' ? 'CANCELED' : 'FULFILLED' }, token,
    });
    return true;
  }

  // ── Sondaggi (Polls) ──────────────────────────────────────────────────────
  // Richiedono lo scope 'channel:manage:polls' sul token del broadcaster.
  // Crea un sondaggio; ritorna { id, titolo } o null.
  async creaSondaggio(channelLogin, { titolo, opzioni, durata }) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return null;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    const j = await this._request('POST', '/polls', {
      body: {
        broadcaster_id: s.user_id,
        title: String(titolo || '').slice(0, 60),
        choices: (opzioni || []).slice(0, 5).map((t) => ({ title: String(t).slice(0, 25) })),
        duration: Math.min(1800, Math.max(15, Math.round(durata || 120))),
      }, token,
    });
    const p = j?.data?.[0];
    return p ? { id: p.id, titolo: p.title } : null;
  }

  // Sondaggio ATTIVO in corso (per chiuderlo senza conoscerne l'id) o null.
  async sondaggioAttivo(channelLogin) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return null;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    const j = await this._request('GET', '/polls', { query: { broadcaster_id: s.user_id, first: 1 }, token });
    const p = j?.data?.[0];
    return p && p.status === 'ACTIVE' ? { id: p.id, titolo: p.title } : null;
  }

  // Termina un sondaggio (TERMINATED = mostra il risultato, ARCHIVED = nascondi).
  async chiudiSondaggio(channelLogin, pollId, { archivia = false } = {}) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id || !pollId) return false;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    await this._request('PATCH', '/polls', { body: { broadcaster_id: s.user_id, id: pollId, status: archivia ? 'ARCHIVED' : 'TERMINATED' }, token });
    return true;
  }

  // ── Predizioni (Predictions) ──────────────────────────────────────────────
  // Richiedono lo scope 'channel:manage:predictions' sul token del broadcaster.
  // Crea una predizione; ritorna { id, titolo, esiti:[{id,titolo}] } o null.
  async creaPredizione(channelLogin, { titolo, esiti, finestra }) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return null;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    const j = await this._request('POST', '/predictions', {
      body: {
        broadcaster_id: s.user_id,
        title: String(titolo || '').slice(0, 45),
        outcomes: (esiti || []).slice(0, 10).map((t) => ({ title: String(t).slice(0, 25) })),
        prediction_window: Math.min(1800, Math.max(30, Math.round(finestra || 120))),
      }, token,
    });
    const p = j?.data?.[0];
    return p ? { id: p.id, titolo: p.title, esiti: (p.outcomes || []).map((o) => ({ id: o.id, titolo: o.title })) } : null;
  }

  // Predizione ATTIVA o BLOCCATA in corso (con gli esiti, per risolverla) o null.
  async predizioneAttiva(channelLogin) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return null;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    const j = await this._request('GET', '/predictions', { query: { broadcaster_id: s.user_id, first: 1 }, token });
    const p = j?.data?.[0];
    return p && (p.status === 'ACTIVE' || p.status === 'LOCKED')
      ? { id: p.id, titolo: p.title, stato: p.status, esiti: (p.outcomes || []).map((o) => ({ id: o.id, titolo: o.title })) }
      : null;
  }

  // Risolve una predizione su un esito vincente (esitoId). Senza esitoId → annulla.
  async risolviPredizione(channelLogin, predId, esitoId) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id || !predId) return false;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    const body = esitoId
      ? { broadcaster_id: s.user_id, id: predId, status: 'RESOLVED', winning_outcome_id: esitoId }
      : { broadcaster_id: s.user_id, id: predId, status: 'CANCELED' };
    await this._request('PATCH', '/predictions', { body, token });
    return true;
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

  // ------------------------------------------------------------- VIP
  // Richiedono lo scope 'channel:manage:vips' sul token del broadcaster.

  // Assegna il VIP. Ritorna { ok, gia?, motivo? }.
  async addVip(channelLogin, userId) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id || !userId) return { ok: false, motivo: 'dati mancanti' };
    const token = await this.auth.getToken('broadcaster', channelLogin);
    try {
      await this._request('POST', '/channels/vips', { query: { broadcaster_id: s.user_id, user_id: userId }, token });
      return { ok: true };
    } catch (e) {
      if (e.status === 409) return { ok: true, gia: true };                       // è già VIP
      if (e.status === 422) return { ok: false, motivo: 'non ci sono più slot VIP liberi' };
      if (e.status === 401) return { ok: false, motivo: 'permesso mancante (ri-concedi i permessi)' };
      if (e.status === 400) return { ok: false, motivo: 'non posso (forse è mod o sei tu)' };
      log.warn('addVip:', e?.message || e);
      return { ok: false, motivo: 'errore Twitch' };
    }
  }

  // Toglie il VIP. Ritorna { ok, motivo? }.
  async removeVip(channelLogin, userId) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id || !userId) return { ok: false, motivo: 'dati mancanti' };
    const token = await this.auth.getToken('broadcaster', channelLogin);
    try {
      await this._request('DELETE', '/channels/vips', { query: { broadcaster_id: s.user_id, user_id: userId }, token });
      return { ok: true };
    } catch (e) {
      if (e.status === 404 || e.status === 422) return { ok: true, nonEra: true }; // non era VIP: ok lo stesso
      if (e.status === 401) return { ok: false, motivo: 'permesso mancante' };
      log.warn('removeVip:', e?.message || e);
      return { ok: false, motivo: 'errore Twitch' };
    }
  }

  // Elenco VIP attuali → [{ user_id, user_login, user_name }] o [].
  async getVips(channelLogin) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return [];
    const token = await this.auth.getToken('broadcaster', channelLogin);
    try {
      const j = await this._request('GET', '/channels/vips', { query: { broadcaster_id: s.user_id, first: 100 }, token });
      return j?.data || [];
    } catch { return []; }
  }

  // ------------------------------------------------------------- MODERAZIONE
  // Richiedono, sul token del broadcaster, gli scope 'moderator:manage:chat_messages'
  // (elimina) e 'moderator:manage:banned_users' (timeout). Il moderatore è il
  // broadcaster stesso (parliamo col suo account).

  // Elimina un singolo messaggio della chat. Ritorna { ok } o { ok:false, motivo }.
  async deleteMessage(channelLogin, messageId) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id || !messageId) return { ok: false, motivo: 'dati mancanti' };
    const token = await this.auth.getToken('broadcaster', channelLogin);
    try {
      await this._request('DELETE', '/moderation/chat', {
        query: { broadcaster_id: s.user_id, moderator_id: s.user_id, message_id: messageId }, token,
      });
      return { ok: true };
    } catch (e) {
      if (e.status === 404) return { ok: true, giaVia: true };   // già sparito
      if (e.status === 401) return { ok: false, motivo: 'permesso mancante (ri-concedi i permessi)' };
      log.debug('deleteMessage:', e?.message || e);
      return { ok: false, motivo: 'errore Twitch' };
    }
  }

  // Da quanto un utente segue il canale → data ISO 'followed_at' o null.
  // Richiede lo scope 'moderator:read:followers' sul token del broadcaster.
  async getFollowAge(channelLogin, userId) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id || !userId) return null;
    const token = await this.auth.getToken('broadcaster', channelLogin);
    try {
      const j = await this._request('GET', '/channels/followers', { query: { broadcaster_id: s.user_id, user_id: userId }, token });
      return j?.data?.[0]?.followed_at || null;
    } catch { return null; }
  }

  // Revoca un ban/timeout. Ritorna { ok } o { ok:false, motivo }.
  async unbanUser(channelLogin, userId) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id || !userId) return { ok: false, motivo: 'dati mancanti' };
    const token = await this.auth.getToken('broadcaster', channelLogin);
    try {
      await this._request('DELETE', '/moderation/bans', { query: { broadcaster_id: s.user_id, moderator_id: s.user_id, user_id: userId }, token });
      return { ok: true };
    } catch (e) {
      if (e.status === 400 || e.status === 404) return { ok: true, nonEra: true };  // non era bannato: ok
      if (e.status === 401) return { ok: false, motivo: 'permesso mancante' };
      return { ok: false, motivo: 'errore Twitch' };
    }
  }

  // Timeout (o ban se durataSec = 0) di un utente. Ritorna { ok } o { ok:false }.
  async timeoutUser(channelLogin, userId, durataSec = 60, reason = '') {
    const s = streamers.get(channelLogin);
    if (!s?.user_id || !userId) return { ok: false, motivo: 'dati mancanti' };
    const token = await this.auth.getToken('broadcaster', channelLogin);
    const data = { user_id: String(userId), reason: String(reason || '').slice(0, 500) };
    if (durataSec > 0) data.duration = Math.min(1209600, Math.max(1, Math.round(durataSec))); // max 14 giorni
    try {
      await this._request('POST', '/moderation/bans', {
        query: { broadcaster_id: s.user_id, moderator_id: s.user_id }, token, body: { data },
      });
      return { ok: true };
    } catch (e) {
      if (e.status === 400) return { ok: false, motivo: 'non posso (forse è mod/VIP o sei tu)' };
      if (e.status === 401) return { ok: false, motivo: 'permesso mancante' };
      if (e.status === 409) return { ok: true, gia: true };   // già bannato
      log.debug('timeoutUser:', e?.message || e);
      return { ok: false, motivo: 'errore Twitch' };
    }
  }

  // Chat ai soli follower (o la riapre): la "serranda" durante un attacco
  // follow-bot. minMinuti = da quanto devono seguire (0 = anche appena seguiti).
  // Richiede lo scope moderator:manage:chat_settings. Ritorna { ok }.
  async chatSoloFollower(channelLogin, attivo, minMinuti = 0) {
    const s = streamers.get(channelLogin);
    if (!s?.user_id) return { ok: false, motivo: 'dati mancanti' };
    try {
      const token = await this.auth.getToken('broadcaster', channelLogin);
      await this._request('PATCH', '/chat/settings', {
        query: { broadcaster_id: s.user_id, moderator_id: s.user_id }, token,
        body: { follower_mode: !!attivo, follower_mode_duration: Math.max(0, Math.round(minMinuti)) },
      });
      return { ok: true };
    } catch (e) {
      if (e.status === 401 || e.status === 403) return { ok: false, motivo: 'permesso mancante' };
      log.debug('chatSoloFollower:', e?.message || e);
      return { ok: false, motivo: 'errore Twitch' };
    }
  }
}
