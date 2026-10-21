// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello dei COLPI DEGLI SPETTATORI (docs/COLPI.md), in un browser vero, dalla
// pagina dello spettatore fino all'overlay.
//
// La pagina e la porta sono quelle vere (features/colpi-pagina.js e
// features/colpi-porta.js, le stesse che servono le rotte), sul registro vero
// (database usa e getta) e col motore degli effetti vero, che invece di
// scrivere agli overlay collegati manda all'overlay finto di _sito.mjs. Finti
// sono solo il conto che incassa gli euro e la chat che porta il cheer.
//
// Le promesse:
//  · prima di scegliere un colpo la diretta si tocca: lo strato di mira non
//    prende i clic, cosi' il lettore resta usabile;
//  · una zona protetta non si mira: il tasto resta spento e la pagina lo dice;
//  · il mirino sta dove si tocca, e l'ombra del colpo e' grande come sara'
//    nell'overlay 1920×1080 (file × grandezza della voce);
//  · il codice che la pagina mostra e' quello della mira, e col cheer giusto
//    il colpo e' pagato: nell'overlay il suo CENTRO e' il punto mirato, col nome;
//  · consegnato vuol dire MOSTRATO: la pagina dice «comparso» solo dopo il
//    «visto» dell'overlay, e un colpo rimandato non compare due volte;
//  · a diretta ferma la pagina toglie i modi di pagare;
//  · gli euro: «Paga» porta al pagamento, il ritorno mostra il colpo comparso;
//  · al telefono niente scorre di lato.
//
// Uso: node scripts/verifica-colpi.mjs             (esce 1 se una promessa non tiene)
//      node scripts/verifica-colpi.mjs --selftest  (rimette sette difetti: strato che prende
//                                                   sempre i clic, zone che la pagina non
//                                                   guarda, ombra senza la grandezza, overlay
//                                                   che non centra, che non dice «visto», che
//                                                   mostra due volte un rinvio, pagina che lascia
//                                                   pagare a diretta ferma; li vuole tutti rossi)
//      node scripts/verifica-colpi.mjs --rompi=N   (solo il difetto N, da 1 a 7: deve vedersi da solo)

import './_dati-usa-e-getta.mjs';
import { apriSito, apriBrowser, overlayFinto } from './_sito.mjs';

const ROMPI = Number((process.argv.find((a) => a.startsWith('--rompi=')) || '').slice(8)) || 0;
const SELFTEST = process.argv.includes('--selftest') || ROMPI > 0;
const { registroColpi, effects: effectsDb, streamers } = await import('../src/db.js');
const { creaServizioColpi } = await import('../src/features/colpi-servizio.js');
const { creaPortaColpi } = await import('../src/features/colpi-porta.js');
const { htmlPaginaColpo } = await import('../src/features/colpi-pagina.js');
const { EffectsEngine } = await import('../src/features/effects.js');

const LOGIN = 'prova';
const DIFETTI = [
  ['pagina-colpo.js', "var strato = $('cp-mira');", "var strato = $('cp-mira'); strato.classList.add('attiva');"],
  ['pagina-colpo.js', 'function protetto(x, y) {', 'function protetto(x, y) { return false;'],
  ['pagina-colpo.js', '((v.scala || 100) / 100)', '1'],
  ['overlay-app.js', 'if (!pos.centro) {', 'if (true) {'],
  ['overlay-app.js', 'if (id) { colpiMostrati.add(id); colpoVisto(id); }', 'if (id) { colpiMostrati.add(id); }'],
  ['overlay-app.js', 'function colpoNuovo(ev) {', 'function colpoNuovo(ev) { return true;'],
  ['pagina-colpo.js', 'var conCodice = mira.pagabile && !mira.inPagamento;', 'var conCodice = !mira.inPagamento;'],
];
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" rx="40" fill="#e5484d"/></svg>';

