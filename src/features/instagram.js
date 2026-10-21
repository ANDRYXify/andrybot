// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Instagram: avviso quando esce un nuovo post, e la storia della settimana.
// Instagram NON ha un feed pubblico (lo scraping è bloccato), quindi serve
// l'account dello streamer: collegato col tasto (accesso aziendale di
// Instagram, docs/INSTAGRAM.md) o, come riserva, con un token della Graph API
// incollato a mano. Le credenziali le dice instagram-credenziali.js.
//   GET <graph>/{ig-user-id}/media?fields=id,caption,permalink,timestamp
// Non lancia mai.
import { makeLog } from '../logger.js';

const log = makeLog('instagram');
const TIMEOUT_MS = 8000;
// Due porte, secondo come e' nato il token (vedi instagram-credenziali.js): il
// tasto «Collega Instagram» da' token di Instagram, che parlano con
// graph.instagram.com; il token incollato a mano parla con graph.facebook.com.
//
// LE VERSIONI SCADONO. Meta tiene una versione due anni dopo l'uscita della
// successiva, poi gira le chiamate sulla piu' vecchia ancora valida: niente si
// rompe di colpo, ma le regole cambiano senza dirlo. v19.0 e' rimasta qui oltre
// il 21 maggio 2026. Accanto a ogni versione la sua scadenza (changelog di
// Meta): test/unita/instagram-versioni.test.mjs diventa rosso due mesi prima.
export const VERSIONI = {
  facebook: { versione: 'v25.0', valida: '2028-07-29' },
  instagram: { versione: 'v26.0', valida: null },
};
const API = 'https://graph.facebook.com/' + VERSIONI.facebook.versione;
const API_IG = 'https://graph.instagram.com/' + VERSIONI.instagram.versione;
const apiDi = (via) => (via === 'instagram' ? API_IG : API);

async function getJson(url) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ac.signal });
    const d = await r.json().catch(() => null);
    if (!r.ok) { log.debug('ig api:', d?.error?.message || r.status); return { errore: d?.error?.message || ('HTTP ' + r.status), codice: Number(d?.error?.code) || 0 }; }
    return d;
  } catch (e) { log.debug('get:', e?.message || e); return { errore: String(e?.message || e) }; }
  finally { clearTimeout(to); }
}

// Ultimo post. Ritorna {id, caption, permalink} | {errore} | null.
export async function ultimoPost({ userId, token, via = 'facebook' } = {}) {
  const uid = String(userId || '').trim();
  const tok = String(token || '').trim();
  if (!uid || !tok) return null;
  const d = await getJson(`${apiDi(via)}/${encodeURIComponent(uid)}/media?fields=id,caption,permalink,timestamp&limit=1&access_token=${encodeURIComponent(tok)}`);
  if (d?.errore) return { errore: d.errore, codice: d.codice || 0 };
  const m = d?.data?.[0];
  if (!m?.id) return null;
  return { id: m.id, caption: String(m.caption || ''), permalink: m.permalink || '' };
}

// Verifica che le credenziali funzionino. Ritorna {ok} | {ok:false, motivo}.
export async function prova({ userId, token, via = 'facebook' } = {}) {
  const r = await ultimoPost({ userId, token, via });
  if (r?.errore) return { ok: false, motivo: r.errore, codice: r.codice || 0 };
  if (r === null) return { ok: false, motivo: 'nessun post trovato (ID o token errati?)' };
  return { ok: true, permalink: r.permalink };
}

// ── La storia ────────────────────────────────────────────────────────────────
// Verificato su developers.facebook.com (IG User Media, Content Publishing):
// le storie si pubblicano da un account professionale col permesso
// `instagram_content_publish`, in due passi — il contenitore e poi la
// pubblicazione. L'immagine deve essere un JPEG che Meta scarica da un
// indirizzo pubblico, nel momento della chiamata.

async function postJson(url, parametri) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: 'POST', signal: ac.signal, body: new URLSearchParams(parametri) });
    const d = await r.json().catch(() => null);
    if (!r.ok) { log.debug('ig api:', d?.error?.message || r.status); return { errore: d?.error?.message || ('HTTP ' + r.status), codice: Number(d?.error?.code) || 0 }; }
    return d;
  } catch (e) { log.debug('post:', e?.message || e); return { errore: String(e?.message || e) }; }
  finally { clearTimeout(to); }
}

// SI PUO' PUBBLICARE? Si chiede alla porta che vuole lo stesso permesso della
// pubblicazione e non pubblica niente: il conteggio di quante se ne sono fatte
// nelle ultime 24 ore. Se risponde, il permesso c'e'.
export async function puoPubblicare({ userId, token, via = 'facebook' } = {}) {
  const uid = String(userId || '').trim();
  const tok = String(token || '').trim();
  if (!uid || !tok) return { ok: false, motivo: 'Instagram non e\' collegato' };
  const d = await getJson(`${apiDi(via)}/${encodeURIComponent(uid)}/content_publishing_limit?fields=quota_usage&access_token=${encodeURIComponent(tok)}`);
  if (d?.errore) return { ok: false, motivo: d.errore };
  return { ok: Array.isArray(d?.data) };
}

