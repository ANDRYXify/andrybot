// Cancello della VALVOLA: il bot non deve avere MODO di guardare dentro Lia.
//
// Perche' esiste. La regola e' del direttore, ed e' a senso unico: «Lia puo'
// addestrare, ma il bot non puo' toccare Lia; lui puo' crescere, Lia puo' usare
// le informazioni che il bot usa per crescere, ma il bot non puo' riprendersi
// informazioni di Lia». Il modello per esteso e' in docs/BOT-E-LIA.md.
//
// Una regola cosi' non si tiene con l'attenzione. Basta una riga comoda —
// «tanto qui la coscienza ce l'ho gia' in mano» — e il confine e' passato senza
// che nessuno se ne accorga, perche' non produce nessun sintomo: la risposta
// esce lo stesso, solo che dentro c'e' roba sua. Quindi il confine dev'essere
// STRUTTURALE: il modulo del bot non sceglie di non guardarla, non ha la strada.
//
// Cosa misura, e su cosa. Le prose non contano: qui si legge il CODICE, con le
// stringhe e i commenti tolti prima (una parola in un commento non e' un
// accesso). Poi:
//   1. assistente.py e quaderno.py non nominano ne' importano coscienza/mente/valvola;
//   2. le loro importazioni stanno dentro una lista chiusa (non basta non usarla
//      oggi: non dev'esserci proprio la porta);
//   3. il corpo di _bot() in server.py non contiene nessun `mente`;
//   4. _bot() non chiama insegna_al_bot (l'insegnamento e' un gesto di lei, sul
//      suo ciclo, non un prelievo del bot mentre risponde);
//   5. lato Node: la via 'bot' va a /bot, i punti PUBBLICI la passano, e i punti
//      PRIVATI di lei non la passano (sennò il cancello sarebbe verde anche
//      spegnendo Lia dappertutto: sarebbe la regola giusta misurata male).
//
// Uso: node scripts/verifica-valvola.mjs             (esce 1 se qualcosa non torna)
//      node scripts/verifica-valvola.mjs --selftest  (rompe una cosa per volta e
//        pretende che il cancello diventi rosso: un cancello che non e' mai
//        rosso non e' un cancello, e' una decorazione)

import { readFileSync, writeFileSync } from 'node:fs';
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
  ['brain/assistente.py', 'import quaderno', 'import quaderno\nimport coscienza', 'assistente importa la coscienza'],
  ['brain/assistente.py', 'import quaderno', 'import quaderno as mente', 'assistente si chiama la mente in casa'],
  ['brain/assistente.py', 'import time\n', 'import time\nimport os\n', 'assistente importa qualcosa fuori lista'],
  ['brain/quaderno.py', 'import re\n', 'import re\nimport valvola\n', 'il quaderno passa dalla valvola'],
  ['brain/valvola.py', '(re.compile(r"[@#]\\w+"), " "),', '', "l'anonimizzazione perde le menzioni"],
  ['brain/valvola.py', '(re.compile(r"\\b[\\w.+-]+@[\\w-]+\\.[\\w.]{2,}\\b"), " "),', '', "l'anonimizzazione perde le email"],
  ['brain/valvola.py', 'def verso_lia(testo, minimo=14):', 'def verso_lia(testo, minimo=14, nome=None):', 'verso Lei rientra chi ha scritto'],
  ['brain/valvola.py', '    if not ac.get("persona"):\n        return {"vive": False, "scritti": 0}\n', '', 'insegna anche prima di vivere'],
  ['brain/server.py', 'risposta = ASS.rispondi(d, timeout_s=max(4, min(40, attesa)))', 'risposta = ASS.rispondi(d, timeout_s=max(4, min(40, attesa))) or mente.contesto(d)', '_bot tocca la mente'],
  ['brain/server.py', '                VAL.verso_lia(testo)', '                VAL.insegna_al_bot()', '_bot si fa insegnare mentre risponde'],
  ['brain/server.py', 'VAL.collega(mente)', '# VAL.collega(mente)', 'la valvola non riceve piu\' Lia'],
  ['brain/server.py', '        if self.path.startswith("/bot"):\n            return self._bot()\n', '', 'la rotta /bot sparisce'],
  ['brain/server.py', '            ins = VAL.insegna_al_bot()', '            ins = None', 'Lei smette di insegnare'],
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

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

