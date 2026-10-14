// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello del QR NELLE IMMAGINI CHE ESCONO DAL PANNELLO: quello che parte porta
// il QR dello stile dello streamer, e si legge.
//
// Il difetto che chiude: le immagini si fotografavano in modo sincrono, e a una
// misura nuova il QR usciva senza logo, con le forme morbide al posto della
// penna, o di serie. Nessuno se ne accorgeva, perche' quel QR si leggeva lo
// stesso: il pannello controllava che si leggesse, non che fosse il SUO. Qui si
// guarda l'uscita vera, con gli occhi di chi la riceve.
//
// Il banco: la demo, con lo stile finto (_DEMO_QR: penna, occhi tondi, #1d2a6b,
// logo immagine), la cache del QR fredda (prima di ogni passo si svuotano le
// voci del QR e i loghi, e si toglie penna.js), penna.js e il logo che arrivano
// in ritardo come su una rete lenta (il logo della demo e' un data: URL, che si
// decodifica in un attimo: una foto del profilo vera no, e il pannello deve
// aspettarla), e l'anteprima delle Grafiche sulla Settimana (QR da
// 190) mentre la storia «Live ora» ne vuole uno da 180: e' esattamente il caso
// in cui usciva senza logo. Il cancello controlla anche il banco: se la demo
// cambiasse stile o tipo di serie, o se penna.js non arrivasse davvero in
// ritardo, lo dice invece di passare su un caso che non e' piu' quello.
//
// I passi sono quelli dello streamer, coi tasti veri: la storia «Live ora»
// dall'interruttore, da «Salva» delle Grafiche e da «Salva lo stile» del QR; le
// storie prima della diretta e la settimana di autoPrepara; «Manda» della
// Settimana; «Metti nella storia»; «Scarica PNG» e «Condividi» a scala 2. Si
// prende quello che il pannello MANDA alle porte (il corpo della richiesta, che
// la demo poi butta) e quello che scarica, e si contano: un'immagine che non
// esce e' un guaio come una che esce storta.
//
// Ogni immagine la decodifica il browser in una pagina a parte, che del pannello
// non sa niente (ci sono solo qr.js e penna.js). Nel riquadro del QR:
//  · si RILEGGE (SB_QR.rileggi) con l'indirizzo atteso, alla misura logica del
//    modello (il modulo a scala s e' quello a scala 1 per s, I5) e con la
//    versione che il logo richiede (livello H). Un QR senza logo ha un'altra
//    versione, e lo si dice;
//  · i moduli scuri sono del COLORE dello stile, non di quello di serie;
//  · gli OCCHI sono tondi: gli angoli dei tre occhi restano chiari;
//  · al centro c'e' il LOGO: i suoi pixel, col suo colore;
//  · le FORME sono quelle dello stile. Il QR «tuo» si ridisegna qui, coi
//    ripieghi accanto (forme morbide, senza logo, di serie e, a scala 2, la
//    bitmap di scala 1 ingrandita): il piu' vicino ai pixel usciti dev'essere il
//    «tuo». E' l'unico modo di vedere la penna diventata morbida, che si legge,
//    ha il logo e il colore giusto.
// In piu', le immagini automatiche portano la firma del QR (16 cifre) e la
// Live anche la rev delle Grafiche: senza, il server non saprebbe con che stile
// sono nate.
//
// Uso: node scripts/verifica-qr-grafiche.mjs            (esce 1 se qualcosa non va)
//      node scripts/verifica-qr-grafiche.mjs --selftest (le rotture devono vedersi)
//
// L'autoprova rompe il pannello in sei modi, ognuno su una pagina appena
// aperta, e pretende il rosso giusto: l'esportazione tornata sincrona (come la
// vecchia grafJpeg), qrPronto che non aspetta motore e logo, il logo non
// aspettato, il QR di serie al posto del tuo, la bitmap di scala 1 ingrandita
// nel PNG, e un QR coperto dopo l'uscita. Prima controlla che il banco sia il
// caso del difetto; alla fine gli stessi passi senza rotture devono venire
// verdi, a cache fredda.

import fs from 'node:fs';
import path from 'node:path';
import { apriSito, apriBrowser, PUB } from './_sito.mjs';

const SELFTEST = process.argv.includes('--selftest');
// Un passo puo' aspettare il logo (8 s al massimo) e penna.js (15 s), e
// autoPrepara fa sette immagini una dopo l'altra: un minuto basta e avanza.
const ATTESA = 60_000;
const RITARDO_PENNA = 1500;
// Sotto gli 8 s che il pannello concede al logo (QR_LOGO_ATTESA_MS): un logo
// che arriva in 1,2 s deve uscire, non essere saltato.
const RITARDO_LOGO = 1200;

const browser = await apriBrowser();
if (!browser) { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }
const sito = await apriSito({});
// Il service worker del pannello risponde lui a /penna.js (con un fetch suo):
// la rotta qui sotto non lo vedrebbe, e il «penna.js in ritardo» non ci
// sarebbe. E' successo: il primo giro di questo cancello contava zero
// richieste. Senza service worker la richiesta passa dalla rotta.
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'it-IT', acceptDownloads: true, serviceWorkers: 'block' });
let pennaChiesta = 0;
await ctx.route('**/penna.js', async (r) => {
  pennaChiesta++;
  await new Promise((ok) => setTimeout(ok, RITARDO_PENNA));
  await r.continue();
});

