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
//  · al telefono niente scorre di lato;
//  · la pagina veste il tema della pagina link (l'accento e' quello del tema);
//  · la chat del canale si legge, e un messaggio non diventa mai HTML; se la
//    linea cade si riapre da sola, senza righe doppie;
//  · senza accesso si legge e basta; con l'accesso si scrive, il nome non si
//    chiede, e la mira e' legata allo spettatore: il suo cheer la paga senza codice;
//  · un lancio (docs/LANCI.md) arriva col centro nel punto, grande quanto l'ombra,
//    e il «visto» parte all'impatto;
//  · l'anteprima: «Guarda» fa il colpo al centro della diretta e «Prova qui» nel
//    punto mirato, grandi come nell'overlay, col posto del nome; la vede solo chi
//    guarda (lo dice), e all'overlay non arriva niente;
//  · la presenza: l'effetto dello streamer nel suo punto, col nome, «visto» come
//    un colpo, una volta per diretta;
//  · i Bit da spendere: con l'accesso la pagina dice il saldo, il tasto e' spento
//    se non basta, e se basta paga il colpo e il saldo scende.
//
// Uso: node scripts/verifica-colpi.mjs             (esce 1 se una promessa non tiene)
//      node scripts/verifica-colpi.mjs --selftest  (rimette sette difetti: strato che prende
//                                                   sempre i clic, zone che la pagina non
//                                                   guarda, ombra senza la grandezza, overlay
//                                                   che non centra, che non dice «visto», che
//                                                   mostra due volte un rinvio, pagina che lascia
//                                                   pagare a diretta ferma, chat che scrive HTML,
//                                                   modulo per scrivere a chi non ha l'accesso,
//                                                   righe doppie dopo una riapertura,
//                                                   lancio spostato, lancio che non dice «visto»,
//                                                   anteprima che ignora il punto, anteprima che
//                                                   non dice di essere un'anteprima, green screen
//                                                   che non toglie il verde, categoria che non filtra,
//                                                   saldo dei Bit che non basta ma si lascia spendere;
//                                                   li vuole tutti rossi)
//      node scripts/verifica-colpi.mjs --rompi=N   (solo il difetto N, da 1 a 17: deve vedersi da solo)

import './_dati-usa-e-getta.mjs';
import { apriSito, apriBrowser, overlayFinto } from './_sito.mjs';

const ROMPI = Number((process.argv.find((a) => a.startsWith('--rompi=')) || '').slice(8)) || 0;
const SELFTEST = process.argv.includes('--selftest') || ROMPI > 0;
const { registroColpi, effects: effectsDb, streamers, pewBit } = await import('../src/db.js');
const { creaServizioColpi } = await import('../src/features/colpi-servizio.js');
const economia = await import('../src/features/economia.js');
const { creaPortaColpi } = await import('../src/features/colpi-porta.js');
const { htmlPaginaColpo } = await import('../src/features/colpi-pagina.js');
const { EffectsEngine } = await import('../src/features/effects.js');
const { creaChatColpi, rigaDi } = await import('../src/features/colpi-chat.js');

const LOGIN = 'prova';
const DIFETTI = [
  ['pagina-colpo.js', "var strato = $('cp-mira');", "var strato = $('cp-mira'); strato.classList.add('attiva');"],
  ['pagina-colpo.js', 'function protetto(x, y) {', 'function protetto(x, y) { return false;'],
  ['pagina-colpo.js', '((v.scala || 100) / 100)', '1'],
  ['overlay-app.js', 'if (!pos.centro) {', 'if (true) {'],
  ['overlay-app.js', 'if (id) { colpiMostrati.add(id); colpoVisto(id); }', 'if (id) { colpiMostrati.add(id); }'],
  ['overlay-app.js', 'function colpoNuovo(ev) {', 'function colpoNuovo(ev) { return true;'],
  ['pagina-colpo.js', 'var conCodice = mira.pagabile && !mira.inPagamento && !mira.acconto;', 'var conCodice = !mira.inPagamento && !mira.acconto;'],
  ['pagina-colpo.js', 'else li.appendChild(document.createTextNode(p));', "else li.insertAdjacentHTML('beforeend', p);"],
  ['pagina-colpo.js', "$('cp-scrivi').hidden = !io;", "$('cp-scrivi').hidden = false;"],
  ['pagina-colpo.js', 'if (viste[m.id]) return;', 'if (false) return;'],
  ['lanci.js', 'var px = pos ? tra(Number(pos.x), 0, 100) / 100 * W', 'var px = pos ? 40 + tra(Number(pos.x), 0, 100) / 100 * W'],
  ['lanci.js', 'if (t.i === 0) colpito();', 'if (false) colpito();'],
  ['pagina-colpo.js', 'var pp = p || { x: 50, y: 50 };', 'var pp = { x: 50, y: 50 };'],
  ['pagina-colpo.js', "    $('cp-solo-tu').hidden = false;\n", ''],
  ['scontorno.js', 'd[i + 3] = 0;', 'd[i + 3] = 255;'],
  ['pagina-colpo.js', "bb[i].hidden = !!filtro && bb[i].getAttribute('data-cat') !== filtro;", 'bb[i].hidden = false;'],
  ['pagina-colpo.js', 'pbit.disabled = saldoBit !== null && saldoBit < mancaBit;', 'pbit.disabled = false;'],
];
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" rx="40" fill="#e5484d"/></svg>';

