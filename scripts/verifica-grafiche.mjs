// Cancello delle GRAFICHE SOCIAL: quello che si pubblica si legge, gira senza
// scatti, e ogni scritta sta al suo posto.
//
// Il ragionamento sta in docs/GRAFICHE.md. Qui si rende la grafica in un
// browser vero, tema per tema, formato per formato, stile pronto per stile
// pronto, e si misura:
//  · il CONTRASTO VERO di ogni scritta: i pixel delle lettere contro quelli che
//    le toccano da fuori, a un pixel dal bordo. Il contorno, quando c'e', e' il
//    fondo vero delle lettere, e la misura lo vede come lo vede chi guarda. La
//    soglia e' quella WCAG per la grandezza che la scritta ha sul telefono: una
//    grafica da 1080 si guarda a circa 390 px;
//  · la DISPOSIZIONE: nessuna scritta ne tocca un'altra, nessuna finisce sotto
//    il QR, e tutte stanno dentro la tela; nella STORIA (1080×1920) nessuna
//    finisce nelle due fasce dove Instagram mette le sue scritte;
//  · il GIRO: il fotogramma a fine periodo e' il primo, e il passo che scavalca
//    la fine non e' piu' grande dei passi normali. Un numero di giri non intero
//    si vede proprio li';
//  · il SYNTHWAVE: le linee del pavimento, prolungate, passano dal punto di
//    fuga, che sta dentro il sole; all'orizzonte sono distanziate; le
//    trasversali si infittiscono verso l'orizzonte e il giro le rimette dove
//    erano;
//  · lo SCRIVERE nella scheda: entrata tre volte, ogni lettera ridisegna
//    l'anteprima al piu' una volta, e l'ultima e' quella col testo scritto;
//    uscendo dalla scheda l'animazione si ferma.
//
// Uso: node scripts/verifica-grafiche.mjs            (esce 1 se qualcosa non va)
//      node scripts/verifica-grafiche.mjs --selftest (le rotture devono vedersi)

import { apriSito, apriBrowser } from './_sito.mjs';

const SELFTEST = process.argv.includes('--selftest');
const browser = await apriBrowser();
if (!browser) { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }
const sito = await apriSito({});
const pagina = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'it-IT' })).newPage();
const errori = [];
pagina.on('pageerror', (e) => errori.push(e.message));
// Il giro guidato si prenderebbe la tastiera a meta' di una parola: si spegne
// come lo spegne il pannello, prima che la pagina parta.
await pagina.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); } catch {} });
await pagina.goto(sito.base + '/?demo=1', { waitUntil: 'networkidle' });
await pagina.waitForFunction(() => window.SB_SCENE && typeof grafDisegna === 'function' && typeof grafDisposizione === 'function');
await pagina.evaluate(() => grafFontPronti());

