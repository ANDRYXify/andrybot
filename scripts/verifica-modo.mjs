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
//   1. i nomi dei distintivi sono gli STESSI di qua e di la' (handler.js ↔ assistente.py);
//   2. ogni domanda che il bot fa al cervello per la chat pubblica porta il ruolo;
//   3. il ruolo entra davvero nel corpo della richiesta;
//   4. in Python il blocco esce quando c'e' un distintivo, non esce quando non
//      ce n'e' nessuno, e il divieto («non elencarli, non trattarlo meglio»)
//      viaggia attaccato al blocco, non tre sezioni piu' in la';
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
  ['brain/assistente.py', '    ("vip", "e\' un VIP del canale"),', '',
    'il Python smette di conoscere un distintivo'],
  ['src/ai/brain.js', '          ruolo,   // i distintivi', '          // ruolo,   // i distintivi',
    'una domanda alla chat pubblica parte senza sapere chi ha scritto'],
  ['src/ai/brainpy.js', 'ruolo: ruolo || undefined,', '',
    'il ruolo non entra nel corpo della richiesta'],
  ['brain/assistente.py', '    p.append(_righe("CHI TI HA SCRITTO', '    p.append(_righe("_SPENTO_',
    'il blocco non arriva piu\' nel prompt'],
  ['brain/assistente.py', 'serve al MODO: non elencare i suoi ruoli', 'serve al modo',
    'il divieto si stacca dal blocco che lo riguarda'],
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
  ['brain/assistente.py', '    if iniziativa:\n        p.append(INIZIATIVA)', '    p.append(INIZIATIVA)',
    'il permesso di partire per primo resta acceso sempre'],
  ['brain/assistente.py', '        p.append(INIZIATIVA)\n', '        p.append(INIZIATIVA)\n    p.append(_righe("IN CODA", ["una cosa nuova"], 1))\n',
    "un blocco nuovo spinge giu' l'istruzione dell'iniziativa"],
  ['brain/assistente.py', '    if out and d.get("iniziativa") and _NIENTE.match(out):\n        out = ""\n', '',
    'il «non ho niente da dire» esce lo stesso in chat'],
  ['brain/server.py', 'not d.get("iniziativa") and ', '', "un'iniziativa a vuoto diventa una lacuna di Lei"],
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
dice(/iniziativa\?\.\(login\)/.test(botJs), 'ed e\' il battito del bot a chiederglielo',
  'la riga d\'iniziativa non passa dal cervello: torna a uscire da un elenco');
dice(!/proattiva|PROATTIVE/.test(senzaCommentiJs(leggi('src/ai/persona.js'))),
  'e l\'elenco di frasi buone per qualunque chat non esiste piu\'',
  'finche\' c\'e\', prima o poi qualcuno ci ricasca');
dice(/not d\.get\("iniziativa"\)/.test(leggi('brain/server.py')),
  'un\'iniziativa a vuoto non diventa una lacuna di Lei',
  '«non avevo niente da dire» finirebbe fra le cose che Lei deve studiare');

