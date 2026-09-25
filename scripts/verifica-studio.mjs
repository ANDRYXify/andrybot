// Collaudo del BANCO DI REGIA — gira in un browser vero, quindi vive fuori da
// `npm run cancelli` (i cancelli devono restare statici e istantanei).
//
// Il difetto che questo collaudo chiude: la x che si salva NON e' il centro
// dell'elemento, e' la sua posizione lungo la corsa disponibile (0 = a filo a
// sinistra, 100 = a filo a destra). Chi trascinava la trattava come se fosse il
// centro, quindi appena toccavi un elemento questo saltava di mezza larghezza —
// tanto piu' lontano quanto piu' era vicino a un bordo. Spostare le cose
// diventava un tiro a indovinare.
//
// Non si prova «il codice chiama la funzione giusta»: si MISURA. Si prende un
// elemento in un punto qualunque (non al centro), lo si trascina di una
// quantita' nota verso il centro della tela — via dai bordi, dove il limite
// entrerebbe in gioco per davvero — e si controlla che si sia spostato di
// quella quantita'. Con Alt premuto, cosi' l'aggancio non falsa la misura.
//
// Uso: node scripts/verifica-studio.mjs   (esce 1 se qualcosa si sposta storto)

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
  process.exit(0);
}

// Con SB_MINI=1 il banco viene servito MINIFICATO, come lo scarica davvero un
// browser. E' la prova che accorciare i nomi interni non rompe l'applicazione:
// senza, si collauderebbe un codice che nessuno riceve.
const MINI = process.env.SB_MINI === '1';
let minificaJs = null;
if (MINI) ({ minificaJs } = await import('../src/web/minifica.js'));

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();

const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const rotture = [];
p.on('pageerror', (e) => rotture.push('errore di pagina: ' + e.message));
// Il giro guidato parte da solo alla prima visita di una scheda, dopo un
// attimo di quiete, e qui la tela si muove da programma: il giro si
// metterebbe davanti al trascinamento. Lo si spegne come lo spegne il
// pannello (sb-giro), prima che la pagina parta: toglierlo dopo e' una gara
// col suo orologio.
await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); } catch {} });
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('alert'); });
await p.waitForFunction(() => (document.querySelector('.pannello-scheda.visibile') || {}).id === 'scheda-alert', null, { timeout: 20000 });
await p.waitForFunction(() => document.querySelectorAll('#ap-stage .ap-el').length > 4, null, { timeout: 20000 });
await p.waitForTimeout(700);
if (!await p.evaluate(() => typeof giroVisto === 'function' && giroVisto(schedaAttiva))) {
  rotture.push('il giro guidato non si spegne piu\' con sb-giro, e puo\' coprire la tela');
}

// Il collaudo scrive nei campi dello stile per provare l'anteprima, e cosi'
// sporca la barra «hai modifiche non salvate»: da li' in poi cambiare overlay
// apre — giustamente — la domanda «salvo?», e il velo ferma tutto quello che
// viene dopo. E' sporcizia dello strumento, non del prodotto: si pulisce prima
// di ogni cambio di overlay.
await p.evaluate(() => { window.__scegli = (id) => { azzeraBarraSalva(); scegliOverlay(id); }; });

const centro = (id) => p.evaluate((s) => {
  const el = document.getElementById(s), c = document.getElementById('ovl-preview').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - c.left, y: r.top + r.height / 2 - c.top, w: r.width, h: r.height, cw: c.width, ch: c.height };
}, id);

const elementi = await p.evaluate(() => [...document.querySelectorAll('#ap-stage .ap-el')]
  .filter((e) => e.style.display !== 'none').map((e) => e.id));

const storti = [];
const coperti = [];
let provati = 0;
for (const id of elementi) {
  // Un'area grande quanto la tela (il muro delle emote, di serie) non ha dove
  // andare: prima la si stringe, come farebbe chiunque volesse spostarla.
  await p.evaluate(async (s) => {
    const k = ELEMENTI().map((e) => e.k).find((x) => _idEl(x) === s);
    const st = k && _posDove(k);
    if (!st || !(Number(st.w) > 50 || Number(st.h) > 50)) return;
    seleziona(k); _scriviProp('w', 50); _scriviProp('h', 50); deseleziona();
    await new Promise((r) => setTimeout(r, 120));
  }, id);
  const c0 = await centro(id);
  // si tira verso il centro della tela: cosi' il limite dei bordi non c'entra
  const dx = (c0.x < c0.cw / 2 ? 40 : -40);
  const dy = (c0.y < c0.ch / 2 ? 25 : -25);
  const bb = await (await p.$('#' + id)).boundingBox();
  // un elemento puo' stare SOTTO un altro: si cerca un punto suo davvero
  // scoperto, altrimenti non e' il trascinamento a essere storto — e' che li'
  // il dito non arriva, e si prova dai livelli.
  const punto = await p.evaluate(([b, s]) => {
    for (const [fx, fy] of [[0.28, 0.32], [0.5, 0.5], [0.75, 0.7], [0.12, 0.8], [0.9, 0.2]]) {
      const x = b.x + b.width * fx, y = b.y + b.height * fy;
      const el = document.elementFromPoint(x, y);
      if (el && el.closest('.ap-el') && el.closest('.ap-el').id === s) return { x, y };
    }
    return null;
  }, [bb, id]);
  if (!punto) { coperti.push(id); continue; }
  const px = punto.x, py = punto.y;
  await p.mouse.move(px, py);
  await p.mouse.down();
  await p.keyboard.down('Alt');
  await p.mouse.move(px + dx, py + dy, { steps: 6 });
  const c1 = await centro(id);
  await p.keyboard.up('Alt');
  await p.mouse.up();
  await p.waitForTimeout(60);
  provati++;
  const ex = Math.round(c1.x - c0.x), ey = Math.round(c1.y - c0.y);
  if (Math.abs(ex - dx) > 2 || Math.abs(ey - dy) > 2) storti.push(`${id}: chiesto ${dx},${dy} → fatto ${ex},${ey}`);
}

