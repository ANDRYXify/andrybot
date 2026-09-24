// Cancello dello STACCO fra vignette: il sito si disegna, non si anima.
//
// Il sito cambia scheda in due modi, ed e' la grammatica del fumetto. Muoversi
// fra due SOTTOSEZIONI della stessa famiglia e' un passaggio «da azione ad
// azione»: stessa scena, niente si cancella, la vignetta nuova si disegna.
// Cambiare SEZIONE e' un passaggio «da scena a scena»: la vignetta vecchia si
// cancella col bianchetto, poi la nuova si disegna. Disegnare vuol dire matita,
// china sul bordo vero, retino che scopre il contenuto, pulizia. Il modello sta
// in docs/DISEGNO.md, il disegno in src/web/public/disegno.js.
//
// Perche' col browser. Il disegno e' una vista di come l'app cambia le classi
// (`visibile`, `esce`, `dentro`...), e quale strada prende dipende da
// `stessaFamiglia()` e da una catena di tempi. Leggendo il codice sembra sempre
// tutto a posto; l'unico modo di sapere cosa si disegna e' guardare la pagina
// mentre succede. Non si sbircia a istanti: si OSSERVA ogni tela che nasce.
//
// La prima versione di questo cancello, quando le carte entravano di lato,
// leggeva il testo di una variabile invece dello spostamento vero, ed era verde
// mentre le carte stavano ferme. Qui si guarda cosa nasce nel documento: le
// tele del bianchetto e della china, dove stanno, in che ordine partono.
//
// Uso: node scripts/verifica-stacco.mjs
//      node scripts/verifica-stacco.mjs --selftest   (deve diventare rosso)

import { apriSito } from './_sito.mjs';

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP && window.SB_DISEGNO, null, { timeout: 20000 });
await p.addStyleTag({ content: '#cookie-banner,.giro-velo,.giro-fumetto{display:none!important}' });

if (SELFTEST) {
  // Il difetto: la scheda vecchia non si cancella. L'uscita la chiede l'app con
  // la classe `esce`; qui la classe non arriva mai.
  await p.evaluate(() => {
    const orig = DOMTokenList.prototype.add;
    DOMTokenList.prototype.add = function (...c) { return orig.apply(this, c.filter((x) => x !== 'esce')); };
  });
}

// Ogni tela che nasce si annota: di che tipo e', dove sta, quando parte.
await p.evaluate(() => {
  window.__tele = [];
  new MutationObserver((mosse) => {
    for (const m of mosse) for (const n of m.addedNodes) {
      if (!(n instanceof SVGElement) || !n.classList.contains('dg-tela')) continue;
      const china = n.querySelector('.dg-china');
      window.__tele.push({
        tipo: n.querySelector('.dg-bianchetto') ? 'bianchetto' : china ? 'china' : 'altro',
        top: parseFloat(n.style.top) - (n.style.position === 'fixed' ? 0 : scrollY),
        left: parseFloat(n.style.left),
        da: china ? parseFloat(china.style.getPropertyValue('--dg-da')) : 0,
        z: +n.style.zIndex,
      });
    }
  }).observe(document.body, { childList: true });
});

const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
const passaggi = [];
for (let i = 1; i < schede.length; i++) {
  await p.evaluate((x) => window.SB_APP.vai(x), schede[i - 1]);
  await p.waitForTimeout(700);
  await p.evaluate(() => { window.__tele = []; });
  const stessa = await p.evaluate(([a, b2]) => stessaFamiglia(a, b2), [schede[i - 1], schede[i]]);
  await p.evaluate((x) => window.SB_APP.vai(x), schede[i]);
  await p.waitForTimeout(700);
  const tele = await p.evaluate(() => window.__tele);
  const disegni = tele.filter((t) => t.tipo === 'china').sort((x, y) => x.da - y.da);
  const inOrdine = disegni.every((t, k) => !k || t.top > disegni[k - 1].top + 2
    || (Math.abs(t.top - disegni[k - 1].top) <= 2 && t.left >= disegni[k - 1].left));
  passaggi.push({ da: schede[i - 1], a: schede[i], stessa,
    bianchetto: tele.some((t) => t.tipo === 'bianchetto'), disegni: disegni.length, inOrdine });
}

