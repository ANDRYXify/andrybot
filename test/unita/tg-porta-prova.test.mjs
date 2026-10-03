// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PROVA SULLA PORTA (docs/TELEGRAM.md, «Una porta sola»): i gesti di
// src/features/tg-scudo-gesti.js per chi preme «Entra» sulla pagina del gruppo,
// con un Telegram finto che scrive ogni chiamata e il database vero in una
// cartella usa e getta. Si prova che:
//  · con lo scudo spento non si apre niente (la porta fa entrare dritti);
//  · nel database c'e' l'impronta del codice della pagina, mai il codice;
//  · le due strade (porta e Telegram) non si scambiano le righe;
//  · chi supera la prova riceve UN link personale (una persona, mezz'ora),
//    anche chiedendolo dieci volte insieme, e nessuna approvazione parte;
//  · un link che Telegram non da' si richiede, e la prova resta superata;
//  · un no non chiama Telegram; «agli amministratori» da' un link con
//    l'approvazione, e la richiesta che ne arriva va in coda, senza pagina;
//  · una pagina lasciata scadere non manda nessuno dagli amministratori;
//  · chi entra dal link personale lo consuma, e il cancello non lo ferma;
//  · un link scaduto non si rifa'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('tg-porta-');
const { tgScudo, tgConf, tgAttesa } = await import('../../src/db.js');
const G = await import('../../src/features/tg-scudo-gesti.js');
const S = await import('../../src/features/tg-scudo.js');
const C = await import('../../src/features/tg-cancello.js');
test.after(() => casa.pulisci());

const TOKEN = '123456:ABCdefGHIjklMNOpqrSTUvwxYZ';
let adesso = Date.UTC(2026, 9, 3, 20);
const ora = () => adesso;
const CHAT = '-100700';

function finto({ rifiuta = {} } = {}) {
  const chiamate = [];
  let n = 0;
  const ok = (nome) => async (...a) => { chiamate.push([nome, ...a]); return rifiuta[nome] ? { ok: false, errore: 'no' } : { ok: true }; };
  return {
    chiamate,
    nomi: () => chiamate.map((c) => c[0]),
    inviti: () => chiamate.filter((c) => c[0] === 'creaInvito'),
    rifiuta,
    telegram: {
      rispondiRichiesta: ok('rispondiRichiesta'), approvaRichiesta: ok('approvaRichiesta'), rifiutaRichiesta: ok('rifiutaRichiesta'),
      mostraVerifica: ok('mostraVerifica'), inviaMessaggio: ok('inviaMessaggio'),
      creaInvito: async (...a) => {
        chiamate.push(['creaInvito', ...a]);
        await new Promise((r) => setTimeout(r, 5));
        return rifiuta.creaInvito ? { ok: false, errore: 'Too Many Requests' } : { ok: true, url: `https://t.me/+porta${++n}`, richiesta: !!a[2]?.richiesta };
      },
    },
  };
}
const prova = { disegnabile: () => true, provaInMovimento: async () => Buffer.from('SBM1') };
let segreti = 0;
const deps = (f, x = {}) => ({ telegram: f.telegram, ora, prova, segreto: () => `segreto-della-pagina-${String(++segreti).padStart(4, '0')}`, ...x });

let giro = 0;
function canale(scudo = {}) {
  const ch = `porta${++giro}`;
  tgConf.set(ch, { token: TOKEN, chatId: CHAT, chatTitolo: 'Il gruppo' });
  tgConf.setInterattivo(ch, true, 'segreto' + giro);
  tgConf.setScudo(ch, S.normScudo({ attivo: true, minuti: 10, domande: [{ testo: 'Due più due?', opzioni: ['3', '4'], giusta: 1 }], ...scudo }));
  return ch;
}
const conf = (ch) => tgConf.get(ch);

