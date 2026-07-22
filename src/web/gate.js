// Il "cancello" di bot.andryxify.it.
//
// Filosofia: ZERO segreti condivisi. La dashboard non ha un login proprio
// e non è raggiungibile da fuori. L'unico modo per entrare è arrivare dal
// sito andryxify.it con un "pass" usa-e-getta:
//
//   1. Lo streamer VERIFICATO E ABILITATO, dentro le impostazioni del suo
//      account su andryxify.it, clicca "Gestisci il mio AndryBot".
//   2. Il sito conia un pass casuale (256 bit), lo salva per 2 minuti e
//      reindirizza il browser a  bot.andryxify.it/entra?pass=<pass>.
//   3. Il bot "brucia" il pass chiamando il sito (redeemPass): il sito
//      risponde con il login dello streamer e lo cancella (usa una volta
//      sola). L'ancora di fiducia è l'HTTPS di andryxify.it — nessuna
//      chiave da incollare in un .env o in una variabile d'ambiente.
//
// Chi arriva su bot.andryxify.it senza un pass valido non vede NIENTE:
// solo un "Not Found". La dashboard, i file statici e le API non esistono
// per lui.
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { streamers } from '../db.js';

const log = makeLog('gate');

// User-Agent neutro: lo scudo anti-scanner del sito penalizza gli UA di
// automazione headless, quindi ci presentiamo come il servizio che siamo.
const UA = 'bot.andryxify.it/1.0 (+https://bot.andryxify.it)';

// fetch con timeout (niente dipendenze: AbortController nativo)
async function fetchJson(url, opts = {}, timeoutMs = 10_000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      ...opts,
      signal: ac.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json', ...(opts.headers || {}) },
    });
    const testo = await r.text();
    let dati = null;
    try { dati = testo ? JSON.parse(testo) : null; } catch { /* non-JSON */ }
    return { ok: r.ok, status: r.status, dati };
  } finally {
    clearTimeout(timer);
  }
}

// Un token "pass" plausibile: esadecimale/base64url, lunghezza sensata.
// Serve solo a scartare subito input spazzatura senza disturbare il sito.
function passPlausibile(token) {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{24,256}$/.test(token);
}

// Brucia un pass sul sito e ottiene l'identità dello streamer.
// Ritorna { login, display, userId } oppure null (pass non valido/scaduto,
// streamer non più abilitato, o sito irraggiungibile).
export async function redeemPass(token) {
  if (!passPlausibile(token)) return null;
  const url = `${config.siteUrl}/api/bot-gate?action=redeem`;
  try {
    const { ok, status, dati } = await fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: token }),
    });
    if (!ok || !dati) {
      // 404/410 = pass inesistente o già usato: normale, non è un errore
      if (status !== 404 && status !== 410) log.warn('redeem: risposta', status);
      return null;
    }
    if (!dati.login || dati.approved !== true) return null;
    return {
      login: String(dati.login).toLowerCase(),
      display: String(dati.display || dati.login),
      userId: String(dati.userId || dati.user_id || ''),
    };
  } catch (e) {
    log.warn('redeem: sito irraggiungibile:', e?.message || e);
    return null;
  }
}

// Elenco (Set di login minuscoli) degli streamer ATTUALMENTE abilitati sul
// sito. Usato per revocare in automatico chi non è più approvato.
// Ritorna null se il sito non risponde (in tal caso NON si revoca nulla:
// meglio lasciare tutto com'è che spegnere i bot per un disguido di rete).
export async function fetchApproved() {
  const url = `${config.siteUrl}/api/streamer-verify?action=picker_data`;
  try {
    const { ok, dati } = await fetchJson(url, { method: 'GET' });
    if (!ok || !dati) return null;
    const lista = dati.approved || dati.streamers || [];
    if (!Array.isArray(lista)) return null;
    const set = new Set();
    for (const item of lista) {
      const login = typeof item === 'string' ? item : (item?.login || item?.name);
      if (login) set.add(String(login).toLowerCase());
    }
    return set;
  } catch {
    return null;
  }
}

// Revoca automatica: ogni 5 minuti chiede al sito chi è ancora abilitato e
// SPEGNE i bot degli streamer che nel frattempo sono stati rimossi/sospesi.
// Se il sito non risponde, non tocca nulla (un disguido di rete non deve
// buttare giù i bot). Ritorna una funzione per fermare il ciclo.
export function startApprovalSync({ manager, everyMs = 5 * 60_000 } = {}) {
  async function giro() {
    const attivi = await fetchApproved();
    if (!attivi) return;                      // sito muto: non revocare nulla
    // Prudenza: una lista vuota è quasi certamente un disguido (parsing o
    // endpoint cambiato), non "nessuno è più abilitato". In quel caso non
    // revochiamo nulla, per non spegnere per sbaglio tutti i bot.
    if (attivi.size === 0) return;
    let cambiato = false;
    for (const s of streamers.list()) {
      if (s.status === 'approved' && !attivi.has(s.login)) {
        streamers.setStatus(s.login, 'disabled');
        log.info(`Abilitazione revocata dal sito per #${s.login}: bot disattivato`);
        cambiato = true;
      }
    }
    if (cambiato) Promise.resolve(manager?.syncChannels?.()).catch(() => {});
  }
  const timer = setInterval(() => giro().catch(() => {}), everyMs);
  timer.unref?.();
  setTimeout(() => giro().catch(() => {}), 30_000).unref?.();   // primo giro dopo 30s
  return () => clearInterval(timer);
}
