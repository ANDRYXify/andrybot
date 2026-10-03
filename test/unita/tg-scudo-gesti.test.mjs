// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO SCUDO, i gesti (src/features/tg-scudo-gesti.js), con un Telegram finto che
// scrive ogni chiamata e il database vero in una cartella usa-e-getta:
//  · col guardiano la pagina si apre con la prima chiamata, e la riga c'e' gia';
//  · in privato arriva un messaggio col tasto della pagina;
//  · chi e' la persona lo dice solo la firma, col token di QUEL bot;
//  · i tentativi sono tre anche mandando cento invii insieme;
//  · si entra una volta, e solo superando la prova; ogni guasto finisce in un no
//    o agli amministratori;
//  · le scadute si chiudono, una volta sola;
//  · il link d'invito e' uno, e chiede l'approvazione quando lo scudo e' acceso;
//  · il cancello non silenzia chi e' passato dallo scudo.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('tg-scudo-');
const { tgScudo, tgConf, tgAttesa } = await import('../../src/db.js');
const G = await import('../../src/features/tg-scudo-gesti.js');
const S = await import('../../src/features/tg-scudo.js');
const C = await import('../../src/features/tg-cancello.js');
test.after(() => casa.pulisci());

const TOKEN = '123456:ABCdefGHIjklMNOpqrSTUvwxYZ';
let adesso = Date.UTC(2026, 9, 3, 18);
const ora = () => adesso;

function finto({ rifiuta = {} } = {}) {
  const chiamate = [];
  const ok = (nome) => async (...a) => { chiamate.push([nome, ...a]); return rifiuta[nome] ? { ok: false, errore: 'no' } : { ok: true, result: { message_id: 9 } }; };
  return {
    chiamate,
    nomi: () => chiamate.map((c) => c[0]),
    telegram: {
      rispondiRichiesta: ok('rispondiRichiesta'), approvaRichiesta: ok('approvaRichiesta'), rifiutaRichiesta: ok('rifiutaRichiesta'),
      mostraVerifica: ok('mostraVerifica'), inviaMessaggio: ok('inviaMessaggio'),
      creaInvito: async (...a) => { chiamate.push(['creaInvito', ...a]); return rifiuta.creaInvito ? { ok: false } : { ok: true, url: `https://t.me/+nuovo${chiamate.length}`, richiesta: !!a[2]?.richiesta }; },
      cambiaInvito: async (...a) => { chiamate.push(['cambiaInvito', ...a]); return rifiuta.cambiaInvito ? { ok: false } : { ok: true, url: a[2], richiesta: !!a[3]?.richiesta, revocato: false }; },
    },
  };
}
const prova = { disegnabile: () => true, provaInMovimento: async () => Buffer.from('SBM1') };
const deps = (f, x = {}) => ({ telegram: f.telegram, ora, prova, url: (c) => `https://telegram.socialbot.live/${c}/verifica`, ...x });

let giro = 0;
function canale(scudo = {}) {
  const ch = `scudo${++giro}`;
  tgConf.set(ch, { token: TOKEN, chatId: '-100500' });
  tgConf.setInterattivo(ch, true, 'segreto' + giro);
  tgConf.setScudo(ch, S.normScudo({ attivo: true, minuti: 10, domande: [{ testo: 'Due più due?', opzioni: ['3', '4'], giusta: 1 }], ...scudo }));
  return ch;
}
const conf = (ch) => tgConf.get(ch);
const update = ({ chat = '-100500', user = 42, query = '', ucid = 42, tipo = 'supergroup' } = {}) => ({
  chat_join_request: { chat: { id: Number(chat), type: tipo, title: 'Il gruppo' }, from: { id: user, first_name: 'Ada', language_code: 'it' }, user_chat_id: ucid, date: 1, ...(query ? { query_id: query } : {}) },
});

// initData firmato come lo firma Telegram, col token del bot
function initData(token, { user = 42, chat = null, query = '', authDate = Math.floor(adesso / 1000) } = {}) {
  const p = new URLSearchParams();
  p.set('auth_date', String(authDate));
  p.set('user', JSON.stringify({ id: user, first_name: 'Ada', language_code: 'it' }));
  if (chat) p.set('chat', JSON.stringify({ id: Number(chat), type: 'supergroup', title: 'Il gruppo' }));
  if (query) p.set('chat_join_request_query_id', query);
  const dcs = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const segreto = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  p.set('hash', crypto.createHmac('sha256', segreto).update(dcs).digest('hex'));
  return p.toString();
}

