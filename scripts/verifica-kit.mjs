// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello del MEDIA KIT (docs/STRUMENTI.md, «Media kit»), in un browser vero,
// sulla demo, al telefono e al computer.
//
// Le promesse che solo il pannello acceso puo' mostrare:
//  · le pagine dell'anteprima sono quelle dell'impaginazione, e il conto lo dice;
//  · nel PDF scaricato ci sono tutte le pagine, ogni link sta sul rettangolo
//    disegnato della sua pagina, e il testo si trova (l'email, un marchio);
//  · un indirizzo storto si segna nel campo e non diventa un link;
//  · una sezione nascosta sparisce, una spostata cambia posto;
//  · coi «miei colori» poco leggibili la nota lo dice e il testo si legge lo stesso;
//  · niente scorre di lato, e la pagina non ha errori.
//
// Uso: node scripts/verifica-kit.mjs             (esce 1 se una promessa non tiene)
//      node scripts/verifica-kit.mjs --selftest  (rimette quattro difetti: i link che non
//                                                 arrivano al PDF, un indirizzo storto preso per
//                                                 buono, il PDF senza testo, una sezione vuota
//                                                 che disegna il suo titolo; li vuole tutti rossi)

import { apriSito, apriBrowser } from './_sito.mjs';

const SELFTEST = process.argv.includes('--selftest');
const SCHERMI = [[1440, 950], [390, 844]];
const DIFETTI = [
  ['app.js', 'return { tela, link: R.link, testi: R.testi };', 'return { tela, link: [], testi: R.testi };'],
  ['app.js', "case 'lavori': return { ...b, voci: s.voci.filter((v) => v.titolo.trim()).map((v) => ({ titolo: v.titolo.trim(), testo: v.testo, url: K.urlKit(v.url) })) };", "case 'lavori': return { ...b, voci: s.voci.filter((v) => v.titolo.trim()).map((v) => ({ titolo: v.titolo.trim(), testo: v.testo, url: v.url })) };"],
  ['pdf.js', '+ strato(p.testi, kx, ky, PH)', "+ ''"],
  ['kit.js', "    lavori(P, d, s, x, y, w, problemi) {\n      const c = P.c;\n      if (!s.voci?.length) return 0;", "    lavori(P, d, s, x, y, w, problemi) {\n      const c = P.c;"],
];

const sito = await apriSito();
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
const rotte = [], guai = [];
let difettiMessi = 0;
const dice = (ok, cosa) => { if (!ok) { console.log(`  ✗ ${cosa}`); rotte.push(cosa); } return ok; };
const clic = (p, sel) => p.evaluate((s) => { const b = document.querySelector(s); if (b) b.click(); return !!b; }, sel);
const scrivi = (p, sel, testo) => p.evaluate(({ s, t }) => {
  const el = document.querySelector(s);
  if (!el) return false;
  el.focus(); el.value = t; el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}, { s: sel, t: testo });
const pronto = (p) => p.waitForFunction(() => !KIT_STATO.timer || KIT_STATO.fogli.length, null, { timeout: 5000 }).then(() => p.waitForTimeout(260));
const indice = (p, tipo) => p.evaluate((t) => KIT_STATO.bozza.sezioni.findIndex((s) => s.tipo === t), tipo);
const testi = (p) => p.evaluate(() => KIT_STATO.fogli.flatMap((f, n) => f.testi.map((x) => ({ n, t: x.testo, y: x.y }))));

