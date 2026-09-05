// Cancello dell'AMBIENTE di Lia: il suo computer e il codice che lo comanda non
// devono scivolare uno dall'altro.
//
// Perche' esiste. L'ambiente e' un container, e chi lo comanda sta altrove: fra i
// due c'e' un elenco di verbi, un numero di porta e una manciata di programmi che
// devono esistere DENTRO l'immagine. La stessa cosa scritta in due file, e uno dei
// due che resta indietro, e' il difetto piu' caro che c'e' qui — perche' non da'
// nessun errore. Il verbo nuovo torna «op sconosciuta»; la sonda che cerca un
// programma disinstallato dice «nessun browser» mentre lei sta navigando; la porta
// cambiata da una parte sola dice «il browser non risponde». Tre bugie diverse,
// nessun errore.
//
// Cosa misura:
//   1. i verbi che il cervello sa fare passano tutti dal cancello del sito (se uno
//      manca, la dashboard lo chiede e riceve «op sconosciuta»);
//   2. il browser e l'esecutore parlano sulla STESSA porta;
//   3. tutto cio' che le sonde vanno a cercare dentro l'immagine c'e' davvero;
//   4. l'avvio accende lo schermo, il browser e l'esecutore, e l'immagine parte da li'.
//
// Uso: node scripts/verifica-ambiente.mjs             (esce 1 se qualcosa non torna)
//      node scripts/verifica-ambiente.mjs --selftest  (rompe una cosa per volta e
//        pretende che il cancello diventi rosso)

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { senzaCommentiJs } from './_codice.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');

