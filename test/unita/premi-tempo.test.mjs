// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I PREMI A PUNTI CANALE CHE DURANO (features/premi-tempo.js, docs/PREMI-A-TEMPO.md).
//
//  · la durata si legge dal nome solo se e' senza dubbi;
//  · la scelta dello streamer vince sul nome, e una durata letta dal nome vale
//    sempre «solo il tempo»;
//  · prima si fa la cosa che dura, poi si festeggia: se non si puo' fare, o se
//    il riscatto non sposta la fine, i punti tornano;
//  · un posto solo per ogni tempo: le modalita' della chat tengono il loro, e
//    l'elenco li legge da li';
//  · la fine si dice, anche dopo un riavvio, ma non quella vecchia;
//  · un VIP non si accorcia mai e uno dato a mano non si tocca.
// Twitch, l'orologio e le sveglie sono finti: il tempo va avanti quando lo dice
// la prova.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('premi-tempo-');
const { statoVivo, pointAlerts, vips, streamers } = await import('../../src/db.js');
const P = await import('../../src/features/premi-tempo.js');
const MC = await import('../../src/features/modalita-chat.js');
const { vipPerPremio } = await import('../../src/features/vip.js');
const { MOMENTI: FRASARIO } = await import('../../src/features/frasario/premi.js');
test.after(() => casa.pulisci());

const T0 = Date.parse('2026-10-06T21:00:00Z');
const M = 60_000;

// ── la durata scritta in un nome ──────────────────────────────────────────

test('la durata si legge dal nome come la scrive una persona, in tre lingue', () => {
  const casi = [
    ['Solo emote per 5 minuti', 300], ['Parla in inglese per 10 minuti', 600], ['VIP per un giorno', 86_400],
    ['VIP 1 settimana', 604_800], ['5 min di silenzio', 300], ['10min hydrate', 600], ['Timeout 30s', 30],
    ['1h 30m di musica', 5400], ['1h30 di musica', 5400], ["un'ora e mezza", 5400], ['1 ora e 30 minuti', 5400],
    ["mezz'ora senza HUD", 1800], ["Un quarto d'ora di karaoke", 900], ["tre quarti d'ora", 2700],
    ['Emote only 2 hours', 7200], ['An hour of chaos', 3600], ['Half an hour', 1800], ['2 hours and 15 minutes', 8100],
    ['Media hora de música', 1800], ['Solo emotes 5 minutos', 300], ['VIP por una semana', 604_800], ['1 día de VIP', 86_400],
    ['7d VIP', 604_800], ['VIP 1 mese', 2_592_000], ['24h senza parolacce', 86_400], ['un minuto e mezzo', 90],
    ['1,5 ore', 5400], ['0.5h', 1800], ['Dieci minuti di ballo', 600], ['cinque min', 300], ['Sei ore di diretta', 21_600],
  ];
  for (const [nome, s] of casi) assert.equal(P.durataDalTesto(nome), s, nome);
});

test('quello che non e\' una durata, o non lo e\' senza dubbi, non lo diventa', () => {
  for (const nome of [
    'Idratati ora', 'Sei ora il capo', 'Corri 100 m', 'Top 3', '1.000 punti', 'x2 punti', 'arriva a minuti',
    'A second chance', 'Per sempre VIP', 'Hydrate', '',
    'Ogni 5 minuti per 1 ora', '10 minuti e 5 minuti',
    '5 secondi', 'VIP 2 mesi',
  ]) assert.equal(P.durataDalTesto(nome), null, nome);
});

test('le parole del tempo, nella lingua della chat: le due unita\' piu\' grandi', () => {
  assert.equal(P.durataAParole(600, 'it'), '10 minuti');
  assert.equal(P.durataAParole(5400, 'it'), '1 ora e 30 minuti');
  assert.equal(P.durataAParole(90, 'en'), '1 minute and 30 seconds');
  assert.equal(P.durataAParole(93_600, 'es'), '1 día y 2 horas');
  assert.equal(P.durataAParole(1_209_600, 'en'), '2 weeks');
  assert.equal(P.durataAParole(86_400 + 3600 + 60, 'it'), '1 giorno e 1 ora');
  assert.equal(P.orologio(372_000), '6:12');
  assert.equal(P.orologio(3_723_000), '1:02:03');
  assert.equal(P.orologio(2 * 86_400_000 + 61_000, 'it'), '2 giorni e 1 minuto');
});

