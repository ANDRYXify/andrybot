// Cancello del PADRONE UNICO: una proprietà, un solo sistema che la scrive.
//
// È il principio primo di docs/MOTO.md, ed è già stato violato quattro volte,
// sempre allo stesso modo: il JS riscrive una variabile CSS a ogni movimento
// del mouse, il CSS ha una `transition` sulla proprietà che quella variabile
// compone, e allora OGNI SCRITTURA FA RIPARTIRE LA TRANSIZIONE. Il risultato
// non arriva mai: resta indietro e vibra.
//
// PERCHÉ SI MISURA INVECE DI LEGGERE IL CODICE. La prima versione di questo
// cancello cercava la coppia «variabile scritta dal JS» + «proprietà in una
// transition» leggendo i file. Dava cinquantadue allarmi e nessuno era vero:
// da fuori non si distingue una variabile riscritta sessanta volte al secondo
// da un colore di tema scritto una volta sola. Un cancello che grida al lupo
// viene spento, ed è esattamente come si perdono i cancelli.
//
// Quindi si guarda il SINTOMO. Si passa il mouse su un bottone a velocità
// costante e si registra, fotogramma per fotogramma, dove sta davvero e quanto
// è largo. Se un padrone solo lo comanda, insegue liscio: passi tutti nello
// stesso verso e larghezza ferma. Se sono in due, il passo si inverte di
// continuo e la larghezza rimbalza.
//
// Com'era, misurato: trenta inversioni di verso in una passata e la larghezza
// che sbatteva fra +0,2 e +2,65 px. Com'è: le inversioni sono solo l'entrata e
// l'uscita, la larghezza è ferma.
//
// Uso: node scripts/verifica-padrone.mjs
//      node scripts/verifica-padrone.mjs --selftest  (rimette la transizione
//                                                     sul transform: rosso)

import { apriSito } from './_sito.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = path.join(RAD, 'src/web/public/anime.css');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');

const INVERSIONI_MAX = 8;   // entrata e uscita, e un margine
const BALLO_MAX = 2;        // quante volte la larghezza puo' cambiare verso

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const originale = fs.readFileSync(CSS, 'utf8');
// Il guasto finto deve rimettere il difetto INTERO: se si converte solo meta'
// delle regole le due proprieta' non si incontrano nemmeno, e il cancello
// direbbe di essere cieco quando invece non gli e' stato mostrato niente.
const ROTTURE = [
  [`.btn, button.btn, a.btn {
  transition: scale var(--t-molla-su) var(--molla-medio),`,
   `.btn, button.btn, a.btn {
  transition: transform var(--t-molla-su) var(--molla-medio),`],
  ['  translate: var(--mx, 0px) var(--my, 0px);',
   '  transform: translate3d(var(--mx, 0px), var(--my, 0px), 0);'],
  [`.btn:hover {
  translate: calc(var(--mx, 0px) - 3px) calc(var(--my, 0px) - 4px);
  scale: 1.02;
}`,
   `.btn:hover {
  transform: translate3d(calc(var(--mx, 0px) - 3px), calc(var(--my, 0px) - 4px), 0) scale(1.02);
}`],
];
if (SELFTEST) {
  let rotto = originale;
  for (const [da, a] of ROTTURE) {
    if (!rotto.includes(da)) { console.log('  ✗ non trovo il punto da rompere: ' + da.split('\n')[0]); process.exit(1); }
    rotto = rotto.replace(da, a);
  }
  fs.writeFileSync(CSS, rotto);
}
const ripristina = () => { if (SELFTEST) fs.writeFileSync(CSS, originale); };
process.on('exit', ripristina);

