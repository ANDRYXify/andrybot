// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// DA OGNI SCHEDA SI ARRIVA ALLE SORELLE, CON UNA BARRA SOLA E SENZA RIPETERE IL MENU.
//
// Il primo difetto: la barra che fa saltare da una scheda a quella accanto
// c'era in sei gruppi su nove (docs/SORELLE.md). Il secondo, nato dal
// rimedio al primo (docs/MENU.md): la barra dei fratelli del gruppo stava
// anche sul computer, dove il menu di lato mostra le stesse voci, e si
// impilava sopra la barra delle parti della pagina. Ripetizione, e due barre
// uguali una sopra l'altra.
//
// LE REGOLE, misurate aprendo il pannello su ogni scheda, sul computer e sul
// telefono:
//   · in testata al massimo UNA barra visibile;
//   · sul computer nessuna barra ripete le voci del menu che si vede accanto;
//   · una pagina con le sue parti mostra le parti, non le sorelle;
//   · le parti di una famiglia (Il bot, Discord) hanno la loro barra ovunque;
//   · sul telefono, dove il menu e' chiuso, le altre schede hanno la barra
//     delle sorelle, e la barra nomina la scheda in cui sei;
//   · Stato sta da sola, senza barra;
//   · cliccando una sorella ci si arriva, e cambiare parte non fa rientrare
//     le carte (un movimento solo).
//
// L'elenco delle schede lo dice il pannello (`pannello('…')`), non il cancello.
// Fuori dal conto: le schede da admin e lo Studio Web, nascosto (5437e2f).
//
// Uso: node scripts/verifica-sorelle.mjs   (--selftest rimette la barra del
// gruppo sul computer e pretende il rosso)
import './_dati-usa-e-getta.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apriSito, apriBrowser } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');

const SELFTEST = process.argv.includes('--selftest');
const esiti = [];
const chiedi = (ok, t) => { esiti.push({ ok: !!ok, t }); console.log((ok ? '  ✓ ' : '  ✗ ') + t); };

const FUORI = new Set(['admin', 'avatar', 'promo', 'studio']);
const DA_SOLE = new Set(['stato']);
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const schede = [...new Set([...APP.matchAll(/pannello\('([a-z0-9-]+)'/g)].map((m) => m[1]))].filter((s) => !FUORI.has(s));
const conParti = new Set([...APP.slice(APP.indexOf('const SOTTO_SCHEDE = {'), APP.indexOf('\n};', APP.indexOf('const SOTTO_SCHEDE = {'))).matchAll(/^ {2}([a-z]+): \{$/gm)].map((m) => m[1]));
const famiglie = new Function(`return (${APP.slice(APP.indexOf('const FAMIGLIE = [') + 17, APP.indexOf('\n];', APP.indexOf('const FAMIGLIE = [')) + 2)});`)();
const inFamiglia = new Set(famiglie.flatMap((f) => f.parti));

const sito = await apriSito({});
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
const guai = [];

async function apri(vista) {
  const pg = await br.newPage({ viewport: vista, reducedMotion: 'reduce' });
  pg.on('pageerror', (e) => guai.push('pageerror: ' + e.message));
  await pg.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'networkidle' });
  await pg.click('#cookie-ok').catch(() => {});
  await pg.addStyleTag({ content: '.giro-velo,.giro-fumetto,.giro-carta,#cookie-banner{display:none!important}' });
  if (SELFTEST) await pg.addStyleTag({ content: '.fam-barra.dal-gruppo{display:flex!important}' });
  await pg.waitForTimeout(600);
  return pg;
}