// COERENZA DELLA SCELTA. Un elemento si modifica in un posto solo, e quel posto
// sta accanto alla tela: scegliendolo, il pannello deve mostrare i SUOI comandi
// e nient'altro — non due blocchi, non quello di prima, non zero. Prima i
// comandi erano divisi fra il pannello e le carte sotto la tela: per una
// modifica precisa bisognava scendere, e mentre modificavi non vedevi piu'
// l'anteprima.
const chiavi = await p.evaluate(() => ELEMENTI().map((e) => e.k));
const incoerenti = [];
for (const k of chiavi) {
  const r = await p.evaluate((kk) => {
    seleziona(kk);
    const insp = document.getElementById('ovl-inspector');
    return {
      visti: [...insp.querySelectorAll('.asp-blocco')].filter((b) => b.offsetParent !== null || b.getClientRects().length).map((b) => b.dataset.asp),
      sel: [...document.querySelectorAll('#ap-stage .ap-el.sel')].map((e) => e.id),
      liv: [...document.querySelectorAll('.ovl-liv.scelto')].map((e) => e.dataset.liv),
      nome: (document.getElementById('insp-nome') || {}).textContent,
      altrove: !!insp.querySelector('.insp-altrove:not([hidden])'),
      atteso: _nomeEl(kk), idAtteso: _idEl(kk), inOverlay: _inOverlay(kk), chiuso: insp.hidden || insp.classList.contains('vuoto'),
    };
  }, k);
  const g = [];
  // Un elemento o ha QUI i suoi comandi, o dice dove sono: la sfida a tempo si
  // veste nella sua scheda, e allora al suo posto c'e' il rimando. Quello che
  // non deve succedere e' il vuoto muto, o i comandi di un altro.
  if (r.visti.length ? (r.visti.length !== 1 || r.visti[0] !== k) : !r.altrove) g.push(`comandi visibili [${r.visti}]`);
  if (r.inOverlay && (r.sel.length !== 1 || r.sel[0] !== r.idAtteso)) g.push(`sulla tela [${r.sel}]`);
  if (r.liv.length !== 1 || r.liv[0] !== k) g.push(`livelli [${r.liv}]`);
  if (r.nome !== r.atteso) g.push(`titolo «${r.nome}»`);
  if (r.chiuso) g.push('pannello chiuso o vuoto');
  if (g.length) incoerenti.push(k + ': ' + g.join(', '));
}
// LA TELA NON CAMBIA MISURA SCEGLIENDO. Nel banco il pannello dei comandi c'e'
// sempre, vuoto quando non c'e' niente di scelto. Se comparisse solo alla scelta
// si prenderebbe la sua colonna proprio mentre premi per trascinare: la tela si
// stringerebbe e la scena ti scivolerebbe sotto il dito. Era cosi': una regola
// generale sull'attributo `hidden` batteva quella del banco, e a 1440 px la
// tela passava da 797 a 491 px al primo tocco.
const misureTela = await p.evaluate(() => {
  const w = () => { const r = document.getElementById('ovl-preview').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; };
  deseleziona(); const libera = w();
  seleziona(ELEMENTI()[0].k); const scelta = w();
  deseleziona(); const lasciata = w();
  return { libera, scelta, lasciata };
});
const telaFerma = JSON.stringify(misureTela.libera) === JSON.stringify(misureTela.scelta)
  && JSON.stringify(misureTela.scelta) === JSON.stringify(misureTela.lasciata);

