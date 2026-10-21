// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// GLI ATTACCHI DEGLI SPETTATORI, il modello (src/features/colpi.js,
// docs/COLPI.md): il listino pulito, il punto controllato alla mira, il
// codice che si legge in un cheer senza scambiarlo per una parola.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizza, puntoBuono, voceDi, prezzoDi, metodiDi, nuovoCodice, codiceIn, nomeChi, bastaPer, ALFABETO, LUNGHEZZA_CODICE } from '../../src/features/colpi.js';

test('il listino si pulisce: comandi veri, prezzi dentro i limiti, zone dentro il quadro', () => {
  const c = normalizza({ attivo: true, voci: [{ comando: '!Pomodoro', euro: 200, bit: 100 }, { comando: 'pomodoro', punti: 500 }, { comando: 'x y' }, { comando: 'gratis', euro: -3, punti: 0 }], zone: [{ x: 70, y: 60, w: 40, h: 50 }, { x: 'a' }] });
  assert.deepEqual(c.voci.map((v) => [v.id, v.comando, v.euro, v.punti, v.bit]), [['pomodoro', 'pomodoro', 200, 0, 100], ['pomodoro2', 'pomodoro', 0, 500, 0], ['gratis', 'gratis', 0, 0, 0]]);
  assert.deepEqual(c.zone, [{ x: 70, y: 60, w: 30, h: 40 }], 'una zona non esce dal quadro');
  assert.equal(normalizza({}).attivo, false, 'di serie spento');
  assert.deepEqual(metodiDi(c.voci[2]), [], 'una voce senza prezzo non si compra');
  assert.equal(normalizza({ voci: [{ comando: 'a', euro: 10 }] }).voci[0].euro, 50, 'meno di 50 centesimi non si incassa');
});

test('il punto si controlla alla mira: dentro il quadro e fuori dalle zone protette', () => {
  const c = normalizza({ zone: [{ x: 70, y: 60, w: 30, h: 40 }] });
  assert.deepEqual(puntoBuono(c, 10, 20), { ok: true, x: 10, y: 20 });
  assert.equal(puntoBuono(c, 85, 80).motivo, 'protetta');
  assert.deepEqual(puntoBuono(c, 120, -4), { ok: true, x: 100, y: 0 }, 'fuori quadro si porta al bordo');
  assert.equal(puntoBuono(c, 'x', 5).motivo, 'punto');
});

test('il codice: cinque caratteri senza ambigui, sempre con una cifra e una lettera', () => {
  for (let i = 0; i < 300; i++) {
    const k = nuovoCodice();
    assert.equal(k.length, LUNGHEZZA_CODICE);
    assert.ok([...k].every((ch) => ALFABETO.includes(ch)) && /\d/.test(k) && /[A-Z]/.test(k), k);
  }
  const giri = [[0, 1, 2, 3, 4], [0, 1, 2, 3, 21]];
  let n = 0;
  assert.equal(nuovoCodice(() => new Uint8Array(giri[Math.min(n++, 1)])), 'ABCD3', 'senza cifra se ne pesca un altro');
  assert.equal(n, 2);
});

test('il codice si legge nel messaggio del cheer, anche minuscolo; una parola non e\' mai un codice', () => {
  assert.equal(codiceIn('Cheer100 danke k7qx3 dai!'), 'K7QX3');
  assert.equal(codiceIn('cheer500 K7QX3'), 'K7QX3');
  assert.equal(codiceIn('danke mille'), '', 'parole fatte di sole lettere dell\'alfabeto: niente');
  assert.equal(codiceIn('Cheer100'), '', 'il cheer da solo non e\' un codice');
  assert.equal(codiceIn('AB3CD4'), '', 'sei caratteri non sono un codice');
});

test('il prezzo e\' quello scritto nella mira, e basta pagarlo nella sua moneta', () => {
  const c = normalizza({ voci: [{ comando: 'bomba', euro: 300, bit: 250 }] });
  const v = voceDi(c, 'bomba');
  assert.equal(prezzoDi(v, 'bit'), 250);
  const mira = { prezzi: { euro: 300, bit: 250, punti: 0 } };
  assert.equal(bastaPer(mira, 'bit', 249), false);
  assert.equal(bastaPer(mira, 'bit', 250), true);
  assert.equal(bastaPer(mira, 'punti', 9999), false, 'una moneta senza prezzo non paga');
  assert.equal(nomeChi('  marta https://spam.example  \n'), 'marta');
});

// IL SERVIZIO, sul registro vero (database usa e getta).
const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const usaEGetta = cartellaUsaEGetta('andrybot-colpi-');
process.on('exit', () => usaEGetta.pulisci());
const { registroColpi } = await import('../../src/db.js');
const { creaServizioColpi, MIRABILE } = await import('../../src/features/colpi-servizio.js');

function banco({ cfg, live = true } = {}) {
  let adesso = 1_000_000;
  const sparati = [];
  const effetti = { pomodoro: { tipo: 'immagine' }, coriandoli: { tipo: 'disegno' }, sfondo: { tipo: 'video', schermo: 'riempi' } };
  const s = creaServizioColpi({
    registro: registroColpi,
    effects: { fireConOpzioni: (login, comando, o) => { sparati.push({ login, comando, ...o }); return true; } },
    effettoDi: (login, c) => effetti[c] || null,
    impostazioni: () => cfg || { attivo: true, attesaSec: 30, alMinuto: 3, voci: [{ comando: 'pomodoro', euro: 200, punti: 500, bit: 100, scala: 120, premio: 'aaaaaaaa-1111' }, { comando: 'coriandoli', bit: 50 }], zone: [{ x: 70, y: 60, w: 30, h: 40 }] },
    inOnda: () => live,
    ora: () => adesso,
  });
  return { s, sparati, avanti: (ms) => { adesso += ms; }, ora: () => adesso };
}
let n = 0;
const login = () => `canale${++n}`;

