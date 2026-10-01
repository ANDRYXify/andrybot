// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello dell'ANTEPRIMA DAL VIVO degli editor di pagina (pagina link,
// donazioni, negozio): in «Telefono» e in «Schermo» l'anteprima sta nel suo
// riquadro, e i tre editor sono lo stesso editor (docs/MOBILE.md).
//
// Perche' esiste. «Un po' rotto l'editor se metto schermo»: in «Schermo»
// l'anteprima e' una pagina larga 1280 punti rimpicciolita a vista. La pagina
// contava nell'impaginazione con la sua larghezza vera: la colonna si allargava
// fino a 1280, la cornice usciva dal riquadro, «Salva e pubblica» finiva sopra
// i tasti dei pezzi, e la scala, misurata sulla cornice gonfiata, confermava lo
// sbaglio (1280 / 1280 = 1). E l'editor del negozio non era un contenitore come
// gli altri due: restava in una colonna anche su uno schermo largo.
//
// Il modello: il POSTO dell'anteprima e' lo spazio che resta nel riquadro; dentro
// c'e' il VETRO, alto e stretto per il telefono, un 16:10 grande quanto ci sta
// per lo schermo; la pagina finta sta sopra il vetro senza contare, e la scala
// e' larghezza del vetro / 1280. Qui si misura, nei tre editor e a quattro
// larghezze:
//  · passando a «Schermo» il riquadro e la casa dell'editor non cambiano larghezza;
//  · il vetro sta nel posto, il posto nel riquadro, e il vetro tocca il posto
//    in larghezza o in altezza (grande quanto ci sta);
//  · la pagina finta, rimpicciolita, e' esattamente il vetro, in 16:10;
//  · «Salva e pubblica» sta nel riquadro e non tocca comandi e ispettore;
//  · alla stessa larghezza i tre editor hanno le stesse colonne;
//  · la vista scelta resta dopo che l'editor si ridisegna (un tema scelto);
//  · nel vetro c'e' la pagina, coi titoli che l'editor ha scritto. Il sito dei
//    collaudi e' la demo, e la demo l'anteprima non la sapeva chiedere: il
//    vetro restava nero, e le misure qui sopra misuravano un vetro vuoto
//    (docs/DEMO.md).
//
// Uso: node scripts/verifica-anteprima-pagina.mjs             (esce 1 se qualcosa esce o non torna)
//      node scripts/verifica-anteprima-pagina.mjs --selftest  (rimette la cornice vecchia, toglie
//                                                             il contenitore al negozio e la porta
//                                                             dell'anteprima della demo, e li vuole rossi)

import { apriSito, apriBrowser } from './_sito.mjs';

const SELFTEST = process.argv.includes('--selftest');
const SCHERMI = [[390, 844], [1000, 808], [1440, 900], [1920, 1080]];
const EDITOR = [['pagina', 'pagina link'], ['donazioni', 'donazioni'], ['negozio', 'negozio']];
const VECCHIO = '#lp-box-negozio{container-type:normal!important}'
  + '.lp-posto{container-type:normal!important;flex:0 0 auto!important;display:block!important}'
  + '.lp-posto.schermo>.lp-telefono{box-sizing:border-box!important;width:auto!important;aspect-ratio:auto!important;height:calc(800px * var(--z,.3))!important}'
  + '.lp-posto.schermo>.lp-telefono iframe{position:static!important}';

// nell'autoprova la porta dell'anteprima della demo non risponde: il vetro resta nero
const sito = await apriSito({ rotte: SELFTEST ? (req, res, q) => (q === '/api/demo/anteprima' ? (res.writeHead(404), res.end(), true) : false) : null });
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
const rotte = [], guai = [];
const dice = (ok, cosa) => { if (!ok) { console.log(`  ✗ ${cosa}`); rotte.push(cosa); } return ok; };
let misure = 0;

