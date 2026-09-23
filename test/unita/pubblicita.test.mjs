// LA PUBBLICITA': i difetti che non devono esistere.
//
// Il ragionamento sta in docs/PUBBLICITA.md. Qui ci sono le cose che devono
// restare vere, e quasi tutte scendono da un fatto solo: Twitch ha un evento
// per quando la pausa COMINCIA e nessuno per quando finisce.
//
//  · una pausa si annuncia una volta sola, anche se l'evento arriva due volte;
//  · il «sono tornato» e' un conto, quindi in ritardo si tace invece di mentire;
//  · il preavviso non si ripete per la stessa pausa, e cade a «quanto»
//    secondi dalla pausa, non a un giro di distanza;
//  · il programma si legge com'e' fatto davvero, non come dicono i documenti;
//  · {secondi} e {durata} sono sempre quanto dura la pausa;
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

test('il programma vero: gli istanti arrivano in secondi Unix, non come dicono i documenti', () => {
  // Il payload VERO di GET /helix/channels/ads: i documenti dicono RFC3339, e
  // Twitch manda secondi interi, 0 quando non c'e' niente. Letto come data
  // dava NaN, e il preavviso non partiva mai.
  const vero = { next_ad_at: 1728825458, last_ad_at: 1728821858, duration: 90, preroll_free_time: 0, snooze_count: 3, snooze_refresh_at: 1728829058 };
  assert.deepEqual(P.programmaDa(vero), { prossima: 1728825458000, durata: 90, ultima: 1728821858000, snooze: 3 });
  // La forma dei documenti si legge uguale: se un giorno la cambiano, niente si rompe.
  const doc = { next_ad_at: '2023-08-01T23:08:18+00:00', last_ad_at: '', duration: '60', snooze_count: '1' };
  assert.deepEqual(P.programmaDa(doc), { prossima: Date.parse('2023-08-01T23:08:18Z'), durata: 60, ultima: 0, snooze: 1 });
  // Il canale senza pubblicita' programmate risponde tutto a zero.
  const zero = { snooze_count: 0, snooze_refresh_at: 0, next_ad_at: 0, duration: 0, last_ad_at: 0, preroll_free_time: 0 };
  assert.deepEqual(P.programmaDa(zero), { prossima: 0, durata: 0, ultima: 0, snooze: 0 });
  assert.equal(P.programmaDa(undefined), null);
  assert.equal(P.istante('1728825458'), 1728825458000, 'le cifre in una stringa sono secondi anche loro');
});

test('il programma non si chiede quando non serve', () => {
  const c = acceso({ quanto: 60 });
  assert.equal(P.vaGuardato(c, {}, ORA), true, 'la prima volta non si sa niente');
  assert.equal(P.vaGuardato(c, { prossima: ORA + 40 * 60000, letto: ORA - 1000 }, ORA), false, 'fra quaranta minuti: non si richiede sessanta volte');
  assert.equal(P.vaGuardato(c, { prossima: ORA + 40 * 60000, letto: ORA - P.RILETTURA_MS }, ORA), true,
    'ma una lettura vecchia si rifa\': il programma si puo\' cambiare senza nessun evento');
  assert.equal(P.vaGuardato(c, { prossima: ORA + 90 * 1000, letto: ORA - 1000 }, ORA), true, 'vicina: si riguarda, cosi\' uno snooze si vede');
  assert.equal(P.vaGuardato(c, { prossima: ORA - 1000, letto: ORA - 1000 }, ORA), true, 'passata: si riguarda');
  assert.equal(P.vaGuardato(P.normalizzaPubblicita({ acceso: false }), {}, ORA), false, 'spento non si chiede niente a Twitch');
});

