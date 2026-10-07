// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Collaudo dei MODULI DI SCELTE DEI PEZZI dello Studio (player, conti, treno,
// boss, muro e gli altri): gira in un browser vero; dove Chromium non c'e' (sul
// server) si salta da solo.
//
// Il difetto che l'ha fatto nascere: i campi del muro delle emote non si
// riempivano mai con le scelte salvate. L'elenco dei moduli da riempire era
// scritto a mano, a parte dall'elenco dei pezzi, e il muro era entrato nel
// secondo e non nel primo. Bastava toccare un campo qualunque del muro, anche
// solo l'ombra, e il salvataggio automatico mandava una bozza di zeri e
// caselle spente: niente emote di Twitch ne' di 7TV, niente movimenti. Il muro
// smetteva di funzionare, e nessuno capiva perche'.
//
// La regola che qui si misura, per OGNI modulo che c'e', senza un elenco da
// tenere aggiornato: rileggere un modulo appena riempito restituisce la stessa
// bozza. Se un campo non si riempie, o si riempie con un valore che non si
// rilegge uguale, la bozza cambia senza che nessuno abbia toccato niente.
// E la stessa regola con una scelta salvata prima che esistessero i campi
// nuovi: quello che manca prende il valore di serie, a ogni livello, e non uno
// zero letto da un campo vuoto.
//
// Uso: node scripts/verifica-campi-pezzi.mjs              (esce 1 se un modulo cambia la bozza da solo)
//      node scripts/verifica-campi-pezzi.mjs --selftest   (rompe e pretende il rosso)
const APP = 'src/web/public/app.js';
const ROTTURE = [
  [APP, "    const salvato = (stato?.streamer?.settings || {})[e.cfg];", "    const salvato = impostazioni()[e.cfg];",
    'il pannello legge le scelte da un elenco che non ha tutti i pezzi'],
  [APP, "        : (el.type === 'number' || el.type === 'range' || typeof _viaDi(c, via) === 'number') ? Number(el.value) : el.value;",
    "        : (el.type === 'number' || el.type === 'range') ? Number(el.value) : el.value;",
    'una tendina con valori numerici si rilegge come testo'],
  [APP, "    for (const k of new Set([...document.querySelectorAll('[data-cfg]')].map((n) => n.dataset.cfg))) riempiCfgForm(k);\n",
    "    for (const k of ['musica', 'timer', 'pubblicita', 'tempi', 'treno', 'bit', 'boss', 'arena', 'scritta', 'etichetta']) riempiCfgForm(k);\n",
    'un modulo resta fuori dall\'elenco di quelli da riempire'],
  [APP, "  for (const k of Object.keys(su)) out[k] = _unisci(base[k], su[k]);", "  for (const k of Object.keys(su)) out[k] = su[k];",
    'una scelta salvata prima dei campi nuovi li lascia vuoti'],
];
if (process.argv.includes('--selftest')) {
  const { execFileSync } = await import('node:child_process');
  const fsx = await import('node:fs');
  const pathx = await import('node:path');
  const { fileURLToPath: fu } = await import('node:url');
  const io = fu(import.meta.url);
  const rad = pathx.join(pathx.dirname(io), '..');
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
    const via = pathx.join(rad, file);
    const orig = fsx.readFileSync(via, 'utf8');
    if (!orig.includes(da)) { console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`); cieche++; continue; }
    fsx.writeFileSync(via, orig.replace(da, a));
    let rosso = false;
    try { execFileSync(process.execPath, [io], { cwd: rad, encoding: 'utf8', stdio: 'pipe' }); } catch { rosso = true; }
    fsx.writeFileSync(via, orig);
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche ? `\n${cieche} rotture non viste.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

import { apriSito, apriBrowser } from './_sito.mjs';

const b = await apriBrowser();
if (!b) { console.log('Chromium non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }
const sito = await apriSito({});
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const rotture = [];
p.on('pageerror', (e) => rotture.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); } catch {} });
await p.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('alert'); });
await p.waitForFunction(() => document.querySelectorAll('#ap-stage .ap-el').length > 4, null, { timeout: 20000 });
await p.waitForTimeout(500);

// Per ogni modulo: la bozza, e la bozza riletta dal modulo cosi' come si vede.
// I campi vuoti si contano a parte, per dire quali sono.
const giro = () => p.evaluate(() => {
  const out = [];
  for (const k of new Set([...document.querySelectorAll('[data-cfg]')].map((n) => n.dataset.cfg))) {
    const prima = JSON.stringify(_cfgEl(k));
    const vuoti = _campiCfg(k).filter((el) => el.type !== 'checkbox' && !('insieme' in el.dataset) && !('lista' in el.dataset) && el.value === '' && _viaDi(_cfgEl(k), el.dataset.c.split('.')) !== '').map((el) => el.dataset.c);
    const dopo = JSON.stringify(leggiCfgDalForm(k));
    const diversi = [];
    const a = JSON.parse(prima), d = JSON.parse(dopo);
    const confronta = (x, y, via) => {
      if (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x)) { for (const c of new Set([...Object.keys(x), ...Object.keys(y)])) confronta(x[c], y[c], via ? via + '.' + c : c); return; }
      if (JSON.stringify(x) !== JSON.stringify(y)) diversi.push(`${via}: ${JSON.stringify(x)} → ${JSON.stringify(y)}`);
    };
    confronta(a, d, '');
    out.push({ k, vuoti, diversi });
  }
  return out;
});

