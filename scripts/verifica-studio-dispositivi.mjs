// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Collaudo di PIU' DISPOSITIVI, UNA REGIA (docs/DIRETTA.md), in browser veri:
// una finestra e' lo Studio sul computer (la regia), le altre sono telefoni
// con la fotocamera finta di Chromium. Si parlano in WebRTC per davvero,
// attraverso le rotte VERE (src/web/rotte-dispositivi.js) col salotto vero e
// l'archivio vero (cifrato) su una cartella usa e getta. Sta nella catena di
// `npm run cancelli`, col suo --selftest; senza Chromium si salta da solo.
//
// Ogni promessa del piano si misura: il video che arriva e si disegna sulla
// tela, il bordo rosso del telefono in onda, il protagonista con la sua voce e
// il microfono del computer muto, chi comanda e chi no, la caduta del
// protagonista e il ritorno, il buco dei segnali che non stacca il video, la
// regia che passa a un'altra finestra, il telefono dello streamer che non si
// moltiplica, la revoca, e la pagina del telefono comoda in verticale e in
// orizzontale.
//
// Uso: node scripts/verifica-studio-dispositivi.mjs             (esce 1 se una promessa non tiene)
//      node scripts/verifica-studio-dispositivi.mjs --selftest  (rimette un difetto per promessa, e li vuole rossi tutti)

import './_dati-usa-e-getta.mjs';
import { apriSito, chromiumQui, PUB } from './_sito.mjs';
import fs from 'node:fs';
import path from 'node:path';

