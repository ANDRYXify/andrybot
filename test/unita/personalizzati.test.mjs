// «Quello che ti sei costruito vince.»
//
// Il difetto vero, nato con i giochi nei Moduli: i comandi PRONTI giravano
// prima del motore dei Moduli, quindi un !slot costruito dallo streamer
// rispondeva due volte e toccava la moneta due volte. La regola esisteva gia'
// ma viveva dentro un file solo (i comandi base la rispettavano, i giochi no).
//
// Adesso la regola e' una, sta prima dello smistamento, e la copia in memoria
// non ha una scadenza a tempo: segue il numero di revisione che il database
// alza dentro le uniche funzioni capaci di cambiare i comandi. Salvi, e la riga
// dopo e' gia' giusta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-pers-');
const { modules: modulesDb, commands } = await import('../../src/db.js');
const p = await import('../../src/features/personalizzati.js');

const CH = 'canale';

test('un comando qualsiasi non e\' "suo"', () => {
  assert.equal(p.suoComando(CH, '!slot'), false);
  assert.equal(p.comandoDi('!SLOT 100'), 'slot');
  assert.equal(p.comandoDi('ciao come va'), '');
});

test('un Modulo con quel comando lo rende suo, subito', () => {
  modulesDb.save(CH, { nome: 'slot mio', trigger: { tipo: 'comando', comando: 'slot' },
    azioni: [{ tipo: 'messaggio', testo: 'x' }] });
  assert.equal(p.suoComando(CH, '!slot 100'), true, 'nessuna attesa: vale dalla riga dopo');
});

test('valgono anche gli alias: sono lo stesso comando con un altro nome', () => {
  modulesDb.save(CH, { nome: 'macchinetta', trigger: { tipo: 'comando', comando: 'macchinetta', alias: ['slotmachine', 'gioca'] },
    azioni: [{ tipo: 'messaggio', testo: 'x' }] });
  assert.equal(p.suoComando(CH, '!gioca'), true);
  assert.equal(p.suoComando(CH, '!slotmachine'), true);
});

test('anche un comando semplice conta', () => {
  commands.set(CH, 'social', 'seguimi qui');
  assert.equal(p.suoComando(CH, '!social'), true);
});

test('spegnere il Modulo restituisce il comando a quello pronto', () => {
  const id = modulesDb.save(CH, { nome: 'dado mio', trigger: { tipo: 'comando', comando: 'dado' },
    azioni: [{ tipo: 'messaggio', testo: 'x' }] });
  assert.equal(p.suoComando(CH, '!dado'), true);
  modulesDb.setAttivo(CH, id, false);
  assert.equal(p.suoComando(CH, '!dado'), false, 'un modulo spento non occupa il nome');
});

test('e cancellarlo pure', () => {
  const id = modulesDb.save(CH, { nome: 'ore mie', trigger: { tipo: 'comando', comando: 'ore' },
    azioni: [{ tipo: 'messaggio', testo: 'x' }] });
  assert.equal(p.suoComando(CH, '!ore'), true);
  modulesDb.remove(CH, id);
  assert.equal(p.suoComando(CH, '!ore'), false);
});

test('un canale non parla per un altro', () => {
  assert.equal(p.suoComando('altrocanale', '!slot'), false);
});

test('i Moduli che non sono comandi non occupano nessun nome', () => {
  modulesDb.save(CH, { nome: 'saluto', trigger: { tipo: 'parola', testi: ['ciao'] },
    azioni: [{ tipo: 'messaggio', testo: 'x' }] });
  assert.equal(p.suoComando(CH, '!ciao'), false);
});

test.after(() => usaEGetta.pulisci());
