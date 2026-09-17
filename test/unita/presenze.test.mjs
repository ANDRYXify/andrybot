// LE PRESENZE, DIRETTA DOPO DIRETTA: cos'e' una diretta, quando una presenza
// conta, come sale la serie, quanto vale il bonus, cosa dice il bot e a chi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-presenze-');
const { streamers, points, presenze: store, modules: modulesDb, memory } = await import('../../src/db.js');
const p = await import('../../src/features/presenze.js');
process.on('exit', () => usaEGetta.pulisci());

const CH = 'canale';
const MIN = 60_000, ORA = 3_600_000, GIORNO = 86_400_000;
const T0 = Date.parse('2026-09-17T20:00:00Z');
streamers.upsertApproved(CH, 'Canale');
streamers.setSettings(CH, { nomeMonete: 'gemme' });

test('una diretta e\' una sessione: nuova dopo mezz\'ora, la stessa se il bot cade e torna', () => {
  const a = p.direttaDelGiro(null, { streamId: 's1', ora: T0 });
  assert.equal(a.corrente, 's1'); assert.equal(a.precedente, ''); assert.equal(a.nuova, true);
  const b = p.direttaDelGiro(a, { streamId: 's1', ora: T0 + 5 * MIN });
  assert.equal(b.corrente, 's1'); assert.equal(b.nuova, false); assert.equal(b.ultimo_tick, T0 + 5 * MIN);
  const c = p.direttaDelGiro(b, { streamId: 's2', ora: T0 + 20 * MIN });
  assert.equal(c.corrente, 's1', 'un id nuovo entro mezz\'ora e\' un riavvio, non una diretta nuova');
  const d = p.direttaDelGiro(c, { streamId: 's1', ora: T0 + 3 * ORA });
  assert.equal(d.corrente, 's1', 'stesso id dopo un buco: era giu\' il bot, non lo streamer');
  const e = p.direttaDelGiro(d, { streamId: 's3', ora: T0 + 26 * ORA });
  assert.equal(e.corrente, 's3'); assert.equal(e.precedente, 's1'); assert.equal(e.nuova, true);
  const f = p.direttaDelGiro(e, { streamId: '', ora: T0 + 50 * ORA });
  assert.ok(f.nuova && f.corrente.startsWith('t'), 'senza id, dopo un buco lungo, e\' una diretta nuova con un\'etichetta sua');
});

test('la presenza conta una volta per diretta; la serie sale se c\'era anche alla precedente, e riparte da uno', () => {
  const d1 = { corrente: 'a', precedente: '' }, d2 = { corrente: 'b', precedente: 'a' }, d3 = { corrente: 'c', precedente: 'b' }, d5 = { corrente: 'e', precedente: 'd' };
  const r1 = p.contaPresenza(null, d1, { ora: T0, bonus: 10, tetto: 10 });
  assert.deepEqual({ dirette: r1.dirette, serie: r1.serie, record: r1.record, bonus: r1.bonus, traguardo: r1.traguardo }, { dirette: 1, serie: 1, record: 1, bonus: 10, traguardo: false });
  assert.equal(p.contaPresenza(r1, d1, { ora: T0 + ORA }), null, 'la stessa diretta non si conta due volte');
  const r2 = p.contaPresenza(r1, d2, { ora: T0 + GIORNO, bonus: 10, tetto: 10 });
  assert.equal(r2.serie, 2); assert.equal(r2.bonus, 20);
  const r3 = p.contaPresenza(r2, d3, { ora: T0 + 2 * GIORNO, bonus: 10, tetto: 2 });
  assert.equal(r3.serie, 3); assert.equal(r3.record, 3); assert.equal(r3.bonus, 20, 'il tetto ferma il bonus'); assert.equal(r3.traguardo, true);
  const r5 = p.contaPresenza(r3, d5, { ora: T0 + 4 * GIORNO, bonus: 10, tetto: 10 });
  assert.equal(r5.serie, 1, 'saltata una diretta si riparte'); assert.equal(r5.record, 3, 'il record resta'); assert.equal(r5.dirette, 4);
});