const pdfLetto = (p) => p.evaluate(async () => {
  const blob = await window.SB_PDF.daTele(KIT_STATO.fogli, { titolo: 'prova' });
  const b = new Uint8Array(await blob.arrayBuffer());
  const t = new TextDecoder('latin1').decode(b);
  const obj = (n) => { const i = t.indexOf(`\n${n} 0 obj\n`); return i < 0 ? null : { i: i + `\n${n} 0 obj\n`.length, testo: t.slice(i + `\n${n} 0 obj\n`.length, t.indexOf('\nendobj\n', i)) }; };
  const kids = (/\/Kids \[([^\]]*)\]/.exec(t)?.[1].match(/\d+(?= 0 R)/g) || []).map(Number);
  const pagine = [];
  for (const n of kids) {
    const pag = obj(n).testo;
    const link = [];
    for (const a of (/\/Annots \[([^\]]*)\]/.exec(pag)?.[1].match(/\d+(?= 0 R)/g) || []).map(Number)) {
      const m = /\/Rect \[([\d. ]+)\][\s\S]*\/URI <([0-9A-F]+)>/.exec(obj(a).testo);
      const r = m[1].split(' ').map(Number);
      const url = m[2].match(/../g).map((h) => String.fromCharCode(parseInt(h, 16))).join('');
      link.push({ r, url });
    }
    const c = obj(Number(/\/Contents (\d+) 0 R/.exec(pag)[1]));
    const testa = /^<< \/Length (\d+) \/Filter \/FlateDecode >>\nstream\n/.exec(c.testo);
    const da = c.i + testa[0].length;
    const flusso = new Blob([b.slice(da, da + Number(testa[1]))]).stream().pipeThrough(new DecompressionStream('deflate'));
    const cont = new TextDecoder('latin1').decode(await new Response(flusso).arrayBuffer());
    const parole = [...cont.matchAll(/<([0-9A-F]+)> Tj/g)].map((m) => m[1].match(/../g).map((h) => String.fromCharCode(parseInt(h, 16))).join(''));
    pagine.push({ link, parole, invisibile: /BT 3 Tr/.test(cont) });
  }
  const PW = 595.28, PH = 841.89, kx = PW / window.SB_KIT.W, ky = PH / window.SB_KIT.H;
  const disegnati = KIT_STATO.fogli.map((f) => f.link.map((l) => ({ url: l.url, r: [l.x * kx, PH - (l.y + l.h) * ky, (l.x + l.w) * kx, PH - l.y * ky] })));
  return { pagine, disegnati, fogli: KIT_STATO.fogli.length };
});

