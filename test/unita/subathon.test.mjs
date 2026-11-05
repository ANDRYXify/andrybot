// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA SUBATHON: la diretta dura quanto dice l'orologio (docs/SUBATHON.md).
//
// Ha un orologio suo (overlayStato.subathon), e ogni mossa e' una riga del
// libro. Da questo discendono le prove che contano, e sono tutte cose che da
// fuori non si vedrebbero finche' non fanno danno in diretta:
//
//  · la subathon non tocca MAI il conto alla rovescia dello streamer, e il
//    «Fai partire» del conto non apre una subathon;
//  · lo stesso evento non allunga due volte, la stessa riga non si storna due
//    volte;
//  · un orologio FINITO non riparte da solo, e la fine si festeggia una volta;
//  · il tetto e' su QUANTO MANCA;
//  · la pausa ferma l'orologio con quello che manca, sopravvive (sta nelle
//    impostazioni), e gli eventi in pausa allungano quello che resta;
//  · i comandi che muovono l'orologio sono di chi lo streamer sceglie;
//  · totale, contributori e ultimi sono conti sul libro;
//  · il posto libero in scena e' una regola, non un tentativo.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-subathon-');
const { streamers, subathonLibro } = await import('../../src/db.js');
const sub = await import('../../src/features/subathon.js');
const prima = await import('../../src/features/subathon-prima.js');
const stile = await import('../../src/web/stile.js');
const { AlertsEngine } = await import('../../src/features/alerts.js');
const S = globalThis.SB_SUBATHON;

const CH = 'canale';
streamers.request(CH, 'Canale', '1');
const MIN = 60_000;
// Il conto alla rovescia dello streamer, che la subathon non deve toccare mai.
const CONTO = { fine: 1_234_567_890 };

const REGOLE = { attivo: true, perSub: 5, perBit100: 1, perEuro: 2, perKicks100: 1, perFollow: 1, perRaid10: 2, tettoOre: 12, annuncia: true, raffica: 0, testi: { allunga: '{chi} +{quanto}' } };
let giro = 0;
// Una subathon che corre adesso: sessione nuova col suo orologio, e il conto
// alla rovescia dello streamer da un'altra parte.
const prepara = (regole = REGOLE, fine = Date.now() + 60 * MIN, altro = {}) => {
  const s = streamers.get(CH)?.settings || {};
  const inizio = Date.now() + (++giro);
  streamers.setSettings(CH, { ...s, subathon: regole, overlayTimer: { attivo: true }, ...altro,
    overlayStato: { ...(s.overlayStato || {}), timer: { ...CONTO }, subathon: { inizio, fine, pausa: null, felice: null, finita: 0 } } });
  return inizio;
};
const orologio = () => streamers.get(CH)?.settings?.overlayStato?.subathon || {};
const contoOra = () => streamers.get(CH)?.settings?.overlayStato?.timer;
const fineOra = () => Number(orologio().fine) || 0;
const righe = () => subathonLibro.sessione(CH, Number(orologio().inizio) || 0);
const msg = (text, chi = {}) => ({ channel: CH, text, user: 'mod1', display: 'Mod1', id: 'm' + Math.random(), ...chi });

test.after(() => usaEGetta.pulisci());

test('i minuti diventano millisecondi per unita\', e le frazioni le fa il conto', () => {
  const r = stile.normSubathon(REGOLE);
  assert.equal(S.msPer(r, { fonte: 'sub', quanti: 1 }), 5 * MIN);
  assert.equal(S.msPer(r, { fonte: 'sub', quanti: 1, livello: 2 }), 10 * MIN, 'il livello 2 vale il doppio, di serie');
  assert.equal(S.msPer(r, { fonte: 'sub', quanti: 1, livello: 3 }), 25 * MIN, 'il livello 3 cinque volte');
  assert.equal(S.msPer(r, { fonte: 'bit', quanti: 50 }), 30_000, 'cinquanta bit valgono mezza unita\'');
  assert.equal(S.msPer(r, { fonte: 'euro', quanti: 2.5 }), 5 * MIN);
  assert.equal(S.msPer(r, { fonte: 'kicks', quanti: 200 }), 2 * MIN);
  assert.equal(S.msPer(r, { fonte: 'raid', quanti: 25 }), 5 * MIN, 'dieci spettatori, due minuti');
  assert.equal(sub.chiesti(r, { fonte: 'premio', quanti: 1, premio: 'x' }).ms, 0, 'un premio che non e\' quello scelto non allunga');
  assert.equal(sub.chiesti({ ...r, premio: 'x', perPremio: 3 }, { fonte: 'premio', quanti: 1, premio: 'x' }).ms, 3 * MIN);
});