const prove = [];
const vero = (nome, ok, avuto = '') => prove.push({ nome, ok: !!ok, avuto });
const moduli = await giro();
vero('lo Studio ha i suoi moduli di scelte (almeno dieci)', moduli.length >= 10, moduli.map((m) => m.k).join(' '));
for (const m of moduli) {
  vero(`«${m.k}»: ogni campo mostra il valore che il pezzo ha`, !m.vuoti.length, 'vuoti: ' + m.vuoti.join(', '));
  vero(`«${m.k}»: rileggere il modulo appena riempito non cambia niente`, !m.diversi.length, m.diversi.slice(0, 4).join(' · '));
}

// Dal disco al pannello: per ogni pezzo, una scelta salvata si vede nel suo
// modulo. Si salva l'interruttore rovesciato, e il modulo lo deve mostrare.
const daDisco = await p.evaluate(() => {
  const out = [];
  for (const k of new Set([...document.querySelectorAll('[data-cfg]')].map((n) => n.dataset.cfg))) {
    const cfg = ELEM(k) && ELEM(k).cfg;
    const campo = _campiCfg(k).find((el) => el.dataset.c === 'attivo');
    if (!cfg || !campo) { out.push({ k, ok: false, perche: 'senza interruttore' }); continue; }
    const voluto = !_cfgEl(k).attivo;
    stato.streamer.settings[cfg] = { ...(stato.streamer.settings[cfg] || {}), attivo: voluto };
    _bozzaEl = {};
    riempiCfgForm(k);
    out.push({ k, ok: campo.checked === voluto, perche: `salvato ${voluto}, mostrato ${campo.checked}` });
  }
  return out;
});
for (const d of daDisco) vero(`«${d.k}»: quello che e' salvato si vede nel modulo`, d.ok, d.perche);

// Una scelta del muro salvata prima che esistessero i campi nuovi: quello che
// c'e' resta, quello che manca prende il valore di serie, anche dentro.
await p.evaluate(() => {
  stato.streamer.settings.overlayMuro = { attivo: true, grandezza: 12, combo: { attivo: true, soglia: 7 }, esplosioni: { quante: 15 } };
  _bozzaEl = {};
  riempiCfgForm('muro');
});
// La bozza stessa, prima di qualunque campo: e' lei che si salva. Un campo
// rimasto pieno da un riempimento di prima nasconderebbe il buco.
const bozza = await p.evaluate(() => { const c = _cfgEl('muro'); return { massimo: c.combo.massimo, passo: c.combo.passo, contatore: c.combo.contatore, eg: c.esplosioni.grandezza, soglia: c.combo.soglia, quante: c.esplosioni.quante }; });
vero('la bozza di un muro salvato prima ha i campi nuovi di serie, anche dentro', bozza.massimo === 300 && bozza.passo === 12 && bozza.contatore === true && bozza.eg === 0 && bozza.soglia === 7 && bozza.quante === 15, JSON.stringify(bozza));
const vecchio = await p.evaluate(() => {
  const c = leggiCfgDalForm('muro');
  return { grandezza: c.grandezza, soglia: c.combo.soglia, quante: c.esplosioni.quante, massimo: c.combo.massimo, passo: c.combo.passo, contatore: c.combo.contatore, eg: c.esplosioni.grandezza, opacita: c.opacita, gira: c.gira, twitch: c.fonti.twitch, settetv: c.fonti.settetv, animazioni: c.animazioni.length };
});
vero('un muro salvato prima tiene le sue scelte', vecchio.grandezza === 12 && vecchio.soglia === 7 && vecchio.quante === 15, JSON.stringify(vecchio));
vero('e i campi nuovi prendono il valore di serie, non lo zero di un campo vuoto', vecchio.massimo === 300 && vecchio.passo === 12 && vecchio.contatore === true && vecchio.eg === 0 && vecchio.opacita === 100 && vecchio.gira === true, JSON.stringify(vecchio));
vero('le emote di Twitch e di 7TV restano accese, e i movimenti tutti', vecchio.twitch === true && vecchio.settetv === true && vecchio.animazioni === 10, JSON.stringify(vecchio));

await b.close();
sito.chiudi();

console.log('\nI moduli di scelte dei pezzi mostrano quello che il pezzo ha.\n');
let verde = true;
for (const x of prove) {
  console.log(`  ${x.ok ? '✓' : '✗'} ${x.nome}${x.ok ? '' : ` — ${x.avuto}`}`);
  verde = x.ok && verde;
}
if (rotture.length) { console.log(`  ✗ errori di pagina: ${rotture.join(' · ')}`); verde = false; }
else console.log('  ✓ nessun errore di pagina');
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
