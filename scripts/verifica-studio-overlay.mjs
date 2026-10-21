// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello dell'OVERLAY NELLO STUDIO (docs/DIRETTA.md, «L'overlay nello Studio»).
//
// L'invariante: lo Studio manda in onda lo STESSO overlay che vede OBS. Non
// un'imitazione: la pagina vera dell'overlay, in una cornice nascosta,
// fotografata sulla tela. Qui si prova, in un browser vero:
//  · da fermo, senza eventi, si vedono i pezzi fermi (timer, contatore): era
//    il difetto segnalato, «l'overlay e' nella scena ma non lo vedo»;
//  · un alert del flusso arriva nella fotografia, e la fotografia coincide
//    pixel per pixel con la pagina che vede OBS, CSS dello streamer compreso;
//  · la tela resta trasmettibile, e i suoni vanno allo Studio, non alla cornice;
//  · in verticale la cornice e' 1080×1920, e una pagina ferma non costa niente;
//  · nello Studio della prova la fonte Overlay si vede sulla tela d'uscita, la
//    cornice e' grande come in OBS (1920×1080), un alert che arriva a Studio
//    fermo lo risveglia, e una fonte nascosta chiude la sua cornice.
//
// Le promesse sono scritte qui in testa: una che il collaudo non arriva a
// misurare esce rossa, non «non vista».
//
//   node scripts/verifica-studio-overlay.mjs              → esce 1 se qualcosa non torna
//   node scripts/verifica-studio-overlay.mjs --selftest   → rompe e pretende il rosso
import './_dati-usa-e-getta.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { apriSito, apriBrowser, overlayFinto, PUB } from './_sito.mjs';

const SELFTEST = process.argv.includes('--selftest');
const ROMPI = Number((process.argv.find((a) => a.startsWith('--rompi=')) || '').split('=')[1]) || 0;

const PROMESSE = [
  'da fermo, senza eventi, la fotografia mostra i pezzi fermi dell\'overlay (timer e contatore)',
  'un alert del flusso arriva nella fotografia',
  'la fotografia coincide con la pagina che vede OBS',
  'il CSS dello streamer arriva nella fotografia',
  'la tela resta trasmettibile: la fotografia non la sporca',
  'i suoni dell\'overlay vanno allo Studio, non agli altoparlanti della cornice',
  'in verticale la cornice e\' 1080×1920',
  'una pagina ferma non costa fotografie',
  'nello Studio della prova la fonte Overlay si vede sulla tela d\'uscita',
  'nello Studio la cornice e\' grande come in OBS: 1920×1080',
  'un alert che arriva a Studio fermo lo risveglia e va sulla tela',
  'una fonte Overlay nascosta chiude la sua cornice',
  'nessun errore di pagina',
];