// LA LARGHEZZA E' DELLA TELA. Di lato il menu delle schede si prende 240 px
// proprio dove servono, e a 1440 la tela era larga 491. Per questo nello Studio
// c'e' «Tutto schermo»: il menu diventa il cassetto, che si apre dal tasto in
// alto. Lo sceglie chi lavora, quindi si prova col tasto vero: prima il menu e'
// di lato, premuto non c'e' piu', ripremuto torna. I pannelli prendono la loro base, e
// dello spazio in piu' solo quello che alla tela non serve: la tela e' larga
// quanto l'altezza le permette. Qui si rifa' il conto del modello e lo si
// confronta con quello che il browser ha disposto, a tre misure di schermo.
const MODELLO_SPAZIO = `(() => {
  const r = (el) => el.getBoundingClientRect();
  const scena = document.querySelector('.carta.ovl-banco .ovl-scena');
  const tela = document.getElementById('ovl-tela'), prev = document.getElementById('ovl-preview');
  const liv = document.getElementById('ovl-livelli'), insp = document.getElementById('ovl-inspector');
  const area = document.querySelector('.area-principale');
  const W = r(scena).width, H = r(scena).height, stretto = innerWidth < 1300;
  const bLiv = stretto ? 196 : 238;
  const bInsp = stretto ? 284 : Math.min(420, Math.max(300, 0.24 * W));
  const utile = (H - 36) * 16 / 9 + 36;
  const avanzo = Math.max(0, W - bLiv - bInsp - utile);
  const atteso = { liv: Math.min(bLiv + avanzo * 0.4, 300), insp: Math.min(bInsp + avanzo * 0.6, 460) };
  const tw = r(tela).width - 36, th = r(tela).height - 36;
  return {
    schermo: innerWidth + 'x' + innerHeight,
    menuDiLato: parseFloat(getComputedStyle(area).marginLeft) || 0,
    liv: [Math.round(r(liv).width), Math.round(atteso.liv)], insp: [Math.round(r(insp).width), Math.round(atteso.insp)],
    tela: [Math.round(r(prev).width), Math.round(Math.min(tw, th * 16 / 9))],
  };
})()`;
const menuDiLato = () => p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.area-principale')).marginLeft) || 0);
await p.setViewportSize({ width: 1440, height: 950 });
await p.waitForTimeout(250);
// Premendo «Tutto schermo» il menu di lato si disfa all'indietro e solo dopo
// lascia il posto alla pagina; ripremendo torna e si ridisegna. Si misura a
// eventi: quando un gruppo del menu comincia a disfarsi o a disegnarsi, e
// quando la pagina cambia davvero. Un'attesa fissa sarebbe una gara di tempi.
// Ogni pressione ha i suoi osservatori e il suo risultato: quelli della
// pressione prima si staccano, altrimenti scriverebbero qui col loro orologio.
const segnaCambio = () => p.evaluate(() => {
  (window.__schermoOss || []).forEach((o) => o.disconnect());
  const t0 = performance.now(), g = document.querySelector('#nav-drawer > .drawer-grp');
  const era = document.body.classList.contains('tutto-schermo');
  const quando = () => Math.max(1, Math.round(performance.now() - t0));
  const s = { disfa: 0, ridisegna: 0, cambia: 0 };
  window.__schermo = s;
  const suGruppo = new MutationObserver(() => {
    if (g.classList.contains('dg-out') && !s.disfa) s.disfa = quando();
    if (g.classList.contains('dg-in') && !s.ridisegna) s.ridisegna = quando();
  });
  suGruppo.observe(g, { attributes: true, attributeFilter: ['class'] });
  const suPagina = new MutationObserver(() => {
    if (document.body.classList.contains('tutto-schermo') !== era && !s.cambia) s.cambia = quando();
  });
  suPagina.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.__schermoOss = [suGruppo, suPagina];
});
const premi = async (a) => {
  await segnaCambio();
  await p.click('#pt-schermo');
  await p.waitForFunction((x) => document.body.classList.contains('tutto-schermo') === x, a, { timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(150);
  return p.evaluate(() => window.__schermo);
};
const schermo = { prima: await menuDiLato() };
schermo.entra = await premi(true);
schermo.premuto = await menuDiLato();
const spazi = [];
for (const [w, h] of [[1440, 950], [1280, 800], [1920, 1080]]) {
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(250);
  spazi.push(await p.evaluate(MODELLO_SPAZIO));
}
await p.setViewportSize({ width: 1440, height: 950 });
await p.waitForTimeout(250);
schermo.esce = await premi(false);
schermo.ripremuto = await menuDiLato();
await premi(true);
// Il tutto schermo e' una scelta che resta: a cambiarlo e' anche la scheda.
// Col menu aperto dal bordo si va a una scheda stretta: il menu torna di lato
// e si ridisegna li', nello stesso momento, anche se stava cominciando a
// disfarsi (mentre si disegna o si disfa il suo contorno e' coperto, e la
// misura deve leggere quello vero). Tornando, si disfa prima di sparire.
const casa = await p.evaluate(() => { document.getElementById('apri-menu')?.click(); return schedaAttiva; });
await p.waitForTimeout(900);
const vaiA = async (id, atteso) => {
  await segnaCambio();
  await p.evaluate((x) => window.SB_APP.vai(x), id);
  await p.waitForFunction((x) => document.body.classList.contains('tutto-schermo') === x, atteso, { timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(150);
  return p.evaluate(() => window.__schermo);
};
schermo.aStretta = await vaiA('stato', false);
schermo.aLarga = await vaiA(casa, true);
const schermoNavigato = schermo.aStretta.cambia > 0 && schermo.aStretta.ridisegna > 0 && Math.abs(schermo.aStretta.ridisegna - schermo.aStretta.cambia) <= 50
  && schermo.aLarga.disfa > 0 && schermo.aLarga.cambia > schermo.aLarga.disfa;
const schermoGiusto = schermo.prima > 0 && schermo.premuto === 0 && schermo.ripremuto > 0;
const schermoDisegnato = schermo.entra.disfa > 0 && schermo.entra.cambia > schermo.entra.disfa
  && schermo.esce.cambia > 0 && schermo.esce.ridisegna > 0 && Math.abs(schermo.esce.ridisegna - schermo.esce.cambia) <= 50;

// IL MENU DAL BORDO. A tutto schermo il menu aspetta sul bordo sinistro, una
// colonna di 20 px dove la pagina non entra: ci passi sopra per andare ai
// livelli, quindi compare solo dopo una sosta. Compare dov'era, senza
// scivolare, e si disegna come una vignetta: il contorno, poi i gruppi. Uscendo
// si disfa all'indietro, e sparisce solo quando il disegno e' tornato indietro.
const statoMenu = () => p.evaluate(() => {
  const d = document.getElementById('drawer');
  return { aperto: document.body.classList.contains('menu-aperto'), visibile: getComputedStyle(d).visibility,
    sinistra: Math.round(d.getBoundingClientRect().left), tele: document.querySelectorAll('svg.dg-tela').length };
});
await p.mouse.move(700, 500);
await p.waitForTimeout(300);
const bordo = { pagina: await p.evaluate(() => Math.round(document.querySelector('.carta.ovl-banco').getBoundingClientRect().left)) };
await p.mouse.move(8, 520, { steps: 5 });
await p.waitForTimeout(40);
bordo.primaDellaSosta = await statoMenu();
await p.waitForTimeout(260);
bordo.comparso = await statoMenu();
await p.waitForTimeout(900);
await p.evaluate(() => {
  const d = document.getElementById('drawer'), t0 = performance.now();
  window.__esce = { disfa: 0, chiuso: 0 };
  new MutationObserver(() => { if (d.classList.contains('dg-out') && !__esce.disfa) __esce.disfa = Math.round(performance.now() - t0); })
    .observe(d, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(() => { if (!document.body.classList.contains('menu-aperto') && !__esce.chiuso) __esce.chiuso = Math.round(performance.now() - t0); })
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });
});
await p.mouse.move(900, 520, { steps: 6 });
await p.waitForTimeout(1200);
bordo.esce = await p.evaluate(() => window.__esce);
bordo.uscito = await statoMenu();
const bordoGiusto = bordo.pagina >= 20 && !bordo.primaDellaSosta.aperto
  && bordo.comparso.aperto && bordo.comparso.visibile === 'visible' && bordo.comparso.sinistra < 20 && bordo.comparso.tele > 0
  && bordo.esce.disfa > 0 && bordo.esce.chiuso > bordo.esce.disfa
  && !bordo.uscito.aperto && bordo.uscito.visibile === 'hidden';
const spazioStorto = spazi.filter((s) => s.menuDiLato > 0 || Math.abs(s.liv[0] - s.liv[1]) > 1.5
  || Math.abs(s.insp[0] - s.insp[1]) > 1.5 || Math.abs(s.tela[0] - s.tela[1]) > 1.5);

const dopoScelta = await p.evaluate(() => {
  deseleziona();
  const insp = document.getElementById('ovl-inspector');
  return { visti: [...insp.querySelectorAll('.asp-blocco')].filter((b) => b.offsetParent !== null || b.getClientRects().length).length,
    sel: document.querySelectorAll('#ap-stage .ap-el.sel').length, chiuso: insp.classList.contains('vuoto') };
});

// E niente deve essere rimasto sotto la tela: un campo dimenticato la' e'
// esattamente il difetto da cui si e' partiti.
const rimasti = await p.evaluate(() => document.querySelectorAll(
  '#sez-alert input, #sez-chat input, #sez-musica input, #sez-timer input,'
  + ' #sez-alert select, #sez-chat select, #sez-musica select, #sez-timer select').length);

// I COMANDI DEVONO ARRIVARE ALLA TELA. Spostare il markup di un comando in un
// altro posto scollega il gestore che lo ascoltava: il campo resta bello ma non
// fa piu' niente, e non c'e' errore da nessuna parte. Qui si tocca un comando
// per ogni tipo di elemento e si controlla che l'anteprima cambi davvero.
const PROVE = [
  ['musica', '[data-c="cover"]', 'vinile', () => document.querySelector('#ap-musica .ovl-musica').className, 'cover-vinile'],
  ['timer', '[data-c="titolo"]', 'Manca poco', () => document.querySelector('#ap-timer .t-tit').textContent, 'Manca poco'],
  ['chat', '#co-pos', 'basso-destra', () => document.querySelector('#ap-chat').className, 'destra'],
  ['goal:g1', '[data-goal-id="g1"] [data-g="obiettivo"]', '900', () => document.querySelector('#ap-goal-g1 .g-num').textContent, '/ 900'],
  ['cont:morti', '[data-asp="cont:morti"] [data-k="formato"]', 'MORTI = {valore}', () => document.querySelector('#ap-cont-morti .contatore-widget').textContent, 'MORTI'],
];
const morti = [];
for (const [k, sel, val, leggi, atteso] of PROVE) {
  const r = await p.evaluate(async ([kk, s2, v, fn]) => {
    seleziona(kk);
    await new Promise((r) => setTimeout(r, 140));
    const el = document.querySelector(s2);
    if (!el) return { errore: 'campo assente' };
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 260));
    try { return { visto: String(eval('(' + fn + ')')()) }; } catch (e) { return { errore: 'anteprima assente' }; }
  }, [k, sel, val, leggi.toString()]);
  if (r.errore || !r.visto.includes(atteso)) morti.push(`${k} ${sel}: ${r.errore || r.visto.slice(0, 40)}`);
}

// L'occhio di un livello: cliccarlo toglie l'elemento dall'overlay E si vede
// che l'ha fatto. Prima l'elemento spariva ma l'occhio restava aperto; da
// quando i livelli sono l'elenco di CHI C'E', la riga non resta spenta in
// fondo: se ne va e ricompare tra quelli da rimettere. E da li' si rimette.
const occhio = await p.evaluate(async () => {
  const riga = document.querySelector('.ovl-liv[data-liv="alert"]');
  const occ = riga && riga.querySelector('[data-occhio]');
  if (!occ) return { errore: 'nessun occhio' };
  occ.click();
  await new Promise((r) => setTimeout(r, 200));
  const nodo = document.getElementById('ap-alert');
  const restata = !!document.querySelector('.ovl-liv[data-liv="alert"]');
  const rimetti = document.querySelector('#ovl-agg [data-metti="alert"]');
  const esito = { elementoVia: nodo.style.display === 'none', cambiata: !restata && !!rimetti, restata, rimettibile: !!rimetti };
  if (rimetti) { rimetti.click(); await new Promise((r) => setTimeout(r, 300)); }
  esito.tornato = !!document.querySelector('.ovl-liv[data-liv="alert"]')
    && document.getElementById('ap-alert').style.display !== 'none';
  return esito;
});

// Una proprieta', un valore. Cursore e casella erano due strade diverse per la
// stessa Dimensione: muovevi il cursore e la casella restava indietro, scrivevi
// nella casella e il cursore mentiva. Tre numeri sullo schermo, uno vero.
const doppioni = [];
for (const [campo, cur, cas] of [['s', 'insp-size', 'insp-s'], ['r', 'insp-rot', 'insp-r']]) {
  const r = await p.evaluate(async ([c, idCur, idCas]) => {
    seleziona('goal:g1');
    await new Promise((r) => setTimeout(r, 140));
    const dai = async (id, v) => {
      const e = document.getElementById(id);
      e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 120));
      return { cursore: Number(document.getElementById(idCur).value),
        casella: Number(document.getElementById(idCas).value),
        vero: Number(_statoXY(selezione)[c]) };
    };
    const a = await dai(idCur, c === 's' ? 210 : 90);
    const b2 = await dai(idCas, c === 's' ? 140 : -30);
    return { a, b: b2 };
  }, [campo, cur, cas]);
  for (const [quando, m] of Object.entries(r)) {
    if (m.cursore !== m.vero || m.casella !== m.vero) {
      doppioni.push(`${campo} (${quando === 'a' ? 'dal cursore' : 'dalla casella'}): cursore ${m.cursore}, casella ${m.casella}, vero ${m.vero}`);
    }
  }
}