test('col guardiano la pagina si apre con la prima chiamata, e la riga e\' gia\' nel database', async () => {
  const ch = canale();
  const f = finto();
  let rigaAllaChiamata = null;
  f.telegram.mostraVerifica = async (...a) => { f.chiamate.push(['mostraVerifica', ...a]); rigaAllaChiamata = tgScudo.prendi(ch, '-100500', '42'); return { ok: true }; };
  const r = await G.richiesta(conf(ch), update({ query: 'q1' }), deps(f));
  assert.equal(r.che, 'guardiano');
  assert.deepEqual(f.nomi(), ['mostraVerifica'], 'nessun\'altra chiamata prima');
  assert.equal(f.chiamate[0][2], 'q1');
  assert.equal(f.chiamate[0][3], `https://telegram.socialbot.live/${ch}/verifica?c=-100500`);
  assert.equal(rigaAllaChiamata?.stato, 'attesa');
  assert.equal(rigaAllaChiamata.query_id, 'q1');
});

test('se il guardiano non riesce ad aprire la pagina, decidono gli amministratori', async () => {
  const ch = canale();
  const f = finto({ rifiuta: { mostraVerifica: true } });
  const r = await G.richiesta(conf(ch), update({ query: 'q2' }), deps(f));
  assert.equal(r.che, 'admin');
  assert.deepEqual(f.nomi(), ['mostraVerifica', 'rispondiRichiesta']);
  assert.equal(f.chiamate[1][3], 'queue');
  assert.equal(tgScudo.prendi(ch, '-100500', '42').stato, 'admin');
});

test('scudo spento col guardiano: la richiesta va agli amministratori, subito', async () => {
  const ch = canale({ attivo: false });
  const f = finto();
  const r = await G.richiesta(conf(ch), update({ query: 'q3' }), deps(f));
  assert.equal(r.che, 'coda');
  assert.deepEqual(f.chiamate, [['rispondiRichiesta', TOKEN, 'q3', 'queue']]);
});

test('in privato: un messaggio col tasto della pagina, nella lingua di chi chiede', async () => {
  const ch = canale();
  const f = finto();
  const r = await G.richiesta(conf(ch), update(), deps(f));
  assert.equal(r.che, 'privato');
  const [nome, tok, dove, testo, opz] = f.chiamate[0];
  assert.equal(nome, 'inviaMessaggio');
  assert.equal(tok, TOKEN);
  assert.equal(dove, '42');
  assert.match(testo, /Il gruppo/);
  assert.deepEqual(opz.tastiera.inline_keyboard[0][0].web_app, { url: `https://telegram.socialbot.live/${ch}/verifica?c=-100500` });
  // se il messaggio non parte, la richiesta resta agli amministratori
  const ch2 = canale();
  const f2 = finto({ rifiuta: { inviaMessaggio: true } });
  assert.equal((await G.richiesta(conf(ch2), update(), deps(f2))).che, 'admin');
  assert.deepEqual(f2.nomi(), ['inviaMessaggio'], 'senza guardiano non si chiama niente: la richiesta resta nella lista degli amministratori');
  assert.equal(tgScudo.prendi(ch2, '-100500', '42').stato, 'admin');
});

