// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Collaudo del FONDO DELLO SCHERMO — gira in un browser vero.
//
// In fondo allo schermo possono stare insieme due cose: la barra «Hai modifiche
// non salvate» e un avviso (quello dei cookie, o la striscia «C'e' un manuale
// per questa scheda», che ha la stessa veste). Stavano nello stesso posto, e
// quando comparivano insieme la barra copriva l'avviso: si leggeva mezza frase
// e il suo tasto non si poteva premere. Trovato guardando la carta delle monete
// sul telefono, con l'avviso dei cookie ancora aperto.
//
// La difesa e' una misura, non un'altezza scritta a occhio: la barra dice la
// sua altezza (`--alto-salva`, app.js) e l'avviso sale sopra di lei finche' c'e'
// (anime.css, `body.con-salva .cookie-banner`). Qui, al telefono con la barra in
// basso, col menu a scomparsa e col menu di lato, si pretende che:
//  · i due rettangoli non si tocchino;
//  · l'avviso resti tutto dentro lo schermo.
//
// Uso: node scripts/verifica-fondo.mjs              (esce 1 se qualcosa non torna)
//      node scripts/verifica-fondo.mjs --selftest   (toglie la difesa: deve uscire rosso)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apriSito, chromiumQui } from './_sito.mjs';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = path.join(RAD, 'src/web/public/anime.css');
const SELFTEST = process.argv.includes('--selftest');

// Prima si guarda se il browser c'e', e solo dopo si rompe qualcosa: sul
// server non c'e', e li' il collaudo (anche l'autoprova) si salta con 0, come
// tutti gli altri (verifica-senza-browser lo rifa').
const CHROMIUM = chromiumQui();
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
let chromium;
if (!CHROMIUM) { console.log('Chromium non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch {
  console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.');
  process.exit(0);
}

const originale = fs.readFileSync(CSS, 'utf8');
if (SELFTEST) {
  const senza = originale.split('\n').filter((r) => !r.includes('con-salva .cookie-banner')).join('\n');
  if (senza === originale) { console.log('  ✗ non trovo la difesa da togliere'); process.exit(1); }
  console.log('  tolgo: l\'avviso che sale sopra la barra\n');
  fs.writeFileSync(CSS, senza);
}
const ripristina = () => { if (SELFTEST) fs.writeFileSync(CSS, originale); };
process.on('exit', ripristina);

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
const rotture = [];

for (const [larg, alt, nome] of [[390, 844, 'telefono, barra in basso'], [800, 900, 'menu a scomparsa'], [1280, 860, 'menu di lato']]) {
  const p = await b.newPage({ viewport: { width: larg, height: alt } });
  p.on('pageerror', (e) => rotture.push(`${nome}: ${e.message}`));
  await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  await p.evaluate(() => window.SB_APP.vai('giochi'));
  await p.waitForFunction(() => document.querySelector('.pannello-scheda.visibile')?.id === 'scheda-giochi', null, { timeout: 20000 });
  await p.click('[data-sotto="monete"]');
  await p.waitForSelector('#pt-perPresenza', { state: 'visible', timeout: 20000 });
  await p.fill('#pt-perPresenza', '3');
  await p.dispatchEvent('#pt-perPresenza', 'input');
  await p.waitForFunction(() => document.getElementById('barra-salva')?.classList.contains('dentro'), null, { timeout: 10000 });
  await p.waitForTimeout(600);
  const m = await p.evaluate(() => {
    const r = (el) => { const q = el.getBoundingClientRect(); return { top: q.top, bottom: q.bottom, left: q.left, right: q.right }; };
    const c = document.getElementById('cookie-banner');
    return { cookie: c && !c.hidden ? r(c) : null, salva: r(document.getElementById('barra-salva')), alto: innerHeight };
  });
  dice(!!m.cookie, `${nome}: l'avviso dei cookie e' aperto, come per chi entra la prima volta`);
  if (m.cookie) {
    const tocca = m.cookie.bottom > m.salva.top && m.cookie.top < m.salva.bottom && m.cookie.right > m.salva.left && m.cookie.left < m.salva.right;
    dice(!tocca, `${nome}: l'avviso e la barra del salvataggio non si toccano`, `avviso fino a ${Math.round(m.cookie.bottom)} px, barra da ${Math.round(m.salva.top)} px`);
    dice(m.cookie.top >= 0 && m.cookie.bottom <= m.alto, `${nome}: l'avviso resta tutto nello schermo`);
  }
  await p.close();
}
await b.close();
await chiudiSito();
dice(!rotture.length, 'la pagina non ha errori', rotture.slice(0, 3).join(' · '));

console.log('\nIn fondo allo schermo ognuno ha il suo posto.\n');
for (const e of esiti) console.log(`  ${e.ok ? '✓' : '✗'} ${e.msg}${!e.ok && e.extra ? ` — ${e.extra}` : ''}`);
const verde = esiti.every((e) => e.ok);
if (SELFTEST) {
  ripristina();
  console.log(verde ? '\nautoprova ROSSA ✗: senza la difesa il collaudo non se ne accorge\n' : '\nAutoprova: senza la difesa l\'avviso finisce sotto la barra, e si vede. ✓\n');
  process.exit(verde ? 1 : 0);
}
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
