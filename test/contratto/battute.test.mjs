// IL SERBATOIO DELLE BATTUTE.
//
// Una battuta non ha una risposta giusta, quindi il modello va benissimo per
// inventarne. Ma un 7B su CPU ne inventa una decente ogni tanto, ci mette quindici
// secondi, e spento non ne inventa nessuna — e le battute che funzionano in QUEL
// canale le conosce lo streamer, non il modello.
//
// Da qui la forma: prima il serbatoio (istantaneo, sicuro, suo), il modello solo
// quando il serbatoio e' vuoto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

// Il database di questa prova nasce e muore qui dentro: una prova che apre il
// database di sviluppo sporca i dati veri e cambia risultato a seconda di cosa
// c'era dentro. C'e' un collaudo apposta che lo pretende, e questa prova ci era
// cascata.
const usaEGetta = cartellaUsaEGetta('andrybot-battute-');
const { battute } = await import('../../src/db.js');
const { tryBattuta, detta } = await import('../../src/features/battute.js');

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CH = 'canale-battute-prova';
const streamer = (text) => ({ channel: CH, user: 'streamer', isBroadcaster: true, text });
const spettatore = (text) => ({ channel: CH, user: 'tizio', text });
const dice = (msg, opz) => { const out = []; const r = tryBattuta(msg, (t) => out.push(t), opz); return { r, detto: out.join(' | ') }; };


test('col serbatoio vuoto lo dice, invece di promettere', () => {
  const { r, detto } = dice(streamer('!battuta'));
  assert.equal(r, true);
  assert.match(detto, /vuoto/);
});