test('cosa fa pensare il nome e\' un suggerimento, e «togli il VIP» non suggerisce un VIP', () => {
  assert.equal(P.cosaDalNome('Solo emote 5 min'), 'emote');
  assert.equal(P.cosaDalNome('Emote-only 10m'), 'emote');
  assert.equal(P.cosaDalNome('Messaggi unici'), 'unici');
  assert.equal(P.cosaDalNome('Sub only 5 min'), 'sub');
  assert.equal(P.cosaDalNome('VIP 1 giorno'), 'vip');
  assert.equal(P.cosaDalNome('Togli il VIP per un giorno'), null);
  assert.equal(P.cosaDalNome('Parla in inglese'), null);
});

// ── la scelta dello streamer ──────────────────────────────────────────────

test('la scelta si pulisce, e quella di serie non e\' una scelta', () => {
  assert.equal(P.normTempo({ cosa: 'vip' }, 'kick').errore, 'solo-twitch');
  assert.equal(P.normTempo({ cosa: 'emote' }, 'kick').errore, 'solo-twitch');
  assert.equal(P.normTempo({ durata: 5 }).errore, 'durata');
  assert.equal(P.normTempo({ durata: 31 * 86_400 }).errore, 'durata');
  assert.equal(P.normTempo({ durata: 30, cosa: 'vip' }).errore, 'vip-corto');
  assert.equal(P.normTempo({ durata: 7200, cosa: 'emote' }).errore, 'modo-lungo');
  const t = P.normTempo({ cosa: 'qualcosa', doppio: 'boh', testoFine: '  ciao   {user}  ' }).tempo;
  assert.deepEqual(t, { spento: false, durata: 0, cosa: 'tempo', doppio: 'somma', fineChat: true, testoFine: 'ciao {user}' });
  assert.equal(P.eDiSerie(P.normTempo({}).tempo), true);
  assert.equal(P.eDiSerie(P.normTempo({ doppio: 'adesso' }).tempo), false);
  assert.equal(P.eDiSerie(P.normTempo({ spento: true }).tempo), false);
});

test('il tempo che vale: la scelta, se no il nome, se no la descrizione; dal nome e\' sempre «solo il tempo»', () => {
  const premio = { title: 'Solo emote 5 minuti', prompt: '' };
  assert.deepEqual(P.tempoDi(null, premio), { durata: 300, origine: 'nome', cosa: 'tempo', doppio: 'somma', fineChat: true, testoFine: '' });
  assert.equal(P.tempoDi({ durata: 900 }, premio).durata, 900, 'la scelta vince sul nome');
  assert.equal(P.tempoDi({ durata: 900 }, premio).origine, 'scelta');
  assert.equal(P.tempoDi({ spento: true }, premio), null, '«non e\' a tempo» vince sul nome');
  assert.equal(P.tempoDi(null, { title: 'Sfida', prompt: 'Gioca senza HUD per 10 minuti' }).origine, 'descrizione');
  assert.equal(P.tempoDi(null, { title: 'Idratati' }), null);
  assert.equal(P.tempoDi({ cosa: 'emote' }, { title: 'Solo emote 2 ore' }).durata, MC.DURATA_MAX, 'una modalita\' della chat dura al massimo un\'ora');
  assert.equal(P.tempoDi({ cosa: 'vip' }, { title: 'VIP 30 secondi' }).durata, P.VIP_MIN);
  assert.equal(P.tempoDi({ cosa: 'emote' }, premio, 'kick').cosa, 'tempo', 'su Kick una modalita\' di Twitch non vale');
});

// ── il mondo finto ────────────────────────────────────────────────────────

