// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello dell'AGGIORNAMENTO CHE NON FA PERDERE NIENTE (docs/AGGIORNARE.md).
//
// Le pagine aperte quando il bot si aggiorna: il pannello (anche in diretta
// dallo Studio) e l'overlay in OBS. Promesse, misurate in Chromium:
//  · una pagina sa con quale versione e' nata (dal suo documento) e si accorge
//    della nuova da qualunque risposta del server;
//  · se non la si sta usando si aggiorna da sola, ma mai sotto gli occhi: al
//    cambio di scheda (sulla scheda scelta) o quando e' nascosta;
//  · se la si sta usando (un campo in cui si scrive, la diretta) non si
//    ricarica MAI da sola: lo dice, e «Aggiorna» lo fa a mano, senza un
//    secondo «vuoi uscire?» del browser; dopo, lo Studio e' aperto e dice
//    come riprendere la diretta;
//  · l'overlay di OBS non mostra riquadri e non si ricarica in diretta ne'
//    con un alert in scena: appena puo', si aggiorna da solo.
//
// Uso: node scripts/verifica-aggiornamento.mjs
//      node scripts/verifica-aggiornamento.mjs --selftest   (rimette un difetto per promessa e li vuole rossi)

import './_dati-usa-e-getta.mjs';
import { apriSito, overlayFinto, chromiumQui, PUB } from './_sito.mjs';
import fs from 'node:fs';
import path from 'node:path';