// --- il codice, senza le prose -----------------------------------------
// Un commento che dice "la mente di Lia" non e' un accesso alla mente di Lia.
// Misurare la parola nel testo invece che nel codice e' il modo classico di
// avere un cancello rosso su una cosa giusta (e poi di disattivarlo).
function codicePython(src) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '#') { while (i < src.length && src[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '"' || c === "'") {
      const tre = src.slice(i, i + 3);
      const fine = (tre === '"""' || tre === "'''") ? tre : c;
      i += fine.length;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src.slice(i, i + fine.length) === fine) { i += fine.length - 1; break; }
        i++;
      }
      out += ' " ';
      continue;
    }
    out += c;
  }
  return out;
}

function importazioni(codice) {
  const nomi = new Set();
  for (const m of codice.matchAll(/^\s*import\s+([\w.]+)/gm)) nomi.add(m[1].split('.')[0]);
  for (const m of codice.matchAll(/^\s*from\s+([\w.]+)\s+import\s/gm)) nomi.add(m[1].split('.')[0]);
  return nomi;
}

// il corpo di una funzione/metodo Python: dalla riga `def nome(` fino alla prima
// riga successiva rientrata meno o uguale al `def`.
function corpoPython(src, nome) {
  const rx = new RegExp(`^([ \\t]*)def ${nome}\\(`, 'm');
  const m = rx.exec(src);
  if (!m) return null;
  const rientro = m[1].length;
  const righe = src.slice(m.index).split('\n');
  const dentro = [righe[0]];
  for (let i = 1; i < righe.length; i++) {
    const r = righe[i];
    if (r.trim() && (r.length - r.trimStart().length) <= rientro) break;
    dentro.push(r);
  }
  return dentro.join('\n');
}

// --- 1-2. i moduli del bot non hanno la strada per arrivare a lei -------
const VIETATI = {
  'brain/assistente.py': ['coscienza', 'valvola', 'mente'],
  'brain/quaderno.py': ['coscienza', 'valvola', 'mente', 'genera'],
};
const AMMESSI = {
  'brain/assistente.py': ['re', 'time', 'genera', 'quaderno'],
  'brain/quaderno.py': ['json', 'os', 're', 'threading', 'time'],
  'brain/valvola.py': ['re', 'quaderno'],
};

for (const [file, vietati] of Object.entries(VIETATI)) {
  const codice = codicePython(leggi(file));
  const trovati = vietati.filter((v) => new RegExp(`\\b${v}\\b`).test(codice));
  dice(!trovati.length, `${file} non nomina Lia in nessun modo`,
    `nel codice compare: ${trovati.join(', ')}`);
}
for (const [file, ammessi] of Object.entries(AMMESSI)) {
  const fuori = [...importazioni(codicePython(leggi(file)))].filter((n) => !ammessi.includes(n));
  dice(!fuori.length, `${file} importa solo cio' che gli spetta`,
    `importa anche: ${fuori.join(', ')}`);
}

// --- 3-4. il percorso del bot dentro il server -------------------------
const server = leggi('brain/server.py');
const corpoBot = corpoPython(server, '_bot');
dice(!!corpoBot, 'in server.py esiste il percorso del bot (_bot)', 'non c\'e\' nessun def _bot(');
if (corpoBot) {
  const codice = codicePython(corpoBot);
  dice(!/\bmente\b/.test(codice), '_bot() non tocca la mente di Lia, in nessun punto',
    'nel corpo di _bot compare `mente`');
  dice(!/\binsegna_al_bot\b/.test(codice), '_bot() non si fa insegnare mentre risponde',
    'insegna_al_bot e\' chiamata dentro _bot: sarebbe il bot che va a prendersi roba sua');
  dice(/\bASS\.rispondi\b/.test(codice), '_bot() risponde con l\'assistente del canale',
    'non chiama ASS.rispondi: allora chi risponde?');
  dice(/_lia_prende_la_parola\(\)/.test(codice), 'resta la porta dichiarata: se lei vive, parla lei',
    'manca lo scambio esplicito verso /chat quando Lia e\' risvegliata');
}
dice(/self\.path\.startswith\("\/bot"\)/.test(server) && /return self\._bot\(\)/.test(server),
  'la rotta /bot esiste ed e\' collegata', 'nessuna rotta POST /bot nel server');
