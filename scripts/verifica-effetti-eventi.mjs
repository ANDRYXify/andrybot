// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Collaudo degli EFFETTI PER GLI EVENTI nel pannello — gira in un browser vero.
//
// Il motore lo provano le prove senza browser (effetti-eventi.test); qui si
// pretende quello che si vede e si tocca (docs/EFFETTI-SCHERMO.md):
//  · la scheda Effetti ha quattro parti, e la carta degli eventi sta nella sua;
//  · «Usalo per un evento» porta l'effetto scelto, col suo suono, in un livello
//    nuovo, apre la parte e il foglio giusti e lascia la pagina da salvare;
//  · l'editor di un livello è lo stesso dei pronti: cambiare effetto cambia il
//    titolo del foglio e la riga «Così»;
//  · due livelli con lo stesso numero non si salvano; corretti, si salvano e
//    tornano uguali a una nuova lettura, in ordine;
//  · uno dei tuoi effetti al posto di uno pronto; la pausa resta nei suoi limiti;
//  · l'interruttore nel titolo accende senza aprire;
//  · al computer lo Studio dice quale effetto parte, il suo link apre il foglio,
//    e dal foglio si torna all'alert giusto, aperto da solo; la ricerca porta
//    alla parte degli eventi;
//  · niente scorre di lato e la pagina non ha errori, al telefono e al computer.
//
// Uso: node scripts/verifica-effetti-eventi.mjs              (esce 1 se qualcosa non torna)
//      node scripts/verifica-effetti-eventi.mjs --selftest   (i tasti non segnano la pagina da salvare: deve uscire rosso)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apriSito, chromiumQui } from './_sito.mjs';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(RAD, 'src/web/public/app.js');
const SELFTEST = process.argv.includes('--selftest');

// Prima si guarda se il browser c'e', e solo dopo si rompe qualcosa: sul
// server non c'e', e li' il collaudo (anche l'autoprova) si salta con 0.
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
const DIFESA = "  segnaDaSalvare(document.getElementById('ee-salva'));\n}";
if (SELFTEST) {
  if (!originale.includes(DIFESA)) { console.log('  ✗ non trovo la difesa da togliere'); process.exit(1); }
  console.log('  tolgo: i cambi fatti coi tasti che segnano la pagina da salvare\n');
  fs.writeFileSync(APP, originale.replace(DIFESA, '}'));
}
const ripristina = () => { if (SELFTEST) fs.writeFileSync(APP, originale); };
process.on('exit', ripristina);

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
const rotture = [];

async function apri(larg, alt, nome) {
  const p = await b.newPage({ viewport: { width: larg, height: alt } });
  p.on('pageerror', (e) => rotture.push(`${nome}: ${e.message}`));
  await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); localStorage.setItem('cookie-ok', '1'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  await p.evaluate(() => window.SB_APP.vai('effetti'));
  await p.waitForFunction(() => document.querySelectorAll('#ee-fogli details[data-ee]').length === 7 && document.querySelectorAll('#pronti-galleria .pronti-voce').length === 8, null, { timeout: 20000 });
  await p.waitForTimeout(300);
  return p;
}
const parte = (p) => p.evaluate(() => document.querySelector('.sotto-barra .on')?.dataset.sotto || '');
const foglio = (p, ev) => p.evaluate((e) => {
  const d = document.querySelector(`#ee-fogli details[data-ee="${e}"]`);
  return { aperto: !!d?.open, resa: d?.querySelector('[data-ee-resa]')?.textContent || '', cosi: d?.querySelector('[data-ee-cosi]')?.textContent || '',
    livelli: [...(d?.querySelectorAll('.ee-livello') || [])].map((l) => l.querySelector('[data-ee-nome]')?.textContent || ''),
    acceso: !!d?.querySelector('[data-ee-on]')?.checked };
}, ev);
const salvato = (p) => p.evaluate(() => JSON.parse(JSON.stringify(_demoScritture.effettiEventi || null)));

