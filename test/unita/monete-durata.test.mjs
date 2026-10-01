// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUANTO DURANO LE MONETE, E PER GIOCARE BISOGNA ESSERCI (docs/ECONOMIA.md).
//
// Le promesse della durata:
//  · una moneta scade sempre a mezzanotte, nel fuso del canale, e dopo adesso,
//    anche nelle notti in cui cambia l'ora;
//  · si spende prima quello che scade prima, e le monete senza scadenza per
//    ultime;
//  · un rimborso rimette i lotti della ricevuta, con le loro date;
//  · una posta vinta torna coi suoi lotti, e solo il guadagno nasce «giocando»;
//  · un furto, un duello, un regalo passano i lotti come sono;
//  · una moneta scaduta non si spende e non conta, da subito;
//  · il saldo e' sempre la somma dei lotti che valgono;
//  · le monete di prima entrano senza scadenza, una volta sola;
//  · le monete si muovono solo da economia.js (contratto sul codice).
//
// Le promesse di «per giocare bisogna esserci»:
//  · un messaggio che conta, e non e' un comando, mette da parte un passo,
//    fino alla scorta;
//  · chi non ne ha abbastanza non gioca, e se lo sente dire una volta: di nuovo
//    solo quando il numero cambia;
//  · un comando scritto male, o un gioco in attesa, non costano niente;
//  · lo staff gioca sempre; le mosse, il saldo e le coccole non costano;
//  · chi entra in una partita che si chiude dopo paga entrando, una volta;
//  · ogni gioco del registro che chiunque puo' aprire si paga quando si gioca.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('monete-durata-');
const { streamers, points, db, lottiDiPrima } = await import('../../src/db.js');
const E = await import('../../src/features/economia.js');
const R = await import('../../src/features/economia-regole.js');
const games = await import('../../src/features/games.js');
const A = await import('../../src/features/attese-giochi.js');
const Reg = await import('../../src/features/comandi-registro.js');
test.after(() => casa.pulisci());

