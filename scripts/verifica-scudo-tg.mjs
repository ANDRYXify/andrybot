// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello della PROVA DELLO SCUDO (docs/TELEGRAM.md, «Lo scudo all'ingresso»),
// in un browser vero, al computer e al telefono.
//
// La pagina e' quella vera (tg-porta.js, /telegram-verifica.js), Telegram e'
// finto (la firma la da' questo cancello), e dietro le chiamate ci sono gli
// STESSI gesti del server (tg-scudo-gesti.js) su una richiesta tenuta in
// memoria. Le promesse che solo il browser acceso puo' mostrare:
//  · la prova si muove: due fotogrammi a distanza di un attimo sono diversi, e
//    hanno i colori scelti per la prova;
//  · il codice non arriva mai alla pagina: non nel documento, non in una
//    risposta in JSON;
//  · un codice vuoto, sbagliato o le regole non spuntate si dicono accanto al
//    loro campo; dopo tre tentativi sbagliati arriva da sola una prova nuova;
//  · con tutto giusto si entra (e Telegram riceve UNA approvazione); con una
//    risposta sbagliata no; con «Non riesco a vederla» decidono gli
//    amministratori;
//  · chi ha chiesto meno movimento lo legge; niente scorre di lato; nessun errore.
//
// Uso: node scripts/verifica-scudo-tg.mjs             (esce 1 se una promessa non tiene)
//      FOTO=<cartella> node scripts/verifica-scudo-tg.mjs  (salva anche le foto dei passi)
//      node scripts/verifica-scudo-tg.mjs --selftest  (rimette quattro difetti: la prova
//                                                      ferma, il codice nella risposta, la prova
//                                                      nuova che non arriva, i colori ignorati;
//                                                      li vuole tutti rossi)

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apriSito, apriBrowser } from './_sito.mjs';

process.env.DATA_DIR = process.env.DATA_DIR || mkdtempSync(join(tmpdir(), 'scudo-'));
const G = await import('../src/features/tg-scudo-gesti.js');
const S = await import('../src/features/tg-scudo.js');
const { htmlVerifica } = await import('../src/features/tg-porta.js');

const SELFTEST = process.argv.includes('--selftest');
const SCHERMI = [[1280, 800, 'it'], [390, 844, 'en']];
const FIRMA = 'firma-di-prova';
const SCUDO = S.normScudo({
  attivo: true, minuti: 10,
  regole: { attivo: true, testo: 'Niente spam.\nNiente insulti.' },
  domande: [{ testo: 'Due più due?', opzioni: ['3', '4', '5'], giusta: 1 }],
  colori: { modo: 'miei', punti: '#ffd400', fondo: '#1b1030' },
});
const DIFETTI = [
  ['telegram-verifica.js', 'var k = Math.floor((t - stato.t0) * fps / 1000) % n;', 'var k = 0;'],
  ['telegram-verifica.js', "if (x.esito === 'nuova') { errore(errCodice, x.msg); codice.value = ''; codice.focus(); return prova(); }", "if (x.esito === 'nuova') { errore(errCodice, x.msg); codice.value = ''; codice.focus(); return; }"],
  ['telegram-verifica.js', "var p = colore('--punti'), f = colore('--fondo');", 'var p = [128, 128, 128], f = colore(\'--fondo\');'],
];
// quante volte ogni difetto e' entrato davvero: quelli della pagina a ogni
// apertura, la fuga del codice a ogni risposta di un invio
const messi = { pagina: DIFETTI.map(() => 0), fuga: 0 };

// la richiesta di chi sta aprendo la pagina, in memoria: una per schermo
let mem = null, lingua = 'it', chiamate = [];
const conf = () => ({ channel: 'prova', token: 'finto', interattivo: 1, scudo: JSON.stringify(SCUDO) });
const telegram = Object.fromEntries(['rispondiRichiesta', 'approvaRichiesta', 'rifiutaRichiesta', 'mostraVerifica', 'inviaMessaggio']
  .map((n) => [n, async (...a) => { chiamate.push(n); return { ok: true }; }]));
