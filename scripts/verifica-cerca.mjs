// Cancello della RICERCA nel pannello.
//
// La domanda a cui deve rispondere: se una cosa si vede nel pannello, la
// ricerca la trova? Non «trova qualcosa di simile», non «trova la scheda dove
// sta»: trova QUELLA COSA, al primo posto.
//
// Perche' era rotta per costruzione. L'indice erano ventiquattro voci scritte a
// mano — una per scheda — piu' una riga di parole chiave per ciascuna, scritte
// anche quelle a mano. Il pannello pero' ha ottocentotrenta destinazioni vere:
// i titoli delle carte, le etichette dei campi, i riassunti dei pieghevoli, i
// bottoni. Cercare «spessore del bordo» non poteva funzionare: quella cosa
// nell'indice non c'era. Usciva il ripiego per somiglianza di lettere, che
// rispondeva Stato, Personalita', Giochi.
//
// La prova non e' un elenco di ricerche scritte a mano: quella sarebbe la
// stessa cosa in due posti, con l'elenco che invecchia mentre il pannello
// cambia. Le etichette si RACCOLGONO dal pannello, se ne prende un campione
// regolare (ogni k-esima, sempre le stesse), e per ognuna si chiede: cercando
// il suo testo esatto, esce lei per prima? Il campione cresce col pannello e
// non va aggiornato a mano.
//
// In piu' una manciata di domande dette come le direbbe una persona («come
// blocco i bot»), che l'elenco raccolto non copre.
//
// Uso: node scripts/verifica-cerca.mjs
//      node scripts/verifica-cerca.mjs --selftest   (deve diventare rosso)

import { apriSito } from './_sito.mjs';

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');
const CAMPIONE = 40;          // quante etichette raccolte si provano
const SOGLIA = 0.9;           // quante ne devono uscire prime

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

// Domande dette come le direbbe una persona: qui il testo cercato NON compare
// da nessuna parte nel pannello, e deve arrivarci lo stesso.
const A_PAROLE = [
  { q: 'come blocco i bot', scheda: ['scudo', 'regole'] },
  { q: 'alert su obs', scheda: ['alert'] },
  { q: 'mettere una gif quando riscattano', scheda: ['effetti', 'alert'] },
  { q: 'chiave api', scheda: ['moduli'] },
  { q: 'comandi a voce', scheda: ['ascolto'] },
  { q: 'quanto costa', scheda: ['sottoscrizione', 'stato'] },
];

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP && window.SB_CERCA, null, { timeout: 20000 });
await p.addStyleTag({ content: '#cookie-banner{display:none!important}' });

// Si passa da tutte le schede: molte riempiono le loro liste dopo una chiamata,
// e quello che non e' ancora stato disegnato non si puo' cercare.
const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
for (const id of schede) {
  try { await p.evaluate((x) => window.SB_APP.vai(x), id); } catch { continue; }
  await p.waitForTimeout(420);
}

// Le destinazioni vere del pannello, raccolte qui dentro in modo indipendente
// da come le raccoglie la ricerca: se le due raccolte fossero la stessa
// funzione, il cancello direbbe solo che quella funzione e' uguale a se stessa.
const destinazioni = await p.evaluate(() => {
  const pulito = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  const out = [];
  const A = window.SB_APP;
  for (const pan of document.querySelectorAll('.pannello-scheda')) {
    const scheda = pan.dataset.scheda;
    if (A.schedaValida && !A.schedaValida(scheda)) continue;
    for (const el of pan.querySelectorAll('label.campo, .carta > h3, .carta > h4, details > summary')) {
      const t = pulito(el.childNodes.length ? [...el.childNodes]
        .filter((n) => n.nodeType === 3 || (n.nodeType === 1 && !/tenue|suggerimento|badge/.test(n.className || '')))
        .map((n) => n.textContent).join(' ') : el.textContent);
      if (t.length < 4 || t.length > 44) continue;
      if (!/[a-zà-ú]/i.test(t)) continue;
      out.push({ scheda, testo: t });
    }
  }
  return out;
});

// Le due raccolte — questa e quella della ricerca — restano indipendenti, ma
// il confronto e' sul senso: «Costo ( monete )» e «Costo (monete)» sono la
// stessa etichetta, e un cancello che le distingue misura la punteggiatura.
const senso = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();
const stessoTesto = (a, b) => senso(a) === senso(b);

const viste = new Set();
const uniche = destinazioni.filter((d) => {
  const k = d.scheda + '|' + d.testo.toLowerCase();
  if (viste.has(k)) return false;
  viste.add(k);
  return true;
});
// La stessa etichetta puo' stare in piu' schede: «Posizione» c'e' nelle
// penitenze e nell'Overlay Studio, e sono due risposte giuste. Si chiede che
// esca QUELLA ETICHETTA, non che indovini in quale delle due la volevi.
const dove = new Map();
for (const d of uniche) {
  const k = senso(d.testo);
  if (!dove.has(k)) dove.set(k, new Set());
  dove.get(k).add(d.scheda);
}

const passo = Math.max(1, Math.floor(uniche.length / CAMPIONE));
const provate = uniche.filter((_, i) => i % passo === 0).slice(0, CAMPIONE);