// Tutto quello che serve dentro la pagina: registra le scritte, misura, e
// rende i fotogrammi del giro. Sta qui e non nel prodotto: il pannello non
// sa di essere misurato.
await pagina.evaluate(() => {
  const P = CanvasRenderingContext2D.prototype;
  const vero = { fill: P.fillText, stroke: P.strokeText };
  let registro = null;
  P.fillText = function (t, x, y, ...r) {
    if (registro && this.canvas === registro.tela) {
      const m = this.getTransform();
      registro.scritte.push({ t: String(t), x, y, font: this.font, align: this.textAlign, base: this.textBaseline, m: [m.a, m.b, m.c, m.d, m.e, m.f] });
    }
    return vero.fill.call(this, t, x, y, ...r);
  };
  const lum = (r, g, b) => {
    const l = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b);
  };
  const pittogramma = /\p{Extended_Pictographic}/u;
  const soglia = (font) => {
    const px = Number((/(\d+(?:\.\d+)?)px/.exec(font) || [0, 16])[1]);
    const peso = Number((/(?:^|\s)([1-9]00)(?:\s|$)/.exec(font) || [0, 400])[1]);
    const vero = px * 0.36;
    return { px, peso, soglia: (vero >= 24 || (peso >= 700 && vero >= 18.66)) ? 3 : 4.5 };
  };

  // Le scritte consecutive con lo stesso carattere, la stessa riga e lo stesso
  // allineamento sono una scritta sola: e' il caso delle lettere spaziate, che
  // si disegnano una per una.
  const raggruppa = (scritte) => {
    const gruppi = [];
    for (const s of scritte) {
      const g = gruppi[gruppi.length - 1];
      if (g && g.font === s.font && Math.abs(g.y - s.y) < 0.01 && s.align === 'left' && g.lettere && s.t.length === 1) { g.pezzi.push(s); g.testo += s.t; continue; }
      gruppi.push({ font: s.font, y: s.y, align: s.align, lettere: s.t.length === 1, pezzi: [s], testo: s.t });
    }
    return gruppi;
  };

  window.__misuraGrafica = (c, t) => {
    const tela = grafTelaNuova();
    registro = { tela, scritte: [] };
    grafDisegna(tela, c, t, 1);
    const scritte = registro.scritte;
    registro = null;
    const W = tela.width, H = tela.height;
    const tutta = tela.getContext('2d').getImageData(0, 0, W, H).data;
    const maschera = document.createElement('canvas'); maschera.width = W; maschera.height = H;
    const mx = maschera.getContext('2d', { willReadFrequently: true });
    const esiti = [];
    for (const g of raggruppa(scritte)) {
      if (pittogramma.test(g.testo) || !g.testo.trim()) continue;
      mx.setTransform(1, 0, 0, 1, 0, 0); mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H);
      let x0 = W, x1 = 0, y0 = H, y1 = 0;
      for (const s of g.pezzi) {
        mx.setTransform(...s.m); mx.font = s.font; mx.textAlign = s.align; mx.textBaseline = s.base; mx.fillStyle = '#fff';
        vero.fill.call(mx, s.t, s.x, s.y);
        const m = mx.measureText(s.t);
        const sx = s.align === 'right' ? s.x - m.width : s.align === 'center' ? s.x - m.width / 2 : s.x;
        x0 = Math.min(x0, sx - 12); x1 = Math.max(x1, sx + m.width + 12);
        y0 = Math.min(y0, s.y - (m.actualBoundingBoxAscent || 0) - 12); y1 = Math.max(y1, s.y + (m.actualBoundingBoxDescent || 0) + 12);
      }
      mx.setTransform(1, 0, 0, 1, 0, 0);
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
      const w = x1 - x0, h = y1 - y0;
      if (w < 3 || h < 3) continue;
      const d = mx.getImageData(x0, y0, w, h).data;
      const toccato = new Uint8Array(w * h), pieno = new Uint8Array(w * h);
      let bx0 = w, bx1 = -1, by0 = h, by1 = -1;
      for (let i = 0; i < w * h; i++) {
        const v = d[i * 4];
        if (v > 0) { toccato[i] = 1; const xx = i % w, yy = (i / w) | 0; bx0 = Math.min(bx0, xx); bx1 = Math.max(bx1, xx); by0 = Math.min(by0, yy); by1 = Math.max(by1, yy); }
        if (v >= 250) pieno[i] = 1;
      }
      let tMin = 1, tMax = 0, rMin = 1, rMax = 0, nT = 0, nR = 0;
      const lT = [], lR = [];
      for (let yy = 1; yy < h - 1; yy++) {
        for (let xx = 1; xx < w - 1; xx++) {
          const i = yy * w + xx;
          const gi = ((y0 + yy) * W + (x0 + xx)) * 4;
          if (pieno[i] && pieno[i - 1] && pieno[i + 1] && pieno[i - w] && pieno[i + w]) {
            const l = lum(tutta[gi], tutta[gi + 1], tutta[gi + 2]); lT.push(l); nT++;
            if (l < tMin) tMin = l; if (l > tMax) tMax = l;
          } else if (!toccato[i] && (toccato[i - 1] || toccato[i + 1] || toccato[i - w] || toccato[i + w] || toccato[i - w - 1] || toccato[i - w + 1] || toccato[i + w - 1] || toccato[i + w + 1])) {
            const l = lum(tutta[gi], tutta[gi + 1], tutta[gi + 2]); lR.push(l); nR++;
            if (l < rMin) rMin = l; if (l > rMax) rMax = l;
          }
        }
      }
      if (nT < 6 || nR < 6) continue;
      const mediana = (a) => a.sort((p, q) => p - q)[a.length >> 1];
      const chiaro = mediana(lT) > mediana(lR);
      const rapporto = chiaro ? (tMin + 0.05) / (rMax + 0.05) : (rMin + 0.05) / (tMax + 0.05);
      const s = soglia(g.font);
      esiti.push({ testo: g.testo.slice(0, 40), rapporto: Math.round(rapporto * 100) / 100, soglia: s.soglia,
        rett: { x: x0 + bx0, y: y0 + by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 } });
    }
    return { W, H, esiti, qr: grafDisposizione(c).qr };
  };

  // Un fotogramma piccolo della sola scena, per il giro: la scena non sa quanto
  // e' grande la tela, e rimpicciolirla non cambia cosa si muove.
  window.__fotogramma = (c, t) => {
    const lay = grafDisposizione(c), pal = grafTavolozza(c, lay);
    const tela = document.createElement('canvas'); tela.width = 216; tela.height = Math.round(216 * lay.H / lay.W);
    const x = tela.getContext('2d', { willReadFrequently: true });
    x.scale(216 / lay.W, 216 / lay.W);
    window.SB_SCENE.disegna(x, lay.W, lay.H, t, pal.anima, pal.scena);
    return x.getImageData(0, 0, tela.width, tela.height).data;
  };
  window.__differenza = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s; };
  window.__giro = (c) => {
    const D = grafVelocita(c).durata, N = Math.round(D / 80);
    const f = [];
    for (let i = 0; i <= N; i++) f.push(window.__fotogramma(c, i * 80));
    const passi = [];
    for (let i = 0; i < N - 1; i++) passi.push(window.__differenza(f[i], f[i + 1]));
    return { uguale: window.__differenza(f[0], f[N]) === 0, massimo: Math.max(...passi), cucitura: window.__differenza(f[N - 1], f[0]), N };
  };
  window.__vero = vero;
});

