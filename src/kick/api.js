// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE CHIAMATE A KICK, e il rinnovo dei token.
//
// I token di ogni streamer stanno nella STESSA tabella di quelli Twitch, con
// kind='kick': così sono cifrati a riposo dalla stessa strada già provata, e
// l'esportazione dei dati li esclude già senza dover ricordarsene.
//
// Il rinnovo è al centro: un token Kick scade, e se scade mentre lo streamer è
// in diretta il bot ammutolisce senza dire niente. Si rinnova PRIMA della
// scadenza, e una sola volta anche se dieci messaggi partono insieme.
import { tokens } from '../db.js';
import { makeLog } from '../logger.js';
import { rinnova, daRinnovare, SCOPE_MOD } from './auth.js';
import { segna } from './eco.js';

const log = makeLog('kick');
const API = 'https://api.kick.com/public/v1';
export const KIND = 'kick';

// Un rinnovo alla volta per streamer: dieci messaggi insieme non devono
// diventare dieci rinnovi (Kick invaliderebbe i precedenti e resteremmo fuori).
const _inCorso = new Map();

export function tokenDi(login) { return tokens.get(KIND, String(login).toLowerCase()); }
export function salvaToken(login, t, userId = '') {
  tokens.save(KIND, String(login).toLowerCase(), { ...t, userId: String(userId || tokenDi(login)?.userId || '') });
}
export function scollega(login) { tokens.delete(KIND, String(login).toLowerCase()); }
// Di chi è il canale Kick con questo id: lo chiede il webhook a ogni evento.
export function loginPerKickId(userId) { return tokens.loginPerUserId(KIND, userId); }
export function collegati() { return tokens.logins(KIND); }

// Il token buono per questo streamer, rinnovato se serve. null se non collegato
// o se il rinnovo è fallito (in quel caso lo streamer deve ricollegare).
export async function tokenBuono(login, { fetchImpl = fetch, ora = Date.now() } = {}) {
  const chi = String(login).toLowerCase();
  const t = tokenDi(chi);
  if (!t?.accessToken) return null;
  if (!daRinnovare(t, ora)) return t;
  if (!t.refreshToken) return t;              // niente refresh: si prova finché Kick non protesta

  if (_inCorso.has(chi)) return _inCorso.get(chi);
  const p = (async () => {
    try {
      const nuovo = await rinnova(t.refreshToken, { fetchImpl });
      salvaToken(chi, nuovo, t.userId);
      log.info(`@${chi}: token Kick rinnovato`);
      return nuovo;
    } catch (e) {
      log.error(`@${chi}: rinnovo del token Kick fallito, deve ricollegare — ${e?.message || e}`);
      return null;
    } finally {
      _inCorso.delete(chi);
    }
  })();
  _inCorso.set(chi, p);
  return p;
}

async function chiama(login, percorso, { metodo = 'GET', corpo = null, query = null, fetchImpl = fetch } = {}) {
  const t = await tokenBuono(login, { fetchImpl });
  if (!t?.accessToken) return { ok: false, errore: 'account Kick non collegato (o da ricollegare)' };
  const url = API + percorso + (query ? '?' + new URLSearchParams(query) : '');
  try {
    const r = await fetchImpl(url, {
      method: metodo,
      headers: {
        authorization: 'Bearer ' + t.accessToken,
        accept: 'application/json',
        ...(corpo ? { 'content-type': 'application/json' } : {}),
      },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    });
    if (r.status === 204) return { ok: true, dati: null };
    const testo = await r.text().catch(() => '');
    let j = null; try { j = testo ? JSON.parse(testo) : null; } catch { /* non JSON */ }
    if (!r.ok) return { ok: false, stato: r.status, errore: j?.message || testo.slice(0, 200) || ('HTTP ' + r.status) };
    return { ok: true, dati: j?.data ?? j };
  } catch (e) {
    return { ok: false, errore: e?.message || String(e) };
  }
}

