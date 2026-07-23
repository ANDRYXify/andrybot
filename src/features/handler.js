// Gestore dei messaggi in chat: il cuore "reattivo" di SocialBot.
// Per ogni messaggio, in ordine: memoria → moderazione → comandi (!) → IA.
// I comandi NON passano dall'IA: risposta immediata e deterministica.
import { makeLog } from '../logger.js';
import { memory, streamers, commands } from '../db.js';
import { checkMessage } from './moderation.js';
import { elencoSocial } from './games.js';
import { risolviCategoria } from './categoria.js';

const log = makeLog('handler');

// Comandi integrati (elencati da !comandi)
const BUILTIN = ['comandi', 'ciao', 'uptime', 'game', 'categoria', 'title', 'titolo', 'followage', 'social', 'clip', 'so',
  'cita', 'ban', 'timeout', 'untimeout', 'addcmd', 'delcmd'];

// "da quando segue": trasforma una data ISO in un testo umano (anni/mesi/giorni)
function daQuando(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const giorni = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  if (giorni < 1) return 'da oggi';
  if (giorni < 31) return `da ${giorni} giorn${giorni === 1 ? 'o' : 'i'}`;
  const mesi = Math.floor(giorni / 30);
  if (mesi < 12) return `da ${mesi} mes${mesi === 1 ? 'e' : 'i'}`;
  const anni = Math.floor(mesi / 12), restoMesi = mesi % 12;
  return `da ${anni} ann${anni === 1 ? 'o' : 'i'}` + (restoMesi ? ` e ${restoMesi} mes${restoMesi === 1 ? 'e' : 'i'}` : '');
}

const COOLDOWN_MODERAZIONE = 30_000; // avviso moderazione: max uno ogni 30s per canale
const COOLDOWN_CLIP = 60_000;        // !clip: max una ogni 60s per canale