test('chi sei lo dice la firma, col token di quel bot; il gruppo deve avere una richiesta tua', async () => {
  const ch = canale();
  await G.richiesta(conf(ch), update({ user: 77, ucid: 77 }), deps(finto()));
  const c = conf(ch);
  assert.equal(G.identifica(c, initData(TOKEN, { user: 77 }), '-100500', { ora }).userId, '77');
  assert.equal(G.identifica(c, initData('999:altro', { user: 77 }), '-100500', { ora }).ok, false, 'firmato da un altro bot');
  const manomesso = initData(TOKEN, { user: 77 }).replace('77', '78');
  assert.equal(G.identifica(c, manomesso, '-100500', { ora }).ok, false, 'persona cambiata dopo la firma');
  assert.equal(G.identifica(c, initData(TOKEN, { user: 77, authDate: Math.floor(adesso / 1000) - 3601 }), '-100500', { ora }).ok, false, 'firma di piu\' di un\'ora');
  assert.equal(G.identifica(c, initData(TOKEN, { user: 77 }), 'abc', { ora }).ok, false, 'un gruppo che non e\' un numero');
  // un gruppo dove non hai chiesto niente: nessuna richiesta tua
  const id = G.identifica(c, initData(TOKEN, { user: 77 }), '-100999', { ora });
  assert.equal((await G.apri(c, id, {}, deps(finto()))).esito, 'chiusa');
  // col guardiano il gruppo e la domanda vengono dalla firma
  const g = G.identifica(c, initData(TOKEN, { user: 77, chat: '-100500', query: 'qq' }), '', { ora });
  assert.deepEqual([g.chatId, g.queryId], ['-100500', 'qq']);
});

test('la pagina: domande senza la giusta, e la prova', async () => {
  const ch = canale({ regole: { attivo: true, testo: 'Niente spam.' } });
  await G.richiesta(conf(ch), update(), deps(finto()));
  const id = G.identifica(conf(ch), initData(TOKEN), '-100500', { ora });
  const a = await G.apri(conf(ch), id, {}, deps(finto()));
  assert.equal(a.esito, 'attesa');
  assert.equal(a.regole, 'Niente spam.');
  assert.deepEqual(a.domande, [{ testo: 'Due più due?', opzioni: ['3', '4'] }]);
  assert.ok(!JSON.stringify(a).includes('giusta'));
  assert.equal(a.prove, S.IMMAGINI);
  const i = await G.immagine(conf(ch), id, deps(finto()));
  assert.equal(i.esito, 'ok');
  assert.ok(Buffer.isBuffer(i.bin));
  assert.ok(!JSON.stringify(a).includes(tgScudo.prendi(ch, '-100500', '42').codice), 'il codice non esce');
});

test('cento invii insieme: i tentativi restano tre', async () => {
  const ch = canale();
  await G.richiesta(conf(ch), update(), deps(finto()));
  const id = G.identifica(conf(ch), initData(TOKEN), '-100500', { ora });
  await G.immagine(conf(ch), id, deps(finto()));
  const firma = S.firmaDomande(G.scudoDi(conf(ch)));
  const codice = tgScudo.prendi(ch, '-100500', '42').codice;
  const sbagli = Array.from({ length: 100 }, (_, k) => `ZZZ${String(k).padStart(2, '0')}`).filter((x) => x !== codice);
  const esiti = await Promise.all(sbagli.map((c) => G.invia(conf(ch), id, { codice: c, risposte: [1], firma }, deps(finto()))));
  const conta = (e) => esiti.filter((x) => x.esito === e).length;
  assert.equal(conta('riprova'), S.TENTATIVI - 1);
  assert.equal(conta('nuova'), 1 + (esiti.length - S.TENTATIVI), 'dopo il terzo, il codice non si confronta piu\'');
  assert.equal(tgScudo.prendi(ch, '-100500', '42').codice, '', 'il codice speso e\' tolto');
  // anche quello giusto, adesso, non vale: serve la prova dopo
  assert.equal((await G.invia(conf(ch), id, { codice, risposte: [1], firma }, deps(finto()))).esito, 'nuova');
});

test('si entra una volta sola, superando la prova; due invii giusti insieme approvano una volta', async () => {
  const ch = canale();
  await G.richiesta(conf(ch), update({ query: 'qa' }), deps(finto()));
  const id = G.identifica(conf(ch), initData(TOKEN, { chat: '-100500', query: 'qa' }), '', { ora });
  await G.immagine(conf(ch), id, deps(finto()));
  const firma = S.firmaDomande(G.scudoDi(conf(ch)));
  const codice = tgScudo.prendi(ch, '-100500', '42').codice;
  const f = finto();
  const [x, y] = await Promise.all([1, 2].map(() => G.invia(conf(ch), id, { codice, risposte: [1], firma }, deps(f))));
  assert.deepEqual([x.esito, y.esito].sort(), ['dentro', 'dentro']);
  assert.deepEqual(f.chiamate, [['rispondiRichiesta', TOKEN, 'qa', 'approve']], 'una chiamata sola');
  assert.equal(tgScudo.prendi(ch, '-100500', '42').stato, 'passata');
});

