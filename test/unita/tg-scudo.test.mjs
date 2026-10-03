// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO SCUDO ALL'INGRESSO, la regola (docs/TELEGRAM.md, «Lo scudo all'ingresso»):
//  · nessuno passa se la pagina non dice «passa», e «passa» vuol dire prova
//    giusta, regole accettate, risposte giuste, domande quelle viste;
//  · i tentativi per prova sono tre per davvero, le prove tre;
//  · una richiesta portata a un guardiano si risponde sempre;
//  · chi e' stato rifiutato da poco e' rifiutato di nuovo, senza pagina;
//  · le risposte giuste non escono verso la pagina;
//  · i colori della prova non la rendono mai illeggibile.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../../src/features/tg-scudo.js';

const ORA = Date.UTC(2026, 9, 3, 18);
const D = [
  { testo: 'Come si chiama il canale?', opzioni: ['Andryx', 'Altro', ''], giusta: 0 },
  { testo: 'Quanto fa due più due?', opzioni: ['3', '4'], giusta: 1 },
];
const scudo = (x = {}) => S.normScudo({ attivo: true, regole: { attivo: true, testo: 'Niente spam.' }, domande: D, ...x });
const riga = (x = {}) => ({ stato: 'attesa', codice: 'HN6TX', tentativi: 0, immagini: 1, scad: ORA + 60_000, ...x });
const invio = (x = {}) => ({ riga: riga(), scudo: scudo(), regoleOk: true, codice: 'hn6tx', risposte: [0, 1], firma: S.firmaDomande(scudo()), ora: ORA, ...x });

test('le impostazioni si puliscono: tempi nei limiti, domande che reggono, regole vuote spente', () => {
  const s = S.normScudo({ attivo: 1, minuti: 999, no: 'boh', regole: { attivo: true, testo: '   ' }, domande: [
    { testo: 'Buona', opzioni: ['a', '', 'b'], giusta: 2 },
    { testo: '', opzioni: ['a', 'b'], giusta: 0 },
    { testo: 'Una voce sola', opzioni: ['a', ''], giusta: 0 },
    { testo: 'Giusta vuota', opzioni: ['a', 'b', ''], giusta: 2 },
    { testo: 'Quarta', opzioni: ['x', 'y'], giusta: 0 },
  ] });
  assert.equal(s.attivo, true);
  assert.equal(s.minuti, S.MINUTI_MAX);
  assert.equal(s.no, 'rifiuta');
  assert.equal(s.regole.attivo, false, 'regole senza testo: spente');
  assert.deepEqual(s.domande.map((d) => d.testo), ['Buona', 'Quarta']);
  assert.deepEqual(s.domande[0], { testo: 'Buona', opzioni: ['a', 'b'], giusta: 1 }, 'la voce giusta segue le vuote tolte');
  assert.equal(S.normScudo({ minuti: 0 }).minuti, S.MINUTI_DEF);
  assert.equal(S.normScudo({ minuti: 1 }).minuti, S.MINUTI_MIN);
  assert.equal(S.normScudo({ domande: Array.from({ length: 6 }, () => D[1]) }).domande.length, S.LIMITI.domande);
});

test('alla pagina vanno le domande e le voci, mai quale e\' giusta', () => {
  const p = S.domandePubbliche(scudo());
  assert.deepEqual(p, [{ testo: D[0].testo, opzioni: ['Andryx', 'Altro'] }, { testo: D[1].testo, opzioni: ['3', '4'] }]);
  assert.ok(!JSON.stringify(p).includes('giusta'));
});

test('l\'impronta cambia con le domande e le risposte giuste, non coi colori', () => {
  const a = S.firmaDomande(scudo());
  assert.notEqual(a, S.firmaDomande(scudo({ domande: [D[0], { ...D[1], giusta: 0 }] })));
  assert.notEqual(a, S.firmaDomande(scudo({ domande: [D[0]] })));
  assert.equal(a, S.firmaDomande(scudo({ colori: { modo: 'miei', punti: '#000000', fondo: '#ffffff' } })));
});

test('chi chiede: dalla richiesta, senza la bio', () => {
  const u = { chat_join_request: { chat: { id: -100123, type: 'supergroup', title: 'Il gruppo' }, from: { id: 42, first_name: 'Ada', language_code: 'en-US' }, user_chat_id: 42, bio: 'segreto', query_id: 'q1' } };
  const c = S.chiChiede(u);
  assert.deepEqual(c, { chatId: '-100123', gruppo: true, titolo: 'Il gruppo', userId: '42', nome: 'Ada', lingua: 'en', userChatId: '42', queryId: 'q1', link: '' });
  assert.ok(!JSON.stringify(c).includes('segreto'));
  // il link da cui ha chiesto: uno della porta dice com'e' gia' andata
  assert.equal(S.chiChiede({ chat_join_request: { ...u.chat_join_request, invite_link: { invite_link: 'https://t.me/+abc', name: 'x' } } }).link, 'https://t.me/+abc');
  assert.equal(S.chiChiede({ chat_join_request: { chat: { id: 1, type: 'channel' }, from: { id: 2 } } }).gruppo, false);
  assert.equal(S.chiChiede({}), null);
});

