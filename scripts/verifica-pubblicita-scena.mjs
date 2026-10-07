// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello del CONTO ALLA PUBBLICITA' in scena (docs/PUBBLICITA.md).
//
// Il conto dice quanto manca a una cosa che decide Twitch. La promessa e' che
// a schermo ci sia quel conto e nient'altro, e i difetti che questo cancello
// impedisce sono tutti di quelli che in diretta si vedono troppo tardi:
//
//  · un conto fermo: il bot manda l'istante una volta, e se l'overlay non
//    conta da solo il numero resta li';
//  · un conto arrivato a zero che resta a schermo a dire 0:00;
//  · una pausa che comincia e la scena che non se ne accorge;
//  · la pausa che arriva mentre il conto a zero se ne sta andando, e resta
//    trasparente: c'e', ma non si vede (il difetto che si vedeva in diretta);
//  · le scelte dello streamer che non contano: da quanto prima mostrarlo, se
//    restare durante la pausa, l'interruttore, l'overlay che non lo vuole.
//
//   node scripts/verifica-pubblicita-scena.mjs              → esce 1 se qualcosa non torna
//   node scripts/verifica-pubblicita-scena.mjs --selftest   → rompe e pretende il rosso
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apriSito, apriBrowser, overlayFinto } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const OVL = 'src/web/public/overlay-app.js';