streamers.request(LOGIN, 'Prova', '1');
streamers.setSettings(LOGIN, {
  donazioni: { valuta: 'EUR' },
  colpi: { attivo: true, attesaSec: 0, alMinuto: 30, conNome: true, zone: [{ x: 70, y: 60, w: 30, h: 40 }],
    presenza: { attiva: true, comando: 'pomodoro', x: 12, y: 30, scala: 100 }, voci: [
    { comando: 'pomodoro', nome: 'Pomodoro', euro: 200, punti: 500, bit: 100, scala: 120 },
    { comando: 'festa', nome: 'Festa', bit: 50 },
    { comando: 'tirapomodoro', nome: 'Pomodoro vero', bit: 30, monete: 40, scala: 150 },
    { comando: 'ridi', nome: 'Risata', bit: 20 },
  ] },
});
effectsDb.add(LOGIN, { comando: 'pomodoro', tipo: 'immagine', file: 'pomodoro.svg', tier: 'tutti', cooldown: 0, volume: 100, durata: 4000 });
// un lancio del catalogo (docs/LANCI.md): il disegno vero, servito da public/lanci
effectsDb.addLancio(LOGIN, { comando: 'tirapomodoro', disegno: JSON.stringify({ oggetto: 'pomodoro', quanti: 1 }), tier: 'tutti', cooldown: 0, volume: 100, durata: 1100 });
// e un adesivo animato (Noto, con lottie-web): compare nel punto e fa la sua scena
effectsDb.addLancio(LOGIN, { comando: 'ridi', disegno: JSON.stringify({ oggetto: 'risata' }), tier: 'tutti', cooldown: 0, volume: 100, durata: 2200 });

const ov = overlayFinto({ login: LOGIN });
const motore = new EffectsEngine();
motore.emit = (ch, p) => ov.manda({ ...p, url: `/u/${LOGIN}/colpo/anteprima/pomodoro` });
// la diretta e l'overlay: «in onda» lo decide il cancello, «pronto» lo dice
// l'overlay vero, come in produzione (effects.prontoColpi)
const mondo = { live: true, pronto: 0, visti: [], io: null, scritti: [], flussi: new Set() };
const chat = creaChatColpi();
const pronto = () => Date.now() - mondo.pronto < 45_000;
const servizio = creaServizioColpi({ registro: registroColpi, effects: motore, effettoDi: (l, c) => effectsDb.get(l, c),
  impostazioni: (l) => streamers.get(l)?.settings?.colpi, inOnda: () => mondo.live, overlay: pronto,
  monete: { punta: economia.punta, rendi: economia.rendi, saldo: economia.saldo }, crediti: pewBit });