for (const [larg, alt, nome] of [[390, 844, 'telefono'], [1280, 900, 'computer']]) {
  const p = await apri(larg, alt, nome);

  const parti = await p.evaluate(() => [...document.querySelectorAll('.sotto-barra [data-sotto]')].map((x) => x.dataset.sotto));
  const vista = await p.evaluate(() => ({ pronti: !document.getElementById('pronti-carta').closest('[hidden]'), eventi: !document.getElementById('eventi-effetti-carta').closest('[hidden]') }));
  dice(parti.join() === 'tuoi,eventi,punti,webcam' && vista.pronti && !vista.eventi, `${nome}: la scheda Effetti ha quattro parti, e si apre su «I tuoi effetti» (pronti sì, eventi no)`, JSON.stringify({ parti, vista }));

  // «Usalo per un evento»: le stelle col suono «tada», sui bit
  await p.evaluate(() => { document.querySelector('#pronti-galleria [data-pronto="stelle"]').click(); });
  await p.waitForTimeout(150);
  await p.evaluate(() => { const s = document.getElementById('pronti-suono'); s.value = 'tada'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.evaluate(() => document.querySelector('[data-pronti-evento="cheer"]').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await p.click('[data-pronti-evento="cheer"]');
  await p.waitForTimeout(900);
  const dopo = await foglio(p, 'cheer');
  const cima = await p.evaluate(() => document.querySelector('#ee-fogli details[data-ee="cheer"] > summary').getBoundingClientRect().top);
  const terzo = await p.evaluate(() => { const l = _ee.voci.cheer.livelli[2]; return l && { nome: l.effetto.disegno?.nome, suono: l.effetto.disegno?.suono, da: l.da }; });
  const sporco = await p.evaluate(() => _salvaSporco);
  dice(await parte(p) === 'eventi' && dopo.aperto && terzo?.nome === 'stelle' && terzo.suono === 'tada' && terzo.da === 5000,
    `${nome}: «Usalo per un evento» mette le stelle col loro suono in un livello nuovo dei bit (da 5.000), e apre parte e foglio`, JSON.stringify({ parte: await parte(p), dopo, terzo }));
  dice(cima >= 0 && cima < alt * 0.5, `${nome}: il titolo del foglio arriva in alto, non sotto la piega`, `top=${Math.round(cima)}`);
  dice(sporco === true, `${nome}: la pagina resta da salvare`, `_salvaSporco=${sporco}`);
  dice(/Stelle da 5\.000 bit/.test(dopo.resa) && /da 5\.000 bit «Stelle»/.test(dopo.cosi), `${nome}: il titolo e la riga «Così» dicono il livello nuovo`, `${dopo.resa} | ${dopo.cosi}`);

  // l'editor del livello è quello dei pronti: la neve al posto delle stelle
  await p.evaluate(() => { _salvaSporco = false; document.querySelector('#ee-fogli details[data-ee="cheer"] [data-ee-gal] [data-pronto="neve"]').click(); });
  await p.waitForTimeout(200);
  const neve = await foglio(p, 'cheer');
  const doppi = await p.evaluate(() => ({ id: document.querySelectorAll('[id="pronti-durata"]').length, ee: document.querySelectorAll('[id="ee-cheer-2-durata"]').length }));
  dice(/Neve da 5\.000 bit/.test(neve.resa) && neve.livelli[2] === 'Neve' && await p.evaluate(() => _salvaSporco) === true,
    `${nome}: nel livello si cambia effetto con la stessa galleria, e il foglio lo dice subito`, JSON.stringify(neve));
  dice(doppi.id === 1 && doppi.ee === 1, `${nome}: due editor nella pagina, ognuno coi suoi id`, JSON.stringify(doppi));

  // due livelli dallo stesso numero: non si salva
  const primaDi = await salvato(p);
  await p.evaluate(() => { const i = document.querySelector('[data-ee-da="cheer"][data-i="2"]'); i.value = '1000'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(150);
  const avviso = (await foglio(p, 'cheer')).cosi;
  await p.click('#ee-salva');
  await p.waitForTimeout(400);
  dice(/stesso numero/.test(avviso) && JSON.stringify(await salvato(p)) === JSON.stringify(primaDi), `${nome}: due livelli dallo stesso numero si vedono e non si salvano`, avviso);

  // corretti, si salvano in ordine e tornano uguali
  await p.evaluate(() => { const i = [...document.querySelectorAll('[data-ee-da="cheer"]')].find((x) => x.value === '1000' && _ee.voci.cheer.livelli[Number(x.dataset.i)].effetto.disegno?.nome === 'neve'); i.value = '250'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(150);
  await p.evaluate(() => { const x = document.getElementById('ee-pausa-cheer'); x.value = '9999'; x.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.click('#ee-salva');
  await p.waitForTimeout(500);
  const s1 = await salvato(p);
  const ordine = s1?.voci?.cheer?.livelli?.map((l) => `${l.da}:${l.effetto.disegno?.nome}`);
  dice(ordine?.join() === '100:coriandoli,250:neve,1000:fuochi' && s1.voci.cheer.pausa === 600 && await p.evaluate(() => _salvaSporco) === false,
    `${nome}: corretti, i livelli si salvano in ordine, la pausa resta nei limiti e la pagina non è più da salvare`, JSON.stringify({ ordine, pausa: s1?.voci?.cheer?.pausa }));
  await p.evaluate(() => caricaEventiEffetti());
  await p.waitForTimeout(400);
  const riletto = await p.evaluate(() => _ee.voci.cheer.livelli.map((l) => `${l.da}:${l.effetto.disegno?.nome}`));
  dice(riletto.join() === ordine?.join(), `${nome}: a una nuova lettura tornano uguali`, riletto.join());
  const conStudio = await p.evaluate(() => stato.streamer.settings.effettiEventi?.voci?.cheer?.livelli?.length);
  dice(conStudio === 3, `${nome}: le impostazioni del pannello (quelle che legge lo Studio) sono aggiornate`, String(conStudio));

  // uno dei tuoi effetti
  await p.evaluate(() => { _eeApri('raid', false); });
  await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('[data-ee-aggiungi="raid"]').click());
  await p.waitForTimeout(200);
  await p.evaluate(() => { const r = document.querySelector('[data-ee-tipo="raid"][data-i="0"][value="mio"]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(200);
  const scelte = await p.evaluate(() => [...document.querySelectorAll('[data-ee-mio="raid"] option')].map((o) => o.value).filter(Boolean));
  await p.evaluate((c) => { const s = document.querySelector('[data-ee-mio="raid"]'); s.value = c; s.dispatchEvent(new Event('change', { bubbles: true })); }, scelte[0]);
  await p.click('#ee-salva');
  await p.waitForTimeout(400);
  const raid = (await salvato(p))?.voci?.raid;
  dice(scelte.length > 0 && raid?.attivo === true && raid.livelli[0]?.effetto?.tipo === 'mio' && raid.livelli[0].effetto.comando === scelte[0] && (await foglio(p, 'raid')).resa.includes('!' + scelte[0]),
    `${nome}: uno dei tuoi effetti al posto di uno pronto, e il foglio lo dice`, JSON.stringify(raid));

  // l'interruttore nel titolo accende senza aprire
  await p.evaluate(() => { document.querySelectorAll('#ee-fogli details[open]').forEach((d) => { d.open = false; }); });
  await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelector('#ee-fogli details[data-ee="sub"] > summary').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await p.click('#ee-fogli details[data-ee="sub"] > summary .rg-on');
  await p.waitForTimeout(200);
  const sub = await foglio(p, 'sub');
  dice(sub.acceso && !sub.aperto && /senza un effetto/.test(sub.resa), `${nome}: l'interruttore nel titolo accende senza aprire, e il titolo lo dice`, JSON.stringify(sub));

  const largo = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  dice(largo <= 0, `${nome}: niente scorre di lato`, `${largo}px`);

  if (nome === 'computer') {
    await p.evaluate(() => usaPerEvento('regalo', { tipo: 'pronto', disegno: _prontiDisegno('palloncini'), volume: 80 }));
    await p.waitForTimeout(400);
    await p.click('#ee-salva');
    await p.waitForTimeout(300);
    await p.evaluate(() => window.SB_APP.vai('alert'));
    await p.waitForFunction(() => document.querySelector('[data-al-effetto="cheer"]'), null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const righe = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-al-effetto]')].map((x) => [x.dataset.alEffetto, x.textContent.replace(/\s+/g, ' ').trim()])));
    dice(/Neve da 250 bit/.test(righe.cheer || '') && /Abbonamenti regalati: Palloncini da 1 regalato/.test(righe.sub || '') && !/Abbonamenti:/.test(righe.sub || '') && /!/.test(righe.raid || '') && /Nessun effetto/.test(righe.donazione || ''),
      'computer: nello Studio ogni alert dice quale effetto parte (gli abbonamenti anche dei regali)', JSON.stringify(righe));
    await p.evaluate(() => document.querySelector('[data-ee-vai="cheer"]').click());
    await p.waitForTimeout(1500);
    const torna = { scheda: await p.evaluate(() => schedaAttiva), parte: await parte(p), aperto: (await foglio(p, 'cheer')).aperto };
    dice(torna.scheda === 'effetti' && torna.parte === 'eventi' && torna.aperto, 'computer: il link dello Studio apre la parte e il foglio dei bit', JSON.stringify(torna));
    await p.evaluate(() => document.querySelector('[data-ee-studio="cheer"]').click());
    await p.waitForTimeout(2000);
    const st = await p.evaluate(() => ({ scheda: schedaAttiva, sel: selezione, aperti: [...document.querySelectorAll('.asp-blocco[data-asp="alert"] > details.insp-grp[open]')].map((d) => d.dataset.grp) }));
    dice(st.scheda === 'alert' && st.sel === 'alert' && st.aperti.length === 1 && /^Bit/.test(st.aperti[0]), 'computer: dal foglio si torna allo Studio con l\'alert dei bit scelto e aperto, da solo', JSON.stringify(st));
    const cercato = await p.evaluate(async () => {
      window.SB_CERCA.apri();
      const inp = document.getElementById('cerca-input');
      inp.value = 'Effetti per gli eventi';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((x) => setTimeout(x, 300));
      document.querySelector('#cerca-overlay .cerca-voce')?.click();
      await new Promise((x) => setTimeout(x, 2500));
      const c = document.getElementById('eventi-effetti-carta').getBoundingClientRect();
      return { scheda: schedaAttiva, visto: c.height > 0 && c.top < innerHeight && c.bottom > 0 };
    });
    dice(cercato.scheda === 'effetti' && await parte(p) === 'eventi' && cercato.visto, 'computer: la ricerca porta alla parte «Per gli eventi», con la carta davanti', JSON.stringify(cercato));
  }
  await p.close();
}

await b.close();
await chiudiSito();

for (const e of esiti) console.log(`  ${e.ok ? '✓' : '✗'} ${e.msg}${e.ok ? '' : `\n      ${e.extra}`}`);
if (rotture.length) console.log('  ✗ errori nella pagina:\n      ' + rotture.join('\n      '));
const rossi = esiti.filter((e) => !e.ok).length + (rotture.length ? 1 : 0);
if (SELFTEST) {
  ripristina();
  console.log(rossi ? '\nAutoprova: senza la difesa, una modifica fatta coi tasti non segna la pagina da salvare, e si vede. ✓\n' : '\nautoprova ROSSA ✗: senza la difesa il collaudo non se ne accorge\n');
  process.exit(rossi ? 0 : 1);
}
console.log(rossi ? `\n${rossi} cose non tornano.` : '\nTutto torna.');
process.exit(rossi ? 1 : 0);
