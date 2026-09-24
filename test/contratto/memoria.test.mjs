// LA MEMORIA DEL BOT: si guarda, e un ricordo sbagliato si toglie da solo.
//
// La guida della scheda prometteva «puoi cancellare quelli sbagliati», e un
// tasto non c'era: l'unica strada era azzerare tutto. E l'azzeramento, che
// butta via mesi di lezioni, lo poteva premere anche un moderatore.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('memoria-');
const { memory } = await import('../../src/db.js');
test.after(() => casa.pulisci());

const leggi = (f) => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');

test('una lezione e un fatto si tolgono uno per volta, e solo nel proprio canale', () => {
  memory.addLesson('uno', 'la chat ride quando perdo');
  memory.addLesson('due', 'la chat ama i boss');
  memory.setFact('uno', 'gioco_recente', 'Elden Ring');
  const [lez] = memory.lessons('uno', 5);
  const [altra] = memory.lessons('due', 5);
  assert.ok(lez.id > 0, 'la lezione porta il suo id');
  assert.equal(memory.togliLezione('uno', altra.id), false, 'l\'id di un altro canale non tocca niente');
  assert.equal(memory.lessons('due', 5).length, 1);
  assert.equal(memory.togliLezione('uno', lez.id), true);
  assert.equal(memory.lessons('uno', 5).length, 0);
  assert.equal(memory.togliFatto('due', 'gioco_recente'), false);
  assert.equal(memory.togliFatto('uno', 'gioco_recente'), true);
  assert.equal(memory.facts('uno').length, 0);
});

test('togliere e\' di chi gestisce il canale, azzerare tutto solo del proprietario', () => {
  const SRV = leggi('src/web/server.js'), APP = leggi('src/web/public/app.js');
  assert.match(SRV, /app\.post\('\/api\/streamer\/memoria\/togli', requireLogin,/);
  assert.match(SRV, /app\.post\('\/api\/streamer\/memoria\/reset', requireOwner,/);
  assert.match(SRV, /fatti: memory\.facts\(login\)\.filter\(\(f\) => !String\(f\.key\)\.startsWith\('preaddestramento_'\)\)/, 'i conti interni non sono ricordi');
  assert.ok(APP.includes('data-memoria-togli="lezione"') && APP.includes('data-memoria-togli="fatto"'), 'ogni ricordo ha il suo «Togli»');
  const pannello = APP.slice(APP.indexOf('function pannelloMemoria('), APP.indexOf('\n}\n', APP.indexOf('function pannelloMemoria(')));
  assert.ok(pannello.indexOf("stato?.ruolo !== 'moderatore'") < pannello.indexOf('id="btn-reset"'), 'il moderatore non vede l\'azzeramento');
  assert.match(APP, /quelli sbagliati li togli uno per uno con «Togli»/, 'e la guida dice il tasto che c\'e\'');
});
