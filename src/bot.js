// BotManager: il "direttore d'orchestra" di SocialBot.
// Per OGNI streamer approvato e acceso crea una "unità": una
// connessione chat autenticata CON L'ACCOUNT DELLO STREAMER (il bot
// parla come lui), un gestore messaggi e le sottoscrizioni agli
// eventi Twitch. Tiene tutto sincronizzato con la dashboard.
import { makeLog } from './logger.js';
import { config } from './config.js';
import { tokens, streamers, memory, tgConf, compleanni, pointAlerts } from './db.js';
import { ChatBot } from './twitch/chat.js';
import { EventHub } from './twitch/events.js';
import { Brain } from './ai/brain.js';
import * as persona from './ai/persona.js';
import * as games from './features/games.js';
import * as giveaway from './features/giveaway.js';
import * as vip from './features/vip.js';
import * as telegram from './features/telegram.js';
import * as antispam from './features/antispam.js';
import * as tiktok from './features/tiktok.js';
import * as youtube from './features/youtube.js';
import * as instagram from './features/instagram.js';
import * as compleanniFeat from './features/compleanni.js';
import * as gamesbridge from './features/gamesbridge.js';
import * as quotes from './features/quotes.js';
import * as model from './ai/model.js';
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
    this._annunciTimer = null;       // poll degli annunci "gioco attivo" (regole in chat)
    this._stopReflection = null;
    this._capAvvisoDato = false;     // il tetto ascolti è già stato loggato una volta?
    this._liveState = new Map();     // login → bool: se lo streamer è in live adesso
    this._tiktokTimer = null;
    this._tiktokLive = new Map();    // login → bool: in diretta su TikTok adesso
    this._tiktokUltima = new Map();  // login → ts ultima notifica TikTok (anti-doppioni)
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
    // il watcher ci dice live/offline di ogni streamer: da lì partono le
    // notifiche Telegram e la modalità "quando live".
    this.watcher = new StreamWatcher({
      helix: this.helix, brain: this.brain,
      onLive: (login, isLive, data) => this._setLive(login, isLive, data),
    });
    this.watcher.start();
    this._stopReflection = scheduleReflection({ brain: this.brain });
    // Il "cervello" che parla con parole sue vive in un PROCESSO SEPARATO
    // (container 'brain', Python): si avvia da solo col compose. Il bot lo
    // interroga via HTTP con timeout corto (vedi ai/brainpy.js), così i comandi
    // restano sempre istantanei anche mentre il cervello pensa.

    this.running = true;
    await this.syncChannels();
    this._syncTimer = setInterval(() => this.syncChannels().catch(() => {}), 60_000);
    // battito dell'anima: umore che "respira" + proattività dosata dall'autonomia
    this._animaTimer = setInterval(() => this._battitoAnima(), 3 * 60_000);
    // VIP: rimozione automatica degli scaduti + premi periodici (settimanale/mensile)
    this._vipTimer = setInterval(() => vip.controllaScadenze(this.helix).catch(() => {}), 5 * 60_000);
    this._premiTimer = setInterval(() => this._controllaPremi(), 60 * 60_000);
    // TikTok: rilevamento live best-effort (l'affidabile è il webhook)
    this._tiktokTimer = setInterval(() => this._controllaTikTok().catch(() => {}), 3 * 60_000);
    // Nuovi post: avvisa quando esce un nuovo video su YouTube (via RSS, ogni 10 min).
    this._ytId = new Map();     // login → id canale YouTube risolto (cache)
    this._postTimer = setInterval(() => this._controllaPost().catch(() => {}), 10 * 60_000);
    // Giochi del sito: poll delle regole da annunciare in chat quando parte una
    // partita (attivazione automatica anche per le partite create dal sito).
    this._annunciTimer = setInterval(() => this._pollAnnunciGiochi(), 15_000);
    // Compleanni: auguri automatici nel gruppo Telegram (controllo ogni ora;
    // un membro riceve gli auguri UNA volta l'anno, all'inizio del suo giorno).
    this._compleTimer = setInterval(() => this._controllaCompleanni().catch(() => {}), 60 * 60_000);
    setTimeout(() => this._controllaCompleanni().catch(() => {}), 30_000);
    // Manche automatiche: il bot lancia un gioco a caso, a intervalli casuali,
    // sui canali che l'hanno attivato (controllo ogni minuto).
    this._mancheProx = new Map();     // login → ts della prossima manche
    this._mancheTimer = setInterval(() => this._manche(), 60_000);
    // Allenamento continuo: distilla i discorsi dello streamer nel motore veloce
    // (ogni 12 min, solo se attivo e con materiale nuovo).
    this._distillaTimer = setInterval(() => this._distilla(), 12 * 60_000);
    // Proattività su Telegram (chat privata col proprietario): ogni tanto LEI scrive
    // per prima, curiosa. Controllo ogni 20 min; poi ritmo umano + orari + casualità.
    this._tgProattivoUltimo = new Map();   // login → ts dell'ultimo messaggio proattivo
    this._tgProattivoTimer = setInterval(() => this._tgProattivo(), 20 * 60_000);
    // Percorso di crescita: a ogni AVVIO (il server è sempre acceso, ma se si
    // riavvia lei si "risveglia") si chiede cosa le manca per capire meglio, e ogni
    // 3 ore ci ritorna sopra. È il suo obiettivo che poi guida la curiosità.
    this._risveglioTO = setTimeout(() => this._percorso(), 60_000);   // ~1 min dopo l'avvio
    this._percorsoTimer = setInterval(() => this._percorso(), 3 * 60 * 60_000);
    log.info('SocialBot avviato');
  }

  async stop() {
    this.running = false;
    clearInterval(this._syncTimer);
    clearInterval(this._animaTimer);
    clearInterval(this._vipTimer);
    clearInterval(this._premiTimer);
    clearInterval(this._tiktokTimer);
    clearInterval(this._postTimer);
    clearInterval(this._annunciTimer);
    clearInterval(this._distillaTimer);
    clearInterval(this._mancheTimer);
    clearInterval(this._compleTimer);
    clearInterval(this._tgProattivoTimer);
    clearInterval(this._percorsoTimer);
    clearTimeout(this._risveglioTO);
    this._stopReflection?.();
    this.watcher?.stop();
    // spegni tutti gli ascolti live (audio): non devono restare orfani
    for (const [, l] of this.listeners) { try { l.stop(); } catch { /* niente */ } }
    this.listeners.clear();
    await this.events?.stop?.();
    // salva i modelli IA locali (semantica auto-addestrata) prima di chiudere
    try { model.salvaTutto(); } catch { /* niente */ }
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

  // Manche automatiche: per ogni canale che le ha attivate, ogni tanto (intervallo
  // casuale tra min e max minuti) il bot lancia un gioco a caso. Solo a chat viva
  // (mai in una chat vuota) e, se richiesto, solo mentre è in diretta.
  _prossimaManche(m) {
    const min = Math.min(360, Math.max(1, Number(m.minMin) || 15));
    const max = Math.max(min, Math.min(360, Number(m.maxMin) || 45));
    return Date.now() + (min + Math.random() * (max - min)) * 60_000;
  }
  _manche() {
    try {
      for (const login of this.units.keys()) {
        const s = streamers.get(login);
        const m = s?.settings?.manche;
        // manche spente, o giochi spenti (anche per tier) → niente e resetta
        if (!m?.attivo || s.settings?.giochi === false) { this._mancheProx.delete(login); continue; }
        if (m.soloLive && this._liveState.get(login) !== true) continue;   // solo live, ma non è live
        if ((memory.messageRate?.(login) || 0) < 1) continue;              // chat ferma: non disturbare
        const prox = this._mancheProx.get(login);
        if (prox === undefined) { this._mancheProx.set(login, this._prossimaManche(m)); continue; }  // pianifica la prima
        if (Date.now() < prox) continue;
        games.avviaManche(login, (t) => this.say(login, t));
        this._mancheProx.set(login, this._prossimaManche(m));
      }
    } catch (e) { log.error('manche:', e?.message || e); }
  }

  // ALLENAMENTO CONTINUO: mentre lo streamer è attivo (in live o con chat viva), il
  // cervello grosso distilla i suoi discorsi nel MOTORE VELOCE (conoscenza locale).
  // Si auto-salta se non c'è materiale nuovo. Gira lento in background: non tocca la
  // reattività dei comandi (il cervello è un processo a parte).
  _distilla() {
    try {
      for (const login of this.units.keys()) {
        const s = streamers.get(login);
        if (s?.settings?.iaLocale === false) continue;   // IA locale spenta → niente allenamento
        const attivo = this._liveState.get(login) === true || (memory.messageRate?.(login) || 0) >= 1;
        if (attivo) this.brain.distilla(login).catch(() => {});
      }
    } catch (e) { log.error('distilla:', e?.message || e); }
  }

  // Il "risveglio" / percorso: per ogni streamer con cervello, lei si chiede cosa
  // le manca per capire meglio e si dà un obiettivo (annotato nel diario).
  async _percorso() {
    try {
      for (const s of streamers.active()) {
        if (s.settings?.iaLocale === false) continue;
        await this.brain?.risveglio?.(s.login);
      }
    } catch (e) { log.error('percorso:', e?.message || e); }
  }

  // È "ora sveglia" a Roma? (niente messaggi proattivi di notte)
  _oraSveglia() {
    try {
      const h = Number(new Intl.DateTimeFormat('it-IT', {
        timeZone: 'Europe/Rome', hour: 'numeric', hourCycle: 'h23',
      }).format(new Date()));
      return h >= 9 && h < 23;
    } catch { return true; }
  }

  // Proattività su Telegram: ogni tanto LEI scrive per prima al proprietario, di
  // sua iniziativa (curiosa). Ritmo umano: mai di notte, non a orologeria, con
  // ore di distanza. La curiosità arriva dalle lacune della rete (vedi brain).
  _tgProattivo() {
    try {
      if (!this._oraSveglia()) return;
      const ORA = Date.now();
      for (const s of streamers.active()) {
        const login = s.login;
        if (s.settings?.iaLocale === false) continue;          // cervello spento → niente
        if (s.settings?.proattivoTg === false) continue;       // disattivata dallo streamer
        const conf = tgConf.get(login);
        if (!conf?.token || !conf.owner_tg_id) continue;       // Telegram non legato al proprietario
        if ((conf.dm_modo || 'me') === 'off') continue;        // DM privati spenti
        const ultimo = this._tgProattivoUltimo.get(login) || 0;
        if (ORA - ultimo < 3.5 * 3600_000) continue;           // almeno ~3 ore e mezza dall'ultima
        if (Math.random() > 0.45) continue;                    // non a orologeria: a volte tace
        this._tgProattivoUltimo.set(login, ORA);               // segna subito (evita doppioni)
        this.brain?.messaggioProattivo(login, { nome: conf.owner_tg_nome || '' })
          .then((testo) => { if (testo) telegram.inviaMessaggio(conf.token, conf.owner_tg_id, testo).catch(() => {}); })
          .catch(() => {});
      }
    } catch (e) { log.error('tgProattivo:', e?.message || e); }
  }

  // uno streamer è "pronto" se ha concesso i permessi con gli scope chat
  _ready(s) {
    const t = tokens.get('broadcaster', s.login);
    return !!t && t.scopes.includes('chat:edit');
  }

  // Modalità di attivazione scelta dallo streamer:
  //  'sempre'  → 24/7 (sempre in chat quando è acceso)
  //  'live'    → solo mentre è in diretta (entra/esce col live)
  //  'manuale' → lo governa l'interruttore acceso/spento (come 'sempre' a livello di runtime)
  _modalitaConsente(s) {
    const m = s?.settings?.modalita || 'sempre';
    if (m === 'live') return this._liveState.get(s.login) === true;
    return true;
  }

  // crea/distrugge le unità in base allo stato sulla dashboard
  async syncChannels() {
    if (!this.running) return;
    const wanted = new Map(
      streamers.active()
        .filter(s => this._ready(s))
        .filter(s => this._modalitaConsente(s))
        .map(s => [s.login, s])
    );

    for (const [login, s] of wanted) {
      if (this.units.has(login)) continue;
      try {
        const chat = new ChatBot({ auth: this.auth, login, kind: 'broadcaster' });
        const onMessage = createMessageHandler({
          chat, helix: this.helix, brain: this.brain, clips: this.clips, botLogin: login,
        });
        chat.on('message', msg => this._gestisciMessaggio(login, msg, onMessage));
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

  // Catena di ingresso di ogni messaggio: prima i "guardiani" (antispam, poi il
  // ponte giochi del sito); se uno dei due lo gestisce, il messaggio NON viene
  // elaborato oltre. Altrimenti prosegue col flusso normale.
  async _gestisciMessaggio(login, msg, onMessage) {
    // 1) ANTISPAM: se è spam lo elimina e stop (il bot non "reagisce" allo spam)
    try {
      if (await antispam.tryAntispam(this.helix, msg, (t) => this.say(msg.channel, t))) return;
    } catch (e) { log.error(`#${login} antispam:`, e?.message || e); }
    // 2) GIOCHI DEL SITO: se è un comando gestito dal sito, risponde e stop
    try {
      if (await gamesbridge.tryGamesBridge(msg, (t) => this.say(msg.channel, t))) return;
    } catch (e) { log.error(`#${login} giochi:`, e?.message || e); }
    // 3) flusso normale
    this._elaboraMessaggio(login, msg, onMessage);
  }

  // Elaborazione normale di un messaggio (chiamata solo se non gestito prima).
  _elaboraMessaggio(login, msg, onMessage) {
    onMessage(msg).catch(e => log.error(`#${login} gestione messaggio:`, e?.message || e));
    if (!msg.isSelf) this.clips.onActivity(msg.channel);   // rilevatore "hype" per le clip automatiche
    this.brain.observe?.(msg);                             // apprendimento passivo (anche dai messaggi dello streamer)
    // amicizia GLOBALE: chi interagisce diventa piano piano "amico" del bot
    // (solo un'affinità, mai contenuti né in quale canale).
    if (!msg.isSelf) { try { persona.interagisci(msg.user); } catch { /* niente */ } }
    // minigiochi: monete passive + comandi (!dado, !slot, !trivia, ...)
    try { games.accredita(msg); games.tryGame(msg, (t) => this.say(msg.channel, t)); }
    catch (e) { log.error(`#${login} giochi:`, e?.message || e); }
    // giveaway / sorteggi (!giveaway, !join, !estrai) — segue l'add-on Giochi
    try { giveaway.tryGiveaway(msg, (t) => this.say(msg.channel, t)); }
    catch (e) { log.error(`#${login} giveaway:`, e?.message || e); }
    // comandi VIP (mod/streamer): !vip @nome [durata], !unvip, !viplista
    vip.tryVipCommand(this.helix, msg, (t) => this.say(msg.channel, t)).catch((e) => log.error(`#${login} vip:`, e?.message || e));
    // citazioni (!cita) — lo shoutout (!so) lo gestisce già handler.js
    try { quotes.tryQuoteCommand(msg, (t) => this.say(msg.channel, t)); } catch (e) { log.error(`#${login} citazioni:`, e?.message || e); }
    // effetti & suoni: un comando come !airhorn accende l'overlay OBS.
    try { this.effects?.tryTrigger(msg, (t) => this.say(msg.channel, t)); }
    catch (e) { log.error(`#${login} effetti:`, e?.message || e); }
    // moduli: automazioni dello streamer (comando/parola/primo messaggio).
    try { this.modules?.onMessage(msg, (t) => this.say(msg.channel, t)); }
    catch (e) { log.error(`#${login} moduli:`, e?.message || e); }
    // plugin operatore (opzionali): alimentiamo l'event-bus.
    try { this.bus?.emit('message', msg); } catch (e) { log.debug('bus message:', e?.message || e); }
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
    // live on/off passano dal gestore dedicato (dedup + notifiche + modalità live)
    if (type === 'stream.online' || type === 'stream.offline') {
      this._setLive(channel, type === 'stream.online', data);
      return;
    }
    // riscatto di un premio a PUNTI CANALE → alert mappato (effetto + messaggio)
    if (type === 'channel.channel_points_custom_reward_redemption.add') {
      this._premioRiscattato(channel, data);
    }
    this._dispatchEvent(ev);
  }

  // Uno spettatore ha riscattato un premio a punti canale: se è mappato a un
  // alert, lo spariamo (effetto in overlay + eventuale messaggio in chat) e
  // segniamo il riscatto come completato.
  _premioRiscattato(channel, data) {
    try {
      const rewardId = data?.reward?.id;
      if (!rewardId) return;
      const m = pointAlerts.getByReward(channel, rewardId);
      if (!m) return;                                   // premio non nostro / non mappato
      const utente = data?.user_name || data?.user_login || 'qualcuno';
      if (m.effetto) { try { this.effects?.fire?.(channel, m.effetto); } catch { /* niente */ } }
      if (m.testo) this.say(channel, String(m.testo).replace(/\{user\}/g, utente).slice(0, 400));
      // togli il riscatto dalla coda "in sospeso" (best-effort, solo premi nostri)
      this.helix?.aggiornaRedemption?.(channel, rewardId, data?.id, 'FULFILLED').catch(() => {});
      log.info(`premio punti canale «${m.titolo}» riscattato da ${utente} su #${channel}`);
    } catch (e) { log.error('premioRiscattato:', e?.message || e); }
  }

  // Consegna un evento a cervello + moduli + plugin (parte comune).
  _dispatchEvent(ev) {
    const { channel, type, data } = ev;
    memory.logMessage(channel, '[evento]', '', `${type} ${JSON.stringify(data || {})}`.slice(0, 300), true);
    this.brain?.onEvent?.(ev, (text) => this.say(channel, text));
    // moduli: automazioni con trigger 'evento' (follow, sub, raid, cheer, ...)
    try { this.modules?.onEvent(ev, (t) => this.say(channel, t)); }
    catch (e) { log.error(`#${channel} moduli evento:`, e?.message || e); }
    // plugin operatore (opzionali)
    try { this.bus?.emit('event', ev); } catch (e) { log.debug('bus event:', e?.message || e); }
  }

  // Fonte UNICA di verità per lo stato live/offline (arriva sia da EventSub,
  // istantaneo, sia dal watcher, che copre anche chi non è connesso in chat —
  // es. modalità "quando live" con bot ancora offline). Idempotente: reagisce
  // solo ai VERI cambi di stato, così non si notifica due volte.
  _setLive(login, isLive, data) {
    const ch = String(login || '').toLowerCase();
    if (!ch) return;
    const prev = this._liveState.get(ch);
    if (prev === isLive) return;                 // nessun cambiamento: stop
    this._liveState.set(ch, isLive);
    // riconcilia le unità: la modalità "quando live" entra/esce col live
    this.syncChannels().catch(() => {});
    // Primo rilevamento (bot appena avviato): NON è una transizione vera.
    // Evita di annunciare "è live!" se il bot riparte a diretta già in corso.
    if (prev === undefined) return;
    const ev = { channel: ch, type: isLive ? 'stream.online' : 'stream.offline', data: data || {} };
    this._dispatchEvent(ev);
    if (isLive) this._notificaTelegram(ch);
    else this._chiudiTelegram(ch);
    this._reagisciAllaDiretta(ch, isLive);   // lei se ne accorge e ti scrive (presente/consapevole)
  }

  // Consapevolezza: quando parti/finisci la diretta, LEI se ne accorge e ti scrive
  // in privato di sua iniziativa (reazione affettuosa, non l'avviso automatico del
  // gruppo). Gated come la proattività; niente guardia notturna qui (sei sveglio,
  // hai appena streammato). Evita doppioni aggiornando il timer proattivo.
  _reagisciAllaDiretta(login, isLive) {
    try {
      const s = streamers.get(login);
      if (s?.settings?.iaLocale === false || s?.settings?.proattivoTg === false) return;
      const conf = tgConf.get(login);
      if (!conf?.token || !conf.owner_tg_id || (conf.dm_modo || 'me') === 'off') return;
      const spunto = isLive
        ? 'lui è appena andato in diretta ora: reagisci con affetto/entusiasmo e chiedigli come si sente'
        : 'lui ha appena finito la diretta: reagisci con calore e chiedigli com\'è andata';
      this._tgProattivoUltimo?.set(login, Date.now());
      this.brain?.messaggioProattivo(login, { nome: conf.owner_tg_nome || '', spunto })
        .then((t) => { if (t) telegram.inviaMessaggio(conf.token, conf.owner_tg_id, t).catch(() => {}); })
        .catch(() => {});
    } catch (e) { log.debug('reagisciAllaDiretta:', e?.message || e); }
  }

  // Manda la notifica Telegram "è live" nel gruppo dello streamer, se ha
  // configurato e acceso le notifiche. Anti-doppioni sull'id della live.
  async _notificaTelegram(login) {
    try {
      const conf = tgConf.get(login);
      if (!conf?.attivo || !conf.token || !conf.chat_id) return;
      const info = await this.helix.getStream(login).catch(() => null);
      const streamId = String(info?.id || '');
      if (streamId && streamId === conf.ultima_live) return;   // già avvisato per questa diretta
      const s = streamers.get(login);
      const r = await telegram.notificaLive(conf, { login, display: s?.display || login }, info);
      if (r?.ok) {
        if (streamId) tgConf.setUltimaLive(login, streamId);
        log.info(`notifica Telegram inviata per #${login}`);
        // Se richiesto, fissa l'avviso in cima al gruppo e ricorda il suo id
        // così a live spenta possiamo eliminarlo. Il pin richiede che il bot
        // sia admin: se non lo è fallisce in silenzio (l'avviso resta comunque).
        const msgId = r.result?.message_id;
        if (msgId) {
          tgConf.setMsgId(login, msgId);
          if (conf.pin_live) {
            // silenzioso:false → il "fissato" avvisa TUTTI i membri del gruppo
            const p = await telegram.fissaMessaggio(conf.token, conf.chat_id, msgId, { silenzioso: false });
            if (!p.ok) log.warn(`pin Telegram #${login}: ${p.errore} (il bot è admin del gruppo con permesso di fissare?)`);
          }
        }
      }
    } catch (e) { log.error(`notifica Telegram #${login}:`, e?.message || e); }
  }

  // Live spenta: se l'avviso era stato fissato, lo elimina dal gruppo (togliendo
  // così anche il "fissato"). Best-effort e idempotente: se non c'è nulla da
  // eliminare, non fa niente. Il bot può cancellare i propri messaggi entro 48h.
  async _chiudiTelegram(login) {
    try {
      const conf = tgConf.get(login);
      if (!conf?.token || !conf.chat_id) return;
      const msgId = conf.msg_id;
      if (!msgId) return;
      tgConf.setMsgId(login, '');   // azzera comunque: un solo tentativo
      if (!conf.pin_live) return;   // eliminazione legata all'opzione "fissa/elimina"
      const r = await telegram.eliminaMessaggio(conf.token, conf.chat_id, msgId);
      if (r.ok) log.info(`avviso Telegram eliminato per #${login} (live finita)`);
      else log.warn(`elimina Telegram #${login}: ${r.errore}`);
    } catch (e) { log.error(`chiudi Telegram #${login}:`, e?.message || e); }
  }

  // Giochi del sito: per ogni canale connesso col ponte acceso, chiede al sito
  // se ci sono regole/comandi da scrivere in chat (partita appena creata dal
  // sito). Se sì, le scrive con l'account dello streamer. Silenzioso se vuoto.
  _pollAnnunciGiochi() {
    try {
      for (const login of this.units.keys()) {
        const cfg = streamers.get(login)?.settings?.giochiSito;
        if (!cfg?.attivo || !cfg.endpoint || !cfg.secret) continue;
        gamesbridge.pollAnnunci(login, (t) => this.say(login, t)).catch(() => {});
      }
    } catch (e) { log.error('poll annunci giochi:', e?.message || e); }
  }

  // TikTok: giro di rilevamento live (best-effort) su chi ha configurato e
  // acceso il TikTok. Dedup + "primo rilevamento" silenzioso come per Twitch.
  async _controllaTikTok() {
    try {
      for (const s of streamers.active()) {
        const tk = s.settings?.tiktok;
        if (!tk?.attivo || !tk.username) continue;
        const r = await tiktok.isLive(tk.username);
        if (r.sconosciuto) continue;                       // endpoint incerto: non tocchiamo lo stato
        const prev = this._tiktokLive.get(s.login);
        if (prev === r.live) continue;
        this._tiktokLive.set(s.login, r.live);
        if (prev === undefined) continue;                  // primo giro: solo seed, niente avviso
        if (r.live) this.notificaTikTok(s.login).catch(() => {});
        else this._chiudiTelegramTikTok(s.login).catch(() => {});   // live TikTok finita: elimina l'avviso
      }
    } catch (e) { log.error('controllaTikTok:', e?.message || e); }
  }

  // Live TikTok spenta: elimina dal gruppo l'avviso (se era stato fissato/inviato),
  // togliendo così anche il "fissato". Best-effort, message_id separato da Twitch.
  async _chiudiTelegramTikTok(login) {
    try {
      const conf = tgConf.get(login);
      if (!conf?.token || !conf.chat_id) return;
      const msgId = conf.msg_id_tk;
      if (!msgId) return;
      tgConf.setMsgIdTk(login, '');   // azzera comunque: un solo tentativo
      if (!conf.pin_live) return;     // eliminazione legata all'opzione "fissa/elimina"
      const r = await telegram.eliminaMessaggio(conf.token, conf.chat_id, msgId);
      if (r.ok) log.info(`avviso TikTok Telegram eliminato per #${login} (live finita)`);
      else log.warn(`elimina TikTok Telegram #${login}: ${r.errore}`);
    } catch (e) { log.error(`chiudi TikTok Telegram #${login}:`, e?.message || e); }
  }

  // Auguri di compleanno: per ogni streamer con la funzione accesa e il gruppo
  // collegato, manda gli auguri a chi compie gli anni oggi (fuso italiano). Un
  // membro riceve gli auguri al massimo una volta l'anno (campo last_auguri).
  async _controllaCompleanni() {
    try {
      const { giorno, mese, anno } = compleanniFeat.oggiRoma();
      for (const s of streamers.active()) {
        const cfg = s.settings?.telegramAuguri;
        if (!cfg?.attivo) continue;
        const conf = tgConf.get(s.login);
        if (!conf?.token || !conf.chat_id) continue;
        const oggi = compleanni.oggi(s.login, giorno, mese).filter((c) => c.last_auguri !== anno);
        for (const c of oggi) {
          const testo = compleanniFeat.costruisciAuguri(cfg.messaggio, { nome: c.nome, tgUserId: c.tg_user_id });
          const r = await telegram.inviaMessaggio(conf.token, conf.chat_id, testo);
          if (r.ok) {
            compleanni.markAuguri(s.login, c.tg_user_id, anno);
            log.info(`auguri di compleanno inviati per #${s.login} → ${c.nome}`);
          }
        }
      }
    } catch (e) { log.error('controllaCompleanni:', e?.message || e); }
  }

  // Notifica "in diretta su TikTok" (Telegram + eventuale annuncio in chat).
  // Chiamata sia dal rilevamento automatico sia dal webhook /api/ext.
  // Anti-doppioni: al massimo una notifica ogni 3 ore per canale.
  async notificaTikTok(login) {
    try {
      const l = String(login || '').toLowerCase();
      const s = streamers.get(l);
      const tk = s?.settings?.tiktok;
      if (!tk?.username) return { ok: false, motivo: 'TikTok non configurato' };
      if (Date.now() - (this._tiktokUltima.get(l) || 0) < 3 * 3600_000) return { ok: false, motivo: 'gia avvisato di recente' };
      this._tiktokUltima.set(l, Date.now());
      // Telegram (basta che il bot+gruppo siano collegati: indipendente dal
      // toggle "avviso live Twitch"). Cattura il message_id per fissarlo/eliminarlo.
      const conf = tgConf.get(l);
      if (conf?.token && conf.chat_id) {
        try {
          const r = await telegram.notificaTikTok(conf, { login: l, display: s?.display || l }, tk.username, tk.messaggio);
          const msgId = r?.ok ? r.result?.message_id : null;
          if (msgId) {
            tgConf.setMsgIdTk(l, msgId);
            if (conf.pin_live) {
              const p = await telegram.fissaMessaggio(conf.token, conf.chat_id, msgId, { silenzioso: false });
              if (!p.ok) log.warn(`pin TikTok Telegram #${l}: ${p.errore} (il bot è admin del gruppo con permesso di fissare?)`);
            }
          }
        } catch (e) { log.warn(`notifica TikTok Telegram #${l}:`, e?.message || e); }
      }
      // annuncio in chat Twitch (se acceso e il bot è connesso)
      if (tk.annunciaChat && this.units.has(l)) {
        this.say(l, `🎵 Sono in diretta anche su TikTok! Passate a salutare 👉 ${tiktok.urlLive(tk.username)}`);
      }
      log.info(`notifica TikTok inviata per #${l}`);
      return { ok: true };
    } catch (e) { log.error(`notificaTikTok #${login}:`, e?.message || e); return { ok: false }; }
  }

  // Controlla YouTube (RSS): se è uscito un nuovo video, avvisa. Anti-doppioni
  // con l'id dell'ultimo video annunciato (persistente); primo giro = seed.
  async _controllaPost() {
    try {
      for (const s of streamers.active()) {
        // --- YouTube (RSS o, se hai messo la TUA chiave, l'API ufficiale) ---
        const yt = s.settings?.youtube;
        if (yt?.attivo && yt.canale) {
          const apiKey = yt.apiKey || '';
          const chiaveCache = yt.canale + '|' + (apiKey ? 'api' : 'rss');
          let cid = this._ytId.get(chiaveCache);
          if (cid === undefined) { cid = await youtube.risolviCanaleId(yt.canale, apiKey); this._ytId.set(chiaveCache, cid || null); }
          if (cid) {
            const v = await youtube.ultimoVideo(cid, apiKey);
            if (v?.videoId) {
              const conf = tgConf.get(s.login);
              const ultimo = conf?.yt_ultimo || '';
              if (v.videoId !== ultimo) {
                tgConf.setYtUltimo(s.login, v.videoId);
                if (ultimo) await this.notificaPost(s.login, { piattaforma: 'youtube', titolo: v.titolo, url: v.url, messaggio: yt.messaggio, annunciaChat: yt.annunciaChat });
              }
            }
          }
        }
        // --- Instagram (solo con la TUA Graph API: ID account + token) ---
        const ig = s.settings?.instagram;
        if (ig?.attivo && ig.userId && ig.token) {
          const p = await instagram.ultimoPost({ userId: ig.userId, token: ig.token });
          if (p?.id) {
            const conf = tgConf.get(s.login);
            const ultimo = conf?.ig_ultimo || '';
            if (p.id !== ultimo) {
              tgConf.setIgUltimo(s.login, p.id);
              if (ultimo) await this.notificaPost(s.login, { piattaforma: 'instagram', titolo: (p.caption || '').slice(0, 140), url: p.permalink, messaggio: ig.messaggio, annunciaChat: ig.annunciaChat });
            }
          }
        }
      }
    } catch (e) { log.error('controllaPost:', e?.message || e); }
  }

  // Manda l'avviso di un nuovo post (YouTube/TikTok): gruppo Telegram + eventuale
  // annuncio in chat Twitch. Usata dal poller YouTube e dal webhook /api/ext.
  async notificaPost(login, { piattaforma = 'youtube', titolo = '', url = '', messaggio = '', annunciaChat = false } = {}) {
    try {
      const l = String(login || '').toLowerCase();
      const s = streamers.get(l);
      const conf = tgConf.get(l);
      if (conf?.token && conf.chat_id) {
        await telegram.notificaPost(conf, { login: l, display: s?.display || l }, { piattaforma, titolo, url, messaggio }).catch(() => {});
      }
      if (annunciaChat && this.units.has(l) && url) {
        const info = { tiktok: ['🎵', 'TikTok'], instagram: ['📸', 'Instagram'], youtube: ['📺', 'YouTube'] }[piattaforma] || ['📺', 'YouTube'];
        this.say(l, `${info[0]} Nuovo contenuto su ${info[1]}! 👉 ${url}`);
      }
      log.info(`notifica post (${piattaforma}) inviata per #${l}`);
      return { ok: true };
    } catch (e) { log.error(`notificaPost #${login}:`, e?.message || e); return { ok: false }; }
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
