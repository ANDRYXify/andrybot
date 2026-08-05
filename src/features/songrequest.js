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

// Scelte in sospeso per la disambiguazione ("intendi 1, 2 o 3?"). Chiave
// canale|utente → { candidati, ts, modo, costo }. In memoria, effimere.
const inSospeso = new Map();
const SCELTA_TTL = 90_000;                                     // 90s per scegliere
const chiaveScelta = (ch, u) => `${ch}|${String(u || '').toLowerCase()}`;

// Toglie dalla mappa le scelte scadute (solo quando cresce, per non sprecare).
function pulisciScadute() {
  if (inSospeso.size < 200) return;
  const ora = Date.now();
  for (const [k, v] of inSospeso) if (ora - v.ts > SCELTA_TTL) inSospeso.delete(k);
}

// Normalizza un titolo per confrontarlo: minuscolo, via (feat…)/[live] e le code
// tipo " - Remastered 2011", via la punteggiatura. Così "Flowers", "Flowers
// (Demo)" e "Flowers - Live" contano come lo stesso titolo.
function normTitolo(s) {
  return String(s || '').toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s-\s.*$/, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// Dai candidati, se ci sono ≥2 brani con lo STESSO titolo ma artisti diversi (e
// la query non citava già l'artista giusto), ritorna quelli da far scegliere
// (max 3). Altrimenti null: nessuna ambiguità → si mette in coda il migliore.
function daScegliere(cands, q) {
  if (!Array.isArray(cands) || cands.length < 2) return null;
  const top = cands[0];
  const ql = String(q || '').toLowerCase();
  if (top.artista1 && ql.includes(top.artista1.toLowerCase())) return null;   // query già precisa
  const t = normTitolo(top.nome);
  if (!t) return null;
  const stessoTitolo = cands.filter((c) => normTitolo(c.nome) === t);
  const artisti = new Set(stessoTitolo.map((c) => (c.artista1 || '').toLowerCase()).filter(Boolean));
  return (stessoTitolo.length >= 2 && artisti.size >= 2) ? stessoTitolo.slice(0, 3) : null;
}

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
    disambigua: m.disambigua !== false,   // default: chiedi se più brani hanno lo stesso titolo
  };
}

// Mette in coda un brano GIÀ scelto (uri noto). Ritorna un messaggio per la chat.
async function accodaUri(channel, brano, prefissoOk) {
  const r = await spotify.aggiungiInCoda(channel, brano.uri).catch(() => ({ ok: false, status: 0 }));
  if (r.ok) return { ok: true, msg: `${prefissoOk}${brano.nome} — ${brano.artisti} 🎶` };
  if (r.status === 404) return { ok: false, msg: '🎵 Nessun dispositivo Spotify attivo: apri Spotify e avvia la riproduzione.' };
  if (r.status === 401) return { ok: false, msg: '🎵 Collegamento Spotify scaduto: ricollegalo dal pannello.' };
  return { ok: false, msg: '🎵 Non è stato possibile aggiungere il brano, riprova.' };
}

