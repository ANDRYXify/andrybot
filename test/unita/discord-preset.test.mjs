// APPLICARE DUE VOLTE NON DEVE RADDOPPIARE NIENTE.
//
// E' la prova che tiene in piedi tutto il resto, e non si regge su un elenco di
// «cose gia' fatte»: si regge sul fatto che la seconda differenza e' VUOTA.
// Un registro di cose fatte e' una cosa da tenere aggiornata, e quella che si
// dimentica e' sempre quella che serviva.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../src/features/discord-preset.js';

const GUILD = '900000000000000001';
// Una fotografia finta ma della forma vera: canali con parent, ruoli, e i campi
// del server che dicono cosa gestisce Discord da solo.
const foto = (canali = [], extra = {}) => ({
  guild: { id: GUILD, ...extra.guild },
  ruoli: extra.ruoli || [{ id: GUILD, nome: '@everyone' }],
  canali,
});
const cat = (id, nome) => ({ id, nome, tipo: P.TIPI.categoria });
const testo = (id, nome, parent_id = null, resto = {}) => ({ id, nome, tipo: P.TIPI.testo, parent_id, ...resto });
const voce = (id, nome, parent_id = null) => ({ id, nome, tipo: P.TIPI.voce, parent_id });

const PRESET = {
  categorie: [
    { nome: 'Benvenuto', canali: [{ nome: 'regole' }, { nome: 'annunci' }] },
    { nome: 'Chiacchiere', canali: [{ nome: 'generale' }, { nome: 'Salotto', tipo: 'voce' }] },
  ],
};

test('su un server vuoto la differenza e\' tutto da creare, e niente da togliere', () => {
  const d = P.differenza(foto(), PRESET, { togliere: true });
  assert.deepEqual(d.crea.map((x) => x.nome), ['Benvenuto', 'regole', 'annunci', 'Chiacchiere', 'generale', 'Salotto']);
  assert.deepEqual(d.sistema, []);
  assert.deepEqual(d.togli, []);
  assert.equal(P.vuota(d), false);
});

test('applicato una volta, la seconda differenza e\' VUOTA', () => {
  // il server come sarebbe dopo aver applicato il preset
  const dopo = foto([
    cat('10', 'Benvenuto'), testo('11', 'regole', '10'), testo('12', 'annunci', '10'),
    cat('20', 'Chiacchiere'), testo('21', 'generale', '20'), voce('22', 'Salotto', '20'),
  ]);
  const d = P.differenza(dopo, PRESET, { togliere: true });
  assert.deepEqual(d.crea, []);
  assert.deepEqual(d.sistema, []);
  assert.deepEqual(d.togli, []);
  assert.equal(P.vuota(d), true, 'la seconda passata non deve avere niente da fare');
});

test('un canale di testo si riconosce come lo vede una persona, non come lo scrive Discord', () => {
  // Discord scrive «il-generale» anche se tu hai scritto «Il Generale»: sono lo
  // stesso canale, e creargliene un secondo sarebbe un doppione.
  const dopo = foto([cat('20', 'Chiacchiere'), testo('21', 'il-generale', '20')]);
  const d = P.differenza(dopo, { categorie: [{ nome: 'Chiacchiere', canali: [{ nome: 'Il Generale' }] }] });
  assert.deepEqual(d.crea, [], 'non si ricrea un canale che c\'e\' gia\' con l\'altra grafia');
  const vocale = P.differenza(foto([cat('20', 'Chiacchiere'), voce('22', 'Salotto', '20')]),
    { categorie: [{ nome: 'Chiacchiere', canali: [{ nome: 'Salotto', tipo: 'voce' }] }] });
  assert.deepEqual(vocale.crea, [], 'e un vocale tiene il suo nome com\'e\' scritto');
});

