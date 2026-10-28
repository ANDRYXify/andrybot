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
const { registroColpi, points } = await import('../../src/db.js');
const economia = await import('../../src/features/economia.js');
const { creaServizioColpi, MIRABILE } = await import('../../src/features/colpi-servizio.js');

function banco({ cfg, live = true, overlay = true, rimborso = { ok: true }, conMonete = false } = {}) {
  let adesso = 1_000_000;
  // le monete del canale vere (economia.js, sul database usa e getta): un finto
  // potrebbe dire cose diverse da quelle che il servizio riceve davvero
  const monete = conMonete ? { punta: economia.punta, rendi: economia.rendi, saldo: economia.saldo } : null;
  const sparati = [], rimborsi = [], premi = [];
  const stato = { live, overlay };
  const effetti = { pomodoro: { tipo: 'immagine' }, coriandoli: { tipo: 'disegno' }, sfondo: { tipo: 'video', schermo: 'riempi' } };
  const s = creaServizioColpi({
    registro: registroColpi,
    effects: { fireConOpzioni: (login, comando, o) => { sparati.push({ login, comando, ...o }); return true; } },
    effettoDi: (login, c) => effetti[c] || null,
    impostazioni: () => cfg || { attivo: true, attesaSec: 30, alMinuto: 3, voci: [{ comando: 'pomodoro', euro: 200, punti: 500, bit: 100, scala: 120, premio: 'aaaaaaaa-1111' }, { comando: 'coriandoli', bit: 50 }], zone: [{ x: 70, y: 60, w: 30, h: 40 }] },
    inOnda: () => stato.live,
    overlay: () => stato.overlay,
    rimborsaEuro: async (login, id) => { rimborsi.push({ login, id }); return rimborso; },
    chiudiPremio: async (login, premio, riscatto, st) => { premi.push({ login, v: [premio, riscatto, st] }); return true; },
    monete,
    ora: () => adesso,
  });
  // la ronda passa su tutto il registro, che le prove condividono: ogni prova
  // guarda solo il suo canale
  const di = (c) => ({ sparati: sparati.filter((x) => x.login === c), rimborsi: rimborsi.filter((x) => x.login === c).map((x) => x.id), premi: premi.filter((x) => x.login === c).map((x) => x.v) });
  return { s, sparati, di, stato, avanti: (ms) => { adesso += ms; }, ora: () => adesso };
}
let n = 0;
const login = () => `canale${++n}`;

test('si mira solo dal vivo, su un effetto che si posa in un punto, fuori dalle zone protette', () => {
  const { s } = banco();
  const c = login();
  assert.equal(banco({ live: false }).s.mira(c, { voce: 'pomodoro', x: 10, y: 10 }).motivo, 'offline');
  assert.equal(banco({ overlay: false }).s.mira(c, { voce: 'pomodoro', x: 10, y: 10 }).motivo, 'overlay', 'senza overlay aperto un colpo pagato non lo vedrebbe nessuno');
  assert.equal(s.mira(c, { voce: 'coriandoli', x: 10, y: 10 }).motivo, 'effetto', 'un disegno a tutto schermo non si mira');
  assert.equal(s.mira(c, { voce: 'pomodoro', x: 80, y: 80 }).motivo, 'protetta');
  const ok = s.mira(c, { voce: 'pomodoro', x: 25.5, y: 40, chi: 'Marta', chiave: 'ip1' });
  assert.equal(ok.ok, true);
  assert.deepEqual([ok.mira.x, ok.mira.y, ok.mira.chi, ok.mira.prezzi], [25.5, 40, 'Marta', { euro: 200, punti: 500, bit: 100, monete: 0, misti: {}, resa: 0, rendiColpi: true, rendiMire: true }], 'la resa dei Bit da spendere: senza il loro registro, zero; e se tornano, come li vuole lo streamer adesso');
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
  const poco = b.s.daCheer(c, { bits: 60, message: `Cheer60 ${mira.codice}` });
  assert.deepEqual([poco.esito, poco.mancano], ['pochi', 40], 'meno Bit del prezzo: il colpo aspetta, e i Bit restano contati');
  assert.equal(b.sparati.length, 0);
  assert.equal(b.s.daCheer(c, { bits: 40, message: `cheer40 ${mira.codice.toLowerCase()} dai` }).esito, 'pagato', 'col secondo cheer si arriva al prezzo');
  assert.equal(b.s.daCheer(c, { bits: 100, message: `Cheer100 ${mira.codice}` }).esito, 'sconosciuto', 'un codice usato non vale piu\'');
  assert.equal(b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: mira.codice }).stato, 'CANCELED', 'e i punti tornano');
  assert.equal(b.sparati.length, 1);
  assert.deepEqual(b.sparati[0], { login: c, comando: 'pomodoro', xy: { x: 25, y: 40, s: 120, r: 0, centro: true }, attacco: { id: mira.id, chi: 'Marta', nome: 'pomodoro' } });
});

test('i punti: il premio della voce col codice giusto spara; un codice sbagliato restituisce i punti', () => {
  const b = banco();
  const c = login();
  const { mira } = b.s.mira(c, { voce: 'pomodoro', x: 5, y: 5, chiave: 'p' });
  assert.equal(b.s.daRiscatto(c, { reward_id: 'zzzzzzzz-0000', user_input: mira.codice }).esito, 'non-mio', 'un premio che non e\' dei colpi non si tocca');
  assert.equal(b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: 'boh' }).stato, 'CANCELED');
  const r = b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: `codice: ${mira.codice}` });
  assert.deepEqual([r.esito, r.stato], ['pagato', null], 'pagato: il riscatto resta aperto finche\' l\'overlay non lo mostra');
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
  assert.equal(b.s.daPagamento('stripe:cs_prova_1').esito, 'pagato');
  assert.equal(b.s.daPagamento('stripe:cs_prova_1').esito, 'gia', 'la ronda che ripassa non spara di nuovo');
  const altra = b.s.mira(c, { voce: 'pomodoro', x: 50, y: 50, chiave: 'f' }).mira;
  b.avanti(16 * 60_000);
  registroColpi.pulisci(b.ora());
  assert.equal(registroColpi.get(altra.id).stato, 'scaduta', 'senza pagamento la mira scade dopo un quarto d\'ora');
  assert.equal(b.s.daCheer(c, { bits: 500, message: `Cheer500 ${altra.codice}` }).esito, 'sconosciuto');
});

test('una mira si paga in un modo solo; i Bit gia\' arrivati tengono aperta la mira', () => {
  const b = banco();
  const c = login();
  const { mira } = b.s.mira(c, { voce: 'pomodoro', x: 50, y: 50, chiave: 'g' });
  assert.equal(registroColpi.lega(mira.id, 'apre:' + mira.id), true, 'la presa per aprire il pagamento');
  assert.equal(registroColpi.lega(mira.id, 'apre:' + mira.id), false, 'un secondo tocco su «Paga» non apre un secondo pagamento');
  assert.equal(b.s.daCheer(c, { bits: 100, message: `Cheer100 ${mira.codice}` }).esito, 'sconosciuto', 'col pagamento in euro aperto il codice non vale per i Bit');
  assert.equal(registroColpi.rilega(mira.id, 'apre:' + mira.id, ''), true, 'il pagamento non si e\' aperto: la mira torna libera');
  assert.equal(b.s.daCheer(c, { bits: 30, message: `Cheer30 ${mira.codice}` }).mancano, 70);
  b.avanti(20 * 60_000);
  registroColpi.pulisci(b.ora());
  assert.equal(registroColpi.get(mira.id).stato, 'attesa', 'i 30 Bit arrivati non si perdono con la scadenza');
  assert.equal(b.s.daCheer(c, { bits: 70, message: `Cheer70 ${mira.codice}` }).esito, 'pagato');
});

