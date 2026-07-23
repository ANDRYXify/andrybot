// Il "cancello" di bot.andryxify.it.
//
// Filosofia: ZERO segreti condivisi. La dashboard non ha un login proprio
// e non è raggiungibile da fuori. L'unico modo per entrare è arrivare dal
// sito andryxify.it con un "pass" usa-e-getta:
//
//   1. Lo streamer VERIFICATO E ABILITATO, dentro le impostazioni del suo
//      account su andryxify.it, clicca "Gestisci il mio SocialBot".
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
import { streamers, subscriptions } from '../db.js';

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

// Revoca automatica: ogni 5 minuti chiede al sito chi è ancora abilitato e
// SPEGNE i bot degli streamer che nel frattempo sono stati rimossi/sospesi.
// Se il sito non risponde, non tocca nulla (un disguido di rete non deve
// buttare giù i bot). Ritorna una funzione per fermare il ciclo.
export function startApprovalSync({ manager, everyMs = 5 * 60_000 } = {}) {
  async function giro() {
    // Elenco degli abilitati dal sito (i "community": accesso pieno di diritto).
    // null = sito muto: in tal caso NON si revoca nulla in base al sito (un
    // disguido di rete non deve spegnere i bot). Lo prendiamo UNA volta e lo
    // usiamo in tutti i passaggi qui sotto.
    const attivi = await fetchApproved();
    const listaSito = attivi && attivi.size > 0;   // lista utile (non muta né vuota)
    let cambiato = false;

    // 0) AUTO-RIPRISTINO: un membro community non deve MAI restare col bot spento
    //    per colpa di un trial promo scaduto. Se troviamo un community (nella
    //    lista del sito) col bot spento e un trial ormai chiuso, lo riaccendiamo
    //    e azzeriamo il trial (torna "community puro"). Firma sicura: l'interruttore
    //    volontario dello streamer non lascia un abbonamento 'canceled', quindi
    //    non riaccendiamo mai per sbaglio chi ha spento il bot di sua volontà.
    if (listaSito) {
      for (const s of streamers.list()) {
        if (s.botEnabled || !attivi.has(s.login)) continue;
        const sub = subscriptions.get(s.login);
        if (sub && sub.status === 'canceled') {
          streamers.setEnabled(s.login, true);
          subscriptions.set(s.login, { tier: 'free', status: 'none', periodEnd: 0 });
          log.info(`Ripristino: #${s.login} è community → bot riacceso (un trial scaduto non deve spegnerlo)`);
          cambiato = true;
        }
      }
    }

    // 1) Trial "settimana gratis" scaduti: si azzera il trial (torna al piano
    //    gratis). NON tocchiamo MAI `bot_enabled`: se la persona è comunque
    //    abilitata dal sito (community) il bot deve restare acceso. Se l'accesso
    //    veniva SOLO dal trial, a spegnerlo ci pensa il punto 2 in base alla lista
    //    del sito (setStatus 'disabled'), revoca più pulita che non si scontra con
    //    l'interruttore on/off dello streamer.
    for (const s of subscriptions.scaduti()) {
      subscriptions.set(s.login, { tier: 'free', status: 'canceled', periodEnd: s.current_period_end });
      log.info(`Trial promo scaduto per #${s.login}: torna al piano gratis`);
      cambiato = true;
    }

    // 2) revoca chi non è più abilitato sul sito. Salta se il sito è muto o la
    //    lista è vuota (quasi certo un disguido: parsing o endpoint cambiato),
    //    per non spegnere per sbaglio tutti i bot.
    if (listaSito) {
      for (const s of streamers.list()) {
        // gli ABBONATI self-service (Stripe) non dipendono dal sito: non si revocano
        if (subscriptions.attivo(s.login)) continue;
        if (s.status === 'approved' && !attivi.has(s.login)) {
          streamers.setStatus(s.login, 'disabled');
          log.info(`Abilitazione revocata dal sito per #${s.login}: bot disattivato`);
          cambiato = true;
        }
      }
    }

    if (cambiato) Promise.resolve(manager?.syncChannels?.()).catch(() => {});
  }
  const timer = setInterval(() => giro().catch(() => {}), everyMs);
  timer.unref?.();
  setTimeout(() => giro().catch(() => {}), 30_000).unref?.();   // primo giro dopo 30s
  return () => clearInterval(timer);
}
