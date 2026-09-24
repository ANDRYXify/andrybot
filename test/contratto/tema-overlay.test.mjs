// OGNI CAMPO CHE L'OVERLAY LEGGE DAL TEMA, IL SERVER LO MANDA (docs/OVERLAY.md).
// La risposta di /overlay/:login/tema sceglieva i campi uno per uno, e due non
// c'erano: la classifica dei Bit non e' mai comparsa in diretta, e i caratteri
// caricati si vedevano nello Studio ma non in onda. Qui si confrontano i due
// insiemi: i campi che `applicaTema` legge, e quelli che la rotta manda.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const OVL = leggi('src/web/public/overlay-app.js');
const SRV = leggi('src/web/server.js');
const ALR = leggi('src/features/alerts.js');

const corpo = (testo, inizio) => {
  const i = testo.indexOf(inizio);
  assert.ok(i >= 0, `manca ${inizio}`);
  let d = 0, j = testo.indexOf('{', i);
  for (let k = j; k < testo.length; k++) { if (testo[k] === '{') d++; else if (testo[k] === '}') { d--; if (!d) return testo.slice(j, k + 1); } }
  return '';
};
const chiaviOggetto = (testo) => {
  const fuori = new Set();
  let d = 0;
  for (const riga of testo.slice(1, -1).split('\n')) {
    if (d === 0) { const m = /^\s*(?:\.\.\.(\w+)|(\w+)\s*:)/.exec(riga); if (m) fuori.add(m[1] ? '...' + m[1] : m[2]); }
    for (const c of riga) { if ('{(['.includes(c)) d++; else if ('})]'.includes(c)) d--; }
  }
  return fuori;
};

test('i campi del tema che l\'overlay legge arrivano tutti', () => {
  const legge = new Set([...corpo(OVL, 'function applicaTema(t)').matchAll(/\bt\.(\w+)/g)].map((m) => m[1]));
  const rotta = corpo(SRV, "app.get('/overlay/:login/tema'");
  const risposta = chiaviOggetto(corpo(rotta, 'res.json('));
  const delTema = chiaviOggetto(corpo(corpo(ALR, '  tema(channel) {'), 'return {'));
  const manda = new Set([...risposta].filter((k) => !k.startsWith('...')));
  if (risposta.has('...base')) for (const k of delTema) manda.add(k);
  const mancano = [...legge].filter((k) => !manda.has(k));
  assert.deepEqual(mancano, [], `l'overlay legge ${mancano.join(', ')} e la rotta non li manda`);
  assert.ok(legge.has('bit') && legge.has('fontPersonali'), 'la prova guarda davvero i due campi che mancavano');
});