const CHROMIUM = chromiumQui();
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
let chromium, express;
if (!CHROMIUM) { console.log('Chromium non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }
try { ({ default: express } = await import('express')); }
catch { console.log('Express non c\'e\': collaudo saltato.'); process.exit(0); }
const { creaSalotto } = await import('../src/features/studio-dispositivi.js');
const { montaDispositivi } = await import('../src/web/rotte-dispositivi.js');
const { studioDispositivi } = await import('../src/db.js');

// L'AUTOPROVA: un difetto per promessa, ognuno in un giro a parte (--rompi=N),
// perche' alcuni si coprirebbero a vicenda (un telefono che non si collega
// nasconde tutto quello che viene dopo).
const SELFTEST = process.argv.includes('--selftest');
const ROMPI = Number((process.argv.find((a) => a.startsWith('--rompi=')) || '').split('=')[1]) || 0;
const DIFETTI = {
  '/js/studio-camera-remota.js': [
    ["      if (pc && giroPc === giro && ['connected', 'connecting', 'new'].includes(pc.connectionState)) return;\n", '', 'il buco dei segnali non stacca il video (telefono)', 1, /buco dei segnali del telefono/],
    ["      if (pc && giroPc === giro && ['connected', 'connecting', 'new'].includes(pc.connectionState)) return;", "      if (pc && ['connected', 'connecting', 'new'].includes(pc.connectionState)) return;", 'una regia nuova rifa\' il collegamento', 2, /regia nuova riceve il video in pochi secondi/],
  ],
  '/js/studio-remoti.js': [
    ["      if (!collegato && v.pc?.connectionState !== 'connected') {", '      if (!collegato) {', 'il buco dei segnali non stacca il video (regia)', 3, /buco dei segnali del telefono/],
  ],
  '/app.js': [
    ['  if (!vivo && !P.auto && d.inOnda === P.scena && ora - P.persoDa >= REM_RIPIEGO_MS) {', '  if (false) {', 'perso il protagonista si torna indietro', 4, /si torna alla scena di prima/],
    ['    if (d.inOnda === P.ripiego && studioScena(P.scena)) {', '    if (false) {', 'tornato il protagonista si torna a lui', 6, /si torna a lui da soli/],
    ["  if (!v.comanda) { R.regia.manda(v.id, { t: 'avviso',", "  if (false) { R.regia.manda(v.id, { t: 'avviso',", 'chi entra col QR non comanda', 1, /col QR non cambia scena/],
    ['    studioRemotiVerificaInvito();\n', '', 'l\'invito usato sparisce', 1, /invito usato non si mostra/],
    ['  A.gMic.gain.value = m.mic.mute || !mi.computer ? 0 : m.mic.vol / 100;', '  A.gMic.gain.value = m.mic.mute ? 0 : m.mic.vol / 100;', 'il protagonista zittisce il computer', 1, /microfono del computer tace/],
    ['  if (!STUDIO.live) studioSpegniRegia();\n', '', 'chi cede la regia lascia fotocamera, microfono e scene', 9, /una regia sola/],
    ["  if (azione === 'unisciti') { location.href = '/cam?io=1&lang=' + encodeURIComponent(LINGUA); return; }", "  if (azione === 'unisciti') { location.href = '/cam?io=1'; return; }", 'la fotocamera dello streamer parla la lingua del pannello', 8, /apre la fotocamera col tuo account/],
    ["  if (!i) return `<button type=\"button\" class=\"${piccolo ? 'tel-grande' : 'btn secondario mini'}\" data-rem-invita", "  if (!i) return `<button type=\"button\" class=\"btn${piccolo ? ' tel-grande' : ' secondario mini'}\" data-rem-invita", 'sul telefono il tasto per collegare e\' da pollice', 8, /foglio «Dispositivi»/],
  ],
  '/js/studio-modello.js': [
    ["  return normalizzaScena({ nome, audio: 'dispositivi', fonti:", "  return normalizzaScena({ nome, audio: 'computer', fonti:", 'il protagonista porta la sua voce', 1, /microfono del computer tace|la sua voce/],
  ],
  '/cam.js': [
    ["muto: S.muto, batteria: S.batteria, qual: S.qual,", 'muto: S.muto, batteria: S.batteria,', 'la qualita\' scelta si vede', 1, /qualita' scelta dalla regia/],
    ["  cam.classList.toggle('onda', collegato && t.onda);", "  cam.classList.toggle('onda', false);", 'in onda il bordo e\' rosso', 1, /bordo rosso/],
    ['      if (mio) { S.riprendi =', '      if (false) { S.riprendi =', 'il telefono dello streamer non si moltiplica', 5, /non si moltiplica/],
    ["  else if (e === 'tolto') tolto();\n", '', 'tolto dalla regia, il telefono lo dice', 7, /il telefono lo dice/],
    ['  if (dopo?.cam && m.canali[dopo.canale]) {', '  if (false) {', 'dopo un aggiornamento il telefono si ricollega da solo', 6, /si ricollega da solo, senza tocchi/],
    ['    catch (e) { if (e.stato === 401 || e.stato === 404) tolto(!S.pronto); throw e; }', '    catch (e) { throw e; }', 'tolto dalla regia, il telefono lo dice (bis)', 7, /il telefono lo dice/],
  ],
  '/cam.css': [
    ['min-width: 60px; min-height: 60px;', 'min-width: 30px; min-height: 30px;', 'i tasti del telefono sono da pollice', 1, /da pollice/],
    ['  .cam-barra { top: 0; left: auto; width: 104px;', '  .cam-barra { top: auto; left: 0; width: auto;', 'di lato la barra va a destra', 5, /in orizzontale la barra/],
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
    let tocco = false;
    for (const [da, a, , g] of lista) {
      if (g !== ROMPI) continue;
      if (t.split(da).length !== 2) { console.log(`Autoprova: il difetto «${da.slice(0, 60)}» non si trova una volta sola in ${via}.`); process.exit(1); }
      t = t.replace(da, a); tocco = true;
    }
    if (tocco) serviti.set(via, t);
  }
}

// ---------------------------------------------------------------- il banco
// Le rotte vere, col salotto vero e l'archivio vero. La sessione del
// proprietario e' un biscotto del collaudo: e' l'unica cosa finta, ed e'
// esattamente quello che il server vero controlla con requireOwner.
const LOGIN = 'prova';
const aperti = { cam: new Set(), regia: new Set() };
const dispositivi = express();
dispositivi.use(express.json({ limit: '2mb' }));
dispositivi.use((req, res, next) => {
  const k = req.path === '/api/cam/eventi' ? 'cam' : (req.path === '/api/studio/regia/eventi' ? 'regia' : '');
  if (k) { aperti[k].add(res); res.on('close', () => aperti[k].delete(res)); }
  next();
});
const sessione = (req, res, next) => (/(?:^|;\s*)sb-prova=1(?:;|$)/.test(String(req.headers.cookie || '')) ? next() : res.status(401).json({ errore: 'serve la sessione' }));
const PER_LE_ROTTE = /^\/(cam(\/|$)|api\/cam\/|api\/studio\/dispositivi|api\/studio\/regia\/)/;
const sito = await apriSito({ rotte: (req, res, q) => { if (!PER_LE_ROTTE.test(q)) return false; dispositivi(req, res); return true; } });
const { porta: PORTA, base: BASE, chiudi: chiudiSito } = sito;
const salotto = creaSalotto({ archivio: studioDispositivi });
montaDispositivi(dispositivi, {
  salotto, cancelliRegia: [sessione], loginDi: () => LOGIN, studioPerMe: () => true, eLoginNostro: (l) => l === LOGIN,
  camHtml: path.join(PUB, 'cam.html'), baseUrl: BASE, turnAcceso: false,
});
const taglia = (k) => { for (const r of [...aperti[k]]) { try { r.socket?.destroy(); } catch { /* gia' chiuso */ } } };

const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage',
    '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required',
    '--disable-features=WebRtcHideLocalIpsWithMdns'] });
