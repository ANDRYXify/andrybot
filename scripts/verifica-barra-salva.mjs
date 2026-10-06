// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello del riquadro «modifiche non salvate» — gira in un browser vero.
//
// Il modello (docs/BARRA-SALVA.md): una REGIONE e' il contenitore governato da
// un insieme di tasti Salva; la sua FIRMA e' quel che salverebbe (i campi, o lo
// stato JS che il salva manda); la BASE e' la firma un attimo prima che tu
// cominci a toccarla da pulita. Da salvare = firma diversa dalla base. Il
// salvataggio conta solo se e' partito ed e' andato.
//
// Qui si pretende quel che si vede, su telefono e computer:
//  · cambi un campo e lo rimetti com'era: il riquadro sparisce (e i segni);
//  · due carte cambiate: salvarne una lascia l'altra segnalata;
//  · un salva che fallisce, o che non parte, lascia la carta da salvare; uno
//    che parte dopo un'attesa conta quando e' andato;
//  · un valore messo dal codice su una carta pulita non accende niente, e
//    diventa la nuova base;
//  · un campo che si salva da solo non resta «da salvare»;
//  · una carta senza salva non finisce sotto il salva di un'altra;
//  · «Annulla» rimette i valori; la X mette da parte finche' non cambi altro;
//  · una parte che si apre dopo un cambiamento (campi nati dopo la base) non
//    sporca niente da sola, e «Annulla» la rimette senza ricaricare;
//  · uscendo, la finestra dice cosa e dove; «Resta qui» porta al campo, in
//    vista, segnato e col fuoco; «Salva ed esci» aspetta l'esito vero;
//  · un editor a stato JS (Pannelli): aggiungo e tolgo, torna pulito;
//  · niente scorre di lato, niente errori nella pagina.
//
// Uso: node scripts/verifica-barra-salva.mjs              (esce 1 se qualcosa non torna)
//      node scripts/verifica-barra-salva.mjs --selftest   (il «da salvare» torna appiccicoso: deve uscire rosso)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apriSito, chromiumQui } from './_sito.mjs';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(RAD, 'src/web/public/app.js');
const SELFTEST = process.argv.includes('--selftest');

const CHROMIUM = chromiumQui();
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
let chromium;
if (!CHROMIUM) { console.log('Chromium non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch {
  console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.');
  process.exit(0);
}

const originale = fs.readFileSync(APP, 'utf8');

// Prima il testo: cose che, se cambiano, rompono il modello senza che un
// clic lo mostri subito.
const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
const corpoDi = (nome) => {
  const i = originale.search(new RegExp(`(async )?function ${nome}\\(`));
  if (i < 0) return '';
  let liv = 0, dentro = false;
  for (let j = originale.indexOf('{', i); j < originale.length; j++) {
    if (originale[j] === '{') { liv++; dentro = true; }
    else if (originale[j] === '}') { liv--; if (dentro && liv === 0) return originale.slice(i, j + 1); }
  }
  return '';
};
const def = originale.match(/const SEL_SALVA = '([^']+)';/);
dice(!!def && def[1].includes('[data-salva]'), 'SEL_SALVA e\' uno, e riconosce anche i salva marcati con un attributo');
dice(!/button\[id\*=/.test(def ? originale.replace(def[0], '') : originale), 'nessuno si riscrive il selettore per conto suo');
const regione = corpoDi('_regioneSalva');
dice(/a\.matches\('\.carta'\)\) return null/.test(regione), 'una carta senza salva non finisce sotto il salva di un\'altra');
dice(/n > 1 && !a\.closest\('\.carta'\)\) return null/.test(regione), 'fuori dalle carte, il pannello conta solo se il salva e\' uno');
dice(!/_salvaSporco|_salvaRegione|_salvaChiusa/.test(originale), 'niente piu\' booleano appiccicoso ne\' regione unica');
dice(!/setTimeout\(k, 260\)/.test(originale), '«Salva ed esci» aspetta l\'esito, non un tempo a caso');
const avvia = corpoDi('avviaBarraSalva');
dice(/addEventListener\('input', cambiato, true\)/.test(avvia) && !/'click', 'pointerup', 'keyup'/.test(avvia),
  'si ripensa per un campo cambiato, non per ogni clic (un clic che carica non e\' una modifica)');

