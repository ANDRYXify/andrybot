// Cancello del FLUSSO: la pagina dell'overlay sopravvive a un riavvio del bot.
//
// Misurato con Chromium vero: dietro un reverse proxy un riavvio risponde 502
// per qualche secondo, e un EventSource che riceve uno stato diverso da 200 si
// chiude e NON riprova mai piu' (e' la specifica, non un difetto del browser).
// Prima di flusso.js l'overlay in OBS restava cosi': chat ferma, effetti e
// tasti senza destinazione, finche' qualcuno non ricaricava la sorgente.
//
// Cosa misura, con la pagina VERA dell'overlay (overlay.html + overlay-app.js +
// flusso.js) servita da un finto bot:
//   1. dopo un riavvio con 502 di mezzo la pagina si ricollega da sola, rilegge
//      il tema (gli eventi persi non tornano: lo stato si rilegge) e la chat
//      riprende a scrivere;
//   2. una linea aperta ma muta viene riaperta (il battito del server e' un
//      evento, e la pagina lo aspetta);
//   3. il silenzio ammesso dalla pagina e' piu' lungo di tre battiti del server,
//      cosi' un battito in ritardo non fa riaprire una linea sana;
//   4. il guaio si racconta una volta per caduta e una al ritorno, non a ogni
//      tentativo.
//
// Uso: node scripts/verifica-flusso.mjs            (esce 1 se qualcosa non torna)
//      node scripts/verifica-flusso.mjs --selftest (rompe una cosa per volta e
//        pretende che il cancello diventi rosso)

import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname, extname } from 'node:path';
import { apriBrowser, PUB } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

