// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I Moduli e la moneta del canale.
//
// Prima, un Modulo poteva fare qualunque cosa TRANNE toccare i punti: i giochi
// erano una lista fissa nel codice (!slot, !duello, !roulette) e lo streamer
// poteva solo cambiarne i numeri. Con tre pezzi ortogonali — una condizione che
// costa, un'azione che muove le monete e un ramo per quando va male — i giochi
// se li costruisce lui, e non c'e' bisogno di aggiungerne altri fissi.
//
// L'ordine delle condizioni non e' estetica: e' cio' che garantisce che nessuno
// paghi per un comando che sarebbe stato rifiutato comunque.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-modpunti-');
const { points, modules: modulesDb } = await import('../../src/db.js');
const { ModulesEngine } = await import('../../src/features/modules.js');

const CH = 'canale';
const motore = new ModulesEngine({});
// Il contesto di chi scrive in chat: e' l'unico con un `pagante`, che e' lui,
// ed e' anche l'`autore`, quello a cui vanno le monete di «Chi ha scritto».
const base = { channel: CH, user: 'tizio', display: 'Tizio', args: [], argsRaw: '', _livello: 0, pagante: 'tizio', autore: 'tizio' };
const ctx = (extra = {}) => ({ ...base, ...(extra.user ? { pagante: extra.user, autore: extra.user } : {}), ...extra });

function raccogli() {
  const dette = [];
  return { dette, dire: (t) => dette.push(t) };
}

test.beforeEach(() => { points.togli(CH, 'tizio', 1_000_000); points.dai(CH, 'tizio', 500); });

test('un comando puo\' costare, e chi non ha le monete non lo usa', async () => {
  const m = { id: 1, azioni: [{ tipo: 'messaggio', testo: 'fatto' }],
    condizioni: { costo: 100, costoMessaggio: 'Servono $costo $monete, ne hai $punti.' } };
  const a = raccogli();
  assert.equal(await motore.esegui(m, ctx(), a.dire), true);
  assert.deepEqual(a.dette, ['fatto']);
  assert.equal(points.get(CH, 'tizio'), 400, 'ha pagato una volta sola');

  const b = raccogli();
  assert.equal(await motore.esegui({ ...m, id: 2 }, ctx({ user: 'squattrinato' }), b.dire), false);
  assert.match(b.dette[0], /Servono 100 monete, ne hai 0\./);
  assert.equal(points.get(CH, 'squattrinato'), 0, 'a chi non paga non si toglie niente');
});

test('si paga per giocare, non per vincere: anche perdendo il costo resta pagato', async () => {
  const perde = { id: 3, condizioni: { costo: 100, probabilita: 0 },
    azioni: [{ tipo: 'punti', op: 'aggiungi', quanto: '500' }, { tipo: 'messaggio', testo: 'vinto' }],
    altrimenti: [{ tipo: 'messaggio', testo: 'perso, ti restano $saldo' }] };
  const a = raccogli();
  assert.equal(await motore.esegui(perde, ctx(), a.dire), true, 'il modulo e\' scattato: ha perso, non e\' stato saltato');
  assert.deepEqual(a.dette, ['perso, ti restano 400']);
  assert.equal(points.get(CH, 'tizio'), 400);

  const vince = { ...perde, id: 4, condizioni: { costo: 100, probabilita: 100 } };
  const b = raccogli();
  await motore.esegui(vince, ctx(), b.dire);
  assert.deepEqual(b.dette, ['vinto']);
  assert.equal(points.get(CH, 'tizio'), 800, '400 - 100 + 500');
});

test('nessuno paga per un comando che sarebbe stato rifiutato comunque', async () => {
  const soloMod = { id: 5, condizioni: { costo: 100, tier: 'mod' }, azioni: [{ tipo: 'messaggio', testo: 'x' }] };
  await motore.esegui(soloMod, ctx({ _livello: 0 }), () => {});
  assert.equal(points.get(CH, 'tizio'), 500, 'rifiutato per ruolo: monete intatte');
});

