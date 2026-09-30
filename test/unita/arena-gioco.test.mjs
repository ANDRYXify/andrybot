// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// L'ARENA DELLE EMOTE, LA PARTE DEL BOT (src/features/arena.js, docs/ARENA.md).
//
// Il motore e' provato a parte (arena.test.mjs). Qui si prova che il gioco in
// chat gli resta fedele: che il vincitore detto in chat e' quello che il motore
// calcola con lo stesso seme, e lo si dice all'istante in cui l'overlay ci
// arriva; che chi si collega a meta' rifa' la stessa partita; che nessuno
// perde l'ingresso di un'arena che non si gioca; che entra chi deve, una volta.
//
// L'orologio e' finto (e le sveglie con lui), il seme e il caso sono iniettati:
// ogni numero e' quello atteso, non uno plausibile.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('arena-gioco-');
const { streamers, points, statoVivo, arenaEmote } = await import('../../src/db.js');
const AR = await import('../../src/features/arena.js');
const G = await import('../../src/features/giochi-conf.js');
const A = globalThis.SB_ARENA;
test.after(() => casa.pulisci());

// Un orologio con le sue sveglie: `avanza` fa suonare in ordine quelle che
// cadono nel tratto, ognuna al suo istante.
function orologioFinto(t0) {
  let ora = t0;
  let n = 0;
  const sveglie = new Map();
  return {
    ora: () => ora,
    dopo: (fn, ms) => { const k = ++n; sveglie.set(k, { quando: ora + ms, fn }); return k; },
    annulla: (k) => { sveglie.delete(k); },
    avanza(ms) {
      const fine = ora + ms;
      for (;;) {
        let prima = null;
        for (const [k, s] of sveglie) if (s.quando <= fine && (!prima || s.quando < prima[1].quando)) prima = [k, s];
        if (!prima) break;
        sveglie.delete(prima[0]);
        ora = prima[1].quando;
        prima[1].fn();
      }
      ora = fine;
    },
  };
}

const T0 = Date.parse('2026-09-30T21:00:00Z');
const TWITCH = (id) => `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
const SETTE = (id) => `https://cdn.7tv.app/emote/${id}/2x.webp`;
const ID7 = (k) => String(k).padEnd(24, 'a');

function canale(ch, arena = {}) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { giochiConf: { arena: { attesaTutti: 0, ...arena } } });
}
function scena(ch, { mappe = {}, seme = 'seme-fisso', caso = null } = {}) {
  const orologio = orologioFinto(T0);
  const detti = [];
  const eventi = [];
  AR.impostaOrologio(orologio);
  AR.impostaSpinta((c, p) => eventi.push({ c, ...p }));
  AR.impostaSeme(() => seme);
  AR.impostaCaso(caso);
  AR.impostaEmote({ tutte: async () => mappe.tutte || {}, proprie: async () => mappe.proprie || {} });
  const say = (t) => detti.push(t);
  const scrivi = (user, text = 'ciao', extra = {}) => AR.suMessaggio(ch, { channel: ch, user, display: user, text, ...extra }, say);
  return { orologio, detti, eventi, say, scrivi };
}
const aspettaPromesse = () => new Promise((r) => setImmediate(r));

