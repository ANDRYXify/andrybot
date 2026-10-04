// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// DECIDI TU (src/features/tg-decidi.js, docs/TELEGRAM.md «Decidi tu»), con un
// Telegram finto che scrive ogni chiamata e il database vero in una cartella
// usa-e-getta:
//  · una richiesta che passa a te arriva in privato al proprietario, coi due
//    tasti, e solo a lui;
//  · il si' e il no si dicono a Telegram una volta sola, anche se arrivano
//    insieme dal pannello e dal messaggio;
//  · se Telegram non risponde, la richiesta torna da decidere com'era;
//  · se Telegram non l'ha piu' (ritirata, o decisa dentro Telegram), la riga
//    lo dice; se e' gia' nel gruppo, e' nel gruppo;
//  · un amministratore che la fa entrare in Telegram chiude la riga;
//  · il messaggio in privato si riscrive con l'esito, e i tasti spariscono;
//  · cento richieste insieme non sono cento messaggi;
//  · una prova della porta non e' una richiesta da decidere;
//  · chi e' rifiutato aspetta mezz'ora, come dopo una prova non superata.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('tg-decidi-');
const { tgScudo, tgConf } = await import('../../src/db.js');
const D = await import('../../src/features/tg-decidi.js');
const G = await import('../../src/features/tg-scudo-gesti.js');
const S = await import('../../src/features/tg-scudo.js');
test.after(() => casa.pulisci());

const TOKEN = '123456:ABCdefGHIjklMNOpqrSTUvwxYZ';
const PROPRIETARIO = '777';
const GRUPPO = '-100500';
let adesso = Date.UTC(2026, 9, 4, 18);
const ora = () => adesso;

function finto({ errore = {} } = {}) {
  const chiamate = [];
  let id = 100;
  const fa = (nome) => async (...a) => {
    chiamate.push([nome, ...a]);
    await Promise.resolve();
    return errore[nome] ? { ok: false, errore: errore[nome] } : { ok: true, result: { message_id: ++id } };
  };
  return {
    chiamate,
    nomi: () => chiamate.map((c) => c[0]),
    telegram: {
      approvaRichiesta: fa('approvaRichiesta'), rifiutaRichiesta: fa('rifiutaRichiesta'), inviaMessaggio: fa('inviaMessaggio'),
      modificaMessaggio: fa('modificaMessaggio'), rispondiTasto: fa('rispondiTasto'), rispondiRichiesta: fa('rispondiRichiesta'),
    },
  };
}
const deps = (f) => ({ telegram: f.telegram, ora, lingua: () => 'it' });

let giro = 0;
function canale({ privato = true } = {}) {
  const ch = `decidi${++giro}`;
  tgConf.set(ch, { token: TOKEN, chatId: GRUPPO });
  tgConf.setInterattivo(ch, true, 'segreto-decidi' + giro);
  if (privato) tgConf.setOwnerTg(ch, PROPRIETARIO, 'Andry');
  return ch;
}
const conf = (ch) => tgConf.get(ch);
// una persona vera che aspetta te: come la lascia lo scudo
function aspetta(ch, user = '42', motivo = 'aiuto') {
  return tgScudo.finita({ channel: ch, chatId: GRUPPO, userId: user, nome: 'Ada <b>', titolo: 'Il gruppo', stato: 'admin', motivo, ora: adesso });
}

