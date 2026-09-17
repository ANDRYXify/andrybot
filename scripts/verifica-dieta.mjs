// Cancello della DIETA: la vetrina non paga il pannello.
//
// Sono la stessa pagina — stessa testata, stesso pie', stessa filigrana — ma
// chi ci abita dentro no. Il pannello e' un programma: lo Studio, l'editor
// dell'overlay, la ricerca, il ponte con la regia. La vetrina e' un volantino.
// Finche' i due hanno condiviso l'elenco degli script, la vetrina ha pagato il
// conto del pannello: 434 kB di app.js piu' mezzo megabyte di contorno addosso
// a chi era passato solo a leggere, e il velo di caricamento che restava li'
// finche' quel megabyte non aveva finito di girare.
//
// Qui si apre la home in un browser vero, si pesa OGNI cosa che chiede (gzip,
// come esce da Caddy) e si guarda che:
//  · non chieda nessun file del pannello — l'elenco di quel che le spetta sta
//    in `RISORSE_VETRINA`, e tutto il resto e' del pannello per definizione;
//  · il peso resti sotto il tetto;
//  · la demo, che il pannello lo e' davvero, continui ad avercelo tutto.
//
// Uso: node scripts/verifica-dieta.mjs   (--selftest per provare il cancello)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { guscioVetrina, guscioPannello, RISORSE_VETRINA } from '../src/web/vetrina-vista.js';

process.env.DATA_DIR = process.env.DATA_DIR || fs.mkdtempSync(path.join(tmpdir(), 'dieta-'));
const { pianiPubblici } = await import('../src/features/abbonamenti.js');
const PIANI = pianiPubblici();

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAD, 'src/web/public');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');

// Il tetto: quel che la home puo' pesare in HTML, CSS e JS messi insieme, una
// volta compressi. Non e' un numero tondo scelto a caso — e' la misura di oggi
// con un po' d'aria sopra. Se un domani si sfora, la domanda giusta non e'
// «alzo il tetto?»: e' «cosa e' rientrato dalla finestra?».
const TETTO_KB = 120;

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2' };

const GUSCIO = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
const VETRINA = guscioVetrina(GUSCIO, 'it', { kick: true, piani: PIANI });
const PANNELLO = guscioPannello(GUSCIO);

// Il guasto del selftest: la vetrina si riporta in casa il pannello.
const GRASSA = VETRINA.replace('<script src="vetrina-app.js" defer></script>',
  '<script src="app.js" defer></script>\n  <script src="vetrina-app.js" defer></script>');

const srv = http.createServer((req, res) => {
  const via = new URL(req.url, 'http://x');
  const q = decodeURIComponent(via.pathname);
  if (q.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{}'); }
  if (q === '/' || q === '/index.html') {
    const demo = via.searchParams.get('demo') === '1';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(demo ? PANNELLO : (via.searchParams.get('grassa') === '1' ? GRASSA : VETRINA));
  }
  const f = path.join(PUB, q);
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TIPI[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const PORTA = srv.address().port;

const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

const nudo = (via) => String(via || '').split('?')[0].replace(/^\.?\//, '');
const gz = (buf) => zlib.gzipSync(buf, { level: 9 }).length;

async function apri(indirizzo) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const chiesti = [];
  p.on('response', async (r) => {
    try {
      const u = new URL(r.url());
      if (u.port !== String(PORTA)) return;
      const corpo = await r.body().catch(() => null);
      chiesti.push({ via: nudo(u.pathname), tipo: path.extname(u.pathname) || '.html', peso: corpo ? gz(corpo) : 0 });
    } catch (e) {  }
  });
  await p.goto(`http://127.0.0.1:${PORTA}${indirizzo}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const velo = await p.evaluate(() => !!document.getElementById('splash'));
  await p.close();
  return { chiesti, velo };
}

const guai = [];
const pesoDi = (l, tipi) => l.filter((r) => tipi.includes(r.tipo)).reduce((t, r) => t + r.peso, 0);

// 1) LA VETRINA
const casa = await apri('/');
const ammessi = new Set(RISORSE_VETRINA.map(nudo));
const intrusi = casa.chiesti.filter((r) => ['.js', '.css'].includes(r.tipo) && !ammessi.has(r.via));
for (const i of intrusi) guai.push(`la vetrina chiede ${i.via}, che non e' roba sua (${(i.peso / 1024).toFixed(1)} kB)`);

const peso = pesoDi(casa.chiesti, ['.html', '.js', '.css']);
if (peso > TETTO_KB * 1024) guai.push(`la home pesa ${(peso / 1024).toFixed(1)} kB fra HTML, CSS e JS: il tetto e' ${TETTO_KB}`);
if (casa.velo) guai.push('il velo di caricamento e\' ancora li\' a pagina ferma');

// 2) LA DEMO E' IL PANNELLO, E DEVE AVERLO TUTTO
const demo = await apri('/?demo=1');
if (!demo.chiesti.some((r) => r.via === 'app.js')) guai.push('la demo non carica app.js: il pannello non c\'e\'');

// 3) IL SELFTEST: se il pannello rientra dalla finestra, questo cancello deve accorgersene
let selftest = null;
if (SELFTEST) {
  const finta = await apri('/?grassa=1');
  const visti = finta.chiesti.filter((r) => ['.js', '.css'].includes(r.tipo) && !ammessi.has(r.via));
  selftest = visti.some((r) => r.via === 'app.js');
  if (!selftest) guai.push('SELFTEST: ho rimesso app.js nella vetrina e il cancello non se n\'e\' accorto');
}

await b.close();
srv.close();

const dice = (ok, testo, extra = '') => { console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`); return ok; };
console.log('\nLa vetrina non paga il conto del pannello.\n');
const perTipo = (l, t) => (pesoDi(l, [t]) / 1024).toFixed(1);
console.log(`  · home:  ${perTipo(casa.chiesti, '.html')} kB di pagina, ${perTipo(casa.chiesti, '.css')} kB di stile, ${perTipo(casa.chiesti, '.js')} kB di script — ${(peso / 1024).toFixed(1)} kB in tutto (gzip)`);
console.log(`  · script: ${casa.chiesti.filter((r) => r.tipo === '.js').map((r) => r.via).join(', ') || 'nessuno'}`);
console.log(`  · demo:  ${(pesoDi(demo.chiesti, ['.html', '.js', '.css']) / 1024).toFixed(1)} kB, col pannello intero\n`);
if (SELFTEST) dice(selftest === true, 'il cancello vede il pannello che rientra dalla finestra');
const verde = dice(guai.length === 0, 'la home porta solo la sua roba, e sta sotto il tetto', guai.join(' · '));
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