let male = 0;
const dice = (ok, cosa, extra = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && extra ? ` — ${extra}` : ''}`);
  if (!ok) male++;
  return ok;
};

const { porta, chiudi } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
// il magnetismo esiste solo con il moto acceso: chiederlo e' parte della prova
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
await p.goto(`http://127.0.0.1:${porta}/?demo=1`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.waitForTimeout(700);
for (let i = 0; i < 8; i++) {
  const v = await p.evaluate(() => {
    const g = document.querySelector('[data-giro="salta"]');
    if (g) { g.click(); return 1; }
    const c = [...document.querySelectorAll('button')].find((x) => /Ho capito/i.test(x.textContent || ''));
    if (c) { c.click(); return 1; }
    return 0;
  });
  if (!v) break;
  await p.waitForTimeout(180);
}
await p.evaluate(() => window.SB_APP.vai('regole'));
await p.waitForFunction(() => document.querySelector('.pannello-scheda.visibile')?.id === 'scheda-regole', null, { timeout: 20000 });
await p.waitForTimeout(600);
await p.evaluate(() => { document.querySelector('[data-giro="salta"]')?.click(); });
await p.waitForTimeout(300);

const el = await p.$('#btn-salva-antispam');
await el.scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
const r = await el.boundingBox();

await p.evaluate(() => {
  window.__tr = [];
  window.__m = { x: 0 };
  document.addEventListener('pointermove', (e) => { window.__m = { x: e.clientX }; }, { passive: true, capture: true });
  const t = document.getElementById('btn-salva-antispam');
  const giro = () => {
    const b = t.getBoundingClientRect();
    window.__tr.push({ x: b.left, w: b.width, mx: window.__m.x });
    if (window.__tr.length < 400) requestAnimationFrame(giro);
  };
  requestAnimationFrame(giro);
});
await p.mouse.move(r.x - 30, r.y + r.height / 2);
await p.waitForTimeout(150);
const passi = 60;
for (let i = 0; i <= passi; i++) {
  await p.mouse.move(r.x + 4 + (r.width - 8) * (i / passi), r.y + r.height / 2);
  await p.waitForTimeout(16);
}
await p.waitForTimeout(300);

const m = await p.evaluate(() => {
  // solo i fotogrammi in cui il mouse e' DENTRO il bottone e si sta muovendo:
  // l'entrata e l'uscita sono salti veri, non scatti dell'inseguimento
  const tr = window.__tr.filter((v) => v.mx > 0);
  const dentro = tr.slice(3, -3);
  const salti = [];
  for (let i = 1; i < dentro.length; i++) {
    if (Math.abs(dentro[i].mx - dentro[i - 1].mx) < 0.5) continue;
    salti.push(dentro[i].x - dentro[i - 1].x);
  }
  const inversioni = salti.filter((v, i) => i && Math.sign(v) && Math.sign(v) !== Math.sign(salti[i - 1])).length;
  // La larghezza cresce UNA volta, quando il tasto si solleva, e poi resta.
  // Non conta di quanto cambia: conta quante volte cambia VERSO. Una crescita
  // sola non inverte mai; una scala che riparte a ogni movimento sì.
  const dw = [];
  for (let i = 1; i < dentro.length; i++) {
    const d = +(dentro[i].w - dentro[i - 1].w).toFixed(2);
    if (Math.abs(d) > 0.05) dw.push(d);
  }
  return {
    fotogrammi: dentro.length,
    inversioni,
    ballo: dw.filter((v, i) => i && Math.sign(v) !== Math.sign(dw[i - 1])).length,
  };
});

await b.close();
await chiudi();

console.log('\nUna proprietà, un padrone.\n');
dice(m.fotogrammi > 25, `fotogrammi guardati mentre il mouse attraversa il tasto: ${m.fotogrammi}`);
dice(m.inversioni <= INVERSIONI_MAX, `il tasto insegue nello stesso verso: ${m.inversioni} inversioni (limite ${INVERSIONI_MAX})`,
  'il transform ha due padroni: il JS lo riscrive e il CSS lo anima');
dice(m.ballo <= BALLO_MAX, `e non balla di misura: la larghezza cambia verso ${m.ballo} volte (limite ${BALLO_MAX})`,
  'la scala riparte a ogni movimento del mouse');

if (SELFTEST) {
  ripristina();
  console.log('\n  selftest: col transform in transizione');
  if (male) { console.log(`  ✓ il cancello se ne accorge (${m.inversioni} inversioni di verso, ${m.ballo} balli di larghezza)`); male = 0; }
  else { console.log('  ✗ non ha visto niente'); male = 1; }
}

console.log(male ? `\n${male} cose non tornano.\n` : '\ncollaudo verde ✓\n');
process.exit(male ? 1 : 0);