// CHI HA APPENA AUTORIZZATO, con il token in mano e basta.
//
// Serve alla registrazione: in quel momento non esiste ancora un canale nostro
// sotto cui cercare il token, quindi non si puo' passare dalla strada normale.
// E' la stessa chiamata, con il token dato invece che ripescato.
export async function chiSono(accessToken, { fetchImpl = fetch } = {}) {
  const tok = String(accessToken || '');
  if (!tok) return { ok: false, errore: 'nessun token' };
  try {
    const r = await fetchImpl(API + '/users', {
      headers: { authorization: 'Bearer ' + tok, accept: 'application/json' },
    });
    const testo = await r.text().catch(() => '');
    let j = null; try { j = testo ? JSON.parse(testo) : null; } catch { /* non JSON */ }
    if (!r.ok) return { ok: false, stato: r.status, errore: j?.message || testo.slice(0, 200) || ('HTTP ' + r.status) };
    const dati = j?.data ?? j;
    const u = Array.isArray(dati) ? dati[0] : dati;
    const userId = String(u?.user_id ?? '');
    if (!userId) return { ok: false, errore: 'Kick non ha detto chi sei' };
    return { ok: true, userId, nome: String(u?.name || u?.username || ''), foto: String(u?.profile_picture || '') };
  } catch (e) {
    return { ok: false, errore: e?.message || String(e) };
  }
}

// Chi ha autorizzato: serve a legare il canale Kick allo streamer da noi.
export async function ioSuKick(login, opts) {
  const r = await chiama(login, '/users', opts);
  if (!r.ok) return r;
  const u = Array.isArray(r.dati) ? r.dati[0] : r.dati;
  return { ok: true, userId: String(u?.user_id ?? ''), nome: String(u?.name || u?.username || '') };
}

