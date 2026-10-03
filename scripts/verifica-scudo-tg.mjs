// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello della PORTA DEL GRUPPO e della sua PROVA (docs/TELEGRAM.md, «Una
// porta sola»), in un browser vero, al computer e al telefono.
//
// La pagina e' quella vera (tg-porta.js col disegno della pagina link,
// /telegram-porta.js), resa dal database di una cartella usa e getta; dietro
// le chiamate ci sono gli STESSI gesti del server (tg-scudo-gesti.js), con un
// Telegram finto che scrive cosa gli si chiede. Le promesse che solo il
// browser acceso puo' mostrare:
//  · con lo scudo acceso «Entra» apre la prova QUI, nella carta del gruppo,
//    senza lasciare la pagina; con lo scudo spento e' il link del gruppo, e la
//    pagina non carica nessuno script della prova;
//  · la prova si muove, nei colori scelti nel pezzo del gruppo, coi caratteri
//    della pagina, e le parole scritte dallo streamer;
//  · il codice non arriva mai alla pagina: non nel documento, non in una
//    risposta in JSON;
//  · un codice vuoto, sbagliato o le regole non spuntate si dicono accanto al
//    loro campo; dopo tre tentativi sbagliati arriva da sola una prova nuova;
//  · con tutto giusto compare il link personale (uno, per una persona) e
//    nessuna approvazione parte; con una risposta sbagliata «Rifai la prova»
//    riapre una prova nuova; con «Non riesco a vederla» il link che chiede
//    l'approvazione;
//  · dentro Telegram e' la stessa porta, con la prova gia' aperta, e chi la
//    supera entra con UNA approvazione;
//  · chi ha chiesto meno movimento lo legge; niente scorre di lato; nessun errore.
//
// Uso: node scripts/verifica-scudo-tg.mjs             (esce 1 se una promessa non tiene)
//      FOTO=<cartella> node scripts/verifica-scudo-tg.mjs  (salva anche le foto dei passi)
//      node scripts/verifica-scudo-tg.mjs --selftest  (rimette un difetto alla volta: «Entra»
//                                                      che lascia la pagina, la prova ferma, la
//                                                      prova nuova che non arriva, i colori
//                                                      ignorati, il codice in una risposta; li
//                                                      vuole tutti rossi, ognuno da solo)

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apriSito, apriBrowser } from './_sito.mjs';

process.env.DATA_DIR = process.env.DATA_DIR || mkdtempSync(join(tmpdir(), 'porta-'));
const { tgConf, tgScudo, paginaTelegram, streamers } = await import('../src/db.js');
const G = await import('../src/features/tg-scudo-gesti.js');
const S = await import('../src/features/tg-scudo.js');
const { htmlPorta } = await import('../src/features/tg-porta.js');
const { testiScudo } = await import('../src/features/tg-scudo-testi.js');

const SELFTEST = process.argv.includes('--selftest');
// al computer la porta di un canale che parla italiano, al telefono quella di uno che parla inglese
const SCHERMI = [[1280, 800, 'it', 'prova'], [390, 844, 'en', 'proven']];
const CHAT = '-100900';
const FIRMA = 'firma-di-prova';
const FISSO = 'https://t.me/+linkdelgruppo';
const SCUDO = S.normScudo({
  attivo: true, minuti: 10,
  regole: { attivo: true, testo: 'Niente spam.\nNiente insulti.' },
  domande: [{ testo: 'Due più due?', opzioni: ['3', '4', '5'], giusta: 1 }],
});
// le parole e i colori che lo streamer ha scelto per la prova, nel pezzo del gruppo
const PROVA = { titolo: 'Il codice segreto della ciurma', fattoTitolo: 'Benvenuta ciurma', colori: { modo: 'miei', punti: '#ffd400', fondo: '#1b1030' } };