// IL BANCO: una pagina vuota con il solo motore del QR. Decodifica, rilegge e
// ridisegna i riferimenti; del pannello non vede niente, cosi' una rottura del
// pannello non puo' ingannare anche la misura.
const banco = await ctx.newPage();
await banco.setContent('<!doctype html><meta charset="utf-8"><title>banco</title>');
await banco.addScriptTag({ content: fs.readFileSync(path.join(PUB, 'qr.js'), 'utf8') });
await banco.addScriptTag({ content: fs.readFileSync(path.join(PUB, 'penna.js'), 'utf8') });
await banco.evaluate(() => {
  const Q = window.SB_QR;
  const lin = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const luce = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(String(hex).slice(i, i + 2), 16));
  const esa = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const scarto = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
  const SERIE = '#150910';

  // Il logo come lo prepara il pannello (lato al piu' 512), e il suo colore:
  // quello piu' frequente fra i pixel pieni lontani dai due colori del QR.
  const loghi = new Map();
  const logoDi = (src, S) => {
    if (!src) return Promise.resolve(null);
    if (!loghi.has(src)) {
      loghi.set(src, new Promise((ok, ko) => {
        const im = new Image();
        im.onload = () => {
          const lato = Math.min(512, Math.max(im.naturalWidth, im.naturalHeight)), k = lato / Math.max(im.naturalWidth, im.naturalHeight);
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(im, 0, 0, c.width, c.height);
          const d = g.getImageData(0, 0, c.width, c.height).data, conta = new Map();
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 250) continue;
            const v = [d[i], d[i + 1], d[i + 2]];
            if (dist(v, rgb(S.scuro)) < 100 || dist(v, rgb(S.chiaro)) < 100) continue;
            const k2 = v.join(',');
            conta.set(k2, (conta.get(k2) || 0) + 1);
          }
          const primo = [...conta.entries()].sort((a, b) => b[1] - a[1])[0];
          ok({ img: c, w: c.width, h: c.height, colore: primo ? primo[0].split(',').map(Number) : null });
        };
        im.onerror = () => ko(new Error('il logo dello stile non si decodifica'));
        im.src = src;
      }));
    }
    return loghi.get(src);
  };

  window.__esamina = async ({ src, box, s, E, S, seme, attesoW, attesoH }) => {
    const im = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('il browser non la decodifica')); i.src = src; });
    const W = im.naturalWidth, H = im.naturalHeight;
    const t = document.createElement('canvas'); t.width = W; t.height = H;
    const g = t.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    const pix = g.getImageData(0, 0, W, H);
    const fuori = { W, H, guai: [], lettura: null, colore: null, occhi: null, logo: null, forme: null, vicino: '', distanze: {} };
    if (W !== attesoW || H !== attesoH) fuori.guai.push(`e' ${W}×${H} invece di ${attesoW}×${attesoH}`);

    const L = await logoDi(S.logo === 'immagine' ? S.logoImg : '', S);
    const quota = Math.max(0.2, Math.min(1, (Number(S.logoLato) || 100) / 100));
    const stile = { moduli: S.moduli, occhi: S.occhi, scuro: S.scuro, chiaro: S.chiaro, occhio: S.occhio || '', cornice: '', coloreCornice: '', seme };
    const conLogo = L ? Q.progetto(E, { ...stile, logo: L, logoLato: quota }) : Q.progetto(E, stile);
    const senzaLogo = Q.progetto(E, stile);
    const P = box.w;
    // Dove il modello mette il QR: la tela del QR, quiete compresa, al centro
    // del riquadro, col modulo di scala 1 moltiplicato per la scala (I5).
    const posa = (p, k, dx = 0, dy = 0) => {
      const g1 = Q.geometria(p, P), m = g1.m * k;
      const X = Math.round((box.x + (P - g1.W) / 2) * k) + dx, Y = Math.round((box.y + (P - g1.W) / 2) * k) + dy;
      return { m, n: g1.n, x0: X + Q.QUIETE * m, y0: Y + Q.QUIETE * m, X, Y };
    };
    // Si rilegge li', o a mezzo modulo da li': un pixel di arrotondamento non
    // cambia niente per un telefono, e non deve cambiare niente qui.
    let altro = '';
    const leggi = (p) => {
      const r = Math.ceil(posa(p, s).m / 2);
      for (let d = 0; d <= r; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
        const geo = posa(p, s, dx, dy), e = Q.rileggi(pix, p, geo);
        if (e.ok) return { geo, dx, dy, p };
        if (e.letto && !altro) altro = e.letto.testo;
      }
      return null;
    };
    const coi = leggi(conLogo);
    const senza = coi || !L ? null : leggi(senzaLogo);
    const letto = coi || senza;
    fuori.lettura = !!coi;
    if (!coi) {
      if (senza) fuori.guai.push(`il QR si rilegge, ma e' quello SENZA logo (versione ${senzaLogo.qr.versione} invece di ${conLogo.qr.versione})`);
      else if (altro) fuori.guai.push(`il QR dice «${altro}» invece di «${E}»`);
      else fuori.guai.push(`nel riquadro del QR non si rilegge «${E}»`);
    }

    const soglia = (luce(rgb(S.scuro)) + luce(rgb(S.chiaro))) / 2;
    const centro = (geo, x, y) => {
      const r = Math.max(0, Math.floor(geo.m / 6)), cx = Math.floor(geo.x0 + (x + 0.5) * geo.m), cy = Math.floor(geo.y0 + (y + 0.5) * geo.m), v = [0, 0, 0];
      let n = 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const i = ((cy + dy) * W + (cx + dx)) * 4;
        v[0] += pix.data[i]; v[1] += pix.data[i + 1]; v[2] += pix.data[i + 2]; n++;
      }
      return v.map((c) => c / n);
    };

    if (letto) {
      const { geo } = letto, n = geo.n, tg = letto.p.targa;
      const sotto = (x, y) => !!tg && x >= tg.c0 && x < tg.c0 + tg.lato && y >= tg.c0 && y < tg.c0 + tg.lato;
      const scuri = [], chiari = [];
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        if (sotto(x, y)) continue;
        const c = centro(geo, x, y);
        (luce(c) < soglia ? scuri : chiari).push(c);
      }
      const med = (a) => [0, 1, 2].map((k) => a.map((v) => v[k]).sort((p, q) => p - q)[a.length >> 1]);
      const ms = med(scuri), mc = med(chiari);
      fuori.colore = scarto(ms, rgb(S.scuro)) <= 32 && scarto(mc, rgb(S.chiaro)) <= 32;
      if (!fuori.colore) {
        const diSerie = dist(ms, rgb(SERIE)) < dist(ms, rgb(S.scuro));
        fuori.guai.push(`i moduli sono ${esa(ms)} su ${esa(mc)} invece di ${S.scuro} su ${S.chiaro}${diSerie ? ': e\' il colore di serie' : ''}`);
      }
      if (S.occhi === 'tondi' || S.occhi === 'quadrati') {
        let chiariN = 0;
        for (const [a, b] of [[0, 0], [n - 7, 0], [0, n - 7]]) for (const [x, y] of [[a, b], [a + 6, b], [a, b + 6], [a + 6, b + 6]]) if (luce(centro(geo, x, y)) >= soglia) chiariN++;
        fuori.occhi = S.occhi === 'tondi' ? chiariN === 12 : chiariN === 0;
        if (!fuori.occhi) fuori.guai.push(S.occhi === 'tondi' ? `gli occhi non sono tondi: ${12 - chiariN} angoli su 12 sono pieni` : `gli occhi non sono quadrati: ${chiariN} angoli su 12 sono vuoti`);
      }
    }

    // Il logo si cerca dove il modello lo mette, anche se il QR non si legge:
    // un'immagine col QR senza logo deve dire anche questo.
    if (L && conLogo.targa) {
      const geo = coi ? coi.geo : posa(conLogo, s), tg = conLogo.targa, pad = geo.m * 0.6;
      const x0 = Math.round(geo.x0 + tg.c0 * geo.m + pad), y0 = Math.round(geo.y0 + tg.c0 * geo.m + pad), lato = Math.round(tg.lato * geo.m - 2 * pad);
      if (L.colore) {
        let suo = 0, tutti = 0;
        for (let y = y0; y < y0 + lato; y++) for (let x = x0; x < x0 + lato; x++) {
          const i = (y * W + x) * 4;
          if (dist([pix.data[i], pix.data[i + 1], pix.data[i + 2]], L.colore) < 60) suo++;
          tutti++;
        }
        fuori.quotaLogo = Math.round((suo / Math.max(1, tutti)) * 100) / 100;
        fuori.logo = fuori.quotaLogo >= 0.2;
        if (!fuori.logo) fuori.guai.push(`al centro del QR non c'e' il logo (${Math.round(fuori.quotaLogo * 100)}% dei pixel col suo colore ${esa(L.colore)})`);
      }
    }

    // Le forme: il riquadro come lo disegnerebbe il pannello per ogni gradino,
    // confrontato coi pixel usciti, a 10 punti dal bordo (gli angoli tondi del
    // riquadro restano fuori).
    const forma = (f) => (f === 'penna' ? 'morbidi' : f);
    const rif = {};
    const rifDi = (p, ingrandisci) => {
      const k = ingrandisci ? 1 : s, geo = Q.misura(p, P, k), tela = document.createElement('canvas');
      tela.width = geo.W; tela.height = geo.H;
      Q.disegna(tela.getContext('2d'), p, geo);
      let q = tela;
      if (ingrandisci && s > 1) {
        q = document.createElement('canvas'); q.width = tela.width * s; q.height = tela.height * s;
        const gq = q.getContext('2d'); gq.imageSmoothingEnabled = true; gq.imageSmoothingQuality = 'high';
        gq.drawImage(tela, 0, 0, q.width, q.height);
      }
      const lato = Math.round(P * s), b = document.createElement('canvas'); b.width = lato; b.height = lato;
      const gb = b.getContext('2d', { willReadFrequently: true });
      gb.fillStyle = p.stile.chiaro; gb.fillRect(0, 0, lato, lato);
      const pz = posa(p, s, letto ? letto.dx : 0, letto ? letto.dy : 0);
      gb.drawImage(q, pz.X - Math.round(box.x * s), pz.Y - Math.round(box.y * s));
      return gb.getImageData(0, 0, lato, lato);
    };
    rif.tuo = rifDi(conLogo);
    if (S.moduli === 'penna' || S.occhi === 'penna') rif.morbido = rifDi(Q.progetto(E, { ...stile, moduli: forma(S.moduli), occhi: forma(S.occhi), ...(L ? { logo: L, logoLato: quota } : {}) }));
    if (L) rif['senza-logo'] = rifDi(senzaLogo);
    rif.serie = rifDi(Q.progetto(E, { seme }));
    if (s > 1) rif.ingrandito = rifDi(conLogo, true);
    const bx = Math.round(box.x * s), by = Math.round(box.y * s), lato = Math.round(P * s), dentro = Math.round(10 * s);
    for (const [nome, r] of Object.entries(rif)) {
      let somma = 0, conta = 0;
      for (let y = dentro; y < lato - dentro; y++) for (let x = dentro; x < lato - dentro; x++) {
        const i = ((by + y) * W + (bx + x)) * 4, j = (y * lato + x) * 4;
        somma += Math.abs(pix.data[i] - r.data[j]) + Math.abs(pix.data[i + 1] - r.data[j + 1]) + Math.abs(pix.data[i + 2] - r.data[j + 2]);
        conta += 3;
      }
      fuori.distanze[nome] = Math.round((somma / conta) * 100) / 100;
    }
    const ordine = Object.entries(fuori.distanze).sort((a, b) => a[1] - b[1]);
    fuori.vicino = ordine[0][0];
    fuori.margine = ordine.length > 1 ? Math.round((ordine[1][1] - fuori.distanze.tuo) * 100) / 100 : 0;
    fuori.secondo = ordine.length > 1 ? ordine[1][0] : '';
    fuori.forme = fuori.vicino === 'tuo';
    if (!fuori.forme) {
      const detto = { morbido: 'le forme morbide di ripiego al posto della penna', 'senza-logo': 'il QR senza logo', serie: 'il QR di serie', ingrandito: 'la bitmap di scala 1 ingrandita, sfocata' };
      fuori.guai.push(`il QR uscito somiglia di piu' a ${detto[fuori.vicino] || fuori.vicino} che al tuo (scarto medio ${fuori.distanze[fuori.vicino]} contro ${fuori.distanze.tuo})`);
    }
    fuori.ok = !fuori.guai.length;
    return fuori;
  };
});

