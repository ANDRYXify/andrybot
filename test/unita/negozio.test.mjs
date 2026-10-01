// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL NEGOZIO: un acquisto e' una cosa sola, o non e' niente.
//
// Le prove seguono la promessa di docs/NEGOZIO.md: le monete tolte, la scorta
// scalata e l'effetto partono insieme o non parte niente; se l'effetto non
// parte le monete tornano e lo storico lo dice; un requisito che non si sa non
// fa comprare; due acquisti dell'ultima scorta non passano tutti e due; e il
// negozio di un canale non vede niente degli altri.
//
// Twitch e i motori del bot entrano da fuori (fonti ed esecutori finti), come
// in produzione entrano dal bot: la regola si prova senza rete.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('negozio-');
const { streamers, points, negozio: N, db } = await import('../../src/db.js');
const S = await import('../../src/features/negozio.js');
const T = await import('../../src/features/negozio-tipi.js');
const Rq = await import('../../src/features/negozio-requisiti.js');
const R = await import('../../src/features/comandi-registro.js');
test.after(() => casa.pulisci());

const ORA = Date.UTC(2026, 8, 30, 12);
let giro = 0;

// Un canale nuovo per ogni prova: niente di una prova resta nell'altra.
function canale(monete = {}, settings = {}) {
  const ch = `negozio${++giro}`;
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { negozio: { attivo: true }, ...settings });
  for (const [u, n] of Object.entries(monete)) points.add(ch, u, n);
  return ch;
}
function articolo(ch, grezzo) {
  const n = S.normArticolo({ nome: 'Spada di legno', tipo: 'oggetto', prezzo: 100, ...grezzo });
  assert.ok(n.ok, `articolo valido: ${n.errore}`);
  const r = N.salva(ch, n.articolo);
  assert.ok(r.ok, `salvato: ${r.motivo}`);
  return r.articolo;
}
const msg = (ch, user, extra = {}) => ({ channel: ch, user, display: user.toUpperCase(), userId: `id-${user}`, text: '', tags: { 'badge-info': '', badges: '' }, ...extra });
const va = () => ({ puoPartire: () => '', esegui: async () => ({ ok: true }) });
const compra = (ch, user, parola, extra = {}) => S.compra({ canale: ch, msg: msg(ch, user, extra.msg), parola, ora: ORA, esecutori: { effetto: va() }, ...extra });
const storicoDi = (ch) => N.storico(ch).righe;

test('acquisto riuscito: le monete escono, l\'oggetto entra nella borsa, lo storico lo scrive', async () => {
  const ch = canale({ anna: 250 });
  const a = articolo(ch, { scorte: { modo: 'tutto', n: 3 } });
  const e = await compra(ch, 'anna', 'spada');
  assert.equal(e.ok, true);
  assert.equal(e.momento, 'fattoBorsa');
  assert.equal(points.get(ch, 'anna'), 150);
  assert.equal(N.articolo(ch, a.id).scorta, 2, 'la scorta e\' scalata');
  assert.deepEqual(N.borsa(ch, 'anna').map((b) => [b.nome, b.quanti]), [['Spada di legno', 1]]);
  const [s] = storicoDi(ch);
  assert.equal(s.stato, 'fatto');
  assert.equal(s.prezzo, 100);
  assert.equal(s.user, 'anna');
  await compra(ch, 'anna', 'spada');
  assert.deepEqual(N.borsa(ch, 'anna').map((b) => b.quanti), [2], 'la seconda si somma alla prima');
});

test('acquisto con un effetto: fatto solo quando l\'effetto e\' partito', async () => {
  const ch = canale({ bea: 80 });
  articolo(ch, { nome: 'Trombetta', tipo: 'effetto', prezzo: 30, dati: { preset: 'trombetta' } });
  const partiti = [];
  const e = await compra(ch, 'bea', 'trombetta', { esecutori: { effetto: { puoPartire: () => '', esegui: async ({ a }) => { partiti.push(a.dati.preset); return { ok: true }; } } } });
  assert.equal(e.momento, 'fatto');
  assert.deepEqual(partiti, ['trombetta']);
  assert.equal(points.get(ch, 'bea'), 50);
  assert.equal(storicoDi(ch)[0].stato, 'fatto');
});

test('monete che non bastano: non si tocca niente', async () => {
  const ch = canale({ carlo: 99 });
  const a = articolo(ch, { scorte: { modo: 'tutto', n: 1 } });
  const e = await compra(ch, 'carlo', 'spada');
  assert.equal(e.ok, false);
  assert.equal(e.momento, 'monete');
  assert.equal(e.dati.saldo, '99');
  assert.equal(points.get(ch, 'carlo'), 99);
  assert.equal(N.articolo(ch, a.id).scorta, 1);
  assert.equal(storicoDi(ch).length, 0);
  const niente = await compra(ch, 'nessuno', 'spada');
  assert.equal(niente.momento, 'monete', 'chi non ha mai avuto monete ne ha zero');
});

test('scorte finite, in tutto e a persona', async () => {
  const ch = canale({ dora: 1000, elio: 1000 });
  articolo(ch, { nome: 'Ultima', scorte: { modo: 'tutto', n: 1 } });
  assert.equal((await compra(ch, 'dora', 'ultima')).ok, true);
  const finita = await compra(ch, 'elio', 'ultima');
  assert.equal(finita.momento, 'scorte');
  assert.equal(points.get(ch, 'elio'), 1000);

  articolo(ch, { nome: 'Badge', scorte: { modo: 'persona', n: 1 } });
  assert.equal((await compra(ch, 'dora', 'badge')).ok, true);
  const di = await compra(ch, 'dora', 'badge');
  assert.equal(di.momento, 'persona');
  assert.equal(di.dati.quante, 1);
  assert.equal((await compra(ch, 'elio', 'badge')).ok, true, 'a persona vuol dire a persona: gli altri comprano');
});

