// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA REGIA DEI VIDEO TUTORIAL (docs/VIDEO.md).
//
// Apre il pannello demo vero dentro una pagina di regia nello stile del sito,
// fa i passi di un tutorial (scene.mjs) come li farebbe una mano, e registra.
// Il video non si monta: si rigenera. Se il pannello cambia, si rifa' con un
// comando e mostra il pannello com'e' adesso.
//
//   orizzontale  1920×1080  computer (1440×900) e telefono (390×844) affiancati
//   verticale    1080×1920  solo il telefono
//
// I fotogrammi si prendono dal browser uno per uno (screencast di Chrome), con
// l'ora in cui sono stati disegnati, e ffmpeg li mette in fila a 30 al secondo:
// il testo resta nitido e il ritmo e' quello vero. Niente audio.
//
// Naturale, ma ripetibile: il cursore va col suo arco e rallenta arrivando, le
// lettere escono con un ritmo che cambia, si scorre morbido e ci si ferma a
// guardare. Le variazioni vengono da un hash del passo, non dal caso.
//
// Uso: node scripts/video/regia.mjs [--solo monete,negozio] [--formato orizzontale|verticale|tutti]
//                                   [--out cartella] [--ffmpeg percorso-di-ffmpeg]
// ffmpeg deve saper scrivere H.264 (libx264).

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { apriSito, apriBrowser } from '../_sito.mjs';
import { dichiarazioni } from '../../src/web/tavolozza.js';
import { SCENE } from './scene.mjs';

