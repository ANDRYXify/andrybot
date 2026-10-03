// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello del MODULO DI UN ACQUISTO (docs/NEGOZIO.md, «Il modulo»), in un
// browser vero, al telefono e al computer.
//
// Le promesse che solo un browser puo' vedere:
//  · la pagina del modulo, in una veste scura e in una chiara, non scorre di
//    lato; ogni campo ha la sua etichetta; un campo sbagliato e' segnato e la
//    sua frase d'errore e' legata a lui (aria-describedby), cosi' la legge anche
//    chi usa uno screen reader; i tasti si premono col dito (44 px);
//  · nel pannello le domande si aggiungono, si spostano e si tolgono, una
//    scelta mostra le sue voci, l'anteprima dice cosa chiede l'articolo, e dopo
//    il salvataggio le domande ci sono ancora (e nello stesso ordine);
//  · in «Da consegnare» ogni risposta ha il suo «Copia», che copia proprio lei.
//
// Uso: node scripts/verifica-modulo-negozio.mjs             (esce 1 se una promessa non tiene)
//      node scripts/verifica-modulo-negozio.mjs --selftest  (rimette tre difetti: le domande che
//                                                           non arrivano al salvataggio, l'errore
//                                                           slegato dal campo, un campo che allarga
//                                                           la pagina; li vuole tutti rossi)

import { apriSito, apriBrowser } from './_sito.mjs';
import { normCampi, htmlModulo } from '../src/features/negozio-moduli.js';
import { vesteDi } from '../src/features/linkpagina.js';

const SELFTEST = process.argv.includes('--selftest');
const SCHERMI = [[390, 844], [1280, 900]];
const DIFETTO_APP = ['campi: (_negBozza?.campi || []).map(', 'campi: [].map('];

const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); process.exit(0); }
const sito = await apriSito();
const rotte = [], guai = [];
let difettoEntrato = 0;
const dice = (ok, cosa) => { if (!ok) { console.log(`  ✗ ${cosa}`); rotte.push(cosa); } return ok; };