function canale(ch, { scudo = SCUDO, lingua = 'it' } = {}) {
  streamers.upsertApproved(ch, ch, '');
  streamers.setSettings(ch, { preferenze: { lingua } });
  tgConf.set(ch, { token: '1:finto', chatId: CHAT, chatTitolo: 'Il gruppo di prova' });
  tgConf.setInterattivo(ch, true, 'segreto-' + ch);
  tgConf.setScudo(ch, scudo);
  paginaTelegram.salva(ch, {
    headline: 'Il gruppo di Prova', template: 'neon', attiva: true, aspetto: 'suo',
    tema: { font: 'space' },
    blocchi: [{ tipo: 'intestazione' }, { tipo: 'gruppo', prova: PROVA }, { tipo: 'regole' }, { tipo: 'piede' }],
  });
}
canale('prova');
canale('proven', { lingua: 'en' });
canale('spento', { scudo: S.normScudo({ ...SCUDO, attivo: false }) });

const DIFETTI = [
  ['«Entra» che lascia la pagina', "    entra.addEventListener('click', function (ev) {\n      ev.preventDefault();", "    entra.addEventListener('click', function (ev) {\n      return;"],
  ['la prova ferma', 'var k = Math.floor((t - stato.t0) * fps / 1000) % n;', 'var k = 0;'],
  ['la prova nuova che non arriva', "if (x.esito === 'nuova') { errore(errCodice, x.msg); codice.value = ''; codice.focus(); return prova(); }", "if (x.esito === 'nuova') { errore(errCodice, x.msg); codice.value = ''; codice.focus(); return; }"],
  ['i colori ignorati', "var p = colore('--punti'), f = colore('--fondo');", "var p = [128, 128, 128], f = colore('--fondo');"],
  ['il codice in una risposta', null, null],
];
// il segno rosso che ogni difetto deve accendere
const SEGNI = ['non apre la prova qui', 'la prova e\' ferma', 'non e\' arrivata una prova nuova', 'i colori della prova non sono quelli scelti', 'il codice e\' in una risposta'];
let difetto = -1;
const entrati = DIFETTI.map(() => 0);

let chiamate = [];
const telegram = {
  ...Object.fromEntries(['rispondiRichiesta', 'approvaRichiesta', 'rifiutaRichiesta', 'mostraVerifica', 'inviaMessaggio'].map((n) => [n, async (...a) => { chiamate.push([n, ...a]); return { ok: true }; }])),
  creaInvito: async (...a) => { chiamate.push(['creaInvito', ...a]); return { ok: true, url: `https://t.me/+personale${chiamate.length}` }; },
};
const corpo = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch { ok({}); } }); });
// l'ultima prova aperta (sulla porta o dentro Telegram): il codice giusto si legge da qui
let ultimaRiga = () => null;

