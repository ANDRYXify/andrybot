// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello delle SCELTE: ogni casella e ogni pallino stanno con le loro parole.
//
// Perche' esiste. Sul telefono le quattro scelte della moneta («le tue Play»,
// «i tuoi Play», …) andavano a capo dove capitava: il pallino di una si
// attaccava alle parole di quella prima, «di base» restava sospeso, l'ultima
// finiva da sola su un'altra riga. Non era un caso di quel gruppo: la classe
// delle righe con una casella aveva due regole, una che la faceva riga e una
// (dell'Overlay Studio) che la faceva pezzo in linea, e vinceva la seconda
// ovunque. Le prove a occhio guardavano una scheda alla volta e non se ne
// accorgevano.
//
// La regola si misura, non si guarda. Per ogni casella e ogni pallino visibile
// che ha un'etichetta, in ogni scheda del pannello, con tutte le sezioni
// aperte, al telefono (390) e al computer (1280):
//  · STA CON LE SUE PAROLE: sulla stessa riga c'e' un pezzo del suo testo, a
//    non piu' di 24 pixel;
//  · NON SI ATTACCA ALLE PAROLE DI UN'ALTRA: fra i testi delle scelte su quella
//    riga, il piu' vicino e' il suo;
//  · LE PAROLE VANNO A CAPO SOTTO DI SE': una frase lunga riparte sotto il suo
//    inizio, non in colonna accanto a un grassetto o a un'icona.
// Un'icona dentro l'etichetta fa parte delle sue parole.
// Le caselle disegnate da noi (l'interruttore, dove la casella vera e'
// nascosta e si vede la levetta) non hanno un riquadro da misurare: si
// saltano, e il conto dice quante se ne sono misurate davvero.
//
// E OGNI SCELTA E' DISEGNATA come il resto del sito (disegno.js, «Le spunte»
// in docs/DISEGNO.md): la casella a china, la spunta o il pallino a mano, e il
// disegno dice lo stato vero della casella. Su un campione, toccata, la spunta
// si traccia a scatti e toccata di nuovo si disfa; nel gruppo dei pallini della
// moneta, sceglierne uno cancella quello di prima.
//
// E STA IN MEZZO ALLA SUA PRIMA RIGA. Il centro della casella sta sul centro
// ottico della prima riga delle sue parole (a meta' fra minuscole e maiuscole,
// sopra la linea di base), entro 2 pixel. Prima stava 4 pixel piu' in alto in
// centosessanta righe: la regola che la centra usava `1lh`, e sulla casella
// `lh` vale la riga della casella (15 px), non quella delle parole (23). E il
// riquadro e' un gesto solo: con quattro righe incrociate agli angoli, a dodici
// pixel, la casella vuota si leggeva come l'icona «ritaglia».
//
// LA HOME. Le caselle del configuratore hanno il disegno del pannello, scritto
// dal server con lo stesso file: si misura che arrivi intero (1,65rem, centrato
// sulla casella, mai stretto dalla regola generale delle immagini), che il
// riquadro sia un gesto solo, che la casella stia in mezzo alla prima riga del
// nome e che la «v» ci sia solo a casella spuntata.
//
// Uso: node scripts/verifica-scelte.mjs             (esce 1 se una scelta e' staccata, storta o attaccata a un'altra)
//      node scripts/verifica-scelte.mjs --selftest  (rimette i difetti di prima e vuole vederli rossi)

import { apriSito, apriBrowser } from './_sito.mjs';
const { pianiPubblici } = await import('../src/features/abbonamenti.js');

const SELFTEST = process.argv.includes('--selftest');
const LARGHEZZE = [[390, 844, true], [1280, 900, false]];

