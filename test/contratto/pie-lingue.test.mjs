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

process.env.DATA_DIR ||= cartellaUsaEGetta('pie-');
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