test('le scorte sono una scelta sola: o in tutto, o a persona, o illimitate', () => {
  const tutto = S.normArticolo({ nome: 'X', tipo: 'oggetto', scorte: { modo: 'tutto', n: 5 } }).articolo;
  assert.deepEqual([tutto.scorta, tutto.perPersona], [5, 0]);
  const persona = S.normArticolo({ nome: 'X', tipo: 'oggetto', scorte: { modo: 'persona', n: 2 } }).articolo;
  assert.deepEqual([persona.scorta, persona.perPersona], [null, 2]);
  const libere = S.normArticolo({ nome: 'X', tipo: 'oggetto', scorte: { modo: 'boh', n: 2 } }).articolo;
  assert.deepEqual([libere.scorta, libere.perPersona], [null, 0]);
  assert.equal(S.normArticolo({ nome: 'X', tipo: 'oggetto', scorte: { modo: 'persona', n: 0 } }).errore, 'scorte');
  assert.deepEqual(S.scorteDi(persona), { modo: 'persona', n: 2 });
});

test('attese: a persona e per tutti, contate dagli acquisti veri', async () => {
  const ch = canale({ fede: 1000, gino: 1000 });
  articolo(ch, { nome: 'Coriandoli', prezzo: 10, attesaTesta: 60, attesaTutti: 10 });
  assert.equal((await compra(ch, 'fede', 'coriandoli')).ok, true);
  const tutti = await compra(ch, 'gino', 'coriandoli', { ora: ORA + 5000 });
  assert.equal(tutti.momento, 'attesa');
  assert.equal(tutti.dati.perTutti, true);
  assert.equal(tutti.dati.tempo, '5 secondi');
  assert.equal((await compra(ch, 'gino', 'coriandoli', { ora: ORA + 11_000 })).ok, true, 'passata l\'attesa di tutti');
  const testa = await compra(ch, 'fede', 'coriandoli', { ora: ORA + 30_000 });
  assert.equal(testa.momento, 'attesa');
  assert.equal(testa.dati.perTutti, false);
  assert.equal(testa.dati.tempo, '30 secondi');
  assert.equal((await compra(ch, 'fede', 'coriandoli', { ora: ORA + 61_000 })).ok, true);
});

test('un rimborso non conta come acquisto: ne' + "'" + ' per l\'attesa ne\' per le scorte a persona', async () => {
  const ch = canale({ ivo: 500 });
  articolo(ch, { nome: 'Fuoco', tipo: 'effetto', dati: { preset: 'tada' }, prezzo: 10, attesaTesta: 600, scorte: { modo: 'persona', n: 1 } });
  const no = { effetto: { puoPartire: () => '', esegui: async () => ({ ok: false, motivo: 'overlay' }) } };
  assert.equal((await compra(ch, 'ivo', 'fuoco', { esecutori: no })).momento, 'rimborso');
  assert.equal((await compra(ch, 'ivo', 'fuoco', { ora: ORA + 1000 })).ok, true);
});

test('requisito non leggibile: non si compra, e lo dice', async () => {
  const ch = canale({ lea: 500 });
  articolo(ch, { nome: 'Corona', requisiti: [{ tipo: 'tier', soglia: 2 }] });
  const muto = { tier: async () => null };
  const e = await compra(ch, 'lea', 'corona', { fonti: muto });
  assert.equal(e.ok, false);
  assert.equal(e.momento, 'nonSo');
  assert.match(S.frase(ch, e.momento, e.dati), /non riesco a verificarlo/);
  assert.equal(points.get(ch, 'lea'), 500);
  assert.equal(storicoDi(ch).length, 0);
  const tier1 = await compra(ch, 'lea', 'corona', { fonti: { tier: async () => 1 } });
  assert.equal(tier1.momento, 'requisito', 'un tier letto e basso e\' un no, non un non-so');
  assert.equal((await compra(ch, 'lea', 'corona', { fonti: { tier: async () => 3 } })).ok, true);
  const kick = await compra(ch, 'lea', 'corona', { fonti: { tier: async () => 3 }, msg: { piattaforma: 'kick' } });
  assert.equal(kick.momento, 'nonSo', 'fuori da Twitch il tier non si sa');
});

test('un requisito che manca di sicuro si dice prima di uno che non si sa, e Twitch non si disturba', async () => {
  const ch = canale({ max: 500 });
  articolo(ch, { nome: 'Trono', requisiti: [{ tipo: 'tier', soglia: 1 }, { tipo: 'ore', soglia: 10 }] });
  let chieste = 0;
  const e = await compra(ch, 'max', 'trono', { fonti: { tier: async () => { chieste++; return null; } } });
  assert.equal(e.momento, 'requisito');
  assert.match(e.dati.requisito, /10 ore/);
  assert.equal(chieste, 0);
});