// Rimaste: un disegno finito non lascia niente nel documento.
await p.waitForTimeout(1600);
const rimaste = await p.evaluate(() => document.querySelectorAll('svg.dg-tela').length);

// La scena nuova parte dall'inizio. Cambiando sezione da una pagina scorsa in
// giu', la nuova compariva alla stessa altezza e poi scivolava su: il salto in
// cima chiedeva `behavior: 'auto'`, che vuol dire «come dice il CSS», e il CSS
// dice `scroll-behavior: smooth`. Si guarda scrollY nel momento esatto in cui
// la scheda nuova diventa visibile, non dopo: dopo, lo scivolo e' gia' finito.
let cima = null;
for (const x of passaggi.filter((y) => !y.stessa)) {
  await p.evaluate((d) => window.SB_APP.vai(d), x.da);
  await p.waitForTimeout(700);
  await p.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
  if (await p.evaluate(() => scrollY) < 300) continue;
  cima = await p.evaluate((a) => new Promise((ok) => {
    const prima = scrollY;
    const mo = new MutationObserver(() => {
      if (!document.querySelector(`.pannello-scheda.visibile[data-scheda="${a}"]`)) return;
      mo.disconnect();
      ok({ prima, dopo: scrollY });
    });
    mo.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
    window.SB_APP.vai(a);
  }), x.a);
  cima.via = `${x.da}→${x.a}`;
  await p.waitForTimeout(700);
  break;
}

// Gli avvisi: si disegnano con il loro segno (le scintille, o la vena di
// rabbia se e' un errore) e se ne vanno col bianchetto.
await p.evaluate(() => { window.__tele = []; toast('Salvato ✓'); toast('Non riesco a salvare: riprova', 'errore'); });
await p.waitForTimeout(600);
const segni = await p.evaluate(() => ({
  scintille: document.querySelectorAll('.dg-scintille').length,
  rabbia: document.querySelectorAll('.dg-rabbia').length,
  avvisi: window.__tele.filter((t) => t.tipo === 'china' && t.z > 200).length,
}));
await p.waitForTimeout(4200);
segni.via = await p.evaluate(() => window.__tele.filter((t) => t.tipo === 'bianchetto').length);

// Una finestra: si disegna la sua carta, sopra al velo.
await p.evaluate(() => { window.__tele = []; chiediSe({ titolo: 'Prova', si: 'Si', no: 'No' }); });
await p.waitForTimeout(500);
const finestra = await p.evaluate(() => window.__tele.filter((t) => t.tipo === 'china' && t.z > 300).length);
await p.evaluate(() => document.querySelectorAll('.bv-velo').forEach((v) => v.remove()));

// I due interruttori non sono lo stesso interruttore. «Leggero» si accende DA
// SOLO su un dispositivo che dichiara poca memoria, pochi core o una rete
// lenta, e serve al CARICO: qualche tratto non pesa niente, il disegno resta.
// «Meno movimento» lo chiede la persona, e li' non si disegna niente.
const interruttori = {};
const unaScena = passaggi.find((x) => !x.stessa);
for (const [classe, atteso] of [['leggero', true], ['meno-moto', false]]) {
  await p.evaluate((c) => { document.body.classList.add(c); }, classe);
  await p.evaluate((x) => window.SB_APP.vai(x), unaScena.da);
  await p.waitForTimeout(700);
  await p.evaluate(() => { window.__tele = []; });
  await p.evaluate((x) => window.SB_APP.vai(x), unaScena.a);
  await p.waitForTimeout(700);
  interruttori[classe] = { visto: (await p.evaluate(() => window.__tele.length)) > 0, atteso };
  await p.evaluate((c) => { document.body.classList.remove(c); }, classe);
}