let n = 0;
function mondo({ chat = {}, rimborsa = true } = {}) {
  const ch = 'canale' + (++n);
  streamers.upsertApproved(ch, ch, String(1000 + n));
  const statoChat = { emote_mode: false, unique_chat_mode: false, subscriber_mode: false, ...chat };
  let ora = T0;
  let seq = 0;
  const sveglie = new Map();
  const detti = [];
  const overlay = [];
  const chiusi = [];
  const finiti = [];
  const vipChiesti = [];
  const orologio = () => ora;
  const timer = (fn, ms) => { const id = ++seq; sveglie.set(id, { fn, quando: ora + ms, ms }); return id; };
  const annulla = (id) => sveglie.delete(id);
  const helix = {
    leggiChat: async () => ({ ...statoChat }),
    impostaChat: async (_c, campi) => { Object.assign(statoChat, campi); return { ok: true }; },
  };
  const modalita = new MC.ModalitaChat({ helix, say: (_c, t) => detti.push(['twitch', t]), orologio, timer, annulla });
  const vipRisposte = [];
  const motore = new P.PremiATempo({
    say: (_c, t, dove) => detti.push([dove, t]),
    emit: (_c, p) => overlay.push(p),
    modalita,
    vip: async (...a) => { vipChiesti.push(a); return vipRisposte.shift() || { ok: false, motivo: 'nessuna risposta' }; },
    vipScade: (ms) => vipChiesti.push(['sveglia', ms]),
    quandoFinisce: (_c, r) => finiti.push(r.titolo),
    orologio, timer, annulla,
  });
  modalita.quandoCambia = (c) => motore.manda(c);
  const premiatore = { aggiornaRedemption: async (_c, rid, id, stato) => { chiusi.push([rid, id, stato]); return stato === 'CANCELED' ? rimborsa : true; } };
  async function avanti(ms) {
    const fine = ora + ms;
    for (;;) {
      const p = [...sveglie.entries()].filter(([, s]) => s.quando <= fine).sort((a, b) => a[1].quando - b[1].quando)[0];
      if (!p) break;
      sveglie.delete(p[0]);
      ora = Math.max(ora, p[1].quando);
      await p[1].fn();
      await new Promise((r) => setImmediate(r));
    }
    ora = fine;
  }
  let id = 0;
  const riscatta = (titolo, cfg, { chi = 'Luna', dove = 'twitch', rewardId = 'r-' + titolo, detto = false } = {}) => {
    const data = { id: 'red' + (++id), user_name: chi, user_login: chi.toLowerCase(), piattaforma: dove, reward: { id: rewardId, title: titolo } };
    const avvisi = [];
    const p = motore.daRiscatto(ch, data, cfg, { premiatore, avviso: (o) => { avvisi.push(o); return { detto }; } });
    return p.then((r) => ({ ...r, avvisi }));
  };
  return { ch, statoChat, detti, overlay, chiusi, finiti, vipChiesti, vipRisposte, sveglie, motore, modalita, avanti, riscatta, ora: () => ora };
}

// Una frase detta viene da un momento se combacia con una delle sue frasi, in
// qualunque lingua e tono: i segni ({nome}, {:💜}, {x|uno|#}) valgono qualunque
// cosa, il resto e' scritto.
const regole = (momento) => {
  const m = FRASARIO[momento];
  const tutte = Object.values(m.frasi).flatMap((t) => Object.values(t).flat());
  return tutte.map((f) => new RegExp('^' + f.split(/\{[^}]*\}/).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\S]*?') + '$'));
};
const viene = (_ch, momento, testo) => regole(momento).some((r) => r.test(String(testo).trim()));

// ── «solo il tempo» ───────────────────────────────────────────────────────

test('un premio «solo il tempo»: parte, si vede, si chiude il riscatto, e alla fine la chat lo sente', async () => {
  const w = mondo();
  const cfg = P.tempoDi(null, { title: 'Parla in inglese per 10 minuti' });
  const r = await w.riscatta('Parla in inglese per 10 minuti', cfg);
  assert.equal(r.esito, 'via');
  assert.equal(r.fino, T0 + 10 * M);
  assert.deepEqual(r.avvisi, [{ chiudi: false, durata: '10 minuti' }], 'effetto e messaggio del premio, senza chiuderlo due volte');
  assert.deepEqual(w.chiusi.map((x) => x[2]), ['FULFILLED']);
  assert.equal(w.detti.length, 1);
  assert.ok(w.detti[0][1].includes('Parla in inglese per 10 minuti') && w.detti[0][1].includes('Luna'), w.detti[0][1]);
  const el = P.inCorso(w.ch, w.ora());
  assert.equal(el.length, 1);
  assert.deepEqual([el[0].titolo, el[0].chi, el[0].fino], ['Parla in inglese per 10 minuti', ['Luna'], T0 + 10 * M]);
  assert.equal(w.overlay.at(-1).elenco.length, 1, 'l\'overlay lo sa');
  await w.avanti(10 * M);
  assert.equal(P.inCorso(w.ch, w.ora()).length, 0);
  assert.equal(w.overlay.at(-1).elenco.length, 0, 'e sa anche che e\' finito');
  assert.equal(w.detti.length, 2);
  assert.ok(viene(w.ch, 'premio-tempo-fine', w.detti[1][1]), w.detti[1][1]);
  assert.deepEqual(w.finiti, ['Parla in inglese per 10 minuti'], 'la fine e\' un evento per i Moduli');
});

