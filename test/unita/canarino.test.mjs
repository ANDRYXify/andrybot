// LA FRASE-CANARINO. Le altre firme stanno nei file e chi ha il sorgente puo'
// toglierle una per una. Questa sta nel comportamento: il proprietario sceglie
// una frase, nel codice c'e' solo la sua impronta, e qualunque installazione
// che la senta in chat risponde con la proprieta'. Qui si prova che l'impronta
// non tradisce la frase, che risponde SOLO a quella, che senza impronta dorme,
// e che il gancio in src/bot.js sta dove deve stare: prima di tutto il resto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  CANARINO, FIRMA, COPYRIGHT, normalizzaCanarino, improntaCanarino, eCanarino, rispostaCanarino,
} from '../../src/watermark.js';

const FRASE = 'il gatto di Andrea suona il piffero alle tre';
const IMPRONTA = improntaCanarino(FRASE);

test('la normalizzazione toglie maiuscole, punteggiatura e spazi doppi, non le lettere', () => {
  assert.equal(normalizzaCanarino('  Il GATTO, di Andrea!!  suona   il piffero... '), 'il gatto di andrea suona il piffero');
  assert.equal(normalizzaCanarino('perché così'), 'perché così');
  assert.equal(normalizzaCanarino('ﬁne'), 'fine');
  assert.equal(normalizzaCanarino(''), '');
  assert.equal(normalizzaCanarino(null), '');
});

test('l\'impronta e\' uno sha256 esadecimale salato con la FIRMA, e da lei la frase non si ricava', () => {
  assert.match(IMPRONTA, /^[0-9a-f]{64}$/);
  const attesa = createHash('sha256').update(normalizzaCanarino(FRASE) + '|' + FIRMA).digest('hex');
  assert.equal(IMPRONTA, attesa);
  assert.notEqual(improntaCanarino('il gatto di Andrea suona il piffero alle due'), IMPRONTA);
  assert.equal(improntaCanarino(''), '');
  for (const parola of normalizzaCanarino(FRASE).split(' ')) assert.ok(!IMPRONTA.includes(parola));
});

test('con CANARINO vuota il bot dorme; accesa, in CANARINO c\'e\' un\'impronta e non la frase', () => {
  if (!CANARINO) {
    assert.equal(eCanarino(FRASE), false);
    assert.equal(eCanarino(FRASE, ''), false);
    return;
  }
  assert.match(CANARINO, /^[0-9a-f]{64}$/, 'in CANARINO va l\'impronta, mai la frase');
  assert.notEqual(CANARINO, IMPRONTA, 'la frase di questo collaudo non e\' quella del proprietario');
  assert.equal(eCanarino(FRASE), false);
});

test('riconosce la frase anche scritta diversa, e nient\'altro', () => {
  assert.equal(eCanarino(FRASE, IMPRONTA), true);
  assert.equal(eCanarino('IL GATTO DI ANDREA, SUONA IL PIFFERO ALLE TRE!', IMPRONTA), true);
  assert.equal(eCanarino('  il   gatto di andrea suona il piffero alle tre  ', IMPRONTA), true);
  assert.equal(eCanarino('il gatto di andrea suona il piffero alle tre e mezza', IMPRONTA), false);
  assert.equal(eCanarino('il gatto di andrea suona il piffero', IMPRONTA), false);
  assert.equal(eCanarino('', IMPRONTA), false);
  assert.equal(eCanarino(undefined, IMPRONTA), false);
  assert.equal(eCanarino(FRASE, IMPRONTA.slice(0, 63)), false);
  assert.equal(eCanarino(FRASE, IMPRONTA.slice(0, 63) + (IMPRONTA.endsWith('0') ? '1' : '0')), false);
});