const ROTTURE = [
  ['src/web/public/flusso.js', 'if (es && es.readyState === 2) riapri(passo());', 'if (false) riapri(passo());',
    'dopo un 502 la pagina non riprova mai piu\''],
  ['src/web/public/flusso.js', 'else if (tornato && o.suRitorno) { try { o.suRitorno(n); } catch (e) {} }', '',
    'al ritorno nessuno viene avvisato, e lo stato non si rilegge'],
  ['src/web/public/flusso.js', 'if (Date.now() - ultimo > o.silenzio) { segnaCaduta(); tentativi++; collega(); }', '',
    'una linea aperta ma muta resta muta per sempre'],
  ['src/web/public/overlay-app.js', 'suRitorno: (n) => { caricaTema();', 'suRitorno: (n) => {',
    'l\'overlay torna su ma non rilegge il tema'],
  ['src/web/public/overlay-app.js', 'silenzio: 75000,', 'silenzio: 30000,',
    'il silenzio ammesso e\' piu\' corto di tre battiti: una linea sana verrebbe riaperta'],
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
    const via = join(RAD, file);
    const orig = readFileSync(via, 'utf8');
    if (!orig.includes(da)) {
      console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`);
      cieche++;
      continue;
    }
    writeFileSync(via, orig.replace(da, a));
    let rosso = false, uscita = '';
    try { uscita = execFileSync(process.execPath, [io], { cwd: RAD, encoding: 'utf8', stdio: 'pipe' }); } catch (e) { rosso = true; uscita = String(e.stdout || ''); }
    writeFileSync(via, orig);
    if (/saltato: manca Chromium/.test(uscita)) { console.log('  ✗  senza Chromium l\'autoprova non prova niente'); process.exit(1); }
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche
    ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: il cancello non protegge quello che dice di proteggere.`
    : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
async function finche(cond, ms, che, extra = '') {
  const fine = Date.now() + ms;
  while (Date.now() < fine) {
    if (await cond()) { dice(true, che); return true; }
    await attesa(100);
  }
  dice(false, che, extra || `non e' successo entro ${ms / 1000} s`);
  return false;
}

// --- 3. i numeri si leggono dal sorgente, non si presumono -----------------
const ovl = leggi('src/web/public/overlay-app.js');
const app = leggi('src/web/public/app.js');
const idx = leggi('src/index.js');
const srvJs = leggi('src/web/server.js');
const silOvl = Number((ovl.match(/silenzio:\s*(\d+)/) || [])[1]);
const battito = Number(((idx.match(/effects\.ping\(\),\s*([\d_]+)\)/) || [])[1] || '').replace(/_/g, ''));
dice(silOvl > 0 && battito > 0 && silOvl > 3 * battito,
  `l'overlay aspetta piu' di tre battiti prima di riaprire una linea muta (${silOvl / 1000} s > 3 × ${battito / 1000} s)`,
  'un battito in ritardo farebbe riaprire una linea sana');
const silPonte = Number(((app.match(/regia\/ponte',\s*\{\s*silenzio:\s*(\d+)/) || [])[1]));
const battitoPonte = Number(((srvJs.match(/const battito = setInterval\([^\n]*?, (\d+)\);/) || [])[1]));
dice(silPonte > 0 && battitoPonte > 0 && silPonte > 3 * battitoPonte && /const battito = setInterval\([^\n]*battito"\}/.test(srvJs),
  `il ponte della regia ha un battito visibile e la pagina aspetta piu' di tre battiti (${silPonte / 1000} s > 3 × ${battitoPonte / 1000} s)`,
  'il ponte non manda un evento, o la pagina lo aspetta troppo poco');

// --- il finto bot: la pagina vera, servita con un flusso che puo' cadere ----
const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
const TEMA = { css: '', widget: {}, goals: [], conti: {}, musica: null, timer: null, stato: {}, xy: {},
  mostra: { alert: true, chat: true, wf: true, ws: true, goal: true, cont: true, musica: true, timer: true, effetti: true, consolify: true },
  alertStile: null, chatStile: null };
const SSE = { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' };
const PAGINA_SILENZIO = `<!doctype html><script src="/flusso.js"></script><script>
  window.aperture = 0;
  SB_FLUSSO.apri('/muto', { silenzio: 2500, suAperto: function () { aperture++; }, suRitorno: function () { aperture++; } });
</script>`;

function finto() {
  const st = { giu: false, stream: [], socket: new Set(), tema: 0, guai: [], connessioni: 0, muti: 0 };
  const json = (res, o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  const srv = http.createServer((req, res) => {
    const p = new URL(req.url, 'http://x').pathname;
    if (p === '/overlay/prova/stream') {
      st.connessioni++;
      if (st.giu) { res.writeHead(502, { 'content-type': 'text/html' }); return res.end('bad gateway'); }
      res.writeHead(200, SSE);
      res.write(': connesso\n\n');
      st.stream.push(res); st.socket.add(res.socket);
      req.on('close', () => { st.stream = st.stream.filter((r) => r !== res); st.socket.delete(res.socket); });
      return;
    }
    if (p === '/overlay/prova/tema') { st.tema++; return json(res, TEMA); }
    if (p === '/overlay/prova/guaio') {
      let b = '';
      req.on('data', (c) => { b += c; });
      req.on('end', () => { try { st.guai.push(JSON.parse(b).dove); } catch { /* niente */ } json(res, { ok: true }); });
      return;
    }
    if (p === '/overlay/prova') { res.writeHead(200, { 'content-type': TIPI['.html'] }); return res.end(readFileSync(join(PUB, 'overlay.html'))); }
    if (p.startsWith('/overlay/prova/')) return json(res, {});
    if (p === '/muto') {
      st.muti++;
      res.writeHead(200, SSE);
      res.write('data: {"n":1}\n\n');
      return;
    }
    if (p === '/prova-silenzio') { res.writeHead(200, { 'content-type': TIPI['.html'] }); return res.end(PAGINA_SILENZIO); }
    const f = join(PUB, p.slice(1));
    if (f.startsWith(PUB) && existsSync(f) && !statSync(f).isDirectory()) {
      res.writeHead(200, { 'content-type': TIPI[extname(f)] || 'application/octet-stream' });
      return res.end(readFileSync(f));
    }
    res.writeHead(404); res.end();
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({ srv, st, base: `http://127.0.0.1:${srv.address().port}` })));
}

const browser = await apriBrowser();
if (!browser) { console.log('  –  saltato: manca Chromium o Playwright'); process.exit(0); }
const { srv, st, base } = await finto();
const manda = (ev) => { for (const r of st.stream) r.write('data: ' + JSON.stringify(ev) + '\n\n'); };

try {
  // --- 1. il riavvio dietro il proxy ---------------------------------------
  const page = await browser.newPage();
  const errori = [];
  page.on('pageerror', (e) => errori.push(String(e.message || e)));
  await page.goto(base + '/overlay/prova?key=x');
  await finche(() => st.stream.length >= 1 && st.tema >= 1, 8000, 'la pagina apre il flusso e legge il tema');
  manda({ tipo: 'chat', user: 'prima', testo: 'uno' });
  const righe = () => page.$$eval('#chatlive .chat-riga', (l) => l.length).catch(() => -1);
  await finche(async () => (await righe()) === 1, 5000, 'la chat scrive, prima del riavvio');
  const temaPrima = st.tema, connPrima = st.connessioni;
  st.giu = true;
  for (const s of st.socket) s.destroy();
  await attesa(4000);
  st.giu = false;
  const tornata = await finche(() => st.stream.length >= 1, 25000, 'dopo un riavvio con 502 di mezzo la pagina si ricollega da sola',
    'il flusso e\' rimasto chiuso: l\'overlay in OBS resterebbe fermo fino al ricaricamento');
  if (tornata) {
    dice(st.connessioni - connPrima >= 2, `ha riprovato mentre il proxy rispondeva 502 (${st.connessioni - connPrima} tentativi)`);
    await finche(() => st.tema > temaPrima, 5000, 'al ritorno rilegge il tema', 'gli eventi persi durante la caduta non tornano: lo stato va riletto');
    manda({ tipo: 'chat', user: 'dopo', testo: 'due' });
    await finche(async () => (await righe()) === 2, 5000, 'e la chat riprende a scrivere');
  }
  await attesa(1500);
  const caduti = st.guai.filter((g) => g === 'flusso-caduto').length;
  const tornati = st.guai.filter((g) => g === 'flusso-tornato').length;
  dice(caduti === 1 && tornati === 1, `il guaio si racconta una volta per caduta e una al ritorno (${caduti} caduta, ${tornati} ritorno)`,
    `guai ricevuti: ${st.guai.join(', ') || 'nessuno'}`);
  dice(errori.length === 0, 'la pagina non ha errori', errori.slice(0, 2).join(' | '));
  await page.close();

  // --- 2. la linea muta ----------------------------------------------------
  const p2 = await browser.newPage();
  await p2.goto(base + '/prova-silenzio');
  await finche(() => st.muti >= 1, 5000, 'la prova del silenzio apre la linea');
  await finche(() => st.muti >= 2, 9000, 'una linea aperta ma muta viene riaperta (silenzio ammesso 2,5 s)',
    'il socket resta aperto e nessuno se ne accorge');
  await p2.close();
} finally {
  await browser.close();
  srv.close();
  for (const s of st.socket) s.destroy();
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length
  ? `\n${rossi.length} ${rossi.length === 1 ? 'cosa non torna' : 'cose non tornano'}: l'overlay in OBS non sopravviverebbe a un riavvio.`
  : '\nL\'overlay sopravvive al riavvio e alla linea muta. ✓');
process.exit(rossi.length ? 1 : 0);