// apre una prova sulla porta e ne prende l'immagine: torna chi e', e il codice giusto
async function aperta(ch, f) {
  const n = G.nuovaPorta(conf(ch), { lingua: 'it' }, deps(f));
  assert.equal(n.esito, 'ok');
  const id = G.identificaPorta(conf(ch), n.s, 'it');
  assert.equal((await G.immagine(conf(ch), id, deps(f))).esito, 'ok');
  return { n, id, codice: () => tgScudo.prendi(ch, CHAT, id.userId).codice };
}
const giusto = (codice) => ({ codice, regole: false, risposte: [1], firma: S.firmaDomande(G.scudoDi(conf(canaleUltimo))) });
let canaleUltimo = '';
const supera = async (ch, x, f) => { canaleUltimo = ch; return G.invia(conf(ch), x.id, giusto(x.codice()), deps(f)); };

test('con lo scudo spento non si apre niente: la porta fa entrare dritti', () => {
  const ch = canale({ attivo: false });
  assert.deepEqual(G.nuovaPorta(conf(ch), {}, deps(finto())), { esito: 'spento' });
});

test('nel database c\'e\' l\'impronta del codice della pagina, mai il codice', async () => {
  const ch = canale();
  const f = finto();
  const { n, id } = await aperta(ch, f);
  assert.match(n.s, /^[A-Za-z0-9_-]{20,64}$/);
  const r = tgScudo.prendi(ch, CHAT, id.userId);
  assert.equal(r.via, 'web');
  assert.equal(r.stato, 'attesa');
  assert.equal(r.scad, adesso + 10 * 60_000, 'dura i minuti dello scudo');
  assert.equal(r.tg_user_id, G.chiDellaPorta(n.s));
  assert.ok(!JSON.stringify(r).includes(n.s), 'il codice della pagina non sta da nessuna parte');
  assert.deepEqual(f.nomi(), [], 'aprire e disegnare la prova non chiama Telegram');
});

test('le due strade non si scambiano le righe', async () => {
  const ch = canale();
  const f = finto();
  const { id } = await aperta(ch, f);
  // la stessa riga chiesta come se venisse da Telegram: non e' sua
  const comeTelegram = { ...id, porta: false };
  assert.equal((await G.apri(conf(ch), comeTelegram, {}, deps(f))).esito, 'chiusa');
  // e una richiesta di Telegram non si apre col codice della porta
  tgScudo.apri({ channel: ch, chatId: CHAT, userId: '42', scad: adesso + 60_000, ora: adesso });
  assert.equal((await G.apri(conf(ch), { ok: true, porta: true, userId: '42', chatId: CHAT, lingua: 'it' }, {}, deps(f))).esito, 'chiusa');
  assert.deepEqual(G.identificaPorta(conf(ch), 'corto', 'it'), { ok: false, motivo: 'firma' });
});

test('chi supera la prova riceve UN link personale, anche chiedendolo dieci volte insieme', async () => {
  const ch = canale();
  const f = finto();
  const x = await aperta(ch, f);
  const r = await supera(ch, x, f);
  assert.equal(r.esito, 'dentro');
  assert.match(r.url, /^https:\/\/t\.me\/\+porta/);
  const [, tok, chat, opz] = f.inviti()[0];
  assert.equal(tok, TOKEN);
  assert.equal(chat, CHAT);
  assert.equal(opz.persone, 1, 'una persona');
  assert.ok(!opz.richiesta, 'si entra senza chiedere');
  assert.equal(opz.scade, (adesso + S.VITA_LINK_PORTA) / 1000, 'mezz\'ora');
  const tutti = await Promise.all(Array.from({ length: 10 }, () => G.link(conf(ch), x.id, deps(f))));
  assert.ok(tutti.every((t) => t.esito === 'dentro' && t.url === r.url), 'sempre lo stesso link');
  assert.equal(f.inviti().length, 1, 'fatto una volta sola');
  assert.ok(!f.nomi().some((n) => /Richiesta/.test(n)), 'nessuna approvazione: non c\'e\' una richiesta');
  const riga = tgScudo.prendi(ch, CHAT, x.id.userId);
  assert.deepEqual([riga.stato, riga.invito, riga.scad], ['passata', r.url, adesso + S.VITA_LINK_PORTA]);
});

