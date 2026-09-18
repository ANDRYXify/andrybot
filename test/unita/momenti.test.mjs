// I MOMENTI, riconosciuti dalla chat e non dal dado: sequenze vere, con il
// tempo in mano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Momenti, perLaStanza, daDire, DOMANDA_ATTESA_MS, DOMANDA_SCADE_MS, SILENZIO_MS } from '../../src/features/momenti.js';

const T0 = 1_760_000_000_000;
const M = 60_000;
const riga = (m, ts, user, testo, extra = {}) => m.osserva('canale', { ts, user, display: user, testo, id: 'id' + ts, ...extra });
const tipi = (out) => out.map((x) => x.tipo);

test('una domanda lasciata sola per 75 secondi, che il bot sa, e\' un momento agganciato alla domanda', () => {
  const m = new Momenti();
  riga(m, T0, 'anna', 'ciao a tutti');
  riga(m, T0 + 10_000, 'bruno', 'ma a che ora finisce la live?');
  assert.deepEqual(tipi(m.vedi('canale', { ora: T0 + 60_000, live: true, saQualcosa: () => true })).filter((t) => t === 'domanda'), [], 'non prima dei 75 secondi');
  const out = m.vedi('canale', { ora: T0 + 10_000 + DOMANDA_ATTESA_MS, live: true, saQualcosa: () => true });
  assert.equal(out[0].tipo, 'domanda');
  assert.equal(out[0].dati.user, 'bruno');
  assert.equal(out[0].dati.id, 'id' + (T0 + 10_000), 'porta l\'id: la risposta si aggancia');
  assert.equal(tipi(m.vedi('canale', { ora: T0 + 200_000, live: true, saQualcosa: () => true })).includes('domanda'), true, 'proporla non la chiude: se la decisione la rimanda, al giro dopo e\' ancora li\'');
  m.osserva('canale', { ts: T0 + 205_000, user: 'canale', testo: 'finisce verso le undici', dalBot: true });
  assert.equal(tipi(m.vedi('canale', { ora: T0 + 220_000, live: true, saQualcosa: () => true })).includes('domanda'), false, 'la risposta del bot la chiude');
});

test('una domanda mai raccolta scade da sola dopo quattro minuti', () => {
  const m = new Momenti();
  riga(m, T0, 'bruno', 'ma a che ora finisce la live?');
  assert.equal(tipi(m.vedi('canale', { ora: T0 + DOMANDA_SCADE_MS, live: true, saQualcosa: () => true })).includes('domanda'), true);
  assert.equal(tipi(m.vedi('canale', { ora: T0 + DOMANDA_SCADE_MS + 1, live: true, saQualcosa: () => true })).includes('domanda'), false, 'acqua passata');
});

test('una domanda che il bot non sa non e\' un momento', () => {
  const m = new Momenti();
  riga(m, T0, 'bruno', 'secondo voi chi vince stasera?');
  const out = m.vedi('canale', { ora: T0 + DOMANDA_ATTESA_MS, live: true, saQualcosa: () => false });
  assert.equal(tipi(out).includes('domanda'), false);
});

test('se qualcun altro scrive dopo la domanda, il discorso e\' andato avanti: non tocca al bot', () => {
  const m = new Momenti();
  riga(m, T0, 'bruno', 'che pc usi per streammare?');
  riga(m, T0 + 20_000, 'carla', 'lol quella clip');
  const out = m.vedi('canale', { ora: T0 + DOMANDA_ATTESA_MS + 1000, live: true, saQualcosa: () => true });
  assert.equal(tipi(out).includes('domanda'), false);
});

test('se risponde lo streamer o il bot, la domanda e\' chiusa', () => {
  const m = new Momenti();
  riga(m, T0, 'bruno', 'che pc usi per streammare?');
  riga(m, T0 + 5000, 'streamer', 'un i9 con una 4080', { isSelf: true });
  assert.equal(tipi(m.vedi('canale', { ora: T0 + 100_000, live: true, saQualcosa: () => true })).includes('domanda'), false);
  const m2 = new Momenti();
  riga(m2, T0, 'bruno', 'che pc usi per streammare?');
  m2.osserva('canale', { ts: T0 + 3000, user: 'canale', testo: 'un i9!', dalBot: true });
  assert.equal(tipi(m2.vedi('canale', { ora: T0 + 100_000, live: true, saQualcosa: () => true })).includes('domanda'), false);
});

test('una domanda dello streamer, un comando o una domanda rivolta a qualcuno non contano', () => {
  const m = new Momenti();
  riga(m, T0, 'streamer', 'raga secondo voi che gioco faccio dopo?', { isSelf: true });
  riga(m, T0 + 1, 'anna', '!uptime ma quanto manca?');
  riga(m, T0 + 2, 'bruno', '@carla ci sei?');
  assert.deepEqual(tipi(m.vedi('canale', { ora: T0 + 100_000, live: true, saQualcosa: () => true })).filter((t) => t === 'domanda'), []);
});