test('il vincitore detto in chat e\' quello del motore con lo stesso seme, detto quando l\'overlay ci arriva', () => {
  canale('ar1', { iscrizioni: 30, premioVincitore: 0, premioEliminazione: 0, premioCorona: 0 });
  const s = scena('ar1', { seme: 'finale-1' });
  assert.equal(AR.apri('ar1', s.say), true);
  assert.equal(AR.apri('ar1', s.say), false, 'un\'arena alla volta');
  for (const u of ['anna', 'bruno', 'carla', 'dario', 'elena', 'fabio']) s.scrivi(u);
  s.orologio.avanza(30_000);
  const b = s.eventi.find((e) => e.azione === 'battaglia');
  assert.ok(b, 'alla chiusura parte la battaglia');
  assert.equal(b.seme, 'finale-1');
  assert.equal(b.t0, T0 + 30_000);
  assert.deepEqual(b.combattenti.map((c) => c.id), ['anna', 'bruno', 'carla', 'dario', 'elena', 'fabio'], 'nell\'ordine in cui sono entrati');

  // Lo stesso calcolo che fa ogni overlay, coi dati dell'evento e basta.
  const vero = A.esito(A.corri(A.nuova(b.seme, b.combattenti.map((c) => ({ id: c.id })), b.regole), Infinity));
  const quando = Math.ceil(vero.passo * 1000 / A.PASSO);
  const n = s.detti.length;
  s.orologio.avanza(quando - 1);
  assert.equal(s.detti.length, n, 'un millesimo prima dell\'ultimo passo, la chat non sa ancora niente');
  assert.equal(s.eventi.some((e) => e.azione === 'vittoria'), false);
  s.orologio.avanza(1);
  const v = s.eventi.find((e) => e.azione === 'vittoria');
  assert.ok(v, 'all\'ultimo passo, la vittoria');
  assert.equal(v.esito.vincitore, vero.vincitore);
  assert.deepEqual(v.esito.classifica, vero.classifica);
  assert.match(s.detti.at(-1), new RegExp(`^🏆 (Tempo scaduto: vince )?${vero.vincitore}\\b`));
  assert.equal(AR.arenaInCorso('ar1'), 'vittoria');
  s.orologio.avanza(10_000);
  assert.equal(s.eventi.at(-1).azione, 'fine');
  assert.equal(AR.arenaInCorso('ar1'), null, 'dopo la vittoria il posto e\' libero');
});

test('chi si collega a meta\' rifa\' la stessa partita, fino ad adesso e poi fino in fondo', () => {
  canale('ar2', { iscrizioni: 20 });
  const s = scena('ar2', { seme: 'a-meta' });
  AR.apri('ar2', s.say);
  for (let i = 0; i < 9; i++) s.scrivi('p' + i);
  s.orologio.avanza(20_000);
  // L'overlay che c'era dall'inizio ha i dati dell'evento; quello che si apre
  // 7,345 secondi dopo ha solo lo stato. Tutti e due come arrivano: in JSON.
  const b = JSON.parse(JSON.stringify(s.eventi.find((e) => e.azione === 'battaglia')));
  s.orologio.avanza(7_345);
  const st = JSON.parse(JSON.stringify(AR.stato('ar2')));
  assert.equal(st.fase, 'battaglia');
  const adesso = Math.floor((st.ora - st.t0) * A.PASSO / 1000);
  assert.equal(adesso, 220, '7,345 secondi sono 220 passi interi');
  const ripresa = A.corri(A.nuova(st.seme, st.combattenti.map((c) => ({ id: c.id })), st.regole), adesso);
  assert.equal(ripresa.passo, adesso);
  const dalPrincipio = A.corri(A.nuova(b.seme, b.combattenti.map((c) => ({ id: c.id })), b.regole), adesso);
  assert.deepEqual(ripresa, dalPrincipio, 'chi arriva adesso e chi c\'era sono nello stesso punto');
  s.orologio.avanza(10 * 60_000);
  const v = s.eventi.find((e) => e.azione === 'vittoria');
  assert.deepEqual(A.esito(A.corri(ripresa, Infinity)).classifica, v.esito.classifica, 'la stessa fine che ha detto il server');
});

test('le regole si fermano all\'apertura: cambiarle a partita aperta non cambia la partita', () => {
  canale('ar3', { iscrizioni: 20, vita: 100 });
  const s = scena('ar3', { seme: 'ferme' });
  AR.apri('ar3', s.say);
  s.scrivi('anna'); s.scrivi('bruno'); s.scrivi('carla');
  canale('ar3', { iscrizioni: 20, vita: 900, danno: 1 });
  s.orologio.avanza(20_000);
  const b = s.eventi.find((e) => e.azione === 'battaglia');
  assert.equal(b.regole.vita, 100);
  assert.equal(b.regole.danno, A.BASE.danno);
});