test('una richiesta che passa a te arriva in privato al proprietario, coi due tasti giusti', async () => {
  const ch = canale();
  const f = finto();
  const r = await D.avvisa(conf(ch), aspetta(ch), deps(f));
  assert.equal(r.che, 'mandato');
  const [nome, token, a, testo, opz] = f.chiamate[0];
  assert.deepEqual([nome, token, a], ['inviaMessaggio', TOKEN, PROPRIETARIO]);
  assert.match(testo, /href="tg:\/\/user\?id=42">Ada &lt;b&gt;<\/a> chiede di entrare in «Il gruppo» \(non riusciva a vedere la prova\)/, 'il nome si tocca, e non porta HTML suo');
  const tasti = opz.tastiera.inline_keyboard[0].map((t) => D.leggiTasto(t.callback_data));
  assert.deepEqual(tasti, [
    { decisione: 'approva', chatId: GRUPPO, userId: '42' },
    { decisione: 'rifiuta', chatId: GRUPPO, userId: '42' },
  ]);
  assert.equal(tgScudo.prendi(ch, GRUPPO, '42').avviso, `${PROPRIETARIO}:101`, 'si sa quale messaggio riscrivere');
});

test('senza chat privata, o con la chat privata spenta, non si scrive a nessuno', async () => {
  const f = finto();
  const senza = canale({ privato: false });
  assert.equal((await D.avvisa(conf(senza), aspetta(senza), deps(f))).che, 'niente');
  const spenta = canale();
  tgConf.setDmModo(spenta, 'off');
  assert.equal((await D.avvisa(conf(spenta), aspetta(spenta), deps(f))).che, 'niente');
  assert.equal(f.chiamate.length, 0);
});

test('il si\': Telegram lo sa, la riga e\' nel gruppo, il messaggio in privato lo dice senza tasti', async () => {
  const ch = canale();
  const f = finto();
  await D.avvisa(conf(ch), aspetta(ch), deps(f));
  const r = await D.decidi(conf(ch), { chatId: GRUPPO, userId: '42', decisione: 'approva' }, deps(f));
  assert.equal(r.esito, 'dentro');
  assert.deepEqual(f.nomi(), ['inviaMessaggio', 'approvaRichiesta', 'modificaMessaggio']);
  assert.deepEqual(f.chiamate[1].slice(1), [TOKEN, GRUPPO, '42']);
  const [, , chat, msg, testo, opz] = f.chiamate[2];
  assert.deepEqual([chat, String(msg)], [PROPRIETARIO, '101']);
  assert.match(testo, /richiesta accettata, adesso è nel gruppo/);
  assert.equal(opz, undefined, 'niente tasti: la risposta c\'e\' gia\'');
  const riga = tgScudo.prendi(ch, GRUPPO, '42');
  assert.deepEqual([riga.stato, riga.motivo, riga.fine], ['dentro', 'pannello', adesso]);
  assert.equal(tgScudo.quanteDaDecidere(ch), 0);
});

test('il no: Telegram lo sa, e chi e\' rifiutato aspetta mezz\'ora come dopo una prova', async () => {
  const ch = canale();
  const f = finto();
  aspetta(ch);
  adesso += 2 * 3_600_000;   // si decide dopo: la mezz'ora parte da qui, non da quando ha chiesto
  const r = await D.decidi(conf(ch), { chatId: GRUPPO, userId: '42', decisione: 'rifiuta' }, deps(f));
  assert.equal(r.esito, 'bocciata');
  assert.deepEqual(f.nomi(), ['rifiutaRichiesta']);
  const prima = tgScudo.prendi(ch, GRUPPO, '42');
  const chi = { chatId: GRUPPO, userId: '42', queryId: 'q', gruppo: true };
  assert.equal(S.azioneRichiesta({ acceso: true, chi, prima, ora: adesso + 10 * 60_000 }), 'rifiuta');
  assert.equal(S.azioneRichiesta({ acceso: true, chi, prima, ora: adesso + 31 * 60_000 }), 'guardiano');
});

test('la decisione nel database riesce una volta sola, qualunque cosa arrivi dopo', () => {
  const ch = canale();
  aspetta(ch);
  assert.equal(tgScudo.decidi(ch, GRUPPO, '42', 'dentro', 'pannello', adesso), true);
  assert.equal(tgScudo.decidi(ch, GRUPPO, '42', 'bocciata', 'messaggio', adesso), false);
  assert.equal(tgScudo.prendi(ch, GRUPPO, '42').stato, 'dentro');
  assert.equal(tgScudo.riapri(ch, GRUPPO, '42', 'bocciata'), false, 'si riapre solo da quello che si era deciso');
});