const TEMI = await pagina.evaluate(() => GR_TEMA_IDS.map((id) => ({ id, animato: !!GR_TEMI[id].anima })));
const STORIA = await pagina.evaluate(() => GR_STORIA);
const PRONTI = await pagina.evaluate(() => GR_PRONTI.map((p) => p.id));
const FASI_ANIMATE = [0.125, 0.375, 0.625, 0.875];

// I casi: ogni tema nei due tipi (il «Live ora» col QR, la settimana senza),
// in post e in storia; ogni stile pronto nei due tipi (a QR scambiati), e gli
// sfondi che non vengono dal tema.
function casi({ soloAnimati = false, pochi = false } = {}) {
  const fuori = [];
  for (const t of TEMI) {
    if (soloAnimati && !t.animato) continue;
    fuori.push({ nome: `${t.id} · settimana`, c: { tema: t.id, sfondo: 'tema', tipo: 'programmazione', qr: false }, animato: t.animato });
    fuori.push({ nome: `${t.id} · live col QR`, c: { tema: t.id, sfondo: 'tema', tipo: 'live', qr: true }, animato: t.animato });
    fuori.push({ nome: `${t.id} · storia della settimana`, c: { tema: t.id, sfondo: 'tema', tipo: 'programmazione', qr: false, formato: 'storia' }, animato: t.animato });
    fuori.push({ nome: `${t.id} · storia live col QR`, c: { tema: t.id, sfondo: 'tema', tipo: 'live', qr: true, formato: 'storia' }, animato: t.animato });
  }
  if (!soloAnimati) {
    for (const id of PRONTI) {
      fuori.push({ nome: `stile ${id} · settimana col QR`, pronto: id, c: { tipo: 'programmazione', qr: true } });
      fuori.push({ nome: `stile ${id} · live`, pronto: id, c: { tipo: 'live', qr: false } });
    }
    fuori.push({ nome: 'tinta scura', c: { tema: 'notte', sfondo: 'tinta', sfondoColore: '#1b1030', tipo: 'programmazione' }, animato: false });
    fuori.push({ nome: 'tinta chiara', c: { tema: 'notte', sfondo: 'tinta', sfondoColore: '#f2efe6', tipo: 'live', qr: true }, animato: false });
    fuori.push({ nome: 'tinta chiara in storia', c: { tema: 'notte', sfondo: 'tinta', sfondoColore: '#f2efe6', tipo: 'programmazione', qr: true, formato: 'storia' }, animato: false });
    fuori.push({ nome: 'testo grigio scelto a mano', c: { tema: 'notte', sfondo: 'tema', coloreTesto: '#8a8a8a', tipo: 'programmazione', qr: true }, animato: false });
    fuori.push({ nome: 'testo grigio sulla pioggia', c: { tema: 'pioggia', sfondo: 'tema', coloreTesto: '#8a8a8a', tipo: 'live' }, animato: true });
  }
  return pochi ? fuori.filter((x, i) => i % 5 === 0) : fuori;
}

