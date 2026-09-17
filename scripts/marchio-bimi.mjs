// Il marchio in VETTORIALE, per BIMI: il logo che i programmi di posta possono
// mostrare accanto al mittente.
//
//   node scripts/marchio-bimi.mjs
//
// BIMI vuole un SVG di un profilo preciso — «SVG Tiny 1.2 Portable/Secure» —
// quadrato, senza script, senza animazioni, senza niente che venga da fuori. Un
// PNG non va bene, e nemmeno un SVG qualunque.
//
// Il disegno originale e' un PNG dipinto a mano: qui si RICALCA, non si
// ridisegna. Ricalcare vuol dire seguire il bordo fra i pixel di un colore e
// tutto il resto, e trasformarlo in una linea: cosi' il segno che esce e' lo
// stesso che c'e' in `assets/marchio/`, e non una sua imitazione fatta a
// occhio che il giorno dopo diverge.
//
// Lo strumento e' la canvas di Chromium, come per `marchio.mjs`: e' l'unica
// cosa in grado di leggere i pixel di un PNG su questa macchina. Il ricalco
// gira dentro la pagina, perche' portare dodici megabyte di pixel fuori sarebbe
// il pezzo piu' lento di tutto il lavoro.
//
// LO SFONDO CHIARO non e' un vezzo: il disegno ha i contorni NERI, e su fondo
// scuro il segno diventa una macchia. E' la stessa ragione per cui le icone
// dell'app stanno sulla carta calda del prodotto. Il segno sta dentro il 66%
// del quadrato perche' chi mostra i loghi BIMI spesso li ritaglia a cerchio.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { tinta } from '../src/web/tavolozza.js';

const QUI = dirname(fileURLToPath(import.meta.url));
const RAD = join(QUI, '..');
const SORG = join(RAD, 'assets', 'marchio', 'sbot.png');
const FUORI = join(RAD, 'src', 'web', 'public', 'bimi');
const FILE = join(FUORI, 'socialbot.svg');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';

const LATO = 512;          // il quadrato del logo
// QUANTO NE OCCUPA IL SEGNO. Chi mostra i loghi BIMI spesso li ritaglia a
// cerchio, e il cerchio piu' grande dentro un quadrato tocca i lati a meta':
// quindi cio' che deve starci dentro non e' la larghezza, e' la DIAGONALE del
// riquadro del segno. Questo segno e' largo e basso (circa 884 per 562), e la
// sua diagonale misura 1,185 volte la larghezza: percio' puo' arrivare a 0,84
// prima di toccare il cerchio. A 0,66 — la quota delle icone dell'app, che sono
// quadrate — restava un francobollo in mezzo al vuoto, illeggibile a 96 pixel.
const QUOTA = 0.80;
const CARTA = tinta('surface');
const TOLLERANZA = 0.45;   // quanto si puo' raddrizzare una linea, in unita' del quadrato
const MINIMA = 0.02;       // le macchie piu' piccole di cosi' (in % del quadrato) si buttano

const { chromium } = await import(PLAYWRIGHT);
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