const arg = (k, d = '') => { const i = process.argv.indexOf(k); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const SOLO = arg('--solo').split(',').filter(Boolean);
const QUALI = arg('--formato', 'tutti') === 'tutti' ? ['orizzontale', 'verticale'] : [arg('--formato')];
const OUT = resolve(arg('--out', 'video'));
const FFMPEG = arg('--ffmpeg', process.env.FFMPEG || 'ffmpeg');
const FPS = 30;

// Lo stesso vestito delle pagine del sito: i colori vengono dalla tavolozza.
const TOKEN = ['bg', 'surface', 'surface-2-tinta', 'border', 'testo', 'testo-2', 'acc', 'su-acc', 'mano',
  'testo-font', 'contorno', 'tratto-mano', 'ombra-ink', 'ombra-ink-alta', 'retino', 'retino-passo'];

const FORMATI = {
  orizzontale: {
    W: 1920, H: 1080, dida: { x: 139, y: 40, w: 1642, tit: 58, testo: 30 },
    schermi: [
      { id: 'pc', w: 1440, h: 900, s: 0.84, x: 139, y: 214 },
      { id: 'tel', w: 390, h: 844, s: 0.9, x: 1429, y: 214 },
    ],
  },
  verticale: {
    W: 1080, H: 1920, dida: { x: 80, y: 70, w: 920, tit: 70, testo: 38 },
    schermi: [{ id: 'tel', w: 390, h: 844, s: 1.85, x: 179, y: 330 }],
  },
};

// Le cose della demo che nel prodotto non ci sono.
const NASCONDI = '#cookie-banner,#demo-barra,.giro-velo,.giro-fumetto,.giro-carta{display:none!important}';

// Un numero fra 0 e 1 da una stringa: la variazione ripetibile.
const h = (s) => { let x = 2166136261; for (const c of String(s)) { x ^= c.codePointAt(0); x = Math.imul(x, 16777619) >>> 0; } return x / 4294967296; };
const fra = (k, a, b) => a + (b - a) * h(k);
const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function regiaHtml(f, scena) {
  const d = f.dida;
  const schermi = f.schermi.map((s) => `
  <div class="schermo ${s.id}" style="left:${s.x}px;top:${s.y}px;width:${Math.round(s.w * s.s)}px;height:${Math.round(s.h * s.s)}px">
    <iframe id="f-${s.id}" src="/?demo=1&lang=it" style="width:${s.w}px;height:${s.h}px;transform:scale(${s.s})"></iframe>
  </div>
  <div class="cur ${s.id}" id="c-${s.id}"></div>`).join('');
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>regia</title>
<link rel="stylesheet" href="/font.css">
<style>
:root{${dichiarazioni(TOKEN, 'chiaro')}}
*{box-sizing:border-box}
html,body{margin:0;width:${f.W}px;height:${f.H}px;overflow:hidden;background:var(--bg);color:var(--testo);font-family:var(--testo-font),system-ui,sans-serif;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;opacity:.5;background-image:var(--retino);background-size:var(--retino-passo)}
.schermo{position:absolute;overflow:hidden;background:var(--surface);border:3px solid var(--contorno);border-radius:12px;box-shadow:var(--ombra-ink-alta)}
.schermo.tel{border-width:9px;border-radius:34px}
.schermo iframe{position:absolute;left:0;top:0;border:0;transform-origin:0 0;background:var(--bg)}
.dida{position:absolute;left:${d.x}px;top:${d.y}px;width:${d.w}px;display:grid;gap:14px;justify-items:start}
.tit{font-family:var(--mano),system-ui,sans-serif;font-size:${d.tit}px;line-height:1.02;text-wrap:balance}
.sotto{font-size:${Math.round(d.testo * 0.9)}px;color:var(--testo-2)}
.testo{max-width:${d.w}px;padding:.45em .9em .5em 1em;background:var(--surface-2-tinta);border:1px solid var(--contorno);border-left-width:6px;
  border-radius:2px 4px 3px 5px / 4px 2px 5px 3px;font-size:${d.testo}px;line-height:1.3;transition:opacity .35s ease,transform .35s ease}
.via{opacity:0;transform:translateY(10px)}
.cur{position:absolute;left:0;top:0;z-index:20;pointer-events:none;will-change:transform}
.cur.pc{width:34px;height:42px;background:no-repeat center/contain url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17 21"><path d="M1.5 1.5v15.2l4-3.6 2.7 6.1 2.6-1.1-2.7-6h5.4z" fill="#fff" stroke="#16121a" stroke-width="1.6" stroke-linejoin="round"/></svg>')}")}
.cur.tel{width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(22,18,26,.22);border:3px solid rgba(255,255,255,.9);box-shadow:0 0 0 2px rgba(22,18,26,.35)}
.tocco{position:absolute;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;border:4px solid var(--acc);z-index:21;pointer-events:none;animation:tocco .55s ease-out forwards}
@keyframes tocco{from{transform:scale(.35);opacity:1}to{transform:scale(1.55);opacity:0}}
.fine{position:absolute;inset:0;z-index:30;display:grid;place-content:center;justify-items:center;gap:24px;background:var(--bg);transition:opacity .5s ease}
.fine::before{content:"";position:absolute;inset:0;opacity:.5;background-image:var(--retino);background-size:var(--retino-passo);animation:deriva 8s linear infinite}
@keyframes deriva{to{background-position:24px 12px}}
.fine .tit{animation:entra .9s cubic-bezier(.2,.8,.2,1) both}.fine .sotto{animation:entra .9s .25s cubic-bezier(.2,.8,.2,1) both}
@keyframes entra{from{opacity:0;transform:translateY(18px)}}
.fine .tit{position:relative;font-size:${Math.round(d.tit * 1.5)}px;text-align:center;max-width:${Math.round(f.W * 0.8)}px}
.fine .sotto{position:relative;font-size:${Math.round(d.testo * 1.15)}px}
.fine.via{opacity:0;pointer-events:none}
</style></head>
<body>
<div class="dida"><div class="tit" id="d-tit">${esc(scena.titolo)}</div><div class="testo via" id="d-testo"></div></div>
${schermi}
<div class="fine" id="fine"><div class="tit">${esc(scena.titolo)}</div><div class="sotto">${esc(scena.sotto || '')}</div></div>
<script>
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
window.regia = {
  pos: {},
  metti(id, x, y) { this.pos[id] = { x, y }; document.getElementById('c-' + id).style.transform = 'translate(' + x + 'px,' + y + 'px)'; },
  muovi(id, x, y, ms, piega) {
    const el = document.getElementById('c-' + id);
    const da = this.pos[id];
    const cx = (da.x + x) / 2 + piega * (y - da.y) * 0.3, cy = (da.y + y) / 2 - piega * (x - da.x) * 0.3;
    return new Promise((ok) => {
      const t0 = performance.now();
      const passo = (t) => {
        const k = Math.min(1, (t - t0) / ms), e = ease(k), q = 1 - e;
        const px = q * q * da.x + 2 * q * e * cx + e * e * x, py = q * q * da.y + 2 * q * e * cy + e * e * y;
        el.style.transform = 'translate(' + px + 'px,' + py + 'px)';
        if (k < 1) requestAnimationFrame(passo); else { this.pos[id] = { x, y }; ok(); }
      };
      requestAnimationFrame(passo);
    });
  },
  tocca(x, y) { const d = document.createElement('div'); d.className = 'tocco'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 700); },
  async dida(testo) {
    const el = document.getElementById('d-testo');
    if (!el.classList.contains('via')) { el.classList.add('via'); await new Promise((ok) => setTimeout(ok, 350)); }
    el.textContent = testo; void el.offsetWidth; el.classList.remove('via');
  },
  apri() { document.getElementById('fine').classList.add('via'); },
  chiudi(tit, sotto) { const f = document.getElementById('fine'); f.querySelector('.tit').textContent = tit; f.querySelector('.sotto').textContent = sotto; f.classList.remove('via'); },
};
</script>
</body></html>`;
}

// ── i passi, su uno schermo ──────────────────────────────────────────────────

async function trova(frame, sel, quanto = 8000) {
  const loc = frame.locator(sel).filter({ visible: true }).first();
  try { await loc.waitFor({ state: 'visible', timeout: quanto }); } catch { throw new Error(`«${sel}» non si vede`); }
  return loc;
}

async function fermo(loc) {
  let prima = null;
  for (let i = 0; i < 30; i++) {
    const b = await loc.boundingBox();
    if (b && prima && Math.abs(b.y - prima.y) < 0.5 && Math.abs(b.x - prima.x) < 0.5) return b;
    prima = b;
    await pausa(60);
  }
  return prima;
}

async function scorri(loc, chiave) {
  await loc.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await pausa(fra(chiave, 450, 700));
  return fermo(loc);
}

async function arriva(page, sch, loc, chiave) {
  const b = await scorri(loc, chiave);
  if (!b) throw new Error('niente dove andare');
  const x = b.x + b.width * fra(chiave + 'x', 0.38, 0.62), y = b.y + b.height * fra(chiave + 'y', 0.4, 0.62);
  const da = await page.evaluate((id) => window.regia.pos[id], sch.id);
  const dist = Math.hypot(x - da.x, y - da.y);
  await page.evaluate(([id, x, y, ms, p]) => window.regia.muovi(id, x, y, ms, p), [sch.id, x, y, Math.round(380 + dist * 0.55), fra(chiave + 'p', -0.5, 0.5)]);
  await pausa(fra(chiave + 'a', 90, 200));
  return { x, y };
}

async function clicca(page, sch, loc, chiave) {
  const p = await arriva(page, sch, loc, chiave);
  if (sch.id === 'tel') await page.evaluate(([x, y]) => window.regia.tocca(x, y), [p.x, p.y]);
  await loc.evaluate((el) => el.click());
  await pausa(fra(chiave + 'd', 250, 450));
}

const PASSI = {
  // Al menu' come ci va una persona: sul telefono «Altro» nella barra in basso
  // apre il menu', e un gruppo chiuso si apre dal suo titolo.
  async vai(page, sch, frame, passo, chiave) {
    const voce = `.drawer-voce[data-scheda="${passo.vai}"]`;
    const vede = async (sel) => (await frame.locator(sel).filter({ visible: true }).count()) > 0;
    if (!(await vede(voce)) && await vede('#barra-giu [data-apri-menu]')) {
      await clicca(page, sch, await trova(frame, '#barra-giu [data-apri-menu]'), chiave + 'm');
      await pausa(650);
    }
    if (!(await vede(voce))) {
      const gruppo = await frame.evaluate((v) => document.querySelector(v)?.closest('.drawer-grp-voci')?.id || '', voce);
      if (gruppo) { await clicca(page, sch, await trova(frame, `.drawer-grp-tit[aria-controls="${gruppo}"]`), chiave + 'g'); await pausa(550); }
    }
    const loc = await trova(frame, voce);
    await clicca(page, sch, loc, chiave + 'v');
    await frame.locator(`#scheda-${passo.vai}.visibile`).waitFor({ timeout: 10000 });
    await frame.addStyleTag({ content: NASCONDI });
    if (passo.zona) {
      const z = await trova(frame, `#sotto-${passo.vai} [data-sotto="${passo.zona}"]`);
      await clicca(page, sch, z, chiave + 'z');
    }
    await frame.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await pausa(700);
  },
  async clic(page, sch, frame, passo, chiave) {
    await clicca(page, sch, await trova(frame, passo.clic), chiave);
  },
  async scrivi(page, sch, frame, passo, chiave) {
    const loc = await trova(frame, passo.scrivi);
    await clicca(page, sch, loc, chiave);
    await loc.evaluate((el) => { el.focus(); el.select?.(); });
    await pausa(250);
    let fatto = '';
    for (const [i, c] of [...passo.testo].entries()) {
      fatto += c;
      await loc.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, fatto);
      await pausa(Math.round(fra(chiave + i, 55, 150) + (c === ' ' ? 60 : 0)));
    }
    await loc.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
    await pausa(400);
  },
  async scorri(page, sch, frame, passo, chiave) {
    await scorri(await trova(frame, passo.scorri), chiave);
    await pausa(fra(chiave + 'g', 350, 600));
  },
};

