// Collaudo della LARGHEZZA: la pagina non deve mai scorrere di lato, e niente
// di quello che si legge o si tocca deve finire tagliato dal bordo.
//
// Perche' esiste. Su uno schermo largo non si vede: il contenuto ci sta, e chi
// prova la modifica su un portatile non ha nessun motivo di sospettare. Su un
// telefono invece la pagina scivola di lato, il testo esce dal bordo della
// scheda a meta' frase, i bottoni finiscono oltre il contorno. Ed e' successo
// davvero, due volte, per ragioni che nessuno indovinerebbe leggendo il CSS.
//
// La prima (le schede del pannello): `overflow: hidden` rende una scatola un
// CONTENITORE CHE SCORRE, e la dimensione minima automatica di un contenitore
// che scorre e' ZERO. Era quel dettaglio a impedire che un indirizzo lungo
// allargasse la scheda oltre lo schermo; cambiato in `overflow: clip`, tre
// schede sono uscite di 212px. La cura e' dire la minima a voce
// (`min-width: 0`) invece di ereditarla da un effetto collaterale.
//
// La seconda (la home, da un iPhone): le decorazioni della scena in cima
// sbordano di mezzo schermo per lato (`inset: ... -50vw`) e la pagina contava
// su `html { overflow-x: clip }` per nasconderle. Sul computer basta; sul
// telefono no. Il clip sulla radice diventa quello del viewport, e il browser
// del telefono allarga lo stesso il viewport fino al contenuto: 567px su uno
// schermo da 390, e la pagina si trascina di lato. E il colpevole non era un
// elemento ma uno pseudo-elemento, che il collaudo di allora non guardava.
// La regola ora (docs/MOBILE.md, «La pagina non scorre di lato»): il body di
// ogni pagina ritaglia davvero (`position: relative; overflow-x: clip`), e gli
// strati fissi grandi quanto lo schermo ritagliano allo schermo.
//
// Un ritaglio pero' nasconde, e un collaudo che guardasse solo «la pagina
// scorre?» con il ritaglio acceso sarebbe sempre verde anche con un testo
// tagliato a meta'. Per questo si misurano due cose diverse:
//
//  1. IL TELEFONO. Aperta come da un telefono (viewport mobile, tocco), dal
//     primo fotogramma il viewport non si allarga mai e la pagina non scorre.
//     Se si allarga, si nomina chi sborda, pseudo-elementi compresi (letti
//     dal protocollo di Chromium, perche' la pagina non li vede).
//  2. NIENTE DI TAGLIATO. Nessun testo, link, tasto, campo o immagine esce
//     dal bordo dello schermo, a meno che non stia in un riquadro che scorre o
//     ritaglia per conto suo (una tabella larga, una scritta che scorre). Le
//     decorazioni senza testo possono uscire: il ritaglio le taglia apposta.
//
// Dove: le schede del pannello a 360px, e le pagine pubbliche (la home in tre
// lingue, le guide, la pagina che non c'e', le pagine statiche, la pagina
// link degli streamer in ogni stile) a 320, 360, 390 e 430px.
//
// Uso: node scripts/verifica-larghezza.mjs
//      node scripts/verifica-larghezza.mjs --selftest   (rompe una cosa per volta)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { apriSito } from './_sito.mjs';

process.env.DATA_DIR = process.env.DATA_DIR || fs.mkdtempSync(path.join(tmpdir(), 'larghezza-'));
const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAD, 'src/web/public');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const ROMPI = (process.argv.find((a) => a.startsWith('--rompi=')) || '').slice('--rompi='.length);