// L'annulla girava su goal e contatori a mano e si era dimenticato la famiglia
// del player e del timer: li spostavi e Annulla non li riportava indietro.
const scordati = [];
for (const k of await p.evaluate(() => ELEMENTI().map((e) => e.k))) {
  const r = await p.evaluate(async (kk) => {
    seleziona(kk);
    await new Promise((r) => setTimeout(r, 120));
    // Un'area larga quanto la tela (il muro delle emote, di serie) non ha dove
    // andare di lato: per spostarla la si stringe prima, come farebbe chiunque.
    if (Number(_posDove(kk).w) > 50) { _scriviProp('w', 50); await new Promise((r) => setTimeout(r, 120)); }
    const prima = { ..._posDove(kk) };
    _scriviProp('x', Math.round(prima.x) === 40 ? 60 : 40);
    await new Promise((r) => setTimeout(r, 120));
    const mosso = { ..._posDove(kk) };
    annullaOvl();
    await new Promise((r) => setTimeout(r, 200));
    return { prima, mosso, dopo: { ..._posDove(kk) } };
  }, k);
  if (Math.round(r.mosso.x) === Math.round(r.prima.x)) scordati.push(`${k}: non si e' mosso`);
  else if (Math.round(r.dopo.x) !== Math.round(r.prima.x)) scordati.push(`${k}: annulla lo lascia a ${r.dopo.x} invece di ${r.prima.x}`);
}