test('si mira solo dal vivo, su un effetto che si posa in un punto, fuori dalle zone protette', () => {
  const { s } = banco();
  const c = login();
  assert.equal(banco({ live: false }).s.mira(c, { voce: 'pomodoro', x: 10, y: 10 }).motivo, 'offline');
  assert.equal(s.mira(c, { voce: 'coriandoli', x: 10, y: 10 }).motivo, 'effetto', 'un disegno a tutto schermo non si mira');
  assert.equal(s.mira(c, { voce: 'pomodoro', x: 80, y: 80 }).motivo, 'protetta');
  const ok = s.mira(c, { voce: 'pomodoro', x: 25.5, y: 40, chi: 'Marta', chiave: 'ip1' });
  assert.equal(ok.ok, true);
  assert.deepEqual([ok.mira.x, ok.mira.y, ok.mira.chi, ok.mira.prezzi], [25.5, 40, 'Marta', { euro: 200, punti: 500, bit: 100 }]);
  assert.ok(MIRABILE({ tipo: 'video' }) && !MIRABILE({ tipo: 'immagine', schermo: 'intero' }));
});

test('chi ha appena mirato aspetta; il canale ha un tetto al minuto', () => {
  const b = banco();
  const c = login();
  assert.equal(b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'ip1' }).ok, true);
  const di = b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'ip1' });
  assert.equal(di.motivo, 'attesa'); assert.ok(di.fraSec > 0 && di.fraSec <= 30);
  assert.equal(b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'ip2' }).ok, true);
  assert.equal(b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'ip3' }).ok, true);
  assert.equal(b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'ip4' }).motivo, 'troppi', 'tre al minuto, il quarto aspetta');
  b.avanti(61_000);
  assert.equal(b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'ip4' }).ok, true);
});

test('il colpo parte una volta sola, nel punto mirato e col suo centro, qualunque cosa lo paghi', () => {
  const b = banco();
  const c = login();
  const { mira } = b.s.mira(c, { voce: 'pomodoro', x: 25, y: 40, chi: 'Marta', chiave: 'x' });
  assert.equal(b.s.daCheer(c, { bits: 99, message: `Cheer99 ${mira.codice}` }).esito, 'pochi', 'meno Bit del prezzo: niente');
  assert.equal(b.s.daCheer(c, { bits: 100, message: `cheer100 ${mira.codice.toLowerCase()} dai` }).esito, 'sparato');
  assert.equal(b.s.daCheer(c, { bits: 100, message: `Cheer100 ${mira.codice}` }).esito, 'sconosciuto', 'un codice usato non vale piu\'');
  assert.equal(b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: mira.codice }).stato, 'CANCELED', 'e i punti tornano');
  assert.equal(b.sparati.length, 1);
  assert.deepEqual(b.sparati[0], { login: c, comando: 'pomodoro', xy: { x: 25, y: 40, s: 120, r: 0, centro: true }, attacco: { chi: 'Marta', nome: 'pomodoro' } });
});

test('i punti: il premio della voce col codice giusto spara; un codice sbagliato restituisce i punti', () => {
  const b = banco();
  const c = login();
  const { mira } = b.s.mira(c, { voce: 'pomodoro', x: 5, y: 5, chiave: 'p' });
  assert.equal(b.s.daRiscatto(c, { reward_id: 'zzzzzzzz-0000', user_input: mira.codice }).esito, 'non-mio', 'un premio che non e\' dei colpi non si tocca');
  assert.equal(b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: 'boh' }).stato, 'CANCELED');
  assert.equal(b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: `codice: ${mira.codice}` }).stato, 'FULFILLED');
  assert.equal(b.sparati.length, 1);
});

test('gli euro: la mira legata a un pagamento non scade da sola, e parte quando il pagamento arriva', () => {
  const b = banco();
  const c = login();
  const { mira } = b.s.mira(c, { voce: 'pomodoro', x: 50, y: 50, chiave: 'e' });
  assert.equal(registroColpi.lega(mira.id, 'stripe:cs_prova_1'), true);
  b.avanti(40 * 60_000);
  registroColpi.pulisci(b.ora());
  assert.equal(registroColpi.get(mira.id).stato, 'attesa', 'il pagamento e\' ancora in corso: la mira resta');
  assert.equal(b.s.daPagamento('stripe:cs_prova_1').esito, 'sparato');
  assert.equal(b.s.daPagamento('stripe:cs_prova_1').esito, 'gia', 'la ronda che ripassa non spara di nuovo');
  const altra = b.s.mira(c, { voce: 'pomodoro', x: 50, y: 50, chiave: 'f' }).mira;
  b.avanti(16 * 60_000);
  registroColpi.pulisci(b.ora());
  assert.equal(registroColpi.get(altra.id).stato, 'scaduta', 'senza pagamento la mira scade dopo un quarto d\'ora');
  assert.equal(b.s.daCheer(c, { bits: 500, message: `Cheer500 ${altra.codice}` }).esito, 'sconosciuto');
});
