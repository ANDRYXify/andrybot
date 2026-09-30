// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL FRASARIO, TUTTO INSIEME. Un file per gruppo; qui si mettono in fila, e un
// momento prende il suo id e il gruppo in cui sta. Un gruppo nuovo si aggiunge
// all'elenco qui sotto e basta: la carta «Le frasi del bot» e il cancello lo
// leggono da qui.
import * as diretta from './diretta.js';
import * as community from './community.js';
import * as avvisi from './avvisi.js';

const TUTTI = [diretta, community, avvisi];

export const GRUPPI = TUTTI.map((g) => ({ id: g.GRUPPO.id, titolo: g.GRUPPO.titolo, momenti: Object.keys(g.MOMENTI) }));

export const MOMENTI = Object.freeze(Object.fromEntries(TUTTI.flatMap((g) => Object.entries(g.MOMENTI)
  .map(([id, m]) => [id, Object.freeze({ dove: 'chat', ...m, id, gruppo: g.GRUPPO.id })]))));