// Cerca un brano su Spotify e lo mette in coda. Ritorna un messaggio per la chat.
async function accoda(channel, q, prefissoOk) {
  const brano = await spotify.cerca(channel, q).catch(() => null);
  if (!brano) return { ok: false, msg: `🎵 Non ho trovato "${q}" su Spotify.` };
  return accodaUri(channel, brano, prefissoOk);
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
      let q = sp < 0 ? '' : taglia(testo.slice(sp + 1));
      const kScelta = chiaveScelta(channel, msg.user);

      // 0) RISOLUZIONE di una scelta in sospeso: "!sr 2" dopo un "intendi 1,2,3?".
      //    I controlli di permesso/costo sono già stati fatti quando abbiamo
      //    chiesto: qui, per le monete, ricontrolliamo solo il saldo e addebitiamo.
      const pend = inSospeso.get(kScelta);
      if (pend && /^\d+$/.test(q)) {
        inSospeso.delete(kScelta);
        if (Date.now() - pend.ts > SCELTA_TTL) { say(`🎵 ${nome}, la scelta è scaduta: rifai la richiesta con !${cmd} <canzone>.`); return true; }
        const scelto = pend.candidati[parseInt(q, 10) - 1];
        if (!scelto) { say(`🎵 ${nome}, scegli un numero tra 1 e ${pend.candidati.length}.`); return true; }
        if (pend.modo === 'monete') {
          const saldo = points.get(channel, msg.user);
          if (saldo < pend.costo) { say(`🎵 ${nome}, ti servono ${pend.costo} monete (ne hai ${saldo}).`); return true; }
        }
        const esito = await accodaUri(channel, scelto, '🎵 In coda: ');
        if (esito.ok && pend.modo === 'monete') points.add(channel, msg.user, -pend.costo);
        say(esito.msg);
        return true;
      }

      // le richieste a PUNTI CANALE non passano da !sr: si riscatta il premio
      if (cfg.modo === 'punti') { say(`🎵 ${nome}, per richiedere una canzone riscatta il premio a punti canale${cfg.premio ? ` "${cfg.premio}"` : ''} 🎁`); return true; }
      // riservato ai sub
      if (cfg.modo === 'sub' && !(msg.isSub || msg.isMod || msg.isBroadcaster)) { say(`🎵 ${nome}, le richieste musicali sono riservate ai sub.`); return true; }
      // serve un Cheer di almeno N bit nel messaggio
      if (cfg.modo === 'bit') {
        const bit = Number(msg.tags?.bits) || 0;
        if (bit < cfg.costo) { say(`🎵 ${nome}, servono almeno ${cfg.costo} bit (un Cheer nel messaggio) per richiedere una canzone.`); return true; }
      }
      // in modo "bit" togliamo i cheermote dal testo (es. "Cheer100")
      if (cfg.modo === 'bit') q = q.replace(/\b[A-Za-z]+\d+\b/g, ' ').replace(/\s+/g, ' ').trim();
      if (!q) { say('🎵 Uso: !sr <nome canzone o artista>'); return true; }
      // costo in monete: controlla il saldo (l'addebito avviene solo se il brano entra in coda)
      if (cfg.modo === 'monete') {
        const saldo = points.get(channel, msg.user);
        if (saldo < cfg.costo) { say(`🎵 ${nome}, ti servono ${cfg.costo} monete per richiedere (ne hai ${saldo}).`); return true; }
      }

      // DISAMBIGUAZIONE: se più brani hanno lo stesso titolo (artisti diversi),
      // chiediamo quale invece di indovinare. La scelta erediterà modo/costo già
      // validati qui sopra, così "!sr 2" non ripassa dai controlli.
      if (cfg.disambigua) {
        const cands = await spotify.cercaMulti(channel, q, 5).catch(() => []);
        if (!cands.length) { say(`🎵 Non ho trovato "${q}" su Spotify.`); return true; }
        const scelte = daScegliere(cands, q);
        if (scelte) {
          pulisciScadute();
          inSospeso.set(kScelta, { candidati: scelte, ts: Date.now(), modo: cfg.modo, costo: cfg.costo });
          const elenco = scelte.map((c, i) => `${i + 1}) ${c.nome} — ${c.artisti}`).join(' · ');
          const numeri = scelte.map((_, i) => i + 1).join('/');
          say(`🎵 ${nome}, quale intendi? ${elenco} — rispondi con !${cmd} ${numeri} (entro 90s)`);
          return true;
        }
        const esito = await accodaUri(channel, cands[0], '🎵 In coda: ');
        if (esito.ok && cfg.modo === 'monete') points.add(channel, msg.user, -cfg.costo);
        say(esito.msg);
        return true;
      }

      // disambiguazione spenta: comportamento classico (primo risultato Spotify)
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
export async function perRedemptionMusica(helix, channel, data, say) {
  try {
    const cfg = configMusica(channel);
    if (cfg.modo !== 'punti' || !cfg.premio) return false;
    if (!canaleHa(channel, 'musica') || !spotify.collegato(channel)) return false;
    const titolo = String(data?.reward?.title || '').trim().toLowerCase();
    if (titolo !== cfg.premio.toLowerCase()) return false;
    const chi = data?.user_name || data?.user_login || 'qualcuno';
    const rewardId = data?.reward?.id, redId = data?.id;
    // FULFILLED (consegnato) se il brano entra in coda, CANCELED (=rimborsa i
    // punti) se non lo troviamo o fallisce. Funziona per i premi gestibili
    // dall'app; con un premio creato a mano da Twitch, Twitch non lo consente e
    // il rimborso non avviene (in quel caso non promettiamo un rimborso).
    const segna = async (stato) => {
      if (!helix?.aggiornaRedemption || !rewardId || !redId) return false;
      try { return await helix.aggiornaRedemption(channel, rewardId, redId, stato); }
      catch { return false; }
    };
    const q = taglia(data?.user_input);
    if (!q) {
      const rimb = await segna('CANCELED');
      say(`🎵 ${chi}, scrivi il nome della canzone nel riscatto!${rimb ? ' Punti rimborsati.' : ''}`);
      return true;
    }
    const esito = await accoda(channel, q, `🎵 ${chi} ha messo in coda: `);
    if (esito.ok) { await segna('FULFILLED'); say(esito.msg); }
    else { const rimb = await segna('CANCELED'); say(esito.msg + (rimb ? ' Punti rimborsati.' : '')); }
    return true;
  } catch (e) {
    log.error('perRedemptionMusica:', e?.message || e);
    return false;
  }
}
