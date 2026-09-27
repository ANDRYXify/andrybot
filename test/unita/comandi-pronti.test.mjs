// I GIOCHI SONO OGGETTI, NON RIGHE DI PROGRAMMA.
//
// Erano quattordici blocchi `case` dentro il motore: niente da spegnere, niente
// da rinominare, niente da riservare — e il pannello, per elencarli, se li
// riscriveva a mano (ne mostrava dieci su trenta, e quattro giochi veri non li
// nominava affatto mentre la chat li annunciava).
//
// Qui si verifica il contratto della tabella: che una scelta dello streamer
// cambi davvero cosa risponde in chat, e che non si possa costruire uno stato in
// cui due giochi si contendono la stessa parola.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-giochi-');
const { streamers } = await import('../../src/db.js');
const T = await import('../../src/features/comandi-registro.js');
const GIOCHI = T.COMANDI.filter((c) => c.modulo === 'giochi');

const CH = 'canale';
streamers.request(CH, 'Canale', '1');

function scegli(comandi) {
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), comandi });
}
const inChat = (msg = {}) => T.giochiInChat(CH, msg).join(' ');

test('di serie risponde ogni nome del motore, e nessuno due volte', () => {
  scegli({});
  const nomi = GIOCHI.flatMap((g) => g.nomi);
  assert.equal(nomi.length, new Set(nomi).size, 'nessun nome ripetuto');
  for (const n of nomi) {
    const r = T.risolvi(CH, n);
    assert.ok(r, `!${n} risolve`);
    assert.equal(r.spento, false);
  }
  assert.equal(T.risolvi(CH, 'inventato'), null);
});

test('spegnere un gioco lo toglie dalla chat, non lo nasconde e basta', () => {
  scegli({ slot: { off: true } });
  assert.equal(T.risolvi(CH, 'slot').spento, true);
  assert.ok(!inChat().includes('!slot'), 'sparisce anche da !giochi');
  const riga = T.elenco(CH).find((g) => g.id === 'slot');
  assert.equal(riga.acceso, false, 'il pannello lo mostra spento, non lo perde');
});

test('rinominare SOSTITUISCE: i nomi di serie smettono di rispondere', () => {
  scegli({ slot: { nome: 'macchinetta' } });
  assert.equal(T.risolvi(CH, 'slot'), null, 'il nome di serie non risponde piu\'');
  const r = T.risolvi(CH, 'macchinetta');
  assert.ok(r && r.comando.id === 'slot');
  assert.ok(inChat().includes('!macchinetta'));
});

test('un gioco che non si spegne resta acceso anche se glielo si chiede', () => {
  scegli({ giochi: { off: true } });
  assert.equal(T.risolvi(CH, 'giochi').spento, false);
  assert.equal(Object.keys(T.normalizza({ giochi: { off: true } })).length, 0);
});

test('riservare un gioco lascia passare solo da quel livello in su', () => {
  const nessuno = {};
  const sub = { isSub: true };
  const vip = { isVip: true };
  const mod = { isMod: true };
  assert.equal(T.puoUsare('tutti', nessuno), true);
  assert.equal(T.puoUsare('sub', nessuno), false);
  assert.equal(T.puoUsare('sub', sub), true);
  assert.equal(T.puoUsare('vip', sub), false);
  assert.equal(T.puoUsare('vip', vip), true);
  assert.equal(T.puoUsare('mod', vip), false);
  assert.equal(T.puoUsare('mod', mod), true);
  assert.equal(T.puoUsare('mod', { isBroadcaster: true }), true);
});

test('due giochi non possono contendersi la stessa parola', () => {
  const scontri = T.collisioni({ slot: { nome: 'dado' } });
  assert.equal(scontri.length, 1);
  assert.deepEqual(scontri[0].fra.sort(), ['dado', 'slot']);
  assert.equal(T.collisioni({ slot: { nome: 'macchinetta' } }).length, 0);
});

test('quello che arriva dal pannello viene ripulito, non creduto', () => {
  const fuori = T.normalizza({
    slot: { nome: '  MACCHI netta!! ', chi: 'sub', off: true, altro: 'ignorato' },
    dado: { chi: 'inventato' },
    inesistente: { off: true },
  });
  assert.deepEqual(fuori.slot, { off: true, nome: 'macchinetta', chi: 'sub' });
  assert.equal(fuori.dado, undefined, 'un livello inventato non si salva');
  assert.equal(fuori.inesistente, undefined, 'un gioco che non esiste non si salva');
});

