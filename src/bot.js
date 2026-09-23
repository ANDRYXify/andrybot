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
import * as filigrana from './watermark.js';
import * as licenza from './licenza.js';
import { canaleHa } from './features/accesso.js';
import { tokens, streamers, memory, tgConf, tgDest, amici, tgMsg, feedFonti, dcConf, dcDest, dcMsg, dcRuoli, avvisiConf, compleanni, pointAlerts, rapporti, postaStreamer } from './db.js';
import { ChatBot } from './twitch/chat.js';
import { EventHub } from './twitch/events.js';
import { Brain } from './ai/brain.js';
import * as persona from './ai/persona.js';
import * as games from './features/games.js';
import { accorda } from './ai/genere.js';
import * as registro from './features/comandi-registro.js';
import * as personalizzati from './features/personalizzati.js';
import * as giveaway from './features/giveaway.js';
import * as watchtime from './features/watchtime.js';
import * as comandibase from './features/comandibase.js';
import * as presenze from './features/presenze.js';
import * as rapporto from './features/rapporto.js';
import * as posta from './features/posta.js';
import * as trackinggiochi from './features/trackinggiochi.js';
import * as comandichat from './features/comandichat.js';
import * as sondaggi from './features/sondaggi.js';
import * as songrequest from './features/songrequest.js';
import * as vip from './features/vip.js';
import * as premio from './features/premio.js';
import * as ruoli from './features/ruoli.js';
import * as telegram from './features/telegram.js';
import * as cartaLive from './features/cartalive.js';
import * as discord from './features/discord.js';
import * as dcApi from './features/discord-api.js';
import * as contatori from './features/contatori.js';
import * as antispam from './features/antispam.js';
import * as tiktok from './features/tiktok.js';
import * as youtube from './features/youtube.js';
import * as instagram from './features/instagram.js';
import * as igAccesso from './features/instagram-accesso.js';
import { credenzialiInstagram } from './features/instagram-credenziali.js';
import * as storiaIg from './features/storia-ig.js';
import * as feed from './features/feed.js';
import * as compleanniFeat from './features/compleanni.js';
import * as subathonFeat from './features/subathon.js';
import * as trenoFeat from './features/treno.js';
import * as bit from './features/bit.js';
import * as gamesbridge from './features/gamesbridge.js';
import * as quotes from './features/quotes.js';
import * as battute from './features/battute.js';
import * as spontanea from './features/spontanea.js';
import { Momenti } from './features/momenti.js';
import * as motoreBattute from './features/battute-motore.js';
import * as model from './ai/model.js';
import * as brainpy from './ai/brainpy.js';
import { createMessageHandler, attesaUmana } from './features/handler.js';
import { voceKick } from './kick/voce.js';
import { ChatYoutube } from './youtube/chat.js';
import { voceYoutube } from './youtube/voce.js';
import { collegati as youtubeCollegati } from './youtube/api.js';
import * as avvisi from './features/avvisi.js';
import { dirette, guide, vips } from './db.js';
import * as cancello from './features/tg-cancello.js';
import { ClipEngine } from './features/clips.js';
import { PenitenzeEngine } from './features/penitenze.js';
import { AlertsEngine } from './features/alerts.js';
import { AntiBot, caricaListaBotDaDisco, aggiornaListaBot, caricaRegistroDaDisco, salvaRegistro } from './features/antibot.js';
import { censisci } from './features/punteggio.js';
import { carica as caricaRete } from './features/rete.js';
import { carica as caricaIncidenti } from './features/incidenti.js';
import { scheduleReflection } from './ai/reflection.js';
import { StreamWatcher } from './stream/watcher.js';
import { LiveListener } from './stream/listener.js';
import { avviaBackupAuto, stopBackupAuto } from './backup.js';
import * as dcGiro from './features/discord-giro.js';
import * as dcEventi from './features/discord-eventi.js';
import * as settimanaFeat from './features/settimana.js';
import * as dcCollega from './features/discord-collega.js';
import * as pub from './features/pubblicita.js';
import * as modalitaFeat from './features/modalita-chat.js';
import * as bossFeat from './features/boss.js';
import * as bjFeat from './features/blackjack.js';

const log = makeLog('bot');
const BOSS_DOPO_RAID_MS = 20_000;

// Una risposta al canarino al minuto per canale: chi conosce la frase non deve
// poterla usare per far scrivere il bot a raffica.
const _canarinoTs = new Map();
export function canarinoLibero(login, ora = Date.now()) {
  const prima = _canarinoTs.get(login) || 0;
  if (ora - prima < 60_000) return false;
  _canarinoTs.set(login, ora);
  return true;
}