const MISURA = () => {
  const casa = [...document.querySelectorAll('.lp-casa')].find((c) => c.offsetParent && c.querySelector('.lp-editor'));
  if (!casa) return null;
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  const vetro = casa.querySelector('#lp-cornice .lp-telefono');
  const bordo = vetro ? parseFloat(getComputedStyle(vetro).borderLeftWidth) || 0 : 0;
  const ed = casa.querySelector('.lp-editor');
  return {
    casa: r(casa), ant: r(casa.querySelector('.lp-anteprima')), posto: r(casa.querySelector('#lp-cornice')), vetro: r(vetro), bordo,
    pagina: r(casa.querySelector('#lp-iframe')), azioni: r(casa.querySelector('.lp-azioni')),
    comandi: r(casa.querySelector('.lp-comandi')), ispettore: r(casa.querySelector('.lp-ispettore')),
    colonne: getComputedStyle(ed).gridTemplateColumns.split(' ').filter(Boolean).length,
    largaEd: ed.scrollWidth - ed.clientWidth,
    schermo: casa.querySelector('#lp-cornice')?.classList.contains('schermo'),
    scelto: casa.querySelector('.lp-vista-b.sel')?.dataset.lpvista,
  };
};
const dentro = (a, b, t = 1) => a && b && a.l >= b.l - t && a.t >= b.t - t && a.r <= b.r + t && a.b <= b.b + t;
const tocca = (a, b) => a && b && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
const vicino = (a, b, t = 1.5) => Math.abs(a - b) <= t;

