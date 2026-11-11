// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL MENU SU MISURA, PROVATO COI GESTI (docs/MENU.md, «Il menu su misura»).
//
// La funzione pura la prova il contratto (test/contratto/menu-misura.test.mjs).
// Qui si apre il pannello e si fa quello che fa una persona: la stella accanto
// al titolo, la carta «Menu su misura», l'occhio, le frecce, la barra in basso
// del telefono, le righe fitte, il ritorno al menu di serie. E si guarda il
// menu che ne esce, non le scelte salvate.
//
// LE PROMESSE:
//   · senza scelte il menu e' quello di fabbrica, voce per voce;
//   · la stella mette la pagina fra le mie, in cima, e la lascia nel suo gruppo;
//   · l'occhio toglie una voce dal menu e la mette in «Nascoste»; aprirla
//     apre «Nascoste», non la perde;
//   · le frecce cambiano l'ordine dei gruppi e delle voci;
//   · con le righe fitte il menu con un gruppo da sette aperto sta in 768;
//   · «tutti aperti» apre tutti i gruppi;
//   · sul telefono la barra in basso mostra le voci scelte piu' «Altro», larga
//     quanto lo schermo, e la carta non allarga la pagina;
//   · «Rimetti il menu di serie» riporta tutto com'era.
//
// Uso: node scripts/verifica-menu-misura.mjs [--foto <cartella>]
//      --selftest serve un app.js rotto in sei modi e pretende sei rossi.
import './_dati-usa-e-getta.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apriSito, apriBrowser } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const SELFTEST = process.argv.includes('--selftest');
const iFoto = process.argv.indexOf('--foto');
const FOTO = iFoto > 0 ? process.argv[iFoto + 1] : '';

// Le rotture: [nome, testo da togliere, testo al suo posto]. Ognuna toglie una
// promessa sola, e il giro deve accorgersene.
const ROTTURE = [
  ['la stella non aggiunge', "s.mie = cera ? s.mie.filter((x) => x !== voce) : s.mie.concat([voce]);", 's.mie = s.mie.filter((x) => x !== voce);'],
  ['le nascoste restano nel menu', "gruppi: interi.map((g) => ({ ...g, schede: g.schede.filter(([id]) => !via.has(id)) })).filter((g) => g.schede.length),", 'gruppi: interi,'],
  ['l\'ordine scelto non conta', 'const out = scelta.filter((x) => fabbrica.includes(x));', 'const out = [];'],
  ['le righe fitte non stringono', "document.body.classList.toggle('menu-fitto', con && menuMio().righe === 'fitte');", "document.body.classList.toggle('menu-fitto', false);"],
  ['la barra ignora le scelte', 'const scelte = menuMio().barra.filter((id) => !schedaNonUsabile(id));', 'const scelte = [];'],
  ['il menu di serie non torna', 'menuCambia((s) => { for (const k of Object.keys(s)) delete s[k]; });', 'menuCambia(() => {});'],
];

const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); process.exit(0); }