try {
  for (const [W, H] of SCHERMI) {
    const dove = `${W}px`;
    const p = await br.newPage({ viewport: { width: W, height: H }, serviceWorkers: 'block' });
    p.on('pageerror', (e) => guai.push(e.message));
    if (SELFTEST) {
      await p.route(/\/(app|kit|pdf)\.js(\?|$)/, async (route) => {
        const r = await route.fetch();
        let t = await r.text();
        const file = /\/(app|kit|pdf)\.js/.exec(route.request().url())[1] + '.js';
        for (const [f, da, a] of DIFETTI) if (f === file && t.includes(da)) { t = t.replace(da, a); difettiMessi++; }
        await route.fulfill({ response: r, body: t });
      });
    }
    await p.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
    await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('kit'); });
    await p.waitForFunction(() => typeof KIT_STATO !== 'undefined' && KIT_STATO.fogli.length > 0 && document.querySelectorAll('#kit-sezioni .kit-sez').length > 5, null, { timeout: 20000 });
    await p.evaluate(() => document.querySelectorAll('.giro-velo, .giro-carta').forEach((x) => x.remove()));

    const vista = await p.evaluate(() => ({
      tele: document.querySelectorAll('#kit-fogli canvas').length, fogli: KIT_STATO.fogli.length,
      conto: document.getElementById('kit-pagine-conto').textContent.trim(),
      problemi: [...document.querySelectorAll('#kit-problemi li')].map((x) => x.textContent.trim()),
      largo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    dice(vista.tele === vista.fogli && vista.fogli >= 2, `${dove}: la demo ha ${vista.tele} tele e ${vista.fogli} pagine impaginate (ne aspettavo almeno 2, uguali)`);
    dice(vista.conto === `${vista.fogli} pagine`, `${dove}: il conto dice «${vista.conto}» per ${vista.fogli} pagine`);
    dice(!vista.problemi.length, `${dove}: la demo ha dei problemi: ${vista.problemi.join(' / ')}`);
    dice(vista.largo <= 0, `${dove}: la pagina scorre di lato di ${vista.largo}px`);

    const pdf = await pdfLetto(p);
    dice(pdf.pagine.length === pdf.fogli, `${dove}: il PDF ha ${pdf.pagine.length} pagine, l'anteprima ${pdf.fogli}`);
    pdf.pagine.forEach((pg, n) => {
      const att = pdf.disegnati[n] || [];
      dice(pg.link.length === att.length && att.length > 0, `${dove}: a pagina ${n + 1} il PDF ha ${pg.link.length} link, il disegno ${att.length}`);
      att.forEach((a, j) => {
        const l = pg.link[j];
        dice(l && l.url === a.url && l.r.every((x, q) => Math.abs(x - a.r[q]) < 0.02), `${dove}: a pagina ${n + 1} il link ${j + 1} (${a.url}) non sta dove e' disegnato`);
      });
      dice(pg.invisibile && pg.parole.length > 5, `${dove}: a pagina ${n + 1} il PDF non ha lo strato di testo (${pg.parole.length} parole)`);
    });
    const tutte = pdf.pagine.flatMap((x) => x.parole).join(' | ');
    dice(tutte.includes('collab@andryx.it'), `${dove}: nel PDF l'email non si trova come testo`);
    dice(tutte.includes('Nebbia Audio'), `${dove}: nel PDF un marchio non si trova come testo`);
    const url = pdf.disegnati.flat().map((x) => x.url);
    for (const u of ['mailto:collab@andryx.it', 'https://cal.example/andryx', 'https://nebbiaaudio.example/andryx', 'https://nebbiaaudio.example/', 'https://socialbot.live/u/andryxify']) dice(url.includes(u), `${dove}: nel PDF manca il link ${u}`);

    const iLav = await indice(p, 'lavori');
    const s = `#kit-sezioni [data-kit-sez="${iLav}"]`;
    await p.evaluate((x) => { document.querySelector(x).open = true; }, s);
    await clic(p, `${s} [data-kit-az="voce-piu"]`);
    await p.waitForTimeout(100);
    const j = await p.evaluate((x) => document.querySelectorAll(`${x} [data-kit-voce]`).length - 1, s);
    await scrivi(p, `${s} [data-kit-voce="${j}"] [data-kvv="titolo"]`, 'Video con Ghiro Gear');
    await scrivi(p, `${s} [data-kit-voce="${j}"] [data-kvv="url"]`, 'non un link');
    await pronto(p);
    const storto = await p.evaluate(({ x, j }) => {
      const el = document.querySelector(`${x} [data-kit-voce="${j}"] [data-kvv="url"]`);
      const doc = _kitDisegno(KIT_STATO.dati, KIT_STATO.bozza);
      const imp = window.SB_KIT.impagina(document.createElement('canvas').getContext('2d'), doc);
      const link = imp.pagine.some((_, n) => window.SB_KIT.disegnaPagina(document.createElement('canvas').getContext('2d'), doc, imp, n).link.some((l) => !/^(https?:\/\/|mailto:)/.test(l.url)));
      return { invalido: el.getAttribute('aria-invalid'), msg: !document.getElementById(el.id + '-e').hidden, link };
    }, { x: s, j });
    dice(storto.invalido === 'true' && storto.msg, `${dove}: un indirizzo storto non si segna nel campo`);
    dice(!storto.link, `${dove}: un indirizzo storto e' diventato un link nel kit`);
    dice((await testi(p)).some((x) => x.t.startsWith('Video con Ghiro Gear')), `${dove}: il lavoro aggiunto non compare nell'anteprima`);

    await p.evaluate((x) => { const c = document.querySelector(`${x} [data-kv="visibile"]`); c.click(); }, s);
    await pronto(p);
    dice(!(await testi(p)).some((x) => /I MIEI LAVORI|Diretta di lancio/.test(x.t)), `${dove}: «I miei lavori» nascosta si vede ancora`);
    await p.evaluate((x) => { const c = document.querySelector(`${x} [data-kv="visibile"]`); c.click(); }, s);
    for (let k = (await p.evaluate((x) => document.querySelectorAll(`${x} [data-kit-voce]`).length, s)); k > 0; k--) {
      await clic(p, `${s} [data-kit-voce="0"] [data-kit-az="voce-togli"]`);
      await p.waitForTimeout(40);
    }
    await pronto(p);
    dice(!(await testi(p)).some((x) => x.t === 'I MIEI LAVORI'), `${dove}: «I miei lavori» senza voci disegna ancora il suo titolo`);

    const iOff = await indice(p, 'offerte');
    const prima = await p.evaluate((i) => KIT_STATO.bozza.sezioni[i - 1].tipo, iOff);
    await p.evaluate((i) => { document.querySelector(`#kit-sezioni [data-kit-sez="${i}"]`).open = true; }, iOff);
    await clic(p, `#kit-sezioni [data-kit-sez="${iOff}"] [data-kit-az="sez-su"]`);
    await pronto(p);
    dice((await p.evaluate((i) => [KIT_STATO.bozza.sezioni[i - 1].tipo, KIT_STATO.bozza.sezioni[i].tipo], iOff)).join() === `offerte,${prima}`, `${dove}: «Sposta su» non ha spostato «Cosa offro»`);

    await clic(p, '[data-kit-tema="miei"]');
    await p.evaluate(() => {
      for (const [c, v] of [['fondo', '#777777'], ['testo', '#7a7a7a'], ['accento', '#787878']]) { const el = document.getElementById(`kit-c-${c}`); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await pronto(p);
    const col = await p.evaluate(() => ({ nota: document.getElementById('kit-c-nota').textContent, miei: !document.getElementById('kit-miei').hidden, c: window.SB_KIT.contrasto(_kitColori(KIT_STATO.dati, KIT_STATO.bozza).testo, '#777777') }));
    dice(col.miei, `${dove}: «I miei colori» non apre i tre colori`);
    dice(/non si leggerebbe/.test(col.nota), `${dove}: coi colori poco leggibili la nota non lo dice («${col.nota}»)`);
    dice(col.c >= 4.5, `${dove}: coi miei colori il testo resta illeggibile (contrasto ${col.c.toFixed(2)})`);
    dice((await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, `${dove}: dopo le modifiche la pagina scorre di lato`);
    await p.close();
  }
  dice(!guai.length, `la pagina ha errori: ${guai[0]}`);
} finally {
  await br.close();
  sito.chiudi();
}

if (SELFTEST) {
  const messi = difettiMessi === DIFETTI.length * SCHERMI.length;
  const visti = [
    ['i link che non arrivano al PDF', rotte.some((r) => /il PDF ha \d+ link, il disegno 0|nel PDF manca il link/.test(r))],
    ['un indirizzo storto preso per buono', rotte.some((r) => r.includes('e\' diventato un link'))],
    ['il PDF senza testo', rotte.some((r) => r.includes('non ha lo strato di testo'))],
    ['una sezione vuota che disegna il titolo', rotte.some((r) => r.includes('senza voci disegna ancora'))],
  ];
  console.log(messi ? 'Autoprova: i quattro difetti sono entrati. ✓' : `Autoprova: entrati ${difettiMessi} difetti su ${DIFETTI.length * SCHERMI.length}: il codice e' cambiato, aggiorna DIFETTI. ✗`);
  for (const [n, v] of visti) console.log(v ? `Autoprova: ${n} si vede. ✓` : `Autoprova: ${n} NON e' stato visto. ✗`);
  process.exit(messi && visti.every(([, v]) => v) ? 0 : 1);
}
console.log(rotte.length ? `\n${rotte.length} cose non tornano.` : '\nIl media kit: pagine impaginate, link e testo nel PDF, indirizzi controllati, sezioni che si nascondono e si spostano, colori leggibili, al telefono e al computer. ✓');
process.exit(rotte.length ? 1 : 0);
