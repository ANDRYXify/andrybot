// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ASPETTO SU MISURA, PROVATO COI GESTI (docs/ASPETTO.md).
//
// La funzione pura la prova il contratto (test/contratto/aspetto.test.mjs). Qui
// si apre il pannello e si fa quello che fa una persona: una veste pronta, un
// colore, il carattere, la grandezza, il proprio CSS, il ritorno alla veste di
// serie. E si guarda quello che il browser ha dipinto davvero, non le scelte.
//
// LE PROMESSE:
//   · senza scelte la radice e' pulita: nessuna variabile scritta, nessun
//     foglio in piu';
//   · il tasto nel piede del menu porta alla carta;
//   · ogni veste pronta si dipinge e si legge: pagina, carta, testo e tasto
//     pieno misurati sui colori veri; il tema dipinto segue il colore;
//   · un colore scelto apposta per non leggersi si ritocca, e la carta lo dice;
//   · ogni manopola muove davvero qualcosa sullo schermo, e «di serie» lo
//     rimette com'era;
//   · ogni tema ha la sua veste: il tasto in alto passa dall'una all'altra;
//   · il CSS della persona arriva per ultimo, e `url(` non arriva: nessuna
//     chiamata parte verso un altro sito;
//   · una veste incollata si indossa;
//   · «Rimetti l'aspetto di serie» ripulisce la radice;
//   · `tema.js` veste il primo disegno, prima che arrivi il resto;
//   · con `?aspetto=serie` si entra con la veste di fabbrica, e la carta lo dice;
//   · la demo si apre con la veste di serie anche su un dispositivo che ne ha
//     una, e non la tocca;
//   · a 130 % nessuna pagina e' piu' larga dello schermo, ne' sul telefono ne'
//     sul computer.
//
// Uso: node scripts/verifica-aspetto.mjs [--foto <cartella>]
//      --selftest serve i file rotti in undici modi e pretende undici rossi.
import './_dati-usa-e-getta.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apriSito, apriBrowser } from './_sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(RAD, 'src/web/public');
const SELFTEST = process.argv.includes('--selftest');
const iFoto = process.argv.indexOf('--foto');
const FOTO = iFoto > 0 ? process.argv[iFoto + 1] : '';

// Le rotture: [nome, file, testo da togliere, testo al suo posto]. Ognuna
// toglie una promessa sola, e il giro deve accorgersene.
const ROTTURE = [
  ['il testo non si ritocca', 'aspetto.js', 'const testo = leggibile(P.testo, fondi, SOGLIE.testo);', 'const testo = P.testo;'],
  ['il tema dipinto resta quello del posto', 'aspetto.js', "tema: (c ? c.scuro : dove === 'scuro') ? 'dark' : 'light',", "tema: dove === 'scuro' ? 'dark' : 'light',"],
  ['gli angoli sono una manopola finta', 'aspetto.js', "vivi: { '--r-xs': '0px', '--r-s': '0px', '--r-m': '0px', '--r-l': '0px', '--ang-mano': '0px', '--ang-mano-l': '0px' },", 'vivi: {},'],
  ['la grandezza non muove la radice', 'aspetto.js', "el.style.fontSize = v.grandezza === GRANDEZZA.serie ? '' : v.grandezza + '%';", "el.style.fontSize = '';"],
  ['il CSS lascia passare url(', 'aspetto.js', '/@import|url\\s*\\(|image-set', '/@import|image-set'],
  ['il CSS della persona non arriva', 'aspetto.js', "scriviCss(o.css ? pulisci(scelte).css : '');", "scriviCss('');"],
  ['il ritorno di serie non toglie niente', 'app.js', "_aspCarta.chiedi = false; _aspCarta.tolto = false;\n    aspettoCambia((s) => { for (const k of Object.keys(s)) delete s[k]; });", '_aspCarta.chiedi = false; _aspCarta.tolto = false;\n    aspettoCambia(() => {});'],
  ['il primo disegno resta di fabbrica', 'tema.js', 'if (!v || !v.vars) return;', 'return;'],
  ['l\'uscita di sicurezza non vale al primo disegno', 'tema.js', '(aspetto=serie|demo=1)', '(demo=1)'],
  ['la demo prende la veste di chi la guarda', 'tema.js', '(aspetto=serie|demo=1)', '(aspetto=serie)'],
  ['l\'uscita di sicurezza non vale nel pannello', 'app.js', 'SB_ASPETTO.dipingi(ASPETTO_FUGA ? {} : scelte,', 'SB_ASPETTO.dipingi(scelte,'],
];