test('dagli eventi alle fonti: la raffica dei regali non conta, ogni regalo si', () => {
  assert.deepEqual(sub.daEvento({ type: 'channel.subscribe', id: 'e1', data: { tier: '2000' } }, 'luna'), { fonte: 'sub', quanti: 1, livello: 2, id: 'evento:e1', chi: 'luna' });
  assert.equal(sub.daEvento({ type: 'channel.subscription.gift', id: 'e2', data: { total: 20 } }), null);
  assert.equal(sub.daEvento({ type: 'channel.follow.ritorno', data: {} }), null, 'chi torna non e\' un follower nuovo');
  assert.equal(sub.daEvento({ type: 'kicks.gifted', data: { kicks: 100, evento: 'k9' } }).id, 'kicks:k9');
  assert.equal(sub.daEvento({ type: 'channel.channel_points_custom_reward_redemption.add', data: { id: 'r1', reward: { id: 'p' } } }).id, 'riscatto:twitch:r1');
});

test('un sub allunga l\'orologio della subathon, scrive la sua riga, e il conto alla rovescia resta com\'era', () => {
  prepara();
  const p = fineOra();
  const e = sub.suEvento(CH, { fonte: 'sub', quanti: 1, chi: 'luca', id: 'evento:a' });
  assert.equal(e.esito, 'ok');
  assert.equal(fineOra(), p + 5 * MIN);
  assert.deepEqual(contoOra(), CONTO, 'il conto alla rovescia e\' dello streamer');
  assert.deepEqual(righe().map((r) => [r.id, r.fonte, r.chi, r.messi]), [['evento:a', 'sub', 'luca', 5 * MIN]]);
});

test('nessuna mossa della subathon tocca il conto alla rovescia', () => {
  const ora = Date.now();
  prepara(REGOLE, ora + 60 * MIN);
  const al = new AlertsEngine({ say: () => {}, effects: { emit: () => {} } });
  al.subathonEvento(CH, { fonte: 'sub', quanti: 1, chi: 'x', id: 'evento:n1' });
  for (const a of [{ azione: 'piu', ms: 10 * MIN }, { azione: 'meno', ms: 2 * MIN }, { azione: 'unita', fonte: 'bit', quanti: 300 }, { azione: 'imposta', ms: 90 * MIN },
    { azione: 'pausa' }, { azione: 'riprendi' }, { azione: 'felice', ms: 10 * MIN, per: 2 }, { azione: 'felice-stop' }, { azione: 'annulla' }]) {
    al.subathonAzione(CH, a, { mano: 'Mod1' });
    assert.deepEqual(contoOra(), CONTO, `«${a.azione}» non lo tocca`);
  }
  al.subathonAvvia(CH, 120);
  assert.deepEqual(contoOra(), CONTO, '«Fai partire» della subathon non lo tocca');
  al.subathonFerma(CH);
  assert.deepEqual(contoOra(), CONTO, '«Ferma» della subathon non lo tocca');
  prepara(REGOLE, ora - 1000);
  al._sbFine(CH);
  assert.deepEqual(contoOra(), CONTO, 'la fine non lo tocca');
});

test('il «Fai partire» del conto alla rovescia non apre una subathon, e non la muove', () => {
  prepara();
  const prima0 = JSON.parse(JSON.stringify(orologio()));
  const al = new AlertsEngine({ effects: { emit: () => {} } });
  al.impostaTimer(CH, 10);
  assert.deepEqual(orologio(), prima0, 'la sessione e l\'orologio della subathon restano com\'erano');
  al.impostaTimer(CH, 0);
  assert.deepEqual(orologio(), prima0);
});

test('far partire la subathon: sessione nuova, orologio suo, una volta per tasto', () => {
  const ora = Date.now();
  prepara();
  const e = sub.avvia(CH, 3 * 60 * MIN, { id: 'tasto:p1', ora });
  assert.equal(e.esito, 'ok');
  assert.equal(orologio().inizio, ora);
  assert.equal(fineOra(), ora + 3 * 60 * MIN);
  assert.equal(righe().length, 0, 'totale, ultimi e traguardi ripartono da zero');
  assert.deepEqual(contoOra(), CONTO);
  assert.equal(sub.avvia(CH, 60 * MIN, { id: 'tasto:p1', ora: ora + 5 }).esito, 'doppio', 'lo stesso tasto non apre una seconda sessione');
  assert.equal(fineOra(), ora + 3 * 60 * MIN);
  prepara({ ...REGOLE, attivo: false });
  assert.equal(sub.avvia(CH, 60 * MIN).esito, 'spenta', 'con le regole spente non parte');
});