test('il messaggio del premio vince sulla frase di partenza, e la fine si puo\' scrivere o tacere', async () => {
  const w = mondo();
  await w.riscatta('Sfida 1 minuto', { ...P.tempoDi(null, { title: 'Sfida 1 minuto' }), testoFine: 'Fine della sfida di {user}: «{premio}»!' }, { detto: true });
  assert.equal(w.detti.length, 0, 'il messaggio suo lo dice chi fa l\'avviso');
  await w.avanti(M);
  assert.deepEqual(w.detti, [['twitch', 'Fine della sfida di Luna: «Sfida 1 minuto»!']]);
  const z = mondo();
  await z.riscatta('Muto 1 minuto', { ...P.tempoDi(null, { title: 'Muto 1 minuto' }), fineChat: false });
  await z.avanti(M);
  assert.equal(z.detti.length, 1, 'solo la partenza');
  assert.deepEqual(z.finiti, ['Muto 1 minuto'], 'i Moduli lo sanno lo stesso');
});

test('riscattato mentre corre: «si somma» sposta la fine, e chi ha pagato si aggiunge', async () => {
  const w = mondo();
  const cfg = P.tempoDi(null, { title: 'Niente HUD 10 minuti' });
  await w.riscatta('Niente HUD 10 minuti', cfg);
  await w.avanti(4 * M);
  const r = await w.riscatta('Niente HUD 10 minuti', cfg, { chi: 'Marco' });
  assert.equal(r.esito, 'piu');
  assert.equal(r.fino, T0 + 20 * M);
  assert.deepEqual(P.inCorso(w.ch, w.ora())[0].chi, ['Luna', 'Marco']);
  assert.ok(viene(w.ch, 'premio-tempo-piu', w.detti.at(-1)[1]) && w.detti.at(-1)[1].includes('16 minuti'), w.detti.at(-1)[1]);
  await w.avanti(16 * M - 1);
  assert.equal(P.inCorso(w.ch, w.ora()).length, 1);
  await w.avanti(1);
  assert.equal(P.inCorso(w.ch, w.ora()).length, 0);
});

test('«riparte da adesso» che non sposta la fine non compra niente: i punti tornano', async () => {
  const w = mondo();
  const cfg = { ...P.tempoDi(null, { title: 'Sfida 10 minuti' }), doppio: 'adesso' };
  await w.riscatta('Sfida 10 minuti', cfg);
  await w.avanti(2 * M);
  const r = await w.riscatta('Sfida 10 minuti', cfg, { chi: 'Marco' });
  assert.equal(r.esito, 'piu', 'riparte: 10 minuti da adesso finiscono piu\' tardi');
  assert.equal(r.fino, T0 + 12 * M);
  const no = await w.riscatta('Sfida 10 minuti', { ...cfg, durata: 60 }, { chi: 'Bea' });
  assert.equal(no.esito, 'no');
  assert.equal(w.chiusi.at(-1)[2], 'CANCELED');
  assert.ok(viene(w.ch, 'premio-tempo-rimborso', w.detti.at(-1)[1]), w.detti.at(-1)[1]);
  assert.equal(no.avvisi.length, 0, 'niente festa per un riscatto annullato');
  assert.deepEqual(P.inCorso(w.ch, w.ora())[0].chi, ['Luna', 'Marco'], 'chi ha riavuto i punti non c\'e\'');
});

