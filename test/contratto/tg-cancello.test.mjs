// L'ORDINE DEI GESTI del cancello, provato con un Telegram finto.
//
// Qui non si guarda il testo del file: si fa succedere la cosa e si guarda cosa
// e' successo davvero, in che ordine. E' l'unico modo per cui la regola «se non
// riesco a scrivere il benvenuto, ridai subito i permessi» e' una regola e non
// una buona intenzione scritta in un commento.
import test from 'node:test';
import assert from 'node:assert/strict';
import { entrato, premuto, giroScadenze, acceso } from '../../src/features/tg-cancello.js';
import { MUTO, datoTasto } from '../../src/features/tg-ingresso.js';

const PERM = { can_send_messages: true, can_send_photos: true };

function finto({ scriviOk = true, limitaOk = true, chat = { permissions: PERM } } = {}) {
  const fatti = [];
  return {
    fatti,
    telegram: {
      async infoChat() { fatti.push(['infoChat']); return { ok: true, chat }; },
      async limitaMembro(_t, _c, u, p) { fatti.push(['limita', u, p === MUTO ? 'muto' : 'permessi']); return limitaOk ? { ok: true } : { ok: false, errore: 'non sono admin' }; },
      async inviaMessaggio() { fatti.push(['scrivi']); return scriviOk ? { ok: true, result: { message_id: 42 } } : { ok: false, errore: 'non posso scrivere' }; },
      async eliminaMessaggio(_t, _c, m) { fatti.push(['elimina', String(m)]); return { ok: true }; },
      async rispondiTasto(_t, id, testo) { fatti.push(['rispondi', testo]); return { ok: true }; },
      async cacciaMembro(_t, _c, u) { fatti.push(['caccia', u]); return { ok: true }; },
    },
  };
}

function attesaFinta(righe = []) {
  const m = new Map(righe.map((r) => [`${r.channel}|${r.chat_id}|${r.tg_user_id}`, r]));
  return {
    dentro: m,
    metti({ channel, chatId, userId, nome, msgId, scad }) {
      m.set(`${channel}|${chatId}|${userId}`, { channel, chat_id: chatId, tg_user_id: userId, nome, msg_id: msgId, scad });
    },
    prendi(ch, c, u) { return m.get(`${ch}|${c}|${u}`) || null; },
    togli(ch, c, u) { m.delete(`${ch}|${c}|${u}`); },
    scaduti() { return [...m.values()]; },
    quanti() { return m.size; },
  };
}

const CONF = { channel: 'andryx', token: 'T', ingresso: 1, interattivo: 1, ingresso_minuti: 5, ingresso_scaduto: 'caccia' };
const ENTRA = {
  chat_member: {
    chat: { id: -100, type: 'supergroup', title: 'gruppo' },
    old_chat_member: { status: 'left', user: { id: 7 } },
    new_chat_member: { status: 'member', user: { id: 7, first_name: 'Ada' } },
  },
};

test('chi entra viene silenziato, poi gli si scrive, poi si segna l\'attesa', async () => {
  const f = finto();
  const attesa = attesaFinta();
  const r = await entrato(CONF, ENTRA, { telegram: f.telegram, attesa });
  assert.equal(r.che, 'inAttesa');
  assert.deepEqual(f.fatti.map((x) => x[0]), ['infoChat', 'limita', 'scrivi'], 'prima si guardano i permessi, poi si mette muto, poi si scrive');
  assert.equal(f.fatti[1][2], 'muto');
  assert.equal(attesa.quanti(), 1, 'l\'attesa si segna solo dopo che il messaggio e\' partito');
  assert.equal(attesa.prendi('andryx', '-100', '7').msg_id, '42', 'con dentro il messaggio da cancellare dopo');
});

test('se il benvenuto non parte, i permessi tornano SUBITO indietro', async () => {
  const f = finto({ scriviOk: false });
  const attesa = attesaFinta();
  const r = await entrato(CONF, ENTRA, { telegram: f.telegram, attesa });
  assert.equal(r.che, 'nonScrivo');
  const limitate = f.fatti.filter((x) => x[0] === 'limita');
  assert.equal(limitate.length, 2, 'due volte: muto, e poi di nuovo i permessi del gruppo');
  assert.equal(limitate[0][2], 'muto');
  assert.equal(limitate[1][2], 'permessi', 'gli si ridanno i permessi DEL GRUPPO');
  assert.equal(attesa.quanti(), 0, 'e non resta nessuna attesa appesa');
});

test('senza i permessi del gruppo non si silenzia nessuno', async () => {
  const f = finto({ chat: {} });
  const attesa = attesaFinta();
  const r = await entrato(CONF, ENTRA, { telegram: f.telegram, attesa });
  assert.equal(r.che, 'senzaPermessi');
  assert.equal(f.fatti.filter((x) => x[0] === 'limita').length, 0, 'non si toglie la parola a chi non si saprebbe come ridargliela');
  assert.equal(attesa.quanti(), 0);
});

test('se non riesco a limitare, non scrivo niente e non prometto niente', async () => {
  const f = finto({ limitaOk: false });
  const attesa = attesaFinta();
  const r = await entrato(CONF, ENTRA, { telegram: f.telegram, attesa });
  assert.equal(r.che, 'nonPosso');
  assert.equal(f.fatti.filter((x) => x[0] === 'scrivi').length, 0, 'niente messaggio col tasto per un cancello che non c\'e\'');
  assert.equal(attesa.quanti(), 0);
});