test('accesa vuol dire regole accese e orologio in corsa o in pausa, senza il conto alla rovescia', () => {
  prepara(REGOLE, Date.now() + 60 * MIN, { overlayTimer: { attivo: false } });
  assert.equal(sub.accesa(streamers.get(CH).settings), true, 'il conto alla rovescia spento non conta');
  sub.azione(CH, { azione: 'pausa' });
  assert.equal(sub.accesa(streamers.get(CH).settings), true, 'in pausa e\' accesa');
  prepara(REGOLE, Date.now() - 1);
  assert.equal(sub.accesa(streamers.get(CH).settings), false, 'a zero non lo e\' piu\'');
  prepara(REGOLE, 0);
  assert.equal(sub.accesa(streamers.get(CH).settings), false, 'mai partita');
  prepara({ ...REGOLE, attivo: false });
  assert.equal(sub.accesa(streamers.get(CH).settings), false, 'regole spente');
});

test('lo stesso evento non allunga due volte', () => {
  prepara();
  const p = fineOra();
  assert.equal(sub.suEvento(CH, { fonte: 'sub', quanti: 1, id: 'evento:doppio' }).esito, 'ok');
  assert.equal(sub.suEvento(CH, { fonte: 'sub', quanti: 1, id: 'evento:doppio' }).esito, 'doppio');
  assert.equal(fineOra(), p + 5 * MIN, 'il secondo arrivo non tocca l\'orologio');
  assert.equal(righe().length, 1);
});

test('un orologio finito non riparte, e non scrive righe', () => {
  prepara(REGOLE, Date.now() - 1000);
  const p = fineOra();
  assert.equal(sub.suEvento(CH, { fonte: 'sub', quanti: 1, id: 'evento:tardi' }), null, 'la subathon finita non e\' accesa');
  assert.equal(sub.azione(CH, { azione: 'piu', ms: 5 * MIN }).esito, 'ferma');
  assert.equal(fineOra(), p, 'la diretta e\' finita: un sub non la resuscita');
  assert.equal(sub.azione(CH, { azione: 'pausa' }).esito, 'ferma', 'e non si mette in pausa un orologio finito');
  assert.equal(sub.azione(CH, { azione: 'felice', ms: 10 * MIN, per: 2 }).esito, 'ferma');
  assert.equal(righe().length, 0, 'il libro e\' della subathon che corre');
});

test('con la subathon spenta non si tocca niente', () => {
  prepara({ ...REGOLE, attivo: false });
  const p = fineOra();
  assert.equal(sub.suEvento(CH, { fonte: 'sub', quanti: 1 }), null);
  assert.equal(fineOra(), p);
});

test('il tetto e\' su quanto manca, e al tetto la riga dice che e\' arrivato tutto tagliato', () => {
  const ora = Date.now();
  prepara({ ...REGOLE, perSub: 120, tettoOre: 2 }, ora + 90 * MIN);
  const e = sub.suEvento(CH, { fonte: 'sub', quanti: 1, id: 'evento:t1' }, { ora });
  assert.equal(e.riga.messi, 30 * MIN, 'arriva al tetto e si ferma li\'');
  assert.equal(e.riga.tagliati, 90 * MIN);
  assert.equal(fineOra(), ora + 2 * 60 * MIN, 'non manca mai piu\' del tetto');
  const due = sub.suEvento(CH, { fonte: 'sub', quanti: 1, id: 'evento:t2' }, { ora: ora + 500 });
  assert.equal(due.riga.messi, 0, 'al tetto un altro sub non aggiunge niente');
  assert.equal(fineOra(), ora + 2 * 60 * MIN, 'e sotto il secondo l\'orologio non si muove');
});

test('a tetto zero non c\'e\' tetto', () => {
  prepara({ ...REGOLE, perSub: 120, tettoOre: 0 }, Date.now() + 13 * 60 * MIN);
  assert.equal(sub.suEvento(CH, { fonte: 'sub', quanti: 1 }).riga.messi, 120 * MIN, 'con tredici ore che mancano, due ore in piu\' entrano tutte');
});

test('applica: in giu\' mai sotto adesso, e un orologio finito non si muove', () => {
  const ora = 1_000_000;
  const giu = S.applica({ fine: ora + 3 * MIN }, -10 * MIN, { ora });
  assert.equal(giu.orologio.fine, ora, 'a zero e\' finita, non prima di adesso');
  assert.equal(giu.messi, -3 * MIN);
  assert.equal(S.applica({ fine: ora - 1 }, 5 * MIN, { ora }), null);
  assert.equal(S.applica({}, 5 * MIN, { ora }), null, 'mai partito');
  const pausa = S.applica({ fine: 0, pausa: { resta: 10 * MIN } }, 5 * MIN, { ora, tetto: 12 * MIN });
  assert.deepEqual(pausa.orologio, { fine: 0, pausa: { resta: 12 * MIN } }, 'in pausa si sposta quello che resta, col tetto');
});

