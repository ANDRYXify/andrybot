// Cancello delle VIE: ogni modo di pensare di Lia deve poter lavorare, e deve
// vedersi per quello che e'.
//
// Due difetti diversi, la stessa faccia da fuori: nel cruscotto un modo di pensare
// sta a ZERO e sembra debole. Il primo gli chiude la porta d'ingresso; il secondo
// lo fa lavorare e poi non lo conta.
//
// --- primo: la porta d'ingresso dei fatti ---
//
// Perche' esiste. In italiano, in chat, «è» si scrive quasi sempre «e'». Le regole
// con cui Lei ricava fatti dalle frasi cercano l'accento: con l'apostrofo non
// trovano niente — e non danno nessun errore. Non impara e basta. Da lì in giù
// casca tutto: senza fatti non c'e' grafo, senza grafo non c'e' deduzione, ne'
// costruzione, ne' causale, ne' analogia. Nel cruscotto si vedono sei modi di
// pensare a ZERO, e sembrano deboli: e' la porta che e' chiusa.
//
// Un difetto cosi' non lo trova nessuna prova statica, perche' il codice e'
// giusto: e' l'INGRESSO che non passa. Quindi questo cancello non legge il
// codice, lo ESEGUE — fa imparare a Lei delle frasi scritte come le scrive la
// gente e pretende che dopo sappia rispondere.
//
// --- secondo: le vie che nessuno conta ---
//
// `genera.py` assegna a ogni risposta la VIA che l'ha prodotta; `coscienza.py` la
// registra, ma solo se sta in una lista; il cruscotto la disegna, ma solo se sta in
// un'altra lista. Tre elenchi della stessa cosa in tre file: quello che manca a uno
// dei tre sparisce in silenzio, e il modo di pensare che lo usa sembra non lavorare
// mai. Qui i tre elenchi si confrontano.
//
// Uso: node scripts/verifica-vie.mjs             (esce 1 se qualcosa non torna)
//      node scripts/verifica-vie.mjs --selftest  (rompe una cosa per volta e
//        pretende che il cancello diventi rosso)

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');

const ROTTURE = [
  ['brain/ragiona.py', '    t = re.sub(r"\\s+", " ", _t(testo).strip())',
    '    t = re.sub(r"\\s+", " ", str(testo or "").strip())',
    'imparare torna a non capire l\'apostrofo'],
  ['brain/ragiona.py', '    d = re.sub(r"\\s+", " ", _t(domanda).strip())',
    '    d = re.sub(r"\\s+", " ", str(domanda or "").strip())',
    'chiedere torna a non capire l\'apostrofo'],
  ['brain/accenti.py', 'TRONCAMENTI = {"po", "mo", "be", "da", "di", "fa", "sta", "va", "to", "ca", "co", "bo"}',
    'TRONCAMENTI = set()',
    '«un po\'» diventa «un pò»'],
  ['brain/accenti.py', 'if "\'" not in t or _VIRGOLETTA.search(t):',
    'if "\'" not in t:',
    'le virgolette diventano accenti'],
  ['brain/ragiona.py', "cos'?a?)\\s*(?:è|sono)", "cos'?a?)\\s+(?:è|sono)",
    '«cos\'è» torna a non essere una domanda'],
  ['brain/marcatori.py', '    t = accenti.accenta(str(testo or ""))', '    t = str(testo or "")',
    'la stessa situazione finisce in due classi diverse'],
  ['brain/coscienza.py', '"causale", "analogia", "scudo", "esecuzione")', '"causale")',
    'una via che Lei usa non viene piu\' contata'],
  ['src/web/public/app.js', "['analogia', L('Analogia (struttura)'", "['analogia_no', L('Analogia (struttura)'",
    'una via contata non si vede nel cruscotto'],
];

// Il programma che MISURA: fa imparare a Lei delle frasi vere, poi le fa domande.
// Ogni riga stampata e' un esito che il cancello legge.
const PROVA = `
import sys, json
sys.path.insert(0, "brain")
import accenti, ragiona as R, marcatori as M

esiti = {}

# 1) le frasi come le scrive la gente diventano fatti
frasi = ["Marco e' un moderatore", "un moderatore e' una persona",
         "una persona ha dei diritti", "il gatto e' un animale",
         "un animale e' un essere vivente", "Milano e' in Lombardia"]
n = 0
for f in frasi:
    n += R.impara_frase("prova", f)
esiti["fatti"] = n

# 2) e da quei fatti ne costruisce di nuovi
esiti["dedotti"] = R.inferisci("prova").get("nuovi", 0)

# 3) e sa rispondere a domande scritte allo stesso modo
risposte = 0
for d in ["il gatto e' un essere vivente?", "cos'e' il gatto?", "chi e' Marco?",
          "dov'e' Milano?", "cosa ha Marco?"]:
    if R.deduci_costruendo("prova", d):
        risposte += 1
esiti["risposte"] = risposte

# 4) e non inventa quello che non sa
esiti["inventa"] = 1 if R.deduci_costruendo("prova", "il gatto e' una macchina?") else 0

# 5) l'apostrofo GIUSTO resta dov'e'
esiti["po"] = 1 if accenti.accenta("un po' di musica") == "un po' di musica" else 0
esiti["elisione"] = 1 if accenti.accenta("l'amico di un'ora fa") == "l'amico di un'ora fa" else 0
esiti["virgolette"] = 1 if accenti.accenta("dice 'ciao' e va") == "dice 'ciao' e va" else 0

# 6) la stessa situazione, scritta nei due modi, e' la stessa situazione
esiti["firma"] = 1 if M.firma("il gatto e' come un cane") == M.firma("il gatto è come un cane") else 0

print(json.dumps(esiti))
`;