test('il preavviso cade a «quanto» secondi dalla pausa, per ogni preavviso e ogni fase del giro', () => {
  // Il giro legge il programma ogni GIRO_MS; il preavviso lo dice una
  // sveglia. Si simula il giro con il programma vero, e la sveglia deve
  // cadere ESATTAMENTE a prossima - quanto: ne' prima, ne' dopo.
  // Anche con un giro che tarda: setInterval non e' un metronomo, e un giro
  // che aspetta Twitch fa slittare quello dopo.
  for (const passo of [P.GIRO_MS, P.GIRO_MS + 250, P.GIRO_MS + 5_000]) {
    for (const quanto of [P.PREAVVISO_MIN, 20, 29, 30, 31, 45, 60, 61, 120, P.PREAVVISO_MAX]) {
      for (const fase of [0, 1, 7_500, 14_999, 15_000, 29_999]) {
        const c = acceso({ quanto });
        const prossima = ORA + 40 * 60_000;
        const programma = P.programmaDa({ next_ad_at: prossima / 1000, duration: 90 });
        const stato = {};
        let sveglia = 0;
        for (let t = ORA - 60 * 60_000 + fase; t < prossima && !sveglia; t += passo) {
          if (!P.vaGuardato(c, stato, t)) continue;
          stato.prossima = programma.prossima;
          stato.letto = t;
          sveglia = P.quandoAvvisare(c, stato, programma, t);
        }
        assert.equal(sveglia, prossima - quanto * 1000, `giro ${passo}ms, quanto ${quanto}s, fase ${fase}ms`);
        assert.ok(P.preavviso(c, stato, programma, sveglia), `giro ${passo}ms, quanto ${quanto}s, fase ${fase}ms: alla sveglia si dice`);
      }
    }
  }
});

test('il preavviso si dice una volta, e non se uno snooze ha spostato la pausa', () => {
  const c = acceso({ quanto: 60 });
  const fra = (s) => P.programmaDa({ next_ad_at: (ORA + s * 1000) / 1000, duration: 90 });
  assert.equal(P.preavviso(c, {}, fra(600), ORA), null, 'dieci minuti prima e\' troppo presto');
  const p = P.preavviso(c, {}, fra(45), ORA);
  assert.ok(p && p.testo, 'quarantacinque secondi prima si dice');
  assert.equal(P.preavviso(c, { dettoPer: String(p.quando) }, fra(45), ORA), null, 'detto per quella pausa, non si ridice');
  assert.equal(P.quandoAvvisare(c, { dettoPer: String(p.quando) }, fra(45), ORA), 0, 'e non gli si punta un\'altra sveglia');
  // Alla sveglia il programma si rilegge: uno snooze sposta la pausa cinque
  // minuti piu' in la', e alla sveglia ne mancano quanto + cinque minuti. Per
  // ogni preavviso, la pausa spostata cade fuori.
  for (const quanto of [P.PREAVVISO_MIN, 60, P.PREAVVISO_MAX]) {
    const q = acceso({ quanto });
    assert.equal(P.preavviso(q, {}, fra(quanto + 300), ORA), null, `preavviso ${quanto}s: spostata dallo snooze, zitti`);
    assert.ok(P.preavviso(q, {}, fra(quanto), ORA), `preavviso ${quanto}s: confermata, si dice`);
  }
  assert.ok(P.preavviso(c, { dettoPer: String(p.quando) }, fra(45 + 300), ORA + 300 * 1000),
    'e la pausa spostata, quando arriva il suo momento, ha il suo preavviso');
  assert.equal(P.preavviso(c, {}, P.programmaDa({ next_ad_at: 0 }), ORA), null, 'fuori diretta Twitch non dice niente, e noi nemmeno');
});

test('{secondi} e {durata} sono quanto dura la pausa, in tutti e tre i momenti', () => {
  const c = acceso({ quanto: 60,
    prima: { testo: 'fra poco {secondi}s ({durata})' },
    durante: { testo: 'ora {secondi}s ({durata})' },
    dopo: { testo: 'finiti {secondi}s ({durata})' } });
  const programma = P.programmaDa({ next_ad_at: (ORA + 60_000) / 1000, duration: 90 });
  assert.equal(P.preavviso(c, {}, programma, ORA).testo, 'fra poco 90s (1:30)', 'prima: la durata del programma, non i secondi che mancano');
  const a = P.allaPartenza(c, {}, { started_at: new Date(ORA).toISOString(), duration_seconds: 90 }, ORA);
  assert.equal(a.testo, 'ora 90s (1:30)');
  assert.equal(P.allaFine(c, { finisceA: a.finisceA, secondi: a.secondi }, a.finisceA).testo, 'finiti 90s (1:30)', 'dopo: non «0:00»');
});