test('col cancello spento non succede niente', async () => {
  const f = finto();
  const attesa = attesaFinta();
  assert.equal(acceso({ ...CONF, ingresso: 0 }), false);
  assert.equal((await entrato({ ...CONF, ingresso: 0 }, ENTRA, { telegram: f.telegram, attesa })).che, 'spento');
  assert.equal((await entrato({ ...CONF, interattivo: 0 }, ENTRA, { telegram: f.telegram, attesa })).che, 'spento');
  assert.equal(f.fatti.length, 0);
});

const CQ = (extra = {}) => ({ id: 'cb1', data: datoTasto('7'), from: { id: 7 }, message: { chat: { id: -100 } }, ...extra });

test('chi preme il suo tasto riprende i permessi del gruppo, e il messaggio sparisce', async () => {
  const f = finto();
  const attesa = attesaFinta([{ channel: 'andryx', chat_id: '-100', tg_user_id: '7', msg_id: '42' }]);
  const r = await premuto(CONF, CQ(), { telegram: f.telegram, attesa });
  assert.equal(r.che, 'aperto');
  const nomi = f.fatti.map((x) => x[0]);
  assert.equal(nomi[0], 'rispondi', 'la risposta al tasto viene PRIMA di tutto il resto');
  assert.ok(nomi.includes('limita'));
  assert.equal(f.fatti.find((x) => x[0] === 'limita')[2], 'permessi');
  assert.ok(nomi.includes('elimina'));
  assert.equal(attesa.quanti(), 0);
});

test('si risponde al tasto anche quando non si fa niente', async () => {
  for (const [cq, righe] of [
    [CQ({ from: { id: 9 } }), [{ channel: 'andryx', chat_id: '-100', tg_user_id: '7', msg_id: '42' }]],
    [CQ(), []],
  ]) {
    const f = finto();
    const r = await premuto(CONF, cq, { telegram: f.telegram, attesa: attesaFinta(righe) });
    assert.notEqual(r.che, 'aperto');
    const risposte = f.fatti.filter((x) => x[0] === 'rispondi');
    assert.equal(risposte.length, 1, `nessuna risposta per ${r.che}`);
    assert.ok(risposte[0][1].length > 3, 'e la risposta dice qualcosa');
  }
});

test('un tasto che non e\' nostro non ci riguarda', async () => {
  const f = finto();
  const r = await premuto(CONF, CQ({ data: 'altro-bot:qualcosa' }), { telegram: f.telegram, attesa: attesaFinta() });
  assert.equal(r.che, 'altrui');
  assert.equal(f.fatti.length, 0, 'non si risponde a un tasto di qualcun altro: non e\' nostro da rispondere');
});

test('chi non risponde in tempo: si caccia, o resta muto', async () => {
  const riga = { channel: 'andryx', chat_id: '-100', tg_user_id: '7', msg_id: '42', scad: 1 };
  const f = finto();
  const attesa = attesaFinta([{ ...riga }]);
  await giroScadenze(() => CONF, 1000, { telegram: f.telegram, attesa });
  assert.deepEqual(f.fatti.map((x) => x[0]), ['elimina', 'caccia']);
  assert.equal(attesa.quanti(), 0);

  const f2 = finto();
  const attesa2 = attesaFinta([{ ...riga }]);
  await giroScadenze(() => ({ ...CONF, ingresso_scaduto: 'muto' }), 1000, { telegram: f2.telegram, attesa: attesa2 });
  assert.deepEqual(f2.fatti.map((x) => x[0]), ['elimina'], 'muto vuol dire lasciarlo com\'e\': era gia\' muto');
  assert.equal(attesa2.quanti(), 0);
});

test('una scadenza di un canale che non c\'e\' piu\' non resta li\' per sempre', async () => {
  const f = finto();
  const attesa = attesaFinta([{ channel: 'sparito', chat_id: '-100', tg_user_id: '7', msg_id: '42', scad: 1 }]);
  await giroScadenze(() => null, 1000, { telegram: f.telegram, attesa });
  assert.equal(attesa.quanti(), 0, 'la riga si toglie comunque, se no ci si riprova all\'infinito');
  assert.equal(f.fatti.length, 0);
});

// Il modo in cui questa cosa puo' non funzionare senza che nessuno se ne accorga
// e' uno solo: Telegram manda SOLO cio' che gli si chiede, e la lista sostituisce
// la precedente. Un tipo di update non elencato non arriva mai, e non arriva
// nemmeno un errore. Per questo qui la lista e' un patto scritto.
import { readFileSync } from 'node:fs';
import { UPDATE_VOLUTI } from '../../src/features/telegram.js';

test('Telegram deve sapere che vogliamo chi entra e chi preme', () => {
  for (const k of ['message', 'callback_query', 'chat_member']) {
    assert.ok(UPDATE_VOLUTI.includes(k), `manca «${k}»: quell'update non arriverebbe mai, e in silenzio`);
  }
  const TG = readFileSync('src/features/telegram.js', 'utf8');
  assert.match(TG, /allowed_updates: UPDATE_VOLUTI/, 'la lista che si manda a Telegram e\' quella, non una copia');
});

test('chi entra e chi preme passano prima della strada dei messaggi', () => {
  const SRV = readFileSync('src/web/server.js', 'utf8');
  const i = SRV.indexOf("app.post('/tg/:secret'");
  assert.ok(i > 0, 'il webhook c\'e\'');
  const corpo = SRV.slice(i, i + 4000);
  const iCancello = corpo.indexOf('req.body?.chat_member');
  const iTasto = corpo.indexOf('req.body?.callback_query');
  const iMsg = corpo.indexOf('req.body?.message');
  assert.ok(iCancello > 0 && iTasto > 0, 'il webhook li guarda');
  assert.ok(iCancello < iMsg && iTasto < iMsg, 'prima di tutti i controlli che riguardano i messaggi');
});