const GIORNO = 86_400_000;
let n = 0;
function canale(punti = {}, altro = {}) {
  const ch = `durata${++n}`;
  streamers.upsertApproved(ch, ch, String(5000 + n));
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { punti, ...altro });
  for (const u of ['anna', 'bruno', 'carla', 'dario']) games.segnaPresenza(ch, u);
  return ch;
}
const lotti = (ch, u) => db.prepare('SELECT scade, quanti FROM monete_lotti WHERE channel=? AND user=? ORDER BY scade').all(ch, u);
const valgono = (ch, u, ora = Date.now()) => lotti(ch, u).filter((l) => l.scade === 0 || l.scade > ora).reduce((t, l) => t + l.quanti, 0);
const colonna = (ch, u) => db.prepare('SELECT monete FROM points WHERE channel=? AND user=?').get(ch, u)?.monete || 0;
const oraIn = (t, fuso) => new Intl.DateTimeFormat('en-GB', { timeZone: fuso, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(t));

// ---------------------------------------------------------------- le date

test('quando scade una moneta che nasce adesso', () => {
  const ORA = Date.parse('2026-10-01T10:00:00Z');            // giovedi', mezzogiorno a Roma
  const atteso = {
    mai: 0,
    sett: '2026-10-08T22:00:00.000Z',                         // vale fino all'8, compreso
    mese: '2026-10-31T23:00:00.000Z',                         // dopo il cambio d'ora: UTC+1
    tre: '2026-12-31T23:00:00.000Z',
    anno: '2027-10-01T22:00:00.000Z',
    'fine-sett': '2026-10-04T22:00:00.000Z',                  // fino a domenica
    'fine-mese': '2026-10-31T23:00:00.000Z',
    'fine-stagione': '2026-12-31T23:00:00.000Z',
    'fine-anno': '2026-12-31T23:00:00.000Z',
  };
  for (const [d, t] of Object.entries(atteso)) {
    const s = R.scadenza(d, ORA, 'Europe/Rome');
    assert.equal(s === 0 ? 0 : new Date(s).toISOString(), t, d);
  }
  assert.equal(new Date(R.scadenza('fine-sett', Date.parse('2026-10-04T10:00:00Z'), 'Europe/Rome')).toISOString(), '2026-10-04T22:00:00.000Z', 'di domenica «a fine settimana» e\' stanotte');
  assert.equal(new Date(R.scadenza('fine-mese', ORA, 'America/New_York')).toISOString(), '2026-11-01T04:00:00.000Z', 'nel fuso del canale');
  assert.equal(new Date(R.scadenza('fine-mese', ORA, 'Marte/Olimpo')).toISOString(), '2026-11-01T00:00:00.000Z', 'un fuso che non esiste vale UTC');
  assert.equal(R.scadenza('domani', ORA), 0, 'una durata che non c\'e\' non scade');
});

test('una moneta scade sempre a mezzanotte e dopo adesso, tutto l\'anno, anche quando cambia l\'ora', () => {
  for (const fuso of ['Europe/Rome', 'America/New_York', 'Australia/Sydney']) {
    for (let g = 0; g < 366; g++) {
      const ora = Date.parse('2026-01-01T12:00:00Z') + g * GIORNO;
      for (const d of R.DURATE.filter((x) => x !== 'mai')) {
        const s = R.scadenza(d, ora, fuso);
        assert.ok(s > ora, `${fuso} ${d} il giorno ${g}: dopo adesso`);
        assert.equal(oraIn(s, fuso), '00:00:00', `${fuso} ${d} il giorno ${g}: a mezzanotte`);
      }
    }
  }
});

test('come !monete dice quando scade', () => {
  const ORA = Date.parse('2026-10-01T10:00:00Z');
  const ch = canale();
  const detto = (iso) => games.quandoScade(ch, Date.parse(iso), ORA);
  assert.equal(detto('2026-10-01T22:00:00Z'), 'oggi');
  assert.equal(detto('2026-10-02T22:00:00Z'), 'domani');
  assert.equal(detto('2026-10-04T22:00:00Z'), 'domenica');
  assert.equal(detto('2026-10-07T22:00:00Z'), 'mercoledì');
  assert.equal(detto('2026-10-08T22:00:00Z'), 'l\'8 ottobre');
  assert.equal(detto('2026-10-12T22:00:00Z'), 'il 12 ottobre');
  assert.equal(detto('2027-01-01T23:00:00Z'), 'l\'1 gennaio 2027');
});

// ---------------------------------------------------------------- i lotti

test('si spende prima quello che scade prima, e le monete senza scadenza per ultime', () => {
  const ch = canale();
  const t = Date.now();
  points.dai(ch, 'anna', 10, { scade: 0 });
  points.dai(ch, 'anna', 20, { scade: t + 2 * GIORNO });
  points.dai(ch, 'anna', 30, { scade: t + GIORNO });
  const r = points.togli(ch, 'anna', 35);
  assert.deepEqual(r.ricevuta, [{ scade: t + GIORNO, quanti: 30 }, { scade: t + 2 * GIORNO, quanti: 5 }]);
  assert.deepEqual(lotti(ch, 'anna'), [{ scade: 0, quanti: 10 }, { scade: t + 2 * GIORNO, quanti: 15 }]);
  assert.equal(points.get(ch, 'anna'), 25);
  assert.equal(points.punta(ch, 'anna', 26), null, 'una posta e\' tutta o niente');
  assert.equal(points.get(ch, 'anna'), 25, 'e se non basta non tocca niente');
});

test('un rimborso rimette i lotti della ricevuta, con le loro date', () => {
  const ch = canale();
  const t = Date.now();
  points.dai(ch, 'anna', 40, { scade: t + GIORNO });
  points.dai(ch, 'anna', 60, { scade: 0 });
  const prima = lotti(ch, 'anna');
  const { ricevuta } = points.punta(ch, 'anna', 70);
  assert.equal(points.get(ch, 'anna'), 30);
  points.rendi(ch, 'anna', ricevuta);
  assert.deepEqual(lotti(ch, 'anna'), prima);
});

test('una posta vinta torna coi suoi lotti, e solo il guadagno nasce «giocando»', () => {
  const ch = canale({ durate: { giochi: 'sett' } });
  const t = Date.now();
  const G = E.scadePer(ch, 'giochi');
  assert.equal(G, R.scadenza('sett', Date.now(), 'Europe/Rome'));
  points.dai(ch, 'anna', 50, { scade: t + GIORNO });
  points.dai(ch, 'anna', 50, { scade: 0 });
  assert.equal(E.gioca(ch, 'anna', 30, 80), 150);
  assert.deepEqual(lotti(ch, 'anna'), [{ scade: 0, quanti: 50 }, { scade: t + GIORNO, quanti: 50 }, { scade: G, quanti: 50 }].sort((a, b) => a.scade - b.scade));
  // persa a meta': torna la parte che scade dopo, perche' si spende prima quello che scade prima
  points.dai(ch, 'bruno', 20, { scade: t + GIORNO });
  points.dai(ch, 'bruno', 20, { scade: t + 3 * GIORNO });
  const p = E.punta(ch, 'bruno', 40);
  E.chiudiPuntata(ch, 'bruno', p.ricevuta, 25);
  assert.deepEqual(lotti(ch, 'bruno'), [{ scade: t + GIORNO, quanti: 5 }, { scade: t + 3 * GIORNO, quanti: 20 }]);
  assert.equal(E.gioca(ch, 'carla', 10, 30), null, 'senza monete non si gioca');
});

test('un furto, un duello, un regalo passano i lotti come sono', () => {
  const ch = canale();
  const t = Date.now();
  points.dai(ch, 'anna', 10, { scade: t + GIORNO });
  points.dai(ch, 'anna', 30, { scade: 0 });
  assert.equal(E.passa(ch, 'anna', 'bruno', 25), 25);
  assert.deepEqual(lotti(ch, 'bruno'), [{ scade: 0, quanti: 15 }, { scade: t + GIORNO, quanti: 10 }]);
  assert.deepEqual(lotti(ch, 'anna'), [{ scade: 0, quanti: 15 }]);
  assert.equal(E.passa(ch, 'anna', 'bruno', 100), 15, 'passa quello che c\'e\'');
});

test('una moneta scaduta non si spende e non conta, da subito', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const ch = canale();
  points.dai(ch, 'anna', 100, { scade: Date.now() + 1000 });
  points.dai(ch, 'anna', 5, { scade: 0 });
  points.dai(ch, 'bruno', 50, { scade: 0 });
  assert.deepEqual(points.top(ch, 5).map((r) => r.user), ['anna', 'bruno']);
  t.mock.timers.tick(1000);
  assert.equal(points.get(ch, 'anna'), 5, 'scaduta a mezzanotte, sparita a mezzanotte');
  assert.deepEqual(points.top(ch, 5).map((r) => [r.user, r.monete]), [['bruno', 50], ['anna', 5]]);
  assert.equal(points.posizione(ch, 'anna'), 2);
  assert.equal(points.punta(ch, 'anna', 6), null);
  assert.deepEqual(lotti(ch, 'anna'), [{ scade: 0, quanti: 5 }], 'il lotto scaduto non c\'e\' piu\'');
  assert.equal(colonna(ch, 'anna'), 5);
  points.dai(ch, 'anna', 7, { scade: Date.now() - 1 });
  assert.equal(points.get(ch, 'anna'), 5, 'una moneta gia\' scaduta non nasce');
});

