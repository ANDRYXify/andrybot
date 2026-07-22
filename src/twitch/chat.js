// Client IRC di Twitch su WebSocket nativo (Node >= 22: WebSocket globale,
// nessuna dipendenza). Gestisce connessione, PING/PONG, RECONNECT,
// riconnessione con backoff, parsing dei tag IRCv3 e coda di invio
// con rate limit.
import { EventEmitter } from 'node:events';
import { makeLog } from '../logger.js';
import { memory } from '../db.js';

const log = makeLog('chat');

const IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';
const MSG_MAX = 450;            // limite prudente sotto i 500 byte IRC
const RATE_MS = 1600;           // 1 messaggio ogni 1,6s (limite globale prudente)
const BACKOFF_MIN = 1000;       // riconnessione: 1s → ... → 60s
const BACKOFF_MAX = 60_000;
const QUEUE_MAX = 30;           // messaggi in coda al massimo (oltre: scartiamo i più vecchi)

// de-escape dei valori dei tag IRCv3 (\: → ';', \s → ' ', \\ → '\', \r, \n)
function unescapeTag(v) {
  let out = '';
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (c !== '\\') { out += c; continue; }
    const n = v[++i];
    if (n === ':') out += ';';
    else if (n === 's') out += ' ';
    else if (n === '\\') out += '\\';
    else if (n === 'r') out += '\r';
    else if (n === 'n') out += '\n';
    else if (n !== undefined) out += n;
  }
  return out;
}