test('la chat che si ferma dopo un momento vivo, in diretta, e\' un rilancio — una volta per silenzio', () => {
  const m = new Momenti();
  for (let i = 0; i < 6; i++) riga(m, T0 + i * 20_000, ['anna', 'bruno', 'carla'][i % 3], 'riga ' + i);
  const fine = T0 + 5 * 20_000;
  assert.equal(tipi(m.vedi('canale', { ora: fine + SILENZIO_MS - 1, live: true })).includes('rilancio'), false, 'non prima di quattro minuti');
  const out = m.vedi('canale', { ora: fine + SILENZIO_MS, live: true });
  assert.equal(out.some((x) => x.tipo === 'rilancio'), true);
  assert.match(out.find((x) => x.tipo === 'rilancio').spunto, /si e' fermata da 4 minuti/);
  m.segna('canale', 'rilancio', fine + SILENZIO_MS);
  assert.equal(tipi(m.vedi('canale', { ora: fine + SILENZIO_MS + 10 * M, live: true })).includes('rilancio'), false, 'lo stesso silenzio non si rilancia due volte');
  riga(m, fine + 20 * M, 'anna', 'rieccomi');
  assert.equal(tipi(m.vedi('canale', { ora: fine + 20 * M + SILENZIO_MS, live: true })).includes('rilancio'), false, 'una riga sola non fa un momento vivo');
});

test('a canale spento il silenzio e\' normale; e una chat di due persone non e\' un momento vivo', () => {
  const m = new Momenti();
  for (let i = 0; i < 6; i++) riga(m, T0 + i * 20_000, ['anna', 'bruno', 'carla'][i % 3], 'riga ' + i);
  assert.equal(tipi(m.vedi('canale', { ora: T0 + 5 * 20_000 + SILENZIO_MS, live: false })).includes('rilancio'), false);
  const m2 = new Momenti();
  for (let i = 0; i < 6; i++) riga(m2, T0 + i * 20_000, ['anna', 'bruno'][i % 2], 'riga ' + i);
  assert.equal(tipi(m2.vedi('canale', { ora: T0 + 5 * 20_000 + SILENZIO_MS, live: true })).includes('rilancio'), false);
});

test('otto righe in mezzo minuto da quattro persone, dopo una chat calma, e\' un\'esplosione — al piu\' ogni quarto d\'ora', () => {
  const m = new Momenti();
  riga(m, T0 - 4 * M, 'anna', 'calma');
  riga(m, T0 - 2 * M, 'bruno', 'piatta');
  for (let i = 0; i < 9; i++) riga(m, T0 + i * 3000, ['anna', 'bruno', 'carla', 'dino'][i % 4], 'POGGERS ' + i);
  const ora = T0 + 27_000;
  const out = m.vedi('canale', { ora, live: true });
  assert.equal(out.some((x) => x.tipo === 'hype'), true);
  assert.match(out.find((x) => x.tipo === 'hype').spunto, /9 messaggi in mezzo minuto da 4 persone/);
  m.segna('canale', 'hype', ora);
  for (let i = 0; i < 9; i++) riga(m, ora + 60_000 + i * 3000, ['anna', 'bruno', 'carla', 'dino'][i % 4], 'ancora ' + i);
  assert.equal(tipi(m.vedi('canale', { ora: ora + 90_000, live: true })).includes('hype'), false, 'riposa un quarto d\'ora');
});

test('una chat gia\' veloce che resta veloce non e\' un\'esplosione', () => {
  const m = new Momenti();
  for (let i = 0; i < 100; i++) riga(m, T0 - 5 * M + i * 3000, ['anna', 'bruno', 'carla', 'dino'][i % 4], 'r' + i);
  assert.equal(tipi(m.vedi('canale', { ora: T0 - 5 * M + 100 * 3000, live: true })).includes('hype'), false);
});

test('a discorso che scorre c\'e\' il momento del flusso; se lo streamer ha appena scritto, no', () => {
  const m = new Momenti();
  riga(m, T0, 'anna', 'oggi si gioca bene');
  riga(m, T0 + 20_000, 'bruno', 'eh si');
  assert.equal(tipi(m.vedi('canale', { ora: T0 + 40_000, live: true })).includes('flusso'), true);
  riga(m, T0 + 41_000, 'streamer', 'grazie ragazzi', { isSelf: true });
  assert.equal(tipi(m.vedi('canale', { ora: T0 + 50_000, live: true })).includes('flusso'), false, 'la chat e\' sua');
  assert.equal(tipi(m.vedi('canale', { ora: T0 + 41_000 + 46_000, live: true })).includes('flusso'), true, 'passati 45 secondi si puo\'');
});

test('non parla da solo con se\' stesso: se l\'ultima riga e\' sua, niente flusso', () => {
  const m = new Momenti();
  riga(m, T0, 'anna', 'oggi si gioca bene');
  m.osserva('canale', { ts: T0 + 5000, user: 'canale', testo: 'gia\'', dalBot: true });
  assert.equal(tipi(m.vedi('canale', { ora: T0 + 10_000, live: true })).includes('flusso'), false);
});

test('i canali non si mischiano e il ritmo e\' quello dell\'ultimo minuto senza le sue righe', () => {
  const m = new Momenti();
  riga(m, T0, 'anna', 'a');
  m.osserva('altro', { ts: T0, user: 'zed', testo: 'z', id: 'z' });
  m.osserva('canale', { ts: T0 + 1000, user: 'canale', testo: 'io', dalBot: true });
  assert.equal(m.ritmo('canale', T0 + 2000), 1);
  assert.equal(m.ritmo('altro', T0 + 2000), 1);
  assert.equal(m.ritmo('nessuno', T0), 0);
});

// ────────────────────────────────────────────────────────────────────────────
// PER LA STANZA, O PER UNA PERSONA.
//
// Il caso vero da cui nasce: in chat c'era una riga che era una RISPOSTA a
// un'altra persona e che chiamava un terzo per nome. Il bot ci si e' agganciato
// e ha detto la sua. La frase non era sbagliata: era entrare in mezzo a un
// discorso fra due e commentare l'ultima cosa sentita. Da fuori sembra che parli
// a caso, e in un certo senso e' cosi' — ma la colpa e' della riga scelta, non
// della frase.
test('una riga che parla a qualcuno non e\' una riga per la stanza', () => {
  assert.equal(perLaStanza('stasera si gioca a Dark Souls'), true);
  assert.equal(perLaStanza('@MGRoxas2 ciuf ciuf, che succede?'), false, 'chiama qualcuno per nome');
  assert.equal(perLaStanza({ testo: 'ciuf ciuf, che succede?', rispostaA: 'abc123' }), false, 'e\' appesa a un altro messaggio');
  assert.equal(perLaStanza('!morti'), false);
  assert.equal(perLaStanza('/me balla'), false);
  assert.equal(perLaStanza(''), false);
  assert.equal(perLaStanza({ testo: 'stasera si gioca a Dark Souls', rispostaA: '' }), true);
  // «a chi e' rivolta» e «c'e' qualcosa da dire» sono due domande diverse:
  // «bravo!» e' detto a tutti, ma non offre niente su cui aggiungere una parola.
  assert.equal(perLaStanza('bravo!'), true, 'e\' detta a tutti');
  assert.equal(daDire('bravo!'), false, 'ma non c\'e\' niente su cui dire la propria');
  assert.equal(daDire('stasera si gioca a Dark Souls'), true);
  assert.equal(daDire('@tizio stasera si gioca a Dark Souls'), false, 'e resta valida la prima domanda');
});

test('se le ultime righe sono roba fra due, non c\'e\' nessun discorso a cui aggiungersi', () => {
  const m = new Momenti();
  riga(m, T0, 'tizio', 'stasera che si gioca? dimmi tutto');
  riga(m, T0 + 10_000, 'caio', '@tizio io sto ancora finendo il primo');
  riga(m, T0 + 20_000, 'tizio', 'ciuf ciuf, che succede?', { rispostaA: 'id' + (T0 + 10_000) });
  const out = m.vedi('canale', { ora: T0 + 25_000, live: true });
  const flusso = out.find((x) => x.tipo === 'flusso');
  assert.ok(flusso, 'il discorso scorre: il momento c\'e\'');
  assert.equal(flusso.aggancio.testo, 'stasera che si gioca? dimmi tutto',
    'ma ci si aggancia all\'ultima riga detta alla STANZA, non all\'ultima riga qualunque');
});

test('se alla stanza non ha parlato piu\' nessuno da un pezzo, non si parte affatto', () => {
  const m = new Momenti();
  riga(m, T0, 'tizio', 'stasera che si gioca? dimmi tutto');
  // due che se le dicono fra loro per due minuti: il discorso scorre, ma non e' della stanza
  for (let i = 1; i <= 6; i++) {
    riga(m, T0 + i * 20_000, i % 2 ? 'caio' : 'tizio', `@${i % 2 ? 'tizio' : 'caio'} ma figurati, e' il contrario`);
  }
  const ora = T0 + 6 * 20_000 + 5_000;
  const out = m.vedi('canale', { ora, live: true });
  assert.ok(!out.some((x) => x.tipo === 'flusso'),
    'l\'ultima riga per la stanza e\' vecchia: non c\'e\' niente di fresco su cui dire la propria');
});

test('una domanda appesa a un altro messaggio non e\' una domanda lasciata sola', () => {
  const m = new Momenti();
  riga(m, T0, 'caio', 'ma quindi il pc nuovo ce l\'hai?', { rispostaA: 'id-di-un-altro' });
  const out = m.vedi('canale', { ora: T0 + DOMANDA_ATTESA_MS + 1000, live: true, saQualcosa: () => true });
  assert.ok(!out.some((x) => x.tipo === 'domanda'),
    'stava chiedendo a qualcuno in particolare, e quel qualcuno non e\' il bot');
});