test('cosa fare di una richiesta: un guardiano ha sempre una risposta', () => {
  const g = { gruppo: true, queryId: 'q', userChatId: '7' };
  const p = { gruppo: true, queryId: '', userChatId: '7' };
  assert.equal(S.azioneRichiesta({ acceso: true, chi: g }), 'guardiano');
  assert.equal(S.azioneRichiesta({ acceso: false, chi: g }), 'coda', 'scudo spento: agli amministratori, come senza bot');
  assert.equal(S.azioneRichiesta({ acceso: true, chi: { ...g, gruppo: false } }), 'coda');
  assert.equal(S.azioneRichiesta({ acceso: true, chi: p }), 'privato');
  assert.equal(S.azioneRichiesta({ acceso: false, chi: p }), 'niente');
  assert.equal(S.azioneRichiesta({ acceso: true, chi: { ...p, userChatId: '' } }), 'niente');
  assert.equal(S.azioneRichiesta({ acceso: true, chi: null }), 'niente');
});

test('chi e\' stato rifiutato da poco e\' rifiutato di nuovo, senza pagina', () => {
  const g = { gruppo: true, queryId: 'q', userChatId: '7' };
  const prima = { stato: 'bocciata', fine: ORA - S.ATTESA_DOPO_NO + 1000 };
  assert.equal(S.azioneRichiesta({ acceso: true, chi: g, prima, ora: ORA }), 'rifiuta');
  assert.equal(S.azioneRichiesta({ acceso: true, chi: { ...g, queryId: '' }, prima, ora: ORA }), 'rifiuta');
  assert.equal(S.azioneRichiesta({ acceso: true, chi: g, prima: { ...prima, fine: ORA - S.ATTESA_DOPO_NO - 1 }, ora: ORA }), 'guardiano');
  assert.equal(S.azioneRichiesta({ acceso: true, chi: g, prima: { ...prima, stato: 'admin' }, ora: ORA }), 'guardiano', 'chi e\' andato agli amministratori non e\' rifiutato');
  assert.equal(S.azioneRichiesta({ acceso: false, chi: g, prima, ora: ORA }), 'coda', 'scudo spento: non decide lo scudo');
});

test('il codice: lettere che non si confondono, lunghezza fissa, confronto senza maiuscole e spazi', () => {
  let i = 0;
  const caso = (a, b) => (i++ * 7) % (b - a) + a;
  const c = S.codiceNuovo(caso);
  assert.equal(c.length, S.LUNGHEZZA);
  assert.ok([...c].every((x) => S.ALFABETO.includes(x)));
  for (const x of '0O1IL5S2Z8BDQG') assert.ok(!S.ALFABETO.includes(x), `${x} non c'e'`);
  for (let k = 0; k < 200; k++) assert.ok([...S.codiceNuovo()].every((x) => S.ALFABETO.includes(x)));
  assert.equal(S.confronta(' hn6 tx ', 'HN6TX'), true);
  assert.equal(S.confronta('HN6T', 'HN6TX'), false);
  assert.equal(S.confronta('HN6TXX', 'HN6TX'), false);
  assert.equal(S.confronta('', ''), false, 'nessun codice: niente e\' giusto');
});

test('l\'invio: l\'ordine dei controlli e i tentativi contati', () => {
  assert.equal(S.esitoInvio(invio({ riga: null })).esito, 'chiusa');
  assert.equal(S.esitoInvio(invio({ riga: riga({ stato: 'passata' }) })).esito, 'chiusa');
  assert.equal(S.esitoInvio(invio({ ora: ORA + 61_000 })).esito, 'scaduta');
  assert.equal(S.esitoInvio(invio({ firma: 'vecchia' })).esito, 'cambiato');
  assert.equal(S.esitoInvio(invio({ regoleOk: false })).esito, 'regole');
  assert.equal(S.esitoInvio(invio({ regoleOk: false, scudo: scudo({ regole: { attivo: false, testo: 'x' } }), firma: S.firmaDomande(scudo()) })).esito, 'passa', 'regole spente: non si chiedono');
  assert.equal(S.esitoInvio(invio({ riga: riga({ codice: '', immagini: 1 }) })).esito, 'immagine');
  assert.deepEqual(S.esitoInvio(invio({ codice: 'XXXXX' })), { esito: 'riprova', tentativi: 1, restano: 2 });
  assert.deepEqual(S.esitoInvio(invio({ codice: 'XXXXX', riga: riga({ tentativi: 1 }) })), { esito: 'riprova', tentativi: 2, restano: 1 });
  assert.deepEqual(S.esitoInvio(invio({ codice: 'XXXXX', riga: riga({ tentativi: 2 }) })), { esito: 'nuova', tentativi: 3 });
  assert.deepEqual(S.esitoInvio(invio({ codice: 'XXXXX', riga: riga({ tentativi: 2, immagini: S.IMMAGINI }) })), { esito: 'no', motivo: 'prova', tentativi: 3 });
  assert.deepEqual(S.esitoInvio(invio({ riga: riga({ codice: '', immagini: S.IMMAGINI }) })), { esito: 'no', motivo: 'prova' }, 'prove finite');
  assert.deepEqual(S.esitoInvio(invio({ risposte: [0, 0] })), { esito: 'no', motivo: 'domande' });
  assert.deepEqual(S.esitoInvio(invio({ risposte: [0] })), { esito: 'no', motivo: 'domande' }, 'una risposta mancante e\' sbagliata');
  assert.deepEqual(S.esitoInvio(invio()), { esito: 'passa' });
});

