// Cancello della SEPARAZIONE: chi decide non esegue.
//
// Perche' esiste. La regola e' architetturale, e le regole architetturali non
// si rompono con un errore: si rompono con una riga comoda. «Tanto qui l'helix
// ce l'ho gia' in mano, banno e via» — e da quel momento quella decisione non
// e' piu' provabile a vuoto, non si puo' disfare, non lascia scritto cosa si e'
// chiesto a Twitch, e se fallisce sparisce. Il tutto senza nessun sintomo: il
// ban esce lo stesso.
//
// Cosa misura, sul CODICE (commenti e stringhe tolti prima):
//   1. chi decide (antibot.js) non nomina nessuna azione punitiva di Twitch;
//   2. l'esecutore le nomina in UN punto solo, che e' il suo mestiere;
//   3. ogni azione dichiarata viene davvero gestita: nessuna azione muta, che
//      passerebbe per «fatta» senza fare niente;
//   4. l'esecutore non conosce lo scudo (niente anello fra i due).
//
// Cosa NON misura, ed e' voluto: che la prova a vuoto non tocchi davvero
// nessuno. Quella e' una proprieta' del COMPORTAMENTO, e leggerla nel testo del
// sorgente da' un verde che non vuol dire niente — basta un `&& false` e il
// codice non passa piu' di li' mentre il cancello continua a vedere la riga.
// Si prova eseguendola: test/unita/enforcement.test.mjs, «a vuoto si decide
// tutto e non si tocca nessuno», ed e' rossa se qualcuno la rompe.
//
// Uso: node scripts/verifica-separazione.mjs             (esce 1 se qualcosa non torna)
//      node scripts/verifica-separazione.mjs --selftest  (rompe una cosa per volta
//        e pretende il rosso)

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { senzaCommentiJs } from './_codice.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');

// Le azioni con cui si tocca una persona. Non si nominano fuori dall'esecutore.
const PUNITIVE = ['timeoutUser', 'bloccaUtente', 'deleteMessage'];

const ROTTURE = [
  ['src/features/antibot.js', '    if (cfg.azione === \'segnala\') {',
    '    if (cfg.azione === \'segnala\') { await this.helix?.timeoutUser?.(ch, userId, 0, motivo);',
    'chi decide si rimette a bannare da solo'],
  ['src/features/enforcement.js', '        case AZIONI.BLOCCA: {', '        case \'mai\': {',
    'un\'azione dichiarata non viene piu\' eseguita da nessuno'],
  ['src/features/enforcement.js', 'import { config } from \'../config.js\';',
    'import { config } from \'../config.js\';\nimport { registra } from \'./antibot.js\';',
    'l\'esecutore comincia a conoscere lo scudo'],
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
    const via = join(RAD, file);
    const orig = readFileSync(via, 'utf8');
    if (!orig.includes(da)) { console.log(`  ?  ${che}  → non so piu' come romperlo`); cieche++; continue; }
    writeFileSync(via, orig.replace(da, a));
    let rosso = false;
    try { execFileSync(process.execPath, [io], { cwd: RAD, stdio: 'pipe' }); } catch { rosso = true; }
    writeFileSync(via, orig);
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche
    ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: il cancello non protegge quello che dice di proteggere.`
    : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

const scudo = senzaCommentiJs(leggi('src/features/antibot.js'));
const esec = senzaCommentiJs(leggi('src/features/enforcement.js'));

// --- 1. chi decide non esegue -------------------------------------------
const dentroAlloScudo = PUNITIVE.filter((a) => scudo.includes(a));
dice(!dentroAlloScudo.length, 'chi decide non chiama nessuna azione punitiva di Twitch',
  `nello scudo compaiono ancora: ${dentroAlloScudo.join(', ')} — quelle decisioni non si possono provare a vuoto, ne' disfare, ne' riprendere`);

// --- 2. l'esecutore le chiama, e in un punto solo ------------------------
const corpo = esec.split('async _chiama(')[1] || '';
const finoAllaFine = corpo.split('\n  }')[0];
const fuoriDalPosto = PUNITIVE.filter((a) => (esec.split(a).length - 1) !== (finoAllaFine.split(a).length - 1));
dice(PUNITIVE.every((a) => finoAllaFine.includes(a)) && !fuoriDalPosto.length,
  'e l\'esecutore le chiama tutte, da un punto solo',
  fuoriDalPosto.length ? `sparse anche fuori da _chiama: ${fuoriDalPosto.join(', ')}` : 'qualcuna non viene chiamata da nessuno');

// --- 3. nessuna azione muta ---------------------------------------------
const dichiarate = [...esec.matchAll(/^\s*([A-Z]+):\s*'([a-z]+)',/gm)].map((m) => m[1]);
const attive = dichiarate.filter((n) => n !== 'NIENTE' && n !== 'OSSERVA');
const mute = attive.filter((n) => !finoAllaFine.includes('AZIONI.' + n));
dice(attive.length >= 5 && !mute.length,
  `ogni azione dichiarata viene davvero eseguita (${attive.length})`,
  mute.length ? `muta: ${mute.join(', ')} — passerebbe per «fatta» senza fare niente` : 'non trovo piu\' le azioni');

// --- 4. nessun anello ----------------------------------------------------
dice(!/from '\.\/antibot\.js'/.test(esec), 'l\'esecutore non conosce lo scudo',
  'i due moduli si terrebbero per mano e non si potrebbero piu\' sostituire uno per volta');

// --- esito ---------------------------------------------------------------
const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length
  ? `\n${rossi.length} ${rossi.length === 1 ? 'cosa non torna' : 'cose non tornano'}: chi decide ha ricominciato a eseguire, e non si vede da fuori.`
  : '\nChi decide non esegue. Le due cose stanno in due posti. ✓');
process.exit(rossi.length ? 1 : 0);
