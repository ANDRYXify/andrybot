#!/usr/bin/env node
// NASCOSTO DEVE VOLER DIRE NASCOSTO.
//
// In HTML c'e' un modo solo per dire «questo adesso non c'e'»: l'attributo
// `hidden`. Il browser lo traduce in `display: none` con una regola del suo
// foglio di base — e il foglio di base perde contro QUALUNQUE regola nostra.
// Basta una classe che dichiara un `display` (`.btn { display: inline-flex }`)
// e quell'elemento resta in pagina, mentre il codice e' convinto di averlo
// tolto.
//
// E' successo: tredici cose nel pannello dicevano «nascondimi» e si vedevano
// lo stesso. Il tasto «Scollega tutto» c'era anche senza niente da scollegare,
// «Ferma la diretta» anche senza diretta, «Costruisci» prima di sapere cosa
// costruire. Nessun collaudo se n'era accorto, perche' tutti guardavano se
// l'elemento era «hidden» — e lo era.
//
// La cura e' una riga sola in testa a ogni foglio servito:
//   [hidden] { display: none !important; }
// Non e' un martello: e' che «nascosto» non e' una proposta di stile, e
// nessuna classe deve poter vincere quella discussione.
//
// Questo cancello non guarda il CSS: guarda la PAGINA. Apre il pannello e le
// pagine pubbliche in un browser vero e chiede al browser, per ogni elemento
// che dice `hidden`, se davvero non si vede.
import { apriSito, apriBrowser, overlayFinto } from './_sito.mjs';

const ovl = overlayFinto({});
const sito = await apriSito({ overlay: ovl });
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }

// Le pagine, e quanto aspettare che si riempiano da sole.
const PAGINE = [
  ['/?demo=1', 1500, 'il pannello'],
  ['/collega/prova', 700, 'la pagina che collega Discord'],
  ['/mod.html', 900, 'la porta dei moderatori'],
  ['/privacy.html', 500, 'le pagine di servizio'],
  ['/overlay.html?t=prova', 900, 'l\'overlay'],
];

let bugiardi = 0;
const guai = [];
for (const [via, attesa, nome] of PAGINE) {
  const pg = await br.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await pg.goto(sito.base + via, { waitUntil: 'domcontentloaded' });
    await pg.waitForTimeout(attesa);
    const trovati = await pg.evaluate(() => [...document.querySelectorAll('[hidden]')]
      .filter((n) => getComputedStyle(n).display !== 'none')
      .map((n) => (n.id || n.className || n.tagName).toString().slice(0, 40) + ' (display: ' + getComputedStyle(n).display + ')'));
    console.log(`  ${trovati.length ? '✗' : '✓'} ${nome}: ${trovati.length ? trovati.length + ' che si vedono lo stesso' : 'quello che e\' nascosto non si vede'}`);
    for (const t of trovati) console.log('      ' + t);
    bugiardi += trovati.length;
    if (trovati.length) guai.push(via);
  } catch (e) {
    console.log(`  ✗ ${nome}: non si e' potuta guardare — ${String(e?.message || e).split('\n')[0]}`);
    bugiardi++;
    guai.push(via);
  } finally { await pg.close(); }
}

await br.close();
sito.chiudi();

if (bugiardi) {
  console.error(`\n${bugiardi} elementi dicono «nascondimi» e restano in pagina (${guai.join(', ')}).`);
  console.error('La cura e\' «[hidden] { display: none !important; }» in testa al foglio di quella pagina.');
  process.exit(1);
}
console.log('\nQuello che il codice nasconde, l\'occhio non lo trova. ✓');