test('il saldo e\' sempre la somma dei lotti che valgono', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const ch = canale({ durate: { giochi: 'sett', chat: 'fine-sett' } });
  const chi = ['anna', 'bruno', 'carla'];
  const passi = [
    () => points.dai(ch, 'anna', 100, { scade: Date.now() + 3 * GIORNO }),
    () => points.dai(ch, 'bruno', 40, { scade: 0 }),
    () => E.dai(ch, 'carla', 70, 'giochi'),
    () => E.gioca(ch, 'anna', 30, 0),
    () => E.gioca(ch, 'anna', 30, 90),
    () => E.passa(ch, 'anna', 'carla', 55),
    () => { const p = E.punta(ch, 'bruno', 25); E.rendi(ch, 'bruno', p.ricevuta); },
    () => t.mock.timers.tick(4 * GIORNO),
    () => E.togli(ch, 'carla', 10),
    () => E.riceve(ch, 'bruno', 12),
    () => t.mock.timers.tick(8 * GIORNO),
    () => E.passa(ch, 'carla', 'anna', 1000),
  ];
  for (const [i, p] of passi.entries()) {
    p();
    for (const u of chi) {
      assert.equal(points.get(ch, u), valgono(ch, u), `dopo il passo ${i}, ${u}: il saldo`);
      assert.equal(colonna(ch, u), valgono(ch, u), `dopo il passo ${i}, ${u}: la colonna`);
    }
  }
});

