// UN VIDEO NEL PLAYER. Spotify non da' un video del brano: il video e' dello
// streamer, un effetto caricato. Il dato e' un riferimento come per gli alert,
// il server lo risolve in indirizzo, e un traduttore solo (letto da tela e
// diretta) lo mette dove la configurazione dice: sfocato sullo sfondo o in
// chiaro sulla copertina, mai sui temi vinile e CD.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normMusica, SFONDO_MUS, COVER_MUS } from '../../src/web/stile.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const PRESET = leggi('src/web/public/presets.js');
const APP = leggi('src/web/public/app.js');
const OVL = leggi('src/web/public/overlay-app.js');
const SKIN = leggi('src/web/public/overlay-skin.css');
const AL = leggi('src/features/alerts.js');

test('il dato: un riferimento a un effetto, ripulito; «video» fra gli sfondi e le copertine', () => {
  assert.ok(SFONDO_MUS.includes('video') && COVER_MUS.includes('video'));
  assert.equal(normMusica({ video: 'effetto:Loop_Neon' }).video, 'effetto:loop_neon');
  assert.equal(normMusica({ video: 'https://altrove.example/x.mp4' }).video, '', 'un indirizzo qualunque non passa: solo un effetto tuo');
  assert.equal(normMusica({ video: 'effetto:' + 'a'.repeat(40) }).video, '');
  assert.equal(normMusica({}).video, '');
  assert.ok(/video: ''/.test(APP.slice(APP.indexOf('function _defMusica() {'), APP.indexOf('function _PV()'))), 'il pannello parte senza video');
});

test('il server risolve il riferimento in indirizzo, solo se e\' davvero un video', () => {
  assert.match(AL, /musica: this\._musicaConVideo\(channel, s\.overlayMusica\),/);
  const corpo = AL.slice(AL.indexOf('_musicaConVideo(channel, m) {'), AL.indexOf('_risolviEffetto(channel, ref) {'));
  assert.ok(corpo.includes("videoUrl: v && v.tipo === 'video' ? v.url : ''"), 'un\'immagine scelta per sbaglio non diventa un video');
  assert.ok(corpo.includes('return null') && corpo.includes("typeof m !== 'object'"), 'senza player, niente');
});

test('un traduttore solo: la diretta e la tela chiamano PLAYER_VARS.video, e i temi vinile e CD non lo mettono sulla copertina', () => {
  assert.equal((OVL.match(/window\.PLAYER_VARS\.video\(el, cfg, cfg\.videoUrl \|\| ''\)/g) || []).length, 1, 'la diretta lo chiama con l\'indirizzo risolto dal server');
  assert.equal((APP.match(/window\.PLAYER_VARS\.video\(box, cfg, urlEffetto\(cfg\.video\)\)/g) || []).length, 1, 'la tela lo chiama con l\'indirizzo della libreria');
  assert.match(PRESET, /const TEMI_SENZA_VIDEO = \['vinile', 'cd'\];/);
  const corpo = PRESET.slice(PRESET.indexOf('video(el, cfg, url) {'), PRESET.indexOf('applica(el, cfg) {'));
  assert.ok(corpo.includes("'.m-sfondo': !!url && c.sfondo === 'video'"), 'sullo sfondo quando lo sfondo e\' «video»');
  assert.ok(corpo.includes("'.m-disco': !!url && c.cover === 'video' && TEMI_SENZA_VIDEO.indexOf(c.tema || 'nessuno') < 0"), 'sulla copertina quando la copertina e\' «video», e il tema lo permette');
  assert.ok(corpo.includes("if (v.getAttribute('src') !== url) { v.setAttribute('src', url); v.load(); }"), 'l\'indirizzo cambia solo se e\' cambiato: il player si ridisegna a ogni lettura, il video non ricomincia');
  assert.ok(corpo.includes("prefers-reduced-motion: reduce") && corpo.includes('if (fermo) v.pause();'), 'chi ha chiesto meno movimento vede il primo fotogramma');
  assert.ok(corpo.includes('v.muted = true; v.loop = true;'), 'muto e in loop: e\' un fondale');
  assert.ok(corpo.includes("if (!dove[sel]) { if (v) v.remove(); continue; }"), 'tolto il video, il nodo sparisce');
});

test('il foglio: il video riempie la sua scatola, lo sfondo video ha velo e sfocatura come la copertina', () => {
  assert.match(SKIN, /\.ovl-musica \.m-video \{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: inherit; pointer-events: none; \}/);
  assert.match(SKIN, /\.ovl-musica\.sfondo-video \.m-sfondo \{ opacity: \.62; filter: blur\(14px\) saturate\(1\.3\); \}/);
  assert.match(SKIN, /\.ovl-musica\.sfondo-copertina \.m-velo::after, \.ovl-musica\.sfondo-video \.m-velo::after \{/);
  assert.match(SKIN, /\.ovl-musica\.cover-video \.m-disco \{ overflow: hidden; \}/);
});

test('il pannello offre le due scelte e la tendina del video si riempie dagli Effetti', () => {
  assert.match(APP, /\['video', L\('il mio video, in chiaro'/, 'copertina');
  assert.match(APP, /\['video', L\('il mio video, sfocato'/, 'sfondo');
  assert.match(APP, /<select data-c="video" id="mus-video">/, 'la tendina del video e\' un campo del player');
  assert.match(APP, /const video = \(effetti \|\| \[\]\)\.filter\(\(e\) => e\.tipo === 'video'\);/, 'solo i video, dagli Effetti');
});
