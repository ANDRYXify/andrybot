// Cancello dello STACCO fra vignette.
//
// Il sito cambia scheda in due modi diversi, e la differenza non e' un vezzo:
// e' la grammatica del fumetto. Muoversi fra due SOTTOSEZIONI della stessa
// famiglia e' un passaggio «da azione ad azione» — stessa scena, la macchina
// non si sposta: i blocchi rientrano sfalsati nel verso del movimento, e basta.
// Cambiare SEZIONE e' un passaggio «da scena a scena» — luogo nuovo: ci vuole
// il fotogramma d'impatto, le linee di concentrazione per due fotogrammi, e poi
// la vignetta nuova.
//
// Perche' col browser. Quale delle due parta dipende da `stessaFamiglia()`, che
// non si legge da fuori, e da una catena di classi e tempi. Leggendo il codice
// sembrano sempre a posto tutte e due; l'unico modo di sapere quale e' partita
// e' guardare la pagina nell'istante giusto. Quindi si girano TUTTI i passaggi
// fra schede vicine e per ognuno si chiede: e' partito il lampo, o lo
// sfalsamento?
//
// E due cose che devono essere vere sempre:
//  · il lampo non resta mai a schermo (un velo a tutto schermo che non se ne va
//    e' peggio di non averlo);
//  · fra un lampo e l'altro passa abbastanza tempo. Un lampo a tutto schermo
//    ripetuto piu' di tre volte al secondo e' la soglia oltre cui le WCAG
//    considerano il contenuto a rischio per chi e' fotosensibile, e cliccare
//    veloce fra le schede ci arriva senza sforzo.
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
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.addStyleTag({ content: '#cookie-banner{display:none!important}' });

if (SELFTEST) {
  // Il difetto: un solo stacco per tutti. Si spegne il lampo, e da scena a
  // scena diventa identico a un passaggio dentro la stessa scena.
  await p.evaluate(() => { document.documentElement.style.setProperty('--t-impatto', '0ms'); });
  await p.addStyleTag({ content: '.lampo-scena{display:none!important}' });
}

const sorgente = await (await fetch(`http://127.0.0.1:${PORTA}/app.js`)).text();
const pausa = +(sorgente.match(/LAMPO_PAUSA\s*=\s*(\d+)/) || [])[1] || 0;
// Fra una misura e l'altra si aspetta piu' della pausa fra due lampi: sennoo'
// il cancello misura la protezione contro il lampeggio invece dello stacco.
const RESPIRO = Math.max(480, pausa + 200);

// Non si sbircia: si OSSERVA. Il lampo dura quattro fotogrammi, e guardare a
// istanti dava un conto diverso a ogni giro — un cancello che ballonzola non
// misura niente. Un osservatore sulle classi registra il passaggio comunque,
// qualunque sia il momento in cui lo si legge.
await p.evaluate(() => {
  window.__stacchi = { lampo: 0, scambio: 0, esce: 0, scena: 0, esceMuove: 0, scenaMuove: 0 };
  const guarda = () => {
    if (document.querySelector('.lampo-scena.batte')) window.__stacchi.lampo++;
    if (document.querySelector('.pannello-scheda.scambio')) window.__stacchi.scambio++;
    // non basta la classe: si chiede l'ANIMAZIONE che ne esce davvero. Il
    // blocco era finito dentro @media (prefers-reduced-motion) e la classe
    // c'era lo stesso, senza muovere niente.
    const u = document.querySelector('.pannello-scheda.esce');
    if (u) {
      window.__stacchi.esce++;
      const n = getComputedStyle(u).animationName;
      if (n && n !== 'none') window.__stacchi.esceMuove++;
    }
    const s = document.querySelector('.pannello-scheda.scena .carta.rivela');
    if (s) {
      window.__stacchi.scena++;
      const x = parseFloat(getComputedStyle(s).getPropertyValue('--rev-x')) || 0;
      if (Math.abs(x) > 4) window.__stacchi.scenaMuove++;
    }
  };
  new MutationObserver(guarda).observe(document.documentElement,
    { attributes: true, subtree: true, childList: true, attributeFilter: ['class'] });
});

const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
const passaggi = [];
for (let i = 1; i < schede.length; i++) {
  await p.evaluate((x) => window.SB_APP.vai(x), schede[i - 1]);
  await p.waitForTimeout(RESPIRO);
  await p.evaluate(() => { window.__stacchi = { lampo: 0, scambio: 0, esce: 0, scena: 0, esceMuove: 0, scenaMuove: 0 }; });
  await p.evaluate((x) => window.SB_APP.vai(x), schede[i]);
  await p.waitForTimeout(360);
  const conto = await p.evaluate(() => window.__stacchi);
  const esito = { lampo: conto.lampo > 0, scambio: conto.scambio > 0,
    esce: conto.esceMuove > 0, scena: conto.scenaMuove > 0 };
  await p.waitForTimeout(RESPIRO);
  passaggi.push({ da: schede[i - 1], a: schede[i], ...esito });
}