test('le monete di prima entrano senza scadenza, una volta sola', () => {
  const ch = canale();
  db.prepare("INSERT INTO points (channel, user, monete, ruolo, ts) VALUES (?, 'vecchio', 120, '', 0)").run(ch);
  assert.equal(lottiDiPrima(), 1);
  assert.deepEqual(lotti(ch, 'vecchio'), [{ scade: 0, quanti: 120 }]);
  assert.equal(lottiDiPrima(), 0, 'la seconda volta non fa niente');
  assert.equal(points.get(ch, 'vecchio'), 120);
});

test('lo streamer puo\' dare una scadenza alle monete che non scadono', () => {
  const ch = canale();
  points.dai(ch, 'anna', 30, { scade: 0 });
  points.dai(ch, 'bruno', 20, { scade: 0 });
  points.dai(ch, 'bruno', 5, { scade: Date.now() + GIORNO });
  assert.deepEqual(E.senzaScadenza(ch), { persone: 2, monete: 50 });
  assert.equal(E.scadenzaAlleVecchie(ch, 'mai'), null, '«non scadono» non e\' una data');
  const r = E.scadenzaAlleVecchie(ch, 'fine-mese');
  assert.deepEqual([r.persone, r.monete], [2, 50]);
  assert.equal(r.scade, R.scadenza('fine-mese', Date.now(), 'Europe/Rome'));
  assert.deepEqual(E.senzaScadenza(ch), { persone: 0, monete: 0 });
  assert.equal(points.get(ch, 'bruno'), 25, 'il saldo non cambia: cambia quando scadono');
});

test('le monete nascono con la durata del modo in cui si guadagnano', () => {
  const ch = canale({ durate: { chat: 'sett', giochi: 'mese', premi: 'anno', staff: 'mai' } });
  const d = (x) => R.scadenza(x, Date.now(), 'Europe/Rome');
  E.dai(ch, 'anna', 10, 'premi');
  E.riceve(ch, 'bruno', 5);
  E.importa(ch, [{ utente: 'carla', monete: 7 }]);
  E.dai(ch, 'dario', 3, 'giochi');
  assert.deepEqual(lotti(ch, 'anna'), [{ scade: d('anno'), quanti: 10 }]);
  assert.deepEqual(lotti(ch, 'bruno'), [{ scade: d('sett'), quanti: 5 }]);
  assert.deepEqual(lotti(ch, 'carla'), [{ scade: 0, quanti: 7 }]);
  assert.deepEqual(lotti(ch, 'dario'), [{ scade: d('mese'), quanti: 3 }]);
});

test('!monete dice anche quante scadono per prime', () => {
  const ch = canale({ durate: { premi: 'anno' } });
  const detti = [];
  const scrivi = (text) => games.tryGame({ channel: ch, user: 'anna', text }, (x) => detti.push(x));
  points.dai(ch, 'anna', 10, { scade: 0 });
  scrivi('!monete');
  assert.equal(detti.at(-1), '💰 Hai 10 monete.');
  E.dai(ch, 'anna', 20, 'premi');
  scrivi('!monete');
  assert.equal(detti.at(-1), `💰 Hai 30 monete. 20 scadono ${games.quandoScade(ch, E.scadePer(ch, 'premi'))}.`);
});

// ---------------------------------------------------------------- per giocare bisogna esserci

function tavolo(punti = {}, altro = {}) {
  const ch = canale({ giocoOgni: 2, giochiScorta: 2, ...punti }, altro);
  for (const u of ['anna', 'bruno']) points.dai(ch, u, 1000);
  const detti = [];
  const scrivi = (user, text, extra = {}) => games.tryGame({ channel: ch, user, text, ...extra }, (x) => detti.push(x));
  const parla = (user, text = `ciao a tutti ${user}`) => games.accredita({ channel: ch, user, text });
  return { ch, detti, scrivi, parla };
}

