// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ACCESSO DELLO SPETTATORE NELLA PAGINA DEI COLPI (docs/COLPI.md, «L'accesso
// con Twitch»).
//
// Un permesso solo: `user:write:chat`, scrivere in chat a nome suo. Chi e' lo
// dice Twitch col token stesso (validate), senza chiedere altro. Niente Bit e
// niente punti: Twitch non lascia spenderli da fuori, e un permesso che non
// serve spaventa e basta.
//
// Il token sta SOLO nella memoria del server. Nel cookie della sessione (che e'
// firmato ma si legge) va una chiave casuale; il token, il rinnovo e la
// scadenza stanno qui. Un riavvio li perde: lo spettatore rientra con un clic.
// Le chiavi sono poche e vecchie al massimo un giorno: chi non torna sparisce.
import { randomBytes } from 'node:crypto';

export const PERMESSI = Object.freeze(['user:write:chat']);
export const DURATA_MS = 24 * 3600_000;
export const MAX_SPETTATORI = 5000;
const MARGINE_MS = 5 * 60_000;

export function creaAccessi({ rinnova = async () => null, ora = () => Date.now() } = {}) {
  const chiavi = new Map();   // chiave -> { id, login, nome, token, refresh, scade, dal }

  function pota(adesso = ora()) {
    for (const [k, v] of chiavi) if (adesso - v.dal > DURATA_MS) chiavi.delete(k);
    while (chiavi.size > MAX_SPETTATORI) chiavi.delete(chiavi.keys().next().value);
  }
  function metti({ id, login, nome, token, refresh = '', scade = 0 }) {
    pota();
    const k = randomBytes(24).toString('base64url');
    chiavi.set(k, { id: String(id), login: String(login).toLowerCase(), nome: String(nome || login).slice(0, 40), token, refresh, scade: Number(scade) || 0, dal: ora() });
    return k;
  }
  // chi e' (senza il token): per la pagina e per la mira
  function chi(k) {
    const v = typeof k === 'string' ? chiavi.get(k) : null;
    if (!v || ora() - v.dal > DURATA_MS) { if (v) chiavi.delete(k); return null; }
    return { id: v.id, login: v.login, nome: v.nome };
  }
  // il token buono adesso, rinnovato se sta per scadere; null se non c'e' piu'
  async function token(k) {
    const v = typeof k === 'string' ? chiavi.get(k) : null;
    if (!v || !chi(k)) return null;
    if (v.scade && v.scade - ora() < MARGINE_MS) {
      const t = v.refresh ? await rinnova(v.refresh).catch(() => null) : null;
      if (!t?.accessToken) { chiavi.delete(k); return null; }
      Object.assign(v, { token: t.accessToken, refresh: t.refreshToken || v.refresh, scade: t.expiresAt || 0 });
    }
    return v.token;
  }
  const togli = (k) => { if (typeof k === 'string') chiavi.delete(k); };
  return { metti, chi, token, togli, quanti: () => chiavi.size };
}

// Il messaggio in chat, con l'API di Twitch e il token dello spettatore.
// Torna { ok } o { ok:false, motivo } con le parole di Twitch (bannato, chat
// solo per chi segue, messaggio rifiutato da AutoMod...).
export async function mandaInChat({ clientId, token, broadcasterId, senderId, testo, fetcher = fetch }) {
  const message = String(testo || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 500);
  if (!message) return { ok: false, motivo: 'vuoto' };
  try {
    const r = await fetcher('https://api.twitch.tv/helix/chat/messages', {
      method: 'POST',
      headers: { 'Client-Id': clientId, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcaster_id: String(broadcasterId), sender_id: String(senderId), message }),
      signal: AbortSignal.timeout(10_000),
    });
    const j = await r.json().catch(() => null);
    if (r.status === 401) return { ok: false, motivo: 'accesso', scaduto: true };
    if (!r.ok) return { ok: false, motivo: String(j?.message || ('HTTP ' + r.status)).slice(0, 200) };
    const d = j?.data?.[0];
    if (d && d.is_sent === false) return { ok: false, motivo: String(d.drop_reason?.message || d.drop_reason?.code || 'rifiutato').slice(0, 200) };
    return { ok: true };
  } catch (e) { return { ok: false, motivo: String(e?.message || e).slice(0, 200) }; }
}