test('un rimborso che Twitch non fa non si promette', async () => {
  const w = mondo({ rimborsa: false });
  const cfg = { ...P.tempoDi(null, { title: 'Sfida 10 minuti' }), doppio: 'adesso' };
  await w.riscatta('Sfida 10 minuti', cfg);
  await w.riscatta('Sfida 10 minuti', { ...cfg, durata: 60 }, { chi: 'Bea' });
  assert.ok(viene(w.ch, 'premio-tempo-no', w.detti.at(-1)[1]), w.detti.at(-1)[1]);
});

test('fermarlo prima e\' farlo finire: la chat lo sente', async () => {
  const w = mondo();
  await w.riscatta('Sfida 10 minuti', P.tempoDi(null, { title: 'Sfida 10 minuti' }));
  assert.equal(await w.motore.ferma(w.ch, 'p:r-Sfida 10 minuti'), true);
  assert.equal(P.inCorso(w.ch, w.ora()).length, 0);
  assert.ok(viene(w.ch, 'premio-tempo-fine', w.detti.at(-1)[1]));
  assert.equal(await w.motore.ferma(w.ch, 'p:r-Sfida 10 minuti'), false, 'due volte no');
  await w.avanti(11 * M);
  assert.equal(w.detti.length, 2, 'e la sveglia di prima non lo fa finire di nuovo');
});

test('un premio di 30 giorni non si fida di un setTimeout: dorme al massimo un\'ora per volta', async () => {
  const w = mondo();
  await w.riscatta('VIP finto 30 giorni', { ...P.tempoDi(null, { title: '30 giorni' }) });
  for (const s of w.sveglie.values()) assert.ok(s.ms <= 3_600_000, `una sveglia di ${s.ms} ms`);
  await w.avanti(2 * 3_600_000);
  assert.equal(P.inCorso(w.ch, w.ora()).length, 1, 'dopo due ore corre ancora');
  await w.avanti(30 * 86_400_000);
  assert.equal(P.inCorso(w.ch, w.ora()).length, 0);
});

test('dopo un riavvio: quello che corre riparte, lo scaduto da poco si dice, il vecchio finisce in silenzio', async () => {
  const w = mondo();
  const ch = w.ch;
  statoVivo.scrivi(ch, 'premi-tempo', { lista: [
    { chiave: 'p:a', rewardId: 'a', titolo: 'Corre', chi: ['Luna'], dove: 'twitch', da: T0 - M, fino: T0 + 5 * M, fineChat: true },
    { chiave: 'p:b', rewardId: 'b', titolo: 'Appena scaduto', chi: ['Marco'], dove: 'kick', da: T0 - 10 * M, fino: T0 - 5 * M, fineChat: true },
    { chiave: 'p:c', rewardId: 'c', titolo: 'Vecchio', chi: ['Bea'], dove: 'twitch', da: T0 - 3 * 3_600_000, fino: T0 - 3_600_000, fineChat: true },
  ] });
  w.motore.riprendi();
  await w.avanti(10_000);
  const detti = w.detti.filter(([, t]) => /Appena scaduto|Vecchio|Corre/.test(t));
  assert.deepEqual(detti.map(([d, t]) => [d, /Appena scaduto/.test(t)]), [['kick', true]], 'si dice dove era stato riscattato, e il vecchio no');
  assert.deepEqual(P.inCorso(ch, w.ora()).map((x) => x.titolo), ['Corre']);
  assert.ok(!w.finiti.includes('Vecchio'), 'una fine vecchia non e\' un evento');
  await w.avanti(5 * M);
  assert.deepEqual(P.inCorso(ch, w.ora()), []);
});

