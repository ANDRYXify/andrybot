// LE VINCITE SI ARROTONDANO PER DIFETTO.
//
// La resa del pannello e' «su 100 monete»; una vincita arrotondata al piu'
// vicino, con una posta piccola, rende di piu': una moneta al colpo che torna
// 1,6 diventava 2, cioe' il 120%. Per difetto, nessuna posta rende piu' di
// quanto dice il pannello. Il ragionamento sta in docs/GIOCHI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('arrotondare-');
const B = await import('../../src/features/blackjack.js');
const C = await import('../../src/features/colpo.js');
const games = await import('../../src/features/games.js');
test.after(() => casa.pulisci());

const poste = Array.from({ length: 300 }, (_, i) => i + 1);

test('il blackjack servito non paga mai piu\' di quanto dice il pannello', () => {
  for (const v of [200, 225, 250, 275, 300]) {
    for (const s of poste) assert.ok(B.rende('bj', s, v) <= s * v / 100, `posta ${s}, ${v}: ${B.rende('bj', s, v)}`);
  }
});

test('chi scappa dal colpo non riprende mai piu\' di quanto dice il pannello', () => {
  for (const vincita of [100, 150, 160, 175, 333, 1000]) {
    for (const s of poste) {
      const [e] = C.esitoColpo([['a', { nome: 'a', posta: s }]], { riuscita: 100, perPersona: 0, riuscitaMax: 100, vincita }, () => 0);
      assert.ok(e.netto + s <= s * vincita / 100, `posta ${s}, ${vincita}: ${e.netto + s}`);
    }
  }
});

test('la morra vinta non paga mai piu\' di quanto dice il pannello', () => {
  for (const vincita of [100, 150, 200, 250, 1000]) {
    for (const s of poste) assert.ok(games.pagaMorra('vinci', s, { vincita }) <= s * vincita / 100, `posta ${s}, ${vincita}`);
  }
});
