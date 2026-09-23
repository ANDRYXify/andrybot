// LE FINESTRE DEL PANNELLO: il segnalibro che gira sul sito di un altro, i tasti
// detti per il dispositivo che si ha in mano, e la copia che non fallisce in
// silenzio. Il ragionamento sta in docs/FINESTRE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minificaJs } from '../../src/web/minifica.js';
import { senzaCommentiJs } from '../../scripts/_codice.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const APP = leggi('src/web/public/app.js');

// Una dichiarazione di primo livello di app.js, intera: da `function nome(` o
// `const nome = ` fino alla graffa che la chiude a colonna zero.
function pezzo(nome) {
  const m = new RegExp(`\\n(?:async )?(?:function ${nome}\\(|const ${nome} = )`).exec(APP);
  assert.ok(m, `manca ${nome}`);
  const fine = APP.indexOf('\n}', m.index + 1);
  const coda = /^\)\(\);|^;?/.exec(APP.slice(fine + 2))[0];
  return APP.slice(m.index + 1, fine + 2 + coda.length);
}

// ---- il segnalibro delle citazioni -------------------------------------------

// Il segnalibro nasce da _xlaGrabFn.toString(), e il browser riceve app.js
// minificato: quindi si costruisce anche dal minificato, con le stesse opzioni.
async function segnalibro(minificato, ritocca = (x) => x) {
  let codice = ritocca(pezzo('_xlaGrabFn')) + '\n' + pezzo('bookmarkletXla');
  if (minificato) codice = await minificaJs(codice);
  return new Function('L', codice + '\nreturn bookmarkletXla();')((it) => it);
}

// Una pagina finta di un altro sito: niente del pannello, solo il browser.
// Prima di eseguire un link javascript: il browser decodifica i %XX.
async function suUnaPagina(href, { testo, apple = false, tocco = false, appunti = 'si' }) {
  assert.match(href, /^javascript:/);
  const visti = [];
  const navigator = {
    platform: apple ? 'MacIntel' : 'Win32',
    userAgent: apple ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    clipboard: appunti === 'manca' ? undefined : {
      writeText: (t) => (appunti === 'si' ? (visti.push(['copiato', t]), Promise.resolve()) : Promise.reject(new Error('negato'))),
    },
  };
  const window = {
    matchMedia: (q) => ({ matches: q === '(any-pointer: fine)' ? !tocco : false }),
    prompt: (msg, val) => { visti.push(['prompt', msg, val]); return null; },
  };
  vm.runInNewContext(decodeURIComponent(href.slice('javascript:'.length)), {
    document: { body: { innerText: testo } }, navigator, window, alert: (m) => visti.push(['alert', m]),
  });
  await new Promise((r) => setImmediate(r));
  return visti;
}

