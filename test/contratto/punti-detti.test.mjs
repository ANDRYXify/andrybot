// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA CARTA DELLE MONETE SI CAPISCE LEGGENDOLA (docs/ECONOMIA.md, «Il pannello
// le rilegge»).
//
// Chi la usava diceva: complicata e macchinosa. Le ragioni erano quattro, e
// ognuna ha qui la sua promessa:
//  · i nomi erano quelli di dentro («Presenza (per giro)», «Partecipazione»,
//    «Nessuno supera»): ora le caselle dicono a chi e ogni quanto;
//  · la curva del silenzio erano quattro caselle slegate, con arrotondamenti
//    che nessuno puo' indovinare: ora sotto c'e' la frase che la racconta,
//    fatta con la storia del bot (economia-regole.js, storiaSilenzio);
//  · i tetti non dicevano cosa non si supera: ora una riga lo dice coi numeri;
//  · il conto della diretta stava in fondo, lontano dalle caselle che lo
//    decidono: ora sta subito sotto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const R = await import('../../src/features/economia-regole.js');

function funzione(nome) {
  const i = APP.search(new RegExp(`(?:async )?function ${nome}\\(`));
  assert.ok(i >= 0, `non trovo ${nome}`);
  let liv = 0;
  for (let j = APP.indexOf(') {', i) + 2; j < APP.length; j++) {
    if (APP[j] === '{') liv++;
    else if (APP[j] === '}' && --liv === 0) return APP.slice(i, j + 1);
  }
  throw new Error(`${nome} non si chiude`);
}
const L = (it) => it;
// eslint-disable-next-line no-new-func
const silenzioDetto = new Function('L', `${funzione('_silenzioDetto')}\nreturn _silenzioDetto;`)(L);
const detto = (regole) => silenzioDetto(R.storiaSilenzio(regole));

test('la storia di chi guarda senza scrivere, detta come succede', () => {
  const chi = 'Così, chi resta in chat senza scrivere';
  assert.equal(detto({ perPresenza: 1, perAttivita: 5, lurkPasso: 0.05, lurkMinimo: 0.15 }),
    `${chi} ne prende 1 ogni 5 minuti per i primi 50 minuti, poi più niente.`, 'il caso della foto: il minimo del 15% di 1 fa zero');
  assert.equal(detto({ perPresenza: 5, pienoMin: 30, lurkPasso: 0.15, lurkMinimo: 0.35, stopMin: 120 }),
    `${chi} ne prende 5 ogni 5 minuti per i primi 30 minuti, poi sempre meno fino a 2 dal minuto 50, e dal minuto 120 più niente.`);
  assert.equal(detto({ perPresenza: 10, lurkPasso: 0.25, lurkMinimo: 0.5, stopMin: 60 }),
    `${chi} ne prende 8 ogni 5 minuti per i primi 5 minuti, poi 5, e dal minuto 60 più niente.`);
  assert.equal(detto({}), `${chi} ne prende 4 ogni 5 minuti per i primi 10 minuti, poi sempre meno fino a 2 dal minuto 20.`, 'i valori di serie');
  assert.equal(detto({ perPresenza: 10, lurkPasso: 0 }), `${chi} ne prende 10 ogni 5 minuti, sempre.`);
  assert.equal(detto({ perPresenza: 0 }), `${chi} non ne prende.`);
});

test('le righe sotto le caselle: chi scrive, i tetti, e cosa succede a canale fermo', () => {
  const el = {};
  const documento = { getElementById: (id) => (el[id] ||= { textContent: '' }) };
  const dice = new Function('L', 'document', '_silenzioDetto', '_cifraPunti', `${funzione('_dicePunti')}\nreturn _dicePunti;`)(
    L, documento, silenzioDetto, (x) => Number(x).toLocaleString('it-IT'));
  dice(R, {});
  assert.equal(el['pt-dice-guardano'].textContent, 'Così, ogni 5 minuti chi scrive ne prende 10: un abbonato 15, un VIP 13.');
  assert.equal(el['pt-dice-tetti'].textContent, 'Così, nessun tetto: quello che arriva da solo non si ferma.');
  dice(R, { tettoDiretta: 500, saldoMax: 20000 });
  assert.equal(el['pt-dice-tetti'].textContent, 'Così, in una diretta nessuno ne prende più di 500 da sole, e chi ne ha già 20.000 non ne riceve più da sole.');
  dice(R, { auto: false });
  assert.match(el['pt-dice-guardano'].textContent, /^Così da sole non arrivano/);
  assert.equal(el['pt-dice-silenzio'].textContent, 'Così, chi resta in chat senza scrivere non ne prende.');
  dice(R, { perPresenza: 0, perAttivita: 0 });
  assert.equal(el['pt-dice-guardano'].textContent, 'Così, ogni 5 minuti non arriva niente a nessuno.');
});

test('le righe si rifanno a ogni tasto, con le regole del bot e non con una copia', () => {
  const conti = funzione('contiPunti');
  assert.match(conti, /const regole = await import\('\/js\/economia-regole\.js'\);\s*_dicePunti\(regole, puntiDalPannello\(\)\);/,
    'prima della chiamata al server: le righe non aspettano la rete');
  for (const id of ['pt-dice-guardano', 'pt-dice-silenzio', 'pt-dice-tetti']) assert.match(APP, new RegExp(`<p class="pt-dice" id="${id}" aria-live="polite"></p>`));
});

test('i nomi di dentro non ci sono più, e il conto della diretta sta sotto le caselle che lo decidono', () => {
  for (const vecchio of ['Presenza (per giro)', 'Partecipazione (in più)', 'Moltiplicatore abbonati', 'Presenza piena per (minuti)', 'Poi cala a ogni giro di (%)', 'Nessuno supera (0 = senza)', 'Chi sta in silenzio']) {
    assert.ok(!APP.includes(vecchio), `«${vecchio}» non c'è più`);
  }
  const ordine = ['id="pt-perPresenza"', 'id="pt-dice-guardano"', 'id="pt-pienoMin"', 'id="pt-dice-silenzio"', 'id="pt-saldoMax"', 'id="pt-dice-tetti"', 'id="pt-conti"', 'Quanto durano', 'id="btn-salva-punti"'].map((x) => APP.indexOf(x));
  assert.ok(ordine.every((x) => x > 0), 'ci sono tutti');
  assert.deepEqual([...ordine].sort((a, b) => a - b), ordine, 'nell\'ordine: ogni riga sotto le sue caselle, e il conto subito dopo i tetti');
});
