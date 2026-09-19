// UNA CHIAMATA A STRIPE, scritta una volta sola.
//
// Ce n'erano due copie, e stavano per diventare tre. Non e' un problema di
// righe risparmiate: e' che ogni copia decide da se' cosa fare quando Stripe
// risponde male, e prima o poi due posti che parlano con lo stesso servizio
// raccontano due storie diverse — uno riprova, l'altro no; uno scrive nel
// registro cosa e' successo, l'altro tace.
//
// Qui non si decide niente: si manda, si legge, si torna { ok, dati } oppure
// { ok:false, errore, codice, stato }. Non lancia MAI: chi chiama deve poter
// scrivere il caso brutto come una riga di codice normale, non come una
// eccezione da ricordarsi di prendere.
//
// LA CHIAVE ARRIVA DA FUORI, ed e' la cosa importante. Stripe qui e' un filo,
// non un conto: con la chiave di uno streamer si apre un pagamento sul conto
// SUO, con quella della piattaforma sul conto di casa. Se la chiave fosse
// dentro questo file, i due conti sarebbero la stessa cosa — ed e' l'unica
// cosa che non devono mai essere.
import { makeLog } from '../logger.js';

const log = makeLog('stripe');
export const API = 'https://api.stripe.com/v1';

export async function chiama(chiave, metodo, path, params = null) {
  const headers = { Authorization: 'Bearer ' + chiave };
  let body;
  if (params) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') body.append(k, String(v));
  }
  try {
    const r = await fetch(API + path, { method: metodo, headers, body });
    const dati = await r.json().catch(() => null);
    if (!r.ok) {
      const errore = dati?.error?.message || String(r.status);
      log.warn(`${metodo} ${path}: ${errore}`);
      return { ok: false, errore, codice: dati?.error?.code || String(r.status), stato: r.status };
    }
    return { ok: true, dati };
  } catch (e) {
    log.warn(`${metodo} ${path}: irraggiungibile`, e?.message || e);
    return { ok: false, errore: 'irraggiungibile', codice: 'rete', stato: 0 };
  }
}