test('un messaggio che conta, e non e\' un comando, mette da parte un passo, fino alla scorta', () => {
  const s = tavolo();
  s.parla('anna', 'ciao!');
  assert.equal(points.passi(s.ch, 'anna'), 1);
  s.parla('anna', '!slot');
  assert.equal(points.passi(s.ch, 'anna'), 1, 'un comando non e\' parlare');
  for (let i = 0; i < 10; i++) s.parla('anna', `messaggio ${i}`);
  assert.equal(points.passi(s.ch, 'anna'), 4, 'al massimo due giochi da parte');
  const spento = tavolo({ giocoOgni: 0 });
  spento.parla('anna');
  assert.equal(points.passi(spento.ch, 'anna'), 0, 'a regola spenta non si conta niente');
});

test('chi non ha abbastanza messaggi non gioca, e se lo sente dire una volta', () => {
  const s = tavolo();
  s.scrivi('anna', '!dado');
  assert.equal(s.detti.length, 1);
  assert.match(s.detti[0], /anna/);
  assert.match(s.detti[0], /2 messaggi/);
  assert.doesNotMatch(s.detti[0], /🎲/, 'il dado non e\' stato tirato');
  s.scrivi('anna', '!dado');
  s.scrivi('anna', '!slot');
  assert.equal(s.detti.length, 1, 'riprovando senza scrivere, il bot tace');
  s.parla('anna');
  s.scrivi('anna', '!dado');
  assert.equal(s.detti.length, 2, 'dopo un messaggio lo ridice');
  assert.match(s.detti[1], /un messaggio/i);
  s.parla('anna', 'eccomi di nuovo');
  s.scrivi('anna', '!dado');
  assert.match(s.detti.at(-1), /🎲/);
  assert.equal(points.passi(s.ch, 'anna'), 0, 'la partita si e\' pagata');
});

test('dopo aver giocato, chi resta senza messaggi se lo sente dire di nuovo', () => {
  const s = tavolo({ giocoOgni: 1 });
  s.scrivi('anna', '!dado');
  s.parla('anna');
  s.scrivi('anna', '!moneta');
  const n = s.detti.length;
  s.scrivi('anna', '!dado');
  assert.equal(s.detti.length, n + 1, 'mancava uno prima, manca uno adesso: e\' un\'altra volta');
});

test('un comando scritto male, o un gioco in attesa, non costano niente', () => {
  const s = tavolo();
  s.parla('anna'); s.parla('anna', 'come va?');
  s.scrivi('anna', '!roulette');
  assert.match(s.detti.at(-1), /Si punta così/);
  assert.equal(points.passi(s.ch, 'anna'), 2);
  s.scrivi('anna', '!roulette 10 rosso');
  assert.equal(points.passi(s.ch, 'anna'), 0);
  s.parla('anna'); s.parla('anna', 'bella partita');
  s.scrivi('anna', '!roulette 10 nero');
  assert.match(s.detti.at(-1), /⏳|di nuovo fra/);
  assert.equal(points.passi(s.ch, 'anna'), 2, 'in attesa non si paga');
});

test('lo staff gioca sempre; le mosse, il saldo, la classifica e le coccole non costano', () => {
  const s = tavolo();
  s.scrivi('bruno', '!dado', { isMod: true });
  assert.match(s.detti.at(-1), /🎲/);
  s.scrivi(s.ch, '!moneta', { isBroadcaster: true });
  assert.match(s.detti.at(-1), /testa|croce/i);
  for (const cmd of ['!monete', '!classifica', '!abbraccio @bruno']) {
    const k = s.detti.length;
    s.scrivi('anna', cmd);
    assert.equal(s.detti.length, k + 1, cmd);
    assert.doesNotMatch(s.detti.at(-1), /messaggi?\b.*(manca|ancora|servono)|(manca|ancora|servono).*messaggi?\b/i, cmd);
  }
  for (const id of ['accetta', 'carta', 'stai', 'colpisci', 'passa', 'monete', 'classifica', 'abbraccio', 'regala', 'sblocca']) assert.equal(A.eUnGioco(id), false, id);
  for (const id of ['slot', 'duello', 'trivia', 'colpo', 'mima']) assert.equal(A.eUnGioco(id), true, id);
});

