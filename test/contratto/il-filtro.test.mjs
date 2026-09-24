// LA SCHEDA «IL FILTRO», e il filtro che passa dentro la traccia.
//
// Cinque schede nella famiglia Discord, cinque mestieri, e ognuna lo dice dal
// nome: Ruoli come ci si collega, Avvisi dove arrivano, Il server com'e' fatto,
// Chi entra la porta, Il filtro cosa non si scrive.
import test from 'node:test';
import { testoManuali } from '../aiuto.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
const VETRINA = testoManuali();
const VISTA = readFileSync(join(RAD, 'src/web/vetrina-vista.js'), 'utf8');

const fetta = (t, da, a) => {
  const i = t.indexOf(da);
  assert.ok(i > 0, `manca nel sorgente: ${da}`);
  const j = a ? t.indexOf(a, i) : -1;
  return t.slice(i, j > 0 ? j : i + 4000);
};

test('il filtro viaggia nella traccia, andata e ritorno', () => {
  assert.match(fetta(APP, 'function _dcsPulito()', '\nconst _dcsConta'), /filtro: p\.filtro\.map/);
  assert.match(fetta(APP, 'function _dcsPrepara(preset)', '\nfunction _dcsPulito'), /filtro: preset\.filtro\.map/);
});

test('il pannello conosce i tetti di Discord invece di farli scoprire da un rifiuto', () => {
  assert.match(SRV, /tetti: dcApi\.TETTO_AUTOMOD/);
  assert.match(APP, /_dcs\?\.filtro\?\.tetti\?\.\[tipo\]/);
});

test('«leggi il mio server» legge anche le regole del filtro', () => {
  const f = fetta(SRV, "app.post('/api/streamer/dcserver/dalserver'", '\n  }));');
  assert.match(f, /dcApi\.regoleAuto\(token, guild\)/);
  assert.match(f, /regole: rr\?\.ok \? rr\.regole : null/);
});

test('l\'anteprima dice cosa fa al filtro, e cosa il filtro ha e la traccia non prevede', () => {
  assert.match(SRV, /filtro: a\.differenza\.filtro \|\| null/);
  assert.match(SRV, /fuoriFiltro: a\.fuoriFiltro \|\| \[\]/);
  const f = fetta(APP, 'function _dcsDiffHtml(d)', '\nfunction _dcsGiroHtml');
  assert.match(f, /d\.filtro\?\.crea/);
  assert.match(f, /d\.filtro\?\.togli/);
  assert.match(f, /d\.fuoriFiltro/);
});

test('guardare, salvare e costruire restano uno solo anche per la terza scheda', () => {
  for (const f of ['_dcsSalvaTraccia', '_dcsVedi', '_dcsFai']) {
    assert.equal(APP.split('async function ' + f).length - 1, 1, `${f} e' scritta piu' di una volta`);
  }
  assert.match(APP, /_dcsVedi\('dcf'\)/);
  assert.match(APP, /_dcsFai\('dcf'\)/);
  assert.match(APP, /STESSA_ROBA = \[new Set\(\['dcserver', 'dcentra', 'dcfiltro'\]\)\]/,
    'e fra le tre non si chiede di salvare: e\' una traccia sola');
});

test('la modalita\' distruttiva arriva anche qui', () => {
  assert.match(APP, /\$\{fasciaDistruttiva\('dcf'\)\}/);
  assert.match(APP, /'scheda-dcserver', 'scheda-dcentra', 'scheda-dcfiltro'/);
  assert.match(APP, /_g\('dcf-esci'\)\?\.addEventListener/);
});

test('la scheda e\' registrata dove si registrano le schede', () => {
  assert.match(APP, /\{ id: 'discord', nome: 'Discord', parti: \[[^\]]*'dcfiltro'/);
  assert.match(APP, /SOLO_DISCORD = new Set\(\[[^\]]*'dcfiltro'/);
  assert.match(APP, /\n {2}dcfiltro: \['Il filtro del server'/);
  assert.match(APP, /\n {2}dcfiltro: \['Il filtro', /);
  assert.match(APP, /\n {2}dcfiltro: {4}_ico\(/);
  assert.match(APP, /\n {2}dcfiltro: \['Le parole, le liste/);
  assert.match(APP, /\n {2}dcfiltro: \{ serve: \[/);
  assert.match(APP, /if \(id === 'dcfiltro'\) \{ collegaFiltro\(\); caricaDcServer\(\); \}/);
  assert.match(APP, /\$\{pannelloFiltro\(\)\}/);
});

test('e raccontata fuori, come ogni cosa che si aggiunge', () => {
  assert.match(VISTA, /scheda: 'dcfiltro'/);
  assert.match(VETRINA, /'dcentra', 'dcfiltro'/);
});
