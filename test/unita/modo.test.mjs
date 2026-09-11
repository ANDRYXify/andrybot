// IL MODO IN CUI IL BOT STA IN CHAT.
//
// Tre cose che una persona in chat fa senza pensarci, e che il bot non faceva.
//
// 1. GUARDA CHI HA SCRITTO. I distintivi (mod, abbonato, VIP, prima volta)
//    arrivano dentro al messaggio e finivano nel cestino prima di arrivare al
//    cervello. Non cambiano COSA si risponde — non ci sono favori — cambiano il
//    modo: a chi arriva per la prima volta non si danno per scontate le cose
//    del canale.
// 2. RISPONDE A QUALCUNO. In una chat che scorre una riga senza destinatario e'
//    una riga persa. Twitch e Kick hanno il filo della risposta, e l'id del
//    messaggio il bot ce l'aveva gia' in mano: lo buttava.
// 3. LEGGE IL RITMO DELLA STANZA. L'attesa prima di parlare dipendeva solo da
//    quanto era lunga la frase. Ma in una chat a sessanta messaggi al minuto
//    tre secondi sono venti messaggi dopo.
//
// Il modello per esteso e' in docs/MODO.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('modo-');
const { streamers } = await import('../../src/db.js');
const { createMessageHandler, attesaUmana } = await import('../../src/features/handler.js');
const { ChatBot } = await import('../../src/twitch/chat.js');
const brainpy = await import('../../src/ai/brainpy.js');
test.after(() => casa.pulisci());

const CANALE = 'tizio';
streamers.upsertApproved(CANALE, 'Tizio', '1');
streamers.setEnabled(CANALE, true);

const ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

// ------------------------------------------------- 3. il ritmo della stanza

test('la chat ferma si aspetta, la chat che corre no', () => {
  const ferma = attesaUmana(40, 0, 0.5);
  const corre = attesaUmana(40, 80, 0.5);
  assert.ok(corre < ferma, `una chat che corre non aspetta come una ferma (${corre} vs ${ferma})`);
  assert.ok(ferma / corre > 2, `la differenza si deve sentire davvero (${ferma} vs ${corre})`);
});

test('il ritmo entra con continuita: nessuno scalino, mai una risalita', () => {
  let prima = Infinity;
  for (let r = 0; r <= 120; r += 3) {
    const ora = attesaUmana(40, r, 0.5);
    assert.ok(ora <= prima, `a ${r} messaggi al minuto l'attesa e' risalita (${ora} > ${prima})`);
    prima = ora;
  }
});

test('agli estremi si ferma: nessuna attesa assurda, nessuna risposta a fucile', () => {
  assert.equal(attesaUmana(40, 500, 0.5), attesaUmana(40, 5000, 0.5), 'oltre il ritmo pieno non scende piu\'');
  assert.ok(attesaUmana(1000, 0, 1) < 5000, 'una risposta lunga in una chat ferma non aspetta cinque secondi');
  assert.ok(attesaUmana(1, 500, 0) > 150, 'nemmeno nella chat piu\' veloce risponde nell\'istante');
});

test('una frase piu\' lunga si scrive in piu\' tempo', () => {
  assert.ok(attesaUmana(5, 20, 0.5) < attesaUmana(60, 20, 0.5), 'battere sessanta caratteri costa piu\' che batterne cinque');
});

test('il caso muove l\'attesa, ma resta dentro i suoi argini', () => {
  const basso = attesaUmana(40, 20, 0);
  const alto = attesaUmana(40, 20, 1);
  assert.ok(basso < alto, 'due risposte uguali non escono a distanza identica');
  assert.equal(attesaUmana(40, 20, 5), alto, 'un caso fuori scala viene riportato dentro');
  assert.equal(attesaUmana(40, 20, -3), basso, 'anche dal lato opposto');
});

// ------------------------------------------------- 2. rispondere nel filo

function bocca() {
  const chat = new ChatBot({ auth: {}, login: 'bot' });
  const righe = [];
  chat._isOpen = () => true;                     // niente rete: si guarda la riga che parte
  chat._ws = { send: (r) => righe.push(r) };
  return { chat, righe };
}