economia.dai(LOGIN, 'marta', 500, 'staff');
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
    res.end(htmlPaginaColpo({ login: LOGIN, display: 'Prova', pagina: { template: 'retro' }, baseUrl: sito?.base || 'http://127.0.0.1', lingua: 'it', mira, privacy: '/privacy.html', io: mondo.io, accesso: true }));
    return true;
  }
  if (q === base + '/dati') { json(res, 200, porta.dati(LOGIN)); return true; }
  if (q === base + '/anteprima/pomodoro') { res.writeHead(200, { 'content-type': 'image/svg+xml' }); res.end(SVG); return true; }
  if (q === base + '/mira' && req.method === 'POST') { corpo(req).then((b) => json(res, 200, porta.mira(LOGIN, b, 'gate', mondo.io))); return true; }
  if (q === base + '/chat' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
    res.write(': chat\n\n');
    chat.apri(LOGIN, res);
    mondo.flussi.add(res);
    req.on('close', () => { chat.chiudi(LOGIN, res); mondo.flussi.delete(res); });
    return true;
  }
  if (q === base + '/chat' && req.method === 'POST') { corpo(req).then((b) => { if (!mondo.io) return json(res, 401, { errore: 'accesso' }); mondo.scritti.push(b.testo); json(res, 200, { ok: true }); }); return true; }
  if (q === base + '/esci' && req.method === 'POST') { mondo.io = null; json(res, 200, { ok: true }); return true; }
  if (q.startsWith(base + '/stato/')) { const m = porta.stato(LOGIN, q.slice(base.length + 7)); json(res, m ? 200 : 404, m || { errore: 'mira' }); return true; }
  if (q.startsWith(base + '/paga/') && req.method === 'POST') { corpo(req).then(async (b) => json(res, 200, await porta.paga(LOGIN, q.slice(base.length + 6), b.mezzo, mondo.io, String(b.modo || '')))); return true; }
  if (q === base + '/saldi') { const sl = mondo.io ? porta.saldi(LOGIN, mondo.io) : null; json(res, sl ? 200 : 401, sl || { errore: 'accesso' }); return true; }
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
let lancio1920 = 0;

