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

import { execFileSync } from 'node:child_process';
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

// L'AUTOPROVA SULLE COPIE. Il resto del cancello si prova da se' (basta servire
// una vetrina ingrassata), ma la parte sulle copie tocca un file: si rompe
// `anime-vetrina.css` in tre modi, si rilancia il cancello e si pretende il
// rosso. Se una rottura passa inosservata, il cancello non protegge quel che
// dice di proteggere.
const ROTTURE_COPIE = [
  ['p, li { line-height: 1.72; }', '', 'una regola che sparisce dalla copia'],
  ['line-height: 1.72', 'line-height: 1.9', 'una regola che nella copia dice un\'altra cosa'],
  ['@keyframes respiro', '@keyframes respiro-che-non-esiste', 'i fotogrammi di un\'animazione che non ci sono piu\''],
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  const via = path.join(RAD, 'src/web/public/anime-vetrina.css');
  let cieche = 0;
  for (const [da, a, che] of ROTTURE_COPIE) {
    const orig = fs.readFileSync(via, 'utf8');
    if (!orig.includes(da)) { console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`); cieche++; continue; }
    fs.writeFileSync(via, orig.replace(da, a));
    let rosso = false, uscita = '';
    try { uscita = execFileSync(process.execPath, [io], { cwd: RAD, encoding: 'utf8', stdio: 'pipe' }); }
    catch (e) { rosso = true; uscita = String(e.stdout || ''); }
    fs.writeFileSync(via, orig);
    if (/saltato: manca Chromium/.test(uscita)) { console.log('  ✗  senza Chromium l\'autoprova non prova niente'); process.exit(1); }
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: le copie possono scollarsi senza che nessuno lo dica.` : "\nOgni rottura e' vista: le copie non possono scollarsi di nascosto. ✓");
  if (cieche) process.exit(1);
}

const SELFTEST = process.argv.includes('--selftest');

// Il tetto: quel che la home puo' pesare in HTML, CSS e JS messi insieme, una
// volta compressi. Non e' un numero tondo scelto a caso — e' la misura di oggi
// con un po' d'aria sopra. Se un domani si sfora, la domanda giusta non e'
// «alzo il tetto?»: e' «cosa e' rientrato dalla finestra?».
//
// Il 24 settembre 2026 e' entrato, apposta, il disegno: la vetrina disegna le
// sue carte a matita e china come il pannello (docs/DISEGNO.md). Sono 3,8 kB
// di disegno.js e 0,4 kB di regole in anime-vetrina.css; la home e' passata
// da 73,3 a 77,3 kB. Una versione ridotta solo per la vetrina ci sarebbe stata
// sotto, ma sarebbe stata una seconda copia del disegno da tenere uguale alla
// prima. Il tetto va da 75 a 80: la misura di oggi, con la stessa aria sopra.
const TETTO_KB = 80;

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
const CON_ANIME = VETRINA.replace(
  '<link rel="stylesheet" href="anime-vetrina.css">',
  '<link rel="stylesheet" href="anime.css">\n  <link rel="stylesheet" href="anime-vetrina.css">');
const GRASSA = VETRINA.replace('<script src="vetrina-app.js" defer></script>',
  '<script src="app.js" defer></script>\n  <script src="vetrina-app.js" defer></script>');

const srv = http.createServer((req, res) => {
  const via = new URL(req.url, 'http://x');
  const q = decodeURIComponent(via.pathname);
  if (q.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{}'); }
  if (q === '/' || q === '/index.html') {
    const demo = via.searchParams.get('demo') === '1';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    if (via.searchParams.get('conanime') === '1') return res.end(CON_ANIME);
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


let misuraCopie = { quante: 0, scollate: 0 };
// LA COPIA E' UNA COPIA, PAROLA PER PAROLA. Il confronto a schermo dice se
// manca qualcosa; non dice se una regola copiata e' stata cambiata, perche' una
// regola che la vetrina sovrascrive comunque puo' scollarsi senza spostare un
// pixel. Oggi non si vede, domani — tolta quella che la sovrascriveva — si
// vedrebbe, e nessuno saprebbe perche'. Quindi ogni regola di
// `anime-vetrina.css` deve esistere IDENTICA in `anime.css`.
function regoleDi(css) {
  const pulito = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const norm = (x) => String(x).replace(/\s+/g, ' ').replace(/\s*([{};:,])\s*/g, '$1').trim();
  const fineBlocco = (t, da) => { let liv = 0; for (let k = da; k < t.length; k++) { if (t[k] === '{') liv++; else if (t[k] === '}') { liv--; if (!liv) return k; } } return -1; };
  // Le condizioni di un @media si spezzano e si mettono in ordine: due media
  // annidati e un media solo con la «and» dicono la stessa cosa, e devono dare
  // la stessa chiave. Se no si confronta come e' scritto invece di cosa dice.
  const condizioni = (testa) => norm(testa).replace(/^@(media|supports)/i, '').split(/\band\b/).map((x) => x.trim()).filter(Boolean);
  const fuori = new Set();
  (function gira(testo, dentro) {
    let i = 0;
    while (i < testo.length) {
      const g = testo.indexOf('{', i);
      if (g < 0) break;
      const testa = testo.slice(i, g).trim();
      const fine = fineBlocco(testo, g);
      if (fine < 0) break;
      if (/^@(media|supports)/i.test(testa)) gira(testo.slice(g + 1, fine), dentro.concat(condizioni(testa)));
      else if (testa) fuori.add([...dentro].sort().join(' and ') + '|' + norm(testo.slice(i, fine + 1)));
      i = fine + 1;
    }
  })(pulito, []);
  return fuori;
}
{
  const madre = regoleDi(fs.readFileSync(path.join(PUB, 'anime.css'), 'utf8'));
  const figlia = regoleDi(fs.readFileSync(path.join(PUB, 'anime-vetrina.css'), 'utf8'));
  const scollate = [...figlia].filter((r) => !madre.has(r));
  if (scollate.length) {
    guai.push(`${scollate.length} regole della copia non esistono piu' uguali in anime.css — la prima: ${scollate[0].slice(0, 120)}`);
  }
  misuraCopie = { quante: figlia.size, scollate: scollate.length };
}

// LE COPIE NON DEVONO SCOLLARSI. `anime-vetrina.css` sono le quarantaquattro
// regole di `anime.css` che la vetrina usa davvero, riscritte nel suo file (piu'
// i fotogrammi delle animazioni che chiamano). Due copie non sorvegliate vanno
// alla deriva in silenzio: qui si rimette `anime.css` sulla vetrina,
// esattamente dove stava prima, e si pretende che NON CAMBI NIENTE.
//
// Si guarda in due modi, e servono tutti e due.
//
//  1. LA PAGINA FERMA. Le animazioni si spengono da tutte e due le parti e si
//     confronta lo stile calcolato di ogni elemento, coi suoi due strati
//     disegnati (::before e ::after) — e' li' che si nascondono le cornici e i
//     riempimenti. Spegnerle non e' una scorciatoia: e' l'unico modo di avere
//     due misure confrontabili, perche' un'animazione fotografata due volte da'
//     due valori diversi anche quando la regola e' identica, e quelle legate
//     allo scorrimento non si fermano nemmeno su un istante preciso.
//  2. QUALI ANIMAZIONI CI SONO. Spente le animazioni, un @keyframes dimenticato
//     nella copia non si vedrebbe piu': la regola `animation: respiro ...` resta
//     scritta uguale, ma senza i suoi fotogrammi non anima niente. Quindi si
//     confronta anche l'ELENCO delle animazioni vive — su quale elemento e con
//     che nome — che e' un dato e non un istante.
//
// Le variabili (--qualcosa) restano fuori: `anime.css` ne dichiara a decine che
// la vetrina non usa, e contarle vorrebbe dire misurare quali variabili
// esistono invece di come si vede la pagina. Una variabile che serve davvero si
// fa sentire nella proprieta' che decide, e quella si confronta.
const CHI = `(el) => el.tagName.toLowerCase()
  + (el.id ? '#' + el.id : '')
  + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '')`;

const FIRMA = `() => {
  const chi = ${CHI};
  const stile = document.createElement('style');
  stile.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
  document.head.appendChild(stile);
  const uno = (el, pseudo) => {
    const cs = getComputedStyle(el, pseudo || null);
    const righe = [];
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      if (p.startsWith('--')) continue;
      righe.push(p + ':' + cs.getPropertyValue(p));
    }
    return righe.sort().join(';');
  };
  return [...document.querySelectorAll('body *')].map((el) => ({ chi: chi(el), p: [uno(el, null), uno(el, '::before'), uno(el, '::after')] }));
}`;

const ANIMAZIONI = `() => {
  const chi = ${CHI};
  const fuori = [];
  for (const a of document.getAnimations()) {
    const t = a.effect && a.effect.target;
    if (!t || !a.animationName) continue;
    fuori.push(chi(t) + (a.effect.pseudoElement || '') + ' :: ' + a.animationName);
  }
  return fuori.sort();
}`;

// Gli stati che la vetrina sa produrre. A riposo non si vedono: la carta
// d'avviso, il toast, le domande aperte e i pacchetti scelti esistono solo
// quando succede qualcosa, e sono proprio quelli che una copia incompleta
// dimentica.
const ACCENDI = `() => {
  document.querySelectorAll('details').forEach((d) => { d.open = true; });
  document.querySelectorAll('.vt-comp input[type=checkbox]').forEach((c) => { c.checked = true; });
  document.querySelectorAll('[data-pacco]').forEach((b) => b.classList.add('on'));
  const cb = document.getElementById('cookie-banner'); if (cb) cb.hidden = false;
  const t = document.createElement('div'); t.className = 'toast errore'; t.textContent = 'x';
  document.getElementById('toast-box')?.appendChild(t);
  const av = document.createElement('div'); av.className = 'carta avviso blocco pannello';
  av.innerHTML = '<p>x</p><a href="#">y</a><button class="btn">z</button><button class="btn secondario">w</button><button class="btn testo">v</button>';
  document.getElementById('app')?.prepend(av);
}`;

async function guarda(indirizzo, { largo, acceso }) {
  const p = await b.newPage({ viewport: { width: largo, height: 900 } });
  await p.goto(`http://127.0.0.1:${PORTA}${indirizzo}`, { waitUntil: 'networkidle' });
  if (acceso) await p.evaluate(`(${ACCENDI})()`);
  await p.waitForTimeout(500);
  const anim = await p.evaluate(`(${ANIMAZIONI})()`);
  const stile = await p.evaluate(`(${FIRMA})()`);
  await p.close();
  return { anim, stile };
}

const copie = [];
for (const caso of [
  { nome: 'a riposo', largo: 1280, acceso: false },
  { nome: 'con tutto acceso (avviso, toast, domande aperte, pacchetti)', largo: 1280, acceso: true },
  { nome: 'sul telefono', largo: 390, acceso: false },
]) {
  const senza = await guarda('/', caso);
  const con = await guarda('/?conanime=1', caso);
  let diverse = 0;
  let primo = '';
  if (senza.stile.length !== con.stile.length) {
    guai.push(`${caso.nome}: la pagina ha un numero diverso di elementi (${senza.stile.length} contro ${con.stile.length})`);
  } else {
    for (let i = 0; i < senza.stile.length; i++) {
      for (let k = 0; k < 3; k++) {
        if (senza.stile[i].p[k] === con.stile[i].p[k]) continue;
        diverse++;
        if (!primo) {
          const a = senza.stile[i].p[k].split(';'), c = con.stile[i].p[k].split(';');
          primo = `${senza.stile[i].chi}${['', ' ::before', ' ::after'][k]} → ${(a.find((x, j) => x !== c[j]) || '').slice(0, 70)} invece di ${(c.find((x, j) => x !== a[j]) || '').slice(0, 70)}`;
        }
      }
    }
    if (diverse) guai.push(`${caso.nome}: ${diverse} differenze rimettendo anime.css — la prima: ${primo}`);
  }
  const mancanti = con.anim.filter((x) => !senza.anim.includes(x));
  const doppie = senza.anim.filter((x) => !con.anim.includes(x));
  if (mancanti.length) guai.push(`${caso.nome}: ${mancanti.length} animazioni che la copia non fa partire — la prima: ${mancanti[0]}`);
  if (doppie.length) guai.push(`${caso.nome}: ${doppie.length} animazioni che la copia fa partire in piu' — la prima: ${doppie[0]}`);
  copie.push({ nome: caso.nome, diverse: diverse + mancanti.length + doppie.length, animazioni: senza.anim.length });
}

await b.close();
srv.close();

const dice = (ok, testo, extra = '') => { console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`); return ok; };
console.log('\nLa vetrina non paga il conto del pannello.\n');
const perTipo = (l, t) => (pesoDi(l, [t]) / 1024).toFixed(1);
console.log(`  · home:  ${perTipo(casa.chiesti, '.html')} kB di pagina, ${perTipo(casa.chiesti, '.css')} kB di stile, ${perTipo(casa.chiesti, '.js')} kB di script — ${(peso / 1024).toFixed(1)} kB in tutto (gzip)`);
console.log(`  · script: ${casa.chiesti.filter((r) => r.tipo === '.js').map((r) => r.via).join(', ') || 'nessuno'}`);
console.log(`  · copie: ${misuraCopie.quante} regole prese da anime.css, tutte uguali all'originale`);
for (const c of copie) console.log(`  · copie: rimettendo anime.css ${c.nome}, ${c.diverse === 0 ? 'non cambia niente' : c.diverse + ' differenze'}`);
console.log(`  · demo:  ${(pesoDi(demo.chiesti, ['.html', '.js', '.css']) / 1024).toFixed(1)} kB, col pannello intero\n`);
if (SELFTEST) dice(selftest === true, 'il cancello vede il pannello che rientra dalla finestra');
const verde = dice(guai.length === 0, 'la home porta solo la sua roba, e sta sotto il tetto', guai.join(' · '));
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