const BASE = { titolo: '', handle: '@andryx_demo', gioco: 'Hollow Knight', sottotitolo: 'Vieni a salutare in chat!', logo: '', logoImg: '' };

async function misura(elenco) {
  const guai = { contrasto: [], posto: [], misurate: 0 };
  for (const caso of elenco) {
    const r = await pagina.evaluate(({ caso, BASE, FASI }) => {
      const pr = caso.pronto ? GR_PRONTI.find((p) => p.id === caso.pronto) : null;
      const c = { ...grafConfig(), ...BASE, ...(pr ? { ...pr.c, sfondo: 'tema' } : {}), ...caso.c };
      const fasi = grafAnimato(c) ? FASI.map((f) => f * grafVelocita(c).durata) : [0];
      return fasi.map((t) => window.__misuraGrafica(c, t));
    }, { caso, BASE, FASI: FASI_ANIMATE });
    for (const [k, m] of r.entries()) {
      for (const e of m.esiti) {
        guai.misurate++;
        if (e.rapporto < e.soglia) guai.contrasto.push(`${caso.nome} (fotogramma ${k}): «${e.testo}» ${e.rapporto}:1, ne vuole ${e.soglia}:1`);
      }
      const rr = m.esiti.map((e) => e.rett);
      for (let i = 0; i < rr.length; i++) {
        const a = rr[i];
        if (a.x < 24 || a.y < 24 || a.x + a.w > m.W - 24 || a.y + a.h > m.H - 24) guai.posto.push(`${caso.nome}: «${m.esiti[i].testo}» esce dalla tela o tocca il bordo`);
        if (m.H === STORIA.H && (a.y < STORIA.fascia || a.y + a.h > m.H - STORIA.fascia)) guai.posto.push(`${caso.nome}: «${m.esiti[i].testo}» finisce dove Instagram mette le sue scritte`);
        for (let j = i + 1; j < rr.length; j++) {
          const b = rr[j];
          if (a.x < b.x + b.w + 3 && b.x < a.x + a.w + 3 && a.y < b.y + b.h + 3 && b.y < a.y + a.h + 3) guai.posto.push(`${caso.nome}: «${m.esiti[i].testo}» tocca «${m.esiti[j].testo}»`);
        }
        const q = m.qr;
        if (q && a.x < q.x + q.w && q.x < a.x + a.w && a.y < q.y + q.h && q.y < a.y + a.h) guai.posto.push(`${caso.nome}: «${m.esiti[i].testo}» finisce sotto il QR`);
      }
      if (k === 0) break;
    }
    if (r.length > 1) {
      for (const [k, m] of r.entries()) {
        if (k === 0) continue;
        for (const e of m.esiti) {
          guai.misurate++;
          if (e.rapporto < e.soglia) guai.contrasto.push(`${caso.nome} (fotogramma ${k}): «${e.testo}» ${e.rapporto}:1, ne vuole ${e.soglia}:1`);
        }
      }
    }
  }
  return guai;
}

