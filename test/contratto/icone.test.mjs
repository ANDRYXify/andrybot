// OGNI ICONA CHE IL PANNELLO USA ESISTE. Un nome che manca in ICO non da'
// errore: _hIco(undefined) disegna un'icona vuota, e il titolo resta senza (i
// calendari di Discord, i ruoli, il tasto muto del mixer da silenziato). Per
// questo niente ripieghi del tipo `ICO.x || ICO.y`: coprono il buco invece di
// chiuderlo, e il giorno che x sparisce nessuno se ne accorge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { senzaCommentiJs } from '../../scripts/_codice.mjs';

const APP = senzaCommentiJs(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/web/public/app.js'), 'utf8'));

test('ogni ICO.x usato nel pannello e\' un\'icona che c\'e\'', () => {
  const i = APP.indexOf('\nconst ICO = {');
  assert.ok(i > 0);
  const tabella = APP.slice(i, APP.indexOf('\n};', i));
  const chiavi = new Set([...tabella.matchAll(/^ {2}([A-Za-z_$][\w$]*):/gm)].map((m) => m[1]));
  assert.ok(chiavi.size > 50, `icone lette: ${chiavi.size}`);
  const mancano = [...new Set([...APP.matchAll(/\bICO\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]).filter((k) => !chiavi.has(k)))];
  assert.deepEqual(mancano, [], 'icone usate ma non disegnate');
});

test('niente ripieghi fra icone: un buco si chiude, non si copre', () => {
  const ripieghi = [...APP.matchAll(/\bICO\.[A-Za-z_$][\w$]*\s*\|\|[^,)`}]*/g)].map((m) => m[0].trim());
  assert.deepEqual(ripieghi, []);
});