const sito = await apriSito({
  rotte: (req, res, q) => {
    const html = (h) => { res.writeHead(h ? 200 : 404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(h || 'no'); return true; };
    const v = /^\/telegram\/(prova|proven|spento)(\/verifica)?$/.exec(q);
    if (v) return html(htmlPorta(v[1], { display: 'Prova', invito: FISSO, modo: v[2] ? 'telegram' : 'web' }));
    const m = /^\/api\/(tg-porta|tg-scudo)\/(prova|proven)\/(nuova|apri|immagine|invia|aiuto|link)$/.exec(q);
    if (!m || req.method !== 'POST') return false;
    corpo(req).then(async (b) => {
      const json = (x, codice = 200) => { res.writeHead(codice, { 'content-type': 'application/json' }); res.end(JSON.stringify(x)); };
      const ch = m[2];
      const conf = tgConf.get(ch);
      const deps = { telegram };
      let id;
      const azione = m[3];
      if (m[1] === 'tg-porta') {
        if (azione === 'nuova') return json(G.nuovaPorta(conf, { lingua: b.lingua }, deps));
        id = G.identificaPorta(conf, b.s, b.lingua);
        if (!id.ok) return json({ esito: 'chiusa' }, 403);
      } else {
        if (b.initData !== FIRMA) return json({ esito: 'fuori' });
        id = { ok: true, userId: '42', chatId: CHAT, queryId: '', lingua: S.linguaDi(b.lingua) };
      }
      ultimaRiga = () => tgScudo.prendi(ch, CHAT, id.userId);
      if (azione === 'apri') return json(await G.apri(conf, id, {}, deps));
      if (azione === 'link') return json(await G.link(conf, id, deps));
      if (azione === 'immagine') {
        const r = await G.immagine(conf, id, deps);
        if (r.esito !== 'ok') return json(r, 409);
        res.writeHead(200, { 'content-type': 'application/octet-stream', 'x-prove': String(r.prove), 'x-altra': encodeURIComponent(G.altraIn(id.lingua, r.prove)) });
        return res.end(r.bin);
      }
      if (azione === 'invia') {
        const prima = ultimaRiga()?.codice || '';
        const r = await G.invia(conf, id, { codice: b.codice, regole: b.regole, risposte: b.risposte, firma: b.firma }, deps);
        // il difetto dell'autoprova: il server che, nel rispondere, ripete il codice
        if (difetto === 4 && prima) { entrati[4]++; r.codice = prima; }
        return json(r);
      }
      return json(await G.aiuto(conf, id, deps));
    });
    return true;
  },
});
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
let rotte = [];
const guai = [];
const dice = (ok, cosa) => { if (!ok) { if (!SELFTEST) console.log(`  ✗ ${cosa}`); rotte.push(cosa); } return ok; };
const testo = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent || '', sel);
const foto = async (p, nome) => { if (process.env.FOTO && !SELFTEST) await p.screenshot({ path: join(process.env.FOTO, `${nome}.png`), fullPage: true }); };
const fotogramma = (p) => p.evaluate(() => { const c = document.querySelector('.tg-prova canvas.tgp-tela'); return c ? c.toDataURL() : ''; });
const titoloProva = (p) => testo(p, '.tg-prova h3');
const largo = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function pagina(W, H, { meno = false } = {}) {
  const p = await br.newPage({ viewport: { width: W, height: H }, serviceWorkers: 'block', reducedMotion: meno ? 'reduce' : 'no-preference' });
  p.on('pageerror', (e) => guai.push(e.message));
  if (difetto >= 0 && DIFETTI[difetto][1]) {
    await p.route(/\/telegram-porta\.js(\?|$)/, async (route) => {
      const r = await route.fetch();
      let t = await r.text();
      if (t.includes(DIFETTI[difetto][1])) { t = t.replace(DIFETTI[difetto][1], DIFETTI[difetto][2]); entrati[difetto]++; }
      await route.fulfill({ response: r, body: t });
    });
  }
  const json = [];
  p.on('response', async (r) => { if ((r.headers()['content-type'] || '').includes('json')) json.push(await r.text().catch(() => '')); });
  return { p, json };
}
const pronta = async (p) => {
  await p.waitForSelector('#tgp-codice', { timeout: 10000 });
  await p.waitForFunction(() => { const c = document.querySelector('.tg-prova canvas.tgp-tela'); return c && c.width === 160; }, null, { timeout: 10000 });
  await p.waitForTimeout(350);
};
const invia = async (p, { codice = '', regole = true, risposta = 1 } = {}) => {
  await p.evaluate(({ codice, regole, risposta }) => {
    document.getElementById('tgp-codice').value = codice;
    const a = document.getElementById('tgp-accetto'); if (a) a.checked = regole;
    const r = document.querySelector(`input[name="tgp-d0"][value="${risposta}"]`); if (r) r.checked = true;
    document.querySelector('.tg-prova form button[type="submit"]').click();
  }, { codice, regole, risposta });
  await p.waitForTimeout(450);
};