test('«passa» solo con tutto giusto: nessuna combinazione storta apre', () => {
  const s = scudo();
  const firma = S.firmaDomande(s);
  const codici = ['HN6TX', 'hn6tx', 'XXXXX', '', 'HN6T', null];
  const risposte = [[0, 1], [1, 1], [0, 0], [], [0], ['0', '1'], null];
  const righe = [riga(), riga({ codice: '' }), riga({ stato: 'bocciata' }), riga({ tentativi: 5 }), riga({ scad: ORA - 1 })];
  let passa = 0;
  for (const r of righe) for (const codice of codici) for (const rs of risposte) for (const regoleOk of [true, false]) for (const f of [firma, 'x']) {
    const e = S.esitoInvio({ riga: r, scudo: s, regoleOk, codice, risposte: rs, firma: f, ora: ORA });
    if (e.esito !== 'passa') continue;
    passa++;
    assert.ok(r.stato === 'attesa' && r.scad > ORA && f === firma && regoleOk && S.confronta(codice, r.codice), 'passa solo con tutto giusto');
    assert.deepEqual(rs.map(Number), [0, 1]);
  }
  assert.ok(passa > 0, 'e con tutto giusto si passa');
});

test('un «no»: rifiuto o amministratori; chi chiede aiuto va sempre agli amministratori', () => {
  assert.equal(S.decisioneNo(scudo(), 'prova'), 'rifiuta');
  assert.equal(S.decisioneNo(scudo({ no: 'admin' }), 'domande'), 'admin');
  assert.equal(S.decisioneNo(scudo(), 'aiuto'), 'admin');
  assert.equal(S.decisioneNo(scudo(), 'scaduta'), 'rifiuta');
});

test('cosa serve: il primo guaio grave blocca, il guardiano no', () => {
  const tutto = { https: true, interattivo: true, gruppo: true, admin: true, invitare: true, disegnabile: true, richieste: true, guardiano: true, pubblico: false, approvazione: false };
  assert.deepEqual(S.controlli(tutto).blocco, '');
  assert.equal(S.controlli(tutto).modo, 'guardiano');
  assert.equal(S.controlli({ ...tutto, guardiano: false }).modo, 'privato');
  assert.equal(S.controlli({ ...tutto, guardiano: false }).blocco, '', 'senza guardiano si lavora in privato');
  for (const k of ['https', 'interattivo', 'gruppo', 'admin', 'invitare']) assert.equal(S.controlli({ ...tutto, [k]: false }).blocco, k);
  assert.equal(S.controlli({ ...tutto, disegnabile: false }).blocco, 'prova');
  const porta = S.controlli({ ...tutto, pubblico: true, approvazione: false }).lista.find((x) => x.k === 'porta');
  assert.equal(porta.ok, false, 'un gruppo pubblico senza approvazione si dice');
  assert.equal(S.controlli({ ...tutto, pubblico: true, approvazione: false }).blocco, '');
});

test('i colori della prova: i tuoi se si leggono, se no quelli della pagina, se no inchiostro su carta', () => {
  const pagina = { testo: '#f4f2f8', bg: '#0f0d14' };
  assert.deepEqual(S.coloriProva(scudo({ colori: { modo: 'miei', punti: '#ffd400', fondo: '#1b1030' } }), pagina), { punti: '#ffd400', fondo: '#1b1030', da: 'miei' });
  assert.equal(S.coloriProva(scudo({ colori: { modo: 'miei', punti: '#777777', fondo: '#888888' } }), pagina).da, 'pagina', 'due grigi vicini non bastano');
  assert.deepEqual(S.coloriProva(scudo(), pagina), { punti: '#f4f2f8', fondo: '#0f0d14', da: 'pagina' });
  assert.equal(S.coloriProva(scudo(), { testo: '#777777', bg: '#808080' }).da, 'serie');
  assert.equal(S.coloriProva(scudo(), { testo: 'rgba(1,2,3,.5)', bg: '#000000' }).da, 'serie');
  assert.ok(S.contrasto(S.PROVA_DI_SERIE.punti, S.PROVA_DI_SERIE.fondo) >= S.CONTRASTO_PROVA);
  assert.ok(Math.abs(S.contrasto('#000000', '#ffffff') - 21) < 1e-9);
});

test('la lingua: quella di Telegram se e\' una delle tre, se no quella del canale', () => {
  assert.equal(S.linguaDi('es-ES', 'it'), 'es');
  assert.equal(S.linguaDi('de', 'en'), 'en');
  assert.equal(S.linguaDi('', ''), 'it');
});
