// IL PIEDE DELLA HOME PARLA LA LINGUA DELLA PAGINA (src/web/vetrina-vista.js,
// docs/LINGUE.md). index.html porta piede, riquadro del sostegno e banner dei
// cookie in italiano; /en e /es li riscrivono, e ogni collegamento porta a una
// pagina di quella lingua quando esiste.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const { pulisci } = cartellaUsaEGetta('pie-');
test.after(pulisci);
const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const GUSCIO = readFileSync(join(RAD, 'src/web/public/index.html'), 'utf8');
const { guscioVetrina } = await import('../../src/web/vetrina-vista.js');
const { VIE } = await import('../../src/web/guide.js');

const pezzi = (h) => [
  (h.match(/<aside class="pie-mano">[\s\S]*?<\/aside>/) || [''])[0],
  (h.match(/<footer class="pie">[\s\S]*?<\/footer>/) || [''])[0],
  (h.match(/<div id="cookie-banner"[\s\S]*?<\/div>/) || [''])[0],
].join('\n');
const ITALIANO = ['Dai una mano', 'lo scrivo io', 'Privacy &amp; Sicurezza', 'Termini di Servizio', 'Ho capito', 'Dettagli', 'Manuale dei', 'Novità', 'con il tuo account'];

for (const l of ['en', 'es']) {
  test(`${l}: piede, sostegno e cookie senza resti d'italiano`, () => {
    const p = pezzi(guscioVetrina(GUSCIO, l, { kick: true, piani: [] }));
    assert.ok(p.includes('pie-mano') && p.includes('class="pie"') && p.includes('cookie-ok'), 'i tre pezzi ci sono');
    for (const x of ITALIANO) assert.ok(!p.includes(x), `${l}: «${x}»`);
  });
  test(`${l}: ogni collegamento del piede porta a una pagina di quella lingua, o a una che non ha traduzione`, () => {
    const p = pezzi(guscioVetrina(GUSCIO, l, { kick: true, piani: [] }));
    const v = VIE[l];
    const ammessi = [v.home, v.guide, v.manuali, v.novita, v.privacy, v.termini, '/sostieni', 'https://andryxify.it'];
    for (const [, href] of p.matchAll(/href="([^"]+)"/g)) {
      assert.ok(ammessi.some((a) => href === a || href.startsWith(a + '/')), `${l}: ${href}`);
    }
  });
}

test('la home italiana resta com\'e\' scritta in index.html', () => {
  const p = pezzi(guscioVetrina(GUSCIO, 'it', { kick: true, piani: [] }));
  assert.ok(p.includes('Dai una mano') && p.includes('Ho capito'));
});

// Il pannello sceglie la lingua nel browser: i piedi inglese e spagnolo gli
// arrivano nel guscio, fatti dalla stessa funzione della home, e app.js li
// mette al posto dell'italiano appena parte e a ogni cambio di lingua.
test('il guscio del pannello porta il piede nelle altre lingue, e il pannello lo usa', async () => {
  const { guscioPannello } = await import('../../src/web/vetrina-vista.js');
  const h = guscioPannello(GUSCIO);
  for (const l of ['en', 'es']) {
    const t = (h.match(new RegExp(`<template id="pie-${l}">([\\s\\S]*?)</template>`)) || [])[1] || '';
    assert.ok(t.includes('pie-mano') && t.includes('class="pie"') && t.includes('cookie-testo'), `${l}: il template ha i tre pezzi`);
    for (const x of ITALIANO) assert.ok(!t.includes(x), `${l}: «${x}» nel template`);
    assert.equal(t, (() => { const v = guscioVetrina(GUSCIO, l, { kick: true, piani: [] }); return v.match(/<aside class="pie-mano">[\s\S]*?<\/aside>/)[0] + v.match(/<footer class="pie">[\s\S]*?<\/footer>/)[0]; })() + t.slice(t.indexOf('<div class="cookie-testo">')), `${l}: lo stesso piede della home`);
  }
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  assert.match(app, /\npieInLingua\(\);\n/, 'il pannello lo mette appena parte');
  const cambia = app.slice(app.indexOf('function cambiaLingua('), app.indexOf('\n}\n', app.indexOf('function cambiaLingua(')));
  assert.ok(cambia.includes('pieInLingua()'), 'e a ogni cambio di lingua');
});
