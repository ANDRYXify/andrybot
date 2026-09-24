// CHI SI AGGANCIA SCORRENDO SI AGGANCIA SOTTO LA BARRA IN CIMA.
//
// La barra in cima resta ferma mentre scorri, alta var(--top-h). Un elemento
// che si aggancia a 16 px dal bordo della finestra finisce sotto di lei, e
// scorrendo gli si mozza la testa: e' successo all'anteprima delle Grafiche.
// La misura e' una sola, quella della barra, e si usa quella.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../../src/web/public/style.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

test('ogni elemento che si aggancia in alto si aggancia sotto la barra', () => {
  const regole = [...CSS.matchAll(/([^{}]+)\{([^{}]*position:\s*sticky[^{}]*)\}/g)];
  assert.ok(regole.length >= 2, 'le regole si leggono');
  const storti = [];
  for (const [, sel, corpo] of regole) {
    const top = corpo.match(/(?:^|;)\s*top:\s*([^;]+)/);
    if (!top) continue;
    const v = top[1].trim();
    if (v === '0' || v.includes('var(--top-h)')) continue;
    storti.push(`${sel.trim()} → top: ${v}`);
  }
  assert.deepEqual(storti, [], 'agganciati sopra o sotto la barra per conto loro');
});

test('e l\'anteprima delle Grafiche sta tutta nello spazio sotto la barra', () => {
  assert.match(CSS, /\.gr-anteprima \{[^}]*top: calc\(var\(--top-h\) \+ 16px\)/);
  assert.match(CSS, /#gr-canvas \{[^}]*max-height: min\(calc\(100vh - var\(--top-h\) - 32px\)/);
});