test('e nessuno brucia il cooldown per un comando che non puo\' permettersi', async () => {
  const m = { id: 6, condizioni: { costo: 10_000, cooldown: 3600 }, azioni: [{ tipo: 'messaggio', testo: 'x' }] };
  await motore.esegui(m, ctx(), () => {});
  points.dai(CH, 'tizio', 20_000);
  const a = raccogli();
  assert.equal(await motore.esegui(m, ctx(), a.dire), true, 'il cooldown non era stato consumato dal tentativo fallito');
});

test('minPunti chiede un patrimonio ma non lo tocca', async () => {
  const m = { id: 7, condizioni: { minPunti: 300 }, azioni: [{ tipo: 'messaggio', testo: 'ricco' }] };
  const a = raccogli();
  assert.equal(await motore.esegui(m, ctx(), a.dire), true);
  assert.equal(points.get(CH, 'tizio'), 500, 'non ha speso niente');
  assert.equal(await motore.esegui({ ...m, id: 8, condizioni: { minPunti: 900 } }, ctx(), () => {}), false);
});

test('i punti si possono dare a se stessi, a chi e\' taggato o a un nome fisso', async () => {
  const dai = (a, extra = {}) => ({ id: 9, azioni: [{ tipo: 'punti', op: 'aggiungi', quanto: '10', a, ...extra }] });
  await motore.esegui(dai('autore'), ctx(), () => {});
  assert.equal(points.get(CH, 'tizio'), 510);
  await motore.esegui(dai('destinatario'), ctx({ args: ['@amica'] }), () => {});
  assert.equal(points.get(CH, 'amica'), 10);
  await motore.esegui(dai('nome', { nome: 'fisso99' }), ctx(), () => {});
  assert.equal(points.get(CH, 'fisso99'), 10);
});

test('la quantita\' puo\' essere una variabile, e resta dentro i limiti', async () => {
  const m = { id: 10, azioni: [{ tipo: 'punti', op: 'aggiungi', quanto: '$arg1' }] };
  await motore.esegui(m, ctx({ args: ['42'] }), () => {});
  assert.equal(points.get(CH, 'tizio'), 542);
  await motore.esegui(m, ctx({ args: ['non-un-numero'] }), () => {});
  assert.equal(points.get(CH, 'tizio'), 542, 'una quantita\' che non e\' un numero non fa niente');
  await motore.esegui({ id: 11, azioni: [{ tipo: 'punti', op: 'aggiungi', quanto: '99999999999' }] }, ctx(), () => {});
  assert.equal(points.get(CH, 'tizio'), 542 + 1_000_000, 'il tetto e\' un milione per azione');
});

test('togli non porta mai sotto zero', async () => {
  points.dai(CH, 'poverissimo', 5);
  await motore.esegui({ id: 12, azioni: [{ tipo: 'punti', op: 'togli', quanto: '9999' }] }, ctx({ user: 'poverissimo' }), () => {});
  assert.equal(points.get(CH, 'poverissimo'), 0);
});

test('un destinatario che non e\' un nome utente non riceve niente', async () => {
  const m = { id: 13, azioni: [{ tipo: 'punti', op: 'aggiungi', quanto: '10', a: 'destinatario' }] };
  for (const brutto of ['[bot]', 'ciao mondo', '', 'x', 'a'.repeat(40)]) {
    await motore.esegui(m, ctx({ args: [brutto] }), () => {});
    assert.equal(points.get(CH, String(brutto).toLowerCase()), 0, brutto);
  }
});

test('le variabili raccontano l\'economia: saldo, moneta, posizione, classifica', async () => {
  points.dai(CH, 'primo', 9000);
  const m = { id: 14, azioni: [{ tipo: 'messaggio', testo: 'hai $punti $monete, sei $posizione°. Top: $top(2)' }] };
  const a = raccogli();
  await motore.esegui(m, ctx(), a.dire);
  assert.match(a.dette[0], /hai 500 monete/);
  assert.match(a.dette[0], /sei 2°/);
  assert.match(a.dette[0], /1\. primo \(9000\)/);
});

