// EventSub di Twitch via WebSocket nativo (wss://eventsub.wss.twitch.tv/ws).
// UNA connessione per broadcaster: le sottoscrizioni con transport
// "websocket" valgono solo per il token utente che le crea, quindi
// ogni streamer osservato ha il proprio socket autenticato col SUO token.
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { tokens } from '../db.js';

const log = makeLog('eventsub');

const WS_URL = 'wss://eventsub.wss.twitch.tv/ws';
const SUB_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions';
const GUARD_MS = 60_000;        // nessun messaggio (nemmeno keepalive) per 60s → riconnetti
const BACKOFF_MIN = 1000;
const BACKOFF_MAX = 60_000;

// Sottoscrizioni desiderate per un broadcaster (bid = user_id).
// Ognuna viene tentata singolarmente: se manca lo scope, Twitch la
// rifiuta e noi la saltiamo senza rumore.
function desiredSubs(bid) {
  return [
    { type: 'stream.online', version: '1', condition: { broadcaster_user_id: bid } },
    { type: 'stream.offline', version: '1', condition: { broadcaster_user_id: bid } },
    { type: 'channel.follow', version: '2', condition: { broadcaster_user_id: bid, moderator_user_id: bid } },
    { type: 'channel.subscribe', version: '1', condition: { broadcaster_user_id: bid } },
    { type: 'channel.raid', version: '1', condition: { to_broadcaster_user_id: bid } },
    { type: 'channel.channel_points_custom_reward_redemption.add', version: '1', condition: { broadcaster_user_id: bid } },
  ];
}

export class EventHub {
  constructor({ auth, helix, onEvent }) {
    this.auth = auth;
    this.helix = helix;
    this.onEvent = onEvent;
    // login → stato della connessione { login, userId, ws, guard, timer, backoff, closing, carryOver }
    this._conns = new Map();
  }

  // Inizia a osservare uno streamer (riga della tabella streamers).
  // Se non c'è il token broadcaster il bot resta in modalità solo-chat: return silenzioso.
  async watch(streamer) {
    if (!streamer?.login) return;
    const login = streamer.login.toLowerCase();
    if (this._conns.has(login)) return;                    // già osservato
    if (!tokens.get('broadcaster', login)) {
      log.debug(`Nessun token broadcaster per ${login}: EventSub saltato (solo chat)`);
      return;
    }

    const state = {
      login,
      userId: streamer.user_id || '',
      ws: null,
      guard: null,        // timer di guardia sui keepalive
      timer: null,        // timer di riconnessione
      backoff: BACKOFF_MIN,
      closing: false,
      carryOver: false,   // true quando seguiamo un session_reconnect (le sub sopravvivono)
    };
    this._conns.set(login, state);

    // se la riga non ha lo user_id, lo recuperiamo via Helix
    if (!state.userId) {
      try {
        const u = await this.helix.getUserByLogin(login);
        state.userId = u?.id || '';
      } catch (e) {
        log.warn(`user_id di ${login} non recuperabile:`, e?.message || e);
      }
      if (!state.userId) { this._conns.delete(login); return; }
    }

    this._connect(state, WS_URL);
    log.info(`EventSub: osservo ${login}`);
  }

  // Smette di osservare uno streamer.
  unwatch(login) {
    const state = this._conns.get(String(login || '').toLowerCase());
    if (!state) return;
    state.closing = true;
    clearTimeout(state.guard);
    clearTimeout(state.timer);
    try { state.ws?.close(); } catch { /* già chiuso */ }
    this._conns.delete(state.login);
    log.info(`EventSub: non osservo più ${state.login}`);
  }

  // Chiude tutte le connessioni.
  stop() {
    for (const login of [...this._conns.keys()]) this.unwatch(login);
  }

  // ------------------------------------------------------------- interni