test('la pausa ferma l\'orologio, gli eventi in pausa allungano quello che resta, la ripresa riparte da li\'', () => {
  const ora = Date.now();
  prepara(REGOLE, ora + 30 * MIN);
  assert.equal(sub.azione(CH, { azione: 'pausa' }, { ora }).esito, 'ok');
  assert.equal(fineOra(), 0);
  assert.deepEqual(orologio().pausa, { resta: 30 * MIN });
  assert.equal(sub.azione(CH, { azione: 'pausa' }, { ora }).esito, 'no', 'una pausa in pausa non fa niente');
  assert.equal(sub.suEvento(CH, { fonte: 'sub', quanti: 1, id: 'evento:inpausa' }, { ora: ora + 10 * MIN }).esito, 'ok');
  assert.deepEqual(orologio().pausa, { resta: 35 * MIN }, 'il tempo dell\'evento va in quello che resta');
  assert.equal(streamers.get(CH).settings.overlayStato.subathon.pausa.resta, 35 * MIN, 'la pausa sta nelle impostazioni: sopravvive a un riavvio');
  assert.equal(sub.azione(CH, { azione: 'riprendi' }, { ora: ora + 20 * MIN }).esito, 'ok');
  assert.equal(fineOra(), ora + 20 * MIN + 35 * MIN);
  assert.equal(orologio().pausa, null);
  assert.deepEqual(contoOra(), CONTO);
});

test('annulla storna l\'ultima riga a mano, una volta sola, e niente si cancella', () => {
  const ora = Date.now();
  prepara(REGOLE, ora + 60 * MIN);
  sub.azione(CH, { azione: 'piu', ms: 10 * MIN }, { mano: 'Mod1', id: 'cmd:a', ora });
  sub.suEvento(CH, { fonte: 'sub', quanti: 1, chi: 'luna', id: 'evento:dopo' }, { ora });
  const dopoPiu = fineOra();
  const a = sub.azione(CH, { azione: 'annulla' }, { mano: 'Mod1', id: 'cmd:b', ora });
  assert.equal(a.esito, 'ok');
  assert.equal(a.stornata.id, 'mano:cmd:a', 'l\'ultima a mano, non l\'evento arrivato dopo');
  assert.equal(fineOra(), dopoPiu - 10 * MIN);
  assert.equal(sub.azione(CH, { azione: 'annulla' }, { mano: 'Mod1', id: 'cmd:b', ora }).esito, 'doppio', 'lo stesso annulla ripetuto non storna la riga dopo');
  assert.equal(sub.azione(CH, { azione: 'annulla' }, { mano: 'Mod1', id: 'cmd:c', ora }).esito, 'nessuna', 'non c\'e\' altro da annullare a mano');
  assert.equal(sub.storna(CH, 'mano:cmd:a', { id: 'tasto:x', ora }).esito, 'doppio', 'la stessa riga non si storna due volte, chiunque lo chieda');
  assert.equal(righe().length, 3, 'le righe restano tutte: la piu\', il sub, lo storno');
});

test('totale, contributori e ultimi sono conti sul libro; lo storno di un evento torna indietro anche per chi l\'aveva fatto', () => {
  const ora = Date.now();
  prepara(REGOLE, ora + 60 * MIN);
  sub.suEvento(CH, { fonte: 'sub', quanti: 1, chi: 'luna', id: 'evento:l1' }, { ora });
  sub.suEvento(CH, { fonte: 'sub', quanti: 1, chi: 'luna', id: 'evento:l2' }, { ora: ora + 1 });
  sub.suEvento(CH, { fonte: 'bit', quanti: 500, chi: 'marco', id: 'evento:m1' }, { ora: ora + 2 });
  sub.azione(CH, { azione: 'piu', ms: 3 * MIN }, { mano: 'Mod1', id: 'cmd:z', ora: ora + 3 });
  let v = sub.vista(CH, { ora: ora + 4 });
  assert.equal(v.totale, 18 * MIN, 'due sub, cinquecento bit e tre minuti a mano');
  assert.equal(v.fine, fineOra(), 'la vista porta l\'orologio della subathon');
  assert.deepEqual(v.migliori.map((x) => [x.chi, x.messi]), [['luna', 10 * MIN], ['marco', 5 * MIN]], 'le righe a mano non hanno un contributore');
  assert.deepEqual(v.ultimi.map((x) => x.chi), ['marco', 'luna', 'luna']);
  sub.azione(CH, { azione: 'annulla', riga: 'evento:l2' }, { id: 'tasto:t', ora: ora + 5 });
  v = sub.vista(CH, { ora: ora + 6 });
  assert.equal(v.totale, 13 * MIN);
  assert.deepEqual(v.migliori.map((x) => [x.chi, x.messi]), [['luna', 5 * MIN], ['marco', 5 * MIN]]);
  assert.ok(!v.ultimi.some((x) => x.id === 'evento:l2'), 'una riga stornata non e\' fra gli ultimi');
});

