// Collaudo degli SCHELETRI: aperta una scheda, niente resta «in caricamento».
//
// Perche' esiste. La scheda Telegram mostrava «Auguri di compleanno» sotto lo
// scheletro di caricamento, e ci restava: chi la riempiva (caricaCompleanni)
// partiva solo aprendo «I tuoi social», la scheda dove stava prima che Telegram
// avesse la sua. Con lei, altri tre riquadri. Da fuori sembrava lentezza; era
// un caricatore agganciato alla scheda sbagliata, e nessuna prova lo vedeva,
// perche' ogni pezzo, da solo, funzionava.
//
// Cosa misura. Scheda per scheda, sulla demo (che risponde subito): dopo tre
// secondi, nella scheda aperta non deve restare nessuno scheletro (`.attesa`),
// tranne dentro un riquadro nascosto apposta (`[hidden]`). Se ne resta uno,
// dice dentro quale riquadro: e' il nome del caricatore che non e' partito.
//
// Ogni scheda si apre da una pagina appena caricata, come chi arriva da un
// link. Aprendole una dopo l'altra nella stessa pagina il difetto non si vede:
// «I tuoi social» viene prima di Telegram, e il suo caricatore riempiva in
// anticipo il riquadro dell'altra scheda. La prima versione di questo
// collaudo era verde proprio sul difetto che doveva trovare, e la seconda
// anche: misurava prima che la scheda nuova fosse a schermo.
//
// Uso: node scripts/verifica-scheletri.mjs
//      node scripts/verifica-scheletri.mjs --selftest   (deve diventare rosso)

import { apriSito } from './_sito.mjs';

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');
const ATTESA_MS = 3000;

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const RESTANO = `(() => [...document.querySelectorAll('.pannello-scheda.visibile .attesa')]
  .filter((e) => !e.closest('[hidden]'))
  .map((e) => { const casa = e.parentElement?.closest('[id]'); return casa ? '#' + casa.id : '(senza nome)'; }))()`;

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const fresca = async () => {
  await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  await p.addStyleTag({ content: '.giro-velo,.giro-fumetto,#cookie-banner{display:none!important}' });
};

await fresca();
const schede = await p.evaluate(() => [...new Set([...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda))]);
const ferme = [];
for (const id of schede) {
  await fresca();
  try { await p.evaluate((x) => window.SB_APP.vai(x), id); } catch { continue; }
  // Il cambio di scheda ha la sua uscita: finche' non c'e' a schermo il
  // pannello giusto, si misurerebbe quello di prima (la prima versione misurava
  // «Stato», senza scheletri, e usciva verde).
  const arrivata = await p.waitForFunction((x) => document.querySelector(`.pannello-scheda.visibile[data-scheda="${x}"]`), id, { timeout: 5000 }).then(() => true, () => false);
  if (!arrivata) { ferme.push({ id, dove: ['(la scheda non si apre)'] }); continue; }
  if (SELFTEST && id === schede[schede.length - 1]) {
    await p.evaluate(() => { document.querySelector('.pannello-scheda.visibile')?.insertAdjacentHTML('beforeend', '<div id="prova-ferma"><p class="attesa"></p></div>'); });
  }
  let restano = [];
  for (let t = 0; t <= ATTESA_MS; t += 250) {
    restano = await p.evaluate(new Function('return ' + RESTANO));
    if (!restano.length) break;
    await p.waitForTimeout(250);
  }
  if (restano.length) ferme.push({ id, dove: [...new Set(restano)] });
}

await b.close();
await chiudiSito();

for (const f of ferme) console.log(`  ✗ ${f.id}: resta in caricamento ${f.dove.join(', ')}`);
console.log(`\n${schede.length} schede aperte, ognuna da una pagina appena caricata, ${ATTESA_MS / 1000} secondi a testa.`);
if (ferme.length) {
  console.log(`${ferme.length} ${ferme.length === 1 ? 'scheda resta' : 'schede restano'} in caricamento: un caricatore non parte con la sua scheda.`);
} else {
  console.log('Ogni scheda si riempie da sola quando la apri. ✓');
}
process.exit(ferme.length ? 1 : 0);
