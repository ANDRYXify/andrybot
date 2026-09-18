// Cancello dei CARTELLI: una scritta o un'immagine tua, ferma in scena.
//
// Sono la stessa cosa e stanno in una lista sola, quindi il difetto che gira
// qui intorno non e' «non funziona»: e' che i due tipi si comportino in modo
// diverso senza un motivo. E ce ne sono due che in diretta non si vedono
// finche' non fanno danno:
//
//  · un cartello VUOTO — una scritta senza parole, un'immagine senza immagine —
//    non deve lasciare in scena una scatola vuota col solo sfondo;
//  · «nessuno sfondo» deve voler dire nessuno sfondo. Il riquadro si disegna a
//    due strati (la cornice sotto, il riempimento sopra): finche' il
//    riempimento e' opaco copre tutto, ma a opacita' zero la cornice riappare
//    come una lastra piena del colore d'accento. Vale per ogni elemento, non
//    solo per i cartelli.
//
//   node scripts/verifica-cartelli.mjs              → esce 1 se qualcosa non torna
//   node scripts/verifica-cartelli.mjs --selftest   → rompe e pretende il rosso
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apriSito, apriBrowser, overlayFinto } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');

const ROTTURE = [
  ['src/web/public/overlay-skin.css', '.cornice-nessuna::before { background: none; }', '',
    'senza sfondo il cartello diventa una lastra del colore d\'accento'],
  ['src/web/public/overlay-app.js', "  if (!immagine && !String(cfg.testo || '').trim()) return via();\n", '',
    'una scritta senza parole lascia in scena una scatola vuota'],
  ['src/web/public/overlay-app.js', "  if (immagine && !cfg.url) return via();\n", '',
    'un\'immagine che non c\'e\' lascia in scena una scatola vuota'],
  ['src/web/public/overlay-app.js', "if (!id || cfg.attivo === false || !mostra('cart') || !mostra('cart:' + id)) return via();",
    'if (!id || cfg.attivo === false) return via();',
    'spegnere un cartello in un overlay non lo spegne'],
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
    const via = join(RAD, file);
    const orig = readFileSync(via, 'utf8');
    if (!orig.includes(da)) { console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`); cieche++; continue; }
    writeFileSync(via, orig.replace(da, a));
    let rosso = false, uscita = '';
    try { uscita = execFileSync(process.execPath, [io], { cwd: RAD, encoding: 'utf8', stdio: 'pipe' }); } catch (e) { rosso = true; uscita = String(e.stdout || ''); }
    writeFileSync(via, orig);
    if (/saltato: manca Chromium/.test(uscita)) { console.log('  ✗  senza Chromium l\'autoprova non prova niente'); process.exit(1); }
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: il cancello non protegge quello che dice di proteggere.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await apriBrowser();
if (!browser) { console.log('  –  saltato: manca Chromium o Playwright'); process.exit(0); }

let TEMA = {};
const ovl = overlayFinto({ tema: () => TEMA });
const { base, chiudi } = await apriSito({ overlay: ovl });
const errori = [];
const FIRMA = '.tema-applicato';

const STILE = { dim: 'media', sfondo: '#0f0f14', opacita: 0, testo: '#ffffff', accento: '#f72fa7', bordoRaggio: 12, font: 'sistema', forma: 'carta', materia: 'piatta', cornice: 'nessuna' };
const CART = (o = {}) => ({ id: 'c1', attivo: true, tipo: 'scritta', nome: '', testo: 'TORNO SUBITO', effetto: '',
  larghezza: 0, allinea: 'sinistra', posizione: 'alto-sinistra', xy: null, stile: { ...STILE }, ...o });

async function giro(lista, mostra = {}) {
  TEMA = { css: FIRMA, widget: {}, goals: [], conti: {}, musica: null, timer: null, treno: null,
    cartelli: lista, stato: {}, mostra, xy: {}, alertStile: null, chatStile: null };
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errori.push(String(e.message || e)));
  await page.goto(base + '/overlay/prova?key=x');
  await page.waitForFunction((f) => document.getElementById('css-utente')?.textContent.includes(f), FIRMA, { timeout: 15000 });
  await attesa(400);
  const letto = await page.$$eval('.ovl-cartello', (l) => l.map((n) => {
    const b = getComputedStyle(n, '::before');
    const img = n.querySelector('img');
    return {
      classi: n.className,
      testo: img ? '' : n.textContent,
      img: img ? img.getAttribute('src') : null,
      cornice: b.backgroundColor,
      sfondo: getComputedStyle(n, '::after').backgroundColor,
      largo: Math.round(n.getBoundingClientRect().width),
    };
  }));
  await page.close();
  return letto;
}

// Trasparente si scrive in tanti modi: `rgba(0,0,0,0)`, `color(srgb 0 0 0 / 0)`,
// `transparent`. Quel che conta e' l'ULTIMO numero, cioe' l'alfa: si legge
// quello, invece di provare a indovinare la forma con cui il browser di turno
// ha deciso di stampare il colore.
const trasparente = (c) => {
  const s = String(c || '').trim();
  if (!s || s === 'transparent') return true;
  const n = s.match(/-?\d*\.?\d+/g);
  if (!n) return false;
  return /[,/]/.test(s.slice(s.lastIndexOf(n[n.length - 1]) - 2)) ? Number(n[n.length - 1]) === 0 : false;
};

try {
  // 1. LA SCRITTA. C'e', dice quel che deve, e senza sfondo non ha una scatola.
  let r = await giro([CART()]);
  dice(r.length === 1, 'una scritta compare in scena', `ne sono comparse ${r.length}`);
  dice(r[0] && r[0].testo === 'TORNO SUBITO', 'con le parole che ci hai scritto', r[0] ? `dice: «${r[0].testo}»` : '');
  dice(r[0] && trasparente(r[0].cornice) && trasparente(r[0].sfondo),
    'e «nessuno sfondo» vuol dire nessuno sfondo, cornice compresa',
    r[0] ? `cornice ${r[0].cornice}, riempimento ${r[0].sfondo}` : '');

  // 2. LO SFONDO, QUANDO LO SI CHIEDE. La stessa strada, al contrario.
  r = await giro([CART({ stile: { ...STILE, opacita: 90 } })]);
  dice(r[0] && !trasparente(r[0].sfondo), 'chi lo sfondo lo vuole, ce l\'ha', r[0] ? `riempimento ${r[0].sfondo}` : 'non c\'e\' nessun cartello');

  // 3. L'IMMAGINE. E' l'altro tipo, e passa dalla stessa porta.
  r = await giro([CART({ tipo: 'immagine', testo: '', url: '/icons/icon-192.png' })]);
  dice(r.length === 1 && r[0].img === '/icons/icon-192.png', 'un\'immagine compare al posto delle parole',
    r.length ? `img: ${r[0].img}` : 'non c\'e\' nessun cartello');
  dice(r[0] && /ca-immagine/.test(r[0].classi), 'e si veste da immagine, non da scritta', r[0] ? r[0].classi : '');

  // 4. I VUOTI NON LASCIANO SCATOLE.
  r = await giro([CART({ testo: '   ' })]);
  dice(r.length === 0, 'una scritta senza parole non lascia niente in scena', `e\' rimasto qualcosa: ${r.length}`);
  r = await giro([CART({ tipo: 'immagine', testo: '' })]);
  dice(r.length === 0, 'e un\'immagine che non c\'e\' nemmeno', `e\' rimasto qualcosa: ${r.length}`);

  // 5. GLI INTERRUTTORI: quello del cartello e quello dell'overlay.
  r = await giro([CART({ attivo: false })]);
  dice(r.length === 0, 'un cartello spento non si vede', 'si vede lo stesso');
  r = await giro([CART()], { cart: false });
  dice(r.length === 0, 'e un overlay che non vuole i cartelli non li ha', 'compaiono dove sono stati spenti');
  r = await giro([CART(), CART({ id: 'c2', testo: 'REGOLE' })], { 'cart:c2': false });
  dice(r.length === 1 && r[0].testo === 'TORNO SUBITO', 'si spengono uno per uno, non tutti insieme',
    `ne sono rimasti ${r.length}: ${r.map((x) => x.testo).join(' | ')}`);

  // 6. QUANTI SE NE VUOLE, E OGNUNO IL SUO.
  r = await giro([CART(), CART({ id: 'c2', tipo: 'immagine', testo: '', url: '/icons/icon-192.png' }), CART({ id: 'c3', testo: 'TERZO' })]);
  dice(r.length === 3, 'tre cartelli in scena, di tutti e due i tipi', `ne sono comparsi ${r.length}`);

  // 7. LA LARGHEZZA: a zero non va a capo, col numero sta stretto.
  const lungo = 'una riga molto lunga che senza un limite non andrebbe mai a capo da sola';
  const a = await giro([CART({ testo: lungo })]);
  const b = await giro([CART({ testo: lungo, larghezza: 20 })]);
  dice(a[0] && b[0] && b[0].largo < a[0].largo,
    'la larghezza scritta fa andare a capo; a zero il cartello e\' largo quanto la riga',
    a[0] && b[0] ? `senza limite ${a[0].largo}px, col limite ${b[0].largo}px` : '');
} finally {
  await browser.close();
  await chiudi();
}

dice(errori.length === 0, 'nessun errore nella pagina', errori.join(' · '));

console.log('\nUn cartello e\' tuo: quel che ci metti dentro, e niente attorno se non lo chiedi.\n');
for (const e of esiti) console.log(`  ${e.ok ? '✓' : '✗'} ${e.msg}${!e.ok && e.extra ? ` — ${e.extra}` : ''}`);
const verde = esiti.every((e) => e.ok);
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
