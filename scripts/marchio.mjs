// Genera tutte le misure del marchio dai due disegni originali.
//
// I file serviti al browser (icone dell'app, favicon, bollo della barra) NON si
// disegnano a mano: si ricavano da `assets/marchio/`. Cosi' quando il disegno
// cambia si sostituisce il PNG li' dentro, si rilancia questo script, e nessuna
// misura resta indietro con la versione vecchia — che e' esattamente il modo in
// cui i loghi si sfaldano.
//
//   node scripts/marchio.mjs
//
// Serve Playwright e un Chromium: il ritaglio e la composizione si fanno con
// una canvas, che e' l'unico strumento grafico che questa macchina ha.
//
// LO SFONDO. Il disegno ha i contorni NERI: su fondo scuro spariscono e il
// segno diventa una macchia. Quindi il fondo e' chiaro, ed e' la carta calda del
// prodotto (#faf7f1) — la stessa superficie delle sue schede, cosi' l'icona
// sembra parte dell'app e non un adesivo appiccicato sopra.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const QUI = dirname(fileURLToPath(import.meta.url));
const RAD = join(QUI, '..');
const SORG = join(RAD, 'assets', 'marchio');
const FUORI = join(RAD, 'src', 'web', 'public', 'icons');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';

const CARTA = '#faf7f1';

// Cosa si produce, e perche' ognuno e' diverso dagli altri:
//
//  · `any`      l'icona normale: il segno sta largo, perche' a 32px in una
//               scheda del browser deve leggersi.
//  · `maskable` quella che il sistema operativo RITAGLIA a piacere (cerchio,
//               goccia, quadrato stondato): il segno sta dentro il 66%, cosi'
//               nessun taglio lo tocca. Sono due file diversi perche' sono due
//               esigenze opposte: dichiarare "any maskable" sullo stesso file
//               vuol dire sbagliarne per forza una delle due.
//  · trasparenti  gli assetti riusabili, per quando il fondo ce lo mette la
//               pagina (l'anteprima social, per esempio).
const LAVORI = [
  { da: 'sbot.png', a: 'icon-192.png', lato: 192, fondo: CARTA, quota: 0.86 },
  { da: 'sbot.png', a: 'icon-512.png', lato: 512, fondo: CARTA, quota: 0.86 },
  { da: 'sbot.png', a: 'icon-maskable-512.png', lato: 512, fondo: CARTA, quota: 0.66 },
  // Nelle PAGINE il marchio va trasparente: il fondo ce lo mette la pagina.
  // Non e' una scelta di gusto, e' una misura — su fondo scuro i contorni neri
  // spariscono ma i pieni magenta portano la forma da soli, mentre una targa di
  // carta dietro le lettere, in tema scuro, diventa un mattone bianco.
  { da: 'sbot.png', a: 'marchio-barra.png', larghezza: 141, fondo: null, quota: 1 },
  { da: 'sbot.png', a: 'marchio.png', lato: 512, fondo: null, quota: 1 },
  { da: 'socialbot.png', a: 'logo-barra.png', larghezza: 252, fondo: null, quota: 1 },
  { da: 'socialbot.png', a: 'logo-esteso.png', larghezza: 1200, fondo: null, quota: 1 },
];

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\': impossibile generare il marchio.'); process.exit(1); }

const b64 = (f) => readFileSync(join(SORG, f)).toString('base64');
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage();
await p.goto('about:blank');

for (const l of LAVORI) {
  const png = await p.evaluate(async ({ dati, lato, larghezza, fondo, quota }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + dati;
    await img.decode();

    // RITAGLIO: si cerca il rettangolo dei pixel che non sono trasparenti.
    // Senza, il margine vuoto del disegno diventerebbe margine dell'icona e il
    // segno risulterebbe piccolo e fuori centro.
    const m = document.createElement('canvas');
    m.width = img.width; m.height = img.height;
    const mc = m.getContext('2d');
    mc.drawImage(img, 0, 0);
    const d = mc.getImageData(0, 0, m.width, m.height).data;
    let x0 = m.width, y0 = m.height, x1 = -1, y1 = -1;
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        if (d[(y * m.width + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    const lw = x1 - x0 + 1, lh = y1 - y0 + 1;

    const W = lato || larghezza;
    const H = lato || Math.round(larghezza * lh / lw);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const cx = c.getContext('2d');
    if (fondo) { cx.fillStyle = fondo; cx.fillRect(0, 0, W, H); }
    cx.imageSmoothingQuality = 'high';
    const scala = Math.min((W * quota) / lw, (H * quota) / lh);
    const dw = lw * scala, dh = lh * scala;
    cx.drawImage(img, x0, y0, lw, lh, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return { dati: c.toDataURL('image/png').split(',')[1], W, H, ritaglio: `${lw}x${lh}` };
  }, { dati: b64(l.da), lato: l.lato, larghezza: l.larghezza, fondo: l.fondo, quota: l.quota });

  writeFileSync(join(FUORI, l.a), Buffer.from(png.dati, 'base64'));
  console.log(`  ${l.a.padEnd(24)} ${String(png.W + 'x' + png.H).padEnd(11)} da ${l.da} (ritagliato ${png.ritaglio})`);
}
await b.close();
console.log('\nMarchio rigenerato dai disegni originali. ✓');
