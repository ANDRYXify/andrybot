// Cancello del MODO: come il bot sta in chat, e la catena che ci arriva.
//
// Perche' esiste. Il modo si regge su una catena lunga, e ogni anello sta in un
// file diverso: il distintivo nasce in un tag IRC, passa dal gestore dei
// messaggi, attraversa il cervello Node, viaggia nel corpo di una richiesta
// HTTP e alla fine diventa una riga di prompt in Python. Una catena cosi' non
// si rompe con un errore: si rompe con un RINOMINO. Qualcuno chiama «primo»
// una cosa che dall'altra parte si chiama «prima», e da quel momento chi scrive
// per la prima volta non riceve piu' il benvenuto — senza che niente si
// accorga di niente, perche' la risposta esce lo stesso.
//
// Cosa misura:
//   1. i distintivi di qua sono quattro (il confronto coi nomi che il cervello
//      capisce lo fa il cancello omonimo nel repository del cervello);
//   2. ogni domanda che il bot fa al cervello per la chat pubblica porta il ruolo;
//   3. il ruolo entra davvero nel corpo della richiesta;
//   5. l'attesa prima di parlare legge il ritmo della chat, non solo la lunghezza;
//   6. l'id del messaggio arriva fino alla voce di ogni piattaforma;
//   7. nel ruolo non entra l'amicizia: il bot del canale non ricorda nessuno.
//
// Uso: node scripts/verifica-modo.mjs             (esce 1 se qualcosa non torna)
//      node scripts/verifica-modo.mjs --selftest  (rompe una cosa per volta e
//        pretende che il cancello diventi rosso)

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { senzaCommentiJs } from './_codice.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');

// --- l'autoprova: rompere apposta ---------------------------------------
const ROTTURE = [
  ['src/features/handler.js', '    primo: !!msg.isFirst,', '    prima: !!msg.isFirst,',
    'un distintivo cambia nome solo da un lato'],
  ['src/ai/brain.js', '          ruolo,   // i distintivi', '          // ruolo,   // i distintivi',
    'una domanda alla chat pubblica parte senza sapere chi ha scritto'],
  ['src/ai/brainpy.js', 'ruolo: ruolo || undefined,', '',
    'il ruolo non entra nel corpo della richiesta'],
  ['src/features/handler.js', 'const ritmo = memory.messageRate?.(channel) || 0;', 'const ritmo = 0;',
    'l\'attesa torna cieca al ritmo della chat'],
  ['src/features/handler.js', 'chat.say(channel, risposta, { rispondiA: msg.id });', 'chat.say(channel, risposta);',
    'la risposta non si aggancia piu\' alla domanda'],
  ['src/bot.js', 'return (t, o) => this.say(msg.channel, t, o);', 'return (t) => this.say(msg.channel, t);',
    'la voce di una piattaforma perde per strada l\'id'],
  ['src/features/handler.js', '    primo: !!msg.isFirst,', '    primo: !!msg.isFirst,\n    caro: persona.amicizia(msg.user).livello,',
    'nel ruolo rientra la memoria di chi ha davanti'],
  ['src/ai/brain.js', '        iniziativa: true,', '', 'parla da solo senza sapere che sta partendo lui'],
  ['src/ai/brainpy.js', 'iniziativa: iniziativa || undefined,', '', "l'iniziativa non arriva al cervello"],
  ['src/bot.js', 'this.brain?.iniziativa?.(login)', 'this.brain?.nonEsiste?.(login)',
    'il battito torna a non passare dal cervello'],
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

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

const handler = leggi('src/features/handler.js');
const handlerNudo = senzaCommentiJs(handler);
const brain = senzaCommentiJs(leggi('src/ai/brain.js'));
const brainpy = senzaCommentiJs(leggi('src/ai/brainpy.js'));
const botJs = senzaCommentiJs(leggi('src/bot.js'));

// --- 2. ogni domanda della chat pubblica porta il ruolo ------------------
// Si leggono le chiamate vere, non una parola cercata nel file: un `ruolo` che
// sta in una chiamata e manca in un'altra passerebbe per una ricerca di testo.
function chiamate(codice, apertura) {
  const fuori = [];
  let i = codice.indexOf(apertura);
  while (i !== -1) {
    let liv = 0, j = i + apertura.length - 1;
    for (; j < codice.length; j++) {
      if (codice[j] === '{') liv++;
      else if (codice[j] === '}') { liv--; if (!liv) break; }
    }
    fuori.push(codice.slice(i, j + 1));
    i = codice.indexOf(apertura, j);
  }
  return fuori;
}
const daBot = chiamate(brain, 'brainpy.rispondi({').filter((c) => /via:\s*'bot'/.test(c) && !/compito:/.test(c));
// L'iniziativa non risponde a nessuno: nessuno «gli ha scritto», e un blocco
// intitolato cosi' direbbe una cosa falsa al modello.
const pubbliche = daBot.filter((c) => !/iniziativa:/.test(c));
const spontanee = daBot.filter((c) => /iniziativa:\s*true/.test(c));
const senzaRuolo = pubbliche.filter((c) => !/\bruolo\b/.test(c));
dice(pubbliche.length >= 3 && !senzaRuolo.length,
  `le domande della chat pubblica sanno chi ha scritto (${pubbliche.length - senzaRuolo.length}/${pubbliche.length})`,
  senzaRuolo.length ? `${senzaRuolo.length} partono al buio` : 'non trovo piu\' le chiamate della chat pubblica');

// --- 3. il ruolo entra nel corpo della richiesta -------------------------
const corpoHttp = (brainpy.split('body: JSON.stringify({')[1] || '').split('}),')[0];
dice(/\bruolo\b/.test(corpoHttp), 'e il ruolo viaggia davvero nel corpo della richiesta',
  'resta nella firma della funzione e non parte: il cervello non lo vedra\' mai');

// --- 3bis. quando parte lui, sa di cosa parla ---------------------------
// Il difetto da cui nasce: la riga d'iniziativa usciva da un elenco di frasi
// scritte a mano, pescate a caso, buone per qualunque chat — cioe' per nessuna.
dice(spontanee.length === 1, 'quando parte lui, guarda la chat prima di parlare',
  spontanee.length ? 'ci sono piu\' strade per parlare da solo: una prima o poi divergera\''
    : 'nessuna: la riga d\'iniziativa non passa piu\' dal cervello');
dice(/\biniziativa\b/.test(corpoHttp), 'e l\'iniziativa viaggia nel corpo della richiesta',
  'il cervello non sapra\' mai che nessuno gli ha chiesto niente');
dice(/this\.brain\.iniziativa\(login, \{ spunto \}\)/.test(botJs), 'ed e\' il bot a chiederglielo, dai momenti e con il motivo',
  'la riga d\'iniziativa non passa dal cervello con lo spunto: torna a uscire da un elenco, o parte senza motivo');
dice(!/proattiva|PROATTIVE/.test(senzaCommentiJs(leggi('src/ai/persona.js'))),
  'e l\'elenco di frasi buone per qualunque chat non esiste piu\'',
  'finche\' c\'e\', prima o poi qualcuno ci ricasca');
// --- 1. i distintivi, di qua ---------------------------------------------
// Il confronto coi nomi che il cervello capisce lo fa il cancello omonimo nel
// repository del cervello, leggendo QUESTO file: qui si tiene ferma la meta' di
// qua — quattro distintivi, e dentro al ruolo solo cio' che sta NEL messaggio.
const corpoRuolo = (handlerNudo.split('function ruoloDi(msg) {')[1] || '').split('\n}')[0];
const diQua = [...corpoRuolo.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]).sort();
dice(diQua.length === 4, `i distintivi sono quattro (${diQua.join(', ')})`,
  `ne trovo ${diQua.length}: il cervello ne capisce quattro, quelli spaiati non arrivano`);