const esiti = [];
const ok = (cosa, vero, dettaglio = '') => { esiti.push({ cosa, vero: !!vero }); console.log(`  ${vero ? '✓' : '✗'} ${cosa}${!vero && dettaglio ? ' (' + dettaglio + ')' : ''}`); };
const errori = [];

async function pagina(ctx, nome) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errori.push(`${nome}: ${e.message}`));
  if (serviti.size) {
    await p.route((u) => u.host === `127.0.0.1:${PORTA}` && serviti.has(u.pathname), async (route) => {
      const r = await route.fetch();
      await route.fulfill({ response: r, body: serviti.get(new URL(route.request().url()).pathname) });
    });
  }
  return p;
}
async function contesto({ telefono = false, sessione: conSessione = false, w = 390, h = 844 } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: telefono, hasTouch: telefono, serviceWorkers: 'block', permissions: ['camera', 'microphone'] });
  if (conSessione) await ctx.addCookies([{ name: 'sb-prova', value: '1', url: BASE }]);
  return ctx;
}
async function apriRegia(ctx) {
  const p = await pagina(ctx, 'regia');
  await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); } catch {} });
  await p.goto(`${BASE}/?demo=1&studio=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('studio'); });
  await prendiLaRegia(p);
  return p;
}
// Lo Studio e' uno per browser: se un'altra finestra ce l'ha, questa mostra il
// cartello «Lo Studio e' aperto in un'altra scheda» e lo prende solo a richiesta.
async function prendiLaRegia(p) {
  await p.waitForFunction(() => typeof STUDIO !== 'undefined' && (!!STUDIO.doc || !document.getElementById('studio-fuori')?.hidden), null, { timeout: 20000 });
  if (await p.evaluate(() => !STUDIO.doc)) await p.click('#studio-fuori [data-fin="qui"]');
  await p.waitForFunction(() => !!STUDIO.doc && !!STUDIO.tele.o, null, { timeout: 20000 });
  // In demo la regia dei dispositivi non parte da sola (non c'e' un account):
  // qui c'e', e la si avvia come fa lo Studio vero all'apertura.
  // Le transizioni le prova il collaudo dello Studio: qui il taglio, perche'
  // ogni cambio di scena si possa leggere subito.
  await p.evaluate(() => { STUDIO.doc.scelte.transizione.tipo = 'taglio'; studioRemotiAvvia(); });
  await p.waitForFunction(() => STUDIO.rem.stato === 'regia', null, { timeout: 10000 });
  await p.evaluate(() => document.getElementById('studio-palco-prog')?.scrollIntoView({ block: 'center' }));
}
const aspetta = async (p, f, arg, ms = 20000) => { try { await p.waitForFunction(f, arg, { timeout: ms, polling: 100 }); return true; } catch { return false; } };
const collegatoAllaRegia = (p, id, ms = 20000) => aspetta(p, (i) => { const v = i ? STUDIO.rem.regia?.remoti.get(i) : [...(STUDIO.rem.regia?.remoti.values() || [])].find((x) => x.stato === 'collegato'); return !!v && v.stato === 'collegato' && v.video?.videoWidth > 0; }, id, ms);
const fotogrammi = (p, id) => p.evaluate((i) => STUDIO.rem.regia.remoti.get(i)?.video?.getVideoPlaybackQuality?.().totalVideoFrames || 0, id);
const tally = (t) => t.evaluate(() => ({ testo: document.getElementById('tally').textContent, onda: document.getElementById('cam').classList.contains('onda'), anteprima: document.getElementById('cam').classList.contains('anteprima') }));

// I pixel della tela dentro un riquadro che non sono il fondo (#0b0b0f). Le
// posizioni stanno nelle misure del formato (FORMATI del modello), la tela ha
// le sue: la scala si legge, non si scrive a mano.
const pixelIn = (p, box) => p.evaluate((bx) => {
  const c = STUDIO.tele.o, g = c.getContext('2d');
  const sx = c.width / STUDIO.M.FORMATI.o.W, d = g.getImageData(Math.round(bx.x * sx), Math.round(bx.y * sx), Math.max(1, Math.round(bx.w * sx)), Math.max(1, Math.round(bx.h * sx))).data;
  let n = 0, tot = 0;
  for (let i = 0; i < d.length; i += 16) { tot++; if (Math.abs(d[i] - 11) + Math.abs(d[i + 1] - 11) + Math.abs(d[i + 2] - 15) > 30) n++; }
  return tot ? n / tot : 0;
}, box);

try {
  // ------------------------------------------------------------ l'invito
  console.log('La regia sul computer e l\'invito:');
  const ctxR = await contesto({ sessione: true, w: 1280, h: 900 });
  const regia = await apriRegia(ctxR);
  const dock = await regia.evaluate(() => { const d = document.querySelector('.studio-dock-remoti'); const r = d?.getBoundingClientRect(); return { c: !!d, w: r?.width || 0, largo: document.documentElement.scrollWidth - document.documentElement.clientWidth, voce: !!document.querySelector('#studio-docks [data-add="remota"]') }; });
  ok('lo Studio ha il pannello «Dispositivi» e la voce in «Aggiungi»', dock.c && dock.w > 150 && dock.voce, JSON.stringify(dock));
  ok('la pagina non scorre di lato', dock.largo <= 0, `${dock.largo}px`);
  const inv = await regia.evaluate(async () => {
    const r = await fetch('/api/studio/dispositivi/invito', { method: 'POST' });
    STUDIO.rem.invito = await r.json(); renderStudioRemoti();
    return { i: STUDIO.rem.invito, qr: document.querySelectorAll('.studio-remoti-qr svg').length, codice: document.querySelector('.studio-remoti-codice')?.textContent.replace(/\s/g, '') };
  });
  ok('l\'invito si mostra col QR e col codice di sei cifre', inv.qr === 1 && inv.codice === inv.i.codice && /^\d{6}$/.test(inv.codice), JSON.stringify({ qr: inv.qr, codice: inv.codice }));
  ok('il link dell\'invito porta alla pagina del telefono', inv.i.url === `${BASE}/cam/${inv.i.token}`, inv.i.url);

  // ------------------------------------------------------------ il telefono entra
  console.log('Un telefono entra col QR:');
  const ctxT = await contesto({ telefono: true });
  let tel = await pagina(ctxT, 'telefono');
  await tel.goto(`${inv.i.url}?lang=it`, { waitUntil: 'domcontentloaded' });
  const canale = await aspetta(tel, () => document.getElementById('canale')?.textContent === 'prova', null, 8000);
  ok('la pagina dice di chi e\' la diretta', canale);
  await tel.fill('#nome', 'Telefono di prova');
  await tel.click('#collega');
  const arrivato = await collegatoAllaRegia(regia);
  ok('il video del telefono arriva alla regia', arrivato);
  const id = await regia.evaluate(() => [...STUDIO.rem.regia.remoti.values()].find((x) => x.stato === 'collegato')?.id || '');
  const pronto = await aspetta(tel, () => document.getElementById('tally').textContent === 'Pronta', null, 10000);
  ok('il telefono si dice pronto, non in onda', pronto, (await tally(tel)).testo);
  const voce = await regia.evaluate((i) => { renderStudioRemoti(); const li = [...document.querySelectorAll('#studio-remoti .studio-remoto')]; return { n: li.length, testo: li[0]?.textContent || '', prot: !!document.querySelector(`#studio-remoti [data-rem-prot="${i}"]`) }; }, id);
  ok('la regia lo elenca col suo nome e il tasto «Fallo protagonista»', voce.n === 1 && /Telefono di prova/.test(voce.testo) && /in diretta col computer/.test(voce.testo) && voce.prot, voce.testo.slice(0, 120));

  const usato = await aspetta(regia, () => !document.querySelector('#studio-remoti .studio-remoti-codice'), null, 5000);
  ok('l\'invito usato non si mostra piu\': vale una volta', usato);
  await regia.evaluate((i) => document.querySelector(`#studio-remoti [data-rem-cmd="qualita"][data-rem-v="1080p30"][data-rem-id="${i}"]`)?.click(), id);
  const qualita = await aspetta(regia, (i) => { renderStudioRemoti(); return document.querySelector(`#studio-remoti [data-rem-v="1080p30"][data-rem-id="${i}"]`)?.getAttribute('aria-pressed') === 'true' && document.querySelector(`#studio-remoti [data-rem-v="720p30"][data-rem-id="${i}"]`)?.getAttribute('aria-pressed') === 'false'; }, id, 10000);
  ok('la qualita\' scelta dalla regia arriva al telefono, e la regia la vede segnata', qualita);
  await collegatoAllaRegia(regia, id, 15000);

  // La pagina del telefono, in verticale.
  const forma = await tel.evaluate(() => {
    const r = (s) => document.querySelector(s)?.getBoundingClientRect();
    const tasti = [...document.querySelectorAll('.cam-barra button, .cam-su button')].map((x) => x.getBoundingClientRect()).map((q) => Math.min(q.width, q.height));
    return { largo: document.documentElement.scrollWidth - document.documentElement.clientWidth, minimo: Math.min(...tasti), barra: r('.cam-barra'), su: r('.cam-su'), alto: innerHeight };
  });
  ok('i tasti del telefono sono da pollice (48 punti o piu\')', forma.minimo >= 48, `${forma.minimo}px`);
  ok('la pagina del telefono non scorre di lato e la barra sta in fondo', forma.largo <= 0 && Math.round(forma.barra.bottom) === forma.alto && forma.su.bottom < forma.barra.top);

  // ------------------------------------------------------------ A: un'inquadratura in piu'
  console.log('A: il telefono come inquadratura in piu\':');
  await regia.evaluate((i) => document.querySelector(`#studio-remoti [data-rem-aggiungi="${i}"]`).click(), id);
  const fonte = await regia.evaluate((i) => { const f = studioSceneAttiva().fonti.find((x) => x.tipo === 'remota' && x.dispositivo === i); return f ? { manca: studioManca(f), box: f.pos.o } : null; }, id);
  ok('aggiunto alla scena, la scena lo vede', !!fonte && !fonte.manca, JSON.stringify(fonte));
  await regia.waitForTimeout(600);
  const px = fonte ? await pixelIn(regia, fonte.box) : 0;
  ok('il suo video si disegna sulla tela, nel suo riquadro', px > 0.5, `${Math.round(px * 100)}% del riquadro`);
  const inOnda = await aspetta(tel, () => document.getElementById('tally').textContent === 'IN ONDA' && document.getElementById('cam').classList.contains('onda'), null, 6000);
  ok('in onda il telefono lo dice, col bordo rosso', inOnda, JSON.stringify(await tally(tel)));

  // ------------------------------------------------------------ B: il protagonista
  console.log('B: il telefono protagonista:');
  const primaScena = await regia.evaluate(() => STUDIO.doc.inOnda);
  await regia.evaluate((i) => document.querySelector(`#studio-remoti [data-rem-prot="${i}"]`).click(), id);
  const prot = await regia.evaluate((i) => {
    studioAudioInit();
    const s = studioScena(STUDIO.doc.inOnda), f = s.fonti.find((x) => x.tipo === 'remota');
    const r = STUDIO.audio.rem.get(i);
    return { nuova: s.id, audio: s.audio, tutta: !!f && STUDIO.M.copreTutto(f), mic: STUDIO.audio.gMic.gain.value, suo: r ? r.gain.gain.value : -1, nome: s.nome };
  }, id);
  ok('una scena sua, a tutta tela, va in onda', prot.nuova !== primaScena && prot.tutta && /Telefono di prova/.test(prot.nome), JSON.stringify(prot));
  ok('va in onda la sua voce e il microfono del computer tace', prot.audio === 'dispositivi' && prot.mic === 0 && prot.suo > 0, `audio ${prot.audio}, computer ${prot.mic}, telefono ${prot.suo}`);

  // Chi comanda e chi no.
  console.log('Chi comanda:');
  const altra = await regia.evaluate((pr) => STUDIO.doc.scene.find((s) => s.id === pr)?.id, primaScena);
  await regia.evaluate(([i, a]) => studioRemotoMessaggio(STUDIO.rem.regia.remoti.get(i), { t: 'cmd', cmd: 'scena', id: a }), [id, altra]);
  await regia.waitForTimeout(800);
  const ospite = await regia.evaluate(() => STUDIO.doc.inOnda);
  ok('chi entra col QR non cambia scena: lo decide il computer', ospite === prot.nuova, `in onda ${ospite}`);
  const senzaTasti = await tel.evaluate(() => !document.querySelector('[data-cam="protagonista"]') && document.getElementById('scene').hidden);
  ok('e sul suo telefono non ci sono i comandi della regia', senzaTasti);
  await regia.evaluate((i) => { document.querySelector(`#studio-remoti [data-rem-comanda="${i}"]`).click(); }, id);
  const comandi = await aspetta(tel, () => !!document.querySelector('[data-cam="protagonista"]') && !document.getElementById('scene').hidden && document.querySelectorAll('[data-scena]').length >= 2, null, 8000);
  ok('dato il comando dalla regia, il telefono ha scene e «Prendi la scena»', comandi);
  if (comandi) {
    await tel.evaluate((a) => document.querySelector(`[data-scena="${a}"]`).click(), altra);
    const cambiata = await aspetta(regia, (a) => STUDIO.doc.inOnda === a, altra, 6000);
    ok('e dal telefono si cambia scena davvero', cambiata);
    await regia.evaluate((i) => studioRemotoProtagonista(i), id);
  }

  // ------------------------------------------------------------ il buco dei segnali
  console.log('Il buco dei segnali:');
  const pcPrima = await regia.evaluate((i) => { window._pcPrima = STUDIO.rem.regia.remoti.get(i).pc; return true; }, id);
  const f0 = await fotogrammi(regia, id);
  taglia('cam');
  await regia.waitForTimeout(500);
  await aspetta(regia, (i) => STUDIO.rem.regia.remoti.get(i)?.collegato === true, id, 12000);
  await regia.waitForTimeout(1500);
  const dopoCam = await regia.evaluate((i) => { const v = STUDIO.rem.regia.remoti.get(i); return { stesso: v.pc === window._pcPrima, stato: v.stato }; }, id);
  const f1 = await fotogrammi(regia, id);
  ok('il buco dei segnali del telefono non stacca il video', pcPrima && dopoCam.stesso && dopoCam.stato === 'collegato' && f1 > f0 + 10, `${JSON.stringify(dopoCam)}, fotogrammi ${f0}→${f1}`);
  taglia('regia');
  await regia.waitForTimeout(500);
  await aspetta(regia, () => STUDIO.rem.stato === 'regia', null, 12000);
  await regia.waitForTimeout(1500);
  const dopoRegia = await regia.evaluate((i) => { const v = STUDIO.rem.regia.remoti.get(i); return { stesso: v.pc === window._pcPrima, stato: v.stato, regia: STUDIO.rem.stato }; }, id);
  const f2 = await fotogrammi(regia, id);
  ok('il buco dei segnali della regia non stacca il video', dopoRegia.stesso && dopoRegia.stato === 'collegato' && dopoRegia.regia === 'regia' && f2 > f1 + 10, `${JSON.stringify(dopoRegia)}, fotogrammi ${f1}→${f2}`);

  // ------------------------------------------------------------ caduta e ritorno
  console.log('Il protagonista si perde e torna:');
  // La scena di prima mostrava anche lui, come inquadratura in piu': si torna
  // a una scena che NON lo mostra (lo prova il modello). Qui lo si toglie da
  // quella scena, come farebbe lo streamer, e si pretende proprio lei.
  const scenaProt = await regia.evaluate(([i, pr]) => { const s = studioScena(pr); s.fonti = s.fonti.filter((f) => !(f.tipo === 'remota' && f.dispositivo === i)); renderStudioTutto(); return STUDIO.doc.inOnda; }, [id, primaScena]);
  await tel.close();
  const ripiego = await aspetta(regia, (s) => STUDIO.doc.inOnda !== s, scenaProt, 25000);
  const doveRipiego = await regia.evaluate((i) => { const s = studioScena(STUDIO.doc.inOnda); return { id: s.id, lui: s.fonti.some((f) => f.tipo === 'remota' && f.dispositivo === i) }; }, id);
  ok('perso il protagonista, dopo qualche secondo si torna alla scena di prima', ripiego && doveRipiego.id === primaScena && !doveRipiego.lui, `in onda ${JSON.stringify(doveRipiego)}, prima ${primaScena}`);
  tel = await pagina(ctxT, 'telefono');
  await tel.goto(`${BASE}/cam?lang=it`, { waitUntil: 'domcontentloaded' });
  const riprendi = await aspetta(tel, () => !!document.getElementById('b-riprendi'), null, 6000);
  ok('riaperta la pagina, il telefono si ricollega con un tocco, senza codice', riprendi);
  if (riprendi) await tel.click('#b-riprendi');
  const tornato = await aspetta(regia, (s) => STUDIO.doc.inOnda === s, scenaProt, 20000);
  ok('tornato il segnale, si torna a lui da soli', tornato);
  // Il bot si aggiorna e la pagina del telefono si ricarica (docs/AGGIORNARE.md):
  // si ricollega da sola, senza un tocco, con la sua chiave.
  await aspetta(tel, () => document.body.classList.contains('in-cam'), null, 10000);
  await regia.evaluate((i) => { window._pcCam = STUDIO.rem.regia.remoti.get(i)?.pc; }, id);
  await tel.evaluate((c) => sessionStorage.setItem('sb-aggiornata', JSON.stringify({ alle: Date.now(), cam: true, canale: c })), LOGIN).catch(() => {});
  await tel.reload({ waitUntil: 'domcontentloaded' });
  const daSolo = await aspetta(tel, () => document.body.classList.contains('in-cam') && !document.getElementById('b-riprendi'), null, 10000);
  const diNuovo = daSolo && await aspetta(regia, (i) => { const v = STUDIO.rem.regia?.remoti.get(i); return !!v && v.pc !== window._pcCam && v.stato === 'collegato' && v.video?.videoWidth > 0; }, id, 20000);
  ok('dopo un aggiornamento il telefono si ricollega da solo, senza tocchi', daSolo && diNuovo);

  // ------------------------------------------------------------ un'altra finestra prende la regia
  console.log('La regia passa a un\'altra finestra:');
  // Il passaggio si misura nel tempo: senza il giro il video arriverebbe lo
  // stesso, ma solo dopo il rifacimento da capo dei 20 secondi.
  const regia2 = await apriRegia(ctxR);
  const t0 = Date.now();
  const nuova = await collegatoAllaRegia(regia2, id, 8000);
  ok('la regia nuova riceve il video in pochi secondi', nuova, `${Date.now() - t0} ms`);
  console.log(`    (passaggio in ${Date.now() - t0} ms)`);
  const vecchia = await aspetta(regia, () => STUDIO.rem.stato === 'altrove' && !document.getElementById('studio-fuori').hidden && !!document.querySelector('#studio-fuori [data-fin="qui"]'), null, 5000);
  ok('e la vecchia lo sa, col tasto per riprenderla', vecchia);
  ok('e ha lasciato fotocamera, microfono e scene alla nuova: una regia sola', await regia.evaluate(() => !STUDIO.doc && !STUDIO.cap.camStream && !STUDIO.cap.micStream && document.getElementById('studio-carta').hidden));
  if (vecchia) await prendiLaRegia(regia);
  const ripresa = await collegatoAllaRegia(regia, id);
  ok('ripresa la regia, il video torna alla prima finestra', ripresa);
  await regia2.close();

  // ------------------------------------------------------------ il telefono dello streamer
  console.log('Il telefono dello streamer, col suo account:');
  const ctxIo = await contesto({ telefono: true, sessione: true });
  let io = await pagina(ctxIo, 'io');
  await io.goto(`${BASE}/cam?io=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await aspetta(io, () => /Collega il mio telefono/.test(document.getElementById('collega').textContent), null, 6000);
  await io.click('#collega');
  const ioDentro = await aspetta(io, () => !!document.querySelector('[data-cam="protagonista"]') && document.getElementById('tally').textContent === 'Pronta', null, 20000);
  ok('entra senza codice e comanda da subito', ioDentro);
  const quanti = async () => (await regia.evaluate(async () => (await (await fetch('/api/studio/dispositivi')).json()).elenco.length));
  const n1 = await quanti();
  await io.reload({ waitUntil: 'domcontentloaded' });
  await aspetta(io, () => /Collega il mio telefono/.test(document.getElementById('collega').textContent), null, 6000);
  await io.waitForTimeout(400);
  await io.click('#collega');
  const ioDinuovo = await aspetta(io, () => document.getElementById('tally').textContent === 'Pronta', null, 20000);
  const n2 = await quanti();
  ok('ricollegandolo non si moltiplica: resta lo stesso dispositivo', ioDinuovo && n1 === 2 && n2 === 2, `${n1} → ${n2}`);

  // ------------------------------------------------------------ lo Studio aperto sul telefono
  console.log('Lo Studio aperto sul telefono, con la regia sul computer:');
  const ctxS = await contesto({ telefono: true, sessione: true });
  const st = await pagina(ctxS, 'studio-telefono');
  await st.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); } catch {} });
  await st.goto(`${BASE}/?demo=1&studio=1&lang=it`, { waitUntil: 'domcontentloaded' });
  await st.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
  await st.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('studio'); });
  await st.waitForFunction(() => typeof STUDIO !== 'undefined' && !!STUDIO.doc, null, { timeout: 20000 });
  // In demo la regia non chiede al server se c'e' gia' una regia: lo stato
  // che la risposta darebbe si mette qui, e si guarda cosa ne fa la pagina.
  const fogli = await st.evaluate(() => {
    if (!STUDIO.tel?.aperta) studioTelApri();
    STUDIO.rem.stato = 'telefono'; STUDIO.rem.presenza = { regia: true, live: false };
    STUDIO.tel.foglio = ''; studioTelFoglio('regia-altrove');
    const r = (s) => { const q = document.querySelector(s)?.getBoundingClientRect(); return q ? { lato: Math.min(q.width, q.height), dentro: q.top >= 0 && q.bottom <= innerHeight + 1 } : null; };
    const altrove = { unisciti: r('#tel-foglio [data-tel="unisciti"]'), qui: r('#tel-foglio [data-rem-qui]') };
    STUDIO.tel.foglio = ''; studioTelFoglio('dispositivi');
    const disp = { invita: r('#tel-foglio [data-rem-invita]'), largo: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    STUDIO.tel.foglio = ''; studioTelFoglio('regia-altrove');
    return { altrove, disp };
  });
  const tastoOk = (t) => !!t && t.lato >= 48 && t.dentro;
  ok('sul telefono, con la regia al computer, si sceglie: fotocamera o regia da qui', tastoOk(fogli.altrove.unisciti) && tastoOk(fogli.altrove.qui), JSON.stringify(fogli.altrove));
  ok('e dal foglio «Dispositivi» si collega un altro telefono', tastoOk(fogli.disp.invita) && fogli.disp.largo <= 0, JSON.stringify(fogli.disp));
  await Promise.all([st.waitForURL(/\/cam\?io=1/, { timeout: 8000 }).catch(() => null), st.evaluate(() => document.querySelector('#tel-foglio [data-tel="unisciti"]').click())]);
  const ioPagina = await aspetta(st, () => /Collega il mio telefono/.test(document.getElementById('collega')?.textContent || ''), null, 8000);
  ok('«Collega come fotocamera» apre la fotocamera col tuo account, senza codice', /\/cam\?io=1/.test(st.url()) && ioPagina, st.url());
  await ctxS.close();

  // ------------------------------------------------------------ la revoca
  console.log('La revoca:');
  await regia.evaluate((i) => { renderStudioRemoti(); document.querySelector(`#studio-remoti [data-rem-togli="${i}"]`).click(); }, id);
  await regia.waitForSelector('[data-mdl="si"]', { timeout: 5000 });
  await regia.click('[data-mdl="si"]');
  const detto = await aspetta(tel, () => !document.getElementById('entra').hidden && !document.getElementById('campo-codice').hidden && /scollegato/.test(document.getElementById('msg').textContent), null, 8000);
  ok('tolto dalla regia, il telefono lo dice e chiede un codice nuovo', detto);
  const chiave = await tel.evaluate(() => localStorage.getItem('sb-cam'));
  ok('e la sua chiave se ne va anche dal telefono', !/"prova":\{/.test(chiave || ''), chiave);
  const n3 = await quanti();
  ok('e dall\'elenco della regia', n3 === 1, `${n3}`);

  // ------------------------------------------------------------ di lato
  console.log('Il telefono di lato:');
  await io.setViewportSize({ width: 844, height: 390 });
  await io.waitForTimeout(300);
  const lato = await io.evaluate(() => {
    const r = (s) => document.querySelector(s)?.getBoundingClientRect();
    const barra = r('.cam-barra'), scene = r('.cam-scene'), su = r('.cam-su');
    const tasti = [...document.querySelectorAll('.cam-barra button')].map((x) => x.getBoundingClientRect());
    return { barra, scene, su, w: innerWidth, largo: document.documentElement.scrollWidth - document.documentElement.clientWidth, dentro: tasti.every((q) => q.top >= 0 && q.bottom <= innerHeight + 1) };
  });
  ok('in orizzontale la barra sta di lato, i tasti tutti dentro lo schermo, e non copre le scene', Math.round(lato.barra.right) === lato.w && lato.barra.width < 140 && lato.dentro && lato.scene.right <= lato.barra.left + 1 && lato.su.right <= lato.barra.left + 1 && lato.largo <= 0, JSON.stringify({ barra: lato.barra, scene: lato.scene }));

  ok('nessun errore nelle pagine', errori.length === 0, errori.slice(0, 3).join(' | '));
} catch (e) {
  ok('il collaudo arriva in fondo', false, e?.message || String(e));
} finally {
  await b.close().catch(() => {});
  chiudiSito();
}

const rossi = esiti.filter((e) => !e.vero);
console.log(rossi.length ? `\n${rossi.length} promesse su ${esiti.length} non tengono.` : `\nTutte e ${esiti.length} le promesse tengono. ✓`);
process.exit(rossi.length ? 1 : 0);
