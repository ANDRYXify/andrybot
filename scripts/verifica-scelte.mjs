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
// Uso: node scripts/verifica-scelte.mjs             (esce 1 se una scelta e' staccata o attaccata a un'altra)
//      node scripts/verifica-scelte.mjs --selftest  (rimette la regola in linea e vuole vederla rossa)

import { apriSito, apriBrowser } from './_sito.mjs';

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
  const scelte = [...scheda.querySelectorAll('input[type="checkbox"], input[type="radio"]')]
    .filter((i) => vede(i))
    .map((i) => ({ i, lab: etichetta(i) }))
    .filter((x) => x.lab && vede(x.lab))
    .map((x) => ({ ...x, r: x.i.getBoundingClientRect(), testi: pezzi(x.lab) }))
    .filter((x) => x.testi.length);
  const rotte = [];
  for (const x of scelte) {
    const suoi = x.testi.filter((q) => stessaRiga(q, x.r));
    const suo = suoi.length ? Math.min(...suoi.map((q) => distanza(q, x.r))) : Infinity;
    if (suo > 24) { rotte.push('staccata dalle sue parole: «' + nome(x.i, x.lab) + '»' + (suo === Infinity ? ' (non sono sulla sua riga)' : ' (' + Math.round(suo) + ' px)')); continue; }
    const sopra = x.testi.some((q) => Math.min(q.right, x.r.right) - Math.max(q.left, x.r.left) > 2 && Math.min(q.bottom, x.r.bottom) - Math.max(q.top, x.r.top) > 2);
    if (sopra) { rotte.push('sta sopra le sue parole: «' + nome(x.i, x.lab) + '»'); continue; }
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
const GRUPPO = '<div id="prova-scelte">' + ['«le tue Play»', '«i tuoi Play»', '«la tua Play»', '«il tuo Play»']
  .map((t, k) => '<label class="riga-check"><input type="radio" name="prova-scelte" value="' + k + '"> <span>' + t + '</span> <span class="tenue">' + (k === 1 ? 'di base' : '') + '</span></label>').join('') + '</div>';

const sito = await apriSito({});
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
const rotte = [];
const guai = [];
let misurate = 0;
let schedeViste = 0;
try {
  for (const [w, h, telefono] of LARGHEZZE) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: telefono, hasTouch: telefono, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => guai.push(e.message));
    await p.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'networkidle' });
    await p.waitForFunction(() => window.SB_APP && document.querySelector('.pannello-scheda.visibile'), null, { timeout: 20000 });
    await p.addStyleTag({ content: '.giro-velo,.giro-fumetto,.giro-carta,#cookie-banner{display:none!important}' });
    if (SELFTEST) {
      await p.addStyleTag({ content: ROTTURA });
      await p.evaluate((g) => document.querySelector('.pannello-scheda .carta').insertAdjacentHTML('afterbegin', g), GRUPPO);
    }
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
    await ctx.close();
  }
  for (const r of rotte.slice(0, 40)) console.log(`  ✗ ${r}`);
  if (rotte.length > 40) console.log(`  … e altre ${rotte.length - 40}`);
  console.log(`\n${schedeViste} schede aperte (telefono e computer), ${misurate} scelte misurate.`);
  if (guai.length) console.log('  ✗ la pagina ha errori: ' + [...new Set(guai)].slice(0, 2).join(' · '));
  const pochi = misurate < 100;
  if (pochi) console.log('  ✗ troppo poche scelte misurate: il cancello non sta guardando il pannello');
  const ok = !rotte.length && !guai.length && !pochi;
  if (SELFTEST) {
    const vista = rotte.some((r) => r.startsWith('390px') && r.includes('attaccata alle parole di un\'altra') && r.includes('Play'));
    console.log(vista ? 'Autoprova: la scelta attaccata a un\'altra si vede. ✓' : 'Autoprova: la regola in linea NON e\' stata vista. ✗');
    process.exitCode = vista ? 0 : 1;
  } else {
    console.log(ok ? 'Ogni casella e ogni pallino stanno con le loro parole. ✓' : `${rotte.length} scelte fuori posto.`);
    process.exitCode = ok ? 0 : 1;
  }
} finally {
  await br.close();
  sito.chiudi();
}