async function giri(elenco) {
  const guai = [];
  let visti = 0;
  for (const t of elenco) {
    for (const velocita of ['lenta', 'normale', 'veloce']) {
      const r = await pagina.evaluate(({ id, velocita }) => window.__giro({ ...grafConfig(), tema: id, sfondo: 'tema', tipo: 'programmazione', velocita }), { id: t.id, velocita });
      visti++;
      if (!r.uguale) guai.push(`${t.id} (${velocita}): a fine giro il fotogramma non e' il primo`);
      if (r.cucitura > r.massimo * 1.5 + 1000) guai.push(`${t.id} (${velocita}): il passo che chiude il giro (${r.cucitura}) e' piu' grande dei passi normali (al massimo ${r.massimo}): lo scatto si vede`);
    }
  }
  return { guai, visti };
}

async function synthwave() {
  return pagina.evaluate(() => {
    const guai = [];
    const S = window.SB_SCENE;
    const oStoria = (tipo) => grafDisposizione({ tipo, formato: 'storia' }).orizzonte;
    const prove = [['settimana poster', 1080, 1350, { orizzonte: 430 }, 'poster'], ['live poster', 1080, 1080, { orizzonte: 560 }, 'poster'],
      ['settimana classica', 1080, 1350, { orizzonte: 430 }, 'classica'], ['live classica', 1080, 1080, { orizzonte: 560 }, 'classica'],
      ['storia della settimana', 1080, 1920, { orizzonte: oStoria('programmazione') }, 'poster'], ['storia live', 1080, 1920, { orizzonte: oStoria('live') }, 'classica']];
    for (const [nome, W, H, lay, composizione] of prove) {
      const g = S.geometriaSynth(W, H, { lay, op: { composizione } });
      if (!(g.yV > g.cy - g.R && g.yV < g.yOr)) guai.push(`${nome}: il punto di fuga (${g.yV.toFixed(1)}) non sta dentro il sole`);
      const r0 = S.grigliaSynth(g.cam, 0, g.passo, g.n), r1 = S.grigliaSynth(g.cam, 1, g.passo, g.n);
      for (const l of r0.lon) {
        const x = l.x1 + (l.x2 - l.x1) * (g.yV - l.y1) / (l.y2 - l.y1);
        if (Math.abs(x - W / 2) > 0.01) { guai.push(`${nome}: una linea del pavimento non va al punto di fuga`); break; }
      }
      const orizz = r0.lon.map((l) => l.x1).sort((a, b) => a - b);
      const passo = orizz[1] - orizz[0];
      if (passo < 8) guai.push(`${nome}: all'orizzonte le linee sono attaccate (${passo.toFixed(1)} px)`);
      if (orizz[0] > 0 || orizz[orizz.length - 1] < W) guai.push(`${nome}: le linee non coprono tutto l'orizzonte`);
      const ys = r0.tr.map((t) => t.y).sort((a, b) => a - b);
      for (let i = 2; i < ys.length; i++) if (ys[i] - ys[i - 1] < ys[i - 1] - ys[i - 2] - 1e-9) { guai.push(`${nome}: le trasversali non si infittiscono verso l'orizzonte`); break; }
      if (ys[0] < g.yOr - 1e-6 || ys[ys.length - 1] > H + 1e-6) guai.push(`${nome}: una trasversale esce dal pavimento`);
      const k = (r) => r.tr.map((t) => t.y.toFixed(4)).sort().join(' ');
      if (k(r0) !== k(r1)) guai.push(`${nome}: dopo un giro le trasversali non sono dove erano`);
    }
    return guai;
  });
}

