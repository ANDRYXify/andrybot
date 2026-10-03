// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello dello strumento «Emote e badge» (Strumenti) — gira in un browser vero.
//
// Il modello: da un'immagine ferma escono PNG alle misure di chi la riceve;
// da un'animazione (GIF, WebP, APNG) o da un tratto di video escono GIF che
// rispettano le regole di chi la riceve, per costruzione:
//  · Twitch: 112, 56 e 28 px, al massimo 60 fotogrammi e 512 KB l'una;
//    7TV e Discord: 128 px, coi loro pesi;
//  · troppi fotogrammi si ricampionano nel tempo e il giro dura uguale, al
//    centesimo;
//  · l'animazione parte dal fotogramma fermo scelto: e' quello che si vede
//    dove le emote stanno ferme;
//  · i badge non si muovono: escono PNG dal fotogramma fermo;
//  · il trasparente resta trasparente;
//  · piu' di tre lampi al secondo si dicono, in rosso;
//  · un browser che legge solo il primo fotogramma lo dice;
//  · da un video si prende il tratto scelto, che non va oltre la fine.
// Le GIF uscite si rileggono col decodificatore del browser, non col nostro.
//
// Uso: node scripts/verifica-emote.mjs              (esce 1 se qualcosa non torna)
//      node scripts/verifica-emote.mjs --selftest   (Twitch senza il tetto dei 60 fotogrammi: deve uscire rosso)

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apriSito, chromiumQui } from './_sito.mjs';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(RAD, 'src/web/public/app.js');
const SELFTEST = process.argv.includes('--selftest');
const FOTO = (process.argv.find((a) => a.startsWith('--foto=')) || '').slice(7);

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
const DIFESA = 'piano = SB_EMOTE.ricampiona(_misRuota(A.durate, MIS_STATO.fermo), M.animata.fotogrammi);';
if (SELFTEST) {
  if (!originale.includes(DIFESA)) { console.log('  ✗ non trovo la difesa da togliere'); process.exit(1); }
  console.log('  tolgo: il tetto dei fotogrammi di chi riceve l\'emote\n');
  fs.writeFileSync(APP, originale.replace(DIFESA, 'piano = SB_EMOTE.ricampiona(_misRuota(A.durate, MIS_STATO.fermo), 100000);'));
}
const ripristina = () => { if (SELFTEST) fs.writeFileSync(APP, originale); };
process.on('exit', ripristina);

// Le animazioni di prova si fanno qui col codificatore delle Grafiche, che ha
// le sue prove di ritorno (test/unita/gif-emote.test.mjs).
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(RAD, 'src/web/public/graf-gif.js'), 'utf8'), ctx);
const { encode } = ctx.window.SB_GIF;

// Un pallino che attraversa un quadro trasparente: dal centro del pallino si
// capisce quale fotogramma e'.
const PALLINO = { lato: 200, n: 100, cs: 4, x: (f) => 20 + 1.6 * f, y: 100, r: 18 };
function gifPallino() {
  const { lato, n } = PALLINO, frames = [];
  for (let f = 0; f < n; f++) {
    const d = new Uint8ClampedArray(lato * lato * 4), cx = PALLINO.x(f);
    for (let y = 0; y < lato; y++) for (let x = 0; x < lato; x++) {
      if ((x - cx) ** 2 + (y - PALLINO.y) ** 2 > PALLINO.r ** 2) continue;
      const j = (y * lato + x) * 4;
      d[j] = 230; d[j + 1] = 60; d[j + 2] = 40; d[j + 3] = 255;
    }
    frames.push(d);
  }
  return Buffer.from(encode(frames, lato, lato, PALLINO.cs, { trasparenza: true, dither: false }));
}
function gifLampi(cs) {
  const lato = 128, frames = [];
  for (let f = 0; f < 20; f++) {
    const v = f % 2 ? 255 : 0, d = new Uint8ClampedArray(lato * lato * 4);
    for (let i = 0; i < lato * lato; i++) { d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    frames.push(d);
  }
  return Buffer.from(encode(frames, lato, lato, cs, { dither: false }));
}
const PNG_FERMA = () => {
  const lato = 300, frames = [new Uint8ClampedArray(lato * lato * 4)];
  for (let i = 0; i < lato * lato; i++) { const x = i % lato, y = (i / lato) | 0; frames[0].set([x % 256, y % 256, 120, 255], i * 4); }
  return frames;
};

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
const rotture = [];

async function apri(larg, alt, nome, { senzaDecoder = false } = {}) {
  const p = await b.newPage({ viewport: { width: larg, height: alt } });
  p.on('pageerror', (e) => rotture.push(`${nome}: ${e.message}`));
  await p.addInitScript((senza) => {
    try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); localStorage.setItem('cookie-ok', '1'); } catch {}
    if (senza) { try { delete window.ImageDecoder; } catch {} window.ImageDecoder = undefined; }
  }, senzaDecoder);
  await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  await p.evaluate(() => window.SB_APP.vai('misure'));
  await p.waitForFunction(() => document.getElementById('mis-file'), null, { timeout: 20000 });
  await p.waitForTimeout(300);
  return p;
}