  _connect(state, url) {
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      log.error(`EventSub ${state.login}: apertura WS fallita:`, e?.message || e);
      this._scheduleReconnect(state);
      return;
    }
    state.ws = ws;
    ws.addEventListener('message', ev => {
      this._onMessage(state, ws, ev).catch(e =>
        log.error(`EventSub ${state.login}:`, e?.message || e));
    });
    ws.addEventListener('close', () => this._onClose(state, ws));
    ws.addEventListener('error', () => { /* la 'close' che segue gestisce tutto */ });
    this._armGuard(state);
  }

  // Timer di guardia: Twitch manda un keepalive ogni ~10s; se per 60s
  // non arriva NULLA la connessione è morta → la chiudiamo e riconnettiamo.
  _armGuard(state) {
    clearTimeout(state.guard);
    state.guard = setTimeout(() => {
      log.warn(`EventSub ${state.login}: nessun messaggio da ${GUARD_MS / 1000}s, riconnetto`);
      try { state.ws?.close(); } catch { /* niente */ }
    }, GUARD_MS);
  }

  async _onMessage(state, ws, ev) {
    if (state.ws !== ws || state.closing) return;    // messaggio da una connessione vecchia
    this._armGuard(state);                            // qualsiasi messaggio azzera la guardia

    let msg;
    try { msg = JSON.parse(String(ev.data)); } catch { return; }
    const type = msg?.metadata?.message_type;

    switch (type) {
      case 'session_welcome': {
        state.backoff = BACKOFF_MIN;
        const sessionId = msg.payload?.session?.id;
        // dopo un session_reconnect le sottoscrizioni sopravvivono: non ricrearle
        if (state.carryOver) { state.carryOver = false; break; }
        if (sessionId) await this._subscribeAll(state, sessionId);
        break;
      }
      case 'notification': {
        // evento vero e proprio → lo passiamo al bot
        this.onEvent?.({
          channel: state.login,
          type: msg.payload?.subscription?.type,
          data: msg.payload?.event,
        });
        break;
      }
      case 'session_reconnect': {
        // Twitch sposta la sessione: apriamo la nuova connessione all'URL
        // indicato PRIMA di chiudere la vecchia (le sub vengono trasferite).
        const url = msg.payload?.session?.reconnect_url;
        log.info(`EventSub ${state.login}: reconnect richiesto dal server`);
        state.carryOver = !!url;
        const old = state.ws;
        this._connect(state, url || WS_URL);
        try { old?.close(); } catch { /* niente */ }
        break;
      }
      case 'revocation': {
        const t = msg.payload?.subscription?.type;
        log.warn(`EventSub ${state.login}: sottoscrizione ${t} revocata (${msg.payload?.subscription?.status})`);
        break;
      }
      case 'session_keepalive':
      default:
        break;                                        // guardia già riarmata sopra
    }
  }

  _onClose(state, ws) {
    if (this._conns.get(state.login) !== state) return;   // già rimpiazzato/unwatch
    if (state.ws !== ws) return;                          // chiusura della connessione vecchia
    if (state.closing) return;
    clearTimeout(state.guard);
    this._scheduleReconnect(state);
  }

  // Riconnessione con backoff; su una connessione nuova le sottoscrizioni
  // vanno ricreate (carryOver=false).
  _scheduleReconnect(state) {
    const delay = state.backoff;
    state.backoff = Math.min(state.backoff * 2, BACKOFF_MAX);
    log.warn(`EventSub ${state.login}: disconnesso, riprovo tra ${Math.round(delay / 1000)}s`);
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      if (state.closing) return;
      state.carryOver = false;
      this._connect(state, WS_URL);
    }, delay);
  }

  // Crea le sottoscrizioni sulla sessione appena aperta, con il token
  // del broadcaster. Ognuna in try/catch: se manca lo scope si salta.
  async _subscribeAll(state, sessionId) {
    let token;
    try {
      token = await this.auth.getToken('broadcaster', state.login);
    } catch (e) {
      log.warn(`EventSub ${state.login}: token broadcaster non disponibile:`, e?.message || e);
      return;
    }

    let ok = 0;
    const subs = desiredSubs(state.userId);
    for (const sub of subs) {
      try {
        const res = await fetch(SUB_URL, {
          method: 'POST',
          headers: {
            'Client-Id': config.twitchClientId,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: sub.type,
            version: sub.version,
            condition: sub.condition,
            transport: { method: 'websocket', session_id: sessionId },
          }),
        });
        if (res.ok) {
          ok++;
        } else {
          // 403 = scope mancante: normale se lo streamer non ha concesso tutto
          await res.text().catch(() => '');
          log.debug(`EventSub ${state.login}: ${sub.type} rifiutata (${res.status}), salto`);
        }
      } catch (e) {
        log.debug(`EventSub ${state.login}: ${sub.type} fallita:`, e?.message || e);
      }
    }
    log.info(`EventSub ${state.login}: attive ${ok}/${subs.length} sottoscrizioni`);
  }
}
