// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Collaudo dello STUDIO DELLA DIRETTA (scheda «Studio Web»), in un browser vero,
// sulla demo con lo Studio acceso (?demo=1&studio=1). Sta nella catena di
// `npm run cancelli`, col suo --selftest; senza Chromium si salta da solo.
//
// Lo Studio e' fatto come OBS: scene, fonti, mixer, transizioni e controlli in
// pannelli; la modalita' studio con anteprima e programma; due formati (16:9 e
// 9:16) con una posizione per formato; le scene che si salvano da sole; i file
// che restano sul dispositivo e, dove mancano, un segnaposto. Qui ogni promessa
// si MISURA: si contano i pixel delle tele, si leggono le posizioni salvate, si
// apre IndexedDB vero.
//
// Uso: node scripts/verifica-studio-diretta.mjs             (esce 1 se una promessa non tiene)
//      node scripts/verifica-studio-diretta.mjs --selftest  (rimette quattro difetti, uno per
//                                                            promessa, e li vuole rossi tutti)

import './_dati-usa-e-getta.mjs';
import { apriSito, chromiumQui, PUB } from './_sito.mjs';
import fs from 'node:fs';
import path from 'node:path';

const CHROMIUM = chromiumQui();
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
let chromium;
if (!CHROMIUM) { console.log('Chromium non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

// L'AUTOPROVA: quattro difetti, ognuno tocca una promessa sola.
//  · la transizione finisce ma il programma resta sulla scena di prima;
//  · ogni formato scrive nella posizione dell'orizzontale (una posizione sola);
//  · le modifiche non si salvano piu' da sole;
//  · sul telefono la regola che sfoltisce i pannelli spegne anche Proprieta' e Chat.
const SELFTEST = process.argv.includes('--selftest');
const DIFETTI = {
  '/app.js': [
    ['  d.inOnda = t.a;\n', '  void t.a;\n', 'la transizione cambia il programma'],
    ['const studioPos = (f) => f.pos[STUDIO.lavoro];', 'const studioPos = (f) => f.pos.o;', 'ogni formato ha la sua posizione'],
    ['  STUDIO.salvo.timer = setTimeout(() => { STUDIO.salvo.timer = 0; studioSalva(); }, 1500);', '  STUDIO.salvo.timer = 0;', 'le scene si salvano da sole'],
  ],
  '/style.css': [
    ['.studio-mobile #studio-docks > .studio-dock:not(.studio-controlli)', '.studio-mobile .studio-docks > .studio-dock:not(.studio-controlli)', 'sul telefono Proprieta\' e Chat restano'],
  ],
};
const serviti = new Map();
if (SELFTEST) {
  for (const [via, lista] of Object.entries(DIFETTI)) {
    let t = fs.readFileSync(path.join(PUB, via.slice(1)), 'utf8');
    for (const [da, a] of lista) {
      if (t.split(da).length !== 2) { console.log(`Autoprova: il difetto «${da.slice(0, 60)}» non si trova una volta sola in ${via}.`); process.exit(1); }
      t = t.replace(da, a);
    }
    serviti.set(via, t);
  }
}

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const esiti = [];
const ok = (cosa, vero, dettaglio = '') => { esiti.push({ cosa, vero: !!vero }); console.log(`  ${vero ? '✓' : '✗'} ${cosa}${!vero && dettaglio ? ' (' + dettaglio + ')' : ''}`); };

async function apri({ width, height, telefono }) {
  const p = await b.newPage({ viewport: { width, height }, isMobile: telefono, hasTouch: telefono, serviceWorkers: 'block' });
  const err = [];
  p.on('pageerror', (e) => err.push(e.message));
  if (serviti.size) {
    await p.route((u) => u.host === `127.0.0.1:${PORTA}` && serviti.has(u.pathname), async (route) => {
      const r = await route.fetch();
      await route.fulfill({ response: r, body: serviti.get(new URL(route.request().url()).pathname) });
    });
  }
  await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); } catch {} });
  await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&studio=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('studio'); });
  await p.waitForFunction(() => typeof STUDIO !== 'undefined' && !!STUDIO.doc && !!STUDIO.tele.o, null, { timeout: 20000 });
  await p.waitForTimeout(400);
  return { p, err };
}

