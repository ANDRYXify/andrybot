// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Collaudo del PLAYER, in un browser vero. Sta fra i cancelli: dove Chromium
// non c'e' (sul server) si salta da solo.
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
// E il player NON SI BLOCCA (docs/OVERLAY.md, «Il player non si blocca»):
//  · una richiesta appesa non ferma le successive: scade, e la canzone dopo
//    arriva;
//  · un «non lo so» non azzera la barra di una canzone che va;
//  · una canzone finita senza letture nuove non resta li' come se suonasse;
//  · a canzone finita si chiede subito la prossima, non al giro dei cinque
//    secondi.
//
// Uso: node scripts/verifica-player.mjs              (esce 1 se il player fa quello che non deve)
//      node scripts/verifica-player.mjs --selftest   (rompe e pretende il rosso)
const ROTTURE = [
  ['src/web/public/overlay-app.js', "  const tempo = setTimeout(function () { if (ferma) ferma.abort(); }, 8000);\n", "  const tempo = 0;\n", 'una richiesta appesa ferma il player per sempre'],
  ['src/web/public/overlay-app.js', "      if (d && d.stato !== 'ignoto') {", "      if (d) {", 'un «non lo so» azzera la barra'],
  ['src/web/public/overlay-app.js', "  const scaduta = musicaFinitaDa() > 15000;", "  const scaduta = false;", 'una canzone finita resta come se suonasse'],
  ['src/web/public/overlay-app.js', " || (musicaFinitaDa() > 1000 && daChiesta > 1500)", '', 'a canzone finita si aspetta il giro dei cinque secondi'],
];
if (process.argv.includes('--selftest')) {
  const { execFileSync } = await import('node:child_process');
  const fsx = await import('node:fs');
  const pathx = await import('node:path');
  const { fileURLToPath: fu } = await import('node:url');
  const io = fu(import.meta.url);
  const rad = pathx.join(pathx.dirname(io), '..');
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
    const via = pathx.join(rad, file);
    const orig = fsx.readFileSync(via, 'utf8');
    if (!orig.includes(da)) { console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`); cieche++; continue; }
    fsx.writeFileSync(via, orig.replace(da, a));
    let rosso = false;
    try { execFileSync(process.execPath, [io], { cwd: rad, encoding: 'utf8', stdio: 'pipe' }); } catch { rosso = true; }
    fsx.writeFileSync(via, orig);
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche ? `\n${cieche} rotture non viste.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromiumQui } from './_sito.mjs';
const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAD, 'src/web/public');
const CHROMIUM = chromiumQui();
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

let chromium;
if (!CHROMIUM) { console.log('Chromium non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const cop = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#1d4ed8"/></svg>').toString('base64');
const BRANO = { id: 'x', nome: 'Una canzone', artisti: 'Un artista', album: 'Un album', copertina: cop, copertinaGrande: cop, ms: 60000, durata: 200000, bpm: 120, energia: 0.7 };
// Il finto server fa quello che fa il vero (features/musica-overlay.js,
// `adesso`): una lettura vale per quando la si consegna, e un brano che suona
// va avanti col tempo da quando Spotify l'ha detto, fino alla sua fine. Un
// server che rimanda sempre lo stesso punto non esiste piu', e qui terrebbe
// viva per sempre una canzone finita.
let risposta = { ...BRANO, stato: 'suona', suona: true };
let detta = Date.now();
const dici = (r) => { risposta = r; detta = Date.now(); };
const adesso = (r) => (r && r.suona && r.durata) ? { ...r, ms: Math.min(r.durata, (r.ms || 0) + (Date.now() - detta)) } : r;
const richieste = [];
const consegne = [];
// E come il vero, il finto manda il battito del flusso ogni 15 s e rilegge il
// tema che il collaudo ha messo: senza battito l'overlay dopo 75 s giudica la
// linea muta, si ricollega e rilegge il tema, e un tema vuoto spegneva il
// player per una ragione che non c'entra con quello che si misura.
let temaServito = {};

const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/musica')) {
    richieste.push(Date.now());
    if (risposta === 'appesa') return;
    consegne.push({ t: Date.now(), stato: risposta.stato });
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(adesso(risposta)));
  }
  if (p.includes('/stream')) {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write(':\n\n');
    const battito = setInterval(() => res.write('data: {"tipo":"battito"}\n\n'), 15000);
    return req.on('close', () => clearInterval(battito));
  }
  if (p.endsWith('/tema')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(temaServito)); }
  if (/emotes|badges/.test(p)) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{}'); }
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

const tema = (quandoFermo, entrata = 'niente') => {
  temaServito = {
    mostra: { musica: true },
    musica: { attivo: true, verso: 'riga', righe: 'una', testo: '{titolo} — {artista}', testo2: '{artista}',
      cover: 'quadrata', barra: 'sotto', tempi: 'no', onde: true, ritmo: 'onde', sfondo: 'no', daCopertina: false,
      scorre: true, entrata, cambio: true, quandoFermo, posizione: 'alto-sinistra', xy: null,
      stile: { dim: 'media', sfondo: '#0f0f14', opacita: 85, testo: '#ffffff', accento: '#f72fa7', bordoRaggio: 12,
        forma: 'carta', materia: 'piatta', cornice: 'nessuna', font: 'sistema' } },
    timer: null, stato: {}, goals: [], conti: {}, widget: {}, css: '',
  };
  return pg.evaluate((t) => applicaTema(t), temaServito);
};
const inScena = () => pg.evaluate(() => !!document.querySelector('.ovl-musica'));
const passa = (ms) => pg.waitForTimeout(ms);