const MISURA = `(() => {
  const scheda = document.querySelector('.pannello-scheda.visibile');
  if (!scheda) return { misurate: 0, rotte: [] };
  const vede = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05 && r.width >= 6 && r.height >= 6 && !el.closest('[hidden]');
  };
  const etichetta = (i) => i.closest('label') || (i.labels && i.labels[0]) || null;
  const pezzi = (lab) => {
    const out = [];
    const w = document.createTreeWalker(lab, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!/\\S/.test(n.textContent)) continue;
      const su = n.parentElement;
      if (!su || su.closest('[hidden]') || su.closest('input,select,textarea,button')) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const q of r.getClientRects()) if (q.width > 1 && q.height > 1) out.push(q);
    }
    // Un pezzo dentro un elemento in linea con un suo riquadro (il codice
    // \`!ore\`) comincia dal bordo del riquadro, non dalla prima lettera.
    for (const f of lab.querySelectorAll('*')) {
      if (f.closest('[hidden]') || f.closest('input,select,textarea,button') || getComputedStyle(f).display !== 'inline') continue;
      if (!/\\S/.test(f.textContent)) continue;
      for (const q of f.getClientRects()) if (q.width > 1 && q.height > 1) out.push(q);
    }
    for (const f of lab.querySelectorAll('svg, img')) {
      if (f.closest('[hidden]') || f.closest('input,select,textarea,button')) continue;
      const q = f.getBoundingClientRect();
      if (q.width > 1 && q.height > 1) out.push(q);
    }
    return out;
  };
  const stessaRiga = (a, b) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) >= Math.min(a.height, b.height) * 0.5;
  const distanza = (a, b) => Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
  const nome = (i, lab) => (lab.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40) || i.name || i.id;
  // Il centro ottico della prima riga delle parole: a meta' fra il centro
  // delle minuscole e quello delle maiuscole, sopra la linea di base. La linea
  // di base si ricava dal riquadro del primo carattere e dalle misure del suo
  // carattere tipografico.
  const primaRiga = (lab) => {
    const w = document.createTreeWalker(lab, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const k = n.textContent.search(/\\S/);
      const su = n.parentElement;
      if (k < 0 || !su || su.closest('[hidden]') || su.closest('input,select,textarea,button')) continue;
      const r = document.createRange();
      r.setStart(n, k);
      r.setEnd(n, k + 1);
      const t = r.getBoundingClientRect();
      if (t.height < 1) continue;
      const st = getComputedStyle(su);
      const c = document.createElement('canvas').getContext('2d');
      c.font = st.fontStyle + ' ' + st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily;
      const x = c.measureText('x'), H = c.measureText('H');
      const base = t.top + t.height * x.fontBoundingBoxAscent / (x.fontBoundingBoxAscent + x.fontBoundingBoxDescent);
      return base - (x.actualBoundingBoxAscent + H.actualBoundingBoxAscent) / 4;
    }
    return null;
  };
  const tratti = (img) => { const m = decodeURIComponent(img).match(/<path d="([^"]*)"/); return m ? (m[1].match(/M/g) || []).length : 0; };
  const scelte = [...scheda.querySelectorAll('input[type="checkbox"], input[type="radio"]')]
    .filter((i) => vede(i))
    .map((i) => ({ i, lab: etichetta(i) }))
    .filter((x) => x.lab && vede(x.lab))
    .map((x) => ({ ...x, r: x.i.getBoundingClientRect(), testi: pezzi(x.lab) }))
    .filter((x) => x.testi.length);
  const rotte = [];
  for (const x of scelte) {
    const img = x.i.style.borderImageSource || '';
    if (!x.i.classList.contains('sp-disegnata') || !img.includes('data:image/svg')) { rotte.push('non disegnata: «' + nome(x.i, x.lab) + '»'); continue; }
    if (x.i.dataset.sp !== (x.i.checked ? 'si' : 'no') || img.includes('segno') !== x.i.checked) { rotte.push('il disegno non dice il suo stato: «' + nome(x.i, x.lab) + '»'); continue; }
    const suoi = x.testi.filter((q) => stessaRiga(q, x.r));
    const suo = suoi.length ? Math.min(...suoi.map((q) => distanza(q, x.r))) : Infinity;
    if (suo > 24) { rotte.push('staccata dalle sue parole: «' + nome(x.i, x.lab) + '»' + (suo === Infinity ? ' (non sono sulla sua riga)' : ' (' + Math.round(suo) + ' px)')); continue; }
    const sopra = x.testi.some((q) => Math.min(q.right, x.r.right) - Math.max(q.left, x.r.left) > 2 && Math.min(q.bottom, x.r.bottom) - Math.max(q.top, x.r.top) > 2);
    if (sopra) { rotte.push('sta sopra le sue parole: «' + nome(x.i, x.lab) + '»'); continue; }
    if (tratti(img) !== 1) { rotte.push('il riquadro non e\\' un gesto solo (' + tratti(img) + ' tratti): «' + nome(x.i, x.lab) + '»'); continue; }
    const ottico = primaRiga(x.lab);
    const scarto = ottico === null ? 0 : x.r.top + x.r.height / 2 - ottico;
    if (Math.abs(scarto) > 2) { rotte.push('non sta in mezzo alla sua prima riga: «' + nome(x.i, x.lab) + '» (' + (scarto < 0 ? 'piu\\' in alto' : 'piu\\' in basso') + ' di ' + Math.abs(scarto).toFixed(1) + ' px)'); continue; }
    // Le righe si riconoscono per sovrapposizione, non per l'altezza esatta: un
    // grassetto piu' alto di un pixel sta sulla stessa riga del testo intorno.
    const inizio = Math.min(...x.testi.map((q) => q.left));
    const righe = [];
    for (const q of [...x.testi].sort((a, b) => a.top - b.top)) {
      const r = righe.find((g) => stessaRiga(g, q));
      if (r) { r.top = Math.min(r.top, q.top); r.bottom = Math.max(r.bottom, q.bottom); r.height = r.bottom - r.top; r.left = Math.min(r.left, q.left); }
      else righe.push({ top: q.top, bottom: q.bottom, height: q.height, left: q.left });
    }
    if (righe.slice(1).some((g) => g.left > inizio + 4)) { rotte.push('le parole vanno a capo in colonna, non sotto di se\\': «' + nome(x.i, x.lab) + '»'); continue; }
    for (const y of scelte) {
      if (y.lab === x.lab) continue;
      const altrui = y.testi.filter((q) => stessaRiga(q, x.r));
      if (!altrui.length) continue;
      const d = Math.min(...altrui.map((q) => distanza(q, x.r)));
      if (d < suo) { rotte.push('attaccata alle parole di un\\'altra: «' + nome(x.i, x.lab) + '» vicino a «' + nome(y.i, y.lab) + '» (' + Math.round(d) + ' px contro ' + Math.round(suo) + ')'); break; }
    }
  }
  return { misurate: scelte.length, rotte: [...new Set(rotte)] };
})()`;

