// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello dei PREMI A TEMPO (docs/PREMI-A-TEMPO.md), in scena e nel pannello.
//
// In scena la promessa e' che ogni tempo in corso abbia la sua carta, che
// scenda da sola e che se ne vada quando finisce. I difetti che il cancello
// impedisce si vedono in diretta, quando e' tardi:
//  · un conto fermo, perche' il bot manda la fine una volta sola;
//  · una carta a 0:00 che resta a schermo;
//  · un riscatto nuovo che la scena non vede;
//  · le scelte dello streamer che non contano: interruttore, overlay che non
//    lo vuole, quante carte al massimo, chi e la barra;
//  · l'ordine: prima quello che finisce prima.
//
// Nel pannello (demo): la carta c'e' in tre lingue, su computer e telefono,
// dice per ogni premio quanto dura e da dove lo sa, conta quello che corre,
// propone quello che il nome fa pensare senza farlo da solo, e un premio che
// non e' a tempo non mostra le scelte di un premio a tempo.
//
//   node scripts/verifica-premi-tempo.mjs              → esce 1 se qualcosa non torna
//   node scripts/verifica-premi-tempo.mjs --selftest   → rompe e pretende il rosso
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apriSito, apriBrowser, overlayFinto } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const OVL = 'src/web/public/overlay-app.js';
const APP = 'src/web/public/app.js';

