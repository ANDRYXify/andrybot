// I MODULI A TEMPO: quando parlano, e soprattutto quando NON devono parlare.
//
// Tre cose andavano storte, e nascevano tutte dallo stesso buco: un timer è un
// appuntamento su un calendario, e il calendario non c'era.
//
// 1. L'ultima volta stava in memoria. La memoria muore col processo, quindi a
//    ogni riavvio ogni timer risultava "mai partito" e partivano tutti insieme.
//    Con un deploy al giorno, un promemoria "ogni ora" parlava a ogni deploy.
// 2. Nessuna fila. Cinque moduli da trenta minuti creati lo stesso pomeriggio
//    scadono nello stesso minuto per sempre: uscivano cinque righe in un colpo.
// 3. Nessuna stanza. `attivi` vuol dire "bot acceso", non "in diretta": il
//    promemoria del follow parlava alla chat vuota tutta la notte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('modtimer-');
const { modules, streamers } = await import('../../src/db.js');
const { ModulesEngine } = await import('../../src/features/modules.js');
test.after(() => casa.pulisci());

const CANALE = 'alfa';
streamers.upsertApproved(CANALE, 'Alfa', '1');
streamers.setEnabled(CANALE, true);

const MIN = 60_000;

// Un motore che parla in un elenco invece che in chat, e che sa se sei in
// diretta perché glielo diciamo noi.
function motore({ live = true, pausa = 0 } = {}) {
  const detti = [];
  const m = new ModulesEngine({ helix: { getStream: async () => (live ? { id: '1' } : null) }, pausaTimerMs: pausa });
  m.manager = { say: (ch, testo) => detti.push(testo) };
  return { m, detti };
}

function crea(nome, trigger, condizioni = {}) {
  return modules.save(CANALE, {
    nome, trigger: { tipo: 'timer', minuti: 30, ...trigger }, condizioni,
    azioni: [{ tipo: 'messaggio', testo: nome }],
  });
}

const pulisci = () => { for (const x of modules.list(CANALE)) modules.remove(CANALE, x.id); };
const arretra = (id, minuti) => modules.segnaTimer(CANALE, id, Date.now() - minuti * MIN);

test('un timer appena creato non parla al primo giro: aspetta il suo turno', async () => {
  pulisci();
  const id = crea('nuovo', { minuti: 30 });
  assert.equal(modules.get(CANALE, id).timerLast, 0, 'nasce senza un ultimo giro');

  const { m, detti } = motore();
  await m._tickTimer();
  await m._drenaggio;

  assert.deepEqual(detti, [], 'zero non vuol dire «scaduto da sempre»');
  assert.ok(modules.get(CANALE, id).timerLast > 0, 'ma l\'ora viene segnata, se no non partirebbe mai');
});

test('dopo un riavvio i timer non parlano tutti insieme', async () => {
  pulisci();
  const ids = ['uno', 'due', 'tre'].map((n) => crea(n, { minuti: 30 }));
  for (const id of ids) arretra(id, 10);          // sono partiti 10 minuti fa

  // "Riavvio": un motore nuovo, senza niente in memoria. Il calendario però
  // resta nel database, quindi nessuno di questi tre è scaduto.
  const { m, detti } = motore();
  await m._tickTimer();
  await m._drenaggio;

  assert.deepEqual(detti, [], 'la memoria del riavvio non li rende scaduti');
});

test('due scaduti nello stesso giro escono in fila, non in un colpo', async () => {
  pulisci();
  const a = crea('primo', { minuti: 30 });
  const b = crea('secondo', { minuti: 30 });
  arretra(a, 90);                                  // aspetta da più tempo
  arretra(b, 40);

  const { m, detti } = motore({ pausa: 5_000 });
  await m._tickTimer();
  await new Promise((r) => setTimeout(r, 30));

  assert.deepEqual(detti, ['primo'], 'ne parla uno solo: l\'altro è in fila');
  assert.equal(m._coda.length, 1, 'e l\'altro sta aspettando');
  m.stop();
});