test('lo stesso nome in due categorie sono due canali diversi', () => {
  const dopo = foto([cat('10', 'Uno'), testo('11', 'chat', '10'), cat('20', 'Due')]);
  const d = P.differenza(dopo, { categorie: [{ nome: 'Uno', canali: [{ nome: 'chat' }] }, { nome: 'Due', canali: [{ nome: 'chat' }] }] });
  assert.deepEqual(d.crea.map((x) => x.nome), ['chat'], 'quello di «Due» manca e va creato');
  assert.equal(d.crea[0].dentro, 'Due');
});

test('un canale trascinato fuori dalla sua categoria ci torna dentro', () => {
  const dopo = foto([cat('10', 'Benvenuto'), testo('11', 'regole', null)]);
  const d = P.differenza(dopo, { categorie: [{ nome: 'Benvenuto', canali: [{ nome: 'regole' }] }] });
  assert.deepEqual(d.crea, [], 'il canale c\'e\', non se ne fa un altro');
  assert.equal(d.sistema.length, 1);
  assert.equal(d.sistema[0].dentro, 'Benvenuto');
});

// ---- le due direzioni ---------------------------------------------------
test('in modo NORMALE non sparisce mai niente', () => {
  const dopo = foto([cat('10', 'Benvenuto'), testo('11', 'regole', '10'), testo('99', 'vecchio-canale', '10')]);
  const d = P.differenza(dopo, { categorie: [{ nome: 'Benvenuto', canali: [{ nome: 'regole' }] }] });
  assert.deepEqual(d.togli, [], 'quello che avanza resta dov\'e\'');
});

test('in modo DISTRUTTIVO il server diventa esattamente il preset', () => {
  const dopo = foto([cat('10', 'Benvenuto'), testo('11', 'regole', '10'), testo('99', 'vecchio-canale', '10')]);
  const d = P.differenza(dopo, { categorie: [{ nome: 'Benvenuto', canali: [{ nome: 'regole' }] }] }, { togliere: true });
  assert.deepEqual(d.togli.map((x) => x.nome), ['vecchio-canale']);
  assert.equal(d.togli[0].dentro, 'Benvenuto', 'e si dice da dove sparisce');
});

test('il peso di quello che sparisce viaggia con lui, per l\'anteprima', () => {
  const quando = Date.UTC(2024, 0, 1);
  const dopo = foto([testo('99', 'morto', null, { ultimoMessaggio: quando })]);
  const d = P.differenza(dopo, {}, { togliere: true });
  assert.equal(d.togli[0].ultimoMessaggio, quando, 'senza il peso, l\'anteprima sarebbe un elenco di nomi');
});

// ---- quello che non si tocca -------------------------------------------
test('i canali che Discord gestisce da solo non entrano fra quelli da togliere', () => {
  const g = {
    rules_channel_id: '31', public_updates_channel_id: '32',
    safety_alerts_channel_id: '33', system_channel_id: '34',
  };
  const dopo = foto([testo('31', 'regole-discord'), testo('32', 'moderatori'), testo('33', 'sicurezza'), testo('34', 'benvenuti'), testo('99', 'mio')],
    { guild: g });
  const d = P.differenza(dopo, {}, { togliere: true });
  assert.deepEqual(d.togli.map((x) => x.id), ['99'], 'solo il nostro: gli altri li gestisce Discord');
  for (const id of ['31', '32', '33', '34']) assert.ok(d.intoccabili.has(id), id);
});

test('@everyone e i ruoli delle integrazioni sono fuori portata per definizione', () => {
  const f = foto([], { ruoli: [
    { id: GUILD, nome: '@everyone' },
    { id: '500000000000000001', nome: 'Twitch Subscriber', managed: true },
    { id: '500000000000000002', nome: 'Veterano' },
  ] });
  const fuori = P.intoccabili(f);
  assert.ok(fuori.has(GUILD), '@everyone e\' il ruolo che ha l\'id del server');
  assert.ok(fuori.has('500000000000000001'), 'un ruolo di un\'integrazione non lo diamo e non lo togliamo');
  assert.ok(!fuori.has('500000000000000002'), 'un ruolo normale invece si');
});

