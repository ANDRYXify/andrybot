// Cancello dei BERSAGLI: quello che si tocca si prende col dito.
//
// Perche' esiste. Una «×» di 19 per 16 pixel accanto al nome che toglie e' un
// tasto che si sbaglia: col dito si prende il nome, o il vicino, o niente. Sul
// portatile col mouse non si vede, e nessuno ci pensa finche' non prova a
// togliere un amico dal telefono.
//
// La regola e' quella delle WCAG (2.5.8, livello AA): un bersaglio e' grande
// almeno 24 per 24 pixel, oppure ha abbastanza spazio intorno, cioe' un cerchio
// da 24 centrato su di lui non tocca un altro bersaglio. Due precisazioni che
// vengono dalla regola stessa, non da comodita':
//  · il bersaglio di una casella e' anche la sua etichetta: toccando la scritta
//    la casella si spunta, quindi si misura l'insieme;
//  · un collegamento dentro una frase non conta: e' testo, e allargarlo
//    romperebbe la riga.
//
// Si apre il pannello a larghezza di telefono, col dito (pointer coarse), e si
// misura scheda per scheda quello che si vede davvero.
//
// Uso: node scripts/verifica-bersagli.mjs             (esce 1 se ce n'e' uno)
//      node scripts/verifica-bersagli.mjs --selftest  (ne mette uno apposta)

import { apriSito, apriBrowser } from './_sito.mjs';

const SELFTEST = process.argv.includes('--selftest');

const MISURA = `(() => {
  const SEL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])';
  const scheda = document.querySelector('.pannello-scheda.visibile');
  if (!scheda) return [];
  const vede = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const nelTesto = (el) => el.tagName === 'A' && getComputedStyle(el).display === 'inline'
    && /\\S/.test((el.parentElement?.textContent || '').replace(el.textContent, ''));
  const unione = (a, b) => ({ left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) });
  const zona = (el) => {
    let r = el.getBoundingClientRect();
    r = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (const lab of el.labels || []) { const q = lab.getBoundingClientRect(); if (q.width && q.height) r = unione(r, q); }
    return r;
  };
  const tutti = [...scheda.querySelectorAll(SEL)].filter(vede);
  const box = tutti.map((el) => ({ el, r: zona(el) }));
  const largo = (r) => r.right - r.left, alto = (r) => r.bottom - r.top;
  const dist = (x, y, q) => Math.hypot(Math.max(q.left - x, 0, x - q.right), Math.max(q.top - y, 0, y - q.bottom));
  const out = [];
  for (const { el, r } of box) {
    if (largo(r) >= 24 && alto(r) >= 24) continue;
    if (nelTesto(el)) continue;
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    const tocca = box.some((o) => {
      if (o.el === el || o.el.contains(el) || el.contains(o.el)) return false;
      if (dist(cx, cy, o.r) < 12) return true;
      const piccolo = largo(o.r) < 24 || alto(o.r) < 24;
      return piccolo && Math.hypot(cx - (o.r.left + o.r.right) / 2, cy - (o.r.top + o.r.bottom) / 2) < 24;
    });
    if (!tocca) continue;
    const nome = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim().slice(0, 24);
    out.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (String(el.className || '').trim() ? '.' + String(el.className).trim().split(/\\s+/).slice(0, 2).join('.') : '')
      + ' ' + Math.round(largo(r)) + 'x' + Math.round(alto(r)) + (nome ? ' «' + nome + '»' : ''));
  }
  return [...new Set(out)];
})()`;

const sito = await apriSito({});
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
const p = await ctx.newPage();
const guai = [];
p.on('pageerror', (e) => guai.push(e.message));
try {
  await p.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.SB_APP && document.querySelector('.pannello-scheda.visibile'), null, { timeout: 20000 });
  await p.addStyleTag({ content: '.giro-velo,.giro-fumetto,.giro-carta,#cookie-banner{display:none!important}' });
  if (SELFTEST) {
    // Una «×» da 16 pixel attaccata a un altro tasto, dentro la scheda che si guarda per prima.
    await p.evaluate(() => {
      const c = document.querySelector('.pannello-scheda .carta');
      c.insertAdjacentHTML('afterbegin', '<span><button type="button" style="all:unset;display:inline-block;width:16px;height:16px">×</button><button type="button" style="all:unset;display:inline-block;width:40px;height:40px">ok</button></span>');
    });
  }
  const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
  const rotte = [];
  for (const id of schede) {
    try { await p.evaluate((x) => window.SB_APP.vai(x), id); } catch { continue; }
    await p.waitForTimeout(220);
    const piccoli = await p.evaluate(MISURA);
    if (piccoli.length) rotte.push({ id, piccoli });
  }
  for (const r of rotte) {
    console.log(`  ✗ ${r.id}:`);
    for (const x of r.piccoli.slice(0, 6)) console.log(`      ${x}`);
  }
  console.log(`\n${schede.length} schede toccate a 390px.`);
  if (guai.length) console.log('  ✗ la pagina ha errori: ' + guai.slice(0, 2).join(' · '));
  const ok = !rotte.length && !guai.length;
  if (SELFTEST) {
    console.log(ok ? 'Autoprova: il tasto piccolo NON e\' stato visto. ✗' : 'Autoprova: il tasto piccolo si vede. ✓');
    process.exitCode = ok ? 1 : 0;
  } else {
    console.log(ok ? 'Ogni bersaglio si prende col dito. ✓'
      : `${rotte.reduce((n, r) => n + r.piccoli.length, 0)} bersagli troppo piccoli e troppo vicini ad altri.`);
    process.exitCode = ok ? 0 : 1;
  }
} finally {
  await br.close();
  sito.chiudi();
}