// normalizza un nome canale: minuscolo, senza '#'
const normCh = ch => String(ch || '').toLowerCase().replace(/^#/, '').trim();

export class ChatBot extends EventEmitter {
  // login: account con cui parlare in chat (per SocialBot è lo streamer
  // stesso); kind: tipo di token in db ('broadcaster' di default).
  constructor({ auth, login, kind = 'broadcaster' }) {
    super();
    this.auth = auth;
    this._ws = null;
    this._login = String(login || '').toLowerCase();  // account che scrive in chat
    this._kind = kind;
    this._channels = new Set();      // canali in cui vogliamo stare (senza '#')
    this._closing = false;           // true durante disconnect() volontario
    this._backoff = BACKOFF_MIN;
    this._reconnectTimer = null;
    // coda di invio con rate limit
    this._queue = [];
    this._sendTimer = null;
    this._lastSent = 0;
  }

  // elenco dei canali correnti (senza '#')
  channels() { return [...this._channels]; }

  // Avvia la connessione con l'account indicato nel costruttore.
  async connect() {
    if (!this._login) throw new Error('ChatBot: login mancante');
    this._closing = false;
    await this._open();
  }

  // Chiude senza riconnettere.
  disconnect() {
    this._closing = true;
    clearTimeout(this._reconnectTimer);
    clearTimeout(this._sendTimer);
    this._sendTimer = null;
    try { this._ws?.close(); } catch { /* già chiuso */ }
    this._ws = null;
  }

  // Entra in un canale (e ricordalo per le riconnessioni).
  join(ch) {
    const c = normCh(ch);
    if (!c) return;
    this._channels.add(c);
    if (this._isOpen()) this._ws.send('JOIN #' + c);
  }

  // Esce da un canale e lo dimentica.
  part(ch) {
    const c = normCh(ch);
    if (!c) return;
    this._channels.delete(c);
    if (this._isOpen()) this._ws.send('PART #' + c);
  }

  // Accoda un messaggio per il canale: newline rimossi, troncato a 450 caratteri,
  // inviato rispettando il rate limit globale. Registrato nella memoria del bot.
  say(ch, text) {
    const c = normCh(ch);
    let t = String(text ?? '').replace(/[\r\n]+/g, ' ').trim();
    if (!c || !t) return;
    if (t.length > MSG_MAX) t = t.slice(0, MSG_MAX - 1) + '…';
    this._queue.push({ channel: c, text: t });
    while (this._queue.length > QUEUE_MAX) this._queue.shift();   // non accumulare all'infinito
    this._pump();
  }

  // ------------------------------------------------------------- connessione

  _isOpen() { return this._ws && this._ws.readyState === WebSocket.OPEN; }

  // Apre il WebSocket e fa il login IRC. Risolve alla 'open'.
  async _open() {
    // token sempre fresco (auth fa il refresh se serve)
    const token = await this.auth.getToken(this._kind, this._login);

    await new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(IRC_URL);
      this._ws = ws;

      ws.addEventListener('open', () => {
        // capability per tag e comandi, poi autenticazione
        ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        ws.send('PASS oauth:' + token);
        ws.send('NICK ' + this._login);
        // rientra nei canali dopo una riconnessione
        for (const c of this._channels) ws.send('JOIN #' + c);
        this._backoff = BACKOFF_MIN;
        log.info(`Connesso a IRC come @${this._login}` + (this._channels.size ? ` (${this._channels.size} canali)` : ''));
        if (!settled) { settled = true; resolve(); }
      });

      ws.addEventListener('message', ev => {
        try { this._onData(String(ev.data)); }
        catch (e) { log.error('parsing IRC:', e?.message || e); }
      });

      ws.addEventListener('error', () => {
        if (!settled) { settled = true; reject(new Error('Connessione IRC fallita')); }
      });

      ws.addEventListener('close', () => {
        if (!settled) { settled = true; reject(new Error('Connessione IRC chiusa prima del login')); }
        this._onClose(ws);
      });
    });
  }

  // Riconnessione con backoff esponenziale (a meno di disconnect volontario).
  _onClose(ws) {
    if (this._ws !== ws) return;        // chiusura di una connessione vecchia: ignora
    this._ws = null;
    if (this._closing) return;
    const delay = this._backoff;
    this._backoff = Math.min(this._backoff * 2, BACKOFF_MAX);
    log.warn(`IRC disconnesso, riprovo tra ${Math.round(delay / 1000)}s`);
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => {
      this._open().catch(e => {
        log.error('riconnessione IRC fallita:', e?.message || e);
        this._onClose(null);            // ripianifica (this._ws è già null)
      });
    }, delay);
  }

  // ------------------------------------------------------------- ricezione

  // Un frame WebSocket può contenere più righe IRC separate da \r\n.
  _onData(data) {
    for (const line of data.split('\r\n')) {
      if (line) this._handleLine(line);
    }
  }

  _handleLine(line) {
    // keep-alive del server: rispondiamo subito
    if (line.startsWith('PING')) {
      this._ws?.send('PONG :tmi.twitch.tv');
      return;
    }

    // formato: ['@tag=v;tag2=v2 '] [':prefisso '] COMANDO [' parametri'] [' :coda']
    let rest = line;
    const tags = {};
    if (rest.startsWith('@')) {
      const sp = rest.indexOf(' ');
      if (sp === -1) return;
      for (const kv of rest.slice(1, sp).split(';')) {
        const eq = kv.indexOf('=');
        if (eq === -1) tags[kv] = '';
        else tags[kv.slice(0, eq)] = unescapeTag(kv.slice(eq + 1));
      }
      rest = rest.slice(sp + 1);
    }
    let prefix = '';
    if (rest.startsWith(':')) {
      const sp = rest.indexOf(' ');
      if (sp === -1) return;
      prefix = rest.slice(1, sp);
      rest = rest.slice(sp + 1);
    }
    const sp = rest.indexOf(' ');
    const command = sp === -1 ? rest : rest.slice(0, sp);
    const params = sp === -1 ? '' : rest.slice(sp + 1);

    switch (command) {
      case 'PRIVMSG': return this._onPrivmsg(prefix, tags, params);
      case 'RECONNECT':
        // Twitch chiede di riconnettersi: chiudiamo, il backoff fa il resto
        log.info('RECONNECT richiesto dal server');
        try { this._ws?.close(); } catch { /* niente */ }
        return;
      case 'NOTICE':
        // login fallito → messaggio chiaro nei log (il token va rifatto)
        if (params.includes('Login authentication failed') || params.includes('Improperly formatted auth')) {
          log.error(`Autenticazione IRC FALLITA per @${this._login}: token non valido. Lo streamer deve ricollegare i permessi dalla dashboard.`);
        } else {
          log.debug('NOTICE:', params);
        }
        return;
      default:
        return; // 001/353/JOIN/PART ecc.: non ci servono
    }
  }

  // Messaggio in chat → evento 'message' per il resto del bot.
  _onPrivmsg(prefix, tags, params) {
    // params = '#canale :testo' — il testo può contenere ':' quindi cerchiamo ' :'
    const sep = params.indexOf(' :');
    if (sep === -1) return;
    const channel = normCh(params.slice(0, sep));
    const text = params.slice(sep + 2);
    const user = (prefix.split('!')[0] || '').toLowerCase();

    if (!channel || !user) return;

    // Nota: i messaggi che INVIAMO noi non tornano indietro su questa
    // connessione, quindi un PRIVMSG dal nostro stesso login è lo
    // streamer in carne e ossa che scrive dalla sua app: lo emettiamo
    // con isSelf=true (utile per imparare, mai per rispondergli).
    const badges = tags['badges'] || '';
    const isBroadcaster = badges.includes('broadcaster/');
    this.emit('message', {
      channel,
      user,
      display: tags['display-name'] || user,
      text,
      id: tags['id'] || '',                                    // id del messaggio (per eliminarlo)
      userId: tags['user-id'] || '',                           // id Twitch di chi scrive
      isMod: tags['mod'] === '1' || isBroadcaster,
      isBroadcaster,
      isSub: tags['subscriber'] === '1' || badges.includes('subscriber/') || badges.includes('founder/'),
      isVip: tags['vip'] === '1' || badges.includes('vip/'),
      isSelf: user === this._login,
      tags,
    });
  }

  // ------------------------------------------------------------- invio

  // Svuota la coda rispettando il rate limit (1 messaggio ogni RATE_MS).
  _pump() {
    if (this._sendTimer) return;          // già in corso
    const step = () => {
      this._sendTimer = null;
      if (this._closing || !this._queue.length) return;

      // non ancora connessi: riprova tra poco senza perdere i messaggi
      if (!this._isOpen()) {
        this._sendTimer = setTimeout(step, 1000);
        return;
      }
      const wait = this._lastSent + RATE_MS - Date.now();
      if (wait > 0) {
        this._sendTimer = setTimeout(step, wait);
        return;
      }
      const { channel, text } = this._queue.shift();
      try {
        this._ws.send(`PRIVMSG #${channel} :${text}`);
        this._lastSent = Date.now();
        // il bot ricorda anche quello che dice lui
        memory.logMessage(channel, this._login, this._login, text, true);
      } catch (e) {
        log.error('invio messaggio fallito:', e?.message || e);
      }
      if (this._queue.length) this._sendTimer = setTimeout(step, RATE_MS);
    };
    step();
  }
}