// L'AUTOPROVA. Ogni rottura rilancia il collaudo rotto in un modo solo, e
// pretende il rosso E il segno giusto nel racconto: non basta che qualcosa
// vada rosso, deve andare rosso per la ragione giusta.
//  · pannello: la minima automatica com'era quando la ereditavamo per sbaglio;
//  · guscio:   il body smette di ritagliare, come prima: la home deve tornare
//              larga 567 e il colpevole nominato deve essere lo pseudo-elemento;
//  · testo:    il titolo della home non va piu' a capo: il ritaglio lo
//              nasconderebbe, la seconda misura no.
const ROTTURE = [
  ['pannello', /✗ pannello · /, 'nel pannello una scheda piu\' larga dello schermo'],
  ['guscio', /section\.vt-scena::before/, 'il body smette di ritagliare: la home si allarga, e il colpevole e\' uno pseudo-elemento'],
  ['testo', /tagliat.*vt-titolo|vt-titolo.*tagliat/, 'un titolo che non va a capo, nascosto dal ritaglio'],
];
if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [parte, segno, che] of ROTTURE) {
    let uscita = '', rosso = false;
    try { uscita = execFileSync(process.execPath, [io, `--rompi=${parte}`], { cwd: RAD, encoding: 'utf8', stdio: 'pipe' }); } catch (e) { rosso = true; uscita = String(e.stdout || ''); }
    if (/collaudo saltato/.test(uscita)) { console.log('  ✗  senza Chromium l\'autoprova non prova niente'); process.exit(1); }
    const visto = rosso && segno.test(uscita);
    console.log((visto ? '  ✓  ' : '  ✗  ') + che + (visto ? '' : rosso ? '  → rosso, ma per un\'altra ragione' : '  → PASSA INOSSERVATO'));
    if (!visto) cieche++;
  }
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: il collaudo non protegge quello che dice.` : "\nOgni rottura e' vista. Il collaudo e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

// Il viewport piu' largo visto, a ogni fotogramma: il telefono decide quanto
// e' larga la pagina appena la disegna, e poi non torna indietro (provato:
// togliere dopo il colpevole non la restringe). Si conta da quando il documento
// e' letto: prima il telefono usa i suoi 980px di serie, perche' non ha ancora
// letto il <meta name="viewport">, e quella non e' una larghezza della pagina.
const SENTINELLA = () => {
  window.__largoMax = 0;
  const giro = () => { if (innerWidth > window.__largoMax) window.__largoMax = innerWidth; requestAnimationFrame(giro); };
  document.addEventListener('DOMContentLoaded', giro);
};
// Una regola messa prima di ogni altra, per le rotture dell'autoprova. Quando
// parte, il documento puo' non avere ancora la radice: allora si aspetta che
// compaia (la prima versione ci provava subito, falliva in silenzio, e le
// rotture non arrivavano mai alla pagina).
const REGOLA_PRESTO = (css) => {
  const s = document.createElement('style');
  s.textContent = css;
  const metti = () => { if (!document.documentElement) return false; (document.head || document.documentElement).appendChild(s); return true; };
  if (!metti()) new MutationObserver((_, o) => { if (metti()) o.disconnect(); }).observe(document, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
};

// 2. NIENTE DI TAGLIATO. Si guarda ogni pezzo di testo (i suoi rettangoli
// veri, riga per riga) e ogni cosa che si tocca o si guarda.
const TAGLIATI = `(() => {
  const L = document.documentElement.clientWidth;
  const nome = (x) => x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + (String(x.className || '').trim() && typeof x.className === 'string'
    ? '.' + x.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  // Chi e' gia' ritagliato da una scatola sua non e' tagliato dalla pagina: un
  // testo che finisce coi tre puntini nella sua riga, una scritta che scorre.
  // Per un testo la scatola che lo contiene conta; per un elemento, no: il suo
  // overflow ritaglia quello che ha dentro, non lui.
  const escluso = (el, testo) => {
    for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return true;
      if (s.clip !== 'auto' || s.clipPath !== 'none') return true;
      if ((testo || a !== el) && s.overflowX !== 'visible') return true;
    }
    return false;
  };
  const fuori = (r) => r.width > 0.5 && r.height > 0.5 && (r.right > L + 1 || r.left < -1);
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    if (!t.nodeValue.trim() || !t.parentElement || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(t.parentElement.tagName)) continue;
    const g = document.createRange(); g.selectNodeContents(t);
    const r = [...g.getClientRects()].find(fuori);
    const via = (x) => [x.parentElement && x.parentElement !== document.body ? nome(x.parentElement) : '', nome(x)].filter(Boolean).join(' > ');
    if (r && !escluso(t.parentElement, true)) out.push({ chi: via(t.parentElement), cosa: '«' + t.nodeValue.trim().slice(0, 28) + '»', da: Math.round(r.left), a: Math.round(r.right) });
  }
  for (const e of document.body.querySelectorAll('a, button, input, select, textarea, img, video, [role=button]')) {
    const r = e.getBoundingClientRect();
    if (fuori(r) && !escluso(e)) out.push({ chi: nome(e), cosa: e.tagName.toLowerCase(), da: Math.round(r.left), a: Math.round(r.right) });
  }
  const visti = new Set();
  return out.filter((x) => { const k = x.chi + x.cosa; if (visti.has(k)) return false; visti.add(k); return true; })
    .sort((a, b) => (b.a - L) - (a.a - L)).slice(0, 4);
})()`;

// Chi allarga la pagina. Gli elementi li vede la pagina; gli pseudo-elementi
// (::before, ::after) no, e li si chiede al protocollo di Chromium. Non conta
// chi sta in uno strato fisso o dentro un riquadro che ritaglia o scorre: la
// pagina non lo vede.
async function chiAllarga(p) {
  const L = await p.evaluate(() => {
    const L = document.documentElement.clientWidth;
    for (const e of document.querySelectorAll('body, body *')) {
      let chiuso = false;
      for (let a = e; a && a !== document.documentElement; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (s.position === 'fixed' || (a !== document.body && a !== e && s.overflowX !== 'visible')) { chiuso = true; break; }
      }
      if (chiuso) e.setAttribute('data-larg-chiuso', '');
      if (getComputedStyle(e).overflowX !== 'visible') e.setAttribute('data-larg-ritaglia', '');
      const fissi = ['before', 'after'].filter((ps) => getComputedStyle(e, '::' + ps).position === 'fixed');
      if (fissi.length) e.setAttribute('data-larg-psfissi', fissi.join(' '));
    }
    return L;
  });
  const nome = (n) => {
    const a = {}; for (let i = 0; i < (n.attributes || []).length; i += 2) a[n.attributes[i]] = n.attributes[i + 1];
    return { n: n.localName + (a.id ? '#' + a.id : '') + (a.class ? '.' + a.class.trim().split(/\s+/).slice(0, 2).join('.') : ''), a };
  };
  const cdp = await p.context().newCDPSession(p);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const out = [];
  const guarda = async (nodo, chi) => {
    try {
      const { model } = await cdp.send('DOM.getBoxModel', { nodeId: nodo.nodeId });
      const xs = model.border.filter((_, i) => i % 2 === 0);
      const da = Math.min(...xs), a = Math.max(...xs);
      if (a > L + 1 || da < -1) out.push({ chi, da: Math.round(da), a: Math.round(a) });
    } catch { /* senza scatola: non disegnato */ }
  };
  const visita = async (nodo) => {
    if (nodo.nodeType === 1 && nodo.localName !== 'html' && nodo.localName !== 'head') {
      const { n, a } = nome(nodo);
      const conta = a['data-larg-chiuso'] === undefined;
      if (conta && nodo.localName !== 'body') await guarda(nodo, n);
      if (conta && a['data-larg-ritaglia'] === undefined) {
        for (const ps of nodo.pseudoElements || []) {
          if (!(a['data-larg-psfissi'] || '').split(' ').includes(ps.pseudoType)) await guarda(ps, n + '::' + ps.pseudoType);
        }
      }
    }
    for (const f of nodo.children || []) await visita(f);
  };
  await visita(root);
  await cdp.detach();
  return out.sort((x, y) => (y.a - L) - (x.a - L)).slice(0, 3);
}

async function misura(p) {
  return p.evaluate(() => ({ largo: document.documentElement.clientWidth, visto: window.__largoMax || innerWidth, scorre: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
}

const rotte = [];
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const nuova = async (largo) => {
  const p = await b.newPage({ viewport: { width: largo, height: 850 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.addInitScript(SENTINELLA);
  if (ROMPI === 'guscio') await p.addInitScript(REGOLA_PRESTO, 'body { overflow-x: visible !important; position: static !important; }');
  if (ROMPI === 'testo') await p.addInitScript(REGOLA_PRESTO, '.vt-titolo, .vt-titolo * { white-space: nowrap !important; }');
  return p;
};

// ---- IL PANNELLO -------------------------------------------------------------
// Chi sfonda nel pannello. Due modi di uscire, e per ognuno si cerca il PRIMO:
// e' piu' largo dello spazio che il padre gli da', oppure e' largo giusto ma
// sta spostato oltre il bordo dello schermo (un'animazione d'entrata che parte
// da fuori). Serve a dire CHI spinge, quando la seconda misura trova un testo
// tagliato: il testo e' la vittima, questo e' il colpevole.
const SFONDA = `(() => {
  const out = [];
  const pannello = document.querySelector('.pannello-scheda.visibile');
  const bordo = document.documentElement.clientWidth;
  const nome = (x, n) => (x.tagName.toLowerCase() + (String(x.className || '').trim()
    ? '.' + String(x.className).split(/\\s+/).filter(Boolean).slice(0, n).join('.') : ''));
  const chiuso = (e) => {
    for (let a = e.parentElement; a && a !== pannello; a = a.parentElement) {
      if (getComputedStyle(a).overflowX !== 'visible') return true;
    }
    return false;
  };
  for (const e of pannello ? pannello.querySelectorAll('*') : []) {
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.position === 'fixed' || s.position === 'absolute') continue;
    const r = e.getBoundingClientRect();
    if (r.width < 4) continue;
    const pa = e.parentElement;
    if (!pa || chiuso(e)) continue;
    const sp = getComputedStyle(pa);
    const dentro = pa.clientWidth - (parseFloat(sp.paddingLeft) || 0) - (parseFloat(sp.paddingRight) || 0);
    const sfonda = dentro > 0 ? Math.round(r.width - dentro) : 0;
    const esce = Math.round(r.right - bordo);
    const padreEsce = pa.getBoundingClientRect().right - bordo > 2;
    if (sfonda > 2) {
      out.push({ chi: nome(e, 3).slice(0, 44), come: 'sfonda ' + sfonda + 'px dentro ' + nome(pa, 2).slice(0, 30), quanto: sfonda });
    } else if (esce > 2 && !padreEsce) {
      out.push({ chi: nome(e, 3).slice(0, 44), come: 'esce di ' + esce + 'px dal bordo dello schermo' + (s.transform !== 'none' ? ", spostato da un'animazione" : ''), quanto: esce });
    }
  }
  return out.sort((a, b) => b.quanto - a.quanto).slice(0, 3);
})()`;

const PANNELLO = 360;
let schede = [];
{
  const { porta, chiudi } = await apriSito();
  const p = await nuova(PANNELLO);
  await p.goto(`http://127.0.0.1:${porta}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  await p.addStyleTag({ content: '.giro-velo,.giro-fumetto,#cookie-banner{display:none!important}' });
  if (ROMPI === 'pannello') await p.addStyleTag({ content: '.carta-corpo > .carta-corpo-in { min-width: auto !important; }' });
  schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
  const m0 = await misura(p);
  if (m0.visto > m0.largo) rotte.push({ dove: 'pannello · apertura', righe: [`il viewport si allarga a ${m0.visto}px su ${m0.largo}`, ...(await chiAllarga(p)).map((c) => `${c.chi} da ${c.da} a ${c.a}`)] });
  for (const id of schede) {
    try { await p.evaluate((x) => window.SB_APP.vai(x), id); } catch { continue; }
    await p.waitForTimeout(220);
    const m = await misura(p);
    const tagliati = await p.evaluate(new Function('return ' + TAGLIATI));
    if (m.scorre > 1 || tagliati.length) {
      const colpevoli = await p.evaluate(new Function('return ' + SFONDA));
      rotte.push({ dove: `pannello · ${id}`, righe: [
        ...(m.scorre > 1 ? [`la pagina scorre di ${m.scorre}px`] : []),
        ...tagliati.map((t) => `tagliato ${t.cosa} in ${t.chi} (da ${t.da} a ${t.a}px)`),
        ...colpevoli.map((c) => `chi spinge: ${c.chi}  ${c.come}`),
      ] });
    }
  }
  await p.close();
  await chiudi();
}

