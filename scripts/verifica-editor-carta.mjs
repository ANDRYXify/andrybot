// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello dell'EDITOR DELLA CARTA: ogni gesto fa quello che dice, e quello che
// si vede e' quello che il server disegna (docs/CARTA-LIVE.md).
//
// Perche' esiste. «Sembra che non funzioni e non mi fa personalizzare niente in
// modo comodo»: l'editor dell'anteprima del link tagliava il nome a sedici
// segni («Il negozio di a…»), lasciava un buco dove la riga era vuota, si
// spostava solo coi cursori e disegnava Archivo piu' sottile del server (il
// browser lo prendeva a peso 400, il server al suo peso di partenza, 600). Nessun
// errore, nessun collaudo rosso: ogni pezzo funzionava, l'insieme no.
//
// Qui si apre l'editor vero, con la carta vera del negozio e i suoi dati, e
// si fa ogni gesto guardando il risultato:
//  · LE LETTERE: ogni carattere, dichiarato dall'editor, e' largo come dice la
//    tabella (quella dei file, la stessa del server), entro il 3%;
//  · nessun testo esce dalla carta;
//  · trascinare sposta, la maniglia di destra cambia la larghezza di un testo,
//    l'angolo cambia il diametro della faccia;
//  · il doppio clic su un testo porta a scriverlo;
//  · i segnaposto dicono cosa diventano;
//  · un testo che i dati lasciano vuoto si vede in trasparenza e si prende;
//  · una veste cambia la carta, Annulla la riporta, Salva la consegna.
//
// Uso: node scripts/verifica-editor-carta.mjs             (esce 1 se un gesto non fa quello che dice)
//      node scripts/verifica-editor-carta.mjs --selftest  (rimette il peso sbagliato e blocca le maniglie, e li vuole rossi)

import { apriSito, apriBrowser } from './_sito.mjs';

const SELFTEST = process.argv.includes('--selftest');
const cartaLive = await import('../src/features/cartalive.js');

const dati = { nome: 'andryxify', titolo: 'Cosa si compra in chat, e quanto costa', gioco: '', spettatori: '', login: 'andryxify',
  link: 'negozio.socialbot.live/andryxify', piattaforma: 'twitch', avatar: '', accento: '#C2185B', ts: 1 };
const stato = {
  quale: 'negozio', mia: false, dati, disegnabile: true,
  carta: cartaLive.cartaPaginaDi({ quale: 'negozio', accento: dati.accento, lingua: 'it' }),
  vocabolario: { tipi: cartaLive.TIPI, forme: cartaLive.FORME_AVATAR, fondi: cartaLive.FONDI, segnaposto: cartaLive.SEGNAPOSTO,
    caratteri: cartaLive.CARATTERI.map(([n]) => n), misura: cartaLive.MISURA_PAGINA, massimo: cartaLive.MAX_ELEMENTI,
    temi: cartaLive.vestiPagina({ quale: 'negozio', accento: dati.accento }) },
};
const FRASI = ['negozio.socialbot.live/andryxify', 'Cosa si compra in chat, e quanto costa', 'iiiiiiiiiiii lll', 'ANDRYXIFY'];
const misure = Object.fromEntries(cartaLive.CARATTERI.map(([n]) => [n, FRASI.map((t) => cartaLive.larghezzaTesto(t, n, 100, 0) / 1.02)]));

