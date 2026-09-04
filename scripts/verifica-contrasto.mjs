// Cancello del CONTRASTO VERO, misurato sui pixel.
//
// Il cancello della tavolozza confronta i token a due a due: --testo su --bg e
// via. Non vede quello che succede DAVVERO a schermo — un fondo a sfumatura, un
// velo sopra, un lampo che attraversa il bottone al passaggio del mouse. Un
// bottone con la scritta illeggibile passava indenne, perche' i due token che lo
// compongono, presi da soli, erano in regola.
//
// Qui si rende la pagina in un browser vero, si ritagliano i comandi e si misura
// il contrasto fra il colore della SCRITTA e quello dei pixel che le stanno
// dietro — anche mentre il mouse ci passa sopra, che e' il momento in cui il
// difetto si era visto.
//
// Uso: node scripts/verifica-contrasto.mjs   (esce 1 se qualcosa non si legge)

import { apriSito } from './_sito.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAD, 'src/web/public');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2' };

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();

// WCAG: luminanza relativa e rapporto di contrasto.
const lum = ([r, g, b]) => {
  const c = [r, g, b].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const rapporto = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };

// Legge un colore CSS. Un colore trasparente non e' «nero»: non e' un colore
// affatto, ed e' il caso di una scritta dipinta con una sfumatura ritagliata
// sulle lettere (background-clip: text), dove il riempimento dichiarato e'
// trasparente perche' il colore lo mette lo sfondo. Leggerlo come nero faceva
// scambiare per «lettering» ogni fondo scuro della pagina.
const tinta = (s) => {
  const v = (String(s).match(/[\d.]+/g) || []).map(Number);
  if (v.length < 3) return null;
  if (v.length >= 4 && v[3] < 0.5) return null;
  return v.slice(0, 3);
};

// I comandi che DEVONO leggersi, e la soglia: 4.5 per il testo normale, 3 per
// quello grande (WCAG AA). Il fondo si misura sui pixel, la scritta dal colore
// dichiarato: e' la scritta a dover vincere sul suo fondo, comunque sia fatto.
const PROVE = [
  ['.vt-btn-primo', 4.5], ['.vt-btn:not(.vt-btn-primo)', 4.5],
  ['.vt-occhiello', 4.5], ['.vt-sub', 4.5], ['.vt-sotto', 4.5],
  ['.vt-titolo', 3], ['.vt-titolo em', 3],
];

const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