test('un link che Telegram non da\' si richiede, e la prova resta superata', async () => {
  const ch = canale();
  const f = finto({ rifiuta: { creaInvito: true } });
  const x = await aperta(ch, f);
  const r = await supera(ch, x, f);
  assert.deepEqual(r, { esito: 'dentro', url: '' });
  assert.equal(tgScudo.prendi(ch, CHAT, x.id.userId).stato, 'passata', 'non diventa un errore');
  // la pagina lo richiede, anche dieci volte insieme: il link si fa una volta.
  // (Fatti in parallelo, dieci link validi per una persona ciascuno sarebbero
  // dieci ingressi per una prova sola, anche se qui se ne salva uno.)
  f.rifiuta.creaInvito = false;
  const tutti = await Promise.all(Array.from({ length: 10 }, () => G.link(conf(ch), x.id, deps(f))));
  assert.ok(tutti.every((l) => l.esito === 'dentro' && l.url === tutti[0].url));
  assert.match(tutti[0].url, /^https:\/\/t\.me\/\+porta/);
  assert.equal(f.inviti().length, 2, 'quello che Telegram non ha dato, e uno solo dopo');
});

test('un no non chiama Telegram', async () => {
  const ch = canale();
  const f = finto();
  const x = await aperta(ch, f);
  canaleUltimo = ch;
  const r = await G.invia(conf(ch), x.id, { ...giusto(x.codice()), risposte: [0] }, deps(f));
  assert.deepEqual(r, { esito: 'no' });
  assert.deepEqual(f.nomi(), []);
  assert.equal((await G.link(conf(ch), x.id, deps(f))).esito, 'no', 'e un no non ha un link');
});

test('«agli amministratori» da\' un link con l\'approvazione; la richiesta che ne arriva va in coda, senza pagina', async () => {
  const ch = canale({ no: 'admin' });
  const f = finto();
  const x = await aperta(ch, f);
  canaleUltimo = ch;
  const r = await G.invia(conf(ch), x.id, { ...giusto(x.codice()), risposte: [0] }, deps(f));
  assert.equal(r.esito, 'admin');
  const opz = f.inviti()[0][3];
  assert.equal(opz.richiesta, true);
  assert.ok(!opz.persone, 'Telegram non accetta un tetto su un link con approvazione');
  // la richiesta arriva da quel link, col guardiano
  const u = { chat_join_request: { chat: { id: Number(CHAT), type: 'supergroup', title: 'Il gruppo' }, from: { id: 77, first_name: 'Bea' }, user_chat_id: 77, query_id: 'q7', date: 1, invite_link: { invite_link: r.url } } };
  const q = await G.richiesta(conf(ch), u, deps(f));
  assert.equal(q.che, 'admin');
  assert.ok(!f.nomi().includes('mostraVerifica') && !f.nomi().includes('inviaMessaggio'), 'niente pagina: decidono loro');
  assert.deepEqual(f.chiamate.at(-1).slice(0, 4), ['rispondiRichiesta', TOKEN, 'q7', 'queue']);
  assert.deepEqual([tgScudo.prendi(ch, CHAT, '77').stato, tgScudo.prendi(ch, CHAT, '77').motivo], ['admin', 'porta']);
  // «Non riesco a vederla» fa lo stesso
  const y = await aperta(ch, f);
  const a = await G.aiuto(conf(ch), y.id, deps(f));
  assert.equal(a.esito, 'admin');
  assert.equal(f.inviti().at(-1)[3].richiesta, true);
});

test('una pagina lasciata scadere non manda nessuno dagli amministratori', async () => {
  const ch = canale({ no: 'admin' });
  const f = finto();
  const x = await aperta(ch, f);
  adesso += 11 * 60_000;
  const n = await G.giroScadenze((c) => tgConf.get(c), deps(f));
  assert.ok(n >= 1);
  const r = tgScudo.prendi(ch, CHAT, x.id.userId);
  assert.deepEqual([r.stato, r.motivo, r.invito], ['bocciata', 'scaduta', '']);
  // (le chiamate di questo giro sono anche delle richieste di Telegram di altre
  // prove, scadute insieme: qui conta che nessuna sia per la prova della porta)
  assert.ok(!f.chiamate.some((c) => c[0] === 'creaInvito' || c.some((a) => String(a).startsWith('w:'))), 'nessun link, nessuna chiamata per lei');
  assert.equal((await G.apri(conf(ch), x.id, {}, deps(f))).esito, 'scaduta');
  // e una prova scaduta non si rianima con «link»
  assert.equal((await G.link(conf(ch), x.id, deps(f))).esito, 'scaduta');
});