// ---- la pagina del modulo --------------------------------------------------
const campi = normCampi([
  { etichetta: 'Il tuo nome Discord', aiuto: 'come lo vedi nel server' },
  { etichetta: 'Rank', tipo: 'scelta', opzioni: ['Oro', 'Platino'], obbligatorio: false },
  { etichetta: 'Qualcosa da dirmi', tipo: 'lungo', obbligatorio: false },
]).campi;
const art = { nome: 'Una partita con me', descrizione: 'Giochiamo insieme su Discord dopo la diretta.', prezzo: '2.000', moneta: 'Semi' };
const guasta = (h) => (SELFTEST ? h.replace(/ aria-describedby="[^"]*"/g, '').replace('</style>', 'input{min-width:30rem}</style>') : h);

try {
  for (const [nome, template] of [['scura', 'neon'], ['chiara', 'minimal']]) {
    const veste = vesteDi({ template, tema: {} });
    const conErrori = guasta(htmlModulo({ lingua: 'it', veste, articolo: art, chi: 'Ada', dove: 'Twitch', campi, errori: { c1: 'obbligatorio' }, azione: '/m/x' }));
    const codice = guasta(htmlModulo({ lingua: 'it', veste, stato: 'codice', articolo: art, chi: 'Ada', codice: '4821', cmd: '!compra', azione: '/m/x' }));
    for (const [W, H] of SCHERMI) {
      const dove = `${W}px, veste ${nome}`;
      const p = await br.newPage({ viewport: { width: W, height: H } });
      p.on('pageerror', (e) => guai.push(e.message));
      await p.setContent(conErrori);
      const m = await p.evaluate(() => {
        const campi = [...document.querySelectorAll('input, select, textarea')];
        const sbagliato = document.querySelector('[aria-invalid="true"]');
        const legati = (sbagliato?.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)).filter(Boolean);
        const tasto = document.querySelector('button[type="submit"]').getBoundingClientRect();
        return {
          largo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          senzaEtichetta: campi.filter((c) => !document.querySelector(`label[for="${c.id}"]`)).map((c) => c.name),
          sbagliato: !!sbagliato,
          errore: legati.some((x) => x.classList.contains('errore') && x.textContent.trim()),
          tasto: Math.round(tasto.height),
          avviso: document.querySelector('[role="alert"]')?.textContent.trim() || '',
        };
      });
      dice(m.largo <= 0, `${dove}: il modulo scorre di lato di ${m.largo}px`);
      dice(!m.senzaEtichetta.length, `${dove}: campi senza etichetta: ${m.senzaEtichetta.join(', ')}`);
      dice(m.sbagliato, `${dove}: il campo che manca non e' segnato`);
      dice(m.errore, `${dove}: la frase d'errore non e' legata al suo campo`);
      dice(m.tasto >= 44, `${dove}: «Avanti» e' alto ${m.tasto}px`);
      dice(/va sistemata/.test(m.avviso), `${dove}: in cima non c'e' l'avviso che qualcosa va sistemato`);
      await p.setContent(codice);
      const c = await p.evaluate(() => ({
        largo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        riga: document.getElementById('codice')?.textContent || '',
        copia: Math.round(document.querySelector('[data-copia]')?.getBoundingClientRect().height || 0),
      }));
      dice(c.largo <= 0, `${dove}: l'ultimo passo scorre di lato di ${c.largo}px`);
      dice(c.riga === '!compra #4821', `${dove}: l'ultimo passo dice «${c.riga}»`);
      dice(c.copia >= 44, `${dove}: «Copia» e' alto ${c.copia}px`);
      await p.close();
    }
  }

  // ---- il pannello -----------------------------------------------------------
  for (const [W, H] of SCHERMI) {
    const dove = `pannello ${W}px`;
    const p = await br.newPage({ viewport: { width: W, height: H }, reducedMotion: 'reduce' });
    p.on('pageerror', (e) => guai.push(e.message));
    if (SELFTEST) {
      await p.route(/\/app\.js(\?|$)/, async (route) => {
        const r = await route.fetch();
        let t = await r.text();
        if (t.includes(DIFETTO_APP[0])) { t = t.replace(DIFETTO_APP[0], DIFETTO_APP[1]); difettoEntrato++; }
        await route.fulfill({ response: r, body: t });
      });
    }
    await p.addInitScript(() => {
      window.__copiati = [];
      try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (x) => { window.__copiati.push(x); } }, configurable: true }); } catch { /* resta quella vera */ }
    });
    await p.goto(sito.base + '/?demo=1&lang=it', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
    await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('negozio'); });
    await p.waitForSelector('#neg-lista [data-neg-modifica]', { timeout: 20000 });
    const via = () => p.evaluate(() => document.querySelectorAll('.giro-velo, .giro-carta').forEach((x) => x.remove()));
    await via();
    await p.evaluate(() => document.getElementById('neg-nuovo').click());
    await p.waitForFunction(() => !document.getElementById('neg-editor').hidden, null, { timeout: 10000 });
    await p.fill('#neg-nome', 'Torneo di prova');
    await p.click('[data-neg-campo-nuovo="discord"]');
    await p.click('[data-neg-campo-nuovo="vuoto"]');
    const fuoco = await p.evaluate(() => document.activeElement?.id || '');
    dice(fuoco === 'neg-c1-eti', `${dove}: aggiunta una domanda, il fuoco va su «${fuoco}» invece che sul suo testo`);
    await p.fill('#neg-c1-eti', 'Rank');
    await p.selectOption('#neg-c1-tipo', 'scelta');
    const voci = await p.evaluate(() => !document.querySelector('[data-neg-campo="1"] [data-nc-opzioni]').hidden);
    dice(voci, `${dove}: scelta «Una scelta fra…», le voci non compaiono`);
    await p.fill('#neg-c1-opz', 'Oro\nPlatino');
    await p.click('[data-neg-campo="1"] [data-nc-azione="su"]');
    const ordine = await p.evaluate(() => [...document.querySelectorAll('#neg-campi [data-nc="etichetta"]')].map((x) => x.value));
    dice(ordine.join('|') === 'Rank|Il tuo nome Discord', `${dove}: «Su» non sposta la domanda (${ordine.join(' | ')})`);
    const ant = await p.evaluate(() => document.getElementById('neg-anteprima')?.textContent || '');
    dice(/Ti chiede: Rank, Il tuo nome Discord/.test(ant), `${dove}: l'anteprima non dice cosa chiede l'articolo`);
    for (let i = 0; i < 3; i++) await p.click('[data-neg-campo-nuovo="vuoto"]');
    const pieno = await p.evaluate(() => ({ n: document.querySelectorAll('#neg-campi [data-neg-campo]').length, spenti: [...document.querySelectorAll('#neg-campi-aggiungi button')].every((b) => b.disabled) }));
    dice(pieno.n === 5 && pieno.spenti, `${dove}: a cinque domande si puo' ancora aggiungere (${pieno.n})`);
    for (let i = 0; i < 3; i++) await p.click('[data-neg-campo="2"] [data-nc-azione="togli"]');
    const larghezza = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    dice(larghezza <= 0, `${dove}: con l'editor aperto la pagina scorre di lato di ${larghezza}px`);
    await p.click('#neg-salva');
    await p.waitForFunction(() => document.getElementById('neg-editor').hidden, null, { timeout: 10000 }).catch(() => null);
    const id = await p.evaluate(() => [...document.querySelectorAll('#neg-lista [data-neg-modifica]')].map((b) => b.dataset.negModifica).sort((a, b) => b - a)[0]);
    await p.evaluate((x) => document.querySelector(`[data-neg-modifica="${x}"]`).click(), id);
    await p.waitForFunction(() => !document.getElementById('neg-editor').hidden, null, { timeout: 10000 });
    const riaperto = await p.evaluate(() => [...document.querySelectorAll('#neg-campi [data-neg-campo]')].map((f) => ({ e: f.querySelector('[data-nc="etichetta"]').value, t: f.querySelector('[data-nc="tipo"]').value, o: f.querySelector('[data-nc="opzioni"]').value })));
    dice(riaperto.length === 2 && riaperto[0].e === 'Rank' && riaperto[0].t === 'scelta' && riaperto[0].o === 'Oro\nPlatino' && riaperto[1].e === 'Il tuo nome Discord',
      `${dove}: riaperto dopo il salvataggio, le domande sono ${JSON.stringify(riaperto)}`);
    await p.click('#neg-annulla');

    await p.evaluate(() => document.querySelector('#sotto-negozio [data-sotto="consegnare"]').click());
    await p.waitForTimeout(300);
    await via();
    const coda = await p.evaluate(() => {
      const riga = [...document.querySelectorAll('#neg-coda li')].find((li) => li.textContent.includes('pixelmatto_88'));
      const b = riga?.querySelector('[data-neg-copia="pixelmatto_88"]');
      b?.click();
      return { riga: !!riga, tasto: !!b, alto: Math.round(b?.getBoundingClientRect().height || 0), largo: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    await p.waitForTimeout(150);
    const copiato = await p.evaluate(() => window.__copiati.at(-1) || '');
    dice(coda.riga && coda.tasto, `${dove}: in «Da consegnare» la risposta non ha il suo «Copia»`);
    dice(copiato === 'pixelmatto_88', `${dove}: «Copia» copia «${copiato}»`);
    dice(coda.largo <= 0, `${dove}: «Da consegnare» scorre di lato di ${coda.largo}px`);
    await p.close();
  }
  dice(!guai.length, `errori di pagina: ${guai[0]}`);
} finally {
  await br.close();
  sito.chiudi();
}

if (SELFTEST) {
  const salvate = rotte.some((r) => r.includes('riaperto dopo il salvataggio'));
  const slegato = rotte.some((r) => r.includes('non e\' legata al suo campo'));
  const largo = rotte.some((r) => r.includes('il modulo scorre di lato'));
  const entrato = difettoEntrato === SCHERMI.length;
  console.log(entrato ? 'Autoprova: il difetto e\' entrato nel pannello. ✓' : 'Autoprova: il difetto NON e\' entrato nel pannello: e\' cambiato, aggiorna DIFETTO_APP. ✗');
  console.log(salvate ? 'Autoprova: le domande perse al salvataggio si vedono. ✓' : 'Autoprova: le domande perse NON sono state viste. ✗');
  console.log(slegato ? 'Autoprova: l\'errore slegato dal campo si vede. ✓' : 'Autoprova: l\'errore slegato NON e\' stato visto. ✗');
  console.log(largo ? 'Autoprova: il campo che allarga la pagina si vede. ✓' : 'Autoprova: il campo largo NON e\' stato visto. ✗');
  process.exit(entrato && salvate && slegato && largo ? 0 : 1);
}
console.log(rotte.length ? `\n${rotte.length} cose non tornano.` : '\nIl modulo si compila e si legge al telefono e al computer, e nel pannello le domande restano quelle scritte. ✓');
process.exit(rotte.length ? 1 : 0);