const guai = [];
let misurati = 0;
for (const tema of ['light', 'dark']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 940 }, colorScheme: tema });
  await p.goto(`http://127.0.0.1:${PORTA}/?lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); document.getElementById('splash')?.remove(); });
  await p.waitForTimeout(400);

  for (const [sel, soglia] of PROVE) {
    const el = await p.$(sel);
    if (!el) { guai.push(`${tema} ${sel}: non c'e'`); continue; }
    for (const sopra of [false, true]) {
      if (sopra) { await el.hover(); await p.waitForTimeout(450); }
      // Una scritta CONTORNATA (come il marchio: riempimento colorato dentro un
      // contorno d'inchiostro) si legge grazie al CONTORNO, non al riempimento.
      // Misurare il riempimento contro il suo stesso contorno risponde a una
      // domanda che non interessa a nessuno — e si vedeva: scurendo il
      // riempimento il valore PEGGIORAVA, che e' il contrario di come funziona
      // la leggibilita'. Quindi quando c'e' un contorno, la scritta e' quello.
      const testo = await el.evaluate((n) => {
        const cs = getComputedStyle(n);
        const sp = parseFloat(cs.webkitTextStrokeWidth) || 0;
        if (sp >= 0.5 && cs.webkitTextStrokeColor && !/transparent|rgba\(0, 0, 0, 0\)/.test(cs.webkitTextStrokeColor)) {
          return cs.webkitTextStrokeColor;
        }
        const f = cs.webkitTextFillColor || cs.color;
        return /transparent|rgba\(0, 0, 0, 0\)/.test(f) ? cs.color : f;
      });
      const rgb = tinta(testo);
      if (!rgb) { guai.push(`${tema} ${sel}: scritta senza colore`); continue; }
      // I colori che APPARTENGONO al lettering non sono il suo fondo: il proprio
      // riempimento, e quello delle lettere che gli stanno attorno (un <em>
      // dentro un titolo contornato ha accanto le lettere del titolo, che sono
      // un'altra parte della stessa scritta, non lo sfondo su cui deve staccare).
      const riempiStr = await el.evaluate((n) => {
        const fuori = [];
        for (let e = n; e && e !== document.body; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if ((parseFloat(cs.webkitTextStrokeWidth) || 0) >= 0.5) fuori.push(cs.webkitTextFillColor || cs.color);
        }
        return fuori;
      });
      const riempi = riempiStr.map(tinta).filter(Boolean);
      const contornata = await el.evaluate((n) => (parseFloat(getComputedStyle(n).webkitTextStrokeWidth) || 0) >= 0.5);
      // Si guarda DENTRO: fuori c'e' il bordo, che su un fondo a sfumatura e'
      // l'unico colore piatto e vincerebbe come «piu' frequente» pur non stando
      // dietro a nessuna lettera. E la scatola si rimisura ADESSO, perche' col
      // mouse sopra l'elemento si sposta.
      const box = await el.boundingBox();
      if (!box || box.width < 16 || box.height < 12) { guai.push(`${tema} ${sel}: troppo piccolo`); continue; }
      // Di norma si guarda DENTRO la scatola. Ma una scritta CONTORNATA riempie
      // quasi tutta la sua scatola di lettere: dentro non resta abbastanza fondo
      // da misurare, e il ritaglio interno restituisce «nessun fondo dominante».
      // Per quelle si guarda un po' PIU' LARGO della scatola, perche' e' proprio
      // contro quel che le sta attorno che il contorno deve staccare.
      let clip;
      if (contornata) {
        const m = Math.max(6, Math.round(Math.min(box.width, box.height) * 0.3));
        clip = { x: Math.max(0, box.x - m), y: Math.max(0, box.y - m),
          width: box.width + m * 2, height: box.height + m * 2 };
      } else {
        const orlo = Math.min(7, Math.floor(Math.min(box.width, box.height) / 4));
        clip = { x: box.x + orlo, y: box.y + orlo,
          width: Math.max(4, box.width - orlo * 2), height: Math.max(4, box.height - orlo * 2) };
      }
      const png = await p.screenshot({ clip });
      const pixel = await p.evaluate(async (dati) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + dati;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        return Array.from(c.getContext('2d').getImageData(0, 0, img.width, img.height).data);
      }, png.toString('base64'));
      const conta = new Map();
      let totale = 0;
      for (let k = 0; k < pixel.length; k += 4) {
        if (pixel[k + 3] < 200) continue;
        const key = `${pixel[k] >> 4},${pixel[k + 1] >> 4},${pixel[k + 2] >> 4}`;
        conta.set(key, (conta.get(key) || 0) + 1);
        totale++;
      }
      if (!totale) { guai.push(`${tema} ${sel}: ritaglio vuoto`); continue; }
      // Il fondo peggiore: fra i colori che coprono almeno il 4% dell'area
      // interna, quello che si avvicina di piu' alla scritta, escluso il colore
      // della scritta stessa.
      let peggio = null;
      for (const [key, n] of conta) {
        if (n / totale < 0.04) continue;
        const col = key.split(',').map((v) => Number(v) * 16 + 8);
        const r = rapporto(rgb, col);
        // Quel che ha il colore della scritta E' la scritta: per definizione non
        // e' il suo fondo, e contarlo faceva fallire ogni bottone scritto scuro.
        if (r < 1.6) continue;
        // e nemmeno i riempimenti del lettering sono il suo fondo
        if (riempi.some((f) => rapporto(f, col) < 1.6)) continue;
        if (peggio == null || r < peggio.r) peggio = { r, col, quota: n / totale };
      }
      // Se non resta NESSUN candidato, non e' la misura ad essere andata a
      // vuoto: vuol dire che tutto quel che circonda la scritta ha il colore
      // della scritta. Cioe' la scritta non stacca da niente — che e' il
      // difetto stesso, e va detto con parole sue.
      if (!peggio) { guai.push(`${tema} ${sel}: non stacca da nulla, attorno e' tutto del suo colore`); continue; }
      misurati++;
      if (process.env.DEBUG) console.log('  dbg', tema, sel, sopra ? 'hover' : 'fermo', 'testo', testo, 'fondo', peggio.col.join(','), `(${Math.round(peggio.quota * 100)}%)`, '->', peggio.r);
      if (peggio.r < soglia) guai.push(`${tema} ${sel}${sopra ? ' (col mouse sopra)' : ''}: ${peggio.r}, serve ${soglia}`);
    }
  }
  await p.close();
}
await b.close();
chiudiSito();

const dice = (ok, testo, extra = '') => { console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`); return ok; };
console.log('\nQuel che c\'e\' scritto si legge davvero.\n');
const verde = dice(guai.length === 0, `contrasti misurati sui pixel: ${misurati} (chiaro e scuro, fermo e col mouse sopra)`, guai.join(' · '));
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
