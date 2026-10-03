// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello di «CHI ARRIVA IN CHAT» nel pannello (docs/moduli.md), in un browser
// vero, al computer e al telefono, sulla demo.
//
// Le promesse che solo il pannello acceso puo' mostrare:
//  · la sotto-scheda elenca le accoglienze, per chi e quante volte;
//  · un modello apre l'editor gia' sull'arrivo, con «Per chi» aperto;
//  · una persona si aggiunge col suo nome (Invio o «Aggiungi»), un nome storto
//    si dice e non entra, un doppione nemmeno, e si toglie con la ×;
//  · «Avvia un gioco» offre «uno a caso» e i giochi del canale;
//  · salvata, l'accoglienza e' nell'elenco con la persona scelta, e la sua
//    prova e' «come se arrivasse» quella persona;
//  · l'editor reagisce in tutti i riquadri: nei Giochi aggiungere un'azione e
//    cambiare innesco funzionano (prima non funzionavano: gli ascolti stavano
//    solo sul riquadro dei Comandi);
//  · niente scorre di lato, nessun errore.
//
// Uso: node scripts/verifica-arrivi.mjs             (esce 1 se una promessa non tiene)
//      node scripts/verifica-arrivi.mjs --selftest  (rimette tre difetti, uno alla volta: gli
//                                                    ascolti su un riquadro solo, il nome storto che
//                                                    entra, «Per chi» perso al salvataggio; ognuno
//                                                    deve far scattare il suo controllo)

import { apriSito, apriBrowser } from './_sito.mjs';

const SELFTEST = process.argv.includes('--selftest');
const SCHERMI = [[1440, 950], [390, 844]];
// Ogni difetto si rimette DA SOLO, in un giro suo, e deve far scattare il SUO
// controllo: messi insieme, il primo (l'editor che non reagisce) coprirebbe gli
// altri due, e l'autoprova direbbe «visto» per il motivo sbagliato.
const DIFETTI = [
  { nome: 'gli ascolti su un riquadro solo', da: "for (const id of ['editor-modulo', 'editor-gioco', 'editor-arrivo']) collegaEditor(document.getElementById(id));", a: "for (const id of ['editor-modulo']) collegaEditor(document.getElementById(id));", visto: 'l\'editor nei Giochi non reagisce' },
  { nome: 'il nome storto che entra', da: '  if (!RE_NOME_CHAT.test(login)) {', a: '  if (false) {', visto: 'un nome storto non si dice' },
  { nome: '«Per chi» perso al salvataggio', da: '  if (chi) condizioni.chi = chi;', a: '', visto: 'non e\' nell\'elenco con la persona scelta' },
];

