// Collaudo dell'EDITOR DELLA PAGINA LINK — gira in un browser vero.
//
// Il difetto che chiude. I pezzi della pagina erano tutti aperti insieme: dieci
// blocchi volevano dire dieci carte spalancate una sotto l'altra, e per
// modificare il terzo dovevi scorrere dentro un muro di campi.
//
// Ora e' un banco a tre zone, come quello dell'overlay: a sinistra i PEZZI (una
// riga ciascuno), al centro l'ANTEPRIMA, a destra i COMANDI del pezzo scelto.
// Le promesse sono quattro, e nessuna si vede leggendo il codice:
//   · i campi NON stanno dentro le righe — se ci tornassero, tornerebbe il muro;
//   · scegliere un pezzo porta i suoi comandi a destra, e uno solo alla volta;
//   · il pezzo scelto resta scelto anche dopo averlo spostato o duplicato: la
//     lista si ridisegna, e senza memoria si perderebbe;
//   · e quella memoria segue il PEZZO, non la posizione: se lo sposti deve
//     restare scelto lui, non chi ha preso il suo posto.
//
// Uso: node scripts/verifica-pagina-link.mjs

import { apriSito } from './_sito.mjs';

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const rotture = [];
p.on('pageerror', (e) => rotture.push('errore di pagina: ' + e.message));

await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('pagina'); });
await p.waitForFunction(() => document.querySelectorAll('#lp-blocchi .lp-blocco').length > 2, null, { timeout: 20000 });
await p.evaluate(() => document.querySelectorAll('.giro-velo, .giro-carta').forEach((x) => x.remove()));

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

const stato = () => p.evaluate(() => {
  const righe = [...document.querySelectorAll('#lp-blocchi .lp-blocco')];
  const campi = document.getElementById('lp-campi');
  return {
    quanti: righe.length,
    scelti: righe.map((x, i) => (x.classList.contains('sel') ? i : -1)).filter((x) => x >= 0),
    nomi: righe.map((x) => x.querySelector('strong')?.textContent),
    campiNelleRighe: document.querySelectorAll('#lp-blocchi input, #lp-blocchi select, #lp-blocchi textarea').length,
    campiADestra: campi ? campi.querySelectorAll('input, select, textarea').length : -1,
    titoloADestra: campi?.querySelector('.lp-isp-tit strong')?.textContent || '',
    alto: Math.round(document.getElementById('lp-blocchi').getBoundingClientRect().height),
  };
});

const scegli = (i) => p.evaluate((k) => document.querySelectorAll('#lp-blocchi .lp-blocco')[k].querySelector('strong').click(), i);

// ---- i campi non stanno nelle righe -------------------------------------
{
  const s = await stato();
  dice(s.campiNelleRighe === 0, `nessun campo dentro le righe (${s.quanti} pezzi)`, `ne ho trovati ${s.campiNelleRighe}`);
  dice(s.scelti.length === 0, 'a riposo non c\'e\' nessun pezzo scelto', `scelti: ${s.scelti}`);
  dice(s.nomi.every((n) => n && n.trim()), 'ogni riga dice cos\'e\'', s.nomi.join(' | '));
  if (s.alto > 0) dice(s.alto < s.quanti * 90, 'e la lista sta in poco spazio', `${s.alto}px per ${s.quanti} pezzi`);
}

// ---- scegliere porta i comandi a destra, uno alla volta ------------------
await scegli(0); await p.waitForTimeout(200);
const uno = await stato();
await scegli(2); await p.waitForTimeout(200);
const due = await stato();
dice(uno.scelti.length === 1 && uno.scelti[0] === 0, 'cliccando una riga si sceglie quel pezzo', `scelti: ${uno.scelti}`);
dice(uno.campiADestra > 0, 'e i suoi comandi compaiono a destra', `campi a destra: ${uno.campiADestra}`);
dice(uno.titoloADestra === uno.nomi[0], 'con scritto sopra di quale pezzo sono', `«${uno.titoloADestra}» invece di «${uno.nomi[0]}»`);
dice(due.scelti.length === 1 && due.scelti[0] === 2, 'sceglierne un altro sposta la scelta', `scelti: ${due.scelti}`);

// ---- il pezzo scelto SEGUE se stesso ------------------------------------
{
  const nomePrima = due.nomi[2];
  await p.evaluate(() => document.querySelectorAll('#lp-blocchi .lp-blocco')[2].querySelector('[data-lpop="su"]').click());
  await p.waitForTimeout(500);
  const dopo = await stato();
  const dove = dopo.scelti[0];
  dice(dopo.scelti.length === 1 && dopo.nomi[dove] === nomePrima,
    'spostandolo resta scelto LUI, non chi ha preso il suo posto',
    `scelto «${dopo.nomi[dove]}», mi aspettavo «${nomePrima}»`);
}

// ---- duplicare non perde il pezzo su cui stai lavorando -----------------
{
  const prima = await stato();
  await p.evaluate(() => document.getElementById('lp-campi').querySelector('[data-lpop="dup"]')?.click());
  await p.waitForTimeout(500);
  const dopo = await stato();
  dice(dopo.quanti === prima.quanti + 1, 'duplicare aggiunge un pezzo', `${prima.quanti} → ${dopo.quanti}`);
  dice(dopo.scelti.length === 1 && dopo.campiADestra > 0, 'e non perde quello su cui stavi lavorando', `scelti: ${dopo.scelti}`);
}

// ---- cliccare nell'anteprima sceglie QUEL pezzo -------------------------
{
  const ok = await p.evaluate(async () => {
    const doc = document.getElementById('lp-iframe')?.contentDocument;
    const w = doc?.querySelector('[data-b]');
    if (!w) return 'niente anteprima';
    w.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    const s = [...document.querySelectorAll('#lp-blocchi .lp-blocco')].filter((x) => x.classList.contains('sel'));
    return s.length === 1 && s[0].dataset.i === w.dataset.b ? 'ok' : 'sceglie il pezzo sbagliato';
  });
  if (ok !== 'niente anteprima') dice(ok === 'ok', 'cliccando un pezzo nell\'anteprima si sceglie il suo', ok);
}

dice(rotture.length === 0, 'nessun errore di pagina', rotture.join(' · '));

await b.close();
await chiudiSito();

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length === 1 ? '1 cosa non torna' : rossi.length + ' cose non tornano'}: l'editor torna a essere un muro di campi.` : '\nTre zone: i pezzi, l\'anteprima, i comandi del pezzo scelto. ✓');
process.exit(rossi.length ? 1 : 0);
