// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Collaudo di AL POSTO DEI PEZZI — gira in un browser vero.
//
// Il motore lo provano le prove senza browser (disegnati-pezzi.test); qui si
// pretende quello che si vede (docs/EFFETTI-SCHERMO.md, «Al posto dei pezzi»):
//  · nell'overlay una GIF animata al posto dei fiocchi si muove davvero: la
//    GIF e' fatta qui, due fotogrammi, rosso e verde, e ogni fiocco ha la sua
//    fase, quindi sulla tela ci sono tutti e due i colori. Ferma, ci sarebbe
//    solo il rosso;
//  · un'immagine ferma arriva anch'essa, e un'immagine che non arriva non
//    ferma niente: l'effetto parte con quelle arrivate, e se non ne arriva
//    nessuna parte col disegno di serie, e l'overlay lo racconta;
//  · nel pannello, al telefono e al computer: si scelgono le emote, compaiono
//    come pezzi, l'anteprima le disegna, grandezza e partenza si cambiano, si
//    salva e si riapre uguale; il suono si prende anche dalla libreria; il
//    livello di un evento ha la stessa sezione; «Dalla libreria» accanto a
//    una scelta di effetti mette quello scelto nella forma di quella scelta;
//    niente scorre di lato e la pagina non ha errori.
//
// Uso: node scripts/verifica-pezzi.mjs              (esce 1 se qualcosa non torna)
//      node scripts/verifica-pezzi.mjs --selftest   (senza i fotogrammi la GIF resta ferma: deve uscire rosso)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apriSito, chromiumQui, overlayFinto } from './_sito.mjs';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOTORE = path.join(RAD, 'src/web/public/disegnati.js');
const SELFTEST = process.argv.includes('--selftest');