try {
  const pagina = await browser.newPage();
  const dati = readFileSync(SORG).toString('base64');

  const esito = await pagina.evaluate(async ({ dati, LATO, QUOTA, TOLLERANZA, MINIMA }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + dati;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const W = c.width, H = c.height;
    const px = ctx.getImageData(0, 0, W, H).data;

    // ---- 1. dove sta davvero il segno -------------------------------------
    // Il PNG ha molta aria intorno: il riquadro vero e' quello dei pixel che si
    // vedono. Senza questo passo il segno uscirebbe minuscolo in mezzo al vuoto.
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (px[(y * W + x) * 4 + 3] < 128) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return { errore: 'il disegno e\' tutto trasparente' };
    const lw = x1 - x0 + 1, lh = y1 - y0 + 1;

    // ---- 2. quali colori ci sono -------------------------------------------
    // Il disegno e' a tinte piatte con i bordi sfumati. Si contano i colori
    // pieni, si tengono i piu' presenti, e ogni pixel va al piu' vicino: le
    // sfumature del bordo si appoggiano al colore da cui vengono.
    const conto = new Map();
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 250) continue;
      const k = (px[i] >> 3 << 10) | (px[i + 1] >> 3 << 5) | (px[i + 2] >> 3);
      conto.set(k, (conto.get(k) || 0) + 1);
    }
    const grossi = [...conto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)
      .map(([k, n]) => ({ r: ((k >> 10) & 31) * 8 + 4, g: ((k >> 5) & 31) * 8 + 4, b: (k & 31) * 8 + 4, n }));
    const tavolozza = [];
    for (const t of grossi) {
      if (t.n < lw * lh * 0.004) continue;
      // due colori vicini sono lo stesso colore: la sfumatura non e' una tinta
      if (tavolozza.some((v) => Math.abs(v.r - t.r) + Math.abs(v.g - t.g) + Math.abs(v.b - t.b) < 60)) continue;
      tavolozza.push(t);
    }

    // ---- 3. ogni pixel al suo colore ---------------------------------------
    const etichetta = new Int16Array(lw * lh).fill(-1);
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const i = ((y + y0) * W + (x + x0)) * 4;
        if (px[i + 3] < 128) continue;
        let best = -1, dist = 1e9;
        for (let k = 0; k < tavolozza.length; k++) {
          const t = tavolozza[k];
          const d = (px[i] - t.r) ** 2 + (px[i + 1] - t.g) ** 2 + (px[i + 2] - t.b) ** 2;
          if (d < dist) { dist = d; best = k; }
        }
        etichetta[y * lw + x] = best;
      }
    }

    // ---- 4. il ricalco ------------------------------------------------------
    // Il bordo di una macchia e' l'insieme dei lati dei pixel che stanno fra
    // «dentro» e «fuori». Presi come segmenti orientati, si incatenano da soli
    // in anelli chiusi: quelli esterni girano in un verso, i buchi nell'altro,
    // e non serve sapere quale sia quale perche' il riempimento e' «pari-dispari».
    function anelli(dentro) {
      const uscita = new Map();   // dal punto di partenza al segmento
      const chiave = (x, y) => y * (lw + 1) + x;
      const metti = (ax, ay, bx, by) => {
        const k = chiave(ax, ay);
        if (!uscita.has(k)) uscita.set(k, []);
        uscita.get(k).push([bx, by]);
      };
      for (let y = 0; y < lh; y++) {
        for (let x = 0; x < lw; x++) {
          if (!dentro(x, y)) continue;
          if (!dentro(x, y - 1)) metti(x, y, x + 1, y);
          if (!dentro(x + 1, y)) metti(x + 1, y, x + 1, y + 1);
          if (!dentro(x, y + 1)) metti(x + 1, y + 1, x, y + 1);
          if (!dentro(x - 1, y)) metti(x, y + 1, x, y);
        }
      }
      const fuori = [];
      for (const [k0, lista] of uscita) {
        while (lista.length) {
          const via = [[k0 % (lw + 1), Math.floor(k0 / (lw + 1))]];
          let [cx, cy] = lista.pop();
          let giri = 0;
          while ((cx !== via[0][0] || cy !== via[0][1]) && giri++ < 4 * lw * lh) {
            via.push([cx, cy]);
            const l = uscita.get(chiave(cx, cy));
            if (!l || !l.length) break;
            [cx, cy] = l.pop();
          }
          via.push([cx, cy]);
          if (via.length > 4) fuori.push(via);
        }
      }
      return fuori;
    }

    // Raddrizzare: di una linea di pixel a scaletta restano i due capi, se in
    // mezzo non si allontana piu' della tolleranza. E' cio' che fa la differenza
    // fra un file di trenta chilobyte e uno di trecento.
    //
    // Su un anello CHIUSO non si puo' partire dai due capi: sono lo stesso punto,
    // la «linea» fra loro non esiste, e la distanza da una linea che non esiste e'
    // zero per tutti — l'anello intero collasserebbe in un punto. Quindi si taglia
    // prima in due nel punto piu' lontano dal capo, e si raddrizzano le due meta'.
    function raddrizza(via, toll) {
      if (via.length < 3) return via;
      const tieni = new Uint8Array(via.length);
      tieni[0] = 1; tieni[via.length - 1] = 1;
      const pila = [];
      const chiuso = via[0][0] === via[via.length - 1][0] && via[0][1] === via[via.length - 1][1];
      if (chiuso && via.length > 3) {
        let lontano = 1, quanto = -1;
        for (let i = 1; i < via.length - 1; i++) {
          const d = (via[i][0] - via[0][0]) ** 2 + (via[i][1] - via[0][1]) ** 2;
          if (d > quanto) { quanto = d; lontano = i; }
        }
        tieni[lontano] = 1;
        pila.push([0, lontano], [lontano, via.length - 1]);
      } else pila.push([0, via.length - 1]);
      while (pila.length) {
        const [a, b] = pila.pop();
        if (b - a < 2) continue;
        const [ax, ay] = via[a], [bx, by] = via[b];
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        let peggio = -1, quale = -1;
        for (let i = a + 1; i < b; i++) {
          const d = Math.abs((via[i][0] - ax) * dy - (via[i][1] - ay) * dx) / len;
          if (d > peggio) { peggio = d; quale = i; }
        }
        if (peggio > toll) { tieni[quale] = 1; pila.push([a, quale], [quale, b]); }
      }
      return via.filter((_, i) => tieni[i]);
    }

    const scala = (LATO * QUOTA) / Math.max(lw, lh);
    const offX = (LATO - lw * scala) / 2, offY = (LATO - lh * scala) / 2;
    const n = (v) => Math.round(v * 10) / 10;
    const toll = TOLLERANZA / scala;
    const minima = (MINIMA / 100) * lw * lh;

    const strati = [];
    const conti = [];
    for (let k = 0; k < tavolozza.length; k++) {
      const dentro = (x, y) => x >= 0 && y >= 0 && x < lw && y < lh && etichetta[y * lw + x] === k;
      const grezzi = anelli(dentro);
      const d = grezzi
        .map((via) => raddrizza(via, toll))
        .filter((via) => {
          // area del poligono: le briciole non si disegnano
          let a = 0;
          for (let i = 0, j = via.length - 1; i < via.length; j = i++) a += via[j][0] * via[i][1] - via[i][0] * via[j][1];
          return Math.abs(a / 2) > minima;
        })
        .map((via) => 'M' + via.map(([x, y]) => `${n(offX + x * scala)} ${n(offY + y * scala)}`).join('L') + 'Z')
        .join('');
      const t = tavolozza[k];
      conti.push({ k, grezzi: grezzi.length, punti: d.length, toll, minima });
      if (d) strati.push({ colore: `#${[t.r, t.g, t.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`, d, quanti: t.n });
    }
    // Prima le tinte, l'inchiostro nero per ultimo: e' quello che chiude il
    // disegno, e se un bordo si sovrappone di mezzo pixel deve vincere lui.
    strati.sort((a, b) => (a.colore === '#000000' || a.colore < '#202020' ? 1 : 0) - (b.colore === '#000000' || b.colore < '#202020' ? 1 : 0));
    return { strati, lw, lh, colori: tavolozza.length, conti };
  }, { dati, LATO, QUOTA, TOLLERANZA, MINIMA });

  if (esito.errore) { console.error(esito.errore); process.exit(1); }
  if (process.env.DETTAGLI) console.log(JSON.stringify(esito.conti));

  // Il documento: niente script, niente animazioni, niente stili, niente che
  // venga da fuori. Il titolo e' obbligatorio e deve essere il nome del marchio.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.2" baseProfile="tiny-ps" viewBox="0 0 ${LATO} ${LATO}" width="${LATO}" height="${LATO}">