// LA DIRETTA SU KICK ADESSO, letta dal canale (GET /channels, docs.kick.com,
// «Channels»): se e' in onda, quanti guardano, da quando, il titolo, la
// categoria. E' il «giro» di Kick, come /streams per Twitch: copre gli eventi
// che si perdono, e da' gli spettatori, che negli eventi non ci sono.
// La traduzione e' pura, e si prova senza rete.
export function daCanale(dati) {
  const c = Array.isArray(dati) ? dati[0] : (dati && typeof dati === 'object' ? dati : null);
  if (!c) return null;
  const st = c.stream && typeof c.stream === 'object' ? c.stream : {};
  const live = st.is_live === true;
  const n = Number(st.viewer_count);
  const inizio = Date.parse(String(st.start_time || '')) || 0;
  return {
    live,
    spettatori: live && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null,
    inizio: live && inizio > 0 ? inizio : 0,
    titolo: String(c.stream_title || '').replace(/\s+/g, ' ').trim().slice(0, 140),
    categoria: String(c.category?.name || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    slug: String(c.slug || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40),
  };
}
export async function statoCanale(login, opts) {
  const id = String(tokenDi(login)?.userId || '');
  if (!/^\d{1,20}$/.test(id)) return { ok: false, errore: 'non so qual e\' il tuo canale Kick: ricollega Kick' };
  const r = await chiama(login, '/channels', { query: { broadcaster_user_id: id }, ...opts });
  if (!r.ok) return r;
  const c = daCanale(r.dati);
  return c ? { ok: true, ...c } : { ok: false, errore: 'Kick non ha detto niente del tuo canale' };
}

// CON QUALE VOCE PARLA IL BOT SU KICK.
//
// Kick offre due modi: `user` scrive con l'account di chi ha autorizzato (e
// vuole l'id del canale), `bot` scrive con l'identita' dell'app.
//
// Si parte da `user`, e non e' un ripiego: e' la promessa del prodotto. Il bot
// scrive CON IL TUO ACCOUNT, niente account anonimi — su Twitch e' cosi' da
// sempre, e non c'e' ragione perche' su Kick sia diverso. Partivamo da `bot`, e
// Kick rispondeva «Internal server error»: silenzio totale, e per giunta con la
// voce sbagliata.
//
// Se un modo non funziona si passa all'altro dal messaggio DOPO, non
// riprovando subito lo stesso: una risposta d'errore non vuol dire che il
// messaggio non sia partito, e riprovarlo lo farebbe uscire due volte in chat.
// Si perde una risposta, una volta, e da li' in poi si parla dalla porta buona.
const voce = new Map();          // canale → 'user' | 'bot'

export function vocePreferita(login) {
  const chi = String(login).toLowerCase();
  return voce.get(chi) || (tokenDi(chi)?.userId ? 'user' : 'bot');
}

// Manda un messaggio in chat. Kick taglia a 500 caratteri: lo facciamo noi,
// così il messaggio arriva accorciato invece di essere rifiutato.
export const MAX_TESTO = 500;
export async function scrivi(login, testo, { rispondiA = '', ...opts } = {}) {
  const chi = String(login).toLowerCase();
  const t = String(testo ?? '').trim();
  if (!t) return { ok: false, errore: 'messaggio vuoto' };

  const come = vocePreferita(chi);
  const corpo = { content: t.slice(0, MAX_TESTO), type: come };
  if (come === 'user') corpo.broadcaster_user_id = Number(tokenDi(chi)?.userId || 0);
  if (rispondiA) corpo.reply_to_message_id = String(rispondiA);
  // Si segna PRIMA di mandare: l'evento puo' tornare indietro prima che questa
  // chiamata abbia finito, e a quel punto sarebbe gia' troppo tardi.
  segna(chi, corpo.content);

  const r = await chiama(chi, '/chat', { metodo: 'POST', corpo, ...opts });
  if (r.ok) { voce.set(chi, come); return { ...r, come }; }
  // l'altra porta, dal prossimo messaggio
  const altra = come === 'user' ? 'bot' : 'user';
  if (altra === 'user' && !tokenDi(chi)?.userId) return { ...r, come };
  voce.set(chi, altra);
  log.warn(`@${chi}: Kick rifiuta di scrivere come "${come}" (${r.errore}); dal prossimo messaggio provo come "${altra}"`);
  return { ...r, come, prossima: altra };
}

// Solo per il collaudo.
export function _azzeraVoce() { voce.clear(); }

// LA MODERAZIONE SU KICK (docs/PIATTAFORME.md, «La moderazione su Kick»).
//
// Le stesse tre cose di Twitch (togliere un messaggio, mettere in pausa o
// bandire, togliere il bando) con la stessa forma di helix: { ok } o
// { ok: false, motivo }, con le stesse parole per i motivi. Cosi' l'antispam e
// i moduli non sanno con chi parlano, e un motivo nuovo non va insegnato due
// volte.
//
// Due differenze che non si nascondono:
//  · Kick conta la pausa in MINUTI (da 1 a 10080), Twitch in secondi. Si
//    arrotonda in su: una pausa chiesta non diventa mai piu' corta. Zero
//    secondi vuol dire bando, come in helix;
//  · i permessi di moderazione su Kick sono a parte, e lo streamer li da'
//    ricollegando Kick con la moderazione. Senza, non si chiama niente: una
//    chiamata che sappiamo gia' rifiutata e' solo rumore nei registri di Kick.
export const PAUSA_MAX_MIN = 10080;
export function puoModerare(login) {
  const s = tokenDi(String(login || '').toLowerCase())?.scopes;
  return Array.isArray(s) && SCOPE_MOD.every((x) => s.includes(x));
}
const motivoDi = (r) => (r.stato === 401 || r.stato === 403 ? 'permesso mancante'
  : r.stato === 429 ? 'troppe richieste' : 'errore Kick');
const intero = (x) => { const n = Number(x); return Number.isSafeInteger(n) && n > 0 ? n : 0; };

export async function cancellaMessaggio(login, messageId, { fetchImpl } = {}) {
  const chi = String(login || '').toLowerCase();
  const id = String(messageId || '');
  if (!/^[0-9a-z-]{1,64}$/i.test(id)) return { ok: false, motivo: 'dati mancanti' };
  if (!puoModerare(chi)) return { ok: false, motivo: 'permesso mancante' };
  const r = await chiama(chi, '/chat/' + encodeURIComponent(id), { metodo: 'DELETE', fetchImpl });
  // gia' sparito (tolto da un moderatore, o dall'autore): come per Twitch, e' fatto
  if (r.ok || r.stato === 404) return { ok: true };
  return { ok: false, motivo: motivoDi(r) };
}

export async function pausa(login, userId, secondi, motivo = '', { fetchImpl } = {}) {
  const chi = String(login || '').toLowerCase();
  const b = intero(tokenDi(chi)?.userId), u = intero(userId);
  if (!b || !u) return { ok: false, motivo: 'dati mancanti' };
  if (!puoModerare(chi)) return { ok: false, motivo: 'permesso mancante' };
  const corpo = { broadcaster_user_id: b, user_id: u };
  const s = Math.round(Number(secondi) || 0);
  if (s > 0) corpo.duration = Math.min(PAUSA_MAX_MIN, Math.max(1, Math.ceil(s / 60)));
  const m = String(motivo || '').trim().slice(0, 100);
  if (m) corpo.reason = m;
  const r = await chiama(chi, '/moderation/bans', { metodo: 'POST', corpo, fetchImpl });
  return r.ok ? { ok: true, minuti: corpo.duration || 0 } : { ok: false, motivo: motivoDi(r) };
}

export async function sbanna(login, userId, { fetchImpl } = {}) {
  const chi = String(login || '').toLowerCase();
  const b = intero(tokenDi(chi)?.userId), u = intero(userId);
  if (!b || !u) return { ok: false, motivo: 'dati mancanti' };
  if (!puoModerare(chi)) return { ok: false, motivo: 'permesso mancante' };
  const r = await chiama(chi, '/moderation/bans', { metodo: 'DELETE', corpo: { broadcaster_user_id: b, user_id: u }, fetchImpl });
  return r.ok ? { ok: true } : { ok: false, motivo: motivoDi(r) };
}

// La forma di helix, per chi modera senza sapere su quale piattaforma.
export const moderatoreKick = Object.freeze({
  deleteMessage: (canale, id) => cancellaMessaggio(canale, id),
  timeoutUser: (canale, utente, secondi, motivo) => pausa(canale, utente, secondi, motivo),
  unbanUser: (canale, utente) => sbanna(canale, utente),
});

// Gli eventi che vogliamo ricevere sul webhook. La chat è il cuore; gli altri
// alimentano alert e moduli che già esistono.
export const EVENTI = [
  { name: 'chat.message.sent', version: 1 },
  { name: 'channel.followed', version: 1 },
  { name: 'channel.subscription.new', version: 1 },
  { name: 'channel.subscription.renewal', version: 1 },
  { name: 'channel.subscription.gifts', version: 1 },
  { name: 'livestream.status.updated', version: 1 },
  { name: 'livestream.metadata.updated', version: 1 },
  { name: 'kicks.gifted', version: 1 },
];

export function iscrivi(login, opts) {
  return chiama(login, '/events/subscriptions', {
    metodo: 'POST', corpo: { events: EVENTI, method: 'webhook' }, ...opts,
  });
}
export function iscrizioni(login, opts) {
  return chiama(login, '/events/subscriptions', opts);
}

// Un canale collegato prima che l'elenco crescesse e' iscritto all'elenco di
// allora: gli eventi nuovi non gli arriverebbero mai, finche' non preme
// «Riprova gli eventi». Si chiede a Kick a cosa e' iscritto e si aggiunge solo
// quello che manca: rifare tutto vorrebbe dire iscrizioni doppie.
export async function allineaIscrizioni(login, opts) {
  const ora = await iscrizioni(login, opts);
  if (!ora.ok || !Array.isArray(ora.dati)) return { ok: false, errore: ora.errore || 'Kick non dice a cosa sei iscritto' };
  const ci = new Set(ora.dati.map((x) => `${x?.event}@${x?.version}`));
  const mancano = EVENTI.filter((e) => !ci.has(`${e.name}@${e.version}`));
  if (!mancano.length) return { ok: true, aggiunti: [] };
  const r = await chiama(login, '/events/subscriptions', { metodo: 'POST', corpo: { events: mancano, method: 'webhook' }, ...opts });
  if (!r.ok) return { ok: false, errore: r.errore };
  // Kick risponde evento per evento: uno rifiutato si dice, gli altri restano
  const rifiutati = (Array.isArray(r.dati) ? r.dati : []).filter((x) => x?.error).map((x) => `${x.name}: ${x.error}`);
  return rifiutati.length
    ? { ok: false, errore: rifiutati.join('; '), aggiunti: mancano.map((e) => e.name).filter((n) => !rifiutati.some((x) => x.startsWith(n + ':'))) }
    : { ok: true, aggiunti: mancano.map((e) => e.name) };
}
export async function disiscrivi(login, ids, opts) {
  const lista = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  if (!lista.length) return { ok: true, dati: null };
  const q = new URLSearchParams();
  for (const id of lista) q.append('id', String(id));
  return chiama(login, '/events/subscriptions?' + q.toString(), { metodo: 'DELETE', ...opts });
}