// IL PANNELLO, nella demo.
const pagina = await ctx.newPage();
const errori = [];
pagina.on('pageerror', (e) => errori.push(e.message));
// Il giro guidato si prenderebbe la pagina a meta' di un passo: si spegne come
// lo spegne il pannello, prima che parta.
await pagina.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); } catch {} });

// La spia: prende quello che il pannello manda alle porte delle immagini, solo
// quando la porta l'ha accettato (un 409 non e' un'immagine uscita), e gli
// avvisi d'errore che lo streamer vedrebbe.
const SPIA = () => {
  window.__uscite = []; window.__rifiutate = []; window.__toastErrori = [];
  const veroApi = apiDemo;
  apiDemo = function (percorso, opzioni = {}) {
    const r = veroApi.call(this, percorso, opzioni);
    const via = String(percorso).split('?')[0], b = opzioni.body || {}, metodo = (opzioni.method || 'GET').toUpperCase();
    if (metodo !== 'POST') return r;
    const prese = [];
    const metti = (nome, immagine, extra = {}) => { if (typeof immagine === 'string' && immagine) prese.push({ porta: via, nome, immagine, ...extra }); };
    if (via === '/api/streamer/grafiche/storia-live' && b.attiva) metti('live', b.immagine, { firmaQr: b.firmaQr, rev: b.rev, auto: true });
    if (via === '/api/streamer/automatiche/immagine') metti(String(b.nome || ''), b.immagine, { firmaQr: b.firmaQr, auto: true });
    if (via === '/api/streamer/settimana/manda') { metti('manda-post', b.immagine); metti('manda-storia', b.storia); }
    if (via === '/api/streamer/grafiche/storia') metti('storia', b.immagine);
    if (prese.length) Promise.resolve(r).then(() => window.__uscite.push(...prese), (e) => window.__rifiutate.push(via + ': ' + (e?.message || e)));
    return r;
  };
  const veroToast = toast;
  toast = function (msg, tipo) { if (tipo === 'errore') window.__toastErrori.push(String(msg)); return veroToast.apply(this, arguments); };
};