const DIFESA = '  r.sporca = _diversa(r, r.ora);';
if (SELFTEST) {
  if (!originale.includes(DIFESA)) { console.log('  ✗ non trovo la difesa da togliere'); process.exit(1); }
  console.log('  tolgo: il confronto con la base (una modifica resta «da salvare» anche rimessa com\'era)\n');
  fs.writeFileSync(APP, originale.replace(DIFESA, '  r.sporca = r.sporca || _diversa(r, r.ora);'));
}
const ripristina = () => { if (SELFTEST) fs.writeFileSync(APP, originale); };
process.on('exit', ripristina);

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const rotture = [];

async function apri(larg, alt, nome) {
  const p = await b.newPage({ viewport: { width: larg, height: alt } });
  p.on('pageerror', (e) => rotture.push(`${nome}: ${e.message}`));
  await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); localStorage.setItem('cookie-ok', '1'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  return p;
}
const fotogrammi = (p) => p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
const fermo = async (p) => {
  await p.waitForFunction(() => ![..._daSalvare.values()].some((r) => r.inViaggio), null, { timeout: 10000 });
  await fotogrammi(p);
};
const vai = async (p, scheda, pronta) => {
  await p.evaluate((s) => { azzeraBarraSalva(); window.SB_APP.vai(s); }, scheda);
  await p.waitForFunction(pronta, null, { timeout: 20000 });
  await p.waitForTimeout(500);
  await fotogrammi(p);
};
const quadro = (p) => p.evaluate(() => ({
  dentro: document.getElementById('barra-salva').classList.contains('dentro') && !document.getElementById('barra-salva').classList.contains('esce'),
  sporche: _regioniSporche().map(_titoloRegione),
  segnati: document.querySelectorAll('.da-salvare').length,
  carte: document.querySelectorAll('.da-salvare-carta').length,
  dove: document.querySelector('#barra-salva .sv-dove')?.textContent || '',
}));
// Un clic vero sul campo (o sulla sua etichetta, per le spunte disegnate).
const tocca = async (p, sel) => {
  const dove = await p.evaluate((s) => {
    const el = document.querySelector(s);
    const t = (el.type === 'checkbox' || el.type === 'radio') ? (el.closest('label') || el) : el;
    t.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = t.getBoundingClientRect();
    return { x: r.left + Math.min(r.width / 2, 12), y: r.top + r.height / 2 };
  }, sel);
  await p.mouse.click(dove.x, dove.y);
  await fotogrammi(p);
};
const scrivi = async (p, sel, testo) => { await tocca(p, sel); await p.keyboard.press('Control+End'); await p.keyboard.type(testo); await fotogrammi(p); };
const cancella = async (p, n) => { for (let i = 0; i < n; i++) await p.keyboard.press('Backspace'); await fotogrammi(p); };
// Porta il tasto Salva fuori vista: il riquadro esiste per indicare quel che
// non vedi.
const lontano = (p, sel) => p.evaluate((s) => {
  const r = document.querySelector(s).getBoundingClientRect();
  window.scrollBy({ top: r.top > innerHeight / 2 ? -(innerHeight * 3) : innerHeight * 3, behavior: 'instant' });
}, sel).then(() => fotogrammi(p));
// Il riquadro si preme quando e' fermo e davanti a tutto, come lo preme una persona.
const premi = async (p, sel) => {
  await p.waitForFunction((s) => {
    const bar = document.getElementById('barra-salva'), t = document.querySelector(s);
    if (!bar.classList.contains('dentro') || bar.classList.contains('esce') || !t) return false;
    const r = t.getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('#barra-salva') === bar;
  }, sel, { timeout: 5000 });
  const r = await p.evaluate((s) => { const q = document.querySelector(s).getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, sel);
  await p.mouse.click(r.x, r.y);
  await fotogrammi(p);
};
// «Annulla» premuto come lo preme una persona: dice se la pagina e' rimasta
// (true) o si e' ricaricata (false), invece di cadere con lei.
const annullaQui = async (p) => {
  let via = false;
  const segna = (f) => { if (f === p.mainFrame()) via = true; };
  p.on('framenavigated', segna);
  try { await premi(p, '#barra-salva .sv-annulla'); }
  catch (e) {
    if (!via && !/context was destroyed|navigation/i.test(String(e?.message))) throw e;
    via = true;
    await p.waitForLoadState('domcontentloaded').catch(() => {});
  }
  p.off('framenavigated', segna);
  return !via;
};
const conRete = (p, su) => p.evaluate((s) => {
  if (!window.__vero) window.__vero = window.apiDemo;
  window.apiDemo = s ? window.__vero
    : (via, o) => ((o?.method || 'GET').toUpperCase() !== 'GET' ? Promise.reject(new Error('rete giu\'')) : window.__vero(via, o));
}, su);

for (const [larg, alt, nome] of [[390, 844, 'telefono'], [1280, 900, 'computer']]) {
  const p = await apri(larg, alt, nome);

  // ---- 1. rimettere com'era spegne tutto ---------------------------------
  await vai(p, 'personalita', () => document.getElementById('btn-salva-personalita') && document.getElementById('btn-salva-frasi'));
  const campi = await p.evaluate(() => {
    const prendi = (id) => {
      const el = _campiDi(_regioneSalva(document.getElementById(id)))
        .find((x) => (x.tagName === 'TEXTAREA' || x.type === 'text') && x.getClientRects().length);
      if (el && !el.id) el.id = 'cb-' + id;
      return el ? '#' + el.id : '';
    };
    return { testo: prendi('btn-salva-personalita'), altro: prendi('btn-salva-frasi') };
  });
  dice(!!campi.testo && !!campi.altro, `${nome}: trovo un campo di testo in «Personalità» e uno nelle frasi`, JSON.stringify(campi));
  if (!campi.testo || !campi.altro) { await p.close(); continue; }
  await scrivi(p, campi.testo, 'xy');
  await lontano(p, '#btn-salva-personalita');
  let q = await quadro(p);
  dice(q.sporche.length === 1 && q.segnati >= 1 && q.carte === 1 && q.dentro && /Personalità/.test(q.dove),
    `${nome}: scrivo in un campo: la carta è da salvare, campo e carta segnati, il riquadro dice dove`, JSON.stringify(q));
  await tocca(p, campi.testo);
  await p.keyboard.press('Control+End');
  await cancella(p, 2);
  await lontano(p, '#btn-salva-personalita');
  q = await quadro(p);
  dice(q.sporche.length === 0 && q.segnati === 0 && q.carte === 0 && !q.dentro,
    `${nome}: lo cancello e torna com'era: niente da salvare, niente segni, niente riquadro`, JSON.stringify(q));

  // ---- 2. due carte: salvarne una lascia l'altra --------------------------
  await scrivi(p, campi.testo, 'a');
  await scrivi(p, campi.altro, 'b');
  q = await quadro(p);
  dice(q.sporche.length === 2, `${nome}: due carte cambiate, due da salvare`, JSON.stringify(q));
  await tocca(p, '#btn-salva-personalita');
  await fermo(p);
  q = await quadro(p);
  dice(q.sporche.length === 1 && /frasi/i.test(q.sporche[0]), `${nome}: salvo «Personalità»: resta da salvare solo l'altra`, JSON.stringify(q));

  // ---- 3. un salva che fallisce non conta ----------------------------------
  await conRete(p, false);
  await tocca(p, '#btn-salva-frasi');
  await fermo(p);
  q = await quadro(p);
  dice(q.sporche.length === 1, `${nome}: il salvataggio fallisce: la carta resta da salvare`, JSON.stringify(q));
  await conRete(p, true);
  await tocca(p, '#btn-salva-frasi');
  await fermo(p);
  q = await quadro(p);
  dice(q.sporche.length === 0 && !q.dentro, `${nome}: riprovo e va: niente più da salvare`, JSON.stringify(q));

  // ---- 4. carte di prova, per i casi che il pannello non ha a comando ----
  await p.evaluate(() => {
    const pan = document.querySelector('.pannello-scheda.visibile');
    pan.insertAdjacentHTML('afterbegin', `
      <div class="carta" id="cb-nulla"><h2>Prova che non parte</h2><input type="text" id="cb-nulla-campo" aria-label="Campo che non parte" value="uno"><button type="button" id="cb-nulla-salva">Salva</button></div>
      <div class="carta" id="cb-tardi"><h2>Prova che parte tardi</h2><input type="text" id="cb-tardi-campo" aria-label="Campo che parte tardi" value="due">
        <label class="riga-check"><input type="checkbox" id="cb-da-se"> si salva da sé</label><button type="button" id="cb-tardi-salva">Salva</button></div>
      <div class="carta" id="cb-senza"><h2>Senza salva</h2><input type="text" id="cb-senza-campo" aria-label="Campo senza salva"></div>`);
    document.getElementById('cb-tardi-salva').addEventListener('click', () => conErrore(async () => {
      await new Promise((ok) => setTimeout(ok, 30));
      await api('/api/streamer/prova', { method: 'POST', body: {} });
    }));
    document.getElementById('cb-da-se').addEventListener('change', () => { api('/api/streamer/prova', { method: 'POST', body: {} }); });
  });
  await scrivi(p, '#cb-nulla-campo', '!');
  await tocca(p, '#cb-nulla-salva');
  await fermo(p);
  q = await quadro(p);
  dice(q.sporche.includes('Prova che non parte'), `${nome}: un salva che non manda niente lascia la carta da salvare`, JSON.stringify(q));
  await scrivi(p, '#cb-tardi-campo', '?');
  await tocca(p, '#cb-tardi-salva');
  await fermo(p);
  q = await quadro(p);
  dice(!q.sporche.includes('Prova che parte tardi'), `${nome}: un salva che manda dopo un'attesa conta quando è andato`, JSON.stringify(q));
  await tocca(p, '#cb-da-se');
  q = await quadro(p);
  dice(!q.sporche.includes('Prova che parte tardi'), `${nome}: una spunta che si salva da sola non resta da salvare`, JSON.stringify(q));
  await scrivi(p, '#cb-senza-campo', 'qualcosa');
  q = await quadro(p);
  dice(!q.sporche.includes('Senza salva') && await p.evaluate(() => _regioneSalva(document.getElementById('cb-senza-campo')) === null),
    `${nome}: una carta senza salva non finisce sotto il salva di un'altra`, JSON.stringify(q));
  await tocca(p, '#cb-tardi-campo');
  await p.evaluate(() => { document.getElementById('cb-tardi-campo').value = 'caricato dal codice'; });
  await fotogrammi(p);
  q = await quadro(p);
  dice(!q.sporche.includes('Prova che parte tardi'), `${nome}: un valore messo dal codice su una carta pulita non accende niente`, JSON.stringify(q));
  await scrivi(p, '#cb-tardi-campo', 'z');
  await cancella(p, 1);
  q = await quadro(p);
  dice(!q.sporche.includes('Prova che parte tardi'), `${nome}: e diventa la nuova base: scrivo e cancello, pulita`, JSON.stringify(q));
  await p.evaluate(() => { document.querySelectorAll('#cb-nulla, #cb-tardi, #cb-senza').forEach((x) => x.remove()); azzeraBarraSalva(); });

  // ---- 5. «Annulla» rimette i valori; la X mette da parte ------------------
  const prima = await p.evaluate((s) => document.querySelector(s).value, campi.testo);
  await scrivi(p, campi.testo, 'zz');
  await lontano(p, '#btn-salva-personalita');
  await premi(p, '#barra-salva .sv-annulla');
  q = await quadro(p);
  const dopo = await p.evaluate((s) => document.querySelector(s).value, campi.testo);
  dice(dopo === prima && q.sporche.length === 0 && !q.dentro, `${nome}: «Annulla» rimette il valore di prima e spegne tutto`, JSON.stringify({ prima, dopo, q }));

  // ---- 5b. una parte che si apre DOPO un cambiamento ----------------------
  // I campi che nascono dopo la base (un momento delle frasi, aperto a
  // richiesta) hanno come base il valore con cui nascono, o quello salvato che
  // dichiarano (data-salvato): rimettere com'era pulisce, e «Annulla» li
  // rimette al posto senza ricaricare la pagina.
  const apriMomento = async () => {
    const sel = await p.evaluate(() => {
      const d = document.querySelector('#frasi-bot details[data-momento]:not([open])');
      if (!d) return '';
      d.id = d.id || 'cb-mom-' + d.dataset.momento;
      return '#' + d.id + ' > summary';
    });
    if (sel) { await tocca(p, sel); await p.waitForTimeout(150); await fotogrammi(p); }
    return !!sel;
  };
  const frasiSporca = async () => (await quadro(p)).sporche.some((x) => /frasi/i.test(x));
  const premuto = () => p.evaluate(() => [...document.querySelectorAll('[data-frasi-tutti][aria-pressed="true"]')].map((x) => x.dataset.frasiTutti).join());
  await scrivi(p, campi.altro, 'q');
  const aperto1 = await apriMomento();
  await tocca(p, campi.altro);
  await p.keyboard.press('Control+End');
  await cancella(p, 1);
  dice(aperto1 && !(await frasiSporca()), `${nome}: cambio, apro una parte nuova, rimetto com'era: pulita`, JSON.stringify(await quadro(p)));
  const valoreFrasi = await p.evaluate((x) => document.querySelector(x).value, campi.altro);
  await scrivi(p, campi.altro, 'q');
  const aperto2 = await apriMomento();
  await lontano(p, '#btn-salva-frasi');
  if (!await annullaQui(p)) {
    dice(false, `${nome}: cambio, apro una parte nuova, «Annulla»: tutto al posto, senza ricaricare`, 'la pagina si e\' ricaricata');
    await p.close(); continue;
  }
  q = await quadro(p);
  const rimessa = await p.evaluate((x) => document.querySelector(x).value, campi.altro);
  dice(aperto2 && rimessa === valoreFrasi && q.sporche.length === 0,
    `${nome}: cambio, apro una parte nuova, «Annulla»: tutto al posto, senza ricaricare`, JSON.stringify({ rimessa, valoreFrasi, q }));
  const primaTutti = await premuto();
  await tocca(p, '[data-frasi-tutti="spento"]');
  const aperto3 = await apriMomento();
  const tendina = await p.evaluate(() => [...document.querySelectorAll('#frasi-bot details[open] [data-modo]')].pop()?.value);
  await lontano(p, '#btn-salva-frasi');
  if (!await annullaQui(p)) {
    dice(false, `${nome}: «Spento» per tutti, apro un momento (nasce già spento), «Annulla»: torna la scelta salvata, senza ricaricare`, 'la pagina si e\' ricaricata');
    await p.close(); continue;
  }
  q = await quadro(p);
  const dopoTutti = await premuto();
  const tendine = await p.evaluate(() => [...document.querySelectorAll('#frasi-bot details[open] [data-modo]')].map((x) => x.value === x.dataset.salvato));
  dice(aperto3 && tendina === 'spento' && dopoTutti === primaTutti && tendine.every(Boolean) && q.sporche.length === 0,
    `${nome}: «Spento» per tutti, apro un momento (nasce già spento), «Annulla»: torna la scelta salvata, senza ricaricare`, JSON.stringify({ tendina, primaTutti, dopoTutti, tendine, q }));
  await scrivi(p, campi.testo, 'w');
  await lontano(p, '#btn-salva-personalita');
  await premi(p, '#barra-salva [data-sv-chiudi]');
  q = await quadro(p);
  const messaDaParte = !q.dentro && q.sporche.length === 1;
  await scrivi(p, campi.altro, 'k');
  await lontano(p, '#btn-salva-frasi');
  await p.waitForFunction(() => document.getElementById('barra-salva').classList.contains('dentro'), null, { timeout: 3000 }).catch(() => null);
  q = await quadro(p);
  dice(messaDaParte && q.dentro && q.sporche.length === 2, `${nome}: la X mette da parte; un'altra carta cambiata lo riaccende`, JSON.stringify({ messaDaParte, q }));

  // ---- 6. uscire: la finestra dice cosa, «Resta qui» porta li' -------------
  await p.evaluate(() => window.SB_APP.vai('stato'));
  await p.waitForSelector('.mdl-chiedi [data-mdl="resta"]', { timeout: 5000 });
  const finestra = await p.evaluate(() => [...document.querySelectorAll('.mdl-chiedi .mdl-elenco li')].map((li) => li.textContent));
  dice(finestra.length === 2 && finestra.some((x) => /Personalità/.test(x)) && finestra.every((x) => /:\s*\S/.test(x)),
    `${nome}: uscendo, la finestra elenca le carte e i campi cambiati`, JSON.stringify(finestra));
  await p.click('.mdl-chiedi [data-mdl="resta"]');
  await p.waitForFunction(() => !document.querySelector('.mdl-chiedi.dentro'), null, { timeout: 5000 });
  await p.waitForFunction(() => { const r = document.activeElement?.getBoundingClientRect(); return !!r && r.top >= 0 && r.bottom <= innerHeight; }, null, { timeout: 4000 }).catch(() => null);
  await p.waitForTimeout(300);
  const resto = await p.evaluate(() => {
    const el = document.activeElement, r = el?.getBoundingClientRect();
    const testa = document.querySelector('.barra-top')?.getBoundingClientRect().bottom || 0;
    return { scheda: schedaAttiva, segnato: !!el?.classList.contains('da-salvare'), inVista: !!r && r.top >= testa - 1 && r.bottom <= innerHeight, campo: el?.id || el?.tagName };
  });
  dice(resto.scheda === 'personalita' && resto.segnato && resto.inVista,
    `${nome}: «Resta qui» porta al primo campo cambiato: in vista sotto la testata, segnato, col fuoco`, JSON.stringify(resto));

  // ---- 7. «Salva ed esci» aspetta l'esito ----------------------------------
  await conRete(p, false);
  await p.evaluate(() => window.SB_APP.vai('stato'));
  await p.waitForSelector('.mdl-chiedi [data-mdl="salva"]', { timeout: 5000 });
  await p.click('.mdl-chiedi [data-mdl="salva"]');
  await p.waitForFunction(() => !document.querySelector('.mdl-chiedi.dentro'), null, { timeout: 5000 });
  await fermo(p);
  const rimasto = await p.evaluate(() => ({ scheda: schedaAttiva, sporche: _regioniSporche().length }));
  dice(rimasto.scheda === 'personalita' && rimasto.sporche === 2, `${nome}: «Salva ed esci» con la rete giù: non esce e non perde niente`, JSON.stringify(rimasto));
  await conRete(p, true);
  await p.evaluate(() => window.SB_APP.vai('stato'));
  await p.waitForSelector('.mdl-chiedi [data-mdl="salva"]', { timeout: 5000 });
  await p.click('.mdl-chiedi [data-mdl="salva"]');
  await p.waitForFunction(() => schedaAttiva === 'stato', null, { timeout: 8000 }).catch(() => null);
  const uscito = await p.evaluate(() => ({ scheda: schedaAttiva, sporche: _ciSonoModifiche() }));
  dice(uscito.scheda === 'stato' && !uscito.sporche, `${nome}: con la rete su salva tutte e due ed esce`, JSON.stringify(uscito));

  // ---- 8. un editor a stato JS: Pannelli -----------------------------------
  await vai(p, 'pannelli', () => document.getElementById('pan-aggiungi') && PAN_STATO.serie && document.querySelector('[data-pan-i]'));
  const quanti = await p.evaluate(() => PAN_STATO.serie.voci.length);
  await tocca(p, '#pan-aggiungi');
  await p.waitForFunction((n) => PAN_STATO.serie.voci.length === n + 1, quanti, { timeout: 5000 });
  await fotogrammi(p);
  q = await quadro(p);
  const aggiunto = q.sporche.length === 1;
  await p.evaluate((i) => { const d = document.querySelector(`details[data-pan-i="${i}"]`); if (d) d.open = true; }, quanti);
  await tocca(p, `[data-pan-i="${quanti}"] [data-pan-azione="togli"]`);
  await fotogrammi(p);
  q = await quadro(p);
  dice(aggiunto && q.sporche.length === 0, `${nome}: Pannelli: aggiungo un pannello (da salvare) e lo tolgo (pulito)`, JSON.stringify({ aggiunto, q }));

  const largo = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  dice(largo <= 0, `${nome}: niente scorre di lato`, `${largo}px`);
  await p.close();
}

await b.close();
await chiudiSito();
for (const r of rotture) esiti.push({ ok: false, msg: 'errore nella pagina', extra: r });

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
if (SELFTEST) {
  ripristina();
  if (rossi.length) { console.log('\nAutoprova: senza il confronto con la base il cancello se ne accorge. ✓'); process.exit(0); }
  console.log('\nAutoprova: ho tolto il confronto e il cancello non se n\'è accorto. ✗');
  process.exit(1);
}
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nIl riquadro dice la verità: cosa resta da salvare, dove, e solo quello. ✓');
process.exit(rossi.length ? 1 : 0);
