// Richieste musicali in chat (SongRequest) via Spotify. Gli spettatori mettono
// un brano nella coda del broadcaster con !sr; !song mostra cosa sta suonando.
// Fa parte dell'add-on "Richieste Musicali": se il piano non lo include, o se lo
// streamer non ha collegato Spotify, i comandi restano inerti (con un avviso).
//
// Comandi:
//   !sr <canzone o artista>   aggiunge un brano alla coda
//   !song / !brano            mostra il brano in riproduzione
import { streamers, points } from '../db.js';
import { canaleHa } from './accesso.js';
import * as spotify from './spotify.js';
import { makeLog } from '../logger.js';

const log = makeLog('songrequest');

const taglia = (s) => String(s || '').trim();

// Configurazione richieste musicali del canale: come si "paga" una richiesta.
//  · libero  → gratis, per tutti (default)   · sub    → riservato ai sub
//  · monete  → costa N monete del bot         · bit    → serve un Cheer ≥ N bit
//  · punti   → si richiede riscattando un premio a punti canale (vedi redemption)
function configMusica(channel) {
  const m = streamers.get(channel)?.settings?.musica || {};
  return {
    modo: ['libero', 'sub', 'monete', 'bit', 'punti'].includes(m.modo) ? m.modo : 'libero',
    costo: Math.max(0, Math.round(Number(m.costo)) || 0),
    premio: String(m.premio || '').trim(),
  };
}

// Aggiunge un brano cercandolo su Spotify. Ritorna un messaggio per la chat.
async function accoda(channel, q, prefissoOk) {
  const brano = await spotify.cerca(channel, q).catch(() => null);
  if (!brano) return { ok: false, msg: `🎵 Non ho trovato "${q}" su Spotify.` };
  const r = await spotify.aggiungiInCoda(channel, brano.uri).catch(() => ({ ok: false, status: 0 }));
  if (r.ok) return { ok: true, msg: `${prefissoOk}${brano.nome} — ${brano.artisti} 🎶` };
  if (r.status === 404) return { ok: false, msg: '🎵 Nessun dispositivo Spotify attivo: apri Spotify e avvia la riproduzione.' };
  if (r.status === 401) return { ok: false, msg: '🎵 Collegamento Spotify scaduto: ricollegalo dal pannello.' };
  return { ok: false, msg: '🎵 Non è stato possibile aggiungere il brano, riprova.' };
}

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
      const cfg = configMusica(channel);
      const nome = msg.display || msg.user;

      // le richieste a PUNTI CANALE non passano da !sr: si riscatta il premio
      if (cfg.modo === 'punti') { say(`🎵 ${nome}, per richiedere una canzone riscatta il premio a punti canale${cfg.premio ? ` "${cfg.premio}"` : ''} 🎁`); return true; }
      // riservato ai sub
      if (cfg.modo === 'sub' && !(msg.isSub || msg.isMod || msg.isBroadcaster)) { say(`🎵 ${nome}, le richieste musicali sono riservate ai sub.`); return true; }
      // serve un Cheer di almeno N bit nel messaggio
      if (cfg.modo === 'bit') {
        const bit = Number(msg.tags?.bits) || 0;
        if (bit < cfg.costo) { say(`🎵 ${nome}, servono almeno ${cfg.costo} bit (un Cheer nel messaggio) per richiedere una canzone.`); return true; }
      }
      // testo dopo il comando; in modo "bit" togliamo i cheermote (es. "Cheer100")
      let q = sp < 0 ? '' : taglia(testo.slice(sp + 1));
      if (cfg.modo === 'bit') q = q.replace(/\b[A-Za-z]+\d+\b/g, ' ').replace(/\s+/g, ' ').trim();
      if (!q) { say('🎵 Uso: !sr <nome canzone o artista>'); return true; }
      // costo in monete: controlla il saldo, addebita SOLO se il brano entra in coda
      if (cfg.modo === 'monete') {
        const saldo = points.get(channel, msg.user);
        if (saldo < cfg.costo) { say(`🎵 ${nome}, ti servono ${cfg.costo} monete per richiedere (ne hai ${saldo}).`); return true; }
      }
      const esito = await accoda(channel, q, '🎵 In coda: ');
      if (esito.ok && cfg.modo === 'monete') points.add(channel, msg.user, -cfg.costo);
      say(esito.msg);
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

// Richiesta musicale via PUNTI CANALE: chiamata quando arriva un riscatto. Se il
// canale è in modo "punti" e il premio riscattato ha il nome configurato, il
// testo del riscatto (user_input) è la canzone → la mettiamo in coda.
// Ritorna true se ha gestito il riscatto (per non doppiarlo con altri alert).
export async function perRedemptionMusica(channel, data, say) {
  try {
    const cfg = configMusica(channel);
    if (cfg.modo !== 'punti' || !cfg.premio) return false;
    if (!canaleHa(channel, 'musica') || !spotify.collegato(channel)) return false;
    const titolo = String(data?.reward?.title || '').trim().toLowerCase();
    if (titolo !== cfg.premio.toLowerCase()) return false;
    const chi = data?.user_name || data?.user_login || 'qualcuno';
    const q = taglia(data?.user_input);
    if (!q) { say(`🎵 ${chi}, scrivi il nome della canzone nel riscatto la prossima volta!`); return true; }
    const esito = await accoda(channel, q, `🎵 ${chi} ha messo in coda: `);
    say(esito.msg);
    return true;
  } catch (e) {
    log.error('perRedemptionMusica:', e?.message || e);
    return false;
  }
}