const sito = await apriSito({});
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
const rotte = [], guai = [];
const dice = (ok, cosa) => { console.log(`  ${ok ? '✓' : '✗'} ${cosa}`); if (!ok) rotte.push(cosa); };
try {
  const p = await br.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', (e) => guai.push(e.message));
  await p.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.SB_APP && document.querySelector('.pannello-scheda.visibile'), null, { timeout: 20000 });
  await p.addStyleTag({ content: '#cookie-banner,.giro-velo,.giro-fumetto,.giro-carta{display:none!important}' });
  await p.evaluate(async (stato) => {
    window.__salvate = [];
    const mod = await import('/carta-editor.js');
    mod.apri({ ...stato, titolo: 'Editor' }, { salva: async (c) => { window.__salvate.push(c); }, aggiorna: () => {} });
  }, stato);
  if (SELFTEST) {
    await p.addStyleTag({ content: '@font-face{font-family:"carta-archivo";src:url("/font/Archivo-Variable.ttf") format("truetype");font-weight:400;font-style:normal}.ce-maniglia{pointer-events:none!important}' });
  }
  await p.waitForFunction(() => document.querySelector('[data-disegno] svg'), null, { timeout: 10000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);

  // LE LETTERE: il browser, coi caratteri come li dichiara l'editor, contro la tabella
  const larghe = await p.evaluate(({ frasi, nomi }) => {
    const ns = 'http://www.w3.org/2000/svg', out = {};
    for (const nome of nomi) {
      out[nome] = frasi.map((t) => {
        const s = document.createElementNS(ns, 'svg'); s.setAttribute('width', 3000); s.setAttribute('height', 200);
        const tx = document.createElementNS(ns, 'text'); tx.setAttribute('font-family', 'carta-' + nome.toLowerCase().replace(/\s+/g, '-')); tx.setAttribute('font-size', 100); tx.textContent = t;
        s.appendChild(tx); document.body.appendChild(s); const w = tx.getComputedTextLength(); s.remove(); return w;
      });
    }
    return out;
  }, { frasi: FRASI, nomi: Object.keys(misure) });
  for (const [nome, ws] of Object.entries(larghe)) {
    const scarti = ws.map((w, i) => w / misure[nome][i] - 1);
    const peggio = scarti.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
    dice(Math.abs(peggio) <= 0.03, `${nome}: il browser lo disegna largo come il server (scarto ${(peggio * 100).toFixed(1)}%)`);
  }

  const W = stato.carta.larghezza;
  const fuori = await p.evaluate((W) => [...document.querySelectorAll('[data-disegno] g[data-el]')].filter((g) => { const b = g.getBBox(); return g.querySelector('text') && b.x + b.width > W + 1; }).map((g) => g.dataset.el), W);
  dice(!fuori.length, `nessun testo esce dalla carta${fuori.length ? ' (' + fuori.join(', ') + ')' : ''}`);

  const centro = (sel) => p.evaluate((sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
  const campo = (k) => p.evaluate((k) => Number(document.querySelector(`.ce-velo input[data-k="${k}"][type=number]`)?.value), k);
  const scala = await p.evaluate((W) => document.querySelector('[data-foglio]').getBoundingClientRect().width / W, W);
  const tira = async (da, dx, dy) => { await p.mouse.move(da.x, da.y); await p.mouse.down(); await p.mouse.move(da.x + dx, da.y + dy, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(150); };

  // trascinare sposta
  await tira(await centro('g[data-el="nome"]'), 60, 0);
  dice(Math.abs((await campo('x')) - (520 + 60 / scala)) <= 3, 'trascinare il nome lo sposta di quanto si muove il mouse');
  // la maniglia di destra cambia la larghezza
  await p.click('.ce-velo [data-voce="titolo"]');
  const l0 = await campo('larghezza');
  await tira(await centro('.ce-maniglia[data-m="larga"]'), -100, 0);
  const l1 = await campo('larghezza');
  dice(Math.abs(l1 - (l0 - 100 / scala)) <= 3, `la maniglia di destra stringe il titolo (${l0} → ${l1})`);
  // l'angolo cambia il diametro della faccia
  await p.click('.ce-velo [data-voce="avatar"]');
  const d0 = await campo('d');
  await tira(await centro('.ce-maniglia[data-m="angolo"]'), -30, -30);
  dice((await campo('d')) < d0 - 30, 'l\'angolo rimpicciolisce la faccia');
  // il doppio clic porta a scrivere
  await p.click('.ce-velo [data-voce="indirizzo"]');
  const gi = await centro('g[data-el="indirizzo"]');
  await p.mouse.dblclick(gi.x, gi.y);
  await p.waitForTimeout(150);
  dice(await p.evaluate(() => document.activeElement?.id === 'ce-c-testo'), 'il doppio clic su un testo porta a scriverlo');
  dice(await p.evaluate((n) => [...document.querySelectorAll('.ce-velo .ce-segna')].some((b) => b.textContent.includes('{nome}') && b.textContent.includes(n)), dati.nome), 'i segnaposto dicono cosa diventano');
  // un testo vuoto si vede e si prende
  await p.click('.ce-velo [data-nuovo="testo"]');
  await p.fill('.ce-velo input[data-k="testo"]', '{gioco}');
  await p.waitForTimeout(150);
  const vuoto = await p.evaluate(() => { const g = document.querySelector('.ce-velo [data-voce].scelta')?.dataset.voce; const el = g && document.querySelector(`[data-disegno] g[data-el="${g}"]`); return el ? { w: el.getBBox().width, op: el.querySelector('text')?.getAttribute('fill-opacity') } : null; });
  dice(!!vuoto && vuoto.w > 0 && vuoto.op === '.3', 'un testo vuoto si vede in trasparenza, e si prende');
  // una veste, Annulla, Salva
  const prima = await p.evaluate(() => [...document.querySelectorAll('.ce-velo .ce-voce-nome')].map((v) => v.textContent).join(','));
  await p.click('.ce-velo [data-ce-veste="1"]');
  await p.waitForTimeout(150);
  const vestita = await p.evaluate(() => [...document.querySelectorAll('.ce-velo .ce-voce-nome')].map((v) => v.textContent).join(','));
  dice(vestita.includes('striscia') && vestita !== prima, 'una veste cambia la carta');
  await p.click('.ce-velo [data-fa="annulla"]');
  await p.waitForTimeout(150);
  dice(await p.evaluate(() => [...document.querySelectorAll('.ce-velo .ce-voce-nome')].map((v) => v.textContent).join(',')) === prima, 'Annulla la riporta com\'era');
  await p.click('.ce-velo [data-fa="salva"]');
  await p.waitForTimeout(300);
  dice(await p.evaluate(() => window.__salvate.length === 1 && !document.querySelector('.ce-velo')), 'Salva la consegna e chiude');
  dice(!guai.length, `la pagina non ha errori${guai.length ? ': ' + guai[0] : ''}`);
} finally {
  await br.close();
  sito.chiudi();
}
if (SELFTEST) {
  const peso = rotte.some((r) => r.startsWith('Archivo:'));
  const maniglie = rotte.some((r) => r.includes('maniglia di destra'));
  console.log(peso ? 'Autoprova: Archivo al peso sbagliato si vede. ✓' : 'Autoprova: Archivo al peso sbagliato NON e\' stato visto. ✗');
  console.log(maniglie ? 'Autoprova: le maniglie bloccate si vedono. ✓' : 'Autoprova: le maniglie bloccate NON sono state viste. ✗');
  process.exit(peso && maniglie ? 0 : 1);
}
console.log(rotte.length ? `\n${rotte.length} gesti non fanno quello che dicono.` : '\nOgni gesto dell\'editor fa quello che dice, e la carta e\' quella del server. ✓');
process.exit(rotte.length ? 1 : 0);
