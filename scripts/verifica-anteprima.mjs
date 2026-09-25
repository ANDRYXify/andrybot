// Cancello dell'ANTEPRIMA: la tela dell'editor ha le misure della diretta.
//
// L'editor disegna gli elementi con lo stesso CSS dell'overlay, su una tela di
// 1920x1080 scalata; ma "stesso CSS" non basta se chi veste l'elemento di qua
// non fa le stesse cose di chi lo veste di la'. E' successo: il player era
// largo quanto il titolo del brano finto (739 px nell'editor, 509 in diretta),
// la larghezza della chat non arrivava sulla tela, i contatori erano scalati
// due volte, il grassetto aveva il ripiego al contrario.
//
// Cosa misura, con Chromium vero: l'editor (pagina demo) e la pagina VERA
// dell'overlay (servita da un finto bot con lo stesso tema), stesso elemento,
// stessa configurazione, misure in pixel di tela. Devono coincidere:
//   1. il player: larghezza e altezza, con ogni tema e corpo, e in diretta la
//      larghezza non dipende dal titolo (corto o lunghissimo);
//   2. la chat: dimensione del carattere, altezza della riga, larghezza massima;
//   3. i widget: larghezza, altezza e carattere per ogni dimensione;
//   4. i contatori: larghezza e altezza a scala 150, e il peso del carattere
//      quando il grassetto non e' mai stato scelto.
//
// Uso: node scripts/verifica-anteprima.mjs            (esce 1 se qualcosa non torna)
//      node scripts/verifica-anteprima.mjs --selftest (rompe una cosa per volta)

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { apriSito, apriBrowser, overlayFinto } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');

const ROTTURE = [
  ['src/web/public/overlay-skin.css', '.ovl-musica .m-corpo { min-width: 0; width: var(--m-testo, 13em);', '.ovl-musica .m-corpo { min-width: 0; max-width: var(--m-testo, 13em);',
    'il player torna largo quanto il titolo'],
  ['src/web/public/app.js', "    apChat.style.maxWidth = Number(cst.larghezza) > 0 ? _arr((Number(cst.larghezza) / 100) * OVL_W) + 'px' : '';\n", '',
    'la larghezza della chat non arriva sulla tela'],
  ['src/web/public/app.js', "  box.style.fontSize = CONT_BASE + 'px';", "  box.style.fontSize = Math.round((CONT_BASE * (Number(st.s) || 100)) / 100) + 'px';",
    'i contatori scalati due volte'],
  ['src/web/public/app.js', "  box.style.fontWeight = o.grassetto ? '800' : '500';", "  box.style.fontWeight = o.grassetto === false ? '500' : '800';",
    'il grassetto dei contatori ha il ripiego al contrario'],
  ['src/web/public/riquadro.js', "    var k = Math.min((w / 100) * t.w / W, (h / 100) * t.h / H);", "    var k = (w / 100) * t.w / W;",
    'il riquadro guarda solo la larghezza: un alert alto trabocca'],
  ['src/web/public/overlay-app.js', "  if (chatBox.classList.contains('riquadro')) window.SB_RIQUADRO.ritaglia(chatBox);\n", '',
    'in diretta la chat nel riquadro non taglia dall\'alto'],
  ['src/web/public/overlay-app.js', "  if (window.PLAYER_VARS) window.PLAYER_VARS.applica(el, cfg);\n", '',
    'in diretta il player ignora le misure scelte pezzo per pezzo'],
  ['src/web/public/overlay-skin.css', "  min-width: 12em;\n  padding: calc(var(--m-py)", "  min-width: 12em; max-width: 27em;\n  padding: calc(var(--m-py)",
    'la carta del player ha di nuovo un tetto che ruba spazio al testo'],
  ['src/web/public/app.js', " el.style.setProperty(k, x); else el.style.removeProperty(k); } }", " el.style.setProperty(k, x); } }",
    'la tela tiene una variabile che nessuno ha piu\' chiesto'],
  ['src/web/public/riquadro.js', "    el.style.width = (fw / k) + 'px'; el.style.height = (fh / k) + 'px'; el.style.maxWidth = 'none';\n", '',
    'il riquadro torna un perimetro attorno a un elemento scalato, non la sua scatola'],
  ['src/web/public/presets.js', "      const libera = !!cfg && cfg.verso === 'libera';", "      const libera = false;",
    'nella disposizione libera le parti restano ai posti di serie'],
  ['src/web/public/overlay-app.js', "  for (const n of nodi) n.style.zIndex = String(1 + ordine.indexOf(n.dataset.el));\n", '',
    'in diretta i livelli tornano nell\'ordine del foglio di stile'],
  ['src/web/public/overlay-app.js', "window.SB_RIQUADRO.ordine(nodi.map((n) => n.dataset.el), MIO.ordine)", "window.SB_RIQUADRO.ordine(nodi.map((n) => n.dataset.el), [])",
    'in diretta l\'ordine dei livelli scelto nello Studio non arriva'],
  ['src/web/public/app.js', "    nodo.style.zIndex = String(1 + ordine.indexOf(e.k));\n", '',
    'la tela non segue l\'ordine dei livelli'],
  ['src/web/public/overlay-app.js', "  if (aSchermo(ev)) { el.classList.add(ev.schermo); palcoSchermo.appendChild(el); return; }\n", '',
    'un media a tutto schermo finisce nell\'area degli effetti'],
  ['src/web/public/overlay.html', "    #palco-schermo > .effetto.riempi { object-fit: cover; }\n", '',
    'a tutto schermo riempito si stira invece di coprire'],
  ['src/web/public/disegnati.js', "      DISEGNA[q.k](ctx, q, s, r);\n", '',
    'un disegno che non disegna niente'],
  ['src/web/public/overlay-app.js', "    else if (dati.tipo === 'immagine' || dati.tipo === 'video' || dati.tipo === 'disegno') { if (mostra('effetti')) {", "    else if (dati.tipo === 'immagine' || dati.tipo === 'video' || dati.tipo === 'disegno') { if (true) {",
    'a tutto schermo parte anche dove gli effetti sono spenti'],
  ['src/web/public/app.js', "    if (e.tipo === 'video') {\n      const v = document.createElement('video');", "    if (false) {\n      const v = document.createElement('video');",
    'nell\'anteprima del pannello il video non si vede'],
  ['src/web/public/app.js', "  chiaveColore(im.data, _hexRgb(k.colore), k.simile, k.morbido);\n", '',
    'nell\'anteprima del caricamento lo sfondo non si toglie'],
  ['src/web/public/app.js', "    if (chk.checked && _prima.prima && _prima.grezza && _prima.grezza.width) {", "    if (false) {",
    'spuntando la casella il colore da togliere non si prende dall\'angolo'],
  ['src/web/public/app.js', "    const tr = dec.tracks.selectedTrack;", "    const tr = null;",
    'nell\'anteprima un PNG animato resta fermo'],
  ['src/web/public/app.js', "  _prima.togli = file.type !== 'image/avif';", "  _prima.togli = true;",
    'da un AVIF il pannello fa togliere uno sfondo che in onda resterebbe'],
  ['src/web/public/app.js', "      if (d[3]) { document.getElementById('eff-chiave-colore').value", "      if (true) { document.getElementById('eff-chiave-colore').value",
    'dove l\'angolo e\' trasparente la casella prende un colore che non si vede'],
  ['src/web/public/overlay-app.js', "  v.n = Math.max(v.n, n);\n", "  v.n = n;\n",
    'con i fotogrammi in ritardo la combo torna indietro'],
];

