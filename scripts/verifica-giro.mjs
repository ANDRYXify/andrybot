// Collaudo del GIRO GUIDATO — gira in un browser vero.
//
// DUE DOMANDE, e sono diverse. La prima c'era gia': il faro punta a qualcosa che
// esiste? La seconda e' arrivata dopo, con una foto del direttore: all'ultimo
// passo — quello che dice «c'e' anche il manuale» — la scheda finiva in fondo
// alla pagina con i pulsanti tagliati sotto il bordo. Misurando, sei schede su
// sette avevano almeno un passo con la scheda fuori dallo schermo.
//
// Un faro giusto su una scheda che non si vede non serve a niente: sono due
// meta' della stessa cosa, e stanno in un file solo perche' vogliono lo stesso
// browser e la stessa pagina.
//
// Il giro adesso INSEGNA: ogni tappa e' un passo della ricetta della scheda
// (GUIDE[id].come) e il faro si accende sul controllo che quel passo nomina.
// Prima invece faceva il giro delle carte leggendo la prima frase di ognuna:
// non poteva invecchiare, ma non insegnava niente — descriveva il mobilio.
//
// Il prezzo di un giro scritto e' che puo' invecchiare: si sposta un id, si
// rifa' una carta, e il faro si accende sul nulla. Questo collaudo e' il
// contrappeso: apre ogni scheda, costruisce le tappe come le costruisce il
// prodotto e verifica che OGNI passo con un'ancora la trovi davvero, visibile.
//
// Uso: node scripts/verifica-giro.mjs
//      node scripts/verifica-giro.mjs --selftest --rottura=N
//        (rimette uno dei difetti della posa: DEVE diventare rosso)

import { apriSito } from './_sito.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(RAD, 'src/web/public/app.js');
const CSS = path.join(RAD, 'src/web/public/anime.css');
const SELFTEST = process.argv.includes('--selftest');

// I difetti veri, per l'autoprova. Rimessi uno per volta: un cancello provato su
// uno solo racconta di essere verde sapendone un terzo.
const ROTTURE = [
  ['la classe al posto della posizione: lo stile scritto a mano vince, la classe no', APP,
    `      if (!stretto) {
        carta.style.top = Math.max(GIRO_MARGINE, Math.round((window.innerHeight - alto) / 2)) + 'px';
        carta.style.left = Math.max(GIRO_MARGINE, Math.round((window.innerWidth - largo) / 2)) + 'px';
      }
      return;`,
    `      return;`],
  ['la stretta dentro la finestra, in verticale', APP,
    `    carta.style.top = fra(y, GIRO_MARGINE, window.innerHeight - alto - GIRO_MARGINE) + 'px';`,
    `    carta.style.top = y + 'px';`],
  ['la stretta dentro la finestra, in orizzontale', APP,
    `    carta.style.left = fra(x, GIRO_MARGINE, window.innerWidth - largo - GIRO_MARGINE) + 'px';`,
    `    carta.style.left = x + 'px';`],
  ['la posa un fotogramma dopo il testo, invece che insieme', APP,
    `  posiziona();`,
    `  requestAnimationFrame(posiziona);`],
  // Questo difetto non sta nel codice ma nell'animazione, e non si vede
  // leggendo: la scheda e' posizionata giusta, poi l'ingresso la trasla in giu'
  // di 14px. Contro il bordo inferiore esce, per tutta la durata dell'entrata.
  ['l\'ingresso che trasla la scheda fuori dal bordo a cui e\' incollata', CSS,
    `  animation: gr-entra-fermo .24s var(--an-vel) both;`,
    `  animation: gr-entra .24s var(--an-vel) both;`],
];
const originali = new Map([[APP, fs.readFileSync(APP, 'utf8')], [CSS, fs.readFileSync(CSS, 'utf8')]]);
const quale = SELFTEST ? Number(process.argv.find((a) => /^--rottura=/.test(a))?.split('=')[1] || 0) : -1;
if (SELFTEST) {
  const [nome, file, da, a] = ROTTURE[quale] || [];
  const testo = originali.get(file);
  if (!da || !testo?.includes(da)) { console.log(`  ✗ non trovo il punto da rompere (${quale})`); process.exit(1); }
  console.log(`  rimetto: ${nome}\n`);
  fs.writeFileSync(file, testo.replace(da, a));
}
const ripristina = () => { if (SELFTEST) for (const [f, t] of originali) fs.writeFileSync(f, t); };
process.on('exit', ripristina);
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
  console.log('(serve un browser vero; su un altro computer: PLAYWRIGHT=... CHROMIUM=... node scripts/verifica-giro.mjs)');
  process.exit(0);
}

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();

const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const rotture = [];
p.on('pageerror', (e) => rotture.push('errore di pagina: ' + e.message));
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP && typeof GUIDE === 'object', null, { timeout: 20000 });

const schede = await p.evaluate(() => Object.keys(GUIDE));
let passiTotali = 0, conFaro = 0;
const vuoti = [];
const povere = [];

