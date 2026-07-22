// BotManager: il "direttore d'orchestra" di AndryBot.
// Per OGNI streamer approvato e acceso crea una "unità": una
// connessione chat autenticata CON L'ACCOUNT DELLO STREAMER (il bot
// parla come lui), un gestore messaggi e le sottoscrizioni agli
// eventi Twitch. Tiene tutto sincronizzato con la dashboard.
import { makeLog } from './logger.js';
import { tokens, streamers, memory } from './db.js';
import { ChatBot } from './twitch/chat.js';
import { EventHub } from './twitch/events.js';
import { Brain } from './ai/brain.js';
import { createMessageHandler } from './features/handler.js';
import { ClipEngine } from './features/clips.js';
import { scheduleReflection } from './ai/reflection.js';
import { StreamWatcher } from './stream/watcher.js';

const log = makeLog('bot');

export class BotManager {
  constructor({ auth, helix, effects, modules, bus }) {
    this.auth = auth;
    this.helix = helix;
    this.effects = effects;          // motore "Effetti & Suoni" condiviso con la dashboard
    this.modules = modules || null;  // motore "Moduli" (automazioni QUANDO→SE→ALLORA)
    this.bus = bus || null;          // event-bus dei plugin operatore (opzionale)
    this.running = false;
    this.units = new Map();          // login → { chat }
    this.brain = null;
    this.clips = null;
    this.events = null;
    this.watcher = null;
    this._syncTimer = null;
    this._stopReflection = null;
  }

  async start() {
    if (this.running) return;

    this.clips = new ClipEngine({ helix: this.helix, say: (ch, t) => this.say(ch, t) });
    this.brain = new Brain({
      helix: this.helix,
      actions: { createClip: (channel, reason) => this.clips.createClip(channel, reason) },
    });
    this.events = new EventHub({
      auth: this.auth, helix: this.helix,
      onEvent: ev => this._onTwitchEvent(ev),
    });
    this.watcher = new StreamWatcher({ helix: this.helix, brain: this.brain });
    this.watcher.start();
    this._stopReflection = scheduleReflection({ brain: this.brain });

    this.running = true;
    await this.syncChannels();
    this._syncTimer = setInterval(() => this.syncChannels().catch(() => {}), 60_000);
    log.info('AndryBot avviato');
  }

  async stop() {
    this.running = false;
    clearInterval(this._syncTimer);
    this._stopReflection?.();
    this.watcher?.stop();
    await this.events?.stop?.();
    for (const [, u] of this.units) u.chat.disconnect();
    this.units.clear();
  }

  // manda un messaggio nel canale attraverso l'unità giusta
  say(channel, text) { this.units.get(channel)?.chat.say(channel, text); }

  // uno streamer è "pronto" se ha concesso i permessi con gli scope chat
  _ready(s) {
    const t = tokens.get('broadcaster', s.login);
    return !!t && t.scopes.includes('chat:edit');
  }

  // crea/distrugge le unità in base allo stato sulla dashboard
  async syncChannels() {
    if (!this.running) return;
    const wanted = new Map(streamers.active().filter(s => this._ready(s)).map(s => [s.login, s]));

    for (const [login, s] of wanted) {
      if (this.units.has(login)) continue;
      try {
        const chat = new ChatBot({ auth: this.auth, login, kind: 'broadcaster' });
        const onMessage = createMessageHandler({
          chat, helix: this.helix, brain: this.brain, clips: this.clips, botLogin: login,
        });
        chat.on('message', msg => {
          onMessage(msg).catch(e => log.error(`#${login} gestione messaggio:`, e?.message || e));
          if (!msg.isSelf) this.clips.onActivity(msg.channel);   // rilevatore "hype" per le clip automatiche
          this.brain.observe?.(msg);                             // apprendimento passivo (anche dai messaggi dello streamer)
          // effetti & suoni: un comando come !airhorn accende l'overlay OBS.
          // Non deve MAI rompere il flusso dei messaggi, quindi try/catch.
          try { this.effects?.tryTrigger(msg, (t) => this.say(msg.channel, t)); }
          catch (e) { log.error(`#${login} effetti:`, e?.message || e); }
          // moduli: automazioni dello streamer (comando/parola/primo messaggio).
          // onMessage assorbe i propri errori, ma proteggiamo comunque il flusso.
          try { this.modules?.onMessage(msg, (t) => this.say(msg.channel, t)); }
          catch (e) { log.error(`#${login} moduli:`, e?.message || e); }
          // plugin operatore (opzionali): alimentiamo l'event-bus.
          try { this.bus?.emit('message', msg); } catch (e) { log.debug('bus message:', e?.message || e); }
        });
        await chat.connect();
        chat.join(login);
        this.units.set(login, { chat });
        this.events.watch(s).catch?.(() => {});
        log.info(`Unità attiva per #${login} (parla come @${login})`);
      } catch (e) {
        log.error(`avvio unità #${login} fallito:`, e?.message || e);
      }
    }

    for (const [login, u] of this.units) {
      if (wanted.has(login)) continue;
      u.chat.disconnect();
      this.events.unwatch(login);
      this.units.delete(login);
      log.info(`Unità spenta per #${login}`);
    }
  }

  // eventi Twitch (follow, sub, raid, live on/off, riscatti punti)
  _onTwitchEvent(ev) {
    const { channel, type, data } = ev;
    memory.logMessage(channel, '[evento]', '', `${type} ${JSON.stringify(data || {})}`.slice(0, 300), true);
    this.brain?.onEvent?.(ev, (text) => this.say(channel, text));
    // moduli: automazioni con trigger 'evento' (follow, sub, raid, cheer, ...)
    try { this.modules?.onEvent(ev, (t) => this.say(channel, t)); }
    catch (e) { log.error(`#${channel} moduli evento:`, e?.message || e); }
    // plugin operatore (opzionali)
    try { this.bus?.emit('event', ev); } catch (e) { log.debug('bus event:', e?.message || e); }
  }

  // stato riassuntivo per la dashboard
  status() {
    return {
      running: this.running,
      channels: [...this.units.keys()],
      streamers: streamers.list().length,
    };
  }
}