// I livelli, l'inspector e il piede devono dire lo stesso posto: prima il
// livello diceva ancora «in alto a sinistra» mentre l'inspector diceva 2.29%.
const discordi = await p.evaluate(async () => {
  const fuori = [];
  for (const e of ELEMENTI()) {
    if (!_inOverlay(e.k)) continue;
    seleziona(e.k);
    await new Promise((r) => setTimeout(r, 90));
    const st = _posDove(e.k);
    const riga = document.querySelector(`.ovl-liv[data-liv="${CSS.escape(e.k)}"] .ovl-liv-corpo span`);
    const testo = riga ? riga.textContent.trim() : '';
    const atteso = `${Math.round(st.x)}% · ${Math.round(st.y)}%`;
    const cas = Number(document.getElementById('insp-x').value);
    if (!testo.startsWith(atteso)) fuori.push(`${e.k}: livello «${testo}» invece di «${atteso}»`);
    if (Math.abs(cas - st.x) > 0.02) fuori.push(`${e.k}: casella X ${cas} invece di ${st.x}`);
  }
  return fuori;
});

// L'ORDINE DEI LIVELLI (docs/OVERLAY.md). Si prova il gesto vero: la riga
// della chat presa dalla presa e tirata su di due righe va due livelli piu'
// avanti, e la tela la segue; Alt+↓ sulla riga la rimanda indietro di uno;
// Ctrl+Z torna all'ordine di prima; e scegliere un elemento non lo porta
// davanti: il suo livello resta quello dell'ordine.
const livelli = [];
{
  await p.evaluate(() => { deseleziona(); _scriviOrdine([]); aggiornaAnteprima(); _rendiLivelli(); });
  await p.waitForTimeout(150);
  const vis = () => p.evaluate(() => _ordineScena().filter((k) => _inOverlay(k)));
  const prima = await vis();
  const presa = await p.$('#ovl-livelli [data-presa="chat"]');
  const riga = await p.$('#ovl-livelli [data-liv="chat"]');
  if (!presa || !riga) livelli.push('la riga della chat non ha la presa');
  else {
    await presa.scrollIntoViewIfNeeded();
    await p.waitForTimeout(150);
    const b = await presa.boundingBox();
    const passo = await p.evaluate(() => { const r = [...document.querySelectorAll('#ovl-livelli > * > .ovl-liv, #ovl-livelli .ovl-liv')]; return r.length > 1 ? r[1].getBoundingClientRect().top - r[0].getBoundingClientRect().top : 30; });
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await p.mouse.down();
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - passo * 2, { steps: 8 });
    await p.mouse.up();
    await p.waitForTimeout(250);
    const dopo = await vis();
    const i0 = prima.indexOf('chat'), i1 = dopo.indexOf('chat');
    if (i1 !== Math.min(prima.length - 1, i0 + 2)) livelli.push(`trascinata su di due righe la chat va da ${i0} a ${i1} invece che a ${Math.min(prima.length - 1, i0 + 2)}`);
    const zOk = await p.evaluate(() => _ordineScena().every((k, i) => { const n = _nodo(k); return !n || n.style.zIndex === String(i + 1); }));
    if (!zOk) livelli.push('la tela non segue l\'ordine dopo il trascinamento');
    const cima = await p.evaluate(() => document.querySelector('#ovl-livelli .ovl-liv')?.dataset.liv);
    if (cima !== dopo[dopo.length - 1]) livelli.push(`in cima all'elenco c'e' ${cima}, non il primo piano ${dopo[dopo.length - 1]}`);
    await p.focus('#ovl-livelli [data-liv="chat"]');
    await p.keyboard.down('Alt'); await p.keyboard.press('ArrowDown'); await p.keyboard.up('Alt');
    await p.waitForTimeout(200);
    const tasto = await vis();
    if (tasto.indexOf('chat') !== i1 - 1) livelli.push(`Alt+↓ porta la chat a ${tasto.indexOf('chat')} invece che a ${i1 - 1}`);
    await p.evaluate(() => deseleziona());
    await p.keyboard.down('Control'); await p.keyboard.press('z'); await p.keyboard.up('Control');
    await p.keyboard.down('Control'); await p.keyboard.press('z'); await p.keyboard.up('Control');
    await p.waitForTimeout(250);
    const annullato = await vis();
    if (JSON.stringify(annullato) !== JSON.stringify(prima)) livelli.push('due volte Ctrl+Z non riportano l\'ordine di prima');
    const alzato = await p.evaluate(() => {
      const k = _ordineScena().filter((x) => _inOverlay(x))[0];
      seleziona(k);
      const z = _nodo(k).style.zIndex, cs = getComputedStyle(_nodo(k)).zIndex;
      deseleziona();
      return z === String(_ordineScena().indexOf(k) + 1) && cs === z ? '' : `scelto, ${k} passa a ${cs}`;
    });
    if (alzato) livelli.push(alzato);
  }
}

// Le maniglie di un elemento devono essere raggiungibili col mouse. Quella di
// rotazione sporge 78 px SOPRA l'elemento: per chi sta in cima alla tela (un
// obiettivo al 3%) finiva 7 px fuori dal riquadro, tagliata. E per l'alert era
// dentro ma un altro elemento le stava sopra e si prendeva il clic. Ora stanno
// nel riquadro di selezione, sopra a tutti i livelli: si prendono qualunque sia
// l'ordine, e scegliere un elemento non lo porta piu' davanti.
const manigliePerse = await p.evaluate(async () => {
  const fuori = [];
  for (const e of ELEMENTI()) {
    if (!_inOverlay(e.k)) continue;
    seleziona(e.k);
    await new Promise((r) => setTimeout(r, 110));
    const tela = document.getElementById('ovl-preview').getBoundingClientRect();
    for (const h of document.querySelectorAll('#ap-riquadro [data-lato]')) {
      const b = h.getBoundingClientRect();
      if (!b.width) continue;
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const dentro = cx >= tela.left && cx <= tela.right && cy >= tela.top && cy <= tela.bottom;
      const sopra = document.elementFromPoint(cx, cy);
      const suo = sopra === h || (sopra && h.contains(sopra));
      if (!dentro) fuori.push(`${e.k}/${h.dataset.lato}: fuori dalla tela`);
      else if (!suo) fuori.push(`${e.k}/${h.dataset.lato}: il clic lo prende ${sopra ? (sopra.className || sopra.tagName) : 'niente'}`);
    }
  }
  return fuori;
});