try {
  for (const [W, H] of SCHERMI) {
    const p = await br.newPage({ viewport: { width: W, height: H } });
    p.on('pageerror', (e) => guai.push(e.message));
    await p.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
    await p.addStyleTag({ content: '#cookie-banner,.giro-velo,.giro-fumetto,.giro-carta{display:none!important}' + (SELFTEST ? VECCHIO : '') });
    await p.evaluate(() => { try { localStorage.setItem('sotto:negozio', 'pagina'); } catch {} });
    const colonne = {};
    for (const [scheda, nome] of EDITOR) {
      const dove = `${W}px · ${nome}`;
      await p.evaluate((s) => window.SB_APP.vai(s), scheda);
      await p.waitForFunction(() => [...document.querySelectorAll('.lp-casa')].some((c) => c.offsetParent && c.querySelector('#lp-cornice')), null, { timeout: 20000 });
      await p.waitForTimeout(400);
      const vista = (v) => p.evaluate((v) => [...document.querySelectorAll(`.lp-casa [data-lpvista="${v}"]`)].find((b) => b.offsetParent)?.click(), v);
      await vista('telefono');
      await p.waitForTimeout(250);
      const tel = await p.evaluate(MISURA);
      const pagina = await p.waitForFunction(() => {
        const casa = [...document.querySelectorAll('.lp-casa')].find((c) => c.offsetParent && c.querySelector('#lp-iframe'));
        const titolo = casa?.querySelector('#lp-headline')?.value?.trim();
        const testo = casa?.querySelector('#lp-iframe')?.contentDocument?.body?.textContent || '';
        return titolo && testo.includes(titolo) ? titolo : false;
      }, null, { timeout: 5000 }).then((h) => h.jsonValue()).catch(() => '');
      dice(!!pagina, `${dove}: nel vetro non c'e' la pagina col titolo dell'editor (resta nero)`);
      await vista('schermo');
      await p.waitForTimeout(400);
      const sch = await p.evaluate(MISURA);
      misure++;
      colonne[nome] = tel.colonne;
      dice(vicino(sch.ant.w, tel.ant.w) && vicino(sch.casa.w, tel.casa.w), `${dove}: passando a «Schermo» il riquadro passa da ${tel.ant.w.toFixed(0)} a ${sch.ant.w.toFixed(0)} punti`);
      dice(sch.largaEd <= 1 && sch.ant.r <= sch.casa.r + 1, `${dove}: in «Schermo» l'editor esce dalla sua casa (${sch.largaEd} punti in piu', riquadro fino a ${sch.ant.r.toFixed(0)} su ${sch.casa.r.toFixed(0)})`);
      for (const [v, m] of [['Telefono', tel], ['Schermo', sch]]) {
        dice(dentro(m.vetro, m.posto) && dentro(m.posto, m.ant), `${dove}: in «${v}» il vetro esce dal riquadro (vetro ${m.vetro.w.toFixed(0)}×${m.vetro.h.toFixed(0)}, posto ${m.posto.w.toFixed(0)}×${m.posto.h.toFixed(0)})`);
        dice(dentro(m.azioni, m.ant) && !tocca(m.azioni, m.comandi) && !tocca(m.azioni, m.ispettore), `${dove}: in «${v}» «Salva e pubblica» esce dal riquadro o copre i comandi`);
      }
      const dentroW = sch.vetro.w - 2 * sch.bordo, dentroH = sch.vetro.h - 2 * sch.bordo;
      dice(vicino(sch.pagina.w, dentroW) && vicino(sch.pagina.h, dentroH), `${dove}: la pagina rimpicciolita (${sch.pagina.w.toFixed(1)}×${sch.pagina.h.toFixed(1)}) non e' il vetro (${dentroW.toFixed(1)}×${dentroH.toFixed(1)})`);
      dice(Math.abs(sch.pagina.w / sch.pagina.h - 1.6) < 0.02, `${dove}: lo schermo non e' 16:10 (${(sch.pagina.w / sch.pagina.h).toFixed(3)})`);
      dice(vicino(sch.vetro.w, sch.posto.w) || vicino(sch.vetro.h, sch.posto.h), `${dove}: lo schermo non e' grande quanto ci sta (${sch.vetro.w.toFixed(0)}×${sch.vetro.h.toFixed(0)} in ${sch.posto.w.toFixed(0)}×${sch.posto.h.toFixed(0)})`);
      if (scheda === 'negozio') {
        await p.evaluate(() => [...document.querySelectorAll('.lp-casa [data-lptema]')][0]?.click());
        await p.waitForTimeout(500);
        const dopo = await p.evaluate(MISURA);
        dice(dopo?.schermo && dopo.scelto === 'schermo', `${dove}: ridisegnato l'editor, la vista torna «${dopo?.scelto}» invece di restare «Schermo»`);
      }
    }
    const tutte = Object.values(colonne);
    dice(tutte.every((n) => n === tutte[0]), `${W}px: i tre editor non hanno le stesse colonne (${Object.entries(colonne).map(([k, n]) => `${k} ${n}`).join(', ')})`);
    await p.close();
  }
  dice(!guai.length, `la pagina ha errori: ${guai[0]}`);
} finally {
  await br.close();
  sito.chiudi();
}
if (SELFTEST) {
  const esce = rotte.some((r) => r.includes('riquadro') || r.includes('esce'));
  const colonne = rotte.some((r) => r.includes('stesse colonne'));
  const nero = rotte.some((r) => r.includes('resta nero'));
  console.log(esce ? 'Autoprova: la cornice vecchia, che esce dal riquadro, si vede. ✓' : 'Autoprova: la cornice vecchia NON e\' stata vista. ✗');
  console.log(colonne ? 'Autoprova: il negozio senza contenitore si vede. ✓' : 'Autoprova: il negozio senza contenitore NON e\' stato visto. ✗');
  console.log(nero ? 'Autoprova: il vetro nero della demo si vede. ✓' : 'Autoprova: il vetro nero della demo NON e\' stato visto. ✗');
  process.exit(esce && colonne && nero ? 0 : 1);
}
console.log(`\n${misure} anteprime misurate (tre editor, ${SCHERMI.length} larghezze, telefono e schermo).`);
console.log(rotte.length ? `${rotte.length} cose non tornano.` : 'L\'anteprima sta nel suo riquadro in ogni vista, ha dentro la pagina, e i tre editor sono lo stesso editor. ✓');
process.exit(rotte.length ? 1 : 0);
