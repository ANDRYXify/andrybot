// Funzioni EFFETTIVE di un canale a runtime (per il bot in chat), calcolate in
// tempo reale da abbonamento + add-on attivi, oppure "community" di diritto.
// È la stessa logica del gating web (server.js), qui condivisa per i moduli che
// girano nel bot (es. sondaggi/predizioni gated sull'add-on Effetti).
import { streamers, subscriptions } from '../db.js';
import * as abbonamenti from './abbonamenti.js';

export function funzioniCanale(login) {
  const l = String(login || '').toLowerCase();
  if (l && subscriptions.attivo(l)) {
    const s = subscriptions.get(l);
    return abbonamenti.funzioniDi({ tier: s.tier || 'base', pacchetti: s.pacchetti });
  }
  const st = l ? streamers.get(l) : null;
  if (st && st.status === 'approved' && st.community) return abbonamenti.funzioniDi({ tier: 'community' });
  return abbonamenti.funzioniDi({ tier: 'free' });
}

// Il canale ha diritto a una funzione (in base al piano effettivo)?
export function canaleHa(login, chiave) {
  return abbonamenti.abilitata(funzioniCanale(login), chiave);
}