test('chi entra dal link personale lo consuma, e il cancello non lo ferma', async () => {
  const ch = canale();
  tgConf.setIngresso(ch, { attivo: true });
  const f = finto();
  const x = await aperta(ch, f);
  const r = await supera(ch, x, f);
  const entra = (user, link) => ({ chat_member: { chat: { id: Number(CHAT), type: 'supergroup', title: 'Il gruppo' }, old_chat_member: { status: 'left' }, new_chat_member: { status: 'member', user: { id: user, first_name: 'Ada' } }, invite_link: { invite_link: link } } });
  assert.equal(G.entrato(conf(ch), entra(88, r.url), deps(f)), true);
  assert.equal(tgScudo.prendi(ch, CHAT, x.id.userId).stato, 'dentro', 'la prova e\' usata');
  assert.deepEqual([tgScudo.prendi(ch, CHAT, '88').stato, tgScudo.prendi(ch, CHAT, '88').motivo], ['dentro', 'porta']);
  const muta = { ...f.telegram, infoChat: async () => ({ ok: true, chat: { permissions: { can_send_messages: true } } }), limitaMembro: async () => { f.chiamate.push(['limitaMembro']); return { ok: true }; } };
  assert.equal((await C.entrato(conf(ch), entra(88, r.url), { telegram: muta, attesa: tgAttesa })).che, 'scudo');
  assert.ok(!f.nomi().includes('limitaMembro'), 'gia\' passata da una porta: niente tasto');
  // un link usato non si rifa', e la pagina lo dice
  assert.equal((await G.link(conf(ch), x.id, deps(f))).esito, 'usata');
  assert.equal(f.inviti().length, 1);
  // e un secondo ingresso dallo stesso link (non succede: vale per una persona) non e' «passato»
  assert.equal(G.entrato(conf(ch), entra(89, r.url), deps(f)), false);
  assert.equal(tgScudo.prendi(ch, CHAT, '89'), null);
});

test('se il gruppo chiede l\'approvazione a tutti, il link personale si approva una volta sola', async () => {
  const ch = canale();
  const f = finto();
  const x = await aperta(ch, f);
  const r = await supera(ch, x, f);
  const chiede = (user) => ({ chat_join_request: { chat: { id: Number(CHAT), type: 'supergroup', title: 'Il gruppo' }, from: { id: user, first_name: 'Ada' }, user_chat_id: user, date: 1, invite_link: { invite_link: r.url } } });
  assert.equal((await G.richiesta(conf(ch), chiede(90), deps(f))).che, 'porta');
  assert.deepEqual(f.chiamate.at(-1).slice(0, 4), ['approvaRichiesta', TOKEN, CHAT, '90']);
  assert.equal(tgScudo.prendi(ch, CHAT, '90').stato, 'passata');
  // un secondo dallo stesso link fa la strada di tutti: la pagina
  assert.equal((await G.richiesta(conf(ch), chiede(91), deps(f))).che, 'privato');
});

test('un link scaduto non si rifa\': si rifa\' la prova', async () => {
  const ch = canale();
  const f = finto();
  const x = await aperta(ch, f);
  await supera(ch, x, f);
  adesso += S.VITA_LINK_PORTA + 1000;
  assert.equal((await G.link(conf(ch), x.id, deps(f))).esito, 'scaduta');
  assert.equal(f.inviti().length, 1);
});

test('nel pannello si vedono le prove che hanno detto qualcosa, non quelle lasciate a meta\'', async () => {
  const ch = canale();
  const f = finto();
  await aperta(ch, f); // lasciata li'
  const x = await aperta(ch, f);
  await supera(ch, x, f);
  const viste = tgScudo.recenti(ch);
  assert.equal(viste.length, 1);
  assert.deepEqual([viste[0].via, viste[0].stato], ['web', 'passata']);
  assert.equal(tgScudo.inAttesa(ch), 0, 'una prova aperta sulla porta non e\' una richiesta in attesa');
});
