// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello della PAGINA DIETRO IL PANNELLO (docs/STRUMENTI.md, «La pagina dietro
// il pannello»), in un browser vero, sulla demo, al telefono e al computer.
//
// Le promesse che solo il pannello acceso puo' mostrare:
//  · con «Apre la sua pagina» il link del pannello non si scrive: finche' la
//    pagina non e' pubblicata non c'e' (niente da copiare, e la lista dei
//    problemi lo dice), dopo e' l'indirizzo della pagina e basta;
//  · la freccina segue il link, per costruzione: c'e' solo sui pannelli che
//    portano da qualche parte, in ogni momento;
//  · la pagina nasce piena di quello che il pannello promette: il Programma
//    apre l'editor col pezzo «Il mio programma», e l'anteprima mostra i giorni;
//  · «Sostienimi» porta alle donazioni: non ha la scelta della pagina;
//  · al telefono, con l'editor aperto dentro i pannelli, niente scorre di lato.
//
// Uso: node scripts/verifica-pannelli-pagina.mjs             (esce 1 se una promessa non tiene)
//      node scripts/verifica-pannelli-pagina.mjs --selftest  (rimette tre difetti nel pannello:
//                                                            freccina su ogni pannello, pagina che
//                                                            nasce vuota, link scritto a mano anche
//                                                            con la pagina; li vuole tutti rossi)

import { apriSito, apriBrowser } from './_sito.mjs';

const SELFTEST = process.argv.includes('--selftest');
const SCHERMI = [[1440, 950], [390, 844]];
const DIFETTI = [
  ['freccia: st.freccia === true && !!_panLink(v)', 'freccia: st.freccia === true'],
  ['LP.partenza = { headline: v.titolo || PAN_TIPI()[v.tipo], blocchi: _panPaginaDiPartenza(v) };', 'LP.partenza = null;'],
  ["const _panLink = (v) => (v.pagina ? (PAN_STATO.dati?.pagine?.[v.id] || '') : (v.link || ''));", "const _panLink = (v) => (v.link || '');"],
];

const sito = await apriSito();
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
const rotte = [], guai = [];
let difettiMessi = 0;
const dice = (ok, cosa) => { if (!ok) { console.log(`  ✗ ${cosa}`); rotte.push(cosa); } return ok; };

const voce = (p, tipo) => p.evaluate((t) => PAN_STATO.serie.voci.findIndex((v) => v.tipo === t), tipo);
const frecce = (p) => p.evaluate(async () => {
  const P = window.SB_PANNELLI, viste = [];
  const prima = P.disegna;
  P.disegna = (ctx, o) => { viste.push({ titolo: o.titolo, freccia: o.freccia === true }); return prima(ctx, o); };
  try { await panRifai(); } finally { P.disegna = prima; }
  return PAN_STATO.serie.voci.map((v, i) => ({ id: v.id, tipo: v.tipo, pagina: !!v.pagina, link: v.link || '', freccia: viste[i]?.freccia }));
});
const clic = (p, sel) => p.evaluate((s) => { const b = document.querySelector(s); if (b) b.click(); return !!b; }, sel);

