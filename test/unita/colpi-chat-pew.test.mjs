// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// DALLA CHAT, NEL PUNTO DELLO STREAMER, E AL PIXEL SULLA PAGINA (docs/COLPI.md,
// «Dalla chat, nel punto dello streamer»). Le garanzie, ognuna rotta apposta:
//  · un messaggio ha un significato solo: un codice resta un codice, «bit» e
//    «zaino» restano loro, la frase della presenza resta sua;
//  · il colpo dalla chat cade nel punto della chat (quello del colpo, se ce
//    l'ha), pagato col primo mezzo dello streamer che basta, o con quello
//    chiesto se e' permesso;
//  · niente a metà: un colpo che non parte non prende niente;
//  · l'attesa e' della persona: passare dalla pagina alla chat non la salta;
//  · un pixel resta un pixel: due decimali di percentuale bastano per ogni
//    quadro fino a 8192 px.
import test from 'node:test';
import assert from 'node:assert/strict';

const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const usaEGetta = cartellaUsaEGetta('andrybot-colpi-chat-pew-');
process.on('exit', () => usaEGetta.pulisci());
const { registroColpi, pewBit, pewZaino, points } = await import('../../src/db.js');
const economia = await import('../../src/features/economia.js');
const { normalizza, parolaChat, lancioInChat, puntoChat, rispostaChat, prezzoChat, puntoBuono, QUADRO } = await import('../../src/features/colpi.js');
const { creaServizioColpi } = await import('../../src/features/colpi-servizio.js');
const { creaPortaColpi } = await import('../../src/features/colpi-porta.js');

let n = 0;
const login = () => `chatpew${++n}`;
const VOCE = { comando: 'torta', nome: 'Torta', monete: 40, bit: 100, misti: { bit: { monete: 10, bit: 30 } } };

function banco({ chat = {}, voce = {}, zaino = true } = {}) {
  let adesso = Date.parse('2026-10-28T09:00:00Z');
  const stato = { live: true, overlay: true };
  const sparati = [];
  const cfg = { attivo: true, attesaSec: 0, alMinuto: 60, voci: [{ ...VOCE, ...voce }], bitPew: { attivo: true }, zaino: { attivo: zaino },
    chat: { attivo: true, x: 25, y: 75, ...chat } };
  const s = creaServizioColpi({
    registro: registroColpi,
    effects: { fireConOpzioni: (l, c, o) => { sparati.push(o.xy); return true; } },
    effettoDi: () => ({ tipo: 'immagine' }),
    impostazioni: () => cfg,
    inOnda: () => stato.live, overlay: () => stato.overlay,
    chiudiPremio: async () => true,
    monete: { punta: economia.punta, rendi: economia.rendi, saldo: economia.saldo },
    crediti: pewBit, zaino: pewZaino,
    ora: () => adesso,
  });
  return { s, cfg, stato, sparati, avanti: (ms) => { adesso += ms; }, ora: () => adesso };
}
const daChat = (b, c, extra = {}) => b.s.inChat(c, { voce: 'torta', user: 'marta', chi: '21', nome: 'Marta', ...extra });

test('il modello: spento di serie, il quadro dello streamer, i mezzi in ordine, ogni colpo come vuole', () => {
  const x = normalizza({});
  assert.deepEqual([x.chat.attivo, x.chat.con, x.chat.x, x.chat.y, x.quadro], [false, ['zaino', 'monete', 'bit', 'misto'], 50, 50, { l: 1920, a: 1080 }]);
  const y = normalizza({ quadro: { l: 1080, a: 1920 }, chat: { attivo: true, con: ['bit', 'euro', 'bit', 'zaino'], x: 12.345, y: 200, attesaSec: 99999, risposte: { ok: 'via!', boh: 'x' } },
    voci: [{ comando: 'a', bit: 1, chat: { modo: 'punto', x: 3, y: 4 } }, { comando: 'b', bit: 1, chat: { modo: 'boh' } }] });
  assert.deepEqual([y.quadro, y.chat.con, y.chat.x, y.chat.y, y.chat.attesaSec], [{ l: 1080, a: 1920 }, ['bit', 'zaino'], 12.35, 100, 3600]);
  assert.deepEqual(y.chat.risposte, { ok: 'via!', pochi: '', attesa: '', no: '' });
  assert.deepEqual([y.voci[0].chat, y.voci[1].chat.modo], [{ modo: 'punto', x: 3, y: 4 }, 'si']);
  assert.deepEqual(puntoChat(y, y.voci[0]), { x: 3, y: 4 });
  assert.deepEqual(puntoChat(y, y.voci[1]), { x: 12.35, y: 100 });
  assert.deepEqual(normalizza({ quadro: { l: 9000, a: 10 } }).quadro, { l: QUADRO.lato[1], a: QUADRO.lato[0] });
});