<title>SocialBot</title>
<rect x="0" y="0" width="${LATO}" height="${LATO}" fill="${CARTA}"/>
${esito.strati.map((s) => `<path fill="${s.colore}" fill-rule="evenodd" d="${s.d}"/>`).join('\n')}
</svg>
`;
  mkdirSync(FUORI, { recursive: true });
  writeFileSync(FILE, svg, 'utf8');
  const kb = statSync(FILE).size / 1024;

  console.log(`Ricalcato da ${SORG.replace(RAD + '/', '')}: ${esito.lw}x${esito.lh}, ${esito.colori} colori, ${esito.strati.length} strati.`);
  console.log(`Scritto ${FILE.replace(RAD + '/', '')} — ${kb.toFixed(1)} kB ${kb <= 32 ? '(sta sotto i 32 kB che chiede il certificato)' : '(TROPPO GRANDE: il certificato ne vuole al massimo 32)'}`);
  console.log('\nRecord DNS da creare (tipo TXT), quando avrai il certificato:\n');
  console.log('  default._bimi.<dominio>');
  console.log('  v=BIMI1; l=https://<dominio>/bimi/socialbot.svg; a=https://<dominio>/bimi/certificato.pem');
  console.log('\nSenza la parte «a=» il record e\' valido ma Gmail e Apple non mostrano il logo:');
  console.log('vogliono un certificato (VMC, o CMC). La lista per esteso sta in docs/POSTA.md.');
} finally {
  await browser.close();
}