test('$punti(nome) legge il saldo di un altro', async () => {
  points.dai(CH, 'altro', 77);
  const a = raccogli();
  await motore.esegui({ id: 15, azioni: [{ tipo: 'messaggio', testo: 'altro ha $punti(altro)' }] }, ctx(), a.dire);
  assert.equal(a.dette[0], 'altro ha 77');
});

test('il cooldown per utente ferma te, non tutti', async () => {
  const m = { id: 16, condizioni: { cooldownUtente: 60 }, azioni: [{ tipo: 'messaggio', testo: 'ok' }] };
  assert.equal(await motore.esegui(m, ctx(), () => {}), true);
  assert.equal(await motore.esegui(m, ctx(), () => {}), false, 'la seconda volta no');
  assert.equal(await motore.esegui(m, ctx({ user: 'unaltra' }), () => {}), true, 'ma un altro puo\'');
});

test('quello che si salva e\' quello che si rilegge', () => {
  const id = modulesDb.save(CH, {
    nome: 'slot', trigger: { tipo: 'comando', comando: 'slot' },
    condizioni: { costo: 100, probabilita: 20, cooldownUtente: 30, minPunti: 0, costoMessaggio: '  troppo poco  ' },
    azioni: [{ tipo: 'punti', op: 'aggiungi', quanto: '500' }],
    altrimenti: [{ tipo: 'messaggio', testo: 'perso' }],
  });
  const letto = modulesDb.get(CH, id);
  assert.equal(letto.condizioni.costo, 100);
  assert.equal(letto.condizioni.cooldownUtente, 30);
  assert.equal(letto.condizioni.costoMessaggio, 'troppo poco');
  assert.equal('minPunti' in letto.condizioni, false, 'zero = non impostato, non si scrive');
  assert.deepEqual(letto.altrimenti, [{ tipo: 'messaggio', testo: 'perso' }]);
});

test('un costo negativo non regala monete', () => {
  const id = modulesDb.save(CH, { nome: 'x', trigger: { tipo: 'comando', comando: 'x' },
    condizioni: { costo: -500, cooldownUtente: 999999 }, azioni: [{ tipo: 'messaggio', testo: 'x' }] });
  const letto = modulesDb.get(CH, id);
  assert.equal('costo' in letto.condizioni, false, 'un costo negativo diventa nessun costo');
  assert.equal(letto.condizioni.cooldownUtente, 86_400, 'e i cooldown assurdi si fermano a un giorno');
});

test('un modulo senza altrimenti resta esattamente com\'era', () => {
  const id = modulesDb.save(CH, { nome: 'y', trigger: { tipo: 'comando', comando: 'y' }, azioni: [{ tipo: 'messaggio', testo: 'y' }] });
  assert.deepEqual(modulesDb.get(CH, id).altrimenti, []);
});

// Il costo puo' essere un'espressione: senza, "!scommetti 100" non si scrive,
// ed e' meta' dei giochi a punti.
test('il costo puo\' venire da quello che uno scrive', async () => {
  points.togli(CH, 'tizio', 1_000_000); points.dai(CH, 'tizio', 500);
  const m = { id: 20, condizioni: { costo: '$arg1' },
    azioni: [{ tipo: 'punti', op: 'aggiungi', quanto: '$arg1' }, { tipo: 'messaggio', testo: 'ok' }] };
  assert.equal(await motore.esegui(m, ctx({ args: ['200'] }), () => {}), true);
  assert.equal(points.get(CH, 'tizio'), 500, 'ha pagato 200 e ne ha ripresi 200');

  assert.equal(await motore.esegui({ ...m, id: 21 }, ctx({ args: ['9999'] }), () => {}), false, 'non se lo puo\' permettere');
  assert.equal(points.get(CH, 'tizio'), 500);
});

