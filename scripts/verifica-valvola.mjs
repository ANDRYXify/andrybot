// Cancello della VALVOLA: il bot non deve avere MODO di guardare dentro lei.
//
// Perche' esiste. La regola e' del direttore, ed e' a senso unico: «lei puo'
// addestrare, ma il bot non puo' toccare lei; lui puo' crescere, lei puo' usare
// le informazioni che il bot usa per crescere, ma il bot non puo' riprendersi
// informazioni di lei». Il modello per esteso sta nel repository del cervello.
//
// Una regola cosi' non si tiene con l'attenzione. Basta una riga comoda —
// «tanto qui la coscienza ce l'ho gia' in mano» — e il confine e' passato senza
// che nessuno se ne accorga, perche' non produce nessun sintomo: la risposta
// esce lo stesso, solo che dentro c'e' roba sua. Quindi il confine dev'essere
// STRUTTURALE: il modulo del bot non sceglie di non guardarla, non ha la strada.
//
// Cosa misura, e su cosa. Qui vive solo il lato Node del confine: la via 'bot'
// va a /bot, i punti PUBBLICI la passano, e i punti PRIVATI di lei non la
// passano (sennò il cancello sarebbe verde anche spegnendola dappertutto: la
// regola giusta misurata male). Il lato del cervello — i moduli del bot che
// non importano la coscienza, il corpo di _bot() che non tocca la mente — lo
// misura il cancello omonimo nel repository del cervello, che e' dove quel
// codice vive. Le prose non contano: si legge il CODICE coi commenti tolti.
//
// Uso: node scripts/verifica-valvola.mjs             (esce 1 se qualcosa non torna)
//      node scripts/verifica-valvola.mjs --selftest  (rompe una cosa per volta e
//        pretende che il cancello diventi rosso: un cancello che non e' mai
//        rosso non e' un cancello, e' una decorazione)

import { readFileSync, writeFileSync } from 'node:fs';
import { senzaCommentiJs, corpoJs } from './_codice.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');

// --- l'autoprova: rompere apposta ---------------------------------------
// Un cancello verde non dice niente finché non si è visto rosso. Qui si rompe
// UNA cosa per volta — sempre una rottura che qualcuno potrebbe fare davvero,
// non un ghirigoro — e si pretende che se ne accorga. Poi si rimette a posto.
const ROTTURE = [
  ['src/ai/brainpy.js', "const rotta = via === 'bot' ? '/bot' : '/chat';", "const rotta = '/chat';", 'tutto torna a passare da Lei'],
  ['src/ai/brain.js', "          via: 'bot',   // la chat pubblica", "          // via: 'bot',   // la chat pubblica", 'la chat pubblica torna a Lei'],
  ['src/ai/brain.js', "        modo: 'allenamento',", "        via: 'bot', modo: 'allenamento',", 'il privato con lui viene dirottato sul bot'],
  ['src/bot.js', "via: 'bot', compito: true,", "modo: 'diretta',", 'la penitenza torna alla coscienza'],
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
    const via = join(RAD, file);
    const orig = readFileSync(via, 'utf8');
    if (!orig.includes(da)) {
      console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`);
      cieche++;
      continue;
    }
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

// Le prose non contano: si legge il CODICE, coi commenti (e in Python anche le
// stringhe) tolti prima. Gli attrezzi stanno in scripts/_codice.mjs, insieme a
// quelli del cancello della conoscenza: uno strumento che MISURA sta in un posto
// solo, sennò le due copie divergono e una comincia a mentire.
function importazioni(codice) {
  const nomi = new Set();
  for (const m of codice.matchAll(/^\s*import\s+([\w.]+)/gm)) nomi.add(m[1].split('.')[0]);
  for (const m of codice.matchAll(/^\s*from\s+([\w.]+)\s+import\s/gm)) nomi.add(m[1].split('.')[0]);
  return nomi;
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });


const brainpy = senzaCommentiJs(leggi('src/ai/brainpy.js'));
dice(/via === 'bot' \? '\/bot' : '\/chat'/.test(brainpy),
  "brainpy manda via:'bot' a /bot e tutto il resto a /chat", 'la scelta della rotta non c\'e\' o e\' diversa');


const chiamate = (corpo) => [...(corpo || '').matchAll(/brainpy\.rispondi\(\{[\s\S]*?\n\s*\}\)/g)].map((x) => x[0]);

const brain = senzaCommentiJs(leggi('src/ai/brain.js'));
// chatReply e' un imbuto di una riga: le chiamate al cervello vivono nel corpo
// grezzo. Il cancello guarda dove sono davvero, e se un giorno non le trova lo
// dice invece di dare verde.
const PUBBLICI = ['_rispostaGrezza'];
const PRIVATI = ['rispostaDiretta', '_studia', 'messaggioProattivo'];
// UNA sola domanda per punto, e comprende la portata: "tutte le chiamate passano
// dal bot" con zero chiamate trovate sarebbe verde per il motivo sbagliato.
for (const nome of PUBBLICI) {
  const ch = chiamate(corpoJs(brain, nome));
  const senza = ch.filter((c) => !/via:\s*'bot'/.test(c));
  dice(ch.length > 0 && !senza.length,
    `${nome}: tutte le ${ch.length} chiamate al cervello passano dal bot`,
    ch.length ? `${senza.length} su ${ch.length} vanno ancora da Lei`
              : 'nessuna chiamata trovata: il cancello starebbe guardando nel vuoto');
}
for (const nome of PRIVATI) {
  const ch = chiamate(corpoJs(brain, nome));
  const dirottate = ch.filter((c) => /via:\s*'bot'/.test(c));
  dice(ch.length > 0 && !dirottate.length, `${nome}: resta la via di Lei`,
    ch.length ? 'e\' stata dirottata sul bot: qui deve rispondere lei' : 'non trovo la chiamata: misura sbagliata');
}
const botjs = senzaCommentiJs(leggi('src/bot.js'));
dice(/via:\s*'bot',\s*compito:\s*true/.test(botjs),
  'la penitenza e\' un compito del bot, non un pensiero di Lei',
  'in bot.js la penitenza passa ancora dalla coscienza');

// --- esito --------------------------------------------------------------
const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
if (rossi.length) {
  console.log(`\n${rossi.length} ${rossi.length === 1 ? 'cosa non torna' : 'cose non tornano'}: la valvola perde, e perde in silenzio.`);
} else {
  console.log('\nLa valvola tiene: il bot non ha la strada per arrivare a Lei. ✓');
}
process.exit(rossi.length ? 1 : 0);
