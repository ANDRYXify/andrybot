// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE REGOLE DEL RECAPITO (docs/DISCORD-AVVISI.md, «Il recapito»).
//
// Un recapito e' un avviso in un posto. Qui si decide, da cosa ha risposto il
// posto, se il recapito si ritenta, quando, e quando e' perso. Funzioni pure:
// le usa il giro dei recapiti in bot.js, e le prove le provano da sole.

export const PRIMA_ATTESA_MS = 30_000;          // il primo ritentativo
export const ATTESA_MAX_MS = 5 * 60_000;        // mai piu' di cosi' fra un tentativo e l'altro
export const FINESTRA_MS = 15 * 60_000;         // dopo, un «e' in diretta» arriverebbe troppo tardi
export const AGGIORNA_OGNI_MS = 10 * 60_000;    // ogni quanto un avviso di diretta si riscrive
export const TIENI_MS = 7 * 86_400_000;         // poi la riga si toglie

// UN ERRORE CHE NON PASSA: il posto ha detto che non puo' ricevere, e
// ritentare non cambia la risposta. Il bot non puo' scrivere li' (403), il
// canale o il webhook non c'e' piu' (404, 401), il messaggio e' sbagliato
// (400), o manca qualcosa di nostro (il token, un id). Tutto il resto (troppe
// richieste, Discord che non risponde, un suo errore interno) passa.
export function erroreFisso(r) {
  if (r?.muto || r?.morto) return true;
  if ([400, 401, 403, 404].includes(Number(r?.stato))) return true;
  return /non valido|manca il token|non configurato|vuoto/.test(String(r?.errore || ''));
}

// Dopo un errore: { perso: true } oppure { prossimo } (quando ritentare).
// L'attesa raddoppia a ogni tentativo fino al tetto, e non e' mai piu' corta
// di quella che il posto ha chiesto (`r.attesa`, il retry_after di Discord).
export function dopoErrore(rec, r, ora) {
  if (erroreFisso(r)) return { perso: true };
  const attesa = Math.min(ATTESA_MAX_MS, PRIMA_ATTESA_MS * 2 ** Math.max(0, Number(rec?.tentativi) || 0));
  const prossimo = ora + Math.max(attesa, Number(r?.attesa) || 0);
  if (prossimo - (Number(rec?.ts) || ora) > FINESTRA_MS) return { perso: true };
  return { prossimo };
}

// La chiave della diretta: l'id che la piattaforma le da'. Senza (TikTok) e'
// l'istante dell'avviso: meglio avvisare che tacere, come prima.
export const chiaveDiretta = (d, ora) => String(d?.id || '') || `al:${ora}`;