// LA PORTA della pagina: quello che le rotte pubbliche rispondono.
const { creaPortaColpi } = await import('../../src/features/colpi-porta.js');

function porta({ euro = ['stripe'], apri } = {}) {
  const cfg = { attivo: true, attesaSec: 0, alMinuto: 30, voci: [
    { comando: 'pomodoro', nome: 'Pomodoro', euro: 200, punti: 500, bit: 100, scala: 120 },
    { comando: 'coriandoli', bit: 50 },
    { id: 'solopunti', comando: 'pomodoro', punti: 300 },
  ] };
  const b = banco({ cfg });
  const c = login();
  const aperti = [];
  const p = creaPortaColpi({
    servizio: b.s, registro: registroColpi, streamers: { get: () => ({ display: 'Canale', settings: { colpi: cfg, donazioni: { valuta: 'EUR' } } }) },
    effettoDi: (l, k) => ({ pomodoro: { tipo: 'immagine', file: 'abc.png' }, coriandoli: { tipo: 'disegno' } })[k] || null,
    mezziEuro: () => euro, apriPagamento: apri || (async (mezzo, d) => { aperti.push({ mezzo, ...d }); return { url: 'https://paga.example/' + aperti.length, id: 'cs_prova_' + c + aperti.length }; }),
    inOnda: () => true, overlay: () => true, ora: b.ora,
  });
  return { p, c, b, aperti };
}

test('la pagina offre solo quello che si puo\' pagare davvero', () => {
  const { p, c } = porta({ euro: [] });
  const d = p.dati(c);
  assert.deepEqual(d.voci.map((v) => [v.id, v.metodi]), [['pomodoro', ['bit']]], 'senza conto niente euro, senza premio creato niente punti, un disegno non si mira');
  assert.equal(p.mira(c, { voce: 'solopunti', x: 10, y: 10 }).motivo, 'voce', 'una voce che non si puo\' pagare non si mira');
  assert.equal(p.anteprima(c, 'pomodoro'), 'abc.png');
  assert.equal(p.anteprima(c, 'coriandoli'), null);
});

test('gli euro: un tocco apre un pagamento, il secondo no; se il pagamento non si apre la mira torna libera', async () => {
  const { p, c, aperti } = porta();
  const m = p.mira(c, { voce: 'pomodoro', x: 30, y: 30, chi: 'Marta' }).mira;
  assert.equal(m.inPagamento, false);
  const [uno, due] = await Promise.all([p.paga(c, m.id, 'stripe'), p.paga(c, m.id, 'stripe')]);
  assert.deepEqual([!!uno.url, due.errore], [true, 'gia'], 'due tocchi insieme: un pagamento solo');
  assert.equal(aperti.length, 1);
  assert.deepEqual([aperti[0].importoCent, aperti[0].nome, aperti[0].messaggio, aperti[0].ritorno], [200, 'Marta', 'Colpo: Pomodoro', 'colpo'], 'il prezzo e\' quello della mira');
  assert.equal(p.stato(c, m.id).inPagamento, true);
  assert.equal(registroColpi.get(m.id).riferimento, 'stripe:cs_prova_' + c + '1', 'la mira e\' legata alla donazione che la paga');
  const giu = porta({ apri: async () => ({ errore: 'stripe' }) });
  const m2 = giu.p.mira(giu.c, { voce: 'pomodoro', x: 30, y: 30 }).mira;
  assert.equal((await giu.p.paga(giu.c, m2.id, 'stripe')).errore, 'pagamento');
  assert.equal(registroColpi.get(m2.id).riferimento, '', 'la presa si rilascia');
  assert.equal(giu.b.s.daCheer(giu.c, { bits: 100, message: `Cheer100 ${m2.codice}` }).esito, 'pagato', 'e la mira si paga ancora in un altro modo');
  assert.equal(p.stato(c, 'zz'), null);
  const fermo = porta();
  const m3 = fermo.p.mira(fermo.c, { voce: 'pomodoro', x: 30, y: 30 }).mira;
  assert.equal(m3.pagabile, true);
  fermo.b.stato.overlay = false;
  assert.deepEqual([fermo.p.stato(fermo.c, m3.id).pagabile, fermo.p.stato(fermo.c, m3.id).fermo], [false, 'overlay'], 'la pagina sa che adesso non si paga');
  assert.equal((await fermo.p.paga(fermo.c, m3.id, 'stripe')).errore, 'overlay', 'e «Paga» non apre niente');
  assert.equal(fermo.aperti.length, 0);
});

// LA CONSEGNA: chi paga vede il suo colpo, o riavi i soldi.
test('pagato non vuol dire visto: il colpo resta in arrivo finche\' l\'overlay non lo mostra, e la ronda lo rimanda', async () => {
  const b = banco();
  const c = login();
  const { mira } = b.s.mira(c, { voce: 'pomodoro', x: 5, y: 5, chiave: 'v' });
  b.s.daCheer(c, { bits: 100, message: `Cheer100 ${mira.codice}` });
  assert.equal(registroColpi.get(mira.id).stato, 'pagata');
  await b.s.ronda();
  assert.equal(b.di(c).sparati.length, 1, 'appena mandato: la ronda non lo rimanda subito');
  b.avanti(25_000);
  await b.s.ronda();
  assert.equal(b.di(c).sparati.length, 2, 'non visto: dopo 20 secondi si rimanda (l\'overlay riconosce quelli che ha gia\')');
  assert.equal(await b.s.visto(c, mira.id), true);
  assert.equal(registroColpi.get(mira.id).stato, 'sparata');
  assert.equal(await b.s.visto(c, mira.id), false, 'il secondo «visto» non conta');
  b.avanti(25_000);
  await b.s.ronda();
  assert.equal(b.di(c).sparati.length, 2, 'visto: non si rimanda piu\'');
});

test('se nessun overlay lo mostra, euro e punti tornano indietro da soli; i Bit restano in coda', async () => {
  const b = banco();
  const c = login();
  const e = b.s.mira(c, { voce: 'pomodoro', x: 5, y: 5, chiave: 'e1' }).mira;
  const p = b.s.mira(c, { voce: 'pomodoro', x: 6, y: 6, chiave: 'p1' }).mira;
  const k = b.s.mira(c, { voce: 'pomodoro', x: 7, y: 7, chiave: 'k1' }).mira;
  registroColpi.lega(e.id, 'stripe:cs_rimborso_' + c);
  b.stato.overlay = false;
  b.s.daPagamento('stripe:cs_rimborso_' + c);
  b.stato.overlay = true;
  assert.equal(b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: p.codice, id: 'ris-1' }).esito, 'pagato');
  b.stato.overlay = false;
  assert.equal(b.s.daCheer(c, { bits: 100, message: `Cheer100 ${k.codice}` }).inCoda, true, 'i Bit arrivati a overlay fermo: il colpo resta in coda');
  b.avanti(11 * 60_000);
  await b.s.ronda();
  assert.deepEqual(b.di(c).rimborsi, ['stripe:cs_rimborso_' + c], 'gli euro si rimborsano');
  assert.deepEqual(b.di(c).premi, [['aaaaaaaa-1111', 'ris-1', 'CANCELED']], 'i punti si restituiscono');
  assert.deepEqual([registroColpi.get(e.id).stato, registroColpi.get(p.id).stato, registroColpi.get(k.id).stato], ['rimborsata', 'rimborsata', 'pagata']);
  b.stato.overlay = true;
  await b.s.ronda();
  assert.equal(b.di(c).sparati.at(-1).attacco.id, k.id, 'l\'overlay torna: il colpo a Bit parte');
});

