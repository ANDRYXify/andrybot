// LA PUBBLICITA': i difetti che non devono esistere.
//
// Il ragionamento sta in docs/PUBBLICITA.md. Qui ci sono le cose che devono
// restare vere, e quasi tutte scendono da un fatto solo: Twitch ha un evento
// per quando la pausa COMINCIA e nessuno per quando finisce.
//
//  · una pausa si annuncia una volta sola, anche se l'evento arriva due volte;
//  · il «sono tornato» e' un conto, quindi in ritardo si tace invece di mentire;
//  · il preavviso non si ripete per la stessa pausa;
//  · il programma non si chiede quando non serve;
//  · una casella vuota vuol dire «non dire niente», non «usa il testo nostro».
import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../src/features/pubblicita.js';

const ORA = Date.parse('2026-09-20T21:00:00.000Z');
const acceso = (x) => P.normalizzaPubblicita({ acceso: true, ...x });

test('i numeri storti non passano, e quelli assenti hanno un valore sensato', () => {
  const c = P.normalizzaPubblicita({ acceso: true, quanto: 99999, tolleranza: -5, colore: 'fucsia' });
  assert.equal(c.quanto, P.PREAVVISO_MAX);
  assert.equal(c.tolleranza, 0);
  assert.equal(c.colore, 'primary', 'un colore che Twitch non conosce diventa quello di sempre');
  assert.equal(P.normalizzaPubblicita({}).quanto, 60);
  assert.equal(P.normalizzaPubblicita({ quanto: 'tanto' }).quanto, 60, 'e una parola al posto di un numero non azzera il preavviso');
});

test('il preavviso non può stare più lontano di uno snooze', () => {
  // Lo snooze di Twitch sposta la pausa di cinque minuti. Un preavviso dato
  // prima di quel limite potrebbe parlare di una pausa che non arriverà — e un
  // annuncio in chat non si ritira.
  assert.equal(P.PREAVVISO_MAX, 300);
});

test('una casella vuota vuol dire «non dire niente»', () => {
  const c = acceso({ dopo: { testo: '' } });
  assert.equal(c.dopo.testo, '', 'non le si rimette dentro il testo nostro');
  assert.equal(P.parla(c, 'dopo'), false);
  assert.equal(P.parla(c, 'prima'), true, 'e gli altri momenti non c\'entrano');
  // Anche solo spazi: chi svuota la casella la svuota.
  assert.equal(P.parla(acceso({ prima: { testo: '   ' } }), 'prima'), false);
});

test('spento tutto, non parla nessuno', () => {
  const c = P.normalizzaPubblicita({ acceso: false, prima: { acceso: true }, durante: { acceso: true } });
  for (const m of P.MOMENTI) assert.equal(P.parla(c, m), false, m);
});

test('ogni momento si spegne per conto suo', () => {
  const c = acceso({ durante: { acceso: false } });
  assert.equal(P.parla(c, 'durante'), false);
  assert.equal(P.parla(c, 'prima'), true);
  assert.equal(P.parla(c, 'dopo'), true);
});

test('le parole da sostituire non lasciano buchi nel messaggio', () => {
  const c = acceso({ durante: { testo: '{secondi}s = {durata} su {canale}' } });
  assert.equal(P.testoDi(c, 'durante', { secondi: 90, canale: 'andryx' }), '90s = 1:30 su andryx');
  // I secondi si scrivono a due cifre, e un messaggio non finisce con uno
  // spazio penzoloni perche' una parola da sostituire era vuota.
  assert.equal(P.testoDi(c, 'durante', { secondi: 5 }), '5s = 0:05 su');
});

test('il programma non si chiede quando non serve', () => {
  const c = acceso({ quanto: 60 });
  assert.equal(P.vaGuardato(c, {}, ORA), true, 'la prima volta non si sa niente');
  assert.equal(P.vaGuardato(c, { prossima: ORA + 40 * 60000 }, ORA), false, 'fra quaranta minuti: non si richiede sessanta volte');
  assert.equal(P.vaGuardato(c, { prossima: ORA + 90 * 1000 }, ORA), true, 'vicina: si riguarda, cosi\' uno snooze si vede');
  assert.equal(P.vaGuardato(c, { prossima: ORA - 1000 }, ORA), true, 'passata: si riguarda');
  assert.equal(P.vaGuardato(P.normalizzaPubblicita({ acceso: false }), {}, ORA), false, 'spento non si chiede niente a Twitch');
});