const aspetta = (ms) => new Promise((ok) => setTimeout(ok, ms));

export async function pubblicaStoria({ userId, token, url, via = 'facebook' } = {}, { pausa = aspetta } = {}) {
  const uid = String(userId || '').trim();
  const tok = String(token || '').trim();
  if (!uid || !tok) return { ok: false, errore: 'Instagram non e\' collegato' };
  const api = apiDi(via);
  const c = await postJson(`${api}/${encodeURIComponent(uid)}/media`, { image_url: url, media_type: 'STORIES', access_token: tok });
  if (c?.errore || !c?.id) return { ok: false, errore: c?.errore || 'Instagram non ha preparato la storia', codice: c?.codice || 0 };
  // Il contenitore di un'immagine di solito e' pronto subito; se no, si
  // aspetta un poco. Pubblicarlo prima vorrebbe dire un errore sicuro.
  for (let giro = 0; giro < 8; giro++) {
    const s = await getJson(`${api}/${encodeURIComponent(c.id)}?fields=status_code&access_token=${encodeURIComponent(tok)}`);
    if (s?.status_code === 'FINISHED') break;
    if (s?.status_code === 'ERROR' || s?.status_code === 'EXPIRED') return { ok: false, errore: 'Instagram non ha accettato l\'immagine' };
    await pausa(1500);
  }
  const p = await postJson(`${api}/${encodeURIComponent(uid)}/media_publish`, { creation_id: c.id, access_token: tok });
  if (p?.errore || !p?.id) return { ok: false, errore: p?.errore || 'Instagram non ha pubblicato la storia', codice: p?.codice || 0 };
  return { ok: true, id: String(p.id) };
}

// ── Com'e' andata l'ultima volta ─────────────────────────────────────────────
// Un collegamento puo' esserci e non funzionare: l'app tolta da Instagram, un
// permesso ritirato, la password cambiata. Lo sa solo una chiamata vera, e le
// chiamate vere le fanno il giro dei post nuovi, «Manda» e la prova. Ognuna
// lascia qui il suo esito, e il pannello lo mostra dove lo streamer guarda,
// con il rimedio: un collegamento rotto che nessuno vede e' un avviso che non
// arriva, e una storia che non parte, per settimane.
//
// I codici sono quelli della Graph API: 190 il token non vale piu'; 10 e
// 200-299 un permesso che manca; 4, 17, 32 e 613 il tetto delle chiamate, che
// passa da solo e non chiede niente a nessuno.
export function classifica(esito) {
  if (!esito?.errore) return null;
  const c = Number(esito.codice) || 0;
  if (c === 190) return { tipo: 'collegamento', grave: true };
  if (c === 10 || (c >= 200 && c <= 299)) return { tipo: 'permesso', grave: false };
  if ([4, 17, 32, 613].includes(c)) return { tipo: 'tetto', grave: false };
  return { tipo: 'altro', grave: false, testo: String(esito.errore).slice(0, 200) };
}

//
// Si ricorda anche quando va bene, con l'ora: chi mostra lo stato sa cosi' se
// l'ultima parola e' fresca, e se non lo e' fa una chiamata vera invece di
// fidarsi di un silenzio. Il tetto non cambia quello che si sa.
const _ultimo = new Map();
export function ricorda(login, esito, adesso = Date.now()) {
  const chi = String(login || '').toLowerCase();
  const p = classifica(esito);
  if (p?.tipo === 'tetto') return p;
  _ultimo.set(chi, p ? { ...p, ok: false, quando: adesso } : { ok: true, quando: adesso });
  return p;
}
export function problema(login) {
  const u = _ultimo.get(String(login || '').toLowerCase());
  if (!u || u.ok) return null;
  const { ok, ...resto } = u;
  return resto;
}
export const fresco = (login, eta, adesso = Date.now()) => {
  const u = _ultimo.get(String(login || '').toLowerCase());
  return !!u && adesso - u.quando < eta;
};
export const dimenticaProblema = (login) => { _ultimo.delete(String(login || '').toLowerCase()); };

// IL RINNOVO CHE NON RIESCE. Il token dura sessanta giorni e si rinnova da solo
// negli ultimi trenta (bot.js, _giroInstagram). Se il rinnovo fallisce, prima lo
// sapevano solo i log: il pannello se ne accorgeva a token gia' scaduto, con le
// storie e gli avvisi gia' fermi. Qui l'ultimo errore, per dirlo in tempo.
const _rinnovo = new Map();
export function ricordaRinnovo(login, errore) {
  const chi = String(login || '').toLowerCase();
  if (errore) _rinnovo.set(chi, String(errore).slice(0, 200)); else _rinnovo.delete(chi);
}
export const rinnovoNonRiesce = (login) => _rinnovo.get(String(login || '').toLowerCase()) || '';
// Quanti giorni mancano perche' il pannello dica del rinnovo che non riesce.
export const AVVISO_SCADENZA_GIORNI = 20;
