// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL QR SU MISURA IN OGNI GRAFICA CHE ESCE (docs/GRAFICHE.md, docs/STRUMENTI.md).
//
// Il difetto di prima: le immagini che uscivano dal pannello si fotografavano
// subito, e il QR col tuo stile arrivava dopo (il logo e la penna si caricano
// da soli). La storia «Live ora» e quelle di prima della diretta uscivano
// sempre col QR senza logo, o di serie. Adesso:
//  · una funzione sola decide il QR di una grafica (qrPronto), e aspetta il
//    motore della penna e il logo;
//  · un'immagine esce solo da grafEsporta: aspetta il QR della SUA misura, lo
//    disegna senza ingrandire una bitmap, codifica, e rilegge il QR
//    nell'immagine che esce, JPEG compresa;
//  · le storie che escono da sole si disegnano con lo stile che dice il server,
//    e ne rimandano la firma.
// Qui si prova il pannello: il codice vero di app.js, tirato fuori pezzo per
// pezzo e fatto girare in un contesto finto. Il motore del QR e' quello vero
// (qr.js e penna.js), e la tela finta disegna davvero i suoi tracciati.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

await import('../../src/web/public/qr.js');
await import('../../src/web/public/penna.js');
const Q = globalThis.SB_QR;
const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');

// Un pezzo di app.js per nome: una funzione intera, o una dichiarazione di una
// riga (o un oggetto su piu' righe) al primo livello.
function pezzo(nome) {
  const m = new RegExp(`^(?:async function|function|const|let) ${nome}\\b`, 'm').exec(APP);
  assert.ok(m, `in app.js non c'e' «${nome}»`);
  const da = m.index, riga = APP.indexOf('\n', da);
  if (/^(async )?function/.test(m[0])) return APP.slice(da, APP.indexOf('\n}\n', da) + 2);
  if (APP.slice(da, riga).trimEnd().endsWith(';')) return APP.slice(da, riga + 1);
  const fini = ['\n};\n', '\n});\n'].map((f) => APP.indexOf(f, da)).filter((x) => x > 0);
  return APP.slice(da, Math.min(...fini) + 4);
}
const contesto = (globali, nomi) => {
  const ctx = vm.createContext({ L: (it) => it, console, ...globali });
  vm.runInContext(nomi.map(pezzo).join('\n'), ctx);
  return ctx;
};
const prendi = (ctx, nome) => vm.runInContext(nome, ctx);