test('un rimborso che non riesce si ritenta; coi punti il riscatto si chiude quando l\'overlay mostra il colpo', async () => {
  const b = banco({ rimborso: { errore: 'stripe giu\'' } });
  const c = login();
  const e = b.s.mira(c, { voce: 'pomodoro', x: 5, y: 5, chiave: 'r1' }).mira;
  registroColpi.lega(e.id, 'stripe:cs_ritenta_' + c);
  b.stato.overlay = false;
  b.s.daPagamento('stripe:cs_ritenta_' + c);
  b.avanti(11 * 60_000);
  await b.s.ronda();
  await b.s.ronda();
  assert.equal(b.di(c).rimborsi.length, 2);
  assert.equal(registroColpi.get(e.id).stato, 'pagata', 'non rimborsata: resta da rimborsare, mai persa');
  b.stato.overlay = true;
  const p = b.s.mira(c, { voce: 'pomodoro', x: 6, y: 6, chiave: 'r2' }).mira;
  b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: p.codice, id: 'ris-2' });
  await b.s.visto(c, p.id);
  assert.deepEqual(b.di(c).premi, [['aaaaaaaa-1111', 'ris-2', 'FULFILLED']]);
});

test('non si paga un colpo che adesso non si puo\' consegnare', async () => {
  const b = banco();
  const c = login();
  const { mira } = b.s.mira(c, { voce: 'pomodoro', x: 5, y: 5, chiave: 'f1' });
  b.stato.live = false;
  const r = b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: mira.codice, id: 'ris-3' });
  assert.deepEqual([r.esito, r.stato], ['fermo', 'CANCELED'], 'a diretta spenta il riscatto si annulla subito: i punti tornano');
  assert.equal(registroColpi.get(mira.id).stato, 'attesa');
  assert.equal(b.s.consegnabile(c, 'pomodoro'), 'offline');
});

test('un pagamento in euro che arriva a mira scaduta non si perde: o il colpo, o il rimborso', () => {
  const b = banco();
  const c = login();
  const { mira } = b.s.mira(c, { voce: 'pomodoro', x: 5, y: 5, chiave: 's1' });
  registroColpi.lega(mira.id, 'stripe:cs_tardi_' + c);
  registroColpi.scadi(mira.id);
  assert.equal(b.s.daPagamento('stripe:cs_tardi_' + c).esito, 'pagato');
  assert.equal(registroColpi.get(mira.id).stato, 'pagata', 'e da qui la consegna, o il rimborso dopo 10 minuti');
  assert.equal(b.s.daPagamento('stripe:cs_tardi_' + c).esito, 'gia');
});

test('due giri della ronda insieme non rimborsano due volte', async () => {
  let fine;
  const lento = new Promise((r) => { fine = r; });
  const b = banco();
  const c = login();
  const e = b.s.mira(c, { voce: 'pomodoro', x: 5, y: 5, chiave: 'd1' }).mira;
  registroColpi.lega(e.id, 'stripe:cs_doppio_' + c);
  b.stato.overlay = false;
  b.s.daPagamento('stripe:cs_doppio_' + c);
  b.avanti(11 * 60_000);
  const s2 = creaServizioColpi({ registro: registroColpi, effects: { fireConOpzioni: () => true }, effettoDi: () => ({ tipo: 'immagine' }), impostazioni: () => ({}),
    inOnda: () => false, overlay: () => false, ora: b.ora, rimborsaEuro: async (l, id) => { if (l === c) { conta++; await lento; } return { ok: true }; } });
  let conta = 0;
  const uno = s2.ronda(), due = s2.ronda();
  fine();
  await Promise.all([uno, due]);
  assert.equal(conta, 1);
  assert.equal(registroColpi.get(e.id).stato, 'rimborsata');
});

test('con l\'accesso a Twitch niente codice: il suo cheer che copre da solo quello che manca, o il suo riscatto, paga la sua mira', () => {
  const b = banco();
  const c = login();
  const { mira } = b.s.mira(c, { voce: 'pomodoro', x: 30, y: 30, chiave: 'a', spettatore: '777' });
  assert.equal(b.s.daCheer(c, { bits: 100, message: 'Cheer100 dai', user_id: '888' }).esito, 'nessuno', 'il cheer di un altro non paga la mira di nessuno');
  assert.equal(b.s.daCheer(c, { bits: 60, message: 'Cheer60', user_id: '777' }).esito, 'nessuno', 'un cheer che non basta da solo non si somma di nascosto');
  assert.equal(b.sparati.length, 0);
  const r = b.s.daCheer(c, { bits: 100, message: 'Cheer100', user_id: '777' });
  assert.equal(r.esito, 'pagato');
  assert.equal(b.di(c).sparati[0].attacco.id, mira.id);
  const due = b.s.mira(c, { voce: 'pomodoro', x: 40, y: 40, chiave: 'b', spettatore: '777' }).mira;
  assert.equal(b.s.daCheer(c, { bits: 60, message: `Cheer60 ${due.codice}`, user_id: '777' }).esito, 'pochi', 'col codice i Bit si sommano');
  assert.equal(b.s.daCheer(c, { bits: 40, message: 'Cheer40', user_id: '777' }).esito, 'pagato', 'e senza codice basta coprire quello che manca');
  const tre = b.s.mira(c, { voce: 'pomodoro', x: 50, y: 50, chiave: 'c', spettatore: '777' }).mira;
  assert.equal(b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: 'vai!', id: 'r1', user_id: '999' }).stato, 'CANCELED', 'il riscatto di un altro senza codice: i punti tornano');
  const p = b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: 'vai!', id: 'r2', user_id: '777' });
  assert.deepEqual([p.esito, p.stato], ['pagato', null]);
  assert.equal(b.di(c).sparati.at(-1).attacco.id, tre.id);
  assert.equal(b.s.daCheer(c, { bits: 500, message: 'Cheer500', user_id: '777' }).esito, 'nessuno', 'nessuna mira aperta: il cheer resta un cheer');
});

test('la mira di chi ha l\'accesso scade come le altre, se non ha gia\' Bit dentro', () => {
  const b = banco();
  const c = login();
  b.s.mira(c, { voce: 'pomodoro', x: 30, y: 30, chiave: 'a', spettatore: '555' });
  b.avanti(60 * 60_000);
  assert.equal(registroColpi.apertaDi(c, '555', b.ora()), null);
  assert.equal(b.s.daCheer(c, { bits: 100, message: 'Cheer100', user_id: '555' }).esito, 'nessuno');
  assert.equal(registroColpi.apertaDi(c, '', b.ora()), null, 'senza accesso non c\'e\' nessuno da cercare');
});

