// Collaudo della POSA: dove finisce davvero un elemento sulla tela.
//
// Il contratto, in una riga: x e y non sono il centro, sono la POSIZIONE LUNGO
// LA CORSA. 0 = a filo del bordo basso, 100 = a filo del bordo alto, e la corsa
// e' quel che avanza della tela una volta tolto il lato dell'elemento —
// il lato che si VEDE, cioe' dopo la Dimensione. Un elemento al 60% occupa
// meno spazio, quindi ha piu' strada da fare: se la corsa la si misura sul
// riquadro di impaginazione invece che su quello visibile, l'elemento si pianta
// prima del bordo (rimpicciolito) o lo scavalca (ingrandito), e chi trascina
// trova un muro dove non c'e'.
//
// Non si prova «il codice chiama la funzione giusta»: si MISURA il rettangolo
// reso dal browser e lo si confronta con i bordi della tela, per ogni
// Dimensione e per gli estremi e il centro dei due assi.
//
// Si collaudano ENTRAMBE le strade, perche' sono due file diversi che devono
// dire la stessa cosa: il banco di regia (app.js, _posElemento) e l'overlay
// vero (overlay-app.js, trasformaXY).
//
// Uso: node scripts/verifica-posa.mjs            (esce 1 se qualcosa non e' a filo)
//      node scripts/verifica-posa.mjs --selftest (rimette la formula vecchia:
//                                                 DEVE diventare rosso)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAD, 'src/web/public');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');

const OVL_W = 1920, OVL_H = 1080;
const DIMENSIONI = [30, 60, 100, 175, 300];
const TOLL = 1.5;

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2' };

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch {
  console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.');
  process.exit(0);
}