function misura() {
  const casa = mkdtempSync(join(tmpdir(), 'accenti-'));
  try {
    const out = execFileSync('python3', ['-c', PROVA], {
      cwd: RAD, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DATA_DIR: casa, PYTHONDONTWRITEBYTECODE: '1' },
    });
    return JSON.parse(out.trim().split('\n').pop());
  } finally {
    rmSync(casa, { recursive: true, force: true });
  }
}

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

let m = null;
try { m = misura(); }
catch (e) { m = null; dice(false, 'la mente di Lia si e\' potuta interrogare', String(e?.message || e).slice(0, 200)); }

if (m) {
  dice(m.fatti >= 6, `dalle frasi come le scrive la gente ricava fatti (${m.fatti} su 6)`,
    'con l\'apostrofo non impara niente: la porta d\'ingresso e\' chiusa');
  dice(m.dedotti > 0, `e dai fatti ne costruisce di nuovi (${m.dedotti})`,
    'il grafo non si estende: «non so → costruisco» non parte');
  dice(m.risposte >= 5, `e risponde alle domande scritte allo stesso modo (${m.risposte} su 5)`,
    'sa la risposta ma non riconosce la domanda');
  dice(m.inventa === 0, 'e tace su quello che non sa', 'ha inventato una risposta');
  dice(m.po === 1, '«un po\'» resta «un po\'»', 'ha messo un accento dove l\'apostrofo era giusto');
  dice(m.elisione === 1, 'le elisioni non si toccano', '«l\'amico» e\' stato storpiato');
  dice(m.virgolette === 1, 'un testo fra virgolette si lascia stare', 'una virgoletta e\' diventata un accento');
  dice(m.firma === 1, 'la stessa situazione scritta nei due modi e\' una sola',
    'la memoria di cio\' che ha funzionato si spezza in due');
}

// --- i tre elenchi delle vie -------------------------------------------------
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const genera = leggi('brain/genera.py');
const coscienza = leggi('brain/coscienza.py');
const cruscotto = leggi('src/web/public/app.js');

// 1) quali vie genera.py assegna davvero
const assegnate = [...genera.matchAll(/_tl\.via\s*=\s*"([a-z]+)"/g)].map((x) => x[1]);
dice(assegnate.length > 0, `vie che Lei sa produrre: ${new Set(assegnate).size}`,
  'nessuna: la misura non misura piu\' niente');

// 2) coscienza.py le conta tutte?
const mCont = coscienza.match(/VIE_CONTATE\s*=\s*\(([\s\S]*?)\)/);
const contate = mCont ? [...mCont[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]) : [];
const nonContate = [...new Set(assegnate)].filter((v) => !contate.includes(v));
dice(mCont && !nonContate.length, `ogni via che Lei usa viene contata (${contate.length} contate)`,
  nonContate.length ? `sparisce in silenzio: ${nonContate.join(', ')}` : 'non trovo l\'elenco VIE_CONTATE');

// 3) il cruscotto le disegna tutte?
// L'elenco giusto e' quello DENTRO il cruscotto della mente: in app.js di
// `const ordine = [` ce n'e' piu' d'uno, e prendere il primo che capita vorrebbe
// dire misurare un'altra cosa e chiamarla verde.
const dentroCruscotto = cruscotto.slice(cruscotto.indexOf('function _menteCruscotto('));
const mCru = dentroCruscotto.match(/const ordine = \[([\s\S]*?)\n  \];/);
const disegnate = mCru ? [...mCru[1].matchAll(/\['([a-z_]+)',/g)].map((x) => x[1]) : [];
const nonDisegnate = contate.filter((v) => !disegnate.includes(v));
dice(mCru && !nonDisegnate.length, `ogni via contata si vede nel cruscotto (${disegnate.length} disegnate)`,
  nonDisegnate.length ? `contate ma invisibili: ${nonDisegnate.join(', ')}` : 'non trovo l\'elenco del cruscotto');

// 4) e il totale delle percentuali le comprende tutte, anche una nuova
dice(/const tot = Object\.values\(vie\)\.reduce\(/.test(cruscotto),
  'le percentuali si calcolano su TUTTE le vie, non solo su quelle note',
  'una via nuova non entrerebbe nel totale: le percentuali direbbero il falso');

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nOgni modo di pensare puo\' lavorare, e si vede per quello che e\'. ✓');
process.exit(rossi.length ? 1 : 0);