// Un overlay e' una SESSIONE DI LAVORO a se': quel che sposti qui non si muove
// negli altri. Prima ov.xy teneva solo i quattro fissi, quindi player, conto
// alla rovescia, obiettivi e contatori avevano una posizione per tutto il
// canale: li spostavi in un overlay e ti seguivano in tutti.
const trapelati = await p.evaluate(async () => {
  if (overlays.length < 2) return ['servono due overlay per provarlo'];
  const chiavi = ELEMENTI().map((e) => e.k);
  const [primo, secondo] = [overlays[0].id, overlays[1].id];
  __scegli(primo);
  await new Promise((r) => setTimeout(r, 350));
  const prima = {};
  for (const k of chiavi) prima[k] = _posDove(k).x;
  __scegli(secondo);
  await new Promise((r) => setTimeout(r, 350));
  const altrove = {};
  for (const k of chiavi) altrove[k] = _posDove(k).x;

  __scegli(primo);
  await new Promise((r) => setTimeout(r, 350));
  for (const k of chiavi) {
    seleziona(k);
    await new Promise((r) => setTimeout(r, 50));
    if (Number(_posDove(k).w) > 23) _scriviProp('w', 23);
    _scriviProp('x', 77);
  }
  await new Promise((r) => setTimeout(r, 250));
  __scegli(secondo);
  await new Promise((r) => setTimeout(r, 450));
  const fuori = [];
  for (const k of chiavi) {
    const ora = _posDove(k).x;
    if (Math.abs(ora - 77) < 0.5 && Math.abs(altrove[k] - 77) >= 0.5) fuori.push(`${k}: spostato nel primo, si è mosso anche nel secondo`);
    else if (Math.abs(ora - altrove[k]) > 0.02) fuori.push(`${k}: nel secondo è passato da ${altrove[k]} a ${ora}`);
  }
  __scegli(primo);
  await new Promise((r) => setTimeout(r, 300));
  for (const k of chiavi) if (Math.abs(_posDove(k).x - 77) > 0.5) fuori.push(`${k}: nel primo non è rimasto dove l'ho messo`);
  void prima;
  return fuori;
});

// E ogni sessione ha il SUO annulla: annullare in un overlay non deve tirare
// indietro quel che hai fatto in un altro.
const storiaMista = await p.evaluate(async () => {
  if (overlays.length < 2) return [];
  const [primo, secondo] = [overlays[0].id, overlays[1].id];
  const fuori = [];
  __scegli(primo);
  await new Promise((r) => setTimeout(r, 350));
  seleziona('musica'); await new Promise((r) => setTimeout(r, 80));
  _scriviProp('x', 11);
  await new Promise((r) => setTimeout(r, 250));
  __scegli(secondo);
  await new Promise((r) => setTimeout(r, 400));
  seleziona('musica'); await new Promise((r) => setTimeout(r, 80));
  const eraNelSecondo = _posDove('musica').x;
  annullaOvl();
  await new Promise((r) => setTimeout(r, 300));
  if (Math.abs(_posDove('musica').x - eraNelSecondo) > 0.02) fuori.push('annullando nel secondo si è mosso il secondo, che non avevo toccato');
  __scegli(primo);
  await new Promise((r) => setTimeout(r, 400));
  if (Math.abs(_posDove('musica').x - 11) > 0.5) fuori.push(`annullando nel secondo si è disfatto il primo (${_posDove('musica').x} invece di 11)`);
  return fuori;
});

