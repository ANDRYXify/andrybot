// Osservatore delle live: il bot "guarda" lo stream in modo procedurale,
// SENZA alcuna analisi video — usa solo i dati che Twitch espone via Helix
// (titolo, categoria/gioco, spettatori, orario di inizio).
// Ogni 2 minuti interroga Helix per ciascuno streamer attivo e aggiorna il
// "contesto stream" nella memoria del bot, così il cervello sa di cosa parlare.
import { makeLog } from '../logger.js';
import { memory, streamers } from '../db.js';

const log = makeLog('watcher');

const INTERVALLO = 120_000; // controllo periodico: ogni 120 secondi
const PRIMO_GIRO = 10_000;  // primo controllo poco dopo l'avvio (10s)

export class StreamWatcher {
  constructor({ helix, brain, onLive }) {
    this.helix = helix;
    this.brain = brain;      // tenuto da parte per usi futuri (es. commenti spontanei)
    this.onLive = typeof onLive === 'function' ? onLive : null;  // (login, isLive, streamData) ad ogni giro
    this._timer = null;      // setInterval del giro periodico
    this._primoTimer = null; // setTimeout del primo giro rapido
    this._inCorso = false;   // evita giri sovrapposti se Helix è lento
    this._stato = new Map(); // login → { game, title } dell'ultimo giro in live
  }

  // Avvia l'osservazione. Idempotente: se è già attiva non fa nulla.
  start() {
    if (this._timer) return;
    this._primoTimer = setTimeout(() => this._giro(), PRIMO_GIRO);
    this._timer = setInterval(() => this._giro(), INTERVALLO);
    log.info('osservatore live avviato (un giro ogni ' + INTERVALLO / 1000 + 's)');
  }

  // Ferma l'osservazione: spegne entrambi i timer.
  stop() {
    if (this._primoTimer) { clearTimeout(this._primoTimer); this._primoTimer = null; }
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  // Un giro completo: controlla IN SEQUENZA tutti gli streamer attivi
  // (uno alla volta, per non martellare l'API di Twitch).
  async _giro() {
    if (this._inCorso) return; // il giro precedente non ha ancora finito
    this._inCorso = true;
    try {
      for (const st of streamers.active()) {
        const login = st.login;
        try {
          const s = await this.helix.getStream(login);

          // Comunica SEMPRE lo stato live/offline al manager (che decide
          // notifiche Telegram e modalità "quando live"). È idempotente: il
          // manager reagisce solo ai veri cambi di stato.
          try { this.onLive?.(login, !!s, s || null); } catch { /* niente */ }

          // Offline: non scriviamo nulla, il contesto scade da solo (10 min).
          // Dimentichiamo anche lo stato del giro prima: alla prossima live
          // si riparte da zero, senza falsi "cambi di gioco".
          if (!s) {
            this._stato.delete(login);
            continue;
          }

          const game = s.game_name || '';
          const title = s.title || '';
          const viewers = s.viewer_count ?? 0;

          // Da quanto tempo è in live, in ore e minuti
          const minutiTot = Math.max(0, Math.floor((Date.now() - new Date(s.started_at).getTime()) / 60_000));
          const ore = Math.floor(minutiTot / 60);
          const minuti = minutiTot % 60;

          // Aggiorna il contesto: è la "vista" che il cervello ha della live
          memory.setStreamContext(
            login,
            'In live su ' + game + ': "' + title + '" con ' + viewers +
            ' spettatori da ' + ore + 'h ' + minuti + 'm'
          );

          // Se il GIOCO è cambiato rispetto al giro prima, lo annotiamo tra
          // i fatti del canale: torna utile per battute e risposte a tema.
          const prima = this._stato.get(login);
          if (prima && prima.game !== game) {
            memory.setFact(login, 'gioco_recente', game);
            log.info(`#${login} ha cambiato gioco: ${prima.game || '(nessuno)'} → ${game}`);
          }
          this._stato.set(login, { game, title });
        } catch (e) {
          // Un errore su un canale non deve fermare il giro degli altri
          log.warn(`controllo live #${login}:`, e?.message || e);
        }
      }
    } finally {
      this._inCorso = false;
    }
  }
}