const ROTTURE = [
  ['src/web/server.js', "'installa', 'naviga', 'browser', 'schermo',", "'installa', 'naviga',",
    'un verbo del cervello non passa piu\' dal sito'],
  ['ambiente/browser.py', 'os.environ.get("BROWSER_PORT", "8100")', 'os.environ.get("BROWSER_PORT", "8200")',
    'il browser ascolta su una porta e l\'esecutore ne chiama un\'altra'],
  ['brain/ambiente.py', 'python3 -c \\"import playwright', 'chromium --version 2>/dev/null && python3 -c \\"import playwright',
    'una sonda cerca un programma che non c\'e\' piu\' nell\'immagine'],
  ['ambiente/Dockerfile', 'CMD ["/opt/avvio.sh"]', 'CMD ["python3", "/opt/executor.py"]',
    'l\'immagine parte senza accendere schermo e browser'],
  ['ambiente/avvio.sh', 'avvia browser python3 /opt/browser.py', '# niente browser',
    'l\'avvio non accende il browser'],
  ['ambiente/Dockerfile', 'FROM python:3.12-slim-bookworm', 'FROM python:3.12-slim',
    'la base torna a seguire il vento e il build si rompera\' da solo'],
  ['src/ai/brainpy.js', 'const ECO_ATTESA_MS = 90_000;', 'const ECO_ATTESA_MS = 20_000;',
    'il sito molla prima di chi sta sotto: rotellina per sempre'],
  ['ambiente/browser.py', 'threading.Thread(target=_lavoratore, name="browser", daemon=True).start()',
    '# nessun lavoratore',
    'il browser resta senza padrone: nessun gesto viene mai eseguito'],
  ['ambiente/browser.py', 'return esito.get(timeout=limite)', 'return esito.get()',
    'un gesto puo\' aspettare per sempre'],
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

// Il meccanismo del browser non si legge: si FA GIRARE. Playwright qui non serve —
// si sostituisce il solo gesto e restano quelli veri la coda, il padrone unico e le
// scadenze, che sono le tre cose che possono piantare tutto.
const PROVA = `
import sys, threading, time, importlib.util, json
spec = importlib.util.spec_from_file_location("br", "ambiente/browser.py")
br = importlib.util.module_from_spec(spec); spec.loader.exec_module(br)
fatti = []
def finto(d):
    az = d.get("azione")
    fatti.append((az, threading.current_thread().name))
    if az == "lento": time.sleep(3)
    if az == "esplode": raise RuntimeError("boom")
    return {"ok": True, "azione": az}
br._azione = finto
br._avvia = lambda: "pagina"
br.GESTO_S = 1.0
br.LANCIO_S = 0.0
br._diario["acceso"] = True
threading.Thread(target=br._lavoratore, daemon=True).start()
time.sleep(0.2)
e = {}
e["normale"] = 1 if br._chiedi({"azione": "apri"}).get("ok") else 0
r = br._chiedi({"azione": "esplode"})
e["esplode"] = 1 if (not r.get("ok") and "boom" in str(r.get("errore"))) else 0
e["rifa_dopo_errore"] = 1 if br._rifare.is_set() else 0
br._rifare.clear()
r = br._chiedi({"azione": "lento"})
e["scade"] = 1 if r.get("scaduto") else 0
time.sleep(3.2)
e["rifa_dopo_ritardo"] = 1 if br._rifare.is_set() else 0
esitiT = []
th = [threading.Thread(target=lambda i=i: esitiT.append(br._chiedi({"azione": "g%d" % i}))) for i in range(10)]
[t.start() for t in th]; [t.join() for t in th]
e["nessuno_appeso"] = 1 if len(esitiT) == 10 else 0
e["thread"] = len({t for _, t in fatti})
print(json.dumps(e))
`;

let mis = null;
try {
  const out = execFileSync('python3', ['-c', PROVA], { cwd: RAD, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  mis = JSON.parse(out.trim().split('\n').filter((r) => r.startsWith('{')).pop());
} catch (e) {
  dice(false, 'il meccanismo del browser si e\' potuto far girare', String(e?.message || e).slice(0, 200));
}
if (mis) {
  dice(mis.thread === 1, `un thread SOLO tocca il browser, anche con dieci gesti insieme (${mis.thread})`,
    'piu\' thread sull\'API sincrona di Playwright: si pianta senza dare errore');
  dice(mis.nessuno_appeso === 1, 'nessun gesto resta appeso', 'qualcuno non ha mai ricevuto risposta');
  dice(mis.scade === 1, 'un gesto troppo lento riceve un errore, non il silenzio', 'aspetta per sempre');
  dice(mis.normale === 1 && mis.esplode === 1, 'un gesto riesce, e uno che fallisce dice perche\'', 'il giro base non funziona');
  dice(mis.rifa_dopo_errore === 1 && mis.rifa_dopo_ritardo === 1,
    'dopo un errore o un ritardo il browser si rifa\' da capo',
    'una pagina rimasta a meta\' avvelena i gesti dopo');
}

const cervello = leggi('brain/server.py');
const sito = senzaCommentiJs(leggi('src/web/server.js'));
const ponte = leggi('brain/ambiente.py');
const browser = leggi('ambiente/browser.py');
const esecutore = leggi('ambiente/executor.py');
const dockerfile = leggi('ambiente/Dockerfile');
const avvio = leggi('ambiente/avvio.sh');

// --- 1. i verbi ------------------------------------------------------------
const azione = cervello.slice(cervello.indexOf('def _ecosistema_azione'), cervello.indexOf('def _svago'));
const verbi = [...azione.matchAll(/op == "([a-z]+)"/g)].map((m) => m[1]);
// L'elenco giusto e' quello DENTRO la rotta dell'ecosistema: in server.js di
// `const consentite = [` ce n'e' piu' d'uno, e prendere il primo che capita
// vorrebbe dire misurare un'altra cosa e chiamarla rossa.
const dentroRotta = sito.slice(sito.indexOf("app.post('/api/admin/ecosistema'"));
const mCons = dentroRotta.match(/const consentite = \[([^\]]*)\]/);
const consentite = mCons ? [...mCons[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]) : [];
const chiusi = verbi.filter((v) => !consentite.includes(v));
dice(verbi.length > 0, `verbi che il cervello sa fare: ${verbi.length}`, 'nessuno: la misura non misura piu\' niente');
dice(mCons && !chiusi.length, `ogni verbo passa dal cancello del sito (${consentite.length} consentiti)`,
  chiusi.length ? `la dashboard riceverebbe «op sconosciuta» per: ${chiusi.join(', ')}` : 'non trovo l\'elenco dei consentiti');

// --- 2. la porta del browser ----------------------------------------------
const portaDi = (testo) => (testo.match(/BROWSER_PORT",\s*"(\d+)"/) || [])[1] || '';
dice(portaDi(browser) && portaDi(browser) === portaDi(esecutore),
  `il browser e l'esecutore parlano sulla stessa porta (${portaDi(browser) || '?'})`,
  `browser ${portaDi(browser) || '?'} ≠ esecutore ${portaDi(esecutore) || '?'}`);

// --- 3. i programmi che le sonde cercano ----------------------------------
// Cio' che l'immagine sa fare: quel che il Dockerfile installa, piu' i comandi che
// in un sistema Linux ci sono sempre.
const SEMPRE = new Set(['echo', 'head', 'tail', 'ls', 'wc', 'du', 'awk', 'grep', 'cat', 'sed',
  'tr', 'printf', 'base64', 'mkdir', 'date', 'timeout', 'bash', 'sh', 'true', 'python3', 'pip']);
const installati = new Set([
  ...[...dockerfile.matchAll(/^\s+([a-z0-9][a-z0-9.+-]*)(?:\s|\\)*$/gm)].map((m) => m[1]),
  ...[...dockerfile.matchAll(/install -y --no-install-recommends([\s\S]*?)&&/g)]
    .flatMap((m) => m[1].split(/\s+|\\/).filter(Boolean)),
  // e quel che entra nell'immagine per altre strade che apt (micromamba si scarica)
  ...[...dockerfile.matchAll(/--strip-components=\d+\s+bin\/([a-z0-9_-]+)/g)].map((m) => m[1]),
]);
// i nomi con cui il pacchetto si chiama e quelli con cui il programma si invoca
const ALIAS = { xvfb: ['Xvfb'], 'x11-utils': ['xdpyinfo'], nodejs: ['node'], novnc: ['websockify'] };
for (const [pkg, cmds] of Object.entries(ALIAS)) if (installati.has(pkg)) cmds.forEach((c) => installati.add(c));

const sonda = ponte.slice(ponte.indexOf('def stato_ecosistema'), ponte.indexOf('def _intero'));
const cercati = [...sonda.matchAll(/(?:^|[;(]\s*|\|\|\s*|&&\s*)([a-z][a-z0-9_-]{1,20})\s+--?[a-z]/g)]
  .map((m) => m[1]);
const mancanti = [...new Set(cercati)].filter((c) => !SEMPRE.has(c) && !installati.has(c));
dice(cercati.length > 0, `programmi che le sonde vanno a cercare: ${new Set(cercati).size}`,
  'nessuno: la misura non misura piu\' niente');
dice(!mancanti.length, 'tutto cio\' che le sonde cercano esiste nell\'immagine',
  `cercati e mai installati: ${mancanti.join(', ')} — il cruscotto direbbe «non c\'e\'» a vuoto`);

// --- 3b. il browser ha un padrone solo ------------------------------------
// L'API sincrona di Playwright e' legata AL THREAD CHE L'HA CREATA: usarla da un
// altro thread non da' errore, si pianta. Con un server HTTP a thread (uno nuovo per
// richiesta) il primo gesto funziona e il secondo muore in silenzio — da fuori si
// vede «sta caricando», per sempre. Quindi: un thread solo possiede il browser, e
// chi risponde alle richieste non lo tocca mai.
dice(/threading\.Thread\(target=_lavoratore/.test(browser),
  'il browser ha un thread suo che lo possiede',
  'senza lavoratore nessun gesto viene eseguito, o peggio: lo esegue un thread a caso');
const manoHttp = browser.slice(browser.indexOf('class H('));
dice(!/_azione\(/.test(manoHttp),
  'chi risponde alle richieste non tocca mai il browser (passa dalla coda)',
  'il gestore HTTP chiama il browser da un thread suo: si piantera\'');
dice(/esito\.get\(timeout=/.test(browser),
  'nessun gesto puo\' aspettare per sempre',
  'un\'attesa senza scadenza e\' la rotellina che gira all\'infinito');

// --- 4. le attese crescono verso l'esterno --------------------------------
// Un gesto sul browser attraversa quattro attese in fila: il browser si da' una
// scadenza, l'esecutore aspetta lui, il cervello aspetta l'esecutore, il sito
// aspetta il cervello. Se una di quelle piu' esterne e' PIU' CORTA di una interna,
// chi sta fuori molla per primo: la pagina si carica, la risposta arriva a nessuno,
// e nella scheda resta una rotellina che gira per sempre. E' esattamente cio' che e'
// successo con venti secondi sul sito e centocinquanta sotto.
// I trattini bassi che in JavaScript rendono leggibile un numero (90_000) per
// parseFloat sono la fine del numero: senza toglierli, novantamila diventa novanta.
const numero = (testo, ago) => {
  const m = testo.match(ago);
  return m ? parseFloat(m[1].replace(/_/g, '')) : NaN;
};
const catena = [
  ['il browser (un gesto)', numero(browser, /BROWSER_GESTO_S", "(\d+)/)],
  ['l\'esecutore', numero(esecutore, /BROWSER_ATTESA_S", "(\d+)/)],
  ['il cervello', numero(ponte, /BROWSER_ATTESA_BRAIN_S", "(\d+)/)],
  ['il sito', numero(leggi('src/ai/brainpy.js'), /ECO_ATTESA_MS = ([\d_]+)/) / 1000],
];
const lette = catena.filter(([, n]) => Number.isFinite(n));
dice(lette.length === catena.length, `le attese della catena si leggono tutte (${lette.length} su ${catena.length})`,
  `non trovo: ${catena.filter(([, n]) => !Number.isFinite(n)).map(([c]) => c).join(', ')}`);
const fuoriPosto = [];
for (let i = 1; i < lette.length; i++) {
  if (!(lette[i][1] > lette[i - 1][1])) fuoriPosto.push(`${lette[i][0]} (${lette[i][1]}s) non aspetta più di ${lette[i - 1][0]} (${lette[i - 1][1]}s)`);
}
dice(!fuoriPosto.length, `ogni attesa è più lunga di quella che avvolge (${lette.map(([, n]) => n + 's').join(' < ')})`,
  fuoriPosto.join(' · '));

// --- 5. la base non deve cambiare sotto i piedi ----------------------------
// `playwright install --with-deps` installa le librerie di sistema del browser con
// un elenco che dipende dalla VERSIONE DI DEBIAN. Con una base non pinnata
// (`python:3.12-slim`) quella versione cambia quando cambia a monte, e un giorno il
// build muore su pacchetti che non esistono piu' — senza che nessuno qui abbia
// toccato niente. Se ci si fa vestire da Playwright, la base si inchioda.
const conDeps = /playwright install .*--with-deps/.test(dockerfile);
const base = (dockerfile.match(/^FROM\s+(\S+)/m) || [])[1] || '';
const pinnata = /-(bookworm|bullseye|trixie|noble|jammy|focal)\b/.test(base);
dice(!conDeps || pinnata, `la base dell'immagine è inchiodata a una Debian precisa (${base || '?'})`,
  'con --with-deps e una base che segue il vento, il build si romperà da solo quando Debian cambia');

// --- 5. l'avvio ------------------------------------------------------------
dice(/CMD\s*\[\s*"\/opt\/avvio\.sh"\s*\]/.test(dockerfile),
  'l\'immagine parte dall\'avvio (schermo, browser, esecutore)',
  'parte da qualcos\'altro: schermo e browser non si accendono');
for (const [che, ago] of [['lo schermo', 'Xvfb'], ['il browser', '/opt/browser.py'], ['l\'esecutore', '/opt/executor.py']]) {
  dice(avvio.includes(ago), `l'avvio accende ${che}`, `non c'e' traccia di ${ago}`);
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nIl suo computer e chi lo comanda dicono la stessa cosa. ✓');
process.exit(rossi.length ? 1 : 0);
