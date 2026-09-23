// Instagram: avviso quando esce un nuovo post. Instagram NON ha un feed pubblico
// (lo scraping è bloccato), quindi serve la TUA API: l'Instagram Graph API, con
// un account Business/Creator collegato a una Pagina Facebook e un token di
// accesso. Fornisci l'ID dell'account IG e il token; noi leggiamo l'ultimo media.
//   GET https://graph.facebook.com/v19.0/{ig-user-id}/media?fields=id,caption,permalink,timestamp
// Non lancia mai.
import { makeLog } from '../logger.js';

const log = makeLog('instagram');
const TIMEOUT_MS = 8000;
// Due porte, secondo come e' nato il token (vedi instagram-credenziali.js): il
// tasto «Collega Instagram» da' token di Instagram, che parlano con
// graph.instagram.com; il token incollato a mano parla con graph.facebook.com.
const API = 'https://graph.facebook.com/v19.0';
const API_IG = 'https://graph.instagram.com/v26.0';
const apiDi = (via) => (via === 'instagram' ? API_IG : API);

async function getJson(url) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ac.signal });
    const d = await r.json().catch(() => null);
    if (!r.ok) { log.debug('ig api:', d?.error?.message || r.status); return { errore: d?.error?.message || ('HTTP ' + r.status) }; }
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
  if (d?.errore) return { errore: d.errore };
  const m = d?.data?.[0];
  if (!m?.id) return null;
  return { id: m.id, caption: String(m.caption || ''), permalink: m.permalink || '' };
}

// Verifica che le credenziali funzionino. Ritorna {ok} | {ok:false, motivo}.
export async function prova({ userId, token, via = 'facebook' } = {}) {
  const r = await ultimoPost({ userId, token, via });
  if (r?.errore) return { ok: false, motivo: r.errore };
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
    if (!r.ok) { log.debug('ig api:', d?.error?.message || r.status); return { errore: d?.error?.message || ('HTTP ' + r.status) }; }
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
  if (c?.errore || !c?.id) return { ok: false, errore: c?.errore || 'Instagram non ha preparato la storia' };
  // Il contenitore di un'immagine di solito e' pronto subito; se no, si
  // aspetta un poco. Pubblicarlo prima vorrebbe dire un errore sicuro.
  for (let giro = 0; giro < 8; giro++) {
    const s = await getJson(`${api}/${encodeURIComponent(c.id)}?fields=status_code&access_token=${encodeURIComponent(tok)}`);
    if (s?.status_code === 'FINISHED') break;
    if (s?.status_code === 'ERROR' || s?.status_code === 'EXPIRED') return { ok: false, errore: 'Instagram non ha accettato l\'immagine' };
    await pausa(1500);
  }
  const p = await postJson(`${api}/${encodeURIComponent(uid)}/media_publish`, { creation_id: c.id, access_token: tok });
  if (p?.errore || !p?.id) return { ok: false, errore: p?.errore || 'Instagram non ha pubblicato la storia' };
  return { ok: true, id: String(p.id) };
}