function nuovaRichiesta(l) {
  mem = G.memoria();
  lingua = l;
  chiamate = [];
  mem.apri({ channel: 'prova', chatId: '-100', userId: '42', titolo: 'Il gruppo di prova', lingua: l, scad: Date.now() + 10 * 60_000 });
}
const corpo = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch { ok({}); } }); });

const sito = await apriSito({
  rotte: (req, res, q) => {
    if (q === '/telegram/prova/verifica') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(htmlVerifica('prova', { display: 'Prova', telegram: false, scudo: SCUDO }));
      return true;
    }
    const m = /^\/api\/tg-scudo\/prova\/(apri|immagine|invia|aiuto)$/.exec(q);
    if (!m || req.method !== 'POST') return false;
    corpo(req).then(async (b) => {
      const json = (x, codice = 200) => { res.writeHead(codice, { 'content-type': 'application/json' }); res.end(JSON.stringify(x)); };
      if (b.initData !== FIRMA) return json({ esito: 'fuori', lingua, t: (await import('../src/features/tg-scudo-testi.js')).testiPagina(lingua) });
      const id = { ok: true, userId: '42', chatId: '-100', queryId: '', lingua };
      const deps = { db: mem, telegram };
      if (m[1] === 'apri') return json(await G.apri(conf(), id, {}, deps));
      if (m[1] === 'immagine') {
        const r = await G.immagine(conf(), id, deps);
        if (r.esito !== 'ok') return json(r, 409);
        res.writeHead(200, { 'content-type': 'application/octet-stream', 'x-prove': String(r.prove), 'x-altra': encodeURIComponent(G.altraIn(lingua, r.prove)) });
        return res.end(r.bin);
      }
      if (m[1] === 'invia') {
        const prima = mem.prendi()?.codice || '';
        const r = await G.invia(conf(), id, { codice: b.codice, regole: b.regole, risposte: b.risposte, firma: b.firma }, deps);
        // il difetto dell'autoprova: il server che, nel dire «riprova», ripete il codice
        if (SELFTEST && prima) { messi.fuga++; r.codice = prima; }
        return json(r);
      }
      return json(await G.aiuto(conf(), id, deps));
    });
    return true;
  },
});
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
const rotte = [], guai = [];
const dice = (ok, cosa) => { if (!ok) { console.log(`  ✗ ${cosa}`); rotte.push(cosa); } return ok; };
const testo = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent || '', sel);
const foto = async (p, nome) => { if (process.env.FOTO) await p.screenshot({ path: join(process.env.FOTO, `${nome}.png`), fullPage: true }); };
const fotogramma = (p) => p.evaluate(() => { const c = document.querySelector('canvas.tela'); return c ? c.toDataURL() : ''; });

