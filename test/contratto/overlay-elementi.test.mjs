// TUTTO QUELLO CHE COMPARE NELL'OVERLAY E' UN ELEMENTO DELLA SCENA.
//
// Prima non era cosi': alert, chat e i due widget erano elementi — si
// accendevano, si spostavano, si vestivano dallo stesso posto — mentre i
// contatori vivevano per conto loro (posizione e colori propri, nessun
// interruttore nell'elenco) e l'obiettivo non esisteva. Due sistemi per mettere
// roba sulla stessa tela.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const APP = leggi('src/web/public/app.js');
const OVL = leggi('src/web/public/overlay-app.js');
const SKIN = leggi('src/web/public/overlay-skin.css');
const SRV = leggi('src/web/server.js');

test('l’elenco degli elementi e quello che l’overlay mostra dicono le stesse cose', () => {
  const i = APP.indexOf('<div class="ovl-elementi">');
  const elenco = APP.slice(i, APP.indexOf('</div>', i));
  const nel = [...elenco.matchAll(/ovlElemento\('([a-z]+)'/g)].map((m) => m[1]);
  const difetto = SRV.match(/const _mostraDefault = \(\) => \(\{([^}]*)\}\)/)[1];
  const noti = [...difetto.matchAll(/([a-z]+):/g)].map((m) => m[1]);
  assert.deepEqual([...nel].sort(), [...noti].sort(), 'stessi elementi nel pannello e nel server');
  for (const k of ['alert', 'chat', 'wf', 'ws', 'effetti', 'cont', 'goal']) {
    assert.ok(nel.includes(k), `c'è «${k}»`);
  }
});

test('anche i contatori si spengono dall’elenco, e si vestono come gli altri', () => {
  const i = OVL.indexOf('function contatore(');
  const corpo = OVL.slice(i, OVL.indexOf('\n}', i));
  assert.ok(corpo.includes("mostra('cont')"), 'seguono l’interruttore della scena');
  assert.ok(corpo.includes('ovl-widget'), 'e la veste degli altri elementi');
  assert.ok(corpo.includes("setProperty('--fg'"), 'quel che imposti a mano continua a vincere');
});

test('l’obiettivo è un elemento come gli altri', () => {
  const i = OVL.indexOf('function goal(');
  const corpo = OVL.slice(i, OVL.indexOf('\n}', i));
  assert.ok(corpo.includes("mostra('goal')"), 'si spegne dall’elenco');
  assert.ok(corpo.includes('MIO.xy.goal'), 'si può spostare come gli altri');
  assert.ok(corpo.includes('classiIdentita'), 'si veste come gli altri');
  assert.ok(corpo.includes("Math.min(100"), 'la barra non supera il traguardo');
});

test('un’opacità senza unità spegnerebbe tutti gli sfondi', () => {
  // Il difetto: --op: 85 (senza %) rende invalido color-mix, e l'elemento resta
  // trasparente. Fuori dalla scatola l'overlay non aveva sfondi: né gli alert,
  // né la chat, né i widget.
  const nude = [...SKIN.matchAll(/--op:\s*(\d+)\s*;/g)].map((m) => m[0]);
  assert.deepEqual(nude, [], 'ogni opacità porta il suo %');
  assert.ok(/--op:\s*\d+%;/.test(SKIN), 'e le percentuali ci sono');
});

test('l’overlay non veste i colori di un’altra azienda', () => {
  assert.ok(!/#9146ff|145,\s*70,\s*255/i.test(SKIN), 'niente viola di Twitch nella pelle');
  assert.ok(!/#9146ff|145,\s*70,\s*255/i.test(leggi('src/web/public/overlay.html')), 'né nella pagina');
});
