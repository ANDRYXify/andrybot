// Collaudo della VETRINA UNICA.
//
// La home era disegnata due volte: un blocco scritto a mano dentro index.html
// per i motori di ricerca, e la vetrina vera che app.js ci scriveva sopra. Non
// erano due copie: erano due pagine diverse, con parole diverse, e una sola
// lingua contro tre. Lo scambio a meta' caricamento si misurava in CLS.
//
// Qui si prova quel che conta davvero, in un browser vero:
//  · quel che arriva dal server e' gia' la vetrina (niente JS: nessun buco);
//  · dopo che gli script hanno girato la pagina e' ANCORA quella — stesso h1,
//    stesse sezioni: nessuno l'ha ridisegnata;
//  · lo scarto di layout resta sotto la soglia buona.
//
// Uso: node scripts/verifica-vetrina.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inserisciVetrina } from '../src/web/vetrina-vista.js';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAD, 'src/web/public');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2' };

// Il guscio si compone come fa il server: stessa funzione, non una sua imitazione.
const GUSCIO = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
const guscioDi = (lingua) => inserisciVetrina(GUSCIO, lingua, { kick: true })
  .replace('<body>', '<body class="vetrina">')
  .replace('<html lang="it">', `<html lang="${lingua}">`);

const srv = http.createServer((req, res) => {
  const via = new URL(req.url, 'http://x');
  const q = decodeURIComponent(via.pathname);
  if (q.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{}'); }
  const f = path.join(PUB, q === '/' ? 'index.html' : q);
  if (q === '/' || q === '/index.html' || !f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    const l = ['it', 'en', 'es'].includes(via.searchParams.get('lang')) ? via.searchParams.get('lang') : 'it';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(guscioDi(l));
  }
  res.writeHead(200, { 'content-type': TIPI[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const PORTA = srv.address().port;

const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

const guai = [];
const misura = {};

// 1) SENZA JS: quel che arriva e' gia' la pagina.
for (const [lingua, atteso] of [['it', 'Il bot per Twitch'], ['en', 'The Twitch bot'], ['es', 'El bot de Twitch']]) {
  const p = await b.newPage({ javaScriptEnabled: false, viewport: { width: 1280, height: 860 } });
  await p.goto(`http://127.0.0.1:${PORTA}/${lingua === 'it' ? '' : `?lang=${lingua}`}`, { waitUntil: 'domcontentloaded' });
  const d = await p.evaluate(() => ({
    h1: (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim(),
    h2: [...document.querySelectorAll('h2')].length,
    testo: (document.body.innerText || '').replace(/\s+/g, ' ').trim().length,
    lingua: document.documentElement.lang,
  }));
  misura[`senzaJS-${lingua}`] = d;
  if (!d.h1) guai.push(`${lingua}: senza JS non c'e' nessun h1`);
  if (d.h2 < 4) guai.push(`${lingua}: senza JS ci sono solo ${d.h2} sezioni`);
  if (d.testo < 1500) guai.push(`${lingua}: senza JS il testo indicizzabile e' ${d.testo} caratteri`);
  if (d.lingua !== lingua) guai.push(`${lingua}: il documento dichiara lang="${d.lingua}"`);
  await p.close();
}

// 2) CON JS: e' ancora la stessa pagina, non un'altra scritta sopra.
{
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  await p.addInitScript(() => {
    window.__scarto = 0;
    try {
      new PerformanceObserver((l) => { for (const v of l.getEntries()) if (!v.hadRecentInput) window.__scarto += v.value; })
        .observe({ type: 'layout-shift', buffered: true });
    } catch (e) {  }
  });
  await p.goto(`http://127.0.0.1:${PORTA}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  const d = await p.evaluate(() => ({
    h1: (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim(),
    h2: [...document.querySelectorAll('h2')].length,
    scena: !!document.querySelector('.vt-scena'),
    scarto: Math.round((window.__scarto || 0) * 1000) / 1000,
  }));
  misura.conJS = d;
  const senza = misura['senzaJS-it'];
  if (!d.scena) guai.push('con JS la vetrina del server non c\'e\' piu\': qualcuno l\'ha ridisegnata');
  if (d.h1 !== senza.h1) guai.push(`il titolo cambia quando gli script girano: «${senza.h1}» -> «${d.h1}»`);
  if (d.h2 !== senza.h2) guai.push(`le sezioni cambiano quando gli script girano: ${senza.h2} -> ${d.h2}`);
  if (d.scarto > 0.1) guai.push(`scarto di layout ${d.scarto}, la soglia buona e' 0.1`);
  await p.close();
}

await b.close();
srv.close();

const dice = (ok, testo, extra = '') => { console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`); return ok; };
console.log('\nLa vetrina e\' una: quella che leggono i motori e quella che leggi tu.\n');
const s = misura['senzaJS-it'];
console.log(`  · senza JS: ${s.testo} caratteri di testo, ${s.h2} sezioni, tre lingue`);
console.log(`  · con JS:   stesso titolo, ${misura.conJS.h2} sezioni, scarto di layout ${misura.conJS.scarto}`);
const verde = dice(guai.length === 0, 'una pagina sola, prima e dopo gli script', guai.join(' · '));
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
