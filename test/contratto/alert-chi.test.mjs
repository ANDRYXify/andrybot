// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// «CHI LO MOSTRA»: il pannello e il server dicono la stessa cosa.
//
// La scelta passa per tre posti: il pannello la scrive, il server la tiene
// (src/web/stile.js, chiAlertOk), il motore degli alert la legge. La regola
// vera e' provata sul motore in test/unita/alert-chi.test.mjs; qui si tiene
// fermo il viaggio:
//  · il pannello offre la scelta sugli stessi eventi e con gli stessi valori
//    che il server accetta, e la raccoglie quando salva;
//  · il server la tiene per ognuno dei cinque eventi, col suo nome;
//  · con «Twitch» il resto del blocco si chiude, sia quando si apre il pannello
//    sia quando si cambia la scelta, e la nota porta alla guida di Twitch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHI_ALERT, EVENTI_TWITCH } from '../../src/web/stile.js';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');

const tratto = (testo, da, a) => {
  const i = testo.indexOf(da);
  assert.ok(i >= 0, `non trovo «${da}»`);
  const j = testo.indexOf(a, i + da.length);
  assert.ok(j > i, `«${da}» non si chiude`);
  return testo.slice(i, j);
};

test('il pannello offre la scelta sugli eventi di Twitch, coi valori che il server tiene', () => {
  const tipi = tratto(APP, 'const ALERT_TIPI = () => [', '\n];');
  const conScelta = [...tipi.matchAll(/\{ key: '([a-z]+)', twitch: true,/g)].map((m) => m[1]);
  assert.deepEqual(conScelta.sort(), [...EVENTI_TWITCH].sort());
  const opts = tratto(APP, 'const CHI_ALERT_OPTS = () => [', ';\n');
  assert.deepEqual([...opts.matchAll(/\['([a-z]+)', /g)].map((m) => m[1]), CHI_ALERT);
});

test('il pannello la raccoglie quando salva, e la rimette da un modello salvato', () => {
  const raccogli = tratto(APP, 'function _raccogliAlerts() {', '\n}\n');
  assert.match(raccogli, /chi: b\.querySelector\('\.al-chi'\)\?\.value \|\| 'socialbot',/);
  const riempi = tratto(APP, 'function _riempiConfig(d) {', '\n}\n');
  assert.match(riempi, /_impostaEl\(b\.querySelector\('\.al-chi'\), c\.chi\); chiAlertMostra\(b\);/,
    'rimessa la scelta, il blocco si apre o si chiude di conseguenza');
});

test('il server tiene la scelta per ognuno dei cinque eventi, col suo nome', () => {
  const blocco = tratto(SRV, 'const evt = (kind, e) => {', 'out.chatOverlay');
  assert.match(blocco, /chi: chiAlertOk\(kind, e\.chi\),/);
  for (const k of ['follow', 'sub', 'cheer', 'raid', 'donazione']) {
    assert.ok(blocco.includes(`evt('${k}', p.${k})`), `${k}: normalizzato col nome sbagliato o senza`);
  }
});

test('con «Twitch» il blocco si chiude, all\'apertura e al cambio, e la nota porta alla guida di Twitch', () => {
  const blocco = tratto(APP, 'function bloccoAlert(t, a) {', '\n}\n');
  assert.match(blocco, /<div class="al-nostro"\$\{chi === 'twitch' \? ' hidden' : ''\}>/);
  assert.ok(blocco.indexOf('class="al-nostro"') < blocco.indexOf('class="btn secondario mini al-prova"'), 'la prova sta dentro quello che si chiude');
  const mostra = tratto(APP, 'function chiAlertMostra(b) {', '\n}\n');
  assert.match(mostra, /nostro\.hidden = sel\.value === 'twitch';/);
  assert.match(mostra, /nota\.innerHTML = notaChiAlert\(sel\.value\);/);
  assert.match(APP, /closest\('\.al-chi'\);\n\s+if \(sel\) chiAlertMostra\(sel\.closest\('\.alert-blocco'\)\);/);
  const nota = tratto(APP, 'function notaChiAlert(chi) {', '\n}\n');
  assert.equal((nota.match(/\+ ' ' \+ link;/g) || []).length, 3, 'ogni nota porta alla guida');
  assert.match(APP, /const ALERT_TWITCH_AIUTO = 'https:\/\/link\.twitch\.tv\/SettingUpTwitchAlerts';/);
});