test('la fine si vede una volta per istante, e non riparte', () => {
  const ora = Date.now();
  prepara(REGOLE, ora - 1000);
  const f = sub.fineArrivata(CH, { ora });
  assert.equal(f.festeggia, true);
  assert.equal(sub.fineArrivata(CH, { ora: ora + 5 }), null, 'la seconda volta niente');
  prepara(REGOLE, ora - 11 * MIN);
  assert.equal(sub.fineArrivata(CH, { ora }).festeggia, false, 'una fine di piu\' di dieci minuti fa si segna e basta');
  prepara(REGOLE, ora + 60 * MIN);
  assert.equal(sub.fineArrivata(CH, { ora }), null, 'non finita');
  sub.azione(CH, { azione: 'pausa' }, { ora });
  assert.equal(sub.fineArrivata(CH, { ora: ora + 2 * 60 * MIN }), null, 'in pausa non finisce');
  prepara(REGOLE, ora + 60 * MIN);
  sub.ferma(CH);
  assert.equal(sub.fineArrivata(CH, { ora }), null, '«Ferma» non e\' la fine: non si festeggia');
});

test('i comandi che muovono l\'orologio sono di chi lo streamer sceglie; «!subathon» e\' di tutti', () => {
  prepara();
  const p = fineOra();
  const curioso = sub.comando(msg('!subathon +10m', { isMod: false, isBroadcaster: false }));
  assert.match(curioso.detto, /^Mancano /, 'chi non puo\' riceve quello che riceve chiunque');
  assert.equal(fineOra(), p);
  const mod = sub.comando(msg('!subathon +10m perso un sub', { isMod: true }));
  assert.equal(mod.esito.esito, 'ok');
  assert.equal(fineOra(), p + 10 * MIN);
  assert.equal(mod.esito.riga.perche, 'perso un sub');
  assert.equal(mod.esito.riga.mano, 'Mod1', 'il libro dice chi l\'ha scritta');
  assert.match(mod.detto, /^Aggiunti 10 minuti/);
  prepara({ ...REGOLE, comandi: 'streamer' });
  const p2 = fineOra();
  sub.comando(msg('!subathon +10m', { isMod: true }));
  assert.equal(fineOra(), p2, 'solo lo streamer, se lo streamer ha scelto cosi\'');
  sub.comando(msg('!subathon +10m', { isBroadcaster: true }));
  assert.equal(fineOra(), p2 + 10 * MIN);
  prepara({ ...REGOLE, attivo: false });
  assert.equal(sub.comando(msg('!subathon')), null, 'spenta, il bot non dice nemmeno che e\' spenta');
  assert.match(sub.comando(msg('!subathon +5m', { isMod: true })).detto, /spenta/, 'a chi puo\' muoverla si');
});

test('«!subathon parti 4h»: chi puo\' la fa partire, chi non puo\' no', () => {
  prepara(REGOLE, 0);
  assert.equal(sub.comando(msg('!subathon parti 4h', { isMod: false })), null, 'chi non puo\', a subathon ferma, non riceve niente');
  assert.equal(fineOra(), 0);
  const r = sub.comando(msg('!subathon parti 4h', { isMod: true }));
  assert.equal(r.esito.esito, 'ok');
  assert.ok(Math.abs(fineOra() - (Date.now() + 4 * 60 * MIN)) < 2000);
  assert.match(r.detto, /^Subathon partita!/);
  assert.deepEqual(contoOra(), CONTO);
  prepara(REGOLE, 0);
  assert.match(sub.comando(msg('!subathon +10m', { isMod: true })).detto, /non è ancora partita/, 'muoverla prima che parta dice come si fa partire');
});

test('lo stesso messaggio in chat non allunga due volte, e non fa ripartire due volte', () => {
  prepara();
  const p = fineOra();
  const m = msg('!subathon sub 2', { isMod: true, id: 'stesso' });
  sub.comando(m);
  const d = sub.comando(m);
  assert.equal(d.detto, '', 'la seconda volta tace');
  assert.equal(fineOra(), p + 10 * MIN);
  const parti = msg('!subathon parti 2h', { isMod: true, id: 'parti-una' });
  sub.comando(parti);
  const inizio = orologio().inizio;
  assert.equal(sub.comando(parti).detto, '');
  assert.equal(orologio().inizio, inizio);
});

