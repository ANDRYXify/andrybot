// Collaudo del MENU — gira in un browser vero.
//
// Il menu e' uno solo, l'elenco del cassetto, e si mostra in tre modi a seconda
// dello spazio: la barra in basso sul telefono, l'hamburger fino a 1023 px, il
// menu fermo di lato da 1024 px. Il ragionamento sta in docs/MOBILE.md («Il
// menu: uno solo, due modi di mostrarlo»).
//
// Qui, per ogni larghezza, lingua e ruolo, si pretende che:
//  · il menu si raggiunga in UN modo solo: mai nessuno, mai due insieme;
//  · nella barra in alto il logo e gli strumenti non si tocchino;
//  · il menu di lato non copra il contenuto, niente esca dai suoi bordi, e
//    l'ultima voce si raggiunga scorrendo;
//  · una voce sola sia accesa (`aria-current`), ed e' quella della scheda;
//  · dove c'e' il cassetto, niente ne esca e si chiuda cliccando fuori;
//  · allargando la finestra col cassetto aperto, il cassetto si chiuda da solo.
//
// Uso: node scripts/verifica-barra.mjs   (esce 1 se qualcosa non torna)

import { apriSito } from './_sito.mjs';

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch {
  console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.');
  console.log('(serve un browser vero; su un altro computer: PLAYWRIGHT=... CHROMIUM=... node scripts/verifica-barra.mjs)');
  process.exit(0);
}

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();

const MISURA = `(() => {
  const vede = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
  const box = (el) => el && el.getBoundingClientRect();
  const tocca = (a, c) => a && c && a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5;
  const drawer = document.querySelector('.drawer');
  const lato = vede(drawer) && getComputedStyle(drawer).transform === 'none' && !document.body.classList.contains('menu-aperto');
  const modi = { giu: vede(document.querySelector('.barra-giu')), hamburger: vede(document.querySelector('.apri-menu')), lato };
  const coll = [];
  const strumenti = document.querySelector('.top-strumenti');
  if (vede(strumenti) && tocca(box(document.querySelector('.marchio')), box(strumenti))) coll.push('logo/strumenti');
  if (vede(strumenti) && strumenti.getBoundingClientRect().right > innerWidth + 0.5) coll.push('strumenti fuori dallo schermo');
  const accese = [...document.querySelectorAll('#nav-drawer [aria-current="page"]')].map((b) => b.dataset.scheda);
  const perLato = {};
  if (lato) {
    const d = box(drawer);
    const main = box(document.querySelector('.area-principale'));
    perLato.copre = main.left < d.right - 0.5;
    perLato.sbordano = [...drawer.querySelectorAll('*')].filter((el) => {
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return false;
      const b = el.getBoundingClientRect();
      return b.width && b.height && (b.left < d.left - 0.5 || b.right > d.right + 0.5);
    }).map((el) => String(el.className || el.tagName)).slice(0, 3);
    drawer.scrollTop = drawer.scrollHeight;
    const voci = drawer.querySelectorAll('#nav-drawer .drawer-voce');
    const ultima = voci[voci.length - 1];
    const u = box(ultima);
    perLato.ultimaSiVede = !!ultima && u.bottom <= d.bottom + 0.5 && u.top >= d.top - 0.5;
    drawer.scrollTop = 0;
  }
  return { modi, coll, accese, scheda: typeof schedaAttiva === 'string' ? schedaAttiva : '', ...perLato };
})()`;

const LARGHEZZE = [390, 720, 721, 768, 900, 1023, 1024, 1180, 1280, 1366, 1440, 1600, 1920, 2560];
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