// ---- LE PAGINE PUBBLICHE -----------------------------------------------------
// Ognuna servita com'e' in produzione: la home dal suo guscio a dieta, le
// guide e la pagina che non c'e' dai loro costruttori, le statiche dal disco,
// la pagina link dal suo costruttore in ogni stile. I blocchi della pagina link
// sono quelli che uno streamer scrive davvero, compreso un indirizzo lungo
// incollato in un testo: e' la riga che su un telefono non va a capo.
const LARGHI = [320, 360, 390, 430];
const { guscioVetrina } = await import('../src/web/vetrina-vista.js');
const { pianiPubblici } = await import('../src/features/abbonamenti.js');
const { paginaIndice, paginaGuida, GUIDE } = await import('../src/web/guide.js');
const { pagina404 } = await import('../src/web/pagine-servizio.js');
const { renderLinkPage } = await import('../src/features/linkpagina.js');

const INDIRIZZO_LUNGO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG&index=12';
const BLOCCHI = [
  { tipo: 'titolo', testo: 'Tutto quello che faccio' },
  { tipo: 'testo', testo: `Il video della settimana: ${INDIRIZZO_LUNGO}` },
  { tipo: 'link', label: 'Il mio canale, tutte le sere', sotto: 'https://www.twitch.tv/unnomeutentemoltolungo_senzaspazi', url: 'https://twitch.tv/prova' },
  { tipo: 'social', voci: ['twitch', 'youtube', 'instagram', 'tiktok', 'x', 'discord', 'kick'].map((icona) => ({ icona, url: `https://${icona}.com/prova` })) },
  { tipo: 'numeri', voci: [{ n: '12.345', etichetta: 'follower' }, { n: '678', etichetta: 'dirette' }, { n: '9', etichetta: 'anni' }] },
  { tipo: 'faq', voci: [{ d: 'Quando vai in diretta?', r: 'Tutte le sere alle nove, tranne la domenica.' }] },
  { tipo: 'scritta', testo: 'Nuovo video ogni settimana' },
  { tipo: 'griglia', voci: [{ titolo: 'Uno', testo: 'Primo' }, { titolo: 'Due', testo: 'Secondo' }, { titolo: 'Tre', testo: 'Terzo' }] },
];
const STILI = [...fs.readFileSync(path.join(RAD, 'src/features/linkpagina.js'), 'utf8').match(/const PRESET = \{([\s\S]*?)\n\};/)[1].matchAll(/^\s{2}([a-z]+):/gm)].map((m) => m[1]);

