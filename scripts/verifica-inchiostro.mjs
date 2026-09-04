// Cancello del TRATTO: ogni cosa che è un oggetto ha il suo contorno.
//
// Il tema è disegnato a mano: contorno d'inchiostro, angoli tirati, ombra a
// timbro. Ma «disegnato» non si giudica a campione — una dashboard ha centinaia
// di controlli, e basta che una famiglia resti col bordo da un pixel perché
// tutto il resto sembri una decorazione appiccicata sopra. Quella famiglia non
// la trovi guardando gli screenshot: la trovi contando.
//
// Quindi si conta. Si aprono tutte le schede, si guardano i controlli VISIBILI
// e si chiede a ognuno: hai un contorno d'inchiostro (un bordo spesso e scuro)
// oppure un'ombra a timbro (uno scarto senza sfocatura)? Se no, sei rimasto
// indietro.
//
// E si controlla anche la GERARCHIA, che nel disegno a inchiostro non e' un
// vezzo: contorni esterni spessi, dettagli interni sottili. Se il riquadro e il
// pulsante che ci sta dentro hanno lo stesso tratto, non c'e' profondita' e la
// pagina si appiattisce — e' esattamente il difetto che si vedeva prima. Quindi:
// il tratto di una carta deve essere PIU' GROSSO di quello dei controlli che
// contiene.
//
// Restano fuori di proposito: le caselle di spunta e i cursori, che sono
// controlli del sistema operativo, e i contenitori (etichette, riassunti dei
// blocchi a fisarmonica) che vivono dentro una carta gia' disegnata.
//
// Uso: node scripts/verifica-inchiostro.mjs
//      node scripts/verifica-inchiostro.mjs --selftest   (deve diventare rosso)

import { apriSito } from './_sito.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAD, 'src/web/public');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2' };

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();

const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const rotture = [];
p.on('pageerror', (e) => rotture.push('errore di pagina: ' + e.message));
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); });
await p.waitForTimeout(900);
await p.evaluate(() => document.querySelector('.giro-velo')?.remove());

if (SELFTEST) {
  await p.addStyleTag({ content: '.badge, .badge.verde, .badge.viola, .badge.giallo, .badge.marchio { border: 1px solid #dcd7cf !important; box-shadow: none !important; }' });
}

const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
const conto = {};
const gerarchia = {};
let visti = 0, sezioni = 0;
for (const id of schede) {
  try { await p.evaluate((x) => window.SB_APP.vai(x), id); await p.waitForTimeout(300); } catch { continue; }
  sezioni++;
  const fuori = await p.evaluate(() => {
    const sez = document.querySelector('.pannello-scheda.visibile');
    if (!sez) return { piatti: [], pari: [], visti: 0 };
    const rgb = (c) => { const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(c); return m ? [+m[1], +m[2], +m[3]] : null; };
    const scuro = (c) => { const v = rgb(c); return v && (v[0] + v[1] + v[2]) / 3 < 96; };
    const SEL = 'button, .btn, input[type="text"], input[type="password"], input[type="email"],'
      + ' input[type="url"], input[type="search"], input[type="tel"], input[type="number"],'
      + ' input[type="color"], select, textarea, .carta, .badge, .chip, .pillola, .scheda-tab,'
      + ' .levetta, .goal-riga, .ovl-elem';
    const piatti = [];
    const pari = [];
    let n = 0;
    for (const el of sez.querySelectorAll(SEL)) {
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 14) continue;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none') continue;
      n++;
      const bw = parseFloat(s.borderTopWidth) || 0;
      const conBordo = bw >= 0.9 && scuro(s.borderTopColor);
      const conTimbro = /(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+0px/.test(s.boxShadow || '');
      const firma = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
      if (!conBordo && !conTimbro) { piatti.push(firma); continue; }

      // la gerarchia: dentro una carta, il dettaglio non puo' avere il tratto
      // della carta che lo contiene
      if (!conBordo || el.classList.contains('carta')) continue;
      const carta = el.parentElement && el.parentElement.closest('.carta');
      if (!carta) continue;
      const bc = parseFloat(getComputedStyle(carta).borderTopWidth) || 0;
      if (bc >= 0.9 && bw >= bc) pari.push(`${firma} ${bw}px dentro una carta da ${bc}px`);
    }
    return { piatti, pari, visti: n };
  });
  visti += fuori.visti;
  for (const f of fuori.piatti) { conto[f] = (conto[f] || 0) + 1; }
  for (const f of fuori.pari) { gerarchia[f] = (gerarchia[f] || 0) + 1; }
}
await b.close();
chiudiSito();

const ord = Object.entries(conto).sort((a, b2) => b2[1] - a[1]);
const piatti = ord.reduce((a, x) => a + x[1], 0);
const dice = (ok, testo, extra = '') => { console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`); return ok; };

console.log('\nOgni cosa che è un oggetto ha il suo contorno.\n');
let verde = true;
verde = dice(piatti === 0, `controlli guardati: ${visti} in ${sezioni} schede`,
  ord.slice(0, 8).map(([f, n]) => `${f} ×${n}`).join(' · ')) && verde;
const ordG = Object.entries(gerarchia).sort((a, b2) => b2[1] - a[1]);
verde = dice(ordG.length === 0, 'contorni esterni piu\' grossi dei dettagli interni',
  ordG.slice(0, 5).map(([f, n]) => `${f} ×${n}`).join(' · ')) && verde;
verde = dice(rotture.length === 0, 'nessun errore di pagina', rotture.slice(0, 2).join(' · ')) && verde;

if (SELFTEST) {
  if (!verde) { console.log(`\nAutoprova: togliendo il contorno alle etichette il cancello vede ${piatti} cose piatte. ✓\n`); process.exit(0); }
  console.log('\nAutoprova FALLITA: il cancello non si accorge di una famiglia rimasta piatta.\n');
  process.exit(1);
}
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