const ROTTURE = [
  [OVL, "  if (MIO.pubbl && MIO.pubbl.attivo) disegnaPubblicita();\n", '',
    'il conto non scende da solo fra un messaggio e l\'altro'],
  [OVL, "|| !mostra('pubblicita') || !manca)", '|| !mostra(\'pubblicita\'))',
    'a conto finito resta a schermo'],
  [OVL, "    else if (dati.tipo === 'pubblicita') {", "    else if (dati.tipo === 'pubblicita-no') {",
    'una pausa che comincia non arriva in scena'],
  [OVL, "&& (!cfg.mostraDa || prossima - ora <= cfg.mostraDa * 60000)", '',
    '«da quando si vede» non conta niente'],
  [OVL, '  rientra(pubblEl, el);\n', "  if (pubblEl.uscita) { clearTimeout(pubblEl.uscita); pubblEl.uscita = 0; el.classList.remove('esce'); }\n",
    'la pausa che arriva mentre il conto se ne va resta trasparente'],
  [OVL, "if (cfg.pausa !== false) { titolo", 'if (true) { titolo',
    'chi non lo vuole durante la pausa se lo ritrova'],
  [OVL, "!cfg.attivo || !mostra('pubblicita')", '!cfg.attivo',
    'spegnerlo in un overlay non lo spegne'],
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

const CFG = { attivo: true, titolo: 'Pubblicità fra', titoloPausa: 'Torno fra', mostraDa: 0, pausa: true, posizione: 'alto-destra', xy: null, stile: {} };
const secondi = (testo) => { const p = String(testo || '').split(':').map(Number); return p.reduce((a, n) => a * 60 + n, 0); };

// Un giro: si decide cosa mostra l'overlay e a che punto e' la pubblicita', si
// apre la pagina e si guarda cosa c'e' a schermo, anche dopo un po'. La firma
// del tema serve a non leggere la pagina prima che il tema sia stato APPLICATO.
async function giro(cfg, stato, { mostra = {}, poi = null, dopo = 0 } = {}) {
  TEMA = { css: FIRMA, widget: {}, goals: [], conti: {}, musica: null, timer: null, pubblicita: cfg ? { ...cfg, stato } : null, stato: {}, mostra, xy: {}, alertStile: null, chatStile: null };
  const page = await browser.newPage();
  page.on('pageerror', (e) => errori.push(String(e.message || e)));
  await page.goto(base + '/overlay/prova?key=x');
  await page.waitForFunction((f) => document.getElementById('css-utente')?.textContent.includes(f), FIRMA, { timeout: 15000 });
  if (poi) {
    for (let i = 0; i < 100 && ovl.st.stream.length < 1; i++) await attesa(50);
    // come il server vero: quello che l'evento dice, il tema lo sa gia'. Una
    // pagina che rilegge il tema in quel momento (succede all'apertura del
    // flusso) non deve tornare indietro per colpa del finto.
    TEMA = { ...TEMA, pubblicita: { ...TEMA.pubblicita, stato: poi } };
    ovl.manda({ tipo: 'pubblicita', ...poi });
  }
  await attesa(700);
  const leggi = () => page.$$eval('.ovl-pubblicita:not(.esce)', (l) => l.map((n) => ({
    tit: (n.querySelector('.t-tit') || {}).textContent || '',
    num: (n.querySelector('.t-num') || {}).textContent || '',
    classi: n.className,
    opacita: Number(getComputedStyle(n).opacity),
  })));
  const prima = (await leggi())[0] || null;
  let poiLetto = null;
  if (dopo) { await attesa(dopo); poiLetto = (await leggi())[0] || null; }
  await page.close();
  return { prima, poi: poiLetto };
}

try {
  // 1. UNA PAUSA IN PROGRAMMA SI VEDE, E IL CONTO SCENDE DA SOLO.
  let r = await giro(CFG, { prossima: Date.now() + 4 * 60000 + 30000, pausaFino: 0 }, { dopo: 2200 });
  dice(!!r.prima, 'una pausa in programma compare in scena', 'non c\'e\' niente a schermo');
  dice(!!r.prima && r.prima.opacita > 0.95, 'e si vede davvero, non trasparente', r.prima ? `opacita' ${r.prima.opacita}` : '');
  dice(!!r.prima && r.prima.tit === 'Pubblicità fra', 'col titolo di prima della pausa', r.prima ? `dice: «${r.prima.tit}»` : '');
  dice(!!r.prima && Math.abs(secondi(r.prima.num) - 270) <= 2, 'e quanto manca, preso dall\'istante che dice Twitch', r.prima ? `dice: ${r.prima.num}` : '');
  dice(!!r.poi && secondi(r.prima?.num) - secondi(r.poi.num) >= 2, 'il conto scende da solo, senza nessun messaggio', r.poi ? `da ${r.prima?.num} a ${r.poi.num}` : 'sparito');

  // 2. A ZERO SE NE VA: nessun 0:00 lasciato li'.
  r = await giro(CFG, { prossima: Date.now() + 1500, pausaFino: 0 }, { dopo: 2600 });
  dice(!!r.prima, 'un conto quasi finito si vede', 'non c\'era');
  dice(!r.poi, 'e arrivato a zero se ne va', r.poi ? `resta: «${r.poi.num}»` : '');

  // 3. LA PAUSA CHE COMINCIA ARRIVA IN SCENA, COL CONTO DEL RITORNO.
  r = await giro(CFG, { prossima: Date.now() + 20 * 60000, pausaFino: 0 }, { poi: { prossima: 0, pausaFino: Date.now() + 90000 } });
  dice(!!r.prima && r.prima.tit === 'Torno fra' && /in-pausa/.test(r.prima.classi), 'quando la pausa comincia, la scena conta il ritorno', r.prima ? `dice: «${r.prima.tit}» ${r.prima.classi}` : 'sparito');
  dice(!!r.prima && Math.abs(secondi(r.prima.num) - 90) <= 2, 'fino alla fine vera della pausa', r.prima ? `dice: ${r.prima.num}` : '');

  // 3b. IL CONTO ARRIVA A ZERO, COMINCIA AD ANDARSENE, E UN ATTIMO DOPO IL BOT
  // DICE CHE LA PAUSA E' COMINCIATA: e' l'ordine vero delle cose in diretta. Il
  // riquadro che torna mentre se ne va deve tornare visibile.
  {
    TEMA = { css: FIRMA, widget: {}, goals: [], conti: {}, musica: null, timer: null, pubblicita: { ...CFG, stato: { prossima: Date.now() + 1500, pausaFino: 0 } }, stato: {}, mostra: {}, xy: {}, alertStile: null, chatStile: null };
    const page = await browser.newPage();
    page.on('pageerror', (e) => errori.push(String(e.message || e)));
    await page.goto(base + '/overlay/prova?key=x');
    await page.waitForFunction((f) => document.getElementById('css-utente')?.textContent.includes(f), FIRMA, { timeout: 15000 });
    for (let i = 0; i < 100 && ovl.st.stream.length < 1; i++) await attesa(50);
    let uscendo = false;
    for (let i = 0; i < 120 && !uscendo; i++) { uscendo = await page.$('.ovl-pubblicita.esce').then((n) => !!n); if (!uscendo) await attesa(30); }
    dice(uscendo, 'a zero il conto comincia ad andarsene', 'non se ne va');
    const pausa = { prossima: 0, pausaFino: Date.now() + 60000 };
    TEMA = { ...TEMA, pubblicita: { ...TEMA.pubblicita, stato: pausa } };
    ovl.manda({ tipo: 'pubblicita', ...pausa });
    await attesa(900);
    const n = await page.$$eval('.ovl-pubblicita', (l) => l.map((x) => ({ tit: (x.querySelector('.t-tit') || {}).textContent || '', opacita: Number(getComputedStyle(x).opacity), classi: x.className })));
    const v = n[0] || null;
    dice(n.length === 1 && v.tit === 'Torno fra' && v.opacita > 0.95 && !/esce/.test(v.classi), 'la pausa che arriva mentre il conto se ne va si vede, piena', v ? `«${v.tit}», opacita' ${v.opacita}, classi «${v.classi}»` : 'sparita');
    await page.close();
  }

  // 4. LE SCELTE DELLO STREAMER.
  r = await giro({ ...CFG, mostraDa: 2 }, { prossima: Date.now() + 5 * 60000, pausaFino: 0 });
  dice(!r.prima, 'con «2 minuti prima», a cinque minuti non si vede', r.prima ? `si vede: ${r.prima.num}` : '');
  r = await giro({ ...CFG, mostraDa: 2 }, { prossima: Date.now() + 90000, pausaFino: 0 });
  dice(!!r.prima, 'e a un minuto e mezzo si', 'non c\'e\'');
  r = await giro({ ...CFG, pausa: false }, { prossima: 0, pausaFino: Date.now() + 60000 });
  dice(!r.prima, 'chi non lo vuole durante la pausa non ce l\'ha', r.prima ? `c'e': «${r.prima.tit}»` : '');
  r = await giro({ ...CFG, attivo: false }, { prossima: Date.now() + 60000, pausaFino: 0 });
  dice(!r.prima, 'con l\'elemento spento non compare niente', 'si vede lo stesso');
  r = await giro(CFG, { prossima: Date.now() + 60000, pausaFino: 0 }, { mostra: { pubblicita: false } });
  dice(!r.prima, 'e un overlay che non lo vuole non ce l\'ha', 'compare in un overlay che l\'ha spento');
  r = await giro(CFG, { prossima: 0, pausaFino: 0 });
  dice(!r.prima, 'senza nessuna pausa in programma non c\'e\' nessun riquadro vuoto', 'c\'e\' un riquadro senza conto');
} finally {
  await browser.close();
  await chiudi();
}

dice(errori.length === 0, 'nessun errore nella pagina', errori.join(' · '));

console.log('\nIl conto alla pubblicita\' dice quello che dice Twitch, e scende da solo.\n');
for (const e of esiti) console.log(`  ${e.ok ? '✓' : '✗'} ${e.msg}${!e.ok && e.extra ? ` — ${e.extra}` : ''}`);
const verde = esiti.every((e) => e.ok);
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
