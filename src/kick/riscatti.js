// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUANDO NASCE UN RISCATTO SU KICK (docs/PIATTAFORME.md, «I premi del canale
// su Kick»). Kick manda channel.reward.redemption.updated quando il riscatto
// nasce (pending, o accepted se il premio salta la coda) e poi a ogni cambio
// di stato, quando lo streamer lo accetta o lo rifiuta. Un riscatto pero'
// succede UNA volta: la musica non si mette in coda due volte, la penitenza
// non riparte quando lo streamer lo accetta.
//
// La nascita e' la prima volta che si vede quell'id con uno stato che non sia
// «rifiutato». Gli id visti si ricordano nel database (statoVivo), non in
// memoria: un riavvio fra la nascita e l'accettazione non deve farlo rinascere.
// Se ne tengono gli ultimi MAX per canale, i piu' recenti.
import { statoVivo } from '../db.js';

const CHIAVE = 'kick-riscatti';
export const MAX = 500;

export function nascita(canale, riscatto) {
  const ch = String(canale || '');           // statoVivo lo scrive in minuscolo
  const id = String(riscatto?.id || '');
  const stato = String(riscatto?.stato || '');
  if (!ch || !id || (stato !== 'pending' && stato !== 'accepted')) return false;
  const prima = statoVivo.leggi(ch, CHIAVE)?.ids;
  const visti = Array.isArray(prima) ? prima : [];
  if (visti.includes(id)) return false;
  statoVivo.scrivi(ch, CHIAVE, { ids: [...visti, id].slice(-MAX) });
  return true;
}