test('chi entra in un colpo paga entrando, e una volta sola', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: Date.now() });
  const s = tavolo();
  s.parla('anna'); s.parla('anna', 'si parte');
  s.scrivi('anna', '!colpo');
  assert.equal(points.passi(s.ch, 'anna'), 0, 'pagato entrando');
  s.parla('anna'); s.parla('anna', 'dai venite');
  s.scrivi('bruno', '!colpo');
  assert.match(s.detti.at(-1), /bruno/, 'bruno senza messaggi non entra');
  t.mock.timers.tick(10 * 60_000);
  assert.equal(points.passi(s.ch, 'anna'), 2, 'a colpo chiuso non si paga di nuovo');
});

// Ogni gioco che chiunque puo' aprire, giocato una volta come si gioca: costa
// i suoi messaggi. L'elenco viene dal registro: un gioco nuovo senza la sua
// riga qui fa tornare rosso.
const GIOCATA = {
  dado: '!dado', moneta: '!moneta', '8ball': '!8ball vinco?', slot: '!slot', duello: '!duello @bruno',
  trivia: '!trivia', manche: '!manche', pesca: '!pesca', roulette: '!roulette 10 rosso', furto: '!furto @bruno',
  blackjack: '!blackjack 10', corsa: '!corsa 2 10', patata: '!patata', catena: '!catena', conta: '!conta',
  colpo: '!colpo', morra: '!morra carta',
};
test('ogni gioco che chiunque puo\' aprire si paga quando si gioca', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: Date.now() });
  const aperti = Reg.COMANDI.filter((c) => A.eUnGioco(c.id) && Reg.livelloDi(c) !== 'mod').map((c) => c.id).sort();
  assert.deepEqual(Object.keys(GIOCATA).sort(), aperti, 'ogni gioco ha la sua giocata');
  for (const [id, testo] of Object.entries(GIOCATA)) {
    const s = tavolo({ giocoOgni: 3, giochiScorta: 1 });
    for (let i = 0; i < 3; i++) s.parla('anna', `messaggio numero ${i}`);
    assert.equal(points.passi(s.ch, 'anna'), 3);
    s.scrivi('anna', testo);
    assert.equal(points.passi(s.ch, 'anna'), 0, `${testo}: si e' pagato`);
    t.mock.timers.tick(30 * 60_000);
  }
});

// ---------------------------------------------------------------- contratto

test('le monete si muovono solo da economia.js, e il saldo lo scrivono solo i lotti', () => {
  const radice = new URL('../../src/', import.meta.url).pathname;
  const file = [];
  const giu = (d) => { for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory()) giu(p); else if (p.endsWith('.js')) file.push(p); } };
  giu(radice);
  const MUOVONO = /points\.(dai|togli|punta|chiudiPuntata|passa|rendi|importa|scadenzaAlleVecchie|economiaScrivi|scadi|spendiPassi|passo)\(/;
  const fuori = file.filter((f) => !/\/(db|features\/economia)\.js$/.test(f) && MUOVONO.test(readFileSync(f, 'utf8')));
  assert.deepEqual(fuori.map((f) => f.slice(radice.length)), []);
  const sorgente = readFileSync(join(radice, 'db.js'), 'utf8');
  const scrive = [...sorgente.matchAll(/monete = MAX\(0, points\.monete \+ \?\)/g)].length;
  assert.equal(scrive, 2, 'il saldo lo scrivono i lotti e il giro della porta');
  const porta = sorgente.slice(sorgente.indexOf('  economiaScrivi(channel, righe'), sorgente.indexOf('\n  },\n', sorgente.indexOf('  economiaScrivi(channel, righe')));
  assert.match(porta, /const d = Math\.max\(0, /, 'la porta aggiunge e non toglie');
  assert.match(porta, /if \(d > 0\) _lotti\.metti\.run\(/, 'e quello che aggiunge e\' un lotto');
});