test('annullata con meno di due: l\'ingresso torna indietro, niente premi', () => {
  canale('ar4', { iscrizioni: 15, costo: 30 });
  points.add('ar4', 'anna', 100);
  const s = scena('ar4');
  AR.apri('ar4', s.say);
  assert.match(s.detti[0], /L'ingresso costa 30 monete\./);
  s.scrivi('anna', 'eccomi');
  s.scrivi('anna', 'di nuovo');
  assert.equal(points.get('ar4', 'anna'), 70, 'pagato una volta, anche scrivendo due volte');
  assert.deepEqual(statoVivo.leggi('ar4', 'arena-quote'), { anna: 30 }, 'la quota e\' scritta dove sopravvive a un riavvio');
  s.orologio.avanza(15_000);
  assert.equal(points.get('ar4', 'anna'), 100, 'tornato tutto');
  assert.equal(statoVivo.leggi('ar4', 'arena-quote'), null);
  assert.equal(s.detti.at(-1), '⚔️ Nell\'arena c\'è solo anna, e per combattere servono due persone: sarà per la prossima. L\'ingresso è tornato a chi l\'aveva pagato.');
  assert.deepEqual(s.eventi.at(-1), { c: 'ar4', tipo: 'arena', azione: 'annullata', perche: 'pochi' });
  assert.equal(s.eventi.some((e) => e.azione === 'battaglia'), false);
  assert.equal(AR.arenaInCorso('ar4'), null);

  AR.apri('ar4', s.say);
  s.orologio.avanza(15_000);
  assert.equal(s.detti.at(-1), '⚔️ Nell\'arena non è entrato nessuno: sarà per la prossima.');
});

test('«!arena ferma» annulla anche a battaglia in corso, e rende l\'ingresso', () => {
  canale('ar5', { iscrizioni: 15, costo: 10, premioVincitore: 500 });
  for (const u of ['anna', 'bruno']) points.add('ar5', u, 50);
  const s = scena('ar5');
  AR.apri('ar5', s.say);
  s.scrivi('anna'); s.scrivi('bruno');
  s.orologio.avanza(15_000);
  assert.equal(AR.arenaInCorso('ar5'), 'battaglia');
  assert.equal(points.get('ar5', 'anna'), 40);
  AR.ferma('ar5', s.say);
  assert.equal(s.detti.at(-1), '⚔️ Arena fermata. L\'ingresso è tornato a chi l\'aveva pagato.');
  assert.equal(points.get('ar5', 'anna'), 50);
  assert.equal(points.get('ar5', 'bruno'), 50);
  s.orologio.avanza(20 * 60_000);
  assert.equal(points.get('ar5', 'anna') + points.get('ar5', 'bruno'), 100, 'la vittoria di una partita fermata non arriva');
  assert.equal(s.eventi.some((e) => e.azione === 'vittoria'), false);
});

test('un riavvio a iscrizioni aperte non si porta via l\'ingresso', () => {
  statoVivo.scrivi('ar6', 'arena-quote', { anna: 25, bruno: 25 });
  points.add('ar6', 'anna', 5);
  const rese = AR.rimborsaDopoRiavvio().filter((r) => r.channel === 'ar6');
  assert.deepEqual(rese, [{ channel: 'ar6', chi: ['anna', 'bruno'] }]);
  assert.equal(points.get('ar6', 'anna'), 30);
  assert.equal(points.get('ar6', 'bruno'), 25);
  assert.equal(statoVivo.leggi('ar6', 'arena-quote'), null);
  assert.equal(AR.testoRimborso(rese[0]), '⚔️ Il bot si è riavviato durante l\'arena: l\'ingresso è tornato a anna, bruno.');
  assert.deepEqual(AR.rimborsaDopoRiavvio().filter((r) => r.channel === 'ar6'), [], 'una volta sola');
});

test('chi entra: il modo, i livelli, il massimo, i bot, i doppioni', () => {
  canale('ar7', { iscrizioni: 30, massimo: 3 });
  const s = scena('ar7');
  AR.apri('ar7', s.say);
  assert.equal(s.scrivi('nightbot', 'Kappa'), false, 'un bot noto non entra');
  assert.equal(s.scrivi('ar7', 'sono io', { isSelf: true }), false, 'l\'account del bot non entra');
  assert.equal(s.scrivi('anna'), true);
  assert.equal(s.scrivi('anna'), false, 'una persona entra una volta');
  assert.equal(s.scrivi('Bruno'), true);
  assert.equal(s.scrivi('@carla'), true);
  const n = s.detti.length;
  assert.equal(s.scrivi('dario'), false, 'oltre il massimo non si entra');
  assert.equal(s.scrivi('elena'), false);
  assert.equal(s.detti.length, n + 1, 'l\'arena piena si dice una volta');
  assert.equal(s.detti.at(-1), '⚔️ L\'arena è piena, 3 combattenti: si entra la prossima volta.');
  assert.deepEqual(AR.stato('ar7').combattenti.map((c) => c.id), ['anna', 'bruno', 'carla']);
  assert.equal(AR.combatti('ar7', { channel: 'ar7', user: 'fabio', text: '!combatti' }, s.say), false, 'scrivendo, il comando non serve');
  AR.ferma('ar7', s.say);

  canale('ar8', { iscrizioni: 30, ingresso: 'comando', chi: 'sub' });
  const t = scena('ar8');
  AR.apri('ar8', t.say);
  assert.match(t.detti[0], /Scrivete !combatti per entrare, avete 30 secondi\./);
  assert.equal(t.scrivi('anna', 'ciao a tutti', { isSub: true }), false, 'col comando, scrivere non basta');
  assert.equal(AR.combatti('ar8', { channel: 'ar8', user: 'anna', display: 'anna', text: '!combatti', isSub: true }, t.say), true);
  assert.equal(AR.combatti('ar8', { channel: 'ar8', user: 'bruno', display: 'bruno', text: '!combatti' }, t.say), false);
  assert.equal(t.detti.at(-1), '⚔️ bruno, quest\'arena è riservata a chi è abbonato.');
  assert.equal(AR.combatti('ar8', { channel: 'ar8', user: 'carla', text: '!combatti', isVip: true }, t.say), true, 'sopra il livello si entra');
  assert.equal(AR.combatti('ar8', { channel: 'ar8', user: 'dario', text: '!combatti', isMod: true }, t.say), true);
  AR.ferma('ar8', t.say);
});

test('la probabilita\': una estrazione a persona, non a messaggio', () => {
  canale('ar9', { iscrizioni: 30, probabilita: 40 });
  const estratti = [0.39, 0.4, 0.95, 0.1];
  const chiesti = [];
  const s = scena('ar9', { caso: () => { const x = estratti.shift(); chiesti.push(x); return x; } });
  AR.apri('ar9', s.say);
  assert.equal(s.scrivi('anna'), true, '0,39 sotto 0,40: dentro');
  assert.equal(s.scrivi('bruno'), false, '0,40 non e\' sotto 0,40: fuori');
  assert.equal(s.scrivi('bruno'), false, 'e riscrivere non gli da\' un\'altra estrazione');
  assert.equal(s.scrivi('carla'), false);
  assert.equal(s.scrivi('dario'), true);
  assert.equal(s.scrivi('anna'), false);
  assert.deepEqual(chiesti, [0.39, 0.4, 0.95, 0.1], 'quattro persone, quattro estrazioni');
  AR.ferma('ar9', s.say);

  canale('ar10', { iscrizioni: 30, probabilita: 40, ingresso: 'comando' });
  const t = scena('ar10', { caso: () => { throw new Error('col comando non si estrae'); } });
  AR.apri('ar10', t.say);
  assert.equal(AR.combatti('ar10', { channel: 'ar10', user: 'anna', text: '!combatti' }, t.say), true, 'chi scrive il comando lo vuole: entra');
  AR.ferma('ar10', t.say);
});

test('l\'ingresso a pagamento: chi non ha le monete resta fuori, chi le ha paga una volta', () => {
  canale('ar11', { iscrizioni: 30, costo: 20, ingresso: 'comando' });
  points.add('ar11', 'anna', 20);
  points.add('ar11', 'bruno', 19);
  const s = scena('ar11');
  AR.apri('ar11', s.say);
  const cmd = (user) => AR.combatti('ar11', { channel: 'ar11', user, display: user, text: '!combatti' }, s.say);
  assert.equal(cmd('anna'), true);
  assert.equal(cmd('anna'), false);
  assert.equal(points.get('ar11', 'anna'), 0);
  assert.equal(cmd('bruno'), false);
  assert.equal(s.detti.at(-1), '⚔️ bruno, per entrare servono 20 monete e ne hai 19.');
  assert.equal(points.get('ar11', 'bruno'), 19, 'chi resta fuori non paga');
  AR.ferma('ar11', s.say);
  assert.equal(points.get('ar11', 'anna'), 20);
});

test('l\'emote, nell\'ordine: la scelta, la prima del messaggio, una del canale, nessuna', async () => {
  const proprie = { OMEGALUL: SETTE(ID7('o')), catJAM: SETTE(ID7('c')), peepoHey: SETTE(ID7('p')) };
  const tutte = { ...proprie, EZ: SETTE(ID7('e')) };
  canale('ar12', { iscrizioni: 30 });
  const s = scena('ar12', { mappe: { tutte, proprie } });
  arenaEmote.scegli('ar12', 'anna', { nome: 'PogChamp', url: TWITCH('88') });
  AR.apri('ar12', s.say);
  await aspettaPromesse();
  // Kappa sta in posizione 3 del testo: il tag di Twitch lo dice cosi'.
  s.scrivi('anna', 'EZ Kappa');
  s.scrivi('bruno', 'ciao EZ Kappa', { tags: { emotes: '25:8-12' } });
  s.scrivi('carla', 'Kappa EZ', { tags: { emotes: '25:0-4' } });
  s.scrivi('dario', 'ciao a tutti');
  const em = Object.fromEntries(AR.stato('ar12').combattenti.map((c) => [c.id, c.emote]));
  assert.deepEqual(em.anna, { nome: 'PogChamp', url: TWITCH('88') }, 'la scelta vince sul messaggio');
  assert.deepEqual(em.bruno, { nome: 'EZ', url: tutte.EZ }, 'la prima per posizione, anche se e\' di 7TV e dopo c\'e\' una di Twitch');
  assert.deepEqual(em.carla, { nome: 'Kappa', url: TWITCH('25') });
  assert.ok(Object.keys(proprie).includes(em.dario.nome), 'senza emote, una di quelle del canale');
  const di = (id) => AR.emoteDi({}, { proprie }, id);
  assert.deepEqual(di('dario'), em.dario, 'sempre la stessa per la stessa persona');
  assert.deepEqual(di('dario'), AR.emoteDi({}, { proprie: Object.fromEntries(Object.entries(proprie).reverse()) }, 'dario'), 'qualunque sia l\'ordine della mappa');
  assert.ok(new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((u) => di(u).nome)).size > 1, 'ma persone diverse non hanno tutte la stessa');
  assert.equal(AR.emoteDi({ parole: ['ciao'] }, {}, 'x'), null, 'se il canale non ne ha, nessuna');
  assert.equal(AR.emoteDi({ parole: ['constructor', 'toString'] }, { tutte: {} }, 'x'), null, 'le parole della lingua non sono emote');
  AR.ferma('ar12', s.say);
});

