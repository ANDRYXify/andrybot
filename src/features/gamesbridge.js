// Ponte "giochi del sito andryxify.it": quando in chat arriva un comando dei
// giochi del sito (es. !ag …), lo inoltriamo al sito, che esegue la logica di
// gioco (lo stato vive lì) e ci restituisce le risposte da scrivere in chat.
// Così c'è UN SOLO bot in chat (questo) e il vecchio bot serverless del sito
// non serve più.
//
// Config per streamer (settings.giochiSito): { attivo, endpoint, secret }.
// endpoint+secret arrivano DAL SITO al momento dell'ingresso (redeem del pass):
// nessuna chiave da incollare a mano. L'interruttore "attivo" è nella dashboard.
import { streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('giochi');

const TIMEOUT_MS = 8_000;
// Inoltriamo SOLO i comandi dei giochi del sito (AGENTify): !ag e !agentify.
// Tutto il resto della chat (comandi propri, citazioni, minigiochi, moderazione…)
// lo gestisce SocialBot in locale, quindi non serve mandarlo al sito: meno
// traffico e nessun rischio che un comando locale venga "rubato" dal ponte.
// Se in futuro il sito aggiunge altri giochi da chat, basta ampliare qui.
const PREFISSI_GIOCO = /^!(ag|agentify)\b/i;
const INOLTRA = (testo) => PREFISSI_GIOCO.test(testo);

// Inoltra il messaggio al sito e scrive le risposte. Ritorna true se il sito
// l'ha gestito (comando di gioco/comando noto): in tal caso il bot NON elabora
// oltre. Non lancia mai.
export async function tryGamesBridge(msg, say) {
  try {
    if (!msg || msg.isSelf) return false;
    const cfg = streamers.get(msg.channel)?.settings?.giochiSito;
    if (!cfg?.attivo || !cfg.endpoint || !cfg.secret) return false;
    const testo = String(msg.text || '').trim();
    if (!testo || !INOLTRA(testo)) return false;

    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
    let dati = null;
    try {
      const r = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.secret },
        body: JSON.stringify({
          login: msg.channel,
          user: msg.user,
          display: msg.display || msg.user,
          text: testo,
          perms: { isMod: !!msg.isMod, isBroadcaster: !!msg.isBroadcaster, isVip: !!msg.isVip, isSub: !!msg.isSub },
        }),
        signal: ac.signal,
      });
      if (!r.ok) return false;                        // 404/403: non gestito, prosegui normalmente
      dati = await r.json().catch(() => null);
    } finally { clearTimeout(to); }

    if (!dati) return false;
    const risposte = Array.isArray(dati.replies) ? dati.replies : [];
    for (const t of risposte) { if (t && typeof say === 'function') say(t); }
    // "consumato" se il sito l'ha marcato tale o se ha prodotto risposte
    return !!dati.consumed || risposte.length > 0;
  } catch (e) {
    // rete/timeout: non blocchiamo la chat, lasciamo proseguire il flusso normale
    log.debug(`bridge #${msg?.channel}:`, e?.message || e);
    return false;
  }
}