test('con l\'id del messaggio la risposta parte agganciata alla domanda', () => {
  const { chat, righe } = bocca();
  chat.say('#' + CANALE, 'ciao', { rispondiA: ID });
  assert.equal(righe[0], `@reply-parent-msg-id=${ID} PRIVMSG #${CANALE} :ciao`);
});

test('senza id parte una riga normale', () => {
  const { chat, righe } = bocca();
  chat.say('#' + CANALE, 'ciao');
  assert.equal(righe[0], `PRIVMSG #${CANALE} :ciao`);
});

test('un id storto non entra mai nella riga IRC', () => {
  // L'id arriva dalla rete e finisce dentro una riga dove lo spazio separa i
  // tag dal comando: se passasse cosi' com'e', chi scrive in chat potrebbe far
  // partire al bot un comando che non abbiamo scritto noi.
  for (const storto of [
    'abc PRIVMSG #altrocanale :sono dentro',
    'aaaaaaaa;altro-tag=1',
    'aaaaaaaa\r\nPRIVMSG #altrocanale :sono dentro',
    'abc',
    'a'.repeat(80),
    'aaaaaaaa bbbb',
  ]) {
    const { chat, righe } = bocca();
    chat.say('#' + CANALE, 'ciao', { rispondiA: storto });
    assert.equal(righe[0], `PRIVMSG #${CANALE} :ciao`, `id storto passato: ${JSON.stringify(storto)}`);
  }
});

// ------------------------------------------------- 1. chi ha scritto

function banco() {
  const chat = { detto: [], say(c, t, o) { this.detto.push({ c, t, o }); } };
  const brain = {
    visto: null,
    shouldReply() { return true; },
    async chatReply(d) { this.visto = d; return 'ehi'; },
  };
  return { chat, brain, onMessage: createMessageHandler({ chat, brain, botLogin: CANALE }) };
}

const messaggio = (extra = {}) => ({
  channel: CANALE, user: 'lucia', display: 'Lucia', text: 'come va', id: ID, ...extra,
});

test('i distintivi di chi scrive arrivano al cervello', async () => {
  const { brain, onMessage } = banco();
  await onMessage(messaggio({ isMod: true, isFirst: true }));
  assert.deepEqual(brain.visto.ruolo, { mod: true, sub: false, vip: false, primo: true });
});

test('chi non ha distintivi non porta un blocco vuoto', async () => {
  const { brain, onMessage } = banco();
  await onMessage(messaggio());
  assert.equal(brain.visto.ruolo, null, 'un blocco che dice «niente» e\' una riga di prompt sprecata');
});

test('la risposta esce agganciata al messaggio a cui risponde', async () => {
  const { chat, onMessage } = banco();
  await onMessage(messaggio({ isSub: true }));
  assert.equal(chat.detto.length, 1);
  assert.equal(chat.detto[0].o?.rispondiA, ID, 'l\'id del messaggio non deve fermarsi al gestore');
});

test('il cervello riceve i distintivi e non l\'amicizia', async () => {
  // Il bot del canale non ricorda nessuno (nel repository del cervello). I distintivi
  // sono un fatto di QUESTO turno; l'affinita' fra canali sarebbe memoria.
  const { brain, onMessage } = banco();
  await onMessage(messaggio({ isVip: true }));
  const chiavi = Object.keys(brain.visto.ruolo).sort();
  assert.deepEqual(chiavi, ['mod', 'primo', 'sub', 'vip']);
});

test('il ruolo viaggia fino al corpo della richiesta al cervello', async () => {
  const vero = globalThis.fetch;
  let corpo = null;
  globalThis.fetch = async (_url, opz) => {
    corpo = JSON.parse(opz.body);
    return { ok: true, json: async () => ({ risposta: 'ok' }) };
  };
  try {
    await brainpy.rispondi({
      via: 'bot', canale: CANALE, login: 'lucia', testo: 'come va',
      ruolo: { mod: false, sub: true, vip: false, primo: false },
    });
  } finally { globalThis.fetch = vero; }
  assert.deepEqual(corpo.ruolo, { mod: false, sub: true, vip: false, primo: false });
});

