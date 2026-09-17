// GLI AUGURI IN CHAT.
//
// Nel gruppo Telegram gli auguri partono a mezzanotte. In chat la mezzanotte non
// esiste: alle due di notte non c'e' nessuno, e un augurio che nessuno legge non
// e' un augurio. Percio' partono al PRIMO messaggio di chi compie gli anni, una
// volta l'anno — e qui si fissa che sia davvero una volta, perche' il difetto
// naturale di questa idea e' la filastrocca: un augurio a ogni riga della chat.
//
// Si fissa anche la chiave: chi si segna dalla chat non deve poter finire sulla
// riga di un membro del gruppo, e un nome fatto di sole cifre e' il caso in cui
// succederebbe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-compleanni-chat-');
const { streamers, compleanni } = await import('../../src/db.js');
const comple = await import('../../src/features/compleanni.js');

const CH = 'canale';
streamers.request(CH, 'Canale', '1');
const accendi = (chatAuguri) => streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), chatAuguri });
accendi({ attivo: true, messaggio: '', effetto: '' });

const oggi = comple.oggiRoma();
const msg = (testo, extra = {}) => ({ channel: CH, user: 'marco99', display: 'Marco99', text: testo, ...extra });
const raccolta = () => { const d = []; return { d, parla: (t) => d.push(t) }; };

test('la chiave di chi si segna dalla chat non puo\' toccare quella del gruppo', () => {
  assert.equal(comple.chiDiChat('twitch', '12345'), 'chat:12345');
  assert.equal(comple.chiDiChat('kick', 'Giada'), 'chat:kick.giada');
  assert.equal(comple.chiDiChat('twitch', '!!!'), '', 'un nome che non lascia niente non fa una chiave');
});

test('il comando si legge uguale col punto e con l\'esclamativo', () => {
  assert.deepEqual(comple.leggiComando('!compleanno'), { azione: 'mostra' });
  assert.deepEqual(comple.leggiComando('/compleanno via'), { azione: 'togli' });
  assert.deepEqual(comple.leggiComando('!compleanno 25/12'), { azione: 'imposta', giorno: 25, mese: 12 });
  assert.deepEqual(comple.leggiComando('!compleanno domani'), { azione: 'boh' });
  assert.equal(comple.leggiComando('!ore'), null);
  assert.deepEqual(comple.leggiComando('!compleanno 32/13'), { azione: 'boh' }, 'una data impossibile non si segna');
});

test('chi guarda si segna, si rilegge e si toglie', () => {
  const a = raccolta();
  assert.equal(comple.tryComando(msg('!compleanno 25/12'), a.parla), true);
  assert.match(a.d[0], /25\/12/);
  assert.equal(compleanni.get(CH, 'chat:marco99').giorno, 25);

  const b = raccolta();
  comple.tryComando(msg('!compleanno'), b.parla);
  assert.match(b.d[0], /25\/12/, 'rileggendo dice la data segnata');

  const c = raccolta();
  comple.tryComando(msg('!compleanno via'), c.parla);
  assert.ok(!compleanni.get(CH, 'chat:marco99'), 'e dal database sparisce');
});

test('col comando spento non si segna nessuno', () => {
  accendi({ attivo: false });
  const a = raccolta();
  assert.equal(comple.tryComando(msg('!compleanno 25/12'), a.parla), false);
  assert.equal(a.d.length, 0, 'e il bot non risponde nemmeno');
  accendi({ attivo: true, messaggio: '', effetto: '' });
});

test('gli auguri partono al primo messaggio, e una volta sola', () => {
  compleanni.set(CH, 'chat:marco99', 'Marco99', oggi.giorno, oggi.mese);
  const a = raccolta();
  assert.equal(comple.auguriInChat(msg('ciao a tutti'), a.parla), true);
  assert.match(a.d[0], /Marco99/);
  const b = raccolta();
  assert.equal(comple.auguriInChat(msg('un altro messaggio'), b.parla), false, 'niente filastrocca');
  assert.equal(b.d.length, 0);
});

test('l\'anno segnato e\' quello di oggi, non un contatore', () => {
  assert.equal(compleanni.get(CH, 'chat:marco99').last_auguri, oggi.anno);
});

test('a chi compie gli anni un altro giorno non si dice niente', () => {
  const domani = { giorno: oggi.giorno === 28 ? 1 : oggi.giorno + 1, mese: oggi.mese };
  compleanni.set(CH, 'chat:giada', 'Giada', domani.giorno, domani.mese);
  const a = raccolta();
  assert.equal(comple.auguriInChat(msg('ciao', { user: 'giada', display: 'Giada' }), a.parla), false);
});

test('l\'effetto parte solo se lo streamer ne ha scelto uno', () => {
  const partiti = [];
  compleanni.set(CH, 'chat:luca', 'Luca', oggi.giorno, oggi.mese);
  comple.auguriInChat(msg('ciao', { user: 'luca', display: 'Luca' }), () => {}, (c, e) => partiti.push([c, e]));
  assert.deepEqual(partiti, [], 'senza effetto scelto non parte niente');

  accendi({ attivo: true, messaggio: 'Auguri {nome}!', effetto: 'coriandoli' });
  compleanni.set(CH, 'chat:sara', 'Sara', oggi.giorno, oggi.mese);
  const a = raccolta();
  comple.auguriInChat(msg('ciao', { user: 'sara', display: 'Sara' }), a.parla, (c, e) => partiti.push([c, e]));
  assert.deepEqual(partiti, [[CH, 'coriandoli']]);
  assert.equal(a.d[0], 'Auguri Sara!', 'il testo e\' quello scritto dallo streamer');
});

test('il messaggio in chat non porta HTML dal gruppo', () => {
  const t = comple.augurioChat('<b>Auguri</b> {nome}', { nome: 'Marco' });
  assert.equal(t, '<b>Auguri</b> Marco', 'il testo resta quello che ha scritto lo streamer');
  assert.match(comple.augurioChat('', { nome: 'Marco' }), /Marco/);
});