test('titolo e sottotitolo della pagina: dello streamer se li scrive, se no quelli di serie, coerenti coi nomi', async () => {
  const c = normalizza({ titolo: ' Tirami un <b>pomodoro</b>\n ', dida: 'x'.repeat(500) });
  assert.equal(c.titolo, 'Tirami un <b>pomodoro</b>');
  assert.equal(c.dida.length, 200);
  assert.deepEqual([normalizza({}).titolo, normalizza({}).dida], ['', '']);
  const { htmlPaginaColpo } = await import('../../src/features/colpi-pagina.js');
  // senza il dizionario che la pagina porta per il client (data-t): conta quello che si legge
  const pag = (testi, lingua = 'it') => htmlPaginaColpo({ login: 'prova', display: 'Prova', pagina: {}, baseUrl: 'https://x.test', lingua, testi }).replace(/ data-t="[^"]*"/, '');
  const mia = pag({ titolo: c.titolo, dida: 'Mira bene' });
  assert.ok(mia.includes('Tirami un &lt;b&gt;pomodoro&lt;/b&gt;') && !mia.includes('<b>pomodoro</b>'), 'il titolo dello streamer resta testo');
  assert.ok(mia.includes('Mira bene'));
  assert.ok(pag({}).includes('Colpisci la diretta di Prova') && pag({}).includes('col tuo nome'));
  assert.ok(!pag({ conNome: false }).includes('col tuo nome'), 'coi nomi spenti la pagina non promette il nome');
  assert.ok(pag({}, 'en').includes('Hit Prova'));
});