const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{}'); }
  const f = path.join(PUB, p === '/' ? 'index.html' : p);
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(PUB, 'index.html')));
  }
  res.writeHead(200, { 'content-type': TIPI[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const PORTA = srv.address().port;

const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });

const guai = [];
const attesa = (v, lato, tela) => (v / 100) * (tela - lato) + lato / 2;

// ---------------------------------------------------------------- banco di regia
{
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  p.on('pageerror', (e) => guai.push('banco: errore di pagina — ' + e.message));
  await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('alert'); });
  await p.waitForFunction(() => (document.querySelector('.pannello-scheda.visibile') || {}).id === 'scheda-alert', null, { timeout: 20000 });
  await p.waitForFunction(() => document.querySelectorAll('#ap-stage .ap-el').length > 4, null, { timeout: 20000 });
  await p.waitForFunction(() => (document.getElementById('ovl-preview')?.getBoundingClientRect().width || 0) > 100, null, { timeout: 20000 });
  await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector('.giro-velo')?.remove());

  const misure = await p.evaluate(({ DIMENSIONI, vecchia }) => {
    const fuori = [];
    const canvas = document.getElementById('ovl-preview').getBoundingClientRect();
    const scala = canvas.width / 1920;
    const chiavi = (typeof ELEMENTI === 'function' ? ELEMENTI() : []).map((e) => e.k);
    for (const k of chiavi) {
      const el = typeof _nodo === 'function' ? _nodo(k) : null;
      if (!el || el.style.display === 'none' || !el.offsetWidth) continue;
      const st = _statoXY(k);
      const s0 = st.s, x0 = st.x, y0 = st.y, r0 = st.r;
      st.r = 0;
      for (const s of DIMENSIONI) {
        for (const v of [0, 50, 100]) {
          st.s = s; st.x = v; st.y = v;
          if (vecchia) {
            el.style.position = 'absolute'; el.style.left = v + '%'; el.style.top = v + '%';
            el.style.right = 'auto'; el.style.bottom = 'auto';
            el.style.transform = 'translate(' + (-v) + '%,' + (-v) + '%) scale(' + (s / 100) + ') rotate(0deg)';
          } else _posElemento(el, st);
          const r = el.getBoundingClientRect();
          fuori.push({ k, s, v,
            sx: (r.left - canvas.left) / scala, dx: (r.right - canvas.left) / scala,
            su: (r.top - canvas.top) / scala, giu: (r.bottom - canvas.top) / scala,
            w: r.width / scala, h: r.height / scala });
        }
      }
      st.s = s0; st.x = x0; st.y = y0; st.r = r0;
      _posElemento(el, st);
    }
    return fuori;
  }, { DIMENSIONI, vecchia: SELFTEST });

  if (!misure.length) guai.push('banco: nessun elemento misurato');
  for (const m of misure) {
    const cx = m.sx + m.w / 2, cy = m.su + m.h / 2;
    const ax = attesa(m.v, m.w, OVL_W), ay = attesa(m.v, m.h, OVL_H);
    if (Math.abs(cx - ax) > TOLL) guai.push(`banco ${m.k} dim ${m.s}% x=${m.v}: centro a ${cx.toFixed(1)} invece di ${ax.toFixed(1)} (scarto ${(cx - ax).toFixed(1)}px)`);
    if (Math.abs(cy - ay) > TOLL) guai.push(`banco ${m.k} dim ${m.s}% y=${m.v}: centro a ${cy.toFixed(1)} invece di ${ay.toFixed(1)} (scarto ${(cy - ay).toFixed(1)}px)`);
  }
  // La seconda faccia dello stesso difetto: se la corsa e' sbagliata, il
  // trascinamento ha il GUADAGNO sbagliato — l'elemento non segue il dito,
  // scivola di piu' o di meno. Si prova nel mezzo della tela (lontano dai
  // limiti) e con Alt premuto, cosi' l'aggancio non falsa la misura.
  //
  // Si misura in unita' di TELA, rileggendo ogni volta il riquadro della tela:
  // fra una misura e l'altra la pagina puo' scorrere, e confrontare coordinate
  // di schermo attraverso uno scorrimento fa vedere difetti che non ci sono.
  if (!SELFTEST) {
    const dove = () => p.evaluate((k) => {
      const canvas = document.getElementById('ovl-preview').getBoundingClientRect();
      const scala = canvas.width / 1920;
      const r = _nodo(k).getBoundingClientRect();
      const l = _lati(_nodo(k), _statoXY(k));
      return { x: (r.left + r.width / 2 - canvas.left) / scala, y: (r.top + r.height / 2 - canvas.top) / scala,
        px: r.left + r.width / 2, py: r.top + r.height / 2, scala,
        corsaX: 1920 - l.w, corsaY: 1080 - l.h };
    }, 'musica');

    for (const dim of [60, 175]) {
      const pronto = await p.evaluate(({ k, dim }) => {
        if (typeof _nodo !== 'function' || !_nodo(k)) return false;
        seleziona(k);
        const st = _statoXY(k); st.s = dim; st.r = 0; st.x = 50; st.y = 50;
        _posElemento(_nodo(k), st);
        return true;
      }, { k: 'musica', dim });
      if (!pronto) { guai.push('banco: il player non c\'e\', guadagno non provato'); break; }
      await p.waitForTimeout(250);

      const a = await dove();
      const PX = Math.round(a.corsaX * 0.2 * a.scala), PY = Math.round(a.corsaY * 0.2 * a.scala);
      await p.keyboard.down('Alt');
      await p.mouse.move(a.px, a.py);
      await p.mouse.down();
      await p.mouse.move(a.px + PX / 2, a.py + PY / 2, { steps: 4 });
      await p.mouse.move(a.px + PX, a.py + PY, { steps: 4 });
      await p.mouse.up();
      await p.keyboard.up('Alt');
      await p.waitForTimeout(150);
      const z = await dove();

      const attX = PX / a.scala, attY = PY / a.scala;
      const ex = (z.x - a.x) - attX, ey = (z.y - a.y) - attY;
      if (Math.abs(ex) > 3) guai.push(`banco: al ${dim}% trascinando di ${attX.toFixed(0)} punti tela il player se ne fa ${(z.x - a.x).toFixed(1)} (scarto ${ex.toFixed(1)})`);
      if (Math.abs(ey) > 3) guai.push(`banco: al ${dim}% trascinando di ${attY.toFixed(0)} punti tela il player se ne fa ${(z.y - a.y).toFixed(1)} (scarto ${ey.toFixed(1)})`);
    }
  }

  await p.close();
}