test('la prova dal pannello: solo in scena, niente chat e niente evento; un riscatto vero la sostituisce', async () => {
  const w = mondo();
  assert.deepEqual(w.motore.prova(w.ch, { rewardId: 'r1', titolo: 'Niente HUD 10 minuti', durata: 600, chi: 'Giada' }), { fino: T0 + 10 * M });
  assert.deepEqual(P.inCorso(w.ch, w.ora()).map((x) => [x.titolo, x.chi]), [['Niente HUD 10 minuti', ['Giada']]]);
  assert.equal(w.overlay.at(-1).elenco.length, 1, 'la scena la vede');
  assert.equal(w.detti.length, 0, 'la chat no');
  await w.avanti(2 * M);
  const r = await w.riscatta('Niente HUD 10 minuti', P.tempoDi(null, { title: 'Niente HUD 10 minuti' }), { rewardId: 'r1' });
  assert.equal(r.esito, 'via', 'un riscatto vero non si somma a una prova');
  assert.equal(r.fino, T0 + 12 * M);
  assert.deepEqual(P.inCorso(w.ch, w.ora())[0].chi, ['Luna']);
  w.motore.prova(w.ch, { rewardId: 'r2', titolo: 'Prova 1 minuto', durata: 60 });
  await w.avanti(M);
  assert.ok(!w.finiti.includes('Prova 1 minuto'), 'la fine di una prova non e\' un evento dei Moduli');
  assert.ok(!w.detti.some(([, t]) => t.includes('Prova 1 minuto')), 'e non si dice in chat');
  assert.equal(w.motore.prova(w.ch, { rewardId: 'r3', titolo: 'Troppo corto', durata: 5 }), null);
});

// ── le modalita' della chat ───────────────────────────────────────────────

test('chat in solo emote da un premio: la riga della modalita\' ricorda premio e chi, e l\'elenco la legge da li\'', async () => {
  const w = mondo();
  const cfg = { ...P.tempoDi(null, { title: 'Solo emote 5 minuti' }), cosa: 'emote' };
  const r = await w.riscatta('Solo emote 5 minuti', cfg);
  assert.equal(r.esito, 'via');
  assert.equal(w.statoChat.emote_mode, true);
  const el = P.inCorso(w.ch, w.ora());
  assert.deepEqual(el.map((x) => [x.chiave, x.titolo, x.chi, x.fino]), [['m:emote', 'Solo emote 5 minuti', ['Luna'], T0 + 5 * M]]);
  assert.ok(w.overlay.length >= 1 && w.overlay.at(-1).elenco.length === 1, 'la modalita\' lo dice all\'overlay');
  assert.equal(w.detti.length, 1, 'una frase sola: la modalita\' accesa dal premio non si annuncia due volte');
  await w.avanti(2 * M);
  const piu = await w.riscatta('Solo emote 5 minuti', cfg, { chi: 'Marco' });
  assert.equal(piu.esito, 'piu');
  assert.equal(piu.fino, T0 + 10 * M, 'si somma');
  assert.deepEqual(P.inCorso(w.ch, w.ora())[0].chi, ['Luna', 'Marco']);
  await w.avanti(8 * M);
  assert.equal(w.statoChat.emote_mode, false, 'alla fine la chat torna com\'era');
  assert.deepEqual(P.inCorso(w.ch, w.ora()), []);
  assert.equal(w.overlay.at(-1).elenco.length, 0);
});

test('la chat gia\' in solo emote per mano di un mod: il premio non si fa e i punti tornano', async () => {
  const w = mondo({ chat: { emote_mode: true } });
  const r = await w.riscatta('Solo emote 5 minuti', { ...P.tempoDi(null, { title: 'Solo emote 5 minuti' }), cosa: 'emote' });
  assert.equal(r.esito, 'no');
  assert.equal(w.chiusi.at(-1)[2], 'CANCELED');
  assert.equal(r.avvisi.length, 0);
  assert.deepEqual(P.inCorso(w.ch, w.ora()), [], 'e non si programma niente: spegnerla vorrebbe dire disfare il mod');
});

test('gia\' al tetto di un\'ora: un altro riscatto non cambierebbe niente, e i punti tornano senza toccare la chat', async () => {
  const w = mondo();
  const cfg = { ...P.tempoDi(null, { title: 'Solo emote 40 minuti' }), cosa: 'emote' };
  await w.riscatta('Solo emote 40 minuti', cfg);
  const due = await w.riscatta('Solo emote 40 minuti', cfg, { chi: 'Marco' });
  assert.equal(due.esito, 'piu');
  assert.equal(due.fino, T0 + 60 * M, 'si somma fino al tetto');
  const tre = await w.riscatta('Solo emote 40 minuti', cfg, { chi: 'Bea' });
  assert.equal(tre.esito, 'no');
  assert.deepEqual(P.inCorso(w.ch, w.ora())[0].chi, ['Luna', 'Marco']);
});