async function giro(rottura, dice) {
  const guai = [];
  const chiedi = (ok, t) => { if (!ok) guai.push(t); dice(!!ok, t); };
  let sorgente = APP;
  if (rottura) {
    if (!APP.includes(rottura[1])) { guai.push('la rottura non trova piu\' il suo testo'); return guai; }
    sorgente = APP.replace(rottura[1], rottura[2]);
  }
  const sito = await apriSito({ rotte: (req, res, q) => {
    if (!rottura || q !== '/app.js') return false;
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }); res.end(sorgente); return true;
  } });
  const apri = async (vista) => {
    const pg = await br.newPage({ viewport: vista, reducedMotion: 'reduce' });
    pg.on('pageerror', (e) => guai.push('pageerror: ' + e.message));
    await pg.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'networkidle' });
    await pg.click('#cookie-ok').catch(() => {});
    await pg.addStyleTag({ content: '.giro-velo,.giro-fumetto,.giro-carta,#cookie-banner{display:none!important}' });
    return pg;
  };
  const vai = async (pg, id) => {
    await pg.evaluate((x) => window.SB_APP.vai(x), id);
    await pg.waitForFunction((x) => window.SB_APP.schedaAttiva === x && !!document.querySelector(`#nav-drawer .drawer-voce.on[data-scheda="${x}"]`)
      && !!document.querySelector('#pagina-testata h1 #pt-mia'), id, { timeout: 5000 });
  };
  const menu = (pg) => pg.evaluate(() => ({
    mie: [...document.querySelectorAll('#nav-drawer .drawer-mie .drawer-voce')].map((b) => b.dataset.scheda),
    gruppi: [...document.querySelectorAll('#nav-drawer > .drawer-grp:not(.drawer-mie):not(.drawer-nascoste)')].map((g) => ({
      id: g.dataset.grp || '', aperto: !g.classList.contains('chiuso'), voci: [...g.querySelectorAll('.drawer-voce')].map((b) => b.dataset.scheda) })),
    nascoste: [...document.querySelectorAll('#nav-drawer .drawer-nascoste .drawer-voce')].map((b) => b.dataset.scheda),
    nascosteAperte: document.querySelector('#nav-drawer .drawer-nascoste .drawer-grp-tit')?.getAttribute('aria-expanded') === 'true',
    fitto: document.body.classList.contains('menu-fitto'),
    alto: document.getElementById('nav-drawer').parentElement.scrollHeight,
    spazio: document.getElementById('nav-drawer').parentElement.clientHeight,
  }));
  // Un gruppo che si apre o si chiude ci mette un momento: l'altezza del menu
  // si misura quando ha smesso di cambiare.
  const fermo = (pg) => pg.evaluate(() => new Promise((ok) => {
    const el = document.getElementById('nav-drawer').parentElement;
    let prima = -1, uguali = 0;
    const t = setInterval(() => { const h = el.scrollHeight; uguali = h === prima ? uguali + 1 : 0; prima = h; if (uguali >= 5) { clearInterval(t); ok(); } }, 60);
  }));
  const carta = async (pg) => {
    await pg.evaluate(() => document.getElementById('menu-sistema').click());
    await pg.waitForSelector('#carta-menu #menu-di-serie', { state: 'visible', timeout: 5000 });
  };
  const serie = async (pg) => {
    if (await pg.isDisabled('#menu-di-serie')) return;
    await pg.click('#menu-di-serie');
    await pg.click('#menu-serie-si');
  };
  const foto = async (pg, nome) => { if (FOTO && !rottura) await pg.screenshot({ path: join(FOTO, nome + '.png') }); };

  try {
    const d = await apri({ width: 1366, height: 768 });
    const fabbrica = await d.evaluate(() => window.SB_APP.gruppi.map((g) => ({ id: g.id, voci: g.schede.map((s) => s[0]) })));
    const tutte = fabbrica.flatMap((g) => g.voci);
    const m0 = await menu(d);
    chiedi(JSON.stringify(m0.gruppi.flatMap((g) => g.voci)) === JSON.stringify(tutte) && !m0.mie.length && !m0.nascoste.length,
      `senza scelte il menu e' quello di fabbrica (${tutte.length} voci)`);
    chiedi(await d.isVisible('#menu-sistema'), 'in fondo al menu c\'e\' «Sistema il menu»');

    await vai(d, 'subathon');
    await d.click('#pt-mia');
    const m1 = await menu(d);
    chiedi(m1.mie.join() === 'subathon' && (await d.getAttribute('#pt-mia', 'aria-pressed')) === 'true', 'la stella accanto al titolo mette la pagina fra le mie');
    chiedi(m1.gruppi.find((g) => g.id === 'diretta')?.voci.includes('subathon'), 'e la pagina resta anche nel suo gruppo');
    chiedi((await d.evaluate(() => document.querySelector('#pagina-testata h1').getAttribute('aria-label'))) === 'Subathon', 'il titolo si legge ancora «Subathon» e basta');
    await foto(d, 'computer-stella');

    await carta(d);
    chiedi(await d.evaluate(() => window.SB_APP.schedaAttiva === 'account'), '«Sistema il menu» porta alla carta «Menu su misura»');
    await d.click('#menu-misura [data-mm="mia"][data-id="clip"]');
    await d.click('#menu-misura [data-mm="mie"][data-id="clip"][data-passo="-1"]');
    const m2 = await menu(d);
    chiedi(m2.mie.join() === 'clip,subathon', 'dalla carta: una voce fra le mie, e le frecce le mettono in ordine');

    await d.click('#menu-misura [data-mm="nascosta"][data-id="consolify"]');
    const m3 = await menu(d);
    chiedi(m3.nascoste.join() === 'consolify' && !m3.gruppi.some((g) => g.voci.includes('consolify')), 'l\'occhio toglie la voce dal menu e la mette in «Nascoste»');
    chiedi(!m3.nascosteAperte, '«Nascoste» sta chiusa');
    await vai(d, 'consolify');
    chiedi((await menu(d)).nascosteAperte, 'aprire una voce nascosta apre «Nascoste»: non si perde');
    chiedi(!(await d.isVisible('#menu-misura [data-mm="nascosta"][data-id="stato"]').catch(() => false)), 'Stato non si puo\' nascondere');

    await carta(d);
    const prima = (await menu(d)).gruppi.map((g) => g.id);
    await d.click('#menu-misura [data-mm="gruppo"][data-id="difesa"][data-passo="-1"]');
    await d.click('#menu-misura [data-mm="voce"][data-id="regia"][data-passo="1"]');
    const m4 = await menu(d);
    const dopo = m4.gruppi.map((g) => g.id);
    chiedi(dopo.indexOf('difesa') === prima.indexOf('difesa') - 1 && dopo.indexOf('scena') === prima.indexOf('scena') + 1, 'le frecce spostano un gruppo');
    chiedi(m4.gruppi.find((g) => g.id === 'diretta')?.voci.slice(0, 2).join() === 'studio,regia', 'e una voce dentro il suo gruppo');
    chiedi([...m4.gruppi.flatMap((g) => g.voci), ...m4.nascoste].sort().join() === tutte.slice().sort().join(), 'nessuna voce si e\' persa ne\' doppiata');
    await foto(d, 'computer-carta');

    await serie(d);
    const m5 = await menu(d);
    chiedi(JSON.stringify(m5.gruppi.flatMap((g) => g.voci)) === JSON.stringify(tutte) && !m5.mie.length && !m5.nascoste.length && (await d.isDisabled('#menu-di-serie')),
      '«Rimetti il menu di serie» riporta tutto com\'era');

    await vai(d, 'giochi');
    await fermo(d);
    const comode = await menu(d);
    await carta(d);
    await d.selectOption('#menu-righe', 'fitte');
    await vai(d, 'giochi');
    await fermo(d);
    const fitte = await menu(d);
    chiedi(fitte.fitto && fitte.gruppi.find((g) => g.id === 'gioca')?.aperto && fitte.alto <= fitte.spazio + 1,
      `righe fitte: il menu con un gruppo da 7 aperto sta in 768 (${fitte.alto} px su ${fitte.spazio}; comode ${comode.alto})`);
    await foto(d, 'computer-fitte');

    await carta(d);
    await d.selectOption('#menu-righe', 'comode');
    await d.selectOption('#menu-modo', 'tutti');
    const m6 = await menu(d);
    chiedi(m6.gruppi.every((g) => g.aperto), '«tutti aperti» apre tutti i gruppi');
    await serie(d);
    await d.close();

    const t = await apri({ width: 390, height: 844 });
    const barra = () => t.evaluate(() => [...document.querySelectorAll('#barra-giu .bg-voce')].map((b) => {
      const r = b.getBoundingClientRect();
      return { id: b.dataset.scheda || 'altro', da: Math.round(r.left), a: Math.round(r.right) };
    }));
    const b0 = await barra();
    chiedi(b0.length === 5 && b0[0].id === 'stato' && b0[4].id === 'altro', 'telefono: senza scelte la barra in basso e\' quella di serie');
    await t.click('#barra-giu [data-apri-menu]');
    await carta(t);
    await t.selectOption('#menu-misura [data-mm-posto="0"]', 'monete');
    await t.selectOption('#menu-misura [data-mm-posto="1"]', 'regia');
    const b1 = await barra();
    chiedi(b1.map((x) => x.id).join() === 'monete,regia,altro', 'telefono: la barra mostra le voci scelte, e «Altro» c\'e\' sempre');
    chiedi(b1.length > 0 && b1[0].da <= 1 && b1[b1.length - 1].a >= 389 && b1.every((x) => x.a - x.da >= 44), 'la barra e\' larga quanto lo schermo, e ogni tasto si prende col pollice');
    chiedi(await t.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'la carta non allarga la pagina a 390');
    await foto(t, 'telefono-carta');
    await t.click('#barra-giu [data-scheda="monete"]');
    chiedi(await t.evaluate(() => window.SB_APP.schedaAttiva === 'monete'), 'e un tasto della barra porta alla sua pagina');
    await foto(t, 'telefono-barra');
    await t.close();
  } catch (e) {
    guai.push('il giro si e\' fermato: ' + String(e.message).split('\n')[0]);
    dice(false, 'il giro si e\' fermato: ' + String(e.message).split('\n')[0]);
  }
  sito.chiudi();
  return guai;
}

if (SELFTEST) {
  let cieche = 0;
  for (const r of ROTTURE) {
    const guai = await giro(r, () => {});
    const vista = guai.length > 0 && !guai.some((g) => g.startsWith('la rottura non trova'));
    console.log((vista ? '  ✓  ' : '  ✗  ') + r[0] + (vista ? `  → rosso (${guai[0]})` : '  → PASSA INOSSERVATO' + (guai[0] ? ` (${guai[0]})` : '')));
    if (!vista) cieche++;
  }
  await br.close();
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}.` : "\nOgni rottura e' vista. ✓");
  process.exit(cieche ? 1 : 0);
}

console.log('\nIl menu su misura, coi gesti.\n');
const guai = await giro(null, (ok, t) => console.log((ok ? '  ✓ ' : '  ✗ ') + t));
await br.close();
if (guai.length) { console.log(`\n${guai.length} ${guai.length === 1 ? 'cosa non torna' : 'cose non tornano'}.`); for (const g of guai) console.log('  ✗ ' + g); process.exit(1); }
console.log('\ncancello verde ✓');
