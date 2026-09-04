// Il sito servito in locale, per i collaudi che hanno bisogno di un browser.
//
// Ce n'erano nove copie, una per collaudo, e non era un dettaglio: da quando la
// home la compone il SERVER (ci inserisce la vetrina nella lingua giusta, vedi
// src/web/vetrina-vista.js) una copia che serve `index.html` grezzo mostra una
// pagina col buco al posto della vetrina — e il collaudo che ci gira sopra
// misura una pagina che nessuno vedra' mai. E' successo davvero: il cancello
// del contrasto e' diventato rosso perche' cercava un titolo che, nel suo
// finto sito, non c'era piu'.
//
// Qui la home si compone con la STESSA funzione del server. Un posto solo.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inserisciVetrina } from '../src/web/vetrina-vista.js';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PUB = path.join(RAD, 'src/web/public');

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

const LINGUE = ['it', 'en', 'es'];

// Il guscio come lo manda il server: vetrina dentro, lingua dichiarata,
// `body.vetrina` gia' messo (che e' quel che tiene ferma la larghezza).
function guscio(lingua, kick) {
  const base = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
  return inserisciVetrina(base, lingua, { kick })
    .replace('<body>', '<body class="vetrina">')
    .replace('<html lang="it">', `<html lang="${lingua}">`);
}

// Apre il sito su una porta libera. `api` risponde a /api/* (per finta, o come
// gli si dice); `kick` accende la porta di Kick nella vetrina.
export async function apriSito({ api = () => ({}), kick = true } = {}) {
  const srv = http.createServer((req, res) => {
    const via = new URL(req.url, 'http://x');
    const q = decodeURIComponent(via.pathname);
    if (q.startsWith('/api/')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(api(q, via) ?? {}));
    }
    const f = path.join(PUB, q === '/' ? 'index.html' : q);
    const home = q === '/' || q === '/index.html'
      || !f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory();
    if (home) {
      const chiesta = (via.searchParams.get('lang') || '').toLowerCase();
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(guscio(LINGUE.includes(chiesta) ? chiesta : 'it', kick));
    }
    res.writeHead(200, { 'content-type': TIPI[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const porta = srv.address().port;
  return { porta, base: `http://127.0.0.1:${porta}`, chiudi: () => srv.close() };
}

// Chromium con le opzioni che servono su questa macchina. Restituisce null se
// Playwright non c'e': il collaudo si salta invece di fallire.
export async function apriBrowser() {
  const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
  const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  let chromium;
  try { ({ chromium } = await import(PLAYWRIGHT)); } catch { return null; }
  return chromium.launch({ executablePath: CHROMIUM,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
}
