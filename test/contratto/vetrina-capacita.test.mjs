// QUELLO CHE SI FA, SI DICE ANCHE FUORI.
//
// Una funzione nuova nasce nel pannello, e lì la vede solo chi è già dentro.
// Chi sta decidendo se prendere il bot guarda la vetrina: se lì non c'è, per
// lui quella funzione non esiste — giorni di lavoro invisibili a chi deve
// scegliere. È lo stesso difetto delle novità, un piano più in là: la cosa e il
// modo di raccontarla nascono in due momenti diversi, e il secondo si scorda.
//
// Quindi ogni voce della vetrina dichiara QUALE scheda del pannello vende, e
// qui si controlla che non ne resti fuori nessuna. L'elenco delle schede non è
// scritto a parte: sono quelle che il pannello DISEGNA davvero, lette dal
// pannello stesso — la stessa regola che usa la prova degli aiuti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FUNZIONI_VETRINA } from '../../src/web/vetrina-vista.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

const SCHEDE = [...new Set([...APP.matchAll(/pannello\('([a-z0-9-]+)'/g)].map((m) => m[1]))]
  .filter((id) => !['admin', 'studio'].includes(id));

// L'unica che resta fuori, e con un motivo: «Avatar 3D» è una scheda da admin,
// non una cosa che si compra. Una scheda che sta qui senza motivo e' un buco
// travestito da eccezione.
const FUORI = new Set(['avatar']);

const VOCI = FUNZIONI_VETRINA.flatMap((g) => g.voci);

test('ogni voce della vetrina dice quale scheda vende', () => {
  const mute = VOCI.filter((v) => !v.scheda).map((v) => v.t[0]);
  assert.deepEqual(mute, [], 'una voce senza scheda non si puo\' controllare');
});

test('ogni scheda del pannello è raccontata sulla vetrina', () => {
  const vendute = new Set(VOCI.map((v) => v.scheda));
  const nascoste = SCHEDE.filter((s) => !vendute.has(s) && !FUORI.has(s));
  assert.deepEqual(nascoste, [],
    'chi sta decidendo se prenderlo non le vedrebbe: vanno in CAPACITA, in vetrina-vista.js');
  assert.ok(SCHEDE.length >= 20, `schede del pannello: ${SCHEDE.length}`);
});

test('la vetrina non vende schede che non esistono', () => {
  for (const v of VOCI) {
    assert.ok(SCHEDE.includes(v.scheda), `«${v.t[0]}» punta a «${v.scheda}», che nel pannello non c'e'`);
  }
});

test('l\'eccezione resta un\'eccezione, e resta vera', () => {
  for (const s of FUORI) {
    assert.ok(SCHEDE.includes(s), `${s} e' ancora una scheda: se sparisce, va tolta anche di qui`);
  }
  assert.ok(FUORI.size <= 2, `le eccezioni sono ${FUORI.size}: se crescono, la regola non vale piu'`);
});

test('quello che si vende si legge in tre lingue, senza buchi', () => {
  for (const g of FUNZIONI_VETRINA) {
    assert.equal(g.area.length, 3, `l'area «${g.area[0]}» in tre lingue`);
    for (const v of g.voci) {
      assert.equal(v.t.length, 3, `«${v.t[0]}»: titolo in tre lingue`);
      assert.equal(v.d.length, 3, `«${v.t[0]}»: descrizione in tre lingue`);
      for (const x of [...v.t, ...v.d]) assert.ok(String(x).trim().length > 2, `«${v.t[0]}» non ha caselle vuote`);
    }
  }
});