// Quello che si rompeva: la riga con una casella fatta pezzo in linea, senza
// spazio fra un pezzo e l'altro (cosi' era sul telefono), e un gruppo di
// pallini che di quella regola soffre.
const ROTTURA = `.riga-check{display:inline-flex!important;margin:0!important;gap:.4rem!important}`;
// E quello che si rompeva dopo: la casella centrata con l'unita' `lh`, che sulla
// casella vale la riga della casella (15 px) e non quella delle parole (23):
// stava 4 pixel piu' in alto. Nella home, la regola generale sulle immagini
// che stringeva il disegno della casella a 14 pixel.
const STORTA = `.riga-check > input:is([type="checkbox"],[type="radio"]):first-child{font:13.33px/normal sans-serif!important}`;
const STRETTA = `.vt-spunta svg{max-width:100%!important}`;
const GRUPPO = '<div id="prova-scelte">' + ['«le tue Play»', '«i tuoi Play»', '«la tua Play»', '«il tuo Play»']
  .map((t, k) => '<label class="riga-check"><input type="radio" name="prova-scelte" value="' + k + '"> <span>' + t + '</span> <span class="tenue">' + (k === 1 ? 'di base' : '') + '</span></label>').join('') + '</div>';

// La home disegna le sue caselle sul server con la stessa geometria del
// pannello (public/spunta-forma.js). Si misura che ci arrivino intere: il
// disegno grande quanto quello del pannello (1,65rem) e centrato sulla sua
// casella, il riquadro un gesto solo, la casella in mezzo alla prima riga del
// nome, e la «v» che c'e' solo quando la casella e' spuntata.
const MISURA_CASA = `(() => {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const rotte = [];
  const righe = [...document.querySelectorAll('.vt-extra')];
  const ottico = (el) => {
    const n = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode();
    if (!n) return null;
    const r = document.createRange(); r.setStart(n, 0); r.setEnd(n, 1);
    const t = r.getBoundingClientRect();
    const st = getComputedStyle(el);
    const c = document.createElement('canvas').getContext('2d');
    c.font = st.fontStyle + ' ' + st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily;
    const x = c.measureText('x'), H = c.measureText('H');
    return t.top + t.height * x.fontBoundingBoxAscent / (x.fontBoundingBoxAscent + x.fontBoundingBoxDescent) - (x.actualBoundingBoxAscent + H.actualBoundingBoxAscent) / 4;
  };
  for (const riga of righe) {
    const nome = (riga.querySelector('strong')?.textContent || '').trim().slice(0, 30);
    const box = riga.querySelector('.vt-spunta'), svg = box && box.querySelector('svg');
    if (!svg) { rotte.push('casella senza disegno: «' + nome + '»'); continue; }
    const b = box.getBoundingClientRect(), v = svg.getBoundingClientRect();
    if (Math.abs(v.width - 1.65 * rem) > .5 || Math.abs(v.height - 1.65 * rem) > .5) { rotte.push('il disegno non ha la sua misura: «' + nome + '» (' + v.width.toFixed(1) + '×' + v.height.toFixed(1) + ' invece di ' + (1.65 * rem).toFixed(1) + ')'); continue; }
    if (Math.abs(v.left + v.width / 2 - b.left - b.width / 2) > .5 || Math.abs(v.top + v.height / 2 - b.top - b.height / 2) > .5) { rotte.push('il disegno non sta centrato sulla sua casella: «' + nome + '»'); continue; }
    const fondo = svg.querySelector('.vt-sp-c')?.getAttribute('d') || '';
    if ((fondo.match(/M/g) || []).length !== 1) { rotte.push('il riquadro non e\\' un gesto solo: «' + nome + '»'); continue; }
    const o = ottico(riga.querySelector('strong'));
    const scarto = o === null ? 0 : b.top + b.height / 2 - o;
    if (Math.abs(scarto) > 2) { rotte.push('la casella non sta in mezzo alla prima riga del nome: «' + nome + '» (' + scarto.toFixed(1) + ' px)'); continue; }
    const vede = getComputedStyle(svg.querySelector('.vt-sp-v')).clipPath === 'inset(0px)';
    if (vede !== riga.querySelector('input').checked) rotte.push('la «v» non dice lo stato della casella: «' + nome + '»');
  }
  return { misurate: righe.length, rotte };
})()`;