// I testi attesi si leggono dal sorgente: il test guarda che arrivino interi
// (accenti, virgolette basse, ⌘), non come sono scritti oggi.
const testo = (chiave) => {
  const m = new RegExp(`\\n    ${chiave}: L\\('((?:[^'\\\\]|\\\\.)*)'`).exec(pezzo('bookmarkletXla'));
  assert.ok(m, `manca il testo ${chiave}`);
  return m[1].replace(/\\'/g, "'");
};
const PAGINA = ['x.la', 'Menu', '“Ciao a tutti quanti”', 'Andrea · 12/09/2026', 'Un\'altra citazione bella', 'Accedi'].join('\n');
const COPIATE = '"Ciao a tutti quanti"\nAndrea · 12/09/2026\n\n"Un\'altra citazione bella"';

for (const minificato of [true, false]) {
  const come = minificato ? 'minificato, come lo riceve il browser' : 'dal sorgente, come con SB_SORGENTI=1';

  test(`il segnalibro (${come}) e' un link di caratteri semplici`, async () => {
    const href = await segnalibro(minificato);
    assert.match(href, /^[\x20-\x7e]+$/, 'niente lettere accentate ne\' a capo: diventano \\uXXXX');
    assert.ok(!href.includes('__TESTI__'), 'i testi ci sono entrati');
    assert.ok(!/%(?!25)/.test(href), 'ogni % e\' %25: il browser, decodificando, lo riporta com\'era');
    // oggi nel segnalibro un % non c'e': se ne mette uno, e deve tornare intero
    const conPercento = await segnalibro(minificato, (f) => f.replace('alert(T.nessuna)', "alert(T.nessuna + '50%41')"));
    assert.ok(decodeURIComponent(conPercento.slice('javascript:'.length)).includes('50%41'), '«%41» non diventa «A»');
  });

  test(`il segnalibro (${come}) gira da solo sul sito di un altro`, async () => {
    const href = await segnalibro(minificato);

    assert.deepEqual(await suUnaPagina(href, { testo: 'x.la\nMenu\nAccedi' }), [['alert', testo('nessuna')]],
      'una pagina senza citazioni lo dice');

    assert.deepEqual(await suUnaPagina(href, { testo: PAGINA }), [
      ['copiato', COPIATE],
      ['alert', testo('copiate').replace('{n}', '2')],
    ], 'la data resta attaccata alla sua citazione, e il numero e\' quello vero');

    const aMano = testo('tasti');
    assert.deepEqual(await suUnaPagina(href, { testo: PAGINA, appunti: 'no' }), [['prompt', aMano.replace('{tasto}', 'Ctrl+C'), COPIATE]],
      'su Windows, se il browser non lascia copiare: Ctrl+C');
    assert.deepEqual(await suUnaPagina(href, { testo: PAGINA, appunti: 'no', apple: true }), [['prompt', aMano.replace('{tasto}', '⌘C'), COPIATE]],
      'sul Mac: ⌘C');
    assert.deepEqual(await suUnaPagina(href, { testo: PAGINA, appunti: 'no', apple: true, tocco: true }), [['prompt', testo('tocco'), COPIATE]],
      'sul telefono niente tasti: si tiene premuto');
    assert.deepEqual(await suUnaPagina(href, { testo: PAGINA, appunti: 'manca' }), [['prompt', aMano.replace('{tasto}', 'Ctrl+C'), COPIATE]],
      'e senza gli appunti del browser, si va subito a mano');
  });
}

// ---- i tasti, per il dispositivo --------------------------------------------

function perIlDispositivo({ apple = false, tocco = false, platform = null, uaData = null, lingua = 0 }) {
  const codice = ['_dispositivo', 'scorciatoia', 'traTasti', 'comeCopiare', '_aiutoEditorOverlay'].map(pezzo).join('\n');
  const navigator = {
    platform: platform ?? (apple ? 'MacIntel' : 'Win32'),
    userAgent: apple ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    ...(uaData ? { userAgentData: uaData } : {}),
  };
  const window = { matchMedia: (q) => ({ matches: q === '(any-pointer: fine)' ? !tocco : false }) };
  const L = (...t) => t[lingua];
  return new Function('navigator', 'window', 'L', codice + '\nreturn { scorciatoia, traTasti, comeCopiare, aiuto: _aiutoEditorOverlay };')(navigator, window, L);
}

test('su Windows e Linux i tasti hanno i loro nomi', () => {
  const d = perIlDispositivo({});
  assert.equal(d.scorciatoia('mod', 'C'), 'Ctrl+C');
  assert.equal(d.scorciatoia('mod', 'maiusc', 'Z'), 'Ctrl+Maiusc+Z');
  assert.equal(d.scorciatoia('invio'), 'Invio');
  assert.equal(d.traTasti(d.scorciatoia('mod', 'Z')), ' (Ctrl+Z)');
  assert.match(d.comeCopiare(), /premi Ctrl\+C\.$/);
  const a = d.aiuto();
  for (const x of ['<strong>Ctrl</strong>', '<strong>Maiusc</strong>', '<strong>Alt</strong>', '<strong>Alt+rotellina</strong>', '<strong>Maiusc+rotellina</strong>']) assert.ok(a.includes(x), x);
  assert.ok(!/⌘|⌥|⇧/.test(a));
  assert.equal(perIlDispositivo({ lingua: 1 }).scorciatoia('invio'), 'Enter');
});

test('sul Mac i tasti sono quelli del Mac', () => {
  const d = perIlDispositivo({ apple: true });
  assert.equal(d.scorciatoia('mod', 'C'), '⌘C');
  assert.equal(d.scorciatoia('mod', 'maiusc', 'Z'), '⌘⇧Z', 'rifai: la combinazione che l\'editor ascolta davvero');
  assert.equal(d.traTasti(d.scorciatoia('mod', 'Z')), ' (⌘Z)');
  assert.match(d.comeCopiare(), /premi ⌘C\.$/);
  const a = d.aiuto();
  for (const x of ['<strong>⌘</strong>', '<strong>⇧</strong>', '<strong>⌥</strong>', '<strong>⌥+rotellina</strong>', '<strong>⇧+rotellina</strong>']) assert.ok(a.includes(x), x);
  assert.ok(!/Ctrl|Maiusc|\bAlt\b/.test(a), 'niente «Ctrl (o ⌘)»: il tasto e\' uno');
  assert.equal(perIlDispositivo({ apple: true, lingua: 1 }).scorciatoia('invio'), 'Return');
  assert.equal(perIlDispositivo({ apple: false, platform: '', uaData: { platform: 'macOS' } }).scorciatoia('mod', 'C'), '⌘C',
    'il Mac si riconosce anche quando platform e\' vuoto');
});

test('sul telefono i tasti non si nominano', () => {
  const d = perIlDispositivo({ apple: true, tocco: true });
  assert.equal(d.traTasti('⌘Z'), '', 'sul titolo di un tasto non si appende niente');
  assert.equal(d.comeCopiare(), 'Tieni premuto sul testo e scegli «Copia».');
  const a = d.aiuto();
  assert.ok(a.startsWith('<strong>Tocca</strong>'));
  assert.ok(!/⌘|⌥|⇧|Ctrl|Maiusc|\bAlt\b|rotellina|frecce|doppio clic/.test(a), 'solo quello che si fa con un dito');
  assert.ok(perIlDispositivo({ apple: true, tocco: false }).traTasti('⌘Z'), 'un iPad con la tastiera attaccata i tasti li mostra');
});

test('nessun testo servito scrive un tasto fisso', () => {
  // Il tasto giusto lo decidono scorciatoia (nel pannello) e il segnalibro (sul
  // sito di un altro): fuori da li', un nome di tasto scritto a mano e' sbagliato
  // su qualche dispositivo.
  const TASTO = /\b(Ctrl|Cmd)\b|⌘|⌥|⇧|\b(Maiusc|Shift|Mayús|Alt)\+|\+(Maiusc|Shift|Mayús|Alt)\b/;
  const fuori = [];
  const dir = join(RAD, 'src/web/public');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    let src = readFileSync(join(dir, f), 'utf8');
    if (f === 'app.js') for (const n of ['scorciatoia', '_xlaGrabFn', 'bookmarkletXla']) { const p = pezzo(n); src = src.replace(p, p.replace(/[^\n]/g, ' ')); }
    senzaCommentiJs(src).split('\n').forEach((r, i) => { if (TASTO.test(r)) fuori.push(`${f}:${i + 1}  ${r.trim().slice(0, 90)}`); });
  }
  assert.deepEqual(fuori, []);
  const plancia = leggi('src/web/public/plancia.js');
  assert.match(plancia, /esc\(tasto\('invio'\)\)/, 'il tasto Invio della plancia: tradotto, e «Return» sul Mac in inglese');
});

