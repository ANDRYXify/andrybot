// Il "cancello" di socialbot.live.
//
// Filosofia: ZERO segreti condivisi. La dashboard non ha un login proprio
// e non è raggiungibile da fuori. L'unico modo per entrare è arrivare dal
// sito andryxify.it con un "pass" usa-e-getta:
//
//   1. Lo streamer VERIFICATO E ABILITATO, dentro le impostazioni del suo
//      account su andryxify.it, clicca "Gestisci il mio SocialBot".
//   2. Il sito conia un pass casuale (256 bit), lo salva per 2 minuti e
//      reindirizza il browser a  socialbot.live/entra?pass=<pass>.
//   3. Il bot "brucia" il pass chiamando il sito (redeemPass): il sito
//      risponde con il login dello streamer e lo cancella (usa una volta
//      sola). L'ancora di fiducia è l'HTTPS di andryxify.it — nessuna
//      chiave da incollare in un .env o in una variabile d'ambiente.
//
// Chi arriva su socialbot.live senza un pass valido non vede NIENTE:
// solo un "Not Found". La dashboard, i file statici e le API non esistono
// per lui.
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { streamers, subscriptions } from '../db.js';

const log = makeLog('gate');

// Periodo di GRAZIA: quando uno streamer non è più nella lista del sito, non lo
// spegniamo subito ma dopo questi giorni (env GRACE_DAYS, default 7). 0 = subito.
const GRACE_DAYS = Math.max(0, Number(process.env.GRACE_DAYS) || 7);
const GRACE_MS = GRACE_DAYS * 86_400_000;

// User-Agent neutro: lo scudo anti-scanner del sito penalizza gli UA di
// automazione headless, quindi ci presentiamo come il servizio che siamo.
const UA = 'socialbot.live/1.0 (+https://socialbot.live)';

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
      // ponte "giochi del sito" (endpoint + segreto), se il sito lo fornisce:
      // così SocialBot può inoltrare i comandi di gioco senza chiavi manuali.
      bridge: (dati.bridge && dati.bridge.endpoint && dati.bridge.secret)
        ? { endpoint: String(dati.bridge.endpoint), secret: String(dati.bridge.secret) }
        : null,
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

// LA RONDA: cosa dice la lista del sito, e cosa ne facciamo. Sta in una
// funzione a se', con la lista passata da fuori, cosi' si collauda con un
// database usa-e-getta e senza rete.
//
// La lista del sito governa UNA cosa sola: il flag «community» (accesso pieno
// di diritto). Non decide se un canale esiste: l'Essenziale e' gratis e non
// scade, e chi si e' iscritto dalla vetrina in quella lista non c'e' mai stato.
//  - community e non piu' in lista → periodo di grazia, poi community=0:
//    torna all'Essenziale, il bot resta dov'e';
//  - in lista e senza flag → community=1 (anche chi era decaduto e rientra);
//  - spento in passato da una grazia scaduta (grazia_fino=-1) → riapprovato,
//    sull'Essenziale: quella regola non esiste piu';
//  - prove promo finite → tier free, status none, niente extra.
// Gli account gestiti a mano (manuale=1) non si toccano. Con lista nulla o
// vuota (sito muto) non si revoca niente: un disguido di rete non deve
// togliere l'accesso a nessuno. Ritorna true se ha cambiato qualcosa.
export function giroCancello(attivi, { ora = Date.now() } = {}) {
  let cambiato = false;

  for (const s of subscriptions.scaduti(ora)) {
    subscriptions.set(s.login, { tier: 'free', status: 'none', pacchetti: [], periodEnd: s.current_period_end });
    log.info(`Prova finita per #${s.login}: torna all'Essenziale`);
    cambiato = true;
  }

  const listaSito = attivi instanceof Set && attivi.size > 0;
  if (!listaSito) return cambiato;
  for (const s of streamers.list()) {
    if (s.manuale) continue;
    if (attivi.has(s.login)) {
      if (s.grazia_fino) streamers.setGrazia(s.login, 0);
      if (s.status === 'disabled') { streamers.setStatus(s.login, 'approved'); log.info(`#${s.login} riconfermato dal sito → riapprovato`); cambiato = true; }
      if (!s.community && (s.status === 'approved' || s.status === 'disabled')) { streamers.markCommunity(s.login); log.info(`#${s.login} è nella lista del sito → community`); cambiato = true; }
      continue;
    }
    if (s.status === 'disabled' && s.grazia_fino === -1) {
      streamers.setStatus(s.login, 'approved'); streamers.setGrazia(s.login, 0);
      log.info(`#${s.login} era spento da una grazia scaduta: riapprovato, sull'Essenziale`);
      cambiato = true;
      continue;
    }
    if (!s.community || s.status !== 'approved') continue;
    const scad = s.grazia_fino > 0 ? s.grazia_fino : (ora + GRACE_MS);
    if (s.grazia_fino <= 0 && GRACE_MS > 0) {
      streamers.setGrazia(s.login, scad);
      log.info(`#${s.login} non confermato dal sito: grazia di ${GRACE_DAYS}g (scade ${new Date(scad).toISOString()})`);
    } else if (ora >= scad) {
      streamers.unmarkCommunity(s.login); streamers.setGrazia(s.login, -1);
      log.info(`Grazia scaduta per #${s.login}: torna all'Essenziale`);
      cambiato = true;
    }
  }
  return cambiato;
}

// Ogni 5 minuti chiede al sito chi e' ancora abilitato e fa la ronda. Se il
// sito non risponde, non tocca nulla. Ritorna una funzione per fermare il ciclo.
export function startApprovalSync({ manager, everyMs = 5 * 60_000 } = {}) {
  async function giro() {
    const attivi = await fetchApproved();
    if (giroCancello(attivi)) Promise.resolve(manager?.syncChannels?.()).catch(() => {});
  }
  const timer = setInterval(() => giro().catch(() => {}), everyMs);
  timer.unref?.();
  setTimeout(() => giro().catch(() => {}), 30_000).unref?.();   // primo giro dopo 30s
  return () => clearInterval(timer);
}