const CHROMIUM = chromiumQui();
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
let chromium;
if (!CHROMIUM) { console.log('Chromium non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch {
  console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.');
  process.exit(0);
}

const originale = fs.readFileSync(MOTORE, 'utf8');
const DIFESA = "      if (!tr || !tr.animated || n < 2) return null;";
if (SELFTEST) {
  if (!originale.includes(DIFESA)) { console.log('  ✗ non trovo la difesa da togliere'); process.exit(1); }
  console.log('  tolgo: la lettura dei fotogrammi di una GIF animata\n');
  fs.writeFileSync(MOTORE, originale.replace(DIFESA, '      return null;'));
}
const ripristina = () => { if (SELFTEST) fs.writeFileSync(MOTORE, originale); };
process.on('exit', ripristina);

// Una GIF fatta a mano: LATO x LATO, un colore pieno per fotogramma. Ogni
// pixel e' un codice LZW preceduto da un «clear», cosi' la tabella non cresce
// e i codici restano di 3 bit: valida per ogni lettore, e senza librerie.
function gif(colori, ritardoCs) {
  const LATO = 8;
  const b = [];
  const parola = (n) => b.push(n & 255, (n >> 8) & 255);
  b.push(...Buffer.from('GIF89a'));
  parola(LATO); parola(LATO);
  b.push(0xf1, 0, 0);
  const tavola = [...colori, ...Array(4 - colori.length).fill([0, 0, 0])];
  for (const c of tavola) b.push(...c);
  if (colori.length > 1) b.push(0x21, 0xff, 11, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0);
  colori.forEach((_, i) => {
    b.push(0x21, 0xf9, 4, 0x04, ritardoCs & 255, (ritardoCs >> 8) & 255, 0, 0);
    b.push(0x2c); parola(0); parola(0); parola(LATO); parola(LATO); b.push(0);
    b.push(2);
    const codici = [];
    for (let p = 0; p < LATO * LATO; p++) codici.push(4, i);
    codici.push(5);
    const dati = [];
    let acc = 0, nb = 0;
    for (const c of codici) { acc |= c << nb; nb += 3; while (nb >= 8) { dati.push(acc & 255); acc >>= 8; nb -= 8; } }
    if (nb) dati.push(acc & 255);
    for (let k = 0; k < dati.length; k += 255) { const pezzo = dati.slice(k, k + 255); b.push(pezzo.length, ...pezzo); }
    b.push(0);
  });
  b.push(0x3b);
  return Buffer.from(b);
}
const ANIMATA = gif([[255, 0, 0], [0, 255, 0]], 25);
const FERMA = gif([[0, 0, 255]], 0);
const ID_ANIM = '01ROSSOVERDEAAAAAAAAAAAAAA', ID_FERMA = '01BLUAAAAAAAAAAAAAAAAAAAAA';

const ovl = overlayFinto({ tema: () => ({ css: '', widget: {}, goals: [], conti: {}, musica: null, timer: null, treno: null, cartelli: [], stato: {}, mostra: {}, xy: {}, alertStile: null, chatStile: null }) });
const { porta: PORTA, chiudi: chiudiSito } = await apriSito({
  overlay: ovl,
  rotte(req, res, q) {
    const img = { [`/overlay/prova/emote/7tv/${ID_ANIM}`]: ANIMATA, [`/overlay/prova/emote/7tv/${ID_FERMA}`]: FERMA }[q];
    if (img) { res.writeHead(200, { 'content-type': 'image/gif' }); res.end(img); return true; }
    if (q.startsWith('/overlay/prova/emote/')) { res.writeHead(404); res.end(); return true; }
    return false;
  },
});
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
const rotture = [];
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
const url = (id) => `/overlay/prova/emote/7tv/${id}?key=x`;

// ---- l'overlay ----------------------------------------------------------
async function overlay(ev, quando) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.on('pageerror', (e) => rotture.push(`overlay: ${e.message}`));
  await p.goto(`http://127.0.0.1:${PORTA}/overlay/prova?key=x`);
  await p.waitForFunction(() => window.SB_DISEGNATI, null, { timeout: 15000 });
  const prima = ovl.st.stream.length;
  for (let i = 0; i < 50 && ovl.st.stream.length <= prima - 1; i++) await attesa(100);
  await attesa(600);
  ovl.manda({ tipo: 'disegno', comando: '', volume: 0, durata: ev.disegno.durata * 1000, ...ev });
  const conti = [];
  for (const t of quando) {
    await attesa(t);
    conti.push(await p.evaluate(() => {
      const c = document.querySelector('canvas.disegnato');
      if (!c) return null;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let rosso = 0, verde = 0, blu = 0, bianco = 0, pieni = 0;
      for (let i = 0; i < d.length; i += 4) {
        const [r, g, bb, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
        if (a < 60) continue;
        pieni++;
        if (r > 180 && g < 70 && bb < 70) rosso++;
        else if (g > 180 && r < 70 && bb < 70) verde++;
        else if (bb > 180 && r < 70 && g < 70) blu++;
        else if (r > 200 && g > 200 && bb > 200) bianco++;
      }
      return { rosso, verde, blu, bianco, pieni };
    }));
  }
  await p.close();
  return conti;
}

const anim = await overlay({ disegno: { nome: 'neve', quanti: 'tanti', durata: 8, grandezza: 300 }, immagini: [url(ID_ANIM)] }, [2200, 1200]);
const [a1, a2] = anim;
dice(!!a1 && a1.rosso > 40 && a1.verde > 40 && a2 && a2.rosso > 40 && a2.verde > 40,
  'overlay: una GIF animata al posto dei fiocchi si muove davvero (rosso e verde insieme, ogni fiocco nella sua fase)', JSON.stringify(anim));
dice(!!a1 && a1.bianco < a1.pieni * 0.05, 'overlay: e i fiocchi bianchi di serie non ci sono piu\'', JSON.stringify(a1));

const ferma = await overlay({ disegno: { nome: 'cuori', quanti: 'tanti', durata: 6, grandezza: 200 }, immagini: [url(ID_FERMA)] }, [2500]);
dice(!!ferma[0] && ferma[0].blu > 200, 'overlay: un\'immagine ferma prende il posto dei cuori', JSON.stringify(ferma));

const guaiPrima = ovl.st.guai.length;
const meta = await overlay({ disegno: { nome: 'cuori', quanti: 'tanti', durata: 6, grandezza: 200 }, immagini: [url('01ROTTAAAAAAAAAAAAAAAAAAAA'), url(ID_FERMA)] }, [2500]);
dice(!!meta[0] && meta[0].blu > 200, 'overlay: un\'immagine che non arriva non ferma l\'effetto: parte con quella arrivata', JSON.stringify(meta));
const nessuna = await overlay({ disegno: { nome: 'neve', quanti: 'tanti', durata: 6 }, immagini: [url('01ROTTAAAAAAAAAAAAAAAAAAAA')] }, [2000]);
dice(!!nessuna[0] && nessuna[0].bianco > 100 && nessuna[0].blu === 0, 'overlay: se non ne arriva nessuna, parte la neve di serie', JSON.stringify(nessuna));
dice(ovl.st.guai.slice(guaiPrima).includes('disegno'), 'overlay: e l\'overlay racconta le immagini che non sono arrivate', JSON.stringify(ovl.st.guai));

// ---- il pannello --------------------------------------------------------
async function apri(larg, alt, nome) {
  const p = await b.newPage({ viewport: { width: larg, height: alt } });
  p.on('pageerror', (e) => rotture.push(`${nome}: ${e.message}`));
  await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); localStorage.setItem('cookie-ok', '1'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  await p.evaluate(() => window.SB_APP.vai('effetti'));
  await p.waitForFunction(() => document.querySelectorAll('#pronti-galleria .pronti-voce').length === 8, null, { timeout: 20000 });
  await p.waitForTimeout(300);
  return p;
}
const bianchiInAnteprima = (p) => p.evaluate(() => {
  const c = document.querySelector('#pronti-carta .pronti-tela');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225) n++;
  return n;
});

