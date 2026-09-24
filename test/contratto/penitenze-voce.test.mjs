// LE PENITENZE CONTANO IL PARLATO. La pagina della voce mandava al server solo
// le frasi con una parola chiave dei comandi: il resto di quello che si dice
// non arrivava mai al conteggio, e una penitenza «vietata la parola» finiva
// sempre a zero. Ora il parlato intero viaggia su una strada sua, solo mentre
// una penitenza e' in corso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PenitenzeEngine } from '../../src/features/penitenze.js';

const leggi = (via) => readFileSync(new URL(`../../${via}`, import.meta.url), 'utf8');
const VOCE = leggi('src/web/public/voce.js');
const SRV = leggi('src/web/server.js');

test('una frase intera detta durante la penitenza conta ogni volta la parola vietata', () => {
  const e = new PenitenzeEngine({ say: () => {}, effects: { emit: () => {} } });
  e.cfg = () => ({ penitenzeTolleranza: 80 });
  e._salva = () => {};
  e.attive.set('tizio', [{ id: 1, modo: 'vieta', tipo: 'parola', valore: 'cioe', count: 0, scadenza: Date.now() + 60000 }]);
  e.controllaVoce('tizio', 'allora cioè stavo dicendo che cioè non lo so');
  assert.equal(e.attive.get('tizio')[0].count, 2);
});

test('la pagina della voce manda il parlato intero, e solo mentre c\'e\' una penitenza', () => {
  assert.match(VOCE, /if \(finale && penitenzaInCorso\) \{/);
  assert.match(VOCE, /fetch\('\/api\/streamer\/voce\/penitenza', \{\n\s*method: 'POST'/);
  assert.match(VOCE, /timerPenitenza = setInterval\(guardaPenitenza, 4000\)/);
  assert.match(VOCE, /if \(timerPenitenza\) \{ clearInterval\(timerPenitenza\); timerPenitenza = null; \}\n\s*penitenzaInCorso = false;/, 'fermando l\'ascolto si smette anche di mandare');
});

test('il conteggio passa da una strada sola', () => {
  const chiamate = SRV.match(/penitenze\??\.controllaVoce\(/g) || [];
  assert.equal(chiamate.length, 1, 'una parola chiave detta dentro una frase non conta due volte');
  const rotta = SRV.slice(SRV.indexOf("app.post('/api/streamer/voce/penitenza'"), SRV.indexOf("app.post('/api/streamer/voce/penitenza'") + 700);
  assert.match(rotta, /esigiFunzione\(req, res, 'voce'/, 'serve il piano dei comandi vocali, come le penitenze');
  assert.match(rotta, /if \(inCorso\) \{ try \{ manager\.penitenze\.controllaVoce\(login, frase\)/, 'senza penitenze in corso non si conta niente');
});