test('le emote 7TV che arrivano dopo aggiornano chi e\' gia\' entrato', async () => {
  canale('ar13', { iscrizioni: 30 });
  let dai;
  const arrivo = new Promise((r) => { dai = r; });
  const s = scena('ar13');
  AR.impostaEmote({ tutte: () => arrivo.then(() => ({ catJAM: SETTE(ID7('c')) })), proprie: async () => ({}) });
  AR.apri('ar13', s.say);
  s.scrivi('anna', 'catJAM catJAM');
  assert.equal(AR.stato('ar13').combattenti[0].emote, null, 'prima che arrivino, non si sa');
  dai();
  await aspettaPromesse();
  assert.deepEqual(AR.stato('ar13').combattenti[0].emote, { nome: 'catJAM', url: SETTE(ID7('c')) });
  const entrate = s.eventi.filter((e) => e.azione === 'entra');
  assert.equal(entrate.length, 2, 'l\'overlay riceve lo stesso combattente, rivestito');
  assert.deepEqual(entrate.map((e) => e.combattente.id), ['anna', 'anna']);
  AR.ferma('ar13', s.say);
});

test('«!emote»: sceglie la prima emote del messaggio, la ricorda, e cambia chi e\' gia\' dentro', async () => {
  canale('ar14', { iscrizioni: 30 });
  const s = scena('ar14', { mappe: { tutte: { catJAM: SETTE(ID7('c')) } } });
  const emote = (user, text, extra = {}) => AR.scegliEmote('ar14', { channel: 'ar14', user, display: user, text, ...extra }, s.say);
  await emote('anna', '!emote');
  assert.equal(s.detti.at(-1), '⚔️ anna, non hai ancora scelto un\'emote: scrivi !emote e l\'emote che vuoi.');
  s.orologio.avanza(5_000);
  await emote('anna', '!emote ciao');
  assert.equal(s.detti.at(-1), '⚔️ anna, in quel messaggio non vedo un\'emote di Twitch o del canale.');
  AR.apri('ar14', s.say);
  await aspettaPromesse();
  s.scrivi('anna', 'ciao');
  s.orologio.avanza(5_000);
  // Il comando rinominato: il tag di Twitch conta sul testo scritto davvero.
  await emote('anna', '!emote catJAM Kappa', { testoScritto: '!miaemote catJAM Kappa', tags: { emotes: '25:17-21' } });
  assert.equal(s.detti.at(-1), '⚔️ anna, nell\'arena combatterai con catJAM.');
  assert.deepEqual(arenaEmote.get('ar14', 'anna'), { nome: 'catJAM', url: SETTE(ID7('c')) });
  assert.deepEqual(AR.stato('ar14').combattenti[0].emote, { nome: 'catJAM', url: SETTE(ID7('c')) }, 'gia\' dentro: cambia subito');
  s.orologio.avanza(5_000);
  await emote('anna', '!emote Kappa', { testoScritto: '!miaemote Kappa', tags: { emotes: '25:10-14' } });
  assert.deepEqual(arenaEmote.get('ar14', 'anna'), { nome: 'Kappa', url: TWITCH('25') });
  const n = s.detti.length;
  await emote('anna', '!emote catJAM');
  assert.equal(s.detti.length, n, 'a raffica, tace');
  s.orologio.avanza(5_000);
  await emote('anna', '!emote');
  assert.equal(s.detti.at(-1), '⚔️ anna, nell\'arena combatti con Kappa. Per cambiarla: !emote e un\'altra emote.');
  AR.ferma('ar14', s.say);
});