for (const [larg, alt, nome] of [[390, 844, 'telefono'], [1280, 900, 'computer']]) {
  const p = await apri(larg, alt, nome);
  await p.click('#pronti-galleria [data-pronto="coriandoli"]');
  await p.waitForTimeout(1600);
  const senza = await bianchiInAnteprima(p);
  await p.click('#pronti-carta [data-pz="emote"]');
  await p.waitForSelector('.em-voce', { timeout: 10000 });
  await p.click('.em-voce >> nth=0');
  await p.click('.em-voce >> nth=1');
  await p.click('.em-ok');
  await p.waitForFunction(() => document.querySelectorAll('#pronti-carta .pz-chip').length === 2, null, { timeout: 5000 }).catch(() => {});
  const scelte = await p.evaluate(() => ({ chip: document.querySelectorAll('#pronti-carta .pz-chip').length, pezzi: _pronti.p.pezzi.map((x) => x.fonte + ':' + x.nome) }));
  dice(scelte.chip === 2 && scelte.pezzi.join() === '7tv:demoPepe,7tv:demoJam', `${nome}: le emote scelte diventano i pezzi dell'effetto`, JSON.stringify(scelte));
  await p.waitForTimeout(2200);
  const con = await bianchiInAnteprima(p);
  dice(senza < 30 && con > 300, `${nome}: l'anteprima le disegna al posto dei coriandoli`, `senza ${senza}, con ${con}`);
  await p.evaluate(() => {
    const g = document.getElementById('pronti-grandezza');
    g.value = '150'; g.dispatchEvent(new Event('input', { bubbles: true })); g.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#pronti-carta [data-origine="alto"]').click();
  });
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('#pronti-carta [data-pronti="salva"]').click());
  await p.waitForTimeout(700);
  const salvato = await p.evaluate(() => (_demoScritture.effetti || []).filter((e) => e.tipo === 'disegno').pop()?.disegno);
  dice(salvato?.pezzi?.length === 2 && salvato.grandezza === 150 && salvato.origine === 'alto' && salvato.nome === 'coriandoli',
    `${nome}: si salva coi pezzi, la grandezza e la partenza`, JSON.stringify(salvato));
  const riaperto = await p.evaluate(async () => {
    const e = (_demoScritture.effetti || []).filter((x) => x.tipo === 'disegno').pop();
    _pronti = _prontiNuovo('stelle');
    disegnaPronti();
    for (let i = 0; i < 30 && !document.querySelector(`[data-modifica-pronto="${e.id}"]`); i++) await new Promise((r) => setTimeout(r, 100));
    const b = document.querySelector(`[data-modifica-pronto="${e.id}"]`);
    if (!b) return { tasto: false };
    b.click();
    await new Promise((r) => setTimeout(r, 600));
    return { tasto: true, chip: document.querySelectorAll('#pronti-carta .pz-chip').length, grandezza: document.getElementById('pronti-grandezza')?.value, alto: document.querySelector('#pronti-carta [data-origine="alto"]')?.getAttribute('aria-checked') };
  });
  dice(riaperto.chip === 2 && riaperto.grandezza === '150' && riaperto.alto === 'true', `${nome}: riaperto, e' quello salvato`, JSON.stringify(riaperto));
  const suono = await p.evaluate(async () => {
    document.querySelector('#pronti-carta [data-suono-lib]').click();
    for (let i = 0; i < 40 && !document.querySelector('.lib-velo .lib-usa'); i++) await new Promise((r) => setTimeout(r, 100));
    const usa = [...document.querySelectorAll('.lib-velo .lib-usa')][0];
    if (usa) usa.click();
    await new Promise((r) => setTimeout(r, 600));
    return { valore: document.getElementById('pronti-suono')?.value, st: _pronti.p.suono };
  });
  dice(/^effetto:/.test(suono.valore || '') && suono.valore === suono.st, `${nome}: il suono si prende anche dalla libreria, ed e' quello scelto`, JSON.stringify(suono));
  const evento = await p.evaluate(async () => {
    document.querySelector('[data-sotto="eventi"]')?.click();
    await new Promise((r) => setTimeout(r, 400));
    _eeApri('follow', false);
    await new Promise((r) => setTimeout(r, 300));
    const ap = document.querySelector('#ee-fogli details[data-ee="follow"] [data-ee-apri]');
    if (ap) ap.click();
    await new Promise((r) => setTimeout(r, 500));
    return !!document.querySelector('#ee-fogli details[data-ee="follow"] .pz-campo [data-pz="emote"]');
  });
  dice(evento, `${nome}: il livello di un evento ha la stessa sezione dei pezzi`);
  const lib = await p.evaluate(async () => {
    document.querySelector('[data-sotto="tuoi"]')?.click();
    const sel = document.getElementById('premio-effetto');
    const z = sel?.closest('[data-zona]')?.dataset.zona;
    if (z) document.querySelector(`[data-sotto="${z}"]`)?.click();
    await new Promise((r) => setTimeout(r, 400));
    if (!sel) return { sel: false };
    const tasto = sel.closest('.lib-scelta')?.querySelector('[data-lib-scelta]');
    const prima = sel.value;
    let cambiato = 0;
    sel.addEventListener('change', () => { cambiato++; });
    tasto.click();
    for (let i = 0; i < 40 && !document.querySelector('.lib-velo .lib-usa'); i++) await new Promise((r) => setTimeout(r, 100));
    document.querySelector('.lib-velo .lib-usa')?.click();
    await new Promise((r) => setTimeout(r, 600));
    const r = sel.closest('.lib-scelta').getBoundingClientRect(), t = tasto.getBoundingClientRect(), carta = sel.closest('.carta')?.getBoundingClientRect();
    return { prima, dopo: sel.value, cambiato, mostrato: sel.closest('.lib-scelta').querySelector('.tendina-btn')?.textContent.trim(), dentro: !!carta && t.right <= carta.right + 0.5 && t.left >= r.left };
  });
  dice(lib.dopo && lib.dopo !== lib.prima && !lib.dopo.startsWith('effetto:') && lib.cambiato > 0 && /^!?/.test(lib.mostrato || '') && lib.mostrato.includes(lib.dopo) && lib.dentro,
    `${nome}: «Dalla libreria» accanto all'effetto di un premio mette quello scelto, nella forma di quella scelta, e sta nella carta`, JSON.stringify(lib));
  const largo = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  dice(largo <= 0, `${nome}: niente scorre di lato`, `${largo}px`);
  await p.close();
}

await b.close();
await chiudiSito();

for (const e of esiti) console.log(`  ${e.ok ? '✓' : '✗'} ${e.msg}${e.ok ? '' : `\n      ${e.extra}`}`);
if (rotture.length) console.log('  ✗ errori nella pagina:\n      ' + rotture.join('\n      '));
const rossi = esiti.filter((e) => !e.ok).length + (rotture.length ? 1 : 0);
if (SELFTEST) {
  ripristina();
  console.log(rossi ? '\nAutoprova: senza la lettura dei fotogrammi la GIF resta ferma, e si vede. ✓\n' : '\nautoprova ROSSA ✗: senza i fotogrammi il collaudo non se ne accorge\n');
  process.exit(rossi ? 0 : 1);
}
console.log(rossi ? `\n${rossi} cose non tornano.` : '\nTutto torna.');
process.exit(rossi ? 1 : 0);
