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

// --- 4. la base non deve cambiare sotto i piedi ----------------------------
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