// --selftest prova tutte le rotture; --selftest=<parola> solo quelle la cui
// descrizione contiene la parola (ogni giro apre due pagine per tutti i casi:
// chi ha appena aggiunto una rottura la prova da sola, senza aspettare le altre).
const _selftest = process.argv.find((a) => a === '--selftest' || a.startsWith('--selftest='));
if (_selftest) {
  const io = fileURLToPath(import.meta.url);
  const filtro = _selftest.includes('=') ? _selftest.slice(_selftest.indexOf('=') + 1) : '';
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
    if (filtro && !che.includes(filtro)) continue;
    const via = join(RAD, file);
    const orig = readFileSync(via, 'utf8');
    if (!orig.includes(da)) {
      console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`);
      cieche++;
      continue;
    }
    writeFileSync(via, orig.replace(da, a));
    let rosso = false, uscita = '';
    try { uscita = execFileSync(process.execPath, [io], { cwd: RAD, encoding: 'utf8', stdio: 'pipe' }); } catch (e) { rosso = true; uscita = String(e.stdout || ''); }
    writeFileSync(via, orig);
    if (/saltato: manca Chromium/.test(uscita)) { console.log('  ✗  senza Chromium l\'autoprova non prova niente'); process.exit(1); }
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche
    ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: il cancello non protegge quello che dice di proteggere.`
    : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
const vicino = (a, b, tol = 1.5) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
const mis = (o) => `${Math.round(o.w)}×${Math.round(o.h)}${o.font ? ' · ' + o.font + 'px' : ''}`;

const browser = await apriBrowser();
if (!browser) { console.log('  –  saltato: manca Chromium o Playwright'); process.exit(0); }

// il tema e il brano che il finto bot serve alla pagina dell'overlay: li scrive
// l'editor, caso per caso, cosi' le due pagine vestono la stessa cosa
let TEMA = null, MUSICA = { stato: 'niente' };
const MOSTRA = { alert: true, chat: true, wf: true, ws: true, goal: true, cont: true, musica: true, timer: true, treno: true, cart: true, pen: true, boss: true, scritta: true, etichetta: true, muro: true, effetti: true, consolify: true };
const ovl = overlayFinto({ tema: () => TEMA, musica: () => MUSICA });
const { base, chiudi } = await apriSito({ overlay: ovl });

// misura in pixel di TELA: nell'editor la tela e' scalata, in diretta e' 1920 di finestra
const MISURA = `(sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const stage = document.getElementById('ap-stage');
  const sc = stage ? stage.getBoundingClientRect().width / 1920 : 1;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { w: r.width / sc, h: r.height / sc, font: Math.round(parseFloat(cs.fontSize) * 10) / 10, peso: cs.fontWeight,
    maxW: cs.maxWidth === 'none' ? null : Math.round(parseFloat(cs.maxWidth) * 10) / 10 };
}`;

const TITOLO_LUNGO = 'Un titolo lunghissimo che non finisce piu, con featuring e remix (Extended Club Edit 2026)';
const brano = (nome) => ({ stato: 'suona', suona: true, nome, artisti: 'Artista', album: 'Album', q: 0.42, energia: 0.68, ms: 84000, durata: 200000, bpm: 120 });

try {
  const ed = await browser.newPage({ viewport: { width: 2000, height: 1200 } });
  const erroriEd = [];
  ed.on('pageerror', (e) => erroriEd.push(String(e.message || e)));
  await ed.goto(base + '/?demo=1&lang=it', { waitUntil: 'domcontentloaded' });
  await ed.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  await ed.evaluate(() => window.SB_APP.vai('alert'));
  await ed.waitForFunction(() => typeof aggiornaAnteprima === 'function' && document.getElementById('ap-stage'), null, { timeout: 20000 });
  await attesa(1200);
  const live = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const erroriLive = [];
  live.on('pageerror', (e) => erroriLive.push(String(e.message || e)));
  const apriLive = async (aspetta) => {
    await live.goto(base + '/overlay/prova?key=x', { waitUntil: 'domcontentloaded' });
    await live.waitForFunction(aspetta, null, { timeout: 8000 }).catch(() => {});
    await attesa(250);
  };
  // si misura A RIPOSO: entrate, uscite e gesti dei temi sono transizioni e
  // animazioni finite, e un rettangolo letto a meta' corsa non e' una misura
  const A_RIPOSO = 'Promise.all(document.getAnimations().filter((a) => a.playState === "running" && Number.isFinite(a.effect.getTiming().iterations)).map((a) => a.finished.catch(() => {})))';
  const misuraLive = async (sel) => { await live.evaluate(A_RIPOSO); return live.evaluate(`(${MISURA})(${JSON.stringify(sel)})`); };
  const misuraEd = async (sel) => { await ed.evaluate(A_RIPOSO); return ed.evaluate(`(${MISURA})(${JSON.stringify(sel)})`); };

  // --- 1. il player -------------------------------------------------------
  const XY = { x: 50, y: 50, s: 100, r: 0 };
  const CASI_PLAYER = [];
  for (const tema of ['nessuno', 'vinile', 'cd', 'cassetta', 'terminale', 'manga', 'esagono']) for (const corpo of ['normale', 'slim']) CASI_PLAYER.push({ tema, corpo, verso: 'riga', larghezza: 0 });
  CASI_PLAYER.push({ tema: 'nessuno', corpo: 'normale', verso: 'colonna', larghezza: 0 }, { tema: 'cassetta', corpo: 'slim', verso: 'riga', larghezza: 20 }, { tema: 'nessuno', corpo: 'normale', verso: 'libera', larghezza: 0 });
  for (const caso of CASI_PLAYER) {
    const nome = `player ${caso.tema}/${caso.corpo}/${caso.verso}${caso.larghezza ? '/testo ' + caso.larghezza + 'em' : ''}`;
    const cfg = await ed.evaluate(async ({ caso, XY }) => {
      const c = _cfgEl('musica');
      Object.assign(c, { attivo: true, verso: caso.verso, righe: 'una', cover: 'quadrata', barra: 'sotto', tempi: 'no', entrata: 'dissolvenza',
        quandoFermo: 'resta', ritmo: 'onde', sfondo: 'no', corpo: caso.corpo, tema: caso.tema, larghezza: caso.larghezza, scorre: true, daCopertina: false,
        testo: '{titolo} — {artista}', testo2: '{artista}' });
      _ovXY().musica = { ...XY };
      aggiornaAnteprima();
      await new Promise((r) => setTimeout(r, 350));
      return JSON.parse(JSON.stringify(c));
    }, { caso, XY });
    const e = await misuraEd('#ap-stage .ovl-musica');
    TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, stato: {}, mostra: MOSTRA, xy: { musica: XY }, musica: cfg, alertStile: null, chatStile: null };
    MUSICA = brano('Ok');
    await apriLive(() => document.querySelector('.ovl-musica.dentro'));
    const corto = await misuraLive('.ovl-musica');
    MUSICA = brano(TITOLO_LUNGO);
    await apriLive(() => document.querySelector('.ovl-musica.dentro'));
    const lungo = await misuraLive('.ovl-musica');
    const ok = e && corto && lungo && vicino(e.w, corto.w) && vicino(e.h, corto.h) && vicino(corto.w, lungo.w) && vicino(corto.h, lungo.h);
    dice(ok, `${nome}: editor ${e ? mis(e) : '–'} = diretta ${corto ? mis(corto) : '–'}, e col titolo lungo ${lungo ? mis(lungo) : '–'}`,
      !e || !corto || !lungo ? 'un lato non ha disegnato il player' : 'le misure non coincidono');
  }

  // --- 2. la chat ---------------------------------------------------------
  for (const dim of ['piccola', 'media', 'grande', 'enorme']) for (const larg of [18, 30, 60]) {
    const st = await ed.evaluate(async ({ dim, larg }) => {
      _imposta('co-st-dim', dim); _imposta('co-st-larg', larg);
      _ovXY().chat = { x: 50, y: 50, s: 100, r: 0 };
      aggiornaAnteprima();
      await new Promise((r) => setTimeout(r, 200));
      return _leggiChatStile();
    }, { dim, larg });
    const box = await misuraEd('#ap-chat');
    const riga = await misuraEd('#ap-chat .chat-riga');
    TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, musica: null, stato: {}, mostra: MOSTRA, xy: { chat: { x: 50, y: 50, s: 100, r: 0 } }, alertStile: null, chatStile: st };
    await apriLive(() => window.MIO && document.getElementById('chatlive'));
    await attesa(300);
    ovl.manda({ tipo: 'chat', user: 'MarioRossi', colore: '#ff4d4d', testo: 'ciao a tutti', max: 8, fadeSec: 0 });
    await live.waitForFunction(() => document.querySelector('#chatlive .chat-riga'), null, { timeout: 5000 }).catch(() => {});
    const boxL = await misuraLive('#chatlive');
    const rigaL = await misuraLive('#chatlive .chat-riga');
    const ok = box && riga && boxL && rigaL && vicino(box.maxW, boxL.maxW, 0.6) && vicino(riga.font, rigaL.font, 0.6) && vicino(riga.h, rigaL.h);
    dice(ok, `chat ${dim}, larghezza ${larg}: carattere ${riga ? riga.font : '–'}/${rigaL ? rigaL.font : '–'} px, riga alta ${riga ? Math.round(riga.h) : '–'}/${rigaL ? Math.round(rigaL.h) : '–'}, tetto ${box ? box.maxW : '–'}/${boxL ? boxL.maxW : '–'} px`,
      'editor e diretta non coincidono');
  }

  // --- 3. i widget --------------------------------------------------------
  for (const dim of ['piccola', 'media', 'grande', 'enorme']) {
    const w = await ed.evaluate(async (dim) => {
      _imposta('wf-attivo', true); _imposta('wf-dim', dim);
      _ovXY().wf = { x: 50, y: 50, s: 100, r: 0 };
      aggiornaAnteprima();
      await new Promise((r) => setTimeout(r, 200));
      return { ..._leggiWidget('wf'), attivo: true };
    }, dim);
    const e = await misuraEd('#ap-wf-el');
    TEMA = { css: '', widget: { ultimoFollower: w, ultimoSub: { attivo: false } }, goals: [], conti: {}, timer: null, musica: null,
      stato: { ultimoFollower: 'MarioRossi' }, mostra: MOSTRA, xy: { wf: { x: 50, y: 50, s: 100, r: 0 } }, alertStile: null, chatStile: null };
    await apriLive(() => document.querySelector('.ovl-widget .w-testo b'));
    const l = await misuraLive('.ovl-widget');
    const ok = e && l && vicino(e.w, l.w) && vicino(e.h, l.h) && vicino(e.font, l.font, 0.6);
    dice(ok, `widget ${dim}: editor ${e ? mis(e) : '–'} = diretta ${l ? mis(l) : '–'}`, 'editor e diretta non coincidono');
  }

  // --- 4. i contatori -----------------------------------------------------
  // due strade: la posizione data in questo overlay (scala 150 sulla tela), e il
  // seme (nessuna posizione qui, la dimensione scelta nella scheda dei contatori:
  // 60 px, cioe' scala 150 dal seme). La seconda e' dove si scalava due volte.
  const CASI_CONT = [
    { nome: 'contatore a scala 150 in questo overlay', dim: 40, grassetto: true, xy: { x: 50, y: 50, s: 150, r: 0 } },
    { nome: 'contatore a scala 150, grassetto mai scelto', dim: 40, grassetto: undefined, xy: { x: 50, y: 50, s: 150, r: 0 } },
    { nome: 'contatore dal seme, dimensione 60 nella sua scheda', dim: 60, grassetto: true, xy: null },
  ];
  for (const caso of CASI_CONT) {
    const c = await ed.evaluate(async (caso) => {
      const e = ELEMENTI().find((x) => x.cont);
      if (!e) return null;
      const o = e.cont.overlayCfg = { ...(e.cont.overlayCfg || {}), mostra: true, dim: caso.dim, font: 'system', colore: '#ffffff', sfondo: 'rgba(0,0,0,0.55)', x: 50, y: 50, r: 0 };
      if (caso.grassetto === undefined) delete o.grassetto; else o.grassetto = caso.grassetto;
      e.cont._st = _stCont(e.cont);
      if (caso.xy) _ovXY()[e.k] = { ...caso.xy }; else delete _ovXY()[e.k];
      aggiornaAnteprima();
      await new Promise((r) => setTimeout(r, 200));
      const box = document.querySelector('#ap-stage .contatore-widget');
      return { k: e.k, comando: e.cont.comando, testo: box ? box.textContent : '' };
    }, caso);
    if (!c) { dice(false, 'contatori: la demo non ne ha uno da misurare'); break; }
    const e = await misuraEd('#ap-stage .contatore-widget');
    TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, musica: null, stato: {}, mostra: MOSTRA, xy: caso.xy ? { [c.k]: caso.xy } : {}, alertStile: null, chatStile: null };
    await apriLive(() => window.MIO && window.MIO.mostra && window.MIO.mostra.consolify === true);
    await attesa(200);
    ovl.manda({ tipo: 'contatore', comando: c.comando, mostra: true, testo: c.testo, x: 50, y: 50, r: 0, colore: '#ffffff', sfondo: 'rgba(0,0,0,0.55)', dim: caso.dim, grassetto: !!caso.grassetto, font: 'system' });
    await live.waitForFunction(() => document.querySelector('.contatore-widget'), null, { timeout: 5000 }).catch(() => {});
    const l = await misuraLive('.contatore-widget');
    const ok = e && l && vicino(e.w, l.w) && vicino(e.h, l.h) && e.peso === l.peso;
    dice(ok, `${caso.nome}: editor ${e ? mis(e) : '–'} peso ${e ? e.peso : '–'} = diretta ${l ? mis(l) : '–'} peso ${l ? l.peso : '–'}`,
      'editor e diretta non coincidono');
  }

  // --- 5. i riquadri --------------------------------------------------------
  // un riquadro di due caselle per tre (16,67% × 25%): la chat lo riempie e non
  // trabocca; alert, widget e player si adattano allo stesso modo di qua e di la'
  const RQ = { chat: { x: 10, y: 10, w: 16.67, h: 25, r: 0 }, wf: { x: 60, y: 60, w: 20, h: 10, r: 0 }, musica: { x: 5, y: 60, w: 30, h: 12, r: 0 }, alert: { x: 30, y: 5, w: 40, h: 15, r: 0 } };
  const cfgRq = await ed.evaluate(async (RQ) => {
    const c = _cfgEl('musica');
    Object.assign(c, { attivo: true, verso: 'riga', righe: 'una', cover: 'quadrata', barra: 'sotto', tempi: 'no', entrata: 'dissolvenza', quandoFermo: 'resta',
      ritmo: 'onde', sfondo: 'no', corpo: 'normale', tema: 'nessuno', larghezza: 0, scorre: true, daCopertina: false, testo: '{titolo} — {artista}', testo2: '{artista}' });
    _imposta('co-st-dim', 'media'); _imposta('co-st-larg', 30); _imposta('wf-attivo', true); _imposta('wf-dim', 'media'); _imposta('al-st-icon', false);
    const xy = _ovXY();
    for (const k of Object.keys(RQ)) xy[k] = { ...RQ[k] };
    aggiornaAnteprima();
    await new Promise((r) => setTimeout(r, 400));
    return { musica: JSON.parse(JSON.stringify(c)), chat: _leggiChatStile(), wf: { ..._leggiWidget('wf'), attivo: true }, alert: _leggiAlertStile ? _leggiAlertStile() : { icona: false },
      testoAlert: document.querySelector('#ap-alert-testo')?.textContent || '' };
  }, RQ);
  const edRq = { chat: await misuraEd('#ap-chat'), wf: await misuraEd('#ap-wf-el'), musica: await misuraEd('#ap-stage .ovl-musica'), alert: await misuraEd('#ap-alert') };
  const righeEd = await ed.evaluate(() => { const b = document.getElementById('ap-chat'); return { n: b.children.length, trabocca: window.SB_RIQUADRO.trabocca(b) }; });
  TEMA = { css: '', widget: { ultimoFollower: cfgRq.wf, ultimoSub: { attivo: false } }, goals: [], conti: {}, timer: null, musica: cfgRq.musica,
    stato: { ultimoFollower: 'MarioRossi' }, mostra: MOSTRA, xy: RQ, alertStile: { icona: false }, chatStile: cfgRq.chat };
  MUSICA = brano(TITOLO_LUNGO);
  await apriLive(() => document.querySelector('.ovl-musica.dentro') && document.querySelector('.ovl-widget .w-testo b'));
  for (let i = 0; i < 8; i++) ovl.manda({ tipo: 'chat', user: 'utente' + i, colore: '#ff4d4d', testo: 'una riga di chat abbastanza lunga da andare a capo dentro un riquadro stretto numero ' + i, max: 20, fadeSec: 0 });
  ovl.manda({ tipo: 'alert', kind: 'sub', testo: cfgRq.testoAlert, colore: '#ff4d4d', durata: 30000 });
  await live.waitForFunction(() => document.querySelectorAll('#chatlive .chat-riga').length >= 1 && document.querySelector('#alert .alert-card.dentro'), null, { timeout: 6000 }).catch(() => {});
  await attesa(500);
  const lvRq = { chat: await misuraLive('#chatlive'), wf: await misuraLive('.ovl-widget:not(.ovl-musica)'), musica: await misuraLive('.ovl-musica'), alert: await misuraLive('#alert .alert-card') };
  const righeLv = await live.evaluate(() => { const b = document.getElementById('chatlive'); return { n: b.children.length, trabocca: window.SB_RIQUADRO.trabocca(b) }; });
  const rqPx = (k) => ({ w: RQ[k].w / 100 * 1920, h: RQ[k].h / 100 * 1080 });
  const c = rqPx('chat');
  dice(edRq.chat && lvRq.chat && vicino(edRq.chat.w, c.w) && vicino(edRq.chat.h, c.h) && vicino(lvRq.chat.w, c.w) && vicino(lvRq.chat.h, c.h),
    `chat nel riquadro 2×3: la scatola e' il riquadro (${Math.round(c.w)}×${Math.round(c.h)}) — editor ${edRq.chat ? mis(edRq.chat) : '–'}, diretta ${lvRq.chat ? mis(lvRq.chat) : '–'}`);
  dice(righeLv.n >= 1 && righeLv.n < 8 && !righeLv.trabocca && !righeEd.trabocca, `e la chat non trabocca: di otto righe lunghe in diretta ne restano ${righeLv.n}, quelle che ci stanno, nessuna tagliata a meta'`,
    'righe fuori dal riquadro, o nessuna tolta');
  for (const k of ['wf', 'musica', 'alert']) {
    const e = edRq[k], l = lvRq[k], r = rqPx(k);
    const scatola = (m) => m && vicino(m.w, r.w, 2.5) && vicino(m.h, r.h, 2.5);
    dice(scatola(e) && scatola(l),
      `${k} nel riquadro ${RQ[k].w}×${RQ[k].h}%: la scatola e' il riquadro (${Math.round(r.w)}×${Math.round(r.h)}), di qua e di la' — editor ${e ? mis(e) : '–'}, diretta ${l ? mis(l) : '–'}`);
  }
  // la larghezza da' spazio al testo: nel riquadro la colonna del player cresce
  // oltre i suoi 13em, e cresce uguale di qua e di la'
  const corpoRq = { e: await misuraEd('#ap-stage .ovl-musica .m-corpo'), l: await misuraLive('.ovl-musica .m-corpo') };
  const kRq = await live.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.ovl-musica')).transform).a || 1);
  dice(corpoRq.e && corpoRq.l && corpoRq.l.w / kRq > 13 * 33.6 + 2 && vicino(corpoRq.e.w, corpoRq.l.w, 2),
    `nel riquadro la colonna del testo del player prende lo spazio che c'e' (${corpoRq.l ? Math.round(corpoRq.l.w / kRq) : '–'} px prima della scala, piu' dei 13em di serie), uguale di qua e di la' — editor ${corpoRq.e ? Math.round(corpoRq.e.w) : '–'}, diretta ${corpoRq.l ? Math.round(corpoRq.l.w) : '–'}`);
  // tirando i bordi della chat sulla tela le righe escono e tornano: la tela non le perde
  const righeVanno = await ed.evaluate(async (RQ) => {
    const b = document.getElementById('ap-chat');
    const conta = () => b.querySelectorAll('.chat-riga').length;
    const prima = conta();
    _posElemento(b, { ...RQ.chat, h: 8 }); const poche = conta();
    _posElemento(b, { ...RQ.chat }); const tornate = conta();
    return { prima, poche, tornate };
  }, RQ);
  dice(righeVanno.prima >= 3 && righeVanno.poche < righeVanno.prima && righeVanno.tornate === righeVanno.prima,
    `stringendo il riquadro della chat sulla tela le righe escono (${righeVanno.prima} → ${righeVanno.poche}), allargandolo tornano (${righeVanno.tornate}): la tela non le perde`);
  // e un riquadro quasi quadrato fa un player quasi quadrato: la forma la decide chi tira i bordi
  const QUAD = { x: 60, y: 30, w: 15, h: 26, r: 0 };
  await ed.evaluate(async (Q) => { _ovXY().musica = { ...Q }; aggiornaAnteprima(); await new Promise((r) => setTimeout(r, 350)); }, QUAD);
  const eQ = await misuraEd('#ap-stage .ovl-musica');
  TEMA = { ...TEMA, xy: { ...RQ, musica: QUAD } };
  await apriLive(() => document.querySelector('.ovl-musica.dentro'));
  const lQ = await misuraLive('.ovl-musica');
  const rQ = { w: QUAD.w / 100 * 1920, h: QUAD.h / 100 * 1080 };
  dice(eQ && lQ && vicino(eQ.w, rQ.w, 2.5) && vicino(eQ.h, rQ.h, 2.5) && vicino(lQ.w, rQ.w, 2.5) && vicino(lQ.h, rQ.h, 2.5),
    `player in un riquadro ${QUAD.w}×${QUAD.h}% (${Math.round(rQ.w)}×${Math.round(rQ.h)}): quadrato di qua e di la' — editor ${eQ ? mis(eQ) : '–'}, diretta ${lQ ? mis(lQ) : '–'}`);

  // --- 6. la sfida a tempo -------------------------------------------------
  const cfgPen = await ed.evaluate(async () => {
    const c = _cfgEl('pen'); c.attivo = true; c.durataMin = 2; c.overlay = { posizione: 'alto-destra', colore: '#ff2d2d' };
    const xy = _ovXY(); for (const k of Object.keys(xy)) delete xy[k];
    xy.pen = { x: 50, y: 50, s: 100, r: 0 };
    aggiornaAnteprima();
    await new Promise((r) => setTimeout(r, 300));
    return true;
  });
  const edPen = cfgPen ? await misuraEd('#ap-pen .pen-card') : null;
  TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, musica: null, stato: {}, mostra: MOSTRA, xy: { pen: { x: 50, y: 50, s: 100, r: 0 } }, alertStile: null, chatStile: null };
  await apriLive(() => window.MIO && window.MIO.mostra && window.MIO.mostra.pen === true);
  await attesa(200);
  ovl.manda({ azione: 'start', id: 'p1', modo: 'vieta', cosa: 'parola', valore: 'esempio', durata: 2, posizione: 'alto-destra', colore: '#ff2d2d', tipo: 'penitenza' });
  await live.waitForFunction(() => document.querySelector('#penitenze .pen-card.dentro'), null, { timeout: 5000 }).catch(() => {});
  const lvPen = await misuraLive('#penitenze .pen-card');
  dice(edPen && lvPen && vicino(edPen.w, lvPen.w) && vicino(edPen.h, lvPen.h) && vicino(edPen.font, lvPen.font, 0.6),
    `sfida a tempo: editor ${edPen ? mis(edPen) : '–'} = diretta ${lvPen ? mis(lvPen) : '–'}`, 'editor e diretta non coincidono');

  // --- 6-bis. l'hype train ---------------------------------------------------
  // Il treno lo disegna Twitch, non noi: quindi l'unica cosa che puo' scollarsi
  // e' il modo in cui lo DISEGNIAMO, ed e' proprio quel che si misura qui. Lo
  // stato e' lo stesso di qua e di la' — l'editor legge il treno vero del
  // canale, come la diretta.
  const TRENO_FINTO = { id: 't1', livello: 4, quanto: 320, meta: 800, totale: 2100, tipo: 'normale',
    condiviso: false, inizio: Date.now() - 120000, scade: Date.now() + 480000, finito: false, record: 11,
    chi: [{ nome: 'Mario', quanti: 900, come: 'bit' }] };
  const cfgTreno = await ed.evaluate(async (t) => {
    const c = _cfgEl('treno');
    Object.assign(c, { attivo: true, titolo: 'Hype train', mostraChi: true, mostraRecord: true, posizione: 'alto-destra' });
    impostazioni().overlayStato.treno = t;
    const xy = _ovXY(); for (const k of Object.keys(xy)) delete xy[k];
    xy.treno = { x: 50, y: 50, s: 100, r: 0 };
    aggiornaAnteprima();
    await new Promise((r) => setTimeout(r, 300));
    return true;
  }, TRENO_FINTO);
  const edTreno = cfgTreno ? await misuraEd('#ap-treno .ovl-treno') : null;
  TEMA = { css: '', widget: {}, goals: [], conti: {},
    timer: null, musica: null, treno: { attivo: true, titolo: 'Hype train', mostraChi: true, mostraRecord: true, posizione: 'alto-destra', stile: {} },
    stato: { treno: TRENO_FINTO }, mostra: MOSTRA, xy: { treno: { x: 50, y: 50, s: 100, r: 0 } }, alertStile: null, chatStile: null };
  await apriLive(() => document.querySelector('.ovl-treno'));
  await attesa(200);
  const lvTreno = await misuraLive('.ovl-treno');
  dice(edTreno && lvTreno && vicino(edTreno.w, lvTreno.w) && vicino(edTreno.h, lvTreno.h) && vicino(edTreno.font, lvTreno.font, 0.6),
    `hype train: editor ${edTreno ? mis(edTreno) : '–'} = diretta ${lvTreno ? mis(lvTreno) : '–'}`, 'editor e diretta non coincidono');
  const testiTreno = await Promise.all([
    ed.evaluate(() => { const n = document.querySelector('#ap-treno .ovl-treno'); return n ? [n.querySelector('.tr-liv').textContent, n.querySelector('.tr-chi').textContent] : null; }),
    live.evaluate(() => { const n = document.querySelector('.ovl-treno'); return n ? [n.querySelector('.tr-liv').textContent, n.querySelector('.tr-chi').textContent] : null; }),
  ]);
  dice(testiTreno[0] && testiTreno[1] && testiTreno[0][0] === testiTreno[1][0] && testiTreno[0][1] === testiTreno[1][1],
    `hype train: stesso livello e stesso nome di qua e di la' — editor «${(testiTreno[0] || []).join(' · ')}», diretta «${(testiTreno[1] || []).join(' · ')}»`,
    'l\'editor racconta un treno diverso da quello in onda');

  // --- 6-quater. il boss ----------------------------------------------------
  // docs/OVERLAY.md, «Gli ultimi pezzi fuori dalla scena». La carta dello
  // Studio e quella in onda sono la stessa: stessa grandezza e stesso posto,
  // messa in un punto e lasciata al suo angolo, con la veste di serie e con
  // una cambiata.
  const BOSS_VESTE = { dim: 'grande', sfondo: '#203040', opacita: 90, testo: '#ffffee', accento: '#22aa66', bordoRaggio: 6, font: 'sistema', forma: 'carta', materia: 'piatta', cornice: 'linea' };
  const DOVE = `(sel) => { const el = document.querySelector(sel); if (!el) return null;
    const stage = document.getElementById('ap-stage'); const sc = stage ? stage.getBoundingClientRect().width / 1920 : 1;
    const o = stage ? stage.getBoundingClientRect() : { left: 0, top: 0 }; const r = el.getBoundingClientRect();
    return { x: (r.left - o.left) / sc, y: (r.top - o.top) / sc, w: r.width / sc, h: r.height / sc }; }`;
  for (const [nome, xy, stile] of [['in un punto', { x: 50, y: 50, s: 100, r: 0 }, null], ['al suo angolo', null, null], ['vestito', { x: 30, y: 70, s: 80, r: 0 }, BOSS_VESTE]]) {
    await ed.evaluate(async ({ xy, stile }) => {
      const c = _cfgEl('boss'); c.attivo = true; c.stile = { ..._defBoss().stile, ...(stile || {}) };
      const q = _ovXY(); for (const k of Object.keys(q)) delete q[k];
      if (xy) q.boss = { ...xy };
      aggiornaAnteprima();
      await new Promise((r) => setTimeout(r, 600));
    }, { xy, stile });
    const edBoss = await misuraEd('#ap-boss .ovl-boss');
    const edDove = await ed.evaluate(`(${DOVE})('#ap-boss .ovl-boss')`);
    const stileBoss = { ...(await ed.evaluate(() => _defBoss().stile)), ...(stile || {}) };
    TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, musica: null, stato: {}, mostra: MOSTRA, xy: xy ? { boss: xy } : {}, alertStile: null, chatStile: null,
      boss: { attivo: true, posizione: 'alto-centro', xy: null, stile: stileBoss } };
    await apriLive(() => window.MIO && window.MIO.boss);
    ovl.manda({ tipo: 'boss', azione: 'arriva', nome: 'Troll del Ritardo', vita: 240, vitaMax: 360, durata: 90 });
    await live.waitForFunction(() => document.querySelector('#boss .ovl-boss'), null, { timeout: 5000 }).catch(() => {});
    await attesa(600);
    const lvBoss = await misuraLive('#boss .ovl-boss');
    const lvDove = await live.evaluate(`(${DOVE})('#boss .ovl-boss')`);
    const testi = await Promise.all([ed, live].map((q, i) => q.evaluate((sel) => { const n = document.querySelector(sel); return n ? [n.querySelector('.boss-nome').textContent, n.querySelector('.boss-conto').textContent, getComputedStyle(n.querySelector('.boss-vita')).transform] : null; }, i ? '#boss .ovl-boss' : '#ap-boss .ovl-boss')));
    dice(edBoss && lvBoss && vicino(edBoss.w, lvBoss.w) && vicino(edBoss.h, lvBoss.h) && vicino(edBoss.font, lvBoss.font, 0.6)
      && edDove && lvDove && vicino(edDove.x, lvDove.x, 2) && vicino(edDove.y, lvDove.y, 2),
      `boss ${nome}: editor ${edBoss ? mis(edBoss) : '–'} a ${edDove ? Math.round(edDove.x) + ',' + Math.round(edDove.y) : '–'} = diretta ${lvBoss ? mis(lvBoss) : '–'} a ${lvDove ? Math.round(lvDove.x) + ',' + Math.round(lvDove.y) : '–'}`,
      'editor e diretta non coincidono');
    dice(testi[0] && testi[1] && testi[0].join('|') === testi[1].join('|'), `boss ${nome}: stesso nome, stessa vita, stessa barra — «${(testi[1] || []).slice(0, 2).join(' · ')}»`, JSON.stringify(testi));
  }

  // --- 6-quinquies. il testo a schermo -------------------------------------
  // La scritta che un comando manda con «Mostra testo sull'overlay»: stessa
  // grandezza e stesso posto sulla tela e in onda.
  const SCR_VESTE = { dim: 'grande', sfondo: '#101820', opacita: 70, testo: '#ffe0a0', accento: '#22aa66', bordoRaggio: 8, font: 'sistema', forma: 'carta', materia: 'piatta', cornice: 'linea' };
  const DOVE_S = `(sel) => { const el = document.querySelector(sel); if (!el) return null;
    const stage = document.getElementById('ap-stage'); const sc = stage ? stage.getBoundingClientRect().width / 1920 : 1;
    const o = stage ? stage.getBoundingClientRect() : { left: 0, top: 0 }; const r = el.getBoundingClientRect();
    return { x: (r.left - o.left) / sc, y: (r.top - o.top) / sc }; }`;
  for (const [nome, xy, stile] of [['in un punto', { x: 30, y: 30, s: 100, r: 0 }, null], ['al suo angolo', null, null], ['vestito', { x: 60, y: 75, s: 90, r: 0 }, SCR_VESTE]]) {
    const testo = await ed.evaluate(async ({ xy, stile }) => {
      const c = _cfgEl('scritta'); c.attivo = true; c.stile = { ..._defScritta().stile, ...(stile || {}) };
      const q = _ovXY(); for (const k of Object.keys(q)) delete q[k];
      if (xy) q.scritta = { ...xy };
      aggiornaAnteprima();
      await new Promise((r) => setTimeout(r, 600));
      return document.querySelector('#ap-scritta .scritta-corpo')?.textContent || '';
    }, { xy, stile });
    const edS = await misuraEd('#ap-scritta .ovl-scritta');
    const edDove = await ed.evaluate(`(${DOVE_S})('#ap-scritta .ovl-scritta')`);
    const stileS = { ...(await ed.evaluate(() => _defScritta().stile)), ...(stile || {}) };
    TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, musica: null, stato: {}, mostra: MOSTRA, xy: xy ? { scritta: xy } : {}, alertStile: null, chatStile: null,
      scritta: { attivo: true, posizione: 'centro', xy: null, stile: stileS } };
    await apriLive(() => window.MIO && window.MIO.scritta);
    ovl.manda({ tipo: 'testo', testo, durata: 60000 });
    await live.waitForFunction(() => document.querySelector('#testi .ovl-scritta.dentro'), null, { timeout: 5000 }).catch(() => {});
    await attesa(600);
    const lvS = await misuraLive('#testi .ovl-scritta');
    const lvDove = await live.evaluate(`(${DOVE_S})('#testi .ovl-scritta')`);
    dice(testo && edS && lvS && vicino(edS.w, lvS.w) && vicino(edS.h, lvS.h) && vicino(edS.font, lvS.font, 0.6)
      && edDove && lvDove && vicino(edDove.x, lvDove.x, 2) && vicino(edDove.y, lvDove.y, 2),
      `testo a schermo ${nome}: editor ${edS ? mis(edS) : '–'} a ${edDove ? Math.round(edDove.x) + ',' + Math.round(edDove.y) : '–'} = diretta ${lvS ? mis(lvS) : '–'} a ${lvDove ? Math.round(lvDove.x) + ',' + Math.round(lvDove.y) : '–'}`,
      'editor e diretta non coincidono');
  }

  // --- 6-sexies. il nome del comando ----------------------------------------
  // La pastiglia «!comando» di un effetto: stessa grandezza e stesso posto.
  const ETI_VESTE = { dim: 'grande', sfondo: '#203040', opacita: 95, testo: '#ffffee', accento: '#22aa66', bordoRaggio: 4, font: 'sistema', forma: 'carta', materia: 'piatta', cornice: 'linea' };
  for (const [nome, xy, stile] of [['in un punto', { x: 20, y: 40, s: 100, r: 0 }, null], ['al suo angolo', null, null], ['vestito', { x: 70, y: 20, s: 120, r: 0 }, ETI_VESTE]]) {
    const scritto = await ed.evaluate(async ({ xy, stile }) => {
      const c = _cfgEl('etichetta'); c.attivo = true; c.stile = { ..._defEtichetta().stile, ...(stile || {}) };
      const q = _ovXY(); for (const k of Object.keys(q)) delete q[k];
      if (xy) q.etichetta = { ...xy };
      aggiornaAnteprima();
      await new Promise((r) => setTimeout(r, 600));
      return document.querySelector('#ap-etichetta .ovl-etichetta')?.textContent || '';
    }, { xy, stile });
    const edE = await misuraEd('#ap-etichetta .ovl-etichetta');
    const edDove = await ed.evaluate(`(${DOVE_S})('#ap-etichetta .ovl-etichetta')`);
    const stileE = { ...(await ed.evaluate(() => _defEtichetta().stile)), ...(stile || {}) };
    TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, musica: null, stato: {}, mostra: MOSTRA, xy: xy ? { etichetta: xy } : {}, alertStile: null, chatStile: null,
      etichetta: { attivo: true, posizione: 'basso-centro', xy: null, stile: stileE } };
    await apriLive(() => window.MIO && window.MIO.etichetta);
    ovl.manda({ tipo: 'audio', url: '', comando: scritto.slice(1) });
    await live.waitForFunction(() => document.querySelector('#etichette .ovl-etichetta.dentro'), null, { timeout: 3000 }).catch(() => {});
    await attesa(350);
    const lvE = await misuraLive('#etichette .ovl-etichetta');
    const lvDove = await live.evaluate(`(${DOVE_S})('#etichette .ovl-etichetta')`);
    dice(scritto && edE && lvE && vicino(edE.w, lvE.w) && vicino(edE.h, lvE.h) && vicino(edE.font, lvE.font, 0.6)
      && edDove && lvDove && vicino(edDove.x, lvDove.x, 2) && vicino(edDove.y, lvDove.y, 2),
      `nome del comando ${nome}: editor ${edE ? mis(edE) : '–'} a ${edDove ? Math.round(edDove.x) + ',' + Math.round(edDove.y) : '–'} = diretta ${lvE ? mis(lvE) : '–'} a ${lvDove ? Math.round(lvDove.x) + ',' + Math.round(lvDove.y) : '–'}`,
      'editor e diretta non coincidono');
  }

  // --- 6-septies. l'area degli effetti --------------------------------------
  // Dove compaiono immagini e video: la stessa immagine, grande uguale e nello
  // stesso posto, messa in un punto, lasciata al centro e chiusa in un
  // riquadro, dove si adatta. Le misure sono in unita' del contenitore: nello
  // Studio la tela, in onda lo schermo.
  const ESEMPIO = await ed.evaluate(() => EFFETTO_ESEMPIO);
  for (const [nome, xy] of [['in un punto', { x: 25, y: 30, s: 60, r: 0 }], ['al centro', null], ['in un riquadro', { x: 55, y: 10, w: 30, h: 40, r: 0 }]]) {
    await ed.evaluate(async ({ xy }) => {
      const q = _ovXY(); for (const k of Object.keys(q)) delete q[k];
      if (xy) q.effetti = { ...xy };
      aggiornaAnteprima();
      await new Promise((r) => setTimeout(r, 600));
    }, { xy });
    const edF = await misuraEd('#ap-effetti .effetto');
    const edDove = await ed.evaluate(`(${DOVE_S})('#ap-effetti .effetto')`);
    TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, musica: null, stato: {}, mostra: MOSTRA, xy: xy ? { effetti: xy } : {}, alertStile: null, chatStile: null };
    await apriLive(() => window.MIO && window.MIO.mostra && window.MIO.mostra.effetti === true);
    ovl.manda({ tipo: 'immagine', url: ESEMPIO, durata: 60000, comando: '' });
    await live.waitForFunction(() => document.querySelector('#palco .effetto.dentro'), null, { timeout: 5000 }).catch(() => {});
    await attesa(600);
    const lvF = await misuraLive('#palco .effetto');
    const lvDove = await live.evaluate(`(${DOVE_S})('#palco .effetto')`);
    dice(edF && lvF && vicino(edF.w, lvF.w, 2) && vicino(edF.h, lvF.h, 2) && edDove && lvDove && vicino(edDove.x, lvDove.x, 2) && vicino(edDove.y, lvDove.y, 2),
      `effetti ${nome}: editor ${edF ? mis(edF) : '–'} a ${edDove ? Math.round(edDove.x) + ',' + Math.round(edDove.y) : '–'} = diretta ${lvF ? mis(lvF) : '–'} a ${lvDove ? Math.round(lvDove.x) + ',' + Math.round(lvDove.y) : '–'}`,
      'editor e diretta non coincidono');
  }

  // --- 6-octies. il muro delle emote --------------------------------------
  // Un'area: a tutto schermo, in una fascia, in un riquadro sopra la webcam.
  // La stessa area sulla tela e in onda; in onda le emote nascono rispetto a
  // lei (non allo schermo), non superano il massimo a schermo, la stessa emote
  // ripetuta resta una e cresce, e un'esplosione fa tutti i suoi pezzi.
  const FACCIA = await ed.evaluate(() => window.SB_MURO.ESEMPI[0]);
  const DENTRO = `(sel) => { const a = document.querySelector(sel); if (!a) return null; const r = a.getBoundingClientRect();
    const em = [...a.querySelectorAll('.muro-emote:not(.muro-combo)')].map((e) => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, s: e.offsetWidth }; });
    return { area: { x: r.left, y: r.top, w: r.width, h: r.height }, fuori: em.filter((e) => e.x < r.left - 2 * e.s || e.x > r.right + 2 * e.s || e.y < r.top - 2 * e.s || e.y > r.bottom + 2 * e.s).length, quante: em.length }; }`;
  for (const [nome, xy] of [['a tutto schermo', null], ['in una fascia in basso', { x: 0, y: 60, w: 100, h: 40, r: 0 }], ['in un riquadro sulla webcam', { x: 65, y: 5, w: 30, h: 35, r: 0 }]]) {
    const cfgMuro = await ed.evaluate(async ({ xy }) => {
      const c = _cfgEl('muro'); c.attivo = true;
      const q = _ovXY(); for (const k of Object.keys(q)) delete q[k];
      if (xy) q.muro = { ...xy };
      aggiornaAnteprima();
      await new Promise((r) => setTimeout(r, 1200));
      return JSON.parse(JSON.stringify(c));
    }, { xy });
    const edA = await ed.evaluate(`(${DOVE_S})('#ap-muro')`);
    const edM = await misuraEd('#ap-muro');
    const edGiro = await ed.evaluate(`(${DENTRO})('#ap-muro')`);
    TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, musica: null, stato: {}, mostra: MOSTRA, xy: xy ? { muro: xy } : {}, alertStile: null, chatStile: null,
      muro: { ...cfgMuro, maxSchermo: 6, coda: 0, combo: { ...cfgMuro.combo, soglia: 3, finestra: 2 } } };
    await apriLive(() => window.MIO && window.MIO.muro && window.MIO.muro.attivo === true);
    const lvA = await live.evaluate(`(${DOVE_S})('#muro')`);
    const lvM = await live.evaluate(`(${MISURA})('#muro')`);
    dice(edM && lvM && edA && lvA && vicino(edM.w, lvM.w, 2) && vicino(edM.h, lvM.h, 2) && vicino(edA.x, lvA.x, 2) && vicino(edA.y, lvA.y, 2),
      `muro ${nome}: editor ${edM ? mis(edM) : '–'} a ${edA ? Math.round(edA.x) + ',' + Math.round(edA.y) : '–'} = diretta ${lvM ? mis(lvM) : '–'} a ${lvA ? Math.round(lvA.x) + ',' + Math.round(lvA.y) : '–'}`,
      'editor e diretta non coincidono');
    dice(edGiro && edGiro.quante > 0 && edGiro.fuori === 0, `muro ${nome}: nello Studio le emote d'esempio girano dentro l'area (${edGiro ? edGiro.quante : 0} in volo)`, 'nessuna emote, o emote lontane dall\'area');
    for (let i = 0; i < 20; i++) ovl.manda({ tipo: 'muro', chi: 'p' + i, testo: 'EmoA' + i, emotiTwitch: { ['EmoA' + i]: FACCIA } });
    let piu = 0, fuori = 0;
    for (let i = 0; i < 12; i++) {
      await attesa(120);
      const d = await live.evaluate(`(${DENTRO})('#muro')`);
      if (d) { piu = Math.max(piu, d.quante); fuori += d.fuori; }
    }
    dice(piu > 0 && piu <= 6 && fuori === 0, `muro ${nome}: venti emote di fila, al massimo ${piu} a schermo (tetto 6), tutte nate rispetto all'area`, 'troppe a schermo, o lontane dall\'area');
    for (const [i, chi] of ['a', 'b', 'c', 'd', 'e'].entries()) { ovl.manda({ tipo: 'muro', chi, testo: 'Combo', emotiTwitch: { Combo: FACCIA } }); await attesa(i < 4 ? 80 : 400); }
    const conta = await live.evaluate(() => { const c = document.querySelector('#muro .muro-combo'); return c ? c.querySelector('.muro-conta').textContent : ''; });
    dice(conta === '\u00d75', `muro ${nome}: cinque persone ripetono la stessa emote e ne resta una con «${conta}»`, 'la combo non c\'e\' o conta male');
    await live.evaluate(() => document.querySelectorAll('#muro .muro-emote').forEach((e) => e.remove()));
    await attesa(2600);
    const dopo = await live.evaluate(() => ({ combo: !!document.querySelector('#muro .muro-combo'), pezzi: document.querySelectorAll('#muro .muro-emote').length }));
    dice(!dopo.combo && dopo.pezzi >= 8, `muro ${nome}: finita la finestra la combo esplode (${dopo.pezzi} emote in volo)`, JSON.stringify(dopo));
    await live.evaluate(() => document.querySelectorAll('#muro .muro-emote').forEach((e) => e.remove()));
    await attesa(5000);
    ovl.manda({ tipo: 'muro-esplodi', figura: 'piramide', parole: ['Boom'], emotiTwitch: { Boom: FACCIA } });
    await attesa(300);
    const pir = await live.evaluate(() => document.querySelectorAll('#muro .muro-emote').length);
    dice(pir === 28, `muro ${nome}: la piramide di trenta emote ne mette 28, sette gradini (${pir})`, 'la figura non ha tutti i suoi pezzi');
  }
  // In onda la scena puo' essere pesante e i fotogrammi arrivare tardi: il
  // primo conteggio della combo viaggia su un fotogramma, i successivi no.
  // Col fotogramma in ritardo di 300 ms il numero non deve tornare indietro.
  {
    const lenta = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await lenta.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => (window.__lento ? setTimeout(() => raf(cb), 300) : raf(cb));
    });
    await lenta.goto(base + '/overlay/prova?key=x', { waitUntil: 'domcontentloaded' });
    await lenta.waitForFunction(() => typeof MIO === 'object' && MIO.muro && MIO.muro.attivo === true, null, { timeout: 8000 }).catch(() => {});
    await attesa(400);
    await lenta.evaluate(() => { window.__lento = true; });
    for (const [i, chi] of ['a', 'b', 'c', 'd', 'e'].entries()) { ovl.manda({ tipo: 'muro', chi, testo: 'Lenta', emotiTwitch: { Lenta: FACCIA } }); await attesa(i < 4 ? 80 : 400); }
    const conta = await lenta.evaluate(() => { const c = document.querySelector('#muro .muro-combo'); return c ? c.querySelector('.muro-conta').textContent : ''; });
    dice(conta === '×5', `muro con la scena pesante: cinque persone ripetono la stessa emote e la combo dice «${conta}»`, 'il conteggio torna indietro');
    await lenta.close();
  }

  // --- 6-nonies. l'ordine dei livelli ---------------------------------------
  // Chat, alert e ultimo follower uno sopra l'altro, col muro sotto a tutti:
  // in ogni punto dove se ne toccano almeno due, quello che si prende il clic e'
  // il piu' in alto secondo l'ordine, sulla tela e in onda. In onda i clic si
  // riaccendono solo per misurare: la pagina non ne prende. L'ultimo follower
  // in onda vive in un angolo, e deve potersi mettere davanti o in mezzo agli
  // altri come chiunque (docs/OVERLAY.md, «L'ordine dei livelli»). Ogni lato
  // si guarda per intero: sulla tela ci sono anche gli elementi che in onda
  // nessuno ha ancora mosso (un contatore), e contano come gli altri.
  // Chi sta in un punto lo dice il browser con la stessa prova che decide chi
  // e' in cima (elementsFromPoint): coi rettangoli, un punto sul bordo o un
  // figlio che sporge di mezzo pixel era «fuori» per la sonda e «dentro» per
  // il clic, e la sonda dava torto all'ordine senza che l'ordine sbagliasse.
  const TRE = { chat: { x: 30, y: 30, w: 30, h: 30, r: 0 }, alert: { x: 34, y: 34, w: 30, h: 22, r: 0 }, wf: { x: 55, y: 50, s: 100, r: 0 } };
  const SONDA = `({ ordine, tela, chiave }) => {
    const r0 = tela();
    const out = [];
    for (let i = 1; i < 30; i++) for (let j = 1; j < 30; j++) {
      const x = r0.left + r0.width * (0.25 + 0.5 * i / 30), y = r0.top + r0.height * (0.25 + 0.5 * j / 30);
      const sotto = [...new Set(document.elementsFromPoint(x, y).map(chiave).filter(Boolean))];
      if (sotto.length < 2) continue;
      const atteso = [...window.SB_RIQUADRO.ordine(sotto, ordine)].pop();
      if (sotto[0] !== atteso) out.push(sotto.join('+') + ': ' + sotto[0] + ' invece di ' + atteso);
      else out.push('');
    }
    return { punti: out.length, sbagli: out.filter(Boolean) };
  }`;
  const wfCfg = await ed.evaluate(() => ({ ..._leggiWidget('wf'), attivo: true }));
  for (const [nome, ordine] of [['di serie', []], ['la chat davanti a tutto', ['muro', 'alert', 'wf', 'chat']], ['l\'ultimo follower, che in onda sta in un angolo, davanti a tutto', ['muro', 'chat', 'alert', 'wf']]]) {
    const edS = await ed.evaluate(async ({ TRE, ordine, SONDA }) => {
      deseleziona();
      const q = _ovXY(); for (const k of Object.keys(q)) delete q[k];
      Object.assign(q, JSON.parse(JSON.stringify(TRE)));
      _scriviOrdine(ordine);
      aggiornaAnteprima();
      await new Promise((r) => setTimeout(r, 600));
      const perId = {}; for (const k of ELEMENTI().map((e) => e.k)) perId[_idEl(k)] = k;
      return (0, eval)('(' + SONDA + ')')({ ordine,
        tela: () => document.getElementById('ap-stage').getBoundingClientRect(),
        chiave: (el) => { const n = el && el.closest('.ap-el'); return n ? (perId[n.id] || n.id) : ''; } });
    }, { TRE, ordine, SONDA });
    TEMA = { css: '', widget: { ultimoFollower: wfCfg, ultimoSub: { attivo: false } }, goals: [], conti: {}, timer: null, musica: null,
      stato: { ultimoFollower: 'MarioRossi' }, mostra: MOSTRA, xy: TRE, ordine, alertStile: { icona: false }, chatStile: null };
    await apriLive(() => document.querySelector('.ovl-widget .w-testo b'));
    ovl.manda({ tipo: 'chat', user: 'MarioRossi', colore: '#ff4d4d', testo: 'ciao a tutti', max: 8, fadeSec: 0 });
    ovl.manda({ tipo: 'alert', kind: 'sub', testo: 'Nuovo abbonamento', colore: '#ff4d4d', durata: 30000 });
    await live.waitForFunction(() => document.querySelector('#chatlive .chat-riga') && document.querySelector('#alert .alert-card.dentro'), null, { timeout: 6000 }).catch(() => {});
    await attesa(500);
    const lvS = await live.evaluate(({ ordine, SONDA }) => {
      const st = document.createElement('style'); st.textContent = '* { pointer-events: auto !important; }'; document.head.appendChild(st);
      const r = (0, eval)('(' + SONDA + ')')({ ordine,
        tela: () => ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }),
        chiave: (el) => { const n = el && el.closest('[data-el]'); return n ? n.dataset.el : ''; } });
      st.remove();
      return { ...r, inAngolo: !!document.querySelector('.wbox > [data-el="wf"]') };
    }, { ordine, SONDA });
    dice(edS.punti > 40 && lvS.punti > 40 && !edS.sbagli.length && !lvS.sbagli.length && lvS.inAngolo,
      `ordine dei livelli, ${nome}: davanti c'e' chi deve starci in ${edS.punti} punti sulla tela e ${lvS.punti} in onda${lvS.inAngolo ? ', col follower nel suo angolo' : ''}`,
      [...edS.sbagli.slice(0, 3).map((x) => 'tela ' + x), ...lvS.sbagli.slice(0, 3).map((x) => 'onda ' + x), lvS.inAngolo ? '' : 'il follower non e\' nel suo angolo'].filter(Boolean).join(' · '));
  }
  await ed.evaluate(() => { _scriviOrdine([]); aggiornaAnteprima(); });

  // --- 6-ter. i cartelli -----------------------------------------------------
  // Un cartello e' solo quel che ci hai scritto, quindi l'unica cosa che puo'
  // scollarsi e' la misura: stesso testo, stesso corpo, stessa larghezza di
  // qua e di la'. E la larghezza e' quella che scotta, perche' l'editor la fa
  // in pixel sulla tela e la diretta in centesimi di schermo.
  const CART_FINTO = { id: 'c1', attivo: true, tipo: 'scritta', nome: '',
    testo: 'TORNO SUBITO\nun attimo e sono da voi', effetto: '', larghezza: 22, allinea: 'centro',
    posizione: 'alto-sinistra', xy: null,
    stile: { dim: 'grande', sfondo: '#12021f', opacita: 70, testo: '#ffe066', accento: '#f72fa7', bordoRaggio: 14, font: 'sistema', forma: 'carta', materia: 'piatta', cornice: 'linea' } };
  const cfgCart = await ed.evaluate(async (c) => {
    _cartBozza = [JSON.parse(JSON.stringify(c))];
    disegnaCartelli();
    const xy = _ovXY(); for (const k of Object.keys(xy)) delete xy[k];
    xy['cart:c1'] = { x: 50, y: 50, s: 100, r: 0 };
    aggiornaAnteprima();
    await new Promise((r) => setTimeout(r, 300));
    return true;
  }, CART_FINTO);
  const edCart = cfgCart ? await misuraEd('#ap-cart-c1 .ovl-cartello') : null;
  TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, musica: null, treno: null,
    cartelli: [CART_FINTO], stato: {}, mostra: MOSTRA, xy: { 'cart:c1': { x: 50, y: 50, s: 100, r: 0 } }, alertStile: null, chatStile: null };
  await apriLive(() => document.querySelector('.ovl-cartello'));
  await attesa(200);
  const lvCart = await misuraLive('.ovl-cartello');
  dice(edCart && lvCart && vicino(edCart.w, lvCart.w) && vicino(edCart.h, lvCart.h) && vicino(edCart.font, lvCart.font, 0.6),
    `cartello: editor ${edCart ? mis(edCart) : '–'} = diretta ${lvCart ? mis(lvCart) : '–'}`, 'editor e diretta non coincidono');

  // --- 7. il player, pezzo per pezzo -----------------------------------------
  // tre giri sullo stesso player (tema vinile, due righe, tempi): senza misure,
  // con le misure a 100, con misure e colori propri. I primi due devono essere
  // identici (100 = come il corpo, di qua e di la'); il terzo deve coincidere
  // fra editor e diretta E derivare dal secondo coi fattori scelti.
  const MIS = { sfondo: 140, cover: 150, vinile: 130, titolo: 130, artista: 80, tempi: 120, barra: 200, onde: 160 };
  const COL = { propri: true, titolo: '#ffe066', artista: '#9ad0ff', tempi: '#c0ffc0', barra: '#ff8800', onde: '#00ccff' };
  const PARTI = ['.m-disco', '.m-cover', '.m-corpo', '.m-riga:first-child', '.m-riga2', '.m-tempi', '.m-barra', '.m-onde'];
  const MISURA_PARTI = `((radice, parti) => {
    const stage = document.getElementById('ap-stage');
    const sc = stage ? stage.getBoundingClientRect().width / 1920 : 1;
    const el = document.querySelector(radice);
    if (!el) return null;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const out = { el: { w: r.width / sc, h: r.height / sc, pad: parseFloat(cs.paddingLeft) } };
    for (const p of parti) {
      const n = el.querySelector(p);
      if (!n) { out[p] = null; continue; }
      const b = n.getBoundingClientRect(), c = getComputedStyle(n);
      out[p] = { w: b.width / sc, h: b.height / sc, font: Math.round(parseFloat(c.fontSize) * 10) / 10, colore: c.color };
    }
    return out;
  })`;
  const giriPlayer = [
    { nome: 'senza misure', misure: null, colori: null },
    { nome: 'misure a 100', misure: Object.fromEntries(Object.keys(MIS).map((k) => [k, 100])), colori: { ...COL, propri: false } },
    { nome: 'misure e colori propri', misure: MIS, colori: COL },
  ];
  const presi = [];
  for (const giro of giriPlayer) {
    const cfg = await ed.evaluate(async (giro) => {
      const c = _cfgEl('musica');
      Object.assign(c, { attivo: true, verso: 'riga', righe: 'due', cover: 'quadrata', barra: 'sotto', tempi: 'due', entrata: 'dissolvenza', quandoFermo: 'resta',
        ritmo: 'onde', sfondo: 'no', corpo: 'normale', tema: 'vinile', larghezza: 0, scorre: false, daCopertina: false, testo: '{titolo}', testo2: '{artista}' });
      if (giro.misure) c.misure = { ...giro.misure }; else delete c.misure;
      if (giro.colori) c.colori = { ...giro.colori }; else delete c.colori;
      const xy = _ovXY(); for (const k of Object.keys(xy)) delete xy[k];
      xy.musica = { x: 50, y: 50, s: 100, r: 0 };
      aggiornaAnteprima();
      await new Promise((r) => setTimeout(r, 350));
      return JSON.parse(JSON.stringify(c));
    }, giro);
    const e = await ed.evaluate(`(${MISURA_PARTI})('#ap-stage .ovl-musica', ${JSON.stringify(PARTI)})`);
    TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, stato: {}, mostra: MOSTRA, xy: { musica: { x: 50, y: 50, s: 100, r: 0 } }, musica: cfg, alertStile: null, chatStile: null };
    MUSICA = brano('Ok');
    await apriLive(() => document.querySelector('.ovl-musica.dentro'));
    const l = await live.evaluate(`(${MISURA_PARTI})('.ovl-musica', ${JSON.stringify(PARTI)})`);
    presi.push({ giro, e, l });
    const diversi = [];
    if (!(e && l)) diversi.push('manca il player');
    else {
      if (!(vicino(e.el.w, l.el.w) && vicino(e.el.h, l.el.h) && vicino(e.el.pad, l.el.pad, .6))) diversi.push(`carta ${mis(e.el)} / ${mis(l.el)}`);
      for (const p of PARTI) {
        if (!(e[p] && l[p])) { diversi.push(p + ' manca'); continue; }
        if (!(vicino(e[p].w, l[p].w) && vicino(e[p].h, l[p].h) && vicino(e[p].font, l[p].font, .6) && e[p].colore === l[p].colore)) diversi.push(`${p} ${mis(e[p])} ${e[p].colore} / ${mis(l[p])} ${l[p].colore}`);
      }
    }
    dice(diversi.length === 0, `player pezzo per pezzo, ${giro.nome}: editor ${e ? mis(e.el) : '–'} = diretta ${l ? mis(l.el) : '–'}, e ogni pezzo uguale di qua e di la'`, diversi.join(' · '));
  }
  const [p0, p1, p2] = presi;
  const stessi = (a, b) => a && b && vicino(a.el.w, b.el.w) && vicino(a.el.h, b.el.h) && PARTI.every((p) => a[p] && b[p] && vicino(a[p].w, b[p].w) && vicino(a[p].h, b[p].h) && vicino(a[p].font, b[p].font, .6) && a[p].colore === b[p].colore);
  dice(stessi(p0.e, p1.e) && stessi(p0.l, p1.l), 'misure assenti = misure a 100: chi non tocca niente vede il player di prima, in editor e in diretta', 'una misura a 100 sposta qualcosa');
  const rapporto = (a, b) => (a > 0 && b > 0) ? b / a : NaN;
  const circa = (r, atteso) => Number.isFinite(r) && Math.abs(r - atteso) <= .03;
  const d1 = p1.l, d2 = p2.l;
  const derivati = d1 && d2 && d1['.m-disco'] && d2['.m-disco']
    && circa(rapporto(d1['.m-disco'].w, d2['.m-disco'].w), 1.5)
    && circa(rapporto(d1['.m-cover'].h, d2['.m-cover'].h), 1.5 * 1.3)
    && circa(rapporto(d1['.m-riga:first-child'].font, d2['.m-riga:first-child'].font), 1.3)
    && circa(rapporto(d1['.m-riga2'].font, d2['.m-riga2'].font), .8)
    && circa(rapporto(d1['.m-tempi'].font, d2['.m-tempi'].font), 1.2)
    && circa(rapporto(d1['.m-barra'].h, d2['.m-barra'].h), 2)
    && circa(rapporto(d1['.m-onde'].h, d2['.m-onde'].h), 1.6)
    && circa(rapporto(d1.el.pad, d2.el.pad), 1.4)
    && vicino(d1['.m-corpo'].w, d2['.m-corpo'].w)
    && d2['.m-riga:first-child'].colore === 'rgb(255, 224, 102)' && d2['.m-riga2'].colore === 'rgb(154, 208, 255)' && d2['.m-tempi'].colore === 'rgb(192, 255, 192)';
  dice(derivati, `ogni misura fa quello che dice: copertina ×1,5, vinile ×1,3, prima riga ×1,3, seconda ×0,8, tempi ×1,2, barra ×2, onde ×1,6, spazio attorno ×1,4, la colonna del testo non perde un pixel, e i colori propri sul testo`,
    d1 && d2 && d2['.m-disco'] ? `disco ${rapporto(d1['.m-disco'].w, d2['.m-disco'].w).toFixed(2)} cover-h ${rapporto(d1['.m-cover'].h, d2['.m-cover'].h).toFixed(2)} tit ${rapporto(d1['.m-riga:first-child'].font, d2['.m-riga:first-child'].font).toFixed(2)} art ${rapporto(d1['.m-riga2'].font, d2['.m-riga2'].font).toFixed(2)} tempi ${rapporto(d1['.m-tempi'].font, d2['.m-tempi'].font).toFixed(2)} barra ${rapporto(d1['.m-barra'].h, d2['.m-barra'].h).toFixed(2)} onde ${rapporto(d1['.m-onde'].h, d2['.m-onde'].h).toFixed(2)} pad ${rapporto(d1.el.pad, d2.el.pad).toFixed(2)} corpo ${Math.round(d1['.m-corpo'].w)}→${Math.round(d2['.m-corpo'].w)} tit ${d2['.m-riga:first-child'].colore}` : 'manca una misura');

  // --- 8. le parti dove vuoi ---------------------------------------------------
  // disposizione libera in un riquadro, con una tabella nota: ogni pezzo sta nello
  // stesso posto di qua e di la', E nel posto che il numero dice — x=0 a filo dello
  // spazio interno a sinistra, x=100 a filo a destra, y=50 al centro, w in
  // centesimi dell'interno. Cosi' un difetto condiviso dal traduttore non passa
  // solo perche' le due pagine lo condividono.
  const RQL = { x: 10, y: 20, w: 40, h: 22, r: 0 };
  const TAB = { cover: { x: 0, y: 0 }, titolo: { x: 100, y: 100, w: 40, a: 'destra' }, artista: { x: 50, y: 0, w: 30, a: 'centro' }, barra: { x: 50, y: 50, w: 30 }, tempi: { x: 100, y: 0 }, onde: { x: 0, y: 100 } };
  const PEZZI = { cover: '.m-cover', titolo: '.m-riga:not(.m-riga2)', artista: '.m-riga2', barra: '.m-barra', tempi: '.m-tempi', onde: '.m-onde' };
  const MISURA_LIBERA = `((radice, pezzi) => {
    const stage = document.getElementById('ap-stage');
    const sc = stage ? stage.getBoundingClientRect().width / 1920 : 1;
    const el = document.querySelector(radice);
    if (!el) return null;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const k = new DOMMatrix(getComputedStyle(el.closest('.ap-el') || el).transform).a || 1;
    const out = { el: { x: r.left / sc, y: r.top / sc, w: r.width / sc, h: r.height / sc, px: parseFloat(cs.paddingLeft) * k, py: parseFloat(cs.paddingTop) * k, allinea: {} } };
    for (const [n, s] of Object.entries(pezzi)) {
      const p = el.querySelector(s);
      if (!p || !p.offsetWidth) { out[n] = null; continue; }
      const b = p.getBoundingClientRect();
      out[n] = { x: (b.left - r.left) / sc, y: (b.top - r.top) / sc, w: b.width / sc, h: b.height / sc, allinea: getComputedStyle(p).textAlign };
    }
    return out;
  })`;
  const cfgLib = await ed.evaluate(async ({ RQL, TAB }) => {
    const c = _cfgEl('musica');
    Object.assign(c, { attivo: true, verso: 'libera', righe: 'due', cover: 'quadrata', barra: 'sotto', tempi: 'due', entrata: 'dissolvenza', quandoFermo: 'resta',
      ritmo: 'onde', sfondo: 'no', corpo: 'normale', tema: 'nessuno', larghezza: 0, scorre: false, daCopertina: false, testo: '{titolo}', testo2: '{artista}', parti: JSON.parse(JSON.stringify(TAB)) });
    delete c.misure; delete c.colori;
    const xy = _ovXY(); for (const k of Object.keys(xy)) delete xy[k];
    xy.musica = { ...RQL };
    aggiornaAnteprima();
    await new Promise((r) => setTimeout(r, 350));
    return JSON.parse(JSON.stringify(c));
  }, { RQL, TAB });
  const eL = await ed.evaluate(`(${MISURA_LIBERA})('#ap-stage .ovl-musica', ${JSON.stringify(PEZZI)})`);
  TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, stato: {}, mostra: MOSTRA, xy: { musica: RQL }, musica: cfgLib, alertStile: null, chatStile: null };
  MUSICA = brano('Ok');
  await apriLive(() => document.querySelector('.ovl-musica.dentro'));
  const lL = await live.evaluate(`(${MISURA_LIBERA})('.ovl-musica', ${JSON.stringify(PEZZI)})`);
  const diversiL = [];
  if (!(eL && lL)) diversiL.push('manca il player');
  else for (const n of Object.keys(PEZZI)) {
    if (!(eL[n] && lL[n])) { diversiL.push(n + ' manca'); continue; }
    if (!(vicino(eL[n].x, lL[n].x, 2) && vicino(eL[n].y, lL[n].y, 2) && vicino(eL[n].w, lL[n].w, 2) && vicino(eL[n].h, lL[n].h, 2))) diversiL.push(`${n} ${Math.round(eL[n].x)},${Math.round(eL[n].y)} ${mis(eL[n])} / ${Math.round(lL[n].x)},${Math.round(lL[n].y)} ${mis(lL[n])}`);
  }
  dice(diversiL.length === 0, 'disposizione libera nel riquadro: ogni pezzo sta nello stesso posto sulla tela e in diretta', diversiL.join(' · '));
  const posti = [];
  if (lL && lL.cover && lL.titolo && lL.artista && lL.barra && lL.tempi && lL.onde) {
    const W = lL.el.w, H = lL.el.h, px = lL.el.px, py = lL.el.py, dentroW = W - 2 * px, dentroH = H - 2 * py;
    if (!vicino(lL.cover.x, px, 2) || !vicino(lL.cover.y, py, 2)) posti.push(`copertina a 0,0 sta a ${Math.round(lL.cover.x)},${Math.round(lL.cover.y)} invece di ${Math.round(px)},${Math.round(py)}`);
    if (!vicino(lL.titolo.x + lL.titolo.w, W - px, 2) || !vicino(lL.titolo.y + lL.titolo.h, H - py, 2)) posti.push(`titolo a 100,100 finisce a ${Math.round(lL.titolo.x + lL.titolo.w)},${Math.round(lL.titolo.y + lL.titolo.h)} invece di ${Math.round(W - px)},${Math.round(H - py)}`);
    if (!vicino(lL.titolo.w, dentroW * .4, 2)) posti.push(`titolo largo ${Math.round(lL.titolo.w)} invece del 40% (${Math.round(dentroW * .4)})`);
    if (lL.titolo.allinea !== 'right' || lL.artista.allinea !== 'center') posti.push(`allineamento ${lL.titolo.allinea}/${lL.artista.allinea}`);
    if (!vicino(lL.barra.x + lL.barra.w / 2, W / 2, 2) || !vicino(lL.barra.y + lL.barra.h / 2, H / 2, 2)) posti.push(`barra a 50,50 ha il centro in ${Math.round(lL.barra.x + lL.barra.w / 2)},${Math.round(lL.barra.y + lL.barra.h / 2)} invece di ${Math.round(W / 2)},${Math.round(H / 2)}`);
    if (!vicino(lL.barra.w, dentroW * .3, 2)) posti.push(`barra larga ${Math.round(lL.barra.w)} invece del 30%`);
    if (!vicino(lL.tempi.x + lL.tempi.w, W - px, 2) || !vicino(lL.tempi.y, py, 2)) posti.push('tempi non in alto a destra');
    if (!vicino(lL.onde.x, px, 2) || !vicino(lL.onde.y + lL.onde.h, H - py, 2)) posti.push('onde non in basso a sinistra');
    if (!vicino(lL.el.w, RQL.w / 100 * 1920, 2.5) || !vicino(lL.el.h, RQL.h / 100 * 1080, 2.5)) posti.push(`la carta non e' il riquadro: ${mis(lL.el)}`);
  } else posti.push('manca un pezzo in diretta');
  dice(posti.length === 0, 'e ogni pezzo sta dove il numero dice: 0 a filo, 100 a filo dall\'altra parte, 50 al centro, la larghezza in centesimi dello spazio interno, il testo allineato come chiesto', posti.join(' · '));

  // --- 9. gli effetti a tutto schermo -----------------------------------------
  // (docs/EFFETTI-SCHERMO.md) Un media a tutto schermo copre la finestra anche
  // con l'area degli effetti chiusa in un angolo, riempito (cover) o intero
  // (contain), mai stirato. Un disegno e' una tela grande quanto la finestra
  // che si disegna davvero e se ne va da sola a fine durata. Dove l'overlay non
  // mostra gli effetti non parte niente. Nel pannello gli effetti pronti hanno
  // la loro anteprima vera, e un disegno salvato torna nella lista da modificare.
  const LARGA = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><rect width="400" height="100" fill="#e33"/></svg>');
  const AREA_PICCOLA = { effetti: { x: 5, y: 5, w: 20, h: 20, r: 0 } };
  const FUOCHI = { nome: 'fuochi', colori: ['#ff5a5a', '#ffd166'], quanti: 'tanti', durata: 4, suono: '' };
  TEMA = { css: '', widget: {}, goals: [], conti: {}, timer: null, musica: null, stato: {}, mostra: MOSTRA, xy: AREA_PICCOLA, alertStile: null, chatStile: null };
  await apriLive(() => window.MIO && window.MIO.mostra && window.MIO.mostra.effetti === true);
  const tuttoSchermo = [];
  for (const schermo of ['riempi', 'intero']) {
    ovl.manda({ tipo: 'immagine', url: LARGA, durata: 1500, comando: '', schermo, posizione: null });
    await live.waitForFunction(() => document.querySelector('#palco-schermo .effetto.dentro'), null, { timeout: 5000 }).catch(() => {});
    await live.evaluate(A_RIPOSO);
    const m = await live.evaluate(() => {
      const el = document.querySelector('#palco-schermo .effetto');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height, fit: getComputedStyle(el).objectFit, nelPalco: !!document.querySelector('#palco .effetto') };
    });
    const atteso = schermo === 'riempi' ? 'cover' : 'contain';
    if (!m || !vicino(m.x, 0) || !vicino(m.y, 0) || !vicino(m.w, 1920) || !vicino(m.h, 1080) || m.fit !== atteso || m.nelPalco) tuttoSchermo.push(`${schermo}: ${JSON.stringify(m)}`);
    await live.waitForFunction(() => !document.querySelector('#palco-schermo .effetto'), null, { timeout: 5000 }).catch(() => tuttoSchermo.push(`${schermo}: non se ne va`));
  }
  dice(!tuttoSchermo.length, 'un media a tutto schermo copre la finestra anche con l\'area degli effetti in un angolo: riempito copre, intero si vede tutto, mai stirato', tuttoSchermo.join(' · '));

  ovl.manda({ tipo: 'disegno', comando: '', disegno: FUOCHI, durata: 4000, volume: 0 });
  await live.waitForFunction(() => document.querySelector('#palco-schermo canvas.disegnato'), null, { timeout: 5000 }).catch(() => {});
  await attesa(1900);
  const disegnato = await live.evaluate(() => {
    const c = document.querySelector('#palco-schermo canvas.disegnato');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let accesi = 0;
    for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) accesi++;
    return { w: r.width, h: r.height, accesi, livello: c.parentElement.dataset.el };
  });
  await live.waitForFunction(() => !document.querySelector('#palco-schermo canvas.disegnato'), null, { timeout: 5000 }).catch(() => {});
  const andato = await live.evaluate(() => !document.querySelector('#palco-schermo canvas.disegnato'));
  dice(disegnato && vicino(disegnato.w, 1920) && vicino(disegnato.h, 1080) && disegnato.accesi > 20 && disegnato.livello === 'effetti' && andato,
    `un disegno e' una tela grande quanto la finestra, al livello degli effetti, che si disegna (${disegnato ? disegnato.accesi : 0} punti accesi) e se ne va da sola`, JSON.stringify({ disegnato, andato }));

  TEMA = { ...TEMA, mostra: { ...MOSTRA, effetti: false } };
  await apriLive(() => window.MIO && window.MIO.mostra && window.MIO.mostra.effetti === false);
  ovl.manda({ tipo: 'disegno', comando: '', disegno: FUOCHI, durata: 4000, volume: 0 });
  ovl.manda({ tipo: 'immagine', url: LARGA, durata: 1500, comando: '', schermo: 'riempi', posizione: null });
  await attesa(900);
  const spento = await live.evaluate(() => document.querySelectorAll('#palco-schermo > *').length);
  dice(spento === 0, 'dove l\'overlay non mostra gli effetti, a tutto schermo non parte niente', `${spento} elementi`);

  await ed.evaluate(() => window.SB_APP.vai('effetti'));
  await ed.waitForFunction(() => document.querySelectorAll('#pronti-galleria .pronti-voce').length === 8 && document.querySelector('#lista-effetti [data-modifica-pronto]'), null, { timeout: 10000 }).catch(() => {});
  await attesa(1500);
  const pannello = await ed.evaluate(async () => {
    const accesi = (c) => { if (!c || !c.width) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 13) if (d[i] > 0) n++; return n; };
    const out = { voci: document.querySelectorAll('#pronti-galleria .pronti-voce').length, anteprima: accesi(document.querySelector('.pronti-tela')) };
    out.mini = [...document.querySelectorAll('.pronti-mini')].filter((c) => accesi(c) > 0).length;
    document.querySelector('[data-pronto="lampo"]').click();
    await new Promise((r) => setTimeout(r, 300));
    out.lampo = { scelto: document.querySelector('[data-pronto="lampo"]').getAttribute('aria-checked'), quanti: !!document.querySelector('.pronti-quanti'), max: document.getElementById('pronti-durata')?.max };
    document.querySelector('[data-pronto="neve"]').click();
    await new Promise((r) => setTimeout(r, 300));
    out.neve = { quanti: !!document.querySelector('.pronti-quanti'), max: document.getElementById('pronti-durata')?.max };
    const video = document.querySelector('#lista-effetti [data-eff="3"] select[data-schermo]');
    out.dove = video ? video.value : null;
    const prima = document.querySelectorAll('#lista-effetti [data-modifica-pronto]').length;
    document.querySelector('[data-pronti="salva"]').click();
    await new Promise((r) => setTimeout(r, 900));
    out.salvati = document.querySelectorAll('#lista-effetti [data-modifica-pronto]').length - prima;
    document.querySelector('#lista-effetti [data-modifica-pronto]').click();
    await new Promise((r) => setTimeout(r, 400));
    out.modifica = document.querySelector('.pronti-campi h3')?.textContent || '';
    return out;
  });
  dice(pannello.voci === 8 && pannello.anteprima > 20 && pannello.mini === 8 && pannello.lampo.scelto === 'true' && !pannello.lampo.quanti && pannello.lampo.max === '3'
    && pannello.neve.quanti && pannello.neve.max === '30' && pannello.dove === 'riempi' && pannello.salvati === 1 && /!festa/.test(pannello.modifica),
  'nel pannello gli otto effetti pronti si vedono davvero, il lampo non ha «quanti», un disegno salvato torna nella lista e si riapre per modificarlo, e un video dice dove appare',
  JSON.stringify(pannello));
  // L'anteprima nel pannello: prima c'erano solo i suoni, e i video andavano
  // all'overlay senza che nel pannello si vedesse niente. Un WebM trasparente
  // vero (uscito dalla compressione, scripts/campioni) deve suonare nel
  // pannello, coprire la scena intera se e' a tutto schermo e lasciar vedere
  // il fondo dove e' trasparente; un disegno e un'immagine della libreria si
  // vedono, e Esc chiude.
  const CAMPIONE = readFileSync(join(RAD, 'scripts/campioni/cerchio-trasparente.webm')).toString('base64');
  const anteprima = await ed.evaluate(async (b64) => {
    const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));
    const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'video/webm' }));
    const chiudi = anteprimaEffetto({ tipo: 'video', url, schermo: 'intero', volume: 0, comando: 'prova' });
    await aspetta(900);
    const v = document.querySelector('.ant-velo .ant-dentro video');
    const out = { video: !!v };
    if (v) {
      const sc = document.querySelector('.ant-scena').getBoundingClientRect(), vr = v.getBoundingClientRect();
      const t = document.createElement('canvas'); t.width = v.videoWidth; t.height = v.videoHeight;
      const x = t.getContext('2d'); x.drawImage(v, 0, 0);
      out.suona = !v.paused && v.currentTime > 0.2;
      out.copre = Math.abs(vr.width - sc.width) < 2 && Math.abs(vr.height - sc.height) < 2;
      out.alfa = [x.getImageData(2, 2, 1, 1).data[3], x.getImageData(Math.round(t.width / 2), Math.round(t.height / 2), 1, 1).data[3]];
    }
    chiudi();
    await aspetta(500);
    document.querySelector('#lista-effetti [data-modifica-pronto]')?.closest('li')?.querySelector('[data-prova]')?.click();
    await aspetta(2600);
    const tela = document.querySelector('.ant-velo canvas.ant-tela');
    if (tela) { const d = tela.getContext('2d').getImageData(0, 0, tela.width, tela.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 61) if (d[i]) n++; out.disegno = n; }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await aspetta(500);
    out.chiusa = !document.querySelector('.ant-velo');
    const g = document.querySelector('#lib-griglia .lib-card[data-tipo="immagine"] .lib-guarda');
    g?.click();
    await aspetta(600);
    const im = document.querySelector('.ant-velo .ant-dentro img');
    out.immagine = !!(im && im.naturalWidth > 0);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await aspetta(400);
    return out;
  }, CAMPIONE);
  // Il soggetto «pieno» si misura con la tolleranza del codec: il VP9 comprime
  // anche l'alfa, e nel campione il centro vale 251 in alcuni fotogrammi e 255
  // in altri (misurato con ffmpeg). Il fondo invece e' 0 in tutti.
  const pieno = (a) => Number.isFinite(a) && a >= 240;
  dice(anteprima.video && anteprima.suona && anteprima.copre && anteprima.alfa?.[0] === 0 && pieno(anteprima.alfa?.[1]) && anteprima.disegno > 20 && anteprima.chiusa && anteprima.immagine,
    'l\'anteprima nel pannello: un video trasparente parte, copre la scena a tutto schermo e lascia vedere il fondo, un disegno si disegna, un\'immagine della libreria si vede, ed Esc chiude',
    JSON.stringify(anteprima));
  // Lo sfondo da togliere al caricamento. Un video col fondo verde da studio
  // (non il verde puro della casella: se il colore non si prendesse
  // dall'angolo, il fondo resterebbe mezzo visibile) e un'immagine col fondo
  // azzurro presa col clic sull'anteprima. Dove c'era il fondo l'anteprima e'
  // trasparente, il soggetto resta pieno, e verso il server parte proprio il
  // colore preso con le due misure. Un formato che il browser non sa mostrare
  // lo dice invece di restare una scatola vuota. Un PNG animato col nome .png
  // si muove anche nell'anteprima coi suoi fotogrammi, come in onda, e senza
  // la nota di chi vede solo il primo. Un AVIF va in onda com'e':
  // la casella non c'e', il pannello dice perche', e il clic non l'accende.
  // Dove l'angolo e' gia' trasparente, la casella non prende il nero finto di
  // un pixel che non si vede (toglierebbe il nero del soggetto).
  const campione = (f) => readFileSync(join(RAD, 'scripts/campioni', f)).toString('base64');
  const CAMPIONI_SFONDO = { verde: campione('sfondo-verde.webm'), lampo: campione('lampeggia.png'), avif: campione('verde.avif'), cerchio: campione('cerchio-trasparente.webm') };
  const sfondo = await ed.evaluate(async (cc) => {
    const byte = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));
    const file = document.getElementById('eff-file'), tela = document.getElementById('eff-prima-tela'), chk = document.getElementById('eff-chiave');
    const metti = (f) => { const dt = new DataTransfer(); dt.items.add(f); file.files = dt.files; file.dispatchEvent(new Event('change')); };
    const alfa = () => { const x = tela.getContext('2d'); return [x.getImageData(1, 1, 1, 1).data[3], x.getImageData(tela.width >> 1, tela.height >> 1, 1, 1).data[3]]; };
    const out = {};
    metti(new File([byte(cc.verde)], 'verde.webm', { type: 'video/webm' }));
    await aspetta(900);
    out.video = { vista: !document.getElementById('eff-prima').hidden, w: tela.width, prima: alfa() };
    chk.click();
    await aspetta(400);
    out.video.colore = document.getElementById('eff-chiave-colore').value;
    out.video.dopo = alfa();
    out.video.manda = _primaChiave();
    const c = document.createElement('canvas'); c.width = 80; c.height = 60;
    const g = c.getContext('2d'); g.fillStyle = '#2a7fff'; g.fillRect(0, 0, 80, 60); g.fillStyle = '#ffd400'; g.beginPath(); g.arc(40, 30, 16, 0, 7); g.fill();
    metti(new File([await new Promise((r) => c.toBlob(r, 'image/png'))], 'azzurro.png', { type: 'image/png' }));
    await aspetta(500);
    out.img = { spenta: !chk.checked, prima: alfa() };
    const r = tela.getBoundingClientRect();
    tela.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 3, clientY: r.top + 3 }));
    await aspetta(300);
    out.img.accesa = chk.checked && !document.getElementById('eff-chiave-box').hidden;
    out.img.colore = document.getElementById('eff-chiave-colore').value;
    out.img.dopo = alfa();
    metti(new File([new Uint8Array(256)], 'prores.mov', { type: 'video/quicktime' }));
    await aspetta(900);
    out.illeggibile = !document.getElementById('eff-prima-nota').hidden;
    metti(new File([byte(cc.lampo)], 'lampeggia.png', { type: 'image/png' }));
    const visti = new Set();
    for (let i = 0; i < 8; i++) { await aspetta(130); if (tela.width > 1) visti.add(tela.getContext('2d').getImageData(tela.width >> 1, tela.height >> 1, 1, 1).data[0] > 128 ? 'rosso' : 'blu'); }
    out.lampeggia = [...visti].sort().join();
    out.lampoNota = document.getElementById('eff-prima-nota').hidden;
    metti(new File([byte(cc.avif)], 'verde.avif', { type: 'image/avif' }));
    await aspetta(600);
    const ra = tela.getBoundingClientRect();
    tela.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: ra.left + 3, clientY: ra.top + 3 }));
    await aspetta(200);
    out.avif = { casella: !document.getElementById('eff-chiave-riga').hidden, spenta: !chk.checked, manda: _primaChiave(), nota: document.getElementById('eff-prima-nota').hidden ? '' : document.getElementById('eff-prima-nota').textContent, vista: tela.width };
    metti(new File([byte(cc.cerchio)], 'cerchio.webm', { type: 'video/webm' }));
    await aspetta(900);
    const colorePrima = document.getElementById('eff-chiave-colore').value;
    chk.click();
    await aspetta(300);
    out.angoloVuoto = { prima: colorePrima, dopo: document.getElementById('eff-chiave-colore').value, alfa: alfa() };
    file.value = ''; _primaChiudi();
    out.chiusa = document.getElementById('eff-prima').hidden;
    return out;
  }, CAMPIONI_SFONDO);
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16));
  const verde = sfondo.video.colore ? rgb(sfondo.video.colore) : [];
  dice(sfondo.video.vista && sfondo.video.w === 96 && sfondo.video.prima.join() === '255,255'
    && vicino(verde[0], 40, 4) && vicino(verde[1], 150, 4) && vicino(verde[2], 70, 4) && sfondo.video.dopo.join() === '0,255'
    && sfondo.video.manda?.colore === sfondo.video.colore && sfondo.video.manda?.simile === 0.25 && sfondo.video.manda?.morbido === 0.08
    && sfondo.img.spenta && sfondo.img.prima.join() === '255,255' && sfondo.img.accesa && sfondo.img.colore === '#2a7fff' && sfondo.img.dopo.join() === '0,255'
    && sfondo.illeggibile && sfondo.lampeggia === 'blu,rosso' && sfondo.lampoNota
    && !sfondo.avif.casella && sfondo.avif.spenta && sfondo.avif.manda === null && /AVIF/.test(sfondo.avif.nota) && sfondo.avif.vista === 64
    && sfondo.angoloVuoto.dopo === sfondo.angoloVuoto.prima && sfondo.angoloVuoto.alfa[0] === 0 && pieno(sfondo.angoloVuoto.alfa[1]) && sfondo.chiusa,
  'lo sfondo da togliere: il colore si prende dall\'angolo o col clic, nell\'anteprima il fondo sparisce e il soggetto resta, al server parte quel colore, un formato che il browser non mostra lo dice, un PNG animato si muove, e un AVIF va in onda com\'e\' e lo dice',
  JSON.stringify(sfondo));
  await ed.evaluate(() => window.SB_APP.vai('alert'));

  dice(erroriEd.length === 0, 'l\'editor non ha errori', erroriEd.slice(0, 2).join(' | '));
  dice(erroriLive.length === 0, 'la pagina dell\'overlay non ha errori', erroriLive.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  chiudi();
  ovl.cadi();
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length
  ? `\n${rossi.length} ${rossi.length === 1 ? 'misura non torna' : 'misure non tornano'}: quello che vedi sulla tela non e' quello che va in onda.`
  : '\nLa tela ha le misure della diretta. ✓');
process.exit(rossi.length ? 1 : 0);
