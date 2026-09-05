// UN GIRO DI AUTORIZZAZIONE, scritto una volta sola.
//
// Kick e YouTube fanno lo stesso identico giro: si manda la persona dal
// fornitore con un segreto usa-e-getta (PKCE) e un `state`, e al ritorno si
// controlla che la risposta sia davvero la nostra. È la parte che tiene in piedi
// la sicurezza dell'accesso, ed è anche la parte che si è tentati di
// ricopiare per la porta nuova. Ricopiata, il giorno che si corregge un difetto
// lo si corregge per metà delle porte: l'altra metà resta com'era, e nessuno se
// ne accorge finché non è tardi.
//
// Qui c'è una regola sola, e vale per tutte le porte.
import crypto from 'node:crypto';

// Quanto vale un giro: oltre, il tentativo è scaduto.
export const GIRO_MS = 10 * 60 * 1000;

// PKCE: verifier casuale, challenge = base64url(sha256(verifier)). Al fornitore
// va solo l'impronta; il segreto per intero si mostra al ritorno. Così un codice
// di autorizzazione intercettato non serve a niente senza il verifier, che non è
// mai passato dalla rete.
export function creaPkce() {
  const verifier = crypto.randomBytes(48).toString('base64url');   // 64 caratteri
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// Due `state` sono lo stesso? Confronto a tempo costante: è l'unica cosa che
// lega la risposta del fornitore alla NOSTRA richiesta.
export function stessoState(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Si parte. Il segreto vive nella SESSIONE di chi sta autorizzando, non in una
// mappa sul server: è suo, dura il tempo di un giro, e se ne va con lui.
export function apri(req, chiave, extra = {}, ora = Date.now()) {
  const { verifier, challenge } = creaPkce();
  const state = crypto.randomBytes(16).toString('hex');
  req.session[chiave] = { ...extra, verifier, state, nato: ora };
  return { challenge, state };
}

// Si torna. Il giro esce dalla sessione SEMPRE, anche quando la risposta non va
// bene: usa-e-getta vuol dire che un tentativo fallito non lascia in giro un
// segreto ancora buono per il prossimo che passa.
//
// `giro` torna indietro anche in caso d'errore — viene dal nostro cookie, e
// serve a chi chiama per sapere dove rimandare la persona (registrazione o
// collegamento sono due strade diverse).
export function chiudi(req, chiave, query = {}, { chi = 'il fornitore', ora = Date.now() } = {}) {
  const giro = req.session?.[chiave] || null;
  if (req.session) req.session[chiave] = null;

  if (!giro?.verifier) return { ok: false, giro: null, errore: 'giro scaduto, riprova' };
  if (ora - giro.nato > GIRO_MS) return { ok: false, giro, errore: 'giro scaduto, riprova' };
  if (!stessoState(query?.state, giro.state)) return { ok: false, giro, errore: 'richiesta non riconosciuta' };
  if (query?.error) return { ok: false, giro, errore: String(query.error).slice(0, 80) };
  if (!query?.code) return { ok: false, giro, errore: `${chi} non ha dato il codice` };
  return { ok: true, giro, codice: String(query.code) };
}