const guscio = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
const piani = pianiPubblici();
const PAGINE = {
  ...Object.fromEntries(['it', 'en', 'es'].map((l) => [`home-${l}`, () => guscioVetrina(guscio, l, { kick: true, youtube: false, piani })])),
  'guide': () => paginaIndice('it'),
  'guida': () => paginaGuida(GUIDE[0].id, 'it'),
  'guida-en': () => paginaGuida(GUIDE[0].id, 'en'),
  'non-trovata': () => pagina404('it'),
  ...Object.fromEntries(STILI.map((s) => [`link-${s}`, () => renderLinkPage({ headline: 'Andry', template: s, blocchi: BLOCCHI, tema: {} }, { login: 'prova', display: 'Andry', baseUrl: 'http://127.0.0.1' })])),
};
const STATICHE = ['privacy.html', 'termini.html', 'sostieni.html', 'collega.html'];
const TIPI = { '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webp': 'image/webp', '.json': 'application/json', '.html': 'text/html; charset=utf-8' };
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const q = decodeURIComponent(u.pathname);
  if (q.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{}'); }
  if (q === '/' && PAGINE[u.searchParams.get('pagina')]) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(PAGINE[u.searchParams.get('pagina')]()); }
  const f = path.join(PUB, q);
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TIPI[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const PORTA = srv.address().port;
const indirizzi = [...Object.keys(PAGINE).map((k) => [k, `/?pagina=${k}`]), ...STATICHE.map((f) => [f.replace('.html', ''), `/${f}`])];
let viste = 0;
for (const [nomePagina, via] of indirizzi) {
  for (const largo of LARGHI) {
    const p = await nuova(largo);
    await p.goto(`http://127.0.0.1:${PORTA}${via}`, { waitUntil: 'load' });
    await p.waitForTimeout(700);
    const m = await misura(p);
    // le entrate che aspettano di essere viste: si scorre tutta la pagina,
    // cosi' ogni pezzo e' al suo posto quando lo si misura
    await p.evaluate(async () => { const passo = innerHeight * 0.8; for (let y = 0; y < document.documentElement.scrollHeight; y += passo) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
    await p.waitForTimeout(500);
    const tagliati = await p.evaluate(new Function('return ' + TAGLIATI));
    const righe = [];
    if (m.visto > m.largo || m.scorre > 1) {
      righe.push(m.visto > m.largo ? `il viewport si allarga a ${m.visto}px su ${m.largo}: la pagina si trascina di lato` : `la pagina scorre di ${m.scorre}px`);
      for (const c of await chiAllarga(p)) righe.push(`chi allarga: ${c.chi} da ${c.da} a ${c.a}px`);
    }
    for (const t of tagliati) righe.push(`tagliato ${t.cosa} in ${t.chi} (da ${t.da} a ${t.a}px)`);
    if (righe.length) rotte.push({ dove: `${nomePagina} a ${largo}px`, righe });
    viste++;
    await p.close();
  }
}
srv.close();
await b.close();

for (const r of rotte) {
  console.log(`  ✗ ${r.dove}`);
  for (const x of r.righe) console.log(`      ${x}`);
}
console.log(`\n${schede.length} schede del pannello a ${PANNELLO}px, ${viste} aperture di ${indirizzi.length} pagine pubbliche a ${LARGHI.join(', ')}px.`);
console.log(rotte.length
  ? `${rotte.length} ${rotte.length === 1 ? 'pagina si rompe' : 'pagine si rompono'} su un telefono: si trascinano di lato o tagliano quello che c'e' da leggere.`
  : 'Nessuna pagina si trascina di lato, e niente si taglia al bordo. ✓');
process.exit(rotte.length ? 1 : 0);
