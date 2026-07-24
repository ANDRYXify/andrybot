// Richieste musicali in chat (SongRequest) via Spotify. Gli spettatori mettono
// un brano nella coda del broadcaster con !sr; !song mostra cosa sta suonando.
// Fa parte dell'add-on "Richieste Musicali": se il piano non lo include, o se lo
// streamer non ha collegato Spotify, i comandi restano inerti (con un avviso).
//
// Comandi:
//   !sr <canzone o artista>   aggiunge un brano alla coda
//   !song / !brano            mostra il brano in riproduzione
import { canaleHa } from './accesso.js';
import * as spotify from './spotify.js';
import { makeLog } from '../logger.js';

const log = makeLog('songrequest');

const taglia = (s) => String(s || '').trim();

// Ritorna true se il messaggio era un comando SongRequest (gestito).
export async function trySongRequest(msg, say) {
  try {
    if (!msg) return false;
    const testo = taglia(msg.text);
    if (!testo.startsWith('!')) return false;
    const sp = testo.indexOf(' ');
    const cmd = (sp < 0 ? testo.slice(1) : testo.slice(1, sp)).toLowerCase();
    const channel = msg.channel;

    if (['sr', 'songrequest', 'richiedi', 'canzone'].includes(cmd)) {
      if (!canaleHa(channel, 'musica')) return true;                 // richiede l'add-on Musica
      if (!spotify.collegato(channel)) { say('🎵 Richieste musicali non attive: lo streamer deve collegare Spotify dal pannello.'); return true; }
      const q = sp < 0 ? '' : taglia(testo.slice(sp + 1));
      if (!q) { say('🎵 Uso: !sr <nome canzone o artista>'); return true; }
      const brano = await spotify.cerca(channel, q).catch(() => null);
      if (!brano) { say(`🎵 Non ho trovato "${q}" su Spotify.`); return true; }
      const r = await spotify.aggiungiInCoda(channel, brano.uri).catch(() => ({ ok: false, status: 0 }));
      if (r.ok) say(`🎵 In coda: ${brano.nome} — ${brano.artisti} 🎶`);
      else if (r.status === 404) say('🎵 Nessun dispositivo Spotify attivo: lo streamer deve aprire Spotify e avviare la riproduzione.');
      else if (r.status === 401) say('🎵 Collegamento Spotify scaduto: lo streamer deve ricollegarlo dal pannello.');
      else say('🎵 Non è stato possibile aggiungere il brano, riprova.');
      return true;
    }

    if (['song', 'brano', 'nowplaying', 'np'].includes(cmd)) {
      if (!canaleHa(channel, 'musica')) return true;
      if (!spotify.collegato(channel)) return true;
      const np = await spotify.inRiproduzione(channel).catch(() => null);
      say(np ? `🎶 Ora suona: ${np.nome} — ${np.artisti}` : '🎶 Niente in riproduzione al momento.');
      return true;
    }

    return false;
  } catch (e) {
    log.error('trySongRequest:', e?.message || e);
    return false;
  }
}