test('una modalita\' accesa a tempo da un mod si vede col suo nome, nella lingua della chat', async () => {
  const w = mondo();
  await w.modalita.accendiPer(w.ch, 'unici', 120, { annuncia: false });
  assert.deepEqual(P.inCorso(w.ch, w.ora()).map((x) => [x.titolo, x.chi]), [['Messaggi unici', []]]);
  assert.equal(await w.motore.ferma(w.ch, 'm:unici'), true, 'si ferma come con !messaggiunici off');
  assert.equal(w.statoChat.unique_chat_mode, false);
});

// ── il VIP ────────────────────────────────────────────────────────────────

test('VIP a chi lo riscatta: si da\', la ronda si sveglia alla fine; se non si puo\', i punti tornano', async () => {
  const w = mondo();
  const cfg = { ...P.tempoDi(null, { title: 'VIP per un giorno' }), cosa: 'vip' };
  w.vipRisposte.push({ ok: true, esito: 'via', fino: T0 + 86_400_000 });
  const r = await w.riscatta('VIP per un giorno', cfg);
  assert.equal(r.esito, 'via');
  assert.deepEqual(w.vipChiesti[0], [w.ch, 'luna', 86_400_000, 'somma']);
  assert.deepEqual(w.vipChiesti[1], ['sveglia', 86_400_000]);
  assert.deepEqual(P.inCorso(w.ch, w.ora()), [], 'un VIP non e\' un conto alla rovescia sull\'overlay');
  w.vipRisposte.push({ ok: false, motivo: 'gia' });
  const no = await w.riscatta('VIP per un giorno', cfg, { chi: 'Marco' });
  assert.equal(no.esito, 'no');
  assert.equal(w.chiusi.at(-1)[2], 'CANCELED');
  const k = await w.riscatta('VIP per un giorno', cfg, { chi: 'Bea', dove: 'kick' });
  assert.equal(k.esito, 'no', 'su Kick un VIP di Twitch non si da\'');
});

function twitchVip({ vipDiTwitch = [], aggiungi = { ok: true } } = {}) {
  const chiesti = [];
  return {
    chiesti,
    getVips: async () => (vipDiTwitch === null ? null : vipDiTwitch.map((u) => ({ user_login: u }))),
    getUserByLogin: async (l) => ({ id: 'id-' + l, display_name: l.toUpperCase() }),
    addVip: async (_c, id) => { chiesti.push(id); return aggiungi; },
  };
}

test('il VIP di un premio: nuovo, allungato, mai accorciato, e mai sopra un VIP che non e\' nostro e a tempo', async () => {
  const ch = 'vipcanale';
  let h = twitchVip();
  assert.deepEqual(await vipPerPremio(h, ch, 'Luna', 3_600_000, 'somma', T0), { ok: true, esito: 'via', fino: T0 + 3_600_000 });
  assert.equal(vips.get(ch, 'luna').until, T0 + 3_600_000);
  h = twitchVip();
  assert.deepEqual(await vipPerPremio(h, ch, 'luna', 3_600_000, 'somma', T0 + M), { ok: true, esito: 'piu', fino: T0 + 7_200_000 }, 'si somma alla fine');
  assert.equal((await vipPerPremio(twitchVip(), ch, 'luna', 600_000, 'adesso', T0 + M)).motivo, 'gia', 'riparte da adesso, ma finirebbe prima: niente');
  assert.equal(vips.get(ch, 'luna').until, T0 + 7_200_000, 'e non si e\' accorciato');
  vips.set(ch, { user: 'perenne', until: 0, dirette: 0 });
  assert.equal((await vipPerPremio(twitchVip(), ch, 'perenne', 600_000)).motivo, 'gia', 'un VIP per sempre resta per sempre');
  vips.set(ch, { user: 'premiato', until: 0, dirette: 3 });
  assert.equal((await vipPerPremio(twitchVip(), ch, 'premiato', 600_000)).motivo, 'gia', 'un VIP a dirette non diventa a tempo');
  assert.equal(vips.get(ch, 'premiato').dirette, 3);
  h = twitchVip({ vipDiTwitch: ['amica'] });
  assert.equal((await vipPerPremio(h, ch, 'Amica', 600_000)).motivo, 'gia', 'un VIP dato a mano dallo streamer non si tocca');
  assert.deepEqual(h.chiesti, [], 'e a Twitch non si chiede nemmeno di darlo');
  assert.equal(vips.get(ch, 'amica'), null, 'niente riga a tempo che la ronda poi toglierebbe');
  assert.equal((await vipPerPremio(twitchVip({ vipDiTwitch: null }), ch, 'nuovo', 600_000)).motivo, 'twitch', 'se Twitch non dice chi e\' VIP, non si rischia');
  assert.equal((await vipPerPremio(twitchVip({ aggiungi: { ok: false, motivo: 'posti finiti' } }), ch, 'altro', 600_000)).motivo, 'posti finiti');
});

