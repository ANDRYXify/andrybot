// Collaudo del BANCO DI REGIA — gira in un browser vero, quindi vive fuori da
// `npm run cancelli` (i cancelli devono restare statici e istantanei).
//
// Il difetto che questo collaudo chiude: la x che si salva NON e' il centro
// dell'elemento, e' la sua posizione lungo la corsa disponibile (0 = a filo a
// sinistra, 100 = a filo a destra). Chi trascinava la trattava come se fosse il
// centro, quindi appena toccavi un elemento questo saltava di mezza larghezza —
// tanto piu' lontano quanto piu' era vicino a un bordo. Spostare le cose
// diventava un tiro a indovinare.
//
// Non si prova «il codice chiama la funzione giusta»: si MISURA. Si prende un
// elemento in un punto qualunque (non al centro), lo si trascina di una
// quantita' nota verso il centro della tela — via dai bordi, dove il limite
// entrerebbe in gioco per davvero — e si controlla che si sia spostato di
// quella quantita'. Con Alt premuto, cosi' l'aggancio non falsa la misura.
//
// Uso: node scripts/verifica-studio.mjs   (esce 1 se qualcosa si sposta storto)

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
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('alert'); });
await p.waitForFunction(() => (document.querySelector('.pannello-scheda.visibile') || {}).id === 'scheda-alert', null, { timeout: 20000 });
await p.waitForFunction(() => document.querySelectorAll('#ap-stage .ap-el').length > 4, null, { timeout: 20000 });
await p.waitForTimeout(700);
await p.evaluate(() => document.querySelector('.giro-velo')?.remove());

const centro = (id) => p.evaluate((s) => {
  const el = document.getElementById(s), c = document.getElementById('ovl-preview').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - c.left, y: r.top + r.height / 2 - c.top, w: r.width, h: r.height, cw: c.width, ch: c.height };
}, id);

const elementi = await p.evaluate(() => [...document.querySelectorAll('#ap-stage .ap-el')]
  .filter((e) => e.style.display !== 'none').map((e) => e.id));

const storti = [];
const coperti = [];
let provati = 0;
for (const id of elementi) {
  const c0 = await centro(id);
  // si tira verso il centro della tela: cosi' il limite dei bordi non c'entra
  const dx = (c0.x < c0.cw / 2 ? 40 : -40);
  const dy = (c0.y < c0.ch / 2 ? 25 : -25);
  const bb = await (await p.$('#' + id)).boundingBox();
  // un elemento puo' stare SOTTO un altro: si cerca un punto suo davvero
  // scoperto, altrimenti non e' il trascinamento a essere storto — e' che li'
  // il dito non arriva, e si prova dai livelli.
  const punto = await p.evaluate(([b, s]) => {
    for (const [fx, fy] of [[0.28, 0.32], [0.5, 0.5], [0.75, 0.7], [0.12, 0.8], [0.9, 0.2]]) {
      const x = b.x + b.width * fx, y = b.y + b.height * fy;
      const el = document.elementFromPoint(x, y);
      if (el && el.closest('.ap-el') && el.closest('.ap-el').id === s) return { x, y };
    }
    return null;
  }, [bb, id]);
  if (!punto) { coperti.push(id); continue; }
  const px = punto.x, py = punto.y;
  await p.mouse.move(px, py);
  await p.mouse.down();
  await p.keyboard.down('Alt');
  await p.mouse.move(px + dx, py + dy, { steps: 6 });
  const c1 = await centro(id);
  await p.keyboard.up('Alt');
  await p.mouse.up();
  await p.waitForTimeout(60);
  provati++;
  const ex = Math.round(c1.x - c0.x), ey = Math.round(c1.y - c0.y);
  if (Math.abs(ex - dx) > 2 || Math.abs(ey - dy) > 2) storti.push(`${id}: chiesto ${dx},${dy} → fatto ${ex},${ey}`);
}