test('l\'indirizzo corto: pew.<dominio>/<canale> quando e\' acceso, se no il lungo; la pagina lo dice e il lettore lo accetta', async () => {
  const { config } = await import('../../src/config.js');
  const { urlPaginaColpo } = await import('../../src/features/colpi.js');
  const { htmlPaginaColpo } = await import('../../src/features/colpi-pagina.js');
  const prima = [config.pewHost, config.baseUrl];
  try {
    config.baseUrl = 'https://socialbot.live';
    config.pewHost = '';
    assert.equal(urlPaginaColpo('Prova'), 'https://socialbot.live/u/prova/colpo');
    config.pewHost = 'pew.socialbot.live';
    assert.equal(urlPaginaColpo('Prova'), 'https://pew.socialbot.live/prova');
  } finally { [config.pewHost, config.baseUrl] = prima; }
  const pag = (o) => htmlPaginaColpo({ login: 'prova', display: 'Prova', pagina: {}, baseUrl: 'https://socialbot.live', ...o });
  const lettore = (h) => decodeURIComponent((/player\.twitch\.tv\/\?[^"' ]+/.exec(h.replace(/&amp;/g, '&')) || [''])[0]);
  const corta = pag({ url: 'https://pew.socialbot.live/prova', corto: 'pew.socialbot.live' });
  assert.ok(corta.includes('<link rel="canonical" href="https://pew.socialbot.live/prova">'), 'il canonico e\' quello da dare in giro');
  assert.ok(lettore(corta).includes('parent=pew.socialbot.live'), 'Twitch rifiuta un lettore su un nome che non e\' tra i parent');
  assert.ok(lettore(corta).includes('parent=socialbot.live'), 'e l\'indirizzo lungo continua a funzionare');
  const lunga = pag({});
  assert.ok(lunga.includes('<link rel="canonical" href="https://socialbot.live/u/prova/colpo">'));
  assert.ok(!lettore(lunga).includes('pew.'));
});

const { eFrasePresenza, frasePresenza, PRESENZA } = await import('../../src/features/colpi.js');
const { PRESENZA_MS, RINVIO_MS: RINVIO } = await import('../../src/features/colpi-servizio.js');

test('la presenza nel listino: accesa solo con un effetto, la frase intera senza maiuscole e spazi, il nome nella scritta', () => {
  assert.deepEqual(normalizza({}).presenza, { attiva: false, frase: '!pew presente', comando: '', x: PRESENZA.x, y: PRESENZA.y, scala: 100, testo: '', alMinuto: 6, premi: [], dopo: 'resta', rispondi: true, risposta: '' });
  assert.equal(normalizza({ presenza: { attiva: true } }).presenza.attiva, false, 'senza effetto non si accende');
  const c = normalizza({ presenza: { attiva: true, comando: '!Ciao', frase: '  Eccomi   QUI ', testo: 'senza nome', x: 140, y: -3, scala: 9999, alMinuto: 0 } });
  assert.deepEqual(c.presenza, { attiva: true, frase: 'eccomi qui', comando: 'ciao', x: 100, y: 0, scala: 300, testo: '', alMinuto: 1, premi: [], dopo: 'resta', rispondi: true, risposta: '' });
  assert.equal(eFrasePresenza(c, 'ECCOMI    qui'), true);
  assert.equal(eFrasePresenza(c, 'ciao eccomi qui'), false, 'la frase vale da sola');
  assert.equal(eFrasePresenza(normalizza({ presenza: { comando: 'ciao' } }), '!pew presente'), false, 'spenta non risponde');
  assert.equal(frasePresenza(c, 'Marta', 'en'), 'Marta is here', 'senza scritta, quella di serie nella lingua della chat');
  assert.equal(frasePresenza(normalizza({ presenza: { testo: '👋 {nome} c\'è!' } }), 'Marta https://x.y'), '👋 Marta c\'è!', 'il nome si pulisce come quello di un colpo');
  assert.equal(frasePresenza(c, '   '), '', 'senza nome niente scritta');
});

function bancoPresenza(extra = {}) {
  const cfg = { attivo: true, attesaSec: 0, alMinuto: 2, voci: [{ comando: 'pomodoro', bit: 100 }], zone: [{ x: 70, y: 60, w: 30, h: 40 }],
    presenza: { attiva: true, comando: 'pomodoro', x: 10, y: 20, scala: 80, alMinuto: 3, ...extra } };
  return { b: banco({ cfg }), cfg };
}

test('la presenza: parte una volta per diretta, nel suo punto e col nome, e non toglie posto a chi paga', () => {
  const { b } = bancoPresenza();
  const c = login();
  const r = b.s.presenza(c, { chiave: 'twitch:1', nome: 'Marta', occasione: 'd:tw:1' });
  assert.equal(r.esito, 'partita');
  const sp = b.di(c).sparati;
  assert.equal(sp.length, 1);
  assert.deepEqual(sp[0].xy, { x: 10, y: 20, s: 80, r: 0, centro: true }, 'il punto dello streamer, col centro');
  assert.equal(sp[0].attacco.chi, 'Marta è presente');
  const m = registroColpi.get(sp[0].attacco.id);
  assert.deepEqual([m.stato, m.metodo, m.riferimento], ['pagata', 'presenza', 'presenza:d:tw:1:twitch:1'], 'sta nel registro: la consegna e\' quella dei colpi');
  assert.equal(b.s.presenza(c, { chiave: 'twitch:1', nome: 'Marta', occasione: 'd:tw:1' }).esito, 'gia', 'una per diretta');
  assert.equal(b.s.presenza(c, { chiave: 'twitch:1', nome: 'Marta', occasione: 'd:tw:2' }).esito, 'partita', 'alla diretta dopo si rifa\'');
  assert.equal(b.s.presenza(c, { chiave: 'twitch:2', nome: 'Luca', occasione: 'd:tw:1' }).esito, 'partita');
  assert.equal(b.s.presenza(c, { chiave: 'twitch:3', nome: 'Ugo', occasione: 'd:tw:1' }).esito, 'troppe', 'il tetto delle presenze al minuto');
  assert.equal(b.s.mira(c, { voce: 'pomodoro', x: 5, y: 5, chiave: 'a' }).ok, true, 'le presenze non contano nel tetto dei colpi');
  assert.equal(b.s.mira(c, { voce: 'pomodoro', x: 5, y: 5, chiave: 'b' }).ok, true);
  b.avanti(61_000);
  assert.equal(b.s.presenza(c, { chiave: 'twitch:3', nome: 'Ugo', occasione: 'd:tw:1' }).esito, 'partita', 'il tetto e\' al minuto');
});

test('la presenza chiede quello che chiede un colpo, e se non si vede in tempo si lascia e si puo\' rifare', async () => {
  const { b } = bancoPresenza();
  const c = login();
  const p = (chiave = 'twitch:9') => b.s.presenza(c, { chiave, nome: 'Marta', occasione: 'd:tw:9' });
  b.stato.live = false;
  assert.deepEqual(p(), { esito: 'fermo', motivo: 'offline' });
  b.stato.live = true; b.stato.overlay = false;
  assert.deepEqual(p(), { esito: 'fermo', motivo: 'overlay' });
  b.stato.overlay = true;
  assert.deepEqual(bancoPresenza({ x: 80, y: 80 }).b.s.presenza(c, { chiave: 'k', nome: 'M', occasione: 'o' }), { esito: 'fermo', motivo: 'protetta' }, 'il punto fuori dalle zone, anche se le zone cambiano dopo');
  assert.deepEqual(bancoPresenza({ comando: 'coriandoli' }).b.s.presenza(c, { chiave: 'k', nome: 'M', occasione: 'o' }), { esito: 'fermo', motivo: 'effetto' }, 'un disegno a tutto schermo non ha un punto');
  assert.equal(bancoPresenza({ attiva: false }).b.s.presenza(c, { chiave: 'k', nome: 'M', occasione: 'o' }).esito, 'spenta');
  assert.equal(b.di(c).sparati.length, 0, 'niente e\' partito');
  assert.equal(p().esito, 'partita');
  const id = b.di(c).sparati[0].attacco.id;
  b.avanti(RINVIO + 1);
  await b.s.ronda();
  assert.equal(b.di(c).sparati.length, 2, 'non vista: la ronda la rimanda');
  b.avanti(PRESENZA_MS);
  await b.s.ronda();
  assert.equal(registroColpi.get(id).stato, 'scaduta', 'il momento e\' passato: niente da rimborsare');
  assert.equal(p().esito, 'partita', 'e chi l\'ha scritta la puo\' rifare');
  const id2 = b.di(c).sparati.at(-1).attacco.id;
  assert.equal(await b.s.visto(c, id2), true);
  assert.equal(registroColpi.get(id2).stato, 'sparata');
  assert.equal(p().esito, 'gia', 'vista, vale per tutta la diretta');
});

test('la prova della presenza dal pannello: subito, col nome dello streamer, senza registro', () => {
  const { b } = bancoPresenza({ attiva: false });
  const c = login();
  assert.deepEqual(b.s.provaPresenza(c, { nome: 'Canale', presenza: { comando: 'pomodoro', x: 30, y: 30, testo: 'Ciao {nome}' } }), { ok: true });
  const sp = b.di(c).sparati[0];
  assert.deepEqual([sp.xy.x, sp.xy.y, sp.attacco.id, sp.attacco.chi], [30, 30, '', 'Ciao Canale'], 'quello che c\'e\' nel pannello, anche non salvato');
  assert.equal(b.s.provaPresenza(c, { nome: 'Canale', presenza: { comando: 'pomodoro', x: 90, y: 90 } }).motivo, 'protetta');
});

test('l\'anteprima della pagina: quello che riceverebbe l\'overlay, senza la sua chiave', () => {
  const cfg = { attivo: true, attesaSec: 0, alMinuto: 30, voci: [{ comando: 'pomodoro', bit: 100 }, { comando: 'clip', bit: 100 }, { comando: 'tiro', bit: 100 }, { comando: 'tiromuto', bit: 100 }] };
  const b = banco({ cfg });
  const c = login();
  const effetti = {
    pomodoro: { tipo: 'immagine', file: 'abc.png', suono_file: 'tonfo.mp3', volume: 40, durata: 3000 },
    clip: { tipo: 'video', file: 'v.mp4', chroma: JSON.stringify({ colore: '#00FF00', soglia: 90 }) },
    tiro: { tipo: 'lancio', disegno: JSON.stringify({ oggetto: 'pomodoro', audio: 'urlo' }) },
    tiromuto: { tipo: 'lancio', disegno: JSON.stringify({ oggetto: 'pomodoro', audio: 'sparito' }) },
    urlo: { tipo: 'audio', file: 'urlo.ogg' },
  };
  const p = creaPortaColpi({ servizio: b.s, registro: registroColpi, streamers: { get: () => ({ settings: { colpi: cfg } }) },
    effettoDi: (l, k) => effetti[k] || null, mezziEuro: () => [], apriPagamento: async () => ({}), inOnda: () => true, overlay: () => true, ora: b.ora });
  const v = Object.fromEntries(p.dati(c).voci.map((x) => [x.id, x]));
  assert.deepEqual(v.pomodoro.prova, { suono: `/u/${c}/colpo/anteprima/pomodoro/suono`, volume: 40, durata: 3000, chroma: null });
  assert.deepEqual(v.clip.prova.chroma, { colore: '#00ff00', soglia: 90 }, 'il green screen del video, come nell\'overlay');
  assert.equal(v.tiro.prova.lancio.oggetto, 'pomodoro');
  assert.equal(v.tiro.prova.lancio.suono, `/u/${c}/colpo/anteprima/tiro/suono`, 'il suono dello streamer passa dall\'anteprima');
  assert.equal(v.tiro.prova.lancio.audio, '');
  assert.match(v.tiromuto.prova.lancio.suono, /^\/vendor\/lanci\/suoni\//, 'un suono che non c\'e\' piu\' lascia quello di serie');
  assert.ok(v.tiro.prova.durata > 0);
  assert.ok(!JSON.stringify(p.dati(c)).includes('key='), 'nessun indirizzo dell\'overlay');
  assert.equal(p.anteprima(c, 'pomodoro', 'suono'), 'tonfo.mp3');
  assert.equal(p.anteprima(c, 'tiro', 'suono'), 'urlo.ogg');
  assert.equal(p.anteprima(c, 'tiromuto', 'suono'), null);
  assert.equal(p.anteprima(c, 'clip', 'suono'), null);
});

const { categoriaDi, codicePerMonete, CATEGORIE_SERIE } = await import('../../src/features/colpi.js');
const { CONSEGNA_MS } = await import('../../src/features/colpi-servizio.js');

test('le categorie: quelle di serie finche\' lo streamer non le tocca, poi le sue, nel suo ordine', () => {
  assert.deepEqual(normalizza({}).categorie.map((c) => c.id), CATEGORIE_SERIE);
  const c = normalizza({ categorie: [{ id: 'cibo', nome: ' Cibo ' }, { id: 'adesivi', nome: '' }, { id: 'cibo', nome: 'doppia' }, { id: 'x y', nome: 'id storto' }, { id: 'vuota', nome: '' }],
    voci: [{ comando: 'a', categoria: 'cibo' }, { comando: 'b', categoria: 'sparita' }] });
  assert.deepEqual(c.categorie, [{ id: 'cibo', nome: 'Cibo' }, { id: 'adesivi', nome: '' }], 'senza doppioni, ids veri, e un nome vuoto solo per quelle di serie');
  assert.deepEqual(c.voci.map((v) => v.categoria), ['cibo', ''], 'una categoria che non c\'e\' piu\' si scorda');
  assert.equal(categoriaDi(c, c.voci[0], 'lanci'), 'cibo', 'la sua, se c\'e\'');
  assert.equal(categoriaDi(c, c.voci[1], 'adesivi'), 'adesivi', 'se no quella del suo tipo');
  assert.equal(categoriaDi(c, c.voci[1], 'spaventi'), 'cibo', 'se no la prima');
  assert.equal(categoriaDi(normalizza({ categorie: [] }), c.voci[0], 'lanci'), '', 'senza categorie, nessuna');
  assert.equal(normalizza({ categorie: Array.from({ length: 20 }, (_, i) => ({ id: 'c' + i, nome: 'C' + i })) }).categorie.length, 10);
});

test('il comando delle monete: «!pew CODICE», da solo; lo streamer lo puo\' chiamare come vuole', () => {
  const c = normalizza({});
  assert.equal(c.comando, 'pew');
  assert.equal(codicePerMonete(c, '!PEW k7qx3'), 'K7QX3');
  assert.equal(codicePerMonete(c, '!pew k7qx3 dai'), '', 'solo il comando e il codice');
  assert.equal(codicePerMonete(c, '!pew presente'), '', 'una parola non e\' un codice');
  assert.equal(codicePerMonete(normalizza({ comando: '!Tira' }), '!tira K7QX3'), 'K7QX3');
  assert.equal(normalizza({ comando: 'con spazi' }).comando, 'pew');
});

function bancoMonete() {
  const cfg = { attivo: true, attesaSec: 0, alMinuto: 30, voci: [{ comando: 'pomodoro', monete: 300, bit: 100 }, { id: 'solobit', comando: 'pomodoro', bit: 50 }] };
  return banco({ cfg, conMonete: true });
}

test('le monete del canale pagano un colpo: tutte o niente, una volta sola, e prima si guarda che possa comparire', () => {
  const b = bancoMonete();
  const c = login();
  points.dai(c, 'marta', 500);
  const m = b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'a' }).mira;
  assert.deepEqual(b.s.daMonete(c, { codice: m.codice, user: 'Luca' }), { esito: 'pochi', serve: 300, saldo: 0, nome: 'pomodoro' }, 'chi non ne ha abbastanza non paga niente');
  b.stato.overlay = false;
  assert.equal(b.s.daMonete(c, { codice: m.codice, user: 'marta' }).esito, 'fermo');
  assert.equal(economia.saldo(c, 'marta'), 500, 'a colpo fermo le monete non si toccano');
  b.stato.overlay = true;
  assert.deepEqual(b.s.daMonete(c, { codice: m.codice, user: 'marta' }), { esito: 'pagato', nome: 'pomodoro', monete: 300 });
  assert.equal(economia.saldo(c, 'marta'), 200);
  const r = registroColpi.get(m.id);
  assert.deepEqual([r.stato, r.metodo, r.riferimento, r.ricevuta], ['pagata', 'monete', 'monete:marta', [{ scade: 0, quanti: 300 }]]);
  assert.equal(b.di(c).sparati.length, 1, 'parte subito');
  assert.equal(b.s.daMonete(c, { id: m.id, user: 'marta' }).esito, 'sconosciuto', 'una mira gia\' pagata non si ripaga');
  assert.equal(economia.saldo(c, 'marta'), 200);
  const solo = b.s.mira(c, { voce: 'solobit', x: 10, y: 10, chiave: 'b' }).mira;
  assert.equal(b.s.daMonete(c, { id: solo.id, user: 'marta' }).esito, 'sconosciuto', 'un colpo senza prezzo in monete non si paga in monete');
  const euro = b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'c' }).mira;
  registroColpi.lega(euro.id, 'stripe:cs_aperto');
  assert.equal(b.s.daMonete(c, { id: euro.id, user: 'marta' }).esito, 'gia', 'con un pagamento in euro aperto, no');
  assert.equal(banco({ cfg: { attivo: true, voci: [{ comando: 'pomodoro', monete: 1 }] } }).s.daMonete(c, { id: euro.id, user: 'marta' }).esito, 'spento', 'senza le monete del canale, niente');
});

