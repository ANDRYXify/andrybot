// «C'è una guida per questa scheda»: chi la dichiara, e a chi serve.
//
// La striscia in fondo al pannello compare quando qualcuno resta fermo su una
// scheda — ma solo se per quella scheda esiste davvero qualcosa da leggere.
// L'associazione non è un elenco a parte: ogni guida e ogni manuale dichiara le
// schede a cui serve, accanto al proprio contenuto. Chi scrive la pagina sa a
// chi serve meglio di chiunque la legga sei mesi dopo.
//
// Qui si controlla che quelle dichiarazioni puntino a schede vere e a pagine
// vere: una scheda scritta male non spegnerebbe niente, mostrerebbe un aiuto che
// non si apre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GUIDE } from '../../src/web/guide.js';
import { MANUALI, aiutiPerScheda } from '../../src/web/manuali.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const AIUTI = aiutiPerScheda();

// le schede vere del pannello, lette da dove sono elencate
const gruppi = APP.slice(APP.indexOf('const GRUPPI = ['), APP.indexOf('function schedaValida'));
const SCHEDE = [...gruppi.matchAll(/\[\s*'([a-z-]+)',\s*'[^']*'\s*\]/g)].map((m) => m[1]);

test('qualche scheda ha la sua pagina', () => {
  assert.ok(SCHEDE.length >= 10, `schede del pannello: ${SCHEDE.length}`);
  assert.ok(Object.keys(AIUTI).length >= 4, `schede con un aiuto: ${Object.keys(AIUTI).length}`);
});

test('ogni aiuto punta a una scheda che esiste', () => {
  for (const id of Object.keys(AIUTI)) {
    assert.ok(SCHEDE.includes(id), `la scheda «${id}» esiste`);
  }
});

test('e a una pagina che esiste', () => {
  const slugGuide = GUIDE.map((g) => `/guide/${g.slug}`);
  const slugManuali = MANUALI.map((m) => `/manuale/${m.slug}`);
  for (const [id, a] of Object.entries(AIUTI)) {
    assert.ok(a.titolo && a.titolo.length > 5, `${id}: ha un titolo`);
    assert.ok(['guida', 'manuale'].includes(a.tipo), `${id}: tipo sensato`);
    assert.ok([...slugGuide, ...slugManuali].includes(a.via), `${id} → ${a.via} esiste`);
    assert.equal(a.tipo === 'manuale', slugManuali.includes(a.via), `${id}: il tipo dice la verità`);
  }
});

test('dove c’è un manuale, vince lui sulla guida', () => {
  // «Comandi» ha sia la guida sui comandi della chat sia il manuale dei moduli:
  // chi è già dentro il prodotto vuole il riferimento, non l'introduzione.
  const conGuida = GUIDE.filter((g) => (g.schede || []).includes('moduli'));
  assert.ok(conGuida.length >= 1, 'la guida che parla di comandi dichiara «moduli»');
  assert.equal(AIUTI.moduli.tipo, 'manuale');
  assert.equal(AIUTI.moduli.via, '/manuale/moduli');
});

test('il pannello sa chiedere l’aiuto della scheda che stai guardando', () => {
  assert.match(APP, /stato\?\.aiuti\?\.\[id\]/, 'legge la mappa che arriva dal server');
  assert.match(APP, /aiuto-banner/, 'e la mostra con la stessa forma della striscia dei cookie');
  assert.match(APP, /localStorage\.setItem\('sb-aiuto-'/, 'e si ricorda di chi ha detto no');
});

test('non compare mentre c’è ancora la striscia dei cookie', () => {
  const i = APP.indexOf('function mostraAiuto()');
  const corpo = APP.slice(i, i + 700);
  assert.match(corpo, /cookie-banner/, 'due strisce insieme si coprirebbero');
});