const esiti = [];
const cassetti = [];
const allargati = [];
for (const admin of [false, true]) {
  for (const lang of ['it', 'en', 'es']) {
    const p = await b.newPage({ viewport: { width: 1366, height: 800 } });
    await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=${lang}`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.querySelector('#nav-drawer .drawer-voce'), null, { timeout: 15000 }).catch(() => {});
    if (admin) await p.evaluate(() => { stato = { ...stato, isAdmin: true }; render(); });
    // Una scheda di una famiglia: la voce accesa dev'essere quella della famiglia.
    await p.evaluate(() => { if (typeof vaiAScheda === 'function') vaiAScheda('conoscenza'); });
    for (const w of LARGHEZZE) {
      await p.setViewportSize({ width: w, height: 800 });
      await p.waitForTimeout(260);
      const r = await p.evaluate(MISURA);
      const quanti = Object.values(r.modi).filter(Boolean).length;
      const accesaGiusta = r.accese.length === 1
        && await p.evaluate(([v, s]) => voceAttiva(v, s), [r.accese[0], r.scheda]);
      const guai = [];
      if (quanti !== 1) {
        guai.push(quanti
          ? `il menu si raggiunge in ${quanti} modi insieme (${Object.keys(r.modi).filter((k) => r.modi[k]).join(', ')})`
          : 'nessun modo di raggiungere il menu');
      }
      guai.push(...r.coll);
      if (!accesaGiusta) guai.push(`voci accese: ${r.accese.join(', ') || 'nessuna'} (la scheda e' ${r.scheda})`);
      if (r.modi.lato) {
        if (r.copre) guai.push('il menu di lato copre il contenuto');
        if (r.sbordano?.length) guai.push('esce dal menu di lato: ' + r.sbordano.join(', '));
        if (!r.ultimaSiVede) guai.push('l\'ultima voce del menu non si raggiunge');
      }
      if (r.modi.lato !== (w >= 1024)) guai.push(r.modi.lato ? 'menu di lato dove non ci sta' : 'niente menu di lato dove ci sta');
      esiti.push({ admin, lang, w, guai });

      if (r.modi.hamburger || r.modi.giu) {
        await p.evaluate(() => { document.body.classList.add('menu-aperto'); });
        // La misura si prende a cassetto FERMO: l'animazione ha un rimbalzo, e
        // mentre scivola i riquadri si arrotondano in modo diverso.
        await p.waitForFunction(() => {
          const t = getComputedStyle(document.querySelector('.drawer')).transform;
          return t === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(t);
        }, { timeout: 3000 }).catch(() => {});
        const sbordano = await p.evaluate(() => {
          const d = document.querySelector('.drawer');
          const r = d.getBoundingClientRect();
          const male = [];
          for (const el of d.querySelectorAll('*')) {
            const st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden') continue;
            const x = el.getBoundingClientRect();
            if (!x.width || !x.height) continue;
            if (x.left < r.left - 0.5 || x.right > r.right + 0.5) male.push(String(el.className || el.tagName));
          }
          return [...new Set(male)].slice(0, 3);
        });
        await p.mouse.click(12, 400);              // fuori dal cassetto, che sta a destra
        await p.waitForTimeout(360);
        const siChiude = await p.evaluate(() => !document.body.classList.contains('menu-aperto'));
        if (!siChiude) await p.evaluate(() => document.body.classList.remove('menu-aperto'));
        cassetti.push({ admin, lang, w, siChiude, sbordano });
      }
    }
    // Allargando col cassetto aperto, di lato il cassetto non puo' restare «aperto».
    await p.setViewportSize({ width: 800, height: 800 });
    await p.waitForTimeout(200);
    await p.click('.apri-menu').catch(() => {});
    await p.waitForTimeout(200);
    const aperto = await p.evaluate(() => document.body.classList.contains('menu-aperto'));
    await p.setViewportSize({ width: 1366, height: 800 });
    await p.waitForTimeout(300);
    const resta = await p.evaluate(() => document.body.classList.contains('menu-aperto'));
    allargati.push({ admin, lang, ok: aperto && !resta, aperto, resta });
    await p.close();
  }
}
await b.close();
chiudiSito();

const rossi = esiti.filter((e) => e.guai.length);
for (const e of rossi) console.log(`  ✗ ${e.lang} ${String(e.w).padStart(5)}px${e.admin ? ' (admin)' : ''} — ${e.guai.join(' · ')}`);
console.log(`  ${rossi.length ? '✗' : '✓'} ${esiti.length} combinazioni di larghezza, lingua e ruolo: un menu solo, niente che si tocca, la voce giusta accesa`);

const cassettiRossi = cassetti.filter((e) => !e.siChiude || e.sbordano.length);
for (const e of cassettiRossi) {
  console.log(`  ✗ ${e.lang} ${String(e.w).padStart(5)}px${e.admin ? ' (admin)' : ''} — ${!e.siChiude ? 'il cassetto non si chiude cliccando fuori' : 'esce dal cassetto: ' + e.sbordano.join(', ')}`);
}
console.log(`  ${cassettiRossi.length ? '✗' : '✓'} ${cassetti.length} volte il cassetto non taglia niente e si chiude cliccando fuori`);

const allargatiRossi = allargati.filter((e) => !e.ok);
for (const e of allargatiRossi) {
  console.log(`  ✗ ${e.lang}${e.admin ? ' (admin)' : ''} — ${!e.aperto ? 'l\'hamburger non apre il cassetto' : 'allargando, il cassetto resta aperto'}`);
}
console.log(`  ${allargatiRossi.length ? '✗' : '✓'} ${allargati.length} volte, allargando la finestra, il cassetto aperto si chiude da solo`);

const tot = rossi.length + cassettiRossi.length + allargatiRossi.length;
console.log(tot ? `\n${tot} cose non tornano.` : '\nIl menu si raggiunge sempre in un modo solo, non copre niente e si chiude quando deve. ✓');
process.exit(tot ? 1 : 0);