test('senza ruolo il campo non viene nemmeno spedito', async () => {
  const vero = globalThis.fetch;
  let corpo = null;
  globalThis.fetch = async (_url, opz) => {
    corpo = JSON.parse(opz.body);
    return { ok: true, json: async () => ({ risposta: 'ok' }) };
  };
  try {
    await brainpy.rispondi({ via: 'bot', canale: CANALE, login: 'lucia', testo: 'come va' });
  } finally { globalThis.fetch = vero; }
  assert.ok(!('ruolo' in corpo), 'un campo nullo in piu\' e\' rumore nel corpo della richiesta');
});

// ------------------------------------------------- 4. quando parte lui

// Il difetto: la riga d'iniziativa usciva da un elenco di nove frasi scritte a
// mano e pescate a caso. Cadeva dentro un discorso che non c'entrava, era
// sempre la stessa, e andava bene in qualunque chat — cioe' in nessuna.
const { Brain } = await import('../../src/ai/brain.js');
const { memory } = await import('../../src/db.js');

function conRisposta(testo) {
  const vero = globalThis.fetch;
  const visto = { corpo: null };
  globalThis.fetch = async (url, opz) => {
    visto.rotta = String(url);
    visto.corpo = JSON.parse(opz.body);
    return { ok: true, json: async () => ({ risposta: testo }) };
  };
  visto.rimetti = () => { globalThis.fetch = vero; };
  return visto;
}

test('non parla da solo in una chat dove non ha detto niente nessuno', async () => {
  const canale = 'vuoto';
  streamers.upsertApproved(canale, 'Vuoto', '9');
  streamers.setEnabled(canale, true);
  const cervello = new Brain({});
  const f = conRisposta('qualcosa');
  try {
    assert.equal(await cervello.iniziativa(canale), null);
    assert.equal(f.corpo, null, 'non ha nemmeno chiesto: non c\'era niente a cui agganciarsi');
  } finally { f.rimetti(); }
});

test('parte da quello che si stanno dicendo adesso, non da un elenco', async () => {
  memory.logMessage(CANALE, 'marco', 'Marco', 'sto boss mi ha ucciso otto volte', false);
  const cervello = new Brain({});
  const f = conRisposta('otto volte e non hai ancora buttato il pad, rispetto');
  let detto = null;
  try { detto = await cervello.iniziativa(CANALE); } finally { f.rimetti(); }
  assert.ok(detto, 'con un discorso in corso qualcosa da dire ce l\'ha');
  assert.equal(f.corpo.iniziativa, true, 'il cervello deve sapere che nessuno gli ha chiesto niente');
  assert.equal(f.corpo.testo, 'sto boss mi ha ucciso otto volte', 'si aggancia all\'ultima riga vera');
  assert.ok(f.rotta.endsWith('/bot'), `la chat pubblica passa dal bot, non da Lei (${f.rotta})`);
});

test('se ha appena parlato con qualcuno, non si intromette anche da solo', async () => {
  memory.logMessage(CANALE, 'marco', 'Marco', 'comunque il gioco e\' bello', false);
  const cervello = new Brain({});
  cervello._ultimaRisposta.set(CANALE, Date.now());
  const f = conRisposta('una cosa');
  try {
    assert.equal(await cervello.iniziativa(CANALE), null);
    assert.equal(f.corpo, null, 'non chiede nemmeno: sta gia\' parlando con qualcuno');
  } finally { f.rimetti(); }
});

test('con l\'IA locale spenta resta zitto', async () => {
  const s = streamers.get(CANALE);
  streamers.setSettings(CANALE, { ...s.settings, iaLocale: false });
  const cervello = new Brain({});
  const f = conRisposta('una cosa');
  try { assert.equal(await cervello.iniziativa(CANALE), null); }
  finally { f.rimetti(); streamers.setSettings(CANALE, { ...s.settings, iaLocale: true }); }
});