for (const id of schede) {
  await p.evaluate((s) => window.SB_APP.vai(s), id);
  // il cambio scheda passa da una view transition: si aspetta che la scheda sia
  // DAVVERO in pagina, non un tempo deciso a occhio (in headless ci mette
  // anche un secondo e mezzo, e un'attesa corta misura il pannello precedente)
  await p.waitForFunction((s) => {
    const v = document.querySelector('.pannello-scheda.visibile');
    return !!v && v.id === 'scheda-' + s;
  }, id, { timeout: 20000 });
  await p.waitForTimeout(250);
  const r = await p.evaluate((s) => {
    const tappe = tappeDi(s);
    const fuori = [];
    for (const t of tappe) {
      if (!t.sel) { fuori.push({ sel: '', ok: true }); continue; }
      _puntaTappa(t, s);
      fuori.push({ sel: t.sel, ok: !!t.bersaglio, titolo: t.titolo || '' });
    }
    return { tappe: fuori, passi: (GUIDE[s].come || []).length, serve: !!GUIDE[s].serve };
  }, id);

  if (r.passi < 2) povere.push(`${id}: ${r.passi} passi`);
  for (const t of r.tappe) {
    if (!t.sel) continue;
    passiTotali++;
    if (t.ok) conFaro++;
    else vuoti.push(`${id} → ${t.sel}`);
  }
  const senza = r.tappe.filter((t) => t.sel && t.ok && !t.titolo).length;
  if (senza) rotture.push(`${id}: ${senza} tappe senza un titolo`);
}

// ── E LA SCHEDA SI DEVE VEDERE ───────────────────────────────────────────────
// Un faro giusto su una scheda fuori dallo schermo non serve a niente. Qui si
// cammina il giro vero, passo per passo, su piu' misure di finestra: quella
// stretta ma non telefono (760) e' l'unica dove il bersaglio arriva abbastanza
// a destra da spingere la scheda oltre il bordo, e al telefono la scheda la
// incolla in basso il foglio di stile, che e' un'altra strada ancora.
const CAMMINO = [
  [1280, 900, schede],
  [1440, 760, ['regole', 'scudo', 'moduli', 'conoscenza']],
  [760, 900, ['regole', 'scudo', 'moduli', 'conoscenza']],
  [420, 740, ['regole', 'scudo', 'moduli', 'conoscenza']],
];

const MISURA = () => {
  const c = document.querySelector('.giro-carta');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  const tasti = [...c.querySelectorAll('.giro-azioni button')].map((x) => x.getBoundingClientRect());
  return {
    conta: (c.querySelector('.giro-conta')?.textContent || '').trim(),
    top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right),
    tastiSotto: tasti.length ? Math.round(Math.max(...tasti.map((x) => x.bottom))) : null,
    scartoY: Math.round(Math.abs((r.top + r.bottom) / 2 - innerHeight / 2)),
    scartoX: Math.round(Math.abs((r.left + r.right) / 2 - innerWidth / 2)),
    w: innerWidth, h: innerHeight,
  };
};
const esce = (m) => m.top < -1 || m.bottom > m.h + 1 || m.left < -1 || m.right > m.w + 1
  || (m.tastiSotto !== null && m.tastiSotto > m.h + 1);

// L'ingresso della scheda non deve SPOSTARLA. Il piazzamento la incolla al
// bordo della finestra quando il bersaglio sta in basso, e li' `top` vale gia'
// il massimo consentito: una traslazione d'ingresso la porta fuori per forza.
//
// Questo si chiede ai FOTOGRAMMI CHIAVE, non a un campione preso durante
// l'animazione. Il difetto e' esistito per giorni con questo cancello verde:
// misurando a tempo lo si vede solo se il campione capita dentro i 240ms
// dell'entrata, e due esecuzioni su tre non lo vedevano. Una domanda sulla
// struttura ha sempre la stessa risposta.
//
// Opacita' e scala sono ammesse: rimpiccioliscono, quindi non possono uscire da
// nessun bordo, per nessuna altezza della scheda.
const INGRESSO = () => {
  const c = document.querySelector('.giro-carta');
  if (!c) return null;
  const nome = getComputedStyle(c).animationName;
  if (!nome || nome === 'none') return { nome: '', trovata: true, muove: false };
  let trovata = false, muove = false, dove = '';
  for (const foglio of document.styleSheets) {
    let regole; try { regole = foglio.cssRules; } catch { continue; }
    for (const r of regole) {
      if (r.type !== CSSRule.KEYFRAMES_RULE || r.name !== nome) continue;
      trovata = true;
      for (const k of r.cssRules) {
        const t = `${k.style.transform || ''} ${k.style.translate || ''}`;
        if (/translate|matrix|\d+\s*px/i.test(t)) { muove = true; dove = `${k.keyText}: ${t.trim()}`; }
      }
    }
  }
  return { nome, trovata, muove, dove };
};

const fuoriSchermo = [];
const ingressi = [];
let passiCamminati = 0;

