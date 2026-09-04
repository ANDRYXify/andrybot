// Collaudo delle VESTI — gira in un browser vero, quindi vive fuori da
// `npm run cancelli` (i cancelli restano statici e istantanei).
//
// Il difetto che chiude. Nel pannello di ogni pezzo dell'overlay c'e' una fila
// di vesti pronte. Per i due widget — «ultimo follower» e «ultimo sub» —
// quei bottoni non facevano NULLA: chi vestiva finiva in un ramo generico che
// cercava campi con un altro nome, non ne trovava, e usciva senza dire niente.
// Il risultato si vedeva solo guardando l'overlay finito: tutto in tema tranne
// due etichette rimaste come prima. E «a tutto l'overlay» le saltava lo stesso.
//
// Non si prova «la funzione viene chiamata». Si MISURA: si prende ogni blocco,
// gli si mette addosso una veste, poi un'altra molto diversa, e si guarda se i
// suoi campi sono CAMBIATI. Un blocco che non cambia non e' vestito, comunque
// sia scritto il codice.
//
// In piu' si controlla l'ombra, che e' la stessa storia in CSS: `filter` era
// scritto due volte sugli stessi elementi e la seconda spegneva la prima, cosi'
// l'alone dell'alert non si e' mai acceso. Qui si legge il filtro CALCOLATO dal
// browser, che e' l'unico a saperlo davvero.
//
// Uso: node scripts/verifica-veste.mjs   (esce 1 se una veste non arriva)

import { apriSito } from './_sito.mjs';

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch {
  console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.');
  process.exit(0);
}

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const rotture = [];
p.on('pageerror', (e) => rotture.push('errore di pagina: ' + e.message));

await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('alert'); });
await p.waitForFunction(() => (document.querySelector('.pannello-scheda.visibile') || {}).id === 'scheda-alert', null, { timeout: 20000 });
await p.waitForFunction(() => document.querySelectorAll('#ap-stage .ap-el').length > 4, null, { timeout: 20000 });
await p.evaluate(() => document.querySelector('.giro-velo')?.remove());

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

// ---- OGNI BLOCCO SI VESTE -------------------------------------------------
// Due vesti scelte apposta lontane fra loro (la prima e la manga): se un blocco
// e' davvero vestito, passando dall'una all'altra QUALCOSA nei suoi campi deve
// cambiare. Se non cambia niente, quei bottoni sono finti.
const chiavi = await p.evaluate(() => ELEMENTI().map((e) => e.k));
const muti = [];
const senzaTocchi = [];
let provati = 0;

for (const k of chiavi) {
  const r = await p.evaluate((kk) => {
    seleziona(kk);
    const b = [...document.querySelectorAll('#ovl-inspector .asp-blocco')]
      .find((x) => x.dataset.asp === kk);
    if (!b) return { assente: true };
    const foto = () => [...b.querySelectorAll('input, select')]
      .map((e) => e.id + '=' + (e.type === 'checkbox' ? e.checked : e.value)).join('|');
    const t0 = applicaVeste(b, 0); const a = foto();
    const t1 = applicaVeste(b, 4); const c = foto();
    return { cambiato: a !== c, tocchi: Math.min(t0, t1), campi: b.querySelectorAll('input, select').length };
  }, k);
  if (r.assente) continue;
  provati++;
  if (!r.cambiato) muti.push(`${k} (${r.campi} campi, nessuno si muove)`);
  if (!r.tocchi) senzaTocchi.push(k);
}

dice(provati >= 4, `blocchi con la fila delle vesti: ${provati}`);
dice(muti.length === 0, 'cambiando veste ogni blocco cambia davvero', muti.join(' · '));
dice(senzaTocchi.length === 0, 'e chi veste dichiara di aver toccato dei campi', senzaTocchi.join(', '));

// ---- «A TUTTO L'OVERLAY» LI PRENDE TUTTI ---------------------------------
// Il bottone che promette di vestire tutto: la promessa e' che nessun blocco
// resti indietro, ed e' esattamente quella che i due widget disattendevano.
{
  const r = await p.evaluate(() => {
    const b = [...document.querySelectorAll('#ovl-inspector .asp-blocco')];
    const foto = () => b.map((x) => [...x.querySelectorAll('input, select')].map((e) => e.value).join(',')).join('|');
    applicaVesteOvunque(0); const a = foto();
    applicaVesteOvunque(4); const c = foto();
    const fermi = [];
    const av = a.split('|'), cv = c.split('|');
    b.forEach((x, i) => { if (av[i] === cv[i]) fermi.push(x.dataset.asp); });
    return { fermi, quanti: b.length };
  });
  dice(r.fermi.length === 0, `«a tutto l'overlay» muove tutti e ${r.quanti} i blocchi`, 'restano fermi: ' + r.fermi.join(', '));
}

// ---- L'OMBRA SI COMPONE, NON SI SOVRASCRIVE ------------------------------
// Con la veste che accende l'alone, il filtro calcolato deve contenere DUE
// ombre: quella di base e l'alone. Con la veste manga deve contenerne una sola
// e senza sfocatura — su carta l'ombra e' un secondo segno, non un alone.
{
  const leggi = (i) => p.evaluate((v) => {
    const b = [...document.querySelectorAll('#ovl-inspector .asp-blocco')].find((x) => x.dataset.asp === 'alert');
    seleziona('alert'); applicaVeste(b, v);
    const card = document.querySelector('#ap-stage .alert-card');
    return card ? getComputedStyle(card).filter : null;
  }, i);
  const conAlone = await leggi(0);
  const conCarta = await leggi(4);
  if (conAlone == null || conCarta == null) {
    dice(false, 'trovo la carta dell\'alert nell\'anteprima', 'non c\'e\' nessun .alert-card in #ap-stage');
  } else {
    dice((conAlone.match(/drop-shadow/g) || []).length >= 2,
      'la veste con l\'alone compone due ombre', conAlone);
    // l'ultima misura di un drop-shadow e' la sfocatura: su carta dev'essere 0
    // dentro un drop-shadow c'e' un rgba() con le sue parentesi: fermarsi alla
    // prima chiusa faceva leggere mezzo valore, e il collaudo bocciava se
    // stesso invece del prodotto. La sfocatura e' l'ultima misura in px.
    const sfocature = [...conCarta.matchAll(/drop-shadow\((?:[^()]|\([^)]*\))*\)/g)]
      .map((m) => { const px = m[0].match(/-?[\d.]+px/g) || []; return px[px.length - 1] || '?'; });
    dice(sfocature.every((v) => v === '0px'), 'e la veste manga non sfoca l\'ombra', conCarta);
  }
}

dice(rotture.length === 0, 'nessun errore di pagina', rotture.join(' · '));

await b.close();
await chiudiSito();

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length === 1 ? '1 cosa non torna' : rossi.length + ' cose non tornano'}: una veste che non arriva e' un bottone che mente.` : '\nOgni veste arriva dove promette. ✓');
process.exit(rossi.length ? 1 : 0);