const CHROMIUM = chromiumQui();
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
let chromium;
if (!CHROMIUM) { console.log('Chromium non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const SELFTEST = process.argv.includes('--selftest');
const ROMPI = Number((process.argv.find((a) => a.startsWith('--rompi=')) || '').split('=')[1]) || 0;
const DIFETTI = {
  '/versione.js': [
    ['  var mia = dallaNavigazione();', "  var mia = '';", 'la pagina sa con quale versione e\' nata', 1, /a cavallo dell'aggiornamento/],
    ['    if (!occupato && (document.hidden || Date.now() - ultimoTocco >= FERMO_MS)) { ricarica(); return; }', '    if (true) { ricarica(); return; }', 'in uso non si ricarica da sola', 2, /mentre ci scrivi non si ricarica/],
    ['      if (!nuova || ricarico || inUso()) return false;', '      return false;', 'al cambio di scheda si aggiorna', 3, /al cambio di scheda si aggiorna/],
    ['      if (!occupato && !live) { ricarica(); return; }', '      if (!occupato) { ricarica(); return; }', 'l\'overlay non si ricarica in diretta', 4, /in diretta l'overlay non si ricarica/],
    ['ricarico: ricarico };', 'ricarico: false };', '«Aggiorna» non chiede due volte', 5, /«Aggiorna» ricarica/],
  ],
  '/flusso.js': [
    ['        if (tornato && window.SB_VERSIONE) { try { window.SB_VERSIONE.controlla(); } catch (e) {} }\n', '', 'un flusso che torna chiede la versione', 6, /finita la diretta l'overlay si aggiorna/],
  ],
  '/overlay-app.js': [
    ['  window.SB_VERSIONE?.registra({ inUso: () => occupato || alertOccupato || codaVisiva.length > 0 || codaAlert.length > 0 });\n', '', 'l\'overlay aspetta che l\'alert finisca', 7, /con un alert in scena/],
  ],
  '/app.js': [
    ['  if (STUDIO.live || STUDIO.avvio) return true;\n  for (const v of STUDIO.rem', '  for (const v of STUDIO.rem', 'in diretta il pannello non si ricarica', 8, /in diretta il pannello non si ricarica/],
    ["  if (d.live) { _aggiornataInDiretta = { cam: !!d.cam, mic: !!d.mic, scr: !!d.scr }; if (schedaAttiva !== 'studio') vaiAScheda('studio'); }", '  if (false) {}', 'dopo, lo Studio dice come riprendere', 8, /lo Studio e' aperto/],
    ['  if (window.SB_VERSIONE?.momentoBuono({ hash: id })) return;\n', '', 'il pannello usa il cambio di scheda', 3, /al cambio di scheda si aggiorna/],
  ],
};
const GRUPPI = [...new Set(Object.values(DIFETTI).flat().map((d) => d[3]))].sort((a, b) => a - b);
if (SELFTEST) {
  const { spawnSync } = await import('node:child_process');
  const sfuggiti = [];
  for (const g of GRUPPI) {
    const giro = spawnSync(process.execPath, [process.argv[1], `--rompi=${g}`], { encoding: 'utf8', env: process.env, timeout: 600000 });
    const rossi = (giro.stdout || '').split('\n').filter((l) => l.trim().startsWith('✗')).map((l) => l.trim());
    for (const [, , nome, gg, re] of Object.values(DIFETTI).flat()) if (gg === g && !rossi.some((l) => re.test(l))) sfuggiti.push(nome);
    console.log(`Giro ${g}: ${rossi.length} promesse rosse.`);
  }
  if (sfuggiti.length) { console.log(`\nAutoprova ROSSA: non si accorge di ${sfuggiti.join('; ')}.`); process.exit(1); }
  console.log(`\nAutoprova: tutti e ${Object.values(DIFETTI).flat().length} i difetti rimessi sono stati visti, in ${GRUPPI.length} giri. ✓`);
  process.exit(0);
}
const serviti = new Map();
if (ROMPI) {
  for (const [via, lista] of Object.entries(DIFETTI)) {
    let t = fs.readFileSync(path.join(PUB, via.slice(1)), 'utf8');
    for (const [da, a, , g] of lista) {
      if (g !== ROMPI) continue;
      if (t.split(da).length !== 2) { console.log(`Autoprova: il difetto «${da.slice(0, 60)}» non si trova una volta sola in ${via}.`); process.exit(1); }
      t = t.replace(da, a);
    }
    serviti.set(via, t);
  }
}

// Il server: la versione in testa a ogni risposta, come il vero
// (Server-Timing), e la porta delle fonti di OBS che dice anche se si e' in onda.
const S = { v: 'aaaaaaaaaaaa', live: false };
const ov = overlayFinto({ login: 'prova' });
const { porta: PORTA, chiudi: chiudiSito } = await apriSito({
  overlay: ov,
  rotte: (req, res, q) => {
    res.setHeader('Server-Timing', `sbv;desc="${S.v}"`);
    if (q === '/overlay/prova/versione') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify({ v: S.v, live: S.live })); return true; }
    return false;
  },
});
const BASE = `http://127.0.0.1:${PORTA}`;
const b = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
// Le promesse si dichiarano tutte qui: una che il collaudo non arriva a
// misurare (una pagina che si ricarica quando non deve e lo ferma a meta')
// esce rossa lo stesso, alla fine.
const P = {
  nata: 'la pagina sa con quale versione e\' nata, dal suo documento',
  cavallo: 'nata a cavallo dell\'aggiornamento (documento vecchio, file nuovi) se ne accorge',
  basta: 'una risposta qualunque del server basta per accorgersi della versione nuova',
  libera: 'libera e sotto gli occhi, non si ricarica: lo dice',
  scheda: 'al cambio di scheda si aggiorna, e si apre la scheda scelta',
  detto: 'e dice che il bot e\' aggiornato',
  scrivi: 'mentre ci scrivi non si ricarica: ne\' al cambio di scheda ne\' nascosta',
  finito: 'e il riquadro dice che si aggiorna appena hai finito',
  nascosta: 'finito di scrivere, nascosta si aggiorna da sola',
  diretta: 'in diretta il pannello non si ricarica da solo, nemmeno nascosto',
  riserva: 'e dice cosa succede alla diretta aggiornando',
  mano: '«Aggiorna» ricarica davvero, senza un secondo «vuoi uscire?» del browser',
  riprendi: 'dopo, lo Studio e\' aperto e dice come riprendere la diretta',
  erroriP: 'nessun errore di pagina nel pannello',
  ovDiretta: 'in diretta l\'overlay non si ricarica, e non mostra riquadri',
  ovFine: 'finita la diretta l\'overlay si aggiorna da solo, appena il flusso torna',
  ovAlert: 'con un alert in scena l\'overlay aspetta: niente si interrompe a meta\'',
  ovDopo: 'e finito l\'alert si aggiorna',
  erroriO: 'nessun errore di pagina nell\'overlay',
};
const esiti = [];
const ok = (cosa, vero, dettaglio = '') => { esiti.push({ cosa, vero: !!vero }); console.log(`  ${vero ? '✓' : '✗'} ${cosa}${!vero && dettaglio ? ' (' + dettaglio + ')' : ''}`); };
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const nuovaVersione = () => { n++; S.v = String(n).repeat(12).slice(0, 12); return S.v; };

async function pagina(url, opz = {}) {
  const p = await b.newPage({ viewport: opz.viewport || { width: 1280, height: 800 }, serviceWorkers: 'block' });
  const err = [];
  p.on('pageerror', (e) => err.push(e.message));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  if (serviti.size) {
    await p.route((u) => u.host === `127.0.0.1:${PORTA}` && serviti.has(u.pathname), async (route) => {
      const via = new URL(route.request().url()).pathname;
      await route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'server-timing': `sbv;desc="${S.v}"` }, body: serviti.get(via) });
    });
  }
  const st = { carichi: 0, err };
  p.on('load', () => { st.carichi++; });
  await p.goto(url, { waitUntil: 'load' });
  return { p, st };
}
const segna = (p) => p.evaluate(() => { window.__stessa = 1; }).catch(() => {});
const stessa = (p) => p.evaluate(() => window.__stessa === 1).catch(() => false);
async function aspettaRicarica(p, st, prima, ms = 6000) {
  const fino = Date.now() + ms;
  while (Date.now() < fino) { if (st.carichi > prima) { await p.waitForLoadState('load').catch(() => {}); return true; } await pausa(100); }
  return false;
}
const tocca = (p) => p.evaluate(() => fetch('/manifest.webmanifest?t=' + Math.random(), { cache: 'no-store' }).then(() => new Promise((r) => setTimeout(r, 150)))).catch(() => {});
const nascondi = (p) => p.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
}).catch(() => {});
const pannelloPronto = (p) => p.waitForFunction(() => typeof vaiAScheda === 'function' && window.SB_VERSIONE?.stato().modo === 'pannello' && !!document.querySelector('.pannello-scheda.visibile'), null, { timeout: 30000 });