test('il pannello e la chat leggono la stessa cosa', () => {
  scegli({ furto: { off: true }, slot: { nome: 'macchinetta' }, duello: { chi: 'sub' } });
  const righe = T.elenco(CH);
  assert.equal(righe.length, T.COMANDI.length);
  assert.equal(righe.find((g) => g.id === 'furto').acceso, false);
  assert.equal(righe.find((g) => g.id === 'slot').nomi[0], 'macchinetta');
  assert.equal(righe.find((g) => g.id === 'slot').rinominato, true);
  assert.equal(righe.find((g) => g.id === 'duello').chi, 'sub');
  const detto = inChat({ isMod: true });
  for (const g of righe.filter((x) => x.vivo && x.modulo === 'giochi' && T.IN_CHAT[x.id]?.gruppo)) {
    assert.ok(detto.includes('!' + g.nomi[0] + ',') || detto.includes('!' + g.nomi[0] + ' ') || detto.includes('!' + g.nomi[0] + '.'), `${g.id} compare in !giochi`);
  }
  assert.ok(!detto.includes('!furto'), 'quello spento no');
});

// LA PROVA CHE CONTA: il vaglio. I gestori restano scritti sui nomi canonici —
// e' `preparaComando` che traduce la parola scritta in chat, spegne, riserva. Un
// posto solo, prima di tutti, cosi' vale anche per le famiglie che verranno.
const { tryGame } = await import('../../src/features/games.js');

const messaggio = (testo, extra = {}) => ({ channel: CH, user: 'tizio', display: 'Tizio', text: testo, ...extra });

test('il vaglio traduce, spegne e riserva', () => {
  scegli({});
  assert.equal(T.preparaComando(CH, messaggio('!dado')).testo, '!dado');
  assert.equal(T.preparaComando(CH, messaggio('!roll 2d20')).testo, '!dado 2d20', 'un alias diventa il nome canonico');
  assert.equal(T.preparaComando(CH, messaggio('!inventato')), null, 'quel che non e\' nostro passa intatto');
  assert.equal(T.preparaComando(CH, messaggio('ciao')), null, 'e un messaggio normale pure');

  scegli({ dado: { off: true } });
  assert.equal(T.preparaComando(CH, messaggio('!dado')).salta, true, 'spento: nessun gestore lo vede');
  assert.equal(T.preparaComando(CH, messaggio('!roll')).salta, true, 'nemmeno dagli alias');

  scegli({ dado: { nome: 'lancia' } });
  assert.equal(T.preparaComando(CH, messaggio('!dado')), null, 'rinominato: il vecchio nome non e\' piu\' nostro');
  assert.equal(T.preparaComando(CH, messaggio('!lancia')).testo, '!dado', 'e il nuovo arriva al gestore com\'era scritto');

  scegli({ dado: { chi: 'sub' } });
  const no = T.preparaComando(CH, messaggio('!dado'));
  assert.equal(no.rifiuta, 'sub');
  assert.match(no.messaggio, /abbonat/i, 'dice a chi e\' riservato invece di tacere');
  assert.equal(T.preparaComando(CH, messaggio('!dado', { isSub: true })).testo, '!dado');
  assert.equal(T.preparaComando(CH, messaggio('!dado', { isMod: true })).testo, '!dado');
});

test('una famiglia spenta zittisce i suoi comandi, senza spegnerli a uno a uno', () => {
  scegli({});
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), tracking: { attivo: true, giochi: false } });
  assert.equal(T.preparaComando(CH, messaggio('!mima', { isMod: true })).salta, true);
  assert.equal(T.preparaComando(CH, messaggio('!dado')).testo, '!dado', 'gli altri restano vivi');
  const riga = T.elenco(CH).find((c) => c.id === 'mima');
  assert.equal(riga.acceso, true, 'il suo interruttore e\' ancora su acceso…');
  assert.equal(riga.vivo, false, '…ma non risponde, e il pannello lo dice');
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), tracking: { attivo: true, giochi: true } });
});

test('i gestori restano scritti sui nomi canonici', () => {
  scegli({});
  const dette = [];
  assert.equal(tryGame(messaggio('!dado'), (t) => dette.push(String(t))), true);
  assert.ok(dette.join(' ').includes('tira'), 'e rispondono');
});

test('!giochi dice quello che risponde davvero, e quello che chi chiede puo\' usare', () => {
  scegli({ furto: { off: true }, slot: { nome: 'macchinetta' } });
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), tracking: { attivo: true, giochi: true } });
  const riga = inChat();
  assert.ok(riga.includes('!macchinetta'), 'dice il nome vero');
  assert.ok(!riga.includes('!slot'), 'non quello di serie ormai sostituito');
  assert.ok(!riga.includes('!furto'), 'non un gioco spento');
  assert.ok(riga.includes('!pesca') && riga.includes('!roulette') && riga.includes('!regala'),
    'e non dimentica quelli che il pannello non nominava');
  assert.ok(!riga.includes('!mima') && !riga.includes('!boss'), 'a chi non e\' mod non propone i giochi che non puo\' far partire');
  assert.ok(inChat({ isMod: true }).includes('!mima'), 'a un mod, con la webcam accesa, anche quelli');

  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), tracking: { attivo: true, giochi: false } });
  const senzaWebcam = inChat({ isMod: true });
  assert.ok(!senzaWebcam.includes('!mima'), 'con la webcam spenta, spariscono');
  assert.ok(senzaWebcam.includes('!macchinetta'), 'gli altri restano');
});