// Il banco com'e' all'apertura: lo stile salvato della demo, il tipo di serie
// delle Grafiche e i lati del riquadro del QR dell'anteprima e della Live. Il
// difetto si vedeva solo con due misure diverse e uno stile con penna e logo.
async function apri() {
  await pagina.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'networkidle' });
  await pagina.waitForFunction(() => window.SB_APP && window.SB_QR && window.SB_SCENE && typeof grafEsporta === 'function' && typeof apiDemo === 'function' && typeof qrPronto === 'function');
  await pagina.evaluate(SPIA);
  // Il logo lento: _qrImmagine e' quello che _qrLogo chiama per caricarlo
  // (una volta sola per indirizzo, finche' non si svuota la cache). Le
  // immagini scelte dal computer (blob:) restano com'erano.
  await pagina.evaluate((ms) => {
    window.__loghiChiesti = 0;
    const vero = _qrImmagine;
    _qrImmagine = (src) => {
      if (String(src).startsWith('blob:')) return vero(src);
      window.__loghiChiesti++;
      return new Promise((ok) => setTimeout(ok, ms)).then(() => vero(src));
    };
  }, RITARDO_LOGO);
  return pagina.evaluate(() => {
    const c = grafConfig(), lato = (cc) => grafDisposizione(cc).qr?.w || 0;
    return { penna: !!window.SB_PENNA, voci: _qrVoci.size, S: { ...(stato?.streamer?.settings?.qr || {}) }, tipo: c.tipo, qr: !!c.qr,
      anteprima: lato(c), live: lato({ ...c, tipo: 'live', formato: 'storia' }) };
  });
}