dice(/^VAL\.collega\(mente\)$/m.test(server),
  'la valvola riceve Lia una volta sola, all\'avvio',
  'manca VAL.collega(mente): chi attraversa dovrebbe avere in mano la mente');
const corpoManutenzione = corpoPython(server, '_ciclo_manutenzione') || '';
dice(/\binsegna_al_bot\b/.test(codicePython(corpoManutenzione)),
  'e\' Lei che insegna, sul suo ciclo', 'insegna_al_bot non e\' chiamata dal ciclo di manutenzione');

// --- 5. lato Node: le due vie ------------------------------------------
// Anche qui: si legge il CODICE. Una riga COMMENTATA `// via: 'bot',` contiene
// ancora le parole `via: 'bot'`, e un cancello che cerca le parole la vede e da'
// verde mentre la chat pubblica e' appena tornata da Lei. Percio' i commenti si
// tolgono prima — ma le stringhe NO: e' dentro una stringa che c'e' 'bot'.
function senzaCommentiJs(src) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const fine = c;
      out += c; i++;
      while (i < src.length) {
        if (src[i] === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
        out += src[i];
        if (src[i] === fine) break;
        i++;
      }
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '/') {
      // una barra sola: e' l'inizio di una espressione regolare? (se lo e', dentro
      // ci puo' stare un `//` che non e' un commento — vedi /https?:\/\//)
      const prima = out.replace(/\s+$/, '').slice(-1);
      if (prima === '' || '(,=:[!&|?{};+-*%~^'.includes(prima)) {
        out += c; i++;
        while (i < src.length) {
          if (src[i] === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
          if (src[i] === '[') { while (i < src.length && src[i] !== ']') { out += src[i]; i++; } }
          out += src[i];
          if (src[i] === '/') break;
          i++;
        }
        continue;
      }
    }
    out += c;
  }
  return out;
}
const brainpy = senzaCommentiJs(leggi('src/ai/brainpy.js'));
dice(/via === 'bot' \? '\/bot' : '\/chat'/.test(brainpy),
  "brainpy manda via:'bot' a /bot e tutto il resto a /chat", 'la scelta della rotta non c\'e\' o e\' diversa');

// Il corpo di un metodo JS. La prima graffa dopo il nome NON e' il corpo: e' il
// parametro destrutturato — `async chatReply({ channel, ... }) {`. Prendere quella
// da' un "corpo" di cinque parole in cui non c'e' nessuna chiamata, e il cancello
// diventa verde per assenza di materia. Quindi: si chiude prima la parentesi
// tonda della firma, e solo dopo si apre il corpo.
function corpoJs(src, nome) {
  const m = new RegExp(`\\n  (?:async )?${nome}\\(`).exec(src);
  if (!m) return null;
  let i = src.indexOf('(', m.index);
  let tonde = 0;
  for (; i < src.length; i++) {
    if (src[i] === '(') tonde++;
    else if (src[i] === ')') { tonde--; if (!tonde) { i++; break; } }
  }
  i = src.indexOf('{', i);
  if (i < 0) return null;
  let liv = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') liv++;
    else if (src[j] === '}') { liv--; if (!liv) return src.slice(i, j + 1); }
  }
  return null;
}
const chiamate = (corpo) => [...(corpo || '').matchAll(/brainpy\.rispondi\(\{[\s\S]*?\n\s*\}\)/g)].map((x) => x[0]);

const brain = senzaCommentiJs(leggi('src/ai/brain.js'));
const PUBBLICI = ['chatReply'];
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