test('un colpo pagato in monete che non compare le rende tali e quali; uno visto no', async () => {
  const b = bancoMonete();
  const c = login();
  points.dai(c, 'marta', 1000);
  const a = b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'a' }).mira;
  const v = b.s.mira(c, { voce: 'pomodoro', x: 20, y: 10, chiave: 'b' }).mira;
  b.s.daMonete(c, { id: a.id, user: 'marta' });
  b.s.daMonete(c, { id: v.id, user: 'marta' });
  assert.equal(economia.saldo(c, 'marta'), 400);
  assert.equal(await b.s.visto(c, v.id), true);
  b.avanti(CONSEGNA_MS + 1);
  await b.s.ronda();
  assert.deepEqual([registroColpi.get(a.id).stato, registroColpi.get(v.id).stato], ['rimborsata', 'sparata']);
  assert.equal(economia.saldo(c, 'marta'), 700, 'tornano solo quelle del colpo che non si e\' visto');
  await b.s.ronda();
  assert.equal(economia.saldo(c, 'marta'), 700, 'e una volta sola');
});

test('la pagina: le categorie che hanno colpi, nell\'ordine dello streamer; le monete solo con l\'accesso', async () => {
  const cfg = { attivo: true, attesaSec: 0, alMinuto: 30, categorie: [{ id: 'media', nome: '' }, { id: 'adesivi', nome: 'Faccine' }, { id: 'vuota', nome: 'Vuota' }],
    voci: [{ comando: 'pomodoro', monete: 300 }, { comando: 'ridi', bit: 20 }, { comando: 'tiro', bit: 30, categoria: 'adesivi' }] };
  const b = banco({ cfg, conMonete: true });
  const c = login();
  points.dai(c, 'marta', 300);
  const effetti = { pomodoro: { tipo: 'immagine', file: 'p.png' }, ridi: { tipo: 'lancio', disegno: JSON.stringify({ oggetto: 'risata' }) }, tiro: { tipo: 'lancio', disegno: JSON.stringify({ oggetto: 'pomodoro' }) } };
  const p = creaPortaColpi({ servizio: b.s, registro: registroColpi, streamers: { get: () => ({ settings: { colpi: cfg, nomeMonete: 'Gemme' } }) },
    effettoDi: (l, k) => effetti[k] || null, mezziEuro: () => [], apriPagamento: async () => ({}), inOnda: () => true, overlay: () => true, ora: b.ora });
  const d = p.dati(c);
  assert.deepEqual(d.categorie, [{ id: 'media', nome: '' }, { id: 'adesivi', nome: 'Faccine' }], 'senza quelle vuote');
  assert.deepEqual(d.voci.map((v) => [v.id, v.categoria]), [['pomodoro', 'media'], ['ridi', 'adesivi'], ['tiro', 'adesivi']], 'un adesivo va con gli adesivi, un lancio scelto dallo streamer dove dice lui');
  assert.deepEqual([d.voci[0].metodi, d.voci[0].prezzi.monete, d.moneta, d.comando], [['monete'], 300, 'Gemme', 'pew']);
  const m = p.mira(c, { voce: 'pomodoro', x: 10, y: 10 }, 'k', { id: '42', nome: 'Marta' }).mira;
  assert.deepEqual(await p.paga(c, m.id, 'monete', null), { errore: 'accesso' }, 'senza accesso non si sa di chi sono le monete');
  assert.deepEqual(await p.paga(c, m.id, 'monete', { id: '43', login: 'altro' }), { errore: 'mira' }, 'la mira di un altro no');
  assert.deepEqual(await p.paga(c, m.id, 'monete', { id: '42', login: 'marta' }), { ok: true, esito: 'pagato' });
  assert.equal(economia.saldo(c, 'marta'), 0);
  assert.equal(p.stato(c, m.id).stato, 'pagata');
  const senza = creaPortaColpi({ servizio: banco({ cfg }).s, registro: registroColpi, streamers: { get: () => ({ settings: { colpi: cfg } }) },
    effettoDi: (l, k) => effetti[k] || null, mezziEuro: () => [], apriPagamento: async () => ({}), inOnda: () => true, overlay: () => true, ora: b.ora });
  assert.equal(senza.dati(c).voci.some((v) => v.id === 'pomodoro'), false, 'senza le monete del canale un colpo solo in monete non si offre');
});

