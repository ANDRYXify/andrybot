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

function banco({ cfg, live = true, overlay = true, rimborso = { ok: true } } = {}) {
  let adesso = 1_000_000;
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
