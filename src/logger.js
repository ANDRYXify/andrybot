// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Logger minimale con timestamp e livelli, senza dipendenze.
//
// Ogni ERRORE passa anche dall'osservatorio: il gancio sta QUI, così nessun
// modulo deve ricordarsi di annotare. L'etichetta del logger (49 aree in tutto
// il bot) diventa l'area del registro.
import { osservatorio } from './osservatorio.js';

const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// Un errore può essere una stringa, un Error, o un misto: qui diventa una riga
// sola leggibile, senza far cadere niente se qualcosa non è serializzabile.
function testoDi(args) {
  return args.map((a) => {
    if (a instanceof Error) return a.message || String(a);
    if (typeof a === 'string') return a;
    try { return JSON.stringify(a); } catch { return String(a); }
  }).join(' ');
}

// SOTTO IL COLLAUDO il registro non si stampa. Le prove provocano apposta
// rifiuti, errori e avvisi (e' il loro mestiere), e centinaia di righe WARN in
// mezzo agli esiti nascondono proprio quella che conta. Le righe restano in
// memoria (le ultime RIGHE_TENUTE) per la prova che vuole leggerle, e
// l'osservatorio riceve comunque ogni errore. Se un file di prove finisce rosso,
// le sue ultime righe si stampano: da verde si tace, da rosso si racconta.
// LOG_COLLAUDO=1 le fa vedere sempre.
//
// E c'e' una guardia: una riga scritta dopo che la prova ha tolto la sua
// cartella (test/aiuto.mjs, cartellaUsaEGetta) e' lavoro rimasto acceso oltre
// la prova, che scrive dove non c'e' piu' niente. Quella fa rosso il file.
const ZITTO = !!process.env.NODE_TEST_CONTEXT && process.env.LOG_COLLAUDO !== '1';
const RIGHE_TENUTE = 400;
const CASA = Symbol.for('socialbot.casa-della-prova');
const righe = [];
let tardive = 0;

export const righeDelCollaudo = () => righe.slice();

if (ZITTO) {
  process.on('exit', (codice) => {
    if (!codice || !righe.length) return;
    process.stderr.write(`\nUltime righe del registro di questa prova:\n${righe.slice(-30).join('\n')}\n`);
  });
}

function trattieni(riga) {
  righe.push(riga);
  if (righe.length > RIGHE_TENUTE) righe.splice(0, righe.length - RIGHE_TENUTE);
  const casa = globalThis[CASA];
  if (!casa?.tolta) return;
  process.exitCode = 1;
  if (++tardive <= 5) process.stderr.write(`Riga scritta dopo che la prova ha tolto la sua cartella (${casa.dir}): c'e' lavoro rimasto acceso.\n  ${riga}\n`);
}

function line(level, tag, args) {
  const head = `[${ts()}] ${level.padEnd(5)} ${tag ? '[' + tag + '] ' : ''}`;
  if (level === 'ERROR') {
    try { osservatorio.annota(tag || 'generale', testoDi(args)); } catch { /* mai per colpa del registro */ }
  }
  if (ZITTO) return trattieni(head + testoDi(args));
  if (level === 'ERROR') console.error(head, ...args);
  else console.log(head, ...args);
}

export function makeLog(tag = '') {
  return {
    info: (...a) => line('INFO', tag, a),
    warn: (...a) => line('WARN', tag, a),
    error: (...a) => line('ERROR', tag, a),
    debug: (...a) => { if (process.env.DEBUG) line('DEBUG', tag, a); },
  };
}

export const log = makeLog();
