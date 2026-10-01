// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUANDO UNA DIRETTA COMINCIA E QUANDO FINISCE (docs/DISCORD-AVVISI.md).
//
// Le fonti sono due e non sono uguali. L'evento di Twitch arriva subito, in
// tutti e due i sensi. Il giro ogni due minuti chiede a /streams di Helix, che
// una diretta nuova la vede con un minuto e piu' di ritardo: se il giro passa
// in quel minuto, dice «non c'e'» di una diretta appena cominciata. Prendere
// quel «non c'e'» per una fine voleva dire chiudere l'avviso, scrivere il
// rapporto di una serata vuota e annunciare la diretta una seconda volta.
//
// La regola: comincia al primo «c'e'», da qualunque fonte; finisce con
// l'evento di fine, subito, oppure col giro solo se non la vede per due volte
// di fila e l'ultimo «c'e'» ha piu' di cinque minuti. Un giro andato a vuoto a
// meta' serata non chiude niente, e senza l'evento di fine la diretta si
// chiude lo stesso, qualche minuto dopo.

export const GRAZIA_MS = 5 * 60_000;
export const ASSENZE_PER_FINIRE = 2;

// `prima` e' lo stato tenuto fin qui ({ live, visto, assenze }, o niente se
// la diretta non si e' mai vista), il segnale e' { live, fonte, ora } con
// fonte 'evento' o 'giro'. Torna lo stato nuovo: `live` e' quello da credere.
export function dopoSegnale(prima, { live, fonte, ora }) {
  const p = prima || { live: undefined, visto: 0, assenze: 0 };
  if (live) return { live: true, visto: ora, assenze: 0 };
  if (fonte === 'evento' || p.live !== true) return { live: false, visto: p.visto, assenze: 0 };
  const assenze = p.assenze + 1;
  if (assenze >= ASSENZE_PER_FINIRE && ora - p.visto >= GRAZIA_MS) return { live: false, visto: p.visto, assenze: 0 };
  return { live: true, visto: p.visto, assenze };
}