const STILE_DEL_DIFETTO = { moduli: 'penna', occhi: 'tondi', scuro: '#1d2a6b', logo: 'immagine' };
function bancoGiusto(b) {
  const guai = [];
  for (const [k, v] of Object.entries(STILE_DEL_DIFETTO)) if (String(b.S[k] || '').toLowerCase() !== v) guai.push(`lo stile della demo ha ${k} «${b.S[k] ?? ''}» invece di «${v}»`);
  if (!/^data:image\/png;base64,/.test(String(b.S.logoImg || ''))) guai.push('lo stile della demo non ha il logo caricato');
  if (b.tipo !== 'programmazione') guai.push(`l'anteprima delle Grafiche si apre su «${b.tipo}» invece che sulla Settimana`);
  if (!b.qr) guai.push('le Grafiche della demo hanno il QR spento');
  if (!b.anteprima || !b.live || b.anteprima === b.live) guai.push(`il QR dell'anteprima (${b.anteprima}) e quello della Live (${b.live}) non hanno misure diverse`);
  return guai;
}

async function vai(scheda) {
  await pagina.evaluate((s) => { try { azzeraBarraSalva(); } catch {} window.SB_APP.vai(s); }, scheda);
  await pagina.waitForFunction((s) => (document.querySelector('.pannello-scheda.visibile') || {}).id === 'scheda-' + s, scheda);
}

const pronto = (sel) => pagina.waitForFunction((s) => { const b = document.querySelector(s); return !!b && !b.disabled; }, sel, { timeout: ATTESA });
async function premi(sel) {
  await pronto(sel);
  await pagina.evaluate((s) => document.querySelector(s).click(), sel);
}

const nSlot = async () => pagina.evaluate(() => _DEMO_SETTIMANA.giorni.filter((g) => g.ora && !g.off).length);

// I passi. `quante` e' quante immagini devono uscire; `scarica` il tipo del
// file che il passo fa scaricare; `tipo`/`formato` dicono quale grafica e', per
// trovare il riquadro del QR (le automatiche lo dicono col nome).
const PASSI = {
  live: { dice: 'la storia «Live ora» dall\'interruttore', quante: async () => 1,
    fai: async () => { await vai('grafiche'); await premi('#gr-ig-live'); } },
  prima: { dice: 'le storie prima della diretta, accendendole', quante: nSlot,
    fai: async () => { await vai('grafiche'); await premi('#gr-auto [data-auto="prima"]'); } },
  settimana: { dice: 'la settimana automatica, accendendola (e di nuovo le storie prima)', quante: async () => (await nSlot()) + 2,
    fai: async () => { await vai('grafiche'); await premi('#gr-auto [data-auto="settimana"]'); } },
  salva: { dice: '«Salva» delle Grafiche, che riprepara la Live e le automatiche', quante: async () => (await nSlot()) + 3,
    fai: async () => { await vai('grafiche'); await premi('#gr-salva'); } },
  stile: { dice: '«Salva lo stile» del QR, che riprepara la Live e le automatiche', quante: async () => (await nSlot()) + 3,
    fai: async () => { await vai('qr'); await premi('#qr-salva'); } },
  manda: { dice: '«Manda» della Settimana, post e storia', quante: async () => 2,
    fai: async () => {
      await vai('settimana');
      await pronto('#sett-dove input[data-sett-dove="ig"]');
      await pagina.evaluate(() => {
        const ig = document.querySelector('#sett-dove input[data-sett-dove="ig"]');
        if (!ig.checked) ig.click();
        if (!document.querySelector('#sett-dove input[data-sett-dove="tg"]:checked, #sett-dove input[data-sett-dove="dc"]:checked')) document.querySelector('#sett-dove input[data-sett-dove="tg"], #sett-dove input[data-sett-dove="dc"]')?.click();
      });
      await premi('#sett-manda');
    } },
  storia: { dice: '«Metti nella storia»', quante: async () => 1, grafiche: 'storia',
    fai: async () => { await vai('grafiche'); await premi('#gr-ig-storia'); } },
  png: { dice: '«Scarica PNG» a scala 2', quante: async () => 1, scarica: 'image/png', grafiche: 'tela', scala: 2,
    fai: async () => { await vai('grafiche'); await premi('#gr-scarica'); } },
  condividi: { dice: '«Condividi» a scala 2', quante: async () => 1, scarica: 'image/jpeg', grafiche: 'tela', scala: 2,
    fai: async () => { await vai('grafiche'); await premi('#gr-condividi'); } },
};

const TIPI = { live: ['live', 'storia'], 'settimana-post': ['programmazione', 'post'], 'settimana-storia': ['programmazione', 'storia'],
  'manda-post': ['programmazione', 'post'], 'manda-storia': ['programmazione', 'storia'] };