test('il giro: due giri di fila per esserci, bonus in monete, traguardi detti una volta al minuto, bot e streamer fuori', () => {
  const lista = ['Tizio', 'caia', 'nightbot', CH, '[anon]'];
  let e = p.giroDiretta(CH, { streamId: 'd1', chatters: lista, ora: T0 });
  assert.equal(e.nuova, true); assert.deepEqual(e.presenze, [], 'al primo giro nessuno e\' ancora presente');
  e = p.giroDiretta(CH, { streamId: 'd1', chatters: lista, ora: T0 + 5 * MIN });
  assert.deepEqual(e.presenze.map((x) => x.user).sort(), ['caia', 'tizio'], 'al secondo giro si conta; bot noti e streamer no');
  assert.equal(points.get(CH, 'tizio'), 10, 'il bonus e\' arrivato');
  e = p.giroDiretta(CH, { streamId: 'd1', chatters: ['tizio'], ora: T0 + 10 * MIN });
  assert.deepEqual(e.presenze, [], 'il terzo giro non riconta');
  e = p.giroDiretta(CH, { streamId: 'd1', chatters: ['caia'], ora: T0 + 15 * MIN });
  e = p.giroDiretta(CH, { streamId: 'd1', chatters: ['caia', 'tizio'], ora: T0 + 20 * MIN });
  e = p.giroDiretta(CH, { streamId: 'd1', chatters: ['caia', 'tizio'], ora: T0 + 25 * MIN });
  assert.deepEqual(e.presenze, [], 'chi esce e rientra nella stessa diretta non conta due volte');
  // seconda e terza diretta: la serie sale, al traguardo il bot lo dice
  for (const [id, base] of [['d2', T0 + GIORNO], ['d3', T0 + 2 * GIORNO]]) {
    p.giroDiretta(CH, { streamId: id, chatters: ['tizio', 'caia'], ora: base });
    e = p.giroDiretta(CH, { streamId: id, chatters: ['tizio', 'caia'], ora: base + 5 * MIN });
  }
  assert.deepEqual(e.traguardi.map((x) => [x.user, x.serie, x.bonus]).sort(), [['caia', 3, 30], ['tizio', 3, 30]]);
  assert.equal(points.get(CH, 'tizio'), 60);
  const dette = p.annunciDi(CH, e, { ora: T0 + 2 * GIORNO + 5 * MIN });
  assert.equal(dette.length, 1); assert.match(dette[0], /@caia \(3\), @tizio \(3\)|@tizio \(3\), @caia \(3\)/);
  assert.deepEqual(p.annunciDi(CH, e, { ora: T0 + 2 * GIORNO + 5 * MIN + 10_000 }), [], 'una riga al minuto');
  const uno = p.annunciDi(CH, { traguardi: [{ user: 'tizio', serie: 5, bonus: 50 }] }, { ora: T0 + 3 * GIORNO });
  assert.equal(uno[0], '📅 5ª diretta di fila per @tizio! Grazie di esserci sempre: +50 gemme.');
  assert.deepEqual(p.di(CH, 'tizio'), { serie: 3, dirette: 3, record: 3 });
  assert.equal(p.classifica(CH, 5)[0].serie, 3);
});