test('effetto che fallisce: le monete e la scorta tornano, e lo storico scrive perche\'', async () => {
  const ch = canale({ nora: 300 });
  const a = articolo(ch, { nome: 'VIP', tipo: 'vip', prezzo: 200, dati: { dirette: 2 }, scorte: { modo: 'tutto', n: 1 } });
  const pieno = { vip: { puoPartire: () => '', esegui: async () => ({ ok: false, motivo: 'vipPieni' }) } };
  const e = await compra(ch, 'nora', 'vip', { esecutori: pieno });
  assert.equal(e.ok, false);
  assert.equal(e.momento, 'rimborso');
  assert.match(S.frase(ch, e.momento, e.dati), /posti VIP del canale sono pieni.*Ti ho reso 200/);
  assert.equal(points.get(ch, 'nora'), 300);
  assert.equal(N.articolo(ch, a.id).scorta, 1);
  const [s] = storicoDi(ch);
  assert.deepEqual([s.stato, s.motivo], ['rimborsato', 'vipPieni']);

  const rotto = { vip: { puoPartire: () => '', esegui: async () => { throw new Error('boom'); } } };
  const e2 = await compra(ch, 'nora', 'vip', { esecutori: rotto });
  assert.equal(e2.momento, 'rimborso');
  assert.equal(storicoDi(ch)[0].motivo, 'errore');
  assert.equal(points.get(ch, 'nora'), 300, 'anche un effetto che esplode rende le monete');
});

test('quello che si sa prima non costa niente: l\'effetto che non puo\' partire non tocca le monete', async () => {
  const ch = canale({ olga: 300 });
  articolo(ch, { nome: 'Botto', tipo: 'effetto', dati: { preset: 'tada' }, prezzo: 50 });
  const spento = { effetto: { puoPartire: () => 'overlay', esegui: async () => assert.fail('non deve partire') } };
  const e = await compra(ch, 'olga', 'botto', { esecutori: spento });
  assert.equal(e.momento, 'nonParte');
  assert.match(S.frase(ch, e.momento, e.dati), /overlay in questo momento è spento\. Le tue monete restano dove sono\.$/);
  assert.equal(points.get(ch, 'olga'), 300);
  assert.equal(storicoDi(ch).length, 0);
});

test('due acquisti simultanei dell\'ultima scorta: ne passa uno solo', async () => {
  const ch = canale({ pia: 500, ugo: 500 });
  const a = articolo(ch, { nome: 'Unica', scorte: { modo: 'tutto', n: 1 }, requisiti: [{ tipo: 'tier', soglia: 1 }] });
  // I requisiti fanno aspettare tutti e due: entrambi passano i controlli di
  // prima prima che uno dei due arrivi alla transazione.
  let aperti = 0;
  let via;
  const cancello = new Promise((r) => { via = r; });
  const fonti = { tier: async () => { if (++aperti === 2) via(); await cancello; return 1; } };
  const [x, y] = await Promise.all([compra(ch, 'pia', 'unica', { fonti }), compra(ch, 'ugo', 'unica', { fonti })]);
  assert.equal(aperti, 2, 'tutti e due sono arrivati ai requisiti con la scorta ancora a uno');
  assert.deepEqual([x.ok, y.ok].sort(), [false, true]);
  const perso = x.ok ? y : x;
  assert.equal(perso.momento, 'scorte');
  assert.equal(N.articolo(ch, a.id).scorta, 0);
  assert.equal(points.get(ch, 'pia') + points.get(ch, 'ugo'), 900, 'ha pagato uno solo');
  assert.equal(storicoDi(ch).length, 1);
});

test('le stesse monete non comprano due cose a meta\' strada', async () => {
  const ch = canale({ rita: 150 });
  articolo(ch, { nome: 'Alfa', prezzo: 100, requisiti: [{ tipo: 'tier', soglia: 1 }] });
  articolo(ch, { nome: 'Beta', prezzo: 100, requisiti: [{ tipo: 'tier', soglia: 1 }] });
  let aperti = 0; let via;
  const cancello = new Promise((r) => { via = r; });
  const fonti = { tier: async () => { if (++aperti === 2) via(); await cancello; return 1; } };
  const [x, y] = await Promise.all([compra(ch, 'rita', 'alfa', { fonti }), compra(ch, 'rita', 'beta', { fonti })]);
  assert.deepEqual([x.ok, y.ok].sort(), [false, true]);
  assert.equal((x.ok ? y : x).momento, 'monete');
  assert.equal(points.get(ch, 'rita'), 50);
});