const { premioSerie, serieDopo, rispostaPresenza } = await import('../../src/features/colpi.js');

test('la serie della presenza: i gradini dello streamer, poi resta o ricomincia; di fila vuol dire la diretta subito prima', () => {
  const p = normalizza({ presenza: { premi: '1, 5, 10, 15' } }).presenza;
  assert.deepEqual(p.premi, [1, 5, 10, 15]);
  assert.deepEqual([1, 2, 3, 4, 5, 9].map((n) => premioSerie(p, n)), [1, 5, 10, 15, 15, 15]);
  assert.deepEqual([4, 5, 6].map((n) => premioSerie({ ...p, dopo: 'ricomincia' }, n)), [15, 1, 5]);
  assert.deepEqual(normalizza({ presenza: { premi: [0, 0] } }).presenza.premi, [], 'tutti zero vuol dire nessun premio');
  assert.deepEqual(normalizza({ presenza: { monete: 20 } }).presenza.premi, [20], 'il premio fisso di prima diventa un gradino');
  assert.equal(normalizza({ presenza: { premi: Array.from({ length: 50 }, () => 1) } }).presenza.premi.length, 30);
  assert.equal(serieDopo(null, 'd2', 'd1'), 1);
  assert.equal(serieDopo({ ultima: 'd1', serie: 3 }, 'd2', 'd1'), 4, 'alla diretta subito prima: di fila');
  assert.equal(serieDopo({ ultima: 'd0', serie: 3 }, 'd2', 'd1'), 1, 'ne ha saltata una: si riparte');
  assert.equal(serieDopo({ ultima: 'd2', serie: 4 }, 'd2', 'd1'), 4, 'la stessa diretta non conta due volte');
  const r = normalizza({ presenza: { premi: [5] } });
  assert.equal(rispostaPresenza(r, 'Marta', 'it', { serie: 3, monete: 5, moneta: 'gemme' }), '@Marta, presente! 3ª di fila: +5 gemme.');
  assert.equal(rispostaPresenza(r, 'Marta', 'en', { serie: 3, monete: 0 }), '@Marta, checked in! 3 in a row.');
  assert.equal(rispostaPresenza(normalizza({ presenza: { risposta: 'Ciao {nome} ({serie})' } }), 'Marta', 'it', { serie: 2 }), 'Ciao @Marta (2)');
  assert.equal(rispostaPresenza(normalizza({ presenza: { rispondi: false } }), 'Marta'), '');
});

test('la serie col registro vero: diretta dopo diretta sale, una saltata la azzera, e una presenza rifatta non ridà le monete', async () => {
  const { pewSerie } = await import('../../src/db.js');
  const cfg = { attivo: true, voci: [{ comando: 'pomodoro', bit: 10 }], presenza: { attiva: true, comando: 'pomodoro', x: 10, y: 10, premi: [1, 5, 10] } };
  let adesso = 2_000_000;
  const sparati = [];
  const s = creaServizioColpi({ registro: registroColpi, effects: { fireConOpzioni: (l, c, o) => { sparati.push(o); return true; } },
    effettoDi: () => ({ tipo: 'immagine' }), impostazioni: () => cfg, serie: pewSerie, ora: () => adesso });
  const c = login();
  const p = (occ) => s.presenza(c, { chiave: 'twitch:1', nome: 'Marta', occasione: occ });
  const giro = (occ) => { adesso += 1000; pewSerie.segnaDiretta(c, occ, adesso); };
  giro('d1');
  assert.deepEqual(p('d1'), { esito: 'partita', serie: 1, monete: 1, nuova: true });
  assert.equal(sparati.at(-1).attacco.chi, 'Marta è presente');
  giro('d2');
  assert.deepEqual(p('d2'), { esito: 'partita', serie: 2, monete: 5, nuova: true });
  giro('d3');
  giro('d4');
  assert.deepEqual(p('d4'), { esito: 'partita', serie: 1, monete: 1, nuova: true }, 'la d3 l\'ha saltata: si riparte, anche se nessuno si e\' presentato alla d3');
  const id = sparati.at(-1).attacco.id;
  registroColpi.lasciata(id);
  adesso += 1000;
  assert.deepEqual(p('d4'), { esito: 'partita', serie: 1, monete: 0, nuova: false }, 'rifatta perche\' non si e\' vista: compare, ma le monete erano gia\' sue');
  adesso += 1000;
  assert.deepEqual(p('d5'), { esito: 'partita', serie: 2, monete: 5, nuova: true }, 'una diretta vista la prima volta da una presenza conta lo stesso');
  assert.equal(pewSerie.get(c, 'twitch:1').record, 2);
});

const { mistiDi, bitServe, pagaInChat, titoloPremioMisto } = await import('../../src/features/colpi.js');

test('i modi misti nel listino: monete piu\' Bit, monete piu\' punti; tutte e due le cifre o niente; il comando in chat col modo', () => {
  const c = normalizza({ voci: [{ comando: 'a', misti: { bit: { monete: 50, bit: 10 }, punti: { monete: 20 }, euro: { monete: 1, euro: 100 } } }] });
  assert.deepEqual(c.voci[0].misti, { bit: { monete: 50, bit: 10 } }, 'senza una delle due cifre il modo non c\'e\'; niente euro');
  assert.deepEqual(mistiDi(c.voci[0]), [{ modo: 'bit', monete: 50, resto: 10 }]);
  assert.equal(bitServe({ prezzi: { bit: 100 } }), 100);
  assert.equal(bitServe({ prezzi: { bit: 100 }, acconto: { modo: 'bit', resto: 10 } }), 10, 'con le monete pagate, il resto del modo misto');
  assert.equal(bitServe({ prezzi: { bit: 100 }, acconto: { modo: 'punti', resto: 300 } }), 0, 'un acconto per i punti chiude la strada dei Bit');
  const cfg = normalizza({});
  assert.deepEqual(pagaInChat(cfg, '!pew k7qx3'), { codice: 'K7QX3', modo: '' });
  assert.deepEqual(pagaInChat(cfg, '!pew k7qx3 BIT'), { codice: 'K7QX3', modo: 'bit' });
  assert.deepEqual(pagaInChat(cfg, '!pew k7qx3 punti'), { codice: 'K7QX3', modo: 'punti' });
  assert.equal(pagaInChat(cfg, '!pew k7qx3 euro'), null);
  assert.equal(titoloPremioMisto({ nome: 'Pomodoro' }), 'Colpo: Pomodoro + monete');
  assert.ok(titoloPremioMisto({ nome: 'x'.repeat(60) }).length <= 45);
});

