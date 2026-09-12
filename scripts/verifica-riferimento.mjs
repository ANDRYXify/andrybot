// Cancello dell'IMMAGINE DI RIFERIMENTO sotto la tela dello Studio.
//
// La promessa: uno screenshot della scena messo sotto la tela resta nel
// browser (torna dopo una ricarica, con la sua trasparenza), si regola, si
// nasconde, si toglie, e non lascia mai il computer di chi lo ha messo.
//
//   node scripts/verifica-riferimento.mjs                 → esce 1 se qualcosa non torna
//   node scripts/verifica-riferimento.mjs --selftest       → rompe e pretende il rosso
//   node scripts/verifica-riferimento.mjs --selftest=parola → solo le rotture che la contengono
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apriSito, apriBrowser } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROTTURE = [
  ['src/web/public/app.js', "  await _rifScrivi(_rif.id, { blob, op: _rif.op, on: true });\n", '',
    "l'immagine non si ricorda: ricaricando la pagina sparisce"],
  ['src/web/public/app.js', "  strato.style.opacity = String(_rif.op / 100);\n", '',
    "la trasparenza scelta non arriva sull'immagine"],
];

const _selftest = process.argv.find((a) => a === '--selftest' || a.startsWith('--selftest='));
if (_selftest) {
  const io = fileURLToPath(import.meta.url);
  const filtro = _selftest.includes('=') ? _selftest.slice(_selftest.indexOf('=') + 1) : '';
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
    if (filtro && !che.includes(filtro)) continue;
    const via = join(RAD, file);
    const orig = readFileSync(via, 'utf8');
    if (!orig.includes(da)) { console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`); cieche++; continue; }
    writeFileSync(via, orig.replace(da, a));
    let rosso = false, uscita = '';
    try { uscita = execFileSync(process.execPath, [io], { cwd: RAD, encoding: 'utf8', stdio: 'pipe' }); } catch (e) { rosso = true; uscita = String(e.stdout || ''); }
    writeFileSync(via, orig);
    if (/saltato: manca Chromium/.test(uscita)) { console.log('  ✗  senza Chromium l\'autoprova non prova niente'); process.exit(1); }
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: il cancello non protegge quello che dice di proteggere.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const browser = await apriBrowser();
if (!browser) { console.log('  –  saltato: manca Chromium o Playwright'); process.exit(0); }
const { base, chiudi } = await apriSito({});
try {
  const ed = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  const errori = [];
  ed.on('pageerror', (e) => errori.push(String(e.message || e)));
  const richieste = [];
  ed.on('request', (r) => { if (r.method() !== 'GET') richieste.push({ url: r.url(), n: (r.postData() || '').length }); });
  const apri = async () => {
    await ed.goto(base + '/?demo=1&lang=it', { waitUntil: 'domcontentloaded' });
    await ed.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
    await ed.evaluate(() => window.SB_APP.vai('alert'));
    await ed.waitForFunction(() => typeof aggiornaAnteprima === 'function' && document.getElementById('ap-riferimento'), null, { timeout: 20000 });
    await attesa(800);
  };
  const strato = () => ed.evaluate(() => {
    const s = document.getElementById('ap-riferimento');
    return { hidden: s.hidden, blob: /^url\("blob:/.test(s.style.backgroundImage), opacita: getComputedStyle(s).opacity, comandi: !document.getElementById('ovl-rif-op').hidden };
  });
  await apri();
  const prima = await strato();
  dice(prima.hidden && !prima.blob && !prima.comandi, 'senza immagine lo strato non c\'e\' e i comandi restano nascosti');

  await ed.evaluate(async (b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    await _rifMetti(new Blob([u8], { type: 'image/png' }));
  }, PNG);
  await attesa(300);
  const messa = await strato();
  dice(!messa.hidden && messa.blob && messa.opacita === '0.6' && messa.comandi, `messa: lo strato mostra l'immagine (blob) a trasparenza 60 e i comandi compaiono — ${JSON.stringify(messa)}`);

  // si ricorda APPENA messa, prima di toccare qualsiasi altro comando: ricaricando
  // torna da sola (chi la salva solo al primo ritocco della trasparenza qui e' rosso)
  await apri();
  await ed.waitForFunction(() => { const s = document.getElementById('ap-riferimento'); return !s.hidden && /blob:/.test(s.style.backgroundImage); }, null, { timeout: 6000 }).catch(() => {});
  const appena = await strato();
  dice(!appena.hidden && appena.blob && appena.opacita === '0.6', `appena messa si ricorda: ricaricando la pagina torna com'era (60) — ${JSON.stringify(appena)}`);

  await ed.evaluate(() => { const r = document.getElementById('ovl-rif-op'); r.value = '30'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); });
  await attesa(300);
  dice((await strato()).opacita === '0.3', 'il cursore cambia la trasparenza (30)');

  await ed.evaluate(() => { const c = document.getElementById('ovl-rif-on'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); });
  await attesa(200);
  dice((await strato()).hidden, '«Mostra» spento nasconde l\'immagine senza toglierla');
  await ed.evaluate(() => { const c = document.getElementById('ovl-rif-on'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  await attesa(300);

  const rifiuto = await ed.evaluate(async () => _rifMetti(new Blob(['ciao'], { type: 'text/plain' })));
  dice(rifiuto === false && (await strato()).blob, 'un file che non e\' un\'immagine viene rifiutato e quella di prima resta');

  await apri();
  await ed.waitForFunction(() => { const s = document.getElementById('ap-riferimento'); return !s.hidden && /blob:/.test(s.style.backgroundImage); }, null, { timeout: 6000 }).catch(() => {});
  const tornata = await strato();
  dice(!tornata.hidden && tornata.blob && tornata.opacita === '0.3', `ricaricando la pagina l'immagine torna, con la sua trasparenza (30) — ${JSON.stringify(tornata)}`);

  await ed.evaluate(() => document.getElementById('ovl-rif-via').click());
  await attesa(400);
  dice((await strato()).hidden && !(await strato()).comandi, '«Togli» la toglie e nasconde i comandi');
  await apri();
  await attesa(1200);
  const dopo = await strato();
  dice(dopo.hidden && !dopo.blob, 'tolta, ricaricando non torna');

  const grosse = richieste.filter((r) => r.n > 2000);
  dice(grosse.length === 0, 'l\'immagine non lascia il browser: nessuna richiesta al server porta un corpo grande quanto un\'immagine', grosse.map((r) => r.url + ' (' + r.n + ')').join(' | '));
  dice(errori.length === 0, 'la pagina non ha errori', errori.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  chiudi();
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} ${rossi.length === 1 ? 'cosa non torna' : 'cose non tornano'}: l'immagine di riferimento non fa quello che promette.` : '\nL\'immagine di riferimento resta nel browser e fa quello che promette. ✓');
process.exit(rossi.length ? 1 : 0);
