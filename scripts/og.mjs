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

const QUI = dirname(fileURLToPath(import.meta.url));
const PUB = join(QUI, '..', 'src', 'web', 'public');

const FONT = readFileSync(join(PUB, 'vendor', 'font', 'archivo-normal-400-800-latin.woff2')).toString('base64');

const SEGNO = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
<rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 7V4"/><circle cx="12" cy="3" r="1.4" fill="#fff"/>
<circle cx="9.2" cy="12.6" r="1.25" fill="#fff" stroke="none"/><circle cx="14.8" cy="12.6" r="1.25" fill="#fff" stroke="none"/>
<path d="M9.6 16h4.8"/></svg>`;

function pagina({ occhiello, titolo, evidenza, sotto, pastiglie }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Archivo;src:url(data:font/woff2;base64,${FONT}) format('woff2');font-weight:100 900;font-display:block}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px}
body{font-family:Archivo,system-ui,sans-serif;background:#0c0b12;color:#f4f4f5;position:relative;overflow:hidden;padding:58px 62px;display:flex;flex-direction:column}
.alone{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none}
.a1{width:640px;height:640px;left:-190px;top:-260px;background:rgba(109,59,239,.34)}
.a2{width:560px;height:560px;right:-170px;bottom:-250px;background:rgba(167,139,250,.20)}
.a3{width:420px;height:420px;right:180px;top:-190px;background:rgba(88,44,220,.22)}
.griglia{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);background-size:52px 52px;mask-image:radial-gradient(circle at 30% 20%,#000,transparent 78%)}
.testa{display:flex;align-items:center;gap:17px;position:relative;z-index:2}
.bollo{width:66px;height:66px;border-radius:19px;background:linear-gradient(150deg,#7c4dff,#a78bfa);display:grid;place-items:center;box-shadow:0 12px 34px rgba(109,59,239,.42)}
.bollo svg{width:36px;height:36px}
.nome{font-size:30px;font-weight:800;letter-spacing:-.024em;line-height:1.06}
.dominio{font-size:17px;color:#a78bfa;font-weight:600;letter-spacing:.005em;margin-top:2px}
.occhiello{margin-left:auto;font-size:15px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#c9bdf5;border:1px solid rgba(167,139,250,.42);background:rgba(109,59,239,.16);padding:9px 19px;border-radius:999px}
.mezzo{flex:1;display:flex;flex-direction:column;justify-content:flex-end;position:relative;z-index:2;padding-bottom:38px}
h1{font-size:${Math.max(titolo.length, (evidenza||'').length) > 30 ? 64 : 74}px;line-height:1.075;letter-spacing:-.036em;font-weight:800;max-width:1050px}
h1 b{color:#a78bfa;font-weight:800}
.sotto{margin-top:24px;font-size:25px;line-height:1.44;color:#b6b6c4;max-width:1000px;font-weight:400;text-wrap:pretty}
.sotto strong{color:#ededf2;font-weight:700}
.piede{display:flex;gap:13px;align-items:center;position:relative;z-index:2;flex-wrap:nowrap}
.pastiglia{font-size:19px;font-weight:600;color:#ddd8f2;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.11);border-radius:12px;padding:11px 19px;display:flex;align-items:center;gap:10px;white-space:nowrap}
.spunta{width:9px;height:9px;border-radius:50%;background:#a78bfa;flex:none}
</style></head><body>
<div class="alone a1"></div><div class="alone a3"></div><div class="alone a2"></div><div class="griglia"></div>
<div class="testa">
  <div class="bollo">${SEGNO}</div>
  <div><div class="nome">SocialBot</div><div class="dominio">socialbot.live</div></div>
  <div class="occhiello">${occhiello}</div>
</div>
<div class="mezzo">
  <h1>${titolo}${evidenza ? `<br><b>${evidenza}</b>` : ''}</h1>
  <p class="sotto">${sotto}</p>
</div>
<div class="piede">${pastiglie.map((p) => `<span class="pastiglia"><i class="spunta"></i>${p}</span>`).join('')}</div>
</body></html>`;
}

const IMMAGINI = {
  'og.png': pagina({
    occhiello: 'Bot per Twitch',
    titolo: 'Il bot per Twitch che scrive',
    evidenza: 'col tuo account',
    sotto: 'Comandi su misura, <strong>overlay per OBS</strong>, clip, musica, notifiche live e uno <strong>scudo anti&#8209;bot</strong> che si alza da solo.',
    pastiglie: ['Col tuo account', 'Overlay per OBS', 'Anche senza OBS', 'Gratis'],
  }),
  'og-guide.png': pagina({
    occhiello: 'Guide',
    titolo: 'Come si sta',
    evidenza: 'dall\'altra parte',
    sotto: 'Scegliere un bot, collegarlo, creare comandi, mettere gli overlay in OBS e <strong>difendersi da follow&#8209;bot e hate&#8209;raid</strong>.',
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