test('isolamento fra canali: il negozio di uno non vede niente dell\'altro', async () => {
  const uno = canale({ sara: 500 });
  const due = canale({ sara: 500 });
  const a = articolo(uno, { nome: 'Gemma', tipo: 'mano', prezzo: 100 });
  assert.equal((await compra(due, 'sara', 'gemma')).momento, 'nonCe', 'la parola di un canale non esiste nell\'altro');
  assert.equal(N.articolo(due, a.id), null, 'nemmeno per numero');
  assert.equal(N.prenota(due, { articolo: a.id, user: 'sara', stato: 'fatto' }).motivo, 'nonCe');
  const e = await compra(uno, 'sara', 'gemma');
  assert.equal(e.ok, true);
  assert.equal(points.get(uno, 'sara'), 400);
  assert.equal(points.get(due, 'sara'), 500, 'le monete sono del canale');
  assert.equal(N.coda(due).length, 0);
  assert.equal(N.coda(uno).length, 1);
  assert.equal(N.rimborsa(due, e.dati.id, 'rifiutato').ok, false, 'da un altro canale non si rimborsa');
  assert.equal(N.consegna(due, e.dati.id), false);
  assert.equal(N.togli(due, a.id).ok, false, 'e non si toglie');
  assert.equal(storicoDi(due).length, 0);
  assert.equal(N.articoli(due).length, 0);
  assert.equal(N.salva(due, { ...S.normArticolo({ nome: 'Gemma', tipo: 'oggetto', id: a.id }).articolo }).ok, false, 'e non si riscrive');
  assert.equal(N.articolo(uno, a.id).tipo, 'mano');
  assert.equal(S.inVetrina(due).length, 0);
  const detti = [];
  await S.tryComando({ channel: due, user: 'sara', display: 'Sara', text: '!negozio gemma' }, (t) => detti.push(t), { esecutori: {}, fonti: {} });
  assert.match(detti[0], /non c'è «gemma»/, 'e nemmeno se ne parla');
});

test('da consegnare a mano: in coda, poi fatto oppure rifiutato e rimborsato', async () => {
  const ch = canale({ teo: 300, ada: 300 });
  const a = articolo(ch, { nome: 'Scegli il prossimo gioco', parola: 'gioco', tipo: 'mano', prezzo: 120, dati: { domanda: 'Quale gioco?' }, scorte: { modo: 'tutto', n: 5 } });
  const senza = await compra(ch, 'teo', 'gioco');
  assert.equal(senza.momento, 'serveTesto');
  assert.match(S.frase(ch, senza.momento, senza.dati), /Quale gioco\? Rispondi così: !compra gioco/);
  const e = await compra(ch, 'teo', 'gioco', { nota: 'Elden Ring' });
  assert.equal(e.momento, 'fattoCoda');
  const f = await compra(ch, 'ada', 'gioco', { nota: 'Hades' });
  const coda = N.coda(ch);
  assert.deepEqual(coda.map((x) => [x.user, x.nota]), [['teo', 'Elden Ring'], ['ada', 'Hades']]);
  assert.equal(N.consegna(ch, e.dati.id), true);
  assert.equal(N.consegna(ch, e.dati.id), false, 'una volta sola');
  const r = N.rimborsa(ch, f.dati.id, 'rifiutato', { da: ['da_consegnare'] });
  assert.equal(r.ok, true);
  assert.equal(N.rimborsa(ch, f.dati.id, 'rifiutato', { da: ['da_consegnare'] }).ok, false, 'il doppio clic non rende due volte');
  assert.equal(points.get(ch, 'ada'), 300);
  assert.equal(N.articolo(ch, a.id).scorta, 4, 'la scorta di chi e\' stato rimborsato torna');
  assert.equal(N.rimborsa(ch, e.dati.id, 'rifiutato', { da: ['da_consegnare'] }).ok, false, 'quello consegnato non si rimborsa piu\'');
  assert.equal(N.coda(ch).length, 0);
});

test('dopo un riavvio a meta\', le monete tornano a chi aveva comprato', () => {
  const ch = canale({ vito: 300 });
  const a = articolo(ch, { nome: 'Lampo', tipo: 'effetto', dati: { preset: 'laser' }, prezzo: 70, scorte: { modo: 'tutto', n: 2 } });
  const p = N.prenota(ch, { articolo: a.id, user: 'vito', stato: 'in_corso', ora: ORA });
  assert.equal(p.ok, true);
  assert.equal(points.get(ch, 'vito'), 230);
  const resi = S.rimborsaSospesi().filter((r) => r.channel === ch);
  assert.deepEqual(resi.map((r) => [r.user, r.prezzo]), [['vito', 70]]);
  assert.equal(points.get(ch, 'vito'), 300);
  assert.equal(N.articolo(ch, a.id).scorta, 2);
  assert.equal(N.acquisto(ch, p.id).motivo, 'riavvio');
  assert.equal(S.rimborsaSospesi().filter((r) => r.channel === ch).length, 0);
});

test('quando: solo in diretta, o fra due date', async () => {
  const ch = canale({ zoe: 500 });
  articolo(ch, { nome: 'Serale', quando: 'diretta' });
  assert.equal((await compra(ch, 'zoe', 'serale')).momento, 'chiuso');
  assert.equal((await compra(ch, 'zoe', 'serale', { live: true })).ok, true);
  articolo(ch, { nome: 'Natale', quando: 'date', dal: ORA + 86400_000, al: ORA + 2 * 86400_000 });
  const presto = await compra(ch, 'zoe', 'natale');
  assert.equal(presto.momento, 'chiuso');
  assert.match(S.frase(ch, presto.momento, presto.dati), /si compra dal 01\/10\/2026 al 02\/10\/2026/, 'le date nel formato del canale');
  assert.equal((await compra(ch, 'zoe', 'natale', { ora: ORA + 1.5 * 86400_000 })).ok, true);
  assert.equal(S.normArticolo({ nome: 'X', tipo: 'oggetto', quando: 'date', dal: 5, al: 4 }).errore, 'date');
});

test('i requisiti si leggono da dove stanno: il badge, il messaggio, le presenze', async () => {
  const ch = canale();
  const m = (tags, extra = {}) => ({ channel: ch, user: 'ivo', userId: '7', tags, ...extra });
  assert.deepEqual(Rq.mesiDalBadge(m({ 'badge-info': 'subscriber/14', badges: 'subscriber/12' })), { sa: true, valore: 14 });
  assert.deepEqual(Rq.mesiDalBadge(m({ 'badge-info': 'founder/5', badges: 'founder/0' })), { sa: true, valore: 5 });
  assert.deepEqual(Rq.mesiDalBadge(m({ 'badge-info': '', badges: '', subscriber: '0' })), { sa: true, valore: 0 }, 'chi non e\' abbonato adesso ha zero mesi');
  assert.equal(Rq.mesiDalBadge(m({ 'badge-info': '', badges: 'subscriber/0', subscriber: '1' })).sa, false, 'abbonato senza i mesi: non si sa');
  assert.equal(Rq.mesiDalBadge(m({ 'badge-info': 'subscriber/3' }, { piattaforma: 'kick' })).sa, false);
  assert.equal(Rq.mesiDalBadge({ channel: ch, user: 'ivo' }).sa, false, 'un messaggio senza tag non dice niente');
  assert.equal((await Rq.leggi('ruolo', { canale: ch, msg: { isVip: true } })).valore, 1);
  assert.equal((await Rq.leggi('ruolo', { canale: ch, msg: { isMod: true } })).valore, 2);
  assert.equal(Rq.esito({ tipo: 'ruolo', soglia: 1 }, { sa: true, valore: 2 }), 'ok', 'un moderatore vale anche per un requisito da VIP');
  const segue = await Rq.leggi('follower', { canale: ch, msg: m({}), fonti: { followerDal: async () => ORA - 3 * 86400_000 }, ora: ORA });
  assert.deepEqual(segue, { sa: true, valore: 3 });
  const nonSegue = await Rq.leggi('follower', { canale: ch, msg: m({}), fonti: { followerDal: async () => 0 }, ora: ORA });
  assert.equal(Rq.esito({ tipo: 'follower', soglia: 0 }, nonSegue), 'no', 'chi non segue non passa nemmeno «segue il canale»');
  assert.equal(Rq.esito({ tipo: 'follower', soglia: 0 }, { sa: true, valore: 0 }), 'ok', 'chi segue da oggi si');
  assert.deepEqual(Rq.normRequisiti([{ tipo: 'ore', soglia: 5 }, { tipo: 'ore', soglia: 9 }, { tipo: 'boh', soglia: 1 }, { tipo: 'tier', soglia: 7 }]),
    [{ tipo: 'tier', soglia: 3 }, { tipo: 'ore', soglia: 9 }], 'uno per tipo, dentro i limiti, e niente di inventato');
});

test('i Bit sono quelli della classifica di Twitch, la stessa di !bit sempre', async () => {
  const { scorda } = await import('../../src/features/bit.js');
  const ch = canale();
  const riga = (login, bit) => ({ login, nome: login, posto: 1, bit });
  let chiestaPersona = 0;
  const helix = {
    getClassificaBit: async (_c, { periodo }) => { assert.equal(periodo, 'all'); return [riga('uno', 5000), riga('due', 300)]; },
    bitDi: async () => { chiestaPersona++; return 42; },
  };
  const f = Rq.fontiTwitch(helix);
  assert.equal(await f.bit(ch, 'due', '2'), 300);
  assert.equal(await f.bit(ch, 'tre', '3'), 0, 'una classifica tutta intera senza di lei: non ha mai cheerato');
  assert.equal(chiestaPersona, 0);
  scorda(ch);
  const piena = Array.from({ length: 100 }, (_, i) => riga(`p${i}`, 1000 - i));
  const f2 = Rq.fontiTwitch({ getClassificaBit: async () => piena, bitDi: async () => { chiestaPersona++; return 42; } });
  assert.equal(await f2.bit(ch, 'fuori', '9'), 42, 'classifica piena e lei fuori: si chiede a Twitch per lei');
  assert.equal(chiestaPersona, 1);
  scorda(ch);
  const f3 = Rq.fontiTwitch({ getClassificaBit: async () => null, bitDi: async () => null });
  assert.equal(await f3.bit(ch, 'boh', '1'), null, 'Twitch muto: non si sa');
  scorda(ch);
});

test('gli esecutori veri: il VIP pieno rende le monete, l\'overlay spento non le prende', async () => {
  const ch = canale({ gaia: 1000 });
  streamers.setSettings(ch, { ...streamers.get(ch).settings });
  articolo(ch, { nome: 'VIP stasera', parola: 'vip', tipo: 'vip', prezzo: 300, dati: { dirette: 1 } });
  const helix = {
    getUserByLogin: async (l) => ({ id: 'u-' + l, display_name: l.toUpperCase() }),
    getVips: async () => [],
    addVip: async () => ({ ok: false, motivo: 'non ci sono più slot VIP liberi' }),
  };
  const es = T.esecutori({ helix, effetti: { hasClients: () => false } });
  const e = await S.compra({ canale: ch, msg: msg(ch, 'gaia'), parola: 'vip', esecutori: es, ora: ORA });
  assert.equal(e.momento, 'rimborso');
  assert.equal(e.dati.codice, 'vipPieni');
  assert.equal(points.get(ch, 'gaia'), 1000);
  const mod = await S.compra({ canale: ch, msg: msg(ch, 'gaia', { isMod: true }), parola: 'vip', esecutori: es, ora: ORA });
  assert.equal(mod.dati.codice, 'vipStaff', 'Twitch non da\' il VIP a un moderatore: lo si sa prima');

  articolo(ch, { nome: 'Tada', tipo: 'effetto', dati: { preset: 'tada' }, prezzo: 10 });
  const spento = await S.compra({ canale: ch, msg: msg(ch, 'gaia'), parola: 'tada', esecutori: es, ora: ORA });
  assert.equal(spento.momento, 'nonParte');
  assert.equal(spento.dati.codice, 'overlay');

  const helixOk = { ...helix, addVip: async () => ({ ok: true }) };
  const ok = await S.compra({ canale: ch, msg: msg(ch, 'gaia'), parola: 'vip', esecutori: T.esecutori({ helix: helixOk }), ora: ORA });
  assert.equal(ok.momento, 'fattoVip');
  const { vips } = await import('../../src/db.js');
  assert.equal(vips.get(ch, 'gaia').dirette, 1);
  await S.compra({ canale: ch, msg: msg(ch, 'gaia'), parola: 'vip', esecutori: T.esecutori({ helix: helixOk }), ora: ORA });
  assert.equal(vips.get(ch, 'gaia').dirette, 2, 'un secondo acquisto allunga, non riparte da capo');
});

test('in chat: i tre comandi, rinominabili, e un negozio chiuso tace', async () => {
  const ch = canale({ lia: 500 });
  articolo(ch, { nome: 'Spada di legno' });
  articolo(ch, { nome: 'Scudo', prezzo: 50 });
  articolo(ch, { nome: 'Segreto', prezzo: 5, siVede: 'chi_puo' });
  const detti = [];
  const scrivi = async (text) => {
    const m = { channel: ch, user: 'lia', display: 'Lia', text, id: '' };
    const v = R.preparaComando(ch, m);
    if (v?.salta) return false;
    return S.tryComando({ ...m, text: v?.testo || text }, (t) => detti.push(t), { esecutori: {}, fonti: {} });
  };
  await scrivi('!compra scudo');
  assert.match(detti.pop(), /Lia, Scudo è nella tua borsa \(!borsa\)\. Le tue monete: 450\.$/);
  await scrivi('!negozio');
  const elenco = detti.pop();
  assert.match(elenco, /^🛒 Nel negozio: Scudo \(scudo\), 50 monete · Spada di legno \(spada\), 100 monete\./);
  assert.ok(!/Segreto/.test(elenco), 'quello che si vede solo a chi lo puo\' comprare non esce nella risposta a tutti');
  await scrivi('!borsa');
  assert.equal(detti.pop(), '🎒 Lia, nella tua borsa: Scudo.');
  articolo(ch, { nome: 'Corona', prezzo: 1500, descrizione: 'Brilla.', requisiti: [{ tipo: 'ore', soglia: 5 }], scorte: { modo: 'persona', n: 1 } });
  await scrivi('!negozio corona');
  assert.equal(detti.pop(), '🛒 Corona (corona): 1500 monete. Brilla. È per chi ha guardato almeno 5 ore. Una volta a testa.');
  streamers.setSettings(ch, { ...streamers.get(ch).settings, comandi: { compra: { nome: 'prendi' } } });
  await scrivi('!prendi spada');
  assert.match(detti.pop(), /Spada di legno è nella tua borsa/);
  await scrivi('!negozio nessuno');
  assert.match(detti.pop(), /non c'è «nessuno»\. Cosa c'è lo vedi con !negozio/);
  streamers.setSettings(ch, { ...streamers.get(ch).settings, negozio: { attivo: false } });
  const prima = detti.length;
  assert.equal(await scrivi('!negozio'), false);
  assert.equal(detti.length, prima, 'chiuso non risponde');
});

test('le frasi parlano la lingua del canale, e ogni momento ce l\'ha in tutte e tre', () => {
  const ch = canale();
  const dati = { nome: 'Ana', articolo: 'Espada', parola: 'espada', prezzo: '100', saldo: '5', moneta: 'x', cmd: '!compra', cmdNegozio: '!negozio', cmdBorsa: '!borsa', requisito: 'r', perche: 'p', tempo: 't', quante: 1, n: 1, cifra: '1', lista: 'l', voci: 'v', streamer: 's', brano: 'b', direttePer: 'd', dal: 'a', al: 'b', quando: 'date', tipo: 'musica', domanda: 'q', url: 'u' };
  for (const l of ['it', 'en', 'es']) {
    streamers.setSettings(ch, { preferenze: { lingua: l } });
    for (const m of S.MOMENTI) {
      const t = S.frase(ch, m, dati);
      assert.ok(t && !t.includes('undefined'), `${l}/${m}`);
      assert.ok(!/[—–]/.test(t), `${l}/${m}: niente lineette lunghe`);
    }
  }
  streamers.setSettings(ch, { preferenze: { lingua: 'es' } });
  assert.equal(S.frase(ch, 'fatto', dati), '🛒 Ana, has comprado Espada. Tus monedas: 5.');
  assert.deepEqual(S.monetaIn(ch, 'es'), { nome: 'monedas', forma: 'fp' }, 'il nome di serie si dice nella lingua della chat');
  assert.equal(S.requisitoAParole({ tipo: 'follower', soglia: 0 }, 'en'), 'follows the channel');
});

test('la moneta ha il nome e la forma del canale: «I tuoi Semi di girasole», e il segno d\'accordo non esce mai', () => {
  const ch = canale();
  const dati = { nome: 'Ana', articolo: 'Espada', parola: 'espada', prezzo: '100', saldo: '5', cmd: '!compra', cmdNegozio: '!negozio', cmdBorsa: '!borsa', requisito: 'r', perche: 'p', tempo: 't', quante: 2, n: 2, cifra: '2', lista: 'l', voci: 'v', streamer: 's', brano: 'b', direttePer: 'd', dal: 'a', al: 'b', quando: 'date', tipo: 'musica', domanda: 'q' };
  const imposta = (lingua, nomeMonete, formaMonete) => streamers.setSettings(ch, { preferenze: { lingua }, nomeMonete, formaMonete });
  imposta('it', 'Semi di girasole');
  assert.equal(S.frase(ch, 'fattoBorsa', dati), '🎒 Ana, Espada è nella tua borsa (!borsa). I tuoi Semi di girasole: 5.');
  assert.match(S.frase(ch, 'nonParte', dati), /: p\. I tuoi Semi di girasole restano dove sono\.$/);
  assert.equal(S.frase(ch, 'voce', dati), 'Espada (espada), 100 Semi di girasole');
  imposta('it', 'Oro', 'ms');
  assert.match(S.frase(ch, 'nonSo', dati), /non riesco a verificarlo: il tuo Oro resta dov'è\.$/);
  assert.match(S.frase(ch, 'fatto', dati), /\. Il tuo Oro: 5\.$/);
  imposta('it', 'Gemme');
  assert.match(S.frase(ch, 'fatto', dati), /\. Le tue Gemme: 5\.$/, 'senza una scelta vale la base di moneta.js');
  imposta('es', 'Oro', 'ms');
  assert.equal(S.frase(ch, 'fatto', dati), '🛒 Ana, has comprado Espada. Tu Oro: 5.');
  assert.match(S.frase(ch, 'nonParte', dati), /\. Tu Oro se queda donde está\.$/);
  imposta('en');
  assert.equal(S.frase(ch, 'fatto', dati), '🛒 Ana, you bought Espada. Your coins: 5.');
  for (const lingua of ['it', 'en', 'es']) {
    for (const forma of ['fp', 'mp', 'fs', 'ms']) {
      imposta(lingua, 'Gettoni', forma);
      for (const m of S.MOMENTI) assert.ok(!/%\[|\]%/.test(S.frase(ch, m, dati)), `${lingua}/${forma}/${m}: resta un segno d'accordo`);
    }
  }
  imposta('it', 'Semi di girasole');
  assert.match(S.frase(ch, 'fattoMusica', { ...dati, brano: 'Canzone %[a|b|c|d]%' }), /Spotify: Canzone %\[a\|b\|c\|d\]%\. I tuoi Semi/, 'l\'accordo si scioglie solo nelle frasi scritte qui, non in quello che arriva da fuori');
});

test('le tabelle del negozio escono con l\'esportazione e se ne vanno con l\'account', async () => {
  const { tabelleDiCanale, esporta } = await import('../../src/features/esporta.js');
  const { cancella, restiDi } = await import('../../src/features/cancella.js');
  const ch = canale({ ugo: 500 });
  articolo(ch, { nome: 'Spada', requisiti: [{ tipo: 'ore', soglia: 1 }] });
  articolo(ch, { nome: 'Scudo', prezzo: 1 });
  await compra(ch, 'ugo', 'scudo');
  const nomi = tabelleDiCanale().map((t) => t.tabella);
  for (const t of ['negozio_articoli', 'negozio_requisiti', 'negozio_borsa', 'negozio_acquisti']) assert.ok(nomi.includes(t), t);
  const dati = esporta(ch).dati;
  assert.equal(dati.negozio_articoli.length, 2);
  assert.equal(dati.negozio_requisiti.length, 1);
  assert.equal(dati.negozio_borsa.length, 1);
  assert.equal(dati.negozio_acquisti.length, 1);
  cancella(ch, { conferma: ch });
  assert.deepEqual(restiDi(ch).righe, {});
});

test('lo storico si tiene un anno; quello da consegnare resta finche\' non si decide', () => {
  const ch = canale({ eva: 1000 });
  const a = articolo(ch, { nome: 'Vecchio', prezzo: 1 });
  const m = articolo(ch, { nome: 'Mano', tipo: 'mano', prezzo: 1 });
  const anno = 365 * 86400_000;
  N.prenota(ch, { articolo: a.id, user: 'eva', stato: 'fatto', ora: ORA - anno - 1000 });
  N.prenota(ch, { articolo: m.id, user: 'eva', stato: 'da_consegnare', ora: ORA - anno - 1000 });
  N.prenota(ch, { articolo: a.id, user: 'eva', stato: 'fatto', ora: ORA - anno + 1000 });
  N.pota(ORA);
  const rimasti = db.prepare('SELECT stato FROM negozio_acquisti WHERE channel=? ORDER BY id').all(ch).map((r) => r.stato);
  assert.deepEqual(rimasti, ['da_consegnare', 'fatto']);
});

test('un Modulo comprato: parte col nome di chi ha comprato, e il suo «Costa» non si paga due volte', async () => {
  const { modules: modulesDb } = await import('../../src/db.js');
  const { ModulesEngine } = await import('../../src/features/modules.js');
  const ch = canale({ remo: 500 });
  const id = modulesDb.save(ch, { nome: 'Saluto', attivo: true, trigger: { tipo: 'comando', comando: 'saluto' },
    condizioni: { costo: 40 }, azioni: [{ tipo: 'messaggio', testo: 'Evviva $user: $args' }] });
  const pausa = modulesDb.save(ch, { nome: 'Pausa', attivo: true, trigger: { tipo: 'comando', comando: 'pausa' },
    condizioni: { cooldown: 600 }, azioni: [{ tipo: 'messaggio', testo: 'ok' }] });
  articolo(ch, { nome: 'Saluto', tipo: 'modulo', prezzo: 100, dati: { modulo: id } });
  articolo(ch, { nome: 'Pausa', tipo: 'modulo', prezzo: 10, dati: { modulo: pausa } });
  const motore = new ModulesEngine({});
  const es = T.esecutori({ moduli: motore });
  const detti = [];
  const e = await S.compra({ canale: ch, msg: msg(ch, 'remo'), parola: 'saluto', nota: 'a tutti', esecutori: es, dire: (t) => detti.push(t), ora: ORA });
  assert.equal(e.momento, 'fatto');
  assert.deepEqual(detti, ['Evviva REMO: a tutti']);
  assert.equal(points.get(ch, 'remo'), 400, 'il prezzo del negozio, e basta');
  assert.equal((await S.compra({ canale: ch, msg: msg(ch, 'remo'), parola: 'pausa', esecutori: es, ora: ORA })).momento, 'fatto');
  const ferma = await S.compra({ canale: ch, msg: msg(ch, 'remo'), parola: 'pausa', esecutori: es, ora: ORA + 1 });
  assert.equal(ferma.momento, 'rimborso');
  assert.equal(ferma.dati.codice, 'modulo-cooldown');
  assert.equal(points.get(ch, 'remo'), 390);
  modulesDb.save(ch, { ...modulesDb.get(ch, id), attivo: false });
  assert.equal((await S.compra({ canale: ch, msg: msg(ch, 'remo'), parola: 'saluto', esecutori: es, ora: ORA })).dati.codice, 'modulo', 'un modulo spento non si vende');
});

test('dal pannello: si salva solo quello che sta nel canale, e il rimborso a mano si dice in chat', async () => {
  const { effects, modules: modulesDb, dcRuoli } = await import('../../src/db.js');
  const ch = canale({ ivo: 1000 });
  const altro = canale();
  assert.equal(S.salvaArticolo(ch, { nome: 'Botto', tipo: 'effetto', dati: { effetto: 'airhorn' } }).errore, 'effetto', 'un effetto che nella libreria del canale non c\'e\'');
  effects.add(altro, { comando: 'airhorn', tipo: 'audio', file: 'a.mp3', tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });
  const idMod = modulesDb.save(altro, { nome: 'Suo', attivo: true, trigger: { tipo: 'comando', comando: 'x' }, azioni: [{ tipo: 'messaggio', testo: 'x' }] });
  assert.equal(S.salvaArticolo(ch, { nome: 'Modulo', tipo: 'modulo', dati: { modulo: idMod } }).errore, 'modulo', 'il modulo di un altro canale non si vende qui');
  assert.equal(S.salvaArticolo(ch, { nome: 'Foto', tipo: 'oggetto', immagine: 'effetto:nonce' }).errore, 'immagine');
  assert.equal(S.salvaArticolo(ch, { nome: 'Foto', tipo: 'oggetto', immagine: '../../etc/passwd' }).errore, 'immagine', 'un\'immagine che non e\' un riferimento della libreria non passa');
  dcRuoli.set(ch, { guild: '123456', regole: [{ tipo: 'sub', ruolo: '777777' }] });
  assert.equal(S.salvaArticolo(ch, { nome: 'Ruolo', tipo: 'discord', dati: { ruolo: '777777' } }).errore, 'ruoloRegola', 'un ruolo che una regola governa non si vende');
  assert.equal(S.salvaArticolo(ch, { nome: 'Ruolo', tipo: 'discord', dati: { ruolo: '888888' } }).ok, true);
  const uno = S.salvaArticolo(ch, { nome: 'Spada', tipo: 'oggetto' });
  assert.equal(S.salvaArticolo(ch, { nome: 'Spadone', parola: 'spada', tipo: 'oggetto' }).errore, 'parolaUsata');
  assert.equal(S.salvaArticolo(ch, { ...uno.articolo, prezzo: 7 }).articolo.prezzo, 7, 'con l\'id si cambia, non si duplica');
  assert.equal(S.vistaPannello(ch).articoli.filter((a) => a.parola === 'spada').length, 1);

  const gioco = S.salvaArticolo(ch, { nome: 'Scegli il gioco', parola: 'gioco', tipo: 'mano', prezzo: 300 }).articolo;
  const e = await compra(ch, 'ivo', 'gioco', { nota: 'Hades' });
  assert.equal(S.vistaPannello(ch).coda[0].nota, 'Hades');
  const r = S.rifiuta(ch, e.dati.id);
  assert.equal(r.ok, true);
  assert.match(r.frase, /IVO, il tuo acquisto di Scegli il gioco non è stato accettato: ti ho reso 300 monete\./);
  assert.equal(S.rifiuta(ch, e.dati.id).ok, false, 'una volta sola');
  assert.equal(points.get(ch, 'ivo'), 1000);
  const v = S.vistaPannello(ch);
  assert.equal(v.coda.length, 0);
  assert.equal(v.storico.totali.rimborsati, 1);
  assert.equal(v.articoli.find((a) => a.id === gioco.id).venduti, 0, 'un rimborso non e\' una vendita');
  assert.equal(S.vistaPannello(altro).articoli.length, 0);
  assert.equal(S.apri(ch, false), false);
  assert.equal(S.vistaPannello(ch).attivo, false);
});

test('le tre letture di Twitch dicono «no» e «non lo so» in due modi diversi', async () => {
  const { Helix } = await import('../../src/twitch/helix.js');
  const ch = canale();
  db.prepare('UPDATE streamers SET user_id=? WHERE login=?').run('999', ch);
  const h = new Helix({ auth: { getToken: async () => 'tok' } });
  let risposta = null;
  h._request = async (_m, via, { query }) => {
    if (risposta instanceof Error) throw risposta;
    return typeof risposta === 'function' ? risposta(via, query) : risposta;
  };
  const guasto = Object.assign(new Error('Helix → 401'), { status: 401 });

  risposta = { data: [{ user_id: '7', tier: '2000' }] };
  assert.equal(await h.tierDi(ch, '7'), 2);
  risposta = { data: [] };
  assert.equal(await h.tierDi(ch, '7'), 0, 'nessuna riga: non e\' abbonato');
  risposta = guasto;
  assert.equal(await h.tierDi(ch, '7'), null, 'un permesso che manca non e\' un «non abbonato»');

  risposta = { data: [{ followed_at: '2026-09-01T00:00:00Z' }] };
  assert.equal(await h.seguitoDal(ch, '7'), Date.parse('2026-09-01T00:00:00Z'));
  risposta = { data: [] };
  assert.equal(await h.seguitoDal(ch, '7'), 0);
  risposta = guasto;
  assert.equal(await h.seguitoDal(ch, '7'), null);

  risposta = (via, query) => { assert.equal(via, '/bits/leaderboard'); assert.equal(query.period, 'all'); return { data: [{ user_id: '7', score: 1500 }] }; };
  assert.equal(await h.bitDi(ch, '7'), 1500);
  risposta = { data: [] };
  assert.equal(await h.bitDi(ch, '7'), 0, 'fuori dalla classifica: mai cheerato');
  risposta = { data: [{ user_id: '8', score: 90000 }] };
  assert.equal(await h.bitDi(ch, '7'), null, 'una risposta che parla d\'altri non dice niente di lei');
  risposta = guasto;
  assert.equal(await h.bitDi(ch, '7'), null);
});