// Niente veli a tutto schermo rimasti accesi SOPRA alla pagina. Sopra: lo
// sfondo sta a z-index negativo, dietro al contenuto, e non e' un velo.
const veli = await p.evaluate(() => [...document.body.children].filter((e) => {
  const s = getComputedStyle(e);
  if (s.position !== 'fixed' || +s.opacity < 0.02) return false;
  if (!(parseInt(s.zIndex, 10) > 0)) return false;
  const r = e.getBoundingClientRect();
  return r.width > innerWidth * 0.9 && r.height > innerHeight * 0.9;
}).map((e) => e.id || e.className || e.tagName));

const uscita = await p.evaluate(() => {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--t-uscita').trim();
  const x = parseFloat(v) || 0;
  return /ms$/.test(v) ? x : x * 1000;
});

await b.close();
await chiudiSito();

const esiti = [];
const dice = (ok, msg, extra = '') => { esiti.push(ok); console.log(`  ${ok ? '✓' : '✗'} ${msg}${!ok && extra ? `  → ${extra}` : ''}`); };
const via = (l) => l.slice(0, 4).map((x) => `${x.da}→${x.a}`).join(' · ');

const scene = passaggi.filter((x) => !x.stessa);
const azioni = passaggi.filter((x) => x.stessa);
console.log(`\n${passaggi.length} passaggi fra schede vicine: ${scene.length} da scena a scena, ${azioni.length} da azione ad azione.\n`);

dice(scene.length > 0 && azioni.length > 0, 'ci sono tutti e due i passaggi da guardare');
const senzaBianchetto = scene.filter((x) => !x.bianchetto);
dice(!senzaBianchetto.length, 'cambiare sezione cancella la vignetta vecchia col bianchetto', via(senzaBianchetto));
const conBianchetto = azioni.filter((x) => x.bianchetto);
dice(!conBianchetto.length, 'muoversi dentro la stessa sezione NON cancella niente: e\' la stessa scena', via(conBianchetto));
const senzaDisegno = passaggi.filter((x) => !x.disegni);
dice(!senzaDisegno.length, 'e la vignetta nuova si disegna, ogni volta', via(senzaDisegno));
const disordine = passaggi.filter((x) => !x.inOrdine);
dice(!disordine.length, 'in ordine di lettura: prima quello che sta piu\' in alto', via(disordine));
dice(rimaste === 0, 'un disegno finito non lascia niente nel documento', `${rimaste} tele rimaste`);
dice(!!cima && cima.dopo === 0, 'la scena nuova parte dall\'inizio, anche da una pagina scorsa in giu\'',
  cima ? `${cima.via}: compare a ${cima.dopo}px (era a ${cima.prima})` : 'nessuna scheda abbastanza lunga da scorrere');
dice(segni.avvisi === 2 && segni.scintille > 0 && segni.rabbia > 0,
  'gli avvisi si disegnano sopra la pagina, con le scintille o con la vena di rabbia', JSON.stringify(segni));
dice(segni.via === 2, 'e se ne vanno col bianchetto', `${segni.via} cancellature`);
dice(finestra === 1, 'una finestra si disegna sopra al suo velo', `${finestra} disegni sopra al velo`);
dice(!veli.length, 'non resta nessun velo a tutto schermo sopra alla pagina', veli.join(' · '));
dice(uscita > 0 && uscita <= 200, 'il bianchetto e\' corto: un colpo, non una dissolvenza', `${uscita}ms`);
dice(interruttori.leggero.visto === true, 'la modalita\' leggera non spegne il disegno: serve al carico, non al movimento');
dice(interruttori['meno-moto'].visto === false, 'chi ha chiesto meno movimento non vede disegnare niente');

const rossi = esiti.filter((x) => !x).length;
if (SELFTEST) {
  if (rossi) { console.log('\nAutoprova: se la scheda vecchia non si cancella, il cancello se ne accorge. ✓\n'); process.exit(0); }
  console.log('\nAutoprova FALLITA: il cancello non vede che la scheda vecchia resta.\n');
  process.exit(1);
}
console.log(rossi ? '\ncancello ROSSO ✗\n' : '\nOgni passaggio si cancella e si disegna come gli tocca. ✓\n');
process.exit(rossi ? 1 : 0);
