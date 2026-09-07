// Gestore dei messaggi in chat: il cuore "reattivo" di SocialBot.
// Per ogni messaggio, in ordine: memoria → moderazione → comandi (!) → IA.
// I comandi NON passano dall'IA: risposta immediata e deterministica.
//
// NIENTE comandi "integrati": il bot NON ha comandi propri hard-coded (niente
// !ciao, !social, !uptime, !ban… decisi da noi). Rispondono SOLO i comandi che
// lo streamer ha creato: piena libertà, nessun vincolo, e soprattutto nessun
// rischio che il bot dica cose che lo streamer non ha impostato (es. mostrare i
// social sbagliati). Le funzioni "potenti" (cambiare titolo/categoria, clip,
// timeout, messaggi a tempo/evento…) restano disponibili, ma come AZIONI dei
// Moduli che lo streamer configura dal pannello — non come comandi calati
// dall'alto. Anche gli add-on (giochi, giveaway, musica, effetti…) restano:
// sono funzioni che lo streamer sceglie e attiva, non "comandi builtin".
import { memory, streamers, commands } from '../db.js';
import { checkMessage } from './moderation.js';

const COOLDOWN_MODERAZIONE = 30_000; // avviso moderazione: max uno ogni 30s per canale

// IL RITMO DELLA STANZA.
//
// Una risposta che compare all'istante non la scrive nessuno: il percorso
// veloce del cervello risponde in pochi millisecondi, e si vede. Quindi la
// portiamo a un tempo «da persona che legge e scrive». Ma quel tempo non
// dipende solo da quanto è lunga la frase: dipende da quanto corre la chat.
// In una chat a sessanta messaggi al minuto, tre secondi sono venti messaggi
// dopo — la risposta arriva quando il discorso è già altrove, e sembra fuori
// posto anche se è giusta. In una chat ferma, invece, non c'è nessuna fretta e
// rispondere in mezzo secondo è un lampo.
//
// `ritmo` = messaggi al minuto degli ultimi trenta secondi. Il fattore scende
// con continuità e si ferma agli estremi: niente scalini, niente attese
// assurde con una chat impazzita.
const ATTESA_MIN = 700;          // il tempo minimo per leggere e battere una riga corta
const ATTESA_MAX = 2800;         // oltre non si aspetta: la chat non tiene il filo così a lungo
const PER_CARATTERE = 26;        // quanto costa un carattere, in millisecondi
const STANZA_LENTA = 1.35;       // chat ferma: si prende il suo tempo
const STANZA_VELOCE = 0.55;      // chat che corre: risponde prima che il filo si perda
const RITMO_PIENO = 57;          // messaggi al minuto oltre i quali è «che corre»

// Quanto aspettare prima di dire una cosa. Funzione pura: si prova da sola.
// `caso` (0..1) è il pizzico di variabilità — due risposte uguali non escono
// mai a distanza identica.
export function attesaUmana(lunghezza, ritmo = 0, caso = 0.5) {
  const base = Math.min(ATTESA_MAX, ATTESA_MIN + Math.max(0, Number(lunghezza) || 0) * PER_CARATTERE);
  const r = Math.max(0, Number(ritmo) || 0);
  const passo = (STANZA_LENTA - STANZA_VELOCE) / RITMO_PIENO;
  const stanza = Math.max(STANZA_VELOCE, STANZA_LENTA - r * passo);
  const c = Math.min(1, Math.max(0, Number(caso) || 0));
  return Math.round(base * stanza * (0.85 + c * 0.3));
}

// CHI HA SCRITTO, per come si vede in QUESTO messaggio.
//
// In una chat non sono tutti uguali e chi risponde lo vede: i distintivi stanno
// lì, accanto al nome. Non cambia COSA si risponde — non ci sono favori — ma
// cambia il modo: a chi arriva per la prima volta non si dà per scontato che
// sappia le cose del canale.
//
// E si ferma qui, a quello che sta NEL MESSAGGIO. L'affinità che il bot ha con
// una persona non entra: sarebbe memoria di qualcuno, e il bot del canale non
// ricorda nessuno (docs/BOT-E-LIA.md). I distintivi invece non sono un ricordo,
// sono un fatto di questo turno.
function ruoloDi(msg) {
  const r = {
    mod: !!msg.isMod,
    sub: !!msg.isSub,
    vip: !!msg.isVip,
    primo: !!msg.isFirst,
  };
  return (r.mod || r.sub || r.vip || r.primo) ? r : null;
}

