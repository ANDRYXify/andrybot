// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// BotManager: il "direttore d'orchestra" di SocialBot.
// Per OGNI streamer approvato e acceso crea una "unità": una
// connessione chat autenticata CON L'ACCOUNT DELLO STREAMER (il bot
// parla come lui), un gestore messaggi e le sottoscrizioni agli
// eventi Twitch. Tiene tutto sincronizzato con la dashboard.
import { writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { makeLog } from './logger.js';
import { config } from './config.js';
import * as filigrana from './watermark.js';
import * as licenza from './licenza.js';
import { canaleHa } from './features/accesso.js';
import { tokens, streamers, memory, tgConf, tgScudo, arrivi as arriviDb, tgDest, amici, tgMsg, feedFonti, dcConf, dcDest, dcMsg, dcRuoli, avvisiConf, compleanni, pointAlerts, rapporti, postaStreamer } from './db.js';
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
import * as arrivi from './features/arrivi.js';
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
import { dirette, guide, vips, linkPage, recapiti } from './db.js';
import { dopoErrore, chiaveDiretta, AGGIORNA_OGNI_MS, TIENI_MS } from './features/recapiti.js';
import * as cancello from './features/tg-cancello.js';
import * as scudoTg from './features/tg-scudo-gesti.js';
import { ClipEngine } from './features/clips.js';
import { PenitenzeEngine } from './features/penitenze.js';
import { AlertsEngine } from './features/alerts.js';
import { MuroEmote } from './features/muro.js';
import { AntiBot, caricaListaBotDaDisco, aggiornaListaBot, caricaRegistroDaDisco, spegniScudo } from './features/antibot.js';
import { censisci } from './features/punteggio.js';
import { carica as caricaRete } from './features/rete.js';
import { carica as caricaIncidenti } from './features/incidenti.js';
import { scheduleReflection } from './ai/reflection.js';
import { StreamWatcher } from './stream/watcher.js';
import { dopoSegnale } from './stream/stato-diretta.js';
import { LiveListener } from './stream/listener.js';
import { avviaBackupAuto, stopBackupAuto } from './backup.js';
import * as dcGiro from './features/discord-giro.js';
import * as dcEventi from './features/discord-eventi.js';
import * as settimanaFeat from './features/settimana.js';
import * as prossime from './features/prossime.js';
import * as dcCollega from './features/discord-collega.js';
import * as pub from './features/pubblicita.js';
import * as voce from './features/voce.js';
import { linguaChat } from './features/lingua-canale.js';
import * as modalitaFeat from './features/modalita-chat.js';
import * as bossFeat from './features/boss.js';
import { aChi } from './features/risposte.js';
import { modalitaDi, alLavoro } from './features/quando-lavora.js';
import { statoVivo } from './db.js';
import { piattaformaDi, nomeSu } from './identita.js';
import { tokenDi as tokenKick, collegati as kickCollegati, statoCanale as statoKick, moderatoreKick, puoModerare as puoModerareKick } from './kick/api.js';
import * as bjFeat from './features/blackjack.js';
import * as seguitiFeat from './features/seguiti.js';
import * as negozio from './features/negozio.js';
import * as arenaFeat from './features/arena.js';
import * as giroRegole from './features/giro-regole.js';
import * as giroGiochi from './features/giro-giochi.js';
import { mappaCanale as emoteDelCanale, soloCanale as emoteSoloDelCanale } from './features/emotes.js';

const log = makeLog('bot');
const BOSS_DOPO_RAID_MS = 20_000;
// Le piattaforme con una diretta fuori da Twitch, che il bot segue da sé (Kick:
// eventi e giro). YouTube entra qui quando la sua diretta ha una fonte vera.
export const PIATTAFORME_ALTRE = ['kick'];
export const GIRO_KICK_MS = 2 * 60_000;

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

// L'avviso della diretta su TikTok nel registro dei messaggi Telegram (tgMsg),
// che e' per streamer: un login di Twitch non contiene «:», quindi questa
// chiave non si confonde mai con quella di uno streamer annunciato.
export const chiaveTikTok = (login) => 'tiktok:' + String(login || '').toLowerCase();

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
    this._negozioTimer = null;
    this._moduliTimer = null;
    this._annunciTimer = null;       // poll degli annunci "gioco attivo" (regole in chat)
    this._stopReflection = null;
    this._capAvvisoDato = false;     // il tetto ascolti è già stato loggato una volta?
    this._liveState = new Map();     // login → bool: se lo streamer è in live adesso
    this._statoDiretta = new Map();  // login → { live, visto, assenze }: i segnali delle due fonti (stato-diretta.js)
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
    this._scriviInOnda();

    this.clips = new ClipEngine({ helix: this.helix, say: (ch, t) => this.say(ch, t) });
    // Il muro delle emote: la chat, gli eventi e i premi che fanno volare emote.
    this.muro = new MuroEmote({ effects: this.effects, helix: this.helix });
    this.alerts = new AlertsEngine({ effects: this.effects, say: (ch, t) => this.say(ch, t), muro: this.muro });
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
    // piu' giocare, e la puntata torna a chi l'aveva messa. E glielo si dice,
    // appena il suo canale torna in chat: senza, la mano spariva e la puntata
    // ricompariva senza una parola, e sembrava un gioco che non paga.
    this._bjRese = new Map();
    try {
      for (const r of bjFeat.rimborsaDopoRiavvio()) {
        log.info(`#${r.channel} blackjack: ${r.posta} rese a ${r.chi}, la mano era rimasta aperta`);
        if (!this._bjRese.has(r.channel)) this._bjRese.set(r.channel, []);
        this._bjRese.get(r.channel).push(r);
      }
    } catch (e) { log.error('blackjack rimborsi:', e?.message || e); }
    // Gli acquisti del negozio rimasti a meta' da prima di un riavvio: le monete
    // erano gia' uscite e l'effetto nessuno sa se e' partito. Tornano a chi le
    // aveva spese, e lo storico dice perche'.
    try {
      for (const r of negozio.rimborsaSospesi()) log.info(`#${r.channel} negozio: ${r.prezzo} rese a ${r.user}, l'acquisto di «${r.nome}» era rimasto a metà`);
    } catch (e) { log.error('negozio rimborsi:', e?.message || e); }
    // Il boss: la barra della vita sull'overlay, e la festa in solo emote.
    bossFeat.impostaSpinta((ch, p) => this.effects?.emit?.(ch, p));
    bossFeat.impostaModalita(this.modalita);
    // L'arena delle emote: gli eventi all'overlay, le emote del canale per
    // riconoscerle nei messaggi, e gli ingressi pagati di un'arena che il
    // riavvio ha interrotto, resi e detti quando il canale torna in chat.
    arenaFeat.impostaSpinta((ch, p) => this.effects?.emit?.(ch, p));
    arenaFeat.impostaEmote({ tutte: (ch) => emoteDelCanale(this.helix, ch), proprie: (ch) => emoteSoloDelCanale(this.helix, ch) });
    this._arenaRese = new Map();
    try {
      for (const r of arenaFeat.rimborsaDopoRiavvio()) {
        log.info(`#${r.channel} arena: ingresso reso a ${r.chi.join(', ')}, la partita era rimasta aperta`);
        this._arenaRese.set(r.channel, r);
      }
    } catch (e) { log.error('arena rimborsi:', e?.message || e); }
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
      onLive: (login, isLive, data) => this._setLive(login, isLive, data, 'giro'),
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
    // Il negozio: lo storico si tiene un anno (privacy.html). Si pulisce
    // all'avvio e poi ogni sei ore: un processo che si riavvia spesso non deve
    // saltare la pulizia per sempre.
    const potaNegozio = () => { try { negozio.potaStorico(); } catch (e) { log.debug('negozio, pulizia dello storico:', e?.message || e); } };
    potaNegozio();
    this._negozioTimer = setInterval(potaNegozio, 6 * 60 * 60_000);
    // I moduli degli acquisti non confermati si tolgono appena scadono.
    this._moduliTimer = setInterval(() => { try { negozio.potaModuli(); } catch (e) { log.debug('negozio, pulizia dei moduli:', e?.message || e); } }, 60_000);
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
    // il giro di Kick: la seconda fonte della diretta, e gli spettatori
    this._kickTimer = setInterval(() => this._giroKick().catch(() => {}), GIRO_KICK_MS);
    this._kickPrimo = setTimeout(() => this._giroKick().catch(() => {}), 15_000);
    // Dirette degli amici da annunciare su Telegram: non sono canali gestiti dal
    // bot, quindi nessun evento arriva da solo — vanno guardati.
    this._amiciTimer = setInterval(() => this._giroAmici().catch(() => {}), 2 * 60_000);
    // Gli avvisi su Discord che aspettano un altro tentativo, e quelli di una
    // diretta in corso da riscrivere coi dati di adesso (docs/DISCORD-AVVISI.md).
    this._recapitiTimer = setInterval(() => this._giroRecapiti().catch(() => {}), 30_000);
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
    // Con lui lo scudo all'ingresso: le richieste rimaste senza esito si
    // chiudono col loro esito (tg-scudo-gesti.js), e quelle finite da piu' di
    // una settimana si tolgono.
    this._cancelloTimer = setInterval(() => {
      cancello.giroScadenze((ch) => tgConf.get(ch)).catch(() => {});
      scudoTg.giroScadenze((ch) => tgConf.get(ch)).catch(() => {});
    }, 30_000);
    this._scudoPota = setInterval(() => {
      try { tgScudo.pota(Date.now() - 7 * 86_400_000); } catch { /* il prossimo giro */ }
      // i segni delle accoglienze (chi arriva in chat): dopo 90 giorni non
      // servono piu' a niente
      try { arriviDb.pota(Date.now() - 90 * 86_400_000); } catch { /* il prossimo giro */ }
    }, 60 * 60_000);
    // Il giro dei giochi automatici (giro-giochi.js): un orologio solo per le
    // manche, il boss, l'arena, la catena, la conta e la corsa che partono da
    // soli, controllato ogni minuto.
    this._giroProx = new Map();       // login → ts del prossimo scatto
    this._giroTimer = setInterval(() => this._giro(), 60_000);
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
    // La lingua del canale su Twitch, per la lingua della chat di base
    // (lingua-canale.js): cambia di rado, quattro sguardi al giorno avanzano.
    this._eventiDcTimer = setInterval(() => { this._giroEventiDiscord(); this._giroProgramma(); this._giroInstagram(); this._giroLingue(); }, 6 * 60 * 60_000);
    setTimeout(() => { this._giroEventiDiscord(); this._giroProgramma(); this._giroInstagram(); this._giroLingue(); }, 150_000);
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
    clearInterval(this._negozioTimer);
    clearInterval(this._moduliTimer);
    clearInterval(this._listaBotTimer);
    clearInterval(this._watchtimeTimer);
    stopBackupAuto();
    clearInterval(this._tiktokTimer);
    clearInterval(this._kickTimer);
    clearTimeout(this._kickPrimo);
    clearInterval(this._amiciTimer);
    clearInterval(this._recapitiTimer);
    clearInterval(this._postTimer);
    clearInterval(this._annunciTimer);
    clearInterval(this._distillaTimer);
    clearInterval(this._giroTimer);
    clearInterval(this._compleTimer);
    clearInterval(this._dcRuoliTimer);
    clearInterval(this._eventiDcTimer);
    clearInterval(this._pubTimer);
    this.modalita?.ferma();
    for (const t of this._pubSveglie.values()) clearTimeout(t);
    this._pubSveglie.clear();
    clearInterval(this._cancelloTimer);
    clearInterval(this._scudoPota);
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
    // lo scudo si spegne senza perdere niente (antibot.js, spegniScudo): la
    // fila si ferma e quello che non era ancora arrivato a Twitch diventa
    // un'azione in sospeso, da riprendere dal pannello; poi registro, incidenti
    // e rete vanno su disco (i salvataggi aspettano qualche secondo per
    // raccogliere le righe: senza questo, gli ultimi si perderebbero a ogni
    // riavvio o aggiornamento).
    try { await spegniScudo(); } catch { /* niente */ }
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

  // IL PROMEMORIA DEI LINK rimanda alla SUA pagina sul sito (siteUrl/u/<canale>):
  // una destinazione sempre giusta e sotto il suo controllo, non i link pescati
  // dalla conoscenza, che potevano essere social mai impostati da lui. Senza
  // sito configurato non propone niente, e nemmeno se la pagina non c'e' o
  // l'ha spenta (la stessa regola della pagina, /u/:user): se no manderebbe la
  // chat su un 404. Le parole le sceglie la voce del canale.
  _promemoriaLink(login) {
    const canale = String(login || '').toLowerCase().trim();
    const base = config.hubUrl || config.siteUrl;
    if (!canale || !base || !linkPage.get(canale)?.attiva) return '';
    return voce.di(canale, 'promemoria-link', { link: `${base}/u/${canale}` });
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
      const promo = this._promemoriaLink(login);
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
          try { games.giroMonete(login, chatters, { live: true, diretta: stream.id }); }
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
          try { rapporto.osservaGiro(login, { spettatori: stream.viewer_count, categoria: stream.game_name }); }
          catch (e) { log.debug(`#${login} rapporto:`, e?.message || e); }
          // Chi e' entrato senza scrivere, fra le persone scelte per nome con
          // «anche se non scrive» (features/arrivi.js). Stessa lista.
          arrivi.suGiro(login, chatters, { engine: this.modules, say: (t) => this.say(login, t), twitchInizio: Date.parse(stream.started_at) || this._inizioTwitch(login) }, { helix: this.helix })
            .catch((e) => log.debug(`#${login} arrivi in silenzio:`, e?.message || e));
        }
      } catch (e) { log.debug(`#${login} ore:`, e?.message || e); }
    }
  }

  // IL GIRO DEI GIOCHI AUTOMATICI (docs/GIOCHI.md). Ogni minuto, per ogni
  // canale col giro acceso: se e' il momento, sceglie un gioco fra quelli che
  // possono partire e lo fa partire. Solo a chat viva quanto chiede il canale,
  // e se richiesto solo in diretta. Se non parte niente (c'e' gia' un gioco
  // aperto, o nessuno puo') riprova al minuto dopo.
  _giro() {
    try {
      for (const login of this.units.keys()) {
        const s = streamers.get(login);
        const g = giroRegole.giroDi(s?.settings);
        if (!g.attivo || s?.settings?.giochi === false) { this._giroProx.delete(login); continue; }
        const live = this._liveState.get(login) === true;
        if (g.soloLive && !live) continue;
        if ((memory.messageRate?.(login, 60_000) || 0) < g.chatMin) continue;   // i messaggi dell'ultimo minuto, come dice il pannello
        const prox = this._giroProx.get(login);
        if (prox === undefined) { this._giroProx.set(login, giroRegole.prossimo(g, Date.now(), Math.random())); continue; }
        if (Date.now() < prox) continue;
        const dire = (gioco) => {
          let prima = true;
          return (t) => { if (prima) { prima = false; this._dettaDaSolo(login, gioco, t); } else this.say(login, t); };
        };
        if (giroGiochi.scatta(login, { live, dire })) this._giroProx.set(login, giroRegole.prossimo(g, Date.now(), Math.random()));
      }
    } catch (e) { log.error('giro dei giochi:', e?.message || e); }
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

  // Un raid abbastanza grande apre l'arena: chi arriva entra scrivendo il suo
  // primo saluto. Si aspetta come per il boss, che i raider arrivino in chat.
  _arenaDelRaid(login, data) {
    try {
      if (streamers.get(login)?.settings?.giochi === false || !arenaFeat.giocabile(login)) return;
      if (!arenaFeat.vieneColRaid(login, data?.viewers)) return;
      const chi = data?.from_broadcaster_user_name || data?.from_broadcaster_user_login || '';
      const t = setTimeout(() => {
        if (!this.units.has(login)) return;
        let prima = true;
        arenaFeat.apri(login, (x) => { if (prima) { prima = false; this._dettaDaSolo(login, 'arena', x); } else this.say(login, x); }, { annuncio: chi ? `Il raid di ${chi} arriva giusto in tempo. ` : '' });
      }, BOSS_DOPO_RAID_MS);
      t.unref?.();
    } catch (e) { log.debug(`#${login} arena del raid:`, e?.message || e); }
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
            + 'Entra nel pannello e premi «Ricollega i permessi» nella scheda Stato per rimetterlo in funzione.';
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

  // Modalità di attivazione scelta dallo streamer (features/quando-lavora.js):
  //  'sempre'  → 24/7 (sempre in chat quando è acceso)
  //  'live'    → solo mentre è in diretta (entra/esce col live)
  _modalitaConsente(s) {
    if (modalitaDi(s?.settings) === 'live') return this._liveState.get(s.login) === true;
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
        for (const r of this._bjRese.get(login) || []) this.say(login, bjFeat.testoRimborso(r));
        this._bjRese.delete(login);
        if (this._arenaRese.has(login)) this.say(login, arenaFeat.testoRimborso(this._arenaRese.get(login)));
        this._arenaRese.delete(login);
        // chi segue gia' il canale, ricordato una volta: il suo prossimo follow
        // non e' nuovo (features/seguiti.js)
        seguitiFeat.semina(this.helix, login).catch((e) => log.debug(`#${login} semina dei follower:`, e?.message || e));
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

    // YouTube non passa dalla chat di Twitch: un canale nato su YouTube non ha
    // un token Twitch e non sta in `wanted`. Contano il bot acceso e la levetta;
    // la modalita' «solo in diretta» e' rispettata da se', perche' la chat di
    // YouTube si legge solo mentre c'e' una diretta.
    try { this.reconcileYoutube(new Map(streamers.active().map((s) => [s.login, s]))); }
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
    const s = login ? streamers.get(login) : null;
    if (!s) return;
    if (!msg.piattaforma || msg.piattaforma === 'twitch') return;   // Twitch ha la sua strada
    // L'interruttore e la modalita' valgono qui come per la chat di Twitch: un
    // bot spento, o «solo in diretta» fuori onda, non risponde nemmeno su Kick.
    if (!alLavoro(s, { inDiretta: this.inDirettaSu(login, msg.piattaforma) })) return;
    const parla = this.vocePer(msg);
    const onMessage = createMessageHandler({
      chat: { say: (_c, t, o) => parla(t, o) }, helix: this.helix, brain: this.brain, clips: this.clips, botLogin: login,
    });
    await this._gestisciMessaggio(login, msg, onMessage, parla);
  }

  // L'inizio della diretta su Twitch in corso (lo dice Twitch, e un riavvio non
  // lo cambia), o 0 se non e' in diretta. Riconosce la diretta per le
  // accoglienze di chi arriva in chat.
  _inizioTwitch(login) {
    if (this._liveState.get(login) !== true) return 0;
    return Number(rapporto.inCorso(login)?.inizio) || 0;
  }

  // IN ONDA SU UNA PIATTAFORMA DIVERSA DA TWITCH. La chat di YouTube si legge
  // solo durante una diretta: un messaggio che arriva da li' e' in diretta per
  // costruzione. Kick lo dice con i suoi eventi di inizio e fine diretta, che si
  // tengono fra gli stati vivi del canale: un riavvio a diretta in corso non la
  // dimentica.
  inDirettaSu(login, piattaforma) {
    if (piattaforma === 'youtube') return true;
    return statoVivo.leggi(login, 'diretta:' + piattaforma)?.live === true;
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
    // Le difese qui sotto tolgono messaggi e mettono in pausa: servono le mani
    // di chi modera su QUELLA piattaforma (moderatoreDi). Lo scudo resta di
    // Twitch (eta' degli account, raid, follow vengono da li'); l'antispam
    // lavora anche su Kick, quando lo streamer ha dato i permessi di
    // moderazione. Altrove il messaggio passa al flusso normale: meglio nessuna
    // moderazione che una moderazione che finge.
    const suTwitch = !msg.piattaforma || msg.piattaforma === 'twitch';
    const moderatore = this.moderatoreDi(msg);
    // 0) ANTI-BOT: un nome da follow-bot noto che scrive in chat (hate-raid) si
    // ferma subito, prima di ogni altra cosa.
    try {
      if (suTwitch && await this.antibot?.controllaChat(msg)) return;
    } catch (e) { log.error(`#${login} anti-bot chat:`, e?.message || e); }
    // Chi scrive e' arrivato, anche se l'antispam qui sotto lo ferma: la prima
    // presenza si segna prima dei controlli (presenze.segnaArrivo). Dopo
    // l'anti-bot, perche' un nome da follow-bot noto non e' una persona.
    let arrivo = null;
    try { arrivo = presenze.segnaArrivo(msg); } catch (e) { log.debug(`#${login} arrivo:`, e?.message || e); }
    // 1) ANTISPAM: se è spam lo elimina e stop (il bot non "reagisce" allo spam)
    try {
      if (moderatore && await antispam.tryAntispam(moderatore, msg, parla, { casa: this._casaDi(login, msg) })) return;
    } catch (e) { log.error(`#${login} antispam:`, e?.message || e); }
    // 2) GIOCHI DEL SITO: se è un comando gestito dal sito, risponde e stop
    try {
      if (await gamesbridge.tryGamesBridge(msg, parla)) return;
    } catch (e) { log.error(`#${login} giochi:`, e?.message || e); }
    // 3) flusso normale
    this._elaboraMessaggio(login, msg, onMessage, parla, arrivo);
  }

  // CHI MODERA, per la piattaforma da cui arriva il messaggio: helix su
  // Twitch, i permessi di moderazione di Kick su Kick (se lo streamer li ha
  // dati), nessuno altrove. La forma e' la stessa (deleteMessage,
  // timeoutUser): chi modera non sa con chi parla.
  moderatoreDi(msg) {
    const p = msg?.piattaforma || 'twitch';
    if (p === 'twitch') return this.helix;
    if (p === 'kick' && puoModerareKick(msg.channel)) return moderatoreKick;
    return null;
  }
  // La casa del canale sulla piattaforma del messaggio: un link al proprio
  // canale non e' spam. Su Kick il nome puo' non essere quello di Twitch: vale
  // quello che il giro di Kick ha visto, e per un canale nato su Kick il suo.
  _casaDi(login, msg) {
    if (msg?.piattaforma !== 'kick') return [];
    const nomi = new Set([this.kickVisto(login)?.slug, piattaformaDi(login) === 'kick' ? nomeSu(login) : ''].filter(Boolean));
    return [...nomi].map((n) => 'kick.com/' + n);
  }

  // Elaborazione normale di un messaggio (chiamata solo se non gestito prima).
  _elaboraMessaggio(login, msg, onMessage, parla = this.vocePer(msg), arrivo = undefined) {
    onMessage(msg).catch(e => log.error(`#${login} gestione messaggio:`, e?.message || e));
    if (filigrana.eCanarino(msg.text) && canarinoLibero(login)) { parla(filigrana.rispostaCanarino(licenza.firma())); return; }
    if (!msg.piattaforma || msg.piattaforma === 'twitch') {
      try { this._momenti.osserva(login, { ts: Date.now(), user: msg.user, display: msg.display, testo: msg.text, isSelf: !!msg.isSelf, id: msg.id, rispostaA: msg.rispostaA }); }
      catch (e) { log.debug(`#${login} momenti:`, e?.message || e); }
    }
    if (!msg.isSelf) this.clips.onActivity(msg);   // rilevatore "hype" per le clip automatiche (chat)
    try { this.alerts?.onChat(login, msg); } catch (e) { log.debug(`#${login} chat overlay:`, e?.message || e); }
    try { this.muro?.suChat(login, msg); } catch (e) { log.debug(`#${login} muro:`, e?.message || e); }
    // pannello chat dello Studio Web (feed 'chat_raw' ungated): solo se qualcuno
    // è collegato via SSE, così non pesa quando lo Studio è chiuso.
    try { this.alerts?.onChatRaw?.(login, msg); } catch (e) { log.debug(`#${login} chat studio:`, e?.message || e); }
    this.brain.observe?.(msg);                             // apprendimento passivo (anche dai messaggi dello streamer)
    // amicizia GLOBALE: chi interagisce diventa piano piano "amico" del bot
    // (solo un'affinità, mai contenuti né in quale canale).
    if (!msg.isSelf) { try { persona.interagisci(msg.user); } catch { /* niente */ } }
    // L'economia gira sempre: le monete della presenza non sono un comando.
    try { games.accredita(msg); } catch (e) { log.error(`#${login} monete:`, e?.message || e); }
    // CHI ARRIVA IN CHAT (features/arrivi.js): le accoglienze che lo streamer
    // ha scelto per questa persona, o per un suo gruppo. Qui, dopo l'antispam
    // (chi e' stato appena fermato non si accoglie) e prima del saluto generico,
    // che tace per chi ha la sua accoglienza: una persona, un benvenuto.
    let accolto = { riguarda: false };
    try { accolto = arrivi.suMessaggio(msg, { engine: this.modules, say: parla, arrivo, twitchInizio: this._inizioTwitch(login) }); }
    catch (e) { log.debug(`#${login} arrivi:`, e?.message || e); }
    // Chi scrive per la prima volta, e chi torna dopo un'assenza: una parola dal
    // bot, salvo che lo streamer si sia costruito il suo saluto con un Modulo.
    try {
      const live = msg.piattaforma === 'youtube' ? true : this.inOnda(login);
      presenze.suMessaggio(msg, parla, { live, arrivo, tace: accolto.riguarda });
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
    if (vaglio?.rifiuta) { aChi(msg, parla)(vaglio.messaggio); return; }
    if (!suo && !vaglio?.salta) {
    // Il testo scritto davvero resta accanto a quello tradotto: il tag delle
    // emote di Twitch conta i caratteri su quello, e un comando rinominato ne
    // sposta tutte le posizioni (l'emote dell'arena, !emote Kappa).
    const cmdMsg = vaglio?.testo && vaglio.testo !== msg.text ? { ...msg, text: vaglio.testo, testoScritto: msg.text } : msg;
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
    // un'esplosione sul muro delle emote (!esplodi Kappa)
    try { this.muro?.tryComando(cmdMsg, parla); }
    catch (e) { log.error(`#${login} muro:`, e?.message || e); }
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
    // il negozio del canale (!negozio, !compra, !borsa): si paga con le monete.
    // Gli servono Twitch, gli overlay e i Moduli per far partire quello che si
    // compra, e se il canale e' in onda su una piattaforma qualunque (la chat di
    // YouTube esiste solo in diretta, quindi da li' lo e' per costruzione).
    negozio.tryComando(cmdMsg, parla, {
      helix: this.helix, effetti: this.effects, moduli: this.modules,
      live: msg.piattaforma === 'youtube' ? true : this.inOnda(login),
    }).catch((e) => log.error(`#${login} negozio:`, e?.message || e));
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
      const sensibilita = Number(s.settings?.ascoltoSensibilita) || 5;
      // gia' in ascolto: la sensibilita' salvata dopo la partenza vale da ora
      if (this.listeners.has(login)) { this.listeners.get(login).impostaSensibilita(sensibilita); continue; }

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
      // esplosione sul muro delle emote, se il premio e' fra quelli scelti
      try { this.muro?.suPremio(channel, data); } catch (e) { log.debug(`#${channel} muro premio:`, e?.message || e); }
    }
    // Chi toglie e rimette il follow non e' un follower nuovo (features/seguiti.js):
    // il ripetuto si ferma qui, il ritorno cambia tipo prima di chiunque.
    if (type === 'channel.follow') {
      let come = 'nuovo';
      try { come = seguitiFeat.classifica(channel, 'twitch', data?.user_id || data?.user_login); }
      catch (e) { log.error(`#${channel} follow:`, e?.message || e); }
      if (come === 'ripetuto') { log.debug(`#${channel} follow ripetuto di ${data?.user_login || '?'}: non e' nuovo`); return; }
      if (come === 'ritorno') { this._dispatchEvent({ ...ev, type: 'channel.follow.ritorno' }); return; }
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
    // il muro delle emote esplode per gli eventi che lo streamer ha scelto
    this.muro?.suEvento(ev).catch((e) => log.debug(`#${channel} muro evento:`, e?.message || e));
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
    if (type === 'channel.raid') { this._bossDelRaid(channel, data); this._arenaDelRaid(channel, data); }
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

  // CHI E' IN ONDA, SCRITTO FUORI DAL PROCESSO (data/.in-onda). Lo legge
  // server/aggiorna.sh prima di riavviare: un riavvio in piena diretta ferma per
  // qualche secondo chat, avvisi e overlay a chi sta trasmettendo, e quello che
  // succede in quei secondi si perde. Si riscrive a ogni cambio e all'avvio, cosi'
  // il file dice sempre quello che sa il processo che gira, non uno morto prima.
  // Si scrive accanto e poi si rinomina: chi legge non trova mai meta' file.
  _scriviInOnda() {
    try {
      const canali = new Set([...this._liveState].filter(([, v]) => v === true).map(([c]) => c));
      for (const p of PIATTAFORME_ALTRE) for (const r of statoVivo.tutti('diretta:' + p)) if (r.dato?.live === true) canali.add(r.channel);
      const file = join(config.dataDir, '.in-onda');
      writeFileSync(file + '.tmp', JSON.stringify({ canali: [...canali].sort(), ts: Date.now() }));
      renameSync(file + '.tmp', file);
    } catch (e) { log.debug('in onda: ' + (e?.message || e)); }
  }

  // Fonte UNICA di verità per lo stato live/offline (arriva sia da EventSub,
  // istantaneo, sia dal watcher, che copre anche chi non è connesso in chat —
  // es. modalità "quando live" con bot ancora offline). Idempotente: reagisce
  // solo ai VERI cambi di stato, così non si notifica due volte.
  //
  // Le due fonti non valgono uguale (stream/stato-diretta.js): il giro chiede a
  // /streams, che una diretta nuova la vede in ritardo, quindi un suo «non
  // c'e'» chiude solo se ripetuto e lontano dall'ultimo «c'e'». Prima chiudeva
  // subito: la diretta appena cominciata «finiva» al primo giro e ripartiva al
  // secondo, con due avvisi e un rapporto vuoto in mezzo.
  _setLive(login, isLive, data, fonte = 'evento', piattaforma = 'twitch') {
    const ch = String(login || '').toLowerCase();
    if (!ch) return;
    if (piattaforma !== 'twitch') return this._setLiveAltrove(ch, piattaforma, isLive, data, fonte);
    const stato = dopoSegnale(this._statoDiretta.get(ch), { live: !!isLive, fonte, ora: Date.now() });
    this._statoDiretta.set(ch, stato);
    isLive = stato.live;
    const prev = this._liveState.get(ch);
    if (prev === isLive) return;                 // nessun cambiamento: stop
    this._liveState.set(ch, isLive);
    this._scriviInOnda();
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
    if (isLive) rapporto.apri(ch, { inizio: Date.parse(data?.started_at) || 0, piattaforma: 'twitch' });
    // Primo rilevamento (bot appena avviato): NON è una transizione vera.
    // Evita di annunciare "è live!" se il bot riparte a diretta già in corso.
    if (prev === undefined) return;
    const ev = { channel: ch, type: isLive ? 'stream.online' : 'stream.offline', data: data || {} };
    this._dispatchEvent(ev);
    if (isLive) {
      this._annunciaTwitch(ch, data).catch((e) => log.error(`avviso live #${ch}:`, e?.message || e));
      this._storiaDellaDiretta(ch).catch((e) => log.error(`storia della diretta #${ch}:`, e?.message || e));
    } else {
      this._chiudiAvvisi(ch);
      this._scalaVipDiretta(ch);
      // la serata finisce con l'ultima piattaforma, non con Twitch
      rapporto.chiudiPiattaforma(ch, 'twitch');
      if (!this._inOndaAltrove(ch).length) this._rapportoDiretta(ch).catch((e) => log.error(`rapporto #${ch}:`, e?.message || e));
    }
    this._reagisciAllaDiretta(ch, isLive);   // lei se ne accorge e ti scrive (presente/consapevole)
  }

  // LA DIRETTA FUORI DA TWITCH (docs/PIATTAFORME.md, «La diretta su Kick»).
  //
  // Ogni piattaforma ha la sua diretta, e passa dalla STESSA regola di Twitch
  // (stream/stato-diretta.js): l'evento conta subito, il giro chiude solo se
  // non la vede due volte di fila e da piu' di cinque minuti. Lo stato si tiene
  // fra gli stati vivi del canale, quindi un riavvio a diretta in corso non la
  // ricomincia e non la riannuncia: il «prima» e' quello sul disco, non quello
  // della memoria appena nata.
  //
  // La SERATA e' del canale: si apre col primo «in onda», di qualunque
  // piattaforma, e il rapporto si chiude con l'ultimo «fine».
  _inOndaAltrove(ch) {
    return PIATTAFORME_ALTRE.filter((p) => this.inDirettaSu(ch, p));
  }
  // In onda adesso, su una piattaforma qualunque: e' la serata del canale.
  inOnda(login) {
    const ch = String(login || '').toLowerCase();
    return this._liveState?.get(ch) === true || this._inOndaAltrove(ch).length > 0;
  }
  async _setLiveAltrove(ch, p, isLive, data, fonte) {
    const piattaforma = String(p || '').toLowerCase();
    if (!PIATTAFORME_ALTRE.includes(piattaforma)) return;
    const mappa = this._statoDiretta || (this._statoDiretta = new Map());
    const chiave = ch + '|' + piattaforma;
    const scritto = statoVivo.leggi(ch, 'diretta:' + piattaforma);
    const eraLive = scritto?.live === true;
    const prima = mappa.get(chiave) || (eraLive ? { live: true, visto: Date.now(), assenze: 0 } : undefined);
    const stato = dopoSegnale(prima, { live: !!isLive, fonte, ora: Date.now() });
    mappa.set(chiave, stato);
    const inizio = Number(data?.inizio) || Number(scritto?.da) || 0;
    if (stato.live === eraLive) {
      // nessun cambio: la serata pero' c'e' (anche dopo un riavvio, che la
      // sessione in memoria l'ha persa), e aprirla due volte non la ricomincia
      if (stato.live) rapporto.apri(ch, { inizio, piattaforma });
      // la fine detta dalla piattaforma chiude quello che di lei e' rimasto
      // aperto anche se qui non risultava in onda: chiudere due volte non
      // costa niente, un avviso «e' in diretta» lasciato aperto si'
      else if (fonte === 'evento') await this._chiudiAvvisiAltrove(ch, piattaforma);
      return;
    }
    const serataPrima = this._liveState?.get(ch) === true || this._inOndaAltrove(ch).length > 0;
    if (stato.live) {
      const da = inizio || Date.now();
      statoVivo.scrivi(ch, 'diretta:' + piattaforma, { live: true, da });
      this._scriviInOnda();
      rapporto.apri(ch, { inizio: da, piattaforma });
      // l'id della diretta e' il suo inizio: l'evento e il giro dicono lo
      // stesso, e lo stesso avviso non parte due volte
      try {
        const d = avvisi.diretta({ piattaforma, login: ch, titolo: data?.titolo || '', id: String(inizio || data?.titolo || da) });
        if (d) await this.annunciaDiretta(d);
      } catch (e) { log.error(`avviso live ${piattaforma} #${ch}:`, e?.message || e); }
      if (!serataPrima) this._storiaDellaDiretta(ch).catch((e) => log.error(`storia della diretta #${ch}:`, e?.message || e));
      return;
    }
    statoVivo.togli(ch, 'diretta:' + piattaforma);
    this._scriviInOnda();
    rapporto.chiudiPiattaforma(ch, piattaforma);
    await this._chiudiAvvisiAltrove(ch, piattaforma);
    if (!this.inOnda(ch)) await this._rapportoDiretta(ch).catch((e) => log.error(`rapporto #${ch}:`, e?.message || e));
  }
  async _chiudiAvvisiAltrove(ch, piattaforma) {
    try {
      dirette.dimentica(ch, piattaforma);
      await this._chiudiDiscord(ch, ch, piattaforma);
    } catch (e) { log.error(`fine live ${piattaforma} #${ch}:`, e?.message || e); }
  }

  // IL GIRO DI KICK: ogni due minuti, per ogni canale con Kick collegato, lo
  // stato del canale su Kick (kick/api.js, statoCanale). E' la seconda fonte
  // della diretta, come /streams per Twitch: un evento perso non lascia una
  // diretta aperta, o chiusa, per sempre. E porta gli spettatori, che negli
  // eventi non ci sono: senza, una serata su Kick non avrebbe ne' picco ne'
  // media.
  async _giroKick() {
    if (this._giroKickInCorso) return;
    this._giroKickInCorso = true;
    try {
      for (const login of kickCollegati()) {
        if (!streamers.get(login)) continue;
        try {
          const c = await statoKick(login);
          if (!c.ok) continue;
          if (!this._kickVisto) this._kickVisto = new Map();
          this._kickVisto.set(login, { live: c.live, spettatori: c.spettatori, titolo: c.titolo, categoria: c.categoria, slug: c.slug, ts: Date.now() });
          await this._setLiveAltrove(login, 'kick', c.live, { inizio: c.inizio, titolo: c.titolo }, 'giro');
          if (!c.live) continue;
          rapporto.osservaGiro(login, { piattaforma: 'kick', spettatori: c.spettatori, categoria: c.categoria });
          // la vista che il cervello ha della diretta, se Twitch non gliela da' gia'
          if (this._liveState.get(login) !== true) {
            const min = c.inizio ? Math.max(0, Math.floor((Date.now() - c.inizio) / 60_000)) : 0;
            memory.setStreamContext(login, `In live su Kick, ${c.categoria || 'senza categoria'}: "${c.titolo}" con ${c.spettatori ?? 0} spettatori da ${Math.floor(min / 60)}h ${min % 60}m`);
          }
        } catch (e) { log.debug(`#${login} giro di Kick:`, e?.message || e); }
      }
    } finally { this._giroKickInCorso = false; }
  }
  // Quello che il giro di Kick ha visto per ultimo (per la vetrina e la scheda).
  kickVisto(login) { return this._kickVisto?.get(String(login || '').toLowerCase()) || null; }

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
  async _diffondi(login, evento, chi, d, { chiudi = false, messaggioTg = '' } = {}) {
    let inviati = 0;
    // LA RIGA DELLA VOCE, una per avviso: la stessa a Telegram e a Discord, e
    // il giro delle frasi del canale avanza una volta sola. Parla il canale che
    // manda l'avviso, anche quando la diretta e' di un altro.
    const conVoce = { ...d, lingua: linguaChat(login), voce: this._rigaAvviso(login, 'avviso-diretta', d?.piattaforma) };
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
        const componi = (conLocandina) => avvisi.messaggio(conVoce, messaggioTg, { conLocandina });
        const r = await this._diffondiTelegram(login, conf, evento, chi, componi, { pin: chiudi, chi: altrui, info: conVoce });
        inviati += r.inviati || 0;
      }
    } catch (e) { log.error(`avviso Telegram ${evento} #${chi}:`, e?.message || e); }
    try {
      if (ammesso.discord) {
        const r = await this._diffondiDiscord(login, evento, chi, conVoce, { chiudi });
        inviati += r.inviati || 0;
      }
    } catch (e) { log.error(`avviso Discord ${evento} #${chi}:`, e?.message || e); }
    return { inviati };
  }

  // La gemella di `_diffondiTelegram`. Il token del bot non sta nella
  // configurazione degli avvisi: sta nella busta dei segreti, con gli altri, e
  // si prende qui — cosi' la configurazione resta una cosa che si puo' guardare
  // senza scoprire niente.
  async _diffondiDiscord(login, evento, chi, d, { chiudi = false, post = false } = {}) {
    dcDest.migra(login, dcConf.get(login));   // il vecchio canale unico diventa la prima destinazione
    const dest = dcDest.perEvento(login, evento, chi);
    if (!dest.length) return { inviati: 0 };
    // Il token serve a chi passa dal bot; chi ha un webhook ha gia' la sua
    // chiave dentro l'indirizzo. Pretenderlo qui spegnerebbe i webhook.
    const token = dcApi.tokenDi(dcRuoli.get(login));
    const buoni = token ? dest : dest.filter((x) => x.webhook);
    if (!buoni.length) return { inviati: 0 };
    // UN RECAPITO PER POSTO: lo stesso avviso nello stesso posto parte una
    // volta sola, anche dopo un riavvio, e un posto che rifiuta per un errore
    // che passa riceve al giro dei recapiti, senza ripetere gli altri. Un post
    // non si chiude mai, e la sua chiave e' il suo indirizzo.
    const ora = Date.now();
    const piattaforma = post ? `post-${d.piattaforma}` : String(d.piattaforma || 'twitch');
    const diretta = post ? (String(d.url || '') || `al:${ora}`) : chiaveDiretta(d, ora);
    let inviati = 0;
    for (const t of buoni) {
      const rec = recapiti.nuovo({ channel: login, trasporto: 'discord', destId: t.id, streamer: chi || login, piattaforma, diretta, dati: { d, post, chiudi }, ora });
      if (!rec) continue;
      if (await this._consegnaDiscord(rec, t, token)) inviati++;
    }
    if (inviati) log.info(`Discord: «${evento}» di #${chi} inviato a ${inviati}/${buoni.length} canali di #${login}`);
    return { inviati, totale: buoni.length };
  }

  // Un tentativo di un recapito: arrivato, da ritentare, o perso
  // (features/recapiti.js decide quale).
  async _consegnaDiscord(rec, t, token) {
    const { d, post } = rec.dati || {};
    const payload = discord.avvisoPer(t, d, { post });
    const r = await discord.consegna(token, t, payload);
    const ora = Date.now();
    if (r.ok) { recapiti.mandato(rec.id, { msgId: r.id, corpo: payload.content, ora }); return true; }
    const dopo = dopoErrore(rec, r, ora);
    if (dopo.perso) {
      recapiti.perso(rec.id, r.errore);
      log.warn(`Discord: avviso di #${rec.streamer} perso in ${t.canale_nome || t.canale} (#${rec.channel}): ${r.errore}`);
    } else recapiti.riprova(rec.id, { prossimo: dopo.prossimo, errore: r.errore });
    return false;
  }

  // IL GIRO DEI RECAPITI, ogni 30 secondi: ritenta quelli in attesa, riscrive
  // gli avvisi delle dirette in corso coi dati di adesso, e una volta all'ora
  // toglie le righe vecchie.
  async _giroRecapiti() {
    if (this._recapitiInCorso) return;
    this._recapitiInCorso = true;
    try {
      const ora = Date.now();
      for (const rec of recapiti.dovuti('discord', ora)) {
        const t = dcDest.get(rec.channel, rec.dest_id);
        if (!t || !t.attivo) { recapiti.perso(rec.id, 'il posto è stato spento o tolto'); continue; }
        const token = dcApi.tokenDi(dcRuoli.get(rec.channel));
        if (!token && !t.webhook) { recapiti.perso(rec.id, 'manca il token del bot'); continue; }
        await this._consegnaDiscord(rec, t, token);
      }
      await this._aggiornaAvvisiDiscord(ora);
      if (ora - (this._recapitiPuliti || 0) > 3600_000) { this._recapitiPuliti = ora; recapiti.pulisci(ora - TIENI_MS); }
    } catch (e) { log.debug('giro dei recapiti:', e?.message || e); }
    finally { this._recapitiInCorso = false; }
  }

  // L'AVVISO DI UNA DIRETTA SU TWITCH SI TIENE AGGIORNATO: titolo, gioco,
  // spettatori, e l'immagine appena Twitch l'ha fatta (avvisi.dalloStream).
  // Una chiamata a Twitch per streamer, non per posto; se la diretta non e'
  // piu' quella dell'avviso non si tocca niente: la chiude chi la vede finire.
  async _aggiornaAvvisiDiscord(ora) {
    const righe = recapiti.daAggiornare('discord', ora - AGGIORNA_OGNI_MS).filter((r) => r.piattaforma === 'twitch' && !r.dati?.post);
    const adesso = new Map();
    for (const rec of righe) {
      if (!adesso.has(rec.streamer)) adesso.set(rec.streamer, await this.helix.getStream(rec.streamer).catch(() => null));
      const info = adesso.get(rec.streamer);
      const prima = rec.dati?.d || {};
      if (!info || String(info.id || '') !== rec.diretta) { recapiti.aggiornato(rec.id, { dati: rec.dati, ora }); continue; }
      const d = { ...prima, titolo: info.title || prima.titolo || '', gioco: info.game_name || prima.gioco || '', ...avvisi.dalloStream(info, ora) };
      const t = dcDest.get(rec.channel, rec.dest_id);
      const token = dcApi.tokenDi(dcRuoli.get(rec.channel));
      if (t && (token || t.webhook)) {
        const r = await discord.aggiornaAvviso(token, t, rec.msg_id, rec.corpo, d);
        if (!r.ok) log.debug(`aggiorna avviso di #${rec.streamer} in ${t.canale_nome || t.canale}: ${r.errore}`);
      }
      recapiti.aggiornato(rec.id, { dati: { ...rec.dati, d }, ora });
    }
  }

  // FINE DI UNA DIRETTA, su Discord: si chiudono gli avvisi di QUELLO
  // streamer su QUELLA piattaforma, e nessun altro. Dove lo streamer non ha
  // chiesto di chiuderli restano come sono, ma non si aggiornano piu'. Uno
  // ancora in attesa e' perso: un «e' in diretta» dopo la fine sarebbe falso.
  async _chiudiDiscord(login, chi, piattaforma) {
    const token = dcApi.tokenDi(dcRuoli.get(login));
    let riga = null;
    for (const rec of recapiti.aperti(login, 'discord', chi, piattaforma)) {
      if (rec.stato === 'attesa') { recapiti.perso(rec.id, 'la diretta è finita prima'); continue; }
      const t = dcDest.get(login, rec.dest_id);
      recapiti.chiuso(rec.id);
      if (!t?.chiudi || !rec.msg_id || (!token && !t.webhook)) continue;
      if (riga === null) riga = this._rigaAvviso(login, 'avviso-finita');
      const nome = chi === login ? (streamers.get(login) || { login }) : { display: rec.dati?.d?.display || chi };
      const r = await discord.chiudiMessaggio(token, t, rec.msg_id, discord.testoFinita(nome, null, riga));
      if (r.ok) log.info(`avviso Discord chiuso in ${t.canale_nome || t.canale} (diretta di #${chi} su ${piattaforma} finita)`);
      else log.warn(`chiudi Discord ${t.canale_nome || t.canale}: ${r.errore}`);
    }
  }

  // La riga di un avviso, dalla voce del canale, col segno al posto del nome:
  // ogni posto lo stende nel suo formato (features/avvisi.js).
  _rigaAvviso(login, momento, piattaforma = 'twitch') {
    return voce.di(login, momento, { nome: avvisi.SEGNO_NOME, piattaforma: avvisi.NOME_POSTO[piattaforma] || 'Twitch' });
  }

  // Un evento arrivato da un'altra piattaforma (per ora Kick) entra qui.
  async eventoEsterno(ev) {
    if (!ev?.channel || !streamers.get(ev.channel)) return;
    try {
      // `da`: quando e' cominciata, per riconoscere la diretta (le accoglienze
      // di chi arriva in chat ne fanno una per diretta). Nel database: un
      // riavvio a diretta in corso non la ricomincia.
      // L'inizio e la fine della diretta passano dalla stessa porta del giro
      // (_setLiveAltrove): un evento e un giro che dicono la stessa cosa non
      // la annunciano due volte.
      if (ev.tipo === 'live' || ev.tipo === 'fine-live') {
        await this._setLiveAltrove(String(ev.channel).toLowerCase(), ev.piattaforma, ev.tipo === 'live', { inizio: Number(ev.inizio) || 0, titolo: ev.titolo || '' }, 'evento');
        return;
      }
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
      // anche su Kick un follow ripetuto non e' un follower nuovo, e un ritorno
      // non ha un avviso da follower
      if (ev.tipo === 'seguito' && seguitiFeat.classifica(ev.channel, ev.piattaforma || 'kick', ev.utente) !== 'nuovo') return;
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
  //
  // `ev` e' quello che ha visto la diretta per primo: la diretta di /streams se
  // e' stato il giro, l'evento di Twitch se e' stato lui. L'evento ha sempre
  // l'id della diretta e del canale, ma non titolo e gioco; /streams nel primo
  // minuto non sa ancora niente. Titolo e gioco li sa /channels, subito, perche'
  // li scrive lo streamer prima di partire. Spettatori e immagine solo quando
  // sono veri (avvisi.dalloStream): poi l'avviso si aggiorna da se'.
  async _annunciaTwitch(login, ev = null) {
    const daStreams = ev && ev.title !== undefined ? ev : await this.helix.getStream(login).catch(() => null);
    const bid = ev?.broadcaster_user_id || daStreams?.user_id || '';
    const canale = daStreams || !bid ? null : await this.helix.getChannelInfo(bid).catch(() => null);
    const s = streamers.get(login);
    const d = avvisi.diretta({
      piattaforma: 'twitch', login, display: s?.display || login,
      titolo: daStreams?.title || canale?.title || '', gioco: daStreams?.game_name || canale?.game_name || '',
      id: String(ev?.id || daStreams?.id || ''),
    });
    if (d) Object.assign(d, avvisi.dalloStream(daStreams));
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
            titolo: info?.title || '', gioco: info?.game_name || '', id: streamId,
          });
          Object.assign(sua, avvisi.dalloStream(info));
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
    } catch (e) { log.debug(`chiudi live esterna ${chi} su Telegram:`, e?.message || e); }
    try {
      await this._chiudiDiscord(login, chi, 'twitch');
      // gli avvisi mandati prima dei recapiti: ricordati in discord_msg
      const token = dcApi.tokenDi(dcRuoli.get(login));
      {
        let riga = null;
        for (const m of dcMsg.perStreamer(login, chi)) {
          const d = dcDest.get(login, m.dest_id);
          if (d?.chiudi && m.msg_id) {
            if (riga === null) riga = this._rigaAvviso(login, 'avviso-finita');
            const r = await discord.chiudiMessaggio(token, d, m.msg_id, discord.testoFinita({ display: chi }, null, riga));
            if (!r.ok) log.debug(`chiudi live di ${chi} in ${d.canale_nome || d.canale}: ${r.errore}`);
          }
        }
      }
      dcMsg.pulisci(login, chi);
    } catch (e) { log.debug(`chiudi live esterna ${chi} su Discord:`, e?.message || e); }
  }


  // Live spenta: l'avviso si toglie DOVE era stato messo — in ogni gruppo e in
  // ogni canale che l'aveva chiesto. Best-effort e idempotente: se non c'e'
  // niente da togliere, non fa niente. Il bot puo' cancellare i propri messaggi
  // entro 48 ore su Telegram, e i propri sempre su Discord.
  //
  // Telegram e Discord si chiudono ognuno per conto suo: prima la parte di
  // Telegram usciva dalla funzione quando Telegram non c'era, e chi aveva solo
  // Discord non vedeva mai chiudere l'avviso.
  async _chiudiAvvisi(login) {
    try {
      const conf = tgConf.get(login);
      if (conf?.token) for (const d of tgDest.lista(login)) {
        if (!d.msg_id) continue;
        const msgId = d.msg_id;
        tgDest.setMsgId(d.id, '');    // azzera comunque: un solo tentativo per destinazione
        if (!d.pin) continue;         // l'eliminazione segue l'opzione «fissa» di QUELLA destinazione
        const r = await telegram.eliminaMessaggio(conf.token, d.chat_id, msgId);
        if (r.ok) log.info(`avviso Telegram eliminato in ${d.titolo || d.chat_id} (live di #${login} finita)`);
        else log.warn(`elimina Telegram ${d.titolo || d.chat_id}: ${r.errore}`);
      }
      if (conf?.msg_id) tgConf.setMsgId(login, '');
    } catch (e) { log.error(`chiudi Telegram #${login}:`, e?.message || e); }
    try {
      await this._chiudiDiscord(login, login, 'twitch');
      // gli avvisi mandati prima dei recapiti: ricordati nel posto (msg_id)
      const token = dcApi.tokenDi(dcRuoli.get(login));
      let riga = null;   // la voce sceglie la riga solo se c'e' davvero un avviso da chiudere
      for (const d of dcDest.lista(login)) {
        if (!token && !d.webhook) continue;
        if (!d.msg_id) continue;
        const msgId = d.msg_id;
        dcDest.setMsgId(d.id, '');    // azzera comunque: un solo tentativo per destinazione
        if (!d.chiudi) continue;      // si toglie solo dove lo streamer l'ha chiesto
        if (riga === null) riga = this._rigaAvviso(login, 'avviso-finita');
        const r = await discord.chiudiMessaggio(token, d, msgId, discord.testoFinita(streamers.get(login) || { login }, null, riga));
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
        else {                                             // live TikTok finita: l'avviso si toglie o si chiude
          this._chiudiTelegramTikTok(s.login).catch(() => {});
          this._chiudiDiscord(s.login, s.login, 'tiktok').catch(() => {});
        }
      }
    } catch (e) { log.error('controllaTikTok:', e?.message || e); }
  }

  // Live TikTok spenta: l'avviso si toglie DOVE era stato messo, come quello
  // della diretta su Twitch (_chiudiAvvisi): in ogni posto che l'aveva fissato,
  // e solo li'. Decide la spunta «Fissa l'avviso qui» di QUEL posto: quella
  // della scheda e' solo il valore di base dei posti nuovi. Best-effort, un
  // tentativo per posto.
  async _chiudiTelegramTikTok(login) {
    try {
      const conf = tgConf.get(login);
      if (!conf?.token) return;
      const chiave = chiaveTikTok(login);
      const messi = tgMsg.perStreamer(login, chiave);
      tgMsg.pulisci(login, chiave);   // azzera comunque: un solo tentativo
      if (conf.msg_id_tk) tgConf.setMsgIdTk(login, '');
      for (const m of messi) {
        const d = tgDest.get(login, m.dest_id);
        if (!d?.pin || !m.msg_id) continue;
        const r = await telegram.eliminaMessaggio(conf.token, d.chat_id, m.msg_id);
        if (r.ok) log.info(`avviso TikTok Telegram eliminato in ${d.titolo || d.chat_id} (live di #${login} finita)`);
        else log.warn(`elimina TikTok Telegram ${d.titolo || d.chat_id}: ${r.errore}`);
      }
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
  //
  // Lo stato della pubblicita' serve a due cose: gli annunci in chat e il conto
  // sull'overlay. Si tiene se lo usa almeno una delle due, e il programma si
  // rilegge quando serve a una delle due, ognuna col suo passo.
  async _giroPubblicita() {
    const adesso = Date.now();
    for (const [ch, live] of this._liveState) {
      const s = streamers.get(ch)?.settings || {};
      const conf = this._confPubblicita(ch);
      const inScena = s.overlayPubblicita?.attivo === true;
      if (!conf.acceso) { this._spegniSveglia(ch, 'prima'); this._spegniSveglia(ch, 'dopo'); }
      if (!conf.acceso && !inScena) { this._pub.delete(ch); continue; }
      const stato = this._pub.get(ch) || pub.riprendi(statoVivo.leggi(ch, 'pubblicita'), adesso);
      // Fuori diretta il programma non si chiede: Twitch lo lascia vuoto
      // apposta, e sarebbe una telefonata per una risposta che sappiamo gia'.
      const perChat = conf.acceso && pub.vaGuardato(conf, stato, adesso);
      const perScena = inScena && pub.vaGuardatoPerOverlay(stato, adesso);
      if (live && (perChat || perScena)) {
        const p = await this.helix?.getAdSchedule?.(ch).catch(() => null);
        stato.prossima = p?.prossima || 0;
        stato.letto = adesso;
        if (conf.acceso) {
          const dire = pub.quandoAvvisare(conf, stato, p, adesso);
          if (dire) this._sveglia(ch, 'prima', dire, () => this._preavviso(ch));
        }
      }
      // Fuori diretta il programma che si sapeva non vale piu': alla diretta
      // dopo si rilegge al primo giro, invece di aspettare la rilettura.
      if (!live) { stato.prossima = 0; stato.letto = 0; }
      this._pub.set(ch, stato);
      if (inScena) this._pubInScena(ch);
    }
  }

  // IL CONTO SULL'OVERLAY. Si manda solo quando cambia, e si tiene fra gli
  // stati vivi del canale: un overlay che si apre (o si ricarica) a pausa in
  // corso lo trova li', invece di aspettare il giro dopo.
  _pubInScena(ch) {
    const dato = pub.perOverlay(this._pub.get(ch), this._liveState.get(ch) === true, Date.now());
    const prima = statoVivo.leggi(ch, 'pubblicita');
    if (prima && prima.prossima === dato.prossima && prima.pausaFino === dato.pausaFino) return;
    statoVivo.scrivi(ch, 'pubblicita', dato);
    try { this.effects?.emit?.(ch, { tipo: 'pubblicita', ...dato }); } catch (e) { log.debug(`#${ch} pubblicità in scena:`, e?.message || e); }
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

  // LA PUBBLICITA' DI UN CANALE, con le levette di tutti e due i posti: quella
  // della sua carta (tacere una sera) e quella delle frasi del bot (non dirlo
  // mai). Un momento spento in uno dei due non si dice, e il suo programma non
  // si legge per niente.
  _confPubblicita(ch) {
    const conf = pub.normalizzaPubblicita(streamers.get(ch)?.settings?.pubblicita);
    for (const q of pub.MOMENTI) conf[q].acceso = conf[q].acceso && voce.acceso(ch, pub.MOMENTO[q]);
    return conf;
  }

  // La frase di un momento della pausa, scelta dalla voce del canale.
  _frasePubblicita(ch, quale, secondi) {
    const canale = streamers.get(ch)?.display || ch;
    return voce.di(ch, pub.MOMENTO[quale], pub.datiDi({ secondi, canale }));
  }

  // IL PREAVVISO, all'istante giusto. Il programma si rilegge adesso: se uno
  // snooze ha spostato la pausa, il preavviso di quella li' non si dice.
  async _preavviso(ch) {
    if (!this._liveState.get(ch)) return;
    const conf = this._confPubblicita(ch);
    if (!conf.acceso) return;
    const p = await this.helix?.getAdSchedule?.(ch).catch(() => null);
    const adesso = Date.now();
    const stato = this._pub.get(ch) || {};
    if (p) { stato.prossima = p.prossima; stato.letto = adesso; }
    const avviso = p ? pub.preavviso(conf, stato, p, adesso) : null;
    if (avviso) stato.dettoPer = String(avviso.quando);
    this._pub.set(ch, stato);
    if (avviso) await this._annuncio(ch, conf, this._frasePubblicita(ch, 'prima', avviso.secondi));
  }

  // L'annuncio evidenziato in chat. Se Twitch dice di no — permesso tolto,
  // canale offline — non si riprova: un annuncio ritentato arriverebbe fuori
  // tempo, e fuori tempo e' peggio che niente.
  async _annuncio(ch, conf, testo) {
    if (!testo) return;
    try {
      const r = await this.helix?.announce?.(ch, testo, conf.colore);
      if (!r?.ok) log.debug(`#${ch} annuncio pubblicita' non partito: ${r?.motivo || '?'}`);
    } catch (e) { log.debug(`#${ch} annuncio pubblicita':`, e?.message || e); }
  }

  // LA PAUSA CHE COMINCIA. Arriva da EventSub, ed e' l'unico momento in cui
  // Twitch ci dice qualcosa: da qui escono il messaggio di adesso e la
  // sveglia del «sono tornato», puntata a inizio + durata.
  async _pubblicitaPartita(ch, dati) {
    const s = streamers.get(ch)?.settings || {};
    const conf = this._confPubblicita(ch);
    const inScena = s.overlayPubblicita?.attivo === true;
    if (!conf.acceso && !inScena) return;
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
    if (inScena) this._pubInScena(ch);
    this._spegniSveglia(ch, 'prima');
    if (!conf.acceso) return;
    if (a.finisceA) this._sveglia(ch, 'dopo', a.finisceA, () => this._sonoTornato(ch));
    else this._spegniSveglia(ch, 'dopo');
    if (a.dire) await this._annuncio(ch, conf, this._frasePubblicita(ch, 'durante', a.secondi));
  }

  // LA PAUSA CHE FINISCE. La sveglia e' sempre quella dell'ultima pausa (una
  // pausa nuova sostituisce la sveglia della vecchia). Si dice se la diretta
  // c'e' ancora, e dentro la tolleranza.
  async _sonoTornato(ch) {
    const stato = this._pub.get(ch);
    if (!stato) return;
    const conf = this._confPubblicita(ch);
    const fine = pub.allaFine(conf, stato, Date.now());
    if (!fine) return;
    stato.dettoDopo = true;
    stato.finisceA = 0;
    if (fine.dire && this._liveState.get(ch)) await this._annuncio(ch, conf, this._frasePubblicita(ch, 'dopo', fine.secondi));
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
  // LA LINGUA DEL CANALE SU TWITCH (broadcaster_language), che vale come lingua
  // della chat quando lo streamer non ne ha scelta una. Si scrive solo se e'
  // cambiata: un salvataggio delle impostazioni per niente, quattro volte al
  // giorno per ogni canale, sarebbe un rischio senza motivo.
  async _giroLingue() {
    for (const s of streamers.list()) {
      try {
        if (!s.user_id || !prossime.suTwitch(s.login)) continue;
        const ci = await this.helix.getChannelInfo(s.user_id).catch(() => null);
        const l = String(ci?.broadcaster_language || '').slice(0, 2).toLowerCase();
        if (!l) continue;
        const ora = streamers.get(s.login)?.settings || {};
        if (ora.linguaTwitch === l) continue;
        streamers.setSettings(s.login, { ...ora, linguaTwitch: l });
      } catch (err) { log.debug('lingua', s.login, err?.message || err); }
    }
  }

  async _giroProgramma() {
    for (const s of streamers.list()) {
      try {
        const sett = settimanaFeat.settimanaDi(s.settings);
        if (!sett.twitch.acceso) continue;
        if (prossime.programmaDelloStreamer(s.login)) continue;   // il Programma e' la sua fonte: non ci si scrive
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
      // Una riga della voce per questa diretta, la stessa ai due posti.
      const riga = this._rigaAvviso(l, 'avviso-diretta', 'tiktok');
      // Su Discord, dove lo streamer ha acceso l'avviso «TikTok».
      await this._diffondiDiscord(l, 'tiktok', l, {
        piattaforma: 'tiktok', login: l, display: s?.display || l,
        titolo: '', gioco: '', spettatori: null, url: tiktok.urlLive(tk.username),
        voce: riga, lingua: linguaChat(l),
      }, { chiudi: true }).catch(() => {});
      // Telegram (basta che il bot+gruppo siano collegati: indipendente dal
      // toggle "avviso live Twitch"). Cattura il message_id per fissarlo/eliminarlo.
      const conf = tgConf.get(l);
      if (conf?.token) {
        try {
          const testo = telegram.costruisciMessaggioTikTok({ login: l, display: s?.display || l }, tk.username, tk.messaggio, riga);
          tgDest.migra(l, conf);
          const dest = tgDest.perEvento(l, 'tiktok', l);
          const esiti = await telegram.diffondi(conf.token, dest, testo, { anteprima: true });
          // Ogni posto ricorda il SUO messaggio, come per le dirette degli
          // altri: a fine diretta si toglie dove era stato fissato, e l'id di un
          // messaggio vale solo nella chat dove e' nato.
          for (const e of esiti) {
            if (!e.ok || !e.result?.message_id) continue;
            tgMsg.segna(l, e.dest.id, chiaveTikTok(l), e.result.message_id);
            if (e.dest.pin) {
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
      // La prima riga dalla voce del canale, nella sua lingua: una per post, la
      // stessa ai due posti. Se lo streamer ha scritto il suo messaggio, vale
      // il suo, di qua e di la'.
      const riga = this._rigaAvviso(l, 'avviso-post', piattaforma);
      const conf = tgConf.get(l);
      if (conf?.token) {
        tgDest.migra(l, conf);
        const testo = telegram.costruisciMessaggioPost({ login: l, display: s?.display || l }, { piattaforma, titolo, url, messaggio, riga });
        const dest = tgDest.perEvento(l, ev, l);
        await telegram.diffondi(conf.token, dest, testo, { anteprima: true }).catch(() => {});
      }
      // E su Discord, dove lo streamer ha acceso quell'avviso. Un post non e'
      // una diretta: niente incorniciato «è in diretta», e le parole del post,
      // non quelle che il canale ha per le dirette.
      await this._diffondiDiscord(l, ev, l, {
        piattaforma, login: l, display: s?.display || l, titolo, url, gioco: '', spettatori: null,
        voce: riga, lingua: linguaChat(l), messaggio,
      }, { post: true }).catch(() => {});
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
  inDiretta(login) { return this.inOnda(login); }

  // IL BOT E' NELLA CHAT DEL CANALE ADESSO? E' il badge della scheda Stato, e
  // ogni piattaforma ha il suo modo di esserci: Twitch una connessione, YouTube
  // una chat che si legge solo durante una diretta, Kick un collegamento che il
  // bot usa finche' lavora. Un canale Discord una chat sua non ce l'ha: null.
  inChat(login) {
    const l = String(login || '').toLowerCase();
    const p = piattaformaDi(l);
    if (p === 'twitch') return !!this.units.get(l)?.connesso;
    if (p === 'youtube') return !!this.chatYT?.stato(l)?.inDiretta;
    if (p === 'kick') return !!tokenKick(l)?.accessToken && alLavoro(streamers.get(l), { inDiretta: this.inDirettaSu(l, 'kick') });
    return null;
  }

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
