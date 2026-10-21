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
//  · la regia resta dentro la scheda, dove un antenato animato la rinchiude;
// e per la fotocamera (docs/DIRETTA.md, «La fotocamera del telefono»), una per
// garanzia: i vincoli chiesti in verticale; l'automatica che ritaglia sempre;
// lo zoom digitale che non ingrandisce; lo zoom della fotocamera che non si
// chiede; le due dita che non spostano; lo specchio che non specchia; le bande
// nere invece che sfumate; l'avviso del telefono storto che tace; l'obiettivo
// che non si ricorda; l'obiettivo sparito che lascia senza fotocamera; lo zoom
// rifiutato che resta senza effetto; i bottoni volanti sopra i comandi; i nomi
// di Android illeggibili; la scelta del computer che non arriva alla scena; i
// tasti tondi troppo piccoli.
// E per la regia rivista (docs/DIRETTA.md): la tela sotto i comandi; il
// cartello della tela vuota che tace; il microfono che non dice lo stato; il
// formato che non segue il telefono o che perde una destinazione; la salute
// che non distingue il guasto. Per la finestra a parte: le altre schede che
// restano nella finestra; il sito che si riprende la regia da solo; la
// finestra chiusa in diretta che non si dice; i tasti che partono mentre si
// scrive; e, in un giro loro perche' si trascinano dietro tutto il resto, chi
// ha la regia che non la cede e il cartello che non si mostra.
const SELFTEST = process.argv.includes('--selftest');
// Difetti che si coprono a vicenda non si rimettono insieme («un tocco chiude»
// spegnerebbe la diretta prima di poter misurare il rilascio): ogni gruppo e'
// un giro a parte del collaudo, con --rompi=N.
const ROMPI = Number((process.argv.find((a) => a.startsWith('--rompi=')) || '').split('=')[1]) || 0;
const DIFETTI = {
  '/app.js': [
    ['sveglia: () => { if (studioOverlayServono().has(k)) studioRidisegna(); },', 'sveglia: studioRidisegna,', 'una cornice che non serve non sveglia lo Studio', 1, /a riposo/],
    ['  const alta = Math.max(240, Math.floor(window.innerHeight - sopra - 16));', '  const alta = 2000;', 'la tela si misura sulla finestra', 9, /tela intera, «Vai live»/],
    ['&& !GUIDA_CHIUSA.has(id);', ';', 'la guida dello strumento e\' chiusa', 9, /guida dello Studio e' chiusa/],
    ['  d.inOnda = t.a;\n', '  void t.a;\n', 'la transizione cambia il programma', 1, /transizione manda in onda|dissolvenza finita/],
    ['const studioPos = (f) => f.pos[STUDIO.lavoro];', 'const studioPos = (f) => f.pos.o;', 'ogni formato ha la sua posizione', 1, /non sposta l'orizzontale/],
    ['  STUDIO.salvo.timer = setTimeout(() => { STUDIO.salvo.timer = 0; studioSalva(); }, 1500);', '  STUDIO.salvo.timer = 0;', 'le scene si salvano da sole', 1, /si salvano da sole/],
    ['  if (STUDIO.live) { studioTelAvviso(', '  if (STUDIO.live) { fermaLive(); return; studioTelAvviso(', 'un tocco non chiude la diretta', 2, /un tocco non chiude/],
    ['  if (T.ignoraClic && performance.now() - T.ignoraClic < 1000) { T.ignoraClic = 0; return; }\n', '', 'rilasciato il tasto, non riparte', 1, /clic del rilascio/],
    ['  if (Math.abs(dx) > 60 && Math.abs(dy)', '  if (Math.abs(dx) > 6000 && Math.abs(dy)', 'scorrendo si cambia scena', 1, /scorrendo il dito/],
    ['  if (STUDIO.live || T.conto != null) { history.pushState', '  if (false) { history.pushState', 'indietro non chiude la diretta', 1, /in diretta «indietro»/],
    ['    document.body.appendChild(nuovo); el = nuovo;', '    el = nuovo;', 'la regia copre lo schermo', 3, /a tutto schermo e sopra a tutto/],
    ["      sel.dispatchEvent(new Event('input', { bubbles: true }));\n      sel.dispatchEvent(new Event('change', { bubbles: true }));", "      sel.dispatchEvent(new Event('change', { bubbles: true }));", 'il menu\' rivestito annuncia la scelta', 4, /scegliendo un altro overlay/],
    ['  if (!d.scelte.overlay) d.scelte.overlay = studioOverlayDi(null);', '  if (!d.scelte.overlay) d.scelte.overlay = id;', 'la scelta di una scena non tocca le altre', 5, /le altre tengono il loro/],
    ['  if (STUDIO.doc && STUDIO.ov.list.length && !STUDIO.ov.list.some((o) => o.id === STUDIO.doc.scelte.overlay)) STUDIO.doc.scelte.overlay = STUDIO.ov.list[0].id;', '', 'la scelta di una scena non tocca le altre (bis)', 5, /le altre tengono il loro/],
    ["const studioServeDisegnare = () => STUDIO.live || !!STUDIO.avvio || (!FIN.ceduto && (!!STUDIO.tel?.aperta || schedaAttiva === 'studio'));", 'const studioServeDisegnare = () => true;', 'fuori dalla scheda non si disegna', 4, /fuori dalla scheda Studio/],
    ["      STUDIO.palcoNascosto = !(p?._inVista || (a && !a.closest('[hidden]') && a._inVista));", '      STUDIO.palcoNascosto = false;', 'fuori dalla scheda non si disegna (bis)', 4, /fuori dalla scheda Studio/],
    ["      STUDIO.palcoNascosto = !(p?._inVista || (a && !a.closest('[hidden]') && a._inVista));", '      STUDIO.palcoNascosto = false;', 'la tela fuori schermo non si disegna', 6, /scorsa fuori dallo schermo/],
    ['  if (libero && !STUDIO.ridisegna && !viva && !STUDIO.eraViva) {', '  if (false) {', 'a riposo non si disegna', 4, /a riposo/],
    ["  const fps = STUDIO.live || STUDIO.avvio ? (STUDIO_QUAL[STUDIO.qual] || STUDIO_QUAL['720p30']).fps : 30;", "  const fps = 1000;", 'fuori diretta al massimo 30 disegni', 4, /30 volte al secondo/],
    ['  const v = { width: { ideal: ww }, height: { ideal: hh }, frameRate:', '  const v = { width: { ideal: hh }, height: { ideal: ww }, frameRate:', 'la fotocamera si chiede in orizzontale', 7, /si chiede in orizzontale/],
    ['const zoom = cam && !C.hw ? C.zoom : (', 'const zoom = cam && !C.hw ? 1 : (', 'lo zoom digitale ingrandisce', 7, /il tasto «1×» ingrandisce/],
    ['await tr.applyConstraints({ advanced: [{ zoom: studioClamp(', 'await ({ advanced: [{ zoom: studioClamp(', 'si usa lo zoom della fotocamera', 7, /ha uno zoom suo/],
    ['    studioCamSposta(mx - T.pinza.mx, my - T.pinza.my);\n', '', 'due dita spostano', 7, /spostandole insieme/],
    ["  if (STUDIO_FINESTRA && id !== 'studio') { if (studioSonoRegia()) studioFinestraFuori(id); return; }\n", '', 'dalla finestra le altre schede vanno nel sito', 10, /si apre nella finestra principale/],
    ['  card.hidden = !fuori; if (carta) carta.hidden = fuori;', '  card.hidden = true;', 'il sito mostra il cartello', 11, /il sito se ne accorge/],
    ["    if (!studioSonoRegia()) return;\n    const live = !!STUDIO.live;", "    if (true) return;\n    const live = !!STUDIO.live;", 'chi ha la regia la cede', 11, /il sito se ne accorge|torna nel sito/],
    ['    FIN.altrove = null; FIN.chiusaLive = !!m.live;', '    FIN.altrove = null; FIN.chiusaLive = false;', 'la finestra chiusa in diretta si dice', 10, /regia manca/],
    ["  if (ev.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable=\"false\"]), dialog') || document.querySelector('dialog[open]')) return;\n", '', 'scrivendo non partono i tasti', 10, /scrivendo in un campo/],
    ['    if (!STUDIO_FINESTRA && !FIN.prendi && occupato) { renderStudioFuori(); return; }', '    if (false) { renderStudioFuori(); return; }', 'il sito non si riprende la regia da solo', 10, /non si riprende la regia/],
    ['  if (!el || !STUDIO.doc) return;\n  const d = STUDIO.doc, k = STUDIO.trans', '  if (true) return;\n  const d = STUDIO.doc, k = STUDIO.trans', 'la tela vuota si dice', 1, /fotocamera spenta la tela lo dice/],
    ["muto: L('Mic muto', 'Mic muted', 'Micro silenciado')", "muto: L('Microfono', 'Mic muted', 'Micro silenciado')", 'il microfono dice il suo stato', 1, /dice il suo stato a parole/],
    ['  if (STUDIO.M.escluse(prova, valide).length > STUDIO.M.escluse(d.scelte, valide).length) return;\n', '', 'il formato non perde destinazioni', 1, /nessuna destinazione si perde/],
    ['  const lato = innerWidth > innerHeight ? \'o\' : \'v\', f = d.scelte.formati;', '  const lato = STUDIO.lavoro, f = d.scelte.formati;', 'il formato segue il telefono', 7, /il formato segue il telefono/],
    ['const SALUTE_SOGLIE = { saltati: [0.02, 0.1],', 'const SALUTE_SOGLIE = { saltati: [0.5, 0.9],', 'gli scarti si colorano', 1, /colori della gravita/],
    ['  if (r.specchio) { c.translate(2 * r.dx + r.dw, 0); c.scale(-1, 1); }\n', '', 'lo specchio specchia', 7, /Specchia» rovescia/],
    ['  if (r.bande && STUDIO.M.SFUMATE.includes(f.tipo)) studioSfumato(c, el, vw, vh, p);\n', '', 'le bande sono sfumate', 8, /sfondo sfumato, non il nero/],
    ["  if (k === 'dritto') studioTelAvviso(", '  if (false) studioTelAvviso(', 'si dice di tenere il telefono dritto', 7, /regia dice di tenere il telefono dritto/],
    ['STUDIO.dev.lente[fm] = id;', 'void id;', "l'obiettivo si ricorda per lato", 7, /si ricorda per quel lato/],
    ["  const nome = document.querySelector('.tel-cam-nome span'); if (nome && STUDIO.cap.camEl) nome.textContent = studioCamEtichetta();\n", '', 'si vede quale fotocamera e\' in uso', 7, /quale fotocamera e' in uso/],
    ['    if (!ripiego || !/Overconstrained|NotFound/', '    if (true || !/Overconstrained|NotFound/', "l'obiettivo sparito non lascia al buio", 7, /obiettivo che non c'e' piu'/],
    ['  } catch (e) { C.hw = null; C.zoom = studioClamp(', '  } catch (e) { void 0; C.zoom = studioClamp(', 'lo zoom rifiutato passa allo Studio', 7, /rifiuta lo zoom/],
    ['  if (STUDIO.cap.camEl && prima && (prima.h !== ora.h || prima.fps !== ora.fps)) studioCambiaCamera(STUDIO.dev.camId);', '', 'la fotocamera segue la qualita\'', 7, /si riapre alla misura nuova/],
    ["  if (t.id === 'sp-adatta' && f.inq) {", "  if (t.id === 'sp-adatta' && false) {", 'la scelta del computer arriva alla scena', 7, /la scelta finisce nella scena/],
  ],
  '/js/studio-modello.js': [
    ["  return taglio <= TAGLIO_MAX + 1e-9 ? 'ritaglia' : 'intera';", "  return 'ritaglia';", "l'automatica non taglia piu' di un terzo", 7, /si vede intera: niente zoom/],
    ['  if (m) return `${', '  if (false) return `${', 'i nomi di Android si leggono', 7, /coi nomi del telefono/],
  ],
  '/style.css': [
    ['  .studio-regia { grid-template-columns: minmax(0, 1fr) minmax(250px, 300px); }', '  .studio-regia { grid-template-columns: minmax(0, 1fr); }', 'la regia sta accanto alla tela', 9, /tela intera, «Vai live»/],
    ['  .studio-regia-col { position: sticky;', '  .studio-regia-col { position: static;', '«Vai live» resta a portata scorrendo', 9, /resta a portata/],
    ['.studio-regia:has(.studio-tele.doppio) { grid-template-columns: minmax(0, 1fr); }', '.studio-regia:has(.studio-tele.doppio) { }', 'in modalita\' studio la regia scende sotto le due tele', 1, /tutta la larghezza/],
    ['.studio-mobile .studio-regia-main { display: contents; }', '.studio-mobile .studio-regia-main { display: block; }', 'sul telefono i comandi stanno subito sotto la tela', 9, /dall'alto: la tela/],
    ['.studio-mobile #studio-docks > .studio-dock:not(.studio-controlli)', '.studio-mobile .studio-docks > .studio-dock:not(.studio-controlli)', 'sul telefono Proprieta\' e Chat restano', 1, /proprieta' si vedono anche sul telefono/],
    ['.tel-riga { display: grid; gap: 6px; margin-top: 12px; }', '.tel-riga { display: grid; gap: 6px; margin-top: 70px; }', 'il foglio Fotocamera non si scorre', 7, /sta tutto in una schermata/],
    ['.tel-palco { position: absolute; top: var(--p-su); left: var(--p-sx); right: var(--p-dx); bottom: var(--p-giu);', '.tel-palco { position: absolute; top: 0; left: 0; right: 0; bottom: 0;', 'la tela sta fuori dai comandi', 1, /mai sotto i comandi|lascia posto a barra/],
    ['min-width: 48px; min-height: 60px; padding: 4px;', 'min-width: 30px; min-height: 30px; padding: 0;', 'i tasti sono da pollice', 1, /il pollice arriva a tutto/],
    ['body.in-studio #cerca-lancia, body.in-studio #plancia-lancia { display: none !important; }', 'body.in-studio #nessuno, body.in-studio #plancia-lancia { display: none !important; }', 'niente bottoni volanti nello Studio', 7, /niente bottoni volanti/],
    ['width: 52px; height: 52px; padding: 0; border: 0; border-radius: 50%;', 'width: 30px; height: 30px; padding: 0; border: 0; border-radius: 50%;', 'i tasti tondi sono da pollice', 7, /tasti della fotocamera sulla tela/],
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
  // La tela fuori dallo schermo non si disegna (risparmio voluto): come una
  // persona, prima di guardarla la si porta in vista.
  await p.evaluate(() => document.getElementById('studio-palco-prog')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(400);
  return { p, err };
}

// I pixel che non sono il fondo della tela (#0b0b0f): quanto c'e' disegnato sopra.
// `testo`: solo il riquadro dove nasce un testo nuovo (studio-modello.js: il
// terzo basso, x 140-1140 e y 560-670 su 1280×720), senza la sua parte
// sinistra: li' l'overlay della scena ha contatore e chat. Cosi' si misura il
// testo e non l'overlay, che vive per conto suo.
const disegnati = (p, quale, testo = false) => p.evaluate(([q, testo]) => {
  const c = q === 'ante' ? STUDIO.ante : STUDIO.tele[q === 'lavoro' ? STUDIO.lavoro : q];
  const [x, y, w, h] = testo ? [Math.floor(c.width * 0.35), Math.floor(c.height * 0.78), Math.floor(c.width * 0.5), Math.floor(c.height * 0.15)] : [0, 0, c.width, c.height];
  const d = c.getContext('2d').getImageData(x, y, w, h).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 16) if (Math.abs(d[i] - 11) + Math.abs(d[i + 1] - 11) + Math.abs(d[i + 2] - 15) > 30) n++;
  return n;
}, [quale, testo]);
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
    pannelli: [...document.querySelectorAll('#studio-regia-col > .studio-dock, #studio-docks > .studio-dock')].filter((d) => d.getBoundingClientRect().width > 150).length,
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
  const larghe = await p.evaluate(() => {
    const w = (id) => Math.round(document.getElementById(id).getBoundingClientRect().width);
    const tele = document.getElementById('studio-tele').getBoundingClientRect(), col = document.getElementById('studio-regia-col').getBoundingClientRect();
    return { ant: w('studio-palco-ant'), prog: w('studio-palco-prog'), tele: Math.round(tele.width), sotto: col.top >= tele.bottom };
  });
  ok('in modalita\' studio le due tele hanno tutta la larghezza, e la regia scende sotto', larghe.sotto && Math.min(larghe.ant, larghe.prog) >= larghe.tele * 0.4, JSON.stringify(larghe));
  const ant1 = await disegnati(p, 'ante', true), prog1 = await disegnati(p, 'o', true);
  ok('il testo aggiunto si vede in anteprima e non va in onda', ant1 > 50 && prog1 === 0, `anteprima ${ant1}, programma ${prog1}`);

  // Il taglio manda in onda subito; la dissolvenza passa da tutte e due.
  await p.selectOption('#studio-trans-tipo', 'taglio');
  await clic(p, '#studio-transizione');
  await fotogrammi(p);
  const t = await p.evaluate(() => ({ onda: STUDIO.doc.inOnda, ant: STUDIO.doc.anteprima }));
  const prog2 = await disegnati(p, 'o', true);
  ok('la transizione manda in onda l\'anteprima', t.onda === m.ant && prog2 > 50, `in onda ${t.onda}, pixel ${prog2}`);
  ok('come in OBS, l\'anteprima prende la scena che era in onda', t.ant === m.onda);
  await p.selectOption('#studio-trans-tipo', 'dissolvenza');
  await p.fill('#studio-trans-ms', '1200');
  await clic(p, '#studio-transizione');
  await p.waitForTimeout(450);
  const meta = await p.evaluate(() => ({ corre: !!STUDIO.trans, onda: STUDIO.doc.inOnda }));
  const prog3 = await disegnati(p, 'o', true);
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
  await p.evaluate(() => { const s = studioSceneAttiva(); if (!s.fonti.some((f) => f.tipo !== 'overlay')) studioAddFonte('testo'); STUDIO.sel = s.fonti.find((f) => f.tipo !== 'overlay').id; renderStudioTutto(); });
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
  const sulla = await disegnati(p, 'lavoro');
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
  const rossi = await disegnati(p, 'lavoro');
  ok('ricaricato il file, il segnaposto se ne va e l\'immagine va in onda', rossi > 50, `${rossi} pixel`);
  ok('il file resta su questo dispositivo (IndexedDB) col suo segno', tornato.conservato && tornato.giusta && /^[0-9a-f]{64}$/.test(tornato.imp));
  const tolti = await p.evaluate(async () => { const n = await STUDIO.MD.togliTranne(new Set(), { chi: studioChi() }); const resta = await STUDIO.MD.elenco({ chi: studioChi() }); return { n, resta: resta.length }; });
  ok('i file che nessuna scena usa piu\' si tolgono', tolti.n >= 1 && tolti.resta === 0);

  // Gli overlay sono quelli dello streamer, e ogni scena sceglie il suo.
  await p.evaluate(() => { STUDIO.doc.scelte.modalitaStudio = false; renderStudioTutto(); });
  await p.waitForFunction(() => STUDIO.ov.list.length >= 2, null, { timeout: 8000 }).catch(() => {});
  const ov0 = await p.evaluate(() => ({ n: STUDIO.ov.list.length, opz: document.querySelectorAll('#studio-ov-sel option').length, vis: (() => { const s = document.getElementById('studio-ov-sel'); const r = (s.closest('.tendina')?.querySelector('.tendina-btn') || s).getBoundingClientRect(); return r.width > 40 && r.height > 20; })() }));
  ok('nel pannello Fonti si sceglie quale dei propri overlay usare, in vista', ov0.n >= 2 && ov0.opz === ov0.n && ov0.vis, JSON.stringify(ov0));
  await clic(p, '[data-scena-azione="nuova"]');
  const nuova = await p.evaluate(() => { const s = studioScena(STUDIO.doc.inOnda); const f = s.fonti.find((x) => x.tipo === 'overlay'); return { ha: !!f, nome: f?.nome, id: f ? studioOverlayDi(f) : '' }; });
  ok('una scena nuova nasce con l\'overlay, cosi\' gli alert non spariscono cambiando scena', nuova.ha && nuova.id && nuova.nome !== 'overlay', JSON.stringify(nuova));
  // Si sceglie dal menu' come lo usa una persona: sul computer e' il menu'
  // rivestito del sito, che deve annunciare la scelta come un menu' vero.
  const altroId = await p.evaluate(() => STUDIO.ov.list.find((o) => o.id !== studioOverlayInOnda()).id);
  await p.evaluate((id) => {
    const sel = document.getElementById('studio-ov-sel'), g = sel.closest('.tendina');
    if (!g) { sel.value = id; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); return; }
    g.querySelector('.tendina-btn').click();
    const i = [...sel.options].findIndex((o) => o.value === id);
    document.querySelectorAll('.tendina-voce')[i]?.click();
  }, altroId);
  await p.waitForTimeout(150);
  const scelta = await p.evaluate((altro) => {
    const qui = studioScena(STUDIO.doc.inOnda).fonti.find((x) => x.tipo === 'overlay');
    const prima = STUDIO.doc.scene.find((x) => x.id !== STUDIO.doc.inOnda && x.fonti.some((f) => f.tipo === 'overlay'));
    return { altro, qui: qui.overlay, nome: qui.nome, atteso: studioOverlayNome(altro), primaDiversa: prima ? studioOverlayDi(prima.fonti.find((f) => f.tipo === 'overlay')) !== altro : true };
  }, altroId);
  ok('scegliendo un altro overlay cambia quello di questa scena, e le altre tengono il loro', scelta.qui === scelta.altro && scelta.nome === scelta.atteso && scelta.primaDiversa, JSON.stringify(scelta));
  // Le prestazioni sono promesse anche loro (lo Studio pesava: si misura).
  await p.evaluate(() => { const vero = studioDisegnaProgramma; window.__disegni = 0; studioDisegnaProgramma = (...a) => { window.__disegni++; return vero(...a); }; STUDIO.doc.scene.forEach((x) => { x.fonti = x.fonti.filter((f) => f.tipo === 'testo'); }); STUDIO.trans = null; renderStudioTutto(); });
  await p.waitForTimeout(1200);
  const fermo = await p.evaluate(async () => { __disegni = 0; await new Promise((ok) => setTimeout(ok, 1000)); return { disegni: __disegni, raf: STUDIO.raf }; });
  ok('a riposo (scena ferma, niente diretta) lo Studio non disegna e il ciclo dorme', fermo.disegni === 0 && !fermo.raf, JSON.stringify(fermo));
  const vivo = await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 180; const g = c.getContext('2d'); let n = 0;
    window.__muovi = setInterval(() => { g.fillStyle = `hsl(${(n++ * 9) % 360} 70% 50%)`; g.fillRect(0, 0, 320, 180); }, 33);
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = c.captureStream(30); await v.play().catch(() => {});
    STUDIO.cap.camEl = v; STUDIO.cap.camStream = v.srcObject;
    studioScena(STUDIO.doc.inOnda).fonti.push(STUDIO.M.nuovaFonte('webcam', { nome: 'Webcam' }));
    renderStudioTutto(); studioRidisegna();
    await new Promise((ok) => setTimeout(ok, 300)); __disegni = 0; await new Promise((ok) => setTimeout(ok, 1000)); return __disegni;
  });
  ok('con qualcosa che si muove si disegna, ma fuori diretta non piu\' di 30 volte al secondo', vivo >= 15 && vivo <= 32, `${vivo} disegni in un secondo`);
  await p.evaluate(() => { studioRidisegna(); window.scrollTo(0, document.documentElement.scrollHeight); });
  await p.waitForTimeout(400);
  const via = await p.evaluate(async () => { __disegni = 0; await new Promise((ok) => setTimeout(ok, 1000)); return { disegni: __disegni, y: Math.round(document.getElementById('studio-palco-prog').getBoundingClientRect().bottom) }; });
  ok('con la tela scorsa fuori dallo schermo non si disegna, e tornando si riprende', via.disegni === 0 && via.y < 0 && await p.evaluate(async () => { document.getElementById('studio-palco-prog').scrollIntoView({ block: 'center' }); await new Promise((ok) => setTimeout(ok, 500)); __disegni = 0; await new Promise((ok) => setTimeout(ok, 500)); return __disegni > 3; }), JSON.stringify(via));
  await p.evaluate(() => window.SB_APP.vai('stato'));
  await p.waitForTimeout(300);
  const fuori = await p.evaluate(async () => { __disegni = 0; await new Promise((ok) => setTimeout(ok, 1000)); return { disegni: __disegni, raf: STUDIO.raf }; });
  ok('fuori dalla scheda Studio il disegno si ferma (fuori diretta)', fuori.disegni === 0 && !fuori.raf, JSON.stringify(fuori));
  ok('nessun errore di pagina sul computer', err.length === 0, err.join(' | '));
  await p.close();
}

// ---------------------------------------------------------------- a portata
// Lo Studio e' uno strumento: aperto su un portatile (1366×768), senza
// scorrere, si vedono la tela intera, «Vai live», la fotocamera in uso e le
// scene. La striscia della demo c'e' solo nella demo: si toglie prima di
// misurare, e la tela si rimisura da sola quando cambia quello che ha sopra.
console.log('Studio della diretta a portata (1366×768):');
{
  const { p, err } = await apri({ width: 1366, height: 768, telefono: false });
  await p.evaluate(() => { document.getElementById('demo-barra')?.remove(); });
  await p.waitForTimeout(800);
  const m = await p.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { su: Math.round(b.top + scrollY), giu: Math.round(b.bottom + scrollY), alto: Math.round(b.height) }; };
    return { vista: innerHeight, prog: r('#studio-palco-prog'), live: r('#studio-live'), cam: r('[data-studio-cam]'), scena: r('#studio-scene > li'), guida: !!document.querySelector('.guida-scheda[data-guida="studio"]')?.open, volanti: ['cerca-lancia', 'plancia-lancia'].filter((id) => { const e = document.getElementById(id); return e && e.getClientRects().length; }) };
  });
  const dentro = (x) => !!x && x.alto > 0 && x.giu <= m.vista;
  ok('aperto su un portatile, la guida dello Studio e\' chiusa: e\' uno strumento', !m.guida);
  ok('senza scorrere: la tela intera, «Vai live», la fotocamera in uso e la prima scena', dentro(m.prog) && dentro(m.live) && dentro(m.cam) && dentro(m.scena) && m.prog.alto >= 240, JSON.stringify(m));
  ok('niente bottoni volanti sopra la colonna di regia', !m.volanti.length, m.volanti.join());
  await p.evaluate(() => window.scrollTo(0, 900));
  await p.waitForTimeout(300);
  const fermo = await p.evaluate(() => { const b = document.getElementById('studio-live').getBoundingClientRect(); return { su: Math.round(b.top), giu: Math.round(b.bottom), vista: innerHeight }; });
  ok('scorrendo fra le fonti, «Vai live» resta a portata', fermo.su >= 0 && fermo.giu <= fermo.vista, JSON.stringify(fermo));
  ok('nessun errore di pagina a portata', !err.length, err.join(' | '));
  await p.close();
}