// Prima di ogni passo la cache torna fredda come in un pannello appena aperto:
// nessuna voce del QR, nessun logo, e penna.js da caricare (qr.js lo cerca a
// ogni disegno, e caricaMotoreQr lo richiede se non c'e'). Si conta quante
// volte penna.js e il logo vengono chiesti durante il passo: zero vorrebbe dire
// che il passo non e' partito freddo, e allora non proverebbe niente.
async function passo(id) {
  const P = PASSI[id];
  const quante = await P.quante();
  const prima = await pagina.evaluate(() => {
    _qrVoci.clear(); QR_STATO.loghi.clear(); delete window.SB_PENNA;
    window.__uscite.length = 0; window.__rifiutate.length = 0; window.__toastErrori.length = 0;
    return { penna: !!window.SB_PENNA, voci: _qrVoci.size, loghi: QR_STATO.loghi.size, loghiChiesti: window.__loghiChiesti };
  });
  const chieste0 = pennaChiesta;
  const t0 = Date.now();
  let file = null;
  try {
    if (P.scarica) {
      const atteso = pagina.waitForEvent('download', { timeout: ATTESA }).catch(() => null);
      await P.fai();
      const d = await atteso;
      if (d) file = 'data:' + P.scarica + ';base64,' + fs.readFileSync(await d.path()).toString('base64');
    } else {
      await P.fai();
      await pagina.waitForFunction((n) => window.__uscite.length >= n || window.__toastErrori.length > 0, quante, { timeout: ATTESA, polling: 100 }).catch(() => {});
    }
  } catch (e) { errori.push(`${id}: ${e.message.split('\n')[0]}`); }
  // Un attimo ancora: un'immagine in piu' di quelle attese e' un guaio da vedere.
  await pagina.waitForTimeout(500);
  const r = await pagina.evaluate(() => ({ uscite: window.__uscite.splice(0), rifiutate: window.__rifiutate.splice(0), toast: window.__toastErrori.splice(0),
    S: { ...(stato?.streamer?.settings?.qr || {}) }, login: String(stato?.user?.login || ''), c: grafConfig(), loghiChiesti: window.__loghiChiesti }));
  const uscite = P.scarica ? (file ? [{ nome: 'file', immagine: file }] : []) : r.uscite;
  for (const u of uscite) {
    const [tipo, formato] = TIPI[u.nome] || (u.nome.startsWith('prima-') ? ['prossima', 'storia'] : P.grafiche === 'storia' ? [r.c.tipo, 'storia'] : [r.c.tipo, r.c.formato || 'post']);
    // L'indirizzo ha il login in minuscolo (grafUrlCanale), il seme del
    // disegno a penna il login com'e' (qrStileDi): si rifanno tutti e due uguali.
    Object.assign(u, { tipo, formato, scala: P.scala || 1, S: r.S, login: r.login.toLowerCase(), seme: 'qr:' + r.login, dest: r.c.dest });
  }
  return { id, dice: P.dice, quante, uscite, rifiutate: r.rifiutate, toast: r.toast, prima, penna: pennaChiesta - chieste0, logo: r.loghiChiesti - prima.loghiChiesti, ms: Date.now() - t0 };
}

const riquadri = new Map();
async function esamina(u) {
  const chiave = `${u.tipo}|${u.formato}`;
  if (!riquadri.has(chiave)) riquadri.set(chiave, await pagina.evaluate(({ tipo, formato }) => { const l = grafDisposizione({ ...grafConfig(), tipo, formato }); return { qr: l.qr && { x: l.qr.x, y: l.qr.y, w: l.qr.w }, W: l.W, H: l.H }; }, { tipo: u.tipo, formato: u.formato }));
  const lay = riquadri.get(chiave);
  if (!lay.qr) return { ok: false, guai: [`la grafica ${u.tipo} in ${u.formato} non ha il riquadro del QR: le Grafiche della demo hanno il QR spento?`] };
  if (u.dest === 'twitch') return { ok: false, guai: ['le Grafiche della demo portano a Twitch: il cancello si aspetta la pagina link'] };
  const E = 'https://socialbot.live/u/' + u.login;
  const esito = await banco.evaluate((a) => window.__esamina(a), { src: u.immagine, box: lay.qr, s: u.scala, E, S: u.S, seme: u.seme, attesoW: lay.W * u.scala, attesoH: lay.H * u.scala })
    .catch((e) => ({ ok: false, guai: [e.message.split('\n')[0]] }));
  if (u.auto) {
    if (!/^[0-9a-f]{16}$/.test(String(u.firmaQr || ''))) { esito.ok = false; esito.guai.push(`e' partita senza la firma del QR (${JSON.stringify(u.firmaQr ?? null)})`); }
    if (u.nome === 'live' && !Number.isFinite(Number(u.rev))) { esito.ok = false; esito.guai.push('la Live e\' partita senza la rev delle Grafiche'); }
  }
  return esito;
}

