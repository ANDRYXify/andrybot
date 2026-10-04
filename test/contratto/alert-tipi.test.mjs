// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// OGNI TIPO DI AVVISO CHE IL PANNELLO DISEGNA SI LEGGE DA UN POSTO SOLO.
//
// I tipi d'avviso del pannello stanno in ALERT_TIPI. Le impostazioni lette dal
// server se li facevano a mano, e l'avviso delle donazioni mancava: il suo
// blocco si apriva spento e vuoto anche quando era acceso, e il primo «Salva»
// di un avviso qualunque lo spegneva davvero. Adesso le impostazioni nascono
// dall'elenco che il pannello disegna, e la soglia si legge e si scrive dal
// campo che il tipo dichiara: un tipo nuovo c'e' per costruzione.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
const corpo = (inizio, fine) => { const i = APP.indexOf(inizio); assert.ok(i >= 0, `non trovo ${inizio}`); return APP.slice(i, APP.indexOf(fine, i)); };

test('le impostazioni degli avvisi nascono dall\'elenco che il pannello disegna', () => {
  const al = corpo('    alerts: (() => {', '    chatOverlay: (() => {');
  assert.match(al, /\.\.\.Object\.fromEntries\(ALERT_TIPI\(\)\.map\(\(t\) => \[t\.key, ev\(a\[t\.key\], \{ suono: SUONO_ALERT_SERIE\[t\.key\], colore: t\.acc \}\)\]\)\)/);
  assert.doesNotMatch(al, /ev\(a\.[a-z]+,/, 'nessun tipo scritto a mano');
});

test('la soglia si rilegge dal campo che il tipo dichiara, come si salva', () => {
  const riempi = corpo('function _riempiConfig(d) {', '\n}\n');
  assert.match(riempi, /ALERT_TIPI\(\)\.find\(\(t\) => t\.key === b\.dataset\.alert\)\?\.soglia\?\.campo/);
  assert.doesNotMatch(riempi, /c\.minBits != null \? c\.minBits/, 'niente piu\' indovinare il campo');
});