// ---------------------------------------------------------------- una finestra a parte
// Lo Studio si stacca in una finestra sua (docs/DIRETTA.md, «Lo Studio in una
// finestra a parte»): una regia sola per browser, il sito che se ne accorge,
// e il ritorno. La diretta finta (STUDIO.live) basta: qui si misura chi tiene
// la regia e cosa dice il sito, il motore vero lo prova la prova in Chrome.
console.log('Lo Studio in una finestra a parte (1366×900):');
{
  const { p, err } = await apri({ width: 1366, height: 900, telefono: false });
  const ctx = p.context();
  if (serviti.size) {
    await ctx.route((u) => u.host === `127.0.0.1:${PORTA}` && serviti.has(u.pathname), async (route) => {
      const r = await route.fetch();
      await route.fulfill({ response: r, body: serviti.get(new URL(route.request().url()).pathname) });
    });
  }
  const errF = [];
  const stacca = async () => {
    const [w] = await Promise.all([ctx.waitForEvent('page'), clic(p, '[data-fin="stacca"]')]);
    w.on('pageerror', (e) => errF.push(e.message));
    await w.waitForFunction(() => typeof STUDIO !== 'undefined' && !!STUDIO.doc && !!STUDIO.tele.o, null, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(600);
    return w;
  };
  // Ogni prova parte da uno stato noto: le altre finestre chiuse e la regia
  // qui. Un difetto si vede nella sua riga, non in tutte quelle dopo.
  const ripristina = async () => {
    for (const q of ctx.pages()) if (q !== p) await q.evaluate(() => { try { STUDIO.live = false; } catch {} window.close(); }).catch(() => {});
    await p.waitForTimeout(400);
    await p.evaluate(async () => { STUDIO.live = false; FIN.altrove = null; FIN.chiusaLive = false; if (!studioSonoRegia()) { FIN.ceduto = false; FIN.prendi = true; await caricaStudio(); } renderStudioFuori(); renderStudioPillola(); });
    await p.waitForFunction(() => !!STUDIO.doc, null, { timeout: 8000 }).catch(() => {});
  };
  await p.evaluate(() => { STUDIO.cap.micStream = new MediaStream(); });
  let w = await stacca();
  const fin = await w.evaluate(() => ({ regia: studioSonoRegia(), sola: document.body.classList.contains('studio-finestra') && getComputedStyle(document.getElementById('barra-top')).display === 'none' && getComputedStyle(document.getElementById('drawer')).display === 'none', torna: !!document.querySelector('[data-fin="torna"]') }));
  ok('«Stacca in una finestra» apre una finestra con solo lo Studio, che prende la regia', fin.regia && fin.sola && fin.torna, JSON.stringify(fin));
  const sito = async () => p.evaluate(() => ({ regia: studioSonoRegia(), doc: !!STUDIO.doc, mic: !!STUDIO.cap.micStream, cartello: !document.getElementById('studio-fuori').hidden && document.getElementById('studio-carta').hidden, testo: document.getElementById('studio-fuori').textContent, pillola: document.getElementById('studio-pillola')?.hidden === false ? document.getElementById('studio-pillola').textContent : '' }));
  const s1 = await sito();
  ok('il sito se ne accorge: al posto dello Studio il cartello, e fotocamera, microfono e scene lasciati alla finestra', !s1.regia && !s1.doc && !s1.mic && s1.cartello && /finestra a parte/.test(s1.testo), JSON.stringify(s1));
  await p.evaluate(() => SB_APP.vai('statistiche')); await p.waitForTimeout(300);
  await w.evaluate(() => { STUDIO.live = true; STUDIO.startedAt = Date.now() - 65000; studioFinestraAnnuncia(); });
  await p.waitForTimeout(400);
  const pill = await sito();
  ok('e in ogni altra scheda del sito la pillola in alto dice che si e\' in diretta, col tempo', /LIVE 01:0\d/.test(pill.pillola), pill.pillola);
  await w.evaluate(() => { STUDIO.live = false; studioFinestraAnnuncia(); SB_APP.vai('alert'); });
  await p.waitForTimeout(400);
  const fuori = { sito: await p.evaluate(() => schedaAttiva), finestra: await w.evaluate(() => ({ scheda: schedaAttiva, regia: studioSonoRegia() })) };
  ok('dalla finestra, un\'altra scheda del sito si apre nella finestra principale, e lo Studio resta li\'', fuori.sito === 'alert' && fuori.finestra.scheda === 'studio' && fuori.finestra.regia, JSON.stringify(fuori));
  await p.evaluate(() => SB_APP.vai('studio')); await p.waitForTimeout(500);
  ok('tornando alla scheda Studio il sito non si riprende la regia da solo', await p.evaluate(() => !studioSonoRegia() && !document.getElementById('studio-fuori').hidden));
  const chiusa = w.waitForEvent('close', { timeout: 8000 }).then(() => true, () => false);
  await clic(p, '#studio-fuori [data-fin="qui"]');
  const qui = { chiusa: await chiusa };
  await p.waitForFunction(() => !!STUDIO.doc, null, { timeout: 8000 }).catch(() => {});
  Object.assign(qui, await p.evaluate(() => ({ regia: studioSonoRegia(), carta: !document.getElementById('studio-carta').hidden, cartello: !document.getElementById('studio-fuori').hidden })));
  ok('«Riportalo qui» chiude la finestra e lo Studio torna nel sito', qui.chiusa && qui.regia && qui.carta && !qui.cartello, JSON.stringify(qui));

  await ripristina();
  w = await stacca();
  await w.close({ runBeforeUnload: false }); await p.waitForTimeout(500);
  const chiusoFermo = await sito();
  ok('chiusa la finestra fuori diretta, il sito dice che lo Studio si e\' chiuso e lo riapre a richiesta', chiusoFermo.cartello && /si è chiuso/.test(chiusoFermo.testo) && !chiusoFermo.pillola, JSON.stringify(chiusoFermo));
  await ripristina();
  w = await stacca();
  await w.evaluate(() => { STUDIO.live = true; STUDIO.startedAt = Date.now(); studioFinestraAnnuncia(); });
  await p.waitForTimeout(300);
  await w.close({ runBeforeUnload: false }); await p.waitForTimeout(500);
  const chiusoLive = await sito();
  ok('chiusa la finestra in diretta, il sito dice che la regia manca, con «Riprendi la diretta qui»', chiusoLive.cartello && /durante la diretta/.test(chiusoLive.testo) && /senza regia/i.test(chiusoLive.pillola), JSON.stringify(chiusoLive));
  await ripristina();

  const tasti = await p.evaluate(async () => {
    if (STUDIO.doc.scene.length < 2) studioNuovaScena('Seconda');
    renderStudioTutto();
    STUDIO.doc.scelte.modalitaStudio = false; STUDIO.cap.micStream = new MediaStream(); STUDIO.mix.mic.mute = false;
    document.activeElement?.blur();
    const premi = (k, su = document.body) => su.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    const prima = STUDIO.doc.inOnda;
    premi('2'); await new Promise((r) => setTimeout(r, 500));
    const due = STUDIO.doc.inOnda;
    premi('m'); const muto = STUDIO.mix.mic.mute;
    const campo = document.getElementById('studio-riserva-testo'); campo.focus();
    premi('1', campo); premi('m', campo); await new Promise((r) => setTimeout(r, 300));
    return { cambiata: due !== prima && due === STUDIO.doc.scene[1].id, muto, fermoNelCampo: STUDIO.doc.inOnda === due && STUDIO.mix.mic.mute === muto, nota: !!document.querySelector('.studio-tasti-nota') && !!document.querySelector('#studio-scene kbd') };
  });
  ok('tasti: 2 manda in onda la seconda scena, M zittisce il microfono, e scrivendo in un campo non succede niente', tasti.cambiata && tasti.muto && tasti.fermoNelCampo && tasti.nota, JSON.stringify(tasti));
  ok('nessun errore di pagina fra le due finestre', !err.length && !errF.length, [...err, ...errF].join(' | '));
  await p.close();
}

// ---------------------------------------------------------------- telefono
console.log('Studio della diretta sul telefono (420×860):');
{
  const { p, err } = await apri({ width: 420, height: 860, telefono: true });
  const g = await p.evaluate(() => ({
    righe: document.querySelectorAll('#studio-mobile-barra .studio-mriga').length,
    visibili: [...document.querySelectorAll('#studio-regia-col > .studio-dock, #studio-docks > .studio-dock')].filter((d) => getComputedStyle(d).display !== 'none').map((d) => d.querySelector('h3').id),
    largo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    formati: STUDIO.doc.scelte.formati, f: document.getElementById('studio-palco-prog').dataset.f,
    modalita: document.getElementById('studio-modalita').hidden,
    ordine: ['#studio-tele', '#studio-live', '#studio-mobile-barra', '#studio-t-fonti'].map((q) => Math.round(document.querySelector(q).getBoundingClientRect().top)),
  }));
  ok('la barra del telefono ha formato, tasti rapidi e scene', g.righe === 3);
  ok('sul telefono restano solo controlli e fonti', [...g.visibili].sort().join() === 'studio-t-ctrl,studio-t-fonti', g.visibili.join());
  ok('sul telefono, dall\'alto: la tela, «Vai live», la barra, le fonti', g.ordine.every((y, i) => i === 0 || y > g.ordine[i - 1]), JSON.stringify(g.ordine));
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
    for (const b of document.querySelectorAll('.tel-barra button, .tel-scene button, .tel-cam button')) {
      const r = b.getBoundingClientRect();
      if (r.right <= 0 || r.left >= W) continue;
      if (r.width < 48 || r.height < 48) fuori.push(`${b.textContent.trim() || b.dataset.tel}: ${Math.round(r.width)}×${Math.round(r.height)}`);
      if (r.top < H / 2) fuori.push(`${b.textContent.trim() || b.dataset.tel}: in alto (${Math.round(r.top)})`);
    }
    return { fuori, largo: document.documentElement.scrollWidth - W };
  });
  const rias = await p.evaluate(() => document.getElementById('tel-riassunto').textContent);
  ok('in alto si legge dove va davvero la diretta: nessuna destinazione collegata, nessuna promessa', /nessuna destinazione/.test(rias) && !/Twitch|Kick/.test(rias), rias);
  ok('il pollice arriva a tutto: ogni tasto della diretta e\' da 48 punti e sta nella meta\' bassa', pollice.fuori.length === 0, pollice.fuori.join('; '));
  ok('la pagina non scorre di lato', pollice.largo <= 0, `${pollice.largo}px`);

  // La tela e' quello che va in onda: niente le sta sopra se non la chat e i
  // tasti della fotocamera, voluti. Barra, scene e riassunto stanno fuori.
  const sottoComandi = () => p.evaluate(() => {
    const r = (e) => e.getBoundingClientRect(), palco = r(document.getElementById('tel-palco')), fuori = [];
    const tocca = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    for (const e of document.querySelectorAll('.tel-barra button, .tel-scene button, .tel-su > *')) { if (!e.getClientRects().length) continue; if (tocca(r(e), palco)) fuori.push(`${e.id || e.dataset.tel || e.className}: ${Math.round(r(e).top)}`); }
    return { fuori, palco: [Math.round(palco.left), Math.round(palco.top), Math.round(palco.width), Math.round(palco.height)] };
  });
  const sc1 = await sottoComandi();
  ok('la tela non finisce mai sotto i comandi: barra, scene e riassunto stanno fuori', sc1.fuori.length === 0 && sc1.palco[3] > 500, JSON.stringify(sc1));
  const vuoto = await p.evaluate(() => { const v = document.getElementById('tel-vuoto'); return { vis: !v.hidden, tasto: !!v.querySelector('[data-tel="accendi"]'), testo: v.textContent }; });
  await p.evaluate(() => { STUDIO.cap.camEl = document.createElement('video'); studioRidisegna(); });
  await p.waitForTimeout(300);
  const pieno = await p.evaluate(() => document.getElementById('tel-vuoto').hidden);
  await p.evaluate(() => { STUDIO.cap.camEl = null; studioRidisegna(); });
  ok('a fotocamera spenta la tela lo dice, col tasto per accenderla; accesa, il cartello sparisce', vuoto.vis && vuoto.tasto && /spenta/.test(vuoto.testo) && pieno, JSON.stringify({ vuoto, pieno }));
  const micT = await p.evaluate(() => {
    STUDIO.cap.micStream = new MediaStream(); STUDIO.mix.mic.mute = true; renderStudioTel();
    const b = document.querySelector('[data-tel="mic"]'), muto = { testo: b.textContent.trim(), stato: b.dataset.stato };
    STUDIO.mix.mic.mute = false; renderStudioTel();
    const on = { testo: b.textContent.trim(), lancetta: !!b.querySelector('[data-vu="mic"]') };
    STUDIO.cap.micStream = null; renderStudioTel();
    return { muto, on };
  });
  ok('il microfono dice il suo stato a parole («Mic muto», «Mic attivo») e ha la lancetta del livello', micT.muto.testo === 'Mic muto' && micT.muto.stato === 'muto' && micT.on.testo === 'Mic attivo' && micT.on.lancetta, JSON.stringify(micT));

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
  // Dopo una pressione lunga certi browser mandano anche il clic del rilascio,
  // altri no (sul telefono diventa un tocco prolungato): qui lo si manda, perche'
  // e' il caso in cui la diretta potrebbe ripartire da sola.
  await p.mouse.move(vai.x, vai.y); await p.mouse.down(); await p.waitForTimeout(TENUTA); await p.mouse.up();
  await p.evaluate(() => document.getElementById('tel-vai').click()); await p.waitForTimeout(400);
  const menu = await p.evaluate(() => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); document.getElementById('tel-vai').dispatchEvent(e); return e.defaultPrevented; });
  const tenuto = await p.evaluate(() => ({ fermate: __fermate, live: STUDIO.live, conto: STUDIO.tel.conto, avvii: __avvii }));
  ok('tenendo premuto un secondo e mezzo la diretta si chiude', tenuto.fermate === 1 && !tenuto.live, JSON.stringify(tenuto));
  ok('e il clic del rilascio non fa ripartire il conto alla rovescia', tenuto.conto === null && tenuto.avvii === 0, JSON.stringify(tenuto));
  ok('e la pressione lunga non apre il menu\' del telefono', menu);

  await assicura(p);
  await p.evaluate(() => { STUDIO.cap.micStream = new MediaStream(); STUDIO.cap.camEl = document.createElement('video'); STUDIO.dir = { kick: { su: true, keyOk: true }, destinazioni: [] }; STUDIO.doc.scelte.dest = []; STUDIO.supporto = { ok: true }; renderStudioTel(); });
  await p.mouse.click(vai.x, vai.y); await p.waitForTimeout(200);
  const senza = await p.evaluate(() => ({ foglio: STUDIO.tel.foglio, conto: STUDIO.tel.conto, check: document.querySelector('.tel-check')?.textContent || '' }));
  ok('senza destinazioni «Vai live» non conta: apre «Prima di partire» e dice cosa manca', senza.foglio === 'prepara' && senza.conto === null && /Nessuna destinazione|No destination/.test(senza.check), JSON.stringify(senza));
  await clic(p, '[data-tel-dest="kick"]');
  await clic(p, '[data-tel="fatto"]');
  await p.mouse.click(vai.x, vai.y); await p.waitForTimeout(200);
  const conto = await p.evaluate(() => ({ conto: STUDIO.tel.conto, vis: !document.getElementById('tel-conto').hidden }));
  await clic(p, '#tel-conto'); await p.waitForTimeout(1200);
  const annullato = await p.evaluate(() => ({ conto: STUDIO.tel.conto, avvii: __avvii }));
  ok('con una destinazione parte il conto alla rovescia, e un tocco lo annulla prima del via', conto.conto === 3 && conto.vis && annullato.conto === null && annullato.avvii === 0, JSON.stringify({ conto, annullato }));
  await p.mouse.click(vai.x, vai.y); await p.waitForTimeout(3500);
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
    const e = document.querySelector('[data-tel="esci"]').getBoundingClientRect();
    if (document.elementFromPoint(e.x + e.width / 2, e.y + e.height / 2)?.closest('[data-tel="esci"]') == null) fuori.push('il tasto per uscire e\' coperto');
    return { fuori, largo: document.documentElement.scrollWidth - W };
  });
  ok('col telefono di traverso la barra va sul lato del pollice, intera', orizz.fuori.length === 0 && orizz.largo <= 0, orizz.fuori.join('; '));

  const lato = await p.evaluate(() => {
    const r = (e) => e.getBoundingClientRect(), palco = r(document.getElementById('tel-palco')), fuori = [];
    const tocca = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    for (const e of document.querySelectorAll('.tel-barra button, .tel-scene button')) if (e.getClientRects().length && tocca(r(e), palco)) fuori.push(e.id || e.dataset.tel || e.textContent.trim());
    return { fuori, f: STUDIO.lavoro, formati: STUDIO.doc.scelte.formati };
  });
  ok('di lato la tela lascia posto a barra e scene, e la diretta diventa orizzontale (il formato segue il telefono)', lato.fuori.length === 0 && lato.f === 'o' && lato.formati.o && !lato.formati.v, JSON.stringify(lato));
  await p.evaluate(() => { STUDIO.dir = { twitch: { su: true, keyOk: true }, kick: { su: true, keyOk: true }, destinazioni: [] }; STUDIO.doc.scelte.dest = ['twitch']; });
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
  const twitch = await p.evaluate(() => ({ f: STUDIO.lavoro, formati: STUDIO.doc.scelte.formati }));
  await p.evaluate(() => { STUDIO.doc.scelte.dest = ['kick']; });
  await p.setViewportSize({ width: 391, height: 844 }); await p.waitForTimeout(500);
  const kick = await p.evaluate(() => STUDIO.lavoro);
  ok('ma con Twitch, che e\' solo orizzontale, dritto resta orizzontale: nessuna destinazione si perde; con Kick torna verticale', twitch.f === 'o' && twitch.formati.o && !twitch.formati.v && kick === 'v', JSON.stringify({ twitch, kick }));

  const salute = await p.evaluate(() => {
    const prima = { live: STUDIO.live, dirette: STUDIO.dirette };
    let fot = 0, sal = 0;
    STUDIO.live = true; STUDIO.startedAt = Date.now();
    const nom = STUDIO_QUAL[STUDIO.qual].vbps / 1000;
    STUDIO.dirette = { o: { cod: { stato: () => ({ fotogrammi: fot, saltati: sal, kbps: nom, ritardoMs: 120 }) } } };
    const st = { live: true, destinazioni: ['Kick'], kbpsVeri: Math.round(nom * 0.98), inRiserva: {} };
    studioSaluteMisura('o', st);
    STUDIO.dirette.o.misura.t -= 2000; fot = 60; sal = 0; studioSaluteMisura('o', st);
    const buona = studioSaluteVoci(STUDIO.dirette.o.salute).map((v) => v.k + ':' + v.liv);
    STUDIO.dirette.o.misura.t -= 2000; fot = 108; sal = 12; studioSaluteMisura('o', { ...st, kbpsVeri: Math.round(nom * 0.3) });
    const brutta = studioSaluteVoci(STUDIO.dirette.o.salute).map((v) => v.k + ':' + v.liv);
    STUDIO.tel.foglio = 'altro'; renderStudioTelFoglio();
    const foglio = document.querySelector('#tel-foglio .tel-salute')?.textContent || '';
    renderStudioSalute();
    const barra = document.getElementById('studio-salute')?.textContent || '';
    STUDIO.live = prima.live; STUDIO.dirette = prima.dirette; STUDIO.tel.foglio = ''; renderStudioTelFoglio(); renderStudioSalute();
    return { buona, brutta, foglio, barra, rete: null };
  });
  ok('la salute della diretta si legge come in OBS: Mbps, fps, scarti, invio, coi colori della gravita\'', salute.buona.every((x) => x.endsWith(':ok')) && salute.brutta.includes('saltati:guasto') && salute.brutta.includes('kbps:guasto') && /Mbps/.test(salute.foglio) && /fps/.test(salute.foglio) && /LIVE/.test(salute.barra), JSON.stringify(salute));
  ok('nessun errore di pagina nella regia', err.length === 0, err.join(' | '));
  await p.close();
}