// Un passo intero: le immagini uscite, contate ed esaminate una per una.
async function giudica(p) {
  const esiti = [];
  for (const u of p.uscite) esiti.push({ nome: u.nome, ...(await esamina(u)) });
  const guai = [];
  if (p.uscite.length !== p.quante) guai.push(`uscite ${p.uscite.length} immagini invece di ${p.quante}`);
  for (const t of p.toast) guai.push(`lo streamer legge: «${t}»`);
  for (const t of p.rifiutate) guai.push(`la porta ha rifiutato: ${t}`);
  for (const e of esiti) for (const g of e.guai || []) guai.push(`${e.nome}${e.W ? ` (${e.W}×${e.H})` : ''}: ${g}`);
  return { ...p, esiti, guai, ok: !guai.length };
}

const righe = [];
const dice = (ok, testo) => { righe.push(`  ${ok ? '✓' : '✗'} ${testo}`); return ok; };
const sec = (ms) => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
const chiudi = async () => { await browser.close(); sito.chiudi(); };

// Le rotture dell'autoprova. Ognuna si mette sulla pagina appena aperta, prima
// dei passi; `vuole` dice il rosso che deve vedersi, non un rosso qualsiasi.
const ROTTURE = [
  {
    nome: 'l\'esportazione tornata sincrona, come la vecchia grafJpeg',
    passi: ['live', 'storia'],
    rompi: () => {
      grafEsporta = async (c, { scala = 1, formato = 'jpeg', qualita = 0 } = {}) => {
        const tela = grafTelaNuova();
        grafDisegna(tela, c, 0, scala);
        if (formato === 'png' || qualita) return { url: '', blob: await new Promise((ok) => tela.toBlob(ok, formato === 'png' ? 'image/png' : 'image/jpeg', qualita || undefined)) };
        return { url: tela.toDataURL('image/jpeg', 0.9), blob: null };
      };
    },
    vuole: (g) => g.some((p) => p.esiti.some((e) => e.logo === false || e.forme === false)),
  },
  {
    nome: 'qrPronto che non aspetta motore e logo (la provvisoria spacciata per pronta)',
    passi: ['live', 'storia'],
    rompi: () => {
      const vero = qrPronto;
      let dentro = false;
      qrPronto = (full, P, scala = 1, st = qrStileSalvato()) => {
        if (dentro) return vero(full, P, scala, st);
        vero(full, P, scala, st).catch(() => {});
        dentro = true;
        try { const v = _grQrTela(full, P, scala, st); return Promise.resolve(v ? { ...v, provvisoria: false } : null); } finally { dentro = false; }
      };
    },
    vuole: (g) => g.some((p) => p.esiti.some((e) => e.logo === false || e.forme === false)),
  },
  {
    nome: 'il logo non aspettato (si aspetta solo la penna)',
    passi: ['storia'],
    rompi: () => { _qrLogo = (st) => Promise.resolve(_qrLogoPronto(st)); },
    vuole: (g) => g.some((p) => p.esiti.some((e) => e.logo === false && e.lettura === false)),
  },
  {
    nome: 'il QR di serie al posto del tuo',
    passi: ['storia'],
    rompi: () => { const vero = window.SB_QR.gradini; window.SB_QR.gradini = (...a) => { const l = vero(...a); return [l[l.length - 1]]; }; },
    vuole: (g) => g.some((p) => p.esiti.some((e) => e.colore === false && e.occhi === false && e.logo === false)),
  },
  {
    nome: 'nel PNG a scala 2 la bitmap di scala 1 ingrandita',
    passi: ['png'],
    rompi: () => {
      const vero = qrPronto;
      qrPronto = async (full, P, scala = 1, st = qrStileSalvato()) => {
        if (scala < 2) return vero(full, P, scala, st);
        const v = await vero(full, P, 1, st);
        if (!v?.tela) return v;
        const t = document.createElement('canvas'); t.width = v.tela.width * scala; t.height = v.tela.height * scala;
        const g = t.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.drawImage(v.tela, 0, 0, t.width, t.height);
        const geo = { ...v.geo, m: v.geo.m * scala, W: v.geo.W * scala, H: v.geo.H * scala, x0: v.geo.x0 * scala, y0: v.geo.y0 * scala };
        return { ...v, tela: t, geo, scala, chiave: _qrChiave(full, P, scala, st) };
      };
    },
    vuole: (g) => g.some((p) => p.esiti.some((e) => e.forme === false && e.vicino === 'ingrandito')),
  },
  {
    nome: 'un QR coperto dopo l\'uscita (la rilettura del pannello saltata)',
    passi: ['storia'],
    rompi: () => {
      const vero = grafEsporta;
      grafEsporta = async (c, o = {}) => {
        const r = await vero(c, o), q = grafDisposizione(c).qr;
        if (!q) return r;
        const s = Math.max(1, Math.round(Number(o.scala) || 1));
        const im = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = r.url || URL.createObjectURL(r.blob); });
        const t = document.createElement('canvas'); t.width = im.naturalWidth; t.height = im.naturalHeight;
        const g = t.getContext('2d'); g.drawImage(im, 0, 0);
        g.fillStyle = '#ffffff'; g.fillRect(q.x * s, q.y * s, q.w * s, q.h * s);
        if (r.blob) r.blob = await new Promise((ok) => t.toBlob(ok, r.blob.type));
        else r.url = t.toDataURL('image/jpeg', 0.9);
        return r;
      };
    },
    vuole: (g) => g.some((p) => p.esiti.some((e) => e.lettura === false)),
  },
];