// Scrivere nella scheda. La scheda si aggancia una volta sola: un ingresso che
// riagganciasse i comandi farebbe ridisegnare l'anteprima una volta in piu' a
// ogni lettera (e partire due volte «Salva» e «Scarica»). Si entra tre volte,
// si scrive con una lettera ogni 150 ms, e si contano i disegni: al piu' uno
// per lettera, e l'ultimo col testo scritto. Poi si esce con una scena
// animata, e la tela non si deve piu' disegnare.
// `riaggancia` e `nonEsce` sono le rotture dell'autoprova: la prima toglie il
// segno dell'aggancio a ogni ingresso, la seconda fa credere all'animazione di
// essere ancora nella scheda.
async function scrivere({ riaggancia = false, nonEsce = false } = {}) {
  const parola = 'Hades';
  for (let visita = 1; visita <= 3; visita++) {
    await pagina.evaluate((riaggancia) => {
      const tela = document.getElementById('gr-canvas');
      if (riaggancia && tela) delete tela.dataset.collegato;
      window.SB_APP.vai('grafiche');
    }, riaggancia);
    await pagina.waitForFunction(() => (document.querySelector('.pannello-scheda.visibile') || {}).id === 'scheda-grafiche');
    await pagina.evaluate(() => { document.querySelector('[data-gr-tipo="live"]').click(); document.querySelector('[data-gr-tema="notte"]').click(); });
    await pagina.waitForTimeout(300);
    if (visita < 3) await pagina.evaluate(() => { azzeraBarraSalva(); window.SB_APP.vai('stato'); });
  }
  await pagina.fill('#gr-gioco', '');
  await pagina.waitForTimeout(200);
  await pagina.evaluate(() => {
    window.__mostre = 0; window.__mostraVera = grafMostra;
    grafMostra = (cv, c, ...r) => { window.__mostre++; window.__scritto = c && c.gioco; return window.__mostraVera(cv, c, ...r); };
  });
  await pagina.focus('#gr-gioco');
  await pagina.keyboard.type(parola, { delay: 150 });
  await pagina.waitForTimeout(250);
  const { disegni, scritto } = await pagina.evaluate(() => { grafMostra = window.__mostraVera; return { disegni: window.__mostre, scritto: window.__scritto }; });

  await pagina.evaluate(() => document.querySelector('[data-gr-tema="synthwave"]').click());
  await pagina.waitForTimeout(300);
  await pagina.evaluate((nonEsce) => {
    azzeraBarraSalva(); window.SB_APP.vai('stato');
    if (nonEsce) schedaAttiva = 'grafiche';
  }, nonEsce);
  await pagina.waitForTimeout(200);
  await pagina.evaluate(() => {
    window.__fuori = 0; window.__disegnaVero = grafDisegna;
    grafDisegna = (cv, ...r) => { if (cv && cv.id === 'gr-canvas') window.__fuori++; return window.__disegnaVero(cv, ...r); };
  });
  await pagina.waitForTimeout(500);
  const fuori = await pagina.evaluate(() => { grafDisegna = window.__disegnaVero; schedaAttiva = 'stato'; return window.__fuori; });
  const guai = [];
  if (disegni > parola.length) guai.push(`${parola.length} lettere hanno fatto ${disegni} disegni dell'anteprima`);
  if (!disegni || scritto !== parola) guai.push(`l'ultima anteprima non ha il testo scritto (${disegni} disegni, l'ultima con «${scritto ?? ''}»)`);
  if (fuori) guai.push(`fuori dalla scheda la tela si e' disegnata ${fuori} volte in mezzo secondo`);
  return { guai, disegni, fuori, lettere: parola.length };
}

