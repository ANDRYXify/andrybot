// Collaudo del PLAYER — gira in un browser vero, quindi vive fuori da
// `npm run cancelli` (i cancelli devono restare statici e istantanei).
//
// Il difetto: il player spariva mentre la canzone andava. Spotify risponde 204
// («niente in riproduzione») anche per un attimo fra due tracce, e un 429, un
// token in rinnovo o la rete che sbatte davano lo stesso identico risultato di
// «non c'e' musica». Un intoppo di un secondo e il player si spegneva — poi
// tornava, con tanto di animazione d'entrata: un lampeggio.
//
// E il difetto opposto, che nessuno vedeva: in PAUSA il player restava, perche'
// «fermo» voleva dire solo «non c'e' nessun brano».
//
// Ora gli stati sono quattro e vogliono dire cose diverse: suona · pausa ·
// niente · non lo so. Su «non lo so» non si decide, si tiene quel che c'e'; su
// «niente» si aspetta una conferma; solo su pausa e niente confermato si toglie
// il player, e solo se e' quello che hai chiesto.
//
// Qui si MISURA quella tabella, stato per stato, con un finto Spotify.
//
// Uso: node scripts/verifica-player.mjs   (esce 1 se il player si spegne quando non deve)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAD, 'src/web/public');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const cop = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#1d4ed8"/></svg>').toString('base64');
const BRANO = { id: 'x', nome: 'Una canzone', artisti: 'Un artista', album: 'Un album', copertina: cop, copertinaGrande: cop, ms: 60000, durata: 200000, bpm: 120, energia: 0.7 };
let risposta = { ...BRANO, stato: 'suona', suona: true };

const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/musica')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(risposta)); }
  if (p.includes('/stream')) { res.writeHead(200, { 'content-type': 'text/event-stream' }); return res.write(':\n\n'); }
  if (/tema|emotes|badges/.test(p)) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{}'); }
  const f = path.join(PUB, p === '/' || /^\/overlay\//.test(p) ? 'overlay.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(''); }
  res.writeHead(200, { 'content-type': TIPI[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));

const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const pg = await b.newPage({ viewport: { width: 900, height: 500 } });
const rotture = [];
pg.on('pageerror', (e) => rotture.push(e.message));
await pg.goto(`http://127.0.0.1:${srv.address().port}/overlay/a?key=x`, { waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof applicaTema === 'function', null, { timeout: 20000 });

const tema = (qf, ent = 'niente') => pg.evaluate(([quandoFermo, entrata]) => applicaTema({
  mostra: { musica: true },
  musica: { attivo: true, verso: 'riga', righe: 'una', testo: '{titolo} — {artista}', testo2: '{artista}',
    cover: 'quadrata', barra: 'sotto', tempi: 'no', onde: true, ritmo: 'onde', sfondo: 'no', daCopertina: false,
    scorre: true, entrata, cambio: true, quandoFermo, posizione: 'alto-sinistra', xy: null,
    stile: { dim: 'media', sfondo: '#0f0f14', opacita: 85, testo: '#ffffff', accento: '#f72fa7', bordoRaggio: 12,
      forma: 'carta', materia: 'piatta', cornice: 'nessuna', font: 'sistema' } },
  timer: null, stato: {}, goals: [], conti: {}, widget: {}, css: '',
}), [qf, ent]);
const inScena = () => pg.evaluate(() => !!document.querySelector('.ovl-musica'));
const passa = (ms) => pg.waitForTimeout(ms);

const prove = [];
const prova = async (nome, atteso) => {
  const c = await inScena();
  prove.push({ nome, atteso, avuto: c, ok: c === atteso });
};

await tema('sparisce'); await passa(1600);
await prova('mentre suona resta in scena', true);
risposta = { stato: 'ignoto', suona: false };
await passa(6200);
await prova('un intoppo non lo spegne', true);
risposta = { ...BRANO, stato: 'suona', suona: true, ms: 90000 };
await passa(6200);
await prova('e quando Spotify torna, e\' ancora li\'', true);
risposta = { stato: 'niente', suona: false };
await passa(6200);
await prova('un solo «niente» (il vuoto fra due tracce) non lo spegne', true);
await passa(6200);
await prova('un «niente» confermato lo spegne', false);
risposta = { ...BRANO, stato: 'pausa', suona: false };
await passa(6200);
await prova('in pausa sparisce, se e\' quello che hai chiesto', false);
await tema('resta'); await passa(6200);
await prova('in pausa resta, se hai chiesto che resti', true);

// E se ne va con garbo: sparire di colpo e' brutto quanto lampeggiare.
risposta = { ...BRANO, stato: 'suona', suona: true };
await tema('sparisce', 'scivola');
await pg.evaluate(() => chiediMusica());
// si aspetta che sia DAVVERO in scena e assestato, invece di sperare nei tempi
await pg.waitForFunction(() => {
  const e = document.querySelector('.ovl-musica');
  return !!e && e.classList.contains('dentro') && Number(getComputedStyle(e).opacity) > 0.95;
}, null, { timeout: 10000 });
risposta = { ...BRANO, stato: 'pausa', suona: false };
await pg.evaluate(() => chiediMusica());
await passa(120);
const uscita = await pg.evaluate(() => {
  const e = document.querySelector('.ovl-musica');
  if (!e) return { cE: false };
  return { cE: true, esce: e.classList.contains('esce'), op: Number(getComputedStyle(e).opacity) };
});
prove.push({ nome: 'se ne va con una transizione, non di colpo',
  atteso: true, avuto: !!(uscita.cE && uscita.esce), ok: !!(uscita.cE && uscita.esce) });
await passa(900);
await prova('e poi sparisce davvero', false);

await b.close();
srv.close();

console.log('\nIl player si spegne solo quando deve.\n');
let verde = true;
for (const p of prove) {
  console.log(`  ${p.ok ? '✓' : '✗'} ${p.nome}${p.ok ? '' : ` — atteso ${p.atteso}, avuto ${p.avuto}`}`);
  verde = p.ok && verde;
}
if (rotture.length) { console.log(`  ✗ errori di pagina: ${rotture.join(' · ')}`); verde = false; }
else console.log('  ✓ nessun errore di pagina');

console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
