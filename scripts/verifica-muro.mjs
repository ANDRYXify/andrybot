// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Collaudo del MURO DELLE EMOTE nella pagina vera dell'overlay
// (docs/MURO-EMOTE.md). Gira in un browser vero; dove Chromium non c'e' (sul
// server) si salta da solo.
//
// Il difetto che misura per primo: dopo un po' di chat le emote delle combo
// restavano piantate sulla scena, senza esplodere mai. Nasce in un ordine
// preciso, e qui quell'ordine lo si crea apposta invece di sperare che capiti:
// con l'orologio della pagina fermo, la combo scade e il messaggio dopo arriva
// PRIMA del giro che le chiude. E' l'ordine che la chat fitta, o una sorgente
// di OBS nascosta coi timer rallentati, crea da sola.
//
// Poi le scelte della veste, ognuna guardata dove si vede: l'opacita' del
// muro, la rotazione nei fotogrammi, la grandezza delle esplosioni, il
// contatore e il tetto delle combo, e l'immagine nitida chiesta alla misura
// giusta. E il conto delle emote in volo, che deve restare uguale a quelle
// davvero in scena: un conto che deriva ferma il muro per sempre.
//
// Uso: node scripts/verifica-muro.mjs              (esce 1 se qualcosa non torna)
//      node scripts/verifica-muro.mjs --selftest   (rompe e pretende il rosso)
const MURO_JS = 'src/web/public/muro.js';
const OVL = 'src/web/public/overlay-app.js';
const ROTTURE = [
  [MURO_JS, "        const chiuse = chiudi(ts);\n        let v = stato.get(e.nome);\n", "        const chiuse = [];\n        let v = stato.get(e.nome);\n        if (v && ts - v.ultimo > finestra) { stato.delete(e.nome); v = null; }\n", 'il messaggio dopo la finestra cancella la combo in silenzio'],
  [OVL, "      for (const x of r.chiuse) chiudiCombo(x);\n", '', 'l\'overlay non tratta le combo che il passo ha chiuso'],
  [OVL, "  muroBox.style.opacity = muroAcceso()", "  muroBox.style.opacitx = muroAcceso()", 'l\'opacita\' scelta non arriva al muro'],
  [MURO_JS, "rotate(' + (gira ? cifra(f.r) : 0) + 'deg)", "rotate(' + cifra(f.r) + 'deg)", 'le emote ruotano anche se non devono'],
  [MURO_JS, ", Number(e.grandezza) > 0 ? { grandezza: e.grandezza } : {}), Math.random);", '), Math.random);', 'le esplosioni ignorano la loro grandezza'],
  [OVL, "  if (c.combo.contatore === false) conta.hidden = true;\n", '', 'il contatore spento resta acceso'],
  [OVL, "(Number(c.combo.massimo) || 300) / 100", '3', 'la combo cresce oltre il tetto scelto'],
  [MURO_JS, '      i.src = giusta;', '      i.src = e.url;', 'l\'immagine resta piccola anche per un\'emote grande'],
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

import { overlayFinto, apriSito, apriBrowser } from './_sito.mjs';
import { normMuro } from '../src/web/stile.js';

const b = await apriBrowser();
if (!b) { console.log('Chromium non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const tondo = (c) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="30" fill="${c}"/></svg>`);
const NOMI = ['Uno', 'Due', 'Tre', 'Quattro'];
const IMG = Object.fromEntries(NOMI.map((n, i) => [n, tondo(['#e33', '#3c3', '#33e', '#ec3'][i])]));
let muro = normMuro({ attivo: true });
const ov = overlayFinto({ tema: () => ({ mostra: { muro: true }, xy: {}, muro, stato: {} }) });
const sito = await apriSito({ overlay: ov });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
const chieste = [];
// Le immagini di Twitch qui non arrivano da internet: le serve il collaudo, e
// annota quale misura e' stata chiesta.
await ctx.route('https://static-cdn.jtvnw.net/**', (r) => { chieste.push(r.request().url()); r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112"><rect width="112" height="112" fill="#9147ff"/></svg>' }); });
const pg = await ctx.newPage();
const rotture = [];
pg.on('pageerror', (e) => rotture.push(e.message));
await pg.clock.install({ time: new Date('2026-10-07T10:00:00Z') });
await pg.goto(sito.base + '/overlay/prova?key=x');
await pg.waitForFunction(() => typeof preparaMuro === 'function' && MIO.muro && MIO.muro.attivo === true, null, { timeout: 20000 });

const prove = [];
const vero = (nome, ok, avuto = '') => prove.push({ nome, ok: !!ok, avuto });
// Si aspetta guardando da qui, non con waitForFunction: con l'orologio della
// pagina fermo, i giri di attesa dentro la pagina sono fermi anche loro.
const finche = async (f, arg) => {
  for (let i = 0; i < 200; i++) {
    if (await pg.evaluate(f, arg)) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
};
const tema = async (cfg) => {
  muro = normMuro({ attivo: true, ...cfg });
  ov.manda({ tipo: 'tema' });
  if (!await finche((m) => !!MIO.muro && JSON.stringify(MIO.muro) === m, JSON.stringify(muro))) throw new Error('il tema non e\' arrivato');
};
// Un pezzo di prova parte da un muro vuoto: quello che vola ancora dal pezzo
// prima non deve finire nei suoi conti.
const sgombra = () => pg.evaluate(() => { muroBox.textContent = ''; MURO.esplosioni.length = 0; });
const chat = (chi, testo, emoti = IMG) => ov.manda({ tipo: 'muro', chi, testo, emotiTwitch: Object.fromEntries(testo.split(' ').map((p) => [p, emoti[p]])) });
const conto = () => pg.evaluate(() => ({
  combo: muroBox.querySelectorAll('.muro-combo').length,
  aperte: MURO.aperte.size,
  esplosioni: MURO.esplosioni.length + (MURO.esplode ? 1 : 0),
}));

// ── LA COMBO NON RESTA IN SCENA ─────────────────────────────────────────────
await tema({ combo: { attivo: true, soglia: 3, finestra: 2, diverse: true }, durata: 2 });
await pg.clock.pauseAt(new Date('2026-10-07T10:01:00Z'));
for (const chi of ['a', 'b', 'c']) chat(chi, 'Uno');
await finche(() => MURO.aperte.size === 1);
await pg.clock.runFor(100);
const aperta = await conto();
vero('tre persone con la stessa emote aprono una combo', aperta.combo === 1 && aperta.aperte === 1, JSON.stringify(aperta));
// la combo scade, e il messaggio dopo arriva prima del giro dei 250 ms
await pg.clock.setSystemTime(new Date('2026-10-07T10:01:05Z'));
chat('d', 'Uno');
await finche(() => MURO.esplode || MURO.esplosioni.length > 0);
await pg.clock.runFor(400);
const dopo = await conto();
vero('scaduta la combo, il messaggio dopo la chiude: la sua emote se ne va', dopo.combo === 0 && dopo.aperte === 0, JSON.stringify(dopo));
vero('e la combo chiusa esplode', dopo.esplosioni > 0, JSON.stringify(dopo));
await pg.clock.resume();

// ── TANTA CHAT: NIENTE RESTA, E IL CONTO DELLE EMOTE IN VOLO E' VERO ────────
await tema({ combo: { attivo: false }, maxSchermo: 5, coda: 3, durata: 2, animazioni: ['linea'] });
await sgombra();
for (let i = 0; i < 60; i++) { chat('p' + (i % 7), NOMI[i % 4] + ' ' + NOMI[(i + 1) % 4]); if (i % 6 === 5) await pg.waitForTimeout(150); }
const pieno = await pg.evaluate(() => ({ vive: MURO.coda.vive, dom: muroBox.querySelectorAll('.muro-emote').length }));
vero('con la chat fitta, le emote in volo sono quante il conto dice', pieno.vive === pieno.dom && pieno.vive <= 5, JSON.stringify(pieno));
await finche(() => MURO.coda.vive === 0 && !muroBox.querySelector('.muro-emote'));
const vuoto = await pg.evaluate(() => ({ vive: MURO.coda.vive, dom: muroBox.querySelectorAll('.muro-emote').length }));
vero('finita la chat il muro si svuota, e il conto torna a zero', vuoto.vive === 0 && vuoto.dom === 0, JSON.stringify(vuoto));
chat('z', 'Due');
vero('e un messaggio dopo vola ancora', await finche(() => !!muroBox.querySelector('.muro-emote')));

// ── LA VESTE ────────────────────────────────────────────────────────────────
await tema({ opacita: 40, gira: false, animazioni: ['linea'], durata: 4, combo: { attivo: false } });
await sgombra();
const opa = await pg.evaluate(() => getComputedStyle(muroBox).opacity);
vero('l\'opacita\' scelta vale per tutto il muro', opa === '0.4', opa);
chat('g', 'Tre');
await finche(() => !!muroBox.querySelector('.muro-emote'));
const angoli = await pg.evaluate(() => [...muroBox.querySelectorAll('.muro-emote')].flatMap((el) => el.getAnimations().flatMap((a) => a.effect.getKeyframes().map((k) => (String(k.transform).match(/rotate\(([^)]*)\)/) || [])[1]))));
vero('senza rotazione ogni fotogramma ha l\'angolo a zero', angoli.length > 0 && angoli.every((x) => x === '0deg'), angoli.slice(0, 4).join(' '));

await tema({ grandezza: 8, varia: 0, esplosioni: { grandezza: 20, quante: 10 }, combo: { attivo: false }, animazioni: ['linea'] });
await sgombra();
ov.manda({ tipo: 'muro-esplodi', figura: 'pioggia', parole: ['Uno'], emotiTwitch: { Uno: IMG.Uno } });
await finche(() => muroBox.querySelectorAll('.muro-emote').length >= 5);
const lati = await pg.evaluate(() => [...muroBox.querySelectorAll('.muro-emote')].map((el) => Math.round(parseFloat(el.style.width))));
const atteso = Math.round(540 * 0.2);
vero(`le esplosioni hanno la loro grandezza (${atteso} px), non quella delle emote (43 px)`, lati.length && lati.every((x) => x === atteso), lati.slice(0, 5).join(' '));

await tema({ grandezza: 8, varia: 0, combo: { attivo: true, soglia: 2, finestra: 10, diverse: false, contatore: false, massimo: 150, passo: 50 }, animazioni: ['linea'] });
await sgombra();
for (let i = 0; i < 12; i++) chat('m', 'Quattro');
await finche(() => MURO.aperte.size === 1 && MURO.aperte.get('Quattro') && MURO.aperte.get('Quattro').n >= 12);
await pg.waitForTimeout(150);
const combo = await pg.evaluate(() => { const v = MURO.aperte.get('Quattro'); const m = String(v.el.style.transform).match(/scale\(([^)]*)\)/); return { scala: m ? Number(m[1]) : null, conta: v.conta.hidden, testo: v.conta.textContent }; });
vero('la combo cresce fino al tetto scelto (×1,5), non oltre', combo.scala === 1.5, JSON.stringify(combo));
vero('col contatore spento il «×12» non si vede', combo.conta === true, JSON.stringify(combo));

// ── NITIDE ──────────────────────────────────────────────────────────────────
const twitch = (id) => `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
await tema({ grandezza: 26, varia: 0, minPx: 28, maxPx: 600, combo: { attivo: false }, animazioni: ['linea'] });
await sgombra();
chieste.length = 0;
chat('n', 'Grande', { Grande: twitch('777') });
await finche(() => !!muroBox.querySelector('.muro-emote img'));
await pg.waitForTimeout(300);
vero('un\'emote di 140 px chiede a Twitch l\'immagine da 112, non quella da 56', chieste.some((u) => u.endsWith('/777/default/dark/3.0')) && !chieste.some((u) => u.endsWith('/777/default/dark/2.0')), chieste.join(' '));

await ctx.close();
await b.close();
sito.chiudi();

console.log('\nIl muro delle emote, nella pagina vera dell\'overlay.\n');
let verde = true;
for (const p of prove) {
  console.log(`  ${p.ok ? '✓' : '✗'} ${p.nome}${p.ok ? '' : ` — avuto: ${p.avuto}`}`);
  verde = p.ok && verde;
}
if (rotture.length) { console.log(`  ✗ errori di pagina: ${rotture.join(' · ')}`); verde = false; }
else console.log('  ✓ nessun errore di pagina');
console.log(verde ? '\ncollaudo verde ✓\n' : '\ncollaudo ROSSO ✗\n');
process.exit(verde ? 0 : 1);