const righe = [];
const dice = (ok, testo) => { righe.push(`  ${ok ? '✓' : '✗'} ${testo}`); return ok; };

if (SELFTEST) {
  // Le rotture che il cancello deve vedere. Ognuna si mette, si misura, si
  // toglie: se una passa inosservata, il cancello non vale niente.
  const animati = casi({ soloAnimati: true });
  let ok = true;
  await pagina.evaluate(() => { window.__strokeVero = CanvasRenderingContext2D.prototype.strokeText; CanvasRenderingContext2D.prototype.strokeText = function () {}; });
  const senzaContorno = await misura(animati);
  await pagina.evaluate(() => { CanvasRenderingContext2D.prototype.strokeText = window.__strokeVero; });
  ok = dice(senzaContorno.contrasto.length > 0, `senza contorni le scritte sulle scene si leggono male, e si vede (${senzaContorno.contrasto.length} scritte)`) && ok;

  await pagina.evaluate(() => { window.__decidiVero = grafDecidi; grafDecidi = (pal, campioni, colori) => ({ contorno: false, colori }); });
  const senzaDecidere = await misura([{ nome: 'testo grigio', c: { tema: 'notte', sfondo: 'tema', coloreTesto: '#8a8a8a', tipo: 'programmazione' }, animato: false }]);
  await pagina.evaluate(() => { grafDecidi = window.__decidiVero; });
  ok = dice(senzaDecidere.contrasto.length > 0, `un grigio lasciato com'e' sul fondo scuro si vede (${senzaDecidere.contrasto.length} scritte)`) && ok;

  await pagina.evaluate(() => { window.__disegnaVero = SB_SCENE.disegna; SB_SCENE.disegna = (ctx, W, H, t, id, p) => window.__disegnaVero(ctx, W, H, t, id, { ...p, durata: p.durata * 1.1 }); });
  const rotto = await giri(TEMI.filter((t) => t.animato));
  await pagina.evaluate(() => { SB_SCENE.disegna = window.__disegnaVero; });
  ok = dice(rotto.guai.length > 0, `un giro che non torna su se stesso si vede (${rotto.guai.length} casi)`) && ok;

  await pagina.evaluate(() => { window.__dispVero = grafDisposizione; grafDisposizione = (c) => { const l = window.__dispVero(c); if (l.sotto && l.qr) l.sotto = { ...l.sotto, x: l.qr.x - 40, base: l.qr.y + 70 }; return l; }; });
  const storta = await misura([{ nome: 'sottotitolo sotto il QR', c: { tema: 'notte', sfondo: 'tema', tipo: 'live', qr: true }, animato: false }]);
  await pagina.evaluate(() => { grafDisposizione = window.__dispVero; });
  ok = dice(storta.posto.length > 0, `una scritta messa sotto il QR si vede (${storta.posto.length} guai)`) && ok;

  await pagina.evaluate(() => { window.__dispVero = grafDisposizione; grafDisposizione = (c) => (c.formato === 'storia' ? { ...window.__dispVero({ ...c, formato: 'post' }), H: GR_STORIA.H, storia: true } : window.__dispVero(c)); });
  const inAlto = await misura([{ nome: 'storia col post in cima', c: { tema: 'notte', sfondo: 'tema', tipo: 'programmazione', formato: 'storia' }, animato: false }]);
  await pagina.evaluate(() => { grafDisposizione = window.__dispVero; });
  ok = dice(inAlto.posto.some((g) => g.includes('Instagram')), `una storia con le scritte sotto la barra di Instagram si vede (${inAlto.posto.length} guai)`) && ok;

  await pagina.evaluate(() => { window.__grigliaVera = SB_SCENE.grigliaSynth; SB_SCENE.grigliaSynth = (cam, fase, passo, n) => { const r = window.__grigliaVera(cam, fase, passo, n); r.lon = r.lon.map((l) => ({ ...l, x1: cam.W / 2 })); return r; }; });
  const raggi = await synthwave();
  await pagina.evaluate(() => { SB_SCENE.grigliaSynth = window.__grigliaVera; });
  ok = dice(raggi.length > 0, `le linee che partono tutte da un punto, come raggi, si vedono (${raggi.length} guai)`) && ok;

  // Prima l'animazione che non si ferma, a scheda agganciata una volta sola;
  // poi i riagganci, che lasciano la pagina sporca e vanno per ultimi.
  const sveglia = await scrivere({ nonEsce: true });
  ok = dice(sveglia.fuori > 0 && sveglia.disegni <= sveglia.lettere, `un'animazione che gira fuori dalla scheda si vede (${sveglia.fuori} disegni in mezzo secondo)`) && ok;
  const doppio = await scrivere({ riaggancia: true });
  ok = dice(doppio.disegni > doppio.lettere, `una scheda che si riaggancia a ogni ingresso si vede (${doppio.lettere} lettere, ${doppio.disegni} disegni)`) && ok;

  const pulito = await misura(casi({ pochi: true }));
  ok = dice(!pulito.contrasto.length && !pulito.posto.length, `e senza rotture, i casi che provo passano (${pulito.misurate} scritte misurate)`) && ok;
  console.log('Collaudo del collaudo delle grafiche:\n' + righe.join('\n'));
  await browser.close(); sito.chiudi();
  console.log(ok ? '\nIl cancello vede le rotture. ✓' : '\nIl cancello ha lasciato passare una rottura. ✗');
  process.exit(ok ? 0 : 1);
}