try {
  for (const [W, H] of SCHERMI) {
    const dove = `${W}px`;
    const p = await br.newPage({ viewport: { width: W, height: H } });
    p.on('pageerror', (e) => guai.push(e.message));
    if (SELFTEST) {
      await p.route(/\/app\.js(\?|$)/, async (route) => {
        const r = await route.fetch();
        let t = await r.text();
        for (const [da, a] of DIFETTI) if (t.includes(da)) { t = t.replace(da, a); difettiMessi++; }
        await route.fulfill({ response: r, body: t });
      });
    }
    await p.addInitScript(() => {
      window.__copiati = [];
      try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (x) => { window.__copiati.push(x); } }, configurable: true }); } catch { /* resta quella vera */ }
    });
    await p.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
    await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('pannelli'); });
    await p.waitForFunction(() => document.querySelectorAll('#pan-voci .pan-voce').length > 2 && document.querySelectorAll('#pan-vista canvas').length > 2, null, { timeout: 20000 });
    await p.evaluate(() => document.querySelectorAll('.giro-velo, .giro-carta').forEach((x) => x.remove()));

    const iProg = await voce(p, 'programma');
    const iDona = await voce(p, 'dona');
    if (!dice(iProg >= 0, `${dove}: fra i pannelli pronti non c'e' il Programma`)) { await p.close(); continue; }
    const id = await p.evaluate((i) => PAN_STATO.serie.voci[i].id, iProg);
    const indirizzo = `https://socialbot.live/u/andryxify/p/${id}`;
    const sel = (i) => `#pan-voci [data-pan-i="${i}"]`;

    if (iDona >= 0) {
      const scelta = await p.evaluate((s) => !!document.querySelector(`${s} [data-pan-azione="dove-pagina"]`), sel(iDona));
      dice(!scelta, `${dove}: «Sostienimi» offre la sua pagina, ma porta gia' alle donazioni`);
    }

    await p.evaluate((s) => { const d = document.querySelector(s); d.open = true; }, sel(iProg));
    await p.evaluate(() => { const f = document.getElementById('pan-freccia'); if (f && !f.checked) f.click(); });
    await clic(p, `${sel(iProg)} [data-pan-azione="dove-pagina"]`);
    await p.waitForTimeout(250);
    const prima = await p.evaluate(({ s, i }) => {
      const v = document.querySelector(s);
      return {
        campoLink: !!v.querySelector('input[data-pan-campo="link"]'),
        copia: v.querySelector('[data-pan-azione="copia-link"]')?.disabled,
        tasto: v.querySelector('[data-pan-azione="pagina"]')?.textContent.trim() || '',
        problema: [...document.querySelectorAll('#pan-problemi li')].some((li) => li.textContent.includes(PAN_STATO.serie.voci[i].titolo || 'Programma') && /non è ancora pubblicata/.test(li.textContent)),
      };
    }, { s: sel(iProg), i: iProg });
    dice(!prima.campoLink, `${dove}: con «Apre la sua pagina» c'e' ancora il campo per scrivere il link`);
    dice(prima.copia === true, `${dove}: a pagina non pubblicata «Copia il link» copia qualcosa (un link scritto a mano?)`);
    dice(/Prepara la pagina/.test(prima.tasto), `${dove}: il tasto per preparare la pagina dice «${prima.tasto}»`);
    dice(prima.problema, `${dove}: la lista dei problemi non dice che il Programma porta a una pagina non pubblicata`);
    for (const f of await frecce(p)) {
      const porta = f.pagina ? false : !!f.link;
      dice(f.freccia === porta, `${dove}: prima di pubblicare, la freccina di «${f.tipo}» e' ${f.freccia ? 'accesa' : 'spenta'} ma il pannello ${porta ? 'porta' : 'non porta'} da qualche parte`);
    }

    await clic(p, `${sel(iProg)} [data-pan-azione="pagina"]`);
    await p.waitForFunction(() => !document.getElementById('pan-pagina')?.hidden && document.querySelectorAll('#lp-box-pannello #lp-blocchi .lp-blocco').length > 0, null, { timeout: 20000 }).catch(() => null);
    const ed = await p.evaluate(() => ({
      aperta: !document.getElementById('pan-pagina')?.hidden,
      pezzi: [...document.querySelectorAll('#lp-box-pannello #lp-blocchi .lp-blocco strong')].map((x) => x.textContent.trim()),
      titolo: document.querySelector('#lp-box-pannello #lp-headline')?.value || '',
      largo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    dice(ed.aperta, `${dove}: «Prepara la pagina» non apre l'editor dentro i pannelli`);
    dice(ed.pezzi[0] === 'Il mio programma', `${dove}: la pagina del Programma non nasce col pezzo «Il mio programma» (${ed.pezzi.join(', ') || 'nessun pezzo'})`);
    dice(ed.titolo === 'Programma', `${dove}: la pagina non prende il titolo del pannello («${ed.titolo}»)`);
    dice(ed.largo <= 0, `${dove}: con l'editor aperto la pagina scorre di lato di ${ed.largo}px`);
    const giorni = await p.waitForFunction(() => {
      const f = document.querySelector('#lp-box-pannello #lp-iframe');
      const d = f?.contentDocument;
      return d && d.querySelectorAll('.prog-r').length > 0 ? d.querySelectorAll('.prog-r').length : 0;
    }, null, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => 0);
    dice(giorni > 0, `${dove}: nell'anteprima della pagina il programma non mostra i giorni in onda`);

    await clic(p, '#lp-salva');
    await p.waitForFunction(() => /Pubblicata/.test(document.getElementById('lp-esito')?.textContent || ''), null, { timeout: 15000 }).catch(() => null);
    await clic(p, '#pan-pagina-torna');
    await p.waitForFunction(() => document.getElementById('pan-pagina')?.hidden, null, { timeout: 15000 }).catch(() => null);
    await p.waitForTimeout(250);
    await p.evaluate((s) => { const d = document.querySelector(s); if (d) d.open = true; }, sel(iProg));
    await clic(p, `${sel(iProg)} [data-pan-azione="copia-link"]`);
    await p.waitForTimeout(150);
    const dopo = await p.evaluate(({ s, i }) => {
      const v = document.querySelector(s);
      return {
        chiusa: document.getElementById('pan-pagina')?.hidden,
        href: v?.querySelector('.pan-pagina-stato a')?.href || '',
        tasto: v?.querySelector('[data-pan-azione="pagina"]')?.textContent.trim() || '',
        copiato: window.__copiati.at(-1) || '',
        problema: [...document.querySelectorAll('#pan-problemi li')].some((li) => li.textContent.includes(PAN_STATO.serie.voci[i].titolo || 'Programma') && /non è ancora pubblicata/.test(li.textContent)),
      };
    }, { s: sel(iProg), i: iProg });
    dice(dopo.chiusa, `${dove}: «Torna ai pannelli» non chiude l'editor`);
    dice(dopo.href === indirizzo, `${dove}: pubblicata, il pannello dice che si apre «${dopo.href}» invece di ${indirizzo}`);
    dice(dopo.copiato === indirizzo, `${dove}: pubblicata, «Copia il link» copia «${dopo.copiato}» invece dell'indirizzo della pagina`);
    dice(/Modifica la pagina/.test(dopo.tasto), `${dove}: pubblicata, il tasto dice ancora «${dopo.tasto}»`);
    dice(!dopo.problema, `${dove}: pubblicata, la lista dei problemi dice ancora che non lo e'`);
    for (const f of await frecce(p)) {
      const porta = f.pagina ? f.id === id : !!f.link;
      dice(f.freccia === porta, `${dove}: dopo aver pubblicato, la freccina di «${f.tipo}» e' ${f.freccia ? 'accesa' : 'spenta'} ma il pannello ${porta ? 'porta' : 'non porta'} da qualche parte`);
    }

    await clic(p, `${sel(iProg)} [data-pan-azione="dove-link"]`);
    await p.waitForTimeout(200);
    const torna = await p.evaluate((s) => !!document.querySelector(`${s} input[data-pan-campo="link"]`), sel(iProg));
    dice(torna, `${dove}: tornando a «Porta a un indirizzo» il campo del link non torna`);
    await p.close();
  }
  dice(!guai.length, `la pagina ha errori: ${guai[0]}`);
} finally {
  await br.close();
  sito.chiudi();
}

if (SELFTEST) {
  const messi = difettiMessi === DIFETTI.length * SCHERMI.length;
  const freccia = rotte.some((r) => r.includes('prima di pubblicare, la freccina'));
  const vuota = rotte.some((r) => r.includes('non nasce col pezzo'));
  const link = rotte.some((r) => r.includes('Copia il link'));
  console.log(messi ? 'Autoprova: i tre difetti sono entrati nel pannello. ✓' : `Autoprova: entrati ${difettiMessi} difetti su ${DIFETTI.length * SCHERMI.length}: il pannello e' cambiato, aggiorna DIFETTI. ✗`);
  console.log(freccia ? 'Autoprova: la freccina su un pannello che non porta da nessuna parte si vede. ✓' : 'Autoprova: la freccina sbagliata NON e\' stata vista. ✗');
  console.log(vuota ? 'Autoprova: la pagina che nasce vuota si vede. ✓' : 'Autoprova: la pagina che nasce vuota NON e\' stata vista. ✗');
  console.log(link ? 'Autoprova: il link scritto a mano al posto della pagina si vede. ✓' : 'Autoprova: il link scritto a mano NON e\' stato visto. ✗');
  process.exit(messi && freccia && vuota && link ? 0 : 1);
}
console.log(rotte.length ? `\n${rotte.length} cose non tornano.` : '\nIl pannello con la sua pagina: link calcolato, freccina dove porta, pagina che nasce piena, al telefono e al computer. ✓');
process.exit(rotte.length ? 1 : 0);