function bancoMisti(cfgVoce = {}) {
  const cfg = { attivo: true, attesaSec: 0, alMinuto: 30, voci: [{ comando: 'pomodoro', bit: 100, punti: 500, euro: 200, monete: 1000, premio: 'aaaaaaaa-1111', premioMisto: 'bbbbbbbb-2222',
    misti: { bit: { monete: 50, bit: 10 }, punti: { monete: 20, punti: 300 } }, ...cfgVoce }] };
  return { b: banco({ cfg, conMonete: true }), cfg };
}

test('monete piu\' Bit: le monete per prime (l\'acconto), poi il resto col cheer; o i Bit prima, e le monete chiudono', () => {
  const { b } = bancoMisti();
  const c = login();
  points.dai(c, 'marta', 200);
  const m = b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'a' }).mira;
  assert.deepEqual(b.s.daMonete(c, { codice: m.codice, user: 'marta', modo: 'bit' }), { esito: 'acconto', modo: 'bit', monete: 50, resto: 10, codice: m.codice, nome: 'pomodoro' });
  assert.equal(economia.saldo(c, 'marta'), 150);
  assert.equal(b.s.daMonete(c, { codice: m.codice, user: 'marta', modo: 'bit' }).esito, 'gia', 'un acconto solo');
  assert.equal(economia.saldo(c, 'marta'), 150, 'e il secondo non toglie niente');
  assert.equal(b.s.daMonete(c, { id: m.id, user: 'marta' }).esito, 'gia', 'con un acconto, niente monete piene');
  const r = b.s.daCheer(c, { bits: 10, message: `Cheer10 ${m.codice}`, user_login: 'marta' });
  assert.equal(r.esito, 'pagato');
  const p = registroColpi.get(m.id);
  assert.deepEqual([p.stato, p.metodo, p.ricevuta], ['pagata', 'monete+bit', [{ scade: 0, quanti: 50 }]]);
  assert.equal(b.di(c).sparati.length, 1);

  const m2 = b.s.mira(c, { voce: 'pomodoro', x: 20, y: 10, chiave: 'b' }).mira;
  const prima = b.s.daCheer(c, { bits: 10, message: `Cheer10 ${m2.codice}`, user_login: 'marta' });
  assert.deepEqual([prima.esito, prima.monete], ['servono-monete', 50], 'i Bit arrivati prima restano contati, e il bot dice cosa manca');
  assert.equal(registroColpi.get(m2.id).stato, 'attesa');
  assert.equal(b.s.daMonete(c, { codice: m2.codice, user: 'marta', modo: 'bit' }).esito, 'pagato', 'le monete chiudono subito');
  assert.equal(registroColpi.get(m2.id).metodo, 'monete+bit');
  assert.equal(economia.saldo(c, 'marta'), 100);
});

test('un acconto senza il resto torna, tale e quale, una volta sola; e una mira con l\'acconto non si paga in altri modi', async () => {
  const { b } = bancoMisti();
  const c = login();
  points.dai(c, 'marta', 100);
  const m = b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'a' }).mira;
  b.s.daMonete(c, { id: m.id, user: 'marta', modo: 'punti' });
  assert.equal(economia.saldo(c, 'marta'), 80);
  assert.equal(b.s.daCheer(c, { bits: 100, message: `Cheer100 ${m.codice}` }).esito, 'sconosciuto', 'con l\'acconto per i punti, i Bit no');
  assert.equal(b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: m.codice, id: 'r0' }).esito, 'gia', 'ne\' i punti pieni');
  registroColpi.pulisci(b.ora() + 20 * 60_000);
  assert.equal(registroColpi.get(m.id).stato, 'attesa', 'la pulizia lascia le mire con l\'acconto alla ronda');
  b.avanti(20 * 60_000);
  await b.s.ronda();
  assert.equal(registroColpi.get(m.id).stato, 'scaduta');
  assert.equal(economia.saldo(c, 'marta'), 100, 'l\'acconto e\' tornato');
  await b.s.ronda();
  assert.equal(economia.saldo(c, 'marta'), 100, 'una volta sola');
});

test('monete piu\' punti: il premio misto vale solo con l\'acconto; se il colpo non compare tornano i punti e le monete', async () => {
  const { b } = bancoMisti();
  const c = login();
  points.dai(c, 'marta', 100);
  const m = b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'a' }).mira;
  const senza = b.s.daRiscatto(c, { reward_id: 'bbbbbbbb-2222', user_input: m.codice, id: 'r1' });
  assert.deepEqual([senza.esito, senza.stato, senza.monete], ['servono-monete', 'CANCELED', 20], 'senza le monete i punti tornano');
  b.s.daMonete(c, { id: m.id, user: 'marta', modo: 'punti' });
  const r = b.s.daRiscatto(c, { reward_id: 'bbbbbbbb-2222', user_input: m.codice, id: 'r2' });
  assert.deepEqual([r.esito, r.stato], ['pagato', null]);
  assert.deepEqual([registroColpi.get(m.id).metodo, registroColpi.get(m.id).premio], ['monete+punti', 'bbbbbbbb-2222:r2']);
  assert.equal(economia.saldo(c, 'marta'), 80);
  b.avanti(CONSEGNA_MS + 1);
  await b.s.ronda();
  assert.equal(registroColpi.get(m.id).stato, 'rimborsata');
  assert.deepEqual(b.di(c).premi.at(-1), ['bbbbbbbb-2222', 'r2', 'CANCELED']);
  assert.equal(economia.saldo(c, 'marta'), 100, 'e le monete');
  await b.s.ronda();
  assert.equal(economia.saldo(c, 'marta'), 100, 'una volta sola');
});

test('la pagina: i modi misti solo se si possono finire, l\'acconto dalla pagina con l\'accesso, e niente euro dopo l\'acconto', async () => {
  const { cfg } = bancoMisti();
  const v = cfg.voci[0];
  delete v.premioMisto;
  Object.assign(v, { bit: 0, punti: 0, euro: 200 });
  const b = banco({ cfg, conMonete: true });
  const c = login();
  points.dai(c, 'marta', 100);
  const p = creaPortaColpi({ servizio: b.s, registro: registroColpi, streamers: { get: () => ({ settings: { colpi: cfg } }) },
    effettoDi: () => ({ tipo: 'immagine', file: 'p.png' }), mezziEuro: () => ['stripe'], apriPagamento: async () => ({ url: 'x', id: 'cs_1' }), inOnda: () => true, overlay: () => true, ora: b.ora });
  const d = p.dati(c).voci[0];
  assert.deepEqual(d.misti.map((x) => x.modo), ['bit'], 'senza il premio misto su Twitch, il modo coi punti non si offre');
  const m = p.mira(c, { voce: 'pomodoro', x: 10, y: 10 }, 'k', { id: '42', nome: 'Marta' }).mira;
  assert.deepEqual(await p.paga(c, m.id, 'monete', { id: '42', login: 'marta' }, 'bit'), { ok: true, esito: 'acconto' });
  assert.deepEqual(p.stato(c, m.id).acconto, { modo: 'bit', monete: 50, resto: 10 });
  assert.deepEqual(await p.paga(c, m.id, 'stripe'), { errore: 'gia' });
  const soloMisti = banco({ cfg: { ...cfg, voci: [{ comando: 'pomodoro', misti: { bit: { monete: 5, bit: 5 } } }] }, conMonete: true });
  assert.equal(soloMisti.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'z' }).ok, true, 'un colpo che si paga solo in modo misto si mira');
  assert.equal(banco({ cfg: { ...cfg, voci: [{ comando: 'pomodoro', misti: { bit: { monete: 5, bit: 5 } } }] } }).s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'y' }).ok, true, 'e lo dice il listino');
});
