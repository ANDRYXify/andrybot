// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// BotManager: il "direttore d'orchestra" di SocialBot.
// Per OGNI streamer approvato e acceso crea una "unità": una
// connessione chat autenticata CON L'ACCOUNT DELLO STREAMER (il bot
// parla come lui), un gestore messaggi e le sottoscrizioni agli
// eventi Twitch. Tiene tutto sincronizzato con la dashboard.
import { makeLog } from './logger.js';
import { config } from './config.js';
import { tokens, streamers, memory, tgConf, tgDest, tgAmici, tgMsg, feedFonti, dcConf, compleanni, pointAlerts } from './db.js';
import { ChatBot } from './twitch/chat.js';
import { EventHub } from './twitch/events.js';
import { Brain } from './ai/brain.js';
import * as persona from './ai/persona.js';
import * as games from './features/games.js';
import * as giveaway from './features/giveaway.js';
import * as watchtime from './features/watchtime.js';
import * as comandibase from './features/comandibase.js';
import * as trackinggiochi from './features/trackinggiochi.js';
import * as comandichat from './features/comandichat.js';
import * as sondaggi from './features/sondaggi.js';
import * as songrequest from './features/songrequest.js';
import * as vip from './features/vip.js';
import * as ruoli from './features/ruoli.js';
import * as telegram from './features/telegram.js';
import * as discord from './features/discord.js';
import * as contatori from './features/contatori.js';
import * as antispam from './features/antispam.js';
import * as tiktok from './features/tiktok.js';
import * as youtube from './features/youtube.js';
import * as instagram from './features/instagram.js';
import * as feed from './features/feed.js';
import * as compleanniFeat from './features/compleanni.js';
import * as gamesbridge from './features/gamesbridge.js';
import * as quotes from './features/quotes.js';
import * as model from './ai/model.js';
import * as brainpy from './ai/brainpy.js';
import { createMessageHandler } from './features/handler.js';
import { voceKick } from './kick/voce.js';
import * as avvisi from './features/avvisi.js';
import { dirette } from './db.js';
import { ClipEngine } from './features/clips.js';
import { PenitenzeEngine } from './features/penitenze.js';
import { AlertsEngine } from './features/alerts.js';
import { AntiBot, caricaListaBotDaDisco, aggiornaListaBot, caricaRegistroDaDisco, salvaRegistro } from './features/antibot.js';
import { scheduleReflection } from './ai/reflection.js';
import { StreamWatcher } from './stream/watcher.js';
import { LiveListener } from './stream/listener.js';
import { avviaBackupAuto, stopBackupAuto } from './backup.js';

const log = makeLog('bot');