// ---------------------------------------------------------------- fotocamera sul telefono
// La fotocamera finta e' una tela dipinta (rosso a sinistra, blu a destra,
// verde in cima, grigio in mezzo) mandata in un <video>: si legge sulla tela
// del programma quale parte del frame va in onda. Cambiarle misura e' come
// girare il telefono: il <video> manda 'resize', come quello vero.
console.log('Fotocamera sul telefono (390×844, a tocco):');
{
  const { p, err } = await apri({ width: 390, height: 844, telefono: true });
  await p.waitForFunction(() => STUDIO.tel?.aperta, null, { timeout: 10000 }).catch(() => {});
  await p.evaluate(() => { studioTelScegliScenario('giro'); studioMobileFormato('v'); STUDIO.tel.foglio = ''; renderStudioTel(); });
  const vinc = await p.evaluate(() => { const v = studioVincoliVideo(); return { w: v.width.ideal, h: v.height.ideal, lavoro: STUDIO.lavoro }; });
  ok('la fotocamera si chiede in orizzontale anche andando in verticale: e\' il telefono a girarla come lo tieni', vinc.w > vinc.h && vinc.lavoro === 'v', JSON.stringify(vinc));

  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
    const dipingi = () => { const g = c.getContext('2d'), w = c.width, h = c.height; g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff0000'; g.fillRect(0, 0, w * 0.2, h); g.fillStyle = '#0000ff'; g.fillRect(w * 0.8, 0, w * 0.2, h); g.fillStyle = '#00ff00'; g.fillRect(w * 0.2, 0, w * 0.6, h * 0.1); };
    dipingi(); setInterval(dipingi, 50);
    window.__finta = { c, dipingi };
    const stream = c.captureStream(30), v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.srcObject = stream; v.addEventListener('resize', studioCamForma);
    await v.play().catch(() => {});
    STUDIO.cap.camStream = stream; STUDIO.cap.camEl = v;
    clearInterval(window.__muovi);
    // qui si misura la fotocamera nel suo riquadro: l'overlay (che in verticale
    // mette l'alert proprio sulla banda di sopra) e' un'altra prova
    for (const sc of STUDIO.doc.scene) for (const f of sc.fonti) if (f.tipo === 'overlay') { f.pos.o.vis = false; f.pos.v.vis = false; }
    STUDIO.doc.inOnda = STUDIO.doc.scene.find((s) => s.fonti.some((f) => f.tipo === 'webcam')).id;
    studioCamDopo(); avviaLoopStudio(); renderStudioTutto();
  });
  await p.waitForFunction(() => STUDIO.cap.camEl.videoWidth === 1280, null, { timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(400);
  const px = (fx, fy) => p.evaluate(([fx, fy]) => { const c = STUDIO.tele[STUDIO.lavoro], d = c.getContext('2d').getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data; return [d[0], d[1], d[2]]; }, [fx, fy]);
  const tinta = ([r, g, b]) => (r > 170 && g < 90 && b < 90 ? 'rosso' : b > 170 && r < 90 && g < 90 ? 'blu' : g > 170 && r < 90 && b < 90 ? 'verde' : Math.abs(r - 128) < 32 && Math.abs(g - 128) < 32 && Math.abs(b - 128) < 32 ? 'grigio' : `${r},${g},${b}`);
  const riga = async (fy) => [tinta(await px(0.05, fy)), tinta(await px(0.5, fy)), tinta(await px(0.95, fy))].join(' ');
  const attendi = () => p.waitForTimeout(350);

  const oriz = await riga(0.5), banda = await px(0.5, 0.12);
  const fondoBanda = Math.abs(banda[0] - 11) + Math.abs(banda[1] - 11) + Math.abs(banda[2] - 15);
  const avvisoDritto = await p.evaluate(() => document.getElementById('tel-avviso').textContent);
  ok('un\'immagine orizzontale in verticale si vede intera: niente zoom di tre volte', oriz === 'rosso grigio blu', oriz);
  ok('e sopra e sotto c\'e\' lo sfondo sfumato, non il nero', oriz === 'rosso grigio blu' && fondoBanda > 40, banda.join(','));
  ok('e la regia dice di tenere il telefono dritto', /dritto|upright/i.test(avvisoDritto), avvisoDritto);

  await clic(p, '[data-tel="camera"]');
  await clic(p, '[data-cam-adatta="ritaglia"]'); await attendi();
  const riempi = await riga(0.5), cima = tinta(await px(0.5, 0.03));
  ok('«Riempi» riempie lo schermo tagliando i lati, solo se lo chiedi', riempi === 'grigio grigio grigio' && cima === 'verde', `${riempi} / cima ${cima}`);
  await clic(p, '[data-cam-adatta="auto"]');
  await p.evaluate(() => { const { c, dipingi } = window.__finta; c.width = 720; c.height = 1280; dipingi(); });
  await p.waitForFunction(() => STUDIO.cap.camEl.videoWidth === 720, null, { timeout: 5000 }).catch(() => {});
  await attendi();
  const dritto = await riga(0.5), cimaD = tinta(await px(0.5, 0.03));
  ok('girato il telefono dritto, la fotocamera riempie lo schermo senza ingrandire: si vede tutto quello che vede', dritto === 'rosso grigio blu' && cimaD === 'verde', `${dritto} / cima ${cimaD}`);

  await assicura(p);
  const tondi = await p.evaluate(() => [...document.querySelectorAll('.tel-cam button')].map((b) => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), basso: r.top > innerHeight / 2, coperto: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) !== b && !b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }; }));
  ok('i tasti della fotocamera sulla tela sono da pollice: 48 punti, nella meta\' bassa, scoperti', tondi.length === 2 && tondi.every((t) => t.w >= 48 && t.h >= 48 && t.basso && !t.coperto), JSON.stringify(tondi));
  await clic(p, '#tel-zoom-passo'); await attendi();
  const z2 = { z: await p.evaluate(() => STUDIO.cam.zoom), testo: await p.evaluate(() => document.getElementById('tel-zoom-passo').textContent), riga: await riga(0.5) };
  ok('il tasto «1×» ingrandisce a 2×: senza zoom della fotocamera lo fa lo Studio', z2.z === 2 && z2.testo === '2×' && z2.riga === 'grigio grigio grigio', JSON.stringify(z2));
  await clic(p, '#tel-zoom-passo'); const z3 = await p.evaluate(() => STUDIO.cam.zoom);
  await clic(p, '#tel-zoom-passo'); const z1 = await p.evaluate(() => STUDIO.cam.zoom);
  ok('e a tocchi va a 3× e torna a 1×', z3 === 3 && z1 === 1, `${z3}, ${z1}`);

  const dita = (tipo, id, x, y) => p.evaluate(([tipo, id, x, y]) => { const t = document.getElementById('tel-palco'); t.dispatchEvent(new PointerEvent(tipo, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, bubbles: true, cancelable: true })); }, [tipo, id, x, y]);
  await dita('pointerdown', 1, 150, 420); await dita('pointerdown', 2, 240, 420);
  for (const x of [270, 300, 330]) await dita('pointermove', 2, x, 420);
  const pz = await p.evaluate(() => STUDIO.cam.zoom);
  for (const k of [1, 2, 3]) { await dita('pointermove', 1, 150 + k * 50, 420); await dita('pointermove', 2, 330 + k * 50, 420); }
  await dita('pointerup', 1, 300, 420); await dita('pointerup', 2, 480, 420); await attendi();
  const sp = { zoom: pz, cx: await p.evaluate(() => studioCamFonte().inq.v.cx), sx: tinta(await px(0.05, 0.5)) };
  ok('con due dita si ingrandisce e, spostandole insieme, si sposta l\'inquadratura', Math.abs(sp.zoom - 2) < 0.05 && sp.cx < -0.5 && sp.sx === 'rosso', JSON.stringify(sp));
  ok('l\'inquadratura spostata si salva con la scena', await p.evaluate(() => STUDIO.salvo.stato === 'attesa' || !!STUDIO.salvo.timer || STUDIO.salvo.stato === 'salvato'));

  await p.evaluate(() => { studioCamZoom(1, false); studioCamCentra(); });
  await assicura(p); await clic(p, '[data-tel="camera"]');
  await clic(p, '[data-tel="specchio"]'); await attendi();
  const sp1 = await riga(0.5), ricordo = await p.evaluate(() => JSON.parse(localStorage.getItem('andrybot-studio-cam:' + studioChi()) || '{}').specchio);
  ok('«Specchia» rovescia la fotocamera davanti, anche in onda, e il telefono se lo ricorda', sp1 === 'blu grigio rosso' && ricordo === true, `${sp1} · ${ricordo}`);
  await clic(p, '[data-tel="specchio"]'); await attendi();

  await p.evaluate(() => {
    const tr = STUDIO.cap.camStream.getVideoTracks()[0];
    window.__zoomHw = [];
    tr.getCapabilities = () => ({ zoom: { min: 1, max: 8, step: 0.1 } });
    tr.getSettings = () => ({ zoom: 1, deviceId: 'finta' });
    tr.applyConstraints = async (c) => { window.__zoomHw.push(c.advanced[0].zoom); };
    studioCamDopo();
  });
  await assicura(p);
  await clic(p, '#tel-zoom-passo'); await attendi();
  const hw = { chiesti: await p.evaluate(() => window.__zoomHw), riga: await riga(0.5) };
  ok('se la fotocamera ha uno zoom suo, lo Studio usa quello: l\'immagine resta nitida e non si ritaglia due volte', hw.chiesti.includes(2) && hw.riga === 'rosso grigio blu', JSON.stringify(hw));
  await p.evaluate(() => { STUDIO.cap.camStream.getVideoTracks()[0].applyConstraints = async () => { throw new Error('no'); }; });
  await clic(p, '#tel-zoom-passo'); await attendi();
  const rif = { hw: await p.evaluate(() => STUDIO.cam.hw), z: await p.evaluate(() => STUDIO.cam.zoom), riga: await riga(0.5) };
  ok('se la fotocamera rifiuta lo zoom, lo fa lo Studio: lo zoom non resta mai senza effetto', rif.hw === null && rif.z === 3 && rif.riga === 'grigio grigio grigio', JSON.stringify(rif));
  await p.evaluate(() => studioCamZoom(1, false));

  await p.evaluate(() => {
    const finte = { a: 'environment', b: 'user' };
    STUDIO.dev.cams = [{ deviceId: 'a', label: 'camera2 0, facing back' }, { deviceId: 'b', label: 'camera2 1, facing front' }, { deviceId: 'c', label: '' }];
    STUDIO.dev.mics = [{ deviceId: 'm1', label: 'Microfono iPhone' }, { deviceId: 'm2', label: 'AirPods' }];
    window.__chiesti = [];
    navigator.mediaDevices.enumerateDevices = async () => [...STUDIO.dev.cams.map((d) => ({ ...d, kind: 'videoinput' })), ...STUDIO.dev.mics.map((d) => ({ ...d, kind: 'audioinput' }))];
    navigator.mediaDevices.getUserMedia = async ({ video }) => {
      const id = video.deviceId?.exact || '', fm = video.facingMode || '';
      window.__chiesti.push(id || fm);
      if (id === 'zzz') { const e = new Error('non c\'e\''); e.name = 'OverconstrainedError'; throw e; }
      const lato = id ? finte[id] || 'environment' : fm, dev = id || (fm === 'user' ? 'b' : 'a');
      const s = window.__finta.c.captureStream(30), tr = s.getVideoTracks()[0];
      tr.getSettings = () => ({ deviceId: dev, facingMode: lato }); tr.getCapabilities = () => ({});
      return s;
    };
    STUDIO.tel.foglio = 'camera'; renderStudioTelFoglio();
  });
  const lenti = await p.evaluate(() => [...document.querySelectorAll('[data-tel-lente]')].map((b) => b.textContent.trim()));
  ok('il foglio Fotocamera elenca gli obiettivi coi nomi del telefono', lenti.join('|') === 'Dietro 1|Davanti 2|Fotocamera 3', lenti.join('|'));
  await clic(p, '[data-tel-lente="a"]'); await p.waitForTimeout(500);
  const l1 = await p.evaluate(() => ({ lente: STUDIO.dev.lente.environment, facing: STUDIO.dev.facing, camId: STUDIO.dev.camId, attivo: document.querySelector('[data-tel-lente="a"]')?.classList.contains('attivo') }));
  const vista = await p.evaluate(() => { const f = document.getElementById('tel-foglio'); return { nome: document.querySelector('.tel-cam-nome span')?.textContent || '', stato: document.querySelector('#tel-foglio [data-cam-stato]')?.textContent || '', alto: f.scrollHeight, visto: f.clientHeight }; });
  ok('sulla tela si legge quale fotocamera e\' in uso, e il foglio dice obiettivo, zoom e inquadratura', vista.nome === 'Dietro 1' && /^Dietro 1 · 1×/.test(vista.stato), JSON.stringify(vista));
  ok('il foglio Fotocamera sta tutto in una schermata: obiettivi, zoom, inquadratura e qualita\' senza scorrere', vista.alto <= vista.visto + 1, JSON.stringify(vista));
  await clic(p, '[data-tel="gira"]'); await p.waitForTimeout(500);
  await clic(p, '[data-tel="gira"]'); await p.waitForTimeout(500);
  const giri = await p.evaluate(() => window.__chiesti.slice(-2));
  ok('l\'obiettivo scelto si ricorda per quel lato: girando e tornando torna quello', l1.lente === 'a' && l1.facing === 'environment' && l1.camId === '' && l1.attivo && giri.join() === 'user,a', JSON.stringify({ l1, giri }));
  await p.evaluate(() => { STUDIO.dev.lente.environment = 'zzz'; STUDIO.dev.facing = 'user'; });
  await clic(p, '[data-tel="gira"]'); await p.waitForTimeout(500);
  const vecchia = await p.evaluate(() => ({ chiesti: window.__chiesti.slice(-2), lente: STUDIO.dev.lente.environment, cam: !!STUDIO.cap.camEl, facing: STUDIO.cam.facing }));
  ok('un obiettivo che non c\'e\' piu\' non lascia senza fotocamera: si torna a quello di serie, e lo si dimentica', vecchia.chiesti.join() === 'zzz,environment' && vecchia.lente === '' && vecchia.cam && vecchia.facing === 'environment', JSON.stringify(vecchia));

  await assicura(p); await clic(p, '[data-tel="camera"]');
  const primaQ = await p.evaluate(() => window.__chiesti.length);
  await clic(p, '[data-tel-qual="1080p30"]'); await p.waitForTimeout(500);
  const qual = await p.evaluate((n) => ({ qual: STUDIO.qual, h: studioVincoliVideo().height.ideal, riaperta: window.__chiesti.length > n }), primaQ);
  ok('la qualita\' si sceglie dal telefono, e la fotocamera si riapre alla misura nuova', qual.qual === '1080p30' && qual.h === 1080 && qual.riaperta, JSON.stringify(qual));
  await clic(p, '[data-tel-qual="720p30"]'); await p.waitForTimeout(300);

  await assicura(p); await clic(p, '[data-tel="altro"]');
  const altro = await p.evaluate(() => ({ torcia: !!document.querySelector('#tel-foglio [data-tel="torcia"]'), zoom: !!document.querySelector('#tel-foglio [data-cam-zoom]'), mic: [...document.querySelectorAll('#tel-foglio [data-tel-mic] option')].map((o) => o.textContent), cam: !!document.querySelector('#tel-foglio [data-tel="camera"]') }));
  ok('in «Altro» si sceglie il microfono (AirPods, esterno), e la fotocamera ha il suo foglio', altro.mic.length === 3 && altro.mic.includes('AirPods') && altro.cam && !altro.zoom && !altro.torcia, JSON.stringify(altro));

  await p.evaluate(() => studioTelChiudi()); await p.waitForTimeout(250);
  const pann = await p.evaluate(() => ({ tasto: !!document.querySelector('#studio-mobile-barra [data-tel="camera-da-pannello"]'), lente: getComputedStyle(document.getElementById('cerca-lancia') || document.body).display, h: Math.round(document.getElementById('studio-palco-prog').getBoundingClientRect().height), vh: innerHeight }));
  ok('nello Studio sul telefono niente bottoni volanti sopra i comandi, e la tela lascia posto ai tasti', pann.lente === 'none' && pann.h <= pann.vh * 0.5, JSON.stringify(pann));
  await clic(p, '#studio-mobile-barra [data-tel="camera-da-pannello"]'); await p.waitForTimeout(250);
  ok('«Zoom e obiettivo» dal pannello apre la regia sul foglio Fotocamera', pann.tasto && await p.evaluate(() => STUDIO.tel.aperta && STUDIO.tel.foglio === 'camera'));
  ok('nessun errore di pagina con la fotocamera', err.length === 0, err.join(' | '));
  await p.close();
}

