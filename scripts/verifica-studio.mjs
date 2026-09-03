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

import http from 'node:http';
import fs from 'node:fs';
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

const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{}'); }
  const f = path.join(PUB, p === '/' ? 'index.html' : p);
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(PUB, 'index.html')));
  }
  res.writeHead(200, { 'content-type': TIPI[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const PORTA = srv.address().port;

const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const rotture = [];
p.on('pageerror', (e) => rotture.push('errore di pagina: ' + e.message));
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('alert'); });
await p.waitForFunction(() => (document.querySelector('.pannello-scheda.visibile') || {}).id === 'scheda-alert', null, { timeout: 20000 });
await p.waitForFunction(() => document.querySelectorAll('#ap-stage .ap-el').length > 4, null, { timeout: 20000 });
await p.waitForTimeout(700);
await p.evaluate(() => document.querySelector('.giro-velo')?.remove());

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
      atteso: _nomeEl(kk), idAtteso: _idEl(kk), inOverlay: _inOverlay(kk), chiuso: insp.hidden,
    };
  }, k);
  const g = [];
  if (r.visti.length !== 1 || r.visti[0] !== k) g.push(`comandi visibili [${r.visti}]`);
  if (r.inOverlay && (r.sel.length !== 1 || r.sel[0] !== r.idAtteso)) g.push(`sulla tela [${r.sel}]`);
  if (r.liv.length !== 1 || r.liv[0] !== k) g.push(`livelli [${r.liv}]`);
  if (r.nome !== r.atteso) g.push(`titolo «${r.nome}»`);
  if (r.chiuso) g.push('pannello chiuso');
  if (g.length) incoerenti.push(k + ': ' + g.join(', '));
}
const dopoScelta = await p.evaluate(() => {
  deseleziona();
  const insp = document.getElementById('ovl-inspector');
  return { visti: [...insp.querySelectorAll('.asp-blocco')].filter((b) => b.offsetParent !== null || b.getClientRects().length).length,
    sel: document.querySelectorAll('#ap-stage .ap-el.sel').length, chiuso: insp.hidden };
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
// che l'ha fatto. Prima l'elemento spariva ma l'occhio restava aperto.
const occhio = await p.evaluate(async () => {
  const riga = document.querySelector('.ovl-liv[data-liv="alert"]');
  const occ = riga && riga.querySelector('[data-occhio]');
  if (!occ) return { errore: 'nessun occhio' };
  const prima = riga.className + '|' + occ.innerHTML.length;
  occ.click();
  await new Promise((r) => setTimeout(r, 150));
  const riga2 = document.querySelector('.ovl-liv[data-liv="alert"]');
  const occ2 = riga2 && riga2.querySelector('[data-occhio]');
  const dopo = riga2.className + '|' + occ2.innerHTML.length;
  const nodo = document.getElementById('ap-alert');
  return { cambiata: prima !== dopo, elementoVia: nodo.style.display === 'none', prima, dopo };
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

// Le maniglie di un elemento devono essere raggiungibili col mouse. Quella di
// rotazione sporge 78 px SOPRA l'elemento: per chi sta in cima alla tela (un
// obiettivo al 3%) finiva 7 px fuori dal riquadro, tagliata. E per l'alert era
// dentro ma un altro elemento le stava sopra e si prendeva il clic.
const manigliePerse = await p.evaluate(async () => {
  const fuori = [];
  for (const e of ELEMENTI()) {
    if (!_inOverlay(e.k)) continue;
    seleziona(e.k);
    await new Promise((r) => setTimeout(r, 110));
    const n = _nodo(e.k);
    const tela = document.getElementById('ovl-preview').getBoundingClientRect();
    for (const h of n.querySelectorAll('.ap-handle')) {
      const b = h.getBoundingClientRect();
      if (!b.width) continue;
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const dentro = cx >= tela.left && cx <= tela.right && cy >= tela.top && cy <= tela.bottom;
      const sopra = document.elementFromPoint(cx, cy);
      const suo = sopra === h || (sopra && h.contains(sopra));
      if (!dentro) fuori.push(`${e.k}/${h.className.replace('ap-handle ', '')}: fuori dalla tela`);
      else if (!suo) fuori.push(`${e.k}/${h.className.replace('ap-handle ', '')}: il clic lo prende ${sopra ? (sopra.className || sopra.tagName) : 'niente'}`);
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
  scegliOverlay(primo);
  await new Promise((r) => setTimeout(r, 350));
  const prima = {};
  for (const k of chiavi) prima[k] = _posDove(k).x;
  scegliOverlay(secondo);
  await new Promise((r) => setTimeout(r, 350));
  const altrove = {};
  for (const k of chiavi) altrove[k] = _posDove(k).x;

  scegliOverlay(primo);
  await new Promise((r) => setTimeout(r, 350));
  for (const k of chiavi) { seleziona(k); await new Promise((r) => setTimeout(r, 50)); _scriviProp('x', 77); }
  await new Promise((r) => setTimeout(r, 250));
  scegliOverlay(secondo);
  await new Promise((r) => setTimeout(r, 450));
  const fuori = [];
  for (const k of chiavi) {
    const ora = _posDove(k).x;
    if (Math.abs(ora - 77) < 0.5 && Math.abs(altrove[k] - 77) >= 0.5) fuori.push(`${k}: spostato nel primo, si è mosso anche nel secondo`);
    else if (Math.abs(ora - altrove[k]) > 0.02) fuori.push(`${k}: nel secondo è passato da ${altrove[k]} a ${ora}`);
  }
  scegliOverlay(primo);
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
  scegliOverlay(primo);
  await new Promise((r) => setTimeout(r, 350));
  seleziona('musica'); await new Promise((r) => setTimeout(r, 80));
  _scriviProp('x', 11);
  await new Promise((r) => setTimeout(r, 250));
  scegliOverlay(secondo);
  await new Promise((r) => setTimeout(r, 400));
  seleziona('musica'); await new Promise((r) => setTimeout(r, 80));
  const eraNelSecondo = _posDove('musica').x;
  annullaOvl();
  await new Promise((r) => setTimeout(r, 300));
  if (Math.abs(_posDove('musica').x - eraNelSecondo) > 0.02) fuori.push('annullando nel secondo si è mosso il secondo, che non avevo toccato');
  scegliOverlay(primo);
  await new Promise((r) => setTimeout(r, 400));
  if (Math.abs(_posDove('musica').x - 11) > 0.5) fuori.push(`annullando nel secondo si è disfatto il primo (${_posDove('musica').x} invece di 11)`);
  return fuori;
});

await b.close();
srv.close();

const dice = (ok, testo, extra = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`);
  return ok;
};

console.log('\nIl banco di regia sposta le cose dove le porti.\n');
let verde = true;
verde = dice(storti.length === 0,
  `ogni elemento si sposta di quello che chiedi: ${provati} provati${coperti.length ? ` (${coperti.length} coperti da altri)` : ''}`,
  storti.join(' · ')) && verde;
verde = dice(provati >= 6, `elementi davvero provati: ${provati}`, 'la scena della demo ne ha troppo pochi scoperti') && verde;
verde = dice(!!occhio.elementoVia, 'l’occhio toglie davvero l’elemento dalla scena', JSON.stringify(occhio)) && verde;
verde = dice(!!occhio.cambiata, 'e l’occhio si vede che è chiuso', JSON.stringify(occhio)) && verde;
verde = dice(incoerenti.length === 0, `scegliendo un elemento si vedono solo i suoi comandi: ${chiavi.length} elementi`, incoerenti.join(' · ')) && verde;
verde = dice(dopoScelta.visti === 0 && dopoScelta.sel === 0 && dopoScelta.chiuso,
  'e lasciandolo non resta niente acceso', JSON.stringify(dopoScelta)) && verde;
verde = dice(rimasti === 0, 'nessun comando dimenticato sotto la tela', `${rimasti} campi rimasti giù`) && verde;
verde = dice(morti.length === 0, `ogni comando arriva alla tela: ${PROVE.length} provati`, morti.join(' · ')) && verde;
verde = dice(doppioni.length === 0, 'una proprietà ha un valore solo: cursore e casella dicono lo stesso', doppioni.join(' · ')) && verde;
verde = dice(scordati.length === 0, 'l’annulla riporta indietro qualunque elemento', scordati.join(' · ')) && verde;
verde = dice(discordi.length === 0, 'livelli, proprietà e piede dicono lo stesso posto', discordi.join(' · ')) && verde;
verde = dice(manigliePerse.length === 0, 'ogni maniglia è dentro la tela e prende il clic', manigliePerse.join(' · ')) && verde;
verde = dice(trapelati.length === 0, 'ogni overlay ha il suo layout: spostare qui non muove gli altri', trapelati.join(' · ')) && verde;
verde = dice(storiaMista.length === 0, 'e il suo annulla, che non scavalca gli altri overlay', storiaMista.join(' · ')) && verde;
verde = dice(rotture.length === 0, 'nessun errore di pagina', rotture.join(' · ')) && verde;

console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
