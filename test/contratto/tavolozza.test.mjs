// I COLORI DEL PRODOTTO STANNO IN UN POSTO SOLO.
//
// Il marchio è cambiato due volte e ogni volta è rimasto indietro qualcosa: il
// viola nelle aureole dei bottoni, la carta calda nell'anteprima dei link, una
// copia intera della tavolozza dentro style.css che nessuno vedeva perché era
// coperta da quella buona. Difetti che non si scoprono guardando: si scoprono
// mesi dopo, per caso, quando uno condivide un link.
//
// Qui si verifica che chi ha bisogno di un colore lo prenda da `tema.css`, e
// che l'alone del marchio segua IL MARCHIO invece di una classe — perché è
// legandolo a una classe che la vetrina se l'era perso.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TAVOLOZZA, tinta, dichiarazioni, REGOLA_MARCHIO } from '../../src/web/tavolozza.js';
import { paginaGuida, GUIDE } from '../../src/web/guide.js';

const RAD = process.cwd();
const leggi = (via) => readFileSync(join(RAD, via), 'utf8');
const PUB = 'src/web/public';

// I quattro assetti trasparenti del marchio: quelli che vanno sulle pagine, e
// che sul fondo scuro perderebbero i contorni neri senza l'alone.
const SEGNI = ['marchio-barra.png', 'marchio.png', 'logo-barra.png', 'logo-esteso.png'];

test('la tavolozza si legge da tema.css, e lo scuro eredita quel che non ridefinisce', () => {
  const css = leggi(`${PUB}/tema.css`);
  assert.ok(css.includes(`--acc: ${tinta('acc')};`), 'l\'accento chiaro viene da tema.css');
  assert.ok(css.includes(`--acc: ${tinta('acc', 'scuro')};`), 'l\'accento scuro viene da tema.css');
  // il blocco scuro non ripete i raggi degli angoli: li eredita
  assert.equal(tinta('r-m', 'scuro'), tinta('r-m'));
  assert.notEqual(tinta('bg', 'scuro'), tinta('bg'));
  assert.equal(dichiarazioni(['acc', 'su-acc']), `--acc:${tinta('acc')};--su-acc:${tinta('su-acc')}`);
});

test('nessun altro foglio si tiene una seconda tavolozza', () => {
  const token = new Set(Object.keys(TAVOLOZZA.chiaro));
  for (const f of ['style.css', 'anime.css', 'vetrina.css', 'pagina.css']) {
    const css = leggi(`${PUB}/${f}`);
    for (const m of css.matchAll(/(^|\})([^{}]*:root[^{}]*)\{([^}]*)\}/g)) {
      for (const d of m[3].matchAll(/--([a-z0-9-]+)\s*:/g)) {
        assert.ok(!token.has(d[1]), `${f} ridichiara --${d[1]} su ${m[2].trim()}`);
      }
    }
  }
});

test('l\'alone segue il marchio, non una classe: vale per tutti e quattro i segni', () => {
  for (const segno of SEGNI) {
    assert.ok(
      REGOLA_MARCHIO.includes('/icons/logo-') && segno.startsWith('logo-')
      || REGOLA_MARCHIO.includes('/icons/marchio') && segno.startsWith('marchio'),
      `l'alone non prende ${segno}`,
    );
  }
  assert.ok(REGOLA_MARCHIO.includes('var(--acc)'), 'l\'alone è del colore del marchio');
});

test('ogni pagina che mostra il marchio gli mette l\'alone', () => {
  const conTema = ['index.html', 'mod.html', 'privacy.html', 'sblocca.html', 'termini.html'];
  for (const f of conTema) {
    const h = leggi(`${PUB}/${f}`);
    if (!SEGNI.some((s) => h.includes(`/icons/${s}`))) continue;
    assert.ok(h.includes('tema.css'), `${f} mostra il marchio ma non carica tema.css`);
  }
  // la vetrina è disegnata da app.js dentro index.html: stesso foglio, stesso alone
  assert.ok(SEGNI.some((s) => leggi(`${PUB}/app.js`).includes(`/icons/${s}`)));
  // le guide non caricano tema.css: si portano via la regola invece di riscriverla
  const guida = paginaGuida(GUIDE[0].slug);
  assert.ok(SEGNI.some((s) => guida.includes(`/icons/${s}`)), 'la guida mostra il marchio');
  const senzaSpazi = (t) => t.replace(/\s+/g, '');
  assert.ok(senzaSpazi(guida).includes(senzaSpazi(REGOLA_MARCHIO)), 'la guida si porta dietro l\'alone');
});

test('l\'anteprima dei link e le icone nascono dalla tavolozza, non da colori riscritti', () => {
  for (const via of ['scripts/og.mjs', 'scripts/marchio.mjs']) {
    const s = leggi(via);
    assert.ok(s.includes("from '../src/web/tavolozza.js'"), `${via} prende i colori dalla tavolozza`);
    const codice = s.split('\n').filter((r) => !r.trim().startsWith('//')).join('\n');
    assert.deepEqual(codice.match(/#[0-9a-fA-F]{6}\b/g) || [], [],
      `${via} non si riscrive i colori a mano`);
  }
});
