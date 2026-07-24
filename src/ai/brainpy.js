// brainpy.js — ponte verso il CERVELLO in Python (container 'brain').
//
// Il cervello (coscienza + modello linguistico) vive in un processo separato:
// qui lo interroghiamo via HTTP con un timeout CORTO. Se è lento, occupato o
// spento, ritorniamo null e il bot semplicemente non chiacchiera — i COMANDI
// non passano mai di qui, quindi restano SEMPRE istantanei. Non lancia mai.
import { makeLog } from '../logger.js';

const log = makeLog('brainpy');

const BASE = process.env.BRAIN_URL || 'http://brain:8091';
const TIMEOUT_CHAT = Number(process.env.BRAIN_TIMEOUT_MS || '9000') || 9000;

// Chiede una risposta contestuale al cervello. Ritorna stringa o null.
// `stile` = alcune frasi vere dello streamer (la sua voce), per farlo suonare come lui.
// `timeoutMs` = quanto attendere (default 9s per la chat live; i DM possono attendere di più
//   perché su CPU un 3B è lento e una risposta tardiva è meglio di nessuna risposta).
// `modo` = 'live' (chat pubblica, veloce) oppure 'allenamento' (chat privata con
//   lo streamer: risposta più lunga e ragionata, sfrutta il maestro esterno).
export async function rispondi({ canale, login, nome, testo, tono, conoscenza, stile, timeoutMs, modo, nomeBot, spunto, lineeGuida, web } = {}) {
  if (!canale || !login || !testo) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeoutMs || TIMEOUT_CHAT);
  try {
    const r = await fetch(BASE + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canale, login, nome, testo, tono, conoscenza, stile, modo, nome_bot: nomeBot, spunto, linee_guida: lineeGuida, web }),
      signal: ac.signal,
    });
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    return d && d.risposta ? String(d.risposta) : null;
  } catch (e) {
    log.debug('chat:', e?.message || e);
    return null;
  } finally {
    clearTimeout(to);
  }
}

// ALLENAMENTO: chiede al cervello GROSSO di distillare i discorsi dello streamer
// in coppie domanda→risposta riutilizzabili. Ritorna un array (anche vuoto) se il
// cervello ha lavorato, oppure null se non era pronto/è andato in errore (così chi
// chiama sa se riprovare più tardi). Può metterci: timeout ampio.
export async function distilla(canale, frasi = []) {
  if (!canale || !Array.isArray(frasi) || !frasi.length) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 95_000);
  try {
    const r = await fetch(BASE + '/distilla', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canale, frasi }), signal: ac.signal,
    });
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    if (!d || d.pronto === false) return null;            // cervello non pronto → riprova dopo
    return Array.isArray(d.coppie) ? d.coppie : [];
  } catch (e) {
    log.debug('distilla:', e?.message || e);
    return null;
  } finally { clearTimeout(to); }
}

// Nutre la coscienza con ciò che passa in chat (impara persone/fatti). Fire-and-
// forget: non attende e non blocca nulla.
export function osserva({ canale, login, nome, testo } = {}) {
  if (!canale || !login) return;
  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 2500);
    fetch(BASE + '/osserva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canale, login, nome, testo }),
      signal: ac.signal,
    }).catch(() => {}).finally(() => clearTimeout(to));
  } catch { /* niente */ }
}

// Dice al cervello di cambiare modello a caldo (dopo che la dashboard ha scritto
// la scelta in data/llm.json). Ritorna subito: il caricamento avviene in background.
export async function ricarica() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 5000);
  try {
    const r = await fetch(BASE + '/ricarica', { method: 'POST', signal: ac.signal });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch (e) { log.debug('ricarica:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Prova un endpoint esterno (LM Studio/Ollama/OpenAI-compatibile): la verifica
// parte dal CERVELLO (server), perché è lui che dovrà raggiungerlo davvero.
// `cfg` = {url, modello, chiave, solo} oppure null per provare quello salvato.
export async function provaEndpoint(cfg) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 15_000);
  try {
    const r = await fetch(BASE + '/prova', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg || {}),
      signal: ac.signal,
    });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch (e) { log.debug('prova:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// Stato della piccola rete PER CANALE (cruscotto in dashboard). Ritorna un
// oggetto {nodi, solidi, curiosita, fiducia, lacune, non_so} o null.
export async function reteStato(canale) {
  if (!canale) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 3000);
  try {
    const r = await fetch(BASE + '/rete?canale=' + encodeURIComponent(canale), { signal: ac.signal });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch { return null; } finally { clearTimeout(to); }
}

// Stato del cervello (per log/diagnostica). Ritorna un oggetto o null.
export async function stato() {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 2500);
  try {
    const r = await fetch(BASE + '/health', { signal: ac.signal });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch { return null; } finally { clearTimeout(to); }
}