const prove = [];
const prova = async (nome, atteso) => {
  const c = await inScena();
  prove.push({ nome, atteso, avuto: c, ok: c === atteso });
};

await tema('sparisce'); await passa(1600);
await prova('mentre suona resta in scena', true);
dici({ stato: 'ignoto', suona: false });
await passa(6200);
await prova('un intoppo non lo spegne', true);
dici({ ...BRANO, stato: 'suona', suona: true, ms: 90000 });
await passa(6200);
await prova('e quando Spotify torna, e\' ancora li\'', true);
dici({ stato: 'niente', suona: false });
await passa(6200);
await prova('un solo «niente» (il vuoto fra due tracce) non lo spegne', true);
await passa(6200);
await prova('un «niente» confermato lo spegne', false);
dici({ ...BRANO, stato: 'pausa', suona: false });
await passa(6200);
await prova('in pausa sparisce, se e\' quello che hai chiesto', false);
await tema('resta'); await passa(6200);
await prova('in pausa resta, se hai chiesto che resti', true);

// E se ne va con garbo: sparire di colpo e' brutto quanto lampeggiare.
dici({ ...BRANO, stato: 'suona', suona: true });
await tema('sparisce', 'scivola');
await pg.evaluate(() => chiediMusica());
// si aspetta che sia DAVVERO in scena e assestato, invece di sperare nei tempi
await pg.waitForFunction(() => {
  const e = document.querySelector('.ovl-musica');
  return !!e && e.classList.contains('dentro') && Number(getComputedStyle(e).opacity) > 0.95;
}, null, { timeout: 10000 });
dici({ ...BRANO, stato: 'pausa', suona: false });
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

// ── IL PLAYER NON SI BLOCCA ─────────────────────────────────────────────────
const titolo = () => pg.evaluate(() => document.querySelector('.ovl-musica .m-scorri')?.textContent || '');
const barra = () => pg.evaluate(() => Number(document.querySelector('.ovl-musica .m-barra i')?.style.getPropertyValue('--q')) || 0);
const vero = (nome, ok, extra = '') => prove.push({ nome, atteso: true, avuto: ok ? true : extra || false, ok });

// una richiesta appesa: scade, e la canzone dopo arriva
dici({ ...BRANO, stato: 'suona', suona: true });
await tema('sparisce');
await pg.evaluate(() => chiediMusica());
await passa(800);
dici('appesa');
await passa(6000);
dici({ ...BRANO, id: 'y', nome: 'Seconda canzone', stato: 'suona', suona: true, ms: 1000 });
await pg.waitForFunction(() => /Seconda canzone/.test(document.querySelector('.ovl-musica .m-scorri')?.textContent || ''), null, { timeout: 16000 }).catch(() => {});
vero('una richiesta appesa non blocca il player: la canzone dopo arriva', /Seconda canzone/.test(await titolo()), await titolo());

// un «non lo so» non azzera la barra di una canzone che va
dici({ ...BRANO, stato: 'suona', suona: true, ms: 100000 });
await pg.evaluate(() => chiediMusica());
await passa(600);
const prima = await barra();
dici({ stato: 'ignoto', suona: false });
const daIgnoto = detta;
// si guarda DOPO che un «non lo so» e' arrivato e il battito dell'overlay (uno
// al secondo, ed e' lui che muove la barra) l'ha avuto in mano: guardare a un
// tempo fisso a volte guardava prima, e non vedeva niente
await pg.evaluate(() => chiediMusica());
for (let i = 0; i < 100 && !consegne.some((c) => c.t >= daIgnoto && c.stato === 'ignoto'); i++) await passa(100);
await passa(1300);
const dopo = await barra();
vero('un «non lo so» non azzera la barra: la canzone continua', prima > 0.45 && dopo >= prima, `da ${prima} a ${dopo}`);

// a canzone finita si chiede subito la prossima
dici({ ...BRANO, stato: 'suona', suona: true, ms: BRANO.durata - 7000 });
// la fine e' quella vera, sette secondi dopo che Spotify l'ha detto
const fine = detta + 7000;
// l'ultima lettura prima della fine la si fa mezzo secondo prima: cosi' il
// giro dei cinque secondi cadrebbe quattro secondi e mezzo dopo la fine, e
// chiedere prima lo fa solo la regola. Senza fissare questa fase il giro
// cadeva a caso, e una volta su due passava anche senza la regola
await passa(Math.max(0, fine - 500 - Date.now()));
await pg.evaluate(() => chiediMusica());
await passa(Math.max(0, fine - Date.now()) + 3500);
const dopoFine = richieste.filter((t) => t > fine);
const prima1 = dopoFine.length ? dopoFine[0] - fine : Infinity;
vero('a canzone finita si chiede subito la prossima, non al giro dei cinque secondi', prima1 <= 2600, `la prima richiesta dopo la fine e\' arrivata dopo ${prima1} ms`);

// una canzone finita senza letture nuove non resta come se suonasse
dici({ ...BRANO, stato: 'suona', suona: true, ms: BRANO.durata - 3000 });
await pg.evaluate(() => chiediMusica());
await passa(600);
dici({ stato: 'ignoto', suona: false });
await passa(8000);
await prova('finita la canzone e senza letture nuove, per un po\' resta', true);
// la fine e' a 3 s; quindici secondi dopo, la prima lettura (una ogni due
// secondi a canzone finita) lo fa uscire, e l'uscita dura meno di un secondo:
// al massimo 17,9 s dopo la fine. Si guarda a 20
await passa(14500);
await prova('ma quindici secondi dopo la fine non resta come se suonasse', false);

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
