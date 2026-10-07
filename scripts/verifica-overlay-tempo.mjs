// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello dell'OVERLAY NEL TEMPO (docs/OVERLAY.md, «Il controllo dell'overlay
// nel tempo: cosa si rompeva, e le regole»).
//
// L'overlay resta aperto in OBS per ore, e quello che si rompe si rompe dopo:
// una linea che cade, un evento perso, un orologio storto, una coda che si
// riempie mentre un pezzo e' spento. Ogni regola del documento qui ha una
// prova fatta come succede in diretta, in un browser vero, contro un finto
// server che si comporta come quello vero (scripts/_sito.mjs):
//
//  · un riquadro che torna mentre se ne sta andando si vede (prima restava
//    trasparente: il conto della pubblicita' che spariva all'inizio della pausa);
//  · «Ferma» ferma, e «Parte da solo» parte una volta per apertura;
//  · il tema arriva anche se la prima lettura fallisce, e quello che succede
//    prima della connessione non si perde;
//  · spento vuol dire spento: le code e la chat;
//  · dopo una ricarica, contatori, boss e penitenze si rivedono, e quello che e'
//    finito mentre la linea era giu' se ne va;
//  · un orologio solo, quello del server, anche col computer di OBS sfasato;
//  · lo zero del volume e' silenzio;
//  · un pezzo che non si disegna non blocca gli altri;
//  · i follow vecchi non arrivano in ritardo di minuti;
//  · i testi stanno nel riquadro, e i nomi non rigirano la frase;
//  · le scritte e le etichette hanno un tetto;
//  · le stemme e i Bit si riprovano.
//
//   node scripts/verifica-overlay-tempo.mjs              → esce 1 se qualcosa non torna
//   node scripts/verifica-overlay-tempo.mjs --selftest   → rompe e pretende il rosso
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apriSito, apriBrowser, overlayFinto } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const OVL = 'src/web/public/overlay-app.js';
const CSS = 'src/web/public/overlay-skin.css';
const PRE = 'src/web/public/presets.js';

