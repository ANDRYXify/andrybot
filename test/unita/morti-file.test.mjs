// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL CONTO SCRITTO IN UN FILE (src/features/morti.js, contaDaFile).
//
// DSDeaths legge le morti dalla memoria dei souls e le scrive in un file, un
// numero e basta. Il pannello legge il file e manda qui il numero. Qui si prova
// la regola che decide quante morti sono nuove:
//  · la prima lettura di chi guarda non conta mai, nemmeno contro un numero
//    ricordato da ieri;
//  · conta il salto in su, e solo in diretta, e solo con un contatore scelto;
//  · sceso, salto enorme, file cambiato: si ribasa e non si conta;
//  · il ricordo si aggiorna anche quando non si conta;
//  · il ricordo e' suo, e non tocca quello dei giochi che parlano da soli;
//  · dal file si legge un numero solo, o niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-morti-file-');
const { statoVivo, gsiStato } = await import('../../src/db.js');
const M = await import('../../src/features/morti.js');
const { MAX_SALTO } = await import('../../src/features/gsi.js');
process.on('exit', () => usaEGetta.pulisci());

globalThis.window = globalThis;
await import(pathToFileURL(join(process.cwd(), 'src/web/public/morti.js')).href);
const B = globalThis.SB_MORTI;

const CH = 'souls_tizio';
const GIRO = '0f3c2a9e-1111-4a2b-9c3d-5e6f7a8b9c0d';
const ALTRO_GIRO = '7a7a7a7a-2222-4a2b-9c3d-5e6f7a8b9c0d';

function prova({ inOnda = true, contatore = 'morti' } = {}) {
  const fatte = [];
  const leggi = (totale, { giro = GIRO, nome = 'DSDeaths.txt' } = {}) =>
    M.contaDaFile(CH, { totale, nome, giro }, { contatore, inOnda, esegui: (id) => fatte.push(id) });
  return { leggi, fatte };
}

test('la prima lettura non conta, il salto in su si', () => {
  statoVivo.togli(CH, 'morti:file');
  const { leggi, fatte } = prova();
  assert.deepEqual(leggi(37), { ok: true, contate: 0, inOnda: true }, 'le 37 morti di prima non sono successe adesso');
  assert.equal(leggi(38).contate, 1);
  assert.equal(leggi(40).contate, 2);
  assert.equal(leggi(40).contate, 0, 'lo stesso numero non e\' una morte');
  assert.deepEqual(fatte, ['contatore:piu:morti', 'contatore:piu:morti', 'contatore:piu:morti']);
});

test('chi comincia a guardare non si confronta col numero di ieri', () => {
  statoVivo.togli(CH, 'morti:file');
  const ieri = prova();
  ieri.leggi(30);
  const oggi = prova();
  assert.equal(oggi.leggi(33, { giro: ALTRO_GIRO }).contate, 0, 'tre morti fatte a pannello chiuso, magari fuori diretta: non si contano');
  assert.equal(oggi.leggi(34, { giro: ALTRO_GIRO }).contate, 1);
  assert.equal(oggi.leggi(35).contate, 0, 'il giro vecchio che torna ribasa: due schede non contano la stessa morte');
});

test('sceso, salto enorme, file cambiato: si ribasa e non si conta', () => {
  statoVivo.togli(CH, 'morti:file');
  const { leggi } = prova();
  leggi(50);
  assert.equal(leggi(12).contate, 0, 'un altro personaggio caricato');
  assert.equal(leggi(13).contate, 1, 'e da li\' si riparte');
  assert.equal(leggi(13 + MAX_SALTO + 1).contate, 0, 'in due secondi non si muore cosi\' tante volte');
  assert.equal(leggi(13 + MAX_SALTO + 1 + MAX_SALTO).contate, MAX_SALTO, 'fino al tetto si conta tutto');
  assert.equal(leggi(99, { nome: 'Altro.txt' }).contate, 0, 'un altro file e\' un altro conto');
});

test('fuori diretta, o senza contatore, si legge ma non si conta, e il ricordo va avanti', () => {
  statoVivo.togli(CH, 'morti:file');
  const fuori = prova({ inOnda: false });
  fuori.leggi(5);
  assert.deepEqual(fuori.leggi(7), { ok: true, contate: 0, inOnda: false });
  assert.equal(statoVivo.leggi(CH, 'morti:file').morti, 7, 'se non si ricordasse, la prima lettura in diretta conterebbe le morti del pomeriggio');
  const dentro = prova();
  assert.equal(dentro.leggi(8).contate, 1, 'in diretta si conta da dove si era rimasti');
  const senza = prova({ contatore: '' });
  assert.equal(senza.leggi(9).contate, 0);
  assert.deepEqual(senza.fatte, []);
  assert.equal(prova().leggi(10).contate, 1, 'e scelto il contatore si conta dal numero giusto');
});

test('il ricordo e\' suo: i giochi che parlano da soli non lo vedono', () => {
  gsiStato.metti(CH, { partita: 'cs2|comp|de_dust2', morti: 3 });
  statoVivo.togli(CH, 'morti:file');
  const { leggi } = prova();
  leggi(3);
  leggi(4);
  assert.deepEqual({ partita: gsiStato.prendi(CH).partita, morti: gsiStato.prendi(CH).morti }, { partita: 'cs2|comp|de_dust2', morti: 3 });
});

test('quello che arriva storto non passa', () => {
  const { leggi, fatte } = prova();
  for (const totale of [-1, 1.5, '12', null, M.MAX_TOTALE + 1]) {
    assert.deepEqual(M.contaDaFile(CH, { totale, nome: 'x', giro: GIRO }, { contatore: 'morti', inOnda: true, esegui: () => fatte.push(1) }), { ok: false }, `totale ${totale}`);
  }
  for (const giro of ['', 'corto', 'CON-MAIUSCOLE-1234', 'a'.repeat(41), '<script>']) {
    assert.deepEqual(M.contaDaFile(CH, { totale: 1, nome: 'x', giro }, { contatore: 'morti', inOnda: true }), { ok: false }, `giro «${giro}»`);
  }
  assert.equal(leggi(0).ok, true, 'zero e\' un numero vero');
});

test('il contatore del file si salva, e uno storto si butta', () => {
  assert.equal(M.normalizza({ file: 'Morti!' }).file, 'morti');
  assert.equal(M.normalizza({}).file, '');
  assert.equal(M.DEFAULT.file, '');
});

test('dal file si legge un numero solo, o niente', () => {
  const casi = [['37', 37], ['37\n', 37], ['﻿37\r\n', 37], ['Deaths: 37', 37], ['00012', 12], ['0', 0],
    ['', null], ['abc', null], ['DS3: 37', null], ['12 34', null], ['123456789', null], [null, null]];
  for (const [t, n] of casi) assert.equal(B.numeroDaFile(t), n, JSON.stringify(t));
});