test('i premi: al vincitore, per ogni eliminazione, alla corona se e\' accesa', () => {
  const esito = { vincitore: 'b', corona: 'c', classifica: [{ id: 'b', uccisioni: 1 }, { id: 'c', uccisioni: 3 }, { id: 'a', uccisioni: 0 }] };
  const c = { premioVincitore: 50, premioEliminazione: 5, premioCorona: 10, corona: 'si' };
  assert.deepEqual(AR.premiDi(esito, c), [{ id: 'b', monete: 55 }, { id: 'c', monete: 25 }], 'il vincitore prima, chi non prende niente non c\'e\'');
  assert.deepEqual(AR.premiDi(esito, { ...c, corona: 'no' }), [{ id: 'b', monete: 55 }, { id: 'c', monete: 15 }]);
  assert.deepEqual(AR.premiDi({ ...esito, corona: 'b' }, c), [{ id: 'b', monete: 65 }, { id: 'c', monete: 15 }]);
});

test('i premi di una partita vera arrivano a chi li ha presi, nella stessa riga che li dice', () => {
  canale('ar15', { iscrizioni: 20, premioVincitore: 40, premioEliminazione: 7, premioCorona: 11 });
  const s = scena('ar15', { seme: 'premi' });
  AR.apri('ar15', s.say);
  const gente = ['anna', 'bruno', 'carla', 'dario', 'elena'];
  for (const u of gente) s.scrivi(u);
  s.orologio.avanza(20_000);
  const b = s.eventi.find((e) => e.azione === 'battaglia');
  const vero = A.esito(A.corri(A.nuova(b.seme, b.combattenti.map((c) => ({ id: c.id })), b.regole), Infinity));
  s.orologio.avanza(30 * 60_000);
  for (const u of gente) {
    const r = vero.classifica.find((x) => x.id === u);
    const atteso = (u === vero.vincitore ? 40 : 0) + r.uccisioni * 7 + (u === vero.corona ? 11 : 0);
    assert.equal(points.get('ar15', u), atteso, u);
  }
  assert.ok(vero.classifica.reduce((t, r) => t + r.uccisioni, 0) > 0, 'la partita ha avuto eliminazioni da pagare');
  const riga = s.detti.find((t) => t.startsWith('🏆'));
  for (const u of gente) if (points.get('ar15', u)) assert.ok(riga.includes(`${u} +${points.get('ar15', u)}`), riga);
});