const leggi = (p, f, arg) => p.evaluate(f, arg).catch((e) => ({ errore: String(e?.message || e).split('\n')[0] }));

async function pannello() {
  console.log('Il pannello');
  const v0 = S.v;
  let { p, st } = await pagina(`${BASE}/?demo=1&lang=it#stato`);
  await pannelloPronto(p);
  ok(P.nata, (await leggi(p, () => window.SB_VERSIONE.stato().mia)) === v0, JSON.stringify(await leggi(p, () => window.SB_VERSIONE.stato())));

  await segna(p);
  const v1 = nuovaVersione();
  await tocca(p);
  await pausa(400);
  const s1 = await leggi(p, () => ({ ...window.SB_VERSIONE.stato(), testo: document.querySelector('#sb-versione [data-sbv-testo]')?.textContent || '' }));
  ok(P.basta, s1.nuova === v1, JSON.stringify(s1));
  ok(P.libera, (await stessa(p)) && /prossimo cambio di scheda/.test(s1.testo || ''), s1.testo);
  let prima = st.carichi;
  await leggi(p, () => vaiAScheda('moduli'));
  const ricaricata = await aspettaRicarica(p, st, prima);
  if (ricaricata) await pannelloPronto(p).catch(() => {});
  await p.waitForFunction(() => schedaAttiva === 'moduli', null, { timeout: 8000 }).catch(() => {});
  const dopo1 = ricaricata ? await leggi(p, () => ({ hash: location.hash, scheda: schedaAttiva, mia: window.SB_VERSIONE.stato().mia, toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | ') })) : {};
  ok(P.scheda, ricaricata && dopo1.hash === '#moduli' && dopo1.scheda === 'moduli' && dopo1.mia === v1, JSON.stringify(dopo1));
  ok(P.detto, /aggiornato/i.test(dopo1.toast || ''), dopo1.toast);

  await p.waitForFunction(() => !document.querySelector('.pannello-scheda.esce'), null, { timeout: 8000 }).catch(() => {});
  await pausa(800);
  await segna(p);
  await leggi(p, () => { const i = document.createElement('input'); i.type = 'text'; i.id = '__campo'; document.body.appendChild(i); i.focus(); i.value = 'sto scrivendo'; });
  nuovaVersione();
  await tocca(p);
  await leggi(p, () => vaiAScheda('stato'));
  await pausa(800);
  await nascondi(p);
  await pausa(1200);
  const s2 = await leggi(p, () => ({ uso: window.SB_VERSIONE.stato().inUso, testo: document.querySelector('#sb-versione [data-sbv-testo]')?.textContent || '' }));
  ok(P.scrivi, await stessa(p), JSON.stringify(s2));
  ok(P.finito, /appena hai finito/.test(s2.testo || ''), s2.testo);
  prima = st.carichi;
  await leggi(p, () => { document.getElementById('__campo')?.blur(); document.dispatchEvent(new Event('visibilitychange')); });
  ok(P.nascosta, await aspettaRicarica(p, st, prima));
  await p.close();

  ({ p, st } = await pagina(`${BASE}/?demo=1&lang=it#stato`));
  await pannelloPronto(p);
  await segna(p);
  await leggi(p, () => { STUDIO.live = true; });
  nuovaVersione();
  await tocca(p);
  await nascondi(p);
  await pausa(1200);
  const s3 = await leggi(p, () => document.querySelector('#sb-versione [data-sbv-testo]')?.textContent || '');
  ok(P.diretta, await stessa(p), typeof s3 === 'string' ? s3 : JSON.stringify(s3));
  ok(P.riserva, typeof s3 === 'string' && /scritta di riserva/.test(s3) && /Riprendi la diretta/.test(s3), JSON.stringify(s3));
  await leggi(p, () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });
  prima = st.carichi;
  await p.click('[data-sbv-aggiorna]', { timeout: 3000 }).catch(() => {});
  await p.waitForSelector('[data-mdl="si"]', { timeout: 5000 }).catch(() => {});
  await p.click('[data-mdl="si"]', { timeout: 3000 }).catch(() => {});
  const fatto = await aspettaRicarica(p, st, prima);
  ok(P.mano, fatto);
  if (fatto) await pannelloPronto(p).catch(() => {});
  await p.waitForFunction(() => schedaAttiva === 'studio', null, { timeout: 8000 }).catch(() => {});
  const s4 = fatto ? await leggi(p, () => ({ scheda: schedaAttiva, toast: [...document.querySelectorAll('.toast, #tel-avviso')].map((t) => t.textContent).join(' | ') })) : {};
  ok(P.riprendi, s4.scheda === 'studio' && /Riprendi la diretta/.test(s4.toast || ''), JSON.stringify(s4));
  ok(P.erroriP, !st.err.length, st.err.join(' | '));
  await p.close();

  // A cavallo: il documento e' della versione vecchia, tutto quello che arriva
  // dopo e' della nuova (l'aggiornamento e' caduto mentre la pagina si apriva).
  const vecchia = S.v;
  const nuova = nuovaVersione();
  const c = await b.newPage({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  if (serviti.size) {
    await c.route((u) => u.host === `127.0.0.1:${PORTA}` && serviti.has(u.pathname), async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'server-timing': `sbv;desc="${S.v}"` }, body: serviti.get(new URL(route.request().url()).pathname) });
    });
  }
  await c.route((u) => u.pathname === '/' && u.searchParams.get('demo') === '1', async (route) => {
    const r = await route.fetch();
    await route.fulfill({ response: r, headers: { ...r.headers(), 'server-timing': `sbv;desc="${vecchia}"` } });
  });
  await c.goto(`${BASE}/?demo=1&lang=it#stato`, { waitUntil: 'load' });
  await pannelloPronto(c).catch(() => {});
  await pausa(600);
  const sc = await leggi(c, () => window.SB_VERSIONE.stato());
  ok(P.cavallo, sc.mia === vecchia && sc.nuova === nuova, JSON.stringify(sc));
  await c.close();
}

