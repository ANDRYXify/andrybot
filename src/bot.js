// BotManager: il "direttore d'orchestra" di SocialBot.
// Per OGNI streamer approvato e acceso crea una "unità": una
// connessione chat autenticata CON L'ACCOUNT DELLO STREAMER (il bot
// parla come lui), un gestore messaggi e le sottoscrizioni agli
// eventi Twitch. Tiene tutto sincronizzato con la dashboard.
import { makeLog } from './logger.js';
import { config } from './config.js';
import { tokens, streamers, memory } from './db.js';
import { ChatBot } from './twitch/chat.js';
import { EventHub } from './twitch/events.js';
import { Brain } from './ai/brain.js';
import * as persona from './ai/persona.js';
import * as games from './features/games.js';
import * as vip from './features/vip.js';
import { createMessageHandler } from './features/handler.js';
import { ClipEngine } from './features/clips.js';
import { scheduleReflection } from './ai/reflection.js';
import { StreamWatcher } from './stream/watcher.js';
import { LiveListener } from './stream/listener.js';

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
    this.listeners = new Map();      // login → LiveListener (ascolto live audio, opt-in)
    this.brain = null;
    this.clips = null;
    this.events = null;
    this.watcher = null;
    this._syncTimer = null;
    this._animaTimer = null;
    this._vipTimer = null;
    this._premiTimer = null;
    this._stopReflection = null;
    this._capAvvisoDato = false;     // il tetto ascolti è già stato loggato una volta?
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
    // battito dell'anima: umore che "respira" + proattività dosata dall'autonomia
    this._animaTimer = setInterval(() => this._battitoAnima(), 3 * 60_000);
    // VIP: rimozione automatica degli scaduti + premi periodici (settimanale/mensile)
    this._vipTimer = setInterval(() => vip.controllaScadenze(this.helix).catch(() => {}), 5 * 60_000);
    this._premiTimer = setInterval(() => this._controllaPremi(), 60 * 60_000);
    log.info('SocialBot avviato');
  }

  async stop() {
    this.running = false;
    clearInterval(this._syncTimer);
    clearInterval(this._animaTimer);
    clearInterval(this._vipTimer);
    clearInterval(this._premiTimer);
    this._stopReflection?.();
    this.watcher?.stop();
    // spegni tutti gli ascolti live (audio): non devono restare orfani
    for (const [, l] of this.listeners) { try { l.stop(); } catch { /* niente */ } }
    this.listeners.clear();
    await this.events?.stop?.();
    for (const [, u] of this.units) u.chat.disconnect();
    this.units.clear();
  }

  // manda un messaggio nel canale attraverso l'unità giusta
  say(channel, text) { this.units.get(channel)?.chat.say(channel, text); }

  // Battito dell'anima: l'umore "respira" (torna piano alla calma) e, se lo
  // streamer lascia la proattività accesa, ogni tanto il bot dice qualcosa di
  // sua iniziativa — dosato dalla stessa manopola "Chat autonoma", e solo se
  // c'è gente che parla (mai in una chat vuota).
  _battitoAnima() {
    try {
      persona.respira();
      for (const login of this.units.keys()) {
        const s = streamers.get(login);
        if (!s || s.settings?.proattivo === false) continue;   // proattività disattivabile
        const auto = Math.min(0.5, Math.max(0, Number(s.settings?.spontaneita) || 0));
        if (auto <= 0) continue;                                // autonomia a zero = zitto
        if ((memory.messageRate?.(login) || 0) < 1) continue;   // chat ferma: non parlare da solo
        if (Math.random() < auto * 0.4) {
          // alterna: a volte una promo social (se accesa e c'è un link imparato),
          // a volte una battuta dell'anima — così è vario e utile, mai ripetitivo.
          let t = null;
          if (s.settings?.promoSocial !== false && Math.random() < 0.45) t = games.promoSociale(login);
          if (!t) t = persona.proattiva();
          if (t) this.say(login, t);
        }
      }
    } catch (e) { log.error('battito anima:', e?.message || e); }
  }

  // Premi periodici: se lo streamer li ha attivati, ogni settimana/mese dà il
  // VIP ai più affezionati (top monete). Controllato ogni ora.
  async _controllaPremi() {
    try {
      for (const login of this.units.keys()) {
        const s = streamers.get(login);
        const p = s?.settings?.premioVip;
        if (!p?.attivo) continue;
        const mese = p.periodo === 'mese';
        const periodoMs = (mese ? 30 : 7) * 24 * 60 * 60_000;
        if (Date.now() - (Number(s.settings.premioVipUltimo) || 0) < periodoMs) continue;
        const durata = vip.parseDurata(mese ? 'mese' : 'settimana');
        await vip.premiaTopMonete(this.helix, login, Math.min(5, Math.max(1, Number(p.quanti) || 1)), durata, (t) => this.say(login, t));
        streamers.setSettings(login, { ...s.settings, premioVipUltimo: Date.now() });
      }
    } catch (e) { log.error('premi VIP:', e?.message || e); }
  }

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
          // amicizia GLOBALE: chi interagisce diventa piano piano "amico" del
          // bot (solo un'affinità, mai contenuti né in quale canale).
          if (!msg.isSelf) { try { persona.interagisci(msg.user); } catch { /* niente */ } }
          // minigiochi: monete passive + comandi (!dado, !slot, !trivia, ...)
          try { games.accredita(msg); games.tryGame(msg, (t) => this.say(msg.channel, t)); }
          catch (e) { log.error(`#${login} giochi:`, e?.message || e); }
          // comandi VIP (mod/streamer): !vip @nome [durata], !unvip, !viplista
          vip.tryVipCommand(this.helix, msg, (t) => this.say(msg.channel, t)).catch((e) => log.error(`#${login} vip:`, e?.message || e));
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

    // riconciliazione degli ascolti live (audio → clip nei momenti salienti).
    // In try/catch a parte: l'ascolto non deve MAI compromettere il resto.
    try { await this.reconcileListeners(); }
    catch (e) { log.error('reconcileListeners:', e?.message || e); }
  }

  // Pool degli ascolti live lato server. Per ogni streamer attivo che ha
  // acceso `ascoltoLive`, se è in live e siamo sotto il cap globale, avvia
  // un LiveListener che crea clip sui picchi audio. Spegne gli ascolti non
  // più desiderati, di chi non è più live, o quelli "morti" (offline/errore).
  async reconcileListeners() {
    // bot fermo: nessun ascolto deve sopravvivere
    if (!this.running) {
      for (const [login, l] of this.listeners) {
        try { l.stop(); } catch { /* niente */ }
        this.listeners.delete(login);
      }
      return;
    }

    const cap = config.maxListeners;

    // chi vuole essere ascoltato: attivi con impostazione ascoltoLive === true
    const vogliono = streamers.active().filter(s => s.settings?.ascoltoLive === true);
    const voglionoSet = new Set(vogliono.map(s => s.login));

    // 1) spegni gli ascolti non più desiderati o morti (offline/binario assente)
    for (const [login, l] of this.listeners) {
      if (!voglionoSet.has(login) || l.morto) {
        try { l.stop(); } catch { /* niente */ }
        this.listeners.delete(login);
        log.info(`ascolto live spento per #${login}`);
      }
    }

    // cap a 0 = funzione globalmente disattivata: spegni tutto e non avviare nulla
    if (cap <= 0) {
      for (const [login, l] of this.listeners) {
        try { l.stop(); } catch { /* niente */ }
        this.listeners.delete(login);
        log.info(`ascolto live spento per #${login} (funzione disattivata)`);
      }
      return;
    }

    // 2) avvia gli ascolti mancanti, rispettando il CAP globale
    for (const s of vogliono) {
      const login = s.login;
      if (this.listeners.has(login)) continue;

      // tetto raggiunto: non avviarne altri (log una sola volta)
      if (this.listeners.size >= cap) {
        if (!this._capAvvisoDato) {
          log.warn(`cap ascolti live raggiunto (${cap}): altri canali resteranno in attesa`);
          this._capAvvisoDato = true;
        }
        continue;
      }

      // è davvero in live? (l'audio esiste solo mentre trasmette)
      let live = null;
      try { live = await this.helix.getStream(login); }
      catch (e) { log.debug(`ascolto: getStream #${login} fallito:`, e?.message || e); continue; }
      if (!live) continue;

      const sensibilita = Number(s.settings?.ascoltoSensibilita) || 5;
      const listener = new LiveListener({
        login,
        sensibilita,
        onSpike: () => {
          try { this.clips?.createClip(login, 'momento saliente (audio della live)'); }
          catch (e) { log.error(`clip da ascolto #${login}:`, e?.message || e); }
        },
        log,
      });
      try {
        listener.start();
        this.listeners.set(login, listener);
        log.info(`ascolto live avviato per #${login} (sensibilità ${sensibilita})`);
      } catch (e) {
        log.error(`avvio ascolto live #${login} fallito:`, e?.message || e);
      }
    }

    // tornati sotto il tetto: si potrà ri-loggare il prossimo "cap raggiunto"
    if (this.listeners.size < cap) this._capAvvisoDato = false;
  }

  // Crea una clip a comando (usata dall'API vocale / ingresso esterno).
  async creaClip(channel, motivo) {
    return this.clips?.createClip(channel, motivo || 'comando esterno');
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
      ascoltando: [...this.listeners.keys()],   // canali sotto ascolto live (audio)
      streamers: streamers.list().length,
    };
  }
}