// ---- i permessi ---------------------------------------------------------
test('i permessi si guardano solo dove il preset li nomina', () => {
  const R = '500000000000000009';
  const con = [{ id: R, type: 0, allow: '1024', deny: '0' }];
  const dopo = foto([cat('10', 'Riservato'), testo('11', 'staff', '10', { overwrites: con })]);
  const uguale = P.differenza(dopo, { categorie: [{ nome: 'Riservato', canali: [{ nome: 'staff', permessi: con }] }] });
  assert.deepEqual(uguale.sistema, [], 'quelli che gia\' tornano non si riscrivono');

  const diverso = P.differenza(dopo, { categorie: [{ nome: 'Riservato', canali: [{ nome: 'staff', permessi: [{ id: R, allow: '3072', deny: '0' }] }] }] });
  assert.equal(diverso.sistema.length, 1);
  assert.ok(diverso.sistema[0].permessi, 'e quelli diversi si sistemano');

  const muto = P.differenza(dopo, { categorie: [{ nome: 'Riservato', canali: [{ nome: 'staff' }] }] });
  assert.deepEqual(muto.sistema, [], 'un preset che non nomina i permessi non li tocca: e\' un pacchetto di differenze, non una copia');
});

test('una categoria dentro una categoria non esiste, e non si prova nemmeno', () => {
  const d = P.differenza(foto(), { categorie: [{ nome: 'Uno', canali: [{ nome: 'Due', tipo: 'categoria' }] }] });
  assert.deepEqual(d.crea.map((x) => x.nome), ['Uno']);
});

test('un preset vuoto non chiede niente, nemmeno in distruttivo su un server vuoto', () => {
  assert.equal(P.vuota(P.differenza(foto(), {}, { togliere: true })), true);
  assert.equal(P.vuota(P.differenza(foto(), null)), true);
});

// LA SECONDA OCCHIATA, e il suo limite.
//
// «Se quel nome nel server c'e' una volta sola, e' lui»: riconosce il canale
// trascinato fuori posto. Ma se ce n'e' piu' d'uno non si indovina — e non
// indovinare, qui, vuol dire non spostare il canale sbagliato di qualcun altro.
test('due canali con lo stesso nome fermano il riconoscimento invece di tirare a indovinare', () => {
  const dopo = foto([
    cat('10', 'Uno'), testo('11', 'chat', '10'),
    cat('20', 'Due'), testo('21', 'chat', '20'),
    cat('30', 'Tre'),
  ]);
  const d = P.differenza(dopo, { categorie: [{ nome: 'Tre', canali: [{ nome: 'chat' }] }] }, { togliere: true });
  assert.deepEqual(d.crea.map((x) => x.dentro), ['Tre'], 'il terzo si crea: quale dei due avremmo dovuto spostare?');
  assert.deepEqual(d.sistema, []);
  assert.deepEqual(d.togli.map((x) => x.id).sort(), ['10', '11', '20', '21'],
    'e avanzano tutti e due, categorie comprese: il preset non li nomina');
});

test('chi viene riconosciuto fuori posto NON sparisce: si sposta', () => {
  // Il difetto che questa prova impedisce: il canale trascinato viene tolto e
  // ne nasce uno nuovo vuoto al suo posto. Tecnicamente il server finisce
  // giusto, e dentro non c'e' piu' niente.
  const dopo = foto([cat('10', 'Benvenuto'), testo('11', 'regole', null)]);
  const d = P.differenza(dopo, { categorie: [{ nome: 'Benvenuto', canali: [{ nome: 'regole' }] }] }, { togliere: true });
  assert.deepEqual(d.crea, [], 'la categoria c\'e\' gia\': non c\'e\' niente da creare');
  assert.deepEqual(d.sistema.map((x) => x.id), ['11']);
  assert.deepEqual(d.togli, [], 'il canale con dentro la storia non si butta per rifarlo uguale');
});

