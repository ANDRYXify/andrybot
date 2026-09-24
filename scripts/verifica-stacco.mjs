// Cancello dello STACCO fra vignette: il sito si disegna, non si anima.
//
// Il sito cambia scheda in due modi, ed e' la grammatica del fumetto. Muoversi
// fra due SOTTOSEZIONI della stessa famiglia e' un passaggio «da azione ad
// azione»: stessa scena, niente si disfa, la vignetta nuova si disegna.
// Cambiare SEZIONE e' un passaggio «da scena a scena»: la vignetta vecchia si
// disegna all'indietro, poi la nuova si disegna. Disegnare vuol dire matita,
// china sul bordo vero, retino che scopre il contenuto, pulizia; all'indietro
// torna la matita, il retino ricopre, la china e la matita si ritirano. Il
// modello sta in docs/DISEGNO.md, il disegno in src/web/public/disegno.js.
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
// tele che disegnano e quelle che disfano, dove stanno, in che ordine partono.
// Il bianchetto che c'era prima cancellava una macchia a caso in mezzo al
// pannello, e questo cancello era verde: contava che una tela ci fosse, non
// quante vignette c'erano da disfare. Adesso le conta.
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
  // Il difetto: la scheda vecchia non si disfa. L'uscita la chiede l'app con
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
        tipo: n.querySelector('.dg-sfila') ? 'sfila' : china ? 'china' : 'altro',
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
  // Quante vignette della scena vecchia sono a schermo: tante se ne devono disfare.
  const daDisfare = await p.evaluate(() => {
    const v = [...document.querySelectorAll('.pannello-scheda.visibile .carta'), ...document.querySelectorAll('#pagina-testata > .guida-scheda')];
    return v.filter((e) => {
      const r = e.getBoundingClientRect(), st = getComputedStyle(e);
      return r.height > 8 && r.bottom > 0 && r.top < innerHeight && parseFloat(st.borderTopWidth) >= 0.5 && st.borderTopStyle !== 'none';
    }).length;
  });
  await p.evaluate((x) => window.SB_APP.vai(x), schede[i]);
  await p.waitForTimeout(700);
  const tele = await p.evaluate(() => window.__tele);
  const disegni = tele.filter((t) => t.tipo === 'china').sort((x, y) => x.da - y.da);
  const inOrdine = disegni.every((t, k) => !k || t.top > disegni[k - 1].top + 2
    || (Math.abs(t.top - disegni[k - 1].top) <= 2 && t.left >= disegni[k - 1].left));
  passaggi.push({ da: schede[i - 1], a: schede[i], stessa, daDisfare,
    disfatte: tele.filter((t) => t.tipo === 'sfila').length, disegni: disegni.length, inOrdine });
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
// rabbia se e' un errore) e se ne vanno disegnandosi all'indietro.
await p.evaluate(() => { window.__tele = []; toast('Salvato ✓'); toast('Non riesco a salvare: riprova', 'errore'); });
await p.waitForTimeout(600);
const segni = await p.evaluate(() => ({
  scintille: document.querySelectorAll('.dg-scintille').length,
  rabbia: document.querySelectorAll('.dg-rabbia').length,
  avvisi: window.__tele.filter((t) => t.tipo === 'china' && t.z > 200).length,
}));
await p.waitForTimeout(4200);
segni.via = await p.evaluate(() => window.__tele.filter((t) => t.tipo === 'sfila' && t.z > 200).length);

// Una finestra: si disegna la sua carta, sopra al velo, e chiudendola si disfa.
await p.evaluate(() => { window.__tele = []; chiediSe({ titolo: 'Prova', si: 'Si', no: 'No' }); });
await p.waitForTimeout(700);
const finestra = await p.evaluate(() => window.__tele.filter((t) => t.tipo === 'china' && t.z > 300).length);
await p.evaluate(() => document.querySelector('.bv-velo [data-mdl="no"]').click());
await p.waitForTimeout(500);
const finestraVia = await p.evaluate(() => ({
  disfatta: window.__tele.filter((t) => t.tipo === 'sfila' && t.z > 300).length,
  rimasta: document.querySelectorAll('.bv-velo').length,
}));

// La finestra che chiede un gesto di cui pentirsi urla: la carta diventa una
// nuvoletta spigolosa rossa. La sagoma sta dentro la carta e la china la
// ripassa: devono essere la stessa forma alla stessa misura. Nella prima
// versione il sito stringeva ogni svg dentro al suo contenitore, e la sagoma
// usciva piu' stretta della china; e il seme della forma cambiava con le
// classi della carta, quindi le punte non coincidevano.
await p.evaluate(() => { chiediSe({ titolo: 'Vuoi togliere questa regola?', si: 'Togli', pericolo: true }); });
await p.waitForTimeout(250);
const urlo = await p.evaluate(() => {
  const carta = document.querySelector('.bv-velo .bv-carta');
  const sagoma = carta && carta.querySelector('.dg-sagoma');
  const china = [...document.querySelectorAll('.dg-tela .dg-urlo-china')].pop();
  if (!sagoma || !china) return { sagoma: !!sagoma, china: !!china };
  const c = carta.getBoundingClientRect(), s = sagoma.getBoundingClientRect();
  return { stessaForma: sagoma.querySelector('.dg-fondo').getAttribute('d') === china.getAttribute('d'),
    largo: Math.round(s.width - c.width), alto: Math.round(s.height - c.height) };
});
await p.evaluate(() => document.querySelector('.bv-velo [data-mdl="no"]').click());
await p.waitForTimeout(500);