test('le regole del pannello sono quelle del motore, e gli oggetti gli stessi', () => {
  assert.deepEqual(A.regole(G.regoleDa(G.valoriDi({}, 'arena'))), A.regole({}), 'di serie il catalogo e\' il motore di serie');
  assert.deepEqual(G.OGGETTI_ARENA, A.OGGETTI);
  const r = A.regole(G.regoleDa({ ...G.valoriDi({}, 'arena'), ogniOggetto: 0 }));
  assert.deepEqual(r.spenti, A.OGGETTI, '«mai» spegne tutti gli oggetti');
  const r2 = A.regole(G.regoleDa({ ...G.valoriDi({}, 'arena'), oggetti: ['cuore'], corona: 'no', rinculo: 250, attesaColpo: 3 }));
  assert.deepEqual(r2.spenti, ['spada', 'scudo', 'stivali']);
  assert.equal(r2.corona, false);
  assert.equal(r2.rinculo, 2.5);
  assert.equal(r2.attesaColpo, 0.3);
  // Ogni manopola numerica sta dentro i limiti del motore: il pannello non
  // offre un valore che il motore stringerebbe in silenzio.
  const g = G.giocoDi('arena');
  for (const estremo of ['min', 'max']) {
    const v = G.valoriDi({}, 'arena');
    for (const p of g.param) if (['numero', 'secondi', 'percento'].includes(p.tipo) && p.k in A.BASE) v[p.k] = p[estremo];
    for (const p of g.param) if (['spada', 'scudo', 'cuore', 'stivali', 'strettaMin', 'rinculo', 'attesaColpo'].includes(p.k)) v[p.k] = p[estremo];
    const grezze = G.regoleDa(v);
    const strette = A.regole(grezze);
    for (const k of ['vita', 'velocita', 'danno', 'raggio', 'rinculo', 'attesaColpo', 'strettaDopo', 'strettaDurata', 'strettaMin', 'durataMax']) assert.equal(strette[k], grezze[k], `${k} al ${estremo}`);
    for (const k of Object.keys(grezze.oggetti)) assert.equal(strette.oggetti[k], grezze.oggetti[k], `${k} al ${estremo}`);
    if (grezze.ogniOggetto !== undefined) assert.equal(strette.ogniOggetto, grezze.ogniOggetto);
  }
});

