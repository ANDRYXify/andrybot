// Cancello della CARTA DELLA DIRETTA: un disegnatore solo, e le sue condizioni.
//
// Perché esiste. Un editor che mostra un'anteprima ha un modo di sbagliare che
// non produce nessun errore: l'anteprima e l'immagine che parte diventano DUE
// cose e cominciano a divergere. Sullo schermo il nome è al centro, nel gruppo
// arriva spostato — e nessuno capisce perché, perché nessuna delle due parti si
// lamenta.
//
// La costruzione che lo impedisce: c'è UNA funzione che disegna
// (`svgCarta`, in src/features/carta-disegno.js) e la chiamano tutti e due. Il
// browser riceve QUEL file, non una copia da riallineare a mano.
//
// Una costruzione così però ha tre condizioni che si possono rompere senza
// accorgersene, e sono quelle che questo cancello guarda:
//
//   1. il modulo del disegno deve restare PURO. Basta un `import` di Node
//      dentro — comodissimo, e sul server funziona benissimo — e nel browser il
//      modulo non carica più: l'editor resta senza anteprima;
//   2. quello che il browser RICEVE — spogliato dei commenti, perché quello si
//      legge da F12 — deve disegnare ESATTAMENTE lo stesso SVG. Qui non si
//      ragiona e non si legge la rotta: si chiama la funzione che compone la
//      risposta, si disegnano i due temi con tutte e due le versioni e si
//      confrontano i segni;
//   3. il vocabolario che il server manda all'editor dev'essere quello che il
//      server ACCETTA. Un elenco scritto a mano nella rotta è la solita cosa
//      scritta in due posti: l'editor offrirebbe una scelta che la validazione
//      butta via in silenzio, e chi la sceglie vede il valore tornare indietro
//      da solo.
//
// E poi le due condizioni materiali del disegno: i caratteri ci sono, e sono
// TTF (un .woff2 il rasterizzatore lo accetta e rende un'immagine vuota).
//
// Uso: node scripts/verifica-carta.mjs             (esce 1 se qualcosa non torna)
//      node scripts/verifica-carta.mjs --selftest  (rompe una cosa per volta e
//        pretende che il cancello diventi rosso)

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { righeCommento } from '../src/spoglia.js';
import { disegnoPerIlBrowser } from '../src/features/cartalive.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');

const DISEGNO = 'src/features/carta-disegno.js';
const ROTTE = 'src/web/server.js';

const ROTTURE = [
  [DISEGNO, "export const MISURA", "import { readFileSync } from 'node:fs';\nexport const MISURA", 'il disegno si porta dentro un pezzo di Node'],
  [DISEGNO, 'export function svgCarta', 'export function svgCarta2', 'il disegno non esporta piu\' la funzione che disegna'],
  [DISEGNO, "export const TIPI = ['testo'", "export const TIPI = ['testo', 'stella'", "il vocabolario offre un tipo che la validazione non conosce"],
  [DISEGNO, "['Anton', 'Anton-Regular.ttf']", "['Anton', 'Anton-Regular.woff2']", 'un carattere torna a essere un woff2'],
  [ROTTE, 'tipi: cartaLive.TIPI,', "tipi: ['testo', 'targhetta'],", "la rotta si scrive il vocabolario per conto suo"],
  [ROTTE, "app.get('/js/carta-disegno.js'", "app.get('/js/carta-disegno-vecchio.js'", 'il browser non riceve piu\' il disegno del server'],
  ['src/features/cartalive.js', "_servito = spoglia(readFileSync(", "_servito = (readFileSync(", 'il disegno arriva al browser coi suoi commenti'],
  ['src/features/cartalive.js', "_servito = spoglia(readFileSync(join(RAD, 'src/features/carta-disegno.js'), 'utf8'), 'js');",
    "_servito = spoglia(readFileSync(join(RAD, 'src/features/carta-disegno.js'), 'utf8'), 'js').replace(/\\s+/g, ' ');",
    'qualcuno rimpicciolisce il modulo prima di mandarlo, e il disegno cambia'],
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
  console.log(cieche ? `\n${cieche} rotture non viste: il cancello non tiene.` : '\nOgni rottura si vede. ✓');
  process.exit(cieche ? 1 : 0);
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok: !!ok, msg, extra });

