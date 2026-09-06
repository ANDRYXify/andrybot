// Cancello delle NUVOLETTE: chi non ha un nome deve almeno averlo qui.
//
// Perche' esiste. Il pannello ha quasi mille controlli, e la tentazione era
// mettere una nuvoletta su tutti. Sarebbe stato peggio di niente: novecento
// nuvolette che ripetono l'etichetta accanto insegnano a non leggerle piu', e
// quando finalmente ne arriva una che dice qualcosa nessuno la guarda.
//
// La regola e' un'altra: una nuvoletta spiega quello che l'etichetta NON dice.
// E c'e' un caso in cui l'etichetta non dice niente perche' non esiste — i
// tasti fatti di sola icona. Li' la nuvoletta e' l'unico nome che quel tasto ha,
// e non e' un vezzo: chi naviga con un lettore di schermo, senza, sente
// «pulsante» e basta.
//
// Cosa misura, e perche' col browser. «Ha una sola icona» non si vede leggendo
// il codice: dipende da cosa viene reso. Quindi si apre il pannello, si girano
// tutte le schede e per ogni controllo si chiede il suo NOME ACCESSIBILE —
// il testo dentro, oppure aria-label, oppure la nuvoletta. Zero nome = rosso.
//
// E il contrario: una nuvoletta che ripete parola per parola l'etichetta che ha
// accanto e' rumore, e va tolta. Anche quella e' rossa.
//
// La copertura si CONTA e si stampa, ma non e' un cancello: «quante nuvolette
// ci sono» non e' una domanda con una risposta giusta.
//
// Uso: node scripts/verifica-nuvolette.mjs
//      node scripts/verifica-nuvolette.mjs --selftest   (deve diventare rosso)

import { apriSito } from './_sito.mjs';

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const CACCIA = `(() => {
  const pulito = (t) => String(t || '').replace(/\\s+/g, ' ').trim();
  const nome = (e) => (e.tagName.toLowerCase() + (String(e.className || '').trim()
    ? '.' + String(e.className).split(/\\s+/).filter(Boolean).slice(0, 2).join('.') : '')).slice(0, 40);
  const muti = [];
  const doppie = [];
  let controlli = 0, connuvoletta = 0;
  for (const e of document.querySelectorAll('.pannello-scheda.visibile button, .pannello-scheda.visibile a.btn, .pannello-scheda.visibile [role="button"], .pannello-scheda.visibile [role="tab"]')) {
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    controlli += 1;
    const aiuto = pulito(e.getAttribute('data-aiuto') || e.getAttribute('title'));
    if (aiuto) connuvoletta += 1;
    const scritto = pulito(e.textContent);
    const etichetta = pulito(e.getAttribute('aria-label'));
    if (!scritto && !etichetta && !aiuto) muti.push({ chi: nome(e), id: e.id || '' });
    if (aiuto && scritto && aiuto.toLowerCase() === scritto.toLowerCase()) doppie.push({ chi: nome(e), testo: aiuto.slice(0, 40) });
  }
  return { muti, doppie, controlli, connuvoletta };
})()`;

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.addStyleTag({ content: '.giro-velo,.giro-fumetto,#cookie-banner{display:none!important}' });
if (SELFTEST) {
  // Un tasto di sola icona senza nome: com'erano prima che se ne parlasse.
  await p.evaluate(() => {
    const dove = document.querySelector('.pannello-scheda.visibile') || document.body;
    const t = document.createElement('button');
    t.className = 'btn mini prova-muta';
    t.innerHTML = '<svg width="16" height="16"><circle cx="8" cy="8" r="6"/></svg>';
    dove.prepend(t);
    window.__provaMuta = t;
  });
}

const muti = [];
const doppie = [];
let controlli = 0, connuvoletta = 0;
const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
let visitate = 0;
for (const id of schede) {
  try { await p.evaluate((x) => window.SB_APP.vai(x), id); } catch { continue; }
  await p.waitForTimeout(150);
  visitate += 1;
  if (SELFTEST) {
    await p.evaluate(() => {
      const dove = document.querySelector('.pannello-scheda.visibile');
      if (dove && window.__provaMuta && !dove.contains(window.__provaMuta)) dove.prepend(window.__provaMuta);
    });
  }
  const r = await p.evaluate(new Function('return ' + CACCIA));
  controlli += r.controlli; connuvoletta += r.connuvoletta;
  for (const x of r.muti) if (!muti.some((y) => y.chi === x.chi && y.id === x.id)) muti.push({ dove: id, ...x });
  for (const x of r.doppie) if (!doppie.some((y) => y.chi === x.chi && y.testo === x.testo)) doppie.push({ dove: id, ...x });
}

await b.close();
await chiudiSito();

const esiti = [];
const dice = (ok, msg, extra = '') => { esiti.push(ok); console.log(`  ${ok ? '✓' : '✗'} ${msg}${!ok && extra ? `  → ${extra}` : ''}`); };

console.log(`\n${visitate} schede, ${controlli} controlli guardati.\n`);
dice(!muti.length, 'ogni controllo ha un nome: nessuno e\' solo un\'icona muta',
  muti.slice(0, 6).map((x) => `${x.chi}${x.id ? '#' + x.id : ''} (${x.dove})`).join(' · '));
dice(!doppie.length, 'e nessuna nuvoletta ripete l\'etichetta che ha accanto',
  doppie.slice(0, 5).map((x) => `${x.chi}: «${x.testo}» (${x.dove})`).join(' · '));
console.log(`  · nuvolette: ${connuvoletta} su ${controlli} controlli`);

const rossi = esiti.filter((x) => !x).length;
if (SELFTEST) {
  if (rossi) { console.log('\nAutoprova: un tasto di sola icona senza nome si vede. ✓\n'); process.exit(0); }
  console.log('\nAutoprova FALLITA: il cancello non vede un tasto senza nome.\n');
  process.exit(1);
}
console.log(rossi ? '\ncancello ROSSO ✗\n' : '\nOgni cosa che si puo\' premere si sa come si chiama. ✓\n');
process.exit(rossi ? 1 : 0);
