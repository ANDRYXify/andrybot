// L'ATTESA HA LA FORMA DI QUELLO CHE ARRIVA.
//
// Il ragionamento sta in docs/MOTO.md («L'attesa ha la forma di quello che
// arriva»). Qui le cose che devono restare vere:
//  · il segnaposto di un caricamento e' uno solo, `attesaHtml()`, e nessun
//    modello del pannello torna a scrivere «Caricamento…» a mano;
//  · chi usa un lettore di schermo sente ancora che sta caricando;
//  · il luccichio si ferma quando si chiede meno movimento.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const CSS = readFileSync(join(RAD, 'src/web/public/style.css'), 'utf8');

test('il segnaposto di un caricamento e\' uno solo', () => {
  const a = APP.slice(APP.indexOf('function attesaHtml('), APP.indexOf('\n}\n', APP.indexOf('function attesaHtml(')));
  assert.ok(a.includes('class="attesa"') && a.includes('class="scheletro riga"'), 'due righe che luccicano');
  assert.ok(a.includes('<span class="solo-lettore">${L(\'Caricamento…\', \'Loading…\', \'Cargando…\')}</span>'), 'e la parola per chi non vede');
  assert.ok((APP.match(/attesaHtml\(/g) || []).length >= 50, 'e lo usano tutte le schede');
  const aMano = APP.split('\n').filter((r) => /<(p|li|div)[^>]*>\$\{L\('(Caricamento|Carico)…'/.test(r));
  assert.deepEqual(aMano, [], 'nessun modello scrive l\'attesa a mano');
});

test('il luccichio si ferma con meno movimento', () => {
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\) \{ \.scheletro::after \{ animation: none; \} \}/);
  assert.match(CSS, /body\.leggero \.scheletro::after, body\.meno-moto \.scheletro::after \{ animation: none; \}/);
  assert.match(CSS, /\.solo-lettore \{[^}]*clip-path: inset\(50%\)/, 'la parola c\'e\' ma non si vede');
});
