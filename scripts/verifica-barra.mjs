// Collaudo della BARRA IN ALTO — gira in un browser vero, quindi vive fuori da
// `npm run cancelli` (i cancelli devono restare statici e istantanei).
//
// Il difetto: la barra si ritirava nel cassetto sotto una larghezza decisa a
// tavolino (1280px). Ma quanto spazio serve NON e' un numero fisso: dipende da
// quante voci ha l'account (un amministratore ne ha una in piu') e dalla lingua
// (le etichette spagnole sono piu' lunghe). Sopra quella soglia le voci non
// stavano ma venivano disegnate lo stesso, e siccome la barra le centra
// traboccavano da tutte e due le parti — il logo finiva sotto la prima voce e
// "Admin" sopra il selettore della lingua. Su un iPad in orizzontale (1366px)
// con un account amministratore era sempre cosi'.
//
// Ora la scelta si prende MISURANDO. Questo collaudo verifica che, in ogni
// combinazione di larghezza, lingua e ruolo, non ci sia una sola sovrapposizione
// e che ci sia sempre un modo di raggiungere il menu.
//
// Uso: node scripts/verifica-barra.mjs   (esce 1 se qualcosa si sovrappone)

import { apriSito } from './_sito.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAD, 'src/web/public');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2' };

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch {
  console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.');
  console.log('(serve un browser vero; su un altro computer: PLAYWRIGHT=... CHROMIUM=... node scripts/verifica-barra.mjs)');
  process.exit(0);
}

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();

const MISURA = `(() => {
  const barra = document.querySelector('.barra-top');
  if (!barra) return { errore: 'nessuna barra' };
  const box = (el) => el && el.getBoundingClientRect();
  const nav = barra.querySelector('.nav-top');
  const aperto = nav && getComputedStyle(nav).display !== 'none';
  const voci = aperto ? [...barra.querySelectorAll('.nav-top .grp')].map(box) : [];
  const tocca = (a, c) => a && c && a.left < c.right - 0.5 && c.left < a.right - 0.5;
  const coll = [];
  if (voci.length) {
    if (tocca(box(barra.querySelector('.marchio')), voci[0])) coll.push('logo/menu');
    if (tocca(voci[voci.length - 1], box(barra.querySelector('.top-strumenti')))) coll.push('menu/strumenti');
    for (let i = 1; i < voci.length; i++) if (tocca(voci[i - 1], voci[i])) coll.push('voce' + i);
  }
  const visibile = (sel) => { const el = document.querySelector(sel); return !!el && getComputedStyle(el).display !== 'none'; };
  return { aperto, cassetto: visibile('.apri-menu'), giu: visibile('.barra-giu'), voci: voci.length, coll };
})()`;

const LARGHEZZE = [390, 768, 1024, 1180, 1280, 1300, 1366, 1400, 1440, 1512, 1600, 1728, 1920, 2560];
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

