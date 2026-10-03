// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// UN SUONO, O UN EFFETTO, TUO DOVUNQUE SI SCEGLIE. Ogni posto del pannello
// dove si sceglie un effetto (e quindi anche un suono tuo) ha accanto «Dalla
// libreria», dove si carica anche dal computer: non si deve uscire per
// caricarlo altrove e tornare. Un tasto solo, uguale dovunque
// (tastoLibreriaHtml), che mette la scelta nella forma che quel posto usa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

test('ogni scelta di un effetto ha accanto «Dalla libreria», nella forma che quella scelta usa', () => {
  const POSTI = [
    ['l\'effetto di un premio a punti canale', /<span class="lib-scelta"><select id="premio-effetto">\$\{effOpts\}<\/select>\$\{tastoLibreriaHtml\(\)\}<\/span>/],
    ['l\'effetto di un\'offerta delle donazioni (effetto:comando)', /<span class="lib-scelta"><select class="dl-effetto">\$\{_opzioniEffetti\(l\.effetto \|\| ''\)\}<\/select>\$\{tastoLibreriaHtml\(\{ forma: 'effetto' \}\)\}<\/span>/],
    ['l\'azione «fai partire un effetto» di un comando', /<\/select>\$\{tastoLibreriaHtml\(\)\}<\/span>`;\s*\}\s*case 'punti':/],
    ['la stessa azione quando non hai ancora effetti', /<span class="lib-scelta"><input type="hidden" data-campo="comando" value="\$\{esc\(a\.comando \|\| ''\)\}">\$\{tastoLibreriaHtml\(\)\}/],
    ['l\'effetto di un gesto della webcam', /<span class="lib-scelta"><input type="text" class="trk-eff"[^\n]*\$\{tastoLibreriaHtml\(\)\}<\/span>/],
  ];
  for (const [dove, re] of POSTI) assert.match(APP, re, dove);
  assert.match(APP, /scegliDallaLibreria\(\{ tipi: b\.dataset\.libScelta\.split\(','\) \}\)/);
  assert.match(APP, /const v = b\.dataset\.libForma === 'effetto' \? 'effetto:' \+ r\.comando : r\.comando;/);
  assert.match(APP, /campo\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\);/, 'la scelta cambia come se l\'avessi fatta a mano: si salva e si segna da salvare');
});

test('il suono degli effetti pronti e dei livelli degli eventi: anche caricato li\', anche dalla libreria', () => {
  assert.match(APP, /<input type="file" id="\$\{pre\}-suono-file" accept="audio\/\*" hidden>/);
  assert.match(APP, /data-suono-carica>/);
  assert.match(APP, /data-suono-lib>/);
  assert.match(APP, /scegliDallaLibreria\(\{ tipi: \['audio'\], titolo: L\('Il suono dell\\'effetto'/);
  assert.match(APP, /if \(d\?\.tipo !== 'audio'\) throw new Error/, 'un file che non e\' un suono non diventa il suono');
});

test('le etichette dei suoni sono nelle tre lingue', () => {
  assert.ok(!/label="I miei suoni caricati"/.test(APP), 'niente etichetta solo in italiano');
});