test('mod e streamer aggiungono, gli altri no', () => {
  assert.match(dice(streamer('!battuta aggiungi Il pomodoro è sempre in salsa')).detto, /#1/);
  assert.match(dice(spettatore('!battuta aggiungi roba mia')).detto, /Solo mod e streamer/);
  assert.equal(battute.count(CH), 1, 'quella dello spettatore non entra');
});

test('la stessa battuta non entra due volte', () => {
  assert.match(dice(streamer('!battuta aggiungi   il POMODORO è sempre in salsa!  ')).detto, /già|c'è/i,
    'il confronto ignora spazi, maiuscole e punteggiatura');
  assert.equal(battute.count(CH), 1);
});

test('non si ripete: esce la meno detta di recente', () => {
  dice(streamer('!battuta aggiungi Seconda battuta di prova'));
  dice(streamer('!battuta aggiungi Terza battuta di prova'));
  const uscite = [dice(streamer('!battuta')).detto, dice(streamer('!battuta')).detto, dice(streamer('!battuta')).detto];
  assert.equal(new Set(uscite).size, 3, `tre tiri, tre battute diverse — uscite: ${uscite.join(' / ')}`);
});

test('si può chiedere quella numerata, e il numero resta suo', () => {
  assert.match(dice(streamer('!battuta 1')).detto, /pomodoro/i);
  dice(streamer('!battuta togli 2'));
  assert.match(dice(streamer('!battuta 1')).detto, /pomodoro/i, 'togliere la 2 non rinumera la 1');
  assert.match(dice(streamer('!battuta 2')).detto, /Non esiste/);
});

test('il cervello lo si chiama SOLO col serbatoio vuoto', async () => {
  let chiamate = 0;
  const inventa = async () => { chiamate++; return 'una battuta inventata'; };
  dice(streamer('!battuta'), { inventa });
  assert.equal(chiamate, 0, 'col serbatoio pieno non si disturba il modello');
  for (const b of battute.list(CH)) battute.remove(CH, b.n);
  dice(streamer('!battuta'), { inventa });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(chiamate, 1, 'col serbatoio vuoto sì');
});

test('a un altro comando non risponde', () => {
  assert.equal(tryBattuta(streamer('!cita'), () => {}), false);
  assert.equal(tryBattuta(streamer('ciao a tutti'), () => {}), false);
});

test('il comando è nel registro: si può spegnere e rinominare come gli altri', async () => {
  const { comandoDi } = await import('../../src/features/comandi-registro.js');
  const c = comandoDi('battuta');
  assert.ok(c, 'esiste nel registro');
  assert.ok(c.nomi.includes('battuta'), 'risponde al suo nome');
  assert.equal(c.modulo, 'battute', 'ha la sua famiglia, con il suo interruttore');
  // e i nomi li prende DA LI', non scritti a mano nel gestore: se no rinominarlo
  // dal pannello non cambierebbe niente in chat.
  const src = readFileSync(join(RAD, 'src/features/battute.js'), 'utf8');
  assert.ok(/comandoDi\('battuta'\)/.test(src), 'il gestore chiede i nomi al registro');
  assert.ok(/preparaComando\(/.test(src), 'e passa dal vaglio come tutti gli altri');
});

test('il tubo è attaccato: il bot lo chiama davvero', () => {
  const bot = readFileSync(join(RAD, 'src/bot.js'), 'utf8');
  assert.ok(/battute\.tryBattuta\(msg, parla/.test(bot), 'chiamato con la voce del canale, così l\'accordo di genere si applica');
  assert.ok(/inventa:/.test(bot), 'e col ripiego del cervello');
});

// ------------------------------------------------------------- la presa
//
// «Ha fatto ridere» non e' un'impressione. Dopo la battuta si sta in ascolto e si
// contano le PERSONE che ridono: una sola puo' essere educazione, e puo' essere
// lo streamer. Il conto resta attaccato alla battuta, ed e' quello che decide
// quale esce la volta dopo.
test('la risata si conta per persone diverse, non per messaggi', async () => {
  const { detta, ascolta, stoAscoltando } = await import('../../src/features/battute.js');
  const n = battute.add(CH, 'Una battuta da misurare', 'streamer');
  detta(CH, n);
  assert.equal(ascolta({ channel: CH, user: 'tizio', text: 'ahahah bella' }), false, 'uno solo non basta');
  assert.equal(ascolta({ channel: CH, user: 'tizio', text: 'ahahahahah' }), false, 'lo stesso che insiste non conta due volte');
  assert.equal(ascolta({ channel: CH, user: 'caio', text: 'LOL' }), true, 'due persone diverse: e\' andata');
  assert.equal(stoAscoltando(CH), false, 'segnata una volta, la finestra si chiude');
  assert.equal(battute.get(CH, n).risate, 1);
});

test('quello che non e\' una risata non conta', async () => {
  const { detta, ascolta } = await import('../../src/features/battute.js');
  const n = battute.add(CH, 'Un\'altra battuta da misurare', 'streamer');
  detta(CH, n);
  ascolta({ channel: CH, user: 'a', text: 'che noia' });
  ascolta({ channel: CH, user: 'b', text: 'non ho capito' });
  assert.equal(battute.get(CH, n).risate, 0);
});

test('quella che fa ridere esce piu\' spesso di quella che non fa ridere', () => {
  for (const b of battute.list(CH)) battute.remove(CH, b.n);
  const buona = battute.add(CH, 'La battuta che funziona', 'streamer');
  const scarsa = battute.add(CH, 'La battuta che non funziona', 'streamer');
  // stessa anzianita', esiti opposti e misurati
  for (let i = 0; i < 5; i++) { battute.prossima(CH); }
  for (let i = 0; i < 5; i++) battute.haFattoRidere(CH, buona);
  const conta = { [buona]: 0, [scarsa]: 0 };
  for (let i = 0; i < 20; i++) conta[battute.prossima(CH).n]++;
  assert.ok(conta[buona] > conta[scarsa],
    `la buona deve uscire di piu': buona ${conta[buona]}, scarsa ${conta[scarsa]}`);
});

test('una battuta mai provata non resta al palo', () => {
  // Sceglierla e dirla sono due cose: `prossima` sceglie, `detta` registra che il
  // bot l'ha detta (e apre la finestra in cui si ascolta chi ride). Qui si usa la
  // coppia vera, com'e' in chat — contare dentro `prossima` voleva dire contare
  // come «detta» anche una battuta soltanto sbirciata.
  for (const b of battute.list(CH)) battute.remove(CH, b.n);
  const vecchia = battute.add(CH, 'La vecchia gia\' collaudata', 'streamer');
  for (let i = 0; i < 3; i++) { detta(CH, battute.prossima(CH).n); battute.haFattoRidere(CH, vecchia); }
  const nuova = battute.add(CH, 'La nuova mai provata', 'streamer');
  const uscite = new Set();
  for (let i = 0; i < 10; i++) { const b = battute.prossima(CH); detta(CH, b.n); uscite.add(b.n); }
  assert.ok(uscite.has(nuova), 'senza credito iniziale, una battuta nuova non uscirebbe mai');
});

test('chi sceglie una battuta dice sempre anche che l\'ha detta', () => {
  // La cucitura creata spostando il conto: `prossima` non registra piu' niente, e
  // un chiamante che si dimenticasse `detta` perderebbe il conto IN SILENZIO — la
  // battuta uscirebbe in chat e risulterebbe mai detta. Qui si controlla che non
  // succeda in nessuno dei punti in cui il bot ne pesca una.
  const fonti = ['src/features/battute.js', 'src/bot.js'];
  let punti = 0;
  for (const f of fonti) {
    const src = readFileSync(join(RAD, f), 'utf8');
    // `prossimaDa` e' solo un passacarte: il dovere di segnare e' di chi lo chiama,
    // e quel chiamante viene controllato per conto suo qui sotto.
    const iPas = src.indexOf('export function prossimaDa');
    const passacarte = iPas < 0 ? [-1, -1] : [iPas, src.indexOf('\n}', iPas)];
    for (const m of src.matchAll(/\bprossima(?:Da)?\(/g)) {
      if (m.index > passacarte[0] && m.index < passacarte[1]) continue;
      punti++;
      assert.match(src.slice(m.index, m.index + 400), /\bdetta\(/,
        `in ${f} si pesca una battuta e si dice anche che e' stata detta`);
    }
  }
  assert.ok(punti >= 2, `punti controllati: ${punti}`);
});

test('il bot ne dice una da solo, ma non mentre sta ancora ascoltando', () => {
  const bot = readFileSync(join(RAD, 'src/bot.js'), 'utf8');
  // Da solo il bot parla nei MOMENTI (_valutaMomenti decide, _eseguiMomento dice),
  // non piu' nel battito: e' li' che si guarda.
  const i = bot.indexOf('_valutaMomenti() {');
  assert.ok(i > 0, 'i momenti si trovano');
  const giro = bot.slice(i, bot.indexOf('// Premi periodici', i));
  assert.ok(giro.length > 0, 'e finiscono prima dei premi periodici');
  assert.ok(/battute\.prossimaDa\(/.test(giro), 'a discorso che scorre il bot pesca una battuta dal serbatoio');
  assert.ok(/battute\.stoAscoltando\(/.test(giro), 'e non ne dice una mentre misura la precedente');
  assert.ok(/battuteAuto/.test(giro), 'e lo streamer puo\' spegnerlo');
});

test('l\'elenco si gestisce anche dalla dashboard', () => {
  const srv = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
  for (const rotta of ["get('/api/streamer/battute'", "post('/api/streamer/battute'", "delete('/api/streamer/battute/:n'"]) {
    assert.ok(srv.includes(rotta), `manca la rotta ${rotta}`);
  }
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  assert.ok(app.includes('id="lista-battute"'), 'la lista c\'è');
  assert.ok(app.includes('btn-aggiungi-battuta'), 'e il modo di aggiungerne');
  assert.ok(/battuteAuto:\s*!!b\.battuteAuto/.test(srv) || srv.includes('battuteAuto'), 'l\'interruttore si salva');
});

// ------------------------------------------------- chi chiama non si ignora
//
// Non riguarda le battute, ma e' venuta fuori guardando la stessa chat: il
// respiro fra due risposte del cervello stava PRIMA di guardare se qualcuno
// avesse chiamato il bot per nome. Chiedevi una cosa, rispondeva; chiedevi la
// seconda entro tre quarti di minuto e non usciva niente — non «aspetta», non
// «non lo so»: silenzio. In chat era scritto «mi sa che sei morta».
test('chiamato per nome non risponde silenzio', async () => {
  const { Brain } = await import('../../src/ai/brain.js');
  const b = new Brain({});
  const streamer = { settings: { spontaneita: 0.05, rispostaMenzioni: true } };
  const base = { channel: 'c-menzioni', botLogin: 'c-menzioni', streamer, isSelf: false };

  assert.equal(b.shouldReply({ ...base, user: 'a', text: 'bot mi dai la ricetta della carbonara?' }), true);
  // la seconda domanda, dodici secondi dopo: e' una conversazione, non spam
  b._ultimaMenzione.set('c-menzioni|a', Date.now() - 12_000);
  b._ultimaMenzioneCanale.set('c-menzioni', Date.now() - 12_000);
  assert.equal(b.shouldReply({ ...base, user: 'a', text: 'bot e la ricetta degli hotdog?' }), true,
    'due domande di fila sono una conversazione: rispondere alla prima e tacere sulla seconda è il difetto');

  // la raffica invece si ferma
  assert.equal(b.shouldReply({ ...base, user: 'a', text: 'bot bot bot' }), false);

  // e chi ha spento le risposte alle menzioni resta spento
  assert.equal(b.shouldReply({ ...base, user: 'z', text: 'bot ci sei?', streamer: { settings: { rispostaMenzioni: false } } }), false);
});

test('il respiro delle chiacchiere spontanee resta dov\'era', async () => {
  const { Brain } = await import('../../src/ai/brain.js');
  const b = new Brain({});
  const streamer = { settings: { spontaneita: 0.5, rispostaMenzioni: true } };
  const base = { channel: 'c-spont', botLogin: 'c-spont', streamer, isSelf: false };
  b._ultimaRisposta.set('c-spont', Date.now());
  // senza menzione, il freno lungo vale ancora: e' li' per non allagare la chat
  let parlato = false;
  for (let i = 0; i < 50; i++) if (b.shouldReply({ ...base, user: 'x', text: 'che bella giornata oggi' })) parlato = true;
  assert.equal(parlato, false, 'senza chiamarlo, il respiro lungo resta');
});

test('l\'interruttore delle battute autonome non mente', () => {
  // Stava in Giochi, ma la funzione parte solo se in Personalita' e' accesa la
  // chat autonoma: si poteva spuntarlo, vederlo spuntato, e non succedere niente.
  // Un comando che sembra fare qualcosa e non fa niente e' il difetto di casa.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const i = app.indexOf('chk-battute-auto');
  assert.ok(i > 0, 'l\'interruttore c\'è');
  const intorno = app.slice(i - 700, i + 900);
  assert.ok(/proattivo !== false/.test(intorno) && /spontaneita/.test(intorno),
    'guarda se la chat autonoma è accesa');
  assert.ok(/disabled/.test(intorno), 'e si spegne quando non potrebbe funzionare');
  assert.ok(/chat autonoma/i.test(intorno), 'dicendo perché, invece di restare muto');
});

test('quando tace dopo essere stato chiamato, lo scrive nel registro', () => {
  // Il silenzio dopo che ti hanno chiamato per nome e' la cosa piu' difficile da
  // capire da fuori: da dentro sembra tutto a posto, da fuori sembri morto. Ogni
  // strada che porta a tacere deve passare da una riga che dice il perche', e
  // deve uscire SEMPRE — non solo con DEBUG acceso, perche' serve proprio quando
  // nessuno aveva acceso niente prima.
  const src = readFileSync(join(RAD, 'src/ai/brain.js'), 'utf8');
  const i = src.indexOf('if (menzionaBot(text, botLogin || channel)) {');
  assert.ok(i > 0, 'il ramo della menzione si trova');
  const ramo = src.slice(i, src.indexOf('return true;', i));
  // la riga si scrive in un posto solo, e quel posto usa log.info: con log.debug
  // uscirebbe solo se qualcuno avesse acceso DEBUG prima, cioe' mai quando serve.
  assert.ok(/const zitto = [\s\S]{0,160}log\.info\(/.test(ramo),
    'chi scrive la riga la scrive sempre, non solo con DEBUG acceso');
  // e ogni strada che porta a tacere deve passare di li'. Tolta la definizione,
  // nel ramo non deve restare nessun ritiro muto.
  const strade = ramo.replace(/const zitto = [\s\S]*?\};/, '');
  const ritiri = [...strade.matchAll(/return (?:false|zitto\()/g)].map((m) => m[0]);
  assert.ok(ritiri.length >= 3, `le strade per tacere sono almeno tre, trovate ${ritiri.length}`);
  assert.ok(ritiri.every((r) => r.includes('zitto(')), `una strada tace senza dire perché: ${ritiri.join(', ')}`);
});