test('la risposta dice la proprietà, la FIRMA e come si presenta il software, senza ripetersi', () => {
  const r = rispostaCanarino('Tizio — licenza tizio.live');
  assert.ok(r.includes(COPYRIGHT) && r.includes(FIRMA) && r.includes('Tizio — licenza tizio.live'));
  const senza = rispostaCanarino(`SENZA LICENZA — questo software è di ... · ${COPYRIGHT}`);
  assert.equal(senza.split(COPYRIGHT).length - 1, 1);
  assert.ok(senza.includes(FIRMA));
  assert.ok(rispostaCanarino('').includes(FIRMA));
  assert.ok(rispostaCanarino('x').length < 480);
});

test('il gancio in src/bot.js risponde prima di tutto il resto, con la voce giusta, una volta al minuto per canale', () => {
  const bot = readFileSync('src/bot.js', 'utf8');
  const inizio = bot.indexOf('_elaboraMessaggio(login, msg, onMessage, parla');
  assert.ok(inizio > 0);
  const gancio = bot.indexOf('filigrana.eCanarino(msg.text)', inizio);
  assert.ok(gancio > inizio, 'il gancio sta dentro _elaboraMessaggio');
  const tubo = bot.slice(inizio, gancio);
  assert.ok(!tubo.includes('this.comandi') && !tubo.includes('this.moderazione') && !tubo.includes('emit('),
    'prima del canarino non passa niente di suo');
  const riga = bot.slice(gancio, bot.indexOf('\n', gancio));
  assert.ok(riga.includes('canarinoLibero(login)'));
  assert.ok(riga.includes('parla(filigrana.rispostaCanarino(licenza.firma()))'), 'risponde con la voce del messaggio');
  assert.ok(riga.includes('return;'));
  assert.ok(bot.includes('60_000'), 'una risposta al minuto per canale');
});

test('canarinoLibero: una risposta al minuto per canale, i canali non si pestano', async () => {
  const { canarinoLibero } = await import('../../src/bot.js');
  const t0 = 1_800_000_000_000;
  assert.equal(canarinoLibero('prova-a', t0), true);
  assert.equal(canarinoLibero('prova-a', t0 + 59_000), false);
  assert.equal(canarinoLibero('prova-b', t0 + 59_000), true);
  assert.equal(canarinoLibero('prova-a', t0 + 60_000), true);
});

test('all\'avvio il database riceve la marca di proprietà, e la pagina la dichiara nei dati strutturati', () => {
  const index = readFileSync('src/index.js', 'utf8');
  assert.ok(index.includes("statoVivo.scrivi('[proprieta]', 'firma'"));
  assert.ok(index.indexOf("statoVivo.scrivi('[proprieta]'") > index.indexOf('licenza.esito('), 'dopo che la licenza e\' stata letta');
  const html = readFileSync('src/web/public/index.html', 'utf8');
  assert.ok(html.includes('<meta name="copyright" content="© 2024–2026 Andrea Taliento (ANDRYXify)'));
  for (const p of ['mod', 'privacy', 'sblocca', 'termini', 'tgapp']) {
    assert.ok(readFileSync(`src/web/public/${p}.html`, 'utf8').includes('<meta name="copyright" content="© 2024–2026 Andrea Taliento (ANDRYXify)'), p);
  }
  assert.ok(html.includes('"@type": "Person"') && html.includes('"@id": "https://socialbot.live/#autore"'));
  assert.equal(html.split('"copyrightHolder": { "@id": "https://socialbot.live/#autore" }').length - 1, 2);
  assert.ok(html.includes('"author": { "@id": "https://socialbot.live/#autore" }'));
  const ld = html.slice(html.indexOf('<script type="application/ld+json">') + 35, html.indexOf('</script>', html.indexOf('<script type="application/ld+json">')));
  assert.doesNotThrow(() => JSON.parse(ld), 'il JSON-LD resta valido');
});

test('lo script che calcola l\'impronta non salva la frase da nessuna parte', () => {
  const s = readFileSync('scripts/firma-canarino.mjs', 'utf8');
  assert.ok(s.includes('setRawMode'), 'la frase si scrive senza vederla');
  for (const brutto of ['writeFile', 'appendFile', 'fetch(', 'http', 'localStorage', 'db.']) assert.ok(!s.includes(brutto), brutto);
  assert.ok(s.includes('improntaCanarino'));
});