// COERENZA DELLA SCELTA. Un elemento si modifica in un posto solo, e quel posto
// sta accanto alla tela: scegliendolo, il pannello deve mostrare i SUOI comandi
// e nient'altro — non due blocchi, non quello di prima, non zero. Prima i
// comandi erano divisi fra il pannello e le carte sotto la tela: per una
// modifica precisa bisognava scendere, e mentre modificavi non vedevi piu'
// l'anteprima.
const chiavi = await p.evaluate(() => ELEMENTI().map((e) => e.k));
const incoerenti = [];
for (const k of chiavi) {
  const r = await p.evaluate((kk) => {
    seleziona(kk);
    const insp = document.getElementById('ovl-inspector');
    return {
      visti: [...insp.querySelectorAll('.asp-blocco')].filter((b) => !b.hidden).map((b) => b.dataset.asp),
      sel: [...document.querySelectorAll('#ap-stage .ap-el.sel')].map((e) => e.id),
      liv: [...document.querySelectorAll('.ovl-liv.scelto')].map((e) => e.dataset.liv),
      nome: (document.getElementById('insp-nome') || {}).textContent,
      atteso: _nomeEl(kk), idAtteso: _idEl(kk), inOverlay: _inOverlay(kk), chiuso: insp.hidden,
    };
  }, k);
  const g = [];
  if (r.visti.length !== 1 || r.visti[0] !== k) g.push(`comandi visibili [${r.visti}]`);
  if (r.inOverlay && (r.sel.length !== 1 || r.sel[0] !== r.idAtteso)) g.push(`sulla tela [${r.sel}]`);
  if (r.liv.length !== 1 || r.liv[0] !== k) g.push(`livelli [${r.liv}]`);
  if (r.nome !== r.atteso) g.push(`titolo «${r.nome}»`);
  if (r.chiuso) g.push('pannello chiuso');
  if (g.length) incoerenti.push(k + ': ' + g.join(', '));
}
const dopoScelta = await p.evaluate(() => {
  deseleziona();
  const insp = document.getElementById('ovl-inspector');
  return { visti: [...insp.querySelectorAll('.asp-blocco')].filter((b) => !b.hidden).length,
    sel: document.querySelectorAll('#ap-stage .ap-el.sel').length, chiuso: insp.hidden };
});

// E niente deve essere rimasto sotto la tela: un campo dimenticato la' e'
// esattamente il difetto da cui si e' partiti.
const rimasti = await p.evaluate(() => document.querySelectorAll(
  '#sez-alert input, #sez-chat input, #sez-musica input, #sez-timer input,'
  + ' #sez-alert select, #sez-chat select, #sez-musica select, #sez-timer select').length);

// L'occhio di un livello: cliccarlo toglie l'elemento dall'overlay E si vede
// che l'ha fatto. Prima l'elemento spariva ma l'occhio restava aperto.
const occhio = await p.evaluate(async () => {
  const riga = document.querySelector('.ovl-liv[data-liv="alert"]');
  const occ = riga && riga.querySelector('[data-occhio]');
  if (!occ) return { errore: 'nessun occhio' };
  const prima = riga.className + '|' + occ.innerHTML.length;
  occ.click();
  await new Promise((r) => setTimeout(r, 150));
  const riga2 = document.querySelector('.ovl-liv[data-liv="alert"]');
  const occ2 = riga2 && riga2.querySelector('[data-occhio]');
  const dopo = riga2.className + '|' + occ2.innerHTML.length;
  const nodo = document.getElementById('ap-alert');
  return { cambiata: prima !== dopo, elementoVia: nodo.style.display === 'none', prima, dopo };
});

await b.close();
srv.close();

const dice = (ok, testo, extra = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`);
  return ok;
};

console.log('\nIl banco di regia sposta le cose dove le porti.\n');
let verde = true;
verde = dice(storti.length === 0,
  `ogni elemento si sposta di quello che chiedi: ${provati} provati${coperti.length ? ` (${coperti.length} coperti da altri)` : ''}`,
  storti.join(' · ')) && verde;
verde = dice(provati >= 6, `elementi davvero provati: ${provati}`, 'la scena della demo ne ha troppo pochi scoperti') && verde;
verde = dice(!!occhio.elementoVia, 'l’occhio toglie davvero l’elemento dalla scena', JSON.stringify(occhio)) && verde;
verde = dice(!!occhio.cambiata, 'e l’occhio si vede che è chiuso', JSON.stringify(occhio)) && verde;
verde = dice(incoerenti.length === 0, `scegliendo un elemento si vedono solo i suoi comandi: ${chiavi.length} elementi`, incoerenti.join(' · ')) && verde;
verde = dice(dopoScelta.visti === 0 && dopoScelta.sel === 0 && dopoScelta.chiuso,
  'e lasciandolo non resta niente acceso', JSON.stringify(dopoScelta)) && verde;
verde = dice(rimasti === 0, 'nessun comando dimenticato sotto la tela', `${rimasti} campi rimasti giù`) && verde;
verde = dice(rotture.length === 0, 'nessun errore di pagina', rotture.join(' · ')) && verde;

console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