// ── !tempi ────────────────────────────────────────────────────────────────

test('!tempi dice cosa corre e quanto manca; un mod lo ferma, tutto o per nome', async () => {
  const w = mondo();
  const detti = [];
  const say = (t) => detti.push(t);
  const msg = (text, extra = {}) => ({ channel: w.ch, text, user: 'x', ...extra });
  assert.equal(await P.tryComando(w.motore, msg('!tempi'), say), true);
  assert.ok(viene(w.ch, 'tempi-vuoto', detti.at(-1)), detti.at(-1));
  await w.riscatta('Parla in inglese 10 minuti', P.tempoDi(null, { title: 'Parla in inglese 10 minuti' }));
  await w.riscatta('Niente HUD 5 minuti', P.tempoDi(null, { title: 'Niente HUD 5 minuti' }));
  await P.tryComando(w.motore, msg('!tempi'), say);
  assert.ok(detti.at(-1).includes('Niente HUD 5 minuti 5:00, Parla in inglese 10 minuti 10:00'), detti.at(-1));
  await P.tryComando(w.motore, msg('!tempi stop hud'), say);
  assert.equal(P.inCorso(w.ch, w.ora()).length, 2, 'chi non e\' mod vede solo l\'elenco');
  await P.tryComando(w.motore, msg('!tempi stop hud', { isMod: true }), say);
  assert.deepEqual(P.inCorso(w.ch, w.ora()).map((x) => x.titolo), ['Parla in inglese 10 minuti']);
  await P.tryComando(w.motore, msg('!tempi stop', { isBroadcaster: true }), say);
  assert.deepEqual(P.inCorso(w.ch, w.ora()), []);
  assert.equal(await P.tryComando(w.motore, msg('!tempismo'), say), false);
});

// ── la riga del premio ────────────────────────────────────────────────────

test('la scelta del tempo e l\'avviso di un premio stanno nella stessa riga senza cancellarsi', () => {
  const ch = 'righe';
  pointAlerts.add(ch, { rewardId: 'x', titolo: 'Airhorn 5 min', costo: 100, effetto: 'airhorn', testo: 'ciao' });
  pointAlerts.impostaTempo(ch, { rewardId: 'x', titolo: 'Airhorn 5 min', costo: 100, tempo: { durata: 60, cosa: 'tempo' } });
  let r = pointAlerts.getByReward(ch, 'x');
  assert.equal(r.effetto, 'airhorn');
  assert.deepEqual(P.leggiSalvato(r), { durata: 60, cosa: 'tempo' });
  pointAlerts.togliAvviso(ch, 'x');
  r = pointAlerts.getByReward(ch, 'x');
  assert.ok(r && !r.effetto && !r.testo && r.tempo, 'via l\'avviso, il tempo resta');
  pointAlerts.impostaTempo(ch, { rewardId: 'x', tempo: null });
  assert.equal(pointAlerts.getByReward(ch, 'x'), null, 'senza avviso e senza tempo la riga non serve piu\'');
  pointAlerts.impostaTempo(ch, { rewardId: 'nuovo', titolo: 'Sfida', costo: 50, tempo: { spento: true } });
  assert.equal(P.tempoDelRiscatto(ch, { reward: { id: 'nuovo', title: 'Sfida 10 minuti' } }), null, 'una riga solo per il tempo nasce e vale');
  assert.equal(P.tempoDelRiscatto(ch, { reward: { id: 'altro', title: 'Sfida 10 minuti' } }).durata, 600, 'senza riga vale il nome');
});