test('risposte sbagliate: un no, o agli amministratori se lo streamer vuole cosi\'', async () => {
  for (const [no, atteso, chiamata] of [['rifiuta', 'no', 'rifiutaRichiesta'], ['admin', 'admin', null]]) {
    const ch = canale({ no });
    await G.richiesta(conf(ch), update(), deps(finto()));
    const id = G.identifica(conf(ch), initData(TOKEN), '-100500', { ora });
    await G.immagine(conf(ch), id, deps(finto()));
    const codice = tgScudo.prendi(ch, '-100500', '42').codice;
    const f = finto();
    const e = await G.invia(conf(ch), id, { codice, risposte: [0], firma: S.firmaDomande(G.scudoDi(conf(ch))) }, deps(f));
    assert.equal(e.esito, atteso);
    assert.deepEqual(f.nomi(), chiamata ? [chiamata] : []);
    assert.ok(!f.nomi().includes('approvaRichiesta'));
  }
});

test('approvato ma Telegram dice di no: e\' un errore, non un «dentro»', async () => {
  const ch = canale();
  await G.richiesta(conf(ch), update(), deps(finto()));
  const id = G.identifica(conf(ch), initData(TOKEN), '-100500', { ora });
  await G.immagine(conf(ch), id, deps(finto()));
  const codice = tgScudo.prendi(ch, '-100500', '42').codice;
  const e = await G.invia(conf(ch), id, { codice, risposte: [1], firma: S.firmaDomande(G.scudoDi(conf(ch))) }, deps(finto({ rifiuta: { approvaRichiesta: true } })));
  assert.equal(e.esito, 'errore');
  assert.equal(tgScudo.prendi(ch, '-100500', '42').stato, 'errore');
});

test('«Non riesco a vederla»: agli amministratori, mai un rifiuto', async () => {
  const ch = canale();
  await G.richiesta(conf(ch), update({ query: 'qh' }), deps(finto()));
  const id = G.identifica(conf(ch), initData(TOKEN, { chat: '-100500', query: 'qh' }), '', { ora });
  const f = finto();
  assert.equal((await G.aiuto(conf(ch), id, deps(f))).esito, 'admin');
  assert.deepEqual(f.chiamate, [['rispondiRichiesta', TOKEN, 'qh', 'queue']]);
  assert.equal(tgScudo.prendi(ch, '-100500', '42').motivo, 'aiuto');
});

test('le scadute si chiudono una volta, e chi ci riprova subito e\' rifiutato senza pagina', async () => {
  const ch = canale();
  await G.richiesta(conf(ch), update({ user: 55, ucid: 55 }), deps(finto()));
  adesso += 11 * 60_000;
  const f = finto();
  const n = await G.giroScadenze((c) => tgConf.get(c), deps(f));
  assert.ok(n >= 1);
  assert.ok(f.chiamate.some((c) => c[0] === 'rifiutaRichiesta' && c[3] === '55'));
  assert.equal(tgScudo.prendi(ch, '-100500', '55').stato, 'bocciata');
  const f2 = finto();
  assert.equal(await G.giroScadenze((c) => tgConf.get(c), deps(f2)), 0, 'gia\' chiusa');
  // ci riprova subito: rifiutata senza pagina
  const f3 = finto();
  assert.equal((await G.richiesta(conf(ch), update({ user: 55, ucid: 55 }), deps(f3))).che, 'rifiutato');
  assert.deepEqual(f3.nomi(), ['rifiutaRichiesta']);
  // passata la mezz'ora, di nuovo la pagina
  adesso += S.ATTESA_DOPO_NO;
  assert.equal((await G.richiesta(conf(ch), update({ user: 55, ucid: 55 }), deps(finto()))).che, 'privato');
});