test('pannello e messaggio insieme: Telegram sente una decisione sola', async () => {
  const ch = canale();
  const f = finto();
  aspetta(ch);
  const [a, b] = await Promise.all([
    D.decidi(conf(ch), { chatId: GRUPPO, userId: '42', decisione: 'approva', da: 'pannello' }, deps(f)),
    D.decidi(conf(ch), { chatId: GRUPPO, userId: '42', decisione: 'rifiuta', da: 'messaggio' }, deps(f)),
  ]);
  assert.deepEqual([a.esito, b.esito], ['dentro', 'gia']);
  assert.deepEqual(f.nomi(), ['approvaRichiesta']);
});

test('Telegram non risponde: la richiesta torna da decidere com\'era, e si puo\' rifare', async () => {
  const ch = canale();
  aspetta(ch, '42', 'porta');
  const prima = tgScudo.prendi(ch, GRUPPO, '42');
  const giu = finto({ errore: { approvaRichiesta: 'Telegram non risponde (timeout)' } });
  adesso += 60_000;
  const r = await D.decidi(conf(ch), { chatId: GRUPPO, userId: '42', decisione: 'approva' }, deps(giu));
  assert.equal(r.esito, 'riprova');
  const riga = tgScudo.prendi(ch, GRUPPO, '42');
  assert.deepEqual([riga.stato, riga.motivo, riga.fine], ['admin', 'porta', prima.fine], 'nessuna decisione presa, niente perso');
  assert.equal((await D.decidi(conf(ch), { chatId: GRUPPO, userId: '42', decisione: 'approva' }, deps(finto()))).esito, 'dentro');
});

test('Telegram non ha piu\' la richiesta: la riga lo dice; e\' gia\' nel gruppo: e\' nel gruppo', async () => {
  const ch = canale();
  aspetta(ch, '42');
  const via = finto({ errore: { rifiutaRichiesta: 'Bad Request: HIDE_REQUESTER_MISSING' } });
  assert.equal((await D.decidi(conf(ch), { chatId: GRUPPO, userId: '42', decisione: 'rifiuta' }, deps(via))).esito, 'sparita');
  assert.equal(tgScudo.prendi(ch, GRUPPO, '42').stato, 'sparita');
  aspetta(ch, '43');
  const dentro = finto({ errore: { approvaRichiesta: 'Bad Request: USER_ALREADY_PARTICIPANT' } });
  assert.equal((await D.decidi(conf(ch), { chatId: GRUPPO, userId: '43', decisione: 'approva' }, deps(dentro))).esito, 'dentro');
  assert.deepEqual([tgScudo.prendi(ch, GRUPPO, '43').stato, tgScudo.prendi(ch, GRUPPO, '43').motivo], ['dentro', 'admin']);
});

test('una prova della porta non e\' una richiesta da decidere, e una decisione strana non e\' una decisione', async () => {
  const ch = canale();
  const f = finto();
  tgScudo.apri({ channel: ch, chatId: GRUPPO, userId: 'w:abc', via: 'web', ora: adesso });
  tgScudo.chiudi(ch, GRUPPO, 'w:abc', 'admin', 'aiuto', adesso);
  assert.equal((await D.decidi(conf(ch), { chatId: GRUPPO, userId: 'w:abc', decisione: 'approva' }, deps(f))).esito, 'nessuna');
  assert.equal(tgScudo.quanteDaDecidere(ch), 0, 'e non si conta');
  aspetta(ch);
  assert.equal((await D.decidi(conf(ch), { chatId: GRUPPO, userId: '42', decisione: 'banna' }, deps(f))).esito, 'nessuna');
  assert.equal(f.chiamate.length, 0);
});

