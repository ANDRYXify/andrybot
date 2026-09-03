// Collaudo del GIRO GUIDATO — gira in un browser vero, quindi vive fuori da
// `npm run cancelli` (i cancelli devono restare statici e istantanei).
//
// Il giro adesso INSEGNA: ogni tappa e' un passo della ricetta della scheda
// (GUIDE[id].come) e il faro si accende sul controllo che quel passo nomina.
// Prima invece faceva il giro delle carte leggendo la prima frase di ognuna:
// non poteva invecchiare, ma non insegnava niente — descriveva il mobilio.
//
// Il prezzo di un giro scritto e' che puo' invecchiare: si sposta un id, si
// rifa' una carta, e il faro si accende sul nulla. Questo collaudo e' il
// contrappeso: apre ogni scheda, costruisce le tappe come le costruisce il
// prodotto e verifica che OGNI passo con un'ancora la trovi davvero, visibile.
//
// Uso: node scripts/verifica-giro.mjs   (esce 1 se un faro punta al vuoto)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAD, 'src/web/public');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2' };

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch {
  console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.');
  console.log('(serve un browser vero; su un altro computer: PLAYWRIGHT=... CHROMIUM=... node scripts/verifica-giro.mjs)');
  process.exit(0);
}

const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{}'); }
  const f = path.join(PUB, p === '/' ? 'index.html' : p);
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(PUB, 'index.html')));
  }
  res.writeHead(200, { 'content-type': TIPI[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const PORTA = srv.address().port;

const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const rotture = [];
p.on('pageerror', (e) => rotture.push('errore di pagina: ' + e.message));
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP && typeof GUIDE === 'object', null, { timeout: 20000 });

const schede = await p.evaluate(() => Object.keys(GUIDE));
let passiTotali = 0, conFaro = 0;
const vuoti = [];
const povere = [];

for (const id of schede) {
  await p.evaluate((s) => window.SB_APP.vai(s), id);
  // il cambio scheda passa da una view transition: si aspetta che la scheda sia
  // DAVVERO in pagina, non un tempo deciso a occhio (in headless ci mette
  // anche un secondo e mezzo, e un'attesa corta misura il pannello precedente)
  await p.waitForFunction((s) => {
    const v = document.querySelector('.pannello-scheda.visibile');
    return !!v && v.id === 'scheda-' + s;
  }, id, { timeout: 20000 });
  await p.waitForTimeout(250);
  const r = await p.evaluate((s) => {
    const tappe = tappeDi(s);
    const fuori = [];
    for (const t of tappe) {
      if (!t.sel) { fuori.push({ sel: '', ok: true }); continue; }
      _puntaTappa(t, s);
      fuori.push({ sel: t.sel, ok: !!t.bersaglio, titolo: t.titolo || '' });
    }
    return { tappe: fuori, passi: (GUIDE[s].come || []).length, serve: !!GUIDE[s].serve };
  }, id);

  if (r.passi < 2) povere.push(`${id}: ${r.passi} passi`);
  for (const t of r.tappe) {
    if (!t.sel) continue;
    passiTotali++;
    if (t.ok) conFaro++;
    else vuoti.push(`${id} → ${t.sel}`);
  }
  const senza = r.tappe.filter((t) => t.sel && t.ok && !t.titolo).length;
  if (senza) rotture.push(`${id}: ${senza} tappe senza un titolo`);
}

await b.close();
srv.close();

const dice = (ok, testo, extra = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`);
  return ok;
};

console.log('\nIl giro guidato punta a cose che esistono.\n');
let verde = true;
verde = dice(vuoti.length === 0, `ogni passo con un'ancora la trova: ${conFaro} su ${passiTotali}`, vuoti.join(', ')) && verde;
verde = dice(povere.length === 0, `ogni scheda ha almeno due passi da insegnare: ${schede.length} schede`, povere.join(', ')) && verde;
verde = dice(rotture.length === 0, 'nessuna tappa muta e nessun errore di pagina', rotture.join(' · ')) && verde;

console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
