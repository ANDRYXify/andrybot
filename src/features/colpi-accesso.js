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
// SU KICK (docs/COLPI.md, «Su Kick»): sapere chi e' e scrivere in chat a nome suo.
// La persona e' k:<id>: i suoi Kicks, il suo zaino.
export const PERMESSI_KICK = Object.freeze(['user:read', 'chat:write']);
export const DURATA_MS = 24 * 3600_000;
export const MAX_SPETTATORI = 5000;
const MARGINE_MS = 5 * 60_000;

export function creaAccessi({ rinnova = async () => null, ora = () => Date.now() } = {}) {
  const chiavi = new Map();   // chiave -> { id, login, nome, token, refresh, scade, dal }

  function pota(adesso = ora()) {
    for (const [k, v] of chiavi) if (adesso - v.dal > DURATA_MS) chiavi.delete(k);
    while (chiavi.size > MAX_SPETTATORI) chiavi.delete(chiavi.keys().next().value);
  }
  function metti({ id, login, nome, token, refresh = '', scade = 0, piattaforma = 'twitch' }) {
    pota();
    const k = randomBytes(24).toString('base64url');
    chiavi.set(k, { id: String(id), login: String(login).toLowerCase(), nome: String(nome || login).slice(0, 40), token, refresh, scade: Number(scade) || 0, dal: ora(), piattaforma: piattaforma === 'kick' ? 'kick' : 'twitch' });
    return k;
  }
  // chi e' (senza il token): per la pagina e per la mira
  function chi(k) {
    const v = typeof k === 'string' ? chiavi.get(k) : null;
    if (!v || ora() - v.dal > DURATA_MS) { if (v) chiavi.delete(k); return null; }
    return { id: v.id, login: v.login, nome: v.nome, piattaforma: v.piattaforma };
  }
  // il token buono adesso, rinnovato se sta per scadere; null se non c'e' piu'
  async function token(k) {
    const v = typeof k === 'string' ? chiavi.get(k) : null;
    if (!v || !chi(k)) return null;
    if (v.scade && v.scade - ora() < MARGINE_MS) {
      const t = v.refresh ? await rinnova(v.refresh, v.piattaforma).catch(() => null) : null;
      if (!t?.accessToken) { chiavi.delete(k); return null; }
      Object.assign(v, { token: t.accessToken, refresh: t.refreshToken || v.refresh, scade: t.expiresAt || 0 });
    }
    return v.token;
  }
  const togli = (k) => { if (typeof k === 'string') chiavi.delete(k); };
  return { metti, chi, token, togli, quanti: () => chiavi.size };
}

// IL PONTE fra i due indirizzi della pagina (docs/COLPI.md, «L'indirizzo
// corto»). Twitch torna solo su /auth/callback del sito, e il cookie della
// sessione vale per un nome solo: chi ha aperto la pagina su pew.<dominio> fa
// l'accesso sul sito, e la chiave gli torna di la' con un BIGLIETTO. Il
// biglietto vale una volta, per due minuti, per quel canale e per QUEL browser:
// la prova e' il segno che la pagina corta gli ha messo in sessione prima di
// partire, e che il sito si e' portato fino a Twitch e ritorno. Un biglietto
// preso da un altro, senza il segno, non fa entrare nessuno: niente accesso
// imposto da fuori.
export const PONTE_MS = 2 * 60_000;
export const MAX_PONTI = 2000;

export function creaPonti({ ora = () => Date.now() } = {}) {
  const biglietti = new Map();   // biglietto -> { canale, chiave, segno, scade }
  function apri({ canale, chiave, segno }) {
    const adesso = ora();
    for (const [k, v] of biglietti) if (v.scade <= adesso) biglietti.delete(k);
    while (biglietti.size >= MAX_PONTI) biglietti.delete(biglietti.keys().next().value);
    const b = randomBytes(24).toString('base64url');
    biglietti.set(b, { canale: String(canale), chiave, segno: String(segno || ''), scade: adesso + PONTE_MS });
    return b;
  }
  // la chiave, se il biglietto e' buono; il biglietto si brucia in ogni caso
  function prendi(biglietto, { canale, segno }) {
    const v = typeof biglietto === 'string' ? biglietti.get(biglietto) : null;
    if (!v) return null;
    biglietti.delete(biglietto);
    if (v.scade <= ora() || v.canale !== String(canale) || !v.segno || v.segno !== String(segno || '')) return null;
    return v.chiave;
  }
  return { apri, prendi, quanti: () => biglietti.size };
}

// Il messaggio in chat, con l'API di Twitch e il token dello spettatore.
// Torna { ok } o { ok:false, motivo } con le parole di Twitch (bannato, chat
// solo per chi segue, messaggio rifiutato da AutoMod...).
// Su Kick: lo stesso, con l'API di Kick (type: user, a nome di chi ha il token).
export async function mandaInChatKick({ token, broadcasterKickId, testo, fetcher = fetch }) {
  const content = String(testo || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 500);
  if (!content) return { ok: false, motivo: 'vuoto' };
  if (!/^\d{1,20}$/.test(String(broadcasterKickId || ''))) return { ok: false, motivo: 'canale' };
  try {
    const r = await fetcher('https://api.kick.com/public/v1/chat', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ content, type: 'user', broadcaster_user_id: Number(broadcasterKickId) }),
      signal: AbortSignal.timeout(10_000),
    });
    const j = await r.json().catch(() => null);
    if (r.status === 401) return { ok: false, motivo: 'accesso', scaduto: true };
    if (!r.ok) return { ok: false, motivo: String(j?.message || ('HTTP ' + r.status)).slice(0, 200) };
    return { ok: true };
  } catch (e) { return { ok: false, motivo: String(e?.message || e).slice(0, 200) }; }
}

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