async function apri(W, H, l, { meno = false } = {}) {
  nuovaRichiesta(l);
  const p = await br.newPage({ viewport: { width: W, height: H }, serviceWorkers: 'block', reducedMotion: meno ? 'reduce' : 'no-preference' });
  p.on('pageerror', (e) => guai.push(e.message));
  if (SELFTEST) {
    await p.route(/\/telegram-verifica\.js(\?|$)/, async (route) => {
      const r = await route.fetch();
      let t = await r.text();
      DIFETTI.forEach(([f, da, a], i) => { if (f === 'telegram-verifica.js' && t.includes(da)) { t = t.replace(da, a); messi.pagina[i]++; } });
      await route.fulfill({ response: r, body: t });
    });
  }
  const json = [];
  p.on('response', async (r) => { if ((r.headers()['content-type'] || '').includes('json')) json.push(await r.text().catch(() => '')); });
  await p.addInitScript((firma) => {
    window.Telegram = { WebApp: { initData: firma, ready() {}, expand() {}, close() { window.__chiuso = true; } } };
  }, FIRMA);
  await p.goto(`http://127.0.0.1:${sito.porta}/telegram/prova/verifica?c=-100`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#sv-codice', { timeout: 10000 });
  await p.waitForFunction(() => document.querySelector('.tela') && document.querySelector('.tela').width === 160, null, { timeout: 10000 });
  await p.waitForTimeout(350);
  return { p, json };
}
const invia = async (p, { codice = '', regole = true, risposta = 1 } = {}) => {
  await p.evaluate(({ codice, regole, risposta }) => {
    document.getElementById('sv-codice').value = codice;
    const a = document.getElementById('sv-accetto'); if (a) a.checked = regole;
    const r = document.querySelector(`input[name="sv-d0"][value="${risposta}"]`); if (r) r.checked = true;
    document.querySelector('#sv-corpo form button[type="submit"]').click();
  }, { codice, regole, risposta });
  await p.waitForTimeout(450);
};

try {
  for (const [W, H, l] of SCHERMI) {
    const dove = `${W}px`;
    const { p, json } = await apri(W, H, l);
    const T = (await import('../src/features/tg-scudo-testi.js')).testiScudo(l);

    await foto(p, `${W}-1-prova`);
    // la prova si muove, coi colori scelti
    const a = await fotogramma(p);
    await p.waitForTimeout(240);
    const b = await fotogramma(p);
    dice(a && b && a !== b, `${dove}: la prova e' ferma: due fotogrammi a distanza di un attimo sono uguali`);
    const colori = await p.evaluate(() => {
      const c = document.querySelector('canvas.tela');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const visti = new Set();
      for (let i = 0; i < d.length; i += 4) visti.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      return [...visti];
    });
    dice(colori.length === 2 && colori.includes('255,212,0') && colori.includes('27,16,48'), `${dove}: i colori della prova non sono quelli scelti (${colori.slice(0, 4).join(' | ')})`);

    // le carte e il tasto non si toccano: fra uno e l'altro c'e' aria
    const attaccati = await p.evaluate(() => {
      const fuori = [];
      for (const sel of ['#sv-corpo > *', '#sv-corpo form > *']) {
        const r = [...document.querySelectorAll(sel)].map((x) => x.getBoundingClientRect()).filter((b) => b.height);
        for (let i = 1; i < r.length; i++) if (r[i].top - r[i - 1].bottom < 8) fuori.push(`${sel} ${i}: ${Math.round(r[i].top - r[i - 1].bottom)}px`);
      }
      return fuori;
    });
    dice(!attaccati.length, `${dove}: carte attaccate (${attaccati.join(', ')})`);

    // il codice non e' nella pagina (e, alla fine, in nessuna risposta)
    const codice = mem.prendi().codice, codici = [codice];
    const html = await p.evaluate(() => document.documentElement.outerHTML);
    dice(!html.includes(codice), `${dove}: il codice e' scritto nella pagina`);

    // vuoto, regole, sbagliato, prova nuova
    await invia(p, { codice: '' });
    dice((await testo(p, '#sv-e-codice')) === T.errori.vuoto, `${dove}: un codice vuoto non si dice accanto al campo`);
    await invia(p, { codice, regole: false });
    dice((await testo(p, '#sv-e-regole')) === T.errori.regole, `${dove}: le regole non spuntate non si dicono`);
    await foto(p, `${W}-2-regole`);
    dice(Number(mem.prendi().tentativi) === 0, `${dove}: le regole non spuntate hanno consumato un tentativo`);
    for (let k = 1; k <= S.TENTATIVI; k++) await invia(p, { codice: 'ZZZZZ' });
    await p.waitForTimeout(500);
    dice(Number(mem.prendi().immagini) === 2 && !!mem.prendi().codice, `${dove}: dopo tre tentativi sbagliati non e' arrivata una prova nuova`);
    dice((await testo(p, '#sv-e-codice')) === T.errori.nuova, `${dove}: la prova nuova non si dice`);
    await foto(p, `${W}-3-nuova`);
    if (mem.prendi().codice) codici.push(mem.prendi().codice);

    if (l === 'it') {
      // con tutto giusto si entra, una volta
      await invia(p, { codice: mem.prendi().codice.toLowerCase() });
      dice((await testo(p, '#sv-titolo')) === T.esiti.dentro[0], `${dove}: con tutto giusto non si entra`);
      dice(chiamate.filter((x) => x === 'approvaRichiesta').length === 1, `${dove}: Telegram non ha ricevuto una sola approvazione (${chiamate.join(',')})`);
      const largo = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      dice(largo <= 0, `${dove}: la pagina scorre di lato di ${largo}px`);
    } else {
      // una risposta sbagliata: un no, nessuna approvazione
      await invia(p, { codice: mem.prendi().codice, risposta: 0 });
      dice((await testo(p, '#sv-titolo')) === T.esiti.no[0], `${dove}: con una risposta sbagliata non arriva il no`);
      dice(!chiamate.includes('approvaRichiesta') && chiamate.includes('rifiutaRichiesta'), `${dove}: una risposta sbagliata non rifiuta (${chiamate.join(',')})`);
    }
    await p.waitForTimeout(100);
    await foto(p, `${W}-4-esito`);
    // il titolo dell'esito prende il fuoco (per chi legge con la voce) senza la cornice di un tasto
    dice(await p.evaluate(() => document.activeElement?.id === 'sv-titolo' && getComputedStyle(document.activeElement).outlineStyle === 'none'), `${dove}: il titolo dell'esito non ha il fuoco, o ha la cornice di un tasto`);
    const fuori = await p.evaluate((cc) => cc.filter((c) => document.documentElement.outerHTML.includes(c)), codici);
    dice(!fuori.length, `${dove}: il codice e' scritto nella pagina`);
    dice(!json.some((t) => codici.some((c) => t.includes(c))), `${dove}: il codice e' in una risposta che la pagina riceve`);
    await p.close();

    // «Non riesco a vederla», e meno movimento
    const due = await apri(W, H, l, { meno: true });
    dice((await due.p.evaluate(() => document.body.innerText)).includes(T.movimento), `${dove}: chi ha chiesto meno movimento non lo legge`);
    await foto(due.p, `${W}-5-meno`);
    const piccolo = await due.p.evaluate(() => document.querySelector('canvas.tela').getBoundingClientRect().width);
    dice(piccolo >= Math.min(300, W - 60), `${dove}: la prova e' troppo piccola (${Math.round(piccolo)}px)`);
    const largo2 = await due.p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    dice(largo2 <= 0, `${dove}: la pagina scorre di lato di ${largo2}px`);
    await due.p.evaluate(() => [...document.querySelectorAll('#sv-corpo button')].find((x) => x.textContent && x.closest('.passo') && !x.closest('form'))?.click());
    await due.p.waitForTimeout(450);
    dice((await testo(due.p, '#sv-titolo')) === T.esiti.admin[0], `${dove}: «Non riesco a vederla» non passa agli amministratori`);
    await foto(due.p, `${W}-6-admin`);
    dice(mem.prendi().stato === 'admin' && mem.prendi().motivo === 'aiuto', `${dove}: la richiesta non e' andata agli amministratori`);
    await due.p.close();
  }
  dice(!guai.length, `la pagina ha errori: ${guai[0]}`);
} finally {
  await br.close();
  sito.chiudi();
}

if (SELFTEST) {
  // ogni difetto della pagina in ogni apertura (due per schermo), la fuga almeno una volta per schermo
  const entrati = messi.pagina.every((n) => n === SCHERMI.length * 2) && messi.fuga >= SCHERMI.length;
  const visti = [
    ['la prova ferma', rotte.some((r) => r.includes('la prova e\' ferma'))],
    ['il codice nella risposta', rotte.some((r) => r.includes('il codice e\' in una risposta'))],
    ['la prova nuova che non arriva', rotte.some((r) => r.includes('non e\' arrivata una prova nuova'))],
    ['i colori ignorati', rotte.some((r) => r.includes('i colori della prova non sono quelli scelti'))],
  ];
  console.log(entrati ? 'Autoprova: i quattro difetti sono entrati. ✓' : `Autoprova: difetti entrati ${messi.pagina.join('/')} (ne servono ${SCHERMI.length * 2} ciascuno), fughe ${messi.fuga}: il codice e' cambiato, aggiorna DIFETTI. ✗`);
  for (const [n, v] of visti) console.log(v ? `Autoprova: ${n} si vede. ✓` : `Autoprova: ${n} NON e' stato visto. ✗`);
  process.exit(entrati && visti.every(([, v]) => v) ? 0 : 1);
}
console.log(rotte.length ? `\n${rotte.length} cose non tornano.` : '\nLa prova dello scudo: si muove nei suoi colori, il codice non esce, gli errori si dicono, la prova nuova arriva, si entra una volta sola, il no e gli amministratori, meno movimento, al telefono e al computer. ✓');
process.exit(rotte.length ? 1 : 0);
