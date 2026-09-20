// DA OGNI SCHEDA SI ARRIVA ALLE SORELLE.
//
// Il ragionamento sta in docs/SORELLE.md. Che la barra COMPAIA lo misura
// `scripts/verifica-sorelle.mjs`, aprendo il pannello. Qui si tiene ferma la
// cosa che un browser non vede: che la regola sia UNA, e che non abbia
// mangiato la funzione che risponde a un'altra domanda.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const PKG = JSON.parse(readFileSync(join(RAD, 'package.json'), 'utf8'));

test('le sorelle si ricavano, non si tengono in un terzo elenco', () => {
  // Un elenco scritto a mano di «chi sta con chi» sarebbe la terza copia di una
  // cosa che GRUPPI e FAMIGLIE dicono gia', e un giorno direbbe altro.
  assert.match(APP, /function sorelleDi\(id\) \{[\s\S]*const f = famigliaDi\(id\);[\s\S]*elencoGruppi\(\)/);
  assert.match(APP, /function barraFamigliaHtml\(id\) \{\s*const f = sorelleDi\(id\);/,
    'la barra chiede le sorelle, non la famiglia');
});

test('e `famigliaDi` e\' rimasta quella di prima', () => {
  // Risponde a un'altra domanda, e da quella dipendono il titolo della pagina e
  // quale voce del menu si accende. Se tornasse anche i gruppi, il titolo
  // ripeterebbe il nome del gruppo e nel menu si accenderebbero tutte le voci
  // insieme.
  assert.match(APP, /const famigliaDi = \(scheda\) => FAMIGLIE\.find\(\(f\) => f\.parti\.includes\(scheda\)\) \|\| null;/);
});

test('i nomi nella barra sono quelli che hai letto nel menu', () => {
  assert.match(APP, /etichette: new Map\(g\.schede\.map\(\(\[sid, nome\]\) => \[sid, tScheda\(sid, nome\)\]\)\)/);
  assert.match(APP, /f\.etichette\?\.get\(p\) \|\|/, 'e vincono su quelli lunghi');
});

test('il cancello che lo guarda gira insieme agli altri', () => {
  assert.match(PKG.scripts.cancelli, /verifica-sorelle\.mjs/);
});
