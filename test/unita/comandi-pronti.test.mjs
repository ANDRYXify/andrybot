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
  assert.ok(!T.elencoGiochiInChat(CH).includes('!slot'), 'sparisce anche da !giochi');
  const riga = T.elenco(CH).find((g) => g.id === 'slot');
  assert.equal(riga.acceso, false, 'il pannello lo mostra spento, non lo perde');
});

test('rinominare SOSTITUISCE: i nomi di serie smettono di rispondere', () => {
  scegli({ slot: { nome: 'macchinetta' } });
  assert.equal(T.risolvi(CH, 'slot'), null, 'il nome di serie non risponde piu\'');
  const r = T.risolvi(CH, 'macchinetta');
  assert.ok(r && r.comando.id === 'slot');
  assert.ok(T.elencoGiochiInChat(CH).includes('!macchinetta'));
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
  const inChat = T.elencoGiochiInChat(CH);
  for (const g of righe.filter((x) => x.vivo && x.modulo === 'giochi' && x.id !== 'giochi')) {
    assert.ok(inChat.includes('!' + g.nomi[0]), `${g.id} compare in !giochi`);
  }
  assert.ok(!inChat.includes('!furto'), 'quello spento no');
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

test('!giochi e\' UNA risposta sola, e dice quello che risponde davvero', () => {
  scegli({ furto: { off: true }, slot: { nome: 'macchinetta' } });
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), tracking: { attivo: true, giochi: true } });
  const riga = T.elencoGiochiInChat(CH);
  assert.ok(riga.includes('!macchinetta'), 'dice il nome vero');
  assert.ok(!riga.includes('!slot'), 'non quello di serie ormai sostituito');
  assert.ok(!riga.includes('!furto'), 'non un gioco spento');
  assert.ok(riga.includes('!pesca') && riga.includes('!roulette') && riga.includes('!regala'),
    'e non dimentica quelli che il pannello non nominava');
  assert.ok(riga.includes('!mima'), 'con la webcam accesa, ci sono anche quelli');

  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), tracking: { attivo: true, giochi: false } });
  const senzaWebcam = T.elencoGiochiInChat(CH);
  assert.ok(!senzaWebcam.includes('!mima'), 'con la webcam spenta, spariscono');
  assert.ok(senzaWebcam.includes('!macchinetta'), 'gli altri restano');
});
