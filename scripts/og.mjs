// Genera l'immagine di anteprima (Open Graph) del sito.
//
// Prima era un PNG e basta: nessuno script, nessun sorgente. Quando il sito è
// passato da bot.andryxify.it a socialbot.live l'immagine ha continuato a
// mostrare il dominio vecchio, e non c'era modo di correggerla se non
// ridisegnandola a mano. Ora il sorgente è questo file: si cambia il testo e si
// rigenera.
//
//   node scripts/og.mjs            → src/web/public/icons/og.png
//   node scripts/og.mjs --guide    → anche l'immagine delle guide
//
// Serve Playwright e un Chromium (vedi PLAYWRIGHT_BROWSERS_PATH).

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { tinta } from '../src/web/tavolozza.js';

const QUI = dirname(fileURLToPath(import.meta.url));
const PUB = join(QUI, '..', 'src', 'web', 'public');

const FONT = readFileSync(join(PUB, 'vendor', 'font', 'archivo-normal-400-800-latin.woff2')).toString('base64');

// Il marchio arriva dal disegno vero, non da un robot ridisegnato a mano qui
// dentro: quello era una copia, e una copia resta indietro il giorno che
// l'originale cambia. Il logo ESTESO lo si usa perche' qui la larghezza c'e'.
const LOGO = readFileSync(join(PUB, 'icons', 'logo-esteso.png')).toString('base64');

// I colori non si riscrivono qui: sono quelli del prodotto, letti da tema.css.
// Quando il marchio cambia, l'anteprima dei link cambia con lui.
const C = {
  carta: tinta('bg'), foglio: tinta('surface'), inchiostro: tinta('testo'),
  seconda: tinta('testo-2'), acc: tinta('acc'), acc600: tinta('acc-600'),
};
const velo = (colore, quota) => `color-mix(in srgb, ${colore} ${quota}%, transparent)`;

function pagina({ occhiello, titolo, evidenza, sotto, pastiglie }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Archivo;src:url(data:font/woff2;base64,${FONT}) format('woff2');font-weight:100 900;font-display:block}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px}
body{font-family:Archivo,system-ui,sans-serif;background:${C.carta};color:${C.inchiostro};position:relative;overflow:hidden;padding:58px 62px;display:flex;flex-direction:column}
.alone{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none}
.a1{width:640px;height:640px;left:-190px;top:-260px;background:${velo(C.acc, 16)}}
.a2{width:560px;height:560px;right:-170px;bottom:-250px;background:${velo(C.acc600, 12)}}
.a3{width:420px;height:420px;right:180px;top:-190px;background:${velo(C.acc, 10)}}
.griglia{position:absolute;inset:0;background-image:linear-gradient(${velo(C.inchiostro, 6)} 1px,transparent 1px),linear-gradient(90deg,${velo(C.inchiostro, 6)} 1px,transparent 1px);background-size:52px 52px;mask-image:radial-gradient(circle at 30% 20%,#000,transparent 78%)}
.testa{display:flex;align-items:center;gap:17px;position:relative;z-index:2}
.logo{height:104px;width:auto;display:block}
.firma{margin-left:auto;font-size:20px;color:${C.acc600};font-weight:700;letter-spacing:.01em;white-space:nowrap}
.occhiello{margin-left:auto;font-size:15px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.acc600};border:1px solid ${velo(C.acc, 34)};background:${velo(C.acc, 9)};padding:9px 19px;border-radius:999px}
.mezzo{flex:1;display:flex;flex-direction:column;justify-content:flex-end;position:relative;z-index:2;padding-bottom:38px}
h1{font-size:${Math.max(titolo.length, (evidenza||'').length) > 30 ? 64 : 74}px;line-height:1.075;letter-spacing:-.036em;font-weight:800;max-width:1050px}
h1 b{color:${C.acc};font-weight:800}
.sotto{margin-top:24px;font-size:25px;line-height:1.44;color:${C.seconda};max-width:1000px;font-weight:400;text-wrap:pretty}
.sotto strong{color:${C.inchiostro};font-weight:700}
.piede{display:flex;gap:13px;align-items:center;position:relative;z-index:2;flex-wrap:nowrap}
.pastiglia{font-size:19px;font-weight:600;color:${C.inchiostro};background:${velo(C.foglio, 74)};border:1px solid ${velo(C.inchiostro, 12)};border-radius:12px;padding:11px 19px;display:flex;align-items:center;gap:10px;white-space:nowrap}
.spunta{width:9px;height:9px;border-radius:50%;background:${C.acc};flex:none}
</style></head><body>
<div class="alone a1"></div><div class="alone a3"></div><div class="alone a2"></div><div class="griglia"></div>
<div class="testa">
  <img class="logo" src="data:image/png;base64,${LOGO}" alt="SocialBot">
  <div class="occhiello">${occhiello}</div>
</div>
<div class="mezzo">
  <h1>${titolo}${evidenza ? `<br><b>${evidenza}</b>` : ''}</h1>
  <p class="sotto">${sotto}</p>
</div>
<div class="piede">${pastiglie.map((p) => `<span class="pastiglia"><i class="spunta"></i>${p}</span>`).join('')}<span class="firma">socialbot.live</span></div>
</body></html>`;
}

const IMMAGINI = {
  'og.png': pagina({
    occhiello: 'Twitch e Kick',
    titolo: 'Il bot che scrive in chat',
    evidenza: 'col tuo account',
    sotto: 'Comandi su misura, <strong>overlay per la diretta</strong>, clip, musica, notifiche live e uno <strong>scudo anti&#8209;bot</strong> che si alza da solo.',
    pastiglie: ['Col tuo account', 'Overlay ed effetti', 'In italiano', 'Gratis'],
  }),
  'og-guide.png': pagina({
    occhiello: 'Guide',
    titolo: 'Come si sta',
    evidenza: 'dall\'altra parte',
    sotto: 'Scegliere un bot, collegarlo, creare comandi, mettere gli overlay sulla diretta e <strong>difendersi da follow&#8209;bot e hate&#8209;raid</strong>.',
    pastiglie: ['Guide pratiche', 'Niente giri di parole', 'Aggiornate'],
  }),
};

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
});
const soloOg = !process.argv.includes('--guide');
for (const [nome, html] of Object.entries(IMMAGINI)) {
  if (soloOg && nome !== 'og.png') continue;
  const pg = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
  await pg.setContent(html, { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(320);
  const via = join(PUB, 'icons', nome);
  await pg.screenshot({ path: via, type: 'png' });
  await pg.close();
  console.log('scritta', via);
}
await browser.close();
