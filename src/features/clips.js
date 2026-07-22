// ClipEngine: crea le clip Twitch e sorveglia il ritmo della chat per
// catturare da solo i "momenti hype" (tanti messaggi in poco tempo).
import { makeLog } from '../logger.js';
import { clips, streamers, memory } from '../db.js';

const log = makeLog('clips');

const FINESTRA_HYPE = 30_000;         // finestra su cui misurare il ritmo della chat (ms)
const PAUSA_TRA_CLIP = 5 * 60 * 1000; // minimo 5 minuti tra una clip e la successiva
const SOGLIA_DEFAULT = 25;            // msg/minuto oltre cui scatta la clip automatica

export class ClipEngine {
  constructor({ helix, say }) {
    this.helix = helix;
    this.say = say;              // say(channel, text): manda un messaggio in chat
    this._inCorso = new Set();   // canali con una clip automatica già "in volo"
  }

  // Crea una clip sul canale e la registra nel DB.
  // Ritorna l'URL della clip, oppure null (canale offline o errore).
  async createClip(channel, reason = '') {
    try {
      const clip = await this.helix.createClip(channel);
      if (!clip) return null;
      clips.log(channel, clip.id, clip.url, reason);
      log.info(`clip su #${channel}: ${clip.url} (${reason})`);
      return clip.url;
    } catch (e) {
      log.error(`createClip #${channel}:`, e?.message || e);
      return null;
    }
  }

  // Rilevatore di hype: chiamato a ogni messaggio, quindi deve restare
  // sincrono e leggerissimo. Se la chat corre sopra la soglia e l'ultima
  // clip non è troppo recente, avvia una clip automatica in background.
  onActivity(channel) {
    if (this._inCorso.has(channel)) return;   // creazione già in corso: evita doppioni

    const streamer = streamers.get(channel);
    if (!streamer || streamer.settings.clipAuto === false) return;  // funzione spenta

    const soglia = streamer.settings.clipAutoSoglia || SOGLIA_DEFAULT;
    if (memory.messageRate(channel, FINESTRA_HYPE) < soglia) return;    // chat tranquilla
    if (Date.now() - clips.lastTs(channel) <= PAUSA_TRA_CLIP) return;   // clippato da poco

    // da qui in poi si lavora in asincrono: il flag protegge dalle
    // chiamate concorrenti finché la clip non è conclusa (bene o male)
    this._inCorso.add(channel);
    (async () => {
      try {
        const url = await this.createClip(channel, 'momento hype in chat 🔥');
        if (url) this.say(channel, 'Momento epico, ci faccio una clip! 🎬 ' + url);
      } catch (e) {
        log.error(`clip automatica #${channel}:`, e?.message || e);
      } finally {
        this._inCorso.delete(channel);
      }
    })();
  }
}
