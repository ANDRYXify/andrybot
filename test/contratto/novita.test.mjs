// Le novità: il file che le racconta e il modo in cui vengono lette.
//
// La fonte è scritta a mano, quindi il rischio non è un bug: è una svista di
// scrittura che non si vede finché non è in pagina — un trattino diverso, una
// data storta, un gruppo vuoto. Qui si legge il file vero con il codice vero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { analizza, inItaliano, ultima } from '../../src/web/novita.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const gruppi = analizza(readFileSync(join(RAD, 'NOVITA.md'), 'utf8'));

test('il file vero si legge, ed è fatto di giornate con righe dentro', () => {
  assert.ok(gruppi.length >= 1, `giornate: ${gruppi.length}`);
  for (const g of gruppi) {
    assert.match(g.data, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(g.voci.length > 0, `${g.data} ha righe`);
    for (const v of g.voci) assert.ok(v.length > 10, `riga sensata: ${v}`);
  }
});

test('le giornate vanno dalla più recente alla più vecchia', () => {
  const date = gruppi.map((g) => g.data);
  assert.deepEqual(date, [...date].sort().reverse());
  assert.equal(ultima(gruppi), date[0]);
});

test('la prosa attorno non finisce fra le novità', () => {
  const uno = analizza([
    '# Novità',
    'Una spiegazione che non è una voce.',
    '## 2026-01-02',
    '- prima cosa',
    '* seconda cosa',
    'un paragrafo in mezzo',
    '## 2026-01-01',
    '',            // giornata vuota: non deve comparire
  ].join('\n'));
  assert.deepEqual(uno, [{ data: '2026-01-02', voci: ['prima cosa', 'seconda cosa'] }]);
});

test('le righe scritte prima di qualsiasi giornata si ignorano', () => {
  assert.deepEqual(analizza('- orfana\n'), []);
});

test('la data si legge come la direbbe una persona', () => {
  assert.equal(inItaliano('2026-09-02'), '2 settembre 2026');
  assert.equal(inItaliano('2026-01-31'), '31 gennaio 2026');
});