// LE MARCE. Misurato: la tela e' 1920 px disegnata larga ~847, quindi UN pixel
// di schermo vale 2,26 px di overlay — col mouse non si poteva essere precisi al
// pixel, mai. E l'aggancio incollava: chiedendo 2, 5 o 9 px di spostamento
// l'elemento andava sempre e solo a 9. Ora Ctrl/Cmd va a un quinto, Maiusc tiene
// dritto su un asse, Alt toglie l'aggancio, e lo zoom arriva a 400%.
const marce = await p.evaluate(async () => {
  const tela = document.getElementById('ovl-preview').getBoundingClientRect();
  const scala = tela.width / OVL_W;
  const el = _nodo('musica');
  const guasti = [];
  const posa = async () => { seleziona('musica'); await new Promise((r) => setTimeout(r, 60)); _scriviProp('x', 37); _scriviProp('y', 63); _scriviProp('s', 100); _scriviProp('r', 0); await new Promise((r) => setTimeout(r, 80)); };
  // Il trascinamento si applica A FOTOGRAMMA: il movimento entra in coda e
  // viene reso al frame dopo, e chi molla il tasto prima annulla la coda. Un
  // dito vero passa sempre dei fotogrammi tra un movimento e l'altro, quindi
  // qui si aspetta un fotogramma come farebbe lui: senza, non si misura il
  // trascinamento, si misura la coda buttata via.
  const fotogramma = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const trascina = async (dx, dy, mod) => {
    const r0 = el.getBoundingClientRect();
    const gx = r0.left + r0.width / 2, gy = r0.top + r0.height / 2;
    const prima = _centroTela('musica');
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: gx, clientY: gy, pointerId: 1 }));
    for (let i = 1; i <= 3; i++) {
      el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: gx + (dx * i) / 3, clientY: gy + (dy * i) / 3, pointerId: 1, ...mod }));
      await fotogramma();
    }
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    await new Promise((r) => setTimeout(r, 80));
    const dopo = _centroTela('musica');
    return { x: (dopo.x - prima.x) * scala, y: (dopo.y - prima.y) * scala };
  };
  const vicino = (a, b2, q) => Math.abs(a - b2) <= q;

  await posa(); const n = await trascina(60, -40, { altKey: true });
  if (!vicino(n.x, 60, 0.5) || !vicino(n.y, -40, 0.5)) guasti.push(`normale: chiesto 60/-40, andato ${n.x.toFixed(1)}/${n.y.toFixed(1)}`);
  await posa(); const f = await trascina(60, -40, { altKey: true, ctrlKey: true });
  if (!vicino(f.x, 12, 0.5) || !vicino(f.y, -8, 0.5)) guasti.push(`marcia fine: chiesto un quinto di 60/-40, andato ${f.x.toFixed(1)}/${f.y.toFixed(1)}`);
  await posa(); const ax = await trascina(60, -12, { altKey: true, shiftKey: true });
  if (!vicino(ax.y, 0, 0.01) || !vicino(ax.x, 60, 0.5)) guasti.push(`asse: doveva restare dritto, andato ${ax.x.toFixed(1)}/${ax.y.toFixed(1)}`);
  await posa(); const ay = await trascina(-12, 60, { altKey: true, shiftKey: true });
  if (!vicino(ay.x, 0, 0.01) || !vicino(ay.y, 60, 0.5)) guasti.push(`asse verticale: andato ${ay.x.toFixed(1)}/${ay.y.toFixed(1)}`);

  // il passo piu' piccolo che si riesce a fare col mouse
  const passo = async (mod) => {
    await posa();
    const r0 = el.getBoundingClientRect();
    const gx = r0.left + r0.width / 2, gy = r0.top + r0.height / 2;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: gx, clientY: gy, pointerId: 1 }));
    const a = _centroTela('musica').x;
    el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: gx + 1, clientY: gy, pointerId: 1, altKey: true, ...mod }));
    await fotogramma();
    const b2 = _centroTela('musica').x;
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    return b2 - a;
  };
  const pf = await passo({ ctrlKey: true });
  if (!(pf < 1)) guasti.push(`in marcia fine un pixel di schermo vale ancora ${pf.toFixed(2)} px di tela`);

  // la rotella nuda non deve toccare niente: scorri la pagina, non ridimensioni
  await posa();
  const sPrima = _posDove('musica').s;
  el.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -120 }));
  await new Promise((r) => setTimeout(r, 80));
  if (_posDove('musica').s !== sPrima) guasti.push('la rotella nuda ridimensiona: scorrere la pagina cambia l’elemento');
  el.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -120, altKey: true }));
  await new Promise((r) => setTimeout(r, 80));
  if (_posDove('musica').s === sPrima) guasti.push('Alt+rotella non ridimensiona');

  _applicaZoom(9);
  if (_zoomOvl < 2.27) guasti.push(`lo zoom arriva solo a ${_zoomOvl}: sotto 2.27 non si vede un pixel di overlay`);
  _applicaZoom(1);
  return guasti;
});

// L'occhio dei Livelli dice «compare in QUESTO overlay»: per i quattro fissi era
// gia' cosi', per obiettivi e contatori toglieva l'elemento da TUTTE le scene.
// Una sessione di lavoro a meta' non e' una sessione.
const occhiTrapelati = await p.evaluate(async () => {
  if (overlays.length < 2) return ['servono due overlay per provarlo'];
  const [primo, secondo] = [overlays[0].id, overlays[1].id];
  const fuori = [];
  const spegnibili = ELEMENTI().filter((e) => e.goal || e.cont).map((e) => e.k);
  __scegli(primo);
  await new Promise((r) => setTimeout(r, 350));
  for (const k of spegnibili) {
    if (!_inOverlay(k)) { fuori.push(`${k}: parte gia' spento, non posso provarlo`); continue; }
    _occhio(k);
    await new Promise((r) => setTimeout(r, 90));
    if (_inOverlay(k)) fuori.push(`${k}: l’occhio non lo toglie da questo overlay`);
  }
  await new Promise((r) => setTimeout(r, 250));
  __scegli(secondo);
  await new Promise((r) => setTimeout(r, 450));
  for (const k of spegnibili) if (!_inOverlay(k)) fuori.push(`${k}: spento nel primo, si è spento anche nel secondo`);
  __scegli(primo);
  await new Promise((r) => setTimeout(r, 450));
  for (const k of spegnibili) {
    if (_inOverlay(k)) fuori.push(`${k}: nel primo è tornato acceso da solo`);
    _occhio(k);
    await new Promise((r) => setTimeout(r, 60));
  }
  return fuori;
});

// «Crea → Un contatore» mandava in un'altra scheda: per un numero da mettere
// sulla tela si perdeva la tela. Qui si misura la strada intera dentro il banco
// — il riquadro si apre, il contatore nasce ed entra nell'overlay aperto; e la
// seconda uscita fa una COPIA dell'overlay, dove il contatore nuovo si vede,
// lasciando quello di tutti i giorni com'era.
const contaNuovo = await p.evaluate(async () => {
  const fuori = [];
  const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
  const schedaOra = () => (document.querySelector('.pannello-scheda.visibile') || {}).id;
  azzeraBarraSalva();
  const apri = async () => {
    document.getElementById('ovl-liv-aggiungi').click();
    await attesa(80);
    const b2 = document.querySelector('#ovl-agg [data-nuovo="cont"]');
    if (!b2) return null;
    b2.click();
    await attesa(120);
    return document.querySelector('.bv-velo.mdl-chiedi');
  };
  const quanti = overlays.length;
  const primo = overlaySel;
  const velo = await apri();
  if (!velo) return ['premendo «Un contatore» non si apre niente'];
  if (schedaOra() !== 'scheda-alert') fuori.push('premendo «Un contatore» si esce dal banco');
  const scrivi = (v2, cmd, eti) => {
    const c = v2.querySelector('#mdl-cont-comando'), e = v2.querySelector('#mdl-cont-etichetta');
    if (!c || !e) return 'il riquadro aperto non è quello del contatore: ' + v2.innerHTML.slice(0, 120);
    c.value = cmd; e.value = eti;
    return '';
  };
  const g1 = scrivi(velo, 'cadute', 'Cadute');
  if (g1) return fuori.concat(g1);
  velo.querySelector('[data-cont="qui"]').click();
  await attesa(900);
  if (document.querySelector('.bv-velo.mdl-chiedi')) fuori.push('il riquadro non si chiude dopo «Crea e mettilo qui»');
  if (!_conta.some((c) => c.comando === 'cadute')) return fuori.concat('il contatore non nasce');
  if (!_inOverlay('cont:cadute')) fuori.push('il contatore appena creato non entra nell’overlay aperto');
  if (!document.getElementById('ap-cont-cadute')) fuori.push('il contatore appena creato non compare sulla tela');
  if (overlays.length !== quanti) fuori.push('creando un contatore è comparso un overlay in più');

  const velo2 = await apri();
  if (!velo2) return fuori.concat('la seconda volta il riquadro non si apre');
  const g2 = scrivi(velo2, 'boss', 'Boss');
  if (g2) return fuori.concat(g2);
  velo2.querySelector('[data-cont="copia"]').click();
  await attesa(1800);
  if (overlays.length !== quanti + 1) return fuori.concat('la copia dell’overlay non è nata');
  if (overlaySel === primo) fuori.push('dopo la copia sto ancora sull’overlay di prima');
  if (!_inOverlay('cont:boss')) fuori.push('nella copia il contatore nuovo non si vede');
  if (!_inOverlay('cont:cadute')) fuori.push('la copia non si è portata dietro la scena di prima');
  const vecchio = overlays.find((o) => o.id === primo);
  if (!vecchio || (vecchio.mostra || {})['cont:boss'] !== false) fuori.push('l’overlay di tutti i giorni si è preso il contatore nuovo lo stesso');
  return fuori;
});