test('un messaggio, un significato: i codici, «bit», «zaino» e la presenza restano loro', () => {
  assert.equal(parolaChat({ comando: 'torta' }), 'torta');
  for (const c of ['k7qx3', 'ab_c3d4e', 'bit', 'bits', 'zaino', 'mochila']) assert.equal(parolaChat({ comando: c }), '', c);
  const cfg = normalizza({ chat: { attivo: true }, presenza: { attiva: true, comando: 'torta', frase: '!pew presente' },
    voci: [VOCE, { comando: 'k7qx3', bit: 1 }, { comando: 'spenta', bit: 1, chat: { modo: 'no' } }, { comando: 'presente', bit: 1 }, { comando: 'ferma', bit: 1, attiva: false }] });
  assert.deepEqual(lancioInChat(cfg, '!pew torta'), { voce: 'torta', con: '' });
  assert.deepEqual(lancioInChat(cfg, '  !PEW Torta MONETE '), { voce: 'torta', con: 'monete' });
  assert.deepEqual(['zaino', 'bits', 'misto', 'coins'].map((m) => lancioInChat(cfg, `!pew torta ${m}`).con), ['zaino', 'bit', 'misto', 'monete']);
  for (const m of ['!pew torta grazie', '!pew k7qx3', '!pew bit', '!pew zaino', '!pew spenta', '!pew presente', '!pew ferma', 'ciao !pew torta', '!pewtorta', '!pew'])
    assert.equal(lancioInChat(cfg, m), null, m);
  assert.equal(lancioInChat(normalizza({ voci: [VOCE] }), '!pew torta'), null, 'la chat spenta non lancia');
  assert.deepEqual(lancioInChat(normalizza({ comando: 'colpo', chat: { attivo: true }, voci: [VOCE] }), '!colpo torta'), { voce: 'torta', con: '' }, 'il comando e\' dello streamer');
});

test('la risposta: di serie nella lingua della chat, o quella dello streamer', () => {
  const cfg = normalizza({ chat: { attivo: true, risposte: { attesa: '{nome} calma, {sec}s' } } });
  assert.equal(rispostaChat(cfg, 'it', 'ok', { nome: '@m', colpo: 'Torta', prezzo: prezzoChat('it', 'misto', { monete: 10, bit: 30, moneta: 'gemme' }) }), '@m Torta lanciato (10 gemme + 30 Bit)');
  assert.equal(rispostaChat(cfg, 'en', 'ok', { nome: '@m', colpo: 'Cake', prezzo: prezzoChat('en', 'zaino') }), '@m Cake launched (from your backpack)');
  assert.equal(rispostaChat(cfg, 'es', 'no', { nome: '@m', colpo: 'Tarta', motivo: 'protetta' }), '@m Tarta ahora no sale: el punto está en una zona protegida');
  assert.equal(rispostaChat(cfg, 'it', 'no', { nome: '@m', colpo: 'T', motivo: 'boh' }), '@m T adesso non parte: riprova fra poco');
  assert.equal(rispostaChat(cfg, 'it', 'attesa', { nome: '@m', sec: 12 }), '@m calma, 12s');
  assert.equal(rispostaChat(cfg, 'it', 'altro'), '');
});

test('dalla chat: nel punto della chat, col primo mezzo che basta; lo zaino prima, che e\' gia\' pagato', () => {
  const b = banco();
  const c = login();
  points.dai(c, 'marta', 100);
  const m = b.s.mira(c, { voce: 'torta', chiave: 'x', spettatore: '21', dopo: true }).mira;
  b.s.daMonete(c, { id: m.id, user: 'marta' });
  assert.equal(economia.saldo(c, 'marta'), 60);
  const z = daChat(b, c);
  assert.deepEqual([z.esito, z.mezzo, economia.saldo(c, 'marta')], ['pagato', 'zaino', 60], 'dallo zaino, senza toccare le monete');
  assert.deepEqual([b.sparati[0].x, b.sparati[0].y, b.sparati[0].centro], [25, 75, true], 'nel punto della chat, col centro');
  assert.equal(b.s.zainoDi(c, '21').length, 0);
  const r = daChat(b, c);
  assert.deepEqual([r.esito, r.mezzo, r.monete, economia.saldo(c, 'marta')], ['pagato', 'monete', 40, 20], 'poi le monete');
  assert.equal(registroColpi.get(r.id).chi, 'Marta', 'col nome di chi scrive');
  const p = daChat(b, c);
  assert.deepEqual([p.esito, p.mezzo, p.serve, p.saldo, p.quale], ['pochi', 'monete', 40, 20, 'monete'], 'il saldo non basta: lo dice');
  pewBit.entra(c, '21', 100, 'cheer:a');
  assert.deepEqual([daChat(b, c).mezzo, pewBit.saldo(c, '21', b.ora())], ['bit', 0], 'poi i Bit da spendere');
  assert.equal(b.sparati.length, 3);
});