export function createMessageHandler({ chat, brain, botLogin }) {
  const ultimoAvvisoMod = new Map(); // canale → ts dell'ultimo richiamo di moderazione

  // -------------------------------------------------- comandi con la "!"
  // SOLO i comandi definiti dallo streamer. Se non esiste, silenzio: niente
  // risposte "di sistema", niente elenchi, niente comportamenti impliciti.
  function gestisciComando(msg) {
    const { channel, display } = msg;
    const nome = (msg.text.slice(1).trim().split(/\s+/)[0] || '').toLowerCase();
    if (!nome) return;                        // messaggio "!" e basta
    const custom = commands.get(channel, nome);
    if (custom) chat.say(channel, custom.replaceAll('{user}', display));
  }

  // -------------------------------------------------- handler principale
  return async (msg) => {
    const { channel, user, display, text, isMod, isBroadcaster, isSelf } = msg;

    // a. ogni messaggio "umano" finisce nella memoria della chat.
    //    Quelli inviati dal bot sono già loggati da chat.say e non tornano
    //    indietro sulla connessione: se isSelf=true è lo streamer in persona
    //    che scrive dal suo account (il bot parla proprio con quell'account).
    memory.logMessage(channel, user, display, text, false);

    // b. canale non registrato → il bot resta in ascolto ma muto
    const streamer = streamers.get(channel);
    if (!streamer) return;

    // c. lo streamer in persona: niente moderazione e MAI auto-risposte
    //    (il bot non deve rispondere a se stesso/al suo account), ma i
    //    comandi "!" (quelli che LUI ha creato) funzionano comunque.
    if (isSelf) {
      if (text.startsWith('!')) gestisciComando(msg);
      return;
    }

    // d. moderazione (mod e broadcaster sono esenti dal richiamo)
    const esito = checkMessage(text, streamer.settings);
    if (!esito.ok && !isMod && !isBroadcaster) {
      const ultimo = ultimoAvvisoMod.get(channel) || 0;
      if (Date.now() - ultimo > COOLDOWN_MODERAZIONE) {
        ultimoAvvisoMod.set(channel, Date.now());
        chat.say(channel, '@' + display + ' evitiamo questo linguaggio qui 🙏');
      }
      return;
    }

    // e. comandi: risposta immediata, mai attraverso l'IA (solo i comandi
    //    dello streamer). Gli altri sistemi (moduli, giochi, effetti…) vengono
    //    invocati a parte dal bot: qui non c'è nulla di hard-coded.
    if (text.startsWith('!')) {
      gestisciComando(msg);
      return;
    }

    // f. per tutto il resto decide il cervello: se e cosa rispondere
    if (brain.shouldReply({ channel, botLogin, user, text, streamer, isSelf })) {
      const t0 = Date.now();
      const risposta = await brain.chatReply({ channel, user, display, text, streamer, botLogin, ruolo: ruoloDi(msg) });
      if (risposta) {
        // Il tempo giusto lo decide attesaUmana (lunghezza + ritmo della chat).
        // Quello che il cervello ci ha già messo del suo si sconta: se ha
        // pensato davvero, non si aspetta due volte.
        const trascorso = Date.now() - t0;
        const ritmo = memory.messageRate?.(channel) || 0;
        const attesa = Math.max(0, attesaUmana(risposta.length, ritmo, Math.random()) - trascorso);
        if (attesa > 0) await new Promise((r) => setTimeout(r, attesa));
        chat.say(channel, risposta, { rispondiA: msg.id });
        // apre la finestra di follow-up: se questa persona ribatte a breve, il bot
        // continua il filo (cooldown ridotto) invece di rispondere una volta sola.
        brain.segnaConversazione?.(channel, user);
      }
    }
  };
}
