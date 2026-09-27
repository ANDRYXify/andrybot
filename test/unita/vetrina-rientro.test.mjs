// IL RIENTRO DEL SORGENTE NON SI SPEDISCE (senzaRientro in src/web/vetrina-vista.js).
// Si tolgono solo byte che non disegnano niente: la prova e' che la pagina,
// letta come la legge il browser, resta la stessa, sia dove lo spazio bianco
// si comprime (il testo normale) sia dove gli a capo contano (`pre-line`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-rientro-');
const { senzaRientro, guscioVetrina } = await import('../../src/web/vetrina-vista.js');
const { pianiPubblici } = await import('../../src/features/abbonamenti.js');
process.on('exit', () => usaEGetta.pulisci());

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const GUSCIO = readFileSync(join(RAD, 'src/web/public/index.html'), 'utf8');

const INTOCCABILI = /<(script|style|pre|textarea)\b[\s\S]*?<\/\1\s*>/gi;
const fuori = (h) => h.replace(INTOCCABILI, '');
const dentro = (h) => h.match(INTOCCABILI) || [];
const tag = (h) => fuori(h).match(/<[^>]+>/g) || [];
// come il browser tratta lo spazio bianco nei due modi che la pagina usa
const normale = (h) => fuori(h).replace(/<[^>]+>/g, '\u0000').replace(/[ \t\n]+/g, ' ');
const preLine = (h) => fuori(h).replace(/<[^>]+>/g, '\u0000').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n');

test('toglie gli spazi attorno agli a capo, e ogni a capo resta', () => {
  assert.equal(senzaRientro('<p>\n      <b>65</b> funzioni\n      <span>·</span>\n    </p>'), '<p>\n<b>65</b> funzioni\n<span>·</span>\n</p>');
  assert.equal(senzaRientro('uno\n\n    due'), 'uno\n\ndue', 'una riga vuota resta: sotto pre-line e\' un a capo in piu\'');
  assert.equal(senzaRientro('a \t\n\t b'), 'a\nb');
  assert.equal(senzaRientro('a   b'), 'a   b', 'gli spazi senza a capo non si toccano');
});

test('script, stili, pre e textarea restano come sono', () => {
  for (const x of ['<script>\n  const a = `x\n    y`;\n</script>', '<style>\n  a { color: red; }\n</style>',
    '<pre>\n   rientro\n     vero</pre>', '<textarea>\n  scritto\n</textarea>', '<SCRIPT type="application/ld+json">\n {"a":\n  1}\n</SCRIPT>']) {
    assert.equal(senzaRientro(`<div>\n    ${x}\n    </div>`), `<div>\n${x}\n</div>`, x);
  }
});

test('la home, in tre lingue, esce senza rientro', () => {
  const piani = pianiPubblici();
  for (const l of ['it', 'en', 'es']) {
    const h = guscioVetrina(GUSCIO, l, { kick: true, piani });
    assert.equal(senzaRientro(h), h, `${l}: la home esce gia' senza rientro`);
    assert.ok(!/\n[ \t]+</.test(fuori(h)), `${l}: nessuna riga comincia con degli spazi`);
  }
});

test('su una pagina vera la lettura del browser non cambia', () => {
  // il guscio intero, col suo rientro, e' un buon banco: e' fatto degli stessi template
  const prima = GUSCIO;
  const dopo = senzaRientro(prima);
  assert.ok(dopo.length < prima.length);
  assert.deepEqual(tag(dopo), tag(prima), 'gli stessi tag, nello stesso ordine');
  assert.deepEqual(dentro(dopo), dentro(prima), 'script e stili identici');
  assert.equal(normale(dopo), normale(prima), 'il testo, come lo legge il browser');
  assert.equal(preLine(dopo), preLine(prima), 'e come lo legge un elemento pre-line');
});