async function giro(solo = false) {
  const base = `http://127.0.0.1:${sito.porta}`;
  for (const [W, H, l, ch] of solo ? [SCHERMI[0]] : SCHERMI) {
    const dove = `${W}px`;
    const T = testiScudo(l);
    chiamate = [];

    // ── la porta, scudo acceso: «Entra» apre la prova qui ──
    const { p, json } = await pagina(W, H);
    await p.goto(`${base}/telegram/${ch}`, { waitUntil: 'domcontentloaded' });
    dice(await p.evaluate((l) => document.documentElement.lang === l && document.querySelector('.tg-prova')?.dataset.lingua === l, l), `${dove}: la porta e la prova non parlano la lingua del canale (${l})`);
    const prima = p.url();
    const href = await p.evaluate(() => document.querySelector('.tg-gruppo [data-apre-prova]')?.getAttribute('href') || '');
    dice(href === FISSO, `${dove}: senza JavaScript «Entra» non porta al link del gruppo (${href})`);
    await p.click('.tg-gruppo [data-apre-prova]').catch(() => {});
    const aperta = await p.waitForSelector('#tgp-codice', { timeout: 6000 }).then(() => true).catch(() => false);
    const qui = aperta && p.url() === prima && await p.evaluate(() => {
      const b = document.querySelector('.tg-prova');
      return !!b && !b.hidden && !!b.closest('.tg-gruppo') && document.querySelector('[data-apre-prova]').hidden;
    });
    if (!dice(qui, `${dove}: «Entra» non apre la prova qui, nella carta del gruppo`)) { await p.close(); continue; }
    await pronta(p);
    await foto(p, `${W}-1-prova`);
    dice(await p.evaluate(() => document.activeElement?.tagName === 'H3' && !!document.activeElement.closest('.tg-prova')), `${dove}: aperta la prova, il fuoco non va al suo titolo`);

    // il vestito della pagina e le parole dello streamer
    dice((await titoloProva(p)) === PROVA.titolo, `${dove}: il titolo scritto dallo streamer non c'e' (${await titoloProva(p)})`);
    const vestito = await p.evaluate(() => ({
      prova: getComputedStyle(document.querySelector('.tg-prova')).fontFamily,
      carta: getComputedStyle(document.querySelector('.tg-gruppo')).fontFamily,
    }));
    dice(vestito.prova === vestito.carta, `${dove}: la prova non usa i caratteri della pagina (${vestito.prova} / ${vestito.carta})`);

    // la prova si muove, coi colori scelti
    const a = await fotogramma(p);
    await p.waitForTimeout(240);
    const b = await fotogramma(p);
    dice(a && b && a !== b, `${dove}: la prova e' ferma: due fotogrammi a distanza di un attimo sono uguali`);
    const colori = await p.evaluate(() => {
      const c = document.querySelector('.tg-prova canvas.tgp-tela');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const visti = new Set();
      for (let i = 0; i < d.length; i += 4) visti.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      return [...visti];
    });
    dice(colori.length === 2 && colori.includes('255,212,0') && colori.includes('27,16,48'), `${dove}: i colori della prova non sono quelli scelti (${colori.slice(0, 4).join(' | ')})`);

    // il codice non e' nella pagina
    const codice = ultimaRiga().codice, codici = [codice];
    dice(!(await p.evaluate(() => document.documentElement.outerHTML)).includes(codice), `${dove}: il codice e' scritto nella pagina`);

    // vuoto, regole, sbagliato, prova nuova
    await invia(p, { codice: '' });
    dice((await testo(p, '#tgp-e-codice')) === T.errori.vuoto, `${dove}: un codice vuoto non si dice accanto al campo`);
    await invia(p, { codice, regole: false });
    dice((await testo(p, '#tgp-e-regole')) === T.errori.regole, `${dove}: le regole non spuntate non si dicono`);
    dice(Number(ultimaRiga().tentativi) === 0, `${dove}: le regole non spuntate hanno consumato un tentativo`);
    for (let k = 1; k <= S.TENTATIVI; k++) await invia(p, { codice: 'ZZZZZ' });
    await p.waitForTimeout(500);
    dice(Number(ultimaRiga().immagini) === 2 && !!ultimaRiga().codice, `${dove}: dopo tre tentativi sbagliati non e' arrivata una prova nuova`);
    dice((await testo(p, '#tgp-e-codice')) === T.errori.nuova, `${dove}: la prova nuova non si dice`);
    await foto(p, `${W}-2-nuova`);
    if (ultimaRiga().codice) codici.push(ultimaRiga().codice);

    if (l === 'it') {
      // con tutto giusto: il link personale, una volta, e nessuna approvazione
      await invia(p, { codice: ultimaRiga().codice.toLowerCase() });
      dice((await titoloProva(p)) === PROVA.fattoTitolo, `${dove}: con tutto giusto non arriva il titolo scritto dallo streamer (${await titoloProva(p)})`);
      const inviti = chiamate.filter((c) => c[0] === 'creaInvito');
      dice(inviti.length === 1 && inviti[0][3]?.persone === 1 && !inviti[0][3]?.richiesta, `${dove}: non e' nato UN link personale (${JSON.stringify(inviti.map((c) => c[3]))})`);
      const apri = await p.evaluate(() => document.querySelector('.tg-prova a.tg-entra')?.getAttribute('href') || '');
      dice(/^https:\/\/t\.me\/\+personale/.test(apri), `${dove}: il tasto per aprire Telegram non porta al link personale (${apri})`);
      dice(!chiamate.some((c) => /Richiesta/.test(c[0])), `${dove}: e' partita un'approvazione (${chiamate.map((c) => c[0]).join(',')})`);
      dice(await p.evaluate(() => document.activeElement?.tagName === 'H3' && getComputedStyle(document.activeElement).outlineStyle === 'none'), `${dove}: il titolo dell'esito non ha il fuoco, o ha la cornice di un tasto`);
    } else {
      // una risposta sbagliata: il no, e «Rifai la prova» ne apre una nuova
      await invia(p, { codice: ultimaRiga().codice, risposta: 0 });
      dice((await titoloProva(p)) === T.porta.no[0], `${dove}: con una risposta sbagliata non arriva il no (${await titoloProva(p)})`);
      dice(!chiamate.length, `${dove}: un no ha chiamato Telegram (${chiamate.map((c) => c[0]).join(',')})`);
      const vecchia = ultimaRiga().tg_user_id;
      await p.evaluate(() => document.querySelector('.tg-prova .tgp-riga button')?.click());
      await pronta(p);
      dice(ultimaRiga().tg_user_id !== vecchia && ultimaRiga().stato === 'attesa', `${dove}: «Rifai la prova» non apre una prova nuova`);
    }
    await p.waitForTimeout(100);
    await foto(p, `${W}-3-esito`);
    dice((await largo(p)) <= 0, `${dove}: la pagina scorre di lato di ${await largo(p)}px`);
    const fuori = await p.evaluate((cc) => cc.filter((c) => document.documentElement.outerHTML.includes(c)), codici);
    dice(!fuori.length, `${dove}: il codice e' scritto nella pagina`);
    dice(!json.some((t) => codici.some((c) => t.includes(c))), `${dove}: il codice e' in una risposta che la pagina riceve`);
    await p.close();
    if (solo) return;

    // ── «Non riesco a vederla», e meno movimento ──
    chiamate = [];
    const due = await pagina(W, H, { meno: true });
    await due.p.goto(`${base}/telegram/${ch}`, { waitUntil: 'domcontentloaded' });
    await due.p.click('.tg-gruppo [data-apre-prova]');
    await pronta(due.p);
    dice((await due.p.evaluate(() => document.querySelector('.tg-prova').innerText)).includes(T.movimento), `${dove}: chi ha chiesto meno movimento non lo legge`);
    const larga = await due.p.evaluate(() => document.querySelector('.tg-prova canvas.tgp-tela').getBoundingClientRect().width);
    dice(larga >= Math.min(300, W - 90), `${dove}: la prova e' troppo piccola (${Math.round(larga)}px)`);
    await foto(due.p, `${W}-4-meno`);
    await due.p.evaluate(() => [...document.querySelectorAll('.tg-prova button')].find((x) => !x.closest('form'))?.click());
    await due.p.waitForTimeout(450);
    dice((await titoloProva(due.p)) === T.porta.admin[0], `${dove}: «Non riesco a vederla» non passa agli amministratori (${await titoloProva(due.p)})`);
    const adm = chiamate.filter((c) => c[0] === 'creaInvito');
    dice(adm.length === 1 && adm[0][3]?.richiesta === true, `${dove}: il link per gli amministratori non chiede l'approvazione`);
    await foto(due.p, `${W}-5-admin`);
    await due.p.close();

    // ── scudo spento: «Entra» e' il link del gruppo, e niente script della prova ──
    const tre = await pagina(W, H);
    await tre.p.goto(`${base}/telegram/spento`, { waitUntil: 'domcontentloaded' });
    const spento = await tre.p.evaluate(() => ({
      href: document.querySelector('.tg-gruppo a.tg-entra')?.getAttribute('href') || '',
      apre: !!document.querySelector('[data-apre-prova]'),
      script: !!document.querySelector('script[src*="telegram-porta"]'),
      prova: !!document.querySelector('.tg-prova'),
    }));
    dice(spento.href === FISSO && !spento.apre && !spento.script && !spento.prova, `${dove}: a scudo spento «Entra» non e' il link del gruppo, o la prova c'e' lo stesso (${JSON.stringify(spento)})`);
    await tre.p.close();

    // ── dentro Telegram: la stessa porta, con la prova gia' aperta ──
    chiamate = [];
    tgScudo.apri({ channel: ch, chatId: CHAT, userId: '42', titolo: 'Il gruppo di prova', lingua: l, scad: Date.now() + 10 * 60_000 });
    const qu = await pagina(W, H);
    await qu.p.addInitScript((firma) => {
      window.Telegram = { WebApp: { initData: firma, ready() {}, expand() {}, close() { window.__chiuso = true; } } };
    }, FIRMA);
    await qu.p.route(/telegram\.org\/js\/telegram-web-app\.js/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await qu.p.goto(`${base}/telegram/${ch}/verifica?c=${CHAT}`, { waitUntil: 'domcontentloaded' });
    await pronta(qu.p);
    const stessa = await qu.p.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent || '', carta: !!document.querySelector('.tg-gruppo .tg-prova:not([hidden])'), entra: !!document.querySelector('[data-apre-prova]'),
    }));
    dice(stessa.h1.includes('Il gruppo di Prova') && stessa.carta && !stessa.entra, `${dove}: dentro Telegram non e' la porta con la prova aperta (${JSON.stringify(stessa)})`);
    await foto(qu.p, `${W}-6-telegram`);
    await qu.p.evaluate(({ codice }) => {
      document.getElementById('tgp-codice').value = codice;
      document.getElementById('tgp-accetto').checked = true;
      document.querySelector('input[name="tgp-d0"][value="1"]').checked = true;
      document.querySelector('.tg-prova form button[type="submit"]').click();
    }, { codice: tgScudo.prendi(ch, CHAT, '42').codice });
    await qu.p.waitForTimeout(500);
    dice((await titoloProva(qu.p)) === T.esiti.dentro[0], `${dove}: dentro Telegram con tutto giusto non si entra (${await titoloProva(qu.p)})`);
    dice(chiamate.filter((c) => c[0] === 'approvaRichiesta').length === 1 && !chiamate.some((c) => c[0] === 'creaInvito'), `${dove}: dentro Telegram non e' partita UNA approvazione (${chiamate.map((c) => c[0]).join(',')})`);
    await qu.p.close();
  }
}