const ROTTURE = [
  [OVL, "  el.classList.remove('esce');\n  el.classList.add('dentro');\n}\n\nfunction restaMusica", "  el.classList.remove('esce');\n}\n\nfunction restaMusica",
    'un riquadro che torna mentre se ne va resta trasparente'],
  [OVL, "  rientra(timerEl, el);\n", "  if (timerEl.uscita) { clearTimeout(timerEl.uscita); timerEl.uscita = 0; el.classList.remove('esce'); }\n",
    'il timer riavviato mentre se ne va non si vede'],
  [OVL, "  rientra(bitEl, el);\n", '',
    'la classifica dei Bit che torna mentre se ne va sparisce lo stesso'],
  [OVL, "const f = Number(dati.fine); if (Number.isFinite(f)) MIO.timerFine = f;", 'MIO.timerFine = Number(dati.fine) || MIO.timerFine;',
    '«Ferma» non ferma il timer'],
  [OVL, '  const apertura = !temaApplicato;', '  const apertura = true;',
    '«Parte da solo» riparte a ogni rilettura del tema'],
  [OVL, "  if (!preso) l.riprova = setTimeout(caricaTema, TEMA_PASSI[Math.min(l.passo++, TEMA_PASSI.length - 1)]);\n", '',
    'un tema che non arriva al primo colpo non arriva piu\''],
  [OVL, '    suAperto: () => caricaTema(),\n', '',
    'quello che cambia prima della connessione si perde'],
  [OVL, "  if (!mostra('alert')) codaAlert.length = 0;\n", '',
    'spenti gli alert, quelli in coda escono lo stesso'],
  [OVL, "  if (!mostra('effetti')) codaVisiva.length = 0;\n", '',
    'spenti gli effetti, quelli in coda escono lo stesso'],
  [OVL, '  ridisegnaChat();\n', '',
    'spenta la chat (o una piattaforma), le righe restano'],
  [OVL, "  if ('boss' in stato && vale('boss', t)) riconciliaBoss(stato.boss);\n", '',
    'il boss in corso non si rivede dopo una ricarica'],
  [OVL, "  if ('penitenze' in stato) riconciliaPenitenze(stato.penitenze, t);\n", '',
    'le penitenze in corso non si rivedono dopo una ricarica'],
  [OVL, '  riconciliaContatori(Array.isArray(t.contatori) ? t.contatori : null, t);\n', '',
    'i contatori non si rivedono dopo una ricarica'],
  [OVL, "    if (trascorso) barraTempo.style.animationDelay = '-' + trascorso + 's';\n", '',
    'il boss ripreso a meta\' riparte con la barra del tempo piena'],
  [OVL, '  if (bossScena && bossScena.fine && ora > bossScena.fine + FINE_PERSA_MS) bossVia();\n', '',
    'un boss la cui fine si e\' persa resta per sempre'],
  [OVL, '    if (card._finita || !card._scadenza || ora <= card._scadenza + FINE_PERSA_MS) continue;', '    continue;',
    'una penitenza la cui fine si e\' persa resta per sempre'],
  [OVL, "\n    || (d.fase === 'iscrizioni' && d.fine && ora - d.fine > ARENA_FINE_PERSA_MS));", ');',
    'un\'arena ferma alle iscrizioni resta per sempre'],
  [OVL, '(ARENA.finitaA && ora - ARENA.finitaA > ARENA_FINE_PERSA_MS)', 'false',
    'un\'arena finita senza vincitore detto resta per sempre'],
  [OVL, "if (a === 'fine' || a === 'annullata' || a === 'nessuna') {", "if (a === 'fine' || a === 'annullata') {",
    'al ritorno della linea, un\'arena che non c\'e\' piu\' resta'],
  [OVL, '  if (t && t.ora) campioneOra(t.ora);\n', '',
    'il tema non rimette l\'orologio'],
  [OVL, "  if (dati.tipo === 'battito') { campioneOra(dati.ora); return; }", "  if (dati.tipo === 'battito') return;",
    'il battito del flusso non rimette l\'orologio'],
  [OVL, 'window.SUONI_PRESET.suona(ev.suono, ev.volume);', 'window.SUONI_PRESET.suona(ev.suono, ev.volume || 100);',
    'un alert a volume zero suona'],
  [PRE, '    const n = Number(v);\n    return Number.isFinite(n)', '    const n = Number(v) || 100;\n    return Number.isFinite(n)',
    'un suono pronto a volume zero suona al massimo'],
  [OVL, "  try { disegnaAlert(ev); } catch (e) {\n    guaio('alert-rotto', String(e && e.message || e));\n    alertBox.querySelectorAll('.alert-card:not(.dentro)').forEach((c) => c.remove());\n    liberaAlert();\n  }\n", '  disegnaAlert(ev);\n',
    'un alert che non si disegna blocca tutti quelli dopo'],
  [OVL, "  try {\n    if (ev.tipo === 'immagine') mostraImmagine(ev);\n    else if (ev.tipo === 'video') mostraVideo(ev);\n    else if (ev.tipo === 'disegno') mostraDisegno(ev);\n    else finito();\n  } catch (e) {\n    guaio('effetto-rotto', String(e && e.message || e));\n    finito();\n  }\n",
    "  if (ev.tipo === 'immagine') mostraImmagine(ev);\n  else if (ev.tipo === 'video') mostraVideo(ev);\n  else if (ev.tipo === 'disegno') mostraDisegno(ev);\n  else finito();\n",
    'un effetto che non si disegna blocca tutti quelli dopo'],
  [OVL, "  try { giro(); } catch (e) { guaio('giro-rotto', String(e && e.message || e)); }", '  giro();',
    'un guasto nel giro dei secondi ferma tutti i conti'],
  [OVL, "    try { applicaTema(preso); } catch (e) { guaio('tema-rotto', String(e && e.message || e)); }", '    applicaTema(preso);',
    'un tema che non si applica non lo dice a nessuno'],
  [OVL, "    if (ev.kind === 'follow' && ora - (ev._arrivo || ora) > FOLLOW_VECCHIO_MS) continue;\n", '',
    'un follow rimasto in coda per minuti esce lo stesso'],
  [CSS, 'line-height: 1.15; overflow-wrap: anywhere;\n  letter-spacing', 'line-height: 1.15;\n  letter-spacing',
    'un nome lunghissimo esce dal riquadro dell\'alert'],
  [OVL, 'const VERSO = /[\\u202A-\\u202E\\u2066-\\u2069]/g;', 'const VERSO = /(?!)/g;',
    'un carattere che rigira il testo arriva in scena'],
  [OVL, "'<b><bdi>$1</bdi></b>'", "'<b>$1</b>'",
    'il nome non e\' isolato dal resto della frase'],
  [OVL, '  lasciaPosto(etichette, ETICHETTE_MAX);\n', '',
    'le etichette dei comandi si accumulano senza tetto'],
  [OVL, '  lasciaPosto(testi, TESTI_MAX);\n', '',
    'le scritte si accumulano senza tetto'],
  [OVL, '  if (!presi) _badgeRiprova = setTimeout(caricaBadge, 60 * 1000);\n', '',
    'le stemme che non arrivano non si riprovano'],
  [OVL, "  if (MIO.bit && MIO.bit.attivo && mostra('bit') && Date.now() - bitChiesta > 5 * 60 * 1000) chiediBit();\n", '',
    'la classifica dei Bit non si rinfresca mai'],
  [OVL, '  segnaVisto(dati);\n', '',
    'un tema partito prima di un evento e arrivato dopo lo cancella (tutti i pezzi)'],
  [OVL, "  if (vale('timer', t)) MIO.timerFine =", '  MIO.timerFine =',
    'il tema vecchio riaccende il timer appena fermato'],
  [OVL, "  if (vale('pubblicita', t)) MIO.pubblStato =", '  MIO.pubblStato =',
    'il tema vecchio rimette il conto alla pubblicita\''],
  [OVL, "  if (vale('treno', t)) MIO.trenoStato =", '  MIO.trenoStato =',
    'il tema vecchio rimette il treno finito'],
  [OVL, "  if (vale('tempi', t)) MIO.tempiElenco =", '  MIO.tempiElenco =',
    'il tema vecchio rimette i premi a tempo finiti'],
  [OVL, "  if (vale('goal', t)) { MIO.goals", '  if (true) { MIO.goals',
    'il tema vecchio rimette indietro l\'obiettivo'],
  [OVL, "    if (vale('widget:' + id, t)) WIDGET_VALORE[id] = stato[id];", '    WIDGET_VALORE[id] = stato[id];',
    'il tema vecchio rimette il follower di prima'],
  [OVL, "  if ('boss' in stato && vale('boss', t)) riconciliaBoss", "  if ('boss' in stato) riconciliaBoss",
    'il tema vecchio resuscita il boss appena battuto'],
  [OVL, "    if (vive[id] || card._finita || !vale('pen:' + id, t) || card._scadenza <= adesso()) continue;", '    if (vive[id] || card._finita || card._scadenza <= adesso()) continue;',
    'il tema vecchio toglie la penitenza appena cominciata'],
  [OVL, "    if (vive[id] || card._finita || !vale('pen:' + id, t) || card._scadenza <= adesso()) continue;", "    if (vive[id] || card._finita || !vale('pen:' + id, t)) continue;",
    'una penitenza scaduta sparisce prima di dire com\'e\' andata'],
  [OVL, "    if (!vale('pen:' + p.id, t)) continue;\n", '',
    'il tema vecchio rimette indietro il conto della penitenza'],
  [OVL, "for (const k of Object.keys(contatoriVisti)) if (vale('cont:' + k, t)) delete", 'for (const k of Object.keys(contatoriVisti)) delete',
    'il tema vecchio dimentica il contatore appena cambiato'],
  [OVL, "      if (k && vale('cont:' + k, t)) contatoriVisti[k] = d;", '      if (k) contatoriVisti[k] = d;',
    'il tema vecchio rimette indietro il contatore'],
  [OVL, "if (Array.isArray(d && d.righe) && vale('bit', d)) MIO.bitRighe", 'if (Array.isArray(d && d.righe)) MIO.bitRighe',
    'una classifica dei Bit letta prima di un cheer e arrivata dopo lo cancella'],
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
    const via = join(RAD, file);
    const orig = readFileSync(via, 'utf8');
    if (!orig.includes(da)) { console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`); cieche++; continue; }
    writeFileSync(via, orig.replace(da, a));
    let rosso = false, uscita = '';
    try { uscita = execFileSync(process.execPath, [io], { cwd: RAD, encoding: 'utf8', stdio: 'pipe' }); } catch (e) { rosso = true; uscita = String(e.stdout || ''); }
    writeFileSync(via, orig);
    if (/saltato: manca Chromium/.test(uscita)) { console.log('  ✗  senza Chromium l\'autoprova non prova niente'); process.exit(1); }
    const visti = rosso ? uscita.split('\n').filter((r) => /^\s+✗/.test(r)).map((r) => r.trim().split(' — ')[0]).slice(0, 2).join(' · ') : '';
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? `  (${visti})` : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: il cancello non protegge quello che dice di proteggere.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok: !!ok, msg, extra });
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
const secondi = (testo) => String(testo || '').split(':').map(Number).reduce((a, n) => a * 60 + n, 0);

const browser = await apriBrowser();
if (!browser) { console.log('  –  saltato: manca Chromium o Playwright'); process.exit(0); }

const FINTI = [];
const { base, chiudi } = await apriSito({ rotte: (req, res, q) => FINTI.some((f) => f.gestisci(req, res, q)) });
const errori = [];

// Una spia sui suoni: conta ogni suono sintetizzato che parte davvero.
function spiaSuoni() {
  window.__suoni = 0;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  for (const m of ['createOscillator', 'createBufferSource']) {
    const o = C.prototype[m];
    C.prototype[m] = function () {
      const n = o.apply(this, arguments);
      const s = n.start;
      n.start = function () { window.__suoni++; return s.apply(this, arguments); };
      return n;
    };
  }
}

// Il tema minimo che il server manda, piu' quello che la prova ci mette. La
// firma nel CSS dice quando il tema e' stato APPLICATO, non solo letto.
const temaBase = (firma, piu = {}) => ({ css: firma, widget: {}, goals: [], conti: {}, stato: {}, mostra: {}, xy: {}, alertStile: null, chatStile: null, ...piu });
const TIMER = { attivo: true, titolo: 'Si parte fra', aFine: 'sparisce', posizione: 'alto-destra', xy: null, stile: {} };
const TSEL = '.ovl-timer:not(.ovl-pubblicita)';
const PUBBL = { attivo: true, titolo: 'Pubblicità fra', titoloPausa: 'Torno fra', mostraDa: 0, pausa: true, posizione: 'alto-sinistra', xy: null, stile: {} };

let numero = 0;
// Una scena: un finto bot tutto suo (un canale a parte), una pagina, e il modo
// di aspettare che il tema sia applicato.
// `vivo(tema)` cambia il tema al momento di servirlo (lo stato che il server
// tiene e cambia da solo); `primaDiAprire(finto)` prepara un guasto prima che la
// pagina chieda qualunque cosa.
async function scena(nome, { tema = {}, finto = {}, scarto = 0, orologio = false, aspettaTema = true, vivo = null, primaDiAprire = null } = {}) {
  const login = 'prova' + (++numero);
  const firma = '.tema-' + login;
  const T = { val: temaBase(firma, tema) };
  const ovl = overlayFinto({ login, tema: () => (vivo ? vivo(T.val) : T.val), ...finto });
  FINTI.push(ovl);
  if (primaDiAprire) primaDiAprire(ovl);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errori.push(nome + ': ' + String(e.message || e)));
  if (scarto) await page.addInitScript((d) => { const n0 = Date.now.bind(Date); Date.now = () => n0() + d; }, scarto);
  await page.addInitScript(spiaSuoni);
  if (orologio) await page.clock.install();
  await page.goto(`${base}/overlay/${login}?key=x`);
  const s = { nome, login, firma, T, ovl, page };
  s.finche = async (fn, arg, ms = 5000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try { if (await page.evaluate(fn, arg)) return true; } catch { /* la pagina si sta caricando */ }
      await attesa(30);
    }
    return false;
  };
  s.temaApplicato = (ms = 8000) => s.finche((f) => (document.getElementById('css-utente') || {}).textContent?.includes(f), firma, ms);
  s.collegato = async (ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (ovl.st.stream.length) return true; await attesa(30); } return false; };
  s.leggi = (fn, arg) => page.evaluate(fn, arg);
  // Un evento che cambia lo stato, come lo manda il server vero: prima cambia
  // quello che il server sa (il tema che darebbe a chi lo rilegge), poi
  // l'evento parte. Un finto che manda l'evento e tiene il tema vecchio si
  // contraddice: la pagina che rilegge il tema in quel momento (succede a ogni
  // apertura del flusso) torna indietro, e il collaudo misura il finto.
  s.cambia = (ev, muta) => { if (muta) muta(T.val); ovl.manda(ev); };
  // La linea cade e torna: si aspetta la connessione NUOVA (quella vecchia puo'
  // non essersi ancora chiusa) e la rilettura del tema che ne segue.
  s.cadeETorna = async (ms = 10000) => {
    const c0 = ovl.st.connessioni, t0 = ovl.st.tema, inizio = Date.now();
    ovl.cadi();
    while (Date.now() - inizio < ms && !(ovl.st.connessioni > c0 && ovl.st.stream.length && ovl.st.tema > t0)) await attesa(30);
    await attesa(400);
    return ovl.st.tema > t0;
  };
  if (aspettaTema && !(await s.temaApplicato())) dice(false, `${nome}: il tema non arriva`, 'la pagina non ha applicato il tema');
  return s;
}

// Chi entra nel riquadro degli alert (e cosa dice), e quali effetti si vedono:
// quello che passa a schermo anche per un attimo.
const spiaScena = (s) => s.leggi(() => {
  window.__alert = []; window.__effetti = [];
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('alert-card')) window.__alert.push(n.textContent); })
    .observe(document.getElementById('alert'), { childList: true });
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('effetto')) window.__effetti.push(n.getAttribute('src')); })
    .observe(document.body, { childList: true, subtree: true });
});
const leggiConto = (s, sel) => s.leggi((q) => {
  const n = document.querySelector(q);
  if (!n) return null;
  return { num: (n.querySelector('.t-num') || {}).textContent || '', classi: n.className, opacita: Number(getComputedStyle(n).opacity) };
}, sel);
const immagine = (i) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" data-n="${i}"><rect width="40" height="40" fill="red"/></svg>`);

// ———————————————————————————————————————————————————————————— le prove
const PROVE = {
  // 1. UN RIQUADRO CHE TORNA MENTRE SE NE VA SI VEDE. Il timer fermato e
  // subito riavviato, la classifica dei Bit svuotata e subito riempita: e' la
  // stessa cosa del conto della pubblicita' che a zero se ne va e un attimo
  // dopo torna per la pausa.
  async rientra() {
    const BIT = { attivo: true, titolo: 'Bit', posizione: 'basso-destra', xy: null, stile: {} };
    const righe = [{ nome: 'anna', bit: 500 }, { nome: 'bea', bit: 100 }];
    let righeOra = righe;
    const s = await scena('rientra', {
      tema: { timer: TIMER, bit: BIT, stato: { timer: { fine: Date.now() + 120000 } } },
      finto: { rispondi: (q) => (q === '/bit' ? { corpo: { righe: righeOra } } : null) },
    });
    await s.collegato();
    const pronti = await s.finche(() => document.querySelector('.ovl-timer.dentro:not(.ovl-pubblicita)') && document.querySelector('.ovl-bit.dentro'), null, 5000);
    dice(pronti, 'il timer e la classifica dei Bit sono in scena', 'non compaiono');
    righeOra = [];
    s.cambia({ tipo: 'timer', fine: 0 }, (t) => { t.stato = { timer: { fine: 0 } }; });
    s.cambia({ tipo: 'bit', righe: [] });
    const uscendo = await s.finche(() => document.querySelector('.ovl-timer.esce:not(.ovl-pubblicita)') && document.querySelector('.ovl-bit.esce'), null, 1500);
    dice(uscendo, 'fermato il timer e svuotata la classifica, se ne vanno', 'non hanno cominciato ad andarsene');
    const fine = Date.now() + 90000;
    righeOra = righe;
    s.cambia({ tipo: 'timer', fine }, (t) => { t.stato = { timer: { fine } }; });
    s.cambia({ tipo: 'bit', righe });
    // l'uscita dura mezzo secondo: oltre il secondo, quello che c'e' e' rimasto
    await attesa(1100);
    await s.finche((q) => { const n = document.querySelector(q); return n && Number(getComputedStyle(n).opacity) > 0.95; }, TSEL, 1500);
    const t = await leggiConto(s, TSEL);
    dice(t && t.opacita > 0.95 && /dentro/.test(t.classi) && !/esce/.test(t.classi), 'il timer riavviato mentre se ne andava si vede, pieno', t ? `opacita' ${t.opacita}, classi «${t.classi}»` : 'sparito');
    dice(t && Math.abs(secondi(t.num) - 89) <= 2, 'e conta il tempo nuovo', t ? `dice ${t.num}` : '');
    const b = await s.leggi(() => { const n = document.querySelector('.ovl-bit'); return n ? { opacita: Number(getComputedStyle(n).opacity), classi: n.className } : null; });
    dice(b && b.opacita > 0.95 && !/esce/.test(b.classi), 'la classifica dei Bit tornata mentre se ne andava resta, e si vede', b ? `opacita' ${b.opacita}, classi «${b.classi}»` : 'sparita');
  },

  // 2. «FERMA» FERMA.
  async ferma() {
    const s = await scena('ferma', { tema: { timer: { ...TIMER, aFine: 'resta' }, stato: { timer: { fine: Date.now() + 120000 } } } });
    await s.collegato();
    await s.finche(() => document.querySelector('.ovl-timer.dentro:not(.ovl-pubblicita)'), null, 5000);
    s.cambia({ tipo: 'timer', fine: 0 }, (t) => { t.stato = { timer: { fine: 0 } }; });
    await s.finche((q) => !document.querySelector(q), TSEL, 3000);
    const t = await leggiConto(s, TSEL);
    dice(!t, '«Ferma» toglie il timer dalla scena, anche se a fine conto resterebbe', t ? `resta: ${t.num}` : '');
  },

  // 3. «PARTE DA SOLO» PARTE UNA VOLTA PER APERTURA: non a ogni rilettura del
  // tema (una linea che torna, una modifica salvata), quando il conto di prima
  // e' finito.
  async parteDaSolo() {
    let fine = Date.now() - 5000;
    const s = await scena('parte-da-solo', {
      tema: { timer: { ...TIMER, partiDaSolo: true } },
      vivo: (t) => ({ ...t, stato: { timer: { fine } } }),
      finto: {
        rispondi: (q) => {
          if (q !== '/timer/parti') return null;
          fine = Date.now() + 2000;
          return { corpo: { fine } };
        },
      },
    });
    await s.collegato();
    const t0 = Date.now();
    while (Date.now() - t0 < 4000 && !s.ovl.st.chieste['/timer/parti']) await attesa(30);
    await attesa(600);
    dice(s.ovl.st.chieste['/timer/parti'] === 1, 'all\'apertura il timer finito parte da solo, una volta', `partito ${s.ovl.st.chieste['/timer/parti'] || 0} volte`);
    // il conto partito dura due secondi: si aspetta che finisca
    await s.finche((q) => !document.querySelector(q), TSEL, 5000);
    await s.cadeETorna();
    s.ovl.manda({ tipo: 'tema' });
    await attesa(1500);
    dice(s.ovl.st.chieste['/timer/parti'] === 1, 'finito il conto, una linea che torna o un tema riletto non lo fanno ripartire', `partito ${s.ovl.st.chieste['/timer/parti'] || 0} volte`);
  },

  // 4. IL TEMA ARRIVA ANCHE SE LA PRIMA LETTURA FALLISCE.
  async temaRiprova() {
    const s = await scena('tema-riprova', { aspettaTema: false, primaDiAprire: (o) => { o.st.temaGiu = true; } });
    await attesa(1500);
    const presto = await s.leggi((f) => (document.getElementById('css-utente') || {}).textContent?.includes(f), s.firma);
    s.ovl.st.temaGiu = false;
    const poi = await s.temaApplicato(6000);
    dice(!presto && poi, 'un tema che non arriva al primo colpo si riprova, e arriva', presto ? 'il guasto non c\'era' : 'mai arrivato');
  },

  // 5. QUELLO CHE CAMBIA PRIMA DELLA CONNESSIONE NON SI PERDE. Il tema si
  // legge, il timer parte (l'evento va a nessuno: la pagina non e' ancora
  // collegata), poi il flusso si apre.
  async primaDelFlusso() {
    const s = await scena('prima-del-flusso', { tema: { timer: TIMER }, finto: { attesaFlusso: 1800 } });
    s.T.val = { ...s.T.val, stato: { timer: { fine: Date.now() + 90000 } } };
    const visto = await s.finche(() => document.querySelector('.ovl-timer.dentro:not(.ovl-pubblicita)'), null, 4000);
    dice(visto, 'il timer partito fra la lettura del tema e l\'apertura del flusso si vede', 'non c\'e\'');
  },

  // 6. SPENTI VUOL DIRE SPENTI: le code. Tre alert e tre effetti in fila, poi
  // lo streamer li spegne in questo overlay: quello a schermo finisce, gli
  // altri non escono piu'.
  async codeSpente() {
    const s = await scena('code-spente');
    await s.collegato();
    await spiaScena(s);
    for (const n of ['Uno', 'Due', 'Tre']) s.ovl.manda({ tipo: 'alert', kind: 'sub', testo: `${n} si e' abbonato`, durata: 2000 });
    for (let i = 1; i <= 3; i++) s.ovl.manda({ tipo: 'immagine', url: immagine(i), durata: 1500 });
    await s.finche(() => window.__alert.length >= 1 && window.__effetti.length >= 1, null, 3000);
    s.cambia({ tipo: 'tema' }, (t) => { t.mostra = { alert: false, effetti: false }; });
    await attesa(3800);
    const v = await s.leggi(() => ({ alert: window.__alert, effetti: window.__effetti }));
    dice(v.alert.length === 1 && /Uno/.test(v.alert[0]), 'spenti gli alert, quelli in coda non escono', 'usciti: ' + v.alert.join(' · '));
    dice(v.effetti.length === 1, 'spenti gli effetti, quelli in coda non escono', `usciti ${v.effetti.length}`);
  },

  // 7. SPENTI VUOL DIRE SPENTI: la chat, e una piattaforma sola. E un nome che
  // prova a rigirare il testo non lo rigira.
  async chatSpenta() {
    const s = await scena('chat-spenta');
    await s.collegato();
    s.ovl.manda({ tipo: 'chat', user: '\u202Eanna', testo: 'ciao a tutti', piattaforma: 'twitch' });
    s.ovl.manda({ tipo: 'chat', user: 'bea', testo: 'eccomi', piattaforma: 'kick' });
    s.ovl.manda({ tipo: 'chat', user: 'carlo', testo: 'buonasera', piattaforma: 'twitch' });
    await s.finche(() => document.querySelectorAll('#chatlive .chat-riga').length >= 3, null, 3000);
    const righe = () => s.leggi(() => [...document.querySelectorAll('#chatlive .chat-riga')].map((r) => r.textContent));
    const prima = await righe();
    dice(prima.length === 3, 'la chat mostra le righe di tutte le piattaforme', `righe: ${prima.length}`);
    dice(prima.length && !prima.some((r) => /[\u202A-\u202E\u2066-\u2069]/.test(r)), 'un nome con un carattere che rigira il testo arriva senza', prima.join(' · '));
    const letti = s.ovl.st.tema;
    s.cambia({ tipo: 'tema' }, (t) => { t.mostra = { 'chat:kick': false }; });
    await s.finche(() => document.querySelectorAll('#chatlive .chat-riga').length === 2, null, 3000);
    const senzaKick = await righe();
    dice(s.ovl.st.tema > letti, 'il tema cambiato si rilegge', 'non riletto');
    dice(senzaKick.length === 2 && !senzaKick.some((r) => /bea/.test(r)), 'spenta una piattaforma, le sue righe vanno via e le altre restano', senzaKick.join(' · '));
    s.cambia({ tipo: 'tema' }, (t) => { t.mostra = { chat: false }; });
    await s.finche(() => !document.querySelectorAll('#chatlive .chat-riga').length, null, 3000);
    const spenta = await righe();
    dice(spenta.length === 0, 'spenta la chat, la scena si svuota', `restano ${spenta.length} righe`);
  },

  // 8. DOPO UNA RICARICA SI RIVEDE QUELLO CHE C'E': contatori, boss,
  // penitenze, dal tema. E se nel frattempo e' finito, se ne va.
  async ricarica() {
    const ora = Date.now();
    const s = await scena('ricarica', {
      tema: {
        boss: { attivo: true, stile: {} },
        contatori: [{ tipo: 'contatore', comando: 'morti', mostra: true, testo: 'Morti: 3', x: 4, y: 94, r: 0, colore: '#ffffff', sfondo: 'rgba(0,0,0,.55)', dim: 40, grassetto: true, font: 'system' }],
        stato: {
          boss: { nome: 'Drago', vita: 40, vitaMax: 100, fine: ora + 30000, durata: 90 },
          penitenze: [{ id: 'p1', modo: 'vietata', cosa: 'parola', valore: 'ciao', count: 2, fine: ora + 60000, posizione: 'alto-destra', colore: '#ff5566' }],
        },
      },
    });
    await s.finche(() => document.querySelector('.contatore-widget') && document.querySelector('#boss .boss-nome') && document.querySelector('#penitenze .pen-card'), null, 3000);
    const leggi = () => s.leggi(() => ({
      cont: [...document.querySelectorAll('.contatore-widget')].map((n) => n.textContent),
      boss: (document.querySelector('#boss .boss-nome') || {}).textContent || null,
      ritardo: (document.querySelector('#boss .boss-tempo') || { style: {} }).style.animationDelay || '',
      pen: [...document.querySelectorAll('#penitenze .pen-card')].map((n) => ({ parola: (n.querySelector('.pen-parola') || {}).textContent || '', conto: (n.querySelector('.pen-num') || {}).textContent || '' })),
    }));
    const v = await leggi();
    dice(v.cont.includes('Morti: 3'), 'riaperto l\'overlay, il contatore si rivede', `contatori: ${v.cont.join(' · ') || 'nessuno'}`);
    dice(v.boss === 'Drago', 'il boss in corso si rivede', `boss: ${v.boss}`);
    dice(Math.abs(parseFloat(v.ritardo) + 60) <= 2, 'con la barra del tempo a che punto e\' (un minuto passato su un minuto e mezzo)', `ritardo «${v.ritardo}»`);
    dice(v.pen.length === 1 && /CIAO/.test(v.pen[0].parola) && v.pen[0].conto === '2', 'la penitenza in corso si rivede, col suo conto', JSON.stringify(v.pen));
    s.T.val = { ...s.T.val, contatori: [], stato: { boss: null, penitenze: [] } };
    await s.cadeETorna();
    await s.finche(() => !document.querySelector('.contatore-widget') && !document.querySelector('#boss .boss-nome') && !document.querySelector('#penitenze .pen-card'), null, 3000);
    const dopo = await leggi();
    dice(!dopo.cont.length && !dopo.boss && !dopo.pen.length, 'finiti mentre la linea era giu\', al ritorno se ne vanno', JSON.stringify(dopo));
  },

  // 9. QUELLO CHE E' FINITO E NESSUNO L'HA DETTO SE NE VA DA SOLO: il boss, la
  // penitenza, l'arena ferma alle iscrizioni. Il messaggio della fine si e'
  // perso; passato il tempo, la scena si pulisce.
  async finePersa() {
    const s = await scena('fine-persa', { tema: { boss: { attivo: true, stile: {} }, arena: { attivo: true, stile: {} } }, orologio: true });
    await s.collegato();
    const ora = Date.now();
    // il server sa del boss e della penitenza finche' durano (il tema li porta)
    s.cambia({ tipo: 'boss', azione: 'arriva', nome: 'Drago', vita: 100, vitaMax: 100, durata: 5, fine: ora + 5000 },
      (t) => { t.stato = { ...t.stato, boss: { nome: 'Drago', vita: 100, vitaMax: 100, durata: 5, fine: ora + 5000 } }; });
    s.cambia({ tipo: 'penitenza', azione: 'start', id: 'p9', modo: 'vietata', valore: 'ciao', fine: ora + 5000, durata: 1, posizione: 'alto-destra' },
      (t) => { t.stato = { ...t.stato, penitenze: [{ id: 'p9', modo: 'vietata', cosa: 'parola', valore: 'ciao', count: 0, fine: ora + 5000, posizione: 'alto-destra' }] }; });
    s.ovl.manda({ tipo: 'arena', azione: 'iscrizioni', ora, aperta: ora, fineIscrizioni: ora + 5000, combattenti: [{ id: '1', nome: 'anna' }, { id: '2', nome: 'bea' }], righe: [], regole: {} });
    const leggi = () => s.leggi(() => ({
      boss: !!document.querySelector('#boss .ovl-boss'),
      pen: document.querySelectorAll('#penitenze .pen-card').length,
      arena: document.querySelectorAll('.ovl-arena:not(.arena-via)').length,
    }));
    await s.finche(() => document.querySelector('#boss .ovl-boss') && document.querySelector('#penitenze .pen-card') && document.querySelector('.ovl-arena'), null, 3000);
    const prima = await leggi();
    dice(prima.boss && prima.pen === 1 && prima.arena === 1, 'boss, penitenza e arena sono in scena', JSON.stringify(prima));
    // finiscono sul server, e il messaggio della fine si perde: la pagina non
    // rilegge niente (la linea non cade), e deve pulire da se'
    s.T.val = { ...s.T.val, stato: { boss: null, penitenze: [] } };
    for (let i = 0; i < 6; i++) { await s.page.clock.fastForward(10000); s.ovl.manda({ tipo: 'battito', ora: Date.now() + (i + 1) * 10000 }); await attesa(150); }
    await s.finche(() => !document.querySelector('#boss .ovl-boss') && !document.querySelector('#penitenze .pen-card') && !document.querySelector('.ovl-arena:not(.arena-via)'), null, 4000);
    const dopo = await leggi();
    dice(!dopo.boss, 'un boss la cui fine si e\' persa se ne va da solo', 'resta');
    dice(dopo.pen === 0, 'una penitenza la cui fine si e\' persa se ne va da sola', `restano ${dopo.pen}`);
    dice(dopo.arena === 0, 'un\'arena ferma alle iscrizioni se ne va da sola', 'resta');
  },

  // 10. UN'ARENA FINITA SENZA CHE NESSUNO DICA CHI HA VINTO se ne va da sola.
  async arenaFinita() {
    const s = await scena('arena-finita', { tema: { arena: { attivo: true, stile: {} } }, orologio: true });
    await s.collegato();
    const ora = Date.now();
    s.ovl.manda({ tipo: 'arena', azione: 'battaglia', ora, seme: 'abc', t0: ora - 40000, combattenti: [{ id: '1', nome: 'anna' }, { id: '2', nome: 'bea' }], regole: { durataMax: 30 } });
    const finita = await s.finche(() => typeof ARENA !== 'undefined' && !!ARENA.finitaA, null, 6000);
    dice(finita, 'una battaglia arrivata in fondo si sa finita', 'la simulazione non arriva in fondo');
    for (let i = 0; i < 5; i++) { await s.page.clock.fastForward(10000); s.ovl.manda({ tipo: 'battito', ora: Date.now() + (i + 1) * 10000 }); await attesa(150); }
    await s.finche(() => !document.querySelector('.ovl-arena:not(.arena-via)'), null, 4000);
    const resta = await s.leggi(() => document.querySelectorAll('.ovl-arena:not(.arena-via)').length);
    dice(resta === 0, 'finita e senza vincitore detto, se ne va da sola', 'resta in scena');
  },

  // 11. AL RITORNO DELLA LINEA, UN'ARENA CHE NON C'E' PIU' SE NE VA: il server
  // dice «nessuna» a chi si collega.
  async arenaNessuna() {
    const s = await scena('arena-nessuna', { tema: { arena: { attivo: true, stile: {} } } });
    await s.collegato();
    const ora = Date.now();
    s.ovl.manda({ tipo: 'arena', azione: 'iscrizioni', ora, aperta: ora, fineIscrizioni: ora + 120000, combattenti: [{ id: '1', nome: 'anna' }], righe: [], regole: {} });
    const c = await s.finche(() => document.querySelector('.ovl-arena:not(.arena-via)'), null, 3000);
    dice(c, 'l\'arena aperta e\' in scena', 'non compare');
    await s.cadeETorna();
    const resta = await s.leggi(() => document.querySelectorAll('.ovl-arena:not(.arena-via)').length);
    dice(resta === 0, 'al ritorno della linea, un\'arena che il server non ha piu\' se ne va', 'resta in scena');
  },

  // 12. UN OROLOGIO SOLO, QUELLO DEL SERVER. Il computer di OBS avanti di
  // cinque minuti: i conti dicono quello che dice il server, e un timer a meta'
  // non viene creduto finito (e fatto ripartire).
  async orologioDalTema() {
    const ora = Date.now();
    const s = await scena('orologio-tema', {
      scarto: 5 * 60000,
      tema: { timer: { ...TIMER, partiDaSolo: true }, pubblicita: { ...PUBBL, stato: { prossima: ora + 90000, pausaFino: 0 } }, stato: { timer: { fine: ora + 120000 } } },
      finto: { attesaFlusso: 4000 },
    });
    // il flusso si apre dopo quattro secondi: fino ad allora l'ora l'ha data solo il tema
    await s.finche((q) => document.querySelector(q) && document.querySelector('.ovl-pubblicita'), TSEL, 2500);
    const t = await leggiConto(s, TSEL);
    const p = await leggiConto(s, '.ovl-pubblicita');
    dice(t && Math.abs(secondi(t.num) - 119) <= 2, 'col computer avanti di cinque minuti il timer dice quello del server', t ? `dice ${t.num}` : 'non c\'e\'');
    dice(p && Math.abs(secondi(p.num) - 89) <= 2, 'e anche il conto alla pubblicita\'', p ? `dice ${p.num}` : 'non c\'e\'');
    dice(!s.ovl.st.chieste['/timer/parti'], 'un timer a meta\' non viene creduto finito e fatto ripartire', `fatto ripartire ${s.ovl.st.chieste['/timer/parti']} volte`);
  },
  async orologioDalBattito() {
    const ora = Date.now();
    const s = await scena('orologio-battito', { scarto: -3 * 60000, tema: { ora: undefined, timer: TIMER, stato: { timer: { fine: ora + 120000 } } } });
    await s.collegato();
    await s.finche((q) => { const n = document.querySelector(q + ' .t-num'); if (!n) return false; const x = n.textContent.split(':').map(Number).reduce((a, k) => a * 60 + k, 0); return x <= 125; }, TSEL, 4000);
    const t = await leggiConto(s, TSEL);
    dice(t && Math.abs(secondi(t.num) - 118) <= 3, 'col computer indietro di tre minuti, il battito del flusso rimette l\'orologio', t ? `dice ${t.num}` : 'non c\'e\'');
  },

  // 13. LO ZERO E' SILENZIO.
  async volumeZero() {
    const s = await scena('volume-zero');
    await s.collegato();
    const id = await s.leggi(() => window.SUONI_PRESET.lista[0].id);
    s.ovl.manda({ tipo: 'alert', kind: 'sub', testo: 'Zeno muto', suono: id, volume: 0, durata: 2000 });
    s.ovl.manda({ tipo: 'preset', preset: id, volume: 0 });
    await attesa(900);
    const muto = await s.leggi(() => window.__suoni);
    dice(muto === 0, 'un alert e un suono pronto a volume zero non suonano', `partiti ${muto} suoni`);
    s.ovl.manda({ tipo: 'alert', kind: 'sub', testo: 'Zeno forte', suono: id, volume: 60, durata: 2000 });
    await s.finche(() => window.__suoni > 0, null, 6000);
    const forte = await s.leggi(() => window.__suoni);
    dice(forte > 0, 'e a sessanta si', 'nessun suono: la spia non vede niente');
  },

  // 14. UN PEZZO CHE NON SI DISEGNA NON BLOCCA GLI ALTRI. Si guasta di
  // proposito il disegno di un alert, di un effetto, il giro dei secondi e
  // l'applicazione del tema, una volta: quello dopo va, e il guasto si dice.
  async guasti() {
    const s = await scena('guasti', { tema: { timer: TIMER, stato: { timer: { fine: Date.now() + 120000 } } } });
    await s.collegato();
    await spiaScena(s);
    await s.leggi(() => {
      for (const nome of ['disegnaAlert', 'mostraImmagine', 'scadonoDaSoli']) {
        const vero = window[nome];
        window[nome] = function () { window[nome] = vero; throw new Error('guasto di prova: ' + nome); };
      }
    });
    s.ovl.manda({ tipo: 'alert', kind: 'sub', testo: 'Primo guasto', durata: 2000 });
    s.ovl.manda({ tipo: 'alert', kind: 'sub', testo: 'Secondo arriva', durata: 2000 });
    s.ovl.manda({ tipo: 'immagine', url: immagine(1), durata: 800 });
    s.ovl.manda({ tipo: 'immagine', url: immagine(2), durata: 800 });
    const t0 = await leggiConto(s, TSEL);
    const inizio = Date.now();
    await s.finche(() => window.__alert.some((a) => /Secondo/.test(a)) && window.__effetti.length >= 1, null, 5000);
    await attesa(Math.max(0, 2600 - (Date.now() - inizio)));
    const v = await s.leggi(() => ({ alert: window.__alert, effetti: window.__effetti }));
    dice(v.alert.some((a) => /Secondo/.test(a)), 'un alert che non si disegna non blocca quello dopo', 'usciti: ' + (v.alert.join(' · ') || 'nessuno'));
    dice(v.effetti.length >= 1, 'un effetto che non si disegna non blocca quello dopo', 'nessun effetto uscito');
    const t1 = await leggiConto(s, TSEL);
    dice(t0 && t1 && secondi(t0.num) - secondi(t1.num) >= 2, 'un guasto nel giro dei secondi non ferma i conti', `da ${t0 && t0.num} a ${t1 && t1.num}`);
    await s.leggi(() => { const vero = window.applicaTema; window.applicaTema = function () { window.applicaTema = vero; throw new Error('guasto di prova: applicaTema'); }; });
    s.ovl.manda({ tipo: 'tema' });
    const g = s.ovl.st.guai;
    for (let i = 0; i < 100 && !g.includes('tema-rotto'); i++) await attesa(30);
    dice(['alert-rotto', 'effetto-rotto', 'giro-rotto', 'tema-rotto'].every((k) => g.includes(k)), 'e ogni guasto si dice al server', 'detti: ' + (g.join(', ') || 'nessuno'));
  },

  // 15. I FOLLOW VECCHI NON ARRIVANO IN RITARDO DI MINUTI. Un alert lungo
  // tiene il posto per due minuti: il follow in coda dietro di lui non esce
  // piu', l'abbonamento si', e un follow appena arrivato anche.
  async followVecchi() {
    const s = await scena('follow-vecchi', { orologio: true });
    await s.collegato();
    await spiaScena(s);
    s.ovl.manda({ tipo: 'alert', kind: 'sub', testo: 'Lungo si e\' abbonato', durata: 120000 });
    s.ovl.manda({ tipo: 'alert', kind: 'follow', testo: 'Fede ha cominciato a seguire', durata: 2000 });
    s.ovl.manda({ tipo: 'alert', kind: 'sub', testo: 'Sara si e\' abbonata', durata: 2000 });
    await attesa(400);
    for (let i = 0; i < 13; i++) { await s.page.clock.fastForward(10000); s.ovl.manda({ tipo: 'battito', ora: Date.now() }); await attesa(60); }
    await attesa(1500);
    s.ovl.manda({ tipo: 'alert', kind: 'follow', testo: 'Gino ha cominciato a seguire', durata: 2000 });
    for (let i = 0; i < 4; i++) {
      await s.page.clock.fastForward(3000);
      if (await s.finche(() => window.__alert.some((a) => /Gino/.test(a)), null, 1500)) break;
    }
    const v = await s.leggi(() => window.__alert);
    dice(!v.some((a) => /Fede/.test(a)), 'un follow rimasto in coda per due minuti non esce', 'uscito: ' + v.join(' · '));
    dice(v.some((a) => /Sara/.test(a)), 'l\'abbonamento in coda esce', 'usciti: ' + v.join(' · '));
    dice(v.some((a) => /Gino/.test(a)), 'e un follow appena arrivato esce', 'usciti: ' + v.join(' · '));
  },

  // 16. I TESTI STANNO NEL RIQUADRO. Un nome lunghissimo senza spazi va a capo
  // dentro la carta; un nome con un carattere che rigira il testo arriva senza,
  // e isolato dal resto della frase.
  async testoLungo() {
    const s = await scena('testo-lungo');
    await s.collegato();
    s.ovl.manda({ tipo: 'alert', kind: 'sub', testo: 'W'.repeat(160) + ' si e\' abbonato', durata: 4000 });
    await s.finche(() => document.querySelector('#alert .alert-card.dentro'), null, 3000);
    await attesa(700);
    const m = await s.leggi(() => {
      const c = document.querySelector('#alert .alert-card');
      const t = c && c.querySelector('.alert-testo');
      if (!t) return null;
      const r = c.getBoundingClientRect();
      return { sinistra: r.left, destra: r.right, larga: innerWidth, sw: t.scrollWidth, cw: t.clientWidth };
    });
    dice(m && m.sinistra >= 0 && m.destra <= m.larga && m.sw <= m.cw + 1, 'un nome lunghissimo va a capo dentro la carta', m ? JSON.stringify(m) : 'nessuna carta');
  },
  async testoRigirato() {
    const s = await scena('testo-rigirato');
    await s.collegato();
    s.ovl.manda({ tipo: 'alert', kind: 'follow', testo: '\u202Eanna ha cominciato a seguire', durata: 3000 });
    await s.finche(() => document.querySelector('#alert .alert-card'), null, 3000);
    const m = await s.leggi(() => {
      const c = document.querySelector('#alert .alert-card');
      return { testo: c.textContent, isolato: (c.querySelector('.alert-testo b bdi') || {}).textContent || '' };
    });
    dice(!/[\u202A-\u202E\u2066-\u2069]/.test(m.testo), 'un carattere che rigira il testo non arriva in scena', JSON.stringify(m.testo));
    dice(m.isolato === 'anna', 'e il nome e\' isolato dal resto della frase', `isolato: «${m.isolato}»`);
  },

  // 17. LE SCRITTE E LE ETICHETTE HANNO UN TETTO: una raffica non riempie lo
  // schermo, e l'ultima arrivata c'e'.
  async tetti() {
    const s = await scena('tetti', { tema: { etichetta: { attivo: true, stile: {} }, scritta: { attivo: true, stile: {} } } });
    await s.collegato();
    const id = await s.leggi(() => window.SUONI_PRESET.lista[0].id);
    for (let i = 1; i <= 8; i++) s.ovl.manda({ tipo: 'preset', preset: id, volume: 0, comando: 'c' + i });
    for (let i = 1; i <= 6; i++) s.ovl.manda({ tipo: 'testo', testo: 'riga ' + i, durata: 8000 });
    await s.finche(() => [...document.getElementById('etichette').children].some((n) => n.textContent === 'c8') && /riga 6/.test(document.getElementById('testi').textContent), null, 3000);
    // chi lascia il posto se ne va in 300 ms; le etichette durano 1,6 s
    await attesa(400);
    const v = await s.leggi(() => ({ eti: [...document.getElementById('etichette').children].map((n) => n.textContent), testi: [...document.getElementById('testi').children].map((n) => n.textContent) }));
    dice(v.eti.length <= 4 && v.eti.includes('c8'), 'una raffica di comandi lascia al massimo quattro etichette, l\'ultima compresa', v.eti.join(' · '));
    dice(v.testi.length <= 3 && v.testi.some((t) => /riga 6/.test(t)), 'una raffica di scritte ne lascia al massimo tre, l\'ultima compresa', v.testi.join(' · '));
  },

  // 18. LE STEMME E I BIT SI RIPROVANO: le stemme che non arrivano si
  // richiedono dopo un minuto, la classifica dei Bit si rinfresca ogni cinque.
  async riprove() {
    let stemme = 0;
    const s = await scena('riprove', {
      orologio: true,
      tema: { bit: { attivo: true, titolo: 'Bit', posizione: 'basso-destra', xy: null, stile: {} } },
      finto: {
        rispondi: (q) => {
          if (q === '/badges') return ++stemme === 1 ? { stato: 500, corpo: { error: 'guasto' } } : { corpo: {} };
          if (q === '/bit') return { corpo: { righe: [{ nome: 'anna', bit: 300 }] } };
          return null;
        },
      },
    });
    await s.collegato();
    for (let i = 0; i < 100 && !(s.ovl.st.chieste['/bit'] && stemme); i++) await attesa(30);
    await attesa(400);
    const bit0 = s.ovl.st.chieste['/bit'] || 0;
    dice(stemme === 1, 'all\'apertura le stemme si chiedono', `chieste ${stemme} volte`);
    for (let i = 0; i < 7; i++) { await s.page.clock.fastForward(10000); s.ovl.manda({ tipo: 'battito', ora: Date.now() }); await attesa(60); }
    for (let i = 0; i < 100 && stemme < 2; i++) await attesa(30);
    dice(stemme === 2, 'non arrivate, si richiedono dopo un minuto', `chieste ${stemme} volte`);
    for (let i = 0; i < 25; i++) { await s.page.clock.fastForward(10000); s.ovl.manda({ tipo: 'battito', ora: Date.now() }); await attesa(60); }
    for (let i = 0; i < 100 && (s.ovl.st.chieste['/bit'] || 0) <= bit0; i++) await attesa(30);
    const bit1 = s.ovl.st.chieste['/bit'] || 0;
    dice(bit1 > bit0, 'la classifica dei Bit si rinfresca da sola', `chiesta ${bit0} volte all'apertura, ${bit1} dopo cinque minuti`);
  },

  // 18b. UNA PENITENZA SCADUTA ASPETTA IL SUO ESITO. Allo scadere il server la
  // toglie dall'elenco e sceglie la penitenza DOPO (a volte chiedendola all'IA,
  // un secondo o due). Un tema riletto in quel mezzo non la elenca piu': la
  // carta deve restare, e mostrare l'esito quando arriva.
  async penitenzaEsito() {
    const fine = Date.now() + 1500;
    const pen = { id: 'p7', modo: 'vietata', cosa: 'parola', valore: 'ciao', count: 2, fine, posizione: 'alto-destra' };
    const s = await scena('penitenza-esito', { vivo: (t) => ({ ...t, stato: { penitenze: Date.now() < fine ? [pen] : [] } }) });
    await s.collegato();
    await s.finche(() => document.querySelector('#penitenze .pen-card'), null, 3000);
    while (Date.now() < fine + 400) await attesa(50);
    const letti = s.ovl.st.tema;
    s.ovl.manda({ tipo: 'tema' });
    for (let i = 0; i < 100 && s.ovl.st.tema <= letti; i++) await attesa(20);
    await attesa(400);
    s.ovl.manda({ tipo: 'penitenza', azione: 'end', id: 'p7', count: 2, penitenza: '10 flessioni' });
    const visto = await s.finche(() => /10 flessioni/.test((document.querySelector('#penitenze .pen-esito') || {}).textContent || ''), null, 2000);
    dice(visto, 'una penitenza scaduta mostra il suo esito anche se il tema riletto non la elenca piu\'', 'la carta era gia\' sparita');
  },

  // 19. VINCE IL DATO PIU' NUOVO. Il tema (e la classifica dei Bit) si legge
  // alla richiesta e arriva un secondo dopo; in mezzo arrivano gli eventi che
  // cambiano ogni pezzo. Per ogni pezzo resta quello che dice l'evento: il tema
  // e' piu' vecchio, e il numero d'ordine lo dice.
  async temaVecchio() {
    const ora = Date.now();
    const CONT = (testo) => ({ tipo: 'contatore', comando: 'morti', mostra: true, testo, x: 4, y: 94, r: 0, colore: '#ffffff', sfondo: 'rgba(0,0,0,.55)', dim: 40, grassetto: true, font: 'system' });
    const GOAL = [{ id: 'g1', attivo: true, tipo: 'follower', obiettivo: 10, partenza: 0, titolo: 'Follower', posizione: 'alto-sinistra', stile: {} }];
    const WF = { attivo: true, posizione: 'basso-destra', testo: '{nome}', stile: {} };
    let bit = [{ nome: 'vecchio', bit: 100 }];
    let ritardoBit = 0;
    const s = await scena('tema-vecchio', {
      tema: {
        timer: { ...TIMER, aFine: 'resta' },
        pubblicita: { ...PUBBL, stato: { prossima: ora + 90000, pausaFino: 0 } },
        treno: { attivo: true, posizione: 'basso-sinistra', xy: null, stile: {} },
        tempi: { attivo: true, posizione: 'basso-destra', xy: null, stile: {}, elenco: [{ chiave: 'a', titolo: 'Premio', fino: ora + 60000, chi: 'anna' }] },
        goals: GOAL, conti: { g1: 2 },
        widget: { ultimoFollower: WF },
        boss: { attivo: true, stile: {} },
        bit: { attivo: true, titolo: 'Bit', posizione: 'alto-destra', xy: null, stile: {} },
        contatori: [CONT('Morti: 3')],
        stato: {
          timer: { fine: ora + 120000 },
          treno: { livello: 1, quanto: 50, meta: 100, scade: ora + 60000, finito: false },
          ultimoFollower: 'vecchio',
          boss: { nome: 'Drago', vita: 40, vitaMax: 100, fine: ora + 60000, durata: 90 },
          penitenze: [{ id: 'p1', modo: 'vietata', cosa: 'parola', valore: 'ciao', count: 1, fine: ora + 60000, posizione: 'alto-destra' }],
        },
      },
      finto: { rispondi: (q) => (q === '/bit' ? { corpo: { righe: bit }, ritardo: ritardoBit } : null) },
    });
    await s.collegato();
    const leggi = () => s.leggi(() => ({
      timer: !!document.querySelector('.ovl-timer:not(.ovl-pubblicita):not(.esce)'),
      pubblicita: !!document.querySelector('.ovl-pubblicita:not(.esce)'),
      treno: !!document.querySelector('.ovl-treno:not(.esce)'),
      tempi: !!document.querySelector('.ovl-tempi:not(.esce)'),
      goal: (document.querySelector('.ovl-goal .g-num') || {}).textContent || '',
      follower: (document.querySelector('.w-testo b') || {}).textContent || '',
      boss: !!document.querySelector('#boss .ovl-boss:not(.boss-ko)'),
      pen: Object.fromEntries([...document.querySelectorAll('#penitenze .pen-card')].map((c) => [(c.querySelector('.pen-parola') || {}).textContent || '', (c.querySelector('.pen-num') || {}).textContent || ''])),
      cont: (document.querySelector('.contatore-widget') || {}).textContent || '',
      bit: (document.querySelector('.ovl-bit') || {}).textContent || '',
    }));
    // tutto in scena, e le due letture dell'apertura (prima e dopo il flusso) finite
    await s.finche(() => document.querySelector('.ovl-treno') && document.querySelector('.ovl-tempi') && document.querySelector('.ovl-goal') && document.querySelector('#boss .ovl-boss') && document.querySelector('.ovl-bit') && document.querySelector('.contatore-widget'), null, 5000);
    for (let i = 0; i < 100 && s.ovl.st.tema < 2; i++) await attesa(30);
    await attesa(500);
    const prima = await leggi();
    dice(prima.timer && prima.pubblicita && prima.treno && prima.tempi && prima.goal === '2 / 10' && prima.follower === 'vecchio' && prima.boss && prima.pen.vietataCIAO === '1' && prima.cont === 'Morti: 3' && /vecchio/.test(prima.bit),
      'il tema vecchio: tutto in scena', JSON.stringify(prima));

    // il tema e la classifica partono adesso e arrivano fra un secondo
    s.ovl.st.ritardoTema = 1000;
    ritardoBit = 1000;
    const letti = s.ovl.st.tema, bitLetti = s.ovl.st.chieste['/bit'] || 0;
    s.ovl.manda({ tipo: 'tema' });
    await s.leggi(() => { chiediBit(); });
    for (let i = 0; i < 100 && (s.ovl.st.tema <= letti || (s.ovl.st.chieste['/bit'] || 0) <= bitLetti); i++) await attesa(10);
    s.ovl.st.ritardoTema = 0;
    ritardoBit = 0;
    const partiti = Date.now();
    // e intanto ogni pezzo cambia, come lo cambia il server: prima lo stato, poi l'evento
    s.cambia({ tipo: 'timer', fine: 0 }, (t) => { t.stato = { ...t.stato, timer: { fine: 0 } }; });
    s.cambia({ tipo: 'pubblicita', prossima: 0, pausaFino: 0 }, (t) => { t.pubblicita = { ...t.pubblicita, stato: { prossima: 0, pausaFino: 0 } }; });
    s.cambia({ tipo: 'treno', treno: null }, (t) => { t.stato = { ...t.stato, treno: null }; });
    s.cambia({ tipo: 'tempi', elenco: [] }, (t) => { t.tempi = { ...t.tempi, elenco: [] }; });
    s.cambia({ tipo: 'goal', goals: GOAL, conti: { g1: 7 } }, (t) => { t.conti = { g1: 7 }; });
    s.cambia({ tipo: 'widget', id: 'ultimoFollower', cfg: WF, valore: 'nuovo' }, (t) => { t.stato = { ...t.stato, ultimoFollower: 'nuovo' }; });
    s.cambia({ tipo: 'boss', azione: 'fine', vinto: true, nome: 'Drago' }, (t) => { t.stato = { ...t.stato, boss: null }; });
    s.cambia({ tipo: 'penitenza', azione: 'hit', id: 'p1', count: 5, inc: 4 });
    s.cambia({ tipo: 'penitenza', azione: 'start', id: 'p2', modo: 'vietata', cosa: 'parola', valore: 'nuova', fine: ora + 60000, durata: 1, posizione: 'alto-destra' });
    s.cambia({ ...CONT('Morti: 4') }, (t) => { t.contatori = [CONT('Morti: 4')]; });
    bit = [{ nome: 'nuovo', bit: 900 }];
    s.ovl.manda({ tipo: 'bit', righe: bit });
    // gli eventi sono partiti mentre tema e classifica erano in viaggio: se no
    // la prova non prova niente
    dice(Date.now() - partiti < 600, 'gli eventi arrivano mentre il tema vecchio e\' in viaggio', `${Date.now() - partiti} ms dopo la richiesta`);
    // arrivano il tema e la classifica vecchi, e si applicano
    await attesa(1700);
    const v = await leggi();
    dice(!v.timer, 'il timer fermato resta fermo', 'il tema vecchio l\'ha riacceso');
    dice(!v.pubblicita, 'il conto alla pubblicita\' tolto resta tolto', 'il tema vecchio l\'ha rimesso');
    dice(!v.treno, 'il treno finito resta finito', 'il tema vecchio l\'ha rimesso');
    dice(!v.tempi, 'i premi a tempo finiti restano finiti', 'il tema vecchio li ha rimessi');
    dice(v.goal === '7 / 10', 'l\'obiettivo resta al conto nuovo', `dice ${v.goal}`);
    dice(v.follower === 'nuovo', 'l\'ultimo follower resta quello nuovo', `dice ${v.follower}`);
    dice(!v.boss, 'il boss battuto non resuscita', 'il tema vecchio l\'ha rimesso in piedi');
    dice(v.pen.vietataCIAO === '5', 'la penitenza resta al conto nuovo', JSON.stringify(v.pen));
    dice(v.pen.vietataNUOVA === '0', 'e quella appena cominciata resta', JSON.stringify(v.pen));
    dice(v.cont === 'Morti: 4', 'il contatore resta al valore nuovo', `dice ${v.cont}`);
    dice(/nuovo/.test(v.bit) && !/vecchio/.test(v.bit), 'la classifica dei Bit resta quella nuova', `dice ${v.bit}`);
  },
};

try {
  const nomi = Object.keys(PROVE);
  const insieme = 5;
  for (let i = 0; i < nomi.length; i += insieme) {
    await Promise.all(nomi.slice(i, i + insieme).map(async (n) => {
      try { await PROVE[n](); } catch (e) { dice(false, `${n}: la prova si e' fermata`, String(e && e.message || e)); }
    }));
  }
} finally {
  await browser.close();
  await chiudi();
}

dice(errori.length === 0, 'nessun errore nelle pagine', errori.join(' · '));

console.log('\nL\'overlay nel tempo: linee che cadono, eventi persi, orologi storti, code e guasti.\n');
for (const e of esiti) console.log(`  ${e.ok ? '✓' : '✗'} ${e.msg}${!e.ok && e.extra ? ` — ${e.extra}` : ''}`);
const verde = esiti.every((e) => e.ok);
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
