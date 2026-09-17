// Cancello dell'HYPE TRAIN in scena.
//
// La promessa e' una sola, e non e' «funziona»: quello che sta sull'overlay e'
// il treno DI TWITCH, non una nostra ricostruzione. Da li' vengono i difetti
// che questo cancello impedisce, e sono tutti difetti che in diretta non si
// vedono finche' non e' tardi:
//
//  · un treno SCADUTO che resta a schermo. Twitch dice quando finisce; se
//    quell'istante non lo si guarda, il treno resta li' per sempre e chi
//    guarda pensa che stia ancora correndo;
//  · un treno che non si aggiorna da solo: arriva un contributo, il livello
//    sale su Twitch e a schermo no;
//  · un elemento spento che si vede lo stesso — cioe' una scelta dello
//    streamer che non conta niente.
//
//   node scripts/verifica-treno.mjs              → esce 1 se qualcosa non torna
//   node scripts/verifica-treno.mjs --selftest   → rompe e pretende il rosso
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apriSito, apriBrowser, overlayFinto } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');

const ROTTURE = [
  ['src/web/public/overlay-app.js', "|| !t || !(Number(t.scade) > ora)) return togliTreno();", '|| !t) return togliTreno();',
    'un treno scaduto resta a schermo per sempre'],
  ['src/web/public/overlay-app.js', "!cfg.attivo || !mostra('treno')", '!cfg.attivo',
    'spegnere il treno in un overlay non lo spegne'],
  ['src/web/public/overlay-app.js', "    else if (dati.tipo === 'treno') { MIO.trenoStato = dati.treno || null; disegnaTreno(); }\n", '',
    'il treno non si aggiorna quando Twitch dice che e\' salito'],
  ['src/web/public/overlay-app.js', "const chi = (cfg.mostraChi && Array.isArray(t.chi) && t.chi.length) ? t.chi[0].nome : '';",
    "const chi = (Array.isArray(t.chi) && t.chi.length) ? t.chi[0].nome : '';",
    'chi ha spinto di piu\' compare anche a chi ha detto di no'],
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

const CFG = { attivo: true, titolo: 'Hype train', mostraChi: true, mostraRecord: false, posizione: 'alto-destra', xy: null, stile: {} };
const TRENO = (o = {}) => ({
  id: 't1', livello: 2, quanto: 150, meta: 500, totale: 400, tipo: 'normale', condiviso: false,
  inizio: Date.now() - 60000, scade: Date.now() + 300000, finito: false, record: 9,
  chi: [{ nome: 'Mario', quanti: 900, come: 'bit' }],
  ...o,
});

// Un giro: si decide cosa mostra l'overlay e che treno c'e', si apre la pagina
// e si guarda cosa e' rimasto a schermo. La firma del tema serve a non leggere
// la pagina prima che il tema sia stato APPLICATO, non solo servito.
async function giro(cfg, treno, { mostra = {}, poi = null } = {}) {
  TEMA = { css: FIRMA, widget: {}, goals: [], conti: {}, musica: null, timer: null, treno: cfg, stato: treno ? { treno } : {}, mostra, xy: {}, alertStile: null, chatStile: null };
  const page = await browser.newPage();
  page.on('pageerror', (e) => errori.push(String(e.message || e)));
  await page.goto(base + '/overlay/prova?key=x');
  await page.waitForFunction((f) => document.getElementById('css-utente')?.textContent.includes(f), FIRMA, { timeout: 15000 });
  if (poi) {
    for (let i = 0; i < 100 && ovl.st.stream.length < 1; i++) await attesa(50);
    ovl.manda({ tipo: 'treno', treno: poi });
  }
  await attesa(400);
  const letto = await page.$$eval('.ovl-treno', (l) => l.map((n) => ({
    tit: (n.querySelector('.tr-tit') || {}).textContent || '',
    liv: (n.querySelector('.tr-liv') || {}).textContent || '',
    chi: (n.querySelector('.tr-chi') || {}).textContent || '',
    tempo: (n.querySelector('.tr-tempo') || {}).textContent || '',
    q: (n.querySelector('.tr-barra i') || { style: { getPropertyValue: () => '' } }).style.getPropertyValue('--q'),
    classi: n.className,
  })));
  await page.close();
  return letto[0] || null;
}

try {
  // 1. UN TRENO IN CORSO SI VEDE, COL LIVELLO E LA BARRA CHE DICE TWITCH.
  let r = await giro(CFG, TRENO());
  dice(!!r, 'un treno in corso compare in scena', 'non c\'e\' niente a schermo');
  dice(!!r && /liv\. 2/.test(r.liv), 'col livello che dice Twitch', r ? `dice: ${r.liv}` : '');
  dice(!!r && Math.abs(Number(r.q) - 0.3) < 0.01, 'e la barra alla frazione giusta (150 su 500)', r ? `q=${r.q}` : '');
  dice(!!r && r.chi === 'Mario', 'con chi ha spinto di piu\'', r ? `dice: «${r.chi}»` : '');
  dice(!!r && /\d/.test(r.tempo), 'e quanto manca alla scadenza', r ? `dice: «${r.tempo}»` : '');

  // 2. SPENTO E' SPENTO. Sia dall'interruttore dell'elemento, sia dall'overlay.
  r = await giro({ ...CFG, attivo: false }, TRENO());
  dice(!r, 'con l\'elemento spento non compare niente', 'si vede lo stesso');
  r = await giro(CFG, TRENO(), { mostra: { treno: false } });
  dice(!r, 'e un overlay che non lo vuole non ce l\'ha', 'compare in un overlay che l\'ha spento');

  // 3. UN TRENO SCADUTO NON E' UN TRENO.
  r = await giro(CFG, TRENO({ scade: Date.now() - 1000 }));
  dice(!r, 'un treno scaduto non resta a schermo', 'e\' rimasto li\' a dire che sta correndo');
  r = await giro(CFG, null);
  dice(!r, 'e senza nessun treno non c\'e\' nessun riquadro vuoto', 'c\'e\' un riquadro senza treno dentro');

  // 4. SI AGGIORNA DA SOLO. Twitch dice che e' salito, e la scena lo segue
  //    senza che nessuno ricarichi niente.
  r = await giro(CFG, TRENO(), { poi: TRENO({ livello: 5, quanto: 450, chi: [{ nome: 'Giada', quanti: 2000, come: 'sub' }] }) });
  dice(!!r && /liv\. 5/.test(r.liv), 'quando sale di livello, la scena lo segue da sola', r ? `dice ancora: ${r.liv}` : 'sparito');
  dice(!!r && r.chi === 'Giada', 'e cambia anche chi sta spingendo', r ? `dice: «${r.chi}»` : '');

  // 5. LE DUE SCELTE CHE SONO SOLO SUE.
  r = await giro({ ...CFG, mostraChi: false }, TRENO());
  dice(!!r && !r.chi, 'chi non vuole il nome di chi spinge non se lo ritrova', r ? `c'e' scritto: «${r.chi}»` : '');
  r = await giro({ ...CFG, mostraRecord: true }, TRENO());
  dice(!!r && /rec\. 9/.test(r.liv), 'chi vuole il record del canale lo vede', r ? `dice: ${r.liv}` : '');

  // 6. LA FINE. Il cartello resta il tempo di essere letto, e si vede che e' finito.
  r = await giro(CFG, TRENO({ finito: true, quanto: 0, meta: 0, scade: Date.now() + 15000 }));
  dice(!!r && /finito/.test(r.classi), 'a treno finito il cartello resta, e dice che e\' finito', r ? `classi: ${r.classi}` : 'non c\'e\' piu\' niente');
  dice(!!r && !r.tempo, 'e non conta piu\' niente alla rovescia', r ? `conta ancora: «${r.tempo}»` : '');
} finally {
  await browser.close();
  await chiudi();
}

dice(errori.length === 0, 'nessun errore nella pagina', errori.join(' · '));

console.log('\nIl treno che si vede e\' quello di Twitch, finche\' Twitch dice che c\'e\'.\n');
for (const e of esiti) console.log(`  ${e.ok ? '✓' : '✗'} ${e.msg}${!e.ok && e.extra ? ` — ${e.extra}` : ''}`);
const verde = esiti.every((e) => e.ok);
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