async function chiedi(testo) {
  return p.evaluate(async (q) => {
    if (!document.getElementById('cerca-overlay')?.classList.contains('aperto')) window.SB_CERCA.apri();
    const inp = document.getElementById('cerca-input');
    inp.value = q;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 160));
    const prime = [...document.querySelectorAll('#cerca-overlay .cerca-voce')].slice(0, 3);
    return prime.map((v) => ({
      testo: (v.querySelector('b')?.textContent || '').replace(/\s+/g, ' ').trim(),
      id: v.dataset.id || '',
    }));
  }, testo);
}

if (SELFTEST) {
  // La ricerca com'era: conosceva solo i nomi delle schede, e dentro le schede
  // non guardava. Si toglie ai pannelli il segno che li lega alla loro scheda,
  // cosi' la raccolta dal pannello non trova niente e resta l'indice scritto a
  // mano. Si fa DOPO aver raccolto le destinazioni, che servono per chiedere.
  await p.evaluate(() => {
    for (const pan of document.querySelectorAll('.pannello-scheda')) {
      pan.setAttribute('data-scheda-era', pan.dataset.scheda);
      pan.removeAttribute('data-scheda');
    }
  });
}
const sbagliate = [];
let prese = 0;
for (const d of provate) {
  const r = await chiedi(d.testo);
  const primo = r[0];
  const ok = primo && stessoTesto(primo.testo, d.testo) && dove.get(senso(d.testo)).has(primo.id);
  if (ok) prese += 1;
  else sbagliate.push({ cercato: d.testo, dove: d.scheda, uscito: primo ? `${primo.testo} (${primo.id})` : '—' });
}

// Trovare non basta: bisogna ARRIVARCI. Aprire la scheda giusta e lasciare
// l'utente in cima a una pagina lunga non e' una risposta — la cosa deve
// finire sotto gli occhi, anche se sta dentro un pieghevole chiuso o dietro a
// una sottoscheda. Qui si clicca davvero il primo risultato e si guarda dove
// si e' finiti.
const nonArrivate = [];
for (const d of provate.filter((_, i) => i % 7 === 0).slice(0, 6)) {
  const r = await p.evaluate(async (testo) => {
    if (!document.getElementById('cerca-overlay').classList.contains('aperto')) window.SB_CERCA.apri();
    const inp = document.getElementById('cerca-input');
    inp.value = testo;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((x) => setTimeout(x, 200));
    const prima = document.querySelector('#cerca-overlay .cerca-voce');
    if (!prima) return { scheda: '', segnato: false, inVista: false };
    prima.click();
    await new Promise((x) => setTimeout(x, 2000));
    const m = document.querySelector('.cerca-mira');
    const b = m && m.getBoundingClientRect();
    return {
      scheda: document.querySelector('.pannello-scheda.visibile')?.dataset.scheda || '',
      segnato: !!m,
      inVista: !!(b && b.top > -20 && b.bottom < window.innerHeight + 20),
    };
  }, d.testo);
  if (!r.segnato || !r.inVista) nonArrivate.push({ q: d.testo, dove: r.scheda, segnato: r.segnato, inVista: r.inVista });
}

const aParole = [];
for (const c of A_PAROLE) {
  const r = await chiedi(c.q);
  const primo = r[0];
  if (!primo || !c.scheda.includes(primo.id)) {
    aParole.push({ q: c.q, atteso: c.scheda.join('/'), uscito: primo ? `${primo.testo} (${primo.id})` : '—' });
  }
}

await b.close();
await chiudiSito();

const esiti = [];
const dice = (ok, msg, extra = '') => { esiti.push(ok); console.log(`  ${ok ? '✓' : '✗'} ${msg}${!ok && extra ? `  → ${extra}` : ''}`); };

console.log(`\n${uniche.length} destinazioni nel pannello, ${provate.length} provate una per una.\n`);
dice(prese >= Math.ceil(provate.length * SOGLIA),
  `cercando quello che c'e' scritto, esce quello (${prese}/${provate.length})`,
  sbagliate.slice(0, 5).map((x) => `«${x.cercato}» (${x.dove}) → ${x.uscito}`).join(' · '));
dice(!nonArrivate.length, 'e cliccando ci si arriva davvero: la cosa finisce sotto gli occhi',
  nonArrivate.map((x) => `«${x.q}» → ${x.dove || 'nessuna scheda'}${x.segnato ? ' (segnata ma fuori vista)' : ' (non segnata)'}`).join(' · '));
dice(!aParole.length, 'e una domanda detta a parole arriva nella scheda giusta',
  aParole.slice(0, 4).map((x) => `«${x.q}» voleva ${x.atteso}, ha dato ${x.uscito}`).join(' · '));
for (const x of sbagliate) console.log(`  · non prima: «${x.cercato}» (${x.dove}) → ${x.uscito}`);

const rossi = esiti.filter((x) => !x).length;
if (SELFTEST) {
  if (rossi) { console.log('\nAutoprova: una ricerca che sa solo i nomi delle schede si vede. ✓\n'); process.exit(0); }
  console.log('\nAutoprova FALLITA: il cancello non vede la differenza.\n');
  process.exit(1);
}
console.log(rossi ? '\ncancello ROSSO ✗\n' : '\nQuello che si vede nel pannello, si trova. ✓\n');
process.exit(rossi ? 1 : 0);