// il lampo non resta a schermo
await p.waitForTimeout(700);
const restato = await p.evaluate(() => {
  const l = document.querySelector('.lampo-scena');
  return { presenti: document.querySelectorAll('.lampo-scena').length,
    acceso: !!document.querySelector('.lampo-scena.batte'),
    opac: l ? +getComputedStyle(l).opacity : 0 };
});

// I DUE INTERRUTTORI NON SONO LO STESSO INTERRUTTORE.
//  · «leggero» si accende DA SOLO su un dispositivo che dichiara poca memoria,
//    pochi core o una rete lenta, e serve al CARICO. Un'opacita' che cambia su
//    un elemento solo non pesa niente: lo stacco deve restare.
//  · «meno movimento» lo chiede la persona, e vale per il MOVIMENTO: li' il
//    lampo non deve partire.
// Erano legati allo stesso freno, e su un portatile qualunque lo stacco spariva
// senza che nessuno lo sapesse.
const interruttori = {};
for (const [classe, atteso] of [['leggero', true], ['meno-moto', false]]) {
  await p.evaluate((c) => { document.body.classList.add(c); }, classe);
  await p.evaluate((x) => window.SB_APP.vai(x), schede[0]);
  await p.waitForTimeout(RESPIRO);
  await p.evaluate(() => { window.__stacchi = { lampo: 0, scambio: 0, esce: 0, scena: 0, esceMuove: 0, scenaMuove: 0 }; });
  const meta = schede.find((s) => s !== schede[0]);
  await p.evaluate((x) => window.SB_APP.vai(x), meta);
  await p.waitForTimeout(260);
  interruttori[classe] = { visto: (await p.evaluate(() => window.__stacchi)).lampo > 0, atteso };
  await p.evaluate((c) => { document.body.classList.remove(c); }, classe);
  await p.waitForTimeout(RESPIRO);
}

// la durata dell'impatto, e la pausa minima fra due lampi
const tempi = await p.evaluate(() => {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--t-impatto').trim();
  const n = parseFloat(v) || 0;
  return { impatto: /ms$/.test(v) ? n : n * 1000 };
});

await b.close();
await chiudiSito();

const esiti = [];
const dice = (ok, msg, extra = '') => { esiti.push(ok); console.log(`  ${ok ? '✓' : '✗'} ${msg}${!ok && extra ? `  → ${extra}` : ''}`); };

const scene = passaggi.filter((x) => x.lampo);
const azioni = passaggi.filter((x) => !x.lampo && x.scambio);
const muti = passaggi.filter((x) => !x.lampo && !x.scambio);

console.log(`\n${passaggi.length} passaggi fra schede vicine: ${scene.length} da scena a scena, ${azioni.length} da azione ad azione.\n`);

dice(scene.length > 0, 'cambiare sezione fa partire il fotogramma d\'impatto');
dice(azioni.length > 0, 'muoversi dentro la stessa sezione NON lo fa partire: e\' la stessa scena');
dice(muti.length <= 1, 'ogni passaggio ha il suo stacco', muti.map((x) => `${x.da}→${x.a}`).join(' · '));
dice(!restato.acceso && restato.opac < 0.02, 'il lampo non resta a schermo', `opacita ${restato.opac}`);
dice(restato.presenti <= 1, 'non se ne accumula uno per ogni cambio', `${restato.presenti} veli in pagina`);
dice(tempi.impatto > 0 && tempi.impatto <= 120, 'l\'impatto dura due fotogrammi, non mezzo secondo', `${tempi.impatto}ms`);
dice(pausa >= 340, 'fra due lampi passa abbastanza: non si arriva a tre al secondo', `pausa ${pausa}ms`);
const senzaUscita = scene.filter((x) => !x.esce);
const senzaEntrata = scene.filter((x) => !x.scena);
dice(!senzaUscita.length, 'la pagina vecchia esce davvero prima dell\'impatto (animazione, non solo classe)',
  senzaUscita.slice(0, 4).map((x) => `${x.da}→${x.a}`).join(' · '));
dice(!senzaEntrata.length, 'e quella nuova entra davvero dal verso giusto mentre il lampo si dirada',
  senzaEntrata.slice(0, 4).map((x) => `${x.da}→${x.a}`).join(' · '));
dice(interruttori.leggero.visto === true,
  'la modalita\' leggera non spegne lo stacco: serve al carico, non al movimento');
dice(interruttori['meno-moto'].visto === false,
  'chi ha chiesto meno movimento non vede il lampo');

const rossi = esiti.filter((x) => !x).length;
if (SELFTEST) {
  if (rossi) { console.log('\nAutoprova: con un solo stacco per tutti il cancello se ne accorge. ✓\n'); process.exit(0); }
  console.log('\nAutoprova FALLITA: il cancello non distingue i due stacchi.\n');
  process.exit(1);
}
console.log(rossi ? '\ncancello ROSSO ✗\n' : '\nOgni spostamento ha lo stacco che gli tocca. ✓\n');
process.exit(rossi ? 1 : 0);