async function vai(pg, s) {
  await pg.evaluate((x) => window.vaiAScheda(x), s);
  await pg.waitForFunction((x) => !!document.querySelector(`.pannello-scheda.visibile[data-scheda="${x}"]`), s, { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(140);
}

const barre = (pg) => pg.evaluate(() => [...document.querySelectorAll('.pagina-testata > .fam-barra')]
  .filter((b) => b.getClientRects().length)
  .map((b) => ({ parti: !!b.id, voci: [...b.querySelectorAll('.fam-scheda')].map((x) => (x.dataset.scheda || x.dataset.sotto)), nomi: [...b.querySelectorAll('.fam-scheda')].map((x) => x.textContent.trim()) })));
const menuVisibile = (pg) => pg.evaluate(() => [...document.querySelectorAll('#nav-drawer .drawer-voce')]
  .filter((b) => b.getClientRects().length).map((b) => b.textContent.trim()));

try {
  chiedi(schede.length >= 30, `schede da controllare: ${schede.length}`);
  for (const [nome, vista, telefono] of [['computer', { width: 1280, height: 1000 }, false], ['telefono', { width: 390, height: 844 }, true]]) {
    const pg = await apri(vista);
    const piu = [], ripete = [], senza = [], sbagliate = [];
    for (const s of schede) {
      await vai(pg, s);
      const b = await barre(pg);
      if (b.length > 1) piu.push(`${s} (${b.length})`);
      if (!telefono) {
        const menu = new Set(await menuVisibile(pg));
        for (const x of b) if (!x.parti && x.nomi.length && x.nomi.every((n) => menu.has(n))) ripete.push(s);
      }
      const una = b[0];
      if (DA_SOLE.has(s)) { if (b.length) sbagliate.push(`${s} ha una barra`); continue; }
      if (conParti.has(s)) { if (!una?.parti) sbagliate.push(`${s} senza le sue parti`); continue; }
      if (inFamiglia.has(s) || telefono) {
        if (!una) senza.push(s);
        else if (una.voci.length < 2 || !una.voci.includes(s)) sbagliate.push(`${s}: la barra non porta da nessuna parte o non nomina se stessa`);
      } else if (una) sbagliate.push(`${s} ha una barra che sul computer non serve`);
    }
    chiedi(!piu.length, piu.length ? `${nome}: piu' di una barra in ${piu.join(', ')}` : `${nome}: al massimo una barra in ogni scheda`);
    if (!telefono) chiedi(!ripete.length, ripete.length ? `${nome}: la barra ripete il menu in ${ripete.join(', ')}` : `${nome}: nessuna barra ripete il menu che si vede accanto`);
    chiedi(!senza.length, senza.length ? `${nome}: senza la barra che serve: ${senza.join(', ')}` : `${nome}: ogni scheda che ne ha bisogno porta alle sorelle`);
    chiedi(!sbagliate.length, sbagliate.length ? `${nome}: ${sbagliate.slice(0, 6).join(' · ')}` : `${nome}: le parti dove ci sono le parti, Stato da sola`);

    const [da, a] = telefono ? ['emote', 'alert'] : ['personalita', 'conoscenza'];
    await vai(pg, da);
    await pg.click(`.pagina-testata > .fam-barra:not([id]) .fam-scheda[data-scheda="${a}"]`).catch(() => {});
    await pg.waitForTimeout(400);
    const dove = await pg.evaluate(() => document.querySelector('.pannello-scheda.visibile')?.dataset.scheda || '');
    chiedi(dove === a, `${nome}: cliccando una sorella ci si arriva (${da} → ${dove})`);

    await vai(pg, 'giochi');
    const parte = await pg.$$eval('#sotto-giochi .fam-scheda:not(.on)', (n) => n[0]?.dataset.sotto || '');
    await pg.click(`#sotto-giochi .fam-scheda[data-sotto="${parte}"]`).catch(() => {});
    const rientrano = await pg.evaluate(() => [...document.querySelectorAll('.pannello-scheda.visibile .carta')]
      .filter((c) => c.getClientRects().length && c.classList.contains('rivela') && !c.classList.contains('dentro')).length);
    chiedi(!!parte && rientrano === 0, `${nome}: cambiando parte nessuna carta rientra (${rientrano})`);
    await pg.close();
  }
  chiedi(!guai.length, guai.length ? guai.slice(0, 2).join(' · ') : 'e il browser non si e\' lamentato');
} finally {
  await br.close();
  sito.chiudi();
}

const rossi = esiti.filter((x) => !x.ok).length;
console.log('\n' + (rossi ? 'cancello ROSSO ✗' : 'Una barra sola, dove serve, e mai il menu ripetuto. ✓'));
process.exit(rossi ? 1 : 0);