test('al tocco le legende dei tasti si nascondono, e nell\'editor si trascina col dito', () => {
  const css = leggi('src/web/public/anime.css');
  assert.match(css, /@media not all and \(any-pointer: fine\) \{\n\s+\.cerca-kbd, \.pl-guida \{ display: none; \}/,
    'lo stesso criterio di _dispositivo.soloTocco');
  assert.match(css, /#ovl-preview \.ap-el, #ovl-preview #ap-riquadro, #ovl-preview #ap-parti \{ touch-action: none; \}/,
    'senza, un dito che trascina fa scorrere la pagina e il browser interrompe il trascinamento');
});

test('la rotellina con un tasto legge l\'asse che si muove', () => {
  // Con Maiusc tenuto, Windows, macOS e Firefox mandano la rotellina di lato
  // (deltaX) e lasciano deltaY a zero: leggendo solo deltaY si ruotava in un
  // verso solo.
  const corpo = pezzo('rendiTrascinabile');
  const w = corpo.slice(corpo.indexOf("el.addEventListener('wheel'"), corpo.indexOf("el.addEventListener('dblclick'"));
  assert.match(w, /const d = Math\.abs\(e\.deltaX\) > Math\.abs\(e\.deltaY\) \? e\.deltaX : e\.deltaY;/);
  assert.ok(!/e\.deltaY < 0/.test(w));
});

// ---- copiare ----------------------------------------------------------------

test('ogni copia passa da copiaTesto, che non fallisce in silenzio', () => {
  const dir = join(RAD, 'src/web/public');
  const scrive = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    let src = readFileSync(join(dir, f), 'utf8');
    if (f === 'app.js') for (const n of ['copiaTesto', '_xlaGrabFn']) { const p = pezzo(n); src = src.replace(p, p.replace(/[^\n]/g, ' ')); }
    senzaCommentiJs(src).split('\n').forEach((r, i) => { if (/clipboard\s*\??\.\s*writeText/.test(r)) scrive.push(`${f}:${i + 1}`); });
  }
  assert.deepEqual(scrive, [], 'fuori da copiaTesto (e dal segnalibro, che ha la sua strada) nessuno scrive negli appunti');
  assert.match(pezzo('copiaTesto'), /catch \{\n\s+return chiediCopia\(\{ \.\.\.finestra, testo, msgOk \}\);/,
    'se il browser non lascia copiare, il testo compare gia\' selezionato');
});