export class BotManager {
  constructor({ auth, helix, effects, modules, bus }) {
    this.auth = auth;
    this.helix = helix;
    this.effects = effects;          // motore "Effetti & Suoni" condiviso con la dashboard
    this.modules = modules || null;  // motore "Moduli" (automazioni QUANDO→SE→ALLORA)
    this.bus = bus || null;          // event-bus dei plugin operatore (opzionale)
    this.running = false;
    this.units = new Map();          // login → { chat, connesso }
    this._chatKO = new Map();        // login → { da, avvisato } — chat non autenticata (token da rifare)
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
    this.alerts = new AlertsEngine({ effects: this.effects });
    // Anti-bot (stile Sery_Bot): raffiche di follow, nomi da bot, hate-raid.
    this.antibot = new AntiBot({
      helix: this.helix,
      say: (ch, t) => this.say(ch, t),
      chatSettings: (ch, o) => this.helix.chatSoloFollower(ch, !!o.followersOnly, 0),
      alert: (ch, a) => { try { this.alerts?.manuale?.(ch, a); } catch { /* facolt. */ } },
    });
    this.penitenze = new PenitenzeEngine({
      say: (ch, t) => this.say(ch, t),
      effects: this.effects,
      // penitenza scelta dall'IA: chiede al cervello una penitenza breve e
      // giocosa. Se il cervello non è disponibile ritorna null → rete di sicurezza.
      ia: async (ch) => {
        const s = streamers.get(ch);
        const r = await brainpy.rispondi({
          canale: ch, login: ch, nome: 'sistema', modo: 'diretta', timeoutMs: 4000,
          tono: s?.settings?.tono || 'scherzoso',
          testo: 'Inventa UNA penitenza breve, giocosa e innocua per uno streamer che ha perso una sfida (max 8 parole). Rispondi SOLO con la penitenza, senza virgolette.',
        }).catch(() => null);
        return r;
      },
    });
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
    // Anti-bot: lista di bot noti aggiornata da sola. Si riprende la copia su
    // disco subito (istantaneo), poi si scarica la fresca dopo 30s (per non
    // rallentare l'avvio) e la si rinfresca ogni 12 ore.
    caricaListaBotDaDisco().catch(() => {});
    caricaRegistroDaDisco().catch(() => {});
    setTimeout(() => aggiornaListaBot().catch(() => {}), 30_000);
    this._listaBotTimer = setInterval(() => aggiornaListaBot().catch(() => {}), 12 * 60 * 60_000);
    // Ore guardate: ogni 5 minuti, per ogni canale LIVE, accredito il tempo a chi
    // è in chat (lista chatters di Twitch → anche i lurker). 300s a tick = 1:1 col
    // tempo reale. Se manca lo scope moderator:read:chatters, getChatters dà [] e
    // semplicemente non si conteggia nulla.
    this._watchtimeTimer = setInterval(() => this._tickWatchtime().catch(() => {}), 5 * 60_000);
    // Backup automatico del database: tutto (comandi, temi, monete, moderatori,
    // pagine link, token) vive in un solo SQLite. Copie coerenti e periodiche in
    // dataDir/backup, non scaricabili dal web. Uno ~90s dopo l'avvio, poi a
    // intervalli (default 8h). Si spegne con stopBackupAuto() nello stop().
    avviaBackupAuto();
    // TikTok: rilevamento live best-effort (l'affidabile è il webhook)
    this._tiktokTimer = setInterval(() => this._controllaTikTok().catch(() => {}), 3 * 60_000);
    // Dirette degli amici da annunciare su Telegram: non sono canali gestiti dal
    // bot, quindi nessun evento arriva da solo — vanno guardati.
    this._amiciTimer = setInterval(() => this._giroAmiciTelegram().catch(() => {}), 2 * 60_000);
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
    // per prima, di sua iniziativa. La PORTA la guardo spesso (~5 min), ma a decidere
    // se farsi viva è la SUA spinta (slancio), non questo intervallo: nessuna orologeria.
    this._tgProattivoUltimo = new Map();   // login → ts dell'ultimo messaggio proattivo
    this._tgProattivoTimer = setInterval(() => this._tgProattivo(), 5 * 60_000);
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
    clearInterval(this._listaBotTimer);
    clearInterval(this._watchtimeTimer);
    stopBackupAuto();
    clearInterval(this._tiktokTimer);
    clearInterval(this._amiciTimer);
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
    // svuota su disco il registro anti-bot in sospeso (il salvataggio è
    // debounced 4s: senza questo, ban/segnalazioni degli ultimi secondi si
    // perderebbero a ogni riavvio/deploy).
    try { await salvaRegistro(); } catch { /* niente */ }
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
        await ruoli.riallinea(this.helix, login, { forza: true });   // il premio pesca dal pubblico: prima si sa chi lo e'
        await vip.premiaTopMonete(this.helix, login, Math.min(5, Math.max(1, Number(p.quanti) || 1)), durata, (t) => this.say(login, t), { saltaPerenni: p.saltaPerenni !== false });
        streamers.setSettings(login, { ...s.settings, premioVipUltimo: Date.now() });
      }
    } catch (e) { log.error('premi VIP:', e?.message || e); }
  }

  // Ore guardate: per ogni canale connesso e LIVE, accredita 5 minuti a chi è in
  // chat (lista chatters di Twitch). Un canale offline non conta. Best-effort:
  // ogni canale in try/catch, così uno che fallisce non blocca gli altri.
  async _tickWatchtime() {
    const passoSec = 300;
    for (const login of this.units.keys()) {
      try {
        const stream = await this.helix.getStream(login);
        if (!stream) continue;
        const chatters = await this.helix.getChatters(login);
        if (chatters.length) {
          watchtime.accredita(login, chatters, passoSec);
          // Stesso giro, stessa lista: le monete di presenza non costano
          // nemmeno una chiamata in piu' a Twitch.
          try { games.giroMonete(login, chatters, { live: true }); }
          catch (e) { log.debug(`#${login} monete:`, e?.message || e); }
        }
      } catch (e) { log.debug(`#${login} ore:`, e?.message || e); }
    }
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
  // AUTONOMIA di scriverti: NON un timer. La porta è sempre aperta (guardiamo spesso), ma
  // è la SUA spinta (slancio, dal cervello: un evento suo non ancora condiviso + vigore) a
  // decidere se farsi viva. Se non ha nulla dentro tace — anche a lungo. Se le preme
  // qualcosa può scriverti anche subito, e più volte. Non è una scelta obbligata.
  _tgProattivo() {
    try {
      if (!this._oraSveglia()) return;                         // cortesia: non nel cuore della notte
      for (const s of streamers.active()) {
        const login = s.login;
        if (s.settings?.iaLocale === false) continue;          // cervello spento → niente
        if (s.settings?.proattivoTg === false) continue;       // disattivata dallo streamer
        const conf = tgConf.get(login);
        if (!conf?.token || !conf.owner_tg_id) continue;       // Telegram non legato al proprietario
        if ((conf.dm_modo || 'me') === 'off') continue;        // DM privati spenti
        // chiedo A LEI se se la sente di scriverti adesso (deterministico, dal suo stato)
        Promise.resolve(this.brain?.slancioScrivere?.())
          .then((sl) => {
            if (!sl || !sl.vuole) return;                      // non le preme nulla: tace
            return this.brain?.messaggioProattivo(login, { nome: conf.owner_tg_nome || '', spunto: sl.spunto || '' })
              .then((testo) => {
                if (!testo) return;
                telegram.inviaMessaggio(conf.token, conf.owner_tg_id, testo).catch(() => {});
                this._tgProattivoUltimo.set(login, Date.now());
                this.brain?.segnaSlancioCondiviso?.().catch(() => {});   // la spinta riparte da qui
              });
          })
          .catch(() => {});
      }
    } catch (e) { log.error('tgProattivo:', e?.message || e); }
  }

  // La chat non riesce ad autenticarsi: il token è scaduto/revocato e NON si
  // ripara da solo (il backoff continuerebbe a fallire all'infinito). Segniamo il
  // canale come KO (lo vede la dashboard) e avvisiamo il proprietario su Telegram,
  // una sola volta ogni 6 ore per non tempestarlo.
  _chatAuthKO(login) {
    try {
      const u = this.units.get(login); if (u) u.connesso = false;
      const ORA = Date.now();
      const gia = this._chatKO.get(login);
      const rec = { da: gia?.da || ORA, avvisato: gia?.avvisato || 0 };
      if (ORA - rec.avvisato >= 6 * 3600_000) {
        rec.avvisato = ORA;
        const conf = tgConf.get(login);
        if (conf?.token && conf.owner_tg_id && (conf.dm_modo || 'me') !== 'off') {
          const testo = '⚠️ Il bot non riesce a collegarsi alla tua chat: il permesso Twitch è scaduto o è stato revocato. '
            + 'Entra nella dashboard e premi «Concedi i permessi» per rimetterlo in funzione.';
          telegram.inviaMessaggio(conf.token, conf.owner_tg_id, testo).catch(() => {});
        }
      }
      this._chatKO.set(login, rec);
    } catch (e) { log.debug('chatAuthKO:', e?.message || e); }
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
        // Salute della connessione: 'connesso' azzera l'allarme, 'auth-fallita' (token
        // non valido: NON si ripara da solo) avvisa il proprietario e lo segna KO.
        chat.on('connesso', () => {
          const u = this.units.get(login); if (u) u.connesso = true;
          if (this._chatKO.delete(login)) log.info(`@${login}: chat riconnessa, allarme rientrato`);
        });
        chat.on('disconnesso', () => { const u = this.units.get(login); if (u) u.connesso = false; });
        chat.on('auth-fallita', () => this._chatAuthKO(login));
        await chat.connect();
        chat.join(login);
        this.units.set(login, { chat, connesso: true });
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
      this._chatKO.delete(login);      // spenta di proposito: nessun allarme da mostrare
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
  // Un messaggio arrivato da un'ALTRA piattaforma entra nello stesso tubo. La
  // voce con cui si risponde e' quella della piattaforma da cui e' arrivato:
  // una domanda fatta su Kick non si risponde su Twitch.
  async messaggioEsterno(msg) {
    const login = String(msg?.channel || '').toLowerCase();
    if (!login || !streamers.get(login)) return;
    if (!msg.piattaforma || msg.piattaforma === 'twitch') return;   // Twitch ha la sua strada
    const parla = this.vocePer(msg);
    const onMessage = createMessageHandler({
      chat: { say: (_c, t) => parla(t) }, helix: this.helix, brain: this.brain, clips: this.clips, botLogin: login,
    });
    await this._gestisciMessaggio(login, msg, onMessage, parla);
  }

  // LA VOCE DI UN MESSAGGIO. Sta scritta in UN posto solo, e non si ricava a
  // ogni chiamata: quindici punti del tubo rispondono a un messaggio, e
  // ricavarla in ognuno vuol dire quindici occasioni di sbagliare — infatti la
  // prima volta ne ho sbagliate quattordici, e un !comando scritto su Kick
  // veniva risposto su TWITCH. Peggio del silenzio.
  vocePer(msg) {
    if (msg?.piattaforma === 'kick') { const v = voceKick(msg.channel); return (t) => v.say(msg.channel, t); }
    return (t) => this.say(msg.channel, t);
  }

  async _gestisciMessaggio(login, msg, onMessage, dire = null) {
    const parla = dire || this.vocePer(msg);
    // Le difese qui sotto agiscono via Helix (elimina, timeout): hanno senso
    // solo su Twitch. Su un'altra piattaforma il messaggio passa al flusso
    // normale — meglio nessuna moderazione che una moderazione che finge.
    const suTwitch = !msg.piattaforma || msg.piattaforma === 'twitch';
    // 0) ANTI-BOT: un nome da follow-bot noto che scrive in chat (hate-raid) si
    // ferma subito, prima di ogni altra cosa.
    try {
      if (suTwitch && await this.antibot?.controllaChat(msg)) return;
    } catch (e) { log.error(`#${login} anti-bot chat:`, e?.message || e); }
    // 1) ANTISPAM: se è spam lo elimina e stop (il bot non "reagisce" allo spam)
    try {
      if (suTwitch && await antispam.tryAntispam(this.helix, msg, parla)) return;
    } catch (e) { log.error(`#${login} antispam:`, e?.message || e); }
    // 2) GIOCHI DEL SITO: se è un comando gestito dal sito, risponde e stop
    try {
      if (await gamesbridge.tryGamesBridge(msg, parla)) return;
    } catch (e) { log.error(`#${login} giochi:`, e?.message || e); }
    // 3) flusso normale
    this._elaboraMessaggio(login, msg, onMessage, parla);
  }

  // Elaborazione normale di un messaggio (chiamata solo se non gestito prima).
  _elaboraMessaggio(login, msg, onMessage, parla = this.vocePer(msg)) {
    onMessage(msg).catch(e => log.error(`#${login} gestione messaggio:`, e?.message || e));
    if (!msg.isSelf) this.clips.onActivity(msg);   // rilevatore "hype" per le clip automatiche (chat)
    try { this.alerts?.onChat(login, msg); } catch (e) { log.debug(`#${login} chat overlay:`, e?.message || e); }
    // pannello chat dello Studio Web (feed 'chat_raw' ungated): solo se qualcuno
    // è collegato via SSE, così non pesa quando lo Studio è chiuso.
    try { this.alerts?.onChatRaw?.(login, msg); } catch (e) { log.debug(`#${login} chat studio:`, e?.message || e); }
    this.brain.observe?.(msg);                             // apprendimento passivo (anche dai messaggi dello streamer)
    // amicizia GLOBALE: chi interagisce diventa piano piano "amico" del bot
    // (solo un'affinità, mai contenuti né in quale canale).
    if (!msg.isSelf) { try { persona.interagisci(msg.user); } catch { /* niente */ } }
    // minigiochi: monete passive + comandi (!dado, !slot, !trivia, ...)
    try { games.accredita(msg); games.tryGame(msg, parla); }
    catch (e) { log.error(`#${login} giochi:`, e?.message || e); }
    // giveaway / sorteggi (!giveaway, !join, !estrai) — segue l'add-on Giochi
    try { giveaway.tryGiveaway(msg, parla); }
    catch (e) { log.error(`#${login} giveaway:`, e?.message || e); }
    // ore guardate / fedeltà (!ore, !classificaore)
    try { watchtime.tryComando(msg, parla); }
    catch (e) { log.error(`#${login} ore:`, e?.message || e); }
    // comandi base pronti (!so/!shoutout, !followage, !uptime): opt-out e mai
    // sopra ai comandi/Moduli creati dallo streamer (quelli vincono).
    comandibase.tryComando(this.helix, msg, parla)
      .catch((e) => log.error(`#${login} comandi base:`, e?.message || e));
    // minigiochi webcam (!mima/!nonridere/!reaction/!battaglia, !sfida): avviano
    // i giochi nell'overlay tracking. Deterministico; solo se il tracking è acceso.
    try { trackinggiochi.tryComando(this.effects, msg, parla); }
    catch (e) { log.error(`#${login} giochi tracking:`, e?.message || e); }
    // gestione comandi dalla chat (!comando aggiungi/…): opt-in, solo se accesa
    try { comandichat.tryComando(msg, parla); }
    catch (e) { log.error(`#${login} comandi-chat:`, e?.message || e); }
    // comandi VIP (mod/streamer): !vip @nome [durata], !unvip, !viplista
    vip.tryVipCommand(this.helix, msg, parla).catch((e) => log.error(`#${login} vip:`, e?.message || e));
    // sondaggi & predizioni Twitch (mod/streamer) — add-on Effetti & Punti canale
    sondaggi.trySondaggio(this.helix, msg, parla).catch((e) => log.error(`#${login} sondaggi:`, e?.message || e));
    // richieste musicali via Spotify (!sr, !song) — add-on Richieste Musicali
    songrequest.trySongRequest(msg, parla).catch((e) => log.error(`#${login} songrequest:`, e?.message || e));
    // citazioni (!cita) — lo shoutout (!so) lo gestisce comandibase qui sopra
    try { quotes.tryQuoteCommand(msg, parla); } catch (e) { log.error(`#${login} citazioni:`, e?.message || e); }
    // contatori (!morti, !tentativi, !parole…): comando chat + auto-conteggio parole.
    // L'emit aggiorna il widget sullo STESSO overlay OBS (feed SSE di alert/effetti).
    try {
      const emitCont = (p) => this.effects?.emit?.(login, p);
      contatori.tryComando(msg, parla, emitCont);
      contatori.perParola(msg, emitCont);
    } catch (e) { log.debug(`#${login} contatori:`, e?.message || e); }
    // effetti & suoni: un comando come !airhorn accende l'overlay OBS.
    try { this.effects?.tryTrigger(msg, parla); }
    catch (e) { log.error(`#${login} effetti:`, e?.message || e); }
    // moduli: automazioni dello streamer (comando/parola/primo messaggio).
    try { this.modules?.onMessage(msg, parla); }
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
      // richiesta musicale a punti canale: se il premio è quello configurato,
      // il testo del riscatto diventa una canzone in coda su Spotify.
      songrequest.perRedemptionMusica(this.helix, channel, data, (t) => this.say(channel, t)).catch(() => {});
      // penitenza a punti canale: vieta una parola/lettera allo streamer a tempo.
      try { this.penitenze?.daRiscatto(channel, data); } catch (e) { log.debug(`#${channel} penitenza:`, e?.message || e); }
      // contatore a punti canale: riscatto → +step (annuncio + overlay OBS).
      try { contatori.perRiscatto(channel, data, (t) => this.say(channel, t), (p) => this.effects?.emit?.(channel, p)); } catch (e) { log.debug(`#${channel} contatore riscatto:`, e?.message || e); }
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
      if (m.effetto) {
        let opz = {};
        try { opz = m.opzioni ? JSON.parse(m.opzioni) : {}; } catch { opz = {}; }
        try { this.effects?.fireConOpzioni?.(channel, m.effetto, opz); } catch { /* niente */ }
      }
      if (m.suono) { try { this.effects?.firePreset?.(channel, m.suono, m.titolo, 100); } catch { /* niente */ } }
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
    // alert overlay (follow/sub/cheer/raid): notifica animata + suono
    try { this.alerts?.onEvent(ev); } catch (e) { log.debug(`#${channel} alert evento:`, e?.message || e); }
    // clip automatiche: sub/bit/raid sono momenti forti (le clip li "sentono")
    try { this.clips?.onEvent(ev); } catch (e) { log.debug(`#${channel} clip evento:`, e?.message || e); }
    // anti-bot: follow-bot (raffiche + nomi noti) e hate-raid
    try {
      if (type === 'channel.follow') this.antibot?.onFollow(ev);
      else if (type === 'channel.raid') this.antibot?.onRaid(ev);
    } catch (e) { log.error(`#${channel} anti-bot evento:`, e?.message || e); }
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
    if (isLive) this._annunciaTwitch(ch).catch((e) => log.error(`avviso live #${ch}:`, e?.message || e));
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
  // ANNUNCIO «È LIVE», una strada sola per tutte le piattaforme.
  // Chi chiama passa una diretta (piattaforma, titolo, link, id) e non deve
  // sapere niente di Telegram o Discord; Telegram e Discord non devono sapere
  // niente di Twitch o Kick. In mezzo c'e' solo questo.
  async annunciaDiretta(d) {
    if (!d?.login) return { inviati: 0 };
    const { login, piattaforma } = d;
    // Anti-doppioni PER PIATTAFORMA: si puo' essere live su Twitch e su Kick
    // insieme, e un ricordo solo cancellerebbe l'altro.
    if (d.id && dirette.gia(login, piattaforma, d.id)) return { inviati: 0, gia: true };

    const s = streamers.get(login);
    const conNome = { ...d, display: d.display || s?.display || login };
    let inviati = 0;

    try {
      const conf = tgConf.get(login);
      if (conf?.attivo && conf.token) {
        const testo = avvisi.messaggio(conNome, piattaforma === 'twitch' ? conf.messaggio : '');
        const r = await this._diffondiTelegram(login, conf, avvisi.eventoDi(piattaforma), login, testo, { pin: true });
        inviati += r.inviati || 0;
      }
    } catch (e) { log.error(`avviso Telegram ${piattaforma} #${login}:`, e?.message || e); }

    try {
      const conf = dcConf.get(login);
      if (conf?.attivo && conf.webhook) {
        const r = await discord.notificaDiretta(conf, conNome);
        if (r?.ok) inviati++;
      }
    } catch (e) { log.error(`avviso Discord ${piattaforma} #${login}:`, e?.message || e); }

    if (inviati && d.id) dirette.segna(login, piattaforma, d.id);
    return { inviati };
  }

  // Un evento arrivato da un'altra piattaforma (per ora Kick) entra qui.
  async eventoEsterno(ev) {
    if (!ev?.channel || !streamers.get(ev.channel)) return;
    try {
      if (ev.tipo === 'live') {
        const d = avvisi.diretta({ piattaforma: ev.piattaforma, login: ev.channel, titolo: ev.titolo, id: ev.id || ev.titolo || String(Date.now()) });
        if (d) await this.annunciaDiretta(d);
        return;
      }
      if (ev.tipo === 'fine-live') { dirette.dimentica(ev.channel, ev.piattaforma); return; }
      // Seguiti e abbonamenti alimentano gli alert a schermo GIA' esistenti:
      // entrano dalla stessa porta degli eventi Twitch (onEvent), tradotti nel
      // loro vocabolario. Cosi' un alert configurato una volta vale per tutte
      // le piattaforme, senza che nessuno debba configurarlo due volte.
      const comeTwitch = {
        seguito: 'channel.follow',
        abbonamento: 'channel.subscribe',
        regali: 'channel.subscription.gift',
      };
      const type = comeTwitch[ev.tipo];
      if (type) {
        this.alerts?.onEvent({
          channel: ev.channel,
          type,
          data: { user_name: ev.utente, cumulative_months: ev.mesi, total: ev.quanti },
        });
      }
    } catch (e) { log.error(`evento ${ev.piattaforma} #${ev.channel}:`, e?.message || e); }
  }

  // Twitch: si prende quello che sa Helix e si passa dalla STESSA strada di
  // tutte le altre piattaforme. Prima aveva un giro suo, e infatti aggiungerne
  // una seconda voleva dire riscriverlo.
  async _annunciaTwitch(login) {
    const info = await this.helix.getStream(login).catch(() => null);
    const s = streamers.get(login);
    const d = avvisi.diretta({
      piattaforma: 'twitch', login, display: s?.display || login,
      titolo: info?.title || '', gioco: info?.game_name || '',
      spettatori: info?.viewer_count ?? null, id: String(info?.id || ''),
    });
    if (d) d.miniatura = (info?.thumbnail_url || '').replace('{width}', '1280').replace('{height}', '720');
    return this.annunciaDiretta(d);
  }

  // Manda un avviso a TUTTE le destinazioni ammesse per quell'evento e quello
  // streamer (gruppo, canale, topic). Ogni destinazione ricorda il proprio
  // message_id, così a live finita si chiude quella giusta in ognuna.
  async _diffondiTelegram(login, conf, evento, streamerLogin, testo, { pin = false, chi = null } = {}) {
    tgDest.migra(login, conf);                       // il vecchio gruppo unico diventa la prima destinazione
    const dest = tgDest.perEvento(login, evento, streamerLogin);
    if (!dest.length) return { inviati: 0 };
    const esiti = await telegram.diffondi(conf.token, dest, testo, { anteprima: true });
    let inviati = 0;
    for (const e of esiti) {
      if (!e.ok) continue;
      inviati++;
      const msgId = e.result?.message_id;
      if (!msgId) continue;
      if (pin) {
        if (chi) tgMsg.segna(login, e.dest.id, chi, msgId);
        else tgDest.setMsgId(e.dest.id, msgId);
      }
      if (pin && e.dest.pin) {
        const p = await telegram.fissaMessaggio(conf.token, e.dest.chat_id, msgId, { silenzioso: false });
        if (!p.ok) log.warn(`pin Telegram ${e.dest.titolo || e.dest.chat_id}: ${p.errore} (il bot è admin con permesso di fissare?)`);
      }
    }
    if (inviati) log.info(`Telegram: «${evento}» di #${streamerLogin} inviato a ${inviati}/${dest.length} destinazioni di #${login}`);
    return { inviati, totale: dest.length };
  }

  // Le dirette degli ALTRI streamer che il canale ha scelto di annunciare.
  // Giro periodico: gli amici non sono canali gestiti dal bot, quindi nessun
  // evento arriva da solo — bisogna guardarli. Anti-doppioni sull'id diretta.
  async _giroAmiciTelegram() {
    const canali = new Set(tgAmici.canaliConAmici());
    for (const s of streamers.list()) if (tgConf.get(s.login)?.community_live) canali.add(s.login);
    for (const ch of canali) {
      try {
        const conf = tgConf.get(ch);
        if (!conf?.attivo || !conf.token) continue;
        // la lista automatica segue la community: chi entra compare, chi esce sparisce
        if (conf.community_live) {
          tgAmici.sincronizzaCommunity(ch, streamers.membriCommunity(ch)
            .map((x) => ({ login: x.login, display: x.display })));
        } else {
          tgAmici.sincronizzaCommunity(ch, []);
        }
        for (const a of tgAmici.daGuardare(ch)) {
          const info = await this.helix.getStream(a.login).catch(() => null);
          const streamId = String(info?.id || '');
          if (!streamId) {
            // non è live: se avevamo annunciato la sua diretta, chiudiamola
            if (a.ultima_live) { await this._chiudiLiveEsterna(ch, conf, a.login); tgAmici.setUltimaLive(ch, a.login, ''); }
            continue;
          }
          if (streamId === a.ultima_live) continue;      // già annunciata
          const testo = telegram.costruisciMessaggioLive(
            { login: a.login, display: a.display || a.login }, info, a.messaggio || conf.messaggio);
          const r = await this._diffondiTelegram(ch, conf, 'live', a.login, testo, { pin: true, chi: a.login });
          if (r.inviati) tgAmici.setUltimaLive(ch, a.login, streamId);
        }
      } catch (e) { log.debug(`amici Telegram #${ch}:`, e?.message || e); }
    }
  }

  // Diretta di un altro streamer finita: togli l'avviso SOLO suo, in ogni
  // destinazione dove era stato fissato. Gli avvisi degli altri restano intatti.
  async _chiudiLiveEsterna(login, conf, chi) {
    try {
      for (const m of tgMsg.perStreamer(login, chi)) {
        const d = tgDest.get(login, m.dest_id);
        if (d?.pin && m.msg_id) {
          const r = await telegram.eliminaMessaggio(conf.token, d.chat_id, m.msg_id);
          if (!r.ok) log.debug(`elimina live di ${chi} in ${d.titolo || d.chat_id}: ${r.errore}`);
        }
      }
      tgMsg.pulisci(login, chi);
    } catch (e) { log.debug(`chiudi live esterna ${chi}:`, e?.message || e); }
  }

  // Manda la notifica Discord "è live" nel canale dello streamer (via webhook),
  // se ha configurato e acceso le notifiche. Anti-doppioni sull'id della live.


  // Live spenta: se l'avviso era stato fissato, lo elimina dal gruppo (togliendo
  // così anche il "fissato"). Best-effort e idempotente: se non c'è nulla da
  // eliminare, non fa niente. Il bot può cancellare i propri messaggi entro 48h.
  async _chiudiTelegram(login) {
    try {
      const conf = tgConf.get(login);
      if (!conf?.token) return;
      for (const d of tgDest.lista(login)) {
        if (!d.msg_id) continue;
        const msgId = d.msg_id;
        tgDest.setMsgId(d.id, '');    // azzera comunque: un solo tentativo per destinazione
        if (!d.pin) continue;         // l'eliminazione segue l'opzione «fissa» di QUELLA destinazione
        const r = await telegram.eliminaMessaggio(conf.token, d.chat_id, msgId);
        if (r.ok) log.info(`avviso Telegram eliminato in ${d.titolo || d.chat_id} (live di #${login} finita)`);
        else log.warn(`elimina Telegram ${d.titolo || d.chat_id}: ${r.errore}`);
      }
      if (conf.msg_id) tgConf.setMsgId(login, '');
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
      if (conf?.token) {
        try {
          const testo = telegram.costruisciMessaggioTikTok({ login: l, display: s?.display || l }, tk.username, tk.messaggio);
          tgDest.migra(l, conf);
          const dest = tgDest.perEvento(l, 'tiktok', l);
          const esiti = await telegram.diffondi(conf.token, dest, testo, { anteprima: true });
          const primo = esiti.find((e) => e.ok && e.result?.message_id);
          const msgId = primo?.result?.message_id || null;
          if (msgId) {
            tgConf.setMsgIdTk(l, msgId);
            for (const e of esiti) {
              if (!e.ok || !e.dest.pin || !e.result?.message_id) continue;
              const p = await telegram.fissaMessaggio(conf.token, e.dest.chat_id, e.result.message_id, { silenzioso: false });
              if (!p.ok) log.warn(`pin TikTok Telegram ${e.dest.titolo || e.dest.chat_id}: ${p.errore}`);
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
        // --- Feed generici dello streamer (Instagram e qualunque altra cosa) ---
        await this._giroFeed(s.login);
        // --- TikTok (API ufficiale: account collegato in OAuth, scope video.list) ---
        const tk = s.settings?.tiktok;
        if (tk?.postAttivo && tiktok.collegato(s.login)) {
          const p = await tiktok.ultimoPostApi(s.login);
          if (p?.id) {
            const conf = tgConf.get(s.login);
            const ultimo = conf?.tk_ultimo || '';
            if (p.id !== ultimo) {
              tgConf.setTkUltimo(s.login, p.id);
              if (ultimo) await this.notificaPost(s.login, { piattaforma: 'tiktok', titolo: p.titolo, url: p.url, messaggio: tk.postMessaggio, annunciaChat: tk.postAnnunciaChat });
            }
          }
        }
      }
    } catch (e) { log.error('controllaPost:', e?.message || e); }
  }

  // Legge i feed che lo streamer ha collegato e avvisa quando esce una voce nuova.
  // La prima lettura NON avvisa: registra soltanto dov'eravamo, altrimenti al
  // collegamento partirebbe l'annuncio di un post vecchio.
  async _giroFeed(login) {
    const l = String(login || '').toLowerCase();
    for (const f of feedFonti.lista(l)) {
      if (!f.attivo) continue;
      try {
        const r = await feed.leggi(f.url);
        if (!r.ok) { feedFonti.segnaEsito(f.id, { errore: r.errore }); continue; }
        const v = r.voci[0];
        if (!v?.id) { feedFonti.segnaEsito(f.id, { errore: 'voce senza identificativo' }); continue; }
        const primaVolta = !f.ultimo_id;
        const nuova = v.id !== f.ultimo_id;
        feedFonti.segnaEsito(f.id, { ultimoId: v.id, titolo: v.titolo, url: v.url, errore: '' });
        if (nuova && !primaVolta) {
          await this.notificaPost(l, {
            piattaforma: ({ ig: 'instagram', tt: 'tiktok', yt: 'youtube' })[f.evento] || 'youtube',
            titolo: v.titolo || '', url: v.url || '', messaggio: f.messaggio,
          });
          log.info(`feed «${f.nome || f.url}» → nuova voce per #${l}`);
        }
      } catch (e) {
        feedFonti.segnaEsito(f.id, { errore: e?.message || 'errore' });
      }
    }
  }

  // Manda l'avviso di un nuovo post (YouTube/TikTok): gruppo Telegram + eventuale
  // annuncio in chat Twitch. Usata dal poller YouTube e dal webhook /api/ext.
  async notificaPost(login, { piattaforma = 'youtube', titolo = '', url = '', messaggio = '', annunciaChat = false } = {}) {
    try {
      const l = String(login || '').toLowerCase();
      const s = streamers.get(l);
      const conf = tgConf.get(l);
      if (conf?.token) {
        tgDest.migra(l, conf);
        // ogni piattaforma ha il suo evento: cosi «instagram» puo finire in un
        // topic e «youtube» in un altro, come lo streamer ha deciso.
        const ev = ({ instagram: 'ig', tiktok: 'tt', youtube: 'yt' })[piattaforma] || 'yt';
        const testo = telegram.costruisciMessaggioPost({ login: l, display: s?.display || l }, { piattaforma, titolo, url, messaggio });
        const dest = tgDest.perEvento(l, ev, l);
        await telegram.diffondi(conf.token, dest, testo, { anteprima: true }).catch(() => {});
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
      connessi: [...this.units].filter(([, u]) => u.connesso).map(([l]) => l),
      chatKO: [...this._chatKO.keys()],         // canali con token da ricollegare
      ascoltando: [...this.listeners.keys()],   // canali sotto ascolto live (audio)
      streamers: streamers.list().length,
    };
  }
}