test('il preavviso arriva vicino, e una volta sola', () => {
  const c = acceso({ quanto: 60 });
  const fra = (s) => ({ nextAt: new Date(ORA + s * 1000).toISOString() });
  assert.equal(P.preavviso(c, {}, fra(600), ORA), null, 'dieci minuti prima e\' troppo presto');
  const p = P.preavviso(c, {}, fra(45), ORA);
  assert.ok(p && p.testo, 'quarantacinque secondi prima si dice');
  // Detto per quella pausa, non si ridice: il giro passa ogni mezzo minuto.
  assert.equal(P.preavviso(c, { dettoPer: String(p.quando) }, fra(45), ORA), null);
  // Ma se lo snooze la sposta, quella è un'altra pausa.
  assert.ok(P.preavviso(c, { dettoPer: String(p.quando) }, fra(45 + 300), ORA + 300 * 1000),
    'spostata dallo snooze, il preavviso torna a valere');
  assert.equal(P.preavviso(c, {}, { nextAt: '' }, ORA), null, 'fuori diretta Twitch non dice niente, e noi nemmeno');
});

test('una pausa si annuncia una volta, anche se l’evento arriva due volte', () => {
  // EventSub può consegnare due volte lo stesso messaggio. A distinguerle è
  // l'istante d'inizio, non il fatto di aver ricevuto qualcosa.
  const c = acceso({});
  const ev = { started_at: '2026-09-20T21:00:00.000Z', duration_seconds: 90 };
  const a = P.allaPartenza(c, {}, ev, ORA);
  assert.ok(a);
  assert.equal(a.secondi, 90);
  assert.equal(P.allaPartenza(c, { ultimaPausa: String(a.inizio) }, ev, ORA), null);
});

test('il conto parte da adesso, non da quello che l’evento dichiara', () => {
  // Un evento che arriva in ritardo ha già consumato parte della pausa:
  // contare dall'istante dichiarato farebbe aspettare due volte quel ritardo,
  // e il «sono tornato» arriverebbe a pubblicità finita da un pezzo.
  const c = acceso({});
  const tardi = ORA + 20000;
  const a = P.allaPartenza(c, {}, { started_at: new Date(ORA).toISOString(), duration_seconds: 90 }, tardi);
  assert.equal(a.finisceA, tardi + 90000);
});

test('una durata storta non lascia un timer appeso', () => {
  const c = acceso({});
  const a = P.allaPartenza(c, {}, { started_at: new Date(ORA).toISOString(), duration_seconds: 999999 }, ORA);
  assert.equal(a.secondi, P.DURATA_MAX);
  const b = P.allaPartenza(c, {}, { started_at: new Date(ORA).toISOString(), duration_seconds: 'novanta' }, ORA);
  assert.equal(b.secondi, 0);
});

test('senza un istante d’inizio non si annuncia: non si saprebbe riconoscere il doppione', () => {
  assert.equal(P.allaPartenza(acceso({}), {}, { duration_seconds: 90 }, ORA), null);
});

test('«sono tornato» in ritardo non si dice: è una bugia detta in diretta', () => {
  const c = acceso({ tolleranza: 120 });
  assert.equal(P.allaFine(c, { finisceA: ORA + 5000 }, ORA), null, 'prima del tempo non si dice');
  assert.equal(P.allaFine(c, { finisceA: ORA - 1000 }, ORA).testo, 'Eccomi, sono tornato.');
  const tardi = P.allaFine(c, { finisceA: ORA - 300 * 1000 }, ORA);
  assert.equal(tardi.scaduto, true);
  assert.equal(tardi.testo, '', 'cinque minuti dopo si tace');
  assert.equal(P.allaFine(c, { finisceA: ORA - 1000, dettoDopo: true }, ORA), null, 'e non si ripete');
});

test('la tolleranza a zero vuol dire «solo se sono puntuale»', () => {
  const c = acceso({ tolleranza: 0 });
  assert.equal(P.allaFine(c, { finisceA: ORA }, ORA).scaduto, false);
  assert.equal(P.allaFine(c, { finisceA: ORA - 1 }, ORA).scaduto, true);
});