test('leggere i comandi', () => {
  assert.deepEqual(sub.leggiComando('!subathon'), { azione: 'resta' });
  assert.equal(sub.leggiComando('!subathonx'), null);
  assert.deepEqual(sub.leggiComando('!subathon +1h30m regalo perso'), { azione: 'piu', ms: 90 * MIN, perche: 'regalo perso' });
  assert.equal(sub.leggiComando('!subathon -5').ms, 5 * MIN);
  assert.deepEqual(sub.leggiComando('!subathon sub 3 2'), { azione: 'unita', fonte: 'sub', quanti: 3, livello: 2 });
  assert.deepEqual(sub.leggiComando('!subathon euro 2,5'), { azione: 'unita', fonte: 'euro', quanti: 2.5, livello: 0 });
  assert.equal(sub.leggiComando('!subathon resta 1:30').ms, 90 * MIN);
  assert.deepEqual(sub.leggiComando('!subathon parti 4h'), { azione: 'parti', ms: 4 * 60 * MIN });
  assert.deepEqual(sub.leggiComando('!subathon felice 30m x3'), { azione: 'felice', ms: 30 * MIN, per: 3 });
  assert.equal(sub.leggiComando('!subathon felice 30m x9').azione, 'uso');
  assert.equal(sub.leggiComando('!subathon boh').azione, 'uso');
});

test('l\'ora felice moltiplica le fonti, non il tempo scritto a mano', () => {
  const ora = Date.now();
  prepara(REGOLE, ora + 60 * MIN);
  sub.azione(CH, { azione: 'felice', ms: 30 * MIN, per: 2 }, { ora });
  const a = sub.suEvento(CH, { fonte: 'sub', quanti: 1, id: 'evento:f1' }, { ora: ora + 1 });
  assert.equal(a.riga.messi, 10 * MIN);
  assert.equal(a.riga.per, 2);
  const b = sub.azione(CH, { azione: 'piu', ms: 10 * MIN }, { ora: ora + 2 });
  assert.equal(b.riga.messi, 10 * MIN, '«+10m» e\' gia\' il numero voluto');
  const c = sub.suEvento(CH, { fonte: 'sub', quanti: 1, id: 'evento:f2' }, { ora: ora + 31 * MIN });
  assert.equal(c.riga.messi, 5 * MIN, 'finita l\'ora felice, si torna a uno');
});

test('resta: si dice quanto deve mancare', () => {
  const ora = Date.now();
  prepara(REGOLE, ora + 60 * MIN);
  const e = sub.azione(CH, { azione: 'imposta', ms: 3 * 60 * MIN }, { ora });
  assert.equal(fineOra(), ora + 3 * 60 * MIN);
  assert.equal(e.riga.messi, 2 * 60 * MIN);
});

test('i testi parlano la lingua della chat, e quelli dello streamer vincono', () => {
  prepara({ ...REGOLE, testi: {} }, Date.now() + 90 * MIN, { preferenze: { lingua: 'en' } });
  assert.match(sub.quantoManca(CH), /^1 hour and (29|30) minutes left before the subathon ends\.$/);
  prepara({ ...REGOLE, testi: { resta: 'Ancora {resta}!' } }, Date.now() + 90 * MIN, { preferenze: { lingua: 'es' } });
  assert.match(sub.quantoManca(CH), /^Ancora 1 hora y (29|30) minutos!$/);
  prepara(REGOLE, Date.now() + 60 * MIN, { preferenze: { lingua: 'it' } });
});

test('le regole hanno valori di fabbrica sensati, la subathon nasce spenta, e il conto alla rovescia non le porta piu\'', () => {
  const r = stile.normSubathon({});
  assert.equal(r.attivo, false);
  assert.equal(r.perSub, 5);
  assert.equal(r.tettoOre, 12);
  assert.equal(r.comandi, 'mod');
  assert.equal(r.fineChat, false, 'alla fine, di serie, niente');
  assert.ok(Object.values(r.alert).every((a) => a.attivo === false), 'gli alert nascono spenti');
  assert.equal(stile.normSubathon({ tettoOre: 500 }).tettoOre, 72, 'il tetto ha un tetto');
  assert.ok(!('subathon' in stile.normTimer({ subathon: { attivo: true } })));
  assert.equal(stile.normOverlaySubathon({}).posizione, 'auto', 'di serie il posto lo sceglie la regola');
  assert.equal(stile.normOverlaySubathonRegole({}).posizione, 'auto');
});

test('le regole scritte dentro il conto alla rovescia si leggono, e salvando il conto si fermano nella chiave nuova', () => {
  const vecchie = { overlayTimer: { attivo: true, subathon: { attivo: true, perSub: 7, testoChat: 'Evviva {chi}' } } };
  assert.equal(stile.regoleSubathon(vecchie).perSub, 7);
  assert.equal(stile.regoleSubathon(vecchie).testi.allunga, 'Evviva {chi}', 'il testo di prima diventa quello dell\'allungamento');
  assert.equal(stile.normSubathon({ testoChat: 'Grazie {chi}! Il conto sale di {quanto}.' }).testi.allunga, '', 'quello di serie di allora lo dice gia\' la lingua della chat');
  const salvate = stile.subathonDaSalvare(vecchie, { overlayTimer: { attivo: true } });
  assert.equal(salvate.perSub, 7, 'salvare il conto prima della scheda Subathon non le perde');
  assert.equal(stile.subathonDaSalvare({ ...vecchie, subathon: { perSub: 3 } }, { overlayTimer: {} }), undefined, 'con la chiave nuova gia\' scritta, il conto non la tocca');
  assert.equal(stile.subathonDaSalvare({}, { subathon: { perSub: 9 } }).perSub, 9);
});

