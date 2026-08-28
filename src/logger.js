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

function line(level, tag, args) {
  const head = `[${ts()}] ${level.padEnd(5)} ${tag ? '[' + tag + '] ' : ''}`;
  if (level === 'ERROR') {
    try { osservatorio.annota(tag || 'generale', testoDi(args)); } catch { /* mai per colpa del registro */ }
    console.error(head, ...args);
  } else console.log(head, ...args);
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
