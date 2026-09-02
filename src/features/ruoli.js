// Chi è staff, secondo Twitch.
//
// Le due classifiche non possono dipendere da «chi ha parlato di recente»: un
// moderatore che non scrive da settimane è moderatore lo stesso, e finché resta
// nella classifica del pubblico quella classifica dice una cosa falsa — oltre a
// mettere il premio VIP su qualcuno che Twitch rifiuterà.
//
// La lista autorevole ce l'ha Twitch. I distintivi che ogni messaggio porta con
// sé restano come rete: coprono chi scrive, e funzionano anche senza permessi.
// Questo modulo copre l'altra metà — tutti gli altri — e lo fa in modo
// RETROATTIVO, riscrivendo il ruolo delle righe già in archivio.
import { points } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('ruoli');

const TTL_MS = 10 * 60_000;      // non si chiede a Twitch a ogni apertura di pagina
const chiesto = new Map();        // canale → quando

// Ritorna { saliti, scesi, staff } se ha riallineato, null se non ha potuto o
// non era il momento. `null` non è un errore: è «non lo so», ed è diverso da
// «non c'è nessun moderatore» — per questo non si tocca niente.
export async function riallinea(helix, channel, { forza = false } = {}) {
  const ch = String(channel || '').toLowerCase();
  if (!ch) return null;
  if (!forza && Date.now() - (chiesto.get(ch) || 0) < TTL_MS) return null;
  let elenco = null;
  try { elenco = await helix?.getModerators?.(ch); } catch (e) { log.debug(`#${ch}:`, e?.message || e); }
  if (!Array.isArray(elenco)) return null;
  chiesto.set(ch, Date.now());
  const staff = elenco.map((m) => String(m?.user_login || '').toLowerCase()).filter(Boolean);
  staff.push(ch);                 // lo streamer è staff del suo canale
  const esito = points.riallineaRuoli(ch, staff);
  if (esito.saliti || esito.scesi) {
    log.info(`#${ch}: ruoli riallineati (+${esito.saliti} staff, −${esito.scesi})`);
  }
  return { ...esito, staff: staff.length };
}

// Per i collaudi e per il "riprova subito" dopo una nuova autorizzazione.
export function scorda(channel) {
  if (channel) chiesto.delete(String(channel).toLowerCase());
  else chiesto.clear();
}
