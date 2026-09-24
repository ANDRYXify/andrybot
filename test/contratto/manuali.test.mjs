// I manuali: pagine vere, indice che punta a qualcosa, marcatura sotto controllo.
//
// Il testo dei manuali contiene marcatura voluta (<code>, <strong>, i link fra
// una pagina e l'altra): il renderer la lascia passare e ferma tutto il resto.
// Qui si costruiscono le pagine come le costruisce il server — se una riga
// contenesse un tag non previsto, o un'ancora dell'indice non esistesse, si
// scoprirebbe qui e non in pagina.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MANUALI, paginaManuale, paginaIndiceManuali, urlManuali } from '../../src/web/manuali.js';

test('ogni manuale si compone senza inciampare nella marcatura', () => {
  assert.ok(MANUALI.length >= 2, `manuali: ${MANUALI.length}`);
  for (const m of MANUALI) {
    const h = paginaManuale(m.slug);
    assert.ok(h && h.length > 5000, `${m.slug} è una pagina vera (${h?.length} byte)`);
    const h1 = m.h1.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    assert.ok(h.includes(`<h1>${h1}</h1>`), `${m.slug} ha il suo titolo`);
    assert.ok(h.includes('rel="canonical" href="https://socialbot.live/manuale/' + m.slug), `${m.slug} ha il canonical giusto`);
  }
});

test('uno slug che non esiste non è una pagina', () => {
  assert.equal(paginaManuale('inventato'), null);
  assert.equal(paginaManuale(''), null);
});

test("l'indice della pagina punta a sezioni che esistono", () => {
  for (const m of MANUALI) {
    const h = paginaManuale(m.slug);
    const ancore = [...h.matchAll(/<a href="#([^"]+)">/g)].map((x) => x[1]);
    assert.ok(ancore.length >= 4, `${m.slug} ha un indice (${ancore.length} voci)`);
    for (const a of ancore) assert.match(h, new RegExp(`<h[23] id="${a}">`), `${m.slug}: la sezione #${a} esiste`);
    assert.equal(new Set(ancore).size, ancore.length, `${m.slug}: due titoli uguali hanno indirizzi diversi`);
  }
});

test('ogni sezione del corpo compare nell’indice, con le sue parti', () => {
  for (const m of MANUALI) {
    const h = paginaManuale(m.slug);
    const sezioni = m.corpo.filter((b) => b.h2 || b.h3).length;
    const voci = [...h.matchAll(/<a href="#[^"]+">/g)].length;
    assert.equal(voci, sezioni, `${m.slug}: ${sezioni} sezioni, ${voci} voci`);
  }
});

test("l'indice dei manuali li elenca tutti", () => {
  const h = paginaIndiceManuali();
  for (const m of MANUALI) assert.ok(h.includes(`/manuale/${m.slug}`), `c'è ${m.slug}`);
});

test('la sitemap ha una voce per ogni manuale, più l’indice', () => {
  const u = urlManuali();
  assert.equal(u.length, MANUALI.length + 1);
  for (const v of u) {
    assert.match(v.loc, /^https:\/\/socialbot\.live\/manuale/);
    assert.match(v.lastmod, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('le tabelle hanno righe tutte della stessa larghezza', () => {
  for (const m of MANUALI) {
    for (const b of m.corpo) {
      if (!b.tabella) continue;
      const largo = b.tabella[0].length;
      for (const [i, r] of b.tabella.entries()) {
        assert.equal(r.length, largo, `${m.slug}: riga ${i} di «${b.tabella[0][0]}» ha ${r.length} celle invece di ${largo}`);
      }
    }
  }
});
