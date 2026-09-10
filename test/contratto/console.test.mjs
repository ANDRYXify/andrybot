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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');

const usaEGetta = cartellaUsaEGetta('andrybot-console-');
const { contatori, effects: storeEffetti, streamers, battute } = await import('../../src/db.js');
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
  const dei = (c, g) => consolle.azioni(c).filter((x) => x.gruppo === g);
  assert.deepEqual(dei(ch, 'contatori'), [], 'un canale senza contatori non ha quei tasti');
  assert.equal(dei(ch, 'chat').length, 2, 'ma battuta e «dì» ci sono sempre: non dipendono da niente');

  contatori.upsert(ch, { comando: 'morti', etichetta: 'Morti', emoji: '💀', valore: 7, step: 1 });
  const a = dei(ch, 'contatori');
  assert.equal(a.length, 3, 'un contatore porta tre tasti: più, meno, azzera');

  // il tasto DICE cosa fa: c'è il numero di adesso, non solo il nome
  assert.match(a[0].mostra, /Morti: 7/);
  assert.equal(a[0].icona, '💀', 'e si porta dietro l\'emoji del contatore');

  // un contatore nuovo compare da solo: nessuna lista da tenere allineata
  contatori.upsert(ch, { comando: 'tentativi', etichetta: 'Tentativi', valore: 2 });
  assert.equal(dei(ch, 'contatori').length, 6, 'e un contatore nuovo porta i suoi');
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
  assert.equal(consolle.chiaveOk(ch, vera.slice(0, -1)), false, 'una più corta non passa');
  // L'ultimo carattere si CAMBIA, non si sostituisce con una lettera scelta a caso:
  // la chiave è esadecimale, e mettere sempre 'f' voleva dire che una volta su
  // sedici la «chiave sbagliata» era esattamente quella giusta. Rosso una volta ogni
  // sedici giri, e la colpa non era del codice — un rosso intermittente e' peggio di
  // uno fisso, perche' insegna a non guardare il rosso.
  const ultimo = vera.slice(-1);
  const diverso = vera.slice(0, -1) + (ultimo === 'f' ? '0' : 'f');
  assert.notEqual(diverso, vera, 'la chiave di prova è davvero diversa');
  assert.equal(consolle.chiaveOk(ch, diverso), false, 'e un carattere diverso basta');
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

test('anche gli effetti del canale diventano tasti, da soli', () => {
  const ch = canale();
  assert.equal(consolle.azioni(ch).filter((a) => a.gruppo === 'effetti').length, 0);
  storeEffetti.add(ch, { comando: 'airhorn', tipo: 'audio', file: 'a.mp3', tier: 'tutti', cooldown: 0, volume: 100, durata: 3 });
  const eff = consolle.azioni(ch).filter((a) => a.gruppo === 'effetti');
  assert.equal(eff.length, 1);
  assert.equal(eff[0].id, 'effetto:airhorn');
  assert.equal(eff[0].titolo, '!airhorn', 'il tasto porta il comando con cui lo chiama la chat');
  assert.equal(eff[0].icona, '🔊', 'e l\'icona segue il tipo');
});

test('l\'effetto lo spara il motore vero, non una seconda strada', () => {
  const ch = canale();
  storeEffetti.add(ch, { comando: 'airhorn', tipo: 'audio', file: 'a.mp3', tier: 'tutti', cooldown: 0, volume: 100, durata: 3 });
  const sparati = [];
  const finto = { fire: (c, cmd) => { sparati.push(`${c}/${cmd}`); return true; } };
  const r = consolle.esegui(ch, 'effetto:airhorn', { effetti: finto });
  assert.equal(r.ok, true);
  assert.deepEqual(sparati, [`${ch}/airhorn`], 'passa dal motore degli effetti, quello che userebbe la chat');
  assert.equal(consolle.esegui(ch, 'effetto:inesistente', { effetti: finto }).ok, false);
});

test('il tasto «battuta» ne dice una, e la segna come detta', () => {
  const ch = canale();
  const n = battute.add(ch, 'Una battuta di prova per il tasto', 'streamer');
  const detto = [];
  const r = consolle.esegui(ch, 'battuta', { say: (t) => detto.push(t) });
  assert.equal(r.ok, true);
  assert.equal(detto.length, 1, 'la dice in chat');
  assert.match(r.mostra, /battuta di prova/, 'e il tasto mostra cosa ha detto');
  assert.equal(battute.get(ch, n).dette, 1, 'ed è contata come detta: se no il suo schema non impara');
});

test('il tasto «di\'» dice quello che gli hai scritto, e senza testo non fa niente', () => {
  const ch = canale();
  const detto = [];
  const say = (t) => detto.push(t);
  assert.equal(consolle.esegui(ch, 'di', { say }).ok, false, 'senza testo non inventa niente');
  assert.equal(detto.length, 0);

  const r = consolle.esegui(ch, 'di', { say, testo: '  Ciao   a   tutti  ' });
  assert.equal(r.ok, true);
  assert.deepEqual(detto, ['Ciao a tutti'], 'e lo ripulisce dagli spazi di troppo');
});

test('la plancia non tiene tasti che puntano a niente', () => {
  const ch = canale();
  contatori.upsert(ch, { comando: 'morti', etichetta: 'Morti', valore: 1 });
  const salvata = consolle.salvaPlancia(ch, { pagine: [{ nome: 'P', tasti: [
    { azione: 'contatore:piu:morti', nome: 'Su', icona: '💀', colore: '#112233' },
    { azione: 'contatore:piu:sparito', nome: 'Fantasma' },
    { azione: 'roba:inventata' },
  ] }] });
  // un tasto che punta a un'azione che non esiste piu' non e' un buco: e' peggio,
  // e' un bottone che sembra fare qualcosa e non fa niente quando lo premi
  assert.equal(salvata.pagine[0].tasti.length, 1);
  assert.equal(salvata.pagine[0].tasti[0].azione, 'contatore:piu:morti');
  assert.equal(salvata.pagine[0].tasti[0].colore, '#112233');
});

test('la plancia ripulisce quello che le arriva, invece di fidarsi', () => {
  const ch = canale();
  const r = consolle.salvaPlancia(ch, { pagine: [{
    nome: 'x'.repeat(80),
    tasti: [{ azione: 'battuta', nome: 'y'.repeat(80), icona: 'z'.repeat(40), colore: 'javascript:alert(1)' }],
  }] });
  assert.ok(r.pagine[0].nome.length <= 24);
  assert.ok(r.pagine[0].tasti[0].nome.length <= 24);
  assert.equal(r.pagine[0].tasti[0].colore, '', 'un colore che non è un colore non entra');
});

test('un canale senza plancia ne ha comunque una, vuota', () => {
  const ch = canale();
  const p = consolle.plancia(ch);
  assert.equal(p.pagine.length, 1);
  assert.deepEqual(p.pagine[0].tasti, []);
});

test('CONSOLify ascolta dentro il pannello che esiste davvero', () => {
  // La prima versione filtrava gli eventi su «#pannello-consolify», che non esiste:
  // il contenitore si chiama «scheda-<id>». I tasti non avrebbero mai risposto — una
  // sezione intera inerte, senza un errore da nessuna parte.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  assert.match(app, /closest\?\.\('#scheda-consolify'\)/, 'il filtro punta al contenitore vero');
  assert.match(app, /id="scheda-\$\{id\}"/, 'e i pannelli si chiamano così');
  assert.ok(!/#pannello-consolify/.test(app), 'nessun contenitore inventato');
});