// Dove clicchi escono i «!!!»: solo per un clic vero, proprio li', e poi se ne vanno.
const tasto = await p.evaluate(() => {
  const r = document.querySelector('.drawer-grp-tit').getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
});
await p.evaluate(() => {
  window.__esclama = [];
  new MutationObserver((mosse) => mosse.forEach((m) => m.addedNodes.forEach((n) => {
    if (n.classList && n.classList.contains('dg-esclama')) {
      window.__esclama.push({ x: parseFloat(n.style.left), y: parseFloat(n.style.top), segni: n.querySelectorAll('.dg-esclamo').length });
    }
  }))).observe(document.body, { childList: true });
});
await p.mouse.click(tasto.x, tasto.y);
await p.waitForTimeout(600);
await p.evaluate(() => document.querySelector('.drawer-grp-tit').click());
await p.waitForTimeout(100);
const esclamo = await p.evaluate(() => ({ visti: window.__esclama, rimasti: document.querySelectorAll('.dg-esclama').length }));

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
const nonDisfatte = scene.filter((x) => !x.daDisfare || x.disfatte !== x.daDisfare);
dice(!nonDisfatte.length, 'cambiare sezione disfa ogni vignetta della scena vecchia, una per una',
  nonDisfatte.slice(0, 4).map((x) => `${x.da}→${x.a}: ${x.disfatte} su ${x.daDisfare}`).join(' · '));
const disfatteNellaScena = azioni.filter((x) => x.disfatte);
dice(!disfatteNellaScena.length, 'muoversi dentro la stessa sezione NON disfa niente: e\' la stessa scena', via(disfatteNellaScena));
const senzaDisegno = passaggi.filter((x) => !x.disegni);
dice(!senzaDisegno.length, 'e la vignetta nuova si disegna, ogni volta', via(senzaDisegno));
const disordine = passaggi.filter((x) => !x.inOrdine);
dice(!disordine.length, 'in ordine di lettura: prima quello che sta piu\' in alto', via(disordine));
dice(rimaste === 0, 'un disegno finito non lascia niente nel documento', `${rimaste} tele rimaste`);
dice(!!cima && cima.dopo === 0, 'la scena nuova parte dall\'inizio, anche da una pagina scorsa in giu\'',
  cima ? `${cima.via}: compare a ${cima.dopo}px (era a ${cima.prima})` : 'nessuna scheda abbastanza lunga da scorrere');
dice(segni.avvisi === 2 && segni.scintille > 0 && segni.rabbia > 0,
  'gli avvisi si disegnano sopra la pagina, con le scintille o con la vena di rabbia', JSON.stringify(segni));
dice(segni.via === 2, 'e se ne vanno disegnandosi all\'indietro', `${segni.via} su 2`);
dice(finestra === 1, 'una finestra si disegna sopra al suo velo', `${finestra} disegni sopra al velo`);
dice(finestraVia.disfatta === 1 && finestraVia.rimasta === 0, 'e chiudendola si disfa, poi se ne va', JSON.stringify(finestraVia));
dice(urlo.stessaForma === true && Math.abs(urlo.largo - 52) <= 1 && Math.abs(urlo.alto - 52) <= 1,
  'la finestra di un gesto pericoloso e\' una nuvoletta spigolosa, e la china ripassa la sua sagoma', JSON.stringify(urlo));
const [e1] = esclamo.visti;
dice(esclamo.visti.length === 1 && e1.segni === 6 && Math.abs(e1.x - tasto.x) <= 1 && Math.abs(e1.y - tasto.y) <= 1,
  'dove clicchi escono i «!!!», proprio li\', e un clic finto non ne fa uscire', JSON.stringify({ tasto, ...esclamo }));
dice(esclamo.rimasti === 0, 'e poi se ne vanno', `${esclamo.rimasti} rimasti`);
dice(!veli.length, 'non resta nessun velo a tutto schermo sopra alla pagina', veli.join(' · '));
dice(uscita > 0 && uscita <= 300, 'l\'uscita e\' corta: il disegno all\'indietro, non una dissolvenza', `${uscita}ms`);
dice(interruttori.leggero.visto === true, 'la modalita\' leggera non spegne il disegno: serve al carico, non al movimento');
dice(interruttori['meno-moto'].visto === false, 'chi ha chiesto meno movimento non vede disegnare niente');

const rossi = esiti.filter((x) => !x).length;
if (SELFTEST) {
  if (rossi) { console.log('\nAutoprova: se la scheda vecchia non si disfa, il cancello se ne accorge. ✓\n'); process.exit(0); }
  console.log('\nAutoprova FALLITA: il cancello non vede che la scheda vecchia resta.\n');
  process.exit(1);
}
console.log(rossi ? '\ncancello ROSSO ✗\n' : '\nOgni passaggio si disfa e si disegna come gli tocca. ✓\n');
process.exit(rossi ? 1 : 0);