const m = await misura(casi());
dice(!m.contrasto.length, `ogni scritta si legge: ${m.misurate} scritte misurate sui pixel, in ${TEMI.length} temi (post e storia), ${PRONTI.length} stili pronti e 5 sfondi fuori tema`);
for (const g of m.contrasto.slice(0, 12)) righe.push('      ' + g);
dice(!m.posto.length, 'ogni scritta sta al suo posto: niente si tocca, niente sotto il QR, niente fuori dalla tela, e nella storia niente sotto le scritte di Instagram');
for (const g of m.posto.slice(0, 12)) righe.push('      ' + g);
const gg = await giri(TEMI.filter((t) => t.animato));
dice(!gg.guai.length, `ogni scena gira senza scatti: ${gg.visti} giri, a tutte e tre le velocita'`);
for (const g of gg.guai.slice(0, 12)) righe.push('      ' + g);
const sw = await synthwave();
dice(!sw.length, 'il pavimento del synthwave e\' in prospettiva: le linee escono da tutto l\'orizzonte e vanno al punto di fuga dentro il sole');
for (const g of sw) righe.push('      ' + g);
const sc = await scrivere();
dice(!sc.guai.length, `scrivere nella scheda: entrata tre volte, ${sc.lettere} lettere fanno ${sc.disegni} disegni dell'anteprima, e fuori dalla scheda la tela si ferma`);
for (const g of sc.guai) righe.push('      ' + g);
dice(!errori.length, 'la pagina non ha errori' + (errori.length ? ': ' + errori.slice(0, 3).join(' | ') : ''));

await browser.close(); sito.chiudi();
console.log('Le grafiche social:\n' + righe.join('\n'));
const rosso = m.contrasto.length || m.posto.length || gg.guai.length || sw.length || sc.guai.length || errori.length;
console.log(rosso ? '\ncancello ROSSO ✗' : '\nQuello che si pubblica si legge, e gira. ✓');
process.exit(rosso ? 1 : 0);
