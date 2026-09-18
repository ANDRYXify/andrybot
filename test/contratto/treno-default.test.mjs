// IL TRENO: il pannello e il server devono partire dalla STESSA cosa.
//
// I valori di partenza sono scritti due volte: `normTreno` (server, in
// web/stile.js) e `_defTreno` (pannello, in web/public/app.js). E" una
// duplicazione che non si puo" togliere — il pannello deve poter disegnare un
// treno prima ancora di aver parlato col server — ma e" anche il posto dove due
// verita" si dividono in silenzio: il pannello mostra una frase, il server ne
// salva un"altra, e te ne accorgi solo in diretta.
//
// Qui si confrontano. E soprattutto: le frasi devono essere le STESSE frasi, di
// numero e di nome, cosi" una frase aggiunta da una parte sola non passa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normTreno } from '../../src/web/stile.js';

const app = readFileSync('src/web/public/app.js', 'utf8');

const corpoDefault = () => {
  const i = app.indexOf('function _defTreno()');
  assert.ok(i > 0, 'non trovo _defTreno nel pannello');
  const da = app.indexOf('return {', i);
  let liv = 0;
  for (let j = app.indexOf('{', da); j < app.length; j++) {
    if (app[j] === '{') liv++;
    else if (app[j] === '}') { liv--; if (liv === 0) return app.slice(da + 7, j + 1); }
  }
  assert.fail('_defTreno non si chiude');
  return '';
};

// eslint-disable-next-line no-new-func
const pannello = new Function('return (' + corpoDefault() + ')')();
const server = normTreno({});

test("il pannello e il server partono dagli stessi valori", () => {
  for (const k of ['attivo', 'titolo', 'mostraChi', 'mostraRecord', 'annuncia', 'posizione']) {
    assert.deepEqual(pannello[k], server[k], `il valore di partenza di ${k} non combacia`);
  }
});

test("le frasi in chat sono le stesse, di numero e di nome", () => {
  const frasi = (o) => Object.keys(o).filter((k) => k.startsWith('testo')).sort();
  assert.deepEqual(frasi(pannello), frasi(server),
    'una frase aggiunta da una parte sola: il pannello ne offrirebbe una che il server butta, o viceversa');
  assert.ok(frasi(server).length >= 4);
});

test("e dicono le stesse parole", () => {
  for (const k of Object.keys(server).filter((x) => x.startsWith('testo'))) {
    assert.equal(pannello[k], server[k], `la frase di partenza di ${k} e diversa fra pannello e server`);
  }
});