test('un costo scritto male non e\' un costo', async () => {
  points.togli(CH, 'tizio', 1_000_000); points.dai(CH, 'tizio', 500);
  const m = { id: 22, condizioni: { costo: '$arg1' }, azioni: [{ tipo: 'messaggio', testo: 'ok' }] };
  assert.equal(await motore.esegui(m, ctx({ args: ['pippo'] }), () => {}), true, 'passa, ma senza addebito');
  assert.equal(points.get(CH, 'tizio'), 500);
  assert.equal(await motore.esegui({ ...m, id: 23 }, ctx({ args: ['-500'] }), () => {}), true);
  assert.equal(points.get(CH, 'tizio'), 500, 'un costo negativo non regala monete');
});

test('un costo con variabile si salva com\'e\', un numero resta numero', () => {
  const a = modulesDb.get(CH, modulesDb.save(CH, { nome: 'sc', trigger: { tipo: 'comando', comando: 'sc' },
    condizioni: { costo: '$arg1' }, azioni: [{ tipo: 'messaggio', testo: 'x' }] }));
  assert.equal(a.condizioni.costo, '$arg1');
  const b = modulesDb.get(CH, modulesDb.save(CH, { nome: 'sl', trigger: { tipo: 'comando', comando: 'sl' },
    condizioni: { costo: '50' }, azioni: [{ tipo: 'messaggio', testo: 'x' }] }));
  assert.equal(b.condizioni.costo, 50);
});

// Senza questo, un furto toglierebbe una cifra alla vittima e ne darebbe
// un'altra al ladro: due $random sono due numeri diversi.
test('la cifra appena mossa si puo\' riusare, e non e\' quella chiesta ma quella riuscita', async () => {
  points.togli(CH, 'vittima', 1_000_000); points.dai(CH, 'vittima', 30);
  points.togli(CH, 'ladro', 1_000_000);
  const m = { id: 30, azioni: [
    { tipo: 'punti', op: 'togli', quanto: '80', a: 'nome', nome: 'vittima' },
    { tipo: 'punti', op: 'aggiungi', quanto: '$mossa', a: 'nome', nome: 'ladro' },
    { tipo: 'messaggio', testo: '$user ruba $mossa a $bersaglio' },
  ] };
  const a = raccogli();
  await motore.esegui(m, ctx(), a.dire);
  assert.equal(points.get(CH, 'vittima'), 0);
  assert.equal(points.get(CH, 'ladro'), 30, 'la vittima ne aveva 30, non 80: si muove quello che c\'e\'');
  assert.equal(a.dette[0], 'tizio ruba 30 a ladro', '$bersaglio segue l\'ultima azione');
});

test.after(() => usaEGetta.pulisci());

// PAGA SOLO CHI SCRIVE IN CHAT. Timer, eventi, API, voce, Telegram e prova non
// hanno uno spettatore davanti: il loro contesto portava il nome dello
// streamer (o di chi segue, o di chi scrive su Telegram), e «Costa» addebitava
// a lui. Si costruiscono i contesti veri, come li fa il motore.
test('«Costa» e «Serve almeno» non addebitano a nessuno fuori dalla chat', async () => {
  const { streamers } = await import('../../src/db.js');
  streamers.request(CH, 'Canale', '1');
  points.dai(CH, 'canale', 500);
  const prima = { canale: points.get(CH, 'canale'), tizio: points.get(CH, 'tizio') };
  const m = { id: 40, condizioni: { costo: 100, minPunti: 50 }, azioni: [{ tipo: 'messaggio', testo: 'ok $costo' }] };
  const contesti = {
    timer: motore._ctxTimer(CH),
    api: motore._ctxApi(CH),
    voce: motore._ctxVoce(CH, 'clippa'),
    telegram: motore._ctxTelegram(CH, 'tizio', [], ''),
    evento: motore._ctxDaEvento({ data: { user_login: 'tizio', user_name: 'tizio' } }, CH, 'follow'),
    prova: motore._ctxProva(CH),
  };
  for (const [nome, c] of Object.entries(contesti)) {
    const a = raccogli();
    assert.equal(await motore.esegui({ ...m, id: 40 + Object.keys(contesti).indexOf(nome) }, c, a.dire), true, `${nome}: parte`);
    assert.deepEqual({ canale: points.get(CH, 'canale'), tizio: points.get(CH, 'tizio') }, prima, `${nome}: nessuno paga`);
  }
});

