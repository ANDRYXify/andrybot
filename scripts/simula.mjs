// Gioca gli scenari dello scudo e stampa i numeri.
//
// Serve a smettere di tarare a naso: si cambia una soglia, si rigiocano gli
// stessi attacchi, e si guarda cosa è successo ai numeri invece di ricordarsi
// com'era prima.
//
// Uso: node scripts/simula.mjs              (tutti gli scenari)
//      node scripts/simula.mjs coro clip-virale
import { cartellaUsaEGetta } from '../test/aiuto.mjs';

const casa = cartellaUsaEGetta('simula-');
const { streamers } = await import('../src/db.js');
const S = await import('../src/features/simulatore.js');

const CANALE = 'prova';
streamers.upsertApproved(CANALE, 'Prova', '1');
streamers.setEnabled(CANALE, true);
streamers.setSettings(CANALE, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10, rafficaSecondi: 30 } });

const chiesti = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const nomi = chiesti.length ? chiesti : S.nomiScenari();

console.log('\n  scenario          bot  pers   presi  sbagliati  scappati   prec.  rich.   visto in\n');
let rossi = 0;
for (const nome of nomi) {
  const m = await S.provaScenario(nome, { canale: CANALE });
  if (!m) { console.log(`  ${nome}: non esiste`); rossi++; continue; }
  const t = m.msPerVederlo === null ? '     —' : (m.msPerVederlo / 1000).toFixed(1) + 's';
  console.log(
    `  ${(m.passa ? '✓' : '✗')} ${nome.padEnd(15)} ${String(m.bot).padStart(4)} ${String(m.persone).padStart(5)}`
    + `  ${String(m.veri).padStart(6)} ${String(m.falsiPositivi).padStart(10)} ${String(m.falsiNegativi).padStart(9)}`
    + `  ${(m.precisione + '%').padStart(6)} ${(m.richiamo + '%').padStart(6)} ${t.padStart(10)}`,
  );
  if (m.sbagliati.length) console.log(`      persone vere colpite: ${m.sbagliati.join(', ')}`);
  if (!m.passa && m.perche) console.log(`      → ${m.perche}`);
  if (m.nota) console.log(`      nota: ${m.nota}`);
  if (!m.passa) rossi++;
}
console.log(rossi
  ? `\n  ${rossi} ${rossi === 1 ? 'scenario non passa' : 'scenari non passano'}.\n`
  : '\n  Tutti gli scenari passano. Nessuna persona vera toccata. ✓\n');
casa.pulisci();
process.exit(rossi ? 1 : 0);