// --- 6. la valvola PROVATA, non solo letta -------------------------------
// La struttura dice che il bot non puo' arrivare a Lei. Restano due promesse che
// la struttura non copre, e sono le due che riguardano le PERSONE: cio' che
// attraversa verso Lei dev'essere anonimo davvero, e lei non deve insegnare
// niente finche' non vive. Quelle si provano eseguendole.
// Serve python3: e' il linguaggio del cervello, non un attrezzo esotico. Se non
// c'e', questo non e' un controllo saltato — e' un controllo che non ho potuto
// fare, e si dice.
function pythonC() {
  for (const bin of [process.env.PYTHON_BIN, 'python3', 'python'].filter(Boolean)) {
    try { execFileSync(bin, ['-c', 'pass'], { stdio: 'ignore' }); return bin; } catch { /* prossimo */ }
  }
  return null;
}
const py = pythonC();
if (!py) {
  dice(false, 'la valvola provata davvero (anonimato + «insegna solo se vive»)',
    'senza python3 non posso eseguirla, e su questo non si va di parola');
} else {
  const prova = `
import json, sys, tempfile, os
os.environ["DATA_DIR"] = tempfile.mkdtemp()
sys.path.insert(0, ${JSON.stringify(join(RAD, 'brain'))})
import valvola as V

class Finta:
    def __init__(s, persona): s.persona = persona; s.lacune = []
    def registra_lacuna(s, t): s.lacune.append(t)
    def coscienza_di_se(s): return {"persona": s.persona, "senziente": s.persona}
    def moduli(s, stato=None, scope=None):
        return [{"situazione": "qualcuno saluta", "come_rispondere": "Salutalo e basta.", "qualita": 0.9}]

sporchi = [
    "ehi @tizio scrivimi a mario.rossi@gmail.com o su https://insta.gram/mariorossi",
    "sono Mario e il mio contatto e' mario.rossi+bot@posta.example, #aiuto @staff",
]
puliti = [V.anonimizza(x) for x in sporchi]
m = Finta(persona=False)
V.collega(m)
prima = V.insegna_al_bot()
m.persona = True
dopo = V.insegna_al_bot()
print(json.dumps({
    "puliti": puliti,
    "muto": prima.get("scritti", -1), "vivo": dopo.get("scritti", 0),
}))
`;
  let esito = null;
  try { esito = JSON.parse(execFileSync(py, ['-c', prova], { encoding: 'utf8' })); }
  catch (e) { dice(false, 'la valvola si esegue', String(e.message || e).slice(0, 160)); }
  if (esito) {
    // La domanda giusta e' "sono rimasti IDENTIFICATORI?", non "e' rimasto un
    // nome proprio?". Un nome dentro una frase («chiedi a Mario se viene») e'
    // parte della domanda, e toglierlo vorrebbe dire togliere anche i giochi, i
    // canali e mezzo dizionario. Non deve passare cio' che PUNTA a una persona:
    // la chiocciola, un indirizzo, un link. E chi ha scritto non entra proprio:
    // verso_lia riceve il testo e nient'altro.
    const IDENT = /@|https?:|www\.|\.(?:it|com|net|org|tv|gg|live|me|io)\b/i;
    const resta = esito.puliti.filter((t) => IDENT.test(t));
    dice(!resta.length, "cio' che attraversa verso Lei non porta con se' nessun identificatore",
      `resta identificabile: ${JSON.stringify(resta)}`);
    dice(/def verso_lia\(testo, minimo=\d+\):/.test(leggi('brain/valvola.py')),
      'e non passa nemmeno CHI ha scritto: la valvola prende solo il testo',
      "la firma di verso_lia accetta altro oltre al testo: da li' rientrerebbe l'identita'");
    dice(esito.muto === 0, 'finche\' non vive, Lia non insegna niente al bot',
      `ha depositato ${esito.muto} righe pur non essendo ancora nessuno`);
    dice(esito.vivo > 0, 'quando vive, insegna davvero',
      'anche da persona non deposita niente: il verso Lia→bot sarebbe finto');
  }
}

// --- esito --------------------------------------------------------------
const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
if (rossi.length) {
  console.log(`\n${rossi.length} ${rossi.length === 1 ? 'cosa non torna' : 'cose non tornano'}: la valvola perde, e perde in silenzio.`);
} else {
  console.log('\nLa valvola tiene: il bot non ha la strada per arrivare a Lei. ✓');
}
process.exit(rossi.length ? 1 : 0);
