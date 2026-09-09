// I CONTI SI FANNO CONTANDO.
//
// «4+4» non e' una domanda da modello linguistico: e' un calcolo. Un 7B su CPU
// che risponde «8» lo fa per somiglianza, non perche' ha contato, e sopra i
// numeri piccoli sbaglia. La macchina sa fare quella somma in un microsecondo
// ed e' sempre giusta.
//
// Le due meta' del contratto, e la seconda conta quanto la prima:
//  · quando E' un conto, il risultato e' esatto;
//  · quando NON e' un conto, tace. Un bot che risponde «12» a chi parlava
//    d'altro e' piu' fastidioso di un bot che non risponde.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { risolvi, risolviSpiegando, scrivi } from '../../src/features/conti.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const val = (t) => risolvi(t)?.risultato;

test('le quattro operazioni, e la precedenza giusta', () => {
  assert.equal(val('4+4'), 8);
  assert.equal(val('10-3'), 7);
  assert.equal(val('7*8'), 56);
  assert.equal(val('100/4'), 25);
  assert.equal(val('2+3*4'), 14, 'la moltiplicazione viene prima');
  assert.equal(val('(2+3)*4'), 20, 'le parentesi vincono');
  assert.equal(val('2^3^2'), 512, 'la potenza si associa a destra');
  assert.equal(val('-4+10'), 6);
});

test('come si scrive in chat, non come si scrive in un compito', () => {
  assert.equal(val('quanto fa 4+4?'), 8);
  assert.equal(val('bot quanto fa 12*7'), 84);
  assert.equal(val('7 x 8'), 56);
  assert.equal(val('10 diviso 4'), 2.5);
  assert.equal(val('5 più 3 meno 2'), 6, 'le parole accentate contano come simboli');
  assert.equal(val('3 per 4'), 12);
  assert.equal(val('20% di 90'), 18);
});

test('la virgola decimale', () => {
  assert.equal(val('3,5+1,5'), 5);
  assert.equal(val('2.25*4'), 9);
});

test('quello che e\' ambiguo non si indovina: si tace', () => {
  assert.equal(risolvi('1.000+1'), null, '«1.000» in italiano e\' mille, e non c\'e\' modo di saperlo');
  assert.equal(risolvi('1,2,3+1'), null);
});

test('quando non e\' un conto, tace', () => {
  for (const t of ['ciao come va', 'ho 2 gatti e 3 cani', 'sono le 4', 'gg', '', 'ahahah',
    'il 4 è il mio numero', 'guarda che roba']) {
    assert.equal(risolvi(t), null, `non deve rispondere a: ${t}`);
  }
});

test('non si blocca e non esplode', () => {
  assert.equal(risolvi('4/0'), null, 'diviso zero non ha risposta');
  assert.equal(risolvi('9^9^9'), null, 'un elevamento enorme non e\' una domanda');
  assert.equal(risolvi('9'.repeat(200) + '+1'), null, 'un messaggio lunghissimo non si guarda nemmeno');
  const t0 = Date.now();
  risolvi('((((((((((1+1))))))))))*' + '2*'.repeat(40) + '2');
  assert.ok(Date.now() - t0 < 200, 'resta istantaneo');
});

test('il comando esplicito dice PERCHE\' non torna', () => {
  assert.match(risolviSpiegando('4/0').errore, /zero/);
  assert.match(risolviSpiegando('9^9^9').errore, /grande/);
  assert.equal(risolviSpiegando('4+4').risultato, 8);
});

test('i numeri si scrivono all\'italiana', () => {
  assert.equal(scrivi(8), '8');
  assert.equal(scrivi(2.5), '2,5');
  assert.equal(scrivi(100 / 7), '14,285714');
});

test('il conto non passa dal modello, e viene prima di tutto', () => {
  // Il collegamento: senza, tutto quanto sopra passa e in chat non cambia niente.
  const brain = readFileSync(join(RAD, 'src/ai/brain.js'), 'utf8');
  const i = brain.indexOf('INTENTI FATTUALI');
  const j = brain.indexOf('che gioco / a cosa giochi', i);
  assert.ok(i > 0 && j > i, 'la catena degli intenti si trova');
  assert.ok(brain.slice(i, j).includes('conti.risolvi('),
    'il conto sta in cima alla catena, prima di ogni altro intento e del modello');
});

test('nessun eval: il testo di uno sconosciuto non si esegue', () => {
  const src = readFileSync(join(RAD, 'src/features/conti.js'), 'utf8');
  const codice = src.replace(/\/\/[^\n]*/g, '');
  assert.ok(!/\beval\s*\(/.test(codice), 'niente eval');
  assert.ok(!/new\s+Function\s*\(/.test(codice), 'niente new Function');
});