// Le funzioni di primo livello, col loro corpo.
const FUNZIONI = (() => {
  const fuori = new Map();
  for (const m of APP.matchAll(/^(?:async )?function (\w+)\(/gm)) fuori.set(m[1], APP.slice(m.index, APP.indexOf('\n}\n', m.index) + 2));
  return fuori;
})();

test('un\'immagine di una grafica si codifica solo dentro grafEsporta', () => {
  assert.ok(!/function grafJpeg\(|grafJpeg\(/.test(APP), 'la fotografia sincrona non c\'e\' piu\'');
  let viste = 0;
  for (const [nome, corpo] of FUNZIONI) {
    const disegnate = new Set([...corpo.matchAll(/graf(?:Disegna|Mostra)\((\w+)/g)].map((m) => m[1]));
    const codificate = [...corpo.matchAll(/(\w+)\.(?:toDataURL|toBlob)\(/g)].map((m) => m[1]);
    if (!disegnate.size) continue;
    viste++;
    if (nome === 'grafEsporta') {
      assert.ok(codificate.length && codificate.every((x) => disegnate.has(x)), 'grafEsporta codifica la tela che ha disegnato');
      continue;
    }
    for (const x of codificate) assert.ok(!disegnate.has(x), `${nome}: «${x}» e' una grafica e si codifica fuori da grafEsporta`);
  }
  assert.ok(viste >= 5, 'le funzioni che disegnano grafiche si trovano');
  const es = FUNZIONI.get('grafEsporta');
  assert.ok(es.indexOf('await qrPronto(') < es.indexOf('grafDisegna(tela'), 'prima il QR pronto della sua misura, poi il disegno');
  assert.ok(es.includes('_esporta: true, _qr: voce'), 'il disegno riceve la voce pronta');
  assert.ok(es.includes('await _grafRileggiQr(blob || url, posto)'), 'e il QR si rilegge nell\'immagine che esce, decodificata');
});

test('ogni uscita passa da grafEsporta, e la si aspetta', () => {
  const chiamate = [...APP.matchAll(/grafEsporta\(/g)].map((m) => APP.slice(Math.max(0, m.index - 16), m.index));
  assert.ok(chiamate.length >= 8, `chiamate: ${chiamate.length}`);
  for (const prima of chiamate) assert.ok(/(await \(?|async function )$/.test(prima) || /await $/.test(prima), `una grafEsporta non aspettata: «…${prima}grafEsporta(»`);
  const strade = {
    'la storia «Live ora»': "await grafEsporta({ ...c, tipo: 'live', formato: 'storia' }, { stile: _autoStile(v) })",
    'le storie prima della diretta e la settimana': 'await grafEsporta(cc, { stile })',
    '«Manda» della Settimana': "(await grafEsporta({ ...c, formato: 'post' })).url",
    'la storia di «Manda»': "(await grafEsporta({ ...c, formato: 'storia' })).url",
    '«Metti nella storia»': "await grafEsporta({ ...c, formato: 'storia' });",
    'Scarica PNG, a scala 2': "await grafEsporta(c, { scala: 2, formato: 'png' })",
    'Condividi, a scala 2': 'await grafEsporta(c, { scala: 2, qualita: 0.92 })',
  };
  for (const [cosa, testo] of Object.entries(strade)) assert.ok(APP.includes(testo), cosa);
  const gif = APP.slice(APP.indexOf("getElementById('gr-scarica-gif')"), APP.indexOf("getElementById('gr-scarica-video')"));
  assert.ok(gif.indexOf('await qrPronto(') > 0 && gif.indexOf('await qrPronto(') < gif.indexOf('grafDisegna(full, cg, 0)'), 'la GIF fissa il QR prima del primo fotogramma');
  assert.ok(gif.includes('_esporta: true, _qr: voce'), 'e tutti i fotogrammi hanno quello');
  const video = APP.slice(APP.indexOf("getElementById('gr-scarica-video')"), APP.indexOf('function problemaHtml('));
  assert.ok(video.indexOf('await qrPronto(') > 0 && video.indexOf('await qrPronto(') < video.indexOf('rec.start()'), 'il video parte solo col QR pronto');
});

test('caricaMotoreQr: un <script> solo, una promessa sola, il fallimento ricordato un minuto', async () => {
  const corpo = FUNZIONI.get('caricaMotoreQr');
  assert.equal((corpo.match(/createElement\('script'\)/g) || []).length, 1);
  let ora = 1_000_000;
  const script = [], timer = [], dimenticati = [];
  const finestra = {};
  const ctx = contesto({
    window: finestra,
    Date: { now: () => ora },
    setTimeout: (f) => { timer.push(f); return timer.length; },
    clearTimeout: () => {},
    document: { createElement: () => ({ remove() { this.via = true; } }), head: { appendChild: (s) => script.push(s) } },
    _qrDimentica: (m) => dimenticati.push(m),
  }, ['QR_MOTORE_ATTESA_MS', 'QR_MOTORE_RIPROVA_MS', '_qrMotore', '_qrMotoreKo', 'caricaMotoreQr']);
  const carica = prendi(ctx, 'caricaMotoreQr');
  const a = carica(), b = carica();
  assert.equal(a, b, 'chi chiede mentre si carica riceve la stessa promessa');
  assert.equal(script.length, 1, 'e c\'e\' un <script> solo');
  script[0].onerror();
  assert.equal(await a, false, 'se non arriva, si dice: false, non un errore');
  assert.equal(await carica(), false);
  assert.equal(script.length, 1, 'per un minuto non si riprova');
  ora += 61_000;
  const c = carica();
  assert.equal(script.length, 2, 'dopo un minuto si riprova');
  finestra.SB_PENNA = {};
  script[1].onload();
  assert.equal(await c, true);
  assert.equal(await carica(), true);
  assert.equal(script.length, 2, 'col motore arrivato nessun altro <script>');
  delete finestra.SB_PENNA;
  ora += 61_000;
  const d = carica();
  timer.at(-1)();
  assert.equal(await d, false, 'un motore che non risponde dentro il tempo vale come non arrivato');
  finestra.SB_PENNA = {};
  script[2].onload();
  assert.deepEqual(dimenticati, ['penna'], 'se poi arriva, i QR fatti senza penna si rifanno');
});

test('il logo aspetta al massimo il suo tempo, e un fallimento si ricorda poco', async () => {
  let ora = 5_000_000;
  const timer = [], dimenticati = [], arrivi = [];
  const ctx = contesto({
    Date: { now: () => ora },
    setTimeout: (f) => { timer.push(f); return timer.length; },
    clearTimeout: () => {},
    stato: { user: { login: 'andryx' } },
    QR_STATO: { loghi: new Map() },
    _qrDimentica: (m) => dimenticati.push(m),
    _qrImmagine: () => new Promise((ok, ko) => arrivi.push({ ok, ko })),
    document: { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/png;base64,AA' }) },
  }, ['QR_LOGO_ATTESA_MS', 'QR_LOGO_RIPROVA_MS', '_qrLogoSrc', '_qrLogoPronto', '_qrLogo']);
  const logo = prendi(ctx, '_qrLogo'), pronto = prendi(ctx, '_qrLogoPronto'), src = prendi(ctx, '_qrLogoSrc');
  const st = { logo: 'foto' };
  assert.equal(src(st), '/u/andryx/avatar');
  assert.equal(src({ logo: 'foto', foto: '0123456789abcdef' }), '/u/andryx/avatar?v=0123456789abcdef', 'con la firma del server la foto nuova non arriva dalla cache');
  const a = logo(st);
  assert.equal(logo(st), a, 'una richiesta sola alla volta');
  timer[0]();
  assert.equal(await a, null, 'dopo il tempo massimo si va avanti senza logo');
  assert.equal(await logo(st), null, 'e per un po\' non si richiede');
  assert.equal(arrivi.length, 1);
  arrivi[0].ok({ naturalWidth: 64, naturalHeight: 32 });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(dimenticati, ['logo-assente'], 'arrivato tardi, i QR fatti senza logo si rifanno');
  assert.ok(pronto(st), 'e da adesso c\'e\'');
  assert.equal((await logo(st)).w, 64);
  const b = logo({ logo: 'immagine', logoImg: 'data:image/png;base64,BB' });
  arrivi[1].ko(new Error('rotta'));
  assert.equal(await b, null);
  ora += 31_000;
  logo({ logo: 'immagine', logoImg: 'data:image/png;base64,BB' });
  assert.equal(arrivi.length, 3, 'passato poco, si riprova');
});

// ── una tela finta che disegna davvero ─────────────────────────────────────
function contorni(d) {
  const t = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [], out = [];
  let cur = null, x = 0, y = 0, sx = 0, sy = 0, i = 0, cmd = '';
  const num = () => Number(t[i++]);
  const va = (px, py) => { cur.push([px, py]); x = px; y = py; };
  const curva = (f) => { for (let k = 1; k <= 16; k++) va(...f(k / 16)); };
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    if (cmd === 'M') { cur = []; out.push(cur); va(num(), num()); sx = x; sy = y; cmd = 'L'; }
    else if (cmd === 'L') va(num(), num());
    else if (cmd === 'h') va(x + num(), y);
    else if (cmd === 'v') va(x, y + num());
    else if (cmd === 'Q') { const [a, b, c, e, x0, y0] = [num(), num(), num(), num(), x, y]; curva((u) => [(1 - u) ** 2 * x0 + 2 * (1 - u) * u * a + u * u * c, (1 - u) ** 2 * y0 + 2 * (1 - u) * u * b + u * u * e]); }
    else if (cmd === 'C') { const [a, b, c, e, f, g, x0, y0] = [num(), num(), num(), num(), num(), num(), x, y]; curva((u) => [(1 - u) ** 3 * x0 + 3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u * u * c + u ** 3 * f, (1 - u) ** 3 * y0 + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u * u * e + u ** 3 * g]); }
    else if (cmd === 'a') {
      const r = num(); num(); num(); num(); const verso = num(), dx = num(), dy = num();
      const cx = x + dx / 2, cy = y + dy / 2, a0 = Math.atan2(y - cy, x - cx), giro = verso ? Math.PI : -Math.PI;
      curva((u) => [cx + r * Math.cos(a0 + giro * u), cy + r * Math.sin(a0 + giro * u)]);
    } else if (cmd === 'Z' || cmd === 'z') { va(sx, sy); cmd = ''; }
    else throw new Error('comando ' + cmd);
  }
  return out;
}
const rgb = (h) => [1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16));
globalThis.Path2D = class { constructor(d) { this.d = d; } };
class Tela {
  constructor() { this.width = 0; this.height = 0; this.op = []; this.guasta = false; }
  getContext() { return new Pennello(this); }
}
class Pennello {
  constructor(t) { this.canvas = t; this.fillStyle = '#000000'; }
  save() {} restore() {}
  fillRect(x, y, w, h) { this.canvas.op.push(['r', this.fillStyle, x, y, w, h]); }
  fill(p, regola) { this.canvas.op.push(['p', this.fillStyle, p.d, regola === 'evenodd']); }
  getImageData() {
    const { width: W, height: H } = this.canvas, data = new Uint8ClampedArray(W * H * 4);
    const metti = (i, c) => { data.set([c[0], c[1], c[2], 255], i * 4); };
    for (const [tipo, colore, ...a] of this.canvas.op) {
      const c = rgb(colore);
      if (tipo === 'r') { for (let y = Math.max(0, a[1]); y < Math.min(H, a[1] + a[3]); y++) for (let x = Math.max(0, a[0]); x < Math.min(W, a[0] + a[2]); x++) metti(y * W + x, c); continue; }
      const righe = Array.from({ length: H }, () => []);
      for (const pt of contorni(a[0])) {
        if (pt.length && (pt[0][0] !== pt.at(-1)[0] || pt[0][1] !== pt.at(-1)[1])) pt.push(pt[0]);
        for (let k = 1; k < pt.length; k++) {
          const [xa, ya] = pt[k - 1], [xb, yb] = pt[k];
          if (ya === yb) continue;
          for (let r = Math.max(0, Math.ceil(Math.min(ya, yb) - 0.5)); r <= Math.min(H - 1, Math.ceil(Math.max(ya, yb) - 0.5) - 1); r++) righe[r].push([xa, ya, xb, yb]);
        }
      }
      righe.forEach((lati, r) => {
        const yc = r + 0.5;
        const tagli = lati.map(([xa, ya, xb, yb]) => ({ x: xa + ((yc - ya) * (xb - xa)) / (yb - ya), v: yb > ya ? 1 : -1 })).sort((p, q) => p.x - q.x);
        let w = 0;
        for (let i = 0; i + 1 < tagli.length; i++) {
          w = a[1] ? w ^ 1 : w + tagli[i].v;
          if (w) for (let x = Math.max(0, Math.ceil(tagli[i].x - 0.5)); x < Math.min(W, Math.ceil(tagli[i + 1].x - 0.5)); x++) metti(r * W + x, c);
        }
      });
    }
    if (this.canvas.guasta) for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = (i / 4) % 3 ? 255 : 0;
    return { width: W, height: H, data };
  }
}

const motoreVero = (guasta = false) => contesto({
  window: { SB_QR: Q },
  document: { createElement: () => Object.assign(new Tela(), { guasta }) },
}, ['_qrFai']);

test('_qrFai: il QR della grafica si disegna alla sua misura, a ogni scala, e si rilegge li\'', () => {
  const fai = prendi(motoreVero(), '_qrFai');
  const full = 'https://socialbot.live/u/andryx_demo';
  const mio = { moduli: 'penna', occhi: 'tondi', scuro: '#1d2a6b', chiaro: '#ffffff', occhio: '', logo: 'no', logoLato: 100, seme: 'qr:andryx_demo' };
  for (const P of [180, 190]) for (const s of [1, 2]) {
    const v = fai(full, P, s, mio, { penna: true, logo: null });
    const m1 = Q.geometria(v.p, P).m;
    assert.deepEqual([v.gradino, v.legge, v.geo.m, v.tela.width, v.lato1], ['tuo', true, m1 * s, v.lato1 * s, Q.geometria(v.p, P).W], `${P} px a scala ${s}: il modulo cresce intero, non si ingrandisce una bitmap`);
    assert.ok(v.lato1 <= P, 'e sta nel suo riquadro');
  }
  const morbido = fai(full, 180, 1, mio, { penna: false, logo: null });
  assert.deepEqual([morbido.gradino, morbido.motivo, morbido.legge, morbido.p.stile.moduli], ['morbido', 'penna', true, 'morbidi'], 'senza penna, morbido e detto');
  const colori = fai(full, 180, 1, { ...mio, scuro: '#f0f0f0' }, { penna: true, logo: null });
  assert.deepEqual([colori.gradino, colori.motivo, colori.legge], ['serie', 'colori', true]);
  const rotto = prendi(motoreVero(true), '_qrFai')(full, 180, 1, mio, { penna: true, logo: null });
  assert.deepEqual([rotto.gradino, rotto.legge], ['serie', false], 'se nessun gradino si rilegge lo si sa: legge e\' falso, e niente esce');
});

test('qrPronto: una voce per chiave, al piu\' otto, la provvisoria finche\' non e\' pronta, e lo si annuncia', async () => {
  let ora = 0, penna = null;
  const eventi = [], fatte = [];
  const ctx = contesto({
    window: {},
    Date: { now: () => ora },
    CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o?.detail; } },
    document: { dispatchEvent: (e) => eventi.push(e) },
    qrStileSalvato: () => ({ firma: 'f0', moduli: 'quadrati', occhi: 'quadrati', logo: 'no' }),
    _qrFai: (full, P, scala, st, o) => { fatte.push([full, P, scala, o.penna]); return { tela: {}, gradino: o.penna ? 'tuo' : 'morbido', motivi: o.penna ? [] : ['penna'], legge: true, lato1: 150, p: {} }; },
    caricaMotoreQr: () => new Promise((ok) => { penna = ok; }),
    _qrLogo: async () => null,
    _qrLogoPronto: () => null,
    QR_MOTORE_RIPROVA_MS: 60_000, QR_LOGO_RIPROVA_MS: 30_000,
  }, ['QR_VOCI_MAX', '_qrVoci', '_qrChiave', 'qrPronto', '_grQrTela']);
  const pronto = prendi(ctx, 'qrPronto'), tela = prendi(ctx, '_grQrTela'), voci = prendi(ctx, '_qrVoci');
  const st = { firma: 'f0', moduli: 'quadrati', occhi: 'quadrati', logo: 'no' };
  const a = pronto('https://x', 180, 1, st);
  assert.equal(pronto('https://x', 180, 1, st), a, 'la stessa chiave, la stessa promessa');
  assert.equal(fatte.length, 1, 'e un disegno solo');
  assert.equal((await a).chiave, 'https://x|180|1|f0', 'la chiave e\' leggera: indirizzo, misura, scala, firma dello stile');
  for (let i = 0; i < 12; i++) await pronto('https://x/' + i, 180, 1, st);
  assert.equal(voci.size, 8, 'al piu\' otto voci');
  assert.ok(!voci.has('https://x|180|1|f0'), 'se ne va la piu\' vecchia');
  const penn = { firma: 'f1', moduli: 'penna', occhi: 'quadrati', logo: 'no' };
  const prima = tela('https://x', 190, 2, penn);
  assert.equal(prima.provvisoria, true, 'l\'anteprima non aspetta: intanto la provvisoria');
  assert.equal(tela('https://x', 190, 2, penn), prima, 'una provvisoria sola, non una a fotogramma');
  ctx.window.SB_PENNA = {};
  penna(true);
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(eventi.map((e) => [e.type, e.detail.chiave]), [['sb-qr-pronto', 'https://x|190|2|f1']], 'quando e\' pronta lo si annuncia');
  assert.equal(tela('https://x', 190, 2, penn).gradino, 'tuo', 'e l\'anteprima ridisegnata ha quella vera');
  delete ctx.window.SB_PENNA;
  const giu = { firma: 'f2', moduli: 'penna', occhi: 'quadrati', logo: 'no' };
  const p1 = pronto('https://x', 180, 1, giu);
  penna(false);
  assert.equal((await p1).gradino, 'morbido');
  assert.equal(pronto('https://x', 180, 1, giu), p1, 'un gradino dovuto a un guasto si tiene per un po\'');
  ora += 61_000;
  assert.notEqual(pronto('https://x', 180, 1, giu), p1, 'poi si riprova');
});

test('grafQr: in un\'esportazione senza la voce pronta della sua chiave non si disegna, si dice', () => {
  const chiamate = [];
  const pennello = { canvas: {}, save() { chiamate.push(['save']); }, restore() { chiamate.push(['restore']); }, clip() {}, fill() {}, setTransform(...a) { chiamate.push(['setTransform', ...a]); }, drawImage(t, x, y) { chiamate.push(['drawImage', x, y]); } };
  const st = { firma: 'ff' };
  const ctx = contesto({
    window: { SB_QR: {} },
    grafUrlCanale: () => 'socialbot.live/u/andryx',
    qrStileSalvato: () => st,
    _grQrTela: () => { throw new Error('anteprima rotta'); },
    _grafSegna() {}, grRoundRect() {}, grafScritta() {}, grClip: (c, t) => t, GR_BASE: 'x',
  }, ['_qrChiave', 'grafQr']);
  const grafQr = prendi(ctx, 'grafQr'), chiave = prendi(ctx, '_qrChiave');
  const lay = { qr: { x: 794, y: 1096, w: 190, h: 190, url: { x: 96, base: 1200, max: 600, px: 36, peso: 700 } } };
  const full = 'https://socialbot.live/u/andryx';
  const voce = (scala, extra = {}) => ({ tela: {}, chiaro: '#fff', lato1: 185, chiave: chiave(full, 190, scala, st), ...extra });
  assert.throws(() => grafQr(pennello, 1, {}, { _esporta: true, _qr: null }, lay), /qr-non-pronto/, 'senza voce');
  assert.throws(() => grafQr(pennello, 1, {}, { _esporta: true, _qr: voce(1, { provvisoria: true }) }, lay), /qr-non-pronto/, 'con la provvisoria');
  assert.throws(() => grafQr(pennello, 2, {}, { _esporta: true, _qr: voce(1) }, lay), /qr-non-pronto/, 'con la voce di un\'altra scala');
  assert.doesNotThrow(() => grafQr(pennello, 1, {}, {}, lay), 'un\'anteprima non si rompe mai');
  chiamate.length = 0;
  grafQr(pennello, 2, {}, { _esporta: true, _qr: voce(2), _qrStile: st }, lay);
  const i = chiamate.findIndex((c) => c[0] === 'drawImage');
  assert.deepEqual(chiamate[i - 1], ['setTransform', 1, 0, 0, 1, 0, 0], 'il QR si posa a trasformazione azzerata');
  assert.deepEqual(chiamate[i], ['drawImage', Math.round((794 + 2.5) * 2), Math.round((1096 + 2.5) * 2)], 'al pixel intero della sua misura logica');
  const posto = pennello.canvas._qrPosto;
  assert.deepEqual([posto.x, posto.y, posto.voce.chiave], [1593, 2197, chiave(full, 190, 2, st)], 'e dice dove, per la rilettura');
});

test('le storie dallo stato del server: la firma rimandata, il 409 rilegge e ridisegna una volta, un giro alla volta', async () => {
  const mandate = [], stili = [];
  let riletture = 0, risposte = [], inizio = null;
  const vista = (firma) => ({ conf: { prima: { attiva: false, anticipo: 60 }, settimana: { attiva: true } }, ig: true, impronta: '0123456789abcdef', rev: 4, qr: { moduli: 'penna' }, firmaQr: firma, prima: { slot: [] } });
  const ctx = contesto({
    api: async (via, o = {}) => {
      if (!o.method) return vista(riletture ? 'bbbbbbbbbbbbbbbb' : 'aaaaaaaaaaaaaaaa');
      mandate.push([via, o.body.nome, o.body.firmaQr, o.body.rev]);
      const r = risposte.shift();
      if (r) throw r;
      return { ok: true };
    },
    grafEsporta: async (c, o) => { stili.push(o.stile); inizio?.(); await new Promise((r) => setImmediate(r)); return { url: 'data:image/jpeg;base64,AA' }; },
    _autoAllinea: async () => {},
    _rileggiImpostazioni: async () => { riletture++; },
    grafConfig: () => ({}), _autoCarica: async () => {}, grafImg: {}, grafLogo: {}, grafGiorni: () => [], grafDidascalia: () => '',
  }, ['_AUTO_FERMO', '_autoGiro', '_liveGiro', '_autoStile', '_autoImmagini', 'autoPrepara', 'livePrepara']);
  const prepara = prendi(ctx, 'autoPrepara');
  const errore = () => Object.assign(new Error('cambiato'), { dati: { codice: 'qr-cambiato', firmaQr: 'bbbbbbbbbbbbbbbb' } });
  risposte = [errore()];
  await prepara();
  assert.deepEqual(mandate.map((m) => m.slice(1)), [['settimana-post', 'aaaaaaaaaaaaaaaa', 4], ['settimana-post', 'bbbbbbbbbbbbbbbb', 4], ['settimana-storia', 'bbbbbbbbbbbbbbbb', 4]], 'al 409 rilegge, ridisegna e manda la firma nuova');
  assert.equal(riletture, 1);
  assert.deepEqual({ ...stili[0] }, { moduli: 'penna', foto: 'aaaaaaaaaaaaaaaa' }, 'il QR si disegna con lo stile del server');
  mandate.length = 0; riletture = 0;
  risposte = [errore(), errore()];
  await assert.rejects(prepara(), /cambiato/, 'due volte di fila: si dice, non si gira in tondo');
  mandate.length = 0; risposte = [];
  const disegna = new Promise((r) => { inizio = r; });
  const vecchio = prepara();
  await disegna;
  inizio = null;
  const nuovo = prepara();
  await Promise.all([vecchio, nuovo]);
  assert.deepEqual(mandate.map((m) => m[1]), ['settimana-post', 'settimana-storia'], 'il giro vecchio, fermato mentre disegna, non manda niente: ogni immagine una volta sola');
  mandate.length = 0; riletture = 0;
  risposte = [errore()];
  await prendi(ctx, 'livePrepara')();
  assert.deepEqual(mandate.map((m) => [m[0], m[2], m[3]]), [['/api/streamer/grafiche/storia-live', 'aaaaaaaaaaaaaaaa', 4], ['/api/streamer/grafiche/storia-live', 'bbbbbbbbbbbbbbbb', 4]], 'la Live con le stesse regole');
});

test('cosa ripreparare: le automatiche accese e non pronte o da rifare, e la Live', () => {
  const ctx = contesto({}, ['_autoDaFare']);
  const fare = prendi(ctx, '_autoDaFare');
  const v = (x) => ({ conf: { prima: { attiva: true }, settimana: { attiva: false } }, ig: true, prima: { slot: [{ giorno: 2 }] }, pronte: {}, daRifare: {}, live: null, ...x });
  assert.deepEqual({ ...fare(v({ pronte: { 'prima-2': true, 'prima-5': false } })) }, { auto: false, live: false }, 'un giorno senza diretta non conta');
  assert.deepEqual({ ...fare(v({ pronte: { 'prima-2': false } })) }, { auto: true, live: false }, 'non pronta');
  assert.deepEqual({ ...fare(v({ pronte: { 'prima-2': true }, daRifare: { 'prima-2': true } })) }, { auto: true, live: false }, 'da rifare');
  assert.deepEqual({ ...fare(v({ pronte: { 'settimana-post': false } })) }, { auto: false, live: false }, 'la settimana spenta non conta');
  assert.deepEqual({ ...fare(v({ live: { attiva: true, pronta: false } })) }, { auto: false, live: true }, 'la Live accesa e non pronta');
  assert.deepEqual({ ...fare(v({ live: { attiva: true, pronta: true, daRifare: true } })) }, { auto: false, live: true }, 'la Live da rifare');
  assert.deepEqual({ ...fare(v({ live: { attiva: false, pronta: false } })) }, { auto: false, live: false }, 'spenta no');
  assert.deepEqual({ ...fare(null) }, { auto: false, live: false });
});

test('le righe che dicono il gradino, nelle Grafiche e nella scheda QR', () => {
  const ctx = contesto({ esc: (x) => x, qrStileSalvato: () => ({ salvato: true }) }, ['_qrGradinoDetto', '_grQrGradinoHtml']);
  const detto = prendi(ctx, '_qrGradinoDetto'), riga = prendi(ctx, '_grQrGradinoHtml');
  assert.match(detto({ p: {}, gradino: 'tuo', motivi: [] }), /col tuo stile ✓/);
  assert.match(detto({ p: {}, gradino: 'senza-logo', motivo: 'logo-grande', motivi: ['logo-grande'] }), /senza logo: con questo indirizzo il logo coprirebbe/);
  assert.match(detto({ p: {}, gradino: 'morbido', motivo: 'penna', motivi: ['logo-assente', 'penna'] }), /forme morbide.*penna.*e senza logo/);
  assert.match(detto({ p: {}, gradino: 'serie', motivo: 'colori', motivi: ['colori'] }), /quello di serie: i tuoi colori/);
  assert.equal(riga({ qr: false }, null), '', 'senza QR nella grafica, niente riga');
  assert.match(riga({ qr: true }, { provvisoria: true }), /Sto preparando/);
  assert.match(riga({ qr: true }, { p: {}, gradino: 'tuo', motivi: [] }), /data-vai="qr"/, 'col tasto per aprire «QR su misura»');
  ctx.qrStileSalvato = () => ({ salvato: false });
  assert.match(riga({ qr: true }, { p: {}, gradino: 'tuo', motivi: [] }), /non hai ancora salvato uno stile/);
  assert.ok(APP.includes('id="gr-qr-gradino"') && APP.indexOf('id="gr-qr-gradino"') > APP.indexOf('id="gr-qr"'), 'sotto «Stampa un QR»');
  assert.ok(APP.includes('id="qr-grafiche"') && FUNZIONI.get('qrRifai').includes('await qrRigaGrafiche(st, giro);'), 'e nella scheda QR la riga «Nelle Grafiche»');
});

test('i testi dicono come stanno le cose', () => {
  assert.ok(!/Spegnila e riaccendila/.test(APP), 'il rimedio della Live non e\' piu\' spegnerla e riaccenderla');
  assert.ok(APP.includes('Si prepara da sola adesso che hai aperto le Grafiche'));
  assert.ok(!/Quando vai in diretta su Twitch, la storia/.test(APP), 'la storia della diretta vale su ogni piattaforma');
  assert.ok(APP.includes('Si preparano ogni volta che salvi le Grafiche, la Settimana o lo stile del QR'), 'anche lo stile del QR le riprepara');
  assert.ok(/Lì «Dove porta» e la frase sotto non contano: il QR porta sempre al tuo canale/.test(APP), 'la scheda QR dice cosa non vale nelle Grafiche');
  for (const nome of ['caricaStoriaIg', 'caricaAuto', '_settAuto']) assert.ok(FUNZIONI.get(nome).includes("stato?.ruolo === 'moderatore'"), `${nome}: il moderatore non chiede porte che non sono sue`);
  assert.match(APP, /Le storie di Instagram e le pubblicazioni automatiche le gestisce chi ha il canale/);
  assert.ok(FUNZIONI.get('renderAreaUtente').indexOf('autoFerma();') < FUNZIONI.get('renderAreaUtente').indexOf("api('/api/cambia-canale'"), 'cambiando canale, i giri in corso si fermano prima');
});

test('la demo ha uno stile del QR su misura e parla il contratto delle porte', async () => {
  const ctx = contesto({ stato: null }, ['_DEMO_QR', '_qrImpronta', '_DEMO_SETTIMANA', '_demoScritture', '_demoFirmaQr', '_demoRev', '_demoQrCambiato', '_demoLive', '_demoAuto']);
  const qr = prendi(ctx, '_DEMO_QR');
  assert.deepEqual([qr.moduli, qr.occhi, qr.scuro, qr.logo], ['penna', 'tondi', '#1d2a6b', 'immagine']);
  assert.match(qr.logoImg, /^data:image\/png;base64,[A-Za-z0-9+/=]+$/);
  const png = Buffer.from(qr.logoImg.split(',')[1], 'base64');
  assert.equal(png.subarray(1, 4).toString(), 'PNG', 'un PNG vero');
  assert.ok(APP.includes('qr: { ..._DEMO_QR },') && APP.includes('grafiche: { qr: true, rev: 1 },'), 'nelle impostazioni finte, col QR stampato sulle grafiche');
  ctx.stato = { streamer: { settings: { qr: { ...qr }, grafiche: { rev: 1 } } } };
  const auto = prendi(ctx, '_demoAuto');
  const v = auto('/api/streamer/automatiche');
  assert.match(v.firmaQr, /^[0-9a-f]{16}$/);
  assert.deepEqual([v.qr.moduli, v.rev, typeof v.daRifare, typeof v.live.daRifare], ['penna', 1, 'object', 'boolean']);
  assert.deepEqual({ ...auto('/api/streamer/automatiche/immagine', { nome: 'settimana-post', firmaQr: v.firmaQr, rev: 1 }) }, { ok: true });
  await assert.rejects(auto('/api/streamer/automatiche/immagine', { nome: 'settimana-post', firmaQr: 'ffffffffffffffff', rev: 1 }), (e) => e.dati?.codice === 'qr-cambiato', 'una firma vecchia: 409');
  assert.deepEqual([auto('/api/streamer/automatiche').pronte['settimana-post'], auto('/api/streamer/automatiche').daRifare['settimana-post']], [true, false]);
  ctx.stato.streamer.settings.qr = { ...qr, scuro: '#1f4d2b' };
  assert.equal(auto('/api/streamer/automatiche').daRifare['settimana-post'], true, 'cambiato lo stile, da rifare');
});