test('un canale gia\' al posto giusto non si fa rubare il riconoscimento da uno fuori posto', () => {
  const dopo = foto([
    cat('10', 'Benvenuto'), testo('11', 'regole', '10'),
    testo('99', 'regole', null),
  ]);
  const d = P.differenza(dopo, { categorie: [{ nome: 'Benvenuto', canali: [{ nome: 'regole' }] }] }, { togliere: true });
  assert.deepEqual(d.sistema, [], 'quello dentro la categoria va gia\' bene');
  assert.deepEqual(d.togli.map((x) => x.id), ['99'], 'e l\'altro e\' un doppione, non l\'originale');
});

// ---- fondere i permessi --------------------------------------------------
test('i permessi del preset si aggiungono a quelli che c\'erano, non li sostituiscono', () => {
  // Discord, quando gli mandi l'elenco dei permessi di un canale, butta via
  // quello di prima. Percio' l'elenco si compone qui, dove si vede com'e'
  // adesso: chi mandasse solo i permessi del preset cancellerebbe quelli che lo
  // streamer ha messo a mano, e non se ne accorgerebbe nessuno fino a dopo.
  const R = '800000000000000001', S = '800000000000000002';
  const attuale = { overwrites: [{ id: R, tipo: 0, allow: '2048', deny: '0' }] };
  const fuso = P.fondiPermessi(attuale, [{ id: S, allow: '0', deny: '1024' }]);
  assert.deepEqual(fuso.map((x) => x.id).sort(), [R, S].sort());
  assert.equal(fuso.find((x) => x.id === R).allow, '2048', 'quello di prima resta com\'era');

  const sopra = P.fondiPermessi(attuale, [{ id: R, allow: '0', deny: '2048' }]);
  assert.equal(sopra.length, 1, 'e lo stesso ruolo non compare due volte');
  assert.equal(sopra[0].deny, '2048', 'il preset ha l\'ultima parola su cio\' che nomina');
});

// ---- l'impronta ----------------------------------------------------------
test('l\'impronta descrive cosa si fa, e cambia appena cambia', () => {
  const vuoto = P.differenza(foto(), PRESET, { togliere: true });
  assert.equal(P.improntaDi(vuoto), P.improntaDi(P.differenza(foto(), PRESET, { togliere: true })),
    'la stessa differenza da\' sempre la stessa impronta');
  const conUnPezzo = P.differenza(foto([cat('10', 'Benvenuto')]), PRESET, { togliere: true });
  assert.notEqual(P.improntaDi(conUnPezzo), P.improntaDi(vuoto), 'un pezzo in meno da fare e\' un\'altra cosa');
  // e soprattutto: quello che si CANCELLA pesa sull'impronta
  const conDaTogliere = P.differenza(foto([testo('99', 'roba-vecchia')]), PRESET, { togliere: true });
  assert.notEqual(P.improntaDi(conDaTogliere), P.improntaDi(vuoto), 'un canale in piu\' da cancellare cambia tutto');
  assert.equal(P.improntaDi(P.differenza(foto(), PRESET)), P.improntaDi(vuoto),
    'senza niente da togliere, normale e distruttivo fanno la stessa cosa e si somigliano');
});

test('di cio\' che si cancella si sa da quanto tace, e da quanto esiste', () => {
  // Due date, non una: un canale che non ha mai parlato puo' essere nato ieri,
  // e dirlo «morto da sempre» sarebbe una bugia che costa un canale.
  const d = P.differenza(foto([
    testo('99', 'roba-vecchia', null, { ultimoMessaggio: 1700000000000, nato: 1600000000000 }),
    testo('98', 'appena-nato', null, { nato: 1750000000000 }),
  ]), PRESET, { togliere: true });
  const per = new Map(d.togli.map((x) => [x.nome, x]));
  assert.equal(per.get('roba-vecchia').ultimoMessaggio, 1700000000000);
  assert.equal(per.get('appena-nato').ultimoMessaggio, 0, 'mai parlato');
  assert.equal(per.get('appena-nato').nato, 1750000000000, 'ma si sa quando e\' nato');
});
