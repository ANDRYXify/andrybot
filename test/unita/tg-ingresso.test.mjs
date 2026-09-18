// IL CANCELLO DEL GRUPPO, provato senza gruppo e senza rete.
//
// Qui si tiene ferma la forma: chi passa dal cancello, chi no, cosa si risponde
// a chi preme, e quali permessi tornano indietro. Le tre regole che contano sono
// tre prove, non tre buone intenzioni.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chiEntra, datoTasto, leggiTasto, tastiera, testoBenvenuto, permessiDi, MUTO,
  guai, modoScaduto, esitoTasto, inMinuti, MINUTI_MIN, MINUTI_MAX, TESTO_DEF,
} from '../../src/features/tg-ingresso.js';

const entrata = (extra = {}) => ({
  chat_member: {
    chat: { id: -100123, type: 'supergroup', title: 'Il gruppo' },
    old_chat_member: { status: 'left', user: { id: 7 } },
    new_chat_member: { status: 'member', user: { id: 7, first_name: 'Ada', username: 'ada' } },
    ...extra,
  },
});

test('entra chi va da fuori a dentro, e nessun altro', () => {
  const e = chiEntra(entrata());
  assert.equal(e.userId, '7');
  assert.equal(e.chatId, '-100123');
  assert.equal(e.nome, 'Ada');

  // il cancello stesso, un istante dopo, lo mette muto: quella e' una
  // transizione member → restricted, e NON deve rifar partire il cancello
  assert.equal(chiEntra(entrata({
    old_chat_member: { status: 'member', user: { id: 7 } },
    new_chat_member: { status: 'restricted', user: { id: 7 } },
  })), null, 'mutarlo non e\' entrare di nuovo');

  // e nemmeno uno che viene promosso, o che se ne va
  assert.equal(chiEntra(entrata({
    old_chat_member: { status: 'member', user: { id: 7 } },
    new_chat_member: { status: 'administrator', user: { id: 7 } },
  })), null);
  assert.equal(chiEntra(entrata({
    old_chat_member: { status: 'member', user: { id: 7 } },
    new_chat_member: { status: 'left', user: { id: 7 } },
  })), null);
});

test('i bot, i canali e le chat private non passano dal cancello', () => {
  assert.equal(chiEntra(entrata({
    new_chat_member: { status: 'member', user: { id: 9, is_bot: true, first_name: 'robo' } },
  })), null, 'un bot non deve dimostrare di non essere un bot');
  assert.equal(chiEntra(entrata({ chat: { id: -5, type: 'channel', title: 'canale' } })), null);
  assert.equal(chiEntra(entrata({ chat: { id: 5, type: 'private' } })), null);
  assert.equal(chiEntra({}), null);
  assert.equal(chiEntra(null), null);
});

test('il tasto porta con se\' di chi e\'', () => {
  const d = datoTasto('7');
  assert.equal(leggiTasto(d), '7');
  assert.equal(leggiTasto('altro'), '', 'un dato che non e\' nostro non diventa un id');
  assert.equal(leggiTasto(''), '');
  const t = tastiera('7', 'Non sono un bot');
  assert.equal(t.inline_keyboard[0][0].callback_data, d);
  assert.equal(t.inline_keyboard[0][0].text, 'Non sono un bot');
});

test('a ogni pressione si risponde, sempre', () => {
  const casi = [
    { dato: datoTasto('7'), chiPreme: '7', inAttesa: true },
    { dato: datoTasto('7'), chiPreme: '7', inAttesa: false },
    { dato: datoTasto('7'), chiPreme: '8', inAttesa: true },
    { dato: 'spazzatura', chiPreme: '7', inAttesa: true },
    {},
  ];
  for (const c of casi) {
    const r = esitoTasto(c);
    assert.ok(r.risposta && r.risposta.length > 3, `senza risposta: ${JSON.stringify(c)}`);
    assert.equal(typeof r.apri, 'boolean');
  }
  assert.equal(esitoTasto(casi[0]).apri, true, 'chi e\' in attesa e preme il suo tasto entra');
  assert.equal(esitoTasto(casi[2]).apri, false, 'il tasto di un altro non apre niente');
  assert.equal(esitoTasto(casi[1]).apri, false, 'chi e\' gia\' dentro non si ri-apre');
});

test('i permessi che tornano indietro sono quelli del gruppo', () => {
  const chat = { permissions: { can_send_messages: true, can_send_photos: false, can_pin_messages: true, roba_strana: true } };
  const p = permessiDi(chat);
  assert.equal(p.can_send_messages, true);
  assert.equal(p.can_send_photos, false);
  assert.equal(p.can_pin_messages, true);
  assert.ok(!('roba_strana' in p), 'non si inventano permessi che Telegram non conosce');
  // e MUTO e' il contrario: tutto no, per ogni permesso che sappiamo nominare
  for (const v of Object.values(MUTO)) assert.equal(v, false);
  assert.deepEqual(Object.keys(p).sort().filter((k) => k in MUTO).length > 0, true);
});

test('senza i permessi del gruppo il cancello non silenzia nessuno', () => {
  assert.equal(permessiDi({}), null);
  assert.equal(permessiDi({ permissions: null }), null);
  assert.equal(permessiDi({ permissions: {} }), null);
  assert.equal(guai({ ioSonoAdmin: true, possoLimitare: true, permessi: null }), 'permessi');
  assert.equal(guai({ ioSonoAdmin: false, possoLimitare: true, permessi: { can_send_messages: true } }), 'admin');
  assert.equal(guai({ ioSonoAdmin: true, possoLimitare: false, permessi: { can_send_messages: true } }), 'limitare');
  assert.equal(guai({ ioSonoAdmin: true, possoLimitare: true, permessi: { can_send_messages: true } }), '');
});

test('il tempo di risposta sta dentro limiti sensati', () => {
  assert.equal(inMinuti(0), 5);
  assert.equal(inMinuti(''), 5);
  assert.equal(inMinuti(-3), MINUTI_MIN);
  assert.equal(inMinuti(9999), MINUTI_MAX);
  assert.equal(inMinuti(7), 7);
});

test('il benvenuto dice il nome e quanto tempo c\'e\'', () => {
  const t = testoBenvenuto({ nome: 'Ada', minuti: 3 });
  assert.match(t, /Ada/);
  assert.match(t, /3 minuti/);
  assert.equal(testoBenvenuto({ nome: 'Ada', minuti: 1 }).includes('un minuto'), true);
  // il nome arriva da fuori: non deve poter portare dentro dei tag
  const cattivo = testoBenvenuto({ nome: '<b>x</b>', minuti: 5 });
  assert.ok(!cattivo.includes('<b>x</b>'), 'il nome non porta dentro HTML');
  assert.match(cattivo, /&lt;b&gt;/);
  // un testo proprio vince, e i segnaposto valgono anche li'
  assert.match(testoBenvenuto({ nome: 'Ada', minuti: 2, template: 'Oh {nome}, hai {minuti}' }), /Oh <b>Ada<\/b>, hai 2 minuti/);
  assert.equal(testoBenvenuto({ nome: 'Ada', minuti: 2, template: '   ' }).includes('benvenuto'), TESTO_DEF.includes('benvenuto'));
});

test('chi non risponde: si caccia, o resta muto, e nient\'altro', () => {
  assert.equal(modoScaduto('muto'), 'muto');
  assert.equal(modoScaduto('caccia'), 'caccia');
  assert.equal(modoScaduto('qualunque altra cosa'), 'caccia');
  assert.equal(modoScaduto(undefined), 'caccia');
});