test('i saluti: la prima volta la dice Twitch, il ritorno la data, e non si saluta a raffica', () => {
  const dette = [];
  const say = (t) => dette.push(t);
  const msg = (user, extra = {}) => ({ channel: CH, user, display: user[0].toUpperCase() + user.slice(1), text: 'ciao a tutti', tags: {}, ...extra });
  assert.equal(p.suMessaggio(msg('nuovo', { tags: { 'first-msg': '1' } }), say, { ora: T0, live: true }), 'prima');
  assert.equal(dette[0], 'Ciao Nuovo, è la tua prima volta qui: fai come a casa tua.');
  assert.equal(p.suMessaggio(msg('nuovo', { tags: { 'first-msg': '1' } }), say, { ora: T0 + 10_000, live: true }), null, 'una volta sola, anche se il tag torna');
  assert.equal(p.suMessaggio(msg('vecchio'), say, { ora: T0 + MIN, live: true }), null, 'senza tag su Twitch non e\' la prima volta');
  assert.equal(p.suMessaggio(msg('vecchio'), say, { ora: T0 + MIN + 25 * GIORNO, live: true }), 'ritorno');
  assert.equal(dette.at(-1), 'Ehi Vecchio, sono passati 25 giorni: che bello rivederti.');
  assert.equal(p.suMessaggio(msg('vecchio'), say, { ora: T0 + MIN + 25 * GIORNO + 5_000, live: true }), null, 'appena salutato, e\' tornato');
  assert.equal(p.suMessaggio(msg('altro', { tags: { 'first-msg': '1' } }), say, { ora: T0 + MIN + 25 * GIORNO + 10_000, live: true }), null, 'riposo: un saluto ogni tre quarti di minuto');
  assert.equal(p.suMessaggio(msg('altro2', { tags: { 'first-msg': '1' }, text: '!ore' }), say, { ora: T0 + 30 * GIORNO, live: true }), null, 'un comando non fa partire un saluto');
  assert.equal(p.suMessaggio(msg('altro3', { tags: { 'first-msg': '1' } }), say, { ora: T0 + 31 * GIORNO, live: false }), null, 'di base solo in diretta');
  assert.equal(p.suMessaggio(msg('nightbot', { tags: { 'first-msg': '1' } }), say, { ora: T0 + 32 * GIORNO, live: true }), null, 'un bot noto non si saluta');
  // il tetto: sei saluti in dieci minuti, poi silenzio
  const base = T0 + 40 * GIORNO;
  let saluti = 0;
  for (let i = 0; i < 10; i++) if (p.suMessaggio(msg('r' + i, { tags: { 'first-msg': '1' } }), say, { ora: base + i * MIN, live: true })) saluti++;
  assert.equal(saluti, 6, 'un raid non fa sputare saluti');
  // fuori da Twitch decide la memoria dei messaggi
  memory.logMessage(CH, 'kicker', 'Kicker', 'ehi', false, base + 20 * MIN);
  assert.equal(p.suMessaggio(msg('kicker', { piattaforma: 'kick' }), say, { ora: base + 20 * MIN, live: true }), 'prima');
  memory.logMessage(CH, 'kicker', 'Kicker', 'ehi ancora', false, base + 21 * MIN);
  assert.equal(p.suMessaggio(msg('kicker', { piattaforma: 'kick' }), say, { ora: base + 21 * MIN, live: true }), null);
  // quello che ti sei costruito vince: un Modulo sul primo messaggio spegne il saluto di serie
  modulesDb.save(CH, { nome: 'benvenuto mio', attivo: true, trigger: { tipo: 'evento', evento: 'first' }, azioni: [{ tipo: 'dire', testo: 'ciao' }] });
  assert.equal(p.moduloSulPrimoMessaggio(CH), true);
  assert.equal(p.suMessaggio(msg('ultimo', { tags: { 'first-msg': '1' } }), say, { ora: base + 30 * MIN, live: true }), null);
  // i testi sono dello streamer; vuoto = niente
  streamers.setSettings(CH, { nomeMonete: 'gemme', presenze: { saluti: { bentornato: '', primaVolta: 'Oh, {user}: {giorni} {serie} {dirette} {boh}' } } });
  modulesDb.list(CH).forEach((m) => modulesDb.remove?.(CH, m.id));
  assert.equal(p.suMessaggio(msg('vecchio'), say, { ora: base + 80 * GIORNO, live: true }), null, 'testo vuoto: nessun saluto di ritorno');
});

test('le impostazioni si normalizzano pure, anche a meta\', e i comandi rispondono', () => {
  const n = p.normalizza({ bonus: '25', tetto: 0, saluti: { giorniAssenza: 1000, primaVolta: '  ehi {user} ' } }, { annuncia: false });
  assert.equal(n.bonus, 25); assert.equal(n.tetto, 1); assert.equal(n.annuncia, false, 'quello che non arriva resta com\'era');
  assert.equal(n.saluti.giorniAssenza, 365); assert.equal(n.saluti.primaVolta, 'ehi {user}'); assert.equal(n.saluti.bentornato, p.DEFAULT.saluti.bentornato);
  assert.deepEqual(p.normalizza(undefined), { ...p.DEFAULT, saluti: { ...p.DEFAULT.saluti } });
  streamers.setSettings(CH, { nomeMonete: 'gemme' });
  const dette = [];
  const say = (t) => dette.push(t);
  assert.equal(p.tryComando({ channel: CH, user: 'tizio', display: 'Tizio', text: '!serie' }, say), true);
  assert.equal(dette[0], '📅 @Tizio: 3 dirette di fila (record 3), presente a 3 dirette in tutto.');
  assert.equal(p.tryComando({ channel: CH, user: 'x', display: 'X', text: '!serie @mai' }, say), true);
  assert.match(dette[1], /^📅 @mai non risulta ancora/);
  assert.equal(p.tryComando({ channel: CH, user: 'x', text: '!classificaserie' }, say), true);
  assert.match(dette[2], /^📅 Serie di presenze: 🥇 (tizio|caia) 3 · 🥈 (tizio|caia) 3/);
  assert.equal(p.tryComando({ channel: CH, user: 'x', text: '!ore' }, say), false);
  streamers.setSettings(CH, { nomeMonete: 'gemme', presenze: { attivo: false } });
  assert.equal(p.tryComando({ channel: CH, user: 'x', text: '!serie' }, say), false, 'spento, non risponde');
  assert.deepEqual(p.giroDiretta(CH, { streamId: 'z', chatters: ['a'], ora: T0 + 90 * GIORNO }).presenze, []);
});