test('nell\'elenco ci sono i giochi, non le mosse: le mosse le spiega il loro gioco', () => {
  scegli({});
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), tracking: { attivo: true, giochi: true, effetti: { puzzle: true } } });
  const detto = inChat({ isMod: true });
  for (const [id, r] of Object.entries(T.IN_CHAT)) {
    if (!r.parteDi) continue;
    assert.ok(!new RegExp(`!${id}\\b`).test(detto), `!${id} non e' un gioco da elencare`);
    assert.ok(T.IN_CHAT[r.parteDi].spiega.includes(`{${id}}`), `la spiegazione di ${r.parteDi} nomina ${id}`);
    assert.match(T.spiegaGioco(CH, id, { isMod: true }), new RegExp(`!${id}\\b`), `chi chiede di !${id} trova il suo gioco`);
  }
});

test('un elenco non si taglia mai: con ogni nome lungo al massimo, si spezza fra un gioco e l\'altro', () => {
  const tutti = {};
  for (const c of T.COMANDI) if (T.rinominabile(c)) tutti[c.id] = { nome: (c.id.replace(/[^a-z0-9]/g, '') + 'xxxxxxxxxxxxxxxxxxxx').slice(0, 20) };
  scegli(tutti);
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), tracking: { attivo: true, giochi: true, effetti: { puzzle: true } } });
  for (const limite of [450, 500, 200, 120]) {
    const msgs = T.giochiInChat(CH, { isMod: true }, { limite });
    for (const m of msgs) assert.ok(m.length <= limite, `${m.length} caratteri su ${limite}`);
    const insieme = msgs.join(' ');
    for (const r of T.elenco(CH).filter((x) => x.vivo && T.IN_CHAT[x.id]?.gruppo)) {
      assert.ok(insieme.includes('!' + r.nomi[0]), `con ${limite} caratteri !${r.nomi[0]} c'e' intero`);
    }
    assert.ok(!insieme.includes('…'), 'niente puntini di un taglio');
  }
  scegli({});
});

test('!giochi e un nome spiega quel gioco, coi nomi e i valori del canale', () => {
  scegli({ carta: { nome: 'pesco' }, blackjack: { nome: 'banco' } });
  const bj = T.spiegaGioco(CH, 'pesco', {});
  assert.match(bj, /^🃏 Blackjack: una mano contro il banco: !banco 50 per puntare, poi !pesco per un'altra carta/, 'una mossa porta al suo gioco, coi nomi rinominati');
  assert.doesNotMatch(bj, /[{}%]/, 'nessun segnaposto resta scritto');
  scegli({ slot: { off: true } });
  assert.match(T.spiegaGioco(CH, 'slot', {}), /qui è spento/);
  assert.match(T.spiegaGioco(CH, 'inventato', {}), /non c'è un gioco che si chiama «inventato»/);
  scegli({});
  for (const [id, r] of Object.entries(T.IN_CHAT)) {
    if (!r.spiega) continue;
    assert.doesNotMatch(T.riempiSpiega(CH, r.spiega), /[{}%]|undefined|NaN/, `${id}: la spiegazione esce pulita`);
  }
});

// LA TRASPARENZA IA NON SI SPEGNE. `!bot` (e `!ia`, `!ai`, `!socialbot`) dice
// che in chat risponde anche un'intelligenza artificiale: stava nella famiglia
// dei comandi base, e spegnendo quella, o il comando, o rinominandolo, la
// dichiarazione spariva o cambiava nome. Adesso nessuna scelta la tocca.
const comandibase = await import('../../src/features/comandibase.js');

test('!bot risponde sempre, a chiunque, con le parole di sempre', async () => {
  const bot = T.comandoDi('bot');
  assert.equal(T.spegnibile(bot), false, 'non si spegne');
  assert.equal(T.rinominabile(bot), false, 'non si rinomina');
  assert.equal(T.riservabile(bot), false, 'non si riserva');
  assert.equal(T.moduloAcceso(bot.modulo, { comandiBase: { attivo: false } }), true, 'la sua famiglia non ha interruttore');

  scegli({ bot: { off: true, nome: 'chiedi', chi: 'mod' } });
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), comandiBase: { attivo: false } });
  assert.deepEqual(T.normalizza({ bot: { off: true, nome: 'chiedi', chi: 'mod' } }), {}, 'il pannello non puo\' salvare niente su di lui');
  for (const parola of ['bot', 'ia', 'ai', 'socialbot']) {
    const v = T.preparaComando(CH, messaggio('!' + parola));
    assert.equal(v.testo, '!bot', `!${parola} arriva al gestore anche con i comandi base spenti`);
  }
  assert.equal(T.preparaComando(CH, messaggio('!chiedi')), null, 'un nome inventato non diventa !bot');
  const riga = T.elenco(CH).find((c) => c.id === 'bot');
  assert.equal(riga.vivo, true);
  assert.equal(riga.chi, 'tutti');

  const dette = [];
  assert.equal(await comandibase.tryComando(null, messaggio('!ia'), (t) => dette.push(t)), true);
  assert.match(dette[0], /intelligenza artificiale/, 'e dice quello che il pannello promette');
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), comandiBase: { attivo: true } });
  scegli({});
});