async function overlay() {
  console.log('L\'overlay in OBS');
  S.live = true;
  const { p, st } = await pagina(`${BASE}/overlay/prova?key=x`, { viewport: { width: 1280, height: 720 } });
  await p.waitForFunction(() => window.SB_VERSIONE?.stato().modo === 'schermo', null, { timeout: 10000 });
  await pausa(600);
  await segna(p);
  nuovaVersione();
  let prima = st.carichi;
  ov.cadi();
  await pausa(3500);
  const so = await leggi(p, () => ({ ...window.SB_VERSIONE.stato(), riquadro: !!document.getElementById('sb-versione') }));
  ok(P.ovDiretta, (await stessa(p)) && so.nuova === S.v && so.live === true && !so.riquadro, JSON.stringify(so));
  S.live = false;
  ov.cadi();
  ok(P.ovFine, await aspettaRicarica(p, st, prima, 8000));
  await p.waitForFunction(() => window.SB_VERSIONE?.stato().modo === 'schermo', null, { timeout: 10000 }).catch(() => {});
  await pausa(800);

  await segna(p);
  ov.manda({ tipo: 'alert', evento: 'follow', utente: 'qualcuno', testo: 'qualcuno ti segue', durata: 6000 });
  await pausa(500);
  nuovaVersione();
  prima = st.carichi;
  await leggi(p, () => window.SB_VERSIONE.controlla());
  await pausa(1500);
  const sa = await leggi(p, () => ({ uso: window.SB_VERSIONE.stato().inUso }));
  ok(P.ovAlert, (await stessa(p)) && sa.uso === true, JSON.stringify(sa));
  ok(P.ovDopo, await aspettaRicarica(p, st, prima, 20000));
  ok(P.erroriO, !st.err.length, st.err.join(' | '));
  await p.close();
}

try {
  for (const parte of [pannello, overlay]) {
    try { await parte(); } catch (e) { console.log(`  (il collaudo si e' fermato: ${String(e?.message || e).split('\n')[0]})`); }
  }
} finally {
  await b.close();
  chiudiSito();
}

const misurate = new Set(esiti.map((e) => e.cosa));
for (const cosa of Object.values(P)) if (!misurate.has(cosa)) ok(cosa, false, 'non misurata: il collaudo si e\' fermato prima');
const rossi = esiti.filter((e) => !e.vero);
console.log(rossi.length ? `\n${rossi.length} promesse rosse.` : '\ncollaudo verde ✓');
process.exit(rossi.length ? 1 : 0);