// I pixel che non sono il fondo della tela (#0b0b0f): quanto c'e' disegnato sopra.
const disegnati = (p, quale) => p.evaluate((q) => {
  const c = q === 'ante' ? STUDIO.ante : STUDIO.tele[q];
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 16) if (Math.abs(d[i] - 11) + Math.abs(d[i + 1] - 11) + Math.abs(d[i + 2] - 15) > 30) n++;
  return n;
}, quale);
const clic = (p, sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
const fotogrammi = (p) => p.waitForTimeout(180);

// ---------------------------------------------------------------- computer
console.log('Studio della diretta sul computer (1280×900):');
{
  const { p, err } = await apri({ width: 1280, height: 900, telefono: false });
  const g = await p.evaluate(() => ({
    pannelli: [...document.querySelectorAll('#studio-docks > .studio-dock')].filter((d) => d.getBoundingClientRect().width > 150).length,
    largo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    barra: document.getElementById('studio-mobile-barra').children.length,
    prog: document.querySelectorAll('#studio-palco-prog canvas').length,
    antVisibile: !document.getElementById('studio-box-ant').hidden,
  }));
  ok('i cinque pannelli di OBS ci sono tutti (scene, fonti, mixer, transizioni, controlli)', g.pannelli === 5, `${g.pannelli} visibili`);
  ok('la pagina non scorre di lato', g.largo <= 0, `${g.largo}px`);
  ok('sul computer niente barra del telefono', g.barra === 0);
  ok('senza modalita\' studio c\'e\' solo il programma', g.prog === 1 && !g.antVisibile);

  // Modalita' studio: si compone in anteprima, il programma non cambia.
  await clic(p, '#studio-modalita');
  await clic(p, '[data-scena-azione="nuova"]');
  await clic(p, '#studio-docks [data-add="testo"]');
  await fotogrammi(p);
  const m = await p.evaluate(() => ({ due: !document.getElementById('studio-box-ant').hidden && document.getElementById('studio-tele').classList.contains('doppio'),
    ant: STUDIO.doc.anteprima, onda: STUDIO.doc.inOnda, scene: STUDIO.doc.scene.length, inAnt: !!STUDIO.ui.closest('#studio-palco-ant') }));
  ok('la modalita\' studio mostra anteprima e programma affiancati', m.due);
  ok('la scena nuova va in anteprima, non in onda', m.scene === 2 && m.ant !== m.onda);
  ok('si modifica l\'anteprima, non il programma', m.inAnt);
  const ant1 = await disegnati(p, 'ante'), prog1 = await disegnati(p, 'o');
  ok('il testo aggiunto si vede in anteprima e non va in onda', ant1 > 50 && prog1 === 0, `anteprima ${ant1}, programma ${prog1}`);

  // Il taglio manda in onda subito; la dissolvenza passa da tutte e due.
  await p.selectOption('#studio-trans-tipo', 'taglio');
  await clic(p, '#studio-transizione');
  await fotogrammi(p);
  const t = await p.evaluate(() => ({ onda: STUDIO.doc.inOnda, ant: STUDIO.doc.anteprima }));
  const prog2 = await disegnati(p, 'o');
  ok('la transizione manda in onda l\'anteprima', t.onda === m.ant && prog2 > 50, `in onda ${t.onda}, pixel ${prog2}`);
  ok('come in OBS, l\'anteprima prende la scena che era in onda', t.ant === m.onda);
  await p.selectOption('#studio-trans-tipo', 'dissolvenza');
  await p.fill('#studio-trans-ms', '1200');
  await clic(p, '#studio-transizione');
  await p.waitForTimeout(450);
  const meta = await p.evaluate(() => ({ corre: !!STUDIO.trans, onda: STUDIO.doc.inOnda }));
  const prog3 = await disegnati(p, 'o');
  await p.waitForTimeout(1100);
  const fine = await p.evaluate(() => ({ corre: !!STUDIO.trans, onda: STUDIO.doc.inOnda }));
  ok('a meta\' dissolvenza le due scene si mescolano', meta.corre && prog3 > 0 && prog3 < prog2, `${prog3} su ${prog2}`);
  ok('a dissolvenza finita l\'anteprima e\' in onda', !fine.corre && fine.onda === m.onda);

  // Due formati: ogni fonte ha una posizione per formato.
  await clic(p, '#studio-impostazioni-apri');
  await p.evaluate(() => { const c = document.querySelector('#studio-impostazioni [data-formato="v"]'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  await fotogrammi(p);
  const v = await p.evaluate(() => ({ tv: [STUDIO.tele.v.width, STUDIO.tele.v.height], chip: document.querySelectorAll('#studio-lavoro [data-lavoro]').length }));
  ok('col verticale acceso c\'e\' la tela 9:16 e si sceglie su quale lavorare', v.tv[1] > v.tv[0] && v.chip === 2, `${v.tv}`);
  await clic(p, '[data-lavoro="v"]');
  await p.evaluate(() => { const s = studioSceneAttiva(); if (!s.fonti.length) studioAddFonte('testo'); STUDIO.sel = s.fonti[0].id; renderStudioTutto(); });
  const prima = await p.evaluate(() => { const f = studioTrovaFonte(STUDIO.sel); return { o: { ...f.pos.o }, v: { ...f.pos.v } }; });
  await p.evaluate(() => STUDIO.ui.parentElement.focus());
  for (let i = 0; i < 3; i++) await p.keyboard.press('Shift+ArrowRight');
  const dopo = await p.evaluate(() => { const f = studioTrovaFonte(STUDIO.sel); return { o: { ...f.pos.o }, v: { ...f.pos.v }, alto: STUDIO.ui.parentElement.getBoundingClientRect() }; });
  ok('spostare in verticale non sposta l\'orizzontale', dopo.v.x === prima.v.x + 30 && dopo.o.x === prima.o.x, `v ${prima.v.x}→${dopo.v.x}, o ${prima.o.x}→${dopo.o.x}`);
  ok('in verticale la tela e\' piu\' alta che larga', dopo.alto.height > dopo.alto.width);

  // Il salvataggio da solo, e la rilettura.
  await p.waitForTimeout(2300);
  const s = await p.evaluate(() => ({ ver: _demoScritture.studioVer || 0, doc: _demoScritture.studioScene, scritta: document.getElementById('studio-salvato').textContent }));
  ok('le scene si salvano da sole, senza tasti', s.ver >= 1 && s.doc?.scene?.length === 2 && s.doc?.scelte?.formati?.v === true, `versione ${s.ver}`);
  ok('e lo dice', /Salvato/.test(s.scritta), s.scritta);
  const riletto = await p.evaluate(async () => { const id = STUDIO.doc.inOnda; STUDIO.doc = null; await studioCaricaScene(); renderStudioTutto(); return STUDIO.doc.scene.length === 2 && STUDIO.doc.inOnda === id; });
  ok('riaprendo, le scene tornano come erano', riletto);

  // Un file che non e' su questo dispositivo: segnaposto nella pagina, mai sulla tela.
  await p.evaluate(async () => {
    const d = STUDIO.M.normalizza(JSON.parse(JSON.stringify(STUDIO.doc)));
    const s = d.scene.find((x) => x.id === d.inOnda);
    s.fonti = [STUDIO.M.nuovaFonte('immagine', { nome: 'logo.png', media: { impronta: 'a'.repeat(64), nome: 'logo.png', mime: 'image/png', byte: 1234, w: 64, h: 64 } })];
    d.scelte.modalitaStudio = false;
    STUDIO.doc = d; STUDIO.sel = null; renderStudioTutto();
  });
  await fotogrammi(p);
  const seg = await p.evaluate(() => ({ dom: document.querySelectorAll('#studio-palco-prog .studio-manca [data-ricollega]').length, lista: document.querySelectorAll('#studio-fonti .studio-fonte.manca').length }));
  const sulla = await disegnati(p, 'o');
  ok('il file mancante ha il suo segnaposto, col tasto per ricaricarlo', seg.dom === 1 && seg.lista === 1);
  ok('il segnaposto non va in onda: la tela resta pulita', sulla === 0, `${sulla} pixel`);

  // Si ricarica il file: torna, e da li' resta su questo dispositivo.
  const png = await p.evaluate(async () => { const c = new OffscreenCanvas(64, 64), x = c.getContext('2d'); x.fillStyle = '#e02020'; x.fillRect(0, 0, 64, 64); const bl = await c.convertToBlob({ type: 'image/png' }); return [...new Uint8Array(await bl.arrayBuffer())]; });
  await clic(p, '#studio-palco-prog [data-ricollega]');
  await p.setInputFiles('#studio-file', { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png) });
  await p.waitForFunction(() => !document.querySelector('#studio-palco-prog .studio-manca'), null, { timeout: 8000 }).catch(() => {});
  await fotogrammi(p);
  const tornato = await p.evaluate(async () => {
    const f = STUDIO.doc.scene.find((x) => x.id === STUDIO.doc.inOnda).fonti[0];
    const blob = await STUDIO.MD.prendi(f.media.impronta, { chi: studioChi() });
    return { imp: f.media.impronta, conservato: !!blob && blob.size > 0, giusta: blob ? (await STUDIO.MD.impronta(blob)) === f.media.impronta : false };
  });
  const rossi = await disegnati(p, 'o');
  ok('ricaricato il file, il segnaposto se ne va e l\'immagine va in onda', rossi > 50, `${rossi} pixel`);
  ok('il file resta su questo dispositivo (IndexedDB) col suo segno', tornato.conservato && tornato.giusta && /^[0-9a-f]{64}$/.test(tornato.imp));
  const tolti = await p.evaluate(async () => { const n = await STUDIO.MD.togliTranne(new Set(), { chi: studioChi() }); const resta = await STUDIO.MD.elenco({ chi: studioChi() }); return { n, resta: resta.length }; });
  ok('i file che nessuna scena usa piu\' si tolgono', tolti.n >= 1 && tolti.resta === 0);

  ok('nessun errore di pagina sul computer', err.length === 0, err.join(' | '));
  await p.close();
}

// ---------------------------------------------------------------- telefono
console.log('Studio della diretta sul telefono (420×860):');
{
  const { p, err } = await apri({ width: 420, height: 860, telefono: true });
  const g = await p.evaluate(() => ({
    righe: document.querySelectorAll('#studio-mobile-barra .studio-mriga').length,
    visibili: [...document.querySelectorAll('#studio-docks > .studio-dock')].filter((d) => getComputedStyle(d).display !== 'none').map((d) => d.querySelector('h3').id),
    largo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    formati: STUDIO.doc.scelte.formati, f: document.getElementById('studio-palco-prog').dataset.f,
    modalita: document.getElementById('studio-modalita').hidden,
  }));
  ok('la barra del telefono ha formato, tasti rapidi e scene', g.righe === 3);
  ok('sul telefono restano solo controlli e fonti', g.visibili.join() === 'studio-t-fonti,studio-t-ctrl', g.visibili.join());
  ok('sul telefono si parte in verticale', g.formati.v && !g.formati.o && g.f === 'v');
  ok('la modalita\' studio sul telefono non c\'e\'', g.modalita);
  ok('la pagina non scorre di lato', g.largo <= 0, `${g.largo}px`);
  await clic(p, '[data-mfmt="ov"]');
  await clic(p, '#studio-mobile-barra [data-add="testo"]');
  await fotogrammi(p);
  const ov = await p.evaluate(() => ({ formati: STUDIO.doc.scelte.formati, lavoro: STUDIO.lavoro, sel: !!STUDIO.sel }));
  ok('«Tutti e due» accende orizzontale e verticale insieme, e si lavora in verticale', ov.formati.o && ov.formati.v && ov.lavoro === 'v');
  const pv = await disegnati(p, 'v'), po = await disegnati(p, 'o');
  ok('il testo va in onda in tutti e due i formati', pv > 50 && po > 50, `v ${pv}, o ${po}`);
  const prop = await p.evaluate(() => { const el = document.getElementById('studio-prop-box'); return !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 40; });
  ok('scelta una fonte, le sue proprieta\' si vedono anche sul telefono', ov.sel && prop);
  const largo2 = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('anche coi due formati la pagina non scorre di lato', largo2 <= 0, `${largo2}px`);
  ok('nessun errore di pagina sul telefono', err.length === 0, err.join(' | '));
  await p.close();
}

await b.close();
await chiudiSito();

const rossi = esiti.filter((e) => !e.vero);
if (SELFTEST) {
  const attesi = Object.values(DIFETTI).flat().map((d) => d[2]);
  const presi = {
    'la transizione cambia il programma': rossi.some((r) => /transizione manda in onda|dissolvenza finita/.test(r.cosa)),
    'ogni formato ha la sua posizione': rossi.some((r) => /non sposta l'orizzontale/.test(r.cosa)),
    'le scene si salvano da sole': rossi.some((r) => /si salvano da sole/.test(r.cosa)),
    'sul telefono Proprieta\' e Chat restano': rossi.some((r) => /proprieta' si vedono anche sul telefono/.test(r.cosa)),
  };
  const sfuggiti = attesi.filter((a) => !presi[a]);
  if (sfuggiti.length) { console.log(`\nAutoprova ROSSA: non si accorge di ${sfuggiti.join('; ')}.`); process.exit(1); }
  console.log(`\nAutoprova: tutti e ${attesi.length} i difetti rimessi sono stati visti. ✓`);
  process.exit(0);
}
if (rossi.length) { console.log(`\nLo Studio della diretta non mantiene ${rossi.length} promess${rossi.length === 1 ? 'a' : 'e'}.`); process.exit(1); }
console.log('\nLo Studio della diretta mantiene le sue promesse. ✓');
