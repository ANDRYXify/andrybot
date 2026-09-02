// Collaudo della BARRA IN ALTO — gira in un browser vero, quindi vive fuori da
// `npm run cancelli` (i cancelli devono restare statici e istantanei).
//
// Il difetto: la barra si ritirava nel cassetto sotto una larghezza decisa a
// tavolino (1280px). Ma quanto spazio serve NON e' un numero fisso: dipende da
// quante voci ha l'account (un amministratore ne ha una in piu') e dalla lingua
// (le etichette spagnole sono piu' lunghe). Sopra quella soglia le voci non
// stavano ma venivano disegnate lo stesso, e siccome la barra le centra
// traboccavano da tutte e due le parti — il logo finiva sotto la prima voce e
// "Admin" sopra il selettore della lingua. Su un iPad in orizzontale (1366px)
// con un account amministratore era sempre cosi'.
//
// Ora la scelta si prende MISURANDO. Questo collaudo verifica che, in ogni
// combinazione di larghezza, lingua e ruolo, non ci sia una sola sovrapposizione
// e che ci sia sempre un modo di raggiungere il menu.
//
// Uso: node scripts/verifica-barra.mjs   (esce 1 se qualcosa si sovrappone)

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
  console.log('(serve un browser vero; su un altro computer: PLAYWRIGHT=... CHROMIUM=... node scripts/verifica-barra.mjs)');
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

const MISURA = `(() => {
  const barra = document.querySelector('.barra-top');
  if (!barra) return { errore: 'nessuna barra' };
  const box = (el) => el && el.getBoundingClientRect();
  const nav = barra.querySelector('.nav-top');
  const aperto = nav && getComputedStyle(nav).display !== 'none';
  const voci = aperto ? [...barra.querySelectorAll('.nav-top .grp')].map(box) : [];
  const tocca = (a, c) => a && c && a.left < c.right - 0.5 && c.left < a.right - 0.5;
  const coll = [];
  if (voci.length) {
    if (tocca(box(barra.querySelector('.marchio')), voci[0])) coll.push('logo/menu');
    if (tocca(voci[voci.length - 1], box(barra.querySelector('.top-strumenti')))) coll.push('menu/strumenti');
    for (let i = 1; i < voci.length; i++) if (tocca(voci[i - 1], voci[i])) coll.push('voce' + i);
  }
  const visibile = (sel) => { const el = document.querySelector(sel); return !!el && getComputedStyle(el).display !== 'none'; };
  return { aperto, cassetto: visibile('.apri-menu'), giu: visibile('.barra-giu'), voci: voci.length, coll };
})()`;

const LARGHEZZE = [390, 768, 1024, 1180, 1280, 1300, 1366, 1400, 1440, 1512, 1600, 1728, 1920, 2560];
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

// Una pagina per combinazione di lingua e ruolo; le larghezze si scorrono
// ridimensionando, che e' anche piu' vicino a quello che fa una persona.
const esiti = [];
for (const admin of [false, true]) {
  for (const lang of ['it', 'en', 'es']) {
    const p = await b.newPage({ viewport: { width: 1920, height: 800 } });
    await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=${lang}`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.querySelector('.barra-top .nav-top .grp'), null, { timeout: 15000 }).catch(() => {});
    if (admin) { await p.evaluate(() => { stato = { ...stato, isAdmin: true }; render(); }); }
    for (const w of LARGHEZZE) {
      await p.setViewportSize({ width: w, height: 800 });
      await p.waitForTimeout(260);   // la rimisura passa da requestAnimationFrame: le si da' il tempo di posarsi
      const r = await p.evaluate(MISURA);
      esiti.push({ admin, lang, w, ...r,
        ok: !r.errore && !(r.coll || []).length && (r.aperto || r.cassetto || r.giu) });
    }
    await p.close();
  }
}
await b.close();
srv.close();

const rossi = esiti.filter((e) => !e.ok);
for (const e of rossi) {
  console.log(`  ✗ ${e.lang} ${String(e.w).padStart(5)}px${e.admin ? ' (admin)' : ''} — ${(e.coll || []).join(', ') || 'nessun modo di raggiungere il menu'}`);
}
console.log(`  ${rossi.length ? '✗' : '✓'} ${esiti.length} combinazioni di larghezza, lingua e ruolo`);
console.log(rossi.length
  ? `\n${rossi.length} combinazioni si sovrappongono.`
  : '\nLa barra in alto non si sovrappone mai, e il menu si raggiunge sempre. ✓');
process.exit(rossi.length ? 1 : 0);