// Una pagina per combinazione di lingua e ruolo; le larghezze si scorrono
// ridimensionando, che e' anche piu' vicino a quello che fa una persona.
const esiti = [];
const fuori = [];
for (const admin of [false, true]) {
  for (const lang of ['it', 'en', 'es']) {
    const p = await b.newPage({ viewport: { width: 1920, height: 800 } });
    await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=${lang}`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.querySelector('.barra-top .nav-top .grp'), null, { timeout: 15000 }).catch(() => {});
    if (admin) { await p.evaluate(() => { stato = { ...stato, isAdmin: true }; render(); }); }
    for (const w of LARGHEZZE) {
      await p.setViewportSize({ width: w, height: 800 });
      await p.waitForTimeout(260);   // la rimisura passa da requestAnimationFrame: le si da' il tempo di posarsi
      const r = await p.evaluate(MISURA);
      esiti.push({ admin, lang, w, ...r,
        ok: !r.errore && !(r.coll || []).length && (r.aperto || r.cassetto || r.giu) });

      // Il cassetto si chiude cliccando fuori? Non e' un dettaglio di comodita':
      // un menu che copre mezzo schermo e si chiude solo con la X e' una trappola.
      // E la trappola non stava a una larghezza sola: la barra si ritira per
      // MISURA (a qualsiasi larghezza), mentre il velo che intercetta il clic
      // era acceso da una media query a 1280px. Sopra i 1280 il velo non c'era.
      if (r.cassetto) {
        await p.click('.apri-menu');
        await p.waitForTimeout(120);
        const siApre = await p.evaluate(() => document.body.classList.contains('menu-aperto'));
        // La misura si prende a cassetto FERMO, e «fermo» non e' un'attesa a
        // occhio: l'animazione ha un rimbalzo, quindi si aspetta finche' la
        // trasformazione non e' tornata l'identita'. Mentre scivola, il riquadro
        // del cassetto e quelli dei figli si arrotondano in modo diverso e si
        // leggono due pixel di troppo che non esistono.
        await p.waitForFunction(() => {
          const d = document.querySelector('.drawer');
          if (!d) return true;
          const t = getComputedStyle(d).transform;
          return t === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(t);
        }, { timeout: 3000 }).catch(() => {});
        // NIENTE ESCE DAL CASSETTO. Il cassetto scorre (overflow-y: auto), quindi
        // ritaglia: un menu a tendina aperto li' dentro veniva tagliato, e sul
        // telefono il «?» apriva una tendina di cui si leggeva mezza parola. La
        // cura non e' spostarla: e' che dentro un elenco non ci vanno tendine.
        const sbordano = await p.evaluate(() => {
          const d = document.querySelector('.drawer');
          if (!d) return [];
          const r = d.getBoundingClientRect();
          const male = [];
          for (const el of d.querySelectorAll('*')) {
            const st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden') continue;
            const b = el.getBoundingClientRect();
            if (!b.width || !b.height) continue;
            if (b.left < r.left - 0.5 || b.right > r.right + 0.5) {
              male.push((el.className || el.tagName) + '');
            }
          }
          return [...new Set(male)].slice(0, 3);
        });
        await p.mouse.click(20, 400);              // fuori dal cassetto, che sta a destra
        await p.waitForTimeout(360);               // il tempo della transizione
        const siChiude = await p.evaluate(() => !document.body.classList.contains('menu-aperto'));
        if (!siChiude) await p.evaluate(() => document.body.classList.remove('menu-aperto'));
        fuori.push({ admin, lang, w, ok: siApre && siChiude && !sbordano.length, siApre, siChiude, sbordano });
      }
    }
    await p.close();
  }
}
await b.close();
chiudiSito();

const rossi = esiti.filter((e) => !e.ok);
for (const e of rossi) {
  console.log(`  ✗ ${e.lang} ${String(e.w).padStart(5)}px${e.admin ? ' (admin)' : ''} — ${(e.coll || []).join(', ') || 'nessun modo di raggiungere il menu'}`);
}
console.log(`  ${rossi.length ? '✗' : '✓'} ${esiti.length} combinazioni di larghezza, lingua e ruolo`);

const chiusi = fuori.filter((e) => !e.siApre || !e.siChiude);
const sbordati = fuori.filter((e) => e.sbordano?.length);
for (const e of chiusi) {
  console.log(`  ✗ ${e.lang} ${String(e.w).padStart(5)}px${e.admin ? ' (admin)' : ''} — ` +
    (e.siApre ? 'il cassetto non si chiude cliccando fuori' : 'il cassetto non si apre'));
}
console.log(`  ${chiusi.length ? '✗' : '✓'} ${fuori.length} volte il cassetto si apre e si chiude cliccando fuori`);
for (const e of sbordati) {
  console.log(`  ✗ ${e.lang} ${String(e.w).padStart(5)}px${e.admin ? ' (admin)' : ''} — esce dal cassetto e viene tagliato: ${e.sbordano.join(', ')}`);
}
console.log(`  ${sbordati.length ? '✗' : '✓'} ${fuori.length} volte niente esce dal cassetto`);
console.log(rossi.length || chiusi.length || sbordati.length
  ? `\n${rossi.length} combinazioni si sovrappongono, ${chiusi.length} cassetti restano aperti, ${sbordati.length} tagliano quello che c'e' dentro.`
  : '\nLa barra non si sovrappone mai, il menu si raggiunge sempre, si chiude cliccando fuori e non taglia niente. ✓');
process.exit(rossi.length || chiusi.length || sbordati.length ? 1 : 0);