try {
  if (SELFTEST) {
    // un difetto alla volta: ognuno deve accendere il suo segno
    const esiti = [];
    for (let i = 0; i < DIFETTI.length; i++) {
      difetto = i;
      rotte = [];
      await giro(true);
      esiti.push([DIFETTI[i][0], entrati[i] > 0, rotte.some((r) => r.includes(SEGNI[i]))]);
    }
    let ok = true;
    for (const [nome, entrato, visto] of esiti) {
      if (!entrato) { ok = false; console.log(`Autoprova: ${nome} NON e' entrato: il codice e' cambiato, aggiorna DIFETTI. ✗`); continue; }
      console.log(visto ? `Autoprova: ${nome} si vede. ✓` : `Autoprova: ${nome} NON e' stato visto. ✗`);
      ok = ok && visto;
    }
    await br.close();
    sito.chiudi();
    process.exit(ok ? 0 : 1);
  }
  await giro();
  dice(!guai.length, `la pagina ha errori: ${guai[0]}`);
} finally {
  if (!SELFTEST) { await br.close(); sito.chiudi(); }
}

console.log(rotte.length ? `\n${rotte.length} cose non tornano.` : '\nLa porta del gruppo: «Entra» apre la prova qui (o porta dritti, a scudo spento), la prova si muove nei colori e nelle parole scelte, il codice non esce, gli errori si dicono, la prova nuova arriva, il link personale e\' uno solo, il no e gli amministratori, dentro Telegram la stessa pagina, meno movimento, al telefono e al computer. ✓');
process.exit(rotte.length ? 1 : 0);
