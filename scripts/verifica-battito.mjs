// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello del battito: i giri che devono andare avanti a pannello nascosto.
//
// Il pannello aperto sul computer della regia sta quasi sempre DIETRO al gioco.
// Chrome, dopo cinque minuti di scheda nascosta, fa partire i timer della
// pagina una volta al minuto (la «intensive wake up throttling»), anche con la
// regia collegata: misurato, un giro ogni due secondi diventava zero giri in
// venti secondi. Una schermata di morte resta a schermo tre secondi: guardando
// una volta al minuto, le morti si perdevano quasi tutte. I timer di un worker
// invece non si toccano, e i suoi messaggi arrivano alla pagina anche nascosta.
//
// Qui si rifà la misura, col codice vero (src/web/public/morti.js e battito.js,
// minificati come li serve il sito):
//
//  · CONTROLLO: nella stessa pagina gira anche un timer della pagina. Deve
//    rallentare. Se non rallenta il banco non riproduce Chrome, e un verde
//    sul battito non vorrebbe dire niente: il cancello e' rosso.
//  · IL BATTITO: SB_MORTI.ogni deve battere come se la scheda fosse davanti.
//  · LA SERRATURA: con due schede, a guardare e' una sola (SB_MORTI.dasolo); se
//    quella si chiude, o smette, l'altra subentra.
//
// Si parla a Chrome direttamente (protocollo DevTools), non con Playwright:
// Playwright tiene le pagine «visibili» per conto suo, e la scheda non si
// nasconderebbe mai. Il tempo di grazia si accorcia da cinque minuti a dieci
// secondi con la stessa opzione che Chrome usa per le sue prove.
//
// Uso: node scripts/verifica-battito.mjs   (esce 1 se qualcosa non torna)

import http from 'node:http';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { minificaJs } from '../src/web/minifica.js';
import { chromiumQui } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(RAD, 'src/web/public');
const CHROMIUM = chromiumQui();
if (!CHROMIUM) { console.log('  –  saltato: manca Chromium o Playwright'); process.exit(0); }
const GRAZIA_S = 10;
const MISURA_S = 20;

const PAGINA = `<!doctype html><meta charset="utf-8"><title>battito</title><script src="/morti.js"></script><script src="/prova.js"></script>`;
const PROVA = `
window.pagina = []; window.battito = [];
var modo = new URLSearchParams(location.search).get('modo');
if (modo === 'battito') {
  setInterval(function () { window.pagina.push(Date.now()); }, 1000);
  window.SB_MORTI.ogni(1000, function () { window.battito.push(Date.now()); });
}
if (modo === 'serratura') {
  window.presa = false;
  window.ferma = window.SB_MORTI.dasolo('sb-prova', function () {
    window.presa = true;
    return function () { window.presa = false; };
  });
}
`;

const esiti = [];
const dice = (ok, msg) => esiti.push({ ok, msg });
const attesa = (ms) => new Promise((ok) => setTimeout(ok, ms));

// Il pannello li riceve minificati: si prova quello che esce davvero.
const SERVITI = {
  '/morti.js': await minificaJs(readFileSync(join(PUB, 'morti.js'), 'utf8')),
  '/battito.js': await minificaJs(readFileSync(join(PUB, 'battito.js'), 'utf8')),
};

const srv = http.createServer((q, r) => {
  const via = q.url.split('?')[0];
  const dati = via === '/prova.html' ? [PAGINA, 'text/html']
    : via === '/prova.js' ? [PROVA, 'text/javascript']
    : SERVITI[via] ? [SERVITI[via], 'text/javascript']
    : null;
  if (!dati) { r.statusCode = 404; return r.end(); }
  r.setHeader('content-type', dati[1] + '; charset=utf-8');
  r.end(dati[0]);
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${srv.address().port}`;

const profilo = mkdtempSync(join(tmpdir(), 'andrybot-battito-'));
const chrome = spawn(CHROMIUM, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profilo}`,
  `--enable-features=IntensiveWakeUpThrottling:grace_period_seconds/${GRAZIA_S}`,
  'about:blank',
], { stdio: 'ignore', detached: true });
chrome.on('error', (e) => dice(false, `Chromium non parte: ${e?.message || e}`));