test('il mezzo chiesto, se lo streamer lo permette; il misto; il punto del colpo', () => {
  const b = banco({ chat: { con: ['monete', 'misto'] }, voce: { chat: { modo: 'punto', x: 80, y: 10 } } });
  const c = login();
  points.dai(c, 'marta', 100);
  pewBit.entra(c, '21', 100, 'cheer:b');
  assert.deepEqual(daChat(b, c, { con: 'bit' }), { esito: 'mezzo' }, 'i Bit in chat qui non li vuole');
  assert.equal(economia.saldo(c, 'marta'), 100);
  const r = daChat(b, c, { con: 'misto' });
  assert.deepEqual([r.esito, r.mezzo, economia.saldo(c, 'marta'), pewBit.saldo(c, '21', b.ora())], ['pagato', 'misto', 90, 70]);
  assert.deepEqual([b.sparati[0].x, b.sparati[0].y], [80, 10], 'il punto suo');
  b.cfg.voci[0].chat = { modo: 'no' };
  assert.deepEqual(daChat(b, c), { esito: 'mezzo' }, 'quel colpo dalla chat non parte');
});

test('niente a metà: un colpo che non parte non prende niente', () => {
  const b = banco({ chat: { x: 5, y: 5 } });
  const c = login();
  points.dai(c, 'marta', 100);
  b.cfg.zone = [{ x: 0, y: 0, w: 10, h: 10 }];
  assert.equal(puntoBuono(normalizza(b.cfg), 5, 5).ok, false);
  assert.deepEqual([daChat(b, c).motivo, economia.saldo(c, 'marta')], ['protetta', 100], 'il punto protetto');
  b.cfg.zone = [];
  b.stato.live = false;
  assert.deepEqual([daChat(b, c).motivo, economia.saldo(c, 'marta')], ['offline', 100], 'la diretta spenta');
  b.stato.live = true; b.cfg.pausa = true;
  assert.deepEqual([daChat(b, c).motivo, economia.saldo(c, 'marta')], ['pausa', 100]);
  b.cfg.pausa = false; b.cfg.chat.attivo = false;
  assert.deepEqual([daChat(b, c).esito, economia.saldo(c, 'marta')], ['mezzo', 100], 'la chat spenta');
  assert.equal(b.sparati.length, 0);
});

test('l\'attesa e\' della persona: dalla pagina alla chat e ritorno non si salta', () => {
  const b = banco();
  b.cfg.attesaSec = 30;
  const c = login();
  points.dai(c, 'marta', 1000);
  const p = creaPortaColpi({ servizio: b.s, registro: registroColpi, streamers: { get: () => ({ settings: { colpi: b.cfg } }) },
    effettoDi: () => ({ tipo: 'immagine', file: 'p.png' }), mezziEuro: () => [], apriPagamento: async () => ({}), inOnda: () => true, overlay: () => true, ora: b.ora });
  const io = { id: '21', login: 'marta', nome: 'Marta' };
  assert.equal(p.lancia(c, { voce: 'torta', con: 'monete', x: 50, y: 50 }, '1.2.3.4', io).ok, true);
  const a = daChat(b, c);
  assert.deepEqual([a.esito, a.fraSec, economia.saldo(c, 'marta')], ['attesa', 30, 960], 'dalla chat subito dopo la pagina: aspetta, e non paga');
  b.avanti(31_000);
  assert.equal(daChat(b, c).esito, 'pagato');
  assert.equal(p.lancia(c, { voce: 'torta', con: 'monete', x: 50, y: 50 }, '5.6.7.8', io).motivo, 'attesa', 'e dalla pagina, anche da un altro indirizzo');
  assert.equal(daChat(b, c, { chi: '22', user: 'luca' }).esito, 'pochi', 'un\'altra persona non aspetta per lei');
});

test('la pagina sa la parola della chat e il quadro dello streamer', () => {
  const b = banco();
  b.cfg.quadro = { l: 1080, a: 1920 };
  const c = login();
  const p = creaPortaColpi({ servizio: b.s, registro: registroColpi, streamers: { get: () => ({ settings: { colpi: b.cfg } }) },
    effettoDi: () => ({ tipo: 'immagine', file: 'p.png' }), mezziEuro: () => [], apriPagamento: async () => ({}), inOnda: () => true, overlay: () => true, ora: b.ora });
  assert.deepEqual([p.dati(c).voci[0].chat, p.dati(c).quadro], ['torta', { l: 1080, a: 1920 }]);
  b.cfg.chat.attivo = false;
  assert.equal(p.dati(c).voci[0].chat, '', 'chat spenta: niente parola');
});

test('un pixel resta un pixel: due decimali di percentuale bastano fino a 8192 px', () => {
  const pct = (px, lato) => Math.round(px / lato * 100 * 100) / 100;
  for (const lato of [160, 720, 1080, 1440, 1920, 2160, 2560, 3840, 7680, 8191, QUADRO.lato[1]]) {
    for (let px = 0; px <= lato; px++) {
      const x = pct(px, lato);
      assert.equal(Math.round(x * lato / 100), px, `${px} su ${lato}`);
      assert.equal(puntoBuono({ zone: [] }, x, 0).x, x, 'e il server la tiene com\'e\'');
    }
  }
});