const sito = await apriSito();
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }
async function giro([W, H], difetto = null) {
  const rotte = [], guai = [];
  const dice = (ok, cosa) => { if (!ok) { if (!difetto) console.log(`  ✗ ${cosa}`); rotte.push(cosa); } return ok; };
  let entrato = false;
  {
    const dove = `${W}px`;
    const p = await br.newPage({ viewport: { width: W, height: H }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    p.on('pageerror', (e) => guai.push(e.message));
    p.on('dialog', (d) => d.dismiss().catch(() => {}));
    if (difetto) {
      await p.route(/\/app\.js(\?|$)/, async (route) => {
        const r = await route.fetch();
        let t = await r.text();
        if (t.includes(difetto.da)) { t = t.replace(difetto.da, difetto.a); entrato = true; }
        await route.fulfill({ response: r, body: t });
      });
    }
    await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); localStorage.setItem('sotto:moduli', 'arrivi'); } catch { /* niente */ } });
    await p.goto(`http://127.0.0.1:${sito.porta}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
    await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('moduli'); });
    await p.waitForSelector('#lista-arrivi .modulo', { timeout: 20000 });

    // l'elenco
    const elenco = await p.evaluate(() => [...document.querySelectorAll('#lista-arrivi .modulo')].map((x) => x.innerText.replace(/\s+/g, ' ')));
    dice(elenco.length === 2 && /solo per LucaPlays/.test(elenco[0]) && /12 accoglienze fatte/.test(elenco[0]) && /solo per VIP/.test(elenco[1]), `${dove}: l'elenco delle accoglienze non dice per chi e quante volte (${elenco.join(' / ').slice(0, 160)})`);
    dice(await p.evaluate(() => /arrivasse LucaPlays/.test(document.querySelector('#lista-arrivi [data-prova-persona]')?.textContent || '')
      && JSON.parse(document.querySelector('#lista-arrivi [data-prova-persona]').dataset.provaPersona).login === 'lucaplays'), `${dove}: la prova non e' «come se arrivasse» la persona scelta`);

    // un modello
    await p.click('[data-modello-arrivo="caloroso"]');
    await p.waitForSelector('#editor-arrivo #mod-chi-nome', { timeout: 10000 });
    const aperto = await p.evaluate(() => ({ tipo: document.querySelector('#editor-arrivo [data-trigger-tipo]')?.value, chi: document.querySelector('#editor-arrivo .blocco-chi')?.open }));
    dice(aperto.tipo === 'arrivo' && aperto.chi === true, `${dove}: il modello non apre l'editor sull'arrivo con «Per chi» aperto (${JSON.stringify(aperto)})`);

    // le persone
    const chip = () => p.evaluate(() => [...document.querySelectorAll('#mod-chi-persone .chip-persona:not(.esce)')].map((x) => x.dataset.login));
    await p.fill('#mod-chi-nome', '@Giada_TTV');
    await p.keyboard.press('Enter');
    await p.fill('#mod-chi-nome', 'non va bene!');
    await p.click('#editor-arrivo [data-aggiungi-persona]');
    const errore = await p.evaluate(() => document.getElementById('mod-chi-errore')?.textContent || '');
    dice(JSON.stringify(await chip()) === '["giada_ttv"]', `${dove}: le persone non sono quelle scritte (${JSON.stringify(await chip())})`);
    dice(/non è un nome della chat/.test(errore), `${dove}: un nome storto non si dice`);
    await p.fill('#mod-chi-nome', 'giada_ttv');
    await p.click('#editor-arrivo [data-aggiungi-persona]');
    dice((await chip()).length === 1, `${dove}: un doppione e' entrato`);
    await p.fill('#mod-chi-nome', 'pixelmarta');
    await p.keyboard.press('Enter');
    await p.evaluate(() => document.querySelector('#mod-chi-persone .chip-persona[data-login="pixelmarta"] [data-togli-persona]')?.click());
    await p.waitForTimeout(700);
    dice(JSON.stringify(await chip()) === '["giada_ttv"]', `${dove}: la × non toglie la persona (${JSON.stringify(await chip())})`);

    // avvia un gioco
    await p.click('#editor-arrivo [data-aggiungi-azione]');
    await p.evaluate(() => { const s = [...document.querySelectorAll('#editor-arrivo [data-azione-tipo]')].at(-1); s.value = 'gioco'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await p.waitForTimeout(200);
    const giochi = await p.evaluate(() => [...(document.querySelectorAll('#editor-arrivo [data-campo="gioco"]')[0]?.options || [])].map((o) => o.value));
    dice(giochi[0] === 'caso' && giochi.includes('trivia') && giochi.includes('boss'), `${dove}: «Avvia un gioco» non offre uno a caso e i giochi (${giochi.join(',')})`);
    const largo = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    dice(largo <= 0, `${dove}: la pagina scorre di lato di ${largo}px`);

    // salva: nell'elenco con la persona
    await p.click('#editor-arrivo [data-salva="modulo"]');
    await p.waitForTimeout(900);
    const dopo = await p.evaluate(() => [...document.querySelectorAll('#lista-arrivi .modulo')].map((x) => x.innerText.replace(/\s+/g, ' ')));
    dice(dopo.length === 3 && /Saluto caloroso/.test(dopo[2]) && /solo per Giada_TTV/.test(dopo[2]), `${dove}: salvata, l'accoglienza non e' nell'elenco con la persona scelta (${(dopo[2] || '').slice(0, 120)})`);

    // l'editor nei Giochi reagisce
    await p.evaluate(() => window.SB_APP.vai('giochi'));
    await p.waitForTimeout(700);
    const g = await p.evaluate(async () => {
      const aspetta = (ms) => new Promise((ok) => setTimeout(ok, ms));
      document.querySelector('[data-ricetta="slot"]')?.click();
      await aspetta(400);
      const prima = document.querySelectorAll('#editor-gioco .azione-riga').length;
      document.querySelector('#editor-gioco [data-aggiungi-azione]')?.click();
      await aspetta(150);
      const tipo = document.querySelector('#editor-gioco [data-trigger-tipo]');
      if (tipo) { tipo.value = 'parola'; tipo.dispatchEvent(new Event('change', { bubbles: true })); }
      await aspetta(150);
      return { prima, dopo: document.querySelectorAll('#editor-gioco .azione-riga').length, parola: !!document.querySelector('#editor-gioco #lista-frasi-trigger') };
    });
    dice(g.prima > 0 && g.dopo === g.prima + 1 && g.parola, `${dove}: l'editor nei Giochi non reagisce (${JSON.stringify(g)})`);
    await p.close();
  }
  if (!difetto) dice(!guai.length, `la pagina ha errori: ${guai[0]}`);
  return { rotte, entrato };
}

let esito = 0;
try {
  if (SELFTEST) {
    for (const d of DIFETTI) {
      const r = await giro(SCHERMI[0], d);
      const visto = r.rotte.some((x) => x.includes(d.visto));
      if (!r.entrato) console.log(`Autoprova: ${d.nome}: il difetto non e' entrato, il codice e' cambiato: aggiorna DIFETTI. ✗`);
      else console.log(visto ? `Autoprova: ${d.nome} si vede. ✓` : `Autoprova: ${d.nome} NON e' stato visto (${r.rotte.join(' | ').slice(0, 160)}). ✗`);
      if (!r.entrato || !visto) esito = 1;
    }
  } else {
    let tutte = [];
    for (const sc of SCHERMI) tutte = tutte.concat((await giro(sc)).rotte);
    console.log(tutte.length ? `\n${tutte.length} cose non tornano.` : '\nChi arriva in chat: l\'elenco, i modelli, le persone, i giochi, il salvataggio e l\'editor in ogni riquadro, al telefono e al computer. ✓');
    esito = tutte.length ? 1 : 0;
  }
} finally {
  await br.close();
  sito.chiudi();
}
process.exit(esito);
