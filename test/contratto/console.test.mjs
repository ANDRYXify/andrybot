// LE AZIONI DEL CANALE, E LA PORTA DA CUI SI PREMONO.
//
// CONSOLify e uno Stream Deck fisico guardano lo STESSO registro. Non è eleganza:
// un elenco di bottoni scritto a mano sarebbe un secondo elenco accanto a quello
// dei contatori, e i due si scollerebbero al primo contatore nuovo — il difetto
// che rincorriamo da stamattina. Qui si controlla che il registro sia DERIVATO.
//
// E la cosa che ho imparato guardando cos'è davvero uno Stream Deck: non è una
// tastiera di scorciatoie, è un tasto che DICE cosa fa. Perciò ogni azione porta
// con sé la riga da stampare sul tasto, e chi la esegue risponde con quella.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-console-');
const { contatori, streamers } = await import('../../src/db.js');
const consolle = await import('../../src/features/console.js');

let n = 0;
// uno streamer VERO: senza la riga, la chiave non si puo' salvare — ed e' giusto
// che non si possa, ma allora la prova deve provare il caso vero.
const canale = () => {
  const ch = `console-prova-${++n}`;
  streamers.upsertApproved(ch, ch);
  return ch;
};

test('il registro nasce dai contatori del canale, non da una lista scritta a mano', () => {
  const ch = canale();
  assert.deepEqual(consolle.azioni(ch), [], 'un canale senza contatori non ha tasti da mostrare');

  contatori.upsert(ch, { comando: 'morti', etichetta: 'Morti', emoji: '💀', valore: 7, step: 1 });
  const a = consolle.azioni(ch);
  assert.equal(a.length, 3, 'un contatore porta tre tasti: più, meno, azzera');
  assert.ok(a.every((x) => x.id.startsWith('contatore:')), 'e ognuno sa da dove viene');

  // il tasto DICE cosa fa: c'è il numero di adesso, non solo il nome
  assert.match(a[0].mostra, /Morti: 7/);
  assert.equal(a[0].icona, '💀', 'e si porta dietro l\'emoji del contatore');

  // un contatore nuovo compare da solo: nessuna lista da tenere allineata
  contatori.upsert(ch, { comando: 'tentativi', etichetta: 'Tentativi', valore: 2 });
  assert.equal(consolle.azioni(ch).length, 6);
});

test('premere un tasto cambia il numero davvero, e lo dice in chat e a schermo', () => {
  const ch = canale();
  contatori.upsert(ch, { comando: 'morti', etichetta: 'Morti', valore: 4, step: 2 });
  const detto = [], schermo = [];
  const dip = { say: (t) => detto.push(t), emit: (p) => schermo.push(p) };

  const su = consolle.esegui(ch, 'contatore:piu:morti', dip);
  assert.equal(su.ok, true);
  assert.equal(su.valore, 6, 'sale del suo passo, non di uno a caso');
  assert.match(su.mostra, /Morti: 6/, 'e risponde con la riga da stampare sul tasto');
  assert.equal(detto.length, 1, 'il bot lo dice in chat');
  assert.match(detto[0], /Morti: 6/);

  const giu = consolle.esegui(ch, 'contatore:meno:morti', dip);
  assert.equal(giu.valore, 4);

  const zero = consolle.esegui(ch, 'contatore:azzera:morti', dip);
  assert.equal(zero.valore, 0);
  assert.equal(contatori.get(ch, 'morti').valore, 0, 'e il cambiamento è nel database, non solo nella risposta');
});

test('un\'azione che non esiste non fa niente e lo dice', () => {
  const ch = canale();
  assert.equal(consolle.esegui(ch, 'contatore:piu:inesistente').ok, false);
  assert.equal(consolle.esegui(ch, 'roba:strana').ok, false);
  assert.match(consolle.esegui(ch, 'roba:strana').mostra, /sconosciuta/);
});

test('la chiave si puo\' revocare, e quella vecchia smette di valere', () => {
  const ch = canale();
  const prima = consolle.chiave(ch);
  assert.ok(prima.length >= 32, 'non è un numerino');
  assert.equal(consolle.chiave(ch), prima, 'e resta la stessa finché non la si tocca');
  assert.equal(consolle.chiaveOk(ch, prima), true);

  const dopo = consolle.revoca(ch);
  assert.notEqual(dopo, prima);
  assert.equal(consolle.chiaveOk(ch, prima), false, 'una chiave finita in una clip smette di funzionare');
  assert.equal(consolle.chiaveOk(ch, dopo), true);
});

test('una chiave sbagliata non passa, e nemmeno una piu\' corta', () => {
  const ch = canale();
  const vera = consolle.chiave(ch);
  assert.equal(consolle.chiaveOk(ch, ''), false);
  assert.equal(consolle.chiaveOk(ch, vera.slice(0, -1)), false);
  assert.equal(consolle.chiaveOk(ch, vera.slice(0, -1) + 'f'), false);
});

test('c\'e\' un tetto: da questa porta non si guarda, si agisce', () => {
  const ch = canale();
  let bloccato = 0;
  for (let i = 0; i < 60; i++) if (consolle.troppiColpi(ch)) bloccato++;
  assert.ok(bloccato > 0, 'oltre il tetto si dice di no');
  assert.ok(bloccato < 60, 'ma i primi passano: il tetto non è un divieto');
});

test('un canale che non esiste non ha una chiave, e non la si inventa', () => {
  // La prima versione ne restituiva una nuova a ogni chiamata: `setSettings` su una
  // riga che non c'è non scrive niente, e la funzione tornava una chiave fresca
  // fingendo di averla salvata. Nessuna chiave emessa avrebbe combaciato con sé
  // stessa — e in produzione non si sarebbe visto mai.
  assert.equal(consolle.chiave('canale-che-non-esiste'), null);
  assert.equal(consolle.chiaveOk('canale-che-non-esiste', 'qualunque cosa'), false);
});
