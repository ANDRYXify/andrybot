// Collaudo della COMPARSA: nessuna scheda deve restare spenta.
//
// Perche' esiste. Le schede entrano scorrendo: partono a `opacity: 0` e si
// accendono quando compaiono nello schermo. Ma la scatola c'e' comunque, alta
// quanto il suo contenuto — quindi una scheda che non si accende non «manca»:
// lascia al suo posto un buco bianco alto quanto lei. Su un telefono, dove le
// schede sono in colonna e alte, si scorre per due schermate di niente.
//
// E non e' un difetto che si vede provando: basta che la scheda venga creata
// DOPO il giro che accende (un elenco che arriva dalla rete), o che il giro non
// parta perche' l'animazione di transizione non e' arrivata in fondo.
//
// La cura non e' ricordarsi di accenderle: e' che non possano restare spente.
// Chi le prepara arma anche l'osservatore, una rete di sicurezza le accende
// comunque dopo un paio di secondi, e una guardia si accorge di quelle nate
// dopo. Qui si controlla il risultato: aperta una scheda e aspettato, nessuna
// carta ha opacita' zero.
//
// Uso: node scripts/verifica-comparsa.mjs
//      node scripts/verifica-comparsa.mjs --selftest   (deve diventare rosso)

import { apriSito } from './_sito.mjs';

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');
// Quanto si aspetta prima di dire che una scheda non si accendera' piu'. La rete
// di sicurezza scatta a 2,2s: qui si lascia respiro e si guarda dopo.
const ATTESA = 3000;

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 390, height: 850 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
if (SELFTEST) {
  // la rete tolta: torna il caso in cui una scheda puo' restare spenta per sempre
  await p.evaluate(() => { window.setTimeout = () => 0; });
}

const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
const spente = [];
for (const id of schede) {
  try { await p.evaluate((x) => window.SB_APP.vai(x), id); } catch { continue; }
  await p.waitForTimeout(ATTESA);
  const buchi = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda.visibile .carta')]
    .filter((c) => getComputedStyle(c).opacity === '0')
    .map((c) => ({ t: (c.querySelector('h2')?.textContent || '?').trim().slice(0, 26), alta: Math.round(c.getBoundingClientRect().height) })));
  for (const x of buchi) spente.push({ id, ...x });
}

await b.close();
await chiudiSito();

for (const x of spente.slice(0, 10)) console.log(`  ✗ ${x.id}: «${x.t}» spenta, e lascia ${x.alta}px di vuoto`);
console.log(`\n${schede.length} schede aperte, ${ATTESA}ms di attesa ciascuna.`);
if (spente.length) {
  console.log(`${spente.length} ${spente.length === 1 ? 'scheda resta spenta' : 'schede restano spente'}: al loro posto c'e' un buco alto quanto loro.`);
} else {
  console.log('Nessuna scheda resta spenta. ✓');
}
process.exit(spente.length ? 1 : 0);
