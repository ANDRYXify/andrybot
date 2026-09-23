// LA SCENA NUOVA PARTE DALL'INIZIO.
//
// Cambiando sezione da una pagina scorsa in giu', la nuova compariva alla
// stessa altezza della vecchia e poi scivolava su fino in cima. Il salto
// chiedeva `window.scrollTo({ top: 0, behavior: 'auto' })`, ma «auto» non vuol
// dire «subito»: vuol dire «come dice il CSS», e il CSS dice
// `html { scroll-behavior: smooth }`. La scena nuova si disegnava (e le sue
// carte entravano) mentre la pagina scorreva sotto.
//
// Il salto adesso toglie lo scorrimento morbido per il tempo della chiamata, e
// fa ricalcolare lo stile prima di saltare: senza quella lettura il browser usa
// ancora lo stile di prima, e scorre piano lo stesso. `behavior: 'instant'` non
// si usa perche' nei browser piu' vecchi e' un valore sconosciuto, e fa eccezione.
// Lo misura nel browser scripts/verifica-stacco.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
const corpoDi = (nome) => {
  const i = APP.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `c'e' ${nome}`);
  return APP.slice(i, APP.indexOf('\n}\n', i));
};

test('il salto in cima e\' un salto, qualunque cosa dica il CSS', () => {
  const salto = corpoDi('_saltaInCima');
  const righe = salto.split('\n').map((r) => r.trim());
  const togli = righe.indexOf("radice.style.scrollBehavior = 'auto';");
  const leggi = righe.indexOf('void getComputedStyle(radice).scrollBehavior;');
  const salta = righe.indexOf('window.scrollTo(0, 0);');
  const rimetti = righe.indexOf('radice.style.scrollBehavior = prima;');
  assert.ok(togli > 0 && leggi > togli && salta > leggi && rimetti > salta,
    'toglie lo scorrimento morbido, fa ricalcolare lo stile, salta, e lo rimette com\'era');
});

test('cambiando scena si salta in cima prima di mostrare la scheda nuova', () => {
  const scena = corpoDi('_cambiaScena');
  const corpo = scena.slice(scena.indexOf('const corpo = () => {'));
  const salto = corpo.indexOf('_saltaInCima();');
  const mostra = corpo.indexOf("p.classList.toggle('visibile'");
  assert.ok(salto > 0 && mostra > salto, 'prima il salto, poi la scheda nuova');
  assert.doesNotMatch(APP, /scrollTo\(\{ top: 0, behavior: 'auto' \}\)/, 'nessuno chiede piu\' «auto» credendo che sia «subito»');
});
