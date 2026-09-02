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
const T = await import('../../src/features/giochi-tabella.js');

const CH = 'canale';
streamers.request(CH, 'Canale', '1');

function scegli(giochiComandi) {
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), giochiComandi });
}

test('di serie risponde ogni nome del motore, e nessuno due volte', () => {
  scegli({});
  const nomi = T.GIOCHI.flatMap((g) => g.nomi);
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
  assert.ok(!T.elencoInChat(CH).includes('!slot'), 'sparisce anche da !giochi');
  const riga = T.elenco(CH).find((g) => g.id === 'slot');
  assert.equal(riga.acceso, false, 'il pannello lo mostra spento, non lo perde');
});

test('rinominare SOSTITUISCE: i nomi di serie smettono di rispondere', () => {
  scegli({ slot: { nome: 'macchinetta' } });
  assert.equal(T.risolvi(CH, 'slot'), null, 'il nome di serie non risponde piu\'');
  const r = T.risolvi(CH, 'macchinetta');
  assert.ok(r && r.gioco.id === 'slot');
  assert.ok(T.elencoInChat(CH).includes('!macchinetta'));
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
  assert.equal(righe.length, T.GIOCHI.length);
  assert.equal(righe.find((g) => g.id === 'furto').acceso, false);
  assert.equal(righe.find((g) => g.id === 'slot').nomi[0], 'macchinetta');
  assert.equal(righe.find((g) => g.id === 'slot').rinominato, true);
  assert.equal(righe.find((g) => g.id === 'duello').chi, 'sub');
  const inChat = T.elencoInChat(CH);
  for (const g of righe.filter((x) => x.acceso && x.id !== 'giochi')) {
    assert.ok(inChat.includes('!' + g.nomi[0]), `${g.id} compare in !giochi`);
  }
  assert.ok(!inChat.includes('!furto'), 'quello spento no');
});

// La prova che conta: non che la tabella dica la cosa giusta, ma che il MOTORE
// le dia retta. Prima non poteva: il comando era una riga di `switch`.
const { tryGame } = await import('../../src/features/games.js');

function inChat(testo, extra = {}) {
  const dette = [];
  const msg = { channel: CH, user: 'tizio', display: 'Tizio', text: testo, ...extra };
  const gestito = tryGame(msg, (t) => dette.push(String(t)));
  return { gestito, dette };
}

test('il motore obbedisce alla tabella', () => {
  scegli({});
  assert.equal(inChat('!dado').gestito, true, 'di serie risponde');

  scegli({ dado: { off: true } });
  assert.equal(inChat('!dado').gestito, false, 'spento: il comando non esiste piu\'');

  scegli({ dado: { nome: 'lancia' } });
  assert.equal(inChat('!dado').gestito, false, 'rinominato: il vecchio nome tace');
  assert.equal(inChat('!lancia').gestito, true, 'e risponde il nuovo');

  scegli({ dado: { chi: 'sub' } });
  const rifiutato = inChat('!dado');
  assert.equal(rifiutato.gestito, true, 'riservato: il bot risponde…');
  assert.match(rifiutato.dette.join(' '), /abbonat/i, '…dicendo a chi e\' riservato');
  assert.equal(inChat('!dado', { isSub: true }).gestito, true, 'un abbonato passa');
  assert.equal(inChat('!dado', { isMod: true }).gestito, true, 'un mod passa sempre');
});

test('!giochi elenca quello che risponde davvero, non una lista scritta a mano', () => {
  scegli({ furto: { off: true }, slot: { nome: 'macchinetta' } });
  const { dette } = inChat('!giochi');
  const riga = dette.join(' ');
  assert.ok(riga.includes('!macchinetta'), 'dice il nome vero');
  assert.ok(!riga.includes('!slot'), 'non dice quello di serie ormai spento');
  assert.ok(!riga.includes('!furto'), 'non dice un gioco spento');
  assert.ok(riga.includes('!pesca') && riga.includes('!roulette') && riga.includes('!regala'),
    'e non dimentica quelli che il pannello non nominava');
});