// !COMANDO LISTA E' DI TUTTI, LE MODIFICHE NO. Il registro diceva «solo mod»
// per tutto !comando, e il gestore apriva l'elenco a chiunque: vinceva il
// registro, e l'elenco era chiuso. Ora l'elenco e' aperto, e le sottoazioni
// che scrivono le guarda il gestore, qualunque livello dica il registro.
const comandichat = await import('../../src/features/comandichat.js');
const { commands } = await import('../../src/db.js');

test('!comando lista e\' aperto a tutti, aggiungere e togliere restano ai mod', () => {
  scegli({});
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), comandiChat: { attivo: true } });
  const chiunque = T.preparaComando(CH, messaggio('!comando lista'));
  assert.equal(chiunque.testo, '!comando lista', 'nessun rifiuto a chi non e\' mod');
  const dette = [];
  const dire = (t) => dette.push(String(t));
  assert.equal(comandichat.tryComando(messaggio('!comando aggiungi !prova ciao'), dire), true);
  assert.equal(commands.get(CH, 'prova'), null, 'chi non e\' mod non crea niente');
  assert.equal(comandichat.tryComando(messaggio('!addcom !prova ciao'), dire), true);
  assert.equal(commands.get(CH, 'prova'), null, 'nemmeno dalla forma corta');
  comandichat.tryComando(messaggio('!comando aggiungi !prova ciao {user}', { isMod: true }), dire);
  assert.ok(commands.get(CH, 'prova'), 'un mod si');
  dette.length = 0;
  comandichat.tryComando(messaggio('!comando elimina !prova'), dire);
  assert.ok(commands.get(CH, 'prova'), 'chi non e\' mod non toglie niente');
  comandichat.tryComando(messaggio('!comando lista'), dire);
  assert.match(dette.join(' '), /!prova/, 'e l\'elenco lo legge chiunque');
  for (const id of ['addcom', 'editcom', 'delcom']) {
    assert.equal(T.preparaComando(CH, messaggio('!' + id + ' !x y')).rifiuta, 'mod', `!${id} resta ai mod`);
  }
  commands.remove(CH, 'prova');
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), comandiChat: { attivo: false } });
});

// UN SALVATAGGIO CAMBIA LE RIGHE CHE SI VEDEVANO. I giochi stanno in due liste
// del pannello; salvando da una, le scelte lette dall'altra coprivano quelle
// appena fatte. Ora chi salva dice quali righe aveva davanti.
test('salvare da una lista cambia solo le sue righe', () => {
  const prima = { slot: { off: true }, so: { nome: 'grida' } };
  // dalla lista di Comandi, che le ha tutte: lo slot torna com'era di serie
  const tutte = T.COMANDI.map((c) => c.id);
  assert.deepEqual(T.unisci(prima, { so: { nome: 'grida' } }, tutte), { so: { nome: 'grida' } }, 'lo slot riacceso resta acceso');
  // dalla lista di Giochi, che ha solo i giochi: lo shoutout rinominato non si perde
  const giochi = T.COMANDI.filter((c) => c.modulo === 'giochi').map((c) => c.id);
  assert.deepEqual(T.unisci(prima, { dado: { chi: 'sub' } }, giochi), { so: { nome: 'grida' }, dado: { chi: 'sub' } });
  assert.deepEqual(T.unisci(prima, { so: { off: true } }, ['dado']), prima, 'una riga fuori dalla lista non passa');
  assert.deepEqual(T.unisci({ bot: { off: true } }, {}, []), {}, 'e quello che non si puo\' salvare non si salva');
});
