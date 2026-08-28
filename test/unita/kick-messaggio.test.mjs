// DA EVENTO KICK A MESSAGGIO DEL BOT. È il pezzo che rende il multipiattaforma
// possibile senza riscrivere niente: se un messaggio di Kick entra con la
// STESSA forma di uno di Twitch, comandi, moduli, antispam, punti e memoria
// funzionano il primo giorno. Quindi qui si controlla la forma, campo per campo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { daChatMessage, daEvento } from '../../src/kick/messaggio.js';

const msg = (extra = {}) => ({
  message_id: 'aaaa-bbbb', content: 'ciao a tutti',
  broadcaster: { user_id: 100, username: 'AndryXify' },
  sender: { user_id: 200, username: 'Tizio', identity: { username_color: '#ff0000', badges: [] } },
  ...extra,
});
const conBadge = (...tipi) => msg({ sender: { user_id: 200, username: 'Tizio', identity: { badges: tipi.map((t) => ({ type: t })) } } });

test('un messaggio normale diventa la forma di casa', () => {
  const m = daChatMessage(msg(), { canale: 'andryxify' });
  assert.equal(m.channel, 'andryxify');
  assert.equal(m.user, 'tizio', 'il login è minuscolo, come su Twitch');
  assert.equal(m.display, 'Tizio', 'il nome mostrato conserva le maiuscole');
  assert.equal(m.text, 'ciao a tutti');
  assert.equal(m.id, 'aaaa-bbbb');
  assert.equal(m.userId, '200');
  assert.equal(m.piattaforma, 'kick');
});

test('ha ESATTAMENTE i campi che il bot si aspetta', () => {
  const m = daChatMessage(msg(), { canale: 'andryxify' });
  for (const campo of ['channel', 'user', 'display', 'text', 'id', 'userId', 'isMod', 'isBroadcaster', 'isSub', 'isVip', 'isSelf', 'tags']) {
    assert.ok(campo in m, `manca "${campo}": una funzione del bot lo leggerà e troverà undefined`);
  }
  for (const bandiera of ['isMod', 'isBroadcaster', 'isSub', 'isVip', 'isSelf']) {
    assert.equal(typeof m[bandiera], 'boolean', `${bandiera} dev'essere un sì/no, non un forse`);
  }
});

test('i permessi si leggono dai badge', () => {
  assert.equal(daChatMessage(conBadge('moderator'), { canale: 'c' }).isMod, true);
  assert.equal(daChatMessage(conBadge('subscriber'), { canale: 'c' }).isSub, true);
  assert.equal(daChatMessage(conBadge('vip'), { canale: 'c' }).isVip, true);
  assert.equal(daChatMessage(conBadge('og'), { canale: 'c' }).isVip, true);
  const nessuno = daChatMessage(msg(), { canale: 'c' });
  assert.deepEqual([nessuno.isMod, nessuno.isSub, nessuno.isVip], [false, false, false]);
});

test('lo streamer è riconosciuto sia dal badge sia dall’id', () => {
  assert.equal(daChatMessage(conBadge('broadcaster'), { canale: 'c' }).isBroadcaster, true);
  const suo = msg({ sender: { user_id: 100, username: 'AndryXify', identity: { badges: [] } } });
  assert.equal(daChatMessage(suo, { canale: 'c' }).isBroadcaster, true, 'stesso id del broadcaster');
});

test('lo streamer è sempre anche moderatore', () => {
  assert.equal(daChatMessage(conBadge('broadcaster'), { canale: 'c' }).isMod, true,
    'come su Twitch: chi possiede il canale può fare quello che fa un mod');
});

test('il bot non risponde a sé stesso', () => {
  assert.equal(daChatMessage(msg(), { canale: 'c', loginBot: 'tizio' }).isSelf, true);
  assert.equal(daChatMessage(msg(), { canale: 'c', loginBot: 'altro' }).isSelf, false);
  assert.equal(daChatMessage(msg(), { canale: 'c' }).isSelf, false, 'senza bot dichiarato non è mai "sé stesso"');
});

test('un payload monco non produce un messaggio finto', () => {
  assert.equal(daChatMessage(msg({ content: '' }), { canale: 'c' }), null);
  assert.equal(daChatMessage(msg({ sender: {} }), { canale: 'c' }), null);
  assert.equal(daChatMessage(msg(), {}), null, 'senza canale non si sa a chi appartiene');
  assert.equal(daChatMessage(null, { canale: 'c' }), null);
  assert.equal(daChatMessage({}, { canale: 'c' }), null);
});

test('non si porta dietro tutto il payload', () => {
  const m = daChatMessage(msg({ segreto: 'roba', emotes: [1, 2, 3] }), { canale: 'c' });
  const dentro = JSON.stringify(m);
  assert.doesNotMatch(dentro, /segreto/, 'finirebbe nella memoria della chat e nei log');
  assert.ok(Object.keys(m.tags).length <= 4);
});

test('gli altri eventi diventano la forma degli eventi di casa', () => {
  assert.equal(daEvento('channel.followed', { follower: { username: 'Pinco' } }, { canale: 'c' }).tipo, 'seguito');
  assert.equal(daEvento('channel.subscription.new', { subscriber: { username: 'P' } }, { canale: 'c' }).tipo, 'abbonamento');
  assert.equal(daEvento('channel.subscription.renewal', { duration: 7 }, { canale: 'c' }).mesi, 7);
  assert.equal(daEvento('channel.subscription.gifts', { giftees: [1, 2, 3] }, { canale: 'c' }).quanti, 3);
  assert.equal(daEvento('livestream.status.updated', { is_live: true, title: 'ciao' }, { canale: 'c' }).tipo, 'live');
  assert.equal(daEvento('livestream.status.updated', { is_live: false }, { canale: 'c' }).tipo, 'fine-live');
});

test('un evento che non conosciamo non viene inventato', () => {
  assert.equal(daEvento('roba.che.non.esiste', {}, { canale: 'c' }), null);
  assert.equal(daEvento('channel.followed', null, { canale: 'c' }).utente, '');
});