// Carica un file e aspetta che le anteprime siano quelle di questo giro.
async function carica(p, nome, tipo, byte) {
  await p.evaluate(() => { window.__misPrima = MIS_STATO.file; });
  await p.setInputFiles('#mis-file', { name: nome, mimeType: tipo, buffer: byte });
  await p.waitForFunction(() => MIS_STATO.file !== window.__misPrima && MIS_STATO.file.length
    && document.querySelectorAll('#mis-anteprime [data-mis-scarica]').length === MIS_STATO.file.length, null, { timeout: 60000 });
}
async function scegli(p, sel) {
  await p.evaluate(() => { window.__misPrima = MIS_STATO.file; });
  await p.click(sel);
  await p.waitForFunction(() => MIS_STATO.file !== window.__misPrima && MIS_STATO.file.length, null, { timeout: 60000 });
}

// Le uscite rilette dal browser: fotogrammi, durata, lato, e il centro del
// primo fotogramma (o del PNG) in frazioni del lato.
const uscite = (p) => p.evaluate(async () => Promise.all(MIS_STATO.file.map(async (f) => {
  const r = { nome: f.nome, tipo: f.blob.type, peso: f.blob.size, lato: f.lato };
  const centro = (src, w, h) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    let sx = 0, sy = 0, s = 0, vuoti = 0;
    for (let i = 0; i < w * h; i++) { const a = d[i * 4 + 3]; if (a === 0) vuoti++; sx += (i % w) * a; sy += ((i / w) | 0) * a; s += a; }
    return { cx: s ? (sx / s + 0.5) / w : -1, cy: s ? (sy / s + 0.5) / h : -1, vuoti: vuoti / (w * h) };
  };
  const dec = new ImageDecoder({ data: await f.blob.arrayBuffer(), type: f.blob.type });
  await dec.tracks.ready; await dec.completed;
  r.fotogrammi = dec.tracks.selectedTrack.frameCount;
  r.ms = 0;
  for (let i = 0; i < r.fotogrammi; i++) {
    const { image } = await dec.decode({ frameIndex: i });
    r.ms += (image.duration || 0) / 1000;
    if (i === 0) { r.w = image.displayWidth; r.h = image.displayHeight; Object.assign(r, centro(image, r.w, r.h)); }
    image.close();
  }
  dec.close();
  return r;
})));
const problemi = (p) => p.evaluate(() => [...document.querySelectorAll('#mis-problemi li')].map((li) => ({ grave: li.classList.contains('grave'), testo: li.textContent })));
const detto = (p) => p.evaluate(() => document.getElementById('mis-tempo-detto').textContent);

