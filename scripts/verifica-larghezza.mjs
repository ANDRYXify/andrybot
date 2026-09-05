// Collaudo della LARGHEZZA: la pagina non deve mai scorrere di lato.
//
// Perche' esiste. Su uno schermo largo non si vede: il contenuto ci sta, e chi
// prova la modifica su un portatile non ha nessun motivo di sospettare. Su un
// telefono invece la pagina scivola di lato, il testo esce dal bordo della
// scheda a meta' frase, i bottoni finiscono oltre il contorno. Ed e' successo
// davvero, per una ragione che nessuno indovinerebbe leggendo il CSS:
//
//   `overflow: hidden` rende una scatola un CONTENITORE CHE SCORRE, e la
//   dimensione minima automatica di un contenitore che scorre e' ZERO. Era quel
//   dettaglio, non dichiarato da nessuna parte, a impedire che un indirizzo
//   lungo o una riga che non va a capo allargassero la scheda oltre lo schermo.
//   Cambiando in `overflow: clip` — che ritaglia ma NON e' un contenitore che
//   scorre — la minima automatica e' tornata a dipendere dal contenuto, e tre
//   schede sono uscite dallo schermo di 212px senza che niente lo segnalasse.
//
// La cura e' dire quella minima a voce (`min-width: 0`) invece di ereditarla da
// un effetto collaterale.
//
// Cosa misura. A larghezza da telefono, scheda per scheda: quanto la pagina
// scorre di lato (dev'essere zero) e — se scorre — CHI sfonda, cioe' il primo
// elemento piu' largo dello spazio che il padre gli da'. Quello e' il colpevole:
// tutti gli altri sono solo trascinati.
//
// Uso: node scripts/verifica-larghezza.mjs
//      node scripts/verifica-larghezza.mjs --selftest   (deve diventare rosso)

import { apriSito } from './_sito.mjs';

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');
// Il telefono piu' stretto che vale la pena servire. Piu' stretto di cosi' e'
// una scelta di prodotto, non un difetto di stile.
const LARGO = 390;

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const SFONDA = `(() => {
  const out = [];
  for (const e of document.querySelectorAll('.pannello-scheda.visibile *')) {
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.position === 'fixed' || s.position === 'absolute') continue;
    const r = e.getBoundingClientRect();
    if (r.width < 4) continue;
    const pa = e.parentElement;
    if (!pa) continue;
    const sp = getComputedStyle(pa);
    const dentro = pa.clientWidth - (parseFloat(sp.paddingLeft) || 0) - (parseFloat(sp.paddingRight) || 0);
    if (dentro <= 0) continue;
    const sfonda = Math.round(r.width - dentro);
    if (sfonda > 2) {
      out.push({
        chi: (e.tagName.toLowerCase() + (String(e.className || '').trim()
          ? '.' + String(e.className).split(/\\s+/).filter(Boolean).slice(0, 3).join('.') : '')).slice(0, 44),
        padre: (pa.tagName.toLowerCase() + (String(pa.className || '').trim()
          ? '.' + String(pa.className).split(/\\s+/).filter(Boolean).slice(0, 2).join('.') : '')).slice(0, 30),
        sfonda,
      });
    }
  }
  return out.sort((a, b) => b.sfonda - a.sfonda).slice(0, 3);
})()`;

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: LARGO, height: 850 }, isMobile: true, hasTouch: true });
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.addStyleTag({ content: '.giro-velo,.giro-fumetto,#cookie-banner{display:none!important}' });
if (SELFTEST) {
  // la minima automatica com'era quando la ereditavamo per sbaglio
  await p.addStyleTag({ content: '.carta-corpo > .carta-corpo-in { min-width: auto !important; }' });
}

const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
const rotte = [];
for (const id of schede) {
  try { await p.evaluate((x) => window.SB_APP.vai(x), id); } catch { continue; }
  await p.waitForTimeout(220);
  const scorre = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (scorre > 1) rotte.push({ id, scorre, colpevoli: await p.evaluate(new Function('return ' + SFONDA)) });
}

await b.close();
await chiudiSito();

for (const r of rotte) {
  console.log(`  ✗ ${r.id}: la pagina scorre di ${r.scorre}px`);
  for (const c of r.colpevoli) console.log(`      ${c.chi}  sfonda ${c.sfonda}px dentro ${c.padre}`);
}
console.log(`\n${schede.length} schede guardate a ${LARGO}px.`);
if (rotte.length) {
  console.log(`${rotte.length} ${rotte.length === 1 ? 'scheda esce' : 'schede escono'} dallo schermo: su un telefono il testo si taglia a meta' frase.`);
} else {
  console.log('Nessuna scheda esce dallo schermo. ✓');
}
process.exit(rotte.length ? 1 : 0);
