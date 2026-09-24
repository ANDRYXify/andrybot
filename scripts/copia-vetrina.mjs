// La copia a dieta di style.css per la vetrina: style-vetrina.css.
//
// La vetrina caricava tutto style.css (150 kB, 28 kB compressi), che e' il
// foglio del pannello, e ne usa una piccola parte. Qui si sceglie la parte che
// usa, e la si copia PAROLA PER PAROLA, nello stesso ordine, dentro gli stessi
// @media: cosi' per la vetrina l'ordine in cui le regole si sovrascrivono non
// cambia. Il pannello non viene toccato di un byte.
//
// La scelta non e' a mano. Una regola si tiene se il suo selettore trova almeno
// un elemento della vetrina, in uno qualunque degli stati che la vetrina sa
// produrre (a riposo, con avviso toast domande e pacchetti accesi), alle due
// larghezze, nei due temi, con la modalita' leggera e senza. Gli stati del
// puntatore (:hover, :focus, :active...) e gli strati (::before, ::after) si
// tolgono prima di cercare: la regola che colora un tasto sotto il mouse si
// tiene se il tasto c'e'. Nel dubbio (un selettore che il browser non sa
// cercare) la regola si tiene: la copia deve essere generosa, e chi la sorveglia
// e' scripts/verifica-dieta.mjs, che rimette style.css sulla vetrina e pretende
// che non cambi niente. I fotogrammi (@keyframes) si tengono se li nomina una
// regola tenuta O un altro foglio della vetrina: un'animazione dichiarata in
// vetrina.css puo' usare fotogrammi scritti in style.css.
//
// Uso: node scripts/copia-vetrina.mjs        (riscrive src/web/public/style-vetrina.css)
//      node scripts/copia-vetrina.mjs --prova (dice se il file e' allineato, non scrive)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

process.env.DATA_DIR = process.env.DATA_DIR || fs.mkdtempSync(path.join(tmpdir(), 'copia-vetrina-'));
const { guscioVetrina } = await import('../src/web/vetrina-vista.js');
const { pianiPubblici } = await import('../src/features/abbonamenti.js');

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAD, 'src/web/public');
const MADRE = path.join(PUB, 'style.css');
const FIGLIA = path.join(PUB, 'style-vetrina.css');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const PROVA = process.argv.includes('--prova');

const TESTATA = [
  '/* © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live */',
  '/* Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live */',
];

// Il foglio diviso nelle sue regole, in ordine, ognuna col testo com'e' scritto
// e con la catena dei blocchi che la contengono (@media, @supports, @container).
function regoleDelFoglio(css) {
  const pulito = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const fineBlocco = (t, da) => {
    let liv = 0;
    for (let k = da; k < t.length; k++) {
      if (t[k] === '{') liv++;
      else if (t[k] === '}') { liv--; if (!liv) return k; }
    }
    return -1;
  };
  const fuori = [];
  (function gira(testo, catena) {
    let i = 0;
    while (i < testo.length) {
      const g = testo.indexOf('{', i);
      if (g < 0) break;
      const testa = testo.slice(i, g).trim();
      const fine = fineBlocco(testo, g);
      if (fine < 0) break;
      if (/^@(media|supports|container|layer)\b/i.test(testa)) gira(testo.slice(g + 1, fine), catena.concat([testa]));
      else if (testa) {
        const kf = /^@(-webkit-)?keyframes\s+([\w-]+)/i.exec(testa);
        fuori.push({ testo: testo.slice(i, fine + 1).trim(), catena, keyframes: kf ? kf[2] : null, selettore: testa.startsWith('@') ? null : testa });
      }
      i = fine + 1;
    }
  })(pulito, []);
  return fuori;
}

// Il selettore senza gli stati del puntatore e senza gli strati: quello che
// resta dice SU CHI la regola lavora.
function nudoSelettore(s) {
  const parti = [];
  let liv = 0, da = 0;
  for (let k = 0; k < s.length; k++) {
    if (s[k] === '(') liv++;
    else if (s[k] === ')') liv--;
    else if (s[k] === ',' && !liv) { parti.push(s.slice(da, k)); da = k + 1; }
  }
  parti.push(s.slice(da));
  const STATI = 'hover|focus|focus-visible|focus-within|active|visited|checked|placeholder-shown|target|autofill|-webkit-autofill|user-invalid|invalid|valid|open|popover-open|modal|playing|paused';
  const senzaNot = (t) => {
    let fuori = '';
    for (let k = 0; k < t.length; k++) {
      if (t.startsWith(':not(', k)) {
        let liv = 0, j = k + 4;
        for (; j < t.length; j++) { if (t[j] === '(') liv++; else if (t[j] === ')') { liv--; if (!liv) break; } }
        k = j;
        continue;
      }
      fuori += t[k];
    }
    return fuori;
  };
  return parti.map((p) => senzaNot(p)
    .replace(/::[a-z-]+(\([^()]*\))?/gi, '')
    .replace(/:(before|after|first-line|first-letter)\b/gi, '')
    .replace(new RegExp(`:(${STATI})\\b`, 'gi'), '')
    .trim() || '*');
}

const STATI = [
  { largo: 1280, tema: 'light', acceso: false, leggero: false },
  { largo: 1280, tema: 'light', acceso: true, leggero: false },
  { largo: 390, tema: 'light', acceso: false, leggero: false },
  { largo: 390, tema: 'light', acceso: true, leggero: false },
  { largo: 1280, tema: 'dark', acceso: true, leggero: false },
  { largo: 390, tema: 'dark', acceso: false, leggero: true },
  { largo: 1280, tema: 'light', acceso: false, leggero: true },
];