test('la resa: il massimo di una persona in una partita, e all\'ora se si apre da sola', () => {
  const v = G.valoriDi({}, 'arena');
  const r = G.valutaResa(G.giocoDi('arena').resa, v);
  assert.deepEqual(r, { tipo: 'arena', massimo: 50 + 10 + 5 * 19, corona: true, ogni: 0, perOra: 0 });
  assert.deepEqual(G.valutaResa(G.giocoDi('arena').resa, { ...v, corona: 'no' }), { tipo: 'arena', massimo: 50 + 5 * 19, corona: false, ogni: 0, perOra: 0 }, 'senza corona, niente premio della corona');
  assert.deepEqual(G.valutaResa(G.giocoDi('arena').resa, { ...v, ogni: 30 }), { tipo: 'arena', massimo: 155, corona: true, ogni: 30, perOra: 310 });
});

test('le strade automatiche: ogni tanti minuti, e coi raid abbastanza grandi', () => {
  canale('ar16', { ogni: 45, dopoRaid: 20 });
  assert.equal(AR.vieneDaSolo('ar16'), 45);
  assert.equal(AR.vieneColRaid('ar16', 19), false);
  assert.equal(AR.vieneColRaid('ar16', 20), true);
  canale('ar17', {});
  assert.equal(AR.vieneDaSolo('ar17'), 0, 'di serie solo a mano');
  assert.equal(AR.vieneColRaid('ar17', 5000), false, 'di serie nessun raid la apre');
  assert.equal(AR.giocabile('ar17'), true);
  streamers.setSettings('ar17', { giochi: false });
  assert.equal(AR.giocabile('ar17'), false, 'coi giochi spenti non si apre da sola');
});

