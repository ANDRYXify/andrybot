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
//  · sul telefono la regola che sfoltisce i pannelli spegne anche Proprieta' e Chat;
// e per la regia da telefono, una per regola del piano (docs/DIRETTA.md):
//  · un tocco solo chiude la diretta;
//  · il clic che segue la pressione lunga fa ripartire il conto alla rovescia;
//  · scorrere il dito non cambia scena;
//  · i tasti della barra scendono sotto i 48 punti;
//  · il tasto «indietro» chiude la regia anche in diretta;
//  · la regia resta dentro la scheda, dove un antenato animato la rinchiude.
const SELFTEST = process.argv.includes('--selftest');
// Difetti che si coprono a vicenda non si rimettono insieme («un tocco chiude»
// spegnerebbe la diretta prima di poter misurare il rilascio): ogni gruppo e'
// un giro a parte del collaudo, con --rompi=N.
const ROMPI = Number((process.argv.find((a) => a.startsWith('--rompi=')) || '').split('=')[1]) || 0;
const DIFETTI = {
  '/app.js': [
    ['  d.inOnda = t.a;\n', '  void t.a;\n', 'la transizione cambia il programma', 1, /transizione manda in onda|dissolvenza finita/],
    ['const studioPos = (f) => f.pos[STUDIO.lavoro];', 'const studioPos = (f) => f.pos.o;', 'ogni formato ha la sua posizione', 1, /non sposta l'orizzontale/],
    ['  STUDIO.salvo.timer = setTimeout(() => { STUDIO.salvo.timer = 0; studioSalva(); }, 1500);', '  STUDIO.salvo.timer = 0;', 'le scene si salvano da sole', 1, /si salvano da sole/],
    ['  if (STUDIO.live) { studioTelAvviso(', '  if (STUDIO.live) { fermaLive(); return; studioTelAvviso(', 'un tocco non chiude la diretta', 2, /un tocco non chiude/],
    ['  if (T.ignoraClic) { T.ignoraClic = false; return; }\n', '', 'rilasciato il tasto, non riparte', 1, /clic del rilascio/],
    ['  if (Math.abs(dx) > 60 && Math.abs(dy)', '  if (Math.abs(dx) > 6000 && Math.abs(dy)', 'scorrendo si cambia scena', 1, /scorrendo il dito/],
    ['  if (STUDIO.live || T.conto != null) { history.pushState', '  if (false) { history.pushState', 'indietro non chiude la diretta', 1, /in diretta «indietro»/],
    ['    document.body.appendChild(nuovo); el = nuovo;', '    el = nuovo;', 'la regia copre lo schermo', 3, /a tutto schermo e sopra a tutto/],
  ],
  '/style.css': [
    ['.studio-mobile #studio-docks > .studio-dock:not(.studio-controlli)', '.studio-mobile .studio-docks > .studio-dock:not(.studio-controlli)', 'sul telefono Proprieta\' e Chat restano', 1, /proprieta' si vedono anche sul telefono/],
    ['min-width: 48px; min-height: 60px; padding: 4px;', 'min-width: 30px; min-height: 30px; padding: 0;', 'i tasti sono da pollice', 1, /il pollice arriva a tutto/],
  ],
};
const GRUPPI = [...new Set(Object.values(DIFETTI).flat().map((d) => d[3]))].sort();
if (SELFTEST) {
  const { spawnSync } = await import('node:child_process');
  const sfuggiti = [];
  for (const g of GRUPPI) {
    const giro = spawnSync(process.execPath, [process.argv[1], `--rompi=${g}`], { encoding: 'utf8', env: process.env, timeout: 600000 });
    const rossi = (giro.stdout || '').split('\n').filter((l) => l.trim().startsWith('✗')).map((l) => l.trim());
    for (const [, , nome, gg, re] of Object.values(DIFETTI).flat()) if (gg === g && !rossi.some((l) => re.test(l))) sfuggiti.push(nome);
    console.log(`Giro ${g}: ${rossi.length} promesse rosse.`);
  }
  if (sfuggiti.length) { console.log(`\nAutoprova ROSSA: non si accorge di ${sfuggiti.join('; ')}.`); process.exit(1); }
  console.log(`\nAutoprova: tutti e ${Object.values(DIFETTI).flat().length} i difetti rimessi sono stati visti, in ${GRUPPI.length} giri. ✓`);
  process.exit(0);
}
const serviti = new Map();
if (ROMPI) {
  for (const [via, lista] of Object.entries(DIFETTI)) {
    let t = fs.readFileSync(path.join(PUB, via.slice(1)), 'utf8');
    for (const [da, a, , g] of lista) {
      if (g !== ROMPI) continue;
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
  // 'telefono' e' un dispositivo a tocco: Playwright gli da' il puntatore grossolano
  // e lo schermo piccolo, che e' quello che la regia guarda per aprirsi.
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
const clic = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const fotogrammi = (p) => p.waitForTimeout(180);
const TENUTA = 1750;
// Riporta la regia aperta e senza pannelli: un difetto di prima non deve
// trascinare con se' le misure dopo.
const assicura = (p) => p.evaluate(() => { if (!STUDIO.tel.aperta) studioTelApri(); STUDIO.tel.foglio = ''; STUDIO.tel.conto = null; renderStudioTel(); });

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


// ---------------------------------------------------------------- regia da telefono
console.log('Regia da telefono (390×844, a tocco):');
{
  const { p, err } = await apri({ width: 390, height: 844, telefono: true });
  await p.waitForFunction(() => STUDIO.tel?.aperta, null, { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(700);
  const a = await p.evaluate(() => {
    const el = document.getElementById('studio-tel'), r = el.getBoundingClientRect();
    return { aperta: !!STUDIO.tel?.aperta && !el.hidden, nelBody: el.parentElement === document.body, r: [r.x, r.y, r.width, r.height], foglio: STUDIO.tel.foglio, sopra: document.elementFromPoint(195, 400)?.closest('#studio-tel') === el };
  });
  ok('sul telefono la regia si apre da sola, a tutto schermo e sopra a tutto', a.aperta && a.nelBody && a.sopra && a.r.join() === '0,0,390,844', JSON.stringify(a));
  ok('la prima volta chiede cosa fai', a.foglio === 'prepara');

  const sceneIniziali = await p.evaluate(() => STUDIO.doc.scene.length);
  await clic(p, '[data-tel-scenario="gioco"]');
  const g = await p.evaluate(() => ({ foglio: STUDIO.tel.foglio, scene: STUDIO.doc.scene.length, sc: STUDIO.doc.scelte.telefono.scenario, testo: document.getElementById('tel-foglio').textContent }));
  ok('«Gioco sul telefono» dice che dal browser non si può, con le strade vere, e non finge scene', g.foglio === 'gioco' && g.scene === sceneIniziali && g.sc === '' && /scheda di acquisizione|capture card/.test(g.testo));
  await clic(p, '[data-tel="prepara"]');
  await clic(p, '[data-tel-scenario="giro"]');
  await clic(p, '[data-tel="fatto"]');
  await p.waitForTimeout(250);
  const s = await p.evaluate(() => ({ scene: STUDIO.doc.scene.map((x) => x.nome), muta: STUDIO.doc.scene.map((x) => x.muta), sc: STUDIO.doc.scelte.telefono.scenario, facing: STUDIO.dev.facing, foglio: STUDIO.tel.foglio }));
  ok('«In giro» prepara le sue scene e la fotocamera davanti', s.sc === 'giro' && s.scene.length === 4 && s.muta.filter(Boolean).length === 1 && s.facing === 'user' && s.foglio === '', JSON.stringify(s));
  // Da qui ogni misura parte da uno stato noto, anche se un passo prima e' rosso:
  // un difetto si vede nella sua riga, non in tutte quelle dopo.
  await p.evaluate(() => { if (STUDIO.doc.scelte.telefono.scenario !== 'giro') studioTelScegliScenario('giro'); STUDIO.tel.foglio = ''; renderStudioTel(); });

  const pollice = await p.evaluate(() => {
    const H = innerHeight, W = innerWidth, fuori = [];
    for (const b of document.querySelectorAll('.tel-barra button, .tel-scene button')) {
      const r = b.getBoundingClientRect();
      if (r.right <= 0 || r.left >= W) continue;
      if (r.width < 48 || r.height < 48) fuori.push(`${b.textContent.trim() || b.dataset.tel}: ${Math.round(r.width)}×${Math.round(r.height)}`);
      if (r.top < H / 2) fuori.push(`${b.textContent.trim() || b.dataset.tel}: in alto (${Math.round(r.top)})`);
    }
    return { fuori, largo: document.documentElement.scrollWidth - W };
  });
  ok('il pollice arriva a tutto: ogni tasto della diretta e\' da 48 punti e sta nella meta\' bassa', pollice.fuori.length === 0, pollice.fuori.join('; '));
  ok('la pagina non scorre di lato', pollice.largo <= 0, `${pollice.largo}px`);

  const scorri = async (dx) => { await p.mouse.move(195, 380); await p.mouse.down(); await p.mouse.move(195 + dx / 2, 384, { steps: 4 }); await p.mouse.move(195 + dx, 386, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(700); };
  const onda = () => p.evaluate(() => studioScena(STUDIO.doc.inOnda).nome);
  const prima = await onda();
  await scorri(-160); const dopoSx = await onda();
  await scorri(160); const dopoDx = await onda();
  ok('scorrendo il dito si cambia scena, avanti e indietro', dopoSx !== prima && dopoDx === prima, `${prima} → ${dopoSx} → ${dopoDx}`);

  const mic = await p.evaluate(() => {
    const g = () => ({ gain: { value: 1 } });
    STUDIO.audio = { gMic: g(), gDesk: g(), gSfx: g(), gMedia: g(), gMaster: g() };
    const pausa = STUDIO.doc.scene.find((x) => x.muta), io = STUDIO.doc.scene.find((x) => !x.muta);
    if (!pausa || !io) return { mancano: true };
    STUDIO.doc.inOnda = pausa.id; applicaMix(); const inPausa = STUDIO.audio.gMic.gain.value;
    STUDIO.doc.inOnda = io.id; applicaMix(); const fuori = STUDIO.audio.gMic.gain.value;
    STUDIO.audio = null;
    return { inPausa, fuori };
  });
  ok('la scena «Pausa» spegne il microfono finche\' e\' in onda, e tornando si riaccende', mic.inPausa === 0 && mic.fuori === 1, JSON.stringify(mic));

  await p.evaluate(() => { for (const [u, t] of [['marta', 'ciao!'], ['luca', 'dove sei?']]) studioChatPanelPush({ user: u, testo: t }); });
  await clic(p, '[data-tel="chat"]');
  await clic(p, '[data-tel-chat="l"]');
  const c = await p.evaluate(() => ({ righe: document.querySelectorAll('#tel-chat .studio-chat-riga').length, piena: document.querySelectorAll('#tel-chat-piena .studio-chat-riga').length, g: document.getElementById('tel-chat').dataset.g, salva: STUDIO.doc.scelte.telefono.chat }));
  ok('la chat arriva sulla regia, e si ingrandisce (e si ricorda)', c.righe === 2 && c.piena === 2 && c.g === 'l' && c.salva === 'l', JSON.stringify(c));

  await p.evaluate(() => { if (STUDIO.tel.foglio !== 'chat') { STUDIO.tel.foglio = 'chat'; renderStudioTelFoglio(); history.pushState({ ...(history.state || {}), studioTel: true }, ''); } });
  await p.goBack(); await p.waitForTimeout(250);
  const ind1 = await p.evaluate(() => ({ aperta: STUDIO.tel.aperta, foglio: STUDIO.tel.foglio }));
  ok('«indietro» chiude il pannello aperto, non la regia', ind1.aperta && ind1.foglio === '', JSON.stringify(ind1));

  // La diretta finta: il motore vero lo prova la prova in Google Chrome; qui
  // si misura solo cosa fanno le dita.
  await p.evaluate(() => {
    if (!STUDIO.tel.aperta) studioTelApri();
    STUDIO.tel.foglio = '';
    STUDIO.cap.micStream = new MediaStream(); STUDIO.cap.camEl = document.createElement('video');
    STUDIO.dir = { kick: { su: true, keyOk: true }, destinazioni: [] }; STUDIO.doc.scelte.dest = ['kick']; STUDIO.supporto = { ok: true };
    window.__fermate = 0; window.__avvii = 0;
    fermaLive = async () => { window.__fermate++; STUDIO.live = false; renderStudioTel(); };
    avviaLive = async () => { window.__avvii++; };
    STUDIO.live = true; renderStudioTel();
  });
  const vai = await p.evaluate(() => { const r = document.getElementById('tel-vai').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.click(vai.x, vai.y); await p.waitForTimeout(250);
  const tocco = await p.evaluate(() => ({ fermate: __fermate, live: STUDIO.live, avviso: document.getElementById('tel-avviso').textContent }));
  ok('un tocco non chiude la diretta: dice di tenere premuto', tocco.fermate === 0 && tocco.live && /tieni premuto|hold/i.test(tocco.avviso), JSON.stringify(tocco));
  await p.goBack(); await p.waitForTimeout(250);
  ok('in diretta «indietro» non chiude la regia', await p.evaluate(() => STUDIO.tel.aperta && STUDIO.live));
  await assicura(p);
  await p.mouse.move(vai.x, vai.y); await p.mouse.down(); await p.waitForTimeout(TENUTA); await p.mouse.up(); await p.waitForTimeout(400);
  const tenuto = await p.evaluate(() => ({ fermate: __fermate, live: STUDIO.live, conto: STUDIO.tel.conto, avvii: __avvii }));
  ok('tenendo premuto un secondo e mezzo la diretta si chiude', tenuto.fermate === 1 && !tenuto.live, JSON.stringify(tenuto));
  ok('e il clic del rilascio non fa ripartire il conto alla rovescia', tenuto.conto === null && tenuto.avvii === 0, JSON.stringify(tenuto));

  await assicura(p);
  await p.evaluate(() => { STUDIO.cap.micStream = new MediaStream(); STUDIO.cap.camEl = document.createElement('video'); STUDIO.dir = { kick: { su: true, keyOk: true }, destinazioni: [] }; STUDIO.doc.scelte.dest = []; STUDIO.supporto = { ok: true }; renderStudioTel(); });
  await clic(p, '#tel-vai'); await p.waitForTimeout(200);
  const senza = await p.evaluate(() => ({ foglio: STUDIO.tel.foglio, conto: STUDIO.tel.conto, check: document.querySelector('.tel-check')?.textContent || '' }));
  ok('senza destinazioni «Vai live» non conta: apre «Prima di partire» e dice cosa manca', senza.foglio === 'prepara' && senza.conto === null && /Nessuna destinazione|No destination/.test(senza.check), JSON.stringify(senza));
  await clic(p, '[data-tel-dest="kick"]');
  await clic(p, '[data-tel="fatto"]');
  await clic(p, '#tel-vai'); await p.waitForTimeout(200);
  const conto = await p.evaluate(() => ({ conto: STUDIO.tel.conto, vis: !document.getElementById('tel-conto').hidden }));
  await clic(p, '#tel-conto'); await p.waitForTimeout(1200);
  const annullato = await p.evaluate(() => ({ conto: STUDIO.tel.conto, avvii: __avvii }));
  ok('con una destinazione parte il conto alla rovescia, e un tocco lo annulla prima del via', conto.conto === 3 && conto.vis && annullato.conto === null && annullato.avvii === 0, JSON.stringify({ conto, annullato }));
  await clic(p, '#tel-vai'); await p.waitForTimeout(3500);
  ok('lasciato correre, al tre si va in diretta', await p.evaluate(() => __avvii === 1 && STUDIO.tel.conto === null));

  await assicura(p);
  await clic(p, '[data-tel="altro"]'); await clic(p, '[data-tel="blocca"]');
  const micB = await p.evaluate(() => { const r = document.querySelector('[data-tel="mic"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, sopra: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.tel-blocco, .tel-sblocca') != null }; });
  await p.mouse.click(micB.x, micB.y); await p.waitForTimeout(150);
  ok('«Blocca i tocchi» rende lo schermo sordo: il tasto sotto non si preme', micB.sopra && await p.evaluate(() => STUDIO.tel.blocco));
  const sb = await p.evaluate(() => { const r = document.querySelector('.tel-sblocca').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.click(sb.x, sb.y); await p.waitForTimeout(150);
  const ancora = await p.evaluate(() => STUDIO.tel.blocco);
  await p.mouse.move(sb.x, sb.y); await p.mouse.down(); await p.waitForTimeout(TENUTA); await p.mouse.up(); await p.waitForTimeout(150);
  ok('e si sblocca solo tenendo premuto', ancora && await p.evaluate(() => !STUDIO.tel.blocco));

  await p.evaluate(() => { STUDIO.live = false; STUDIO.cap.micStream = null; STUDIO.cap.camEl = null; renderStudioTel(); });
  await p.goBack(); await p.waitForTimeout(250);
  ok('fuori diretta «indietro» chiude la regia e torna allo Studio', await p.evaluate(() => !STUDIO.tel.aperta && document.getElementById('studio-tel').hidden));
  await clic(p, '[data-tel="apri"]'); await p.waitForTimeout(250);
  ok('e la si riapre dalla barra del telefono', await p.evaluate(() => STUDIO.tel.aperta));

  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(400);
  const orizz = await p.evaluate(() => {
    const W = innerWidth, H = innerHeight, fuori = [];
    for (const b of document.querySelectorAll('.tel-barra button')) { const r = b.getBoundingClientRect(); if (r.left < W / 2 || r.bottom > H || r.top < 0 || r.width < 48 || r.height < 48) fuori.push(`${b.dataset.tel} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`); }
    return { fuori, largo: document.documentElement.scrollWidth - W };
  });
  ok('col telefono di traverso la barra va sul lato del pollice, intera', orizz.fuori.length === 0 && orizz.largo <= 0, orizz.fuori.join('; '));
  ok('nessun errore di pagina nella regia', err.length === 0, err.join(' | '));
  await p.close();
}

await b.close();
await chiudiSito();

const rossi = esiti.filter((e) => !e.vero);
if (rossi.length) { console.log(`\nLo Studio della diretta non mantiene ${rossi.length} promess${rossi.length === 1 ? 'a' : 'e'}.`); process.exit(1); }
console.log('\nLo Studio della diretta mantiene le sue promesse. ✓');
