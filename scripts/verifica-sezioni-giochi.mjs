// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Collaudo della scheda GIOCHI IN QUATTRO PARTI — gira in un browser vero.
//
// Al telefono la scheda era lunga trenta schermate, e un gioco stava in due
// carte. Adesso ha quattro parti e un foglio per gioco (docs/GIOCHI.md). Le
// prove senza browser (giochi-sezioni.test) dicono come sono fatti i fogli;
// qui si pretende quello che si vede e si tocca:
//  · ogni parte mostra le sue carte e nient'altro, e niente scorre di lato;
//  · il filtro trova un gioco anche dal nome di una mossa, e non sporca la pagina;
//  · l'interruttore nel titolo spegne il gioco senza aprirlo;
//  · la tendina «chi può» sta nella sua riga, e le caselle di una riga stanno
//    alla stessa altezza anche quando un'etichetta va a capo;
//  · si apre un gioco alla volta, e il titolo toccato resta sotto il dito;
//  · una modifica lasciata in una parte resta da salvare passando a un'altra,
//    e la barra la salva davvero;
//  · la ricerca, il giro guidato e il link del boss nello Studio aprono la
//    parte giusta, e il boss arriva aperto;
//  · la pagina non ha errori.
//
// Uso: node scripts/verifica-sezioni-giochi.mjs              (esce 1 se qualcosa non torna)
//      node scripts/verifica-sezioni-giochi.mjs --selftest   (la barra dimentica le parti chiuse: deve uscire rosso)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apriSito, chromiumQui } from './_sito.mjs';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(RAD, 'src/web/public/app.js');
const SELFTEST = process.argv.includes('--selftest');