let ws = null;
const chiuso = new Promise((ok) => chrome.once('exit', ok));
const fine = async (codice) => {
  try { ws?.close(); } catch { /* niente */ }
  try { process.kill(-chrome.pid, 'SIGKILL'); } catch { try { chrome.kill('SIGKILL'); } catch { /* niente */ } }
  await Promise.race([chiuso, attesa(5000)]);
  srv.close();
  try { rmSync(profilo, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* niente */ }
  process.exit(codice);
};

try {
  let porta = null;
  for (let i = 0; i < 100 && !porta; i++) {
    await attesa(100);
    const f = join(profilo, 'DevToolsActivePort');
    if (existsSync(f)) porta = readFileSync(f, 'utf8').split('\n')[0].trim() || null;
  }
  if (!porta) throw new Error('Chrome non si e\' aperto');
  const ver = await (await fetch(`http://127.0.0.1:${porta}/json/version`)).json();
  ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = () => no(new Error('protocollo DevTools chiuso')); });
  let n = 0;
  const attese = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && attese.has(m.id)) { attese.get(m.id)(m); attese.delete(m.id); } };
  const manda = (method, params = {}, sessionId) => new Promise((ok) => {
    const id = ++n; attese.set(id, ok); ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const apri = async (url, opz = {}) => {
    const t = (await manda('Target.createTarget', { url, ...opz })).result.targetId;
    const s = (await manda('Target.attachToTarget', { targetId: t, flatten: true })).result.sessionId;
    const val = async (espr) => (await manda('Runtime.evaluate', { expression: espr, returnByValue: true }, s)).result?.result?.value;
    for (let i = 0; i < 50 && !(await val('!!window.SB_MORTI')); i++) await attesa(100);
    return { t, val };
  };

  // ── il battito, con la scheda nascosta ─────────────────────────────────────
  const a = await apri(`${BASE}/prova.html?modo=battito`);
  await attesa(1500);
  await manda('Target.createTarget', { url: 'about:blank', newWindow: false, background: false });
  const t0 = Date.now();
  await attesa(1000);
  const vis = await a.val('document.visibilityState');
  if (vis !== 'hidden') {
    dice(false, `la scheda del pannello non si nasconde (${vis}): la misura non si puo' fare`);
  } else {
    await attesa((GRAZIA_S + MISURA_S) * 1000 + 5000);
    const da = t0 + (GRAZIA_S + 5) * 1000;
    const r = await a.val(`JSON.stringify({ p: pagina.filter((t) => t > ${da}).length, b: battito.filter((t) => t > ${da}).length, s: (Date.now() - ${da}) / 1000 })`);
    const { p, b, s } = JSON.parse(r);
    dice(p <= 2, `controllo: a scheda nascosta il timer della pagina rallenta (${p} giri in ${Math.round(s)} s)`
      + (p <= 2 ? '' : ' — il banco non riproduce Chrome, e la misura sul battito non varrebbe niente'));
    dice(b >= Math.floor(s * 0.8), `il battito del worker non rallenta (${b} giri in ${Math.round(s)} s)`);
  }

  // ── la serratura: una scheda sola ──────────────────────────────────────────
  const c = await apri(`${BASE}/prova.html?modo=serratura`);
  const d = await apri(`${BASE}/prova.html?modo=serratura`);
  await attesa(500);
  const prese = async () => [await c.val('window.presa'), await d.val('window.presa')];
  let pp = await prese();
  dice(pp.filter(Boolean).length === 1, `con due schede ne guarda una sola (${JSON.stringify(pp)})`);
  const [chi, altra] = pp[0] ? [c, d] : [d, c];
  await chi.val('window.ferma()');
  await attesa(500);
  pp = [await chi.val('window.presa'), await altra.val('window.presa')];
  dice(pp[0] === false && pp[1] === true, `se quella smette, subentra l'altra (${JSON.stringify(pp)})`);
  const e = await apri(`${BASE}/prova.html?modo=serratura`);
  await attesa(300);
  dice(await e.val('window.presa') === false, 'una terza scheda aspetta');
  await manda('Target.closeTarget', { targetId: altra.t });
  let subentra = false;
  for (let i = 0; i < 30 && !subentra; i++) { await attesa(100); subentra = await e.val('window.presa') === true; }
  dice(subentra, 'se la scheda che guarda si chiude, subentra quella che aspettava');
} catch (err) {
  dice(false, `il banco si e' rotto: ${err?.message || err}`);
}

for (const x of esiti) console.log(`${x.ok ? '✓' : '✗'} ${x.msg}`);
const rotti = esiti.filter((x) => !x.ok).length;
console.log(rotti ? `\n${rotti} cose non tornano. ✗` : '\nI giri del pannello vanno avanti anche dietro al gioco. ✓');
await fine(rotti ? 1 : 0);
