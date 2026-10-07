// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL VOLUME DEI SUONI PRONTI (src/web/public/presets.js; docs/OVERLAY.md, «Lo
// zero è silenzio»). Un suono pronto a volume 0 suonava al massimo: lo zero,
// letto come «non detto», diventava 100. Toccava l'alert con la levetta del
// volume a zero, l'opzione «muto» degli effetti degli eventi (che manda
// apposta volume 0 perche' il suono lo fa gia' l'alert) e gli effetti salvati
// a zero. Il volume ha un significato solo: non detto vuol dire 100, un numero
// vale per quello che dice, e lo zero e' silenzio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const finestra = {};
// un contesto audio finto: annota il guadagno di ogni suono che parte
const guadagni = [];
class ContestoFinto {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  createGain() { const g = { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; guadagni.push(g.gain); return g; }
  createOscillator() { return { type: '', frequency: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
  createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {}, playbackRate: { value: 1, setValueAtTime() {} } }; }
  createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
  createBiquadFilter() { return { type: '', frequency: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, Q: { value: 0, setValueAtTime() {} }, connect() {} }; }
  get sampleRate() { return 44100; }
  resume() {}
}
finestra.AudioContext = ContestoFinto;
vm.runInNewContext(readFileSync(new URL('../../src/web/public/presets.js', import.meta.url), 'utf8'), { window: finestra, document: {} });
const P = finestra.SUONI_PRESET;

test('il volume: non detto vuol dire 100, un numero vale per quello che dice, lo zero e\' silenzio', () => {
  assert.equal(P.volume(0), 0, 'lo zero e\' silenzio');
  assert.equal(P.volume('0'), 0);
  assert.equal(P.volume(50), 0.5);
  assert.equal(P.volume('70'), 0.7);
  assert.equal(P.volume(undefined), 1, 'non detto');
  assert.equal(P.volume(null), 1);
  assert.equal(P.volume(''), 1);
  assert.equal(P.volume('forte'), 1, 'quello che non e\' un numero non e\' un volume');
  assert.equal(P.volume(150), 1, 'oltre il massimo, il massimo');
  assert.equal(P.volume(-5), 0);
});

test('un suono pronto a volume 0 non suona; a 40 suona a 0,4; senza volume a pieno', () => {
  const id = P.lista[0].id;
  guadagni.length = 0;
  assert.equal(P.suona(id, 0), true, 'chiesto e fatto: in silenzio');
  assert.equal(guadagni.length, 0, 'a zero non parte niente');
  P.suona(id, 40);
  assert.equal(guadagni[0].value, 0.4, 'il primo guadagno e\' quello del suono intero');
  guadagni.length = 0;
  P.suona(id);
  assert.equal(guadagni[0].value, 1);
});
