// LA LIBRERIA: cosa ci puo' entrare, e come si migliora senza rompere nessuno.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-lib-');
const L = await import('../../src/features/morti-libreria.js');

const piena = 'a5c3966a5a3c69a5';   // 32 bit a uno: una schermata vera

test('un\'impronta piatta non si pubblica: combacerebbe con mezzo mondo', () => {
  assert.equal(L.piatta('0000000000000000'), true, 'schermo nero');
  assert.equal(L.piatta('ffffffffffffffff'), true, 'schermo bianco');
  assert.equal(L.piatta('0000000000000001'), true, 'quasi nero');
  assert.equal(L.piatta(piena), false, 'una schermata vera passa');
  assert.equal(L.piatta('zzzz'), true, 'e la robaccia non e\' un\'impronta');
  assert.equal(L.bitAUno(piena), 32);
});

test('il nome del gioco diventa una chiave sola per tutti', () => {
  const k = L.chiaveGioco('Dark Souls III');
  assert.equal(k, 'dark souls iii');
  assert.equal(L.chiaveGioco('  DARK   souls   III.  '), k, 'spazi e punti non fanno due scaffali');
  assert.equal(L.chiaveGioco('Pokémon'), 'pokemon', 'gli accenti nemmeno');
  assert.equal(L.chiaveGioco(''), '');
});

test('una scheda tiene solo quello che puo\' davvero servire', () => {
  const s = L.normScheda({ giocoNome: 'Dark Souls III', lingua: 'it', contatore: 'MORTI',
    firme: [piena, piena.toUpperCase(), '0000000000000000', 'corta', null] });
  assert.equal(s.gioco, 'dark souls iii');
  assert.equal(s.giocoNome, 'Dark Souls III');
  assert.deepEqual(s.firme, [piena], 'doppioni, piatte e robaccia restano fuori');
  assert.equal(s.contatore, 'morti');
  assert.equal(L.normScheda({ lingua: 'klingon' }).lingua, 'nessuna');
});

test('perche\' non si puo\' pubblicare si dice, invece di rifiutare e basta', () => {
  const buona = L.normScheda({ giocoNome: 'Elden Ring', firme: [piena] });
  assert.equal(L.perche(buona), '');
  assert.equal(L.perche(L.normScheda({ firme: [piena] })), 'senza-gioco');
  assert.equal(L.perche(L.normScheda({ giocoNome: 'x', firme: ['0000000000000000'] })), 'senza-impronte');
  assert.equal(L.perche(buona, { quante: L.MAX_PER_STREAMER }), 'troppe');
  assert.equal(L.perche(buona, { oggi: L.MAX_AL_GIORNO }), 'troppe-oggi');
});

test('migliorare vuol dire una versione nuova, non una scrittura sopra', () => {
  const v1 = { id: 'aaa', versione: 1, firme: [piena] };
  const altra = '5a3c69a5a5c3966a';
  const v2 = L.prossima(v1, [altra]);
  assert.equal(v2.versione, 2);
  assert.equal(v2.da, 'aaa');
  assert.equal(v2.radice, 'aaa', 'la prima versione di una cosa e\' la cosa');
  assert.deepEqual(v2.firme, [piena, altra], 'le vecchie restano: migliorare e\' aggiungere');

  const v3 = L.prossima({ id: 'bbb', radice: 'aaa', versione: 2, firme: v2.firme }, [piena]);
  assert.equal(v3.versione, 3);
  assert.equal(v3.radice, 'aaa', 'la radice si tramanda');
  assert.deepEqual(v3.firme, [piena, altra], 'un doppione non conta come miglioramento');
  assert.deepEqual(L.prossima({ id: 'c', versione: 1, firme: [] }, ['0000000000000000']).firme, [],
    'nemmeno da una versione nuova entra un\'impronta piatta');
});

test('una versione nuova si ANNUNCIA, e nient\'altro', () => {
  const mia = { versione: 2, firme: [piena] };
  const altra = '5a3c69a5a5c3966a';
  const n = L.novita(mia, { versione: 3, firme: [piena, altra], autore: 'tizio' });
  assert.deepEqual(n, { versione: 3, impronteInPiu: 1, autore: 'tizio' });
  assert.equal(L.novita(mia, { versione: 2, firme: [piena, altra] }), null, 'la stessa versione non e\' una novita\'');
  assert.equal(L.novita(mia, { versione: 1, firme: [] }), null, 'e una piu\' vecchia nemmeno');
  assert.equal(L.novita(null, { versione: 9 }), null);
});

test('prendere una scheda vuol dire COPIARSELA', () => {
  const s = { id: 'xyz', radice: 'aaa', versione: 4, giocoNome: 'Elden Ring', firme: [piena] };
  const c = L.copia(s, 'tentativi');
  assert.deepEqual(c.firme, s.firme);
  assert.notEqual(c.firme, s.firme, 'le impronte sono UNA COPIA: quello che succede alla libreria non la tocca');
  assert.equal(c.nome, 'Elden Ring');
  assert.equal(c.contatore, 'tentativi', 'il contatore lo sceglie chi la prende, non chi l\'ha pubblicata');
  assert.equal(c.radice, 'aaa');
  assert.equal(c.versione, 4, 'e si ricorda quale versione ha, per sapere quando ne esce una nuova');
  void usaEGetta;
});
