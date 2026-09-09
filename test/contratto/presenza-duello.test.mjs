// CHI C'E' E' CHI STA NELLA STANZA, NON CHI HA PARLATO.
//
// La presenza si deduceva dai messaggi visti arrivare. Ha un buco che non si
// chiude con un caso particolare: i messaggi che il bot manda non gli tornano
// indietro su IRC — serve a non fare loop — e il bot parla con l'account dello
// STREAMER. Quindi l'unico account che non poteva mai risultare in chat era
// proprio quello dello streamer, e `!duello @streamer` rispondeva «non e' in
// chat» mentre il bot stava parlando con quel nome.
//
// Chi c'e' e sta zitto aveva lo stesso problema, ed e' la meta' della chat.
//
// La verita' su chi c'e' ce l'ha Twitch, e il bot la chiede gia' ogni cinque
// minuti per le ore guardate. Il collaudo tiene ferme due cose: che la presenza
// sappia arrivare da quella lista, e che il tubo sia DAVVERO attaccato — la
// logica funzionava anche prima, mancava il collegamento.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { segnaPresenza, inChat, accredita, tryGame } from '../../src/features/games.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CH = 'canale-di-prova';

test('chi ha parlato risulta in chat', () => {
  accredita({ channel: CH, user: 'chiacchierone', text: 'ciao' });
  assert.equal(inChat(CH, 'chiacchierone'), true);
});

test('chi sta nella stanza risulta in chat anche senza aver mai parlato', () => {
  segnaPresenza(CH, 'muto');
  assert.equal(inChat(CH, 'muto'), true, 'un lurker c\'e\', anche se non scrive');
});

test('lo streamer si puo\' sfidare quando la sua presenza viene dalla lista', () => {
  // I suoi messaggi il bot non li vede mai: qui infatti non ne arriva nessuno.
  segnaPresenza(CH, 'la_streamer');
  accredita({ channel: CH, user: 'spettatore', text: 'ciao' });
  const dette = [];
  const gestito = tryGame({ channel: CH, user: 'spettatore', text: '!duello @la_streamer' }, (t) => dette.push(t));
  assert.equal(gestito, true, 'il comando viene gestito');
  assert.ok(dette.length, 'il bot risponde qualcosa');
  assert.ok(!dette.join(' ').includes('non è in chat'), `non deve dire che non c'e': ${dette.join(' | ')}`);
});

test('chi non c\'e\' davvero resta non sfidabile', () => {
  const dette = [];
  tryGame({ channel: CH, user: 'spettatore', text: '!duello @fantasma_mai_visto' }, (t) => dette.push(t));
  assert.ok(dette.join(' ').includes('non è in chat'), 'un nome inventato non si sfida');
});

test('il giro dei presenti segna DAVVERO la presenza', () => {
  // Il collegamento, non la logica: senza questa riga tutto quanto sopra passa
  // lo stesso e dal vivo non funziona niente.
  const bot = readFileSync(join(RAD, 'src/bot.js'), 'utf8');
  // il METODO, non il punto in cui viene chiamato
  const i = bot.indexOf('async _tickWatchtime(');
  assert.ok(i > 0, 'il giro delle ore guardate si trova');
  const fine = bot.indexOf('\n  }\n', i);
  assert.ok(fine > i, 'il metodo ha una fine');
  const giro = bot.slice(i, fine);
  assert.ok(giro.includes('getChatters'), 'il giro chiede a Twitch chi c\'e\'');
  assert.ok(/segnaPresenza\(\s*login\s*,/.test(giro), 'e con quella lista segna la presenza');
});