streamers.request(LOGIN, 'Prova', '1');
streamers.setSettings(LOGIN, {
  donazioni: { valuta: 'EUR' },
  colpi: { attivo: true, attesaSec: 0, alMinuto: 30, conNome: true, zone: [{ x: 70, y: 60, w: 30, h: 40 }], voci: [
    { comando: 'pomodoro', nome: 'Pomodoro', euro: 200, punti: 500, bit: 100, scala: 120 },
    { comando: 'festa', nome: 'Festa', bit: 50 },
  ] },
});
effectsDb.add(LOGIN, { comando: 'pomodoro', tipo: 'immagine', file: 'pomodoro.svg', tier: 'tutti', cooldown: 0, volume: 100, durata: 4000 });

const ov = overlayFinto({ login: LOGIN });
const motore = new EffectsEngine();
motore.emit = (ch, p) => ov.manda({ ...p, url: `/u/${LOGIN}/colpo/anteprima/pomodoro` });
// la diretta e l'overlay: «in onda» lo decide il cancello, «pronto» lo dice
// l'overlay vero, come in produzione (effects.prontoColpi)
const mondo = { live: true, pronto: 0, visti: [] };
const pronto = () => Date.now() - mondo.pronto < 45_000;
const servizio = creaServizioColpi({ registro: registroColpi, effects: motore, effettoDi: (l, c) => effectsDb.get(l, c),
  impostazioni: (l) => streamers.get(l)?.settings?.colpi, inOnda: () => mondo.live, overlay: pronto });
const pagamenti = [];
const porta = creaPortaColpi({ servizio, registro: registroColpi, streamers, effettoDi: (l, c) => effectsDb.get(l, c), mezziEuro: () => ['stripe'],
  apriPagamento: async (mezzo, d) => { const id = 'cs_finto_' + (pagamenti.length + 1); pagamenti.push({ id, ...d }); return { url: `/finto-pagamento/${id}`, id }; },
  inOnda: () => mondo.live, overlay: pronto });

const json = (res, stato, o) => { res.writeHead(stato, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
const corpo = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch { ok({}); } }); });
const base = `/u/${LOGIN}/colpo`;
let sito = null;
const rotte = (req, res, q) => {
  if (q === `/overlay/${LOGIN}/colpo/pronto` && req.method === 'POST') { corpo(req).then((b) => { mondo.pronto = b.pronto === true ? Date.now() : 0; json(res, 200, { ok: true }); }); return true; }
  const visto = new RegExp(`^/overlay/${LOGIN}/colpo/([0-9a-f]{18})/visto$`).exec(q);
  if (visto && req.method === 'POST') { mondo.visti.push(visto[1]); servizio.visto(LOGIN, visto[1]).then((ok) => json(res, 200, { ok })); return true; }
  if (q === base) {
    // il ritorno dal pagamento, come nel server: la donazione pagata spara il suo colpo
    const dona = new URL(req.url, 'http://x').searchParams.get('dona') || '';
    let mira = '';
    if (dona) { servizio.daPagamento('stripe:' + dona); mira = registroColpi.perRiferimento('stripe:' + dona)?.id || ''; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(htmlPaginaColpo({ login: LOGIN, display: 'Prova', pagina: {}, baseUrl: sito?.base || 'http://127.0.0.1', lingua: 'it', mira, privacy: '/privacy.html' }));
    return true;
  }
  if (q === base + '/dati') { json(res, 200, porta.dati(LOGIN)); return true; }
  if (q === base + '/anteprima/pomodoro') { res.writeHead(200, { 'content-type': 'image/svg+xml' }); res.end(SVG); return true; }
  if (q === base + '/mira' && req.method === 'POST') { corpo(req).then((b) => json(res, 200, porta.mira(LOGIN, b, 'gate'))); return true; }
  if (q.startsWith(base + '/stato/')) { const m = porta.stato(LOGIN, q.slice(base.length + 7)); json(res, m ? 200 : 404, m || { errore: 'mira' }); return true; }
  if (q.startsWith(base + '/paga/') && req.method === 'POST') { corpo(req).then(async (b) => json(res, 200, await porta.paga(LOGIN, q.slice(base.length + 6), b.mezzo))); return true; }
  if (q.startsWith('/finto-pagamento/')) { res.writeHead(302, { location: `${base}?dona=${q.slice(17)}` }); res.end(); return true; }
  return false;
};

sito = await apriSito({ rotte, overlay: ov });
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
const rotti = [], guai = [];
let difettiMessi = 0;
const dice = (ok, cosa) => { if (!ok) { console.log(`  ✗ ${cosa}`); rotti.push(cosa); } else console.log(`  ✓ ${cosa}`); return ok; };
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function nuova(viewport) {
  const p = await br.newPage({ viewport });
  p.on('pageerror', (e) => guai.push(e.message));
  if (SELFTEST) {
    await p.route(/\/(pagina-colpo|overlay-app)\.js(\?|$)/, async (route) => {
      const r = await route.fetch();
      let t = await r.text();
      const f = new URL(route.request().url()).pathname.slice(1);
      DIFETTI.forEach(([file, da, a], i) => { if ((!ROMPI || ROMPI === i + 1) && file === f && t.includes(da)) { t = t.replace(da, a); difettiMessi++; } });
      await route.fulfill({ response: r, body: t });
    });
  }
  return p;
}
// un clic nel punto (x%, y%) dello strato di mira
const tocca = async (p, x, y) => {
  const r = await p.locator('#cp-mira').boundingBox();
  await p.mouse.click(r.x + r.width * x / 100, r.y + r.height * y / 100);
};
// una fase che si rompe e' una promessa che non tiene, non un cancello che si ferma
const fase = async (nome, f) => { try { await f(); } catch (e) { dice(false, `${nome}: ${String(e?.message || e).split('\n')[0]}`); } };
const centro = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, sel);

