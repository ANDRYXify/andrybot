// Instagram: avviso quando esce un nuovo post. Instagram NON ha un feed pubblico
// (lo scraping è bloccato), quindi serve la TUA API: l'Instagram Graph API, con
// un account Business/Creator collegato a una Pagina Facebook e un token di
// accesso. Fornisci l'ID dell'account IG e il token; noi leggiamo l'ultimo media.
//   GET https://graph.facebook.com/v19.0/{ig-user-id}/media?fields=id,caption,permalink,timestamp
// Non lancia mai.
import { makeLog } from '../logger.js';

const log = makeLog('instagram');
const TIMEOUT_MS = 8000;
const API = 'https://graph.facebook.com/v19.0';

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
export async function ultimoPost({ userId, token } = {}) {
  const uid = String(userId || '').trim();
  const tok = String(token || '').trim();
  if (!uid || !tok) return null;
  const d = await getJson(`${API}/${encodeURIComponent(uid)}/media?fields=id,caption,permalink,timestamp&limit=1&access_token=${encodeURIComponent(tok)}`);
  if (d?.errore) return { errore: d.errore };
  const m = d?.data?.[0];
  if (!m?.id) return null;
  return { id: m.id, caption: String(m.caption || ''), permalink: m.permalink || '' };
}

// Verifica che le credenziali funzionino. Ritorna {ok} | {ok:false, motivo}.
export async function prova({ userId, token } = {}) {
  const r = await ultimoPost({ userId, token });
  if (r?.errore) return { ok: false, motivo: r.errore };
  if (r === null) return { ok: false, motivo: 'nessun post trovato (ID o token errati?)' };
  return { ok: true, permalink: r.permalink };
}
