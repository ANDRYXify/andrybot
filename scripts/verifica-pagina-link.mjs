// Collaudo dell'EDITOR DELLA PAGINA LINK — gira in un browser vero.
//
// Il difetto che chiude. I pezzi della pagina erano tutti aperti insieme: dieci
// blocchi volevano dire dieci carte spalancate una sotto l'altra, e per
// modificare il terzo dovevi scorrere dentro un muro di campi. Cliccare un
// pezzo nell'anteprima ti ci portava, ma ti lasciava comunque in mezzo al muro.
//
// Ora e' un cassetto: una riga per pezzo, e se ne apre UNO alla volta. Sono
// tre promesse, e nessuna delle tre si vede leggendo il codice:
//   · aprirne uno chiude quello di prima (l'evento `toggle` NON risale: chi lo
//     ascolta come se risalisse non chiude mai niente, e restano due aperti);
//   · il pezzo su cui stai lavorando resta aperto anche dopo averlo spostato o
//     duplicato — la lista si ridisegna, e senza memoria si richiuderebbe tutto;
//   · e quella memoria segue il PEZZO, non la posizione: se lo sposti in giu'
//     deve restare aperto lui, non chi ha preso il suo posto.
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

const stato = () => p.evaluate(() => ({
  quanti: document.querySelectorAll('#lp-blocchi .lp-blocco').length,
  aperti: [...document.querySelectorAll('#lp-blocchi .lp-blocco')].map((x, i) => (x.open ? i : -1)).filter((x) => x >= 0),
  nomi: [...document.querySelectorAll('#lp-blocchi .lp-blocco strong')].map((x) => x.textContent),
  alto: Math.round(document.getElementById('lp-blocchi').getBoundingClientRect().height),
}));

const apri = (i) => p.evaluate((k) => document.querySelectorAll('#lp-blocchi .lp-blocco')[k].querySelector('.lp-btesta strong').click(), i);

// ---- a riposo la lista e' chiusa, e quindi corta -------------------------
{
  const s = await stato();
  dice(s.aperti.length === 0, `a riposo nessun pezzo e' spalancato (${s.quanti} pezzi in ${s.alto}px)`, `aperti: ${s.aperti}`);
  // se la lista non e' ancora disposta l'altezza e' 0: misurarla li' vorrebbe
  // dire darsi ragione da soli, quindi si guarda solo quando c'e' davvero
  if (s.alto > 0) dice(s.alto < s.quanti * 90, 'e la lista sta in poco spazio', `${s.alto}px per ${s.quanti} pezzi`);
  dice(s.nomi.every((n) => n && n.trim()), 'ogni riga chiusa dice cos\'e\'', s.nomi.join(' | '));
}

// ---- se ne apre UNO alla volta -------------------------------------------
await apri(0); await p.waitForTimeout(200);
const uno = await stato();
await apri(2); await p.waitForTimeout(200);
const due = await stato();
dice(uno.aperti.length === 1 && uno.aperti[0] === 0, 'cliccando una riga si apre quel pezzo', `aperti: ${uno.aperti}`);
dice(due.aperti.length === 1 && due.aperti[0] === 2, 'e aprendone un altro il primo si chiude', `aperti: ${due.aperti}`);

// ---- il pezzo aperto SEGUE se stesso -------------------------------------
{
  const nomePrima = due.nomi[2];
  await p.evaluate(() => {
    const d = document.querySelectorAll('#lp-blocchi .lp-blocco')[2];
    d.querySelector('[data-lpop="su"]').click();
  });
  await p.waitForTimeout(500);
  const dopo = await stato();
  const dove = dopo.aperti[0];
  dice(dopo.aperti.length === 1 && dopo.nomi[dove] === nomePrima,
    'spostandolo resta aperto LUI, non chi ha preso il suo posto',
    `aperto «${dopo.nomi[dove]}», mi aspettavo «${nomePrima}»`);
}

// ---- duplicare non richiude quello su cui stai lavorando -----------------
{
  const prima = await stato();
  await p.evaluate(() => document.querySelector('#lp-blocchi .lp-blocco[open] [data-lpop="dup"]')?.click());
  await p.waitForTimeout(500);
  const dopo = await stato();
  dice(dopo.quanti === prima.quanti + 1, 'duplicare aggiunge un pezzo', `${prima.quanti} → ${dopo.quanti}`);
  dice(dopo.aperti.length === 1, 'e non richiude quello su cui stavi lavorando', `aperti: ${dopo.aperti}`);
}

// ---- cliccare nell'anteprima apre QUEL pezzo -----------------------------
{
  const ok = await p.evaluate(async () => {
    const f = document.getElementById('lp-iframe');
    const doc = f?.contentDocument;
    const w = doc?.querySelector('[data-b]');
    if (!w) return 'niente anteprima';           // in demo l'anteprima puo' non esserci
    w.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    const aperti = [...document.querySelectorAll('#lp-blocchi .lp-blocco')].filter((x) => x.open);
    return aperti.length === 1 && aperti[0].dataset.i === w.dataset.b ? 'ok' : 'apre il pezzo sbagliato';
  });
  if (ok !== 'niente anteprima') dice(ok === 'ok', 'cliccando un pezzo nell\'anteprima si apre il suo', ok);
}

dice(rotture.length === 0, 'nessun errore di pagina', rotture.join(' · '));

await b.close();
await chiudiSito();

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length === 1 ? '1 cosa non torna' : rossi.length + ' cose non tornano'}: l'editor torna a essere un muro di campi.` : '\nL\'editor si apre un pezzo alla volta, e ricorda quale. ✓');
process.exit(rossi.length ? 1 : 0);