const PROVE = [['telefono', 390, 844], ['computer', 1280, 900]];
for (const [nome, larg, alt] of PROVE) {
  const p = await apri(larg, alt, nome);
  const tag = (m) => `${nome}: ${m}`;

  // 1. Immagine ferma: tre PNG alle misure di Twitch, niente parte del tempo.
  {
    const lato = 300, d = PNG_FERMA()[0];
    const png = await p.evaluate(async ({ lato, dati }) => {
      const c = document.createElement('canvas'); c.width = lato; c.height = lato;
      c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(dati), lato, lato), 0, 0);
      return [...new Uint8Array(await (await new Promise((ok) => c.toBlob(ok, 'image/png'))).arrayBuffer())];
    }, { lato, dati: [...d] });
    await carica(p, 'ferma.png', 'image/png', Buffer.from(png));
    const u = await uscite(p);
    dice(u.length === 3 && u.every((x) => x.tipo === 'image/png' && x.fotogrammi === 1) && u.map((x) => x.w).join() === '112,56,28',
      tag('un\'immagine ferma da emote esce in tre PNG: 112, 56 e 28'), JSON.stringify(u.map((x) => [x.tipo, x.w, x.fotogrammi])));
    dice(await p.evaluate(() => document.getElementById('mis-tempo').hidden), tag('e la parte del tempo non si vede'));
  }

  // 2. Animazione da emote Twitch: 60 fotogrammi al massimo, giro uguale,
  //    trasparente, e parte dal fotogramma fermo scelto.
  const pallino = gifPallino();
  await carica(p, 'pallino.gif', 'image/gif', pallino);
  {
    const u = await uscite(p), giro = PALLINO.n * PALLINO.cs * 10;
    dice(u.length === 3 && u.every((x) => x.tipo === 'image/gif') && u.map((x) => x.w).join() === '112,56,28' && u.every((x) => x.w === x.h),
      tag('un\'animazione da emote Twitch esce in tre GIF quadrate: 112, 56 e 28'), JSON.stringify(u.map((x) => [x.tipo, x.w, x.h])));
    dice(u.every((x) => x.fotogrammi <= 60 && x.fotogrammi > 1), tag('ognuna con 60 fotogrammi al massimo'), JSON.stringify(u.map((x) => x.fotogrammi)));
    dice(u.every((x) => Math.round(x.ms) === giro), tag(`e il giro dura uguale, ${giro} ms`), JSON.stringify(u.map((x) => x.ms)));
    dice(u.every((x) => x.peso <= 512 * 1024), tag('e pesano 512 KB al massimo'), JSON.stringify(u.map((x) => x.peso)));
    dice(u.every((x) => x.vuoti > 0.5), tag('il trasparente resta trasparente'), JSON.stringify(u.map((x) => x.vuoti.toFixed(2))));
    const x0 = PALLINO.x(0) / PALLINO.lato;
    dice(u.every((x) => Math.abs(x.cx - x0) < 0.04), tag('di serie parte dal primo fotogramma'), JSON.stringify(u.map((x) => x.cx.toFixed(3))));
    const t = await detto(p);
    dice(/100 fotogrammi/.test(t) && /al massimo 60/.test(t) && /ne tengo 60/.test(t), tag('e dice quanti fotogrammi aveva e quanti ne tiene'), t);
    const vista = await p.evaluate(() => ({
      chat: [...document.querySelectorAll('#mis-anteprime .mis-chat img')].map((i) => [i.width, i.currentSrc.startsWith('blob:')]),
      tempo: !document.getElementById('mis-tempo').hidden, video: !document.getElementById('mis-video').hidden,
      max: document.getElementById('mis-fermo').max,
    }));
    dice(vista.chat.length === 2 && vista.chat.every(([w, blob]) => w === 28 && blob), tag('in chat si vede alla misura vera, sulla chat scura e sulla chiara'), JSON.stringify(vista.chat));
    dice(vista.tempo && !vista.video && vista.max === String(PALLINO.n - 1), tag('si sceglie il fotogramma fermo fra tutti, e i campi del video non ci sono'), JSON.stringify(vista));

    const k = 50;
    await p.evaluate(() => { window.__misPrima = MIS_STATO.file; });
    await p.evaluate((k) => { const r = document.getElementById('mis-fermo'); r.value = String(k); r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); }, k);
    await p.waitForFunction(() => MIS_STATO.file !== window.__misPrima && MIS_STATO.file.length, null, { timeout: 60000 });
    const v = await uscite(p), xk = PALLINO.x(k) / PALLINO.lato;
    dice(v.every((x) => Math.abs(x.cx - xk) < 0.04), tag('scelto il fermo, l\'animazione parte da li\''), JSON.stringify(v.map((x) => x.cx.toFixed(3))));
    dice(v.every((x) => Math.round(x.ms) === giro), tag('e il giro dura sempre uguale'), JSON.stringify(v.map((x) => x.ms)));
    const quale = await p.evaluate(() => document.getElementById('mis-fermo-quale').textContent);
    dice(/^51 di 100, a 2(,0)? s$/.test(quale), tag('e dice quale fotogramma e quando'), quale);

    // Badge: fermi, dal fotogramma scelto.
    await scegli(p, '[data-mis-tipo="badge"]');
    const bd = await uscite(p);
    dice(bd.length === 3 && bd.every((x) => x.tipo === 'image/png' && x.fotogrammi === 1) && bd.map((x) => x.w).join() === '72,36,18',
      tag('per i badge escono tre PNG fermi: 72, 36 e 18'), JSON.stringify(bd.map((x) => [x.tipo, x.w, x.fotogrammi])));
    dice(bd.every((x) => Math.abs(x.cx - xk) < 0.05), tag('presi dal fotogramma fermo'), JSON.stringify(bd.map((x) => x.cx.toFixed(3))));
    dice(/badge di Twitch non si muovono/.test(await detto(p)), tag('e lo dice'));

    // 7TV e Discord: 128, tutti i fotogrammi.
    for (const [t, peso] of [['7tv', 7 * 1024 * 1024], ['discord', 256 * 1024]]) {
      await scegli(p, `[data-mis-tipo="${t}"]`);
      const s = await uscite(p);
      dice(s.length === 1 && s[0].tipo === 'image/gif' && s[0].w === 128 && s[0].h === 128 && s[0].peso <= peso,
        tag(`per ${t} esce una GIF da 128 che sta nel peso`), JSON.stringify(s.map((x) => [x.tipo, x.w, x.peso])));
      dice(s[0].fotogrammi === PALLINO.n && Math.round(s[0].ms) === giro, tag(`e tiene tutti i ${PALLINO.n} fotogrammi, col giro uguale`), JSON.stringify([s[0].fotogrammi, s[0].ms]));
    }
    const chatD = await p.evaluate(() => [...document.querySelectorAll('#mis-anteprime .mis-chat')].map((c) => getComputedStyle(c).backgroundColor));
    dice(chatD.join() === 'rgb(49, 51, 56),rgb(255, 255, 255)', tag('e Discord si prova sui colori di Discord'), chatD.join());

    // Riempi: si ricarica e resta coerente.
    await scegli(p, '[data-mis-tipo="emote"]');
    await scegli(p, '[data-mis-adatta="riempi"]');
    const r = await uscite(p);
    dice(r.length === 3 && r.every((x) => x.fotogrammi <= 60 && Math.round(x.ms) === giro), tag('«Riempi» rifà l\'animazione con le stesse regole'), JSON.stringify(r.map((x) => [x.fotogrammi, x.ms])));
    await scegli(p, '[data-mis-adatta="intera"]');

    // Scaricare: i nomi dicono cosa sono.
    const nomi = await p.evaluate(() => MIS_STATO.file.map((f) => f.nome));
    dice(nomi.join() === 'pallino-emote-112.gif,pallino-emote-56.gif,pallino-emote-28.gif', tag('i file si chiamano per quello che sono'), nomi.join());
    const [scarico] = await Promise.all([p.waitForEvent('download'), p.click('#mis-anteprime [data-mis-scarica="1"]')]);
    dice(scarico.suggestedFilename() === 'pallino-emote-56.gif', tag('«Scarica» scarica quella misura'), scarico.suggestedFilename());
  }

  // 3. Lampi: veloci si dicono in rosso, lenti no.
  await carica(p, 'lampi.gif', 'image/gif', gifLampi(5));
  {
    const pr = await problemi(p);
    dice(pr.some((x) => x.grave && /lampeggia \d+ volte/.test(x.testo)), tag('un\'animazione che lampeggia 10 volte al secondo si dice, in rosso'), JSON.stringify(pr));
  }
  await carica(p, 'lenta.gif', 'image/gif', gifLampi(50));
  {
    const pr = await problemi(p);
    dice(!pr.some((x) => /lampeggia/.test(x.testo)), tag('una che cambia due volte al secondo no'), JSON.stringify(pr));
  }

  // 4. Video: il tratto scelto, fino alla fine e non oltre.
  const video = await p.evaluate(async () => {
    if (typeof MediaRecorder === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = 320; c.height = 180;
    const g = c.getContext('2d'), flusso = c.captureStream(30), rec = new MediaRecorder(flusso, { mimeType: 'video/webm' }), pezzi = [];
    rec.ondataavailable = (e) => pezzi.push(e.data);
    const fine = new Promise((ok) => { rec.onstop = ok; });
    rec.start(100);
    const t0 = performance.now();
    await new Promise((ok) => {
      const passo = () => {
        const t = (performance.now() - t0) / 1000;
        g.fillStyle = '#222'; g.fillRect(0, 0, 320, 180);
        g.fillStyle = '#3c9'; g.fillRect(20 + t * 100, 60, 60, 60);
        if (t < 2) requestAnimationFrame(passo); else ok();
      };
      passo();
    });
    rec.stop(); await fine;
    return [...new Uint8Array(await new Blob(pezzi, { type: 'video/webm' }).arrayBuffer())];
  });
  if (!video) dice(true, tag('video: questo browser non registra, parte saltata'));
  else {
    await carica(p, 'corto.webm', 'video/webm', Buffer.from(video));
    const q = await p.evaluate(() => ({ video: !document.getElementById('mis-video').hidden, durata: parseFloat(document.getElementById('mis-durata').value), anim: !!MIS_STATO.anim, n: MIS_STATO.anim && MIS_STATO.anim.quadri.length }));
    dice(q.video && q.anim, tag('un video si legge, e si vedono i campi del tratto'), JSON.stringify(q));
    dice(q.durata > 1 && q.durata <= 2.3, tag('chiesti 3 secondi a un video di 2, il tratto si ferma alla fine'), JSON.stringify(q));
    const u = await uscite(p);
    dice(u.length === 3 && u.every((x) => x.tipo === 'image/gif' && x.fotogrammi === q.n && Math.abs(x.ms - q.durata * 1000) <= 60),
      tag('e ne escono GIF a 20 fotogrammi al secondo, lunghe quanto il tratto'), JSON.stringify(u.map((x) => [x.fotogrammi, x.ms])));
    const t = await detto(p);
    dice(/Dal video prendo/.test(t), tag('e dice cosa prende dal video'), t);
  }

  const largo = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  dice(largo <= 0, tag('niente scorre di lato'), String(largo));
  if (FOTO) {
    await carica(p, 'pallino.gif', 'image/gif', pallino);
    await p.evaluate(() => document.getElementById('mis-carta').scrollIntoView({ block: 'start', behavior: 'instant' }));
    await p.screenshot({ path: path.join(FOTO, `emote-${nome}.png`), fullPage: true });
  }
  await p.close();
}