test('il tasto in privato vale solo per il proprietario, e a ogni pressione si risponde', async () => {
  const ch = canale();
  const f = finto();
  aspetta(ch);
  const cq = (da, chat = da, decisione = 'approva') => ({ id: 'cb' + da, from: { id: Number(da) }, message: { message_id: 101, chat: { id: Number(chat), type: 'private' } }, data: D.datoTasto(decisione, GRUPPO, '42') });
  assert.equal((await D.premuto(conf(ch), cq('999'), deps(f))).che, 'nonTuo');
  assert.equal((await D.premuto(conf(ch), cq('999', PROPRIETARIO), deps(f))).che, 'nonTuo', 'nella chat giusta, ma premuto da un altro');
  assert.equal((await D.premuto(conf(ch), cq(PROPRIETARIO, '-100500'), deps(f))).che, 'nonTuo', 'il tasto girato in un gruppo non vale');
  assert.deepEqual(f.nomi(), ['rispondiTasto', 'rispondiTasto', 'rispondiTasto']);
  assert.equal(tgScudo.prendi(ch, GRUPPO, '42').stato, 'admin');
  assert.equal((await D.premuto(conf(ch), cq(PROPRIETARIO), deps(f))).che, 'dentro');
  assert.equal(tgScudo.prendi(ch, GRUPPO, '42').motivo, 'messaggio');
  const n = f.chiamate.length;
  assert.equal((await D.premuto(conf(ch), cq(PROPRIETARIO, PROPRIETARIO, 'rifiuta'), deps(f))).che, 'gia');
  assert.deepEqual(f.nomi().slice(n), ['rispondiTasto', 'modificaMessaggio'], 'un tasto vecchio risponde e si riscrive, ma non decide di nuovo');
  assert.match(f.chiamate.at(-1)[4], /richiesta accettata/);
  assert.equal((await D.premuto(conf(ch), { id: 'x', data: 'sbin:42' }, deps(f))).che, 'altrui', 'il tasto del cancello non e\' suo');
});

test('un amministratore la fa entrare dentro Telegram: la riga e\' chiusa e il messaggio lo dice', async () => {
  const ch = canale();
  const f = finto();
  await D.avvisa(conf(ch), aspetta(ch), deps(f));
  const upd = { chat_member: { chat: { id: Number(GRUPPO), type: 'supergroup', title: 'Il gruppo' }, from: { id: 1 },
    old_chat_member: { status: 'left', user: { id: 42 } }, new_chat_member: { status: 'member', user: { id: 42, first_name: 'Ada' } }, via_join_request: true } };
  assert.equal(G.entrato(conf(ch), upd, deps(f)), true);
  assert.deepEqual([tgScudo.prendi(ch, GRUPPO, '42').stato, tgScudo.prendi(ch, GRUPPO, '42').motivo], ['dentro', 'admin'], 'subito, prima di ogni attesa');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(f.nomi(), ['inviaMessaggio', 'modificaMessaggio']);
  assert.equal((await D.decidi(conf(ch), { chatId: GRUPPO, userId: '42', decisione: 'rifiuta' }, deps(f))).esito, 'gia', 'una decisione dopo non la ricaccia fuori');
});

test('cento richieste insieme non sono cento messaggi: cinque, poi uno che dice dove sono le altre', async () => {
  const ch = canale();
  const f = finto();
  const esiti = [];
  for (let i = 0; i < 8; i++) esiti.push((await D.avvisa(conf(ch), aspetta(ch, String(1000 + i)), deps(f))).che);
  assert.deepEqual(esiti, ['mandato', 'mandato', 'mandato', 'mandato', 'mandato', 'riassunto', 'tetto', 'tetto']);
  assert.equal(f.chiamate.length, D.TETTO_AVVISI + 1);
  assert.match(f.chiamate.at(-1)[3], /molte richieste/);
  assert.equal(tgScudo.quanteDaDecidere(ch), 8, 'nel pannello ci sono tutte');
  adesso += D.FINESTRA_AVVISI_MS;
  assert.equal((await D.avvisa(conf(ch), aspetta(ch, '2000'), deps(f))).che, 'mandato', 'passata la finestra, si ricomincia');
});