test('in chat paga chi ha scritto, per il suo nome utente e non per quello mostrato', async () => {
  points.togli(CH, 'yuki_88', 1_000_000); points.dai(CH, 'yuki_88', 300);
  const c = motore._ctxDaMessaggio({ user: 'yuki_88', display: 'ゆき', text: '!gioca' }, CH, 0, [], '');
  const m = { id: 50, condizioni: { costo: 100 }, azioni: [{ tipo: 'messaggio', testo: 'ok' }] };
  assert.equal(await motore.esegui(m, c, () => {}), true);
  assert.equal(points.get(CH, 'yuki_88'), 200, 'il nome mostrato non e\' un nome utente: paga lo stesso');
});

test('«Chi ha scritto» e\' chi ha fatto scattare il modulo: un timer non ha nessuno, e lo streamer non prende il suo posto', async () => {
  const { streamers } = await import('../../src/db.js');
  streamers.request(CH, 'Canale', '1');
  const azzera = (u) => { points.togli(CH, u, 1_000_000); };
  for (const u of ['canale', 'tizio', 'yuki_88', 'fan_1', 'raider_2']) azzera(u);
  const m = (id) => ({ id, azioni: [{ tipo: 'punti', op: 'aggiungi', quanto: '50' }] });
  const saldi = () => Object.fromEntries(['canale', 'tizio', 'yuki_88', 'fan_1', 'raider_2'].map((u) => [u, points.get(CH, u)]));
  const casi = [
    ['timer', motore._ctxTimer(CH), {}],
    ['telegram, dove un nome non e\' un account del canale', motore._ctxTelegram(CH, 'tizio', [], ''), {}],
    ['inizio della diretta', motore._ctxDaEvento({ data: { broadcaster_user_login: CH } }, CH, 'online'), {}],
    ['bit anonimi', motore._ctxDaEvento({ data: { is_anonymous: true, bits: 100 } }, CH, 'cheer'), {}],
    ['chat, col nome mostrato in un altro alfabeto', motore._ctxDaMessaggio({ user: 'yuki_88', display: 'ゆき', text: '!x' }, CH, 0, [], ''), { yuki_88: 50 }],
    ['nuovo follower', motore._ctxDaEvento({ data: { user_login: 'fan_1', user_name: 'Fan_1' } }, CH, 'follow'), { fan_1: 50 }],
    ['raid', motore._ctxDaEvento({ data: { from_broadcaster_user_login: 'raider_2', from_broadcaster_user_name: 'Raider_2', viewers: 10 } }, CH, 'raid'), { raider_2: 50 }],
    ['voce, dove agisce lo streamer', motore._ctxVoce(CH, 'premio'), { canale: 50 }],
  ];
  let id = 60;
  for (const [nome, c, atteso] of casi) {
    const prima = saldi();
    await motore.esegui(m(id++), c, () => {});
    const dopo = saldi();
    const mosso = Object.fromEntries(Object.keys(dopo).filter((u) => dopo[u] !== prima[u]).map((u) => [u, dopo[u] - prima[u]]));
    assert.deepEqual(mosso, atteso, nome);
  }
});

test('il cooldown a testa vale per il nome utente anche con un nome mostrato in un altro alfabeto', async () => {
  const m = { id: 80, condizioni: { cooldownUtente: 60 }, azioni: [{ tipo: 'messaggio', testo: 'ok' }] };
  const c = () => motore._ctxDaMessaggio({ user: 'yuki_88', display: 'ゆき', text: '!x' }, CH, 0, [], '');
  assert.equal(await motore.esegui(m, c(), () => {}), true);
  assert.equal(await motore.esegui(m, c(), () => {}), false, 'la seconda volta si ferma');
});