test('chi aspetta da più tempo parla per primo', async () => {
  pulisci();
  const a = crea('recente', { minuti: 30 });
  const b = crea('vecchio', { minuti: 30 });
  arretra(a, 35);
  arretra(b, 200);

  const { m, detti } = motore({ pausa: 5_000 });
  await m._tickTimer();
  await new Promise((r) => setTimeout(r, 30));

  assert.deepEqual(detti, ['vecchio']);
  m.stop();
});

test('l\'ora si segna quando il turno è assegnato, non quando esce la riga', async () => {
  pulisci();
  const a = crea('primo', { minuti: 30 });
  const b = crea('secondo', { minuti: 30 });
  arretra(a, 90);
  arretra(b, 90);

  const { m } = motore({ pausa: 5_000 });
  const prima = Date.now();
  await m._tickTimer();

  assert.ok(modules.get(CANALE, b).timerLast >= prima,
    'se no il giro dopo lo rimetterebbe in fila un\'altra volta');
  m.stop();
});

test('chi è in fila non ci rientra, nemmeno se nel frattempo scade di nuovo', async () => {
  pulisci();
  const primo = crea('primo', { minuti: 30 });
  const atteso = crea('secondo', { minuti: 30 });
  arretra(primo, 90);
  arretra(atteso, 90);

  const { m } = motore({ pausa: 5_000 });
  await m._tickTimer();
  assert.equal(m._coda.length, 1, 'uno parla, l\'altro aspetta');

  // La fila è lenta e intanto passa un\'altra mezz\'ora: per il calendario
  // quello che sta aspettando è scaduto di nuovo. Non deve finire in fila due
  // volte, o direbbe la stessa cosa due volte di seguito.
  arretra(atteso, 90);
  await m._tickTimer();

  assert.equal(m._coda.length, 1, 'resta uno solo');
  m.stop();
});

test('fuori dalla diretta il timer tace', async () => {
  pulisci();
  const id = crea('promemoria', { minuti: 30 });
  arretra(id, 90);

  const { m, detti } = motore({ live: false });
  await m._tickTimer();
  await m._drenaggio;

  assert.deepEqual(detti, [], 'la chat spenta non è un pubblico');
  assert.ok(modules.get(CANALE, id).timerLast < Date.now() - 80 * MIN,
    'e resta scaduto: appena torni in diretta parla');
});

test('chi lo chiede esplicitamente parla anche a canale spento', async () => {
  pulisci();
  const id = crea('sempre', { minuti: 30, ancheOffline: true });
  arretra(id, 90);

  const { m, detti } = motore({ live: false });
  await m._tickTimer();
  await m._drenaggio;

  assert.deepEqual(detti, ['sempre']);
});

test('«solo se offline» non ha bisogno del nuovo interruttore', async () => {
  pulisci();
  const id = crea('notturno', { minuti: 30 }, { soloOffline: true });
  arretra(id, 90);

  const { m, detti } = motore({ live: false });
  await m._tickTimer();
  await m._drenaggio;

  assert.deepEqual(detti, ['notturno'], 'lo dice già la condizione: chiederlo due volte sarebbe una trappola');
});

test('non è ancora ora: non si parla e non si segna niente', async () => {
  pulisci();
  const id = crea('presto', { minuti: 30 });
  arretra(id, 5);
  const segnato = modules.get(CANALE, id).timerLast;

  const { m, detti } = motore();
  await m._tickTimer();
  await m._drenaggio;

  assert.deepEqual(detti, []);
  assert.equal(modules.get(CANALE, id).timerLast, segnato, 'l\'appuntamento non si sposta da solo');
});

test('il bot spento sul canale ferma tutto', async () => {
  pulisci();
  const id = crea('muto', { minuti: 30 });
  arretra(id, 90);
  streamers.setEnabled(CANALE, false);

  const { m, detti } = motore();
  await m._tickTimer();
  await m._drenaggio;
  streamers.setEnabled(CANALE, true);

  assert.deepEqual(detti, []);
});