if (SELFTEST) {
  let ok = true;
  const banco0 = await apri();
  const guaiBanco = bancoGiusto(banco0);
  ok = dice(!guaiBanco.length, guaiBanco.length ? `il banco non e' il caso del difetto: ${guaiBanco.join('; ')}` : 'il banco e\' il caso del difetto') && ok;
  for (const R of ROTTURE) {
    await apri();
    await vai('grafiche');
    await pagina.evaluate(R.rompi);
    const giudicati = [];
    for (const id of R.passi) giudicati.push(await giudica(await passo(id)));
    const visto = R.vuole(giudicati);
    const primo = giudicati.flatMap((p) => p.guai)[0] || '';
    ok = dice(visto, `${R.nome}: ${visto ? 'si vede' : 'NON si vede'}${primo ? ` («${primo.slice(0, 150)}»)` : ''}`) && ok;
  }
  await apri();
  const puliti = [];
  for (const id of ['live', 'storia', 'png']) puliti.push(await giudica(await passo(id)));
  const verdi = puliti.every((p) => p.ok && p.penna > 0 && p.logo > 0);
  ok = dice(verdi, `e senza rotture, gli stessi passi passano (${puliti.reduce((n, p) => n + p.esiti.length, 0)} immagini, a cache fredda)`) && ok;
  if (!verdi) for (const g of puliti.flatMap((p) => [...(p.penna > 0 && p.logo > 0 ? [] : [`${p.id}: penna.js chiesto ${p.penna} volte, il logo ${p.logo}`]), ...p.guai]).slice(0, 8)) righe.push('      ' + g);
  console.log('Collaudo del collaudo del QR nelle immagini che escono:\n' + righe.join('\n'));
  await chiudi();
  console.log(ok ? '\nIl cancello vede le rotture. ✓' : '\nIl cancello ha lasciato passare una rottura. ✗');
  process.exit(ok ? 0 : 1);
}

const banco0 = await apri();
const guaiBanco = bancoGiusto(banco0);
const ORDINE = ['live', 'prima', 'settimana', 'salva', 'stile', 'manda', 'storia', 'png', 'condividi'];
const giudicati = [];
// Il primo passo e' il caso del difetto, tale e quale: pagina appena aperta,
// anteprima delle Grafiche sulla Settimana che comincia a preparare il suo QR,
// e la Live che ne chiede uno di un'altra misura. Ogni altro passo riparte da
// li': cache svuotata, logo e penna.js compresi, mentre l'anteprima (o la
// scheda dove si e') rifa' il suo QR e il passo ne chiede un altro.
for (const id of ORDINE) giudicati.push(await giudica(await passo(id)));

let stretto = null, immagini = 0;
for (const p of giudicati) {
  dice(p.ok, `${p.dice}: ${p.uscite.length} di ${p.quante} uscite col QR del tuo stile, in ${sec(p.ms)}`);
  for (const g of p.guai.slice(0, 8)) righe.push('      ' + g);
  for (const e of p.esiti) {
    immagini++;
    if (e.ok && Number.isFinite(e.margine) && (!stretto || e.margine < stretto.margine)) stretto = { margine: e.margine, dove: `${p.id}, ${e.nome}`, contro: e.secondo };
  }
}
dice(!guaiBanco.length, guaiBanco.length ? `il banco non e' il caso del difetto: ${guaiBanco.join('; ')}`
  : `il banco e' il caso del difetto: stile con penna, occhi tondi, ${banco0.S.scuro} e logo; anteprima sulla Settimana col QR da ${banco0.anteprima}, la Live da ${banco0.live}`);
const tiepidi = giudicati.filter((p) => !(p.penna > 0) || !(p.logo > 0) || p.prima.penna || p.prima.voci || p.prima.loghi).map((p) => `${p.id} (penna.js chiesto ${p.penna} volte, il logo ${p.logo})`);
const loghiChiesti = giudicati.reduce((n, p) => n + p.logo, 0);
dice(!tiepidi.length && !banco0.penna && !banco0.voci, tiepidi.length || banco0.penna || banco0.voci
  ? `non ogni passo e' partito freddo: ${tiepidi.join(', ') || 'gia\' all\'apertura'}; penna.js o il logo gia' caricati o mai chiesti, o una voce del QR gia' pronta`
  : `ogni passo parte freddo: nessuna voce del QR, nessun logo, penna.js da caricare (penna.js chiesto ${pennaChiesta} volte in ritardo di ${sec(RITARDO_PENNA)}, il logo ${loghiChiesti} volte in ritardo di ${sec(RITARDO_LOGO)})`);
dice(!errori.length, 'la pagina non ha errori' + (errori.length ? ': ' + errori.slice(0, 3).join(' | ') : ''));

await chiudi();
console.log('Il QR nelle immagini che escono dal pannello:\n' + righe.join('\n'));
if (stretto) console.log(`\n${immagini} immagini esaminate; il QR «tuo» batte il ripiego piu' somigliante con uno scarto medio di almeno ${String(stretto.margine).replace('.', ',')} su 255 (il piu' stretto: ${stretto.dove}, contro ${stretto.contro}).`);
const rosso = giudicati.some((p) => !p.ok) || errori.length || guaiBanco.length || tiepidi.length || banco0.penna || banco0.voci;
console.log(rosso ? '\ncancello ROSSO ✗' : '\nOgni immagine che esce porta il QR del tuo stile, e si legge. ✓');
process.exit(rosso ? 1 : 0);