test('la subathon di prima passa sull\'orologio suo, una volta, e il conto resta com\'e\'', () => {
  const ora = 10_000_000;
  const vecchie = {
    overlayStato: { timer: { fine: ora + 30 * MIN }, subathon: { inizio: ora - 60 * MIN, felice: null, finita: 0 } },
    overlays: [{ id: 'a', mostra: { chat: true, subathon: false, subregole: false }, occasioni: [{ id: 'o', mostra: { subathon: false } }] }],
  };
  const n = prima.migra(vecchie, ora);
  assert.equal(n.overlayStato.subathon.fine, ora + 30 * MIN, 'la fine del conto diventa quella della subathon');
  assert.deepEqual(n.overlayStato.timer, vecchie.overlayStato.timer, 'il conto resta com\'e\'');
  assert.deepEqual(n.overlays[0].mostra, { chat: true }, 'gli spenti scritti dalla regola di ottobre si tolgono dalle basi');
  assert.deepEqual(n.overlays[0].occasioni, vecchie.overlays[0].occasioni, 'non dalle occasioni');
  assert.equal(prima.migra(n, ora), null, 'una volta sola');
  const inPausa = prima.migra({ overlayStato: { timer: { fine: 0, pausa: { resta: 20 * MIN } }, subathon: { inizio: 5 } } }, ora);
  assert.deepEqual(inPausa.overlayStato.subathon.pausa, { resta: 20 * MIN });
  const finito = prima.migra({ overlayStato: { timer: { fine: ora - 1 }, subathon: { inizio: 5 } } }, ora);
  assert.ok(!('fine' in finito.overlayStato.subathon), 'un conto finito non diventa una subathon in corsa');
  const nuova = prima.migra({ overlayStato: { timer: { fine: ora + MIN }, subathon: { inizio: 5, fine: ora + 9 * MIN } } }, ora);
  assert.equal(nuova.overlayStato.subathon.fine, ora + 9 * MIN, 'chi ha gia\' l\'orologio nuovo lo tiene');
});

test('il posto libero e\' una regola: il primo dell\'ordine scritto che nessuno occupa, se no il primo', () => {
  assert.equal(S.posto([]), 'alto-sinistra');
  assert.equal(S.posto([{ posizione: 'alto-sinistra' }, { posizione: 'alto-destra' }]), 'basso-sinistra');
  assert.equal(S.posto([{ posizione: 'alto-sinistra' }, { xy: { x: 85, y: 10 } }]), 'basso-sinistra', 'un elemento spostato occupa la zona del suo punto');
  assert.equal(S.posto([{ xy: { x: 70, y: 70, w: 25, h: 20 } }, { posizione: 'alto-sinistra' }, { posizione: 'alto-destra' }, { posizione: 'basso-sinistra' }]), 'alto-centro', 'un riquadro, dal suo centro');
  assert.equal(S.posto(S.POSTI.map((posizione) => ({ posizione }))), 'alto-sinistra', 'tutto occupato: il primo');
  const due = S.postiAuto([{ posizione: 'alto-sinistra' }], { posizione: 'auto' }, { posizione: 'auto' });
  assert.deepEqual(due, { subathon: 'alto-destra', subregole: 'basso-sinistra' }, 'le regole scelgono dopo la subathon, senza starle sopra');
  assert.deepEqual(S.postiAuto([], { posizione: 'auto', xy: { x: 10, y: 80 } }, { posizione: 'auto' }), { subregole: 'alto-sinistra' }, 'spostata a mano resta dove l\'hai messa, e occupa il suo posto');
  assert.deepEqual(S.postiAuto([], { posizione: 'alto-destra' }, null), {}, 'un angolo scelto non si sposta');
});

