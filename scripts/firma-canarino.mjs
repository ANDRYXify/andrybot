// LA FRASE-CANARINO: calcola l'impronta da mettere in src/watermark.js.
//
// La frase la scegli tu e la tieni per te. Qui non si salva da nessuna parte:
// si legge, si calcola l'impronta, si stampa. L'impronta va incollata nella
// costante CANARINO di src/watermark.js; la frase, mai. Da quel momento ogni
// installazione del bot che la sente in chat risponde con la proprieta'.
//
//   node scripts/firma-canarino.mjs          → chiede la frase senza mostrarla
//   node scripts/firma-canarino.mjs "frase"  → sconsigliato: resta nella storia della shell
import { stdin, stdout, argv } from 'node:process';
import { improntaCanarino, normalizzaCanarino } from '../src/watermark.js';

// tasti in modalita' grezza: invio (10, 13), fine input (4), interruzione (3), cancella (127, 8)
const INVIO = ['\n', '\r', String.fromCharCode(4)];
const INTERROMPI = String.fromCharCode(3);
const CANCELLA = [String.fromCharCode(127), '\b'];
const chiediNascosto = (domanda) => new Promise((ok) => {
  stdout.write(domanda);
  let s = '';
  const tty = stdin.isTTY;
  if (tty) stdin.setRawMode(true);
  stdin.resume(); stdin.setEncoding('utf8');
  const fine = () => { if (tty) stdin.setRawMode(false); stdin.pause(); stdout.write('\n'); ok(s); };
  stdin.on('data', (c) => {
    for (const ch of c) {
      if (INVIO.includes(ch)) { stdin.removeAllListeners('data'); fine(); return; }
      if (ch === INTERROMPI) { stdout.write('\n'); process.exit(130); }
      if (CANCELLA.includes(ch)) { s = s.slice(0, -1); continue; }
      s += ch;
    }
  });
});

const frase = argv[2] != null ? String(argv[2]) : await chiediNascosto('Frase-canarino (non si vede mentre scrivi): ');
if (argv[2] != null) console.error('Attenzione: passata come argomento, la frase resta nella storia della shell. Meglio senza argomenti.');
const n = normalizzaCanarino(frase);
if (n.split(' ').length < 3) { console.error('Troppo corta: almeno tre parole, che nessuno scriverebbe per caso.'); process.exit(1); }
console.log('\nImpronta (da incollare in src/watermark.js, CANARINO):\n');
console.log(improntaCanarino(frase));
console.log('\nLa frase non e\' stata salvata. Tienila a mente, o in un posto tuo.');
