// Il SERVICE WORKER messo alla prova in un browser vero.
//
// Il cancello statico (verifica-service-worker.mjs) legge il codice e vieta che
// una risposta parta dalla cache. Questo invece lo esegue: alza un server con i
// file veri, apre Chromium, aspetta che il worker sia attivo, cambia il
// contenuto di un'icona sul server e richiede lo stesso indirizzo.
//
// La domanda e' quella che conta per chi guarda: se cambio il logo, chi e' gia'
// passato dal sito vede quello nuovo? Con il worker "prima la cache" la risposta
// era NO, per sempre: il file nuovo sul server e il robottino viola nella
// linguetta, senza un errore da nessuna parte.
//
// Serve un browser, quindi non sta fra i cancelli di `npm run cancelli`:
//   node scripts/verifica-sw.mjs

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const PUB = join(dirname(fileURLToPath(import.meta.url)), '../src/web/public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

// L'icona la serviamo noi, per poterla cambiare a meta' prova.
let icona = 'VECCHIA';
const srv = http.createServer((req, res) => {
  const via = req.url.split('?')[0];
  if (via === '/icons/icon-192.png') {
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=0' });
    return res.end(icona);
  }
  const f = join(PUB, via === '/' ? 'index.html' : via);
  if (!f.startsWith(PUB) || !existsSync(f)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=0' });
  res.end(readFileSync(f));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + srv.address().port;

const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
const br = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await br.newContext();
const pg = await ctx.newPage();
await pg.goto(base + '/index.html', { waitUntil: 'load' });
await pg.evaluate(() => navigator.serviceWorker.ready);

const chiedi = (via) => pg.evaluate((u) => fetch(u).then((r) => r.text()).catch((e) => 'ERRORE ' + e.message), via);

const prima = await chiedi('/icons/icon-192.png');
icona = 'NUOVA';
const dopo = await chiedi('/icons/icon-192.png');
const timbrata = await chiedi('/icons/icon-192.png?v=6');
await ctx.setOffline(true);
const senzaRete = await chiedi('/icons/icon-192.png');
await ctx.setOffline(false);
await br.close();
srv.close();

const esiti = [
  [prima === 'VECCHIA', `il worker e' attivo e serve l'icona: ${prima}`],
  [dopo === 'NUOVA', 'cambiata sul server, il browser vede quella NUOVA (la rete vince)'],
  [timbrata === 'NUOVA', 'anche con il timbro ?v=6'],
  [senzaRete === 'NUOVA', 'senza rete resta un paracadute, ed e\' aggiornato'],
];
for (const [ok, msg] of esiti) console.log((ok ? '  ✓ ' : '  ✗ ') + msg);
const rossi = esiti.filter(([ok]) => !ok).length;
console.log(rossi ? `\n${rossi} cose non tornano.` : '\nUn logo nuovo arriva a chi era gia\' passato. ✓');
process.exit(rossi ? 1 : 0);