dice(!/amicizia|persona\./.test(corpoRuolo),
  'nel ruolo entra solo cio\' che sta NEL messaggio: il bot non ricorda nessuno',
  'l\'affinita\' fra canali sarebbe memoria di una persona');

// --- 5. l'attesa legge il ritmo della stanza ----------------------------
dice(/messageRate\?\.\(channel\)/.test(handlerNudo) && /attesaUmana\([^)]*\britmo\b/.test(handlerNudo),
  'l\'attesa prima di parlare guarda quanto corre la chat, non solo la frase',
  'in una chat a sessanta messaggi al minuto la risposta arriva venti messaggi dopo');

// --- 6. l'id arriva fino alla voce di ogni piattaforma ------------------
dice(/chat\.say\(channel, risposta, \{ rispondiA: msg\.id \}\)/.test(handlerNudo),
  'la risposta parte agganciata al messaggio a cui risponde',
  'l\'id ce l\'abbiamo in mano dal primo istante e lo buttiamo');
// Qui la domanda e' se l'id ARRIVA, non come e' scritta la riga che lo porta.
// Contare `return (t, o) =>` in tutto il file misurava la forma: bastava avvolgere
// le voci per un'altra ragione — l'accordo di genere — e il cancello diventava
// rosso mentre l'id passava benissimo. Ora si guarda DENTRO vocePer, e si chiede
// la cosa vera: che ogni voce prenda due argomenti e RIPASSI il secondo. Una voce
// che accetta solo il testo non ha modo di far comparire quella `o` finale.
const corpoVoce = (() => {
  const i = botJs.indexOf('vocePer(msg) {');
  return i < 0 ? '' : botJs.slice(i, botJs.indexOf('\n  }', i));
})();
// E si guarda RAMO PER RAMO, non quante volte compare la forma giusta nel
// mucchio: con un totale, una voce rotta si nasconde dietro le altre due che
// stanno bene. Provato: rompendo la voce di Kick, il conteggio restava a tre.
const rami = [...corpoVoce.matchAll(/return ([^;]+);/g)].map((m) => m[1]);
const rotte = rami.filter((r) => !/\(t, o\) =>[^\n]*\bo\s*\)/.test(r));
dice(rami.length >= 3 && rotte.length === 0,
  `nessuna piattaforma perde l'id per strada (${rami.length} voci)`,
  rotte.length ? `questa voce non ripassa l'id: ${rotte[0].slice(0, 80)}` : 'manca la voce di una piattaforma');
dice(/say\(_canale, testo, \{ rispondiA/.test(senzaCommentiJs(leggi('src/kick/voce.js'))),
  'e su Kick il filo della risposta esiste davvero', 'la voce di Kick butta via l\'id che l\'API sa usare');

// --- esito --------------------------------------------------------------
const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length
  ? `\n${rossi.length} ${rossi.length === 1 ? 'anello rotto' : 'anelli rotti'}: il modo si perde per strada, e in silenzio.`
  : '\nLa catena tiene: chi ha scritto arriva fino al prompt. ✓');
process.exit(rossi.length ? 1 : 0);
