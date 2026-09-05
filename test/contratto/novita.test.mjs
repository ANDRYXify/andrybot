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
import { analizza, pubbliche, tutte, inItaliano, ultima } from '../../src/web/novita.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const gruppi = analizza(readFileSync(join(RAD, 'NOVITA.md'), 'utf8'));

test('il file vero si legge, ed è fatto di giornate con righe dentro', () => {
  assert.ok(gruppi.length >= 1, `giornate: ${gruppi.length}`);
  for (const g of gruppi) {
    assert.match(g.data, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(g.voci.length > 0, `${g.data} ha righe`);
    for (const v of g.voci) assert.ok(v.testo.length > 10, `riga sensata: ${v.testo}`);
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
  assert.deepEqual(pubbliche(uno), [{ data: '2026-01-02', voci: ['prima cosa', 'seconda cosa'] }]);
});

test('le righe scritte prima di qualsiasi giornata si ignorano', () => {
  assert.deepEqual(analizza('- orfana\n'), []);
});

test('la data si legge come la direbbe una persona', () => {
  assert.equal(inItaliano('2026-09-02'), '2 settembre 2026');
  assert.equal(inItaliano('2026-01-31'), '31 gennaio 2026');
});

// ── quello che è tuo non esce di casa ──────────────────────────────────────
// Non tutto quello che cambia riguarda chi usa il bot: la crescita di Lia e il suo
// computer sono cose del direttore. Il rischio non è che si veda male: è che si
// veda, e a chiunque.

test('una riga marcata privata non arriva mai alla forma pubblica', () => {
  const g = analizza([
    '## 2026-01-02',
    '- questa la vedono tutti',
    '- [privato] questa è solo mia',
  ].join('\n'));
  assert.deepEqual(pubbliche(g), [{ data: '2026-01-02', voci: ['questa la vedono tutti'] }]);
  // e a chi ha diritto arriva, marcata per quello che è
  assert.deepEqual(tutte(g), [{ data: '2026-01-02', voci: [
    { testo: 'questa la vedono tutti', privata: false },
    { testo: 'questa è solo mia', privata: true },
  ] }]);
});

test('un giorno fatto solo di cose tue non compare nemmeno come giorno', () => {
  const g = analizza('## 2026-01-03\n- [privato] solo mia\n\n## 2026-01-02\n- pubblica\n');
  assert.deepEqual(pubbliche(g).map((x) => x.data), ['2026-01-02'],
    'il 3 gennaio non deve esistere per il pubblico: la data stessa direbbe che è successo qualcosa');
  assert.equal(ultima(pubbliche(g)), '2026-01-02',
    'e nemmeno il pallino «c’è qualcosa di nuovo» deve accendersi per una cosa tua');
});

test('il marcatore si scrive come viene, e non si porta dietro le parentesi', () => {
  for (const riga of ['- [privato] cosa', '- [PRIVATO] cosa', '- [privata] cosa']) {
    const g = analizza('## 2026-01-02\n' + riga + '\n');
    assert.equal(g[0].voci[0].privata, true, riga);
    assert.equal(g[0].voci[0].testo, 'cosa', riga);
  }
});

test('nel file vero, quello che è marcato privato resta fuori', () => {
  const mie = gruppi.flatMap((g) => g.voci).filter((v) => v.privata).map((v) => v.testo);
  assert.ok(mie.length > 0, 'ci sono righe private da proteggere');
  const fuori = JSON.stringify(pubbliche(gruppi));
  for (const t of mie) assert.ok(!fuori.includes(t), `è uscita di casa: ${t.slice(0, 60)}`);
});