const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); process.exit(0); }

async function giro(rottura, dice) {
  const guai = [];
  const chiedi = (ok, t) => { if (!ok) guai.push(t); dice(!!ok, t); };
  let rotto = null;
  if (rottura) {
    const sorgente = readFileSync(join(PUB, rottura[1]), 'utf8');
    if (!sorgente.includes(rottura[2])) { guai.push('la rottura non trova piu\' il suo testo'); return guai; }
    rotto = { via: '/' + rottura[1], testo: sorgente.replace(rottura[2], rottura[3]) };
  }
  const sito = await apriSito({ rotte: (req, res, q) => {
    if (!rotto || q !== rotto.via) return false;
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }); res.end(rotto.testo); return true;
  } });
  const fuori = [];
  const apri = async (vista, { indirizzo = '/?demo=1&lang=it', prima = null, tema = 'light' } = {}) => {
    const ctx = await br.newContext({ viewport: vista, reducedMotion: 'reduce', colorScheme: tema });
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => guai.push('pageerror: ' + e.message));
    pg.on('request', (r) => { if (r.url().includes('altrove.example')) fuori.push(r.url()); });
    if (prima) await pg.addInitScript(prima.fn, prima.dato);
    await pg.goto(sito.base + indirizzo, { waitUntil: 'networkidle' });
    await pg.click('#cookie-ok').catch(() => {});
    await pg.addStyleTag({ content: '.giro-velo,.giro-fumetto,.giro-carta,#cookie-banner{display:none!important}' });
    return pg;
  };
  const foto = async (pg, nome) => { if (FOTO && !rottura) { await pg.mouse.move(2, 2); await pg.waitForTimeout(350); await pg.screenshot({ path: join(FOTO, nome + '.png') }); } };
  const carta = async (pg) => {
    await pg.evaluate(() => window.SB_APP.vai('account'));
    await pg.waitForSelector('#aspetto-misura .as-preset', { state: 'attached', timeout: 8000 });
    await pg.evaluate(() => { const c = document.getElementById('carta-aspetto'); c.classList.remove('chiusa'); c.scrollIntoView({ block: 'start' }); });
    await pg.waitForSelector('#aspetto-misura .as-preset', { state: 'visible', timeout: 8000 });
  };
  // Quello che il browser ha dipinto: la radice, e i colori veri di pagina,
  // carta, testo e tasto pieno, coi contrasti misurati sul posto.
  // I colori cambiano con una transizione breve: si misura quando hanno
  // smesso di muoversi, non a meta' strada. E col mouse fuori dalla carta: una
  // carta sotto il mouse diventa un velo sulla pagina (anime.css), che e' un
  // altro colore e non quello che si sta misurando.
  const dipinto = async (pg) => { await pg.mouse.move(2, 2); return pg.evaluate(async () => {
    const A = window.SB_ASPETTO, el = document.documentElement, st = (x) => getComputedStyle(x);
    const segno = () => ['#anime-sfondo', '#carta-aspetto', '#as-copia', '#aspetto-misura .as-temi .btn[aria-pressed="true"]'].map((q) => { const e = document.querySelector(q); return e ? st(e).backgroundColor + st(e).color + st(e).boxShadow + st(e).borderRadius : ''; }).join('|');
    await new Promise((ok) => { let prima = '', uguali = 0, giri = 0; const t = setInterval(() => { const ora = segno(); uguali = ora === prima ? uguali + 1 : 0; prima = ora; if (uguali >= 4 || ++giri > 60) { clearInterval(t); ok(); } }, 50); });
    const esa = (c) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c); return m && (m[4] === undefined || Number(m[4]) === 1) ? '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('') : ''; };
    const c = document.getElementById('carta-aspetto'), pieno = document.querySelector('#aspetto-misura .as-temi .btn[aria-pressed="true"]');
    const h2 = c.querySelector('h2'), intro = c.querySelector('.carta-corpo-in > p:first-child'), tasto = document.getElementById('as-copia');
    const pagina = esa(st(document.getElementById('anime-sfondo')).backgroundColor), foglio = esa(st(c).backgroundColor), testo = esa(st(c).color);
    const pienoFondo = esa(st(pieno).backgroundColor), pienoTesto = esa(st(pieno).color);
    return {
      scritte: A.NOMI.filter((n) => el.style.getPropertyValue(n) !== ''),
      tema: el.getAttribute('data-theme'), veste: el.getAttribute('data-veste'), radice: el.style.fontSize,
      css: [...document.adoptedStyleSheets].map((f) => [...f.cssRules].map((r) => r.cssText).join(' ')).join(' ') + (document.getElementById('aspetto-css')?.textContent || ''),
      bg: el.style.getPropertyValue('--bg'), pagina, foglio, testo, pienoFondo, pienoTesto,
      scuro: pagina ? A.luce(pagina) < 0.18 : null,
      cTesto: pagina && foglio && testo ? Math.min(A.contrasto(testo, foglio), A.contrasto(esa(st(document.body).color), pagina)) : 0,
      cPieno: pienoFondo && pienoTesto ? A.contrasto(pienoTesto, pienoFondo) : 0,
      impronta: {
        carattere: st(document.body).fontFamily, titoli: st(h2).fontFamily, grandezza: st(el).fontSize,
        angoli: st(tasto).borderRadius + '|' + st(c).borderRadius, tratto: st(tasto).borderTopWidth + '|' + st(c).borderTopWidth,
        ombre: st(tasto).boxShadow + '|' + st(c).boxShadow, trama: st(intro).backgroundImage, puntatore: st(document.body).cursor,
        moto: String(document.body.classList.contains('leggero')),
      },
    };
  }); };
  const scegli = async (pg, id, valore) => { await pg.selectOption('#' + id, valore); await pg.waitForTimeout(60); };
  const larga = (pg) => pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  try {
    const pg = await apri({ width: 1366, height: 900 });
    await pg.waitForSelector('#menu-aspetto', { state: 'visible', timeout: 8000 });
    const nuda = await pg.evaluate(() => ({ scritte: window.SB_ASPETTO.NOMI.filter((n) => document.documentElement.style.getPropertyValue(n) !== ''), veste: document.documentElement.getAttribute('data-veste'), fogli: [...document.adoptedStyleSheets].reduce((n, f) => n + f.cssRules.length, 0), radice: document.documentElement.style.fontSize, tema: document.documentElement.getAttribute('data-theme') }));
    chiedi(nuda.scritte.length === 0 && nuda.veste === null && nuda.fogli === 0 && nuda.radice === '' && nuda.tema === 'light', `senza scelte la radice e' pulita (${JSON.stringify(nuda).slice(0, 110)})`);
    await pg.click('#menu-aspetto');
    await pg.waitForSelector('#aspetto-misura .as-preset', { state: 'visible', timeout: 8000 }).catch(() => {});
    chiedi(await pg.evaluate(() => window.SB_APP.schedaAttiva === 'account' && !!document.querySelector('#aspetto-misura .as-preset')), 'il tasto nel piede del menu porta alla carta «Aspetto su misura»');
    await carta(pg);
    const serie = await dipinto(pg);
    chiedi(serie.cTesto >= 4.5 && serie.cPieno >= 4.5, `la veste di serie si legge (testo ${serie.cTesto.toFixed(1)}, tasto pieno ${serie.cPieno.toFixed(1)})`);
    await foto(pg, 'serie');

    // Le vesti pronte, una per una, nel tema chiaro.
    const preset = await pg.evaluate(() => Object.keys(window.SB_ASPETTO.PRESET));
    const male = [];
    for (const p of preset) {
      await pg.click(`[data-as-preset="${p}"]`);
      const d = await dipinto(pg);
      const attesa = await pg.evaluate((x) => window.SB_ASPETTO.veste({ chiaro: { preset: x } }, 'chiaro'), p);
      if (d.bg !== attesa.vars['--bg'] || d.pagina !== attesa.vars['--bg'] || d.foglio !== attesa.vars['--surface']) male.push(`${p}: dipinto ${d.pagina}/${d.foglio}, atteso ${attesa.vars['--bg']}/${attesa.vars['--surface']}`);
      else if (d.cTesto < 4.5 || d.cPieno < 4.5) male.push(`${p}: testo ${d.cTesto.toFixed(2)}, tasto pieno ${d.cPieno.toFixed(2)}`);
      else if ((d.tema === 'dark') !== d.scuro) male.push(`${p}: pagina ${d.pagina} ma tema ${d.tema}`);
      else if (!(await pg.evaluate((x) => document.querySelector(`[data-as-preset="${x}"]`).getAttribute('aria-pressed') === 'true', p))) male.push(`${p}: non risulta scelta`);
      if (p === 'neon' || p === 'retro') await foto(pg, 'veste-' + p);
    }
    chiedi(male.length === 0, `le ${preset.length} vesti pronte si dipingono e si leggono, e il tema dipinto segue il colore${male.length ? ' — ' + male.slice(0, 3).join('; ') : ''}`);
    await pg.click('[data-as-preset="neon"]');
    const neon = await dipinto(pg);
    chiedi(neon.tema === 'dark' && neon.scuro === true, `una veste scura nel tema chiaro si dipinge scura (${neon.tema})`);

    // Un colore scelto apposta per non leggersi.
    await pg.click('[data-as-preset=""]');
    const carta0 = (await dipinto(pg)).foglio;
    await pg.fill('#as-col-testo', carta0 || '#fdfbf6');
    await pg.dispatchEvent('#as-col-testo', 'change');
    await pg.waitForTimeout(80);
    const illeggibile = await dipinto(pg);
    chiedi(illeggibile.cTesto >= 4.5, `un testo scelto del colore della carta si ritocca finche' si legge (contrasto ${illeggibile.cTesto.toFixed(2)})`);
    chiedi(await pg.evaluate(() => !!document.querySelector('#aspetto-misura .as-colore small.as-ritocco')), 'e la carta dice quale colore ha ritoccato');
    await pg.click('[data-as-via="testo"]');
    chiedi((await dipinto(pg)).scritte.length === 0, 'tolto il colore, la radice torna pulita');

    // Le manopole: ognuna muove qualcosa che si vede, e «di serie» lo rimette.
    const base = (await dipinto(pg)).impronta;
    const MANOPOLE = [['carattere', 'as-carattere', 'serif'], ['titoli', 'as-titoli', 'mono'], ['angoli', 'as-angoli', 'vivi'], ['angoli', 'as-angoli', 'tondi'],
      ['tratto', 'as-tratto', 'marcato'], ['tratto', 'as-tratto', 'sottile'], ['ombre', 'as-ombre', 'nessuna'], ['ombre', 'as-ombre', 'corte'],
      ['trama', 'as-trama', 'liscia'], ['puntatore', 'as-puntatore', 'sistema'], ['moto', 'as-moto', 'leggero']];
    const finte = [], nonTornano = [];
    for (const [cosa, id, valore] of MANOPOLE) {
      await scegli(pg, id, valore);
      if ((await dipinto(pg)).impronta[cosa] === base[cosa]) finte.push(`${cosa}=${valore}`);
      await scegli(pg, id, cosa === 'moto' ? 'pieno' : 'serie');
      if ((await dipinto(pg)).impronta[cosa] !== base[cosa]) nonTornano.push(cosa);
    }
    await scegli(pg, 'as-moto', 'serie');
    chiedi(finte.length === 0, `ogni manopola muove qualcosa sullo schermo${finte.length ? ' — ferme: ' + finte.join(', ') : ''}`);
    chiedi(nonTornano.length === 0, `e «di serie» lo rimette com'era${nonTornano.length ? ' — non tornano: ' + nonTornano.join(', ') : ''}`);
    await pg.fill('#as-grandezza', '130');
    await pg.dispatchEvent('#as-grandezza', 'change');
    await pg.waitForTimeout(150);
    const grande = await dipinto(pg);
    chiedi(grande.impronta.grandezza === '20.8px' && grande.radice === '130%', `la grandezza a 130 % ingrandisce la radice (${grande.impronta.grandezza})`);
    chiedi((await larga(pg)) <= 0, 'a 130 % la carta non allarga la pagina sul computer');
    await pg.evaluate(() => window.SB_APP.vai('stato'));
    await pg.waitForTimeout(400);
    chiedi((await larga(pg)) <= 0, 'e nemmeno la pagina Stato');
    await foto(pg, 'grande-130');
    await carta(pg);
    await pg.fill('#as-grandezza', '100');
    await pg.dispatchEvent('#as-grandezza', 'change');

    // Ogni tema ha la sua veste.
    await pg.click('[data-as-preset="retro"]');
    const retro = (await dipinto(pg)).bg;
    await pg.click('[data-tema-toggle]');
    await pg.waitForTimeout(80);
    const scuro = await dipinto(pg);
    chiedi(scuro.tema === 'dark' && scuro.scritte.length === 0, 'il tasto in alto passa al tema scuro, che non ha una veste: e\' quello di fabbrica');
    chiedi(await pg.evaluate(() => document.querySelector('[data-as-tema="scuro"]').getAttribute('aria-pressed') === 'true'), 'e la carta mostra il tema che si sta vestendo');
    await pg.click('[data-as-tema="chiaro"]');
    await pg.waitForTimeout(80);
    chiedi((await dipinto(pg)).bg === retro && !!retro, 'tornando al chiaro torna la sua veste');

    // Il CSS della persona.
    await pg.evaluate(() => { document.querySelector('details.as-css').open = true; });
    await pg.fill('#as-css', '#carta-aspetto { outline: 3px dashed rgb(1, 2, 3); }\n.as-preset { background: url(https://altrove.example/p.png); }\n@import "https://altrove.example/f.css";');
    await pg.click('#as-css-applica');
    await pg.waitForTimeout(250);
    const colCss = await dipinto(pg);
    chiedi(await pg.evaluate(() => getComputedStyle(document.getElementById('carta-aspetto')).outlineColor === 'rgb(1, 2, 3)'), 'il CSS della persona arriva per ultimo e vale');
    chiedi(!/url\(|@import/i.test(colCss.css) && fuori.length === 0, `e quello che chiama un altro sito non arriva${fuori.length ? ' — partite: ' + fuori.join(', ') : ''}`);
    chiedi(await pg.evaluate(() => !!document.getElementById('as-css-tolto')), 'la carta dice che ha tolto qualcosa');

    // Una veste incollata.
    await pg.click('#as-incolla');
    await pg.fill('#as-incolla-testo', JSON.stringify({ chiaro: { preset: 'oceano' }, angoli: 'tondi', estranea: 1 }));
    await pg.click('#as-incolla-applica');
    await pg.waitForTimeout(100);
    const incollata = await dipinto(pg);
    const attesaOceano = await pg.evaluate(() => window.SB_ASPETTO.veste({ chiaro: { preset: 'oceano' } }, 'chiaro').vars['--bg']);
    chiedi(incollata.bg === attesaOceano && incollata.css === '' && incollata.impronta.angoli !== base.angoli, 'una veste incollata si indossa, e prende il posto di quella di prima');

    // Il ritorno alla veste di serie.
    await pg.click('#as-di-serie');
    await pg.click('#as-serie-si');
    await pg.waitForTimeout(150);
    const tornata = await dipinto(pg);
    chiedi(tornata.scritte.length === 0 && tornata.veste === null && tornata.css === '' && tornata.radice === '' && tornata.tema === 'light'
      && JSON.stringify(tornata.impronta) === JSON.stringify(base), `«Rimetti l'aspetto di serie» ripulisce la radice (${tornata.scritte.length} variabili rimaste)`);
    const copiaNeon = await pg.evaluate(() => JSON.stringify(window.SB_ASPETTO.copia({ chiaro: { preset: 'neon' }, grandezza: 115 })));
    const bgNeon = await pg.evaluate(() => window.SB_ASPETTO.veste({ chiaro: { preset: 'neon' } }, 'chiaro').vars['--bg']);
    await pg.context().close();

    // Il primo disegno: tema.js, prima che il corpo della pagina esista.
    const primoDisegno = { fn: (copia) => {
      try { localStorage.setItem('aspetto', copia); localStorage.setItem('tema', 'light'); } catch (e) { /* senza memoria non c'e' niente da provare */ }
      new MutationObserver(() => {
        if (document.body && !window.__primo) window.__primo = { bg: document.documentElement.style.getPropertyValue('--bg'), tema: document.documentElement.getAttribute('data-theme'), radice: document.documentElement.style.fontSize };
      }).observe(document, { childList: true, subtree: true });
    }, dato: copiaNeon };
    const p2 = await apri({ width: 1366, height: 900 }, { indirizzo: '/sblocca', prima: primoDisegno });
    const primo = await p2.evaluate(() => window.__primo);
    chiedi(primo && primo.bg === bgNeon && primo.tema === 'dark' && primo.radice === '115%', `tema.js veste il primo disegno, prima che arrivi il resto (${JSON.stringify(primo)})`);
    await p2.context().close();

    // L'uscita di sicurezza, e la demo.
    const p2b = await apri({ width: 1366, height: 900 }, { indirizzo: '/sblocca?aspetto=serie', prima: primoDisegno });
    const primoFuga = await p2b.evaluate(() => window.__primo);
    chiedi(primoFuga && primoFuga.bg === '' && primoFuga.tema === 'light', `con ?aspetto=serie il primo disegno e' di fabbrica (${JSON.stringify(primoFuga)})`);
    await p2b.context().close();
    const p2c = await apri({ width: 1366, height: 900 }, { prima: primoDisegno });
    const primoDemo = await p2c.evaluate(() => ({ primo: window.__primo, copia: localStorage.getItem('aspetto') }));
    chiedi(primoDemo.primo && primoDemo.primo.bg === '' && primoDemo.copia === copiaNeon, `la demo si apre con la veste di serie anche dove c'e' una veste, e non la tocca (${JSON.stringify(primoDemo.primo)})`);
    await p2c.context().close();
    const p3 = await apri({ width: 1366, height: 900 }, { indirizzo: '/?demo=1&lang=it&aspetto=serie' });
    await p3.waitForSelector('#aspetto-misura .as-preset', { state: 'attached', timeout: 8000 }).catch(() => {});
    chiedi(await p3.evaluate(() => window.SB_APP.schedaAttiva === 'account' && !!document.querySelector('#aspetto-misura .riquadro-info a[href="/"]')), 'si arriva alla carta, che dice perche\' e come tornare alla propria veste');
    await carta(p3);
    await p3.click('[data-as-preset="lava"]');
    const fuga = await dipinto(p3);
    chiedi(fuga.scritte.length === 0 && fuga.tema === 'light', 'e finche\' l\'indirizzo lo chiede le scelte non si dipingono');
    chiedi(await p3.evaluate(() => document.querySelector('[data-as-preset="lava"]').getAttribute('aria-pressed') === 'true'), 'ma restano li\' da sistemare');
    await p3.context().close();

    // Il telefono.
    const t = await apri({ width: 390, height: 844 });
    await carta(t);
    await t.click('[data-as-preset="vapor"]');
    await t.fill('#as-grandezza', '130');
    await t.dispatchEvent('#as-grandezza', 'change');
    await t.waitForTimeout(200);
    const tel = await dipinto(t);
    chiedi(tel.cTesto >= 4.5 && (await larga(t)) <= 0, `sul telefono, a 130 %, la carta si legge e non allarga la pagina (${await larga(t)} px)`);
    await foto(t, 'telefono-carta');
    await t.evaluate(() => window.SB_APP.vai('stato'));
    await t.waitForTimeout(400);
    chiedi((await larga(t)) <= 0, 'e nemmeno la pagina Stato');
    await foto(t, 'telefono-stato');
    await t.context().close();
  } catch (e) {
    guai.push('il giro si e\' fermato: ' + String(e.message).split('\n')[0]);
    dice(false, 'il giro si e\' fermato: ' + String(e.message).split('\n')[0]);
  }
  sito.chiudi();
  return guai;
}

if (SELFTEST) {
  let cieche = 0;
  for (const r of ROTTURE) {
    const guai = await giro(r, () => {});
    const vista = guai.length > 0 && !guai.some((g) => g.startsWith('la rottura non trova'));
    console.log((vista ? '  ✓  ' : '  ✗  ') + r[0] + (vista ? `  → rosso (${guai[0]})` : '  → PASSA INOSSERVATO' + (guai[0] ? ` (${guai[0]})` : '')));
    if (!vista) cieche++;
  }
  await br.close();
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}.` : "\nOgni rottura e' vista. ✓");
  process.exit(cieche ? 1 : 0);
}

console.log('\nL\'aspetto su misura, coi gesti.\n');
const guai = await giro(null, (ok, t) => console.log((ok ? '  ✓ ' : '  ✗ ') + t));
await br.close();
if (guai.length) { console.log(`\n${guai.length} ${guai.length === 1 ? 'cosa non torna' : 'cose non tornano'}.`); for (const g of guai) console.log('  ✗ ' + g); process.exit(1); }
console.log('\ncancello verde ✓');