// Gli stessi stati accesi del cancello della dieta.
const ACCENDI = `() => {
  document.querySelectorAll('details').forEach((d) => { d.open = true; });
  document.querySelectorAll('.vt-comp input[type=checkbox]').forEach((c) => { c.checked = true; });
  document.querySelectorAll('[data-pacco]').forEach((b) => b.classList.add('on'));
  const cb = document.getElementById('cookie-banner'); if (cb) cb.hidden = false;
  const t = document.createElement('div'); t.className = 'toast errore'; t.textContent = 'x';
  document.getElementById('toast-box')?.appendChild(t);
  const t2 = document.createElement('div'); t2.className = 'toast'; t2.textContent = 'x';
  document.getElementById('toast-box')?.appendChild(t2);
  const av = document.createElement('div'); av.className = 'carta avviso blocco pannello';
  av.innerHTML = '<p>x</p><a href="#">y</a><button class="btn">z</button><button class="btn secondario">w</button><button class="btn testo">v</button>';
  document.getElementById('app')?.prepend(av);
  document.querySelectorAll('[hidden]').forEach((e) => { if (e.matches('.vt-velo')) e.hidden = false; });
}`;

async function scegli(regole) {
  const { chromium } = await import(PLAYWRIGHT);
  const guscio = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
  const piani = pianiPubblici();
  const pagine = Object.fromEntries(['it', 'en', 'es'].map((l) => [l, guscioVetrina(guscio, l, { kick: true, youtube: false, piani })]));
  const TIPI = { '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp' };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const q = decodeURIComponent(u.pathname);
    if (q.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{}'); }
    if (q === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(pagine[u.searchParams.get('lang')] || pagine.it); }
    const f = path.join(PUB, q);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TIPI[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const porta = srv.address().port;
  const b = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const selettori = [...new Set(regole.filter((r) => r.selettore).map((r) => r.selettore))];
  const cercati = selettori.map(nudoSelettore);
  const trovati = new Set();
  for (const lingua of ['it', 'en', 'es']) {
    for (const st of STATI) {
      const ctx = await b.newContext({ viewport: { width: st.largo, height: 900 } });
      const p = await ctx.newPage();
      await p.addInitScript((tema) => { try { localStorage.setItem('tema', tema); } catch (e) {} }, st.tema);
      await p.goto(`http://127.0.0.1:${porta}/?lang=${lingua}`, { waitUntil: 'networkidle' });
      if (st.acceso) await p.evaluate(`(${ACCENDI})()`);
      if (st.leggero) await p.evaluate(() => { document.body.classList.add('leggero', 'meno-moto'); });
      await p.waitForTimeout(300);
      const esiti = await p.evaluate((liste) => liste.map((lista) => lista.some((s) => {
        try { return !!document.querySelector(s); } catch (e) { return true; }
      })), cercati);
      esiti.forEach((si, i) => { if (si) trovati.add(selettori[i]); });
      await ctx.close();
    }
  }
  await b.close();
  srv.close();
  return trovati;
}

function scrivi(regole, trovati) {
  const tenute = regole.filter((r) => r.selettore && trovati.has(r.selettore));
  const altri = ['font.css', 'tema.css', 'anime-vetrina.css', 'vetrina.css'].map((f) => fs.readFileSync(path.join(PUB, f), 'utf8'));
  const testoTenuto = tenute.map((r) => r.testo).concat(altri).join('\n');
  const nomi = new Set(regole.filter((r) => r.keyframes).map((r) => r.keyframes)
    .filter((n) => new RegExp(`(animation(-name)?\\s*:[^;}]*)\\b${n}\\b`).test(testoTenuto)));
  const scelte = regole.filter((r) => (r.selettore && trovati.has(r.selettore)) || (r.keyframes && nomi.has(r.keyframes)));
  const righe = [...TESTATA, ''];
  let aperta = [];
  const chiudi = (fino) => { while (aperta.length > fino) { aperta.pop(); righe.push('  '.repeat(aperta.length) + '}'); } };
  for (const r of scelte) {
    let comune = 0;
    while (comune < aperta.length && comune < r.catena.length && aperta[comune] === r.catena[comune]) comune++;
    chiudi(comune);
    for (let k = comune; k < r.catena.length; k++) { righe.push('  '.repeat(k) + r.catena[k] + ' {'); aperta.push(r.catena[k]); }
    righe.push('  '.repeat(r.catena.length) + r.testo);
  }
  chiudi(0);
  return { testo: righe.join('\n') + '\n', quante: scelte.length, di: regole.length };
}

const regole = regoleDelFoglio(fs.readFileSync(MADRE, 'utf8'));
const trovati = await scegli(regole);
const { testo, quante, di } = scrivi(regole, trovati);
const prima = fs.existsSync(FIGLIA) ? fs.readFileSync(FIGLIA, 'utf8') : '';
if (PROVA) {
  if (prima !== testo) { console.log(`style-vetrina.css non e' allineata a style.css: rilancia node scripts/copia-vetrina.mjs (${quante} regole su ${di}).`); process.exit(1); }
  console.log(`style-vetrina.css allineata: ${quante} regole su ${di}. ✓`);
} else {
  fs.writeFileSync(FIGLIA, testo);
  console.log(`style-vetrina.css: ${quante} regole su ${di} di style.css.`);
}