export function createMessageHandler({ chat, helix, brain, clips, botLogin }) {
  const ultimoAvvisoMod = new Map(); // canale → ts dell'ultimo richiamo di moderazione
  const ultimaClipCmd = new Map();   // canale → ts dell'ultimo !clip andato a segno

  // -------------------------------------------------- comandi con la "!"
  async function gestisciComando(msg, streamer) {
    const { channel, user, display, isMod, isBroadcaster } = msg;
    const parti = msg.text.slice(1).trim().split(/\s+/);
    const nome = (parti.shift() || '').toLowerCase();
    if (!nome) return;                        // messaggio "!" e basta
    const argomenti = parti;                  // il resto, già spezzato per spazi

    switch (nome) {
      // elenco dei comandi disponibili (integrati + personalizzati)
      case 'comandi': {
        const custom = commands.list(channel).map(c => '!' + c.name);
        const tutti = BUILTIN.map(n => '!' + n).concat(custom);
        chat.say(channel, 'Comandi disponibili: ' + tutti.join(', '));
        return;
      }

      // saluto fisso, senza scomodare l'IA
      case 'ciao': {
        chat.say(channel, 'Ciao @' + display + '! Che bello vederti da queste parti 👋');
        return;
      }

      // da quanto tempo il canale è live
      case 'uptime': {
        try {
          const stream = await helix.getStream(channel);
          if (!stream?.started_at) { chat.say(channel, 'Il canale è offline'); return; }
          const minuti = Math.max(0, Math.floor((Date.now() - new Date(stream.started_at).getTime()) / 60_000));
          chat.say(channel, `Live da ${Math.floor(minuti / 60)}h ${minuti % 60}m`);
        } catch (e) {
          log.error(`!uptime #${channel}:`, e?.message || e);
          chat.say(channel, 'Non riesco a controllare lo stream in questo momento');
        }
        return;
      }

      // gioco/categoria del canale: senza argomento LEGGE; con argomento (solo
      // mod/streamer) IMPOSTA la categoria su Twitch (match "furbo" tra le categorie).
      case 'game': case 'gioco': case 'categoria': {
        const richiesta = argomenti.join(' ').trim();
        if (richiesta) {
          if (!(isMod || isBroadcaster)) { chat.say(channel, 'Solo i moderatori possono cambiare il gioco 😊'); return; }
          try {
            const cat = await risolviCategoria(helix, richiesta);
            if (!cat) { chat.say(channel, `Non ho trovato la categoria "${richiesta}" 🤔`); return; }
            await helix.setChannelInfo(channel, { gameId: cat.id });
            chat.say(channel, `🎮 Categoria aggiornata: ${cat.name}`);
          } catch (e) {
            if (e?.status === 401 || e?.status === 403) chat.say(channel, '🔒 Mi manca il permesso per cambiare categoria: lo streamer deve riautorizzare dalla dashboard.');
            else { log.error(`!game set #${channel}:`, e?.message || e); chat.say(channel, 'Non sono riuscito a cambiare categoria adesso.'); }
          }
          return;
        }
        try {
          const info = streamer.user_id ? await helix.getChannelInfo(streamer.user_id) : null;
          const g = info?.game_name || (await helix.getStream(channel).catch(() => null))?.game_name;
          chat.say(channel, g ? `Ora si gioca a: ${g} 🎮` : 'Nessun gioco impostato al momento.');
        } catch { chat.say(channel, 'Non riesco a leggere il gioco adesso.'); }
        return;
      }

      // social del canale: elenco immediato e deterministico (no IA, no attesa)
      case 'social': case 'socials': case 'link': case 'links': case 'lin': {
        const elenco = elencoSocial(channel);
        chat.say(channel, elenco || 'Non ho ancora social salvati per questo canale.');
        return;
      }

      // titolo del canale: senza argomento LEGGE; con argomento (solo mod/streamer)
      // IMPOSTA il titolo dello stream su Twitch.
      case 'title': case 'titolo': {
        const nuovo = argomenti.join(' ').trim();
        if (nuovo) {
          if (!(isMod || isBroadcaster)) { chat.say(channel, 'Solo i moderatori possono cambiare il titolo 😊'); return; }
          try {
            await helix.setChannelInfo(channel, { title: nuovo.slice(0, 140) });
            chat.say(channel, `📝 Titolo aggiornato: ${nuovo.slice(0, 140)}`);
          } catch (e) {
            if (e?.status === 401 || e?.status === 403) chat.say(channel, '🔒 Mi manca il permesso per cambiare titolo: lo streamer deve riautorizzare dalla dashboard.');
            else { log.error(`!title set #${channel}:`, e?.message || e); chat.say(channel, 'Non sono riuscito a cambiare titolo adesso.'); }
          }
          return;
        }
        try {
          const info = streamer.user_id ? await helix.getChannelInfo(streamer.user_id) : null;
          const t = info?.title || (await helix.getStream(channel).catch(() => null))?.title;
          chat.say(channel, t ? `Titolo: ${t}` : 'Nessun titolo impostato al momento.');
        } catch { chat.say(channel, 'Non riesco a leggere il titolo adesso.'); }
        return;
      }

      // da quanto un utente segue il canale (default: chi scrive)
      case 'followage': case 'follow': {
        const targetF = (argomenti[0] || user).replace(/^@/, '').toLowerCase();
        try {
          const u = await helix.getUserByLogin(targetF);
          if (!u?.id) { chat.say(channel, `Non trovo @${targetF} 🤔`); return; }
          const iso = await helix.getFollowAge(channel, u.id);
          if (!iso) { chat.say(channel, `@${u.display_name} non segue il canale (o non riesco a vederlo).`); return; }
          const quanto = daQuando(iso);
          chat.say(channel, `@${u.display_name} segue il canale ${quanto} 💜`);
        } catch (e) { log.error(`!followage #${channel}:`, e?.message || e); }
        return;
      }

      // clip su richiesta (con cooldown per non spammare Twitch)
      case 'clip': {
        const ultimo = ultimaClipCmd.get(channel) || 0;
        if (Date.now() - ultimo < COOLDOWN_CLIP) return;   // in cooldown: silenzio
        ultimaClipCmd.set(channel, Date.now());
        const motivo = argomenti.join(' ') || 'richiesta da ' + display;
        const url = await clips.createClip(channel, motivo);
        if (url) chat.say(channel, 'Clip creata! ' + url);
        else chat.say(channel, 'Non riesco a creare la clip (il canale è live?)');
        return;
      }

      // shoutout a un altro streamer (solo mod/broadcaster)
      case 'so': {
        if (!isMod && !isBroadcaster) return;
        const target = (argomenti[0] || '').replace(/^@/, '').toLowerCase();
        if (!target) { chat.say(channel, 'Uso: !so <utente>'); return; }
        try {
          const utente = await helix.getUserByLogin(target);
          if (!utente) { chat.say(channel, 'Non trovo nessun utente chiamato ' + target); return; }
          let extra = '';
          try {
            // se disponibile, aggiunge l'ultimo gioco/categoria del canale
            const info = helix.getChannelInfo ? await helix.getChannelInfo(utente.id) : null;
            if (info?.game_name) extra = ` — ultimo gioco: ${info.game_name}`;
          } catch { /* niente extra, pazienza */ }
          chat.say(channel, `Andate tutti a seguire ${utente.display_name}! 👉 https://twitch.tv/${utente.login}${extra}`);
        } catch (e) {
          log.error(`!so #${channel}:`, e?.message || e);
        }
        return;
      }

      // moderazione manuale (solo mod/broadcaster): ban / timeout / untimeout
      case 'ban': case 'timeout': case 'untimeout': case 'unban': {
        if (!isMod && !isBroadcaster) return;
        const bersaglio = (argomenti[0] || '').replace(/^@/, '').toLowerCase();
        if (!bersaglio) { chat.say(channel, `Uso: !${nome} <utente>` + (nome === 'timeout' ? ' [secondi] [motivo]' : '')); return; }
        try {
          const u = await helix.getUserByLogin(bersaglio);
          if (!u?.id) { chat.say(channel, `Non trovo @${bersaglio} 🤔`); return; }
          if (nome === 'untimeout' || nome === 'unban') {
            const r = await helix.unbanUser(channel, u.id);
            chat.say(channel, r.ok ? `@${u.display_name} può tornare a scrivere ✅` : `Non riesco: ${r.motivo}`);
            return;
          }
          const durata = nome === 'ban' ? 0 : (parseInt(argomenti[1], 10) || 600);   // ban=permanente, timeout=10min default
          const motivo = argomenti.slice(nome === 'ban' ? 1 : 2).join(' ') || 'moderazione';
          const r = await helix.timeoutUser(channel, u.id, durata, motivo);
          if (r.ok) chat.say(channel, nome === 'ban' ? `@${u.display_name} bannato.` : `@${u.display_name} in timeout per ${durata >= 60 ? Math.round(durata / 60) + ' min' : durata + 's'}.`);
          else chat.say(channel, `Non riesco: ${r.motivo}`);
        } catch (e) { log.error(`!${nome} #${channel}:`, e?.message || e); }
        return;
      }

      // aggiunge/aggiorna un comando personalizzato (solo mod/broadcaster)
      case 'addcmd': {
        if (!isMod && !isBroadcaster) return;
        const nomeCmd = (argomenti[0] || '').replace(/^!/, '').toLowerCase();
        const risposta = argomenti.slice(1).join(' ');
        if (!nomeCmd || !risposta) { chat.say(channel, 'Uso: !addcmd <nome> <risposta>'); return; }
        commands.set(channel, nomeCmd, risposta, user);
        chat.say(channel, `Comando !${nomeCmd} salvato ✅`);
        return;
      }

      // elimina un comando personalizzato (solo mod/broadcaster)
      case 'delcmd': {
        if (!isMod && !isBroadcaster) return;
        const nomeCmd = (argomenti[0] || '').replace(/^!/, '').toLowerCase();
        if (!nomeCmd) { chat.say(channel, 'Uso: !delcmd <nome>'); return; }
        commands.remove(channel, nomeCmd);
        chat.say(channel, `Comando !${nomeCmd} eliminato 🗑️`);
        return;
      }

      // non è un builtin: prova con i comandi personalizzati del canale
      default: {
        const custom = commands.get(channel, nome);
        if (custom) chat.say(channel, custom.replaceAll('{user}', display));
        return;
      }
    }
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
    //    comandi "!" funzionano con pieni poteri, come un broadcaster.
    if (isSelf) {
      if (text.startsWith('!')) {
        await gestisciComando({ ...msg, isMod: true, isBroadcaster: true }, streamer);
      }
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

    // e. comandi: risposta immediata, mai attraverso l'IA
    if (text.startsWith('!')) {
      await gestisciComando(msg, streamer);
      return;
    }

    // f. per tutto il resto decide il cervello: se e cosa rispondere
    if (brain.shouldReply({ channel, botLogin, user, text, streamer, isSelf })) {
      const risposta = await brain.chatReply({ channel, user, display, text, streamer, botLogin });
      if (risposta) chat.say(channel, risposta);
    }
  };
}