test('in diretta: la vista con l\'orologio, il «+», la raffica in una riga, la pausa che arriva all\'overlay', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    prepara({ ...REGOLE, raffica: 4 });
    const detti = [], spinte = [];
    const al = new AlertsEngine({ say: (ch, t) => detti.push(t), effects: { emit: (ch, p) => spinte.push(p) } });
    for (const [i, chi] of ['luna', 'marco', 'giada'].entries()) al.subathonEvento(CH, { fonte: 'sub', quanti: 1, chi, id: 'evento:r' + i });
    assert.equal(spinte.filter((p) => p.tipo === 'timer').length, 0, 'il conto alla rovescia non si muove');
    const viste = spinte.filter((p) => p.tipo === 'subathon');
    assert.deepEqual(viste.map((p) => p.sale), [5 * MIN, 5 * MIN, 5 * MIN]);
    assert.equal(viste.at(-1).vista.fine, fineOra(), 'all\'overlay arriva l\'istante vero, non un\'aggiunta da sommare');
    assert.deepEqual(detti, [], 'la raffica aspetta');
    mock.timers.tick(4000);
    assert.deepEqual(detti, ['luna, marco e altri 1 +15 minuti'], 'tre sub, una riga');
    al.subathonAzione(CH, { azione: 'pausa' });
    assert.deepEqual(spinte.filter((p) => p.tipo === 'subathon').at(-1).vista.pausa, orologio().pausa, 'l\'overlay sa della pausa');
  } finally { mock.timers.reset(); }
});

test('i traguardi sono sul totale aggiunto: passati una volta, detti una volta', () => {
  prepara({ ...REGOLE, traguardi: [{ minuti: 8, testo: 'Cosplay' }, { minuti: 60, testo: 'Karaoke' }] });
  const detti = [];
  const al = new AlertsEngine({ say: (ch, t) => detti.push(t), effects: { emit: () => {} } });
  al.subathonEvento(CH, { fonte: 'sub', quanti: 1, chi: 'a', id: 'evento:g1' });
  al.subathonEvento(CH, { fonte: 'sub', quanti: 1, chi: 'b', id: 'evento:g2' });
  al.subathonEvento(CH, { fonte: 'sub', quanti: 1, chi: 'c', id: 'evento:g3' });
  assert.equal(detti.filter((t) => /Cosplay/.test(t)).length, 1);
  assert.ok(!detti.some((t) => /Karaoke/.test(t)));
});

test('la fine, vista dal motore: la riga in chat se lo streamer la vuole, una volta', () => {
  prepara({ ...REGOLE, fineChat: true }, Date.now() - 500);
  const detti = [];
  const al = new AlertsEngine({ say: (ch, t) => detti.push(t), effects: { emit: () => {} } });
  al._sbFine(CH);
  al._sbFine(CH);
  assert.equal(detti.filter((t) => /finita/.test(t)).length, 1);
});

test('all\'avvio una fine passata mentre il bot era spento si festeggia, una volta; il conto alla rovescia no', () => {
  prepara({ ...REGOLE, fineChat: true }, Date.now() - 2 * MIN);
  const detti = [];
  const al = new AlertsEngine({ say: (ch, t) => detti.push(t), effects: { emit: () => {} } });
  al.riarmaSubathon();
  al.riarmaSubathon();
  assert.equal(detti.filter((t) => /finita/.test(t)).length, 1);
  assert.deepEqual(contoOra(), CONTO);
});

test('gli elementi che occupano un posto: accesi in quell\'overlay, col loro angolo o il loro punto', () => {
  const s = { alerts: { attivo: true, posizione: 'alto-centro' }, overlayTimer: { attivo: true, posizione: 'alto-destra' }, overlayBit: { attivo: true }, overlayGoals: [{ id: 'g1', attivo: true, posizione: 'basso-sinistra' }] };
  const occ = stile.occupatiInScena(s, { mostra: {}, xy: {} });
  const zone = new Set(occ.map((o) => S.zona(o)));
  for (const z of ['alto-centro', 'alto-destra', 'alto-sinistra', 'basso-sinistra']) assert.ok(zone.has(z), z + ': la classifica dei Bit col suo angolo di serie, l\'obiettivo col suo');
  assert.ok(!zone.has('basso-destra'));
  assert.equal(stile.postiSubathon(s, { mostra: {}, xy: {} }, [], { posizione: 'auto' }, null).subathon, 'basso-destra');
  assert.equal(stile.postiSubathon(s, { mostra: { bit: false }, xy: {} }, [], { posizione: 'auto' }, null).subathon, 'alto-sinistra', 'un elemento nascosto in quell\'overlay non occupa');
  assert.equal(stile.postiSubathon(s, { mostra: {}, xy: { bit: { x: 80, y: 80 } } }, [], { posizione: 'auto' }, null).subathon, 'alto-sinistra', 'uno spostato occupa dove l\'hai messo');
  assert.equal(stile.postiSubathon({ ...s, overlayTimer: { attivo: false } }, { mostra: {}, xy: {} }, [], { posizione: 'auto' }, null).subathon, 'alto-destra', 'uno spento non occupa: si libera il suo angolo');
  assert.equal(stile.postiSubathon({}, { mostra: {}, xy: {} }, [{ comando: 'morti', mostra: true, x: 5, y: 10 }], { posizione: 'auto' }, null).subathon, 'alto-destra', 'un contatore occupa il suo punto');
});