// 5. Un browser che legge solo il primo fotogramma lo dice.
{
  const p = await apri(1280, 900, 'senza decodificatore', { senzaDecoder: true });
  await carica(p, 'pallino.gif', 'image/gif', gifPallino());
  const pr = await problemi(p), tipi = await p.evaluate(() => MIS_STATO.file.map((f) => f.blob.type));
  dice(pr.some((x) => /solo il primo fotogramma/.test(x.testo)) && tipi.every((t) => t === 'image/png'),
    'senza decodificatore: esce ferma e dice perché', JSON.stringify({ pr, tipi }));
  await p.close();
}

dice(!rotture.length, 'la pagina non ha errori', rotture.join(' | '));
await b.close();
await chiudiSito();

console.log('\nLo strumento «Emote e badge», fermo e animato.\n');
for (const e of esiti) console.log(`  ${e.ok ? '✓' : '✗'} ${e.msg}${e.ok || !e.extra ? '' : ` — ${e.extra}`}`);
const rossi = esiti.filter((e) => !e.ok).length;
if (SELFTEST) {
  console.log(rossi ? '\nAutoprova: senza il tetto, Twitch riceve piu\' di 60 fotogrammi, e si vede. ✓\n' : '\nAutoprova: tolto il tetto, il cancello non se ne accorge. ✗\n');
  process.exit(rossi ? 0 : 1);
}
console.log(rossi ? `\n${rossi} cose non tornano. ✗\n` : '\nOgni misura esce come la vuole chi la riceve. ✓\n');
process.exit(rossi ? 1 : 0);