// IL REGISTRO DEGLI EVENTI. Ogni evento di Twitch lascia una riga: il tipo, e
// accanto il suo contenuto in JSON. La leggono il rapporto di fine diretta e il
// cervello, e la rileggono rifacendo il JSON.
//
// UNA RIGA TAGLIATA A META' NON E' UN RECORD. Il taglio era a 300 caratteri, e
// un evento un po' lungo — un hype train ne occupa seicento, un abbonamento con
// un messaggio ci arriva vicino — veniva troncato in mezzo al JSON. Il tipo
// restava leggibile, il contenuto no: chi rileggeva otteneva un oggetto vuoto,
// e non c'era modo di accorgersene, perche' una riga tagliata sembra una riga.
//
// Quindi: o ci sta tutto, o si scrive il tipo e basta. Un contenuto che dichiara
// di non esserci e' piu' onesto di un mezzo contenuto che finge di esserci.
export const RIGA_EVENTO_MAX = 1000;
export function rigaEvento(tipo, dati) {
  const t = String(tipo || '').slice(0, 80);
  let corpo = '{}';
  try { corpo = JSON.stringify(dati || {}); } catch { corpo = '{}'; }
  const riga = `${t} ${corpo}`;
  return riga.length <= RIGA_EVENTO_MAX ? riga : `${t} {}`;
}

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
    // La pubblicità, per canale: {prossima, letto, dettoPer, ultimaPausa,
    // secondi, finisceA, dettoDopo}. Sta in memoria e non su disco apposta: è
    // lo stato di una pausa che dura minuti, e un riavvio nel mezzo la fa
    // perdere — che è esattamente quello che deve succedere (vedi
    // docs/PUBBLICITA.md). Le sveglie sono i due istanti a cui si parla: il
    // preavviso e il «sono tornato», per canale.
    this._pub = new Map();
    this._pubSveglie = new Map();
    this._pubTimer = null;
    this._tiktokTimer = null;
    this._tiktokLive = new Map();    // login → bool: in diretta su TikTok adesso
    this._tiktokUltima = new Map();  // login → ts ultima notifica TikTok (anti-doppioni)
    // Quello che dice da solo: quando l'ultima volta (il tetto), quando l'ultimo
    // promemoria dei link e l'ultima battuta (i loro riposi), e il registro che
    // il pannello mostra.
    // Quando il processo e' nato. Un riposo che non c'e' in memoria vale da qui,
    // non da zero: vedi spontanea.ultimoNoto — senza, ogni riavvio regalava una
    // riga immediata, e riavvii frequenti diventavano una raffica.
    this._nato = Date.now();
    this._ultimaSpontanea = new Map();   // login → ts dell'ultima volta che ha parlato da solo
    this._ultimaPromo = new Map();       // login → ts dell'ultimo promemoria dei link
    this._ultimaBattuta = new Map();     // login → ts dell'ultima battuta di sua iniziativa
    this._spontanee = new Map();         // login → [{ ts, tipo, testo }] di seduta
    this._ultimoTipo = new Map();        // login → cosa ha detto da solo l'ultima volta (mai due uguali di fila)
    this._momenti = new Momenti();       // i momenti buoni per parlare, riconosciuti dalla chat
    this._momentiTimer = null;
  }

  async start() {
    if (this.running) return;

    this.clips = new ClipEngine({ helix: this.helix, say: (ch, t) => this.say(ch, t) });
    this.alerts = new AlertsEngine({ effects: this.effects, say: (ch, t) => this.say(ch, t) });
    // Anti-bot (stile Sery_Bot): raffiche di follow, nomi da bot, hate-raid.
    this.antibot = new AntiBot({
      helix: this.helix,
      say: (ch, t) => this.say(ch, t),
      chatSettings: (ch, o) => this.helix.chatSoloFollower(ch, !!o.followersOnly, 0),
      alert: (ch, a) => { try { this.alerts?.manuale?.(ch, a); } catch { /* facolt. */ } },
    });
    // Le modalita' della chat a tempo (solo emote per due minuti): quello che
    // era acceso prima di un riavvio si riprende da dove era.
    this.modalita = new modalitaFeat.ModalitaChat({ helix: this.helix, say: (ch, t) => this.say(ch, t) });
    this.modalita.riprendi();
    if (this.modules) this.modules.modalita = this.modalita;
    games.impostaModalita(this.modalita);
    // Le mani di blackjack rimaste aperte da prima di un riavvio: nessuno le puo'
    // piu' giocare, e la puntata torna a chi l'aveva messa.
    try {
      for (const r of bjFeat.rimborsaDopoRiavvio()) log.info(`#${r.channel} blackjack: ${r.posta} rese a ${r.chi}, la mano era rimasta aperta`);
    } catch (e) { log.error('blackjack rimborsi:', e?.message || e); }
    // Il boss: la barra della vita sull'overlay, e la festa in solo emote.
    bossFeat.impostaSpinta((ch, p) => this.effects?.emit?.(ch, p));
    bossFeat.impostaModalita(this.modalita);
    this.penitenze = new PenitenzeEngine({
      say: (ch, t) => this.say(ch, t),
      effects: this.effects,
      // penitenza scelta dall'IA: chiede al cervello una penitenza breve e
      // giocosa. Se il cervello non è disponibile ritorna null → rete di sicurezza.
      ia: async (ch) => {
        const s = streamers.get(ch);
        const r = await brainpy.rispondi({
          via: 'bot', compito: true,   // un lavoretto: nessuna chat, nessuna persona
          canale: ch, canaleId: ch, login: ch, nome: 'sistema', timeoutMs: 4000,
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
    // I momenti per parlare da solo si guardano ogni quindici secondi: una
    // domanda rimasta sola va colta in un minuto, non in tre.
    this._momentiTimer = setInterval(() => this._valutaMomenti(), 15_000);
    // VIP: rimozione automatica degli scaduti + premi periodici (settimanale/mensile)
    this._vipTimer = setInterval(() => vip.controllaScadenze(this.helix).catch(() => {}), 5 * 60_000);
    this._premiTimer = setInterval(() => this._controllaPremi(), 60 * 60_000);
    // Anti-bot: lista di bot noti aggiornata da sola. Si riprende la copia su
    // disco subito (istantaneo), poi si scarica la fresca dopo 30s (per non
    // rallentare l'avvio) e la si rinfresca ogni 12 ore.
    caricaListaBotDaDisco().catch(() => {});
    caricaRegistroDaDisco().catch(() => {});
    caricaRete().catch(() => {});     // chi i canali hanno gia' riconosciuto insieme
    caricaIncidenti().catch(() => {});   // gli attacchi gia' successi: quelli aperti si chiudono
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
    this._amiciTimer = setInterval(() => this._giroAmici().catch(() => {}), 2 * 60_000);
    // Nuovi post: avvisa quando esce un nuovo video su YouTube (via RSS, ogni 10 min).
    this._ytId = new Map();
    // La chat di YouTube si legge chiedendola: il motore che la chiede sa anche
    // qual e' l'indirizzo della chat aperta adesso, e la voce glielo chiede.
    this.chatYT = new ChatYoutube({
      suMessaggio: (m) => { this.messaggioEsterno(m).catch(() => {}); },
    });     // login → id canale YouTube risolto (cache)
    this._postTimer = setInterval(() => this._controllaPost().catch(() => {}), 10 * 60_000);
    // Giochi del sito: poll delle regole da annunciare in chat quando parte una
    // partita (attivazione automatica anche per le partite create dal sito).
    this._annunciTimer = setInterval(() => this._pollAnnunciGiochi(), 15_000);
    // Compleanni: auguri automatici nel gruppo Telegram (controllo ogni ora;
    // un membro riceve gli auguri UNA volta l'anno, all'inizio del suo giorno).
    this._compleTimer = setInterval(() => this._controllaCompleanni().catch(() => {}), 60 * 60_000);
    setTimeout(() => this._controllaCompleanni().catch(() => {}), 30_000);
    // Il cancello del gruppo Telegram: chi e' entrato e non ha premuto il tasto.
    // Ogni mezzo minuto, perche' l'attesa piu' corta che si puo' scegliere e' un
    // minuto e un controllo ogni minuto la farebbe scadere fino al doppio tardi.
    this._cancelloTimer = setInterval(() => cancello.giroScadenze((ch) => tgConf.get(ch)).catch(() => {}), 30_000);
    // Manche automatiche: il bot lancia un gioco a caso, a intervalli casuali,
    // sui canali che l'hanno attivato (controllo ogni minuto).
    this._mancheProx = new Map();     // login → ts della prossima manche
    this._mancheTimer = setInterval(() => this._manche(), 60_000);
    // Il boss che arriva da solo: stesso giro di un minuto, intervallo fisso.
    this._bossProx = new Map();       // login → ts del prossimo boss
    this._bossTimer = setInterval(() => this._bossDaSolo(), 60_000);
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
    // I ruoli su Discord: ogni quarto d'ora, sui canali che l'hanno acceso. Non
    // e' legato alla diretta apposta — monete, ore e serie si muovono anche dopo,
    // e chi si collega a mezzogiorno non deve aspettare la sera per avere il suo
    // ruolo. Un giro in cui non cambia niente non chiama nessuno, quindi costa
    // quanto una lettura.
    this._dcRuoliTimer = setInterval(() => this._giroDiscord(), 15 * 60_000);
    setTimeout(() => this._giroDiscord(), 90_000);
    // Gli appuntamenti cambiano poco e vanno guardati spesso abbastanza da non
    // restare sbagliati per un giorno intero: quattro volte al giorno bastano,
    // e la prima poco dopo l'avvio, perche' il cambio d'ora puo' essere gia'
    // passato mentre il bot era fermo.
    // Il Programma di Twitch va allo stesso passo e per la stessa ragione: e' la
    // stessa settimana scritta in un altro posto.
    this._eventiDcTimer = setInterval(() => { this._giroEventiDiscord(); this._giroProgramma(); this._giroInstagram(); }, 6 * 60 * 60_000);
    setTimeout(() => { this._giroEventiDiscord(); this._giroProgramma(); this._giroInstagram(); }, 150_000);
    // La pubblicità: il giro legge il programma di Twitch, e non a ogni
    // passaggio (vedi `pub.vaGuardato`). Il preavviso e il «sono tornato» non
    // li dice il giro: sono istanti, e li dicono due sveglie puntate lì.
    this._pubTimer = setInterval(() => this._giroPubblicita(), pub.GIRO_MS);
    log.info('SocialBot avviato');
  }

  async stop() {
    this.running = false;
    clearInterval(this._syncTimer);
    clearInterval(this._animaTimer);
    clearInterval(this._momentiTimer);
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
    clearInterval(this._bossTimer);
    clearInterval(this._compleTimer);
    clearInterval(this._dcRuoliTimer);
    clearInterval(this._eventiDcTimer);
    clearInterval(this._pubTimer);
    this.modalita?.ferma();
    for (const t of this._pubSveglie.values()) clearTimeout(t);
    this._pubSveglie.clear();
    clearInterval(this._cancelloTimer);
    clearInterval(this._tgProattivoTimer);
    clearInterval(this._percorsoTimer);
    clearTimeout(this._risveglioTO);
    this._stopReflection?.();
    this.watcher?.stop();
    try { this.chatYT?.spegniTutti(); } catch { /* niente */ }
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
  // L'accordo di genere si applica QUI, all'uscita, oltre che quando si sceglie
  // la frase. E' una rete: una frase marcata che arrivasse fin qui senza essere
  // passata dallo scegli stamperebbe in chat il marcatore, e sarebbe un difetto
  // che si legge da fuori. Applicarlo due volte non fa danno: dopo la prima
  // passata di marcatori non ne restano.
  say(channel, text, opzioni) {
    const t = accorda(text, streamers.get(channel)?.settings?.genere);
    this.units.get(channel)?.chat.say(channel, t, opzioni);
    try { this._momenti.osserva(channel, { ts: Date.now(), user: channel, testo: t, dalBot: true }); } catch { /* niente */ }
  }

  // Una riga detta di sua iniziativa: esce come le altre, e in piu' finisce nel
  // registro che lo streamer legge nel pannello («Cosa ha detto da solo»). Senza
  // il registro, l'unico modo di giudicare la dose era stare in chat a guardare.
  _dettaDaSolo(channel, tipo, text, opzioni) {
    this.say(channel, text, opzioni);
    spontanea.registra(this._spontanee, channel, { ts: Date.now(), tipo, testo: text });
    log.info(`#${channel} da solo (${tipo}): ${String(text).slice(0, 120)}`);
  }

  // Come una persona: non nell'istante in cui decide, ma dopo il tempo di
  // scriverla (piu' lunga, piu' attesa; chat veloce, attesa piu' corta).
  _dettaDaSoloConCalma(channel, tipo, text, opzioni) {
    if (!text) return;
    const attesa = attesaUmana(String(text).length, this._momenti.ritmo(channel), Math.random());
    setTimeout(() => { if (this.units.has(channel)) this._dettaDaSolo(channel, tipo, text, opzioni); }, attesa);
  }

  spontanee(channel) { return spontanea.elenco(this._spontanee, channel); }

  // Battito dell'anima: l'umore "respira" (torna piano alla calma) e, se lo
  // streamer lascia la proattività accesa, ogni tanto il bot dice qualcosa di
  // sua iniziativa — dosato dalla stessa manopola "Chat autonoma", e solo se
  // c'è gente che parla (mai in una chat vuota).
  // Passa a ritirare la posta di Lei: quello che ha messo fuori, non quello che
  // pensa. Ogni tanto, e senza chiedere niente — se la cassetta e' vuota, e' vuota.
  async _ritiraPostaDiLei() {
    if (Date.now() - (this._ultimoRitiro || 0) < 15 * 60_000) return;
    this._ultimoRitiro = Date.now();
    const posta = await brainpy.posta().catch(() => []);
    if (!posta.length) return;
    const canali = [...this.units.keys()];
    const presi = [];
    for (const p of posta) {
      const messe = battute.accogliDaLei(canali, p.testo);
      presi.push(p.id);
      log.info(`una battuta sua e' entrata nel serbatoio di ${messe} canali`);
    }
    await brainpy.postaRitirata(presi).catch(() => {});
  }

  _battitoAnima() {
    try {
      persona.respira();
      this._ritiraPostaDiLei().catch((e) => log.debug('posta di lei:', e?.message || e));
      // Il bot che parla da solo non sta piu' qui: sta nei momenti (_valutaMomenti),
      // che guardano la chat ogni quindici secondi invece di tirare una moneta ogni tre minuti.
    } catch (e) { log.error('battito anima:', e?.message || e); }
  }

  // QUANDO PARLA DA SOLO. Ogni quindici secondi, per ogni canale acceso: i momenti
  // li riconosce la chat (momenti.js), se coglierne uno e quale lo decide la dose
  // e i riposi (spontanea.js), e qui si dice — con un motivo, e con calma.
  _valutaMomenti() {
    try {
      const ora = Date.now();
      for (const login of this.units.keys()) {
        const s = streamers.get(login);
        if (!s || s.settings?.proattivo === false) continue;
        const dose = Number(s.settings?.spontaneita) || 0;
        const live = this._liveState.get(login) === true;
        // I riposi sono orologi, non code: quando parlare era vietato o
        // impossibile vanno avanti con l'ora, se no il silenzio diventa credito e
        // il credito si spende tutto insieme appena la chat riprende.
        const riposi = [this._ultimaSpontanea, this._ultimaBattuta, this._ultimaPromo];
        if (spontanea.vietato({ dose, live, soloLive: s.settings?.proattivoSoloLive === true })) {
          spontanea.riposaOra(riposi, login, ora);
          continue;
        }
        const momenti = this._momenti.vedi(login, { ora, live, saQualcosa: (t) => !!this.brain?.saQualcosa?.(login, t) });
        if (!momenti.length) { spontanea.riposaOra(riposi, login, ora); continue; }
        // una battuta e' pronta solo se il serbatoio ne ha una, e' passato il suo
        // riposo, e non si sta ancora misurando se la precedente ha fatto ridere
        const battutaPronta = s.settings?.battuteAuto !== false && !battute.stoAscoltando(login)
          && ora - spontanea.ultimoNoto(this._ultimaBattuta, login, this._nato) > 20 * 60_000;
        const scelta = spontanea.scegliMomento({
          ora, dose, live, soloLive: s.settings?.proattivoSoloLive === true, momenti,
          ultimaSpontanea: spontanea.ultimoNoto(this._ultimaSpontanea, login, this._nato),
          ultimaPromo: spontanea.ultimoNoto(this._ultimaPromo, login, this._nato),
          ultimoTipo: this._ultimoTipo.get(login) || '',
          promoAccesa: s.settings?.promoSocial !== false,
          battutaPronta,
          caso: { jitter: Math.random(), scelta: Math.random() },
        });
        if (!scelta.tipo) continue;
        // Il riposo si segna QUI, quando si decide, non quando la riga esce: una
        // cosa chiesta al cervello arriva dopo, e nel frattempo un altro giro non
        // deve poterne decidere una seconda.
        this._ultimaSpontanea.set(login, ora);
        this._ultimoTipo.set(login, scelta.tipo);
        this._momenti.segna(login, scelta.momento.tipo, ora);
        this._eseguiMomento(login, s, scelta, ora);
      }
    } catch (e) { log.error('momenti:', e?.message || e); }
  }

  _eseguiMomento(login, s, { tipo, momento }, ora) {
    const spunto = momento.spunto || '';
    if (tipo === 'domanda') {
      // Rispondere a chi e' rimasto senza risposta: come a una menzione, ma
      // agganciata alla sua domanda (Twitch la mostra sotto), cosi' si capisce a chi.
      const q = momento.dati;
      Promise.resolve().then(() => this.brain.chatReply({ channel: login, user: q.user, display: q.display, text: q.testo, streamer: s, botLogin: login }))
        .then((t) => this._dettaDaSoloConCalma(login, 'domanda', t, q.id ? { rispondiA: q.id } : undefined))
        .catch((e) => log.debug(`#${login} domanda sola:`, e?.message || e));
      return;
    }
    if (tipo === 'hype' || tipo === 'rilancio' || tipo === 'iniziativa') {
      // L'aggancio viene da chi la chat ce l'ha in mano: e' l'ultima riga detta
      // ALLA STANZA, non l'ultima riga qualunque. Il cervello dice la sua su
      // quella, invece di pescarsela da solo.
      Promise.resolve().then(() => this.brain.iniziativa(login, { spunto, aggancio: momento.aggancio }))
        .then((t) => this._dettaDaSoloConCalma(login, tipo, t))
        .catch((e) => log.debug(`#${login} ${tipo}:`, e?.message || e));
      return;
    }
    if (tipo === 'battuta') {
      // La scelta di QUALE la fa il serbatoio, che pesa il riposo e la presa sul
      // pubblico — cosi' quella che non fa ridere nessuno smette di uscire da sola.
      const b = battute.prossimaDa(login);
      if (!b) { this._ultimoTipo.set(login, 'iniziativa'); return this._eseguiMomento(login, s, { tipo: 'iniziativa', momento }, ora); }
      this._ultimaBattuta.set(login, ora);
      battute.detta(login, b.n);
      this._dettaDaSoloConCalma(login, 'battuta', b.testo);
      return;
    }
    if (tipo === 'promo') {
      const promo = games.promoSociale(login);
      if (!promo) { this._ultimoTipo.set(login, 'iniziativa'); return this._eseguiMomento(login, s, { tipo: 'iniziativa', momento }, ora); }
      this._ultimaPromo.set(login, ora);
      this._dettaDaSoloConCalma(login, 'promo', promo);
    }
  }

  // Premi periodici: DUE GARE, ognuna col suo interruttore e il suo giro. Le
  // monete e i Bit sono due meriti diversi — chi c'e' sempre e chi mette mano al
  // portafoglio — e premiarne uno solo obbligava lo streamer a dire quale delle
  // due cose non gli interessa. Controllato ogni ora.
  //
  // La differenza fra le due sorgenti non e' il nome: le monete le sappiamo
  // sempre, la classifica dei Bit puo' non arrivare. E li' «non lo so» non e'
  // «non ha cheerato nessuno»: se si trattassero uguali, un permesso mancante o
  // un minuto storto di Twitch brucerebbero il premio del mese senza che nessuno
  // se ne accorga. Quindi finche' non si sa, il periodo resta da premiare.
  async _controllaPremi() {
    try {
      for (const login of this.units.keys()) {
        const s = streamers.get(login);
        if (!s?.settings) continue;
        const p = premio.di(s.settings);
        const dillo = (t) => this.say(login, t);
        let tocca = false;
        for (const gara of premio.GARE) if (premio.tocca(s.settings, gara)) { tocca = true; break; }
        if (!tocca) continue;
        // staff e padrone di casa non vincono: prima si sa chi sono
        await ruoli.riallinea(this.helix, login, { forza: true });
        let dopo = streamers.get(login)?.settings || s.settings;
        for (const gara of premio.GARE) {
          if (!premio.tocca(dopo, gara)) continue;
          const blocco = premio.di(dopo)[gara];
          let re = dopo.reBit || null;
          if (gara === 'bit') {
            const righe = await bit.classifica(this.helix, login, { periodo: blocco.periodo === 'mese' ? 'month' : 'week' });
            if (!righe) continue;
            const vinti = await vip.premiaTopBit(this.helix, login, righe, blocco, dillo);
            if (vinti[0]) re = { login: vinti[0].login, nome: vinti[0].nome || vinti[0].display, bit: vinti[0].bit || 0,
              titolo: vinti[0].titolo || '', da: Date.now(), salutato: '' };
          } else {
            await vip.premiaTopMonete(this.helix, login, blocco, dillo);
          }
          dopo = { ...dopo, premioVipUltimo: premio.segnaGiro(dopo, gara), ...(gara === 'bit' ? { reBit: re } : {}) };
          streamers.setSettings(login, dopo);
        }
      }
    } catch (e) { log.error('premi VIP:', e?.message || e); }
  }

  // UNA DIRETTA E' FINITA: il conto dei premi scende di uno, e chi e' arrivato
  // a zero diventa scaduto. A toglierlo davvero da Twitch ci pensa la ronda
  // delle scadenze, che quella strada la conosce gia' e sa riprovare.
  _scalaVipDiretta(login) {
    try {
      const n = vips.scalaDiretta(login);
      if (n) log.info(`premio VIP #${login}: ${n} ${n === 1 ? 'premio finito' : 'premi finiti'} con questa diretta`);
    } catch (e) { log.error(`#${login} conto dei VIP:`, e?.message || e); }
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
          // Stesso giro, stessa lista, ancora: chi c'e' viene censito per
          // capire in quanti canali nostri sta nello stesso momento. E' il
          // segnale che una persona non puo' produrre, e non costa nemmeno una
          // chiamata in piu' — la lista ce l'abbiamo gia' in mano.
          try { censisci(login, chatters); } catch (e) { log.debug(`#${login} censimento:`, e?.message || e); }
          this.antibot?.giroPresenze?.(login, chatters)
            .catch((e) => log.debug(`#${login} giro presenze:`, e?.message || e));
          // Stesso giro, stessa lista: le monete di presenza non costano
          // nemmeno una chiamata in piu' a Twitch.
          try { games.giroMonete(login, chatters, { live: true }); }
          catch (e) { log.debug(`#${login} monete:`, e?.message || e); }
          // E la presenza, che finora si deduceva dal parlare. Dedurla dal
          // parlare ha un buco che non si chiude con un caso particolare: i
          // messaggi che il bot manda non gli tornano indietro su IRC (serve a
          // non fare loop), e il bot parla con l'account dello STREAMER. Quindi
          // l'unico account che non poteva risultare in chat era proprio il suo,
          // e !duello rispondeva che non c'era mentre stava parlando. Chi c'e' e
          // sta zitto aveva lo stesso problema. Questa lista la da' Twitch: dice
          // chi e' nella stanza, non chi ha parlato di recente.
          try { for (const u of chatters) games.segnaPresenza(login, u); }
          catch (e) { log.debug(`#${login} presenze:`, e?.message || e); }
          // Diretta dopo diretta: chi c'e' per due giri e' presente a questa
          // diretta e la sua serie cresce. Stessa lista, e ai traguardi una riga.
          try {
            const esito = presenze.giroDiretta(login, { streamId: stream.id, chatters });
            for (const t of presenze.annunciDi(login, esito)) this.say(login, t);
          } catch (e) { log.debug(`#${login} serie di presenze:`, e?.message || e); }
          // e gli spettatori di questo giro, per il rapporto di fine diretta
          try { rapporto.osservaGiro(login, { spettatori: stream.viewer_count }); }
          catch (e) { log.debug(`#${login} rapporto:`, e?.message || e); }
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
        let prima = true;
        games.avviaManche(login, (t) => { if (prima) { prima = false; this._dettaDaSolo(login, 'manche', t); } else this.say(login, t); });
        this._mancheProx.set(login, this._prossimaManche(m));
      }
    } catch (e) { log.error('manche:', e?.message || e); }
  }

  // Il boss automatico: ogni `ogni` minuti, solo in diretta e a chat viva, e
  // solo se !colpisci risponde (un boss che nessuno puo' colpire non si
  // manda). Intervallo fisso e non casuale: e' quello su cui il pannello
  // calcola il massimo all'ora.
  _bossDaSolo() {
    try {
      for (const login of this.units.keys()) {
        const s = streamers.get(login);
        const ogni = bossFeat.vieneDaSolo(login);
        if (!ogni || s?.settings?.giochi === false || !registro.vivo(login, 'colpisci')) { this._bossProx.delete(login); continue; }
        if (this._liveState.get(login) !== true) continue;
        if ((memory.messageRate?.(login) || 0) < 1) continue;
        const prox = this._bossProx.get(login);
        if (prox === undefined) { this._bossProx.set(login, Date.now() + ogni * 60_000); continue; }
        if (Date.now() < prox) continue;
        let prima = true;
        bossFeat.arriva(login, (t) => { if (prima) { prima = false; this._dettaDaSolo(login, 'boss', t); } else this.say(login, t); });
        this._bossProx.set(login, Date.now() + ogni * 60_000);
      }
    } catch (e) { log.error('boss:', e?.message || e); }
  }

  // Un raid abbastanza grande porta un boss: chi arriva ha subito qualcosa da
  // fare insieme a chi c'era. Si aspetta un poco, che i raider entrino in chat.
  _bossDelRaid(login, data) {
    try {
      if (streamers.get(login)?.settings?.giochi === false || !registro.vivo(login, 'colpisci')) return;
      if (!bossFeat.vieneColRaid(login, data?.viewers)) return;
      const chi = data?.from_broadcaster_user_name || data?.from_broadcaster_user_login || '';
      const t = setTimeout(() => {
        if (!this.units.has(login)) return;
        let prima = true;
        bossFeat.arriva(login, (x) => { if (prima) { prima = false; this._dettaDaSolo(login, 'boss', x); } else this.say(login, x); }, { annuncio: chi ? `Il raid di ${chi} arriva giusto in tempo. ` : '' });
      }, BOSS_DOPO_RAID_MS);
      t.unref?.();
    } catch (e) { log.debug(`#${login} boss del raid:`, e?.message || e); }
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
    // Un giro alla volta. Questo parte ogni minuto e da ogni cambio di stato
    // live: se un giro resta indietro (Twitch lento) e ne parte un secondo,
    // tutti e due vedono un canale «senza unita'» e lo avviano — due connessioni
    // e due risposte a ogni comando. Il secondo giro aspetta il primo.
    if (this._syncInCorso) return this._syncInCorso;
    this._syncInCorso = this._syncChannels().finally(() => { this._syncInCorso = null; });
    return this._syncInCorso;
  }

  async _syncChannels() {
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
        // il posto si prende PRIMA di aspettare la rete: cosi' nessun altro giro
        // puo' avviare una seconda unita' per lo stesso canale nel frattempo
        this.units.set(login, { chat, connesso: false });
        try { await chat.connect(); }
        catch (e) { this.units.delete(login); throw e; }
        chat.join(login);
        const u = this.units.get(login); if (u) u.connesso = true;
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

    try { this.reconcileYoutube(wanted); }
    catch (e) { log.error('reconcileYoutube:', e?.message || e); }
  }

  // Chi deve leggere la chat di YouTube: il bot acceso, YouTube collegato e la
  // levetta alzata. Tutte e tre, se no si spende quota per una chat che nessuno
  // ha chiesto di leggere.
  reconcileYoutube(attivi) {
    let collegati = [];
    try { collegati = youtubeCollegati(); } catch (e) { return; }
    const insieme = new Set(collegati.map((x) => String(x).toLowerCase()));
    const vogliono = new Set();
    for (const [login, s] of attivi) {
      if (!insieme.has(login)) continue;
      if (s?.settings?.youtube?.chat !== true) continue;
      vogliono.add(login);
    }
    for (const login of vogliono) this.chatYT.accendi(login);
    for (const login of [...this.chatYT.giri.keys()]) if (!vogliono.has(login)) this.chatYT.spegni(login);
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
      chat: { say: (_c, t, o) => parla(t, o) }, helix: this.helix, brain: this.brain, clips: this.clips, botLogin: login,
    });
    await this._gestisciMessaggio(login, msg, onMessage, parla);
  }

  // LA VOCE DI UN MESSAGGIO. Sta scritta in UN posto solo, e non si ricava a
  // ogni chiamata: quindici punti del tubo rispondono a un messaggio, e
  // ricavarla in ognuno vuol dire quindici occasioni di sbagliare — infatti la
  // prima volta ne ho sbagliate quattordici, e un !comando scritto su Kick
  // veniva risposto su TWITCH. Peggio del silenzio.
  vocePer(msg) {
    // L'accordo di genere sta nella voce, non nei quindici punti che parlano:
    // e' la stessa ragione per cui la voce sta scritta in un posto solo. Su
    // Twitch si applica due volte (anche in say) e non fa danno.
    const genere = streamers.get(msg?.channel)?.settings?.genere;
    const con = (dire) => (t, o) => dire(accorda(t, genere), o);
    if (msg?.piattaforma === 'kick') { const v = voceKick(msg.channel); return con((t, o) => v.say(msg.channel, t, o)); }
    if (msg?.piattaforma === 'youtube') {
      const v = voceYoutube(msg.channel, { chatDiAdesso: (l) => this.chatYT.chatDi(l) });
      return con((t, o) => v.say(msg.channel, t, o));
    }
    return con((t, o) => this.say(msg.channel, t, o));
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
    if (filigrana.eCanarino(msg.text) && canarinoLibero(login)) { parla(filigrana.rispostaCanarino(licenza.firma())); return; }
    if (!msg.piattaforma || msg.piattaforma === 'twitch') {
      try { this._momenti.osserva(login, { ts: Date.now(), user: msg.user, display: msg.display, testo: msg.text, isSelf: !!msg.isSelf, id: msg.id, rispostaA: msg.rispostaA }); }
      catch (e) { log.debug(`#${login} momenti:`, e?.message || e); }
    }
    if (!msg.isSelf) this.clips.onActivity(msg);   // rilevatore "hype" per le clip automatiche (chat)
    try { this.alerts?.onChat(login, msg); } catch (e) { log.debug(`#${login} chat overlay:`, e?.message || e); }
    // pannello chat dello Studio Web (feed 'chat_raw' ungated): solo se qualcuno
    // è collegato via SSE, così non pesa quando lo Studio è chiuso.
    try { this.alerts?.onChatRaw?.(login, msg); } catch (e) { log.debug(`#${login} chat studio:`, e?.message || e); }
    this.brain.observe?.(msg);                             // apprendimento passivo (anche dai messaggi dello streamer)
    // amicizia GLOBALE: chi interagisce diventa piano piano "amico" del bot
    // (solo un'affinità, mai contenuti né in quale canale).
    if (!msg.isSelf) { try { persona.interagisci(msg.user); } catch { /* niente */ } }
    // L'economia gira sempre: le monete della presenza non sono un comando.
    try { games.accredita(msg); } catch (e) { log.error(`#${login} monete:`, e?.message || e); }
    // Chi scrive per la prima volta, e chi torna dopo un'assenza: una parola dal
    // bot, salvo che lo streamer si sia costruito il suo saluto con un Modulo.
    try {
      const live = msg.piattaforma && msg.piattaforma !== 'twitch' ? true : this._liveState.get(login) === true;
      presenze.suMessaggio(msg, parla, { live });
    } catch (e) { log.debug(`#${login} saluti:`, e?.message || e); }
    // Auguri a chi compie gli anni oggi, al suo primo messaggio: in chat non
    // esiste la mezzanotte, esiste quando c'e'.
    try { compleanniFeat.auguriInChat(msg, parla, (c, eff) => this.effects?.fire(c, eff)); }
    catch (e) { log.debug(`#${login} auguri:`, e?.message || e); }
    // Il re dei Bit che torna a scrivere: una volta per regno.
    try { bit.salutaIlRe(msg, parla); } catch (e) { log.debug(`#${login} re dei Bit:`, e?.message || e); }

    // «Quello che ti sei costruito vince»: se questo e' un comando che lo
    // streamer ha gia' suo (comando semplice o Modulo), i comandi PRONTI non lo
    // vedono nemmeno. Un solo vaglio qui in cima, invece di una guardia dentro
    // ogni famiglia — cosi' vale anche per quelle che verranno.
    const suo = personalizzati.suoComando(login, msg.text);
    // IL VAGLIO DEI COMANDI PRONTI. Tutto quel che si chiama con un «!» passa di
    // qui prima dei gestori: la parola scritta diventa il nome canonico (i
    // rinomini), un comando spento — o di una famiglia spenta — non arriva a
    // nessuno, e uno riservato risponde dicendo a chi e' riservato invece di
    // tacere. Un posto solo, cosi' vale anche per le famiglie che verranno.
    const vaglio = suo ? null : registro.preparaComando(login, msg);
    if (vaglio?.rifiuta) { parla(vaglio.messaggio); return; }
    if (!suo && !vaglio?.salta) {
    const cmdMsg = vaglio?.testo && vaglio.testo !== msg.text ? { ...msg, text: vaglio.testo } : msg;
    // lo scudo: !permetti nome, l'uscita dal trattenimento degli account nuovi.
    // Solo su Twitch, dove il trattenimento esiste.
    if (!msg.piattaforma || msg.piattaforma === 'twitch') {
      this.antibot?.tryComando?.(cmdMsg, parla)?.catch((e) => log.error(`#${login} scudo:`, e?.message || e));
      // le modalita' della chat a tempo: !soloemote 5m, !messaggiunici, !soloabbonati
      if (this.modalita) modalitaFeat.tryComando(this.modalita, cmdMsg, parla).catch((e) => log.error(`#${login} modalità:`, e?.message || e));
    }
    // minigiochi: !dado, !slot, !trivia, ...
    try { games.tryGame(cmdMsg, parla); }
    catch (e) { log.error(`#${login} giochi:`, e?.message || e); }
    // giveaway / sorteggi (!giveaway, !join, !estrai) — segue l'add-on Giochi
    try { giveaway.tryGiveaway(cmdMsg, parla); }
    catch (e) { log.error(`#${login} giveaway:`, e?.message || e); }
    // ore guardate / fedeltà (!ore, !classificaore)
    try { watchtime.tryComando(cmdMsg, parla); }
    catch (e) { log.error(`#${login} ore:`, e?.message || e); }
    // serie di presenze (!serie, !classificaserie)
    try { presenze.tryComando(cmdMsg, parla); }
    catch (e) { log.error(`#${login} serie:`, e?.message || e); }
    // il proprio compleanno (!compleanno GG/MM): opt-in, vive con gli auguri in chat
    try { compleanniFeat.tryComando(cmdMsg, parla); }
    catch (e) { log.error(`#${login} compleanno:`, e?.message || e); }
    // il proprio account Discord (!discord CODICE): il codice nasce sul web e
    // si chiude qui, perche' solo la chat puo' dire che quel Twitch sei tu
    try { dcCollega.tryComando(cmdMsg, parla); }
    catch (e) { log.error(`#${login} discord:`, e?.message || e); }
    // quanto manca alla fine del subathon (!subathon)
    try { subathonFeat.tryComando(cmdMsg, parla); }
    catch (e) { log.error(`#${login} subathon:`, e?.message || e); }
    // a che punto e' l'hype train in corso (!treno)
    try { trenoFeat.tryComando(cmdMsg, parla); }
    catch (e) { log.error(`#${login} treno:`, e?.message || e); }
    // comandi base pronti (!so/!shoutout, !followage, !uptime): opt-out e mai
    // sopra ai comandi/Moduli creati dallo streamer (quelli vincono).
    comandibase.tryComando(this.helix, cmdMsg, parla)
      .catch((e) => log.error(`#${login} comandi base:`, e?.message || e));
    // minigiochi webcam (!mima/!nonridere/!reaction/!battaglia, !sfida): avviano
    // i giochi nell'overlay tracking. Deterministico; solo se il tracking è acceso.
    try { trackinggiochi.tryComando(this.effects, cmdMsg, parla); }
    catch (e) { log.error(`#${login} giochi tracking:`, e?.message || e); }
    // gestione comandi dalla chat (!comando aggiungi/…): opt-in, solo se accesa
    try { comandichat.tryComando(cmdMsg, parla); }
    catch (e) { log.error(`#${login} comandi-chat:`, e?.message || e); }
    // comandi VIP (mod/streamer): !vip @nome [durata], !unvip, !viplista
    vip.tryVipCommand(this.helix, cmdMsg, parla).catch((e) => log.error(`#${login} vip:`, e?.message || e));
    // sondaggi & predizioni Twitch (mod/streamer) — add-on Effetti & Punti canale
    sondaggi.trySondaggio(this.helix, cmdMsg, parla).catch((e) => log.error(`#${login} sondaggi:`, e?.message || e));
    // richieste musicali via Spotify (!sr, !song) — add-on Richieste Musicali
    songrequest.trySongRequest(cmdMsg, parla).catch((e) => log.error(`#${login} songrequest:`, e?.message || e));
    // citazioni (!cita) — lo shoutout (!so) lo gestisce comandibase qui sopra
    try { quotes.tryQuoteCommand(msg, parla); } catch (e) { log.error(`#${login} citazioni:`, e?.message || e); }
    // Le battute: prima il serbatoio del canale, che e' istantaneo e sicuro. Il
    // cervello solo quando il serbatoio e' vuoto, e con l'attesa corta — una
    // battuta che arriva dopo quindici secondi non fa ridere nessuno. Il carattere
    // e le regole del canale viaggiano con la richiesta, quindi la inventa come
    // parla lui e non come parla un manuale.
    try {
      battute.tryBattuta(msg, parla, {
        // prima si COSTRUISCE con la materia di questo canale: istantaneo, e non
        // dipende dal cervello. Il modello resta la spiaggia dopo, non l'autore.
        motore: (canale) => motoreBattute.costruisci(canale),
        inventa: async () => {
          const s = streamers.get(login);
          return brainpy.rispondi({
            via: 'bot', compito: true,
            canale: login, canaleId: login, login, nome: 'sistema', timeoutMs: 6000,
            tono: s?.settings?.tono || 'scherzoso',
            lineeGuida: guide.applicabili(login, { piattaforma: 'twitch', privato: false, sonoIo: false }),
            testo: 'Inventa UNA battuta breve per la chat di una diretta (max 20 parole). Niente insulti, niente politica, niente sesso. Rispondi SOLO con la battuta.',
          }).catch(() => null);
        },
      });
    } catch (e) { log.error(`#${login} battute:`, e?.message || e); }
    // contatori (!morti, !tentativi, !parole…): comando chat + auto-conteggio parole.
    // L'emit aggiorna il widget sullo STESSO overlay OBS (feed SSE di alert/effetti).
    try { contatori.tryComando(msg, parla, (p) => this.effects?.emit?.(login, p)); }
    catch (e) { log.debug(`#${login} contatori:`, e?.message || e); }
    }

    // Il conteggio automatico delle parole non e' un comando: gira sempre.
    try { contatori.perParola(msg, (p) => this.effects?.emit?.(login, p)); }
    catch (e) { log.debug(`#${login} conta-parole:`, e?.message || e); }
    // Gli effetti sono roba SUA, non un comando pronto: restano fuori dal vaglio.
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
    const vogliono = streamers.active().filter(s => s.settings?.ascoltoLive === true && canaleHa(s.login, 'voce'));
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
    memory.logMessage(channel, '[evento]', '', rigaEvento(type, data), true);
    this.brain?.onEvent?.(ev, (text) => this.say(channel, text));
    // alert overlay (follow/sub/cheer/raid): notifica animata + suono
    try { this.alerts?.onEvent(ev); } catch (e) { log.debug(`#${channel} alert evento:`, e?.message || e); }
    // clip automatiche: sub/bit/raid sono momenti forti (le clip li "sentono")
    try { this.clips?.onEvent(ev); } catch (e) { log.debug(`#${channel} clip evento:`, e?.message || e); }
    // la classifica dei Bit tenuta in memoria non vale piu': un cheer e' l'unico
    // momento in cui puo' essere cambiata, quindi e' l'unico in cui vale la pena
    // richiederla. Cosi' chi scrive «!bit» appena dopo si vede gia' dentro.
    if (type === 'channel.cheer') { try { bit.scorda(channel); this._classificaBitInScena(channel); } catch { /* niente */ } }
    // anti-bot: follow-bot (raffiche + nomi noti) e hate-raid
    try {
      if (type === 'channel.follow') this.antibot?.onFollow(ev);
      else if (type === 'channel.raid') this.antibot?.onRaid(ev);
    } catch (e) { log.error(`#${channel} anti-bot evento:`, e?.message || e); }
    if (type === 'channel.raid') this._bossDelRaid(channel, data);
    // moduli: automazioni con trigger 'evento' (follow, sub, raid, cheer, ...)
    try { this.modules?.onEvent(ev, (t) => this.say(channel, t)); }
    catch (e) { log.error(`#${channel} moduli evento:`, e?.message || e); }
    // la pubblicità che comincia: il messaggio di adesso, e la scadenza del
    // conto per quello di dopo — che è l'unico modo di saperlo, perché un
    // evento di fine Twitch non ce l'ha.
    if (type === 'channel.ad_break.begin') {
      this._pubblicitaPartita(channel, data).catch((e) => log.debug(`#${channel} pubblicità:`, e?.message || e));
    }
    // plugin operatore (opzionali)
    try { this.bus?.emit('event', ev); } catch (e) { log.debug('bus event:', e?.message || e); }
  }

  // LA CLASSIFICA DEI BIT IN SCENA, spinta quando cambia — cioe' quando passa un
  // cheer, l'unico momento in cui puo' essere cambiata. L'overlay se la chiede
  // una volta al caricamento, poi resta fermo ad ascoltare: nessuno interroga
  // Twitch a tempo per una cosa che per ore non si muove.
  //
  // Se non c'e' nessuna fonte OBS collegata non si chiede niente: sarebbe una
  // chiamata a Twitch per una scena che nessuno sta guardando. E un «non lo so»
  // non si manda: l'overlay terrebbe le righe di prima, che e' la cosa giusta.
  _classificaBitInScena(channel) {
    const cfg = streamers.get(channel)?.settings?.overlayBit;
    if (!cfg?.attivo || !this.effects?.hasClients?.(channel)) return;
    bit.classifica(this.helix, channel, { periodo: cfg.periodo || 'month' })
      .then((righe) => { if (righe) this.effects?.emit?.(channel, { tipo: 'bit', righe: righe.slice(0, 10) }); })
      .catch(() => { /* alla prossima */ });
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
    // LA DIRETTA E' UN FATTO, L'ANNUNCIO E' UNA TRANSIZIONE: due cose diverse, e
    // per un po' le ha decise la stessa riga. Al primo rilevamento si usciva
    // subito — giusto per non gridare «è live!» quando il bot riparte a diretta
    // in corso, sbagliato per la serata, che resta aperta lo stesso.
    //
    // Si vedeva, ed era peggio di un dettaglio: mentre eri in onda la scheda dei
    // numeri diceva zero minuti e zero picco, e una diretta che finiva dopo un
    // riavvio non lasciava NESSUN rapporto — alla chiusura non c'era niente da
    // chiudere, e quella serata spariva. Percio' la contabilità si fa sempre, e
    // prima: aprirla due volte non la ricomincia.
    if (isLive) rapporto.apri(ch, { inizio: Date.parse(data?.started_at) || 0 });
    // Primo rilevamento (bot appena avviato): NON è una transizione vera.
    // Evita di annunciare "è live!" se il bot riparte a diretta già in corso.
    if (prev === undefined) return;
    const ev = { channel: ch, type: isLive ? 'stream.online' : 'stream.offline', data: data || {} };
    this._dispatchEvent(ev);
    if (isLive) {
      this._annunciaTwitch(ch).catch((e) => log.error(`avviso live #${ch}:`, e?.message || e));
      this._storiaDellaDiretta(ch).catch((e) => log.error(`storia della diretta #${ch}:`, e?.message || e));
    } else {
      this._chiudiAvvisi(ch);
      this._scalaVipDiretta(ch);
      this._rapportoDiretta(ch).catch((e) => log.error(`rapporto #${ch}:`, e?.message || e));
    }
    this._reagisciAllaDiretta(ch, isLive);   // lei se ne accorge e ti scrive (presente/consapevole)
  }

  // LA STORIA DELLA DIRETTA: se lo streamer l'ha accesa nelle Grafiche, la sua
  // grafica «Live ora» in verticale va nella storia di Instagram. Se non parte,
  // oltre al pannello glielo si dice in privato su Telegram, se l'ha collegato:
  // una storia automatica che non esce, e nessuno lo sa, e' peggio di nessuna
  // storia. Il ragionamento sta in docs/GRAFICHE.md.
  async _storiaDellaDiretta(login) {
    const r = await storiaIg.storiaDellaDiretta(login);
    if (!r.fatto || r.ok) return;
    log.warn(`#${login} storia della diretta non partita: ${r.errore}`);
    const conf = tgConf.get(login);
    if (conf?.token && conf.owner_tg_id && (conf.dm_modo || 'me') !== 'off') {
      const testo = `La storia di Instagram della diretta non è partita: ${telegram.escHtml(r.errore)}. Il riquadro della storia, nelle Grafiche, dice come rimediare.`;
      await telegram.inviaMessaggio(conf.token, conf.owner_tg_id, testo, { anteprima: false }).catch(() => {});
    }
  }

  // A diretta finita, il rapporto in privato: numeri, non aggettivi. Solo se lo
  // streamer lo vuole e ha collegato la chat privata. Il rapporto e' suo, e
  // stare zitti quando non lo vuole vale quanto scrivere quando lo vuole.
  async _rapportoDiretta(login) {
    try {
      const chiuso = rapporto.chiudi(login);
      if (!chiuso) return;
      const dati = { ...chiuso, ...rapporto.raccogli(login, chiuso) };
      // COSA C'ERA DENTRO QUELLE CLIP. Di nostro sappiamo solo perche' le abbiamo
      // fatte; il titolo, la durata e l'anteprima li fa nascere Twitch dopo, e si
      // chiedono. Una volta sola, per tutte insieme, e QUI: il rapporto si scrive
      // una volta e da li' in poi lo rileggono il pannello, la mail e Telegram.
      //
      // Best-effort per forza: se Twitch non risponde il rapporto si salva lo
      // stesso, con i titoli che aveva prima. Un rapporto senza titoli e' peggio
      // di uno con; un rapporto che non si salva e' peggio di tutti e due.
      try {
        const ids = (dati.clipElenco || []).map((c) => c?.id).filter(Boolean);
        if (ids.length) dati.clipElenco = rapporto.unisciClip(dati.clipElenco, await this.helix.dettagliClip(ids));
      } catch (e) { log.debug(`#${login} titoli delle clip:`, e?.message || e); }
      // il rapporto resta sempre, nella scheda Dirette: i canali sono in piu'
      const id = rapporti.salva(login, { inizio: chiuso.inizio, fine: chiuso.fine, dati });
      const c = rapporto.cfg(login);
      const conf = tgConf.get(login);
      if (c.telegram && conf?.token && conf.owner_tg_id && (conf.dm_modo || 'me') !== 'off') {
        telegram.inviaMessaggio(conf.token, conf.owner_tg_id, rapporto.testo(dati), { anteprima: false })
          .then(() => rapporti.segnaInviato(id, 'telegram'))
          .catch((e) => log.debug(`#${login} rapporto su Telegram:`, e?.message || e));
      }
      const pst = postaStreamer.get(login);
      if (c.mail && pst?.confermata && pst.email && posta.attiva()) {
        const display = streamers.get(login)?.display || login;
        const codice = posta.codiceDi(login);
        posta.invia({ a: pst.email, oggetto: rapporto.oggetto(dati), testo: rapporto.testoPiano(dati, { codice }), html: rapporto.html(dati, { display, codice }) })
          .then(() => rapporti.segnaInviato(id, 'mail'))
          .catch((e) => log.warn(`#${login} rapporto via mail:`, e?.message || e));
      }
    } catch (e) { log.debug(`#${login} rapporto:`, e?.message || e); }
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
    if (!canaleHa(login, 'notifiche')) return { inviati: 0, piano: false };
    // Anti-doppioni PER PIATTAFORMA: si puo' essere live su Twitch e su Kick
    // insieme, e un ricordo solo cancellerebbe l'altro.
    if (d.id && dirette.gia(login, piattaforma, d.id)) return { inviati: 0, gia: true };

    const s = streamers.get(login);
    const conNome = { ...d, display: d.display || s?.display || login };
    const { inviati } = await this._diffondi(login, avvisi.eventoDi(piattaforma), login, conNome, {
      chiudi: true,
      messaggioTg: piattaforma === 'twitch' ? (tgConf.get(login)?.messaggio || '') : '',
    });

    if (inviati && d.id) dirette.segna(login, piattaforma, d.id);
    return { inviati };
  }

  // UN AVVISO, TUTTI I TRASPORTI.
  //
  // Chi scopre la notizia dice COSA e' successo e DI CHI; dove finisce lo decide
  // la matrice, e la decide una volta sola. Prima ogni scopritore si portava
  // dietro il proprio giro di Telegram, e Discord veniva servito a parte con una
  // destinazione sola: cosi' «il post nuovo su Instagram» sapeva arrivare a un
  // topic e non sapeva arrivare a un canale, senza che nessun errore lo dicesse.
  async _diffondi(login, evento, chi, d, { chiudi = false, messaggioTg = '', conIncorniciato = true } = {}) {
    let inviati = 0;
    // «chi» sono io o e' un altro? La differenza non e' estetica: l'avviso di un
    // altro va ricordato per STREAMER, se no la sua diretta che finisce chiude
    // anche la mia.
    const altrui = chi && chi !== login ? chi : null;
    // La lista di chi guardare e' una sola, ma «annuncia anche la community» si
    // accende dove si vuole: chi arriva dalla community entra solo nella sezione
    // che l'ha chiesto. Chi e' stato aggiunto a mano entra sempre — l'hai scelto tu.
    const daCommunity = !!altrui && amici.fonteDi(login, altrui) === 'community';
    const vuole = avvisiConf.get(login).community;
    const ammesso = { telegram: !daCommunity || vuole.telegram, discord: !daCommunity || vuole.discord };
    try {
      const conf = tgConf.get(login);
      if (ammesso.telegram && conf?.attivo && conf.token) {
        const componi = (conLocandina) => avvisi.messaggio(d, messaggioTg, { conLocandina });
        const r = await this._diffondiTelegram(login, conf, evento, chi, componi, { pin: chiudi, chi: altrui, info: d });
        inviati += r.inviati || 0;
      }
    } catch (e) { log.error(`avviso Telegram ${evento} #${chi}:`, e?.message || e); }
    try {
      if (ammesso.discord) {
        const r = await this._diffondiDiscord(login, evento, chi, d, { chiudi, conIncorniciato });
        inviati += r.inviati || 0;
      }
    } catch (e) { log.error(`avviso Discord ${evento} #${chi}:`, e?.message || e); }
    return { inviati };
  }

  // La gemella di `_diffondiTelegram`. Il token del bot non sta nella
  // configurazione degli avvisi: sta nella busta dei segreti, con gli altri, e
  // si prende qui — cosi' la configurazione resta una cosa che si puo' guardare
  // senza scoprire niente.
  async _diffondiDiscord(login, evento, chi, d, { chiudi = false, conIncorniciato = true } = {}) {
    dcDest.migra(login, dcConf.get(login));   // il vecchio canale unico diventa la prima destinazione
    const dest = dcDest.perEvento(login, evento, chi);
    if (!dest.length) return { inviati: 0 };
    // Il token serve a chi passa dal bot; chi ha un webhook ha gia' la sua
    // chiave dentro l'indirizzo. Pretenderlo qui spegnerebbe i webhook.
    const token = dcApi.tokenDi(dcRuoli.get(login));
    const buoni = token ? dest : dest.filter((x) => x.webhook);
    if (!buoni.length) return { inviati: 0 };
    const esiti = await discord.diffondi(token, buoni, d, { conIncorniciato });
    let inviati = 0;
    for (const e of esiti) {
      if (!e.ok) continue;
      inviati++;
      if (!chiudi || !e.dest.chiudi || !e.id) continue;
      if (chi && chi !== login) dcMsg.segna(login, e.dest.id, chi, e.id);
      else dcDest.setMsgId(e.dest.id, e.id);
    }
    if (inviati) log.info(`Discord: «${evento}» di #${chi} inviato a ${inviati}/${buoni.length} canali di #${login}`);
    return { inviati, totale: buoni.length };
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
  async _diffondiTelegram(login, conf, evento, streamerLogin, componiTesto, { pin = false, chi = null, info = null } = {}) {
    tgDest.migra(login, conf);                       // il vecchio gruppo unico diventa la prima destinazione
    const dest = tgDest.perEvento(login, evento, streamerLogin);
    if (!dest.length) return { inviati: 0 };
    // LA CARTA. La decisione «va allegata?» sta in cartalive.js, e la fa anche
    // la prova dal pannello: due decisioni separate vorrebbero dire una prova
    // che prova qualcosa di diverso da quello che parte davvero.
    const foto = await cartaLive.fotoPerEvento(login, evento, { chi: streamerLogin, info, helix: this.helix });
    // Il testo si compone DOPO aver saputo se la locandina parte: con l'immagine
    // dice meno, perche' titolo e gioco sono gia' disegnati dentro. Comporlo
    // prima vorrebbe dire mandare due volte la stessa cosa.
    const testo = typeof componiTesto === 'function' ? componiTesto(!!foto) : componiTesto;
    const esiti = await telegram.diffondi(conf.token, dest, testo, { anteprima: true, foto });
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
  async _giroAmici() {
    const canali = new Set(amici.canaliConAmici());
    for (const s of streamers.list()) if (avvisiConf.vuoleCommunity(s.login)) canali.add(s.login);
    for (const ch of canali) {
      try {
        // Si gira se c'e' qualcuno che ascolta, non se c'e' un bot Telegram.
        // Prima la prima riga chiedeva il token di Telegram: chi ha solo Discord
        // non guardava nessun amico, e non c'era nessun errore a dirglielo.
        if (!this._haDoveAvvisare(ch)) continue;
        // la lista automatica segue la community: chi entra compare, chi esce sparisce
        // basta che la voglia UNA sezione: la lista e' condivisa, chi la
        // annuncia lo decide ogni sezione per conto suo, al momento dell'avviso.
        if (avvisiConf.vuoleCommunity(ch)) {
          amici.sincronizzaCommunity(ch, streamers.membriCommunity(ch)
            .map((x) => ({ login: x.login, display: x.display })));
        } else {
          amici.sincronizzaCommunity(ch, []);
        }
        for (const a of amici.daGuardare(ch)) {
          const info = await this.helix.getStream(a.login).catch(() => null);
          const streamId = String(info?.id || '');
          if (!streamId) {
            // non è live: se avevamo annunciato la sua diretta, chiudiamola
            if (a.ultima_live) { await this._chiudiLiveEsterna(ch, a.login); amici.setUltimaLive(ch, a.login, ''); }
            continue;
          }
          if (streamId === a.ultima_live) continue;      // già annunciata
          // La diretta di un amico passa dalla STESSA strada di quella di casa:
          // stesso oggetto, stesso compositore, stessa locandina. Prima aveva un
          // compositore suo, e infatti il testo corto per la locandina sarebbe
          // arrivato solo da una parte.
          const sua = avvisi.diretta({
            piattaforma: 'twitch', login: a.login, display: a.display || a.login,
            titolo: info?.title || '', gioco: info?.game_name || '',
            spettatori: info?.viewer_count ?? null, id: streamId,
          });
          if (info?.thumbnail_url) sua.miniatura = info.thumbnail_url.replace('{width}', '1280').replace('{height}', '720');
          const r = await this._diffondi(ch, avvisi.eventoDi('twitch'), a.login, sua, {
            chiudi: true,
            messaggioTg: a.messaggio || tgConf.get(ch)?.messaggio || '',
          });
          if (r.inviati) amici.setUltimaLive(ch, a.login, streamId);
        }
      } catch (e) { log.debug(`amici #${ch}:`, e?.message || e); }
    }
  }

  // C'e' qualcuno che ascolta? Serve prima di chiedere a Twitch come sta ogni
  // amico: le chiamate costano, e farle per un canale che non ha dove mandare
  // l'avviso e' lavoro buttato.
  _haDoveAvvisare(login) {
    const conf = tgConf.get(login);
    if (conf?.attivo && conf.token) {
      tgDest.migra(login, conf);
      if (tgDest.lista(login).some((d) => d.attivo)) return true;
    }
    dcDest.migra(login, dcConf.get(login));
    return dcDest.lista(login).some((d) => d.attivo);
  }

  // Diretta di un altro streamer finita: togli l'avviso SOLO suo, in ogni
  // destinazione dove era stato fissato. Gli avvisi degli altri restano intatti.
  async _chiudiLiveEsterna(login, chi) {
    try {
      const conf = tgConf.get(login);
      if (conf?.token) {
        for (const m of tgMsg.perStreamer(login, chi)) {
          const d = tgDest.get(login, m.dest_id);
          if (d?.pin && m.msg_id) {
            const r = await telegram.eliminaMessaggio(conf.token, d.chat_id, m.msg_id);
            if (!r.ok) log.debug(`elimina live di ${chi} in ${d.titolo || d.chat_id}: ${r.errore}`);
          }
        }
      }
      tgMsg.pulisci(login, chi);
      const token = dcApi.tokenDi(dcRuoli.get(login));
      {
        for (const m of dcMsg.perStreamer(login, chi)) {
          const d = dcDest.get(login, m.dest_id);
          if (d?.chiudi && m.msg_id) {
            const r = await discord.chiudiMessaggio(token, d, m.msg_id, discord.testoFinita({ display: chi }));
            if (!r.ok) log.debug(`chiudi live di ${chi} in ${d.canale_nome || d.canale}: ${r.errore}`);
          }
        }
      }
      dcMsg.pulisci(login, chi);
    } catch (e) { log.debug(`chiudi live esterna ${chi}:`, e?.message || e); }
  }


  // Live spenta: l'avviso si toglie DOVE era stato messo — in ogni gruppo e in
  // ogni canale che l'aveva chiesto. Best-effort e idempotente: se non c'e'
  // niente da togliere, non fa niente. Il bot puo' cancellare i propri messaggi
  // entro 48 ore su Telegram, e i propri sempre su Discord.
  async _chiudiAvvisi(login) {
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
    try {
      const token = dcApi.tokenDi(dcRuoli.get(login));
      for (const d of dcDest.lista(login)) {
        if (!token && !d.webhook) continue;
        if (!d.msg_id) continue;
        const msgId = d.msg_id;
        dcDest.setMsgId(d.id, '');    // azzera comunque: un solo tentativo per destinazione
        if (!d.chiudi) continue;      // si toglie solo dove lo streamer l'ha chiesto
        const r = await discord.chiudiMessaggio(token, d, msgId, discord.testoFinita(streamers.get(login) || { login }));
        if (r.ok) log.info(`avviso Discord chiuso in ${d.canale_nome || d.canale} (live di #${login} finita)`);
        else log.warn(`chiudi Discord ${d.canale_nome || d.canale}: ${r.errore}`);
      }
    } catch (e) { log.error(`chiudi Discord #${login}:`, e?.message || e); }
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
  // IL GIRO DEI RUOLI SU DISCORD. Qui dentro c'e' solo il collegamento fra i due
  // mondi: la fotografia di chi e' chi su Twitch la fa chi parla con Twitch, e
  // il giro non deve sapere come si chiede. Se quella fotografia manca un fatto,
  // il giro lo trattera' come «non lo so» e quel ruolo non lo toccherà.
  async _giroDiscord() {
    try {
      await dcGiro.giroTutti({ quadro: (canale, gente) => this.helix.ruoliDi(canale, gente) });
    } catch (e) { log.debug('giroDiscord:', e?.message || e); }
  }

  // LA PUBBLICITA': il programma, e le due sveglie.
  //
  // Nessuna delle due frasi e' un evento: il preavviso si ricava dal programma
  // (che Twitch riempie solo mentre sei in onda), il «sono tornato» e' il conto
  // sui secondi che l'evento di partenza ha dichiarato. Tutte e due cadono a
  // un istante preciso, e a quell'istante si arriva con una sveglia: un giro
  // ogni mezzo minuto le farebbe arrivare fino a mezzo minuto dopo. Il giro
  // serve solo a leggere il programma. Vedi docs/PUBBLICITA.md.
  async _giroPubblicita() {
    const adesso = Date.now();
    for (const [ch, live] of this._liveState) {
      const conf = pub.normalizzaPubblicita(streamers.get(ch)?.settings?.pubblicita);
      if (!conf.acceso) { this._pub.delete(ch); this._spegniSveglia(ch, 'prima'); this._spegniSveglia(ch, 'dopo'); continue; }
      const stato = this._pub.get(ch) || {};
      // Fuori diretta il programma non si chiede: Twitch lo lascia vuoto
      // apposta, e sarebbe una telefonata per una risposta che sappiamo gia'.
      if (live && pub.vaGuardato(conf, stato, adesso)) {
        const p = await this.helix?.getAdSchedule?.(ch).catch(() => null);
        stato.prossima = p?.prossima || 0;
        stato.letto = adesso;
        const dire = pub.quandoAvvisare(conf, stato, p, adesso);
        if (dire) this._sveglia(ch, 'prima', dire, () => this._preavviso(ch));
      }
      this._pub.set(ch, stato);
    }
  }

  // Una sveglia per canale e per frase: puntarne una nuova toglie la vecchia,
  // cosi' la stessa frase non si dice due volte.
  _sveglia(ch, quale, quando, fa) {
    const k = `${ch}:${quale}`;
    clearTimeout(this._pubSveglie.get(k));
    const t = setTimeout(() => {
      if (this._pubSveglie.get(k) === t) this._pubSveglie.delete(k);
      fa().catch((e) => log.debug(`#${ch} pubblicità (${quale}):`, e?.message || e));
    }, Math.max(0, quando - Date.now()));
    t.unref?.();
    this._pubSveglie.set(k, t);
  }

  _spegniSveglia(ch, quale) {
    const k = `${ch}:${quale}`;
    clearTimeout(this._pubSveglie.get(k));
    this._pubSveglie.delete(k);
  }

  // IL PREAVVISO, all'istante giusto. Il programma si rilegge adesso: se uno
  // snooze ha spostato la pausa, il preavviso di quella li' non si dice.
  async _preavviso(ch) {
    if (!this._liveState.get(ch)) return;
    const conf = pub.normalizzaPubblicita(streamers.get(ch)?.settings?.pubblicita);
    if (!conf.acceso) return;
    const p = await this.helix?.getAdSchedule?.(ch).catch(() => null);
    const adesso = Date.now();
    const stato = this._pub.get(ch) || {};
    if (p) { stato.prossima = p.prossima; stato.letto = adesso; }
    const avviso = p ? pub.preavviso(conf, stato, p, adesso) : null;
    if (avviso) stato.dettoPer = String(avviso.quando);
    this._pub.set(ch, stato);
    if (avviso) await this._annuncio(ch, conf, avviso.testo);
  }

  // L'annuncio evidenziato in chat. Se Twitch dice di no — permesso tolto,
  // canale offline — non si riprova: un annuncio ritentato arriverebbe fuori
  // tempo, e fuori tempo e' peggio che niente.
  async _annuncio(ch, conf, testo) {
    try {
      const r = await this.helix?.announce?.(ch, testo, conf.colore);
      if (!r?.ok) log.debug(`#${ch} annuncio pubblicita' non partito: ${r?.motivo || '?'}`);
    } catch (e) { log.debug(`#${ch} annuncio pubblicita':`, e?.message || e); }
  }

  // LA PAUSA CHE COMINCIA. Arriva da EventSub, ed e' l'unico momento in cui
  // Twitch ci dice qualcosa: da qui escono il messaggio di adesso e la
  // sveglia del «sono tornato», puntata a inizio + durata.
  async _pubblicitaPartita(ch, dati) {
    const conf = pub.normalizzaPubblicita(streamers.get(ch)?.settings?.pubblicita);
    if (!conf.acceso) return;
    const stato = this._pub.get(ch) || {};
    const a = pub.allaPartenza(conf, stato, dati, Date.now());
    if (!a) return;
    stato.ultimaPausa = String(a.inizio);
    stato.secondi = a.secondi;
    stato.finisceA = a.finisceA;
    stato.dettoDopo = false;
    // La pausa e' cominciata: il preavviso di quella li' ha finito il suo
    // mestiere, e la prossima e' un'altra cosa da guardare da capo.
    stato.prossima = 0;
    stato.dettoPer = '';
    this._pub.set(ch, stato);
    this._spegniSveglia(ch, 'prima');
    if (a.finisceA) this._sveglia(ch, 'dopo', a.finisceA, () => this._sonoTornato(ch));
    else this._spegniSveglia(ch, 'dopo');
    if (a.testo) await this._annuncio(ch, conf, a.testo);
  }

  // LA PAUSA CHE FINISCE. La sveglia e' sempre quella dell'ultima pausa (una
  // pausa nuova sostituisce la sveglia della vecchia). Si dice se la diretta
  // c'e' ancora, e dentro la tolleranza.
  async _sonoTornato(ch) {
    const stato = this._pub.get(ch);
    if (!stato) return;
    const conf = pub.normalizzaPubblicita(streamers.get(ch)?.settings?.pubblicita);
    const fine = pub.allaFine(conf, stato, Date.now());
    if (!fine) return;
    stato.dettoDopo = true;
    stato.finisceA = 0;
    if (fine.testo && this._liveState.get(ch)) await this._annuncio(ch, conf, fine.testo);
  }

  // GLI APPUNTAMENTI SI ALLINEANO DA SOLI.
  //
  // Un appuntamento sul calendario non e' una cosa che si mette una volta: il
  // palinsesto cambia, e a fine ottobre cambia l'ora. Un appuntamento sbagliato
  // e' peggio di nessun appuntamento, perche' manda la gente davanti a uno
  // schermo spento — quindi non si aspetta che qualcuno prema un tasto.
  async _giroEventiDiscord() {
    // Tutti quelli con un server, non «quelli coi ruoli accesi»: il calendario
    // ha il suo interruttore. E il token lo decide `tokenDi` — col bot della
    // casa la riga non ne ha uno suo, e guardare quello della riga voleva dire
    // saltare proprio loro.
    for (const ch of dcRuoli.conServer()) {
      try {
        const s = streamers.get(ch);
        const cal = settimanaFeat.perIlCalendario(s?.settings);
        if (!cal.conf.acceso) continue;
        const r = dcRuoli.get(ch);
        const token = dcApi.tokenDi(r);
        if (!token || !r?.guild) continue;
        const me = await dcApi.io(token, r.guild);
        if (!me.ok) continue;
        await dcEventi.sincronizza(token, r.guild, me, cal.conf, cal.giorni);
      } catch (e) { log.debug('eventiDiscord', ch, e?.message || e); }
    }
  }

  // IL TOKEN DI INSTAGRAM SI ALLUNGA DA SOLO. Dura sessanta giorni: quando ne
  // mancano meno di trenta si chiede a Instagram di rinnovarlo, cosi' chi si e'
  // collegato una volta non deve ricordarsi di niente. Se il rinnovo non va
  // (app tolta, permesso ritirato) si riprova al giro dopo; se scade, il
  // pannello dice di ricollegare.
  async _giroInstagram() {
    for (const login of tokens.logins('instagram')) {
      try {
        const t = tokens.get('instagram', login);
        if (!t?.accessToken || !igAccesso.daAllungare(t.expiresAt)) continue;
        const r = await igAccesso.allunga(t.accessToken);
        if (!r.ok) { log.warn(`#${login}: rinnovo del token Instagram non riuscito — ${r.errore}`); continue; }
        tokens.save('instagram', login, { ...t, accessToken: r.token, expiresAt: r.scade });
        log.info(`#${login}: token Instagram rinnovato`);
      } catch (e) { log.warn(`#${login}: rinnovo del token Instagram — ${e?.message || e}`); }
    }
  }

  // IL PROGRAMMA DI TWITCH: rimette a posto quello che il tempo sposta (l'ora
  // legale, un segmento tolto a mano che va rimesso). Scrive solo la memoria di
  // cosa e' nostro, e solo se nel frattempo la settimana non e' stata salvata:
  // in quel caso il salvataggio ha gia' fatto il suo giro, e il nostro e' vecchio.
  async _giroProgramma() {
    for (const s of streamers.list()) {
      try {
        const sett = settimanaFeat.settimanaDi(s.settings);
        if (!sett.twitch.acceso) continue;
        if (!tokens.get('broadcaster', s.login)?.scopes?.includes('channel:manage:schedule')) continue;
        const e = await settimanaFeat.sincronizzaProgramma(this.helix, s.login, sett);
        if (!e.ok) continue;
        const ora = streamers.get(s.login)?.settings || {};
        const adesso = settimanaFeat.settimanaDi(ora);
        if (settimanaFeat.improntaSettimana(adesso) !== settimanaFeat.improntaSettimana(sett)) continue;
        streamers.setSettings(s.login, { ...ora, settimana: { ...adesso, twitch: { ...adesso.twitch, scritti: e.scritti } } });
      } catch (err) { log.debug('programma', s.login, err?.message || err); }
    }
  }

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
      if (!canaleHa(l, 'notifiche')) return { ok: false, motivo: 'non nel piano' };
      if (!tk?.username) return { ok: false, motivo: 'TikTok non configurato' };
      if (Date.now() - (this._tiktokUltima.get(l) || 0) < 3 * 3600_000) return { ok: false, motivo: 'gia avvisato di recente' };
      this._tiktokUltima.set(l, Date.now());
      // Su Discord, dove lo streamer ha acceso l'avviso «TikTok».
      await this._diffondiDiscord(l, 'tiktok', l, {
        piattaforma: 'tiktok', login: l, display: s?.display || l,
        titolo: '', gioco: '', spettatori: null, url: tiktok.urlLive(tk.username),
      }).catch(() => {});
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
        // --- Instagram: collegato col tasto, o col token incollato a mano ---
        const ig = s.settings?.instagram;
        const igCr = ig?.attivo ? credenzialiInstagram(s.login) : null;
        if (igCr) {
          const p = await instagram.ultimoPost(igCr);
          instagram.ricorda(s.login, p);
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
      if (!canaleHa(l, 'notifiche')) return { ok: false, motivo: 'non nel piano' };
      const s = streamers.get(l);
      // ogni piattaforma ha il suo evento: cosi «instagram» puo finire in un
      // topic e «youtube» in un altro, come lo streamer ha deciso.
      const ev = ({ instagram: 'ig', tiktok: 'tt', youtube: 'yt' })[piattaforma] || 'yt';
      const conf = tgConf.get(l);
      if (conf?.token) {
        tgDest.migra(l, conf);
        const testo = telegram.costruisciMessaggioPost({ login: l, display: s?.display || l }, { piattaforma, titolo, url, messaggio });
        const dest = tgDest.perEvento(l, ev, l);
        await telegram.diffondi(conf.token, dest, testo, { anteprima: true }).catch(() => {});
      }
      // E su Discord, dove lo streamer ha acceso quell'avviso. Un post non e'
      // una diretta: niente incorniciato «è in diretta», solo la riga col link.
      await this._diffondiDiscord(l, ev, l, {
        piattaforma, login: l, display: s?.display || l, titolo, url, gioco: '', spettatori: null,
      }, { conIncorniciato: false }).catch(() => {});
      if (annunciaChat && this.units.has(l) && url) {
        const info = { tiktok: ['🎵', 'TikTok'], instagram: ['📸', 'Instagram'], youtube: ['📺', 'YouTube'] }[piattaforma] || ['📺', 'YouTube'];
        this.say(l, `${info[0]} Nuovo contenuto su ${info[1]}! 👉 ${url}`);
      }
      log.info(`notifica post (${piattaforma}) inviata per #${l}`);
      return { ok: true };
    } catch (e) { log.error(`notificaPost #${login}:`, e?.message || e); return { ok: false }; }
  }

  // stato riassuntivo per la dashboard
  // Chi e' in onda adesso. Lo stato ce l'ha gia' il bot per mille altre cose:
  // chi lo chiede da fuori (la vetrina) non deve andarlo a chiedere di nuovo
  // alla piattaforma.
  inDiretta(login) { return this._liveState.get(String(login || '').toLowerCase()) === true; }

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