async function nuova(viewport) {
  const p = await br.newPage({ viewport });
  p.on('pageerror', (e) => guai.push(e.message));
  if (SELFTEST) {
    await p.route(/\/(pagina-colpo|overlay-app|lanci|scontorno)\.js(\?|$)/, async (route) => {
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
  // come una persona: il quadro prima si porta in vista (e si aspetta che la pagina smetta di scorrere)
  await p.locator('#cp-mira').scrollIntoViewIfNeeded();
  await p.waitForTimeout(400);
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
  dice(await p.locator('.cp-voce').count() === 3 && !/Festa/.test(await p.locator('#cp-voci').textContent()), 'si offrono solo i colpi che si posano in un punto, lancio e adesivo compresi (la festa disegnata no)');
  const prezzi = await p.locator('.cp-voce').first().locator('.cp-prezzi i').allTextContents();
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

  await fase('tema, chat e accesso', async () => {
  await daCapo();
  dice(await p.evaluate(() => getComputedStyle(document.querySelector('.cp-t span')).backgroundColor) === 'rgb(194, 69, 26)', 'la pagina veste il tema della pagina link: l\'accento e\' quello del tema «retro»');
  dice((await p.getAttribute('#cp-io a', 'href'))?.endsWith('/colpo/accedi') && await p.locator('#cp-scrivi').isHidden() && await p.locator('#cp-chat-fuori').isVisible(),
    'senza accesso: il tasto per entrare con Twitch, la chat si legge ma non c\'e\' il modulo per scrivere');
  await p.waitForFunction(() => window.EventSource && performance.getEntriesByType('resource').some((e) => /\/colpo\/chat$/.test(e.name)), null, { timeout: 5000 }).catch(() => {});
  await pausa(300);
  chat.messaggio(LOGIN, rigaDi({ id: 'r1', display: 'Marta', text: '<img src=x id=iniettata> ciao Kappa' }, { colore: '#ff0000', emote: { Kappa: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0' } }));
  await p.waitForFunction(() => /ciao/.test(document.getElementById('cp-righe').textContent), null, { timeout: 5000 }).catch(() => {});
  const r1 = await p.evaluate(() => { const li = document.querySelector('#cp-righe li:last-child'); return li && { testo: li.textContent, img: [...li.querySelectorAll('img')].map((i) => i.alt), colore: getComputedStyle(li.querySelector('b')).color, iniettata: !!document.getElementById('iniettata') }; });
  dice(!!r1 && r1.testo.includes('<img src=x id=iniettata>') && !r1.iniettata && r1.img.join() === 'Kappa' && r1.colore === 'rgb(255, 0, 0)',
    'la chat arriva in diretta: col colore di chi scrive, l\'emote come immagine, e l\'HTML di un messaggio resta testo');
  // la linea cade (un proxy, un riavvio): la pagina la riapre da sola, il server rimanda le ultime righe e non se ne vede nessuna due volte
  for (const res of mondo.flussi) res.destroy();
  await p.waitForFunction(() => performance.getEntriesByType('resource').filter((e) => /\/colpo\/chat$/.test(e.name)).length >= 2, null, { timeout: 15000 }).catch(() => {});
  await pausa(500);
  chat.messaggio(LOGIN, rigaDi({ id: 'r2', display: 'Luca', text: 'di nuovo qui' }));
  await p.waitForFunction(() => /di nuovo qui/.test(document.getElementById('cp-righe').textContent), null, { timeout: 8000 }).catch(() => {});
  const dopo = await p.evaluate(() => [...document.querySelectorAll('#cp-righe li')].map((li) => li.textContent));
  dice(dopo.filter((x) => x.includes('iniettata')).length === 1 && dopo.some((x) => x.includes('di nuovo qui')),
    `la chat caduta si riapre da sola, e le righe rimandate non si vedono due volte (${dopo.length} righe)`);
  mondo.io = { id: '777', login: 'marta', nome: 'Marta' };
  await daCapo();
  dice(/Marta/.test(await p.locator('#cp-io').textContent()) && await p.locator('#cp-scrivi').isVisible() && await p.locator('#cp-nome-l').isHidden(),
    'con l\'accesso: la pagina sa chi sei, apre il modulo della chat e non chiede il nome');
  await p.fill('#cp-testo', 'ciao a tutti');
  await p.locator('#cp-scrivi button').click();
  await p.waitForFunction(() => document.getElementById('cp-testo').value === '', null, { timeout: 5000 }).catch(() => {});
  dice(mondo.scritti.at(-1) === 'ciao a tutti' && await p.inputValue('#cp-testo') === '', 'il messaggio scritto nella pagina parte, e il campo si svuota');
  await p.locator('.cp-voce').first().click();
  await tocca(p, 30, 30);
  await p.locator('#cp-conferma').click();
  await p.waitForSelector('#cp-paga', { timeout: 5000 });
  await p.waitForFunction(() => /senza codice/.test(document.getElementById('cp-paga').textContent), null, { timeout: 5000 }).catch(() => {});
  const mia = registroColpi.apertaDi(LOGIN, '777');
  const cheer = mia ? servizio.daCheer(LOGIN, { bits: 100, message: 'Cheer100 grande', user_id: '777' }) : null;
  dice(!!mia && mia.chi === 'Marta' && /senza codice/.test(await p.locator('#cp-paga').textContent()) && cheer?.esito === 'pagato',
    'la mira di chi ha l\'accesso porta il suo nome Twitch, la pagina dice che basta il cheer, e il suo cheer senza codice la paga');
  await p.locator('#cp-io button').click();
  await p.waitForFunction(() => document.getElementById('cp-scrivi').hidden, null, { timeout: 5000 }).catch(() => {});
  dice(mondo.io === null && await p.locator('#cp-scrivi').isHidden() && !!(await p.getAttribute('#cp-io a', 'href')), '«Esci» chiude l\'accesso e la pagina torna a leggere soltanto');
  });

  // LE CATEGORIE E LE MONETE (docs/COLPI.md): il listino si divide per tipo (lo
  // streamer non le ha toccate), e con l'accesso un colpo si paga con le monete
  // del canale, che si tolgono quando paga; senza, la pagina dice il comando
  await fase('categorie e monete', async () => {
  mondo.io = null;
  await daCapo();
  const chips = await p.locator('#cp-cat button').allTextContents();
  dice(chips.join('|') === 'Tutti|Lanci|Adesivi|Immagini e video', `le categorie di serie che hanno colpi, nella lingua di chi guarda (${chips.join(', ')})`);
  await p.locator('#cp-cat button', { hasText: 'Adesivi' }).click();
  const viste = await p.evaluate(() => [...document.querySelectorAll('.cp-voce-box')].filter((b) => !b.hidden).map((b) => b.querySelector('b').textContent));
  dice(viste.join() === 'Risata', `toccata una categoria si vedono solo i suoi colpi (${viste.join(', ')})`);
  await p.locator('#cp-cat button', { hasText: 'Tutti' }).click();
  await p.locator('.cp-voce', { hasText: 'Pomodoro vero' }).click();
  await tocca(p, 20, 20);
  await p.locator('#cp-conferma').click();
  await p.waitForSelector('.cp-codice output', { timeout: 5000 });
  const cod = (await p.locator('.cp-codice output').textContent()).trim();
  dice((await p.locator('#cp-paga').textContent()).includes(`!pew ${cod}`), 'senza accesso la pagina dice il comando da scrivere in chat, col codice');
  mondo.io = { id: '888', login: 'marta', nome: 'Marta' };
  await daCapo();
  await p.locator('.cp-voce', { hasText: 'Pomodoro vero' }).click();
  await tocca(p, 20, 20);
  await p.locator('#cp-conferma').click();
  await p.waitForSelector('[data-paga="monete"]', { timeout: 5000 });
  const prima = economia.saldo(LOGIN, 'marta');
  await p.locator('[data-paga="monete"]').click();
  await o.waitForFunction(() => document.querySelector('.lancio')?.dataset.impatti, null, { timeout: 8000 }).catch(() => {});
  dice(prima - economia.saldo(LOGIN, 'marta') === 40 && await o.locator('.lancio').count() > 0, `con l'accesso «Paga» toglie le monete e il colpo parte (${prima} → ${economia.saldo(LOGIN, 'marta')})`);
  await o.waitForFunction(() => !document.querySelector('.lancio'), null, { timeout: 15000 }).catch(() => {});
  mondo.io = null;
  });

  // I BIT DA SPENDERE (docs/COLPI.md): senza accesso la pagina dice che i Bit
  // mandati al canale si spendono anche li'; con l'accesso dice il saldo, il
  // tasto e' spento se non basta, e se basta paga il colpo e il saldo scende
  await fase('Bit da spendere', async () => {
  mondo.io = null;
  await daCapo();
  dice(/si spendono anche qui/.test(await p.locator('#cp-io').textContent()), 'senza accesso la pagina dice che i Bit mandati al canale si spendono anche qui');
  pewBit.muovi(LOGIN, '888', 25, 'cheer:gate-1', { nome: 'marta' });
  mondo.io = { id: '888', login: 'marta', nome: 'Marta' };
  await daCapo();
  await p.waitForFunction(() => /Hai 25 Bit da spendere qui/.test(document.getElementById('cp-io').textContent), null, { timeout: 5000 }).catch(() => {});
  dice(/Hai 25 Bit da spendere qui/.test(await p.locator('#cp-io').textContent()), 'con l\'accesso la pagina dice il saldo, accanto al nome');
  await p.locator('.cp-voce', { hasText: 'Pomodoro vero' }).click();
  await tocca(p, 20, 20);
  await p.locator('#cp-conferma').click();
  await p.waitForSelector('[data-paga="bitpew"]', { timeout: 5000 });
  dice(/Paga 30 Bit dal tuo saldo/.test(await p.locator('[data-paga="bitpew"]').textContent()) && await p.locator('[data-paga="bitpew"]').isDisabled(), 'un colpo da 30 Bit con 25 nel saldo: il tasto c\'e\' ma e\' spento');
  await p.locator('[data-paga="bitpew"]').click({ force: true, timeout: 2000 }).catch(() => {});
  await pausa(400);
  dice(pewBit.saldo(LOGIN, '888') === 25, `e il saldo non si tocca (${pewBit.saldo(LOGIN, '888')})`);
  await daCapo();
  await p.locator('.cp-voce', { hasText: 'Risata' }).click();
  await tocca(p, 30, 30);
  await p.locator('#cp-conferma').click();
  await p.waitForSelector('[data-paga="bitpew"]:not([disabled])', { timeout: 5000 });
  await p.locator('[data-paga="bitpew"]').click();
  const idb = await p.evaluate(() => { try { return sessionStorage.getItem('sb-colpo:prova'); } catch { return ''; } });
  for (let i = 0; i < 30 && registroColpi.get(idb)?.stato === 'attesa'; i++) await pausa(100);
  await p.waitForFunction(() => /Hai 5 Bit da spendere qui/.test(document.getElementById('cp-io').textContent), null, { timeout: 5000 }).catch(() => {});
  const pb = registroColpi.get(idb);
  dice(pb && pb.stato !== 'attesa' && pb.metodo === 'bit' && pewBit.saldo(LOGIN, '888') === 5 && /Hai 5 Bit da spendere qui/.test(await p.locator('#cp-io').textContent()),
    `col saldo che basta il colpo e' pagato e il saldo scende, anche sulla pagina (${pb?.stato}, ${pewBit.saldo(LOGIN, '888')})`);
  await o.waitForFunction(() => !document.querySelector('.lancio, #palco-libero .effetto'), null, { timeout: 15000 }).catch(() => {});
  mondo.io = null;
  });

  // un LANCIO (docs/LANCI.md): la pagina mostra il suo disegno, l'ombra e' grande
  // come il colpo, e nell'overlay arriva col centro nel punto mirato, grande
  // quanto l'ombra; il «visto» parte all'impatto
  await fase('lancio', async () => {
  mondo.io = null;
  await daCapo();
  await p.locator('.cp-voce', { hasText: 'Pomodoro vero' }).click();
  await tocca(p, 35, 30);
  await p.locator('#cp-conferma').click();
  await p.waitForSelector('.cp-codice output', { timeout: 5000 });
  const codiceL = (await p.locator('.cp-codice output').textContent()).trim();
  const strato = await p.locator('#cp-mira').boundingBox();
  const ombra = await centro(p, '.cp-ombra');
  const ml = registroColpi.perCodice(LOGIN, codiceL);
  const visti0 = mondo.visti.length;
  dice(servizio.daCheer(LOGIN, { bits: 30, message: `Cheer30 ${codiceL}` }).esito === 'pagato', 'il lancio si paga col cheer, come gli altri colpi');
  await o.waitForFunction(() => document.querySelector('.lancio')?.dataset.impatti, null, { timeout: 8000 }).catch(() => {});
  const imp = await o.evaluate(() => { const c = document.querySelector('.lancio'); return c ? JSON.parse(c.dataset.impatti || '[]')[0] || null : null; });
  const atteso = ml ? { x: ml.x / 100 * 1920, y: ml.y / 100 * 1080 } : null;
  const ombra1920 = ombra && strato ? ombra.w / strato.width * 1920 : 0;
  dice(!!imp && !!atteso && Math.abs(imp.x - atteso.x) <= 1 && Math.abs(imp.y - atteso.y) <= 1,
    `il lancio arriva col centro nel punto mirato (${imp ? imp.x + ', ' + imp.y : 'niente'}; atteso ${atteso ? atteso.x.toFixed(0) + ', ' + atteso.y.toFixed(0) : '?'})`);
  dice(!!imp && Math.abs(imp.w - ombra1920) <= 2, `e grande quanto l'ombra della pagina (${imp ? imp.w : '?'} px; ombra ${ombra1920.toFixed(1)} px)`);
  lancio1920 = imp ? imp.w : 0;
  for (let i = 0; i < 20 && mondo.visti.length === visti0; i++) await pausa(150);
  dice(!!ml && mondo.visti.includes(ml.id), 'all\'impatto l\'overlay dice di averlo mostrato');
  await o.waitForFunction(() => !document.querySelector('.lancio'), null, { timeout: 15000 }).catch(() => {});
  });

  await fase('adesivo', async () => {
  await daCapo();
  await p.locator('.cp-voce', { hasText: 'Risata' }).click();
  await tocca(p, 70, 25);
  await p.locator('#cp-conferma').click();
  await p.waitForSelector('.cp-codice output', { timeout: 5000 });
  const codiceA = (await p.locator('.cp-codice output').textContent()).trim();
  const ma = registroColpi.perCodice(LOGIN, codiceA);
  servizio.daCheer(LOGIN, { bits: 20, message: `Cheer20 ${codiceA}` });
  await o.waitForFunction(() => document.querySelector('.lancio svg'), null, { timeout: 8000 }).catch(() => {});
  const ad = await o.evaluate(() => { const c = document.querySelector('.lancio'); const b = c && c.querySelector('svg')?.parentElement?.getBoundingClientRect(); return c ? { imp: JSON.parse(c.dataset.impatti || '[]')[0] || null, box: b ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : null } : null; });
  const at = ma ? { x: ma.x / 100 * 1920, y: ma.y / 100 * 1080 } : null;
  dice(!!ad?.imp && !!ad.box && !!at && Math.abs(ad.imp.x - at.x) <= 1 && Math.abs(ad.box.y - at.y) <= 2 && Math.abs(ad.box.x - at.x) <= 2 && ad.imp.w === 300,
    `l'adesivo animato compare col centro nel punto, grande quanto il suo disegno (${ad?.imp ? ad.imp.x + ', ' + ad.imp.y + ', ' + ad.imp.w + ' px' : 'niente'})`);
  for (let i = 0; i < 20 && !(ma && mondo.visti.includes(ma.id)); i++) await pausa(150);
  dice(!!ma && mondo.visti.includes(ma.id), 'e appena compare l\'overlay dice di averlo mostrato');
  await o.waitForFunction(() => !document.querySelector('.lancio'), null, { timeout: 15000 }).catch(() => {});
  });

  // L'ANTEPRIMA (docs/COLPI.md): «Guarda» fa il colpo al centro della diretta e
  // «Prova qui» nel punto mirato, con lo stesso disegnatore e la stessa misura
  // dell'overlay; la vede solo chi guarda, e all'overlay non arriva niente
  await fase('anteprima', async () => {
  await daCapo();
  const palco = await p.locator('#cp-prova').boundingBox();
  const lanci0 = await o.locator('.lancio').count();
  await p.locator('.cp-voce-box', { hasText: 'Pomodoro vero' }).locator('.cp-vedi').click();
  await p.waitForFunction(() => document.querySelector('#cp-prova .lancio')?.dataset.impatti, null, { timeout: 8000 }).catch(() => {});
  const g = await p.evaluate(() => { const c = document.querySelector('#cp-prova .lancio'); return c ? JSON.parse(c.dataset.impatti || '[]')[0] || null : null; });
  dice(!!g && Math.abs(g.x - palco.width / 2) <= 1 && Math.abs(g.y - palco.height / 2) <= 1, `«Guarda» fa il colpo al centro della diretta (${g ? g.x + ', ' + g.y : 'niente'})`);
  dice(!!g && lancio1920 > 0 && Math.abs(g.w / palco.width * 1920 - lancio1920) <= 3, `grande come nell'overlay (${g ? (g.w / palco.width * 1920).toFixed(1) : '?'} su 1920; overlay ${lancio1920})`);
  dice(await p.locator('#cp-solo-tu').isVisible(), 'e dice che e\' un\'anteprima, che vede solo chi guarda');
  dice(await o.locator('.lancio').count() === lanci0 && !(await p.locator('.cp-codice').count()), 'all\'overlay non arriva niente, e nessuna mira si apre');
  await p.waitForFunction(() => !document.querySelector('#cp-prova .lancio'), null, { timeout: 15000 }).catch(() => {});
  dice(await p.locator('#cp-solo-tu').isHidden(), 'finita l\'anteprima, la scritta se ne va');
  await p.locator('.cp-voce', { hasText: 'Pomodoro vero' }).click();
  await tocca(p, 35, 30);
  await p.locator('#cp-prova-qui').click();
  await p.waitForFunction(() => document.querySelector('#cp-prova .lancio')?.dataset.impatti, null, { timeout: 8000 }).catch(() => {});
  const q = await p.evaluate(() => { const c = document.querySelector('#cp-prova .lancio'); return c ? JSON.parse(c.dataset.impatti || '[]')[0] || null : null; });
  const qx = 0.35 * palco.width, qy = 0.30 * palco.height;
  dice(!!q && Math.abs(q.x - qx) <= 1.5 && Math.abs(q.y - qy) <= 1.5, `«Prova qui» lo fa nel punto mirato, prima di pagare (${q ? q.x + ', ' + q.y : 'niente'}; atteso ${qx.toFixed(0)}, ${qy.toFixed(0)})`);
  await p.waitForSelector('#cp-prova .cp-firma', { timeout: 6000 }).catch(() => {});
  dice((await p.locator('#cp-prova .cp-firma').textContent().catch(() => '')) === 'Il tuo nome', 'all\'impatto, sotto, il posto del nome come nell\'overlay');
  await p.waitForFunction(() => !document.querySelector('#cp-prova .lancio'), null, { timeout: 15000 }).catch(() => {});
  // un'immagine: grande come la sua ombra, centrata dove si guarda
  await daCapo();
  await p.locator('.cp-voce-box').first().locator('.cp-vedi').click();
  await p.waitForSelector('#cp-prova .cp-media', { timeout: 6000 }).catch(() => {});
  await pausa(400);
  const md = await centro(p, '#cp-prova .cp-media');
  const pb = await p.locator('#cp-prova').boundingBox();
  const mw = 400 * 1.2 / 1920 * pb.width;
  dice(!!md && Math.abs(md.w - mw) < 2 && Math.abs(md.x - (pb.x + pb.width / 2)) < 1.5 && Math.abs(md.y - (pb.y + pb.height / 2)) < 1.5, `un'immagine si vede grande come nell'overlay (${md ? md.w.toFixed(1) : '-'} px, attesi ${mw.toFixed(1)})`);
  });

  // LO SCONTORNO (public/scontorno.js), lo stesso per l'overlay e per l'anteprima:
  // su una tela meta' verde e meta' rossa il verde se ne va, il rosso resta, e la
  // misura arriva a chi l'aspetta
  await fase('scontorno', async () => {
  const sc = await p.evaluate(() => new Promise((ok) => {
    const src = document.createElement('canvas');
    src.width = 100; src.height = 50;
    const g = src.getContext('2d');
    g.fillStyle = '#00ff00'; g.fillRect(0, 0, 50, 50);
    g.fillStyle = '#e5484d'; g.fillRect(50, 0, 50, 50);
    Object.defineProperty(src, 'videoWidth', { value: 100 });
    Object.defineProperty(src, 'videoHeight', { value: 50 });
    const tela = document.createElement('canvas');
    let misura = null;
    const ferma = window.SB_SCONTORNO.scontorna(src, { colore: '#00ff00', soglia: 140 }, tela, { misurata: (l, a) => { misura = [l, a]; } });
    setTimeout(() => {
      ferma();
      const d = tela.getContext('2d').getImageData(0, 0, tela.width, tela.height).data;
      const a = (x, y) => d[(y * tela.width + x) * 4 + 3];
      ok({ w: tela.width, h: tela.height, verde: a(10, 25), rosso: a(90, 25), misura });
    }, 300);
  }));
  dice(sc.w === 100 && sc.h === 50 && sc.verde === 0 && sc.rosso === 255 && sc.misura?.join() === '100,50', `il green screen toglie il verde e lascia il resto, alla misura del video (${JSON.stringify(sc)})`);
  });

  // LA PRESENZA (docs/COLPI.md): la frase in chat fa comparire l'effetto dello
  // streamer nel suo punto, col nome; l'overlay la mostra e dice «visto»
  await fase('presenza', async () => {
  await o.waitForFunction(() => !document.querySelector('#palco-libero .effetto, .lancio'), null, { timeout: 15000 }).catch(() => {});
  const r = servizio.presenza(LOGIN, { chiave: 'twitch:77', nome: 'Marta', occasione: 'd:tw:gate', lingua: 'it' });
  dice(r.esito === 'partita', `la frase della presenza parte (${r.esito})`);
  await o.waitForSelector('#palco-libero .effetto.dentro', { timeout: 5000 }).catch(() => {});
  await pausa(700);
  const fx = await centro(o, '#palco-libero .effetto');
  dice(!!fx && Math.abs(fx.x - 0.12 * 1920) < 1 && Math.abs(fx.y - 0.30 * 1080) < 1 && Math.abs(fx.w - 400) < 1, `l'effetto della presenza sta nel punto dello streamer (${fx ? fx.x.toFixed(1) + ', ' + fx.y.toFixed(1) + ', largo ' + fx.w.toFixed(1) : 'niente'})`);
  dice((await o.locator('.attacco-firma').last().textContent().catch(() => '')) === 'Marta è presente', 'sotto, chi c\'e\'');
  const pid = [...registroColpi.ultimi(LOGIN, 5)].find((x) => x.metodo === 'presenza')?.id;
  for (let i = 0; i < 20 && !(pid && mondo.visti.includes(pid)); i++) await pausa(150);
  dice(!!pid && registroColpi.get(pid)?.stato === 'sparata', 'l\'overlay la mostra e la segna vista, come un colpo');
  dice(servizio.presenza(LOGIN, { chiave: 'twitch:77', nome: 'Marta', occasione: 'd:tw:gate' }).esito === 'gia', 'una volta per diretta');
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