// --- 1. gli stessi nomi di qua e di la', e una riga di prompt in Python --
// I nomi non si leggono col naso in due file: si chiedono a chi li usa. Un
// elenco ricavato a occhio da un sorgente e' una terza copia che puo' divergere
// come le altre due.
const py = process.env.PYTHON || 'python3';
const prova = `
import json, sys
sys.path.insert(0, "brain")
import assistente as A
acceso = A._sistema("Bot", "canale", "scherzoso", "In live", None, None, None, [], None, None,
                    {"mod": True, "primo": True})
spento = A._sistema("Bot", "canale", "scherzoso", "In live", None, None, None, [], None, None, None)
vuoto = A._sistema("Bot", "canale", "scherzoso", "In live", None, None, None, [], None, None,
                   {"mod": False, "sub": False, "vip": False, "primo": False})
parte = A._sistema("Bot", "canale", "scherzoso", "In live", None, None, None, [], None, None, None, True)
titolo = [r for r in acceso.split("\\n") if "CHI TI HA SCRITTO" in r]
# Il silenzio si misura sulla risposta vera, non sulla regola che lo decide:
# una regola giusta scollegata dalla funzione lascerebbe passare tutto.
A.genera._completa = lambda *a, **k: "NIENTE"
tace = A.rispondi({"testo": "ciao", "canale": "c", "iniziativa": True}) is None
A.genera._completa = lambda *a, **k: "eh ma quel boss le prende sempre"
parla = bool(A.rispondi({"testo": "ciao", "canale": "c", "iniziativa": True}))
print(json.dumps({
    "nomi": sorted(c for c, _ in A.RUOLI),
    "acceso": [r for r in acceso.split("\\n") if r.startswith("- ") and ("moderatore" in r or "prima volta" in r)],
    "spento": "CHI TI HA SCRITTO" in spento,
    "vuoto": "CHI TI HA SCRITTO" in vuoto,
    "titolo": titolo[0] if titolo else "",
    "iniziativa": "PARTI TU" in parte and "PARTI TU" not in spento,
    "ultima": parte.strip().split("\\n")[-1].strip()[:60],
    "tace": tace, "parla": parla,
}))
`;
let esito = null;
try { esito = JSON.parse(execFileSync(py, ['-c', prova], { cwd: RAD, encoding: 'utf8' })); }
catch (e) { dice(false, 'il bot del canale si esegue', String(e.message || e).slice(0, 200)); }
if (esito) {
  const corpoRuolo = (handlerNudo.split('function ruoloDi(msg) {')[1] || '').split('\n}')[0];
  const diQua = [...corpoRuolo.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]).sort();
  dice(diQua.length === 4 && JSON.stringify(diQua) === JSON.stringify(esito.nomi),
    `i distintivi si chiamano allo stesso modo di qua e di la' (${diQua.join(', ')})`,
    `il gestore dice [${diQua.join(', ')}], il cervello capisce [${esito.nomi.join(', ')}]: quelli spaiati non arrivano`);
  dice(!/amicizia|persona\./.test(corpoRuolo),
    'nel ruolo entra solo cio\' che sta NEL messaggio: il bot non ricorda nessuno',
    'l\'affinita\' fra canali sarebbe memoria di una persona (docs/BOT-E-LIA.md)');
  dice(esito.acceso.length === 2, 'i distintivi accesi diventano righe di prompt',
    `nel prompt ne arrivano ${esito.acceso.length} su 2`);
  dice(!esito.spento && !esito.vuoto, 'chi non ha distintivi non si porta dietro un blocco vuoto',
    'una riga di prompt spesa per dire «niente»: il modello prova a riempirla lui');
  dice(esito.iniziativa, 'quando parte lui, il prompt glielo dice — e solo allora',
    'il permesso di partire per primo o non arriva, o resta acceso sempre');
  dice(/qualunque chat|farsi sentire|presentarti/.test(esito.ultima),
    'e l\'istruzione sta in fondo, dove un modello piccolo la legge davvero',
    `in fondo al prompt c'e' altro: «${esito.ultima}»`);
  dice(esito.tace && esito.parla, 'se non ha niente da dire tace, e se ce l\'ha parla',
    esito.tace ? 'tace sempre: la riga d\'iniziativa non uscirebbe mai'
      : 'un «non ho niente da dire» finirebbe scritto in chat, che era il difetto di partenza');
  dice(/non elencare i suoi ruoli/.test(esito.titolo) && /non trattarlo meglio/.test(esito.titolo),
    'e il divieto viaggia attaccato al blocco, non tre sezioni piu\' in la\'',
    'un modello piccolo che legge «e\' un moderatore» lontano dalla regola, ci fa caso lo stesso');
}

// --- 5. l'attesa legge il ritmo della stanza ----------------------------
dice(/messageRate\?\.\(channel\)/.test(handlerNudo) && /attesaUmana\([^)]*\britmo\b/.test(handlerNudo),
  'l\'attesa prima di parlare guarda quanto corre la chat, non solo la frase',
  'in una chat a sessanta messaggi al minuto la risposta arriva venti messaggi dopo');

// --- 6. l'id arriva fino alla voce di ogni piattaforma ------------------
dice(/chat\.say\(channel, risposta, \{ rispondiA: msg\.id \}\)/.test(handlerNudo),
  'la risposta parte agganciata al messaggio a cui risponde',
  'l\'id ce l\'abbiamo in mano dal primo istante e lo buttiamo');
const voci = [...botJs.matchAll(/return \(t, o\) =>/g)].length;
dice(voci >= 3, `nessuna piattaforma perde l'id per strada (${voci} voci)`,
  'una voce accetta solo il testo: su quella piattaforma il filo si spezza qui');
dice(/say\(_canale, testo, \{ rispondiA/.test(senzaCommentiJs(leggi('src/kick/voce.js'))),
  'e su Kick il filo della risposta esiste davvero', 'la voce di Kick butta via l\'id che l\'API sa usare');

// --- esito --------------------------------------------------------------
const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length
  ? `\n${rossi.length} ${rossi.length === 1 ? 'anello rotto' : 'anelli rotti'}: il modo si perde per strada, e in silenzio.`
  : '\nLa catena tiene: chi ha scritto arriva fino al prompt. ✓');
process.exit(rossi.length ? 1 : 0);