const sito = await apriSito({ piani: pianiPubblici() });
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
const rotte = [];
const guai = [];
let misurate = 0;
let caselleCasa = 0;
let schedeViste = 0;
try {
  for (const [w, h, telefono] of LARGHEZZE) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: telefono, hasTouch: telefono, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => guai.push(e.message));
    await p.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'networkidle' });
    await p.waitForFunction(() => window.SB_APP && document.querySelector('.pannello-scheda.visibile'), null, { timeout: 20000 });
    await p.addStyleTag({ content: '.giro-velo,.giro-fumetto,.giro-carta,#cookie-banner{display:none!important}' });
    if (SELFTEST && telefono) {
      await p.addStyleTag({ content: ROTTURA });
      await p.evaluate((g) => document.querySelector('.pannello-scheda .carta').insertAdjacentHTML('afterbegin', g), GRUPPO);
    }
    if (SELFTEST && !telefono) await p.addStyleTag({ content: STORTA });
    const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
    for (const id of schede) {
      try { await p.evaluate((x) => window.SB_APP.vai(x), id); } catch { continue; }
      await p.waitForTimeout(250);
      await p.evaluate(() => document.querySelectorAll('.pannello-scheda.visibile details:not([open])').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(350);
      const r = await p.evaluate(MISURA);
      schedeViste++;
      misurate += r.misurate;
      for (const x of r.rotte) rotte.push(`${w}px · ${id}: ${x}`);
    }
    const casa = await ctx.newPage();
    casa.on('pageerror', (e) => guai.push(e.message));
    await casa.goto(sito.base + '/', { waitUntil: 'networkidle' });
    await casa.addStyleTag({ content: '#cookie-banner{display:none!important}' + (SELFTEST ? STRETTA : '') });
    if (await casa.locator('.vt-extra').count()) {
      await casa.locator('.vt-extra').first().scrollIntoViewIfNeeded();
      await casa.locator('.vt-extra').first().click();
      await casa.waitForTimeout(400);
    }
    const rc = await casa.evaluate(MISURA_CASA);
    if (!rc.misurate) rotte.push(`${w}px · home: nessuna casella nel configuratore`);
    caselleCasa += rc.misurate;
    for (const x of rc.rotte) rotte.push(`${w}px · home: ${x}`);
    await casa.close();
    // Le prove del gesto cambiano un'impostazione, e il pannello non lascia
    // uscire da una scheda con una modifica non salvata: ognuna parte da una
    // pagina appena caricata.
    const fresca = async (scheda) => {
      const q = await ctx.newPage();
      q.on('pageerror', (e) => guai.push(e.message));
      await q.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'networkidle' });
      await q.waitForFunction(() => window.SB_APP && document.querySelector('.pannello-scheda.visibile'), null, { timeout: 20000 });
      await q.addStyleTag({ content: '.giro-velo,.giro-fumetto,.giro-carta,#cookie-banner{display:none!important}' });
      await q.evaluate((x) => window.SB_APP.vai(x), scheda);
      await q.waitForFunction((x) => document.querySelector('.pannello-scheda.visibile')?.dataset.scheda === x, scheda, { timeout: 10000 });
      await q.waitForTimeout(400);
      return q;
    };
    if (telefono && !SELFTEST) {
      const pg = await fresca('regole');
      const gesto = await pg.evaluate(async () => {
        const el = [...document.querySelectorAll('.pannello-scheda.visibile input.sp-disegnata[type="checkbox"]')]
          .find((x) => !x.checked && x.getBoundingClientRect().width > 0);
        if (!el) return { trovata: false };
        el.scrollIntoView({ block: 'center' });
        await new Promise((ok) => setTimeout(ok, 120));
        const guarda = async () => { const visti = new Set(); for (let t = 0; t < 14; t++) { visti.add(el.style.borderImageSource); await new Promise((ok) => setTimeout(ok, 40)); } return visti.size; };
        el.click();
        const dentro = await guarda();
        const accesa = el.dataset.sp === 'si' && el.style.borderImageSource.includes('segno');
        el.click();
        const fuori = await guarda();
        const spenta = el.dataset.sp === 'no' && !el.style.borderImageSource.includes('segno');
        return { trovata: true, dentro, fuori, accesa, spenta };
      });
      if (!gesto.trovata) rotte.push(`${w}px · regole: nessuna casella da toccare per provare il gesto`);
      else {
        if (gesto.dentro < 3 || !gesto.accesa) rotte.push(`${w}px · regole: la spunta non si traccia a scatti quando la metti (${gesto.dentro} disegni)`);
        if (gesto.fuori < 2 || !gesto.spenta) rotte.push(`${w}px · regole: la spunta non si disfa quando la togli (${gesto.fuori} disegni)`);
      }
      await pg.close();
      const g = await fresca('giochi');
      const gruppo = await g.evaluate(async () => {
        document.querySelectorAll('.pannello-scheda.visibile details:not([open])').forEach((d) => { d.open = true; });
        await new Promise((ok) => setTimeout(ok, 350));
        const tutti = [...document.querySelectorAll('.pannello-scheda.visibile input.sp-disegnata[type="radio"][name="forma-monete"]')];
        const altro = tutti.find((x) => !x.checked);
        if (!altro) return { trovato: false };
        const prima = tutti.find((x) => x.checked);
        altro.scrollIntoView({ block: 'center' });
        altro.click();
        await new Promise((ok) => setTimeout(ok, 600));
        return { trovato: true, nuovo: altro.dataset.sp === 'si', vecchio: !prima || prima.dataset.sp === 'no' };
      });
      await g.close();
      if (!gruppo.trovato) rotte.push(`${w}px · giochi: il gruppo dei pallini della moneta non c'e' da provare`);
      else if (!gruppo.nuovo || !gruppo.vecchio) rotte.push(`${w}px · giochi: scegliendo un pallino, ${gruppo.nuovo ? 'quello di prima resta disegnato' : 'il nuovo non si disegna'}`);
    }
    if (SELFTEST && telefono) {
      await p.evaluate(() => window.SB_APP.vai('regole'));
      await p.waitForFunction(() => document.querySelector('.pannello-scheda.visibile')?.dataset.scheda === 'regole', null, { timeout: 10000 });
      await p.waitForTimeout(400);
      const tolta = await p.evaluate(() => {
        const el = [...document.querySelectorAll('.pannello-scheda.visibile input.sp-disegnata')].find((x) => x.getBoundingClientRect().width > 0);
        if (!el) return false;
        el.classList.remove('sp-disegnata');
        el.style.borderImageSource = '';
        return true;
      });
      const r = await p.evaluate(MISURA);
      if (tolta && r.rotte.some((x) => x.startsWith('non disegnata'))) rotte.push('390px · autoprova: casella nativa vista');
    }
    await ctx.close();
  }
  for (const r of rotte.slice(0, 40)) console.log(`  ✗ ${r}`);
  if (rotte.length > 40) console.log(`  … e altre ${rotte.length - 40}`);
  console.log(`\n${schedeViste} schede aperte (telefono e computer), ${misurate} scelte misurate, e ${caselleCasa} caselle della home.`);
  if (guai.length) console.log('  ✗ la pagina ha errori: ' + [...new Set(guai)].slice(0, 2).join(' · '));
  const pochi = misurate < 100;
  if (pochi) console.log('  ✗ troppo poche scelte misurate: il cancello non sta guardando il pannello');
  const ok = !rotte.length && !guai.length && !pochi;
  if (SELFTEST) {
    const inLinea = rotte.some((r) => r.startsWith('390px') && r.includes('attaccata alle parole di un\'altra') && r.includes('Play'));
    const nativa = rotte.some((r) => r.includes('autoprova: casella nativa vista'));
    const storta = rotte.some((r) => r.startsWith('1280px') && r.includes('non sta in mezzo alla sua prima riga'));
    const stretta = rotte.some((r) => r.includes('home: il disegno non ha la sua misura'));
    const vista = inLinea && nativa && storta && stretta;
    console.log(inLinea ? 'Autoprova: la scelta attaccata a un\'altra si vede. ✓' : 'Autoprova: la regola in linea NON e\' stata vista. ✗');
    console.log(nativa ? 'Autoprova: la casella non disegnata si vede. ✓' : 'Autoprova: la casella non disegnata NON e\' stata vista. ✗');
    console.log(storta ? 'Autoprova: la casella piu\' alta delle sue parole si vede. ✓' : 'Autoprova: la casella piu\' alta NON e\' stata vista. ✗');
    console.log(stretta ? 'Autoprova: la «v» della home stretta si vede. ✓' : 'Autoprova: la «v» della home stretta NON e\' stata vista. ✗');
    process.exitCode = vista ? 0 : 1;
  } else {
    console.log(ok ? 'Ogni casella e ogni pallino stanno con le loro parole, disegnati come il resto del sito. ✓' : `${rotte.length} scelte fuori posto.`);
    process.exitCode = ok ? 0 : 1;
  }
} finally {
  await br.close();
  sito.chiudi();
}
