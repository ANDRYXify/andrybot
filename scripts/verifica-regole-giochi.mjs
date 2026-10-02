// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Collaudo della carta «LE REGOLE DI OGNI GIOCO» — gira in un browser vero.
//
// Le attese uguali per tutti i giochi si vedono solo in pagina: quali caselle
// compaiono e quali spariscono, cosa dice la riga sotto ogni gioco, e cosa
// resta dopo aver salvato. Le prove senza browser (regole-comuni.test,
// regole-giochi-pannello.test) dicono i conti e le frasi; qui si pretende che:
//  · spenta la regola per tutti, ogni gioco mostra le sue attese;
//  · accesa con un numero, un gioco che la segue nasconde le sue caselle delle
//    attese e dice che la segue, e la sua riga dice il tempo per tutti;
//  · con «Attese sue» le sue caselle tornano, e la riga dice il suo tempo;
//  · il boss non la segue mai, e lo dice;
//  · salvando, la regola per tutti e il gioco che fa a modo suo restano, e le
//    caselle del gioco hanno ancora i suoi valori (non quelli per tutti);
//  · niente scorre di lato, e la pagina non ha errori.
//
// Uso: node scripts/verifica-regole-giochi.mjs              (esce 1 se qualcosa non torna)
//      node scripts/verifica-regole-giochi.mjs --selftest   (le caselle non si nascondono piu': deve uscire rosso)

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
const DIFESA = '    if (propri) propri.hidden = segueOra && !suo;';
if (SELFTEST) {
  if (!originale.includes(DIFESA)) { console.log('  ✗ non trovo la difesa da togliere'); process.exit(1); }
  console.log('  tolgo: le caselle del gioco che si nascondono quando segue la regola per tutti\n');
  fs.writeFileSync(APP, originale.replace(DIFESA, '    if (propri) propri.hidden = false;'));
}
const ripristina = () => { if (SELFTEST) fs.writeFileSync(APP, originale); };
process.on('exit', ripristina);

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
const rotture = [];

for (const [larg, alt, nome] of [[390, 844, 'telefono'], [1280, 900, 'computer']]) {
  const p = await b.newPage({ viewport: { width: larg, height: alt } });
  p.on('pageerror', (e) => rotture.push(`${nome}: ${e.message}`));
  await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); localStorage.setItem('cookie-ok', '1'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  await p.evaluate(() => window.SB_APP.vai('giochi'));
  await p.waitForFunction(() => document.querySelector('[data-rg-dice="slot"]')?.textContent.length > 10, null, { timeout: 20000 });
  const stato = () => p.evaluate(() => {
    const vede = (sel) => { const el = document.querySelector(sel); return !!el && !el.closest('[hidden]') && !el.hidden; };
    return {
      slotPropri: vede('[data-rg-propri="slot"]'), slotSegue: vede('[data-rg-segue="slot"]'),
      bossPropri: vede('[data-rg-propri="boss"]'), bossSempre: vede('[data-rg-sempre="boss"]'),
      slotDice: document.querySelector('[data-rg-dice="slot"]').textContent,
      slotTesta: document.querySelector('[data-rg-g="slot"][data-rg-k="attesaTesta"]').value,
      tutti: document.querySelector('[data-rg-tutti-dice]').textContent,
      largo: document.documentElement.scrollWidth > innerWidth,
    };
  });
  const scrivi = async (sel, v) => { await p.fill(sel, String(v)); await p.dispatchEvent(sel, 'input'); };
  const spunta = async (sel, si) => { await p.evaluate(([s, x]) => { const el = document.querySelector(s); el.checked = x; el.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, si]); };

  let s = await stato();
  dice(s.slotPropri && !s.slotSegue, `${nome}: spenta, la slot mostra le sue attese`);
  dice(/Chi ha giocato aspetta 5 secondi/.test(s.slotDice), `${nome}: la riga della slot dice i suoi 5 secondi`, s.slotDice);

  await spunta('[data-rg-tutti="attivo"]', true);
  await scrivi('[data-rg-tutti="attesaTesta"]', 30);
  s = await stato();
  dice(!s.slotPropri && s.slotSegue, `${nome}: accesa, la slot nasconde le sue attese e dice che segue quelle di tutti`);
  dice(/Chi ha giocato aspetta 30 secondi/.test(s.slotDice), `${nome}: e la sua riga dice i 30 secondi di tutti`, s.slotDice);
  dice(/^Così, in tutti i giochi: chi ha giocato aspetta 30 secondi/.test(s.tutti), `${nome}: la riga in cima dice la regola per tutti`, s.tutti);
  dice(s.bossPropri && s.bossSempre, `${nome}: il boss tiene le sue attese, e lo dice`);

  await spunta('[data-rg-suo="slot"]', true);
  s = await stato();
  dice(s.slotPropri, `${nome}: con «Attese sue» la slot rimostra le sue caselle`);
  dice(/Chi ha giocato aspetta 5 secondi/.test(s.slotDice), `${nome}: e la sua riga torna ai suoi 5 secondi`, s.slotDice);
  dice(/Fa a modo suo: Slot machine\./.test(s.tutti), `${nome}: in cima si legge chi fa a modo suo`, s.tutti);

  await p.click('#btn-salva-regole-giochi');
  await p.waitForTimeout(400);
  s = await stato();
  const dopo = await p.evaluate(() => ({
    attivo: document.querySelector('[data-rg-tutti="attivo"]').checked,
    testa: document.querySelector('[data-rg-tutti="attesaTesta"]').value,
    suo: document.querySelector('[data-rg-suo="slot"]').checked,
  }));
  dice(dopo.attivo && dopo.testa === '30' && dopo.suo, `${nome}: salvando, la regola per tutti e la slot a modo suo restano`, JSON.stringify(dopo));
  dice(s.slotTesta === '5', `${nome}: e nella casella della slot c'e' ancora il suo valore, non quello per tutti`, s.slotTesta);
  dice(!s.largo, `${nome}: niente scorre di lato`);
  await p.close();
}
await b.close();
await chiudiSito();
dice(!rotture.length, 'la pagina non ha errori', rotture.slice(0, 3).join(' · '));

console.log('\nLe regole dei giochi: ognuna dove deve stare.\n');
for (const e of esiti) console.log(`  ${e.ok ? '✓' : '✗'} ${e.msg}${!e.ok && e.extra ? ` — ${e.extra}` : ''}`);
const verde = esiti.every((e) => e.ok);
if (SELFTEST) {
  ripristina();
  console.log(verde ? '\nautoprova ROSSA ✗: senza la difesa il collaudo non se ne accorge\n' : '\nAutoprova: senza la difesa le caselle del gioco restano lì anche quando segue la regola per tutti, e si vede. ✓\n');
  process.exit(verde ? 1 : 0);
}
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