test('dove nasce una richiesta da decidere, il proprietario lo sa: la porta e la prova che non si vede', async () => {
  const ch = canale();
  tgConf.setScudo(ch, S.normScudo({ attivo: true, minuti: 10 }));
  const f = finto();
  // dal link «decidi tu» della porta: la richiesta arriva e resta in coda
  tgScudo.apri({ channel: ch, chatId: GRUPPO, userId: 'w:porta', via: 'web', ora: adesso });
  tgScudo.chiudi(ch, GRUPPO, 'w:porta', 'admin', 'aiuto', adesso);
  tgScudo.segnaInvito(ch, GRUPPO, 'w:porta', 'https://t.me/+decidi', adesso + 3_600_000);
  const upd = { chat_join_request: { chat: { id: Number(GRUPPO), type: 'supergroup', title: 'Il gruppo' }, from: { id: 55, first_name: 'Bea', language_code: 'it' },
    user_chat_id: 55, date: 1, invite_link: { invite_link: 'https://t.me/+decidi', creates_join_request: true } } };
  assert.equal((await G.richiesta(conf(ch), upd, { ...deps(f), url: () => 'https://x' })).che, 'admin');
  assert.ok(f.chiamate.some((c) => c[0] === 'inviaMessaggio' && c[2] === PROPRIETARIO), 'il proprietario lo sa');
  assert.deepEqual(tgScudo.daDecidere(ch).map((r) => [r.tg_user_id, r.motivo]), [['55', 'porta']]);
  // dentro Telegram: il guardiano non riesce ad aprire la prova, e decidi tu
  const giu = finto({ errore: { mostraVerifica: 'Bad Request: QUERY_ID_INVALID' } });
  giu.telegram.mostraVerifica = async (...a) => { giu.chiamate.push(['mostraVerifica', ...a]); return { ok: false, errore: 'no' }; };
  const dentro = { chat_join_request: { chat: { id: Number(GRUPPO), type: 'supergroup', title: 'Il gruppo' }, from: { id: 56, first_name: 'Cleo', language_code: 'it' }, user_chat_id: 56, date: 1, query_id: 'q56' } };
  assert.equal((await G.richiesta(conf(ch), dentro, { ...deps(giu), url: () => 'https://x' })).che, 'admin');
  assert.ok(giu.chiamate.some((c) => c[0] === 'inviaMessaggio' && c[2] === PROPRIETARIO && /Cleo/.test(c[3])), 'anche da qui il proprietario lo sa');
  assert.deepEqual(tgScudo.recenti(ch).filter((r) => r.via === '').map((r) => r.tg_user_id), [], 'chi aspetta te non sta anche fra le ultime richieste');
});

test('le richieste che aspettano restano un mese, le altre una settimana', () => {
  const ch = canale();
  const vecchio = adesso - 10 * 86_400_000;
  tgScudo.finita({ channel: ch, chatId: GRUPPO, userId: '61', stato: 'admin', motivo: 'aiuto', ora: vecchio });
  tgScudo.finita({ channel: ch, chatId: GRUPPO, userId: '62', stato: 'bocciata', motivo: 'prova', ora: vecchio });
  tgScudo.finita({ channel: ch, chatId: GRUPPO, userId: '63', stato: 'admin', motivo: 'aiuto', ora: adesso - 40 * 86_400_000 });
  tgScudo.pota(adesso - 7 * 86_400_000);
  assert.ok(tgScudo.prendi(ch, GRUPPO, '61'), 'dieci giorni e nessuno ha deciso: resta');
  assert.equal(tgScudo.prendi(ch, GRUPPO, '62'), null);
  assert.equal(tgScudo.prendi(ch, GRUPPO, '63'), null, 'quaranta giorni: esce dalla lista');
});
