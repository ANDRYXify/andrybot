// Cancello delle OCCASIONI dell'overlay.
//
// La promessa e' una frase sola: «i miei overlay ce li ho, ma stasera e'
// subathon e voglio anche questo». Un'occasione e' un pacchetto di DIFFERENZE
// sopra l'overlay di tutti i giorni: la accendi e compare, la spegni e torna
// tutto com'era.
//
// Il difetto da cui questo cancello guarda non e' «non compare». E' il
// contrario, ed e' peggio: che modificare l'occasione ti cambi l'overlay di
// tutti i giorni. Uno se ne accorge la sera dopo, in diretta, quando la scena
// non e' piu' quella. Per questo qui non si guarda se l'aggiunta si vede: si
// prende l'IMPRONTA della scena di tutti i giorni prima, si fa tutto il giro
// (crea, cambia, accendi, spegni, elimina) e si pretende la stessa impronta
// identica alla fine.
//
//   node scripts/verifica-occasioni.mjs              → esce 1 se qualcosa non torna
//   node scripts/verifica-occasioni.mjs --selftest   → rompe e pretende il rosso
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apriSito, apriBrowser } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = 'src/web/public/app.js';

const ROTTURE = [
  [APP, "function _ovXY() { const oc = _occAttuale(); if (!oc) return _baseXY(); return (oc.xy = oc.xy || {}); }",
        "function _ovXY() { return _baseXY(); }",
   "spostare dentro l'occasione sposta l'overlay di tutti i giorni"],
  [APP, "  if (!_occAttuale()) ov.mostra = _mostraOra();",
        "  ov.mostra = _mostraOra();",
   "salvare con un'occasione aperta la cuoce dentro la base"],
  [APP, "  if (_differisce(k, si)) d[k] = !!si; else delete d[k];",
        "  d[k] = !!si;",
   "l'occasione si tiene differenze che non differiscono da niente"],
  [APP, "          ${_occMini(m.mostra, m.diff)}\n",
        "",
   "i modelli si scelgono alla cieca, senza anteprima"],
  [APP, "    if (!nom) { if (ce(vis, e)) ombre.push(",
        "    if (true) { if (ce(vis, e)) ombre.push(",
   "l'anteprima non fa venire avanti quello che il modello cambia"],
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
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

const browser = await apriBrowser();
if (!browser) { console.log('  –  saltato: manca Chromium o Playwright'); process.exit(0); }

const { base, chiudi } = await apriSito();
const errori = [];
const p = await browser.newPage({ viewport: { width: 1500, height: 980 } });
p.on('pageerror', (e) => errori.push(String(e.message || e)));

await p.goto(base + '/?demo=1', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.evaluate(() => window.SB_APP.vai('alert'));
await p.waitForSelector('#ovl-occ-quale', { timeout: 20000 });
await p.waitForFunction(() => document.querySelectorAll('.ovl-liv').length > 0, null, { timeout: 20000 });

// L'IMPRONTA della scena: ogni livello con il suo nome, il suo stato e la sua
// posizione, piu' dove stanno davvero gli elementi sulla tela. E' quello che
// l'utente vede: se torna identica, non si e' perso niente.
const impronta = () => p.evaluate(() => {
  const liv = [...document.querySelectorAll('.ovl-liv')].map((b) => [
    b.dataset.liv,
    b.classList.contains('via') ? 'via' : 'qui',
    b.querySelector('.ovl-liv-corpo span')?.textContent.trim() || '',
  ].join('|'));
  const el = [...document.querySelectorAll('#ap-stage .ap-el')].map((n) => {
    const s = n.style;
    return [n.id, n.hidden ? 'no' : 'si', s.left || '', s.top || '', s.transform || ''].join('|');
  });
  return JSON.stringify({ liv, el });
});

const tendina = (id, v) => p.evaluate(([i, x]) => {
  const s = document.getElementById(i);
  s.value = x;
  s.dispatchEvent(new Event('change', { bubbles: true }));
}, [id, v]);

const quiete = () => p.waitForTimeout(350);

// La scena si POSA: gli elementi nascono vuoti e si riempiono, e finche' non
// hanno la loro misura la posizione che dichiarano non e' ancora quella vera.
// Misurare prima vorrebbe dire confrontare due momenti diversi e chiamarlo
// difetto. Qui si aspetta che l'impronta smetta di cambiare.
async function posata() {
  let a = await impronta();
  for (let i = 0; i < 12; i++) {
    await p.waitForTimeout(300);
    const b = await impronta();
    if (b === a) return b;
    a = b;
  }
  return a;
}

const PRIMA = await posata();

// ── 1. i MODELLI si guardano prima di sceglierli ────────────────────────────
await p.click('#ovl-occ-nuova');
await p.waitForSelector('.occ-galleria', { timeout: 10000 });
const galleria = await p.evaluate(() => {
  const mod = [...document.querySelectorAll('.occ-modello')];
  return mod.map((m) => ({
    nome: m.querySelector('strong')?.textContent.trim() || '',
    dice: (m.querySelector('strong ~ span')?.textContent || '').trim(),
    effetto: (m.querySelector('.occ-eff')?.textContent || '').trim(),
    ombre: m.querySelectorAll('.occ-mini .occ-o').length,
    targhe: m.querySelectorAll('.occ-mini .occ-c').length,
    cambia: m.querySelectorAll('.occ-mini .occ-c.piu, .occ-mini .occ-c.via').length,
    vuoto: !!m.querySelector('.occ-mini .occ-vuoto'),
  }));
});
dice(galleria.length >= 4, `i modelli sono ${galleria.length}`, galleria.map((g) => g.nome).join(', '));
dice(galleria.every((g) => g.targhe > 0 || g.vuoto), 'ogni modello ha un\'anteprima con dentro qualcosa',
  galleria.map((g) => `${g.nome}: ${g.targhe} targhette, ${g.ombre} in ombra`).join(' · '));
dice(galleria.every((g) => g.nome && g.dice), 'ogni modello dice come si chiama e cosa fa');
// La scena che hai gia' fa da OMBRA, e quello che il modello nomina viene
// avanti: se venisse avanti tutto sarebbe la pila di rettangoli illeggibile di
// prima, e se non venisse avanti niente il modello non direbbe piu' cosa fa.
dice(galleria.every((g) => g.ombre > 0), 'la scena che hai gia\' fa da ombra',
  galleria.map((g) => g.ombre).join(' / '));
dice(galleria.some((g) => g.cambia > 0), 'almeno un modello mostra un cambiamento vero, segnato',
  galleria.map((g) => `${g.nome}: ${g.cambia}`).join(' · '));
dice(galleria.every((g) => g.effetto), 'ogni modello dice cosa cambierebbe su questo overlay',
  galleria.map((g) => `${g.nome}: ${g.effetto}`).join(' · '));

await p.click('.occ-modello[data-mod="0"]');
const nome1 = await p.inputValue('#occ-nome');
await p.click('[data-mdl="ok"]');
await p.waitForSelector('#ovl-occ-fascia:not([hidden])', { timeout: 10000 });
await quiete();

// ── 2. l'occasione si apre per MODIFICARLA, non va in onda da sola ──────────
const dopoCrea = await p.evaluate(() => ({
  fascia: !document.getElementById('ovl-occ-fascia').hidden,
  nome: document.getElementById('ovl-occ-nome').textContent.trim(),
  dice: document.getElementById('ovl-occ-dice').textContent.trim(),
  onda: document.getElementById('ovl-occ-on').checked,
  tag: [...document.querySelectorAll('.ovl-liv-tag')].map((t) => t.textContent.trim()),
}));
dice(dopoCrea.fascia && dopoCrea.nome === nome1, 'la fascia dice su cosa stai lavorando', dopoCrea.nome);
dice(!dopoCrea.onda, 'sceglierla non la manda in onda: e\' un gesto a parte');
dice(dopoCrea.dice.length > 0, 'la fascia dice cosa cambia', dopoCrea.dice);

// ── 3. una differenza che non differisce non e' una differenza ──────────────
// si toglie un livello e si rimette: il segno deve sparire, non restare. E
// intanto si guarda che togliere dentro un'occasione lasci la riga li', segnata:
// e' un cambiamento dell'occasione, e va disfatto dov'e' successo.
const primoLiv = await p.evaluate(() => document.querySelector('.ovl-liv:not(.via)')?.dataset.liv || '');
const tagDi = (k) => p.evaluate((x) => {
  const b = document.querySelector(`.ovl-liv[data-liv="${CSS.escape(x)}"]`);
  return b ? (b.querySelector('.ovl-liv-tag')?.textContent.trim() || '') : null;
}, primoLiv || k);
await p.click(`.ovl-liv[data-liv="${primoLiv}"] [data-occhio]`);
await quiete();
const tagSpento = await tagDi(primoLiv);
await p.click(`.ovl-liv[data-liv="${primoLiv}"] [data-occhio]`);
await quiete();
const tagTornato = await tagDi(primoLiv);
dice(!!tagSpento, 'togliere un livello nell\'occasione si vede sul livello', `«${tagSpento}»`);
dice(tagTornato === '', 'rimetterlo com\'era toglie la differenza, non ne aggiunge un\'altra', `«${tagTornato}»`);

// e SPOSTARE dentro un'occasione: la posizione nuova e' dell'occasione, non
// dell'overlay di tutti i giorni. E' il gesto che si fa di piu', ed e' quello in
// cui il danno sarebbe silenzioso.
// si preme sul NOME, dove preme una persona: il centro della riga e' il lucchetto
await p.click(`.ovl-liv[data-liv="${primoLiv}"] .ovl-liv-corpo strong`);
await quiete();
await p.evaluate(() => {
  const x = document.getElementById('insp-x');
  x.value = '11.5';
  x.dispatchEvent(new Event('input', { bubbles: true }));
  x.dispatchEvent(new Event('change', { bubbles: true }));
});
await quiete();
const tagMosso = await tagDi(primoLiv);
dice(/spostato|moved|movido/.test(tagMosso), 'spostare dentro l\'occasione si vede sul livello', `«${tagMosso}»`);

// ── 4. una sola accesa ──────────────────────────────────────────────────────
await p.click('#ovl-occ-on');
await quiete();
await tendina('ovl-occ-quale', '');
await quiete();
await p.click('#ovl-occ-nuova');
await p.waitForSelector('.occ-galleria', { timeout: 10000 });
await p.click('.occ-modello[data-mod="1"]');
await p.click('[data-mdl="ok"]');
await p.waitForSelector('#ovl-occ-fascia:not([hidden])', { timeout: 10000 });
await p.click('#ovl-occ-on');
await quiete();
const accese = await p.evaluate(() => [...document.querySelectorAll('#ovl-occ-quale option')]
  .filter((o) => o.value && /in onda|on air|en directo/.test(o.textContent)).map((o) => o.textContent.trim()));
dice(accese.length === 1, `in onda ce n'e' una sola (${accese.length})`, accese.join(' · '));

// ── 5. SPEGNERE NON PERDE NIENTE ────────────────────────────────────────────
// si spegne, si eliminano tutte, e l'overlay di tutti i giorni deve essere
// esattamente quello di prima.
await p.click('#ovl-occ-on');
await quiete();
for (let giro = 0; giro < 4; giro++) {
  const ce = await p.evaluate(() => [...document.querySelectorAll('#ovl-occ-quale option')].filter((o) => o.value).map((o) => o.value));
  if (!ce.length) break;
  await tendina('ovl-occ-quale', ce[0]);
  await quiete();
  await p.click('#ovl-occ-via');
  await p.waitForSelector('[data-mdl="si"]', { timeout: 10000 });
  await p.click('[data-mdl="si"]');
  await quiete();
}
const DOPO = await posata();
// se e' cambiata, si dice COSA: un cancello che dice solo «no» fa perdere un'ora
const scarto = (() => {
  if (DOPO === PRIMA) return '';
  const a = JSON.parse(PRIMA), b = JSON.parse(DOPO);
  const righe = [];
  for (const k of ['liv', 'el']) {
    const n = Math.max(a[k].length, b[k].length);
    for (let i = 0; i < n; i++) if (a[k][i] !== b[k][i]) righe.push(`${a[k][i] || '(niente)'} → ${b[k][i] || '(niente)'}`);
  }
  return righe.slice(0, 6).join(' ; ');
})();
dice(DOPO === PRIMA, 'l\'overlay di tutti i giorni e\' tornato identico a prima', scarto);

dice(errori.length === 0, `errori di pagina: ${errori.length}`, errori.slice(0, 3).join(' | '));

await p.close();
await chiudi();
await browser.close();

let rotti = 0;
for (const e of esiti) {
  console.log(`  ${e.ok ? '✓' : '✗'}  ${e.msg}${e.extra ? '  — ' + e.extra : ''}`);
  if (!e.ok) rotti++;
}
console.log(rotti ? `\n${rotti} ${rotti === 1 ? 'cosa non torna' : 'cose non tornano'}.` : '\ncancello verde ✓');
process.exit(rotti ? 1 : 0);