// ---------------------------------------------------------------- overlay vero
{
  const p = await b.newPage({ viewport: { width: OVL_W / 2, height: OVL_H / 2 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => guai.push('overlay: errore di pagina — ' + e.message));
  await p.goto(`http://127.0.0.1:${PORTA}/overlay.html?t=collaudo`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof window.trasformaXY === 'function', null, { timeout: 20000 });

  const misure = await p.evaluate(({ DIMENSIONI, vecchia }) => {
    const T = { w: window.innerWidth, h: window.innerHeight };
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;width:213px;height:64px;background:#000;z-index:99999';
    document.body.appendChild(el);
    const fuori = [];
    for (const s of DIMENSIONI) {
      for (const v of [0, 50, 100]) {
        const xy = { x: v, y: v, s, r: 0 };
        el.style.left = v + '%'; el.style.top = v + '%';
        el.style.transform = vecchia
          ? 'translate(' + (-v) + '%,' + (-v) + '%) scale(' + (s / 100) + ') rotate(0deg)'
          : window.trasformaXY(xy);
        const r = el.getBoundingClientRect();
        fuori.push({ s, v, sx: r.left, su: r.top, w: r.width, h: r.height, tw: T.w, th: T.h });
      }
    }
    el.remove();
    return fuori;
  }, { DIMENSIONI, vecchia: SELFTEST });

  // Spostare una cosa non deve RIDIMENSIONARLA. Posato con left:x% e senza
  // right, un elemento largo quanto il suo contenuto si restringe a quel che
  // avanza fino al bordo: piu' lo porti a destra e piu' si stringe, finche' il
  // titolo si taglia. Nel banco non succedeva (la tela da' width: max-content),
  // quindi anteprima e diretta impaginavano diverso.
  if (!SELFTEST) {
    const larghezze = await p.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'ovl-widget ovl-musica dim-media dentro verso-riga righe-due cover-quadrata'
        + ' barra-sotto con-onde sfondo-no ritmo-onde suona forma-carta materia-piatta cornice-nessuna';
      el.innerHTML = '<span class="m-sfondo"></span><span class="m-cover"><span class="m-disco"></span></span>'
        + '<span class="m-corpo"><span class="m-riga"><span class="m-scorri"><b>Un titolo lungo il giusto</b></span></span>'
        + '<span class="m-riga m-riga2"><span class="m-scorri2">Nome dell\'artista</span></span>'
        + '<span class="m-sotto"><span class="m-barra"><i></i></span><span class="m-tempi">2:33 / 3:43</span></span></span>'
        + '<span class="m-onde"><i></i><i></i><i></i><i></i></span>';
      document.body.appendChild(el);
      const fuori = [];
      for (const x of [5, 50, 90, 98]) {
        posaElemento(el, 'sonda-posa', { xy: { x, y: 50, s: 100, r: 0 } });
        fuori.push({ x, larg: el.getBoundingClientRect().width });
      }
      el.remove();
      return fuori;
    });
    const base = larghezze[0].larg;
    for (const l of larghezze) {
      if (Math.abs(l.larg - base) > 1) {
        guai.push(`overlay: spostato a x=${l.x} il player si restringe a ${l.larg.toFixed(1)}px invece di restare ${base.toFixed(1)}px`);
      }
    }
  }

  for (const m of misure) {
    const cx = m.sx + m.w / 2, cy = m.su + m.h / 2;
    const ax = attesa(m.v, m.w, m.tw), ay = attesa(m.v, m.h, m.th);
    if (Math.abs(cx - ax) > TOLL) guai.push(`overlay dim ${m.s}% x=${m.v}: centro a ${cx.toFixed(1)} invece di ${ax.toFixed(1)} (scarto ${(cx - ax).toFixed(1)}px)`);
    if (Math.abs(cy - ay) > TOLL) guai.push(`overlay dim ${m.s}% y=${m.v}: centro a ${cy.toFixed(1)} invece di ${ay.toFixed(1)} (scarto ${(cy - ay).toFixed(1)}px)`);
  }
  await p.close();
}

await b.close();
srv.close();

if (SELFTEST) {
  if (guai.length) { console.log(`Autoprova: con la formula vecchia il cancello vede ${guai.length} pose storte. ✓`); process.exit(0); }
  console.log('Autoprova FALLITA: con la formula vecchia il cancello resta verde, quindi non misura niente.');
  process.exit(1);
}

if (guai.length) {
  console.log('Pose storte:');
  for (const g of guai.slice(0, 40)) console.log(' - ' + g);
  if (guai.length > 40) console.log(` … e altre ${guai.length - 40}`);
  process.exit(1);
}
console.log('Posa a filo dei bordi a ogni Dimensione, nel banco e nell\'overlay. ✓');