await b.close();
chiudiSito();

const dice = (ok, testo, extra = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`);
  return ok;
};

console.log('\nIl banco di regia sposta le cose dove le porti.\n');
let verde = true;
verde = dice(storti.length === 0,
  `ogni elemento si sposta di quello che chiedi: ${provati} provati${coperti.length ? ` (${coperti.length} coperti da altri: ${coperti.join(', ')})` : ''}`,
  storti.join(' · ')) && verde;
verde = dice(provati >= 6, `elementi davvero provati: ${provati}`, 'la scena della demo ne ha troppo pochi scoperti') && verde;
verde = dice(!!occhio.elementoVia, 'l’occhio toglie davvero l’elemento dalla scena', JSON.stringify(occhio)) && verde;
verde = dice(!!occhio.cambiata, 'e si vede: la riga lascia i livelli e passa tra quelli da rimettere', JSON.stringify(occhio)) && verde;
verde = dice(!!occhio.tornato, 'e da lì si rimette dov’era', JSON.stringify(occhio)) && verde;
verde = dice(incoerenti.length === 0, `scegliendo un elemento si vedono solo i suoi comandi: ${chiavi.length} elementi`, incoerenti.join(' · ')) && verde;
verde = dice(telaFerma, 'la tela non cambia misura scegliendo o lasciando un elemento', JSON.stringify(misureTela)) && verde;
verde = dice(bordoGiusto, `a tutto schermo il menu compare dal bordo dopo una sosta, disegnato, e uscendo si disfa prima di sparire`, JSON.stringify(bordo)) && verde;
verde = dice(schermoGiusto, `il menu sta di lato finché non premi «Tutto schermo», e ripremendo torna (${schermo.prima} → ${schermo.premuto} → ${schermo.ripremuto} px)`, JSON.stringify(schermo)) && verde;
verde = dice(schermoDisegnato, `entrando il menu si disfa prima di lasciare il lato (${schermo.entra.disfa} → ${schermo.entra.cambia} ms), uscendo si ridisegna`, JSON.stringify(schermo)) && verde;
verde = dice(schermoNavigato, `cambiando scheda fa lo stesso: verso una scheda stretta il menu aperto si ridisegna di lato (${schermo.aStretta.ridisegna} ms), tornando si disfa prima di sparire (${schermo.aLarga.disfa} → ${schermo.aLarga.cambia} ms)`, JSON.stringify({ aStretta: schermo.aStretta, aLarga: schermo.aLarga })) && verde;
verde = dice(spazioStorto.length === 0, `a tutto schermo la larghezza è della tela: a ${spazi.map((s) => s.schermo + ' ' + s.tela[0] + ' px').join(', ')}`, JSON.stringify(spazioStorto)) && verde;
verde = dice(dopoScelta.visti === 0 && dopoScelta.sel === 0 && dopoScelta.chiuso,
  'e lasciandolo non resta niente acceso', JSON.stringify(dopoScelta)) && verde;
verde = dice(rimasti === 0, 'nessun comando dimenticato sotto la tela', `${rimasti} campi rimasti giù`) && verde;
verde = dice(morti.length === 0, `ogni comando arriva alla tela: ${PROVE.length} provati`, morti.join(' · ')) && verde;
verde = dice(doppioni.length === 0, 'una proprietà ha un valore solo: cursore e casella dicono lo stesso', doppioni.join(' · ')) && verde;
verde = dice(scordati.length === 0, 'l’annulla riporta indietro qualunque elemento', scordati.join(' · ')) && verde;
verde = dice(discordi.length === 0, 'livelli, proprietà e piede dicono lo stesso posto', discordi.join(' · ')) && verde;
verde = dice(manigliePerse.length === 0, 'ogni maniglia è dentro la tela e prende il clic', manigliePerse.join(' · ')) && verde;
verde = dice(livelli.length === 0, 'i livelli si riordinano trascinando la riga, da tastiera e con l\'annulla, e scegliere un elemento non lo porta davanti', livelli.join(' · ')) && verde;
verde = dice(trapelati.length === 0, 'ogni overlay ha il suo layout: spostare qui non muove gli altri', trapelati.join(' · ')) && verde;
verde = dice(storiaMista.length === 0, 'e il suo annulla, che non scavalca gli altri overlay', storiaMista.join(' · ')) && verde;
verde = dice(marce.length === 0, 'le marce del trascinamento: fine, dritto, niente aggancio, rotella sicura', marce.join(' · ')) && verde;
verde = dice(occhiTrapelati.length === 0, 'l’occhio toglie l’elemento da questo overlay, non da tutti', occhiTrapelati.join(' · ')) && verde;
verde = dice(contaNuovo.length === 0, 'un contatore nuovo si fa dal banco, e la copia dell’overlay non tocca l’originale', contaNuovo.join(' · ')) && verde;
verde = dice(rotture.length === 0, 'nessun errore di pagina', rotture.join(' · ')) && verde;

console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
