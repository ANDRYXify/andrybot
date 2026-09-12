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
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
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
const MOSTRA = { alert: true, chat: true, wf: true, ws: true, goal: true, cont: true, musica: true, timer: true, effetti: true, consolify: true };
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
  const misuraLive = (sel) => live.evaluate(`(${MISURA})(${JSON.stringify(sel)})`);
  const misuraEd = (sel) => ed.evaluate(`(${MISURA})(${JSON.stringify(sel)})`);

  // --- 1. il player -------------------------------------------------------
  const XY = { x: 50, y: 50, s: 100, r: 0 };
  const CASI_PLAYER = [];
  for (const tema of ['nessuno', 'vinile', 'cassetta', 'terminale', 'manga']) for (const corpo of ['normale', 'slim']) CASI_PLAYER.push({ tema, corpo, verso: 'riga', larghezza: 0 });
  CASI_PLAYER.push({ tema: 'nessuno', corpo: 'normale', verso: 'colonna', larghezza: 0 }, { tema: 'cassetta', corpo: 'slim', verso: 'riga', larghezza: 20 });
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
    const dentro = (m) => m && m.w <= r.w + 1.5 && m.h <= r.h + 1.5;
    const riempie = (m) => m && (vicino(m.w, r.w, 2) || vicino(m.h, r.h, 2));
    const tol = k === 'alert' ? 4 : 1.5;
    dice(dentro(e) && dentro(l) && riempie(l) && vicino(e.w, l.w, tol) && vicino(e.h, l.h, tol),
      `${k} nel riquadro ${RQ[k].w}×${RQ[k].h}%: sta dentro, lo riempie su un lato, uguale di qua e di la' — editor ${e ? mis(e) : '–'}, diretta ${l ? mis(l) : '–'}`);
  }

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
