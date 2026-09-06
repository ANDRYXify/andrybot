// Cancello dello STACCO fra vignette.
//
// Il sito cambia scheda in due modi diversi, e la differenza non e' un vezzo:
// e' la grammatica del fumetto. Muoversi fra due SOTTOSEZIONI della stessa
// famiglia e' un passaggio «da azione ad azione» — stessa scena, la macchina
// non si sposta: i blocchi rientrano sfalsati nell'ordine di lettura, e basta.
// Cambiare SEZIONE e' un passaggio «da scena a scena» — luogo nuovo: la
// vignetta vecchia esce, e la nuova entra dal lato da cui sei arrivato.
//
// Perche' col browser. Quale delle due parta dipende da `stessaFamiglia()`, che
// non si legge da fuori, e da una catena di classi e tempi. Leggendo il codice
// sembrano sempre a posto tutte e due; l'unico modo di sapere quale e' partita
// e' guardare la pagina mentre succede.
//
// E non basta la CLASSE: si chiede l'ANIMAZIONE che ne esce davvero. Il blocco
// CSS dell'uscita era finito dentro `@media (prefers-reduced-motion)` — la
// classe c'era lo stesso, e non muoveva niente.
//
// Uso: node scripts/verifica-stacco.mjs
//      node scripts/verifica-stacco.mjs --selftest   (deve diventare rosso)

import { apriSito } from './_sito.mjs';

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.addStyleTag({ content: '#cookie-banner{display:none!important}' });

if (SELFTEST) {
  // Il difetto: un solo stacco per tutti. Si spegne l'uscita, e cambiare
  // sezione diventa identico a un passaggio dentro la stessa scena.
  await p.addStyleTag({ content: '.pannello-scheda.esce{animation:none!important}' });
}

// Non si sbircia: si OSSERVA. Guardare a istanti dava un conto diverso a ogni
// giro — un cancello che ballonzola non misura niente.
await p.evaluate(() => {
  window.__stacchi = { scambio: 0, esce: 0, scena: 0 };
  const guarda = () => {
    if (document.querySelector('.pannello-scheda.scambio')) window.__stacchi.scambio++;
    const u = document.querySelector('.pannello-scheda.esce');
    if (u && getComputedStyle(u).animationName !== 'none') window.__stacchi.esce++;
    const s = document.querySelector('.pannello-scheda.scena .carta.rivela');
    if (s && Math.abs(parseFloat(getComputedStyle(s).getPropertyValue('--rev-x')) || 0) > 4) window.__stacchi.scena++;
  };
  new MutationObserver(guarda).observe(document.documentElement,
    { attributes: true, subtree: true, childList: true, attributeFilter: ['class'] });
});

const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
const passaggi = [];
for (let i = 1; i < schede.length; i++) {
  await p.evaluate((x) => window.SB_APP.vai(x), schede[i - 1]);
  await p.waitForTimeout(480);
  await p.evaluate(() => { window.__stacchi = { scambio: 0, esce: 0, scena: 0 }; });
  await p.evaluate((x) => window.SB_APP.vai(x), schede[i]);
  await p.waitForTimeout(420);
  const c = await p.evaluate(() => window.__stacchi);
  passaggi.push({ da: schede[i - 1], a: schede[i], esce: c.esce > 0, scena: c.scena > 0, scambio: c.scambio > 0 });
}

// I due interruttori non sono lo stesso interruttore. «Leggero» si accende DA
// SOLO su un dispositivo che dichiara poca memoria, pochi core o una rete
// lenta, e serve al CARICO: due translate non pesano niente, lo stacco resta.
// «Meno movimento» lo chiede la persona, e li' lo stacco non parte.
const interruttori = {};
for (const [classe, atteso] of [['leggero', true], ['meno-moto', false]]) {
  await p.evaluate((c) => { document.body.classList.add(c); }, classe);
  await p.evaluate((x) => window.SB_APP.vai(x), schede[0]);
  await p.waitForTimeout(480);
  await p.evaluate(() => { window.__stacchi = { scambio: 0, esce: 0, scena: 0 }; });
  await p.evaluate((x) => window.SB_APP.vai(x), schede.find((s) => s !== schede[0]));
  await p.waitForTimeout(420);
  interruttori[classe] = { visto: (await p.evaluate(() => window.__stacchi)).esce > 0, atteso };
  await p.evaluate((c) => { document.body.classList.remove(c); }, classe);
  await p.waitForTimeout(480);
}