test('il link d\'invito: uno per gruppo, con l\'approvazione quando lo scudo e\' acceso', async () => {
  const ch = canale();
  const salva = (v) => tgConf.setInvito(ch, v);
  const f = finto();
  const a = await G.invito(conf(ch), { salva }, deps(f));
  assert.deepEqual([a.ok, a.richiesta], [true, true]);
  assert.deepEqual(f.nomi(), ['creaInvito']);
  assert.equal((await G.invito(conf(ch), { salva }, deps(f))).url, a.url);
  assert.deepEqual(f.nomi(), ['creaInvito'], 'gia\' fatto: nessuna chiamata');
  tgConf.setScudo(ch, { ...G.scudoDi(conf(ch)), attivo: false });
  const b = await G.invito(conf(ch), { salva }, deps(f));
  assert.deepEqual([b.url, b.richiesta], [a.url, false], 'lo stesso link, senza approvazione');
  assert.equal(f.nomi()[1], 'cambiaInvito');
});

test('il cancello non silenzia chi e\' entrato da una richiesta o e\' passato dallo scudo', async () => {
  const ch = canale();
  tgConf.setIngresso(ch, { attivo: true });
  const f = finto();
  const muta = { ...f.telegram, infoChat: async () => ({ ok: true, chat: { permissions: { can_send_messages: true } } }), limitaMembro: async (...a) => { f.chiamate.push(['limitaMembro', ...a]); return { ok: true }; } };
  const entra = (user, extra = {}) => ({ chat_member: { chat: { id: -100500, type: 'supergroup' }, old_chat_member: { status: 'left' }, new_chat_member: { status: 'member', user: { id: user, first_name: 'X' } }, ...extra } });
  assert.equal((await C.entrato(conf(ch), entra(1, { via_join_request: true }), { telegram: muta })).che, 'nessuno');
  assert.equal((await C.entrato(conf(ch), entra(2, { invite_link: { creates_join_request: true } }), { telegram: muta })).che, 'nessuno');
  tgScudo.apri({ channel: ch, chatId: '-100500', userId: '3', scad: adesso + 1, ora: adesso });
  tgScudo.chiudi(ch, '-100500', '3', 'passata', 'prova', adesso);
  assert.equal((await C.entrato(conf(ch), entra(3), { telegram: muta })).che, 'scudo');
  assert.ok(!f.nomi().includes('limitaMembro'));
  // chi entra da un link libero passa dal cancello come sempre
  assert.equal((await C.entrato(conf(ch), entra(4), { telegram: muta, attesa: tgAttesa })).che, 'inAttesa');
  // e chi entra mentre lo scudo lo aspettava (lo ha fatto entrare un amministratore) chiude la sua richiesta
  tgScudo.apri({ channel: ch, chatId: '-100500', userId: '5', scad: adesso + 60_000, ora: adesso });
  assert.equal(G.entrato(conf(ch), entra(5), { ora }), true);
  assert.equal(tgScudo.prendi(ch, '-100500', '5').stato, 'dentro');
});

test('il giro legge le scadute tutte insieme: una chiusa nel frattempo non riceve un secondo esito', async () => {
  const ch = canale();
  for (const u of [61, 62]) await G.richiesta(conf(ch), update({ user: u, ucid: u }), deps(finto()));
  adesso += 11 * 60_000;
  const f = finto();
  let fatto = false;
  // mentre il giro dice a Telegram com'e' finita la prima, la seconda persona
  // preme «Non riesco a vederla» (la sua pagina era ancora aperta)
  const rifiuta = f.telegram.rifiutaRichiesta;
  f.telegram.rifiutaRichiesta = async (...a) => {
    if (!fatto) {
      fatto = true;
      const altro = a[2] === '61' ? '62' : '61';
      const r = tgScudo.prendi(ch, '-100500', altro);
      await G.aiuto(conf(ch), { chatId: '-100500', userId: altro, queryId: '', lingua: 'it' }, deps(finto(), { ora: () => r.scad - 1 }));
    }
    return rifiuta(...a);
  };
  await G.giroScadenze((c) => tgConf.get(c), deps(f));
  const esiti = [61, 62].map((u) => tgScudo.prendi(ch, '-100500', String(u)).stato).sort();
  assert.deepEqual(esiti, ['admin', 'bocciata']);
  const qui = f.chiamate.filter((c) => c[0] === 'rifiutaRichiesta' && ['61', '62'].includes(c[3]));
  assert.equal(qui.length, 1, 'chi e\' andato agli amministratori non viene anche rifiutato');
});