// Dalla chat, come ci arriva davvero: prima il vaglio del registro (nomi,
// rinomini, livelli), poi i giochi. Come fa il bot, il testo scritto resta
// accanto a quello tradotto nel nome canonico.
test('dalla chat: !arena la apre un moderatore, chi scrive entra, !arena ferma la chiude', async () => {
  const R = await import('../../src/features/comandi-registro.js');
  const games = await import('../../src/features/games.js');
  canale('ar18', { iscrizioni: 30 });
  streamers.setSettings('ar18', { ...streamers.get('ar18').settings, comandi: { combatti: { nome: 'lotta' } } });
  const s = scena('ar18');
  const chat = (user, text, extra = {}) => {
    const msg = { channel: 'ar18', user, display: user, text, isMod: user === 'mod', ...extra };
    const v = R.preparaComando('ar18', msg);
    if (v?.rifiuta) { s.detti.push(v.messaggio); return; }
    if (v?.salta) return;
    games.tryGame(v?.testo && v.testo !== text ? { ...msg, text: v.testo, testoScritto: text } : msg, s.say);
  };
  chat('anna', '!arena');
  assert.equal(s.detti.at(-1), '!arena qui è riservato ai moderatori e allo streamer.');
  assert.equal(AR.arenaInCorso('ar18'), null);
  chat('mod', '!arena');
  assert.equal(AR.arenaInCorso('ar18'), 'iscrizioni');
  assert.equal(s.detti.at(-1), '⚔️ Si apre l\'arena delle emote! Scrivete in chat per entrare, avete 30 secondi. Con !emote e un\'emote scegliete la vostra.');
  chat('anna', 'ciao!');
  chat('bruno', '5');
  chat('carla', '!slot');
  assert.deepEqual(AR.stato('ar18').combattenti.map((c) => c.id), ['anna', 'bruno', 'carla'], 'qualunque messaggio fa entrare');
  chat('mod', '!arena');
  assert.equal(s.detti.at(-1), '⚔️ C\'è già un\'arena in corso.');
  chat('mod', '!arena ferma');
  assert.equal(AR.arenaInCorso('ar18'), null);
  assert.equal(s.eventi.at(-1).azione, 'annullata');

  // Col comando, rinominato: le righe a schermo e l'annuncio dicono il nome del canale.
  canale('ar18', { iscrizioni: 30, ingresso: 'comando' });
  streamers.setSettings('ar18', { ...streamers.get('ar18').settings, comandi: { combatti: { nome: 'lotta' } } });
  chat('mod', '!arena');
  assert.match(s.detti.at(-1), /Scrivete !lotta per entrare/);
  assert.deepEqual(AR.stato('ar18').righe, ['Scrivi !lotta per entrare!', '!emote nome per scegliere la tua']);
  chat('anna', 'ciao');
  chat('bruno', '!lotta Kappa', { tags: { emotes: '25:7-11' } });
  assert.deepEqual(AR.stato('ar18').combattenti.map((c) => c.id), ['bruno'], 'col comando, scrivere non basta');
  assert.deepEqual(AR.stato('ar18').combattenti[0].emote, { nome: 'Kappa', url: TWITCH('25') }, 'l\'emote letta sul testo scritto, col nome del canale');
  chat('mod', '!arena ferma');
});

test('!giochi arena la spiega a tutti, e dice che aprirla e\' dei moderatori', async () => {
  const R = await import('../../src/features/comandi-registro.js');
  canale('ar19', { iscrizioni: 45 });
  const testo = R.spiegaGioco('ar19', 'arena', { user: 'anna' });
  assert.equal(testo, '🏟️ L\'arena delle emote: quando si apre l\'arena hai 45 secondi per entrare: scrivendo in chat, o con !combatti se il canale vuole il comando. Combatti con la tua emote, che scegli con !emote e un\'emote. Vince l\'ultimo in piedi, e con !arena un moderatore la apre. Qui farlo partire è riservato ai moderatori e allo streamer.');
  assert.equal(R.spiegaGioco('ar19', 'emote', {}).split(':')[0], '🏟️ L\'arena delle emote', 'la mossa porta al suo gioco');
});

// La tabella dell'emote scelta e' del canale: esce con i suoi dati e se ne va
// con lui. Non c'e' un elenco da aggiornare (le tabelle si ricavano dallo
// schema), e qui si guarda che valga davvero anche per lei.
test('l\'emote scelta esce nell\'esportazione del canale e se ne va con lui', async () => {
  const { esporta } = await import('../../src/features/esporta.js');
  const { cancella } = await import('../../src/features/cancella.js');
  canale('arenavia'); canale('arenaresta');
  arenaEmote.scegli('arenavia', 'anna', { nome: 'Kappa', url: TWITCH('25') });
  arenaEmote.scegli('arenaresta', 'anna', { nome: 'catJAM', url: SETTE(ID7('c')) });
  assert.equal(arenaEmote.scegli('arenavia', 'bruno', { nome: 'x', url: 'https://example.com/x.png' }), false, 'un indirizzo che non e\' di Twitch o di 7TV non si tiene');
  const e = esporta('arenavia');
  assert.deepEqual(e.dati.arena_emote.map((r) => [r.channel, r.user, r.nome]), [['arenavia', 'anna', 'Kappa']]);
  cancella('arenavia', { conferma: 'arenavia' });
  assert.equal(arenaEmote.get('arenavia', 'anna'), null);
  assert.deepEqual(arenaEmote.get('arenaresta', 'anna'), { nome: 'catJAM', url: SETTE(ID7('c')) }, 'quella di un altro canale resta');
});