// ---------------------------------------------------------------- fotocamera sul computer
console.log('Fotocamera sul computer (1280×900):');
{
  const { p, err } = await apri({ width: 1280, height: 900, telefono: false });
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 640; c.height = 480; c.getContext('2d').fillRect(0, 0, 640, 480);
    const v = document.createElement('video'); v.muted = true; v.srcObject = c.captureStream(10); await v.play().catch(() => {});
    STUDIO.cap.camStream = v.srcObject; STUDIO.cap.camEl = v; studioCamDopo();
    const f = studioAddFonte('webcam'); STUDIO.sel = f.id; renderStudioTutto(); studioApriImpostazioni?.();
  });
  await p.waitForTimeout(300);
  const d = await p.evaluate(() => ({ adatta: !!document.getElementById('sp-adatta'), cx: !!document.getElementById('sp-cx'), zoom: !!document.querySelector('#studio-cam-extra [data-cam-zoom]'), specchio: !!document.querySelector('#studio-cam-extra [data-cam-specchio]') }));
  ok('sul computer la fonte dice come sta nel riquadro, e la fotocamera ha zoom e specchio', d.adatta && d.cx && d.zoom && d.specchio, JSON.stringify(d));
  await p.evaluate(() => { const s = document.getElementById('sp-adatta'); s.value = 'intera'; s.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('e la scelta finisce nella scena, per il formato su cui lavori', await p.evaluate(() => studioTrovaFonte(STUDIO.sel).inq[STUDIO.lavoro].adatta === 'intera'));
  ok('nessun errore di pagina', err.length === 0, err.join(' | '));
  await p.close();
}

await b.close();
await chiudiSito();

const rossi = esiti.filter((e) => !e.vero);
if (rossi.length) { console.log(`\nLo Studio della diretta non mantiene ${rossi.length} promess${rossi.length === 1 ? 'a' : 'e'}.`); process.exit(1); }
console.log('\nLo Studio della diretta mantiene le sue promesse. ✓');
