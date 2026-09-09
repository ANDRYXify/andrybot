// Il banco della ricerca, da lanciare A MANO: node scripts/prova-ricerca.mjs
//
// Non sta fra i cancelli, e la ragione e' misurata: durante il lavoro le stesse
// chiamate a Wikidata hanno risposto e poi non risposto a un minuto di distanza,
// senza che cambiasse niente. Un cancello che dipende dalla rete non dice se il
// codice e' giusto, dice com'era la rete in quel momento — e un cancello che
// diventa rosso a caso e' un cancello che si impara a ignorare.
//
// La logica sta in test/contratto/ricerca.test.mjs, e quella e' deterministica.
// Questo qui serve a rispondere a una domanda diversa: le fonti, oggi, rispondono?
import * as web from '../src/features/web.js';

// domanda → cosa DEVE comparire nella risposta perche' abbia risposto davvero
const BANCO = [
  ['capitale della Francia', /parigi/i],
  ['qual è la capitale del Giappone', /tokyo/i],
  ["popolazione dell'Italia", /\d{7,}/],
  ['regista di Inception', /nolan/i],
  ['ricetta carbonara', /guanciale|uovo|uova|pecorino/i],
  ['come si prepara il tiramisù', /savoiardi|mascarpone|caff/i],
  ['chi era Leonardo da Vinci', /(pittore|inventore|artista|scienziato)/i],
];

// e queste NON devono rispondere: il conto lo fa il calcolatore, e a una frase
// qualsiasi si tace invece di rispondere a caso
const SILENZI = ['4+4', 'ciao come va'];

let rossi = 0;
for (const [domanda, atteso] of BANCO) {
  const r = await web.cerca(domanda).catch(() => null);
  const ok = r && atteso.test(r);
  if (!ok) rossi++;
  console.log(`  ${ok ? '✓' : '✗'} ${domanda}`);
  console.log(`      ${r ? String(r).slice(0, 150) : 'NIENTE'}`);
  await new Promise((x) => setTimeout(x, 900));   // le fonti gratuite non si martellano
}
for (const domanda of SILENZI) {
  const r = await web.cerca(domanda).catch(() => null);
  const ok = !r;
  if (!ok) rossi++;
  console.log(`  ${ok ? '✓' : '✗'} (deve tacere) ${domanda}${r ? ` → ha detto: ${String(r).slice(0, 80)}` : ''}`);
  await new Promise((x) => setTimeout(x, 900));
}
console.log(rossi ? `\n${rossi} domande senza risposta.` : '\nLe fonti rispondono a tutte. ✓');
process.exit(rossi ? 1 : 0);