try {
  const o = await nuova({ width: 1920, height: 1080 });
  await o.goto(`${sito.base}/overlay/${LOGIN}?key=k`, { waitUntil: 'load' });
  await o.waitForFunction(() => document.getElementById('palco-libero'), null, { timeout: 10000 });

  const p = await nuova({ width: 1280, height: 860 });
  await p.goto(sito.base + base, { waitUntil: 'load' });
  await p.waitForFunction(() => document.querySelectorAll('.cp-voce').length > 0, null, { timeout: 10000 });

  dice(await p.locator('#cp-stato').textContent() === 'In onda', 'con la diretta e l\'overlay su, la pagina dice «In onda»');
  dice(await p.locator('.cp-voce').count() === 1, 'si offre solo il colpo che si posa in un punto (la festa disegnata no)');
  const prezzi = await p.locator('.cp-voce .cp-prezzi i').allTextContents();
  dice(prezzi.length === 2 && /2,00/.test(prezzi[0]) && /100 Bit/.test(prezzi[1]), `euro e Bit col loro prezzo, i punti senza premio su Twitch no (${prezzi.join(' · ')})`);
  dice(await p.evaluate(() => getComputedStyle(document.getElementById('cp-mira')).pointerEvents) === 'none', 'prima di scegliere un colpo lo strato di mira lascia la diretta toccabile');

  await p.locator('.cp-voce').first().click();
  await pausa(400);
  dice(await p.evaluate(() => getComputedStyle(document.querySelector('.cp-zona')).opacity) === '1', 'scelto il colpo, la zona protetta si vede a righe');
  await tocca(p, 85, 80);
  dice(await p.locator('#cp-conferma').isDisabled() && /protetto/.test(await p.locator('#cp-avviso').textContent()), 'nella zona protetta non si prende la mira, e la pagina lo dice');

  await tocca(p, 25, 40);
  await pausa(300);
  const strato = await p.locator('#cp-mira').boundingBox();
  const mir = await centro(p, '.cp-mirino');
  dice(mir && Math.abs(mir.x - (strato.x + strato.width * 0.25)) < 1.5 && Math.abs(mir.y - (strato.y + strato.height * 0.4)) < 1.5, 'il mirino sta dove si tocca');
  const om = await centro(p, '.cp-ombra');
  const atteso = 400 * 1.2 / 1920 * strato.width;
  dice(om && Math.abs(om.w - atteso) < 2 && Math.abs(om.x - mir.x) < 1.5 && Math.abs(om.y - mir.y) < 1.5, `l'ombra e' centrata sul punto e grande come nell'overlay (${om ? om.w.toFixed(1) : '-'} px, attesi ${atteso.toFixed(1)})`);

  await p.fill('#cp-nome', 'Marta');
  await p.locator('#cp-conferma').click();
  await p.waitForSelector('.cp-codice output', { timeout: 5000 });
  const codice = (await p.locator('.cp-codice output').textContent()).trim();
  const id = await p.evaluate(() => { try { return sessionStorage.getItem('sb-colpo:prova'); } catch { return ''; } });
  const m = id ? registroColpi.get(id) : null;
  // il punto salvato e' quello toccato, a meno di un pixel della pagina (il
  // mouse arriva in pixel interi): la mira non perde precisione per strada
  const pxX = 100 / strato.width, pxY = 100 / strato.height;
  dice(m && m.codice === codice && /^[A-Z0-9]{5}$/.test(codice) && Math.abs(m.x - 25) <= pxX && Math.abs(m.y - 40) <= pxY && m.chi === 'Marta', `il codice della pagina e' quello della mira, col punto toccato e il nome (${codice}, ${m?.x}, ${m?.y})`);
  dice((await p.locator('#cp-paga').textContent()).includes(`Cheer100 ${codice}`), 'per i Bit la pagina scrive il cheer da fare, col codice');

  const r = servizio.daCheer(LOGIN, { bits: 100, message: `Cheer100 ${codice.toLowerCase()} vai` });
  dice(r.esito === 'pagato' && registroColpi.get(id)?.stato !== 'attesa', 'il cheer col codice paga il colpo');
  await o.waitForSelector('#palco-libero .effetto.dentro', { timeout: 5000 }).catch(() => {});
  await pausa(700);
  const fx = await centro(o, '#palco-libero .effetto');
  const cx = (m?.x ?? 25) / 100 * 1920, cy = (m?.y ?? 40) / 100 * 1080;
  dice(fx && Math.abs(fx.x - cx) < 1 && Math.abs(fx.y - cy) < 1 && Math.abs(fx.w - 480) < 1, `nell'overlay il centro del colpo e' il punto mirato (${fx ? `${fx.x.toFixed(1)}, ${fx.y.toFixed(1)}, largo ${fx.w.toFixed(1)}` : 'niente'}; attesi ${cx.toFixed(1)}, ${cy.toFixed(1)}, largo 480)`);
  dice((await o.locator('.attacco-firma').first().textContent().catch(() => '')) === 'Marta', 'sotto il colpo c\'e\' il nome di chi l\'ha mandato');
  await p.waitForFunction(() => /comparso/.test(document.getElementById('cp-avviso').textContent), null, { timeout: 8000 }).catch(() => {});
  dice(registroColpi.get(id)?.stato === 'sparata' && mondo.visti.includes(id), 'l\'overlay dice di averlo mostrato, e solo allora il colpo e\' consegnato');
  dice(/comparso/.test(await p.locator('#cp-avviso').textContent()), 'la pagina dice che il colpo e\' comparso solo dopo che l\'overlay l\'ha mostrato');
  // un rinvio dello stesso colpo (la ronda, o un «visto» perso per strada) non lo mostra due volte, e si ri-conferma
  const vistiPrima = mondo.visti.length;
  motore.fireConOpzioni(LOGIN, 'pomodoro', { xy: { x: m.x, y: m.y, s: m.scala, r: 0, centro: true }, attacco: { id, chi: m.chi, nome: m.nome } });
  await pausa(600);
  dice(await o.locator('#palco-libero .effetto').count() === 1 && mondo.visti.length > vistiPrima, 'un colpo rimandato non compare due volte, e l\'overlay lo riconferma');
  await o.waitForFunction(() => !document.querySelector('#palco-libero .effetto'), null, { timeout: 8000 }).catch(() => {});

  // ogni fase riparte da una pagina pulita: un difetto di quella prima non la trascina
  const daCapo = async () => {
    await p.evaluate(() => { try { sessionStorage.clear(); } catch { /* niente */ } });
    await p.goto(sito.base + base, { waitUntil: 'load' });
    await p.waitForFunction(() => document.querySelectorAll('.cp-voce').length > 0, null, { timeout: 10000 });
  };
  await fase('euro', async () => {
  await daCapo();
  await p.locator('.cp-voce').first().click();
  await tocca(p, 60, 20);
  await p.locator('#cp-conferma').click();
  await p.waitForSelector('#cp-paga .cp-paga-b', { timeout: 5000 });
  await Promise.all([p.waitForURL(/\?dona=/, { timeout: 8000 }).catch(() => {}), p.locator('#cp-paga .cp-paga-b').first().click()]);
  dice(pagamenti.length === 1 && pagamenti[0].importoCent === 200 && pagamenti[0].messaggio === 'Colpo: Pomodoro', 'col tasto «Paga» si apre un pagamento solo, del prezzo della mira');
  await p.waitForFunction(() => /comparso/.test(document.getElementById('cp-avviso')?.textContent || ''), null, { timeout: 10000 }).catch(() => {});
  dice(/comparso/.test(await p.locator('#cp-avviso').textContent()), 'al ritorno dal pagamento la pagina mostra il colpo comparso');
  });

  // la diretta si ferma con una mira aperta: la pagina toglie i modi di pagare
  await fase('diretta ferma', async () => {
  await daCapo();
  await p.locator('.cp-voce').first().click();
  await tocca(p, 40, 30);
  await p.locator('#cp-conferma').click();
  await p.waitForSelector('.cp-codice output', { timeout: 5000 });
  const codice3 = (await p.locator('.cp-codice output').textContent()).trim();
  mondo.live = false;
  await p.waitForFunction(() => /non può comparire/.test(document.getElementById('cp-avviso').textContent), null, { timeout: 8000 }).catch(() => {});
  const testo3 = await p.locator('#cp-paga').textContent();
  dice(/non può comparire/.test(await p.locator('#cp-avviso').textContent()) && !testo3.includes(`Cheer100 ${codice3}`) && await p.locator('#cp-paga .cp-paga-b').count() === 0,
    'a diretta ferma la pagina toglie il cheer e il tasto «Paga», e dice di non pagare');
  mondo.live = true;
  });

  const t = await nuova({ width: 390, height: 844 });
  await t.goto(sito.base + base, { waitUntil: 'load' });
  await t.waitForFunction(() => document.querySelectorAll('.cp-voce').length > 0, null, { timeout: 10000 });
  dice(await t.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth), 'al telefono niente scorre di lato');

  dice(guai.length === 0, `nessun errore nelle pagine${guai.length ? ': ' + guai.slice(0, 3).join(' | ') : ''}`);
} finally {
  await br.close();
  sito.chiudi();
}

if (SELFTEST) {
  // con --rompi=N un difetto solo: basta che si veda
  const ok = ROMPI ? difettiMessi > 0 && rotti.length > 0 : difettiMessi >= DIFETTI.length && rotti.length >= DIFETTI.length;
  console.log(ok ? `\nAutoprova dei colpi: ${difettiMessi} difetti rimessi, ${rotti.length} promesse rotte ✓` : `\nAutoprova ROSSA: difetti rimessi ${difettiMessi}/${DIFETTI.length}, promesse rotte ${rotti.length}`);
  process.exit(ok ? 0 : 1);
}
console.log(rotti.length ? `\ncollaudo ROSSO: ${rotti.length} promesse non tengono.` : '\nI colpi vanno dalla mira all\'overlay, nel punto mirato. ✓');
process.exit(rotti.length ? 1 : 0);
