// LA SCHEDA «CHI ENTRA» E LA TRACCIA CHE CI PASSA DENTRO.
//
// La porta d'ingresso si scrive in una scheda sua, ma sta nella STESSA traccia
// dei canali: e' per questo che «leggi il mio server» se la porta dietro,
// l'anteprima la mostra insieme al resto e si costruisce in un giro solo. Il
// difetto da cui nasce questo collaudo e' proprio di la': il pannello scriveva
// le impostazioni del server nella traccia, e il passaggio verso il server le
// lasciava indietro — in silenzio, e senza che nessuno se ne accorgesse.
//
// Qui si fissa il contratto:
//  · quello che il pannello scrive nella traccia arriva al server, tutto;
//  · quello che torna dal server torna nel pannello, tutto;
//  · una scheda nuova non esiste finche' non e' registrata dove si registrano
//    le schede: menu, nome, icona, descrizione, aiuto, vetrina, manuale.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
const VETRINA = readFileSync(join(RAD, 'src/web/manuali.js'), 'utf8');
const VISTA = readFileSync(join(RAD, 'src/web/vetrina-vista.js'), 'utf8');

const fetta = (t, da, a) => {
  const i = t.indexOf(da);
  assert.ok(i > 0, `manca nel sorgente: ${da}`);
  const j = a ? t.indexOf(a, i) : -1;
  return t.slice(i, j > 0 ? j : i + 4000);
};

test('la traccia che parte dal pannello porta con se\' tutto quello che il pannello scrive', () => {
  const f = fetta(APP, 'function _dcsPulito()', '\nconst _dcsConta');
  for (const k of ['ruoli:', 'canali:', 'categorie:', 'risparmia:', 'server:', 'ingresso:']) {
    assert.ok(f.includes(k), `la traccia perde ${k} per strada`);
  }
  assert.match(f, /canaliDiPartenza/);
  assert.match(f, /benvenuto/);
});

test('e quella che arriva dal server torna intera nel pannello', () => {
  const f = fetta(APP, 'function _dcsPrepara(preset)', '\nfunction _dcsPulito');
  for (const k of ['server:', 'ingresso:', 'canaliDiPartenza:', 'benvenuto:', 'domande:']) {
    assert.ok(f.includes(k), `il pannello non rilegge ${k}`);
  }
});

test('una risposta senza titolo non parte, e una domanda senza risposte nemmeno', () => {
  const f = fetta(APP, 'function _dcsPulito()', '\nconst _dcsConta');
  assert.match(f, /\.filter\(\(r\) => String\(r\.titolo \|\| ''\)\.trim\(\)\)/);
  assert.match(f, /\.filter\(\(d\) => String\(d\.titolo \|\| ''\)\.trim\(\) && d\.risposte\.length\)/);
});

test('la verifica sta in «Chi entra», e le impostazioni non se la mangiano', () => {
  const imp = fetta(APP, 'function _dcsImpDisegna()', '\nfunction _dcsImpLeggi');
  assert.ok(!imp.includes("tendina('verifica'"), 'la verifica parla di chi entra, non di com\'e\' messo il server');
  const leggi = fetta(APP, 'function _dcsImpLeggi()', '\nfunction _dcsDisegna');
  assert.match(leggi, /prima\.verifica !== undefined/, 'senza questa riga, toccare una tendina cancellerebbe la verifica');
  assert.match(APP, /id="dce-liv" data-dce="verifica"/);
});

test('guardare, salvare e costruire sono uno solo per le due schede', () => {
  for (const f of ['_dcsSalvaTraccia', '_dcsVedi', '_dcsFai']) {
    const quante = APP.split('async function ' + f).length - 1;
    assert.equal(quante, 1, `${f} e' scritta ${quante} volte: due copie divergono al primo cambiamento`);
  }
  assert.match(APP, /_dcsVedi\('dcs'\)/);
  assert.match(APP, /_dcsVedi\('dce'\)/);
  assert.match(APP, /_dcsFai\('dcs'\)/);
  assert.match(APP, /_dcsFai\('dce'\)/);
});

test('passare da una scheda all\'altra non ributta via quello che stavi scrivendo', () => {
  const f = fetta(APP, 'async function caricaDcServer()', '\nfunction pannelloChiEntra');
  assert.match(f, /if \(_dcs\) \{ _dcsMostra\(\); return; \}/,
    'rileggere vorrebbe dire ripartire dalla traccia salvata');
});

test('toccare la traccia spegne il «Costruisci» di tutte e due le schede', () => {
  const f = fetta(APP, 'function _dcsTocca()', '\nconst DCS_VERIFICA');
  assert.match(f, /dcs-costruisci/);
  assert.match(f, /dce-costruisci/);
  assert.match(f, /dcs-diff/);
  assert.match(f, /dce-diff/);
});

test('la porta compare nell\'anteprima, col motivo per cui Discord direbbe di no', () => {
  assert.match(SRV, /ingresso: a\.differenza\.ingresso \|\| null/);
  const f = fetta(APP, 'function _dcsDiffHtml(d)', '\nfunction _dcsGiroHtml');
  assert.match(f, /d\.ingresso/);
  assert.match(f, /d\.ingresso\.blocco/);
});

test('«leggi il mio server» legge anche la porta, e solo dove Discord ce l\'ha', () => {
  const f = fetta(SRV, "app.post('/api/streamer/dcserver/dalserver'", '\n  }));');
  assert.match(f, /dcApi\.benvenuto\(token, guild\)/);
  assert.match(f, /dcApi\.ingresso\(token, guild\)/);
  assert.match(f, /includes\('COMMUNITY'\)/, 'senza Community quelle due porte non rispondono');
  assert.match(f, /dallaFotografia\(foto, \{ porta \}\)/);
});

test('il pannello sa dire se il server e\' di tipo Community', () => {
  assert.match(SRV, /community = \(ss\.caratteristiche \|\| \[\]\)\.includes\('COMMUNITY'\)/);
  assert.match(APP, /_dcs\.community === false/);
});

test('la scheda e\' registrata dove si registrano le schede', () => {
  assert.match(APP, /parti: \['ruoli', 'dcavvisi', 'dcserver', 'dcentra'\]/, 'la barra della famiglia Discord');
  assert.match(APP, /SOLO_DISCORD = new Set\(\[[^\]]*'dcentra'/, 'chi entra solo da Discord deve vederla');
  assert.match(APP, /\n {2}dcentra: \['Chi entra nel server'/, 'il nome della scheda');
  assert.match(APP, /\n {2}dcentra: \['Chi entra', /, 'il nome corto nella barra');
  assert.match(APP, /\n {2}dcentra: {5}_ico\(/, 'l\'icona');
  assert.match(APP, /\n {2}dcentra: \['Chi può scrivere appena entra/, 'la descrizione');
  assert.match(APP, /\n {2}dcentra: \{ serve: \[/, 'l\'aiuto');
  assert.match(APP, /if \(id === 'dcentra'\) \{ collegaChiEntra\(\); caricaDcServer\(\); \}/);
  assert.match(APP, /\$\{pannelloChiEntra\(\)\}/, 'la scheda dev\'essere anche montata');
});

test('e raccontata fuori, come ogni cosa che si aggiunge', () => {
  assert.match(VISTA, /scheda: 'dcentra'/, 'la vetrina');
  assert.match(VETRINA, /'dcserver', 'dcentra'/, 'il manuale');
});