const DIFETTI = {
  '/js/studio-overlay.js': [
    ['      tx.drawImage(img, 0, 0, W, H);\n', '', 'la fotografia si disegna', 1, /pezzi fermi|Studio della prova la fonte/],
    ["      if (tipo === 'CSSStyleRule') { out.push(", "      if (tipo === 'CSSStyleRule') { continue; out.push(", 'i fogli di stile arrivano nella fotografia', 2, /coincide con la pagina|CSS dello streamer/],
  ],
  '/overlay-app.js': [
    ['if (OSPITE && window.SUONI_PRESET) {', 'if (false) {', 'i suoni dei preset passano allo Studio', 3, /suoni dell'overlay/],
  ],
  '/app.js': [
    ['const STUDIO_OV_MISURA = { o: { W: 1920, H: 1080 }', 'const STUDIO_OV_MISURA = { o: { W: 1280, H: 720 }', 'la cornice e\' grande come in OBS', 4, /grande come in OBS/],
    ['sveglia: () => { if (studioOverlayServono().has(k)) studioRidisegna(); },', 'sveglia: () => {},', 'l\'overlay sveglia lo Studio', 5, /risveglia/],
    ['    else if (ora - e.visto > 30000) { e.m.chiudi();', '    else if (false) { e.m.chiudi();', 'una cornice che non serve si chiude', 6, /nascosta chiude/],
  ],
};

const GRUPPI = [...new Set(Object.values(DIFETTI).flat().map((d) => d[3]))].sort();
if (SELFTEST) {
  const { spawnSync } = await import('node:child_process');
  const sfuggiti = [];
  for (const g of GRUPPI) {
    const giro = spawnSync(process.execPath, [process.argv[1], `--rompi=${g}`], { encoding: 'utf8', env: process.env, timeout: 600000 });
    const rossi = (giro.stdout || '').split('\n').filter((l) => l.trim().startsWith('✗')).map((l) => l.trim());
    for (const [, , nome, gg, re] of Object.values(DIFETTI).flat()) if (gg === g && !rossi.some((l) => re.test(l))) sfuggiti.push(nome);
    console.log(`Giro ${g}: ${rossi.length} promesse rosse.`);
  }
  if (sfuggiti.length) { console.log(`\nAutoprova ROSSA: non si accorge di ${sfuggiti.join('; ')}.`); process.exit(1); }
  console.log(`\nAutoprova: tutti e ${Object.values(DIFETTI).flat().length} i difetti rimessi sono stati visti, in ${GRUPPI.length} giri. ✓`);
  process.exit(0);
}

const serviti = new Map();
if (ROMPI) {
  for (const [via, lista] of Object.entries(DIFETTI)) {
    let t = fs.readFileSync(path.join(PUB, via.slice(1)), 'utf8');
    for (const [da, a, , g] of lista) {
      if (g !== ROMPI) continue;
      if (t.split(da).length !== 2) { console.log(`Autoprova: il difetto «${da.slice(0, 60)}» non si trova una volta sola in ${via}.`); process.exit(1); }
      t = t.replace(da, a);
    }
    serviti.set(via, t);
  }
}

const browser = await apriBrowser();
if (!browser) { console.log('Chromium o Playwright non ci sono su questa macchina: collaudo saltato.'); process.exit(0); }

const misurate = new Map();
const ok = (cosa, vero, dettaglio = '') => { misurate.set(cosa, !!vero); console.log(`  ${vero ? '✓' : '✗'} ${cosa}${!vero && dettaglio ? ' (' + dettaglio + ')' : ''}`); };
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
const errori = [];

async function pagina(base, viewport) {
  const p = await browser.newPage({ viewport, serviceWorkers: 'block' });
  p.on('pageerror', (e) => errori.push(String(e.message || e)));
  if (serviti.size) {
    await p.route((u) => u.origin === base && serviti.has(u.pathname), async (route) => {
      const r = await route.fetch();
      await route.fulfill({ response: r, body: serviti.get(new URL(route.request().url()).pathname) });
    });
  }
  return p;
}

const CONT = { tipo: 'contatore', comando: 'morti', mostra: true, testo: 'Morti: 3', x: 4, y: 90, r: 0, colore: '#ffffff', sfondo: 'rgba(0,0,0,.55)', dim: 40, grassetto: true, font: 'system' };
const temaDi = (piu = {}) => ({ widget: {}, goals: [], conti: {}, stato: {}, mostra: {}, xy: {}, alertStile: null, chatStile: null, ...piu });
const TEMA = temaDi({
  css: '.contatore-widget{outline:8px solid rgb(0,255,0)!important}',
  timer: { attivo: true, titolo: 'Si parte fra', aFine: 'resta', posizione: 'alto-destra', xy: null, stile: {} },
  stato: { timer: { fine: Date.now() + 3_600_000 } },
  contatori: [CONT],
});
const ovl = overlayFinto({ login: 'prova', tema: () => TEMA });
const ferma = overlayFinto({ login: 'ferma', tema: () => temaDi({ css: '', contatori: [CONT] }) });
const instradati = [ovl, ferma];
const PAGINA = `<!doctype html><html><body style="margin:0"><script type="module">
import { creaFotoOverlay } from '/js/studio-overlay.js';
window.SUONI = [];
window.SB_STUDIO_OVERLAY = { suonaUrl: (f, u, v) => SUONI.push(['url', u]), suonaPreset: (f, id) => SUONI.push(['preset', id]), media: (f, el) => { el.muted = true; SUONI.push(['media', el.tagName]); } };
window.crea = (url, W, H) => { const m = creaFotoOverlay({ W, H }); m.apri(url); return m; };
window.giro = (m) => { m.tic(); requestAnimationFrame(() => giro(m)); };
window.foto = (m, W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; m.disegna(c.getContext('2d'), 0, 0, W, H); return c; };
window.pieni = (c, x = 0, y = 0, w = c.width, h = c.height) => { const d = c.getContext('2d').getImageData(x, y, w, h).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; };
window.verdi = (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 40 && d[i + 1] > 215 && d[i + 2] < 40 && d[i + 3] > 200) n++; return n; };
</script></body></html>`;

const sito = await apriSito({
  rotte: (req, res, q) => {
    if (q === '/sonda.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGINA); return true; }
    for (const o of instradati) if (o.gestisci(req, res, q)) return true;
    return false;
  },
});

try {
  // ------------------------------------------------------------- il motore
  console.log('Il motore sull\'overlay vero (1920×1080):');
  {
    const p = await pagina(sito.base, { width: 1280, height: 800 });
    await p.goto(sito.base + '/sonda.html');
    await p.waitForFunction(() => typeof window.crea === 'function');
    await p.evaluate(() => { window.M = crea('/overlay/prova?key=x&studio=1', 1920, 1080); giro(M); });
    await p.waitForFunction(() => M.stato().pronta, null, { timeout: 15000 }).catch(() => {});
    await attesa(1500);
    const fermo = await p.evaluate(() => { const c = foto(M, 1920, 1080); return { timer: pieni(c, 1500, 0, 420, 200), cont: pieni(c, 0, 900, 500, 180), st: M.stato() }; });
    ok(PROMESSE[0], fermo.timer > 500 && fermo.cont > 500, JSON.stringify(fermo));
    ok(PROMESSE[3], await p.evaluate(() => verdi(foto(M, 1920, 1080)) > 200));
    ok(PROMESSE[4], await p.evaluate(() => {
      const c = foto(M, 1920, 1080);
      try { c.getContext('2d').getImageData(0, 0, 1, 1); const f = new VideoFrame(c, { timestamp: 0 }); f.close(); return true; } catch (e) { return false; }
    }));

    // OBS: la stessa pagina, aperta da sola come la apre OBS, sullo stesso flusso
    const obs = await pagina(sito.base, { width: 1920, height: 1080 });
    await obs.goto(sito.base + '/overlay/prova?key=x');
    for (let i = 0; i < 100 && ovl.st.stream.length < 2; i++) await attesa(50);
    await attesa(1200);
    ovl.manda({ tipo: 'alert', kind: 'sub', testo: 'Carla si e\' abbonata', durata: 8000 });
    ovl.manda({ tipo: 'preset', preset: 'pop', volume: 50 });
    await attesa(2200);
    const alert = await p.evaluate(() => pieni(foto(M, 1920, 1080), 480, 40, 960, 320));
    ok(PROMESSE[1], alert > 3000, `${alert} pixel nella zona degli alert`);
    const shot = await obs.screenshot({ omitBackground: true });
    const dati = await p.evaluate(() => foto(M, 1920, 1080).toDataURL());
    const confronto = await p.evaluate(async ({ a, b }) => {
      const carica = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const [ia, ib] = await Promise.all([carica(a), carica(b)]);
      const leggi = (i) => { const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const x = c.getContext('2d'); x.drawImage(i, 0, 0, 1920, 1080); return x.getImageData(0, 0, 1920, 1080).data; };
      const da = leggi(ia), db = leggi(ib);
      let obsPieni = 0, diversi = 0;
      for (let k = 3; k < da.length; k += 4) { const pa = da[k] > 40, pb = db[k] > 40; if (pa) obsPieni++; if (pa !== pb) diversi++; }
      return { obsPieni, diversi };
    }, { a: 'data:image/png;base64,' + shot.toString('base64'), b: dati });
    ok(PROMESSE[2], confronto.obsPieni > 5000 && confronto.diversi < confronto.obsPieni * 0.03, JSON.stringify(confronto));
    const suoni = await p.evaluate(() => SUONI);
    ok(PROMESSE[5], suoni.some((s) => s[0] === 'preset' && s[1] === 'pop'), JSON.stringify(suoni));
    await obs.close();

    await p.evaluate(() => { window.V = crea('/overlay/prova?key=x&studio=1', 1080, 1920); giro(V); });
    await p.waitForFunction(() => V.stato().pronta, null, { timeout: 15000 }).catch(() => {});
    const vert = await p.evaluate(() => { const w = V.cornice().contentWindow; return { w: w.innerWidth, h: w.innerHeight, pronta: V.stato().pronta }; });
    ok(PROMESSE[6], vert.w === 1080 && vert.h === 1920 && vert.pronta, JSON.stringify(vert));

    await p.evaluate(() => { window.F = crea('/overlay/ferma?key=x&studio=1', 1920, 1080); giro(F); });
    await p.waitForFunction(() => F.stato().pronta, null, { timeout: 15000 }).catch(() => {});
    await attesa(1500);
    const f0 = await p.evaluate(() => F.stato().foto);
    await attesa(1500);
    const f1 = await p.evaluate(() => F.stato().foto);
    ok(PROMESSE[7], f0 > 0 && f1 === f0, `${f0} → ${f1}`);
    await p.close();
  }

  // ------------------------------------------------- lo Studio della prova
  console.log('Lo Studio della prova (1366×900):');
  {
    const p = await pagina(sito.base, { width: 1366, height: 900 });
    await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); } catch {} });
    await p.goto(sito.base + '/?demo=1&studio=1&lang=it', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
    await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); document.getElementById('demo-barra')?.remove(); window.SB_APP.vai('studio'); });
    await p.waitForFunction(() => typeof STUDIO !== 'undefined' && !!STUDIO.doc && !!STUDIO.tele.o, null, { timeout: 20000 });
    await p.evaluate(() => document.getElementById('studio-palco-prog')?.scrollIntoView({ block: 'center' }));
    await p.waitForFunction(() => [...STUDIO.ovMotori.values()].some((e) => e.m.stato().pronta), null, { timeout: 20000 }).catch(() => {});
    await attesa(1500);
    const zona = (fx, fy, fw, fh) => p.evaluate(([fx, fy, fw, fh]) => {
      const c = STUDIO.tele.o, d = c.getContext('2d').getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), Math.floor(c.width * fw), Math.floor(c.height * fh)).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 11) + Math.abs(d[i + 1] - 11) + Math.abs(d[i + 2] - 15) > 60) n++; return n;
    }, [fx, fy, fw, fh]);
    const vista = { contatore: await zona(0, 0.82, 0.3, 0.18), timer: await zona(0.75, 0, 0.25, 0.15) };
    ok(PROMESSE[8], vista.contatore > 200 && vista.timer > 100, JSON.stringify(vista));
    const cornice = await p.evaluate(() => { const e = [...STUDIO.ovMotori.values()][0]; const w = e?.m.cornice().contentWindow; return { n: STUDIO.ovMotori.size, w: w?.innerWidth, h: w?.innerHeight, suona: e?.m.suona }; });
    ok(PROMESSE[9], cornice.n === 1 && cornice.w === 1920 && cornice.h === 1080 && cornice.suona === true, JSON.stringify(cornice));

    // lo Studio si ferma quando niente si muove; un alert lo deve risvegliare
    // la prova senza i suoi eventi d'esempio (eventi=0): niente alert in scena,
    // e lo Studio, senza niente che si muova, puo' smettere di disegnare
    await p.evaluate(() => studioOverlayBase(STUDIO_OV_PROVA + '&lang=it&eventi=0'));
    await p.waitForFunction(() => [...STUDIO.ovMotori.values()].every((e) => e.m.stato().pronta && e.m.cornice().src.includes('eventi=0')), null, { timeout: 15000 }).catch(() => {});
    for (let i = 0; i < 100 && (await zona(0.3, 0.05, 0.4, 0.22)) > 50; i++) await attesa(100);
    await p.waitForFunction(() => !STUDIO.raf, null, { timeout: 5000 }).catch(() => {});
    const primaAlert = await zona(0.3, 0.05, 0.4, 0.22);
    await p.evaluate(() => { const w = [...STUDIO.ovMotori.values()][0].m.cornice().contentWindow; w.ricevi({ data: JSON.stringify({ tipo: 'alert', kind: 'sub', testo: 'Zeno si e\' abbonato', durata: 6000 }) }); });
    await attesa(2000);
    const dopoAlert = await zona(0.3, 0.05, 0.4, 0.22);
    ok(PROMESSE[10], dopoAlert > primaAlert + 300, `${primaAlert} → ${dopoAlert}`);

    const via = await p.evaluate(async () => {
      for (const s of STUDIO.doc.scene) for (const f of s.fonti) if (f.tipo === 'overlay') { f.pos.o.vis = false; f.pos.v.vis = false; }
      for (const e of STUDIO.ovMotori.values()) e.visto -= 60_000;
      studioOverlayRiordina();
      return { n: STUDIO.ovMotori.size, cornici: document.querySelectorAll('.sbf-cornice').length };
    });
    ok(PROMESSE[11], via.n === 0 && via.cornici === 0, JSON.stringify(via));
    await p.close();
  }
} finally {
  ok(PROMESSE[12], !errori.length, errori.slice(0, 3).join(' | '));
  await browser.close();
  sito.chiudi();
}

const mancanti = PROMESSE.filter((x) => !misurate.has(x));
for (const x of mancanti) console.log(`  ✗ ${x} (non misurata: il collaudo non ci e' arrivato)`);
const rosse = [...misurate.values()].filter((v) => !v).length + mancanti.length;
console.log(rosse ? `\nL'overlay nello Studio non mantiene ${rosse} promess${rosse === 1 ? 'a' : 'e'}.` : '\nL\'overlay nello Studio e\' quello di OBS. ✓');
process.exit(rosse ? 1 : 0);