const sorgente = leggi(DISEGNO);

// 1. il modulo del disegno resta puro: nel browser non c'e' Node.
const IMPURO = /\bfrom\s+['"]node:|\brequire\s*\(|\bprocess\.|\b__dirname\b|\bBuffer\b/;
const righeImpure = sorgente.split('\n')
  .filter((r, i) => IMPURO.test(r) && !righeCommento(sorgente, 'js').some((c) => c.n === i + 1));
dice(!righeImpure.length, 'il disegno non tocca Node: il browser lo puo\' caricare',
  `ci sono ${righeImpure.length} righe che solo il server saprebbe eseguire: ${righeImpure[0]?.trim().slice(0, 70)}`);

// e non importa niente che non sia del disegno stesso
const importati = [...sorgente.matchAll(/^import[^;]*from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
dice(!importati.length, 'e non importa niente: si regge da solo',
  `importa ${JSON.stringify(importati)}`);

// 2. spogliato disegna lo stesso.
const nudo = disegnoPerIlBrowser();
dice(nudo.length > 0 && !righeCommento(nudo, 'js').length,
  'in quello che riceve il browser non resta un commento: da F12 non si legge niente',
  nudo.length ? 'ne arrivano ancora' : 'al browser non arriva niente');

const cartella = mkdtempSync(join(tmpdir(), 'carta-'));
try {
  const viaNuda = join(cartella, 'nudo.mjs');
  writeFileSync(viaNuda, nudo);
  const vero = await import(pathToFileURL(join(RAD, DISEGNO)).href);
  const finto = await import(pathToFileURL(viaNuda).href);
  // Il confronto vale quanto vale il campione. Con dati poveri resta verde per
  // il motivo sbagliato: senza avatar, per dire, non si disegna il pezzo che
  // contiene l'unica stringa scritta su due righe di tutto il modulo — e una
  // differenza li' dentro non si vedrebbe. Quindi si disegna TUTTO: i due temi,
  // e in piu' una carta che usa ogni tipo, con la faccia al suo posto.
  const dati = {
    nome: 'ANDRYXify', titolo: 'Si costruisce il bot, dal vivo', gioco: 'Software and Game Dev',
    login: 'andryxify', link: 'https://twitch.tv/andryxify', spettatori: '128', piattaforma: 'twitch',
    avatar: 'data:image/png;base64,iVBORw0KGgo=',
  };
  const ogniTipo = (M) => ({
    ...M.MISURA,
    fondo: { tipo: 'alone', tinta: '#0F0A1B', alone: '#A970FF', alone2: '#772CE8', cx: 20, cy: 30, r: 66 },
    elementi: M.TIPI.flatMap((tipo, i) => M.FORME_AVATAR.map((forma, k) => M.normElemento(
      { tipo, forma, x: 80 + i * 90, y: 60 + k * 120, testo: '{nome} · {titolo}', maiuscolo: k === 1,
        spaziatura: 2, aureola: k === 0, spessore: 4, tagliata: k === 2, punto: k === 1, inclinazione: 18 },
      M.MISURA.larghezza, M.MISURA.altezza))),
  });
  const prove = [
    ...vero.NOMI_TEMI.map((t) => [t, vero.TEMI[t], finto.TEMI[t]]),
    ['ogni tipo', ogniTipo(vero), ogniTipo(finto)],
  ];
  const diversi = prove.filter(([, a, b]) => vero.svgCarta(a, dati) !== finto.svgCarta(b, dati)).map(([n]) => n);
  dice(prove.length > vero.NOMI_TEMI.length && !diversi.length,
    `quello che riceve il browser disegna identico al server (${prove.length} carte confrontate segno per segno, ogni tipo compreso)`,
    `differiscono: ${diversi.join(', ')}`);

  // la validazione e' la stessa: sennò il browser accetterebbe cose che il server butta
  const cattiva = { elementi: [{ tipo: 'testo', x: 5, colore: 'url(javascript:1)', carattere: 'Comic Sans', corpo: 9999 }] };
  dice(JSON.stringify(vero.normCarta(cattiva)) === JSON.stringify(finto.normCarta(cattiva)),
    'e ripulisce identico: l\'editor non puo\' accettare quello che il server scarta');

  // 3. il vocabolario che esce e' quello che entra.
  const rotte = leggi(ROTTE);
  const voce = rotte.slice(rotte.indexOf('const vocabolarioCarta'), rotte.indexOf('const vocabolarioCarta') + 900);
  for (const [campo, chiave] of [['tipi', 'TIPI'], ['forme', 'FORME_AVATAR'], ['fondi', 'FONDI'], ['segnaposto', 'SEGNAPOSTO'], ['caratteri', 'CARATTERI']]) {
    dice(new RegExp(`${campo}:\\s*cartaLive\\.${chiave}\\b`).test(voce),
      `il vocabolario «${campo}» esce dall'elenco vero, non da una copia`,
      `nella rotta «${campo}» e' scritto a mano: l'editor offrirebbe scelte che il server scarta`);
  }
  // e ogni tipo dichiarato lo sa disegnare davvero
  const muti = vero.TIPI.filter((t) => {
    const solo = { ...vero.MISURA, fondo: { tipo: 'tinta', tinta: '#000000' }, elementi: [vero.normElemento({ tipo: t, x: 300, y: 250 }, 1200, 500)] };
    const s = vero.svgCarta(solo, dati);
    return s === vero.svgCarta({ ...solo, elementi: [] }, dati);
  });
  dice(!muti.length, `ogni tipo che l'editor puo' aggiungere disegna qualcosa (${vero.TIPI.length} tipi)`,
    `questi si possono aggiungere e non si vedono: ${muti.join(', ')}`);

  // 4. i caratteri: ci sono, e sono TTF.
  const dentro = existsSync(join(RAD, 'assets/font')) ? readdirSync(join(RAD, 'assets/font')) : [];
  const mancanti = vero.CARATTERI.filter(([, f]) => !dentro.includes(f)).map(([n]) => n);
  dice(!mancanti.length, `i caratteri viaggiano con noi (${vero.CARATTERI.length})`, `mancano: ${mancanti.join(', ')}`);
  const nonTtf = vero.CARATTERI.filter(([, f]) => !/\.ttf$/i.test(f)).map(([, f]) => f);
  dice(!nonTtf.length, 'e sono TTF: un woff2 il rasterizzatore lo accetta e rende un\'immagine vuota',
    `non sono TTF: ${nonTtf.join(', ')}`);

  // e il server li serve al browser, quegli stessi file
  dice(/app\.get\('\/font\/:file'/.test(rotte) && /CARATTERI\.map\(\(\[, file\]\) => file\)/.test(rotte),
    'e il browser riceve gli stessi file del rasterizzatore',
    'l\'editor userebbe un carattere di sistema: ogni testo sarebbe largo diverso');
  dice(/app\.get\('\/js\/carta-disegno\.js'/.test(rotte) && /cartaLive\.disegnoPerIlBrowser\(\)/.test(rotte),
    'e la rotta manda quello che questo cancello ha appena guardato, non altro',
    'la rotta si compone il modulo per conto suo: potrebbe mandare una cosa diversa da quella verificata');
} finally {
  rmSync(cartella, { recursive: true, force: true });
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length
  ? `\n${rossi.length} ${rossi.length === 1 ? 'cosa non torna' : 'cose non tornano'}: l'anteprima e l'immagine che parte possono divergere.`
  : '\nChi compone la carta e chi la manda disegnano con la stessa mano. ✓');
process.exit(rossi.length ? 1 : 0);