test('senza la durata, una frase che la chiede non esce; le altre sì', () => {
  const c = acceso({ quanto: 60, prima: { testo: 'fra poco {durata} di pubblicità' } });
  const senza = P.programmaDa({ next_ad_at: (ORA + 60_000) / 1000, duration: 0 });
  assert.equal(P.preavviso(c, {}, senza, ORA), null, 'un numero inventato in chat e\' peggio del silenzio');
  assert.ok(P.preavviso(acceso({ quanto: 60 }), {}, senza, ORA), 'il testo di serie non la chiede, e si dice');
  assert.equal(P.testoDi(c, 'prima', { secondi: 0 }), '');
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

test('la pausa finisce a inizio + durata, anche se l’evento arriva tardi', () => {
  // Un evento arrivato con venti secondi di ritardo ha gia' consumato venti
  // secondi di pausa: contare da quando arriva sposterebbe il «sono tornato»
  // di tutto quel ritardo.
  const c = acceso({});
  const tardi = ORA + 20000;
  const a = P.allaPartenza(c, {}, { started_at: new Date(ORA).toISOString(), duration_seconds: 90 }, tardi);
  assert.equal(a.finisceA, ORA + 90000);
  assert.match(a.testo, /90 secondi/, 'e la durata detta e\' quella della pausa');
  // Un orologio di Twitch avanti rispetto al nostro: la pausa non puo' essere
  // cominciata dopo che ce l'hanno detto.
  const avanti = P.allaPartenza(c, {}, { started_at: new Date(ORA + 5000).toISOString(), duration_seconds: 90 }, ORA);
  assert.equal(avanti.finisceA, ORA + 90000);
});

test('un evento arrivato a pausa finita non dice «pubblicità per 90 secondi»', () => {
  const c = acceso({ tolleranza: 120 });
  const a = P.allaPartenza(c, {}, { started_at: new Date(ORA).toISOString(), duration_seconds: 90 }, ORA + 100_000);
  assert.equal(a.testo, '', 'sarebbe falso');
  assert.equal(P.allaFine(c, { finisceA: a.finisceA, secondi: a.secondi }, ORA + 100_000).testo, 'Eccomi, sono tornato.',
    'il ritorno invece e\' vero, dentro la tolleranza');
});

test('una durata storta non diventa un numero in chat, né un conto', () => {
  const c = acceso({});
  const a = P.allaPartenza(c, {}, { started_at: new Date(ORA).toISOString(), duration_seconds: 999999 }, ORA);
  assert.equal(a.secondi, 0, 'fuori scala non e\' una durata: tagliarla a 300 vorrebbe dire annunciare un numero mai detto');
  assert.equal(a.finisceA, 0, 'e senza durata non c\'e\' una fine da contare');
  assert.equal(a.testo, '', 'il testo di serie chiede i secondi: non esce');
  assert.equal(P.allaPartenza(c, {}, { started_at: new Date(ORA).toISOString(), duration_seconds: 'novanta' }, ORA).secondi, 0);
  // La durata vera si legge in tutte e due le forme: numero (il payload vero)
  // e stringa (l'esempio dei documenti).
  assert.equal(P.allaPartenza(c, {}, { started_at: new Date(ORA).toISOString(), duration_seconds: '60' }, ORA).secondi, 60);
});

test('l’istante di partenza si legge anche quando si chiama «timestamp»', () => {
  const a = P.allaPartenza(acceso({}), {}, { timestamp: new Date(ORA).toISOString(), duration_seconds: 30 }, ORA + 2000);
  assert.ok(a);
  assert.equal(a.finisceA, ORA + 30000);
});

test('senza un istante d’inizio non si annuncia: non si saprebbe riconoscere il doppione', () => {
  assert.equal(P.allaPartenza(acceso({}), {}, { duration_seconds: 90 }, ORA), null);
});

test('«sono tornato» in ritardo non si dice: è una bugia detta in diretta', () => {
  const c = acceso({ tolleranza: 120 });
  assert.equal(P.allaFine(c, { finisceA: ORA + 5000 }, ORA), null, 'prima del tempo non si dice');
  assert.equal(P.allaFine(c, { finisceA: ORA - 1000, secondi: 90 }, ORA).testo, 'Eccomi, sono tornato.');
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