for (const [lw, lh, quali] of CAMMINO) {
  await p.setViewportSize({ width: lw, height: lh });
  for (const id of quali) {
    await p.evaluate((s) => window.SB_APP.vai(s), id);
    await p.waitForFunction((s) => {
      const v = document.querySelector('.pannello-scheda.visibile');
      return !!v && v.id === 'scheda-' + s;
    }, id, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(250);
    await p.evaluate(() => { document.querySelector('[data-giro="salta"]')?.click(); });
    await p.evaluate(() => { const r = [...document.querySelectorAll('[data-rifai-giro]')]; (r.find((x) => x.offsetParent !== null) || r[0])?.click(); });
    await p.waitForTimeout(400);
    if (!ingressi.length) {
      const g = await p.evaluate(INGRESSO);
      if (g) ingressi.push(g);
    }

    for (let i = 0; i < 12; i++) {
      // Subito e a scorrimento finito: deve stare dentro in tutti e due i momenti.
      for (const attesa of [60, 600]) {
        await p.waitForTimeout(attesa);
        const m = await p.evaluate(MISURA);
        if (!m) break;
        if (esce(m)) fuoriSchermo.push(`${id} ${lw}×${lh} tappa ${m.conta}: ${m.top}..${m.bottom} in ${m.h}`);
      }
      const ancora = await p.evaluate(() => { const a = document.querySelector('[data-giro="avanti"]'); if (!a) return false; a.click(); return true; });
      passiCamminati++;
      if (!ancora) break;
    }

    // Il ritorno indietro al primo passo, che non ha bersaglio: e' la sola
    // strada, passando dalla porta, per chiedere un passo centrato dopo uno
    // puntato — cioe' il caso della foto. E non si chiede «c'e' la classe che
    // centra»: si chiede DOV'E'. La classe c'era anche quando non spostava
    // niente, ed e' esattamente per questo che il difetto e' vissuto tanto.
    await p.evaluate(() => { const r = [...document.querySelectorAll('[data-rifai-giro]')]; (r.find((x) => x.offsetParent !== null) || r[0])?.click(); });
    await p.waitForTimeout(350);
    await p.evaluate(() => { document.querySelector('[data-giro="avanti"]')?.click(); });
    await p.waitForTimeout(350);
    await p.evaluate(() => { document.querySelector('[data-giro="avanti"]')?.click(); });
    await p.waitForTimeout(450);
    await p.keyboard.press('ArrowLeft');
    await p.waitForTimeout(180);
    await p.keyboard.press('ArrowLeft');
    await p.waitForTimeout(400);
    const m = await p.evaluate(MISURA);
    if (m) {
      passiCamminati++;
      if (esce(m)) fuoriSchermo.push(`${id} ${lw}×${lh} tornando al primo passo: ${m.top}..${m.bottom} in ${m.h}`);
      else if (lw > 720 && (m.scartoY > 40 || m.scartoX > 40)) fuoriSchermo.push(`${id} ${lw}×${lh} il primo passo non è al centro (scarto ${m.scartoX}×${m.scartoY} px)`);
    }
    await p.evaluate(() => { document.querySelector('[data-giro="salta"]')?.click(); });
    await p.waitForTimeout(150);
  }
}

await b.close();
chiudiSito();

const dice = (ok, testo, extra = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`);
  return ok;
};

console.log('\nIl giro guidato punta a cose che esistono.\n');
let verde = true;
verde = dice(vuoti.length === 0, `ogni passo con un'ancora la trova: ${conFaro} su ${passiTotali}`, vuoti.join(', ')) && verde;
verde = dice(povere.length === 0, `ogni scheda ha almeno due passi da insegnare: ${schede.length} schede`, povere.join(', ')) && verde;
verde = dice(rotture.length === 0, 'nessuna tappa muta e nessun errore di pagina', rotture.join(' · ')) && verde;
verde = dice(passiCamminati >= 80, `passi camminati: ${passiCamminati}, su ${CAMMINO.length} misure di finestra`) && verde;
const ing = ingressi[0];
verde = dice(!!ing?.trovata, 'i fotogrammi dell\'ingresso della scheda si leggono', ing ? ing.nome : 'nessuna scheda') && verde;
verde = dice(!!ing && !ing.muove, 'l\'ingresso della scheda non la sposta: non puo\' spingerla fuori dal bordo',
  ing?.dove || '') && verde;
verde = dice(fuoriSchermo.length === 0, 'la scheda del giro sta sempre dentro lo schermo, pulsanti compresi',
  fuoriSchermo.slice(0, 5).join(' · ') + (fuoriSchermo.length > 5 ? ` · e altri ${fuoriSchermo.length - 5}` : '')) && verde;

if (SELFTEST) {
  ripristina();
  console.log('\n  selftest');
  if (fuoriSchermo.length) { console.log(`  ✓ il cancello se ne accorge (${fuoriSchermo.length} guai)`); verde = true; }
  else { console.log('  ✗ con questa rottura non ha visto niente'); verde = false; }
}

console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