const ROTTURE = [
  [OVL, "  if (MIO.tempi && MIO.tempi.attivo) disegnaTempi();\n", '', 'il conto non scende da solo fra un messaggio e l\'altro'],
  [OVL, "return t && t.chiave && Number(t.fino) > ora;", 'return t && t.chiave;', 'a tempo finito la carta resta'],
  [OVL, "    else if (dati.tipo === 'tempi') {", "    else if (dati.tipo === 'tempi-no') {", 'un riscatto nuovo non arriva in scena'],
  [OVL, "!cfg.attivo || !mostra('tempi')", '!cfg.attivo', 'un overlay che non lo vuole se lo ritrova'],
  [OVL, "const quanti = elenco.slice(0, Math.max(1, Math.min(5, Number(cfg.quanti) || 3)));", 'const quanti = elenco;', '«quanti al massimo» non conta'],
  [OVL, "\n    .sort(function (a, b) { return Number(a.fino) - Number(b.fino); });", ';', 'l\'ordine lo fa chi manda, e un elenco in disordine resta in disordine'],
  [OVL, "r.querySelector('.tp-chi').textContent = cfg.mostraChi === false ||", "r.querySelector('.tp-chi').textContent = false ||", 'chi non vuole i nomi se li ritrova'],
  [APP, "  li.querySelector('.tempi-se').hidden = !quanto;", "  li.querySelector('.tempi-se').hidden = false;", 'un premio che non dura mostra le scelte di uno che dura'],
  [APP, "      sel.value = b.dataset.tempiFai;\n", '', '«Fallo davvero» non fa niente'],
  [APP, "  _disegnaInCorso(d.inCorso || []);\n", '', 'quello che corre adesso non si vede nel pannello'],
  [APP, "      const r = await api('/api/streamer/premi/tempi/prova',", "      return; const r = await api('/api/streamer/premi/tempi/prova',", '«Prova sull\'overlay» non fa niente'],
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
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: il cancello non protegge quello che dice di proteggere.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
const secondi = (t) => String(t || '').split(':').map(Number).reduce((a, n) => a * 60 + n, 0);

const browser = await apriBrowser();
if (!browser) { console.log('  –  saltato: manca Chromium o Playwright'); process.exit(0); }

let TEMA = {};
const ovl = overlayFinto({ tema: () => TEMA });
const { base, chiudi } = await apriSito({ overlay: ovl });
const errori = [];
const FIRMA = '.tema-applicato-tempi';
const CFG = { attivo: true, quanti: 3, barra: true, mostraChi: true, posizione: 'alto-destra', xy: null, stile: {} };
const tempo = (chiave, titolo, restaMs, chi = ['Luna'], durataMs = 10 * 60000) => ({ chiave, cosa: 'tempo', titolo, chi, da: Date.now() + restaMs - durataMs, fino: Date.now() + restaMs });

async function giro(cfg, elenco, { mostra = {}, poi = null, dopo = 0 } = {}) {
  TEMA = { css: FIRMA, widget: {}, goals: [], conti: {}, musica: null, timer: null, tempi: cfg ? { ...cfg, elenco } : null, stato: {}, mostra, xy: {}, alertStile: null, chatStile: null };
  const page = await browser.newPage();
  page.on('pageerror', (e) => errori.push('overlay: ' + String(e.message || e)));
  await page.goto(base + '/overlay/prova?key=x');
  await page.waitForFunction((f) => document.getElementById('css-utente')?.textContent.includes(f), FIRMA, { timeout: 15000 });
  if (poi) {
    for (let i = 0; i < 100 && ovl.st.stream.length < 1; i++) await attesa(50);
    ovl.manda({ tipo: 'tempi', elenco: poi });
  }
  await attesa(500);
  const leggi = () => page.$$eval('.ovl-tempi:not(.esce) .tp-riga:not(.esce)', (l) => l.map((n) => ({
    tit: n.querySelector('.tp-tit')?.textContent || '',
    num: n.querySelector('.tp-tempo')?.textContent || '',
    chi: n.querySelector('.tp-chi')?.textContent || '',
    barra: !!n.querySelector('.tp-barra') && !n.querySelector('.tp-barra').hidden,
  })));
  const prima = await leggi();
  let dopoLetto = null;
  if (dopo) { await attesa(dopo); dopoLetto = await leggi(); }
  await page.close();
  return { prima, dopo: dopoLetto };
}

try {
  // ── IN SCENA ─────────────────────────────────────────────────────────────
  let r = await giro(CFG, [tempo('p:b', 'Parla in inglese', 6 * 60000 + 30000, ['Luna', 'Marco']), tempo('p:a', 'Niente HUD', 90000, ['Bea'])], { dopo: 2200 });
  dice(r.prima.length === 2, 'ogni tempo in corso ha la sua carta', `carte: ${r.prima.length}`);
  dice(r.prima[0]?.tit === 'Niente HUD' && r.prima[1]?.tit === 'Parla in inglese', 'prima quello che finisce prima', r.prima.map((x) => x.tit).join(' · '));
  dice(Math.abs(secondi(r.prima[0]?.num) - 90) <= 2, 'e dice quanto manca', r.prima[0]?.num);
  dice(r.prima[1]?.chi === 'Marco, Luna', 'chi l\'ha riscattato, l\'ultimo per primo', r.prima[1]?.chi);
  dice(r.prima.every((x) => x.barra), 'con la barra che si svuota');
  dice(!!r.dopo && secondi(r.prima[0]?.num) - secondi(r.dopo[0]?.num) >= 2, 'il conto scende da solo, senza nessun messaggio', `${r.prima[0]?.num} → ${r.dopo?.[0]?.num}`);

  r = await giro(CFG, [tempo('p:a', 'Quasi finito', 1500)], { dopo: 2600 });
  dice(r.prima.length === 1, 'un tempo quasi finito si vede');
  dice(r.dopo && r.dopo.length === 0, 'e arrivato a zero se ne va', r.dopo?.map((x) => x.num).join(' '));

  r = await giro(CFG, [], { poi: [tempo('p:n', 'Riscatto nuovo', 5 * 60000)] });
  dice(r.prima.length === 1 && r.prima[0].tit === 'Riscatto nuovo', 'un riscatto arriva in scena senza ricaricare', r.prima.map((x) => x.tit).join(' · ') || 'niente');

  r = await giro({ ...CFG, quanti: 1 }, [tempo('p:a', 'Uno', 60000), tempo('p:b', 'Due', 120000)]);
  dice(r.prima.length === 1 && r.prima[0].tit === 'Uno', '«quanti al massimo» conta, e tiene quello che finisce prima', r.prima.map((x) => x.tit).join(' · '));
  r = await giro({ ...CFG, mostraChi: false, barra: false }, [tempo('p:a', 'Senza', 60000)]);
  dice(r.prima.length === 1 && r.prima[0].chi === '' && !r.prima[0].barra, 'senza nomi e senza barra, se lo streamer non li vuole', JSON.stringify(r.prima[0] || {}));
  r = await giro({ ...CFG, attivo: false }, [tempo('p:a', 'Spento', 60000)]);
  dice(r.prima.length === 0, 'con l\'elemento spento non compare niente');
  r = await giro(CFG, [tempo('p:a', 'Altrove', 60000)], { mostra: { tempi: false } });
  dice(r.prima.length === 0, 'e un overlay che non lo vuole non ce l\'ha');
  r = await giro(CFG, []);
  dice(r.prima.length === 0, 'senza tempi in corso non c\'e\' nessun riquadro vuoto');

  // ── NEL PANNELLO ─────────────────────────────────────────────────────────
  for (const [W, H, dove, lingue] of [[1440, 1000, 'computer', ['it', 'en', 'es']], [390, 844, 'telefono', ['it']]]) {
    for (const lang of lingue) {
      const p = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: 'reduce' });
      p.on('pageerror', (e) => errori.push(`pannello ${lang} ${dove}: ${e.message}`));
      await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); localStorage.setItem('cookie-ok', '1'); localStorage.setItem('sotto:effetti', 'punti'); } catch { /* niente */ } });
      await p.goto(base + `/?demo=1&lang=${lang}`, { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
      await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('effetti'); });
      await p.waitForSelector('#tempi-box .tempi-premio', { timeout: 20000 });
      await attesa(600);
      const s = await p.evaluate(() => {
        const riga = (t) => [...document.querySelectorAll('.tempi-premio')].find((li) => li.dataset.titolo === t);
        const chip = (t) => riga(t)?.querySelector('[data-tempi-stato]')?.textContent || '';
        return {
          righe: document.querySelectorAll('.tempi-premio').length,
          emote: chip('Solo emote 5 minuti'), inglese: chip('Parla in inglese per 10 minuti'), airhorn: chip('Airhorn'),
          seAirhorn: riga('Airhorn')?.querySelector('.tempi-se')?.hidden,
          seEmote: riga('Solo emote 5 minuti')?.querySelector('.tempi-se')?.hidden,
          corre: [...document.querySelectorAll('[data-tempi-incorso] li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()),
          largo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          salva: !!document.getElementById('btn-salva-tempi'),
        };
      });
      const qui = `${lang} ${dove}`;
      dice(s.righe === 6 && s.salva, `${qui}: la carta elenca i premi e si salva`, `righe ${s.righe}`);
      dice(/5 /.test(s.emote) && /(nome|name|nombre)/.test(s.emote), `${qui}: un premio dice quanto dura e che lo sa dal nome`, s.emote);
      dice(/(Non a tempo|Not timed|Sin tiempo)/.test(s.airhorn) && s.seAirhorn === true, `${qui}: un premio senza tempo nel nome non e' a tempo, e non mostra le scelte`, `${s.airhorn} · nascoste: ${s.seAirhorn}`);
      dice(s.seEmote === false, `${qui}: uno che dura le mostra`);
      dice(s.corre.length === 1 && /Parla in inglese/.test(s.corre[0]) && /\d+:\d\d/.test(s.corre[0]), `${qui}: quello che corre adesso si vede, col suo conto`, s.corre.join(' | ') || 'niente');
      dice(s.largo <= 0, `${qui}: niente scorre di lato`, String(s.largo));
      if (lang === 'it' && dove === 'computer') {
        await p.evaluate(() => { const d = [...document.querySelectorAll('.tempi-premio')].find((li) => li.dataset.titolo === 'Solo emote 5 minuti').querySelector('details'); d.open = true; d.scrollIntoView({ block: 'center' }); });
        await attesa(300);
        const proposta = await p.evaluate(() => {
          const li = [...document.querySelectorAll('.tempi-premio')].find((x) => x.dataset.titolo === 'Solo emote 5 minuti');
          return { vista: !li.querySelector('.tempi-suggerita').hidden, cosa: li.querySelector('.tq-cosa').value };
        });
        dice(proposta.vista && proposta.cosa === 'tempo', 'il nome fa pensare a «solo emote»: il pannello lo propone, ma da solo resta «solo il tempo»', JSON.stringify(proposta));
        await p.click('.tempi-premio[data-titolo="Solo emote 5 minuti"] [data-tempi-fai]');
        await attesa(300);
        const fatto = await p.evaluate(() => {
          const li = [...document.querySelectorAll('.tempi-premio')].find((x) => x.dataset.titolo === 'Solo emote 5 minuti');
          return { cosa: li.querySelector('.tq-cosa').value, chip: li.querySelector('[data-tempi-stato]').textContent, proposta: !li.querySelector('.tempi-suggerita').hidden, fine: li.querySelector('.tempi-fine').hidden };
        });
        dice(fatto.cosa === 'emote' && /solo emote/i.test(fatto.chip) && !fatto.proposta, '«Fallo davvero» lo sceglie, e la riga lo dice', JSON.stringify(fatto));
        dice(fatto.fine === true, 'per una modalita\' della chat la frase di fine non serve: la dice la modalita\'');
        await p.evaluate(() => window.scrollTo(0, 0));
        await attesa(400);
        const barra = await p.evaluate(() => ({ dentro: document.getElementById('barra-salva')?.classList.contains('dentro') || false }));
        dice(barra.dentro, 'e resta da salvare', JSON.stringify(barra));
        await p.evaluate(() => document.querySelector('#barra-salva .sv-annulla')?.click());
        await attesa(600);
        const annullato = await p.evaluate(() => [...document.querySelectorAll('.tempi-premio')].find((x) => x.dataset.titolo === 'Solo emote 5 minuti')?.querySelector('.tq-cosa')?.value);
        dice(annullato === 'tempo', '«Annulla» lo rimette com\'era', String(annullato));
        await p.click('.tempi-premio[data-titolo="Solo emote 5 minuti"] [data-tempi-prova]');
        await attesa(500);
        const prova = await p.evaluate(() => [...document.querySelectorAll('[data-tempi-incorso] li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()));
        dice(prova.length === 2 && prova.some((t) => /Solo emote 5 minuti/.test(t) && /[45]:\d\d/.test(t)), '«Prova sull\'overlay» fa partire il conto del premio, e si vede in «Adesso»', prova.join(' | '));
        await p.evaluate(() => window.SB_APP.vai('alert'));
        await p.waitForSelector('#sez-tempi', { state: 'attached', timeout: 15000 });
        await attesa(800);
        const pezzo = await p.evaluate(() => ({ sezione: !!document.getElementById('sez-tempi') && !!document.querySelector('[data-cfg="tempi"] [data-c="quanti"]'), tela: !!document.querySelector('#ap-stage .ovl-tempi') }));
        dice(pezzo.sezione && pezzo.tela, 'nello Studio c\'e\' il pezzo «Premi a tempo», con la sua anteprima', JSON.stringify(pezzo));
      }
      await p.close();
    }
  }
} finally {
  await browser.close();
  await chiudi();
}

dice(errori.length === 0, 'nessun errore nelle pagine', errori.join(' · '));

console.log('\nI premi a tempo: in scena scendono da soli e se ne vanno, nel pannello si capiscono.\n');
for (const e of esiti) console.log(`  ${e.ok ? '✓' : '✗'} ${e.msg}${!e.ok && e.extra ? ` — ${e.extra}` : ''}`);
const verde = esiti.every((e) => e.ok);
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