// Prima si guarda se il browser c'e', e solo dopo si rompe qualcosa: sul
// server non c'e', e li' il collaudo (anche l'autoprova) si salta con 0.
const CHROMIUM = chromiumQui();
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
let chromium;
if (!CHROMIUM) { console.log('Chromium non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch {
  console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.');
  process.exit(0);
}

const originale = fs.readFileSync(APP, 'utf8');
const DIFESA = '.filter((b) => _salvaVero(b) && !b.disabled)';
if (SELFTEST) {
  if (!originale.includes(DIFESA)) { console.log('  ✗ non trovo la difesa da togliere'); process.exit(1); }
  console.log('  tolgo: la barra che conta anche i tasti delle parti chiuse\n');
  fs.writeFileSync(APP, originale.replace(DIFESA, '.filter(_salvaBuono)'));
}
const ripristina = () => { if (SELFTEST) fs.writeFileSync(APP, originale); };
process.on('exit', ripristina);

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
const rotture = [];
const PARTI = { giochi: ['Minigiochi', 'Gioco per gioco', 'Chi aspetta di più', 'I tuoi giochi', 'Giochi del sito andryxify.it'],
  monete: ['Punti & classifica', 'Presenze e saluti', 'Classifica & VIP'], automatici: ['I giochi automatici'], battute: ['Citazioni', 'Battute'] };

async function apri(larg, alt, nome) {
  const p = await b.newPage({ viewport: { width: larg, height: alt } });
  p.on('pageerror', (e) => rotture.push(`${nome}: ${e.message}`));
  await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); localStorage.setItem('cookie-ok', '1'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  return p;
}
const inGiochi = async (p) => {
  await p.evaluate(() => window.SB_APP.vai('giochi'));
  await p.waitForFunction(() => document.querySelector('details[data-rg="blackjack"] [data-gc="carta"]'), null, { timeout: 20000 });
  await p.waitForTimeout(300);
};
const barra = (p) => p.evaluate(() => ({ dentro: !!document.getElementById('barra-salva')?.classList.contains('dentro'),
  tasti: [...document.querySelectorAll('#barra-salva .sv-tasti button')].map((x) => x.textContent.trim()) }));
const parte = (p) => p.evaluate(() => document.querySelector('.sotto-barra .on')?.dataset.sotto || '');

for (const [larg, alt, nome] of [[390, 844, 'telefono'], [1280, 900, 'computer']]) {
  let p = await apri(larg, alt, nome);
  await p.evaluate(() => { localStorage.setItem('sotto:giochi', 'giochi'); });
  await inGiochi(p);

  for (const [id, carte] of Object.entries(PARTI)) {
    await p.click(`[data-sotto="${id}"]`);
    await p.waitForTimeout(250);
    const viste = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda.visibile > .carta')].filter((c) => !c.hidden).map((c) => c.querySelector('h2')?.textContent.trim()));
    dice(JSON.stringify(viste) === JSON.stringify(carte), `${nome}: «${id}» mostra le sue carte e nient'altro`, viste.join(' · '));
    dice(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `${nome}: in «${id}» niente scorre di lato`);
  }
  await p.click('[data-sotto="giochi"]');
  await p.waitForTimeout(250);

  await p.fill('[data-rg-filtro]', '!carta');
  await p.waitForTimeout(150);
  const filtrati = await p.evaluate(() => [...document.querySelectorAll('details[data-rg]')].filter((d) => !d.hidden).map((d) => d.dataset.rg));
  dice(filtrati.join() === 'blackjack', `${nome}: cercando «!carta» resta il blackjack`, filtrati.join());
  await p.fill('[data-rg-filtro]', 'zzzz');
  await p.waitForTimeout(150);
  dice(await p.evaluate(() => !document.querySelector('[data-rg-nessuno]').hidden), `${nome}: se non c'è niente, lo dice`);
  await p.fill('[data-rg-filtro]', '');
  dice(!(await barra(p)).dentro, `${nome}: cercare un gioco non segna la pagina come modificata`);

  await p.evaluate(() => document.querySelector('details[data-rg="slot"]').scrollIntoView({ block: 'center' }));
  await p.click('details[data-rg="slot"] > summary .rg-on');
  await p.waitForTimeout(200);
  const spento = await p.evaluate(() => ({ aperto: document.querySelector('details[data-rg="slot"]').open, acceso: document.querySelector('[data-gc-di="slot"]').checked }));
  dice(!spento.aperto && !spento.acceso, `${nome}: l'interruttore nel titolo spegne la slot senza aprirla`, JSON.stringify(spento));
  await p.click('details[data-rg="slot"] > summary .rg-on');

  await p.click('details[data-rg="slot"] > summary .rg-nome');
  await p.waitForTimeout(250);
  // Scorrimento immediato: il sito scorre morbido, e una misura presa a meta'
  // strada direbbe che il titolo si e' mosso quando a muoversi era la pagina.
  await p.evaluate(() => document.querySelector('details[data-rg="pesca"] > summary').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  const prima = await p.evaluate(() => document.querySelector('details[data-rg="pesca"] > summary').getBoundingClientRect().top);
  await p.click('details[data-rg="pesca"] > summary .rg-nome');
  await p.waitForTimeout(300);
  const dopo = await p.evaluate(() => ({ top: document.querySelector('details[data-rg="pesca"] > summary').getBoundingClientRect().top,
    aperti: [...document.querySelectorAll('details[data-rg][open]')].map((d) => d.dataset.rg) }));
  dice(dopo.aperti.join() === 'pesca', `${nome}: si apre un gioco alla volta`, dopo.aperti.join());
  dice(Math.abs(dopo.top - prima) <= 2, `${nome}: il titolo toccato resta sotto il dito`, `da ${Math.round(prima)} a ${Math.round(dopo.top)} px`);

  await p.evaluate(() => { document.querySelector('details[data-rg="slot"]').open = true; });
  await p.waitForTimeout(200);
  const forma = await p.evaluate(() => {
    const riga = document.querySelector('details[data-rg="blackjack"] .gc-riga[data-gc="carta"]');
    const d = riga.closest('details'); d.open = true;
    const scelta = riga.querySelector('.tendina-btn') || riga.querySelector('select');
    const fuori = Math.round(scelta.getBoundingClientRect().right - riga.getBoundingClientRect().right);
    const caselle = [...document.querySelectorAll('details[data-rg="blackjack"] .griglia-punti')[0].querySelectorAll(':scope > .campo-num > input')].map((x) => x.getBoundingClientRect());
    const righe = new Map();
    for (const q of caselle) { const k = [...righe.keys()].find((t) => Math.abs(t - q.top) < 40) ?? q.top; righe.set(k, [...(righe.get(k) || []), q.top]); }
    const storte = [...righe.values()].filter((v) => v.length > 1 && Math.max(...v) - Math.min(...v) > 1).length;
    document.querySelector('details[data-rg="slot"]').open = true;
    return { fuori, storte, caselle: caselle.length };
  });
  dice(forma.fuori <= 0, `${nome}: la tendina «chi può» sta dentro la riga del comando`, `esce di ${forma.fuori} px`);
  dice(forma.caselle >= 3 && forma.storte === 0, `${nome}: le caselle di una riga stanno alla stessa altezza, anche se un'etichetta va a capo`, JSON.stringify(forma));
  await p.fill('[data-rg-g="slot"][data-rg-k="costo"]', '23');
  await p.dispatchEvent('[data-rg-g="slot"][data-rg-k="costo"]', 'input');
  await p.click('[data-sotto="monete"]');
  await p.waitForTimeout(400);
  const lasciata = await barra(p);
  dice(lasciata.dentro && lasciata.tasti.includes('Salva i giochi'), `${nome}: passando a «Monete e classifica» la modifica resta da salvare`, JSON.stringify(lasciata));
  if (lasciata.dentro && lasciata.tasti.includes('Salva i giochi')) {
    await p.click('#barra-salva .sv-tasti button.sv-salva');
    await p.waitForTimeout(700);
  }
  await p.click('[data-sotto="giochi"]');
  await p.waitForTimeout(300);
  const salvato = await p.evaluate(() => document.querySelector('[data-rg-g="slot"][data-rg-k="costo"]')?.value);
  dice(salvato === '23' && !(await barra(p)).dentro, `${nome}: e dalla barra si salva davvero`, `costo ${salvato}`);

  const trovato = await p.evaluate(async () => {
    window.SB_CERCA.apri();
    const inp = document.getElementById('cerca-input');
    inp.value = 'Accendi l\'ora doppia';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((x) => setTimeout(x, 250));
    document.querySelector('#cerca-overlay .cerca-voce')?.click();
    await new Promise((x) => setTimeout(x, 2500));
    const q = document.getElementById('btn-doppio').getBoundingClientRect();
    return { visto: q.width > 0 && q.top >= 0 && q.bottom <= innerHeight };
  });
  dice((await parte(p)) === 'monete' && trovato.visto, `${nome}: la ricerca apre «Monete e classifica» e porta al tasto dell'ora doppia`);

  await p.click('[data-sotto="giochi"]');
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.evaluate(() => document.querySelector('[data-rifai-giro]')?.click());
  await p.waitForTimeout(400);
  let tappa = null;
  for (let i = 0; i < 8 && await p.evaluate(() => !!document.getElementById('giro')); i++) {
    const t = await p.evaluate(() => ({ tit: document.querySelector('#giro h3')?.textContent, segnata: !document.querySelector('#giro .giro-buco')?.hidden }));
    if (/Presenza/.test(t.tit || '')) { tappa = { ...t, parte: await parte(p) }; break; }
    await p.click('#giro [data-giro="avanti"]');
    await p.waitForTimeout(600);
  }
  dice(!!tappa && tappa.parte === 'monete' && tappa.segnata, `${nome}: il giro guidato apre la parte della sua tappa e la segna`, JSON.stringify(tappa));
  await p.keyboard.press('Escape');
  await p.close();

  p = await apri(larg, alt, nome);
  await p.evaluate(() => { localStorage.setItem('sotto:giochi', 'battute'); });
  await p.evaluate(() => window.SB_APP.vai('alert'));
  await p.waitForFunction(() => document.querySelector('[data-vai-gioco="boss"]'), null, { timeout: 20000 });
  await p.evaluate(() => { const d = document.getElementById('sez-boss'); if (d) d.open = true; document.querySelector('[data-vai-gioco="boss"]').click(); });
  await p.waitForFunction(() => document.querySelector('details[data-rg="boss"]')?.open, null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(800);
  const boss = await p.evaluate(() => { const s = document.querySelector('details[data-rg="boss"] > summary'); const q = s?.getBoundingClientRect();
    return { scheda: document.querySelector('.pannello-scheda.visibile')?.dataset.scheda, aperto: !!s?.parentElement.open, inVista: !!q && q.top >= 0 && q.top < innerHeight / 2 }; });
  dice(boss.scheda === 'giochi' && (await parte(p)) === 'giochi' && boss.aperto && boss.inVista, `${nome}: «Apri il boss nei Giochi» porta al boss aperto, anche da un'altra parte`, JSON.stringify(boss));
  await p.close();
}
await b.close();
await chiudiSito();
dice(!rotture.length, 'la pagina non ha errori', rotture.slice(0, 3).join(' · '));

console.log('\nLa scheda Giochi: ogni cosa nella sua parte.\n');
for (const e of esiti) console.log(`  ${e.ok ? '✓' : '✗'} ${e.msg}${!e.ok && e.extra ? ` — ${e.extra}` : ''}`);
const verde = esiti.every((e) => e.ok);
if (SELFTEST) {
  ripristina();
  console.log(verde ? '\nautoprova ROSSA ✗: senza la difesa il collaudo non se ne accorge\n' : '\nAutoprova: senza la difesa, cambiando parte la modifica resta indietro senza che niente lo dica, e si vede. ✓\n');
  process.exit(verde ? 1 : 0);
}
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
