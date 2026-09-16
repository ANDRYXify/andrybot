// Funzioni EFFETTIVE di un canale a runtime (per il bot in chat), calcolate in
// tempo reale da abbonamento + add-on attivi, oppure "community" di diritto.
// È la stessa logica del gating web (server.js), qui condivisa per i moduli che
// girano nel bot (es. sondaggi/predizioni gated sull'add-on Effetti).
import { streamers, subscriptions, accessi } from '../db.js';
import * as abbonamenti from './abbonamenti.js';

// Il piano di un canale: l'abbonamento, la community, o l'Essenziale.
export function funzioniDelPiano(login) {
  const l = String(login || '').toLowerCase();
  if (l && subscriptions.attivo(l)) {
    const s = subscriptions.get(l);
    return abbonamenti.funzioniDi({ tier: s.tier || 'base', pacchetti: s.pacchetti });
  }
  const st = l ? streamers.get(l) : null;
  if (st && st.status === 'approved' && st.community) return abbonamenti.funzioniDi({ tier: 'community' });
  return abbonamenti.funzioniDi({ tier: 'free' });
}

// La concessione del proprietario che vale adesso, o null.
export function concessioneDi(login, ora = Date.now()) {
  const a = accessi.get(login);
  return accessi.attiva(a, ora) ? a : null;
}

// Una concessione applicata a una matrice di funzioni. Pura: stessi dati,
// stessi diritti. «tutto» da' l'accesso pieno; «scelte» si SOMMA al piano
// (booleani in OR, numeri al massimo, `true` su un numero = illimitato) e
// conosce solo le chiavi del catalogo; «blocco» chiude le chiavi elencate, o
// tutto se non ne elenca nessuna.
export function applicaAccesso(base, a) {
  if (!a || !base) return base;
  if (a.modo === 'tutto') return { ...abbonamenti.TIER_COMMUNITY.funzioni };
  const out = { ...base };
  const scelte = a.funzioni && typeof a.funzioni === 'object' ? a.funzioni : {};
  if (a.modo === 'scelte') {
    for (const [k, v] of Object.entries(scelte)) {
      if (!(k in out)) continue;
      if (typeof out[k] === 'boolean') out[k] = out[k] || v === true || (typeof v === 'number' && v > 0);
      else out[k] = Math.max(Number(out[k]) || 0, v === true ? Infinity : (Number(v) || 0));
    }
    return out;
  }
  if (a.modo === 'blocco') {
    const chiavi = Object.keys(scelte).filter((k) => k in out);
    for (const k of (chiavi.length ? chiavi : Object.keys(out))) out[k] = typeof out[k] === 'boolean' ? false : 0;
    return out;
  }
  return base;
}

// I diritti VERI di un canale: il piano, piu' (o meno) quello che il
// proprietario ha deciso a mano. E' l'unico posto che risponde alla domanda.
export function funzioniCanale(login, ora = Date.now()) {
  return applicaAccesso(funzioniDelPiano(login), concessioneDi(login, ora));
}

// Il canale ha diritto a una funzione (in base al piano effettivo)?
export function canaleHa(login, chiave) {
  return abbonamenti.abilitata(funzioniCanale(login), chiave);
}