// ── un tutorial in un formato ────────────────────────────────────────────────

async function registra(br, sito, scena, quale) {
  const f = FORMATI[quale];
  const page = await br.newPage({ viewport: { width: f.W, height: f.H }, deviceScaleFactor: 1 });
  const guai = [];
  page.on('pageerror', (e) => guai.push(e.message));
  await page.route('**/regia', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: regiaHtml(f, scena) }));
  await page.goto(sito.base + '/regia', { waitUntil: 'domcontentloaded' });
  const frames = {};
  for (const s of f.schermi) {
    const el = await page.waitForSelector(`#f-${s.id}`);
    const fr = await el.contentFrame();
    await fr.waitForFunction(() => window.SB_APP && document.querySelector('.pannello-scheda.visibile'), null, { timeout: 30000 });
    await fr.addStyleTag({ content: NASCONDI });
    frames[s.id] = fr;
    await page.evaluate(([id, x, y]) => window.regia.metti(id, x, y), [s.id, s.x + s.w * s.s * 0.62, s.y + s.h * s.s * 0.7]);
  }
  await page.evaluate(() => document.fonts.ready);
  await pausa(1200);

  const cartella = join(tmpdir(), `regia-${scena.id}-${quale}-${process.pid}`);
  rmSync(cartella, { recursive: true, force: true });
  mkdirSync(cartella, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const tempi = [];
  cdp.on('Page.screencastFrame', async (e) => {
    const n = tempi.length;
    writeFileSync(join(cartella, `f${String(n).padStart(6, '0')}.jpg`), Buffer.from(e.data, 'base64'));
    tempi.push(e.metadata.timestamp);
    try { await cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }); } catch { /* chiuso */ }
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: f.W, maxHeight: f.H, everyNthFrame: 1 });
  // Chrome manda un fotogramma solo quando qualcosa cambia: la carta del
  // titolo si muove appena (il retino che scorre), e si parte solo dopo che
  // il primo fotogramma e' arrivato, sennò il titolo non entra nel video.
  for (let i = 0; i < 50 && !tempi.length; i++) await pausa(100);

  // il titolo, poi si apre sulla scena
  await pausa(1800);
  await page.evaluate(() => window.regia.apri());
  await pausa(900);
  for (const [i, passo] of scena.passi.entries()) {
    const chiave = `${scena.id}:${i}`;
    const schermi = f.schermi.filter((s) => !passo.solo || passo.solo === s.id);
    if (!schermi.length) continue;
    if (passo.didascalia) {
      await page.evaluate((t) => window.regia.dida(t), passo.didascalia);
      await pausa(Math.max(1600, 380 + passo.didascalia.length * 42));
      continue;
    }
    if (passo.guarda) { await pausa(passo.guarda); continue; }
    const tipo = Object.keys(PASSI).find((k) => passo[k] !== undefined);
    if (!tipo) throw new Error(`${chiave}: passo sconosciuto ${JSON.stringify(passo)}`);
    try {
      await Promise.all(schermi.map((s) => PASSI[tipo](page, s, frames[s.id], passo, `${chiave}:${s.id}`)));
    } catch (e) {
      throw new Error(`${scena.id}, passo ${i + 1} (${tipo}): ${e.message}`);
    }
  }
  await pausa(900);
  await page.evaluate(() => window.regia.chiudi('socialbot.live', 'il bot per la tua chat'));
  await pausa(2400);
  await cdp.send('Page.stopScreencast');
  const fine = Date.now() / 1000;
  await page.close();
  if (guai.length) console.log(`  ! errori nella pagina: ${guai[0]}`);

  // ffmpeg: ogni fotogramma dura fino al successivo
  const elenco = tempi.map((t, i) => `file '${join(cartella, `f${String(i).padStart(6, '0')}.jpg`)}'\nduration ${Math.max(0.001, (tempi[i + 1] ?? fine) - t).toFixed(4)}`);
  elenco.push(`file '${join(cartella, `f${String(tempi.length - 1).padStart(6, '0')}.jpg`)}'`);
  writeFileSync(join(cartella, 'elenco.txt'), elenco.join('\n'));
  mkdirSync(OUT, { recursive: true });
  const uscita = join(OUT, `${scena.id}-${quale}.mp4`);
  const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(cartella, 'elenco.txt'),
    '-vf', `fps=${FPS},scale=${f.W}:${f.H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-movflags', '+faststart', '-an', uscita], { encoding: 'utf8' });
  rmSync(cartella, { recursive: true, force: true });
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr || r.error}`);
  const durata = (fine - tempi[0]).toFixed(1);
  console.log(`  ✓ ${uscita} (${durata} s, ${tempi.length} fotogrammi presi)`);
}

const scene = SCENE.filter((s) => !SOLO.length || SOLO.includes(s.id));
if (!scene.length) { console.log('Nessun tutorial con quel nome.'); process.exit(1); }
const sito = await apriSito({});
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\'.'); sito.chiudi(); process.exit(1); }
let rotti = 0;
try {
  for (const scena of scene) {
    for (const quale of QUALI) {
      console.log(`${scena.id} · ${quale}`);
      try { await registra(br, sito, scena, quale); } catch (e) { rotti++; console.log(`  ✗ ${e.message}`); }
    }
  }
} finally {
  await br.close();
  sito.chiudi();
}
console.log(rotti ? `\n${rotti} video non fatti.` : `\nVideo in ${OUT}. ✓`);
process.exit(rotti ? 1 : 0);