// Niente veli a tutto schermo rimasti accesi SOPRA alla pagina. Sopra: lo
// sfondo sta a z-index negativo, dietro al contenuto, e non e' un velo.
const veli = await p.evaluate(() => [...document.body.children].filter((e) => {
  const s = getComputedStyle(e);
  if (s.position !== 'fixed' || +s.opacity < 0.02) return false;
  if (!(parseInt(s.zIndex, 10) > 0)) return false;
  const r = e.getBoundingClientRect();
  return r.width > innerWidth * 0.9 && r.height > innerHeight * 0.9;
}).map((e) => e.id || e.className || e.tagName));

const durate = await p.evaluate(() => {
  const c = getComputedStyle(document.documentElement);
  const ms = (n) => { const v = c.getPropertyValue(n).trim(); const x = parseFloat(v) || 0; return /ms$/.test(v) ? x : x * 1000; };
  return { uscita: ms('--t-uscita'), scambio: ms('--t-scambio'), sfalso: ms('--sfalso') };
});

await b.close();
await chiudiSito();

const esiti = [];
const dice = (ok, msg, extra = '') => { esiti.push(ok); console.log(`  ${ok ? '✓' : '✗'} ${msg}${!ok && extra ? `  → ${extra}` : ''}`); };

const scene = passaggi.filter((x) => x.esce);
const azioni = passaggi.filter((x) => !x.esce && x.scambio);
const muti = passaggi.filter((x) => !x.esce && !x.scambio);

console.log(`\n${passaggi.length} passaggi fra schede vicine: ${scene.length} da scena a scena, ${azioni.length} da azione ad azione.\n`);

dice(scene.length > 0, 'cambiare sezione fa uscire la vignetta vecchia');
dice(azioni.length > 0, 'muoversi dentro la stessa sezione NON la fa uscire: e\' la stessa scena');
dice(muti.length <= 1, 'ogni passaggio ha il suo stacco', muti.map((x) => `${x.da}→${x.a}`).join(' · '));
const senzaEntrata = scene.filter((x) => !x.scena);
dice(!senzaEntrata.length, 'e quella nuova entra dal verso giusto (scostamento vero, non solo la classe)',
  senzaEntrata.slice(0, 4).map((x) => `${x.da}→${x.a}`).join(' · '));
dice(!veli.length, 'non resta nessun velo a tutto schermo sopra alla pagina', veli.join(' · '));
dice(durate.uscita > 0 && durate.uscita <= 200, 'l\'uscita e\' corta: uno stacco, non una dissolvenza', `${durate.uscita}ms`);
dice(durate.sfalso > 0 && durate.sfalso <= 60, 'i blocchi si sfalsano di poco', `${durate.sfalso}ms`);
dice(interruttori.leggero.visto === true,
  'la modalita\' leggera non spegne lo stacco: serve al carico, non al movimento');
dice(interruttori['meno-moto'].visto === false,
  'chi ha chiesto meno movimento non lo vede');

const rossi = esiti.filter((x) => !x).length;
if (SELFTEST) {
  if (rossi) { console.log('\nAutoprova: con un solo stacco per tutti il cancello se ne accorge. ✓\n'); process.exit(0); }
  console.log('\nAutoprova FALLITA: il cancello non distingue i due stacchi.\n');
  process.exit(1);
}
console.log(rossi ? '\ncancello ROSSO ✗\n' : '\nOgni spostamento ha lo stacco che gli tocca. ✓\n');
process.exit(rossi ? 1 : 0);
