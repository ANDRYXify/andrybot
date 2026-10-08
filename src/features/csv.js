// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// UNA CELLA DI CSV, scritta in un posto solo.
//
// I file che si scaricano dal pannello (le donazioni, chi c'era in un attacco,
// i follower) contengono testo scritto da altri: un nome, un messaggio. Un
// foglio di calcolo legge come formula una cella che comincia con «=», «+»,
// «-» o «@», e le virgolette intorno non la fermano. Un messaggio come
// «=HYPERLINK(...)» diventava un comando nel momento in cui lo streamer apriva
// il proprio registro. Qui la cella si disinnesca con un apostrofo davanti, che
// il foglio non mostra, e si mette fra virgolette solo quando serve.
//
// Prima la regola c'era nel rapporto degli attacchi e mancava nelle donazioni:
// due posti, e uno dei due dimenticato. Adesso c'e' un posto solo.
const FORMULA = /^[=+\-@\t\r]/;

export function cellaCsv(v) {
  let s = String(v ?? '');
  if (FORMULA.test(s)) s = "'" + s;
  return /[",;\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

// Una riga intera, col separatore scelto (la virgola di serie; il punto e
// virgola per i fogli in italiano che usano la virgola nei decimali).
export const rigaCsv = (celle, sep = ',') => celle.map(cellaCsv).join(sep);
