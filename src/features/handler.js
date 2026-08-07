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
      const risposta = await brain.chatReply({ channel, user, display, text, streamer, botLogin });
      if (risposta) {
        // RITMO UMANO: una risposta non deve comparire in modo robotico-istantaneo
        // (il percorso veloce del cervello risponde in pochi ms). La portiamo a un
        // minimo "da persona che legge e scrive" — proporzionale alla lunghezza, con
        // un pizzico di variabilità — MA senza aggiungere attesa se il cervello ci ha
        // già messo del suo (così non si sacrifica la reattività quando genera davvero).
        const trascorso = Date.now() - t0;
        const target = Math.min(2800, 700 + risposta.length * 26) * (0.85 + Math.random() * 0.3);
        const attesa = Math.max(0, Math.round(target) - trascorso);
        if (attesa > 0) await new Promise((r) => setTimeout(r, attesa));
        chat.say(channel, risposta);
        // apre la finestra di follow-up: se questa persona ribatte a breve, il bot
        // continua il filo (cooldown ridotto) invece di rispondere una volta sola.
        brain.segnaConversazione?.(channel, user);
      }
    }
  };
}
