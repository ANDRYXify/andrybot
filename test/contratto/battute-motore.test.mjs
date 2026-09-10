// IL MOTORE CHE COSTRUISCE LE BATTUTE, INVECE DI CHIEDERLE.
//
// Prima, a serbatoio vuoto, il bot mandava al cervello un prompt libero: «inventa
// una battuta». Chiedi e speri. Quello che torna somiglia a una battuta perche' ha
// la forma di una frase, non perche' dentro ci sia il meccanismo che fa ridere.
//
// Il meccanismo, da McGraw & Warren (2010): fa ridere cio' che e' insieme una
// VIOLAZIONE e BENIGNO. Da qui la cosa che questa prova difende: la meta' benigna
// e' PARTE della definizione, non un filtro appiccicato dopo. Uno schema che viola
// una norma pesante non e' una battuta audace: non e' una battuta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-motore-');
const { battute, contatori } = await import('../../src/db.js');
const motore = await import('../../src/features/battute-motore.js');
const { detta } = await import('../../src/features/battute.js');

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
let seq = 0;
const canaleNuovo = () => `motore-prova-${++seq}`;
const conContatori = (ch, righe) => {
  for (const [comando, etichetta, valore] of righe) contatori.upsert(ch, { comando, etichetta, valore });
  return ch;
};

test('ogni schema dichiara cosa viola, e non puo\' violare qualcosa di pesante', () => {
  // Il controllo che serve davvero non e' sul testo di oggi: e' su quello che
  // qualcuno aggiungera' domani in buona fede.
  assert.ok(motore.SCHEMI.length >= 3, 'gli schemi ci sono');
  for (const s of motore.SCHEMI) {
    assert.ok(s.opposizione && s.opposizione.length > 8, `«${s.nome}» dice quale opposizione usa`);
    const v = motore.vaglio(s);
    assert.equal(v.ok, true, `«${s.nome}» passa il vaglio: ${v.perche || ''}`);
  }
});

test('il vaglio ferma una norma pesante e un bersaglio che e\' una persona', () => {
  const pesante = motore.vaglio({ nome: 'x', norma: 'la famiglia', bersaglio: 'situazione' });
  assert.equal(pesante.ok, false);
  assert.match(pesante.perche, /norma/, 'e dice perché, invece di sparire in silenzio');

  const addosso = motore.vaglio({ nome: 'y', norma: 'ottimismo', bersaglio: 'spettatore' });
  assert.equal(addosso.ok, false);
  assert.match(addosso.perche, /bersaglio/);
});

test('costruisce con i numeri VERI del canale, e non nomina nessuno', () => {
  const ch = conContatori(canaleNuovo(), [['morti', 'Morti', 14], ['tentativi', 'Tentativi', 3]]);
  const cands = motore.candidati(ch);
  assert.ok(cands.length >= 3, `candidati costruiti: ${cands.length}`);
  assert.ok(cands.some((c) => /\b14\b/.test(c.testo)), 'il numero vero del canale finisce nella battuta');
  for (const c of cands) {
    assert.ok(!/@/.test(c.testo), `nessuna battuta chiama qualcuno: «${c.testo}»`);
    assert.ok(c.schema, 'ogni candidata sa da quale schema viene');
  }
});

test('il rapporto assurdo tace quando la proporzione e\' normale', () => {
  // Due numeri accostati non sono una battuta: senza violazione non c'è niente da
  // ridere. La violazione è il RAPPORTO, quindi lo schema deve stare zitto finché
  // i numeri non sono assurdi — se parlasse sempre, non sarebbe uno schema comico,
  // sarebbe un bollettino.
  const normale = conContatori(canaleNuovo(), [['morti', 'Morti', 5], ['tentativi', 'Tentativi', 4]]);
  assert.ok(!motore.candidati(normale).some((c) => c.schema === 'rapporto-assurdo'),
    '5 contro 4 non fa ridere nessuno, e infatti non dice niente');

  const assurdo = conContatori(canaleNuovo(), [['morti', 'Morti', 30], ['tentativi', 'Tentativi', 3]]);
  const usc = motore.candidati(assurdo).filter((c) => c.schema === 'rapporto-assurdo');
  assert.equal(usc.length, 1, '30 contro 3 invece sì');
  assert.match(usc[0].testo, /10 a 1/, 'e il rapporto vero finisce nella battuta');
});

test('senza materia non inventa niente: tace, invece di riempire', () => {
  assert.deepEqual(motore.candidati(canaleNuovo()), [], 'un canale senza numeri non ha di che ridere');
  assert.equal(motore.costruisci(canaleNuovo()), null);
});

test('stessa materia, stessa battuta: nessun dado', () => {
  const ch = conContatori(canaleNuovo(), [['morti', 'Morti', 9]]);
  const a = motore.candidati(ch).map((c) => c.testo).join('|');
  const b = motore.candidati(ch).map((c) => c.testo).join('|');
  assert.equal(a, b, 'due chiamate, lo stesso risultato');
});

test('sceglie il modo che ha fatto ridere QUI, non quello che piace a me', () => {
  const ch = conContatori(canaleNuovo(), [['morti', 'Morti', 12], ['tentativi', 'Tentativi', 5]]);
  // La storia vera del canale, lasciata dalle funzioni vere: si dice una battuta
  // (e questo la conta), e la chat ride (e questo si segna). Niente scorciatoie
  // sul database: se le uso, provo il database e non il bot.
  const buono = 'falsa-causa', scarso = 'atteso-reale';
  const n1 = battute.add(ch, 'una vecchia del modo buono', 'prova', 'motore', buono);
  const n2 = battute.add(ch, 'una vecchia del modo scarso', 'prova', 'motore', scarso);
  for (let i = 0; i < 3; i++) { detta(ch, n1); battute.haFattoRidere(ch, n1); }
  for (let i = 0; i < 3; i++) { detta(ch, n2); }

  assert.equal(battute.perSchema(ch, buono).dette, 3, 'dirla la conta, da qualunque strada');
  assert.equal(battute.perSchema(ch, buono).risate, 3);
  assert.equal(battute.perSchema(ch, scarso).risate, 0);
  assert.ok(motore.presaDelloSchema(ch, buono) > motore.presaDelloSchema(ch, scarso),
    'la presa dello schema che ha fatto ridere è più alta');

  const scelta = motore.costruisci(ch);
  assert.ok(scelta, 'una battuta esce');
  assert.equal(scelta.schema, buono, 'ed è del modo che qui ha funzionato');
});

test('non ripropone una battuta che il serbatoio ha gia\'', () => {
  const ch = conContatori(canaleNuovo(), [['morti', 'Morti', 7]]);
  const prima = motore.costruisci(ch);
  assert.ok(prima);
  battute.add(ch, prima.testo, 'prova', 'motore', prima.schema);
  const dopo = motore.costruisci(ch);
  assert.notEqual(dopo.testo, prima.testo, 'la seconda volta ne esce un\'altra');
});

test('il motore non chiede niente al cervello: lavora anche a cervello spento', () => {
  const src = readFileSync(join(RAD, 'src/features/battute-motore.js'), 'utf8');
  const codice = src.replace(/\/\/[^\n]*/g, '');
  assert.ok(!/brainpy|fetch\(/.test(codice), 'nessuna richiesta a nessuno: schemi e numeri, e basta');
});
